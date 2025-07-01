import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

// NOTE: Replace this with your actual wallet import
// import wallet from "./your-wallet.json"

// For demo purposes, we'll generate a new keypair
// In a real application, you'd load your actual wallet
const keypair = Keypair.generate();

// Create a Solana devnet connection
const connection = new Connection("https://api.devnet.solana.com");

async function airdrop() {
    try {
        // Request airdrop of 2 SOL to the wallet
        console.log("Requesting airdrop for", keypair.publicKey.toBase58());
        
        const txhash = await connection.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
        console.log(`Success! Check out your TX here: 
        https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
    } catch(e) {
        console.error(`Airdrop failed! ${e}`);
    }
}

airdrop();
