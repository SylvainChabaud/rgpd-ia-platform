import type { InvokeLLMInput, InvokeLLMOutput, LlmMessage } from "@/ai/gateway/invokeLLM";
import { OLLAMA_CONFIG } from "@/ai/gateway/config";

/**
 * Ollama local provider (LOT 3.0 POC)
 *
 * Conformité stricte :
 * - LLM_USAGE_POLICY.md : Local first, pas de flux externe
 * - DATA_CLASSIFICATION.md : Aucun stockage prompts/outputs (stateless)
 * - BOUNDARIES.md : Gateway seule entrée, runtime IA stateless
 * - RGPD_TESTING.md : Données fictives uniquement
 *
 * IMPORTANT :
 * - NO STORAGE of prompts or outputs
 * - NO LOGS of content (events only)
 * - Local inference only (localhost)
 */

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Format messages to prompt string
 */
function formatMessagesToPrompt(messages?: LlmMessage[]): string {
  if (!messages || messages.length === 0) {
    return "";
  }

  return messages
    .map((msg) => {
      const role = msg.role === "assistant" ? "Assistant" : msg.role === "user" ? "User" : "System";
      return `${role}: ${msg.content}`;
    })
    .join("\n\n");
}

/**
 * Invoke Ollama local provider
 *
 * @param input - Gateway LLM input (already redacted)
 * @returns LLM output (text + usage + metadata)
 *
 * Contraintes :
 * - Stateless : aucun stockage prompts/outputs
 * - Localhost uniquement : pas de flux externe
 * - Timeout configuré : éviter blocage infini
 */
export async function invokeOllamaProvider(
  input: InvokeLLMInput
): Promise<InvokeLLMOutput> {
  const { url, model, timeout } = OLLAMA_CONFIG;

  // 1. Prepare prompt (text or formatted messages)
  const prompt = input.text || formatMessagesToPrompt(input.messages);

  if (!prompt) {
    throw new Error("Ollama provider: no prompt provided (text or messages required)");
  }

  // 2. Call Ollama API (generate endpoint, no streaming for POC)
  const requestBody: OllamaGenerateRequest = {
    model,
    prompt,
    stream: false, // No streaming for POC simplicity
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: OllamaGenerateResponse = await response.json();

    // 3. Return output (NO STORAGE, stateless)
    return {
      text: data.response,
      usage: {
        inputTokens: data.prompt_eval_count || 0,
        outputTokens: data.eval_count || 0,
      },
      provider: "ollama",
      model: data.model,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Ollama provider timeout after ${timeout}ms`);
    }

    throw error;
  }
}
