# Backup Policy — Data Protection & Recovery Strategy

**Version** : 1.0
**LOT** : 2.0 (EPIC 2 — Durcissement serveur & réseau)
**Date** : 2025-12-24
**Statut** : NORMATIF (obligatoire avant production)

---

## Objectif

Ce document définit la **stratégie de sauvegarde et de restauration** de la plateforme RGPD-IA-Platform, garantissant :

- **Disponibilité** : Capacité à restaurer en cas de défaillance
- **Intégrité** : Données sauvegardées fiables et cohérentes
- **Confidentialité** : Backups chiffrés et isolés
- **Conformité RGPD** : Minimisation, rétention maîtrisée, droits des personnes

**Périmètre** :
- Base de données PostgreSQL (données métier et audit)
- Configuration applicative (hors secrets)
- Exclusions : Secrets (stockés dans Vault), logs temporaires, données P3 non justifiées

**Références normatives** :
- [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) (P0-P3)
- [TASKS.md](../../TASKS.md) (EPIC 4 — Stockage RGPD, EPIC 5 — Pipeline RGPD)
- [BOUNDARIES.md](../architecture/BOUNDARIES.md)

---

## 1. Périmètre des données à sauvegarder

### 1.1 Base de données PostgreSQL

**Tables critiques** :

| Table | Classification | Sauvegarde | Justification |
|-------|----------------|-----------|---------------|
| **tenants** | P1 (IDs techniques) | ✅ Obligatoire | Isolation tenant, données métier essentielles |
| **users** | P2 (email_hash, displayName) | ✅ Obligatoire | Comptes plateforme/tenant, nécessaires pour auth |
| **audit_events** | P1 (événements seuls) | ✅ Obligatoire | Traçabilité légale, preuves RGPD |
| **rgpd_requests** | P1 (métadonnées export/delete) | ✅ Obligatoire | Droits des personnes, conformité EPIC 5 |
| **bootstrap_state** | P1 (flag technique) | ✅ Obligatoire | Prévention re-bootstrap accidentel |

**Référence** : [migrations/001_init.sql](../../migrations/001_init.sql)

**⚠️ Données P3** : Par défaut, **aucune donnée P3** (données santé, financières sensibles, prompts métier) ne doit être présente en base. Si exception justifiée (EPIC 4), backup chiffré avec clé dédiée.

---

### 1.2 Configuration applicative

**Inclus** :
- [ ] `.env.example` (template uniquement, **pas de secrets réels**)
- [ ] `migrations/*.sql` (schéma DB)
- [ ] `docs/runbooks/*.md` (procédures opérationnelles)

**Exclus** :
- [ ] ❌ `.env` (contient secrets — géré par Vault, pas versionné)
- [ ] ❌ `node_modules/` (reconstruction via `npm install`)
- [ ] ❌ Logs temporaires (rétention 30j, cf. DATA_CLASSIFICATION.md)

---

### 1.3 Classification des données (référence P0-P3)

| Niveau | Exemples | Backup | Chiffrement | Rétention |
|--------|----------|--------|-------------|-----------|
| **P0** | Docs publiques, templates | Optionnel | Recommandé | Libre |
| **P1** | IDs techniques, audit events | **Obligatoire** | Recommandé | 1 an (audit légal) |
| **P2** | email_hash, displayName | **Obligatoire** | **Obligatoire** | Durée de vie compte + 30j |
| **P3** | Données santé, prompts métier | **Interdit par défaut** | **Obligatoire** si exception | Minimale (7-30j) |

**Référence normative** : [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md)

---

## 2. Fréquence et rétention

### 2.1 Fréquence de backup

| Type | Fréquence | Méthode | Objectif |
|------|-----------|---------|----------|
| **Backup complet** | Quotidien (03h00 UTC) | `pg_dump` | Restauration complète |
| **Backup incrémental** | Horaire (optionnel) | WAL archiving | Récupération point-in-time (PITR) |
| **Snapshot configuration** | Hebdomadaire | Git tag + export config | Traçabilité version |

**Commande backup complet** :
```bash
pg_dump -h localhost -U rgpd_backup_user -Fc \
  --file=/backups/rgpd_platform_$(date +%Y%m%d_%H%M%S).dump \
  rgpd_platform
```

**Commande backup incrémental (WAL)** :
```bash
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backups/wal_archive/%f'
```

---

### 2.2 Rétention des backups

| Période | Localisation | Objectif |
|---------|--------------|----------|
| **Hot backups** (30 jours) | Stockage rapide (SSD, S3 Standard) | Restauration immédiate |
| **Cold backups** (90 jours) | Stockage économique (S3 Glacier, Tape) | Conformité rétention |
| **Archive légal** (1 an) | Stockage sécurisé (coffre-fort numérique) | Audit RGPD, obligations légales |

**Alignement avec RetentionPolicy** :
- LOT 4.1 (futur) définira `RetentionPolicy` applicative
- Les backups doivent respecter les mêmes durées (ou supérieures pour preuves légales)

**Exemple politiques S3** :
```json
{
  "Rules": [
    {"Transition": {"Days": 30, "StorageClass": "GLACIER"}},
    {"Transition": {"Days": 90, "StorageClass": "DEEP_ARCHIVE"}},
    {"Expiration": {"Days": 365}}
  ]
}
```

---

### 2.3 Suppression des backups

- [ ] **Suppression automatique après 1 an** : Aligné avec durée maximale audit légal
- [ ] **Exception demande RGPD** : Si utilisateur demande effacement (EPIC 5), backups concernés doivent être purgés ou rendus irrécupérables (crypto-shredding)

**Référence** : EPIC 5 (export/effacement RGPD)

---

## 3. Sécurité des backups

### 3.1 Chiffrement obligatoire

- [ ] **Chiffrement en transit** : TLS pour transfert backups (ex: `aws s3 cp --sse`)
- [ ] **Chiffrement au repos** : AES-256 ou équivalent
  ```bash
  # Chiffrer backup avec GPG
  gpg --symmetric --cipher-algo AES256 \
    --output /backups/rgpd_platform_20251224.dump.gpg \
    /backups/rgpd_platform_20251224.dump
  ```

- [ ] **Clés de chiffrement** :
  - Option 1 : Clé unique plateforme (KMS, Vault)
  - Option 2 : Clé par tenant (si isolation renforcée, complexité accrue)

**Stockage clés** : HashiCorp Vault, AWS KMS, Azure Key Vault (jamais en clair sur serveur)

---

### 3.2 Isolation du stockage

- [ ] **Stockage hors serveur production** : Backups sur serveur dédié ou cloud object storage (S3, Azure Blob, GCS)
- [ ] **Réseau isolé** : Accès backup serveur via VPN ou réseau privé (pas internet public)
- [ ] **Séparation géographique** : Backup primaire (région A) + backup secondaire (région B) pour disaster recovery

**Exemple architecture** :
```
Production DB (région EU-West-1)
  ↓ backup quotidien
Backup primaire S3 (EU-West-1)
  ↓ réplication cross-region
Backup secondaire S3 (EU-West-3)
```

---

### 3.3 Accès restreints (IAM/RBAC)

- [ ] **Principe du moindre privilège** :
  - User `rgpd_backup_user` : `SELECT` uniquement (pas `INSERT/UPDATE/DELETE`)
  - Ops backup : lecture/écriture backups uniquement
  - Pas d'accès public aux buckets S3

**Exemple policy S3** :
```json
{
  "Effect": "Allow",
  "Principal": {"AWS": "arn:aws:iam::123456789:role/backup-role"},
  "Action": ["s3:PutObject", "s3:GetObject"],
  "Resource": "arn:aws:s3:::rgpd-platform-backups/*"
}
```

- [ ] **Audit accès backups** : Logs CloudTrail (AWS) ou équivalent
  ```json
  {"eventType":"backup_accessed","user":"ops-admin-1","timestamp":"2025-12-24T10:00:00Z"}
  ```

---

## 4. Procédure de restauration

### 4.1 Test de restauration mensuel (OBLIGATOIRE)

- [ ] **Planification** : Premier lundi de chaque mois
- [ ] **Environnement de test** : Base de données dédiée (pas production)
- [ ] **Validation** :
  1. Restaurer backup complet
  2. Vérifier intégrité données (counts, checksums)
  3. Tester accès tenant isolation
  4. Documenter résultat (succès/échec, durée)

**Commande restauration** :
```bash
# Restauration backup complet
pg_restore -h localhost -U postgres -d rgpd_platform_test \
  /backups/rgpd_platform_20251224.dump

# Vérification intégrité
psql -h localhost -U postgres -d rgpd_platform_test -c "SELECT COUNT(*) FROM tenants;"
psql -h localhost -U postgres -d rgpd_platform_test -c "SELECT COUNT(*) FROM users;"
```

**Durée cible** : Restauration complète < 2h (selon volumétrie)

---

### 4.2 Plan de reprise (Disaster Recovery)

**Scénarios** :

| Scénario | Impact | Procédure | RTO cible |
|----------|--------|-----------|-----------|
| **Corruption DB** | Partiel | Restauration dernier backup complet + WAL replay | 2h |
| **Perte serveur production** | Total | Restauration sur serveur secondaire (région B) | 4h |
| **Compromission sécurité** | Critique | Restauration backup pré-incident + forensics | 8h |

**RTO (Recovery Time Objective)** : Temps maximal avant restauration service
**RPO (Recovery Point Objective)** : Perte de données acceptable

| Service | RTO | RPO |
|---------|-----|-----|
| API backend (critique) | 4h | 1h (backup incrémental) |
| Audit events | 8h | 24h (backup quotidien) |

---

### 4.3 Isolation tenant préservée

- [ ] **Restauration partielle** : Possibilité de restaurer uniquement données d'un tenant
  ```sql
  -- Restaurer uniquement tenant X
  pg_restore --data-only --schema=public \
    --table=tenants --table=users --table=audit_events \
    /backups/rgpd_platform_20251224.dump | \
    psql -c "DELETE FROM users WHERE tenant_id != '<TENANT_UUID>';"
  ```

- [ ] **Vérification isolation** : Tests cross-tenant après restauration
  ```bash
  npm test -- tests/db.cross-tenant-isolation.test.ts
  ```

---

### 4.4 Audit trail de restauration

- [ ] **Événement audit** : Toute restauration génère audit event
  ```json
  {
    "eventType": "backup_restored",
    "actorId": "ops-admin-1",
    "actorScope": "SYSTEM",
    "timestamp": "2025-12-24T10:00:00Z",
    "metadata": {"backup_date": "2025-12-23", "restore_duration_sec": 7200}
  }
  ```

- [ ] **Documentation post-incident** : Rapport incident + actions correctives

**Référence** : [src/app/audit/AuditEvent.ts](../../src/app/audit/AuditEvent.ts)

---

## 5. Conformité RGPD

### 5.1 Minimisation des données

- [ ] **Backup ne contient que données nécessaires** :
  - ✅ P1/P2 justifiées (tenants, users, audit_events)
  - ❌ Pas de prompts IA par défaut (stockage désactivé, cf. LLM_USAGE_POLICY.md)
  - ❌ Pas de données P3 non validées

**Vérification** :
```sql
-- Vérifier absence colonnes sensibles non justifiées
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('users', 'tenants')
  AND column_name LIKE '%prompt%' OR column_name LIKE '%content%';
-- Résultat attendu : 0 ligne
```

---

### 5.2 Effacement différé appliqué aux backups

**Principe** : Si utilisateur demande effacement (EPIC 5), les backups doivent également être traités.

**Stratégies** :

- [ ] **Option 1 : Crypto-shredding** — Destruction clé de chiffrement spécifique utilisateur
  ```bash
  # Détruire clé utilisateur après export RGPD
  vault kv delete secret/rgpd-platform/user-keys/<USER_ID>
  ```

- [ ] **Option 2 : Backup re-généré** — Créer backup sans données utilisateur supprimé
  ```sql
  -- Exporter backup sans utilisateur X
  pg_dump --exclude-table-data=users \
    rgpd_platform > backup_post_deletion.dump
  psql -c "COPY (SELECT * FROM users WHERE user_id != '<DELETED_USER>') TO STDOUT;" \
    >> backup_post_deletion.dump
  ```

- [ ] **Option 3 : Marquage suppression** — Conserver audit trail mais données irrécupérables
  ```sql
  -- Marquer user comme "deleted" dans backup (conformité audit légal)
  UPDATE users SET email_hash = NULL, display_name = '[DELETED]' WHERE user_id = '<USER_ID>';
  ```

**Recommandation projet** : Crypto-shredding (Option 1) si clé par utilisateur, sinon Option 3 (marquage).

**Référence** : EPIC 5 (effacement RGPD)

---

### 5.3 Droit d'export RGPD depuis backup

- [ ] **Génération export depuis backup** : Si base primaire corrompue, export RGPD généré depuis backup
  ```bash
  # Restaurer backup temporaire
  pg_restore -d rgpd_temp /backups/rgpd_platform_20251224.dump

  # Générer export utilisateur
  psql -d rgpd_temp -c "
    SELECT jsonb_build_object(
      'user_id', user_id,
      'email_hash', email_hash,
      'display_name', display_name,
      'created_at', created_at
    ) FROM users WHERE user_id = '<USER_ID>';
  " > /exports/user_<USER_ID>_export.json

  # Chiffrer export
  gpg --encrypt --recipient user@example.com /exports/user_<USER_ID>_export.json
  ```

**Référence** : EPIC 5 (export RGPD)

---

### 5.4 Traçabilité : Backup audit events inclus

- [ ] **Table `audit_events` sauvegardée** : Preuves légales de conformité
- [ ] **Rétention minimale 1 an** : Aligné avec obligations légales audit RGPD
- [ ] **Audit events eux-mêmes RGPD-safe** : Pas de payloads sensibles (déjà implémenté LOT 1.3)

**Test conformité** :
```bash
npm test -- tests/rgpd.audit-events-no-payload.test.ts
```

---

## 6. Responsabilités

### 6.1 Qui initie backups

- [ ] **Automatisé (recommandé)** : Cron job ou scheduler cloud (AWS Backup, Azure Backup)
  ```bash
  # Crontab backup quotidien à 03h00 UTC
  0 3 * * * /opt/rgpd-platform/scripts/backup.sh
  ```

- [ ] **Manuel (fallback)** : Ops admin via script sécurisé
  ```bash
  sudo -u backup-user /opt/rgpd-platform/scripts/backup.sh
  ```

**Responsable** : Équipe Ops/Sec

---

### 6.2 Qui surveille

- [ ] **Alertes échec backup** : Si backup quotidien échoue → alerte immédiate (Slack, email, PagerDuty)
  ```bash
  # Vérifier succès backup
  if [ $? -ne 0 ]; then
    curl -X POST https://hooks.slack.com/... \
      -d '{"text":"❌ BACKUP FAILED: rgpd_platform $(date)"}'
  fi
  ```

- [ ] **Dashboard monitoring** : Grafana/Datadog avec métrique `backup_last_success_timestamp`

**Responsable** : Équipe Ops/Sec + astreinte

---

### 6.3 Qui teste restauration

- [ ] **Test mensuel** : Équipe Ops/Sec (premier lundi du mois)
- [ ] **Validation DPO** : Rapport test restauration envoyé au DPO (conformité RGPD)
- [ ] **Simulation disaster recovery** : Trimestrielle (implique Ops, Sec, DPO)

**Responsable** : Ops/Sec + DPO (validation)

---

## 7. Plan de continuité (RTO/RPO)

### 7.1 Objectifs de reprise

| Criticité | RTO (Recovery Time) | RPO (Recovery Point) | Méthode |
|-----------|---------------------|----------------------|---------|
| **Critique** (API backend) | 4h | 1h | Backup incrémental (WAL) + réplication cross-region |
| **Important** (Audit events) | 8h | 24h | Backup quotidien |
| **Normal** (Configuration) | 24h | 7j | Backup hebdomadaire |

**RTO** : Temps maximal tolérable avant restauration service
**RPO** : Perte de données acceptable (temps entre dernier backup et incident)

---

### 7.2 Procédure Disaster Recovery

**Étapes** :

1. **Détection incident** : Alerte monitoring (DB down, corruption détectée)
2. **Évaluation impact** : Ops/Sec évalue criticité (partiel/total)
3. **Activation plan DR** : Notification équipe (Ops, Sec, DPO, Tech Lead)
4. **Isolation production** : Déconnecter DB compromise (prévenir propagation)
5. **Restauration backup** :
   - Backup complet récent + WAL replay (PITR)
   - Validation intégrité (checksums, tests)
6. **Bascule trafic** : DNS/Load Balancer → serveur restauré
7. **Post-mortem** : Analyse cause racine, actions correctives
8. **Audit trail** : Génération audit event + rapport incident

**Durée totale estimée** : 4-8h (selon criticité)

---

### 7.3 Communication

- [ ] **Interne** : Équipe technique (Slack #incidents)
- [ ] **Externe** : Utilisateurs affectés (status page, email)
- [ ] **DPO** : Notification si violation données (< 72h, RGPD art. 33)
- [ ] **CNIL** : Notification si violation grave (< 72h)

---

## 8. Outils recommandés

| Outil | Usage | Type |
|-------|-------|------|
| **pg_dump / pg_restore** | Backup/restauration PostgreSQL | Standard PostgreSQL |
| **WAL archiving** | Backup incrémental (PITR) | PostgreSQL natif |
| **AWS S3 / Azure Blob / GCS** | Stockage backups (chiffré, répliqué) | Cloud object storage |
| **HashiCorp Vault** | Gestion clés chiffrement | Secrets manager |
| **Grafana / Datadog** | Monitoring backups | Observabilité |
| **Cron / AWS Backup / Azure Backup** | Planification automatique | Scheduler |

---

## 9. Checklist pré-production

- [ ] Backup automatisé configuré (quotidien + incrémental si nécessaire)
- [ ] Chiffrement backups activé (AES-256, clés dans Vault)
- [ ] Stockage backups isolé (hors serveur production, cross-region)
- [ ] Accès backups restreints (IAM/RBAC, audit trail)
- [ ] Test restauration mensuel planifié (calendrier Ops)
- [ ] Alertes échec backup configurées (Slack, email, PagerDuty)
- [ ] Plan DR documenté et validé (Ops + DPO)
- [ ] Rétention alignée avec RetentionPolicy (30j hot, 90j cold, 1 an archive)
- [ ] Conformité RGPD validée (minimisation, effacement différé, export depuis backup)
- [ ] Backup audit events inclus (traçabilité légale)

---

## 10. Références normatives

| Document | Rôle | Lien |
|----------|------|------|
| **DATA_CLASSIFICATION.md** | Classification P0-P3 | [docs/data/DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) |
| **TASKS.md** | EPIC 4 (Stockage), EPIC 5 (Export/Effacement) | [TASKS.md](../../TASKS.md) |
| **BOUNDARIES.md** | Frontières d'architecture | [docs/architecture/BOUNDARIES.md](../architecture/BOUNDARIES.md) |
| **LLM_USAGE_POLICY.md** | Politique stockage IA | [docs/ai/LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md) |
| **RGPD_TESTING.md** | Tests conformité | [docs/testing/RGPD_TESTING.md](../testing/RGPD_TESTING.md) |
| **security-hardening.md** | Sécurité production | [docs/runbooks/security-hardening.md](security-hardening.md) |
| **bootstrap.md** | Bootstrap CLI | [docs/runbooks/bootstrap.md](bootstrap.md) |

---

## 11. Standards de référence (externes)

- **PostgreSQL Backup Best Practices** : https://www.postgresql.org/docs/current/backup.html
- **RGPD (Art. 32)** : Sécurité du traitement — https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre4#Article32
- **ANSSI — Sauvegardes** : https://www.ssi.gouv.fr/
- **NIST SP 800-34** : Contingency Planning Guide — https://csrc.nist.gov/publications/detail/sp/800-34/rev-1/final

---

**Document maintenu par** : Équipe Ops/Sec & DPO
**Dernière mise à jour** : 2025-12-24
**Version** : 1.0 (LOT 2.0)
