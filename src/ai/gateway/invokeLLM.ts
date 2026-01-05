import { invokeStubProvider } from "@/ai/gateway/providers/stub";
import { invokeOllamaProvider } from "@/ai/gateway/providers/ollama";
import { AI_PROVIDER } from "@/ai/gateway/config";
import type { ConsentRepo } from "@/app/ports/ConsentRepo";
import type { UserRepo } from "@/app/ports/UserRepo";
import { checkConsent } from "@/ai/gateway/enforcement/checkConsent";
import { checkDataSuspension } from "@/ai/gateway/enforcement/checkDataSuspension";
import { redactInput, restoreOutput } from "@/ai/gateway/pii-middleware";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type InvokeLLMInput = {
  purpose: string;
  tenantId: string;
  actorId?: string;
  policy: string;
  messages?: LlmMessage[];
  text?: string;
  redactionHints?: string[];
};

export type InvokeLLMOutput = {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  provider: string;
  model: string;
};

export type InvokeLLMDependencies = {
  consentRepo?: ConsentRepo;
  userRepo?: UserRepo;
};

/**
 * Gateway LLM - Point d'entrée unique obligatoire
 *
 * Conformité :
 * - BOUNDARIES.md : Gateway unique, aucun bypass autorisé
 * - LLM_USAGE_POLICY.md : Local first, redaction, minimisation
 * - LOT 3.0 : Provider local POC (Ollama) branché
 * - LOT 5.0 : Consent enforcement (opt-in required)
 * - LOT 8.0 : PII redaction (pseudonymization, Art. 32)
 * - LOT 10.6 : Data suspension enforcement (Art. 18 RGPD)
 *
 * IMPORTANT :
 * - NO DIRECT LLM CALLS outside this function
 * - NO STORAGE of prompts/outputs by default
 * - Provider routing based on config (stub | ollama)
 * - Consent enforcement BEFORE provider invocation (RGPD blocker)
 * - Data suspension check BEFORE provider invocation (RGPD blocker Art. 18)
 * - PII redaction BEFORE sending to LLM (Art. 32 Pseudonymization)
 */
export async function invokeLLM(
  input: InvokeLLMInput,
  deps?: InvokeLLMDependencies
): Promise<InvokeLLMOutput> {
  // LOT 5.0: Consent enforcement (if consentRepo provided)
  if (deps?.consentRepo && input.actorId) {
    await checkConsent(
      deps.consentRepo,
      input.tenantId,
      input.actorId,
      input.purpose
    );
  }

  // LOT 10.6: Data suspension enforcement (Art. 18 RGPD)
  if (deps?.userRepo && input.actorId) {
    await checkDataSuspension(
      deps.userRepo,
      input.tenantId,
      input.actorId
    );
  }

  // LOT 8.0: PII Detection & Redaction (before sending to LLM)
  const { redactedInput, context } = await redactInput(input);

  // Route to configured provider (with redacted input)
  let providerOutput: InvokeLLMOutput;
  switch (AI_PROVIDER) {
    case "ollama":
      providerOutput = await invokeOllamaProvider(redactedInput);
      break;
    case "stub":
      providerOutput = await invokeStubProvider(redactedInput);
      break;
    default:
      // Fallback to stub if unknown provider
      providerOutput = await invokeStubProvider(redactedInput);
  }

  // LOT 8.0: PII Restoration (after receiving from LLM)
  const restoredText = restoreOutput(providerOutput.text, context);

  // Return output with restored PII
  return {
    ...providerOutput,
    text: restoredText,
  };
  // CRITICAL: PII mapping context is purged here (end of request lifecycle)
}
