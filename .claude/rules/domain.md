---
scope: project
paths:
  - "src/domain/**"
---

# Domain rules

## Principes fondamentaux

- Le domaine est **pur** : aucune dépendance vers infra, IA ou frameworks.
- Pas d'import depuis `src/infrastructure/`, `src/app/`, ou `app/`.
- Les types domaine sont définis dans `src/domain/` uniquement.

## Entités immuables

Toutes les propriétés sont `readonly` :

```typescript
export interface UserDispute {
  readonly id: string;
  readonly tenantId: string;  // OBLIGATOIRE
  readonly userId: string;
  readonly reason: string;
  readonly status: DisputeStatus;
  readonly createdAt: Date;
}
```

- Utiliser `readonly` sur chaque propriété.
- Modifier = créer une nouvelle instance via factory.
- Collections : utiliser `ReadonlyArray<T>` et `Object.freeze()`.

## Factory functions

Chaque entité a une factory pour la création :

```typescript
export function createDispute(input: CreateDisputeInput):
  Omit<UserDispute, 'id' | 'createdAt' | 'status'> {

  if (!input.tenantId || !input.userId) {
    throw new Error('tenantId and userId are required');
  }

  if (input.reason.length < MIN_REASON_LENGTH) {
    throw new Error(`Reason must be at least ${MIN_REASON_LENGTH} characters`);
  }

  return { tenantId: input.tenantId, userId: input.userId, reason: input.reason };
}
```

- Validation dans la factory (throw Error si invalide).
- Utiliser `Omit<>` pour les champs auto-générés (id, createdAt).
- Messages d'erreur descriptifs avec les contraintes.

## Constantes métier

Définir les contraintes comme constantes exportées :

```typescript
export const MIN_REASON_LENGTH = 10;
export const MAX_REASON_LENGTH = 2000;
export const MAX_DISPUTE_AGE_DAYS = 90;
export const RGPD_DELETION_RETENTION_DAYS = 30;
export const RGPD_EXPORT_RETENTION_DAYS = 7;
```

- Nommage : `UPPER_SNAKE_CASE`.
- Utilisées dans les factories ET les tests.
- Documenter les sources RGPD (Art. X).

## Enums avec `as const`

```typescript
export const DISPUTE_STATUS = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
} as const;

export type DisputeStatus = (typeof DISPUTE_STATUS)[keyof typeof DISPUTE_STATUS];
```

- Pas d'enum TypeScript, utiliser `as const`.
- Type dérivé avec `keyof typeof`.
- Permet l'itération et la validation.

## Fonctions pures

Business rules en fonctions pures (pas d'effets de bord) :

```typescript
export function canDisputeJob(aiJobCompletedAt: Date): boolean {
  const now = new Date();
  const maxDate = new Date(aiJobCompletedAt);  // Nouvelle instance
  maxDate.setDate(maxDate.getDate() + MAX_DISPUTE_AGE_DAYS);
  return now <= maxDate;
}

export function calculatePurgeDate(deletedAt: Date): Date {
  const purgeAt = new Date(deletedAt);  // Nouvelle instance
  purgeAt.setDate(purgeAt.getDate() + RGPD_DELETION_RETENTION_DAYS);
  return purgeAt;
}
```

- Créer de nouvelles instances Date (ne pas muter l'entrée).
- Return type explicite.
- Pas d'appel API, DB, ou I/O.

## Conversions pour l'extérieur

### `toAuditEvent()` - Pour le journal d'audit

```typescript
export function toAuditEvent(dispute: UserDispute, eventType: string): {
  eventType: string;
  tenantId: string;
  actorId: string;
  metadata: {
    disputeId: string;
    status: DisputeStatus;
    hasAttachment: boolean;  // Flag, pas la valeur
  };
}
```

- Jamais de données sensibles (reason, attachmentUrl, PII).
- Utiliser des flags booléens (`hasAttachment`) au lieu des valeurs.

### `toPublic()` - Pour l'API publique

```typescript
export function toPublicDispute(dispute: UserDispute): {
  id: string;
  status: DisputeStatus;
  createdAt: Date;
  // Exclure: tenantId, userId, reviewedBy (données internes)
}
```

- Exclure les champs internes (tenantId, userId, reviewedBy).
- Inclure uniquement les données user-facing.

## Classification des données

Respecter la classification P0-P3 :

```typescript
export enum DataClassification {
  P0 = "P0",  // Public
  P1 = "P1",  // Technique (IDs, timestamps)
  P2 = "P2",  // Personnel (email → chiffrement requis)
  P3 = "P3",  // Sensible (santé, biométrie → INTERDIT)
}
```

- P3 : throw `P3DataStorageForbiddenError` si stockage tenté.
- P2 : flag de chiffrement obligatoire.
- Cf. `docs/data/DATA_CLASSIFICATION.md`.

## Modélisation des droits RGPD

Chaque droit = une entité avec cycle de vie :

| Article | Entité | Statuts |
|---------|--------|---------|
| Art. 17 (Effacement) | `DeletionRequest` | pending → approved → purged |
| Art. 15/20 (Portabilité) | `ExportBundle` | pending → ready → downloaded → expired |
| Art. 18 (Limitation) | `DataSuspension` | suspended → unsuspended |
| Art. 21 (Opposition) | `UserOpposition` | pending → approved/rejected |
| Art. 22 (Décision auto) | `UserDispute` | pending → resolved/rejected |

## Tests obligatoires

Chaque entité a au moins :
- 1 test nominal (création valide).
- 1 test par contrainte de validation.
- 1 test d'immuabilité (vérifier que les dates ne sont pas mutées).
