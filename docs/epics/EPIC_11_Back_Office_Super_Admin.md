# EPIC 11 — Back Office Super Admin (Interface PLATFORM)

**Date** : 25 décembre 2025
**Statut** : ❌ TODO
**Périmètre** : Frontend (Interface Web)
**Scope** : PLATFORM (Super Admin uniquement)
**RGPD Coverage** : Art. 5 (Minimisation), Art. 25 (Privacy by Design), Art. 32 (Sécurité)

---

## 0. Architecture technique (DÉCISION VALIDÉE)

### 0.1 Next.js monolithique (BACK + FRONT)

**Architecture retenue** : **Next.js monolithique avec route groups séparés**

L'interface Back Office Super Admin sera développée dans le **même projet Next.js** que le backend API, mais dans un **route group dédié** avec un **préfixe URL visible** pour éviter les collisions avec le Tenant Admin (EPIC 12).

**Structure cible** :
```
app/
├── api/                        # Backend API (déjà existant)
│
├── (platform-admin)/           # ⬅️ Route group Super Admin (EPIC 11)
│   ├── layout.tsx              # Layout Super Admin (Sidebar Platform)
│   └── admin/                  # ⬅️ Préfixe URL visible /admin/
│       ├── page.tsx            # Dashboard → /admin
│       ├── dashboard/          # Dashboard → /admin/dashboard
│       ├── tenants/            # Gestion tenants → /admin/tenants
│       ├── users/              # Users plateforme → /admin/users
│       └── audit/              # Audit trail → /admin/audit
│
├── (tenant-admin)/             # Route group Tenant Admin (EPIC 12)
│   ├── layout.tsx              # Layout Tenant Admin (Sidebar Tenant)
│   └── portal/                 # Préfixe URL visible /portal/
│       └── ...                 # Voir EPIC 12
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

**URLs Super Admin (EPIC 11)** :
- `/login` → Page login partagée
- `/admin` ou `/admin/dashboard` → Dashboard Super Admin
- `/admin/tenants` → Gestion tenants
- `/admin/users` → Gestion users plateforme
- `/admin/audit` → Audit trail

**Avantages RGPD** :
- ✅ **Pas de CORS** (même origin, sécurité maximale)
- ✅ **Gateway LLM inaccessible** depuis le frontend
- ✅ **Middleware centralisé** (auth, tenant, audit)
- ✅ **Secrets centralisés** (un seul `.env`)
- ✅ **Séparation claire** Super Admin vs Tenant Admin (pas de collision URL)

**Référence** : Voir [TASKS.md section 2.2](../../TASKS.md#22-architecture-frontend)

---

## 1. Contexte et objectifs

### 1.1 Contexte métier

Le **Super Admin** est l'acteur technique de la plateforme qui gère l'ensemble des tenants (clients/entreprises). Il a besoin d'une interface web dédiée pour :
- Créer et gérer les tenants (clients)
- Créer les admins de chaque tenant
- Surveiller l'activité globale (audit, logs, stats)
- Gérer les incidents et la conformité RGPD

**Utilisateurs cibles** :
- Équipe technique plateforme (DevOps, SRE, Support)
- DPO plateforme (Data Protection Officer)

### 1.2 Objectifs techniques

Construire une interface web **Back Office** sécurisée permettant au Super Admin de :
1. **Gérer les tenants** : CRUD complet (Create, Read, Update, Delete/Suspend)
2. **Gérer les users plateforme** : Créer admins tenants, voir tous les users, suspendre comptes
3. **Surveiller l'activité** : Dashboard stats globales, audit trail complet, logs système
4. **Intervenir en cas d'incident** : Accès rapide aux données d'audit, export logs

**Contrainte RGPD critique** :
- Le Super Admin a accès à des données **cross-tenant** (multi-entreprises)
- **Minimisation stricte** : accès uniquement aux métadonnées (P1), jamais aux contenus utilisateurs (P2/P3)
- **Traçabilité obligatoire** : toutes les actions Super Admin sont auditées

### 1.3 Articulation avec autres EPICs

| EPIC | Relation | Détails |
|------|----------|---------|
| **EPIC 1** | ✅ Dépend | Utilise auth backend (RBAC/ABAC, scope PLATFORM) |
| **EPIC 4** | ✅ Dépend | Lit données tenants, users, ai_jobs (métadonnées) |
| **EPIC 5** | ✅ Dépend | Utilise API Routes (LOT 5.3) pour consommer backend |
| **EPIC 6** | ✅ Dépend | Accès aux logs/metrics (observabilité) |
| **EPIC 7** | ✅ Dépend | Accès aux artefacts d'audit (preuves RGPD) |
| **EPIC 12** | ➡️ Influence | Partage infrastructure Next.js (même app) |

---

## 1.4 Corrélation FRONT ↔ BACK : Matrice des Endpoints Requis

> **⚠️ CRITIQUE** : Chaque fonctionnalité FRONT Super Admin dépend d'endpoints BACK. Cette matrice garantit la cohérence.

### 1.4.1 Endpoints Backend Requis par User Story

| User Story | Fonctionnalité FRONT | Endpoint BACK | Méthode | EPIC Source | Status |
|------------|---------------------|---------------|---------|-------------|--------|
| **US 11.1** | Login Super Admin | `POST /api/auth/login` | POST | EPIC 1/LOT 1.2 | ✅ Implémenté |
| **US 11.1** | Session Check | `GET /api/auth/session` | GET | EPIC 1/LOT 1.2 | ✅ Implémenté |
| **US 11.2** | Create Tenant | `POST /api/tenants` | POST | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 11.3** | List Tenants | `GET /api/tenants` | GET | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 11.4** | Suspend Tenant | `POST /api/tenants/:tenantId/suspend` | POST | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 11.4** | Reactivate Tenant | `POST /api/tenants/:tenantId/reactivate` | POST | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 11.5** | Tenant Details | `GET /api/tenants/:tenantId` | GET | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 11.5** | Tenant Stats | `GET /api/tenants/:tenantId/stats` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 11.5** | Tenant Activity | `GET /api/tenants/:tenantId/activity` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 11.6** | Create Tenant Admin | `POST /api/tenants/:tenantId/users` | POST | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 11.7** | List All Users | `GET /api/users` | GET | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 11.7** | User Details | `GET /api/users/:userId` | GET | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 11.7** | Suspend User | `POST /api/users/:userId/suspend` | POST | EPIC 1/LOT 1.1 | ✅ Implémenté |
| **US 11.8** | Global Stats | `GET /api/stats/global` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 11.8** | Stats AI Jobs | `GET /api/stats/ai-jobs` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 11.8** | Stats RGPD | `GET /api/stats/rgpd` | GET | EPIC 5/LOT 5.3 | ✅ Implémenté |
| **US 11.9** | Audit Trail | `GET /api/audit` | GET | EPIC 1/LOT 1.3 | ✅ Implémenté |
| **US 11.9** | Export Audit CSV | `GET /api/audit/export` | GET | EPIC 1/LOT 1.3 | ✅ Implémenté |
| **US 11.10** | System Logs | `GET /api/logs` | GET | EPIC 6/LOT 6.1 | ✅ Implémenté |

### 1.4.2 Endpoints RGPD Cross-Tenant (Super Admin Only)

> Ces endpoints permettent au Super Admin de surveiller la conformité RGPD globale.

| Fonctionnalité | Endpoint BACK | Description | EPIC Source | Status |
|----------------|---------------|-------------|-------------|--------|
| RGPD Exports cross-tenant | `GET /api/rgpd/exports` | Tous les exports en cours | EPIC 5/LOT 5.1 | ✅ Implémenté |
| RGPD Deletions cross-tenant | `GET /api/rgpd/deletions` | Toutes les suppressions en cours | EPIC 5/LOT 5.2 | ✅ Implémenté |
| RGPD Violations Registry | `GET /api/rgpd/violations` | Registre incidents (Art. 33) | EPIC 9/LOT 9.0 | ❌ **À implémenter** |
| DPIA Document Access | `GET /api/docs/dpia` | Accès DPIA Gateway LLM | EPIC 10/LOT 10.5 | ❌ **À implémenter** |
| Registre Traitements | `GET /api/docs/registre` | Accès registre Art. 30 | EPIC 10/LOT 10.4 | ❌ **À implémenter** |

### 1.4.3 Corrélation avec EPIC 12 (Tenant Admin)

> Le Super Admin a une vue cross-tenant, le Tenant Admin une vue mono-tenant.

| Vue Super Admin (EPIC 11) | Vue Tenant Admin (EPIC 12) | Scope Différence |
|---------------------------|---------------------------|------------------|
| Tous tenants | Mon tenant uniquement | Cross-tenant vs Mono-tenant |
| Tous users (cross-tenant) | Users de mon tenant | WHERE tenant_id = $1 |
| Audit trail global | Audit trail tenant | WHERE tenant_id = $1 |
| Stats globales | Stats tenant | WHERE tenant_id = $1 |
| Violations registry | Non accessible | Super Admin only |
| DPIA/Registre | Non accessible | Super Admin only |

### 1.4.4 Prérequis BACK avant développement FRONT

| Prérequis | EPIC | Status | Bloquant FRONT |
|-----------|------|--------|----------------|
| Auth RBAC/ABAC scope PLATFORM | EPIC 1 | ✅ OK | US 11.1 |
| CRUD Tenants | EPIC 1 | ✅ OK | US 11.2-11.5 |
| CRUD Users cross-tenant | EPIC 1 | ✅ OK | US 11.6-11.7 |
| Stats globales | EPIC 4 | ✅ OK | US 11.8 |
| Audit trail cross-tenant | EPIC 1 | ✅ OK | US 11.9 |
| Logs système (Grafana) | EPIC 6 | ✅ OK | US 11.10 |
| **Violations Registry API** | EPIC 9/LOT 9.0 | ❌ TODO | Dashboard alertes |
| **DPIA/Registre Access API** | EPIC 10/LOT 10.4-10.5 | ❌ TODO | Documents conformité |

---

## 2. Exigences RGPD (bout en bout : USER → FRONT → BACK)

### 2.1 Côté Frontend (Interface)

#### ✅ Minimisation des données affichées
- **INTERDIT** : Afficher contenus prompts/outputs IA (P3)
- **INTERDIT** : Afficher emails complets en clair (utiliser `m***@example.com`)
- **AUTORISÉ** : Afficher IDs, usernames, tenant names, stats agrégées (P1)
- **AUTORISÉ** : Afficher métadonnées (dates, statuts, counts)

#### ✅ Pas de stockage local sensible
- **INTERDIT** : `localStorage` ou `sessionStorage` pour données P2/P3
- **AUTORISÉ** : `sessionStorage` pour JWT token (httpOnly cookie préféré)
- **AUTORISÉ** : `localStorage` pour préférences UI (theme, langue)

#### ✅ Messages d'erreur RGPD-safe
- **INTERDIT** : Exposer détails techniques sensibles (stack traces, SQL errors)
- **AUTORISÉ** : Messages génériques ("Une erreur est survenue", "Accès refusé")
- **Logging côté serveur** : Erreurs complètes loguées backend uniquement

#### ✅ Respect du principe "Need to know"
- Super Admin voit **tous les tenants** (nécessaire pour gestion plateforme)
- Mais ne voit **PAS** le contenu des documents/prompts (pas nécessaire)
- Accès audit trail complet (nécessaire pour traçabilité RGPD)

### 2.2 Côté Communication (USER → FRONT → BACK)

#### ✅ HTTPS obligatoire
- **TLS 1.3** minimum
- **HSTS** activé (HTTP Strict Transport Security)
- Certificat valide (Let's Encrypt ou CA interne)

#### ✅ Authentification robuste
- **JWT tokens** avec expiration courte (15 min)
- **Refresh tokens** rotation automatique
- **MFA recommandé** pour Super Admin (2FA)

#### ✅ CORS strict
- **Origins autorisées** : uniquement domaine Back Office officiel
- **Credentials** : `withCredentials: true` (cookies httpOnly)
- **Headers autorisés** : liste blanche explicite

#### ✅ Protection CSRF
- **Tokens CSRF** sur toutes requêtes POST/PUT/DELETE
- NextAuth.js ou équivalent gère nativement

#### ✅ Rate limiting côté serveur
- **API Gateway** applique rate limiting (déjà EPIC 5.3)
- Frontend : retry avec backoff exponentiel

### 2.3 Côté Backend (déjà couvert)

Références aux EPICs backend existants :
- ✅ **EPIC 1** : Auth RBAC/ABAC (scope PLATFORM validé)
- ✅ **EPIC 5** : API Routes HTTP (LOT 5.3)
- ✅ **EPIC 4** : Isolation tenant (WHERE tenant_id = $1)
- ✅ **EPIC 1** : Audit trail (toutes actions loguées)

---

## 3. Périmètre fonctionnel

### 3.1 User Stories

#### US 11.1 : Authentification Super Admin
**En tant que** Super Admin  
**Je veux** me connecter au Back Office de manière sécurisée  
**Afin de** gérer la plateforme

**Acceptance Criteria** :
- [ ] Page login avec email + password
- [ ] MFA optionnel (2FA via TOTP)
- [ ] Redirection automatique si déjà authentifié
- [ ] Logout fonctionnel (invalidation token)

---

#### US 11.2 : Créer un nouveau tenant (client)
**En tant que** Super Admin  
**Je veux** créer un nouveau tenant avec son admin  
**Afin de** onboarder un nouveau client

**Acceptance Criteria** :
- [ ] Formulaire : slug, name, sector, admin email
- [ ] Validation slug unique (alphanum + hyphens)
- [ ] Validation email valide
- [ ] Génération automatique invitation admin (email)
- [ ] Audit event créé (tenant.created)

---

#### US 11.3 : Voir la liste des tenants
**En tant que** Super Admin  
**Je veux** voir tous les tenants de la plateforme  
**Afin de** avoir une vue d'ensemble

**Acceptance Criteria** :
- [ ] Table avec colonnes : Slug, Name, Sector, Status, Created At, Users Count
- [ ] Filtres : status (active/suspended), sector, search name
- [ ] Pagination (50 par page)
- [ ] Tri par colonne (name, created_at)
- [ ] Action rapide : Voir détails, Suspendre, Éditer

---

#### US 11.4 : Suspendre un tenant
**En tant que** Super Admin  
**Je veux** suspendre un tenant (non conforme, impayé, etc.)  
**Afin de** bloquer l'accès à la plateforme

**Acceptance Criteria** :
- [ ] Bouton "Suspendre" avec confirmation (modal)
- [ ] Raison obligatoire (dropdown + texte libre)
- [ ] Suspension immédiate (tous users tenant bloqués)
- [ ] Email notification admin tenant
- [ ] Audit event créé (tenant.suspended)

---

#### US 11.5 : Voir les détails d'un tenant
**En tant que** Super Admin  
**Je veux** voir les détails d'un tenant  
**Afin de** comprendre son usage et troubleshooter

**Acceptance Criteria** :
- [ ] Stats tenant : Users count, AI jobs count, Storage usage
- [ ] Graphique activité (AI jobs par jour, dernières 30j)
- [ ] Liste admins tenant (noms, emails partiels)
- [ ] Historique audit events tenant (derniers 50)
- [ ] Bouton "Suspendre" ou "Réactiver"

---

#### US 11.6 : Créer un admin tenant
**En tant que** Super Admin  
**Je veux** créer un nouvel admin pour un tenant existant  
**Afin de** ajouter un gestionnaire

**Acceptance Criteria** :
- [ ] Formulaire : Tenant (dropdown), Email, Name, Role (admin)
- [ ] Validation email unique par tenant
- [ ] Génération invitation (email avec lien activation)
- [ ] User créé avec scope TENANT (pas PLATFORM)
- [ ] Audit event créé (user.created)

---

#### US 11.7 : Voir tous les users plateforme
**En tant que** Super Admin  
**Je veux** voir tous les users de tous les tenants  
**Afin de** gérer les comptes et troubleshooter

**Acceptance Criteria** :
- [ ] Table : Username, Email (partiel), Tenant, Role, Status, Created At
- [ ] Filtres : tenant, role (admin/member), status (active/suspended)
- [ ] Recherche par email partiel ou username
- [ ] Pagination (100 par page)
- [ ] Action : Voir détails, Suspendre compte

---

#### US 11.8 : Dashboard stats globales
**En tant que** Super Admin  
**Je veux** voir des stats globales de la plateforme  
**Afin de** monitorer la santé et l'usage

**Acceptance Criteria** :
- [ ] Widgets KPIs :
  - Total tenants (actifs vs suspendus)
  - Total users (actifs vs suspendus)
  - AI jobs ce mois (succès vs échecs)
  - Exports RGPD en cours
  - Effacements RGPD en cours
- [ ] Graphiques :
  - AI jobs par jour (30 derniers jours)
  - Nouveaux tenants par semaine (12 dernières semaines)
  - Erreurs critiques par jour (7 derniers jours)
- [ ] Alertes :
  - Tenants avec quota dépassé
  - Jobs IA échoués > 10% (24h)
  - Cross-tenant access tentatives (erreurs 403)

---

#### US 11.9 : Audit trail complet
**En tant que** Super Admin  
**Je veux** voir l'audit trail complet de la plateforme  
**Afin de** enquêter sur incidents ou prouver conformité RGPD

**Acceptance Criteria** :
- [ ] Table audit events :
  - Timestamp, Tenant, User, Action, Resource, Status
- [ ] Filtres :
  - Tenant (dropdown multi-select)
  - User (search)
  - Action (dropdown : llm.invoked, rgpd.export, user.created, etc.)
  - Date range (picker)
  - Status (success/failed)
- [ ] Export CSV (RGPD-safe : P1 uniquement, pas de payload)
- [ ] Pagination performante (1000+ events)
- [ ] Détails event (modal) : metadata JSON (P1 uniquement)

---

#### US 11.10 : Logs système
**En tant que** Super Admin  
**Je veux** accéder aux logs système (erreurs, warnings)  
**Afin de** debugger et résoudre incidents

**Acceptance Criteria** :
- [ ] Intégration Grafana ou équivalent (EPIC 6.1)
- [ ] Filtres : level (error, warn, info), service, date range
- [ ] Recherche full-text (avec prudence RGPD)
- [ ] Pas de logs contenant données P2/P3 (validation EPIC 1.3)

---

### 3.2 Hors périmètre (EPIC 11)

❌ **Pas dans cet EPIC** :
- Gestion users membres (non-admin) → EPIC 12 (Tenant Admin)
- Configuration consentements IA → EPIC 12 (Tenant Admin)
- Utilisation IA Tools → EPIC 13 (Front User)
- Billing/facturation → EPIC futur
- Support tickets → EPIC futur

---

## 4. Architecture technique

### 4.1 Stack technique recommandée

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Framework** | Next.js 16.1+ App Router | SSR, Server Components, React 19 + React Compiler |
| **Auth** | NextAuth.js v5 | Intégration native, session management |
| **UI Library** | shadcn/ui (Radix UI + Tailwind) | Composants accessibles, customisable, React 19 compatible |
| **Styling** | Tailwind CSS v4 | Cohérence design system, performances améliorées |
| **Forms** | React Hook Form + Zod | Validation typesafe, React 19 compatible |
| **State** | Zustand v5 | Léger, performant, React 19 natif |
| **Data fetching** | TanStack Query v5 | Cache, revalidation, optimistic UI, React 19 ready |
| **Charts** | Recharts v2 | API déclarative, React 19 natif (peer dep ^19.0.0) |
| **Tables** | TanStack Table v8 | Filtres, tri, pagination performante, React 19 ready |

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
├── api/                           # Backend API (Route Handlers) - EPIC 1-7
│   ├── auth/
│   ├── tenants/
│   ├── users/
│   ├── consents/
│   ├── ai/
│   ├── rgpd/
│   └── audit/
│
├── (platform-admin)/              # ⬅️ Route group Super Admin (EPIC 11)
│   ├── layout.tsx                 # Layout Super Admin (PlatformSidebar)
│   └── admin/                     # ⬅️ Préfixe URL visible /admin/
│       ├── page.tsx               # Dashboard → /admin
│       ├── dashboard/page.tsx     # Dashboard → /admin/dashboard
│       ├── tenants/               # Gestion Tenants (LOT 11.1)
│       │   ├── page.tsx           # Liste tenants → /admin/tenants
│       │   ├── new/page.tsx       # Créer tenant → /admin/tenants/new
│       │   └── [id]/page.tsx      # Détails tenant → /admin/tenants/:id
│       ├── users/                 # Gestion Users Plateforme (LOT 11.2)
│       │   ├── page.tsx           # Liste users → /admin/users
│       │   ├── new/page.tsx       # Créer user → /admin/users/new
│       │   └── [id]/page.tsx      # Détails user → /admin/users/:id
│       ├── audit/                 # Audit & Monitoring (LOT 11.3)
│       │   ├── page.tsx           # Audit events → /admin/audit
│       │   ├── violations/page.tsx # Registre violations → /admin/audit/violations
│       │   ├── registry/page.tsx  # Registre traitements → /admin/audit/registry
│       │   └── dpia/page.tsx      # DPIA Gateway LLM → /admin/audit/dpia
│       └── logs/page.tsx          # Logs système → /admin/logs
│
├── (tenant-admin)/                # Route group Tenant Admin (EPIC 12)
│   ├── layout.tsx                 # Layout Tenant Admin (TenantSidebar)
│   └── portal/                    # Préfixe URL visible /portal/
│       └── ...                    # Voir EPIC 12
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
│   ├── platform-admin/            # ⬅️ Components Super Admin (EPIC 11)
│   │   ├── PlatformSidebar.tsx
│   │   ├── forms/
│   │   ├── tables/
│   │   └── charts/
│   ├── tenant-admin/              # Components Tenant Admin (EPIC 12)
│   │   ├── TenantSidebar.tsx
│   │   └── ...
│   └── frontend/                  # Components End User (EPIC 13)
├── lib/
│   ├── api.ts                     # API client (fetch wrapper)
│   ├── auth.ts                    # NextAuth config
│   └── utils.ts
└── domain/                        # Types/logique métier partagés
```

**URLs Super Admin (EPIC 11)** :
| Page | URL |
|------|-----|
| Login (partagé) | `/login` |
| Dashboard | `/admin` ou `/admin/dashboard` |
| Liste tenants | `/admin/tenants` |
| Détail tenant | `/admin/tenants/:id` |
| Liste users | `/admin/users` |
| Audit trail | `/admin/audit` |
| Logs système | `/admin/logs` |

**Avantages RGPD de cette architecture** (cf. TASKS.md section 2.2) :
- ✅ **Pas de CORS** : Frontend et API sur même origin (sécurité maximale)
- ✅ **Gateway LLM inaccessible** : Imports côté serveur uniquement
- ✅ **Middleware centralisé** : Résolution tenant, auth, permissions, audit trail
- ✅ **Secrets centralisés** : Un seul `.env`, gestion simplifiée
- ✅ **Séparation claire** : Pas de collision URL entre Super Admin (`/admin/`) et Tenant Admin (`/portal/`)

### 4.3 Composants principaux

#### Layout PLATFORM (Super Admin)
```tsx
// app/(platform-admin)/layout.tsx
export default function PlatformAdminLayout({ children }) {
  return (
    <div className="flex h-screen">
      <PlatformSidebar />
      <main className="flex-1 overflow-y-auto">
        <TopBar />
        {children}
      </main>
    </div>
  );
}
```

#### Sidebar Navigation (Super Admin)
```tsx
// components/platform-admin/PlatformSidebar.tsx
const PLATFORM_ROUTES = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/tenants', label: 'Tenants', icon: Building },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/audit', label: 'Audit', icon: FileText },
  { href: '/admin/logs', label: 'Logs', icon: Terminal },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];
```

#### API Client (RGPD-safe)
```typescript
// src/lib/api.ts (API client partagé)
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    // RGPD-safe error handling (pas de détails sensibles exposés)
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}
```

### 4.4 Sécurité Frontend

#### CSP (Content Security Policy)
```typescript
// next.config.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader.replace(/\s{2,}/g, ' ').trim() },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
```

#### XSS Protection
- ✅ React escape automatique (JSX)
- ✅ Validation Zod côté client (sanitization)
- ✅ `dangerouslySetInnerHTML` INTERDIT (audit git hook)

#### CSRF Protection
- ✅ NextAuth.js gère nativement
- ✅ Tokens CSRF sur toutes mutations (POST/PUT/DELETE)

---

## 5. Contraintes RGPD (Frontend spécifique)

### 5.1 Pas de stockage local sensible

**Règle** : Aucune donnée P2/P3 dans `localStorage` ou `sessionStorage`

**Autorisé** :
```typescript
// ✅ OK : Préférences UI (P0)
localStorage.setItem('theme', 'dark');
localStorage.setItem('language', 'fr');
```

**Interdit** :
```typescript
// ❌ INTERDIT : Token JWT en localStorage (XSS risk)
localStorage.setItem('token', jwt); // Utiliser httpOnly cookie

// ❌ INTERDIT : Données utilisateur (P2)
localStorage.setItem('user', JSON.stringify({ email: 'user@example.com' }));
```

### 5.2 Pas de logs côté client

**Règle** : `console.log()` doit être supprimé en production

**Solution** :
```typescript
// lib/logger.ts
export const logger = {
  info: process.env.NODE_ENV === 'development' ? console.log : () => {},
  error: (msg: string, error?: Error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(msg, error);
    }
    // En prod : envoyer au backend (sans données sensibles)
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/log-error', {
        method: 'POST',
        body: JSON.stringify({ message: msg, stack: error?.stack }),
      });
    }
  },
};
```

### 5.3 Validation côté client (non bloquante sécurité)

**Règle** : Validation côté client = UX uniquement, PAS sécurité

**Implémentation** :
```typescript
// ✅ Validation Zod côté client (UX)
const tenantSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Alphanumeric + hyphens only'),
  name: z.string().min(2).max(100),
  adminEmail: z.string().email(),
});

// ⚠️ Backend DOIT RE-VALIDER (sécurité)
// app/api/tenants/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const validated = tenantSchema.parse(body); // Re-validation backend
  // ...
}
```

### 5.4 Messages d'erreur RGPD-safe

**Règle** : Pas d'exposition détails techniques en production

**Implémentation** :
```typescript
// ❌ INTERDIT en production
toast.error(`SQL Error: Duplicate key 'users_email_key'`);

// ✅ OK : Message générique
toast.error('This email is already registered');

// ✅ Backend log complet (audit trail)
// app/api/users/route.ts
try {
  await db.users.create(data);
} catch (error) {
  logger.error('User creation failed', { tenantId, email, error }); // Backend log
  return errorResponse('Email already exists', 409); // Frontend message
}
```

---

## 6. Acceptance Criteria (Epic-level)

### 6.1 Fonctionnel

- [ ] Super Admin peut se connecter avec email + password (+ 2FA optionnel)
- [ ] Super Admin peut créer un nouveau tenant avec admin associé
- [ ] Super Admin peut voir la liste de tous les tenants (filtres, pagination)
- [ ] Super Admin peut suspendre/réactiver un tenant
- [ ] Super Admin peut voir les détails d'un tenant (stats, users, historique)
- [ ] Super Admin peut créer des admins tenant
- [ ] Super Admin peut voir tous les users plateforme (cross-tenant)
- [ ] Super Admin peut suspendre un user
- [ ] Dashboard stats globales fonctionnel (KPIs, graphiques)
- [ ] Audit trail complet accessible (filtres, export CSV)
- [ ] Accès aux logs système (via Grafana ou équivalent)

### 6.2 RGPD

- [ ] Aucune donnée P2/P3 stockée côté client (localStorage/sessionStorage)
- [ ] Emails affichés partiellement (`m***@example.com`)
- [ ] Messages d'erreur RGPD-safe (pas de stack traces exposées)
- [ ] Audit trail export CSV contient uniquement P1 (métadonnées)
- [ ] Super Admin actions sont auditées (backend)

### 6.3 Sécurité

- [ ] HTTPS obligatoire (HSTS activé)
- [ ] JWT tokens httpOnly (pas localStorage)
- [ ] CSRF protection activée (NextAuth.js)
- [ ] CSP headers configurés (X-Frame-Options, X-Content-Type-Options)
- [ ] XSS protection (pas de dangerouslySetInnerHTML)
- [ ] Rate limiting backend actif (EPIC 5.3)

### 6.4 Performance

- [ ] Time to Interactive < 2s (dashboard)
- [ ] Pagination performante (tables 100+ items)
- [ ] SWR cache actif (pas de refetch inutile)
- [ ] Lazy loading composants lourds (charts, tables)

### 6.5 UX

- [ ] Design cohérent (design system shadcn/ui)
- [ ] Responsive (desktop uniquement pour Back Office, mais dégradé gracieux mobile)
- [ ] Feedback utilisateur (toasts, loading states, confirmations)
- [ ] Accessibility (WCAG 2.1 AA minimum)

---

## 7. Découpage en LOTs

Référence **TASKS.md** :

| LOT | Description | Durée estimée | Dépendances |
|-----|-------------|---------------|-------------|
| **LOT 11.0** | Infra Back Office + Auth | 5 jours | LOT 5.3 (API Routes) |
| **LOT 11.1** | Gestion Tenants (CRUD) | 5 jours | LOT 11.0 |
| **LOT 11.2** | Gestion Users Plateforme | 4 jours | LOT 11.0 |
| **LOT 11.3** | Audit & Monitoring Dashboard | 4 jours | LOT 6.1 (Observabilité) |

**Total EPIC 11** : ~18 jours (3,6 semaines)

---

## 8. Risques et mitigations

### 8.1 Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Fuite cross-tenant** | Moyenne | 🔴 CRITIQUE | Tests E2E isolation tenant, middleware strict |
| **XSS via injection** | Faible | 🟠 ÉLEVÉ | CSP strict, React escape automatique, audit code |
| **Exposition données P2/P3** | Moyenne | 🔴 CRITIQUE | Validation affichage, tests RGPD, code review |
| **Performance dashboard lente** | Moyenne | 🟡 MOYEN | Pagination, lazy loading, cache SWR |
| **Logs sensibles côté client** | Faible | 🟠 ÉLEVÉ | Logger custom, suppression console.log prod |

### 8.2 Tests obligatoires

- [ ] **Tests E2E** (Playwright) :
  - Auth flow (login → dashboard → logout)
  - Créer tenant E2E
  - Isolation tenant (pas de cross-tenant leak)
- [ ] **Tests RGPD** :
  - Pas de données P2/P3 dans localStorage
  - Messages erreur RGPD-safe
  - Emails partiels affichés
- [ ] **Tests Sécurité** :
  - CSP headers validés (csp-validator)
  - CSRF tokens présents (toutes mutations)
  - Rate limiting actif (backend)

---

## 9. Checklist de livraison (DoD EPIC 11)

### Code
- [ ] Tous les LOTs 11.0-11.3 implémentés
- [ ] Tests E2E passants (100%)
- [ ] Tests RGPD passants (100%)
- [ ] TypeScript strict (0 erreurs)
- [ ] Lint passant (0 warnings)

### Documentation
- [ ] README Back Office (setup, run, deploy)
- [ ] Guide contribution (conventions, structure)
- [ ] API documentation (endpoints utilisés)

### Sécurité
- [ ] Scan sécurité frontend (npm audit)
- [ ] CSP validé (csp-validator)
- [ ] OWASP Top 10 validé (checklist)

### Performance
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices)
- [ ] Bundle size < 500KB (gzip)

### RGPD
- [ ] Pas de données P2/P3 côté client (audit)
- [ ] Audit trail Super Admin actions (backend)
- [ ] Messages erreur RGPD-safe (validation)

---

## 10. Prochaines étapes

Après complétion EPIC 11 :
1. **EPIC 12** : Back Office Tenant Admin (interface tenant-scoped)
2. **EPIC 13** : Front User (interface utilisateur final)

---

**Document créé le 25 décembre 2025**  
**Version 1.0**  
**Auteur** : Équipe Plateforme RGPD-IA
