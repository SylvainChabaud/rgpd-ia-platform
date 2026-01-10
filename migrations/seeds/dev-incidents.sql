-- =============================================================================
-- SEED: Violations RGPD de simulation (Environnement de développement)
-- =============================================================================
--
-- Ce fichier contient des violations de sécurité types pour peupler
-- le registre des violations RGPD (Art. 33.5) en développement.
--
-- Usage:
--   - Utilisé par setup-dev.bat (développement manuel)
--   - Utilisé par seed-test-data.ts (tests E2E)
--
-- IMPORTANT: Ces données sont UNIQUEMENT pour développement/test.
-- Ne JAMAIS exécuter en production.
--
-- =============================================================================

BEGIN;

-- Nettoyer les violations existantes (dev uniquement)
TRUNCATE TABLE incident_audit_log CASCADE;
TRUNCATE TABLE security_incidents CASCADE;

-- Insérer 10 violations types couvrant différents scénarios
INSERT INTO security_incidents (
    tenant_id,
    severity,
    type,
    title,
    description,
    data_categories,
    users_affected,
    records_affected,
    risk_level,
    cnil_notified,
    cnil_notified_at,
    cnil_reference,
    users_notified,
    users_notified_at,
    remediation_actions,
    resolved_at,
    detected_at,
    detected_by,
    source_ip
) VALUES

-- =============================================================================
-- 1. CRITIQUE - Violation isolation tenant (risque HIGH, notifiée CNIL + users)
-- =============================================================================
(
    (SELECT id FROM tenants WHERE slug = 'techcorp' LIMIT 1),
    'CRITICAL',
    'CROSS_TENANT_ACCESS',
    'Violation isolation tenant - Accès aux données d''un autre tenant',
    'Un utilisateur du tenant ACME a pu accéder temporairement aux données du tenant TechCorp suite à une défaillance du système RLS. 247 enregistrements de données personnelles ont été exposés, incluant des données de santé.',
    ARRAY['P2', 'P3'],
    247,
    247,
    'HIGH',
    true,
    NOW() - INTERVAL '15 days',
    'CNIL-2025-12345',
    true,
    NOW() - INTERVAL '14 days',
    'Correctif RLS appliqué immédiatement. Audit complet de sécurité réalisé. Notification CNIL et utilisateurs effectuée. Processus de revue de code renforcé.',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '16 days',
    'MONITORING',
    '192.168.1.45'
),

-- =============================================================================
-- 2. HAUTE - Fuite de données par export massif
-- =============================================================================
(
    (SELECT id FROM tenants WHERE slug = 'acme' LIMIT 1),
    'HIGH',
    'DATA_LEAK',
    'Export massif non autorisé de données clients',
    'Un compte administrateur compromis a exporté 1500 fiches clients contenant nom, prénom, email, téléphone et historique d''achats. L''export a été détecté par le système de monitoring après 45 minutes.',
    ARRAY['P1', 'P2'],
    1500,
    1500,
    'HIGH',
    true,
    NOW() - INTERVAL '30 days',
    'CNIL-2025-11892',
    true,
    NOW() - INTERVAL '29 days',
    'Compte administrateur désactivé. Mots de passe réinitialisés. MFA activé pour tous les comptes admin. Formation sécurité renforcée.',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '31 days',
    'MONITORING',
    '10.0.0.87'
),

-- =============================================================================
-- 3. MOYENNE - PII détectée dans les logs
-- =============================================================================
(
    (SELECT id FROM tenants WHERE slug = 'globalservices' LIMIT 1),
    'MEDIUM',
    'PII_IN_LOGS',
    'Données personnelles loggées en clair',
    'Le système a détecté des adresses email et numéros de téléphone loggés en clair dans les fichiers de logs applicatifs sur une période de 7 jours. 89 utilisateurs concernés.',
    ARRAY['P1'],
    89,
    89,
    'MEDIUM',
    false,
    NULL,
    NULL,
    false,
    NULL,
    'Purge immédiate des logs concernés. Mise à jour du système de logging pour masquer automatiquement les PII. Revue de code pour identifier les sources.',
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '8 days',
    'AUDIT',
    NULL
),

-- =============================================================================
-- 4. HAUTE - Tentative d'accès non autorisé (brute force)
-- =============================================================================
(
    (SELECT id FROM tenants WHERE slug = 'techcorp' LIMIT 1),
    'HIGH',
    'UNAUTHORIZED_ACCESS',
    'Attaque par force brute sur comptes administrateurs',
    'Détection de 5000 tentatives de connexion échouées sur plusieurs comptes administrateurs depuis une IP externe. Le système de rate-limiting a bloqué l''attaquant après 100 tentatives.',
    ARRAY['P0'],
    12,
    0,
    'LOW',
    false,
    NULL,
    NULL,
    false,
    NULL,
    'IP source blacklistée. Comptes administrateurs concernés sécurisés avec MFA obligatoire. Politique de mots de passe renforcée.',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '3 days',
    'SYSTEM',
    '45.76.123.89'
),

-- =============================================================================
-- 5. CRITIQUE - Perte de données (backup failure)
-- =============================================================================
(
    (SELECT id FROM tenants WHERE slug = 'acme' LIMIT 1),
    'CRITICAL',
    'DATA_LOSS',
    'Échec de sauvegarde et perte partielle de données',
    'Suite à une défaillance matérielle, les sauvegardes des 48 dernières heures ont échoué. Une perte de données affectant 320 enregistrements de clients (transactions récentes) a été constatée.',
    ARRAY['P1', 'P2'],
    320,
    320,
    'MEDIUM',
    true,
    NOW() - INTERVAL '20 days',
    'CNIL-2025-12001',
    false,
    NULL,
    'Infrastructure de sauvegarde redondante mise en place. Procédure de monitoring 24/7 activée. Recovery plan testé et validé.',
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '22 days',
    'SYSTEM',
    NULL
),

-- =============================================================================
-- 6. BASSE - Indisponibilité service courte durée
-- =============================================================================
(
    (SELECT id FROM tenants WHERE slug = 'globalservices' LIMIT 1),
    'LOW',
    'SERVICE_UNAVAILABLE',
    'Indisponibilité temporaire du service RGPD',
    'Le portail de gestion des demandes RGPD a été indisponible pendant 3h15 suite à une mise à jour défaillante. Aucune donnée compromise mais impact sur l''exercice des droits utilisateurs.',
    ARRAY['P0'],
    0,
    0,
    'NONE',
    false,
    NULL,
    NULL,
    false,
    NULL,
    'Rollback immédiat effectué. Procédure de déploiement améliorée avec tests de non-régression renforcés.',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '2 days',
    'MONITORING',
    NULL
),

-- =============================================================================
-- 7. MOYENNE - Vulnérabilité exploitée (SQL injection tentée)
-- =============================================================================
(
    (SELECT id FROM tenants WHERE slug = 'techcorp' LIMIT 1),
    'MEDIUM',
    'VULNERABILITY_EXPLOITED',
    'Tentative d''injection SQL détectée et bloquée',
    'Le WAF a détecté et bloqué 23 tentatives d''injection SQL ciblant l''endpoint de recherche utilisateurs. Aucune donnée exposée grâce à l''utilisation de requêtes paramétrées.',
    ARRAY['P0'],
    0,
    0,
    'NONE',
    false,
    NULL,
    NULL,
    false,
    NULL,
    'Audit de sécurité complet réalisé. WAF rules renforcées. Pentest externe planifié.',
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '13 days',
    'SYSTEM',
    '198.51.100.42'
),

-- =============================================================================
-- 8. MOYENNE - Incident non résolu (investigation en cours)
-- =============================================================================
(
    (SELECT id FROM tenants WHERE slug = 'acme' LIMIT 1),
    'MEDIUM',
    'UNAUTHORIZED_ACCESS',
    'Compte utilisateur compromis - Investigation en cours',
    'Un compte utilisateur présente une activité anormale (connexions depuis 3 pays différents en 2 heures). Le compte a été temporairement suspendu en attente d''investigation.',
    ARRAY['P0', 'P1'],
    1,
    0,
    'UNKNOWN',
    false,
    NULL,
    NULL,
    false,
    NULL,
    'Compte suspendu. Investigation en cours avec l''utilisateur concerné. Analyse des logs d''accès.',
    NULL, -- Non résolu
    NOW() - INTERVAL '6 hours',
    'MONITORING',
    '203.0.113.15'
),

-- =============================================================================
-- 9. HAUTE - Non notifiée CNIL (délai 72h dépassé - ALERTE)
-- =============================================================================
(
    (SELECT id FROM tenants WHERE slug = 'globalservices' LIMIT 1),
    'HIGH',
    'DATA_LEAK',
    'Exposition accidentelle de données via API publique',
    'Une mauvaise configuration de l''API a exposé publiquement 450 profils utilisateurs (nom, email, date de naissance) pendant 18 heures avant détection. Risque élevé identifié mais délai CNIL de 72h dépassé.',
    ARRAY['P1', 'P2'],
    450,
    450,
    'HIGH',
    false, -- Non notifiée CNIL malgré risque HIGH
    NULL,
    NULL,
    false,
    NULL,
    'API sécurisée immédiatement. Audit de toutes les configurations d''accès réalisé. Procédure CNIL en cours de préparation (retard justifié par découverte tardive).',
    NULL, -- Non résolu
    NOW() - INTERVAL '96 hours', -- Il y a 4 jours (délai dépassé)
    'USER',
    NULL
),

-- =============================================================================
-- 10. BASSE - Incident platform-wide (infrastructure)
-- =============================================================================
(
    NULL, -- tenant_id NULL = incident plateforme
    'LOW',
    'OTHER',
    'Mise à jour de sécurité non appliquée dans les délais',
    'Patch de sécurité critique pour une dépendance tierce non appliqué dans le délai recommandé de 48h. Aucune exploitation détectée mais risque potentiel identifié.',
    ARRAY['P0'],
    0,
    0,
    'LOW',
    false,
    NULL,
    NULL,
    false,
    NULL,
    'Patch appliqué avec 72h de retard. Processus de veille sécurité automatisé mis en place.',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '10 days',
    'AUDIT',
    NULL
);

COMMIT;

-- =============================================================================
-- Affichage du résultat (optionnel, pour vérification)
-- =============================================================================

SELECT
    COUNT(*) as total_incidents,
    COUNT(*) FILTER (WHERE resolved_at IS NULL) as non_resolus,
    COUNT(*) FILTER (WHERE cnil_notified = true) as notifies_cnil,
    COUNT(*) FILTER (WHERE risk_level = 'HIGH' AND cnil_notified = false) as alertes_cnil
FROM security_incidents;
