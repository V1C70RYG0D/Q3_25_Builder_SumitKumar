import wallet from "../turbin3-wallet.json"
import { appConfig } from '../config';
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { appConfig } from '../config';
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { appConfig } from '../config';
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { appConfig } from '../config';
import { readFile } from "fs/promises"
import { appConfig } from '../config';

// Create a devnet connection
const umi = createUmi(appConfig.solana.rpcUrl);

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader());
umi.use(signerIdentity(signer));

(async () => {
    try {
        // 1. Load image
        const imageBuffer = await readFile("../../Hisoka.webp");
        
        // 2. Convert image to generic file
        const image = createGenericFile(imageBuffer, "Hisoka.webp", {
            contentType: "image/webp",
        });
        
        // 3. Upload image
        const [imageUri] = await umi.uploader.upload([image]);
        console.log("Your image URI: ", imageUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();
