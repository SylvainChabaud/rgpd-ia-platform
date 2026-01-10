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
import type { ConsentRepo } from '@/app/ports/ConsentRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { revokeConsent } from '@/app/usecases/consent/revokeConsent';

class MemConsentRepo implements ConsentRepo {
  private revocations: Array<{
    tenantId: string;
    userId: string;
    purpose: string;
  }> = [];

  async revoke(tenantId: string, userId: string, purpose: string): Promise<void> {
    this.revocations.push({ tenantId, userId, purpose });
  }

  isRevoked(tenantId: string, userId: string, purpose: string): boolean {
    return this.revocations.some(
      r => r.tenantId === tenantId && r.userId === userId && r.purpose === purpose
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

    expect(auditWriter.events[0].metadata).toEqual({ purpose: 'ai_processing' });
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
});
