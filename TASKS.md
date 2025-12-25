# TASKS.md — Roadmap d'exécution (Plateforme RGPD-IA complète)

> **But** : permettre à Claude Code de construire **pas à pas** une plateforme **complète (backend + frontends)** **FULL RGPD**, en couvrant **EPIC 1 → EPIC 10** et en respectant les markdowns normatifs.
>
> **Périmètre** :
> - **EPIC 1-7** : Backend Next.js (API + services + infra)
> - **EPIC 8-9** : Back Office (Super Admin + Tenant Admin)
> - **EPIC 10** : Front User (interface utilisateur final)

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

### Phase 1 : Backend (EPIC 1-7) — 🔴 PRIORITAIRE
**Objectif** : API backend complète, production-ready, RGPD-compliant

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

### Phase 3 : Front User (EPIC 10) — 🟢 EN DERNIER
**Objectif** : Interface utilisateur final pour utiliser l'IA

**Ordre recommandé** :
1. ❌ **EPIC 10** : Front User (AI Tools + My Data + RGPD)

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
