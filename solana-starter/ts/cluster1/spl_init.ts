/**
 * SPL Token Initialization Script
 * Creates a new SPL token mint with proper configuration management
 */

import { Keypair } from "@solana/web3.js";
import { createMint } from '@solana/spl-token';
import { appConfig } from '../config';
import { 
  createConnection, 
  loadWallet, 
  logTransaction, 
  logAccount, 
  displayNetworkInfo 
} from '../utils/solana';
import { withErrorHandling, SolanaError, ErrorType } from '../utils/errors';

/**
 * Initialize a new SPL token with configurable parameters
 */
async function initializeSPLToken(): Promise<void> {
  console.log("=== SPL Token Initialization ===\n");
  
  displayNetworkInfo();
  
  await withErrorHandling(async () => {
    // Load wallet and create connection using configuration
    const keypair = loadWallet();
    const connection = createConnection();
    
    console.log(`\n👤 Wallet: ${keypair.publicKey.toBase58()}`);
    
    // Create a new mint with configurable parameters
    const mint = await createMint(
      connection,
      keypair,              // Payer
      keypair.publicKey,    // Mint authority
      keypair.publicKey,    // Freeze authority (optional)
      6                     // Decimals - could be configurable
    );
    
    // Log the successful creation
    logAccount(mint.toBase58(), "New SPL Token Mint Created");
    
    console.log(`\n✅ SPL Token successfully created!`);
    console.log(`   Mint Address: ${mint.toBase58()}`);
    console.log(`   Decimals: 6`);
    console.log(`   Mint Authority: ${keypair.publicKey.toBase58()}`);
    console.log(`   Freeze Authority: ${keypair.publicKey.toBase58()}`);
    
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Add metadata: npm run spl_metadata`);
    console.log(`   2. Mint tokens: npm run spl_mint`);
    console.log(`   3. Transfer tokens: npm run spl_transfer`);
    
  }, { operation: 'SPL token initialization' });
}

// Execute the script
if (require.main === module) {
  initializeSPLToken()
    .then(() => process.exit(0))
    .catch((error) => {
      if (error instanceof SolanaError) {
        console.error(`❌ ${error.type}: ${error.message}`);
        if (error.context) {
          console.error('Context:', error.context);
        }
      } else {
        console.error('❌ Unexpected error:', error);
      }
      process.exit(1);
    });
}
