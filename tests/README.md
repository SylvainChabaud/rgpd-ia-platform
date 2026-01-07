# Tests - RGPD-IA Platform

## Structure

```
tests/
├── backend/
│   ├── unit/           # Tests isolés (mocks)
│   │   ├── api/        # Route handlers
│   │   ├── http/       # Middleware
│   │   ├── infrastructure/
│   │   ├── legal/      # Docs RGPD
│   │   ├── rgpd/       # PII, masking
│   │   └── security/   # Docker, chaos
│   ├── integration/    # Tests avec vraie DB
│   │   └── rgpd/       # Consent, deletion
│   └── e2e/api/        # Tests HTTP complets
│
├── frontend/
│   └── unit/           # Tous les tests frontend
│
└── helpers/            # Utilitaires partagés
```

## Commandes

```bash
npm test                 # Tout (frontend + backend)
npm run test:backend     # Backend uniquement
npm run test:frontend    # Frontend uniquement
npm run test:rgpd        # Tests RGPD (cross-dossiers)
npm run test:security    # Tests sécurité
npm run test:coverage    # Avec rapport couverture
```

## RGPD - Mapping Articles

| Article | Tests |
|---------|-------|
| Art. 5 (Principes) | `integration/rgpd/retention.*` |
| Art. 7 (Consentement) | `integration/rgpd/rgpd.consent-*` |
| Art. 15 (Accès) | `integration/rgpd/rgpd.export.*` |
| Art. 17 (Effacement) | `integration/rgpd/rgpd.deletion.*` |
| Art. 32 (Sécurité) | `unit/rgpd/rgpd.pii-*`, `unit/security/*` |
| Art. 33 (Violations) | `unit/rgpd/rgpd.incident-*` |

## Couverture

Seuil global : **80%** (lines, statements, functions, branches)
