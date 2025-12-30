-- 003_rgpd_deletion.sql
-- Migration LOT 5.2 : Right to erasure (Art. 17)
-- Adds soft delete capability (deleted_at) to enable RGPD deletion workflow

BEGIN;

-- =========================
-- SOFT DELETE: Add deleted_at to sensitive tables
-- =========================

-- Tenants table: track tenant deletion requests (soft delete)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Users table: track user deletion requests
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Consents table: track consent deletion (cascade)
ALTER TABLE consents
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- AI Jobs table: track job deletion (cascade)
ALTER TABLE ai_jobs
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- =========================
-- INDEXES: Optimize queries filtering deleted records
-- =========================

-- Index for active tenants (WHERE deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_tenants_active
  ON tenants(id)
  WHERE deleted_at IS NULL;

-- Index for active users (WHERE deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_users_active
  ON users(tenant_id, id)
  WHERE deleted_at IS NULL;

-- Index for active consents (WHERE deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_consents_active
  ON consents(tenant_id, user_id)
  WHERE deleted_at IS NULL;

-- Index for active ai_jobs (WHERE deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_ai_jobs_active
  ON ai_jobs(tenant_id, user_id)
  WHERE deleted_at IS NULL;

-- Index for purge job: find records ready for hard delete
CREATE INDEX IF NOT EXISTS idx_users_pending_purge
  ON users(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- =========================
-- RGPD REQUESTS: Update table for deletion tracking
-- =========================

-- Add purge scheduling
ALTER TABLE rgpd_requests
  ADD COLUMN IF NOT EXISTS scheduled_purge_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

-- Index for pending purge requests
CREATE INDEX IF NOT EXISTS idx_rgpd_requests_pending
  ON rgpd_requests(scheduled_purge_at)
  WHERE status = 'PENDING' AND scheduled_purge_at IS NOT NULL;

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================
INSERT INTO schema_migrations (version, applied_at)
VALUES (3, now())
ON CONFLICT (version) DO NOTHING;

COMMIT;

COMMIT;
