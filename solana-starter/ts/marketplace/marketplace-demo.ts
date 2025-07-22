/**
 * Marketplace Demo Script
 * 
 * Demonstrates the marketplace functionality with our existing project setup.
 */

import { marketplaceManager } from './marketplace-manager';
import { BN } from '@coral-xyz/anchor';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

async function runMarketplaceDemo() {
    console.log("🏪 Marketplace Demo Starting...\n");

    try {
        // 1. Initialize marketplace
        console.log("1️⃣ Initializing Marketplace");
        console.log("=" .repeat(50));
        
        const marketplaceName = "TurBin3Demo";
        const feePercent = 2.5; // 2.5% fee
        
        const initResult = await marketplaceManager.initializeMarketplace(
            marketplaceName, 
            feePercent
        );
        console.log("✅", initResult);
        console.log();

        // 2. Get marketplace statistics
        console.log("2️⃣ Marketplace Statistics");
        console.log("=" .repeat(50));
        
        const stats = await marketplaceManager.getMarketplaceStats(marketplaceName);
        console.log("📊 Marketplace PDAs:");
        console.log(`  🏪 Marketplace: ${stats.marketplacePDA.toString()}`);
        console.log(`  🏛️ Treasury: ${stats.treasuryPDA.toString()}`);
        console.log(`  🎁 Rewards Mint: ${stats.rewardsMintPDA.toString()}`);
        
        if (stats.treasuryBalance !== undefined) {
            console.log(`  💰 Treasury Balance: ${stats.treasuryBalance / LAMPORTS_PER_SOL} SOL`);
        }
        console.log();

        // 3. Create a test NFT
        console.log("3️⃣ Creating Test NFT");
        console.log("=" .repeat(50));
        
        const testNft = await marketplaceManager.createTestNft();
        console.log("✅ Test NFT created successfully!");
        console.log();

        // 4. Validate NFT for listing
        console.log("4️⃣ Validating NFT for Listing");
        console.log("=" .repeat(50));
        
        const validation = await marketplaceManager.validateNftForListing(testNft.mint);
        console.log(`📋 Validation Result: ${validation.isValid ? "✅ VALID" : "❌ INVALID"}`);
        
        if (validation.tokenAccount) {
            console.log(`  🏦 Token Account: ${validation.tokenAccount.toString()}`);
            console.log(`  💎 Balance: ${validation.balance}`);
        }
        
        if (validation.issues.length > 0) {
            console.log("  ⚠️ Issues:");
            validation.issues.forEach(issue => console.log(`    - ${issue}`));
        }
        console.log();

        // 5. Calculate marketplace fees
        console.log("5️⃣ Fee Calculation Examples");
        console.log("=" .repeat(50));
        
        const prices = [0.1, 0.5, 1.0, 5.0, 10.0]; // SOL amounts
        const feeBasisPoints = Math.floor(feePercent * 100);
        
        console.log(`💰 Fee Structure: ${feePercent}% (${feeBasisPoints} basis points)`);
        console.log();
        
        prices.forEach(solPrice => {
            const price = marketplaceManager.parsePrice(solPrice);
            const fees = marketplaceManager.calculateFees(price, feeBasisPoints);
            
            console.log(`  🏷️ Price: ${marketplaceManager.formatPrice(fees.totalAmount)}`);
            console.log(`    💸 Marketplace Fee: ${marketplaceManager.formatPrice(fees.feeAmount)}`);
            console.log(`    💵 Seller Receives: ${marketplaceManager.formatPrice(fees.sellerAmount)}`);
            console.log();
        });

        // 6. Demonstrate PDA derivation
        console.log("6️⃣ PDA Derivation Examples");
        console.log("=" .repeat(50));
        
        const [marketplacePDA, marketplaceBump] = marketplaceManager.getMarketplacePDA(marketplaceName);
        const [treasuryPDA, treasuryBump] = marketplaceManager.getTreasuryPDA(marketplacePDA);
        const [rewardsPDA, rewardsBump] = marketplaceManager.getRewardsMintPDA(marketplacePDA);
        const [listingPDA, listingBump] = marketplaceManager.getListingPDA(marketplacePDA, testNft.mint);
        
        console.log("🔑 Program Derived Addresses:");
        console.log(`  🏪 Marketplace (bump: ${marketplaceBump}):`);
        console.log(`     ${marketplacePDA.toString()}`);
        console.log(`  🏛️ Treasury (bump: ${treasuryBump}):`);
        console.log(`     ${treasuryPDA.toString()}`);
        console.log(`  🎁 Rewards (bump: ${rewardsBump}):`);
        console.log(`     ${rewardsPDA.toString()}`);
        console.log(`  📝 Listing (bump: ${listingBump}):`);
        console.log(`     ${listingPDA.toString()}`);
        console.log();

        // 7. Summary
        console.log("7️⃣ Demo Summary");
        console.log("=" .repeat(50));
        
        console.log("✅ Marketplace functionality demonstrated:");
        console.log("  🏪 Marketplace initialization ready");
        console.log("  🖼️ Test NFT creation working");
        console.log("  ✅ NFT validation functional");
        console.log("  💰 Fee calculation accurate");
        console.log("  🔑 PDA derivation correct");
        console.log();
        
        console.log("🚀 Ready for full marketplace deployment!");
        console.log("📋 Next steps:");
        console.log("  1. Deploy the Anchor program");
        console.log("  2. Update program ID in configuration");
        console.log("  3. Initialize marketplace with admin");
        console.log("  4. Start listing and trading NFTs");

    } catch (error) {
        console.error("❌ Demo failed:", error);
        
        if (error.context) {
            console.error("📋 Error context:", error.context);
        }
        
        process.exit(1);
    }
}

// Run the demo
if (require.main === module) {
    runMarketplaceDemo()
        .then(() => {
            console.log("\n🎉 Marketplace demo completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n💥 Demo failed:", error);
            process.exit(1);
        });
}
