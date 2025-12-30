-- 012_fix_audit_events_policy.sql
-- LOT 4.0 — Correction politique audit_events pour gérer empty string
-- EPIC 4 — Défense en profondeur au niveau DB
--
-- Classification: P1 (technical infrastructure)
-- Purpose: Fix audit_events SELECT policy to handle empty string in current_setting()
--
-- Problem: current_setting('app.current_tenant_id', TRUE) returns '' instead of NULL
-- Solution: Check for both NULL and empty string

BEGIN;

-- =========================
-- DROP + RECREATE AUDIT_EVENTS SELECT POLICY
-- =========================

DROP POLICY IF EXISTS audit_events_tenant_select ON audit_events;

CREATE POLICY audit_events_tenant_select ON audit_events
  FOR SELECT
  USING (
    -- Tenant context: only own tenant events
    tenant_id = current_tenant_id()
    -- Platform context: all events visible (handle NULL and empty string)
    OR current_setting('app.current_tenant_id', TRUE) IS NULL
    OR current_setting('app.current_tenant_id', TRUE) = ''
  );

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================

INSERT INTO schema_migrations (version, applied_at)
VALUES (12, now());

COMMIT;
