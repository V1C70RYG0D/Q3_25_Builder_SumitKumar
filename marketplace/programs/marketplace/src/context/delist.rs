/**
 * Delist NFT Context
 * 
 * Removes an NFT listing and returns the NFT to the original owner.
 * Closes the vault and listing accounts.
 */

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{close_account, transfer_checked, CloseAccount, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface}
};

use crate::state::{Listing, Marketplace};
use crate::error::MarketplaceError;

#[derive(Accounts)]
pub struct Delist<'info> {
    /// The signer who originally listed the NFT
    #[account(
        mut,
        constraint = maker.key() == listing.maker @ MarketplaceError::Unauthorized
    )]
    pub maker: Signer<'info>,

    /// The marketplace state account
    #[account(
        seeds = [b"marketplace", marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump,
    )]
    pub marketplace: Account<'info, Marketplace>,

    /// The NFT's mint address
    pub maker_mint: InterfaceAccount<'info, Mint>,
    
    /// The maker's token account for receiving the NFT back
    #[account(
        mut,
        associated_token::mint = maker_mint,
        associated_token::authority = maker,
    )]
    pub maker_ata: InterfaceAccount<'info, TokenAccount>,

    /// The associated token account holding the NFT during listing
    #[account(
        mut,
        associated_token::mint = maker_mint,
        associated_token::authority = listing,
        constraint = vault.amount == 1 @ MarketplaceError::EmptyVault,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// The PDA for the listing, which will be closed on delisting
    #[account(
        mut,
        seeds = [marketplace.key().as_ref(), maker_mint.key().as_ref()],
        bump = listing.bump,
        close = maker,
    )]
    pub listing: Account<'info, Listing>,

    /// For creating ATAs
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// For creating accounts
    pub system_program: Program<'info, System>,
    /// For token operations
    pub token_program: Interface<'info, TokenInterface>
}

impl<'info> Delist<'info> {
    /// Transfer the NFT from vault back to maker
    pub fn delist(&mut self) -> Result<()> {
        let marketplace_key = self.marketplace.key();
        let maker_mint_key = self.maker_mint.key();
        let seeds = &[
            marketplace_key.as_ref(),
            maker_mint_key.as_ref(),
            &[self.listing.bump]
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = TransferChecked {
            from: self.vault.to_account_info(),
            mint: self.maker_mint.to_account_info(),
            to: self.maker_ata.to_account_info(),
            authority: self.listing.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        // Transfer 1 NFT back to maker
        transfer_checked(cpi_ctx, 1, self.maker_mint.decimals)?;

        msg!("NFT returned to maker");
        Ok(())
    }

    /// Close the vault account
    pub fn close_mint_vault(&mut self) -> Result<()> {
        let marketplace_key = self.marketplace.key();
        let maker_mint_key = self.maker_mint.key();
        let seeds = &[
            marketplace_key.as_ref(),
            maker_mint_key.as_ref(),
            &[self.listing.bump]
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.maker.to_account_info(),
            authority: self.listing.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        close_account(cpi_ctx)?;

        msg!("Vault account closed");
        Ok(())
    }
}
