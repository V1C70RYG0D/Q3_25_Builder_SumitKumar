/**
 * COMPLETE VAULT CLOSE INSTRUCTION IMPLEMENTATION
 * 
 * This file shows the complete implementation of the close instruction
 * for an Anchor vault program, including both Rust and TypeScript code.
 */

import { appConfig, isVaultConfigured } from '../config';

console.log("=== ANCHOR VAULT CLOSE INSTRUCTION - COMPLETE IMPLEMENTATION ===\n");

// Check if vault is configured
if (!isVaultConfigured()) {
  console.log("❌ Vault not configured!");
  console.log("Please set VAULT_STATE_ADDRESS, VAULT_AUTH_ADDRESS, and VAULT_ADDRESS in your .env file");
  console.log("You can get these addresses by running the vault_init script first");
  process.exit(1);
}

// ========================================
// 1. RUST IMPLEMENTATION (programs/vault/src/lib.rs)
// ========================================

const rustImplementation = `
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("BvspYwyDic1fVBRysCCLMyQeBurrJ6P6f5Zeiy6Zfsz4");

#[program]
pub mod vault_program {
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

    // ================================
    // CLOSE INSTRUCTION IMPLEMENTATION
    // ================================
    pub fn close(ctx: Context<Close>) -> Result<()> {
        let seeds = &[
            b"auth",
            ctx.accounts.vault_state.to_account_info().key.as_ref(),
            &[ctx.accounts.vault_state.auth_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // STEP 1: Transfer all remaining SOL from vault back to owner
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

        // STEP 2: Account closure is handled by the close constraint
        // The close constraint automatically:
        // - Transfers all lamports to the destination (owner)
        // - Sets account data to zero
        // - Sets account owner to System Program
        // - Refunds rent exemption to the destination
        Ok(())
    }
}

// Account validation structs
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

// ================================
// CLOSE ACCOUNTS STRUCT
// ================================
#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        has_one = owner,
        close = owner // CLOSES vault_state account, refunds rent to owner
    )]
    pub vault_state: Account<'info, VaultState>,
    
    #[account(
        seeds = [b"auth", vault_state.key().as_ref()],
        bump = vault_state.auth_bump
    )]
    pub vault_auth: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"vault", vault_auth.key().as_ref()],
        bump = vault_state.vault_bump,
        close = owner // CLOSES vault account, refunds rent to owner
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
`;

console.log("RUST IMPLEMENTATION:");
console.log(rustImplementation);

// ========================================
// 2. TYPESCRIPT CLIENT IMPLEMENTATION
// ========================================

const typescriptImplementation = `
import {
  Connection,
  Keypair,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { appConfig } from '../config';

// Setup connection using configuration
const connection = new Connection(appConfig.solana.rpcUrl, appConfig.solana.commitment);
const wallet = new Wallet(keypair);
const provider = new AnchorProvider(connection, wallet, {});
const program = new Program(IDL, PROGRAM_ID, provider);

async function closeVault(vaultStateAddress: PublicKey, owner: Keypair) {
  try {
    console.log("=== CLOSING VAULT ===");
    
    // Derive PDAs
    const [vaultAuth] = PublicKey.findProgramAddressSync(
      [Buffer.from("auth"), vaultStateAddress.toBuffer()],
      program.programId
    );
    
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultAuth.toBuffer()],
      program.programId
    );
    
    console.log("Vault State:", vaultStateAddress.toBase58());
    console.log("Vault Auth:", vaultAuth.toBase58());
    console.log("Vault:", vault.toBase58());
    
    // Check balances before
    const ownerBalanceBefore = await connection.getBalance(owner.publicKey);
    const vaultBalanceBefore = await connection.getBalance(vault);
    
    console.log(\`Owner balance before: \${ownerBalanceBefore / LAMPORTS_PER_SOL} SOL\`);
    console.log(\`Vault balance before: \${vaultBalanceBefore / LAMPORTS_PER_SOL} SOL\`);
    
    // Execute close instruction
    const signature = await program.methods
      .close()
      .accounts({
        owner: owner.publicKey,
        vaultState: vaultStateAddress,
        vaultAuth: vaultAuth,
        vault: vault,
        systemProgram: SystemProgram.programId,
      })
      .signers([owner])
      .rpc();
    
    console.log("Transaction signature:", signature);
    console.log(\`https://explorer.solana.com/tx/\${signature}?cluster=devnet\`);
    
    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check balances after
    const ownerBalanceAfter = await connection.getBalance(owner.publicKey);
    const rentRefunded = ownerBalanceAfter - ownerBalanceBefore;
    
    console.log(\`Owner balance after: \${ownerBalanceAfter / LAMPORTS_PER_SOL} SOL\`);
    console.log(\`Total refunded: \${rentRefunded / LAMPORTS_PER_SOL} SOL\`);
    
    // Verify accounts are closed
    const vaultStateAccount = await connection.getAccountInfo(vaultStateAddress);
    const vaultAccount = await connection.getAccountInfo(vault);
    
    if (!vaultStateAccount && !vaultAccount) {
      console.log("✅ Both accounts successfully closed!");
      console.log("✅ All SOL transferred back to owner");
      console.log("✅ Rent exemption refunded to owner");
    } else {
      console.log("❌ Accounts may not have been closed properly");
    }
    
  } catch (error) {
    console.error("Close failed:", error);
  }
}

// Usage example
async function main() {
  if (!appConfig.vault.vaultStateAddress) {
    throw new Error("VAULT_STATE_ADDRESS not configured in environment");
  }
  await closeVault(appConfig.vault.vaultStateAddress, ownerKeypair);
}
`;

console.log("\nTYPESCRIPT CLIENT IMPLEMENTATION:");
console.log(typescriptImplementation);

// ========================================
// 3. KEY CONCEPTS EXPLANATION
// ========================================

console.log("\n=== KEY CONCEPTS EXPLAINED ===\n");

console.log("1. THE CLOSE CONSTRAINT:");
console.log("   - close = owner: Specifies where to send the account's lamports");
console.log("   - Automatically zeros out account data");
console.log("   - Changes account owner to System Program");
console.log("   - Refunds rent exemption to specified account\n");

console.log("2. TWO-STEP PROCESS:");
console.log("   Step 1: Transfer vault SOL to owner (manual transfer)");
console.log("   Step 2: Close accounts and refund rent (automatic via constraint)\n");

console.log("3. SECURITY FEATURES:");
console.log("   - has_one = owner: Only vault owner can close");
console.log("   - PDA validation: Ensures correct derived addresses");
console.log("   - Signer seeds: Required for vault authority operations\n");

console.log("4. WHAT GETS REFUNDED:");
console.log("   - All SOL deposited in the vault");
console.log("   - Rent exemption for vault_state account");
console.log("   - Rent exemption for vault account");
console.log("   - Total: Deposits + Rent for both accounts\n");

console.log("5. AFTER CLOSURE:");
console.log("   - Accounts no longer exist on-chain");
console.log("   - All data is wiped");
console.log("   - Owner receives full refund");
console.log("   - Storage space is reclaimed by the network\n");

console.log("=== HOMEWORK COMPLETION ===");
console.log("✅ Transfer remaining SOL: Done in close() function");
console.log("✅ Close constraint on vault_state: Applied in Close struct");
console.log("✅ Close constraint on vault: Applied in Close struct");
console.log("✅ Rent refund: Automatic via close constraint");
console.log("✅ Data wipe: Automatic via close constraint");

console.log("\n=== END OF IMPLEMENTATION ===");
