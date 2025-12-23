import { invokeStubProvider } from "@/ai/gateway/providers/stub";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type InvokeLLMInput = {
  purpose: string;
  tenantId: string;
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

export async function invokeLLM(
  input: InvokeLLMInput
): Promise<InvokeLLMOutput> {
  return invokeStubProvider(input);
}
