-- 007_fix_strict_rls.sql
-- LOT 4.0 — Correction CRITIQUE des politiques RLS pour isolation stricte
-- EPIC 4 — Défense en profondeur au niveau DB
--
-- Classification: P1 (technical infrastructure)
-- Purpose: Fix CRITICAL security bugs in RLS policies
--
-- Problems fixed:
-- 1. users_tenant_select: allow all tenants to see platform users (OK by design)
-- 2. users_tenant_update: BLOCK tenants from updating platform users
-- 3. users_tenant_insert: BLOCK tenants from creating platform users
-- 4. All policies: ensure strict tenant isolation for TENANT scope rows

BEGIN;

-- =========================
-- DROP EXISTING BUGGY POLICIES (USERS TABLE)
-- =========================

DROP POLICY IF EXISTS users_tenant_select ON users;
DROP POLICY IF EXISTS users_tenant_insert ON users;
DROP POLICY IF EXISTS users_tenant_update ON users;

-- =========================
-- RECREATE USERS POLICIES WITH STRICT ISOLATION
-- =========================

-- SELECT: Tenant users see only own users + platform users
-- Platform users are globally visible (required for auth, platform ops)
CREATE POLICY users_tenant_select ON users
  FOR SELECT
  USING (
    -- Tenant users: only own tenant
    (scope = 'TENANT' AND tenant_id = current_tenant_id())
    -- Platform users: visible to all (by design - needed for auth)
    OR scope = 'PLATFORM'
  );

-- INSERT: Tenants can ONLY create TENANT users (not platform users)
-- Platform users can ONLY be created WITHOUT tenant context
CREATE POLICY users_tenant_insert ON users
  FOR INSERT
  WITH CHECK (
    -- Tenant scope: must match current tenant
    (scope = 'TENANT' AND tenant_id = current_tenant_id())
    -- Platform scope: ONLY allowed without tenant context (admin ops)
    OR (scope = 'PLATFORM' AND current_setting('app.current_tenant_id', TRUE) IS NULL)
  );

-- UPDATE: Tenants can ONLY update own TENANT users
-- Platform users can ONLY be updated WITHOUT tenant context
CREATE POLICY users_tenant_update ON users
  FOR UPDATE
  USING (
    -- Tenant users: only own tenant can read for update
    (scope = 'TENANT' AND tenant_id = current_tenant_id())
    -- Platform users: ONLY accessible without tenant context
    OR (scope = 'PLATFORM' AND current_setting('app.current_tenant_id', TRUE) IS NULL)
  )
  WITH CHECK (
    -- Tenant users: only own tenant can update
    (scope = 'TENANT' AND tenant_id = current_tenant_id())
    -- Platform users: ONLY updatable without tenant context
    OR (scope = 'PLATFORM' AND current_setting('app.current_tenant_id', TRUE) IS NULL)
  );

-- DELETE: Tenants can ONLY delete own TENANT users
-- Platform users can ONLY be deleted WITHOUT tenant context
DROP POLICY IF EXISTS users_tenant_delete ON users;
CREATE POLICY users_tenant_delete ON users
  FOR DELETE
  USING (
    -- Tenant users: only own tenant can delete
    (scope = 'TENANT' AND tenant_id = current_tenant_id())
    -- Platform users: ONLY deletable without tenant context
    OR (scope = 'PLATFORM' AND current_setting('app.current_tenant_id', TRUE) IS NULL)
  );

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================

INSERT INTO schema_migrations (version, applied_at)
VALUES (7, now());

COMMIT;
