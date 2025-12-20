export interface TenantRepo {
  findBySlug(slug: string): Promise<{ id: string; slug: string; name: string } | null>;
  create(input: { id: string; slug: string; name: string }): Promise<void>;
}
