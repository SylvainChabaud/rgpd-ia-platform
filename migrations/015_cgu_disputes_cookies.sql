-- Migration 015: CGU, Disputes, Cookies & Uploads (EPIC 10)
-- 
-- RGPD Compliance:
-- - Art. 6: Base légale contrat (CGU acceptation)
-- - Art. 22: Droit révision humaine (disputes IA)
-- - ePrivacy Art. 5.3: Consentement cookies
-- - Art. 32: Sécurité (stockage uploads chiffrés)
--
-- Date: 2026-01-02
-- Statut: EPIC 10 - RGPD Legal & Compliance

BEGIN;

-- =============================================================================
-- TABLE: cgu_versions
-- Versioning des Conditions Générales d'Utilisation (LOT 10.1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS cgu_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Versioning
    version VARCHAR(50) NOT NULL UNIQUE,  -- e.g., "1.0", "1.1", "2.0"
    
    -- Contenu CGU (markdown ou HTML)
    content TEXT NOT NULL,
    
    -- Métadonnées
    effective_date DATE NOT NULL,  -- Date entrée en vigueur
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),  -- Admin qui a créé la version
    
    -- Audit
    is_active BOOLEAN NOT NULL DEFAULT TRUE  -- Une seule version active à la fois
);

-- Index pour version active
CREATE INDEX IF NOT EXISTS idx_cgu_versions_active ON cgu_versions(effective_date DESC) WHERE is_active = TRUE;

-- =============================================================================
-- TABLE: user_cgu_acceptances
-- Traçabilité acceptations CGU par utilisateur (LOT 10.1)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_cgu_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User scope
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- CGU acceptée
    cgu_version_id UUID NOT NULL REFERENCES cgu_versions(id) ON DELETE RESTRICT,
    
    -- Traçabilité
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,  -- IP user lors acceptation (anonymisée après 7j)
    user_agent TEXT,  -- User-agent (optionnel, pour analyse fraude)
    
    -- Contrainte unicité : un user accepte chaque version une seule fois
    CONSTRAINT uq_user_cgu_acceptance UNIQUE(user_id, cgu_version_id),
    
    -- Isolation tenant
    CONSTRAINT chk_user_cgu_acceptances_tenant_not_null CHECK (tenant_id IS NOT NULL)
);

-- Index pour recherche par user
CREATE INDEX IF NOT EXISTS idx_user_cgu_acceptances_user ON user_cgu_acceptances(tenant_id, user_id);

-- Index pour recherche par version CGU
CREATE INDEX IF NOT EXISTS idx_user_cgu_acceptances_version ON user_cgu_acceptances(cgu_version_id);

-- =============================================================================
-- TABLE: user_disputes
-- Contestations décisions IA - Art. 22 Droit révision humaine (LOT 10.6)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User scope
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Job IA contesté
    ai_job_id UUID REFERENCES ai_jobs(id) ON DELETE SET NULL,
    
    -- Détails contestation
    reason TEXT NOT NULL,  -- Motif contestation (textarea libre)
    attachment_url TEXT,   -- URL preuve (upload S3/local, optionnel)
    
    -- Workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',   -- En attente traitement
        'reviewed',  -- En cours révision admin
        'resolved'   -- Résolue (réponse envoyée)
    )),
    
    -- Réponse admin (révision humaine)
    admin_response TEXT,
    reviewed_by UUID REFERENCES users(id),  -- Admin qui a traité
    reviewed_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Isolation tenant
    CONSTRAINT chk_user_disputes_tenant_not_null CHECK (tenant_id IS NOT NULL)
);

-- Index pour recherche disputes user
CREATE INDEX IF NOT EXISTS idx_user_disputes_user ON user_disputes(tenant_id, user_id);

-- Index pour recherche disputes tenant (Tenant Admin dashboard)
CREATE INDEX IF NOT EXISTS idx_user_disputes_tenant ON user_disputes(tenant_id, status);

-- Index pour disputes pending (alertes admin)
CREATE INDEX IF NOT EXISTS idx_user_disputes_pending ON user_disputes(created_at DESC) WHERE status = 'pending';

-- =============================================================================
-- TABLE: user_oppositions
-- Opposition au traitement - Art. 21 RGPD (LOT 10.6)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_oppositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User scope
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Opposition details
    treatment_type VARCHAR(100) NOT NULL,  -- e.g., 'analytics', 'marketing', 'usage_stats'
    reason TEXT,  -- Motif opposition (optionnel)
    
    -- Workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, accepted, rejected
    
    -- Admin response
    admin_response TEXT,  -- Réponse admin (si rejetée)
    reviewed_by UUID REFERENCES users(id),  -- Tenant Admin qui a traité
    reviewed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    
    -- Constraint: un seul ticket actif par user+treatment_type
    UNIQUE(tenant_id, user_id, treatment_type, created_at)
);

-- Index isolation tenant
CREATE INDEX IF NOT EXISTS idx_user_oppositions_tenant ON user_oppositions(tenant_id, user_id);

-- Index admin dashboard (tickets pending)
CREATE INDEX IF NOT EXISTS idx_user_oppositions_pending ON user_oppositions(tenant_id, status) WHERE status = 'pending';

-- Index purge job (tickets résolus)
CREATE INDEX IF NOT EXISTS idx_user_oppositions_resolved ON user_oppositions(resolved_at) WHERE resolved_at IS NOT NULL;

-- =============================================================================
-- TABLE: cookie_consents
-- Consentements cookies ePrivacy (LOT 10.3)
-- =============================================================================

CREATE TABLE IF NOT EXISTS cookie_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User scope (nullable pour visitors anonymes)
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Identifiant anonyme (si user non connecté)
    anonymous_id UUID,  -- Cookie UUID stocké navigateur
    
    -- Préférences cookies
    necessary BOOLEAN NOT NULL DEFAULT TRUE,   -- Obligatoires (non modifiable)
    analytics BOOLEAN NOT NULL DEFAULT FALSE,  -- Opt-in (Google Analytics, Plausible)
    marketing BOOLEAN NOT NULL DEFAULT FALSE,  -- Opt-in (tracking publicitaire)
    
    -- Métadonnées
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 months'),  -- TTL 12 mois
    
    -- Traçabilité (anonymisée après 7j)
    ip_address INET,
    user_agent TEXT,
    
    -- Contrainte : soit user_id, soit anonymous_id
    CONSTRAINT chk_cookie_consents_user_or_anonymous CHECK (
        (user_id IS NOT NULL AND anonymous_id IS NULL) OR
        (user_id IS NULL AND anonymous_id IS NOT NULL)
    )
);

-- Index pour recherche par user
CREATE INDEX IF NOT EXISTS idx_cookie_consents_user ON cookie_consents(tenant_id, user_id);

-- Index pour recherche par anonymous_id (visitors)
CREATE INDEX IF NOT EXISTS idx_cookie_consents_anonymous ON cookie_consents(anonymous_id);

-- Index pour purge consents expirés (job cron)
CREATE INDEX IF NOT EXISTS idx_cookie_consents_expired ON cookie_consents(expires_at);

-- =============================================================================
-- TABLE: uploaded_files
-- Stockage temporaire fichiers uploadés (documents IA) - LOT 13.1
-- =============================================================================

CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User scope
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Job IA associé (optionnel si upload avant invocation)
    ai_job_id UUID REFERENCES ai_jobs(id) ON DELETE CASCADE,
    
    -- Détails fichier
    filename TEXT NOT NULL,          -- Nom original (sanitized)
    file_path TEXT NOT NULL UNIQUE,  -- Chemin stockage : /{tenantId}/{userId}/{jobId}/document.pdf
    file_size BIGINT NOT NULL,       -- Taille en bytes
    mime_type TEXT NOT NULL,         -- e.g., 'application/pdf', 'text/plain'
    
    -- Sécurité
    encrypted BOOLEAN NOT NULL DEFAULT TRUE,  -- Fichier chiffré AES-256-GCM
    encryption_key_id TEXT,  -- ID clé chiffrement (dérivée de tenantId + master secret)
    
    -- TTL et purge
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),  -- Purge après 1h
    purged_at TIMESTAMPTZ,  -- Date purge effective
    
    -- Isolation tenant
    CONSTRAINT chk_uploaded_files_tenant_not_null CHECK (tenant_id IS NOT NULL),
    CONSTRAINT chk_uploaded_files_size_max CHECK (file_size <= 10485760)  -- Max 10MB
);

-- Index pour recherche par user
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(tenant_id, user_id);

-- Index pour recherche par job IA
CREATE INDEX IF NOT EXISTS idx_uploaded_files_job ON uploaded_files(ai_job_id);

-- Index pour purge automatique (job cron)
CREATE INDEX IF NOT EXISTS idx_uploaded_files_expired ON uploaded_files(expires_at) WHERE purged_at IS NULL;

-- =============================================================================
-- ALTER TABLE: users (ajout flag data_suspended pour Art. 18)
-- =============================================================================

-- Ajout colonne data_suspended (Art. 18 - Droit limitation traitement)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS data_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS data_suspended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS data_suspended_reason TEXT;

-- Index pour recherche users suspendus (monitoring admin)
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(tenant_id) WHERE data_suspended = TRUE;

-- =============================================================================
-- MARK MIGRATION AS APPLIED
-- =============================================================================

INSERT INTO schema_migrations (version, applied_at)
VALUES (15, NOW())
ON CONFLICT (version) DO NOTHING;

COMMIT;
