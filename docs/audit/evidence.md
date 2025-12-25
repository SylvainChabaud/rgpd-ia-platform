# Evidence — Cartographie des preuves de conformité RGPD

> **Document technique** : Cartographie complète des preuves techniques et documentaires permettant de démontrer la conformité RGPD de la plateforme.
>
> **Usage** : Audit CNIL, due diligence client, certification ISO 27001/27701
>
> **Dernière mise à jour** : 2025-12-25
> **Maintenu par** : DPO + RSSI

---

## 1. Principe de l'accountability (Art. 5.2 RGPD)

> "Le responsable du traitement est responsable du respect des principes [du RGPD] et est en mesure de démontrer que ceux-ci sont respectés (accountability)."

Cette cartographie permet de **prouver la conformité** en liant :
- **Documents normatifs** → règles à respecter
- **Implémentations techniques** → code source, configuration
- **Tests automatisés** → preuves d'exécution
- **Artefacts d'audit** → rapports versionnés

---

## 2. Structure des preuves

### 2.1 Organisation des artefacts

```
rgpd-ia-platform/
├── docs/
│   ├── rgpd/                    # Documentation RGPD
│   │   ├── registre-traitements.md  ← Art. 30
│   │   ├── dpia.md                   ← Art. 35
│   │   └── TRACABILITE_RGPD_*.md     ← Matrices conformité
│   ├── runbooks/                # Procédures opérationnelles
│   │   ├── incident.md               ← Art. 33-34
│   │   ├── backup-policy.md          ← Art. 32
│   │   └── bootstrap.md              ← Sécurité opérationnelle
│   ├── audit/                   # Cartographie preuves
│   │   └── evidence.md               ← Ce document
│   └── templates/               # Templates notification CNIL/users
├── src/                         # Implémentations techniques
├── tests/                       # Tests automatisés (dont RGPD)
├── scripts/audit/               # Scripts de collecte de preuves
│   ├── collect-evidence.ts          ← Collecteur principal
│   ├── scan-secrets.sh              ← Scan secrets (LOT 1.0)
│   ├── run-rgpd-tests.sh            ← Tests RGPD (LOT 7.1)
│   └── generate-audit-report.ts     ← Rapport consolidé
└── audit-artifacts/             # Artefacts générés (gitignored)
    ├── test-report.html
    ├── scan-secrets-result.txt
    ├── compliance-checklist.md
    └── evidence-bundle-YYYY-MM-DD.zip
```

### 2.2 Types de preuves

| Type | Description | Localisation | Fréquence génération |
|------|-------------|--------------|---------------------|
| **Documentation** | Registres, DPIA, runbooks | `docs/rgpd/`, `docs/runbooks/` | Continue (versionnée Git) |
| **Code source** | Implémentations techniques | `src/`, `tests/` | Continue (versionnée Git) |
| **Tests automatisés** | Rapports CI/CD | `audit-artifacts/test-report.html` | Chaque commit (CI/CD) |
| **Scans sécurité** | Secrets, vulnérabilités | `audit-artifacts/scan-*.txt` | Quotidien (CI/CD) |
| **Logs audit** | Événements RGPD | Base de données `audit_events` | Temps réel (3 ans rétention) |
| **Registre violations** | Incidents RGPD (Art. 33.5) | Base de données `data_breaches` | À la demande (incidents) |

---

## 3. Preuves par article RGPD

### Art. 5 — Principes relatifs au traitement

| Principe | Article | Preuves techniques | Preuves documentaires |
|----------|---------|-------------------|----------------------|
| **Licéité** | 5.1.a | Table `consents` (opt-in), tests `consent-enforcement.test.ts` | [registre-traitements.md](../rgpd/registre-traitements.md) (bases légales) |
| **Limitation des finalités** | 5.1.b | Enum `purpose` (résumé, classification, extraction), tests isolation | [registre-traitements.md](../rgpd/registre-traitements.md) (5 traitements) |
| **Minimisation** | 5.1.c | Classification P0-P3, pas de stockage prompts (tests `no-storage.test.ts`) | [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) |
| **Exactitude** | 5.1.d | Endpoints PATCH `/api/users/:id` (rectification) | [registre-traitements.md](../rgpd/registre-traitements.md) (droits) |
| **Limitation conservation** | 5.1.e | Job purge automatique (`purge.ts`), tests `purge.test.ts` | [registre-traitements.md](../rgpd/registre-traitements.md) (durées conservation) |
| **Intégrité et confidentialité** | 5.1.f | Chiffrement AES-256-GCM, TLS 1.3, tests `encryption.test.ts` | [BOUNDARIES.md](../architecture/BOUNDARIES.md), [dpia.md](../rgpd/dpia.md) |
| **Accountability** | 5.2 | Ce document + artefacts audit (`audit-artifacts/`) | [registre-traitements.md](../rgpd/registre-traitements.md), [dpia.md](../rgpd/dpia.md) |

#### Artefacts générés

- `audit-artifacts/data-minimization-report.json` (classification P0-P3 par table)
- `audit-artifacts/retention-policy-status.json` (données purgées vs policy)
- `audit-artifacts/encryption-status.json` (chiffrement repos/transit)

---

### Art. 6 — Licéité du traitement

| Base légale | Article | Preuves techniques | Preuves documentaires |
|-------------|---------|-------------------|----------------------|
| **Consentement** | 6.1.a | Table `consents`, tests `consent.test.ts` (opt-in explicite) | [registre-traitements.md](../rgpd/registre-traitements.md) (traitement 2, 3) |
| **Contrat** | 6.1.b | CGU acceptées (`user_cgu_acceptances`), tests `cgu-acceptance.test.ts` | [docs/legal/CGU.md](../legal/CGU.md) (EPIC 12, LOT 12.1) |
| **Obligation légale** | 6.1.c | Audit trail (Art. 30, 33), registre violations | [registre-traitements.md](../rgpd/registre-traitements.md) (traitement 4, 5) |
| **Intérêt légitime** | 6.1.f | Logs sécurité (prévention fraude), tests `audit-safe.test.ts` | [dpia.md](../rgpd/dpia.md) (test proportionnalité) |

#### Artefacts générés

- `audit-artifacts/consents-summary.json` (statistiques consentements par purpose)
- `audit-artifacts/cgu-acceptances.json` (% users ayant accepté CGU)

---

### Art. 7 — Conditions du consentement

| Exigence | Article | Preuves techniques | Preuves documentaires |
|----------|---------|-------------------|----------------------|
| **Démontrable** | 7.1 | Table `consents` (granted_at, consent_version), audit events | [registre-traitements.md](../rgpd/registre-traitements.md) (traitement 3) |
| **Clair et distinct** | 7.2 | Popup consentement (UI), pas de pré-cochage (tests E2E) | Screenshots UI (`audit-artifacts/screenshots/consent-popup.png`) |
| **Retrait facile** | 7.3 | Endpoint DELETE `/api/consents/:id`, tests `consent-revocation.test.ts` | [registre-traitements.md](../rgpd/registre-traitements.md) (droits) |

#### Artefacts générés

- `audit-artifacts/consent-popup-screenshot.png` (preuve UI consentement)
- `audit-artifacts/consent-revocations.json` (statistiques révocations)

---

### Art. 13-14 — Information des personnes

| Obligation | Article | Preuves techniques | Preuves documentaires |
|------------|---------|-------------------|----------------------|
| **Identité responsable** | 13.1.a | Page `/legal/privacy-policy` (SSG Next.js) | [POLITIQUE_CONFIDENTIALITE.md](../legal/POLITIQUE_CONFIDENTIALITE.md) (EPIC 12, LOT 12.0) |
| **Finalités et bases légales** | 13.1.c | Registre traitements accessible | [registre-traitements.md](../rgpd/registre-traitements.md) |
| **Durées de conservation** | 13.2.a | Retention policy documentée | [registre-traitements.md](../rgpd/registre-traitements.md) (5 traitements) |
| **Droits des personnes** | 13.2.b | Page `/legal/rgpd-info` (liens droits) | [docs/legal/rgpd-info.md](../legal/rgpd-info.md) (EPIC 12, LOT 12.2) |
| **Droit réclamation** | 13.2.d | Lien CNIL + contact DPO | [docs/legal/rgpd-info.md](../legal/rgpd-info.md) |
| **Décisions automatisées** | 13.2.f | Mention IA + droit révision humaine | [dpia.md](../rgpd/dpia.md), [docs/legal/rgpd-info.md](../legal/rgpd-info.md) |

#### Artefacts générés

- `audit-artifacts/privacy-policy.html` (snapshot page SSG)
- `audit-artifacts/rgpd-info.html` (snapshot page informations RGPD)

---

### Art. 15-22 — Droits des personnes

| Droit | Article | Preuves techniques | Preuves documentaires |
|-------|---------|-------------------|----------------------|
| **Accès** | 15 | Endpoint GET `/api/rgpd/export`, tests `export.test.ts` | [registre-traitements.md](../rgpd/registre-traitements.md) (traitement 4) |
| **Rectification** | 16 | Endpoint PATCH `/api/users/:id`, tests `user-update.test.ts` | [registre-traitements.md](../rgpd/registre-traitements.md) (droits) |
| **Effacement** | 17 | Endpoint DELETE `/api/rgpd/delete`, tests `delete.test.ts`, `purge.test.ts` | [registre-traitements.md](../rgpd/registre-traitements.md) (traitement 4), [LOT 5.2](../../../TASKS.md#lot-52) |
| **Limitation** | 18 | Flag `users.data_suspended`, tests `data-suspension.test.ts` | [docs/legal/rgpd-info.md](../legal/rgpd-info.md) (EPIC 12, LOT 12.6) |
| **Portabilité** | 20 | Endpoint GET `/api/rgpd/export` (JSON structuré), tests `export.test.ts` | [registre-traitements.md](../rgpd/registre-traitements.md) (traitement 4) |
| **Opposition** | 21 | Formulaire contact DPO, table `user_disputes` | [docs/legal/rgpd-info.md](../legal/rgpd-info.md) (EPIC 12, LOT 12.6) |
| **Révision humaine** | 22 | Formulaire "Contester résultat IA", workflow admin | [dpia.md](../rgpd/dpia.md) (mesures atténuation), [docs/legal/rgpd-info.md](../legal/rgpd-info.md) |

#### Artefacts générés

- `audit-artifacts/export-bundle-sample.json` (exemple bundle export anonymisé)
- `audit-artifacts/delete-requests-summary.json` (statistiques effacements)
- `audit-artifacts/data-suspension-tests.log` (logs tests suspension)

---

### Art. 24-25 — Responsabilité du responsable de traitement

| Obligation | Article | Preuves techniques | Preuves documentaires |
|------------|---------|-------------------|----------------------|
| **Mesures appropriées** | 24.1 | Chiffrement, isolation tenant, Gateway LLM, tests automatisés | [dpia.md](../rgpd/dpia.md) (mesures atténuation), [BOUNDARIES.md](../architecture/BOUNDARIES.md) |
| **Accountability** | 24.2 | Artefacts audit (`audit-artifacts/`), logs audit trail | Ce document, [registre-traitements.md](../rgpd/registre-traitements.md) |
| **Privacy by design** | 25.1 | Architecture séparation couches, Gateway LLM obligatoire | [BOUNDARIES.md](../architecture/BOUNDARIES.md), [LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md) |
| **Privacy by default** | 25.2 | Pas de stockage prompts par défaut, minimisation P3 interdite | [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md), tests `no-storage.test.ts` |

#### Artefacts générés

- `audit-artifacts/architecture-diagram.png` (schéma séparation couches)
- `audit-artifacts/gateway-llm-enforcement.log` (preuves bypass impossible)

---

### Art. 28 — Sous-traitant

| Obligation | Article | Preuves techniques | Preuves documentaires |
|------------|---------|-------------------|----------------------|
| **Contrat DPA** | 28.3 | Contrats signés (hébergeur, LLM provider) | [dpia.md](../rgpd/dpia.md) (section 1.4 acteurs), `contrats/DPA_*.pdf` (hors repo) |
| **Garanties sécurité** | 28.3.c | Chiffrement, isolation, audit trail | [registre-traitements.md](../rgpd/registre-traitements.md) (sécurité globale) |

#### Artefacts générés

- `audit-artifacts/subprocessors-list.json` (liste sous-traitants + garanties)

---

### Art. 30 — Registre des traitements

| Obligation | Article | Preuves techniques | Preuves documentaires |
|------------|---------|-------------------|----------------------|
| **Registre à jour** | 30.1 | Table `data_processing_registry` (optionnel, interface Back Office) | [registre-traitements.md](../rgpd/registre-traitements.md) |
| **Accessibilité CNIL** | 30.4 | Export PDF/Markdown du registre | `audit-artifacts/registre-traitements.pdf` |

#### Artefacts générés

- `audit-artifacts/registre-traitements.pdf` (export pour CNIL)

---

### Art. 32 — Sécurité du traitement

| Mesure | Article | Preuves techniques | Preuves documentaires |
|--------|---------|-------------------|----------------------|
| **Chiffrement** | 32.1.a | AES-256-GCM (repos), TLS 1.3 (transit), tests `encryption.test.ts` | [registre-traitements.md](../rgpd/registre-traitements.md) (sécurité globale) |
| **Confidentialité** | 32.1.b | Isolation tenant, RBAC/ABAC, tests `cross-tenant.test.ts` | [BOUNDARIES.md](../architecture/BOUNDARIES.md) |
| **Disponibilité** | 32.1.b | Backups quotidiens, tests restore, failover DB (< 30s) | [backup-policy.md](../runbooks/backup-policy.md), [LOT 13.2](../../../TASKS.md#lot-132) |
| **Résilience** | 32.1.b | Tests chaos engineering (kill pod, DB failure) | `audit-artifacts/chaos-report.json` (EPIC 13, LOT 13.2) |
| **Tests réguliers** | 32.1.d | CI/CD quotidien, pentests annuels | `audit-artifacts/pentest-report.pdf` (EPIC 13, LOT 13.1) |

#### Artefacts générés

- `audit-artifacts/encryption-status.json` (audit chiffrement repos/transit)
- `audit-artifacts/backup-restore-tests.log` (tests restore trimestriels)
- `audit-artifacts/pentest-report.pdf` (rapport pentest annuel)
- `audit-artifacts/chaos-report.json` (résultats tests résilience)

---

### Art. 33-34 — Violation de données

| Obligation | Article | Preuves techniques | Preuves documentaires |
|------------|---------|-------------------|----------------------|
| **Registre violations** | 33.5 | Table `data_breaches`, interface Back Office | [incident.md](../runbooks/incident.md) |
| **Notification CNIL** | 33.1 | Templates notification, accusés réception CNIL | [docs/templates/NOTIFICATION_CNIL.md](../templates/NOTIFICATION_CNIL.md) |
| **Notification personnes** | 34.1 | Templates email, logs envoi | [docs/templates/NOTIFICATION_USERS.md](../templates/NOTIFICATION_USERS.md) |
| **Détection automatique** | — | Alertes monitoring (brute force, cross-tenant, export massif) | [incident.md](../runbooks/incident.md) (section 2) |

#### Artefacts générés

- `audit-artifacts/data-breaches-registry.csv` (export registre violations)
- `audit-artifacts/incident-alerts-config.yaml` (configuration alertes)

---

### Art. 35 — DPIA (Analyse d'impact)

| Obligation | Article | Preuves techniques | Preuves documentaires |
|------------|---------|-------------------|----------------------|
| **DPIA si risque élevé** | 35.1 | — | [dpia.md](../rgpd/dpia.md) (Gateway LLM) |
| **Consultation DPO** | 35.2 | Signature électronique DPO | [dpia.md](../rgpd/dpia.md) (section 6) |
| **Description traitement** | 35.7.a | Architecture Gateway LLM, flow diagrams | [dpia.md](../rgpd/dpia.md) (section 1), [LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md) |
| **Évaluation nécessité** | 35.7.b | Test proportionnalité | [dpia.md](../rgpd/dpia.md) (section 2) |
| **Évaluation risques** | 35.7.c | 5 risques évalués (hallucinations, fuite PII, biais, bypass, cross-tenant) | [dpia.md](../rgpd/dpia.md) (section 3) |
| **Mesures atténuation** | 35.7.d | Gateway LLM, pseudonymisation, consent, audit trail | [dpia.md](../rgpd/dpia.md) (section 4) |

#### Artefacts générés

- `audit-artifacts/dpia.pdf` (export DPIA pour CNIL)

---

## 4. Preuves par EPIC (implémentations techniques)

### EPIC 1 — Socle applicatif sécurisé

| LOT | Artefact technique | Tests automatisés | Documentation |
|-----|-------------------|-------------------|---------------|
| 1.0 | Scripts lint/typecheck/test, scan secrets | `tests/quality-gates.test.ts` | [TASKS.md LOT 1.0](../../../TASKS.md#lot-10) |
| 1.1 | Middleware tenant resolution, `RequestContext` | `tests/tenant/isolation.test.ts` | [TASKS.md LOT 1.1](../../../TASKS.md#lot-11) |
| 1.2 | `policyEngine`, RBAC/ABAC, middleware auth | `tests/auth/rbac.test.ts` | [TASKS.md LOT 1.2](../../../TASKS.md#lot-12) |
| 1.3 | `audit_events` table, helpers `emitAuditEvent()` | `tests/rgpd/audit-safe.test.ts` | [TASKS.md LOT 1.3](../../../TASKS.md#lot-13) |
| 1.4 | `src/ai/gateway/*`, interface `invokeLLM()` | `tests/ai/no-bypass.test.ts` | [TASKS.md LOT 1.4](../../../TASKS.md#lot-14) |
| 1.5 | CLI bootstrap plateforme, création tenants | `tests/cli/bootstrap.test.ts` | [bootstrap.md](../runbooks/bootstrap.md) |

**Artefacts générés** :
- `audit-artifacts/tenant-isolation-tests.log`
- `audit-artifacts/rbac-tests.log`
- `audit-artifacts/gateway-llm-bypass-tests.log`
- `audit-artifacts/bootstrap-trace.log`

---

### EPIC 2 — Durcissement serveur & réseau

| LOT | Artefact technique | Tests automatisés | Documentation |
|-----|-------------------|-------------------|---------------|
| 2.0 | Docs runbooks sécurité, `.env.example` | `scripts/audit/scan-secrets.sh` | [security-hardening.md](../runbooks/security-hardening.md), [backup-policy.md](../runbooks/backup-policy.md) |
| 2.1 | `docker-compose.dev.yml`, réseaux isolés | Tests manuels ports exposés | [docker-dev.md](../runbooks/docker-dev.md) |

**Artefacts générés** :
- `audit-artifacts/scan-secrets-result.txt` (0 violation)
- `audit-artifacts/docker-network-config.json`

---

### EPIC 3 — Validation IA locale (POC)

| LOT | Artefact technique | Tests automatisés | Documentation |
|-----|-------------------|-------------------|---------------|
| 3.0 | Provider IA local branché Gateway LLM | `tests/ai/no-storage.test.ts` | [TASKS.md LOT 3.0](../../../TASKS.md#lot-30) |

**Artefacts générés** :
- `audit-artifacts/llm-provider-config.json`
- `audit-artifacts/llm-no-storage-tests.log`

---

### EPIC 4 — Stockage RGPD

| LOT | Artefact technique | Tests automatisés | Documentation |
|-----|-------------------|-------------------|---------------|
| 4.0 | Migrations DB, DAL tenant-scoped | `tests/db/cross-tenant.test.ts` | [TASKS.md LOT 4.0](../../../TASKS.md#lot-40) |
| 4.1 | `RetentionPolicy`, job purge | `tests/rgpd/purge.test.ts` | [TASKS.md LOT 4.1](../../../TASKS.md#lot-41) |

**Artefacts générés** :
- `audit-artifacts/db-schema.sql` (snapshot schéma DB)
- `audit-artifacts/cross-tenant-tests.log`
- `audit-artifacts/retention-policy.json`
- `audit-artifacts/purge-tests.log`

---

### EPIC 5 — Pipeline RGPD (Droits des personnes)

| LOT | Artefact technique | Tests automatisés | Documentation |
|-----|-------------------|-------------------|---------------|
| 5.0 | Endpoints consent, enforcement Gateway | `tests/rgpd/consent-enforcement.test.ts` | [TASKS.md LOT 5.0](../../../TASKS.md#lot-50) |
| 5.1 | Endpoint export, bundle chiffré, TTL | `tests/rgpd/export.test.ts` | [TASKS.md LOT 5.1](../../../TASKS.md#lot-51) |
| 5.2 | Endpoint delete, soft delete, purge, crypto-shredding | `tests/rgpd/delete.test.ts` | [TASKS.md LOT 5.2](../../../TASKS.md#lot-52) |
| 5.3 | API Routes HTTP complètes | Tests E2E API (Postman/Jest) | [TASKS.md LOT 5.3](../../../TASKS.md#lot-53) |

**Artefacts générés** :
- `audit-artifacts/consent-tests.log`
- `audit-artifacts/export-bundle-sample.json` (anonymisé)
- `audit-artifacts/delete-purge-tests.log`
- `audit-artifacts/api-routes-tests.log`

---

### EPIC 6 — Stack Docker RGPD-ready

| LOT | Artefact technique | Tests automatisés | Documentation |
|-----|-------------------|-------------------|---------------|
| 6.0 | `docker-compose.yml` (prod), réseaux isolés | Tests manuels ports/secrets | [TASKS.md LOT 6.0](../../../TASKS.md#lot-60) |
| 6.1 | Logs structurés RGPD-safe, metrics | `tests/rgpd/no-sensitive-logs.test.ts` | [TASKS.md LOT 6.1](../../../TASKS.md#lot-61) |

**Artefacts générés** :
- `audit-artifacts/docker-compose-prod.yml` (snapshot config)
- `audit-artifacts/observability-tests.log`

---

### EPIC 7 — Kit conformité & audit

| LOT | Artefact technique | Tests automatisés | Documentation |
|-----|-------------------|-------------------|---------------|
| 7.0 | Documents RGPD (registre, DPIA, incident, evidence) | — | Ce document, [registre-traitements.md](../rgpd/registre-traitements.md), [dpia.md](../rgpd/dpia.md), [incident.md](../runbooks/incident.md) |
| 7.1 | Scripts audit, génération artefacts CI | `scripts/audit/run-rgpd-tests.sh` | [TASKS.md LOT 7.1](../../../TASKS.md#lot-71) |

**Artefacts générés** :
- `audit-artifacts/test-report.html` (rapport tests RGPD)
- `audit-artifacts/compliance-checklist.md` (DoD)
- `audit-artifacts/evidence-bundle-YYYY-MM-DD.zip` (bundle complet)

---

## 5. Scripts de collecte de preuves

### 5.1 Script principal : `collect-evidence.ts`

**Localisation** : [scripts/audit/collect-evidence.ts](../../../scripts/audit/collect-evidence.ts)

**Fonction** : Collecte automatique des artefacts audit (tests, scans, rapports).

**Exécution** :
```bash
pnpm audit:collect-evidence
```

**Artefacts générés** :
- `audit-artifacts/test-report.html` (rapport tests RGPD)
- `audit-artifacts/scan-secrets-result.txt` (scan secrets)
- `audit-artifacts/timestamp.txt` (horodatage)
- `audit-artifacts/git-commit.txt` (commit SHA)

---

### 5.2 Script scan secrets : `scan-secrets.sh`

**Localisation** : [scripts/audit/scan-secrets.sh](../../../scripts/audit/scan-secrets.sh)

**Fonction** : Détection hardcoded secrets (API keys, JWT, passwords, DB URLs).

**Exécution** :
```bash
bash scripts/audit/scan-secrets.sh
```

**Exit code** :
- `0` : OK (aucun secret détecté)
- `1` : BLOCKER (secrets détectés)

---

### 5.3 Script tests RGPD : `run-rgpd-tests.sh`

**Localisation** : [scripts/audit/run-rgpd-tests.sh](../../../scripts/audit/run-rgpd-tests.sh) (à créer, LOT 7.1)

**Fonction** : Exécution tests RGPD uniquement (tag `@rgpd`).

**Exécution** :
```bash
bash scripts/audit/run-rgpd-tests.sh
```

**Artefacts générés** :
- `audit-artifacts/rgpd-tests-report.html` (rapport dédié)
- `audit-artifacts/rgpd-tests-summary.json` (stats)

---

### 5.4 Script rapport consolidé : `generate-audit-report.ts`

**Localisation** : [scripts/audit/generate-audit-report.ts](../../../scripts/audit/generate-audit-report.ts) (à créer, LOT 7.1)

**Fonction** : Génération rapport d'audit consolidé (PDF/Markdown).

**Exécution** :
```bash
pnpm audit:generate-report
```

**Artefacts générés** :
- `audit-artifacts/audit-report-YYYY-MM-DD.md` (Markdown)
- `audit-artifacts/audit-report-YYYY-MM-DD.pdf` (PDF, optionnel)
- `audit-artifacts/compliance-checklist.md` (DoD validée)

---

## 6. CI/CD — Gates de conformité

### 6.1 Pipeline CI (GitHub Actions / GitLab CI)

**Fichier** : `.github/workflows/ci.yml` ou `.gitlab-ci.yml`

**Gates obligatoires** (bloquants) :

```yaml
stages:
  - lint
  - test
  - security
  - audit

lint:
  script:
    - pnpm lint
    - pnpm typecheck

test:
  script:
    - pnpm test
    - pnpm test:coverage

security:
  script:
    - bash scripts/audit/scan-secrets.sh  # Exit 1 si secrets
    - pnpm audit --audit-level=high       # Exit 1 si vulnérabilités

audit:
  script:
    - bash scripts/audit/run-rgpd-tests.sh  # Tests RGPD
    - pnpm audit:collect-evidence           # Génération artefacts
  artifacts:
    paths:
      - audit-artifacts/
    expire_in: 90 days
```

### 6.2 Artefacts CI conservés

| Artefact | Rétention | Usage |
|----------|-----------|-------|
| `test-report.html` | 90 jours | Preuve exécution tests RGPD |
| `scan-secrets-result.txt` | 90 jours | Preuve absence secrets |
| `coverage-report.html` | 90 jours | Couverture tests (> 80% requis) |
| `evidence-bundle-*.zip` | 3 ans | Bundle audit complet (versioned) |

---

## 7. Checklist compliance (DoD)

### 7.1 Definition of Done (DoD) — LOT complet

Pour qu'un LOT soit considéré comme **terminé et conforme**, toutes les conditions suivantes doivent être **vraies** :

- [ ] **Frontières architecture respectées** ([BOUNDARIES.md](../architecture/BOUNDARIES.md))
- [ ] **Aucun appel IA hors Gateway LLM** (tests `no-bypass.test.ts`)
- [ ] **Aucune donnée sensible logs** (tests `no-sensitive-logs.test.ts`)
- [ ] **Classification données respectée** ([DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md))
- [ ] **Tests fonctionnels passants** (`pnpm test`)
- [ ] **Tests RGPD passants** (`bash scripts/audit/run-rgpd-tests.sh`)
- [ ] **Lint + typecheck OK** (`pnpm lint && pnpm typecheck`)
- [ ] **Scan secrets OK** (`bash scripts/audit/scan-secrets.sh` → exit 0)
- [ ] **Comportement échec défini** (error handling, rollback)
- [ ] **Traçabilité RGPD minimale** (audit events, pas de contenu)

### 7.2 Checklist globale — Plateforme production-ready

- [ ] **EPIC 1-7 terminés** (backend RGPD-compliant 85%)
- [ ] **Documentation RGPD complète** (registre, DPIA, incident, evidence)
- [ ] **Scripts audit opérationnels** (collect-evidence, scan-secrets, run-rgpd-tests)
- [ ] **Artefacts versionnés** (Git + CI/CD artifacts)
- [ ] **Contrats DPA signés** (hébergeur, LLM provider)
- [ ] **Backups testés** (restore < 4h RTO, < 1h RPO)
- [ ] **Pentests réalisés** (vulnérabilités critiques/hautes corrigées)
- [ ] **Formation DPO/admins** (RGPD, consentements, incidents)
- [ ] **Runbooks opérationnels** (incident, bootstrap, backup, security)

---

## 8. Usage de cette cartographie

### 8.1 Audit CNIL

**Procédure** :
1. Générer bundle complet : `pnpm audit:generate-report`
2. Exporter artefacts : `audit-artifacts/evidence-bundle-YYYY-MM-DD.zip`
3. Fournir à la CNIL :
   - [registre-traitements.md](../rgpd/registre-traitements.md) (PDF)
   - [dpia.md](../rgpd/dpia.md) (PDF)
   - Rapport audit consolidé (`audit-report-YYYY-MM-DD.pdf`)
   - Artefacts techniques (tests, scans, logs audit)

### 8.2 Due diligence client (B2B)

**Documents à fournir** :
- [registre-traitements.md](../rgpd/registre-traitements.md)
- [dpia.md](../rgpd/dpia.md)
- [POLITIQUE_CONFIDENTIALITE.md](../legal/POLITIQUE_CONFIDENTIALITE.md)
- Contrats DPA sous-traitants
- Rapports pentests (anonymisés)
- Certificats ISO 27001/27701 (si applicable)

### 8.3 Certification ISO 27001/27701

**Preuves requises** :
- Documentation RGPD complète (ce document + registre + DPIA)
- Tests automatisés (CI/CD artifacts)
- Runbooks opérationnels (incident, backup, security)
- Registre violations (table `data_breaches`)
- Audits réguliers (pentests, DPO, externe)

---

## 9. Références

- **RGPD** : [Texte officiel](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- **CNIL Accountability** : [Guide](https://www.cnil.fr/fr/principe-daccountability)
- **Documentation technique** : [TASKS.md](../../../TASKS.md), [BOUNDARIES.md](../architecture/BOUNDARIES.md)
- **Registre des traitements** : [registre-traitements.md](../rgpd/registre-traitements.md)
- **DPIA Gateway LLM** : [dpia.md](../rgpd/dpia.md)
- **Runbook incident** : [incident.md](../runbooks/incident.md)

---

**Dernière mise à jour** : 2025-12-25
**Maintenu par** : DPO + RSSI
**Version** : 1.0
