use anchor_lang::prelude::*;
use crate::state::*;
use crate::cpi::endpoint;

/// LayerZero Clear Parameters
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ClearParams {
    pub receiver: Pubkey,
    pub src_eid: u32,
    pub sender: [u8; 32],
    pub nonce: u64,
    pub guid: [u8; 32],
    pub message: Vec<u8>,
}

/// LayerZero receive message instruction
#[derive(Accounts)]
#[instruction(src_eid: u32)]
pub struct LzReceive<'info> {
    #[account(
        mut,
        seeds = [OAppStore::SEEDS],
        bump = store.bump
    )]
    pub store: Account<'info, OAppStore>,
    
    #[account(
        seeds = [PeerConfig::SEEDS, store.key().as_ref(), &src_eid.to_le_bytes()],
        bump = peer_config.bump,
        constraint = peer_config.trusted @ crate::error::ErrorCode::UntrustedPeer
    )]
    pub peer_config: Account<'info, PeerConfig>,
    
    #[account(
        seeds = [LzReceiveTypes::SEEDS, store.key().as_ref()],
        bump = lz_receive_types.bump
    )]
    pub lz_receive_types: Account<'info, LzReceiveTypes>,
    
    /// LayerZero endpoint program
    /// CHECK: This is the LayerZero endpoint program
    pub endpoint: AccountInfo<'info>,
    
    /// Accounts for endpoint CPI
    /// CHECK: These are accounts required for endpoint operations
    pub endpoint_accounts: AccountInfo<'info>,
}

/// LayerZero compose message instruction
#[derive(Accounts)]
#[instruction(src_eid: u32)]
pub struct LzCompose<'info> {
    #[account(
        mut,
        seeds = [OAppStore::SEEDS],
        bump = store.bump
    )]
    pub store: Account<'info, OAppStore>,
    
    #[account(
        seeds = [PeerConfig::SEEDS, store.key().as_ref(), &src_eid.to_le_bytes()],
        bump = peer_config.bump,
        constraint = peer_config.trusted @ crate::error::ErrorCode::UntrustedPeer
    )]
    pub peer_config: Account<'info, PeerConfig>,
    
    #[account(
        seeds = [LzComposeTypes::SEEDS, store.key().as_ref()],
        bump = lz_compose_types.bump
    )]
    pub lz_compose_types: Account<'info, LzComposeTypes>,
    
    /// LayerZero endpoint program
    /// CHECK: This is the LayerZero endpoint program
    pub endpoint: AccountInfo<'info>,
    
    /// Accounts for endpoint CPI
    /// CHECK: These are accounts required for endpoint operations
    pub endpoint_accounts: AccountInfo<'info>,
}

/// Handler for LayerZero receive message
pub fn lz_receive_handler(
    ctx: Context<LzReceive>,
    src_eid: u32,
    sender: [u8; 32],
    nonce: u64,
    guid: [u8; 32],
    message: Vec<u8>,
) -> Result<()> {
    let store = &mut ctx.accounts.store;
    
    // 1. CRITICAL: Call endpoint clear FIRST for replay protection (LayerZero V2 requirement)
    let seeds = &[OAppStore::SEEDS, &[store.bump]];
    let clear_accounts = &ctx.remaining_accounts[..4]; // First 4 accounts are for clear
    
    // Call LayerZero endpoint clear CPI - MUST BE FIRST OPERATION
    endpoint::clear(
        &ctx.accounts.endpoint,
        clear_accounts,
        seeds,
        &ClearParams {
            receiver: store.key(),
            src_eid,
            sender,
            nonce,
            guid,
            message: message.clone(),
        },
    )?;
    
    // 2. Validate message size
    if !msg_codec::MessageValidator::validate_message_size(&message) {
        return Err(crate::error::ErrorCode::MessageTooLarge.into());
    }
    
    // 3. Decode the message
    let decoded = msg_codec::MessageCodec::decode_message(&message)?;
    
    // 4. Validate message version and command
    if !msg_codec::MessageCodec::validate_command(decoded.command) {
        return Err(crate::error::ErrorCode::InvalidCommand.into());
    }
    
    // 5. Validate nonce
    if !msg_codec::MessageValidator::validate_nonce(store.nonce, decoded.nonce) {
        return Err(crate::error::ErrorCode::InvalidNonce.into());
    }
    
    // 6. Validate timestamp
    if !msg_codec::MessageValidator::validate_timestamp(decoded.timestamp) {
        return Err(crate::error::ErrorCode::InvalidTimestamp.into());
    }
    
    // Validate sender matches peer configuration
    if ctx.accounts.peer_config.peer_address != sender {
        return Err(crate::error::ErrorCode::UnauthorizedSender.into());
    }
    
    // Process the message based on command type
    match decoded.command {
        msg_codec::MessageCodec::COMMAND_UPDATE_COLLECTION_METADATA => {
            handle_update_collection_metadata(store, &decoded.payload)?;
        }
        msg_codec::MessageCodec::COMMAND_EMERGENCY_PAUSE => {
            handle_emergency_pause(store)?;
        }
        msg_codec::MessageCodec::COMMAND_EMERGENCY_UNPAUSE => {
            handle_emergency_unpause(store)?;
        }
        msg_codec::MessageCodec::COMMAND_TRANSFER_AUTHORITY => {
            handle_transfer_authority(store, &decoded.payload)?;
        }
        msg_codec::MessageCodec::COMMAND_BATCH_UPDATE_CNFTS => {
            handle_batch_update_cnfts(store, &decoded.payload)?;
        }
        _ => {
            return Err(crate::error::ErrorCode::UnsupportedCommand.into());
        }
    }
    
    // Update nonce and processed messages count
    store.nonce = decoded.nonce;
    store.processed_messages += 1;
    
    msg!("Message processed - Command: {}, Nonce: {}, From EID: {}", 
         decoded.command, decoded.nonce, src_eid);
    
    Ok(())
}

/// Handler for LayerZero compose message
pub fn lz_compose_handler(
    ctx: Context<LzCompose>,
    src_eid: u32,
    sender: [u8; 32],
    _nonce: u64,
    guid: [u8; 32],
    message: Vec<u8>,
) -> Result<()> {
    let store = &mut ctx.accounts.store;
    
    // Validate message size
    if !msg_codec::MessageValidator::validate_message_size(&message) {
        return Err(crate::error::ErrorCode::MessageTooLarge.into());
    }
    
    // Decode the message
    let decoded = msg_codec::MessageCodec::decode_message(&message)?;
    
    // Validate sender matches peer configuration
    if ctx.accounts.peer_config.peer_address != sender {
        return Err(crate::error::ErrorCode::UnauthorizedSender.into());
    }
    
    // Process compose message (simplified - could be more complex)
    msg!("Compose message processed - Command: {}, Nonce: {}, From EID: {}", 
         decoded.command, decoded.nonce, src_eid);
    
    // Send compose response if needed
    let response_message = msg_codec::MessageCodec::encode_message(
        decoded.command,
        store.nonce + 1,
        Clock::get()?.unix_timestamp,
        b"compose_response",
    )?;
    
    let accounts = vec![ctx.accounts.endpoint_accounts.clone()];
    endpoint::send_compose(
        &ctx.accounts.endpoint,
        &accounts,
        &sender,
        &guid,
        0, // index
        &response_message,
    )?;
    
    store.nonce += 1;
    
    Ok(())
}

/// Handle update collection metadata command
fn handle_update_collection_metadata(
    store: &mut OAppStore,
    payload: &[u8],
) -> Result<()> {
    let metadata_payload = msg_codec::MessageCodec::decode_update_metadata_payload(payload)?;
    
    // Update collection metadata
    store.collection_metadata.uri = metadata_payload.uri;
    store.collection_metadata.name = metadata_payload.name;
    store.collection_metadata.symbol = metadata_payload.symbol;
    
    msg!("Collection metadata updated - Name: {}, Symbol: {}, URI: {}", 
         store.collection_metadata.name,
         store.collection_metadata.symbol,
         store.collection_metadata.uri);
    
    Ok(())
}

/// Handle emergency pause command
fn handle_emergency_pause(_store: &mut OAppStore) -> Result<()> {
    // Emergency pause logic would go here
    msg!("Emergency pause activated");
    Ok(())
}

/// Handle emergency unpause command
fn handle_emergency_unpause(_store: &mut OAppStore) -> Result<()> {
    // Emergency unpause logic would go here
    msg!("Emergency unpause activated");
    Ok(())
}

/// Handle transfer authority command
fn handle_transfer_authority(_store: &mut OAppStore, _payload: &[u8]) -> Result<()> {
    // Transfer authority logic would go here
    msg!("Authority transfer processed");
    Ok(())
}

/// Handle batch update cNFTs command
fn handle_batch_update_cnfts(_store: &mut OAppStore, _payload: &[u8]) -> Result<()> {
    // Batch update logic would go here
    msg!("Batch cNFT update processed");
    Ok(())
}
