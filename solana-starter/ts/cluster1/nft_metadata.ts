import wallet from "../turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"

// Create a devnet connection
const umi = createUmi('https://api.devnet.solana.com');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

(async () => {
    try {
        // Follow this JSON structure
        // https://docs.metaplex.com/programs/token-metadata/changelog/v1.0#json-structure

        const imageUri = "https://gateway.irys.xyz/BHDqb2Cp3ncicrC4ZnKoRg8VTA1hzPSxUZgioe7tRabT";
        
        const metadata = {
            name: "VictoryGod",
            symbol: "VG0D",
            description: "VictoryGod gonna nail this Turbin3 Q3 Builder Cohort",
            image: imageUri,
            attributes: [
                {trait_type: 'Power', value: 'Bungee Gum'},
                {trait_type: 'Anime', value: 'Hunter X Hunter'}
            ],
            properties: {
                files: [
                    {
                        type: "image/webp",
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
