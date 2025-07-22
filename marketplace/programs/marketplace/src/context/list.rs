/**
 * List NFT Context
 * 
 * Creates a listing for an NFT, transferring it to an escrow vault.
 * Validates that the NFT belongs to a verified collection.
 */

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{MasterEditionAccount, Metadata, MetadataAccount},
    token::{transfer_checked, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface}
};

use crate::state::{Listing, Marketplace};
use crate::error::MarketplaceError;

#[derive(Accounts)]
pub struct List<'info> {
    /// The NFT owner creating the listing
    #[account(mut)]
    pub maker: Signer<'info>,

    /// The marketplace configuration account
    #[account(
        seeds = [b"marketplace", marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump,
    )]
    pub marketplace: Account<'info, Marketplace>,

    /// The NFT mint being listed
    pub maker_mint: InterfaceAccount<'info, Mint>,
    
    /// Token account holding the NFT
    #[account(
        mut,
        associated_token::mint = maker_mint,
        associated_token::authority = maker,
        constraint = maker_ata.amount == 1 @ MarketplaceError::InsufficientTokens,
    )]
    pub maker_ata: InterfaceAccount<'info, TokenAccount>,

    /// Escrow account for the NFT during listing
    #[account(
        init,
        payer = maker,
        associated_token::mint = maker_mint,
        associated_token::authority = listing,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// Account to store listing information
    #[account(
        init,
        payer = maker,
        seeds = [marketplace.key().as_ref(), maker_mint.key().as_ref()],
        bump,
        space = Listing::INIT_SPACE,
    )]
    pub listing: Account<'info, Listing>,

    /// Collection the NFT belongs to
    pub collection_mint: InterfaceAccount<'info, Mint>,
    
    /// NFT metadata to verify collection
    #[account(
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            maker_mint.key().as_ref(),
        ],
        seeds::program = metadata_program.key(),
        bump,
        constraint = metadata.collection.as_ref().unwrap().key.as_ref() == collection_mint.key().as_ref() @ MarketplaceError::InvalidCollection,
        constraint = metadata.collection.as_ref().unwrap().verified == true @ MarketplaceError::UnverifiedCollection,
    )]
    pub metadata: Account<'info, MetadataAccount>,
    
    /// Master edition to verify it's an NFT
    #[account(
        seeds = [
            b"metadata", 
            metadata_program.key().as_ref(),
            maker_mint.key().as_ref(),
            b"edition"
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    pub master_edition: Account<'info, MasterEditionAccount>,

    /// Metaplex program
    pub metadata_program: Program<'info, Metadata>,
    /// For creating ATAs
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// For creating accounts
    pub system_program: Program<'info, System>,
    /// For token operations
    pub token_program: Interface<'info, TokenInterface>
}

impl<'info> List<'info> {
    /// Create the listing account with specified price
    pub fn create_listing(&mut self, price: u64, bumps: &ListBumps) -> Result<()> {
        self.listing.set_inner(Listing {
            maker: self.maker.key(),
            maker_mint: self.maker_mint.key(),
            price,
            bump: bumps.listing,
        });

        msg!("Created listing for mint: {}", self.maker_mint.key());
        Ok(())
    }

    /// Transfer the NFT from maker to vault
    pub fn deposit_nft(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = TransferChecked {
            from: self.maker_ata.to_account_info(),
            mint: self.maker_mint.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Transfer 1 NFT (amount=1, decimals=0 for NFTs)
        transfer_checked(cpi_ctx, 1, self.maker_mint.decimals)?;

        msg!("NFT deposited to vault");
        Ok(())
    }
}
