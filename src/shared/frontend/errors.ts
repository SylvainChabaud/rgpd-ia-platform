/**
 * Frontend Error Messages
 * LOT 13.0 - Authentification & Layout User
 *
 * Centralized error messages for frontend components.
 * Classification: P0 (technical messages, no personal data)
 */

// =============================================================================
// CONTEXT ERRORS
// =============================================================================

export const CONTEXT_ERRORS = {
  COOKIE_BANNER_OUTSIDE_PROVIDER:
    'useCookieBanner must be used within a CookieBannerProvider',
} as const;

// =============================================================================
// AUTH ERRORS
// =============================================================================

export const AUTH_ERRORS = {
  SESSION_EXPIRED: 'Votre session a expire. Veuillez vous reconnecter.',
  UNAUTHORIZED: 'Acces non autorise.',
  NETWORK_ERROR: 'Erreur reseau. Veuillez verifier votre connexion.',
} as const;

// =============================================================================
// VALIDATION ERRORS
// =============================================================================

export const VALIDATION_ERRORS = {
  DISPLAY_NAME_INVALID: 'Le nom d\'affichage contient des caracteres non autorises.',
  DISPLAY_NAME_TOO_LONG: 'Le nom d\'affichage est trop long (max 100 caracteres).',
} as const;
