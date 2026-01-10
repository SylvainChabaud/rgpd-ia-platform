-- =============================================================================
-- Migration 018: Normalize User Roles (Fix Role Consistency)
-- =============================================================================
--
-- OBJECTIF: Normaliser les valeurs de rôles utilisateurs pour éliminer
--           les incohérences entre bootstrap, UI et backend
--
-- CONTEXT: Le système utilisait plusieurs valeurs synonymes:
--          - 'ADMIN' vs 'TENANT_ADMIN' (pour admin tenant)
--          - 'USER' vs 'MEMBER' vs 'TENANT_USER' (pour membre)
--
-- SOLUTION: Normalisation sur 4 rôles clairs:
--          - SUPERADMIN (platform admin)
--          - TENANT_ADMIN (tenant admin)
--          - MEMBER (tenant member)
--          - DPO (data protection officer)
--
-- AUTEUR: Claude Code - LOT 11.2 Role Consistency Fix
-- DATE: 2026-01-09
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Étape 1: Migration des anciennes valeurs vers les nouvelles valeurs normalisées
-- -----------------------------------------------------------------------------

-- Migration: 'ADMIN' → 'TENANT_ADMIN' (pour les utilisateurs avec scope TENANT)
UPDATE users
SET role = 'TENANT_ADMIN'
WHERE role = 'ADMIN'
  AND scope = 'TENANT';

-- Migration: 'USER' → 'MEMBER'
UPDATE users
SET role = 'MEMBER'
WHERE role = 'USER';

-- Migration: 'TENANT_USER' → 'MEMBER' (ancienne valeur hardcodée dans PgTenantUserRepo)
UPDATE users
SET role = 'MEMBER'
WHERE role = 'TENANT_USER';

-- -----------------------------------------------------------------------------
-- Étape 2: Ajout d'une contrainte CHECK pour valider les rôles autorisés
-- -----------------------------------------------------------------------------

-- Cette contrainte garantit que seules les valeurs normalisées sont stockées
-- IF NOT EXISTS pour idempotence (PostgreSQL 9.6+)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('SUPERADMIN', 'TENANT_ADMIN', 'MEMBER', 'DPO'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Étape 3: Documentation de la colonne role
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN users.role IS
  'User role (normalized values):
   - SUPERADMIN: Platform-level administrator (scope: PLATFORM)
   - TENANT_ADMIN: Tenant administrator with full tenant management (scope: TENANT)
   - MEMBER: Standard tenant member/user (scope: TENANT)
   - DPO: Data Protection Officer with RGPD compliance permissions (scope: TENANT)

   Historical note: Previously used ADMIN, USER, TENANT_USER which were ambiguous.
   See migration 018 for consolidation rationale.';

-- -----------------------------------------------------------------------------
-- Étape 4: Vérification post-migration
-- -----------------------------------------------------------------------------

-- Compte des utilisateurs par rôle après migration
DO $$
DECLARE
  superadmin_count INT;
  tenant_admin_count INT;
  member_count INT;
  dpo_count INT;
  invalid_count INT;
BEGIN
  SELECT COUNT(*) INTO superadmin_count FROM users WHERE role = 'SUPERADMIN';
  SELECT COUNT(*) INTO tenant_admin_count FROM users WHERE role = 'TENANT_ADMIN';
  SELECT COUNT(*) INTO member_count FROM users WHERE role = 'MEMBER';
  SELECT COUNT(*) INTO dpo_count FROM users WHERE role = 'DPO';
  SELECT COUNT(*) INTO invalid_count FROM users WHERE role NOT IN ('SUPERADMIN', 'TENANT_ADMIN', 'MEMBER', 'DPO');

  RAISE NOTICE '✓ Migration 018 completed:';
  RAISE NOTICE '  - SUPERADMIN users: %', superadmin_count;
  RAISE NOTICE '  - TENANT_ADMIN users: %', tenant_admin_count;
  RAISE NOTICE '  - MEMBER users: %', member_count;
  RAISE NOTICE '  - DPO users: %', dpo_count;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION '✗ Migration failed: % users with invalid roles found', invalid_count;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- Rollback (si nécessaire)
-- =============================================================================
--
-- Pour annuler cette migration:
--
-- BEGIN;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- -- Note: Les données migrées ne sont pas revertées (car les anciennes valeurs
-- -- étaient ambiguës). Il faudrait une restauration manuelle depuis un backup.
-- COMMIT;
-- =============================================================================
