# Migrations — RGPD IA Platform

> Scripts SQL pour la gestion du schéma de base de données PostgreSQL.

---

## 📁 Fichiers de migration

| Version | Fichier | LOT | Description |
|---------|---------|-----|-------------|
| **001** | `001_init.sql` | LOT 1.0 | Socle initial (tenants, users, audit) |
| **002** | `002_lot4_consents_ai_jobs.sql` | LOT 4.0 | Consentements + Jobs IA + versioning |
| **003** | `003_rgpd_deletion.sql` | LOT 5.2 | Soft delete (droit à l'effacement) |
| **004** | `004_rls_tenant_isolation.sql` | LOT 4.0 | Row-Level Security (RLS) policies |
| **005** | `005_force_rls.sql` | LOT 4.0 | Force RLS même pour superusers (tests) |
| **006** | `006_fix_rls_policies.sql` | LOT 4.0 | Fix RLS policies (strict validation) |
| **007** | `007_fix_strict_rls.sql` | LOT 4.0 | Fix CRITICAL RLS bugs (users table) |
| **008** | `008_create_testuser_role.sql` | LOT 4.0 | Création rôle testuser (NOBYPASSRLS) |
| **009** | `009_fix_current_tenant_id_function.sql` | LOT 4.0 | Fix current_tenant_id() (empty string) |
| **010** | `010_create_cleanup_function.sql` | LOT 4.0 | Fonction cleanup_test_data() (SECURITY DEFINER) |
| **011** | `011_fix_users_platform_policies.sql` | LOT 4.0 | Fix users policies (empty string) |
| **012** | `012_fix_audit_events_policy.sql` | LOT 4.0 | Fix audit_events SELECT policy |
| **013** | `013_fix_rgpd_requests_platform_policies.sql` | LOT 5.2 | Fix rgpd_requests pour opérations platform |
| **014** | `014_incidents.sql` | LOT 9.0 | Registre violations (Art. 33-34) + incident audit log |
| **015** | `015_cgu_disputes_cookies.sql` | LOT 10.0-10.6 | Tables RGPD/Legal (CGU, disputes, oppositions, cookies) |
| **016** | `016_epic10_legal_extensions.sql` | LOT 10.0-10.7 | Extensions EPIC 10 (soft delete, metadata, statuses) |
| **017** | `017_tenant_suspension.sql` | LOT 11.0 | Système de suspension tenant (Art. 18) |
| **018** | `018_normalize_user_roles.sql` | LOT 11.0 | Normalisation des rôles utilisateurs + contrainte CHECK |
| **019** | `019_purposes.sql` | LOT 12.2 | Table purposes (finalités IA) |
| **020** | `020_purpose_templates.sql` | LOT 12.2 | Templates système de purposes |
| **021** | `021_additional_purpose_templates.sql` | LOT 12.2 | Templates additionnels |
| **022** | `022_critical_purpose_templates.sql` | LOT 12.2 | Templates critiques (santé, juridique) |
| **023** | `023_professional_purpose_templates.sql` | LOT 12.2 | Templates professionnels |

---

## 🔧 Exécution

```bash
# Appliquer toutes les migrations pendantes
pnpm migrate

# Ou directement
tsx scripts/migrate.ts
```

**Prérequis** :
- PostgreSQL 16 en cours d'exécution
- Variable `DATABASE_URL` configurée

---

## 📋 Système de versioning

### Convention de nommage

```
NNN_description.sql
 │   └── Description en snake_case
 └────── Version sur 3 chiffres (001, 002, 003...)
```

### Table `schema_migrations`

Le système trace les migrations appliquées :

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Comportement

1. **Idempotent** : Une migration déjà appliquée est ignorée
2. **Ordre** : Les migrations sont exécutées par ordre de version croissant
3. **Atomique** : Chaque migration gère sa propre transaction (`BEGIN`/`COMMIT`)

---

## 📊 Détail des migrations

### `001_init.sql` — Socle initial

**EPIC 1, 4, 7** — Tables fondamentales de la plateforme.

| Table | Classification | Description |
|-------|----------------|-------------|
| `tenants` | P1 | Organisations clientes |
| `users` | P2 | Utilisateurs (platform + tenant) |
| `audit_events` | P1 | Journal d'audit RGPD-safe |
| `rgpd_requests` | P2 | Demandes export/suppression |
| `bootstrap_state` | P1 | Verrou pour bootstrap initial |

**Contraintes clés** :
- `scope IN ('PLATFORM', 'TENANT')` sur `users`
- Index unique pour Super Admin platform
- Cascade delete `tenant → users`

---

### `002_lot4_consents_ai_jobs.sql` — Stockage IA RGPD

**LOT 4.0** — Tables pour les consentements et le tracking IA.

| Table | Classification | Rétention | Description |
|-------|----------------|-----------|-------------|
| `consents` | **P2** | Vie du compte | Consentements utilisateur |
| `ai_jobs` | **P1** | 30-90 jours | Métadonnées jobs IA |
| `schema_migrations` | Système | ∞ | Suivi des versions |

**⚠️ CRITIQUE RGPD** :
- `ai_jobs` contient **uniquement des métadonnées** (P1)
- **Aucun prompt/output stocké** (ce sont des données P3)
- Contrainte d'isolation tenant sur toutes les tables

**Contraintes ajoutées** :
- `chk_consents_tenant_not_null` — Tenant obligatoire
- `chk_ai_jobs_tenant_not_null` — Tenant obligatoire
- `chk_ai_jobs_purpose_not_empty` — Purpose non vide
- `chk_users_tenant_scope` — Cohérence scope/tenant

---

### `003_rgpd_deletion.sql` — Droit à l'effacement

**LOT 5.2** — Soft delete pour le droit à l'effacement (Art. 17).

| Modification | Tables | Description |
|--------------|--------|-------------|
| `deleted_at` | users, consents, ai_jobs | Timestamp suppression logique |
| Index `_active` | toutes | Optimise `WHERE deleted_at IS NULL` |
| Index `_pending_purge` | users | Trouve les enregistrements à purger |
| `scheduled_purge_at` | rgpd_requests | Planification hard delete |
| `completed_at` | rgpd_requests | Horodatage fin de traitement |

**Workflow RGPD** :
```
1. Demande utilisateur → soft delete (deleted_at = now())
2. Grace period → 30 jours (récupération possible)
3. CRON purge → hard delete définitif (pnpm purge)
```

---

### `004_rls_tenant_isolation.sql` — Row-Level Security

**LOT 4.0** — Politiques RLS pour isolation stricte des tenants.

| Fonctionnalité | Description |
|----------------|-------------|
| `ENABLE ROW LEVEL SECURITY` | Active RLS sur toutes les tables tenant-scoped |
| Policies CRUD | SELECT/INSERT/UPDATE/DELETE isolés par tenant_id |
| `current_tenant_id()` | Fonction pour récupérer le tenant courant |

**⚠️ CRITIQUE RGPD** :
- Défense en profondeur au niveau DB
- Même avec accès SQL direct, isolation garantie

---

### `005_force_rls.sql` — Force RLS pour superusers

**LOT 4.0** — Force RLS même pour les propriétaires de tables.

```sql
ALTER TABLE consents FORCE ROW LEVEL SECURITY;
```

**Raison** : En environnement de test, le devuser est superuser et contournerait RLS sans cette option.

---

### `006_fix_rls_policies.sql` — Validation stricte tenant

**LOT 4.0** — Correction des policies pour rejeter les opérations sans contexte tenant.

| Problème | Solution |
|----------|----------|
| `current_setting()` retourne NULL | COALESCE vers UUID sentinel (00000000-...) |
| Opérations sans tenant passent | Rejet explicite via UUID sentinel |

---

### `007_fix_strict_rls.sql` — Fix CRITICAL users table

**LOT 4.0** — Corrections de sécurité critique sur la table users.

| Bug fixé | Impact |
|----------|--------|
| Tenants peuvent voir platform users | OK (nécessaire pour auth) |
| Tenants peuvent **modifier** platform users | **BLOQUÉ** |
| Tenants peuvent **créer** platform users | **BLOQUÉ** |

---

### `008_create_testuser_role.sql` — Rôle non-superuser

**LOT 4.0** — Création d'un rôle de test sans BYPASSRLS.

```sql
CREATE ROLE testuser WITH NOBYPASSRLS;
```

**Utilisation** : Tests RLS authentiques (devuser = superuser contourne RLS).

---

### `009_fix_current_tenant_id_function.sql` — Fix empty string

**LOT 4.0** — `current_setting()` retourne '' au lieu de NULL.

**Avant** : `COALESCE(NULL, sentinel)` → OK
**Après** : `COALESCE('', sentinel)` → Retourne '' (bug !)
**Fix** : Vérifier NULL ET '' dans la fonction.

---

### `010_create_cleanup_function.sql` — SECURITY DEFINER cleanup

**LOT 4.0** — Fonction de nettoyage pour les tests.

```sql
CREATE FUNCTION cleanup_test_data(tenant_ids UUID[])
RETURNS void
SECURITY DEFINER  -- Exécute avec privilèges du créateur
```

**Raison** : testuser ne peut pas supprimer les données de test (RLS bloque). Cette fonction contourne RLS pour le cleanup.

---

### `011_fix_users_platform_policies.sql` — Fix INSERT/UPDATE users

**LOT 4.0** — Gère les cas où `current_setting()` retourne '' pour les opérations platform.

---

### `012_fix_audit_events_policy.sql` — Fix SELECT audit_events

**LOT 4.0** — Permet au contexte platform de voir tous les audit events.

---

### `013_fix_rgpd_requests_platform_policies.sql` — Platform ops

**LOT 5.2** — Permet les opérations platform sur rgpd_requests.

**Nécessaire pour** :
- `findPendingPurges()` : Lire TOUTES les demandes pendantes
- `updateStatus()` : Mettre à jour le statut sans contexte tenant

---

## 🎯 Conformité avec les EPICs futures

### État actuel vs besoins futurs

| EPIC | Besoins DB | Couvert ? | Migration requise |
|------|------------|-----------|-------------------|
| **EPIC 1-7** | Socle, users, audit, consents, ai_jobs, RGPD | ✅ Oui | — |
| **LOT 4.0** | RLS (Row-Level Security) + tenant isolation | ✅ Oui | 004-013 ✅ |
| **EPIC 8** | Anonymisation (PII masking) | ✅ Oui | — (implémenté en app) |
| **EPIC 9** | Registre violations (incidents) | ✅ Oui | `014_incidents.sql` ✅ |
| **EPIC 10** | RGPD/Legal (CGU, disputes, cookies) | ✅ Oui | `015_cgu_disputes_cookies.sql` + `016_epic10_legal_extensions.sql` ✅ |
| **EPIC 11** | Back Office Super Admin | ✅ Oui | `017_tenant_suspension.sql` + `018_normalize_user_roles.sql` ✅ |
| **EPIC 12** | Back Office Tenant Admin | ✅ Oui | `019-023_purposes*.sql` ✅ |
| **EPIC 13** | Front User | ✅ Oui | — (utilise tables existantes) |

### Migrations futures prévues

#### `014_incidents.sql` (EPIC 9) ✅ IMPLÉMENTÉ

**LOT** : 9.0
**Description** : Registre des violations de données (Art. 33-34 RGPD)

**Tables créées** :
- `security_incidents` — Registre principal des incidents
- `incident_audit_log` — Audit trail immuable des modifications

**Fonctionnalités clés** :
- 4 niveaux de sévérité (LOW, MEDIUM, HIGH, CRITICAL)
- 9 types d'incidents (UNAUTHORIZED_ACCESS, CROSS_TENANT_ACCESS, etc.)
- Calcul automatique deadline CNIL (72h)
- Tracking notifications CNIL et utilisateurs
- RLS policies (SUPER_ADMIN, DPO, TENANT_ADMIN)
- Indexes optimisés (CNIL deadline queries)

**Voir** : `migrations/014_incidents.sql` pour le schéma complet

#### `015_cgu_disputes_cookies.sql` (EPIC 10) ✅ IMPLÉMENTÉ

**LOT** : 10.0-10.6
**Description** : Tables pour RGPD/Legal Compliance (Art. 7, 13-14, 21-22, ePrivacy 5.3)

**Tables créées** :
- `cgu_versions` — Versioning des CGU (Art. 7)
- `user_cgu_acceptances` — Tracking acceptation CGU utilisateurs
- `user_disputes` — Contestations décisions IA (Art. 22)
- `user_oppositions` — Oppositions traitements (Art. 21)
- `cookie_consents` — Consentements cookies (ePrivacy 5.3)

**Fonctionnalités clés** :
- Tenant isolation sur toutes les tables
- RLS policies automatiques
- Indexes optimisés (queries par user/tenant)
- Support anonymous_id pour cookies pré-login
- Statuts workflow (pending, approved, resolved)

**Voir** : `migrations/015_cgu_disputes_cookies.sql` pour le schéma complet

#### `016_epic10_legal_extensions.sql` (EPIC 10) ✅ IMPLÉMENTÉ

**LOT** : 10.0-10.7
**Description** : Extensions des tables EPIC 10 pour tests complets

**Colonnes ajoutées** :
- `deleted_at` — Soft delete RGPD (Art. 17) sur toutes les tables
- `acceptance_method` — Traçabilité méthode acceptation CGU
- `metadata` — Stockage JSON flexible (disputes, oppositions)
- `summary` — Description versions CGU
- Statuts additionnels disputes (`under_review`, `rejected`)

**Indexes créés** :
- Queries soft delete optimisées (`WHERE deleted_at IS NULL`)
- Support anonymous + user_id pour cookies

**Voir** : `migrations/016_epic10_legal_extensions.sql` pour le détail

#### `017_tenant_suspension.sql` (EPIC 11) ✅ IMPLÉMENTÉ

**LOT** : 11.0
**Description** : Système de suspension tenant (Art. 18 RGPD - Limitation du traitement)

**Colonne ajoutée** :
- `suspended_at` — Timestamp de suspension du tenant (NULL = actif)

**Fonctionnalités clés** :
- Suspension totale du tenant (tous les utilisateurs)
- Middleware de vérification automatique
- Empêche toute opération sur un tenant suspendu
- Réversible (unsuspend)

**Voir** : `migrations/017_tenant_suspension.sql` pour le schéma complet

#### `018_normalize_user_roles.sql` (LOT 11.2) ✅ IMPLÉMENTÉ

**LOT** : 11.2
**Description** : Normalisation des rôles utilisateurs pour cohérence bootstrap/UI/backend

**Problème résolu** :
- Incohérence entre `ADMIN`/`TENANT_ADMIN` et `USER`/`MEMBER`/`TENANT_USER`
- Valeurs hardcodées dans repositories
- Absence de contrainte CHECK sur la colonne `role`

**Actions effectuées** :
- Migration automatique : `ADMIN` → `TENANT_ADMIN`, `USER` → `MEMBER`, `TENANT_USER` → `MEMBER`
- Ajout contrainte CHECK : `role IN ('SUPERADMIN', 'TENANT_ADMIN', 'MEMBER', 'DPO')`
- Documentation de la colonne `users.role`

**Rôles normalisés** :
- `SUPERADMIN` — Admin plateforme (scope: PLATFORM)
- `TENANT_ADMIN` — Admin tenant (scope: TENANT)
- `MEMBER` — Membre tenant (scope: TENANT)
- `DPO` — Data Protection Officer (scope: TENANT)

**Voir** : `migrations/018_normalize_user_roles.sql` pour les détails

---

## 📐 Classification des données (rappel)

| Niveau | Description | Tables concernées |
|--------|-------------|-------------------|
| 🟢 **P0** | Données publiques | — |
| 🟡 **P1** | Métadonnées techniques | `tenants`, `audit_events`, `ai_jobs`, `bootstrap_state` |
| 🟠 **P2** | Données personnelles | `users`, `consents`, `rgpd_requests` |
| 🔴 **P3** | Données sensibles | **Jamais stockées en DB** (prompts, outputs IA) |

---

## 🔒 Règles de sécurité

### Obligations pour chaque migration

1. **Transaction** : Toujours encadrer par `BEGIN`/`COMMIT`
2. **Idempotence** : Utiliser `IF NOT EXISTS` / `IF EXISTS`
3. **Tenant isolation** : Toute table avec données personnelles DOIT avoir `tenant_id NOT NULL`
4. **Indexation** : Créer des index pour les requêtes fréquentes
5. **Versioning** : Insérer dans `schema_migrations` à la fin

### Interdit dans les migrations

- ❌ Données réelles (utiliser des placeholders)
- ❌ Secrets ou credentials
- ❌ Commentaires avec informations sensibles

---

## 🔄 Rollback

Les migrations **ne prévoient pas de rollback automatique** (par design).

En cas de problème :
1. Restaurer le backup de la DB
2. Corriger la migration
3. Réappliquer

**Raison** : Le rollback automatique est risqué pour les données RGPD (perte de consentements, audit trails).

---

## 🔗 Références

- [scripts/migrate.ts](../scripts/migrate.ts) — Script d'exécution
- [docs/data/DATA_CLASSIFICATION.md](../docs/data/DATA_CLASSIFICATION.md) — Classification des données
- [docs/rgpd/registre-traitements.md](../docs/rgpd/registre-traitements.md) — Registre des traitements
- [TASKS.md](../TASKS.md) — Roadmap par EPIC/LOT
