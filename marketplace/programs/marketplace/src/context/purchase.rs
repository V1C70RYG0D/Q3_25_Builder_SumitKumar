/**
 * Purchase NFT Context
 * 
 * Handles the purchase of a listed NFT, including:
 * - SOL payment with fee distribution
 * - NFT transfer to buyer
 * - Reward token minting
 * - Account cleanup
 */

use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{MasterEditionAccount, Metadata, MetadataAccount},
    token::{close_account, mint_to, transfer_checked, CloseAccount, MintTo, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface}
};

use crate::state::{Listing, Marketplace};
use crate::error::MarketplaceError;

#[derive(Accounts)]
pub struct Purchase<'info> {
    /// The buyer (signer) purchasing the NFT
    #[account(mut)]
    pub taker: Signer<'info>,

    /// The seller who originally listed the NFT
    /// CHECK: Verified through listing account
    #[account(
        mut,
        constraint = maker.key() == listing.maker @ MarketplaceError::InvalidMaker
    )]
    pub maker: UncheckedAccount<'info>,

    /// The marketplace state account
    #[account(
        seeds = [b"marketplace", marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump,
    )]
    pub marketplace: Account<'info, Marketplace>,

    /// The NFT's mint address
    pub maker_mint: InterfaceAccount<'info, Mint>,
    
    /// The taker's ATA to receive the NFT
    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = maker_mint,
        associated_token::authority = taker,
    )]
    pub taker_ata: InterfaceAccount<'info, TokenAccount>,

    /// The taker's ATA to receive reward tokens
    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = rewards_mint,
        associated_token::authority = taker,
    )]
    pub taker_ata_reward: InterfaceAccount<'info, TokenAccount>,

    /// The listing PDA that will be closed after purchase
    #[account(
        mut,
        seeds = [marketplace.key().as_ref(), maker_mint.key().as_ref()],
        bump = listing.bump,
        close = maker,
    )]
    pub listing: Account<'info, Listing>,

    /// The vault holding the NFT
    #[account(
        mut,
        associated_token::mint = maker_mint,
        associated_token::authority = listing,
        constraint = vault.amount == 1 @ MarketplaceError::EmptyVault,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// The treasury PDA that receives the fee
    #[account(
        mut,
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump = marketplace.treasury_bump,
    )]
    pub treasury: SystemAccount<'info>,

    /// The rewards mint PDA used for minting reward tokens
    #[account(
        mut,
        seeds = [b"rewards", marketplace.key().as_ref()],
        bump = marketplace.rewards_bump,
    )]
    pub rewards_mint: InterfaceAccount<'info, Mint>,

    /// Collection the NFT belongs to
    pub collection_mint: InterfaceAccount<'info, Mint>,
    
    /// NFT metadata for verification
    #[account(
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            maker_mint.key().as_ref(),
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    pub metadata: Account<'info, MetadataAccount>,
    
    /// Master edition for verification
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

impl<'info> Purchase<'info> {
    /// Transfer SOL from taker to maker and treasury
    pub fn send_sol(&mut self) -> Result<()> {
        let price = self.listing.price;
        let fee_amount = (price as u128)
            .checked_mul(self.marketplace.fee as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;
        let maker_amount = price.checked_sub(fee_amount).unwrap();

        // Transfer fee to treasury
        if fee_amount > 0 {
            let cpi_program = self.system_program.to_account_info();
            let cpi_accounts = Transfer {
                from: self.taker.to_account_info(),
                to: self.treasury.to_account_info(),
            };
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            transfer(cpi_ctx, fee_amount)?;
            msg!("Fee {} lamports transferred to treasury", fee_amount);
        }

        // Transfer payment to maker
        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.taker.to_account_info(),
            to: self.maker.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_ctx, maker_amount)?;

        msg!("Payment {} lamports transferred to maker", maker_amount);
        Ok(())
    }

    /// Transfer the NFT from vault to taker
    pub fn receive_nft(&mut self) -> Result<()> {
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
            to: self.taker_ata.to_account_info(),
            authority: self.listing.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        // Transfer 1 NFT to taker
        transfer_checked(cpi_ctx, 1, self.maker_mint.decimals)?;

        msg!("NFT transferred to taker");
        Ok(())
    }

    /// Mint reward tokens to the taker
    pub fn receive_rewards(&mut self) -> Result<()> {
        let marketplace_name = self.marketplace.name.clone();
        let seeds = &[
            b"marketplace",
            marketplace_name.as_str().as_bytes(),
            &[self.marketplace.bump]
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = MintTo {
            mint: self.rewards_mint.to_account_info(),
            to: self.taker_ata_reward.to_account_info(),
            authority: self.marketplace.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        // Mint 10 reward tokens (with 6 decimals = 10_000_000)
        let reward_amount = 10_000_000u64;
        mint_to(cpi_ctx, reward_amount)?;

        msg!("Reward tokens minted to taker");
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
            destination: self.taker.to_account_info(),
            authority: self.listing.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        close_account(cpi_ctx)?;

        msg!("Vault account closed");
        Ok(())
    }
}
