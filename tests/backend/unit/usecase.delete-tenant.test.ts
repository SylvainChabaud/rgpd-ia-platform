/**
 * Use Case Tests: deleteTenant
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - PLATFORM admin only
 * - Soft delete (cascade to users)
 * - Audit event emitted
 */

import { describe, it, expect } from '@jest/globals';
import { deleteTenant } from '@/app/usecases/tenants/deleteTenant';
import { MemTenantRepo, MemAuditWriter } from '../../helpers/memoryRepos';

describe('UseCase: deleteTenant', () => {
  it('soft deletes tenant successfully', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });

    await deleteTenant(
      { tenantId: 'tenant-1', actorId: 'admin-1' },
      { tenantRepo, auditEventWriter }
    );

    const deleted = await tenantRepo.findById('tenant-1');
    expect(deleted).toBeNull();
  });

  it('emits audit event on delete', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });

    await deleteTenant(
      { tenantId: 'tenant-1', actorId: 'admin-1' },
      { tenantRepo, auditEventWriter }
    );

    expect(auditEventWriter.events).toHaveLength(1);
    expect(auditEventWriter.events[0].eventName).toBe('tenant.deleted');
    expect(auditEventWriter.events[0].actorId).toBe('admin-1');
    expect(auditEventWriter.events[0].targetId).toBe('tenant-1');
  });

  it('throws error when tenant not found', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();

    await expect(
      deleteTenant(
        { tenantId: 'nonexistent', actorId: 'admin-1' },
        { tenantRepo, auditEventWriter }
      )
    ).rejects.toThrow('Tenant not found');
  });

  it('does not emit audit event when tenant not found', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();

    await expect(
      deleteTenant(
        { tenantId: 'nonexistent', actorId: 'admin-1' },
        { tenantRepo, auditEventWriter }
      )
    ).rejects.toThrow();

    expect(auditEventWriter.events).toHaveLength(0);
  });

  it('audit event is PLATFORM-scoped', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });

    await deleteTenant(
      { tenantId: 'tenant-1', actorId: 'admin-1' },
      { tenantRepo, auditEventWriter }
    );

    expect(auditEventWriter.events[0].actorScope).toBe('PLATFORM');
    expect(auditEventWriter.events[0].tenantId).toBeUndefined();
  });

  it('includes event ID in audit event', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });

    await deleteTenant(
      { tenantId: 'tenant-1', actorId: 'admin-1' },
      { tenantRepo, auditEventWriter }
    );

    expect(auditEventWriter.events[0].id).toBeDefined();
    expect(typeof auditEventWriter.events[0].id).toBe('string');
    expect(auditEventWriter.events[0].id.length).toBeGreaterThan(0);
  });

  it('deletes only the specified tenant', async () => {
    const tenantRepo = new MemTenantRepo();
    const auditEventWriter = new MemAuditWriter();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });
    await tenantRepo.create({ id: 'tenant-2', slug: 'tenant-2-slug', name: 'Tenant Two' });

    await deleteTenant(
      { tenantId: 'tenant-1', actorId: 'admin-1' },
      { tenantRepo, auditEventWriter }
    );

    const deleted = await tenantRepo.findById('tenant-1');
    const preserved = await tenantRepo.findById('tenant-2');
    expect(deleted).toBeNull();
    expect(preserved).not.toBeNull();
    expect(preserved?.id).toBe('tenant-2');
  });
});
