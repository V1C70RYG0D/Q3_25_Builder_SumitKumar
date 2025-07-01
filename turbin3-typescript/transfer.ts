import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

// NOTE: Replace this with your actual wallet import
// import wallet from "./your-wallet.json"
// const from = Keypair.fromSecretKey(new Uint8Array(wallet));

// For demo purposes, we'll generate a new keypair
// In a real application, you'd load your actual wallet
const from = Keypair.generate();

// Replace this with the recipient's public key
const to = new PublicKey("RECIPIENT_PUBLIC_KEY_HERE");

// Create a Solana devnet connection
const connection = new Connection("https://api.devnet.solana.com");

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
