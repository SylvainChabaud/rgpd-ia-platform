/**
 * Domain Entity: Cookie Consent
 *
 * RGPD Compliance: ePrivacy Directive 2002/58/CE Art. 5.3
 * Classification: P1 (métadonnées consentement)
 *
 * Gère les préférences de cookies des utilisateurs (authentifiés ou anonymes).
 * TTL: 12 mois (standard CNIL)
 */

export interface CookieConsent {
  readonly id: string;
  readonly tenantId: string | null;
  readonly userId: string | null;        // NULL si anonyme
  readonly anonymousId: string | null;   // UUID tracking anonyme
  readonly necessary: boolean;            // Toujours TRUE (cookies fonctionnels)
  readonly analytics: boolean;            // Opt-in (Plausible Analytics)
  readonly marketing: boolean;            // Opt-in (publicité)
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt: Date;               // TTL 12 mois
  readonly ipAddress: string | null;      // Anonymisée après 7j (EPIC 8)
  readonly userAgent: string | null;      // User-agent browser (optionnel)
}

/**
 * Input pour créer un nouveau consentement cookie
 */
export interface CreateCookieConsentInput {
  tenantId?: string;
  userId?: string;
  anonymousId?: string;
  analytics: boolean;
  marketing: boolean;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Input pour mettre à jour un consentement existant
 */
export interface UpdateCookieConsentInput {
  analytics?: boolean;
  marketing?: boolean;
}

/**
 * Constantes business rules
 */
export const COOKIE_CONSENT_TTL_MONTHS = 12;  // Durée validité consentement
export const NECESSARY_COOKIES_ALWAYS_TRUE = true;  // Non modifiable par user

/**
 * Factory: créer un nouveau consentement cookie
 *
 * Business rules:
 * - Nécessaires = toujours TRUE
 * - TTL = 12 mois
 * - Soit userId, soit anonymousId (mais pas les deux)
 */
export function createCookieConsent(
  input: CreateCookieConsentInput
): Omit<CookieConsent, 'id' | 'createdAt' | 'updatedAt'> {
  // Validation: soit user, soit anonymous
  if (!input.userId && !input.anonymousId) {
    throw new Error('Either userId or anonymousId is required');
  }
  if (input.userId && input.anonymousId) {
    throw new Error('Cannot have both userId and anonymousId');
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + COOKIE_CONSENT_TTL_MONTHS);

  return {
    tenantId: input.tenantId ?? null,
    userId: input.userId ?? null,
    anonymousId: input.anonymousId ?? null,
    necessary: NECESSARY_COOKIES_ALWAYS_TRUE,
    analytics: input.analytics,
    marketing: input.marketing,
    expiresAt,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  };
}

/**
 * Business rule: vérifier si consentement expiré
 */
export function isConsentExpired(consent: CookieConsent): boolean {
  return new Date() > consent.expiresAt;
}

/**
 * Business rule: vérifier si analytics autorisé
 */
export function isAnalyticsAllowed(consent: CookieConsent | null): boolean {
  if (!consent) return false;
  if (isConsentExpired(consent)) return false;
  return consent.analytics === true;
}

/**
 * Business rule: vérifier si marketing autorisé
 */
export function isMarketingAllowed(consent: CookieConsent | null): boolean {
  if (!consent) return false;
  if (isConsentExpired(consent)) return false;
  return consent.marketing === true;
}

/**
 * Business rule: déterminer si user a fait un choix explicite
 */
export function hasExplicitChoice(consent: CookieConsent): boolean {
  // Si au moins un cookie optionnel est accepté, c'est un choix explicite
  return consent.analytics === true || consent.marketing === true;
}

/**
 * Helper: mapper consentement vers format API public
 * (exclure données internes comme ipAddress)
 */
export function toPublicCookieConsent(consent: CookieConsent): {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  savedAt: Date;
  expiresAt: Date;
} {
  return {
    necessary: consent.necessary,
    analytics: consent.analytics,
    marketing: consent.marketing,
    savedAt: consent.createdAt,
    expiresAt: consent.expiresAt,
  };
}
