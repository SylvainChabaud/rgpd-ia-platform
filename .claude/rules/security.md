---
scope: project
---

# Security rules

## Secrets et clés

**Interdit en clair dans le code/logs/tests** :
- `API_KEY=`, `PASSWORD=`, `PRIVATE_KEY=`, `JWT_SECRET=`
- `DATABASE_URL` avec credentials
- `-----BEGIN PRIVATE KEY-----`, `-----BEGIN RSA PRIVATE KEY-----`

**Stockage sécurisé** :
- Variables d'environnement via `.env` (gitignored).
- Secrets manager en production.
- Jamais dans les commits, même anciens.

## Génération de valeurs aléatoires

**Interdit** : `Math.random()` pour IDs, tokens, identifiants.

**Obligatoire** : `crypto.randomBytes()` ou équivalent cryptographique.

```typescript
// ❌ INTERDIT - prévisible
const id = `anon-${Date.now()}-${Math.random().toString(36)}`;

// ✅ CORRECT - cryptographiquement sûr
import { randomBytes } from 'crypto';
const id = `anon-${Date.now()}-${randomBytes(8).toString('hex')}`;
```

## Parsing de cookies (anti-ReDoS)

**Interdit** : Regex complexes pour parser les cookies.

**Obligatoire** : Parsing par split simple (safe).

```typescript
// ❌ INTERDIT - vulnérable ReDoS
const value = cookieHeader.match(/consent_id=([^;]+)/)?.[1];

// ✅ CORRECT - safe
function getCookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const cookie of header.split(';')) {
    const [key, ...valueParts] = cookie.trim().split('=');
    if (key === name) return valueParts.join('=');
  }
  return undefined;
}
```

## Emails de test

Uniquement ces domaines autorisés :
- `@example.com`, `@example.org` (RFC 2606)
- `@test.com`, `.test` (RFC 6761)
- `@votre-plateforme.fr`, `.local` (domaine projet)

Jamais d'email réel dans le code ou les tests.

## Logging

**Autorisé (P0/P1)** :
- IDs techniques (userId, tenantId, requestId)
- Timestamps, durées
- Codes d'erreur, statuts HTTP
- Noms d'événements

**Interdit (P2/P3)** :
- Email, nom, prénom
- Mot de passe, token, clé API
- Prompt, réponse IA
- Body de requête, payload
- Numéro de téléphone, adresse IP (sauf incident)

Le logger Pino redacte automatiquement les champs sensibles.

## Validation des entrées

À chaque point d'entrée :
- **API routes** : Zod validation du body et query params.
- **Formulaires** : Validation côté client ET serveur.
- **URLs** : Whitelist de domaines/patterns autorisés.

```typescript
// Pattern de validation
const body = await validateBody(req, CreateUserSchema);
const query = QuerySchema.parse(Object.fromEntries(url.searchParams));
```

## Sanitization

Avant affichage de contenu utilisateur :
- Pas de `dangerouslySetInnerHTML` sans sanitization.
- Utiliser des bibliothèques comme DOMPurify si HTML requis.
- Échapper les caractères spéciaux pour les logs.

## Accès base de données

- Aucun accès DB direct depuis les composants React.
- Passer par les repositories (`src/infrastructure/repositories/`).
- Requêtes paramétrées uniquement (pas d'interpolation SQL).

```typescript
// ✓ Correct
await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// ✗ Interdit
await pool.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

## Authentification

- JWT avec expiration courte (15 min access, 7 jours refresh).
- Hachage des mots de passe (bcrypt via `PasswordHasher` port, 12 salt rounds).
- Hachage des emails (SHA-256) pour le stockage.
- Rate limiting sur `/api/auth/*`.
- **Logging des échecs d'authentification** (RGPD-safe: sans token ni mot de passe).

```typescript
// Logging obligatoire pour les échecs d'auth
logWarn({
  event: 'auth.token_verification_failed',
  meta: {
    error: error.message,  // Message d'erreur uniquement
    path: req.nextUrl.pathname,  // Chemin de la requête
    // JAMAIS: token, password, credentials
  },
});
```

## Headers de sécurité

```typescript
// Configurés dans next.config.js
'X-Content-Type-Options': 'nosniff',
'X-Frame-Options': 'DENY',
'X-XSS-Protection': '1; mode=block',
'Referrer-Policy': 'strict-origin-when-cross-origin',
'Content-Security-Policy': "default-src 'self'; ...",
```

## Incidents de sécurité

- Détection automatique des accès cross-tenant.
- Log avec `logger.warn()` pour toute tentative suspecte.
- Notification CNIL sous 72h si violation Art. 33.
- Cf. `src/domain/incident/SecurityIncident.ts`.
