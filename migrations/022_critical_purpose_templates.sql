-- 022_critical_purpose_templates.sql
-- LOT 12.2 — Critical Risk Purpose Templates (RGPD-Compliant)
-- EPIC 12 - Back Office Tenant Admin
--
-- Adds CRITICAL risk level templates for high-sensitivity processing:
-- - Biometric data processing
-- - Automated decision-making with legal effects
-- - Large-scale profiling
-- - Health data processing
--
-- RGPD Art. 35.3 - Cases requiring DPIA:
-- (a) systematic evaluation including profiling with legal effects
-- (b) large scale processing of special categories (Art. 9)
-- (c) systematic monitoring of publicly accessible areas

BEGIN;

INSERT INTO purpose_templates (
  code, name, description, lawful_basis, category, risk_level,
  default_retention_days, requires_dpia, max_data_class, is_ai_purpose, cnil_reference
) VALUES
-- =========================
-- CRITICAL AI PROCESSING TEMPLATES
-- =========================
(
  'AI_BIOMETRIC_ANALYSIS',
  'Analyse biometrique par IA',
  'Traitement de donnees biometriques (reconnaissance faciale, empreintes, voix) pour identification ou authentification. Categorie speciale de donnees (Art. 9 RGPD) necessitant des garanties renforcees.',
  'CONSENT', 'AI_PROCESSING', 'CRITICAL',
  30, true, 'P3', true,
  'RGPD Art. 9 - Donnees biometriques / CNIL Deliberation 2019-001'
),
(
  'AI_AUTOMATED_DECISION',
  'Decision automatisee avec effet juridique',
  'Prise de decision entierement automatisee produisant des effets juridiques ou affectant significativement la personne (scoring credit, recrutement automatise, eligibilite). Droit d''opposition et intervention humaine garantis.',
  'CONSENT', 'AI_PROCESSING', 'CRITICAL',
  365, true, 'P2', true,
  'RGPD Art. 22 - Decision individuelle automatisee'
),
(
  'AI_HEALTH_ANALYSIS',
  'Analyse de donnees de sante par IA',
  'Traitement de donnees de sante (dossiers medicaux, symptomes, diagnostic) par intelligence artificielle. Categorie speciale necessitant consentement explicite et mesures de securite renforcees.',
  'CONSENT', 'AI_PROCESSING', 'CRITICAL',
  365, true, 'P3', true,
  'RGPD Art. 9.2.a - Consentement explicite donnees de sante'
),
(
  'AI_BEHAVIORAL_PREDICTION',
  'Prediction comportementale par IA',
  'Analyse predictive du comportement futur des utilisateurs basee sur l''historique des actions, preferences et donnees contextuelles. Peut influencer les decisions ou opportunites presentees.',
  'CONSENT', 'AI_PROCESSING', 'CRITICAL',
  180, true, 'P2', true,
  'EDPB Guidelines on profiling (WP251rev.01)'
),

-- =========================
-- CRITICAL MARKETING TEMPLATES
-- =========================
(
  'MARKETING_SCORING',
  'Scoring et notation client',
  'Attribution de scores ou notes aux utilisateurs basee sur leur comportement, fiabilite ou valeur estimee. Peut affecter les offres, tarifs ou services proposes.',
  'CONSENT', 'MARKETING', 'CRITICAL',
  365, true, 'P2', false,
  'RGPD Art. 22 - Profilage produisant des effets juridiques'
),

-- =========================
-- CRITICAL ESSENTIAL TEMPLATES
-- =========================
(
  'ESSENTIAL_IDENTITY_VERIFICATION',
  'Verification d''identite renforcee',
  'Verification de l''identite par documents officiels, biometrie ou sources tierces. Requis pour la conformite KYC/AML ou l''acces a des services reglementees.',
  'LEGAL_OBLIGATION', 'ESSENTIAL', 'CRITICAL',
  1825, true, 'P3', false,
  'Directive (UE) 2015/849 - Lutte anti-blanchiment'
),
(
  'ESSENTIAL_SURVEILLANCE',
  'Surveillance des activites utilisateur',
  'Monitoring systematique des actions utilisateurs pour detection de fraude, abus ou comportements suspects. Journalisation exhaustive avec alertes automatiques.',
  'LEGITIMATE_INTEREST', 'ESSENTIAL', 'CRITICAL',
  730, true, 'P2', false,
  'RGPD Art. 35.3.c - Surveillance systematique'
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
VALUES (22, now())
ON CONFLICT (version) DO NOTHING;

COMMIT;
