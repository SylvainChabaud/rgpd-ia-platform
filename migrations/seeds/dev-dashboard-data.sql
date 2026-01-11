-- =============================================================================
-- SEED: Dashboard Tenant Data (Environnement de developpement)
-- =============================================================================
--
-- Ce fichier contient des donnees de demonstration pour le dashboard tenant:
-- - consents: consentements utilisateurs
-- - ai_jobs: jobs IA (metadata uniquement, pas de contenu P3)
-- - rgpd_requests: demandes RGPD (export/suppression)
-- - audit_events: evenements d'audit pour l'activity feed
--
-- Usage:
--   - Utilise par setup-dev.bat (developpement manuel)
--   - Utilise par seed-test-data.ts (tests E2E)
--
-- IMPORTANT: Ces donnees sont UNIQUEMENT pour developpement/test.
-- Ne JAMAIS executer en production.
--
-- =============================================================================

BEGIN;

-- =============================================================================
-- CONSENTS - Consentements utilisateurs (P2 data)
-- =============================================================================
-- Purpose types: 'analytics', 'ai_processing', 'marketing', 'data_sharing'

-- Get tenant and user IDs for seeding
DO $$
DECLARE
    v_acme_tenant_id UUID;
    v_techcorp_tenant_id UUID;
    v_globalservices_tenant_id UUID;
    v_user_id UUID;
    v_user_ids UUID[];
    i INTEGER;
BEGIN
    -- Get tenant IDs
    SELECT id INTO v_acme_tenant_id FROM tenants WHERE slug = 'acme' LIMIT 1;
    SELECT id INTO v_techcorp_tenant_id FROM tenants WHERE slug = 'techcorp' LIMIT 1;
    SELECT id INTO v_globalservices_tenant_id FROM tenants WHERE slug = 'globalservices' LIMIT 1;

    -- Skip if tenants don't exist
    IF v_acme_tenant_id IS NULL THEN
        RAISE NOTICE 'Tenant acme not found, skipping dashboard data seed';
        RETURN;
    END IF;

    -- ==========================================================================
    -- CONSENTS for ACME tenant
    -- ==========================================================================

    -- Get user IDs for ACME tenant
    SELECT ARRAY_AGG(id) INTO v_user_ids FROM users WHERE tenant_id = v_acme_tenant_id LIMIT 10;

    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
        -- Insert consents for each user
        FOREACH v_user_id IN ARRAY v_user_ids
        LOOP
            -- Analytics consent (granted)
            INSERT INTO consents (tenant_id, user_id, purpose, granted, granted_at, created_at)
            VALUES (v_acme_tenant_id, v_user_id, 'analytics', true, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days')
            ON CONFLICT DO NOTHING;

            -- AI processing consent (granted)
            INSERT INTO consents (tenant_id, user_id, purpose, granted, granted_at, created_at)
            VALUES (v_acme_tenant_id, v_user_id, 'ai_processing', true, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days')
            ON CONFLICT DO NOTHING;

            -- Marketing consent (some granted, some revoked)
            IF random() > 0.5 THEN
                INSERT INTO consents (tenant_id, user_id, purpose, granted, granted_at, created_at)
                VALUES (v_acme_tenant_id, v_user_id, 'marketing', true, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days')
                ON CONFLICT DO NOTHING;
            ELSE
                INSERT INTO consents (tenant_id, user_id, purpose, granted, granted_at, revoked_at, created_at)
                VALUES (v_acme_tenant_id, v_user_id, 'marketing', false, NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '20 days')
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- ==========================================================================
    -- CONSENTS for TechCorp tenant
    -- ==========================================================================

    SELECT ARRAY_AGG(id) INTO v_user_ids FROM users WHERE tenant_id = v_techcorp_tenant_id LIMIT 10;

    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
        FOREACH v_user_id IN ARRAY v_user_ids
        LOOP
            -- AI processing consent (granted)
            INSERT INTO consents (tenant_id, user_id, purpose, granted, granted_at, created_at)
            VALUES (v_techcorp_tenant_id, v_user_id, 'ai_processing', true, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days')
            ON CONFLICT DO NOTHING;

            -- Data sharing consent (pending - not yet granted)
            INSERT INTO consents (tenant_id, user_id, purpose, granted, created_at)
            VALUES (v_techcorp_tenant_id, v_user_id, 'data_sharing', false, NOW() - INTERVAL '10 days')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- ==========================================================================
    -- CONSENTS for GlobalServices tenant
    -- ==========================================================================

    SELECT ARRAY_AGG(id) INTO v_user_ids FROM users WHERE tenant_id = v_globalservices_tenant_id LIMIT 10;

    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
        FOREACH v_user_id IN ARRAY v_user_ids
        LOOP
            -- All consents granted
            INSERT INTO consents (tenant_id, user_id, purpose, granted, granted_at, created_at)
            VALUES (v_globalservices_tenant_id, v_user_id, 'analytics', true, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days')
            ON CONFLICT DO NOTHING;

            INSERT INTO consents (tenant_id, user_id, purpose, granted, granted_at, created_at)
            VALUES (v_globalservices_tenant_id, v_user_id, 'ai_processing', true, NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days')
            ON CONFLICT DO NOTHING;

            INSERT INTO consents (tenant_id, user_id, purpose, granted, granted_at, created_at)
            VALUES (v_globalservices_tenant_id, v_user_id, 'marketing', true, NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

END $$;

-- =============================================================================
-- AI_JOBS - Jobs IA metadata (P1 data - NO content/prompts)
-- =============================================================================
-- Status: PENDING, RUNNING, COMPLETED, FAILED
-- Purpose: document_analysis, content_generation, data_classification, summarization

DO $$
DECLARE
    v_acme_tenant_id UUID;
    v_techcorp_tenant_id UUID;
    v_globalservices_tenant_id UUID;
    v_user_id UUID;
    v_user_ids UUID[];
BEGIN
    -- Get tenant IDs
    SELECT id INTO v_acme_tenant_id FROM tenants WHERE slug = 'acme' LIMIT 1;
    SELECT id INTO v_techcorp_tenant_id FROM tenants WHERE slug = 'techcorp' LIMIT 1;
    SELECT id INTO v_globalservices_tenant_id FROM tenants WHERE slug = 'globalservices' LIMIT 1;

    IF v_acme_tenant_id IS NULL THEN
        RETURN;
    END IF;

    -- Get a user from each tenant for job attribution
    SELECT id INTO v_user_id FROM users WHERE tenant_id = v_acme_tenant_id LIMIT 1;

    -- ==========================================================================
    -- AI Jobs for ACME tenant (mix of statuses)
    -- ==========================================================================

    -- Completed jobs (success)
    INSERT INTO ai_jobs (tenant_id, user_id, purpose, model_ref, status, created_at, started_at, completed_at)
    VALUES
        (v_acme_tenant_id, v_user_id, 'document_analysis', 'llama2:7b', 'COMPLETED', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '1 minute', NOW() - INTERVAL '5 days' + INTERVAL '3 minutes'),
        (v_acme_tenant_id, v_user_id, 'content_generation', 'mistral:7b', 'COMPLETED', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '30 seconds', NOW() - INTERVAL '4 days' + INTERVAL '2 minutes'),
        (v_acme_tenant_id, v_user_id, 'summarization', 'llama2:7b', 'COMPLETED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '15 seconds', NOW() - INTERVAL '3 days' + INTERVAL '1 minute'),
        (v_acme_tenant_id, v_user_id, 'data_classification', 'mistral:7b', 'COMPLETED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '45 seconds', NOW() - INTERVAL '2 days' + INTERVAL '4 minutes'),
        (v_acme_tenant_id, v_user_id, 'document_analysis', 'llama2:7b', 'COMPLETED', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '20 seconds', NOW() - INTERVAL '1 day' + INTERVAL '2 minutes')
    ON CONFLICT DO NOTHING;

    -- Failed jobs
    INSERT INTO ai_jobs (tenant_id, user_id, purpose, model_ref, status, created_at, started_at, completed_at)
    VALUES
        (v_acme_tenant_id, v_user_id, 'content_generation', 'llama2:7b', 'FAILED', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '10 seconds', NOW() - INTERVAL '6 days' + INTERVAL '30 seconds'),
        (v_acme_tenant_id, v_user_id, 'summarization', 'mistral:7b', 'FAILED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '5 seconds', NOW() - INTERVAL '2 days' + INTERVAL '15 seconds')
    ON CONFLICT DO NOTHING;

    -- Pending/Running jobs
    INSERT INTO ai_jobs (tenant_id, user_id, purpose, model_ref, status, created_at, started_at)
    VALUES
        (v_acme_tenant_id, v_user_id, 'document_analysis', 'llama2:7b', 'RUNNING', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '4 minutes'),
        (v_acme_tenant_id, v_user_id, 'data_classification', 'mistral:7b', 'PENDING', NOW() - INTERVAL '2 minutes', NULL)
    ON CONFLICT DO NOTHING;

    -- ==========================================================================
    -- AI Jobs for TechCorp tenant
    -- ==========================================================================

    SELECT id INTO v_user_id FROM users WHERE tenant_id = v_techcorp_tenant_id LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO ai_jobs (tenant_id, user_id, purpose, model_ref, status, created_at, started_at, completed_at)
        VALUES
            (v_techcorp_tenant_id, v_user_id, 'content_generation', 'gpt-4', 'COMPLETED', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '20 seconds', NOW() - INTERVAL '7 days' + INTERVAL '5 minutes'),
            (v_techcorp_tenant_id, v_user_id, 'document_analysis', 'gpt-4', 'COMPLETED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '10 seconds', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes'),
            (v_techcorp_tenant_id, v_user_id, 'summarization', 'gpt-4', 'COMPLETED', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '5 seconds', NOW() - INTERVAL '1 day' + INTERVAL '1 minute')
        ON CONFLICT DO NOTHING;
    END IF;

    -- ==========================================================================
    -- AI Jobs for GlobalServices tenant
    -- ==========================================================================

    SELECT id INTO v_user_id FROM users WHERE tenant_id = v_globalservices_tenant_id LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO ai_jobs (tenant_id, user_id, purpose, model_ref, status, created_at, started_at, completed_at)
        VALUES
            (v_globalservices_tenant_id, v_user_id, 'data_classification', 'claude-3', 'COMPLETED', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '30 seconds', NOW() - INTERVAL '10 days' + INTERVAL '2 minutes'),
            (v_globalservices_tenant_id, v_user_id, 'content_generation', 'claude-3', 'COMPLETED', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '15 seconds', NOW() - INTERVAL '5 days' + INTERVAL '4 minutes'),
            (v_globalservices_tenant_id, v_user_id, 'document_analysis', 'claude-3', 'FAILED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '10 seconds', NOW() - INTERVAL '2 days' + INTERVAL '20 seconds')
        ON CONFLICT DO NOTHING;
    END IF;

END $$;

-- =============================================================================
-- RGPD_REQUESTS - Demandes RGPD (export/suppression)
-- =============================================================================
-- Type: EXPORT, DELETE
-- Status: PENDING, PROCESSING, COMPLETED, FAILED

DO $$
DECLARE
    v_acme_tenant_id UUID;
    v_techcorp_tenant_id UUID;
    v_globalservices_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- Get tenant IDs
    SELECT id INTO v_acme_tenant_id FROM tenants WHERE slug = 'acme' LIMIT 1;
    SELECT id INTO v_techcorp_tenant_id FROM tenants WHERE slug = 'techcorp' LIMIT 1;
    SELECT id INTO v_globalservices_tenant_id FROM tenants WHERE slug = 'globalservices' LIMIT 1;

    IF v_acme_tenant_id IS NULL THEN
        RETURN;
    END IF;

    -- ==========================================================================
    -- RGPD Requests for ACME tenant
    -- ==========================================================================

    SELECT id INTO v_user_id FROM users WHERE tenant_id = v_acme_tenant_id LIMIT 1;

    -- Completed export requests
    INSERT INTO rgpd_requests (tenant_id, user_id, type, status, created_at, completed_at)
    VALUES
        (v_acme_tenant_id, v_user_id, 'EXPORT', 'COMPLETED', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days'),
        (v_acme_tenant_id, v_user_id, 'EXPORT', 'COMPLETED', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days')
    ON CONFLICT DO NOTHING;

    -- Pending export request
    INSERT INTO rgpd_requests (tenant_id, user_id, type, status, created_at)
    VALUES (v_acme_tenant_id, v_user_id, 'EXPORT', 'PENDING', NOW() - INTERVAL '2 days')
    ON CONFLICT DO NOTHING;

    -- Completed deletion request
    INSERT INTO rgpd_requests (tenant_id, user_id, type, status, created_at, completed_at, scheduled_purge_at)
    VALUES (v_acme_tenant_id, v_user_id, 'DELETE', 'COMPLETED', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days', NOW() - INTERVAL '14 days')
    ON CONFLICT DO NOTHING;

    -- ==========================================================================
    -- RGPD Requests for TechCorp tenant
    -- ==========================================================================

    SELECT id INTO v_user_id FROM users WHERE tenant_id = v_techcorp_tenant_id LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Pending deletion request (in progress)
        INSERT INTO rgpd_requests (tenant_id, user_id, type, status, created_at, scheduled_purge_at)
        VALUES (v_techcorp_tenant_id, v_user_id, 'DELETE', 'PENDING', NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days')
        ON CONFLICT DO NOTHING;

        -- Completed export
        INSERT INTO rgpd_requests (tenant_id, user_id, type, status, created_at, completed_at)
        VALUES (v_techcorp_tenant_id, v_user_id, 'EXPORT', 'COMPLETED', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days')
        ON CONFLICT DO NOTHING;
    END IF;

    -- ==========================================================================
    -- RGPD Requests for GlobalServices tenant
    -- ==========================================================================

    SELECT id INTO v_user_id FROM users WHERE tenant_id = v_globalservices_tenant_id LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Multiple completed exports
        INSERT INTO rgpd_requests (tenant_id, user_id, type, status, created_at, completed_at)
        VALUES
            (v_globalservices_tenant_id, v_user_id, 'EXPORT', 'COMPLETED', NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days'),
            (v_globalservices_tenant_id, v_user_id, 'EXPORT', 'COMPLETED', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days')
        ON CONFLICT DO NOTHING;
    END IF;

END $$;

-- =============================================================================
-- AUDIT_EVENTS - Evenements d'audit pour activity feed (P1 data)
-- =============================================================================
-- Types: user.created, user.updated, user.suspended, user.reactivated,
--        consent.granted, consent.revoked, ai.invoked, ai.completed, ai.failed,
--        rgpd.export.requested, rgpd.export.completed, rgpd.delete.requested, rgpd.delete.completed

DO $$
DECLARE
    v_acme_tenant_id UUID;
    v_techcorp_tenant_id UUID;
    v_globalservices_tenant_id UUID;
    v_admin_user_id UUID;
    v_user_id UUID;
    v_user_ids UUID[];
BEGIN
    -- Get tenant IDs
    SELECT id INTO v_acme_tenant_id FROM tenants WHERE slug = 'acme' LIMIT 1;
    SELECT id INTO v_techcorp_tenant_id FROM tenants WHERE slug = 'techcorp' LIMIT 1;
    SELECT id INTO v_globalservices_tenant_id FROM tenants WHERE slug = 'globalservices' LIMIT 1;

    IF v_acme_tenant_id IS NULL THEN
        RETURN;
    END IF;

    -- Get admin user for ACME
    SELECT id INTO v_admin_user_id FROM users WHERE tenant_id = v_acme_tenant_id AND role = 'TENANT_ADMIN' LIMIT 1;
    SELECT ARRAY_AGG(id) INTO v_user_ids FROM users WHERE tenant_id = v_acme_tenant_id LIMIT 5;

    IF v_admin_user_id IS NULL OR v_user_ids IS NULL THEN
        RETURN;
    END IF;

    -- ==========================================================================
    -- Audit events for ACME tenant (last 30 days)
    -- ==========================================================================

    -- User events
    INSERT INTO audit_events (tenant_id, event_type, actor_id, target_id, created_at)
    VALUES
        (v_acme_tenant_id, 'user.created', v_admin_user_id, v_user_ids[1], NOW() - INTERVAL '28 days'),
        (v_acme_tenant_id, 'user.created', v_admin_user_id, v_user_ids[2], NOW() - INTERVAL '25 days'),
        (v_acme_tenant_id, 'user.updated', v_admin_user_id, v_user_ids[1], NOW() - INTERVAL '20 days'),
        (v_acme_tenant_id, 'user.suspended', v_admin_user_id, v_user_ids[3], NOW() - INTERVAL '15 days'),
        (v_acme_tenant_id, 'user.reactivated', v_admin_user_id, v_user_ids[3], NOW() - INTERVAL '10 days')
    ON CONFLICT DO NOTHING;

    -- Consent events
    INSERT INTO audit_events (tenant_id, event_type, actor_id, target_id, created_at)
    VALUES
        (v_acme_tenant_id, 'consent.granted', v_user_ids[1], v_user_ids[1], NOW() - INTERVAL '27 days'),
        (v_acme_tenant_id, 'consent.granted', v_user_ids[2], v_user_ids[2], NOW() - INTERVAL '24 days'),
        (v_acme_tenant_id, 'consent.revoked', v_user_ids[1], v_user_ids[1], NOW() - INTERVAL '5 days'),
        (v_acme_tenant_id, 'consent.granted', v_user_ids[3], v_user_ids[3], NOW() - INTERVAL '3 days')
    ON CONFLICT DO NOTHING;

    -- AI events
    INSERT INTO audit_events (tenant_id, event_type, actor_id, target_id, created_at)
    VALUES
        (v_acme_tenant_id, 'ai.invoked', v_user_ids[1], NULL, NOW() - INTERVAL '5 days'),
        (v_acme_tenant_id, 'ai.completed', v_user_ids[1], NULL, NOW() - INTERVAL '5 days' + INTERVAL '3 minutes'),
        (v_acme_tenant_id, 'ai.invoked', v_user_ids[2], NULL, NOW() - INTERVAL '4 days'),
        (v_acme_tenant_id, 'ai.completed', v_user_ids[2], NULL, NOW() - INTERVAL '4 days' + INTERVAL '2 minutes'),
        (v_acme_tenant_id, 'ai.invoked', v_user_ids[1], NULL, NOW() - INTERVAL '6 days'),
        (v_acme_tenant_id, 'ai.failed', v_user_ids[1], NULL, NOW() - INTERVAL '6 days' + INTERVAL '30 seconds'),
        (v_acme_tenant_id, 'ai.invoked', v_user_ids[3], NULL, NOW() - INTERVAL '1 day'),
        (v_acme_tenant_id, 'ai.completed', v_user_ids[3], NULL, NOW() - INTERVAL '1 day' + INTERVAL '2 minutes')
    ON CONFLICT DO NOTHING;

    -- RGPD events
    INSERT INTO audit_events (tenant_id, event_type, actor_id, target_id, created_at)
    VALUES
        (v_acme_tenant_id, 'rgpd.export.requested', v_user_ids[1], v_user_ids[1], NOW() - INTERVAL '30 days'),
        (v_acme_tenant_id, 'rgpd.export.completed', v_admin_user_id, v_user_ids[1], NOW() - INTERVAL '29 days'),
        (v_acme_tenant_id, 'rgpd.export.requested', v_user_ids[2], v_user_ids[2], NOW() - INTERVAL '15 days'),
        (v_acme_tenant_id, 'rgpd.export.completed', v_admin_user_id, v_user_ids[2], NOW() - INTERVAL '14 days'),
        (v_acme_tenant_id, 'rgpd.export.requested', v_user_ids[1], v_user_ids[1], NOW() - INTERVAL '2 days'),
        (v_acme_tenant_id, 'rgpd.delete.requested', v_user_ids[4], v_user_ids[4], NOW() - INTERVAL '45 days'),
        (v_acme_tenant_id, 'rgpd.delete.completed', v_admin_user_id, v_user_ids[4], NOW() - INTERVAL '44 days')
    ON CONFLICT DO NOTHING;

    -- ==========================================================================
    -- Audit events for TechCorp tenant
    -- ==========================================================================

    SELECT id INTO v_admin_user_id FROM users WHERE tenant_id = v_techcorp_tenant_id AND role = 'TENANT_ADMIN' LIMIT 1;
    SELECT ARRAY_AGG(id) INTO v_user_ids FROM users WHERE tenant_id = v_techcorp_tenant_id LIMIT 5;

    IF v_admin_user_id IS NOT NULL AND v_user_ids IS NOT NULL THEN
        INSERT INTO audit_events (tenant_id, event_type, actor_id, target_id, created_at)
        VALUES
            (v_techcorp_tenant_id, 'user.created', v_admin_user_id, v_user_ids[1], NOW() - INTERVAL '20 days'),
            (v_techcorp_tenant_id, 'consent.granted', v_user_ids[1], v_user_ids[1], NOW() - INTERVAL '15 days'),
            (v_techcorp_tenant_id, 'ai.invoked', v_user_ids[1], NULL, NOW() - INTERVAL '7 days'),
            (v_techcorp_tenant_id, 'ai.completed', v_user_ids[1], NULL, NOW() - INTERVAL '7 days' + INTERVAL '5 minutes'),
            (v_techcorp_tenant_id, 'rgpd.export.requested', v_user_ids[1], v_user_ids[1], NOW() - INTERVAL '20 days'),
            (v_techcorp_tenant_id, 'rgpd.export.completed', v_admin_user_id, v_user_ids[1], NOW() - INTERVAL '19 days'),
            (v_techcorp_tenant_id, 'rgpd.delete.requested', v_user_ids[1], v_user_ids[1], NOW() - INTERVAL '3 days')
        ON CONFLICT DO NOTHING;
    END IF;

    -- ==========================================================================
    -- Audit events for GlobalServices tenant
    -- ==========================================================================

    SELECT id INTO v_admin_user_id FROM users WHERE tenant_id = v_globalservices_tenant_id AND role = 'TENANT_ADMIN' LIMIT 1;
    SELECT ARRAY_AGG(id) INTO v_user_ids FROM users WHERE tenant_id = v_globalservices_tenant_id LIMIT 5;

    IF v_admin_user_id IS NOT NULL AND v_user_ids IS NOT NULL THEN
        INSERT INTO audit_events (tenant_id, event_type, actor_id, target_id, created_at)
        VALUES
            (v_globalservices_tenant_id, 'user.created', v_admin_user_id, v_user_ids[1], NOW() - INTERVAL '50 days'),
            (v_globalservices_tenant_id, 'consent.granted', v_user_ids[1], v_user_ids[1], NOW() - INTERVAL '45 days'),
            (v_globalservices_tenant_id, 'consent.granted', v_user_ids[1], v_user_ids[1], NOW() - INTERVAL '40 days'),
            (v_globalservices_tenant_id, 'ai.invoked', v_user_ids[1], NULL, NOW() - INTERVAL '10 days'),
            (v_globalservices_tenant_id, 'ai.completed', v_user_ids[1], NULL, NOW() - INTERVAL '10 days' + INTERVAL '2 minutes'),
            (v_globalservices_tenant_id, 'ai.invoked', v_user_ids[1], NULL, NOW() - INTERVAL '2 days'),
            (v_globalservices_tenant_id, 'ai.failed', v_user_ids[1], NULL, NOW() - INTERVAL '2 days' + INTERVAL '20 seconds'),
            (v_globalservices_tenant_id, 'rgpd.export.requested', v_user_ids[1], v_user_ids[1], NOW() - INTERVAL '60 days'),
            (v_globalservices_tenant_id, 'rgpd.export.completed', v_admin_user_id, v_user_ids[1], NOW() - INTERVAL '59 days')
        ON CONFLICT DO NOTHING;
    END IF;

END $$;

COMMIT;

-- =============================================================================
-- Verification (optionnel)
-- =============================================================================

SELECT 'consents' as table_name, COUNT(*) as count FROM consents
UNION ALL
SELECT 'ai_jobs', COUNT(*) FROM ai_jobs
UNION ALL
SELECT 'rgpd_requests', COUNT(*) FROM rgpd_requests
UNION ALL
SELECT 'audit_events', COUNT(*) FROM audit_events;
