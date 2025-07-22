/**
 * Utility functions tests
 */

import { expect } from 'chai';
import { describe, it } from 'mocha';
import { 
  isValidPublicKey, 
  lamportsToSol, 
  solToLamports,
  getExplorerUrl,
  getAccountExplorerUrl
} from '../../utils/solana';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

describe('Solana Utilities', () => {
  describe('PublicKey Validation', () => {
    it('should validate correct PublicKey strings', () => {
      const validKey = new PublicKey(0).toBase58();
      expect(isValidPublicKey(validKey)).to.be.true;
    });

    it('should reject invalid PublicKey strings', () => {
      expect(isValidPublicKey('invalid')).to.be.false;
      expect(isValidPublicKey('')).to.be.false;
      expect(isValidPublicKey('123')).to.be.false;
    });

    it('should handle edge cases', () => {
      expect(isValidPublicKey('11111111111111111111111111111111')).to.be.true; // System Program
      expect(isValidPublicKey('So11111111111111111111111111111111111111112')).to.be.true; // Wrapped SOL
    });
  });

  describe('Lamports/SOL Conversion', () => {
    it('should convert lamports to SOL correctly', () => {
      expect(lamportsToSol(LAMPORTS_PER_SOL)).to.equal('1.0000');
      expect(lamportsToSol(LAMPORTS_PER_SOL / 2)).to.equal('0.5000');
      expect(lamportsToSol(0)).to.equal('0.0000');
    });

    it('should convert SOL to lamports correctly', () => {
      expect(solToLamports(1)).to.equal(LAMPORTS_PER_SOL);
      expect(solToLamports(0.5)).to.equal(LAMPORTS_PER_SOL / 2);
      expect(solToLamports(0)).to.equal(0);
    });

    it('should handle custom decimal places', () => {
      expect(lamportsToSol(LAMPORTS_PER_SOL, 2)).to.equal('1.00');
      expect(lamportsToSol(LAMPORTS_PER_SOL, 6)).to.equal('1.000000');
    });

    it('should handle rounding correctly', () => {
      const smallAmount = 1234567; // Less than 1 SOL
      const result = lamportsToSol(smallAmount, 4);
      expect(result).to.match(/^\d+\.\d{4}$/);
    });
  });

  describe('Explorer URL Generation', () => {
    const testSignature = 'test123signature456';
    const testAddress = '11111111111111111111111111111111';

    it('should generate correct transaction explorer URLs', () => {
      expect(getExplorerUrl(testSignature, 'devnet'))
        .to.equal(`https://explorer.solana.com/tx/${testSignature}?cluster=devnet`);
      
      expect(getExplorerUrl(testSignature, 'mainnet-beta'))
        .to.equal(`https://explorer.solana.com/tx/${testSignature}`);
    });

    it('should generate correct account explorer URLs', () => {
      expect(getAccountExplorerUrl(testAddress, 'devnet'))
        .to.equal(`https://explorer.solana.com/account/${testAddress}?cluster=devnet`);
      
      expect(getAccountExplorerUrl(testAddress, 'mainnet-beta'))
        .to.equal(`https://explorer.solana.com/account/${testAddress}`);
    });

    it('should handle testnet cluster', () => {
      expect(getExplorerUrl(testSignature, 'testnet'))
        .to.equal(`https://explorer.solana.com/tx/${testSignature}?cluster=testnet`);
    });
  });

  describe('Number Validation', () => {
    it('should handle large lamport amounts', () => {
      const large = 1000000 * LAMPORTS_PER_SOL;
      expect(solToLamports(lamportsToSol(large) as any)).to.be.closeTo(large, 1);
    });

    it('should handle small fractional amounts', () => {
      const small = 0.000001;
      const lamports = solToLamports(small);
      expect(lamports).to.be.a('number');
      expect(lamports).to.be.greaterThan(0);
    });
  });
});
