# Tests - RGPD-IA Platform

**Dernière mise à jour** : 2026-01-07  
**Total tests** : **608 tests** (492 backend + 116 frontend)  
**Status** : ✅ **100% passing**

---

## Structure

```
tests/
├── backend/
│   ├── unit/           # Tests isolés (mocks) - 350+ tests
│   │   ├── api/        # Route handlers
│   │   ├── http/       # Middleware
│   │   ├── infrastructure/
│   │   ├── legal/      # Docs RGPD (EPIC 10)
│   │   ├── rgpd/       # PII, masking, incidents
│   │   └── security/   # Docker, chaos
│   ├── integration/    # Tests avec vraie DB - 80+ tests
│   │   └── rgpd/       # Consent, deletion, retention
│   └── e2e/api/        # Tests HTTP complets - 97 tests
│
├── frontend/           # EPIC 11 - Back Office
│   └── unit/           # 106 tests unitaires (Jest + RTL)
│       ├── authStore.test.ts
│       ├── apiClient.test.ts
│       ├── frontend-rgpd-compliance.test.ts
│       ├── tenants-crud.test.tsx
│       ├── useTenants-coverage.test.tsx
│       └── tenant-ui-rgpd.test.tsx
│
├── e2e/                # Tests Playwright - 10 tests
│   ├── backoffice-tenants.spec.ts
│   └── helpers/
│       └── auth-helper.ts
│
└── helpers/            # Utilitaires partagés
```

## Commandes

```bash
# Tous les tests (backend + frontend)
npm test                           # 608 tests

# Par scope
npm run test:backend               # ~492 tests backend
npm run test:frontend              # 106 tests frontend (Jest + RTL)
npm run test:e2e                   # 10 tests Playwright

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

## RGPD - Mapping Articles

| Article | Tests Backend | Tests Frontend (EPIC 11) |
|---------|---------------|--------------------------|
| Art. 5 (Principes) | `integration/rgpd/retention.*` | — |
| Art. 7 (Consentement) | `integration/rgpd/rgpd.consent-*` | — |
| Art. 15 (Accès) | `integration/rgpd/rgpd.export.*` | — |
| Art. 17 (Effacement) | `integration/rgpd/rgpd.deletion.*` | — |
| Art. 25 (Privacy by design) | `unit/rgpd/rgpd.llm-runtime-bypass.test.ts` | `frontend-rgpd-compliance.test.ts` (15 tests) |
| Art. 32 (Sécurité) | `unit/rgpd/rgpd.pii-*`, `unit/security/*` | `authStore.test.ts` (JWT sessionStorage) |
| Art. 33 (Violations) | `unit/rgpd/rgpd.incident-*` | — |
| **Minimisation données** | — | `tenant-ui-rgpd.test.tsx` (P1 only) |
| **Audit trail** | `unit/rgpd/rgpd.audit-events-*` | — |

## Couverture

**Seuil global** : **80%** (lines, statements, functions, branches)

**Réalisé** :
- **Backend** : ~85% (492 tests)
- **Frontend** : ~90% (106 tests unitaires)
  - `useTenants.ts` : 100% statements, 93.75% branches
  - `authStore.ts` : 100% statements
  - `apiClient.ts` : 100% statements
- **E2E** : 10 tests Playwright (100% pass rate)

**Total** : **608 tests** → **100% passing** ✅

---

## Tests par EPIC

| EPIC | Backend | Frontend | E2E | Total |
|------|---------|----------|-----|-------|
| 1-7 | ~200 | — | — | 200 |
| 8 (PII) | 110 | — | — | 110 |
| 9 (Incidents) | 60 | — | — | 60 |
| 10 (Legal) | 180 | — | — | 180 |
| **11 (Back Office)** | — | **106** | **10** | **116** |
| **Total** | **492** | **106** | **10** | **608** |

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/testing/RGPD_TESTING.md](../docs/testing/RGPD_TESTING.md) | Stratégie globale tests RGPD |
| [docs/testing/E2E_TESTING_GUIDE.md](../docs/testing/E2E_TESTING_GUIDE.md) | Guide tests E2E (API + Playwright) |
| [tests/backend/README.md](./backend/README.md) | Traçabilité articles RGPD |
| [AUDIT_REPORT_LOT_11.md](../AUDIT_REPORT_LOT_11.md) | Audit qualité LOT 11 |
| [CHANGELOG_FIXES.md](../CHANGELOG_FIXES.md) | Corrections tests LOT 11 |

---

**Maintenu par** : Équipe Dev + QA  
**Dernière validation** : 2026-01-07 (LOT 11.0 & 11.1)  
**Status** : ✅ **TOUS TESTS PASSING** — Ready to deploy
