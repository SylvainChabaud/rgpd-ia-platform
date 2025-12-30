-- 010_create_cleanup_function.sql
-- LOT 4.0 — Création fonction cleanup_test_data() pour tests RLS
-- EPIC 4 — Défense en profondeur au niveau DB
--
-- Classification: P1 (technical infrastructure)
-- Purpose: Create cleanup function with SECURITY DEFINER for test cleanup
--
-- Problem: testuser cannot cleanup test data due to RLS policies
-- Solution: Create function that runs with SECURITY DEFINER (devuser privileges)

BEGIN;

-- =========================
-- CREATE CLEANUP FUNCTION (SECURITY DEFINER)
-- =========================

CREATE OR REPLACE FUNCTION cleanup_test_data(
  tenant_ids UUID[]
)
RETURNS void AS $$
BEGIN
  -- Delete data in correct order (respecting foreign keys)
  DELETE FROM ai_jobs WHERE tenant_id = ANY(tenant_ids);
  DELETE FROM consents WHERE tenant_id = ANY(tenant_ids);
  DELETE FROM rgpd_requests WHERE tenant_id = ANY(tenant_ids);
  DELETE FROM audit_events WHERE tenant_id = ANY(tenant_ids);
  DELETE FROM users WHERE tenant_id = ANY(tenant_ids);
  DELETE FROM tenants WHERE id = ANY(tenant_ids);
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER  -- Run with privileges of function creator (devuser = superuser)
SET search_path = public;

-- Grant EXECUTE to testuser
GRANT EXECUTE ON FUNCTION cleanup_test_data(UUID[]) TO testuser;

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================

INSERT INTO schema_migrations (version, applied_at)
VALUES (10, now());

COMMIT;
