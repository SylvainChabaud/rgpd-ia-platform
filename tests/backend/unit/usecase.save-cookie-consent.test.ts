/**
 * Use Case Tests: saveCookieConsent
 * RGPD: ePrivacy Art. 5.3
 */

import { describe, it, expect } from '@jest/globals';
import type { CookieConsentRepo } from '@/app/ports/CookieConsentRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { saveCookieConsent } from '@/app/usecases/cookies/saveCookieConsent';

function createConsentRepo(): CookieConsentRepo {
  return {
    save: async (input) => ({
      id: 'consent-1',
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      anonymousId: input.anonymousId ?? null,
      necessary: true,
      analytics: input.analytics,
      marketing: input.marketing,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000),
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    }),
  } as CookieConsentRepo;
}

describe('UseCase: saveCookieConsent', () => {
  it('saves consent for authenticated user', async () => {
    const repo = createConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await saveCookieConsent(repo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      analytics: true,
      marketing: false,
    });

    expect(result.consent.userId).toBe('user-1');
    expect(result.consent.necessary).toBe(true);
    expect(auditWriter.events).toHaveLength(1);
    expect(auditWriter.events[0].eventName).toBe('cookies.consent.saved');
  });

  it('saves consent for anonymous visitor', async () => {
    const repo = createConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    const result = await saveCookieConsent(repo, auditWriter, {
      anonymousId: 'anon-1',
      analytics: false,
      marketing: false,
    });

    expect(result.consent.anonymousId).toBe('anon-1');
    expect(result.consent.userId).toBeNull();
  });

  it('rejects when both userId and anonymousId are provided', async () => {
    const repo = createConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      saveCookieConsent(repo, auditWriter, {
        userId: 'user-1',
        anonymousId: 'anon-1',
        analytics: false,
        marketing: false,
      })
    ).rejects.toThrow('Cannot have both userId and anonymousId');
  });

  it('rejects when neither userId nor anonymousId is provided', async () => {
    const repo = createConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      saveCookieConsent(repo, auditWriter, {
        analytics: false,
        marketing: false,
      })
    ).rejects.toThrow('Either userId or anonymousId is required');
  });
});
