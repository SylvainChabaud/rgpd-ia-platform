-- 005_force_rls.sql
-- LOT 4.0 — Force RLS même pour superusers (test environments)
-- EPIC 4 — Défense en profondeur au niveau DB

-- Classification: P1 (technical infrastructure)
-- Purpose: Ensure RLS is enforced even for table owners/superusers
-- Required for: Test environments where we use superuser connections

BEGIN;

-- =========================
-- FORCE ROW-LEVEL SECURITY
-- =========================

-- FORCE RLS even for table owners (including superusers in tests)
-- This ensures RLS policies are enforced even in development/test environments
-- without this, superusers bypass RLS policies

ALTER TABLE consents FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE rgpd_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Note: In production, you should use dedicated non-superuser roles
-- and remove FORCE to optimize performance (superusers should bypass RLS)

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================

INSERT INTO schema_migrations (version, applied_at)
VALUES (5, now());

COMMIT;
