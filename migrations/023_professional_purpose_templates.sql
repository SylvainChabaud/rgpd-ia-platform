-- 023_professional_purpose_templates.sql
-- LOT 12.2 — Professional Purpose Templates (RGPD-Compliant)
-- EPIC 12 - Back Office Tenant Admin
--
-- Adds:
-- 1. PROFESSIONAL category for regulated professions
-- 2. Sector field for filtering (ACCOUNTING, LEGAL, HEALTH, GENERAL)
-- 3. Professional templates for accountants, lawyers, doctors
--
-- Compliance:
-- - Accountants: Secret professionnel comptable, obligations fiscales
-- - Lawyers: Secret professionnel absolu (Art. 66-5 Loi 1971)
-- - Doctors: Secret médical, HDS, RGPD Art. 9

BEGIN;

-- =========================
-- ADD PROFESSIONAL CATEGORY
-- =========================

-- Update constraint to include PROFESSIONAL category
ALTER TABLE purpose_templates DROP CONSTRAINT IF EXISTS chk_template_category;
ALTER TABLE purpose_templates ADD CONSTRAINT chk_template_category
  CHECK (category IN ('AI_PROCESSING', 'ANALYTICS', 'MARKETING', 'ESSENTIAL', 'PROFESSIONAL'));

ALTER TABLE purposes DROP CONSTRAINT IF EXISTS chk_purposes_category;
ALTER TABLE purposes ADD CONSTRAINT chk_purposes_category
  CHECK (category IN ('AI_PROCESSING', 'ANALYTICS', 'MARKETING', 'ESSENTIAL', 'PROFESSIONAL'));

-- =========================
-- ADD SECTOR FIELD
-- =========================

-- Add sector column to templates (nullable for backwards compatibility)
ALTER TABLE purpose_templates
  ADD COLUMN IF NOT EXISTS sector VARCHAR(30) DEFAULT 'GENERAL';

-- Add constraint for sector values
ALTER TABLE purpose_templates DROP CONSTRAINT IF EXISTS chk_template_sector;
ALTER TABLE purpose_templates ADD CONSTRAINT chk_template_sector
  CHECK (sector IN ('GENERAL', 'ACCOUNTING', 'LEGAL', 'HEALTH', 'FINANCE', 'HR'));

-- Create index for sector filtering
CREATE INDEX IF NOT EXISTS idx_purpose_templates_sector
  ON purpose_templates(sector)
  WHERE is_active = true;

-- =========================
-- UPDATE EXISTING TEMPLATES WITH SECTOR
-- =========================

-- Health-related templates
UPDATE purpose_templates SET sector = 'HEALTH'
WHERE code IN ('AI_HEALTH_ANALYSIS', 'AI_BIOMETRIC_ANALYSIS');

-- All others default to GENERAL (already set by default)

-- =========================
-- PROFESSIONAL TEMPLATES - ACCOUNTING
-- =========================

INSERT INTO purpose_templates (
  code, name, description, lawful_basis, category, risk_level,
  default_retention_days, requires_dpia, max_data_class, is_ai_purpose, sector, cnil_reference
) VALUES
(
  'PRO_ACCOUNTING_ANALYSIS',
  'Analyse comptable par IA',
  'Traitement automatise des pieces comptables : factures, releves bancaires, notes de frais. Extraction et categorisation des ecritures pour integration en comptabilite.',
  'CONTRACT', 'PROFESSIONAL', 'MEDIUM',
  3650, false, 'P2', true, 'ACCOUNTING',
  'Secret professionnel comptable - Art. 21 Ordonnance 1945'
),
(
  'PRO_ACCOUNTING_TAX',
  'Preparation fiscale assistee par IA',
  'Calcul automatise des declarations fiscales, TVA, impots. Verification de coherence et alertes sur anomalies potentielles.',
  'LEGAL_OBLIGATION', 'PROFESSIONAL', 'HIGH',
  3650, true, 'P2', true, 'ACCOUNTING',
  'Obligations fiscales - CGI / LPF'
),
(
  'PRO_ACCOUNTING_AUDIT',
  'Audit et controle par IA',
  'Analyse automatisee des ecritures pour detection d''anomalies, ecarts et risques. Aide a la revision des comptes et certification.',
  'CONTRACT', 'PROFESSIONAL', 'HIGH',
  3650, true, 'P2', true, 'ACCOUNTING',
  'NEP - Normes d''exercice professionnel'
),
(
  'PRO_ACCOUNTING_PAYROLL',
  'Gestion de paie assistee par IA',
  'Traitement automatise des bulletins de paie, charges sociales, declarations DSN. Donnees salariales confidentielles.',
  'CONTRACT', 'PROFESSIONAL', 'HIGH',
  3650, true, 'P2', true, 'ACCOUNTING',
  'RGPD Art. 88 - Traitement dans le contexte de l''emploi'
),

-- =========================
-- PROFESSIONAL TEMPLATES - LEGAL
-- =========================
(
  'PRO_LEGAL_ANALYSIS',
  'Analyse juridique par IA',
  'Analyse automatisee de documents juridiques : contrats, jugements, actes. Extraction de clauses, identification de risques et suggestions.',
  'CONTRACT', 'PROFESSIONAL', 'HIGH',
  3650, true, 'P2', true, 'LEGAL',
  'Secret professionnel avocat - Art. 66-5 Loi 1971'
),
(
  'PRO_LEGAL_RESEARCH',
  'Recherche jurisprudentielle par IA',
  'Recherche automatisee dans les bases de jurisprudence et doctrine. Identification de decisions pertinentes et analyse comparative.',
  'CONTRACT', 'PROFESSIONAL', 'MEDIUM',
  365, false, 'P1', true, 'LEGAL',
  NULL
),
(
  'PRO_LEGAL_CONTRACT',
  'Redaction contractuelle assistee par IA',
  'Generation et revision de clauses contractuelles, verification de conformite, suggestions d''ameliorations basees sur les meilleures pratiques.',
  'CONTRACT', 'PROFESSIONAL', 'MEDIUM',
  365, false, 'P2', true, 'LEGAL',
  NULL
),
(
  'PRO_LEGAL_DUE_DILIGENCE',
  'Due diligence assistee par IA',
  'Analyse systematique de documents dans le cadre d''operations (M&A, audit). Extraction d''informations cles et identification de risques.',
  'CONTRACT', 'PROFESSIONAL', 'CRITICAL',
  1825, true, 'P2', true, 'LEGAL',
  'RGPD Art. 35 - AIPD obligatoire'
),
(
  'PRO_LEGAL_LITIGATION',
  'Gestion contentieux par IA',
  'Suivi automatise des procedures, echeances, pieces. Analyse predictive des chances de succes et recommandations strategiques.',
  'CONTRACT', 'PROFESSIONAL', 'HIGH',
  3650, true, 'P2', true, 'LEGAL',
  'Secret professionnel - correspondances avocat'
),

-- =========================
-- PROFESSIONAL TEMPLATES - HEALTH
-- =========================
(
  'PRO_HEALTH_DIAGNOSIS',
  'Aide au diagnostic par IA',
  'Assistance au diagnostic medical basee sur les symptomes, antecedents et examens. L''IA suggere, le medecin decide. Donnees de sante (Art. 9).',
  'CONSENT', 'PROFESSIONAL', 'CRITICAL',
  730, true, 'P3', true, 'HEALTH',
  'RGPD Art. 9.2.h - Medecine preventive / HDS'
),
(
  'PRO_HEALTH_RECORDS',
  'Gestion dossier medical par IA',
  'Organisation et indexation automatique du dossier patient : comptes-rendus, ordonnances, resultats. Historique medical structure.',
  'CONTRACT', 'PROFESSIONAL', 'HIGH',
  730, true, 'P3', true, 'HEALTH',
  'Code de la sante publique - Dossier medical'
),
(
  'PRO_HEALTH_PRESCRIPTION',
  'Verification ordonnances par IA',
  'Controle automatique des prescriptions : interactions medicamenteuses, contre-indications, posologies. Alertes de securite.',
  'CONTRACT', 'PROFESSIONAL', 'CRITICAL',
  730, true, 'P3', true, 'HEALTH',
  'Art. R. 4235-48 CSP - Analyse pharmaceutique'
),
(
  'PRO_HEALTH_IMAGING',
  'Analyse imagerie medicale par IA',
  'Traitement automatise d''images medicales (radios, IRM, scanners) pour detection d''anomalies et aide a l''interpretation.',
  'CONSENT', 'PROFESSIONAL', 'CRITICAL',
  730, true, 'P3', true, 'HEALTH',
  'HAS - Referentiel IA en sante (2024)'
),
(
  'PRO_HEALTH_SCHEDULING',
  'Gestion rendez-vous medicaux par IA',
  'Optimisation automatique des plannings, rappels patients, gestion des urgences. Donnees de contact et historique RDV.',
  'CONTRACT', 'PROFESSIONAL', 'MEDIUM',
  365, false, 'P2', true, 'HEALTH',
  NULL
),

-- =========================
-- PROFESSIONAL TEMPLATES - FINANCE
-- =========================
(
  'PRO_FINANCE_RISK',
  'Analyse de risque financier par IA',
  'Evaluation automatisee du risque client/fournisseur : scoring, historique paiements, indicateurs financiers. Aide a la decision credit.',
  'LEGITIMATE_INTEREST', 'PROFESSIONAL', 'HIGH',
  1095, true, 'P2', true, 'FINANCE',
  'RGPD Art. 22 - Decision automatisee'
),
(
  'PRO_FINANCE_FRAUD',
  'Detection fraude financiere par IA',
  'Surveillance des transactions pour identification de patterns frauduleux : anomalies, comportements suspects, blanchiment.',
  'LEGAL_OBLIGATION', 'PROFESSIONAL', 'CRITICAL',
  1825, true, 'P2', true, 'FINANCE',
  'Directive (UE) 2015/849 - LCB-FT'
),
(
  'PRO_FINANCE_COMPLIANCE',
  'Conformite reglementaire par IA',
  'Verification automatique de conformite aux reglementations financieres : KYC, AML, sanctions. Alertes et rapports.',
  'LEGAL_OBLIGATION', 'PROFESSIONAL', 'HIGH',
  1825, true, 'P2', true, 'FINANCE',
  'AMF / ACPR - Obligations de conformite'
),

-- =========================
-- PROFESSIONAL TEMPLATES - HR
-- =========================
(
  'PRO_HR_RECRUITMENT',
  'Recrutement assiste par IA',
  'Analyse automatisee de CV, matching candidats/postes, pre-selection. Garanties contre les biais et discrimination.',
  'CONSENT', 'PROFESSIONAL', 'HIGH',
  730, true, 'P2', true, 'HR',
  'RGPD Art. 22 / Code du travail - Non-discrimination'
),
(
  'PRO_HR_PERFORMANCE',
  'Evaluation performance par IA',
  'Analyse des indicateurs de performance, objectifs, feedbacks. Aide a l''evaluation annuelle et decisions RH.',
  'CONTRACT', 'PROFESSIONAL', 'HIGH',
  1095, true, 'P2', true, 'HR',
  'RGPD Art. 88 - Traitement emploi / CNIL Guide RH'
),
(
  'PRO_HR_TRAINING',
  'Formation personnalisee par IA',
  'Recommandation de formations basee sur les competences, objectifs et historique. Parcours d''apprentissage adaptatif.',
  'CONTRACT', 'PROFESSIONAL', 'MEDIUM',
  365, false, 'P1', true, 'HR',
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
  sector = EXCLUDED.sector,
  cnil_reference = EXCLUDED.cnil_reference,
  updated_at = now();

-- =========================
-- MARK MIGRATION AS APPLIED
-- =========================
INSERT INTO schema_migrations (version, applied_at)
VALUES (23, now())
ON CONFLICT (version) DO NOTHING;

COMMIT;
