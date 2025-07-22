import wallet from "../turbin3-wallet.json"
import { appConfig } from '../config';
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { appConfig } from '../config';
import { 
    createMetadataAccountV3, 
    CreateMetadataAccountV3InstructionAccounts, 
    CreateMetadataAccountV3InstructionArgs,
    DataV2Args
} from "@metaplex-foundation/mpl-token-metadata";
import { createSignerFromKeypair, signerIdentity, publicKey } from "@metaplex-foundation/umi";
import { appConfig } from '../config';
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { appConfig } from '../config';

// Define our Mint address
const mint = publicKey("2A86AycAhymo8rF2LMfgR4D2xPSdLjyGBd7PrqNXUqyy")

// Create a UMI connection
const umi = createUmi(appConfig.solana.rpcUrl);
const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(signer));

(async () => {
    try {
        // Import the findMetadataPda function and use it to get the metadata PDA for the mint
        const { findMetadataPda } = await import("@metaplex-foundation/mpl-token-metadata");
        const metadata = findMetadataPda(umi, { mint });
        
        // Define the metadata accounts
        let accounts: CreateMetadataAccountV3InstructionAccounts = {
            mint,
            metadata,
            updateAuthority: signer,
            mintAuthority: signer,
            payer: signer,
        };

        // Define the metadata data
        let data: DataV2Args = {
            name: "VictoryGod",
            symbol: "VG0D",
            uri: "https://gateway.irys.xyz/Es8DHX9xCPpL8SFCdTJG5g9Q7gMnsVUp51P4vnwD1WcM",
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null
        };

        // Define the metadata arguments
        let args: CreateMetadataAccountV3InstructionArgs = {
            data,
            isMutable: true,
            collectionDetails: null,
        };

        // Create the transaction
        let tx = createMetadataAccountV3(
            umi,
            {
                ...accounts,
                ...args
            }
        );

        // Send the transaction
        let result = await tx.sendAndConfirm(umi);
        console.log("Metadata created. Transaction signature:", bs58.encode(result.signature));
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();
