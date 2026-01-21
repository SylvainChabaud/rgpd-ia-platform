# Guide de Setup - Environnement de Développement

Ce guide explique comment configurer votre environnement de développement local pour le projet RGPD-IA Platform.

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé:

- **Docker Desktop** (version 20.10+)
  - Windows: [Télécharger Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Doit être démarré avant d'exécuter les scripts
- **Node.js** (version 18.x ou 20.x LTS)
  - Recommandé: [Node.js 20 LTS](https://nodejs.org/)
- **npm** (version 9+ inclus avec Node.js)
- **Git** pour le contrôle de version

### Vérifier les installations

```bash
# Vérifier Docker
docker --version
docker-compose --version

# Vérifier Node.js et npm
node --version
npm --version
```

---

## 🚀 Setup Rapide (Recommandé)

### 1. Cloner le dépôt

```bash
git clone <repository-url>
cd rgpd-ia-platform
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Créer le fichier .env

Copiez le template et personnalisez si nécessaire:

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

**Note**: Les valeurs par défaut dans `.env.example` fonctionnent pour le développement local. Vous pouvez les personnaliser si besoin.

### 4. Lancer le setup complet

#### Sur Windows

```bash
.\setup-dev.bat
```

#### Sur Linux/Mac (à venir)

```bash
./setup-dev.sh
```

**Ce script fait TOUT pour vous:**
- ✅ Nettoie Docker (conteneurs + volumes)
- ✅ Lance PostgreSQL
- ✅ Attend que la DB soit prête
- ✅ Exécute toutes les migrations SQL (17 fichiers)
- ✅ Crée un Super Admin
- ✅ Crée un tenant de test ("Acme Corp")
- ✅ Crée un Tenant Admin

**Durée**: ~45 secondes (premier lancement) / ~30 secondes (suivants)

### 5. Démarrer l'application

```bash
npm run dev
```

Ouvrez votre navigateur: **http://localhost:3000**

---

## 🔑 Comptes par défaut

Après le setup, vous pouvez vous connecter avec:

### Super Admin (Accès plateforme complète)

| Champ | Valeur |
|-------|--------|
| **Email** | `admin@platform.local` |
| **Password** | `Admin1234` |
| **Rôle** | SUPER_ADMIN |
| **Scope** | PLATFORM |
| **Permissions** | Gestion tenants, users, monitoring global |

### Tenant Admin (Accès tenant "Acme Corp")

| Champ | Valeur |
|-------|--------|
| **Email** | `admin@acme.local` |
| **Password** | `Admin1234` |
| **Rôle** | TENANT_ADMIN |
| **Scope** | TENANT |
| **Tenant** | Acme Corp (slug: `acme`) |
| **Permissions** | Gestion users du tenant, RGPD requests, AI jobs |

---

## 📝 Personnaliser les credentials

Vous pouvez personnaliser les credentials de test dans le fichier `.env`:

```bash
# Test Credentials (For E2E tests and local development)
TEST_PLATFORM_ADMIN_EMAIL=admin@platform.local
TEST_PLATFORM_ADMIN_PASSWORD=Admin1234
TEST_PLATFORM_ADMIN_NAME=Platform Administrator

TEST_TENANT_ADMIN_EMAIL=admin@acme.local
TEST_TENANT_ADMIN_PASSWORD=Admin1234
TEST_TENANT_ADMIN_NAME=Tenant Administrator

TEST_TENANT_NAME=Acme Corp
TEST_TENANT_SLUG=acme
```

Après modification, relancez `setup-dev.bat` pour recréer les comptes.

---

## 🛠️ Commandes utiles

### Gestion de l'environnement

```bash
# Démarrer l'app Next.js
npm run dev

# Arrêter les services Docker
docker-compose -f docker-compose.dev.yml down

# Voir les logs PostgreSQL
docker logs rgpd-platform-db-dev -f

# Accéder à la DB PostgreSQL
docker exec -it rgpd-platform-db-dev psql -U devuser -d rgpd_platform

# Reset complet (⚠️ DESTRUCTIF)
.\setup-dev.bat
```

### Migrations

```bash
# Exécuter les migrations
npm run migrate

# Vérifier l'état des migrations (via CLI bootstrap)
npm run bootstrap:status
```

### Tests

```bash
# Tests unitaires (frontend + backend)
npm test

# Tests backend uniquement
npm run test:backend

# Tests frontend uniquement
npm run test:frontend

# Tests E2E (Playwright)
npm run test:e2e

# Seed data pour E2E tests
npm run test:e2e:setup
```

### CLI Bootstrap (Avancé)

Pour créer des users/tenants manuellement:

```bash
# Créer un Super Admin
npm run bootstrap:superadmin -- --email admin@example.com --displayName "John Doe"

# Créer un tenant
npm run bootstrap:tenant -- --name "My Company" --slug my-company

# Créer un Tenant Admin
npm run bootstrap:tenant-admin -- --tenantSlug my-company --email admin@mycompany.com --displayName "Jane Doe"
```

**⚠️ Important**: Activez le mode bootstrap dans `.env`:
```bash
BOOTSTRAP_MODE=true
```

---

## 🐛 Troubleshooting

### Problème: "Docker daemon is not running"

**Solution**: Démarrez Docker Desktop et attendez qu'il soit complètement démarré (icône verte).

### Problème: "Port 5432 already in use"

**Cause**: Un autre PostgreSQL tourne déjà sur le port 5432.

**Solutions**:
1. Arrêtez l'autre PostgreSQL:
   ```bash
   # Windows (services)
   net stop postgresql-x64-14

   # Linux/Mac
   sudo systemctl stop postgresql
   ```

2. Ou modifiez le port dans `docker-compose.dev.yml`:
   ```yaml
   ports:
     - "5433:5432"  # Utilisez 5433 au lieu de 5432
   ```

### Problème: "Migration 014 already exists"

**Cause**: Vous avez lancé les migrations plusieurs fois.

**Solution**: C'est normal ! Les migrations sont **idempotentes** (peuvent s'exécuter plusieurs fois sans erreur). Si vous voyez:
```
relation "security_incidents" already exists
```
C'est juste un warning, la migration continue normalement.

### Problème: "PLATFORM admin already exists"

**Solution**: C'est normal si vous relancez le setup. Le script détecte et update les comptes existants.

### Problème: Les tests E2E échouent

**Solutions**:
1. Vérifiez que la DB est lancée:
   ```bash
   docker ps | grep rgpd-platform-db-dev
   ```

2. Seed les données de test:
   ```bash
   npm run test:e2e:setup
   ```

3. Vérifiez que le serveur Next.js tourne:
   ```bash
   curl http://localhost:3000/api/health
   ```

### Problème: "Cannot find module '@/infrastructure/db/pool'"

**Cause**: Les chemins TypeScript ne sont pas résolus.

**Solutions**:
1. Vérifiez que `tsconfig.json` contient:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

2. Relancez le serveur:
   ```bash
   npm run dev
   ```

### Problème: DBeaver ne se connecte pas

**Configuration DBeaver**:
```
Host: localhost
Port: 5432
Database: rgpd_platform
Username: devuser
Password: devpass
```

**Si ça ne marche pas**:
1. Vérifiez que PostgreSQL écoute sur 127.0.0.1:5432:
   ```bash
   docker port rgpd-platform-db-dev
   ```

2. Testez la connexion en CLI:
   ```bash
   docker exec -it rgpd-platform-db-dev psql -U devuser -d rgpd_platform -c "SELECT 1;"
   ```

---

## 📂 Structure des scripts

### Scripts principaux (À UTILISER)

| Script | Description | Usage |
|--------|-------------|-------|
| `setup-dev.bat` | **Setup complet ONE-SHOT** | Lancement initial ou reset |
| `dev.bat` | Gestion quotidienne (start/stop/logs) | Usage quotidien |
| `scripts/migrate.ts` | Migrations SQL | Via `npm run migrate` |
| `src/cli/bootstrap.ts` | CLI officielle bootstrap | Via `npm run bootstrap:*` |

### Scripts obsolètes (NE PAS UTILISER)

| Script | Raison | Remplacé par |
|--------|--------|--------------|
| `scripts/dev-start-LEGACY.ps1` | Approche obsolète | `setup-dev.bat` |
| `scripts/update-test-credentials-DEPRECATED.ps1` | Hardcoded credentials | Variables `.env` |
| `setup-dev-bootstrap-LEGACY.bat` | Ancienne version | `setup-dev.bat` |

**Ces fichiers sont conservés pour historique mais NE DOIVENT PLUS ÊTRE UTILISÉS.**

---

## 🔒 Sécurité

### En développement

- Les credentials par défaut (`Admin1234`) sont **UNIQUEMENT pour le développement local**
- Ne jamais commiter le fichier `.env` (déjà dans `.gitignore`)
- Le salt de test est fixe pour la reproductibilité des tests

### En production

- **Générer des secrets forts**:
  ```bash
  ./scripts/docker/init-secrets.sh
  ```

- Utiliser Docker secrets (voir `docker-compose.yml`)
- Changer tous les passwords par défaut
- Activer SSL/TLS (reverse proxy nginx)

---

## 📚 Ressources

- [Architecture du projet](../architecture/BOUNDARIES.md)
- [Politique d'usage LLM](../ai/LLM_USAGE_POLICY.md)
- [Classification des données](../data/DATA_CLASSIFICATION.md)
- [Tests RGPD](../testing/RGPD_TESTING.md)
- [Roadmap (TASKS.md)](../../TASKS.md)

---

## ❓ Besoin d'aide ?

1. Vérifiez les logs:
   ```bash
   # Logs Docker
   docker logs rgpd-platform-db-dev -f

   # Logs Next.js
   # Visible dans le terminal où vous avez lancé `npm run dev`
   ```

2. Consultez les issues GitHub

3. Contactez l'équipe de développement

---

**Dernière mise à jour**: 2026-01-21
**Version du guide**: 1.1.0
