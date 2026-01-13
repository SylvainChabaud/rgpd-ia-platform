-- 020_purpose_templates.sql
-- LOT 12.2 — Purpose Templates System (RGPD-Compliant)
-- EPIC 12 - Back Office Tenant Admin
--
-- This migration introduces a 3-level purpose architecture:
-- 1. System templates (platform-level, pre-validated RGPD)
-- 2. Tenant configuration (adopt templates, customize)
-- 3. Custom purposes (guided wizard with RGPD validation)

BEGIN;

-- =========================
-- PURPOSE TEMPLATES TABLE (Platform-level)
-- =========================
-- Classification: P0 (technical metadata, no personal data)
-- Retention: platform lifetime
--
-- Pre-validated RGPD purpose templates that tenants can adopt.
-- Templates are immutable by tenants (only activate/deactivate).

CREATE TABLE IF NOT EXISTS purpose_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Template identification
  code VARCHAR(50) NOT NULL UNIQUE,  -- e.g., 'AI_SUMMARIZATION'
  version INTEGER NOT NULL DEFAULT 1,

  -- Content (French by default)
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,

  -- RGPD Classification (Art. 6) - CRITICAL
  lawful_basis VARCHAR(30) NOT NULL,
    -- 'CONSENT' | 'CONTRACT' | 'LEGAL_OBLIGATION' |
    -- 'VITAL_INTEREST' | 'PUBLIC_INTEREST' | 'LEGITIMATE_INTEREST'
  category VARCHAR(50) NOT NULL,
    -- 'AI_PROCESSING' | 'ANALYTICS' | 'MARKETING' | 'ESSENTIAL'
  risk_level VARCHAR(20) NOT NULL,
    -- 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

  -- Default configuration
  default_retention_days INTEGER NOT NULL DEFAULT 90,
  requires_dpia BOOLEAN NOT NULL DEFAULT false,  -- DPIA required if HIGH/CRITICAL
  max_data_class VARCHAR(5) NOT NULL DEFAULT 'P1',  -- P0/P1/P2/P3

  -- Template status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_ai_purpose BOOLEAN NOT NULL DEFAULT true,

  -- CNIL/EDPB reference (for documentation)
  cnil_reference TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_template_lawful_basis CHECK (lawful_basis IN (
    'CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION',
    'VITAL_INTEREST', 'PUBLIC_INTEREST', 'LEGITIMATE_INTEREST'
  )),
  CONSTRAINT chk_template_risk_level CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  CONSTRAINT chk_template_category CHECK (category IN ('AI_PROCESSING', 'ANALYTICS', 'MARKETING', 'ESSENTIAL')),
  CONSTRAINT chk_template_max_data_class CHECK (max_data_class IN ('P0', 'P1', 'P2', 'P3'))
);

-- Index for active templates lookup
CREATE INDEX IF NOT EXISTS idx_purpose_templates_active
  ON purpose_templates(is_active)
  WHERE is_active = true;

-- =========================
-- EXTEND PURPOSES TABLE WITH RGPD FIELDS
-- =========================
-- Add RGPD-required fields to existing purposes table

-- Template reference (NULL for custom purposes)
ALTER TABLE purposes
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES purpose_templates(id) ON DELETE SET NULL;

-- RGPD Classification fields
ALTER TABLE purposes
  ADD COLUMN IF NOT EXISTS lawful_basis VARCHAR(30) NOT NULL DEFAULT 'CONSENT';

ALTER TABLE purposes
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'AI_PROCESSING';

ALTER TABLE purposes
  ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) NOT NULL DEFAULT 'MEDIUM';

ALTER TABLE purposes
  ADD COLUMN IF NOT EXISTS max_data_class VARCHAR(5) NOT NULL DEFAULT 'P1';

ALTER TABLE purposes
  ADD COLUMN IF NOT EXISTS requires_dpia BOOLEAN NOT NULL DEFAULT false;

-- Purpose type flags
ALTER TABLE purposes
  ADD COLUMN IF NOT EXISTS is_from_template BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE purposes
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- Validation status (for custom purposes)
ALTER TABLE purposes
  ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) NOT NULL DEFAULT 'VALIDATED';

-- Add constraints (drop first if exists to avoid conflicts)
DO $$
BEGIN
  -- Drop existing constraints if they exist
  ALTER TABLE purposes DROP CONSTRAINT IF EXISTS chk_purposes_lawful_basis;
  ALTER TABLE purposes DROP CONSTRAINT IF EXISTS chk_purposes_risk_level;
  ALTER TABLE purposes DROP CONSTRAINT IF EXISTS chk_purposes_category;
  ALTER TABLE purposes DROP CONSTRAINT IF EXISTS chk_purposes_max_data_class;
  ALTER TABLE purposes DROP CONSTRAINT IF EXISTS chk_purposes_validation_status;

  -- Add new constraints
  ALTER TABLE purposes ADD CONSTRAINT chk_purposes_lawful_basis
    CHECK (lawful_basis IN (
      'CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION',
      'VITAL_INTEREST', 'PUBLIC_INTEREST', 'LEGITIMATE_INTEREST'
    ));

  ALTER TABLE purposes ADD CONSTRAINT chk_purposes_risk_level
    CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));

  ALTER TABLE purposes ADD CONSTRAINT chk_purposes_category
    CHECK (category IN ('AI_PROCESSING', 'ANALYTICS', 'MARKETING', 'ESSENTIAL'));

  ALTER TABLE purposes ADD CONSTRAINT chk_purposes_max_data_class
    CHECK (max_data_class IN ('P0', 'P1', 'P2', 'P3'));

  ALTER TABLE purposes ADD CONSTRAINT chk_purposes_validation_status
    CHECK (validation_status IN ('PENDING', 'VALIDATED', 'REJECTED', 'NEEDS_DPIA'));
END $$;

-- Index for template-based purposes
CREATE INDEX IF NOT EXISTS idx_purposes_template_id
  ON purposes(template_id)
  WHERE template_id IS NOT NULL;

-- Index for system purposes
CREATE INDEX IF NOT EXISTS idx_purposes_is_system
  ON purposes(tenant_id, is_system)
  WHERE is_system = true;

-- =========================
-- SEED SYSTEM PURPOSE TEMPLATES
-- =========================
-- 8 pre-validated RGPD templates for AI processing

INSERT INTO purpose_templates (
  code, name, description, lawful_basis, category, risk_level,
  default_retention_days, requires_dpia, max_data_class, is_ai_purpose, cnil_reference
) VALUES
-- AI Processing Templates (Consent-based)
(
  'AI_SUMMARIZATION',
  'Synthese de documents par IA',
  'Generation automatique de resumes de documents (contrats, emails, rapports) par intelligence artificielle. Les donnees sont traitees pour produire une version condensee du contenu original.',
  'CONSENT', 'AI_PROCESSING', 'MEDIUM',
  90, false, 'P2', true,
  'Deliberation CNIL 2019-160 - IA et donnees personnelles'
),
(
  'AI_CLASSIFICATION',
  'Classification automatique par IA',
  'Classification automatique de contenus par categories predefinies (type de document, theme, niveau d''urgence, sentiment). Permet d''organiser et prioriser les informations.',
  'CONSENT', 'AI_PROCESSING', 'MEDIUM',
  90, false, 'P2', true,
  NULL
),
(
  'AI_EXTRACTION',
  'Extraction d''entites par IA',
  'Extraction automatique d''informations structurees depuis des documents : noms, dates, montants, adresses, numeros de reference. Peut traiter des donnees personnelles identifiantes.',
  'CONSENT', 'AI_PROCESSING', 'HIGH',
  90, true, 'P2', true,
  'EDPB Guidelines 06/2020 - Automated processing'
),
(
  'AI_GENERATION',
  'Generation de contenu par IA',
  'Generation automatique de textes, reponses ou brouillons bases sur des instructions utilisateur. Inclut la redaction assistee, les suggestions et l''autocompletion.',
  'CONSENT', 'AI_PROCESSING', 'MEDIUM',
  90, false, 'P1', true,
  NULL
),
(
  'AI_TRANSLATION',
  'Traduction automatique par IA',
  'Traduction de documents d''une langue vers une autre par intelligence artificielle. Preserve le sens et le contexte du contenu original.',
  'CONSENT', 'AI_PROCESSING', 'LOW',
  90, false, 'P2', true,
  NULL
),
(
  'AI_OCR',
  'Reconnaissance de caracteres (OCR) par IA',
  'Conversion d''images de documents (scans, photos) en texte exploitable par reconnaissance optique de caracteres. Permet de numeriser et indexer des documents physiques.',
  'CONSENT', 'AI_PROCESSING', 'LOW',
  90, false, 'P2', true,
  NULL
),
-- Analytics Templates (Legitimate Interest)
(
  'ANALYTICS_USAGE',
  'Statistiques d''utilisation',
  'Collecte anonymisee de donnees d''utilisation pour ameliorer le service : pages visitees, fonctionnalites utilisees, temps de session. Aucune identification personnelle.',
  'LEGITIMATE_INTEREST', 'ANALYTICS', 'LOW',
  365, false, 'P1', false,
  'CNIL - Guide cookies et traceurs (exemption mesure audience)'
),
-- Essential Templates (Legitimate Interest)
(
  'ESSENTIAL_SECURITY',
  'Securite et prevention fraude',
  'Mesures techniques de securite pour proteger le compte utilisateur et prevenir les activites frauduleuses : detection d''anomalies, verification d''integrite, journalisation securite.',
  'LEGITIMATE_INTEREST', 'ESSENTIAL', 'LOW',
  730, false, 'P1', false,
  'RGPD Art. 32 - Securite du traitement'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  lawful_basis = EXCLUDED.lawful_basis,
  category = EXCLUDED.category,
  risk_level = EXCLUDED.risk_level,
  default_retention_days = EXCLUDED.default_retention_days,
  requires_dpia = EXCLUDED.requires_dpia,
  max_data_class = EXCLUDED.max_data_class,
  cnil_reference = EXCLUDED.cnil_reference,
  updated_at = now();

-- =========================
-- FUNCTION: CREATE DEFAULT PURPOSES FROM TEMPLATES
-- =========================
-- Called during tenant creation to auto-activate system templates
-- Replaces the old create_default_purposes function

CREATE OR REPLACE FUNCTION create_purposes_from_templates(p_tenant_id UUID)
RETURNS void AS $$
DECLARE
  template RECORD;
BEGIN
  -- Loop through all active templates and create purposes for tenant
  FOR template IN
    SELECT * FROM purpose_templates WHERE is_active = true
  LOOP
    INSERT INTO purposes (
      tenant_id,
      template_id,
      label,
      description,
      lawful_basis,
      category,
      risk_level,
      max_data_class,
      requires_dpia,
      is_required,
      is_active,
      is_from_template,
      is_system,
      validation_status
    ) VALUES (
      p_tenant_id,
      template.id,
      template.name,
      template.description,
      template.lawful_basis,
      template.category,
      template.risk_level,
      template.max_data_class,
      template.requires_dpia,
      false,  -- Not required by default
      true,   -- Active by default
      true,   -- From template
      true,   -- System purpose (cannot be deleted)
      'VALIDATED'
    )
    ON CONFLICT (tenant_id, label) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- MIGRATE EXISTING PURPOSES
-- =========================
-- Update existing purposes with RGPD fields based on label matching

DO $$
DECLARE
  purpose RECORD;
  matched_template RECORD;
BEGIN
  -- For each existing purpose without template_id
  FOR purpose IN
    SELECT * FROM purposes
    WHERE template_id IS NULL
    AND deleted_at IS NULL
  LOOP
    -- Try to match with a template by label similarity
    SELECT * INTO matched_template
    FROM purpose_templates
    WHERE
      purpose.label ILIKE '%' || SPLIT_PART(name, ' ', 1) || '%'
      OR name ILIKE '%' || SPLIT_PART(purpose.label, ' ', 1) || '%'
    LIMIT 1;

    IF matched_template.id IS NOT NULL THEN
      -- Match found: link to template and inherit RGPD fields
      UPDATE purposes SET
        template_id = matched_template.id,
        lawful_basis = matched_template.lawful_basis,
        category = matched_template.category,
        risk_level = matched_template.risk_level,
        max_data_class = matched_template.max_data_class,
        requires_dpia = matched_template.requires_dpia,
        is_from_template = true,
        is_system = true
      WHERE id = purpose.id;
    ELSE
      -- No match: set default RGPD values for custom purposes
      UPDATE purposes SET
        lawful_basis = 'CONSENT',
        category = 'AI_PROCESSING',
        risk_level = 'MEDIUM',
        max_data_class = 'P1',
        requires_dpia = false,
        is_from_template = false,
        is_system = false
      WHERE id = purpose.id;
    END IF;
  END LOOP;
END $$;

-- =========================
-- UPDATE TIMESTAMP TRIGGER FOR TEMPLATES
-- =========================
CREATE OR REPLACE FUNCTION update_purpose_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_purpose_templates_updated_at ON purpose_templates;
CREATE TRIGGER trigger_purpose_templates_updated_at
  BEFORE UPDATE ON purpose_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_purpose_templates_updated_at();

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================
INSERT INTO schema_migrations (version, applied_at)
VALUES (20, now())
ON CONFLICT (version) DO NOTHING;

COMMIT;
