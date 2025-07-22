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
  BN,
} from "@coral-xyz/anchor";
import { Turbin3Rust, IDL } from "./programs/turbin3_vault";
import wallet from "../turbin3-wallet.json";

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

// Create our program
const program = new Program<Turbin3Rust>(IDL, provider);

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
    // Derive the vault authority PDA
    const [vaultAuth] = PublicKey.findProgramAddressSync(
      [Buffer.from("auth"), vaultState.toBuffer()],
      program.programId
    );

    // Derive the vault PDA
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultAuth.toBuffer()],
      program.programId
    );

    console.log("Vault State:", vaultState.toBase58());
    console.log("Vault Auth:", vaultAuth.toBase58());
    console.log("Vault:", vault.toBase58());

    // Check current vault balance before closing
    const vaultAccountInfo = await connection.getAccountInfo(vault);
    if (vaultAccountInfo) {
      console.log(`Current vault balance: ${vaultAccountInfo.lamports / 1e9} SOL`);
    }

    // Check owner balance before
    const ownerBalanceBefore = await connection.getBalance(keypair.publicKey);
    console.log(`Owner balance before close: ${ownerBalanceBefore / 1e9} SOL`);

    // Execute the close instruction
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

    console.log(`Close transaction successful! Signature: ${signature}`);
    console.log(`Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);

    // Check owner balance after to see the refunded rent
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait a bit for confirmation
    const ownerBalanceAfter = await connection.getBalance(keypair.publicKey);
    console.log(`Owner balance after close: ${ownerBalanceAfter / 1e9} SOL`);
    console.log(`Rent refunded: ${(ownerBalanceAfter - ownerBalanceBefore) / 1e9} SOL`);

    // Verify the accounts are closed
    const vaultStateAccountInfo = await connection.getAccountInfo(vaultState);
    const vaultAccountInfo2 = await connection.getAccountInfo(vault);
    
    if (!vaultStateAccountInfo && !vaultAccountInfo2) {
      console.log("✅ Both vault_state and vault accounts have been successfully closed!");
    } else {
      console.log("❌ Some accounts might not have been closed properly");
    }

  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
    // console.log(`Close success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
