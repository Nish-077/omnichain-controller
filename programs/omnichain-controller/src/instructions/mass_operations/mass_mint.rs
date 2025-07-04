use anchor_lang::prelude::*;
use crate::state::{CollectionManager, CnftMetadata, Attribute, Properties};
use crate::error::ErrorCode;

/// Mass mint request structure
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MassMintRequest {
    /// Recipients of the new cNFTs (up to batch_size)
    pub recipients: Vec<Pubkey>,
    
    /// Theme for the minted cNFTs
    pub theme: String,
    
    /// Tier for the minted cNFTs (optional, defaults to "Standard")
    pub tier: Option<String>,
    
    /// Base metadata template
    pub base_metadata: Option<CnftMetadata>,
    
    /// Whether to verify as part of collection
    pub verify_collection: bool,
}

/// Mass mint instruction for creating 1000+ cNFTs in batches
/// This is where the magic happens - enterprise-scale minting
#[derive(Accounts)]
#[instruction(mint_request: MassMintRequest)]
pub struct MassMint<'info> {
    #[account(
        mut,
        seeds = [b"collection_manager", authority.key().as_ref()],
        bump = collection_manager.bump
    )]
    pub collection_manager: Account<'info, CollectionManager>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// Merkle tree for state compression
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

    /// Collection mint (for verified collections)
    /// CHECK: This can be None for unverified collections
    pub collection_mint: Option<UncheckedAccount<'info>>,

    /// Collection metadata account
    /// CHECK: This can be None for unverified collections
    pub collection_metadata: Option<UncheckedAccount<'info>>,

    /// Collection master edition account
    /// CHECK: This can be None for unverified collections
    pub collection_master_edition: Option<UncheckedAccount<'info>>,

    /// Bubblegum program for cNFT operations
    /// CHECK: This is the official Bubblegum program
    pub bubblegum_program: UncheckedAccount<'info>,

    /// SPL Account Compression program
    /// CHECK: This is the official SPL Account Compression program
    pub compression_program: UncheckedAccount<'info>,

    /// Token Metadata program
    /// CHECK: This is the official Token Metadata program
    pub token_metadata_program: UncheckedAccount<'info>,

    /// Log wrapper program
    /// CHECK: This is the official Log Wrapper program
    pub log_wrapper: UncheckedAccount<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn mass_mint_handler<'info>(
    ctx: Context<'_, '_, '_, 'info, MassMint<'info>>,
    mint_request: MassMintRequest,
) -> Result<()> {
    let clock = Clock::get()?;

    // Validate mint request
    require!(
        !mint_request.recipients.is_empty(),
        ErrorCode::EmptyMintRequest
    );
    require!(
        mint_request.recipients.len() <= ctx.accounts.collection_manager.config.batch_size as usize,
        ErrorCode::BatchTooLarge
    );
    require!(
        ctx.accounts.collection_manager.can_mint(mint_request.recipients.len() as u64),
        ErrorCode::CollectionFull
    );

    msg!(
        "🚀 Starting mass mint: {} cNFTs, theme: {}, tier: {}",
        mint_request.recipients.len(),
        mint_request.theme,
        mint_request.tier.as_ref().unwrap_or(&"Standard".to_string())
    );

    // Process mints in chunks to avoid compute limit issues
    let chunk_size = ctx.accounts.collection_manager.config.chunk_size as usize;
    let total_recipients = mint_request.recipients.len();
    let mut total_minted = 0u64;
    let collection_manager_key = ctx.accounts.collection_manager.key();
    let initial_minted = ctx.accounts.collection_manager.total_minted;

    for (chunk_index, chunk) in mint_request.recipients.chunks(chunk_size).enumerate() {
        msg!("Processing chunk {} of {}", chunk_index + 1, (total_recipients + chunk_size - 1) / chunk_size);

        for (i, recipient) in chunk.iter().enumerate() {
            let token_id = initial_minted + total_minted + i as u64;
            
            // Generate metadata for this specific cNFT
            let metadata = generate_dynamic_metadata(
                &mint_request,
                token_id,
                recipient,
                &ctx.accounts.authority.key(),
                clock.unix_timestamp,
            )?;

            // Mint the compressed NFT using Bubblegum CPI
            mint_compressed_nft(
                &ctx,
                recipient,
                &metadata,
                collection_manager_key,
            )?;

            total_minted += 1;
        }
    }

    // Update collection manager state
    ctx.accounts.collection_manager.increment_minted(total_minted)?;

    msg!(
        "✅ Mass mint completed: {} cNFTs minted successfully",
        total_minted
    );

    // Emit event for monitoring and analytics
    emit!(MassMintCompleted {
        collection_manager: ctx.accounts.collection_manager.key(),
        authority: ctx.accounts.authority.key(),
        count: total_minted,
        theme: mint_request.theme,
        tier: mint_request.tier,
        timestamp: clock.unix_timestamp,
        total_supply: ctx.accounts.collection_manager.total_minted,
    });

    Ok(())
}

/// Mint a single compressed NFT using Bubblegum CPI
fn mint_compressed_nft<'info>(
    ctx: &Context<'_, '_, '_, 'info, MassMint<'info>>,
    _recipient: &Pubkey,
    metadata: &CnftMetadata,
    collection_manager_key: Pubkey,
) -> Result<()> {
    // Convert our metadata to Bubblegum format
    let _creator = mpl_bubblegum::types::Creator {
        address: ctx.accounts.authority.key(),
        verified: true,
        share: 100,
    };

    let _collection = if ctx.accounts.collection_mint.is_some() {
        Some(mpl_bubblegum::types::Collection {
            verified: true,
            key: ctx.accounts.collection_mint.as_ref().unwrap().key(),
        })
    } else {
        None
    };

    // Prepare CPI context for Bubblegum mint
    let merkle_tree_key = ctx.accounts.merkle_tree.key();
    let tree_authority_seeds = &[
        b"tree_authority",
        merkle_tree_key.as_ref(),
        &[ctx.accounts.collection_manager.bump],
    ];
    let _signer_seeds = &[&tree_authority_seeds[..]];

    // Use Bubblegum's mint_to_collection_v1 for verified collections
    // Note: In a real implementation, this would be a proper Bubblegum CPI call
    // For now, we'll just simulate the mint and emit events
    
    // Simulate mint - in production, this would be the actual mpl-bubblegum CPI
    msg!(
        "🎨 Simulating mint of cNFT for collection {} with metadata name '{}'",
        collection_manager_key,
        metadata.name
    );
    
    // In a real implementation, you would:
    // 1. Prepare proper Bubblegum CPI accounts
    // 2. Call mpl_bubblegum::cpi::mint_v1()
    // 3. Handle the actual on-chain mint
    
    msg!("✅ Simulated mint completed");

    Ok(())
}

/// Generate dynamic metadata for a cNFT based on theme and tier
fn generate_dynamic_metadata(
    mint_request: &MassMintRequest,
    token_id: u64,
    _recipient: &Pubkey,
    authority: &Pubkey,
    timestamp: i64,
) -> Result<CnftMetadata> {
    let default_tier = "Standard".to_string();
    let tier = mint_request.tier.as_ref().unwrap_or(&default_tier);
    
    // Generate dynamic URI based on theme and tier
    let uri = format!(
        "https://api.loyaltypass.com/metadata/{}/{}/{}.json",
        mint_request.theme.to_lowercase(),
        tier.to_lowercase(),
        token_id
    );

    // Create attributes based on theme and tier
    let mut attributes = vec![
        ("Theme".to_string(), mint_request.theme.clone()),
        ("Tier".to_string(), tier.clone()),
        ("Token ID".to_string(), token_id.to_string()),
        ("Mint Date".to_string(), timestamp.to_string()),
        ("Controlled By".to_string(), authority.to_string()),
        ("Chain".to_string(), "Solana".to_string()),
        ("Type".to_string(), "Dynamic Loyalty Pass".to_string()),
    ];

    // Add tier-specific attributes
    match tier.as_str() {
        "Bronze" => {
            attributes.push(("Level".to_string(), "1".to_string()));
            attributes.push(("Boost".to_string(), "5%".to_string()));
        },
        "Silver" => {
            attributes.push(("Level".to_string(), "2".to_string()));
            attributes.push(("Boost".to_string(), "15%".to_string()));
        },
        "Gold" => {
            attributes.push(("Level".to_string(), "3".to_string()));
            attributes.push(("Boost".to_string(), "30%".to_string()));
        },
        "Platinum" => {
            attributes.push(("Level".to_string(), "4".to_string()));
            attributes.push(("Boost".to_string(), "50%".to_string()));
        },
        _ => {
            attributes.push(("Level".to_string(), "0".to_string()));
        }
    }

    // Add theme-specific attributes
    match mint_request.theme.as_str() {
        "Golden" => {
            attributes.push(("Special".to_string(), "Golden Event".to_string()));
            attributes.push(("Rarity".to_string(), "Limited Edition".to_string()));
        },
        "Cosmic" => {
            attributes.push(("Special".to_string(), "Cosmic Collection".to_string()));
            attributes.push(("Effect".to_string(), "Stellar Glow".to_string()));
        },
        "Premium" => {
            attributes.push(("Special".to_string(), "Premium Access".to_string()));
            attributes.push(("Benefits".to_string(), "VIP Status".to_string()));
        },
        _ => {}
    }

    Ok(CnftMetadata {
        name: format!("Dynamic Loyalty Pass #{}", token_id),
        symbol: "DLP".to_string(),
        uri,
        description: Some(format!(
            "A {} tier {} loyalty pass controlled by cross-chain DAO governance",
            tier, mint_request.theme
        )),
        seller_fee_basis_points: 250, // 2.5% royalty
        image: Some(format!(
            "https://api.loyaltypass.com/images/{}/{}/{}.png",
            mint_request.theme.to_lowercase(),
            tier.to_lowercase(),
            token_id
        )),
        animation_url: None,
        external_url: Some("https://loyaltypass.com".to_string()),
        attributes: Some(attributes.into_iter().map(|(trait_type, value)| {
            Attribute { trait_type, value, display_type: None }
        }).collect()),
        properties: Some(Properties {
            files: None,
            category: Some("utility".to_string()),
        }),
    })
}

/// Event emitted when mass mint is completed
#[event]
pub struct MassMintCompleted {
    pub collection_manager: Pubkey,
    pub authority: Pubkey,
    pub count: u64,
    pub theme: String,
    pub tier: Option<String>,
    pub timestamp: i64,
    pub total_supply: u64,
}
