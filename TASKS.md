# TASKS.md — Roadmap d’exécution (Next.js backend FULL RGPD)

> **But** : permettre à Claude Code de construire **pas à pas** une plateforme **backend Next.js** (API + services) **FULL RGPD**, en couvrant **EPIC 1 → EPIC 7** et en respectant les markdowns normatifs.

---

## 0 - Références normatives (obligatoires)

Claude Code **DOIT** appliquer, pour chaque lot, les documents suivants :

- `CLAUDE.md` (constitution + règles non négociables + DoD)
- `docs/architecture/BOUNDARIES.md`
- `docs/ai/LLM_USAGE_POLICY.md`
- `docs/data/DATA_CLASSIFICATION.md`
- `docs/testing/RGPD_TESTING.md`

Références de cadrage (utiles) :
- `docs/epics/EPIC-1.md` … `docs/epics/EPIC-7.md` (ou emplacement équivalent)
- `00 - Analyse de l'objectif` (pdf/doc)
- `03 - Plan de déploiement` (doc)

> **Règle** : si un lot mentionne un EPIC, Claude **DOIT** relire cet EPIC avant d’implémenter.

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


