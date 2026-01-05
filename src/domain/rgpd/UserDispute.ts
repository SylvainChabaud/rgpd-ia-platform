/**
 * Domain Entity: User Dispute
 *
 * RGPD Compliance: Art. 22 (Droit à l'intervention humaine)
 * Classification: P2 (métadonnées sensibles)
 *
 * Permet à un utilisateur de contester un résultat IA et demander une révision humaine.
 * Implémente le droit à ne pas faire l'objet d'une décision fondée exclusivement
 * sur un traitement automatisé.
 */

export type DisputeStatus = 'pending' | 'resolved' | 'rejected';

export interface UserDispute {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly aiJobId: string;              // Référence au job IA contesté
  readonly reason: string;               // Motif de contestation
  readonly attachmentUrl: string | null; // URL pièce jointe (optionnel)
  readonly status: DisputeStatus;
  readonly createdAt: Date;
  readonly resolvedAt: Date | null;
  readonly reviewedAt: Date | null;      // Date révision humaine
  readonly adminResponse: string | null;
  readonly reviewedBy: string | null;    // ID admin ayant traité
}

/**
 * Input pour créer une contestation
 */
export interface CreateDisputeInput {
  tenantId: string;
  userId: string;
  aiJobId: string;
  reason: string;
  attachmentUrl?: string;
}

/**
 * Constantes business rules
 */
export const MIN_REASON_LENGTH = 10;
export const MAX_REASON_LENGTH = 2000;
export const MAX_DISPUTE_AGE_DAYS = 90; // Durée maximale pour contester (3 mois)

/**
 * Factory: créer une nouvelle contestation
 */
export function createDispute(
  input: CreateDisputeInput
): Omit<UserDispute, 'id' | 'createdAt' | 'resolvedAt' | 'reviewedAt' | 'adminResponse' | 'reviewedBy' | 'status'> {
  // Validation: champs obligatoires
  if (!input.tenantId || !input.userId || !input.aiJobId) {
    throw new Error('tenantId, userId and aiJobId are required');
  }

  // Validation: longueur motif
  if (input.reason.length < MIN_REASON_LENGTH) {
    throw new Error(`Reason must be at least ${MIN_REASON_LENGTH} characters`);
  }

  if (input.reason.length > MAX_REASON_LENGTH) {
    throw new Error(`Reason cannot exceed ${MAX_REASON_LENGTH} characters`);
  }

  return {
    tenantId: input.tenantId,
    userId: input.userId,
    aiJobId: input.aiJobId,
    reason: input.reason,
    attachmentUrl: input.attachmentUrl ?? null,
  };
}

/**
 * Business rule: vérifier si contestation peut être soumise
 */
export function canDisputeJob(aiJobCompletedAt: Date): boolean {
  const now = new Date();
  const maxDate = new Date(aiJobCompletedAt);
  maxDate.setDate(maxDate.getDate() + MAX_DISPUTE_AGE_DAYS);
  return now <= maxDate;
}

/**
 * Business rule: vérifier si contestation est en attente
 */
export function isDisputePending(dispute: UserDispute): boolean {
  return dispute.status === 'pending';
}

/**
 * Business rule: vérifier si contestation est résolue
 */
export function isDisputeResolved(dispute: UserDispute): boolean {
  return dispute.status === 'resolved';
}

/**
 * Helper: mapper contestation vers format API public
 */
export function toPublicDispute(dispute: UserDispute): {
  id: string;
  aiJobId: string;
  reason: string;
  status: DisputeStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  adminResponse: string | null;
} {
  return {
    id: dispute.id,
    aiJobId: dispute.aiJobId,
    reason: dispute.reason,
    status: dispute.status,
    createdAt: dispute.createdAt,
    resolvedAt: dispute.resolvedAt,
    adminResponse: dispute.adminResponse,
  };
}

/**
 * Helper: créer événement audit (RGPD-safe, pas de PII)
 */
export function toAuditEvent(dispute: UserDispute, eventType: string): {
  eventType: string;
  tenantId: string;
  actorId: string;
  metadata: {
    disputeId: string;
    aiJobId: string;
    status: DisputeStatus;
    hasAttachment: boolean;
  };
} {
  return {
    eventType,
    tenantId: dispute.tenantId,
    actorId: dispute.userId,
    metadata: {
      disputeId: dispute.id,
      aiJobId: dispute.aiJobId,
      status: dispute.status,
      hasAttachment: dispute.attachmentUrl !== null,
    },
  };
}
