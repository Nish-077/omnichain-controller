use anchor_lang::prelude::*;

/// Main configuration account for the omnichain controller
/// This holds the authority settings, LayerZero configuration, and collection metadata
#[account]
pub struct ControllerConfig {
    /// The program authority (can update configuration)
    pub authority: Pubkey,

    /// The Ethereum DAO address that can send cross-chain messages
    pub authorized_dao: [u8; 20], // Ethereum address is 20 bytes

    /// LayerZero endpoint ID for Ethereum (where messages originate)
    pub ethereum_eid: u32,

    /// The Merkle tree address for the compressed NFT collection
    pub merkle_tree: Pubkey,

    /// Tree authority (should be this program's PDA)
    pub tree_authority: Pubkey,

    /// Current collection metadata URI
    pub collection_uri: String,

    /// Message nonce to prevent replay attacks
    pub message_nonce: u64,

    /// Whether the controller is paused (emergency stop)
    pub paused: bool,

    /// Last update timestamp
    pub last_update: i64,

    /// Bump seed for PDA
    pub bump: u8,
}

impl ControllerConfig {
    /// Calculate space needed for the account
    pub const fn space() -> usize {
        8 + // discriminator
        32 + // authority
        20 + // authorized_dao
        4 + // ethereum_eid
        32 + // merkle_tree
        32 + // tree_authority
        4 + 200 + // collection_uri (max 200 chars)
        8 + // message_nonce
        1 + // paused
        8 + // last_update
        1 // bump
    }
}




