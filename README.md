# RGPD IA Platform

> **Plateforme SaaS multi-tenant de conformité RGPD pour l'IA** — Gateway LLM sécurisé avec isolation stricte des données.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.x-black)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red)]()

---

## 🎯 Vision

Cette plateforme permet aux entreprises d'utiliser des services LLM (OpenAI, Ollama, etc.) tout en garantissant la **conformité RGPD** :

- **Isolation multi-tenant** : Chaque organisation a ses données strictement isolées
- **Gateway LLM centralisé** : Aucun appel IA hors du gateway (traçabilité, contrôle)
- **Droits RGPD complets** : Export, effacement, consentement, portabilité
- **Audit-ready** : Preuves automatisées pour contrôle CNIL

---

## �️ Je suis perdu(e), par où commencer ?

**Le projet est devenu gros (492+ tests, 33 LOTs, 10 EPICs).** 

📖 **Lire d'abord** : [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) — Explique simplement :
- **Scripts/** : Qui les utilise ? Quand ?
- **Migrations/** : Comment ça marche ?
- **Runbooks/** : Quand les lire ?
- **Code** : Comment s'imbrique tout ?
- **TODOs** : Qu'est-ce qui reste à faire ?

Ensuite, choisissez votre rôle :
- 👨‍💼 **DevOps** : Lire `ARCHITECTURE_GUIDE.md` → `docs/runbooks/bootstrap.md`
- 👨‍💻 **Dev** : Lire `ARCHITECTURE_GUIDE.md` → `docs/architecture/BOUNDARIES.md`
- 👮 **DPO/RSSI** : Lire `ARCHITECTURE_GUIDE.md` → `docs/runbooks/incident.md`

---

## �🚀 Démarrage rapide

### Prérequis

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 16 (via Docker)

### Installation

```bash
# Cloner le projet
git clone <repo-url>
cd rgpd-ia-platform

# Installer les dépendances
pnpm install

# Démarrer l'infrastructure (PostgreSQL, etc.)
docker-compose -f docker-compose.dev.yml up -d

# Appliquer les migrations
pnpm migrate

# Lancer le serveur de développement
pnpm dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## 📁 Structure du projet

```
├── app/                    # Next.js App Router (pages, API routes)
├── src/
│   ├── ai/                 # Gateway LLM (providers, enforcement, PII)
│   │   └── gateway/        # Gateway centralisé + useCasePolicy
│   ├── domain/             # Logique métier (use cases, entities)
│   │   ├── data-classification/  # Classification P0-P3 (Art. 9 RGPD)
│   │   ├── retention/      # Politiques de rétention
│   │   └── rgpd/           # Entités RGPD
│   ├── infrastructure/     # Repositories, services externes
│   │   ├── db/             # PostgreSQL + tenantContext (RLS)
│   │   └── pii/            # Détection/masquage PII
│   ├── lib/                # Utilitaires partagés
│   └── middleware/         # Middlewares (auth, tenant, etc.)
├── tests/                  # Tests (unitaires, intégration, RGPD)
├── scripts/
│   ├── audit/              # Scripts d'audit RGPD
│   ├── docker/             # Scripts Docker
│   ├── migrate.ts          # Migrations DB
│   ├── purge.ts            # Purge données (retention)
│   ├── check-rls.ts        # Diagnostic RLS
│   └── check-user-role.ts  # Vérification rôle DB
├── docs/                   # Documentation complète
│   ├── architecture/       # Architecture & boundaries
│   ├── rgpd/               # Registre, DPIA, politiques
│   ├── runbooks/           # Procédures opérationnelles
│   └── implementation/     # Spécifications par LOT
└── migrations/             # Scripts SQL (001-013+)
```

---

## 🔧 Scripts disponibles

### Développement

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Serveur de développement (hot reload) |
| `pnpm build` | Build production |
| `pnpm start` | Démarrer en production |
| `pnpm lint` | Linter ESLint |
| `pnpm typecheck` | Vérification TypeScript |
| `pnpm test` | Exécuter tous les tests |

### Base de données

| Commande | Description |
|----------|-------------|
| `pnpm migrate` | Appliquer les migrations |
| `pnpm purge` | Purger les données expirées (retention RGPD) |

### 🔍 Audit RGPD

| Commande | Description |
|----------|-------------|
| `pnpm audit:secrets` | Scan des secrets hardcodés |
| `pnpm audit:rgpd-tests` | Tests RGPD spécifiques |
| `pnpm audit:collect` | Collecter toutes les preuves d'audit |
| `pnpm audit:report` | Générer le rapport d'audit consolidé |
| **`pnpm audit:full`** | **🚀 Audit complet (collecte + rapport)** |

> 📖 Documentation complète des scripts d'audit : [scripts/audit/README.md](scripts/audit/README.md)

---

## 📚 Documentation

### Architecture & Technique

| Document | Description |
|----------|-------------|
| [BOUNDARIES.md](docs/architecture/BOUNDARIES.md) | Règles d'architecture et frontières |
| [DATA_CLASSIFICATION.md](docs/data/DATA_CLASSIFICATION.md) | Classification des données (P0-P3) |
| [LLM_USAGE_POLICY.md](docs/ai/LLM_USAGE_POLICY.md) | Politique d'utilisation des LLM |

### Conformité RGPD

| Document | Description | Statut |
|----------|-------------|--------|
| [RGPD_ARTICLES_EXHAUSTIFS.md](docs/rgpd/RGPD_ARTICLES_EXHAUSTIFS.md) | **Matrice EXHAUSTIVE tous articles (1-99)** | ✅ **Analyse complète** |
| [RGPD_COVERAGE_EPICS_1_8.md](docs/rgpd/RGPD_COVERAGE_EPICS_1_8.md) | **Mapping exhaustif EPICs 1-8 (Audit 2026-01-01)** | ✅ **32/45 articles** |
| [registre-traitements.md](docs/rgpd/registre-traitements.md) | Registre des traitements (Art. 30) | ✅ 5 traitements |
| [dpia.md](docs/rgpd/dpia.md) | Analyse d'impact Gateway LLM (Art. 35) | ✅ 5 risques évalués |
| [DPA_TEMPLATE.md](docs/legal/DPA_TEMPLATE.md) | Data Processing Agreement (Art. 28) | ✅ Template prêt |
| [evidence.md](docs/audit/evidence.md) | Cartographie des preuves d'audit | ✅ 100% |

### Procédures opérationnelles

| Document | Description |
|----------|-------------|
| [incident.md](docs/runbooks/incident.md) | Runbook incident RGPD (Art. 33-34) |
| [bootstrap.md](docs/runbooks/bootstrap.md) | Bootstrap de la plateforme |
| [backup-policy.md](docs/runbooks/backup-policy.md) | Politique de sauvegarde |

### Spécifications fonctionnelles

| Document | Description |
|----------|-------------|
| [PLATEFORME_VISION_MACRO.md](docs/epics/PLATEFORME_VISION_MACRO.md) | Vision macro de la plateforme |
| [TASKS.md](TASKS.md) | Suivi des tâches par EPIC/LOT |
| [docs/implementation/](docs/implementation/) | Spécifications détaillées par LOT |

---

## 🛡️ Sécurité & RGPD

### Statut de conformité

**Audit consolidation EPICs 1-9 (2026-01-01)**

| Dimension | Score | Tests | Statut |
|-----------|-------|-------|--------|
| **Backend Core** | ✅ 100% | 252+ tests | EPICs 1-7 complets |
| **Anonymisation** | ✅ 100% | 110 tests | EPIC 8 complet |
| **Security & Incidents** | ✅ 100% | 60 tests | EPIC 9 complet |
| **Legal & Compliance** | ✅ 100% | 180 tests | EPIC 10 complet |
| **Couverture globale** | ✅ 96% | 43/45 articles | Production-ready |

**Articles conformes (43/45)**
- ✅ **Art. 5** : Tous principes (minimisation, retention, intégrité) - 100%
- ✅ **Art. 6-7** : Licéité, consentement opt-in/revoke, CGU acceptance - 100%
- ✅ **Art. 13-14** : Transparence, information (Politique confidentialité, pages légales) - 100%
- ✅ **Art. 15-17, 19-20** : Droits accès, rectification, effacement, portabilité - 100%
- ✅ **Art. 18** : Limitation du traitement (suspension données) - 100%
- ✅ **Art. 21** : Droit d'opposition - 100%
- ✅ **Art. 22** : Révision humaine décisions IA (dispute workflow) - 100%
- ✅ **Art. 24-25** : Accountability, Privacy by Design - 100%
- ✅ **Art. 28-30** : DPA sous-traitant, Registre traitements - 100%
- ✅ **Art. 32** : Sécurité (RLS, chiffrement, PII masking, IP anonymization, pentest, chaos) - 100%
- ✅ **Art. 33-34** : Notification violations (CNIL 72h, utilisateurs) - 100%
- ✅ **Art. 35** : DPIA Gateway LLM - 100%
- ✅ **ePrivacy 5.3** : Cookie consent banner - 100%

**Articles restants (2 - Intégrations frontend futures)**
- 🟢 **Art. 12** : Exercice facilité des droits (interfaces frontend EPIC 13)
- 🟢 **Art. 23** : Restrictions légales (cas particuliers)

### Principes clés

- **Privacy by Design** : RGPD intégré dès la conception
- **Minimisation** : Aucune donnée sensible stockée par défaut
- **Isolation** : Tenant ID obligatoire sur toutes les requêtes
- **Row-Level Security** : Isolation PostgreSQL au niveau DB (défense en profondeur)
- **Traçabilité** : Audit trail RGPD-safe (pas de PII dans les logs)
- **Chiffrement** : AES-256-GCM au repos, TLS 1.3 en transit
- **Classification** : Données P0-P3 avec rejet automatique des données P3 (Art. 9)
- **Pseudonymisation PII** : Détection et masking automatique avant LLM (EPIC 8)
- **Anonymisation IP** : Logs > 7j anonymisés automatiquement (EPIC 8)

### Défense en profondeur (RLS)

```bash
# Vérifier la configuration RLS
tsx scripts/check-rls.ts

# Vérifier les privilèges de l'utilisateur DB
tsx scripts/check-user-role.ts
```

### Workflow d'audit

```bash
# Générer un rapport d'audit complet
pnpm audit:full

# Artefacts générés dans audit-artifacts/
# - audit-report-YYYY-MM-DD.md  ← Rapport principal
# - compliance-checklist.md     ← Checklist DoD
# - metadata.json               ← Métadonnées traçabilité
# - coverage/                   ← Couverture tests
```

---

## 🧪 Tests

```bash
# Tous les tests
pnpm test

# Tests avec couverture
pnpm test -- --coverage

# Tests RGPD uniquement
pnpm audit:rgpd-tests

# Tests en watch mode
pnpm test -- --watch
```

### Couverture de tests actuelle

**✅ Objectif 80% atteint : 82.39% (branches)**
- **Test Suites** : 57 passed (59 total)
- **Tests** : 822 passed (840 total)
- **Statements** : 89.9%
- **Branches** : **82.39%**
- **Functions** : 91.69%
- **Lines** : 90.91%

### Catégories de tests

- `tests/rgpd.*.test.ts` — Tests de conformité RGPD (consent, deletion, export, PII, incidents)
- `tests/db.*.test.ts` — Tests isolation base de données (RLS, cross-tenant, repositories)
- `tests/http.*.test.ts` — Tests API (auth, authz, tenant, HTTPS)
- `tests/llm.*.test.ts` — Tests LLM policy enforcement
- `tests/storage.*.test.ts` — Tests classification des données (P0-P3)
- `tests/retention.*.test.ts` — Tests rétention automatique (Art. 5)
- `tests/runtime.*.test.ts` — Tests isolation réseau AI runtime
- `tests/api.e2e.*.test.ts` — Tests E2E routes critiques
- `tests/docker.*.test.ts` — Tests infrastructure Docker
- `tests/chaos.*.test.ts` — Tests résilience et chaos engineering (EPIC 9.2)
- `tests/security.*.test.ts` — Tests scanning sécurité (EPIC 9.1)

---

## 🐳 Docker

### Développement

```bash
# Démarrer PostgreSQL et services
docker-compose -f docker-compose.dev.yml up -d

# Voir les logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Production

```bash
# Build et démarrer
docker-compose up -d --build

# Vérifier le statut
docker-compose ps
```

---

## 📄 Licence

Propriétaire — Tous droits réservés.

---

## 🔗 Liens utiles

- [Next.js Documentation](https://nextjs.org/docs)
- [CNIL — RGPD](https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on)
- [RGPD — Texte officiel](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32016R0679)

