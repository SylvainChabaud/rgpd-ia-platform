/**
 * Domain Entity: User Dispute
 *
 * RGPD Compliance: Art. 22 (Décision individuelle automatisée)
 * Classification: P1 (métadonnées contestation)
 *
 * Gère les contestations des utilisateurs concernant des décisions
 * prises automatiquement par l'IA (droit à révision humaine).
 */

/**
 * Dispute status constants
 */
export const DISPUTE_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
} as const;

export type DisputeStatus = (typeof DISPUTE_STATUS)[keyof typeof DISPUTE_STATUS];

export interface UserDispute {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly aiJobId: string | null;        // Référence au job IA contesté (optionnel)
  readonly reason: string;                // Motif de contestation (obligatoire)
  readonly attachmentUrl: string | null;  // URL pièce jointe (chiffrée, TTL)
  readonly status: DisputeStatus;
  readonly adminResponse: string | null;  // Réponse après révision humaine
  readonly reviewedBy: string | null;     // ID admin ayant traité
  readonly createdAt: Date;
  readonly reviewedAt: Date | null;
  readonly resolvedAt: Date | null;
  readonly metadata?: Record<string, unknown>;  // Contexte additionnel
}

/**
 * Input pour soumettre une contestation
 */
export interface CreateUserDisputeInput {
  tenantId: string;
  userId: string;
  aiJobId?: string;
  reason: string;
  attachmentUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input pour réviser une contestation (admin)
 */
export interface ReviewDisputeInput {
  status: 'under_review' | 'resolved' | 'rejected';
  adminResponse?: string;
  reviewedBy: string;
}

/**
 * Constantes business rules
 */
export const MIN_REASON_LENGTH = 20;      // Raison minimale pour contestation
export const MAX_REASON_LENGTH = 5000;    // Limite contestation détaillée
export const REVIEW_SLA_DAYS = 30;        // Délai révision RGPD (1 mois)
export const ATTACHMENT_TTL_DAYS = 90;    // TTL pièce jointe (3 mois)

/**
 * Factory: créer une nouvelle contestation
 *
 * Business rules:
 * - Raison obligatoire et détaillée
 * - Pièce jointe optionnelle (chiffrée, TTL 90j)
 * - Status initial = pending
 * - SLA révision = 30 jours (Art. 12.3)
 */
export function createUserDispute(
  input: CreateUserDisputeInput
): Omit<UserDispute, 'id' | 'createdAt' | 'reviewedAt' | 'resolvedAt'> {
  // Validation: champs obligatoires
  if (!input.tenantId || !input.userId) {
    throw new Error('tenantId and userId are required');
  }

  // Validation: raison suffisamment détaillée
  if (!input.reason || input.reason.trim().length < MIN_REASON_LENGTH) {
    throw new Error(`Reason must be at least ${MIN_REASON_LENGTH} characters`);
  }

  if (input.reason.length > MAX_REASON_LENGTH) {
    throw new Error(`Reason must not exceed ${MAX_REASON_LENGTH} characters`);
  }

  return {
    tenantId: input.tenantId,
    userId: input.userId,
    aiJobId: input.aiJobId ?? null,
    reason: input.reason.trim(),
    attachmentUrl: input.attachmentUrl ?? null,
    status: DISPUTE_STATUS.PENDING,
    adminResponse: null,
    reviewedBy: null,
    metadata: input.metadata,
  };
}

/**
 * Business rule: réviser une contestation (admin)
 */
export function reviewDispute(
  dispute: UserDispute,
  review: ReviewDisputeInput
): Omit<UserDispute, 'id' | 'createdAt'> {
  // Validation: contestation doit être pending ou under_review
  if (dispute.status !== DISPUTE_STATUS.PENDING && dispute.status !== DISPUTE_STATUS.UNDER_REVIEW) {
    throw new Error('Only pending or under_review disputes can be updated');
  }

  // Validation: réponse admin obligatoire si resolved ou rejected
  if ((review.status === DISPUTE_STATUS.RESOLVED || review.status === DISPUTE_STATUS.REJECTED) && !review.adminResponse) {
    throw new Error('Admin response is required when resolving or rejecting a dispute');
  }

  const now = new Date();
  const isResolved = review.status === DISPUTE_STATUS.RESOLVED || review.status === DISPUTE_STATUS.REJECTED;

  return {
    ...dispute,
    status: review.status,
    adminResponse: review.adminResponse ?? dispute.adminResponse,
    reviewedBy: review.reviewedBy,
    reviewedAt: now,
    resolvedAt: isResolved ? now : dispute.resolvedAt,
  };
}

/**
 * Business rule: vérifier si SLA dépassé (> 30 jours sans réponse)
 */
export function isSlaExceeded(dispute: UserDispute): boolean {
  if (dispute.status === DISPUTE_STATUS.RESOLVED || dispute.status === DISPUTE_STATUS.REJECTED) return false;

  const slaDate = new Date(dispute.createdAt);
  slaDate.setDate(slaDate.getDate() + REVIEW_SLA_DAYS);
  return new Date() > slaDate;
}

/**
 * Business rule: calculer jours restants avant SLA
 */
export function getDaysUntilSla(dispute: UserDispute): number {
  if (dispute.status === DISPUTE_STATUS.RESOLVED || dispute.status === DISPUTE_STATUS.REJECTED) return 0;

  const slaDate = new Date(dispute.createdAt);
  slaDate.setDate(slaDate.getDate() + REVIEW_SLA_DAYS);

  const diffMs = slaDate.getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Business rule: vérifier si pièce jointe expirée (> 90 jours)
 */
export function isAttachmentExpired(dispute: UserDispute): boolean {
  if (!dispute.attachmentUrl) return false;

  const expiryDate = new Date(dispute.createdAt);
  expiryDate.setDate(expiryDate.getDate() + ATTACHMENT_TTL_DAYS);
  return new Date() > expiryDate;
}

/**
 * Business rule: déterminer si contestation résolue positivement
 */
export function isDisputeResolved(dispute: UserDispute): boolean {
  return dispute.status === DISPUTE_STATUS.RESOLVED;
}

/**
 * Business rule: déterminer si révision humaine effectuée
 */
export function hasHumanReview(dispute: UserDispute): boolean {
  return dispute.reviewedBy !== null && dispute.reviewedAt !== null;
}

/**
 * Helper: mapper contestation vers format API public
 * (exclure URL pièce jointe si expirée)
 */
export function toPublicUserDispute(dispute: UserDispute): {
  id: string;
  aiJobId: string | null;
  reason: string;
  status: DisputeStatus;
  adminResponse: string | null;
  hasAttachment: boolean;
  attachmentExpired: boolean;
  createdAt: Date;
  reviewedAt: Date | null;
  resolvedAt: Date | null;
} {
  return {
    id: dispute.id,
    aiJobId: dispute.aiJobId,
    reason: dispute.reason,
    status: dispute.status,
    adminResponse: dispute.adminResponse,
    hasAttachment: dispute.attachmentUrl !== null,
    attachmentExpired: isAttachmentExpired(dispute),
    createdAt: dispute.createdAt,
    reviewedAt: dispute.reviewedAt,
    resolvedAt: dispute.resolvedAt,
  };
}

/**
 * Helper: créer événement audit (RGPD-safe)
 */
export function toAuditEvent(
  dispute: UserDispute,
  eventType: 'created' | 'reviewed' | 'resolved'
): {
  eventType: string;
  tenantId: string;
  actorId: string;
  metadata: Record<string, unknown>;
} {
  return {
    eventType: `dispute.${eventType}`,
    tenantId: dispute.tenantId,
    actorId: eventType === 'created' ? dispute.userId : (dispute.reviewedBy ?? 'system'),
    metadata: {
      disputeId: dispute.id,
      aiJobId: dispute.aiJobId,
      status: dispute.status,
      hasAttachment: dispute.attachmentUrl !== null,
      slaExceeded: isSlaExceeded(dispute),
      humanReviewCompleted: hasHumanReview(dispute),
    },
  };
}
