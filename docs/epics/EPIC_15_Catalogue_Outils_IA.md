# EPIC 15 — Catalogue Outils IA (Gestion Platform Admin)

**Date** : 13 janvier 2026
**Statut** : ❌ TODO
**Périmètre** : Backend + Frontend (Interface PLATFORM)
**Scope** : PLATFORM (Super Admin)
**RGPD Coverage** : Art. 5 (Accountability), Art. 6 (Base légale), Art. 13-14 (Information), Art. 25 (Privacy by Design), Art. 35 (DPIA)

---

## 0. Contexte et justification

### 0.1 Pourquoi cet EPIC ?

**Problème actuel** : Les 53 templates d'outils IA sont **hardcodés** dans les fichiers de migration SQL. Le Platform Admin ne peut pas :
- Ajouter de nouveaux outils IA
- Modifier les métadonnées RGPD d'un outil existant
- Désactiver globalement un outil problématique
- Visualiser le catalogue complet

**Solution** : Créer une interface d'administration du **Catalogue d'Outils IA** permettant au Platform Admin de gérer les outils disponibles pour tous les tenants.

### 0.2 Relation Outil IA ↔ Finalité

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE OUTILS IA / FINALITÉS                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  NIVEAU PLATEFORME (EPIC 15 - Platform Admin)                         │   │
│  │                                                                       │   │
│  │  Catalogue Outils IA                                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ AI Summa-   │  │ AI Classi-  │  │ AI Extrac-  │  │ AI Genera-  │  │   │
│  │  │ rizer       │  │ fier        │  │ tor         │  │ tor         │  │   │
│  │  │             │  │             │  │             │  │             │  │   │
│  │  │ Finalité:   │  │ Finalité:   │  │ Finalité:   │  │ Finalité:   │  │   │
│  │  │ AI_SUMMA-   │  │ AI_CLASSI-  │  │ AI_EXTRAC-  │  │ AI_GENERA-  │  │   │
│  │  │ RIZATION    │  │ FICATION    │  │ TION        │  │ TION        │  │   │
│  │  │             │  │             │  │             │  │             │  │   │
│  │  │ Base légale │  │ Base légale │  │ Base légale │  │ Base légale │  │   │
│  │  │ CONSENT     │  │ CONSENT     │  │ CONSENT     │  │ CONSENT     │  │   │
│  │  │ Risque: MED │  │ Risque: MED │  │ Risque: HIGH│  │ Risque: MED │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼ Héritage automatique                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  NIVEAU TENANT (EPIC 12 - Tenant Admin)                               │   │
│  │                                                                       │   │
│  │  Configuration Outils IA pour mon organisation                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │   │
│  │  │ ☑ AI Summa- │  │ ☑ AI Classi-│  │ ☐ AI Extrac-│  ← Activé/Désactivé│   │
│  │  │ rizer       │  │ fier        │  │ tor         │                   │   │
│  │  │             │  │             │  │             │                   │   │
│  │  │ Libellé:    │  │ Libellé:    │  │ ⚠️ DPIA     │                   │   │
│  │  │ "Résumeur"  │  │ (défaut)    │  │ requis      │                   │   │
│  │  │ (custom)    │  │             │  │             │                   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼ Consentement utilisateur                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  NIVEAU USER (EPIC 13 - End User)                                     │   │
│  │                                                                       │   │
│  │  Outils IA disponibles                                                │   │
│  │  ┌─────────────┐  ┌─────────────┐                                    │   │
│  │  │ ✅ Résumeur │  │ ✅ Classifi-│  ← Consentement accordé             │   │
│  │  │ de docs     │  │ cateur      │                                    │   │
│  │  │             │  │             │                                    │   │
│  │  │ [Utiliser]  │  │ [Utiliser]  │                                    │   │
│  │  └─────────────┘  └─────────────┘                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Principe clé** : **1 Outil IA = 1 Finalité RGPD pré-attachée**

| Niveau | Acteur | Responsabilité |
|--------|--------|----------------|
| **Plateforme** | Platform Admin | Définir le catalogue (outils + finalités RGPD) |
| **Tenant** | Tenant Admin | Activer/personnaliser les outils pour son organisation |
| **User** | End User | Consentir et utiliser les outils activés |

### 0.3 Objectifs EPIC 15

Permettre au Platform Admin de :
1. **Visualiser** le catalogue complet des outils IA
2. **Créer** de nouveaux outils IA avec leur finalité RGPD
3. **Modifier** les métadonnées d'un outil existant
4. **Activer/Désactiver** globalement un outil
5. **Définir les DPIA templates** pré-remplis pour chaque outil
6. **Monitorer** l'adoption des outils par les tenants

---

## 1. Périmètre fonctionnel

### 1.1 User Stories

#### US 15.1 : Voir le catalogue des outils IA
**En tant que** Platform Admin
**Je veux** voir la liste complète des outils IA disponibles
**Afin de** avoir une vue d'ensemble du catalogue

**Acceptance Criteria** :
- [ ] Page `/admin/ai-tools` avec liste des outils
- [ ] Colonnes : Nom, Code, Finalité, Base légale, Risque, DPIA, Status, Adoptions
- [ ] Filtres : par catégorie, secteur, risque, status (actif/inactif)
- [ ] Tri par nom, risque, nombre d'adoptions
- [ ] Badge visuel pour chaque niveau de risque
- [ ] Support des 53 outils répartis en 6 catégories et 6 secteurs

---

#### US 15.2 : Créer un nouvel outil IA
**En tant que** Platform Admin
**Je veux** créer un nouvel outil IA dans le catalogue
**Afin de** proposer de nouvelles fonctionnalités aux tenants

**Acceptance Criteria** :
- [ ] Page `/admin/ai-tools/new` avec formulaire complet
- [ ] **Section Outil** :
  - Code unique (ex: `AI_SENTIMENT`)
  - Nom affiché (ex: "Analyse de sentiment")
  - Description (10-500 caractères)
  - Icône (sélection parmi liste)
  - Catégorie (AI_PROCESSING, ANALYTICS, MARKETING, ESSENTIAL, CRITICAL, PROFESSIONAL)
  - Secteur (GENERAL, ACCOUNTING, LEGAL, HEALTH, FINANCE, HR)
- [ ] **Section Finalité RGPD** :
  - Base légale (dropdown Art. 6)
  - Niveau de risque (LOW/MEDIUM/HIGH/CRITICAL)
  - Classification données max (P0/P1/P2/P3)
  - DPIA requis (auto-calculé si HIGH/CRITICAL ou P3)
- [ ] **Section Technique** :
  - Provider LLM cible (Ollama, OpenAI, etc.)
  - Prompt template (optionnel)
  - Max tokens
- [ ] Validation avant création
- [ ] Audit event créé (ai_tool.created)

---

#### US 15.3 : Modifier un outil IA existant
**En tant que** Platform Admin
**Je veux** modifier les métadonnées d'un outil IA existant
**Afin de** corriger ou mettre à jour ses informations

**Acceptance Criteria** :
- [ ] Page `/admin/ai-tools/[code]/edit`
- [ ] Champs éditables : nom, description, icône
- [ ] Champs en lecture seule (immutables) : code, base légale, risque
  - ⚠️ Pour modifier base légale/risque → créer nouvelle version (v2)
- [ ] Historique des modifications visible
- [ ] Audit event créé (ai_tool.updated)

---

#### US 15.4 : Activer/Désactiver un outil IA globalement
**En tant que** Platform Admin
**Je veux** activer ou désactiver un outil IA pour toute la plateforme
**Afin de** contrôler la disponibilité des fonctionnalités

**Acceptance Criteria** :
- [ ] Toggle activation sur la page liste ou détail
- [ ] **Désactivation** :
  - Confirmation obligatoire avec impact affiché
  - Liste des tenants qui utilisent cet outil
  - Notification aux tenants concernés (optionnel)
  - Outil masqué dans EPIC 12 (adoption impossible)
  - Outils déjà adoptés : continuent de fonctionner (grace period) ou bloqués (selon config)
- [ ] **Activation** :
  - Outil visible pour adoption dans EPIC 12
- [ ] Audit event créé (ai_tool.activated / ai_tool.deactivated)

---

#### US 15.5 : Définir le DPIA template d'un outil
**En tant que** Platform Admin
**Je veux** définir le DPIA pré-rempli pour un outil IA
**Afin de** faciliter la validation par les DPO des tenants

**Acceptance Criteria** :
- [ ] Page `/admin/ai-tools/[code]/dpia`
- [ ] Formulaire DPIA avec sections :
  - **Nature du traitement** : types données, catégories personnes
  - **Nécessité et proportionnalité** : finalité, minimisation, rétention
  - **Risques identifiés** : liste avec probabilité/sévérité/mitigations
  - **Mesures de sécurité** : techniques, organisationnelles, spécifiques LLM
- [ ] Pré-remplissage automatique basé sur le niveau de risque
- [ ] Sauvegarde en version (v1, v2, ...)
- [ ] Le DPO du tenant (EPIC 12.4) voit ce DPIA pré-rempli et le valide

---

#### US 15.6 : Voir les statistiques d'adoption
**En tant que** Platform Admin
**Je veux** voir les statistiques d'adoption des outils IA
**Afin de** comprendre l'usage de la plateforme

**Acceptance Criteria** :
- [ ] Widget sur dashboard `/admin/dashboard` :
  - Top 5 outils les plus adoptés
  - Outils jamais adoptés
  - Évolution adoptions (graphique)
- [ ] Page détail outil `/admin/ai-tools/[code]` :
  - Nombre de tenants ayant adopté
  - Liste des tenants (anonymisée : slug seulement)
  - Nombre total d'invocations (métrique agrégée)
  - Taux de succès/échec

---

### 1.2 Modèle de données

#### Table `ai_tools` (Catalogue Plateforme)

```typescript
interface AITool {
  // Identité
  id: string;              // UUID
  code: string;            // Unique, ex: 'AI_SUMMARIZATION'
  name: string;            // Nom affiché
  description: string;     // 10-500 chars
  icon: string;            // Nom icône (lucide-react)
  category: ToolCategory;  // AI_PROCESSING, ANALYTICS, etc.
  sector: ToolSector;      // GENERAL, ACCOUNTING, LEGAL, HEALTH, FINANCE, HR

  // Finalité RGPD pré-attachée
  purpose: {
    code: string;          // Même que ai_tool.code par défaut
    lawfulBasis: LawfulBasis;
    riskLevel: RiskLevel;
    dataClassMax: DataClass;
    requiresDPIA: boolean;
  };

  // Configuration technique
  config: {
    provider: string;      // 'ollama', 'openai', etc.
    promptTemplate?: string;
    maxTokens: number;
    timeout: number;
  };

  // DPIA template
  dpiaTemplate?: DPIATemplate;

  // Lifecycle
  status: 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';
  version: number;         // Pour versioning
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;       // Platform Admin ID
}

type ToolCategory = 'AI_PROCESSING' | 'ANALYTICS' | 'MARKETING' | 'ESSENTIAL' | 'CRITICAL' | 'PROFESSIONAL';
type ToolSector = 'GENERAL' | 'ACCOUNTING' | 'LEGAL' | 'HEALTH' | 'FINANCE' | 'HR';
type LawfulBasis = 'CONSENT' | 'CONTRACT' | 'LEGAL_OBLIGATION' | 'VITAL_INTEREST' | 'PUBLIC_INTEREST' | 'LEGITIMATE_INTEREST';
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type DataClass = 'P0' | 'P1' | 'P2' | 'P3';
```

#### Table `ai_tool_adoptions` (Adoption par Tenant)

```typescript
interface AIToolAdoption {
  id: string;
  aiToolId: string;        // FK → ai_tools
  tenantId: string;        // FK → tenants

  // Personnalisation tenant
  customLabel?: string;    // Libellé personnalisé
  customDescription?: string;
  isRequired: boolean;     // Obligatoire pour les users du tenant

  // État
  isEnabled: boolean;
  enabledAt: Date;
  enabledBy: string;       // Tenant Admin ID

  // DPIA validation (par DPO tenant)
  dpiaStatus: 'NOT_REQUIRED' | 'PENDING' | 'VALIDATED' | 'REJECTED';
  dpiaValidatedAt?: Date;
  dpiaValidatedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

#### Relation avec les tables existantes

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ai_tools      │     │ ai_tool_adoptions│     │    purposes     │
│   (PLATFORM)    │────▶│   (TENANT)      │────▶│   (TENANT)      │
│                 │     │                 │     │                 │
│ code            │     │ aiToolId        │     │ aiToolAdoptionId│
│ purpose.code    │     │ tenantId        │     │ label           │
│ purpose.basis   │     │ customLabel     │     │ lawfulBasis     │
│ dpiaTemplate    │     │ dpiaStatus      │     │ (hérité)        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │    consents     │
                                                │   (USER)        │
                                                │                 │
                                                │ purposeId       │
                                                │ granted/revoked │
                                                └─────────────────┘
```

---

## 2. Architecture technique

### 2.1 APIs à implémenter

| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `GET /api/admin/ai-tools` | GET | Liste catalogue outils | PLATFORM |
| `GET /api/admin/ai-tools/:code` | GET | Détail outil | PLATFORM |
| `POST /api/admin/ai-tools` | POST | Créer outil | PLATFORM |
| `PATCH /api/admin/ai-tools/:code` | PATCH | Modifier outil | PLATFORM |
| `POST /api/admin/ai-tools/:code/activate` | POST | Activer outil | PLATFORM |
| `POST /api/admin/ai-tools/:code/deactivate` | POST | Désactiver outil | PLATFORM |
| `GET /api/admin/ai-tools/:code/dpia` | GET | Voir DPIA template | PLATFORM |
| `PUT /api/admin/ai-tools/:code/dpia` | PUT | Définir DPIA template | PLATFORM |
| `GET /api/admin/ai-tools/:code/stats` | GET | Stats adoption | PLATFORM |
| `GET /api/admin/ai-tools/stats/global` | GET | Stats globales | PLATFORM |

### 2.2 API Tenant (modification EPIC 12)

| Endpoint | Méthode | Description | Auth | Modification |
|----------|---------|-------------|------|--------------|
| `GET /api/ai-tools/available` | GET | Outils disponibles pour adoption | TENANT | **NOUVEAU** |
| `POST /api/ai-tools/adopt` | POST | Adopter un outil | TENANT | Remplace `/api/purposes/adopt` |
| `GET /api/purposes` | GET | Liste purposes tenant | TENANT | Ajoute `aiToolId` |
| `GET /api/purposes/templates` | GET | **DEPRECATED** | TENANT | Redirige vers `/api/ai-tools/available` |

### 2.3 Pages Frontend Platform Admin

| Page | Description |
|------|-------------|
| `/admin/ai-tools` | Liste catalogue outils |
| `/admin/ai-tools/new` | Créer nouvel outil |
| `/admin/ai-tools/[code]` | Détail outil + stats |
| `/admin/ai-tools/[code]/edit` | Modifier outil |
| `/admin/ai-tools/[code]/dpia` | Définir DPIA template |

### 2.4 Modification Sidebar Platform Admin (EPIC 11)

```typescript
// PlatformSidebar.tsx - Ajout menu Catalogue
const PLATFORM_ROUTES = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/tenants', label: 'Tenants', icon: Building },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/ai-tools', label: 'Catalogue IA', icon: Cpu, badge: 'NEW' }, // ← NOUVEAU
  { href: '/admin/audit', label: 'Audit', icon: FileText },
  { href: '/admin/logs', label: 'Logs', icon: Terminal },
];
```

---

## 3. Migration des données existantes

### 3.1 Répartition des 53 templates existants

Les templates actuels sont répartis dans 4 fichiers de migration SQL :

| Fichier Migration | Nombre | Catégories/Secteurs |
|-------------------|--------|---------------------|
| `020_purpose_templates.sql` | 8 | AI_PROCESSING (initial) |
| `021_additional_purpose_templates.sql` | 17 | MARKETING, ANALYTICS, ESSENTIAL, AI extras |
| `022_critical_purpose_templates.sql` | 7 | CRITICAL (biométrique, santé, décisions automatisées) |
| `023_professional_purpose_templates.sql` | 21 | PROFESSIONAL par secteur (ACCOUNTING, LEGAL, HEALTH, FINANCE, HR) |
| **TOTAL** | **53** | |

### 3.2 Seed initial du catalogue

Les 53 templates actuels seront migrés vers la table `ai_tools` :

```sql
-- Migration 024_ai_tools_catalog.sql

-- Créer la table ai_tools
CREATE TABLE ai_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'cpu',
  category VARCHAR(30) NOT NULL,
  sector VARCHAR(30) NOT NULL DEFAULT 'GENERAL', -- GENERAL, ACCOUNTING, LEGAL, HEALTH, FINANCE, HR

  -- Finalité RGPD embarquée (JSONB)
  purpose JSONB NOT NULL,

  -- Configuration technique
  config JSONB NOT NULL DEFAULT '{}',

  -- DPIA template
  dpia_template JSONB,

  -- Lifecycle
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Seed des 53 outils existants (migration depuis purpose_templates)
-- Note: Les données sont lues depuis les tables purpose_templates existantes
INSERT INTO ai_tools (code, name, description, icon, category, sector, purpose, config)
SELECT
  code,
  name,
  description,
  'cpu' as icon, -- Icône par défaut, à personnaliser via UI
  category,
  COALESCE(sector, 'GENERAL') as sector,
  jsonb_build_object(
    'code', code,
    'lawfulBasis', lawful_basis,
    'riskLevel', risk_level,
    'dataClassMax', 'P2',
    'requiresDPIA', risk_level IN ('HIGH', 'CRITICAL')
  ) as purpose,
  jsonb_build_object(
    'provider', 'ollama',
    'maxTokens', 2048,
    'timeout', 30000
  ) as config
FROM purpose_templates
WHERE is_system = true;

-- Exemples de quelques outils clés migrés (extrait) :
--
-- Catégorie AI_PROCESSING (8) :
--   AI_SUMMARIZATION, AI_CLASSIFICATION, AI_EXTRACTION, AI_GENERATION,
--   AI_TRANSLATION, AI_OCR, AI_SENTIMENT, AI_ANONYMIZATION
--
-- Catégorie ANALYTICS (4) :
--   ANALYTICS_USAGE, ANALYTICS_PERFORMANCE, ANALYTICS_BEHAVIOR, ANALYTICS_AB_TESTING
--
-- Catégorie MARKETING (4) :
--   MARKETING_EMAIL, MARKETING_ADS, MARKETING_PROFILING, MARKETING_AFFILIATION
--
-- Catégorie ESSENTIAL (5) :
--   ESSENTIAL_SECURITY, ESSENTIAL_SESSION, ESSENTIAL_PREFERENCES,
--   ESSENTIAL_COMPLIANCE, ESSENTIAL_COMMUNICATION
--
-- Catégorie CRITICAL (7) :
--   BIOMETRIC_AUTH, HEALTH_DATA_PROCESSING, GENETIC_DATA_ANALYSIS,
--   AUTOMATED_DECISION, MINOR_DATA_PROCESSING, LARGE_SCALE_MONITORING, CROSS_BORDER_TRANSFER
--
-- Catégorie PROFESSIONAL par secteur (21) :
--   ACCOUNTING: ACCOUNTING_INVOICES, ACCOUNTING_RECEIPTS, ACCOUNTING_REPORTS, ACCOUNTING_AUDIT
--   LEGAL: LEGAL_CONTRACTS, LEGAL_COMPLIANCE, LEGAL_RESEARCH, LEGAL_DOCUMENT_REVIEW
--   HEALTH: HEALTH_RECORDS, HEALTH_DIAGNOSIS, HEALTH_PRESCRIPTION, HEALTH_MONITORING, HEALTH_ANONYMIZATION
--   FINANCE: FINANCE_RISK, FINANCE_FRAUD, FINANCE_INVESTMENT, FINANCE_REPORTING
--   HR: HR_RECRUITMENT, HR_EVALUATION, HR_TRAINING, HR_PAYROLL

-- Créer la table d'adoptions
CREATE TABLE ai_tool_adoptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tool_id UUID NOT NULL REFERENCES ai_tools(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  custom_label VARCHAR(100),
  custom_description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,

  is_enabled BOOLEAN NOT NULL DEFAULT true,
  enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enabled_by UUID REFERENCES users(id),

  dpia_status VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUIRED',
  dpia_validated_at TIMESTAMPTZ,
  dpia_validated_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(ai_tool_id, tenant_id)
);

-- Index pour performances
CREATE INDEX idx_ai_tools_status ON ai_tools(status);
CREATE INDEX idx_ai_tools_category ON ai_tools(category);
CREATE INDEX idx_ai_tools_sector ON ai_tools(sector);
CREATE INDEX idx_ai_tool_adoptions_tenant ON ai_tool_adoptions(tenant_id);
CREATE INDEX idx_ai_tool_adoptions_tool ON ai_tool_adoptions(ai_tool_id);
```

### 3.3 Migration des données existantes

```sql
-- Migration 025_migrate_purpose_templates.sql

-- Migrer les purpose_templates existants vers ai_tool_adoptions
INSERT INTO ai_tool_adoptions (ai_tool_id, tenant_id, custom_label, is_enabled, enabled_at, enabled_by)
SELECT
  at.id,
  pt.tenant_id,
  pt.custom_label,
  pt.is_active,
  pt.adopted_at,
  pt.adopted_by
FROM purpose_templates pt
JOIN ai_tools at ON at.code = pt.template_code
WHERE pt.tenant_id IS NOT NULL;

-- Ajouter colonne ai_tool_adoption_id à purposes (optionnel, pour lien)
ALTER TABLE purposes ADD COLUMN ai_tool_adoption_id UUID REFERENCES ai_tool_adoptions(id);

-- Mettre à jour les purposes existants
UPDATE purposes p
SET ai_tool_adoption_id = ata.id
FROM ai_tool_adoptions ata
JOIN ai_tools at ON at.id = ata.ai_tool_id
WHERE p.template_code = at.code AND p.tenant_id = ata.tenant_id;
```

---

## 4. Découpage en LOTs

| LOT | Description | Durée estimée | Dépendances |
|-----|-------------|---------------|-------------|
| **LOT 15.0** | Backend Catalogue (API CRUD + Migration) | 4 jours | EPIC 1 (Auth), EPIC 4 (DB) |
| **LOT 15.1** | Frontend Catalogue (Liste + Détail + CRUD) | 4 jours | LOT 15.0, LOT 11.0 (Infra Admin) |
| **LOT 15.2** | DPIA Templates + Stats | 3 jours | LOT 15.1 |

**Total EPIC 15** : ~11 jours (2,2 semaines)

### 4.1 Détails LOT 15.0 — Backend Catalogue

**Artefacts Backend** :
- [ ] Migration SQL : tables `ai_tools`, `ai_tool_adoptions`
- [ ] Migration données : seed 8 outils + migration `purpose_templates`
- [ ] Domain entities : `AITool`, `AIToolAdoption`
- [ ] Repository : `PgAIToolRepository`
- [ ] Use-cases : `CreateAITool`, `UpdateAITool`, `ActivateAITool`, `DeactivateAITool`
- [ ] API Routes : `/api/admin/ai-tools/*`
- [ ] API Routes : `/api/ai-tools/available` (TENANT)
- [ ] Modification : `/api/purposes/adopt` → utilise `ai_tool_adoptions`

**Tests** :
- [ ] Tests unitaires domain (20+)
- [ ] Tests unitaires repository (15+)
- [ ] Tests API routes (25+)
- [ ] Tests migration (5+)

### 4.2 Détails LOT 15.1 — Frontend Catalogue

**Artefacts Frontend** :
- [ ] Page `/admin/ai-tools` : Liste avec filtres
- [ ] Page `/admin/ai-tools/new` : Formulaire création
- [ ] Page `/admin/ai-tools/[code]` : Détail + stats
- [ ] Page `/admin/ai-tools/[code]/edit` : Formulaire édition
- [ ] Modification Sidebar : ajout menu "Catalogue IA"
- [ ] Composants : `AIToolCard`, `AIToolForm`, `AIToolTable`

**Tests** :
- [ ] Tests composants (15+)
- [ ] Tests E2E : CRUD outil complet

### 4.3 Détails LOT 15.2 — DPIA Templates + Stats

**Artefacts** :
- [ ] Page `/admin/ai-tools/[code]/dpia` : Éditeur DPIA template
- [ ] Composant `DPIATemplateForm` avec sections
- [ ] Widget dashboard : stats adoption
- [ ] API : `/api/admin/ai-tools/:code/stats`
- [ ] Graphiques Recharts : évolution adoptions

**Tests** :
- [ ] Tests DPIA form (10+)
- [ ] Tests stats API (5+)

---

## 5. Impact sur les autres EPICs

### 5.1 EPIC 11 — Back Office Super Admin

**Modifications** :
- [ ] Ajouter menu "Catalogue IA" dans Sidebar
- [ ] Widget dashboard : top outils adoptés

### 5.2 EPIC 12 — Back Office Tenant Admin

> **Note** : Ces modifications seront implémentées dans le cadre de EPIC 15, pas EPIC 12. EPIC 12 reste inchangé jusqu'à l'implémentation de EPIC 15.

**Modifications UI à appliquer** :

#### 5.2.1 Onglet "Finalités de traitement" → "Outils IA"

**Avant (EPIC 12 actuel)** :
- Onglet "Templates" avec templates système
- Colonnes : Label, Description, Base légale, Risque, Active

**Après (EPIC 15)** :
- Onglet renommé "Outils IA"
- Colonnes : **Outil IA** (nom + icône), **Finalité RGPD**, Base légale, Risque, Active

#### 5.2.2 Nouvelle structure de la table des finalités

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  OUTILS IA & FINALITÉS DE MON ORGANISATION                                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  [Onglet: Outils IA] [Onglet: Personnalisées] [Onglet: Toutes]                         │
│                                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Rechercher...                    [Filtre: Catégorie ▼] [Filtre: Risque ▼]   │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  ┌────────┬──────────────────────┬───────────────────┬──────────┬────────┬────────┐  │
│  │ Actif  │ Outil IA             │ Finalité RGPD     │ Base     │ Risque │ Actions│  │
│  ├────────┼──────────────────────┼───────────────────┼──────────┼────────┼────────┤  │
│  │  ✅    │ 📄 Résumeur de docs  │ AI_SUMMARIZATION  │ CONSENT  │ 🟡 MED │ ⚙️ 👁️  │  │
│  │        │ Génère des résumés   │                   │          │        │        │  │
│  ├────────┼──────────────────────┼───────────────────┼──────────┼────────┼────────┤  │
│  │  ✅    │ 🏷️ Classificateur    │ AI_CLASSIFICATION │ CONSENT  │ 🟡 MED │ ⚙️ 👁️  │  │
│  │        │ Catégorise le contenu│                   │          │        │        │  │
│  ├────────┼──────────────────────┼───────────────────┼──────────┼────────┼────────┤  │
│  │  ❌    │ 🔍 Extracteur        │ AI_EXTRACTION     │ CONSENT  │ 🟠 HIGH│ ⚙️ 👁️  │  │
│  │        │ ⚠️ DPIA requis       │                   │          │        │        │  │
│  ├────────┼──────────────────────┼───────────────────┼──────────┼────────┼────────┤  │
│  │  ✅    │ ✏️ Générateur        │ AI_GENERATION     │ CONSENT  │ 🟡 MED │ ⚙️ 👁️  │  │
│  │        │ Génère du contenu    │                   │          │        │        │  │
│  └────────┴──────────────────────┴───────────────────┴──────────┴────────┴────────┘  │
│                                                                                        │
│  [+ Parcourir le catalogue]                                                            │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

**Éléments clés** :
- **Colonne "Outil IA"** : Nom + icône + description courte (mise en avant)
- **Colonne "Finalité RGPD"** : Code finalité (informationnel, lien vers détails)
- **Badge DPIA** : Warning si l'outil requiert validation DPO
- **Toggle Actif** : Active/désactive l'outil pour le tenant
- **Actions** : ⚙️ Personnaliser libellé, 👁️ Voir détails finalité

#### 5.2.3 Nouvelle page Browser du catalogue

**URL** : `/portal/consents/ai-tools`

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  CATALOGUE OUTILS IA DISPONIBLES                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  Sélectionnez les outils IA à activer pour votre organisation.                         │
│  Chaque outil est associé à une finalité RGPD pré-validée.                             │
│                                                                                        │
│  [Filtre: Catégorie ▼] [Filtre: Risque ▼]                                             │
│                                                                                        │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ 📄 RÉSUMEUR         │  │ 🏷️ CLASSIFICATEUR  │  │ 🔍 EXTRACTEUR       │            │
│  │                     │  │                     │  │                     │            │
│  │ Génère des résumés  │  │ Catégorise contenu  │  │ Extrait entités     │            │
│  │ concis de documents │  │ automatiquement     │  │ (personnes, dates)  │            │
│  │                     │  │                     │  │                     │            │
│  │ ─────────────────── │  │ ─────────────────── │  │ ─────────────────── │            │
│  │ 📋 AI_SUMMARIZATION │  │ 📋 AI_CLASSIFICATION│  │ 📋 AI_EXTRACTION    │            │
│  │ 🔵 CONSENT          │  │ 🔵 CONSENT          │  │ 🔵 CONSENT          │            │
│  │ 🟡 MEDIUM           │  │ 🟡 MEDIUM           │  │ 🟠 HIGH ⚠️ DPIA     │            │
│  │                     │  │                     │  │                     │            │
│  │ ✅ Activé           │  │ ✅ Activé           │  │ [Activer]           │            │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘            │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 5.2.4 Modifications API

| Avant (EPIC 12) | Après (EPIC 15) |
|-----------------|-----------------|
| `GET /api/purposes/templates` | **DEPRECATED** → `GET /api/ai-tools/available` |
| `POST /api/purposes/adopt` | Rétrocompatible, redirige vers `POST /api/ai-tools/adopt` |
| `GET /api/purposes` | Ajoute champ `aiToolId` si lié à un outil |

#### 5.2.5 Checklist modifications EPIC 12

- [ ] Renommer onglet "Templates" → "Outils IA"
- [ ] Ajouter colonne "Outil IA" (nom + icône) dans la table
- [ ] Ajouter colonne "Finalité RGPD" (code)
- [ ] Créer page `/portal/consents/ai-tools` (browser catalogue)
- [ ] Modifier `GET /api/purposes` pour inclure `aiToolId`
- [ ] Ajouter `GET /api/ai-tools/available` (liste outils pour adoption)
- [ ] Ajouter `POST /api/ai-tools/adopt` (adopter un outil)
- [ ] Deprecation warning sur `GET /api/purposes/templates`

### 5.3 EPIC 13 — Front User

**Modifications** :
- [ ] Interface outils IA : afficher nom/icône de l'outil (pas juste la finalité)
- [ ] Consentement : "Autoriser [Nom Outil]" au lieu de "Autoriser [Code Finalité]"

### 5.4 EPIC 14 — Gouvernance

**Modifications** :
- [ ] Monitoring : conformité par outil IA (pas juste par tenant)
- [ ] Alertes : outil avec taux d'échec élevé

---

## 6. Acceptance Criteria (EPIC-level)

### 6.1 Fonctionnel

- [ ] Platform Admin peut voir le catalogue des outils IA
- [ ] Platform Admin peut créer un nouvel outil IA avec finalité RGPD
- [ ] Platform Admin peut modifier un outil existant (nom, description, icône)
- [ ] Platform Admin peut activer/désactiver un outil globalement
- [ ] Platform Admin peut définir le DPIA template d'un outil
- [ ] Platform Admin peut voir les stats d'adoption par outil
- [ ] Les 53 outils existants sont migrés vers le nouveau système
- [ ] Les adoptions existantes (tenants) sont préservées

### 6.2 RGPD

- [ ] Chaque outil a une finalité RGPD pré-attachée
- [ ] Base légale et niveau de risque sont immutables après création
- [ ] DPIA template pré-rempli pour outils HIGH/CRITICAL
- [ ] Audit trail complet des actions Platform Admin

### 6.3 Compatibilité

- [ ] API `/api/purposes/templates` rétrocompatible (deprecated mais fonctionnelle)
- [ ] Les purposes existants continuent de fonctionner
- [ ] Les consentements existants ne sont pas impactés

### 6.4 Tests

- [ ] 80%+ coverage sur nouveaux modules
- [ ] Tests E2E : création outil → adoption tenant → consentement user
- [ ] Tests migration : rollback possible

---

## 7. Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Migration données cassée | Moyenne | CRITIQUE | Migration réversible, tests complets, backup avant |
| API breaking change | Moyenne | ÉLEVÉ | Période de dépréciation `/api/purposes/templates`, dual-write |
| Incohérence finalité/outil | Faible | MOYEN | Validation stricte, contraintes DB |
| Performance listing | Faible | FAIBLE | Index, pagination, cache |

---

## 8. Articulation avec autres EPICs

### 8.1 Dépendances entrantes

| EPIC | Ce qu'il fournit |
|------|------------------|
| **EPIC 1** | Auth RBAC (scope PLATFORM) |
| **EPIC 4** | DAL PostgreSQL |
| **EPIC 11** | Infrastructure Back Office Admin |

### 8.2 Dépendances sortantes

| EPIC | Ce qu'il utilise |
|------|------------------|
| **EPIC 12** | API `/api/ai-tools/available`, table `ai_tool_adoptions` |
| **EPIC 13** | Métadonnées outils pour affichage |
| **EPIC 14** | Stats conformité par outil |

---

## 9. Prochaines étapes

**Après complétion EPIC 15** :
1. Mettre à jour EPIC 12 pour utiliser le nouveau catalogue
2. Documenter migration pour tenants existants
3. Former Platform Admins sur la gestion du catalogue

---

**Document créé le 13 janvier 2026**
**Version 1.0**
**Auteur** : Équipe Plateforme RGPD-IA
