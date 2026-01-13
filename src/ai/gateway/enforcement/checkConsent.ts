import type { ConsentRepo, PurposeIdentifier } from "@/app/ports/ConsentRepo";

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
 * LOT 12.2 — Enhanced with purposeId support for strong purpose-consent link
 */

export class ConsentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsentError";
  }
}

/**
 * Check if user has valid consent for the given purpose
 *
 * LOT 12.2: Enhanced to support both legacy string and UUID-based purpose identification
 *
 * @param consentRepo - Repository for consent data
 * @param tenantId - Tenant ID for isolation
 * @param userId - User ID
 * @param purposeIdentifier - Purpose identifier (string for legacy, or PurposeIdentifier for new)
 */
export async function checkConsent(
  consentRepo: ConsentRepo,
  tenantId: string,
  userId: string,
  purposeIdentifier: string | PurposeIdentifier
): Promise<void> {
  // BLOCKER: validate required parameters
  const purposeValue = typeof purposeIdentifier === 'string'
    ? purposeIdentifier
    : purposeIdentifier.value;

  if (!tenantId || !userId || !purposeValue) {
    throw new ConsentError(
      "Consent check failed: tenantId, userId and purpose are required"
    );
  }

  // Find latest consent for this user and purpose
  // LOT 12.2: ConsentRepo now supports both legacy string and PurposeIdentifier
  const consent = await consentRepo.findByUserAndPurpose(
    tenantId,
    userId,
    purposeIdentifier
  );

  // BLOCKER: consent not found
  if (!consent) {
    throw new ConsentError(
      `Consent required: user has not granted consent for purpose '${purposeValue}'`
    );
  }

  // BLOCKER: consent revoked (check first, more specific message)
  if (consent.revokedAt) {
    throw new ConsentError(
      `Consent revoked: user has withdrawn consent for purpose '${purposeValue}'`
    );
  }

  // BLOCKER: consent not granted
  if (!consent.granted) {
    throw new ConsentError(
      `Consent denied: user consent for purpose '${purposeValue}' is not granted`
    );
  }

  // Consent is valid: allow processing
}
