use anchor_lang::prelude::*;
use crate::state::*;

/// Initialize the LayerZero OApp Store
#[derive(Accounts)]
pub struct InitOAppStore<'info> {
    #[account(
        init,
        payer = payer,
        space = OAppStore::LEN,
        seeds = [OAppStore::SEEDS],
        bump
    )]
    pub store: Account<'info, OAppStore>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// Admin authority for the OApp
    pub admin: Signer<'info>,
    
    /// LayerZero endpoint program
    /// CHECK: This is the LayerZero endpoint program
    pub endpoint: AccountInfo<'info>,
    
    /// Delegate for endpoint operations
    /// CHECK: This is the delegate account
    pub delegate: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Initialize LzReceiveTypes account
#[derive(Accounts)]
pub struct InitLzReceiveTypes<'info> {
    #[account(
        init,
        payer = payer,
        space = LzReceiveTypes::LEN,
        seeds = [LzReceiveTypes::SEEDS, store.key().as_ref()],
        bump
    )]
    pub lz_receive_types: Account<'info, LzReceiveTypes>,
    
    #[account(
        has_one = admin,
        seeds = [OAppStore::SEEDS],
        bump = store.bump
    )]
    pub store: Account<'info, OAppStore>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Initialize LzComposeTypes account
#[derive(Accounts)]
pub struct InitLzComposeTypes<'info> {
    #[account(
        init,
        payer = payer,
        space = LzComposeTypes::LEN,
        seeds = [LzComposeTypes::SEEDS, store.key().as_ref()],
        bump
    )]
    pub lz_compose_types: Account<'info, LzComposeTypes>,
    
    #[account(
        has_one = admin,
        seeds = [OAppStore::SEEDS],
        bump = store.bump
    )]
    pub store: Account<'info, OAppStore>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Set peer configuration
#[derive(Accounts)]
#[instruction(src_eid: u32)]
pub struct SetPeer<'info> {
    #[account(
        init,
        payer = payer,
        space = PeerConfig::LEN,
        seeds = [PeerConfig::SEEDS, store.key().as_ref(), &src_eid.to_le_bytes()],
        bump
    )]
    pub peer_config: Account<'info, PeerConfig>,
    
    #[account(
        mut,
        has_one = admin,
        seeds = [OAppStore::SEEDS],
        bump = store.bump
    )]
    pub store: Account<'info, OAppStore>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Handler for initializing the OApp store
pub fn init_oapp_store_handler(
    ctx: Context<InitOAppStore>,
    collection_metadata: CollectionMetadata,
    dao_config: DaoConfig,
) -> Result<()> {
    let store = &mut ctx.accounts.store;
    
    store.admin = ctx.accounts.admin.key();
    store.endpoint = ctx.accounts.endpoint.key();
    store.delegate = ctx.accounts.delegate.key();
    store.bump = ctx.bumps.store;
    store.collection_metadata = collection_metadata;
    store.dao_config = dao_config;
    store.nonce = 0;
    store.processed_messages = 0;
    
    msg!("OApp Store initialized with admin: {}", store.admin);
    Ok(())
}

/// Handler for initializing LzReceiveTypes
pub fn init_lz_receive_types_handler(
    ctx: Context<InitLzReceiveTypes>,
    message_types: Vec<u8>,
) -> Result<()> {
    let lz_receive_types = &mut ctx.accounts.lz_receive_types;
    
    lz_receive_types.store = ctx.accounts.store.key();
    lz_receive_types.message_types = message_types;
    lz_receive_types.bump = ctx.bumps.lz_receive_types;
    
    msg!("LzReceiveTypes initialized for store: {}", lz_receive_types.store);
    Ok(())
}

/// Handler for initializing LzComposeTypes
pub fn init_lz_compose_types_handler(
    ctx: Context<InitLzComposeTypes>,
    compose_types: Vec<u8>,
) -> Result<()> {
    let lz_compose_types = &mut ctx.accounts.lz_compose_types;
    
    lz_compose_types.store = ctx.accounts.store.key();
    lz_compose_types.compose_types = compose_types;
    lz_compose_types.bump = ctx.bumps.lz_compose_types;
    
    msg!("LzComposeTypes initialized for store: {}", lz_compose_types.store);
    Ok(())
}

/// Handler for setting peer configuration
pub fn set_peer_handler(
    ctx: Context<SetPeer>,
    src_eid: u32,
    peer_address: [u8; 32],
    trusted: bool,
) -> Result<()> {
    let peer_config = &mut ctx.accounts.peer_config;
    
    peer_config.src_eid = src_eid;
    peer_config.peer_address = peer_address;
    peer_config.trusted = trusted;
    peer_config.bump = ctx.bumps.peer_config;
    
    msg!("Peer configured - EID: {}, Address: {:?}, Trusted: {}", 
         src_eid, peer_address, trusted);
    Ok(())
}
