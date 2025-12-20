-- 001_init.sql
-- Migration initiale : socle plateforme RGPD
-- EPIC 1 / EPIC 4 / EPIC 7

BEGIN;

-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- TENANTS
-- =========================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- USERS (PLATFORM + TENANT)
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('PLATFORM', 'TENANT')),
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_platform_superadmin
  ON users(scope)
  WHERE scope = 'PLATFORM';

-- =========================
-- AUDIT EVENTS (RGPD-safe)
-- =========================
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  actor_id UUID,
  tenant_id UUID,
  target_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- RGPD REQUESTS (future EPIC 5)
-- =========================
CREATE TABLE IF NOT EXISTS rgpd_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID,
  type TEXT NOT NULL CHECK (type IN ('EXPORT', 'DELETE')),
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- BOOTSTRAP LOCK
-- =========================
CREATE TABLE IF NOT EXISTS bootstrap_state (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  initialized_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
