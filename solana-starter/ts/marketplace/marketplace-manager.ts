/**
 * Marketplace Integration for Solana Starter
 * 
 * Integrates the marketplace functionality with the existing project structure.
 * Uses the configuration system and error handling from the main project.
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, createMint, mintTo } from "@solana/spl-token";
import { appConfig } from '../config';
import { handleError, ApplicationError, ErrorCategory } from '../utils/errorHandling';
import wallet from "../turbin3-wallet.json";

// Marketplace program ID (from deployed program)
const MARKETPLACE_PROGRAM_ID = new PublicKey("HYxi42pNZDn3dpnF8HPNeFurSLQSpcYWdvRSkfuqkkui");

export class MarketplaceManager {
    private connection: Connection;
    private provider: AnchorProvider;
    private keypair: Keypair;

    constructor() {
        try {
            this.connection = new Connection(appConfig.solana.rpcUrl, appConfig.solana.commitment);
            this.keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
            this.provider = new AnchorProvider(
                this.connection,
                new Wallet(this.keypair),
                { commitment: appConfig.solana.commitment }
            );
        } catch (error) {
            throw handleError(
                error,
                "Failed to initialize marketplace manager",
                ErrorCategory.INITIALIZATION
            );
        }
    }

    /**
     * Get marketplace PDA for a given name
     */
    getMarketplacePDA(name: string): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("marketplace"), Buffer.from(name)],
            MARKETPLACE_PROGRAM_ID
        );
    }

    /**
     * Get treasury PDA for a marketplace
     */
    getTreasuryPDA(marketplace: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("treasury"), marketplace.toBuffer()],
            MARKETPLACE_PROGRAM_ID
        );
    }

    /**
     * Get rewards mint PDA for a marketplace
     */
    getRewardsMintPDA(marketplace: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from("rewards"), marketplace.toBuffer()],
            MARKETPLACE_PROGRAM_ID
        );
    }

    /**
     * Get listing PDA for a marketplace and NFT mint
     */
    getListingPDA(marketplace: PublicKey, mint: PublicKey): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [marketplace.toBuffer(), mint.toBuffer()],
            MARKETPLACE_PROGRAM_ID
        );
    }

    /**
     * Initialize a new marketplace (admin only)
     */
    async initializeMarketplace(name: string, feePercent: number): Promise<string> {
        try {
            if (!name || name.length > 32) {
                throw new ApplicationError(
                    "Invalid marketplace name",
                    ErrorCategory.VALIDATION,
                    { name, maxLength: 32 }
                );
            }

            if (feePercent < 0 || feePercent > 100) {
                throw new ApplicationError(
                    "Invalid fee percentage",
                    ErrorCategory.VALIDATION,
                    { feePercent, validRange: "0-100%" }
                );
            }

            const feeBasisPoints = Math.floor(feePercent * 100); // Convert to basis points
            const [marketplace] = this.getMarketplacePDA(name);
            const [treasury] = this.getTreasuryPDA(marketplace);
            const [rewardMint] = this.getRewardsMintPDA(marketplace);

            console.log(`Initializing marketplace: ${name}`);
            console.log(`Fee: ${feePercent}% (${feeBasisPoints} basis points)`);
            console.log(`Marketplace PDA: ${marketplace.toString()}`);
            console.log(`Treasury PDA: ${treasury.toString()}`);
            console.log(`Rewards Mint PDA: ${rewardMint.toString()}`);

            // Note: This would require the actual program instance
            // For now, we'll return the PDAs for testing
            return `Marketplace ${name} ready for initialization`;

        } catch (error) {
            throw handleError(
                error,
                "Failed to initialize marketplace",
                ErrorCategory.BLOCKCHAIN_INTERACTION,
                { marketplaceName: name, feePercent }
            );
        }
    }

    /**
     * Create a test NFT for marketplace testing
     */
    async createTestNft(): Promise<{
        mint: PublicKey;
        tokenAccount: PublicKey;
        mintAuthority: Keypair;
    }> {
        try {
            console.log("Creating test NFT...");

            // Create a new mint authority
            const mintAuthority = Keypair.generate();

            // Airdrop SOL to mint authority for rent
            const airdropSignature = await this.connection.requestAirdrop(
                mintAuthority.publicKey,
                0.1 * LAMPORTS_PER_SOL
            );
            await this.connection.confirmTransaction(airdropSignature);

            // Create the mint with 0 decimals (NFT)
            const mint = await createMint(
                this.connection,
                mintAuthority,
                mintAuthority.publicKey,
                null,
                0 // 0 decimals for NFT
            );

            // Create token account for the NFT holder
            const tokenAccount = await getOrCreateAssociatedTokenAccount(
                this.connection,
                this.keypair,
                mint,
                this.keypair.publicKey
            );

            // Mint 1 NFT to the token account
            await mintTo(
                this.connection,
                mintAuthority,
                mint,
                tokenAccount.address,
                mintAuthority,
                1 // Mint 1 NFT
            );

            console.log(`Test NFT created:`);
            console.log(`  Mint: ${mint.toString()}`);
            console.log(`  Token Account: ${tokenAccount.address.toString()}`);
            console.log(`  Owner: ${this.keypair.publicKey.toString()}`);

            return {
                mint,
                tokenAccount: tokenAccount.address,
                mintAuthority
            };

        } catch (error) {
            throw handleError(
                error,
                "Failed to create test NFT",
                ErrorCategory.BLOCKCHAIN_INTERACTION
            );
        }
    }

    /**
     * Calculate marketplace fees
     */
    calculateFees(price: BN, feeBasisPoints: number): {
        feeAmount: BN;
        sellerAmount: BN;
        totalAmount: BN;
    } {
        try {
            const feeAmount = price.mul(new BN(feeBasisPoints)).div(new BN(10000));
            const sellerAmount = price.sub(feeAmount);

            return {
                feeAmount,
                sellerAmount,
                totalAmount: price
            };
        } catch (error) {
            throw handleError(
                error,
                "Failed to calculate marketplace fees",
                ErrorCategory.CALCULATION,
                { price: price.toString(), feeBasisPoints }
            );
        }
    }

    /**
     * Get marketplace statistics
     */
    async getMarketplaceStats(marketplaceName: string): Promise<{
        marketplacePDA: PublicKey;
        treasuryPDA: PublicKey;
        rewardsMintPDA: PublicKey;
        treasuryBalance?: number;
        activeListings?: number;
    }> {
        try {
            const [marketplace] = this.getMarketplacePDA(marketplaceName);
            const [treasury] = this.getTreasuryPDA(marketplace);
            const [rewardsMint] = this.getRewardsMintPDA(marketplace);

            // Get treasury balance
            let treasuryBalance: number | undefined;
            try {
                treasuryBalance = await this.connection.getBalance(treasury);
            } catch {
                treasuryBalance = undefined;
            }

            return {
                marketplacePDA: marketplace,
                treasuryPDA: treasury,
                rewardsMintPDA: rewardsMint,
                treasuryBalance,
                activeListings: 0 // Would need program instance to fetch
            };

        } catch (error) {
            throw handleError(
                error,
                "Failed to get marketplace statistics",
                ErrorCategory.BLOCKCHAIN_INTERACTION,
                { marketplaceName }
            );
        }
    }

    /**
     * Validate NFT for marketplace listing
     */
    async validateNftForListing(mintAddress: PublicKey): Promise<{
        isValid: boolean;
        tokenAccount?: PublicKey;
        balance?: number;
        issues: string[];
    }> {
        const issues: string[] = [];

        try {
            // Check if token account exists
            const tokenAccount = await getOrCreateAssociatedTokenAccount(
                this.connection,
                this.keypair,
                mintAddress,
                this.keypair.publicKey,
                false // Don't create if it doesn't exist
            );

            // Check balance
            const balance = Number(tokenAccount.amount);
            if (balance === 0) {
                issues.push("No tokens in account");
            } else if (balance > 1) {
                issues.push("Token appears to be fungible (balance > 1)");
            }

            // Check mint info for NFT characteristics
            const mintInfo = await this.connection.getParsedAccountInfo(mintAddress);
            if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
                const parsedData = mintInfo.value.data.parsed.info;
                if (parsedData.decimals !== 0) {
                    issues.push("Mint has decimals (not an NFT)");
                }
                if (parsedData.supply !== "1") {
                    issues.push("Supply is not 1 (not a unique NFT)");
                }
            }

            return {
                isValid: issues.length === 0,
                tokenAccount: tokenAccount.address,
                balance,
                issues
            };

        } catch (error) {
            issues.push("Failed to validate NFT: " + error.message);
            return {
                isValid: false,
                issues
            };
        }
    }

    /**
     * Format price for display
     */
    formatPrice(lamports: BN): string {
        const sol = lamports.toNumber() / LAMPORTS_PER_SOL;
        return `${sol.toFixed(4)} SOL`;
    }

    /**
     * Parse price from SOL amount
     */
    parsePrice(solAmount: number): BN {
        return new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));
    }
}

// Export a singleton instance
export const marketplaceManager = new MarketplaceManager();
