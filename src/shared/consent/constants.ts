/**
 * Consent Constants
 * LOT 12.2 - Consent Management
 *
 * Centralized constants for consent status across the application.
 * Used in API routes, hooks, and UI components.
 */

// =========================
// Consent Status
// =========================

/**
 * Consent status values
 * - GRANTED: User has given consent
 * - REVOKED: User has revoked consent
 * - PENDING: No consent record (implicit pending)
 */
export const CONSENT_STATUS = {
  GRANTED: 'granted',
  REVOKED: 'revoked',
  PENDING: 'pending',
} as const;

export type ConsentStatus = (typeof CONSENT_STATUS)[keyof typeof CONSENT_STATUS];

// =========================
// Consent Status Labels (French)
// =========================

export const CONSENT_STATUS_LABELS: Record<ConsentStatus, string> = {
  [CONSENT_STATUS.GRANTED]: 'Accordé',
  [CONSENT_STATUS.REVOKED]: 'Révoqué',
  [CONSENT_STATUS.PENDING]: 'En attente',
};

// =========================
// Consent Status Badge Styles (Tailwind)
// =========================

export const CONSENT_STATUS_BADGE_STYLES: Record<ConsentStatus, string> = {
  [CONSENT_STATUS.GRANTED]: 'bg-green-100 text-green-800 border-green-200',
  [CONSENT_STATUS.REVOKED]: 'bg-red-100 text-red-800 border-red-200',
  [CONSENT_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

// =========================
// Consent Filter Options
// =========================

/**
 * Filter options for consent list views
 * Includes 'all' option for no filter
 */
export const CONSENT_FILTER_OPTIONS = {
  ALL: 'all',
  ...CONSENT_STATUS,
} as const;

export type ConsentFilterOption = (typeof CONSENT_FILTER_OPTIONS)[keyof typeof CONSENT_FILTER_OPTIONS];

// =========================
// Consent Source
// =========================

/**
 * Source of consent action
 * - USER: Action initiated by the user
 * - ADMIN: Action initiated by an admin
 * - SYSTEM: Action initiated automatically by the system
 */
export const CONSENT_SOURCE = {
  USER: 'user',
  ADMIN: 'admin',
  SYSTEM: 'system',
} as const;

export type ConsentSource = (typeof CONSENT_SOURCE)[keyof typeof CONSENT_SOURCE];

// =========================
// Consent Source Labels (French)
// =========================

export const CONSENT_SOURCE_LABELS: Record<ConsentSource, string> = {
  [CONSENT_SOURCE.USER]: 'Utilisateur',
  [CONSENT_SOURCE.ADMIN]: 'Admin',
  [CONSENT_SOURCE.SYSTEM]: 'Système',
};
