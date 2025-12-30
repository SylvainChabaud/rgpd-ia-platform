/**
 * Tests for PII Middleware - Additional Branch Coverage
 * Purpose: Improve branch coverage from 77.60% to 80%
 *
 * Coverage targets:
 * - pii-middleware.ts: timeout, error handling, messages format, empty text branches
 */

import { redactInput, restoreOutput } from "@/ai/gateway/pii-middleware";
import type { InvokeLLMInput } from "@/ai/gateway/invokeLLM";
import { newId } from "@/shared/ids";

const TENANT_ID = newId();
const ACTOR_ID = newId();

describe("redactInput - Branch Coverage", () => {
  test("handles empty text input (branch: !textToAnalyze)", async () => {
    const input: InvokeLLMInput = {
      text: "",
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { redactedInput, context } = await redactInput(input);

    expect(redactedInput.text).toBe("");
    expect(context.piiDetected).toBe(false);
  });

  test("handles whitespace-only text (branch: textToAnalyze.trim().length === 0)", async () => {
    const input: InvokeLLMInput = {
      text: "   \t\n  ",
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { redactedInput, context } = await redactInput(input);

    expect(redactedInput.text).toBe("   \t\n  ");
    expect(context.piiDetected).toBe(false);
  });

  test("handles input with no PII detected (branch: totalCount === 0)", async () => {
    const input: InvokeLLMInput = {
      text: "Hello world! This text contains no PII.",
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { redactedInput, context } = await redactInput(input);

    expect(redactedInput.text).toBe("Hello world! This text contains no PII.");
    expect(context.piiDetected).toBe(false);
  });

  test("handles messages format with user messages (branch: input.messages)", async () => {
    const input: InvokeLLMInput = {
      messages: [
        { role: "user", content: "Hello, my name is John Doe" },
        { role: "assistant", content: "Hello!" },
        { role: "user", content: "Contact me at john.doe@example.com" },
      ],
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { redactedInput, context } = await redactInput(input);

    // Should redact last user message
    expect(redactedInput.messages).toBeDefined();
    expect(redactedInput.messages![2].content).toContain("[EMAIL_");
    expect(context.piiDetected).toBe(true);
  });

  test("handles messages format with no user messages (branch: userMessages.length === 0)", async () => {
    const input: InvokeLLMInput = {
      messages: [
        { role: "system", content: "You are a helpful assistant" },
        { role: "assistant", content: "How can I help?" },
      ],
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { context } = await redactInput(input);

    expect(context.piiDetected).toBe(false);
  });

  test("handles empty messages array (branch: messages.length === 0)", async () => {
    const input: InvokeLLMInput = {
      messages: [],
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { context } = await redactInput(input);

    expect(context.piiDetected).toBe(false);
  });

  test("handles input with text and PII detected (happy path)", async () => {
    const input: InvokeLLMInput = {
      text: "Contact Jean Dupont at jean.dupont@example.com",
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { redactedInput, context } = await redactInput(input);

    expect(redactedInput.text).toContain("[PERSON_");
    expect(redactedInput.text).toContain("[EMAIL_");
    expect(context.piiDetected).toBe(true);
    expect(context.mappings.length).toBeGreaterThan(0);
  });
});

describe("restoreOutput - Branch Coverage", () => {
  test("returns unchanged text if piiDetected is false (branch: !context.piiDetected)", () => {
    const outputText = "This is a response without PII";
    const context = {
      tenantId: TENANT_ID,
      piiDetected: false,
      mappings: [],
      redactedAt: new Date(),
    };

    const restored = restoreOutput(outputText, context);

    expect(restored).toBe(outputText);
  });

  test("returns unchanged text if mappings are empty (branch: mappings.length === 0)", () => {
    const outputText = "This is a response";
    const context = {
      tenantId: TENANT_ID,
      piiDetected: true,
      mappings: [],
      redactedAt: new Date(),
    };

    const restored = restoreOutput(outputText, context);

    expect(restored).toBe(outputText);
  });

  test("restores PII tokens correctly (happy path)", async () => {
    // First redact
    const input: InvokeLLMInput = {
      text: "Contact Jean at jean@example.com",
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { redactedInput, context } = await redactInput(input);

    // Simulate LLM response using redacted tokens
    const llmOutput = `I will help you contact ${redactedInput.text}`;

    // Restore
    const restored = restoreOutput(llmOutput, context);

    expect(restored).toContain("Jean");
    expect(restored).toContain("jean@example.com");
    expect(restored).not.toContain("[PERSON_");
    expect(restored).not.toContain("[EMAIL_");
  });
});

describe("getTextFromInput - Branch Coverage (via redactInput)", () => {
  test("extracts text from input.text (branch: input.text)", async () => {
    const input: InvokeLLMInput = {
      text: "Test text",
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { redactedInput } = await redactInput(input);

    expect(redactedInput.text).toBe("Test text");
  });

  test("extracts text from messages (branch: !input.text && input.messages)", async () => {
    const input: InvokeLLMInput = {
      messages: [{ role: "user", content: "Test message" }],
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { redactedInput } = await redactInput(input);

    expect(redactedInput.messages![0].content).toBe("Test message");
  });
});

describe("replaceTextInInput - Branch Coverage (via redactInput)", () => {
  test("replaces text in input.text format (branch: input.text)", async () => {
    const input: InvokeLLMInput = {
      text: "Contact john@example.com",
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { redactedInput } = await redactInput(input);

    expect(redactedInput.text).toContain("[EMAIL_");
    expect(redactedInput.text).not.toContain("john@example.com");
  });

  test("replaces text in messages format (branch: input.messages)", async () => {
    const input: InvokeLLMInput = {
      messages: [
        { role: "user", content: "Contact alice@example.com" },
        { role: "assistant", content: "Sure!" },
        { role: "user", content: "Also bob@example.com" },
      ],
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { redactedInput } = await redactInput(input);

    // Should replace last user message
    expect(redactedInput.messages![0].content).toBe("Contact alice@example.com"); // Unchanged
    expect(redactedInput.messages![2].content).toContain("[EMAIL_"); // Redacted
  });

  test("handles messages with no user role (branch: lastUserIndex < 0)", async () => {
    const input: InvokeLLMInput = {
      messages: [{ role: "assistant", content: "Hello" }],
      tenantId: TENANT_ID,
      actorId: ACTOR_ID,
      purpose: "test",
      policy: "test.policy",
    };

    const { redactedInput } = await redactInput(input);

    // Should return unchanged (no user message to replace)
    expect(redactedInput.messages![0].content).toBe("Hello");
  });
});
