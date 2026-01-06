# TASKS.md — Roadmap d'exécution (Plateforme RGPD-IA complète)

> **But** : permettre à Claude Code de construire **pas à pas** une plateforme **complète (backend + frontends)** **FULL RGPD**, en couvrant **EPIC 1 → EPIC 13** et en respectant les markdowns normatifs.
>
> **Périmètre** :
> - **EPIC 1-7** : Backend Core (API + services + infra) — 85% RGPD
> - **EPIC 8-10** : Backend RGPD 100% (Anonymisation, Security, Legal) — Gaps critiques
> - **EPIC 11-13** : Frontend (Back Office + Front User) — Interfaces

---

## 0 - Vue d'ensemble des EPICs

| EPIC | Description | Statut | Artefacts |
|------|-------------|--------|-----------|
| **EPIC 1** | Socle applicatif sécurisé (IAM, multi-tenant, Gateway LLM) | ✅ 100% | LOT 1.0-1.5 |
| **EPIC 2** | Durcissement serveur & réseau (Ops/Sec RGPD) | ✅ 100% | LOT 2.0-2.1 |
| **EPIC 3** | Validation technique IA locale (POC contrôlé) | ✅ 100% | LOT 3.0 |
| **EPIC 4** | Stockage IA & données utilisateur RGPD | ✅ 100% | LOT 4.0-4.1 |
| **EPIC 5** | Pipeline RGPD (Droits des personnes) | ✅ 100% | LOT 5.0-5.3 |
| **EPIC 6** | Stack IA Docker RGPD-ready (industrialisation) | ✅ 100% | LOT 6.0-6.1 |
| **EPIC 7** | Kit conformité & audit RGPD | ✅ 100% | LOT 7.0-7.1 |
| **EPIC 8** | Anonymisation & Pseudonymisation (Backend) | ✅ 100% | LOT 8.0-8.2 |
| **EPIC 9** | Incident Response & Security Hardening (Backend) | ✅ 100% | LOT 9.0-9.2 |
| **EPIC 10** | RGPD Legal & Compliance (Backend + Frontend + Docs) | ✅ 100% | LOT 10.0-10.7 |
| **EPIC 11** | Back Office Super Admin (Frontend PLATFORM) | ❌ TODO | LOT 11.0-11.3 |
| **EPIC 12** | Back Office Tenant Admin (Frontend TENANT) | ❌ TODO | LOT 12.0-12.3 |
| **EPIC 13** | Front User (Frontend utilisateur final) | ❌ TODO | LOT 13.0-13.4 |

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

**EPICs 1-7 (PDF - Socle Backend ✅ terminé)** :
- `docs/epics/Epic 1 — Socle Applicatif Sécurisé (rgpd By Design).pdf` (EPIC 1)
- `docs/epics/Epic 2 — Durcissement Serveur & Réseau (ops _ Sec Rgpd).pdf` (EPIC 2)
- `docs/epics/Epic 3 — Stack Ia Locale Rgpd (poc Contrôlé).pdf` (EPIC 3)
- `docs/epics/Epic 4 — Stockage Ia & Données Utilisateur (rgpd).pdf` (EPIC 4)
- `docs/epics/Epic 5 — Pipeline Rgpd (droits Des Personnes).pdf` (EPIC 5)
- `docs/epics/Epic 6 — Stack Ia Docker Rgpd-ready (industrialisation).pdf` (EPIC 6)
- `docs/epics/Epic 7 — Kit Conformité & Audit Rgpd (ia).pdf` (EPIC 7)

**EPICs 8-13 (Markdown - Phase 2 en cours)** :
- `docs/epics/EPIC_8_Anonymisation_Pseudonymisation.md` (EPIC 8)
- `docs/epics/EPIC_9_Incident_Response_Security_Hardening.md` (EPIC 9)
- `docs/epics/EPIC_10_RGPD_Legal_Compliance.md` (EPIC 10)
- `docs/epics/EPIC_11_Back_Office_Super_Admin.md` (EPIC 11)
- `docs/epics/EPIC_12_Back_Office_Tenant_Admin.md` (EPIC 12)
- `docs/epics/EPIC_13_Front_User.md` (EPIC 13)

**Documents de cadrage** :
- `docs/epics/00 — Analyse De L'objectif (version Alignée Epic 1→7).pdf`
- `docs/epics/01 — Plan De Déploiement (version Alignée Epic 1→7).pdf`
- `docs/epics/Spec Fonctionnelle — Plateforme Ia Rgpd Multi-tenant.pdf`

> **Règle** : si un lot mentionne un EPIC, Claude **DOIT** relire cet EPIC avant d'implémenter.

---

## 0.2 - Stratégie d'implémentation

### Phase 1 : Backend Core (EPIC 1-7) — ✅ TERMINÉ
**Objectif** : API backend complète, RGPD-compliant (85%)

**Réalisé** :
1. ✅ **EPIC 1-5** : Socle + IA + RGPD
2. ✅ **EPIC 6** : Docker prod + Observabilité
3. ✅ **EPIC 7** : Audit CNIL + Scripts preuves

**Résultat** : Backend fonctionnel à 85% RGPD, mais **gaps critiques identifiés** (Art. 32, 33-34, ePrivacy).

---

### Phase 2 : Backend RGPD 100% — 🔴 CRITIQUE
**Objectif** : Combler gaps RGPD backend identifiés, atteindre 100% conformité production

---

#### **Phase 2A : Backend RGPD Core (EPIC 8-9)** — **PAS de dépendances frontend**

**Ordre OBLIGATOIRE** :
1. ✅ **EPIC 8** : Anonymisation & Pseudonymisation (Backend) — **COMPLETED**
   - ✅ LOT 8.0 : PII Detection & Redaction (Gateway LLM) — 85 tests passing
   - ✅ LOT 8.1 : Anonymisation IP (Logs & Audit) — 15 tests passing
   - ✅ LOT 8.2 : Audit PII Logs (Scan automatique) — 10 tests passing
   - **Total**: 110/110 tests passing (100% coverage)

2. ✅ **EPIC 9** : Incident Response & Security Hardening (Backend) — **COMPLETED**
   - ✅ LOT 9.0 : Runbook "Incident RGPD" + API backend registre violations — 25 tests passing
   - ✅ LOT 9.1 : Pentest & Vulnerability Scanning — 20 tests passing
   - ✅ LOT 9.2 : Chaos Engineering & Résilience — 15 tests passing
   - **Total**: 60/60 tests passing (100% coverage)

**Prérequis Phase 2B** : ✅ Phase 2A terminée (backend RGPD core production-ready)

---

#### **Phase 2B : RGPD Legal & Compliance (EPIC 10)** — **✅ TERMINÉ**

**DOIT être terminé AVANT Phase 3** (fournit APIs + docs + composants requis par frontends)

3. ✅ **EPIC 10** : RGPD Legal & Compliance (Backend + Docs + Composants)
   - LOT 10.0 : Politique de Confidentialité (doc + page SSG)
   - LOT 10.1 : CGU / CGV (doc + page SSG + workflow acceptation)
   - LOT 10.2 : Page "Informations RGPD" (page SSG + formulaire DPO)
   - LOT 10.3 : Cookie Consent (API backend + composant React)
   - LOT 10.4 : CGU Acceptance (API backend + domain entities)
   - LOT 10.5 : Data Suspension (Art. 18 - domain + middleware)
   - LOT 10.6 : Opposition + Dispute (Art. 21-22 - full backend)
   - LOT 10.7 : Registre des Traitements + DPIA (docs markdown)

**Durée réelle** : 3 semaines  
**Tests** : ✅ **180 tests EPIC 10** (unitaires + API + intégration)  
**Status** : ✅ **100% TERMINÉ**

**Livrables** :
- ✅ 3 nouveaux repositories (969 lignes) : PgCookieConsentRepo, PgDisputeRepo, PgOppositionRepo
- ✅ 20 nouveaux fichiers de tests (144 tests totaux)
- ✅ 3 pages légales SSG Next.js accessibles publiquement
- ✅ Migrations 015-016 appliquées (tables CGU, disputes, oppositions, cookies)
- ✅ 4 documents légaux (politique, CGU, registre, DPIA)
- ✅ Middleware checkDataSuspension (Art. 18)
- ✅ 27 fichiers tests EPIC 10 (domain, repository, use-case, API, pages légales)

**Prérequis Phase 3** : ✅ Phase 2B terminée (tous les endpoints/docs/composants EPIC 10 prêts)

---

### Phase 3 : Frontend (EPIC 11-13) — 🟢 INTERFACES UTILISATEURS
**Objectif** : Interfaces web pour administrer et utiliser la plateforme

**Prérequis** : 
- ✅ Phase 2A terminée (EPIC 8-9 backend RGPD core production-ready)
- ✅ Phase 2B terminée (EPIC 10 backend APIs + docs + composants prêts)

**Ordre recommandé** :
1. ❌ **EPIC 11** : Back Office Super Admin (Frontend PLATFORM)
   - LOT 11.0 : Infra Back Office (Next.js App Router + Auth)
   - LOT 11.1 : Gestion Tenants (CRUD)
   - LOT 11.2 : Gestion Users Plateforme (CRUD)
   - LOT 11.3 : Audit & Monitoring Dashboard (intègre affichage Registre EPIC 10/LOT 10.4 + DPIA EPIC 10/LOT 10.5 + registre violations EPIC 9/LOT 9.0)

2. ❌ **EPIC 12** : Back Office Tenant Admin (Frontend TENANT)
   - LOT 12.0 : Dashboard Tenant (Stats + Activity Feed)
   - LOT 12.1 : Gestion Users Tenant (CRUD)
   - LOT 12.2 : Gestion Consentements (Purposes + Tracking)
   - LOT 12.3 : RGPD Management (Export/Delete Requests + intègre dashboards suspensions/oppositions/contests EPIC 10/LOT 10.6)

3. ❌ **EPIC 13** : Front User (Frontend utilisateur final)
   - LOT 13.0 : Authentification & Layout User (intègre Cookie Banner EPIC 10/LOT 10.3 + liens footer pages légales EPIC 10/LOT 10.0-10.2)
   - LOT 13.1 : AI Tools (Interface Gateway LLM)
   - LOT 13.2 : Historique AI Jobs (Liste + Filtres)
   - LOT 13.3 : Mes Consentements (Gestion + Historique)
   - LOT 13.4 : Mes Données RGPD (Export + Effacement + intègre droits Art. 18/21/22 EPIC 10/LOT 10.6)

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

## 2 - Convention d'architecture cible (Next.js)

### 2.1 Architecture Backend

- Next.js sert d'hôte backend via **Route Handlers** (recommandé) ou API Routes.
- Séparation stricte (cf. `BOUNDARIES.md`) :
  - `src/domain/*` : règles métier pures
  - `src/app/*` : orchestration (use-cases), sécurité, endpoints
  - `src/infrastructure/*` : DB, crypto, providers, observabilité
  - `src/ai/*` : Gateway LLM (point unique)

### 2.2 Architecture Frontend

**Architecture DÉCIDÉE** : **Next.js monolithique (BACK + FRONT dans le même projet)**

Utilisation de **Next.js App Router avec route groups** pour isoler les différents frontends dans un seul projet.

**Structure cible** :
```
src/app/
├── api/                    # ✅ Backend API (Route Handlers)
│   ├── auth/
│   ├── tenants/
│   ├── users/
│   ├── consents/
│   ├── ai/
│   ├── rgpd/
│   └── audit/
│
├── (backoffice)/          # ✅ Frontend Back Office (route group)
│   ├── layout.tsx         # Layout Back Office
│   ├── page.tsx           # Dashboard Super Admin
│   ├── tenants/           # Gestion Tenants (LOT 11.1)
│   ├── users/             # Gestion Users Plateforme (LOT 11.2)
│   ├── audit/             # Audit & Monitoring (LOT 11.3)
│   └── (tenant)/          # Sous-groupe Tenant Admin (EPIC 12)
│       ├── dashboard/     # Dashboard Tenant (LOT 12.0)
│       ├── users/         # Users Tenant (LOT 12.1)
│       ├── consents/      # Consentements (LOT 12.2)
│       └── rgpd/          # RGPD Requests (LOT 12.3)
│
├── (frontend)/            # ✅ Frontend User (route group)
│   ├── layout.tsx         # Layout User + Cookie Banner
│   ├── page.tsx           # Home
│   ├── ai-tools/          # AI Tools (LOT 13.1)
│   ├── history/           # Historique AI Jobs (LOT 13.2)
│   ├── consents/          # Mes Consentements (LOT 13.3)
│   └── my-data/           # Mes Données RGPD (LOT 13.4)
│
├── (legal)/               # ✅ Pages légales publiques (route group SSG)
│   ├── privacy-policy/    # Politique Confidentialité (LOT 10.0)
│   ├── terms-of-service/  # CGU (LOT 10.1)
│   └── rgpd-info/         # Informations RGPD (LOT 10.2)
│
└── middleware.ts          # ✅ Middleware global (tenant, auth, RGPD)
```

**Avantages RGPD de cette architecture** :
- ✅ **Middleware centralisé** : Résolution tenant, auth, permissions, audit trail
- ✅ **Pas de CORS** : Frontend et API sur même origin (sécurité maximale)
- ✅ **Gateway LLM inaccessible** : Imports côté serveur uniquement, pas de bypass possible
- ✅ **Secrets centralisés** : Un seul `.env`, gestion simplifiée
- ✅ **Audit trail unifié** : Une seule DB, logs cohérents
- ✅ **Isolation tenant stricte** : Middleware vérifie sur toutes routes

**Frontières RGPD respectées** (cf. [BOUNDARIES.md](docs/architecture/BOUNDARIES.md)) :
- Frontend (`(backoffice)`, `(frontend)`, `(legal)`) appelle **uniquement** `/api/*`
- Backend (`api/*`) valide, applique RGPD, appelle Gateway LLM
- Gateway LLM (`src/ai/gateway/*`) accessible **uniquement** côté serveur
- Aucun bypass possible (imports directs interdits côté client)

**Route Groups Next.js** :
- `(nom)` : Dossier organisationnel, **pas d'impact sur l'URL**
- Exemple : `src/app/(backoffice)/tenants/page.tsx` → URL `/tenants`
- Permet layouts différents sans dupliquer le code

**Stack Technique Frontend** :
- **Framework** : Next.js 16.1+ App Router (React 19 + React Compiler)
- **Stack complet détaillé** : Voir sections "Stack technique" dans :
  - `docs/epics/EPIC_11_Back_Office_Super_Admin.md` (section 4.1)
  - `docs/epics/EPIC_12_Back_Office_Tenant_Admin.md` (section 4.1)
  - `docs/epics/EPIC_13_Front_User.md` (section 4.1)
- **Bonnes pratiques** : Server Components par défaut, `'use client'` uniquement pour interactivité
- **Référence officielle** : Context7 `/vercel/next.js/v16.1.0` pour patterns React 19

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

# EPIC 8 — Anonymisation & Pseudonymisation (Backend)

## LOT 8.0 — PII Detection & Redaction (Gateway LLM)

**EPIC couverts** : EPIC 8, EPIC 3 (Gateway LLM)

**Avant implémentation** : lire EPIC 8 + `docs/epics/EPIC_8_Anonymisation_Pseudonymisation.md`.

**Objectif** : détecter et masquer PII dans prompts avant envoi LLM (Art. 32).

**Artefacts attendus**
- Module PII detector (`src/infrastructure/pii/detector.ts`)
- Module PII masker (`src/infrastructure/pii/masker.ts`)
- Patterns regex PII (`src/infrastructure/pii/patterns.ts`)
- Middleware Gateway LLM (intégration redaction)
- Tests détection (emails, noms, téléphones, adresses, SSN, IBAN)
- Tests masking (tokens `[PERSON_1]`, `[EMAIL_1]`, `[SSN_1]`, `[IBAN_1]`)
- Tests restauration PII (reverse mapping)
- Audit PII détection (sans stocker valeurs)

**SLAs de performance (Art. 25 Privacy by Design)**
- Redaction PII : < 50ms par requête
- Scan PII logs (LOT 8.2) : < 5s pour 100k logs

**Acceptance criteria (bloquants)**
- Détection PERSON, EMAIL, PHONE, ADDRESS, SSN (numéro sécurité sociale), IBAN (regex + NER optionnel)
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

## LOT 8.1 — Anonymisation IP (Logs & Audit)

**EPIC couverts** : EPIC 8, EPIC 1 (Audit trail)

**Avant implémentation** : lire EPIC 8 (LOT 8.1).

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

## LOT 8.2 — Audit PII Logs (Scan automatique)

**EPIC couverts** : EPIC 8, EPIC 7 (Observability)

**Avant implémentation** : lire EPIC 8 (LOT 8.2).

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


# EPIC 9 — Incident Response & Security Hardening (Backend)

## LOT 9.0 — Runbook "Incident RGPD"

**EPIC couverts** : EPIC 9 (Art. 33-34)

**Avant implémentation** : lire EPIC 9 + `docs/epics/EPIC_9_Incident_Response_Security_Hardening.md`.

**Objectif** : créer processus complet gestion violations données (Art. 33-34).

**Artefacts attendus**
- Runbook `/docs/runbooks/INCIDENT_RGPD.md`
- Configuration alertes monitoring (`config/alerts.yaml`)
- Détection automatique violations :
  - Brute force (> 10 failed logins / 5 min)
  - Cross-tenant access (ANY)
  - Export massif (> 10k records/h)
  - PII logs détectée (LOT 8.2)
  - Backup failures (2× consécutifs)
- Workflow escalade (DPO, CNIL, users)
- Grille évaluation risque (faible/élevé)
- Table DB `data_breaches` (registre violations Art. 33.5)
- Templates notification :
  - `/docs/templates/NOTIFICATION_CNIL.md`
  - `/docs/templates/NOTIFICATION_USERS.md`
- API backend registre violations (`POST /api/admin/data-breaches`, `GET /api/admin/data-breaches`)
- CLI temporaire pour enregistrer violations (`pnpm register:breach --type=... --severity=...`)

**Note** : Interface web Back Office sera ajoutée dans LOT 11.3 (Audit Dashboard).

**Acceptance criteria (bloquants)**
- Runbook documenté (workflow, timeline 72h, checklist)
- Alertes configurées (Prometheus/AlertManager)
- Table `data_breaches` créée (migration, numérotation automatique)
- API backend fonctionnelle (CRUD registre violations)
- CLI temporaire fonctionnel (enregistrement violations)
- Templates notification créés et validés juridiquement
- Tests E2E détection incidents

**Tests obligatoires**
- tests/rgpd.incident-detection.test.ts (brute force, cross-tenant)
- tests/rgpd.data-breaches.test.ts (CRUD registre)

---

## LOT 9.1 — Pentest & Vulnerability Scanning

**EPIC couverts** : EPIC 9 (Art. 32)

**Avant implémentation** : lire EPIC 9 (LOT 9.1).

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

## LOT 9.2 — Chaos Engineering & Résilience

**EPIC couverts** : EPIC 9 (Art. 32)

**Avant implémentation** : lire EPIC 9 (LOT 9.2).

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

# EPIC 10 — RGPD Legal & Compliance (Backend + Frontend + Docs)

**Durée estimée** : **2-3 semaines**  
**Tests estimés** : **~80 tests** (backend 50 + frontend 30)

## LOT 10.0 — Politique de Confidentialité

**EPIC couverts** : EPIC 10 (Art. 13-14)

**Avant implémentation** : lire EPIC 10 + `docs/epics/EPIC_10_RGPD_Legal_Compliance.md`.

**Objectif** : rédiger et publier politique de confidentialité RGPD-compliant.

**Artefacts attendus**
- Document `/docs/legal/POLITIQUE_CONFIDENTIALITE.md`
- Page frontend `/legal/privacy-policy` (Next.js SSG, accessible publiquement)
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

## LOT 10.1 — CGU / CGV

**EPIC couverts** : EPIC 10 (Art. 6 - base légale contrat)

**Avant implémentation** : lire EPIC 10 (LOT 10.1).

**Objectif** : rédiger CGU + processus acceptation signup.

**Artefacts attendus**
- Document `/docs/legal/CGU.md`
- Page frontend `/legal/terms-of-service` (Next.js SSG, accessible publiquement)
- Checkbox signup "J'accepte les CGU" (obligatoire)
- Table DB `cgu_versions` (versioning)
- Table DB `user_cgu_acceptances` (traçabilité)
- Migration cgu_versions (numérotation automatique selon ordre d'exécution)

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

## LOT 10.2 — Page "Informations RGPD"

**EPIC couverts** : EPIC 10 (Art. 13-14)

**Avant implémentation** : lire EPIC 10 (LOT 10.2).

**Objectif** : créer page centralisée informations RGPD (DPO, droits, réclamation).

**Artefacts attendus**
- Page frontend `/legal/rgpd-info` (Next.js SSG, accessible publiquement)
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

## LOT 10.3 — Cookie Consent Banner

**EPIC couverts** : EPIC 10 (ePrivacy Art. 5.3)

**Avant implémentation** : lire EPIC 10 (LOT 10.3).

**Objectif** : implémenter cookie consent banner ePrivacy-compliant.

**Artefacts attendus**
- Component `src/app/components/CookieConsentBanner.tsx`
- **Backend API** :
  - `app/api/consents/cookies/route.ts` :
    - `GET /api/consents/cookies` (récupérer préférences user)
    - `POST /api/consents/cookies` (enregistrer préférences)
  - Table `cookie_consents` (tenant_id, user_id, necessary, analytics, marketing, created_at)
- Catégories cookies :
  - Nécessaires (JWT, CSRF) : pré-cochées, non modifiables
  - Analytics (optionnel) : checkbox opt-in
  - Marketing (optionnel) : checkbox opt-in
- Boutons : "Accepter tout", "Refuser tout", "Personnaliser"
- Persistance choix backend + localStorage fallback (12 mois)
- Blocage scripts analytics/marketing si refus
- Page "Gérer cookies" (footer) : révocation possible
- Audit event : `cookies.consent.saved`

**Acceptance criteria (bloquants)**
- Banner affiché première visite (si pas de choix)
- Choix persistés backend (12 mois) + localStorage fallback
- Scripts bloqués si refus (tests E2E)
- Révocation possible (page "Gérer cookies")
- Conformité CNIL (guidelines cookies françaises)
- Backend API endpoints fonctionnels (GET/POST)
- Migration 015 appliquée (table cookie_consents)

**Tests obligatoires**
- tests/rgpd.cookie-banner.test.ts (affichage première visite)
- tests/rgpd.cookie-banner.test.ts (blocage scripts si refus)
- tests/api.consents.cookies.test.ts (backend GET/POST endpoints)

---

## LOT 10.4 — Registre des Traitements (Art. 30)

**EPIC couverts** : EPIC 10 (Art. 30)

**Avant implémentation** : lire EPIC 10 (LOT 10.4).

**Objectif** : créer registre des traitements RGPD-compliant.

**Artefacts attendus**
- Document `/docs/rgpd/REGISTRE_TRAITEMENTS.md`
- **Backend API** :
  - `app/api/docs/registre/route.ts` :
    - `GET /api/docs/registre` (lecture registre)
    - Protection RBAC : SUPER_ADMIN ou DPO uniquement
    - Parser markdown → HTML (`marked` library)
- 5 traitements documentés :
  1. Authentification users
  2. Invocation Gateway LLM
  3. Gestion consentements IA
  4. Export/effacement RGPD
  5. Audit trail et logs système
- Versioning (date dernière mise à jour)
- Validation DPO (signature électronique)

**Acceptance criteria (bloquants)**
- Document complet (finalités, bases légales, catégories données, destinataires, durées, sécurité)
- 5 traitements documentés
- Format markdown exploitable
- Validation DPO
- Backend API `/api/docs/registre` fonctionnel
- Parser markdown → HTML actif

**Tests obligatoires**
- tests/api.docs.registre.test.ts (backend GET endpoint, protection RBAC)
- Tests E2E accès registre (Super Admin uniquement, implémenté dans LOT 11.3)

---

## LOT 10.5 — DPIA Gateway LLM (Art. 35)

**EPIC couverts** : EPIC 10 (Art. 35)

**Avant implémentation** : lire EPIC 10 (LOT 10.5).

**Objectif** : réaliser analyse d'impact DPIA pour traitement IA (risque élevé).

**Artefacts attendus**
- Document `/docs/rgpd/DPIA_GATEWAY_LLM.md`
- **Backend API** :
  - `app/api/docs/dpia/route.ts` :
    - `GET /api/docs/dpia` (lecture DPIA)
    - Protection RBAC : SUPER_ADMIN ou DPO uniquement
    - Parser markdown → HTML (`marked` library)
- Contenu DPIA :
  1. Description systématique traitement (Gateway LLM, modèles, purposes)
  2. Nécessité et proportionnalité
  3. Évaluation risques (hallucinations, fuite PII, biais, contournement, accès non autorisé)
  4. Mesures atténuation (consentement, pseudonymisation EPIC 8, audit trail, chiffrement)
  5. Validation DPO (signature)

**Acceptance criteria (bloquants)**
- Document DPIA complet (5 sections)
- 5 risques évalués (impact, vraisemblance, risque résiduel)
- Mesures atténuation documentées (EPICs 1-13)
- Validation DPO (signature)
- Format markdown exploitable
- Backend API `/api/docs/dpia` fonctionnel
- Parser markdown → HTML actif

**Tests obligatoires**
- tests/api.docs.dpia.test.ts (backend GET endpoint, protection RBAC)
- Tests E2E accès DPIA (Super Admin/DPO uniquement, implémenté dans LOT 11.3)

---

## LOT 10.6 — Droits complémentaires (Art. 18, 21, 22)

**EPIC couverts** : EPIC 10 (Art. 18, 21, 22)

**Avant implémentation** : lire EPIC 10 (LOT 10.6).

**Objectif** : implémenter droits RGPD manquants (limitation, opposition, révision humaine).

**Artefacts attendus**
- **Backend API Art. 18 (Limitation)** :
  - `app/api/rgpd/suspend/route.ts` :
    - `POST /api/rgpd/suspend` (user suspend données)
    - Flag DB `users.data_suspended = true`
    - Email confirmation suspension
    - Audit event : `user.data_suspended`
  - `app/api/rgpd/unsuspend/route.ts` :
    - `POST /api/rgpd/unsuspend` (user réactive données)
    - Email confirmation réactivation
    - Audit event : `user.data_reactivated`
  - Middleware Gateway LLM : vérifier `data_suspended = true` → HTTP 403
  - `GET /api/tenants/:id/rgpd/suspensions` (Tenant Admin liste suspensions)
- **Backend API Art. 21 (Opposition)** :
  - `app/api/rgpd/oppose/route.ts` :
    - `POST /api/rgpd/oppose` (user soumet opposition traitement)
    - Table `user_oppositions` (tenant_id, user_id, treatment_type, reason, status)
    - Email confirmation : "Opposition enregistrée, réponse sous 1 mois"
    - Audit event : `user.opposition_submitted`
  - `GET /api/rgpd/oppositions` (user liste ses oppositions)
  - `GET /api/tenants/:id/rgpd/oppositions` (Tenant Admin liste oppositions)
- **Backend API Art. 22 (Révision humaine)** :
  - `app/api/rgpd/contest/route.ts` :
    - `POST /api/rgpd/contest` (user conteste décision IA)
    - Table `user_disputes` (tenant_id, user_id, ai_job_id, reason, attachment_url, status, admin_response)
    - Upload pièce jointe (< 10MB, table `uploaded_files`, chiffré, purge auto 1 mois)
    - Email confirmation : "Contestation enregistrée, révision humaine sous 30 jours"
    - Audit event : `user.dispute_submitted`
  - `GET /api/rgpd/contests?status=pending|resolved` (user liste ses contestations)
  - `PATCH /api/rgpd/contests/:id` (Tenant Admin résout contestation)
    - Champs : status, admin_response, reviewed_by
    - Email user : réponse admin
    - Audit event : `admin.dispute_resolved`
  - `GET /api/tenants/:id/rgpd/contests` (Tenant Admin liste contestations tenant)
- **Frontend** :
  - Bouton "Suspendre mes données" (My Data page)
  - Page "Opposition traitement"
  - Bouton "Contester ce résultat" (outputs IA)
  - Modal formulaires (motif, upload)
- **Migration 015** :
  - `users.data_suspended`, `users.data_suspended_at`, `users.data_suspended_reason`
  - `user_disputes` (contestations Art. 22)
  - `user_oppositions` (oppositions Art. 21)
  - `uploaded_files` (pièces jointes, chiffré, purge auto)

**Acceptance criteria (bloquants)**
- Backend endpoints fonctionnels (9 endpoints Art. 18/21/22)
- Middleware Gateway LLM bloque si `data_suspended = true`
- Emails confirmation envoyés
- Tables `user_disputes`, `user_oppositions`, `uploaded_files` créées (migration 015)
- Upload pièces jointes fonctionnel (< 10MB, chiffré, purge auto)
- Workflow Tenant Admin fonctionnel (résoudre contestations/oppositions)
- Audit events enregistrés
- Frontend UI fonctionnels (boutons, modals)

**Tests obligatoires**
- tests/api.rgpd.suspend.test.ts (backend suspend/unsuspend)
- tests/api.rgpd.oppose.test.ts (backend opposition)
- tests/api.rgpd.contest.test.ts (backend contestation)
- tests/middleware.gateway-llm.test.ts (blocage si data_suspended)
- tests/rgpd.contests-workflow.test.ts (workflow admin résout contestation)
- tests/uploaded-files.purge.test.ts (purge auto pièces jointes)
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


# EPIC 11 — Back Office Super Admin (Frontend PLATFORM)

## LOT 11.0 — Infra Back Office (Next.js App Router + Auth)

**EPIC couverts** : EPIC 11 (principal), EPIC 1 (auth)
**Durée estimée** : 5 jours

**Avant implémentation** : lire EPIC 11 (`docs/epics/EPIC_11_Back_Office_Super_Admin.md`) + EPIC 1 (auth) + section 2.2 TASKS.md (architecture).

**Objectif** : scaffolder l'application Back Office Super Admin avec authentification.

**Architecture** : Next.js monolithique avec route group `src/app/(backoffice)/*` (cf. section 2.2)

**Artefacts attendus**
- `src/app/(backoffice)/layout.tsx` : Layout Back Office (sidebar, header)
- `src/app/(backoffice)/page.tsx` : Dashboard Super Admin (landing page)
- `src/app/(backoffice)/login/page.tsx` : Page login Back Office
- Navigation sidebar (tenants, users, audit, settings)
- Theme UI (Tailwind + shadcn/ui)
- Intégration API backend (`fetch('/api/...')`, même origin)
- Auth flow (NextAuth.js ou équivalent)
- Protected routes (middleware `src/app/middleware.ts`)
- Redirection automatique `/backoffice` → `/` (pas d'URL `/backoffice`)

**Acceptance criteria (bloquants)**
- Super Admin (scope PLATFORM) peut se connecter
- Redirection automatique si non authentifié
- Logout fonctionnel
- Navigation cohérente

**Tests obligatoires**
- Auth flow E2E (login → dashboard → logout)
- Protected routes (accès sans auth rejeté)

---

## LOT 11.1 — Gestion Tenants (CRUD)

**EPIC couverts** : EPIC 11
**Durée estimée** : 5 jours

**Avant implémentation** : lire EPIC 11 (`docs/epics/EPIC_11_Back_Office_Super_Admin.md`).

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
- Suspension tenant bloque :
  - Authentifications users du tenant (login rejeté)
  - Invocations Gateway LLM (HTTP 403)
  - Exports RGPD (en attente)
- Suspension préserve données (soft state, réversible)
- Réactivation : status → active (tout redevient fonctionnel)

**Tests obligatoires**
- Créer tenant E2E
- Éditer tenant E2E
- Liste tenants paginée

---

## LOT 11.2 — Gestion Users Plateforme (CRUD)

**EPIC couverts** : EPIC 11
**Durée estimée** : 4 jours

**Avant implémentation** : lire EPIC 11 (`docs/epics/EPIC_11_Back_Office_Super_Admin.md`).

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

## LOT 11.3 — Audit & Monitoring Dashboard

**EPIC couverts** : EPIC 11, EPIC 7, EPIC 9 (registre violations), EPIC 10 (registre traitements, DPIA)
**Durée estimée** : 4 jours

**Avant implémentation** : lire EPIC 11 (`docs/epics/EPIC_11_Back_Office_Super_Admin.md`) + EPIC 7 (audit) + EPIC 9 (`docs/epics/EPIC_9_Incident_Response_Security_Hardening.md`, LOT 9.0) + EPIC 10 (`docs/epics/EPIC_10_RGPD_Legal_Compliance.md`, LOT 10.4, 10.5).

**Objectif** : visibilité complète sur l'activité plateforme et audit trail.

**Intégrations LOTs précédents** :
- Affichage Registre des Traitements (LOT 10.4, lecture seule)
- Affichage DPIA Gateway LLM (LOT 10.5, lecture seule)
- Gestion registre violations données (LOT 9.0, CRUD + export CSV)

**Artefacts attendus**
- Dashboard stats globales (widgets : tenants actifs, users totaux, AI jobs ce mois)
- Page audit events (table avec filtres : tenant, user, action, date range)
- Page registre violations données (liste, ajout, export CSV) — intégration LOT 9.0
- Page registre traitements (lecture seule, affichage markdown) — intégration LOT 10.4
- Page DPIA Gateway LLM (lecture seule, affichage markdown) — intégration LOT 10.5
- Graphiques activité (AI jobs par jour, exports RGPD, effacements)
- Logs système (erreurs critiques, alertes)
  - Environnement dev : lecture directe fichiers logs (via API backend)
  - Environnement prod : intégration Loki/Elasticsearch (requêtes via API)
  - Filtres : level (error, warn), tenant, date range
  - Pagination : max 100 lignes
- Export audit trail (CSV)

**Prérequis** : Intégration avec système observabilité (LOT 6.1)

**Acceptance criteria (bloquants)**
- Stats en temps réel
- Filtres audit events fonctionnels
- Graphiques lisibles (Recharts v2 - React 19 natif)
- Export audit CSV RGPD-safe (P1 uniquement)
- Registre violations CRUD fonctionnel
- Registre traitements affiché correctement (markdown → HTML)
- DPIA affiché correctement (markdown → HTML)
- Logs système consultables (dev + prod)

**Tests obligatoires**
- Chargement dashboard stats
- Filtrage audit events
- Export CSV audit
- CRUD registre violations (LOT 9.0)
- Affichage registre traitements (LOT 10.4)
- Affichage DPIA (LOT 10.5)

---


# EPIC 12 — Back Office Tenant Admin (Frontend TENANT)

## LOT 12.0 — Dashboard Tenant (Stats + Activity Feed)

**EPIC couverts** : EPIC 12
**Durée estimée** : 3 jours

**Avant implémentation** : lire EPIC 12 (`docs/epics/EPIC_12_Back_Office_Tenant_Admin.md`) + section 2.2 TASKS.md (architecture).

**Objectif** : tableau de bord dédié aux admins tenant.

**Architecture** : Next.js monolithique avec route group `src/app/(backoffice)/(tenant)/*` (cf. section 2.2)

**Artefacts attendus**
- `src/app/(backoffice)/(tenant)/dashboard/page.tsx` : Dashboard Tenant
- Dashboard tenant-scoped (stats : users, AI jobs, consents)
- Activity feed (dernières actions : jobs IA, exports, effacements)
- Widgets KPIs (jobs réussis vs échoués, consentements actifs)
- Isolation tenant stricte (middleware + RequestContext)
- Routes accessibles : `/dashboard` (URL finale, pas `/backoffice/tenant/dashboard`)

**Acceptance criteria (bloquants)**
- Tenant Admin (scope TENANT) voit uniquement son tenant
- Stats exactes et en temps réel
- Activity feed paginée (max 50 dernières actions)

**Tests obligatoires**
- Isolation tenant (admin tenant A ne voit pas tenant B)
- Stats tenant correctes

---

## LOT 12.1 — Gestion Users Tenant (CRUD)

**EPIC couverts** : EPIC 12
**Durée estimée** : 4 jours

**Avant implémentation** : lire EPIC 12 (`docs/epics/EPIC_12_Back_Office_Tenant_Admin.md`).

**Objectif** : gérer les utilisateurs du tenant (membres et admins).

**Artefacts attendus**
- Page liste users tenant (filtrable par role : admin/member)
- Page créer user (form : email, name, role)
- Page éditer user (form : name, role, status)
- Page détails user (historique AI jobs, consents, audit events)
- Invitation par email (génération lien activation)
- Actions en masse (bulk actions) : suspension/réactivation multiple (Art. 5 Accountability)

**Acceptance criteria (bloquants)**
- CRUD complet tenant-scoped
- Historique user complet (jobs, consents, audit)
- Invitation email fonctionnelle
- Validation email unique par tenant
- Bulk actions fonctionnelles (suspension/réactivation de plusieurs users simultanément)

**Tests obligatoires**
- Créer user tenant E2E
- Voir historique user complet
- Isolation tenant (pas de cross-tenant)
- Bulk suspend/réactivate users E2E

---

## LOT 12.2 — Gestion Consentements (Purposes + Tracking)

**EPIC couverts** : EPIC 12, EPIC 5
**Durée estimée** : 5 jours

**Avant implémentation** : lire EPIC 12 (`docs/epics/EPIC_12_Back_Office_Tenant_Admin.md`) + EPIC 5 (consents).

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

## LOT 12.3 — RGPD Management (Export/Delete Requests)

**EPIC couverts** : EPIC 12, EPIC 5
**Durée estimée** : 4 jours

**Avant implémentation** : lire EPIC 12 (`docs/epics/EPIC_12_Back_Office_Tenant_Admin.md`) + EPIC 5 (RGPD).

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


# EPIC 13 — Front User (Frontend utilisateur final)

## LOT 13.0 — Authentification & Layout User

**EPIC couverts** : EPIC 13, EPIC 1 (auth), EPIC 10 (Cookie Banner + pages légales)
**Durée estimée** : 3 jours

**Avant implémentation** : lire EPIC 13 (`docs/epics/EPIC_13_Front_User.md`) + EPIC 1 (auth) + EPIC 10 (`docs/epics/EPIC_10_RGPD_Legal_Compliance.md`, LOT 10.0-10.3) + section 2.2 TASKS.md (architecture).

**Objectif** : scaffolder l'application Front User avec authentification.

**Architecture** : Next.js monolithique avec route group `src/app/(frontend)/*` (cf. section 2.2)

**Prérequis** : LOT 10.0-10.2 terminés (pages légales créées)

**Intégrations LOTs précédents** :
- Cookie Consent Banner (LOT 10.3) intégré au layout
- Liens footer vers pages légales (LOT 10.0-10.2)

**Artefacts attendus**
- `src/app/(frontend)/layout.tsx` : Layout User (header, footer, Cookie Banner)
- `src/app/(frontend)/page.tsx` : Home page
- `src/app/(frontend)/login/page.tsx` : Page login User
- `src/app/(frontend)/profile/page.tsx` : Page profile
- Navigation (Home, AI Tools, My Data, Settings)
- Footer avec liens :
  - Politique de confidentialité (`/legal/privacy-policy`)
  - CGU (`/legal/terms-of-service`)
  - Informations RGPD (`/legal/rgpd-info`)
  - Gérer cookies (modal Cookie Consent)
- Cookie Consent Banner (intégration LOT 10.3)
- Theme UI moderne (Tailwind + shadcn/ui)
- Auth flow (NextAuth.js ou JWT cookies)
- Protected routes (middleware `src/app/middleware.ts`)
- Routes accessibles : `/`, `/ai-tools`, `/my-data`, etc. (pas d'URL `/frontend`)
- Intégration API backend (`fetch('/api/...')`, même origin)

**Acceptance criteria (bloquants)**
- User (scope MEMBER) peut se connecter
- Navigation intuitive
- Profile éditable (prénom, nom, mot de passe) — Art. 16 Droit de rectification
- Logout fonctionnel
- Cookie Banner affiché première visite
- Footer liens fonctionnels (pages légales accessibles)

**Tests obligatoires**
- Auth flow E2E (login → home → logout)
- Profile edit E2E (prénom, nom, mot de passe)
- Cookie Banner affichage première visite (LOT 10.3)
- Footer liens pages légales (LOT 10.0-10.2)

---

## LOT 13.1 — AI Tools (Interface Gateway LLM)

**EPIC couverts** : EPIC 13, EPIC 3 (Gateway LLM)
**Durée estimée** : 5 jours

**Avant implémentation** : lire EPIC 13 (`docs/epics/EPIC_13_Front_User.md`) + EPIC 3 (Gateway).

**Objectif** : interface utilisateur pour invoquer la Gateway LLM.

**Artefacts attendus**
- Page AI Tools (upload document + choose purpose)
- Drag & drop file picker (PDF, TXT, DOCX)
- Dropdown purpose (résumé, classification, extraction)
- Consent popup (si 1ère utilisation du purpose)
- Invoke LLM (progress bar, streaming optionnel)
- Display result (affichage résultat, non persisté par défaut)
- Option "Sauvegarder résultat" (si besoin)
- **Storage temporaire documents uploadés** :
  - **Stockage** : local disk `/tmp/uploads` (dev) ou S3 bucket (prod)
  - **Chiffrement** : AES-256-GCM, clé dérivée de `tenantId` + master secret (env var `ENCRYPTION_MASTER_KEY`)
  - **DB tracking** : Table `uploaded_files` (tenant_id, user_id, file_path, file_size, encrypted, expires_at, purged_at, purge_attempted_at)
  - **TTL** : 1 heure après upload (expires_at = created_at + 1h)
  - **Purge automatique** : Job cron `src/infrastructure/jobs/purge-uploaded-files.job.ts` (toutes les heures)
    - Sélectionne `uploaded_files WHERE expires_at < NOW() AND purged_at IS NULL`
    - Supprime fichiers disque/S3
    - Update `purged_at = NOW()`
  - **Validation** : Whitelist types (PDF, TXT, DOCX), max 10 MB
  - **Isolation tenant** : Chemin `/{tenantId}/{userId}/{jobId}/document.pdf`
  - **Art. 32 RGPD** : Chiffrement garantit sécurité (données sensibles P2-P3)

**Acceptance criteria (bloquants)**
- Upload document fonctionnel
- Purpose sélectionnable
- Consent popup obligatoire (1ère fois)
- Résultat affiché en temps réel
- Streaming optionnel (améliore UX)
- Documents stockés temporairement et chiffrés (AES-256-GCM)
- Purge automatique après TTL (job cron actif)
- Validation types/taille stricte
- Table `uploaded_files` créée (migration 015)
- Job purge fonctionnel (tests unitaires)

**Tests obligatoires**
- Upload document + invoke LLM E2E
- Consent popup (1ère utilisation)
- Résultat affiché correctement
- Validation upload (type/taille rejetés)
- Purge automatique documents (TTL respecté)
- tests/jobs.purge-uploaded-files.test.ts (job cron purge fichiers expirés)

---

## LOT 13.2 — Historique AI Jobs (Liste + Filtres)

**EPIC couverts** : EPIC 13, EPIC 4 (stockage)
**Durée estimée** : 3 jours

**Avant implémentation** : lire EPIC 13 (`docs/epics/EPIC_13_Front_User.md`) + EPIC 4 (ai_jobs).

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

## LOT 13.3 — Mes Consentements (Gestion + Historique)

**EPIC couverts** : EPIC 13, EPIC 5 (consents)
**Durée estimée** : 4 jours

**Avant implémentation** : lire EPIC 13 (`docs/epics/EPIC_13_Front_User.md`) + EPIC 5 (consents).

**Objectif** : gérer ses consentements IA.

**Artefacts attendus**
- Page mes consentements (liste purposes : accordés/révoqués)
- Toggle consent (switch on/off par purpose)
- Confirmation révocation (popup)
- Historique consentements (date accordé, date révoqué)
- Impact révocation (warning : "jobs IA bloqués si révoqué")
- Notification automatique révocation (Art. 7.3) : email confirmation envoyé à l'utilisateur après révocation

**Acceptance criteria (bloquants)**
- Liste purposes complète
- Toggle fonctionnel (accordé ↔ révoqué)
- Confirmation avant révocation
- Historique traçable
- Email notification envoyé lors de révocation (Art. 7.3 RGPD)

**Tests obligatoires**
- Accorder consentement E2E
- Révoquer consentement E2E
- Vérifier impact (LLM bloqué après revoke)
- Vérifier email notification révocation envoyé

---

## LOT 13.4 — Mes Données RGPD (Export + Effacement)

**EPIC couverts** : EPIC 13, EPIC 5 (RGPD)
**Durée estimée** : 4 jours

**Avant implémentation** : lire EPIC 13 (`docs/epics/EPIC_13_Front_User.md`) + EPIC 5 (export/effacement).

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

