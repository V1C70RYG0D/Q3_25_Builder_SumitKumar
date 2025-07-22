/**
 * Initialize Marketplace Context
 * 
 * Creates a new marketplace with the specified configuration.
 * Sets up the marketplace PDA, treasury PDA, and rewards mint PDA.
 */

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

use crate::state::marketplace::Marketplace;

#[derive(Accounts)]
#[instruction(name: String)]
pub struct Initialize<'info> {
    /// The signer who will be the marketplace admin
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// Main marketplace PDA derived from name
    #[account(
        init,
        payer = admin,
        seeds = [b"marketplace", name.as_str().as_bytes()],
        bump,
        space = Marketplace::INIT_SPACE,
    )]
    pub marketplace: Account<'info, Marketplace>,
    
    /// Treasury PDA to collect marketplace fees
    #[account(
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,
    
    /// Reward token mint for the marketplace
    #[account(
        init,
        payer = admin,
        seeds = [b"rewards", marketplace.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = marketplace,
    )]
    pub reward_mint: InterfaceAccount<'info, Mint>,

    /// Required for creating accounts
    pub system_program: Program<'info, System>,
    /// Required for token operations
    pub token_program: Interface<'info, TokenInterface>,
}

impl<'info> Initialize<'info> {
    /// Initialize the marketplace with provided configuration
    pub fn init(&mut self, name: String, fee: u16, bumps: &InitializeBumps) -> Result<()> {
        // Set marketplace account data
        self.marketplace.set_inner(Marketplace {
            admin: self.admin.key(),
            fee,
            bump: bumps.marketplace,
            treasury_bump: bumps.treasury,
            rewards_bump: bumps.reward_mint,
            name,
        });

        msg!("Initialized marketplace with fee: {} basis points", fee);
        Ok(())
    }
}
