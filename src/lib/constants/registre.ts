/**
 * Registre Art. 30 Constants
 * LOT 12.4 - DPO Features
 *
 * Centralized constants for Registre des Traitements (Art. 30 RGPD)
 * management across the application.
 */

// =========================
// Cache/Stale Times
// =========================

/**
 * Stale time for Registre queries (60 seconds)
 */
export const REGISTRE_STALE_TIME_MS = 60_000;

// =========================
// Export Filenames
// =========================

/**
 * Default filename for CSV export
 */
export const REGISTRE_CSV_FILENAME = 'registre-art30.csv';

/**
 * Default filename for PDF/HTML export
 */
export const REGISTRE_PDF_FILENAME = 'registre-art30.html';

// =========================
// Lawful Basis Labels (with RGPD references)
// =========================

/**
 * Lawful basis labels in French with RGPD article references
 * Used in Registre table display
 */
export const REGISTRE_LAWFUL_BASIS_LABELS: Record<string, string> = {
  consent: 'Consentement (Art. 6.1.a)',
  contract: 'Exécution contrat (Art. 6.1.b)',
  legal_obligation: 'Obligation légale (Art. 6.1.c)',
  vital_interest: 'Intérêts vitaux (Art. 6.1.d)',
  public_interest: 'Intérêt public (Art. 6.1.e)',
  legitimate_interest: 'Intérêt légitime (Art. 6.1.f)',
};

// =========================
// Category Labels
// =========================

/**
 * Category labels in French
 * Used in Registre statistics and table display
 */
export const REGISTRE_CATEGORY_LABELS: Record<string, string> = {
  ai_processing: 'Traitement IA',
  data_analysis: 'Analyse données',
  marketing: 'Marketing',
  security: 'Sécurité',
  legal_compliance: 'Conformité légale',
  customer_service: 'Service client',
  research: 'Recherche',
  other: 'Autre',
};

// =========================
// Category Chart Colors
// =========================

/**
 * Category colors for charts (Tailwind classes)
 */
export const REGISTRE_CATEGORY_COLORS: Record<string, string> = {
  ai_processing: 'bg-blue-500',
  data_analysis: 'bg-purple-500',
  marketing: 'bg-pink-500',
  security: 'bg-green-500',
  other: 'bg-gray-500',
};

// =========================
// Lawful Basis Chart Colors
// =========================

/**
 * Lawful basis colors for charts (Tailwind classes)
 */
export const REGISTRE_LAWFUL_BASIS_COLORS: Record<string, string> = {
  consent: 'bg-blue-500',
  contract: 'bg-green-500',
  legitimate_interest: 'bg-orange-500',
  legal_obligation: 'bg-purple-500',
};
