/**
 * List Tenants Use Case
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - PLATFORM admin only
 * - Pagination support
 */

import type { TenantRepo, Tenant } from '@/app/ports/TenantRepo';

export interface ListTenantsInput {
  limit?: number;
  offset?: number;
}

export interface ListTenantsOutput {
  tenants: Tenant[];
}

/**
 * List all tenants (PLATFORM admin only)
 *
 * SECURITY:
 * - PLATFORM scope required (enforced by middleware)
 * - Returns all tenants (not tenant-scoped)
 */
export async function listTenants(
  input: ListTenantsInput,
  deps: {
    tenantRepo: TenantRepo;
  }
): Promise<ListTenantsOutput> {
  const { limit = 20, offset = 0 } = input;
  const { tenantRepo } = deps;

  const tenants = await tenantRepo.listAll(limit, offset);

  return { tenants };
}
