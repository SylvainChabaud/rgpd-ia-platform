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
import type { ConsentRepo, CreateConsentInput } from '@/app/ports/ConsentRepo';
import { InMemoryAuditEventWriter } from '@/app/audit/InMemoryAuditEventWriter';
import { grantConsent } from '@/app/usecases/consent/grantConsent';

class MemConsentRepo implements ConsentRepo {
  private consents: Array<{
    tenantId: string;
    userId: string;
    purpose: string;
    granted: boolean;
    grantedAt: Date | null;
  }> = [];

  async create(tenantId: string, input: CreateConsentInput): Promise<void> {
    this.consents.push({
      tenantId,
      userId: input.userId,
      purpose: input.purpose,
      granted: input.granted,
      grantedAt: input.grantedAt ?? null,
    });
  }

  async findByUserAndPurpose(tenantId: string, userId: string, purpose: string) {
    const consent = this.consents.find(
      c => c.tenantId === tenantId && c.userId === userId && c.purpose === purpose
    );
    return consent
      ? {
          id: 'consent-1',
          tenantId: consent.tenantId,
          userId: consent.userId,
          purpose: consent.purpose,
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

    expect(auditWriter.events[0].metadata).toEqual({ purpose: 'ai_processing' });
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
});
