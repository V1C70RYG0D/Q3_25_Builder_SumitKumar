/**
 * Listing State Account
 * 
 * Stores information about an individual NFT listing.
 * This account is a PDA derived from the marketplace and NFT mint.
 */

use anchor_lang::prelude::*;

#[account]
pub struct Listing {
    /// The wallet address of the seller who created this listing
    pub maker: Pubkey,
    /// The mint address of the NFT being sold
    pub maker_mint: Pubkey,
    /// The selling price in lamports (SOL's smallest unit)
    pub price: u64,
    /// PDA bump seed for the listing account
    pub bump: u8,
}

impl Space for Listing {
    /// Calculate the exact space needed for this account:
    /// - 8 bytes: Account discriminator (automatically added by Anchor)
    /// - 32 bytes: Pubkey for maker
    /// - 32 bytes: Pubkey for maker_mint
    /// - 8 bytes: u64 for price
    /// - 1 byte: u8 for bump
    const INIT_SPACE: usize = 8 + 32 + 32 + 8 + 1;
}
