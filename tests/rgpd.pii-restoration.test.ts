/**
 * rgpd.pii-restoration.test.ts — Test PII restoration capabilities
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): Validate reverse mapping
 * - LOT 8.0: PII Restoration
 *
 * CRITICAL: Restoration only for user-facing outputs, mappings purged after
 */

import { detectPII } from "@/infrastructure/pii/detector";
import { maskPII, restorePII } from "@/infrastructure/pii/masker";

describe("RGPD - PII Restoration", () => {
  describe("Basic restoration", () => {
    it("restores PII from tokens in LLM output", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput = "Je vais contacter [PERSON_1] demain";
      const restored = restorePII(llmOutput, masked.mappings);

      expect(restored).toBe("Je vais contacter Jean Dupont demain");
    });

    it("restores email addresses", () => {
      const original = "jean@example.com";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput = "Envoyer à [EMAIL_1]";
      const restored = restorePII(llmOutput, masked.mappings);

      expect(restored).toBe("Envoyer à jean@example.com");
    });

    it("restores phone numbers", () => {
      const original = "06 12 34 56 78";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput = "Appeler le [PHONE_1]";
      const restored = restorePII(llmOutput, masked.mappings);

      expect(restored).toBe("Appeler le 06 12 34 56 78");
    });
  });

  describe("Multiple PII restoration", () => {
    it("restores multiple PII entities", () => {
      const original = "Jean Dupont, jean@example.com, 06 12 34 56 78";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput =
        "Contacter [PERSON_1] par email ([EMAIL_1]) ou téléphone ([PHONE_1])";
      const restored = restorePII(llmOutput, masked.mappings);

      expect(restored).toContain("Jean Dupont");
      expect(restored).toContain("jean@example.com");
      expect(restored).toContain("06 12 34 56 78");
    });

    it("restores same token multiple times", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput = "[PERSON_1] dit que [PERSON_1] aime ça";
      const restored = restorePII(llmOutput, masked.mappings);

      expect(restored).toBe("Jean Dupont dit que Jean Dupont aime ça");
    });
  });

  describe("Partial restoration", () => {
    it("preserves non-token text unchanged", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput = "Bonjour, je vais aider [PERSON_1] avec ce problème";
      const restored = restorePII(llmOutput, masked.mappings);

      expect(restored).toBe("Bonjour, je vais aider Jean Dupont avec ce problème");
    });

    it("handles LLM output with no tokens", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput = "Aucune mention de personne ici";
      const restored = restorePII(llmOutput, masked.mappings);

      // Should return unchanged if no tokens found
      expect(restored).toBe(llmOutput);
    });

    it("handles LLM output with unknown tokens", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput = "Contacter [PERSON_2]"; // Token not in mappings
      const restored = restorePII(llmOutput, masked.mappings);

      // Unknown token should remain
      expect(restored).toBe("Contacter [PERSON_2]");
    });
  });

  describe("Edge cases", () => {
    it("handles empty LLM output", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const restored = restorePII("", masked.mappings);
      expect(restored).toBe("");
    });

    it("handles empty mappings", () => {
      const llmOutput = "Some text with [PERSON_1]";
      const restored = restorePII(llmOutput, []);

      // No mappings means no restoration
      expect(restored).toBe(llmOutput);
    });

    it("handles token at text boundaries", () => {
      const original = "jean@example.com";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput = "[EMAIL_1]";
      const restored = restorePII(llmOutput, masked.mappings);

      expect(restored).toBe("jean@example.com");
    });

    it("handles tokens in special contexts", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput = "Email: <[PERSON_1]@company.com>";
      const restored = restorePII(llmOutput, masked.mappings);

      expect(restored).toBe("Email: <Jean Dupont@company.com>");
    });
  });

  describe("LLM modifications handling", () => {
    it("handles LLM modifying token format", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      // LLM might change token case or spacing
      const llmOutput = "Contact Person 1"; // LLM didn't preserve token format
      const restored = restorePII(llmOutput, masked.mappings);

      // Should NOT restore if token format changed
      expect(restored).toBe("Contact Person 1");
      expect(restored).not.toContain("Jean Dupont");
    });

    it("handles LLM removing tokens entirely", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput = "Je vais contacter cette personne demain"; // No token
      const restored = restorePII(llmOutput, masked.mappings);

      // No restoration if LLM removed token
      expect(restored).toBe(llmOutput);
    });
  });

  describe("Round-trip masking and restoration", () => {
    it("preserves original text through mask and restore", () => {
      const original = "Contact Jean Dupont at jean@example.com or 06 12 34 56 78";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      // Simulate LLM echoing the masked input
      const llmOutput = masked.maskedText;
      const restored = restorePII(llmOutput, masked.mappings);

      // After restoration, should match original
      expect(restored).toBe(original);
    });

    it("handles complex text with mixed content", () => {
      const original =
        "Urgent: Jean Dupont (jean@example.com) doit appeler Marie Martin (marie@example.fr) au 06 12 34 56 78";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const restored = restorePII(masked.maskedText, masked.mappings);

      expect(restored).toBe(original);
    });
  });

  describe("RGPD Compliance Validation", () => {
    it("CRITICAL: Mappings must not be persisted in test context", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      // Mappings should be frozen (immutable)
      expect(Object.isFrozen(masked.mappings)).toBe(true);

      // After restoration, mappings should be discarded (not retained)
      const llmOutput = "[PERSON_1]";
      restorePII(llmOutput, masked.mappings);

      // Test cannot verify memory deallocation, but validates immutability
      expect(Object.isFrozen(masked.mappings)).toBe(true);
    });

    it("Restoration does not leak PII in process", () => {
      const original = "Secret: Jean Dupont, jean@example.com";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      const llmOutput = "Info about [PERSON_1] and [EMAIL_1]";
      const restored = restorePII(llmOutput, masked.mappings);

      // Validate restoration worked
      expect(restored).toContain("Jean Dupont");
      expect(restored).toContain("jean@example.com");

      // Validate mappings remained immutable
      expect(Object.isFrozen(masked.mappings)).toBe(true);
    });

    it("Validates safe restoration with readonly mappings", () => {
      const original = "Jean Dupont";
      const entities = detectPII(original).entities;
      const masked = maskPII(original, entities);

      // Mappings are readonly - cannot be modified
      expect(() => {
        // @ts-expect-error - Testing immutability
        masked.mappings.push({
          token: "[PERSON_2]",
          originalValue: "Hacker",
          type: "PERSON",
        });
      }).toThrow();
    });
  });
});
