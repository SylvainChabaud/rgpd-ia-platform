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
  REGISTRE: 'Registre des Traitements',

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

// =============================================================================
// USER NAVIGATION LABELS (Frontend End User - EPIC 13)
// =============================================================================

/**
 * Navigation labels for End User interface
 * LOT 13.0 - Authentification & Layout User
 *
 * Classification: P0 (UI text, no personal data)
 */
export const USER_NAV_LABELS = {
  HOME: 'Accueil',
  AI_TOOLS: 'Outils IA',
  HISTORY: 'Historique',
  CONSENTS: 'Mes Consentements',
  MY_DATA: 'Mes Donnees',
  PROFILE: 'Mon Profil',
} as const;

/**
 * Footer labels for End User interface
 * LOT 13.0 - Authentification & Layout User
 *
 * RGPD Compliance:
 * - Art. 13/14: Privacy policy link required
 * - Art. 7: Cookie preference link required
 */
export const USER_FOOTER_LABELS = {
  PRIVACY: 'Politique de confidentialite',
  TERMS: 'CGU',
  RGPD_INFO: 'Informations RGPD',
  MANAGE_COOKIES: 'Gerer les cookies',
  COPYRIGHT: '© 2026 RGPD Platform. Tous droits reserves.',
} as const;

/**
 * User header labels
 * LOT 13.0 - Authentification & Layout User
 */
export const USER_HEADER_LABELS = {
  APP_TITLE: 'RGPD Platform',
  APP_SUBTITLE: 'Espace Utilisateur',
} as const;

// =============================================================================
// USER DASHBOARD LABELS (Frontend Home Page - EPIC 13)
// =============================================================================

/**
 * Dashboard labels for End User interface
 * LOT 13.0 - Authentification & Layout User
 *
 * Classification: P0 (UI text, no personal data)
 */
export const USER_DASHBOARD_LABELS = {
  // Welcome section
  WELCOME_PREFIX: 'Bienvenue',
  WELCOME_SUFFIX: '!',
  SUBTITLE: 'Votre espace personnel sur la plateforme RGPD',

  // Feature cards
  AI_TOOLS_TITLE: 'Outils IA',
  AI_TOOLS_DESC: 'Utilisez les outils IA pour analyser vos documents',
  AI_TOOLS_LOT: 'LOT 13.1',

  HISTORY_TITLE: 'Historique',
  HISTORY_DESC: 'Consultez l\'historique de vos traitements IA',
  HISTORY_LOT: 'LOT 13.2',

  CONSENTS_TITLE: 'Mes Consentements',
  CONSENTS_DESC: 'Gerez vos consentements pour les traitements IA',
  CONSENTS_LOT: 'LOT 13.3',

  MY_DATA_TITLE: 'Mes Donnees',
  MY_DATA_DESC: 'Exportez ou supprimez vos donnees (RGPD Art. 15/17/20)',
  MY_DATA_LOT: 'LOT 13.4',

  // Placeholder
  FEATURE_COMING_SOON: 'Cette fonctionnalite sera disponible prochainement.',

  // About section
  ABOUT_TITLE: 'A propos de votre espace',
  ABOUT_INTRO: 'Cet espace vous permet de :',
  ABOUT_ITEM_1: 'Utiliser les outils IA de la plateforme',
  ABOUT_ITEM_2: 'Consulter l\'historique de vos traitements',
  ABOUT_ITEM_3: 'Gerer vos consentements',
  ABOUT_ITEM_4: 'Exercer vos droits RGPD (acces, export, suppression)',
  ABOUT_FOOTER: 'Toutes vos donnees sont traitees conformement au RGPD.',
} as const;

// =============================================================================
// USER PROFILE LABELS (Frontend Profile Page - EPIC 13)
// =============================================================================

/**
 * Profile labels for End User interface
 * LOT 13.0 - Authentification & Layout User
 *
 * Classification: P0 (UI text, no personal data)
 */
export const USER_PROFILE_LABELS = {
  TITLE: 'Mon Profil',
  SUBTITLE: 'Gerez vos informations personnelles et parametres',

  // Current info section
  CURRENT_INFO_TITLE: 'Informations actuelles',
  CURRENT_INFO_DESC: 'Donnees de votre profil (lecture seule pour le moment)',
  DISPLAY_NAME_LABEL: 'Nom d\'affichage',
  DISPLAY_NAME_FALLBACK: 'Non defini',
  ROLE_LABEL: 'Role',
  ROLE_FALLBACK: 'Utilisateur',
  SCOPE_LABEL: 'Scope',
  SCOPE_FALLBACK: 'MEMBER',
  EMAIL_NOTE: 'Note : Votre email est stocke de maniere securisee (hashe) et n\'est pas affiche conformement aux principes de minimisation RGPD (Art. 5).',

  // Profile sections (placeholders)
  PERSONAL_INFO_TITLE: 'Informations personnelles',
  PERSONAL_INFO_DESC: 'Modifiez vos informations de profil',
  SECURITY_TITLE: 'Securite',
  SECURITY_DESC: 'Gerez votre mot de passe et la securite de votre compte',
  NOTIFICATIONS_TITLE: 'Notifications',
  NOTIFICATIONS_DESC: 'Configurez vos preferences de notification',
  STATUS_COMING: 'A venir',
} as const;

// =============================================================================
// LOADING LABELS
// =============================================================================

/**
 * Loading state labels
 * LOT 13.0 - Authentification & Layout User
 */
export const USER_LOADING_LABELS = {
  VERIFICATION: 'Verification...',
  LOADING: 'Chargement...',
  LOGOUT_IN_PROGRESS: 'Deconnexion...',
} as const;
