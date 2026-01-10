/**
 * Use Case Tests: getTenant
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - PLATFORM admin only
 */

import { describe, it, expect } from '@jest/globals';
import { getTenant } from '@/app/usecases/tenants/getTenant';
import { MemTenantRepo } from '../../helpers/memoryRepos';

describe('UseCase: getTenant', () => {
  it('returns tenant by ID', async () => {
    const tenantRepo = new MemTenantRepo();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });

    const result = await getTenant({ tenantId: 'tenant-1' }, { tenantRepo });

    expect(result.tenant).toBeDefined();
    expect(result.tenant.id).toBe('tenant-1');
    expect(result.tenant.name).toBe('Tenant One');
    expect(result.tenant.slug).toBe('tenant-1-slug');
  });

  it('throws error when tenant not found', async () => {
    const tenantRepo = new MemTenantRepo();

    await expect(
      getTenant({ tenantId: 'nonexistent' }, { tenantRepo })
    ).rejects.toThrow('Tenant not found');
  });

  it('returns complete tenant object', async () => {
    const tenantRepo = new MemTenantRepo();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });

    const result = await getTenant({ tenantId: 'tenant-1' }, { tenantRepo });

    expect(result.tenant).toHaveProperty('id');
    expect(result.tenant).toHaveProperty('slug');
    expect(result.tenant).toHaveProperty('name');
    expect(result.tenant).toHaveProperty('createdAt');
    expect(result.tenant).toHaveProperty('deletedAt');
    expect(result.tenant).toHaveProperty('suspendedAt');
    expect(result.tenant).toHaveProperty('suspensionReason');
    expect(result.tenant).toHaveProperty('suspendedBy');
  });

  it('correctly identifies different tenants', async () => {
    const tenantRepo = new MemTenantRepo();
    await tenantRepo.create({ id: 'tenant-1', slug: 'tenant-1-slug', name: 'Tenant One' });
    await tenantRepo.create({ id: 'tenant-2', slug: 'tenant-2-slug', name: 'Tenant Two' });

    const result1 = await getTenant({ tenantId: 'tenant-1' }, { tenantRepo });
    const result2 = await getTenant({ tenantId: 'tenant-2' }, { tenantRepo });

    expect(result1.tenant.id).toBe('tenant-1');
    expect(result1.tenant.name).toBe('Tenant One');
    expect(result2.tenant.id).toBe('tenant-2');
    expect(result2.tenant.name).toBe('Tenant Two');
  });
});
