import type { ConsentRepo } from "@/app/ports/ConsentRepo";

/**
 * Consent enforcement for Gateway LLM
 *
 * CRITICAL RGPD COMPLIANCE:
 * - This function MUST be called BEFORE any LLM invocation
 * - Consent is REQUIRED (opt-in, not opt-out)
 * - Revocation is IMMEDIATE (no cache)
 *
 * BOUNDARIES.md: enforcement at Gateway level (not bypassable)
 * LLM_USAGE_POLICY.md: consent required for AI processing
 *
 * LOT 5.0 — Consentement (opt-in / revoke) + enforcement
 */

export class ConsentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsentError";
  }
}

export async function checkConsent(
  consentRepo: ConsentRepo,
  tenantId: string,
  userId: string,
  purpose: string
): Promise<void> {
  // BLOCKER: validate required parameters
  if (!tenantId || !userId || !purpose) {
    throw new ConsentError(
      "Consent check failed: tenantId, userId and purpose are required"
    );
  }

  // Find latest consent for this user and purpose
  const consent = await consentRepo.findByUserAndPurpose(
    tenantId,
    userId,
    purpose
  );

  // BLOCKER: consent not found
  if (!consent) {
    throw new ConsentError(
      `Consent required: user has not granted consent for purpose '${purpose}'`
    );
  }

  // BLOCKER: consent revoked (check first, more specific message)
  if (consent.revokedAt) {
    throw new ConsentError(
      `Consent revoked: user has withdrawn consent for purpose '${purpose}'`
    );
  }

  // BLOCKER: consent not granted
  if (!consent.granted) {
    throw new ConsentError(
      `Consent denied: user consent for purpose '${purpose}' is not granted`
    );
  }

  // Consent is valid: allow processing
}
