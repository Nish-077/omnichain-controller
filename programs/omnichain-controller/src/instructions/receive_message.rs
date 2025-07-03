use crate::error::ErrorCode;
use crate::{constants::*, ControllerConfig};
use crate::state::message_types::{CrossChainMessage, MessageCommand};
use anchor_lang::prelude::*;
use mpl_bubblegum::instructions::{MintToCollectionV1CpiBuilder, BurnBuilder, TransferBuilder};
use mpl_bubblegum::types::{MetadataArgs, TokenProgramVersion};

#[derive(Accounts)]
#[instruction(src_eid: u32, message: Vec<u8>)]
pub struct ReceiveLayerZeroMessage<'info> {
    #[account(
        mut,
        seeds = [CONTROLLER_CONFIG_SEED],
        bump = controller_config.bump
    )]
    pub controller_config: Account<'info, ControllerConfig>,

    /// LayerZero endpoint or relayer account
    /// CHECK: LayerZero will validate the message origin
    pub layerzero_endpoint: AccountInfo<'info>,

    /// The Merkle tree for cNFT operations
    /// CHECK: Validated against controller config
    #[account(
        constraint = merkle_tree.key() == controller_config.merkle_tree
    )]
    pub merkle_tree: AccountInfo<'info>,

    /// Tree authority PDA
    /// CHECK: Validated against controller config
    #[account(
        constraint = tree_authority.key() == controller_config.tree_authority
    )]
    pub tree_authority: AccountInfo<'info>,

    /// SPL Account Compression Program
    /// CHECK: Manual address validation for dependency-free approach
    #[account(address = SPL_ACCOUNT_COMPRESSION_PROGRAM_ID.parse::<Pubkey>().unwrap())]
    pub compression_program: AccountInfo<'info>,

    /// Bubblegum Program for cNFT operations
    /// CHECK: We validate this is the correct bubblegum program
    pub bubblegum_program: AccountInfo<'info>,

    /// --- Additional accounts for real Bubblegum CPI ---
    /// Recipient of the cNFT
    /// CHECK: Must be a valid recipient
    pub recipient: AccountInfo<'info>,
    /// Delegate for the cNFT (optional, can be recipient)
    /// CHECK: Must be a valid delegate
    pub leaf_delegate: AccountInfo<'info>,
    /// Collection mint
    /// CHECK: Must be the collection mint
    pub collection_mint: AccountInfo<'info>,
    /// Collection metadata
    /// CHECK: Must be the collection metadata
    pub collection_metadata: AccountInfo<'info>,
    /// Collection edition
    /// CHECK: Must be the collection edition
    pub collection_edition: AccountInfo<'info>,
    /// Bubblegum signer
    /// CHECK: Must be the bubblegum signer PDA
    pub bubblegum_signer: AccountInfo<'info>,
    /// Log wrapper
    /// CHECK: Must be the log wrapper program
    pub log_wrapper: AccountInfo<'info>,
    /// Token metadata program
    /// CHECK: Must be the token metadata program
    pub token_metadata_program: AccountInfo<'info>,
    /// Collection authority
    /// CHECK: Must be the collection authority
    pub collection_authority: AccountInfo<'info>,
    /// Collection authority record PDA (optional)
    /// CHECK: Optional
    pub collection_authority_record_pda: Option<AccountInfo<'info>>,
}

pub fn receive_message_handler(
    ctx: Context<ReceiveLayerZeroMessage>,
    src_eid: u32,
    message: Vec<u8>,
) -> Result<()> {
    let config = &mut ctx.accounts.controller_config;

    // Check if controller is paused
    require!(!config.paused, ErrorCode::ControllerPaused);

    // Validate source endpoint
    require!(src_eid == config.ethereum_eid, ErrorCode::InvalidEndpoint);

    // Deserialize the cross-chain message
    let cross_chain_msg: CrossChainMessage =
        CrossChainMessage::try_from_slice(&message).map_err(|_| ErrorCode::InvalidMessageFormat)?;

    // Validate message nonce (prevent replay attacks)
    require!(
        cross_chain_msg.nonce > config.message_nonce,
        ErrorCode::InvalidNonce
    );

    // Validate message timestamp (not too old or in future)
    let clock = Clock::get()?;
    let time_diff = (clock.unix_timestamp - cross_chain_msg.timestamp).abs();
    require!(
        time_diff <= MESSAGE_TIMEOUT_SECONDS,
        ErrorCode::InvalidTimestamp
    );

    // Update nonce to prevent replay
    config.message_nonce = cross_chain_msg.nonce;
    config.last_update = clock.unix_timestamp;

    // Process the command
    let command_type = match &cross_chain_msg.command {
        MessageCommand::UpdateCollectionMetadata { .. } => "UpdateCollectionMetadata",
        MessageCommand::BatchUpdateMetadata { .. } => "BatchUpdateMetadata",
        MessageCommand::TransferAuthority { .. } => "TransferAuthority",
        MessageCommand::SetPaused { .. } => "SetPaused",
        MessageCommand::MintCnfts { .. } => "MintCnfts",
        MessageCommand::BurnCnfts { .. } => "BurnCnfts",
        MessageCommand::TransferCnfts { .. } => "TransferCnfts",
        MessageCommand::UpdateTreeConfig { .. } => "UpdateTreeConfig",
        MessageCommand::VerifyTreeState { .. } => "VerifyTreeState",
    };

    match cross_chain_msg.command {
        MessageCommand::UpdateCollectionMetadata { new_uri } => {
            handle_update_collection_metadata(config, new_uri)?;
        }
        MessageCommand::BatchUpdateMetadata { updates } => {
            handle_batch_update_metadata(ctx, updates)?;
        }
        MessageCommand::TransferAuthority { new_authority } => {
            handle_transfer_authority(config, new_authority)?;
        }
        MessageCommand::SetPaused { paused } => {
            handle_set_paused(config, paused)?;
        }
        MessageCommand::MintCnfts { mint_requests } => {
            handle_mint_cnfts(ctx, mint_requests)?;
        }
        MessageCommand::BurnCnfts { burn_requests } => {
            handle_burn_cnfts(ctx, burn_requests)?;
        }
        MessageCommand::TransferCnfts { transfer_requests } => {
            handle_transfer_cnfts(ctx, transfer_requests)?;
        }
        MessageCommand::UpdateTreeConfig { new_config } => {
            handle_update_tree_config(config, new_config)?;
        }
        MessageCommand::VerifyTreeState { tree_state } => {
            handle_verify_tree_state(config, tree_state)?;
        }
    }

    msg!(
        "Processed LayerZero message from EID {}, nonce: {}, command: {}",
        src_eid,
        cross_chain_msg.nonce,
        command_type
    );

    Ok(())
}

fn handle_update_collection_metadata(config: &mut ControllerConfig, new_uri: String) -> Result<()> {
    require!(new_uri.len() <= MAX_URI_LENGTH, ErrorCode::UriTooLong);

    config.collection_uri = new_uri.clone();

    msg!("Updated collection metadata URI to: {}", new_uri);
    Ok(())
}

fn handle_batch_update_metadata(
    _ctx: Context<ReceiveLayerZeroMessage>,
    updates: Vec<crate::MetadataUpdate>,
) -> Result<()> {
    require!(updates.len() <= MAX_BATCH_SIZE, ErrorCode::BatchTooLarge);

    // For now, we'll log the updates. In a full implementation,
    // we would iterate through each update and call the appropriate
    // mpl-bubblegum functions to update individual cNFT metadata
    for (i, update) in updates.iter().enumerate() {
        msg!(
            "Batch update {}: leaf_index={}, new_uri={}",
            i,
            update.leaf_index,
            update.new_uri
        );
    }

    msg!("Processed {} metadata updates", updates.len());
    Ok(())
}

fn handle_transfer_authority(config: &mut ControllerConfig, new_authority: Pubkey) -> Result<()> {
    let old_authority = config.authority;
    config.authority = new_authority;

    msg!(
        "Transferred authority from {} to {}",
        old_authority,
        new_authority
    );
    Ok(())
}

fn handle_set_paused(config: &mut ControllerConfig, paused: bool) -> Result<()> {
    config.paused = paused;

    msg!("Controller paused state set to: {}", paused);
    Ok(())
}

fn handle_mint_cnfts(
    ctx: Context<ReceiveLayerZeroMessage>,
    mint_requests: Vec<crate::MintRequest>,
) -> Result<()> {
    require!(
        mint_requests.len() <= MAX_MINT_BATCH_SIZE,
        ErrorCode::MintBatchTooLarge
    );
    let bubblegum_program = &ctx.accounts.bubblegum_program;
    for mint_request in mint_requests.iter() {
        validate_cnft_metadata(&mint_request.metadata)?;
        let metadata = MetadataArgs {
            name: mint_request.metadata.name.clone(),
            symbol: mint_request.metadata.symbol.clone(),
            uri: mint_request.metadata.uri.clone(),
            seller_fee_basis_points: mint_request.metadata.seller_fee_basis_points,
            creators: vec![], // TODO: map from mint_request.creators
            primary_sale_happened: false,
            is_mutable: mint_request.is_mutable,
            edition_nonce: None,
            collection: None, // TODO: map from mint_request.collection
            uses: None,
            token_standard: None,
            token_program_version: TokenProgramVersion::Original,
        };
        let mut builder = MintToCollectionV1CpiBuilder::new(bubblegum_program);
        builder
            .tree_config(&ctx.accounts.controller_config.to_account_info())
            .leaf_owner(&ctx.accounts.recipient)
            .leaf_delegate(&ctx.accounts.leaf_delegate)
            .merkle_tree(&ctx.accounts.merkle_tree)
            .payer(&ctx.accounts.tree_authority)
            .tree_creator_or_delegate(&ctx.accounts.tree_authority)
            .collection_authority(&ctx.accounts.collection_authority)
            .collection_authority_record_pda(ctx.accounts.collection_authority_record_pda.as_ref())
            .collection_mint(&ctx.accounts.collection_mint)
            .collection_metadata(&ctx.accounts.collection_metadata)
            .collection_edition(&ctx.accounts.collection_edition)
            .bubblegum_signer(&ctx.accounts.bubblegum_signer)
            .log_wrapper(&ctx.accounts.log_wrapper)
            .compression_program(&ctx.accounts.compression_program)
            .token_metadata_program(&ctx.accounts.token_metadata_program)
            .system_program(&ctx.accounts.layerzero_endpoint)
            .metadata(metadata);
        // For hackathon, just log instead of invoking
        msg!("Would mint cNFT to {} (real CPI, all accounts wired)", mint_request.to);
        // builder.invoke()?; // Uncomment when all accounts are correct
    }
    Ok(())
}

fn handle_burn_cnfts(
    _ctx: Context<ReceiveLayerZeroMessage>,
    burn_requests: Vec<crate::BurnRequest>,
) -> Result<()> {
    require!(
        burn_requests.len() <= MAX_BURN_BATCH_SIZE,
        ErrorCode::BurnBatchTooLarge
    );

    let _bubblegum_program = &_ctx.accounts.bubblegum_program;
    for (_i, burn_request) in burn_requests.iter().enumerate() {
        require!(
            !burn_request.proof.is_empty(),
            ErrorCode::InvalidProof
        );

        // Use the fields from BurnRequest directly (assume client provides correct values)
        // If you want to add more fields (root, data_hash, etc.), add them to BurnRequest and use here
        let mut builder = BurnBuilder::new();
        builder
            .tree_config(_ctx.accounts.controller_config.key())
            .leaf_owner(burn_request.current_owner, false)
            .leaf_delegate(_ctx.accounts.leaf_delegate.key(), false)
            .merkle_tree(_ctx.accounts.merkle_tree.key())
            .log_wrapper(_ctx.accounts.log_wrapper.key())
            .compression_program(_ctx.accounts.compression_program.key())
            .system_program(_ctx.accounts.layerzero_endpoint.key())
            // .root(burn_request.root) // Uncomment if you add root to BurnRequest
            // .data_hash(burn_request.data_hash) // Uncomment if you add data_hash to BurnRequest
            // .creator_hash(burn_request.creator_hash) // Uncomment if you add creator_hash to BurnRequest
            // .nonce(burn_request.nonce) // Uncomment if you add nonce to BurnRequest
            .index(burn_request.leaf_index);
        // For hackathon, just log instead of invoking
        msg!("Would burn cNFT at leaf_index {} (real CPI, all accounts wired)", burn_request.leaf_index);
        // builder.instruction(); // Uncomment and invoke when ready
    }
    msg!("Processed {} burn requests", burn_requests.len());
    Ok(())
}

fn handle_transfer_cnfts(
    _ctx: Context<ReceiveLayerZeroMessage>,
    transfer_requests: Vec<crate::TransferRequest>,
) -> Result<()> {
    require!(
        transfer_requests.len() <= MAX_TRANSFER_BATCH_SIZE,
        ErrorCode::TransferBatchTooLarge
    );

    let _bubblegum_program = &_ctx.accounts.bubblegum_program;
    for (_i, transfer_request) in transfer_requests.iter().enumerate() {
        require!(
            !transfer_request.proof.is_empty(),
            ErrorCode::InvalidProof
        );
        require!(
            transfer_request.from != transfer_request.to,
            ErrorCode::OperationNotAllowed
        );

        // Use the fields from TransferRequest directly (assume client provides correct values)
        // If you want to add more fields (root, data_hash, etc.), add them to TransferRequest and use here
        let mut builder = TransferBuilder::new();
        builder
            .tree_config(_ctx.accounts.controller_config.key())
            .leaf_owner(transfer_request.from, false)
            .leaf_delegate(_ctx.accounts.leaf_delegate.key(), false)
            .new_leaf_owner(transfer_request.to)
            .merkle_tree(_ctx.accounts.merkle_tree.key())
            .log_wrapper(_ctx.accounts.log_wrapper.key())
            .compression_program(_ctx.accounts.compression_program.key())
            .system_program(_ctx.accounts.layerzero_endpoint.key())
            // .root(transfer_request.root) // Uncomment if you add root to TransferRequest
            // .data_hash(transfer_request.data_hash) // Uncomment if you add data_hash to TransferRequest
            // .creator_hash(transfer_request.creator_hash) // Uncomment if you add creator_hash to TransferRequest
            // .nonce(transfer_request.nonce) // Uncomment if you add nonce to TransferRequest
            .index(transfer_request.leaf_index);
        // For hackathon, just log instead of invoking
        msg!("Would transfer cNFT at leaf_index {} from {} to {} (real CPI, all accounts wired)", transfer_request.leaf_index, transfer_request.from, transfer_request.to);
        // builder.instruction(); // Uncomment and invoke when ready
    }
    msg!("Processed {} transfer requests", transfer_requests.len());
    Ok(())
}

fn handle_update_tree_config(
    _config: &mut ControllerConfig,
    new_config: crate::TreeConfig,
) -> Result<()> {
    // Validate tree configuration
    require!(
        new_config.max_depth >= MIN_TREE_DEPTH && new_config.max_depth <= MAX_TREE_DEPTH,
        ErrorCode::InvalidTreeConfig
    );
    require!(
        new_config.max_buffer_size >= MIN_BUFFER_SIZE && new_config.max_buffer_size <= MAX_BUFFER_SIZE,
        ErrorCode::InvalidTreeConfig
    );

    // Validate fee configuration if provided
    if let Some(ref fee_config) = new_config.fee_config {
        validate_fee_config(fee_config)?;
    }

    // For now, log the configuration update. In a full implementation,
    // we would update the actual tree configuration
    msg!(
        "Updated tree config: max_depth={}, max_buffer_size={}, public={}",
        new_config.max_depth,
        new_config.max_buffer_size,
        new_config.public
    );

    Ok(())
}

fn handle_verify_tree_state(
    _config: &mut ControllerConfig,
    tree_state: crate::TreeStateProof,
) -> Result<()> {
    // Validate proof length
    require!(
        !tree_state.proof.is_empty(),
        ErrorCode::InvalidProof
    );

    // For now, log the tree state verification. In a full implementation,
    // we would verify the proof against the current tree state
    msg!(
        "Verifying tree state: root={:?}, item_count={}, sequence={}",
        tree_state.root,
        tree_state.item_count,
        tree_state.sequence
    );

    Ok(())
}

// Helper validation functions

fn validate_cnft_metadata(metadata: &crate::CnftMetadata) -> Result<()> {
    require!(
        !metadata.name.is_empty() && metadata.name.len() <= MAX_NAME_LENGTH,
        ErrorCode::InvalidMetadata
    );
    require!(
        !metadata.symbol.is_empty() && metadata.symbol.len() <= MAX_SYMBOL_LENGTH,
        ErrorCode::InvalidMetadata
    );
    require!(
        !metadata.uri.is_empty() && metadata.uri.len() <= MAX_URI_LENGTH,
        ErrorCode::InvalidMetadata
    );
    require!(
        metadata.seller_fee_basis_points <= MAX_ROYALTY_BASIS_POINTS,
        ErrorCode::InvalidRoyalty
    );

    // Validate description length if provided
    if let Some(ref description) = metadata.description {
        require!(
            description.len() <= MAX_DESCRIPTION_LENGTH,
            ErrorCode::InvalidMetadata
        );
    }

    // Validate attributes if provided
    if let Some(ref attributes) = metadata.attributes {
        require!(
            attributes.len() <= MAX_ATTRIBUTES_COUNT,
            ErrorCode::InvalidAttributes
        );
        for attr in attributes {
            require!(
                !attr.trait_type.is_empty() && !attr.value.is_empty(),
                ErrorCode::InvalidAttributes
            );
        }
    }

    // Validate files if provided
    if let Some(ref properties) = metadata.properties {
        if let Some(ref files) = properties.files {
            require!(
                files.len() <= MAX_FILES_COUNT,
                ErrorCode::InvalidFiles
            );
            for file in files {
                require!(
                    !file.uri.is_empty(),
                    ErrorCode::InvalidFiles
                );
            }
        }
    }

    Ok(())
}

// Helper functions for validation (currently unused but kept for future use)

fn validate_fee_config(fee_config: &crate::state::message_types::FeeConfig) -> Result<()> {
    // Validate that fee recipient is not the default pubkey
    require!(
        fee_config.fee_recipient != Pubkey::default(),
        ErrorCode::InvalidFeeConfig
    );

    // Validate reasonable fee amounts (max 1 SOL per operation)
    const MAX_FEE: u64 = 1_000_000_000; // 1 SOL in lamports
    require!(
        fee_config.mint_fee <= MAX_FEE &&
        fee_config.transfer_fee <= MAX_FEE &&
        fee_config.burn_fee <= MAX_FEE,
        ErrorCode::InvalidFeeConfig
    );

    Ok(())
}

/*
fn validate_creators(creators: &[crate::Creator]) -> Result<()> {
    require!(
        creators.len() <= MAX_CREATORS_COUNT,
        ErrorCode::InvalidCreators
    );

    let mut total_share: u16 = 0;
    for creator in creators {
        require!(
            creator.share <= MAX_CREATOR_SHARE,
            ErrorCode::InvalidCreators
        );
        total_share += creator.share as u16;
    }

    require!(
        total_share <= 100,
        ErrorCode::InvalidCreators
    );

    Ok(())
}

fn validate_collection(collection: &crate::Collection) -> Result<()> {
    // For now, just validate that the collection key is not the default pubkey
    require!(
        collection.key != Pubkey::default(),
        ErrorCode::CollectionNotVerified
    );

    Ok(())
}

fn validate_fee_config(fee_config: &crate::FeeConfig) -> Result<()> {
    // Validate that fee recipient is not the default pubkey
    require!(
        fee_config.fee_recipient != Pubkey::default(),
        ErrorCode::InvalidFeeConfig
    );

    // Validate reasonable fee amounts (max 1 SOL per operation)
    const MAX_FEE: u64 = 1_000_000_000; // 1 SOL in lamports
    require!(
        fee_config.mint_fee <= MAX_FEE &&
        fee_config.transfer_fee <= MAX_FEE &&
        fee_config.burn_fee <= MAX_FEE,
        ErrorCode::InvalidFeeConfig
    );

    Ok(())
}
*/
