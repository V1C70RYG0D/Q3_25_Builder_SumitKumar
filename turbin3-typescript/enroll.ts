import { Program, Wallet, AnchorProvider, setProvider, Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, clusterApiUrl, PublicKey, SystemProgram } from "@solana/web3.js";
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

// Get RPC URL from environment or use default devnet
const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
const connection = new Connection(rpcUrl);

// Create wallet and provider
const wallet = new Wallet(keypair);
const provider = new AnchorProvider(connection, wallet, { 
    commitment: "confirmed",
    preflightCommitment: "confirmed"
});

// Set the provider as the default
setProvider(provider);

// Get program ID from environment
const programIdString = process.env.WBA_PREREQ_PROGRAM_ID;
if (!programIdString) {
    console.error("❌ WBA_PREREQ_PROGRAM_ID not set in environment variables");
    console.log("Please set WBA_PREREQ_PROGRAM_ID in your .env file");
    process.exit(1);
}

const PROGRAM_ID = new PublicKey(programIdString);

// Basic IDL for the turbin3-rust program
const IDL: Idl = {
    version: "0.1.0",
    name: "turbin3_rust",
    instructions: [
        {
            name: "initialize",
            accounts: [],
            args: []
        }
    ]
};

async function enroll() {
    try {
        console.log("🚀 Starting enrollment process...");
        console.log("Wallet:", keypair.publicKey.toBase58());
        
        // Check wallet balance
        const balance = await connection.getBalance(keypair.publicKey);
        console.log(`Wallet balance: ${balance / 1e9} SOL`);
        
        if (balance === 0) {
            console.log("❌ Wallet is empty! Please fund it first with:");
            console.log(`solana airdrop 2 ${keypair.publicKey.toBase58()} --url devnet`);
            return;
        }

        // Load the program IDL and create program instance
        const program = new Program(IDL, PROGRAM_ID, provider);

        console.log("📋 Program ID:", program.programId.toBase58());
        
        // Example: Call the initialize method
        console.log("🔄 Calling initialize method...");
        
        const tx = await program.methods
            .initialize()
            .rpc();
            
        console.log("✅ Transaction successful!");
        console.log(`🔗 Transaction signature: ${tx}`);
        console.log(`🌐 View on Solana Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
        
        // If your program has additional methods, you can call them here
        // Example for a submit method (if it exists):
        /*
        console.log("🔄 Submitting GitHub handle...");
        const githubUsername = process.env.GITHUB_USERNAME;
        if (!githubUsername) {
            throw new Error("GITHUB_USERNAME environment variable is required");
        }
        const githubHandle = Buffer.from(githubUsername, "utf8");
        
        const submitTx = await program.methods
            .submit(githubHandle)
            .accounts({
                // Add required accounts here
            })
            .rpc();
            
        console.log("✅ Submit transaction successful!");
        console.log(`🔗 Submit signature: ${submitTx}`);
        */
        
    } catch (error: any) {
        console.error("❌ Enrollment failed!");
        
        if (error?.message?.includes("insufficient funds")) {
            console.log("💡 Solution: Fund your wallet with:");
            console.log(`solana airdrop 2 ${keypair.publicKey.toBase58()} --url devnet`);
        } else if (error?.message?.includes("program")) {
            console.log("💡 Make sure the program is deployed and the Program ID is correct");
        } else {
            console.error("Error details:", error);
        }
    }
}

// Helper function to setup wallet if needed
async function setupWallet() {
    console.log("🔧 Wallet Setup Instructions:");
    console.log("1. Generate a new wallet:");
    console.log("   npm run keygen");
    console.log("");
    console.log("2. Fund your wallet (devnet):");
    console.log(`   solana airdrop 2 ${keypair.publicKey.toBase58()} --url devnet`);
    console.log("");
    console.log("3. Update this file to import your wallet:");
    console.log("   // import wallet from './Turbin3-wallet.json'");
    console.log("   // const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));");
    console.log("");
}

// Main execution
async function main() {
    console.log("🎓 Turbin3 Enrollment Script");
    console.log("============================");
    
    // Check if using demo wallet (avoid hardcoded comparison)
    if (!keypair.publicKey.equals(SystemProgram.programId)) {
        console.log("⚠️  Using generated keypair for demo purposes");
        console.log("📝 For real enrollment, please set up your actual wallet\n");
        await setupWallet();
        console.log("");
    }
    
    await enroll();
}

// Export for potential use in other scripts
export { enroll, setupWallet, keypair, connection, provider };

// Run the main function
main().catch(console.error);
