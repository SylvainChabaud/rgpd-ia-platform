# Tests E2E - Guide de configuration

## 🎯 Prérequis

Les tests E2E nécessitent :
1. ✅ Base de données PostgreSQL accessible
2. ✅ Serveur dev Next.js démarré
3. ✅ Données de test (users, tenants)

## 🚀 Lancement rapide

### 1. Préparer l'environnement

```bash
# 1. Démarrer la base de données
docker-compose up -d postgres

# 2. Appliquer les migrations
npm run db:migrate

# 3. Seeder les données de test
npm run test:e2e:setup
```

### 2. Lancer les tests

```bash
# Option A : Playwright lance le serveur automatiquement
npx playwright test

# Option B : Serveur déjà running (terminal 1)
npm run dev
# Terminal 2
npx playwright test
```

## 📝 Données de test créées

Le script `test:e2e:setup` crée automatiquement :

### Utilisateurs
- **PLATFORM Admin**
  - Email: `admin@platform.local`
  - Password: `AdminPass123!`
  - Scope: PLATFORM
  - Role: SUPER_ADMIN

- **TENANT Admin**
  - Email: `admin@tenant1.local`
  - Password: `AdminPass123!`
  - Scope: TENANT
  - Role: ADMIN

### Tenants
- `test-tenant` - Test Tenant (Technology)
- `acme-corp` - ACME Corporation (Manufacturing)
- `tech-startup` - Tech Startup Inc (Technology)
- `health-clinic` - Health Clinic (Healthcare)

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env.test` :

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rgpd_platform_test
NEXT_PUBLIC_API_URL=http://localhost:3000
JWT_SECRET=test-secret-key-for-e2e-tests-only
```

### Scripts package.json

Ajoutez dans `package.json` :

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:setup": "tsx tests/e2e/setup/seed-test-data.ts",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

## 🐛 Debugging

### Voir les tests en mode UI

```bash
npm run test:e2e:ui
```

### Debug un test spécifique

```bash
npx playwright test tests/e2e/backoffice-auth.spec.ts --debug
```

### Voir les traces

```bash
npx playwright show-report
```

## ✅ Checklist avant de lancer les tests

- [ ] Base de données démarrée
- [ ] Migrations appliquées (`npm run db:migrate`)
- [ ] Données de test créées (`npm run test:e2e:setup`)
- [ ] Variables d'environnement configurées
- [ ] Serveur dev accessible sur http://localhost:3000

## 🔄 Réinitialiser les données de test

Si les tests ont modifié les données :

```bash
# Option 1 : Re-seeder
npm run test:e2e:setup

# Option 2 : Reset complet
npm run db:reset
npm run db:migrate
npm run test:e2e:setup
```

## 📊 Résultats attendus

Après configuration correcte, tous les tests doivent passer :

```
✅ E2E-AUTH-001: Login PLATFORM scope → Dashboard accessible
✅ E2E-AUTH-002: Login TENANT scope → Redirection refusée
✅ E2E-AUTH-003: Logout → Redirection login + JWT cleared
✅ E2E-AUTH-004: Session persistée après F5 reload
✅ E2E-AUTH-005: Routes protégées sans auth → Redirection login
✅ E2E-CRUD-001: Liste tenants affichée avec pagination
✅ E2E-CRUD-002: Créer tenant → Success toast
... (15 tests au total)
```

## 🆘 Problèmes courants

### Test timeout

**Cause** : Serveur dev pas prêt ou données manquantes

**Solution** :
```bash
npm run test:e2e:setup
npm run dev  # Vérifier que le serveur démarre bien
```

### "Invalid credentials"

**Cause** : Utilisateurs de test non créés

**Solution** :
```bash
npm run test:e2e:setup
```

### Base de données non accessible

**Cause** : PostgreSQL non démarré

**Solution** :
```bash
docker-compose up -d postgres
# Vérifier la connexion
psql $DATABASE_URL
```

## 📚 Ressources

- [Documentation Playwright](https://playwright.dev/)
- [Best Practices E2E Testing](https://playwright.dev/docs/best-practices)
- Architecture projet : `docs/architecture/`
