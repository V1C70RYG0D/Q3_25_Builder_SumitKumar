/**
 * Update Marketplace Context
 * 
 * Allows the marketplace admin to update configuration settings.
 */

use anchor_lang::prelude::*;
use crate::state::Marketplace;
use crate::error::MarketplaceError;

#[derive(Accounts)]
pub struct UpdateMarketplace<'info> {
    /// The marketplace admin
    #[account(
        constraint = admin.key() == marketplace.admin @ MarketplaceError::Unauthorized
    )]
    pub admin: Signer<'info>,

    /// The marketplace account to update
    #[account(
        mut,
        seeds = [b"marketplace", marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump,
    )]
    pub marketplace: Account<'info, Marketplace>,
}
