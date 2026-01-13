-- 019_purposes.sql
-- LOT 12.2 — Gestion Consentements (Purposes + Tracking)
-- EPIC 12 - Back Office Tenant Admin

BEGIN;

-- =========================
-- PURPOSES TABLE (P1 - technical metadata)
-- =========================
-- Purpose: Define configurable AI processing purposes per tenant
-- Classification: P1 (technical metadata, no personal data)
-- Retention: tenant lifetime
--
-- Purposes allow Tenant Admins to configure what types of AI processing
-- their organization uses, and track user consents for each purpose.

CREATE TABLE IF NOT EXISTS purposes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Purpose definition
  label VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,

  -- Configuration
  is_required BOOLEAN NOT NULL DEFAULT false,  -- If true, consent is mandatory
  is_active BOOLEAN NOT NULL DEFAULT true,     -- If false, purpose is hidden from users

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Soft delete for RGPD compliance (purge after retention period)
  deleted_at TIMESTAMPTZ,

  -- CRITICAL RGPD: ensure tenant isolation
  CONSTRAINT chk_purposes_tenant_not_null CHECK (tenant_id IS NOT NULL),

  -- Unique label per tenant (allows same label across different tenants)
  CONSTRAINT uq_purposes_tenant_label UNIQUE (tenant_id, label)
);

-- Indexes for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_purposes_tenant_id
  ON purposes(tenant_id);

CREATE INDEX IF NOT EXISTS idx_purposes_tenant_active
  ON purposes(tenant_id, is_active)
  WHERE deleted_at IS NULL;

-- =========================
-- ADD PURPOSE_ID TO CONSENTS (optional reference)
-- =========================
-- The consents table uses 'purpose' (TEXT) for flexibility.
-- We add purpose_id as optional reference for purposes that are configured.
-- This allows:
-- - Legacy consents with text purpose (pre-configured purposes)
-- - New consents with purpose_id reference (configured purposes)

ALTER TABLE consents
  ADD COLUMN IF NOT EXISTS purpose_id UUID REFERENCES purposes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_consents_purpose_id
  ON consents(purpose_id)
  WHERE purpose_id IS NOT NULL;

-- =========================
-- RLS POLICIES FOR PURPOSES
-- =========================
ALTER TABLE purposes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS purposes_tenant_isolation ON purposes;
DROP POLICY IF EXISTS purposes_tenant_insert ON purposes;
DROP POLICY IF EXISTS purposes_tenant_update ON purposes;
DROP POLICY IF EXISTS purposes_tenant_delete ON purposes;

-- Platform admin bypass (full access)
DROP POLICY IF EXISTS purposes_platform_bypass ON purposes;
CREATE POLICY purposes_platform_bypass ON purposes
  FOR ALL
  TO PUBLIC
  USING (current_setting('app.current_scope', true) = 'PLATFORM')
  WITH CHECK (current_setting('app.current_scope', true) = 'PLATFORM');

-- Tenant isolation: SELECT
CREATE POLICY purposes_tenant_isolation ON purposes
  FOR SELECT
  TO PUBLIC
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
    OR current_setting('app.current_scope', true) = 'PLATFORM'
  );

-- Tenant isolation: INSERT
CREATE POLICY purposes_tenant_insert ON purposes
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant_id', true)
  );

-- Tenant isolation: UPDATE
CREATE POLICY purposes_tenant_update ON purposes
  FOR UPDATE
  TO PUBLIC
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant_id', true)
  );

-- Tenant isolation: DELETE
CREATE POLICY purposes_tenant_delete ON purposes
  FOR DELETE
  TO PUBLIC
  USING (
    tenant_id::text = current_setting('app.current_tenant_id', true)
  );

-- =========================
-- DEFAULT PURPOSES FUNCTION
-- =========================
-- Function to seed default purposes for a new tenant
-- Called during tenant creation (optional)

CREATE OR REPLACE FUNCTION create_default_purposes(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO purposes (tenant_id, label, description, is_required, is_active)
  VALUES
    (p_tenant_id, 'Résumé de documents', 'Génération automatique de résumés de documents (contrats, emails, rapports)', true, true),
    (p_tenant_id, 'Classification', 'Classification automatique de contenus par catégories', false, true),
    (p_tenant_id, 'Extraction d''entités', 'Extraction d''informations clés (noms, dates, montants)', false, true)
  ON CONFLICT (tenant_id, label) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- UPDATE TIMESTAMP TRIGGER
-- =========================
CREATE OR REPLACE FUNCTION update_purposes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_purposes_updated_at ON purposes;
CREATE TRIGGER trigger_purposes_updated_at
  BEFORE UPDATE ON purposes
  FOR EACH ROW
  EXECUTE FUNCTION update_purposes_updated_at();

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================
INSERT INTO schema_migrations (version, applied_at)
VALUES (19, now())
ON CONFLICT (version) DO NOTHING;

COMMIT;
