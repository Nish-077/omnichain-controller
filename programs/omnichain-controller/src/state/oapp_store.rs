use anchor_lang::prelude::*;

/// LayerZero OApp Store - Main configuration PDA
#[account]
pub struct OAppStore {
    /// Program admin authority
    pub admin: Pubkey,
    /// LayerZero endpoint program
    pub endpoint: Pubkey,
    /// OApp delegate for endpoint operations
    pub delegate: Pubkey,
    /// Bump seed for PDA
    pub bump: u8,
    /// Collection metadata state
    pub collection_metadata: CollectionMetadata,
    /// DAO configuration
    pub dao_config: DaoConfig,
    /// Nonce for message ordering
    pub nonce: u64,
    /// Replay protection
    pub processed_messages: u64,
}

impl OAppStore {
    pub const LEN: usize = 8 + // discriminator
        32 + // admin
        32 + // endpoint
        32 + // delegate
        1 + // bump
        CollectionMetadata::LEN + // collection_metadata
        DaoConfig::LEN + // dao_config
        8 + // nonce
        8; // processed_messages

    pub const SEEDS: &'static [u8] = b"Store";

    pub fn find_pda() -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[Self::SEEDS],
            &crate::ID,
        )
    }
}

/// Cross-chain peer configuration
#[account]
pub struct PeerConfig {
    /// Source endpoint ID
    pub src_eid: u32,
    /// Peer address (bytes32 for non-EVM compatibility)
    pub peer_address: [u8; 32],
    /// Whether this peer is trusted
    pub trusted: bool,
    /// Bump seed for PDA
    pub bump: u8,
}

impl PeerConfig {
    pub const LEN: usize = 8 + // discriminator
        4 + // src_eid
        32 + // peer_address
        1 + // trusted
        1; // bump

    pub const SEEDS: &'static [u8] = b"Peer";

    pub fn find_pda(store: &Pubkey, src_eid: u32) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[Self::SEEDS, store.as_ref(), &src_eid.to_le_bytes()],
            &crate::ID,
        )
    }
}

/// LayerZero receive types configuration
#[account]
pub struct LzReceiveTypes {
    /// OApp store reference
    pub store: Pubkey,
    /// Supported message types
    pub message_types: Vec<u8>,
    /// Bump seed for PDA
    pub bump: u8,
}

impl LzReceiveTypes {
    pub const LEN: usize = 8 + // discriminator
        32 + // store
        4 + 32 + // message_types (Vec<u8> with max 32 types)
        1; // bump

    pub const SEEDS: &'static [u8] = b"LzReceiveTypes";

    pub fn find_pda(store: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[Self::SEEDS, store.as_ref()],
            &crate::ID,
        )
    }
}

/// LayerZero compose types configuration
#[account]
pub struct LzComposeTypes {
    /// OApp store reference
    pub store: Pubkey,
    /// Supported compose message types
    pub compose_types: Vec<u8>,
    /// Bump seed for PDA
    pub bump: u8,
}

impl LzComposeTypes {
    pub const LEN: usize = 8 + // discriminator
        32 + // store
        4 + 32 + // compose_types (Vec<u8> with max 32 types)
        1; // bump

    pub const SEEDS: &'static [u8] = b"LzComposeTypes";

    pub fn find_pda(store: &Pubkey) -> (Pubkey, u8) {
        Pubkey::find_program_address(
            &[Self::SEEDS, store.as_ref()],
            &crate::ID,
        )
    }
}

/// Collection metadata configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CollectionMetadata {
    /// Collection name
    pub name: String,
    /// Collection symbol
    pub symbol: String,
    /// Collection URI
    pub uri: String,
    /// Collection mint authority
    pub mint_authority: Pubkey,
    /// Collection update authority
    pub update_authority: Pubkey,
    /// Merkle tree configuration
    pub tree_config: TreeConfig,
}

impl CollectionMetadata {
    pub const LEN: usize = 
        4 + 32 + // name (max 32 chars)
        4 + 16 + // symbol (max 16 chars)
        4 + 200 + // uri (max 200 chars)
        32 + // mint_authority
        32 + // update_authority
        TreeConfig::LEN; // tree_config
}

/// DAO configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct DaoConfig {
    /// Authorized DAO address on Ethereum
    pub authorized_dao: [u8; 20],
    /// Ethereum endpoint ID
    pub ethereum_eid: u32,
    /// Minimum voting period
    pub voting_period: u64,
    /// Quorum percentage (0-100)
    pub quorum: u8,
}

impl DaoConfig {
    pub const LEN: usize = 
        20 + // authorized_dao
        4 + // ethereum_eid
        8 + // voting_period
        1; // quorum
}

/// Tree configuration for cNFT collection
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TreeConfig {
    /// Maximum depth of the merkle tree
    pub max_depth: u32,
    /// Maximum buffer size
    pub max_buffer_size: u32,
    /// Tree creator
    pub tree_creator: Pubkey,
    /// Tree delegate
    pub tree_delegate: Pubkey,
    /// Public key of the merkle tree account
    pub merkle_tree: Pubkey,
}

impl TreeConfig {
    pub const LEN: usize = 
        4 + // max_depth
        4 + // max_buffer_size
        32 + // tree_creator
        32 + // tree_delegate
        32; // merkle_tree
}
