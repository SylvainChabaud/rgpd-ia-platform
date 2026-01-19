-- ============================================================================
-- Migration 026: DPIA (Data Protection Impact Assessment) - LOT 12.4
-- ============================================================================
-- RGPD Compliance: Art. 35 (DPIA obligation for high-risk processing)
--
-- This migration creates:
-- 1. dpias table for DPIA records with workflow support
-- 2. dpia_risks table for risk assessments
-- 3. RLS policies for tenant isolation (CRITICAL for RGPD)
-- ============================================================================

-- ============================================================================
-- 1. Create DPIA status enum
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dpia_status') THEN
    CREATE TYPE dpia_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

-- ============================================================================
-- 2. Create risk level enum (if not exists)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dpia_risk_level') THEN
    CREATE TYPE dpia_risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;
END
$$;

-- ============================================================================
-- 3. Create likelihood/impact enum
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dpia_likelihood') THEN
    CREATE TYPE dpia_likelihood AS ENUM ('LOW', 'MEDIUM', 'HIGH');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dpia_impact') THEN
    CREATE TYPE dpia_impact AS ENUM ('LOW', 'MEDIUM', 'HIGH');
  END IF;
END
$$;

-- ============================================================================
-- 4. Create dpias table
-- ============================================================================
CREATE TABLE IF NOT EXISTS dpias (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation (CRITICAL for RGPD)
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Link to purpose (DPIA is triggered by HIGH/CRITICAL risk purposes)
  purpose_id UUID NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,

  -- DPIA metadata (P1 - technical data)
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Risk assessment summary
  overall_risk_level dpia_risk_level NOT NULL DEFAULT 'MEDIUM',

  -- Data processed info
  data_processed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  data_classification VARCHAR(2) NOT NULL DEFAULT 'P1', -- P0, P1, P2, P3

  -- Security measures (pre-filled by platform)
  security_measures TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Workflow status
  status dpia_status NOT NULL DEFAULT 'PENDING',

  -- DPO validation fields
  dpo_comments TEXT,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES users(id),
  rejection_reason TEXT,

  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_data_classification CHECK (data_classification IN ('P0', 'P1', 'P2', 'P3')),
  CONSTRAINT valid_rejection_reason CHECK (
    (status = 'REJECTED' AND rejection_reason IS NOT NULL) OR
    (status != 'REJECTED')
  )
);

-- ============================================================================
-- 5. Create dpia_risks table (risk details)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dpia_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dpia_id UUID NOT NULL REFERENCES dpias(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Risk description
  risk_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Risk assessment
  likelihood dpia_likelihood NOT NULL DEFAULT 'MEDIUM',
  impact dpia_impact NOT NULL DEFAULT 'MEDIUM',

  -- Mitigation
  mitigation TEXT NOT NULL,

  -- Order for display
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_dpias_tenant_id ON dpias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dpias_purpose_id ON dpias(purpose_id);
CREATE INDEX IF NOT EXISTS idx_dpias_status ON dpias(status);
CREATE INDEX IF NOT EXISTS idx_dpias_tenant_status ON dpias(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dpias_validated_by ON dpias(validated_by);
CREATE INDEX IF NOT EXISTS idx_dpia_risks_dpia_id ON dpia_risks(dpia_id);
CREATE INDEX IF NOT EXISTS idx_dpia_risks_tenant_id ON dpia_risks(tenant_id);

-- ============================================================================
-- 7. Enable RLS (CRITICAL for tenant isolation)
-- ============================================================================
ALTER TABLE dpias ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpia_risks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. Create RLS policies for dpias
-- ============================================================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS dpias_tenant_isolation ON dpias;
DROP POLICY IF EXISTS dpias_platform_read ON dpias;

-- Tenant isolation policy: users can only see their tenant's DPIAs
CREATE POLICY dpias_tenant_isolation ON dpias
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Platform read policy: SUPERADMIN can read all DPIAs (for compliance audits)
CREATE POLICY dpias_platform_read ON dpias
  FOR SELECT
  USING (current_setting('app.current_scope', true) = 'PLATFORM');

-- ============================================================================
-- 9. Create RLS policies for dpia_risks
-- ============================================================================
DROP POLICY IF EXISTS dpia_risks_tenant_isolation ON dpia_risks;
DROP POLICY IF EXISTS dpia_risks_platform_read ON dpia_risks;

CREATE POLICY dpia_risks_tenant_isolation ON dpia_risks
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY dpia_risks_platform_read ON dpia_risks
  FOR SELECT
  USING (current_setting('app.current_scope', true) = 'PLATFORM');

-- ============================================================================
-- 10. Create trigger for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_dpias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dpias_updated_at ON dpias;
CREATE TRIGGER dpias_updated_at
  BEFORE UPDATE ON dpias
  FOR EACH ROW
  EXECUTE FUNCTION update_dpias_updated_at();

DROP TRIGGER IF EXISTS dpia_risks_updated_at ON dpia_risks;
CREATE TRIGGER dpia_risks_updated_at
  BEFORE UPDATE ON dpia_risks
  FOR EACH ROW
  EXECUTE FUNCTION update_dpias_updated_at();

-- ============================================================================
-- 11. Add comment for documentation
-- ============================================================================
COMMENT ON TABLE dpias IS 'DPIA (Data Protection Impact Assessment) records - Art. 35 RGPD. LOT 12.4.';
COMMENT ON TABLE dpia_risks IS 'Individual risk assessments for DPIAs. LOT 12.4.';
COMMENT ON COLUMN dpias.tenant_id IS 'CRITICAL: Tenant isolation for RGPD compliance';
COMMENT ON COLUMN dpias.status IS 'Workflow status: PENDING (awaiting DPO), APPROVED, REJECTED';
COMMENT ON COLUMN dpias.data_classification IS 'P0=Public, P1=Technical, P2=Personal, P3=Sensitive (forbidden)';
