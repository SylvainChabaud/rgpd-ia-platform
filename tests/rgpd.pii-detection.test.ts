/**
 * rgpd.pii-detection.test.ts — Test PII detection capabilities
 *
 * RGPD Compliance:
 * - Art. 32 (Pseudonymization): Validate PII detection accuracy
 * - LOT 8.0: PII Detection & Redaction
 *
 * Target: 95% recall on PII detection
 */

import { detectPII, detectPIIByType, containsPII } from "@/infrastructure/pii";

describe("RGPD - PII Detection", () => {
  describe("PERSON detection", () => {
    it("detects French names and surnames", () => {
      const text = "Bonjour, Jean Dupont est disponible pour information";
      const result = detectPII(text);

      expect(result.totalCount).toBeGreaterThanOrEqual(1);
      const person = result.entities.find((e) => e.type === "PERSON");
      expect(person).toBeDefined();
      expect(person?.value).toBe("Jean Dupont");
    });

    it("detects hyphenated names", () => {
      const text = "Marie-Claire Martin travaille ici";
      const result = detectPII(text);

      const person = result.entities.find((e) => e.type === "PERSON");
      expect(person).toBeDefined();
      expect(person?.value).toBe("Marie-Claire Martin");
    });

    it("does not detect single capitalized words", () => {
      const text = "Paris est une belle ville";
      const result = detectPII(text);

      // "Paris" should be whitelisted
      const persons = result.entities.filter((e) => e.type === "PERSON");
      expect(persons).toHaveLength(0);
    });

    it("does not detect technical acronyms", () => {
      const text = "API REST HTTP JSON RGPD";
      const result = detectPII(text);

      const persons = result.entities.filter((e) => e.type === "PERSON");
      expect(persons).toHaveLength(0);
    });
  });

  describe("EMAIL detection", () => {
    it("detects valid email addresses", () => {
      const text = "Envoyer à jean.dupont@example.com";
      const result = detectPII(text);

      expect(result.totalCount).toBeGreaterThanOrEqual(1);
      const email = result.entities.find((e) => e.type === "EMAIL");
      expect(email).toBeDefined();
      expect(email?.value).toBe("jean.dupont@example.com");
    });

    it("detects emails with plus sign", () => {
      const text = "Contact: user+tag@domain.co.uk";
      const result = detectPII(text);

      const email = result.entities.find((e) => e.type === "EMAIL");
      expect(email).toBeDefined();
      expect(email?.value).toBe("user+tag@domain.co.uk");
    });

    it("does not detect invalid emails", () => {
      const text = "invalid@ @domain.com user@";
      const result = detectPII(text);

      const emails = result.entities.filter((e) => e.type === "EMAIL");
      expect(emails).toHaveLength(0);
    });
  });

  describe("PHONE detection", () => {
    it("detects French phone numbers with spaces", () => {
      const text = "Appeler le 06 12 34 56 78";
      const result = detectPII(text);

      expect(result.totalCount).toBeGreaterThanOrEqual(1);
      const phone = result.entities.find((e) => e.type === "PHONE");
      expect(phone).toBeDefined();
      expect(phone?.value).toBe("06 12 34 56 78");
    });

    it("detects French phone numbers with dots", () => {
      const text = "Tel: 06.12.34.56.78";
      const result = detectPII(text);

      const phone = result.entities.find((e) => e.type === "PHONE");
      expect(phone).toBeDefined();
      expect(phone?.value).toBe("06.12.34.56.78");
    });

    it("detects French phone numbers with dashes", () => {
      const text = "Mobile: 06-12-34-56-78";
      const result = detectPII(text);

      const phone = result.entities.find((e) => e.type === "PHONE");
      expect(phone).toBeDefined();
      expect(phone?.value).toBe("06-12-34-56-78");
    });

    it("detects phone numbers without separators", () => {
      const text = "Numero: 0612345678";
      const result = detectPII(text);

      const phone = result.entities.find((e) => e.type === "PHONE");
      expect(phone).toBeDefined();
      expect(phone?.value).toBe("0612345678");
    });

    it("detects international format", () => {
      const text = "Call +33 6 12 34 56 78";
      const result = detectPII(text);

      const phone = result.entities.find((e) => e.type === "PHONE");
      expect(phone).toBeDefined();
      expect(phone?.value).toBe("+33 6 12 34 56 78");
    });
  });

  describe("ADDRESS detection", () => {
    it("detects French postal addresses", () => {
      const text = "Habite au 123 rue de la Paix, 75001 Paris";
      const result = detectPII(text);

      const address = result.entities.find((e) => e.type === "ADDRESS");
      expect(address).toBeDefined();
      expect(address?.value).toContain("rue de la Paix");
    });

    it("detects addresses with avenue", () => {
      const text = "Adresse: 45 avenue des Champs-Élysées, 75008 Paris";
      const result = detectPII(text);

      const address = result.entities.find((e) => e.type === "ADDRESS");
      expect(address).toBeDefined();
    });
  });

  describe("SSN detection", () => {
    it("detects French social security numbers with spaces", () => {
      const text = "SSN: 1 89 05 75 123 456 78";
      const result = detectPII(text);

      const ssn = result.entities.find((e) => e.type === "SSN");
      expect(ssn).toBeDefined();
    });

    it("detects French social security numbers without spaces", () => {
      const text = "Numéro: 2890575123456789";
      const result = detectPII(text);

      const ssn = result.entities.find((e) => e.type === "SSN");
      expect(ssn).toBeDefined();
    });
  });

  describe("IBAN detection", () => {
    it("detects French IBAN", () => {
      const text = "IBAN: FR76 1234 5678 90AB CDEF GHIJ K12";
      const result = detectPII(text);

      const iban = result.entities.find((e) => e.type === "IBAN");
      expect(iban).toBeDefined();
    });

    it("detects German IBAN", () => {
      const text = "Account: DE89 3704 0044 0532 0130 00";
      const result = detectPII(text);

      const iban = result.entities.find((e) => e.type === "IBAN");
      expect(iban).toBeDefined();
    });
  });

  describe("detectPIIByType", () => {
    it("detects only specified PII type", () => {
      const text = "Contact Jean Dupont at jean@example.com, phone 06 12 34 56 78";
      const result = detectPIIByType(text, "EMAIL");

      expect(result.totalCount).toBe(1);
      expect(result.entities[0].type).toBe("EMAIL");
      expect(result.entities[0].value).toBe("jean@example.com");
    });
  });

  describe("containsPII", () => {
    it("returns true if PII detected", () => {
      const text = "Email me at test@example.com";
      expect(containsPII(text)).toBe(true);
    });

    it("returns false if no PII detected", () => {
      const text = "This is a clean text without any PII";
      expect(containsPII(text)).toBe(false);
    });
  });

  describe("PII detection result metadata", () => {
    it("includes detected types in result", () => {
      const text = "Contact Jean Dupont at jean@example.com";
      const result = detectPII(text);

      expect(result.detectedTypes).toContain("PERSON");
      expect(result.detectedTypes).toContain("EMAIL");
    });

    it("includes position information", () => {
      const text = "Email: test@example.com";
      const result = detectPII(text);

      const email = result.entities.find((e) => e.type === "EMAIL");
      expect(email?.startIndex).toBe(7);
      expect(email?.endIndex).toBe(23);
    });

    it("includes confidence score", () => {
      const text = "test@example.com";
      const result = detectPII(text);

      expect(result.entities[0].confidence).toBe(1.0);
    });
  });

  describe("Multiple PII entities", () => {
    it("detects multiple PII entities in same text", () => {
      const text =
        "Jean Dupont (jean@example.com) appelle le 06 12 34 56 78 depuis 123 rue de la Paix, 75001 Paris";
      const result = detectPII(text);

      expect(result.totalCount).toBeGreaterThanOrEqual(4);
      expect(result.detectedTypes).toContain("PERSON");
      expect(result.detectedTypes).toContain("EMAIL");
      expect(result.detectedTypes).toContain("PHONE");
      expect(result.detectedTypes).toContain("ADDRESS");
    });

    it("sorts entities by position", () => {
      const text = "Call 06 12 34 56 78 or email test@example.com";
      const result = detectPII(text);

      expect(result.entities[0].startIndex).toBeLessThan(
        result.entities[1].startIndex
      );
    });
  });

  describe("Edge cases", () => {
    it("handles empty text", () => {
      const result = detectPII("");
      expect(result.totalCount).toBe(0);
      expect(result.entities).toHaveLength(0);
    });

    it("handles whitespace-only text", () => {
      const result = detectPII("   \n\t  ");
      expect(result.totalCount).toBe(0);
    });

    it("handles special characters", () => {
      const text = "Email: <test@example.com>";
      const result = detectPII(text);

      const email = result.entities.find((e) => e.type === "EMAIL");
      expect(email).toBeDefined();
      expect(email?.value).toBe("test@example.com");
    });
  });
});
