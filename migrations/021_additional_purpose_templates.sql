-- 021_additional_purpose_templates.sql
-- LOT 12.2 — Additional Purpose Templates (RGPD-Compliant)
-- EPIC 12 - Back Office Tenant Admin
--
-- Adds comprehensive purpose templates for all categories:
-- - MARKETING: Newsletter, personalization, profiling
-- - ANALYTICS: Performance, A/B testing
-- - ESSENTIAL: Account management, legal compliance
-- - AI_PROCESSING: Sentiment analysis, chatbot, recommendations

BEGIN;

-- =========================
-- MARKETING TEMPLATES (Consent-based)
-- =========================
-- Marketing purposes always require explicit consent (RGPD Art. 6.1.a)

INSERT INTO purpose_templates (
  code, name, description, lawful_basis, category, risk_level,
  default_retention_days, requires_dpia, max_data_class, is_ai_purpose, cnil_reference
) VALUES
(
  'MARKETING_NEWSLETTER',
  'Newsletter et communications marketing',
  'Envoi de newsletters, offres promotionnelles et communications commerciales par email. L''utilisateur peut se desabonner a tout moment via le lien present dans chaque email.',
  'CONSENT', 'MARKETING', 'LOW',
  1095, false, 'P2', false,
  'CNIL - Guide pratique emailing (2020)'
),
(
  'MARKETING_PERSONALIZATION',
  'Personnalisation de l''experience',
  'Adaptation de l''interface et du contenu affiche en fonction des preferences et comportements de l''utilisateur : recommandations, mise en avant de fonctionnalites pertinentes.',
  'CONSENT', 'MARKETING', 'MEDIUM',
  365, false, 'P1', false,
  NULL
),
(
  'MARKETING_PROFILING',
  'Profilage marketing',
  'Analyse des comportements et preferences pour creer des segments d''audience et proposer des contenus cibles. Inclut la creation de profils utilisateurs anonymises.',
  'CONSENT', 'MARKETING', 'HIGH',
  365, true, 'P2', false,
  'RGPD Art. 22 - Decision automatisee et profilage'
),
(
  'MARKETING_RETARGETING',
  'Reciblage publicitaire',
  'Affichage de publicites personnalisees sur des sites tiers bases sur l''historique de navigation et les interactions avec le service.',
  'CONSENT', 'MARKETING', 'HIGH',
  180, true, 'P2', false,
  'CNIL - Deliberation cookies (2020) - Cookies publicitaires'
),

-- =========================
-- ANALYTICS TEMPLATES (Legitimate Interest or Consent)
-- =========================

(
  'ANALYTICS_PERFORMANCE',
  'Mesure de performance technique',
  'Collecte de metriques techniques pour optimiser les performances du service : temps de chargement, erreurs, disponibilite. Donnees agregees sans identification.',
  'LEGITIMATE_INTEREST', 'ANALYTICS', 'LOW',
  90, false, 'P0', false,
  'CNIL - Exemption consentement mesure audience stricte'
),
(
  'ANALYTICS_AB_TESTING',
  'Tests A/B et experimentation',
  'Experimentation de variantes d''interface pour ameliorer l''experience utilisateur. Attribution aleatoire a des groupes de test sans identification personnelle.',
  'LEGITIMATE_INTEREST', 'ANALYTICS', 'LOW',
  90, false, 'P1', false,
  NULL
),
(
  'ANALYTICS_CONVERSION',
  'Suivi des conversions',
  'Mesure de l''efficacite des parcours utilisateurs et des actions marketing : inscriptions, achats, telechargements. Permet d''optimiser les tunnels de conversion.',
  'CONSENT', 'ANALYTICS', 'MEDIUM',
  365, false, 'P1', false,
  NULL
),

-- =========================
-- ESSENTIAL TEMPLATES (Legitimate Interest or Contract)
-- =========================

(
  'ESSENTIAL_ACCOUNT',
  'Gestion du compte utilisateur',
  'Operations essentielles de gestion du compte : authentification, mise a jour du profil, recuperation de mot de passe, preferences de notification.',
  'CONTRACT', 'ESSENTIAL', 'LOW',
  730, false, 'P2', false,
  'RGPD Art. 6.1.b - Execution d''un contrat'
),
(
  'ESSENTIAL_SUPPORT',
  'Support client et assistance',
  'Traitement des demandes d''assistance, tickets de support, historique des interactions avec le service client pour assurer la continuite du service.',
  'CONTRACT', 'ESSENTIAL', 'LOW',
  730, false, 'P2', false,
  NULL
),
(
  'ESSENTIAL_LEGAL',
  'Obligations legales et conformite',
  'Conservation des donnees requises par la loi : factures, preuves de consentement, logs de securite, declarations fiscales. Durees definies par la reglementation applicable.',
  'LEGAL_OBLIGATION', 'ESSENTIAL', 'LOW',
  3650, false, 'P2', false,
  'RGPD Art. 6.1.c - Obligation legale'
),
(
  'ESSENTIAL_BACKUP',
  'Sauvegarde et continuite',
  'Sauvegarde reguliere des donnees pour assurer la continuite du service et la recuperation en cas d''incident. Les sauvegardes sont chiffrees et securisees.',
  'LEGITIMATE_INTEREST', 'ESSENTIAL', 'LOW',
  90, false, 'P2', false,
  'RGPD Art. 32 - Capacite de retablir la disponibilite'
),

-- =========================
-- ADDITIONAL AI PROCESSING TEMPLATES
-- =========================

(
  'AI_SENTIMENT',
  'Analyse de sentiment par IA',
  'Detection automatique du ton et de l''emotion dans les textes : positif, negatif, neutre. Utilise pour analyser les retours clients et adapter les reponses.',
  'CONSENT', 'AI_PROCESSING', 'MEDIUM',
  90, false, 'P1', true,
  NULL
),
(
  'AI_CHATBOT',
  'Assistant conversationnel IA',
  'Interaction avec un assistant virtuel intelligent pour repondre aux questions, guider les utilisateurs et automatiser les taches simples.',
  'CONSENT', 'AI_PROCESSING', 'MEDIUM',
  30, false, 'P2', true,
  'CNIL - Recommandations sur les chatbots (2021)'
),
(
  'AI_RECOMMENDATION',
  'Recommandations personnalisees par IA',
  'Suggestions de contenus, produits ou actions basees sur l''analyse du comportement et des preferences par intelligence artificielle.',
  'CONSENT', 'AI_PROCESSING', 'MEDIUM',
  90, false, 'P1', true,
  NULL
),
(
  'AI_ANOMALY_DETECTION',
  'Detection d''anomalies par IA',
  'Identification automatique de comportements inhabituels ou suspects pour la securite et la prevention des fraudes. Traitement automatise avec supervision humaine.',
  'LEGITIMATE_INTEREST', 'AI_PROCESSING', 'HIGH',
  365, true, 'P2', true,
  'RGPD Art. 22.2.b - Mesures appropriees'
),
(
  'AI_VOICE_TRANSCRIPTION',
  'Transcription vocale par IA',
  'Conversion automatique de l''audio (appels, reunions, messages vocaux) en texte exploitable. Les enregistrements originaux peuvent etre supprimes apres transcription.',
  'CONSENT', 'AI_PROCESSING', 'HIGH',
  90, true, 'P2', true,
  'CNIL - Enregistrement conversations telephoniques'
),
(
  'AI_IMAGE_ANALYSIS',
  'Analyse d''images par IA',
  'Traitement automatique d''images pour extraction d''informations, detection d''objets ou classification visuelle. Peut inclure la reconnaissance de documents.',
  'CONSENT', 'AI_PROCESSING', 'MEDIUM',
  90, false, 'P2', true,
  NULL
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  lawful_basis = EXCLUDED.lawful_basis,
  category = EXCLUDED.category,
  risk_level = EXCLUDED.risk_level,
  default_retention_days = EXCLUDED.default_retention_days,
  requires_dpia = EXCLUDED.requires_dpia,
  max_data_class = EXCLUDED.max_data_class,
  is_ai_purpose = EXCLUDED.is_ai_purpose,
  cnil_reference = EXCLUDED.cnil_reference,
  updated_at = now();

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================
INSERT INTO schema_migrations (version, applied_at)
VALUES (21, now())
ON CONFLICT (version) DO NOTHING;

COMMIT;
