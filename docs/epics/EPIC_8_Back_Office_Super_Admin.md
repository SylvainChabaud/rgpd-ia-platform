# EPIC 8 — Back Office Super Admin (Interface PLATFORM)

**Date** : 25 décembre 2025  
**Statut** : ❌ TODO  
**Périmètre** : Frontend (Interface Web)  
**Scope** : PLATFORM (Super Admin uniquement)  
**RGPD Coverage** : Art. 5 (Minimisation), Art. 25 (Privacy by Design), Art. 32 (Sécurité)

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
| **EPIC 9** | ➡️ Influence | Partage infrastructure Next.js (monorepo) |

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

#### US 8.1 : Authentification Super Admin
**En tant que** Super Admin  
**Je veux** me connecter au Back Office de manière sécurisée  
**Afin de** gérer la plateforme

**Acceptance Criteria** :
- [ ] Page login avec email + password
- [ ] MFA optionnel (2FA via TOTP)
- [ ] Redirection automatique si déjà authentifié
- [ ] Logout fonctionnel (invalidation token)

---

#### US 8.2 : Créer un nouveau tenant (client)
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

#### US 8.3 : Voir la liste des tenants
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

#### US 8.4 : Suspendre un tenant
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

#### US 8.5 : Voir les détails d'un tenant
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

#### US 8.6 : Créer un admin tenant
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

#### US 8.7 : Voir tous les users plateforme
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

#### US 8.8 : Dashboard stats globales
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

#### US 8.9 : Audit trail complet
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

#### US 8.10 : Logs système
**En tant que** Super Admin  
**Je veux** accéder aux logs système (erreurs, warnings)  
**Afin de** debugger et résoudre incidents

**Acceptance Criteria** :
- [ ] Intégration Grafana ou équivalent (EPIC 6.1)
- [ ] Filtres : level (error, warn, info), service, date range
- [ ] Recherche full-text (avec prudence RGPD)
- [ ] Pas de logs contenant données P2/P3 (validation EPIC 1.3)

---

### 3.2 Hors périmètre (EPIC 8)

❌ **Pas dans cet EPIC** :
- Gestion users membres (non-admin) → EPIC 9 (Tenant Admin)
- Configuration consentements IA → EPIC 9 (Tenant Admin)
- Utilisation IA Tools → EPIC 10 (Front User)
- Billing/facturation → EPIC futur
- Support tickets → EPIC futur

---

## 4. Architecture technique

### 4.1 Stack technique recommandée

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Framework** | Next.js 14+ App Router | SSR, Server Components, cohérence backend |
| **Auth** | NextAuth.js v5 | Intégration native, session management |
| **UI Library** | shadcn/ui (Radix UI + Tailwind) | Composants accessibles, customisable |
| **Styling** | Tailwind CSS | Cohérence design system |
| **Forms** | React Hook Form + Zod | Validation typesafe |
| **State** | Zustand ou Context API | Léger, suffisant pour admin |
| **Data fetching** | SWR ou TanStack Query | Cache, revalidation, optimistic UI |
| **Charts** | Recharts ou Chart.js | Graphiques stats |
| **Tables** | TanStack Table | Filtres, tri, pagination performante |

### 4.2 Structure du projet (Monorepo)

```
rgpd-ia-platform/
├─ backend/                    # Backend Next.js (API)
├─ backoffice/                 # EPIC 8 + EPIC 9 (même app)
│  ├─ app/
│  │  ├─ (auth)/
│  │  │  ├─ login/page.tsx
│  │  │  └─ layout.tsx         # Layout public
│  │  ├─ (platform)/           # Routes Super Admin (scope PLATFORM)
│  │  │  ├─ dashboard/page.tsx
│  │  │  ├─ tenants/
│  │  │  │  ├─ page.tsx        # Liste tenants
│  │  │  │  ├─ new/page.tsx    # Créer tenant
│  │  │  │  └─ [id]/page.tsx   # Détails tenant
│  │  │  ├─ users/
│  │  │  │  ├─ page.tsx        # Liste users
│  │  │  │  └─ [id]/page.tsx
│  │  │  ├─ audit/page.tsx
│  │  │  ├─ logs/page.tsx
│  │  │  └─ layout.tsx         # Layout PLATFORM (navbar, sidebar)
│  │  └─ (tenant)/             # Routes Tenant Admin (EPIC 9)
│  ├─ components/
│  │  ├─ ui/                   # shadcn components
│  │  ├─ forms/                # Form components
│  │  ├─ tables/               # Table components
│  │  └─ charts/               # Chart components
│  ├─ lib/
│  │  ├─ api.ts                # API client (fetch wrapper)
│  │  ├─ auth.ts               # NextAuth config
│  │  └─ utils.ts
│  ├─ middleware.ts            # Auth + scope validation
│  └─ package.json
├─ frontend/                   # EPIC 10 (Front User)
└─ shared/                     # Types partagés
   └─ types/
      ├─ tenant.ts
      ├─ user.ts
      └─ api.ts
```

### 4.3 Composants principaux

#### Layout PLATFORM (Super Admin)
```tsx
// app/(platform)/layout.tsx
export default function PlatformLayout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar role="PLATFORM" />
      <main className="flex-1 overflow-y-auto">
        <TopBar />
        {children}
      </main>
    </div>
  );
}
```

#### Sidebar Navigation
```tsx
// components/Sidebar.tsx
const PLATFORM_ROUTES = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tenants', label: 'Tenants', icon: Building },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/audit', label: 'Audit', icon: FileText },
  { href: '/logs', label: 'Logs', icon: Terminal },
  { href: '/settings', label: 'Settings', icon: Settings },
];
```

#### API Client (RGPD-safe)
```typescript
// lib/api.ts
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
| **LOT 8.0** | Infra Back Office + Auth | 5 jours | LOT 5.3 (API Routes) |
| **LOT 8.1** | Gestion Tenants (CRUD) | 5 jours | LOT 8.0 |
| **LOT 8.2** | Gestion Users Plateforme | 4 jours | LOT 8.0 |
| **LOT 8.3** | Audit & Monitoring Dashboard | 4 jours | LOT 6.1 (Observabilité) |

**Total EPIC 8** : ~18 jours (3,6 semaines)

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

## 9. Checklist de livraison (DoD EPIC 8)

### Code
- [ ] Tous les LOTs 8.0-8.3 implémentés
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

Après complétion EPIC 8 :
1. **EPIC 9** : Back Office Tenant Admin (interface tenant-scoped)
2. **EPIC 10** : Front User (interface utilisateur final)

---

**Document créé le 25 décembre 2025**  
**Version 1.0**  
**Auteur** : Équipe Plateforme RGPD-IA
