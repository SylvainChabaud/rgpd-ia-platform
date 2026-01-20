/**
 * DPIA History Domain Entity
 * LOT 12.4 - Historique des échanges DPO/Tenant Admin
 *
 * Classification: P1 (technical metadata)
 * RGPD Compliance:
 * - Art. 5.2: Accountability - all decisions are traceable
 * - Art. 35: DPIA documentation requirements
 */

// =============================================================================
// Constants
// =============================================================================

export const DPIA_HISTORY_ACTION = {
  CREATED: 'CREATED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
} as const;

export type DpiaHistoryAction = typeof DPIA_HISTORY_ACTION[keyof typeof DPIA_HISTORY_ACTION];

// =============================================================================
// Entity
// =============================================================================

export interface DpiaHistoryEntry {
  readonly id: string;
  readonly dpiaId: string;
  readonly tenantId: string;
  readonly action: DpiaHistoryAction;
  readonly actorId: string;
  readonly actorRole: string;
  readonly comments: string | null;
  readonly rejectionReason: string | null;
  readonly createdAt: Date;
  // Optional: actor display name for UI (joined from users table)
  readonly actorDisplayName?: string;
}

// =============================================================================
// Input types
// =============================================================================

export interface CreateDpiaHistoryInput {
  dpiaId: string;
  tenantId: string;
  action: DpiaHistoryAction;
  actorId: string;
  actorRole: string;
  comments?: string;
  rejectionReason?: string;
}

// =============================================================================
// Labels for UI
// =============================================================================

export const DPIA_HISTORY_ACTION_LABELS: Record<DpiaHistoryAction, string> = {
  CREATED: 'DPIA créée',
  APPROVED: 'Approuvée par le DPO',
  REJECTED: 'Rejetée par le DPO',
  REVISION_REQUESTED: 'Révision demandée',
};

export const DPIA_HISTORY_ACTION_COLORS: Record<DpiaHistoryAction, string> = {
  CREATED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};
