# Matrice de Corrélation FRONT ↔ BACK

**Date** : 26 décembre 2025  
**Version** : 1.0  
**Objectif** : Garantir la cohérence entre les fonctionnalités FRONT et les endpoints BACK pour les EPICs 10-13.

---

## 1. Vue d'ensemble

Cette matrice centralise toutes les dépendances entre les interfaces FRONT (EPIC 11-13) et les endpoints BACK (EPIC 1-10). Elle garantit qu'aucune fonctionnalité n'est oubliée et que le développement FRONT/BACK est synchronisé.

### 1.1 EPICs FRONT concernées

| EPIC | Nom | Scope | Description |
|------|-----|-------|-------------|
| **EPIC 11** | Back Office Super Admin | PLATFORM | Gestion cross-tenant, audit global |
| **EPIC 12** | Back Office Tenant Admin | TENANT | Gestion mono-tenant, users, consents |
| **EPIC 13** | Front User | MEMBER | Interface utilisateur final, AI Tools |

### 1.2 EPICs BACK concernées

| EPIC | Nom | Endpoints principaux |
|------|-----|---------------------|
| **EPIC 1** | Auth & RBAC | `/api/auth/*`, `/api/users/*`, `/api/tenants/*` |
| **EPIC 3** | Gateway LLM | `/api/ai/invoke` |
| **EPIC 4** | Storage RGPD | `/api/ai/jobs/*`, `/api/stats/*` |
| **EPIC 5** | Pipeline RGPD | `/api/consents/*`, `/api/rgpd/*` |
| **EPIC 9** | Incident Response | `/api/rgpd/violations` |
| **EPIC 10** | Legal Compliance | `/api/consents/cookies`, `/api/docs/*` |

---

## 2. Matrice Complète par EPIC FRONT

### 2.1 EPIC 13 — Front User (MEMBER)

| User Story | Fonctionnalité | Endpoint BACK | Méthode | Status | Notes |
|------------|----------------|---------------|---------|--------|-------|
| US 13.1 | Login | `POST /api/auth/login` | POST | ✅ | EPIC 1 |
| US 13.1 | Logout | `POST /api/auth/logout` | POST | ✅ | EPIC 1 |
| US 13.1 | Session | `GET /api/auth/session` | GET | ✅ | EPIC 1 |
| US 13.2 | Stats Dashboard | `GET /api/users/:userId/stats` | GET | ✅ | EPIC 4 |
| US 13.2 | Activity Feed | `GET /api/users/:userId/activity` | GET | ✅ | EPIC 4 |
| US 13.3 | Invoke LLM | `POST /api/ai/invoke` | POST | ✅ | EPIC 3 |
| US 13.3 | List Purposes | `GET /api/purposes` | GET | ✅ | EPIC 5 |
| US 13.4 | Check Consent | `GET /api/consents/:userId/:purposeId` | GET | ✅ | EPIC 5 |
| US 13.4 | Grant Consent | `POST /api/consents` | POST | ✅ | EPIC 5 |
| US 13.5 | Save Result | `POST /api/ai/jobs/:jobId/save` | POST | ✅ | EPIC 4 |
| US 13.6 | List Jobs | `GET /api/users/:userId/jobs` | GET | ✅ | EPIC 4 |
| US 13.6 | Job Details | `GET /api/ai/jobs/:jobId` | GET | ✅ | EPIC 4 |
| US 13.7 | List Consents | `GET /api/consents?userId=` | GET | ✅ | EPIC 5 |
| US 13.7 | Revoke Consent | `POST /api/consents/revoke` | POST | ✅ | EPIC 5 |
| US 13.8 | Consent History | `GET /api/consents/:userId/history` | GET | ✅ | EPIC 5 |
| US 13.9 | Get Profile | `GET /api/users/:userId` | GET | ✅ | EPIC 5 |
| US 13.9 | Update Profile | `PATCH /api/users/:userId` | PATCH | ✅ | EPIC 5 |
| US 13.10 | Request Export | `POST /api/rgpd/export` | POST | ✅ | EPIC 5 |
| US 13.10 | List Exports | `GET /api/rgpd/exports?userId=` | GET | ✅ | EPIC 5 |
| US 13.10 | Download Export | `GET /api/rgpd/exports/:id/download` | GET | ✅ | EPIC 5 |
| US 13.11 | Request Deletion | `POST /api/rgpd/delete` | POST | ✅ | EPIC 5 |
| US 13.11 | Confirm Deletion | `POST /api/rgpd/delete/confirm/:token` | POST | ✅ | EPIC 5 |
| Layout | Cookie Banner Save | `POST /api/consents/cookies` | POST | ❌ TODO | EPIC 10 |
| Layout | Cookie Banner Get | `GET /api/consents/cookies` | GET | ❌ TODO | EPIC 10 |
| My Data | Suspend Data (Art.18) | `POST /api/rgpd/suspend` | POST | ❌ TODO | EPIC 10 |
| My Data | Unsuspend Data (Art.18) | `POST /api/rgpd/unsuspend` | POST | ❌ TODO | EPIC 10 |
| My Data | Oppose (Art.21) | `POST /api/rgpd/oppose` | POST | ❌ TODO | EPIC 10 |
| My Data | List Oppositions | `GET /api/rgpd/oppositions` | GET | ❌ TODO | EPIC 10 |
| AI Result | Contest AI (Art.22) | `POST /api/rgpd/contest` | POST | ❌ TODO | EPIC 10 |
| My Data | List Contests | `GET /api/rgpd/contests` | GET | ❌ TODO | EPIC 10 |

**Total** : 28 endpoints (22 ✅ implémentés, 6 ❌ à implémenter)

---

### 2.2 EPIC 12 — Back Office Tenant Admin (TENANT)

| User Story | Fonctionnalité | Endpoint BACK | Méthode | Status | Notes |
|------------|----------------|---------------|---------|--------|-------|
| US 12.1 | Login | `POST /api/auth/login` | POST | ✅ | EPIC 1 |
| US 12.1 | Session | `GET /api/auth/session` | GET | ✅ | EPIC 1 |
| US 12.2 | Dashboard Stats | `GET /api/tenants/:tenantId/stats` | GET | ✅ | EPIC 4 |
| US 12.2 | Activity Feed | `GET /api/tenants/:tenantId/activity` | GET | ✅ | EPIC 4 |
| US 12.3 | List Users | `GET /api/tenants/:tenantId/users` | GET | ✅ | EPIC 1 |
| US 12.4 | Create User | `POST /api/tenants/:tenantId/users` | POST | ✅ | EPIC 1 |
| US 12.5 | User Details | `GET /api/tenants/:tenantId/users/:userId` | GET | ✅ | EPIC 1 |
| US 12.5 | User Stats | `GET /api/users/:userId/stats` | GET | ✅ | EPIC 4 |
| US 12.5 | User Jobs | `GET /api/users/:userId/jobs` | GET | ✅ | EPIC 4 |
| US 12.5 | User Consents | `GET /api/consents?userId=` | GET | ✅ | EPIC 5 |
| US 12.5 | User Audit | `GET /api/audit?userId=` | GET | ✅ | EPIC 1 |
| US 12.6 | Update User | `PATCH /api/tenants/:tenantId/users/:userId` | PATCH | ✅ | EPIC 1 |
| US 12.7 | Suspend User | `POST /api/tenants/:tenantId/users/:userId/suspend` | POST | ✅ | EPIC 1 |
| US 12.7 | Reactivate User | `POST /api/tenants/:tenantId/users/:userId/reactivate` | POST | ✅ | EPIC 1 |
| US 12.8 | List Purposes | `GET /api/tenants/:tenantId/purposes` | GET | ✅ | EPIC 5 |
| US 12.8 | Create Purpose | `POST /api/tenants/:tenantId/purposes` | POST | ✅ | EPIC 5 |
| US 12.8 | Update Purpose | `PATCH /api/tenants/:tenantId/purposes/:purposeId` | PATCH | ✅ | EPIC 5 |
| US 12.9 | Consent Matrix | `GET /api/tenants/:tenantId/consents/matrix` | GET | ✅ | EPIC 5 |
| US 12.10 | Consent History | `GET /api/consents/:userId/history` | GET | ✅ | EPIC 5 |
| US 12.11 | List Exports | `GET /api/tenants/:tenantId/rgpd/exports` | GET | ✅ | EPIC 5 |
| US 12.12 | List Deletions | `GET /api/tenants/:tenantId/rgpd/deletions` | GET | ✅ | EPIC 5 |
| US 12.13 | Export CSV | `GET /api/tenants/:tenantId/export-csv` | GET | ✅ | EPIC 5 |
| RGPD | List Suspensions | `GET /api/tenants/:tenantId/rgpd/suspensions` | GET | ❌ TODO | EPIC 10 |
| RGPD | List Oppositions | `GET /api/tenants/:tenantId/rgpd/oppositions` | GET | ❌ TODO | EPIC 10 |
| RGPD | List Contests | `GET /api/tenants/:tenantId/rgpd/contests` | GET | ❌ TODO | EPIC 10 |
| RGPD | Resolve Contest | `PATCH /api/rgpd/contests/:contestId` | PATCH | ❌ TODO | EPIC 10 |

**Total** : 26 endpoints (22 ✅ implémentés, 4 ❌ à implémenter)

---

### 2.3 EPIC 11 — Back Office Super Admin (PLATFORM)

| User Story | Fonctionnalité | Endpoint BACK | Méthode | Status | Notes |
|------------|----------------|---------------|---------|--------|-------|
| US 11.1 | Login | `POST /api/auth/login` | POST | ✅ | EPIC 1 |
| US 11.1 | Session | `GET /api/auth/session` | GET | ✅ | EPIC 1 |
| US 11.2 | Create Tenant | `POST /api/tenants` | POST | ✅ | EPIC 1 |
| US 11.3 | List Tenants | `GET /api/tenants` | GET | ✅ | EPIC 1 |
| US 11.4 | Suspend Tenant | `POST /api/tenants/:tenantId/suspend` | POST | ✅ | EPIC 1 |
| US 11.4 | Reactivate Tenant | `POST /api/tenants/:tenantId/reactivate` | POST | ✅ | EPIC 1 |
| US 11.5 | Tenant Details | `GET /api/tenants/:tenantId` | GET | ✅ | EPIC 1 |
| US 11.5 | Tenant Stats | `GET /api/tenants/:tenantId/stats` | GET | ✅ | EPIC 4 |
| US 11.5 | Tenant Activity | `GET /api/tenants/:tenantId/activity` | GET | ✅ | EPIC 4 |
| US 11.6 | Create Admin | `POST /api/tenants/:tenantId/users` | POST | ✅ | EPIC 1 |
| US 11.7 | List All Users | `GET /api/users` | GET | ✅ | EPIC 1 |
| US 11.7 | User Details | `GET /api/users/:userId` | GET | ✅ | EPIC 1 |
| US 11.7 | Suspend User | `POST /api/users/:userId/suspend` | POST | ✅ | EPIC 1 |
| US 11.8 | Global Stats | `GET /api/stats/global` | GET | ✅ | EPIC 4 |
| US 11.8 | AI Jobs Stats | `GET /api/stats/ai-jobs` | GET | ✅ | EPIC 4 |
| US 11.8 | RGPD Stats | `GET /api/stats/rgpd` | GET | ✅ | EPIC 5 |
| US 11.9 | Audit Trail | `GET /api/audit` | GET | ✅ | EPIC 1 |
| US 11.9 | Export Audit | `GET /api/audit/export` | GET | ✅ | EPIC 1 |
| US 11.10 | System Logs | `GET /api/logs` | GET | ✅ | EPIC 6 |
| Dashboard | Violations Registry | `GET /api/rgpd/violations` | GET | ❌ TODO | EPIC 9 |
| Dashboard | Create Violation | `POST /api/rgpd/violations` | POST | ❌ TODO | EPIC 9 |
| Compliance | DPIA Access | `GET /api/docs/dpia` | GET | ❌ TODO | EPIC 10 |
| Compliance | Registre Access | `GET /api/docs/registre` | GET | ❌ TODO | EPIC 10 |

**Total** : 23 endpoints (19 ✅ implémentés, 4 ❌ à implémenter)

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
| `GET /api/tenants/:id/rgpd/suspensions` | Art. 18 | EPIC 10 | 🟢 Basse | 0.5 jour |
| `GET /api/tenants/:id/rgpd/oppositions` | Art. 21 | EPIC 10 | 🟢 Basse | 0.5 jour |
| `GET /api/tenants/:id/rgpd/contests` | Art. 22 | EPIC 10 | 🟢 Basse | 0.5 jour |
| `GET /api/rgpd/violations` | Art. 33 | EPIC 9 | 🔴 Haute | 1 jour |
| `POST /api/rgpd/violations` | Art. 33 | EPIC 9 | 🔴 Haute | 1 jour |

**Effort total estimé** : ~10 jours développement

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

| EPIC | Endpoints Requis | Implémentés | À Faire | Couverture |
|------|------------------|-------------|---------|------------|
| EPIC 11 | 23 | 19 | 4 | 83% |
| EPIC 12 | 26 | 22 | 4 | 85% |
| EPIC 13 | 28 | 22 | 6 | 79% |
| **Total** | **77** | **63** | **14** | **82%** |

### 6.2 Actions Prioritaires

1. **EPIC 10/LOT 10.3** : Implémenter Cookie consent API (bloquant Layout FRONT)
2. **EPIC 9/LOT 9.0** : Implémenter Violations registry API (bloquant Dashboard Super Admin)
3. **EPIC 10/LOT 10.6** : Implémenter Art. 18/21/22 APIs (bloquant My Data FRONT)

### 6.3 Score RGPD après Implémentation

| Catégorie | Avant | Après Implémentation |
|-----------|-------|----------------------|
| Core RGPD (Art. 5-7) | 95% | 100% |
| Droits (Art. 12-22) | 75% | 100% |
| Incidents (Art. 33-34) | 0% | 100% |
| ePrivacy (Cookies) | 0% | 100% |
| **Global** | **~70%** | **100%** |

---

**Document créé le 26 décembre 2025**  
**Version 1.0**  
**Auteur** : Équipe Plateforme RGPD-IA
