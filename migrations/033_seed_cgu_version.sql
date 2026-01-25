-- Migration 033: Seed initial CGU version (LOT 13.0)
--
-- RGPD Compliance:
-- - Art. 7: Conditions for consent - CGU must exist before users can accept
--
-- This migration creates the initial active CGU version that references
-- the markdown file at docs/legal/cgu-cgv.md
--
-- Date: 2026-01-25
-- Statut: LOT 13.0 - CGU Acceptance Workflow

BEGIN;

-- =============================================================================
-- SEED: Initial CGU Version
-- Creates the first active CGU version referencing the markdown file
-- =============================================================================

INSERT INTO cgu_versions (
    id,
    version,
    content_path,
    summary,
    effective_date,
    created_at,
    is_active
) VALUES (
    gen_random_uuid(),
    '1.0.0',
    'docs/legal/cgu-cgv.md',
    'Version initiale des Conditions Générales d''Utilisation. Inclut les droits RGPD, politique de confidentialité, et conditions de service.',
    '2026-01-05',  -- Effective date from the CGU document
    NOW(),
    TRUE  -- This is the active version
) ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- MARK MIGRATION AS APPLIED
-- =============================================================================

INSERT INTO schema_migrations (version, applied_at)
VALUES (33, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
