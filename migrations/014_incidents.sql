-- Migration 014: Security Incidents Registry (EPIC 9 - LOT 9.0)
-- 
-- RGPD Compliance:
-- - Art. 33.5: Registre des violations (obligatoire)
-- - Art. 33: Notification CNIL (72h si risque)
-- - Art. 34: Notification personnes (si risque élevé)
--
-- Date: 2026-01-01
-- Statut: EPIC 9 - Incident Response & Security Hardening

BEGIN;

-- =============================================================================
-- TABLE: security_incidents
-- Registre des incidents de sécurité et violations de données (Art. 33.5)
-- =============================================================================

CREATE TABLE security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant scope (NULL = incident platform-wide, ex: infrastructure)
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    
    -- Classification incident
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    type TEXT NOT NULL CHECK (type IN (
        'UNAUTHORIZED_ACCESS',      -- Accès non autorisé (brute force, élévation privilèges)
        'CROSS_TENANT_ACCESS',      -- Violation isolation tenant (critique)
        'DATA_LEAK',                -- Fuite de données (export massif, API exposée)
        'PII_IN_LOGS',              -- PII détectée dans logs (EPIC 8)
        'DATA_LOSS',                -- Perte de données (backup failure, corruption)
        'SERVICE_UNAVAILABLE',      -- Indisponibilité prolongée (> 4h)
        'MALWARE',                  -- Malware/ransomware détecté
        'VULNERABILITY_EXPLOITED',  -- Vulnérabilité exploitée
        'OTHER'                     -- Autre incident sécurité
    )),
    
    -- Description incident
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    
    -- Données concernées (Art. 33.3)
    data_categories TEXT[] DEFAULT '{}',  -- ['P0', 'P1', 'P2', 'P3']
    users_affected INTEGER DEFAULT 0,
    records_affected INTEGER DEFAULT 0,
    
    -- Évaluation risque (Art. 33-34)
    risk_level TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (risk_level IN (
        'UNKNOWN',    -- Évaluation en cours
        'NONE',       -- Aucun risque pour droits/libertés
        'LOW',        -- Risque faible
        'MEDIUM',     -- Risque moyen
        'HIGH'        -- Risque élevé → notification CNIL + users obligatoire
    )),
    
    -- Notification CNIL (Art. 33)
    cnil_notified BOOLEAN NOT NULL DEFAULT FALSE,
    cnil_notified_at TIMESTAMPTZ,
    cnil_reference TEXT,  -- Numéro dossier CNIL
    
    -- Notification personnes concernées (Art. 34)
    users_notified BOOLEAN NOT NULL DEFAULT FALSE,
    users_notified_at TIMESTAMPTZ,
    
    -- Remédiation
    remediation_actions TEXT,
    resolved_at TIMESTAMPTZ,
    
    -- Métadonnées détection
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detected_by TEXT NOT NULL DEFAULT 'SYSTEM',  -- SYSTEM, MONITORING, USER, AUDIT, PENTEST
    source_ip INET,  -- IP source si applicable (anonymisée pour logs)
    
    -- Audit trail
    created_by UUID REFERENCES users(id),  -- NULL si détection automatique
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Recherche par date détection (timeline incidents)
CREATE INDEX idx_security_incidents_detected_at ON security_incidents(detected_at DESC);

-- Filtrage par sévérité (dashboard)
CREATE INDEX idx_security_incidents_severity ON security_incidents(severity);

-- Filtrage par type (analyse)
CREATE INDEX idx_security_incidents_type ON security_incidents(type);

-- Filtrage par tenant (isolation)
CREATE INDEX idx_security_incidents_tenant ON security_incidents(tenant_id);

-- Incidents non résolus
CREATE INDEX idx_security_incidents_unresolved ON security_incidents(resolved_at) WHERE resolved_at IS NULL;

-- Incidents à risque élevé non notifiés CNIL (alerte 72h)
CREATE INDEX idx_security_incidents_cnil_pending ON security_incidents(detected_at) 
    WHERE risk_level = 'HIGH' AND cnil_notified = FALSE;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

-- SUPER_ADMIN peut voir tous les incidents (platform-wide)
CREATE POLICY security_incidents_superadmin_all ON security_incidents
    FOR ALL
    TO authenticated
    USING (
        -- SUPER_ADMIN voit tout
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- DPO peut voir tous les incidents (platform-wide) - lecture seule pour CRUD via use case
CREATE POLICY security_incidents_dpo_select ON security_incidents
    FOR SELECT
    TO authenticated
    USING (
        current_setting('app.current_user_role', true) = 'DPO'
    );

-- TENANT_ADMIN peut voir incidents de son tenant uniquement
CREATE POLICY security_incidents_tenant_admin ON security_incidents
    FOR SELECT
    TO authenticated
    USING (
        current_setting('app.current_user_role', true) = 'TENANT_ADMIN'
        AND tenant_id = current_setting('app.current_tenant_id', true)::UUID
    );

-- =============================================================================
-- TRIGGER: updated_at automatique
-- =============================================================================

CREATE OR REPLACE FUNCTION update_security_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_security_incidents_updated_at
    BEFORE UPDATE ON security_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_security_incidents_updated_at();

-- =============================================================================
-- TABLE: incident_audit_log
-- Historique modifications incidents (traçabilité Art. 33.5)
-- =============================================================================

CREATE TABLE incident_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('CREATED', 'UPDATED', 'CNIL_NOTIFIED', 'USERS_NOTIFIED', 'RESOLVED')),
    old_values JSONB,
    new_values JSONB,
    actor_id UUID REFERENCES users(id),
    actor_role TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_audit_log_incident ON incident_audit_log(incident_id);
CREATE INDEX idx_incident_audit_log_created ON incident_audit_log(created_at DESC);

-- RLS pour audit log (même règles que incidents)
ALTER TABLE incident_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY incident_audit_log_superadmin ON incident_audit_log
    FOR ALL
    TO authenticated
    USING (current_setting('app.current_user_role', true) = 'SUPER_ADMIN');

CREATE POLICY incident_audit_log_dpo ON incident_audit_log
    FOR SELECT
    TO authenticated
    USING (current_setting('app.current_user_role', true) = 'DPO');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE security_incidents IS 'Registre des violations de données (Art. 33.5 RGPD) - EPIC 9';
COMMENT ON COLUMN security_incidents.tenant_id IS 'NULL = incident platform-wide (infrastructure)';
COMMENT ON COLUMN security_incidents.data_categories IS 'Catégories données affectées: P0 (technique), P1 (métadonnées), P2 (auth), P3 (sensible)';
COMMENT ON COLUMN security_incidents.risk_level IS 'HIGH = notification CNIL obligatoire (72h) + notification users';
COMMENT ON COLUMN security_incidents.cnil_reference IS 'Numéro dossier CNIL après notification';

COMMENT ON TABLE incident_audit_log IS 'Historique modifications registre incidents (traçabilité audit CNIL)';

COMMIT;
