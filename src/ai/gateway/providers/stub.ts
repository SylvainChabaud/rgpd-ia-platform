import type { InvokeLLMInput, InvokeLLMOutput } from "@/ai/gateway/invokeLLM";

export async function invokeStubProvider(
  _: InvokeLLMInput
): Promise<InvokeLLMOutput> {
  return {
    text: "stub-response",
    provider: "stub",
    model: "stub-1",
  };
}
