/**
 * Use Case Tests: revokeConsent
 * LOT 5.0 - Consent Management
 *
 * RGPD compliance:
 * - Revocation must be immediate and effective
 * - Tenant-scoped isolation enforced
 * - Audit event emitted (P1 data only)
 */

import { describe, it, expect } from '@jest/globals';
import type { ConsentRepo, PurposeIdentifier } from '@/app/ports/ConsentRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { revokeConsent } from '@/app/usecases/consent/revokeConsent';

/**
 * In-memory ConsentRepo for testing
 * LOT 12.2: Updated to support purposeId in revoke
 */
class MemConsentRepo implements ConsentRepo {
  private revocations: Array<{
    tenantId: string;
    userId: string;
    purpose: string;
    purposeId: string | null;
  }> = [];

  async revoke(
    tenantId: string,
    userId: string,
    purposeIdentifier: string | PurposeIdentifier
  ): Promise<void> {
    // LOT 12.2: Support both legacy string and PurposeIdentifier
    if (typeof purposeIdentifier === 'string') {
      this.revocations.push({ tenantId, userId, purpose: purposeIdentifier, purposeId: null });
    } else if (purposeIdentifier.type === 'purposeId') {
      this.revocations.push({ tenantId, userId, purpose: '', purposeId: purposeIdentifier.value });
    } else {
      this.revocations.push({ tenantId, userId, purpose: purposeIdentifier.value, purposeId: null });
    }
  }

  isRevoked(tenantId: string, userId: string, purpose: string): boolean {
    return this.revocations.some(
      r => r.tenantId === tenantId && r.userId === userId && r.purpose === purpose
    );
  }

  isRevokedByPurposeId(tenantId: string, userId: string, purposeId: string): boolean {
    return this.revocations.some(
      r => r.tenantId === tenantId && r.userId === userId && r.purposeId === purposeId
    );
  }

  async create() {}
  async findByUserAndPurpose() {
    return null;
  }
  async findByUser() {
    return [];
  }
  async softDeleteByUser() {
    return 0;
  }
  async hardDeleteByUser() {
    return 0;
  }
}

describe('UseCase: revokeConsent', () => {
  it('revokes consent successfully', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await revokeConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
    });

    expect(consentRepo.isRevoked('tenant-1', 'user-1', 'analytics')).toBe(true);
  });

  it('emits audit event on consent revocation', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await revokeConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
    });

    expect(auditWriter.events).toHaveLength(1);
    expect(auditWriter.events[0].eventName).toBe('consent.revoked');
    expect(auditWriter.events[0].actorId).toBe('user-1');
    expect(auditWriter.events[0].tenantId).toBe('tenant-1');
  });

  it('includes purpose in audit metadata', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await revokeConsent(consentRepo, auditWriter, {
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
      revokeConsent(consentRepo, auditWriter, {
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
      revokeConsent(consentRepo, auditWriter, {
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
      revokeConsent(consentRepo, auditWriter, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        purpose: '',
      })
    ).rejects.toThrow('tenantId, userId and purpose are required');
  });

  it('audit event is TENANT-scoped', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await revokeConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
    });

    expect(auditWriter.events[0].actorScope).toBe('TENANT');
  });

  it('includes event ID in audit event', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await revokeConsent(consentRepo, auditWriter, {
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

    await revokeConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
    });

    // Different tenant should not show revocation
    expect(consentRepo.isRevoked('tenant-2', 'user-1', 'analytics')).toBe(false);
  });

  it('handles different purposes independently', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await revokeConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'analytics',
    });

    expect(consentRepo.isRevoked('tenant-1', 'user-1', 'analytics')).toBe(true);
    expect(consentRepo.isRevoked('tenant-1', 'user-1', 'marketing')).toBe(false);
  });

  // ==========================================================================
  // LOT 12.2: purposeId support tests
  // Note: Purpose names avoid RGPD_LOG_GUARD forbidden tokens (document, text, etc.)
  // ==========================================================================

  it('revokes consent by purposeId (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();
    const purposeId = 'purpose-uuid-revoke-123';

    await revokeConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'summarization',
      purposeId,
    });

    // Should be revoked by purposeId
    expect(consentRepo.isRevokedByPurposeId('tenant-1', 'user-1', purposeId)).toBe(true);
  });

  it('includes purposeId in audit metadata on revoke (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();
    const purposeId = 'purpose-uuid-audit-revoke';

    await revokeConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'sentiment_analysis',
      purposeId,
    });

    expect(auditWriter.events).toHaveLength(1);
    expect(auditWriter.events[0].eventName).toBe('consent.revoked');
    expect(auditWriter.events[0].metadata).toEqual({
      purpose: 'sentiment_analysis',
      purposeId,
    });
  });

  it('uses purposeId for revocation when provided (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();
    const purposeId = 'purpose-uuid-priority';

    await revokeConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'classification',
      purposeId,
    });

    // When purposeId is provided, revocation uses purposeId (stronger link)
    expect(consentRepo.isRevokedByPurposeId('tenant-1', 'user-1', purposeId)).toBe(true);
    // Legacy purpose-based check should not find it (different lookup mode)
    expect(consentRepo.isRevoked('tenant-1', 'user-1', 'classification')).toBe(false);
  });

  it('falls back to purpose string when purposeId is not provided (LOT 12.2)', async () => {
    const consentRepo = new MemConsentRepo();
    const auditWriter = new InMemoryAuditEventWriter();

    await revokeConsent(consentRepo, auditWriter, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      purpose: 'translation',
      // No purposeId - legacy mode
    });

    // Should be revoked by purpose string (legacy mode)
    expect(consentRepo.isRevoked('tenant-1', 'user-1', 'translation')).toBe(true);
    // No purposeId recorded
    expect(consentRepo.isRevokedByPurposeId('tenant-1', 'user-1', 'any-id')).toBe(false);
  });
});
