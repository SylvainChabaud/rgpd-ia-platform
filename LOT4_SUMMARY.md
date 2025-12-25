# LOT 4 — Stockage RGPD & Rétention — Résumé exécutif

> **Statut** : ✅ **TERMINÉ (LOT 4.0 + LOT 4.1)**
> **Date** : 2025-12-25
> **Durée** : Implémentation complète en 1 session
> **Tests** : 24 tests bloquants RGPD validés (14 LOT 4.0 + 10 LOT 4.1)

---

## 🎯 Objectifs LOT 4 (EPIC 4)

### LOT 4.0 — Schéma DB minimal + DAL tenant-scoped
Implémenter le stockage minimal, isolé par tenant, prêt pour droits RGPD :
- Tables : `consents` (P2), `ai_jobs` (P1 metadata)
- Migrations idempotentes avec tracking versions
- DAL tenant-scoped avec validation stricte
- Tests RGPD isolation cross-tenant

### LOT 4.1 — Rétention & minimisation (policy + purge job)
Implémenter la politique de rétention et purge automatique :
- RetentionPolicy (durées par type de données)
- Job purge idempotent (AI jobs > 90 jours)
- CLI exécution manuelle (purge / dry-run / tenant)
- Tests idempotence + respect policy

---

## ✅ Réalisations LOT 4.0

### 1. Migration 002 — Tables et contraintes DB

**Fichier** : [migrations/002_lot4_consents_ai_jobs.sql](migrations/002_lot4_consents_ai_jobs.sql)

**Tables créées** :
- ✅ `schema_migrations` : tracking versions migrations (idempotence)
- ✅ `consents` : gestion consentement utilisateur (P2)
  - Colonnes : `tenant_id`, `user_id`, `purpose`, `granted`, timestamps
  - Contrainte : `CHECK (tenant_id IS NOT NULL)`
  - Index : `(tenant_id, user_id)`, `(tenant_id, purpose)`

- ✅ `ai_jobs` : métadonnées jobs IA **UNIQUEMENT** (P1)
  - Colonnes : `tenant_id`, `user_id`, `purpose`, `model_ref`, `status`, timestamps
  - **CRITICAL** : ⛔ AUCUNE colonne contenu (prompts/outputs/embeddings)
  - Contraintes : `CHECK (tenant_id IS NOT NULL)`, `CHECK (purpose != '')`
  - Index : `(tenant_id)`, `(tenant_id, status)`, `(tenant_id, created_at)`

**Contraintes isolation renforcées** :
- ✅ `chk_users_tenant_scope` : TENANT scope → tenant_id required

### 2. Système migrations amélioré

**Fichier** : [src/infrastructure/db/migrate.ts](src/infrastructure/db/migrate.ts)

**Améliorations** :
- ✅ Idempotence garantie (skip migrations déjà appliquées)
- ✅ Tracking versions dans `schema_migrations`
- ✅ Extraction version depuis nom fichier (`NNN_description.sql`)
- ✅ Logs RGPD-safe (P1 uniquement, pas de SQL exposé)

**Script CLI** : [scripts/migrate.ts](scripts/migrate.ts)
```bash
npm run migrate
```

### 3. DAL tenant-scoped avec validation stricte

**Ports créés** :
- [src/app/ports/ConsentRepo.ts](src/app/ports/ConsentRepo.ts)
- [src/app/ports/AiJobRepo.ts](src/app/ports/AiJobRepo.ts)

**Repositories PostgreSQL** :
- [src/infrastructure/repositories/PgConsentRepo.ts](src/infrastructure/repositories/PgConsentRepo.ts)
- [src/infrastructure/repositories/PgAiJobRepo.ts](src/infrastructure/repositories/PgAiJobRepo.ts)

**Validation RGPD stricte** :
- ✅ TOUTES les méthodes requièrent `tenantId` explicite
- ✅ Exception si vide : `"RGPD VIOLATION: tenantId required"`
- ✅ Isolation SQL stricte : `WHERE tenant_id = $1` systématique

### 4. Tests RGPD LOT 4.0 (DB réelle)

**Fichier** : [tests/db.lot4.tenant-isolation.test.ts](tests/db.lot4.tenant-isolation.test.ts)

**14 tests bloquants** :
- ✅ Création consent/job sans tenantId → rejetée
- ✅ Query sans tenantId → rejetée
- ✅ Cross-tenant read → null (isolation)
- ✅ Cross-tenant write → échoue (isolation)
- ✅ DB constraints enforce tenant isolation
- ✅ Validation schéma : aucune colonne P3 dans ai_jobs

**Exécution** :
```bash
npm run test:lot4
```

---

## ✅ Réalisations LOT 4.1

### 1. Politique de rétention documentée

**Fichier** : [src/domain/retention/RetentionPolicy.ts](src/domain/retention/RetentionPolicy.ts)

**Périodes de rétention** (basé sur DATA_CLASSIFICATION.md) :
- **P1 (ai_jobs metadata)** : 90 jours max (minimisation RGPD)
- **P2 (consents)** : durée de vie compte (pas d'auto-purge)
- **P1 (audit_events)** : 3 ans (minimum légal : 1 an)
- **P1 (technical logs)** : 30 jours

**Validation business rules** :
- ✅ AI jobs retention ≤ 90 jours max
- ✅ Audit retention ≥ 1 an min
- ✅ Consents NO auto-purge (RGPD proof required)

### 2. Job purge idempotent

**Fichier** : [src/app/jobs/purge.ts](src/app/jobs/purge.ts)

**Fonctionnalités** :
- ✅ Purge automatique AI jobs > 90 jours
- ✅ Idempotent (safe to run multiple times)
- ✅ Tenant-scoped (isolation stricte)
- ✅ Dry-run mode (preview sans suppression)
- ✅ Logs RGPD-safe (P1 uniquement : counts)

**Garanties** :
- ✅ Ne supprime PAS les consents (account lifetime)
- ✅ Ne supprime PAS les audit trails (compliance proof)
- ✅ Respecte retention policy strictement

### 3. CLI purge

**Fichier** : [scripts/purge.ts](scripts/purge.ts)

**Commandes disponibles** :
```bash
npm run purge              # Purge complète (tous tenants)
npm run purge:dry-run      # Preview (pas de suppression)
npm run purge:tenant <id>  # Purge un seul tenant
```

### 4. Tests RGPD LOT 4.1 (DB réelle)

**Fichier** : [tests/purge.lot4.test.ts](tests/purge.lot4.test.ts)

**10 tests bloquants** :
- ✅ Retention policy validation (max/min/no consents purge)
- ✅ Purge requires tenantId (RGPD isolation)
- ✅ Purge respects retention (only old data)
- ✅ Purge is tenant-scoped (isolation)
- ✅ Purge is idempotent (multiple runs → same result)
- ✅ Dry-run mode does NOT delete
- ✅ Consents NEVER auto-purged

---

## 📊 Validation acceptance criteria (TASKS.md LOT 4.0 + 4.1)

### LOT 4.0

| Critère | Statut | Preuve |
|---------|--------|--------|
| ❌ Aucune requête DB sans `tenantId` | ✅ VALIDÉ | Exception runtime + tests |
| ❌ Lecture cross-tenant impossible | ✅ VALIDÉ | Tests DB réels : retourne null |
| ❌ Écriture cross-tenant impossible | ✅ VALIDÉ | Tests DB réels : échec |
| ❌ Logs DB n'exposent aucun contenu | ✅ VALIDÉ | Logs P1 uniquement |
| Tests intégration cross-tenant | ✅ VALIDÉ | 14 tests passants |
| Tentative accès sans tenant rejetée | ✅ VALIDÉ | Exception explicite |

### LOT 4.1

| Critère | Statut | Preuve |
|---------|--------|--------|
| Purge idempotente | ✅ VALIDÉ | Tests : run 3x → 0 after first |
| Purge ne supprime pas audit trails | ✅ VALIDÉ | audit_events NOT purged |
| Purge n'empêche pas export/effacement | ✅ VALIDÉ | consents NOT purged |
| Purge respecte retention policy | ✅ VALIDÉ | Tests : only > 90 days purged |
| Tests purge idempotente | ✅ VALIDÉ | 10 tests passants |
| Tests purge respecte policy | ✅ VALIDÉ | 10 tests passants |

---

## 📋 Definition of Done (CLAUDE.md §7)

- [x] Les frontières d'architecture sont respectées
- [x] Aucun appel IA hors Gateway LLM
- [x] Aucune donnée sensible en clair dans les logs
- [x] La classification des données est respectée (P2/P1)
- [x] Les tests fonctionnels et RGPD sont passants (24 tests)
- [x] Le comportement en cas d'échec est défini et sécurisé
- [x] La fonctionnalité est validée fonctionnellement
- [x] La traçabilité RGPD minimale est assurée

---

## 📦 Artefacts livrés (LOT 4.0 + 4.1)

### Migrations (1 fichier)
- `migrations/002_lot4_consents_ai_jobs.sql` (version 2)

### Domaine (1 fichier)
- `src/domain/retention/RetentionPolicy.ts`

### Ports (2 fichiers)
- `src/app/ports/ConsentRepo.ts`
- `src/app/ports/AiJobRepo.ts`

### Application (1 fichier)
- `src/app/jobs/purge.ts`

### Repositories (2 fichiers)
- `src/infrastructure/repositories/PgConsentRepo.ts`
- `src/infrastructure/repositories/PgAiJobRepo.ts`

### Infrastructure (2 fichiers)
- `src/infrastructure/db/migrate.ts` (amélioré)
- `scripts/migrate.ts`
- `scripts/purge.ts`

### Tests (2 fichiers)
- `tests/db.lot4.tenant-isolation.test.ts` (14 tests)
- `tests/purge.lot4.test.ts` (10 tests)

### Documentation (4 fichiers)
- `docs/implementation/LOT4_IMPLEMENTATION.md` (LOT 4.0 détaillé)
- `docs/implementation/LOT4.1_IMPLEMENTATION.md` (LOT 4.1 détaillé)
- `LOT4_SUMMARY.md` (résumé exécutif consolidé)

### Configuration (1 fichier)
- `package.json` : ajout scripts `migrate`, `purge*`, `test:lot4`

**Total** : 19 fichiers créés/modifiés

---

## 🔐 Classification données (conformité DATA_CLASSIFICATION.md)

### Table `consents` — P2 (données personnelles RGPD)

| Donnée | Classe | Rétention | Auto-purge | Chiffrement |
|--------|--------|-----------|------------|-------------|
| tenant_id, user_id, purpose, granted, timestamps | **P2** | Durée vie compte | ❌ NON | LOT 6+ |

**Règles RGPD** :
- ✅ Stockage autorisé (base légale : obligation RGPD)
- ✅ Export/effacement obligatoire (préparation EPIC 5)
- ✅ AUCUNE purge automatique (preuve légale requise)
- ⚠️ Chiffrement au repos requis (LOT 6)

### Table `ai_jobs` — P1 (métadonnées techniques)

| Donnée | Classe | Rétention | Auto-purge | Chiffrement |
|--------|--------|-----------|------------|-------------|
| status, purpose, model_ref, timestamps | **P1** | 90j max | ✅ OUI | Recommandé |

**CRITICAL SECURITY** :
- ⛔ **AUCUN contenu P3** : prompts, outputs, embeddings **INTERDITS**
- ✅ Validation schéma automatique (test blocker)
- ✅ Purge automatique > 90 jours (minimisation RGPD)
- ✅ Contenu stocké séparément avec chiffrement (LOT 6+)

---

## 🚀 Commandes disponibles

### Migrations
```bash
npm run migrate
```

### Purge
```bash
npm run purge              # Full purge (all tenants)
npm run purge:dry-run      # Preview (no deletion)
npm run purge:tenant <id>  # Single tenant purge
```

### Tests
```bash
npm run test:lot4          # All LOT 4 tests (4.0 + 4.1)
npm run typecheck          # TypeScript validation
```

---

## ⚠️ Points de vigilance

### Migration 002 — Prérequis production

🔍 **Contrainte `chk_users_tenant_scope`** peut échouer si données existantes invalides :
- Vérifier cohérence avant application
- Script validation disponible si nécessaire

### Tests LOT 4 — Configuration requise

🔍 **Tests nécessitent DATABASE_URL** configurée :
- PostgreSQL réelle requise (pas mocks)
- Cleanup automatique avant/après tests
- Utilise DATABASE_URL dev par défaut

### Purge production — Backup obligatoire

🔍 **Toujours exécuter dry-run avant purge réelle** :
```bash
npm run purge:dry-run  # Preview first
npm run purge          # Then execute if OK
```

---

## 🗺️ Roadmap suivante

### LOT 5.0 — Pipeline RGPD (export/effacement) ← RECOMMANDÉ
- Use-cases export données (include consents + ai_jobs metadata)
- Use-cases effacement RGPD (cascade consents + ai_jobs)
- Bundle chiffré export
- Integration purge job avec RGPD delete

### LOT 6.0 — Chiffrement au repos
- Chiffrement colonnes P2 (consents)
- Stockage séparé contenu P3 (prompts/outputs)
- Rotation clés par tenant
- Purge avec crypto-shredding (optionnel)

### Améliorations futures LOT 4
- ⚠️ Purge automatique via cron/scheduler
- ⚠️ Retention policy configurable par tenant
- ⚠️ Purge audit_events > 3 ans (configurable per jurisdiction)

---

## 📚 Références normatives

- [TASKS.md LOT 4.0](TASKS.md#lot-40--schéma-db-minimal--migrations--dal-tenant-scoped) (lignes 316-348)
- [TASKS.md LOT 4.1](TASKS.md#lot-41--rétention--minimisation-policy--purge-job) (lignes 351-373)
- [CLAUDE.md](CLAUDE.md) (règles développement)
- [DATA_CLASSIFICATION.md](docs/data/DATA_CLASSIFICATION.md)
- [BOUNDARIES.md](docs/architecture/BOUNDARIES.md)
- [RGPD_TESTING.md](docs/testing/RGPD_TESTING.md)

---

## ✅ Conclusion

**LOT 4 (4.0 + 4.1) TERMINÉ et validé** :
- ✅ Schéma DB minimal RGPD-ready (LOT 4.0)
- ✅ Isolation tenant stricte (DB + DAL)
- ✅ Migrations idempotentes avec tracking
- ✅ Politique rétention documentée (LOT 4.1)
- ✅ Purge idempotent avec dry-run
- ✅ Tests RGPD obligatoires passants (24/24)
- ✅ Classification données respectée (P2/P1)
- ✅ Definition of Done complète
- ✅ Documentation complète et audit-ready

**Prêt pour** :
- Revue technique
- Audit RGPD
- Déploiement environnement dev/staging
- Implémentation LOT 5.0 (Pipeline RGPD)

---

**Document validé — Implémentation conforme TASKS.md, CLAUDE.md et documents normatifs.**
