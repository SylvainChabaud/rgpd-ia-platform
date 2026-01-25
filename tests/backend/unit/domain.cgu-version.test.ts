/**
 * Domain Entity Tests: CguVersion
 *
 * RGPD: Art. 6 (base légale contrat), Art. 7 (conditions consentement)
 * Classification: P0 (document public)
 *
 * Note: CGU content is stored in markdown file (docs/legal/cgu-cgv.md)
 * Database only stores version metadata for acceptance tracking
 *
 * Tests: 8 tests
 */

import { describe, it, expect } from '@jest/globals';
import type { CguVersion } from '@/domain/legal/CguVersion';

describe('Domain Entity: CguVersion', () => {
  describe('Versioning semver', () => {
    it('should follow semver format (major.minor.patch)', () => {
      const version: CguVersion = {
        id: 'version-1',
        version: '1.0.0',
        effectiveDate: new Date('2025-01-01'),
        isActive: false,
        createdAt: new Date(),
        contentPath: 'docs/legal/cgu-cgv.md',
      };

      expect(version.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should increment major version for breaking changes', () => {
      const v1: CguVersion = {
        id: 'v1',
        version: '1.0.0',
        effectiveDate: new Date('2025-01-01'),
        isActive: false,
        createdAt: new Date(),
      };

      const v2: CguVersion = {
        id: 'v2',
        version: '2.0.0',
        effectiveDate: new Date('2025-06-01'),
        isActive: false,
        createdAt: new Date(),
        summary: 'Breaking changes - new terms',
      };

      expect(v2.version).toBe('2.0.0');
      expect(v2.effectiveDate.getTime()).toBeGreaterThan(v1.effectiveDate.getTime());
    });

    it('should reference content via contentPath', () => {
      const version: CguVersion = {
        id: 'version-1',
        version: '1.0.0',
        effectiveDate: new Date('2025-01-01'),
        isActive: false,
        createdAt: new Date(),
        contentPath: 'docs/legal/cgu-cgv.md',
      };

      expect(version.contentPath).toBe('docs/legal/cgu-cgv.md');
    });

    it('should have effective date for legal validity', () => {
      const version: CguVersion = {
        id: 'version-1',
        version: '1.0.0',
        effectiveDate: new Date('2025-01-15'),
        isActive: false,
        createdAt: new Date('2025-01-01'),
      };

      expect(version.effectiveDate).toBeInstanceOf(Date);
      expect(version.effectiveDate.getTime()).toBeGreaterThanOrEqual(version.createdAt.getTime());
    });

    it('should allow multiple versions to coexist', () => {
      const versions: CguVersion[] = [
        {
          id: 'v1',
          version: '1.0.0',
          effectiveDate: new Date('2025-01-01'),
          isActive: false,
          createdAt: new Date('2024-12-01'),
        },
        {
          id: 'v2',
          version: '1.1.0',
          effectiveDate: new Date('2025-03-01'),
          isActive: false,
          createdAt: new Date('2025-02-01'),
        },
        {
          id: 'v3',
          version: '2.0.0',
          effectiveDate: new Date('2025-06-01'),
          isActive: true,
          createdAt: new Date('2025-05-01'),
        },
      ];

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe('1.0.0');
      expect(versions[2].version).toBe('2.0.0');
      // Only one should be active
      expect(versions.filter(v => v.isActive)).toHaveLength(1);
    });

    it('should use summary for minor version updates description', () => {
      const v1_1: CguVersion = {
        id: 'v1.1',
        version: '1.1.0',
        effectiveDate: new Date('2025-03-01'),
        isActive: false,
        createdAt: new Date(),
        summary: 'Clarifications mineures sur les droits RGPD',
      };

      expect(v1_1.summary).toContain('Clarifications');
      expect(v1_1.version.startsWith('1.')).toBe(true);
    });

    it('should preserve creation timestamp for audit trail', () => {
      const now = new Date();
      const version: CguVersion = {
        id: 'version-1',
        version: '1.0.0',
        effectiveDate: new Date('2025-01-15'),
        isActive: false,
        createdAt: now,
      };

      expect(version.createdAt).toEqual(now);
      expect(version.createdAt).toBeInstanceOf(Date);
    });

    it('should allow future effective dates for scheduled updates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const version: CguVersion = {
        id: 'version-1',
        version: '1.1.0',
        effectiveDate: futureDate,
        isActive: false,
        createdAt: new Date(),
        summary: 'Mise à jour prévue dans 30 jours',
      };

      expect(version.effectiveDate.getTime()).toBeGreaterThan(Date.now());
      expect(version.isActive).toBe(false); // Cannot be active if future date
    });
  });
});
