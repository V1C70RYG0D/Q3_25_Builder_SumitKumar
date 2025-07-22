/**
 * Withdraw Fees Context
 * 
 * Allows the marketplace admin to withdraw accumulated fees from the treasury.
 */

use anchor_lang::{prelude::*, system_program::{transfer, Transfer}};
use crate::state::Marketplace;
use crate::error::MarketplaceError;

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    /// The marketplace admin
    #[account(
        constraint = admin.key() == marketplace.admin @ MarketplaceError::Unauthorized
    )]
    pub admin: Signer<'info>,

    /// The marketplace account
    #[account(
        seeds = [b"marketplace", marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump,
    )]
    pub marketplace: Account<'info, Marketplace>,

    /// The treasury account to withdraw from
    #[account(
        mut,
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump = marketplace.treasury_bump,
    )]
    pub treasury: SystemAccount<'info>,

    /// System program for transfers
    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawFees<'info> {
    /// Withdraw specified amount from treasury to admin
    pub fn withdraw(&mut self, amount: u64) -> Result<()> {
        let treasury_balance = self.treasury.lamports();
        require!(amount <= treasury_balance, MarketplaceError::InsufficientFunds);

        let marketplace_key = self.marketplace.key();
        let seeds = &[
            b"treasury",
            marketplace_key.as_ref(),
            &[self.marketplace.treasury_bump]
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_program = self.system_program.to_account_info();
        let cpi_accounts = Transfer {
            from: self.treasury.to_account_info(),
            to: self.admin.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        transfer(cpi_ctx, amount)?;

        msg!("Withdrew {} lamports to admin", amount);
        Ok(())
    }
}
