# Guide des Tests E2E (End-to-End)

**Dernière mise à jour** : 2026-01-21
**Périmètre** : Tests API Backend (EPICs 1-10) + Tests Frontend Playwright (EPIC 11-12)

---

## ⚠️ ATTENTION : Environnements autorisés

Les tests E2E modifient la base de données en créant et supprimant des données. **NE JAMAIS les exécuter en production !**

### ✅ Environnements autorisés
- **Local** : Développement sur poste de travail
- **Staging** : Environnement de pré-production avec base de données de test

### ❌ Environnements interdits
- **Production** : Risque de corruption/suppression de données réelles

---

## Configuration par environnement

### 🏠 Local (Développement)

**.env.test** :
```bash
# URL du serveur Next.js local
TEST_BASE_URL=http://localhost:3000

# Autoriser les tests E2E
TEST_E2E_SERVER_AVAILABLE=true
TEST_SKIP_E2E=false

# Base de données de développement
DATABASE_URL=postgresql://devuser:devpass@localhost:5432/rgpd_platform
```

**Lancement** :
```bash
# 1. Démarrer le serveur Next.js (terminal 1)
npm run dev

# 2. Exécuter les tests E2E Backend (terminal 2)
npm test -- api.e2e.ai-rgpd-pipeline.test.ts
npm test -- api.e2e.incidents.test.ts
npm test -- api.e2e.legal-compliance.test.ts
npm test -- api.e2e.critical-routes.test.ts

# 3. Exécuter les tests E2E Frontend Playwright (terminal 2)
npm run test:e2e                              # Tous les tests Playwright
npm run test:e2e -- backoffice-tenants.spec  # Test spécifique
npx playwright test --ui                      # Mode interactif
npx playwright show-report                    # Voir le rapport
```

---

### 🎭 Staging (Pré-production)

**.env.staging** :
```bash
# URL du serveur staging
TEST_BASE_URL=https://staging.rgpd-platform.com

# Autoriser les tests E2E
TEST_E2E_SERVER_AVAILABLE=true
TEST_SKIP_E2E=false

# Base de données staging (JAMAIS la prod !)
DATABASE_URL=postgresql://staginguser:xxx@staging-db:5432/rgpd_staging
```

**Lancement** :
```bash
# Charger les variables d'environnement staging
export $(cat .env.staging | xargs)

# Exécuter les tests contre staging
npm test -- api.e2e
```

---

### 🚨 Production (BLOQUÉ)

**.env.production** :
```bash
# ⚠️ PAS de TEST_BASE_URL nécessaire en production

# BLOQUER tous les tests E2E
TEST_SKIP_E2E=true

# Base de données production (protégée)
DATABASE_URL=postgresql://produser:xxx@prod-db:5432/rgpd_production
```

**Résultat** : Les tests E2E seront **automatiquement ignorés** grâce à `TEST_SKIP_E2E=true`.

---

## Variables d'environnement

| Variable | Description | Local | Staging | Production |
|----------|-------------|-------|---------|------------|
| `TEST_BASE_URL` | URL du serveur à tester | `http://localhost:3000` | `https://staging.example.com` | ❌ Non utilisé |
| `TEST_E2E_SERVER_AVAILABLE` | Serveur disponible ? | `true` | `true` | ❌ Inutile |
| `TEST_SKIP_E2E` | Forcer le skip des tests | `false` | `false` | ✅ `true` |
| `DATABASE_URL` | Connexion BDD | Local dev DB | Staging DB | ❌ Prod DB (protégée) |

---

## Que testent les E2E ?

### Tests Backend (API) — EPICs 1-10

#### 1. **api.e2e.critical-routes.test.ts** (~20 tests)
- Sécurité : Authentication, CORS, rate limiting
- Validation : Schémas Zod, UUIDs invalides
- Isolation : Tenant RLS policies

#### 2. **api.e2e.legal-compliance.test.ts** (29 tests)
- LOT 10 : Cookie consent, CGU, suspension RGPD
- Art. 7, 18, 21, 22 du RGPD
- Workflow contestations et oppositions

#### 3. **api.e2e.ai-rgpd-pipeline.test.ts** (27 tests)
- EPIC 3 : AI Gateway + enforcement consentement
- EPIC 4 : Tracking des jobs IA
- EPIC 5 : Export (Art. 15, 20), Effacement (Art. 17)

#### 4. **api.e2e.incidents.test.ts** (21 tests)
- EPIC 9 : Gestion incidents de sécurité
- Art. 33 : Notification CNIL (72h)
- Art. 34 : Notification utilisateurs

**Total Backend : ~97 tests E2E**

---

### Tests Frontend (Playwright) — EPIC 11

#### 5. **backoffice-tenants.spec.ts** (10 tests)
- ✅ **[INT-001]** Liste tenants affichée avec pagination
- ✅ **[INT-002]** Empty state si aucun tenant
- ✅ **[INT-003]** Ouverture formulaire création
- ✅ **[INT-004]** Affichage détails tenant
- ✅ **[INT-005]** Navigation retour vers liste (via sidebar)
- ✅ **[INT-006]** Ouverture formulaire édition
- ✅ **[INT-007]** Slug en read-only dans édition
- ✅ **[INT-008]** Confirmation suppression tenant
- ✅ **[INT-009]** Création tenant succès + toast
- ✅ **[INT-010]** Mise à jour tenant + invalidation query

**Configuration Playwright** :
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

**Total Frontend : 10 tests Playwright**

---

### Résumé Global

| Type | Framework | Tests | Status |
|------|-----------|-------|--------|
| Backend API | Jest + Supertest | ~97 | ✅ Passing |
| Frontend UI | Playwright | 10 | ✅ Passing |
| **Total E2E** | — | **107** | ✅ **100%** |

---

## Pipeline CI/CD recommandé

```yaml
# .github/workflows/ci.yml
stages:
  - name: Unit Tests Backend
    run: npm test -- --testPathIgnorePatterns=e2e
    # ✅ Toujours exécutés (pas de BDD réelle)

  - name: Unit Tests Frontend
    run: npm run test:frontend
    # ✅ 106 tests Jest + React Testing Library

  - name: E2E Tests Backend (Staging)
    if: branch == 'staging'
    env:
      TEST_BASE_URL: https://staging.example.com
      TEST_SKIP_E2E: false
    run: npm test -- api.e2e
    # ✅ ~97 tests API

  - name: E2E Tests Frontend (Staging)
    if: branch == 'staging'
    env:
      TEST_BASE_URL: https://staging.example.com
    run: npm run test:e2e
    # ✅ 10 tests Playwright

  - name: Deploy Production
    if: branch == 'main'
    env:
      TEST_SKIP_E2E: true
    # ❌ E2E tests bloqués en production
```

---

## Dépannage

### ❌ "E2E tests skipped: Set TEST_E2E_SERVER_AVAILABLE=true"
**Cause** : Le serveur Next.js n'est pas démarré.

**Solution** :
```bash
# Terminal 1
npm run dev

# Terminal 2 (attendre que le serveur démarre)
npm test -- api.e2e.critical-routes.test.ts
```

### ❌ "Connection refused to localhost:3000"
**Cause** : URL incorrecte ou serveur pas démarré.

**Vérification** :
```bash
# Vérifier que le serveur écoute sur le bon port
curl http://localhost:3000/api/health

# Ou dans PowerShell
Invoke-WebRequest http://localhost:3000/api/health
```

### ❌ Tests échouent avec erreurs 401/403
**Cause** : Problème de JWT ou tenant isolation.

**Debug** :
```typescript
// Ajouter dans le test
console.log('Token:', userToken);
console.log('Response:', await response.text());
```

### ❌ Tests Playwright échouent avec timeout
**Cause** : Navigation SSR hydration lente ou sélecteurs incorrects.

**Solution** :
```typescript
// Attendre explicitement le chargement complet
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);

// Utiliser des sélecteurs texte plus robustes
await page.getByText('Créer un Tenant').click();
// Au lieu de getByRole('button', { name: /créer/i })
```

### ❌ "Error: page.goto: net::ERR_CONNECTION_REFUSED"
**Cause** : Next.js dev server pas démarré.

**Solution** :
```bash
# Terminal 1 : Démarrer Next.js
npm run dev
# Attendre "Ready in X ms"

# Terminal 2 : Lancer Playwright
npm run test:e2e
```

---

## Sécurité

### ⚠️ Pourquoi ne pas tester en production ?

Les tests E2E :
1. **Créent des données** : Tenants, users, consents, incidents
2. **Modifient l'état** : Révocations, suspensions, suppressions RGPD
3. **Suppriment des données** : Via `cleanup_test_data()`
4. **Contournent la sécurité** : Utilisent `devuser` avec `BYPASSRLS`

### ✅ Protections en place

1. **Variable TEST_SKIP_E2E** : Bloque automatiquement en prod
2. **Slug de test** : Tenants créés avec suffixe `-e2e-test`
3. **Fonction cleanup** : Supprime uniquement les données de test
4. **User devuser** : N'existe pas en production

---

## Résumé des bonnes pratiques

✅ **À FAIRE** :
- Exécuter les E2E en local avant chaque commit
- Tester contre staging avant déploiement prod
- Vérifier que `TEST_SKIP_E2E=true` en production
- Utiliser une BDD dédiée pour staging
- Attendre `networkidle` avant interactions Playwright
- Utiliser sélecteurs texte (`getByText`) plutôt que rôles
- Garder screenshots/vidéos des échecs Playwright

❌ **À NE PAS FAIRE** :
- Exécuter les E2E contre la BDD de production
- Oublier de démarrer le serveur Next.js avant les tests
- Modifier `TEST_SKIP_E2E` à `false` en production
- Partager les variables d'environnement entre local et prod
- Utiliser `page.goto()` pour navigation interne Next.js (préférer clicks sidebar)
- Ignorer les timeouts Playwright (signe de problème d'implémentation)

---

## 📚 Références

| Document | Description |
|----------|-------------|
| [RGPD_TESTING.md](./RGPD_TESTING.md) | Stratégie globale tests RGPD |
| [LOT11_IMPLEMENTATION.md](../implementation/LOT11_IMPLEMENTATION.md) | Détails EPIC 11 Frontend |
| [AUDIT_REPORT_LOT_11.md](../../AUDIT_REPORT_LOT_11.md) | Audit qualité + 116 tests |
| [Playwright Docs](https://playwright.dev) | Documentation officielle |
| [tests/e2e/helpers/auth-helper.ts](../../tests/e2e/helpers/auth-helper.ts) | Helper auth Playwright |

**Total E2E : 107 tests (97 backend + 10 frontend Playwright) — 100% passing ✅**
