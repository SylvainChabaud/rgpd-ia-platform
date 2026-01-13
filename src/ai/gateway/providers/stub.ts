import type { InvokeLLMInput, InvokeLLMOutput } from "@/ai/gateway/invokeLLM";
import { AI_PROVIDER_TYPE } from "@/ai/gateway/config";

export async function invokeStubProvider(
  _: InvokeLLMInput
): Promise<InvokeLLMOutput> {
  return {
    text: "stub-response",
    provider: AI_PROVIDER_TYPE.STUB,
    model: "stub-1",
  };
}
