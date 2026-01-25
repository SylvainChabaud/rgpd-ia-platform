-- Migration 030: Add MEMBER scope support
-- LOT 13.0 - Frontend User Authentication
--
-- RGPD Compliance:
-- - MEMBER scope for end-users (Art. 4 - Data subject)
-- - Tenant isolation preserved (tenant_id required for MEMBER)
--
-- This migration updates constraints to allow MEMBER scope.

-- 1. Update users_scope_check to allow MEMBER
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_scope_check;
ALTER TABLE users ADD CONSTRAINT users_scope_check CHECK (
  scope = ANY (ARRAY['PLATFORM'::text, 'TENANT'::text, 'MEMBER'::text])
);

-- 2. Update chk_users_tenant_scope for MEMBER (tenant_id required)
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_tenant_scope;
ALTER TABLE users ADD CONSTRAINT chk_users_tenant_scope CHECK (
  (scope = 'PLATFORM' AND tenant_id IS NULL) OR
  (scope = 'TENANT' AND tenant_id IS NOT NULL) OR
  (scope = 'MEMBER' AND tenant_id IS NOT NULL)
);
