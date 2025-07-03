use anchor_lang::prelude::*;

/// Cross-chain message structure for LayerZero communications
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CrossChainMessage {
    /// Message command type
    pub command: MessageCommand,

    /// Message payload (optional additional data)
    pub payload: Vec<u8>,

    /// Nonce for replay protection
    pub nonce: u64,

    /// Timestamp when message was created
    pub timestamp: i64,

    /// The sender's address on the source chain (Ethereum DAO)
    pub sender: [u8; 20], // Ethereum address
}

impl CrossChainMessage {
    /// Create a new cross-chain message
    pub fn new(
        nonce: u64,
        sender: [u8; 20],
        command: MessageCommand,
    ) -> Self {
        Self {
            command,
            payload: Vec::new(),
            nonce,
            timestamp: Clock::get().unwrap().unix_timestamp,
            sender,
        }
    }

    /// Validate message timing (not too old, not in future)
    pub fn validate_timing(&self) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;
        let max_age = 300; // 5 minutes
        let max_future = 60; // 1 minute

        if self.timestamp < current_time - max_age {
            return Err(error!(crate::error::ErrorCode::MessageTooOld));
        }

        if self.timestamp > current_time + max_future {
            return Err(error!(crate::error::ErrorCode::MessageFromFuture));
        }

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum MessageCommand {
    /// Update the entire collection metadata URI
    UpdateCollectionMetadata { new_uri: String },

    /// Batch update individual cNFT metadata
    BatchUpdateMetadata { updates: Vec<MetadataUpdate> },

    /// Transfer tree authority to a new address
    TransferAuthority { new_authority: Pubkey },

    /// Pause/unpause the controller
    SetPaused { paused: bool },

    /// Mint new cNFTs to specified recipients
    MintCnfts { mint_requests: Vec<MintRequest> },

    /// Burn specific cNFTs
    BurnCnfts { burn_requests: Vec<BurnRequest> },

    /// Transfer cNFT ownership
    TransferCnfts { transfer_requests: Vec<TransferRequest> },

    /// Update tree configuration
    UpdateTreeConfig { new_config: TreeConfig },

    /// Verify and update Merkle tree state
    VerifyTreeState { tree_state: TreeStateProof },
}

/// Update metadata for a specific cNFT
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MetadataUpdate {
    /// Leaf index of the cNFT to update
    pub leaf_index: u32,

    /// New metadata URI
    pub new_uri: String,

    /// Proof for the update operation
    pub proof: Vec<[u8; 32]>,
}

/// Request to mint a new cNFT
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MintRequest {
    /// Recipient of the new cNFT
    pub to: Pubkey,

    /// Metadata for the new cNFT
    pub metadata: CnftMetadata,

    /// Optional creator royalties
    pub creators: Option<Vec<Creator>>,

    /// Whether this cNFT is mutable
    pub is_mutable: bool,

    /// Collection verification (if part of a verified collection)
    pub collection: Option<Collection>,
}

/// Request to burn a cNFT
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BurnRequest {
    /// Leaf index of the cNFT to burn
    pub leaf_index: u32,

    /// Current owner (for verification)
    pub current_owner: Pubkey,

    /// Merkle proof for the burn operation
    pub proof: Vec<[u8; 32]>,
}

/// Request to transfer a cNFT
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TransferRequest {
    /// Leaf index of the cNFT to transfer
    pub leaf_index: u32,

    /// Current owner
    pub from: Pubkey,

    /// New owner
    pub to: Pubkey,

    /// Merkle proof for the transfer
    pub proof: Vec<[u8; 32]>,
}

/// Configuration for the Merkle tree
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TreeConfig {
    /// Maximum tree depth
    pub max_depth: u32,

    /// Maximum buffer size
    pub max_buffer_size: u32,

    /// Whether the tree allows public operations
    pub public: bool,

    /// Fee configuration for operations
    pub fee_config: Option<FeeConfig>,
}

/// Proof of tree state for verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TreeStateProof {
    /// Root hash of the tree
    pub root: [u8; 32],

    /// Number of items in the tree
    pub item_count: u64,

    /// Sequence number for ordering
    pub sequence: u64,

    /// Merkle proof validating the state
    pub proof: Vec<[u8; 32]>,
}

/// Compressed NFT metadata structure
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CnftMetadata {
    /// Name of the cNFT
    pub name: String,

    /// Symbol of the cNFT
    pub symbol: String,

    /// URI pointing to off-chain metadata
    pub uri: String,

    /// Optional description
    pub description: Option<String>,

    /// Seller fee basis points (royalties)
    pub seller_fee_basis_points: u16,

    /// Image URI
    pub image: Option<String>,

    /// Animation URL
    pub animation_url: Option<String>,

    /// External URL
    pub external_url: Option<String>,

    /// Attributes/traits
    pub attributes: Option<Vec<Attribute>>,

    /// Properties
    pub properties: Option<Properties>,
}

/// NFT Creator information
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Creator {
    /// Creator's public key
    pub address: Pubkey,

    /// Whether this creator has verified the NFT
    pub verified: bool,

    /// Percentage share (0-100)
    pub share: u8,
}

/// Collection information
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Collection {
    /// Collection mint address
    pub key: Pubkey,

    /// Whether this NFT is verified as part of the collection
    pub verified: bool,
}

/// Fee configuration for tree operations
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct FeeConfig {
    /// Fee per mint operation (in lamports)
    pub mint_fee: u64,

    /// Fee per transfer operation (in lamports)
    pub transfer_fee: u64,

    /// Fee per burn operation (in lamports)
    pub burn_fee: u64,

    /// Recipient of the fees
    pub fee_recipient: Pubkey,
}

/// NFT Attribute/Trait
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Attribute {
    /// Trait type
    pub trait_type: String,

    /// Trait value
    pub value: String,

    /// Optional display type
    pub display_type: Option<String>,
}

/// NFT Properties
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Properties {
    /// Files associated with the NFT
    pub files: Option<Vec<File>>,

    /// Category of the NFT
    pub category: Option<String>,
}

/// File associated with NFT
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct File {
    /// File URI
    pub uri: String,

    /// File type/MIME type
    pub file_type: Option<String>,
}

/// Event emitted when a cross-chain message is processed
#[event]
pub struct CrossChainMessageProcessed {
    pub nonce: u64,
    pub sender: [u8; 20],
    pub command_type: String,
    pub timestamp: i64,
    pub success: bool,
}
