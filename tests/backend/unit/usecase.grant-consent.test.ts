/**
 * Use Case Tests: grantConsent
 * LOT 5.0 - Consent Management
 *
 * RGPD compliance:
 * - Consent must be explicit (not implied)
 * - Tenant-scoped isolation enforced
 * - Audit event emitted (P1 data only)
 */

import { describe, it, expect } from '@jest/globals';
import type { ConsentRepo, CreateConsentInput, PurposeIdentifier } from '@/app/ports/ConsentRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { grantConsent } from '@/app/usecases/consent/grantConsent';

/**
 * In-memory ConsentRepo for testing
 * LOT 12.2: Updated to support purposeId
 */
class MemConsentRepo implements ConsentRepo {
  private consents: Array<{
    tenantId: string;
    userId: string;
    purpose: string;
    purposeId: string | null;
    granted: boolean;
    grantedAt: Date | null;
  }> = [];

  async create(tenantId: string, input: CreateConsentInput): Promise<void> {
    this.consents.push({
      tenantId,
      userId: input.userId,
      purpose: input.purpose,
      purposeId: input.purposeId ?? null,
      granted: input.granted,
      grantedAt: input.grantedAt ?? null,
    });
  }

  async findByUserAndPurpose(
    tenantId: string,
    userId: string,
    purposeIdentifier: string | PurposeIdentifier
  ) {
    // LOT 12.2: Support both legacy string and PurposeIdentifier
    const purposeValue = typeof purposeIdentifier === 'string'
      ? purposeIdentifier
      : purposeIdentifier.value;
    const isPurposeId = typeof purposeIdentifier !== 'string' && purposeIdentifier.type === 'purposeId';

    const consent = this.consents.find(c => {
      if (c.tenantId !== tenantId || c.userId !== userId) return false;
      if (isPurposeId) {
        return c.purposeId === purposeValue;
      }
      return c.purpose === purposeValue;
    });

    return consent
      ? {
          id: 'consent-1',
          tenantId: consent.tenantId,
          userId: consent.userId,
          purpose: consent.purpose,
          purposeId: consent.purposeId,
          granted: consent.granted,
          grantedAt: consent.grantedAt,
          revokedAt: null,
          createdAt: new Date(),
        }
      : null;
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

describe('UseCase: grantConsent', () => {
  it('grants consent successfully', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await grantConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
    });

    const consent = await consentRepo.findByUserAndPurpose('tenant-1', 'user-1', 'analytics');
    expect(consent).toBeDefined();
    expect(consent?.granted).toBe(true);
    expect(consent?.userId).toBe('user-1');
    expect(consent?.purpose).toBe('analytics');
  });

  it('emits audit event on consent grant', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await grantConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
    });

    expect(auditWriter.events).toHaveLength(1);
    expect(auditWriter.events[0].eventName).toBe('consent.granted');
    expect(auditWriter.events[0].actorId).toBe('user-1');
    expect(auditWriter.events[0].tenantId).toBe('tenant-1');
  });

  it('includes purpose in audit metadata', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await grantConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'ai_processing',
    });

    // LOT 12.2: Audit metadata now includes purposeId (undefined when not provided)
    expect(auditWriter.events[0].metadata).toEqual({ purpose: 'ai_processing', purposeId: undefined });
  });

  it('throws error when tenantId is missing', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      grantConsent(consentRepo, auditWriter, {
        tenantId: '',
        userId: 'user-1',
        purpose: 'analytics',
      })
    ).rejects.toThrow('tenantId, userId and purpose are required');
  });

  it('throws error when userId is missing', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      grantConsent(consentRepo, auditWriter, {
        tenantId: 'tenant-1',
        userId: '',
        purpose: 'analytics',
      })
    ).rejects.toThrow('tenantId, userId and purpose are required');
  });

  it('throws error when purpose is missing', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await expect(
      grantConsent(consentRepo, auditWriter, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        purpose: '',
      })
    ).rejects.toThrow('tenantId, userId and purpose are required');
  });

  it('audit event is TENANT-scoped', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await grantConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
    });

    expect(auditWriter.events[0].actorScope).toBe('TENANT');
  });

  it('includes event ID in audit event', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await grantConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
    });

    expect(auditWriter.events[0].id).toBeDefined();
    expect(typeof auditWriter.events[0].id).toBe('string');
  });

  it('enforces tenant isolation', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await grantConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
    });

    // Should not be found in different tenant
    const wrongTenant = await consentRepo.findByUserAndPurpose('tenant-2', 'user-1', 'analytics');
    expect(wrongTenant).toBeNull();
  });

  // ==========================================================================
  // LOT 12.2: purposeId support tests
  // Note: Purpose names avoid RGPD_LOG_GUARD forbidden tokens (document, text, etc.)
  // ==========================================================================

  it('grants consent with purposeId (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();
    const purposeId = 'purpose-uuid-123';

    await grantConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'summarization',
      purposeId,
    });

    const consent = await consentRepo.findByUserAndPurpose('tenant-1', 'user-1', 'summarization');
    expect(consent).toBeDefined();
    expect(consent?.granted).toBe(true);
    expect(consent?.purposeId).toBe(purposeId);
  });

  it('finds consent by purposeId using PurposeIdentifier (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();
    const purposeId = 'purpose-uuid-456';

    await grantConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'sentiment_analysis',
      purposeId,
    });

    // Find by purposeId using PurposeIdentifier
    const consent = await consentRepo.findByUserAndPurpose(
      'tenant-1',
      'user-1',
      { type: 'purposeId', value: purposeId }
    );
    expect(consent).toBeDefined();
    expect(consent?.granted).toBe(true);
    expect(consent?.purposeId).toBe(purposeId);
    expect(consent?.purpose).toBe('sentiment_analysis');
  });

  it('finds consent by label using PurposeIdentifier (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await grantConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'classification',
      purposeId: 'purpose-uuid-789',
    });

    // Find by label using PurposeIdentifier
    const consent = await consentRepo.findByUserAndPurpose(
      'tenant-1',
      'user-1',
      { type: 'label', value: 'classification' }
    );
    expect(consent).toBeDefined();
    expect(consent?.granted).toBe(true);
    expect(consent?.purpose).toBe('classification');
  });

  it('includes purposeId in audit metadata (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();
    const purposeId = 'purpose-uuid-audit-test';

    await grantConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'code_review',
      purposeId,
    });

    expect(auditWriter.events).toHaveLength(1);
    expect(auditWriter.events[0].metadata).toEqual({
      purpose: 'code_review',
      purposeId,
    });
  });

  it('returns null when purposeId does not match (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await grantConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'generation',
      purposeId: 'purpose-uuid-existing',
    });

    // Try to find with wrong purposeId
    const consent = await consentRepo.findByUserAndPurpose(
      'tenant-1',
      'user-1',
      { type: 'purposeId', value: 'purpose-uuid-wrong' }
    );
    expect(consent).toBeNull();
  });
});
