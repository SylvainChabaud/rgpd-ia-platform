# TASKS.md — Roadmap d'exécution (Plateforme RGPD-IA complète)

> **But** : permettre à Claude Code de construire **pas à pas** une plateforme **complète (backend + frontends)** **FULL RGPD**, en couvrant **EPIC 1 → EPIC 13** et en respectant les markdowns normatifs.
>
> **Périmètre** :
> - **EPIC 1-7** : Backend Next.js (API + services + infra)
> - **EPIC 8-9** : Back Office (Super Admin + Tenant Admin)
> - **EPIC 10** : Front User (interface utilisateur final)
> - **EPIC 11-13** : RGPD Compliance 100% (Anonymisation, Legal, Security)

---

## 0 - Vue d'ensemble des EPICs

| EPIC | Description | Statut | Artefacts |
|------|-------------|--------|-----------|
| **EPIC 1** | Socle applicatif sécurisé (IAM, multi-tenant, Gateway LLM) | ✅ 100% | LOT 1.0-1.5 |
| **EPIC 2** | Durcissement serveur & réseau (Ops/Sec RGPD) | ✅ 100% | LOT 2.0-2.1 |
| **EPIC 3** | Validation technique IA locale (POC contrôlé) | ✅ 100% | LOT 3.0 |
| **EPIC 4** | Stockage IA & données utilisateur RGPD | ✅ 100% | LOT 4.0-4.1 |
| **EPIC 5** | Pipeline RGPD (Droits des personnes) | ✅ 100% | LOT 5.0-5.3 |
| **EPIC 6** | Stack IA Docker RGPD-ready (industrialisation) | ❌ TODO | LOT 6.0-6.1 |
| **EPIC 7** | Kit conformité & audit RGPD | ❌ TODO | LOT 7.0-7.1 |
| **EPIC 8** | Back Office Super Admin (Interface PLATFORM) | ❌ TODO | LOT 8.0-8.3 |
| **EPIC 9** | Back Office Tenant Admin (Interface TENANT) | ❌ TODO | LOT 9.0-9.3 |
| **EPIC 10** | Front User (Interface utilisateur final) | ❌ TODO | LOT 10.0-10.4 |
| **EPIC 11** | Anonymisation & Pseudonymisation (Backend) | ❌ TODO | LOT 11.0-11.2 |
| **EPIC 12** | RGPD Legal & Compliance (Frontend + Docs) | ❌ TODO | LOT 12.0-12.6 |
| **EPIC 13** | Incident Response & Security Hardening | ❌ TODO | LOT 13.0-13.2 |

---

## 0.1 - Références normatives (obligatoires)

Claude Code **DOIT** appliquer, pour chaque lot, les documents suivants :

- `CLAUDE.md` (constitution + règles non négociables + DoD)
- `docs/architecture/BOUNDARIES.md`
- `docs/ai/LLM_USAGE_POLICY.md`
- `docs/data/DATA_CLASSIFICATION.md`
- `docs/testing/RGPD_TESTING.md`

Références de cadrage (utiles) :
- `docs/epics/PLATEFORME_VISION_MACRO.md` (vue d'ensemble complète)
- `docs/epics/EPIC-1.md` … `docs/epics/EPIC-10.md` (ou emplacement équivalent PDF)
- `00 - Analyse de l'objectif` (pdf/doc)
- `03 - Plan de déploiement` (doc)

> **Règle** : si un lot mentionne un EPIC, Claude **DOIT** relire cet EPIC avant d'implémenter.

---

## 0.2 - Stratégie d'implémentation

### Phase 1 : Backend Finalization (EPIC 1-7) — 🔴 PRIORITAIRE
**Objectif** : API backend complète, production-ready, RGPD-compliant (85%)

**Ordre recommandé** :
1. ✅ **EPIC 1-5** : Socle + IA + RGPD (TERMINÉ)
2. ❌ **LOT 5.3** : API Routes HTTP (BLOQUANT pour frontend)
3. ❌ **EPIC 6** : Docker prod + Observabilité (BLOQUANT pour déploiement)
4. ❌ **EPIC 7** : Audit CNIL + Scripts preuves (BLOQUANT pour conformité)

### Phase 2 : Back Office (EPIC 8-9) — 🟡 APRÈS BACKEND
**Objectif** : Interfaces admin pour gérer la plateforme

**Ordre recommandé** :
1. ❌ **EPIC 8** : Back Office Super Admin (gestion tenants/users/audit)
2. ❌ **EPIC 9** : Back Office Tenant Admin (gestion users tenant/consents/RGPD)

### Phase 3 : Front User (EPIC 10) — 🟢 INTERFACES UTILISATEURS
**Objectif** : Interface utilisateur final pour utiliser l'IA

**Ordre recommandé** :
1. ❌ **EPIC 10** : Front User (AI Tools + My Data + RGPD)

### Phase 4 : RGPD 100% Compliance (EPIC 11-13) — 🟣 CRITIQUE PRODUCTION
**Objectif** : Combler gaps RGPD identifiés, atteindre 100% conformité

**Ordre recommandé** :
1. ❌ **EPIC 11** : Anonymisation & Pseudonymisation (Art. 32)
   - LOT 11.0 : PII Detection & Redaction (Gateway LLM)
   - LOT 11.1 : Anonymisation IP (Logs & Audit)
   - LOT 11.2 : Audit PII Logs (Scan automatique)
2. ❌ **EPIC 12** : RGPD Legal & Compliance (Art. 13-14, 18-22, 30, 35)
   - LOT 12.0 : Politique de Confidentialité
   - LOT 12.1 : CGU / CGV
   - LOT 12.2 : Page "Informations RGPD"
   - LOT 12.3 : Cookie Consent Banner (ePrivacy)
   - LOT 12.4 : Registre des Traitements (Art. 30)
   - LOT 12.5 : DPIA Gateway LLM (Art. 35)
   - LOT 12.6 : Droits complémentaires (Art. 18, 21, 22)
3. ❌ **EPIC 13** : Incident Response & Security Hardening (Art. 33-34)
   - LOT 13.0 : Runbook "Incident RGPD"
   - LOT 13.1 : Pentest & Vulnerability Scanning
   - LOT 13.2 : Chaos Engineering & Résilience

**Timeline** :
- **Phase 1-3** : 12 semaines (plateforme fonctionnelle 85% RGPD)
- **Phase 4** : 7 semaines supplémentaires (100% RGPD production-ready)
- **TOTAL** : 19 semaines pour conformité complète

---

## 1 - Règles de livraison (PR par lots)

### 1.1 Un lot = une PR
- PR courte et focalisée
- Une PR contient : **code + tests + doc minimale + commandes**

### 1.2 Sortie attendue pour chaque lot
Claude fournit systématiquement :
1. **Plan** (fichiers impactés, étapes, risques, tests)
2. **Liste des fichiers** modifiés/créés
3. **Commandes** : `lint`, `typecheck`, `test` (+ scripts spécifiques)
4. **Checklist DoD** (référence `CLAUDE.md`)

### 1.3 Gates obligatoires
Aucun lot n’est acceptable si :
- lint/typecheck/tests échouent
- un bypass LLM est détecté
- des logs sensibles apparaissent
- l’isolation tenant n’est pas prouvée

---

## 2 - Convention d’architecture cible (Next.js)

- Next.js sert d’hôte backend via **Route Handlers** (recommandé) ou API Routes.
- Séparation stricte (cf. `BOUNDARIES.md`) :
  - `src/domain/*` : règles métier pures
  - `src/app/*` : orchestration (use-cases), sécurité, endpoints
  - `src/infrastructure/*` : DB, crypto, providers, observabilité
  - `src/ai/*` : Gateway LLM (point unique)

---

## 3 - Prompts standard (à copier-coller dans Claude Code)

### 3.1 Prompt standard “Implémente LOT”
> Tu dois implémenter **LOT X.Y** décrit dans `TASKS.md`.
> Respecte strictement `CLAUDE.md` et les documents normatifs :
> `BOUNDARIES.md`, `LLM_USAGE_POLICY.md`, `DATA_CLASSIFICATION.md`, `RGPD_TESTING.md`.
>
> Attendus :
> 1) Un plan (fichiers, étapes, risques, tests)
> 2) Une implémentation minimale et cohérente
> 3) Les tests nécessaires (dont RGPD)
> 4) Les commandes pour vérifier (lint/typecheck/test)
> 5) Une checklist DoD complétée

### 3.2 Prompt “Revue RGPD & sécurité”
> Fais une revue critique du lot livré :
> - pas de bypass Gateway LLM
> - pas de logs sensibles
> - isolation tenant
> - minimisation des données
> - conformité DATA_CLASSIFICATION
> - conformité RGPD_TESTING
> Propose les correctifs nécessaires.

---

## 4 - Notes MCP Context 7

- **MCP Context 7** est un outillage autorisé pour consulter **des docs/templates internes**.
- Interdiction d’y exposer des données réelles/sensibles.
- Il ne doit jamais devenir une dépendance bloquante.

> `CLAUDE.md` contient la règle globale d’usage du MCP. Ici, on rappelle simplement qu’il peut être utilisé.

# EPIC 1 — Socle applicatif sécurisé (IAM, multi-tenant, Gateway LLM)

## LOT 1.0 — Bootstrap repo + quality gates

**EPIC couverts** : EPIC 1 (base)

**Avant implémentation** : lire EPIC 1 + `BOUNDARIES.md` + `RGPD_TESTING.md`.

**Objectif** : rendre impossible de mal faire et préparer toutes les étapes suivantes.

**Artefacts attendus**
- Next.js + TS strict
- Structure de dossiers (`domain/app/infrastructure/ai`)
- Scripts : lint/typecheck/test
- CI de base (ou scripts locaux) + PR template + DoD
- Scan secrets (au minimum hook CI ou script)
- “RGPD sentinel” : tests/logs safe + bypass LLM interdit (même si gateway pas encore complète)

**Acceptance criteria (bloquants)**
- `pnpm lint`, `pnpm typecheck`, `pnpm test` passent
- Aucun secret dans le repo (`.env.example` seulement)
- Un test garantit l’absence de logs sensibles par défaut

**Tests obligatoires**
- test sentinel logs

---

## LOT 1.1 — Multi-tenant resolution + RequestContext

**EPIC couverts** : EPIC 1

**Avant implémentation** : relire EPIC 1 (tenant) + `BOUNDARIES.md`.

**Objectif** : toute requête possède un contexte (tenantId, actorId, permissions).

**Artefacts attendus**
- `RequestContext` (tenantId, userId, roles/permissions)
- Middleware/guard tenant (header `X-Tenant-Id` ou host/subdomain)
- Rejet strict si tenant absent (sauf endpoints publics explicitement listés)

**Acceptance criteria**
- Aucun endpoint “privé” n’exécute sans tenant
- Le tenant est immuable sur la requête

**Tests obligatoires**
- requête sans tenant rejetée
- tenant invalide rejeté

---

## LOT 1.2 — AuthN + RBAC/ABAC minimal (policy engine)

**EPIC couverts** : EPIC 1

**Avant implémentation** : relire EPIC 1 (IAM) + `BOUNDARIES.md`.

**Objectif** : authentification + décisions d’autorisation centralisées.

**Artefacts attendus**
- Auth (sessions/JWT) centralisée
- `policyEngine` minimal (RBAC/ABAC)
- Middleware `requireAuth` / `requirePermission`

**Acceptance criteria**
- L’autorisation n’est jamais codée “à la main” dans les handlers
- Permissions toujours tenant-scoped

**Tests obligatoires**
- anonyme rejeté
- permission manquante rejetée

---

## LOT 1.3 — Audit events RGPD-safe + conventions de logs

**EPIC couverts** : EPIC 1, EPIC 5 (préparation traçabilité)

**Avant implémentation** : relire EPIC 1 (audit) + `DATA_CLASSIFICATION.md`.

**Objectif** : traçabilité sans fuite de données.

**Artefacts attendus**
- `audit_events` (événement, actorId, tenantId, targetId, timestamp)
- helpers `emitAuditEvent()` et `logEvent()` (événements uniquement)

**Acceptance criteria**
- Logs : jamais de payload utilisateur
- Audit : événements, pas de contenu

**Tests obligatoires**
- test “no sensitive logs” sur flux d’exemple

---

## LOT 1.4 — Gateway LLM (squelette) + interdiction de bypass

**EPIC couverts** : EPIC 1

**Avant implémentation** : relire EPIC 1 (Gateway) + `LLM_USAGE_POLICY.md` + `DATA_CLASSIFICATION.md`.

**Objectif** : un point unique pour tout appel IA.

**Artefacts attendus**
- Module `src/ai/gateway/*` avec interface `invokeLLM()`
- Typage : `purpose`, `tenantId`, `actorId`, `input` (redactable), `policy`
- Stub provider (pas encore IA locale)
- Gate “no-bypass” (lint/grep/test)

**Acceptance criteria (bloquants)**
- Aucun import d’un client LLM hors `src/ai/gateway/*`
- Toute route utilise la gateway

**Tests obligatoires**
- test statique “no direct LLM call”

---

## ⭐ LOT 1.5 — Bootstrap plateforme (Superadmin) + création de tenants (CLI)

**EPIC couverts** : EPIC 1 (IAM / tenants), EPIC 2 (ops), EPIC 7 (process & audit)

**Avant implémentation** : relire EPIC 1 + `BOUNDARIES.md` + `DATA_CLASSIFICATION.md` + `RGPD_TESTING.md`.

### Objectif
Permettre l’initialisation **sécurisée et reproductible** de la plateforme :
- création du **superadmin plateforme** (scope PLATFORM, sans tenant)
- création de **tenants métiers** (avocat, médecin, comptable)
- création de l’**admin du tenant** associé

Sans **aucun endpoint HTTP exposé**.

### Commandes CLI attendues
- `pnpm bootstrap:platform-admin --email ... --name ...`
- `pnpm create:tenant --slug ... --name ... --adminEmail ... --sector ...`

### Contraintes de sécurité (bloquantes)
- Bootstrap plateforme **exécutable une seule fois** (lock DB ou flag)
- Création tenant idempotente (slug unique)
- Aucun mot de passe en clair (invitation / reset ultérieur)
- Logs = événements techniques uniquement (IDs, jamais emails complets)
- Audit events générés (RGPD-safe)

### Artefacts attendus
- `src/infrastructure/cli/*`
- `src/app/bootstrap/*` (use-cases)
- `src/domain/tenant/*`
- migrations DB si nécessaire (`users.scope`, `tenant_id nullable`)
- `docs/runbooks/bootstrap.md`

### Tests obligatoires
- bootstrap OK puis refus au second run
- create tenant OK / slug dupliqué rejeté
- test “no sensitive logs” sur bootstrap

---

# EPIC 2 — Durcissement serveur & réseau (Ops/Sec RGPD)

## LOT 2.0 — Baseline sécurité (docs + config non-prod)

**EPIC couverts** : EPIC 2

**Avant implémentation** : relire EPIC 2.

**Objectif** : matérialiser l’EPIC 2 dans le repo (docs et artefacts).

**Artefacts attendus**
- `docs/runbooks/security-hardening.md`
- `docs/runbooks/backup-policy.md`
- `.env.example` (sans secrets)

**Acceptance criteria**
- Zéro secret versionné
- Checklist hardening exploitable

---

## LOT 2.1 — Docker dev isolé (réseaux/ports minimaux)

**EPIC couverts** : EPIC 2, EPIC 6 (préparation)

**Avant implémentation** : relire EPIC 2 (réseau) + EPIC 6 (docker).

**Objectif** : environnement local isolé (non prod) sans mauvaises pratiques.

**Artefacts attendus**
- `docker-compose.dev.yml` (db + app)
- réseaux internes
- exposition de ports minimale

**Acceptance criteria**
- DB non exposée publiquement (sauf dev explicite)
- Aucun volume contenant des secrets en clair

---

# EPIC 3 — Validation technique IA locale (POC contrôlé)

## LOT 3.0 — Provider IA local POC branché à la Gateway

**EPIC couverts** : EPIC 3, EPIC 1

**Avant implémentation** : relire EPIC 3 + `LLM_USAGE_POLICY.md`.

**Objectif** : valider la faisabilité IA locale en conditions contrôlées.

**Artefacts attendus**
- Provider local (ex: runtime local/container) branché à `invokeLLM()`
- Mode “POC” : aucun stockage prompts/outputs
- Bench simple (latence) sur données fictives

**Acceptance criteria (bloquants)**
- Prompts/outputs non persistés
- IA accessible uniquement via la gateway

**Tests obligatoires**
- test “no storage of prompts by default”

---

# EPIC 4 — Stockage IA & données utilisateur RGPD

## LOT 4.0 — Schéma DB minimal + migrations + DAL tenant-scoped

**EPIC couverts** : EPIC 4 (principal), EPIC 1 (isolation), EPIC 5 (préparation export/effacement)

**Avant implémentation** : relire EPIC 4 + `DATA_CLASSIFICATION.md`.

**Objectif** : persistance minimale, isolée par tenant, prête pour les droits RGPD.

**Données autorisées (par défaut)**
- P0/P1 : OK
- P2 : uniquement si justifié et nécessaire
- P3 : **interdit par défaut** (exceptions explicitement documentées + validation)

**Artefacts attendus**
- Migrations versionnées (`/migrations`)
- DAL tenant-scoped (`src/infrastructure/db/*`)
- Modèles minimaux :
  - `tenants`
  - `users`
  - `consents`
  - `audit_events`
  - `rgpd_requests` (export/delete)
  - `ai_jobs` (métadonnées uniquement : statut, timestamps, purpose, références, jamais contenu sensible)

**Acceptance criteria (bloquants)**
- Aucune requête DB n’existe sans `tenantId`
- Lecture/écriture cross-tenant impossible
- Les logs DB n’exposent aucun contenu

**Tests obligatoires**
- intégration cross-tenant (read/write)
- tentative d’accès sans tenant rejetée

---

## LOT 4.1 — Rétention & minimisation (policy + purge job)

**EPIC couverts** : EPIC 4, EPIC 5

**Avant implémentation** : relire EPIC 4 (rétention) + EPIC 5 (effacement/export) + `DATA_CLASSIFICATION.md`.

**Objectif** : maîtriser la conservation sans compromettre l’audit ni les droits.

**Artefacts attendus**
- `RetentionPolicy` (durées par type de données)
- Job de purge idempotent (`src/app/jobs/purge.ts`)
- Documentation : comment configurer et prouver la purge

**Acceptance criteria (bloquants)**
- Purge idempotente
- Purge ne supprime pas les preuves nécessaires (audit minimal)
- Purge n’empêche pas export/effacement

**Tests obligatoires**
- purge idempotente
- purge respecte la policy

---

# EPIC 5 — Pipeline RGPD (Consentement, Journalisation, Effacement, Export)

## LOT 5.0 — Consentement (opt-in / revoke) + enforcement

**EPIC couverts** : EPIC 5 (principal), EPIC 1 (gateway)

**Avant implémentation** : relire EPIC 5 + `RGPD_TESTING.md`.

**Objectif** : conditionner les traitements aux bases légales et à la configuration.

**Artefacts attendus**
- Endpoints consent (create/revoke)
- Stockage consent (tenant/user scoped)
- Enforcement côté Gateway LLM (refus si absent)
- Audit event sur changement de consent

**Acceptance criteria (bloquants)**
- Consent requis avant tout traitement IA concerné
- Révocation effective immédiatement
- Traçabilité sans fuite de contenu

**Tests obligatoires**
- appel IA refusé sans consent
- après revoke : appel IA refusé

---

## LOT 5.1 — Export RGPD (bundle chiffré + TTL)

**EPIC couverts** : EPIC 5

**Avant implémentation** : relire EPIC 5 (export) + `DATA_CLASSIFICATION.md`.

**Objectif** : permettre l’exercice du droit d’accès/portabilité.

**Artefacts attendus**
- Endpoint request export
- Générateur de bundle (format stable)
- Chiffrement du bundle + TTL
- Accès contrôlé (auth + tenant + propriétaire)
- Audit event export

**Acceptance criteria (bloquants)**
- Export ne contient que le périmètre tenant/utilisateur
- Le bundle est chiffré et expirant
- Aucun contenu sensible n’est écrit en logs

**Tests obligatoires**
- export scope correct
- TTL appliqué

---

## LOT 5.2 — Effacement RGPD (delete + purge + crypto-shredding)

**EPIC couverts** : EPIC 5 (principal), EPIC 4 (stockage)

**Avant implémentation** : relire EPIC 5 (effacement) + EPIC 4 (stockage) + `RGPD_TESTING.md`.

**Objectif** : rendre les données inaccessibles immédiatement et irrécupérables après purge.

**Artefacts attendus**
- Endpoint request delete
- Suppression logique immédiate
- Purge différée (job) + stratégie de crypto-shredding (selon choix projet)
- Audit event effacement

**Acceptance criteria (bloquants)**
- Après delete : aucune donnée n’est accessible via l’app
- Après purge : données supprimées/irrécupérables
- La stratégie est documentée et testée

**Tests obligatoires**
- delete immédiat (non-access)
- purge (absence)

---

## LOT 5.3 — API Routes HTTP complètes (exposition backend)

**EPIC couverts** : EPIC 5 (principal), EPIC 1 (auth/authz)

**Avant implémentation** : relire EPIC 5 + EPIC 1 (RequestContext, auth) + `BOUNDARIES.md`.

**Objectif** : exposer tous les use-cases via API Routes Next.js pour consommation frontend.

**Artefacts attendus**
- `app/api/auth/*` : login, logout, me
- `app/api/tenants/*` : CRUD tenants (PLATFORM admin)
- `app/api/users/*` : CRUD users (tenant-scoped)
- `app/api/consents/*` : CRUD consents
- `app/api/ai/invoke` : Gateway LLM via HTTP
- `app/api/ai/jobs/*` : Liste jobs IA
- `app/api/rgpd/export` : Export RGPD
- `app/api/rgpd/delete` : Effacement RGPD
- `app/api/audit/events` : Audit trail (admin)
- Middleware CORS configuré
- Rate limiting actif
- Validation Zod sur body/query/params
- OpenAPI spec (Swagger)

**Acceptance criteria (bloquants)**
- Tous les use-cases exposés via HTTP
- Middleware auth/tenant/permission sur toutes routes privées
- CORS autorise origines frontend uniquement
- Rate limiting par IP/user/tenant
- Error handling uniforme (errorResponse)
- Validation stricte des inputs (Zod)

**Tests obligatoires**
- API auth flow E2E
- API tenant isolation (cross-tenant rejeté)
- API consent enforcement (LLM sans consent rejeté)
- API RGPD scope (export/delete user-scoped uniquement)
- Rate limiting effectif

---

# EPIC 6 — Stack IA Docker RGPD-ready (industrialisation)

## LOT 6.0 — Docker compose prod-ready (réseaux/ports/secrets)

**EPIC couverts** : EPIC 6 (principal), EPIC 2 (sécurité infra)

**Avant implémentation** : relire EPIC 6 + EPIC 2.

**Objectif** : industrialiser sans fuite et sans mauvaises pratiques.

**Artefacts attendus**
- `docker-compose.yml` (prod)
- réseaux internes isolés
- ports exposés minimaux
- secrets via mécanisme dédié (pas en env commit)
- `.env.example` (sans secrets)

**Acceptance criteria (bloquants)**
- DB et services internes non exposés
- Aucun secret dans l’image ou le repo
- Démarrage reproductible

**Tests/Checks obligatoires**
- check “no secrets”
- check ports exposés

---

## LOT 6.1 — Observabilité RGPD-safe (logs/metrics)

**EPIC couverts** : EPIC 6, EPIC 2

**Avant implémentation** : relire EPIC 6 (observabilité) + `DATA_CLASSIFICATION.md`.

**Objectif** : monitorer sans exposer de données.

**Artefacts attendus**
- Logs structurés (événements uniquement)
- Metrics sans labels sensibles
- Documentation “ce qui est monitoré”

**Acceptance criteria (bloquants)**
- Aucune donnée utilisateur dans logs
- Aucune dimension métrique sensible

**Tests obligatoires**
- test sentinel logs sur endpoints clés

---

# EPIC 7 — Kit conformité & audit

## LOT 7.0 — Dossier audit (CNIL-ready)

**EPIC couverts** : EPIC 7

**Avant implémentation** : relire EPIC 7.

**Objectif** : rendre la conformité démontrable et vendable.

**Artefacts attendus**
- `docs/rgpd/registre-traitements.md` (template prêt)
- `docs/rgpd/dpia.md` (template prêt)
- `docs/runbooks/incident.md`
- `docs/audit/evidence.md` (où sont les preuves)

**Acceptance criteria (bloquants)**
- Documents exploitables (pas vides)
- Liens vers preuves techniques

---

## LOT 7.1 — Scripts de preuves (CI artifacts)

**EPIC couverts** : EPIC 7, EPIC 6

**Avant implémentation** : relire EPIC 7 + `RGPD_TESTING.md`.

**Objectif** : produire automatiquement des preuves d’audit (tests, scans, rapports).

**Artefacts attendus**
- Scripts de collecte (`scripts/audit/*`)
- Génération d’artefacts CI (rapports tests RGPD, scans secrets)
- Documentation de restitution (`docs/audit/evidence.md`)

**Acceptance criteria (bloquants)**
- Preuves générées et accessibles
- Traçabilité versionnée

---

# EPIC 8 — Back Office Super Admin (Interface PLATFORM)

## LOT 8.0 — Infra Back Office (Next.js App Router + Auth)

**EPIC couverts** : EPIC 8 (principal), EPIC 1 (auth)

**Avant implémentation** : relire EPIC 8 + EPIC 1 (auth).

**Objectif** : scaffolder l'application Back Office Super Admin avec authentification.

**Artefacts attendus**
- Next.js App Router (monorepo `/backoffice`)
- Layout authentification (login/logout)
- Navigation sidebar (tenants, users, audit, settings)
- Theme UI (Tailwind + shadcn/ui ou MUI)
- Intégration API backend (fetch/axios)
- Auth flow (NextAuth.js ou équivalent)
- Protected routes (middleware)

**Acceptance criteria (bloquants)**
- Super Admin (scope PLATFORM) peut se connecter
- Redirection automatique si non authentifié
- Logout fonctionnel
- Navigation cohérente

**Tests obligatoires**
- Auth flow E2E (login → dashboard → logout)
- Protected routes (accès sans auth rejeté)

---

## LOT 8.1 — Gestion Tenants (CRUD)

**EPIC couverts** : EPIC 8

**Avant implémentation** : relire EPIC 8.

**Objectif** : interface complète de gestion des tenants (clients).

**Artefacts attendus**
- Page liste tenants (table + filtres + pagination)
- Page créer tenant (form : slug, name, sector, admin email)
- Page éditer tenant (form : name, status active/suspended)
- Page détails tenant (stats : users count, AI jobs count)
- Validation côté client (Zod + React Hook Form)
- Confirmation actions critiques (suspend, delete)

**Acceptance criteria (bloquants)**
- CRUD complet fonctionnel
- Validation formulaires stricte
- Feedback utilisateur (toasts/notifications)
- Isolation scope PLATFORM (seul Super Admin accède)

**Tests obligatoires**
- Créer tenant E2E
- Éditer tenant E2E
- Liste tenants paginée

---

## LOT 8.2 — Gestion Users Plateforme (CRUD)

**EPIC couverts** : EPIC 8

**Avant implémentation** : relire EPIC 8.

**Objectif** : gérer les utilisateurs de la plateforme (admins tenants principalement).

**Artefacts attendus**
- Page liste users (filtrable par tenant, role, status)
- Page créer admin tenant (form : email, tenant, role)
- Page éditer user (form : name, role, status)
- Recherche users (par email, nom)
- Bulk actions (suspend multiple users)

**Acceptance criteria (bloquants)**
- Filtres fonctionnels (tenant, role, status)
- Création user tenant-scoped
- Validation email unique
- Affichage tenant associé

**Tests obligatoires**
- Créer user E2E
- Filtrer users par tenant
- Bulk suspend users

---

## LOT 8.3 — Audit & Monitoring Dashboard

**EPIC couverts** : EPIC 8, EPIC 7

**Avant implémentation** : relire EPIC 8 + EPIC 7 (audit).

**Objectif** : visibilité complète sur l'activité plateforme et audit trail.

**Artefacts attendus**
- Dashboard stats globales (widgets : tenants actifs, users totaux, AI jobs ce mois)
- Page audit events (table avec filtres : tenant, user, action, date range)
- Graphiques activité (AI jobs par jour, exports RGPD, effacements)
- Logs système (erreurs critiques, alertes)
- Export audit trail (CSV)

**Acceptance criteria (bloquants)**
- Stats en temps réel
- Filtres audit events fonctionnels
- Graphiques lisibles (Chart.js ou Recharts)
- Export audit CSV RGPD-safe (P1 uniquement)

**Tests obligatoires**
- Chargement dashboard stats
- Filtrage audit events
- Export CSV audit

---

# EPIC 9 — Back Office Tenant Admin (Interface TENANT)

## LOT 9.0 — Dashboard Tenant (Stats + Activity Feed)

**EPIC couverts** : EPIC 9

**Avant implémentation** : relire EPIC 9.

**Objectif** : tableau de bord dédié aux admins tenant.

**Artefacts attendus**
- Next.js App Router (monorepo `/backoffice` même app, routes séparées)
- Dashboard tenant-scoped (stats : users, AI jobs, consents)
- Activity feed (dernières actions : jobs IA, exports, effacements)
- Widgets KPIs (jobs réussis vs échoués, consentements actifs)
- Isolation tenant stricte (middleware)

**Acceptance criteria (bloquants)**
- Tenant Admin (scope TENANT) voit uniquement son tenant
- Stats exactes et en temps réel
- Activity feed paginée (max 50 dernières actions)

**Tests obligatoires**
- Isolation tenant (admin tenant A ne voit pas tenant B)
- Stats tenant correctes

---

## LOT 9.1 — Gestion Users Tenant (CRUD)

**EPIC couverts** : EPIC 9

**Avant implémentation** : relire EPIC 9.

**Objectif** : gérer les utilisateurs du tenant (membres et admins).

**Artefacts attendus**
- Page liste users tenant (filtrable par role : admin/member)
- Page créer user (form : email, name, role)
- Page éditer user (form : name, role, status)
- Page détails user (historique AI jobs, consents, audit events)
- Invitation par email (génération lien activation)

**Acceptance criteria (bloquants)**
- CRUD complet tenant-scoped
- Historique user complet (jobs, consents, audit)
- Invitation email fonctionnelle
- Validation email unique par tenant

**Tests obligatoires**
- Créer user tenant E2E
- Voir historique user complet
- Isolation tenant (pas de cross-tenant)

---

## LOT 9.2 — Gestion Consentements (Purposes + Tracking)

**EPIC couverts** : EPIC 9, EPIC 5

**Avant implémentation** : relire EPIC 9 + EPIC 5 (consents).

**Objectif** : configurer et suivre les consentements IA par tenant.

**Artefacts attendus**
- Page liste purposes (configurable : résumé, classification, extraction)
- Page créer purpose (form : label, description, required)
- Matrice consentements (users × purposes : granted/revoked/pending)
- Historique consentements par user (date accordé, date révoqué)
- Export consentements (CSV)

**Acceptance criteria (bloquants)**
- Purposes configurables par tenant
- Matrice consentements lisible
- Historique traçable
- Export CSV RGPD-safe

**Tests obligatoires**
- Créer purpose E2E
- Voir matrice consentements
- Export CSV consentements

---

## LOT 9.3 — RGPD Management (Export/Delete Requests)

**EPIC couverts** : EPIC 9, EPIC 5

**Avant implémentation** : relire EPIC 9 + EPIC 5 (RGPD).

**Objectif** : gérer les demandes RGPD des utilisateurs du tenant.

**Artefacts attendus**
- Page demandes export (liste : status, créé le, expiré le, downloads restants)
- Page demandes effacement (liste : status, soft deleted le, purge prévu le)
- Actions : approuver/rejeter demande (workflow optionnel)
- Historique RGPD complet par user
- Notifications admins (nouvelle demande RGPD)

**Acceptance criteria (bloquants)**
- Liste demandes RGPD tenant-scoped
- Historique complet par user
- Statuts clairs (pending, completed, expired)
- Notifications temps réel (optionnel mais recommandé)

**Tests obligatoires**
- Voir demandes export E2E
- Voir demandes effacement E2E
- Isolation tenant (pas de cross-tenant)

---

# EPIC 10 — Front User (Interface utilisateur final)

## LOT 10.0 — Authentification & Layout User

**EPIC couverts** : EPIC 10, EPIC 1 (auth)

**Avant implémentation** : relire EPIC 10 + EPIC 1 (auth).

**Objectif** : scaffolder l'application Front User avec authentification.

**Artefacts attendus**
- Next.js App Router ou React SPA (monorepo `/frontend`)
- Layout user (login/logout)
- Navigation (Home, AI Tools, My Data, Settings)
- Theme UI moderne (Tailwind + shadcn/ui)
- Auth flow (NextAuth.js ou JWT cookies)
- Protected routes (middleware)
- Profile page (éditer nom, email, password)

**Acceptance criteria (bloquants)**
- User (scope MEMBER) peut se connecter
- Navigation intuitive
- Profile éditable
- Logout fonctionnel

**Tests obligatoires**
- Auth flow E2E (login → home → logout)
- Profile edit E2E

---

## LOT 10.1 — AI Tools (Interface Gateway LLM)

**EPIC couverts** : EPIC 10, EPIC 3 (Gateway LLM)

**Avant implémentation** : relire EPIC 10 + EPIC 3 (Gateway).

**Objectif** : interface utilisateur pour invoquer la Gateway LLM.

**Artefacts attendus**
- Page AI Tools (upload document + choose purpose)
- Drag & drop file picker (PDF, TXT, DOCX)
- Dropdown purpose (résumé, classification, extraction)
- Consent popup (si 1ère utilisation du purpose)
- Invoke LLM (progress bar, streaming optionnel)
- Display result (affichage résultat, non persisté par défaut)
- Option "Sauvegarder résultat" (si besoin)

**Acceptance criteria (bloquants)**
- Upload document fonctionnel
- Purpose sélectionnable
- Consent popup obligatoire (1ère fois)
- Résultat affiché en temps réel
- Streaming optionnel (améliore UX)

**Tests obligatoires**
- Upload document + invoke LLM E2E
- Consent popup (1ère utilisation)
- Résultat affiché correctement

---

## LOT 10.2 — Historique AI Jobs (Liste + Filtres)

**EPIC couverts** : EPIC 10, EPIC 4 (stockage)

**Avant implémentation** : relire EPIC 10 + EPIC 4 (ai_jobs).

**Objectif** : visualiser l'historique des jobs IA de l'utilisateur.

**Artefacts attendus**
- Page historique AI jobs (table : date, purpose, model, status, latence)
- Filtres (par purpose, date range, status)
- Pagination (max 90 jours, purge automatique)
- Détails job (clic sur ligne → modal/page détail)
- Export historique (CSV optionnel)

**Acceptance criteria (bloquants)**
- Historique user-scoped uniquement
- Filtres fonctionnels
- Pagination performante
- Max 90 jours (respect retention policy)

**Tests obligatoires**
- Voir historique jobs E2E
- Filtrer par purpose
- Isolation user (pas de cross-user)

---

## LOT 10.3 — Mes Consentements (Gestion + Historique)

**EPIC couverts** : EPIC 10, EPIC 5 (consents)

**Avant implémentation** : relire EPIC 10 + EPIC 5 (consents).

**Objectif** : gérer ses consentements IA.

**Artefacts attendus**
- Page mes consentements (liste purposes : accordés/révoqués)
- Toggle consent (switch on/off par purpose)
- Confirmation révocation (popup)
- Historique consentements (date accordé, date révoqué)
- Impact révocation (warning : "jobs IA bloqués si révoqué")

**Acceptance criteria (bloquants)**
- Liste purposes complète
- Toggle fonctionnel (accordé ↔ révoqué)
- Confirmation avant révocation
- Historique traçable

**Tests obligatoires**
- Accorder consentement E2E
- Révoquer consentement E2E
- Vérifier impact (LLM bloqué après revoke)

---

## LOT 10.4 — Mes Données RGPD (Export + Effacement)

**EPIC couverts** : EPIC 10, EPIC 5 (RGPD)

**Avant implémentation** : relire EPIC 10 + EPIC 5 (export/effacement).

**Objectif** : exercer ses droits RGPD (Art. 15, 17, 20).

**Artefacts attendus**
- Page mes données RGPD
- Section Export données (bouton "Exporter mes données")
- Liste exports disponibles (TTL 7j, downloads restants)
- Download bundle chiffré (avec password)
- Section Supprimer compte (bouton "Supprimer mon compte")
- Confirmation double (popup + email)
- Information soft delete (30 jours rétention)

**Acceptance criteria (bloquants)**
- Export fonctionnel (bundle chiffré reçu)
- Download avec password
- TTL respecté (7 jours)
- Effacement fonctionnel (soft delete immédiat)
- Confirmation obligatoire (éviter erreurs)
- Information claire (rétention 30j)

**Tests obligatoires**
- Export données E2E
- Download export E2E
- Supprimer compte E2E (soft delete vérifié)

---
# EPIC 11 — Anonymisation & Pseudonymisation (Backend)

## LOT 11.0 — PII Detection & Redaction (Gateway LLM)

**EPIC couverts** : EPIC 11, EPIC 3 (Gateway LLM)

**Avant implémentation** : lire EPIC 11 + `docs/epics/EPIC_11_Anonymisation_Pseudonymisation.md`.

**Objectif** : détecter et masquer PII dans prompts avant envoi LLM (Art. 32).

**Artefacts attendus**
- Module PII detector (`src/infrastructure/pii/detector.ts`)
- Module PII masker (`src/infrastructure/pii/masker.ts`)
- Patterns regex PII (`src/infrastructure/pii/patterns.ts`)
- Middleware Gateway LLM (intégration redaction)
- Tests détection (emails, noms, téléphones, adresses)
- Tests masking (tokens `[PERSON_1]`, `[EMAIL_1]`)
- Tests restauration PII (reverse mapping)
- Audit PII détection (sans stocker valeurs)

**Acceptance criteria (bloquants)**
- Détection PERSON, EMAIL, PHONE, ADDRESS (regex + NER optionnel)
- Masking avant envoi LLM (`Jean Dupont` → `[PERSON_1]`)
- Mapping non persisté (mémoire uniquement)
- Restauration PII optionnelle en sortie
- Audit event `llm.pii_detected` (types PII, counts)
- Tests RGPD passants (95% recall PII)

**Tests obligatoires**
- tests/rgpd.pii-redaction.test.ts (détection emails, noms, téléphones)
- tests/rgpd.pii-masking.test.ts (masking tokens)
- tests/rgpd.pii-restoration.test.ts (reverse mapping)
- tests/rgpd.pii-audit.test.ts (audit sans valeurs PII)

---

## LOT 11.1 — Anonymisation IP (Logs & Audit)

**EPIC couverts** : EPIC 11, EPIC 1 (Audit trail)

**Avant implémentation** : lire EPIC 11 (LOT 11.1).

**Objectif** : anonymiser IPs dans logs/audit après 7 jours (ePrivacy).

**Artefacts attendus**
- Job cron anonymisation IP (`src/infrastructure/jobs/anonymize-ips.job.ts`)
- Fonction anonymisation IPv4/IPv6
- Configuration cron (Kubernetes CronJob ou équivalent)
- Tests job cron (logs > 7j anonymisés)
- Tests job cron (logs < 7j intacts)
- Monitoring job (alertes échec)

**Acceptance criteria (bloquants)**
- Job cron quotidien (3h du matin)
- Anonymisation IPv4 dernier octet (`192.168.1.123` → `192.168.1.0`)
- Anonymisation IPv6 dernier bloc (`2001:db8:85a3::` → `2001:db8:85a3::`)
- Logs > 7 jours : IPs écrasées
- Logs < 7 jours : IPs préservées (investigation incidents)
- Audit job : trace nombre IPs anonymisées

**Tests obligatoires**
- tests/rgpd.ip-anonymization.test.ts (IPv4, IPv6)
- tests/rgpd.ip-anonymization.test.ts (job cron > 7j, < 7j)

---

## LOT 11.2 — Audit PII Logs (Scan automatique)

**EPIC couverts** : EPIC 11, EPIC 7 (Observability)

**Avant implémentation** : lire EPIC 11 (LOT 11.2).

**Objectif** : détecter PII accidentellement loguées (emails, noms en clair).

**Artefacts attendus**
- Job cron scan PII logs (`src/infrastructure/jobs/scan-pii-logs.job.ts`)
- Regex PII (emails, téléphones, patterns noms)
- Alertes email DevOps si détection PII
- Configuration alertes (Sentry, Slack, email)
- Tests scan (détection email, téléphone dans logs)
- Tests exclusions (user.email colonne OK)

**Acceptance criteria (bloquants)**
- Job cron quotidien (4h du matin)
- Scan colonnes `audit_events.metadata`, logs applicatifs
- Détection emails, téléphones, patterns noms (capitalized)
- Exclusions : colonnes légitimes (`user.email`)
- Alertes envoyées si détection PII
- Tests RGPD passants

**Tests obligatoires**
- tests/rgpd.pii-scan-logs.test.ts (détection email, phone)
- tests/rgpd.pii-scan-logs.test.ts (exclusion usages légitimes)

---

# EPIC 12 — RGPD Legal & Compliance (Frontend + Docs)

## LOT 12.0 — Politique de Confidentialité

**EPIC couverts** : EPIC 12 (Art. 13-14)

**Avant implémentation** : lire EPIC 12 + `docs/epics/EPIC_12_RGPD_Legal_Compliance.md`.

**Objectif** : rédiger et publier politique de confidentialité RGPD-compliant.

**Artefacts attendus**
- Document `/docs/legal/POLITIQUE_CONFIDENTIALITE.md`
- Page frontend `/legal/privacy-policy` (Next.js SSG)
- Lien footer "Politique de confidentialité"
- Versioning (date dernière modification)
- Contenu complet (Art. 13-14) :
  - Identité responsable traitement
  - Contact DPO
  - Finalités traitement
  - Bases légales (consentement, contrat)
  - Catégories données (P0-P3)
  - Destinataires (fournisseurs LLM, hébergeur)
  - Durée conservation (90j ai_jobs, 3 ans users)
  - Droits utilisateurs (accès, effacement, portabilité, etc.)
  - Droit réclamation CNIL
  - Décisions automatisées (mention IA)

**Acceptance criteria (bloquants)**
- Document créé et complet (tous points Art. 13-14)
- Page accessible publiquement
- Lien footer fonctionnel
- Responsive (mobile/desktop)
- Format Markdown + HTML (SSG)

**Tests obligatoires**
- Tests E2E page accessible
- Tests E2E lien footer actif

---

## LOT 12.1 — CGU / CGV

**EPIC couverts** : EPIC 12 (Art. 6 - base légale contrat)

**Avant implémentation** : lire EPIC 12 (LOT 12.1).

**Objectif** : rédiger CGU + processus acceptation signup.

**Artefacts attendus**
- Document `/docs/legal/CGU.md`
- Page frontend `/legal/terms-of-service`
- Lien footer "CGU"
- Checkbox signup "J'accepte les CGU" (obligatoire)
- Table DB `cgu_versions` (versioning)
- Table DB `user_cgu_acceptances` (traçabilité)
- Migration `004_cgu_versions.sql`

**Acceptance criteria (bloquants)**
- Document CGU créé (objet, conditions accès, obligations, responsabilité, résiliation)
- Page accessible publiquement
- Checkbox signup obligatoire (validation frontend + backend)
- Acceptation tracée DB (user_id, cgu_version_id, accepted_at)
- Tests E2E acceptation CGU

**Tests obligatoires**
- tests/rgpd.cgu-acceptance.test.ts (checkbox obligatoire)
- tests/rgpd.cgu-versions.test.ts (historique versions)

---

## LOT 12.2 — Page "Informations RGPD"

**EPIC couverts** : EPIC 12 (Art. 13-14)

**Avant implémentation** : lire EPIC 12 (LOT 12.2).

**Objectif** : créer page centralisée informations RGPD (DPO, droits, réclamation).

**Artefacts attendus**
- Page frontend `/legal/rgpd-info`
- Lien footer "Informations RGPD"
- Contenu :
  - Identité responsable traitement
  - Contact DPO (email + formulaire)
  - Finalités traitement (résumé)
  - Bases légales (consentement, contrat)
  - Droits utilisateurs (liste + liens actions)
  - Droit réclamation CNIL (lien site CNIL)
  - Liens utiles (politique confidentialité, CGU, export RGPD)
- Formulaire contact DPO fonctionnel (email backend)

**Acceptance criteria (bloquants)**
- Page accessible publiquement
- Lien footer fonctionnel
- Formulaire contact DPO envoie email
- Tous liens droits utilisateurs actifs
- Responsive (mobile/desktop)

**Tests obligatoires**
- Tests E2E page accessible
- Tests E2E formulaire contact DPO

---

## LOT 12.3 — Cookie Consent Banner

**EPIC couverts** : EPIC 12 (ePrivacy Art. 5.3)

**Avant implémentation** : lire EPIC 12 (LOT 12.3).

**Objectif** : implémenter cookie consent banner ePrivacy-compliant.

**Artefacts attendus**
- Component `src/app/components/CookieConsentBanner.tsx`
- Catégories cookies :
  - Nécessaires (JWT, CSRF) : pré-cochées, non modifiables
  - Analytics (optionnel) : checkbox opt-in
  - Marketing (optionnel) : checkbox opt-in
- Boutons : "Accepter tout", "Refuser tout", "Personnaliser"
- Persistance choix localStorage (`cookie_consent`, 12 mois)
- Blocage scripts analytics/marketing si refus
- Page "Gérer cookies" (footer) : révocation possible

**Acceptance criteria (bloquants)**
- Banner affiché première visite (si pas de choix)
- Choix persistés 12 mois
- Scripts bloqués si refus (tests E2E)
- Révocation possible (page "Gérer cookies")
- Conformité CNIL (guidelines cookies françaises)

**Tests obligatoires**
- tests/rgpd.cookie-banner.test.ts (affichage première visite)
- tests/rgpd.cookie-banner.test.ts (blocage scripts si refus)

---

## LOT 12.4 — Registre des Traitements (Art. 30)

**EPIC couverts** : EPIC 12 (Art. 30)

**Avant implémentation** : lire EPIC 12 (LOT 12.4).

**Objectif** : créer registre des traitements RGPD-compliant.

**Artefacts attendus**
- Document `/docs/rgpd/REGISTRE_TRAITEMENTS.md`
- 5 traitements documentés :
  1. Authentification users
  2. Invocation Gateway LLM
  3. Gestion consentements IA
  4. Export/effacement RGPD
  5. Audit trail et logs système
- Accessible Super Admin (interface Back Office, lecture seule)
- Versioning (date dernière mise à jour)
- Validation DPO (signature électronique)

**Acceptance criteria (bloquants)**
- Document complet (finalités, bases légales, catégories données, destinataires, durées, sécurité)
- 5 traitements documentés
- Accessible interface Back Office
- Validation DPO

**Tests obligatoires**
- Tests E2E accès registre (Super Admin uniquement)

---

## LOT 12.5 — DPIA Gateway LLM (Art. 35)

**EPIC couverts** : EPIC 12 (Art. 35)

**Avant implémentation** : lire EPIC 12 (LOT 12.5).

**Objectif** : réaliser analyse d'impact DPIA pour traitement IA (risque élevé).

**Artefacts attendus**
- Document `/docs/rgpd/DPIA_GATEWAY_LLM.md`
- Contenu DPIA :
  1. Description systématique traitement (Gateway LLM, modèles, purposes)
  2. Nécessité et proportionnalité
  3. Évaluation risques (hallucinations, fuite PII, biais, contournement, accès non autorisé)
  4. Mesures atténuation (consentement, pseudonymisation EPIC 11, audit trail, chiffrement)
  5. Validation DPO (signature)
- Accessible Super Admin (interface Back Office, lecture seule)

**Acceptance criteria (bloquants)**
- Document DPIA complet (5 sections)
- 5 risques évalués (impact, vraisemblance, risque résiduel)
- Mesures atténuation documentées (EPICs 1-13)
- Validation DPO (signature)
- Accessible interface Back Office

**Tests obligatoires**
- Tests E2E accès DPIA (Super Admin/DPO uniquement)

---

## LOT 12.6 — Droits complémentaires (Art. 18, 21, 22)

**EPIC couverts** : EPIC 12 (Art. 18, 21, 22)

**Avant implémentation** : lire EPIC 12 (LOT 12.6).

**Objectif** : implémenter droits RGPD manquants (limitation, opposition, révision humaine).

**Artefacts attendus**
- **Art. 18 - Limitation** :
  - Bouton "Suspendre mes données" (My Data page)
  - Flag DB `users.data_suspended`
  - Effet : Bloc invocations LLM (HTTP 403)
  - Email confirmation suspension
  - Bouton "Réactiver mes données"
- **Art. 21 - Opposition** :
  - Page "Opposition traitement"
  - Formulaire : traitement concerné, motif
  - Workflow back-office : ticket support
  - Email confirmation
- **Art. 22 - Révision humaine** :
  - Bouton "Contester ce résultat" (outputs IA)
  - Formulaire : motif, upload preuve
  - Table DB `user_disputes`
  - Workflow back-office : admin révise, répond
  - Email réponse

**Acceptance criteria (bloquants)**
- Suspension données fonctionnelle (LLM bloqué)
- Réactivation fonctionnelle (LLM débloqué)
- Formulaire opposition fonctionnel (ticket créé)
- Workflow disputes fonctionnel (admin résout)
- Emails notifications envoyés
- Tests RGPD passants

**Tests obligatoires**
- tests/rgpd.data-suspension.test.ts (LLM bloqué si suspended)
- tests/rgpd.dispute-submission.test.ts (ticket créé)
- tests/rgpd.dispute-workflow.test.ts (admin résout, email envoyé)

---

# EPIC 13 — Incident Response & Security Hardening

## LOT 13.0 — Runbook "Incident RGPD"

**EPIC couverts** : EPIC 13 (Art. 33-34)

**Avant implémentation** : lire EPIC 13 + `docs/epics/EPIC_13_Incident_Response_Security_Hardening.md`.

**Objectif** : créer processus complet gestion violations données (Art. 33-34).

**Artefacts attendus**
- Runbook `/docs/runbooks/INCIDENT_RGPD.md`
- Configuration alertes monitoring (`config/alerts.yaml`)
- Détection automatique violations :
  - Brute force (> 10 failed logins / 5 min)
  - Cross-tenant access (ANY)
  - Export massif (> 10k records/h)
  - PII logs détectée (EPIC 11)
  - Backup failures (2× consécutifs)
- Workflow escalade (DPO, CNIL, users)
- Grille évaluation risque (faible/élevé)
- Table DB `data_breaches` (registre violations Art. 33.5)
- Templates notification :
  - `/docs/templates/NOTIFICATION_CNIL.md`
  - `/docs/templates/NOTIFICATION_USERS.md`
- Interface Back Office registre violations (CRUD, export CSV)

**Acceptance criteria (bloquants)**
- Runbook documenté (workflow, timeline 72h, checklist)
- Alertes configurées (Prometheus/AlertManager)
- Table `data_breaches` créée (migration `005_data_breaches.sql`)
- Interface Back Office fonctionnelle (liste, ajout, export)
- Templates notification créés et validés juridiquement
- Tests E2E détection incidents

**Tests obligatoires**
- tests/rgpd.incident-detection.test.ts (brute force, cross-tenant)
- tests/rgpd.data-breaches.test.ts (CRUD registre)

---

## LOT 13.1 — Pentest & Vulnerability Scanning

**EPIC couverts** : EPIC 13 (Art. 32)

**Avant implémentation** : lire EPIC 13 (LOT 13.1).

**Objectif** : identifier et corriger vulnérabilités sécurité (OWASP Top 10).

**Artefacts attendus**
- Scan OWASP ZAP exécuté (rapport HTML)
- Scan npm audit/Snyk exécuté (rapport)
- Pentest manuel 20 scénarios minimum :
  - Auth (brute force, JWT manipulation)
  - RBAC/ABAC (élévation privilèges, cross-tenant)
  - Gateway LLM (bypass consentement, injection prompts)
  - Export RGPD (IDOR, DoS)
  - API inputs (SQL injection, XSS, path traversal)
- Rapport final `/docs/security/PENTEST_REPORT_[DATE].md`
- Corrections vulnérabilités critiques/hautes (100%)
- Plan remédiation vulnérabilités moyennes

**Acceptance criteria (bloquants)**
- Scans exécutés (rapports générés)
- Vulnérabilités critiques : 0
- Vulnérabilités hautes : corrigées ou plan remédiation
- Rapport pentest complet (vulnérabilités, PoC, remédiation)
- Tests régression validant corrections

**Commandes**
```bash
pnpm audit --audit-level=high
npx snyk test --severity-threshold=high
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://app.example.com
```

**Tests obligatoires**
- Tests régression post-corrections (vulnérabilités corrigées)

---

## LOT 13.2 — Chaos Engineering & Résilience

**EPIC couverts** : EPIC 13 (Art. 32)

**Avant implémentation** : lire EPIC 13 (LOT 13.2).

**Objectif** : tester résilience infrastructure (disponibilité, backup/restore).

**Artefacts attendus**
- Tests chaos (5 scénarios minimum) :
  1. Kill random pod (auto-restart)
  2. Kill DB replica (failover automatique)
  3. Network latency +500ms (timeouts gérés)
  4. CPU spike 100% (throttling gracieux)
  5. Disk full (alertes + purge auto)
- Tests backup/restore :
  - Backup automatique quotidien (cron)
  - Restore complet (< 4h RTO)
  - Restore partiel (table spécifique)
  - Point-in-time recovery (< 1h RPO)
- Tests failover :
  - DB primary failure (promotion replica < 30s)
  - Load balancer failure (reroute traffic)
- Runbook `/docs/runbooks/BACKUP_RESTORE.md`
- Rapport `/docs/testing/CHAOS_REPORT_[DATE].md`

**Acceptance criteria (bloquants)**
- Tests chaos exécutés (5 scénarios)
- Service reste disponible (uptime > 99%)
- Alertes déclenchées correctement
- Auto-recovery fonctionne (< 30s downtime)
- Backup/restore testé (RTO < 4h, RPO < 1h)
- Failover DB testé (< 30s)
- Runbook backup/restore documenté

**Tests obligatoires**
- tests/infra.backup.test.ts (backup quotidien créé)
- tests/infra.restore.test.ts (restore complet réussi)
- tests/infra.failover.test.ts (promotion replica < 30s)
- tests/infra.chaos.test.ts (service continue après kill pod)

---