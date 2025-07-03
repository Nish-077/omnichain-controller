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
}
