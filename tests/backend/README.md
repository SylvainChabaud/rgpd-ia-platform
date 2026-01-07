# Tests Backend - Traçabilité RGPD

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

## Exécution audit

```bash
npm run test:rgpd -- --coverage
```
