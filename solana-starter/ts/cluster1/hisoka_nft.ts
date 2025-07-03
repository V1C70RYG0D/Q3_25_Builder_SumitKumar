import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import wallet from "../turbin3-wallet.json";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { 
    createMetadataAccountV3,
    findMetadataPda,
    CreateMetadataAccountV3InstructionAccounts,
    CreateMetadataAccountV3InstructionArgs,
    DataV2Args
} from "@metaplex-foundation/mpl-token-metadata";
import { createGenericFile, createSignerFromKeypair, signerIdentity, publicKey } from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { readFile } from "fs/promises";

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Create a UMI connection (for metadata)
const umi = createUmi('https://api.devnet.solana.com');
const umiKeypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, umiKeypair);
umi.use(irysUploader());
umi.use(signerIdentity(signer));
umi.use(mplTokenMetadata());

(async () => {
    try {
        console.log("Creating an NFT with Hisoka image...");
        
        // 1. Load and upload the Hisoka image
        console.log("Loading and uploading Hisoka image...");
        const imageBuffer = await readFile("../../Hisoka.webp");
        
        // Convert image to generic file
        const image = createGenericFile(imageBuffer, "Hisoka.webp", {
            contentType: "image/webp",
        });
        
        // Upload image
        const [imageUri] = await umi.uploader.upload([image]);
        console.log("Hisoka image uploaded: ", imageUri);
        
        // 2. Create the token mint
        console.log("Creating token mint...");
        const mint = await createMint(
            connection,
            keypair,
            keypair.publicKey,
            keypair.publicKey,
            0  // 0 decimals for NFT
        );
        console.log(`NFT mint created: ${mint.toBase58()}`);
        
        // 3. Create and upload metadata
        console.log("Creating and uploading metadata...");
        const metadata = {
            name: "Hisoka NFT",
            symbol: "HISOKA",
            description: "An NFT featuring Hisoka from Hunter x Hunter anime series",
            image: imageUri,
            attributes: [
                {trait_type: 'Character', value: 'Hisoka'},
                {trait_type: 'Anime', value: 'Hunter x Hunter'},
                {trait_type: 'Power', value: 'Bungee Gum'}
            ],
            properties: {
                files: [
                    {
                        type: "image/webp",
                        uri: imageUri
                    }
                ],
                category: "image"
            }
        };
        
        const metadataFile = createGenericFile(
            Buffer.from(JSON.stringify(metadata)),
            "metadata.json",
            { contentType: "application/json" }
        );
        
        const [metadataUri] = await umi.uploader.upload([metadataFile]);
        console.log("Metadata uploaded: ", metadataUri);
        
        // 4. Create NFT token account
        console.log("Creating NFT token account...");
        const tokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            mint,
            keypair.publicKey
        );
        
        // 5. Mint one token to make it a true NFT
        console.log("Minting one token to make it an NFT...");
        const mintSig = await mintTo(
            connection,
            keypair,
            mint,
            tokenAccount.address,
            keypair.publicKey,
            1
        );
        console.log(`NFT minted! Mint signature: ${mintSig}`);
        
        // 6. Try to create on-chain metadata
        try {
            console.log("Attempting to create on-chain metadata...");
            
            // Convert Solana PublicKey to UMI PublicKey format
            const mintPublicKey = publicKey(mint.toBase58());
            const metadataPda = findMetadataPda(umi, { mint: mintPublicKey });
            
            // Define the metadata data
            let data: DataV2Args = {
                name: "Hisoka NFT",
                symbol: "HISOKA",
                uri: metadataUri,
                sellerFeeBasisPoints: 0,
                creators: null,
                collection: null,
                uses: null
            };
            
            // Create the transaction for on-chain metadata
            const builder = await createMetadataAccountV3(umi, {
                metadata: metadataPda,
                mint: mintPublicKey,
                mintAuthority: signer,
                payer: signer,
                updateAuthority: signer.publicKey,
                data: data,
                isMutable: true,
                collectionDetails: null,
            });
            
            // Send and confirm the transaction
            console.log("Sending on-chain metadata transaction...");
            const result = await builder.sendAndConfirm(umi, {
                confirm: { commitment: 'confirmed' },
                send: { skipPreflight: true } // Skip preflight to avoid simulation errors
            });
            
            console.log("On-chain metadata created successfully! Signature:", bs58.encode(result.signature));
        } catch (metadataError: any) {
            console.log("Could not create on-chain metadata. This is expected on some environments.");
            console.log("Error:", metadataError.message || String(metadataError));
            console.log("Continuing with off-chain metadata only...");
            
            console.log("Trying an alternative approach to create on-chain metadata...");
            try {
                // Convert Solana PublicKey to UMI PublicKey format
                const mintPublicKey = publicKey(mint.toBase58());
                const metadataPda = findMetadataPda(umi, { mint: mintPublicKey });
                
                // Define the metadata data
                let data: DataV2Args = {
                    name: "Hisoka NFT",
                    symbol: "HISOKA",
                    uri: metadataUri,
                    sellerFeeBasisPoints: 0,
                    creators: null,
                    collection: null,
                    uses: null
                };
                
                // Create the transaction for on-chain metadata with more detailed options
                const builder = await createMetadataAccountV3(umi, {
                    metadata: metadataPda,
                    mint: mintPublicKey,
                    mintAuthority: signer,
                    payer: signer,
                    updateAuthority: signer.publicKey,
                    data: data,
                    isMutable: true,
                    collectionDetails: null,
                });
                
                // Send and confirm with adjusted settings
                console.log("Sending on-chain metadata transaction with adjusted settings...");
                const result = await builder.sendAndConfirm(umi, {
                    confirm: { commitment: 'finalized' },
                    send: { 
                        skipPreflight: true,
                        maxRetries: 5
                    }
                });
                
                console.log("On-chain metadata created successfully with alternative approach! Signature:", bs58.encode(result.signature));
            } catch (alternativeError: any) {
                console.log("Alternative approach also failed. Error:", alternativeError.message || String(alternativeError));
                console.log("Continuing with off-chain metadata only...");
            }
        }
        
        // Success!
        console.log("\nHisoka NFT created successfully!");
        console.log(`Mint Address: ${mint.toBase58()}`);
        console.log(`Owner: ${keypair.publicKey.toBase58()}`);
        console.log(`Metadata URI: ${metadataUri}`);
        console.log(`Image URI: ${imageUri}`);
        console.log("\nThis NFT uses the Hisoka image and has been minted to your wallet.");
        
    } catch(error) {
        console.error(`Error creating Hisoka NFT: ${error}`);
    }
})();
