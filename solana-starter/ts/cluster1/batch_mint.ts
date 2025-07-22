import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { appConfig } from '../config';
import { validateEnvironmentVariable } from '../utils/errorHandling';
import wallet from "../turbin3-wallet.json";

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection(appConfig.solana.rpcUrl);

const token_decimals = 1_000_000n;

// Get mint address from environment configuration
const mintAddress = validateEnvironmentVariable('MINT_ADDRESS', process.env.MINT_ADDRESS, 'batch_mint', true);
const mint = new PublicKey(mintAddress);

// Get recipient addresses from environment configuration
const recipientAddressesStr = validateEnvironmentVariable('RECIPIENT_ADDRESSES', process.env.RECIPIENT_ADDRESSES, 'batch_mint', true);
const recipients = recipientAddressesStr.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0);

// Get amount to mint from environment configuration with default
const amountPerRecipient = process.env.AMOUNT_PER_RECIPIENT ? 
    BigInt(process.env.AMOUNT_PER_RECIPIENT) : 
    69n; // Default amount

const amountToMint = amountPerRecipient * token_decimals;

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
