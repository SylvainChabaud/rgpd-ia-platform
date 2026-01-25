-- Migration 031: Fix cookie_consents table
-- LOT 10.3 - Cookie Consent Banner
--
-- Issues fixed:
-- 1. anonymous_id was UUID but code generates string format (anon-xxx-xxx)
-- 2. deleted_at column was missing (used by repo for soft delete)
--
-- RGPD: ePrivacy Directive 2002/58/CE Art. 5.3

BEGIN;

-- 1. Change anonymous_id from UUID to VARCHAR to support custom format
-- Format: anon-{timestamp}-{hex16} e.g., anon-1737000000000-abcdef1234567890
ALTER TABLE cookie_consents
  ALTER COLUMN anonymous_id TYPE VARCHAR(50) USING anonymous_id::VARCHAR(50);

-- 2. Add deleted_at column for soft delete support
ALTER TABLE cookie_consents
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Update constraint to match new type
ALTER TABLE cookie_consents
  DROP CONSTRAINT IF EXISTS chk_cookie_consents_user_or_anonymous;

ALTER TABLE cookie_consents
  ADD CONSTRAINT chk_cookie_consents_user_or_anonymous CHECK (
    (user_id IS NOT NULL AND anonymous_id IS NULL) OR
    (user_id IS NULL AND anonymous_id IS NOT NULL)
  );

-- 4. Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_cookie_consents_deleted ON cookie_consents(deleted_at)
  WHERE deleted_at IS NULL;

COMMIT;
