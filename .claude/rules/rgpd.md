---
scope: project
---

# RGPD rules

## Classification des données (obligatoire)

| Niveau | Description | Stockage | Chiffrement |
|--------|-------------|----------|-------------|
| **P0** | Public | ✓ | Non requis |
| **P1** | Technique (IDs, timestamps) | ✓ | Non requis |
| **P2** | Personnel (email, nom) | ✓ | **Obligatoire** |
| **P3** | Sensible (santé, biométrie) | **INTERDIT** | N/A |

Référence : `docs/data/DATA_CLASSIFICATION.md`

## Données P2+ : chiffrement obligatoire

- Email : hashé (SHA-256) pour stockage, chiffré (AES-256) si besoin de déchiffrement.
- Chiffrement au repos et en transit (TLS 1.3).
- Clés de chiffrement en variable d'environnement.

## Données P2+ : audit obligatoire

Chaque accès (lecture/écriture) aux données P2+ génère un événement audit :

```typescript
await auditEventWriter.write({
  id: newId(),
  eventName: 'user.data.accessed',
  actorId,
  tenantId,
  targetId: userId,
  // Pas de contenu P2 dans metadata
});
```

## Isolation tenant (CRITIQUE)

- Jamais de données croisées entre tenants.
- `tenantId` obligatoire dans chaque requête/entité.
- Row-Level Security (RLS) PostgreSQL activé.
- Tests d'isolation obligatoires.

```typescript
// Validation systématique
if (!tenantId) {
  throw new Error('RGPD VIOLATION: tenantId required');
}
if (context.tenantId !== requestedTenantId) {
  throw new Error('RGPD VIOLATION: cross-tenant access denied');
}
```

## Droits utilisateur implémentés

| Article | Droit | Entité domaine | Délai légal |
|---------|-------|----------------|-------------|
| Art. 15 | Accès | `ExportBundle` | 1 mois |
| Art. 16 | Rectification | Via API | Sans délai |
| Art. 17 | Effacement | `DeletionRequest` | 1 mois |
| Art. 18 | Limitation | `DataSuspension` | Sans délai |
| Art. 20 | Portabilité | `ExportBundle` | 1 mois |
| Art. 21 | Opposition | `UserOpposition` | Sans délai |
| Art. 22 | Décision auto | `UserDispute` | Sans délai |

## Consentement

- **Explicite** : opt-in, jamais pré-coché.
- **Granulaire** : par finalité (analytics, marketing, etc.).
- **Révocable** : retrait aussi simple que l'accord.
- **Traçable** : horodatage et preuve conservés.

```typescript
interface CookieConsent {
  necessary: true;      // Toujours true
  analytics: boolean;   // Opt-in
  marketing: boolean;   // Opt-in
  consentedAt: Date;
  revokedAt: Date | null;
}
```

## Politique de rétention

| Type de donnée | Durée | Action |
|----------------|-------|--------|
| Données utilisateur | Durée du compte | Soft-delete à la demande |
| Données supprimées | 30 jours | Hard-delete (purge) |
| Exports utilisateur | 7 jours | Suppression auto |
| Suspensions | 3 ans | Conservation légale |
| Audit events | 12 mois | Purge auto (CNIL) |
| Incidents sécurité | 5 ans | Conservation légale |

Référence : `src/domain/retention/RetentionPolicy.ts`

## Gateway LLM (obligatoire)

Tout appel à un modèle IA passe par la Gateway :

```
Frontend → API Route → Gateway LLM → Provider IA
                ↓
           Audit Event
```

**Fonctions de la Gateway** :
- Validation des requêtes (classification, policies).
- Redaction automatique des PII.
- Audit logging (sans contenu P2/P3).
- Rate limiting par tenant.

Référence : `docs/ai/LLM_USAGE_POLICY.md`

## Tests RGPD obligatoires

Avant toute livraison :
- [ ] Test d'isolation tenant (cross-tenant rejeté).
- [ ] Test de soft-delete + hard-delete.
- [ ] Test d'export utilisateur (format portable).
- [ ] Test de révocation de consentement.
- [ ] Test d'audit events (pas de PII).

Référence : `docs/testing/RGPD_TESTING.md`
