-- 009_fix_current_tenant_id_function.sql
-- LOT 4.0 — Correction function current_tenant_id() pour gérer absence de setting
-- EPIC 4 — Défense en profondeur au niveau DB
--
-- Classification: P1 (technical infrastructure)
-- Purpose: Fix current_tenant_id() to handle missing app.current_tenant_id gracefully
--
-- Problem: current_setting('app.current_tenant_id', TRUE) returns '' (empty string) instead of NULL
-- Solution: Handle both NULL and empty string cases

BEGIN;

-- =========================
-- RECREATE current_tenant_id() FUNCTION (using OR REPLACE)
-- =========================

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
DECLARE
  tenant_id_text TEXT;
BEGIN
  -- Get current setting with missing_ok=TRUE (returns NULL if not set)
  tenant_id_text := current_setting('app.current_tenant_id', TRUE);

  -- Handle NULL or empty string
  IF tenant_id_text IS NULL OR tenant_id_text = '' THEN
    RETURN '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- Return parsed UUID
  RETURN tenant_id_text::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================

INSERT INTO schema_migrations (version, applied_at)
VALUES (9, now());

COMMIT;
