# LOGGING.md — Politique de logging RGPD-safe

> **Objectif** : définir les règles strictes de logging pour garantir la **conformité RGPD**, la **minimisation des données** et l'**auditabilité technique**.

Ce document est **normatif** (LOT 6.1). Tout log **contenant des données P2/P3** est une **violation bloquante**.

---

## 1. Principes fondamentaux

### 1.1 Règles absolues

❌ **JAMAIS** logger de données P2/P3 (DATA_CLASSIFICATION.md) :
- ❌ Noms, prénoms, emails
- ❌ Prompts IA, réponses IA
- ❌ Payloads métier (body de requêtes)
- ❌ Mots de passe, tokens, secrets
- ❌ Données de santé, financières, juridiques

✅ **UNIQUEMENT** logger des événements techniques (P0/P1) :
- ✅ UUIDs, IDs opaques (userId, tenantId, requestId)
- ✅ Codes d'état HTTP (200, 404, 500)
- ✅ Durées d'exécution (ms)
- ✅ Compteurs agrégés
- ✅ Messages d'erreur techniques (sans données utilisateur)

### 1.2 Format structuré (JSON)

**Production** : logs structurés JSON (parsables par Loki/ELK)
```json
{
  "level": "info",
  "time": "2025-12-25T10:30:00.000Z",
  "event": "http_request",
  "method": "POST",
  "path": "/api/users/:id",
  "status": 200,
  "duration": 45,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "msg": "POST /api/users/:id - 200 (45ms)"
}
```

**Development** : logs pretty-printed (lisibles)
```
[10:30:00] INFO (http_request): POST /api/users/:id - 200 (45ms)
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    duration: 45
```

---

## 2. Architecture logging

### 2.1 Logger structuré (Pino)

**Fichier** : `src/infrastructure/logging/logger.ts`

**Fonctionnalités** :
- Niveaux configurables (fatal, error, warn, info, debug, trace)
- Redaction automatique (SENSITIVE_FIELDS)
- Contexte par requête (requestId)
- Anonymisation IP (192.168.1.123 → 192.168.1.0)

**Usage** :
```typescript
import { logger, LogEvent } from '@/infrastructure/logging/logger';

// Log simple
logger.info({ event: LogEvent.HTTP_REQUEST }, 'Request received');

// Log avec contexte
logger.info({
  event: LogEvent.AI_INVOKE,
  aiJobId: 'uuid',  // ✅ P1: UUID opaque
  duration: 1234,   // ✅ P1: métrique technique
}, 'AI invocation completed');

// Log erreur
logger.error({
  event: LogEvent.DB_ERROR,
  error: { message: err.message, name: err.name }, // ✅ P0: message technique
}, 'Database query failed');
```

### 2.2 Middleware HTTP

**Fichier** : `src/infrastructure/logging/middleware.ts`

**Fonctionnalités** :
- Logging automatique des requêtes HTTP
- Request ID unique (X-Request-ID)
- Anonymisation IP (RGPD requirement)
- Métriques automatiques (durée, status)

**Usage** :
```typescript
import { withLogging } from '@/infrastructure/logging/middleware';

export const GET = withLogging(async (req) => {
  // Handler code
  return NextResponse.json({ data: 'example' });
});
```

### 2.3 Métriques (simple registry)

**Fichier** : `src/infrastructure/logging/metrics.ts`

**Fonctionnalités** :
- Counters (occurrences)
- Histograms (distributions)
- Export JSON (`/api/metrics`)
- Pas de labels sensibles

**Usage** :
```typescript
import { AppMetrics } from '@/infrastructure/logging/metrics';

// Incrémenter compteur
AppMetrics.httpRequests.inc({ method: 'GET', path: '/api/users', status: '200' });

// Observer durée
AppMetrics.httpDuration.observe(45, { method: 'GET', path: '/api/users' });
```

---

## 3. Classification des logs

### 3.1 Logs autorisés (P0/P1)

| Événement | Données loggées | Classification |
|-----------|----------------|----------------|
| HTTP Request | method, path (sanitizé), status, duration, requestId | P1 |
| HTTP Response | status, duration, requestId | P1 |
| HTTP Error | status, error.message (technique), requestId | P1 |
| DB Query | queryType (SELECT/INSERT/etc.), duration, error.message | P1 |
| AI Invoke | aiJobId (UUID), provider, model, duration | P1 |
| AI Error | aiJobId (UUID), error.message (technique) | P1 |
| Auth Login | userId (UUID), success/failure | P1 |
| Auth Logout | userId (UUID) | P1 |
| RGPD Consent | userId (UUID), consentId (UUID), action (grant/revoke) | P1 |
| RGPD Export | userId (UUID), exportId (UUID), status | P1 |
| RGPD Delete | userId (UUID), deleteId (UUID), status | P1 |
| Job Start | jobId (UUID), jobType | P1 |
| Job Complete | jobId (UUID), jobType, duration, recordsProcessed (count) | P1 |

### 3.2 Logs INTERDITS (P2/P3)

| Donnée | Classification | Exemple | Raison |
|--------|---------------|---------|--------|
| Email | P2 | `user@example.com` | Identifie directement une personne |
| Nom, prénom | P2 | `John Doe` | Identifie directement une personne |
| Prompt IA | P2/P3 | `Analyze this patient: ...` | Peut contenir données sensibles |
| Réponse IA | P2/P3 | `The patient has...` | Peut contenir données sensibles |
| Request body | P2/P3 | `{ name: "John", email: "..." }` | Peut contenir données personnelles |
| Query params | P2/P3 | `?email=user@example.com` | Peut contenir données personnelles |
| IP complète | P2 | `192.168.1.123` | Identifiant réseau (anonymiser) |
| User-Agent complet | P2 | `Mozilla/5.0 ...` | Peut être identifiant (hash ou ignorer) |

---

## 4. Niveaux de log (guideline)

### 4.1 Par environnement

| Environnement | Niveau recommandé | Raison |
|---------------|-------------------|--------|
| Production | `info` | Performance + minimisation |
| Staging | `info` ou `debug` | Tests pré-prod |
| Development | `debug` | Debugging complet |
| Tests | `warn` | Limiter bruit |

### 4.2 Par niveau

| Niveau | Usage | Exemple |
|--------|-------|---------|
| **fatal** | Erreur critique (app crash) | `logger.fatal({ event: 'app_crash', error }, 'Application crashed')` |
| **error** | Erreur nécessitant investigation | `logger.error({ event: 'db_error', error }, 'Database connection lost')` |
| **warn** | Situation anormale mais récupérable | `logger.warn({ event: 'rate_limit_exceeded', userId }, 'Rate limit exceeded')` |
| **info** | Événements métier importants | `logger.info({ event: 'rgpd_export_completed', exportId }, 'Export completed')` |
| **debug** | Détails techniques (dev/staging) | `logger.debug({ event: 'db_query', duration: 12 }, 'Query executed')` |
| **trace** | Débogage très détaillé (dev uniquement) | `logger.trace({ event: 'cache_hit', key }, 'Cache hit')` |

---

## 5. Endpoints d'observabilité

### 5.1 Health Check

**Endpoint** : `GET /api/health`

**Usage** : Monitoring externe (Kubernetes, Docker health checks)

**Réponse** :
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

### 5.2 Metrics Export

**Endpoint** : `GET /api/metrics`

**Usage** : Export métriques (Prometheus scraping, dashboards)

**Sécurité** : TODO LOT 5.3 - Ajouter authentification (admin only)

**Réponse** :
```json
{
  "timestamp": "2025-12-25T10:30:00.000Z",
  "counters": {
    "http_requests_total": {
      "method=\"GET\",path=\"/api/users\",status=\"200\"": 1234
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

## 6. Configuration

### 6.1 Variables d'environnement

| Variable | Valeurs | Défaut | Usage |
|----------|---------|--------|-------|
| `LOG_LEVEL` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` | `info` | Niveau minimum de log |
| `NODE_ENV` | `production`, `development`, `test` | `development` | Format logs (JSON vs pretty) |

### 6.2 Redaction automatique

**Fichier** : `src/infrastructure/logging/logger.ts`

**Champs redactés automatiquement** :
```typescript
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'sessionToken',
  'jwt',
  'email',
  'name',
  'prompt',
  'response',
  'payload',
];
```

**Comportement** : Remplacé par `[REDACTED]`

---

## 7. Tests de conformité

### 7.1 Tests sentinelles (LOT 6.1)

**Objectif** : Vérifier qu'aucune donnée P2/P3 n'apparaît dans les logs

**Fichier** : `tests/logging.sentinel.test.ts`

**Stratégie** :
1. Simuler requête HTTP avec données P2/P3
2. Capturer logs émis
3. Vérifier absence de données sensibles (regex)

**Exemple** :
```typescript
test('HTTP middleware should NOT log request body', async () => {
  const req = new NextRequest('http://localhost/api/users', {
    method: 'POST',
    body: JSON.stringify({
      name: 'John Doe',      // P2
      email: 'john@example.com', // P2
    }),
  });

  const handler = withLogging(async () => NextResponse.json({ ok: true }));
  await handler(req);

  const logs = captureLogs();
  expect(logs).not.toContain('John Doe');
  expect(logs).not.toContain('john@example.com');
});
```

### 7.2 Validation manuelle

**Checklist avant déploiement** :
- [ ] Aucun log ne contient d'email
- [ ] Aucun log ne contient de nom/prénom
- [ ] Aucun log ne contient de prompt/réponse IA
- [ ] Aucun log ne contient de payload HTTP
- [ ] IPs sont anonymisées (last octet = 0)
- [ ] Tous les logs ont un `requestId` (traçabilité)

---

## 8. Roadmap (post LOT 6.1)

### LOT 6.2 - Hardening & Centralisation

- [ ] Integration Prometheus (scraping `/api/metrics`)
- [ ] Dashboards Grafana (HTTP, DB, AI, RGPD)
- [ ] Centralisation logs (Loki / ELK Stack)
- [ ] Alerting (PagerDuty, OpsGenie)
- [ ] Log retention policy (30 jours max)

### LOT 7.x - Conformité & Audit

- [ ] Export logs RGPD-compliant (audit trail)
- [ ] Anonymisation automatique (hash IPs après 7 jours)
- [ ] Purge automatique logs (30 jours)
- [ ] Rapport conformité logging (CNIL-ready)

---

## 9. Références

- **DATA_CLASSIFICATION.md** : Classification P0/P1/P2/P3
- **BOUNDARIES.md** : Isolation logging par couche
- **TASKS.md** : LOT 6.1 (lignes 570-590)
- **EPIC 6** : Stack IA Docker RGPD-ready (observabilité)

---

**Document normatif — toute violation logging doit être corrigée avant déploiement.**
