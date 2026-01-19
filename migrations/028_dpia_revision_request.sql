-- ============================================================================
-- Migration 028: DPIA Revision Request - LOT 12.4
-- ============================================================================
-- Adds fields for Tenant Admin to request revision of rejected DPIAs
-- Workflow: REJECTED -> Tenant requests revision -> PENDING -> DPO re-validates
-- ============================================================================

-- Add revision request fields to dpias table
ALTER TABLE dpias
ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS revision_requested_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS revision_comments TEXT;

-- Add index for revision requests
CREATE INDEX IF NOT EXISTS idx_dpias_revision_requested_at ON dpias(revision_requested_at);

-- Add comments
COMMENT ON COLUMN dpias.revision_requested_at IS 'When Tenant Admin requested revision of rejected DPIA';
COMMENT ON COLUMN dpias.revision_requested_by IS 'Tenant Admin who requested revision';
COMMENT ON COLUMN dpias.revision_comments IS 'Comments from Tenant Admin explaining corrections made';
