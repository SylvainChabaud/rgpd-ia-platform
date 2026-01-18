-- 024_email_encrypted.sql
-- LOT 1.6 - Email chiffré (AES-256) pour notifications RGPD
--
-- Contexte:
-- L'email était stocké uniquement en hash SHA-256 (irréversible).
-- Cela empêchait:
-- - User de voir son propre email (Art. 15 - Droit d'accès)
-- - DPO de notifier les utilisateurs (Art. 34 - Obligation légale)
-- - Système d'envoyer des emails (reset password, alertes)
--
-- Solution: Double stockage
-- - email_hash (existant) -> authentification (lookup rapide)
-- - email_encrypted (nouveau) -> affichage/notification (AES-256-GCM)
--
-- Règles d'accès FULL RGPD:
-- - User: voit son email uniquement
-- - Tenant Admin: NON (displayName suffit)
-- - Platform Admin: NON (délègue au DPO)
-- - DPO: OUI (obligation légale Art. 34, 37-39)
-- - Système: OUI (notifications automatiques)

BEGIN;

-- Ajout colonne email_encrypted (BYTEA pour stocker les données binaires chiffrées)
-- NULL pour les utilisateurs existants (migration rétroactive possible ultérieurement)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_encrypted BYTEA NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN users.email_encrypted IS 'Email chiffré AES-256-GCM. Accessible uniquement par: User (le sien), DPO, Système. Art. 15, 34 RGPD.';

-- Index sur email_hash si pas déjà présent (pour lookup authentification)
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);

COMMIT;
