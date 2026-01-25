# Tests - RGPD-IA Platform

**Dernière mise à jour** : 2026-01-25
**Total tests** : **783+ tests** (191 fichiers + 63 tests UI EPIC 12)
**Status** : ✅ **100% passing**

---

## Structure

```
tests/
├── backend/
│   ├── unit/           # Tests isolés (mocks) - 361+ tests
│   │   ├── api/        # Route handlers
│   │   ├── http/       # Middleware
│   │   ├── infrastructure/
│   │   ├── legal/      # Docs RGPD (EPIC 10)
│   │   ├── middleware/ # **NEW** Auth scope isolation (11 tests)
│   │   ├── rgpd/       # PII, masking, incidents
│   │   └── security/   # Docker, chaos
│   ├── integration/    # Tests avec vraie DB - 80+ tests
│   │   └── rgpd/       # Consent, deletion, retention
│   └── e2e/api/        # Tests HTTP complets - 97 tests
│
├── frontend/           # EPIC 11 - Back Office
│   └── unit/           # 167 tests unitaires (Jest + RTL)
│       ├── authStore.test.ts
│       ├── apiClient.test.ts
│       ├── frontend-rgpd-compliance.test.ts
│       ├── tenants-crud.test.tsx
│       ├── useTenants-coverage.test.tsx
│       ├── tenant-ui-rgpd.test.tsx
│       ├── users-crud.test.tsx             # LOT 11.2 - Users CRUD
│       ├── backoffice-layout.test.tsx      # **NEW** LOT 11.0 - Layout (5 tests)
│       └── backoffice-login.test.tsx       # **NEW** LOT 11.0 - Login (7 tests)
│
├── e2e/                # Tests Playwright - 15 tests
│   ├── backoffice-tenants.spec.ts     # LOT 11.1
│   ├── backoffice-users.spec.ts       # LOT 11.2
│   └── helpers/
│       └── auth-helper.ts
│
└── helpers/            # Utilitaires partagés
```

## Commandes

```bash
# Tous les tests (backend + frontend)
npm test                           # 783+ tests

# Par scope
npm run test:backend               # ~720 tests backend
npm run test:frontend              # 150 tests frontend (Jest + RTL)
npm run test:e2e                   # 15 tests Playwright

# Par catégorie
npm run test:rgpd                  # Tests RGPD (cross-dossiers)
npm run test:security              # Tests sécurité
npm run test:coverage              # Avec rapport couverture

# Playwright spécifique
npx playwright test                # Tous les tests Playwright
npx playwright test --ui           # Mode interactif
npx playwright show-report         # Voir rapport HTML
npx playwright test --debug        # Mode debug
```

## RGPD - Traçabilité Articles

### Mapping Backend ↔ Articles RGPD

#### Article 5 - Principes
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/retention.automated-cleanup.test.ts` | 5(1)(e) Limitation conservation |
| `unit/rgpd/rgpd.audit-events-no-payload.test.ts` | 5(2) Accountability |

#### Article 6-7 - Consentement
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/rgpd.consent-granularity.test.ts` | 6(1)(a) Base légale |
| `integration/rgpd/rgpd.consent-enforcement.test.ts` | 7 Conditions |

#### Article 9 - Données sensibles
| Fichier | Couverture |
|---------|------------|
| `unit/security/storage.classification-enforcement.test.ts` | Interdiction P3 |
| `unit/infrastructure/llm.policy-enforcement.test.ts` | Art. 22 Décision auto |

#### Article 12-14 - Information
| Fichier | Couverture |
|---------|------------|
| `unit/legal/legal.politique-confidentialite.test.ts` | Politique |
| `unit/legal/legal.informations-rgpd.test.ts` | Mentions |
| `unit/legal/legal.cgu-cgv.test.ts` | CGU/CGV |

#### Article 15 - Droit d'accès
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/rgpd.export.test.ts` | Export données |
| `e2e/api/api.e2e.ai-rgpd-pipeline.test.ts` | Pipeline E2E |

#### Article 17 - Effacement
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/rgpd.deletion.test.ts` | Suppression |
| `integration/rgpd/purge.lot4.test.ts` | Purge auto |

#### Article 18 - Droit à la limitation

| Fichier | Couverture |
|---------|------------|
| `frontend/unit/users-crud.test.tsx` | Suspension traitement |
| `e2e/backoffice-users.spec.ts` | E2E suspend/reactivate |

#### Article 20 - Portabilité
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/rgpd.export.test.ts` | Export JSON |

#### Article 25 - Privacy by design
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/retention.automated-cleanup.test.ts` | Rétention |
| `unit/rgpd/rgpd.llm-runtime-bypass.test.ts` | Bypass interdit |
| `frontend/unit/frontend-rgpd-compliance.test.ts` | 15 tests (EPIC 11) |

#### Article 32 - Sécurité
| Fichier | Couverture |
|---------|------------|
| `unit/rgpd/rgpd.pii-detection.test.ts` | Détection PII |
| `unit/rgpd/rgpd.pii-masking.test.ts` | Masquage |
| `unit/rgpd/rgpd.ip-anonymization.test.ts` | Anonymisation IP |
| `integration/db.rls-policies.test.ts` | Isolation tenant |
| `unit/security/docker.network-isolation.test.ts` | Réseau Docker |
| `unit/security/docker.secrets.test.ts` | Secrets |
| `unit/http/http.https-enforcement.test.ts` | HTTPS |
| `unit/security/chaos.resilience.test.ts` | Résilience |
| `frontend/unit/authStore.test.ts` | JWT sessionStorage (8 tests) |
| `frontend/unit/users-crud.test.tsx` | **Password strength (LOT 11.2)** |
| `unit/middleware/auth-scope-isolation.test.ts` | **🆕 JWT validation + scope isolation (LOT 11.0, 11 tests)** |
| `frontend/unit/backoffice-layout.test.tsx` | **🆕 Layout RGPD compliance (LOT 11.0, 5 tests)** |
| `frontend/unit/backoffice-login.test.tsx` | **🆕 Login security (LOT 11.0, 7 tests)** |

#### Article 33-34 - Violations
| Fichier | Couverture |
|---------|------------|
| `unit/rgpd/rgpd.incident-detection.test.ts` | Détection |
| `unit/rgpd/rgpd.security-incident.test.ts` | Incident + CNIL |
| `unit/rgpd/rgpd.pii-scan-logs.test.ts` | Scan logs |
| `e2e/api/api.e2e.incidents.test.ts` | E2E incidents |

#### ePrivacy - Cookies
| Fichier | Couverture |
|---------|------------|
| `unit/domain.cookie-consent.test.ts` | Consentement |
| `unit/api/api.consents.cookies.test.ts` | API cookies |

### Tests Frontend RGPD

| Article | Fichier | Nb Tests |
|---------|---------|----------|
| Art. 25 (Privacy by design) | `frontend-rgpd-compliance.test.ts` | 15 |
| Art. 32 (Sécurité JWT) | `authStore.test.ts` | 8 |
| Art. 32 (API Client) | `apiClient.test.ts` | 21 |
| Minimisation données | `tenant-ui-rgpd.test.tsx` | 10 |
| CRUD Tenants | `tenants-crud.test.tsx` | 34 |
| Hooks TanStack Query | `useTenants-coverage.test.tsx` | 18 |
| **LOT 11.0** - Layout RGPD | `backoffice-layout.test.tsx` | **🆕 5** |
| **LOT 11.0** - Login security | `backoffice-login.test.tsx` | **🆕 7** |
| **LOT 11.2** - Users CRUD | `users-crud.test.tsx` | 16 |
| **LOT 11.2** - E2E Users | `backoffice-users.spec.ts` | 5 |

## Couverture

**Seuil global** : **80%** (lines, statements, functions, branches)

**Réalisé** :
- **Backend** : ~85% (503 tests)
  - **🆕 middleware/** : 100% (auth-scope-isolation.test.ts - 11 tests)
- **Frontend** : ~90% (167 tests unitaires)
  - `useTenants.ts` : 100% statements, 93.75% branches
  - `authStore.ts` : 100% statements
  - `apiClient.ts` : 100% statements
  - `userSchemas.ts` : 71.42% statements, 100% branches (LOT 11.2)
  - **🆕 backoffice-layout.test.tsx** : 5 tests (LOT 11.0)
  - **🆕 backoffice-login.test.tsx** : 7 tests (LOT 11.0)
- **E2E** : 15 tests Playwright (100% pass rate)

**Total** : **783+ tests** (720 backend/frontend + 63 UI) → **100% passing** ✅

---

## Tests par EPIC

| EPIC | Backend | Frontend | E2E | Total |
|------|---------|----------|-----|-------|
| 1-7 | ~200 | — | — | 200 |
| 8 (PII) | 110 | — | — | 110 |
| 9 (Incidents) | 60 | — | — | 60 |
| 10 (Legal) | 180 | — | — | 180 |
| **11 (Back Office Super Admin)** | **+11** | **118** | **10** | **139** |
| **12 (Back Office Tenant Admin)** | **~30** | **~15** | **~5** | **~50** |
| **Total** | **~590** | **~133** | **~15** | **~720+** |

### 🆕 Nouveaux tests LOT 11.0 (Couverture 60% → 82%)

| Fichier | Type | Tests | Couverture |
|---------|------|-------|------------|
| `backend/unit/middleware/auth-scope-isolation.test.ts` | Unit | 11 | JWT validation, PLATFORM/TENANT scope, privilege escalation prevention |
| `frontend/unit/backoffice-layout.test.tsx` | Unit | 5 | Layout rendering, navigation, RBAC, RGPD compliance |
| `frontend/unit/backoffice-login.test.tsx` | Unit | 7 | Form validation, login flow, session management, no credentials logging |
| **TOTAL LOT 11.0** | — | **23** | **Auth + Layout + Login** |

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/testing/RGPD_TESTING.md](../docs/testing/RGPD_TESTING.md) | Stratégie globale tests RGPD |
| [docs/testing/E2E_TESTING_GUIDE.md](../docs/testing/E2E_TESTING_GUIDE.md) | Guide tests E2E (API + Playwright) |
| [AUDIT_REPORT_LOT_11.md](../AUDIT_REPORT_LOT_11.md) | Audit qualité LOT 11 |
| [CHANGELOG_FIXES.md](../CHANGELOG_FIXES.md) | Corrections tests LOT 11 |

---

## 🚀 Guides Pratiques

### Setup Tests E2E (Playwright)

Les tests E2E nécessitent un environnement configuré avec base de données et serveur dev.

#### Prérequis
1. ✅ PostgreSQL accessible
2. ✅ Serveur dev Next.js démarré
3. ✅ Données de test (users, tenants)

#### Lancement rapide

```bash
# 1. Démarrer la base de données
docker-compose up -d postgres

# 2. Appliquer les migrations
npm run db:migrate

# 3. Seeder les données de test
npm run test:e2e:setup

# 4. Lancer les tests E2E
npx playwright test
npx playwright test --ui           # Mode interactif
npx playwright test --debug        # Mode debug
npx playwright show-report         # Voir rapport HTML
```

#### Données de test créées

Le script `test:e2e:setup` crée automatiquement :

**Utilisateurs**
- **PLATFORM Admin**: `admin@platform.local` / `AdminPass123!` (SUPER_ADMIN)
- **TENANT Admin**: `admin@tenant1.local` / `AdminPass123!` (ADMIN)

**Tenants**
- `test-tenant` - Test Tenant (Technology)
- `acme-corp` - ACME Corporation (Manufacturing)
- `tech-startup` - Tech Startup Inc (Technology)
- `health-clinic` - Health Clinic (Healthcare)

#### Debugging E2E

```bash
# Voir les tests en mode UI
npm run test:e2e:ui

# Debug un test spécifique
npx playwright test tests/e2e/backoffice-auth.spec.ts --debug

# Réinitialiser les données de test
npm run test:e2e:setup
```

### Tests d'Intégration API

Les tests d'intégration testent directement les endpoints API backend **sans navigateur**.

#### Avantages vs Tests E2E

| Critère | Tests Intégration | Tests E2E Playwright |
|---------|-------------------|----------------------|
| **Vitesse** | ⚡ Rapide (~5s) | 🐌 Lent (~2-3min) |
| **Stabilité** | ✅ Stable | ⚠️ Flaky (timing issues) |
| **Debugging** | ✅ Facile (logs directs) | ❌ Difficile (screenshots) |
| **Coverage** | API + Business Logic | UI + API + Browser |
| **Maintenance** | ✅ Faible | ⚠️ Élevé |

#### Lancement

**IMPORTANT** : Le serveur de développement doit tourner avant de lancer les tests !

```bash
# Terminal 1 - Lancer le serveur
npm run dev

# Terminal 2 - Lancer les tests d'intégration
npm run test:integration
npm run test:integration -- --verbose
npm run test:integration -- platform-users-api.test.ts
```

#### Que tester en intégration vs E2E ?

**✅ Tests d'intégration**
- Endpoints API (GET, POST, PATCH, DELETE)
- Validation des données (Zod schemas)
- Business logic (createUser, suspend, etc.)
- RGPD compliance (P1 data uniquement)
- Access control (403, 401)
- Error handling (400, 409, 500)

**⚠️ Tests E2E Playwright (optionnel)**
- Navigation entre pages
- Formulaires interactifs complexes
- Flux utilisateur complets (login → create → list)
- UI/UX (buttons, toasts, modals)

### Troubleshooting

#### Tests E2E

**Test timeout**
- Cause : Serveur dev pas prêt ou données manquantes
- Solution : `npm run test:e2e:setup` puis `npm run dev`

**"Invalid credentials"**
- Cause : Utilisateurs de test non créés
- Solution : `npm run test:e2e:setup`

**Base de données non accessible**
- Cause : PostgreSQL non démarré
- Solution : `docker-compose up -d postgres`

#### Tests d'intégration

**"fetch is not defined"**
- Solution : Utiliser Node 18+ (fetch est natif)

**"Connection refused"**
- Solution : Vérifier que `npm run dev` tourne dans un autre terminal

**"401 Unauthorized"**
- Solution : Vérifier que les credentials matchent la BDD

---

## ✅ Résumé Couverture EPICs 11.0, 11.1, 11.2

| EPIC | Description | Couverture TU | Tests | Conformité ≥80% | Statut |
|------|-------------|---------------|-------|-----------------|---------|
| **11.0** | Infra Back Office (Auth + Layout) | **~82%** ⬆️ | 24 tests (6 → 24) | ✅ **OUI** | 🟢 **CONFORME** |
| **11.1** | Gestion Tenants (CRUD) | **~85%** | 46 tests | ✅ OUI | 🟢 CONFORME |
| **11.2** | Gestion Users Plateforme (CRUD) | **~90%** | 51 tests | ✅ OUI | 🟢 CONFORME |

**Total EPICs 11.0-11.2 : 121 tests unitaires** ✅

---

**Maintenu par** : Équipe Dev + QA
**Dernière validation** : 2026-01-25
**Status** : ✅ **TOUS TESTS PASSING** (783+ tests, 191 fichiers + 63 UI) — Ready to deploy
