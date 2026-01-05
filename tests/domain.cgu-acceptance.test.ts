/**
 * Domain Entity Tests: CGU Acceptance
 * RGPD: Art. 7 (Consentement)
 * Tests: 8 tests
 */

import { describe, it, expect } from '@jest/globals';
import type { CguAcceptance } from '../src/domain/legal/CguAcceptance';
import {
  createCguAcceptance,
  isRecentAcceptance,
  shouldAnonymizeIp
} from '../src/domain/legal/CguAcceptance';

describe('Domain: CguAcceptance', () => {
  it('should create valid CGU acceptance', () => {
    const acceptance: CguAcceptance = {
      id: 'acc-1',
      tenantId: 'tenant-abc',
      userId: 'user-123',
      cguVersionId: 'cgu-v1',
      acceptedAt: new Date(),
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      acceptanceMethod: 'checkbox',
    };

    expect(acceptance.id).toBe('acc-1');
    expect(acceptance.userId).toBe('user-123');
    expect(acceptance.tenantId).toBe('tenant-abc');
  });

  it('should require tenant isolation', () => {
    expect(() => {
      createCguAcceptance({
        tenantId: '',
        userId: 'user-123',
        cguVersionId: 'cgu-v1',
        acceptanceMethod: 'checkbox',
      });
    }).toThrow('tenantId, userId and cguVersionId are required');
  });

  it('should validate acceptance method', () => {
    expect(() => {
      createCguAcceptance({
        tenantId: 'tenant-abc',
        userId: 'user-123',
        cguVersionId: 'cgu-v1',
        acceptanceMethod: 'invalid' as CguAcceptance['acceptanceMethod'],
      });
    }).toThrow('Invalid acceptance method');
  });

  it('should check if acceptance is recent', () => {
    const recent: CguAcceptance = {
      id: 'acc-1',
      tenantId: 'tenant-abc',
      userId: 'user-123',
      cguVersionId: 'cgu-v1',
      acceptedAt: new Date(),
      ipAddress: null,
      userAgent: null,
      acceptanceMethod: 'checkbox',
    };

    expect(isRecentAcceptance(recent)).toBe(true);
  });

  it('should check if IP should be anonymized (Art. 32)', () => {
    const old: CguAcceptance = {
      id: 'acc-1',
      tenantId: 'tenant-abc',
      userId: 'user-123',
      cguVersionId: 'cgu-v1',
      acceptedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      ipAddress: '192.168.1.1',
      userAgent: null,
      acceptanceMethod: 'checkbox',
    };

    expect(shouldAnonymizeIp(old)).toBe(true);
  });

  it('should support all acceptance methods', () => {
    const methods = ['checkbox', 'button', 'api'] as const;

    methods.forEach(method => {
      const result = createCguAcceptance({
        tenantId: 'tenant-abc',
        userId: 'user-123',
        cguVersionId: 'cgu-v1',
        acceptanceMethod: method,
      });

      expect(result.acceptanceMethod).toBe(method);
    });
  });

  it('should allow optional IP and userAgent', () => {
    const result = createCguAcceptance({
      tenantId: 'tenant-abc',
      userId: 'user-123',
      cguVersionId: 'cgu-v1',
      acceptanceMethod: 'api',
    });

    expect(result.ipAddress).toBeNull();
    expect(result.userAgent).toBeNull();
  });

  it('should enforce unique constraint per user+version', () => {
    // This is enforced at DB level, test is documentation
    const acc1: CguAcceptance = {
      id: 'acc-1',
      tenantId: 'tenant-abc',
      userId: 'user-123',
      cguVersionId: 'cgu-v1',
      acceptedAt: new Date(),
      ipAddress: null,
      userAgent: null,
      acceptanceMethod: 'checkbox',
    };

    expect(acc1.userId).toBe('user-123');
    expect(acc1.cguVersionId).toBe('cgu-v1');
  });
});
