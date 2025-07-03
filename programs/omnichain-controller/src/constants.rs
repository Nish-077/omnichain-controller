// PDA seeds
pub const CONTROLLER_CONFIG_SEED: &[u8] = b"controller_config";
pub const TREE_AUTHORITY_SEED: &[u8] = b"tree_authority";

// LayerZero constants
pub const ETHEREUM_MAINNET_EID: u32 = 101;
pub const ETHEREUM_SEPOLIA_EID: u32 = 161;

// Validation constants
pub const MAX_URI_LENGTH: usize = 200;
pub const MAX_BATCH_SIZE: usize = 100;
pub const MAX_MINT_BATCH_SIZE: usize = 50;
pub const MAX_BURN_BATCH_SIZE: usize = 100;
pub const MAX_TRANSFER_BATCH_SIZE: usize = 100;
pub const MESSAGE_TIMEOUT_SECONDS: i64 = 3600; // 1 hour

// Metadata limits
pub const MAX_NAME_LENGTH: usize = 32;
pub const MAX_SYMBOL_LENGTH: usize = 10;
pub const MAX_DESCRIPTION_LENGTH: usize = 1000;
pub const MAX_ATTRIBUTES_COUNT: usize = 50;
pub const MAX_CREATORS_COUNT: usize = 5;
pub const MAX_FILES_COUNT: usize = 10;

// Fee limits
pub const MAX_ROYALTY_BASIS_POINTS: u16 = 10000; // 100%
pub const MAX_CREATOR_SHARE: u8 = 100;

// Tree configuration limits
pub const MIN_TREE_DEPTH: u32 = 3;
pub const MAX_TREE_DEPTH: u32 = 30;
pub const MIN_BUFFER_SIZE: u32 = 8;
pub const MAX_BUFFER_SIZE: u32 = 2048;

// Program addresses (using your solution for spl-account-compression)
pub const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID: &str = "cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK";
pub const SPL_NOOP_PROGRAM_ID: &str = "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV";
pub const MPL_BUBBLEGUM_PROGRAM_ID: &str = "BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY";
