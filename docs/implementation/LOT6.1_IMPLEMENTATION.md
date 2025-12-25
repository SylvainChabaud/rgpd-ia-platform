# LOT 6.1 — Observabilité RGPD-safe (logs/metrics) — Documentation d'implémentation

**Date**: 2025-12-25
**EPIC**: EPIC 6 (Stack IA Docker RGPD-ready) + EPIC 2 (Sécurité infrastructure)
**Status**: ✅ IMPLÉMENTÉ

---

## 1. Objectifs du LOT

Implémenter un système d'observabilité complet et conforme RGPD :

- **Logs structurés** (JSON, parsables, RGPD-safe)
- **Métriques agrégées** (sans labels sensibles)
- **Redaction automatique** (P2/P3 data)
- **Anonymisation IP** (last octet masked)
- **Health checks** (DB, application)
- **Metrics export** (counters, histograms)

---

## 2. Conformité RGPD

### 2.1 Règles strictes (DATA_CLASSIFICATION.md)

| Classification | Autorisé dans logs | Exemples |
|----------------|-------------------|----------|
| **P0** (Public) | ✅ OUI | Messages d'erreur techniques, codes HTTP |
| **P1** (Interne) | ✅ OUI | UUIDs, requestId, durées, compteurs |
| **P2** (Personnel) | ❌ **NON** | Email, nom, prénom, IP complète |
| **P3** (Sensible) | ❌ **NON** | Prompts IA, réponses IA, données santé/finance |

### 2.2 Redaction automatique

**Champs redactés** (remplacés par `[REDACTED]`) :
- `password`, `token`, `secret`, `apiKey`, `jwt`
- `email`, `name` (P2)
- `prompt`, `response`, `payload` (P2/P3)

**Anonymisation IP** :
- IPv4 : `192.168.1.123` → `192.168.1.0`
- IPv6 : `2001:db8:85a3::8a2e:370:7334` → `2001:db8:85a3:0::`

---

## 3. Architecture implémentée

### 3.1 Logger structuré (Pino)

**Fichier** : [src/infrastructure/logging/logger.ts](../../src/infrastructure/logging/logger.ts)

**Fonctionnalités** :
- ✅ Logs JSON structurés (production)
- ✅ Logs pretty-printed (développement)
- ✅ Niveaux configurables (`LOG_LEVEL` env)
- ✅ Redaction automatique (SENSITIVE_FIELDS)
- ✅ Contexte par requête (requestId)
- ✅ Event types standardisés (LogEvent enum)

**Usage** :
```typescript
import { logger, LogEvent } from '@/infrastructure/logging/logger';

// Log simple
logger.info({ event: LogEvent.HTTP_REQUEST }, 'Request received');

// Log avec contexte
logger.info({
  event: LogEvent.AI_INVOKE,
  aiJobId: 'uuid',  // ✅ P1: UUID opaque
  duration: 1234,   // ✅ P1: métrique
}, 'AI invocation completed');

// Log erreur
logger.error({
  event: LogEvent.DB_ERROR,
  error: { message: err.message },
}, 'Database error');
```

### 3.2 Middleware HTTP

**Fichier** : [src/infrastructure/logging/middleware.ts](../../src/infrastructure/logging/middleware.ts)

**Fonctionnalités** :
- ✅ Logging automatique HTTP requests/responses
- ✅ Request ID unique (`X-Request-ID` header)
- ✅ Anonymisation IP (RGPD requirement)
- ✅ Métriques automatiques (durée, status)
- ✅ **PAS** de body logging (P2/P3 protection)
- ✅ **PAS** de query params logging (P2/P3 protection)

**Usage** :
```typescript
import { withLogging } from '@/infrastructure/logging/middleware';

export const GET = withLogging(async (req) => {
  return NextResponse.json({ data: 'example' });
});
```

### 3.3 Système de métriques

**Fichier** : [src/infrastructure/logging/metrics.ts](../../src/infrastructure/logging/metrics.ts)

**Fonctionnalités** :
- ✅ Counters (occurrences d'événements)
- ✅ Histograms (distribution de valeurs)
- ✅ Export JSON (`/api/metrics`)
- ✅ **PAS** de labels sensibles (userId, tenantId interdits)
- ✅ Path sanitization (UUIDs → `:id`)

**Métriques disponibles** :
```typescript
export const AppMetrics = {
  // HTTP
  httpRequests: counter('http_requests_total'),
  httpDuration: histogram('http_request_duration_ms'),
  httpErrors: counter('http_errors_total'),

  // Database
  dbQueries: counter('db_queries_total'),
  dbDuration: histogram('db_query_duration_ms'),
  dbErrors: counter('db_errors_total'),

  // AI/LLM
  aiInvocations: counter('ai_invocations_total'),
  aiDuration: histogram('ai_invocation_duration_ms'),
  aiErrors: counter('ai_errors_total'),

  // RGPD
  rgpdConsents: counter('rgpd_consents_total'),
  rgpdExports: counter('rgpd_exports_total'),
  rgpdDeletions: counter('rgpd_deletions_total'),
  rgpdPurges: counter('rgpd_purges_total'),
};
```

---

## 4. Endpoints d'observabilité

### 4.1 Health Check

**Endpoint** : `GET /api/health`

**Fichier** : [src/app/api/health/route.ts](../../src/app/api/health/route.ts)

**Checks** :
- ✅ Database connectivity (PostgreSQL)
- ✅ Application uptime
- ✅ NO sensitive data

**Réponse (200 OK)** :
```json
{
  "status": "ok",
  "timestamp": "2025-12-25T10:30:00.000Z",
  "uptime": 123456,
  "checks": {
    "database": { "status": "healthy", "latency": 5 },
    "application": { "status": "healthy", "latency": 123456 }
  }
}
```

**Réponse (503 Service Unavailable)** :
```json
{
  "status": "degraded",
  "timestamp": "2025-12-25T10:30:00.000Z",
  "uptime": 123456,
  "checks": {
    "database": { "status": "unhealthy", "error": "Connection refused" },
    "application": { "status": "healthy", "latency": 123456 }
  }
}
```

### 4.2 Metrics Export

**Endpoint** : `GET /api/metrics`

**Fichier** : [src/app/api/metrics/route.ts](../../src/app/api/metrics/route.ts)

**Sécurité** : TODO LOT 5.3 - Ajouter authentification (admin only)

**Réponse** :
```json
{
  "timestamp": "2025-12-25T10:30:00.000Z",
  "counters": {
    "http_requests_total": {
      "method=\"GET\",path=\"/api/users/:id\",status=\"200\"": 1234
    },
    "db_queries_total": {
      "type=\"SELECT\"": 5678
    }
  },
  "histograms": {
    "http_request_duration_ms": {
      "count": 1234,
      "sum": 56789,
      "avg": 46,
      "min": 5,
      "max": 500,
      "p50": 40,
      "p95": 150,
      "p99": 300
    }
  }
}
```

---

## 5. Fichiers créés/modifiés

### 5.1 Infrastructure logging

| Fichier | Lignes | Description |
|---------|--------|-------------|
| [src/infrastructure/logging/logger.ts](../../src/infrastructure/logging/logger.ts) | 238 | Logger structuré Pino + redaction + LogEvent enum |
| [src/infrastructure/logging/middleware.ts](../../src/infrastructure/logging/middleware.ts) | 121 | HTTP middleware + IP anonymization |
| [src/infrastructure/logging/metrics.ts](../../src/infrastructure/logging/metrics.ts) | 227 | Counters + Histograms + export JSON |
| [src/infrastructure/logging/index.ts](../../src/infrastructure/logging/index.ts) | 13 | Index exports |

### 5.2 API endpoints

| Fichier | Lignes | Description |
|---------|--------|-------------|
| [src/app/api/health/route.ts](../../src/app/api/health/route.ts) | 91 | Health check (DB + app uptime) |
| [src/app/api/metrics/route.ts](../../src/app/api/metrics/route.ts) | 52 | Metrics export JSON |

### 5.3 Documentation

| Fichier | Lignes | Description |
|---------|--------|-------------|
| [docs/observability/LOGGING.md](../../docs/observability/LOGGING.md) | 450+ | Politique logging RGPD-safe (normatif) |

### 5.4 Tests

| Fichier | Lignes | Description |
|---------|--------|-------------|
| [tests/logging.sentinel.test.ts](../../tests/logging.sentinel.test.ts) | 350+ | Tests sentinelles (RGPD compliance) |

### 5.5 Dependencies

| Package | Version | Usage |
|---------|---------|-------|
| `pino` | latest | Logger structuré performant |
| `pino-pretty` | latest | Pretty printer (dev mode) |

---

## 6. Tests de validation

### 6.1 Acceptance criteria (TASKS.md)

| Critère | Statut | Validation |
|---------|--------|------------|
| Aucune donnée utilisateur dans logs | ✅ PASS | Tests sentinelles + redaction auto |
| Aucune dimension métrique sensible | ✅ PASS | Métriques P0/P1 uniquement |
| Test sentinel logs sur endpoints clés | ✅ PASS | `tests/logging.sentinel.test.ts` |

### 6.2 Tests sentinelles

**Fichier** : [tests/logging.sentinel.test.ts](../../tests/logging.sentinel.test.ts)

**Coverage** :
- ✅ Redaction `password`, `token`, `secret`, `apiKey`
- ✅ Redaction `email`, `name` (P2 data)
- ✅ Redaction `prompt`, `response` (P2/P3 data)
- ✅ Redaction nested fields
- ✅ Allow UUIDs (P1 data)
- ✅ Allow technical metrics (P1 data)
- ✅ Allow error messages (P0 data)
- ✅ HTTP events sans body/query params
- ✅ RGPD events avec IDs uniquement
- ✅ AI events sans prompts/responses
- ✅ IP anonymization (IPv4 + IPv6)

**Exécution** :
```bash
npm test tests/logging.sentinel.test.ts
```

### 6.3 TypeCheck

```bash
npm run typecheck  # ✅ 0 erreurs
```

---

## 7. Configuration

### 7.1 Variables d'environnement

| Variable | Valeurs | Défaut | Usage |
|----------|---------|--------|-------|
| `LOG_LEVEL` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` | `info` | Niveau minimum logs |
| `NODE_ENV` | `production`, `development`, `test` | `development` | Format logs (JSON vs pretty) |

### 7.2 Recommandations par environnement

| Environnement | LOG_LEVEL | NODE_ENV | Raison |
|---------------|-----------|----------|--------|
| Production | `info` | `production` | Performance + minimisation |
| Staging | `debug` | `production` | Tests pré-prod |
| Development | `debug` | `development` | Debugging complet |
| Tests | `warn` | `test` | Limiter bruit |

---

## 8. Exemples d'usage

### 8.1 Logger dans use-case

```typescript
import { logger, LogEvent } from '@/infrastructure/logging/logger';

export async function executeAIJob(aiJobId: string) {
  logger.info({
    event: LogEvent.JOB_START,
    jobId: aiJobId,
    jobType: 'ai_invocation',
  }, 'AI job started');

  try {
    const result = await runAI();

    logger.info({
      event: LogEvent.JOB_COMPLETE,
      jobId: aiJobId,
      duration: 1234,
    }, 'AI job completed');

    return result;
  } catch (error: any) {
    logger.error({
      event: LogEvent.JOB_ERROR,
      jobId: aiJobId,
      error: { message: error.message },
    }, 'AI job failed');

    throw error;
  }
}
```

### 8.2 Middleware dans API route

```typescript
import { withLogging } from '@/infrastructure/logging/middleware';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withLogging(async (req: NextRequest) => {
  const body = await req.json();

  // Handler logic
  // ...

  return NextResponse.json({ success: true });
});
// Logs automatiques :
// - HTTP_REQUEST (method, path, requestId, IP anonymisée)
// - HTTP_RESPONSE (status, duration, requestId)
```

### 8.3 Métriques personnalisées

```typescript
import { AppMetrics } from '@/infrastructure/logging/metrics';

// Incrémenter compteur
AppMetrics.rgpdExports.inc({ status: 'success' });

// Observer durée
const start = Date.now();
// ... operation ...
AppMetrics.aiDuration.observe(Date.now() - start, {
  provider: 'ollama',
  model: 'tinyllama',
});
```

---

## 9. Conformité documents normatifs

### 9.1 BOUNDARIES.md

| Frontière | Respect | Validation |
|-----------|---------|------------|
| Logs techniques uniquement | ✅ | Aucun log métier (prompts, réponses) |
| Aucune donnée IA hors Gateway | ✅ | Logs AI: aiJobId uniquement, pas de contenu |

### 9.2 DATA_CLASSIFICATION.md

| Règle | Respect | Validation |
|-------|---------|------------|
| Aucune donnée P2/P3 dans logs | ✅ | Redaction auto + tests sentinelles |
| Traçabilité sans exposition | ✅ | UUIDs + events, pas de contenu |
| Minimisation stricte | ✅ | Logs P0/P1 uniquement |

---

## 10. Roadmap post-LOT 6.1

### LOT 6.2 - Hardening & Centralisation

- [ ] Integration Prometheus (scraping `/api/metrics`)
- [ ] Dashboards Grafana (HTTP, DB, AI, RGPD)
- [ ] Centralisation logs (Loki / ELK Stack)
- [ ] Alerting (PagerDuty, OpsGenie)
- [ ] Log retention policy (30 jours max)
- [ ] Anonymisation automatique (hash IPs après 7 jours)
- [ ] Purge automatique logs (30 jours)

### LOT 7.x - Conformité & Audit

- [ ] Export logs RGPD-compliant (audit trail)
- [ ] Rapport conformité logging (CNIL-ready)
- [ ] Preuves techniques audit

---

## 11. Troubleshooting

### 11.1 Problèmes courants

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| Logs vides | LOG_LEVEL trop élevé | Vérifier `LOG_LEVEL=info` (pas `error`) |
| Logs non structurés | NODE_ENV=development | Utiliser `NODE_ENV=production` pour JSON |
| Données sensibles dans logs | Champ non redacté | Ajouter à `SENSITIVE_FIELDS` dans logger.ts |
| Métriques manquantes | Pas d'appel `AppMetrics.*.inc()` | Instrumenter le code |

### 11.2 Debugging

```bash
# Logs en temps réel (development)
LOG_LEVEL=debug npm run dev

# Logs production (JSON)
NODE_ENV=production LOG_LEVEL=info npm start

# Test métriques
curl http://localhost:3000/api/metrics | jq

# Test health check
curl http://localhost:3000/api/health | jq
```

---

## 12. Checklist DoD (Definition of Done)

### 12.1 Acceptance criteria LOT 6.1

- [x] Logs structurés (JSON production, pretty dev)
- [x] Métriques sans labels sensibles (P0/P1 uniquement)
- [x] Documentation logging policy (LOGGING.md)
- [x] Aucune donnée utilisateur dans logs (tests sentinelles)
- [x] Aucune dimension métrique sensible
- [x] Test sentinel logs passants

### 12.2 DoD général (CLAUDE.md)

- [x] Frontières d'architecture respectées
- [x] Aucun appel IA hors Gateway LLM
- [x] Aucune donnée sensible en clair dans logs (redaction auto)
- [x] Classification des données respectée (P0/P1 uniquement)
- [x] Tests fonctionnels passants (sentinels PASS)
- [x] Comportement en cas d'échec défini (logs errors)
- [x] Traçabilité RGPD assurée (audit events)

---

## 13. Références

- **TASKS.md** : LOT 6.1 (lignes 570-590)
- **DATA_CLASSIFICATION.md** : Classification P0/P1/P2/P3
- **BOUNDARIES.md** : Frontières architecture
- **EPIC 6** : Stack IA Docker RGPD-ready
- **LOGGING.md** : Politique logging (normatif)

---

**Implémenté par** : Claude Sonnet 4.5
**Date de livraison** : 2025-12-25
**Status** : ✅ VALIDÉ (DoD complet)
