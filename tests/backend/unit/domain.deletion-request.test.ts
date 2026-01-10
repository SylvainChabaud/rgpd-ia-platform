/**
 * Domain Tests: DeletionRequest
 * LOT 5.2 - RGPD Deletion
 *
 * RGPD compliance:
 * - Right to erasure (Art. 17)
 * - Retention period before purge
 */

import { describe, it, expect } from '@jest/globals';
import { calculatePurgeDate, DELETION_RETENTION_DAYS } from '@/domain/rgpd/DeletionRequest';

describe('Domain: DeletionRequest', () => {
  describe('calculatePurgeDate', () => {
    it('calculates purge date correctly', () => {
      const deletedAt = new Date('2024-01-01T00:00:00Z');
      const purgeDate = calculatePurgeDate(deletedAt);

      const expectedDate = new Date('2024-01-01T00:00:00Z');
      expectedDate.setDate(expectedDate.getDate() + DELETION_RETENTION_DAYS);

      expect(purgeDate.getTime()).toBe(expectedDate.getTime());
    });

    it('adds retention days to deletion date', () => {
      const deletedAt = new Date('2024-01-15T12:30:00Z');
      const purgeDate = calculatePurgeDate(deletedAt);

      const daysDiff = Math.floor(
        (purgeDate.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysDiff).toBe(DELETION_RETENTION_DAYS);
    });

    it('preserves time component of deletion date', () => {
      const deletedAt = new Date('2024-01-15T14:30:45Z');
      const purgeDate = calculatePurgeDate(deletedAt);

      expect(purgeDate.getHours()).toBe(deletedAt.getHours());
      expect(purgeDate.getMinutes()).toBe(deletedAt.getMinutes());
      expect(purgeDate.getSeconds()).toBe(deletedAt.getSeconds());
    });

    it('handles month transitions correctly', () => {
      const deletedAt = new Date('2024-01-15T00:00:00Z');
      const purgeDate = calculatePurgeDate(deletedAt);

      // 30 days from Jan 15 is Feb 14
      expect(purgeDate.getMonth()).toBe(1); // February (0-indexed)
      expect(purgeDate.getDate()).toBe(14);
    });

    it('handles year transitions correctly', () => {
      const deletedAt = new Date('2023-12-15T00:00:00Z');
      const purgeDate = calculatePurgeDate(deletedAt);

      // 30 days from Dec 15, 2023 is Jan 14, 2024
      expect(purgeDate.getFullYear()).toBe(2024);
      expect(purgeDate.getMonth()).toBe(0); // January
      expect(purgeDate.getDate()).toBe(14);
    });

    it('handles leap year correctly', () => {
      const deletedAt = new Date('2024-02-15T00:00:00Z'); // 2024 is a leap year
      const purgeDate = calculatePurgeDate(deletedAt);

      // 30 days from Feb 15 (leap year) is Mar 16
      expect(purgeDate.getMonth()).toBe(2); // March
      expect(purgeDate.getDate()).toBe(16);
    });

    it('does not mutate original date', () => {
      const deletedAt = new Date('2024-01-15T00:00:00Z');
      const originalTime = deletedAt.getTime();

      calculatePurgeDate(deletedAt);

      expect(deletedAt.getTime()).toBe(originalTime);
    });

    it('returns different instance than input', () => {
      const deletedAt = new Date('2024-01-15T00:00:00Z');
      const purgeDate = calculatePurgeDate(deletedAt);

      expect(purgeDate).not.toBe(deletedAt);
    });

    it('produces consistent results for same input', () => {
      const deletedAt = new Date('2024-01-15T12:30:00Z');
      const purgeDate1 = calculatePurgeDate(deletedAt);
      const purgeDate2 = calculatePurgeDate(deletedAt);

      expect(purgeDate1.getTime()).toBe(purgeDate2.getTime());
    });
  });

  describe('DELETION_RETENTION_DAYS constant', () => {
    it('is set to 30 days', () => {
      expect(DELETION_RETENTION_DAYS).toBe(30);
    });

    it('is a positive number', () => {
      expect(DELETION_RETENTION_DAYS).toBeGreaterThan(0);
    });
  });
});
