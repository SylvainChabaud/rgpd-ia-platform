# Audit Scripts — EPIC 7, LOT 7.1

> **Objectif** : Automatiser la collecte de preuves de conformité RGPD et générer des rapports d'audit.

---

## Scripts disponibles

### 1. `scan-secrets.sh`

**Description** : Détecte les secrets hardcodés (API keys, tokens, passwords, DB URLs).

**Usage** :
```bash
bash scripts/audit/scan-secrets.sh
```

**Exit code** :
- `0` : OK (aucun secret détecté)
- `1` : BLOCKER (secrets détectés)

**Artefacts générés** :
- Aucun (output terminal uniquement)

**Patterns détectés** :
- API keys (`sk-*`, `pk-*`)
- JWT tokens (`eyJ*`)
- Passwords (`password=`, `passwd:`)
- Database URLs avec credentials
- AWS keys (`AKIA*`)
- Private keys (`-----BEGIN PRIVATE KEY-----`)

**Utilisation CI/CD** :
```yaml
security:
  script:
    - bash scripts/audit/scan-secrets.sh
  allow_failure: false
```

---

### 2. `run-rgpd-tests.sh`

**Description** : Exécute tous les tests RGPD et génère un rapport de synthèse.

**Usage** :
```bash
bash scripts/audit/run-rgpd-tests.sh
```

**Exit code** :
- `0` : Tous les tests RGPD passés
- `1` : Au moins un test RGPD échoué

**Artefacts générés** :
- `audit-artifacts/rgpd-tests.log` — Logs complets tests RGPD
- `audit-artifacts/rgpd-tests-summary.json` — Synthèse JSON (total, passed, failed, duration)
- `audit-artifacts/rgpd-tests-timestamp.txt` — Horodatage exécution
- `audit-artifacts/git-commit.txt` — Commit SHA (traçabilité)
- `audit-artifacts/coverage-rgpd/` — Rapport de couverture tests RGPD

**Tests exécutés** :
- `tests/rgpd/**/*.test.ts` — Tous les tests dans le dossier `rgpd/` (actuellement 19 tests)

**Utilisation CI/CD** :
```yaml
test:rgpd:
  script:
    - bash scripts/audit/run-rgpd-tests.sh
  artifacts:
    paths:
      - audit-artifacts/
    expire_in: 90 days
```

---

### 3. `collect-evidence.ts`

**Description** : Collecte automatiquement tous les artefacts d'audit (tests, scans, lint, typecheck).

**Usage** :
```bash
pnpm audit:collect
# ou
tsx scripts/audit/collect-evidence.ts
```

**Exit code** :
- `0` : Tous les checks passés
- `1` : Au moins un check échoué

**Artefacts générés** :
- `audit-artifacts/timestamp.txt` — Horodatage collecte
- `audit-artifacts/git-commit.txt` — Commit SHA
- `audit-artifacts/git-branch.txt` — Branche Git
- `audit-artifacts/metadata.json` — Métadonnées complètes (project, git, evidence)
- `audit-artifacts/compliance-checklist.md` — Checklist DoD
- `audit-artifacts/tests.log` — Logs tests complets
- `audit-artifacts/rgpd-tests-runner.log` — Logs tests RGPD
- `audit-artifacts/scan-secrets-result.txt` — Résultat scan secrets
- `audit-artifacts/lint-result.txt` — Résultat lint
- `audit-artifacts/typecheck-result.txt` — Résultat typecheck
- `audit-artifacts/coverage/` — Rapport de couverture

**Checks exécutés** :
1. Full test suite (`pnpm test --coverage`)
2. RGPD tests (`bash scripts/audit/run-rgpd-tests.sh`)
3. Secrets scan (`bash scripts/audit/scan-secrets.sh`)
4. Linter (`pnpm lint`)
5. Type checker (`pnpm typecheck`)
6. Metadata collection

**Utilisation CI/CD** :
```yaml
audit:
  script:
    - pnpm audit:collect
  artifacts:
    paths:
      - audit-artifacts/
    expire_in: 90 days
```

---

### 4. `generate-audit-report.ts`

**Description** : Génère un rapport d'audit consolidé à partir des preuves collectées.

**Usage** :
```bash
pnpm audit:report
# ou
tsx scripts/audit/generate-audit-report.ts
```

**Prérequis** : `pnpm audit:collect` doit avoir été exécuté au préalable.

**Exit code** :
- `0` : Compliance score = 100% (ou ≥ 80% si warnings acceptés)
- `1` : Compliance score < 80% (action requise)

**Artefacts générés** :
- `audit-artifacts/audit-report-YYYY-MM-DD.md` — Rapport consolidé Markdown

**Contenu du rapport** :
- Executive Summary (compliance status, score, findings)
- Automated Evidence Checks (tableau statuts)
- RGPD Compliance Coverage (articles RGPD, features)
- Architecture Compliance (boundaries, security)
- Documentation RGPD (registre, DPIA, runbooks)
- Recommendations (critical, high, medium, low)
- Audit Trail (artefacts, manifest)
- Conclusion

**Utilisation CI/CD** :
```yaml
audit:report:
  script:
    - pnpm audit:collect
    - pnpm audit:report
  artifacts:
    paths:
      - audit-artifacts/audit-report-*.md
    expire_in: 3 years  # Conservation 3 ans (preuve RGPD)
```

---

## Workflows complets

### Workflow local (développeur)

```bash
# 1. Scan secrets (rapide, avant commit)
pnpm audit:secrets

# 2. Tests RGPD (avant PR)
pnpm audit:rgpd-tests

# 3. Collecte complète + rapport (avant release)
pnpm audit:full
```

### Workflow CI/CD

```bash
# Pipeline CI/CD complet
pnpm lint
pnpm typecheck
pnpm test
pnpm audit:collect
pnpm audit:report
```

### Workflow audit CNIL (préparation)

```bash
# Génération bundle audit complet
pnpm audit:full

# Artefacts à fournir :
# - audit-artifacts/audit-report-YYYY-MM-DD.md
# - audit-artifacts/compliance-checklist.md
# - audit-artifacts/metadata.json
# - docs/rgpd/registre-traitements.md
# - docs/rgpd/dpia.md
# - docs/runbooks/incident.md
# - docs/implementation/LOT9.md  ← Nouveau (EPIC 9)
# - .github/workflows/security-scan.yml  ← Nouveau (EPIC 9.1)
# - scripts/chaos/run-chaos-tests.sh  ← Nouveau (EPIC 9.2)
```

---

## Commandes npm

| Commande | Description | Script |
|----------|-------------|--------|
| `pnpm audit:secrets` | Scan secrets | `scan-secrets.sh` |
| `pnpm audit:rgpd-tests` | Tests RGPD | `run-rgpd-tests.sh` |
| `pnpm audit:collect` | Collecte preuves | `collect-evidence.ts` |
| `pnpm audit:report` | Rapport consolidé | `generate-audit-report.ts` |
| `pnpm audit:full` | Collecte + rapport | `collect-evidence.ts` + `generate-audit-report.ts` |

---

## Artefacts générés (structure)

```
audit-artifacts/
├── timestamp.txt                    # Horodatage collecte
├── git-commit.txt                   # Commit SHA (traçabilité)
├── git-branch.txt                   # Branche Git
├── metadata.json                    # Métadonnées complètes
├── compliance-checklist.md          # Checklist DoD
├── audit-report-YYYY-MM-DD.md       # Rapport consolidé
├── tests.log                        # Logs tests complets
├── rgpd-tests.log                   # Logs tests RGPD
├── rgpd-tests-runner.log            # Logs runner tests RGPD
├── rgpd-tests-summary.json          # Synthèse tests RGPD
├── rgpd-tests-timestamp.txt         # Horodatage tests RGPD
├── scan-secrets-result.txt          # Résultat scan secrets
├── lint-result.txt                  # Résultat lint
├── typecheck-result.txt             # Résultat typecheck
├── coverage/                        # Rapport couverture tests complets
│   ├── lcov-report/
│   └── coverage-summary.json
└── coverage-rgpd/                   # Rapport couverture tests RGPD
    ├── lcov-report/
    └── coverage-summary.json
```

---

## Conservation des artefacts

### Local (développeur)

- `audit-artifacts/` est **gitignored** (ne pas commit)
- Générer avant chaque PR ou release
- Archiver manuellement si nécessaire

### CI/CD

- Conserver **90 jours** (artefacts CI)
- Conserver **3 ans** pour rapports d'audit (preuve RGPD)

### Production (audit CNIL)

- Exporter bundle complet (ZIP)
- Stocker de manière sécurisée (chiffré, backup)
- Conservation : **3 ans minimum** (obligation légale Art. 30, 33.5)

---

## Intégration CI/CD (exemples)

### GitHub Actions

```yaml
# .github/workflows/audit.yml
name: RGPD Audit

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 2 * * *'  # Quotidien à 2h du matin

jobs:
  audit:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Run full audit
        run: pnpm audit:full

      - name: Upload audit artifacts
        uses: actions/upload-artifact@v4
        with:
          name: audit-artifacts-${{ github.sha }}
          path: audit-artifacts/
          retention-days: 90

      - name: Archive audit report (3 years)
        if: github.ref == 'refs/heads/main'
        uses: actions/upload-artifact@v4
        with:
          name: audit-report-${{ github.run_number }}
          path: audit-artifacts/audit-report-*.md
          retention-days: 1095  # 3 ans
```

### GitLab CI

```yaml
# .gitlab-ci.yml
audit:
  stage: test
  script:
    - pnpm install
    - pnpm audit:full
  artifacts:
    paths:
      - audit-artifacts/
    expire_in: 90 days
  only:
    - main
    - develop
    - merge_requests

audit:report:
  stage: deploy
  script:
    - pnpm audit:full
  artifacts:
    paths:
      - audit-artifacts/audit-report-*.md
    expire_in: 3 years  # Conservation RGPD
  only:
    - main
  when: on_success
```

---

## Dépannage

### Erreur "No RGPD tests found"

**Symptôme** :
```
⚠️  WARNING: No RGPD tests found in tests/rgpd/
```

**Solution** :
- C'est acceptable si EPIC 7 est en cours d'implémentation
- Un placeholder report est généré automatiquement
- Exit code = 0 (pas bloquant)

### Erreur "scan-secrets.sh: command not found"

**Symptôme** :
```
bash: scripts/audit/scan-secrets.sh: No such file or directory
```

**Solution** :
- Vérifier que le script existe : `ls scripts/audit/scan-secrets.sh`
- Vérifier permissions : `chmod +x scripts/audit/scan-secrets.sh`
- Sur Windows, utiliser Git Bash ou WSL

### Erreur "metadata.json not found"

**Symptôme** :
```
❌ ERROR: No evidence metadata found
Please run 'pnpm audit:collect' first
```

**Solution** :
- Exécuter `pnpm audit:collect` avant `pnpm audit:report`
- Ou utiliser `pnpm audit:full` (exécute les deux)

---

## Références

- **EPIC 7** : [TASKS.md](../../TASKS.md#epic-7)
- **LOT 7.1** : [TASKS.md](../../TASKS.md#lot-71)
- **Evidence cartography** : [docs/audit/evidence.md](../../docs/audit/evidence.md)
- **RGPD Testing** : [docs/testing/RGPD_TESTING.md](../../docs/testing/RGPD_TESTING.md)
- **Registre des traitements** : [docs/rgpd/registre-traitements.md](../../docs/rgpd/registre-traitements.md)
