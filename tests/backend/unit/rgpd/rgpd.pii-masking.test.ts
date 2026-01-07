/**
 * rgpd.pii-masking.test.ts — Test PII masking capabilities
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): Validate token-based PII masking
 * - LOT 8.0: PII Masking
 *
 * CRITICAL: Validate that mappings are NEVER persisted
 */

import { detectPII } from "@/infrastructure/pii/detector";
import {
  maskPII,
  validateMaskedText,
  getPIISummary,
} from "@/infrastructure/pii/masker";

describe("RGPD - PII Masking", () => {
  describe("Basic masking", () => {
    it("masks person names with tokens", () => {
      const text = "Jean Dupont travaille ici";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      expect(result.maskedText).toContain("[PERSON_1]");
      expect(result.maskedText).not.toContain("Jean Dupont");
      expect(result.maskCount).toBe(1);
    });

    it("masks emails with tokens", () => {
      const text = "Contact: jean@example.com";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      expect(result.maskedText).toBe("Contact: [EMAIL_1]");
      expect(result.maskCount).toBe(1);
    });

    it("masks phone numbers with tokens", () => {
      const text = "Appeler le 06 12 34 56 78";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      expect(result.maskedText).toBe("Appeler le [PHONE_1]");
      expect(result.maskCount).toBe(1);
    });
  });

  describe("Multiple PII masking", () => {
    it("masks multiple different PII types", () => {
      const text = "Jean Dupont, email: jean@example.com, tel: 06 12 34 56 78";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      expect(result.maskedText).toContain("[PERSON_1]");
      expect(result.maskedText).toContain("[EMAIL_1]");
      expect(result.maskedText).toContain("[PHONE_1]");
      expect(result.maskCount).toBeGreaterThanOrEqual(3);
    });

    it("increments tokens correctly for multiple same-type PII", () => {
      const text = "Jean Dupont et Marie Martin";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      expect(result.maskedText).toContain("[PERSON_1]");
      expect(result.maskedText).toContain("[PERSON_2]");
      expect(result.maskCount).toBe(2);
    });
  });

  describe("Consistency preservation", () => {
    it("uses same token for duplicate PII values", () => {
      const text = "Jean Dupont says Jean Dupont likes this";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      // Both occurrences should use [PERSON_1]
      expect(result.maskedText).toBe("[PERSON_1] says [PERSON_1] likes this");
      expect(result.maskCount).toBe(1); // Only 1 unique mapping
    });

    it("preserves consistency across multiple occurrences", () => {
      const text =
        "Jean Dupont says Jean Dupont will respond. Email: jean@example.com from jean@example.com";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      expect(result.maskedText).toBe(
        "[PERSON_1] says [PERSON_1] will respond. Email: [EMAIL_1] from [EMAIL_1]"
      );
      expect(result.maskCount).toBe(2); // 1 person + 1 email
    });
  });

  describe("Mapping structure", () => {
    it("includes token in mapping", () => {
      const text = "Jean Dupont";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].token).toBe("[PERSON_1]");
    });

    it("includes original value in mapping", () => {
      const text = "jean@example.com";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      expect(result.mappings[0].originalValue).toBe("jean@example.com");
    });

    it("includes PII type in mapping", () => {
      const text = "06 12 34 56 78";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      expect(result.mappings[0].type).toBe("PHONE");
    });
  });

  describe("validateMaskedText", () => {
    it("returns true when no PII values in masked text", () => {
      const text = "Jean Dupont at jean@example.com";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      const isValid = validateMaskedText(result.maskedText, result.mappings);
      expect(isValid).toBe(true);
    });

    it("returns false if PII value leaked in masked text", () => {
      const maskedText = "Contact Jean Dupont at [EMAIL_1]"; // PII leaked!
      const mappings = [
        { token: "[PERSON_1]", originalValue: "Jean Dupont", type: "PERSON" as const },
        { token: "[EMAIL_1]", originalValue: "jean@example.com", type: "EMAIL" as const },
      ];

      const isValid = validateMaskedText(maskedText, mappings);
      expect(isValid).toBe(false);
    });
  });

  describe("getPIISummary", () => {
    it("extracts PII types without values", () => {
      const text = "Jean Dupont, jean@example.com, 06 12 34 56 78";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      const summary = getPIISummary(result.mappings);

      // CRITICAL: Summary must NOT contain original PII values
      expect(summary.pii_types).toContain("PERSON");
      expect(summary.pii_types).toContain("EMAIL");
      expect(summary.pii_types).toContain("PHONE");
      expect(summary.pii_count).toBeGreaterThanOrEqual(3);

      // Validate NO PII values in summary
      const summaryJson = JSON.stringify(summary);
      expect(summaryJson).not.toContain("Jean Dupont");
      expect(summaryJson).not.toContain("jean@example.com");
      expect(summaryJson).not.toContain("06 12 34 56 78");
    });

    it("returns unique PII types only", () => {
      const text = "Jean Dupont et Marie Martin";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      const summary = getPIISummary(result.mappings);

      expect(summary.pii_types).toEqual(["PERSON"]);
      expect(summary.pii_count).toBe(2);
    });
  });

  describe("Edge cases", () => {
    it("handles empty entity list", () => {
      const text = "No PII here";
      const result = maskPII(text, []);

      expect(result.maskedText).toBe(text);
      expect(result.maskCount).toBe(0);
      expect(result.mappings).toHaveLength(0);
    });

    it("handles empty text", () => {
      const result = maskPII("", []);

      expect(result.maskedText).toBe("");
      expect(result.maskCount).toBe(0);
    });

    it("preserves text structure and spacing", () => {
      const text = "Contact   Jean Dupont   at   jean@example.com";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      // Spacing should be preserved
      expect(result.maskedText).toContain("   ");
      expect(result.maskedText.split("   ")).toHaveLength(4);
    });

    it("handles PII at text boundaries", () => {
      const text = "jean@example.com";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      expect(result.maskedText).toBe("[EMAIL_1]");
    });

    it("handles overlapping detection regions gracefully", () => {
      // Edge case: if detection produces overlapping entities
      const text = "Test text";
      const entities = [
        {
          type: "PERSON" as const,
          value: "Test",
          startIndex: 0,
          endIndex: 4,
          confidence: 1.0,
        },
        {
          type: "PERSON" as const,
          value: "text",
          startIndex: 5,
          endIndex: 9,
          confidence: 1.0,
        },
      ];
      const result = maskPII(text, entities);

      expect(result.maskedText).toContain("[PERSON_");
      expect(result.maskCount).toBe(2);
    });
  });

  describe("RGPD Compliance Validation", () => {
    it("CRITICAL: Mappings must be immutable", () => {
      const text = "Jean Dupont";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      // Attempt to modify mappings should fail (frozen array)
      expect(Object.isFrozen(result.mappings)).toBe(true);
    });

    it("CRITICAL: No PII values in masked text", () => {
      const text =
        "Sensitive info: Jean Dupont, jean@example.com, 06 12 34 56 78, 1 89 05 75 123 456 78, FR76 1234 5678 90AB";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      // Validate NO original PII values present
      for (const mapping of result.mappings) {
        expect(result.maskedText).not.toContain(mapping.originalValue);
      }
    });

    it("Original text preserved in result for validation", () => {
      const text = "Jean Dupont";
      const entities = detectPII(text).entities;
      const result = maskPII(text, entities);

      expect(result.originalText).toBe(text);
    });
  });
});
