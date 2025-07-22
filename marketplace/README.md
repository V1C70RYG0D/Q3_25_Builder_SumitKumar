# 🏪 Turbin3 NFT Marketplace

A decentralized NFT marketplace built on Solana using the Anchor framework. This marketplace enables users to list, buy, and sell NFTs with automatic fee distribution and reward tokens for buyers.

## 🌟 Features

### Core Functionality
- **🏪 Marketplace Management**: Create and configure marketplaces with custom fees
- **📝 NFT Listings**: List NFTs for sale with automatic escrow
- **💰 Secure Transactions**: Automated SOL payments with fee distribution
- **🎁 Reward System**: Buyers receive marketplace reward tokens
- **❌ Listing Management**: Sellers can delist NFTs anytime
- **🔐 Collection Verification**: Only verified collection NFTs accepted

### Security & Reliability
- **🔑 PDA-Based Security**: All accounts use Program Derived Addresses
- **✅ Comprehensive Validation**: NFT collection and metadata verification
- **🛡️ Access Control**: Owner-only operations with proper authorization
- **📊 Error Handling**: Detailed error messages and proper rollback
- **🧪 Full Test Coverage**: Comprehensive test suite included

### Developer Experience
- **🛠️ Easy Integration**: SDK and CLI tools provided
- **📋 TypeScript Support**: Full type safety and IntelliSense
- **🔧 Configuration System**: Environment-based configuration
- **📖 Documentation**: Complete guides and examples

## 🏗️ Architecture

### Program Structure
```
marketplace/
├── programs/marketplace/src/
│   ├── lib.rs                 # Program entry point
│   ├── state/
│   │   ├── marketplace.rs     # Marketplace account structure
│   │   └── listing.rs         # Listing account structure
│   ├── context/
│   │   ├── initialize.rs      # Initialize marketplace
│   │   ├── list.rs           # List NFT for sale
│   │   ├── delist.rs         # Remove NFT listing
│   │   ├── purchase.rs       # Purchase NFT
│   │   ├── update_marketplace.rs # Update marketplace config
│   │   └── withdraw_fees.rs  # Withdraw treasury fees
│   └── error.rs              # Custom error definitions
```

### Account Relationships
```
Marketplace PDA
├── Treasury PDA (collects fees)
├── Rewards Mint PDA (mints reward tokens)
└── Listing PDAs (one per NFT)
    └── Vault ATA (holds escrowed NFT)
```

### PDA Seeds
- **Marketplace**: `["marketplace", name]`
- **Treasury**: `["treasury", marketplace_key]`  
- **Rewards Mint**: `["rewards", marketplace_key]`
- **Listing**: `[marketplace_key, nft_mint_key]`

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Clone and setup
cd marketplace
npm install

# Configure wallet
cp ../solana-starter/ts/turbin3-wallet.json ./marketplace-wallet.json
```

### 2. Build and Deploy

```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### 3. Initialize Marketplace

```bash
# Using CLI
npm run marketplace_cli init --name "MyMarketplace" --fee 2.5

# Or using demo
npm run marketplace_demo
```

### 4. Interact with Marketplace

```bash
# Create test NFT
npm run marketplace_cli create-nft

# Get marketplace stats
npm run marketplace_cli stats --name "MyMarketplace"

# Calculate fees
npm run marketplace_cli calc-fees --price 1.0 --fee 2.5
```

## 📋 Available Commands

### Marketplace Management
```bash
# Initialize marketplace
npm run marketplace_cli init --name <name> --fee <percentage>

# Get marketplace statistics
npm run marketplace_cli stats --name <name>

# Update marketplace fee (admin only)
npm run marketplace_cli update --name <name> --fee <new-percentage>
```

### NFT Operations
```bash
# Create test NFT
npm run marketplace_cli create-nft

# Validate NFT for listing
npm run marketplace_cli validate-nft --mint <mint-address>

# List NFT (requires program interaction)
# Purchase NFT (requires program interaction)
# Delist NFT (requires program interaction)
```

### Utilities
```bash
# Calculate marketplace fees
npm run marketplace_cli calc-fees --price <sol-amount> --fee <percentage>

# Get Program Derived Addresses
npm run marketplace_cli get-pda --name <name> [--mint <mint-address>]

# Run comprehensive demo
npm run marketplace_demo
```

## 🧪 Testing

### Run All Tests
```bash
# In marketplace directory
anchor test

# Run specific test file
anchor test --skip-build tests/marketplace.ts
```

### Test Coverage
- ✅ Marketplace initialization
- ✅ NFT listing with collection verification
- ✅ NFT purchasing with fee distribution
- ✅ NFT delisting and vault closure
- ✅ Marketplace configuration updates
- ✅ Treasury fee withdrawal
- ✅ Error handling and edge cases
- ✅ Unauthorized access prevention

## 📊 Fee Structure

### Default Configuration
- **Marketplace Fee**: 2.5% (250 basis points)
- **Reward Tokens**: 10 tokens per purchase
- **Collection Verification**: Required
- **Maximum Fee**: 100% (10,000 basis points)

### Fee Distribution
```
Sale Price: 1.0 SOL
├── Marketplace Fee (2.5%): 0.025 SOL → Treasury
├── Seller Payment (97.5%): 0.975 SOL → Seller
└── Buyer Reward: 10 Reward Tokens → Buyer
```

## 🔧 Configuration

### Environment Variables
```bash
# In .env file
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
MARKETPLACE_PROGRAM_ID=HYxi42pNZDn3dpnF8HPNeFurSLQSpcYWdvRSkfuqkkui
MARKETPLACE_ADMIN_WALLET=./marketplace-wallet.json
```

### Program Constants
```rust
// Maximum marketplace fee (100%)
const MAX_FEE_BASIS_POINTS: u16 = 10000;

// Reward tokens per purchase (with 6 decimals)
const REWARD_AMOUNT: u64 = 10_000_000;

// Maximum marketplace name length
const MAX_NAME_LENGTH: usize = 32;
```

## 🔗 Integration

### SDK Usage
```typescript
import { MarketplaceClient } from './client/marketplace-client';

const client = new MarketplaceClient({
  connection: new Connection("https://api.devnet.solana.com"),
  wallet: new Wallet(keypair),
  programId: new PublicKey("HYxi42pNZDn3dpnF8HPNeFurSLQSpcYWdvRSkfuqkkui")
});

// Initialize marketplace
await client.initializeMarketplace(admin, "MyMarket", 250);

// List NFT
await client.listNft(seller, "MyMarket", nftMint, collectionMint, price);

// Purchase NFT
await client.purchaseNft(buyer, "MyMarket", nftMint, collectionMint, seller);
```

### Manager Usage (Integrated with Solana Starter)
```typescript
import { marketplaceManager } from './marketplace/marketplace-manager';

// Create test NFT
const nft = await marketplaceManager.createTestNft();

// Validate NFT
const validation = await marketplaceManager.validateNftForListing(nft.mint);

// Calculate fees
const fees = marketplaceManager.calculateFees(price, feeBasisPoints);
```

## 🚨 Important Notes

### Security Considerations
- **🔐 Admin Keys**: Protect marketplace admin private keys
- **💰 Treasury Management**: Regularly withdraw fees to secure wallets
- **✅ Collection Verification**: Ensure NFT collections are properly verified
- **🧪 Testing**: Always test on devnet before mainnet deployment

### Limitations
- **📱 Single Collection**: Each listing requires verified collection membership
- **💎 NFT Only**: Only supports NFTs (supply=1, decimals=0)
- **🏛️ Centralized Admin**: Marketplace admin has privileged access
- **⛽ Gas Costs**: All operations require SOL for transaction fees

### Future Enhancements
- **🔄 Auction System**: Time-based auction functionality
- **🎯 Offers**: Buyer offer system for negotiations
- **📈 Analytics**: On-chain analytics and reporting
- **🏆 Royalties**: Creator royalty enforcement
- **🌐 Multi-Collection**: Support for multiple collections

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow existing code patterns
- Add comprehensive tests
- Update documentation
- Use conventional commits
- Ensure GI.txt compliance

## 📄 License

MIT License - see LICENSE file for details.

---

**⚠️ Disclaimer**: This marketplace is for educational and development purposes. Conduct thorough security audits before mainnet deployment with real assets.

**🏗️ Built with**: Anchor Framework, Solana, TypeScript, Metaplex
**🎯 Target**: Turbin3 Q3 2025 Builder Program
**🚀 Status**: Development Complete - Ready for Testing
