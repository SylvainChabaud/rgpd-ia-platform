/**
 * Use Case Tests: listTenants
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - PLATFORM admin only
 * - Pagination support
 */

import { describe, it, expect } from '@jest/globals';
import { listTenants } from '@/app/usecases/tenants/listTenants';
import { MemTenantRepo } from '../../helpers/memoryRepos';

describe('UseCase: listTenants', () => {
  it('returns empty list when no tenants exist', async () => {
    const tenantRepo = new MemTenantRepo();

    const result = await listTenants({}, { tenantRepo });

    expect(result.tenants).toEqual([]);
  });

  it('returns all tenants with default pagination', async () => {
    const tenantRepo = new MemTenantRepo();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });
    await tenantRepo.create({ id: 'tenant-2', slug: 'tenant-2-slug', name: 'Tenant Two' });
    await tenantRepo.create({ id: 'tenant-3', slug: 'tenant-3-slug', name: 'Tenant Three' });

    const result = await listTenants({}, { tenantRepo });

    expect(result.tenants).toHaveLength(3);
    expect(result.tenants[0].id).toBe('tenant-1');
    expect(result.tenants[0].name).toBe('Tenant One');
    expect(result.tenants[1].id).toBe('tenant-2');
    expect(result.tenants[2].id).toBe('tenant-3');
  });

  it('supports custom limit', async () => {
    const tenantRepo = new MemTenantRepo();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });
    await tenantRepo.create({ id: 'tenant-2', slug: 'tenant-2-slug', name: 'Tenant Two' });
    await tenantRepo.create({ id: 'tenant-3', slug: 'tenant-3-slug', name: 'Tenant Three' });

    const result = await listTenants({ limit: 2 }, { tenantRepo });

    expect(result.tenants).toHaveLength(2);
    expect(result.tenants[0].id).toBe('tenant-1');
    expect(result.tenants[1].id).toBe('tenant-2');
  });

  it('supports offset for pagination', async () => {
    const tenantRepo = new MemTenantRepo();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });
    await tenantRepo.create({ id: 'tenant-2', slug: 'tenant-2-slug', name: 'Tenant Two' });
    await tenantRepo.create({ id: 'tenant-3', slug: 'tenant-3-slug', name: 'Tenant Three' });

    const result = await listTenants({ offset: 1 }, { tenantRepo });

    expect(result.tenants).toHaveLength(2);
    expect(result.tenants[0].id).toBe('tenant-2');
    expect(result.tenants[1].id).toBe('tenant-3');
  });

  it('supports limit and offset together', async () => {
    const tenantRepo = new MemTenantRepo();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });
    await tenantRepo.create({ id: 'tenant-2', slug: 'tenant-2-slug', name: 'Tenant Two' });
    await tenantRepo.create({ id: 'tenant-3', slug: 'tenant-3-slug', name: 'Tenant Three' });
    await tenantRepo.create({ id: 'tenant-4', slug: 'tenant-4-slug', name: 'Tenant Four' });

    const result = await listTenants({ limit: 2, offset: 1 }, { tenantRepo });

    expect(result.tenants).toHaveLength(2);
    expect(result.tenants[0].id).toBe('tenant-2');
    expect(result.tenants[1].id).toBe('tenant-3');
  });

  it('returns empty list when offset exceeds tenant count', async () => {
    const tenantRepo = new MemTenantRepo();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });

    const result = await listTenants({ offset: 10 }, { tenantRepo });

    expect(result.tenants).toEqual([]);
  });

  it('includes all tenant fields', async () => {
    const tenantRepo = new MemTenantRepo();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });

    const result = await listTenants({}, { tenantRepo });

    expect(result.tenants[0]).toHaveProperty('id');
    expect(result.tenants[0]).toHaveProperty('slug');
    expect(result.tenants[0]).toHaveProperty('name');
    expect(result.tenants[0]).toHaveProperty('createdAt');
    expect(result.tenants[0]).toHaveProperty('deletedAt');
    expect(result.tenants[0]).toHaveProperty('suspendedAt');
    expect(result.tenants[0]).toHaveProperty('suspensionReason');
    expect(result.tenants[0]).toHaveProperty('suspendedBy');
  });
});
