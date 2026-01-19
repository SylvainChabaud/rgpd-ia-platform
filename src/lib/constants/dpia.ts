/**
 * DPIA Constants
 * LOT 12.4 - DPO Features
 *
 * Centralized constants for DPIA (Data Protection Impact Assessment)
 * management across the application.
 */

// =========================
// DPIA Status
// =========================

/**
 * DPIA validation status values
 * Used across DPIA pages, badges, and API hooks
 */
export const DPIA_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type DpiaStatusValue = (typeof DPIA_STATUS)[keyof typeof DPIA_STATUS];

/**
 * DPIA status labels in French (short form)
 */
export const DPIA_STATUS_LABELS: Record<DpiaStatusValue, string> = {
  [DPIA_STATUS.PENDING]: 'En attente',
  [DPIA_STATUS.APPROVED]: 'Approuvée',
  [DPIA_STATUS.REJECTED]: 'Rejetée',
};

/**
 * DPIA status labels in French (full form for detail pages)
 */
export const DPIA_STATUS_FULL_LABELS: Record<DpiaStatusValue, string> = {
  [DPIA_STATUS.PENDING]: 'En attente de validation DPO',
  [DPIA_STATUS.APPROVED]: 'Approuvée par le DPO',
  [DPIA_STATUS.REJECTED]: 'Rejetée par le DPO',
};

/**
 * DPIA status badge styles (Tailwind classes)
 */
export const DPIA_STATUS_BADGE_STYLES: Record<DpiaStatusValue, string> = {
  [DPIA_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [DPIA_STATUS.APPROVED]: 'bg-green-100 text-green-800 border-green-200',
  [DPIA_STATUS.REJECTED]: 'bg-red-100 text-red-800 border-red-200',
};

/**
 * DPIA status border colors for cards (Tailwind classes)
 */
export const DPIA_STATUS_BORDER_COLORS: Record<DpiaStatusValue, string> = {
  [DPIA_STATUS.PENDING]: 'border-yellow-300',
  [DPIA_STATUS.APPROVED]: 'border-green-300',
  [DPIA_STATUS.REJECTED]: 'border-red-300',
};

// =========================
// Validation Constants
// =========================

/**
 * Minimum characters required for rejection reason
 */
export const DPIA_MIN_REJECTION_REASON_LENGTH = 10;

// =========================
// Cache/Stale Times
// =========================

/**
 * Stale time for DPIA list queries (30 seconds)
 */
export const DPIA_STALE_TIME_MS = 30_000;

/**
 * Stale time for DPIA stats queries (60 seconds)
 */
export const DPIA_STATS_STALE_TIME_MS = 60_000;

// =========================
// Risk Level (DPIA-specific)
// =========================

/**
 * Risk level labels in French (short)
 */
export const DPIA_RISK_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
  CRITICAL: 'Critique',
};

/**
 * Risk level labels in French (full)
 */
export const DPIA_RISK_FULL_LABELS: Record<string, string> = {
  LOW: 'Risque faible',
  MEDIUM: 'Risque moyen',
  HIGH: 'Risque élevé',
  CRITICAL: 'Risque critique',
};

/**
 * Risk level badge styles (Tailwind classes)
 */
export const DPIA_RISK_BADGE_STYLES: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

// =========================
// Likelihood/Impact (Risk Matrix)
// =========================

/**
 * Likelihood labels in French
 */
export const DPIA_LIKELIHOOD_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
};

/**
 * Impact labels in French
 */
export const DPIA_IMPACT_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
};

/**
 * Likelihood badge styles (Tailwind classes)
 */
export const DPIA_LIKELIHOOD_BADGE_STYLES: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
};

/**
 * Impact badge styles (Tailwind classes)
 */
export const DPIA_IMPACT_BADGE_STYLES: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
};

// =========================
// Data Classification (DPIA-specific display)
// =========================

/**
 * Data classification labels with prefix (for badges)
 */
export const DPIA_DATA_CLASS_LABELS: Record<string, string> = {
  P0: 'P0 - Public',
  P1: 'P1 - Interne',
  P2: 'P2 - Confidentiel',
  P3: 'P3 - Sensible',
};

/**
 * Data classification badge styles (Tailwind classes)
 */
export const DPIA_DATA_CLASS_BADGE_STYLES: Record<string, string> = {
  P0: 'bg-slate-100 text-slate-800',
  P1: 'bg-blue-100 text-blue-800',
  P2: 'bg-orange-100 text-orange-800',
  P3: 'bg-red-100 text-red-800',
};

// =========================
// Active Status
// =========================

/**
 * Active status labels in French
 */
export const DPIA_ACTIVE_STATUS_LABELS = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
} as const;
