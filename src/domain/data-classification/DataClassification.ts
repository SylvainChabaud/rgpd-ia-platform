/**
 * DataClassification.ts — Domain layer for RGPD data classification
 *
 * RGPD Compliance:
 * - Art. 9 RGPD: Special categories of personal data (P3) must be protected
 * - Data minimization principle: Only store what's necessary
 * - Classification-based enforcement: P3 data MUST be rejected
 *
 * Architecture:
 * - Pure domain layer (NO infrastructure dependencies)
 * - Immutable value objects
 * - Type-safe classification levels
 *
 * Reference: docs/data/DATA_CLASSIFICATION.md
 */

/**
 * Data Classification Levels (RGPD-compliant)
 *
 * P0: Public/non-personal data (OK to store)
 * P1: Technical internal data (OK to store)
 * P2: Personal data (OK to store WITH encryption)
 * P3: Sensitive/special categories (Art. 9 RGPD) - FORBIDDEN to store
 */
export enum DataClassification {
  /** Public or non-personal data */
  P0 = "P0",

  /** Technical internal data without direct link to a person */
  P1 = "P1",

  /** Personal data (identifiable person) - requires encryption */
  P2 = "P2",

  /** Sensitive data (Art. 9 RGPD) - storage FORBIDDEN */
  P3 = "P3",
}

/**
 * P3 Sensitive Data Categories (Art. 9 RGPD)
 *
 * These data types are STRICTLY FORBIDDEN from storage
 */
export enum SensitiveDataCategory {
  /** Racial or ethnic origin */
  RACIAL_ETHNIC_ORIGIN = "RACIAL_ETHNIC_ORIGIN",

  /** Political opinions */
  POLITICAL_OPINIONS = "POLITICAL_OPINIONS",

  /** Religious or philosophical beliefs */
  RELIGIOUS_BELIEFS = "RELIGIOUS_BELIEFS",

  /** Trade union membership */
  TRADE_UNION = "TRADE_UNION",

  /** Health data (diagnosis, medical conditions, medications) */
  HEALTH = "HEALTH",

  /** Sexual orientation or sex life */
  SEXUAL_ORIENTATION = "SEXUAL_ORIENTATION",

  /** Genetic data */
  GENETIC = "GENETIC",

  /** Biometric data for unique identification */
  BIOMETRIC = "BIOMETRIC",
}

/**
 * Classified data with its classification level
 */
export interface ClassifiedData<T = unknown> {
  /** The actual data payload */
  readonly data: T;

  /** Classification level (P0/P1/P2/P3) */
  readonly classification: DataClassification;

  /** Optional: specific sensitive category if P3 */
  readonly sensitiveCategory?: SensitiveDataCategory;

  /** Timestamp when classified */
  readonly classifiedAt: Date;
}

/**
 * Result of classification validation
 */
export interface ClassificationValidationResult {
  /** Whether the data can be stored */
  readonly allowed: boolean;

  /** Classification level detected */
  readonly classification: DataClassification;

  /** Reason for rejection (if not allowed) */
  readonly rejectionReason?: string;

  /** Sensitive category detected (if P3) */
  readonly sensitiveCategory?: SensitiveDataCategory;

  /** Whether encryption is required (P2) */
  readonly encryptionRequired: boolean;
}

/**
 * Error thrown when attempting to store P3 data
 */
export class P3DataStorageForbiddenError extends Error {
  constructor(
    message: string,
    public readonly category?: SensitiveDataCategory
  ) {
    super(message);
    this.name = "P3DataStorageForbiddenError";
  }
}

/**
 * Error thrown when attempting to store unencrypted P2 data
 */
export class P2EncryptionRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "P2EncryptionRequiredError";
  }
}

/**
 * Factory function to create ClassifiedData
 */
export function createClassifiedData<T>(
  data: T,
  classification: DataClassification,
  sensitiveCategory?: SensitiveDataCategory
): ClassifiedData<T> {
  return {
    data,
    classification,
    sensitiveCategory,
    classifiedAt: new Date(),
  };
}

/**
 * Validate if data can be stored based on classification
 *
 * Rules:
 * - P0/P1: OK to store (no restrictions)
 * - P2: OK to store WITH encryption
 * - P3: FORBIDDEN to store
 */
export function validateClassification(
  classification: DataClassification,
  sensitiveCategory?: SensitiveDataCategory
): ClassificationValidationResult {
  switch (classification) {
    case DataClassification.P0:
    case DataClassification.P1:
      return {
        allowed: true,
        classification,
        encryptionRequired: false,
      };

    case DataClassification.P2:
      return {
        allowed: true,
        classification,
        encryptionRequired: true,
      };

    case DataClassification.P3:
      return {
        allowed: false,
        classification,
        rejectionReason: `P3 data storage forbidden (Art. 9 RGPD)${
          sensitiveCategory ? `: ${sensitiveCategory}` : ""
        }`,
        sensitiveCategory,
        encryptionRequired: true, // If exception is granted, encryption is mandatory
      };

    default:
      throw new Error(`Unknown classification level: ${classification}`);
  }
}

/**
 * Enforce classification rules before storage
 *
 * @throws P3DataStorageForbiddenError if P3 data is attempted to be stored
 */
export function enforceClassificationRules(
  classification: DataClassification,
  sensitiveCategory?: SensitiveDataCategory
): void {
  const validation = validateClassification(classification, sensitiveCategory);

  if (!validation.allowed) {
    throw new P3DataStorageForbiddenError(
      validation.rejectionReason!,
      sensitiveCategory
    );
  }
}
