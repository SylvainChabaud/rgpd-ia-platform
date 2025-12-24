import type { InvokeLLMInput, InvokeLLMOutput } from "@/ai/gateway/invokeLLM";

/**
 * Provider function signature
 * All providers must implement this interface
 */
export type ProviderFunction = (
  input: InvokeLLMInput
) => Promise<InvokeLLMOutput>;

/**
 * Provider configuration
 */
export interface ProviderConfig {
  name: string;
  enabled: boolean;
}
