---
scope: project
paths:
  - "tests/**"
---

# Testing rules

## Nommage des fichiers

| Type | Pattern | Exemple |
|------|---------|---------|
| Unit API | `api.<endpoint>.test.ts` | `api.tenants.rgpd.test.ts` |
| Unit Domain | `domain.<entity>.test.ts` | `domain.deletion-request.test.ts` |
| Unit Middleware | `middleware/<name>.test.ts` | `middleware/incident-detection.test.ts` |
| Unit Shared | `shared.<module>.test.ts` | `shared.actor-role.test.ts` |
| Unit Usecase | `usecase.<name>.test.ts` | `usecase.create-user.test.ts` |
| Integration | `repository.<entity>.test.ts` | `repository.user.test.ts` |
| E2E | `<feature>.spec.ts` | `tenant-dashboard.spec.ts` |
| Frontend | `<component>.test.tsx` | `CookieConsentBanner.test.tsx` |

## Structure des tests

```typescript
/**
 * [Type] Tests: [Composant]
 * LOT X.X - [Catégorie]
 *
 * RGPD compliance:
 * - [Notes spécifiques]
 */

describe('[Type]: [Composant]', () => {
  describe('[Méthode/Feature]', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Setup
    });

    it('should [action] when [condition]', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should throw if [violation]', async () => {
      // ...
    });
  });
});
```

- Toujours utiliser `describe()` (jamais de `it()` top-level).
- Utiliser `it()` (pas `test()`).
- Maximum 2-3 niveaux de nesting.
- `jest.clearAllMocks()` en premier dans chaque `beforeEach()`.

## Nommage des tests

**Tests nominaux** :
- `it('should create user successfully', ...)`
- `it('should return list of users', ...)`

**Tests d'erreur** :
- `it('should throw if tenantId missing', ...)`
- `it('should reject cross-tenant access', ...)`

**Tests critiques (avec ID)** :
- `it('[INC-DET-001] should detect cross-tenant access', ...)`
- `it('[RGPD-017] should purge data after retention period', ...)`

## Données de test

```typescript
// UUIDs prédictibles
const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const TENANT_ID_2 = '00000000-0000-0000-0000-000000000002';
const USER_ID = '00000000-0000-0000-0000-000000000010';

// Emails de test uniquement
const TEST_EMAIL = 'user@example.com';  // ✓
const TEST_EMAIL_2 = 'admin@test.com';  // ✓
const TEST_EMAIL_3 = 'user@tenant.test'; // ✓
// JAMAIS d'email réel
```

- Domaines autorisés : `@example.com`, `@example.org`, `@test.com`, `.test`.
- UUIDs : pattern `00000000-...-0000000000XX`.
- Jamais de `Math.random()` ou `Date.now()` non mocké.
- Jamais de PII réelles.

## Mocks

```typescript
// Définir les mocks AVANT les imports
const mockFindById = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/infrastructure/repositories/PgUserRepo', () => ({
  PgUserRepo: class {
    findById = mockFindById;
    create = mockCreate;
  },
}));

// Importer APRÈS le mock
import { handler } from '@/app/api/users/route';
```

- Mocks définis avant les imports.
- Nommage : `mock<Classe><Méthode>`.
- Setup dans `beforeEach()` avec `mockResolvedValue()` / `mockRejectedValue()`.

## In-Memory Repositories

Pour les tests unitaires :

```typescript
class MemUserRepo implements UserRepo {
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id && !u.deletedAt) ?? null;
  }

  async create(user: User): Promise<void> {
    this.users.push(user);
  }
}
```

- Implémenter l'interface complète.
- Respecter la sémantique soft-delete (`deletedAt`).

## Tests d'isolation tenant (OBLIGATOIRE)

```typescript
it('should not access data from different tenant', async () => {
  // Créer données dans TENANT_ID
  await repo.create({ tenantId: TENANT_ID, ... });

  // Tenter d'accéder depuis TENANT_ID_2
  const result = await repo.findByTenant(TENANT_ID_2);

  // Doit retourner vide (pas les données de l'autre tenant)
  expect(result).toHaveLength(0);
});

it('should throw RGPD VIOLATION if tenantId missing', async () => {
  await expect(repo.findByTenant('')).rejects.toThrow('RGPD VIOLATION');
});
```

## Tests d'audit events

```typescript
it('should emit audit event on create', async () => {
  const auditWriter = new InMemoryAuditEventWriter();

  await createUser(input, { userRepo, auditWriter });

  expect(auditWriter.events).toHaveLength(1);
  expect(auditWriter.events[0]).toMatchObject({
    eventName: 'user.created',
    actorId: 'admin-1',
    tenantId: TENANT_ID,
  });
});

it('should not include PII in audit event', async () => {
  const auditWriter = new InMemoryAuditEventWriter();

  await createUser({ email: 'test@example.com', ... }, deps);

  const eventJson = JSON.stringify(auditWriter.events[0]);
  expect(eventJson).not.toContain('test@example.com');
  expect(eventJson).not.toContain('password');
});
```

## Tests E2E (Playwright)

```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('LOT 12.0 - Tenant Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTenantAdmin(page);
  });

  test('E2E-TD-001: Dashboard displays KPI widgets', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('E2E-TD-002: No PII displayed', async ({ page }) => {
    const content = await page.content();
    expect(content).not.toMatch(/[a-z]+@[a-z]+\.[a-z]+/i);
  });
});
```

- Extension `.spec.ts`.
- IDs de test : `E2E-[FEATURE]-[NNN]`.
- Helpers partagés pour login/navigation.
- Timeouts : 10s éléments, 30s navigation.

## Tests obligatoires par type

| Composant | Tests requis |
|-----------|--------------|
| API endpoint | 1 nominal + 1 validation + 1 auth/tenant |
| Use case | 1 nominal + 1 par validation + 1 audit |
| Domain entity | 1 création + 1 par contrainte + 1 immuabilité |
| Repository | 1 CRUD + 1 soft-delete + 1 isolation tenant |
| Middleware | 1 pass-through + 1 block |

## Assertions RGPD

```typescript
// Vérifier que les PII ne sont pas exposées
expect(response.body).not.toHaveProperty('email');
expect(JSON.stringify(response.body)).not.toContain('@');

// Vérifier les headers de sécurité
expect(response.headers['x-content-type-options']).toBe('nosniff');

// Vérifier le chiffrement
expect(user.emailHash).toMatch(/^[a-f0-9]{64}$/);  // SHA-256
```
