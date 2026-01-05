import type { CookieConsentRepo } from '@/app/ports/CookieConsentRepo';
import type { CookieConsent } from '@/domain/legal/CookieConsent';
import { isConsentExpired } from '@/domain/legal/CookieConsent';

/**
 * Get cookie consent use-case
 *
 * RGPD compliance:
 * - ePrivacy Directive 2002/58/CE Art. 5.3
 * - Returns null if consent expired (> 12 months)
 * - Supports both authenticated users and anonymous visitors
 *
 * LOT 10.3 — Cookie Consent Banner
 */

export type GetCookieConsentInput = {
  userId?: string;
  anonymousId?: string;
};

export type GetCookieConsentResult = {
  consent: CookieConsent | null;
  isExpired: boolean;
};

export async function getCookieConsent(
  consentRepo: CookieConsentRepo,
  input: GetCookieConsentInput
): Promise<GetCookieConsentResult> {
  // Validation: soit userId, soit anonymousId
  if (!input.userId && !input.anonymousId) {
    throw new Error('Either userId or anonymousId is required');
  }

  // Récupérer consent depuis DB
  let consent: CookieConsent | null = null;

  if (input.userId) {
    consent = await consentRepo.findByUser(input.userId);
  } else if (input.anonymousId) {
    consent = await consentRepo.findByAnonymousId(input.anonymousId);
  }

  // Vérifier expiration
  if (consent && isConsentExpired(consent)) {
    return {
      consent: null,
      isExpired: true,
    };
  }

  return {
    consent,
    isExpired: false,
  };
}
