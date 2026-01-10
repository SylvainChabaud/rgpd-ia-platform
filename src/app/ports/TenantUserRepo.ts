export interface TenantUserRepo {
  createTenantAdmin(input: { id: string; tenantId: string; emailHash: string; displayName: string; passwordHash: string }): Promise<void>;
  createTenantUser(input: { id: string; tenantId: string; emailHash: string; displayName: string; passwordHash: string }): Promise<void>;
}
