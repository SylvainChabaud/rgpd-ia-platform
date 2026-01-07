/**
 * Domain Entity Tests: CguVersion
 *
 * RGPD: Art. 6 (base légale contrat)
 * Classification: P0 (document public)
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
        content: 'CGU content...',
        effectiveDate: new Date('2025-01-01'),
      isActive: false,
        createdAt: new Date(),
      };

      expect(version.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should increment major version for breaking changes', () => {
      const v1: CguVersion = {
        id: 'v1',
        version: '1.0.0',
        content: 'CGU v1',
        effectiveDate: new Date('2025-01-01'),
      isActive: false,
        createdAt: new Date(),
      };

      const v2: CguVersion = {
        id: 'v2',
        version: '2.0.0',
        content: 'CGU v2 with breaking changes',
        effectiveDate: new Date('2025-06-01'),
      isActive: false,
        createdAt: new Date(),
      };

      expect(v2.version).toBe('2.0.0');
      expect(v2.effectiveDate.getTime()).toBeGreaterThan(v1.effectiveDate.getTime());
    });

    it('should store full CGU content in markdown', () => {
      const version: CguVersion = {
        id: 'version-1',
        version: '1.0.0',
        content: '# Conditions Générales d\'Utilisation\n\n## 1. Objet\nLes présentes CGU...',
        effectiveDate: new Date('2025-01-01'),
      isActive: false,
        createdAt: new Date(),
      };

      expect(version.content).toContain('# Conditions Générales');
      expect(version.content.length).toBeGreaterThan(50);
    });

    it('should have effective date for legal validity', () => {
      const version: CguVersion = {
        id: 'version-1',
        version: '1.0.0',
        content: 'CGU content...',
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
          content: 'CGU v1',
          effectiveDate: new Date('2025-01-01'),
      isActive: false,
          createdAt: new Date('2024-12-01'),
        },
        {
          id: 'v2',
          version: '1.1.0',
          content: 'CGU v1.1',
          effectiveDate: new Date('2025-03-01'),
      isActive: false,
          createdAt: new Date('2025-02-01'),
        },
        {
          id: 'v3',
          version: '2.0.0',
          content: 'CGU v2',
          effectiveDate: new Date('2025-06-01'),
      isActive: false,
          createdAt: new Date('2025-05-01'),
        },
      ];

      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe('1.0.0');
      expect(versions[2].version).toBe('2.0.0');
    });

    it('should support content updates for minor versions', () => {
      const v1_0: CguVersion = {
        id: 'v1.0',
        version: '1.0.0',
        content: 'CGU initiale',
        effectiveDate: new Date('2025-01-01'),
      isActive: false,
        createdAt: new Date(),
      };

      const v1_1: CguVersion = {
        id: 'v1.1',
        version: '1.1.0',
        content: 'CGU avec clarifications mineures',
        effectiveDate: new Date('2025-03-01'),
      isActive: false,
        createdAt: new Date(),
      };

      expect(v1_1.content).not.toBe(v1_0.content);
      expect(v1_1.version.startsWith('1.')).toBe(true);
    });

    it('should preserve creation timestamp for audit trail', () => {
      const now = new Date();
      const version: CguVersion = {
        id: 'version-1',
        version: '1.0.0',
        content: 'CGU content...',
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
        content: 'CGU mise à jour prévue dans 30 jours',
        effectiveDate: futureDate,
        isActive: false,
        createdAt: new Date(),
      };

      expect(version.effectiveDate.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
