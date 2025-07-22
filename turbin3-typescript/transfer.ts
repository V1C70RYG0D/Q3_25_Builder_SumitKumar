import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { config } from 'dotenv';

// Load environment variables
config();

// Load wallet from environment configuration
const walletPath = process.env.WALLET_PATH || "./Turbin3-wallet.json";
const recipientAddress = process.env.RECIPIENT_ADDRESS;

if (!recipientAddress) {
    console.error("❌ RECIPIENT_ADDRESS not set in environment variables");
    console.log("Please set RECIPIENT_ADDRESS in your .env file");
    process.exit(1);
}

let from: Keypair;
try {
    const walletData = require(walletPath);
    from = Keypair.fromSecretKey(new Uint8Array(walletData));
} catch (error) {
    console.error(`❌ Failed to load wallet from ${walletPath}:`, error);
    console.log("Please ensure your wallet file exists or run 'npm run keygen' to create one");
    process.exit(1);
}

const to = new PublicKey(recipientAddress);

// Get RPC URL from environment or use default devnet
const rpcUrl = process.env.SOLANA_RPC_URL;
if (!rpcUrl) {
    console.error("❌ SOLANA_RPC_URL not set in environment variables");
    console.log("Please set SOLANA_RPC_URL in your .env file");
    process.exit(1);
}
const connection = new Connection(rpcUrl);

async function transfer() {
    try {
        // Get balance of sender wallet
        const balance = await connection.getBalance(from.publicKey);
        const balanceInSol = balance / LAMPORTS_PER_SOL;
        console.log(`Wallet balance: ${balanceInSol} SOL`);

        if (balance === 0) {
            console.log("Wallet is empty! Please fund it first.");
            return;
        }

        // Create transfer transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: balance, // Transfer all SOL
            }),
        );

        // Calculate transaction fee
        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
        transaction.feePayer = from.publicKey;

        // Calculate the fee and subtract it from the transfer amount
        const fee = await connection.getFeeForMessage(transaction.compileMessage(), 'confirmed');
        const transferAmount = balance - (fee?.value || 5000); // Default to 5000 lamports if fee calculation fails

        // Update transaction with correct amount
        transaction.instructions[0] = SystemProgram.transfer({
            fromPubkey: from.publicKey,
            toPubkey: to,
            lamports: transferAmount,
        });

        // Sign transaction
        transaction.sign(from);

        // Send transaction
        const signature = await connection.sendRawTransaction(transaction.serialize());
        console.log(`Success! Check out your TX here: 
        https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    } catch(e) {
        console.error(`Transfer failed! ${e}`);
    }
}

transfer();
