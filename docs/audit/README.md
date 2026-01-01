# Documentation d'Audit — RGPD IA Platform

> **Cartographie complète des preuves et rapports d'audit** permettant de démontrer la conformité RGPD et la qualité du code source.

**Dernière mise à jour** : 2026-01-01  
**Maintenu par** : DPO + RSSI + Équipe développement

---

## 📁 Documents présents

### 1. `evidence.md` — Cartographie des preuves

**Description** : Référence complète mappant chaque article RGPD à ses **preuves techniques et documentaires** (code source, tests, configurations).

**Usage** :
- ✅ **Audit CNIL** — Répondre aux demandes d'information
- ✅ **Due diligence clients** — Prouver la conformité
- ✅ **Certification ISO 27001/27701** — Préparation audit
- ✅ **Vérification interne** — Checker implication technique d'un article RGPD

**Contenu** :
- Structure des artefacts d'audit (où sont les preuves ?)
- Tableau Art. 5-37 RGPD → preuves (code + tests + docs)
- Preuves documentaires vs techniques
- Preuves par type (code source, tests, logs, configurations)

**Qui consulte** : 🔴 DPO, RSSI, Équipe conformité | 🟡 Développeurs (pour vérifier implication technique)

**Fréquence de consultation** : À la demande (audit) ou chaque sprint pour vérifier couverts

**Lien vers** : [evidence.md](evidence.md)

---

### 2. `AUDIT_EPICS_1_8_FINAL_REPORT.md` — Rapport d'audit technique final

**Description** : Rapport complet d'audit des **EPICs 1-8** validant la robustesse, la conformité RGPD, la couverture de tests (≥80%), et la qualité du code avant démarrage EPICs 9-13.

**Usage** :
- ✅ **Snapshot de conformité** — État de référence avant EPICs 9-13
- ✅ **Handoff entre équipes** — Base pour planifier EPICs suivantes
- ✅ **Preuve d'audit** — Archivé comme preuve pour conformité RGPD (Art. 5.2 accountability)
- ✅ **Reference technique** — Vérifier détails de conformité par article RGPD

**Contenu** :
- Résumé exécutif (verdicts globaux)
- Couverture de tests (Jest: lines, statements, functions, branches)
- Couverture RGPD (40+ articles, 98% tests passants)
- Analyses détaillées par EPIC (1-8)
- Points forts et d'amélioration
- Recommandations avant production

**Qui consulte** : 🔴 DPO, Product, DevOps | 🟡 Architectes, Lead devs

**Fréquence de mise à jour** : **À chaque release majeure ou avant changement stratégique** (actuellement 2026-01-01)

**Lien vers** : [AUDIT_EPICS_1_8_FINAL_REPORT.md](AUDIT_EPICS_1_8_FINAL_REPORT.md)

---

### 3. `RAPPORT_CONFORMITE_RGPD_EPICs_1-8.md` — Rapport de conformité RGPD

**Description** : Rapport exécutif de conformité RGPD pour EPICs 1-8 (synthèse plus courte du rapport technique).

**Status** : ⚠️ **ARCHIVÉ** (redondant avec AUDIT_EPICS_1_8_FINAL_REPORT.md)

**Raison** : Contient les mêmes informations que AUDIT_EPICS..., date antérieure (2025-12-30 vs 2026-01-01)

**Remplacement** : Utiliser `AUDIT_EPICS_1_8_FINAL_REPORT.md` à la place

---

## 🔄 Flux de génération des preuves

### Comment sont générées les preuves ?

```
Commits Git
    ↓
[CI/CD] pnpm lint, typecheck, test
    ↓
[Scripts audit] scripts/audit/collect-evidence.ts
    ├── pnpm test --coverage
    ├── pnpm audit:secrets
    ├── pnpm audit:rgpd-tests
    └── Collecte métadonnées Git
    ↓
audit-artifacts/ (Git-ignored)
    ├── timestamp.txt
    ├── git-commit.txt
    ├── metadata.json
    ├── coverage/
    └── ...
    ↓
[Génération rapport] generate-audit-report.ts
    ↓
audit-report-YYYY-MM-DD.md (archivé long terme)
```

**Scripts de collecte** : [scripts/audit/README.md](../../scripts/audit/README.md)

---

## 📊 Matrice de consultation

| Profil | Qui ? | Document à consulter | Quand ? | Action |
|--------|-------|----------------------|---------|--------|
| **DPO / Conformité** | Responsable légal | `AUDIT_EPICS_1_8_FINAL_REPORT.md` + `evidence.md` | Avant audit CNIL / trimestriel | Valider conformité |
| **RSSI / Sécurité** | Responsable sécurité | `AUDIT_EPICS_1_8_FINAL_REPORT.md` (couverture tests) | Avant production | Valider qualité code |
| **Product / Business** | PM, Director | `AUDIT_EPICS_1_8_FINAL_REPORT.md` (résumé exécutif) | Avant release | Go/No-go production |
| **Développeur** | Dev, Tech Lead | `evidence.md` + Code source + Tests | Sprint | Checker implication RGPD |
| **Architecte** | Solution architect | `evidence.md` (architecture) + Code | Design review | Checker boundaries |
| **Auditeur CNIL** | CNIL | `evidence.md` + `AUDIT_EPICS_1_8_FINAL_REPORT.md` | Sur demande | Répondre audit |

---

## 🎯 Lien avec docs/rgpd

| Document docs/audit | Document docs/rgpd | Relation |
|---------------------|-------------------|----------|
| `evidence.md` | `RGPD_MATRICE_CONFORMITE.md` | 🔗 **Complément** — evidence = preuves techniques; MATRICE = tableau article RGPD |
| `AUDIT_EPICS_1_8_FINAL_REPORT.md` | `registre-traitements.md` | 🔗 **Référence** — Rapport audit valide le registre |
| `AUDIT_EPICS_1_8_FINAL_REPORT.md` | `dpia.md` | 🔗 **Support** — Rapport audit contient évaluation risques (DPIA) |

---

## ✅ Checklist avant audit CNIL

- [ ] Consulter `evidence.md` pour vérifier couverture articles RGPD
- [ ] Lire `AUDIT_EPICS_1_8_FINAL_REPORT.md` (résumé exécutif)
- [ ] Vérifier dernière date mise à jour (doit être ≤ 3 mois)
- [ ] Confirmer couverture tests ≥ 80% (voir rapport)
- [ ] Valider compliance score ≥ 80% (voir rapport)
- [ ] Vérifier articlesbloquants corrigés (voir recommandations)
- [ ] Préparer bundle complet : `evidence.md` + `AUDIT_EPICS_1_8_FINAL_REPORT.md` + docs/rgpd

---

## 🔗 Références

| Document | Description |
|----------|-------------|
| [evidence.md](evidence.md) | Cartographie complète preuves RGPD |
| [AUDIT_EPICS_1_8_FINAL_REPORT.md](AUDIT_EPICS_1_8_FINAL_REPORT.md) | Rapport audit complet EPICs 1-8 |
| [docs/rgpd/README.md](../rgpd/README.md) | Documentation RGPD (registre, DPIA, matrice) |
| [scripts/audit/README.md](../../scripts/audit/README.md) | Scripts de collecte de preuves d'audit |
| [docs/runbooks/CNIL_COOPERATION.md](../runbooks/CNIL_COOPERATION.md) | Procédure coopération CNIL (Art. 31) |
