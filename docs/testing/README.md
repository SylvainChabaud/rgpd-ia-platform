# Testing Documentation — RGPD IA Platform

> **Documentation de stratégie et standards de tests** pour la conformité RGPD.

---

## 📁 Contenu

| Document | Description | Statut |
|----------|-------------|--------|
| [RGPD_TESTING.md](RGPD_TESTING.md) | Stratégie de tests RGPD complète | 🔴 **Normatif** |

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

| Test | RGPD_TESTING.md ref | Statut |
|------|---------------------|--------|
| `rgpd.no-prompt-storage.test.ts` | §3 EPIC 3 | ✅ |
| `rgpd.no-llm-bypass.test.ts` | §4.A | ✅ |
| `rgpd.no-sensitive-logs.test.ts` | §4.B | ✅ |
| `rgpd.deletion.test.ts` | §3 EPIC 5, §4.C | ✅ |
| `rgpd.export.test.ts` | §3 EPIC 5 | ✅ |
| `rgpd.consent-enforcement.test.ts` | §3 EPIC 5 | ✅ |
| `rgpd.consent-granularity.test.ts` | §3 EPIC 5, Art. 7 | ✅ |
| `rgpd.audit-events-no-payload.test.ts` | §3 EPIC 1 | ✅ |
| `rgpd.bootstrap.usecase.test.ts` | §3 EPIC 1 | ✅ |
| `rgpd.policy-engine.test.ts` | §3 EPIC 1 | ✅ |
| `rgpd.llm-runtime-bypass.test.ts` | §4.A (runtime) | ✅ |
| `db.cross-tenant-isolation.test.ts` | §3 EPIC 4 | ✅ |
| `db.rls-policies.test.ts` | §3 EPIC 4 (RLS) | ✅ |
| `http.https-enforcement.test.ts` | §3 EPIC 2 | ✅ |
| `llm.policy-enforcement.test.ts` | §4 LLM_USAGE_POLICY | ✅ |
| `retention.automated-cleanup.test.ts` | §3 EPIC 4, Art. 5(1)(e) | ✅ |
| `storage.classification-enforcement.test.ts` | Art. 9 RGPD | ✅ |
| `runtime.network-egress.test.ts` | §3 EPIC 3 | ✅ |
| `api.e2e.critical-routes.test.ts` | §3 E2E | ✅ |
| `rgpd.pii-detection.test.ts` | §3 EPIC 8.0 (35 tests) | ✅ |
| `rgpd.pii-masking.test.ts` | §3 EPIC 8.0 (25 tests) | ✅ |
| `rgpd.pii-restoration.test.ts` | §3 EPIC 8.0 (15 tests) | ✅ |
| `rgpd.pii-integration.test.ts` | §3 EPIC 8 E2E | ✅ |
| `rgpd.pii-scan-logs.test.ts` | §3 EPIC 8.2 (10 tests) | ✅ |
| `rgpd.pii-audit.test.ts` | §3 EPIC 8 (10 tests) | ✅ |
| `rgpd.ip-anonymization.test.ts` | §3 EPIC 8.1 (15 tests) | ✅ |
| `rgpd.no-cross-tenant.test.ts` | §3 EPIC 4 (isolation, 3 tests) | ✅ |

---

## 🚀 Exécution des tests

```bash
# Tous les tests
pnpm test

# Tests RGPD uniquement
pnpm audit:rgpd-tests

# Tests avec couverture
pnpm test -- --coverage

# Audit complet (tests + scan secrets + rapport)
pnpm audit:full
```

---

## 📅 Documents complétés

| Document | EPIC | Statut |
|----------|------|--------|
| `RGPD_TESTING.md` | 1-8 | ✅ À jour (EPIC 8 ajouté) |
| `VERIFICATION_REPORT.md` | — | ✅ Rapport de vérification 2026-01-01 |

## 📅 Documents futurs (prévus)

| Document | EPIC | Description |
|----------|------|-------------|
| `SECURITY_TESTING.md` | EPIC 9 | Tests de sécurité (pentest, vulnérabilités) |
| `PERFORMANCE_TESTING.md` | — | Tests de performance LLM |
| `E2E_TESTING.md` | EPIC 11-13 | Tests E2E des frontends |

---

## 🔗 Références

| Document | Description |
|----------|-------------|
| [TASKS.md](../../TASKS.md) | Roadmap par EPIC/LOT |
| [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) | Classification P0-P3 |
| [BOUNDARIES.md](../architecture/BOUNDARIES.md) | Règles d'architecture |
| [docs/rgpd/README.md](../rgpd/README.md) | Navigation conformité RGPD |
| [scripts/audit/README.md](../../scripts/audit/README.md) | Scripts d'audit |

---

**Dernière mise à jour** : 2026-01-01 (sync EPIC 8)  
**Couverture tests** : 19 fichiers rgpd*.test.ts + 15+ autres = ~90% couverture RGPD
