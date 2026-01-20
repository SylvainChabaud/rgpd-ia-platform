/**
 * Domain: DPIA (Data Protection Impact Assessment)
 *
 * RGPD Compliance:
 * - Art. 35: DPIA obligation
 * - Art. 30: Registre des traitements
 *
 * LOT 12.4 - Fonctionnalités DPO
 */

// DPIA entity and types
export {
  // Status constants
  DPIA_STATUS,
  DPIA_RISK_LEVEL,
  DPIA_LIKELIHOOD,
  DPIA_IMPACT,
  DATA_CLASSIFICATION,
  // Types
  type DpiaStatus,
  type DpiaRiskLevel,
  type DpiaLikelihood,
  type DpiaImpact,
  type DataClassification,
  type DpiaRisk,
  type Dpia,
  type CreateDpiaInput,
  type CreateDpiaRiskInput,
  type ValidateDpiaInput,
  type UpdateDpiaInput,
  // Constants
  MIN_TITLE_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MIN_REJECTION_REASON_LENGTH,
  MAX_REJECTION_REASON_LENGTH,
  DPIA_REQUIRED_RISK_LEVELS,
  DEFAULT_SECURITY_MEASURES,
  DEFAULT_HIGH_RISK_TEMPLATE,
  DEFAULT_CRITICAL_RISK_TEMPLATE,
  // Factory functions
  createDpia,
  createDpiaRisk,
  // Business rules
  isDpiaRequired,
  isDpiaPending,
  isDpiaApproved,
  isDpiaRejected,
  validateDpiaDecision,
  calculateOverallRiskLevel,
  getRiskTemplate,
  // Helpers
  toAuditEvent,
  toPublicDpia,
} from './Dpia';

// Registre Art. 30 entity and types
export {
  // Constants
  LAWFUL_BASIS,
  PURPOSE_CATEGORY,
  RETENTION_PERIOD,
  // Types
  type LawfulBasis,
  type PurposeCategory,
  type RetentionPeriod,
  type RegistreEntry,
  type BuildRegistreEntryInput,
  // Default values
  DEFAULT_DATA_SUBJECT_CATEGORIES,
  DATA_CATEGORIES_BY_CLASSIFICATION,
  DEFAULT_RECIPIENT_CATEGORIES,
  RETENTION_DESCRIPTIONS,
  DEFAULT_SECURITY_MEASURES as REGISTRE_DEFAULT_SECURITY_MEASURES,
  // Factory
  buildRegistreEntry,
  // Business rules
  getRetentionPeriodForCategory,
  isRegistreEntryComplete,
  requiresDpiaValidation,
  getLawfulBasisLabel,
  getCategoryLabel,
  // Export helpers
  toRegistreCsvRow,
  toPublicRegistreEntry,
} from './RegistreEntry';

// DPIA History entity and types
export {
  // Constants
  DPIA_HISTORY_ACTION,
  DPIA_HISTORY_ACTION_LABELS,
  DPIA_HISTORY_ACTION_COLORS,
  // Types
  type DpiaHistoryAction,
  type DpiaHistoryEntry,
  type CreateDpiaHistoryInput,
} from './DpiaHistory';
