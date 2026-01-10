import { describe, it, expect, beforeEach } from '@jest/globals';
import { PgBootstrapStateRepo } from '@/infrastructure/repositories/PgBootstrapStateRepo';
import { pool } from '@/infrastructure/db/pg';

/**
 * Integration tests for PgBootstrapStateRepo
 *
 * LOT 11.0 - Coverage improvement (0% → 80%+)
 *
 * Tests the bootstrap state management system.
 * Critical for platform initialization and preventing duplicate bootstrap.
 */
describe('PgBootstrapStateRepo', () => {
  let repo: PgBootstrapStateRepo;

  beforeEach(async () => {
    repo = new PgBootstrapStateRepo();

    // Clean bootstrap state before each test
    await pool.query(`DELETE FROM bootstrap_state WHERE id = 'platform'`);
  });

  describe('isBootstrapped', () => {
    it('should return false when platform is not bootstrapped', async () => {
      const result = await repo.isBootstrapped();

      expect(result).toBe(false);
    });

    it('should return true when platform is bootstrapped', async () => {
      // Manually mark as bootstrapped
      await pool.query(
        `INSERT INTO bootstrap_state (id) VALUES ('platform')`
      );

      const result = await repo.isBootstrapped();

      expect(result).toBe(true);
    });

    it('should handle multiple checks correctly', async () => {
      // First check - not bootstrapped
      const before = await repo.isBootstrapped();
      expect(before).toBe(false);

      // Mark as bootstrapped
      await repo.markBootstrapped();

      // Second check - should be bootstrapped
      const after = await repo.isBootstrapped();
      expect(after).toBe(true);
    });
  });

  describe('markBootstrapped', () => {
    it('should mark platform as bootstrapped', async () => {
      await repo.markBootstrapped();

      const result = await repo.isBootstrapped();

      expect(result).toBe(true);
    });

    it('should be idempotent (can be called multiple times)', async () => {
      // First call
      await repo.markBootstrapped();

      // Second call should not throw error
      await expect(repo.markBootstrapped()).resolves.not.toThrow();

      // Should still be marked as bootstrapped
      const result = await repo.isBootstrapped();
      expect(result).toBe(true);
    });

    it('should prevent duplicate bootstrap entries', async () => {
      // Call markBootstrapped multiple times
      await repo.markBootstrapped();
      await repo.markBootstrapped();
      await repo.markBootstrapped();

      // Verify only one entry exists
      const res = await pool.query(
        `SELECT COUNT(*) as count FROM bootstrap_state WHERE id = 'platform'`
      );

      expect(parseInt(res.rows[0].count, 10)).toBe(1);
    });
  });

  describe('Bootstrap Workflow', () => {
    it('should follow correct bootstrap lifecycle', async () => {
      // 1. Check initial state (not bootstrapped)
      const initial = await repo.isBootstrapped();
      expect(initial).toBe(false);

      // 2. Mark as bootstrapped
      await repo.markBootstrapped();

      // 3. Verify state changed
      const final = await repo.isBootstrapped();
      expect(final).toBe(true);
    });

    it('should maintain bootstrap state across repo instances', async () => {
      // Mark as bootstrapped with first repo instance
      await repo.markBootstrapped();

      // Create new repo instance
      const repo2 = new PgBootstrapStateRepo();

      // Should still be bootstrapped
      const result = await repo2.isBootstrapped();
      expect(result).toBe(true);
    });
  });

  describe('Database Integration', () => {
    it('should use correct bootstrap key', async () => {
      await repo.markBootstrapped();

      // Verify the correct key is used
      const res = await pool.query(
        `SELECT id FROM bootstrap_state LIMIT 1`
      );

      expect(res.rows[0].id).toBe('platform');
    });

    it('should handle database errors gracefully', async () => {
      // Close pool temporarily to simulate DB error
      const originalQuery = pool.query.bind(pool);
      pool.query = async () => {
        throw new Error('Database connection error');
      };

      await expect(repo.isBootstrapped()).rejects.toThrow('Database connection error');

      // Restore pool
      pool.query = originalQuery;
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent bootstrap attempts', async () => {
      // Simulate concurrent bootstrap attempts
      const promises = [
        repo.markBootstrapped(),
        repo.markBootstrapped(),
        repo.markBootstrapped(),
      ];

      // All should complete without error
      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Only one entry should exist
      const res = await pool.query(
        `SELECT COUNT(*) as count FROM bootstrap_state WHERE id = 'platform'`
      );

      expect(parseInt(res.rows[0].count, 10)).toBe(1);
    });

    it('should return correct boolean type', async () => {
      const result = await repo.isBootstrapped();

      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });

    it('should handle empty result set correctly', async () => {
      // Ensure no bootstrap state exists
      await pool.query(`DELETE FROM bootstrap_state WHERE id = 'platform'`);

      const result = await repo.isBootstrapped();

      expect(result).toBe(false);
    });
  });
});
