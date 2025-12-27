/**
 * detector.ts — PII detection engine
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): Automatic PII detection before LLM exposure
 * - Art. 25 (Privacy by Design): Proactive PII identification
 *
 * Performance:
 * - Target: <15ms detection time for typical prompts
 * - Regex-based (deterministic, fast)
 * - Single-pass text processing
 */

import type {
  PiiType,
  PiiEntity,
  PiiDetectionResult,
} from "@/domain/anonymization";
import { createPiiDetectionResult } from "@/domain/anonymization";
import { PII_PATTERNS, isWhitelistedName } from "./patterns";

/**
 * Detects PII entities in text using regex patterns
 *
 * @param text - Text to analyze for PII
 * @returns Detection result with all found PII entities
 *
 * @example
 * const result = detectPII("Contact Jean Dupont at jean@example.com");
 * // result.entities = [
 * //   { type: "PERSON", value: "Jean Dupont", ... },
 * //   { type: "EMAIL", value: "jean@example.com", ... }
 * // ]
 */
export function detectPII(text: string): PiiDetectionResult {
  if (!text || text.trim().length === 0) {
    return createPiiDetectionResult(text, []);
  }

  const entities: PiiEntity[] = [];

  // Detect each PII type using compiled regex patterns
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const piiType = type as PiiType;

    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      let value = match[0];
      let startIndex = match.index;
      let endIndex = match.index + value.length;

      // For PERSON pattern, trim leading/trailing non-letters
      if (piiType === "PERSON") {
        value = value.trim();
        // Adjust start index if we trimmed leading chars
        const leadingTrimmed = match[0].length - match[0].trimStart().length;
        startIndex += leadingTrimmed;
        endIndex = startIndex + value.length;
      }

      // Apply whitelist filtering for PERSON type
      if (piiType === "PERSON" && isWhitelistedName(value)) {
        continue;
      }

      entities.push({
        type: piiType,
        value,
        startIndex,
        endIndex,
        confidence: 1.0, // Regex matches have 100% confidence
      });
    }
  }

  // Sort entities by start position for consistent processing
  entities.sort((a, b) => a.startIndex - b.startIndex);

  return createPiiDetectionResult(text, entities);
}

/**
 * Detects PII entities of a specific type only
 *
 * @param text - Text to analyze
 * @param type - Specific PII type to detect
 * @returns Detection result containing only entities of the specified type
 *
 * @example
 * const emails = detectPIIByType("Email: test@example.com", "EMAIL");
 */
export function detectPIIByType(
  text: string,
  type: PiiType
): PiiDetectionResult {
  if (!text || text.trim().length === 0) {
    return createPiiDetectionResult(text, []);
  }

  const pattern = PII_PATTERNS[type];
  const entities: PiiEntity[] = [];

  // Reset regex lastIndex
  pattern.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const value = match[0];

    // Apply whitelist filtering for PERSON type
    if (type === "PERSON" && isWhitelistedName(value)) {
      continue;
    }

    entities.push({
      type,
      value,
      startIndex: match.index,
      endIndex: match.index + value.length,
      confidence: 1.0,
    });
  }

  return createPiiDetectionResult(text, entities);
}

/**
 * Fast check if text contains any PII (without full detection)
 *
 * @param text - Text to check
 * @returns true if PII detected, false otherwise
 *
 * Use case: Quick validation before expensive operations
 */
export function containsPII(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  for (const pattern of Object.values(PII_PATTERNS)) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}
