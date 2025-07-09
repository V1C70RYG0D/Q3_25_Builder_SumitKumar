/**
 * ANCHOR VAULT CLOSE INSTRUCTION IMPLEMENTATION
 * 
 * This file demonstrates how to implement the close instruction for an Anchor vault program.
 * The close instruction performs two main operations:
 * 
 * 1. Transfer all remaining SOL from the vault PDA back to the user
 * 2. Use the close constraint on both vault and vault_state accounts to:
 *    - Wipe their data from the blockchain
 *    - Refund the original rent payment back to the user who created them
 */

import {
  Connection,
  Keypair,
  SystemProgram,
  PublicKey,
  Commitment,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// Configuration
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// Example demonstration of the close instruction concept
async function demonstrateVaultClose() {
  console.log("=== ANCHOR VAULT CLOSE INSTRUCTION DEMONSTRATION ===\n");
  
  console.log("The close instruction in an Anchor vault program typically includes:\n");
  
  console.log("1. RUST IMPLEMENTATION (lib.rs):");
  console.log(`
pub fn close(ctx: Context<Close>) -> Result<()> {
    let seeds = &[
        b"auth",
        ctx.accounts.vault_state.to_account_info().key.as_ref(),
        &[ctx.accounts.vault_state.auth_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // Step 1: Transfer all remaining SOL from vault back to owner
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

    // Step 2: Account closure is handled automatically by the close constraint
    Ok(())
}
  `);

  console.log("2. ACCOUNT VALIDATION STRUCT:");
  console.log(`
#[derive(Accounts)]
pub struct Close<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        has_one = owner,
        close = owner // This closes the vault_state account and refunds rent
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
        close = owner // This closes the vault account and refunds rent
    )]
    pub vault: SystemAccount<'info>,
    
    pub system_program: Program<'info, System>,
}
  `);

  console.log("3. TYPESCRIPT CLIENT USAGE:");
  console.log(`
// Derive PDAs
const [vaultAuth] = PublicKey.findProgramAddressSync(
  [Buffer.from("auth"), vaultState.toBuffer()],
  program.programId
);

const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vaultAuth.toBuffer()],
  program.programId
);

// Execute close instruction
const signature = await program.methods
  .close()
  .accounts({
    owner: keypair.publicKey,
    vaultState: vaultState,
    vaultAuth: vaultAuth,
    vault: vault,
    systemProgram: SystemProgram.programId,
  })
  .signers([keypair])
  .rpc();
  `);

  console.log("4. KEY FEATURES OF THE CLOSE CONSTRAINT:\n");
  console.log("✅ close = owner: Automatically closes the account");
  console.log("✅ Transfers all lamports from the account to the specified destination");
  console.log("✅ Sets the account data to all zeros");
  console.log("✅ Sets the account owner to the System Program");
  console.log("✅ Refunds the rent exemption amount to the destination account");

  console.log("\n5. WHAT HAPPENS DURING CLOSE:\n");
  console.log("Before close:");
  console.log("- Vault account contains SOL deposits");
  console.log("- VaultState account contains program data and rent");
  console.log("- Both accounts exist on-chain");

  console.log("\nAfter close:");
  console.log("- All SOL transferred back to owner");
  console.log("- Rent refunded to owner");
  console.log("- Accounts wiped from blockchain");
  console.log("- Owner receives back all funds + rent");

  console.log("\n6. SECURITY CONSIDERATIONS:\n");
  console.log("⚠️  has_one = owner: Ensures only the owner can close");
  console.log("⚠️  PDA validation: Ensures correct vault accounts");
  console.log("⚠️  Signer seeds: Required for vault-to-owner transfers");

  console.log("\n=== END DEMONSTRATION ===");
}

// Example of how to create a working close instruction
async function createWorkingCloseExample() {
  console.log("\n=== WORKING CLOSE INSTRUCTION EXAMPLE ===\n");
  
  // This would be your actual implementation:
  const exampleCode = `
import { Program, AnchorProvider } from "@coral-xyz/anchor";

// 1. Set up your program connection
const program = new Program(IDL, PROGRAM_ID, provider);

// 2. Get your vault state address (from when you initialized)
const vaultState = new PublicKey("YOUR_VAULT_STATE_ADDRESS");

// 3. Derive required PDAs
const [vaultAuth] = PublicKey.findProgramAddressSync(
  [Buffer.from("auth"), vaultState.toBuffer()],
  program.programId
);

const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vaultAuth.toBuffer()],
  program.programId
);

// 4. Execute the close instruction
try {
  const signature = await program.methods
    .close()
    .accounts({
      owner: owner.publicKey,
      vaultState: vaultState,
      vaultAuth: vaultAuth,
      vault: vault,
      systemProgram: SystemProgram.programId,
    })
    .signers([owner])
    .rpc();
    
  console.log("Vault closed successfully!");
  console.log("Transaction:", signature);
} catch (error) {
  console.error("Close failed:", error);
}
  `;
  
  console.log("COMPLETE WORKING EXAMPLE:");
  console.log(exampleCode);
  
  console.log("\nIMPORTANT NOTES:");
  console.log("- Replace YOUR_VAULT_STATE_ADDRESS with actual address from vault_init");
  console.log("- Ensure you have the correct program ID");
  console.log("- Make sure you're the owner of the vault");
  console.log("- Test on devnet first!");
}

// Run the demonstration
demonstrateVaultClose().then(() => {
  createWorkingCloseExample();
}).catch(console.error);
