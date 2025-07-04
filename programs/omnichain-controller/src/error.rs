use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: Only the authorized DAO can perform this action")]
    UnauthorizedDao,

    #[msg("Invalid LayerZero endpoint: Message not from expected Ethereum endpoint")]
    InvalidEndpoint,

    #[msg("Invalid message nonce: Replay attack detected")]
    InvalidNonce,

    #[msg("Controller is paused: Operations temporarily disabled")]
    ControllerPaused,

    #[msg("Invalid message format: Could not deserialize cross-chain message")]
    InvalidMessageFormat,

    #[msg("Merkle tree operation failed")]
    MerkleTreeError,

    #[msg("Collection URI too long: Maximum 200 characters allowed")]
    UriTooLong,

    #[msg("Insufficient authority: Only the program authority can perform this action")]
    InsufficientAuthority,

    #[msg("Invalid timestamp: Message timestamp is too old or in the future")]
    InvalidTimestamp,

    #[msg("Batch size too large: Cannot process more than 100 updates at once")]
    BatchTooLarge,

    // Enhanced error codes for new functionality
    #[msg("Mint batch too large: Cannot mint more than 50 cNFTs at once")]
    MintBatchTooLarge,

    #[msg("Burn batch too large: Cannot burn more than 100 cNFTs at once")]
    BurnBatchTooLarge,

    #[msg("Transfer batch too large: Cannot transfer more than 100 cNFTs at once")]
    TransferBatchTooLarge,

    #[msg("Invalid metadata: Name, symbol, or URI is invalid")]
    InvalidMetadata,

    #[msg("Invalid creator configuration: Invalid share percentage or too many creators")]
    InvalidCreators,

    // LayerZero OApp specific errors
    #[msg("Invalid LayerZero message: Message format is invalid or corrupted")]
    InvalidLzMessage,

    #[msg("Unsupported version: Message version is not supported")]
    UnsupportedVersion,

    #[msg("Invalid command: Command type is not supported")]
    InvalidCommand,

    #[msg("Unsupported command: Command is not implemented")]
    UnsupportedCommand,

    #[msg("Untrusted peer: Message from untrusted peer")]
    UntrustedPeer,

    #[msg("Unauthorized sender: Sender is not authorized")]
    UnauthorizedSender,

    #[msg("Message too large: Message exceeds maximum size")]
    MessageTooLarge,

    #[msg("Endpoint CPI failed: Call to LayerZero endpoint failed")]
    EndpointCpiFailed,

    #[msg("Invalid peer address: Peer address is invalid")]
    InvalidPeerAddress,

    #[msg("Peer not found: Peer configuration not found")]
    PeerNotFound,

    #[msg("Store not initialized: OApp store is not initialized")]
    StoreNotInitialized,

    #[msg("Invalid royalty: Royalty basis points cannot exceed 100%")]
    InvalidRoyalty,

    #[msg("Invalid tree configuration: Tree depth or buffer size out of bounds")]
    InvalidTreeConfig,

    #[msg("Invalid proof: Merkle proof verification failed")]
    InvalidProof,

    #[msg("Leaf not found: The specified leaf index does not exist in the tree")]
    LeafNotFound,

    #[msg("Owner mismatch: The specified owner does not match the actual owner")]
    OwnerMismatch,

    #[msg("Collection not verified: The NFT is not verified as part of this collection")]
    CollectionNotVerified,

    #[msg("Insufficient funds: Not enough funds to pay for the operation")]
    InsufficientFunds,

    #[msg("Invalid fee configuration: Fee amounts or recipient invalid")]
    InvalidFeeConfig,

    #[msg("Tree state mismatch: The provided tree state does not match the current state")]
    TreeStateMismatch,

    #[msg("Operation not allowed: This operation is not permitted in the current state")]
    OperationNotAllowed,

    #[msg("Attribute validation failed: Too many attributes or invalid format")]
    InvalidAttributes,

    #[msg("File validation failed: Too many files or invalid format")]
    InvalidFiles,

    #[msg("Message too old: Message timestamp is beyond acceptable age")]
    MessageTooOld,

    #[msg("Message from future: Message timestamp is too far in the future")]
    MessageFromFuture,

    // V2 Enhanced Error Codes
    #[msg("Invalid merkle tree: Merkle tree configuration or state invalid")]
    InvalidMerkleTree,

    #[msg("Invalid tree authority: Tree authority mismatch")]
    InvalidTreeAuthority,

    #[msg("Invalid collection mint: Collection mint address invalid")]
    InvalidCollectionMint,

    #[msg("Unauthorized source: Message from unauthorized source")]
    UnauthorizedSource,

    #[msg("System paused: All operations are temporarily disabled")]
    SystemPaused,

    #[msg("Unknown command: Received unknown command type")]
    UnknownCommand,

    #[msg("Invalid message: Message format or content invalid")]
    InvalidMessage,

    #[msg("Unsupported message version: Message version not supported")]
    UnsupportedMessageVersion,

    #[msg("Message expired: Message timestamp is too old")]
    MessageExpired,

    // Phase 5: Massive cNFT Operations Error Codes
    #[msg("Invalid tree depth: Tree depth must be between 20-24 for massive collections")]
    InvalidTreeDepth,

    #[msg("Invalid buffer size: Buffer size must be between 64-512 for massive collections")]
    InvalidBufferSize,

    #[msg("Invalid batch size: Batch size must be between 100-2000 for massive collections")]
    InvalidBatchSize,

    #[msg("Empty mint request: Mint request cannot be empty")]
    EmptyMintRequest,

    #[msg("Collection full: Maximum collection size reached")]
    CollectionFull,

    #[msg("Theme not found: Specified theme does not exist")]
    ThemeNotFound,

    #[msg("Invalid range: Start index must be less than end index")]
    InvalidRange,

    #[msg("Range out of bounds: Index range exceeds collection size")]
    RangeOutOfBounds,

    #[msg("Invalid tier promotion: Tier promotion criteria not met")]
    InvalidTierPromotion,

    #[msg("Invalid promotion criteria: Promotion criteria string is invalid")]
    InvalidPromotionCriteria,

    #[msg("Invalid tier: Tier value is not supported")]
    InvalidTier,

    #[msg("Too many themes: Maximum number of themes exceeded")]
    TooManyThemes,

    #[msg("Duplicate theme: Theme with this name already exists")]
    DuplicateTheme,

    #[msg("Too many attributes: Maximum number of attributes exceeded")]
    TooManyAttributes,
}
