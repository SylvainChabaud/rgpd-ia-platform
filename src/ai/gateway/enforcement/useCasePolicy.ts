/**
 * useCasePolicy.ts — LLM Use Case Policy Enforcement
 *
 * RGPD Compliance:
 * - LLM_USAGE_POLICY.md §2-3: Enforce allowed/forbidden use cases
 * - Art. 22 RGPD: Prevent automated decision-making without safeguards
 * - Art. 9 RGPD: Prevent processing of sensitive data without consent
 *
 * Architecture:
 * - Gateway enforcement layer (BLOCKING)
 * - Type-safe use case validation
 * - Reject forbidden use cases before LLM invocation
 */

/**
 * Allowed LLM Use Cases (§2 of LLM_USAGE_POLICY.md)
 */
export enum AllowedUseCase {
  /** A. Transformation - Reformulation */
  REFORMULATION = "REFORMULATION",

  /** A. Transformation - Summary */
  SUMMARY = "SUMMARY",

  /** A. Transformation - Text normalization */
  TEXT_NORMALIZATION = "TEXT_NORMALIZATION",

  /** B. Classification - Categorization */
  CATEGORIZATION = "CATEGORIZATION",

  /** B. Classification - Document type detection */
  DOCUMENT_TYPE_DETECTION = "DOCUMENT_TYPE_DETECTION",

  /** B. Classification - Non-decisional scoring */
  NON_DECISIONAL_SCORING = "NON_DECISIONAL_SCORING",

  /** C. Extraction - Field extraction */
  FIELD_EXTRACTION = "FIELD_EXTRACTION",

  /** C. Extraction - Content structuring */
  CONTENT_STRUCTURING = "CONTENT_STRUCTURING",

  /** D. Assisted generation - Writing assistance */
  WRITING_ASSISTANCE = "WRITING_ASSISTANCE",

  /** D. Assisted generation - Suggestions */
  SUGGESTIONS = "SUGGESTIONS",

  /** LOT 8.0 - PII Anonymization (special case) */
  PII_ANONYMIZATION = "PII_ANONYMIZATION",

  /** LOT 8.0 - PII Redaction (special case) */
  PII_REDACTION = "PII_REDACTION",
}

/**
 * Forbidden LLM Use Cases (§3 of LLM_USAGE_POLICY.md)
 */
export enum ForbiddenUseCase {
  /** ❌ Automated decision with legal effect (Art. 22 RGPD) */
  AUTOMATED_DECISION = "AUTOMATED_DECISION",

  /** ❌ Medical diagnosis (Art. 9 RGPD - health data) */
  MEDICAL_DIAGNOSIS = "MEDICAL_DIAGNOSIS",

  /** ❌ Binding legal advice */
  LEGAL_ADVICE = "LEGAL_ADVICE",

  /** ❌ Profiling without legal basis */
  PROFILING_NO_BASIS = "PROFILING_NO_BASIS",

  /** ❌ Training on user data */
  TRAINING_ON_USER_DATA = "TRAINING_ON_USER_DATA",

  /** ❌ Frontend LLM calls (bypass Gateway) */
  FRONTEND_LLM_CALL = "FRONTEND_LLM_CALL",

  /** ❌ Loan approval automation */
  LOAN_APPROVAL = "LOAN_APPROVAL",

  /** ❌ Employment decision automation */
  EMPLOYMENT_DECISION = "EMPLOYMENT_DECISION",

  /** ❌ Credit scoring automation */
  CREDIT_SCORING = "CREDIT_SCORING",
}

/**
 * Use case validation result
 */
export interface UseCaseValidationResult {
  /** Whether the use case is allowed */
  readonly allowed: boolean;

  /** The use case being validated */
  readonly useCase: string;

  /** Risk level (low/moderate/high) */
  readonly riskLevel: "low" | "moderate" | "high";

  /** Rejection reason if not allowed */
  readonly rejectionReason?: string;

  /** Whether user consent is required */
  readonly consentRequired: boolean;

  /** Whether human validation is required */
  readonly humanValidationRequired: boolean;
}

/**
 * Error thrown when forbidden use case is attempted
 */
export class ForbiddenUseCaseError extends Error {
  constructor(
    message: string,
    public readonly useCase: string
  ) {
    super(message);
    this.name = "ForbiddenUseCaseError";
  }
}

/**
 * Validate if use case is allowed
 *
 * @param useCase - Use case identifier
 * @returns Validation result
 */
export function validateUseCase(useCase: string): UseCaseValidationResult {
  // Check if forbidden use case
  if (Object.values(ForbiddenUseCase).includes(useCase as ForbiddenUseCase)) {
    return {
      allowed: false,
      useCase,
      riskLevel: "high",
      rejectionReason: `Forbidden use case: ${useCase} (violates LLM_USAGE_POLICY.md §3)`,
      consentRequired: false,
      humanValidationRequired: false,
    };
  }

  // Check if allowed use case
  if (Object.values(AllowedUseCase).includes(useCase as AllowedUseCase)) {
    // Determine risk level and requirements
    const riskProfile = getAllowedUseCaseRiskProfile(useCase as AllowedUseCase);

    return {
      allowed: true,
      useCase,
      ...riskProfile,
    };
  }

  // Unknown use case - reject by default (fail-safe)
  return {
    allowed: false,
    useCase,
    riskLevel: "high",
    rejectionReason: `Unknown use case: ${useCase} (not in allowlist)`,
    consentRequired: false,
    humanValidationRequired: false,
  };
}

/**
 * Get risk profile for allowed use case
 */
function getAllowedUseCaseRiskProfile(useCase: AllowedUseCase): {
  riskLevel: "low" | "moderate" | "high";
  consentRequired: boolean;
  humanValidationRequired: boolean;
} {
  switch (useCase) {
    // A. Transformation - Low risk
    case AllowedUseCase.REFORMULATION:
    case AllowedUseCase.SUMMARY:
    case AllowedUseCase.TEXT_NORMALIZATION:
    case AllowedUseCase.PII_ANONYMIZATION:
    case AllowedUseCase.PII_REDACTION:
      return {
        riskLevel: "low",
        consentRequired: true, // Always require consent for AI processing
        humanValidationRequired: false,
      };

    // B. Classification - Moderate risk
    case AllowedUseCase.CATEGORIZATION:
    case AllowedUseCase.DOCUMENT_TYPE_DETECTION:
    case AllowedUseCase.NON_DECISIONAL_SCORING:
      return {
        riskLevel: "moderate",
        consentRequired: true,
        humanValidationRequired: false,
      };

    // C. Extraction - Moderate risk
    case AllowedUseCase.FIELD_EXTRACTION:
    case AllowedUseCase.CONTENT_STRUCTURING:
      return {
        riskLevel: "moderate",
        consentRequired: true,
        humanValidationRequired: false,
      };

    // D. Assisted generation - High risk
    case AllowedUseCase.WRITING_ASSISTANCE:
    case AllowedUseCase.SUGGESTIONS:
      return {
        riskLevel: "high",
        consentRequired: true,
        humanValidationRequired: true, // Always require human validation
      };

    default:
      return {
        riskLevel: "high",
        consentRequired: true,
        humanValidationRequired: true,
      };
  }
}

/**
 * Enforce use case policy (BLOCKING)
 *
 * @param useCase - Use case to validate
 * @throws ForbiddenUseCaseError if use case is not allowed
 */
export function enforceUseCasePolicy(useCase: string): void {
  const validation = validateUseCase(useCase);

  if (!validation.allowed) {
    throw new ForbiddenUseCaseError(validation.rejectionReason!, useCase);
  }
}

/**
 * Check if use case requires human validation
 *
 * @param useCase - Use case identifier
 * @returns True if human validation is required
 */
export function requiresHumanValidation(useCase: string): boolean {
  const validation = validateUseCase(useCase);
  return validation.humanValidationRequired;
}
