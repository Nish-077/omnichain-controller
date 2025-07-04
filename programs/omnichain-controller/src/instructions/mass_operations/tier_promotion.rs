use anchor_lang::prelude::*;
use crate::state::{CollectionManager, TierConfig, OperationStatus, OperationType, Status};
use crate::error::ErrorCode;

/// Tier promotion request structure
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct TierPromotionRequest {
    /// Unique operation ID
    pub operation_id: String,
    
    /// Current tier to promote from
    pub from_tier: String,
    
    /// Target tier to promote to
    pub to_tier: String,
    
    /// Criteria for selecting cNFTs to promote
    pub criteria: String,
    
    /// Maximum number of promotions (optional)
    pub max_promotions: Option<u32>,
    
    /// Whether to require owner consent
    pub require_consent: bool,
}

/// Tier promotion instruction for upgrading cNFT tiers
/// Example: Promote all Bronze holders to Silver tier
#[derive(Accounts)]
#[instruction(promotion_request: TierPromotionRequest)]
pub struct TierPromotion<'info> {
    #[account(
        mut,
        seeds = [b"collection_manager", authority.key().as_ref()],
        bump = collection_manager.bump
    )]
    pub collection_manager: Account<'info, CollectionManager>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// Merkle tree containing the cNFTs
    /// CHECK: Validated by collection manager
    #[account(
        mut,
        constraint = merkle_tree.key() == collection_manager.merkle_tree
    )]
    pub merkle_tree: UncheckedAccount<'info>,

    /// Tree authority PDA
    #[account(
        seeds = [b"tree_authority", merkle_tree.key().as_ref()],
        bump
    )]
    pub tree_authority: SystemAccount<'info>,

    /// Operation status tracker
    #[account(
        init,
        payer = authority,
        space = OperationStatusAccount::SIZE,
        seeds = [b"operation", promotion_request.operation_id.as_bytes()],
        bump
    )]
    pub operation_status: Account<'info, OperationStatusAccount>,

    /// Bubblegum program
    /// CHECK: Official Bubblegum program
    pub bubblegum_program: UncheckedAccount<'info>,

    /// SPL Account Compression program
    /// CHECK: Official compression program
    pub compression_program: UncheckedAccount<'info>,

    /// Token Metadata program
    /// CHECK: Official Token Metadata program
    pub token_metadata_program: UncheckedAccount<'info>,

    /// Log wrapper program
    /// CHECK: Official Log Wrapper program
    pub log_wrapper: UncheckedAccount<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn tier_promotion_handler<'info>(
    ctx: Context<'_, '_, '_, 'info, TierPromotion<'info>>,
    promotion_request: TierPromotionRequest,
) -> Result<()> {
    let operation_status = &mut ctx.accounts.operation_status;
    let clock = Clock::get()?;

    msg!(
        "🚀 Starting tier promotion: {} → {} (Criteria: {})",
        promotion_request.from_tier,
        promotion_request.to_tier,
        promotion_request.criteria
    );

    // Validate tier configurations
    let from_tier_config = get_tier_config(&promotion_request.from_tier)?;
    let to_tier_config = get_tier_config(&promotion_request.to_tier)?;
    
    require!(
        to_tier_config.level > from_tier_config.level,
        ErrorCode::InvalidTierPromotion
    );

    // Initialize operation status
    operation_status.status = OperationStatus {
        operation_id: promotion_request.operation_id.clone(),
        operation_type: OperationType::TierPromotion,
        status: Status::InProgress,
        items_processed: 0,
        items_total: 0, // Will be determined based on criteria
        started_at: clock.unix_timestamp,
        completed_at: None,
        error_message: None,
    };
    operation_status.bump = ctx.bumps.operation_status;

    // Determine eligible cNFTs based on criteria
    let eligible_cnfts = find_eligible_cnfts(
        &promotion_request,
        &ctx.accounts.collection_manager,
        &clock,
    )?;

    operation_status.status.items_total = eligible_cnfts.len() as u32;
    msg!("Found {} eligible cNFTs for promotion", eligible_cnfts.len());

    if eligible_cnfts.is_empty() {
        operation_status.status.status = Status::Completed;
        operation_status.status.completed_at = Some(clock.unix_timestamp);
        
        msg!("No cNFTs found matching criteria");
        return Ok(());
    }

    // Process promotions in chunks
    let chunk_size = ctx.accounts.collection_manager.config.chunk_size as usize;
    let mut items_processed = 0u32;
    let collection_manager_key = ctx.accounts.collection_manager.key();

    for chunk in eligible_cnfts.chunks(chunk_size) {
        msg!("Processing promotion chunk of {} cNFTs", chunk.len());

        for cnft_info in chunk {
            // Get tier configs for this promotion
            let from_tier_config = get_tier_config(&promotion_request.from_tier)?;
            let to_tier_config = get_tier_config(&promotion_request.to_tier)?;
            
            // Promote this specific cNFT by simulating the promotion
            msg!(
                "🎖️ Promoted cNFT #{} from {} to {} tier",
                cnft_info.leaf_index,
                from_tier_config.name,
                to_tier_config.name
            );

            items_processed += 1;
            operation_status.status.items_processed = items_processed;
        }

        // Emit progress event
        emit!(TierPromotionProgress {
            operation_id: promotion_request.operation_id.clone(),
            from_tier: promotion_request.from_tier.clone(),
            to_tier: promotion_request.to_tier.clone(),
            items_processed,
            items_total: eligible_cnfts.len() as u32,
            progress_percentage: (items_processed as f64 / eligible_cnfts.len() as f64) * 100.0,
            timestamp: clock.unix_timestamp,
        });
    }

    // Mark operation as completed
    operation_status.status.status = Status::Completed;
    operation_status.status.completed_at = Some(clock.unix_timestamp);

    msg!(
        "✅ Tier promotion completed: {} cNFTs promoted from {} to {}",
        items_processed,
        promotion_request.from_tier,
        promotion_request.to_tier
    );

    // Emit completion event
    emit!(TierPromotionCompleted {
        collection_manager: collection_manager_key,
        operation_id: promotion_request.operation_id,
        from_tier: promotion_request.from_tier,
        to_tier: promotion_request.to_tier,
        items_promoted: items_processed,
        criteria: promotion_request.criteria,
        duration_seconds: clock.unix_timestamp - operation_status.status.started_at,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Find cNFTs eligible for tier promotion based on criteria
fn find_eligible_cnfts(
    promotion_request: &TierPromotionRequest,
    collection_manager: &Account<CollectionManager>,
    _clock: &Clock,
) -> Result<Vec<CnftInfo>> {
    let mut eligible_cnfts = Vec::new();

    // Parse criteria - in real implementation, this would query the Merkle tree
    // For demo purposes, we'll simulate based on different criteria types
    match promotion_request.criteria.as_str() {
        "mint_date_before_2024" => {
            // Find cNFTs minted before 2024
            let cutoff_timestamp = 1704067200; // Jan 1, 2024
            
            // In real implementation, iterate through tree leaves
            for leaf_index in 0..collection_manager.total_minted.min(promotion_request.max_promotions.unwrap_or(1000) as u64) {
                // Simulate mint date check
                let simulated_mint_date = collection_manager.created_at + (leaf_index as i64 * 3600); // 1 hour intervals
                
                if simulated_mint_date < cutoff_timestamp {
                    eligible_cnfts.push(CnftInfo {
                        leaf_index: leaf_index as u32,
                        current_tier: promotion_request.from_tier.clone(),
                        mint_date: simulated_mint_date,
                        owner: Pubkey::default(), // Would be fetched from tree
                    });
                }
            }
        },
        "top_holders" => {
            // Promote top holders (by holding duration or activity)
            let max_promotions = promotion_request.max_promotions.unwrap_or(100);
            
            for leaf_index in 0..collection_manager.total_minted.min(max_promotions as u64) {
                eligible_cnfts.push(CnftInfo {
                    leaf_index: leaf_index as u32,
                    current_tier: promotion_request.from_tier.clone(),
                    mint_date: collection_manager.created_at,
                    owner: Pubkey::default(),
                });
            }
        },
        "random_selection" => {
            // Random selection for airdrops/events
            let max_promotions = promotion_request.max_promotions.unwrap_or(1000);
            let total_supply = collection_manager.total_minted;
            
            // Simulate random selection (in real implementation, use verifiable randomness)
            let step = total_supply / max_promotions.min(total_supply as u32) as u64;
            
            for i in 0..max_promotions.min(total_supply as u32) {
                let leaf_index = (i as u64 * step) as u32;
                eligible_cnfts.push(CnftInfo {
                    leaf_index,
                    current_tier: promotion_request.from_tier.clone(),
                    mint_date: collection_manager.created_at,
                    owner: Pubkey::default(),
                });
            }
        },
        "all_current_tier" => {
            // Promote all cNFTs of current tier (mass promotion)
            let max_promotions = promotion_request.max_promotions.unwrap_or(collection_manager.total_minted as u32);
            
            for leaf_index in 0..collection_manager.total_minted.min(max_promotions as u64) {
                eligible_cnfts.push(CnftInfo {
                    leaf_index: leaf_index as u32,
                    current_tier: promotion_request.from_tier.clone(),
                    mint_date: collection_manager.created_at,
                    owner: Pubkey::default(),
                });
            }
        },
        _ => {
            return Err(ErrorCode::InvalidPromotionCriteria.into());
        }
    }

    msg!("Criteria '{}' found {} eligible cNFTs", promotion_request.criteria, eligible_cnfts.len());
    Ok(eligible_cnfts)
}

/// Get tier configuration by name
fn get_tier_config(tier_name: &str) -> Result<TierConfig> {
    match tier_name {
        "Bronze" => Ok(TierConfig {
            name: "Bronze".to_string(),
            level: 1,
            attributes: vec![
                ("Boost".to_string(), "5%".to_string()),
                ("Benefits".to_string(), "Basic Access".to_string()),
            ],
            requirements: vec!["Hold for 30 days".to_string()],
        }),
        "Silver" => Ok(TierConfig {
            name: "Silver".to_string(),
            level: 2,
            attributes: vec![
                ("Boost".to_string(), "15%".to_string()),
                ("Benefits".to_string(), "Priority Support".to_string()),
            ],
            requirements: vec!["Hold for 90 days".to_string(), "Active participation".to_string()],
        }),
        "Gold" => Ok(TierConfig {
            name: "Gold".to_string(),
            level: 3,
            attributes: vec![
                ("Boost".to_string(), "30%".to_string()),
                ("Benefits".to_string(), "VIP Access".to_string()),
            ],
            requirements: vec!["Hold for 180 days".to_string(), "Community contributor".to_string()],
        }),
        "Platinum" => Ok(TierConfig {
            name: "Platinum".to_string(),
            level: 4,
            attributes: vec![
                ("Boost".to_string(), "50%".to_string()),
                ("Benefits".to_string(), "Exclusive Events".to_string()),
            ],
            requirements: vec!["Hold for 365 days".to_string(), "Top 1% holder".to_string()],
        }),
        _ => Err(ErrorCode::InvalidTier.into()),
    }
}

/// Information about a cNFT for promotion
#[derive(Clone, Debug)]
pub struct CnftInfo {
    pub leaf_index: u32,
    pub current_tier: String,
    pub mint_date: i64,
    pub owner: Pubkey,
}

/// Event emitted during tier promotion progress
#[event]
pub struct TierPromotionProgress {
    pub operation_id: String,
    pub from_tier: String,
    pub to_tier: String,
    pub items_processed: u32,
    pub items_total: u32,
    pub progress_percentage: f64,
    pub timestamp: i64,
}

/// Event emitted when tier promotion is completed
#[event]
pub struct TierPromotionCompleted {
    pub collection_manager: Pubkey,
    pub operation_id: String,
    pub from_tier: String,
    pub to_tier: String,
    pub items_promoted: u32,
    pub criteria: String,
    pub duration_seconds: i64,
    pub timestamp: i64,
}

/// Operation status account wrapper
#[account]
pub struct OperationStatusAccount {
    pub status: OperationStatus,
    pub bump: u8,
}

impl OperationStatusAccount {
    pub const SIZE: usize = 8 + OperationStatus::SIZE + 1;
}
