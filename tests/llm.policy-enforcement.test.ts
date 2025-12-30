/**
 * llm.policy-enforcement.test.ts — Test LLM use case policy enforcement
 *
 * RGPD Compliance:
 * - LLM_USAGE_POLICY.md §2-3: Validate allowed/forbidden use cases
 * - Art. 22 RGPD: Prevent automated decision-making
 * - Art. 9 RGPD: Prevent unauthorized sensitive data processing
 *
 * Gap addressed:
 * - No existing test validates LLM_USAGE_POLICY.md is enforced at runtime
 * - This test ensures forbidden use cases are BLOCKED before LLM invocation
 *
 * Reference: .claude/CONTINUATION_PROMPT_TESTS_COVERAGE.md §4
 *
 * Classification: P1 (technical tests, no sensitive data)
 */

import {
  AllowedUseCase,
  ForbiddenUseCase,
  ForbiddenUseCaseError,
  validateUseCase,
  enforceUseCasePolicy,
  requiresHumanValidation,
} from "@/ai/gateway/enforcement/useCasePolicy";

describe("LLM Policy Enforcement (LLM_USAGE_POLICY.md)", () => {
  describe("Allowed Use Cases (§2)", () => {
    describe("A. Transformation (Low Risk)", () => {
      test("REFORMULATION use case is allowed", () => {
        const result = validateUseCase(AllowedUseCase.REFORMULATION);

        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe("low");
        expect(result.consentRequired).toBe(true);
        expect(result.humanValidationRequired).toBe(false);
      });

      test("SUMMARY use case is allowed", () => {
        const result = validateUseCase(AllowedUseCase.SUMMARY);

        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe("low");
      });

      test("TEXT_NORMALIZATION use case is allowed", () => {
        const result = validateUseCase(AllowedUseCase.TEXT_NORMALIZATION);

        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe("low");
      });

      test("PII_ANONYMIZATION use case is allowed (LOT 8.0)", () => {
        const result = validateUseCase(AllowedUseCase.PII_ANONYMIZATION);

        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe("low");
        expect(result.useCase).toBe("PII_ANONYMIZATION");
      });

      test("Transformation use cases do NOT require human validation", () => {
        const transformationCases = [
          AllowedUseCase.REFORMULATION,
          AllowedUseCase.SUMMARY,
          AllowedUseCase.TEXT_NORMALIZATION,
        ];

        transformationCases.forEach((useCase) => {
          expect(requiresHumanValidation(useCase)).toBe(false);
        });
      });

      test("Transformation use cases enforcement does not throw", () => {
        expect(() => {
          enforceUseCasePolicy(AllowedUseCase.REFORMULATION);
        }).not.toThrow();

        expect(() => {
          enforceUseCasePolicy(AllowedUseCase.SUMMARY);
        }).not.toThrow();
      });
    });

    describe("B. Classification (Moderate Risk)", () => {
      test("CATEGORIZATION use case is allowed", () => {
        const result = validateUseCase(AllowedUseCase.CATEGORIZATION);

        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe("moderate");
        expect(result.consentRequired).toBe(true);
      });

      test("DOCUMENT_TYPE_DETECTION use case is allowed", () => {
        const result = validateUseCase(
          AllowedUseCase.DOCUMENT_TYPE_DETECTION
        );

        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe("moderate");
      });

      test("NON_DECISIONAL_SCORING use case is allowed", () => {
        const result = validateUseCase(AllowedUseCase.NON_DECISIONAL_SCORING);

        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe("moderate");
        expect(result.useCase).toBe("NON_DECISIONAL_SCORING");
      });

      test("Classification use cases do NOT require human validation", () => {
        expect(
          requiresHumanValidation(AllowedUseCase.CATEGORIZATION)
        ).toBe(false);
        expect(
          requiresHumanValidation(AllowedUseCase.NON_DECISIONAL_SCORING)
        ).toBe(false);
      });
    });

    describe("C. Extraction (Moderate Risk)", () => {
      test("FIELD_EXTRACTION use case is allowed", () => {
        const result = validateUseCase(AllowedUseCase.FIELD_EXTRACTION);

        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe("moderate");
        expect(result.consentRequired).toBe(true);
      });

      test("CONTENT_STRUCTURING use case is allowed", () => {
        const result = validateUseCase(AllowedUseCase.CONTENT_STRUCTURING);

        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe("moderate");
      });
    });

    describe("D. Assisted Generation (High Risk)", () => {
      test("WRITING_ASSISTANCE use case is allowed", () => {
        const result = validateUseCase(AllowedUseCase.WRITING_ASSISTANCE);

        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe("high");
        expect(result.consentRequired).toBe(true);
      });

      test("SUGGESTIONS use case is allowed", () => {
        const result = validateUseCase(AllowedUseCase.SUGGESTIONS);

        expect(result.allowed).toBe(true);
        expect(result.riskLevel).toBe("high");
      });

      test("Assisted generation REQUIRES human validation", () => {
        expect(
          requiresHumanValidation(AllowedUseCase.WRITING_ASSISTANCE)
        ).toBe(true);
        expect(requiresHumanValidation(AllowedUseCase.SUGGESTIONS)).toBe(true);
      });

      test("High risk use cases still require consent", () => {
        const result = validateUseCase(AllowedUseCase.WRITING_ASSISTANCE);

        expect(result.consentRequired).toBe(true);
        expect(result.humanValidationRequired).toBe(true);
      });
    });
  });

  describe("Forbidden Use Cases (§3) - BLOCKER", () => {
    test("BLOCKER: AUTOMATED_DECISION use case is rejected (Art. 22 RGPD)", () => {
      const result = validateUseCase(ForbiddenUseCase.AUTOMATED_DECISION);

      expect(result.allowed).toBe(false);
      expect(result.useCase).toBe("AUTOMATED_DECISION");
      expect(result.rejectionReason).toContain("Forbidden use case");
      expect(result.rejectionReason).toContain("LLM_USAGE_POLICY.md");
    });

    test("BLOCKER: AUTOMATED_DECISION enforcement throws error", () => {
      expect(() => {
        enforceUseCasePolicy(ForbiddenUseCase.AUTOMATED_DECISION);
      }).toThrow(ForbiddenUseCaseError);

      expect(() => {
        enforceUseCasePolicy(ForbiddenUseCase.AUTOMATED_DECISION);
      }).toThrow(/Forbidden use case/);
    });

    test("BLOCKER: MEDICAL_DIAGNOSIS use case is rejected (Art. 9 RGPD)", () => {
      const result = validateUseCase(ForbiddenUseCase.MEDICAL_DIAGNOSIS);

      expect(result.allowed).toBe(false);
      expect(result.useCase).toBe("MEDICAL_DIAGNOSIS");
      expect(result.riskLevel).toBe("high");
    });

    test("BLOCKER: MEDICAL_DIAGNOSIS enforcement throws error", () => {
      expect(() => {
        enforceUseCasePolicy(ForbiddenUseCase.MEDICAL_DIAGNOSIS);
      }).toThrow(ForbiddenUseCaseError);
    });

    test("BLOCKER: LEGAL_ADVICE use case is rejected", () => {
      const result = validateUseCase(ForbiddenUseCase.LEGAL_ADVICE);

      expect(result.allowed).toBe(false);
      expect(result.rejectionReason).toContain("Forbidden");
    });

    test("BLOCKER: PROFILING_NO_BASIS use case is rejected", () => {
      const result = validateUseCase(ForbiddenUseCase.PROFILING_NO_BASIS);

      expect(result.allowed).toBe(false);
    });

    test("BLOCKER: TRAINING_ON_USER_DATA use case is rejected", () => {
      const result = validateUseCase(ForbiddenUseCase.TRAINING_ON_USER_DATA);

      expect(result.allowed).toBe(false);
      expect(result.useCase).toBe("TRAINING_ON_USER_DATA");
    });

    test("BLOCKER: FRONTEND_LLM_CALL use case is rejected", () => {
      const result = validateUseCase(ForbiddenUseCase.FRONTEND_LLM_CALL);

      expect(result.allowed).toBe(false);
    });

    test("BLOCKER: LOAN_APPROVAL automation is rejected", () => {
      const result = validateUseCase(ForbiddenUseCase.LOAN_APPROVAL);

      expect(result.allowed).toBe(false);

      expect(() => {
        enforceUseCasePolicy(ForbiddenUseCase.LOAN_APPROVAL);
      }).toThrow(ForbiddenUseCaseError);
    });

    test("BLOCKER: EMPLOYMENT_DECISION automation is rejected", () => {
      const result = validateUseCase(ForbiddenUseCase.EMPLOYMENT_DECISION);

      expect(result.allowed).toBe(false);
    });

    test("BLOCKER: CREDIT_SCORING automation is rejected", () => {
      const result = validateUseCase(ForbiddenUseCase.CREDIT_SCORING);

      expect(result.allowed).toBe(false);

      expect(() => {
        enforceUseCasePolicy(ForbiddenUseCase.CREDIT_SCORING);
      }).toThrow(/Forbidden use case/);
    });
  });

  describe("Unknown Use Cases - Fail-Safe Rejection", () => {
    test("BLOCKER: Unknown use case is rejected by default", () => {
      const unknownUseCase = "UNKNOWN_EXPERIMENTAL_USE_CASE";

      const result = validateUseCase(unknownUseCase);

      expect(result.allowed).toBe(false);
      expect(result.rejectionReason).toContain("Unknown use case");
      expect(result.rejectionReason).toContain("not in allowlist");
    });

    test("BLOCKER: Unknown use case enforcement throws error", () => {
      expect(() => {
        enforceUseCasePolicy("SUSPICIOUS_USE_CASE");
      }).toThrow(ForbiddenUseCaseError);
    });

    test("Empty string use case is rejected", () => {
      const result = validateUseCase("");

      expect(result.allowed).toBe(false);
    });

    test("Random string use case is rejected", () => {
      const result = validateUseCase("random_string_123");

      expect(result.allowed).toBe(false);
      expect(result.riskLevel).toBe("high"); // Unknown = high risk
    });
  });

  describe("Risk Level Classification", () => {
    test("Low risk use cases: Transformation + PII", () => {
      const lowRiskCases = [
        AllowedUseCase.REFORMULATION,
        AllowedUseCase.SUMMARY,
        AllowedUseCase.TEXT_NORMALIZATION,
        AllowedUseCase.PII_ANONYMIZATION,
        AllowedUseCase.PII_REDACTION,
      ];

      lowRiskCases.forEach((useCase) => {
        const result = validateUseCase(useCase);
        expect(result.riskLevel).toBe("low");
      });
    });

    test("Moderate risk use cases: Classification + Extraction", () => {
      const moderateRiskCases = [
        AllowedUseCase.CATEGORIZATION,
        AllowedUseCase.DOCUMENT_TYPE_DETECTION,
        AllowedUseCase.NON_DECISIONAL_SCORING,
        AllowedUseCase.FIELD_EXTRACTION,
        AllowedUseCase.CONTENT_STRUCTURING,
      ];

      moderateRiskCases.forEach((useCase) => {
        const result = validateUseCase(useCase);
        expect(result.riskLevel).toBe("moderate");
      });
    });

    test("High risk use cases: Assisted generation", () => {
      const highRiskCases = [
        AllowedUseCase.WRITING_ASSISTANCE,
        AllowedUseCase.SUGGESTIONS,
      ];

      highRiskCases.forEach((useCase) => {
        const result = validateUseCase(useCase);
        expect(result.riskLevel).toBe("high");
      });
    });
  });

  describe("Consent Requirements", () => {
    test("ALL allowed use cases require consent", () => {
      const allAllowedCases = Object.values(AllowedUseCase);

      allAllowedCases.forEach((useCase) => {
        const result = validateUseCase(useCase);
        expect(result.allowed).toBe(true);
        expect(result.consentRequired).toBe(true);
      });
    });

    test("Forbidden use cases do not require consent (already blocked)", () => {
      const forbiddenCases = Object.values(ForbiddenUseCase);

      forbiddenCases.forEach((useCase) => {
        const result = validateUseCase(useCase);
        expect(result.allowed).toBe(false);
        expect(result.consentRequired).toBe(false); // No consent needed if blocked
      });
    });
  });

  describe("Human Validation Requirements", () => {
    test("Only high-risk assisted generation requires human validation", () => {
      const requiresHuman = [
        AllowedUseCase.WRITING_ASSISTANCE,
        AllowedUseCase.SUGGESTIONS,
      ];

      requiresHuman.forEach((useCase) => {
        expect(requiresHumanValidation(useCase)).toBe(true);
      });
    });

    test("Low/moderate risk use cases do NOT require human validation", () => {
      const noHumanRequired = [
        AllowedUseCase.REFORMULATION,
        AllowedUseCase.SUMMARY,
        AllowedUseCase.CATEGORIZATION,
        AllowedUseCase.FIELD_EXTRACTION,
      ];

      noHumanRequired.forEach((useCase) => {
        expect(requiresHumanValidation(useCase)).toBe(false);
      });
    });
  });

  describe("Policy Enforcement Integration", () => {
    test("BLOCKER: All forbidden use cases throw on enforcement", () => {
      const forbiddenCases = Object.values(ForbiddenUseCase);

      forbiddenCases.forEach((useCase) => {
        expect(() => {
          enforceUseCasePolicy(useCase);
        }).toThrow(ForbiddenUseCaseError);
      });
    });

    test("All allowed use cases pass enforcement", () => {
      const allowedCases = Object.values(AllowedUseCase);

      allowedCases.forEach((useCase) => {
        expect(() => {
          enforceUseCasePolicy(useCase);
        }).not.toThrow();
      });
    });

    test("ForbiddenUseCaseError includes use case in error", () => {
      try {
        enforceUseCasePolicy(ForbiddenUseCase.AUTOMATED_DECISION);
        fail("Should have thrown ForbiddenUseCaseError");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenUseCaseError);
        expect((error as ForbiddenUseCaseError).useCase).toBe(
          "AUTOMATED_DECISION"
        );
        expect((error as Error).message).toContain("AUTOMATED_DECISION");
      }
    });
  });

  describe("LLM_USAGE_POLICY.md Compliance", () => {
    test("BLOCKER: Art. 22 RGPD - Automated decisions are blocked", () => {
      // Art. 22: Right not to be subject to automated decision-making

      const automatedDecisionCases = [
        ForbiddenUseCase.AUTOMATED_DECISION,
        ForbiddenUseCase.LOAN_APPROVAL,
        ForbiddenUseCase.EMPLOYMENT_DECISION,
        ForbiddenUseCase.CREDIT_SCORING,
      ];

      automatedDecisionCases.forEach((useCase) => {
        const result = validateUseCase(useCase);
        expect(result.allowed).toBe(false);
      });
    });

    test("BLOCKER: Art. 9 RGPD - Sensitive data processing blocked", () => {
      // Art. 9: Special categories (health, etc.)

      const sensitiveDataCases = [ForbiddenUseCase.MEDICAL_DIAGNOSIS];

      sensitiveDataCases.forEach((useCase) => {
        const result = validateUseCase(useCase);
        expect(result.allowed).toBe(false);
      });
    });

    test("Policy enforcement is non-bypassable", () => {
      // GIVEN: Multiple attempts to bypass policy
      const attempts = [
        ForbiddenUseCase.AUTOMATED_DECISION,
        "AUTOMATED_DECISION",
        "automated_decision",
        "AutomatedDecision",
      ];

      // WHEN: Attempting enforcement
      // THEN: First attempt (exact match) must fail
      expect(() => {
        enforceUseCasePolicy(attempts[0]);
      }).toThrow(ForbiddenUseCaseError);

      // Other attempts may or may not match (case-sensitive)
      // But unknown use cases are also rejected (fail-safe)
      attempts.slice(1).forEach((attempt) => {
        expect(() => {
          enforceUseCasePolicy(attempt);
        }).toThrow(ForbiddenUseCaseError);
      });
    });
  });
});
