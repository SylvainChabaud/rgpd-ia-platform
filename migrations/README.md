# Migrations — RGPD IA Platform

> Scripts SQL pour la gestion du schéma de base de données PostgreSQL.

---

## 📁 Fichiers de migration

| Version | Fichier | LOT | Description |
|---------|---------|-----|-------------|
| **001** | `001_init.sql` | LOT 1.0 | Socle initial (tenants, users, audit) |
| **002** | `002_lot4_consents_ai_jobs.sql` | LOT 4.0 | Consentements + Jobs IA + versioning |
| **003** | `003_rgpd_deletion.sql` | LOT 5.2 | Soft delete (droit à l'effacement) |

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

## 🎯 Conformité avec les EPICs futures

### État actuel vs besoins futurs

| EPIC | Besoins DB | Couvert ? | Migration requise |
|------|------------|-----------|-------------------|
| **EPIC 1-7** | Socle, users, audit, consents, ai_jobs, RGPD | ✅ Oui | — |
| **EPIC 8** | Anonymisation (PII tokens) | ⚠️ Partiel | `004_anonymisation.sql` |
| **EPIC 9** | Registre violations (incidents) | ❌ Non | `005_incidents.sql` |
| **EPIC 10** | Cookies consent, DPIA tracking | ⚠️ Partiel | `006_legal_compliance.sql` |
| **EPIC 11** | Back Office Super Admin | ✅ Oui | — (utilise tables existantes) |
| **EPIC 12** | Back Office Tenant Admin | ✅ Oui | — (utilise tables existantes) |
| **EPIC 13** | Front User | ✅ Oui | — (utilise tables existantes) |

### Migrations futures prévues

#### `004_anonymisation.sql` (EPIC 8)
```sql
-- Prévu pour LOT 8.0-8.2
-- Table pour stocker les tokens de pseudonymisation
CREATE TABLE pii_tokens (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  original_hash TEXT NOT NULL,  -- Hash du PII original
  token TEXT NOT NULL UNIQUE,   -- Token pseudonymisé
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `005_incidents.sql` (EPIC 9)
```sql
-- Prévu pour LOT 9.0
-- Registre des violations de données (Art. 33-34)
CREATE TABLE security_incidents (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),  -- NULL = platform-wide
  severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  type TEXT NOT NULL,
  description TEXT,
  detected_at TIMESTAMPTZ NOT NULL,
  notified_cnil_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `006_legal_compliance.sql` (EPIC 10)
```sql
-- Prévu pour LOT 10.3-10.5
-- Tracking des cookies et DPIAs
CREATE TABLE cookie_consents (
  id UUID PRIMARY KEY,
  session_id TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  analytics BOOLEAN DEFAULT false,
  marketing BOOLEAN DEFAULT false,
  preferences BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

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
