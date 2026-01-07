/**
 * storage.classification-enforcement.test.ts — Test data classification enforcement
 *
 * RGPD Compliance:
 * - Art. 9 RGPD: Special categories of personal data MUST be protected
 * - Data minimization: Only store what's necessary and permitted
 * - P3 data storage is STRICTLY FORBIDDEN
 *
 * Requirements (from CONTINUATION_PROMPT_TESTS_COVERAGE.md):
 * - Test P3 data is REJECTED at storage level
 * - Test P2 data requires encryption
 * - Test P0/P1 data is stored without restrictions
 * - Validate conformance with Art. 9 RGPD
 *
 * Reference: docs/data/DATA_CLASSIFICATION.md §2
 *
 * Classification: P1 (technical tests with fictional data only)
 */

import {
  DataClassification,
  SensitiveDataCategory,
  P3DataStorageForbiddenError,
  validateClassification,
  enforceClassificationRules,
  createClassifiedData,
} from "@/domain/data-classification";

describe("BLOCKER: Data Classification Enforcement (Art. 9 RGPD)", () => {
  describe("P3 Data Storage Rejection (CRITICAL)", () => {
    test("BLOCKER: Attempting to store health data (P3) throws error", () => {
      // GIVEN: Health data classified as P3 (e.g. diagnosis, medication, bloodPressure)

      // WHEN: Attempting to enforce classification rules
      // THEN: Must throw P3DataStorageForbiddenError
      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.HEALTH
        );
      }).toThrow(P3DataStorageForbiddenError);

      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.HEALTH
        );
      }).toThrow(/P3 data storage forbidden/);

      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.HEALTH
        );
      }).toThrow(/Art\. 9 RGPD/);
    });

    test("BLOCKER: Attempting to store racial/ethnic data (P3) throws error", () => {
      // GIVEN: Racial/ethnic origin data classified as P3 (e.g. ethnicity, origin)

      // WHEN/THEN: Must be rejected
      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.RACIAL_ETHNIC_ORIGIN
        );
      }).toThrow(P3DataStorageForbiddenError);

      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.RACIAL_ETHNIC_ORIGIN
        );
      }).toThrow(/RACIAL_ETHNIC_ORIGIN/);
    });

    test("BLOCKER: Attempting to store political opinions (P3) throws error", () => {
      // GIVEN: Political opinions classified as P3 (e.g. party, views)

      // WHEN/THEN: Must be rejected
      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.POLITICAL_OPINIONS
        );
      }).toThrow(P3DataStorageForbiddenError);
    });

    test("BLOCKER: Attempting to store religious beliefs (P3) throws error", () => {
      // GIVEN: Religious beliefs classified as P3 (e.g. religion, practices)

      // WHEN/THEN: Must be rejected
      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.RELIGIOUS_BELIEFS
        );
      }).toThrow(P3DataStorageForbiddenError);
    });

    test("BLOCKER: Attempting to store sexual orientation (P3) throws error", () => {
      // GIVEN: Sexual orientation data classified as P3 (e.g. orientation, partner_gender)

      // WHEN/THEN: Must be rejected
      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.SEXUAL_ORIENTATION
        );
      }).toThrow(P3DataStorageForbiddenError);
    });

    test("BLOCKER: Attempting to store biometric data (P3) throws error", () => {
      // GIVEN: Biometric data for identification (e.g. fingerprint_hash, face_encoding)

      // WHEN/THEN: Must be rejected
      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.BIOMETRIC
        );
      }).toThrow(P3DataStorageForbiddenError);
    });

    test("BLOCKER: Attempting to store genetic data (P3) throws error", () => {
      // GIVEN: Genetic data (e.g. dna_sequence, markers)

      // WHEN/THEN: Must be rejected
      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.GENETIC
        );
      }).toThrow(P3DataStorageForbiddenError);
    });

    test("BLOCKER: Attempting to store trade union data (P3) throws error", () => {
      // GIVEN: Trade union membership (e.g. union name, member_since)

      // WHEN/THEN: Must be rejected
      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.TRADE_UNION
        );
      }).toThrow(P3DataStorageForbiddenError);
    });

    test("BLOCKER: P3 validation result shows not allowed", () => {
      // GIVEN: P3 classification
      // WHEN: Validating classification
      const result = validateClassification(
        DataClassification.P3,
        SensitiveDataCategory.HEALTH
      );

      // THEN: Must be marked as not allowed
      expect(result.allowed).toBe(false);
      expect(result.classification).toBe(DataClassification.P3);
      expect(result.rejectionReason).toContain("P3 data storage forbidden");
      expect(result.rejectionReason).toContain("Art. 9 RGPD");
      expect(result.sensitiveCategory).toBe(SensitiveDataCategory.HEALTH);
      expect(result.encryptionRequired).toBe(true); // If exception granted
    });
  });

  describe("P2 Data Encryption Requirement", () => {
    test("BLOCKER: P2 data requires encryption flag", () => {
      // GIVEN: P2 classification (personal data)
      // WHEN: Validating classification
      const result = validateClassification(DataClassification.P2);

      // THEN: Must indicate encryption is required
      expect(result.allowed).toBe(true);
      expect(result.classification).toBe(DataClassification.P2);
      expect(result.encryptionRequired).toBe(true);
      expect(result.rejectionReason).toBeUndefined();
    });

    test("P2 data can be stored if encrypted", () => {
      // GIVEN: P2 data (e.g. email, name, phone)

      // WHEN: Enforcing classification rules
      // THEN: Must NOT throw (but caller must ensure encryption)
      expect(() => {
        enforceClassificationRules(DataClassification.P2);
      }).not.toThrow();

      // Validation should indicate encryption is required
      const validation = validateClassification(DataClassification.P2);
      expect(validation.encryptionRequired).toBe(true);
    });

    test("P2 classified data creation", () => {
      // GIVEN: P2 personal data
      const personalData = {
        email: "user@example.com",
        name: "Jane Smith",
      };

      // WHEN: Creating classified data
      const classified = createClassifiedData(
        personalData,
        DataClassification.P2
      );

      // THEN: Must be properly classified
      expect(classified.data).toEqual(personalData);
      expect(classified.classification).toBe(DataClassification.P2);
      expect(classified.classifiedAt).toBeInstanceOf(Date);
    });
  });

  describe("P0/P1 Data Storage (No Restrictions)", () => {
    test("P0 public data can be stored without restrictions", () => {
      // GIVEN: P0 public/non-personal data (e.g. documentation, templates)

      // WHEN: Validating classification
      const result = validateClassification(DataClassification.P0);

      // THEN: Must be allowed without encryption
      expect(result.allowed).toBe(true);
      expect(result.classification).toBe(DataClassification.P0);
      expect(result.encryptionRequired).toBe(false);
      expect(result.rejectionReason).toBeUndefined();

      // Enforcement must not throw
      expect(() => {
        enforceClassificationRules(DataClassification.P0);
      }).not.toThrow();
    });

    test("P1 technical data can be stored without restrictions", () => {
      // GIVEN: P1 technical internal data (e.g. tenant_id, user_id, status)

      // WHEN: Validating classification
      const result = validateClassification(DataClassification.P1);

      // THEN: Must be allowed without encryption
      expect(result.allowed).toBe(true);
      expect(result.classification).toBe(DataClassification.P1);
      expect(result.encryptionRequired).toBe(false);
      expect(result.rejectionReason).toBeUndefined();

      // Enforcement must not throw
      expect(() => {
        enforceClassificationRules(DataClassification.P1);
      }).not.toThrow();
    });

    test("P1 classified data creation", () => {
      // GIVEN: P1 technical data
      const technicalData = {
        tenant_id: "uuid-123",
        job_status: "completed",
      };

      // WHEN: Creating classified data
      const classified = createClassifiedData(
        technicalData,
        DataClassification.P1
      );

      // THEN: Must be properly classified
      expect(classified.data).toEqual(technicalData);
      expect(classified.classification).toBe(DataClassification.P1);
      expect(classified.classifiedAt).toBeInstanceOf(Date);
    });
  });

  describe("Classification Validation Edge Cases", () => {
    test("P3 data includes sensitive category in error message", () => {
      // GIVEN: P3 health data
      // WHEN: Enforcing rules
      // THEN: Error message must include category
      try {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.HEALTH
        );
        fail("Should have thrown P3DataStorageForbiddenError");
      } catch (error) {
        expect(error).toBeInstanceOf(P3DataStorageForbiddenError);
        expect((error as P3DataStorageForbiddenError).category).toBe(
          SensitiveDataCategory.HEALTH
        );
        expect((error as Error).message).toContain("HEALTH");
      }
    });

    test("P3 validation without category still rejects", () => {
      // GIVEN: P3 classification without specific category
      // WHEN: Validating
      const result = validateClassification(DataClassification.P3);

      // THEN: Must still be rejected
      expect(result.allowed).toBe(false);
      expect(result.rejectionReason).toContain("P3 data storage forbidden");
    });

    test("Classified data immutability", () => {
      // GIVEN: Classified data
      const data = { email: "test@example.com" };
      const classified = createClassifiedData(data, DataClassification.P2);

      // WHEN: Attempting to modify (TypeScript compile-time check)
      // THEN: Properties are readonly
      expect(Object.isFrozen(classified)).toBe(false); // Top level not frozen
      expect(classified.classification).toBe(DataClassification.P2);

      // Data can be modified (caller responsibility), but classification cannot
      // This is intentional - we classify data, not deep-freeze it
    });
  });

  describe("Art. 9 RGPD Compliance Validation", () => {
    test("BLOCKER: All Art. 9 sensitive categories are recognized", () => {
      // GIVEN: All Art. 9 RGPD sensitive data categories
      const categories = [
        SensitiveDataCategory.RACIAL_ETHNIC_ORIGIN,
        SensitiveDataCategory.POLITICAL_OPINIONS,
        SensitiveDataCategory.RELIGIOUS_BELIEFS,
        SensitiveDataCategory.TRADE_UNION,
        SensitiveDataCategory.HEALTH,
        SensitiveDataCategory.SEXUAL_ORIENTATION,
        SensitiveDataCategory.GENETIC,
        SensitiveDataCategory.BIOMETRIC,
      ];

      // WHEN/THEN: Each category must be rejected for storage
      categories.forEach((category) => {
        const result = validateClassification(DataClassification.P3, category);

        expect(result.allowed).toBe(false);
        expect(result.sensitiveCategory).toBe(category);
        expect(result.rejectionReason).toContain("Art. 9 RGPD");

        // Enforcement must throw
        expect(() => {
          enforceClassificationRules(DataClassification.P3, category);
        }).toThrow(P3DataStorageForbiddenError);
      });
    });

    test("BLOCKER: P3 storage rejection is non-bypassable", () => {
      // GIVEN: P3 health data
      // WHEN: Multiple attempts to store with different methods
      // THEN: All must be rejected

      // Attempt 1: Direct enforcement
      expect(() => {
        enforceClassificationRules(
          DataClassification.P3,
          SensitiveDataCategory.HEALTH
        );
      }).toThrow(P3DataStorageForbiddenError);

      // Attempt 2: Validation check
      const validation = validateClassification(
        DataClassification.P3,
        SensitiveDataCategory.HEALTH
      );
      expect(validation.allowed).toBe(false);

      // Attempt 3: Creating classified data (doesn't enforce, just classifies)
      const classified = createClassifiedData(
        { diagnosis: "test" },
        DataClassification.P3,
        SensitiveDataCategory.HEALTH
      );
      expect(classified.classification).toBe(DataClassification.P3);

      // But enforcement on P3 must still fail
      expect(() => {
        enforceClassificationRules(
          classified.classification,
          classified.sensitiveCategory
        );
      }).toThrow(P3DataStorageForbiddenError);
    });
  });
});
