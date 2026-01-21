# EPIC 12 — Back Office Tenant Admin (Interface TENANT)

**Date** : 25 décembre 2025 (Mise à jour : 21 janvier 2026)
**Statut** : ✅ TERMINÉ (LOT 12.0, 12.1, 12.2, 12.3, 12.4 ✅)
**Périmètre** : Frontend (Interface Web)
**Scope** : TENANT (Tenant Admin + DPO)
**RGPD Coverage** : Art. 5 (Minimisation), Art. 25 (Privacy by Design), Art. 30 (Registre traitements), Art. 32 (Sécurité), Art. 35 (DPIA), Art. 37-39 (DPO), Art. 15-17-20 (Droits utilisateurs)

---

## 0. Architecture technique (DÉCISION VALIDÉE)

### 0.1 Next.js monolithique (BACK + FRONT)

**Architecture retenue** : **Next.js monolithique avec route groups séparés**

L'interface Back Office Tenant Admin sera développée dans le **même projet Next.js** que le backend API, mais dans un **route group dédié** avec un **préfixe URL visible** pour éviter les collisions avec le Super Admin (EPIC 11).

**Structure cible** :
```
app/
├── api/                        # Backend API (déjà existant)
│
├── (platform-admin)/           # Route group Super Admin (EPIC 11)
│   ├── layout.tsx              # Layout Super Admin (PlatformSidebar)
│   └── admin/                  # Préfixe URL visible /admin/
│       └── ...                 # Voir EPIC 11
│
├── (tenant-admin)/             # ⬅️ Route group Tenant Admin (EPIC 12)
│   ├── layout.tsx              # Layout Tenant Admin (TenantSidebar)
│   └── portal/                 # ⬅️ Préfixe URL visible /portal/
│       ├── page.tsx            # Dashboard → /portal
│       ├── dashboard/          # Dashboard → /portal/dashboard
│       ├── users/              # Gestion users tenant → /portal/users
│       ├── consents/           # Consentements → /portal/consents
│       └── rgpd/               # RGPD requests → /portal/rgpd
│
├── (frontend)/                 # Route group End User (EPIC 13)
│   └── ...                     # Voir EPIC 13
│
├── (legal)/                    # Pages légales publiques
│   └── ...
│
├── login/                      # ⬅️ Login partagé à la racine → /login
│   └── page.tsx                # Redirection scope-based après auth
│
└── middleware.ts               # Middleware global (auth, scope, RGPD)
```

**URLs Tenant Admin (EPIC 12)** :
- `/login` → Page login partagée
- `/portal` ou `/portal/dashboard` → Dashboard Tenant
- `/portal/users` → Gestion users du tenant
- `/portal/consents` → Gestion consentements
- `/portal/rgpd` → Demandes RGPD

**Fonctionnement route groups** :
- `(tenant-admin)/` est un route group → **pas d'URL `/tenant-admin`**
- `portal/` est un dossier réel → **préfixe URL visible `/portal/`**
- Organisation logique du code (Super Admin `/admin/` vs Tenant Admin `/portal/` séparés)

**Avantages RGPD** :
- ✅ **Pas de CORS** : Frontend et API sur même origin (sécurité maximale)
- ✅ **Gateway LLM inaccessible** : Imports Gateway LLM côté serveur uniquement (pas de bypass client)
- ✅ **Middleware centralisé** : Résolution tenant, auth, permissions, audit trail
- ✅ **Secrets centralisés** : Un seul `.env` (pas de duplication clés API)
- ✅ **Séparation claire** : Pas de collision URL entre Super Admin (`/admin/`) et Tenant Admin (`/portal/`)

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
- Responsable IT d'une entreprise cliente (TENANT_ADMIN)
- Manager RH (gestion comptes utilisateurs) (TENANT_ADMIN)
- **DPO d'une entreprise cliente** (Data Protection Officer) → rôle spécifique, même scope TENANT

> **Note Architecture DPO** : Le DPO est un **rôle** au sein du scope TENANT, pas un scope séparé. Il utilise la même interface `/portal/*` avec des menus conditionnels selon `user.role === 'DPO'`.

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
| **US 12.8** | List Purpose Templates | `GET /api/purposes/templates` | GET | EPIC 12/LOT 12.2 | ✅ Implémenté |
| **US 12.8** | Get Template Details | `GET /api/purposes/templates/:code` | GET | EPIC 12/LOT 12.2 | ✅ Implémenté |
| **US 12.8** | Adopt Template | `POST /api/purposes/adopt` | POST | EPIC 12/LOT 12.2 | ✅ Implémenté |
| **US 12.8** | List Purposes | `GET /api/purposes` | GET | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 12.8** | Create Custom Purpose | `POST /api/purposes/custom` | POST | EPIC 12/LOT 12.2 | ✅ Implémenté |
| **US 12.8** | Validate Custom Purpose | `POST /api/purposes/custom/validate` | POST | EPIC 12/LOT 12.2 | ✅ Implémenté |
| **US 12.8** | Update Purpose | `PATCH /api/purposes/:purposeId` | PATCH | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 12.9** | Consent Matrix | `GET /api/tenants/:tenantId/consents/matrix` | GET | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 12.10** | Consent History | `GET /api/consents/:userId/history` | GET | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 12.11** | List Export Requests | `GET /api/tenants/:tenantId/rgpd/exports` | GET | EPIC 5/LOT 5.1 | ✅ Implémenté |
| **US 12.12** | List Deletion Requests | `GET /api/tenants/:tenantId/rgpd/deletions` | GET | EPIC 5/LOT 5.2 | ✅ Implémenté |
| **US 12.13** | Export CSV | `GET /api/tenants/:tenantId/export-csv` | GET | EPIC 5/LOT 5.3 | ✅ Implémenté |

### 1.4.2 Endpoints RGPD Complémentaires (Art. 18/21/22)

> Ces endpoints permettent au Tenant Admin de suivre les droits RGPD complémentaires exercés par ses users. **Implémentés dans LOT 10.6.**

| Droit RGPD | Fonctionnalité Tenant Admin | Endpoint BACK proposé | EPIC Source | Status |
|------------|----------------------------|----------------------|-------------|--------|
| **Art. 18** | Liste suspensions données | `GET /api/tenants/:tenantId/rgpd/suspensions` | EPIC 10/LOT 10.6 | ✅ Implémenté |
| **Art. 18** | Suspendre données tenant | `POST /api/tenants/:tenantId/rgpd/suspensions` | EPIC 10/LOT 10.6 | ✅ Implémenté |
| **Art. 21** | Liste oppositions | `GET /api/tenants/:tenantId/rgpd/oppositions` | EPIC 10/LOT 10.6 | ✅ Implémenté |
| **Art. 22** | Liste contestations IA | `GET /api/tenants/:tenantId/rgpd/contests` | EPIC 10/LOT 10.6 | ✅ Implémenté |
| **Art. 22** | Traiter contestation | `PATCH /api/rgpd/contests/:contestId` | EPIC 10/LOT 10.6 | ✅ Implémenté |

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
- [x] Page login partagée avec EPIC 11 (même app)
- [x] Redirection automatique selon scope :
  - scope PLATFORM → Dashboard Super Admin (EPIC 11)
  - scope TENANT → Dashboard Tenant Admin (EPIC 12)
- [x] Logout fonctionnel
- [ ] 2FA optionnel

**TODO (identifié lors de l'implémentation EPIC 11)** :
- [ ] Page "Accès non autorisé" au lieu de redirection silencieuse quand un SUPER_ADMIN tente d'accéder à `/portal` (amélioration UX)
- [ ] Option : Page login dédiée `/portal/login` (si séparation souhaitée)

---

#### US 12.2 : Dashboard Tenant (Vue d'ensemble)
**En tant que** Tenant Admin  
**Je veux** voir un dashboard de mon entreprise  
**Afin de** suivre l'activité IA et RGPD

**Acceptance Criteria** :
- [x] Widgets KPIs :
  - Total users actifs (admin/member)
  - AI jobs ce mois (succès vs échoués)
  - Consentements actifs (accordés vs révoqués)
  - Exports RGPD en cours (pending/completed)
  - Effacements RGPD en cours (pending/completed)
- [x] Graphiques :
  - AI jobs par jour (30 derniers jours)
  - Consentements accordés vs révoqués (évolution 12 semaines)
  - Taux succès/échec jobs IA (par purpose)
- [x] Activity feed (50 dernières actions) :
  - User créé
  - Consentement accordé/révoqué
  - Job IA lancé (succès/échec)
  - Export RGPD demandé
  - Effacement RGPD demandé
- [x] **Isolation tenant** : Voit uniquement **son** tenant

---

#### US 12.3 : Voir la liste des users de mon tenant
**En tant que** Tenant Admin  
**Je veux** voir tous les utilisateurs de mon entreprise  
**Afin de** gérer les comptes

**Acceptance Criteria** :
- [x] Table users :
  - Username, Email, Role (admin/member), Status (active/suspended), Created At, Last Login
- [x] Filtres :
  - Role : admin/member/all
  - Status : active/suspended/all
  - Recherche : par email ou username
- [x] Pagination (50 par page)
- [x] Tri par colonne (name, email, created_at, last_login)
- [x] Actions rapides :
  - Voir détails user
  - Éditer user
  - Suspendre/Réactiver user
  - Envoyer invitation (si pas encore activé)
- [x] **Isolation tenant** : Voit uniquement users de **son** tenant

---

#### US 12.4 : Créer un utilisateur de mon tenant ✅
**En tant que** Tenant Admin
**Je veux** créer un nouveau user dans mon entreprise
**Afin de** onboarder un collaborateur

**Acceptance Criteria** :
- [x] Formulaire :
  - Email (requis, unique par tenant)
  - Name (requis)
  - Role (requis) : dropdown admin/member
- [x] Validation :
  - Email format valide
  - Email unique dans le tenant (erreur si dupliqué)
  - Name 2-100 caractères
- [ ] Génération invitation :
  - Email envoyé avec lien activation (token unique, TTL 7j)
  - User créé avec status `pending` (devient `active` après activation)
- [x] Audit event créé (user.created)
- [x] Feedback : Toast succès + redirection vers liste users

---

#### US 12.5 : Voir les détails d'un user de mon tenant ✅
**En tant que** Tenant Admin
**Je veux** voir les détails d'un utilisateur de mon entreprise
**Afin de** comprendre son usage et troubleshooter

**Acceptance Criteria** :
- [x] Page détails user :
  - **Infos générales** : Email, Name, Role, Status, Created At, Last Login
  - **Stats** : Total AI jobs, Jobs succès/échecs, Consentements actifs
  - **Historique AI jobs** (table, derniers 100) :
    - Date, Purpose, Model, Status (success/failed), Latence
  - **Consentements** (table) :
    - Purpose, Status (granted/revoked), Date accordé, Date révoqué (si applicable)
  - **Audit events user** (table, derniers 50) :
    - Date, Action (consent.granted, ai.invoked, rgpd.export, etc.), Status
- [x] Actions possibles :
  - Éditer user (nom, role)
  - Suspendre/Réactiver user
  - Révoquer tous consentements (confirmation obligatoire)
- [x] **Isolation tenant** : Voit uniquement users de **son** tenant

---

#### US 12.6 : Éditer un utilisateur de mon tenant ✅
**En tant que** Tenant Admin
**Je veux** modifier les infos d'un utilisateur de mon entreprise
**Afin de** corriger ou mettre à jour ses données

**Acceptance Criteria** :
- [x] Formulaire pré-rempli :
  - Name (éditable)
  - Role (éditable) : dropdown admin/member
  - Email (lecture seule, pas éditable)
- [x] Validation :
  - Name 2-100 caractères
- [x] Sauvegarde :
  - PATCH /api/tenants/{tenantId}/users/{userId}
  - Audit event créé (user.updated)
- [x] Feedback : Toast succès + retour page détails user

---

#### US 12.7 : Suspendre un utilisateur de mon tenant ✅
**En tant que** Tenant Admin
**Je veux** suspendre un utilisateur de mon entreprise
**Afin de** bloquer temporairement son accès (départ, incident)

**Acceptance Criteria** :
- [x] Bouton "Suspendre" avec confirmation (modal)
- [x] Raison obligatoire (dropdown + texte libre) :
  - Départ de l'entreprise
  - Incident sécurité
  - Non-conformité RGPD
  - Autre (préciser)
- [x] Suspension immédiate :
  - User status = `suspended`
  - User ne peut plus se connecter (backend rejette auth)
- [ ] Email notification user (optionnel mais recommandé)
- [x] Audit event créé (user.suspended)
- [x] Réactivation possible (bouton "Réactiver")

---

#### US 12.8 : Configurer les purposes IA de mon tenant ✅
**En tant que** Tenant Admin
**Je veux** configurer les purposes IA disponibles dans mon entreprise
**Afin de** définir les usages autorisés (résumé, classification, extraction, etc.) avec conformité RGPD garantie

> **⚠️ RGPD CRITIQUE** : Chaque purpose doit avoir une base légale (Art. 6 RGPD). Le système fournit des templates pré-validés pour guider le Tenant Admin non-expert.

**Architecture Purpose Templates (3 niveaux)** :

```
┌─────────────────────────────────────────────────────────────────┐
│  NIVEAU 1 — TEMPLATES SYSTÈME (Plateforme)                      │
│  8 templates pré-validés RGPD, activés automatiquement          │
│  Base légale, niveau de risque, catégorie définis               │
│  Immutables par tenant (désactivables uniquement)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  NIVEAU 2 — CONFIGURATION TENANT                                │
│  Activer/désactiver templates système                            │
│  Personnaliser : libellé, description, obligatoire              │
│  Champs RGPD hérités (lecture seule)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  NIVEAU 3 — FINALITÉS PERSONNALISÉES (Wizard guidé)             │
│  Pour besoins métier non couverts par templates                 │
│  Wizard 5 étapes avec questions RGPD                            │
│  Avertissements automatiques, validation avant activation       │
└─────────────────────────────────────────────────────────────────┘
```

**Templates système inclus** (activés automatiquement pour chaque tenant) :

| Code | Nom | Base légale | Catégorie | Risque | DPIA |
|------|-----|-------------|-----------|--------|------|
| `AI_SUMMARIZATION` | Synthèse de documents | CONSENT | AI_PROCESSING | MEDIUM | Non |
| `AI_CLASSIFICATION` | Classification automatique | CONSENT | AI_PROCESSING | MEDIUM | Non |
| `AI_EXTRACTION` | Extraction d'entités | CONSENT | AI_PROCESSING | HIGH | Oui |
| `AI_GENERATION` | Génération de contenu | CONSENT | AI_PROCESSING | MEDIUM | Non |
| `AI_TRANSLATION` | Traduction automatique | CONSENT | AI_PROCESSING | LOW | Non |
| `AI_OCR` | Reconnaissance caractères | CONSENT | AI_PROCESSING | LOW | Non |
| `ANALYTICS_USAGE` | Statistiques utilisation | LEGITIMATE_INTEREST | ANALYTICS | LOW | Non |
| `ESSENTIAL_SECURITY` | Sécurité | LEGITIMATE_INTEREST | ESSENTIAL | LOW | Non |

**Champs RGPD obligatoires (Art. 6)** :
- `lawful_basis` : Base légale (CONSENT, CONTRACT, LEGAL_OBLIGATION, VITAL_INTEREST, PUBLIC_INTEREST, LEGITIMATE_INTEREST)
- `category` : Catégorie (AI_PROCESSING, ANALYTICS, MARKETING, ESSENTIAL)
- `risk_level` : Niveau de risque (LOW, MEDIUM, HIGH, CRITICAL)
- `max_data_class` : Classification données max (P0, P1, P2, P3)
- `requires_dpia` : DPIA requis (true/false)

**Acceptance Criteria** :

*Page liste purposes (avec onglets)* :
- [x] Onglet "Templates" : templates système (activés/désactivés)
- [x] Onglet "Personnalisées" : finalités créées par le tenant
- [x] Onglet "Toutes" : vue combinée avec filtres
- [x] Table : Label, Description, Base légale, Risque, Required, Active, Type (Système/Custom)
- [x] Badges visuels :
  - Base légale : CONSENTEMENT (bleu), INTÉRÊT LÉGITIME (vert), etc.
  - Risque : LOW (vert), MEDIUM (jaune), HIGH (orange), CRITICAL (rouge)
  - Type : Système (badge), Personnalisé (badge outline)
  - DPIA : Badge "DPIA requis" si applicable

*Actions templates système* :
- [x] Activer/désactiver (toggle)
- [x] Personnaliser libellé et description
- [x] Définir comme obligatoire (isRequired)
- [x] **INTERDIT** : modifier base légale, risque, catégorie (hérités, lecture seule)
- [x] **INTERDIT** : supprimer template système

*Browser templates (nouvelle page)* :
- [x] Grille de cards : templates disponibles avec icônes catégorie
- [x] Filtres : par catégorie, par niveau de risque, par base légale
- [x] Info explicative sur chaque template (description, base légale, risque)
- [x] Bouton "Activer pour mon organisation" avec modal de confirmation
- [x] Afficher templates déjà activés (badge "Actif")

*Wizard création finalité personnalisée (5 étapes)* :
- [x] **Étape 1 - Identification** : label, description (validation 2-100 / 10-500 chars)
- [x] **Étape 2 - Données personnelles** :
  - Checkbox : P0 (aucune), P1 (techniques), P2 (personnelles), P3 (sensibles)
  - Warning si P3 sélectionné : "Données sensibles Art. 9 - DPIA potentiellement requis"
- [x] **Étape 3 - Type de traitement** :
  - Checkbox : IA automatisé, profilage, décision automatisée Art. 22
  - Warning si profilage ou décision auto : "Vérification Art. 22 requise"
- [x] **Étape 4 - Base légale (Art. 6)** :
  - Radio : CONSENT (recommandé pour IA), CONTRACT, LEGAL_OBLIGATION, etc.
  - Explication pour chaque option
  - Suggestion automatique basée sur réponses précédentes
- [x] **Étape 5 - Validation** :
  - Récapitulatif complet
  - Niveau de risque calculé automatiquement
  - Avertissements RGPD si applicable
  - Checkbox "J'ai lu et compris les implications RGPD"
  - Checkbox DPIA si risque HIGH/CRITICAL : "Je reconnais qu'une DPIA peut être requise"

*Validation et conformité* :
- [x] Label unique par tenant
- [x] Description 10-500 caractères
- [x] Base légale obligatoire
- [x] Immutabilité base légale après création (modification = nouvelle version)
- [x] DPIA warning pour risques HIGH/CRITICAL

*Audit et traçabilité* :
- [x] Audit event : purpose.template.adopted, purpose.template.disabled
- [x] Audit event : purpose.custom.created, purpose.custom.updated
- [x] **Isolation tenant** : Purposes personnalisés isolés par tenant
- [x] Templates système partagés (lecture seule pour tous tenants)

---

#### US 12.9 : Voir la matrice consentements (users × purposes) ✅
**En tant que** Tenant Admin
**Je veux** voir une matrice des consentements (users × purposes)
**Afin de** avoir une vue d'ensemble des consentements IA

**Acceptance Criteria** :
- [x] Matrice consentements :
  - **Lignes** : Users de mon tenant
  - **Colonnes** : Purposes configurés
  - **Cellules** : État consentement :
    - Granted (vert)
    - Revoked (rouge)
    - Pending (gris) : jamais demandé
- [x] Filtres :
  - Par user (search)
  - Par purpose (dropdown)
  - Par statut (granted/revoked/pending)
- [x] Actions cellule (clic) :
  - Voir historique consentement (dates accordé/révoqué)
  - Révoquer consentement (confirmation obligatoire)
- [x] Export CSV :
  - Format : User Email, Purpose, Status, Date Granted, Date Revoked
  - RGPD-safe : P1/P2 uniquement, pas de contenu
- [x] **Isolation tenant** : Voit uniquement consentements de **son** tenant

---

#### US 12.10 : Voir l'historique des consentements d'un user ✅
**En tant que** Tenant Admin
**Je veux** voir l'historique complet des consentements d'un utilisateur
**Afin de** tracer les changements de consentement (audit RGPD)

**Acceptance Criteria** :
- [x] Timeline consentements (par user) :
  - Date, Purpose, Action (granted/revoked), Source (user/admin)
- [x] Filtres :
  - Par purpose
  - Par date range
- [x] Détails :
  - Si révoqué : date révocation, raison (optionnel)
  - Si accordé : date accord, IP (optionnel), user agent (optionnel)
- [x] Export CSV historique (RGPD-safe)
- [x] **Isolation tenant** : Voit uniquement consentements de **son** tenant

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
| **Framework** | Next.js 16.1+ App Router | SSR, Server Components, React 19, cohérence EPIC 11 |
| **Auth** | NextAuth.js v5 | Session management, intégration native |
| **UI Library** | shadcn/ui (Radix UI + Tailwind) | Composants accessibles, React 19 compatible, cohérence EPIC 11 |
| **Styling** | Tailwind CSS v4 | Cohérence design system |
| **Forms** | React Hook Form + Zod | Validation typesafe, React 19 compatible |
| **State** | Zustand v5 | Léger, performant, React 19 natif |
| **Data fetching** | TanStack Query v5 | Cache, revalidation, React 19 ready |
| **Charts** | Recharts v2 | API déclarative, React 19 natif, cohérence EPIC 11 |
| **Tables** | TanStack Table v8 | Filtres, tri, pagination, React 19 ready |

### 4.1.1 Bonnes Pratiques Next.js 16 + React 19

**Patterns critiques à respecter** :

1. **Server Components par défaut**
   - ✅ Tous les composants sont Server Components sauf indication `'use client'`
   - ✅ Ajouter `'use client'` UNIQUEMENT pour : hooks (useState, useEffect), event handlers, browser APIs
   - ❌ Ne JAMAIS mettre `'use client'` sur layouts ou pages entières

2. **Séparation Server/Client**
   - ✅ Fetch data dans Server Components → passer en props aux Client Components
   - ✅ Props Server → Client doivent être sérialisables (pas de fonctions, classes, Dates)
   - ✅ Utiliser Server Actions (`'use server'`) pour mutations depuis Client Components

3. **React Compiler (stable en v16.1)**
   - ✅ Activé par défaut en mode `all` (optimisation automatique)
   - ℹ️ Mode `annotation` disponible si besoin de contrôle fin (`'use memo'`)

4. **Performance & UX**
   - ✅ Utiliser `<Suspense>` pour streaming progressif
   - ✅ Hook `use()` pour unwrap Promises dans Client Components
   - ✅ Dynamic imports (`next/dynamic`) pour composants lourds

5. **Documentation complète**
   - 📖 Consulter **Context7** pour patterns avancés : `/vercel/next.js/v16.1.0`
   - 📖 Exemples officiels : [Next.js Examples](https://github.com/vercel/next.js/tree/canary/examples)

**⚠️ Anti-patterns à éviter** :
- ❌ `'use client'` sur page entière (sauf SPA pure)
- ❌ Fetch data dans Client Components (useEffect + fetch)
- ❌ Passer fonctions/classes en props Server → Client
- ❌ Ignorer React Compiler warnings

### 4.2 Structure du projet (Next.js Monolithique avec Route Groups Séparés)

**Architecture DÉCIDÉE** : Next.js monolithique avec **route groups séparés** et **préfixes URL visibles** — cf. [TASKS.md section 2.2](../../TASKS.md#22-architecture-frontend)

```
app/
├── api/                           # Backend API (déjà existant)
│
├── (platform-admin)/              # Route group Super Admin (EPIC 11)
│   ├── layout.tsx                 # Layout Super Admin (PlatformSidebar)
│   └── admin/                     # Préfixe URL visible /admin/
│       └── ...                    # Voir EPIC 11
│
├── (tenant-admin)/                # ⬅️ Route group Tenant Admin (EPIC 12)
│   ├── layout.tsx                 # Layout Tenant Admin (TenantSidebar)
│   └── portal/                    # ⬅️ Préfixe URL visible /portal/
│       ├── page.tsx               # Dashboard → /portal
│       ├── dashboard/page.tsx     # Dashboard → /portal/dashboard
│       ├── users/                 # Users Tenant (LOT 12.1)
│       │   ├── page.tsx           # Liste users → /portal/users
│       │   ├── new/page.tsx       # Créer user → /portal/users/new
│       │   └── [id]/page.tsx      # Détails user → /portal/users/:id
│       ├── consents/              # Consentements (LOT 12.2)
│       │   ├── page.tsx           # Vue globale → /portal/consents
│       │   ├── purposes/page.tsx  # Liste purposes → /portal/consents/purposes
│       │   ├── matrix/page.tsx    # Matrice → /portal/consents/matrix
│       │   └── [userId]/page.tsx  # Historique user → /portal/consents/:userId
│       └── rgpd/                  # RGPD Requests (LOT 12.3)
│           ├── page.tsx           # Vue globale → /portal/rgpd
│           ├── exports/page.tsx   # Demandes export → /portal/rgpd/exports
│           └── deletions/page.tsx # Demandes effacement → /portal/rgpd/deletions
│
├── (frontend)/                    # Route group End User (EPIC 13)
│   ├── layout.tsx                 # Layout User + Cookie Banner
│   └── app/                       # Préfixe URL visible /app/ (ou racine /)
│       └── ...                    # Voir EPIC 13
│
├── (legal)/                       # Pages légales publiques (SSG)
│   ├── privacy-policy/page.tsx
│   ├── terms-of-service/page.tsx
│   └── rgpd-info/page.tsx
│
├── login/                         # ⬅️ Login partagé → /login
│   └── page.tsx                   # Redirection scope-based après auth
│
└── middleware.ts                  # Middleware global (auth, scope, RGPD)

src/
├── components/
│   ├── ui/                        # shadcn components (partagés)
│   ├── platform-admin/            # Components Super Admin (EPIC 11)
│   │   └── PlatformSidebar.tsx
│   ├── tenant-admin/              # ⬅️ Components Tenant Admin (EPIC 12)
│   │   ├── TenantSidebar.tsx
│   │   ├── UserTable.tsx
│   │   ├── ConsentMatrix.tsx
│   │   └── ...
│   └── shared/                    # Components partagés (tables, charts)
├── lib/
│   ├── api.ts                     # API client (fetch wrapper)
│   ├── auth.ts                    # NextAuth config
│   └── utils.ts
└── middleware.ts                  # Auth + scope validation
```

**URLs Tenant Admin (EPIC 12)** :
| Page | URL |
|------|-----|
| Login (partagé) | `/login` |
| Dashboard | `/portal` ou `/portal/dashboard` |
| Liste users tenant | `/portal/users` |
| Détail user | `/portal/users/:id` |
| Consentements | `/portal/consents` |
| Matrice consentements | `/portal/consents/matrix` |
| Demandes RGPD | `/portal/rgpd` |

**Fonctionnement route groups** :
- `(tenant-admin)/` est un route group → **pas d'URL `/tenant-admin`**
- `portal/` est un dossier réel → **préfixe URL visible `/portal/`**
- Organisation logique du code (Super Admin `/admin/` vs Tenant Admin `/portal/` séparés)

**Avantages RGPD** (cf. TASKS.md section 2.2) :
- ✅ **Pas de CORS** : Frontend et API sur même origin (sécurité maximale)
- ✅ **Gateway LLM inaccessible** : Imports Gateway LLM côté serveur uniquement (pas de bypass client)
- ✅ **Middleware centralisé** : Résolution tenant, auth, permissions, audit trail
- ✅ **Secrets centralisés** : Un seul `.env` (pas de duplication clés API)
- ✅ **Séparation claire** : Pas de collision URL entre Super Admin (`/admin/`) et Tenant Admin (`/portal/`)

### 4.3 Middleware Isolation Tenant (Critique RGPD)

```typescript
// src/middleware.ts (middleware global partagé)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const pathname = request.nextUrl.pathname;

  // Routes publiques (login, pages légales)
  const publicPaths = ['/login', '/privacy-policy', '/terms-of-service', '/rgpd-info'];
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // Auth requise
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ============================================
  // Routes Tenant Admin (scope TENANT) - /portal/*
  // ============================================
  if (pathname.startsWith('/portal')) {
    if (token.scope !== 'TENANT') {
      return NextResponse.json(
        { error: 'Forbidden: TENANT scope required' },
        { status: 403 }
      );
    }

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

  // ============================================
  // Routes Super Admin (scope PLATFORM) - /admin/*
  // ============================================
  if (pathname.startsWith('/admin')) {
    if (token.scope !== 'PLATFORM') {
      return NextResponse.json(
        { error: 'Forbidden: PLATFORM scope required' },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // ============================================
  // Routes End User (scope MEMBER) - /app/*
  // ============================================
  if (pathname.startsWith('/app')) {
    if (token.scope !== 'MEMBER') {
      return NextResponse.json(
        { error: 'Forbidden: MEMBER scope required' },
        { status: 403 }
      );
    }
    return NextResponse.next();
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

- [x] Tenant Admin peut se connecter (même login que Super Admin)
- [x] Tenant Admin est redirigé vers son dashboard tenant (scope TENANT)
- [x] Dashboard tenant affiche stats exactes (users, AI jobs, consents, RGPD)
- [x] Tenant Admin peut créer/éditer/suspendre users de **son** tenant uniquement
- [x] Tenant Admin peut voir détails complets d'un user (historique jobs, consents, audit)
- [x] Tenant Admin peut configurer purposes IA de **son** tenant
- [x] Tenant Admin peut voir matrice consentements (users × purposes)
- [x] Tenant Admin peut voir historique consentements par user
- [x] Tenant Admin peut voir demandes export RGPD de **ses** users (LOT 12.3) ✅
- [x] Tenant Admin peut voir demandes effacement RGPD de **ses** users (LOT 12.3) ✅
- [x] Tenant Admin peut exporter données en CSV (RGPD-safe : P1/P2 uniquement)

### 6.2 RGPD

- [x] **Isolation tenant stricte** : Admin tenant A ne voit **JAMAIS** données tenant B
- [x] Aucune donnée P3 affichée (contenus prompts/outputs interdits)
- [x] Aucune donnée P2/P3 stockée côté client (localStorage/sessionStorage)
- [x] Messages d'erreur RGPD-safe (pas de stack traces)
- [x] Export CSV RGPD-safe (P1/P2 uniquement)
- [x] Actions Tenant Admin auditées (backend)

### 6.3 Sécurité ✅

- [x] HTTPS obligatoire (HSTS activé) — `next.config.ts` Strict-Transport-Security
- [x] JWT tokens httpOnly (pas localStorage) — `AUTH_COOKIES` + `credentials: 'include'`
- [x] CSRF protection activée — SameSite=Strict + httpOnly cookies
- [x] CSP headers configurés — `next.config.ts` Content-Security-Policy
- [x] XSS protection (dangerouslySetInnerHTML uniquement pages légales contrôlées)
- [x] Middleware valide scope TENANT (403 si PLATFORM tente accès) — `withTenantScope()`
- [x] Backend valide tenantId JWT = tenantId URL/body

### 6.4 Performance ✅

- [x] Time to Interactive < 2s (dashboard) — Next.js App Router + optimizations
- [x] Pagination performante (tables 100+ items) — TanStack Table
- [x] TanStack Query cache actif (pas de refetch inutile) — staleTime configuré
- [x] Lazy loading composants lourds (matrice consentements, charts)

### 6.5 UX ✅

- [x] Design cohérent avec EPIC 11 (même design system) — shadcn/ui
- [x] Responsive (desktop prioritaire, dégradé gracieux mobile)
- [x] Feedback utilisateur (toasts, loading states, confirmations) — Sonner toasts
- [x] Accessibility (WCAG 2.1 AA minimum) — Radix UI primitives + aria attributes
- [x] Navigation intuitive (sidebar claire, breadcrumbs)

---

## 7. Découpage en LOTs

Référence **TASKS.md** :

| LOT | Description | Durée estimée | Dépendances | Statut |
|-----|-------------|---------------|-------------|--------|
| **LOT 12.0** | Dashboard Tenant + Activity Feed | 3 jours | LOT 5.3 (API Routes), LOT 11.0 (Infra Back Office) | ✅ **TERMINÉ** |
| **LOT 12.1** | Gestion Users Tenant (CRUD) | 4 jours | LOT 12.0 | ✅ **TERMINÉ** |
| **LOT 12.2** | Gestion Consentements (Purposes + Matrix) | 5 jours | LOT 5.0 (Consentement backend), LOT 12.0 | ✅ **TERMINÉ** |
| **LOT 12.3** | RGPD Management (Export/Delete Requests) | 4 jours | LOT 5.1-5.2 (Export/Effacement backend), LOT 12.0 | ✅ **TERMINÉ** |
| **LOT 12.4** | Fonctionnalités DPO (DPIA + Registre Art. 30) | 5 jours | LOT 12.2, LOT 12.3, LOT 10.5 (DPIA backend) | ✅ **TERMINÉ** |

**Total EPIC 12** : ~21 jours (4,2 semaines)

### 7.1 Détails LOT 12.0 - Dashboard Tenant ✅

**Implémenté** :
- Dashboard tenant avec KPIs (users, jobs IA, consentements, RGPD)
- Widgets statistiques avec Recharts
- Activity feed (dernières actions)
- Isolation tenant stricte

**Pages** :
- `/portal` - Dashboard principal
- `/portal/dashboard` - Alias dashboard

### 7.2 Détails LOT 12.1 - Gestion Users Tenant ✅

**Implémenté** :
- Liste users avec filtres et pagination
- Création user avec formulaire validé
- Détails user avec stats, jobs, consents, audit
- Édition user (nom, rôle)
- Suspension/Réactivation user

**Pages** :
- `/portal/users` - Liste users
- `/portal/users/new` - Création user
- `/portal/users/[id]` - Détails user
- `/portal/users/[id]/edit` - Édition user

### 7.3 Détails LOT 12.2 - Gestion Consentements ✅

**Implémenté** :

*Onglet Purposes (Finalités IA)* :
- Liste des purposes tenant avec filtres
- Wizard 5 étapes création purpose personnalisé (stepper RGPD)
- Browser templates système (8 templates pré-validés)
- Adoption/activation templates
- Édition purpose existant
- Lien fort purpose → consent via `purposeId`

*Onglet Matrice* :
- Matrice users × purposes
- États visuels : Accordé (vert), Révoqué (rouge), En attente (gris)
- Actions : voir historique, révoquer consent

*Onglet Historique* :
- Timeline consentements par user
- Filtres par purpose, date
- Export CSV RGPD-safe

*APIs implémentées* :
- `GET /api/purposes` - Liste purposes
- `GET /api/purposes/templates` - Templates système
- `POST /api/purposes/adopt` - Adopter template
- `POST /api/purposes/custom` - Créer purpose personnalisé
- `POST /api/purposes/custom/validate` - Valider purpose
- `PATCH /api/purposes/:id` - Modifier purpose
- `GET /api/consents/matrix` - Matrice consentements
- `GET /api/consents/history` - Historique par user
- `GET /api/consents/export` - Export CSV

*Tests* :
- 43+ tests unitaires (gateway, usecases, API routes)
- Support `PurposeIdentifier` (purposeId ou label)
- Backward compatibility avec consent string-based

**Pages** :
- `/portal/consents` - Vue globale avec onglets
- `/portal/consents/purposes` - Liste purposes
- `/portal/consents/purposes/new` - Wizard création (stepper 5 étapes)
- `/portal/consents/purposes/[id]/edit` - Édition purpose
- `/portal/consents/matrix` - Matrice users × purposes
- `/portal/consents/history` - Historique consentements

**Documentation** :
- `docs/implementation/LOT12.2_IMPLEMENTATION.md` - Rapport complet

### 7.4 Détails LOT 12.4 - Fonctionnalités DPO ✅

> **Architecture DPO** : Le DPO est un **rôle** (`ACTOR_ROLE.DPO`) au sein du scope `TENANT`, pas un scope séparé. Il utilise la même interface `/portal/*` avec une **sidebar conditionnelle** basée sur `user.role === 'DPO'`.

#### 7.4.0 Séparation TENANT_ADMIN / DPO (Conformité Art. 38 RGPD)

> **⚠️ CRITIQUE RGPD** : Le DPO doit être indépendant (Art. 38.3) et ne pas avoir de conflit d'intérêts (Art. 38.6).

**Règles d'implémentation** :

| Règle | Description | Justification RGPD |
|-------|-------------|-------------------|
| **Comptes séparés** | TENANT_ADMIN et DPO = 2 users distincts dans la base | Séparation des responsabilités |
| **Un rôle par compte** | Un user ne peut avoir qu'un seul rôle | Éviter cumul conflictuel |
| **Pas de switch de rôle** | Impossible de changer de rôle en session | Traçabilité claire |
| **Détection cumul** | Warning si même email/nom pour les 2 rôles | Art. 38.6 - Conflit d'intérêts |

**Workflow d'assignation DPO** :
```typescript
// À l'assignation du rôle DPO
async function assignDpoRole(userId: string, tenantId: string) {
  const user = await getUser(userId);

  // Vérifier si l'email est similaire à un TENANT_ADMIN existant
  const existingAdmin = await findAdminWithSimilarEmail(user.email, tenantId);

  if (existingAdmin) {
    // Audit RGPD obligatoire
    await emitAuditEvent({
      eventType: 'rgpd.dpo.conflict_warning',
      metadata: {
        warning: 'DPO may be same person as TENANT_ADMIN',
        article: 'Art. 38.6 RGPD - Potential conflict of interest',
        adminEmail: existingAdmin.email,
        dpoEmail: user.email
      }
    });

    // Retourner warning (ne bloque pas, mais documente)
    return {
      success: true,
      requiresAcknowledgment: true,
      warning: {
        code: 'DPO_CONFLICT_WARNING',
        message: `⚠️ RGPD Art. 38.6 - Le cumul des fonctions d'administrateur et DPO
                  peut créer un conflit d'intérêts. La CNIL recommande de séparer ces rôles.`,
        recommendation: 'Désigner une personne différente comme DPO si possible.'
      }
    };
  }

  return { success: true };
}
```

**Interface UI - Warning cumul avec transfert de responsabilité** :
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Avertissement RGPD - Art. 38.6                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Le DPO désigné (alice@company.com) semble être la même        │
│  personne que l'administrateur du tenant.                       │
│                                                                 │
│  Le RGPD (Art. 38.6) indique que le DPO peut exercer d'autres  │
│  missions à condition qu'elles n'entraînent pas de conflit     │
│  d'intérêts.                                                    │
│                                                                 │
│  La CNIL recommande de ne pas désigner comme DPO :              │
│  • Le responsable IT / DSI                                      │
│  • Le responsable RH                                            │
│  • Le dirigeant de l'entreprise                                 │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ⚖️ TRANSFERT DE RESPONSABILITÉ                            │ │
│  │                                                           │ │
│  │ En confirmant cette assignation, votre organisation       │ │
│  │ (le responsable du traitement au sens de l'Art. 24 RGPD)  │ │
│  │ reconnaît et accepte :                                    │ │
│  │                                                           │ │
│  │ 1. Avoir été informée du potentiel conflit d'intérêts     │ │
│  │ 2. Prendre la responsabilité de cette décision            │ │
│  │ 3. Pouvoir justifier ce choix auprès de la CNIL           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [ ] Je confirme que mon organisation assume la responsabilité  │
│      de cette décision conformément à l'Art. 24 RGPD.           │
│                                                                 │
│  [Annuler]                            [Confirmer l'assignation] │
└─────────────────────────────────────────────────────────────────┘
```

**Chaîne de responsabilité (Art. 24 RGPD)** :

| Acteur | Responsabilité | Ce qu'il fournit |
|--------|---------------|------------------|
| **Plateforme** (vous) | Informer et documenter | Warning + audit + preuve |
| **Tenant** (entreprise) | Décision organisationnelle | Acknowledgment + justification |
| **DPO** (personne) | Exercice indépendant | Signalement si conflit réel |

**Données enregistrées lors de l'acknowledgment** :
```typescript
interface DpoConflictAcknowledgment {
  tenantId: string;
  dpoUserId: string;
  adminUserId: string;           // Admin qui a fait l'assignation
  acknowledgedAt: Date;
  acknowledgedBy: string;        // Qui a coché la case (userId)
  ipAddress: string;             // IP de confirmation
  userAgent: string;             // Browser/device
  warningDisplayed: string;      // Hash du texte warning affiché
  rgpdArticles: ['Art. 24', 'Art. 38.3', 'Art. 38.6'];
}
```

**Export preuve pour le tenant** :
- PDF téléchargeable avec : date, warning affiché, personne ayant confirmé
- Conservé dans l'audit trail du tenant
- Utilisable en cas de contrôle CNIL

**Acceptance Criteria séparation DPO** :
- [ ] Un user = un seul rôle (TENANT_ADMIN ou DPO, pas les deux)
- [ ] Détection automatique si même personne physique (email similaire)
- [ ] Warning RGPD Art. 38.6 affiché avec mention responsabilité Art. 24
- [ ] Checkbox acknowledgment avec texte transfert responsabilité
- [ ] Audit event créé avec données complètes (IP, timestamp, qui a confirmé)
- [ ] Export PDF preuve disponible pour le tenant
- [ ] Test E2E : assignation DPO avec warning cumul + acknowledgment
- [ ] Test unitaire : détection emails similaires
- [ ] Test unitaire : génération preuve PDF

#### 7.4.0.1 Répartition Alertes Protection (TENANT vs PLATFORM)

> **Clarification architecturale** : Les fonctionnalités de protection se répartissent entre LOT 12.4 (TENANT) et **EPIC 14** (PLATFORM).

**Ce que reçoit le DPO/Tenant (LOT 12.4 - scope TENANT)** :

| Fonctionnalité | Description | Implémentation |
|----------------|-------------|----------------|
| **Dashboard alertes DPO** | KPIs + alertes conformité | Widget dans `/portal` si `role === 'DPO'` |
| **Warning cumul DPO/Admin** | Détection lors création/édition user | Modal + acknowledgment |
| **Alertes délais RGPD** | Demande > 30 jours sans réponse | Badge + notification |
| **Notification DPIA à valider** | Nouveau purpose activé | Badge dans sidebar |
| **Bouton escalade** | Signaler problème à la plateforme | `POST /api/platform/escalade` |

**Ce que gère la Plateforme (EPIC 14 - scope PLATFORM)** :

| Fonctionnalité | Description | LOT EPIC 14 |
|----------------|-------------|-------------|
| **Monitoring global tenants** | Vue consolidée conformité tous tenants | LOT 14.0 |
| **Escalade reçue de tenants** | Tableau de bord escalades | LOT 14.0 |
| **Blocking tenant non-conforme** | Action suspension tenant | LOT 14.0 |
| **Rapport mensuel global** | Statistiques conformité plateforme | LOT 14.0 |
| **Actions coercitives** | Suspension/réactivation tenant | LOT 14.0 (utilise API LOT 11.1) |

**Workflow escalade (TENANT → PLATFORM)** :
```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      DPO        │       │   PLATEFORME    │       │   SUPER ADMIN   │
│ signale problème│──────▶│ reçoit escalade │──────▶│ décide action   │
│ via API (12.4)  │       │ (EPIC 14)       │       │ (warning/block) │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

**API escalade (appelée depuis `/portal` - LOT 12.4)** :
```typescript
// POST /api/platform/escalade (accessible scope TENANT, traité par EPIC 14)
interface EscaladeRequest {
  tenantId: string;        // Auto-injecté depuis JWT
  type: 'RGPD_NON_COMPLIANCE' | 'DPO_CONFLICT' | 'SECURITY_INCIDENT' | 'OTHER';
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  attachments?: string[];  // IDs audit events liés
}
```

> **Note** : Les endpoints de monitoring global et blocking sont documentés dans `EPIC_14_Securite_Gouvernance_RGPD.md`.

**Objectif** : Permettre au DPO du tenant de :
1. Consulter et valider les DPIA pré-remplis par le développeur pour chaque outil IA
2. Gérer le Registre des traitements (Art. 30 RGPD)
3. Suivre la conformité RGPD du tenant

#### 7.4.1 Sidebar conditionnelle

```typescript
// TenantSidebar.tsx - Ajout menus DPO
const navigation = [
  // Menus Tenant Admin (existants)
  { name: 'Dashboard', href: '/portal', icon: LayoutDashboard },
  { name: 'Utilisateurs', href: '/portal/users', icon: Users },
  { name: 'Consentements', href: '/portal/consents', icon: Shield },
  { name: 'RGPD', href: '/portal/rgpd', icon: FileText },

  // Menus DPO (conditionnels)
  ...(user.role === 'DPO' ? [
    { name: 'DPIA', href: '/portal/dpia', icon: FileSearch, badge: 'DPO' },
    { name: 'Registre Art. 30', href: '/portal/registre', icon: Database, badge: 'DPO' },
  ] : []),
];
```

#### 7.4.2 Pages DPIA (`/portal/dpia/*`)

**Concept DPIA pré-rempli** :
- Le développeur (PLATFORM) crée les outils IA avec leurs DPIA pré-remplis (`DpiaTemplate`)
- Le DPO du tenant consulte, modifie si besoin, et **valide** les DPIA
- Une fois validé, le DPIA est gelé (immutable) et horodaté

**Routes** :
| Route | Description |
|-------|-------------|
| `/portal/dpia` | Liste des DPIA (tous outils activés pour le tenant) |
| `/portal/dpia/[purposeCode]` | Détail DPIA d'un outil (lecture + validation) |
| `/portal/dpia/[purposeCode]/edit` | Modification DPIA avant validation (DPO only) |

**Interface `DpiaTemplate`** :
```typescript
interface DpiaTemplate {
  purposeCode: string;           // Code purpose lié (ex: 'AI_EXTRACTION')
  title: string;                 // Titre DPIA
  description: string;           // Description traitement

  // Section 1: Nature du traitement
  processingNature: {
    dataTypes: string[];         // Types données traitées
    dataCategories: DataClassification[]; // P0, P1, P2, P3
    dataSubjects: string[];      // Catégories personnes concernées
    processingOperations: string[]; // Opérations effectuées
  };

  // Section 2: Nécessité et proportionnalité
  necessity: {
    purpose: string;             // Finalité détaillée
    lawfulBasis: LawfulBasis;    // Base légale Art. 6
    dataMinimsation: boolean;    // Minimisation respectée
    retentionPeriod: string;     // Durée conservation
    dataSubjectRights: string;   // Exercice des droits
  };

  // Section 3: Risques identifiés
  risks: Array<{
    id: string;
    description: string;
    likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    mitigations: string[];
  }>;

  // Section 4: Mesures de sécurité
  securityMeasures: {
    technical: string[];         // Mesures techniques (chiffrement, pseudonymisation...)
    organizational: string[];    // Mesures organisationnelles
    llmSpecific: string[];       // Mesures spécifiques Gateway LLM
  };

  // Métadonnées
  createdBy: string;             // Développeur ayant créé le template
  createdAt: Date;
  version: string;

  // Validation DPO (rempli par le DPO)
  dpoValidation?: {
    validatedBy: string;         // DPO ID
    validatedAt: Date;
    comments?: string;
    status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'REQUIRES_CHANGES';
  };
}
```

**Workflow DPIA** :
```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ TENANT_ADMIN    │       │      DPO        │       │    SYSTÈME      │
│ active template │──────▶│ reçoit notif    │──────▶│ DPIA créé       │
│ pour tenant     │       │ "DPIA à valider"│       │ status=PENDING  │
└─────────────────┘       └────────┬────────┘       └─────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │ DPO consulte    │
                          │ DPIA pré-rempli │
                          └────────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
            ┌───────────┐  ┌───────────┐  ┌───────────┐
            │ VALIDE    │  │ MODIFIE   │  │ REJETTE   │
            │ (gelé)    │  │ puis      │  │ (raison)  │
            └───────────┘  │ VALIDE    │  └───────────┘
                           └───────────┘
```

#### 7.4.3 Registre des traitements (Art. 30)

**Routes** :
| Route | Description |
|-------|-------------|
| `/portal/registre` | Registre complet des traitements |
| `/portal/registre/export` | Export PDF/CSV du registre |

**Contenu du registre** (généré automatiquement) :
- Liste des finalités activées pour le tenant
- Base légale de chaque traitement
- Catégories de données traitées
- Durées de conservation
- Mesures de sécurité
- Coordonnées DPO
- Date dernière mise à jour

#### 7.4.4 APIs DPO

| Endpoint | Méthode | Description | Role |
|----------|---------|-------------|------|
| `GET /api/dpia` | GET | Liste DPIA tenant | DPO |
| `GET /api/dpia/:purposeCode` | GET | Détail DPIA | DPO |
| `PATCH /api/dpia/:purposeCode` | PATCH | Modifier DPIA (avant validation) | DPO |
| `POST /api/dpia/:purposeCode/validate` | POST | Valider DPIA | DPO |
| `GET /api/registre` | GET | Registre Art. 30 | DPO, TENANT_ADMIN |
| `GET /api/registre/export` | GET | Export registre PDF/CSV | DPO |

#### 7.4.5 Acceptance Criteria LOT 12.4

**Sidebar DPO** :
- [x] Sidebar affiche menus DPIA et Registre uniquement si `role === 'DPO'`
- [x] Badge "DPO" sur les menus spécifiques
- [x] Navigation fluide entre pages DPO et pages Tenant Admin

**Pages DPIA** :
- [x] Liste DPIA avec statuts (PENDING, VALIDATED, REJECTED)
- [x] Filtres par statut, par date, par niveau de risque
- [x] Vue détaillée DPIA pré-rempli avec toutes sections
- [x] Mode édition pour modifier avant validation
- [x] Boutons Valider / Rejeter avec confirmation
- [x] Historique des validations/rejets

**Registre Art. 30** :
- [x] Vue registre complet avec tous traitements actifs
- [x] Export PDF formaté CNIL-compliant
- [x] Export CSV pour analyses
- [x] Horodatage dernière mise à jour

**RBAC** :
- [x] Routes `/portal/dpia/*` accessibles uniquement si `role === 'DPO'`
- [x] API endpoints protégés par RBAC (403 si non DPO)
- [x] Registre accessible DPO + TENANT_ADMIN (lecture seule pour admin)

**Tests obligatoires** :
- [x] Test E2E : DPO accède aux pages DPIA
- [x] Test E2E : TENANT_ADMIN ne voit pas les menus DPO
- [x] Test E2E : Workflow validation DPIA complet
- [x] Test unitaire : RBAC sur endpoints DPO
- [x] Test unitaire : Génération registre Art. 30

**RGPD Compliance** :
- [x] Art. 30 : Registre des traitements conforme
- [x] Art. 35 : DPIA documentés et validés
- [x] Art. 37-39 : Fonctionnalités DPO respectées

#### 7.4.6 Articulation LOT 12.3 ↔ LOT 12.4 (Accès DPO aux données RGPD)

> **Important** : Le DPO a besoin d'accéder aux données opérationnelles RGPD (LOT 12.3) pour assurer sa mission de conformité.

**Accès DPO aux pages LOT 12.3** :

| Page LOT 12.3 | Accès DPO | Action DPO |
|---------------|-----------|------------|
| `/portal/rgpd/exports` | ✅ Lecture | Statistiques pour rapport conformité |
| `/portal/rgpd/deletions` | ✅ Lecture | Statistiques pour rapport conformité |
| `/portal/rgpd/suspensions` | ✅ Lecture | Suivi Art. 18 (limitation traitement) |
| `/portal/rgpd/oppositions` | ✅ Lecture | Suivi Art. 21 (droit d'opposition) |
| `/portal/rgpd/contests` | ✅ Lecture + **Action** | **Valider conformité** de la réponse TENANT_ADMIN |

**Workflow contestations Art. 22 (partagé LOT 12.3 + 12.4)** :
```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     USER        │       │  TENANT_ADMIN   │       │      DPO        │
│ conteste        │──────▶│ reçoit et       │──────▶│ valide que la   │
│ décision IA     │       │ répond          │       │ réponse est     │
└─────────────────┘       └─────────────────┘       │ conforme RGPD   │
                                                    └─────────────────┘
```

**Widget Dashboard DPO** (intégré dans `/portal` si `role === 'DPO'`) :
- KPIs RGPD agrégés :
  - Demandes export en cours / traitées
  - Demandes effacement en cours / traitées
  - Contestations en attente de validation DPO
  - Délai moyen de traitement
- **Alertes conformité** :
  - ⚠️ Demande > 30 jours sans réponse (non-conformité Art. 12)
  - ⚠️ Contestation Art. 22 non traitée
  - ⚠️ DPIA en attente de validation

**Acceptance Criteria supplémentaires** :
- [x] DPO peut accéder aux pages `/portal/rgpd/*` en lecture
- [x] DPO peut valider conformité des réponses aux contestations Art. 22
- [x] Dashboard DPO affiche KPIs RGPD agrégés
- [x] Alertes conformité visibles sur dashboard DPO
- [x] Test E2E : DPO valide une contestation Art. 22

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

### 8.2 Tests obligatoires ✅

- [x] **Tests E2E** (Playwright) :
  - Auth flow Tenant Admin (login → dashboard tenant → logout)
  - Créer user tenant E2E
  - Isolation tenant stricte (admin tenant A ne voit pas tenant B)
  - Matrice consentements fonctionnelle
  - Demandes RGPD visibles (export/effacement)
- [x] **Tests RGPD** :
  - Pas de données P3 affichées (prompts/outputs interdits)
  - Pas de données P2/P3 dans localStorage
  - Messages erreur RGPD-safe
  - Export CSV RGPD-safe (P1/P2 uniquement)
- [x] **Tests Sécurité** :
  - Middleware rejette scope PLATFORM sur routes tenant
  - Backend valide tenantId JWT = tenantId URL
  - CSRF tokens présents (toutes mutations)

---

## 9. Checklist de livraison (DoD EPIC 12) ✅

### Code
- [x] Tous les LOTs 12.0-12.4 implémentés
- [x] Tests E2E passants (100%) — 63/63 tests UI
- [x] Tests RGPD passants (100%)
- [x] TypeScript strict (0 erreurs)
- [x] Lint passant (0 warnings)

### Documentation
- [x] README Back Office Tenant (setup, usage)
- [x] Guide utilisateur Tenant Admin (manuel)
- [x] Guide utilisateur DPO (DPIA, Registre Art. 30)

### Sécurité
- [x] Scan sécurité frontend (npm audit)
- [x] CSP validé
- [x] Isolation tenant validée (tests)
- [x] RBAC DPO validé (accès conditionnel)

### Performance
- [x] Lighthouse score > 90
- [x] Bundle size < 500KB (gzip)

### RGPD
- [x] Isolation tenant stricte (tests E2E)
- [x] Pas de données P3 affichées (audit)
- [x] Export CSV RGPD-safe (validation)
- [x] Registre Art. 30 conforme
- [x] DPIA validés et horodatés

---

## 10. Prochaines étapes

Après complétion EPIC 12 :
1. **EPIC 13** : Front User (interface utilisateur final pour utiliser AI Tools)

---

**Document créé le 25 décembre 2025**
**Version 1.1** (Ajout LOT 12.4 - Fonctionnalités DPO)
**Auteur** : Équipe Plateforme RGPD-IA
