# LOT 4.1 — Rétention & minimisation (policy + purge job) — Documentation d'implémentation

> **Statut** : ✅ **TERMINÉ**
> **Date** : 2025-12-25
> **EPIC couverts** : EPIC 4 (rétention), EPIC 5 (préparation effacement)

---

## 1. Objectifs réalisés

### 1.1 Politique de rétention documentée

✅ **RetentionPolicy** (src/domain/retention/RetentionPolicy.ts) :
- Périodes de rétention par type de données (basé sur DATA_CLASSIFICATION.md)
- Validation business rules (max/min retention)
- Configuration par défaut + extensible par tenant (future)

**Périodes de rétention** :
- **P1 (ai_jobs metadata)** : 90 jours max
- **P2 (consents)** : durée de vie compte (pas d'auto-purge)
- **P1 (audit_events)** : 3 ans (minimum légal : 1 an)
- **P1 (technical logs)** : 30 jours

### 1.2 Job de purge idempotent

✅ **Purge job** (src/app/jobs/purge.ts) :
- Purge automatique des AI jobs > 90 jours
- Idempotent (safe to run multiple times)
- Tenant-scoped (isolation stricte)
- Dry-run mode (preview sans suppression)
- Logs RGPD-safe (P1 uniquement : counts, no content)

### 1.3 CLI pour exécution manuelle

✅ **Scripts CLI** (scripts/purge.ts) :
```bash
npm run purge              # Purge complète (tous les tenants)
npm run purge:dry-run      # Preview (pas de suppression)
npm run purge:tenant <id>  # Purge un seul tenant
```

### 1.4 Tests RGPD obligatoires

✅ **Tests purge** (tests/purge.lot4.test.ts) :
- 10 tests bloquants sur DB réelle
- Validation idempotence
- Validation respect retention policy
- Validation isolation tenant
- Validation dry-run mode

---

## 2. Classification des données et rétention (conformité DATA_CLASSIFICATION.md)

### Politique de rétention par classe

| Classe | Type de donnée | Rétention | Auto-purge | Justification |
|--------|---------------|-----------|------------|---------------|
| **P1** | ai_jobs metadata | 90 jours max | ✅ OUI | Minimisation RGPD (technique uniquement) |
| **P2** | consents | Durée vie compte | ❌ NON | Preuve légale requise |
| **P1** | audit_events | 3 ans | ❌ NON | Obligation légale |
| **P1** | technical_logs | 30 jours | ✅ OUI (futur) | Debugging, pas de PII |

### Règles RGPD critiques

✅ **Minimisation** : purge automatique des données P1 non nécessaires
✅ **Consents protégés** : aucune purge automatique (preuve RGPD)
✅ **Audit trails préservés** : retention minimale légale (3 ans)
✅ **Tenant isolation** : purge respecte les frontières tenants

---

## 3. Artefacts créés

### 3.1 Domaine (retention policy)

| Fichier | Description |
|---------|-------------|
| [src/domain/retention/RetentionPolicy.ts](../../src/domain/retention/RetentionPolicy.ts) | Politique rétention + validation + calcul cutoff dates |

### 3.2 Application (purge job)

| Fichier | Description |
|---------|-------------|
| [src/app/jobs/purge.ts](../../src/app/jobs/purge.ts) | Job purge idempotent (AI jobs, futur: autres types) |

### 3.3 Scripts CLI

| Fichier | Description |
|---------|-------------|
| [scripts/purge.ts](../../scripts/purge.ts) | CLI exécution purge (full / dry-run / single tenant) |

### 3.4 Tests

| Fichier | Description | Tests |
|---------|-------------|-------|
| [tests/purge.lot4.test.ts](../../tests/purge.lot4.test.ts) | Tests purge + retention policy | 10 tests bloquants |

### 3.5 Configuration

| Fichier | Modification |
|---------|-------------|
| [package.json](../../package.json) | Scripts: purge, purge:dry-run, purge:tenant |

---

## 4. Validation acceptance criteria (TASKS.md LOT 4.1)

| Critère | Statut | Validation |
|---------|--------|------------|
| Purge idempotente | ✅ VALIDÉ | Tests: run multiple times → 0 purged after first |
| Purge ne supprime pas audit trails | ✅ VALIDÉ | audit_events NOT purged (retention 3 years) |
| Purge n'empêche pas export/effacement | ✅ VALIDÉ | consents NOT purged (account lifetime) |
| Purge respecte retention policy | ✅ VALIDÉ | Tests: only data > 90 days purged |
| Tests purge idempotente | ✅ VALIDÉ | [purge.lot4.test.ts](../../tests/purge.lot4.test.ts) |
| Tests purge respecte policy | ✅ VALIDÉ | [purge.lot4.test.ts](../../tests/purge.lot4.test.ts) |

---

## 5. Definition of Done (CLAUDE.md §7)

- [x] Les frontières d'architecture sont respectées
- [x] Aucun appel IA hors Gateway LLM (N/A pour LOT 4.1)
- [x] Aucune donnée sensible en clair dans les logs (P1 uniquement)
- [x] La classification des données est respectée (P1/P2)
- [x] Les tests fonctionnels et RGPD sont passants (10 tests)
- [x] Le comportement en cas d'échec est défini et sécurisé
- [x] La fonctionnalité est validée fonctionnellement
- [x] La traçabilité RGPD minimale est assurée

---

## 6. Commandes disponibles

### Exécuter purge (dry-run recommandé en premier)

```bash
# Preview purge (no deletion)
npm run purge:dry-run

# Full purge (all tenants)
npm run purge

# Purge single tenant
npm run purge:tenant <tenant-id>
```

### Exécuter tests LOT 4 (4.0 + 4.1)

```bash
npm run test:lot4
```

### Vérification types

```bash
npm run typecheck
```

---

## 7. Architecture purge job

### Flow purge idempotent

```typescript
// 1. Validate retention policy (business rules)
validateRetentionPolicy(policy);

// 2. Calculate cutoff date (data older than this → purge)
const cutoff = calculateCutoffDate(policy.aiJobsRetentionDays);

// 3. Purge per tenant (isolation)
for (const tenant of tenants) {
  const purged = await purgeAiJobs(tenant.id, policy, dryRun);
  totalPurged += purged;
}

// 4. Log results (P1 only: counts, no content)
console.log({ aiJobsPurged: totalPurged, dryRun, timestamp });
```

### Garanties RGPD

✅ **Tenant isolation** : `WHERE tenant_id = $1` systématique
✅ **Idempotence** : DELETE multiple times → same result
✅ **Dry-run safe** : COUNT only, no DELETE
✅ **Logs RGPD-safe** : P1 counts only, no identifying data

---

## 8. Retention policy validation (business rules)

### Contraintes validées

```typescript
// BLOCKER: AI jobs retention ≤ 90 days
if (policy.aiJobsRetentionDays > 90) {
  throw new Error("AI jobs retention exceeds maximum allowed");
}

// BLOCKER: Audit retention ≥ 1 year (legal minimum)
if (policy.auditEventsRetentionDays < 365) {
  throw new Error("Audit events retention below legal minimum");
}

// BLOCKER: Consents NO auto-purge (RGPD proof required)
if (policy.consentsRetentionDays !== null) {
  throw new Error("Consents auto-purge forbidden");
}
```

---

## 9. Purge SQL queries (tenant-scoped)

### AI jobs purge

```sql
DELETE FROM ai_jobs
WHERE tenant_id = $1
  AND created_at < $2;  -- cutoff date
```

### Dry-run (preview only)

```sql
SELECT COUNT(*) as count
FROM ai_jobs
WHERE tenant_id = $1
  AND created_at < $2;
```

**Garanties** :
- ✅ Tenant isolation (`tenant_id = $1`)
- ✅ Retention respected (`created_at < cutoff`)
- ✅ No cascade issues (ai_jobs has no FK dependencies)

---

## 10. Logs RGPD-safe (P1 uniquement)

### Example purge log

```json
{
  "message": "Purge job completed",
  "aiJobsPurged": 42,
  "dryRun": false,
  "timestamp": "2025-12-25T12:00:00.000Z"
}
```

**CRITICAL** :
- ✅ NO tenant IDs (except in tenant-specific purge)
- ✅ NO user IDs
- ✅ NO content
- ✅ Counts only (P1 technical data)

---

## 11. Prochaines étapes (roadmap)

### LOT 5.0 — Pipeline RGPD (export/effacement)
- Use-cases export données (include ai_jobs metadata)
- Use-cases effacement RGPD (delete ai_jobs + cascade if needed)
- Purge integration with RGPD delete requests

### LOT 6.0 — Chiffrement au repos
- Chiffrement P2 data (consents)
- Stockage séparé contenu P3 (prompts/outputs)
- Purge avec crypto-shredding (optionnel)

### Améliorations futures LOT 4.1
- ⚠️ Purge automatique via cron/scheduler
- ⚠️ Retention policy configurable par tenant
- ⚠️ Purge audit_events > 3 ans (configurable per jurisdiction)

---

## 12. Références normatives

- [TASKS.md LOT 4.1](../../TASKS.md) (lignes 351-373)
- [CLAUDE.md](../../CLAUDE.md) (règles développement)
- [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) (section 5: retention policy)
- [BOUNDARIES.md](../architecture/BOUNDARIES.md) (frontières architecture)
- [RGPD_TESTING.md](../testing/RGPD_TESTING.md) (tests RGPD obligatoires)

---

## 13. Risques résiduels et limitations

### Risques maîtrisés

✅ **Idempotence** : validée par tests DB réels
✅ **Isolation tenant** : validée par tests cross-tenant
✅ **Retention policy** : validée par tests business rules

### Limitations actuelles (adressées LOT suivants)

⚠️ **Pas de purge automatique** : exécution manuelle uniquement (cron futur)
⚠️ **Pas de purge audit_events** : retention 3 ans (à implémenter si > 3 ans)
⚠️ **Pas de purge consents** : by design (RGPD compliance)
⚠️ **Pas de crypto-shredding** : prévu LOT 6 (chiffrement)

### Points de vigilance

🔍 **Purge production requiert backup** :
- Toujours exécuter `purge:dry-run` avant purge réelle
- Vérifier backup récent avant purge
- Logs purge conservés pour audit

🔍 **Tests nécessitent DATABASE_URL** :
- Tests LOT 4.1 requièrent PostgreSQL réelle (pas mocks)
- Cleanup automatique avant/après (pas de pollution)

---

## 14. Métriques de conformité

| Métrique | Valeur | Objectif |
|----------|--------|----------|
| Tests RGPD LOT 4.1 | 10 | ≥ 8 |
| Coverage purge idempotence | 100% | 100% |
| Violations rétention détectées | 0 | 0 |
| Consents auto-purged | 0 | 0 |
| Audit trails purged | 0 | 0 |

---

**Document validé — LOT 4.1 TERMINÉ et prêt pour revue/audit.**
