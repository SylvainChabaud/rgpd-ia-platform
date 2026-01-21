---
scope: project
paths:
  - "app/api/**"
  - "src/app/**"
  - "src/infrastructure/**"
---

# Backend rules

## Structure des Route Handlers

```typescript
export const METHOD = withLogging(
  withAuth(
    withRateLimit(config)(
      async (req: NextRequest, { params }?: RouteParams) => {
        // 1. Extract user with requireUser()
        const user = requireUser(req);

        // 2. Parse params/query
        const { id } = await params;

        // 3. Validate request body (Zod)
        const body = await validateBody(req, Schema);

        // 4. Check authorization (scope, tenant)
        if (user.scope !== ACTOR_SCOPE.PLATFORM) {
          return forbidden();
        }

        // 5. Execute business logic
        // 6. Return response
      }
    )
  )
);
```

- Ordre middleware : `withLogging` → `withAuth` → `withRateLimit` → handler.
- **`requireUser(req)`** : Obligatoire pour extraire le user context (type-safe).
- Params dynamiques : `const { id } = await params;` (pas de destructuring direct).
- JSDoc obligatoire avec LOT reference et notes RGPD.

## Validation des entrées

- Valider toutes les entrées avec Zod schemas.
- Body : `const body = await validateBody(req, Schema);`
- Query : `const query = QuerySchema.parse(Object.fromEntries(url.searchParams));`
- Schemas primitifs réutilisables : `EmailSchema`, `UUIDSchema`, `PasswordSchema`.
- Types inférés : `type Input = z.infer<typeof Schema>;`

## Isolation tenant (CRITIQUE)

Chaque endpoint DOIT vérifier l'isolation tenant :

```typescript
if (context.tenantId !== tenantId) {
  logger.warn({ actorId, requestedTenantId, actualTenantId }, 'Cross-tenant access blocked');
  return NextResponse.json(forbiddenError('Access denied'), { status: 403 });
}
```

- Log obligatoire avec `logger.warn()` pour toute tentative cross-tenant.
- Retourner 403 avec message générique (pas de détails).

## Codes de réponse HTTP

| Code | Usage |
|------|-------|
| 200 | Succès GET |
| 201 | Ressource créée (POST) |
| 202 | Opération async acceptée |
| 400 | Erreur validation (Zod) |
| 401 | Non authentifié |
| 403 | Non autorisé (permissions) |
| 404 | Ressource non trouvée |
| 409 | Conflit (doublon) |
| 429 | Rate limit |
| 500 | Erreur interne (jamais de détails) |

## Error Handlers

```typescript
return NextResponse.json(validationError(zodError.issues), { status: 400 });
return NextResponse.json(forbiddenError('Message'), { status: 403 });
return NextResponse.json(notFoundError('Resource'), { status: 404 });
return NextResponse.json(internalError(), { status: 500 }); // JAMAIS de détails
```

## Autorisation

- Utiliser les helpers : `isPlatformAdmin(context)`, `isTenantAdmin(context)`, `hasRole(context, role)`.
- Utiliser les constantes : `ACTOR_SCOPE.PLATFORM`, `ACTOR_ROLE.TENANT_ADMIN`.
- Jamais de string literals pour les rôles/scopes.

## Use Cases (src/app/usecases/)

Structure obligatoire :

```typescript
export interface OperationInput {
  tenantId: string;  // OBLIGATOIRE
  // autres champs
}

export class OperationUseCase {
  constructor(
    private readonly repo: Repo,
    private readonly auditEventWriter: AuditEventWriter,
    private readonly passwordHasher: PasswordHasher // Via port interface
  ) {}

  async execute(input: OperationInput): Promise<Output> {
    if (!input.tenantId) {
      throw new Error('RGPD VIOLATION: tenantId required');
    }
    // logique métier
    await this.auditEventWriter.write({ ... });
    return result;
  }
}
```

- `tenantId` obligatoire dans tous les inputs.
- **Dépendances injectées via constructeur** (ports uniquement).
- Audit event émis pour chaque opération utilisateur.

## Ports & Adapters (Clean Architecture)

**Use cases ne dépendent que des ports (interfaces)** :

```typescript
// ✅ CORRECT - Dépend du port
import type { PasswordHasher } from '@/app/ports/PasswordHasher';

export class CreateUserUseCase {
  constructor(private readonly passwordHasher: PasswordHasher) {}
}

// ❌ INTERDIT - Import direct d'infrastructure
import { BcryptPasswordHasher } from '@/infrastructure/security/BcryptPasswordHasher';
```

**Injection au point d'entrée (API routes, CLI)** :

```typescript
// app/api/users/route.ts
import { BcryptPasswordHasher } from '@/infrastructure/security/BcryptPasswordHasher';

const passwordHasher = new BcryptPasswordHasher();
const useCase = new CreateUserUseCase(userRepo, audit, passwordHasher);
```

Ports disponibles : `PasswordHasher`, `EncryptionService`, `ExportStorage`, etc.

## Repositories (src/infrastructure/)

- Port (interface) dans `src/app/ports/`.
- Implémentation dans `src/infrastructure/repositories/`.
- Méthodes obligatoires : `softDeleteByTenant()`, `hardDeleteByTenant()`.
- Toujours `WHERE deleted_at IS NULL` pour exclure les soft-deleted.
- Utiliser `withTenantContext(pool, tenantId, ...)` pour les opérations multi-statements.
- Requêtes paramétrées uniquement (jamais d'interpolation SQL).

## Logging

- Logger structuré Pino avec champs techniques uniquement (P0/P1).
- Interdit dans les logs : email, password, token, prompt, response, payload.
- Format : `logger.info({ actorId, event }, 'Message');`

## Audit Events

```typescript
await auditEventWriter.write({
  id: newId(),
  eventName: 'domain.action',  // user.created, rgpd.export.requested
  actorScope: ACTOR_SCOPE.TENANT,
  actorId,
  tenantId,
  targetId,
  // metadata: P1 uniquement (IDs, types, counts)
});
```

- Nommage : `[domain].[action]` (user.created, consent.granted).
- Uniquement données P1 dans metadata.
- Rétention 12 mois (CNIL).
