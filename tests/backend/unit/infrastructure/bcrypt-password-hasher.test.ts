/**
 * Unit Tests: BcryptPasswordHasher
 *
 * RGPD: Art. 32 - Security of processing
 * Tests password hashing implementation for OWASP compliance
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { BcryptPasswordHasher } from '@/infrastructure/security/BcryptPasswordHasher';

describe('Infrastructure: BcryptPasswordHasher', () => {
  let hasher: BcryptPasswordHasher;

  beforeEach(() => {
    // Use lower salt rounds for faster tests (production uses 12)
    hasher = new BcryptPasswordHasher(4);
  });

  describe('hash()', () => {
    it('should hash password with bcrypt format', async () => {
      const password = 'SecurePassword123!';

      const hash = await hasher.hash(password);

      // Bcrypt hash format: $2a$XX$ or $2b$XX$
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    });

    it('should NOT contain plaintext password in hash', async () => {
      const password = 'PlainTextCheck123!';

      const hash = await hasher.hash(password);

      expect(hash).not.toContain(password);
    });

    it('should generate different hashes for same password (salt)', async () => {
      const password = 'SamePassword123!';

      const hash1 = await hasher.hash(password);
      const hash2 = await hasher.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should use configured salt rounds', async () => {
      const customHasher = new BcryptPasswordHasher(10);
      const password = 'TestPassword!';

      const hash = await customHasher.hash(password);

      // Salt rounds are embedded in hash: $2a$10$...
      expect(hash).toMatch(/^\$2[aby]\$10\$/);
    });

    it('should default to 12 salt rounds (OWASP recommendation)', () => {
      const defaultHasher = new BcryptPasswordHasher();

      // Access private field for testing
      // @ts-expect-error accessing private for test verification
      expect(defaultHasher.saltRounds).toBe(12);
    });
  });

  describe('verify()', () => {
    it('should verify correct password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should reject password with similar prefix', async () => {
      const password = 'CorrectPassword123!';
      const similarPassword = 'CorrectPassword123'; // Missing !
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify(similarPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should handle DISABLED_PASSWORD_HASH', async () => {
      const disabledHash = '__DISABLED__';

      const isValid = await hasher.verify('AnyPassword', disabledHash);

      expect(isValid).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'CaseSensitive123!';
      const wrongCase = 'casesensitive123!';
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify(wrongCase, hash);

      expect(isValid).toBe(false);
    });
  });

  describe('Security (Art. 32 RGPD)', () => {
    it('should handle special characters in password', async () => {
      const password = 'P@$$w0rd!#%&*()_+-=[]{}|;:,.<>?';

      const hash = await hasher.hash(password);
      const isValid = await hasher.verify(password, hash);

      expect(isValid).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const password = 'Пароль密码كلمة';

      const hash = await hasher.hash(password);
      const isValid = await hasher.verify(password, hash);

      expect(isValid).toBe(true);
    });

    it('should handle long passwords (up to 72 bytes for bcrypt)', async () => {
      // Bcrypt truncates at 72 bytes
      const longPassword = 'A'.repeat(72);

      const hash = await hasher.hash(longPassword);
      const isValid = await hasher.verify(longPassword, hash);

      expect(isValid).toBe(true);
    });

    it('should handle empty password (edge case)', async () => {
      const emptyPassword = '';

      const hash = await hasher.hash(emptyPassword);
      const isValid = await hasher.verify(emptyPassword, hash);

      expect(isValid).toBe(true);
    });
  });
});
