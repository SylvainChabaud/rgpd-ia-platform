/**
 * UI Labels Constants
 * Centralized French labels for UI components
 *
 * Classification: P0 (UI text, no personal data)
 *
 * RGPD Articles Referenced:
 * - Art. 7: Consent (cookie banner)
 * - ePrivacy Directive 2002/58/CE Art. 5.3 (cookies)
 */

// =============================================================================
// COOKIE CONSENT BANNER LABELS
// =============================================================================

export const COOKIE_MESSAGES = {
  // Banner
  BANNER_TITLE: 'Nous utilisons des cookies',
  BANNER_DESCRIPTION: 'Pour ameliorer votre experience, nous utilisons des cookies necessaires au fonctionnement du site et, si vous l\'acceptez, des cookies analytiques pour mesurer l\'audience de maniere anonyme.',
  LEARN_MORE: 'En savoir plus',

  // Buttons
  CUSTOMIZE_BTN: 'Personnaliser',
  REJECT_ALL_BTN: 'Refuser tout',
  ACCEPT_ALL_BTN: 'Accepter tout',
  SAVE_CHOICES_BTN: 'Enregistrer mes choix',
  SAVING: 'Enregistrement...',

  // Settings panel
  SETTINGS_TITLE: 'Parametres des cookies',
  CLOSE_LABEL: 'Fermer',

  // Necessary cookies
  NECESSARY_LABEL: 'Cookies necessaires',
  ALWAYS_ACTIVE: 'Toujours actifs',
  NECESSARY_DESC: 'Requis pour le fonctionnement du site (authentification, securite CSRF). Ces cookies ne peuvent pas etre desactives.',
  NECESSARY_EXAMPLES: 'Exemples : JWT session, CSRF token',

  // Analytics cookies
  ANALYTICS_LABEL: 'Cookies analytics',
  ANALYTICS_DESC: 'Nous permettent de mesurer l\'audience du site de maniere anonyme (Plausible Analytics, privacy-first).',
  ANALYTICS_SUBLABEL: 'Aucune donnee personnelle collectee - Conformite RGPD - Hebergement UE',

  // Marketing cookies
  MARKETING_LABEL: 'Cookies marketing',
  MARKETING_DESC: 'Permettent d\'afficher des publicites personnalisees adaptees a vos interets.',
  MARKETING_SUBLABEL: 'Partages avec des tiers - Suivi publicitaire',

  // Links
  PRIVACY_POLICY_LINK: 'Politique de confidentialite',
  PRIVACY_POLICY_URL: '/politique-confidentialite',

  // Error messages
  SAVE_ERROR: 'Erreur lors de la sauvegarde de vos preferences. Veuillez reessayer.',
  NETWORK_ERROR: 'Erreur reseau. Veuillez reessayer.',
} as const;

// =============================================================================
// EVENT BADGE LABELS (Dashboard Activity Feed)
// =============================================================================

export type EventBadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface EventBadgeConfig {
  label: string;
  variant: EventBadgeVariant;
}

export const EVENT_BADGE_LABELS: Record<string, EventBadgeConfig> = {
  // User events
  'user.created': { label: 'Creation user', variant: 'default' },
  'user.updated': { label: 'Modification user', variant: 'secondary' },
  'user.suspended': { label: 'Suspension user', variant: 'destructive' },
  'user.reactivated': { label: 'Reactivation user', variant: 'outline' },

  // Consent events
  'consent.granted': { label: 'Consentement accorde', variant: 'default' },
  'consent.revoked': { label: 'Consentement revoque', variant: 'destructive' },

  // AI events
  'ai.invoked': { label: 'Job IA', variant: 'secondary' },
  'ai.completed': { label: 'Job IA termine', variant: 'default' },
  'ai.failed': { label: 'Job IA echoue', variant: 'destructive' },

  // RGPD events
  'rgpd.export.requested': { label: 'Export demande', variant: 'outline' },
  'rgpd.export.completed': { label: 'Export termine', variant: 'default' },
  'rgpd.delete.requested': { label: 'Effacement demande', variant: 'destructive' },
  'rgpd.delete.completed': { label: 'Effacement termine', variant: 'outline' },
} as const;

/**
 * Get badge config for event type with fallback
 */
export function getEventBadgeConfig(type: string): EventBadgeConfig {
  return EVENT_BADGE_LABELS[type] || { label: type, variant: 'secondary' };
}

// =============================================================================
// CONSENT STATUS LABELS
// =============================================================================

export const CONSENT_STATUS_LABELS = {
  GRANTED: 'Accorde',
  REVOKED: 'Revoque',
  PENDING: 'En attente',
} as const;

export const CONSENT_STATUS_CHART_LABELS = {
  GRANTED: 'Accordes',
  REVOKED: 'Revoques',
  PENDING: 'En attente',
} as const;

// =============================================================================
// NAVIGATION LABELS (Sidebar)
// =============================================================================

export const NAV_LABELS = {
  // Common
  DASHBOARD: 'Dashboard',
  USERS: 'Utilisateurs',
  CONSENTS: 'Consentements',
  RGPD: 'RGPD',

  // DPO specific (LOT 12.4)
  DPIA: 'DPIA',
  REGISTRE: 'Registre Art. 30',

  // User menu
  MY_ACCOUNT: 'Mon compte',
  LOGOUT: 'Deconnexion',
  DARK_MODE: 'Mode sombre',
  LIGHT_MODE: 'Mode clair',
  USER_FALLBACK: 'Utilisateur',
} as const;

export const ROLE_SUBTITLES = {
  DPO: 'DPO',
  TENANT_ADMIN: 'Tenant Admin',
  PLATFORM_ADMIN: 'Platform Admin',
} as const;

// =============================================================================
// PAGE TITLES & DESCRIPTIONS
// =============================================================================

export const PAGE_LABELS = {
  DASHBOARD: {
    TITLE: 'Dashboard',
    DESCRIPTION: 'Vue d\'ensemble de votre organisation',
  },
  ACTIVITY: {
    TITLE: 'Activite recente',
    DESCRIPTION: 'Les 50 derniers evenements de votre tenant',
    EMPTY: 'Aucune activite recente',
  },
  ERROR: {
    LOADING_TITLE: 'Erreur de chargement',
    LOADING_DESCRIPTION: 'Impossible de charger les statistiques. Veuillez reessayer.',
  },
} as const;

// =============================================================================
// STATS WIDGET LABELS
// =============================================================================

export const STATS_LABELS = {
  USERS_ACTIVE: 'Utilisateurs actifs',
  USERS_TOTAL: 'total',
  USERS_SUSPENDED: 'suspendus',

  AI_JOBS_MONTH: 'Jobs IA ce mois',
  AI_JOBS_SUCCESS: 'succes',
  AI_JOBS_FAILED: 'echecs',

  CONSENTS_ACTIVE: 'Consentements actifs',
  CONSENTS_REVOKED: 'revoques',
  CONSENTS_PENDING: 'en attente',

  EXPORTS_RGPD: 'Exports RGPD',
  EXPORTS_PENDING: 'en cours',
  EXPORTS_COMPLETED: 'termines',
} as const;
