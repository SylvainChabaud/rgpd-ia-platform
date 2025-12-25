export interface Tenant {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface TenantRepo {
  findBySlug(slug: string): Promise<{ id: string; slug: string; name: string } | null>;
  create(input: { id: string; slug: string; name: string }): Promise<void>;

  // LOT 5.3 - API Layer extensions
  findById(tenantId: string): Promise<Tenant | null>;
  listAll(limit?: number, offset?: number): Promise<Tenant[]>;
  update(tenantId: string, updates: { name?: string }): Promise<void>;
  softDelete(tenantId: string): Promise<void>;
}
