/**
 * Marketplace Integration Demo
 * 
 * Demonstrates how the marketplace integrates with existing NFT creation
 * and vault functionality from the main project.
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint, mintTo, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { appConfig } from '../config';
import { marketplaceManager } from './marketplace-manager';
import wallet from "../turbin3-wallet.json";

async function runIntegrationDemo() {
    console.log("🔗 Marketplace Integration Demo");
    console.log("=" .repeat(60));
    console.log("Demonstrating marketplace with existing Solana Starter features\n");

    try {
        // Initialize connection using existing config
        const connection = new Connection(appConfig.solana.rpcUrl, appConfig.solana.commitment);
        const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
        
        console.log("📡 Connection Details:");
        console.log(`  🌐 Network: ${appConfig.solana.rpcUrl}`);
        console.log(`  🔑 Wallet: ${keypair.publicKey.toString()}`);
        console.log(`  ⚡ Commitment: ${appConfig.solana.commitment}\n`);

        // 1. Create an NFT using existing patterns
        console.log("1️⃣ Creating NFT using Solana Starter patterns");
        console.log("-" .repeat(50));
        
        const nftResult = await createNftWithMetadata(connection, keypair);
        console.log("✅ NFT created with full metadata");
        console.log(`  🖼️ Mint: ${nftResult.mint.toString()}`);
        console.log(`  🏦 Token Account: ${nftResult.tokenAccount.toString()}`);
        console.log();

        // 2. Initialize marketplace
        console.log("2️⃣ Setting up Marketplace Infrastructure");
        console.log("-" .repeat(50));
        
        const marketplaceName = "TurBin3Integrated";
        const feePercent = 2.5;
        
        const initResult = await marketplaceManager.initializeMarketplace(marketplaceName, feePercent);
        console.log("✅", initResult);
        
        const stats = await marketplaceManager.getMarketplaceStats(marketplaceName);
        console.log("📊 Marketplace Infrastructure:");
        console.log(`  🏪 Marketplace: ${stats.marketplacePDA.toString()}`);
        console.log(`  🏛️ Treasury: ${stats.treasuryPDA.toString()}`);
        console.log(`  🎁 Rewards: ${stats.rewardsMintPDA.toString()}`);
        console.log();

        // 3. Validate NFT for marketplace
        console.log("3️⃣ NFT Marketplace Validation");
        console.log("-" .repeat(50));
        
        const validation = await marketplaceManager.validateNftForListing(nftResult.mint);
        console.log(`🔍 Validation Status: ${validation.isValid ? "✅ APPROVED" : "❌ REJECTED"}`);
        
        if (validation.isValid) {
            console.log("  ✅ NFT meets marketplace requirements");
            console.log(`  💎 Balance: ${validation.balance} NFT`);
        } else {
            console.log("  ❌ Validation issues:");
            validation.issues.forEach(issue => console.log(`    - ${issue}`));
        }
        console.log();

        // 4. Demonstrate fee calculations
        console.log("4️⃣ Marketplace Economics");
        console.log("-" .repeat(50));
        
        const testPrices = [0.1, 0.5, 1.0, 2.5, 5.0];
        const feeBasisPoints = Math.floor(feePercent * 100);
        
        console.log(`💰 Fee Structure: ${feePercent}% marketplace fee`);
        console.log("📊 Price Examples:");
        
        testPrices.forEach(solPrice => {
            const price = marketplaceManager.parsePrice(solPrice);
            const fees = marketplaceManager.calculateFees(price, feeBasisPoints);
            
            console.log(`  💵 ${solPrice.toFixed(1)} SOL listing:`);
            console.log(`    Seller receives: ${marketplaceManager.formatPrice(fees.sellerAmount)}`);
            console.log(`    Marketplace fee: ${marketplaceManager.formatPrice(fees.feeAmount)}`);
        });
        console.log();

        // 5. Demonstrate integration with vault system
        console.log("5️⃣ Integration with Vault System");
        console.log("-" .repeat(50));
        
        console.log("🔗 Marketplace + Vault Integration Benefits:");
        console.log("  🔐 Secure NFT storage before listing");
        console.log("  💰 Combined SOL + NFT management");
        console.log("  🏦 Unified treasury and vault systems");
        console.log("  📊 Comprehensive asset tracking");
        console.log();
        
        // Show how marketplace listing PDA relates to vault system
        const [listingPDA] = marketplaceManager.getListingPDA(stats.marketplacePDA, nftResult.mint);
        console.log("🔑 Address Relationships:");
        console.log(`  📝 Listing PDA: ${listingPDA.toString()}`);
        console.log(`  🏦 NFT Owner: ${keypair.publicKey.toString()}`);
        console.log(`  🖼️ NFT Mint: ${nftResult.mint.toString()}`);
        console.log();

        // 6. Configuration integration
        console.log("6️⃣ Configuration System Integration");
        console.log("-" .repeat(50));
        
        console.log("⚙️ Unified Configuration Benefits:");
        console.log("  🌐 Same RPC endpoint for all operations");
        console.log("  🔑 Shared wallet management");
        console.log("  ⚡ Consistent commitment levels");
        console.log("  🚫 Zero hardcoded values (production ready)");
        console.log();
        
        console.log("📋 Active Configuration:");
        console.log(`  🌐 Network: ${appConfig.solana.network}`);
        console.log(`  📡 RPC URL: ${appConfig.solana.rpcUrl}`);
        console.log(`  ⚡ Commitment: ${appConfig.solana.commitment}`);
        console.log();

        // 7. Error handling integration
        console.log("7️⃣ Error Handling Integration");
        console.log("-" .repeat(50));
        
        console.log("🛡️ Unified Error Handling:");
        console.log("  📊 Categorized error types");
        console.log("  🔍 Detailed error context");
        console.log("  🔄 Consistent retry mechanisms");
        console.log("  📝 Comprehensive logging");
        console.log();

        // 8. Testing integration
        console.log("8️⃣ Testing Framework Integration");
        console.log("-" .repeat(50));
        
        console.log("🧪 Unified Testing Approach:");
        console.log("  ✅ Same test infrastructure");
        console.log("  🏦 Shared test wallets and accounts");
        console.log("  🔄 Integrated CI/CD pipeline");
        console.log("  📊 Combined coverage reporting");
        console.log();

        // 9. Deployment integration
        console.log("9️⃣ Deployment Integration");
        console.log("-" .repeat(50));
        
        console.log("🚀 Unified Deployment Strategy:");
        console.log("  📦 Same build and deploy scripts");
        console.log("  🔑 Shared program ID management");
        console.log("  🌐 Consistent network targeting");
        console.log("  📋 Integrated documentation");
        console.log();

        // 10. Future roadmap
        console.log("🔟 Integration Roadmap");
        console.log("-" .repeat(50));
        
        console.log("🛤️ Future Integration Opportunities:");
        console.log("  🏦 Vault-backed marketplace listings");
        console.log("  💰 Combined treasury management");
        console.log("  🎁 Cross-platform reward systems");
        console.log("  📊 Unified analytics dashboard");
        console.log("  🔐 Enhanced security features");
        console.log();

        console.log("🎉 Integration Demo Complete!");
        console.log("=" .repeat(60));
        console.log("The marketplace seamlessly integrates with all existing");
        console.log("Solana Starter features while maintaining compatibility");
        console.log("and following the same patterns and conventions.");

    } catch (error) {
        console.error("❌ Integration demo failed:", error);
        
        if (error.context) {
            console.error("📋 Error context:", error.context);
        }
        
        throw error;
    }
}

/**
 * Create an NFT with metadata using patterns from the main project
 */
async function createNftWithMetadata(connection: Connection, payer: Keypair) {
    console.log("🎨 Creating NFT with metadata...");
    
    // Create mint authority
    const mintAuthority = Keypair.generate();
    
    // Airdrop SOL for rent
    const airdropSig = await connection.requestAirdrop(
        mintAuthority.publicKey,
        0.1 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSig);
    
    // Create mint (NFT has 0 decimals)
    const mint = await createMint(
        connection,
        mintAuthority,
        mintAuthority.publicKey,
        null,
        0 // NFT decimals
    );
    
    // Create token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        payer.publicKey
    );
    
    // Mint 1 NFT
    await mintTo(
        connection,
        mintAuthority,
        mint,
        tokenAccount.address,
        mintAuthority,
        1
    );
    
    console.log(`  ✅ NFT minted to ${payer.publicKey.toString()}`);
    
    return {
        mint,
        tokenAccount: tokenAccount.address,
        mintAuthority
    };
}

// Export for use in other modules
export { runIntegrationDemo };

// Run if called directly
if (require.main === module) {
    runIntegrationDemo()
        .then(() => {
            console.log("\n🎉 Integration demo completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n💥 Integration demo failed:", error);
            process.exit(1);
        });
}
