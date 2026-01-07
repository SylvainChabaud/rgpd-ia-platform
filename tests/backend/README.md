# Tests Backend - Traçabilité RGPD

**Dernière mise à jour** : 2026-01-07  
**Total tests backend** : **~492 tests** (350+ unit, 80+ integration, 97 E2E API)  
**Status** : ✅ **100% passing**

---

## Mapping Tests ↔ Articles RGPD

### Article 5 - Principes
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/retention.automated-cleanup.test.ts` | 5(1)(e) Limitation conservation |
| `unit/rgpd/rgpd.audit-events-no-payload.test.ts` | 5(2) Accountability |

### Article 6-7 - Consentement
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/rgpd.consent-granularity.test.ts` | 6(1)(a) Base légale |
| `integration/rgpd/rgpd.consent-enforcement.test.ts` | 7 Conditions |

### Article 9 - Données sensibles
| Fichier | Couverture |
|---------|------------|
| `unit/security/storage.classification-enforcement.test.ts` | Interdiction P3 |
| `unit/infrastructure/llm.policy-enforcement.test.ts` | Art. 22 Décision auto |

### Article 12-14 - Information
| Fichier | Couverture |
|---------|------------|
| `unit/legal/legal.politique-confidentialite.test.ts` | Politique |
| `unit/legal/legal.informations-rgpd.test.ts` | Mentions |
| `unit/legal/legal.cgu-cgv.test.ts` | CGU/CGV |

### Article 15 - Droit d'accès
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/rgpd.export.test.ts` | Export données |
| `e2e/api/api.e2e.ai-rgpd-pipeline.test.ts` | Pipeline E2E |

### Article 17 - Effacement
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/rgpd.deletion.test.ts` | Suppression |
| `integration/rgpd/purge.lot4.test.ts` | Purge auto |

### Article 20 - Portabilité
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/rgpd.export.test.ts` | Export JSON |

### Article 25 - Privacy by design
| Fichier | Couverture |
|---------|------------|
| `integration/rgpd/retention.automated-cleanup.test.ts` | Rétention |
| `unit/rgpd/rgpd.llm-runtime-bypass.test.ts` | Bypass interdit |

### Article 32 - Sécurité
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

### Article 33-34 - Violations
| Fichier | Couverture |
|---------|------------|
| `unit/rgpd/rgpd.incident-detection.test.ts` | Détection |
| `unit/rgpd/rgpd.security-incident.test.ts` | Incident + CNIL |
| `unit/rgpd/rgpd.pii-scan-logs.test.ts` | Scan logs |
| `e2e/api/api.e2e.incidents.test.ts` | E2E incidents |

### ePrivacy - Cookies
| Fichier | Couverture |
|---------|------------|
| `unit/domain.cookie-consent.test.ts` | Consentement |
| `unit/api/api.consents.cookies.test.ts` | API cookies |

---

## Tests Frontend (Référence)

> **Note** : Les tests frontend sont dans `/tests/frontend/` mais couvrent aussi des articles RGPD.

| Article | Fichier Frontend | Nb Tests |
|---------|------------------|----------|
| Art. 25 (Privacy by design) | `frontend-rgpd-compliance.test.ts` | 15 |
| Art. 32 (Sécurité JWT) | `authStore.test.ts` | 8 |
| Art. 32 (API Client) | `apiClient.test.ts` | 21 |
| Minimisation données | `tenant-ui-rgpd.test.tsx` | 10 |
| CRUD Tenants | `tenants-crud.test.tsx` | 34 |
| Hooks TanStack Query | `useTenants-coverage.test.tsx` | 18 |

**Total Frontend** : **106 tests** (voir [../frontend/unit/](../frontend/unit/))

---

## Exécution audit

```bash
# Tests backend RGPD uniquement
npm run test:rgpd -- --coverage

# Tous les tests backend
npm run test:backend

# Tests spécifiques par article
npm test -- integration/rgpd/rgpd.consent-enforcement.test.ts  # Art. 7
npm test -- integration/rgpd/rgpd.deletion.test.ts             # Art. 17
npm test -- unit/rgpd/rgpd.pii-detection.test.ts               # Art. 32
npm test -- unit/rgpd/rgpd.incident-detection.test.ts          # Art. 33

# E2E API complets
npm test -- e2e/api/api.e2e.ai-rgpd-pipeline.test.ts
npm test -- e2e/api/api.e2e.legal-compliance.test.ts
npm test -- e2e/api/api.e2e.incidents.test.ts
```

---

## Statistiques

| Catégorie | Tests | Articles RGPD |
|-----------|-------|---------------|
| Unit tests | 350+ | 5, 7, 9, 25, 32, 33 |
| Integration tests | 80+ | 5, 6, 7, 15, 17, 20 |
| E2E API tests | 97 | Pipeline complet |
| **Total Backend** | **~492** | **15+ articles** |

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/testing/RGPD_TESTING.md](../../docs/testing/RGPD_TESTING.md) | Stratégie globale |
| [docs/testing/E2E_TESTING_GUIDE.md](../../docs/testing/E2E_TESTING_GUIDE.md) | Guide E2E |
| [../README.md](../README.md) | Vue d'ensemble tests |

**Total plateforme** : **608 tests** (492 backend + 116 frontend)
