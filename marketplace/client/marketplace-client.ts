/**
 * Marketplace Client SDK
 * 
 * Provides a convenient interface for interacting with the marketplace program.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { findMetadataPda, findMasterEditionPda } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import { Marketplace } from "../target/types/marketplace";

export interface MarketplaceConfig {
  connection: Connection;
  wallet: Wallet;
  programId: PublicKey;
}

export interface ListingData {
  maker: PublicKey;
  makerMint: PublicKey;
  price: anchor.BN;
  bump: number;
}

export interface MarketplaceData {
  admin: PublicKey;
  fee: number;
  bump: number;
  treasuryBump: number;
  rewardsBump: number;
  name: string;
}

export class MarketplaceClient {
  private provider: AnchorProvider;
  private program: Program<Marketplace>;
  private umi: any;

  constructor(config: MarketplaceConfig) {
    this.provider = new AnchorProvider(config.connection, config.wallet, {
      commitment: "confirmed",
    });
    
    this.program = new Program(
      require("../target/idl/marketplace.json"),
      config.programId,
      this.provider
    );

    this.umi = createUmi(config.connection);
  }

  /**
   * Get the marketplace PDA for a given name
   */
  getMarketplacePDA(name: string): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("marketplace"), Buffer.from(name)],
      this.program.programId
    );
  }

  /**
   * Get the treasury PDA for a marketplace
   */
  getTreasuryPDA(marketplace: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), marketplace.toBuffer()],
      this.program.programId
    );
  }

  /**
   * Get the rewards mint PDA for a marketplace
   */
  getRewardsMintPDA(marketplace: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("rewards"), marketplace.toBuffer()],
      this.program.programId
    );
  }

  /**
   * Get the listing PDA for a marketplace and NFT mint
   */
  getListingPDA(marketplace: PublicKey, mint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [marketplace.toBuffer(), mint.toBuffer()],
      this.program.programId
    );
  }

  /**
   * Initialize a new marketplace
   */
  async initializeMarketplace(
    admin: Keypair,
    name: string,
    fee: number
  ): Promise<string> {
    const [marketplace] = this.getMarketplacePDA(name);
    const [treasury] = this.getTreasuryPDA(marketplace);
    const [rewardMint] = this.getRewardsMintPDA(marketplace);

    return await this.program.methods
      .initialize(name, fee)
      .accountsPartial({
        admin: admin.publicKey,
        marketplace,
        treasury,
        rewardMint,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();
  }

  /**
   * List an NFT for sale
   */
  async listNft(
    maker: Keypair,
    marketplaceName: string,
    nftMint: PublicKey,
    collectionMint: PublicKey,
    price: anchor.BN
  ): Promise<string> {
    const [marketplace] = this.getMarketplacePDA(marketplaceName);
    const [listing] = this.getListingPDA(marketplace, nftMint);
    
    const makerAta = await getAssociatedTokenAddress(nftMint, maker.publicKey);
    const vault = await getAssociatedTokenAddress(nftMint, listing, true);

    // Get metadata and master edition PDAs
    const umi = this.umi;
    const nftMetadata = findMetadataPda(umi, { mint: publicKey(nftMint) });
    const masterEdition = findMasterEditionPda(umi, { mint: publicKey(nftMint) });

    return await this.program.methods
      .listing(price)
      .accountsPartial({
        maker: maker.publicKey,
        marketplace,
        makerMint: nftMint,
        makerAta,
        vault,
        listing,
        collectionMint,
        metadata: new PublicKey(nftMetadata[0]),
        masterEdition: new PublicKey(masterEdition[0]),
        metadataProgram: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();
  }

  /**
   * Purchase a listed NFT
   */
  async purchaseNft(
    taker: Keypair,
    marketplaceName: string,
    nftMint: PublicKey,
    collectionMint: PublicKey,
    maker: PublicKey
  ): Promise<string> {
    const [marketplace] = this.getMarketplacePDA(marketplaceName);
    const [listing] = this.getListingPDA(marketplace, nftMint);
    const [treasury] = this.getTreasuryPDA(marketplace);
    const [rewardsMint] = this.getRewardsMintPDA(marketplace);
    
    const takerAta = await getAssociatedTokenAddress(nftMint, taker.publicKey);
    const takerAtaReward = await getAssociatedTokenAddress(rewardsMint, taker.publicKey);
    const vault = await getAssociatedTokenAddress(nftMint, listing, true);

    // Get metadata and master edition PDAs
    const umi = this.umi;
    const nftMetadata = findMetadataPda(umi, { mint: publicKey(nftMint) });
    const masterEdition = findMasterEditionPda(umi, { mint: publicKey(nftMint) });

    return await this.program.methods
      .purchase()
      .accountsPartial({
        taker: taker.publicKey,
        maker,
        marketplace,
        makerMint: nftMint,
        takerAta,
        takerAtaReward,
        listing,
        vault,
        treasury,
        rewardsMint,
        collectionMint,
        metadata: new PublicKey(nftMetadata[0]),
        masterEdition: new PublicKey(masterEdition[0]),
        metadataProgram: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();
  }

  /**
   * Delist an NFT
   */
  async delistNft(
    maker: Keypair,
    marketplaceName: string,
    nftMint: PublicKey
  ): Promise<string> {
    const [marketplace] = this.getMarketplacePDA(marketplaceName);
    const [listing] = this.getListingPDA(marketplace, nftMint);
    
    const makerAta = await getAssociatedTokenAddress(nftMint, maker.publicKey);
    const vault = await getAssociatedTokenAddress(nftMint, listing, true);

    return await this.program.methods
      .delist()
      .accountsPartial({
        maker: maker.publicKey,
        marketplace,
        makerMint: nftMint,
        makerAta,
        vault,
        listing,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();
  }

  /**
   * Update marketplace configuration
   */
  async updateMarketplace(
    admin: Keypair,
    marketplaceName: string,
    newFee?: number
  ): Promise<string> {
    const [marketplace] = this.getMarketplacePDA(marketplaceName);

    return await this.program.methods
      .updateMarketplace(newFee || null)
      .accountsPartial({
        admin: admin.publicKey,
        marketplace,
      })
      .signers([admin])
      .rpc();
  }

  /**
   * Withdraw fees from treasury
   */
  async withdrawFees(
    admin: Keypair,
    marketplaceName: string,
    amount: anchor.BN
  ): Promise<string> {
    const [marketplace] = this.getMarketplacePDA(marketplaceName);
    const [treasury] = this.getTreasuryPDA(marketplace);

    return await this.program.methods
      .withdrawFees(amount)
      .accountsPartial({
        admin: admin.publicKey,
        marketplace,
        treasury,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
  }

  /**
   * Get marketplace data
   */
  async getMarketplace(name: string): Promise<MarketplaceData> {
    const [marketplace] = this.getMarketplacePDA(name);
    return await this.program.account.marketplace.fetch(marketplace);
  }

  /**
   * Get listing data
   */
  async getListing(marketplaceName: string, nftMint: PublicKey): Promise<ListingData> {
    const [marketplace] = this.getMarketplacePDA(marketplaceName);
    const [listing] = this.getListingPDA(marketplace, nftMint);
    return await this.program.account.listing.fetch(listing);
  }

  /**
   * Get all listings for a marketplace
   */
  async getAllListings(marketplaceName: string): Promise<Array<{ pubkey: PublicKey; data: ListingData }>> {
    const [marketplace] = this.getMarketplacePDA(marketplaceName);
    
    return await this.program.account.listing.all([
      {
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: marketplace.toBase58(),
        },
      },
    ]);
  }

  /**
   * Get treasury balance
   */
  async getTreasuryBalance(marketplaceName: string): Promise<number> {
    const [marketplace] = this.getMarketplacePDA(marketplaceName);
    const [treasury] = this.getTreasuryPDA(marketplace);
    return await this.provider.connection.getBalance(treasury);
  }
}
