# TRAÇABILITÉ RGPD — Détails d'Implémentation

**Date** : 25 décembre 2025  
**Version** : 1.0  
**Statut** : Documentation technique RGPD  

---

## 📋 Vue d'ensemble

Ce document détaille **qui fait quoi** dans l'implémentation RGPD de la plateforme.

**Objectif** : Tracer chaque **composant technique** → **Exigences RGPD** couvertes

**Compléments** :
- Matrice conformité : voir [TRACABILITE_RGPD_MATRICE.md](./TRACABILITE_RGPD_MATRICE.md)
- Analyse gaps : voir [ANALYSE_COUVERTURE_RGPD.md](./ANALYSE_COUVERTURE_RGPD.md)

---

## 🏗️ Architecture RGPD — Vue d'Ensemble

### Couches applicatives

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND LAYER                         │
│  EPIC 8: Super Admin | EPIC 9: Tenant Admin | EPIC 10: User │
│  Art. 13-14 (Information), Art. 7 (Consentement UI)    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS/TLS 1.3
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  API ROUTES LAYER                       │
│  src/app/api/* - HTTP endpoints                         │
│  Art. 15-17-20 (Droits RGPD), Art. 6-7 (Consentement)  │
│  Middlewares: requireAuth, tenantGuard                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  USE-CASES LAYER                        │
│  src/app/usecases/* - Business logic                    │
│  Art. 5 (Minimisation), Art. 6 (Bases légales)         │
│  grantConsent, revokeConsent, generateRgpdExport        │
└────────────────────────┬────────────────────────────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│  GATEWAY LLM │ │ REPOSITORIES│ │ AUDIT TRAIL  │
│  EPIC 3      │ │ EPIC 1/4    │ │ EPIC 1       │
│  Art. 5, 32  │ │ Art. 32     │ │ Art. 5       │
│  invokeLLM   │ │ PgConsentRepo│ │ PgAuditEvent │
└──────────────┘ └─────────────┘ └──────────────┘
            │            │            │
            └────────────┼────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE                        │
│  migrations/001_init.sql, 002_lot4_*.sql               │
│  Art. 5 (Rétention), Art. 32 (Isolation tenant)        │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Composants Sécurité (EPIC 1)

### 1. PolicyEngine (RBAC/ABAC)

**Fichier** : [src/app/auth/policyEngine.ts](../../src/app/auth/policyEngine.ts)

**Responsabilité RGPD** :
- ✅ **Art. 32 (Sécurité)** : Contrôle accès strict par scope (PLATFORM/TENANT/MEMBER)
- ✅ **Art. 5 (Intégrité)** : Prévention accès non autorisé

**Règles implémentées** :
```typescript
// Scope PLATFORM (Super Admin)
- Peut créer tenants, voir tous tenants
- Scope ressources : all tenants

// Scope TENANT (Tenant Admin)
- Peut gérer users de son tenant, voir consentements tenant
- Scope ressources : son tenant uniquement

// Scope MEMBER (User final)
- Peut gérer ses consentements, exporter/supprimer ses données
- Scope ressources : ses propres données uniquement
```

**Tests** :
- [tests/http.authz.test.ts](../../tests/http.authz.test.ts) - 8 tests authorization (PASS)
- [tests/rgpd.policy-engine.test.ts](../../tests/rgpd.policy-engine.test.ts) - 6 tests RGPD (PASS)

**Articles couverts** :
- Art. 5.1.f (Intégrité et confidentialité)
- Art. 32.1.b (Capacité garantir confidentialité)

---

### 2. TenantGuard Middleware

**Fichier** : [src/middleware/tenantGuard.ts](../../src/middleware/tenantGuard.ts)

**Responsabilité RGPD** :
- ✅ **Art. 32 (Isolation tenant)** : Cross-tenant isolation stricte
- ✅ **Art. 5 (Intégrité)** : Prévention accès inter-tenant

**Fonctionnement** :
```typescript
// Valide JWT.tenantId = URL/body.tenantId
// Bloque requête si mismatch (403 Forbidden)
// Appliqué sur TOUS endpoints tenant-scoped
```

**Tests** :
- [tests/http.tenant-guard.test.ts](../../tests/http.tenant-guard.test.ts) - 4 tests (PASS)
- [tests/db.cross-tenant-isolation.test.ts](../../tests/db.cross-tenant-isolation.test.ts) - 12 tests (PASS)
- [tests/rgpd.no-cross-tenant.test.ts](../../tests/rgpd.no-cross-tenant.test.ts) - 8 tests (PASS)

**Articles couverts** :
- Art. 5.1.f (Intégrité et confidentialité)
- Art. 32.1 (Sécurité traitement)

---

### 3. Audit Trail

**Fichiers** :
- [src/infrastructure/audit/PgAuditEventWriter.ts](../../src/infrastructure/audit/PgAuditEventWriter.ts) - Writer PostgreSQL
- [src/app/audit/emitAuditEvent.ts](../../src/app/audit/emitAuditEvent.ts) - Émission événements

**Responsabilité RGPD** :
- ✅ **Art. 5.2 (Responsabilité)** : Démontrer conformité
- ✅ **Art. 6.1.c (Obligation légale)** : Traçabilité légale
- ✅ **Art. 7.1 (Preuve consentement)** : Tracer consentements

**Événements tracés** :
```typescript
// Consentements
"consent.granted"     // Art. 7 (preuve consentement)
"consent.revoked"     // Art. 7 (révocabilité)

// Droits RGPD
"rgpd.export.requested"  // Art. 15 (accès)
"rgpd.deletion.initiated" // Art. 17 (effacement)
"rgpd.deletion.executed"  // Art. 17 (purge définitive)

// Bootstrap
"platform.superadmin.created"
"tenant.created"
"tenant.admin.created"
```

**Sécurité audit** (P1 uniquement) :
- ❌ **INTERDIT** : Stocker P2/P3 dans audit events (content, prompt, response)
- ✅ **AUTORISÉ** : Metadata P1 (tenantId, userId, purpose, timestamps)

**Tests** :
- [tests/rgpd.audit-events-no-payload.test.ts](../../tests/rgpd.audit-events-no-payload.test.ts) - 6 tests (PASS)

**Articles couverts** :
- Art. 5.2 (Responsabilité, démonstration conformité)
- Art. 7.1 (Preuve consentement)
- Art. 30.1 (Registre traitements - complémentaire)

---

### 4. Logging RGPD-Safe

**Fichier** : [src/infrastructure/logging/logger.ts](../../src/infrastructure/logging/logger.ts)

**Responsabilité RGPD** :
- ✅ **Art. 5.1.c (Minimisation)** : Logs sans P2/P3
- ✅ **Art. 32 (Sécurité)** : Pas de fuite données sensibles

**Règles implémentées** :
```typescript
// INTERDIT dans logs :
- Prompts/outputs LLM (P3)
- Emails, noms complets (P2)
- Contenus documents (P3)
- Tokens JWT complets

// AUTORISÉ dans logs :
- Metadata P1 (status, latence, model_ref)
- Identifiants techniques (tenantId, userId, jobId)
- Erreurs génériques (sans détails sensibles)
```

**Tests** :
- [tests/rgpd.no-sensitive-logs.test.ts](../../tests/rgpd.no-sensitive-logs.test.ts) - 8 tests (PASS)
- [tests/logging.sentinel.test.ts](../../tests/logging.sentinel.test.ts) - 12 tests (PASS)

**Gap** : Anonymisation IP logs (EPIC 7 TODO)

**Articles couverts** :
- Art. 5.1.c (Minimisation données)
- Art. 32.1 (Sécurité traitement)

---

## 🤖 Gateway LLM (EPIC 3)

### 5. invokeLLM (Point d'entrée unique)

**Fichier** : [src/ai/gateway/invokeLLM.ts](../../src/ai/gateway/invokeLLM.ts)

**Responsabilité RGPD** :
- ✅ **Art. 5.1.c (Minimisation)** : Gateway stateless, pas de stockage prompts/outputs
- ✅ **Art. 6.1.a (Consentement)** : Enforcement avant invocation LLM
- ✅ **Art. 25 (Privacy by Design)** : Point unique obligatoire, pas de bypass

**Flux traitement** :
```typescript
1. invokeLLM(input, {consentRepo})
2. checkConsent(tenantId, userId, purpose) ← BLOCKER si pas consent
3. Route vers provider (Ollama local / Stub)
4. Retour résultat (stateless, pas de stockage)
```

**Sécurité RGPD** :
- ❌ **INTERDIT** : Appeler LLM directement (bypass Gateway)
- ❌ **INTERDIT** : Persister prompts/outputs par défaut
- ✅ **AUTORISÉ** : Résultat temporaire en mémoire (traitement user)

**Tests** :
- [tests/rgpd.no-llm-bypass.test.ts](../../tests/rgpd.no-llm-bypass.test.ts) - 6 tests (PASS)
- [tests/rgpd.no-prompt-storage.test.ts](../../tests/rgpd.no-prompt-storage.test.ts) - 8 tests (PASS)
- [tests/rgpd.consent-enforcement.test.ts](../../tests/rgpd.consent-enforcement.test.ts) - 8 tests (PASS)

**Gap** : Pseudonymisation PII (EPIC 11 TODO)

**Articles couverts** :
- Art. 5.1.c (Minimisation)
- Art. 6.1.a (Consentement)
- Art. 25 (Privacy by Design)
- Art. 32.1.a (Pseudonymisation - TODO)

---

### 6. checkConsent (Enforcement)

**Fichier** : [src/ai/gateway/enforcement/checkConsent.ts](../../src/ai/gateway/enforcement/checkConsent.ts)

**Responsabilité RGPD** :
- ✅ **Art. 6.1.a (Consentement)** : Vérification obligatoire avant traitement
- ✅ **Art. 7.3 (Révocabilité)** : Effet immédiat révocation

**Validations bloquantes** :
```typescript
1. tenantId, userId, purpose requis (params validation)
2. Consent existe ? (findByUserAndPurpose)
3. revokedAt == null ? (pas révoqué)
4. granted == true ? (accordé)
→ Si une validation échoue : throw ConsentError (403)
```

**Cas d'erreur** :
```typescript
ConsentError: "user has not granted consent for purpose 'X'"
ConsentError: "user has withdrawn consent for purpose 'X'"
ConsentError: "user consent for purpose 'X' is not granted"
```

**Tests** :
- [tests/rgpd.consent-enforcement.test.ts](../../tests/rgpd.consent-enforcement.test.ts) L77-264 (8 tests PASS)

**Articles couverts** :
- Art. 6.1.a (Base légale consentement)
- Art. 7.3 (Révocabilité immédiate)

---

## 📊 Stockage & Rétention (EPIC 4)

### 7. RetentionPolicy

**Fichier** : [src/domain/retention/RetentionPolicy.ts](../../src/domain/retention/RetentionPolicy.ts)

**Responsabilité RGPD** :
- ✅ **Art. 5.1.e (Limitation durée)** : Conservation limitée par classification
- ✅ **Art. 25 (Privacy by Default)** : Rétention minimale par défaut

**Politiques par classification** :
```typescript
// P0 (Public) : lifetime
INFINITY

// P1 (Technical metadata) : 90 jours max
ai_jobs: 90 jours
audit_events: 90 jours (TODO: clarifier durée légale)

// P2 (Personal data) : account lifetime
users: lifetime (jusqu'à suppression compte)
consents: lifetime

// P3 (Sensitive) : INTERDIT stockage permanent
prompts/outputs LLM: stateless (0 jour)
```

**Mécanisme purge** :
- Script automatique : [scripts/purge.ts](../../scripts/purge.ts)
- Exécution recommandée : cron quotidien
- Logs purge : P1 uniquement (IDs purgés, counts)

**Tests** :
- [tests/purge.lot4.test.ts](../../tests/purge.lot4.test.ts) - 8 tests (PASS)

**Articles couverts** :
- Art. 5.1.e (Limitation conservation)
- Art. 25.2 (Protection par défaut)

---

### 8. Database Schema (PostgreSQL)

**Fichiers** :
- [migrations/001_init.sql](../../migrations/001_init.sql) - Tables core (users, tenants)
- [migrations/002_lot4_consents_ai_jobs.sql](../../migrations/002_lot4_consents_ai_jobs.sql) - Consentements & jobs IA
- [migrations/002_rgpd_deletion.sql](../../migrations/002_rgpd_deletion.sql) - Effacement RGPD

**Responsabilité RGPD** :
- ✅ **Art. 32 (Sécurité)** : Isolation tenant (tenant_id NOT NULL)
- ✅ **Art. 5.1.c (Minimisation)** : Colonnes strictement nécessaires
- ✅ **Art. 17 (Effacement)** : Support soft delete + purge

**Tables sensibles RGPD** :

#### Table `consents` (P2)
```sql
id, tenant_id, user_id, purpose,
granted, granted_at, revoked_at, created_at

-- Classification : P2 (données personnelles RGPD)
-- Rétention : account lifetime
-- Index : tenant_id + user_id (isolation stricte)
-- Contrainte : tenant_id NOT NULL (BLOCKER)
```

**Articles** : Art. 6.1.a, Art. 7

#### Table `ai_jobs` (P1)
```sql
id, tenant_id, user_id, purpose, model_ref,
status, created_at, started_at, completed_at

-- Classification : P1 (metadata uniquement)
-- Rétention : 90 jours max
-- INTERDIT : colonnes prompt, output, embeddings (P3)
-- Index : tenant_id + status (queries rapides)
-- Contrainte : tenant_id NOT NULL, purpose NOT EMPTY
```

**Articles** : Art. 5.1.c (Minimisation), Art. 5.1.e (Rétention)

#### Table `rgpd_requests` (P2)
```sql
id, tenant_id, user_id, request_type,
status, initiated_at, completed_at

-- Classification : P2 (traçabilité droits RGPD)
-- Rétention : 90 jours après completion
-- Types : 'EXPORT', 'DELETION'
-- Status : 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
```

**Articles** : Art. 15, Art. 17

**Tests isolation** :
- [tests/db.cross-tenant-isolation.test.ts](../../tests/db.cross-tenant-isolation.test.ts) - 12 tests (PASS)
- [tests/db.lot4.tenant-isolation.test.ts](../../tests/db.lot4.tenant-isolation.test.ts) - 8 tests (PASS)

---

## 🔐 Pipeline RGPD — Droits des Personnes (EPIC 5)

### 9. Consentement (opt-in / revoke)

**Use-Cases** :
- [src/app/usecases/consent/grantConsent.ts](../../src/app/usecases/consent/grantConsent.ts)
- [src/app/usecases/consent/revokeConsent.ts](../../src/app/usecases/consent/revokeConsent.ts)

**Repository** :
- [src/infrastructure/repositories/PgConsentRepo.ts](../../src/infrastructure/repositories/PgConsentRepo.ts)

**API Routes** :
- [src/app/api/consents/route.ts](../../src/app/api/consents/route.ts) - POST /api/consents (grant)
- [src/app/api/consents/revoke/route.ts](../../src/app/api/consents/revoke/route.ts) - POST /api/consents/revoke

**Responsabilité RGPD** :
- ✅ **Art. 6.1.a (Consentement)** : Base légale opt-in
- ✅ **Art. 7 (Conditions)** : Libre, spécifique, éclairé, univoque, révocable
- ✅ **Art. 7.1 (Preuve)** : Traçabilité audit events

**Flux grant consent** :
```typescript
1. POST /api/consents {userId, purpose}
2. requireAuth → JWT validation + tenantId extraction
3. grantConsent(consentRepo, auditWriter, {tenantId, userId, purpose})
4. consentRepo.create(tenantId, {userId, purpose, granted: true, grantedAt: now()})
5. emitAuditEvent("consent.granted") ← P1 uniquement
6. Retour 201 Created
```

**Flux revoke consent** :
```typescript
1. POST /api/consents/revoke {userId, purpose}
2. requireAuth → JWT validation
3. revokeConsent(consentRepo, auditWriter, {tenantId, userId, purpose})
4. consentRepo.revoke(tenantId, userId, purpose) → SET revoked_at = now()
5. emitAuditEvent("consent.revoked")
6. Retour 200 OK
7. Effet immédiat : checkConsent() rejette invocations LLM
```

**Tests** :
- [tests/rgpd.consent-enforcement.test.ts](../../tests/rgpd.consent-enforcement.test.ts) - 8 tests (PASS)
  - Test 1 : AI call rejected without consent ✅
  - Test 2 : AI call allowed WITH consent ✅
  - Test 3 : AI call rejected AFTER revoke ✅
  - Test 4 : Audit events for consent grant ✅
  - Test 5 : Audit events for consent revoke ✅
  - Test 6 : Cross-tenant consent isolation ✅
  - Test 7 : Consent enforcement at Gateway level (not bypassable) ✅
  - Test 8 : Consent specificity per purpose ✅

**Articles couverts** :
- Art. 6.1.a (Base légale consentement)
- Art. 7.1-7.3 (Conditions consentement)

---

### 10. Export RGPD (Art. 15 + 20)

**Use-Cases** :
- [src/app/usecases/rgpd/generateRgpdExport.ts](../../src/app/usecases/rgpd/generateRgpdExport.ts)
- [src/app/usecases/rgpd/initiateRgpdExport.ts](../../src/app/usecases/rgpd/initiateRgpdExport.ts)

**Domain** :
- [src/domain/rgpd/ExportBundle.ts](../../src/domain/rgpd/ExportBundle.ts) - Structure export JSON

**Infrastructure** :
- [src/infrastructure/storage/ExportStorage.ts](../../src/infrastructure/storage/ExportStorage.ts) - Stockage fichiers
- [src/infrastructure/crypto/encryption.ts](../../src/infrastructure/crypto/encryption.ts) - Chiffrement AES-256-GCM

**API Routes** :
- [src/app/api/rgpd/export/route.ts](../../src/app/api/rgpd/export/route.ts) - POST /api/rgpd/export

**Responsabilité RGPD** :
- ✅ **Art. 15 (Accès)** : User obtient copie de ses données
- ✅ **Art. 20 (Portabilité)** : Format structuré, lisible machine (JSON)
- ✅ **Art. 32 (Sécurité)** : Export chiffré AES-256-GCM

**Structure export** :
```json
{
  "exportId": "uuid",
  "userId": "uuid",
  "tenantId": "uuid",
  "requestedAt": "ISO8601",
  "data": {
    "profile": {
      "userId": "uuid",
      "email": "user@example.com",
      "displayName": "John Doe",
      "createdAt": "ISO8601"
    },
    "consents": [
      {
        "purpose": "ai_processing",
        "granted": true,
        "grantedAt": "ISO8601",
        "revokedAt": null
      }
    ],
    "aiJobs": [
      {
        "jobId": "uuid",
        "purpose": "document_analysis",
        "status": "COMPLETED",
        "createdAt": "ISO8601"
      }
    ]
  }
}
```

**Chiffrement** :
```typescript
// Algorithm : AES-256-GCM
// Key : 32 bytes (256 bits) généré aléatoirement par export
// IV : 12 bytes (96 bits) généré aléatoirement
// Output : {encrypted: Buffer, iv: Buffer, tag: Buffer, key: Buffer}
// Stockage : data/exports/{exportId}.enc
```

**Flux export** :
```typescript
1. POST /api/rgpd/export {userId}
2. requireAuth → JWT validation (user peut exporter ses données)
3. initiateRgpdExport → Create rgpd_requests (status: PENDING)
4. generateRgpdExport → Collecte données (profile, consents, ai_jobs)
5. Chiffrement AES-256-GCM
6. Stockage data/exports/{exportId}.enc
7. Update rgpd_requests (status: COMPLETED)
8. emitAuditEvent("rgpd.export.requested")
9. Retour 200 OK {exportId, downloadUrl}
```

**Tests** :
- [tests/rgpd.export.test.ts](../../tests/rgpd.export.test.ts) - 12 tests (PASS)
  - Test 1 : Export includes profile data ✅
  - Test 2 : Export includes consents ✅
  - Test 3 : Export includes ai_jobs metadata (no P3) ✅
  - Test 4 : Export encrypted AES-256-GCM ✅
  - Test 5 : Export decryption succeeds ✅
  - Test 6 : Cross-tenant isolation (user cannot export other tenant data) ✅
  - Test 7 : Audit event emitted ✅
  - Test 8 : Export JSON format valid ✅

**Articles couverts** :
- Art. 15 (Droit d'accès)
- Art. 20 (Droit portabilité)
- Art. 32 (Sécurité - chiffrement)

---

### 11. Effacement RGPD (Art. 17)

**Use-Cases** :
- [src/app/usecases/rgpd/initiateRgpdDeletion.ts](../../src/app/usecases/rgpd/initiateRgpdDeletion.ts)
- [src/app/usecases/rgpd/executeRgpdDeletion.ts](../../src/app/usecases/rgpd/executeRgpdDeletion.ts)

**Migration** :
- [migrations/002_rgpd_deletion.sql](../../migrations/002_rgpd_deletion.sql) - Support soft delete

**Script** :
- [scripts/purge.ts](../../scripts/purge.ts) - Purge automatique

**API Routes** :
- [src/app/api/rgpd/deletion/route.ts](../../src/app/api/rgpd/deletion/route.ts) - POST /api/rgpd/deletion

**Responsabilité RGPD** :
- ✅ **Art. 17 (Effacement)** : Suppression définitive données
- ✅ **Art. 5.1.e (Limitation durée)** : Purge après délai (30j)

**Processus 2 phases** :

#### Phase 1 : Soft Delete (immédiat)
```typescript
1. POST /api/rgpd/deletion {userId}
2. requireAuth → JWT validation
3. initiateRgpdDeletion
4. SET users.deleted_at = now() WHERE user_id = X
5. Cascade soft delete : consents, ai_jobs, exports
6. emitAuditEvent("rgpd.deletion.initiated")
7. Retour 200 OK {deletionId}
```

**Effet immédiat** :
- User ne peut plus se connecter (auth bloqué si deleted_at != null)
- Données masquées dans UI (WHERE deleted_at IS NULL)
- Données conservées 30j (fenêtre récupération si erreur)

#### Phase 2 : Hard Delete (30 jours après)
```typescript
1. Cron job daily : scripts/purge.ts
2. SELECT * FROM users WHERE deleted_at < now() - INTERVAL '30 days'
3. DELETE FROM consents WHERE user_id IN (...)
4. DELETE FROM ai_jobs WHERE user_id IN (...)
5. DELETE FROM exports WHERE user_id IN (...)
6. DELETE FROM users WHERE user_id IN (...)
7. emitAuditEvent("rgpd.deletion.executed")
```

**Tests** :
- [tests/rgpd.deletion.test.ts](../../tests/rgpd.deletion.test.ts) - 12 tests (PASS)
  - Test 1 : Soft delete marks user deleted_at ✅
  - Test 2 : Soft delete cascades to consents ✅
  - Test 3 : Soft delete cascades to ai_jobs ✅
  - Test 4 : Hard delete after 30 days ✅
  - Test 5 : Audit event initiated ✅
  - Test 6 : Audit event executed ✅
  - Test 7 : Cross-tenant isolation ✅
  - Test 8 : User cannot login after deletion ✅

**Articles couverts** :
- Art. 17.1 (Droit à l'effacement)
- Art. 5.1.e (Limitation durée conservation)

---

## 🎨 Frontends (EPIC 8-9-10)

### 12. Interface Super Admin (EPIC 8 - TODO)

**Scope** : PLATFORM

**Responsabilité RGPD** :
- ⚠️ **Art. 13-14 (Information)** : Afficher identité responsable traitement
- ⚠️ **Art. 30 (Registre)** : Consulter registre traitements (TODO)

**Pages prévues** :
- Dashboard global (tous tenants)
- Gestion tenants (créer, activer/désactiver)
- Monitoring conformité RGPD (exports/deletions stats)

**Articles couverts** : (frontend TODO)

---

### 13. Interface Tenant Admin (EPIC 9 - TODO)

**Scope** : TENANT

**Responsabilité RGPD** :
- ⚠️ **Art. 7 (Consentement)** : Configurer purposes, voir matrice consentements
- ⚠️ **Art. 15-17 (Droits)** : Traiter demandes RGPD users

**Pages prévues** :
- Dashboard tenant
- Gestion purposes (créer, éditer)
- Matrice consentements (users × purposes)
- Demandes RGPD (exports, deletions)

**Articles couverts** : (frontend TODO)

---

### 14. Interface User (EPIC 10 - TODO)

**Scope** : MEMBER

**Responsabilité RGPD** :
- ⚠️ **Art. 7 (Consentement UI)** : Popup consentement explicite
- ⚠️ **Art. 13-14 (Information)** : Politique confidentialité, contact DPO
- ⚠️ **Art. 15-17-20 (Droits UI)** : Boutons export, effacement

**Pages prévues** :
- Dashboard utilisateur
- AI Tools (upload document, choisir purpose, résultat)
- Mes consentements (toggle on/off par purpose)
- Mon historique IA (metadata ai_jobs)
- Mes données RGPD (exporter, supprimer compte)
- Politique confidentialité

**Articles couverts** : (frontend TODO, backend prêt)

---

## 🚧 Composants TODO (EPIC 11-13)

### 15. Anonymisation & Pseudonymisation (EPIC 11 - TODO)

**Scope** :
- LOT 11.0 : PII Detection & Redaction (Gateway LLM)
- LOT 11.1 : Anonymisation IP (logs)
- LOT 11.2 : Audit PII logs

**Responsabilité RGPD** :
- ❌ **Art. 32.1.a (Pseudonymisation)** : Masquer PII dans prompts LLM
- ❌ **Art. 5.1.c (Minimisation)** : Anonymiser IPs logs

**Implémentation prévue** :

#### PII Redaction (Gateway LLM)
```typescript
// src/ai/gateway/redaction/detectPII.ts
export function detectPII(text: string): PiiEntity[] {
  // Détecter : emails, noms, téléphones, adresses
  // Return : [{type, value, start, end}]
}

// src/ai/gateway/redaction/maskPII.ts
export function maskPII(text: string, entities: PiiEntity[]): string {
  // Masquer : jean.dupont@example.com → [EMAIL]
  //          Jean Dupont → [PERSON]
  //          +33612345678 → [PHONE]
}

// Integration invokeLLM :
1. detectPII(input.text)
2. maskPII(input.text, entities)
3. invokeLLM with masked text
4. Optionnel : reverseMasking(output, entities) si nécessaire
```

#### Anonymisation IP (Logs)
```typescript
// src/infrastructure/logging/anonymizeIP.ts
export function anonymizeIP(ip: string): string {
  // IPv4 : 192.168.1.123 → 192.168.1.0
  // IPv6 : 2001:db8::1 → 2001:db8::
}

// Appliquer après 7 jours (cron job)
```

**Articles couverts** : (TODO)
- Art. 32.1.a (Pseudonymisation)
- Art. 5.1.c (Minimisation)

---

### 16. RGPD Legal & Compliance (EPIC 12 - TODO)

**Scope** :
- LOT 12.0 : Politique de confidentialité
- LOT 12.1 : CGU/CGV
- LOT 12.2 : Page "Informations RGPD"
- LOT 12.3 : Cookie consent banner
- LOT 12.4 : Registre traitements (Art. 30)
- LOT 12.5 : DPIA Gateway LLM (Art. 35)
- LOT 12.6 : Droits complémentaires (Art. 18, 21, 22)

**Responsabilité RGPD** :
- ❌ **Art. 13-14 (Information)** : Politique confidentialité, contact DPO
- ❌ **Art. 30 (Registre)** : Document traitements obligatoire
- ❌ **Art. 35 (DPIA)** : Analyse d'impact IA obligatoire

**Documents à créer** :
- `docs/rgpd/POLITIQUE_CONFIDENTIALITE.md` - Politique user-friendly
- `docs/rgpd/CGU.md` - Conditions générales utilisation
- `docs/rgpd/REGISTRE_TRAITEMENTS.md` - Registre Art. 30
- `docs/rgpd/DPIA_GATEWAY_LLM.md` - DPIA complète

**Interfaces à créer** :
- Page `/privacy-policy` (accessible footer)
- Page `/rgpd-info` (contact DPO, droits, réclamation CNIL)
- Cookie consent banner (si analytics/marketing)

**Articles couverts** : (TODO)
- Art. 13-14 (Information personnes)
- Art. 30 (Registre traitements)
- Art. 35 (DPIA)

---

### 17. Incident Response & Security (EPIC 13 - TODO)

**Scope** :
- LOT 13.0 : Runbook incident RGPD
- LOT 13.1 : Pentest & vulnerability scanning
- LOT 13.2 : Chaos engineering

**Responsabilité RGPD** :
- ❌ **Art. 33-34 (Violations)** : Processus notification CNIL/users
- ❌ **Art. 32 (Sécurité)** : Tests résilience

**Artefacts à créer** :
- `docs/runbooks/INCIDENT_RGPD.md` - Procédure violation données
- `docs/rgpd/REGISTRE_VIOLATIONS.md` - Registre vide (Art. 33.5)
- Templates emails notification users (Art. 34)

**Tests à implémenter** :
- Pentest OWASP Top 10
- Scan dépendances (npm audit, Snyk)
- Tests chaos (kill pods, perte DB)
- Tests backup/restore

**Articles couverts** : (TODO)
- Art. 33.1-33.5 (Notification violations CNIL)
- Art. 34 (Notification personnes)
- Art. 32.1.d (Tests résilience)

---

## 📊 Matrice Tests RGPD

### Tests par catégorie

| Catégorie | Tests | Statut | Fichiers |
|-----------|-------|--------|----------|
| **Consentement** | 8 | ✅ PASS | [tests/rgpd.consent-enforcement.test.ts](../../tests/rgpd.consent-enforcement.test.ts) |
| **Export** | 12 | ✅ PASS | [tests/rgpd.export.test.ts](../../tests/rgpd.export.test.ts) |
| **Effacement** | 12 | ✅ PASS | [tests/rgpd.deletion.test.ts](../../tests/rgpd.deletion.test.ts) |
| **Isolation tenant** | 20 | ✅ PASS | [tests/db.cross-tenant-isolation.test.ts](../../tests/db.cross-tenant-isolation.test.ts), [tests/rgpd.no-cross-tenant.test.ts](../../tests/rgpd.no-cross-tenant.test.ts) |
| **No LLM bypass** | 6 | ✅ PASS | [tests/rgpd.no-llm-bypass.test.ts](../../tests/rgpd.no-llm-bypass.test.ts) |
| **No prompt storage** | 8 | ✅ PASS | [tests/rgpd.no-prompt-storage.test.ts](../../tests/rgpd.no-prompt-storage.test.ts) |
| **No sensitive logs** | 8 | ✅ PASS | [tests/rgpd.no-sensitive-logs.test.ts](../../tests/rgpd.no-sensitive-logs.test.ts) |
| **Audit events** | 6 | ✅ PASS | [tests/rgpd.audit-events-no-payload.test.ts](../../tests/rgpd.audit-events-no-payload.test.ts) |
| **Policy engine** | 6 | ✅ PASS | [tests/rgpd.policy-engine.test.ts](../../tests/rgpd.policy-engine.test.ts) |
| **Purge/Rétention** | 8 | ✅ PASS | [tests/purge.lot4.test.ts](../../tests/purge.lot4.test.ts) |
| **Bootstrap** | 4 | ✅ PASS | [tests/rgpd.bootstrap.usecase.test.ts](../../tests/rgpd.bootstrap.usecase.test.ts) |
| **TOTAL** | **98** | ✅ **PASS** | - |

### Tests critiques RGPD (Blockers)

| Test | Article RGPD | Statut |
|------|--------------|--------|
| AI call rejected without consent | Art. 6.1.a | ✅ PASS |
| AI call rejected AFTER revoke | Art. 7.3 | ✅ PASS |
| Cross-tenant consent isolation | Art. 32 | ✅ PASS |
| Consent enforcement at Gateway level (not bypassable) | Art. 25 | ✅ PASS |
| Export includes profile + consents + ai_jobs | Art. 15, 20 | ✅ PASS |
| Export encrypted AES-256-GCM | Art. 32 | ✅ PASS |
| Soft delete + hard delete after 30 days | Art. 17 | ✅ PASS |
| Audit events P1 only (no sensitive data) | Art. 5.1.c | ✅ PASS |
| No prompt/output storage (stateless Gateway) | Art. 5.1.c | ✅ PASS |
| Cross-tenant isolation (database level) | Art. 32 | ✅ PASS |

---

## 📚 Références Croisées

### Par Article RGPD → Composants

| Article | Composants | Tests |
|---------|------------|-------|
| **Art. 5.1.c (Minimisation)** | invokeLLM, RetentionPolicy, logger | no-prompt-storage, no-sensitive-logs |
| **Art. 5.1.e (Rétention)** | RetentionPolicy, purge.ts | purge.lot4 |
| **Art. 5.1.f (Intégrité)** | PolicyEngine, TenantGuard | authz, tenant-guard |
| **Art. 6.1.a (Consentement)** | grantConsent, revokeConsent, checkConsent | consent-enforcement |
| **Art. 7 (Conditions)** | Consentement + UI (TODO) | consent-enforcement |
| **Art. 13-14 (Information)** | UI Frontend (TODO) | - |
| **Art. 15 (Accès)** | generateRgpdExport | rgpd.export |
| **Art. 17 (Effacement)** | initiateRgpdDeletion, executeRgpdDeletion | rgpd.deletion |
| **Art. 20 (Portabilité)** | ExportBundle | rgpd.export |
| **Art. 25 (Privacy by Design)** | Architecture BOUNDARIES.md, invokeLLM | no-llm-bypass |
| **Art. 30 (Registre)** | Document TODO | - |
| **Art. 32 (Sécurité)** | PolicyEngine, TenantGuard, encryption | authz, tenant-guard, export |
| **Art. 33-34 (Violations)** | Runbook TODO | - |
| **Art. 35 (DPIA)** | Document TODO | - |

### Par EPIC → Articles

| EPIC | Articles couverts | Taux |
|------|-------------------|------|
| **EPIC 1** | Art. 5.1.f, 25, 32 | 100% |
| **EPIC 3** | Art. 5.1.c, 6.1.a, 25, 32 | 90% (pseudonymisation TODO) |
| **EPIC 4** | Art. 5.1.c, 5.1.e | 100% |
| **EPIC 5** | Art. 6-7, 15, 17, 20 | 100% |
| **EPIC 8-10** | Art. 7, 13-14, 15-17-20 (UI) | 0% (frontend TODO) |
| **EPIC 11** | Art. 32.1.a (pseudonymisation) | 0% (TODO) |
| **EPIC 12** | Art. 13-14, 30, 35 | 0% (TODO) |
| **EPIC 13** | Art. 32.1.d, 33-34 | 0% (TODO) |

---

## 🎯 Checklist Audit CNIL

### Questions audit → Preuves

| Question CNIL | Réponse | Preuve |
|---------------|---------|--------|
| **Licéité traitement ?** | Consentement opt-in | [tests/rgpd.consent-enforcement.test.ts](../../tests/rgpd.consent-enforcement.test.ts) L77 |
| **Minimisation données ?** | Gateway stateless, P1 metadata only | [tests/rgpd.no-prompt-storage.test.ts](../../tests/rgpd.no-prompt-storage.test.ts) |
| **Limitation durée ?** | Rétention 90j max, purge auto | [tests/purge.lot4.test.ts](../../tests/purge.lot4.test.ts) |
| **Sécurité traitement ?** | TLS 1.3, AES-256-GCM, RBAC, isolation tenant | [tests/http.authz.test.ts](../../tests/http.authz.test.ts), [tests/rgpd.export.test.ts](../../tests/rgpd.export.test.ts) L81 |
| **Droit accès implémenté ?** | Export RGPD JSON chiffré | [tests/rgpd.export.test.ts](../../tests/rgpd.export.test.ts) |
| **Droit effacement implémenté ?** | Soft delete + purge 30j | [tests/rgpd.deletion.test.ts](../../tests/rgpd.deletion.test.ts) |
| **Droit portabilité implémenté ?** | Export JSON structuré | [tests/rgpd.export.test.ts](../../tests/rgpd.export.test.ts) |
| **Consentement révocable ?** | Révocation immédiate effective | [tests/rgpd.consent-enforcement.test.ts](../../tests/rgpd.consent-enforcement.test.ts) L139 |
| **Isolation tenant ?** | Cross-tenant isolation stricte | [tests/db.cross-tenant-isolation.test.ts](../../tests/db.cross-tenant-isolation.test.ts) |
| **Logs RGPD-safe ?** | P1 uniquement, pas P2/P3 | [tests/rgpd.no-sensitive-logs.test.ts](../../tests/rgpd.no-sensitive-logs.test.ts) |
| **Registre traitements ?** | ❌ TODO (EPIC 12) | - |
| **DPIA réalisée ?** | ❌ TODO (EPIC 12) | - |
| **Politique confidentialité ?** | ❌ TODO (EPIC 12) | - |
| **Processus violations ?** | ❌ TODO (EPIC 13) | - |

---

## 📅 Roadmap Implémentation

### ✅ Phase 1 : Socle Backend (Semaines 1-3)
- EPIC 1 : PolicyEngine, TenantGuard, Audit, Logging ✅
- EPIC 3 : Gateway LLM, checkConsent ✅
- EPIC 4 : RetentionPolicy, purge ✅
- EPIC 5 : Consentement, Export, Effacement ✅

### ⚠️ Phase 2 : Back Office (Semaines 4-8)
- EPIC 8 : Super Admin ❌ TODO
- EPIC 9 : Tenant Admin ❌ TODO

### ⚠️ Phase 3 : Front User (Semaines 9-12)
- EPIC 10 : Interface utilisateur ❌ TODO

### ⚠️ Phase 4 : Compliance (Semaines 13-15)
- EPIC 11 : Anonymisation & Pseudonymisation ❌ TODO
- EPIC 12 : RGPD Legal & Compliance ❌ TODO

### ⚠️ Phase 5 : Production Readiness (Semaines 16-17)
- EPIC 13 : Incident Response & Security Hardening ❌ TODO

---

**Document créé le 25 décembre 2025**  
**Version 1.0**  
**Auteur** : Équipe Plateforme RGPD-IA

**Voir aussi** : [TRACABILITE_RGPD_MATRICE.md](./TRACABILITE_RGPD_MATRICE.md) - Matrice conformité par article RGPD
