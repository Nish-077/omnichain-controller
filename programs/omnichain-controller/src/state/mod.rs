pub mod controller_config;
pub mod message_types;
pub mod oapp_store;
pub mod msg_codec;
pub mod collection_manager;

// Re-export controller config types
pub use controller_config::ControllerConfig;

// Re-export message types
pub use message_types::{
    MintRequest, BurnRequest, TransferRequest, 
    TreeConfig, TreeStateProof, CnftMetadata, 
    Attribute, Properties
};

// Re-export OApp store types
pub use oapp_store::{
    OAppStore, PeerConfig, LzReceiveTypes, LzComposeTypes,
    CollectionMetadata, DaoConfig
};

// Re-export message codec
pub use msg_codec::{
    MessageCodec, DecodedMessage, UpdateMetadataPayload, MessageValidator
};

// Re-export collection manager types (Phase 5)
pub use collection_manager::{
    CollectionManager, MassiveTreeConfig, ThemeConfig, TierConfig,
    MassOperationFees, OperationStatus, OperationType, Status
};
