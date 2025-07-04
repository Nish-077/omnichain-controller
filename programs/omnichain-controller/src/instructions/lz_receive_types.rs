use anchor_lang::prelude::*;
use crate::state::*;

/// LayerZero receive types instruction - Returns account list for Executor
#[derive(Accounts)]
#[instruction(src_eid: u32)]
pub struct LzReceiveTypesContext<'info> {
    #[account(
        seeds = [OAppStore::SEEDS],
        bump = store.bump
    )]
    pub store: Account<'info, OAppStore>,
    
    #[account(
        seeds = [LzReceiveTypes::SEEDS, store.key().as_ref()],
        bump = lz_receive_types.bump
    )]
    pub lz_receive_types: Account<'info, LzReceiveTypes>,
}

/// LayerZero account structure for account discovery
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LzAccount {
    pub pubkey: Pubkey,
    pub is_signer: bool,
    pub is_writable: bool,
}

/// Parameters for lz_receive_types instruction
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LzReceiveParams {
    pub src_eid: u32,
    pub sender: [u8; 32],
    pub nonce: u64,
    pub guid: [u8; 32],
    pub message: Vec<u8>,
}

/// Handler for LayerZero receive types - Returns exact account list needed for lz_receive
pub fn lz_receive_types_handler(
    ctx: Context<LzReceiveTypesContext>,
    params: LzReceiveParams,
) -> Result<Vec<LzAccount>> {
    let store = &ctx.accounts.store;
    
    // 1. Your writable state (Store PDA) - REQUIRED FIRST
    let mut accounts = vec![
        LzAccount {
            pubkey: store.key(),
            is_signer: false,
            is_writable: true,
        },
    ];
    
    // 2. The peer that sent the message (read-only) - REQUIRED SECOND
    let store_key = store.key();
    let peer_seeds = [
        PeerConfig::SEEDS,
        store_key.as_ref(),
        &params.src_eid.to_le_bytes(),
    ];
    let (peer_key, _) = Pubkey::find_program_address(&peer_seeds, &crate::ID);
    
    accounts.push(LzAccount {
        pubkey: peer_key,
        is_signer: false,
        is_writable: false,
    });
    
    // 3. lz_receive_types PDA (read-only) - REQUIRED THIRD
    accounts.push(LzAccount {
        pubkey: ctx.accounts.lz_receive_types.key(),
        is_signer: false,
        is_writable: false,
    });
    
    // 4. LayerZero endpoint program (read-only) - REQUIRED FOURTH
    accounts.push(LzAccount {
        pubkey: store.endpoint,
        is_signer: false,
        is_writable: false,
    });
    
    // 5. Accounts specifically required for calling Endpoint::clear() - CRITICAL
    // These are the accounts that the LayerZero endpoint needs to clear the message
    accounts.extend(get_accounts_for_clear(
        store.endpoint,
        &store.key(),
        params.src_eid,
        &params.sender,
        params.nonce,
        &params.guid,
    )?);
    
    // 6. (Optional) If compose message, add accounts for send_compose()
    if is_compose_message(&params.message) {
        accounts.extend(get_accounts_for_send_compose(
            store.endpoint,
            &store.key(),        // payer = this PDA
            &store.key(),        // receiver (self-compose)
            &params.guid,
            &params.message,
        )?);
    }
    
    msg!("lz_receive_types: Returning {} accounts for src_eid: {}", 
         accounts.len(), params.src_eid);
    
    Ok(accounts)
}

/// Get accounts required for endpoint clear CPI call
fn get_accounts_for_clear(
    endpoint_program: Pubkey,
    oapp_address: &Pubkey,
    src_eid: u32,
    sender: &[u8; 32],
    nonce: u64,
    guid: &[u8; 32],
) -> Result<Vec<LzAccount>> {
    // These are the minimum accounts required by LayerZero endpoint for clear() CPI
    // The exact accounts depend on the LayerZero implementation
    let mut clear_accounts = vec![];
    
    // Endpoint configuration account (read-only)
    let (endpoint_config, _) = Pubkey::find_program_address(
        &[b"EndpointConfig"],
        &endpoint_program,
    );
    clear_accounts.push(LzAccount {
        pubkey: endpoint_config,
        is_signer: false,
        is_writable: false,
    });
    
    // Receive library account (read-only)
    let (receive_library, _) = Pubkey::find_program_address(
        &[b"ReceiveLibrary", oapp_address.as_ref()],
        &endpoint_program,
    );
    clear_accounts.push(LzAccount {
        pubkey: receive_library,
        is_signer: false,
        is_writable: false,
    });
    
    // Nonce account (writable) - for replay protection
    let nonce_seed = format!("{}:{}:{}", src_eid, sender.iter().map(|b| format!("{:02x}", b)).collect::<String>(), nonce);
    let (nonce_account, _) = Pubkey::find_program_address(
        &[b"Nonce", nonce_seed.as_bytes()],
        &endpoint_program,
    );
    clear_accounts.push(LzAccount {
        pubkey: nonce_account,
        is_signer: false,
        is_writable: true,
    });
    
    // Payload hash account (writable) - for message verification
    let (payload_hash, _) = Pubkey::find_program_address(
        &[b"PayloadHash", guid],
        &endpoint_program,
    );
    clear_accounts.push(LzAccount {
        pubkey: payload_hash,
        is_signer: false,
        is_writable: true,
    });
    
    Ok(clear_accounts)
}

/// Get accounts required for send compose CPI call
fn get_accounts_for_send_compose(
    endpoint_program: Pubkey,
    _payer: &Pubkey,
    receiver: &Pubkey,
    guid: &[u8; 32],
    _message: &[u8],
) -> Result<Vec<LzAccount>> {
    let mut compose_accounts = vec![];
    
    // Compose queue account (writable)
    let (compose_queue, _) = Pubkey::find_program_address(
        &[b"ComposeQueue", receiver.as_ref(), guid],
        &endpoint_program,
    );
    compose_accounts.push(LzAccount {
        pubkey: compose_queue,
        is_signer: false,
        is_writable: true,
    });
    
    // System program for account creation
    compose_accounts.push(LzAccount {
        pubkey: anchor_lang::system_program::ID,
        is_signer: false,
        is_writable: false,
    });
    
    Ok(compose_accounts)
}

/// Check if message is a compose message
fn is_compose_message(message: &[u8]) -> bool {
    // Check if message has compose flag or specific compose message type
    // This depends on your message codec implementation
    if message.len() < 1 {
        return false;
    }
    
    // Simple check - you may need to adjust based on your message format
    // For now, assume first byte indicates compose if it's 0xFF
    message[0] == 0xFF
}
