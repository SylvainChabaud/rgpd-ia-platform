# Scripts — RGPD IA Platform

> Scripts utilitaires pour le développement, les opérations et l'audit RGPD.

---

## 📁 Structure

```
scripts/
├── README.md               # Ce fichier
├── migrate.ts              # Migrations base de données
├── purge.ts                # Purge RGPD (retention)
├── bench-llm.ts            # Benchmark performance LLM
├── check-rls.ts            # Diagnostic RLS configuration
├── check-user-role.ts      # Vérification rôle DB user
├── dev-start.ps1           # 🚀 Démarrage environnement dev (Windows)
├── dev-stop.ps1            # 🛑 Arrêt environnement dev (Windows)
├── dev-reset.ps1           # 🔄 Reset complet (suppression données)
├── update-test-credentials.ps1  # 🔑 Mise à jour identifiants test
├── audit/                  # Scripts d'audit RGPD (voir audit/README.md)
│   ├── collect-evidence.ts
│   ├── generate-audit-report.ts
│   ├── run-rgpd-tests.sh
│   ├── scan-secrets.sh
│   └── README.md
└── docker/                 # Scripts Docker (voir docker/README.md)
    ├── start.sh
    ├── stop.sh
    ├── health-check.sh
    ├── init-secrets.sh
    ├── security-check.sh
    └── README.md
```

---

### `dev-start.ps1` — Démarrage environnement de développement (Windows)

**Description** : Script PowerShell pour démarrer l'environnement de développement local.

**Commande** :
```powershell
.\scripts\dev-start.ps1
```

**Actions effectuées** :
1. Nettoyage des conteneurs existants
2. Démarrage PostgreSQL dans Docker (port 5432)
3. Attente que PostgreSQL soit prêt (5 secondes)
4. Exécution des migrations (`npm run migrate`)
5. Création des utilisateurs de test (`npm run test:e2e:setup`)
6. Démarrage Next.js dev server (`npm run dev`)

**Utilisateurs créés** :
- **Super Admin** : `admin@platform.local` / `AdminPass123!`
- **Tenant Admin** : `admin@tenant1.local` / `AdminPass123!`

**Quand l'utiliser** :
| Situation | Action |
|-----------|--------|
| Première installation | ✅ Obligatoire |
| Après `git pull` (nouvelles migrations) | ✅ Recommandé |
| Démarrage quotidien | ✅ Recommandé |

**Prérequis** :
- Docker Desktop installé et démarré
- PowerShell 5.1+ ou PowerShell Core 7+
- Port 3000 et 5432 disponibles

---

### `dev-stop.ps1` — Arrêt environnement de développement

**Description** : Arrête proprement l'environnement de développement.

**Commande** :
```powershell
.\scripts\dev-stop.ps1
```

**Actions effectuées** :
1. Arrêt Next.js (processus node)
2. Arrêt PostgreSQL (conteneur Docker)
3. Suppression du conteneur (données conservées dans volume)

**Note** : Les données PostgreSQL sont **conservées** dans le volume `rgpd-postgres-data`.

---

### `dev-reset.ps1` — Reset complet (⚠️ DESTRUCTIF)

**Description** : Supprime toutes les données et réinitialise l'environnement.

**Commande** :
```powershell
.\scripts\dev-reset.ps1
```

**⚠️ ATTENTION** : Ce script nécessite confirmation (`OUI`) et **SUPPRIME** :
- Toutes les données PostgreSQL (volume Docker)
- Le cache Next.js (dossier `.next`)
- Tous les conteneurs et processus

**Quand l'utiliser** :
| Situation | Action |
|-----------|--------|
| Reset base de données corrompue | ✅ |
| Problèmes de migrations | ✅ |
| Tests avec base vierge | ✅ |
| Quotidien | ❌ **NON** |

---

### `update-test-credentials.ps1` — Mise à jour identifiants de test

**Description** : Script interactif pour changer les identifiants de test E2E.

**Commande** :
```powershell
.\scripts\update-test-credentials.ps1
```

**Actions effectuées** :
1. Demande nouveaux identifiants (email, password)
2. Met à jour `tests/e2e/setup/seed-test-data.ts`
3. Propose de reseed la base de données

**Quand l'utiliser** :
| Situation | Action |
|-----------|--------|
| Personnaliser identifiants dev | ✅ |
| Sécuriser environnement partagé | ✅ |
| Tests avec credentials spécifiques | ✅ |

**Défauts** :
- Super Admin : `admin@platform.local` / `AdminPass123!`
- Tenant Admin : `admin@tenant1.local` / `AdminPass123!`

---

## 🔧 Scripts principaux

### `migrate.ts` — Migrations base de données

**Description** : Exécute les migrations SQL du dossier `migrations/` sur PostgreSQL.

**Commande** :
```bash
pnpm migrate
```

**Quand l'utiliser** :
| Situation | Action |
|-----------|--------|
| Après `pnpm install` (setup initial) | ✅ Obligatoire |
| Après `git pull` (nouvelles migrations) | ✅ Recommandé |
| En CI/CD (déploiement) | ✅ Automatique |
| Depuis le frontend (utilisateur) | ❌ Jamais |

**Prérequis** :
- PostgreSQL en cours d'exécution
- Variable `DATABASE_URL` configurée

**Conformité RGPD** :
- Logs P1 uniquement (versions migrations, pas de données sensibles)

---

### `check-rls.ts` — Diagnostic RLS

**Description** : Vérifie la configuration Row-Level Security (RLS) sur PostgreSQL.

**Commande** :
```bash
tsx scripts/check-rls.ts
```

**Quand l'utiliser** :
| Situation | Action |
|-----------|--------|
| Après application des migrations RLS | ✅ Recommandé |
| Débogage isolation tenant | ✅ Manuel |
| Validation avant mise en prod | ✅ Manuel |

**Vérifications effectuées** :
- RLS activé sur chaque table (`relrowsecurity`)
- FORCE RLS activé (`relforcerowsecurity`)
- Policies définies par table
- Test de la fonction `current_tenant_id()`

---

### `check-user-role.ts` — Vérification rôle DB

**Description** : Vérifie si l'utilisateur DB courant contourne RLS (superuser/BYPASSRLS).

**Commande** :
```bash
tsx scripts/check-user-role.ts
```

**Quand l'utiliser** :
| Situation | Action |
|-----------|--------|
| Avant exécution tests RLS | ✅ Recommandé |
| Vérification config PostgreSQL | ✅ Manuel |

**⚠️ Important** :
- Si `usebypassrls = true` → Les politiques RLS sont ignorées !
- Utilisez `testuser` (non-superuser) pour les vrais tests RLS.

---

### `purge.ts` — Purge RGPD (rétention)

**Description** : Supprime les données expirées selon la politique de rétention RGPD.

**Commandes** :
```bash
pnpm purge              # Purge complète (tous les tenants)
pnpm purge:dry-run      # Prévisualisation (aucune suppression)
pnpm purge:tenant <id>  # Purge un seul tenant
```

**Quand l'utiliser** :
| Situation | Action |
|-----------|--------|
| Production (CRON quotidien) | ✅ Automatisé |
| Nettoyage environnement de test | ✅ Manuel |
| Maintenance avant audit | ✅ Manuel |
| Depuis le frontend (utilisateur) | ❌ Jamais |

**Politique de rétention** :
| Type de données | Rétention | Source |
|-----------------|-----------|--------|
| AI jobs (résultats) | 90 jours | RGPD Art. 5 |
| Sessions utilisateur | 30 jours | Sécurité |
| Audit trails | 3 ans | RGPD Art. 30 |
| Consentements | ∞ (jamais purgés) | RGPD Art. 7 |

**Conformité RGPD** :
- Idempotent (safe à relancer)
- Logs P1 uniquement (compteurs, pas de PII)
- Ne supprime PAS les audit trails ni les consentements

---

### `bench-llm.ts` — Benchmark LLM

**Description** : Mesure la latence du Gateway LLM (p50, p95, p99) avec des prompts fictifs.

**Commande** :
```bash
# Avec Ollama local
AI_PROVIDER=ollama tsx scripts/bench-llm.ts

# Avec mock (tests)
AI_PROVIDER=stub tsx scripts/bench-llm.ts
```

**Quand l'utiliser** :
| Situation | Action |
|-----------|--------|
| Évaluation nouveau provider LLM | ✅ Manuel |
| Validation après config Ollama | ✅ Manuel |
| Tests de régression performance | ✅ CI (optionnel) |
| Depuis le frontend | ❌ Jamais |

**Conformité RGPD** :
- ✅ Prompts fictifs uniquement (données P0, non personnelles)
- ✅ Aucun stockage des résultats (console uniquement)
- ✅ Conforme `DATA_CLASSIFICATION.md` et `LLM_USAGE_POLICY.md`

**Résultats** :
```
=== Benchmark Results ===
Latency statistics:
  Min:  120ms
  P50:  245ms
  P95:  890ms
  P99:  1.2s
  Max:  1.5s
```

---

## 📂 Sous-dossiers

### `/scripts/audit` — Audit RGPD

Scripts d'automatisation pour la conformité RGPD et les audits CNIL.

📖 **Documentation complète** : [scripts/audit/README.md](audit/README.md)

| Script | Commande | Description |
|--------|----------|-------------|
| `scan-secrets.sh` | `pnpm audit:secrets` | Scan secrets hardcodés |
| `run-rgpd-tests.sh` | `pnpm audit:rgpd-tests` | Tests RGPD spécifiques |
| `collect-evidence.ts` | `pnpm audit:collect` | Collecte preuves d'audit |
| `generate-audit-report.ts` | `pnpm audit:report` | Rapport consolidé |
| — | **`pnpm audit:full`** | **🚀 Audit complet** |

---

### `/scripts/docker` — Docker Operations

Scripts pour démarrer, arrêter et vérifier la stack Docker.

📖 **Documentation complète** : [scripts/docker/README.md](docker/README.md)

| Script | Description |
|--------|-------------|
| `start.sh` | Démarrer la stack (prod ou dev) |
| `stop.sh` | Arrêter la stack |
| `health-check.sh` | Vérifier l'état des services |
| `init-secrets.sh` | Générer les secrets Docker |
| `security-check.sh` | Audit sécurité Docker |

---

## 🎯 Récapitulatif : Qui utilise quoi ?

| Script | Développeur | DevOps | CI/CD | Frontend |
|--------|-------------|--------|-------|----------|
| `migrate` | ✅ | ✅ | ✅ | ❌ |
| `purge` | ✅ | ✅ | ✅ | ❌ |
| `bench-llm` | ✅ | — | — | ❌ |
| `dev-start.ps1` | ✅ | — | — | ❌ |
| `dev-stop.ps1` | ✅ | — | — | ❌ |
| `dev-reset.ps1` | ✅ | — | — | ❌ |
| `update-test-credentials.ps1` | ✅ | — | — | ❌ |
| `audit/*` | ✅ | ✅ | ✅ | ❌ |
| `docker/*` | ✅ | ✅ | ✅ | ❌ |

---

## 🔗 Références

- [TASKS.md](../TASKS.md) — Suivi des tâches par EPIC/LOT
- [docs/runbooks/](../docs/runbooks/) — Procédures opérationnelles
- [docs/rgpd/](../docs/rgpd/) — Documentation RGPD
