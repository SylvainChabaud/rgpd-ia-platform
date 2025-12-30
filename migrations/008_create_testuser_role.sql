-- 008_create_testuser_role.sql
-- LOT 4.0 — Création d'un rôle testuser pour tests RLS
-- EPIC 4 — Défense en profondeur au niveau DB
--
-- Classification: P1 (technical infrastructure)
-- Purpose: Create a non-superuser role for RLS testing
--
-- Problem: devuser is a SUPERUSER with BYPASSRLS = true
-- Solution: Create testuser with NO BYPASSRLS for proper RLS testing

BEGIN;

-- =========================
-- CREATE TESTUSER ROLE (non-superuser)
-- =========================

-- Drop existing testuser if it exists
DROP ROLE IF EXISTS testuser;

-- Create testuser with limited privileges
CREATE ROLE testuser WITH
  LOGIN
  PASSWORD 'testpass'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;  -- CRITICAL: RLS policies MUST apply to this user

-- =========================
-- GRANT MINIMAL PRIVILEGES TO TESTUSER
-- =========================

-- Grant connect to database
GRANT CONNECT ON DATABASE rgpd_platform TO testuser;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO testuser;

-- Grant SELECT, INSERT, UPDATE, DELETE on all tables
-- (RLS will restrict access based on tenant_id)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO testuser;

-- Grant usage on sequences (needed for id generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO testuser;

-- Grant EXECUTE on functions (needed for current_tenant_id())
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO testuser;

-- Ensure future tables/sequences are accessible to testuser
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO testuser;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO testuser;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO testuser;

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================

INSERT INTO schema_migrations (version, applied_at)
VALUES (8, now());

COMMIT;
