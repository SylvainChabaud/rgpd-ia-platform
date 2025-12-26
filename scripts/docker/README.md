# Docker Scripts — RGPD IA Platform

> Scripts pour gérer la stack Docker de la plateforme RGPD-IA.

**LOT 6.0** — Stack IA Docker RGPD-ready

---

## 📁 Scripts disponibles

| Script | Description | Usage |
|--------|-------------|-------|
| `start.sh` | Démarrer la stack Docker | `./scripts/docker/start.sh` |
| `stop.sh` | Arrêter la stack Docker | `./scripts/docker/stop.sh` |
| `health-check.sh` | Vérifier l'état des services | `./scripts/docker/health-check.sh` |
| `init-secrets.sh` | Générer les secrets de production | `./scripts/docker/init-secrets.sh` |
| `security-check.sh` | Audit de sécurité Docker | `./scripts/docker/security-check.sh` |

---

## 🚀 `start.sh` — Démarrer la stack

**Description** : Démarre tous les services Docker (PostgreSQL, app, Ollama, reverse-proxy).

**Usage** :
```bash
# Production
./scripts/docker/start.sh

# Développement
./scripts/docker/start.sh --dev

# Forcer rebuild des images
./scripts/docker/start.sh --build

# Dev + rebuild
./scripts/docker/start.sh --dev --build
```

**Options** :
| Option | Description |
|--------|-------------|
| `--dev` | Utilise `docker-compose.dev.yml` |
| `--build` | Force la reconstruction des images |

**Prérequis** :
- Docker en cours d'exécution
- Fichier `.env` configuré
- Secrets générés (`init-secrets.sh` en prod)

**Services démarrés** :
| Service | Port | Description |
|---------|------|-------------|
| `db` | 5432 (interne) | PostgreSQL 16 |
| `app` | 3000 | Application Next.js |
| `ollama` | 11434 (interne) | LLM local |
| `reverse-proxy` | 80, 443 | Nginx (prod uniquement) |

---

## 🛑 `stop.sh` — Arrêter la stack

**Description** : Arrête tous les services Docker.

**Usage** :
```bash
# Production
./scripts/docker/stop.sh

# Développement
./scripts/docker/stop.sh --dev

# Supprimer les volumes (⚠️ SUPPRIME TOUTES LES DONNÉES)
./scripts/docker/stop.sh --clean
```

**Options** :
| Option | Description |
|--------|-------------|
| `--dev` | Utilise `docker-compose.dev.yml` |
| `--clean` | Supprime aussi les volumes (données) |

**⚠️ ATTENTION** : L'option `--clean` supprime définitivement :
- Base de données PostgreSQL
- Données Ollama (modèles téléchargés)
- Tous les volumes Docker

---

## ❤️ `health-check.sh` — Vérifier l'état

**Description** : Vérifie que tous les services sont en bonne santé.

**Usage** :
```bash
# Production
./scripts/docker/health-check.sh

# Développement
./scripts/docker/health-check.sh --dev
```

**Résultat** :
```
============================================================================
RGPD-IA Platform - Health Check
============================================================================

✓ Docker is running
✓ Services are running

============================================================================
Service Status
============================================================================

  ✓ db: healthy
  ✓ app: healthy
  ✓ ollama: healthy
  ✓ reverse-proxy: healthy
```

**Codes de sortie** :
| Code | Signification |
|------|---------------|
| `0` | Tous les services sont healthy |
| `1` | Au moins un service est unhealthy ou absent |

**Utilisation CI/CD** :
```yaml
healthcheck:
  script:
    - ./scripts/docker/health-check.sh
  allow_failure: false
```

---

## 🔐 `init-secrets.sh` — Générer les secrets

**Description** : Génère les secrets cryptographiques pour la production.

**Usage** :
```bash
./scripts/docker/init-secrets.sh
```

**⚠️ IMPORTANT** : À exécuter **une seule fois** lors du setup initial.

**Secrets générés** :
| Secret | Fichier | Usage |
|--------|---------|-------|
| Database password | `secrets/db_password.txt` | PostgreSQL |
| Session secret | `secrets/session_secret.txt` | Sessions utilisateur |
| JWT secret | `secrets/jwt_secret.txt` | Tokens JWT |
| Bootstrap secret | `secrets/bootstrap_platform_secret.txt` | API bootstrap |

**Sécurité** :
- Secrets générés avec `openssl rand -hex 32` (256 bits)
- Permissions restrictives (`chmod 600`)
- Dossier `secrets/` est gitignored

**Structure générée** :
```
secrets/
├── db_password.txt
├── session_secret.txt
├── jwt_secret.txt
└── bootstrap_platform_secret.txt
```

---

## 🔒 `security-check.sh` — Audit sécurité

**Description** : Vérifie la conformité sécurité de la stack Docker.

**Usage** :
```bash
# Production
./scripts/docker/security-check.sh

# Développement (checks relaxés)
./scripts/docker/security-check.sh --dev
```

**Vérifications effectuées** :
| Check | Production | Développement |
|-------|------------|---------------|
| Ports exposés (80/443 only) | ✅ Vérifié | ⏭️ Ignoré |
| Isolation réseau (internal networks) | ✅ Vérifié | ✅ Vérifié |
| Secrets dans les images | ✅ Vérifié | ✅ Vérifié |
| Secrets dans Git | ✅ Vérifié | ✅ Vérifié |
| Conteneurs non-root | ✅ Vérifié | ✅ Vérifié |
| TLS configuré | ✅ Vérifié | ⏭️ Ignoré |

**Résultat** :
```
============================================================================
RGPD-IA Platform - Security Check
============================================================================

Mode: Production

[1/6] Port Exposure Check
  ✓ PASS: Only 80/443 exposed

[2/6] Network Isolation Check
  ✓ PASS: rgpd_backend is internal
  ✓ PASS: rgpd_data is internal

[3/6] Secrets in Images Check
  ✓ PASS: No secrets in images

[4/6] Secrets in Git Check
  ✓ PASS: No secrets in repository

[5/6] Non-Root User Check
  ✓ PASS: All containers run as non-root

[6/6] TLS Configuration Check
  ✓ PASS: TLS 1.3 configured

============================================================================
FINAL RESULT: 6/6 passed, 0 failed, 0 warnings
============================================================================
```

**Codes de sortie** :
| Code | Signification |
|------|---------------|
| `0` | Tous les checks passés |
| `1` | Au moins un check échoué |

**Utilisation CI/CD** :
```yaml
security:
  script:
    - ./scripts/docker/security-check.sh
  allow_failure: false
```

---

## 🔄 Workflow typique

### Setup initial (production)

```bash
# 1. Générer les secrets
./scripts/docker/init-secrets.sh

# 2. Configurer .env
cp .env.example .env
# Éditer .env avec les valeurs de production

# 3. Démarrer la stack
./scripts/docker/start.sh

# 4. Vérifier la santé
./scripts/docker/health-check.sh

# 5. Audit sécurité
./scripts/docker/security-check.sh
```

### Développement quotidien

```bash
# Démarrer
./scripts/docker/start.sh --dev

# Vérifier
./scripts/docker/health-check.sh --dev

# Arrêter
./scripts/docker/stop.sh --dev
```

### Reset complet (dev uniquement)

```bash
# ⚠️ Supprime toutes les données !
./scripts/docker/stop.sh --dev --clean
./scripts/docker/start.sh --dev
pnpm migrate
```

---

## 🐳 Architecture Docker

### Production (`docker-compose.yml`)

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                             │
│                        │                                │
│                   ┌────▼────┐                           │
│                   │  nginx  │ :80, :443                 │
│                   │ (proxy) │                           │
│                   └────┬────┘                           │
│                        │                                │
│          ┌─────────────┼─────────────┐                  │
│          │    rgpd_frontend (internal)                  │
│          │             │                                │
│          │       ┌─────▼─────┐                          │
│          │       │    app    │ :3000                    │
│          │       │ (Next.js) │                          │
│          │       └─────┬─────┘                          │
│          │             │                                │
│     ┌────┴─────────────┴─────────────┐                  │
│     │         rgpd_backend (internal)                   │
│     │             │         │                           │
│     │       ┌─────▼───┐ ┌───▼────┐                      │
│     │       │   db    │ │ ollama │                      │
│     │       │ (pg16)  │ │ (LLM)  │                      │
│     │       └─────────┘ └────────┘                      │
│     │                                                   │
│     └───────────────────────────────────────────────────│
│                   rgpd_data (internal)                  │
└─────────────────────────────────────────────────────────┘
```

### Développement (`docker-compose.dev.yml`)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐        │
│  │   db    │     │   app   │     │ ollama  │        │
│  │ (pg16)  │     │(Next.js)│     │  (LLM)  │        │
│  └────┬────┘     └────┬────┘     └────┬────┘        │
│       │               │               │             │
│    :5432           :3000          :11434            │
│  (localhost)    (localhost)    (localhost)          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔗 Références

- [docker-compose.yml](../../docker-compose.yml) — Configuration production
- [docker-compose.dev.yml](../../docker-compose.dev.yml) — Configuration développement
- [Dockerfile](../../Dockerfile) — Image production
- [Dockerfile.dev](../../Dockerfile.dev) — Image développement
- [docs/runbooks/bootstrap.md](../../docs/runbooks/bootstrap.md) — Procédure de bootstrap
