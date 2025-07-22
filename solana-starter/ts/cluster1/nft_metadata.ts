import wallet from "../turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { appConfig } from '../config';
import { validateEnvironmentVariable } from '../utils/errorHandling';

// Create a devnet connection using configured RPC URL
const umi = createUmi(appConfig.solana.rpcUrl);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

(async () => {
    try {
        // Follow this JSON structure
        // https://docs.metaplex.com/programs/token-metadata/changelog/v1.0#json-structure

        // Get metadata configuration from environment variables
        const imageUri = validateEnvironmentVariable('NFT_IMAGE_URI', process.env.NFT_IMAGE_URI, 'nft_metadata', true);
        const nftName = validateEnvironmentVariable('NFT_NAME', process.env.NFT_NAME, 'nft_metadata', true);
        const nftSymbol = validateEnvironmentVariable('NFT_SYMBOL', process.env.NFT_SYMBOL, 'nft_metadata', true);
        const nftDescription = validateEnvironmentVariable('NFT_DESCRIPTION', process.env.NFT_DESCRIPTION, 'nft_metadata', true);
        
        // Get optional attributes from environment (JSON format)
        const attributesStr = process.env.NFT_ATTRIBUTES || '[]';
        let attributes;
        try {
            attributes = JSON.parse(attributesStr);
        } catch (error) {
            console.warn('Invalid NFT_ATTRIBUTES JSON format, using empty array');
            attributes = [];
        }
        
        const metadata = {
            name: nftName,
            symbol: nftSymbol,
            description: nftDescription,
            image: imageUri,
            attributes: attributes,
            properties: {
                files: [
                    {
                        type: process.env.NFT_FILE_TYPE || "image/webp",
                        uri: imageUri
                    },
                ]
            },
            creators: []
        };
        
        // Convert metadata to a generic file
        const metadataFile = createGenericFile(
            Buffer.from(JSON.stringify(metadata)),
            "metadata.json",
            { contentType: "application/json" }
        );
        
        // Upload metadata
        const [metadataUri] = await umi.uploader.upload([metadataFile]);
        console.log("Your metadata URI: ", metadataUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();
