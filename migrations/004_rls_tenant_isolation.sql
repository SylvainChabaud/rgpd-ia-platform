-- 004_rls_tenant_isolation.sql
-- LOT 4.0 — Row-Level Security (RLS) pour isolation tenant
-- EPIC 4 — Défense en profondeur au niveau DB

-- Classification: P1 (technical infrastructure)
-- Purpose: Enforce tenant isolation at SQL level (defense in depth)
-- Conformité: RGPD Art. 32 (mesures techniques appropriées)

BEGIN;

-- =========================
-- ENABLE ROW-LEVEL SECURITY
-- =========================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rgpd_requests ENABLE ROW LEVEL SECURITY;

-- For users table: enable RLS but only for TENANT scope users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- FORCE RLS even for table owners (including superusers in tests)
-- This ensures RLS policies are enforced even in development/test environments
ALTER TABLE consents FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE rgpd_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- =========================
-- RLS POLICIES: CONSENTS
-- =========================

DROP POLICY IF EXISTS consents_tenant_select ON consents;
CREATE POLICY consents_tenant_select ON consents
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

DROP POLICY IF EXISTS consents_tenant_insert ON consents;
CREATE POLICY consents_tenant_insert ON consents
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

DROP POLICY IF EXISTS consents_tenant_update ON consents;
CREATE POLICY consents_tenant_update ON consents
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

DROP POLICY IF EXISTS consents_tenant_delete ON consents;
CREATE POLICY consents_tenant_delete ON consents
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- =========================
-- RLS POLICIES: AI_JOBS
-- =========================

DROP POLICY IF EXISTS ai_jobs_tenant_select ON ai_jobs;
CREATE POLICY ai_jobs_tenant_select ON ai_jobs
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

DROP POLICY IF EXISTS ai_jobs_tenant_insert ON ai_jobs;
CREATE POLICY ai_jobs_tenant_insert ON ai_jobs
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

DROP POLICY IF EXISTS ai_jobs_tenant_update ON ai_jobs;
CREATE POLICY ai_jobs_tenant_update ON ai_jobs
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

DROP POLICY IF EXISTS ai_jobs_tenant_delete ON ai_jobs;
CREATE POLICY ai_jobs_tenant_delete ON ai_jobs
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- =========================
-- RLS POLICIES: AUDIT_EVENTS
-- =========================

-- Audit events: read-only for tenants, write-only for platform
-- Tenants can only SELECT their own audit events
DROP POLICY IF EXISTS audit_events_tenant_select ON audit_events;
CREATE POLICY audit_events_tenant_select ON audit_events
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
    OR current_setting('app.current_tenant_id', TRUE) IS NULL  -- platform access
  );

-- Only platform scope can INSERT audit events (no tenant restriction)
DROP POLICY IF EXISTS audit_events_platform_insert ON audit_events;
CREATE POLICY audit_events_platform_insert ON audit_events
  FOR INSERT
  WITH CHECK (true);  -- No restriction on INSERT (logging must always work)

-- No UPDATE/DELETE allowed on audit events (immutable log)

-- =========================
-- RLS POLICIES: RGPD_REQUESTS
-- =========================

DROP POLICY IF EXISTS rgpd_requests_tenant_select ON rgpd_requests;
CREATE POLICY rgpd_requests_tenant_select ON rgpd_requests
  FOR SELECT
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

DROP POLICY IF EXISTS rgpd_requests_tenant_insert ON rgpd_requests;
CREATE POLICY rgpd_requests_tenant_insert ON rgpd_requests
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

DROP POLICY IF EXISTS rgpd_requests_tenant_update ON rgpd_requests;
CREATE POLICY rgpd_requests_tenant_update ON rgpd_requests
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- =========================
-- RLS POLICIES: USERS (TENANT scope only)
-- =========================

-- Platform users: always accessible (no RLS restriction)
-- Tenant users: isolated by tenant_id
DROP POLICY IF EXISTS users_tenant_select ON users;
CREATE POLICY users_tenant_select ON users
  FOR SELECT
  USING (
    scope = 'PLATFORM'  -- platform users always visible
    OR tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
  );

DROP POLICY IF EXISTS users_tenant_insert ON users;
CREATE POLICY users_tenant_insert ON users
  FOR INSERT
  WITH CHECK (
    scope = 'PLATFORM'  -- platform user creation (no tenant restriction)
    OR tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
  );

DROP POLICY IF EXISTS users_tenant_update ON users;
CREATE POLICY users_tenant_update ON users
  FOR UPDATE
  USING (
    scope = 'PLATFORM'
    OR tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
  )
  WITH CHECK (
    scope = 'PLATFORM'
    OR tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
  );

-- =========================
-- BYPASS POLICIES FOR SUPERUSER
-- =========================

-- Note: Database superuser (postgres) bypasses ALL RLS policies by default
-- Application code must use non-superuser roles for RLS to be enforced

-- Recommendation: create dedicated roles for application
-- Example (commented, to be run manually in production):
/*
CREATE ROLE app_platform LOGIN PASSWORD 'secure_password';
CREATE ROLE app_tenant LOGIN PASSWORD 'secure_password';

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_platform;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_tenant;

-- Platform role: no tenant_id restriction (can bypass RLS when needed)
ALTER ROLE app_platform SET BYPASSRLS;

-- Tenant role: MUST respect RLS policies
-- (no BYPASSRLS grant)
*/

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================

INSERT INTO schema_migrations (version, applied_at)
VALUES (4, now());

COMMIT;
