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

## 🚀 Démarrage rapide

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

| Document | Description |
|----------|-------------|
| [registre-traitements.md](docs/rgpd/registre-traitements.md) | Registre des traitements (Art. 30) |
| [dpia.md](docs/rgpd/dpia.md) | Analyse d'impact Gateway LLM (Art. 35) |
| [evidence.md](docs/audit/evidence.md) | Cartographie des preuves d'audit |

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

### Principes clés

- **Privacy by Design** : RGPD intégré dès la conception
- **Minimisation** : Aucune donnée sensible stockée par défaut
- **Isolation** : Tenant ID obligatoire sur toutes les requêtes
- **Row-Level Security** : Isolation PostgreSQL au niveau DB (défense en profondeur)
- **Traçabilité** : Audit trail RGPD-safe (pas de PII dans les logs)
- **Chiffrement** : AES-256-GCM au repos, TLS 1.3 en transit
- **Classification** : Données P0-P3 avec rejet automatique des données P3 (Art. 9)

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

### Catégories de tests

- `tests/rgpd.*.test.ts` — Tests de conformité RGPD (consent, deletion, export, PII)
- `tests/db.*.test.ts` — Tests isolation base de données (RLS, cross-tenant)
- `tests/http.*.test.ts` — Tests API (auth, authz, tenant, HTTPS)
- `tests/llm.*.test.ts` — Tests LLM policy enforcement
- `tests/storage.*.test.ts` — Tests classification des données (P0-P3)
- `tests/retention.*.test.ts` — Tests rétention automatique (Art. 5)
- `tests/runtime.*.test.ts` — Tests isolation réseau AI runtime
- `tests/api.e2e.*.test.ts` — Tests E2E routes critiques
- `tests/docker.*.test.ts` — Tests infrastructure Docker

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

