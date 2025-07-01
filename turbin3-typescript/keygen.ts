import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

// Create a Solana devnet connection
const connection = new Connection("https://api.devnet.solana.com");

// Generate a new keypair
const keypair = Keypair.generate();

console.log("You've generated a new Solana wallet:", keypair.publicKey.toBase58());
console.log("");
console.log("To save your wallet, copy and paste the following into a JSON file:");
console.log(JSON.stringify(Array.from(keypair.secretKey)));

export default keypair;
