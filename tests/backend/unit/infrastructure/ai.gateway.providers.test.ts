/**
 * ai.gateway.providers.test.ts — LLM Provider tests
 *
 * Coverage target: All branches for provider routing and Ollama
 *
 * RGPD Compliance:
 * - NO storage of prompts/outputs
 * - Stateless invocation
 * - Error handling for unreachable providers
 */

import { invokeOllamaProvider } from "@/ai/gateway/providers/ollama";
import type { InvokeLLMInput } from "@/ai/gateway/invokeLLM";

// Mock fetch for Ollama tests
const originalFetch = global.fetch;

describe("Ollama Provider", () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("Input validation", () => {
    it("throws error when no prompt provided (text or messages)", async () => {
      const input: InvokeLLMInput = {
        purpose: "test",
        tenantId: "tenant-1",
        policy: "test",
        // No text, no messages
      };

      await expect(invokeOllamaProvider(input)).rejects.toThrow(
        "no prompt provided"
      );
    });

    it("throws error with empty text", async () => {
      const input: InvokeLLMInput = {
        purpose: "test",
        tenantId: "tenant-1",
        policy: "test",
        text: "",
      };

      await expect(invokeOllamaProvider(input)).rejects.toThrow(
        "no prompt provided"
      );
    });

    it("throws error with empty messages array", async () => {
      const input: InvokeLLMInput = {
        purpose: "test",
        tenantId: "tenant-1",
        policy: "test",
        messages: [],
      };

      await expect(invokeOllamaProvider(input)).rejects.toThrow(
        "no prompt provided"
      );
    });
  });

  describe("Message formatting", () => {
    it("formats messages to prompt string", async () => {
      // Mock successful response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: "llama2",
          response: "Test response",
          done: true,
          prompt_eval_count: 10,
          eval_count: 5,
        }),
      });

      const input: InvokeLLMInput = {
        purpose: "test",
        tenantId: "tenant-1",
        policy: "test",
        messages: [
          { role: "system", content: "You are a helpful assistant" },
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
        ],
      };

      const result = await invokeOllamaProvider(input);

      expect(result.text).toBe("Test response");
      expect(result.provider).toBe("ollama");
    });
  });

  describe("API error handling", () => {
    it("throws error on non-OK response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Model not found",
      });

      const input: InvokeLLMInput = {
        purpose: "test",
        tenantId: "tenant-1",
        policy: "test",
        text: "Test prompt",
      };

      await expect(invokeOllamaProvider(input)).rejects.toThrow(
        "Ollama API error: 500"
      );
    });

    it("handles timeout (AbortError)", async () => {
      // Mock fetch that throws AbortError
      global.fetch = jest.fn().mockRejectedValue(
        Object.assign(new Error("Aborted"), { name: "AbortError" })
      );

      const input: InvokeLLMInput = {
        purpose: "test",
        tenantId: "tenant-1",
        policy: "test",
        text: "Test prompt",
      };

      await expect(invokeOllamaProvider(input)).rejects.toThrow(
        "Ollama provider timeout"
      );
    });

    it("rethrows other errors", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const input: InvokeLLMInput = {
        purpose: "test",
        tenantId: "tenant-1",
        policy: "test",
        text: "Test prompt",
      };

      await expect(invokeOllamaProvider(input)).rejects.toThrow("Network error");
    });
  });

  describe("Successful invocation", () => {
    it("returns response with usage stats", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: "llama2:7b",
          response: "This is the LLM response",
          done: true,
          prompt_eval_count: 25,
          eval_count: 50,
          total_duration: 1500000000,
        }),
      });

      const input: InvokeLLMInput = {
        purpose: "summarize",
        tenantId: "tenant-1",
        policy: "standard",
        text: "Summarize this document",
      };

      const result = await invokeOllamaProvider(input);

      expect(result.text).toBe("This is the LLM response");
      expect(result.provider).toBe("ollama");
      expect(result.model).toBe("llama2:7b");
      expect(result.usage?.inputTokens).toBe(25);
      expect(result.usage?.outputTokens).toBe(50);
    });

    it("handles response without usage stats", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: "llama2",
          response: "Response without stats",
          done: true,
          // No prompt_eval_count or eval_count
        }),
      });

      const input: InvokeLLMInput = {
        purpose: "test",
        tenantId: "tenant-1",
        policy: "test",
        text: "Test",
      };

      const result = await invokeOllamaProvider(input);

      expect(result.text).toBe("Response without stats");
      expect(result.usage?.inputTokens).toBe(0);
      expect(result.usage?.outputTokens).toBe(0);
    });
  });
});
