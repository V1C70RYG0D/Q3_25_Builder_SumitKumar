/**
 * Error handling utilities for the Solana project
 * Provides standardized error handling and logging capabilities
 */

import { appConfig } from '../config';

export enum ErrorType {
  NETWORK = 'NETWORK',
  WALLET = 'WALLET',
  TRANSACTION = 'TRANSACTION',
  CONFIGURATION = 'CONFIGURATION',
  VALIDATION = 'VALIDATION',
  PROGRAM = 'PROGRAM',
  UNKNOWN = 'UNKNOWN'
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  code?: string | number;
  context?: Record<string, any>;
  originalError?: Error;
}

export class SolanaError extends Error {
  public readonly type: ErrorType;
  public readonly code?: string | number;
  public readonly context?: Record<string, any>;
  public readonly originalError?: Error;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'SolanaError';
    this.type = details.type;
    this.code = details.code;
    this.context = details.context;
    this.originalError = details.originalError;
  }

  public toString(): string {
    let str = `${this.type}: ${this.message}`;
    
    if (this.code) {
      str += ` (Code: ${this.code})`;
    }
    
    if (this.context && Object.keys(this.context).length > 0) {
      str += `\nContext: ${JSON.stringify(this.context, null, 2)}`;
    }
    
    if (this.originalError && appConfig.debugMode) {
      str += `\nOriginal Error: ${this.originalError.message}`;
      if (this.originalError.stack) {
        str += `\nStack: ${this.originalError.stack}`;
      }
    }
    
    return str;
  }
}

/**
 * Handle and format common Solana RPC errors
 */
export function handleRpcError(error: any, context?: Record<string, any>): SolanaError {
  let message = 'Unknown RPC error occurred';
  let code: string | number | undefined;

  if (error?.message) {
    message = error.message;
  }

  if (error?.code) {
    code = error.code;
  }

  // Common Solana RPC errors
  if (typeof error.message === 'string') {
    if (error.message.includes('insufficient funds')) {
      return new SolanaError({
        type: ErrorType.TRANSACTION,
        message: 'Insufficient funds to complete transaction',
        code,
        context: { ...context, suggestion: 'Request airdrop or add more SOL to wallet' },
        originalError: error
      });
    }

    if (error.message.includes('Transaction simulation failed')) {
      return new SolanaError({
        type: ErrorType.TRANSACTION,
        message: 'Transaction simulation failed - check account states and permissions',
        code,
        context,
        originalError: error
      });
    }

    if (error.message.includes('Account not found')) {
      return new SolanaError({
        type: ErrorType.VALIDATION,
        message: 'Required account not found on-chain',
        code,
        context: { ...context, suggestion: 'Verify account address or initialize account first' },
        originalError: error
      });
    }

    if (error.message.includes('Custom program error')) {
      return new SolanaError({
        type: ErrorType.PROGRAM,
        message: 'Anchor program returned an error',
        code,
        context: { ...context, suggestion: 'Check program logs for specific error details' },
        originalError: error
      });
    }
  }

  return new SolanaError({
    type: ErrorType.NETWORK,
    message,
    code,
    context,
    originalError: error
  });
}

/**
 * Handle wallet-related errors
 */
export function handleWalletError(error: any, context?: Record<string, any>): SolanaError {
  if (error.message?.includes('ENOENT') || error.message?.includes('no such file')) {
    return new SolanaError({
      type: ErrorType.WALLET,
      message: 'Wallet file not found',
      context: { ...context, suggestion: 'Run "npm run keygen" to create a new wallet' },
      originalError: error
    });
  }

  if (error.message?.includes('Invalid private key')) {
    return new SolanaError({
      type: ErrorType.WALLET,
      message: 'Invalid wallet format or corrupted private key',
      context: { ...context, suggestion: 'Check wallet file format or regenerate wallet' },
      originalError: error
    });
  }

  return new SolanaError({
    type: ErrorType.WALLET,
    message: error.message || 'Wallet operation failed',
    context,
    originalError: error
  });
}

/**
 * Handle configuration-related errors
 */
export function handleConfigError(error: any, context?: Record<string, any>): SolanaError {
  return new SolanaError({
    type: ErrorType.CONFIGURATION,
    message: error.message || 'Configuration error',
    context: { ...context, suggestion: 'Check your .env file and environment variables' },
    originalError: error
  });
}

/**
 * Wrapper for async operations with standardized error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorContext?: Record<string, any>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof SolanaError) {
      throw error;
    }

    // Try to categorize the error
    if (error instanceof Error) {
      if (error.message.includes('wallet') || error.message.includes('keypair')) {
        throw handleWalletError(error, errorContext);
      }
      
      if (error.message.includes('RPC') || error.message.includes('Connection')) {
        throw handleRpcError(error, errorContext);
      }
      
      if (error.message.includes('config') || error.message.includes('environment')) {
        throw handleConfigError(error, errorContext);
      }
    }

    // Generic error fallback
    throw new SolanaError({
      type: ErrorType.UNKNOWN,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      context: errorContext,
      originalError: error instanceof Error ? error : undefined
    });
  }
}

/**
 * Log error with appropriate level based on type
 */
export function logError(error: SolanaError): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${error.type}:`;

  switch (error.type) {
    case ErrorType.CONFIGURATION:
    case ErrorType.VALIDATION:
      console.warn(`${prefix} ${error.message}`);
      break;
    
    case ErrorType.NETWORK:
    case ErrorType.TRANSACTION:
    case ErrorType.PROGRAM:
      console.error(`${prefix} ${error.message}`);
      break;
    
    default:
      console.error(`${prefix} ${error.toString()}`);
  }

  if (appConfig.debugMode && error.originalError) {
    console.debug('Original error details:', error.originalError);
  }
}

/**
 * Retry mechanism for operations that might fail temporarily
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = appConfig.security.maxRetryAttempts,
  delay: number = 1000,
  retryCondition?: (error: any) => boolean
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (retryCondition && !retryCondition(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
      
      if (appConfig.debugMode) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.debug(`Retry attempt ${attempt}/${maxRetries} after error:`, errorMessage);
      }
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable (network-related)
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof SolanaError) {
    return error.type === ErrorType.NETWORK;
  }

  const message = error?.message?.toLowerCase() || '';
  return message.includes('network') || 
         message.includes('timeout') || 
         message.includes('connection') ||
         message.includes('503') ||
         message.includes('502') ||
         message.includes('rate limit');
}
