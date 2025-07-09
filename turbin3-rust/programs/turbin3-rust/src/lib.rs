use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("BvspYwyDic1fVBRysCCLMyQeBurrJ6P6f5Zeiy6Zfsz4");

#[program]
pub mod turbin3_rust {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.vault_state.owner = ctx.accounts.owner.key();
        ctx.accounts.vault_state.auth_bump = ctx.bumps.vault_auth;
        ctx.accounts.vault_state.vault_bump = ctx.bumps.vault;
        ctx.accounts.vault_state.score = 0;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let transfer_accounts = Transfer {
            from: ctx.accounts.owner.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_accounts,
        );

        transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let seeds = &[
            b"auth",
            ctx.accounts.vault_state.to_account_info().key.as_ref(),
            &[ctx.accounts.vault_state.auth_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let transfer_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.owner.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            transfer_accounts,
            signer_seeds,
        );

        transfer(cpi_ctx, amount)?;
        Ok(())
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        let seeds = &[
            b"auth",
            ctx.accounts.vault_state.to_account_info().key.as_ref(),
            &[ctx.accounts.vault_state.auth_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Transfer all remaining SOL from vault back to owner
        let vault_balance = ctx.accounts.vault.to_account_info().lamports();
        if vault_balance > 0 {
            let transfer_accounts = Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.owner.to_account_info(),
            };

            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                transfer_accounts,
                signer_seeds,
            );

            transfer(cpi_ctx, vault_balance)?;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        init,
        payer = owner,
        space = VaultState::INIT_SPACE,
    )]
    pub vault_state: Account<'info, VaultState>,
    
    /// CHECK: This is the PDA authority for the vault
    #[account(
        seeds = [b"auth", vault_state.key().as_ref()],
        bump
    )]
    pub vault_auth: UncheckedAccount<'info>,
    
    #[account(
        init,
        payer = owner,
        seeds = [b"vault", vault_auth.key().as_ref()],
        bump,
        space = 0
    )]
    pub vault: SystemAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        has_one = owner
    )]
    pub vault_state: Account<'info, VaultState>,
    
    /// CHECK: This is the PDA authority for the vault
    #[account(
        seeds = [b"auth", vault_state.key().as_ref()],
        bump = vault_state.auth_bump
    )]
    pub vault_auth: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"vault", vault_auth.key().as_ref()],
        bump = vault_state.vault_bump
    )]
    pub vault: SystemAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        has_one = owner
    )]
    pub vault_state: Account<'info, VaultState>,
    
    /// CHECK: This is the PDA authority for the vault
    #[account(
        seeds = [b"auth", vault_state.key().as_ref()],
        bump = vault_state.auth_bump
    )]
    pub vault_auth: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"vault", vault_auth.key().as_ref()],
        bump = vault_state.vault_bump
    )]
    pub vault: SystemAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        has_one = owner,
        close = owner // This will close the vault_state account and refund rent to owner
    )]
    pub vault_state: Account<'info, VaultState>,
    
    /// CHECK: This is the PDA authority for the vault
    #[account(
        seeds = [b"auth", vault_state.key().as_ref()],
        bump = vault_state.auth_bump
    )]
    pub vault_auth: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"vault", vault_auth.key().as_ref()],
        bump = vault_state.vault_bump,
        close = owner // This will close the vault account and refund rent to owner
    )]
    pub vault: SystemAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct VaultState {
    pub owner: Pubkey,
    pub auth_bump: u8,
    pub vault_bump: u8,
    pub score: u8,
}