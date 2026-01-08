export interface Tenant {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  deletedAt: Date | null;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  suspendedBy: string | null;
}

export interface TenantRepo {
  findBySlug(slug: string): Promise<{ id: string; slug: string; name: string } | null>;
  create(input: { id: string; slug: string; name: string }): Promise<void>;

  // LOT 5.3 - API Layer extensions
  findById(tenantId: string): Promise<Tenant | null>;
  getById(tenantId: string): Promise<Tenant | null>; // Alias for use cases
  listAll(limit?: number, offset?: number): Promise<Tenant[]>;
  update(tenantId: string, updates: { name?: string }): Promise<void>;
  softDelete(tenantId: string): Promise<void>;

  // LOT 11.0 - US 11.4 Suspension tenant
  suspend(tenantId: string, data: { reason: string; suspendedBy: string }): Promise<void>;
  unsuspend(tenantId: string): Promise<void>;
}
