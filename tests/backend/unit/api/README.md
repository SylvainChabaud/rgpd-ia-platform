# API Unit Tests - Coverage Report

## Summary

This directory contains **31 unit test files** covering all critical API routes in the RGPD IA Platform.

## Test Files Created (New)

### Authentication & User Management (7 files)
1. `api.auth-login.test.ts` - POST /api/auth/login
2. `api.auth-logout.test.ts` - POST /api/auth/logout
3. `api.auth-me.test.ts` - GET /api/auth/me
4. `api.users.test.ts` - GET, POST /api/users
5. `api.users-id.test.ts` - GET, PUT, DELETE /api/users/[id]
6. `api.platform-users.test.ts` - GET, POST /api/platform/users (cross-tenant)
7. `api.platform-users-id.test.ts` - GET, PATCH, DELETE /api/platform/users/[id]

### Tenant Management (2 files)
8. `api.tenants.test.ts` - GET, POST /api/tenants
9. `api.tenants-id.test.ts` - GET, PUT, PATCH, DELETE /api/tenants/[id]

### RGPD Compliance Routes (7 files)
10. `api.rgpd-suspend.test.ts` - POST /api/rgpd/suspend, /api/rgpd/unsuspend
11. `api.rgpd-delete.test.ts` - POST /api/rgpd/delete
12. `api.rgpd-export.test.ts` - POST, GET /api/rgpd/export
13. `api.rgpd-contest.test.ts` - POST /api/rgpd/contest
14. `api.rgpd-oppose.test.ts` - POST /api/rgpd/oppose
15. `api.platform-users-suspend.test.ts` - PATCH /api/platform/users/[id]/suspend, /reactivate
16. `api.tenants.rgpd.test.ts` - GET /api/tenants/[id]/rgpd/* (existing)

### Incident Management (1 file)
17. `api.incidents.test.ts` - GET, POST /api/incidents

### Audit & Monitoring (4 files)
18. `api.audit-events.test.ts` - GET /api/audit/events
19. `api.audit-export.test.ts` - GET /api/audit/export (existing)
20. `api.logs.test.ts` - GET, DELETE /api/logs
21. `api.logs-purge.test.ts` - Purge functionality (existing)

### AI Features (2 files)
22. `api.ai-invoke.test.ts` - POST /api/ai/invoke
23. `api.ai-jobs.test.ts` - GET, POST /api/ai/jobs

### Consents & Legal (3 files)
24. `api.consents.test.ts` - GET, POST /api/consents
25. `api.consents.cookies.test.ts` - Cookie consents (existing)
26. `api.legal.cgu.test.ts` - CGU endpoints (existing)

### System & Utilities (5 files)
27. `api.health.test.ts` - GET /api/health
28. `api.stats.test.ts` - Stats endpoints (existing)
29. `api.metrics.test.ts` - Prometheus metrics (existing)
30. `api.contact.dpo.test.ts` - DPO contact (existing)
31. `app.http.handlers.test.ts` - HTTP handlers (existing)

## Test Coverage Focus

Each test file includes tests for:

### 1. Authentication & Authorization
- ✅ 401 responses without authentication
- ✅ 403 responses for insufficient permissions
- ✅ Role-based access control (SUPERADMIN, TENANT_ADMIN, MEMBER, DPO)
- ✅ Cross-tenant access prevention

### 2. Input Validation
- ✅ 400 responses for missing required fields
- ✅ 400 responses for invalid data types
- ✅ Zod schema validation testing
- ✅ Query parameter validation

### 3. Success Scenarios
- ✅ 200/201 responses for valid requests
- ✅ Proper response structure validation
- ✅ Correct use case invocation
- ✅ Mock data consistency

### 4. Error Handling
- ✅ 404 responses for non-existent resources
- ✅ 409 responses for conflicts
- ✅ 500 responses for internal errors
- ✅ Database error handling

### 5. RGPD Compliance
- ✅ No sensitive data exposure in responses
- ✅ Email redaction ([REDACTED])
- ✅ Tenant isolation enforcement
- ✅ Audit event emission verification

## Mock Strategy

All tests follow a consistent mocking pattern:

```typescript
// Mock repositories
jest.mock('@/infrastructure/repositories/PgUserRepo', () => ({
  PgUserRepo: class {
    findById = mockFindById;
    listByTenant = mockListByTenant;
  },
}));

// Mock use cases
jest.mock('@/app/usecases/users/createUser');

// Mock audit
jest.mock('@/infrastructure/audit/PgAuditEventWriter');
```

## Test Statistics

- **Total test files**: 31
- **Estimated total tests**: 150+ individual test cases
- **Coverage target**: 80%+ for all API routes
- **RGPD compliance tests**: All routes include RGPD-specific test cases

## Running Tests

```bash
# Run all API tests
npm test -- tests/backend/unit/api

# Run specific test file
npm test -- tests/backend/unit/api/api.users.test.ts

# Run with coverage
npm run test:coverage -- tests/backend/unit/api
```

## Next Steps

To reach 80% coverage, additional tests needed for:
1. Edge cases in existing routes
2. Middleware unit tests (auth, rbac, rate limiting)
3. Infrastructure layer tests (repositories, audit)
4. Integration tests for complex workflows

## Compliance Notes

All tests respect CLAUDE.md principles:
- ✅ No real data in tests (only mock/fixture data)
- ✅ No secrets in test code
- ✅ RGPD boundaries respected
- ✅ Gateway LLM pattern enforced in AI tests
- ✅ Tenant isolation verified
