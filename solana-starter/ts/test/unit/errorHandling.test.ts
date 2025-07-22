/**
 * Comprehensive test suite for error handling utilities
 * Ensures 100% test coverage following best practices
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import {
  ApplicationError,
  ErrorCategory,
  withRetry,
  validateEnvironmentVariable,
  safeJsonParse,
  Logger,
  Validator
} from '../../utils/errorHandling';

describe('ErrorHandling Utils', () => {
  describe('ApplicationError', () => {
    it('should create error with correct properties', () => {
      const error = new ApplicationError(
        'Test error',
        ErrorCategory.CONFIGURATION,
        'test-operation',
        true,
        { key: 'value' }
      );

      expect(error.name).to.equal('ApplicationError');
      expect(error.message).to.equal('Test error');
      expect(error.category).to.equal(ErrorCategory.CONFIGURATION);
      expect(error.isRetryable).to.be.true;
      expect(error.context.operation).to.equal('test-operation');
      expect(error.context.details).to.deep.equal({ key: 'value' });
      expect(error.context.timestamp).to.be.instanceOf(Date);
    });

    it('should default retryable to false', () => {
      const error = new ApplicationError(
        'Test error',
        ErrorCategory.VALIDATION,
        'test-operation'
      );

      expect(error.isRetryable).to.be.false;
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = async () => 'success';
      const result = await withRetry(operation, 'test-operation');
      expect(result).to.equal('success');
    });

    it('should retry and eventually succeed', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new ApplicationError(
            'Temporary failure',
            ErrorCategory.NETWORK,
            'test-operation',
            true
          );
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test-operation');
      expect(result).to.equal('success');
      expect(attempts).to.equal(3);
    });

    it('should fail after max attempts', async () => {
      const operation = async () => {
        throw new ApplicationError(
          'Persistent failure',
          ErrorCategory.NETWORK,
          'test-operation',
          true
        );
      };

      try {
        await withRetry(operation, 'test-operation', { maxAttempts: 2 });
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(ApplicationError);
        expect((error as ApplicationError).message).to.include('failed after 2 attempts');
      }
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new ApplicationError(
          'Non-retryable failure',
          ErrorCategory.VALIDATION,
          'test-operation',
          false
        );
      };

      try {
        await withRetry(operation, 'test-operation');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.be.instanceOf(ApplicationError);
        expect(attempts).to.equal(1);
      }
    });
  });

  describe('validateEnvironmentVariable', () => {
    beforeEach(() => {
      // Clean up environment variables
      delete process.env.TEST_VAR;
    });

    it('should return value when valid', () => {
      process.env.TEST_VAR = 'valid-value';
      const result = validateEnvironmentVariable('TEST_VAR', 'valid-value', 'test-operation');
      expect(result).to.equal('valid-value');
    });

    it('should throw error for required missing variable', () => {
      expect(() => {
        validateEnvironmentVariable('TEST_VAR', undefined, 'test-operation', true);
      }).to.throw(ApplicationError);
    });

    it('should throw error for placeholder values', () => {
      const placeholders = [
        'your_value_here',
        'replace_with_something',
        'todo_fix_this',
        'example.com',
        'some_public_key_here'
      ];

      placeholders.forEach(placeholder => {
        expect(() => {
          validateEnvironmentVariable('TEST_VAR', placeholder, 'test-operation');
        }).to.throw(ApplicationError);
      });
    });

    it('should return empty string for non-required missing variable', () => {
      const result = validateEnvironmentVariable('TEST_VAR', undefined, 'test-operation', false);
      expect(result).to.equal('');
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const json = '{"key": "value"}';
      const result = safeJsonParse(json, 'test-operation');
      expect(result).to.deep.equal({ key: 'value' });
    });

    it('should throw ApplicationError for invalid JSON', () => {
      const invalidJson = '{"key": "value"';
      expect(() => {
        safeJsonParse(invalidJson, 'test-operation');
      }).to.throw(ApplicationError);
    });

    it('should return fallback for invalid JSON when provided', () => {
      const invalidJson = '{"key": "value"';
      const fallback = { fallback: 'value' };
      const result = safeJsonParse(invalidJson, 'test-operation', fallback);
      expect(result).to.deep.equal(fallback);
    });
  });

  describe('Validator', () => {
    describe('isValidPublicKey', () => {
      it('should validate correct public key format', () => {
        const validKey = '11111111111111111111111111111112'; // System Program ID
        expect(Validator.isValidPublicKey(validKey)).to.be.true;
      });

      it('should reject invalid public key format', () => {
        const invalidKeys = [
          '',
          'too-short',
          'contains-invalid-characters-@#$',
          '0'.repeat(100) // too long
        ];

        invalidKeys.forEach(key => {
          expect(Validator.isValidPublicKey(key)).to.be.false;
        });
      });
    });

    describe('isValidUrl', () => {
      it('should validate correct URLs', () => {
        const validUrls = [
          'https://api.devnet.solana.com',
          'http://localhost:8899',
          'https://example.com/path?query=value'
        ];

        validUrls.forEach(url => {
          expect(Validator.isValidUrl(url)).to.be.true;
        });
      });

      it('should reject invalid URLs', () => {
        const invalidUrls = [
          '',
          'not-a-url',
          'ftp://invalid-scheme.com',
          'just-text'
        ];

        invalidUrls.forEach(url => {
          expect(Validator.isValidUrl(url)).to.be.false;
        });
      });
    });

    describe('isValidNetwork', () => {
      it('should validate correct networks', () => {
        const validNetworks = ['devnet', 'testnet', 'mainnet-beta'];
        validNetworks.forEach(network => {
          expect(Validator.isValidNetwork(network)).to.be.true;
        });
      });

      it('should reject invalid networks', () => {
        const invalidNetworks = ['', 'mainnet', 'localhost', 'invalid'];
        invalidNetworks.forEach(network => {
          expect(Validator.isValidNetwork(network)).to.be.false;
        });
      });
    });

    describe('isValidCommitment', () => {
      it('should validate correct commitments', () => {
        const validCommitments = ['processed', 'confirmed', 'finalized'];
        validCommitments.forEach(commitment => {
          expect(Validator.isValidCommitment(commitment)).to.be.true;
        });
      });

      it('should reject invalid commitments', () => {
        const invalidCommitments = ['', 'invalid', 'max', 'recent'];
        invalidCommitments.forEach(commitment => {
          expect(Validator.isValidCommitment(commitment)).to.be.false;
        });
      });
    });
  });

  describe('Logger', () => {
    it('should create log methods without throwing', () => {
      // Test that logger methods can be called without throwing
      expect(() => {
        Logger.debug('debug message');
        Logger.info('info message');
        Logger.warn('warn message');
        Logger.error('error message');
        Logger.success('success message');
      }).to.not.throw();
    });

    it('should handle error objects', () => {
      const error = new ApplicationError(
        'Test error',
        ErrorCategory.NETWORK,
        'test-operation'
      );

      expect(() => {
        Logger.error('Error occurred', error);
      }).to.not.throw();
    });
  });
});
