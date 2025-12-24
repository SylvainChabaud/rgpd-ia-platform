import { invokeStubProvider } from "@/ai/gateway/providers/stub";
import { invokeOllamaProvider } from "@/ai/gateway/providers/ollama";
import { AI_PROVIDER } from "@/ai/gateway/config";

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

/**
 * Gateway LLM - Point d'entrée unique obligatoire
 *
 * Conformité :
 * - BOUNDARIES.md : Gateway unique, aucun bypass autorisé
 * - LLM_USAGE_POLICY.md : Local first, redaction, minimisation
 * - LOT 3.0 : Provider local POC (Ollama) branché
 *
 * IMPORTANT :
 * - NO DIRECT LLM CALLS outside this function
 * - NO STORAGE of prompts/outputs by default
 * - Provider routing based on config (stub | ollama)
 */
export async function invokeLLM(
  input: InvokeLLMInput
): Promise<InvokeLLMOutput> {
  // Route to configured provider
  switch (AI_PROVIDER) {
    case "ollama":
      return invokeOllamaProvider(input);
    case "stub":
      return invokeStubProvider(input);
    default:
      // Fallback to stub if unknown provider
      return invokeStubProvider(input);
  }
}
