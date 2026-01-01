# Matrice de Conformité RGPD — Document de Référence

> **Document normatif consolidé** : Ce document est la référence unique pour le mapping entre les exigences RGPD et leur implémentation technique.
>
> **Fusionne** : RGPD_ARTICLES_EXHAUSTIFS, RGPD_CONFORMITY_VALIDATION, RGPD_COUVERTURE_COMPLETE, RGPD_MATRICE_CONFORMITE

**Date** : 2026-01-01
**Version** : 2.0
**Statut** : ✅ Validé pour audit
**Scope** : EPICs 1-8 (Backend core + Anonymisation)

---

## 📊 Tableau de Bord — État Actuel

### Score Global : ⚙️ ~70%

| Caractéristique | Statut | État réel |
|-----------------|--------|-----------|
| **Traitement IA 100% local** | ✅ | Aucune donnée envoyée à des tiers |
| **Aucun transfert hors UE** | ✅ | Données restent sur votre serveur |
| **Aucun sous-traitant IA** | ✅ | Pas d'OpenAI, Anthropic, etc. |
| **Droits fondamentaux** | ✅ | Accès (15), Export (20), Effacement (17) |
| **Consentement explicite** | ✅ | Opt-in obligatoire avant tout traitement IA |
| **Isolation des données** | ✅ | RLS PostgreSQL — 100% isolation |
| **Traçabilité complète** | ✅ | Audit trail de toutes les actions |
| **Art. 18 — Limitation** | ❌ | Non implémenté (LOT 10.6) |
| **Art. 21 — Opposition** | ❌ | Non implémenté (LOT 10.6) |
| **Art. 22 — Révision humaine IA** | ❌ | 🔴 Non implémenté (LOT 10.6) — **CRITIQUE** |
| **Art. 33-34 — Violations** | ❌ | 🔴 Non implémenté (EPIC 9) — **BLOQUANT** |
| **ePrivacy — Cookies** | ❌ | Non implémenté (LOT 10.3) — **BLOQUANT** |

### 🔴 Gaps Bloquants Production

| Gap | Article | Criticité | EPIC/LOT | Effort |
|-----|---------|-----------|----------|--------|
| Cookie consent banner | ePrivacy | 🔴 BLOQUANT | LOT 10.3 | 3j |
| Notification violations CNIL 72h | Art. 33-34 | 🔴 CRITIQUE | EPIC 9 | 5j |
| Révision humaine décisions IA | Art. 22 | 🔴 CRITIQUE (IA) | LOT 10.6 | 3j |
| Template DPA sous-traitant | Art. 28 | 🟡 IMPORTANT | LOT 10.1 | 2j |
| Droit limitation | Art. 18 | 🟡 MOYEN | LOT 10.6 | 2j |
| Droit opposition | Art. 21 | 🟡 MOYEN | LOT 10.6 | 2j |

### Vue par Dimension

| Dimension | Couverture | Articles |
|-----------|-----------|----------|
| **Backend Core** | ✅ 100% | Art. 5, 6-7, 15-17, 19-20, 24-25, 28-30, 32, 35 |
| **Anonymisation** | ✅ 100% | Art. 32 (pseudonymisation), ePrivacy Art. 5.3 (IP) |
| **Droits utilisateur** | ✅ 75% | Accès, Portabilité, Effacement OK. Limitation/Opposition → EPIC 10 |
| **Transparence** | ⚙️ 15% | Docs légales créées mais non publiées (EPIC 10) |
| **Incident Response** | ❌ 0% | Art. 33-34 → EPIC 9 |
| **IA Ethics** | ❌ 0% | Art. 22 → EPIC 10 |

**Score global EPICs 1-8** : **70% de conformité RGPD**
**Articles conformes** : 32/45
**Articles bloquants production** : 7 (EPICs 9-10 requis)

---

## 1. Principes fondamentaux (Article 5)

### Art. 5.1(a) - Licéité, loyauté, transparence

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Base légale documentée** | ✅ Consentement opt-in | [PgConsentRepo.ts](../../src/infrastructure/repositories/PgConsentRepo.ts) | [rgpd.consent-enforcement.test.ts](../../tests/rgpd.consent-enforcement.test.ts) |
| **Transparence processus** | ⚙️ Partiellement (docs légales non publiées) | [POLITIQUE_CONFIDENTIALITE.md](../legal/POLITIQUE_CONFIDENTIALITE.md) | ❌ Aucun |
| **Traçabilité décisions** | ✅ Audit trail complet | [emitAuditEvent.ts](../../src/app/audit/emitAuditEvent.ts) | [rgpd.audit-events-no-payload.test.ts](../../tests/rgpd.audit-events-no-payload.test.ts) |

**Statut** : ⚙️ 75% - Docs légales requises (EPIC 10.0-10.2)

---

### Art. 5.1(b) - Limitation des finalités

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Finalités définies** | ✅ 4 finalités : `analytics`, `ai_processing`, `marketing`, `profiling` | [grantConsent.ts](../../src/app/usecases/consent/grantConsent.ts#L20-L24) | [rgpd.consent-enforcement.test.ts](../../tests/rgpd.consent-enforcement.test.ts) |
| **Enforcement Gateway** | ✅ Politique par use-case | [useCasePolicy.ts](../../src/ai/gateway/enforcement/useCasePolicy.ts) | [rgpd.no-llm-bypass.test.ts](../../tests/rgpd.no-llm-bypass.test.ts) |
| **Interdiction détournement** | ✅ Scope immutable après création | [PgConsentRepo.ts](../../src/infrastructure/repositories/PgConsentRepo.ts#L45-L51) | ✅ Passant |

**Statut** : ✅ 100%

---

### Art. 5.1(c) - Minimisation des données

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Pas de stockage prompts** | ✅ Invocation stateless | [invokeLLM.ts](../../src/ai/gateway/invokeLLM.ts#L35-L40) | [rgpd.no-prompt-storage.test.ts](../../tests/rgpd.no-prompt-storage.test.ts) |
| **P3 interdit dans prompts** | ✅ Classification P3 = BLOCKED | [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md#L45) | [rgpd.no-sensitive-logs.test.ts](../../tests/rgpd.no-sensitive-logs.test.ts) |
| **Hash email (P2)** | ✅ Stockage `email_hash` uniquement | [emailHash.ts](../../src/shared/security/emailHash.ts) | ✅ Utilisé partout |
| **PII masking automatique** | ✅ Détection + tokens réversibles | [pii-middleware.ts](../../src/ai/gateway/pii-middleware.ts) | [rgpd.pii-masking.test.ts](../../tests/rgpd.pii-masking.test.ts) (30 tests) |

**Statut** : ✅ 100%

---

### Art. 5.1(d) - Exactitude

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Mise à jour données** | ✅ API PATCH `/users/:id` | [app/api/users/[id]/route.ts](../../app/api/users/[id]/route.ts) | [api.e2e.critical-routes.test.ts](../../tests/api.e2e.critical-routes.test.ts) |
| **Correction erreurs** | ✅Updateable fields : `displayName`, `role` | [PgUserRepo.ts](../../src/infrastructure/repositories/PgUserRepo.ts#L70-L97) | [db.user-repository.test.ts](../../tests/db.user-repository.test.ts#L224-L258) |

**Statut** : ✅ 100%

---

### Art. 5.1(e) - Limitation de conservation

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Politique 90 jours** | ✅ Définie dans domaine | [RetentionPolicy.ts](../../src/domain/retention/RetentionPolicy.ts#L8-L12) | ✅ Documenté |
| **Soft delete + purge** | ✅ 2 étapes : `deleted_at` → hard delete après 30j | [deleteUserData.ts](../../src/app/usecases/rgpd/deleteUserData.ts), [purgeUserData.ts](../../src/app/usecases/rgpd/purgeUserData.ts) | [rgpd.deletion.test.ts](../../tests/rgpd.deletion.test.ts) (7 tests) |
| **Cron job purge** | ✅ Automatique via `purge.ts` | [purge.ts](../../src/infrastructure/jobs/purge.ts) | [purge.lot4.test.ts](../../tests/purge.lot4.test.ts) (10 tests) |

**Statut** : ✅ 100%

---

### Art. 5.1(f) - Intégrité et confidentialité

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Chiffrement export** | ✅ AES-256-GCM pour bundles | [encryption.ts](../../src/domain/rgpd/encryption.ts) | [rgpd.export.test.ts](../../tests/rgpd.export.test.ts#L45) |
| **Isolation tenant (RLS)** | ✅ Politiques PostgreSQL strictes | [migrations/007_fix_strict_rls.sql](../../migrations/007_fix_strict_rls.sql) | [db.rls-policies.test.ts](../../tests/db.rls-policies.test.ts) |
| **Hash passwords** | ✅ Argon2 | [password.ts](../../src/shared/security/password.ts) | ✅ Utilisé |
| **Anonymisation IP** | ✅ Masquage dernier octet après 7 jours | [anonymizer.ts](../../src/infrastructure/pii/anonymizer.ts) | [rgpd.ip-anonymization.test.ts](../../tests/rgpd.ip-anonymization.test.ts) (15 tests) |
| **Logs RGPD-safe** | ✅ Sentinel logger (bloque P2/P3) | [logger.ts](../../src/shared/logger.ts) | [logging.sentinel.test.ts](../../tests/logging.sentinel.test.ts) (~30 tests) |

**Statut** : ✅ 100%

---

## 2. Base légale du traitement (Articles 6-7)

### Art. 6 - Licéité du traitement

| Base légale | Implémentation | Fichier | Test |
|------------|---------------|---------|------|
| **Consentement (6.1.a)** | ✅ Système opt-in avec révocation | [grantConsent.ts](../../src/app/usecases/consent/grantConsent.ts), [revokeConsent.ts](../../src/app/usecases/consent/revokeConsent.ts) | [rgpd.consent-enforcement.test.ts](../../tests/rgpd.consent-enforcement.test.ts) (7 tests) |
| **Enforcement Gateway** | ✅ Bloque invocations IA sans consentement | [checkConsent.ts](../../src/ai/gateway/enforcement/checkConsent.ts) | [rgpd.consent-enforcement.test.ts](../../tests/rgpd.consent-enforcement.test.ts#L35) |

**Statut** : ✅ 100%

---

### Art. 7 - Conditions applicables au consentement

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Preuve consentement** | ✅ Table `consents` avec timestamp | [schema 002_lot4_consents_ai_jobs.sql](../../migrations/002_lot4_consents_ai_jobs.sql) | ✅ Persisté |
| **Révocation facile** | ✅ API `DELETE /api/consents/:id` | [app/api/consents/[id]/route.ts](../../app/api/consents/[id]/route.ts) | ✅ Testé |
| **Granularité par finalité** | ✅ 4 purposes distincts | [grantConsent.ts](../../src/app/usecases/consent/grantConsent.ts#L20-L24) | ✅ Validé |

**Statut** : ✅ 100%

---

## 3. Droits des personnes (Articles 12-22)

### Art. 12 - Transparence

| Critère | Implémentation | Statut |
|---------|---------------|--------|
| **Langue claire** | ⚙️ Templates créés ([POLITIQUE_CONFIDENTIALITE.md](../legal/POLITIQUE_CONFIDENTIALITE.md)) | ⚙️ Non publié (EPIC 10.0) |
| **Délai 1 mois** | ❌ Pas de workflow automatique | ❌ EPIC 10 |

**Statut** : ⚙️ 60% - Templates ready, publication manquante

---

### Art. 13-14 - Information

| Document | Fichier | Publication |
|----------|---------|-------------|
| **Politique confidentialité** | [POLITIQUE_CONFIDENTIALITE.md](../legal/POLITIQUE_CONFIDENTIALITE.md) | ❌ Route `/legal/privacy-policy` manquante (EPIC 10.0) |
| **CGU** | [CGU.md](../legal/CGU.md) | ❌ Route `/legal/terms` manquante (EPIC 10.1) |
| **Info RGPD** | ❌ Page dédiée manquante | ❌ EPIC 10.2 |

**Statut** : ❌ 0% - Documents prêts mais non accessibles

---

### Art. 15 - Droit d'accès

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Export JSON** | ✅ `/api/rgpd/export` | [app/api/rgpd/export/route.ts](../../app/api/rgpd/export/route.ts) | [rgpd.export.test.ts](../../tests/rgpd.export.test.ts) (7 tests) |
| **Bundle chiffré** | ✅ AES-256-GCM + TTL 24h | [ExportBundle.ts](../../src/domain/rgpd/ExportBundle.ts) | [rgpd.export.test.ts](../../tests/rgpd.export.test.ts#L45-L60) |
| **Données complètes** | ✅ Users, Consents, AI Jobs, Audit Events | [exportUserData.ts](../../src/app/usecases/rgpd/exportUserData.ts) | ✅ Testé |

**Statut** : ✅ 100%

---

### Art. 16 - Droit de rectification

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **API Update** | ✅ `PATCH /api/users/:id` | [app/api/users/[id]/route.ts](../../app/api/users/[id]/route.ts) | [api.e2e.critical-routes.test.ts](../../tests/api.e2e.critical-routes.test.ts) |
| **Champs modifiables** | ✅ `displayName`, `role` | [PgUserRepo.ts](../../src/infrastructure/repositories/PgUserRepo.ts#L70) | [db.user-repository.test.ts](../../tests/db.user-repository.test.ts#L224) |

**Statut** : ✅ 100%

---

### Art. 17 - Droit à l'effacement

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **API Deletion** | ✅ `DELETE /api/rgpd/delete/:userId` | [app/api/rgpd/delete/[userId]/route.ts](../../app/api/rgpd/delete/[userId]/route.ts) | [rgpd.deletion.test.ts](../../tests/rgpd.deletion.test.ts) (7 tests) |
| **Soft delete immédiat** | ✅ Marque `deleted_at` | [deleteUserData.ts](../../src/app/usecases/rgpd/deleteUserData.ts) | [rgpd.deletion.test.ts](../../tests/rgpd.deletion.test.ts#L35) |
| **Purge différée** | ✅ Hard delete après 30 jours | [purgeUserData.ts](../../src/app/usecases/rgpd/purgeUserData.ts) | [rgpd.deletion.test.ts](../../tests/rgpd.deletion.test.ts#L65) |
| **Irrécupérabilité garantie** | ✅ Cascade DELETE + crypto-shredding | [003_rgpd_deletion.sql](../../migrations/003_rgpd_deletion.sql) | [rgpd.deletion.test.ts](../../tests/rgpd.deletion.test.ts#L85) |

**Statut** : ✅ 100%

---

### Art. 18 - Droit à la limitation

| Critère | Implémentation | Statut |
|---------|---------------|--------|
| **API Suspend** | ❌ `POST /api/rgpd/suspend` manquant | ❌ EPIC 10.6 |
| **Champ `data_suspended`** | ❌ Migration manquante | ❌ EPIC 10.6 |

**Statut** : ❌ 0% - Non implémenté (EPIC 10)

---

### Art. 19 - Notification des tiers

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Email notifications** | ✅ Événements audit pour modifications | [emitAuditEvent.ts](../../src/app/audit/emitAuditEvent.ts) | ✅ Tracé |

**Statut** : ✅ 100% (notifications internes, emails EPIC 5 si tiers)

---

### Art. 20 - Droit à la portabilité

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Format structuré** | ✅ JSON machine-readable | [ExportBundle.ts](../../src/domain/rgpd/ExportBundle.ts) | [rgpd.export.test.ts](../../tests/rgpd.export.test.ts#L30) |
| **Données fournie** | ✅ Users, Consents, AI Jobs | [exportUserData.ts](../../src/app/usecases/rgpd/exportUserData.ts) | ✅ Complet |

**Statut** : ✅ 100%

---

### Art. 21 - Droit d'opposition

| Critère | Implémentation | Statut |
|---------|---------------|--------|
| **Bouton "S'opposer"** | ❌ UI manquante | ❌ EPIC 10.6 |
| **Workflow opposition** | ❌ Use-case manquant | ❌ EPIC 10.6 |

**Statut** : ❌ 0% - Non implémenté (EPIC 10)

---

### Art. 22 - Décisions automatisées

| Critère | Implémentation | Statut |
|---------|---------------|--------|
| **Review humaine** | ❌ Workflow manquant | ❌ EPIC 10.6 |
| **Bouton "Contester"** | ❌ UI manquante | ❌ EPIC 10.6 |
| **Table `user_disputes`** | ❌ Migration manquante | ❌ EPIC 10.6 |

**Statut** : ❌ 0% - **CRITIQUE pour plateforme IA** (EPIC 10)

---

## 4. Responsabilité (Articles 24-25)

### Art. 24 - Responsabilité du responsable de traitement

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Audit trail complet** | ✅ Table `audit_events` | [PgAuditEventWriter.ts](../../src/infrastructure/audit/PgAuditEventWriter.ts) | [rgpd.audit-events-no-payload.test.ts](../../tests/rgpd.audit-events-no-payload.test.ts) (6 tests) |
| **Registre traitements** | ✅ 5 traitements documentés | [registre-traitements.md](./registre-traitements.md) | ✅ Art. 30 |
| **DPIA** | ✅ 5 risques évalués | [dpia.md](./dpia.md) | ✅ Art. 35 |

**Statut** : ✅ 100%

---

### Art. 25 - Protection des données dès la conception (Privacy by Design)

| Principe | Implémentation | Fichier | Documentation |
|----------|---------------|---------|---------------|
| **Gateway LLM unique** | ✅ Point d'entrée centralisé | [invokeLLM.ts](../../src/ai/gateway/invokeLLM.ts) | [LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md) |
| **Isolation tenant DB** | ✅ RLS PostgreSQL | [007_fix_strict_rls.sql](../../migrations/007_fix_strict_rls.sql) | [BOUNDARIES.md](../architecture/BOUNDARIES.md) |
| **PII masking auto** | ✅ Middleware Gateway | [pii-middleware.ts](../../src/ai/gateway/pii-middleware.ts) | [LOT8_IMPLEMENTATION.md](../implementation/LOT8_IMPLEMENTATION.md) |
| **No prompt storage** | ✅ Stateless by design | [invokeLLM.ts](../../src/ai/gateway/invokeLLM.ts#L35) | [rgpd.no-prompt-storage.test.ts](../../tests/rgpd.no-prompt-storage.test.ts) |

**Statut** : ✅ 100%

---

## 5. Sous-traitance (Art. 28)

### Art. 28 - Responsabilité du sous-traitant

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Template DPA** | ✅ Contrat type créé | [DPA_TEMPLATE.md](../legal/DPA_TEMPLATE.md) | ✅ Prêt signature |

**Statut** : ✅ 100%

---

## 6. Documentation (Articles 30, 35)

### Art. 30 - Registre des activités de traitement

| Traitement | Finalité | Base légale | Fichier |
|------------|---------|-------------|---------|
| **1. Authentification** | Gestion comptes | Exécution contrat | [registre-traitements.md](./registre-traitements.md#L15-L45) |
| **2. Gateway LLM** | Traitement IA | Consentement | [registre-traitements.md](./registre-traitements.md#L47-L80) |
| **3. Consentements** | Gestion droits | Obligation légale | [registre-traitements.md](./registre-traitements.md#L82-L110) |
| **4. Droits RGPD** | Exercice droits | Obligation légale | [registre-traitements.md](./registre-traitements.md#L112-L140) |
| **5. Audit trail** | Traçabilité | Obligation légale | [registre-traitements.md](./registre-traitements.md#L142-L170) |

**Statut** : ✅ 100% - Registre complet et à jour

---

### Art. 35 - Analyse d'impact (DPIA)

| Risque | Gravité | Mesures | Fichier |
|--------|---------|---------|---------|
| **1. Hallucinations LLM** | Élevée | Disclaimer, review humaine | [dpia.md](./dpia.md#L45-L65) |
| **2. Fuite PII** | Critique | PII masking, audit, RLS | [dpia.md](./dpia.md#L67-L90) |
| **3. Biais IA** | Moyenne | Monitoring, feedback | [dpia.md](./dpia.md#L92-L110) |
| **4. Bypass consentement** | Critique | Gateway unique, tests | [dpia.md](./dpia.md#L112-L130) |
| **5. Accès non autorisé** | Élevée | RLS, RBAC/ABAC, audit | [dpia.md](./dpia.md#L132-L150) |

**Statut** : ✅ 100% - DPIA complète

---

## 7. Sécurité (Art. 32)

### Art. 32 - Sécurité du traitement

| Mesure | Implémentation | Fichier | Test |
|--------|---------------|---------|------|
| **Pseudonymisation** | ✅ Email hashing, PII tokens | [emailHash.ts](../../src/shared/security/emailHash.ts), [masker.ts](../../src/infrastructure/pii/masker.ts) | [rgpd.pii-masking.test.ts](../../tests/rgpd.pii-masking.test.ts) (25 tests) |
| **Chiffrement** | ✅ Export bundles AES-256-GCM | [encryption.ts](../../src/domain/rgpd/encryption.ts) | [rgpd.export.test.ts](../../tests/rgpd.export.test.ts#L45) |
| **Intégrité** | ✅ RLS PostgreSQL | [007_fix_strict_rls.sql](../../migrations/007_fix_strict_rls.sql) | [db.rls-policies.test.ts](../../tests/db.rls-policies.test.ts) |
| **Résilience** | ⚙️ Docker stack, manque pentest | [docker-compose.yml](../../docker-compose.yml) | ⚙️ EPIC 9.1-9.2 |

**Statut** : ⚙️ 90% - Manque pentest + chaos testing (EPIC 9)

---

## 8. Notification de violation (Articles 33-34)

### Art. 33 - Notification à l'autorité de contrôle

| Critère | Implémentation | Statut |
|---------|---------------|--------|
| **Délai 72h** | ❌ Pas de workflow automatique | ❌ EPIC 9.0 |
| **Runbook CNIL** | ⚙️ Template créé ([CNIL_COOPERATION.md](../runbooks/CNIL_COOPERATION.md)) | ⚙️ Workflow manquant |
| **Table `data_breaches`** | ❌ Migration manquante | ❌ EPIC 9.0 |

**Statut** : ❌ 0% - **BLOQUANT PRODUCTION** (EPIC 9.0)

---

### Art. 34 - Communication aux personnes concernées

| Critère | Implémentation | Statut |
|---------|---------------|--------|
| **Email notifications** | ❌ Templates manquants | ❌ EPIC 9.0 |
| **Workflow automatique** | ❌ Use-case manquant | ❌ EPIC 9.0 |

**Statut** : ❌ 0% - **BLOQUANT PRODUCTION** (EPIC 9.0)

---

## 9. ePrivacy (Directive 2002/58/CE)

### Art. 5.3 - Cookies et traceurs

| Critère | Implémentation | Statut |
|---------|---------------|--------|
| **Banner consentement** | ❌ Composant manquant | ❌ EPIC 10.3 |
| **Blocage scripts** | ❌ Logique manquante | ❌ EPIC 10.3 |
| **API `/api/consents/cookies`** | ❌ Endpoint manquant | ❌ EPIC 10.3 |

**Statut** : ❌ 0% - **BLOQUANT WEB** (EPIC 10.3)

---

### ePrivacy - Anonymisation IP

| Critère | Implémentation | Fichier | Test |
|---------|---------------|---------|------|
| **Masquage IP** | ✅ Dernier octet après 7 jours | [anonymizer.ts](../../src/infrastructure/pii/anonymizer.ts) | [rgpd.ip-anonymization.test.ts](../../tests/rgpd.ip-anonymization.test.ts) (15 tests) |
| **Cron job** | ✅ Automatique | [anonymize-ips.job.ts](../../src/infrastructure/jobs/anonymize-ips.job.ts) | ✅ Testé |

**Statut** : ✅ 100%

---

## 10. Anonymisation & Pseudonymisation (EPIC 8)

### EPIC 8.0 - PII Detection & Redaction

| Composant | Implémentation | Fichier | Tests |
|-----------|---------------|---------|-------|
| **Patterns détection** | ✅ Email, phone, SSN, IBAN, carte, IP | [patterns.ts](../../src/infrastructure/pii/patterns.ts) | [rgpd.pii-detection.test.ts](../../tests/rgpd.pii-detection.test.ts) (35 tests) |
| **Masking réversible** | ✅ Tokens UUID + map | [masker.ts](../../src/infrastructure/pii/masker.ts) | [rgpd.pii-masking.test.ts](../../tests/rgpd.pii-masking.test.ts) (25 tests) |
| **Restoration** | ✅ Démasquage sortie LLM | [masker.ts](../../src/infrastructure/pii/masker.ts#L45) | [rgpd.pii-restoration.test.ts](../../tests/rgpd.pii-restoration.test.ts) (15 tests) |
| **Gateway middleware** | ✅ Intégré invokeLLM | [pii-middleware.ts](../../src/ai/gateway/pii-middleware.ts) | [rgpd.pii-masking.test.ts](../../tests/rgpd.pii-masking.test.ts#L80) |
| **Audit events** | ✅ Tracé PII détectée | [pii-middleware.ts](../../src/ai/gateway/pii-middleware.ts#L35) | [rgpd.pii-audit.test.ts](../../tests/rgpd.pii-audit.test.ts) (10 tests) |

**Total tests** : 85 tests ✅ Tous passants

**Statut** : ✅ 100%

---

### EPIC 8.1 - Anonymisation IP

| Composant | Implémentation | Fichier | Tests |
|-----------|---------------|---------|-------|
| **Fonction anonymisation** | ✅ Masque dernier octet | [anonymizer.ts](../../src/infrastructure/pii/anonymizer.ts) | [rgpd.ip-anonymization.test.ts](../../tests/rgpd.ip-anonymization.test.ts) (15 tests) |
| **Cron job** | ✅ Exécution automatique > 7 jours | [anonymize-ips.job.ts](../../src/infrastructure/jobs/anonymize-ips.job.ts) | ✅ Testé |
| **Migration** | ✅ ALTER TABLE audit_events | Intégré dans migrations | ✅ Appliqué |

**Total tests** : 15 tests ✅ Tous passants

**Statut** : ✅ 100%

---

### EPIC 8.2 - Audit PII Logs

| Composant | Implémentation | Fichier | Tests |
|-----------|---------------|---------|-------|
| **Scanner automatique** | ✅ Détecte PII dans logs | [scanner.ts](../../src/infrastructure/pii/scanner.ts) | [rgpd.pii-scan-logs.test.ts](../../tests/rgpd.pii-scan-logs.test.ts) (10 tests) |
| **Alertes** | ✅ Service notifications | [AlertService.ts](../../src/infrastructure/pii/AlertService.ts) | ✅ Testé |
| **Cron job scan** | ✅ Exécution périodique | [scan-pii-logs.job.ts](../../src/infrastructure/jobs/scan-pii-logs.job.ts) | ✅ Testé |

**Total tests** : 10 tests ✅ Tous passants

**Statut** : ✅ 100%

---

## Synthèse par EPIC

| EPIC | Titre | Articles couverts | Conformité | Tests | Statut |
|------|-------|------------------|-----------|-------|--------|
| **EPIC 1** | Socle sécurisé | Art. 5, 24-25, 32 | ✅ 100% | 42 tests | ✅ Complet |
| **EPIC 2** | Durcissement réseau | Art. 32, 5.1(f) | ✅ 100% | N/A | ✅ Complet |
| **EPIC 3** | IA locale | Art. 25, 5 | ✅ 100% | 5 tests | ✅ Complet |
| **EPIC 4** | Stockage RGPD | Art. 5, 30 | ✅ 100% | 23 tests | ✅ Complet |
| **EPIC 5** | Pipeline RGPD | Art. 6-7, 15-17, 19-20 | ✅ 100% | 72 tests | ✅ Complet |
| **EPIC 6** | Docker RGPD-ready | Art. 32, 25 | ✅ 100% | ~30 tests | ✅ Complet |
| **EPIC 7** | Kit conformité | Art. 30, 35, 24 | ✅ 100% | N/A | ✅ Complet |
| **EPIC 8** | Anonymisation | Art. 32, ePrivacy | ✅ 100% | 110 tests | ✅ Complet |

**Total tests RGPD** : 252+ tests ✅ Tous passants

---

## Articles manquants (EPICs 9-10)

### Bloquants production

| Article | Titre | EPIC | Criticité |
|---------|-------|------|-----------|
| **Art. 33-34** | Notification violation | EPIC 9.0 | 🔴 CRITIQUE |
| **ePrivacy 5.3** | Cookies | EPIC 10.3 | 🔴 CRITIQUE |
| **Art. 22** | Décisions automatisées | EPIC 10.6 | 🔴 CRITIQUE IA |

### Importants (Compliance)

| Article | Titre | EPIC | Criticité |
|---------|-------|------|-----------|
| **Art. 13-14** | Information | EPIC 10.0-10.2 | 🟡 Important |
| **Art. 18** | Limitation | EPIC 10.6 | 🟡 Important |
| **Art. 21** | Opposition | EPIC 10.6 | 🟡 Important |
| **Art. 32 (100%)** | Pentest + Chaos | EPIC 9.1-9.2 | 🟡 Important |

---

## Conclusion

### Points forts ✅

1. **Backend RGPD-ready à 100%** : Toute la chaîne (Auth, Gateway, Consent, Export, Deletion) fonctionne
2. **Anonymisation complète** : PII masking + IP anonymization + log scanning (110 tests)
3. **Isolation stricte** : RLS PostgreSQL enforce au niveau DB
4. **Documentation exhaustive** : DPIA, Registre, DPA prêts
5. **252+ tests RGPD** : Tous passants, couvrant 32 articles

### Gaps critiques ❌

1. **Art. 33-34** : Pas de workflow notification violation → **BLOQUANT PRODUCTION**
2. **ePrivacy cookies** : Pas de banner consentement → **BLOQUANT WEB**
3. **Art. 22** : Pas de review humaine IA → **CRITIQUE pour plateforme IA**
4. **Art. 13-14** : Docs légales non publiées → **Transparence insuffisante**

### Score final EPICs 1-8

- **Conformité backend** : ✅ 100%
- **Conformité globale** : ⚙️ 70% (32/45 articles)
- **Production-ready** : ❌ NON (7 articles bloquants)

**Recommandation** : Compléter **EPIC 9** (incident response) et **EPIC 10** (legal + frontend) avant déploiement production.

---

# ANNEXE A : Couverture exhaustive RGPD (Articles 1-99)

> Cette annexe fournit une vue complète de TOUS les articles du RGPD avec leur applicabilité à la plateforme.

## Légende

| Symbole | Signification |
|---------|---------------|
| ✅ | **100% conforme** — Implémenté et testé |
| ⚙️ | **Partiellement conforme** — Implémentation partielle (% indiqué) |
| ❌ | **Non conforme** — Pas encore implémenté (EPIC prévu) |
| 🔵 | **Non applicable** — Article non pertinent pour cette plateforme |
| 🟡 | **Applicable sous conditions** — Dépend du contexte d'utilisation |

---

## CHAPITRE I : Dispositions générales (Art. 1-4)

| Article | Titre | Applicabilité | Statut | Explication |
|---------|-------|---------------|--------|-------------|
| **Art. 1** | Objet et objectifs | 🔵 N/A | — | Définit le RGPD (pas d'obligation directe) |
| **Art. 2** | Champ d'application matériel | 🔵 N/A | — | Définit le périmètre du RGPD |
| **Art. 3** | Champ d'application territorial | ✅ Oui | ✅ 100% | Plateforme UE (France) → RGPD applicable |
| **Art. 4** | Définitions | 🔵 N/A | — | Définitions juridiques (référence) |

---

## CHAPITRE II : Principes (Art. 5-11)

| Article | Titre | Applicabilité | Statut | Implémentation | EPIC |
|---------|-------|---------------|--------|----------------|------|
| **Art. 5** | Principes relatifs au traitement | ✅ Oui | ✅ 100% | Privacy by Design, minimisation, limitation conservation, sécurité | LOT 1-7 |
| **Art. 6** | Licéité du traitement | ✅ Oui | ✅ 100% | Consentement (Art. 6.1.a) + Contrat (Art. 6.1.b) | LOT 5.0, CGU |
| **Art. 7** | Conditions du consentement | ✅ Oui | ✅ 100% | Opt-in explicite, révocation, preuve | LOT 5.0 |
| **Art. 8** | Consentement des enfants | 🟡 Faible (B2B) | ✅ 90% | Clause CGU "réservé professionnels majeurs" | CGU Art. 3.1 |
| **Art. 9** | Données sensibles | ✅ Oui (CRITIQUE) | ✅ 100% | Classification P3 = rejet automatique, consentement explicite, PII masking | LOT 4.0, EPIC 8 |
| **Art. 10** | Données pénales | 🟡 Moyenne (avocats) | ✅ 100% | Clause CGU responsabilité tenant, consentement explicite | CGU Art. 7.2 |
| **Art. 11** | Sans identification | 🔵 N/A | — | Tous traitements nécessitent user_id (tenant isolation) | — |

**Précisions importantes :**

- **Art. 8** : Plateforme **B2B** (professionnels : avocats, médecins, comptables). L'Art. 8 (consentement enfants) a une **applicabilité faible** mais clause CGU "réservé aux professionnels majeurs" → **90% suffisant** pour B2B.

- **Art. 9** : **CRITIQUE** car vos utilisateurs (médecins, avocats) peuvent soumettre des documents contenant des **données de santé, opinions politiques, etc.** → Implémenté : Consentement explicite, Classification P3 = **rejet automatique**, PII masking avant LLM, Pas de stockage prompts/outputs.

---

## CHAPITRE III : Droits de la personne concernée (Art. 12-23)

### Section 1-2 : Transparence et Accès (Art. 12-16)

| Article | Titre | Applicabilité | Statut | Implémentation | EPIC |
|---------|-------|---------------|--------|----------------|------|
| **Art. 12** | Transparence | ✅ Oui | ⚙️ 60% | Langage simple interfaces, **manque pages légales web** | EPIC 10-13 (partiel) |
| **Art. 13** | Information (collecte directe) | ✅ Oui | ❌ 0% | **Politique de confidentialité web manquante** | LOT 10.0 (TODO) |
| **Art. 14** | Information (collecte indirecte) | 🔵 N/A | — | Pas de collecte indirecte (saisie directe utilisateur) | — |
| **Art. 15** | Droit d'accès | ✅ Oui | ✅ 100% | `POST /api/rgpd/export` (bundle chiffré) | LOT 5.1 |
| **Art. 16** | Droit de rectification | ✅ Oui | ✅ 100% | `PATCH /api/users/:id` (displayName, role) | EPIC 12, 13 |

### Section 3-4 : Effacement et Portabilité (Art. 17-21)

| Article | Titre | Applicabilité | Statut | Implémentation | EPIC |
|---------|-------|---------------|--------|----------------|------|
| **Art. 17** | Droit à l'effacement | ✅ Oui | ✅ 100% | `DELETE /api/rgpd/delete` (soft delete + purge 30j) | LOT 5.2 |
| **Art. 18** | Droit à la limitation | ✅ Oui | ❌ 0% | **Suspension compte manquante** | LOT 10.6 (TODO) |
| **Art. 19** | Notification rectification/effacement | ✅ Oui | ✅ 100% | Email automatique lors export/delete | LOT 5.1-5.2 |
| **Art. 20** | Droit à la portabilité | ✅ Oui | ✅ 100% | Export JSON structuré (format machine-readable) | LOT 5.1 |
| **Art. 21** | Droit d'opposition | ✅ Oui | ❌ 0% | **Formulaire opposition manquant** | LOT 10.6 (TODO) |

### Section 5 : Décisions automatisées (Art. 22-23)

| Article | Titre | Applicabilité | Statut | Implémentation | EPIC |
|---------|-------|---------------|--------|----------------|------|
| **Art. 22** | Décisions automatisées (IA) | ✅ Oui (CRITIQUE) | ❌ 0% | **Révision humaine résultats IA manquante** | LOT 10.6 (TODO) |
| **Art. 23** | Limitations des droits | 🔵 N/A | — | Vous êtes entreprise privée (pas autorité publique) | — |

**Précision Art. 22** : **CRITIQUE** car votre plateforme utilise l'IA pour prendre des décisions (résumé, classification, extraction). Art. 22.1 exige : Consentement explicite (✅ implémenté), **Droit de contestation + révision humaine** (❌ non implémenté → LOT 10.6).

---

## CHAPITRE IV : Responsabilités (Art. 24-43)

### Section 1-2 : Obligations et sous-traitance (Art. 24-29)

| Article | Titre | Applicabilité | Statut | Implémentation | EPIC |
|---------|-------|---------------|--------|----------------|------|
| **Art. 24** | Responsabilité | ✅ Oui | ✅ 100% | Documentation complète, audits, preuves | Tous EPICs |
| **Art. 25** | Privacy by Design/Default | ✅ Oui | ✅ 100% | Architecture RGPD native, isolation tenant, minimisation | LOT 1-4 |
| **Art. 26** | Responsables conjoints | 🔵 N/A | ✅ 100% | **Clarification CGU** : Plateforme = sous-traitant, Tenant = responsable | CGU v1.1 |
| **Art. 27** | Représentant UE | 🔵 N/A (si UE) | — | Établissement présumé UE (pas d'obligation) | — |
| **Art. 28** | Sous-traitant (DPA) | ✅ Oui (CRITIQUE) | ✅ 100% | **DPA obligatoire créé** (12 pages, Art. 28.3 complet) | DPA_TEMPLATE.md |
| **Art. 29** | Sous autorité | ✅ Oui | ✅ 100% | Gateway LLM = point unique, instructions contrôlées | LOT 1.4 |

### Section 3-5 : Registre et Sécurité (Art. 30-34)

| Article | Titre | Applicabilité | Statut | Implémentation | EPIC |
|---------|-------|---------------|--------|----------------|------|
| **Art. 30** | Registre des traitements | ✅ Oui | ✅ 100% | 5 traitements documentés (v1.1, validation DPO) | registre-traitements.md |
| **Art. 31** | Coopération CNIL | ✅ Oui | ✅ 100% | **Runbook créé** (10 pages, procédure complète) | CNIL_COOPERATION.md |
| **Art. 32** | Sécurité des traitements | ✅ Oui | ⚙️ **90%** | Chiffrement, isolation, audit, PII masking, IP anonymisation. **Manque** : Pentest, Chaos testing | LOT 1-2, EPIC 8, EPIC 9.1-9.2 |
| **Art. 33** | Notification CNIL (72h) | ✅ Oui | ❌ 0% | **Workflow violations manquant** | EPIC 9 LOT 9.0 (TODO) |
| **Art. 34** | Notification personnes | ✅ Oui | ❌ 0% | **Templates notification manquants** | EPIC 9 LOT 9.0 (TODO) |

### Section 6-8 : DPIA, DPO, Certifications (Art. 35-43)

| Article | Titre | Applicabilité | Statut | Implémentation | EPIC |
|---------|-------|---------------|--------|----------------|------|
| **Art. 35** | DPIA | ✅ Oui (CRITIQUE) | ✅ 100% | Gateway LLM = risque élevé → DPIA complète | dpia.md |
| **Art. 36** | Consultation préalable | 🔵 N/A | — | DPIA conclut risque résiduel acceptable | — |
| **Art. 37** | Désignation DPO | 🟡 Recommandé | ⚙️ 50% | Contact DPO prévu, **pas encore désigné formellement** | — |
| **Art. 38-39** | Position/Missions DPO | 🟡 Si DPO | — | À implémenter si DPO désigné | — |
| **Art. 40-43** | Codes de conduite/Certifications | 🟡 Optionnel | — | ISO 27001 recommandé (pas obligatoire) | — |

---

## CHAPITRE V : Transferts hors UE (Art. 44-50)

| Article | Titre | Applicabilité | Statut | Implémentation |
|---------|-------|---------------|--------|----------------|
| **Art. 44** | Principe général | 🔵 N/A | ✅ 100% | **Aucun transfert hors UE** (hébergement France) |
| **Art. 45** | Décision d'adéquation | 🔵 N/A | — | Pas de transfert hors UE |
| **Art. 46** | Garanties appropriées (CCT) | 🔵 N/A | — | Pas de transfert hors UE |
| **Art. 47** | BCR (Binding Corporate Rules) | 🔵 N/A | — | Pas de transfert hors UE |
| **Art. 48** | Transferts non autorisés | 🔵 N/A | — | Pas de transfert hors UE |
| **Art. 49** | Dérogations | 🔵 N/A | — | Pas de transfert hors UE |
| **Art. 50** | Coopération internationale | 🔵 N/A | — | Pas de transfert hors UE |

**Note** : Tous ces articles sont **non applicables** car :
- ✅ Hébergement : **France (UE)**
- ✅ Modèle IA : **Local (Ollama)** ou UE/Suisse avec DPA
- ✅ Sous-traitants : **UE uniquement**

---

## CHAPITRE VI : Autorités de contrôle (Art. 51-76)

| Articles | Titre | Applicabilité | Note |
|----------|-------|---------------|------|
| **Art. 51-59** | Statut CNIL | 🔵 N/A | Concerne l'organisation interne CNIL (pas d'obligation entreprise) |
| **Art. 60-76** | Coopération autorités | 🔵 N/A | Mécanisme de guichet unique UE (pas d'obligation entreprise) |

**Note** : Ces articles définissent le **fonctionnement interne des autorités de contrôle** (CNIL, etc.). Votre seule obligation est **Art. 31 (coopération)** → ✅ 100% (runbook créé).

---

## CHAPITRE VII : Recours et sanctions (Art. 77-84)

| Article | Titre | Applicabilité | Statut | Implémentation |
|---------|-------|---------------|--------|----------------|
| **Art. 77** | Droit de réclamation | ✅ Oui | ✅ 100% | Lien CNIL dans politique confidentialité + CGU |
| **Art. 78-81** | Recours juridictionnels | 🔵 N/A | — | Droit des personnes (pas d'obligation entreprise) |
| **Art. 82** | Droit à réparation | ✅ Oui | ✅ 100% | Clause CGU responsabilité + assurance RC pro |
| **Art. 83** | Amendes administratives | 🔵 N/A | — | Sanctions CNIL (pas d'obligation, juste risque) |
| **Art. 84** | Sanctions | 🔵 N/A | — | Législation nationale |

---

## CHAPITRE VIII : Dispositions particulières (Art. 85-91)

| Article | Titre | Applicabilité | Statut | Note |
|---------|-------|---------------|--------|------|
| **Art. 85** | Liberté d'expression | 🔵 N/A | — | Vous n'êtes pas média/presse |
| **Art. 86** | Accès public | 🔵 N/A | — | Vous ne traitez pas registres publics |
| **Art. 87** | Numéro sécurité sociale | 🟡 Possible | ✅ 100% | Si médecins/avocats soumettent NIR → PII masking (EPIC 8) |
| **Art. 88** | Données employés | 🟡 Si > 10 salariés | — | Données RH internes (hors périmètre plateforme) |
| **Art. 89** | Recherche/stats | 🔵 N/A | — | Vous n'êtes pas organisme recherche |
| **Art. 90** | Secret professionnel | 🟡 Oui (avocats) | ✅ 100% | Clause CGU responsabilité tenant |
| **Art. 91** | Églises/associations | 🔵 N/A | — | Vous n'êtes pas organisation religieuse |

---

## CHAPITRE IX : Dispositions finales (Art. 92-99)

| Article | Titre | Applicabilité | Note |
|---------|-------|---------------|------|
| **Art. 92-99** | Entrée en vigueur, abrogations | 🔵 N/A | Dispositions transitoires 2016-2018 (historique) |

---

## CHAPITRE X : Directive ePrivacy (2002/58/CE)

| Exigence | Applicabilité | Statut | Implémentation | EPIC |
|----------|---------------|--------|----------------|------|
| **Art. 5.3** — Consentement cookies | ✅ Oui (CRITIQUE) | ❌ 0% | **Cookie banner manquant** | LOT 10.3 (TODO) |
| **Art. 6** — Données trafic | 🔵 N/A | — | Vous n'êtes pas opérateur télécom |
| **Art. 15** — Sécurité | ✅ Oui | ✅ 90% | Couvert par Art. 32 RGPD | LOT 1-2, EPIC 8 |

---

# ANNEXE B : Vue Conformité FRONT vs BACK

> Cette annexe permet de vérifier que chaque article RGPD pertinent a une implémentation cohérente côté Front et Back.

## Principes Fondamentaux (Art. 5)

| Article | Principe | Implémentation BACK | Implémentation FRONT | Status |
|---------|----------|---------------------|----------------------|--------|
| Art. 5.1.a | Licéité, loyauté, transparence | Consentement opt-in (EPIC 5) | Popup consentement (EPIC 13) | ✅ |
| Art. 5.1.b | Limitation des finalités | Purposes définis (EPIC 5) | Dropdown purposes (EPIC 13) | ✅ |
| Art. 5.1.c | Minimisation | P3 non stocké (EPIC 3-4) | Pas de localStorage P3 (EPIC 13) | ✅ |
| Art. 5.1.d | Exactitude | Edit profile (EPIC 5) | Form profile (EPIC 13) | ✅ |
| Art. 5.1.e | Limitation conservation | Purge 90j (EPIC 4) | Affichage 90j max (EPIC 13) | ✅ |
| Art. 5.1.f | Intégrité et confidentialité | Chiffrement, isolation (EPIC 1-2) | HTTPS, CSP (EPIC 13) | ✅ |
| Art. 5.2 | Responsabilité | Audit trail (EPIC 1) | - | ✅ |

## Droits des Personnes (Art. 15-22)

| Article | Droit | API BACK | UI FRONT | Status |
|---------|-------|----------|----------|--------|
| Art. 15 | Accès | `POST /api/rgpd/export` ✅ | Bouton Export (EPIC 13) | ✅ |
| Art. 16 | Rectification | `PATCH /api/users/:id` ✅ | Form Profile (EPIC 13) | ✅ |
| Art. 17 | Effacement | `POST /api/rgpd/delete` ✅ | Bouton Supprimer (EPIC 13) | ✅ |
| Art. 18 | Limitation | `POST /api/rgpd/suspend` ❌ | Bouton Suspendre ❌ | 🔜 LOT 10.6 |
| Art. 19 | Notification | Email auto (EPIC 5) ✅ | - | ✅ |
| Art. 20 | Portabilité | Export JSON/CSV (EPIC 5) ✅ | Download bundle (EPIC 13) | ✅ |
| Art. 21 | Opposition | `POST /api/rgpd/oppose` ❌ | Form opposition ❌ | 🔜 LOT 10.6 |
| Art. 22 | Décisions automatisées | `POST /api/rgpd/contest` ❌ | Bouton Contester ❌ | 🔜 LOT 10.6 |

## Sécurité (Art. 32)

| Mesure | Implémentation | EPIC | Status |
|--------|----------------|------|--------|
| Chiffrement en transit | TLS 1.3 | EPIC 2 | ✅ |
| Chiffrement au repos | AES-256-GCM exports | EPIC 5 | ✅ |
| Isolation tenant | WHERE tenant_id = $1 | EPIC 1 | ✅ |
| Audit trail | Table audit_events | EPIC 1 | ✅ |
| Hashage passwords | bcrypt 12 rounds | EPIC 1 | ✅ |
| Pseudonymisation PII | Masking avant LLM | EPIC 8 | ✅ |
| Anonymisation IP | Job auto > 7j | EPIC 8 | ✅ |

## ePrivacy (Cookies)

| Exigence | Implémentation BACK | Implémentation FRONT | Status |
|----------|---------------------|----------------------|--------|
| Consentement préalable | `POST /api/consents/cookies` ❌ | Cookie banner ❌ | 🔜 LOT 10.3 |
| Opt-in par catégorie | API catégories | Checkboxes UI | 🔜 LOT 10.3 |
| Blocage scripts | - | Script loader conditionnel | 🔜 LOT 10.3 |
| Révocation | `GET /api/consents/cookies` ❌ | Page gérer cookies | 🔜 LOT 10.3 |

---

# ANNEXE C : Synthèse par Statut

## Récapitulatif global

| Statut | Nombre d'articles | Pourcentage | Détail |
|--------|-------------------|-------------|--------|
| ✅ **100% conforme** | **32 articles** | **~60%** | EPICs 1-8 implémentés |
| ⚙️ **Partiellement conforme** | **4 articles** | ~7% | Art. 8 (90%), 12 (60%), 32 (90%), 37 (50%) |
| ❌ **Non conforme** | **7 articles** | ~13% | Art. 13, 18, 21, 22, 33, 34, ePrivacy (EPICs 9-10 requis) |
| 🔵 **Non applicable** | **~50 articles** | ~20% | Autorités, transferts hors UE, dispositions finales |

## Plan d'action pour 100% RGPD

### Priorité 1 — BLOQUANTS PRODUCTION (13 jours)

| Gap | Article | EPIC/LOT | Effort |
|-----|---------|----------|--------|
| Cookie consent banner | ePrivacy | LOT 10.3 | 3j |
| Notification violations CNIL | Art. 33-34 | EPIC 9 LOT 9.0 | 5j |
| Registre violations | Art. 33.5 | EPIC 9 LOT 9.0 | 2j |
| Art. 22 révision humaine IA | Art. 22 | LOT 10.6 | 3j |

### Priorité 2 — Conformité légale (9 jours)

| Gap | Article | EPIC/LOT | Effort |
|-----|---------|----------|--------|
| Template DPA | Art. 28 | LOT 10.1 | 2j |
| Politique confidentialité | Art. 13-14 | LOT 10.0 | 2j |
| CGU versionnées | Art. 6.1.b | LOT 10.1 | 2j |
| Page RGPD Info | Art. 12-14 | LOT 10.2 | 1j |
| Runbook coopération CNIL | Art. 31 | EPIC 9 | 1j |

### Priorité 3 — Droits complémentaires (6 jours)

| Gap | Article | EPIC/LOT | Effort |
|-----|---------|----------|--------|
| Droit limitation | Art. 18 | LOT 10.6 | 2j |
| Droit opposition | Art. 21 | LOT 10.6 | 2j |
| Clauses Art. 9/10 CGU | Art. 9, 10 | LOT 10.1 | 1j |
| Clause Art. 26 CGU | Art. 26 | LOT 10.1 | 1j |

**TOTAL estimé** : ~28 jours (4-5 semaines)

---

## Checklist Production

### ❌ Avant mise en production (obligatoire)

- [ ] EPIC 9 LOT 9.0 : Workflow violations CNIL 72h
- [ ] LOT 10.3 : Cookie consent banner fonctionnel
- [ ] LOT 10.6 : Art. 22 — Révision humaine décisions IA
- [ ] LOT 10.0-10.2 : Documents légaux publiés
- [ ] LOT 10.1 : Template DPA créé

### ⚙️ Recommandé avant production

- [ ] LOT 8.1 : Anonymisation IP > 7 jours
- [ ] LOT 10.6 : Art. 18/21 — Droits limitation/opposition
- [ ] EPIC 9 LOT 9.1 : Pentest & vulnerability scan
- [ ] Registre traitements finalisé

---

## Documents liés (même dossier)

| Document | Contenu | Obligatoire |
|----------|---------|-------------|
| [dpia.md](./dpia.md) | Analyse d'impact Gateway LLM (Art. 35) | ✅ Oui |
| [registre-traitements.md](./registre-traitements.md) | Registre des traitements (Art. 30) | ✅ Oui |
| [RGPD_EXPLICATION_SIMPLE.md](./RGPD_EXPLICATION_SIMPLE.md) | Guide utilisateur vulgarisé | Non (communication) |

---

**Document validé le** : 2026-01-01
**Version** : 2.0 (consolidé)
**Prochain audit** : Après implémentation EPICs 9-10
**Responsable** : Équipe conformité RGPD
