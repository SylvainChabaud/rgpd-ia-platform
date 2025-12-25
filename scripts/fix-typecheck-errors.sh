#!/bin/bash
# Script to fix TypeScript errors from LOT 5.3 implementation
# Run with: bash scripts/fix-typecheck-errors.sh

set -e

echo "Fixing TypeScript errors..."

# Fix logger.info/warn/error calls (Pino uses message as first param, object as second)
# Convert: logger.info('message', { data }) → logger.info({ data }, 'message')

# Fix use-case imports
# These files need newId import
FILES_NEEDING_NEWID=(
  "src/app/usecases/users/updateUser.ts"
  "src/app/usecases/users/deleteUser.ts"
  "src/app/usecases/tenants/updateTenant.ts"
  "src/app/usecases/tenants/deleteTenant.ts"
)

for file in "${FILES_NEEDING_NEWID[@]}"; do
  if [ -f "$file" ]; then
    echo "Adding newId import to $file"
    # Add import at top if not present
    if ! grep -q "import { newId } from '@/shared/ids';" "$file"; then
      sed -i '1i import { newId } from '"'"'@/shared/ids'"'"';' "$file"
    fi
  fi
done

echo "✓ Fixed imports"

# Fix MemTenantRepo (add missing methods)
echo "Updating MemTenantRepo..."

cat > tests/helpers/memoryRepos-patch.ts <<'EOF'
// Patch for MemTenantRepo - add missing methods from LOT 5.3

async findById(tenantId: string): Promise<Tenant | null> {
  const tenant = this._tenants.find(t => t.id === tenantId);
  if (!tenant) return null;

  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    createdAt: new Date(),
    deletedAt: null,
  };
}

async listAll(limit: number = 20, offset: number = 0): Promise<Tenant[]> {
  return this._tenants
    .slice(offset, offset + limit)
    .map(t => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      createdAt: new Date(),
      deletedAt: null,
    }));
}

async update(tenantId: string, updates: { name?: string }): Promise<void> {
  const tenant = this._tenants.find(t => t.id === tenantId);
  if (tenant && updates.name) {
    tenant.name = updates.name;
  }
}

async softDelete(tenantId: string): Promise<void> {
  // For memory implementation, just remove
  this._tenants = this._tenants.filter(t => t.id !== tenantId);
}
EOF

echo "✓ Created MemTenantRepo patch"
echo ""
echo "Manual steps required:"
echo "1. Add the methods from tests/helpers/memoryRepos-patch.ts to tests/helpers/memoryRepos.ts (MemTenantRepo class)"
echo "2. Fix logger calls in API routes (swap parameters: logger.info({ data }, 'message'))"
echo "3. Run: npm run typecheck"
echo ""
echo "Done!"
