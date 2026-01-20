/**
 * UI Messages Constants
 * LOT 12.4 - DPO Features
 *
 * Centralized toast messages, error messages, and loading states
 * for consistent user feedback across the application.
 */

// =========================
// Toast Messages
// =========================

/**
 * Toast notification messages in French
 * Used with sonner toast() calls
 */
export const TOAST_MESSAGES = {
  // Export operations
  PDF_DOWNLOAD_SUCCESS: 'Export PDF en cours de téléchargement',
  PDF_DOWNLOAD_ERROR: "Erreur lors de l'export PDF",
  CSV_DOWNLOAD_SUCCESS: 'Export CSV en cours de téléchargement',
  CSV_DOWNLOAD_ERROR: "Erreur lors de l'export CSV",

  // DPIA validation
  DPIA_APPROVED_SUCCESS: 'DPIA approuvée avec succès',
  DPIA_REJECTED_SUCCESS: 'DPIA rejetée',
  DPIA_VALIDATION_ERROR: 'Erreur lors de la validation',
  DPIA_REJECTION_ERROR: 'Erreur lors du rejet',
  DPIA_MIN_REJECTION_LENGTH: 'Le motif de rejet doit contenir au moins 10 caractères',
} as const;

// =========================
// API Error Messages
// =========================

/**
 * API error messages in French
 * Used in apiClient and hooks for consistent error handling
 */
export const API_ERROR_MESSAGES = {
  UNAUTHENTICATED: 'Non authentifié',
  SERVER_ERROR: 'Erreur serveur',
  UNKNOWN_ERROR: 'Erreur inconnue',
  DOWNLOAD_ERROR: 'Erreur lors du téléchargement',
  TIMEOUT: 'Délai d\'attente dépassé',
  TENANT_REQUIRED: 'Tenant ID required',
  DPIA_CREATE_FAILED: 'Failed to create DPIA',
  DPIA_VALIDATE_FAILED: 'Failed to validate DPIA',
  DPIA_UPDATE_FAILED: 'Failed to update DPIA',
  DPIA_FETCH_FAILED: 'Failed to fetch DPIA',
} as const;

// =========================
// Loading Messages
// =========================

/**
 * Loading state messages in French
 * Used during data fetching
 */
export const LOADING_MESSAGES = {
  DPIA_LIST: 'Chargement des DPIA...',
  DPIA_DETAIL: 'Chargement de la DPIA...',
  REGISTRE: 'Chargement du registre...',
} as const;

// =========================
// Error States
// =========================

/**
 * Error state titles and descriptions in French
 * Used for error display cards
 */
export const ERROR_STATES = {
  LOADING_ERROR: {
    title: 'Erreur de chargement',
    dpia: 'Impossible de charger les DPIA.',
    registre: 'Impossible de charger le registre.',
  },
  NOT_FOUND: {
    title: 'DPIA non trouvée',
    description: "Cette DPIA n'existe pas ou vous n'avez pas les droits d'accès.",
  },
  RETRY_BUTTON: 'Réessayer',
  BACK_TO_LIST: 'Retour à la liste',
} as const;

// =========================
// Empty States
// =========================

/**
 * Empty state messages in French
 * Used when no data is available
 */
export const EMPTY_STATES = {
  DPIA_LIST: {
    title: 'Aucune DPIA à afficher',
    description: "Les DPIA sont créées automatiquement lors de l'activation d'un traitement à risque élevé.",
  },
  REGISTRE: {
    title: 'Aucun traitement enregistré',
    description: 'Activez des finalités pour les voir apparaître ici.',
  },
  RISKS: {
    title: 'Aucun risque identifié',
  },
} as const;

// =========================
// Fallback Values
// =========================

/**
 * Fallback text values
 * Used when data is missing or not specified
 */
export const FALLBACK_TEXT = {
  NOT_AVAILABLE: 'N/A',
  NOT_SPECIFIED: 'Non spécifié',
  UNKNOWN: 'Inconnu',
  NOT_REQUIRED: 'Non requise',
} as const;
