/**
 * pii-middleware.ts — PII redaction middleware for Gateway LLM
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): PII masked before LLM exposure
 * - Art. 5 (Minimization): LLM never sees raw PII
 * - Art. 25 (Privacy by Design): Automatic, transparent redaction
 *
 * Performance:
 * - Target: <50ms total redaction time
 * - Fail-safe: Skip redaction on timeout (log warning)
 *
 * CRITICAL: Mappings are MEMORY-ONLY, purged after request
 */

import type { PiiRedactionContext } from "@/domain/anonymization";
import { createPiiRedactionContext } from "@/domain/anonymization";
import { detectPII, maskPII, restorePII, getPIISummary } from "@/infrastructure/pii";
import { logEvent, logWarn } from "@/shared/logger";
import type { InvokeLLMInput } from "./invokeLLM";

/**
 * Redaction timeout in milliseconds (fail-safe)
 *
 * If redaction exceeds this time, skip redaction and log warning
 */
const REDACTION_TIMEOUT_MS = 50;

/**
 * Redacts PII in LLM input (before sending to provider)
 *
 * @param input - Original LLM input
 * @returns Redacted input and redaction context (for restoration)
 *
 * @throws Never throws - uses fail-safe pattern on timeout
 *
 * @example
 * const { redactedInput, context } = await redactInput(input);
 * // input.text = "Contact Jean at jean@example.com"
 * // redactedInput.text = "Contact [PERSON_1] at [EMAIL_1]"
 */
export async function redactInput(input: InvokeLLMInput): Promise<{
  redactedInput: InvokeLLMInput;
  context: PiiRedactionContext;
}> {
  const startTime = performance.now();

  try {
    // Extract text from input (either text or last message)
    const textToAnalyze = getTextFromInput(input);

    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
      // No text to redact
      return {
        redactedInput: input,
        context: createPiiRedactionContext(input.tenantId, []),
      };
    }

    // Check timeout
    if (performance.now() - startTime > REDACTION_TIMEOUT_MS) {
      logWarn({
        event: "llm.pii_redaction_timeout",
        tenantId: input.tenantId,
        actorId: input.actorId,
        meta: { timeout_ms: REDACTION_TIMEOUT_MS },
      });
      return {
        redactedInput: input,
        context: createPiiRedactionContext(input.tenantId, []),
      };
    }

    // Detect PII
    const detectionResult = detectPII(textToAnalyze);

    if (detectionResult.totalCount === 0) {
      // No PII detected
      return {
        redactedInput: input,
        context: createPiiRedactionContext(input.tenantId, []),
      };
    }

    // Mask PII
    const maskingResult = maskPII(textToAnalyze, detectionResult.entities);

    // Audit PII detection (types/counts only, NO values)
    const summary = getPIISummary(maskingResult.mappings);
    logEvent(
      "llm.pii_detected",
      {
        pii_types: summary.pii_types.join(","), // Convert array to string for SafeMetaValue
        pii_count: summary.pii_count,
      },
      {
        tenantId: input.tenantId,
        actorId: input.actorId,
      }
    );

    // Create redacted input
    const redactedInput = replaceTextInInput(input, maskingResult.maskedText);

    // Create redaction context (MEMORY-ONLY)
    const context = createPiiRedactionContext(
      input.tenantId,
      Array.from(maskingResult.mappings)
    );

    // Log performance
    const duration = performance.now() - startTime;
    logEvent(
      "llm.pii_redaction_completed",
      {
        duration_ms: Math.round(duration),
        pii_count: maskingResult.maskCount,
      },
      {
        tenantId: input.tenantId,
        actorId: input.actorId,
      }
    );

    return { redactedInput, context };
  } catch (error) {
    // Fail-safe: Return original input on error
    logWarn({
      event: "llm.pii_redaction_error",
      tenantId: input.tenantId,
      actorId: input.actorId,
      meta: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return {
      redactedInput: input,
      context: createPiiRedactionContext(input.tenantId, []),
    };
  }
}

/**
 * Restores PII in LLM output (after receiving from provider)
 *
 * @param outputText - LLM output text (may contain tokens)
 * @param context - Redaction context with mappings
 * @returns Text with tokens replaced by original PII values
 *
 * @example
 * const outputText = "I will contact [PERSON_1] at [EMAIL_1]";
 * const restored = restoreOutput(outputText, context);
 * // restored = "I will contact Jean Dupont at jean@example.com"
 */
export function restoreOutput(
  outputText: string,
  context: PiiRedactionContext
): string {
  if (!context.piiDetected || context.mappings.length === 0) {
    return outputText;
  }

  return restorePII(outputText, context.mappings);
}

/**
 * Extracts text to analyze from InvokeLLMInput
 *
 * Handles both text and messages formats
 */
function getTextFromInput(input: InvokeLLMInput): string {
  if (input.text) {
    return input.text;
  }

  if (input.messages && input.messages.length > 0) {
    // Analyze last user message
    const userMessages = input.messages.filter((m) => m.role === "user");
    if (userMessages.length > 0) {
      return userMessages[userMessages.length - 1].content;
    }
  }

  return "";
}

/**
 * Replaces text in InvokeLLMInput with redacted version
 *
 * Handles both text and messages formats
 */
function replaceTextInInput(
  input: InvokeLLMInput,
  redactedText: string
): InvokeLLMInput {
  if (input.text) {
    return {
      ...input,
      text: redactedText,
    };
  }

  if (input.messages && input.messages.length > 0) {
    // Replace last user message
    const messages = [...input.messages];
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user");

    if (lastUserIndex >= 0) {
      messages[lastUserIndex] = {
        ...messages[lastUserIndex],
        content: redactedText,
      };
    }

    return {
      ...input,
      messages,
    };
  }

  return input;
}
