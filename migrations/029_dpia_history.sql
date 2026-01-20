-- ============================================================================
-- Migration 029: DPIA History - LOT 12.4
-- ============================================================================
-- Creates a history table to track all DPIA workflow events:
-- - DPO approvals with comments
-- - DPO rejections with reasons
-- - Tenant Admin revision requests with comments
--
-- RGPD Compliance:
-- - Art. 5.2: Accountability - all decisions are traceable
-- - Art. 35: DPIA documentation requirements
-- - Tenant isolation via RLS
-- ============================================================================

-- ============================================================================
-- 1. Create DPIA history action enum
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dpia_history_action') THEN
    CREATE TYPE dpia_history_action AS ENUM (
      'CREATED',           -- DPIA created (initial state)
      'APPROVED',          -- DPO approved
      'REJECTED',          -- DPO rejected
      'REVISION_REQUESTED' -- Tenant Admin requested revision
    );
  END IF;
END
$$;

-- ============================================================================
-- 2. Create dpia_history table
-- ============================================================================
CREATE TABLE IF NOT EXISTS dpia_history (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to DPIA
  dpia_id UUID NOT NULL REFERENCES dpias(id) ON DELETE CASCADE,

  -- Tenant isolation (CRITICAL for RGPD)
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Action details
  action dpia_history_action NOT NULL,

  -- Actor who performed the action
  actor_id UUID NOT NULL REFERENCES users(id),
  actor_role VARCHAR(50) NOT NULL, -- DPO, TENANT_ADMIN, SUPERADMIN

  -- Content (P1 data only - no PII)
  comments TEXT,           -- DPO comments or Tenant Admin revision comments
  rejection_reason TEXT,   -- Only for REJECTED action

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_dpia_history_dpia_id ON dpia_history(dpia_id);
CREATE INDEX IF NOT EXISTS idx_dpia_history_tenant_id ON dpia_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dpia_history_created_at ON dpia_history(dpia_id, created_at DESC);

-- ============================================================================
-- 4. Enable RLS (CRITICAL for tenant isolation)
-- ============================================================================
ALTER TABLE dpia_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Create RLS policies
-- ============================================================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS dpia_history_tenant_isolation ON dpia_history;
DROP POLICY IF EXISTS dpia_history_platform_read ON dpia_history;

-- Tenant isolation policy: users can only see their tenant's history
CREATE POLICY dpia_history_tenant_isolation ON dpia_history
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Platform read policy: SUPERADMIN can read all history (for compliance audits)
CREATE POLICY dpia_history_platform_read ON dpia_history
  FOR SELECT
  USING (current_setting('app.current_scope', true) = 'PLATFORM');

-- ============================================================================
-- 6. Add comments for documentation
-- ============================================================================
COMMENT ON TABLE dpia_history IS 'DPIA workflow history - tracks all DPO/Tenant Admin interactions. LOT 12.4.';
COMMENT ON COLUMN dpia_history.tenant_id IS 'CRITICAL: Tenant isolation for RGPD compliance';
COMMENT ON COLUMN dpia_history.action IS 'Type of action: CREATED, APPROVED, REJECTED, REVISION_REQUESTED';
COMMENT ON COLUMN dpia_history.actor_role IS 'Role of the actor: DPO, TENANT_ADMIN, SUPERADMIN';
COMMENT ON COLUMN dpia_history.comments IS 'P1 data only - DPO comments or Tenant Admin revision explanation';
COMMENT ON COLUMN dpia_history.rejection_reason IS 'P1 data only - DPO rejection reason (mandatory for REJECTED)';
