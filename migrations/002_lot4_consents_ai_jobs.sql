-- 002_lot4_consents_ai_jobs.sql
-- LOT 4.0 — Stockage IA & données utilisateur RGPD
-- EPIC 4 / EPIC 5 (préparation)

BEGIN;

-- =========================
-- MIGRATION TRACKING SYSTEM
-- =========================
-- Enable idempotent migrations and version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bootstrap migration 001 retroactively
INSERT INTO schema_migrations (version, applied_at)
VALUES (1, now())
ON CONFLICT (version) DO NOTHING;

-- =========================
-- CONSENTS (P2 - RGPD mandatory)
-- =========================
-- Purpose: track user consent for data processing (EPIC 5 preparation)
-- Classification: P2 (personal data, RGPD mandatory)
-- Retention: account lifetime
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,  -- logical reference (no FK for flexibility)
  purpose TEXT NOT NULL,  -- e.g., 'analytics', 'ai_processing', 'marketing'
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- CRITICAL RGPD: ensure tenant isolation
  CONSTRAINT chk_consents_tenant_not_null CHECK (tenant_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_consents_tenant_user
  ON consents(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_consents_purpose
  ON consents(tenant_id, purpose);

-- =========================
-- AI_JOBS (P1 - metadata only)
-- =========================
-- Purpose: track AI processing jobs (status, timing, references)
-- Classification: P1 (technical metadata only)
-- Retention: 30-90 days max
--
-- CRITICAL SECURITY / RGPD:
-- This table stores METADATA ONLY (status, timestamps, model references)
-- NO CONTENT allowed: prompts, outputs, embeddings are P3 data
-- and must be stored separately with encryption (LOT 6+)
CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,  -- optional (system jobs possible)
  purpose TEXT NOT NULL,  -- e.g., 'document_analysis', 'content_generation'
  model_ref TEXT,  -- e.g., 'llama2:7b', 'gpt-4' (reference only, no credentials)
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),

  -- Timing metadata (P1)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- BLOCKER CONSTRAINTS
  CONSTRAINT chk_ai_jobs_tenant_not_null CHECK (tenant_id IS NOT NULL),
  CONSTRAINT chk_ai_jobs_purpose_not_empty CHECK (purpose != '')
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_tenant
  ON ai_jobs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status
  ON ai_jobs(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_created
  ON ai_jobs(tenant_id, created_at DESC);

-- =========================
-- STRENGTHEN TENANT ISOLATION
-- =========================
-- Add DB-level constraint to enforce tenant scope on users table
-- This addresses TODO at src/infrastructure/repositories/PgTenantUserRepo.ts:14
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_tenant_scope'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_tenant_scope
      CHECK (
        (scope = 'PLATFORM' AND tenant_id IS NULL) OR
        (scope = 'TENANT' AND tenant_id IS NOT NULL)
      );
  END IF;
END $$;

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================
INSERT INTO schema_migrations (version, applied_at)
VALUES (2, now());

COMMIT;
