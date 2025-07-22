import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Marketplace } from "../target/types/marketplace";
import { 
  createNft, 
  findMasterEditionPda, 
  findMetadataPda, 
  mplTokenMetadata, 
  verifySizedCollectionItem 
} from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { 
  KeypairSigner, 
  PublicKey, 
  createSignerFromKeypair, 
  generateSigner, 
  keypairIdentity, 
  percentAmount, 
  publicKey 
} from '@metaplex-foundation/umi';
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.marketplace as Program<Marketplace>;
  const connection = provider.connection;
  const umi = createUmi(provider.connection);
  const payer = provider.wallet as NodeWallet;

  let nftMint: KeypairSigner = generateSigner(umi);
  let collectionMint: KeypairSigner = generateSigner(umi);

  const creatorWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(payer.payer.secretKey));
  const creator = createSignerFromKeypair(umi, creatorWallet);
  umi.use(keypairIdentity(creator));
  umi.use(mplTokenMetadata());

  let makerAta: anchor.web3.PublicKey;
  let takerAta: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;

  const maker = Keypair.generate();
  const taker = Keypair.generate();

  const name = "TurBin3Market";
  const price = new anchor.BN(LAMPORTS_PER_SOL); // 1 SOL
  const fee = 250; // 2.5%

  // Derive PDAs
  const marketplace = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("marketplace"), Buffer.from(name)], 
    program.programId
  )[0];
  
  const rewardsMint = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("rewards"), marketplace.toBuffer()], 
    program.programId
  )[0];
  
  const treasury = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), marketplace.toBuffer()], 
    program.programId
  )[0];
  
  const listing = anchor.web3.PublicKey.findProgramAddressSync(
    [marketplace.toBuffer(), new anchor.web3.PublicKey(nftMint.publicKey as PublicKey).toBuffer()], 
    program.programId
  )[0];

  before(async () => {
    console.log("🚀 Setting up test environment...");
    
    // Airdrop SOL to maker and taker
    console.log("💰 Requesting airdrops...");
    const makerAirdrop = await connection.requestAirdrop(maker.publicKey, 7 * LAMPORTS_PER_SOL);
    const takerAirdrop = await connection.requestAirdrop(taker.publicKey, 7 * LAMPORTS_PER_SOL);
    const latestBlockhash = await connection.getLatestBlockhash();
    
    await connection.confirmTransaction({ signature: makerAirdrop, ...latestBlockhash });
    await connection.confirmTransaction({ signature: takerAirdrop, ...latestBlockhash });
    await sleep(2000);

    console.log("🎨 Creating Collection NFT...");
    // Mint Collection NFT
    await createNft(umi, {
      mint: collectionMint,
      name: "TurBin3 Collection",
      symbol: "TB3",
      uri: "https://arweave.net/collection-metadata",
      sellerFeeBasisPoints: percentAmount(5.5),
      collectionDetails: { __kind: 'V1', size: 100 }
    }).sendAndConfirm(umi);
    console.log(`✅ Collection NFT created: ${collectionMint.publicKey.toString()}`);

    console.log("🖼️ Creating NFT...");
    // Mint NFT into maker's ATA
    await createNft(umi, {
      mint: nftMint,
      name: "TurBin3 NFT #1",
      symbol: "TB3",
      uri: "https://arweave.net/nft-metadata",
      sellerFeeBasisPoints: percentAmount(5.5),
      collection: { verified: false, key: collectionMint.publicKey },
      tokenOwner: publicKey(maker.publicKey)
    }).sendAndConfirm(umi);
    console.log(`✅ NFT created: ${nftMint.publicKey.toString()}`);

    // Verify Collection
    console.log("✅ Verifying collection...");
    const collectionMetadata = findMetadataPda(umi, { mint: collectionMint.publicKey });
    const collectionMasterEdition = findMasterEditionPda(umi, { mint: collectionMint.publicKey });
    const nftMetadata = findMetadataPda(umi, { mint: nftMint.publicKey });
    
    await verifySizedCollectionItem(umi, {
      metadata: nftMetadata,
      collectionAuthority: creator,
      collectionMint: collectionMint.publicKey,
      collection: collectionMetadata,
      collectionMasterEditionAccount: collectionMasterEdition,
    }).sendAndConfirm(umi);
    console.log("✅ Collection verified!");

    // Get or create ATAs
    console.log("🏦 Setting up token accounts...");
    makerAta = (await getOrCreateAssociatedTokenAccount(
      connection,
      maker,
      new anchor.web3.PublicKey(nftMint.publicKey),
      maker.publicKey
    )).address;

    takerAta = (await getOrCreateAssociatedTokenAccount(
      connection,
      taker,
      new anchor.web3.PublicKey(nftMint.publicKey),
      taker.publicKey
    )).address;

    vault = await anchor.utils.token.associatedAddress({
      mint: new anchor.web3.PublicKey(nftMint.publicKey),
      owner: listing,
    });

    console.log("🎯 Test setup completed!");
    console.log(`  Marketplace: ${marketplace.toString()}`);
    console.log(`  NFT Mint: ${nftMint.publicKey.toString()}`);
    console.log(`  Maker: ${maker.publicKey.toString()}`);
    console.log(`  Taker: ${taker.publicKey.toString()}`);
  });

  it("🏪 Initialize Marketplace", async () => {
    console.log("🏗️ Initializing marketplace...");
    
    const tx = await program.methods
      .initialize(name, fee)
      .accountsPartial({
        admin: provider.wallet.publicKey,
        marketplace,
        rewardMint: rewardsMint,
        treasury,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    console.log("✅ Marketplace initialized!");
    console.log(`  Transaction: ${tx}`);
    console.log(`  Fee: ${fee} basis points (${fee/100}%)`);

    // Verify marketplace state
    const marketplaceData = await program.account.marketplace.fetch(marketplace);
    expect(marketplaceData.admin.toString()).to.equal(provider.wallet.publicKey.toString());
    expect(marketplaceData.fee).to.equal(fee);
    expect(marketplaceData.name).to.equal(name);
  });

  it("📝 List NFT for Sale", async () => {
    console.log("📋 Creating NFT listing...");
    
    const nftMetadata = findMetadataPda(umi, { mint: nftMint.publicKey });
    const nftEdition = findMasterEditionPda(umi, { mint: nftMint.publicKey });

    const tx = await program.methods
      .listing(price)
      .accountsPartial({
        maker: maker.publicKey,
        marketplace,
        makerMint: nftMint.publicKey,
        collectionMint: collectionMint.publicKey,
        makerAta,
        metadata: new anchor.web3.PublicKey(nftMetadata[0]),
        vault,
        masterEdition: new anchor.web3.PublicKey(nftEdition[0]),
        listing,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    console.log("✅ NFT listed for sale!");
    console.log(`  Transaction: ${tx}`);
    console.log(`  Price: ${price.toNumber() / LAMPORTS_PER_SOL} SOL`);

    // Verify listing state
    const listingData = await program.account.listing.fetch(listing);
    expect(listingData.maker.toString()).to.equal(maker.publicKey.toString());
    expect(listingData.price.toString()).to.equal(price.toString());

    // Verify NFT is in vault
    const vaultAccount = await connection.getTokenAccountBalance(vault);
    expect(vaultAccount.value.uiAmount).to.equal(1);
  });

  it("🛍️ Purchase NFT", async () => {
    console.log("💳 Purchasing NFT...");
    
    const initialMakerBalance = await connection.getBalance(maker.publicKey);
    const initialTreasuryBalance = await connection.getBalance(treasury);

    const tx = await program.methods
      .purchase()
      .accountsPartial({
        taker: taker.publicKey,
        maker: maker.publicKey,
        makerMint: nftMint.publicKey,
        marketplace,
        takerAta,
        vault,
        rewardsMint,
        listing,
        treasury,
        collectionMint: collectionMint.publicKey,
        metadata: new anchor.web3.PublicKey(findMetadataPda(umi, { mint: nftMint.publicKey })[0]),
        masterEdition: new anchor.web3.PublicKey(findMasterEditionPda(umi, { mint: nftMint.publicKey })[0]),
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();

    console.log("✅ NFT purchased successfully!");
    console.log(`  Transaction: ${tx}`);

    // Verify NFT is now with taker
    const takerTokenAccount = await connection.getTokenAccountBalance(takerAta);
    expect(takerTokenAccount.value.uiAmount).to.equal(1);

    // Verify payments
    const finalMakerBalance = await connection.getBalance(maker.publicKey);
    const finalTreasuryBalance = await connection.getBalance(treasury);
    
    const expectedFee = (price.toNumber() * fee) / 10000;
    const expectedMakerPayment = price.toNumber() - expectedFee;
    
    expect(finalMakerBalance - initialMakerBalance).to.be.approximately(expectedMakerPayment, 1000);
    expect(finalTreasuryBalance - initialTreasuryBalance).to.be.approximately(expectedFee, 1000);

    console.log(`  💰 Maker received: ${(finalMakerBalance - initialMakerBalance) / LAMPORTS_PER_SOL} SOL`);
    console.log(`  🏛️ Treasury received: ${(finalTreasuryBalance - initialTreasuryBalance) / LAMPORTS_PER_SOL} SOL`);

    // Verify listing is closed
    try {
      await program.account.listing.fetch(listing);
      expect.fail("Listing should be closed");
    } catch (error) {
      expect(error.message).to.include("Account does not exist");
    }
  });

  it("📊 Update Marketplace Fee", async () => {
    console.log("⚙️ Updating marketplace fee...");
    
    const newFee = 500; // 5%
    
    const tx = await program.methods
      .updateMarketplace(newFee)
      .accountsPartial({
        admin: provider.wallet.publicKey,
        marketplace,
      })
      .rpc();

    console.log("✅ Marketplace fee updated!");
    console.log(`  Transaction: ${tx}`);
    console.log(`  New fee: ${newFee} basis points (${newFee/100}%)`);

    // Verify fee update
    const marketplaceData = await program.account.marketplace.fetch(marketplace);
    expect(marketplaceData.fee).to.equal(newFee);
  });

  it("💸 Withdraw Treasury Fees", async () => {
    console.log("💰 Withdrawing treasury fees...");
    
    const treasuryBalance = await connection.getBalance(treasury);
    const withdrawAmount = Math.floor(treasuryBalance * 0.5); // Withdraw 50%
    const initialAdminBalance = await connection.getBalance(provider.wallet.publicKey);

    const tx = await program.methods
      .withdrawFees(new anchor.BN(withdrawAmount))
      .accountsPartial({
        admin: provider.wallet.publicKey,
        marketplace,
        treasury,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Fees withdrawn successfully!");
    console.log(`  Transaction: ${tx}`);
    console.log(`  Amount: ${withdrawAmount / LAMPORTS_PER_SOL} SOL`);

    // Verify withdrawal
    const finalTreasuryBalance = await connection.getBalance(treasury);
    const finalAdminBalance = await connection.getBalance(provider.wallet.publicKey);
    
    expect(treasuryBalance - finalTreasuryBalance).to.be.approximately(withdrawAmount, 1000);
    console.log(`  💰 Treasury balance reduced by: ${(treasuryBalance - finalTreasuryBalance) / LAMPORTS_PER_SOL} SOL`);
  });

  // Test delisting functionality with a new NFT
  it("❌ Delist NFT", async () => {
    console.log("🔄 Testing delisting functionality...");
    
    // Create a new NFT for delisting test
    const newNftMint = generateSigner(umi);
    
    await createNft(umi, {
      mint: newNftMint,
      name: "TurBin3 NFT #2",
      symbol: "TB3",
      uri: "https://arweave.net/nft-metadata-2",
      sellerFeeBasisPoints: percentAmount(5.5),
      collection: { verified: false, key: collectionMint.publicKey },
      tokenOwner: publicKey(maker.publicKey)
    }).sendAndConfirm(umi);

    // Verify collection for new NFT
    const newNftMetadata = findMetadataPda(umi, { mint: newNftMint.publicKey });
    const collectionMetadata = findMetadataPda(umi, { mint: collectionMint.publicKey });
    const collectionMasterEdition = findMasterEditionPda(umi, { mint: collectionMint.publicKey });
    
    await verifySizedCollectionItem(umi, {
      metadata: newNftMetadata,
      collectionAuthority: creator,
      collectionMint: collectionMint.publicKey,
      collection: collectionMetadata,
      collectionMasterEditionAccount: collectionMasterEdition,
    }).sendAndConfirm(umi);

    // Setup for new NFT
    const newMakerAta = (await getOrCreateAssociatedTokenAccount(
      connection,
      maker,
      new anchor.web3.PublicKey(newNftMint.publicKey),
      maker.publicKey
    )).address;

    const newListing = anchor.web3.PublicKey.findProgramAddressSync(
      [marketplace.toBuffer(), new anchor.web3.PublicKey(newNftMint.publicKey).toBuffer()], 
      program.programId
    )[0];

    const newVault = await anchor.utils.token.associatedAddress({
      mint: new anchor.web3.PublicKey(newNftMint.publicKey),
      owner: newListing,
    });

    // List the new NFT
    console.log("📋 Listing new NFT...");
    await program.methods
      .listing(price)
      .accountsPartial({
        maker: maker.publicKey,
        marketplace,
        makerMint: newNftMint.publicKey,
        collectionMint: collectionMint.publicKey,
        makerAta: newMakerAta,
        metadata: new anchor.web3.PublicKey(newNftMetadata[0]),
        vault: newVault,
        masterEdition: new anchor.web3.PublicKey(findMasterEditionPda(umi, { mint: newNftMint.publicKey })[0]),
        listing: newListing,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    // Now delist it
    console.log("❌ Delisting NFT...");
    const delistTx = await program.methods
      .delist()
      .accountsPartial({
        maker: maker.publicKey,
        marketplace,
        makerMint: newNftMint.publicKey,
        makerAta: newMakerAta,
        listing: newListing,
        vault: newVault,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    console.log("✅ NFT delisted successfully!");
    console.log(`  Transaction: ${delistTx}`);

    // Verify NFT is back with maker
    const makerTokenAccount = await connection.getTokenAccountBalance(newMakerAta);
    expect(makerTokenAccount.value.uiAmount).to.equal(1);

    // Verify listing is closed
    try {
      await program.account.listing.fetch(newListing);
      expect.fail("Listing should be closed");
    } catch (error) {
      expect(error.message).to.include("Account does not exist");
    }
  });

  it("🚫 Error Handling - Unauthorized delist", async () => {
    console.log("🧪 Testing unauthorized delist...");
    
    // Try to delist with wrong signer - this should fail
    // We'll create a new NFT and list it, then try to delist with taker instead of maker
    
    const unauthorizedNft = generateSigner(umi);
    
    await createNft(umi, {
      mint: unauthorizedNft,
      name: "TurBin3 NFT #3",
      symbol: "TB3", 
      uri: "https://arweave.net/nft-metadata-3",
      sellerFeeBasisPoints: percentAmount(5.5),
      collection: { verified: false, key: collectionMint.publicKey },
      tokenOwner: publicKey(maker.publicKey)
    }).sendAndConfirm(umi);

    // Verify collection
    const unauthorizedNftMetadata = findMetadataPda(umi, { mint: unauthorizedNft.publicKey });
    const collectionMetadata = findMetadataPda(umi, { mint: collectionMint.publicKey });
    const collectionMasterEdition = findMasterEditionPda(umi, { mint: collectionMint.publicKey });
    
    await verifySizedCollectionItem(umi, {
      metadata: unauthorizedNftMetadata,
      collectionAuthority: creator,
      collectionMint: collectionMint.publicKey,
      collection: collectionMetadata,
      collectionMasterEditionAccount: collectionMasterEdition,
    }).sendAndConfirm(umi);

    const unauthorizedMakerAta = (await getOrCreateAssociatedTokenAccount(
      connection,
      maker,
      new anchor.web3.PublicKey(unauthorizedNft.publicKey),
      maker.publicKey
    )).address;

    const unauthorizedListing = anchor.web3.PublicKey.findProgramAddressSync(
      [marketplace.toBuffer(), new anchor.web3.PublicKey(unauthorizedNft.publicKey).toBuffer()], 
      program.programId
    )[0];

    const unauthorizedVault = await anchor.utils.token.associatedAddress({
      mint: new anchor.web3.PublicKey(unauthorizedNft.publicKey),
      owner: unauthorizedListing,
    });

    // List the NFT
    await program.methods
      .listing(price)
      .accountsPartial({
        maker: maker.publicKey,
        marketplace,
        makerMint: unauthorizedNft.publicKey,
        collectionMint: collectionMint.publicKey,
        makerAta: unauthorizedMakerAta,
        metadata: new anchor.web3.PublicKey(unauthorizedNftMetadata[0]),
        vault: unauthorizedVault,
        masterEdition: new anchor.web3.PublicKey(findMasterEditionPda(umi, { mint: unauthorizedNft.publicKey })[0]),
        listing: unauthorizedListing,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    // Try to delist with wrong signer (should fail)
    try {
      await program.methods
        .delist()
        .accountsPartial({
          maker: taker.publicKey, // Wrong signer!
          marketplace,
          makerMint: unauthorizedNft.publicKey,
          makerAta: unauthorizedMakerAta,
          listing: unauthorizedListing,
          vault: unauthorizedVault,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([taker]) // Wrong signer!
        .rpc();
      
      expect.fail("Should have failed with unauthorized error");
    } catch (error) {
      console.log("✅ Correctly rejected unauthorized delist attempt");
      expect(error.message).to.include("Unauthorized");
    }
  });

  console.log("\n🎉 All marketplace tests completed successfully!");
});

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
