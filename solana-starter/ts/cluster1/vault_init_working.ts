import {
  Connection,
  Keypair,
  SystemProgram,
  PublicKey,
  Commitment,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  Program,
  Wallet,
  AnchorProvider,
  Address,
} from "@coral-xyz/anchor";
import { WbaVault, IDL } from "./programs/wba_vault";
import { appConfig } from '../config';
import wallet from "../turbin3-wallet.json";
import { appConfig } from '../config';

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Commitment
const commitment: Commitment = "confirmed";

// Create a devnet connection
const connection = new Connection(appConfig.solana.rpcUrl);

// Create our anchor provider
const provider = new AnchorProvider(connection, new Wallet(keypair), {
  commitment,
});

// Create our program - using WBA vault program
const program = new Program(
  IDL,
  "D51uEDHLbWAxNfodfQDv7qkp8WZtxrhi3uganGbNos7o" as Address,
  provider
) as Program<WbaVault>;

// Create a new vault state keypair
const vaultState = Keypair.generate();

console.log("=== VAULT INITIALIZATION ===");
console.log(`Owner: ${keypair.publicKey.toBase58()}`);
console.log(`Vault State: ${vaultState.publicKey.toBase58()}`);

// Create the PDA for vault authority
const [vaultAuth] = PublicKey.findProgramAddressSync(
  [Buffer.from("auth"), vaultState.publicKey.toBuffer()],
  program.programId
);

// Create the vault PDA
const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vaultAuth.toBuffer()],
  program.programId
);

console.log(`Vault Auth PDA: ${vaultAuth.toBase58()}`);
console.log(`Vault PDA: ${vault.toBase58()}`);

// Execute vault initialization
(async () => {
  try {
    console.log("\nInitializing vault...");
    
    const signature = await program.methods
      .initialize()
      .accounts({
        owner: keypair.publicKey,
        vaultState: vaultState.publicKey,
        vaultAuth: vaultAuth,
        vault: vault,
        systemProgram: SystemProgram.programId,
      })
      .signers([keypair, vaultState])
      .rpc();

    console.log(`✅ Vault initialized successfully!`);
    console.log(`Transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Save the important addresses
    console.log("\n=== SAVE THESE ADDRESSES ===");
    console.log(`Vault State: ${vaultState.publicKey.toBase58()}`);
    console.log(`Vault Auth: ${vaultAuth.toBase58()}`);
    console.log(`Vault: ${vault.toBase58()}`);
    
    console.log("\n=== NEXT STEPS ===");
    console.log("1. Use vault_deposit.ts to deposit SOL");
    console.log("2. Use vault_withdraw.ts to withdraw SOL");
    console.log("3. Use vault_close_working.ts to close the vault");
    console.log("4. Replace the VAULT_STATE_ADDRESS in those files with:");
    console.log(`   ${vaultState.publicKey.toBase58()}`);

  } catch (error) {
    console.error("❌ Vault initialization failed:", error);
  }
})();
