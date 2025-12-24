# Docker Development Environment — Quick Start Guide

**Version** : 1.0
**LOT** : 2.1 (EPIC 2 — Durcissement serveur & réseau)
**Date** : 2025-12-24
**Environnement** : **DEVELOPMENT ONLY** (not production-ready)

---

## Objectif

Ce guide décrit comment démarrer l'environnement de développement local de la plateforme RGPD-IA-Platform avec Docker Compose.

**Périmètre** :
- PostgreSQL 16 (base de données, **non exposée publiquement**)
- Next.js application (API backend, exposée sur `localhost:3000`)
- Réseau isolé `rgpd_internal`
- Volumes persistants pour PostgreSQL

**⚠️ IMPORTANT** : Cet environnement est **DEV-ONLY**. Pour production, voir [security-hardening.md](security-hardening.md) et LOT 6.0.

---

## 1. Prérequis

### 1.1 Logiciels requis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 20.10+ (ou Docker Engine + Docker Compose)
- Git (pour cloner le repo)
- (Optionnel) pgAdmin / DBeaver (pour explorer la DB en dev)

**Vérification** :
```bash
docker --version         # Docker version 20.10.0+
docker compose version   # Docker Compose version v2.0.0+
```

---

### 1.2 Fichier `.env`

Le fichier `.env` **n'est pas versionné** (`.gitignore`). Il doit être créé localement depuis `.env.example`.

**Commande** :
```bash
# Copier template
cp .env.example .env

# (Optionnel) Modifier DB credentials si nécessaire
nano .env
```

**Contenu par défaut** :
```env
DB_USER=devuser
DB_PASSWORD=devpass
DB_NAME=rgpd_platform
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

**⚠️ Secrets de production** : En production, utiliser HashiCorp Vault ou secrets manager (voir [security-hardening.md](security-hardening.md)).

---

## 2. Démarrage rapide

### 2.1 Build et démarrage

```bash
# Build et démarrage en arrière-plan
docker compose -f docker-compose.dev.yml up --build -d

# Première exécution : migrations SQL appliquées automatiquement
# (volume ./migrations monté dans /docker-entrypoint-initdb.d)
```

**Sortie attendue** :
```
[+] Running 4/4
 ✔ Network rgpd-ia-platform_rgpd_internal  Created
 ✔ Volume "rgpd-ia-platform_postgres_data" Created
 ✔ Container rgpd-platform-db-dev          Started
 ✔ Container rgpd-platform-app-dev         Started
```

---

### 2.2 Vérification santé services

```bash
docker compose -f docker-compose.dev.yml ps
```

**Résultat attendu** :
```
NAME                     STATUS         PORTS
rgpd-platform-app-dev    Up (healthy)   0.0.0.0:3000->3000/tcp
rgpd-platform-db-dev     Up (healthy)   (none)
```

**Note** : DB **non exposée** (aucun port public). Accès uniquement depuis container `app`.

---

### 2.3 Accès services

| Service | URL | Accès |
|---------|-----|-------|
| **Next.js App (API)** | http://localhost:3000 | Public (localhost) |
| **PostgreSQL** | `db:5432` | **Interne uniquement** (réseau Docker) |

**Test accès app** :
```bash
curl http://localhost:3000
# Doit renvoyer erreur 404 (pas de route "/" définie) ou page Next.js
```

**Test isolation DB** :
```bash
curl http://localhost:5432
# Doit échouer: "Connection refused" (port non exposé)
```

---

## 3. Logs et débugging

### 3.1 Logs en temps réel

```bash
# Tous les services
docker compose -f docker-compose.dev.yml logs -f

# Service spécifique
docker compose -f docker-compose.dev.yml logs -f app
docker compose -f docker-compose.dev.yml logs -f db
```

**Logs RGPD-safe** : Seuls les événements techniques sont loggés (pas de données métier, cf. `src/shared/logger.ts`).

---

### 3.2 Accès shell container

```bash
# Shell dans app (Next.js)
docker exec -it rgpd-platform-app-dev sh

# Shell dans DB (PostgreSQL)
docker exec -it rgpd-platform-db-dev sh
```

**Exemple debug DB** :
```bash
docker exec -it rgpd-platform-db-dev psql -U devuser -d rgpd_platform
# \dt  (list tables)
# SELECT * FROM tenants;
# \q   (quit)
```

---

## 4. Debug DB : Exposition temporaire port 5432

**⚠️ Pour développement uniquement** : Exposer PostgreSQL pour pgAdmin/DBeaver.

### Option 1 : Modifier `docker-compose.dev.yml` temporairement

**Décommenter ligne 24** :
```yaml
db:
  # NO ports exposed (internal only)
  ports: ["127.0.0.1:5432:5432"]  # UNCOMMENTED for dev debug
```

**Restart service** :
```bash
docker compose -f docker-compose.dev.yml restart db
```

**Connexion pgAdmin** :
- Host: `localhost`
- Port: `5432`
- User: `devuser`
- Password: `devpass`
- Database: `rgpd_platform`

**⚠️ Important** : Recommenter après debug (sécurité).

---

### Option 2 : Port forwarding temporaire

```bash
# Port forwarding sans modifier compose file
docker run -it --rm --network rgpd-ia-platform_rgpd_internal \
  -p 5432:5432 \
  alpine/socat \
  TCP-LISTEN:5432,fork,reuseaddr \
  TCP:db:5432
```

---

## 5. Arrêt et nettoyage

### 5.1 Arrêt services

```bash
# Arrêt sans suppression volumes
docker compose -f docker-compose.dev.yml down

# Arrêt + suppression volumes (⚠️ données perdues)
docker compose -f docker-compose.dev.yml down -v
```

---

### 5.2 Nettoyage complet

```bash
# Supprimer images Docker inutilisées
docker image prune -a

# Supprimer volumes orphelins
docker volume prune

# Nettoyage global (⚠️ affecte tous les projets Docker)
docker system prune -a --volumes
```

---

## 6. Troubleshooting

### 6.1 Erreur : "Port 3000 already in use"

**Cause** : Un autre processus utilise le port 3000.

**Solution** :
```bash
# Identifier processus
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Arrêter processus ou changer port dans docker-compose.dev.yml
ports:
  - "3001:3000"  # Expose app sur localhost:3001
```

---

### 6.2 Erreur : "Database healthcheck failed"

**Cause** : PostgreSQL n'a pas démarré correctement.

**Vérification** :
```bash
docker compose -f docker-compose.dev.yml logs db
```

**Solutions** :
- Vérifier `.env` (DB_USER, DB_PASSWORD, DB_NAME corrects)
- Supprimer volume et redémarrer :
  ```bash
  docker compose -f docker-compose.dev.yml down -v
  docker compose -f docker-compose.dev.yml up --build -d
  ```

---

### 6.3 Erreur : "Migrations not applied"

**Cause** : Volume `./migrations` non monté ou SQL invalide.

**Vérification** :
```bash
# Vérifier volume monté
docker inspect rgpd-platform-db-dev | grep -A 5 Mounts

# Vérifier logs DB
docker compose -f docker-compose.dev.yml logs db | grep -i error
```

**Solution** :
- Vérifier fichiers dans `./migrations/*.sql`
- Recréer DB :
  ```bash
  docker compose -f docker-compose.dev.yml down -v
  docker compose -f docker-compose.dev.yml up --build -d
  ```

---

### 6.4 Erreur : "npm ci failed" (build app)

**Cause** : `package.json` ou `package-lock.json` invalides.

**Solution** :
```bash
# Rebuild image sans cache
docker compose -f docker-compose.dev.yml build --no-cache app

# Vérifier logs build
docker compose -f docker-compose.dev.yml logs app
```

---

## 7. Architecture réseau

### 7.1 Réseau `rgpd_internal`

```
┌─────────────────────────────────────────┐
│ Host (développeur)                      │
│   ↓ http://localhost:3000               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Docker Network: rgpd_internal           │
│  (bridge mode, internal: false)         │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │ app          │───→│ db           │  │
│  │ Next.js:3000 │    │ Postgres:5432│  │
│  │ (exposé)     │    │ (NON exposé) │  │
│  └──────────────┘    └──────────────┘  │
│                                         │
│  Volume: postgres_data (persistance)   │
└─────────────────────────────────────────┘
```

**Caractéristiques** :
- `internal: false` : Permet accès internet (npm install, API externes)
- DB **non exposée** : Accessible uniquement via réseau interne
- App **exposée** : Port 3000 mappé sur localhost

---

### 7.2 Volumes

| Volume | Montage | Persistance | Usage |
|--------|---------|-------------|-------|
| `postgres_data` | `/var/lib/postgresql/data` | ✅ Oui (nommé) | Données PostgreSQL |
| `./migrations` | `/docker-entrypoint-initdb.d:ro` | ❌ Non (bind mount) | Init SQL scripts |
| `.:/app` | `/app` | ❌ Non (bind mount) | Hot-reload Next.js |

**Note** : Volume `postgres_data` persiste entre redémarrages. Suppression via `docker compose down -v`.

---

## 8. Conformité sécurité (références)

### 8.1 Sécurité dev vs production

| Aspect | Dev (LOT 2.1) | Production (LOT 6.0) |
|--------|---------------|----------------------|
| DB port exposé | ❌ Non (interne) | ❌ Non (strict) |
| Credentials | `.env` (non versionné) | Vault / Docker secrets |
| TLS | ❌ Non (localhost) | ✅ Oui (obligatoire) |
| User container | `nextjs:nodejs` (non-root) | `nextjs:nodejs` (non-root) |
| Réseau | `internal: false` (npm) | `internal: true` (strict) |
| Healthchecks | ✅ Basiques | ✅ Avancés |

**Référence** : [security-hardening.md](security-hardening.md)

---

### 8.2 Secrets management

**Dev** :
- Credentials hardcodés dans `.env` (acceptable pour dev local)
- `.env` **non versionné** (`.gitignore`)
- Scan secrets via `npm run audit:secrets` (gate CI/CD)

**Production** :
- HashiCorp Vault ou secrets manager cloud
- Rotation régulière (90j)
- Pas de secrets en logs/audit

**Référence** : [security-hardening.md § 5. Gestion des secrets](security-hardening.md#5-gestion-des-secrets)

---

### 8.3 Logs RGPD-safe

**Garanties** :
- Logs = événements techniques uniquement (pas de payloads)
- Guards runtime dans `src/shared/logger.ts`
- Clés interdites : `password`, `token`, `email`, `prompt`, `content`, etc.

**Test** :
```bash
npm test -- tests/rgpd.no-sensitive-logs.test.ts
```

**Référence** : [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md)

---

## 9. Commandes utiles

### 9.1 Développement quotidien

```bash
# Démarrer environnement
docker compose -f docker-compose.dev.yml up -d

# Logs en temps réel
docker compose -f docker-compose.dev.yml logs -f

# Restart app (après modif code non hot-reloadable)
docker compose -f docker-compose.dev.yml restart app

# Arrêter environnement
docker compose -f docker-compose.dev.yml down
```

---

### 9.2 Maintenance DB

```bash
# Accès psql
docker exec -it rgpd-platform-db-dev psql -U devuser -d rgpd_platform

# Dump DB (backup)
docker exec rgpd-platform-db-dev pg_dump -U devuser rgpd_platform > backup.sql

# Restore DB
cat backup.sql | docker exec -i rgpd-platform-db-dev psql -U devuser -d rgpd_platform
```

---

### 9.3 Tests & qualité

```bash
# Lint + typecheck + tests (depuis host)
npm run lint
npm run typecheck
npm test

# Scan secrets
npm run audit:secrets

# Tests RGPD uniquement
npm run test:rgpd
```

---

## 10. Références normatives

| Document | Rôle | Lien |
|----------|------|------|
| **TASKS.md** | Roadmap LOT 2.1 | [TASKS.md](../../TASKS.md) |
| **CLAUDE.md** | Règles développement | [CLAUDE.md](../../CLAUDE.md) |
| **security-hardening.md** | Checklist production | [security-hardening.md](security-hardening.md) |
| **backup-policy.md** | Stratégie sauvegarde | [backup-policy.md](backup-policy.md) |
| **BOUNDARIES.md** | Frontières architecture | [../architecture/BOUNDARIES.md](../architecture/BOUNDARIES.md) |
| **DATA_CLASSIFICATION.md** | Classification P0-P3 | [../data/DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) |

---

## 11. Prochaines étapes (LOT 6.0)

**LOT 6.0 — Docker prod-ready** :
- `docker-compose.yml` production (vs dev)
- Secrets via Docker secrets / Vault
- TLS/HTTPS obligatoire (reverse proxy Nginx/Caddy)
- Réseau strict (`internal: true`)
- Multi-stage build (optimisation taille images)
- Healthchecks avancés
- Observabilité RGPD-safe (logs centralisés, métriques)

---

**Document maintenu par** : Équipe Dev & Ops
**Dernière mise à jour** : 2025-12-24
**Version** : 1.0 (LOT 2.1)
