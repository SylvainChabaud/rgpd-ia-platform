/**
 * Shared Utilities Tests: ids
 *
 * RGPD compliance:
 * - Email hashing for P2 protection
 * - Deterministic hashing for lookup
 */

import { describe, it, expect } from '@jest/globals';
import { newId, hashEmail } from '@/shared/ids';
import { createHash } from 'crypto';

describe('Shared: ids', () => {
  describe('newId', () => {
    it('generates a unique ID', () => {
      const id1 = newId();
      const id2 = newId();

      expect(id1).not.toBe(id2);
    });

    it('returns a non-empty string', () => {
      const id = newId();

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('generates UUID format', () => {
      const id = newId();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('generates different IDs on each call', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(newId());
      }

      expect(ids.size).toBe(100);
    });
  });

  describe('hashEmail', () => {
    it('hashes email using SHA-256', () => {
      const email = 'test@example.com';
      const hash = hashEmail(email);

      // SHA-256 produces 64 hex characters
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('produces deterministic hashes', () => {
      const email = 'test@example.com';
      const hash1 = hashEmail(email);
      const hash2 = hashEmail(email);

      expect(hash1).toBe(hash2);
    });

    it('handles email case-insensitively', () => {
      const hashLower = hashEmail('test@example.com');
      const hashUpper = hashEmail('TEST@EXAMPLE.COM');
      const hashMixed = hashEmail('TeSt@ExAmPlE.CoM');

      expect(hashLower).toBe(hashUpper);
      expect(hashLower).toBe(hashMixed);
    });

    it('trims whitespace from email', () => {
      const hashTrimmed = hashEmail('test@example.com');
      const hashWithSpaces = hashEmail('  test@example.com  ');

      expect(hashTrimmed).toBe(hashWithSpaces);
    });

    it('handles leading whitespace', () => {
      const hashNormal = hashEmail('test@example.com');
      const hashLeading = hashEmail('   test@example.com');

      expect(hashNormal).toBe(hashLeading);
    });

    it('handles trailing whitespace', () => {
      const hashNormal = hashEmail('test@example.com');
      const hashTrailing = hashEmail('test@example.com   ');

      expect(hashNormal).toBe(hashTrailing);
    });

    it('produces different hashes for different emails', () => {
      const hash1 = hashEmail('user1@example.com');
      const hash2 = hashEmail('user2@example.com');

      expect(hash1).not.toBe(hash2);
    });

    it('produces same hash as manual SHA-256', () => {
      const email = 'test@example.com';
      const hash = hashEmail(email);
      const expectedHash = createHash('sha256').update(email.toLowerCase()).digest('hex');

      expect(hash).toBe(expectedHash);
    });

    it('handles empty string', () => {
      const hash = hashEmail('');

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('handles special characters in email', () => {
      const email = 'user+tag@example.co.uk';
      const hash = hashEmail(email);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('is case-insensitive for domain', () => {
      const hash1 = hashEmail('user@EXAMPLE.COM');
      const hash2 = hashEmail('user@example.com');

      expect(hash1).toBe(hash2);
    });

    it('is case-insensitive for local part', () => {
      const hash1 = hashEmail('USER@example.com');
      const hash2 = hashEmail('user@example.com');

      expect(hash1).toBe(hash2);
    });

    it('handles unicode characters', () => {
      const email = 'tëst@example.com';
      const hash = hashEmail(email);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/i);
    });

    it('produces consistent hashes with trim and lowercase', () => {
      const variants = [
        'test@example.com',
        'TEST@EXAMPLE.COM',
        '  test@example.com',
        'test@example.com  ',
        '  TEST@EXAMPLE.COM  ',
        '\ttest@example.com\t',
      ];

      const hashes = variants.map(v => hashEmail(v));
      const uniqueHashes = new Set(hashes);

      expect(uniqueHashes.size).toBe(1);
    });
  });
});
