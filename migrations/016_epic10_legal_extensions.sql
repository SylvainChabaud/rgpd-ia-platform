-- Migration 016: EPIC 10 Legal Compliance Extensions
--
-- Purpose: Extend EPIC 10 tables with additional columns for complete functionality
-- - deleted_at for soft delete (Art. 17 RGPD)
-- - acceptance_method for CGU traceability (Art. 7)
-- - metadata for flexible JSON storage (Art. 22)
-- - summary for CGU version descriptions
-- - Additional dispute statuses (under_review, rejected)
--
-- Date: 2026-01-05
-- EPIC: 10 - RGPD Legal & Compliance
-- LOT: 10.0-10.7

BEGIN;

-- =============================================================================
-- TABLE: cgu_versions
-- Add summary field for version description
-- =============================================================================

ALTER TABLE cgu_versions
    ADD COLUMN IF NOT EXISTS summary TEXT;

COMMENT ON COLUMN cgu_versions.summary IS 'Brief summary of changes in this CGU version';

-- =============================================================================
-- TABLE: user_cgu_acceptances
-- Add deleted_at for soft delete and acceptance_method for traceability
-- =============================================================================

ALTER TABLE user_cgu_acceptances
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS acceptance_method VARCHAR(20) NOT NULL DEFAULT 'checkbox'
        CHECK (acceptance_method IN ('checkbox', 'button', 'api'));

COMMENT ON COLUMN user_cgu_acceptances.deleted_at IS 'Soft delete timestamp (Art. 17 RGPD)';
COMMENT ON COLUMN user_cgu_acceptances.acceptance_method IS 'How user accepted CGU: checkbox, button, or api';

-- Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_user_cgu_acceptances_deleted
    ON user_cgu_acceptances(tenant_id, user_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- TABLE: user_disputes
-- Add deleted_at, metadata, and additional statuses
-- =============================================================================

ALTER TABLE user_disputes
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN user_disputes.deleted_at IS 'Soft delete timestamp (Art. 17 RGPD)';
COMMENT ON COLUMN user_disputes.metadata IS 'Flexible JSON metadata for dispute context';

-- Update status constraint to include 'under_review' and 'rejected'
ALTER TABLE user_disputes DROP CONSTRAINT IF EXISTS user_disputes_status_check;
ALTER TABLE user_disputes
    ADD CONSTRAINT user_disputes_status_check CHECK (status IN (
        'pending',
        'under_review',
        'resolved',
        'rejected'
    ));

-- Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_user_disputes_deleted
    ON user_disputes(tenant_id, user_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- TABLE: user_oppositions
-- Add deleted_at and metadata
-- =============================================================================

ALTER TABLE user_oppositions
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN user_oppositions.deleted_at IS 'Soft delete timestamp (Art. 17 RGPD)';
COMMENT ON COLUMN user_oppositions.metadata IS 'Flexible JSON metadata for opposition context';

-- Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_user_oppositions_deleted
    ON user_oppositions(tenant_id, user_id) WHERE deleted_at IS NULL;

-- =============================================================================
-- TABLE: cookie_consents
-- Add deleted_at for soft delete
-- =============================================================================

ALTER TABLE cookie_consents
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN cookie_consents.deleted_at IS 'Soft delete timestamp (Art. 17 RGPD)';

-- Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_cookie_consents_deleted
    ON cookie_consents(user_id) WHERE deleted_at IS NULL AND user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cookie_consents_deleted_anonymous
    ON cookie_consents(anonymous_id) WHERE deleted_at IS NULL AND anonymous_id IS NOT NULL;

-- =============================================================================
-- MARK MIGRATION AS APPLIED
-- =============================================================================

INSERT INTO schema_migrations (version, applied_at)
VALUES (16, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
