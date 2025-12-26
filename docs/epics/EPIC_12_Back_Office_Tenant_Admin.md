# EPIC 12 — Back Office Tenant Admin (Interface TENANT)

**Date** : 25 décembre 2025
**Statut** : ❌ TODO
**Périmètre** : Frontend (Interface Web)
**Scope** : TENANT (Tenant Admin uniquement)
**RGPD Coverage** : Art. 5 (Minimisation), Art. 25 (Privacy by Design), Art. 32 (Sécurité), Art. 15-17-20 (Droits utilisateurs)

---

## 0. Architecture technique (DÉCISION VALIDÉE)

### 0.1 Next.js monolithique (BACK + FRONT)

**Architecture retenue** : **Next.js monolithique avec route groups**

L'interface Back Office Tenant Admin sera développée dans le **même projet Next.js** que le backend API, en utilisant les **route groups** Next.js App Router.

**Structure** :
```
src/app/
├── api/                    # Backend API (déjà existant)
├── (backoffice)/          # Frontend Back Office
│   ├── layout.tsx         # Layout global Back Office
│   ├── page.tsx           # Dashboard Super Admin (LOT 11.0)
│   ├── tenants/           # Gestion tenants (LOT 11.1)
│   ├── users/             # Gestion users cross-tenant (LOT 11.2)
│   ├── audit/             # Logs audit (LOT 11.3)
│   └── (tenant)/          # 🎯 Sous-groupe Tenant Admin (LOT 12.0-12.3)
│       ├── dashboard/     # Dashboard Tenant
│       ├── users/         # Gestion users du tenant
│       ├── consents/      # Gestion consentements
│       └── rgpd/          # Demandes RGPD
└── middleware.ts          # Middleware global (tenant, auth, RGPD)
```

**Fonctionnement route groups** :
- `(backoffice)/` est un route group → **pas d'URL `/backoffice`**
- `(tenant)/` est un sous-route group → **pas d'URL `/tenant`**
- URL finale : `/dashboard`, `/users`, `/consents`, `/rgpd`
- Organisation logique du code (Super Admin vs Tenant Admin séparés)

**Avantages RGPD** :
- ✅ **Pas de CORS** : Frontend et API sur même origin (sécurité maximale)
- ✅ **Gateway LLM inaccessible** : Imports Gateway LLM côté serveur uniquement (pas de bypass client)
- ✅ **Middleware centralisé** : Résolution tenant, auth, permissions, audit trail
- ✅ **Secrets centralisés** : Un seul `.env` (pas de duplication clés API)

### 0.2 Référence

Pour les détails d'implémentation, voir **TASKS.md section 2.2** (Architecture Frontend).

---

## 1. Contexte et objectifs

### 1.1 Contexte métier

Le **Tenant Admin** est l'administrateur d'une entreprise cliente (tenant) qui utilise la plateforme. Il a besoin d'une interface web dédiée pour :
- Gérer les utilisateurs de **son** entreprise uniquement (membres et admins tenant)
- Configurer les consentements IA pour **son** entreprise
- Suivre l'activité IA de **ses** utilisateurs
- Gérer les demandes RGPD (export/effacement) de **ses** utilisateurs

**Différence critique avec EPIC 11** :
- **Super Admin (EPIC 11)** : Vue **cross-tenant** (toutes les entreprises)
- **Tenant Admin (EPIC 12)** : Vue **mono-tenant** (son entreprise uniquement)

**Utilisateurs cibles** :
- Responsable IT d'une entreprise cliente
- DPO d'une entreprise cliente (Data Protection Officer)
- Manager RH (gestion comptes utilisateurs)

### 1.2 Objectifs techniques

Construire une interface web **Back Office Tenant** sécurisée permettant au Tenant Admin de :
1. **Dashboard tenant** : Vue d'ensemble activité de son entreprise (stats, activity feed)
2. **Gérer les users tenant** : CRUD complet sur les utilisateurs de son entreprise (admin/member)
3. **Gérer les consentements IA** : Configurer purposes, suivre acceptations/révocations
4. **Gérer les demandes RGPD** : Suivre exports/effacements demandés par ses utilisateurs

**Contrainte RGPD critique** :
- **Isolation tenant stricte** : Tenant Admin ne voit **JAMAIS** les données d'autres tenants
- **Minimisation** : Accès aux métadonnées (P1/P2), pas aux contenus prompts/outputs (P3)
- **Traçabilité** : Actions Tenant Admin auditées (backend EPIC 1.3)
- **Droits utilisateurs** : Faciliter exercice droits RGPD (Art. 15-17-20)

### 1.3 Articulation avec autres EPICs

| EPIC | Relation | Détails |
|------|----------|---------|
| **EPIC 1** | ✅ Dépend | Utilise auth backend (RBAC/ABAC, scope TENANT) |
| **EPIC 4** | ✅ Dépend | Lit données consents, ai_jobs tenant-scoped |
| **EPIC 5** | ✅ Dépend | Utilise API Routes consentements, export, effacement |
| **EPIC 11** | ➡️ Partage | Même app Next.js (route groups), routes séparées |

---

## 1.4 Corrélation FRONT ↔ BACK : Matrice des Endpoints Requis

> **⚠️ CRITIQUE** : Chaque fonctionnalité FRONT Tenant Admin dépend d'endpoints BACK. Cette matrice garantit la cohérence.

### 1.4.1 Endpoints Backend Requis par User Story

| User Story | Fonctionnalité FRONT | Endpoint BACK | Méthode | EPIC Source | Status |
|------------|---------------------|---------------|---------|-------------|--------|
| **US 12.1** | Login Tenant Admin | `POST /api/auth/login` | POST | EPIC 1/LOT 1.2 | ✅ Implémenté |
| **US 12.1** | Session Check | `GET /api/auth/session` | GET | EPIC 1/LOT 1.2 | ✅ Implémenté |
| **US 12.2** | Dashboard Stats | `GET /api/tenants/:tenantId/stats` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 12.2** | Activity Feed | `GET /api/tenants/:tenantId/activity` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 12.3** | List Users Tenant | `GET /api/tenants/:tenantId/users` | GET | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 12.4** | Create User | `POST /api/tenants/:tenantId/users` | POST | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 12.5** | User Details | `GET /api/tenants/:tenantId/users/:userId` | GET | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 12.5** | User Stats | `GET /api/users/:userId/stats` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 12.5** | User Jobs History | `GET /api/users/:userId/jobs` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 12.5** | User Consents | `GET /api/consents?userId=` | GET | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 12.5** | User Audit Events | `GET /api/audit?userId=` | GET | EPIC 1/LOT 1.3 | ✅ Implémenté |
| **US 12.6** | Update User | `PATCH /api/tenants/:tenantId/users/:userId` | PATCH | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 12.7** | Suspend User | `POST /api/tenants/:tenantId/users/:userId/suspend` | POST | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 12.7** | Reactivate User | `POST /api/tenants/:tenantId/users/:userId/reactivate` | POST | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 12.8** | List Purposes | `GET /api/tenants/:tenantId/purposes` | GET | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 12.8** | Create Purpose | `POST /api/tenants/:tenantId/purposes` | POST | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 12.8** | Update Purpose | `PATCH /api/tenants/:tenantId/purposes/:purposeId` | PATCH | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 12.9** | Consent Matrix | `GET /api/tenants/:tenantId/consents/matrix` | GET | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 12.10** | Consent History | `GET /api/consents/:userId/history` | GET | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 12.11** | List Export Requests | `GET /api/tenants/:tenantId/rgpd/exports` | GET | EPIC 5/LOT 5.1 | ✅ Implémenté |
| **US 12.12** | List Deletion Requests | `GET /api/tenants/:tenantId/rgpd/deletions` | GET | EPIC 5/LOT 5.2 | ✅ Implémenté |
| **US 12.13** | Export CSV | `GET /api/tenants/:tenantId/export-csv` | GET | EPIC 5/LOT 5.3 | ✅ Implémenté |

### 1.4.2 Endpoints RGPD Complémentaires à Ajouter (Art. 18/21/22)

> **Gaps identifiés** : Ces endpoints permettent au Tenant Admin de suivre les droits RGPD complémentaires exercés par ses users.

| Droit RGPD | Fonctionnalité Tenant Admin | Endpoint BACK proposé | EPIC Source | Status |
|------------|----------------------------|----------------------|-------------|--------|
| **Art. 18** | Liste suspensions données | `GET /api/tenants/:tenantId/rgpd/suspensions` | EPIC 10/LOT 10.6 | ❌ **À implémenter** |
| **Art. 21** | Liste oppositions | `GET /api/tenants/:tenantId/rgpd/oppositions` | EPIC 10/LOT 10.6 | ❌ **À implémenter** |
| **Art. 22** | Liste contestations IA | `GET /api/tenants/:tenantId/rgpd/contests` | EPIC 10/LOT 10.6 | ❌ **À implémenter** |
| **Art. 22** | Traiter contestation | `PATCH /api/rgpd/contests/:contestId` | EPIC 10/LOT 10.6 | ❌ **À implémenter** |

### 1.4.3 Corrélation avec EPIC 13 (Front User)

> Les actions effectuées par les Users (EPIC 13) sont visibles par le Tenant Admin (EPIC 12).

| Action User (EPIC 13) | Vue Tenant Admin (EPIC 12) | Endpoint partagé |
|-----------------------|---------------------------|------------------|
| User grant consent | Matrice consentements (US 12.9) | `GET /api/tenants/:tenantId/consents/matrix` |
| User revoke consent | Matrice consentements (US 12.9) | `GET /api/tenants/:tenantId/consents/matrix` |
| User invoke LLM | User Jobs History (US 12.5) | `GET /api/users/:userId/jobs` |
| User request export | Liste exports (US 12.11) | `GET /api/tenants/:tenantId/rgpd/exports` |
| User request deletion | Liste deletions (US 12.12) | `GET /api/tenants/:tenantId/rgpd/deletions` |
| User suspend data (Art. 18) | Liste suspensions | `GET /api/tenants/:tenantId/rgpd/suspensions` |
| User oppose (Art. 21) | Liste oppositions | `GET /api/tenants/:tenantId/rgpd/oppositions` |
| User contest AI (Art. 22) | Liste contestations | `GET /api/tenants/:tenantId/rgpd/contests` |

---

## 2. Exigences RGPD (bout en bout : USER → FRONT → BACK)

### 2.1 Côté Frontend (Interface)

#### ✅ Isolation tenant stricte
- **OBLIGATOIRE** : Middleware vérifie `tenantId` de l'admin connecté
- **OBLIGATOIRE** : Toutes requêtes API incluent `tenantId` (header ou URL)
- **INTERDIT** : Accès cross-tenant (403 Forbidden si tentative)

#### ✅ Minimisation des données affichées
- **INTERDIT** : Afficher contenus prompts/outputs IA (P3)
- **AUTORISÉ** : Afficher métadonnées (P1) : dates, statuts, counts, model refs
- **AUTORISÉ** : Afficher données consentements (P2) : purpose, granted/revoked, dates
- **AUTORISÉ** : Afficher emails complets **de son tenant uniquement** (nécessaire gestion)

#### ✅ Pas de stockage local sensible
- **INTERDIT** : `localStorage` pour données P2/P3
- **AUTORISÉ** : `sessionStorage` pour JWT token (httpOnly cookie préféré)
- **AUTORISÉ** : `localStorage` pour préférences UI (theme, langue)

#### ✅ Messages d'erreur RGPD-safe
- **INTERDIT** : Stack traces, détails techniques sensibles
- **AUTORISÉ** : Messages génériques ("Accès refusé", "Email déjà utilisé")

### 2.2 Côté Communication (USER → FRONT → BACK)

#### ✅ HTTPS obligatoire
- **TLS 1.3** minimum
- **HSTS** activé
- Certificat valide

#### ✅ Authentification + Isolation tenant
- **JWT tokens** avec `tenantId` claim
- Backend valide `tenantId` dans JWT = `tenantId` dans URL/body
- **Exemple** : `/api/tenants/{tenantId}/users` → JWT.tenantId DOIT = {tenantId}

#### ✅ CORS strict
- Origins autorisées : domaine Back Office uniquement
- Credentials : `withCredentials: true`

#### ✅ Protection CSRF
- Tokens CSRF sur toutes mutations (POST/PUT/DELETE)

### 2.3 Côté Backend (déjà couvert)

Références aux EPICs backend existants :
- ✅ **EPIC 1** : Auth RBAC/ABAC (scope TENANT validé)
- ✅ **EPIC 4** : Isolation tenant DAL (WHERE tenant_id = $1)
- ✅ **EPIC 5** : API Routes consents, export, effacement
- ✅ **EPIC 1** : Audit trail (actions Tenant Admin loguées)

---

## 3. Périmètre fonctionnel

### 3.1 User Stories

#### US 12.1 : Authentification Tenant Admin
**En tant que** Tenant Admin  
**Je veux** me connecter au Back Office de mon entreprise  
**Afin de** gérer mes utilisateurs et suivre l'activité IA

**Acceptance Criteria** :
- [ ] Page login partagée avec EPIC 11 (même app)
- [ ] Redirection automatique selon scope :
  - scope PLATFORM → Dashboard Super Admin (EPIC 11)
  - scope TENANT → Dashboard Tenant Admin (EPIC 12)
- [ ] Logout fonctionnel
- [ ] 2FA optionnel

---

#### US 12.2 : Dashboard Tenant (Vue d'ensemble)
**En tant que** Tenant Admin  
**Je veux** voir un dashboard de mon entreprise  
**Afin de** suivre l'activité IA et RGPD

**Acceptance Criteria** :
- [ ] Widgets KPIs :
  - Total users actifs (admin/member)
  - AI jobs ce mois (succès vs échoués)
  - Consentements actifs (accordés vs révoqués)
  - Exports RGPD en cours (pending/completed)
  - Effacements RGPD en cours (pending/completed)
- [ ] Graphiques :
  - AI jobs par jour (30 derniers jours)
  - Consentements accordés vs révoqués (évolution 12 semaines)
  - Taux succès/échec jobs IA (par purpose)
- [ ] Activity feed (50 dernières actions) :
  - User créé
  - Consentement accordé/révoqué
  - Job IA lancé (succès/échec)
  - Export RGPD demandé
  - Effacement RGPD demandé
- [ ] **Isolation tenant** : Voit uniquement **son** tenant

---

#### US 12.3 : Voir la liste des users de mon tenant
**En tant que** Tenant Admin  
**Je veux** voir tous les utilisateurs de mon entreprise  
**Afin de** gérer les comptes

**Acceptance Criteria** :
- [ ] Table users :
  - Username, Email, Role (admin/member), Status (active/suspended), Created At, Last Login
- [ ] Filtres :
  - Role : admin/member/all
  - Status : active/suspended/all
  - Recherche : par email ou username
- [ ] Pagination (50 par page)
- [ ] Tri par colonne (name, email, created_at, last_login)
- [ ] Actions rapides :
  - Voir détails user
  - Éditer user
  - Suspendre/Réactiver user
  - Envoyer invitation (si pas encore activé)
- [ ] **Isolation tenant** : Voit uniquement users de **son** tenant

---

#### US 12.4 : Créer un utilisateur de mon tenant
**En tant que** Tenant Admin  
**Je veux** créer un nouveau user dans mon entreprise  
**Afin de** onboarder un collaborateur

**Acceptance Criteria** :
- [ ] Formulaire :
  - Email (requis, unique par tenant)
  - Name (requis)
  - Role (requis) : dropdown admin/member
- [ ] Validation :
  - Email format valide
  - Email unique dans le tenant (erreur si dupliqué)
  - Name 2-100 caractères
- [ ] Génération invitation :
  - Email envoyé avec lien activation (token unique, TTL 7j)
  - User créé avec status `pending` (devient `active` après activation)
- [ ] Audit event créé (user.created)
- [ ] Feedback : Toast succès + redirection vers liste users

---

#### US 12.5 : Voir les détails d'un user de mon tenant
**En tant que** Tenant Admin  
**Je veux** voir les détails d'un utilisateur de mon entreprise  
**Afin de** comprendre son usage et troubleshooter

**Acceptance Criteria** :
- [ ] Page détails user :
  - **Infos générales** : Email, Name, Role, Status, Created At, Last Login
  - **Stats** : Total AI jobs, Jobs succès/échecs, Consentements actifs
  - **Historique AI jobs** (table, derniers 100) :
    - Date, Purpose, Model, Status (success/failed), Latence
  - **Consentements** (table) :
    - Purpose, Status (granted/revoked), Date accordé, Date révoqué (si applicable)
  - **Audit events user** (table, derniers 50) :
    - Date, Action (consent.granted, ai.invoked, rgpd.export, etc.), Status
- [ ] Actions possibles :
  - Éditer user (nom, role)
  - Suspendre/Réactiver user
  - Révoquer tous consentements (confirmation obligatoire)
- [ ] **Isolation tenant** : Voit uniquement users de **son** tenant

---

#### US 12.6 : Éditer un utilisateur de mon tenant
**En tant que** Tenant Admin  
**Je veux** modifier les infos d'un utilisateur de mon entreprise  
**Afin de** corriger ou mettre à jour ses données

**Acceptance Criteria** :
- [ ] Formulaire pré-rempli :
  - Name (éditable)
  - Role (éditable) : dropdown admin/member
  - Email (lecture seule, pas éditable)
- [ ] Validation :
  - Name 2-100 caractères
- [ ] Sauvegarde :
  - PATCH /api/tenants/{tenantId}/users/{userId}
  - Audit event créé (user.updated)
- [ ] Feedback : Toast succès + retour page détails user

---

#### US 12.7 : Suspendre un utilisateur de mon tenant
**En tant que** Tenant Admin  
**Je veux** suspendre un utilisateur de mon entreprise  
**Afin de** bloquer temporairement son accès (départ, incident)

**Acceptance Criteria** :
- [ ] Bouton "Suspendre" avec confirmation (modal)
- [ ] Raison obligatoire (dropdown + texte libre) :
  - Départ de l'entreprise
  - Incident sécurité
  - Non-conformité RGPD
  - Autre (préciser)
- [ ] Suspension immédiate :
  - User status = `suspended`
  - User ne peut plus se connecter (backend rejette auth)
- [ ] Email notification user (optionnel mais recommandé)
- [ ] Audit event créé (user.suspended)
- [ ] Réactivation possible (bouton "Réactiver")

---

#### US 12.8 : Configurer les purposes IA de mon tenant
**En tant que** Tenant Admin  
**Je veux** configurer les purposes IA disponibles dans mon entreprise  
**Afin de** définir les usages autorisés (résumé, classification, extraction, etc.)

**Acceptance Criteria** :
- [ ] Page liste purposes :
  - Table : Label, Description, Required (obligatoire ou optionnel), Active, Created At
- [ ] Actions :
  - Créer purpose
  - Éditer purpose
  - Activer/Désactiver purpose (soft delete)
- [ ] Formulaire créer/éditer purpose :
  - Label (requis) : ex. "Résumé de documents"
  - Description (requis) : ex. "Résumer des contrats, emails, rapports"
  - Required (boolean) : Si true, consentement obligatoire pour utiliser plateforme
  - Active (boolean) : Si false, purpose masqué aux users
- [ ] Validation :
  - Label unique par tenant
  - Description 10-500 caractères
- [ ] **Isolation tenant** : Purposes configurables par tenant (pas partagés)
- [ ] Audit event créé (purpose.created, purpose.updated)

---

#### US 12.9 : Voir la matrice consentements (users × purposes)
**En tant que** Tenant Admin  
**Je veux** voir une matrice des consentements (users × purposes)  
**Afin de** avoir une vue d'ensemble des consentements IA

**Acceptance Criteria** :
- [ ] Matrice consentements :
  - **Lignes** : Users de mon tenant
  - **Colonnes** : Purposes configurés
  - **Cellules** : État consentement :
    - ✅ Granted (vert)
    - ❌ Revoked (rouge)
    - ⏸️ Pending (gris) : jamais demandé
- [ ] Filtres :
  - Par user (search)
  - Par purpose (dropdown)
  - Par statut (granted/revoked/pending)
- [ ] Actions cellule (clic) :
  - Voir historique consentement (dates accordé/révoqué)
  - Révoquer consentement (confirmation obligatoire)
- [ ] Export CSV :
  - Format : User Email, Purpose, Status, Date Granted, Date Revoked
  - RGPD-safe : P1/P2 uniquement, pas de contenu
- [ ] **Isolation tenant** : Voit uniquement consentements de **son** tenant

---

#### US 12.10 : Voir l'historique des consentements d'un user
**En tant que** Tenant Admin  
**Je veux** voir l'historique complet des consentements d'un utilisateur  
**Afin de** tracer les changements de consentement (audit RGPD)

**Acceptance Criteria** :
- [ ] Timeline consentements (par user) :
  - Date, Purpose, Action (granted/revoked), Source (user/admin)
- [ ] Filtres :
  - Par purpose
  - Par date range
- [ ] Détails :
  - Si révoqué : date révocation, raison (optionnel)
  - Si accordé : date accord, IP (optionnel), user agent (optionnel)
- [ ] Export CSV historique (RGPD-safe)
- [ ] **Isolation tenant** : Voit uniquement consentements de **son** tenant

---

#### US 12.11 : Voir les demandes RGPD export de mon tenant
**En tant que** Tenant Admin  
**Je veux** voir les demandes d'export RGPD de mes utilisateurs  
**Afin de** suivre les requêtes Art. 15/20 RGPD

**Acceptance Criteria** :
- [ ] Page demandes export :
  - Table : User Email, Status (pending/completed/expired), Créé le, Expire le, Downloads restants
- [ ] Filtres :
  - Par user (search)
  - Par status (pending/completed/expired/all)
  - Par date range
- [ ] Détails demande (clic ligne) :
  - Export ID
  - User email
  - Status détaillé (pending/completed/expired)
  - Date création
  - Date expiration (TTL 7j)
  - Downloads count (max 3)
  - Taille bundle (MB)
- [ ] Actions :
  - **Pas de download admin** (sécurité RGPD : seul user peut download)
  - Voir historique downloads (dates, IPs)
- [ ] **Isolation tenant** : Voit uniquement demandes de **son** tenant
- [ ] Notifications : Email admin quand nouvelle demande (optionnel)

---

#### US 12.12 : Voir les demandes RGPD effacement de mon tenant
**En tant que** Tenant Admin  
**Je veux** voir les demandes d'effacement RGPD de mes utilisateurs  
**Afin de** suivre les requêtes Art. 17 RGPD

**Acceptance Criteria** :
- [ ] Page demandes effacement :
  - Table : User Email, Status (pending/soft_deleted/purged), Créé le, Soft deleted le, Purge prévu le
- [ ] Filtres :
  - Par user (search)
  - Par status (pending/soft_deleted/purged/all)
  - Par date range
- [ ] Détails demande (clic ligne) :
  - Request ID
  - User email
  - Status détaillé :
    - `pending` : Demande reçue, pas encore traitée
    - `soft_deleted` : Données inaccessibles immédiatement (soft delete)
    - `purged` : Données supprimées définitivement après 30j
  - Date création
  - Date soft delete (si applicable)
  - Date purge prévue (soft delete + 30j)
  - Date purge effective (si applicable)
- [ ] Actions :
  - Aucune action admin (processus automatique RGPD)
  - Voir audit trail effacement (dates, actions)
- [ ] **Isolation tenant** : Voit uniquement demandes de **son** tenant
- [ ] Notifications : Email admin quand nouvelle demande (obligatoire RGPD)

---

#### US 12.13 : Export CSV données tenant (RGPD-safe)
**En tant que** Tenant Admin  
**Je veux** exporter des données de mon tenant en CSV  
**Afin de** faire des analyses ou rapports

**Acceptance Criteria** :
- [ ] Export CSV disponible sur :
  - Liste users tenant
  - Matrice consentements
  - Liste AI jobs tenant (métadonnées uniquement)
  - Audit events tenant
- [ ] Format CSV :
  - Encodage UTF-8
  - Séparateur : `,` (virgule)
  - Headers : colonnes explicites
- [ ] **RGPD-safe** : P1/P2 uniquement, jamais P3 (contenus prompts/outputs)
- [ ] Audit event créé (data.exported)
- [ ] **Isolation tenant** : Export contient uniquement données de **son** tenant

---

### 3.2 Hors périmètre (EPIC 12)

❌ **Pas dans cet EPIC** :
- Gestion tenants (CRUD tenants) → EPIC 11 (Super Admin)
- Gestion users cross-tenant → EPIC 11 (Super Admin)
- Utilisation AI Tools (invoquer Gateway LLM) → EPIC 13 (Front User)
- Logs système plateforme → EPIC 11 (Super Admin)
- Billing/facturation → EPIC futur
- Configuration infrastructure (Docker, DB) → EPIC 6 (Backend)

---

## 4. Architecture technique

### 4.1 Stack technique (identique EPIC 11)

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Framework** | Next.js 14+ App Router | SSR, Server Components, cohérence EPIC 11 |
| **Auth** | NextAuth.js v5 | Session management, intégration native |
| **UI Library** | shadcn/ui (Radix UI + Tailwind) | Composants accessibles, cohérence EPIC 11 |
| **Styling** | Tailwind CSS | Cohérence design system |
| **Forms** | React Hook Form + Zod | Validation typesafe |
| **State** | Zustand ou Context API | Léger, suffisant |
| **Data fetching** | SWR ou TanStack Query | Cache, revalidation |
| **Charts** | Recharts | Graphiques stats |
| **Tables** | TanStack Table | Filtres, tri, pagination |

### 4.2 Structure du projet (Next.js Monolithique partagé avec EPIC 11)

**Architecture DÉCIDÉE** : Next.js monolithique (BACK + FRONT dans le même projet) — cf. [TASKS.md section 2.2](../../TASKS.md#22-architecture-frontend)

```
src/app/
├── api/                       # Backend API (déjà existant)
│
├── (backoffice)/              # Frontend Back Office
│   ├── layout.tsx             # Layout global Back Office
│   ├── page.tsx               # Dashboard Super Admin (EPIC 11)
│   ├── tenants/               # Gestion tenants (EPIC 11 - LOT 11.1)
│   ├── users/                 # Gestion users cross-tenant (EPIC 11 - LOT 11.2)
│   ├── audit/                 # Logs audit (EPIC 11 - LOT 11.3)
│   └── (tenant)/              # 🎯 Sous-groupe Tenant Admin (EPIC 12)
│       ├── dashboard/page.tsx # Dashboard Tenant (LOT 12.0)
│       ├── users/             # Users Tenant (LOT 12.1)
│       │   ├── page.tsx       # Liste users tenant
│       │   ├── new/page.tsx   # Créer user
│       │   └── [id]/page.tsx  # Détails user
│       ├── consents/          # Consentements (LOT 12.2)
│       │   ├── purposes/page.tsx  # Liste purposes
│       │   ├── matrix/page.tsx    # Matrice consentements
│       │   └── [userId]/page.tsx  # Historique user
│       └── rgpd/              # RGPD Requests (LOT 12.3)
│           ├── exports/page.tsx   # Demandes export
│           └── deletions/page.tsx # Demandes effacement
│
├── (frontend)/                # Frontend User (EPIC 13)
│   └── ...                    # Voir EPIC 13
│
├── (legal)/                   # Pages légales publiques (EPIC 10)
│   └── ...                    # Voir EPIC 10
│
└── middleware.ts              # Middleware global (tenant, auth, RGPD)

src/
├── components/
│   ├── ui/                    # shadcn components (partagés)
│   ├── backoffice/            # Components Back Office (EPIC 11-12)
│   │   ├── platform/          # Components Super Admin (EPIC 11)
│   │   └── tenant/            # Components Tenant Admin (EPIC 12)
│   └── shared/                # Components partagés (tables, charts)
├── lib/
│   ├── api.ts                 # API client (fetch wrapper)
│   ├── auth.ts                # NextAuth config
│   └── utils.ts
└── middleware.ts              # Auth + scope validation
```

**Fonctionnement route groups** :
- `(backoffice)/` est un route group → **pas d'URL `/backoffice`**
- `(tenant)/` est un sous-route group → **pas d'URL `/tenant`**
- URL finale : `/dashboard`, `/users`, `/consents`, `/rgpd`
- Organisation logique du code (Super Admin vs Tenant Admin séparés)

**Avantages RGPD** (cf. TASKS.md section 2.2) :
- ✅ **Pas de CORS** : Frontend et API sur même origin (sécurité maximale)
- ✅ **Gateway LLM inaccessible** : Imports Gateway LLM côté serveur uniquement (pas de bypass client)
- ✅ **Middleware centralisé** : Résolution tenant, auth, permissions, audit trail
- ✅ **Secrets centralisés** : Un seul `.env` (pas de duplication clés API)

### 4.3 Middleware Isolation Tenant (Critique RGPD)

```typescript
// src/middleware.ts (middleware global partagé)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Routes publiques (login, pages légales)
  const publicPaths = ['/login', '/legal'];
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Auth requise
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Routes Back Office Tenant Admin (scope TENANT) - route group (backoffice)/(tenant)/
  const tenantAdminPaths = ['/dashboard', '/users', '/consents', '/rgpd'];
  const isTenantRoute = tenantAdminPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );
  
  if (isTenantRoute && token.scope === 'TENANT') {
    // BLOCKER: Extraction tenantId depuis JWT
    const tenantId = token.tenantId as string;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Forbidden: No tenant associated' },
        { status: 403 }
      );
    }

    // Inject tenantId dans headers (disponible dans API Routes)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', tenantId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Routes Super Admin (scope PLATFORM) - route group (backoffice)/
  const platformPaths = ['/tenants', '/audit', '/logs'];
  const isPlatformRoute = platformPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );
  
  if (isPlatformRoute) {
    if (token.scope !== 'PLATFORM') {
      return NextResponse.json(
        { error: 'Forbidden: PLATFORM scope required' },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 4.4 API Client Tenant-scoped

```typescript
// src/lib/api.ts (API client partagé)
export async function apiClientTenant<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Endpoint doit inclure {tenantId}
  // Ex: /api/tenants/{tenantId}/users
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    // RGPD-safe error handling
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Hook React pour récupérer tenantId depuis JWT
export function useTenantId(): string {
  const { data: session } = useSession();
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    throw new Error('No tenant associated');
  }

  return tenantId;
}

// Exemple usage
export function useUsers() {
  const tenantId = useTenantId();

  return useSWR(`/api/tenants/${tenantId}/users`, apiClientTenant);
}
```

### 4.5 Composants réutilisables (Tenant-scoped)

#### UserTable (Liste users tenant)
```tsx
// components/tenant/UserTable.tsx
interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onSuspend: (user: User) => void;
}

export function UserTable({ users, onEdit, onSuspend }: UserTableProps) {
  // TanStack Table avec filtres, tri, pagination
  // ...
}
```

#### ConsentMatrix (Matrice consentements)
```tsx
// components/tenant/ConsentMatrix.tsx
interface ConsentMatrixProps {
  users: User[];
  purposes: Purpose[];
  consents: Consent[];
}

export function ConsentMatrix({ users, purposes, consents }: ConsentMatrixProps) {
  // Matrice users × purposes
  // Affichage état consentement (granted/revoked/pending)
  // ...
}
```

---

## 5. Contraintes RGPD (Frontend spécifique)

### 5.1 Isolation tenant stricte (Critique)

**Règle** : Tenant Admin ne voit **JAMAIS** les données d'autres tenants

**Implémentation** :
```typescript
// ✅ OK : Endpoint tenant-scoped
fetch(`/api/tenants/${tenantId}/users`);

// ❌ INTERDIT : Endpoint cross-tenant
fetch(`/api/users`); // Retournerait tous les users de tous les tenants
```

**Validation** :
- [ ] Middleware vérifie `tenantId` dans JWT
- [ ] Backend valide `tenantId` (WHERE tenant_id = $1)
- [ ] Tests E2E isolation tenant (admin tenant A ne voit pas tenant B)

### 5.2 Pas de stockage local sensible

**Règle** : Aucune donnée P2/P3 dans `localStorage` ou `sessionStorage`

**Autorisé** :
```typescript
// ✅ OK : Préférences UI (P0)
localStorage.setItem('theme', 'dark');
localStorage.setItem('language', 'fr');
```

**Interdit** :
```typescript
// ❌ INTERDIT : Données P2 (emails, noms)
localStorage.setItem('users', JSON.stringify(users));
```

### 5.3 Messages d'erreur RGPD-safe

**Règle** : Pas d'exposition détails techniques

**Implémentation** :
```typescript
// ❌ INTERDIT
toast.error(`SQL Error: Foreign key constraint 'users_tenant_id_fkey' violated`);

// ✅ OK
toast.error('Unable to delete user. Please contact support.');
```

### 5.4 Validation côté client (non bloquante sécurité)

**Règle** : Validation côté client = UX uniquement

**Implémentation** :
```typescript
// ✅ Validation Zod côté client (UX)
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'member']),
});

// ⚠️ Backend DOIT RE-VALIDER (sécurité)
// app/api/tenants/[tenantId]/users/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const validated = userSchema.parse(body); // Re-validation backend
  // ...
}
```

---

## 6. Acceptance Criteria (Epic-level)

### 6.1 Fonctionnel

- [ ] Tenant Admin peut se connecter (même login que Super Admin)
- [ ] Tenant Admin est redirigé vers son dashboard tenant (scope TENANT)
- [ ] Dashboard tenant affiche stats exactes (users, AI jobs, consents, RGPD)
- [ ] Tenant Admin peut créer/éditer/suspendre users de **son** tenant uniquement
- [ ] Tenant Admin peut voir détails complets d'un user (historique jobs, consents, audit)
- [ ] Tenant Admin peut configurer purposes IA de **son** tenant
- [ ] Tenant Admin peut voir matrice consentements (users × purposes)
- [ ] Tenant Admin peut voir historique consentements par user
- [ ] Tenant Admin peut voir demandes export RGPD de **ses** users
- [ ] Tenant Admin peut voir demandes effacement RGPD de **ses** users
- [ ] Tenant Admin peut exporter données en CSV (RGPD-safe : P1/P2 uniquement)

### 6.2 RGPD

- [ ] **Isolation tenant stricte** : Admin tenant A ne voit **JAMAIS** données tenant B
- [ ] Aucune donnée P3 affichée (contenus prompts/outputs interdits)
- [ ] Aucune donnée P2/P3 stockée côté client (localStorage/sessionStorage)
- [ ] Messages d'erreur RGPD-safe (pas de stack traces)
- [ ] Export CSV RGPD-safe (P1/P2 uniquement)
- [ ] Actions Tenant Admin auditées (backend)

### 6.3 Sécurité

- [ ] HTTPS obligatoire (HSTS activé)
- [ ] JWT tokens httpOnly (pas localStorage)
- [ ] CSRF protection activée
- [ ] CSP headers configurés
- [ ] XSS protection (pas de dangerouslySetInnerHTML)
- [ ] Middleware valide scope TENANT (403 si PLATFORM tente accès)
- [ ] Backend valide tenantId JWT = tenantId URL/body

### 6.4 Performance

- [ ] Time to Interactive < 2s (dashboard)
- [ ] Pagination performante (tables 100+ items)
- [ ] SWR cache actif (pas de refetch inutile)
- [ ] Lazy loading composants lourds (matrice consentements, charts)

### 6.5 UX

- [ ] Design cohérent avec EPIC 11 (même design system)
- [ ] Responsive (desktop prioritaire, dégradé gracieux mobile)
- [ ] Feedback utilisateur (toasts, loading states, confirmations)
- [ ] Accessibility (WCAG 2.1 AA minimum)
- [ ] Navigation intuitive (sidebar claire, breadcrumbs)

---

## 7. Découpage en LOTs

Référence **TASKS.md** :

| LOT | Description | Durée estimée | Dépendances |
|-----|-------------|---------------|-------------|
| **LOT 12.0** | Dashboard Tenant + Activity Feed | 3 jours | LOT 5.3 (API Routes), LOT 11.0 (Infra Back Office) |
| **LOT 12.1** | Gestion Users Tenant (CRUD) | 4 jours | LOT 12.0 |
| **LOT 12.2** | Gestion Consentements (Purposes + Matrix) | 5 jours | LOT 5.0 (Consentement backend), LOT 12.0 |
| **LOT 12.3** | RGPD Management (Export/Delete Requests) | 4 jours | LOT 5.1-5.2 (Export/Effacement backend), LOT 12.0 |

**Total EPIC 12** : ~16 jours (3,2 semaines)

---

## 8. Risques et mitigations

### 8.1 Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Fuite cross-tenant** | Moyenne | 🔴 CRITIQUE | Middleware strict, tests E2E isolation, backend valide tenantId |
| **Exposition données P3** | Faible | 🔴 CRITIQUE | Pas d'affichage prompts/outputs, validation affichage, tests RGPD |
| **XSS via injection** | Faible | 🟠 ÉLEVÉ | CSP strict, React escape, validation Zod |
| **Matrice consentements lente** | Moyenne | 🟡 MOYEN | Pagination, lazy loading, cache SWR |
| **Confusion scope PLATFORM/TENANT** | Faible | 🟠 ÉLEVÉ | Middleware validation, redirection automatique, UI distincte |

### 8.2 Tests obligatoires

- [ ] **Tests E2E** (Playwright) :
  - Auth flow Tenant Admin (login → dashboard tenant → logout)
  - Créer user tenant E2E
  - Isolation tenant stricte (admin tenant A ne voit pas tenant B)
  - Matrice consentements fonctionnelle
  - Demandes RGPD visibles (export/effacement)
- [ ] **Tests RGPD** :
  - Pas de données P3 affichées (prompts/outputs interdits)
  - Pas de données P2/P3 dans localStorage
  - Messages erreur RGPD-safe
  - Export CSV RGPD-safe (P1/P2 uniquement)
- [ ] **Tests Sécurité** :
  - Middleware rejette scope PLATFORM sur routes tenant
  - Backend valide tenantId JWT = tenantId URL
  - CSRF tokens présents (toutes mutations)

---

## 9. Checklist de livraison (DoD EPIC 12)

### Code
- [ ] Tous les LOTs 12.0-12.3 implémentés
- [ ] Tests E2E passants (100%)
- [ ] Tests RGPD passants (100%)
- [ ] TypeScript strict (0 erreurs)
- [ ] Lint passant (0 warnings)

### Documentation
- [ ] README Back Office Tenant (setup, usage)
- [ ] Guide utilisateur Tenant Admin (manuel)

### Sécurité
- [ ] Scan sécurité frontend (npm audit)
- [ ] CSP validé
- [ ] Isolation tenant validée (tests)

### Performance
- [ ] Lighthouse score > 90
- [ ] Bundle size < 500KB (gzip)

### RGPD
- [ ] Isolation tenant stricte (tests E2E)
- [ ] Pas de données P3 affichées (audit)
- [ ] Export CSV RGPD-safe (validation)

---

## 10. Prochaines étapes

Après complétion EPIC 12 :
1. **EPIC 13** : Front User (interface utilisateur final pour utiliser AI Tools)

---

**Document créé le 25 décembre 2025**  
**Version 1.0**  
**Auteur** : Équipe Plateforme RGPD-IA
