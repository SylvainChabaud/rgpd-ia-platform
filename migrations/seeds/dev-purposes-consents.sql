-- =============================================================================
-- SEED: Purposes et Consents (Environnement de developpement)
-- =============================================================================
--
-- Ce fichier contient des donnees de demonstration pour LOT 12.2:
-- - purposes: finalites de traitement IA par tenant
-- - consents: consentements utilisateurs lies aux purposes
--
-- Usage:
--   - Utilise par setup-dev.bat (developpement manuel)
--   - Optionnel: donnees de simulation pour tester l'UI
--
-- IMPORTANT: Ces donnees sont UNIQUEMENT pour developpement/test.
-- Ne JAMAIS executer en production.
--
-- =============================================================================

BEGIN;

-- =============================================================================
-- PURPOSES - Finalites de traitement IA par tenant
-- =============================================================================

DO $$
DECLARE
    v_acme_tenant_id UUID;
    v_techcorp_tenant_id UUID;
    v_globalservices_tenant_id UUID;
    v_purpose_id UUID;
BEGIN
    -- Get tenant IDs
    SELECT id INTO v_acme_tenant_id FROM tenants WHERE slug = 'acme' LIMIT 1;
    SELECT id INTO v_techcorp_tenant_id FROM tenants WHERE slug = 'techcorp' LIMIT 1;
    SELECT id INTO v_globalservices_tenant_id FROM tenants WHERE slug = 'globalservices' LIMIT 1;

    -- Skip if tenants don't exist
    IF v_acme_tenant_id IS NULL THEN
        RAISE NOTICE 'Tenant acme not found, skipping purposes seed';
        RETURN;
    END IF;

    -- ==========================================================================
    -- PURPOSES for ACME tenant (4 purposes) - With RGPD fields (LOT 12.2)
    -- ==========================================================================

    INSERT INTO purposes (id, tenant_id, label, description, is_required, is_active,
                          lawful_basis, category, risk_level, max_data_class, requires_dpia,
                          is_from_template, validation_status, created_at)
    VALUES
        (uuid_generate_v4(), v_acme_tenant_id,
         'Resume de documents',
         'Generation automatique de resumes de documents professionnels (contrats, emails, rapports) pour faciliter leur comprehension rapide.',
         true, true,
         'CONSENT', 'AI_PROCESSING', 'MEDIUM', 'P2', false,
         false, 'VALIDATED', NOW() - INTERVAL '60 days'),
        (uuid_generate_v4(), v_acme_tenant_id,
         'Analyse de sentiments',
         'Analyse du ton et du sentiment dans les communications clients pour ameliorer la qualite du service.',
         false, true,
         'LEGITIMATE_INTEREST', 'AI_PROCESSING', 'MEDIUM', 'P2', false,
         false, 'VALIDATED', NOW() - INTERVAL '55 days'),
        (uuid_generate_v4(), v_acme_tenant_id,
         'Classification automatique',
         'Classification automatique des documents et emails entrants pour un routage intelligent vers les bons services.',
         false, true,
         'LEGITIMATE_INTEREST', 'AI_PROCESSING', 'LOW', 'P1', false,
         false, 'VALIDATED', NOW() - INTERVAL '50 days'),
        (uuid_generate_v4(), v_acme_tenant_id,
         'Traduction automatique',
         'Traduction automatique de documents et communications pour faciliter les echanges internationaux.',
         false, false,
         'CONSENT', 'AI_PROCESSING', 'LOW', 'P2', false,
         false, 'VALIDATED', NOW() - INTERVAL '45 days')
    ON CONFLICT DO NOTHING;

    -- ==========================================================================
    -- PURPOSES for TechCorp tenant (3 purposes) - With RGPD fields (LOT 12.2)
    -- ==========================================================================

    IF v_techcorp_tenant_id IS NOT NULL THEN
        INSERT INTO purposes (id, tenant_id, label, description, is_required, is_active,
                              lawful_basis, category, risk_level, max_data_class, requires_dpia,
                              is_from_template, validation_status, created_at)
        VALUES
            (uuid_generate_v4(), v_techcorp_tenant_id,
             'Code Review IA',
             'Analyse automatique du code source pour detecter les bugs potentiels, vulnerabilites de securite et suggestions d''amelioration.',
             true, true,
             'CONSENT', 'AI_PROCESSING', 'HIGH', 'P2', true,
             false, 'VALIDATED', NOW() - INTERVAL '40 days'),
            (uuid_generate_v4(), v_techcorp_tenant_id,
             'Generation de documentation',
             'Generation automatique de documentation technique a partir du code source et des commentaires.',
             false, true,
             'LEGITIMATE_INTEREST', 'AI_PROCESSING', 'LOW', 'P1', false,
             false, 'VALIDATED', NOW() - INTERVAL '35 days'),
            (uuid_generate_v4(), v_techcorp_tenant_id,
             'Assistance technique',
             'Chatbot intelligent pour repondre aux questions techniques des developpeurs et utilisateurs.',
             true, true,
             'CONSENT', 'AI_PROCESSING', 'MEDIUM', 'P2', false,
             false, 'VALIDATED', NOW() - INTERVAL '30 days')
        ON CONFLICT DO NOTHING;
    END IF;

    -- ==========================================================================
    -- PURPOSES for GlobalServices tenant (5 purposes) - With RGPD fields (LOT 12.2)
    -- ==========================================================================

    IF v_globalservices_tenant_id IS NOT NULL THEN
        INSERT INTO purposes (id, tenant_id, label, description, is_required, is_active,
                              lawful_basis, category, risk_level, max_data_class, requires_dpia,
                              is_from_template, validation_status, created_at)
        VALUES
            (uuid_generate_v4(), v_globalservices_tenant_id,
             'Analyse de contrats',
             'Extraction automatique des clauses cles, dates limites et obligations dans les contrats commerciaux.',
             true, true,
             'CONTRACT', 'AI_PROCESSING', 'MEDIUM', 'P2', false,
             false, 'VALIDATED', NOW() - INTERVAL '70 days'),
            (uuid_generate_v4(), v_globalservices_tenant_id,
             'Resume de reunions',
             'Generation de comptes-rendus de reunions a partir de transcriptions audio ou notes manuscrites.',
             false, true,
             'CONSENT', 'AI_PROCESSING', 'HIGH', 'P3', true,
             false, 'VALIDATED', NOW() - INTERVAL '65 days'),
            (uuid_generate_v4(), v_globalservices_tenant_id,
             'Veille concurrentielle',
             'Analyse automatique des communications publiques et rapports pour identifier les tendances du marche.',
             false, true,
             'LEGITIMATE_INTEREST', 'ANALYTICS', 'LOW', 'P0', false,
             false, 'VALIDATED', NOW() - INTERVAL '60 days'),
            (uuid_generate_v4(), v_globalservices_tenant_id,
             'Redaction assistee',
             'Assistance a la redaction de documents professionnels avec suggestions de formulation et correction.',
             false, true,
             'CONSENT', 'AI_PROCESSING', 'MEDIUM', 'P2', false,
             false, 'VALIDATED', NOW() - INTERVAL '55 days'),
            (uuid_generate_v4(), v_globalservices_tenant_id,
             'Extraction de donnees',
             'Extraction automatique de donnees structurees a partir de documents non structures (factures, formulaires).',
             false, false,
             'LEGITIMATE_INTEREST', 'AI_PROCESSING', 'MEDIUM', 'P2', false,
             false, 'VALIDATED', NOW() - INTERVAL '50 days')
        ON CONFLICT DO NOTHING;
    END IF;

END $$;

-- =============================================================================
-- CONSENTS - Consentements utilisateurs lies aux purposes
-- =============================================================================
-- Donnees coherentes et deterministes pour tous les utilisateurs.
-- Chaque utilisateur a un consentement pour chaque finalite active de son tenant.
-- Quelques consentements sont revoques pour simuler un historique realiste.

-- ACME: Consents for all MEMBER users on all active purposes
INSERT INTO consents (tenant_id, user_id, purpose_id, purpose, granted, granted_at, revoked_at, created_at)
SELECT
    p.tenant_id,
    u.id as user_id,
    p.id as purpose_id,
    p.label as purpose,
    -- Logique: required = toujours granted, sinon variation par utilisateur
    CASE
        WHEN p.is_required THEN true
        WHEN u.display_name = 'Alice Martin' AND p.label = 'Classification automatique' THEN false
        WHEN u.display_name = 'Bob Dupont' AND p.label = 'Analyse de sentiments' THEN false
        ELSE true
    END as granted,
    -- granted_at
    CASE
        WHEN p.is_required THEN NOW() - INTERVAL '25 days'
        ELSE NOW() - INTERVAL '20 days'
    END as granted_at,
    -- revoked_at (seulement pour les non-granted)
    CASE
        WHEN p.is_required THEN NULL
        WHEN u.display_name = 'Alice Martin' AND p.label = 'Classification automatique' THEN NOW() - INTERVAL '5 days'
        WHEN u.display_name = 'Bob Dupont' AND p.label = 'Analyse de sentiments' THEN NOW() - INTERVAL '3 days'
        ELSE NULL
    END as revoked_at,
    NOW() - INTERVAL '30 days' as created_at
FROM purposes p
JOIN tenants t ON t.id = p.tenant_id
CROSS JOIN users u
WHERE t.slug = 'acme'
  AND u.tenant_id = t.id
  AND u.role = 'MEMBER'
  AND p.is_active = true
ON CONFLICT DO NOTHING;

-- TechCorp: Consents for all MEMBER users on all active purposes
INSERT INTO consents (tenant_id, user_id, purpose_id, purpose, granted, granted_at, revoked_at, created_at)
SELECT
    p.tenant_id,
    u.id as user_id,
    p.id as purpose_id,
    p.label as purpose,
    CASE
        WHEN p.is_required THEN true
        WHEN u.display_name = 'David Laurent' AND p.label = 'Generation de documentation' THEN false
        ELSE true
    END as granted,
    NOW() - INTERVAL '15 days' as granted_at,
    CASE
        WHEN u.display_name = 'David Laurent' AND p.label = 'Generation de documentation' THEN NOW() - INTERVAL '2 days'
        ELSE NULL
    END as revoked_at,
    NOW() - INTERVAL '20 days' as created_at
FROM purposes p
JOIN tenants t ON t.id = p.tenant_id
CROSS JOIN users u
WHERE t.slug = 'techcorp'
  AND u.tenant_id = t.id
  AND u.role = 'MEMBER'
  AND p.is_active = true
ON CONFLICT DO NOTHING;

-- GlobalServices: Consents for all MEMBER users on all active purposes
INSERT INTO consents (tenant_id, user_id, purpose_id, purpose, granted, granted_at, revoked_at, created_at)
SELECT
    p.tenant_id,
    u.id as user_id,
    p.id as purpose_id,
    p.label as purpose,
    CASE
        WHEN p.is_required THEN true
        WHEN u.display_name = 'Grace Lefevre' AND p.label = 'Veille concurrentielle' THEN false
        WHEN u.display_name = 'Henry Simon' AND p.label = 'Redaction assistee' THEN false
        ELSE true
    END as granted,
    NOW() - INTERVAL '35 days' as granted_at,
    CASE
        WHEN u.display_name = 'Grace Lefevre' AND p.label = 'Veille concurrentielle' THEN NOW() - INTERVAL '10 days'
        WHEN u.display_name = 'Henry Simon' AND p.label = 'Redaction assistee' THEN NOW() - INTERVAL '7 days'
        ELSE NULL
    END as revoked_at,
    NOW() - INTERVAL '45 days' as created_at
FROM purposes p
JOIN tenants t ON t.id = p.tenant_id
CROSS JOIN users u
WHERE t.slug = 'globalservices'
  AND u.tenant_id = t.id
  AND u.role = 'MEMBER'
  AND p.is_active = true
ON CONFLICT DO NOTHING;

COMMIT;

-- =============================================================================
-- Verification (optionnel)
-- =============================================================================

SELECT 'purposes' as table_name, COUNT(*) as count FROM purposes
UNION ALL
SELECT 'consents (with purpose_id)', COUNT(*) FROM consents WHERE purpose_id IS NOT NULL;
