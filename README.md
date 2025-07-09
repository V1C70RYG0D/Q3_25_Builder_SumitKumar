# Solana NFT and SPL Token Project

This repository contains code for creating and managing SPL tokens and NFTs on Solana's devnet.

## Project Structure

The project contains two main directories:
- `solana-starter/ts`: TypeScript implementations for various Solana operations
- `solana-starter/rs`: Rust implementations for Solana programs

## Anchor Vault Close Instruction Implementation

This project includes a complete implementation of the close instruction for an Anchor vault program, as per the homework requirements.

### Homework Requirements Completed

1. **Transfer all remaining SOL from vault PDA back to user**: ✅ Implemented in the `close()` function
2. **Use close constraint on vault_state account**: ✅ Applied in the `Close` struct
3. **Use close constraint on vault account**: ✅ Applied in the `Close` struct  
4. **Refund rent payments to user**: ✅ Automatic via close constraint
5. **Wipe account data from blockchain**: ✅ Automatic via close constraint

### Key Files

- `turbin3-rust/programs/turbin3-rust/src/lib.rs`: Complete Rust implementation
- `solana-starter/ts/cluster1/vault_close_homework_complete.ts`: Full homework solution
- `solana-starter/ts/cluster1/vault_close_demo.ts`: Educational demonstration

### Vault Close Implementation Features

- **Two-step process**: Manual SOL transfer + automatic account closure
- **Security**: Only owner can close (has_one constraint)
- **Complete refund**: All deposits + rent exemption returned
- **Clean closure**: Accounts wiped from blockchain

### Running the Demonstrations

```bash
# View complete homework solution
npm run vault_close_homework

# View educational demonstration
npm run vault_close_demo
```

---

## Original Project Features

- SPL Token creation and management
- NFT minting with on-chain metadata
- Batch token transfers
- Wallet management utilities

## Key Scripts

### Prerequisites
- `keygen.ts`: Generate a new keypair
- `airdrop.ts`: Get SOL from devnet faucet

### SPL Tokens
- `spl_init.ts`: Initialize a new SPL token
- `spl_metadata.ts`: Add metadata to SPL token
- `spl_mint.ts`: Mint tokens to an address
- `spl_transfer.ts`: Transfer tokens between accounts

### NFTs
- `hisoka_nft.ts`: Create an NFT with on-chain metadata using a Hisoka image
- `nft_image.ts`: Upload NFT images to decentralized storage
- `nft_metadata.ts`: Create and upload NFT metadata
- `nft_mint.ts`: Mint a new NFT

### Utilities
- `check_nft.ts`: View details about an NFT including on-chain metadata

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a wallet (or use an existing one):
   ```bash
   npm run keygen
   ```
   
   Alternatively, rename `example-wallet.json` to `turbin3-wallet.json` and replace the array with your own private key bytes.

3. Get SOL from devnet:
   ```bash
   npm run airdrop
   ```

## Creating an NFT with On-Chain Metadata

To create an NFT with on-chain metadata:

1. Run the Hisoka NFT script:
   ```bash
   npm run hisoka_nft
   ```

2. To verify the NFT and its on-chain metadata:
   ```bash
   npm run check_nft <mint-address>
   ```

## Security Note

- Private keys are stored in `*wallet.json` files which are git-ignored
- Never commit wallet files containing real private keys
- Only use devnet for testing; never use real SOL or assets

## License

MIT
