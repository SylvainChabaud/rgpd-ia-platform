/**
 * masker.ts — PII masking and restoration
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): Token-based PII masking
 * - CRITICAL: Mappings stored in memory ONLY, NEVER persisted
 *
 * Performance:
 * - Target: <5ms masking time
 * - Single-pass text replacement
 * - Consistent token generation
 */

import type {
  PiiType,
  PiiEntity,
  PiiMapping,
  PiiMaskingResult,
} from "@/domain/anonymization";
import { createPiiMaskingResult } from "@/domain/anonymization";

/**
 * Token counters for each PII type
 *
 * Ensures consistent token generation within a single request
 * CRITICAL: Reset after each request to prevent token leakage
 */
class TokenCounter {
  private counters: Map<PiiType, number> = new Map();

  /**
   * Get next token for a PII type
   *
   * @param type - PII type
   * @returns Token string (e.g., "[PERSON_1]", "[EMAIL_2]")
   */
  next(type: PiiType): string {
    const current = this.counters.get(type) || 0;
    const nextValue = current + 1;
    this.counters.set(type, nextValue);
    return `[${type}_${nextValue}]`;
  }

  /**
   * Reset all counters
   *
   * CRITICAL: Call after each request to prevent token leakage
   */
  reset(): void {
    this.counters.clear();
  }
}

/**
 * Masks PII entities in text with tokens
 *
 * @param text - Original text containing PII
 * @param entities - PII entities to mask (sorted by startIndex)
 * @returns Masking result with masked text and mappings
 *
 * @example
 * const text = "Contact Jean Dupont at jean@example.com";
 * const entities = detectPII(text).entities;
 * const result = maskPII(text, entities);
 * // result.maskedText = "Contact [PERSON_1] at [EMAIL_1]"
 * // result.mappings = [
 * //   { token: "[PERSON_1]", originalValue: "Jean Dupont", type: "PERSON" },
 * //   { token: "[EMAIL_1]", originalValue: "jean@example.com", type: "EMAIL" }
 * // ]
 */
export function maskPII(
  text: string,
  entities: readonly PiiEntity[]
): PiiMaskingResult {
  if (!text || entities.length === 0) {
    return createPiiMaskingResult(text, text, []);
  }

  const counter = new TokenCounter();
  const mappings: PiiMapping[] = [];
  const valueToToken = new Map<string, string>(); // For consistency

  let maskedText = "";
  let lastIndex = 0;

  for (const entity of entities) {
    // Preserve consistency: same value → same token
    let token = valueToToken.get(entity.value);
    if (!token) {
      token = counter.next(entity.type);
      valueToToken.set(entity.value, token);

      mappings.push({
        token,
        originalValue: entity.value,
        type: entity.type,
      });
    }

    // Append text before PII + token
    maskedText += text.substring(lastIndex, entity.startIndex) + token;
    lastIndex = entity.endIndex;
  }

  // Append remaining text after last PII
  maskedText += text.substring(lastIndex);

  return createPiiMaskingResult(maskedText, text, mappings);
}

/**
 * Restores PII in masked text using mappings
 *
 * @param maskedText - Text with PII tokens
 * @param mappings - PII mappings for restoration
 * @returns Text with tokens replaced by original PII values
 *
 * @example
 * const maskedText = "Contact [PERSON_1] at [EMAIL_1]";
 * const mappings = [
 *   { token: "[PERSON_1]", originalValue: "Jean Dupont", type: "PERSON" },
 *   { token: "[EMAIL_1]", originalValue: "jean@example.com", type: "EMAIL" }
 * ];
 * const restored = restorePII(maskedText, mappings);
 * // restored = "Contact Jean Dupont at jean@example.com"
 */
export function restorePII(
  maskedText: string,
  mappings: readonly PiiMapping[]
): string {
  if (!maskedText || mappings.length === 0) {
    return maskedText;
  }

  let restoredText = maskedText;

  // Replace tokens with original values
  for (const mapping of mappings) {
    // Use global replace to handle multiple occurrences
    restoredText = restoredText.replaceAll(mapping.token, mapping.originalValue);
  }

  return restoredText;
}

/**
 * Validates that masked text contains no PII values
 *
 * @param maskedText - Text to validate
 * @param mappings - Original PII mappings
 * @returns true if no PII values found in masked text, false if leak detected
 *
 * Use case: Safety check before sending to LLM
 */
export function validateMaskedText(
  maskedText: string,
  mappings: readonly PiiMapping[]
): boolean {
  for (const mapping of mappings) {
    if (maskedText.includes(mapping.originalValue)) {
      // PII value found in masked text - masking failed!
      return false;
    }
  }
  return true;
}

/**
 * Extracts PII types and counts from mappings (for audit events)
 *
 * @param mappings - PII mappings
 * @returns Object with PII types and total count
 *
 * CRITICAL: Does NOT include original values (RGPD compliance)
 *
 * @example
 * const summary = getPIISummary(mappings);
 * // summary = { pii_types: ["PERSON", "EMAIL"], pii_count: 3 }
 */
export function getPIISummary(mappings: readonly PiiMapping[]): {
  pii_types: PiiType[];
  pii_count: number;
} {
  const uniqueTypes = Array.from(new Set(mappings.map((m) => m.type)));

  return {
    pii_types: uniqueTypes,
    pii_count: mappings.length,
  };
}
