-- 011_fix_users_platform_policies.sql
-- LOT 4.0 — Correction politiques users pour gérer '' (empty string) dans current_setting
-- EPIC 4 — Défense en profondeur au niveau DB
--
-- Classification: P1 (technical infrastructure)
-- Purpose: Fix users RLS policies to handle empty string in current_setting()
--
-- Problem: current_setting('app.current_tenant_id', TRUE) can return '' instead of NULL
-- Solution: Check for both NULL and empty string

BEGIN;

-- =========================
-- DROP + RECREATE USERS POLICIES WITH EMPTY STRING HANDLING
-- =========================

DROP POLICY IF EXISTS users_tenant_insert ON users;
DROP POLICY IF EXISTS users_tenant_update ON users;

-- INSERT: Tenants can ONLY create TENANT users (not platform users)
-- Platform users can ONLY be created WITHOUT tenant context
CREATE POLICY users_tenant_insert ON users
  FOR INSERT
  WITH CHECK (
    -- Tenant scope: must match current tenant
    (scope = 'TENANT' AND tenant_id = current_tenant_id())
    -- Platform scope: ONLY allowed without tenant context (admin ops)
    -- Handle both NULL and empty string
    OR (scope = 'PLATFORM' AND (
      current_setting('app.current_tenant_id', TRUE) IS NULL
      OR current_setting('app.current_tenant_id', TRUE) = ''
    ))
  );

-- UPDATE: Tenants can ONLY update own TENANT users
-- Platform users can ONLY be updated WITHOUT tenant context
CREATE POLICY users_tenant_update ON users
  FOR UPDATE
  USING (
    -- Tenant users: only own tenant can read for update
    (scope = 'TENANT' AND tenant_id = current_tenant_id())
    -- Platform users: ONLY accessible without tenant context
    OR (scope = 'PLATFORM' AND (
      current_setting('app.current_tenant_id', TRUE) IS NULL
      OR current_setting('app.current_tenant_id', TRUE) = ''
    ))
  )
  WITH CHECK (
    -- Tenant users: only own tenant can update
    (scope = 'TENANT' AND tenant_id = current_tenant_id())
    -- Platform users: ONLY updatable without tenant context
    OR (scope = 'PLATFORM' AND (
      current_setting('app.current_tenant_id', TRUE) IS NULL
      OR current_setting('app.current_tenant_id', TRUE) = ''
    ))
  );

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================

INSERT INTO schema_migrations (version, applied_at)
VALUES (11, now());

COMMIT;
