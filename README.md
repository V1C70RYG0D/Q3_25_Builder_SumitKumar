# Solana NFT and SPL Token Project

This repository contains code for creating and managing SPL tokens and NFTs on Solana's devnet.

## Project Structure

The project contains two main directories:
- `solana-starter/ts`: TypeScript implementations for various Solana operations
- `solana-starter/rs`: Rust implementations for Solana programs

## Features

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
# Testing the pushall alias
