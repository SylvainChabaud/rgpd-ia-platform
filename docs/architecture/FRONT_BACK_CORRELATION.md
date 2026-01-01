# Matrice de Corrélation FRONT ↔ BACK

**Date** : 2026-01-01  
**Version** : 2.0  
**Objectif** : Garantir la cohérence entre les fonctionnalités FRONT et les endpoints BACK pour les EPICs 10-13.

---

## 1. Vue d'ensemble

Cette matrice centralise toutes les dépendances entre les interfaces FRONT (EPIC 11-13) et les endpoints BACK (EPIC 1-10). Elle garantit qu'aucune fonctionnalité n'est oubliée et que le développement FRONT/BACK est synchronisé.

### 1.1 Endpoints BACK Implémentés (26 routes)

| Route | Méthodes | EPIC | Description |
|-------|----------|------|-------------|
| `/api/auth/login` | POST | EPIC 1 | Connexion utilisateur |
| `/api/auth/logout` | POST | EPIC 1 | Déconnexion |
| `/api/auth/me` | GET | EPIC 1 | Session utilisateur courante |
| `/api/users` | GET, POST | EPIC 1 | Liste/création users (tenant-scoped) |
| `/api/users/[id]` | GET, PUT, DELETE | EPIC 1 | Détails/modification/suppression user |
| `/api/tenants` | GET, POST | EPIC 1 | Liste/création tenants (platform admin) |
| `/api/tenants/[id]` | GET, PUT, DELETE | EPIC 1 | Détails/modification/suppression tenant |
| `/api/consents` | POST | EPIC 5 | Accorder consentement (opt-in) |
| `/api/consents/revoke` | POST | EPIC 5 | Révoquer consentement |
| `/api/consents/[id]` | DELETE | EPIC 5 | Supprimer consentement |
| `/api/ai/invoke` | POST | EPIC 3 | Appeler Gateway LLM |
| `/api/ai/jobs` | GET | EPIC 4 | Liste des jobs IA |
| `/api/ai/jobs/[id]` | GET | EPIC 4 | Détails d'un job IA |
| `/api/rgpd/export` | POST | EPIC 5 | Demande export données (Art. 15/20) |
| `/api/rgpd/export/download` | POST | EPIC 5 | Télécharger export |
| `/api/rgpd/delete` | POST | EPIC 5 | Demande suppression (Art. 17) |
| `/api/rgpd/user` | DELETE | EPIC 5 | Suppression utilisateur RGPD |
| `/api/audit/events` | GET | EPIC 1 | Liste événements audit |
| `/api/metrics` | GET | EPIC 6 | Métriques application |
| `/api/metrics/prometheus` | GET | EPIC 6 | Métriques format Prometheus |
| `/api/health` | GET | EPIC 6 | Health check |
| `/api/_private/ping` | GET | Infra | Ping interne (tenant guard) |

### 1.2 EPICs FRONT concernées

| EPIC | Nom | Scope | Description |
|------|-----|-------|-------------|
| **EPIC 11** | Back Office Super Admin | PLATFORM | Gestion cross-tenant, audit global |
| **EPIC 12** | Back Office Tenant Admin | TENANT | Gestion mono-tenant, users, consents |
| **EPIC 13** | Front User | MEMBER | Interface utilisateur final, AI Tools |

### 1.3 EPICs BACK concernées

| EPIC | Nom | Endpoints principaux | Status |
|------|-----|---------------------|--------|
| **EPIC 1** | Auth & RBAC | `/api/auth/*`, `/api/users/*`, `/api/tenants/*` | ✅ Implémenté |
| **EPIC 3** | Gateway LLM | `/api/ai/invoke` | ✅ Implémenté |
| **EPIC 4** | Storage RGPD | `/api/ai/jobs/*` | ✅ Implémenté |
| **EPIC 5** | Pipeline RGPD | `/api/consents/*`, `/api/rgpd/*` | ✅ Implémenté |
| **EPIC 6** | Docker & Monitoring | `/api/health`, `/api/metrics/*` | ✅ Implémenté |
| **EPIC 9** | Incident Response | `/api/rgpd/violations` | ❌ TODO |
| **EPIC 10** | Legal Compliance | `/api/consents/cookies`, `/api/rgpd/suspend|oppose|contest` | ❌ TODO |

---

## 2. Matrice Complète par EPIC FRONT

### 2.1 EPIC 13 — Front User (MEMBER)

| User Story | Fonctionnalité | Endpoint BACK | Méthode | Status | Notes |
|------------|----------------|---------------|---------|--------|-------|
| US 13.1 | Login | `POST /api/auth/login` | POST | ✅ | EPIC 1 |
| US 13.1 | Logout | `POST /api/auth/logout` | POST | ✅ | EPIC 1 |
| US 13.1 | Session | `GET /api/auth/me` | GET | ✅ | EPIC 1 |
| US 13.2 | Stats Dashboard | `GET /api/ai/jobs` | GET | ✅ | EPIC 4 (liste jobs) |
| US 13.3 | Invoke LLM | `POST /api/ai/invoke` | POST | ✅ | EPIC 3 |
| US 13.4 | Grant Consent | `POST /api/consents` | POST | ✅ | EPIC 5 |
| US 13.6 | List Jobs | `GET /api/ai/jobs` | GET | ✅ | EPIC 4 |
| US 13.6 | Job Details | `GET /api/ai/jobs/:jobId` | GET | ✅ | EPIC 4 |
| US 13.7 | Revoke Consent | `POST /api/consents/revoke` | POST | ✅ | EPIC 5 |
| US 13.9 | Get Profile | `GET /api/users/:userId` | GET | ✅ | EPIC 1 |
| US 13.9 | Update Profile | `PUT /api/users/:userId` | PUT | ✅ | EPIC 1 (PUT pas PATCH) |
| US 13.10 | Request Export | `POST /api/rgpd/export` | POST | ✅ | EPIC 5 |
| US 13.10 | Download Export | `POST /api/rgpd/export/download` | POST | ✅ | EPIC 5 |
| US 13.11 | Request Deletion | `POST /api/rgpd/delete` | POST | ✅ | EPIC 5 |
| Layout | Cookie Banner Save | `POST /api/consents/cookies` | POST | ❌ TODO | EPIC 10 |
| Layout | Cookie Banner Get | `GET /api/consents/cookies` | GET | ❌ TODO | EPIC 10 |
| My Data | Suspend Data (Art.18) | `POST /api/rgpd/suspend` | POST | ❌ TODO | EPIC 10 |
| My Data | Unsuspend Data (Art.18) | `POST /api/rgpd/unsuspend` | POST | ❌ TODO | EPIC 10 |
| My Data | Oppose (Art.21) | `POST /api/rgpd/oppose` | POST | ❌ TODO | EPIC 10 |
| My Data | List Oppositions | `GET /api/rgpd/oppositions` | GET | ❌ TODO | EPIC 10 |
| AI Result | Contest AI (Art.22) | `POST /api/rgpd/contest` | POST | ❌ TODO | EPIC 10 |
| My Data | List Contests | `GET /api/rgpd/contests` | GET | ❌ TODO | EPIC 10 |

**Total** : 22 fonctionnalités (14 ✅ implémentés, 8 ❌ à implémenter)

---

### 2.2 EPIC 12 — Back Office Tenant Admin (TENANT)

| User Story | Fonctionnalité | Endpoint BACK | Méthode | Status | Notes |
|------------|----------------|---------------|---------|--------|-------|
| US 12.1 | Login | `POST /api/auth/login` | POST | ✅ | EPIC 1 |
| US 12.1 | Session | `GET /api/auth/me` | GET | ✅ | EPIC 1 |
| US 12.3 | List Users | `GET /api/users` | GET | ✅ | EPIC 1 (tenant-scoped) |
| US 12.4 | Create User | `POST /api/users` | POST | ✅ | EPIC 1 |
| US 12.5 | User Details | `GET /api/users/:userId` | GET | ✅ | EPIC 1 |
| US 12.5 | User Jobs | `GET /api/ai/jobs` | GET | ✅ | EPIC 4 (filtrable par user) |
| US 12.5 | User Audit | `GET /api/audit/events` | GET | ✅ | EPIC 1 |
| US 12.6 | Update User | `PUT /api/users/:userId` | PUT | ✅ | EPIC 1 |
| US 12.7 | Delete User | `DELETE /api/users/:userId` | DELETE | ✅ | EPIC 1 |
| US 12.8 | Grant Consent | `POST /api/consents` | POST | ✅ | EPIC 5 |
| US 12.10 | Revoke Consent | `POST /api/consents/revoke` | POST | ✅ | EPIC 5 |
| US 12.11 | List Exports | `POST /api/rgpd/export` | POST | ✅ | EPIC 5 |
| US 12.12 | List Deletions | `POST /api/rgpd/delete` | POST | ✅ | EPIC 5 |
| RGPD | List Suspensions | `GET /api/rgpd/suspensions` | GET | ❌ TODO | EPIC 10 |
| RGPD | List Oppositions | `GET /api/rgpd/oppositions` | GET | ❌ TODO | EPIC 10 |
| RGPD | List Contests | `GET /api/rgpd/contests` | GET | ❌ TODO | EPIC 10 |
| RGPD | Resolve Contest | `PATCH /api/rgpd/contests/:contestId` | PATCH | ❌ TODO | EPIC 10 |

**Total** : 17 fonctionnalités (13 ✅ implémentés, 4 ❌ à implémenter)

---

### 2.3 EPIC 11 — Back Office Super Admin (PLATFORM)

| User Story | Fonctionnalité | Endpoint BACK | Méthode | Status | Notes |
|------------|----------------|---------------|---------|--------|-------|
| US 11.1 | Login | `POST /api/auth/login` | POST | ✅ | EPIC 1 |
| US 11.1 | Session | `GET /api/auth/me` | GET | ✅ | EPIC 1 |
| US 11.2 | Create Tenant | `POST /api/tenants` | POST | ✅ | EPIC 1 |
| US 11.3 | List Tenants | `GET /api/tenants` | GET | ✅ | EPIC 1 |
| US 11.4 | Update Tenant | `PUT /api/tenants/:tenantId` | PUT | ✅ | EPIC 1 |
| US 11.4 | Delete Tenant | `DELETE /api/tenants/:tenantId` | DELETE | ✅ | EPIC 1 |
| US 11.5 | Tenant Details | `GET /api/tenants/:tenantId` | GET | ✅ | EPIC 1 |
| US 11.6 | Create Admin | `POST /api/users` | POST | ✅ | EPIC 1 |
| US 11.7 | List All Users | `GET /api/users` | GET | ✅ | EPIC 1 |
| US 11.7 | User Details | `GET /api/users/:userId` | GET | ✅ | EPIC 1 |
| US 11.7 | Update User | `PUT /api/users/:userId` | PUT | ✅ | EPIC 1 |
| US 11.7 | Delete User | `DELETE /api/users/:userId` | DELETE | ✅ | EPIC 1 |
| US 11.9 | Audit Trail | `GET /api/audit/events` | GET | ✅ | EPIC 1 |
| US 11.10 | Metrics | `GET /api/metrics` | GET | ✅ | EPIC 6 |
| US 11.10 | Prometheus | `GET /api/metrics/prometheus` | GET | ✅ | EPIC 6 |
| US 11.10 | Health Check | `GET /api/health` | GET | ✅ | EPIC 6 |
| Dashboard | Violations Registry | `GET /api/rgpd/violations` | GET | ❌ TODO | EPIC 9 |
| Dashboard | Create Violation | `POST /api/rgpd/violations` | POST | ❌ TODO | EPIC 9 |

**Total** : 18 fonctionnalités (16 ✅ implémentés, 2 ❌ à implémenter)

---

## 3. Endpoints par Article RGPD

### 3.1 Droits Utilisateurs (Art. 12-22)

| Article | Droit | Endpoint FRONT | Endpoint BACK | Status |
|---------|-------|----------------|---------------|--------|
| Art. 15 | Accès | Export RGPD (EPIC 13) | `POST /api/rgpd/export` | ✅ |
| Art. 16 | Rectification | Edit Profile (EPIC 13) | `PATCH /api/users/:userId` | ✅ |
| Art. 17 | Effacement | Delete Account (EPIC 13) | `POST /api/rgpd/delete` | ✅ |
| Art. 18 | Limitation | Suspend Data (EPIC 13) | `POST /api/rgpd/suspend` | ❌ TODO |
| Art. 20 | Portabilité | Export RGPD (EPIC 13) | `GET /api/rgpd/exports/:id/download` | ✅ |
| Art. 21 | Opposition | Oppose Form (EPIC 13) | `POST /api/rgpd/oppose` | ❌ TODO |
| Art. 22 | Révision humaine | Contest AI (EPIC 13) | `POST /api/rgpd/contest` | ❌ TODO |

### 3.2 Consentement (Art. 6-7)

| Fonctionnalité | EPIC FRONT | Endpoint BACK | Status |
|----------------|------------|---------------|--------|
| Grant consent | EPIC 13 US 13.4 | `POST /api/consents` | ✅ |
| Revoke consent | EPIC 13 US 13.7 | `POST /api/consents/revoke` | ✅ |
| Check consent | EPIC 13 US 13.4 | `GET /api/consents/:userId/:purposeId` | ✅ |
| List consents | EPIC 13 US 13.7 | `GET /api/consents?userId=` | ✅ |
| Consent history | EPIC 13 US 13.8 | `GET /api/consents/:userId/history` | ✅ |
| Cookie consent | EPIC 10/13 Layout | `POST /api/consents/cookies` | ❌ TODO |

### 3.3 Notification Incidents (Art. 33-34)

| Fonctionnalité | EPIC FRONT | Endpoint BACK | Status |
|----------------|------------|---------------|--------|
| List violations | EPIC 11 Dashboard | `GET /api/rgpd/violations` | ❌ TODO |
| Create violation | EPIC 11 Dashboard | `POST /api/rgpd/violations` | ❌ TODO |
| Notify CNIL | EPIC 9 (Backend) | - | ❌ TODO |

---

## 4. Gaps Identifiés & Actions

### 4.1 Endpoints Manquants (14 total)

| Endpoint | Article RGPD | EPIC Source | Priorité | Effort |
|----------|--------------|-------------|----------|--------|
| `POST /api/consents/cookies` | ePrivacy | EPIC 10 | 🔴 Haute | 1 jour |
| `GET /api/consents/cookies` | ePrivacy | EPIC 10 | 🔴 Haute | 0.5 jour |
| `POST /api/rgpd/suspend` | Art. 18 | EPIC 10 | 🟡 Moyenne | 1 jour |
| `POST /api/rgpd/unsuspend` | Art. 18 | EPIC 10 | 🟡 Moyenne | 0.5 jour |
| `POST /api/rgpd/oppose` | Art. 21 | EPIC 10 | 🟡 Moyenne | 1 jour |
| `GET /api/rgpd/oppositions` | Art. 21 | EPIC 10 | 🟡 Moyenne | 0.5 jour |
| `POST /api/rgpd/contest` | Art. 22 | EPIC 10 | 🟡 Moyenne | 1 jour |
| `GET /api/rgpd/contests` | Art. 22 | EPIC 10 | 🟡 Moyenne | 0.5 jour |
| `PATCH /api/rgpd/contests/:id` | Art. 22 | EPIC 10 | 🟡 Moyenne | 0.5 jour |
| `GET /api/rgpd/suspensions` | Art. 18 | EPIC 10 | 🟢 Basse | 0.5 jour |
| `GET /api/rgpd/violations` | Art. 33 | EPIC 9 | 🔴 Haute | 1 jour |
| `POST /api/rgpd/violations` | Art. 33 | EPIC 9 | 🔴 Haute | 1 jour |

**Effort total estimé** : ~9 jours développement

### 4.2 Ordre d'Implémentation Recommandé

```
Phase 1 : Cookies + Violations (Bloquants FRONT) - 4 jours
├── POST/GET /api/consents/cookies (EPIC 10/LOT 10.3)
└── GET/POST /api/rgpd/violations (EPIC 9/LOT 9.0)

Phase 2 : Droits Art. 18/21/22 - 5 jours
├── POST /api/rgpd/suspend + unsuspend (EPIC 10/LOT 10.6)
├── POST /api/rgpd/oppose + GET oppositions (EPIC 10/LOT 10.6)
└── POST /api/rgpd/contest + GET/PATCH contests (EPIC 10/LOT 10.6)

Phase 3 : Endpoints Tenant Admin - 1.5 jours
└── GET /api/tenants/:id/rgpd/{suspensions,oppositions,contests}
```

---

## 5. Checklist Validation Cohérence

### 5.1 Avant Développement EPIC 13 (Front User)

- [x] Auth login/logout/session endpoints OK
- [x] Gateway LLM invoke endpoint OK
- [x] Consents CRUD endpoints OK
- [x] Export/Delete RGPD endpoints OK
- [ ] **Cookie consent endpoints** → EPIC 10/LOT 10.3
- [ ] **Art. 18/21/22 endpoints** → EPIC 10/LOT 10.6

### 5.2 Avant Développement EPIC 12 (Tenant Admin)

- [x] Tenant users CRUD endpoints OK
- [x] Consents matrix endpoint OK
- [x] RGPD exports/deletions list endpoints OK
- [ ] **RGPD suspensions/oppositions/contests list** → EPIC 10/LOT 10.6
- [ ] **Contest resolution endpoint** → EPIC 10/LOT 10.6

### 5.3 Avant Développement EPIC 11 (Super Admin)

- [x] Tenants CRUD endpoints OK
- [x] Users cross-tenant endpoints OK
- [x] Audit trail endpoint OK
- [x] Stats global endpoints OK
- [ ] **Violations registry endpoints** → EPIC 9/LOT 9.0
- [ ] **DPIA/Registre access endpoints** → EPIC 10/LOT 10.4-10.5

---

## 6. Conclusion

### 6.1 État Actuel

| EPIC | Fonctionnalités Requises | Implémentées | À Faire | Couverture |
|------|--------------------------|--------------|---------|------------|
| EPIC 11 (Super Admin) | 18 | 16 | 2 | **89%** |
| EPIC 12 (Tenant Admin) | 17 | 13 | 4 | **76%** |
| EPIC 13 (User Front) | 22 | 14 | 8 | **64%** |
| **Total** | **57** | **43** | **14** | **75%** |

### 6.2 Endpoints BACK Réellement Implémentés

**26 routes actives dans `app/api/`** couvrant:
- ✅ Auth (login/logout/me)
- ✅ Users CRUD (GET/POST/PUT/DELETE)
- ✅ Tenants CRUD (GET/POST/PUT/DELETE)
- ✅ Consents (grant/revoke/delete)
- ✅ AI Gateway (invoke/jobs)
- ✅ RGPD Core (export/delete)
- ✅ Audit Events
- ✅ Metrics & Health

### 6.3 Actions Prioritaires

1. **EPIC 10/LOT 10.3** : Implémenter Cookie consent API (bloquant Layout FRONT)
2. **EPIC 9/LOT 9.0** : Implémenter Violations registry API (bloquant Dashboard Super Admin)
3. **EPIC 10/LOT 10.6** : Implémenter Art. 18/21/22 APIs (bloquant My Data FRONT)

### 6.4 Score RGPD après Implémentation

| Catégorie | Avant | Après Implémentation |
|-----------|-------|----------------------|
| Core RGPD (Art. 5-7) | 95% | 100% |
| Droits (Art. 12-22) | 75% | 100% |
| Incidents (Art. 33-34) | 0% | 100% |
| ePrivacy (Cookies) | 0% | 100% |
| **Global** | **~75%** | **100%** |

---

**Document mis à jour le 2026-01-01**  
**Version 2.0**  
**Auteur** : Équipe Plateforme RGPD-IA
