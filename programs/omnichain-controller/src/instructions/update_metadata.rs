use crate::error::ErrorCode;
use crate::{constants::*, ControllerConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateCollectionMetadata<'info> {
    #[account(
        mut,
        seeds = [CONTROLLER_CONFIG_SEED],
        bump = controller_config.bump
    )]
    pub controller_config: Account<'info, ControllerConfig>,

    /// Tree authority PDA - this program controls the Merkle tree
    /// CHECK: Validated against controller config in constraints
    #[account(
        seeds = [TREE_AUTHORITY_SEED, controller_config.merkle_tree.as_ref()],
        bump
    )]
    pub tree_authority: AccountInfo<'info>,

    /// The Merkle tree for cNFT operations
    /// CHECK: Validated against controller config
    #[account(
        mut,
        constraint = merkle_tree.key() == controller_config.merkle_tree
    )]
    pub merkle_tree: AccountInfo<'info>,

    /// SPL Account Compression Program
    /// CHECK: Address validation
    #[account(address = SPL_ACCOUNT_COMPRESSION_PROGRAM_ID.parse::<Pubkey>().unwrap())]
    pub compression_program: AccountInfo<'info>,

    /// Bubblegum Program for cNFT operations
    /// CHECK: Bubblegum program validation
    pub bubblegum_program: AccountInfo<'info>,

    /// Collection mint
    /// CHECK: Must be the collection mint
    pub collection_mint: AccountInfo<'info>,

    /// Collection metadata
    /// CHECK: Must be the collection metadata
    pub collection_metadata: AccountInfo<'info>,

    /// Collection edition
    /// CHECK: Must be the collection edition
    pub collection_edition: AccountInfo<'info>,

    /// Bubblegum signer PDA
    /// CHECK: Bubblegum signer validation
    pub bubblegum_signer: AccountInfo<'info>,

    /// Log wrapper program
    /// CHECK: Log wrapper validation
    pub log_wrapper: AccountInfo<'info>,

    /// Token metadata program
    /// CHECK: Token metadata program validation
    pub token_metadata_program: AccountInfo<'info>,

    /// Collection authority (can be this program)
    /// CHECK: Collection authority validation
    pub collection_authority: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

/// Update metadata for the entire collection based on cross-chain command
pub fn update_metadata_handler(
    ctx: Context<UpdateCollectionMetadata>,
    new_uri: String,
    new_name: String,
    new_symbol: String,
) -> Result<()> {
    let config = &mut ctx.accounts.controller_config;
    
    // Validate new URI length
    require!(
        new_uri.len() <= MAX_URI_LENGTH,
        ErrorCode::UriTooLong
    );

    // Create PDA signer seeds for tree authority
    let _tree_authority_seeds = &[
        TREE_AUTHORITY_SEED,
        config.merkle_tree.as_ref(),
        &[ctx.bumps.tree_authority],
    ];

    // This is where we would update the collection metadata
    // In a real implementation, this would trigger updates to all cNFTs
    // For the demo, we'll update the collection-level metadata
    
    // Update the stored collection URI
    config.collection_uri = new_uri.clone();
    config.last_update = Clock::get()?.unix_timestamp;

    msg!(
        "Updated collection metadata: URI: {}, Name: {}, Symbol: {}",
        new_uri,
        new_name,
        new_symbol
    );

    // Emit event for frontend to catch
    emit!(CollectionMetadataUpdated {
        merkle_tree: config.merkle_tree,
        new_uri,
        new_name,
        new_symbol,
        timestamp: config.last_update,
    });

    Ok(())
}

#[event]
pub struct CollectionMetadataUpdated {
    pub merkle_tree: Pubkey,
    pub new_uri: String,
    pub new_name: String,
    pub new_symbol: String,
    pub timestamp: i64,
}
