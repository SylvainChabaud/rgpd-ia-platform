/**
 * Cookie and Storage Keys Constants
 * LOT 13.0 - Authentification & Layout User
 *
 * SECURITY: Centralizes cookie/storage key names to avoid typos
 * and facilitate security audits
 */

// =============================================================================
// COOKIE NAMES
// =============================================================================

export const COOKIE_NAMES = {
  /** JWT access token (httpOnly) */
  AUTH_TOKEN: 'auth_token',
  /** JWT refresh token (httpOnly) */
  REFRESH_TOKEN: 'refresh_token',
  /** Anonymous consent tracking ID */
  CONSENT_ID: 'cookie_consent_id',
} as const;

export type CookieName = (typeof COOKIE_NAMES)[keyof typeof COOKIE_NAMES];

// =============================================================================
// LOCAL STORAGE KEYS
// =============================================================================

export const STORAGE_KEYS = {
  /** Cookie consent preferences (fallback) */
  COOKIE_CONSENT: 'cookie_consent',
  /** Zustand auth store persistence */
  AUTH_STORAGE: 'auth-storage',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
