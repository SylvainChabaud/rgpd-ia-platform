/**
 * Gateway Tests: checkConsent
 * LOT 5.0 - Consent Enforcement at Gateway level
 * LOT 12.2 - PurposeIdentifier support
 *
 * RGPD compliance:
 * - Consent must be checked BEFORE any LLM invocation
 * - Consent is REQUIRED (opt-in, not opt-out)
 * - Revocation is IMMEDIATE (no cache)
 */

import { describe, it, expect } from '@jest/globals';
import type { ConsentRepo, Consent, PurposeIdentifier, CreateConsentInput } from '@/app/ports/ConsentRepo';
import { checkConsent, ConsentError } from '@/ai/gateway/enforcement/checkConsent';

/**
 * In-memory ConsentRepo for testing
 * LOT 12.2: Full support for purposeId and PurposeIdentifier
 */
class MemConsentRepo implements ConsentRepo {
  private consents: Consent[] = [];

  addConsent(consent: Consent): void {
    this.consents.push(consent);
  }

  async create(tenantId: string, input: CreateConsentInput): Promise<void> {
    this.consents.push({
      id: `consent-${Date.now()}`,
      tenantId,
      userId: input.userId,
      purpose: input.purpose,
      purposeId: input.purposeId ?? null,
      granted: input.granted,
      grantedAt: input.grantedAt ?? null,
      revokedAt: null,
      createdAt: new Date(),
    });
  }

  async findByUserAndPurpose(
    tenantId: string,
    userId: string,
    purposeIdentifier: string | PurposeIdentifier
  ): Promise<Consent | null> {
    // LOT 12.2: Support both legacy string and PurposeIdentifier
    const isPurposeId = typeof purposeIdentifier !== 'string' && purposeIdentifier.type === 'purposeId';
    const purposeValue = typeof purposeIdentifier === 'string'
      ? purposeIdentifier
      : purposeIdentifier.value;

    return this.consents.find(c => {
      if (c.tenantId !== tenantId || c.userId !== userId) return false;
      if (isPurposeId) {
        return c.purposeId === purposeValue;
      }
      return c.purpose === purposeValue;
    }) ?? null;
  }

  async findByUser() {
    return [];
  }

  async revoke() {}

  async softDeleteByUser() {
    return 0;
  }

  async hardDeleteByUser() {
    return 0;
  }
}

describe('Gateway: checkConsent', () => {
  // ==========================================================================
  // Basic validation tests
  // ==========================================================================

  it('throws ConsentError when tenantId is missing', async () => {
    const consentRepo = new MemConsentRepo();

    await expect(
      checkConsent(consentRepo, '', 'user-1', 'analytics')
    ).rejects.toThrow(ConsentError);

    await expect(
      checkConsent(consentRepo, '', 'user-1', 'analytics')
    ).rejects.toThrow('tenantId, userId and purpose are required');
  });

  it('throws ConsentError when userId is missing', async () => {
    const consentRepo = new MemConsentRepo();

    await expect(
      checkConsent(consentRepo, 'tenant-1', '', 'analytics')
    ).rejects.toThrow(ConsentError);
  });

  it('throws ConsentError when purpose is missing', async () => {
    const consentRepo = new MemConsentRepo();

    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', '')
    ).rejects.toThrow(ConsentError);
  });

  // ==========================================================================
  // Consent existence tests
  // ==========================================================================

  it('throws ConsentError when consent not found', async () => {
    const consentRepo = new MemConsentRepo();

    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', 'analytics')
    ).rejects.toThrow('Consent required: user has not granted consent');
  });

  it('allows processing when valid consent exists', async () => {
    const consentRepo = new MemConsentRepo();
    consentRepo.addConsent({
      id: 'consent-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
      purposeId: null,
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    });

    // Should not throw
    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', 'analytics')
    ).resolves.toBeUndefined();
  });

  // ==========================================================================
  // Consent revocation tests
  // ==========================================================================

  it('throws ConsentError when consent is revoked', async () => {
    const consentRepo = new MemConsentRepo();
    consentRepo.addConsent({
      id: 'consent-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
      purposeId: null,
      granted: true,
      grantedAt: new Date(),
      revokedAt: new Date(), // REVOKED
      createdAt: new Date(),
    });

    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', 'analytics')
    ).rejects.toThrow('Consent revoked: user has withdrawn consent');
  });

  it('throws ConsentError when consent is not granted', async () => {
    const consentRepo = new MemConsentRepo();
    consentRepo.addConsent({
      id: 'consent-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
      purposeId: null,
      granted: false, // NOT GRANTED
      grantedAt: null,
      revokedAt: null,
      createdAt: new Date(),
    });

    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', 'analytics')
    ).rejects.toThrow('Consent denied: user consent for purpose');
  });

  // ==========================================================================
  // Tenant isolation tests
  // ==========================================================================

  it('enforces tenant isolation', async () => {
    const consentRepo = new MemConsentRepo();
    consentRepo.addConsent({
      id: 'consent-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
      purposeId: null,
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    });

    // Same user, different tenant - should fail
    await expect(
      checkConsent(consentRepo, 'tenant-2', 'user-1', 'analytics')
    ).rejects.toThrow('Consent required');
  });

  // ==========================================================================
  // LOT 12.2: PurposeIdentifier support tests
  // Note: Purpose names avoid RGPD_LOG_GUARD forbidden tokens (document, text, etc.)
  // ==========================================================================

  it('finds consent by purposeId using PurposeIdentifier (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const purposeId = 'purpose-uuid-check-123';

    consentRepo.addConsent({
      id: 'consent-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'summarization',
      purposeId,
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    });

    // Check using PurposeIdentifier with purposeId
    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', { type: 'purposeId', value: purposeId })
    ).resolves.toBeUndefined();
  });

  it('finds consent by label using PurposeIdentifier (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();

    consentRepo.addConsent({
      id: 'consent-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'sentiment_analysis',
      purposeId: 'purpose-uuid-456',
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    });

    // Check using PurposeIdentifier with label
    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', { type: 'label', value: 'sentiment_analysis' })
    ).resolves.toBeUndefined();
  });

  it('throws ConsentError when purposeId does not match (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();

    consentRepo.addConsent({
      id: 'consent-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'classification',
      purposeId: 'purpose-uuid-existing',
      granted: true,
      grantedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    });

    // Check with wrong purposeId
    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', { type: 'purposeId', value: 'purpose-uuid-wrong' })
    ).rejects.toThrow('Consent required');
  });

  it('validates purposeId with empty value (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();

    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', { type: 'purposeId', value: '' })
    ).rejects.toThrow('tenantId, userId and purpose are required');
  });

  it('validates label with empty value (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();

    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', { type: 'label', value: '' })
    ).rejects.toThrow('tenantId, userId and purpose are required');
  });

  it('blocks revoked consent checked by purposeId (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const purposeId = 'purpose-uuid-revoked';

    consentRepo.addConsent({
      id: 'consent-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'code_review',
      purposeId,
      granted: true,
      grantedAt: new Date(),
      revokedAt: new Date(), // REVOKED
      createdAt: new Date(),
    });

    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', { type: 'purposeId', value: purposeId })
    ).rejects.toThrow('Consent revoked');
  });

  it('blocks non-granted consent checked by purposeId (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const purposeId = 'purpose-uuid-not-granted';

    consentRepo.addConsent({
      id: 'consent-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'generation',
      purposeId,
      granted: false, // NOT GRANTED
      grantedAt: null,
      revokedAt: null,
      createdAt: new Date(),
    });

    await expect(
      checkConsent(consentRepo, 'tenant-1', 'user-1', { type: 'purposeId', value: purposeId })
    ).rejects.toThrow('Consent denied');
  });
});
