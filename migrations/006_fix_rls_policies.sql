-- 006_fix_rls_policies.sql
-- LOT 4.0 — Correction des politiques RLS pour stricte validation tenant
-- EPIC 4 — Défense en profondeur au niveau DB

-- Classification: P1 (technical infrastructure)
-- Purpose: Fix RLS policies to REJECT operations without valid tenant context
-- Problem: current_setting() returns NULL when not set, which doesn't match tenant_id
-- Solution: Use COALESCE to convert NULL to '00000000-0000-0000-0000-000000000000'

BEGIN;

-- =========================
-- DROP EXISTING POLICIES
-- =========================

-- Drop all existing policies to recreate them with strict validation
DROP POLICY IF EXISTS consents_tenant_select ON consents;
DROP POLICY IF EXISTS consents_tenant_insert ON consents;
DROP POLICY IF EXISTS consents_tenant_update ON consents;
DROP POLICY IF EXISTS consents_tenant_delete ON consents;

DROP POLICY IF EXISTS ai_jobs_tenant_select ON ai_jobs;
DROP POLICY IF EXISTS ai_jobs_tenant_insert ON ai_jobs;
DROP POLICY IF EXISTS ai_jobs_tenant_update ON ai_jobs;
DROP POLICY IF EXISTS ai_jobs_tenant_delete ON ai_jobs;

DROP POLICY IF EXISTS audit_events_tenant_select ON audit_events;
DROP POLICY IF EXISTS audit_events_platform_insert ON audit_events;

DROP POLICY IF EXISTS rgpd_requests_tenant_select ON rgpd_requests;
DROP POLICY IF EXISTS rgpd_requests_tenant_insert ON rgpd_requests;
DROP POLICY IF EXISTS rgpd_requests_tenant_update ON rgpd_requests;

DROP POLICY IF EXISTS users_tenant_select ON users;
DROP POLICY IF EXISTS users_tenant_insert ON users;
DROP POLICY IF EXISTS users_tenant_update ON users;

-- =========================
-- HELPER FUNCTION: Get Current Tenant ID
-- =========================

-- Create a function that returns current tenant_id or a sentinel value if not set
-- Sentinel: '00000000-0000-0000-0000-000000000000' (will never match real tenant_id)
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    current_setting('app.current_tenant_id', TRUE)::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =========================
-- RLS POLICIES: CONSENTS (STRICT)
-- =========================

CREATE POLICY consents_tenant_select ON consents
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY consents_tenant_insert ON consents
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY consents_tenant_update ON consents
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY consents_tenant_delete ON consents
  FOR DELETE
  USING (tenant_id = current_tenant_id());

-- =========================
-- RLS POLICIES: AI_JOBS (STRICT)
-- =========================

CREATE POLICY ai_jobs_tenant_select ON ai_jobs
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY ai_jobs_tenant_insert ON ai_jobs
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY ai_jobs_tenant_update ON ai_jobs
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY ai_jobs_tenant_delete ON ai_jobs
  FOR DELETE
  USING (tenant_id = current_tenant_id());

-- =========================
-- RLS POLICIES: AUDIT_EVENTS (STRICT)
-- =========================

-- Audit events: read-only for tenants, write-only for all (logging must work)
CREATE POLICY audit_events_tenant_select ON audit_events
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    OR current_setting('app.current_tenant_id', TRUE) IS NULL  -- platform access
  );

-- INSERT allowed for all (logging must always work, even without tenant context)
CREATE POLICY audit_events_platform_insert ON audit_events
  FOR INSERT
  WITH CHECK (true);

-- =========================
-- RLS POLICIES: RGPD_REQUESTS (STRICT)
-- =========================

CREATE POLICY rgpd_requests_tenant_select ON rgpd_requests
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY rgpd_requests_tenant_insert ON rgpd_requests
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY rgpd_requests_tenant_update ON rgpd_requests
  FOR UPDATE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- =========================
-- RLS POLICIES: USERS (STRICT)
-- =========================

-- Platform users: always accessible (no RLS restriction)
-- Tenant users: isolated by tenant_id
CREATE POLICY users_tenant_select ON users
  FOR SELECT
  USING (
    scope = 'PLATFORM'  -- platform users always visible
    OR tenant_id = current_tenant_id()
  );

CREATE POLICY users_tenant_insert ON users
  FOR INSERT
  WITH CHECK (
    (scope = 'PLATFORM' AND current_setting('app.current_tenant_id', TRUE) IS NULL)  -- platform user creation (no tenant restriction)
    OR (scope = 'TENANT' AND tenant_id = current_tenant_id())
  );

CREATE POLICY users_tenant_update ON users
  FOR UPDATE
  USING (
    scope = 'PLATFORM'
    OR tenant_id = current_tenant_id()
  )
  WITH CHECK (
    scope = 'PLATFORM'
    OR tenant_id = current_tenant_id()
  );

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================

INSERT INTO schema_migrations (version, applied_at)
VALUES (6, now());

COMMIT;
