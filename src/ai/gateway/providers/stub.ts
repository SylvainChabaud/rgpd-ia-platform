import type { InvokeLLMInput, InvokeLLMOutput } from "@/ai/gateway/invokeLLM";

export async function invokeStubProvider(
  _input: InvokeLLMInput
): Promise<InvokeLLMOutput> {
  return {
    text: "stub-response",
    provider: "stub",
    model: "stub-1",
  };
}
