/**
 * Get Tenant Use Case
 * LOT 5.3 - API Layer
 *
 * RGPD compliance:
 * - PLATFORM admin only
 */

import type { TenantRepo, Tenant } from '@/app/ports/TenantRepo';

export interface GetTenantInput {
  tenantId: string;
}

export interface GetTenantOutput {
  tenant: Tenant;
}

/**
 * Get tenant details (PLATFORM admin only)
 *
 * SECURITY:
 * - PLATFORM scope required (enforced by middleware)
 */
export async function getTenant(
  input: GetTenantInput,
  deps: {
    tenantRepo: TenantRepo;
  }
): Promise<GetTenantOutput> {
  const { tenantId } = input;
  const { tenantRepo } = deps;

  const tenant = await tenantRepo.findById(tenantId);

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return { tenant };
}
