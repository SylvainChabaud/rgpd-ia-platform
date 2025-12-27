/**
 * PiiMapping.ts — Domain layer value objects for PII token mappings
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): Token-based PII masking
 * - CRITICAL: Mappings are MEMORY-ONLY, NEVER persisted to database
 *
 * Architecture:
 * - Pure domain layer (NO infrastructure dependencies)
 * - Immutable value objects
 * - Request-scoped lifecycle (purged after request completion)
 */

import type { PiiType } from "./PiiEntity";

/**
 * Represents a single PII → Token mapping
 *
 * Example: { token: "[PERSON_1]", originalValue: "Jean Dupont", type: "PERSON" }
 *
 * CRITICAL CONSTRAINT: NEVER persist this to database or logs
 */
export interface PiiMapping {
  /** Token used for masking (e.g., "[PERSON_1]") */
  readonly token: string;

  /** Original PII value (e.g., "Jean Dupont") */
  readonly originalValue: string;

  /** PII type for auditing */
  readonly type: PiiType;
}

/**
 * Result of PII masking operation
 *
 * Contains masked text and reverse mappings for restoration
 */
export interface PiiMaskingResult {
  /** Text with PII replaced by tokens */
  readonly maskedText: string;

  /** Mappings for restoration (MEMORY-ONLY) */
  readonly mappings: ReadonlyArray<PiiMapping>;

  /** Number of PII values masked */
  readonly maskCount: number;

  /** Original unmasked text (for validation) */
  readonly originalText: string;
}

/**
 * Factory function to create a PiiMaskingResult
 *
 * Ensures immutability and prevents accidental persistence
 */
export function createPiiMaskingResult(
  maskedText: string,
  originalText: string,
  mappings: PiiMapping[]
): PiiMaskingResult {
  return {
    maskedText,
    originalText,
    mappings: Object.freeze([...mappings]),
    maskCount: mappings.length,
  };
}

/**
 * PII Redaction Context
 *
 * Holds all context needed for a single request's PII redaction lifecycle
 * CRITICAL: Purged immediately after request completion
 */
export interface PiiRedactionContext {
  /** Request identifier for tracking */
  readonly requestId?: string;

  /** Tenant identifier for isolation */
  readonly tenantId: string;

  /** PII mappings for this request (MEMORY-ONLY) */
  readonly mappings: ReadonlyArray<PiiMapping>;

  /** Whether PII was detected in the input */
  readonly piiDetected: boolean;

  /** Timestamp of redaction operation */
  readonly redactedAt: Date;
}

/**
 * Factory function to create a PiiRedactionContext
 *
 * Enforces request-scoped lifecycle
 */
export function createPiiRedactionContext(
  tenantId: string,
  mappings: PiiMapping[],
  requestId?: string
): PiiRedactionContext {
  return {
    tenantId,
    requestId,
    mappings: Object.freeze([...mappings]),
    piiDetected: mappings.length > 0,
    redactedAt: new Date(),
  };
}
