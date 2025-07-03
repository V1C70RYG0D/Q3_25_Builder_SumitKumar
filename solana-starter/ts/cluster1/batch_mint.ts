import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import wallet from "../turbin3-wallet.json"

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const token_decimals = 1_000_000n;

// Mint address
const mint = new PublicKey("2A86AycAhymo8rF2LMfgR4D2xPSdLjyGBd7PrqNXUqyy");

// List of recipient addresses
const recipients = [
    "deiyvXCabxck1UYaAWH4PT5mTPGhhkmLRcFhRGdWBJq",
    "HWU5EhdNTd9pw8PQoapFg5jnCxk8NPDcXYsxpQvEcAen",
    "DwFgED8ZcztuT4FourTdcDu5tAGrZPMXfjVbLbcMBCHf",
    "AkXiNtkzkknE5RjDotbpNyP9bsejVSffSEud5wygDscK",
    "DwUkSRrMWtcxsqVEJk7coMwpRVXDdxS2mxBPjMMgN1pY",
    "4UxpHTgUorzAD3pEAzpNi8TGEesZr6xGoiZ95ADUpnYu",
    "J2Rnp3AkbHWzXnGC9rnYnnKesA4ft63xXZKSmnURypoH",
    "5MWpSXNiS3coFVuzSFQca2Y8tDfUv9BqpUFM4UrJQQ41"
];

// Amount to mint to each recipient (69 tokens)
const amountToMint = 69n * token_decimals;

(async () => {
    try {
        console.log(`Starting batch mint of ${amountToMint / token_decimals} tokens to ${recipients.length} addresses...`);

        // Process each recipient
        for (const recipientAddress of recipients) {
            try {
                // Convert string address to PublicKey
                const recipient = new PublicKey(recipientAddress);
                
                // Create an ATA for the recipient
                console.log(`Creating/getting ATA for ${recipientAddress}...`);
                const recipientAta = await getOrCreateAssociatedTokenAccount(
                    connection,
                    keypair,
                    mint,
                    recipient
                );
                
                // Mint tokens to the recipient's ATA
                console.log(`Minting ${amountToMint / token_decimals} tokens to ${recipientAddress}...`);
                const mintTx = await mintTo(
                    connection,
                    keypair,
                    mint,
                    recipientAta.address,
                    keypair.publicKey,
                    Number(amountToMint)
                );
                
                console.log(`Successfully minted to ${recipientAddress} - Tx: ${mintTx}`);
            } catch (err) {
                console.error(`Failed to mint to ${recipientAddress}: ${err}`);
                // Continue to the next recipient even if one fails
            }
        }
        
        console.log("Batch minting completed!");
    } catch(error) {
        console.error(`Batch mint failed: ${error}`);
    }
})();
