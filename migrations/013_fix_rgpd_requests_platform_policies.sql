-- 013_fix_rgpd_requests_platform_policies.sql
-- LOT 5.2 — Correction politiques rgpd_requests pour opérations platform
-- EPIC 5 — RGPD Rights (Art. 17 - Droit à l'effacement)
--
-- Classification: P0 BLOCKER
-- Purpose: Allow platform-scoped operations on rgpd_requests for purge jobs
--
-- Problem: findPendingPurges() needs to read ALL pending purges across tenants
--          updateStatus() needs to update request status without tenant context
-- Solution: Add platform-scope policies (when current_tenant_id is NULL or '')

BEGIN;

-- =========================
-- DROP EXISTING POLICIES
-- =========================

DROP POLICY IF EXISTS rgpd_requests_tenant_select ON rgpd_requests;
DROP POLICY IF EXISTS rgpd_requests_tenant_insert ON rgpd_requests;
DROP POLICY IF EXISTS rgpd_requests_tenant_update ON rgpd_requests;
DROP POLICY IF EXISTS rgpd_requests_platform_select ON rgpd_requests;
DROP POLICY IF EXISTS rgpd_requests_platform_update ON rgpd_requests;

-- =========================
-- RGPD_REQUESTS: TENANT + PLATFORM POLICIES
-- =========================

-- SELECT: Tenant sees own requests, Platform sees all
CREATE POLICY rgpd_requests_select ON rgpd_requests
  FOR SELECT
  USING (
    -- Tenant context: only own requests
    tenant_id = current_tenant_id()
    -- Platform context: all requests visible (for purge jobs)
    OR current_setting('app.current_tenant_id', TRUE) IS NULL
    OR current_setting('app.current_tenant_id', TRUE) = ''
  );

-- INSERT: Only with tenant context (users create their own requests)
CREATE POLICY rgpd_requests_insert ON rgpd_requests
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- UPDATE: Tenant updates own requests, Platform can update any (for status changes)
CREATE POLICY rgpd_requests_update ON rgpd_requests
  FOR UPDATE
  USING (
    -- Tenant context: only own requests
    tenant_id = current_tenant_id()
    -- Platform context: all requests updatable (for purge job status)
    OR current_setting('app.current_tenant_id', TRUE) IS NULL
    OR current_setting('app.current_tenant_id', TRUE) = ''
  )
  WITH CHECK (
    -- Tenant context: only own requests
    tenant_id = current_tenant_id()
    -- Platform context: all requests updatable
    OR current_setting('app.current_tenant_id', TRUE) IS NULL
    OR current_setting('app.current_tenant_id', TRUE) = ''
  );

-- DELETE: Only with tenant context (cascade delete via cleanup_test_data)
CREATE POLICY rgpd_requests_delete ON rgpd_requests
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    -- Platform context for cleanup
    OR current_setting('app.current_tenant_id', TRUE) IS NULL
    OR current_setting('app.current_tenant_id', TRUE) = ''
  );

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================

INSERT INTO schema_migrations (version, applied_at)
VALUES (13, now());

COMMIT;
