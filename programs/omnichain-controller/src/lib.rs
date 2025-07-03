pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use state::*;
pub use instructions::*;

// Re-export specific types at crate level for backward compatibility
pub use state::message_types::{MintRequest, BurnRequest, TransferRequest, TreeConfig, TreeStateProof, CnftMetadata};
pub use state::message_types_v2::MetadataUpdate;

declare_id!("GNkuaJZASsQSS1C5eU5x8mB63Lhty3MgpiK6tsg8dchf");

#[program]
pub mod omnichain_controller {
    use super::*;

    /// Initialize the omnichain controller with collection configuration
    pub fn initialize_collection(
        ctx: Context<InitializeCollection>,
        max_depth: u32,
        max_buffer_size: u32,
        ethereum_eid: u32,
        authorized_dao: [u8; 20],
        initial_collection_uri: String,
    ) -> Result<()> {
        instructions::initialize_handler(
            ctx,
            max_depth,
            max_buffer_size,
            ethereum_eid,
            authorized_dao,
            initial_collection_uri,
        )
    }

    /// Receive and process LayerZero cross-chain messages (V2 format)
    pub fn receive_layerzero_message_v2(
        ctx: Context<ReceiveLayerZeroMessageV2>,
        src_eid: u32,
        message: Vec<u8>,
    ) -> Result<()> {
        instructions::handle_layerzero_message_v2(ctx, src_eid, message)
    }

    /// Receive and process LayerZero cross-chain messages
    pub fn receive_layerzero_message(
        ctx: Context<ReceiveLayerZeroMessage>,
        src_eid: u32,
        message: Vec<u8>,
    ) -> Result<()> {
        instructions::receive_message_handler(ctx, src_eid, message)
    }

    /// Update collection metadata based on cross-chain command
    pub fn update_collection_metadata(
        ctx: Context<UpdateCollectionMetadata>,
        new_uri: String,
        new_name: String,
        new_symbol: String,
    ) -> Result<()> {
        instructions::update_metadata_handler(ctx, new_uri, new_name, new_symbol)
    }
}
