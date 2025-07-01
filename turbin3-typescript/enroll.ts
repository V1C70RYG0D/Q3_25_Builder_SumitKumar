import { Program, Wallet, AnchorProvider, setProvider, Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, clusterApiUrl, PublicKey } from "@solana/web3.js";

// NOTE: Replace this with your actual wallet import
// import wallet from "./your-wallet.json"
// const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// For demo purposes, we'll generate a new keypair
// In a real application, you'd load your actual wallet
const keypair = Keypair.generate();

// Create a devnet connection
const connection = new Connection(clusterApiUrl("devnet"));

// Create wallet and provider
const wallet = new Wallet(keypair);
const provider = new AnchorProvider(connection, wallet, { 
    commitment: "confirmed",
    preflightCommitment: "confirmed"
});

// Set the provider as the default
setProvider(provider);

// Program ID - replace with your actual deployed program ID
const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

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
        const githubHandle = Buffer.from("your-github-handle", "utf8");
        
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
    console.log("   // import wallet from './your-wallet.json'");
    console.log("   // const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));");
    console.log("");
}

// Main execution
async function main() {
    console.log("🎓 Turbin3 Enrollment Script");
    console.log("============================");
    
    // Check if using demo wallet
    if (keypair.publicKey.toBase58() !== "11111111111111111111111111111111") {
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
