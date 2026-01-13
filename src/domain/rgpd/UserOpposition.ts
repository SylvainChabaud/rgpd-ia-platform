/**
 * Domain Entity: User Opposition
 *
 * RGPD Compliance: Art. 21 (Droit d'opposition)
 * Classification: P2 (métadonnées sensibles)
 *
 * Permet à un utilisateur de s'opposer à certains traitements de données.
 * Implémente le droit d'opposition prévu par l'article 21 du RGPD.
 */

/**
 * Opposition status constants
 */
export const OPPOSITION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type OppositionStatus = (typeof OPPOSITION_STATUS)[keyof typeof OPPOSITION_STATUS];

/**
 * Treatment type constants
 */
export const TREATMENT_TYPE = {
  MARKETING: 'marketing',
  PROFILING: 'profiling',
  ANALYTICS: 'analytics',
  AI_PROCESSING: 'ai_processing',
  LEGITIMATE_INTEREST: 'legitimate_interest',
} as const;

export type TreatmentType = (typeof TREATMENT_TYPE)[keyof typeof TREATMENT_TYPE];

export interface UserOpposition {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly treatmentType: TreatmentType;  // Type de traitement contesté
  readonly reason: string;                // Motif d'opposition
  readonly status: OppositionStatus;
  readonly createdAt: Date;
  readonly processedAt: Date | null;      // Date traitement opposition
  readonly processedBy: string | null;    // ID admin ayant traité
  readonly adminResponse: string | null;
}

/**
 * Input pour créer une opposition
 */
export interface CreateOppositionInput {
  tenantId: string;
  userId: string;
  treatmentType: TreatmentType;
  reason: string;
}

/**
 * Constantes business rules
 */
export const MIN_OPPOSITION_REASON_LENGTH = 10;
export const MAX_OPPOSITION_REASON_LENGTH = 1000;

// Traitements qui doivent être automatiquement approuvés (Art. 21.1)
export const AUTO_APPROVE_TREATMENTS: TreatmentType[] = [
  TREATMENT_TYPE.MARKETING,
  TREATMENT_TYPE.PROFILING,
];

// Traitements nécessitant révision manuelle (intérêt légitime impérieux)
export const MANUAL_REVIEW_TREATMENTS: TreatmentType[] = [
  TREATMENT_TYPE.AI_PROCESSING,
  TREATMENT_TYPE.LEGITIMATE_INTEREST,
  TREATMENT_TYPE.ANALYTICS,
];

/**
 * Factory: créer une nouvelle opposition
 */
export function createOpposition(
  input: CreateOppositionInput
): Omit<UserOpposition, 'id' | 'createdAt' | 'processedAt' | 'processedBy' | 'adminResponse' | 'status'> {
  // Validation: champs obligatoires
  if (!input.tenantId || !input.userId || !input.treatmentType) {
    throw new Error('tenantId, userId and treatmentType are required');
  }

  // Validation: longueur motif
  if (input.reason.length < MIN_OPPOSITION_REASON_LENGTH) {
    throw new Error(`Reason must be at least ${MIN_OPPOSITION_REASON_LENGTH} characters`);
  }

  if (input.reason.length > MAX_OPPOSITION_REASON_LENGTH) {
    throw new Error(`Reason cannot exceed ${MAX_OPPOSITION_REASON_LENGTH} characters`);
  }

  // Validation: type de traitement valide
  const validTreatments: TreatmentType[] = Object.values(TREATMENT_TYPE);

  if (!validTreatments.includes(input.treatmentType)) {
    throw new Error('Invalid treatment type');
  }

  return {
    tenantId: input.tenantId,
    userId: input.userId,
    treatmentType: input.treatmentType,
    reason: input.reason,
  };
}

/**
 * Business rule: déterminer si opposition doit être auto-approuvée
 */
export function shouldAutoApprove(treatmentType: TreatmentType): boolean {
  return AUTO_APPROVE_TREATMENTS.includes(treatmentType);
}

/**
 * Business rule: déterminer si opposition nécessite révision manuelle
 */
export function requiresManualReview(treatmentType: TreatmentType): boolean {
  return MANUAL_REVIEW_TREATMENTS.includes(treatmentType);
}

/**
 * Business rule: vérifier si opposition est en attente
 */
export function isOppositionPending(opposition: UserOpposition): boolean {
  return opposition.status === OPPOSITION_STATUS.PENDING;
}

/**
 * Business rule: vérifier si opposition est approuvée
 */
export function isOppositionApproved(opposition: UserOpposition): boolean {
  return opposition.status === OPPOSITION_STATUS.APPROVED;
}

/**
 * Helper: mapper opposition vers format API public
 */
export function toPublicOpposition(opposition: UserOpposition): {
  id: string;
  treatmentType: TreatmentType;
  reason: string;
  status: OppositionStatus;
  createdAt: Date;
  processedAt: Date | null;
  adminResponse: string | null;
} {
  return {
    id: opposition.id,
    treatmentType: opposition.treatmentType,
    reason: opposition.reason,
    status: opposition.status,
    createdAt: opposition.createdAt,
    processedAt: opposition.processedAt,
    adminResponse: opposition.adminResponse,
  };
}

/**
 * Helper: créer événement audit (RGPD-safe, pas de PII)
 */
export function toAuditEvent(opposition: UserOpposition, eventType: string): {
  eventType: string;
  tenantId: string;
  actorId: string;
  metadata: {
    oppositionId: string;
    treatmentType: TreatmentType;
    status: OppositionStatus;
    autoApproved: boolean;
  };
} {
  return {
    eventType,
    tenantId: opposition.tenantId,
    actorId: opposition.userId,
    metadata: {
      oppositionId: opposition.id,
      treatmentType: opposition.treatmentType,
      status: opposition.status,
      autoApproved: shouldAutoApprove(opposition.treatmentType),
    },
  };
}
