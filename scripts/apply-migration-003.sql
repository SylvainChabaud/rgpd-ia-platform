-- Direct SQL application of migration 003 fix
-- Add deleted_at to tenants table (missing from original migration)

BEGIN;

-- Add deleted_at to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Create index for active tenants
CREATE INDEX IF NOT EXISTS idx_tenants_active
ON tenants(id)
WHERE deleted_at IS NULL;

-- Verify
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'deleted_at'
  ) THEN
    RAISE NOTICE '✅ Column deleted_at successfully added to tenants table';
  ELSE
    RAISE EXCEPTION '❌ Failed to add deleted_at column to tenants table';
  END IF;
END $$;

COMMIT;
