import {
  Connection,
  Keypair,
  SystemProgram,
  PublicKey,
  Commitment,
} from "@solana/web3.js";
import {
  Program,
  Wallet,
  AnchorProvider,
  Address,
} from "@coral-xyz/anchor";
import { WbaVault, IDL } from "./programs/wba_vault";
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

// Create our program - using the WBA vault program
const program = new Program<WbaVault>(
  IDL,
  "D51uEDHLbWAxNfodfQDv7qkp8WZtxrhi3uganGbNos7o" as Address,
  provider
);

// Get vault state address from configuration
import { appConfig } from '../config';

const vaultState = appConfig.vault.vaultStateAddress;
if (!vaultState) {
  console.error("❌ Vault state address not configured!");
  console.log("Please set VAULT_STATE_ADDRESS in your .env file");
  console.log("You can get this address by running: npm run vault_init");
  process.exit(1);
}

(async () => {
  try {
    // For the WBA vault program, we need to understand its close instruction structure
    // Based on the IDL, the closeAccount instruction expects:
    // - owner (signer)
    // - closeVaultState (the vault state to close)
    // - vaultState (another vault state, possibly for state management)
    // - systemProgram

    console.log("Vault State:", vaultState.toBase58());
    console.log("Owner:", keypair.publicKey.toBase58());

    // Check owner balance before
    const ownerBalanceBefore = await connection.getBalance(keypair.publicKey);
    console.log(`Owner balance before close: ${ownerBalanceBefore / 1e9} SOL`);

    // Execute the close instruction
    const signature = await program.methods
      .closeAccount()
      .accounts({
        owner: keypair.publicKey,
        closeVaultState: vaultState, // The vault state to close
        vaultState: vaultState,      // Reference vault state
        systemProgram: SystemProgram.programId,
      })
      .signers([keypair])
      .rpc();

    console.log(`Close transaction successful! Signature: ${signature}`);
    console.log(`Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check owner balance after to see the refunded rent
    const ownerBalanceAfter = await connection.getBalance(keypair.publicKey);
    console.log(`Owner balance after close: ${ownerBalanceAfter / 1e9} SOL`);
    console.log(`Rent refunded: ${(ownerBalanceAfter - ownerBalanceBefore) / 1e9} SOL`);

    // Verify the account is closed
    const vaultStateAccountInfo = await connection.getAccountInfo(vaultState);
    
    if (!vaultStateAccountInfo) {
      console.log("✅ Vault state account has been successfully closed!");
      console.log("✅ All remaining SOL has been transferred back to the owner");
      console.log("✅ Rent has been refunded to the owner");
    } else {
      console.log("❌ Vault state account might not have been closed properly");
      console.log("Account still exists with data length:", vaultStateAccountInfo.data.length);
    }

  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
    console.log("\nMake sure to:");
    console.log("1. Set VAULT_STATE_ADDRESS in your .env file with the address from vault_init");
    console.log("2. Ensure you have initialized a vault first using vault_init.ts");
    console.log("3. Ensure you are the owner of the vault state");
  }
})();
