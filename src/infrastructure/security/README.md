# Security Infrastructure Module

> **RGPD Compliance**: Art. 32 - Security of processing

Ce module contient les services de sécurité pour la plateforme RGPD.

---

## Services disponibles

### BcryptPasswordHasher

Hachage des mots de passe conforme OWASP.

```typescript
import { BcryptPasswordHasher } from "@/infrastructure/security/BcryptPasswordHasher";

const hasher = new BcryptPasswordHasher(); // Default: 12 salt rounds

// Hachage
const hash = await hasher.hash("SecurePassword123!");
// → "$2b$12$..."

// Vérification
const isValid = await hasher.verify("SecurePassword123!", hash);
// → true
```

**Caractéristiques** :
- Salt rounds configurable (défaut: 12, recommandation OWASP)
- Format bcrypt standard (`$2a$` ou `$2b$`)
- Support unicode et caractères spéciaux
- Gestion du hash `__DISABLED__` (compte désactivé)

**Implémente** : `PasswordHasher` (`src/app/ports/PasswordHasher.ts`)

---

### AesEncryptionService

Chiffrement AES-256-GCM pour données sensibles.

```typescript
import { AesEncryptionService } from "@/infrastructure/security/AesEncryptionService";

const encryption = new AesEncryptionService(process.env.EMAIL_ENCRYPTION_KEY);

// Chiffrement
const encrypted = encryption.encrypt("jean@example.com");
// → "iv:authTag:ciphertext" (base64)

// Déchiffrement
const decrypted = encryption.decrypt(encrypted);
// → "jean@example.com"
```

**Caractéristiques** :
- AES-256-GCM (authenticated encryption)
- IV unique par opération (12 bytes)
- Auth tag pour intégrité (16 bytes)
- Clé 32 bytes depuis variable d'environnement

**Implémente** : `EncryptionService` (`src/app/ports/EncryptionService.ts`)

---

### Sha256PasswordHasher

Hachage SHA-256 avec salt (usage tests/legacy).

```typescript
import { Sha256PasswordHasher } from "@/infrastructure/security/Sha256PasswordHasher";

const hasher = new Sha256PasswordHasher();
const hash = await hasher.hash("password");
// → "salt:hash"
```

> ⚠️ **Note** : Préférer `BcryptPasswordHasher` pour la production. SHA-256 est utilisé pour les tests rapides ou la compatibilité legacy.

---

### FailedLoginTracker

Tracking des tentatives de connexion échouées (rate limiting).

```typescript
import { FailedLoginTracker } from "@/infrastructure/security/FailedLoginTracker";

const tracker = new FailedLoginTracker({
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
});

// Enregistrer un échec
tracker.recordFailure("user@example.com");

// Vérifier si bloqué
const isLocked = tracker.isLocked("user@example.com");

// Reset après succès
tracker.reset("user@example.com");
```

**Caractéristiques** :
- Stockage en mémoire (pas de persistance)
- Configurable: max attempts, durée de blocage
- Nettoyage automatique des entrées expirées

---

## Architecture (Clean Architecture)

```
src/app/ports/                    # Interfaces (ports)
├── PasswordHasher.ts             # Interface hachage
└── EncryptionService.ts          # Interface chiffrement

src/infrastructure/security/      # Implémentations (adapters)
├── BcryptPasswordHasher.ts       # Adapter bcrypt
├── Sha256PasswordHasher.ts       # Adapter SHA-256
├── AesEncryptionService.ts       # Adapter AES-256-GCM
└── FailedLoginTracker.ts         # Rate limiting
```

Les use-cases dépendent uniquement des **ports** (interfaces), pas des adapters.

---

## Tests

```bash
# Tests BcryptPasswordHasher
npm test -- bcrypt-password-hasher

# Tous les tests sécurité
npm test -- security
```

**Fichiers** :
- `tests/backend/unit/infrastructure/bcrypt-password-hasher.test.ts` (13 tests)

---

## Configuration

| Variable | Description | Requis |
|----------|-------------|--------|
| `EMAIL_ENCRYPTION_KEY` | Clé AES-256 (32 bytes, hex ou base64) | ✅ |

---

## Références

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [docs/architecture/BOUNDARIES.md](../../../docs/architecture/BOUNDARIES.md) - Section Ports/Adapters

---

**Last Updated**: 2026-01-20
**Status**: ✅ Production-ready
