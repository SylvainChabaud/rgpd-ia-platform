/**
 * Use Case Tests: updateTenant
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - PLATFORM admin only
 * - Audit event emitted
 */

import { describe, it, expect } from '@jest/globals';
import { updateTenant } from '@/app/usecases/tenants/updateTenant';
import { MemTenantRepo, MemAuditWriter } from '../../helpers/memoryRepos';

describe('UseCase: updateTenant', () => {
  it('updates tenant name successfully', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Old Name' });

    await updateTenant(
      { tenantId: 'tenant-1', name: 'New Name', actorId: 'admin-1' },
      { tenantRepo, auditEventWriter }
    );

    const updated = await tenantRepo.findById('tenant-1');
    expect(updated?.name).toBe('New Name');
  });

  it('emits audit event on update', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Old Name' });

    await updateTenant(
      { tenantId: 'tenant-1', name: 'New Name', actorId: 'admin-1' },
      { tenantRepo, auditEventWriter }
    );

    expect(auditEventWriter.events).toHaveLength(1);
    expect(auditEventWriter.events[0].eventName).toBe('tenant.updated');
    expect(auditEventWriter.events[0].actorId).toBe('admin-1');
    expect(auditEventWriter.events[0].targetId).toBe('tenant-1');
  });

  it('throws error when tenant not found', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();

    await expect(
      updateTenant(
        { tenantId: 'nonexistent', name: 'New Name', actorId: 'admin-1' },
        { tenantRepo, auditEventWriter }
      )
    ).rejects.toThrow('Tenant not found');
  });

  it('does not emit audit event when tenant not found', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();

    await expect(
      updateTenant(
        { tenantId: 'nonexistent', name: 'New Name', actorId: 'admin-1' },
        { tenantRepo, auditEventWriter }
      )
    ).rejects.toThrow();

    expect(auditEventWriter.events).toHaveLength(0);
  });

  it('preserves tenant slug on update', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();
    await tenantRepo.create({ id: 'tenant-1', slug: 'original-slug', name: 'Old Name' });

    await updateTenant(
      { tenantId: 'tenant-1', name: 'New Name', actorId: 'admin-1' },
      { tenantRepo, auditEventWriter }
    );

    const updated = await tenantRepo.findById('tenant-1');
    expect(updated?.slug).toBe('original-slug');
  });

  it('handles undefined name gracefully', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Old Name' });

    await updateTenant(
      { tenantId: 'tenant-1', actorId: 'admin-1' },
      { tenantRepo, auditEventWriter }
    );

    // Should still emit audit event even if no changes
    expect(auditEventWriter.events).toHaveLength(1);
  });

  it('audit event is PLATFORM-scoped', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Old Name' });

    await updateTenant(
      { tenantId: 'tenant-1', name: 'New Name', actorId: 'admin-1' },
      { tenantRepo, auditEventWriter }
    );

    expect(auditEventWriter.events[0].actorScope).toBe('PLATFORM');
    expect(auditEventWriter.events[0].tenantId).toBeUndefined();
  });
});
