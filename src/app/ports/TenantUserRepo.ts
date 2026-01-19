export interface TenantUserRepo {
  createTenantAdmin(input: { id: string; tenantId: string; emailHash: string; displayName: string; passwordHash: string }): Promise<void>;
  createTenantUser(input: { id: string; tenantId: string; emailHash: string; displayName: string; passwordHash: string }): Promise<void>;
  /**
   * Create DPO user (Data Protection Officer)
   * LOT 12.4 - Art. 37-39 RGPD
   */
  createTenantDpo(input: { id: string; tenantId: string; emailHash: string; displayName: string; passwordHash: string }): Promise<void>;
}
