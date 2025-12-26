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
| `audit/*` | ✅ | ✅ | ✅ | ❌ |
| `docker/*` | ✅ | ✅ | ✅ | ❌ |

---

## 🔗 Références

- [TASKS.md](../TASKS.md) — Suivi des tâches par EPIC/LOT
- [docs/runbooks/](../docs/runbooks/) — Procédures opérationnelles
- [docs/rgpd/](../docs/rgpd/) — Documentation RGPD
