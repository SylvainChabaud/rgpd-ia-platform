# Index des implémentations — EPICs 1-8

> **Objectif** : Table de correspondance exhaustive entre LOTs (TASKS.md), fichiers implémentés et tests RGPD.

**Dernière mise à jour** : 2026-01-01
**Status global** : ✅ EPICs 1-8 terminés (100%)

---

## Vue d'ensemble

| EPIC | LOTs | Documents | Status | Tests |
|------|------|-----------|--------|-------|
| **EPIC 1** | 1.0-1.5 (6 LOTs) | [LOT1_IMPLEMENTATION.md](LOT1_IMPLEMENTATION.md) | ✅ 100% | 42/42 |
| **EPIC 2** | 2.0-2.1 (2 LOTs) | [LOT2_IMPLEMENTATION.md](LOT2_IMPLEMENTATION.md) | ✅ 100% | - |
| **EPIC 3** | 3.0 (1 LOT) | [LOT3_IMPLEMENTATION.md](LOT3_IMPLEMENTATION.md) | ✅ 100% | 5/5 |
| **EPIC 4** | 4.0-4.1 (2 LOTs) | [LOT4.0](LOT4.0_IMPLEMENTATION.md), [LOT4.1](LOT4.1_IMPLEMENTATION.md) | ✅ 100% | 23/23 |
| **EPIC 5** | 5.0-5.3 (4 LOTs) | [LOT5.0](LOT5.0_IMPLEMENTATION.md), [LOT5.1](LOT5.1_IMPLEMENTATION.md), [LOT5.2](LOT5.2_IMPLEMENTATION.md), [LOT5.3](LOT5.3_IMPLEMENTATION.md) | ✅ 100% | 72/72 |
| **EPIC 6** | 6.0-6.1 (2 LOTs) | [LOT6.0](LOT6.0_IMPLEMENTATION.md), [LOT6.1](LOT6.1_IMPLEMENTATION.md) | ✅ 100% | - |
| **EPIC 7** | 7.0-7.1 (2 LOTs) | [LOT7_IMPLEMENTATION.md](LOT7_IMPLEMENTATION.md) | ✅ 100% | - |
| **EPIC 8** | 8.0-8.2 (3 LOTs) | [LOT8_IMPLEMENTATION.md](LOT8_IMPLEMENTATION.md) | ✅ 100% | 110/110 |

**Total** : 22 LOTs implémentés, 252+ tests RGPD passing

---

## EPIC 1 — Socle applicatif sécurisé

### LOT 1.0 — Bootstrap repo + quality gates

**Document** : [LOT1_IMPLEMENTATION.md](LOT1_IMPLEMENTATION.md) (lignes 28-96)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `.env.example` | Config | [.env.example](../../.env.example) | ✅ |
| `ci.yml` | CI/CD | [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | ✅ |
| `pull_request_template.md` | Template | [.github/pull_request_template.md](../../.github/pull_request_template.md) | ✅ |

**Tests** : Tests sentinelles intégrés

---

### LOT 1.1 — Multi-tenant resolution

**Document** : [LOT1_IMPLEMENTATION.md](LOT1_IMPLEMENTATION.md) (lignes 539-545)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `RequestContext.ts` | Types | [src/app/context/RequestContext.ts](../../src/app/context/RequestContext.ts) | ✅ |
| `tenantGuard.ts` | Middleware | [src/app/http/tenantGuard.ts](../../src/app/http/tenantGuard.ts) | ✅ |
| `actorScope.ts` | Enum | [src/shared/actorScope.ts](../../src/shared/actorScope.ts) | ✅ |

**Tests** : [tests/http.tenant-guard.test.ts](../../tests/http.tenant-guard.test.ts)

---

### LOT 1.2 — AuthN + RBAC/ABAC

**Document** : [LOT1_IMPLEMENTATION.md](LOT1_IMPLEMENTATION.md) (lignes 98-496)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `stubAuthProvider.ts` | Auth (stub) | [src/app/auth/stubAuthProvider.ts](../../src/app/auth/stubAuthProvider.ts) | ✅ |
| `policyEngine.ts` | RBAC/ABAC | [src/app/auth/policyEngine.ts](../../src/app/auth/policyEngine.ts) | ✅ |
| `requireAuth.ts` | Middleware | [src/app/http/requireAuth.ts](../../src/app/http/requireAuth.ts) | ✅ |
| `requirePermission.ts` | Middleware | [src/app/http/requirePermission.ts](../../src/app/http/requirePermission.ts) | ✅ |

**Tests** :
- [tests/http.auth.test.ts](../../tests/http.auth.test.ts) (5 tests - 401 rejection)
- [tests/http.authz.test.ts](../../tests/http.authz.test.ts) (7 tests - 403 denial)
- [tests/rgpd.policy-engine.test.ts](../../tests/rgpd.policy-engine.test.ts) (15 tests - RBAC/ABAC)

---

### LOT 1.3 — Audit events RGPD-safe

**Document** : [LOT1_IMPLEMENTATION.md](LOT1_IMPLEMENTATION.md) (lignes 547-554)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `AuditEvent.ts` | Types | [src/app/audit/AuditEvent.ts](../../src/app/audit/AuditEvent.ts) | ✅ |
| `emitAuditEvent.ts` | Helper | [src/app/audit/emitAuditEvent.ts](../../src/app/audit/emitAuditEvent.ts) | ✅ |
| `safeEvent.ts` | Guards | [src/shared/rgpd/safeEvent.ts](../../src/shared/rgpd/safeEvent.ts) | ✅ |
| `PgAuditEventWriter.ts` | Persistence | [src/infrastructure/audit/PgAuditEventWriter.ts](../../src/infrastructure/audit/PgAuditEventWriter.ts) | ✅ |

**Tests** : [tests/rgpd.audit-events-no-payload.test.ts](../../tests/rgpd.audit-events-no-payload.test.ts) (6 tests)

---

### LOT 1.4 — Gateway LLM + anti-bypass

**Document** : [LOT1_IMPLEMENTATION.md](LOT1_IMPLEMENTATION.md) (lignes 556-562)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `invokeLLM.ts` | Gateway | [src/ai/gateway/invokeLLM.ts](../../src/ai/gateway/invokeLLM.ts) | ✅ |
| `stub.ts` | Provider stub | [src/ai/gateway/providers/stub.ts](../../src/ai/gateway/providers/stub.ts) | ✅ |

**Tests** : [tests/rgpd.no-llm-bypass.test.ts](../../tests/rgpd.no-llm-bypass.test.ts) (3 tests)

---

### LOT 1.5 — Bootstrap CLI

**Document** : [LOT1_IMPLEMENTATION.md](LOT1_IMPLEMENTATION.md) (lignes 564-570)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `bootstrap.ts` | CLI | [src/cli/bootstrap.ts](../../src/cli/bootstrap.ts) | ✅ |
| `CreateTenantUseCase.ts` | Use-case | [src/app/usecases/bootstrap/CreateTenantUseCase.ts](../../src/app/usecases/bootstrap/CreateTenantUseCase.ts) | ✅ |
| `CreateTenantAdminUseCase.ts` | Use-case | [src/app/usecases/bootstrap/CreateTenantAdminUseCase.ts](../../src/app/usecases/bootstrap/CreateTenantAdminUseCase.ts) | ✅ |
| `bootstrap.md` | Runbook | [docs/runbooks/bootstrap.md](../runbooks/bootstrap.md) | ✅ |

**Tests** : [tests/rgpd.bootstrap.usecase.test.ts](../../tests/rgpd.bootstrap.usecase.test.ts) (12 tests)

---

## EPIC 2 — Durcissement serveur & réseau

### LOT 2.0 — Baseline sécurité

**Document** : [LOT2_IMPLEMENTATION.md](LOT2_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `security-hardening.md` | Runbook | [docs/runbooks/security-hardening.md](../runbooks/security-hardening.md) | ✅ |
| `backup-policy.md` | Runbook | [docs/runbooks/backup-policy.md](../runbooks/backup-policy.md) | ✅ |
| `.env.example` | Template | [.env.example](../../.env.example) | ✅ |

---

### LOT 2.1 — Docker dev isolé

**Document** : [LOT2_IMPLEMENTATION.md](LOT2_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `docker-compose.dev.yml` | Docker | [docker-compose.dev.yml](../../docker-compose.dev.yml) | ✅ |
| `Dockerfile.dev` | Docker | [Dockerfile.dev](../../Dockerfile.dev) | ✅ |
| `.dockerignore` | Docker | [.dockerignore](../../.dockerignore) | ✅ |
| `docker-dev.md` | Runbook | [docs/runbooks/docker-dev.md](../runbooks/docker-dev.md) | ✅ |

---

## EPIC 3 — Stack IA locale (POC contrôlé)

### LOT 3.0 — Provider IA local

**Document** : [LOT3_IMPLEMENTATION.md](LOT3_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `config.ts` | Config | [src/ai/gateway/config.ts](../../src/ai/gateway/config.ts) | ✅ |
| `ollama.ts` | Provider | [src/ai/gateway/providers/ollama.ts](../../src/ai/gateway/providers/ollama.ts) | ✅ |
| `stub.ts` | Provider stub | [src/ai/gateway/providers/stub.ts](../../src/ai/gateway/providers/stub.ts) | ✅ |

**Tests** : [tests/rgpd.no-prompt-storage.test.ts](../../tests/rgpd.no-prompt-storage.test.ts) (5 tests)

---

## EPIC 4 — Stockage IA & données utilisateur RGPD

### LOT 4.0 — Schéma DB minimal

**Document** : [LOT4.0_IMPLEMENTATION.md](LOT4.0_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `002_lot4_consents_ai_jobs.sql` | Migration | [migrations/002_lot4_consents_ai_jobs.sql](../../migrations/002_lot4_consents_ai_jobs.sql) | ✅ |
| `ConsentRepo.ts` | Port | [src/app/ports/ConsentRepo.ts](../../src/app/ports/ConsentRepo.ts) | ✅ |
| `AiJobRepo.ts` | Port | [src/app/ports/AiJobRepo.ts](../../src/app/ports/AiJobRepo.ts) | ✅ |
| `PgConsentRepo.ts` | Repository | [src/infrastructure/repositories/PgConsentRepo.ts](../../src/infrastructure/repositories/PgConsentRepo.ts) | ✅ |
| `PgAiJobRepo.ts` | Repository | [src/infrastructure/repositories/PgAiJobRepo.ts](../../src/infrastructure/repositories/PgAiJobRepo.ts) | ✅ |

**Tests** : [tests/db.lot4.tenant-isolation.test.ts](../../tests/db.lot4.tenant-isolation.test.ts) (13 tests)

---

### LOT 4.1 — Rétention & minimisation

**Document** : [LOT4.1_IMPLEMENTATION.md](LOT4.1_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `RetentionPolicy.ts` | Domain | [src/domain/retention/RetentionPolicy.ts](../../src/domain/retention/RetentionPolicy.ts) | ✅ |
| `purge.ts` | Job | [src/app/jobs/purge.ts](../../src/app/jobs/purge.ts) | ✅ |
| `purge.ts` | Script | [scripts/purge.ts](../../scripts/purge.ts) | ✅ |

**Tests** : [tests/purge.lot4.test.ts](../../tests/purge.lot4.test.ts) (10 tests)

---

## EPIC 5 — Pipeline RGPD

### LOT 5.0 — Consentement

**Document** : [LOT5.0_IMPLEMENTATION.md](LOT5.0_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `checkConsent.ts` | Enforcement | [src/ai/gateway/enforcement/checkConsent.ts](../../src/ai/gateway/enforcement/checkConsent.ts) | ✅ |
| `grantConsent.ts` | Use-case | [src/app/usecases/consent/grantConsent.ts](../../src/app/usecases/consent/grantConsent.ts) | ✅ |
| `revokeConsent.ts` | Use-case | [src/app/usecases/consent/revokeConsent.ts](../../src/app/usecases/consent/revokeConsent.ts) | ✅ |
| `route.ts` (consents) | API | [app/api/consents/route.ts](../../app/api/consents/route.ts) | ✅ |

**Tests** : [tests/rgpd.consent-enforcement.test.ts](../../tests/rgpd.consent-enforcement.test.ts) (7 tests)

---

### LOT 5.1 — Export RGPD

**Document** : [LOT5.1_IMPLEMENTATION.md](LOT5.1_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `ExportBundle.ts` | Domain | [src/domain/rgpd/ExportBundle.ts](../../src/domain/rgpd/ExportBundle.ts) | ✅ |
| `encryption.ts` | Crypto | [src/infrastructure/crypto/encryption.ts](../../src/infrastructure/crypto/encryption.ts) | ✅ |
| `ExportStorage.ts` | Storage | [src/infrastructure/storage/ExportStorage.ts](../../src/infrastructure/storage/ExportStorage.ts) | ✅ |
| `exportUserData.ts` | Use-case | [src/app/usecases/rgpd/exportUserData.ts](../../src/app/usecases/rgpd/exportUserData.ts) | ✅ |

**Tests** : [tests/rgpd.export.test.ts](../../tests/rgpd.export.test.ts) (7 tests)

---

### LOT 5.2 — Effacement RGPD

**Document** : [LOT5.2_IMPLEMENTATION.md](LOT5.2_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `003_rgpd_deletion.sql` | Migration | [migrations/003_rgpd_deletion.sql](../../migrations/003_rgpd_deletion.sql) | ✅ |
| `DeletionRequest.ts` | Domain | [src/domain/rgpd/DeletionRequest.ts](../../src/domain/rgpd/DeletionRequest.ts) | ✅ |
| `RgpdRequestRepo.ts` | Port | [src/app/ports/RgpdRequestRepo.ts](../../src/app/ports/RgpdRequestRepo.ts) | ✅ |
| `PgRgpdRequestRepo.ts` | Repository | [src/infrastructure/repositories/PgRgpdRequestRepo.ts](../../src/infrastructure/repositories/PgRgpdRequestRepo.ts) | ✅ |
| `deleteUserData.ts` | Use-case | [src/app/usecases/rgpd/deleteUserData.ts](../../src/app/usecases/rgpd/deleteUserData.ts) | ✅ |

**Tests** : [tests/rgpd.deletion.test.ts](../../tests/rgpd.deletion.test.ts) (7 tests)

---

### LOT 5.3 — API Routes HTTP

**Document** : [LOT5.3_IMPLEMENTATION.md](LOT5.3_IMPLEMENTATION.md)

| Endpoint | Fichier | Status |
|----------|---------|--------|
| POST /api/rgpd/delete | [app/api/rgpd/delete/route.ts](../../app/api/rgpd/delete/route.ts) | ✅ |
| DELETE /api/consents/:id | [app/api/consents/[id]/route.ts](../../app/api/consents/[id]/route.ts) | ✅ |
| POST /api/ai/invoke | [app/api/ai/invoke/route.ts](../../app/api/ai/invoke/route.ts) | ✅ |
| GET /api/ai/jobs | [app/api/ai/jobs/route.ts](../../app/api/ai/jobs/route.ts) | ✅ |
| GET /api/ai/jobs/:id | [app/api/ai/jobs/[id]/route.ts](../../app/api/ai/jobs/[id]/route.ts) | ✅ |
| GET /api/users | [app/api/users/route.ts](../../app/api/users/route.ts) | ✅ |
| POST /api/users | [app/api/users/route.ts](../../app/api/users/route.ts) | ✅ |
| GET /api/users/:id | [app/api/users/[id]/route.ts](../../app/api/users/[id]/route.ts) | ✅ |
| PUT /api/users/:id | [app/api/users/[id]/route.ts](../../app/api/users/[id]/route.ts) | ✅ |
| DELETE /api/users/:id | [app/api/users/[id]/route.ts](../../app/api/users/[id]/route.ts) | ✅ |
| GET /api/tenants | [app/api/tenants/route.ts](../../app/api/tenants/route.ts) | ✅ |
| POST /api/tenants | [app/api/tenants/route.ts](../../app/api/tenants/route.ts) | ✅ |
| GET /api/tenants/:id | [app/api/tenants/[id]/route.ts](../../app/api/tenants/[id]/route.ts) | ✅ |
| PUT /api/tenants/:id | [app/api/tenants/[id]/route.ts](../../app/api/tenants/[id]/route.ts) | ✅ |
| DELETE /api/tenants/:id | [app/api/tenants/[id]/route.ts](../../app/api/tenants/[id]/route.ts) | ✅ |
| GET /api/audit/events | [app/api/audit/events/route.ts](../../app/api/audit/events/route.ts) | ✅ |

**Use-cases** :
- [src/app/usecases/users/createUser.ts](../../src/app/usecases/users/createUser.ts)
- [src/app/usecases/users/updateUser.ts](../../src/app/usecases/users/updateUser.ts)
- [src/app/usecases/users/deleteUser.ts](../../src/app/usecases/users/deleteUser.ts)
- [src/app/usecases/tenants/listTenants.ts](../../src/app/usecases/tenants/listTenants.ts)
- [src/app/usecases/tenants/getTenant.ts](../../src/app/usecases/tenants/getTenant.ts)
- [src/app/usecases/tenants/updateTenant.ts](../../src/app/usecases/tenants/updateTenant.ts)
- [src/app/usecases/tenants/deleteTenant.ts](../../src/app/usecases/tenants/deleteTenant.ts)

**Middleware** : [src/middleware.ts](../../src/middleware.ts) (CORS)

**Tests** : Couverts par les 72 tests RGPD existants

---

## EPIC 6 — Stack IA Docker RGPD-ready

### LOT 6.0 — Docker compose prod-ready

**Document** : [LOT6.0_IMPLEMENTATION.md](LOT6.0_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `docker-compose.yml` | Docker | [docker-compose.yml](../../docker-compose.yml) | ✅ |
| `Dockerfile` | Docker | [Dockerfile](../../Dockerfile) | ✅ |
| `.dockerignore` | Docker | [.dockerignore](../../.dockerignore) | ✅ |
| `nginx.conf` | Nginx | [nginx/nginx.conf](../../nginx/nginx.conf) | ✅ |
| `default.conf` | Nginx | [nginx/conf.d/default.conf](../../nginx/conf.d/default.conf) | ✅ |
| `init-secrets.sh` | Script | [scripts/docker/init-secrets.sh](../../scripts/docker/init-secrets.sh) | ✅ |
| `start.sh` | Script | [scripts/docker/start.sh](../../scripts/docker/start.sh) | ✅ |
| `security-check.sh` | Script | [scripts/docker/security-check.sh](../../scripts/docker/security-check.sh) | ✅ |

---

### LOT 6.1 — Observabilité RGPD-safe

**Document** : [LOT6.1_IMPLEMENTATION.md](LOT6.1_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `logger.ts` | Logging | [src/infrastructure/logging/logger.ts](../../src/infrastructure/logging/logger.ts) | ✅ |
| `middleware.ts` (logging) | Logging | [src/infrastructure/logging/middleware.ts](../../src/infrastructure/logging/middleware.ts) | ✅ |
| `metrics.ts` | Metrics | [src/infrastructure/logging/metrics.ts](../../src/infrastructure/logging/metrics.ts) | ✅ |
| `route.ts` (health) | API | [app/api/health/route.ts](../../app/api/health/route.ts) | ✅ |
| `route.ts` (metrics) | API | [app/api/metrics/route.ts](../../app/api/metrics/route.ts) | ✅ |
| `LOGGING.md` | Doc | [docs/observability/LOGGING.md](../observability/LOGGING.md) | ✅ |

**Tests** : [tests/logging.sentinel.test.ts](../../tests/logging.sentinel.test.ts)

---

## EPIC 7 — Kit conformité & audit

### LOT 7.0 — Dossier audit CNIL-ready

**Document** : [LOT7_IMPLEMENTATION.md](LOT7_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `registre-traitements.md` | Doc RGPD | [docs/rgpd/registre-traitements.md](../rgpd/registre-traitements.md) | ✅ |
| `dpia.md` | Doc RGPD | [docs/rgpd/dpia.md](../rgpd/dpia.md) | ✅ |
| `incident.md` | Runbook | [docs/runbooks/incident.md](../runbooks/incident.md) | ✅ |
| `DPA_TEMPLATE.md` | Legal | [docs/legal/DPA_TEMPLATE.md](../legal/DPA_TEMPLATE.md) | ✅ |
| `CNIL_COOPERATION.md` | Runbook | [docs/runbooks/CNIL_COOPERATION.md](../runbooks/CNIL_COOPERATION.md) | ✅ |

---

### LOT 7.1 — Scripts de preuves

**Document** : [LOT7_IMPLEMENTATION.md](LOT7_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `audit-collect.sh` | Script | [scripts/audit/audit-collect.sh](../../scripts/audit/audit-collect.sh) | ✅ |
| `evidence.md` | Doc | [docs/audit/evidence.md](../audit/evidence.md) | ✅ |

---

## EPIC 8 — Anonymisation & Pseudonymisation

### LOT 8.0 — PII Detection & Redaction

**Document** : [LOT8_IMPLEMENTATION.md](LOT8_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `patterns.ts` | PII | [src/infrastructure/pii/patterns.ts](../../src/infrastructure/pii/patterns.ts) | ✅ |
| `detector.ts` | PII | [src/infrastructure/pii/detector.ts](../../src/infrastructure/pii/detector.ts) | ✅ |
| `masker.ts` | PII | [src/infrastructure/pii/masker.ts](../../src/infrastructure/pii/masker.ts) | ✅ |
| `pii-middleware.ts` | Gateway | [src/ai/gateway/pii-middleware.ts](../../src/ai/gateway/pii-middleware.ts) | ✅ |

**Tests** : [tests/rgpd.pii-*.test.ts](../../tests/) (85 tests)

---

### LOT 8.1 — Anonymisation IP

**Document** : [LOT8_IMPLEMENTATION.md](LOT8_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `anonymizer.ts` | Anonymization | [src/infrastructure/pii/anonymizer.ts](../../src/infrastructure/pii/anonymizer.ts) | ✅ |
| `anonymize-ips.job.ts` | Job | [src/infrastructure/jobs/anonymize-ips.job.ts](../../src/infrastructure/jobs/anonymize-ips.job.ts) | ✅ |

**Tests** : [tests/rgpd.ip-anonymization.test.ts](../../tests/rgpd.ip-anonymization.test.ts) (15 tests)

---

### LOT 8.2 — Audit PII Logs

**Document** : [LOT8_IMPLEMENTATION.md](LOT8_IMPLEMENTATION.md)

| Fichier | Type | Chemin | Status |
|---------|------|--------|--------|
| `scanner.ts` | PII scan | [src/infrastructure/pii/scanner.ts](../../src/infrastructure/pii/scanner.ts) | ✅ |
| `AlertService.ts` | Port | [src/app/ports/AlertService.ts](../../src/app/ports/AlertService.ts) | ✅ |
| `AlertService.ts` (impl) | Alert | [src/infrastructure/alerts/AlertService.ts](../../src/infrastructure/alerts/AlertService.ts) | ✅ |
| `scan-pii-logs.job.ts` | Job | [src/infrastructure/jobs/scan-pii-logs.job.ts](../../src/infrastructure/jobs/scan-pii-logs.job.ts) | ✅ |

**Tests** : [tests/rgpd.pii-scan-logs.test.ts](../../tests/rgpd.pii-scan-logs.test.ts) (10 tests)

---

## Migrations DB

| Migration | LOT | Description | Status |
|-----------|-----|-------------|--------|
| 001_init.sql | 1.5 | Schéma initial (tenants, users, audit_events) | ✅ |
| 002_lot4_consents_ai_jobs.sql | 4.0 | Consents (P2) + ai_jobs (P1) | ✅ |
| 003_rgpd_deletion.sql | 5.2 | Soft delete (deleted_at) | ✅ |
| 004_rls_tenant_isolation.sql | 6.2 | Row-Level Security tenant isolation | ✅ |
| 005_force_rls.sql | 6.2 | Force RLS on tables | ✅ |
| 006_fix_rls_policies.sql | 6.2 | Fix RLS policies (tenant check) | ✅ |
| 007_fix_strict_rls.sql | 6.2 | Strict RLS enforcement | ✅ |
| 008_create_testuser_role.sql | 6.2 | Test user role (tests) | ✅ |
| 009_fix_current_tenant_id_function.sql | 6.2 | Fix current_tenant_id() function | ✅ |
| 010_create_cleanup_function.sql | 6.2 | Cleanup function (tests) | ✅ |
| 011_fix_users_platform_policies.sql | 6.2 | Fix PLATFORM users RLS | ✅ |
| 012_fix_audit_events_policy.sql | 6.2 | Fix audit_events RLS | ✅ |
| 013_fix_rgpd_requests_platform_policies.sql | 6.2 | Fix rgpd_requests RLS | ✅ |

> **Note** : Migrations 004-013 font partie de LOT 6.2 (non encore documenté officiellement).

---

## Tests RGPD (résumé)

| Test File | Tests | Coverage |
|-----------|-------|----------|
| rgpd.audit-events-no-payload.test.ts | 6 | Audit events P1 only |
| rgpd.bootstrap.usecase.test.ts | 12 | Bootstrap CLI |
| rgpd.consent-enforcement.test.ts | 7 | Consent enforcement |
| rgpd.deletion.test.ts | 7 | Soft delete |
| rgpd.export.test.ts | 7 | Export RGPD |
| rgpd.ip-anonymization.test.ts | 15 | IP anonymization |
| rgpd.no-llm-bypass.test.ts | 3 | Gateway LLM bypass |
| rgpd.no-prompt-storage.test.ts | 5 | No storage prompts |
| rgpd.no-sensitive-logs.test.ts | 8 | Logs RGPD-safe |
| rgpd.pii-*.test.ts | 85 | PII detection/masking/restoration |
| rgpd.policy-engine.test.ts | 15 | RBAC/ABAC |
| db.lot4.tenant-isolation.test.ts | 13 | Tenant isolation |
| db.cross-tenant-isolation.test.ts | 8 | Cross-tenant denial |
| purge.lot4.test.ts | 10 | Retention & purge |
| http.auth.test.ts | 5 | Authentication (401) |
| http.authz.test.ts | 7 | Authorization (403) |
| http.tenant-guard.test.ts | 4 | Tenant guard |
| logging.sentinel.test.ts | ~30 | Logging RGPD-safe |

**Total** : ~252 tests RGPD passing

---

## Commandes de vérification

### Vérifier fichiers clés

```bash
# EPIC 1
ls src/app/auth/policyEngine.ts
ls src/app/http/requireAuth.ts
ls src/cli/bootstrap.ts

# EPIC 3
ls src/ai/gateway/config.ts
ls src/ai/gateway/providers/ollama.ts

# EPIC 4
ls migrations/002_lot4_consents_ai_jobs.sql
ls src/infrastructure/repositories/PgConsentRepo.ts

# EPIC 5
ls app/api/rgpd/delete/route.ts
ls app/api/users/route.ts
ls src/middleware.ts

# EPIC 6
ls docker-compose.yml
ls src/infrastructure/logging/logger.ts

# EPIC 8
ls src/infrastructure/pii/detector.ts
ls src/infrastructure/pii/anonymizer.ts
```

### Vérifier tests

```bash
# Tests RGPD
npm run test:rgpd

# Tests spécifiques
npm test tests/rgpd.pii-detection.test.ts
npm test tests/db.lot4.tenant-isolation.test.ts
npm test tests/http.authz.test.ts

# Coverage
npm run test:coverage
```

### Vérifier migrations

```bash
ls migrations | wc -l  # 14 migrations (001-013 + README)
grep "LOT" migrations/*.sql
```

---

## Gaps identifiés (non bloquants)

### Documentation manquante

- [ ] LOT6.2_IMPLEMENTATION.md (migrations RLS 004-013)
- [ ] Script verify-implementation.sh (automatisation vérification)

### Tests manquants

- [ ] Tests API E2E (supertest) - scope EPIC 11-13
- [ ] Tests middleware CORS - scope EPIC 11-13

---

## Références

- **TASKS.md** : [TASKS.md](../../TASKS.md) (source de vérité)
- **CLAUDE.md** : [CLAUDE.md](../../CLAUDE.md) (règles développement)
- **BOUNDARIES.md** : [docs/architecture/BOUNDARIES.md](../architecture/BOUNDARIES.md)
- **DATA_CLASSIFICATION.md** : [docs/data/DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md)
- **RGPD_TESTING.md** : [docs/testing/RGPD_TESTING.md](../testing/RGPD_TESTING.md)

---

**Maintenu par** : Claude Code (Sonnet 4.5)
**Dernière mise à jour** : 2026-01-01
**Version** : 1.0
