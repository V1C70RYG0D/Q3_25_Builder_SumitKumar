import { Connection, PublicKey } from "@solana/web3.js";        // Method 2: Using direct account lookup for metadata PDA
import { appConfig } from '../config';
        try {
            console.log("\n--- Checking on-chain metadata ---");
            
            // Direct Solana way to calculate metadata account address 
            const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
            const [metadataAccountPDA] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from("metadata"),
                    METADATA_PROGRAM_ID.toBuffer(),
                    new PublicKey(mintAddress).toBuffer(),
                ],
                METADATA_PROGRAM_ID
            );
            
            console.log(`Metadata PDA: ${metadataAccountPDA.toString()}`);
            
            // Get metadata account info
            const metadataAccount = await connection.getAccountInfo(metadataAccountPDA);
            if (metadataAccount) {
                console.log("On-chain metadata exists!");
                console.log(`Account Size: ${metadataAccount.data.length} bytes`);
                console.log(`Is Executable: ${metadataAccount.executable}`);
                console.log(`Owner: ${metadataAccount.owner.toString()}`);
            } else {
                console.log("No on-chain metadata found");
            }
        } catch (error) {
            const umiError = error as Error;
            console.log("Could not fetch on-chain metadata:", umiError.message || String(umiError));
        } } from "@metaplex-foundation/js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { appConfig } from '../config';
import { findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";
import { appConfig } from '../config';
import { publicKey } from "@metaplex-foundation/umi";
import { appConfig } from '../config';

// Use global fetch instead of node-fetch
const fetch = global.fetch;

// Check command line arguments
if (process.argv.length < 3) {
    console.log("Please provide the NFT mint address as an argument");
    console.log("Usage: npm run view_nft <mint-address>");
    process.exit(1);
}

// Get mint address from command line arguments
const mintAddress = process.argv[2];

// Create a Solana connection
const connection = new Connection(appConfig.solana.rpcUrl);

// Create a Metaplex instance
const metaplex = new Metaplex(connection);

// Create a UMI instance
const umi = createUmi(appConfig.solana.rpcUrl);

(async () => {
    try {
        console.log(`Fetching details for NFT with mint address: ${mintAddress}`);

        // Method 1: Using Metaplex
        try {
            console.log("\n--- Using Metaplex ---");
            const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(mintAddress) });
            
            console.log("NFT Details:");
            console.log(`Name: ${nft.name}`);
            console.log(`Symbol: ${nft.symbol}`);
            console.log(`URI: ${nft.uri}`);
            console.log(`Mint Address: ${nft.address.toBase58()}`);
            console.log(`Owner: ${nft.creators && nft.creators.length > 0 ? nft.creators[0].address : 'Unknown'}`);
            
            // Fetch and display metadata
            if (nft.uri) {
                console.log("\nFetching NFT metadata...");
                const metadataResponse = await fetch(nft.uri);
                const metadata = await metadataResponse.json();
                console.log("\nMetadata:");
                console.log(JSON.stringify(metadata, null, 2));
            }
        } catch (error) {
            const metaplexError = error as Error;
            console.log("Could not fetch using Metaplex:", metaplexError.message || String(metaplexError));
        }
        
        // Method 2: Using UMI to find on-chain metadata PDA
        try {
            console.log("\n--- Using UMI to check on-chain metadata ---");
            const mintPublicKey = publicKey(mintAddress);
            const metadataPda = findMetadataPda(umi, { mint: mintPublicKey });
            console.log(`Metadata PDA: ${metadataPda.toString()}`);
            
            // Get metadata account info
            const metadataAccount = await connection.getAccountInfo(new PublicKey(metadataPda.toString()));
            if (metadataAccount) {
                console.log("On-chain metadata exists!");
            } else {
                console.log("No on-chain metadata found");
            }
        } catch (error) {
            const umiError = error as Error;
            console.log("Could not fetch using UMI:", umiError.message || String(umiError));
        }
        
    } catch (error) {
        console.error(`Error fetching NFT details: ${error}`);
    }
})();
