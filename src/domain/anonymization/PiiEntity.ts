/**
 * PiiEntity.ts — Domain layer value objects for PII detection
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): Defines PII types to be masked
 * - Art. 25 (Privacy by Design): Type-safe PII classification
 *
 * Architecture:
 * - Pure domain layer (NO infrastructure dependencies)
 * - Immutable value objects
 * - Type-safe PII classification
 */

/**
 * PII Types recognized by the system
 *
 * - PERSON: Names and surnames (e.g., "Jean Dupont")
 * - EMAIL: Email addresses (RFC 5322 compliant)
 * - PHONE: Phone numbers (FR/EU/international formats)
 * - ADDRESS: Full postal addresses
 * - SSN: French social security numbers
 * - IBAN: International bank account numbers
 */
export type PiiType = "PERSON" | "EMAIL" | "PHONE" | "ADDRESS" | "SSN" | "IBAN";

/**
 * Represents a single detected PII entity in text
 *
 * Immutable value object with position tracking for precise masking
 */
export interface PiiEntity {
  /** Type of PII detected */
  readonly type: PiiType;

  /** Original value (e.g., "Jean Dupont") */
  readonly value: string;

  /** Start position in the original text */
  readonly startIndex: number;

  /** End position in the original text */
  readonly endIndex: number;

  /** Confidence score (0-1) for detection accuracy */
  readonly confidence: number;
}

/**
 * Result of PII detection on a text input
 *
 * Contains all detected entities with metadata for auditing
 */
export interface PiiDetectionResult {
  /** Original text that was analyzed */
  readonly text: string;

  /** All PII entities detected in the text */
  readonly entities: ReadonlyArray<PiiEntity>;

  /** Total count of PII entities detected */
  readonly totalCount: number;

  /** Unique PII types detected (for audit events) */
  readonly detectedTypes: ReadonlyArray<PiiType>;
}

/**
 * Factory function to create a PiiDetectionResult
 *
 * Ensures immutability and calculates derived properties
 */
export function createPiiDetectionResult(
  text: string,
  entities: PiiEntity[]
): PiiDetectionResult {
  const uniqueTypes = Array.from(
    new Set(entities.map((e) => e.type))
  ) as PiiType[];

  return {
    text,
    entities: Object.freeze([...entities]),
    totalCount: entities.length,
    detectedTypes: Object.freeze(uniqueTypes),
  };
}
