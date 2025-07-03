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
    pub trusted_ethereum_eid: u32,

    /// Legacy field name for backward compatibility
    pub ethereum_eid: u32,

    /// The Merkle tree address for the compressed NFT collection
    pub merkle_tree: Pubkey,

    /// Tree authority (should be this program's PDA)
    pub tree_authority: Pubkey,

    /// Collection mint address
    pub collection_mint: Pubkey,

    /// Collection authority (for metadata updates)
    pub collection_authority: Pubkey,

    /// Metadata authority (for individual NFT updates)
    pub metadata_authority: Pubkey,

    /// Current collection metadata URI
    pub collection_uri: String,

    /// Collection name
    pub collection_name: String,

    /// Collection symbol
    pub collection_symbol: String,

    /// Last processed message nonce to prevent replay attacks
    pub last_processed_nonce: u64,

    /// Legacy field name for backward compatibility
    pub message_nonce: u64,

    /// Whether the controller is paused (emergency stop)
    pub is_paused: bool,

    /// Legacy field name for backward compatibility
    pub paused: bool,

    /// Total number of updates processed
    pub total_updates: u64,

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
        4 + // trusted_ethereum_eid
        4 + // ethereum_eid (legacy)
        32 + // merkle_tree
        32 + // tree_authority
        32 + // collection_mint
        32 + // collection_authority
        32 + // metadata_authority
        4 + 200 + // collection_uri (max 200 chars)
        4 + 100 + // collection_name (max 100 chars)
        4 + 20 + // collection_symbol (max 20 chars)
        8 + // last_processed_nonce
        8 + // message_nonce (legacy)
        1 + // is_paused
        1 + // paused (legacy)
        8 + // total_updates
        8 + // last_update
        1 // bump
    }
}




