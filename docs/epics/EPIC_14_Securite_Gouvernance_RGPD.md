# EPIC 14 — Sécurité & Gouvernance RGPD Plateforme

**Date** : 13 janvier 2026
**Statut** : ❌ TODO
**Périmètre** : Backend + Frontend (Interface PLATFORM)
**Scope** : PLATFORM (Super Admin)
**RGPD Coverage** : Art. 5 (Accountability), Art. 24 (Responsabilité), Art. 32 (Sécurité), Art. 33-34 (Notification violations), Art. 37-39 (DPO)

---

## 0. Contexte et justification

### 0.1 Pourquoi un EPIC séparé ?

Cet EPIC a été créé pour **respecter l'ordre des dépendances** :

```
EPIC 11 (Back Office Super Admin) ─────┐
         LOT 11.0-11.3 ✅              │
                                       ├──▶ EPIC 14 (Sécurité & Gouvernance)
EPIC 12 (Back Office Tenant Admin) ────┘           LOT 14.0
         LOT 12.0-12.4 (12.4 = API escalade)
```

**Problème initial** : Les fonctionnalités de protection plateforme (escalades, monitoring conformité) nécessitent :
1. Le dashboard Super Admin (EPIC 11 - ✅ terminé)
2. L'API d'escalade côté tenant/DPO (EPIC 12 LOT 12.4 - à faire)

**Solution** : Créer EPIC 14 qui dépend des deux, évitant ainsi les dépendances circulaires.

### 0.2 Objectifs

Permettre au Super Admin de :
1. **Surveiller la conformité RGPD** de tous les tenants en temps réel
2. **Recevoir et traiter les escalades** des DPO/tenants
3. **Agir sur les tenants non-conformes** (warning, suspension)
4. **Générer des rapports de conformité** pour audit/preuve

---

## 1. Périmètre fonctionnel

### 1.1 User Stories

#### US 14.1 : Voir le monitoring conformité tenants
**En tant que** Super Admin
**Je veux** voir un tableau de bord de la conformité RGPD de tous les tenants
**Afin de** identifier proactivement les tenants à risque

**Acceptance Criteria** :
- [ ] Widget sur dashboard existant (`/admin/dashboard`)
- [ ] % conformité global plateforme
- [ ] Liste tenants non-conformes avec critères déclencheurs
- [ ] Tri par niveau de risque (CRITICAL > HIGH > MEDIUM > LOW)

---

#### US 14.2 : Recevoir et traiter les escalades DPO
**En tant que** Super Admin
**Je veux** voir les escalades signalées par les DPO/tenants
**Afin de** intervenir sur les problèmes remontés

**Acceptance Criteria** :
- [ ] Page `/admin/escalades` avec liste des escalades
- [ ] Filtres : statut (NEW, ACKNOWLEDGED, RESOLVED), severity, tenant, type
- [ ] Actions : Acknowledge, Resolve, Escalate to external
- [ ] Historique des actions sur chaque escalade
- [ ] Notification temps réel (badge sidebar) pour nouvelles escalades

---

#### US 14.3 : Agir sur un tenant non-conforme
**En tant que** Super Admin
**Je veux** envoyer un warning ou suspendre un tenant non-conforme
**Afin de** protéger la plateforme et inciter à la mise en conformité

**Acceptance Criteria** :
- [ ] Action "Warning" : envoie notification au tenant admin + DPO
- [ ] Action "Suspend" : bloque l'accès au tenant (réversible)
- [ ] Raison obligatoire avec référence articles RGPD
- [ ] Audit trail complet de l'action
- [ ] Email automatique au tenant avec raison + actions requises

---

#### US 14.4 : Générer un rapport de conformité
**En tant que** Super Admin
**Je veux** exporter un rapport de conformité global
**Afin de** documenter la gouvernance RGPD pour audit/CNIL

**Acceptance Criteria** :
- [ ] Page `/admin/compliance/report`
- [ ] Sélection période (mois, trimestre, année)
- [ ] Export PDF formaté avec :
  - Stats globales conformité
  - Liste incidents/escalades
  - Actions correctives prises
  - Tenants suspendus/réactivés
- [ ] Export CSV pour analyse

---

### 1.2 Critères de non-conformité tenant

| Critère | Article RGPD | Seuil | Severity |
|---------|--------------|-------|----------|
| Demande RGPD sans réponse | Art. 12 | > 30 jours | HIGH |
| Contestation Art. 22 non traitée | Art. 22 | > 15 jours | HIGH |
| DPO non désigné (si obligatoire) | Art. 37 | - | MEDIUM |
| DPIA requis non validé | Art. 35 | - | HIGH |
| Cumul DPO/Admin sans acknowledgment | Art. 38.6 | - | MEDIUM |
| Violation données non notifiée | Art. 33 | > 72h | CRITICAL |

---

## 2. Architecture technique

### 2.1 APIs à implémenter

| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `GET /api/admin/tenants/compliance` | GET | Conformité tous tenants | PLATFORM |
| `GET /api/admin/tenants/:id/compliance` | GET | Conformité un tenant | PLATFORM |
| `GET /api/admin/escalades` | GET | Liste escalades | PLATFORM |
| `GET /api/admin/escalades/:id` | GET | Détail escalade | PLATFORM |
| `PATCH /api/admin/escalades/:id` | PATCH | Action sur escalade | PLATFORM |
| `POST /api/admin/tenants/:id/warning` | POST | Envoyer warning | PLATFORM |
| `POST /api/admin/tenants/:id/suspend` | POST | Suspendre tenant | PLATFORM (existe LOT 11.1) |
| `GET /api/admin/reports/compliance` | GET | Rapport conformité | PLATFORM |
| `POST /api/platform/escalade` | POST | Créer escalade | TENANT (DPO) |

### 2.2 Pages Frontend

| Page | Description |
|------|-------------|
| `/admin/dashboard` | Widget conformité ajouté (existant) |
| `/admin/escalades` | Liste + détail escalades |
| `/admin/compliance` | Vue conformité globale |
| `/admin/compliance/report` | Génération rapport |

### 2.3 Backend Jobs

| Job | Fréquence | Description |
|-----|-----------|-------------|
| `check-tenant-compliance` | Toutes les heures | Calcule % conformité par tenant |
| `alert-non-compliance` | Quotidien | Génère alertes pour tenants non-conformes |
| `escalade-reminder` | Quotidien | Rappel escalades non traitées > 48h |

### 2.4 Modèle de données

```typescript
// Table: escalades
interface Escalade {
  id: string;
  tenantId: string;
  createdBy: string;           // User ID (DPO ou TENANT_ADMIN)
  type: 'RGPD_NON_COMPLIANCE' | 'DPO_CONFLICT' | 'SECURITY_INCIDENT' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  title: string;
  description: string;
  attachments: string[];       // IDs audit events liés

  // Traitement
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolution?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Table: tenant_compliance (calculée)
interface TenantCompliance {
  tenantId: string;
  score: number;               // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: ComplianceIssue[];
  lastCheckedAt: Date;
  updatedAt: Date;
}

interface ComplianceIssue {
  code: string;                // ex: 'RGPD_REQUEST_OVERDUE'
  article: string;             // ex: 'Art. 12'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
}
```

---

## 3. Découpage en LOTs

| LOT | Description | Durée estimée | Dépendances |
|-----|-------------|---------------|-------------|
| **LOT 14.0** | Monitoring Conformité + Escalades + Actions | 5 jours | LOT 11.3 ✅, LOT 12.4 |

**Total EPIC 14** : ~5 jours (1 semaine)

### 3.1 Détails LOT 14.0

**Artefacts Backend** :
- [ ] Migration SQL : tables `escalades`, `tenant_compliance`
- [ ] API `GET /api/admin/tenants/compliance`
- [ ] API `GET/PATCH /api/admin/escalades`
- [ ] API `POST /api/platform/escalade` (appelée par TENANT)
- [ ] API `POST /api/admin/tenants/:id/warning`
- [ ] API `GET /api/admin/reports/compliance`
- [ ] Job `check-tenant-compliance`
- [ ] Service `TenantComplianceService`

**Artefacts Frontend** :
- [ ] Widget conformité sur `/admin/dashboard`
- [ ] Page `/admin/escalades`
- [ ] Page `/admin/compliance`
- [ ] Page `/admin/compliance/report`
- [ ] Badge notification nouvelles escalades

**Tests** :
- [ ] Tests unitaires API endpoints (auth, validation, responses)
- [ ] Tests unitaires calcul conformité
- [ ] Tests intégration job compliance
- [ ] Test E2E : escalade DPO → Super Admin → action

---

## 4. Articulation avec autres EPICs

### 4.1 Dépendances entrantes

| EPIC | LOT | Ce qu'il fournit |
|------|-----|------------------|
| **EPIC 11** | LOT 11.1 | API suspension tenant (réutilisée) |
| **EPIC 11** | LOT 11.3 | Dashboard existant (widget ajouté) |
| **EPIC 12** | LOT 12.4 | API escalade côté tenant + bouton UI |

### 4.2 Flux de données

```
┌─────────────────────────────────────────────────────────────────┐
│                         EPIC 14                                  │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Job        │───▶│  Compliance  │───▶│  Dashboard   │       │
│  │   Checker    │    │  Service     │    │  Widget      │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │  Escalade    │───▶│  Escalade    │───▶│  Actions     │       │
│  │  API (POST)  │    │  Dashboard   │    │  Warning/    │       │
│  │  (TENANT)    │    │  (PLATFORM)  │    │  Suspend     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│        ▲                                                         │
└────────│─────────────────────────────────────────────────────────┘
         │
         │  POST /api/platform/escalade
         │
┌────────┴─────────────────────────────────────────────────────────┐
│                         EPIC 12                                   │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐                            │
│  │  DPO         │───▶│  Bouton      │                            │
│  │  Dashboard   │    │  Escalade    │                            │
│  │  (LOT 12.4)  │    │  UI          │                            │
│  └──────────────┘    └──────────────┘                            │
└───────────────────────────────────────────────────────────────────┘
```

---

## 5. Acceptance Criteria (EPIC-level)

### 5.1 Fonctionnel

- [ ] Super Admin voit % conformité global sur dashboard
- [ ] Super Admin voit liste tenants non-conformes avec critères
- [ ] Super Admin reçoit escalades des DPO en temps réel
- [ ] Super Admin peut acknowledge/resolve une escalade
- [ ] Super Admin peut envoyer warning à un tenant
- [ ] Super Admin peut suspendre un tenant non-conforme
- [ ] Super Admin peut générer rapport conformité PDF/CSV

### 5.2 RGPD

- [ ] Toutes actions Super Admin auditées
- [ ] Raisons obligatoires pour warning/suspension
- [ ] Références articles RGPD dans les notifications
- [ ] Rapport conformité exportable pour preuve CNIL

### 5.3 Sécurité

- [ ] Endpoints protégés scope PLATFORM uniquement
- [ ] API escalade accessible scope TENANT (DPO)
- [ ] Validation stricte des inputs

### 5.4 Tests

- [ ] 80%+ coverage sur nouveaux endpoints
- [ ] Tests E2E flux escalade complet
- [ ] Tests unitaires calcul conformité

---

## 6. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Faux positifs conformité | Moyenne | MEDIUM | Seuils configurables, révision humaine |
| Surcharge escalades | Faible | LOW | Rate limiting, catégorisation auto |
| Abus suspension | Faible | HIGH | Audit trail, approbation double |

---

## 7. Prochaines étapes

**Prérequis EPIC 14** :
- EPIC 11 ✅ TERMINÉ (dashboard Super Admin)
- EPIC 12 LOT 12.4 (API escalade côté tenant)

**Après complétion EPIC 14** :
1. **Monitoring avancé** : Alerting email/SMS pour incidents critiques
2. **Intégration SIEM** : Export logs vers solution SIEM externe (optionnel)

---

**Document créé le 13 janvier 2026**
**Version 1.0**
**Auteur** : Équipe Plateforme RGPD-IA
