/**
 * Marketplace CLI Interface
 * 
 * Command-line interface for interacting with the marketplace.
 */

import { Command } from 'commander';
import { marketplaceManager } from './marketplace-manager';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

const program = new Command();

program
    .name('marketplace-cli')
    .description('CLI for Turbin3 NFT Marketplace')
    .version('1.0.0');

// Initialize marketplace command
program
    .command('init')
    .description('Initialize a new marketplace')
    .requiredOption('-n, --name <name>', 'Marketplace name')
    .requiredOption('-f, --fee <fee>', 'Fee percentage (0-100)')
    .action(async (options) => {
        try {
            const fee = parseFloat(options.fee);
            if (isNaN(fee) || fee < 0 || fee > 100) {
                throw new Error('Fee must be a number between 0 and 100');
            }

            console.log(`🏪 Initializing marketplace: ${options.name}`);
            const result = await marketplaceManager.initializeMarketplace(options.name, fee);
            console.log('✅', result);
        } catch (error) {
            console.error('❌ Failed to initialize marketplace:', error.message);
            process.exit(1);
        }
    });

// Get marketplace stats command
program
    .command('stats')
    .description('Get marketplace statistics')
    .requiredOption('-n, --name <name>', 'Marketplace name')
    .action(async (options) => {
        try {
            console.log(`📊 Getting stats for marketplace: ${options.name}`);
            const stats = await marketplaceManager.getMarketplaceStats(options.name);
            
            console.log('\n📋 Marketplace Information:');
            console.log(`  🏪 Marketplace PDA: ${stats.marketplacePDA.toString()}`);
            console.log(`  🏛️ Treasury PDA: ${stats.treasuryPDA.toString()}`);
            console.log(`  🎁 Rewards Mint PDA: ${stats.rewardsMintPDA.toString()}`);
            
            if (stats.treasuryBalance !== undefined) {
                console.log(`  💰 Treasury Balance: ${stats.treasuryBalance / 1e9} SOL`);
            }
            
            console.log(`  📝 Active Listings: ${stats.activeListings || 0}`);
        } catch (error) {
            console.error('❌ Failed to get marketplace stats:', error.message);
            process.exit(1);
        }
    });

// Create test NFT command
program
    .command('create-nft')
    .description('Create a test NFT for marketplace testing')
    .action(async () => {
        try {
            console.log('🖼️ Creating test NFT...');
            const nft = await marketplaceManager.createTestNft();
            
            console.log('\n✅ Test NFT created:');
            console.log(`  🖼️ Mint Address: ${nft.mint.toString()}`);
            console.log(`  🏦 Token Account: ${nft.tokenAccount.toString()}`);
            console.log(`  🔑 Mint Authority: ${nft.mintAuthority.publicKey.toString()}`);
        } catch (error) {
            console.error('❌ Failed to create test NFT:', error.message);
            process.exit(1);
        }
    });

// Validate NFT command
program
    .command('validate-nft')
    .description('Validate an NFT for marketplace listing')
    .requiredOption('-m, --mint <mint>', 'NFT mint address')
    .action(async (options) => {
        try {
            const mintAddress = new PublicKey(options.mint);
            console.log(`🔍 Validating NFT: ${mintAddress.toString()}`);
            
            const validation = await marketplaceManager.validateNftForListing(mintAddress);
            
            console.log(`\n📋 Validation Result: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}`);
            
            if (validation.tokenAccount) {
                console.log(`  🏦 Token Account: ${validation.tokenAccount.toString()}`);
                console.log(`  💎 Balance: ${validation.balance}`);
            }
            
            if (validation.issues.length > 0) {
                console.log('\n⚠️ Issues found:');
                validation.issues.forEach(issue => console.log(`  - ${issue}`));
            }
        } catch (error) {
            console.error('❌ Failed to validate NFT:', error.message);
            process.exit(1);
        }
    });

// Calculate fees command
program
    .command('calc-fees')
    .description('Calculate marketplace fees for a given price')
    .requiredOption('-p, --price <price>', 'Price in SOL')
    .requiredOption('-f, --fee <fee>', 'Fee percentage (0-100)')
    .action(async (options) => {
        try {
            const priceInSol = parseFloat(options.price);
            const feePercent = parseFloat(options.fee);
            
            if (isNaN(priceInSol) || priceInSol <= 0) {
                throw new Error('Price must be a positive number');
            }
            
            if (isNaN(feePercent) || feePercent < 0 || feePercent > 100) {
                throw new Error('Fee must be a number between 0 and 100');
            }
            
            const price = marketplaceManager.parsePrice(priceInSol);
            const feeBasisPoints = Math.floor(feePercent * 100);
            const fees = marketplaceManager.calculateFees(price, feeBasisPoints);
            
            console.log(`\n💰 Fee Calculation for ${priceInSol} SOL:`);
            console.log(`  🏷️ Total Price: ${marketplaceManager.formatPrice(fees.totalAmount)}`);
            console.log(`  💸 Marketplace Fee (${feePercent}%): ${marketplaceManager.formatPrice(fees.feeAmount)}`);
            console.log(`  💵 Seller Receives: ${marketplaceManager.formatPrice(fees.sellerAmount)}`);
        } catch (error) {
            console.error('❌ Failed to calculate fees:', error.message);
            process.exit(1);
        }
    });

// Get PDA command
program
    .command('get-pda')
    .description('Get Program Derived Addresses for marketplace')
    .requiredOption('-n, --name <name>', 'Marketplace name')
    .option('-m, --mint <mint>', 'NFT mint address for listing PDA')
    .action(async (options) => {
        try {
            const [marketplacePDA, marketplaceBump] = marketplaceManager.getMarketplacePDA(options.name);
            const [treasuryPDA, treasuryBump] = marketplaceManager.getTreasuryPDA(marketplacePDA);
            const [rewardsPDA, rewardsBump] = marketplaceManager.getRewardsMintPDA(marketplacePDA);
            
            console.log(`\n🔑 PDAs for marketplace: ${options.name}`);
            console.log(`  🏪 Marketplace (bump: ${marketplaceBump}):`);
            console.log(`     ${marketplacePDA.toString()}`);
            console.log(`  🏛️ Treasury (bump: ${treasuryBump}):`);
            console.log(`     ${treasuryPDA.toString()}`);
            console.log(`  🎁 Rewards Mint (bump: ${rewardsBump}):`);
            console.log(`     ${rewardsPDA.toString()}`);
            
            if (options.mint) {
                const mintAddress = new PublicKey(options.mint);
                const [listingPDA, listingBump] = marketplaceManager.getListingPDA(marketplacePDA, mintAddress);
                console.log(`  📝 Listing (bump: ${listingBump}):`);
                console.log(`     ${listingPDA.toString()}`);
            }
        } catch (error) {
            console.error('❌ Failed to get PDAs:', error.message);
            process.exit(1);
        }
    });

// Demo command
program
    .command('demo')
    .description('Run marketplace demonstration')
    .action(async () => {
        try {
            // Import and run the demo
            const { runMarketplaceDemo } = await import('./marketplace-demo');
            await runMarketplaceDemo();
        } catch (error) {
            console.error('❌ Demo failed:', error.message);
            process.exit(1);
        }
    });

// Parse command line arguments
program.parse();

export { program };
