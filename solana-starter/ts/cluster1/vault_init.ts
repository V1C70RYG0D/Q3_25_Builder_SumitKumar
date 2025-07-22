import {
  Connection,
  Keypair,
  SystemProgram,
  PublicKey,
  Commitment,
} from "@solana/web3.js";
import { Program, Wallet, AnchorProvider, Address } from "@coral-xyz/anchor";
import { appConfig } from '../config';
import { Turbin3Rust, IDL } from "./programs/turbin3_vault";
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

// Create our program - using our turbin3-rust program ID
const program = new Program<Turbin3Rust>(
  IDL,
  "BvspYwyDic1fVBRysCCLMyQeBurrJ6P6f5Zeiy6Zfsz4" as Address,
  provider,
);

// Create a random keypair for vault state
const vaultState = Keypair.generate();
console.log(`Vault State public key: ${vaultState.publicKey.toBase58()}`);

// Create the PDA for vault authority
// Seeds are "auth", vaultState
const [vaultAuth] = PublicKey.findProgramAddressSync(
  [Buffer.from("auth"), vaultState.publicKey.toBuffer()],
  program.programId
);
console.log(`Vault Auth PDA: ${vaultAuth.toBase58()}`);

// Create the vault PDA
// Seeds are "vault", vaultAuth
const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), vaultAuth.toBuffer()],
  program.programId
);
console.log(`Vault PDA: ${vault.toBase58()}`);

// Execute our initialization transaction
(async () => {
  try {
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
      
    console.log(`Init success! Check out your TX here:\n\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Save vault state for future use
    console.log(`\nSave these addresses for future operations:`);
    console.log(`Vault State: ${vaultState.publicKey.toBase58()}`);
    console.log(`Vault Auth: ${vaultAuth.toBase58()}`);
    console.log(`Vault: ${vault.toBase58()}`);
    
  } catch (e) {
    console.error(`Oops, something went wrong: ${e}`);
  }
})();
