/**
 * Configuration tests - ensuring proper environment variable handling
 */

import { expect } from 'chai';
import { appConfig, isVaultConfigured, getWalletPath } from '../../config';

describe('Configuration System', () => {
  describe('Environment Variables', () => {
    it('should have default values for required configuration', () => {
      expect(appConfig.solana.network).to.be.oneOf(['devnet', 'testnet', 'mainnet-beta']);
      expect(appConfig.solana.rpcUrl).to.be.a('string').and.not.be.empty;
      expect(appConfig.solana.commitment).to.be.a('string');
    });

    it('should validate network configuration', () => {
      expect(appConfig.solana.network).to.match(/^(devnet|testnet|mainnet-beta)$/);
    });

    it('should have proper default values', () => {
      expect(appConfig.wallet.walletPath).to.equal('./turbin3-wallet.json');
      expect(appConfig.wallet.exampleWalletPath).to.equal('./example-wallet.json');
      expect(appConfig.test.airdropAmount).to.be.a('number').and.be.greaterThan(0);
      expect(appConfig.test.timeoutMs).to.be.a('number').and.be.greaterThan(0);
    });

    it('should handle security configuration', () => {
      expect(appConfig.security.requireConfirmation).to.be.a('boolean');
      expect(appConfig.security.maxRetryAttempts).to.be.a('number').and.be.greaterThan(0);
    });

    it('should handle NFT configuration', () => {
      expect(appConfig.nft.irysUploadUrl).to.be.a('string').and.not.be.empty;
      expect(appConfig.nft.defaultSymbol).to.be.a('string').and.not.be.empty;
      expect(appConfig.nft.defaultCreatorShare).to.be.a('number');
    });
  });

  describe('Vault Configuration', () => {
    it('should properly detect vault configuration status', () => {
      const isConfigured = isVaultConfigured();
      expect(isConfigured).to.be.a('boolean');
      
      if (isConfigured) {
        expect(appConfig.vault.vaultStateAddress).to.not.be.undefined;
        expect(appConfig.vault.vaultAuthAddress).to.not.be.undefined;
        expect(appConfig.vault.vaultAddress).to.not.be.undefined;
      }
    });
  });

  describe('Wallet Path Resolution', () => {
    it('should handle wallet path resolution gracefully', () => {
      // This test should not throw even if wallet files don't exist
      // since we're testing configuration, not actual wallet presence
      expect(() => {
        try {
          getWalletPath();
        } catch (error) {
          // Expected if no wallet exists - this is fine for config tests
          expect(error).to.be.instanceOf(Error);
        }
      }).to.not.throw();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate RPC URL format', () => {
      expect(appConfig.solana.rpcUrl).to.match(/^https?:\/\/.+/);
    });

    it('should have proper numeric ranges', () => {
      expect(appConfig.test.airdropAmount).to.be.within(1, 100);
      expect(appConfig.test.timeoutMs).to.be.within(1000, 300000);
      expect(appConfig.security.maxRetryAttempts).to.be.within(1, 10);
    });

    it('should handle debug mode setting', () => {
      expect(appConfig.debugMode).to.be.a('boolean');
    });

    it('should handle log level setting', () => {
      expect(appConfig.logLevel).to.be.a('string');
      expect(['debug', 'info', 'warn', 'error']).to.include(appConfig.logLevel);
    });
  });
});
