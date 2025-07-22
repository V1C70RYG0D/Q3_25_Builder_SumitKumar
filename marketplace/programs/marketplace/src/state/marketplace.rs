/**
 * Marketplace State Account
 * 
 * Stores global configuration and state for the marketplace.
 * This account is a PDA derived from the marketplace name.
 */

use anchor_lang::prelude::*;

#[account]
pub struct Marketplace {
    /// The wallet address of the marketplace administrator/authority
    pub admin: Pubkey,
    /// The marketplace fee percentage in basis points (e.g., 250 = 2.5%)
    pub fee: u16,
    /// PDA bump seed for the marketplace account
    pub bump: u8,
    /// PDA bump seed for the marketplace treasury account
    pub treasury_bump: u8,
    /// PDA bump seed for the marketplace rewards distribution account
    pub rewards_bump: u8,
    /// The name of the marketplace used for branding and identification
    pub name: String,
}

impl Space for Marketplace {
    /// Calculate the exact space needed for this account:
    /// - 8 bytes: Account discriminator (automatically added by Anchor)
    /// - 32 bytes: Pubkey for admin
    /// - 2 bytes: u16 for fee
    /// - 1 byte: u8 for bump
    /// - 1 byte: u8 for treasury_bump
    /// - 1 byte: u8 for rewards_bump
    /// - 4 bytes: String prefix (length) + 32 bytes max for name content
    const INIT_SPACE: usize = 8 + 32 + 2 + 1 + 1 + 1 + (4 + 32);
}
