/**
 * Unit Tests: CGU Version Domain Entity
 * Coverage: src/domain/legal/CguVersion.ts
 */

import { describe, it, expect } from '@jest/globals';
import {
  createCguVersion,
  isVersionEffective,
  compareVersions,
  isMajorUpdate,
  getShortSummary,
  toPublicCguVersion,
  CGU_VERSION_PATTERN,
  type CguVersion,
} from '@/domain/legal/CguVersion';

describe('CGU_VERSION_PATTERN', () => {
  it('should match valid semver versions', () => {
    expect(CGU_VERSION_PATTERN.test('1.0.0')).toBe(true);
    expect(CGU_VERSION_PATTERN.test('2.5.12')).toBe(true);
    expect(CGU_VERSION_PATTERN.test('10.20.30')).toBe(true);
  });

  it('should reject invalid versions', () => {
    expect(CGU_VERSION_PATTERN.test('1.0')).toBe(false);
    expect(CGU_VERSION_PATTERN.test('v1.0.0')).toBe(false);
    expect(CGU_VERSION_PATTERN.test('1.0.0-beta')).toBe(false);
  });
});

describe('createCguVersion', () => {
  it('should create valid CGU version', () => {
    const input = {
      version: '1.0.0',
      content: 'CGU content here',
      effectiveDate: new Date('2024-01-01'),
      summary: 'Initial version',
    };

    const result = createCguVersion(input);

    expect(result.version).toBe('1.0.0');
    expect(result.content).toBe('CGU content here');
    expect(result.isActive).toBe(false);
    expect(result.summary).toBe('Initial version');
  });

  it('should throw on invalid version format', () => {
    const input = {
      version: '1.0',
      content: 'CGU content',
      effectiveDate: new Date(),
    };

    expect(() => createCguVersion(input)).toThrow('semantic versioning');
  });

  it('should throw on empty content', () => {
    const input = {
      version: '1.0.0',
      content: '',
      effectiveDate: new Date(),
    };

    expect(() => createCguVersion(input)).toThrow('cannot be empty');
  });

  it('should throw on whitespace-only content', () => {
    const input = {
      version: '1.0.0',
      content: '   ',
      effectiveDate: new Date(),
    };

    expect(() => createCguVersion(input)).toThrow('cannot be empty');
  });

  it('should handle missing summary', () => {
    const input = {
      version: '1.0.0',
      content: 'CGU content',
      effectiveDate: new Date(),
    };

    const result = createCguVersion(input);

    expect(result.summary).toBeUndefined();
  });
});

describe('isVersionEffective', () => {
  it('should return true if effective date is in the past', () => {
    const cgu: CguVersion = {
      id: '1',
      version: '1.0.0',
      content: 'Content',
      effectiveDate: new Date('2020-01-01'),
      isActive: true,
      createdAt: new Date(),
    };

    expect(isVersionEffective(cgu)).toBe(true);
  });

  it('should return true if effective date is now', () => {
    const cgu: CguVersion = {
      id: '1',
      version: '1.0.0',
      content: 'Content',
      effectiveDate: new Date(),
      isActive: true,
      createdAt: new Date(),
    };

    expect(isVersionEffective(cgu)).toBe(true);
  });

  it('should return false if effective date is in the future', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const cgu: CguVersion = {
      id: '1',
      version: '1.0.0',
      content: 'Content',
      effectiveDate: futureDate,
      isActive: false,
      createdAt: new Date(),
    };

    expect(isVersionEffective(cgu)).toBe(false);
  });
});

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.5.3', '2.5.3')).toBe(0);
  });

  it('should return positive if v1 > v2', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.1.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.1', '1.0.0')).toBeGreaterThan(0);
  });

  it('should return negative if v1 < v2', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.1.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
  });

  it('should compare major versions first', () => {
    expect(compareVersions('3.0.0', '2.9.9')).toBeGreaterThan(0);
  });

  it('should compare minor versions if major equal', () => {
    expect(compareVersions('1.5.0', '1.3.9')).toBeGreaterThan(0);
  });

  it('should compare patch versions if major and minor equal', () => {
    expect(compareVersions('1.0.5', '1.0.3')).toBeGreaterThan(0);
  });
});

describe('isMajorUpdate', () => {
  it('should return true for major version increase', () => {
    expect(isMajorUpdate('1.0.0', '2.0.0')).toBe(true);
    expect(isMajorUpdate('1.5.3', '2.0.0')).toBe(true);
    expect(isMajorUpdate('2.0.0', '3.0.0')).toBe(true);
  });

  it('should return false for minor version increase', () => {
    expect(isMajorUpdate('1.0.0', '1.1.0')).toBe(false);
    expect(isMajorUpdate('1.5.0', '1.6.0')).toBe(false);
  });

  it('should return false for patch version increase', () => {
    expect(isMajorUpdate('1.0.0', '1.0.1')).toBe(false);
    expect(isMajorUpdate('1.5.3', '1.5.4')).toBe(false);
  });

  it('should return false for same version', () => {
    expect(isMajorUpdate('1.0.0', '1.0.0')).toBe(false);
  });
});

describe('getShortSummary', () => {
  const cgu: CguVersion = {
    id: '1',
    version: '1.0.0',
    content: 'Content',
    effectiveDate: new Date(),
    isActive: true,
    createdAt: new Date(),
    summary: 'This is a summary of the changes',
  };

  it('should return default message if no summary', () => {
    const cguNoSummary: CguVersion = { ...cgu, summary: undefined };
    expect(getShortSummary(cguNoSummary)).toBe('Nouvelle version 1.0.0 des CGU');
  });

  it('should return full summary if under max length', () => {
    expect(getShortSummary(cgu, 200)).toBe('This is a summary of the changes');
  });

  it('should truncate summary if over max length', () => {
    const longSummary = 'a'.repeat(300);
    const cguLong: CguVersion = { ...cgu, summary: longSummary };

    const result = getShortSummary(cguLong, 50);

    expect(result.length).toBe(50);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should use default max length of 200', () => {
    const longSummary = 'b'.repeat(300);
    const cguLong: CguVersion = { ...cgu, summary: longSummary };

    const result = getShortSummary(cguLong);

    expect(result.length).toBe(200);
  });
});

describe('toPublicCguVersion', () => {
  it('should map to public format', () => {
    const cgu: CguVersion = {
      id: 'secret-id',
      version: '1.0.0',
      content: 'Secret content',
      effectiveDate: new Date('2024-01-01'),
      isActive: true,
      createdAt: new Date(),
      summary: 'Public summary',
    };

    const result = toPublicCguVersion(cgu);

    expect(result).toEqual({
      version: '1.0.0',
      effectiveDate: cgu.effectiveDate,
      isActive: true,
      summary: 'Public summary',
    });
    expect((result as CguVersion).id).toBeUndefined();
    expect((result as CguVersion).content).toBeUndefined();
  });

  it('should handle missing summary', () => {
    const cgu: CguVersion = {
      id: '1',
      version: '1.0.0',
      content: 'Content',
      effectiveDate: new Date(),
      isActive: false,
      createdAt: new Date(),
    };

    const result = toPublicCguVersion(cgu);

    expect(result.summary).toBeUndefined();
  });
});
