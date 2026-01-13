/**
 * Domain Entity: User Opposition
 *
 * RGPD Compliance: Art. 21 (Droit d'opposition)
 * Classification: P1 (métadonnées opposition)
 *
 * Gère les oppositions des utilisateurs à certains traitements.
 * Un utilisateur peut s'opposer au traitement de ses données pour des
 * raisons tenant à sa situation particulière (sauf obligations légales).
 */

/**
 * Opposition status constants
 */
export const OPPOSITION_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const;

export type OppositionStatus = (typeof OPPOSITION_STATUS)[keyof typeof OPPOSITION_STATUS];

/**
 * Treatment type constants
 */
export const TREATMENT_TYPE = {
  ANALYTICS: 'analytics',
  MARKETING: 'marketing',
  PROFILING: 'profiling',
  AI_INFERENCE: 'ai_inference',
  NEWSLETTER: 'newsletter',
} as const;

export type TreatmentType = (typeof TREATMENT_TYPE)[keyof typeof TREATMENT_TYPE];

export interface UserOpposition {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly treatmentType: TreatmentType;  // Type de traitement contesté
  readonly reason: string;                // Motif de l'opposition (obligatoire)
  readonly status: OppositionStatus;
  readonly adminResponse: string | null;  // Réponse admin si reviewed/accepted/rejected
  readonly reviewedBy: string | null;     // ID admin ayant traité
  readonly createdAt: Date;
  readonly reviewedAt: Date | null;
  readonly metadata?: Record<string, unknown>;  // Contexte additionnel
}

/**
 * Input pour soumettre une opposition
 */
export interface CreateUserOppositionInput {
  tenantId: string;
  userId: string;
  treatmentType: TreatmentType;
  reason: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input pour traiter une opposition (admin)
 */
export interface ReviewOppositionInput {
  status: 'accepted' | 'rejected';
  adminResponse: string;
  reviewedBy: string;
}

/**
 * Constantes business rules
 */
export const MIN_REASON_LENGTH = 10;      // Raison minimale pour opposition
export const MAX_REASON_LENGTH = 2000;    // Limite anti-spam
export const RESPONSE_SLA_DAYS = 30;      // Délai réponse RGPD (1 mois)

/**
 * Factory: créer une nouvelle opposition
 *
 * Business rules:
 * - Raison obligatoire et suffisamment détaillée
 * - Status initial = pending
 * - SLA réponse = 30 jours (Art. 12.3)
 */
export function createUserOpposition(
  input: CreateUserOppositionInput
): Omit<UserOpposition, 'id' | 'createdAt' | 'reviewedAt'> {
  // Validation: champs obligatoires
  if (!input.tenantId || !input.userId || !input.treatmentType) {
    throw new Error('tenantId, userId and treatmentType are required');
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
    treatmentType: input.treatmentType,
    reason: input.reason.trim(),
    status: OPPOSITION_STATUS.PENDING,
    adminResponse: null,
    reviewedBy: null,
    metadata: input.metadata,
  };
}

/**
 * Business rule: traiter une opposition (admin)
 */
export function reviewOpposition(
  opposition: UserOpposition,
  review: ReviewOppositionInput
): Omit<UserOpposition, 'id' | 'createdAt'> {
  // Validation: opposition doit être pending
  if (opposition.status !== OPPOSITION_STATUS.PENDING) {
    throw new Error('Only pending oppositions can be reviewed');
  }

  // Validation: réponse admin obligatoire
  if (!review.adminResponse || review.adminResponse.trim().length < MIN_REASON_LENGTH) {
    throw new Error('Admin response is required and must be detailed');
  }

  return {
    ...opposition,
    status: review.status,
    adminResponse: review.adminResponse.trim(),
    reviewedBy: review.reviewedBy,
    reviewedAt: new Date(),
  };
}

/**
 * Business rule: vérifier si SLA dépassé (> 30 jours sans réponse)
 */
export function isSlaExceeded(opposition: UserOpposition): boolean {
  if (opposition.status !== OPPOSITION_STATUS.PENDING) return false;

  const slaDate = new Date(opposition.createdAt);
  slaDate.setDate(slaDate.getDate() + RESPONSE_SLA_DAYS);
  return new Date() > slaDate;
}

/**
 * Business rule: calculer jours restants avant SLA
 */
export function getDaysUntilSla(opposition: UserOpposition): number {
  if (opposition.status !== OPPOSITION_STATUS.PENDING) return 0;

  const slaDate = new Date(opposition.createdAt);
  slaDate.setDate(slaDate.getDate() + RESPONSE_SLA_DAYS);

  const diffMs = slaDate.getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Business rule: déterminer si opposition acceptée
 */
export function isOppositionAccepted(opposition: UserOpposition): boolean {
  return opposition.status === OPPOSITION_STATUS.ACCEPTED;
}

/**
 * Helper: mapper opposition vers format API public
 */
export function toPublicUserOpposition(opposition: UserOpposition): {
  id: string;
  treatmentType: TreatmentType;
  reason: string;
  status: OppositionStatus;
  adminResponse: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
} {
  return {
    id: opposition.id,
    treatmentType: opposition.treatmentType,
    reason: opposition.reason,
    status: opposition.status,
    adminResponse: opposition.adminResponse,
    createdAt: opposition.createdAt,
    reviewedAt: opposition.reviewedAt,
  };
}

/**
 * Helper: créer événement audit (RGPD-safe)
 */
export function toAuditEvent(
  opposition: UserOpposition,
  eventType: 'created' | 'reviewed'
): {
  eventType: string;
  tenantId: string;
  actorId: string;
  metadata: Record<string, unknown>;
} {
  return {
    eventType: `opposition.${eventType}`,
    tenantId: opposition.tenantId,
    actorId: eventType === 'created' ? opposition.userId : (opposition.reviewedBy ?? 'system'),
    metadata: {
      oppositionId: opposition.id,
      treatmentType: opposition.treatmentType,
      status: opposition.status,
      slaExceeded: isSlaExceeded(opposition),
    },
  };
}
