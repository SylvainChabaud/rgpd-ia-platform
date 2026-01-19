/**
 * Domain Entity: DPIA (Data Protection Impact Assessment)
 *
 * RGPD Compliance: Art. 35 (Obligation d'analyse d'impact)
 * Classification: P1 (métadonnées techniques)
 *
 * Représente une analyse d'impact sur la protection des données.
 * Obligatoire pour les traitements à risque élevé.
 *
 * LOT 12.4 - Fonctionnalités DPO
 */

// =============================================================================
// Status Constants
// =============================================================================

export const DPIA_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type DpiaStatus = (typeof DPIA_STATUS)[keyof typeof DPIA_STATUS];

// =============================================================================
// Risk Level Constants
// =============================================================================

export const DPIA_RISK_LEVEL = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type DpiaRiskLevel = (typeof DPIA_RISK_LEVEL)[keyof typeof DPIA_RISK_LEVEL];

// =============================================================================
// Likelihood & Impact Constants
// =============================================================================

export const DPIA_LIKELIHOOD = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type DpiaLikelihood = (typeof DPIA_LIKELIHOOD)[keyof typeof DPIA_LIKELIHOOD];

export const DPIA_IMPACT = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type DpiaImpact = (typeof DPIA_IMPACT)[keyof typeof DPIA_IMPACT];

// =============================================================================
// Data Classification Constants
// =============================================================================

export const DATA_CLASSIFICATION = {
  P0: 'P0', // Public
  P1: 'P1', // Technical
  P2: 'P2', // Personal
  P3: 'P3', // Sensitive (forbidden in prompts)
} as const;

export type DataClassification = (typeof DATA_CLASSIFICATION)[keyof typeof DATA_CLASSIFICATION];

// =============================================================================
// Risk Interface
// =============================================================================

export interface DpiaRisk {
  readonly id: string;
  readonly dpiaId: string;
  readonly tenantId: string;
  readonly riskName: string;
  readonly description: string;
  readonly likelihood: DpiaLikelihood;
  readonly impact: DpiaImpact;
  readonly mitigation: string;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// =============================================================================
// DPIA Interface
// =============================================================================

export interface Dpia {
  readonly id: string;
  readonly tenantId: string;
  readonly purposeId: string;
  readonly title: string;
  readonly description: string;
  readonly overallRiskLevel: DpiaRiskLevel;
  readonly dataProcessed: readonly string[];
  readonly dataClassification: DataClassification;
  readonly securityMeasures: readonly string[];
  readonly status: DpiaStatus;
  readonly dpoComments: string | null;
  readonly validatedAt: Date | null;
  readonly validatedBy: string | null;
  readonly rejectionReason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
  // Revision request fields (LOT 12.4 - Tenant Admin can request revision of rejected DPIA)
  readonly revisionRequestedAt: Date | null;
  readonly revisionRequestedBy: string | null;
  readonly revisionComments: string | null;
  // Joined data (optional, loaded when needed)
  readonly risks?: readonly DpiaRisk[];
  readonly purposeLabel?: string;
  readonly purposeIsActive?: boolean;
}

// =============================================================================
// Input Types
// =============================================================================

export interface CreateDpiaInput {
  tenantId: string;
  purposeId: string;
  title: string;
  description: string;
  overallRiskLevel?: DpiaRiskLevel;
  dataProcessed?: string[];
  dataClassification?: DataClassification;
  securityMeasures?: string[];
}

export interface CreateDpiaRiskInput {
  dpiaId: string;
  tenantId: string;
  riskName: string;
  description: string;
  likelihood?: DpiaLikelihood;
  impact?: DpiaImpact;
  mitigation: string;
  sortOrder?: number;
}

export interface ValidateDpiaInput {
  dpiaId: string;
  tenantId: string;
  validatedBy: string;
  status: 'APPROVED' | 'REJECTED';
  dpoComments?: string;
  rejectionReason?: string;
}

export interface UpdateDpiaInput {
  title?: string;
  description?: string;
  dpoComments?: string;
  securityMeasures?: string[];
}

// =============================================================================
// Business Rules Constants
// =============================================================================

export const MIN_TITLE_LENGTH = 5;
export const MAX_TITLE_LENGTH = 255;
export const MIN_DESCRIPTION_LENGTH = 20;
export const MAX_DESCRIPTION_LENGTH = 5000;
export const MIN_REJECTION_REASON_LENGTH = 10;
export const MAX_REJECTION_REASON_LENGTH = 1000;

// Risk levels that require DPIA (Art. 35)
export const DPIA_REQUIRED_RISK_LEVELS: DpiaRiskLevel[] = [
  DPIA_RISK_LEVEL.HIGH,
  DPIA_RISK_LEVEL.CRITICAL,
];

// Default security measures (platform pre-filled)
export const DEFAULT_SECURITY_MEASURES: string[] = [
  'Chiffrement AES-256-GCM au repos',
  'TLS 1.3 pour les communications',
  'Isolation multi-tenant (RLS PostgreSQL)',
  'Authentification JWT avec expiration courte',
  'Audit logging de tous les accès',
  'Pseudonymisation PII avant traitement IA',
  'Gateway LLM centralisé avec rate limiting',
];

// Default risks for HIGH risk processing
export const DEFAULT_HIGH_RISK_TEMPLATE: Omit<CreateDpiaRiskInput, 'dpiaId' | 'tenantId'>[] = [
  {
    riskName: 'Fuite de données personnelles',
    description: 'Risque d\'accès non autorisé aux données personnelles traitées par l\'IA',
    likelihood: DPIA_LIKELIHOOD.LOW,
    impact: DPIA_IMPACT.HIGH,
    mitigation: 'Chiffrement bout-en-bout, isolation tenant, audit logging, masking PII avant LLM',
    sortOrder: 1,
  },
  {
    riskName: 'Décision automatisée discriminatoire',
    description: 'L\'IA pourrait produire des résultats biaisés affectant les droits des personnes',
    likelihood: DPIA_LIKELIHOOD.MEDIUM,
    impact: DPIA_IMPACT.HIGH,
    mitigation: 'Révision humaine obligatoire (Art. 22), workflow de contestation, monitoring des biais',
    sortOrder: 2,
  },
  {
    riskName: 'Non-respect du principe de minimisation',
    description: 'Collecte ou traitement de données au-delà de ce qui est nécessaire',
    likelihood: DPIA_LIKELIHOOD.LOW,
    impact: DPIA_IMPACT.MEDIUM,
    mitigation: 'Classification données P0-P3, rejet automatique P3, retention policies',
    sortOrder: 3,
  },
];

// Default risks for CRITICAL risk processing
export const DEFAULT_CRITICAL_RISK_TEMPLATE: Omit<CreateDpiaRiskInput, 'dpiaId' | 'tenantId'>[] = [
  ...DEFAULT_HIGH_RISK_TEMPLATE,
  {
    riskName: 'Impact sur les droits fondamentaux',
    description: 'Le traitement pourrait affecter significativement les droits des personnes concernées',
    likelihood: DPIA_LIKELIHOOD.MEDIUM,
    impact: DPIA_IMPACT.HIGH,
    mitigation: 'Consultation DPO obligatoire, documentation Art. 35, contrôle CNIL si nécessaire',
    sortOrder: 4,
  },
  {
    riskName: 'Transfert données hors UE',
    description: 'Risque de transfert de données vers des pays sans protection adéquate',
    likelihood: DPIA_LIKELIHOOD.LOW,
    impact: DPIA_IMPACT.HIGH,
    mitigation: 'Provider LLM européen ou clauses contractuelles types, pas de données P2/P3 vers LLM externes',
    sortOrder: 5,
  },
];

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new DPIA
 * RGPD: Art. 35 - Impact assessment required for high-risk processing
 */
export function createDpia(
  input: CreateDpiaInput
): Omit<Dpia, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'validatedAt' | 'validatedBy' | 'rejectionReason'> {
  // Validation: required fields
  if (!input.tenantId) {
    throw new Error('RGPD VIOLATION: tenantId required for DPIA');
  }
  if (!input.purposeId) {
    throw new Error('purposeId required for DPIA');
  }

  // Validation: title
  if (!input.title || input.title.length < MIN_TITLE_LENGTH) {
    throw new Error(`Title must be at least ${MIN_TITLE_LENGTH} characters`);
  }
  if (input.title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Title cannot exceed ${MAX_TITLE_LENGTH} characters`);
  }

  // Validation: description
  if (!input.description || input.description.length < MIN_DESCRIPTION_LENGTH) {
    throw new Error(`Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`);
  }
  if (input.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  // Validation: P3 data is forbidden
  if (input.dataClassification === DATA_CLASSIFICATION.P3) {
    throw new Error('RGPD VIOLATION: P3 (sensitive) data processing is forbidden');
  }

  return {
    tenantId: input.tenantId,
    purposeId: input.purposeId,
    title: input.title.trim(),
    description: input.description.trim(),
    overallRiskLevel: input.overallRiskLevel ?? DPIA_RISK_LEVEL.MEDIUM,
    dataProcessed: Object.freeze(input.dataProcessed ?? []),
    dataClassification: input.dataClassification ?? DATA_CLASSIFICATION.P1,
    securityMeasures: Object.freeze(input.securityMeasures ?? DEFAULT_SECURITY_MEASURES),
    status: DPIA_STATUS.PENDING,
    dpoComments: null,
    revisionRequestedAt: null,
    revisionRequestedBy: null,
    revisionComments: null,
  };
}

/**
 * Create a DPIA risk entry
 */
export function createDpiaRisk(
  input: CreateDpiaRiskInput
): Omit<DpiaRisk, 'id' | 'createdAt' | 'updatedAt'> {
  if (!input.tenantId) {
    throw new Error('RGPD VIOLATION: tenantId required for DPIA risk');
  }
  if (!input.dpiaId) {
    throw new Error('dpiaId required for DPIA risk');
  }
  if (!input.riskName || input.riskName.length < 3) {
    throw new Error('Risk name must be at least 3 characters');
  }
  if (!input.description || input.description.length < 10) {
    throw new Error('Risk description must be at least 10 characters');
  }
  if (!input.mitigation || input.mitigation.length < 10) {
    throw new Error('Mitigation must be at least 10 characters');
  }

  return {
    dpiaId: input.dpiaId,
    tenantId: input.tenantId,
    riskName: input.riskName.trim(),
    description: input.description.trim(),
    likelihood: input.likelihood ?? DPIA_LIKELIHOOD.MEDIUM,
    impact: input.impact ?? DPIA_IMPACT.MEDIUM,
    mitigation: input.mitigation.trim(),
    sortOrder: input.sortOrder ?? 0,
  };
}

// =============================================================================
// Business Rules
// =============================================================================

/**
 * Check if DPIA is required for a given risk level
 * RGPD: Art. 35.1 - DPIA required for high-risk processing
 */
export function isDpiaRequired(riskLevel: DpiaRiskLevel): boolean {
  return DPIA_REQUIRED_RISK_LEVELS.includes(riskLevel);
}

/**
 * Check if DPIA is pending validation
 */
export function isDpiaPending(dpia: Dpia): boolean {
  return dpia.status === DPIA_STATUS.PENDING;
}

/**
 * Check if DPIA is approved
 */
export function isDpiaApproved(dpia: Dpia): boolean {
  return dpia.status === DPIA_STATUS.APPROVED;
}

/**
 * Check if DPIA is rejected
 */
export function isDpiaRejected(dpia: Dpia): boolean {
  return dpia.status === DPIA_STATUS.REJECTED;
}

/**
 * Validate DPIA input for DPO approval/rejection
 */
export function validateDpiaDecision(input: ValidateDpiaInput): void {
  if (!input.tenantId) {
    throw new Error('RGPD VIOLATION: tenantId required');
  }
  if (!input.dpiaId) {
    throw new Error('dpiaId required');
  }
  if (!input.validatedBy) {
    throw new Error('validatedBy (DPO userId) required');
  }

  // Rejection requires a reason
  if (input.status === DPIA_STATUS.REJECTED) {
    if (!input.rejectionReason || input.rejectionReason.length < MIN_REJECTION_REASON_LENGTH) {
      throw new Error(`Rejection reason must be at least ${MIN_REJECTION_REASON_LENGTH} characters`);
    }
    if (input.rejectionReason.length > MAX_REJECTION_REASON_LENGTH) {
      throw new Error(`Rejection reason cannot exceed ${MAX_REJECTION_REASON_LENGTH} characters`);
    }
  }
}

/**
 * Calculate overall risk level from individual risks
 * Uses maximum impact/likelihood combination
 *
 * Risk Matrix (Likelihood × Impact):
 * ┌─────────────┬───────┬────────┬───────┐
 * │ Likelihood  │  LOW  │ MEDIUM │ HIGH  │
 * │   Impact    │  (1)  │  (2)   │  (3)  │
 * ├─────────────┼───────┼────────┼───────┤
 * │ LOW    (1)  │   1   │   2    │   3   │
 * │ MEDIUM (2)  │   2   │   4    │   6   │
 * │ HIGH   (3)  │   3   │   6    │   9   │
 * └─────────────┴───────┴────────┴───────┘
 *
 * Score thresholds:
 * - 1-2: LOW risk (negligible)
 * - 3-4: MEDIUM risk (acceptable with measures)
 * - 5-6: HIGH risk (DPIA required per Art. 35)
 * - 9:   CRITICAL risk (DPIA required, CNIL consultation recommended)
 *
 * Note: Score 5 is impossible (no combination produces 5).
 * Valid scores: 1, 2, 3, 4, 6, 9
 */
export function calculateOverallRiskLevel(risks: DpiaRisk[]): DpiaRiskLevel {
  if (risks.length === 0) {
    return DPIA_RISK_LEVEL.LOW;
  }

  const riskScores = risks.map((risk) => {
    const likelihoodScore =
      risk.likelihood === DPIA_LIKELIHOOD.HIGH ? 3 :
      risk.likelihood === DPIA_LIKELIHOOD.MEDIUM ? 2 : 1;
    const impactScore =
      risk.impact === DPIA_IMPACT.HIGH ? 3 :
      risk.impact === DPIA_IMPACT.MEDIUM ? 2 : 1;
    return likelihoodScore * impactScore;
  });

  const maxScore = Math.max(...riskScores);

  // Apply thresholds (see matrix documentation above)
  if (maxScore >= 9) return DPIA_RISK_LEVEL.CRITICAL;
  if (maxScore >= 5) return DPIA_RISK_LEVEL.HIGH;
  if (maxScore >= 3) return DPIA_RISK_LEVEL.MEDIUM;
  return DPIA_RISK_LEVEL.LOW;
}

/**
 * Get risk template based on risk level
 */
export function getRiskTemplate(riskLevel: DpiaRiskLevel): Omit<CreateDpiaRiskInput, 'dpiaId' | 'tenantId'>[] {
  if (riskLevel === DPIA_RISK_LEVEL.CRITICAL) {
    return DEFAULT_CRITICAL_RISK_TEMPLATE;
  }
  if (riskLevel === DPIA_RISK_LEVEL.HIGH) {
    return DEFAULT_HIGH_RISK_TEMPLATE;
  }
  // For MEDIUM/LOW, return empty (no mandatory risks)
  return [];
}

// =============================================================================
// Audit Helpers (RGPD-safe, no PII)
// =============================================================================

/**
 * Convert DPIA to audit event (no sensitive data)
 */
export function toAuditEvent(
  dpia: Dpia,
  eventType: string,
  actorId: string
): {
  eventType: string;
  tenantId: string;
  actorId: string;
  metadata: {
    dpiaId: string;
    purposeId: string;
    status: DpiaStatus;
    riskLevel: DpiaRiskLevel;
    dataClassification: DataClassification;
  };
} {
  return {
    eventType,
    tenantId: dpia.tenantId,
    actorId,
    metadata: {
      dpiaId: dpia.id,
      purposeId: dpia.purposeId,
      status: dpia.status,
      riskLevel: dpia.overallRiskLevel,
      dataClassification: dpia.dataClassification,
    },
  };
}

/**
 * Convert DPIA to public format (for API response)
 */
export function toPublicDpia(dpia: Dpia): {
  id: string;
  purposeId: string;
  title: string;
  description: string;
  overallRiskLevel: DpiaRiskLevel;
  dataProcessed: readonly string[];
  dataClassification: DataClassification;
  securityMeasures: readonly string[];
  status: DpiaStatus;
  dpoComments: string | null;
  validatedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Revision request fields (LOT 12.4)
  revisionRequestedAt: Date | null;
  revisionRequestedBy: string | null;
  revisionComments: string | null;
  purposeLabel?: string;
  purposeIsActive?: boolean;
  risks?: readonly DpiaRisk[];
} {
  return {
    id: dpia.id,
    purposeId: dpia.purposeId,
    title: dpia.title,
    description: dpia.description,
    overallRiskLevel: dpia.overallRiskLevel,
    dataProcessed: dpia.dataProcessed,
    dataClassification: dpia.dataClassification,
    securityMeasures: dpia.securityMeasures,
    status: dpia.status,
    dpoComments: dpia.dpoComments,
    validatedAt: dpia.validatedAt,
    rejectionReason: dpia.rejectionReason,
    createdAt: dpia.createdAt,
    updatedAt: dpia.updatedAt,
    revisionRequestedAt: dpia.revisionRequestedAt,
    revisionRequestedBy: dpia.revisionRequestedBy,
    revisionComments: dpia.revisionComments,
    purposeLabel: dpia.purposeLabel,
    purposeIsActive: dpia.purposeIsActive,
    risks: dpia.risks,
  };
}
