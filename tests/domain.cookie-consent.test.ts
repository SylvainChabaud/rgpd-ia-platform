/**
 * Domain Entity Tests: CookieConsent
 *
 * RGPD: ePrivacy Directive 2002/58/CE Art. 5.3
 * Classification: P1 (metadata consent)
 */

import { describe, it, expect } from '@jest/globals';
import type { CookieConsent } from '../src/domain/legal/CookieConsent';
import {
  createCookieConsent,
  hasExplicitChoice,
  isAnalyticsAllowed,
  isConsentExpired,
  isMarketingAllowed,
  toPublicCookieConsent,
} from '../src/domain/legal/CookieConsent';

describe('Domain: CookieConsent', () => {
  it('creates consent with necessary cookies always true', () => {
    const base = createCookieConsent({
      anonymousId: 'anon-123',
      analytics: false,
      marketing: false,
    });

    expect(base.necessary).toBe(true);
    expect(base.userId).toBeNull();
    expect(base.anonymousId).toBe('anon-123');
  });

  it('sets a 12-month TTL on creation', () => {
    const base = createCookieConsent({
      anonymousId: 'anon-123',
      analytics: true,
      marketing: false,
    });

    const consent: CookieConsent = {
      id: 'consent-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...base,
    };

    const daysUntilExpiry =
      (consent.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysUntilExpiry).toBeGreaterThan(300);
    expect(daysUntilExpiry).toBeLessThan(370);
  });

  it('rejects when both userId and anonymousId are provided', () => {
    expect(() =>
      createCookieConsent({
        userId: 'user-1',
        anonymousId: 'anon-1',
        analytics: false,
        marketing: false,
      })
    ).toThrow('Cannot have both userId and anonymousId');
  });

  it('rejects when neither userId nor anonymousId is provided', () => {
    expect(() =>
      createCookieConsent({
        analytics: false,
        marketing: false,
      })
    ).toThrow('Either userId or anonymousId is required');
  });

  it('detects expiration and blocks analytics/marketing', () => {
    const base = createCookieConsent({
      anonymousId: 'anon-123',
      analytics: true,
      marketing: true,
    });

    const consent: CookieConsent = {
      id: 'consent-2',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      ...base,
      expiresAt: new Date('2024-02-01T00:00:00Z'),
    };

    expect(isConsentExpired(consent)).toBe(true);
    expect(isAnalyticsAllowed(consent)).toBe(false);
    expect(isMarketingAllowed(consent)).toBe(false);
  });

  it('allows analytics/marketing when not expired', () => {
    const base = createCookieConsent({
      userId: 'user-1',
      analytics: true,
      marketing: false,
    });

    const consent: CookieConsent = {
      id: 'consent-3',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...base,
    };

    expect(isAnalyticsAllowed(consent)).toBe(true);
    expect(isMarketingAllowed(consent)).toBe(false);
  });

  it('detects explicit user choice', () => {
    const base = createCookieConsent({
      anonymousId: 'anon-456',
      analytics: false,
      marketing: true,
    });

    const consent: CookieConsent = {
      id: 'consent-4',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...base,
    };

    expect(hasExplicitChoice(consent)).toBe(true);
  });

  it('maps to public consent response', () => {
    const now = new Date();
    const base = createCookieConsent({
      anonymousId: 'anon-789',
      analytics: false,
      marketing: false,
    });

    const consent: CookieConsent = {
      id: 'consent-5',
      createdAt: now,
      updatedAt: now,
      ...base,
    };

    const publicConsent = toPublicCookieConsent(consent);
    expect(publicConsent.necessary).toBe(true);
    expect(publicConsent.savedAt).toEqual(now);
    expect(publicConsent.expiresAt).toEqual(consent.expiresAt);
  });
});
