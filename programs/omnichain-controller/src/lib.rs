pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod cpi;

use anchor_lang::prelude::*;

pub use constants::*;
pub use state::*;
pub use instructions::*;

// Re-export specific types at crate level for backward compatibility
pub use state::{MintRequest, BurnRequest, TransferRequest, TreeConfig, TreeStateProof, CnftMetadata};

declare_id!("GNkuaJZASsQSS1C5eU5x8mB63Lhty3MgpiK6tsg8dchf");

#[program]
pub mod omnichain_controller {
    use super::*;

    // ===============================
    // LayerZero OApp Standard Instructions
    // ===============================

    /// Initialize the LayerZero OApp Store (NEW) - CRITICAL: Includes endpoint registration
    pub fn init_oapp_store(
        ctx: Context<InitOAppStore>,
        params: InitOAppStoreParams,
    ) -> Result<()> {
        instructions::init_oapp_store_handler(ctx, params)
    }

    /// LayerZero receive types instruction - CRITICAL for account discovery
    pub fn lz_receive_types(
        ctx: Context<LzReceiveTypesContext>,
        params: LzReceiveParams,
    ) -> Result<Vec<LzAccount>> {
        instructions::lz_receive_types_handler(ctx, params)
    }

    /// LayerZero receive message handler (NEW)
    pub fn lz_receive(
        ctx: Context<LzReceive>,
        src_eid: u32,
        sender: [u8; 32],
        nonce: u64,
        guid: [u8; 32],
        message: Vec<u8>,
    ) -> Result<()> {
        instructions::lz_receive_handler(ctx, src_eid, sender, nonce, guid, message)
    }

    /// LayerZero compose message handler (NEW)
    pub fn lz_compose(
        ctx: Context<LzCompose>,
        src_eid: u32,
        sender: [u8; 32],
        nonce: u64,
        guid: [u8; 32],
        message: Vec<u8>,
    ) -> Result<()> {
        instructions::lz_compose_handler(ctx, src_eid, sender, nonce, guid, message)
    }

    // ===============================
    // Legacy Instructions (for backward compatibility)
    // ===============================

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

    // ===============================
    // Phase 5: Massive cNFT Operations (TEMPORARILY DISABLED FOR IDL COMPATIBILITY)
    // TODO: Re-enable once ThemeConfig IDL issue is resolved
    // ===============================

    // Initialize a massive collection capable of handling 1M+ cNFTs
    // TODO: Re-enable once ThemeConfig IDL issue is resolved
    // pub fn initialize_massive_collection(
    //     ctx: Context<InitializeMassiveCollection>,
    //     config: MassiveTreeConfig,
    //     initial_theme: String,
    // ) -> Result<()> {
    //     instructions::initialize_massive_collection_handler(ctx, config, initial_theme)
    // }

    // Note: Additional mass operations can be added here as needed
}
