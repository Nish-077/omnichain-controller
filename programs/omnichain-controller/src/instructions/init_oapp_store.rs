use anchor_lang::prelude::*;
use crate::state::*;
use crate::cpi::endpoint;

/// Initialize LayerZero OApp Store - CRITICAL: Must register with endpoint
#[derive(Accounts)]
pub struct InitOAppStore<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + OAppStore::LEN,
        seeds = [OAppStore::SEEDS],
        bump
    )]
    pub store: Account<'info, OAppStore>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + LzReceiveTypes::LEN,
        seeds = [LzReceiveTypes::SEEDS, store.key().as_ref()],
        bump
    )]
    pub lz_receive_types: Account<'info, LzReceiveTypes>,
    
    #[account(
        init,
        payer = admin,
        space = 8 + LzComposeTypes::LEN,
        seeds = [LzComposeTypes::SEEDS, store.key().as_ref()],
        bump
    )]
    pub lz_compose_types: Account<'info, LzComposeTypes>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// LayerZero endpoint program
    /// CHECK: This is the LayerZero endpoint program
    pub endpoint: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Parameters for initializing the OApp store
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitOAppStoreParams {
    /// LayerZero endpoint program
    pub endpoint: Pubkey,
    /// OApp delegate (usually admin)
    pub delegate: Pubkey,
    /// Authorized DAO address on Ethereum
    pub authorized_dao: [u8; 20],
    /// Ethereum endpoint ID
    pub ethereum_eid: u32,
    /// Collection metadata
    pub collection_metadata: CollectionMetadata,
}

/// Handler for initializing LayerZero OApp Store
pub fn init_oapp_store_handler(
    ctx: Context<InitOAppStore>,
    params: InitOAppStoreParams,
) -> Result<()> {
    let store = &mut ctx.accounts.store;
    let lz_receive_types = &mut ctx.accounts.lz_receive_types;
    let lz_compose_types = &mut ctx.accounts.lz_compose_types;
    
    // Initialize store state
    store.admin = ctx.accounts.admin.key();
    store.endpoint = params.endpoint;
    store.delegate = params.delegate;
    store.bump = ctx.bumps.store;
    store.collection_metadata = params.collection_metadata;
    store.dao_config = DaoConfig {
        authorized_dao: params.authorized_dao,
        ethereum_eid: params.ethereum_eid,
        voting_period: 86400, // 24 hours default
        quorum: 10, // 10% default
    };
    store.nonce = 0;
    store.processed_messages = 0;
    
    // Initialize lz_receive_types
    lz_receive_types.store = store.key();
    lz_receive_types.message_types = vec![1, 2, 3, 4, 5]; // Default supported message types
    lz_receive_types.bump = ctx.bumps.lz_receive_types;
    
    // Initialize lz_compose_types
    lz_compose_types.store = store.key();
    lz_compose_types.compose_types = vec![1]; // Default compose message type
    lz_compose_types.bump = ctx.bumps.lz_compose_types;
    
    // CRITICAL: Register with LayerZero Endpoint
    let seeds = &[OAppStore::SEEDS, &[store.bump]];
    let endpoint_accounts = &ctx.remaining_accounts[..]; // Accounts for endpoint registration
    
    endpoint::register_oapp(
        &ctx.accounts.endpoint,
        endpoint_accounts,
        seeds,
        &store.key(),
        &params.delegate,
    )?;
    
    msg!("OApp Store initialized - Admin: {}, Endpoint: {}, Delegate: {}", 
         store.admin, store.endpoint, store.delegate);
    
    msg!("LayerZero OApp registered with endpoint - Store: {}", store.key());
    
    Ok(())
}
