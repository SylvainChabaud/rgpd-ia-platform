-- 017_tenant_suspension.sql
-- LOT 11.0 - US 11.4 : Suspension de tenant
-- Permet au Super Admin de suspendre un tenant (impayé, non conforme, etc.)

BEGIN;

-- =========================
-- Ajout colonnes suspension
-- =========================

-- suspended_at : timestamp de suspension (NULL = actif)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ NULL;

-- suspension_reason : raison de la suspension (obligatoire si suspendu)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS suspension_reason TEXT NULL;

-- suspended_by : actorId qui a suspendu (audit trail)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS suspended_by UUID NULL REFERENCES users(id);

-- Supprime la contrainte si elle existe déjà (idempotence)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_suspension_reason' AND conrelid = 'tenants'::regclass
  ) THEN
    ALTER TABLE tenants DROP CONSTRAINT check_suspension_reason;
  END IF;
END$$;

ALTER TABLE tenants
ADD CONSTRAINT check_suspension_reason
CHECK (
  (suspended_at IS NULL AND suspension_reason IS NULL AND suspended_by IS NULL)
  OR
  (suspended_at IS NOT NULL AND suspension_reason IS NOT NULL AND suspended_by IS NOT NULL)
);

-- Index pour requêtes de filtrage (actif vs suspendu)
CREATE INDEX IF NOT EXISTS idx_tenants_suspended_at ON tenants(suspended_at);

-- =========================
-- Commentaires (documentation)
-- =========================

COMMENT ON COLUMN tenants.suspended_at IS 'Timestamp de suspension du tenant (NULL = actif, NOT NULL = suspendu). Bloque tous les users du tenant.';
COMMENT ON COLUMN tenants.suspension_reason IS 'Raison de la suspension (ex: impayé, non conforme, fraude). Obligatoire si suspendu.';
COMMENT ON COLUMN tenants.suspended_by IS 'User ID (PLATFORM admin) qui a suspendu le tenant. Pour audit trail.';

COMMIT;
