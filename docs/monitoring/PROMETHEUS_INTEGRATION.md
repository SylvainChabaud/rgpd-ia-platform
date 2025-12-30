# Prometheus & Grafana Integration — RGPD-Safe Monitoring

**LOT 6.1** — Observabilité RGPD-safe

**Date** : 2025-12-30
**Statut** : ✅ Implémenté et testé (17 tests E2E passants)

---

## 📊 Vue d'ensemble

La plateforme expose des **métriques RGPD-safe** au format Prometheus pour l'observabilité production.

### Principes RGPD

✅ **Conformité Art. 32 RGPD (Sécurité)** :
- ❌ **AUCUNE donnée sensible** dans les labels (user IDs, tenant IDs, emails)
- ✅ **Uniquement dimensions P0/P1** (status HTTP, méthodes, types d'événements)
- ✅ **Métriques agrégées** (compteurs, quantiles, moyennes)
- ✅ **Sanitisation automatique** des chemins (UUIDs → `:id`)

---

## 🔗 Endpoints Disponibles

### 1️⃣ `/api/metrics` — Format JSON

**Usage** : Monitoring interne, debugging

```bash
curl http://localhost:3000/api/metrics
```

**Réponse** :
```json
{
  "timestamp": "2025-12-30T22:45:00.000Z",
  "counters": {
    "http_requests_total": {
      "method=\"GET\",path=\"/api/users\",status=\"200\"": 42
    },
    "rgpd_consents_total": {
      "action=\"grant\"": 15,
      "action=\"revoke\"": 3
    }
  },
  "histograms": {
    "http_request_duration_ms": {
      "count": 42,
      "sum": 2100,
      "avg": 50,
      "p50": 45,
      "p95": 95,
      "p99": 150
    }
  }
}
```

---

### 2️⃣ `/api/metrics/prometheus` — Format Prometheus

**Usage** : Scraping Prometheus

```bash
curl http://localhost:3000/api/metrics/prometheus
```

**Réponse** (format OpenMetrics) :
```prometheus
# Timestamp: 2025-12-30T22:45:00.000Z

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/users",status="200"} 42

# HELP rgpd_consents_total Total number of RGPD consent operations
# TYPE rgpd_consents_total counter
rgpd_consents_total{action="grant"} 15
rgpd_consents_total{action="revoke"} 3

# HELP http_request_duration_ms HTTP request duration in milliseconds
# TYPE http_request_duration_ms summary
http_request_duration_ms_count 42
http_request_duration_ms_sum 2100
http_request_duration_ms{quantile="0.5"} 45
http_request_duration_ms{quantile="0.95"} 95
http_request_duration_ms{quantile="0.99"} 150
http_request_duration_ms_min 10
http_request_duration_ms_max 150
http_request_duration_ms_avg 50
```

---

## 📈 Métriques Disponibles

### Métriques HTTP

| Métrique | Type | Description | Labels |
|----------|------|-------------|--------|
| `http_requests_total` | Counter | Total requêtes HTTP | `method`, `path`, `status` |
| `http_request_duration_ms` | Summary | Durée requêtes (ms) | `method`, `path` |
| `http_errors_total` | Counter | Erreurs HTTP (≥400) | `method`, `path`, `status` |

### Métriques RGPD ✅

| Métrique | Type | Description | Labels |
|----------|------|-------------|--------|
| `rgpd_consents_total` | Counter | Opérations consentement | `action` (grant, revoke) |
| `rgpd_exports_total` | Counter | Exports de données | `status` (created, downloaded) |
| `rgpd_deletions_total` | Counter | Demandes d'effacement | `status` (requested, completed) |
| `rgpd_purges_total` | Counter | Purges exécutées | `status` (executed) |

### Métriques Base de Données

| Métrique | Type | Description | Labels |
|----------|------|-------------|--------|
| `db_queries_total` | Counter | Total requêtes DB | `type` (select, insert, update) |
| `db_query_duration_ms` | Summary | Durée requêtes DB (ms) | `type` |
| `db_errors_total` | Counter | Erreurs DB | `type` |

### Métriques IA/LLM

| Métrique | Type | Description | Labels |
|----------|------|-------------|--------|
| `ai_invocations_total` | Counter | Invocations LLM | `provider` (ollama, stub) |
| `ai_invocation_duration_ms` | Summary | Durée invocations (ms) | `provider` |
| `ai_errors_total` | Counter | Erreurs LLM | `provider` |

### Métriques Authentification

| Métrique | Type | Description | Labels |
|----------|------|-------------|--------|
| `auth_attempts_total` | Counter | Tentatives d'auth | `status` (success, failure) |
| `auth_failures_total` | Counter | Échecs d'auth | `reason` |

### Métriques Jobs (Background)

| Métrique | Type | Description | Labels |
|----------|------|-------------|--------|
| `jobs_executed_total` | Counter | Jobs exécutés | `job_name` |
| `job_duration_ms` | Summary | Durée jobs (ms) | `job_name` |
| `job_errors_total` | Counter | Erreurs jobs | `job_name` |

---

## 🐳 Configuration Prometheus

### `prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'rgpd-platform'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics/prometheus'
    scrape_interval: 10s
```

### Lancement Prometheus (Docker)

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

**Accès** : http://localhost:9090

---

## 📊 Configuration Grafana

### Datasource Prometheus

1. **Ajouter Datasource** : Configuration > Data Sources > Add data source > Prometheus
2. **URL** : `http://prometheus:9090` (si Docker) ou `http://localhost:9090`
3. **Save & Test**

### Dashboard RGPD — JSON

```json
{
  "dashboard": {
    "title": "RGPD Operations Monitoring",
    "panels": [
      {
        "title": "RGPD Consents (Total)",
        "targets": [
          {
            "expr": "sum(rate(rgpd_consents_total[5m])) by (action)"
          }
        ]
      },
      {
        "title": "RGPD Exports (Rate)",
        "targets": [
          {
            "expr": "rate(rgpd_exports_total[5m])"
          }
        ]
      },
      {
        "title": "RGPD Deletions (Total)",
        "targets": [
          {
            "expr": "sum(rgpd_deletions_total) by (status)"
          }
        ]
      },
      {
        "title": "HTTP Request Duration (p95)",
        "targets": [
          {
            "expr": "http_request_duration_ms{quantile=\"0.95\"}"
          }
        ]
      }
    ]
  }
}
```

### Import Dashboard

1. **Grafana** > Dashboards > Import
2. **Coller JSON** ci-dessus
3. **Select datasource** : Prometheus
4. **Import**

---

## 🔐 Sécurité

### ⚠️ TODO (LOT 5.3) : Authentification Endpoint

**Risque actuel** : Endpoint `/api/metrics` accessible publiquement

**Solution recommandée** :

```typescript
// app/api/metrics/prometheus/route.ts
import { requirePermission } from '@/app/http/requirePermission';

export async function GET(req: Request) {
  // Authentification admin/monitoring
  await requirePermission(req, 'metrics:read', 'PLATFORM');

  // ... export metrics
}
```

**Alternative** : Restriction réseau (firewall, VPN interne uniquement)

---

## ✅ Validation RGPD

### Tests Automatisés

**17 tests E2E** : [tests/api.metrics.test.ts](../../tests/api.metrics.test.ts)

```bash
npm test -- tests/api.metrics.test.ts
```

**Couverture** :
- ✅ Format Prometheus valide
- ✅ AUCUN email détecté (pattern `@`)
- ✅ AUCUN UUID détecté (pattern `[0-9a-f]{8}-...`)
- ✅ Sanitisation chemins (`/api/users/123` → `/api/users/:id`)
- ✅ Métriques RGPD présentes

### Checklist Conformité

- [x] **Art. 5.c (Minimisation)** : Uniquement métriques P0/P1
- [x] **Art. 32 (Sécurité)** : Aucune donnée sensible
- [x] **Art. 25 (Privacy by Design)** : Sanitisation automatique
- [x] **Documentation** : Métriques documentées
- [x] **Tests** : Validation automatisée

---

## 📊 Exemples Requêtes PromQL

### RGPD — Taux de consentements

```promql
rate(rgpd_consents_total[5m])
```

### RGPD — Total exports par statut

```promql
sum(rgpd_exports_total) by (status)
```

### HTTP — Erreurs 4xx/5xx (taux)

```promql
rate(http_errors_total{status=~"4..|5.."}[5m])
```

### HTTP — Latence p95

```promql
http_request_duration_ms{quantile="0.95"}
```

### IA — Durée moyenne invocations

```promql
ai_invocation_duration_ms_avg
```

### Jobs — Échecs (24h)

```promql
sum(increase(job_errors_total[24h])) by (job_name)
```

---

## 🎯 Alerting (Recommandations)

### Alerte RGPD : Taux d'erreurs exports > 5%

```yaml
groups:
  - name: rgpd_alerts
    rules:
      - alert: HighRgpdExportErrorRate
        expr: rate(rgpd_exports_total{status="error"}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Taux d'erreurs exports RGPD élevé"
```

### Alerte HTTP : Latence p95 > 500ms

```yaml
- alert: HighHttpLatency
  expr: http_request_duration_ms{quantile="0.95"} > 500
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Latence HTTP élevée (p95 > 500ms)"
```

---

## 🧪 Tests & Validation

### Test Manuel (Format Prometheus)

```bash
# 1. Enregistrer quelques métriques
curl -X POST http://localhost:3000/api/consents \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"purpose": "analytics", "granted": true}'

# 2. Vérifier export Prometheus
curl http://localhost:3000/api/metrics/prometheus

# 3. Valider format (doit contenir)
#    - # HELP rgpd_consents_total
#    - # TYPE rgpd_consents_total counter
#    - rgpd_consents_total{action="grant"} 1
```

### Test Automatisé

```bash
npm test -- tests/api.metrics.test.ts
```

**Résultat attendu** : ✅ 17/17 tests passants

---

## 🚀 Prochaines Étapes (LOT 6.2 — Optionnel)

1. **Dashboards Grafana prédéfinis** (JSON export)
2. **Alerting Prometheus** (règles d'alerte RGPD)
3. **Retention Prometheus** (TSDB, 15 jours recommandé)
4. **Exporteurs supplémentaires** (Loki pour logs, Jaeger pour tracing)

---

## 📚 Références

- **Prometheus Documentation** : https://prometheus.io/docs/
- **Grafana Documentation** : https://grafana.com/docs/
- **OpenMetrics Specification** : https://openmetrics.io/
- **RGPD Article 32** : Sécurité du traitement

---

**Auteur** : Claude Code
**Version** : 1.0
**Date** : 2025-12-30
