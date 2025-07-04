use anchor_lang::prelude::*;

/// Collection Manager for massive-scale cNFT collections
/// Handles 1M+ cNFTs with dynamic themes and batch operations
#[account]
pub struct CollectionManager {
    /// Authority who can manage the collection
    pub authority: Pubkey,
    
    /// Merkle tree storing the compressed NFTs
    pub merkle_tree: Pubkey,
    
    /// Tree authority PDA
    pub tree_authority: Pubkey,
    
    /// Configuration for massive operations
    pub config: MassiveTreeConfig,
    
    /// Current theme configuration
    pub current_theme: ThemeConfig,
    
    /// Alternative themes available
    pub available_themes: Vec<ThemeConfig>,
    
    /// Total number of cNFTs minted
    pub total_minted: u64,
    
    /// Collection creation timestamp
    pub created_at: i64,
    
    /// Last update timestamp
    pub last_update: i64,
    
    /// Whether the collection is active
    pub is_active: bool,
    
    /// Bump seed for PDA
    pub bump: u8,
    
    /// Reserved space for future upgrades
    pub reserved: [u8; 64],
}

impl CollectionManager {
    pub const SIZE: usize = 8 + // discriminator
        32 + // authority
        32 + // merkle_tree
        32 + // tree_authority
        MassiveTreeConfig::SIZE + // config
        ThemeConfig::SIZE + // current_theme
        (4 + 5 * ThemeConfig::SIZE) + // available_themes (max 5)
        8 + // total_minted
        8 + // created_at
        8 + // last_update
        1 + // is_active
        1 + // bump
        64; // reserved

    /// Add a new theme to available themes
    pub fn add_theme(&mut self, theme: ThemeConfig) -> Result<()> {
        require!(
            self.available_themes.len() < 5,
            crate::error::ErrorCode::TooManyThemes
        );
        
        // Check for duplicate theme names
        for existing_theme in &self.available_themes {
            require!(
                existing_theme.name != theme.name,
                crate::error::ErrorCode::DuplicateTheme
            );
        }
        
        self.available_themes.push(theme);
        self.last_update = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Switch to a different theme
    pub fn switch_theme(&mut self, theme_name: &str) -> Result<()> {
        // Check if theme exists in available themes
        let theme = self.available_themes
            .iter()
            .find(|t| t.name == theme_name)
            .ok_or(crate::error::ErrorCode::ThemeNotFound)?;
        
        self.current_theme = theme.clone();
        self.last_update = Clock::get()?.unix_timestamp;
        
        msg!("🎨 Theme switched to: {}", theme_name);
        Ok(())
    }

    /// Get current capacity utilization percentage
    pub fn get_utilization(&self) -> f64 {
        let capacity = 2u64.pow(self.config.max_depth);
        (self.total_minted as f64 / capacity as f64) * 100.0
    }

    /// Check if collection can handle additional mints
    pub fn can_mint(&self, count: u64) -> bool {
        let capacity = 2u64.pow(self.config.max_depth);
        self.total_minted + count <= capacity
    }

    /// Update minted count
    pub fn increment_minted(&mut self, count: u64) -> Result<()> {
        require!(
            self.can_mint(count),
            crate::error::ErrorCode::CollectionFull
        );
        
        self.total_minted += count;
        self.last_update = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

/// Configuration for massive-scale operations
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MassiveTreeConfig {
    /// Maximum tree depth (determines capacity)
    pub max_depth: u32,
    
    /// Maximum buffer size for efficient operations
    pub max_buffer_size: u32,
    
    /// Optimal batch size for this collection
    pub batch_size: u32,
    
    /// Chunk size for processing large batches
    pub chunk_size: u32,
    
    /// Fee configuration
    pub fee_config: Option<MassOperationFees>,
}

impl MassiveTreeConfig {
    pub const SIZE: usize = 4 + 4 + 4 + 4 + (1 + MassOperationFees::SIZE);
}

/// Fee structure for massive operations
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MassOperationFees {
    pub mint_fee: u64,
    pub batch_update_fee: u64,
    pub theme_change_fee: u64,
    pub fee_recipient: Pubkey,
}

impl MassOperationFees {
    pub const SIZE: usize = 8 + 8 + 8 + 32;
}

/// Theme configuration for dynamic metadata
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ThemeConfig {
    /// Theme name (e.g., "Standard", "Golden", "Cosmic")
    pub name: String,
    
    /// Base URI for this theme's metadata
    pub base_uri: String,
    
    /// Additional attributes for this theme
    pub attributes: Vec<(String, String)>,
    
    /// Theme creation timestamp
    pub created_at: i64,
}

impl ThemeConfig {
    pub const SIZE: usize = 
        (4 + 32) + // name (max 32 chars)
        (4 + 128) + // base_uri (max 128 chars)
        (4 + 5 * (4 + 32 + 4 + 64)) + // attributes (max 5, key max 32, value max 64)
        8; // created_at

    /// Create a new theme configuration
    pub fn new(name: String, base_uri: String) -> Self {
        Self {
            name,
            base_uri,
            attributes: Vec::new(),
            created_at: Clock::get().unwrap().unix_timestamp,
        }
    }

    /// Add an attribute to the theme
    pub fn add_attribute(&mut self, key: String, value: String) -> Result<()> {
        require!(
            self.attributes.len() < 5,
            crate::error::ErrorCode::TooManyAttributes
        );
        
        self.attributes.push((key, value));
        Ok(())
    }

    /// Generate metadata URI for a specific cNFT
    pub fn generate_metadata_uri(&self, token_id: u64, tier: Option<&str>) -> String {
        let tier_path = tier.map(|t| format!("/{}", t.to_lowercase())).unwrap_or_default();
        format!("{}{}/{}.json", self.base_uri, tier_path, token_id)
    }
}

/// Tier information for cNFTs
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TierConfig {
    /// Tier name (e.g., "Bronze", "Silver", "Gold", "Platinum")
    pub name: String,
    
    /// Tier level (higher is better)
    pub level: u8,
    
    /// Additional attributes for this tier
    pub attributes: Vec<(String, String)>,
    
    /// Requirements to achieve this tier
    pub requirements: Vec<String>,
}

impl TierConfig {
    pub const SIZE: usize = 
        (4 + 32) + // name
        1 + // level
        (4 + 3 * (4 + 32 + 4 + 64)) + // attributes (max 3)
        (4 + 3 * (4 + 128)); // requirements (max 3, max 128 chars each)
}

/// Operation status for tracking large operations
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct OperationStatus {
    /// Unique operation ID
    pub operation_id: String,
    
    /// Operation type
    pub operation_type: OperationType,
    
    /// Current status
    pub status: Status,
    
    /// Items processed so far
    pub items_processed: u32,
    
    /// Total items to process
    pub items_total: u32,
    
    /// Start timestamp
    pub started_at: i64,
    
    /// Completion timestamp
    pub completed_at: Option<i64>,
    
    /// Error message if failed
    pub error_message: Option<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum OperationType {
    MassMint,
    BatchThemeUpdate,
    TierPromotion,
    CollectionMigration,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum Status {
    Pending,
    InProgress,
    Completed,
    Failed,
    Paused,
}

impl OperationStatus {
    /// Size calculation for account allocation
    pub const SIZE: usize = 4 + 32 + // operation_id (String)
                           1 + // operation_type (enum)
                           1 + // status (enum)
                           4 + // items_processed (u32)
                           4 + // items_total (u32)
                           8 + // started_at (i64)
                           1 + 8 + // completed_at (Option<i64>)
                           1 + 4 + 200; // error_message (Option<String>, max 200 chars)

    /// Calculate progress percentage
    pub fn get_progress(&self) -> f64 {
        if self.items_total == 0 {
            return 0.0;
        }
        (self.items_processed as f64 / self.items_total as f64) * 100.0
    }

    /// Calculate estimated time remaining
    pub fn get_estimated_time_remaining(&self) -> Option<i64> {
        if self.items_processed == 0 || matches!(self.status, Status::Completed | Status::Failed) {
            return None;
        }

        let elapsed = Clock::get().ok()?.unix_timestamp - self.started_at;
        let rate = self.items_processed as f64 / elapsed as f64;
        let remaining_items = self.items_total - self.items_processed;
        
        Some((remaining_items as f64 / rate) as i64)
    }
}
