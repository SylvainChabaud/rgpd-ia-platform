/**
 * AES Encryption Service Tests
 * LOT 1.6 - Email chiffré pour notifications RGPD
 *
 * Tests:
 * - Encrypt/decrypt roundtrip
 * - Key validation
 * - Error handling (corrupted data, wrong key)
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as AesEncryption from '@/infrastructure/security/AesEncryptionService';

describe('AesEncryptionService', () => {
  const originalEnv = process.env.EMAIL_ENCRYPTION_KEY;

  // Use a test key (32 bytes = 64 hex chars)
  const testKey = 'a'.repeat(64); // Valid 256-bit key in hex

  beforeAll(() => {
    process.env.EMAIL_ENCRYPTION_KEY = testKey;
    AesEncryption.clearKeyCache();
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.EMAIL_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.EMAIL_ENCRYPTION_KEY;
    }
    AesEncryption.clearKeyCache();
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt email correctly', () => {
      const email = 'user@example.com';

      const encrypted = AesEncryption.encrypt(email);
      const decrypted = AesEncryption.decrypt(encrypted);

      expect(decrypted).toBe(email);
    });

    it('should handle special characters', () => {
      const email = 'user+tag@sub.example.com';

      const encrypted = AesEncryption.encrypt(email);
      const decrypted = AesEncryption.decrypt(encrypted);

      expect(decrypted).toBe(email);
    });

    it('should handle unicode characters', () => {
      const email = 'utilisateur@éxample.com';

      const encrypted = AesEncryption.encrypt(email);
      const decrypted = AesEncryption.decrypt(encrypted);

      expect(decrypted).toBe(email);
    });

    it('should produce different ciphertext for same input (random IV)', () => {
      const email = 'test@example.com';

      const encrypted1 = AesEncryption.encrypt(email);
      const encrypted2 = AesEncryption.encrypt(email);

      // Ciphertexts should be different due to random IV
      expect(encrypted1.equals(encrypted2)).toBe(false);

      // But both should decrypt to same value
      expect(AesEncryption.decrypt(encrypted1)).toBe(email);
      expect(AesEncryption.decrypt(encrypted2)).toBe(email);
    });
  });

  describe('key validation', () => {
    it('should throw error if key is not set', () => {
      const savedKey = process.env.EMAIL_ENCRYPTION_KEY;
      delete process.env.EMAIL_ENCRYPTION_KEY;
      AesEncryption.clearKeyCache();

      expect(() => AesEncryption.encrypt('test')).toThrow(
        'EMAIL_ENCRYPTION_KEY not configured'
      );

      process.env.EMAIL_ENCRYPTION_KEY = savedKey;
      AesEncryption.clearKeyCache();
    });

    it('should throw error if key is wrong length', () => {
      const savedKey = process.env.EMAIL_ENCRYPTION_KEY;
      process.env.EMAIL_ENCRYPTION_KEY = 'tooshort';
      AesEncryption.clearKeyCache();

      expect(() => AesEncryption.encrypt('test')).toThrow(
        'EMAIL_ENCRYPTION_KEY must be 32 bytes'
      );

      process.env.EMAIL_ENCRYPTION_KEY = savedKey;
      AesEncryption.clearKeyCache();
    });

    it('should accept base64 encoded key', () => {
      const savedKey = process.env.EMAIL_ENCRYPTION_KEY;
      // 32 bytes in base64 = 44 chars
      process.env.EMAIL_ENCRYPTION_KEY = Buffer.alloc(32, 'x').toString('base64');
      AesEncryption.clearKeyCache();

      const email = 'test@example.com';
      const encrypted = AesEncryption.encrypt(email);
      const decrypted = AesEncryption.decrypt(encrypted);

      expect(decrypted).toBe(email);

      process.env.EMAIL_ENCRYPTION_KEY = savedKey;
      AesEncryption.clearKeyCache();
    });
  });

  describe('error handling', () => {
    it('should throw on corrupted data', () => {
      const email = 'test@example.com';
      const encrypted = AesEncryption.encrypt(email);

      // Corrupt the ciphertext
      encrypted[encrypted.length - 1] ^= 0xff;

      expect(() => AesEncryption.decrypt(encrypted)).toThrow(
        'Decryption failed'
      );
    });

    it('should throw on truncated data', () => {
      const encrypted = Buffer.from('tooshort');

      expect(() => AesEncryption.decrypt(encrypted)).toThrow(
        'Invalid encrypted data: too short'
      );
    });

    it('should throw on tampered auth tag', () => {
      const email = 'test@example.com';
      const encrypted = AesEncryption.encrypt(email);

      // Tamper with auth tag (bytes 12-28)
      encrypted[15] ^= 0xff;

      expect(() => AesEncryption.decrypt(encrypted)).toThrow(
        'Decryption failed'
      );
    });
  });

  describe('isEncryptionConfigured', () => {
    it('should return true when key is configured', () => {
      AesEncryption.clearKeyCache();
      expect(AesEncryption.isEncryptionConfigured()).toBe(true);
    });

    it('should return false when key is not configured', () => {
      const savedKey = process.env.EMAIL_ENCRYPTION_KEY;
      delete process.env.EMAIL_ENCRYPTION_KEY;
      AesEncryption.clearKeyCache();

      expect(AesEncryption.isEncryptionConfigured()).toBe(false);

      process.env.EMAIL_ENCRYPTION_KEY = savedKey;
      AesEncryption.clearKeyCache();
    });
  });

  describe('generateKey', () => {
    it('should generate a valid 64-char hex key', () => {
      const key = AesEncryption.generateKey();

      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = AesEncryption.generateKey();
      const key2 = AesEncryption.generateKey();

      expect(key1).not.toBe(key2);
    });
  });
});
