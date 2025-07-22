import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { config } from 'dotenv';

// Load environment variables
config();

// Load wallet from environment configuration
const walletPath = process.env.WALLET_PATH || "./Turbin3-wallet.json";

let keypair: Keypair;
try {
    const walletData = require(walletPath);
    keypair = Keypair.fromSecretKey(new Uint8Array(walletData));
} catch (error) {
    console.error(`❌ Failed to load wallet from ${walletPath}:`, error);
    console.log("Please ensure your wallet file exists or run 'npm run keygen' to create one");
    process.exit(1);
}

// Get RPC URL from environment or exit if not set
const rpcUrl = process.env.SOLANA_RPC_URL;
if (!rpcUrl) {
    console.error("❌ SOLANA_RPC_URL not set in environment variables");
    console.log("Please set SOLANA_RPC_URL in your .env file");
    process.exit(1);
}
const connection = new Connection(rpcUrl);

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
