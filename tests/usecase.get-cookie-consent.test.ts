/**
 * Use Case Tests: getCookieConsent
 * RGPD: ePrivacy Art. 5.3
 */

import { describe, it, expect } from '@jest/globals';
import type { CookieConsentRepo } from '../src/app/ports/CookieConsentRepo';
import { getCookieConsent } from '../src/app/usecases/cookies/getCookieConsent';

describe('UseCase: getCookieConsent', () => {
  it('retrieves consent by userId', async () => {
    const repo = {
      findByUser: async () => ({
        id: 'consent-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        anonymousId: null,
        necessary: true,
        analytics: true,
        marketing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
        ipAddress: null,
        userAgent: null,
      }),
    } as unknown as CookieConsentRepo;

    const result = await getCookieConsent(repo, { userId: 'user-1' });
    expect(result.consent?.userId).toBe('user-1');
    expect(result.isExpired).toBe(false);
  });

  it('retrieves consent by anonymousId', async () => {
    const repo = {
      findByAnonymousId: async () => ({
        id: 'consent-2',
        tenantId: null,
        userId: null,
        anonymousId: 'anon-1',
        necessary: true,
        analytics: false,
        marketing: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
        ipAddress: null,
        userAgent: null,
      }),
    } as unknown as CookieConsentRepo;

    const result = await getCookieConsent(repo, { anonymousId: 'anon-1' });
    expect(result.consent?.anonymousId).toBe('anon-1');
    expect(result.isExpired).toBe(false);
  });

  it('returns null when consent is expired', async () => {
    const repo = {
      findByUser: async () => ({
        id: 'consent-3',
        tenantId: 'tenant-1',
        userId: 'user-1',
        anonymousId: null,
        necessary: true,
        analytics: true,
        marketing: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() - 1000),
        ipAddress: null,
        userAgent: null,
      }),
    } as unknown as CookieConsentRepo;

    const result = await getCookieConsent(repo, { userId: 'user-1' });
    expect(result.consent).toBeNull();
    expect(result.isExpired).toBe(true);
  });

  it('requires userId or anonymousId', async () => {
    const repo = {} as unknown as CookieConsentRepo;

    await expect(getCookieConsent(repo, {})).rejects.toThrow(
      'Either userId or anonymousId is required'
    );
  });
});
