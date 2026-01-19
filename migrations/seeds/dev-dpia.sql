-- =============================================================================
-- SEED: DPIA (Data Protection Impact Assessment) - LOT 12.4
-- =============================================================================
--
-- Ce fichier contient des donnees de demonstration pour LOT 12.4:
-- - dpias: analyses d'impact pour les purposes a risque eleve
-- - dpia_risks: risques identifies pour chaque DPIA
--
-- Usage:
--   - Utilise par setup-dev.bat (developpement manuel)
--   - Optionnel: donnees de simulation pour tester l'UI DPO
--
-- IMPORTANT: Ces donnees sont UNIQUEMENT pour developpement/test.
-- Ne JAMAIS executer en production.
--
-- RGPD Compliance:
-- - Art. 35: DPIA required for HIGH/CRITICAL risk processing
-- - Art. 38.3: DPO validates/rejects DPIAs
--
-- =============================================================================

BEGIN;

DO $$
DECLARE
    v_acme_tenant_id UUID;
    v_techcorp_tenant_id UUID;
    v_purpose_id_1 UUID;
    v_purpose_id_2 UUID;
    v_purpose_id_3 UUID;
    v_purpose_id_4 UUID;
    v_dpia_id_1 UUID;
    v_dpia_id_2 UUID;
    v_dpia_id_3 UUID;
    v_dpia_id_4 UUID;
BEGIN
    -- Get tenant IDs
    SELECT id INTO v_acme_tenant_id FROM tenants WHERE slug = 'acme' LIMIT 1;
    SELECT id INTO v_techcorp_tenant_id FROM tenants WHERE slug = 'techcorp' LIMIT 1;

    -- Skip if tenants don't exist
    IF v_acme_tenant_id IS NULL THEN
        RAISE NOTICE 'Tenant acme not found, skipping DPIA seed';
        RETURN;
    END IF;

    -- Get purposes for ACME (need purposes that require DPIA)
    -- First, let's create HIGH/CRITICAL risk purposes for DPIA demonstration

    -- Create a HIGH risk purpose for DPIA demo (if not exists)
    INSERT INTO purposes (id, tenant_id, label, description, is_required, is_active,
                          lawful_basis, category, risk_level, max_data_class, requires_dpia,
                          is_from_template, validation_status, created_at)
    VALUES
        (gen_random_uuid(), v_acme_tenant_id,
         'Profilage comportemental IA',
         'Analyse comportementale des utilisateurs pour personnalisation des services. Traitement a risque eleve necessite une DPIA Art. 35.',
         false, true,
         'CONSENT', 'AI_PROCESSING', 'HIGH', 'P2', true,
         false, 'VALIDATED', NOW() - INTERVAL '30 days')
    ON CONFLICT DO NOTHING;

    INSERT INTO purposes (id, tenant_id, label, description, is_required, is_active,
                          lawful_basis, category, risk_level, max_data_class, requires_dpia,
                          is_from_template, validation_status, created_at)
    VALUES
        (gen_random_uuid(), v_acme_tenant_id,
         'Scoring predictif RH',
         'Evaluation predictive des candidats et employes par IA. Risque critique - decision automatisee Art. 22.',
         false, false,
         'CONSENT', 'AI_PROCESSING', 'CRITICAL', 'P2', true,
         false, 'PENDING', NOW() - INTERVAL '15 days')
    ON CONFLICT DO NOTHING;

    INSERT INTO purposes (id, tenant_id, label, description, is_required, is_active,
                          lawful_basis, category, risk_level, max_data_class, requires_dpia,
                          is_from_template, validation_status, created_at)
    VALUES
        (gen_random_uuid(), v_acme_tenant_id,
         'Detection fraude IA',
         'Detection automatique de fraudes par analyse de patterns comportementaux. Risque eleve.',
         false, true,
         'LEGITIMATE_INTEREST', 'AI_PROCESSING', 'HIGH', 'P2', true,
         false, 'VALIDATED', NOW() - INTERVAL '45 days')
    ON CONFLICT DO NOTHING;

    -- Get the purpose IDs we just created
    SELECT id INTO v_purpose_id_1 FROM purposes
    WHERE tenant_id = v_acme_tenant_id AND label = 'Profilage comportemental IA' LIMIT 1;

    SELECT id INTO v_purpose_id_2 FROM purposes
    WHERE tenant_id = v_acme_tenant_id AND label = 'Scoring predictif RH' LIMIT 1;

    SELECT id INTO v_purpose_id_3 FROM purposes
    WHERE tenant_id = v_acme_tenant_id AND label = 'Detection fraude IA' LIMIT 1;

    -- Get an existing purpose for a rejected DPIA demo
    SELECT id INTO v_purpose_id_4 FROM purposes
    WHERE tenant_id = v_acme_tenant_id AND label = 'Analyse de sentiments' LIMIT 1;

    -- ==========================================================================
    -- DPIA 1: APPROVED - Profilage comportemental (HIGH risk)
    -- ==========================================================================
    IF v_purpose_id_1 IS NOT NULL THEN
        v_dpia_id_1 := gen_random_uuid();

        INSERT INTO dpias (id, tenant_id, purpose_id, title, description,
                           overall_risk_level, data_processed, data_classification,
                           security_measures, status, dpo_comments, validated_at,
                           created_at, updated_at)
        VALUES (
            v_dpia_id_1,
            v_acme_tenant_id,
            v_purpose_id_1,
            'DPIA - Profilage comportemental utilisateurs',
            'Analyse d''impact pour le traitement de profilage comportemental des utilisateurs de la plateforme. Ce traitement analyse les patterns d''utilisation pour personnaliser l''experience.',
            'HIGH',
            ARRAY['Historique navigation', 'Temps de session', 'Actions utilisateur', 'Preferences'],
            'P2',
            ARRAY['Chiffrement AES-256', 'Anonymisation des IDs', 'Retention 12 mois', 'Access logs'],
            'APPROVED',
            'DPIA approuvee apres revue des mesures de securite. Recommandation: audit trimestriel.',
            NOW() - INTERVAL '20 days',
            NOW() - INTERVAL '30 days',
            NOW() - INTERVAL '20 days'
        )
        ON CONFLICT DO NOTHING;

        -- Add risks for DPIA 1
        INSERT INTO dpia_risks (id, dpia_id, tenant_id, risk_name, description,
                                likelihood, impact, mitigation, sort_order, created_at)
        VALUES
            (gen_random_uuid(), v_dpia_id_1, v_acme_tenant_id,
             'Fuite de donnees comportementales',
             'Les donnees de profilage pourraient etre exposees en cas de breach.',
             'MEDIUM', 'HIGH',
             'Chiffrement au repos et en transit. Segmentation reseau. Monitoring continu.',
             1, NOW() - INTERVAL '30 days'),
            (gen_random_uuid(), v_dpia_id_1, v_acme_tenant_id,
             'Discrimination algorithmique',
             'Le modele pourrait creer des biais discriminatoires.',
             'LOW', 'HIGH',
             'Audit mensuel des predictions. Tests de biais. Comite ethique.',
             2, NOW() - INTERVAL '30 days'),
            (gen_random_uuid(), v_dpia_id_1, v_acme_tenant_id,
             'Non-conformite retention',
             'Conservation des donnees au-dela du necessaire.',
             'LOW', 'MEDIUM',
             'Politique de retention automatisee. Purge a 12 mois. Logs d''audit.',
             3, NOW() - INTERVAL '30 days')
        ON CONFLICT DO NOTHING;
    END IF;

    -- ==========================================================================
    -- DPIA 2: PENDING - Scoring predictif RH (CRITICAL risk)
    -- ==========================================================================
    IF v_purpose_id_2 IS NOT NULL THEN
        v_dpia_id_2 := gen_random_uuid();

        INSERT INTO dpias (id, tenant_id, purpose_id, title, description,
                           overall_risk_level, data_processed, data_classification,
                           security_measures, status,
                           created_at, updated_at)
        VALUES (
            v_dpia_id_2,
            v_acme_tenant_id,
            v_purpose_id_2,
            'DPIA - Scoring predictif RH',
            'Analyse d''impact pour l''evaluation predictive des candidats et employes. Ce traitement implique une decision automatisee (Art. 22) avec impact significatif sur les personnes concernees.',
            'CRITICAL',
            ARRAY['CV', 'Historique professionnel', 'Evaluations', 'Tests psychometriques', 'Entretiens'],
            'P2',
            ARRAY['Chiffrement E2E', 'Acces restreint RH', 'Droit opposition', 'Intervention humaine'],
            'PENDING',
            NOW() - INTERVAL '15 days',
            NOW() - INTERVAL '15 days'
        )
        ON CONFLICT DO NOTHING;

        -- Add risks for DPIA 2 (CRITICAL)
        INSERT INTO dpia_risks (id, dpia_id, tenant_id, risk_name, description,
                                likelihood, impact, mitigation, sort_order, created_at)
        VALUES
            (gen_random_uuid(), v_dpia_id_2, v_acme_tenant_id,
             'Decision automatisee prejudiciable',
             'Le scoring pourrait mener a des decisions de recrutement/licenciement injustes.',
             'MEDIUM', 'HIGH',
             'Intervention humaine obligatoire. Droit a explication. Contestation possible.',
             1, NOW() - INTERVAL '15 days'),
            (gen_random_uuid(), v_dpia_id_2, v_acme_tenant_id,
             'Biais discriminatoires systemiques',
             'Le modele pourrait perpetuer des discriminations (age, genre, origine).',
             'HIGH', 'HIGH',
             'Audit externe annuel. Tests de biais multi-criteres. Formation equipe RH.',
             2, NOW() - INTERVAL '15 days'),
            (gen_random_uuid(), v_dpia_id_2, v_acme_tenant_id,
             'Acces non autorise aux scores',
             'Les scores pourraient etre consultes par des personnes non habilitees.',
             'LOW', 'HIGH',
             'RBAC strict. Logs acces. Principe du moindre privilege.',
             3, NOW() - INTERVAL '15 days'),
            (gen_random_uuid(), v_dpia_id_2, v_acme_tenant_id,
             'Non-conformite Art. 22',
             'Le traitement pourrait ne pas respecter les garanties de l''Art. 22 RGPD.',
             'MEDIUM', 'HIGH',
             'Consentement explicite. Droit opposition. Intervention humaine garantie.',
             4, NOW() - INTERVAL '15 days')
        ON CONFLICT DO NOTHING;
    END IF;

    -- ==========================================================================
    -- DPIA 3: APPROVED - Detection fraude (HIGH risk)
    -- ==========================================================================
    IF v_purpose_id_3 IS NOT NULL THEN
        v_dpia_id_3 := gen_random_uuid();

        INSERT INTO dpias (id, tenant_id, purpose_id, title, description,
                           overall_risk_level, data_processed, data_classification,
                           security_measures, status, dpo_comments, validated_at,
                           created_at, updated_at)
        VALUES (
            v_dpia_id_3,
            v_acme_tenant_id,
            v_purpose_id_3,
            'DPIA - Detection fraude transactionnelle',
            'Analyse d''impact pour la detection automatique de fraudes sur les transactions. Le traitement analyse les patterns comportementaux pour identifier les anomalies.',
            'HIGH',
            ARRAY['Transactions', 'Geolocalisation', 'Device fingerprint', 'Historique comportemental'],
            'P2',
            ARRAY['Chiffrement TLS 1.3', 'Tokenisation', 'Retention 24 mois (legal)', 'SOC monitoring'],
            'APPROVED',
            'Approuve pour interet legitime de prevention fraude. Mesures adequates. Revoir dans 12 mois.',
            NOW() - INTERVAL '40 days',
            NOW() - INTERVAL '45 days',
            NOW() - INTERVAL '40 days'
        )
        ON CONFLICT DO NOTHING;

        -- Add risks for DPIA 3
        INSERT INTO dpia_risks (id, dpia_id, tenant_id, risk_name, description,
                                likelihood, impact, mitigation, sort_order, created_at)
        VALUES
            (gen_random_uuid(), v_dpia_id_3, v_acme_tenant_id,
             'Faux positifs bloquants',
             'Des transactions legitimes pourraient etre bloquees a tort.',
             'MEDIUM', 'MEDIUM',
             'Seuils calibres. Processus de deblocage rapide. Support 24/7.',
             1, NOW() - INTERVAL '45 days'),
            (gen_random_uuid(), v_dpia_id_3, v_acme_tenant_id,
             'Surveillance excessive',
             'Le monitoring pourrait etre percu comme une surveillance disproportionnee.',
             'LOW', 'MEDIUM',
             'Information claire des utilisateurs. Limitation aux transactions uniquement.',
             2, NOW() - INTERVAL '45 days')
        ON CONFLICT DO NOTHING;
    END IF;

    -- ==========================================================================
    -- DPIA 4: REJECTED - Analyse sentiments (demo rejet)
    -- ==========================================================================
    IF v_purpose_id_4 IS NOT NULL THEN
        v_dpia_id_4 := gen_random_uuid();

        INSERT INTO dpias (id, tenant_id, purpose_id, title, description,
                           overall_risk_level, data_processed, data_classification,
                           security_measures, status, rejection_reason, validated_at,
                           created_at, updated_at)
        VALUES (
            v_dpia_id_4,
            v_acme_tenant_id,
            v_purpose_id_4,
            'DPIA - Analyse sentiments communications',
            'Analyse d''impact pour l''analyse automatique du sentiment dans les communications clients.',
            'MEDIUM',
            ARRAY['Emails clients', 'Messages chat', 'Appels transcrits'],
            'P2',
            ARRAY['Chiffrement standard'],
            'REJECTED',
            'REJETEE: Mesures de securite insuffisantes pour donnees P2. Base legale "interet legitime" non justifiee pour analyse de contenu de communications. Recommandation: obtenir consentement explicite et renforcer les mesures techniques.',
            NOW() - INTERVAL '10 days',
            NOW() - INTERVAL '25 days',
            NOW() - INTERVAL '10 days'
        )
        ON CONFLICT DO NOTHING;

        -- Add risks for DPIA 4 (rejected)
        INSERT INTO dpia_risks (id, dpia_id, tenant_id, risk_name, description,
                                likelihood, impact, mitigation, sort_order, created_at)
        VALUES
            (gen_random_uuid(), v_dpia_id_4, v_acme_tenant_id,
             'Atteinte vie privee',
             'L''analyse du contenu des communications est intrusive.',
             'HIGH', 'HIGH',
             '[INSUFFISANT] Mesures proposees non adequates.',
             1, NOW() - INTERVAL '25 days'),
            (gen_random_uuid(), v_dpia_id_4, v_acme_tenant_id,
             'Base legale contestable',
             'L''interet legitime n''est pas suffisant pour ce type de traitement.',
             'HIGH', 'MEDIUM',
             '[A REVOIR] Consentement explicite requis.',
             2, NOW() - INTERVAL '25 days')
        ON CONFLICT DO NOTHING;
    END IF;

    -- ==========================================================================
    -- TechCorp DPIA (if tenant exists)
    -- ==========================================================================
    IF v_techcorp_tenant_id IS NOT NULL THEN
        -- Create a purpose for TechCorp DPIA
        INSERT INTO purposes (id, tenant_id, label, description, is_required, is_active,
                              lawful_basis, category, risk_level, max_data_class, requires_dpia,
                              is_from_template, validation_status, created_at)
        VALUES
            (gen_random_uuid(), v_techcorp_tenant_id,
             'Reconnaissance faciale securite',
             'Systeme de reconnaissance faciale pour controle d''acces aux locaux. Risque critique - donnees biometriques.',
             false, false,
             'CONSENT', 'SECURITY', 'CRITICAL', 'P2', true,
             false, 'PENDING', NOW() - INTERVAL '5 days')
        ON CONFLICT DO NOTHING;

        -- Get the purpose ID
        SELECT id INTO v_purpose_id_1 FROM purposes
        WHERE tenant_id = v_techcorp_tenant_id AND label = 'Reconnaissance faciale securite' LIMIT 1;

        IF v_purpose_id_1 IS NOT NULL THEN
            v_dpia_id_1 := gen_random_uuid();

            INSERT INTO dpias (id, tenant_id, purpose_id, title, description,
                               overall_risk_level, data_processed, data_classification,
                               security_measures, status,
                               created_at, updated_at)
            VALUES (
                v_dpia_id_1,
                v_techcorp_tenant_id,
                v_purpose_id_1,
                'DPIA - Reconnaissance faciale acces',
                'Analyse d''impact pour le systeme de reconnaissance faciale au niveau des controles d''acces. Traitement de donnees biometriques (Art. 9).',
                'CRITICAL',
                ARRAY['Empreintes faciales', 'Photos badge', 'Logs acces', 'Geolocalisation'],
                'P2',
                ARRAY['Stockage local securise', 'Chiffrement AES-256', 'Acces physique restreint', 'Audit logs'],
                'PENDING',
                NOW() - INTERVAL '5 days',
                NOW() - INTERVAL '5 days'
            )
            ON CONFLICT DO NOTHING;

            -- Add risks
            INSERT INTO dpia_risks (id, dpia_id, tenant_id, risk_name, description,
                                    likelihood, impact, mitigation, sort_order, created_at)
            VALUES
                (gen_random_uuid(), v_dpia_id_1, v_techcorp_tenant_id,
                 'Fuite donnees biometriques',
                 'Les empreintes faciales sont des donnees irreversibles - impact majeur en cas de fuite.',
                 'LOW', 'HIGH',
                 'Stockage local uniquement. Pas de transmission cloud. Chiffrement materiel.',
                 1, NOW() - INTERVAL '5 days'),
                (gen_random_uuid(), v_dpia_id_1, v_techcorp_tenant_id,
                 'Surveillance permanente',
                 'Le systeme pourrait etre detourne pour une surveillance generale.',
                 'MEDIUM', 'HIGH',
                 'Utilisation limitee aux points d''acces. Pas d''enregistrement video continu.',
                 2, NOW() - INTERVAL '5 days')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RAISE NOTICE 'DPIA seed completed successfully';
END $$;

COMMIT;
