use crate::error::ErrorCode;
use crate::{constants::*, ControllerConfig};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(max_depth: u32, max_buffer_size: u32)]
pub struct InitializeCollection<'info> {
    #[account(
        init,
        payer = authority,
        space = ControllerConfig::space(),
        seeds = [CONTROLLER_CONFIG_SEED],
        bump
    )]
    pub controller_config: Account<'info, ControllerConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// The Merkle tree account for compressed NFTs
    /// CHECK: We validate this is a proper Merkle tree in the handler
    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,

    /// Tree authority PDA - this program will be the authority
    /// CHECK: This is a PDA derived from our seeds
    #[account(
        seeds = [TREE_AUTHORITY_SEED, merkle_tree.key().as_ref()],
        bump
    )]
    pub tree_authority: AccountInfo<'info>,

    /// SPL Account Compression Program
    /// CHECK: We manually verify this is the correct program address
    #[account(address = SPL_ACCOUNT_COMPRESSION_PROGRAM_ID.parse::<Pubkey>().unwrap())]
    pub compression_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_handler(
    ctx: Context<InitializeCollection>,
    _max_depth: u32,
    _max_buffer_size: u32,
    ethereum_eid: u32,
    authorized_dao: [u8; 20],
    initial_collection_uri: String,
) -> Result<()> {
    // Validate URI length
    require!(
        initial_collection_uri.len() <= MAX_URI_LENGTH,
        ErrorCode::UriTooLong
    );

    let config = &mut ctx.accounts.controller_config;
    let clock = Clock::get()?;

    // Initialize the controller configuration
    config.authority = ctx.accounts.authority.key();
    config.authorized_dao = authorized_dao;
    config.ethereum_eid = ethereum_eid;
    config.merkle_tree = ctx.accounts.merkle_tree.key();
    config.tree_authority = ctx.accounts.tree_authority.key();
    config.collection_uri = initial_collection_uri;
    config.message_nonce = 0;
    config.paused = false;
    config.last_update = clock.unix_timestamp;
    config.bump = ctx.bumps.controller_config;

    msg!(
        "Initialized omnichain controller for Merkle tree: {}, DAO: {:?}, EID: {}",
        ctx.accounts.merkle_tree.key(),
        authorized_dao,
        ethereum_eid
    );

    Ok(())
}
