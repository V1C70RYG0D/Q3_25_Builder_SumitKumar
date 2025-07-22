/**
 * Common utilities for Solana operations
 * Provides reusable functions for connection, wallet management, and common operations
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { readFileSync, existsSync } from 'fs';
import { appConfig, getWalletPath } from '../config';

/**
 * Create a connection to Solana network using configuration
 */
export function createConnection(): Connection {
  return new Connection(appConfig.solana.rpcUrl, appConfig.solana.commitment);
}

/**
 * Load wallet from configured path
 */
export function loadWallet(): Keypair {
  try {
    const walletPath = getWalletPath();
    const secretKey = JSON.parse(readFileSync(walletPath, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
  } catch (error) {
    throw new Error(`Failed to load wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get SOL balance in a human-readable format
 */
export async function getSOLBalance(connection: Connection, publicKey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Request airdrop with retry mechanism
 */
export async function requestAirdropWithRetry(
  connection: Connection, 
  publicKey: PublicKey, 
  amount: number,
  maxRetries: number = appConfig.security.maxRetryAttempts
): Promise<string> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const signature = await connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, appConfig.solana.commitment);
      
      return signature;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown airdrop error');
      
      if (i < maxRetries - 1) {
        console.log(`Airdrop attempt ${i + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  throw new Error(`Airdrop failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Wait for transaction confirmation with timeout
 */
export async function waitForConfirmation(
  connection: Connection,
  signature: string,
  timeout: number = appConfig.test.timeoutMs
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      const confirmation = await connection.getSignatureStatus(signature);
      
      if (confirmation.value?.confirmationStatus === 'confirmed' || 
          confirmation.value?.confirmationStatus === 'finalized') {
        return;
      }
      
      if (confirmation.value?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Transaction failed')) {
        throw error;
      }
      // Continue waiting for other errors
    }
  }
  
  throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
}

/**
 * Format transaction signature for explorer URL
 */
export function getExplorerUrl(signature: string, network: string = appConfig.solana.network): string {
  const baseUrl = 'https://explorer.solana.com';
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `${baseUrl}/tx/${signature}${cluster}`;
}

/**
 * Format account address for explorer URL
 */
export function getAccountExplorerUrl(address: string, network: string = appConfig.solana.network): string {
  const baseUrl = 'https://explorer.solana.com';
  const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
  return `${baseUrl}/account/${address}${cluster}`;
}

/**
 * Validate public key format
 */
export function isValidPublicKey(key: string): boolean {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert lamports to SOL with specified decimal places
 */
export function lamportsToSol(lamports: number, decimals: number = 4): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(decimals);
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Log transaction details in a formatted way
 */
export function logTransaction(signature: string, description: string): void {
  console.log(`\n✅ ${description}`);
  console.log(`   Transaction: ${signature}`);
  console.log(`   Explorer: ${getExplorerUrl(signature)}`);
}

/**
 * Log account details in a formatted way
 */
export function logAccount(address: string, description: string, balance?: number): void {
  console.log(`\n📍 ${description}`);
  console.log(`   Address: ${address}`);
  console.log(`   Explorer: ${getAccountExplorerUrl(address)}`);
  if (balance !== undefined) {
    console.log(`   Balance: ${lamportsToSol(balance)} SOL`);
  }
}

/**
 * Confirm action with user if required by configuration
 */
export async function confirmAction(message: string): Promise<boolean> {
  if (!appConfig.security.requireConfirmation) {
    return true;
  }
  
  const { default: prompt } = await import('prompt');
  prompt.start();
  
  return new Promise((resolve) => {
    prompt.get([{
      name: 'confirm',
      description: `${message} (y/N)`,
      default: 'N'
    }], (err, result) => {
      if (err) {
        resolve(false);
        return;
      }
      resolve((result.confirm as string).toLowerCase().startsWith('y'));
    });
  });
}

/**
 * Display current network and configuration info
 */
export function displayNetworkInfo(): void {
  console.log(`\n🌐 Network: ${appConfig.solana.network}`);
  console.log(`   RPC: ${appConfig.solana.rpcUrl}`);
  console.log(`   Commitment: ${appConfig.solana.commitment}`);
  
  if (appConfig.debugMode) {
    console.log(`   Debug Mode: Enabled`);
  }
}
