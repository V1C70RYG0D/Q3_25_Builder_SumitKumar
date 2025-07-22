/**
 * Marketplace Program Entry Point
 * 
 * A decentralized NFT marketplace built on Solana using the Anchor framework.
 * This program enables users to:
 * - Initialize a marketplace with configurable fees and rewards
 * - List NFTs for sale with automatic escrow
 * - Delist NFTs and return them to the owner
 * - Purchase NFTs with automatic fee distribution and reward tokens
 * 
 * Features:
 * - PDA-based security for all accounts
 * - Automatic fee collection to marketplace treasury
 * - Reward token minting for buyers
 * - Collection verification for NFTs
 * - Comprehensive error handling
 */

use anchor_lang::prelude::*;

mod state;
use state::*;

mod context;
use context::*;

mod error;
use error::*;

declare_id!("HYxi42pNZDn3dpnF8HPNeFurSLQSpcYWdvRSkfuqkkui");

#[program]
pub mod marketplace {
    use super::*;

    /**
     * Initialize a new marketplace
     * 
     * @param name - Unique name for the marketplace
     * @param fee - Marketplace fee in basis points (e.g., 250 = 2.5%)
     */
    pub fn initialize(ctx: Context<Initialize>, name: String, fee: u16) -> Result<()> {
        require!(fee <= 10000, MarketplaceError::InvalidFee);
        require!(!name.is_empty() && name.len() <= 32, MarketplaceError::InvalidName);
        
        ctx.accounts.init(name, fee, &ctx.bumps)?;
        
        msg!("Marketplace initialized successfully");
        Ok(())
    }

    /**
     * List an NFT for sale
     * 
     * @param price - Sale price in lamports
     */
    pub fn listing(ctx: Context<List>, price: u64) -> Result<()> {
        require!(price > 0, MarketplaceError::InvalidPrice);
        
        ctx.accounts.create_listing(price, &ctx.bumps)?;
        ctx.accounts.deposit_nft()?;
        
        msg!("NFT listed for sale at {} lamports", price);
        Ok(())
    }

    /**
     * Remove an NFT listing and return it to the owner
     */
    pub fn delist(ctx: Context<Delist>) -> Result<()> {
        ctx.accounts.delist()?;
        ctx.accounts.close_mint_vault()?;
        
        msg!("NFT delisted successfully");
        Ok(())
    }

    /**
     * Purchase a listed NFT
     */
    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        ctx.accounts.send_sol()?;
        ctx.accounts.receive_nft()?;
        ctx.accounts.receive_rewards()?;
        ctx.accounts.close_mint_vault()?;
        
        msg!("NFT purchased successfully");
        Ok(())
    }

    /**
     * Update marketplace configuration (admin only)
     * 
     * @param new_fee - New marketplace fee in basis points
     */
    pub fn update_marketplace(ctx: Context<UpdateMarketplace>, new_fee: Option<u16>) -> Result<()> {
        if let Some(fee) = new_fee {
            require!(fee <= 10000, MarketplaceError::InvalidFee);
            ctx.accounts.marketplace.fee = fee;
            msg!("Marketplace fee updated to {} basis points", fee);
        }
        
        Ok(())
    }

    /**
     * Withdraw fees from treasury (admin only)
     * 
     * @param amount - Amount to withdraw in lamports
     */
    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw(amount)?;
        
        msg!("Withdrew {} lamports from treasury", amount);
        Ok(())
    }
}
