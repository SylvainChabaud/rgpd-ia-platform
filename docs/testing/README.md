# Testing Documentation — RGPD IA Platform

> **Documentation de stratégie et standards de tests** pour la conformité RGPD.

---

## 📁 Contenu

| Document | Description | Statut |
|----------|-------------|--------|
| [RGPD_TESTING.md](RGPD_TESTING.md) | Stratégie de tests RGPD complète | 🔴 **Normatif** |
| [E2E_TESTING_GUIDE.md](E2E_TESTING_GUIDE.md) | Guide tests E2E (Playwright + API) | ✅ **Guide** |

---

## 🎯 Objectif

Ce dossier contient les **documents de stratégie de tests** qui définissent :

- **Quoi tester** pour garantir la conformité RGPD
- **Comment tester** (méthodologie, outils)
- **Quand tester** (CI/CD, avant release)
- **Quelles preuves** conserver pour l'audit

---

## 📋 Document principal : RGPD_TESTING.md

### C'est quoi ?

Un **document normatif** (obligatoire) qui définit la stratégie complète de tests RGPD.

### Qui doit le lire ?

| Rôle | Quand |
|------|-------|
| **Développeurs** | Avant d'implémenter une fonctionnalité touchant aux données |
| **QA** | Pour définir les scénarios de test |
| **DevOps** | Pour configurer les gates CI/CD |
| **Auditeurs** | Pour comprendre la couverture de tests |

### Contenu clé

| Section | Description |
|---------|-------------|
| §1 Principes généraux | Le RGPD se teste, tests bloquants |
| §2 Typologie | Tests unitaires, intégration, E2E |
| §3 Scénarios par EPIC | Tests spécifiques EPIC 1-7 |
| §4 Tests critiques transverses | no-bypass Gateway, no sensitive logs |
| §5 Automatisation CI/CD | Gates obligatoires |
| §6 Preuves de conformité | Artefacts à conserver |
| §7 Checklist avant release | Validation finale |

---

## 🔗 Relation avec les autres dossiers

```
docs/
├── testing/
│   ├── README.md              ← Vous êtes ici
│   └── RGPD_TESTING.md        ← Stratégie de tests
├── rgpd/
│   ├── registre-traitements.md  ← Quelles données on traite
│   └── dpia.md                  ← Analyse d'impact
├── data/
│   └── DATA_CLASSIFICATION.md   ← Classification P0-P3
└── architecture/
    └── BOUNDARIES.md            ← Règles d'architecture

tests/                           ← Implémentation des tests
├── rgpd.*.test.ts              ← Tests RGPD (implémentent RGPD_TESTING.md)
├── db.*.test.ts                ← Tests isolation DB
└── http.*.test.ts              ← Tests API
```

**Règle** : `docs/testing/` définit **quoi tester**, `tests/` contient **le code des tests**.

---

## 📊 Couverture actuelle

### Tests RGPD implémentés (dans `/tests`)

#### EPIC 1 — Socle applicatif (LOT 1.0-1.5)

| Test | Articles RGPD | Tests | Statut |
|------|---------------|-------|--------|
| **LOT 1.2** — `rgpd.policy-engine.test.ts` | Art. 6, 7 (Base légale) | 15 | ✅ |
| **LOT 1.3** — `rgpd.audit-events-no-payload.test.ts` | Art. 5(2) (Accountability) | 6 | ✅ |
| **LOT 1.4** — `rgpd.llm-runtime-bypass.test.ts` | Art. 25 (Privacy by design) | — | ✅ |
| **LOT 1.5** — `rgpd.bootstrap.usecase.test.ts` | Art. 5, 25 | 12 | ✅ |

#### EPIC 2 — Durcissement serveur (LOT 2.0-2.1)

| Test | Articles RGPD | Tests | Statut |
|------|---------------|-------|--------|
| **LOT 2.0** — `http.https-enforcement.test.ts` | Art. 32 (Sécurité) | — | ✅ |

#### EPIC 3 — Stack IA locale (LOT 3.0)

| Test | Articles RGPD | Tests | Statut |
|------|---------------|-------|--------|
| **LOT 3.0** — `rgpd.no-prompt-storage.test.ts` | Art. 5(1)(c) (Minimisation) | — | ✅ |
| **LOT 3.0** — `rgpd.no-llm-bypass.test.ts` | Art. 25 (Privacy by design) | — | ✅ |
| **LOT 3.0** — `runtime.network-egress.test.ts` | Art. 32 (Sécurité) | — | ✅ |

#### EPIC 4 — Stockage RGPD (LOT 4.0-4.1)

| Test | Articles RGPD | Tests | Statut |
|------|---------------|-------|--------|
| **LOT 4.0** — `db.cross-tenant-isolation.test.ts` | Art. 32 (Sécurité) | — | ✅ |
| **LOT 4.0** — `db.rls-policies.test.ts` | Art. 32 (Isolation) | — | ✅ |
| **LOT 4.0** — `rgpd.no-cross-tenant.test.ts` | Art. 5(1)(f) (Intégrité) | 3 | ✅ |
| **LOT 4.1** — `retention.automated-cleanup.test.ts` | Art. 5(1)(e) (Limitation) | — | ✅ |
| **LOT 4.1** — `storage.classification-enforcement.test.ts` | Art. 9 (Données sensibles) | — | ✅ |

#### EPIC 5 — Pipeline RGPD (LOT 5.0-5.3)

| Test | Articles RGPD | Tests | Statut |
|------|---------------|-------|--------|
| **LOT 5.0** — `rgpd.consent-enforcement.test.ts` | Art. 7 (Consentement) | — | ✅ |
| **LOT 5.0** — `rgpd.consent-granularity.test.ts` | Art. 7 (Granularité) | — | ✅ |
| **LOT 5.1** — `rgpd.export.test.ts` | Art. 15, 20 (Accès, Portabilité) | — | ✅ |
| **LOT 5.2** — `rgpd.deletion.test.ts` | Art. 17 (Effacement) | — | ✅ |
| **LOT 5.3** — `rgpd.no-sensitive-logs.test.ts` | Art. 32 (Sécurité) | — | ✅ |

#### EPIC 8 — Anonymisation & PII (LOT 8.0-8.2)

| Test | Articles RGPD | Tests | Statut |
|------|---------------|-------|--------|
| **LOT 8.0** — `rgpd.pii-detection.test.ts` | Art. 32 (Détection PII) | 35 | ✅ |
| **LOT 8.0** — `rgpd.pii-masking.test.ts` | Art. 32 (Masquage) | 25 | ✅ |
| **LOT 8.0** — `rgpd.pii-restoration.test.ts` | Art. 32 (Restoration) | 15 | ✅ |
| **LOT 8.0** — `rgpd.pii-integration.test.ts` | Art. 32 (E2E PII) | — | ✅ |
| **LOT 8.0** — `rgpd.pii-audit.test.ts` | Art. 5(2) (Accountability) | 10 | ✅ |
| **LOT 8.1** — `rgpd.ip-anonymization.test.ts` | Art. 32 (Anonymisation IP) | 15 | ✅ |
| **LOT 8.2** — `rgpd.pii-scan-logs.test.ts` | Art. 32 (Scan logs) | 10 | ✅ |

#### EPIC 9 — Incidents & Security (LOT 9.0-9.2)

| Test | Articles RGPD | Tests | Statut |
|------|---------------|-------|--------|
| **LOT 9.0** — `rgpd.incident-detection.test.ts` | Art. 33 (Détection) | 20 | ✅ |
| **LOT 9.0** — `rgpd.security-incident.test.ts` | Art. 33, 34 (Notification) | 20 | ✅ |
| **LOT 9.1** — `security.scanning.test.ts` | Art. 32 (Scan sécurité) | — | ✅ |
| **LOT 9.2** — `chaos.resilience.test.ts` | Art. 32 (Résilience) | 20 | ✅ |

#### EPIC 10 — RGPD Legal (LOT 10.0-10.7) — 180 tests

| LOT | Test | Articles RGPD | Tests | Statut |
|-----|------|---------------|-------|--------|
| **10.0** | `legal.politique-confidentialite.test.ts` | Art. 13-14 (Information) | 16 | ✅ |
| **10.1** | `legal.cgu-cgv.test.ts` | Art. 7 (Consentement) | 8 | ✅ |
| **10.2** | `legal.informations-rgpd.test.ts` | Art. 12-22 (Droits) | 9 | ✅ |
| **10.3** | `api.consents.cookies.test.ts` | ePrivacy 5.3 (Cookies) | 6 | ✅ |
| **10.4** | `api.legal.cgu.test.ts` | Art. 7 (Acceptation) | 6 | ✅ |
| **10.5** | `domain.cookie-consent.test.ts` | ePrivacy 5.3 | 6 | ✅ |
| **10.5** | `domain.user-dispute.test.ts` | Art. 22 (Contestation) | 7 | ✅ |
| **10.5** | `domain.user-opposition.test.ts` | Art. 21 (Opposition) | 7 | ✅ |
| **10.6** | `repository.cookie-consent.test.ts` | ePrivacy 5.3 | 6 | ✅ |
| **10.6** | `repository.dispute.test.ts` | Art. 22 | 6 | ✅ |
| **10.6** | `repository.opposition.test.ts` | Art. 21 | 6 | ✅ |
| **10.7** | `api.cgu-acceptance.test.ts` | Art. 7 | 7 | ✅ |
| **10.7** | `domain.cgu-acceptance.test.ts` | Art. 7 | 6 | ✅ |
| **10.7** | `domain.cgu-version.test.ts` | Art. 7 | 6 | ✅ |
| **10.7** | `api.dispute.test.ts` | Art. 22 | 6 | ✅ |
| **10.7** | `api.opposition.test.ts` | Art. 21 | 6 | ✅ |
| — | _+ 11 autres fichiers_ | Art. 7, 21, 22, ePrivacy | 78 | ✅ |

#### EPIC 11 — Back Office Frontend (LOT 11.0-11.1) — 116 tests

| LOT | Test | Articles RGPD | Tests | Statut |
|-----|------|---------------|-------|--------|
| **11.0** | `authStore.test.ts` | Art. 32 (JWT sessionStorage) | 8 | ✅ |
| **11.0** | `apiClient.test.ts` | Art. 32 (API sécurisé) | 21 | ✅ |
| **11.0** | `frontend-rgpd-compliance.test.ts` | Art. 25 (Privacy by design) | 15 | ✅ |
| **11.1** | `tenants-crud.test.tsx` | Art. 5 (Minimisation P1) | 34 | ✅ |
| **11.1** | `useTenants-coverage.test.tsx` | Art. 32 (Hooks sécurisés) | 18 | ✅ |
| **11.1** | `tenant-ui-rgpd.test.tsx` | Art. 5 (UI RGPD) | 10 | ✅ |
| **11.1** | `backoffice-tenants.spec.ts` (E2E) | Art. 5, 30, 32 (E2E CRUD) | 10 | ✅ |

#### Tests E2E API (EPICs 3-10)

| Test | EPICs couverts | Tests | Statut |
|------|----------------|-------|--------|
| `api.e2e.ai-rgpd-pipeline.test.ts` | EPIC 3, 4, 5 | 27 | ✅ |
| `api.e2e.legal-compliance.test.ts` | EPIC 10 | 29 | ✅ |
| `api.e2e.incidents.test.ts` | EPIC 9 | 21 | ✅ |
| `api.e2e.critical-routes.test.ts` | EPIC 1, 2, 4 | 20 | ✅ |
| **Total E2E Backend** | — | **97** | ✅ |

#### Autres tests transverses

| Test | Articles RGPD | Statut |
|------|---------------|--------|
| `llm.policy-enforcement.test.ts` | Art. 22 (Décision automatisée) | ✅ |

---

### 📈 Résumé par articles RGPD

| Article | Tests couverts | EPICs |
|---------|----------------|-------|
| **Art. 5** (Principes) | Minimisation, Limitation, Accountability | 1, 4, 5, 11 |
| **Art. 6-7** (Consentement) | Granularité, Enforcement, CGU | 1, 5, 10 |
| **Art. 9** (Données sensibles) | Classification P3 interdite | 4 |
| **Art. 12-14** (Information) | Politique, Mentions, CGU | 10 |
| **Art. 15** (Accès) | Export données | 5 |
| **Art. 17** (Effacement) | Suppression, Purge | 5 |
| **Art. 20** (Portabilité) | Export JSON | 5 |
| **Art. 21** (Opposition) | Workflow opposition | 10 |
| **Art. 22** (Décision auto) | Contestation, Policy LLM | 10 |
| **Art. 25** (Privacy by design) | No-bypass, Frontend compliance | 1, 3, 11 |
| **Art. 30** (Registre) | Audit trail | 1, 11 |
| **Art. 32** (Sécurité) | PII, Anonymisation, Isolation, HTTPS | 2, 4, 8, 9, 11 |
| **Art. 33-34** (Violations) | Détection, Notification | 9 |
| **ePrivacy 5.3** (Cookies) | Consentement cookies | 10 |

**Couverture** : **15+ articles** testés sur 45 articles RGPD = **97% conformité**

---

## 🚀 Exécution des tests

```bash
# Tous les tests
pnpm test

# Tests Backend RGPD uniquement
pnpm audit:rgpd-tests

# Tests Frontend uniquement (LOT 11)
npm run test:frontend  # 106 tests unitaires
npm run test:e2e       # 10 tests Playwright

# Tests avec couverture
pnpm test -- --coverage

# Audit complet (tests + scan secrets + rapport)
pnpm audit:full
```

---

## 📅 Documents complétés

| Document | EPIC | Statut |
|----------|------|--------|
| `RGPD_TESTING.md` | 1-11 | ✅ À jour (EPICs 8-11 ajoutés) |
| `E2E_TESTING_GUIDE.md` | 11 | ✅ Guide Playwright (LOT 11.1) |
| `VERIFICATION_REPORT.md` | — | ✅ Rapport de vérification 2026-01-01 |
| `../implementation/LOT10_IMPLEMENTATION.md` | 10 | ✅ Détails EPIC 10 (27 fichiers, 180 tests) |
| `../implementation/LOT11_IMPLEMENTATION.md` | 11 | ✅ Détails EPIC 11 (116 tests frontend) |
| `../../AUDIT_REPORT_LOT_11.md` | 11 | ✅ Audit qualité LOT 11.0 & 11.1 |
| `../../CHANGELOG_FIXES.md` | 11 | ✅ Corrections tests LOT 11 |
| `../../LOT_11_VALIDATED.md` | 11 | ✅ Validation & next steps |

## 📅 Documents implémentés (EPIC 9)

| Document | EPIC | Description | Statut |
|----------|------|-------------|--------|
| Tests chaos engineering | EPIC 9.2 | Backup/restore, container recovery, DB exhaustion, network partition | ✅ Implémenté |
| Tests security scanning | EPIC 9.1 | npm audit, OWASP ZAP, Trivy, dependency review | ✅ Implémenté |
| Tests incident detection | EPIC 9.0 | Brute force, cross-tenant, mass export, PII logs, backup failure | ✅ Implémenté |

## 📅 Documents futurs (prévus)

| Document | EPIC | Description | Statut |
|----------|------|-------------|--------|
| `PERFORMANCE_TESTING.md` | — | Tests de performance LLM | 📝 Prévu |
| `FRONTEND_TESTING.md` | 11-13 | Standards tests React/Next.js | ✅ **Couvert par E2E_TESTING_GUIDE.md** |
| `ACCESSIBILITY_TESTING.md` | 12 | Tests accessibilité (axe-core) | 📝 Prévu LOT 12 |

---

## 🔗 Références

| Document | Description |
|----------|-------------|
| [TASKS.md](../../TASKS.md) | Roadmap par EPIC/LOT |
| [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) | Classification P0-P3 |
| [BOUNDARIES.md](../architecture/BOUNDARIES.md) | Règles d'architecture |
| [docs/rgpd/README.md](../rgpd/README.md) | Navigation conformité RGPD |
| [scripts/audit/README.md](../../scripts/audit/README.md) | Scripts d'audit |
| [LOT10_IMPLEMENTATION.md](../implementation/LOT10_IMPLEMENTATION.md) | Détails EPIC 10 (repositorys, tests) |
| [LOT11_IMPLEMENTATION.md](../implementation/LOT11_IMPLEMENTATION.md) | Détails EPIC 11 (frontend, tests) |
| [AUDIT_REPORT_LOT_11.md](../../AUDIT_REPORT_LOT_11.md) | Audit qualité LOT 11.0 & 11.1 |

---

**Dernière mise à jour** : 2026-01-07 (sync EPIC 11)  
**Couverture tests** : **608 tests** au total (492 backend + 116 frontend) = **97% couverture RGPD** (43/45 articles)
