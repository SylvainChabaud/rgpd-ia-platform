-- 025_user_suspensions.sql
-- LOT 12.3 - Art. 18 RGPD : Droit à la limitation du traitement
-- Table pour les suspensions de traitement au niveau utilisateur

BEGIN;

-- =========================
-- Table user_suspensions
-- =========================

-- Suspension de traitement des données d'un utilisateur (Art. 18 RGPD)
-- Permet de limiter temporairement le traitement des données personnelles
CREATE TABLE IF NOT EXISTS user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Raison de la suspension (obligatoire)
  reason TEXT NOT NULL,

  -- Statut: ACTIVE (en cours) ou LIFTED (levée)
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LIFTED')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id), -- Admin qui a créé la suspension
  lifted_at TIMESTAMPTZ, -- NULL si toujours active
  lifted_by UUID REFERENCES users(id), -- Admin qui a levé la suspension

  -- Contrainte: lifted_at requis si status = LIFTED
  CONSTRAINT check_lifted_status CHECK (
    (status = 'ACTIVE' AND lifted_at IS NULL AND lifted_by IS NULL)
    OR
    (status = 'LIFTED' AND lifted_at IS NOT NULL)
  )
);

-- =========================
-- Index pour performance
-- =========================

-- Index pour isolation tenant (RLS)
CREATE INDEX IF NOT EXISTS idx_user_suspensions_tenant_id ON user_suspensions(tenant_id);

-- Index pour recherche par utilisateur
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id);

-- Index pour filtrage par statut
CREATE INDEX IF NOT EXISTS idx_user_suspensions_status ON user_suspensions(status);

-- Index pour purge RGPD (lifted + date)
CREATE INDEX IF NOT EXISTS idx_user_suspensions_lifted_at ON user_suspensions(lifted_at) WHERE status = 'LIFTED';


ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;

-- Drop policy if it already exists (idempotent migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_suspensions'
      AND policyname = 'user_suspensions_tenant_isolation'
  ) THEN
    EXECUTE 'DROP POLICY user_suspensions_tenant_isolation ON user_suspensions';
  END IF;
END$$;

CREATE POLICY user_suspensions_tenant_isolation ON user_suspensions
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =========================
-- Commentaires (documentation)
-- =========================

COMMENT ON TABLE user_suspensions IS 'Suspensions de traitement des données utilisateur (Art. 18 RGPD - Droit à la limitation)';
COMMENT ON COLUMN user_suspensions.reason IS 'Raison de la suspension (ex: contestation en cours, vérification nécessaire)';
COMMENT ON COLUMN user_suspensions.status IS 'ACTIVE = suspension en cours, LIFTED = suspension levée';
COMMENT ON COLUMN user_suspensions.lifted_at IS 'Date de levée de la suspension (NULL si toujours active)';

COMMIT;
