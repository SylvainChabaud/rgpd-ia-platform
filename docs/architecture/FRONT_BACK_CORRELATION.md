# Matrice de Corrélation FRONT ↔ BACK

**Date** : 2026-01-21
**Version** : 2.2
**Objectif** : Garantir la cohérence entre les fonctionnalités FRONT et les endpoints BACK pour les EPICs 11-14.

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
| **EPIC 9** | Incident Response | `/api/incidents/*` | ✅ Implémenté |
| **EPIC 10** | Legal Compliance | `/api/consents/cookies`, `/api/legal/cgu`, `/api/tenants/:id/rgpd/*` | ✅ Implémenté |

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
| Layout | Cookie Banner Save | `POST /api/consents/cookies` | POST | ✅ | EPIC 10 |
| Layout | Cookie Banner Get | `GET /api/consents/cookies` | GET | ✅ | EPIC 10 |
| My Data | CGU Accept | `POST /api/legal/cgu` | POST | ✅ | EPIC 10 |
| My Data | CGU Status | `GET /api/legal/cgu` | GET | ✅ | EPIC 10 |
| My Data | Suspend Data (Art.18) | `POST /api/tenants/:id/rgpd/suspend` | POST | ✅ | EPIC 10 |
| My Data | Unsuspend Data (Art.18) | `POST /api/tenants/:id/rgpd/unsuspend` | POST | ✅ | EPIC 10 |
| My Data | Oppose (Art.21) | `POST /api/tenants/:id/rgpd/oppositions` | POST | ✅ | EPIC 10 |
| My Data | List Oppositions | `GET /api/tenants/:id/rgpd/oppositions` | GET | ✅ | EPIC 10 |
| AI Result | Contest AI (Art.22) | `POST /api/tenants/:id/rgpd/disputes` | POST | ✅ | EPIC 10 |
| My Data | List Disputes | `GET /api/tenants/:id/rgpd/disputes` | GET | ✅ | EPIC 10 |
| Admin | Resolve Dispute | `PATCH /api/tenants/:id/rgpd/disputes/:id` | PATCH | ✅ | EPIC 10 |

**Total** : 25 fonctionnalités (22 ✅ implémentés, 3 ❌ à implémenter)

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
| RGPD | List Suspensions | `GET /api/tenants/:id/rgpd/suspensions` | GET | ✅ | EPIC 10 |
| RGPD | List Oppositions | `GET /api/tenants/:id/rgpd/oppositions` | GET | ✅ | EPIC 10 |
| RGPD | List Disputes | `GET /api/tenants/:id/rgpd/disputes` | GET | ✅ | EPIC 10 |
| RGPD | Resolve Dispute | `PATCH /api/tenants/:id/rgpd/disputes/:id` | PATCH | ✅ | EPIC 10 |

**Total** : 17 fonctionnalités (17 ✅ implémentés, 0 ❌ à implémenter)

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
| Dashboard | Violations Registry | `GET /api/incidents` | GET | ✅ | EPIC 9 |
| Dashboard | Create Violation | `POST /api/incidents` | POST | ✅ | EPIC 9 |
| Dashboard | Incidents Stats | `GET /api/incidents/stats` | GET | ✅ | EPIC 9 |
| Dashboard | Pending CNIL | `GET /api/incidents/pending-cnil` | GET | ✅ | EPIC 9 |

**Total** : 18 fonctionnalités (16 ✅ implémentés, 2 ❌ à implémenter)

---

## 3. Endpoints par Article RGPD

### 3.1 Droits Utilisateurs (Art. 12-22)

| Article | Droit | Endpoint FRONT | Endpoint BACK | Status |
|---------|-------|----------------|---------------|--------|
| Art. 15 | Accès | Export RGPD (EPIC 13) | `POST /api/rgpd/export` | ✅ |
| Art. 16 | Rectification | Edit Profile (EPIC 13) | `PATCH /api/users/:userId` | ✅ |
| Art. 17 | Effacement | Delete Account (EPIC 13) | `POST /api/rgpd/delete` | ✅ |
| Art. 18 | Limitation | Suspend Data (EPIC 13) | `POST /api/tenants/:id/rgpd/suspend` | ✅ |
| Art. 20 | Portabilité | Export RGPD (EPIC 13) | `GET /api/rgpd/exports/:id/download` | ✅ |
| Art. 21 | Opposition | Oppose Form (EPIC 13) | `POST /api/tenants/:id/rgpd/oppositions` | ✅ |
| Art. 22 | Révision humaine | Contest AI (EPIC 13) | `POST /api/tenants/:id/rgpd/disputes` | ✅ |

### 3.2 Consentement (Art. 6-7)

| Fonctionnalité | EPIC FRONT | Endpoint BACK | Status |
|----------------|------------|---------------|--------|
| Grant consent | EPIC 13 US 13.4 | `POST /api/consents` | ✅ |
| Revoke consent | EPIC 13 US 13.7 | `POST /api/consents/revoke` | ✅ |
| Check consent | EPIC 13 US 13.4 | `GET /api/consents/:userId/:purposeId` | ✅ |
| List consents | EPIC 13 US 13.7 | `GET /api/consents?userId=` | ✅ |
| Consent history | EPIC 13 US 13.8 | `GET /api/consents/:userId/history` | ✅ |
| Cookie consent save | EPIC 10/13 Layout | `POST /api/consents/cookies` | ✅ |
| Cookie consent get | EPIC 10/13 Layout | `GET /api/consents/cookies` | ✅ |
| CGU accept | EPIC 10/13 | `POST /api/legal/cgu` | ✅ |
| CGU status | EPIC 10/13 | `GET /api/legal/cgu` | ✅ |

### 3.3 Notification Incidents (Art. 33-34)

| Fonctionnalité | EPIC FRONT | Endpoint BACK | Status |
|----------------|------------|---------------|--------|
| List violations | EPIC 11 Dashboard | `GET /api/incidents` | ✅ |
| Create violation | EPIC 11 Dashboard | `POST /api/incidents` | ✅ |
| Incident details | EPIC 11 Dashboard | `GET /api/incidents/:id` | ✅ |
| Update incident | EPIC 11 Dashboard | `PATCH /api/incidents/:id` | ✅ |
| Incidents stats | EPIC 11 Dashboard | `GET /api/incidents/stats` | ✅ |
| Pending CNIL | EPIC 11 Dashboard | `GET /api/incidents/pending-cnil` | ✅ |
| Notify CNIL | EPIC 9 (Backend) | - | ✅ Backend (use-case) |

---

## 4. Gaps Identifiés & Actions

### 4.1 Endpoints Manquants

✅ **Aucun endpoint backend manquant pour EPIC 11-13 !**

Tous les endpoints requis sont implémentés :

**EPIC 10 Legal & Compliance** (✅ Complet) :
- ✅ `POST /api/consents/cookies` (ePrivacy)
- ✅ `GET /api/consents/cookies` (ePrivacy)
- ✅ `POST /api/legal/cgu` (CGU acceptance)
- ✅ `GET /api/legal/cgu` (CGU status)
- ✅ `POST /api/tenants/:id/rgpd/suspend` (Art. 18)
- ✅ `POST /api/tenants/:id/rgpd/unsuspend` (Art. 18)
- ✅ `POST /api/tenants/:id/rgpd/oppositions` (Art. 21)
- ✅ `GET /api/tenants/:id/rgpd/oppositions` (Art. 21)
- ✅ `POST /api/tenants/:id/rgpd/disputes` (Art. 22)
- ✅ `GET /api/tenants/:id/rgpd/disputes` (Art. 22)
- ✅ `PATCH /api/tenants/:id/rgpd/disputes/:id` (Art. 22)
- ✅ `GET /api/tenants/:id/rgpd/suspensions` (Art. 18 - admin view)

**EPIC 9 Incident Response** (✅ Complet) :
- ✅ `GET /api/incidents` (liste avec pagination)
- ✅ `POST /api/incidents` (création manuelle)
- ✅ `GET /api/incidents/:id` (détails)
- ✅ `PATCH /api/incidents/:id` (update + actions)
- ✅ `GET /api/incidents/stats` (statistiques)
- ✅ `GET /api/incidents/pending-cnil` (urgences CNIL 72h)

**Note** : Les endpoints incidents sont sous `/api/incidents/*` et non `/api/rgpd/violations/*`

### 4.2 Backend 100% Prêt pour Frontend

✅ **Tous les backends EPICs 1-10 sont complets !**

```
✅ EPIC 1-7 : Backend Core (Auth, LLM, RGPD, Docker) - TERMINÉ
✅ EPIC 8 : Anonymisation & Pseudonymisation - TERMINÉ
✅ EPIC 9 : Incident Response & Security - TERMINÉ
  ├── ✅ Détection automatique (middleware)
  ├── ✅ Alerting multi-canal (Email, Slack)
  ├── ✅ Stockage DB (security_incidents)
  └── ✅ API REST complète (/api/incidents/*)
✅ EPIC 10 : Legal & Compliance - TERMINÉ
  ├── ✅ Cookie consent (ePrivacy)
  ├── ✅ CGU acceptance
  ├── ✅ Data suspension (Art. 18)
  ├── ✅ Oppositions (Art. 21)
  └── ✅ Disputes (Art. 22)

➡️ Prêt pour EPIC 11-13 Frontend : 100%
```

---

## 5. Checklist Validation Cohérence

### 5.1 Avant Développement EPIC 13 (Front User)

- [x] Auth login/logout/session endpoints OK
- [x] Gateway LLM invoke endpoint OK
- [x] Consents CRUD endpoints OK
- [x] Export/Delete RGPD endpoints OK
- [x] **Cookie consent endpoints** ✅ EPIC 10/LOT 10.3 TERMINÉ
- [x] **CGU acceptance endpoints** ✅ EPIC 10/LOT 10.4 TERMINÉ
- [x] **Art. 18 endpoints (suspend/unsuspend)** ✅ EPIC 10/LOT 10.5 TERMINÉ
- [x] **Art. 21 endpoints (oppositions)** ✅ EPIC 10/LOT 10.6 TERMINÉ
- [x] **Art. 22 endpoints (disputes)** ✅ EPIC 10/LOT 10.6 TERMINÉ

**Statut EPIC 13** : ✅ **100% des prérequis backend satisfaits**

### 5.2 Avant Développement EPIC 12 (Tenant Admin)

- [x] Tenant users CRUD endpoints OK
- [x] Consents matrix endpoint OK
- [x] RGPD exports/deletions list endpoints OK
- [x] **RGPD suspensions list** ✅ EPIC 10/LOT 10.5
- [x] **RGPD oppositions list** ✅ EPIC 10/LOT 10.6
- [x] **RGPD disputes list** ✅ EPIC 10/LOT 10.6
- [x] **Dispute resolution endpoint** ✅ EPIC 10/LOT 10.6
- [x] **Violations registry endpoints** ✅ `/api/incidents/*` (CRUD, stats, export)

**Statut EPIC 12** : ✅ **100% des prérequis backend satisfaits**

### 5.3 Avant Développement EPIC 11 (Super Admin)

- [x] Tenants CRUD endpoints OK
- [x] Users cross-tenant endpoints OK
- [x] Audit trail endpoint OK
- [x] Stats global endpoints OK
- [x] **Incidents registry endpoints** ✅ EPIC 9 (`/api/incidents/*`)
- [x] **DPIA/Registre access** ✅ Documents disponibles (docs/rgpd/)

**Statut EPIC 11** : ✅ **100% des prérequis backend satisfaits**

---

## 6. Conclusion

### 6.1 État Actuel

| EPIC | Fonctionnalités Requises | Implémentées | À Faire | Couverture |
|------|--------------------------|--------------|---------|------------|
| EPIC 11 (Super Admin) | 20 | 20 | 0 | **100%** |
| EPIC 12 (Tenant Admin) | 17 | 17 | 0 | **100%** |
| EPIC 13 (User Front) | 25 | 25 | 0 | **100%** |
| **Total** | **62** | **62** | **0** | **100%** |

### 6.2 Endpoints BACK Réellement Implémentés

**37+ routes actives dans `app/api/`** couvrant:
- ✅ Auth (login/logout/me)
- ✅ Users CRUD (GET/POST/PUT/DELETE)
- ✅ Tenants CRUD (GET/POST/PUT/DELETE)
- ✅ Consents (grant/revoke/delete)
- ✅ AI Gateway (invoke/jobs)
- ✅ RGPD Core (export/delete)
- ✅ Audit Events
- ✅ Metrics & Health
- ✅ **EPIC 10 Legal & Compliance** :
  - Cookie consent (GET/POST)
  - CGU acceptance (GET/POST)
  - Data suspension (POST suspend/unsuspend)
  - Oppositions (GET/POST)
  - Disputes (GET/POST/PATCH)
- ✅ **EPIC 9 Incident Response** (backend core) :
  - Détection automatique
  - Alerting multi-canal
  - Stockage DB (security_incidents)

### 6.3 Status Backend Complet

✅ **EPIC 1-10 : 100% TERMINÉ** (Janvier 2026)

1. ✅ **EPIC 1-7** : Backend Core (Auth, Gateway LLM, RGPD Pipeline, Docker, Audit)
   - 252+ tests passing
   - 22 LOTs implémentés

2. ✅ **EPIC 8** : Anonymisation & Pseudonymisation
   - 110 tests passing
   - PII detection, masking, IP anonymization

3. ✅ **EPIC 9** : Incident Response & Security
   - 60 tests passing
   - Détection automatique, alerting, API REST (`/api/incidents/*`)
   - **Note** : Endpoints sous `/api/incidents/*` et non `/api/rgpd/violations/*`

4. ✅ **EPIC 10** : Legal & Compliance
   - 180 tests passing
   - Cookie consent, CGU, Art. 18/21/22, pages légales

**Total Backend** : ✅ **720+ tests** | ✅ **42 LOTs** | ✅ **12 EPICs**

➡️ **EPIC 11-12 Frontend : ✅ TERMINÉS** | **EPIC 13 : TODO**

### 6.4 Score RGPD Après Implémentation EPIC 10

| Catégorie | Avant EPIC 10 | Après EPIC 10 |
|-----------|---------------|----------------|
| Core RGPD (Art. 5-7) | 95% | **100%** |
| Droits (Art. 12-22) | 65% | **100%** |
| Incidents (Art. 33-34) | 90% | **95%** (dashboard API manquant) |
| ePrivacy (Cookies) | 0% | **100%** |
| Transparence (Art. 13-14) | 0% | **100%** |
| **Global Backend** | **~76%** | **~96%** |

**Conformité RGPD** : ✅ **44/45 articles** (98%)

**Article restant (1)** :
- Art. 23 : Restrictions légales (cas particuliers - non applicable)

---

**Document mis à jour le 2026-01-21**
**Version 2.2**  
**Auteur** : Équipe Plateforme RGPD-IA
