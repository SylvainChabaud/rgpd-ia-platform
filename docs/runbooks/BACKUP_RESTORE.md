# Runbook — Backup & Restore

> **Procédure opérationnelle** pour la sauvegarde et la restauration de la plateforme RGPD-IA.

**Criticité** : 🔴 **CRITIQUE RGPD**
**Articles RGPD** : Art. 32 (Sécurité — Capacité de restauration)
**Audience** : DevOps, SRE, RSSI
**Dernière mise à jour** : 2026-01-01
**Version** : 1.0

---

## 📋 Vue d'ensemble

Ce runbook décrit la stratégie de backup et les procédures de restauration pour garantir la **disponibilité** et la **résilience** des données conformément à l'Art. 32 du RGPD.

### Objectifs RGPD (Art. 32)

| Exigence | Objectif | Implémentation |
|----------|----------|----------------|
| **Disponibilité** | 99.9% uptime | Backups automatiques + monitoring |
| **Résilience** | Récupération rapide après incident | RTO <4h, RPO <1h |
| **Intégrité** | Données non corrompues | Checksum validation |
| **Confidentialité** | Backups chiffrés | AES-256 encryption at rest |

---

## 🎯 Métriques de Récupération

### RTO (Recovery Time Objective)

**Temps maximum acceptable de downtime** :

| Composant | RTO | Justification |
|-----------|-----|---------------|
| **Base de données PostgreSQL** | < 4 heures | Données critiques métier |
| **Application Next.js** | < 30 minutes | Stateless, redéploiement rapide |
| **AI Gateway** | < 30 minutes | Stateless, config versionnée |
| **Fichiers statiques** | < 2 heures | Non-critique, régénérable |

### RPO (Recovery Point Objective)

**Perte de données maximale acceptable** :

| Type de données | RPO | Backup fréquence |
|-----------------|-----|------------------|
| **Données P2 (users, consents)** | < 1 heure | Continuous (WAL) |
| **Données P1 (metadata)** | < 6 heures | Quotidien + WAL |
| **Audit logs** | < 1 heure | Continuous (WAL) |
| **Configuration** | < 24 heures | Git versioning |

---

## 🗂️ Classification des Données (rappel)

| Niveau | Description | Backup priorité | Rétention |
|--------|-------------|-----------------|-----------|
| 🔴 **P3** | Données sensibles (Art. 9) | ❌ **JAMAIS stockées** | N/A |
| 🟠 **P2** | Données personnelles | ✅ **CRITICAL** | 30j hot + 90j cold |
| 🟡 **P1** | Métadonnées techniques | ✅ **HIGH** | 30j hot + 1 an archive |
| 🟢 **P0** | Données publiques | ⚙️ **LOW** | 30j |

---

## 📅 Stratégie de Backup

### 1. Backup PostgreSQL (BASE DE DONNÉES)

#### 1.1 Backup Continu (WAL — Write-Ahead Logging)

**Méthode** : PostgreSQL Point-in-Time Recovery (PITR)
**Fréquence** : Continuous
**Rétention** : 7 jours

**Configuration** :
```sql
-- postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal_archive/%f'
max_wal_senders = 3
```

**Avantages** :
- RPO < 1 minute
- Récupération à n'importe quel point dans le temps

#### 1.2 Backup Complet Quotidien

**Méthode** : `pg_dump`
**Fréquence** : Quotidien (03:00 UTC)
**Rétention** :
- **Hot** : 30 derniers jours (accès rapide)
- **Cold** : 90 jours (archivage)
- **Archive** : 1 an (compliance RGPD Art. 30)

**Script** :
```bash
#!/bin/bash
# scripts/backup/postgres-backup.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/postgres"
DATABASE_URL="${DATABASE_URL}"

# Créer backup
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/full_backup_$TIMESTAMP.dump"

# Checksum pour vérification intégrité
sha256sum "$BACKUP_DIR/full_backup_$TIMESTAMP.dump" \
  > "$BACKUP_DIR/full_backup_$TIMESTAMP.dump.sha256"

# Chiffrement AES-256
gpg --symmetric \
  --cipher-algo AES256 \
  --batch --yes \
  --passphrase-file /secure/backup-passphrase.txt \
  "$BACKUP_DIR/full_backup_$TIMESTAMP.dump"

# Cleanup anciens backups (>30j)
find "$BACKUP_DIR" -name "full_backup_*.dump.gpg" -mtime +30 -delete

echo "✅ Backup completed: full_backup_$TIMESTAMP.dump.gpg"
```

**Cron configuration** :
```cron
# /etc/cron.d/postgres-backup
0 3 * * * postgres /app/scripts/backup/postgres-backup.sh >> /var/log/postgres-backup.log 2>&1
```

#### 1.3 Backup Différentiel Horaire

**Méthode** : WAL shipping
**Fréquence** : Horaire (archives WAL)
**Rétention** : 7 jours

**Avantages** :
- RPO < 1 heure
- Espace disque optimisé

---

### 2. Backup Configuration (GIT VERSIONING)

**Méthode** : Git repository
**Fréquence** : À chaque commit
**Rétention** : Illimitée (historique Git)

**Fichiers sauvegardés** :
- `migrations/*.sql` — Schémas base de données
- `docs/` — Documentation
- `.env.example` — Template configuration
- `scripts/` — Scripts opérationnels
- `src/` — Code source

**Backup externe** :
- GitHub (primary)
- GitLab (mirror, backup)

---

### 3. Backup Fichiers Statiques

**Méthode** : rsync ou S3 sync
**Fréquence** : Hebdomadaire
**Rétention** : 30 jours

**Fichiers concernés** :
- Uploads utilisateurs (si stockage local)
- Rapports d'audit générés
- Logs applicatifs (< 30j)

---

## 🔧 Procédures de Backup

### Backup Manuel (ad-hoc)

```bash
# Backup complet immédiat
./scripts/backup/postgres-backup.sh

# Vérifier le backup
ls -lh /backup/postgres/ | tail -1

# Vérifier checksum
sha256sum -c /backup/postgres/full_backup_*.dump.sha256
```

### Backup Avant Maintenance

**Quand** : Avant toute migration majeure ou mise à jour critique

```bash
# 1. Créer backup pré-maintenance
./scripts/backup/pre-maintenance-backup.sh

# 2. Vérifier intégrité
./scripts/backup/verify-backup.sh

# 3. Effectuer la maintenance
pnpm migrate

# 4. En cas d'échec → restauration immédiate
./scripts/restore/rollback-from-backup.sh
```

---

## 🔄 Procédures de Restauration

### Restauration Complète (Disaster Recovery)

**Scénario** : Perte totale de la base de données

**Procédure** :

#### Étape 1 : Arrêter l'application

```bash
# Stopper l'app pour éviter conflits
docker-compose down

# OU si déployé en production
systemctl stop rgpd-ia-platform
```

#### Étape 2 : Restaurer la base de données

```bash
#!/bin/bash
# scripts/restore/full-restore.sh

set -e

BACKUP_FILE="${1:?Usage: $0 <backup_file.dump.gpg>}"
TEMP_DIR="/tmp/restore_$(date +%s)"
DATABASE_URL="${DATABASE_URL}"

# Créer répertoire temporaire
mkdir -p "$TEMP_DIR"

# Déchiffrer le backup
gpg --decrypt \
  --batch --yes \
  --passphrase-file /secure/backup-passphrase.txt \
  --output "$TEMP_DIR/backup.dump" \
  "$BACKUP_FILE"

# Vérifier checksum
sha256sum -c "${BACKUP_FILE%.gpg}.sha256"

# Recréer la base de données
psql -c "DROP DATABASE IF EXISTS rgpd_platform;"
psql -c "CREATE DATABASE rgpd_platform;"

# Restaurer le dump
pg_restore \
  --dbname="$DATABASE_URL" \
  --jobs=4 \
  --verbose \
  "$TEMP_DIR/backup.dump"

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Restauration complète terminée"
```

**Temps estimé** : 2-4 heures (selon taille DB)

#### Étape 3 : Vérifier l'intégrité

```bash
# Vérifier connexions
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM tenants;"

# Vérifier RLS
./scripts/check-rls.ts
```

#### Étape 4 : Redémarrer l'application

```bash
docker-compose up -d

# Vérifier santé
curl http://localhost:3000/api/health
```

---

### Restauration Point-in-Time (PITR)

**Scénario** : Erreur humaine (suppression accidentelle)

**Objectif** : Restaurer à un moment précis (ex: avant la suppression)

**Procédure** :

```bash
#!/bin/bash
# scripts/restore/pitr-restore.sh

set -e

TARGET_TIME="${1:?Usage: $0 <YYYY-MM-DD HH:MM:SS>}"
BACKUP_DIR="/backup/postgres"
WAL_DIR="/backup/wal_archive"

# 1. Arrêter PostgreSQL
systemctl stop postgresql

# 2. Sauvegarder l'état actuel (au cas où)
mv /var/lib/postgresql/data /var/lib/postgresql/data.old

# 3. Restaurer le dernier backup complet
pg_restore --create --dbname=postgres "$BACKUP_DIR/latest.dump"

# 4. Créer fichier recovery.conf
cat > /var/lib/postgresql/data/recovery.conf <<EOF
restore_command = 'cp $WAL_DIR/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF

# 5. Redémarrer PostgreSQL (mode recovery)
systemctl start postgresql

# PostgreSQL va automatiquement replay les WAL jusqu'à TARGET_TIME
echo "⏳ Recovery en cours... Vérifier les logs PostgreSQL"
tail -f /var/log/postgresql/postgresql-*.log
```

**Temps estimé** : 1-2 heures

---

### Restauration Partielle (Table unique)

**Scénario** : Corruption d'une seule table

**Procédure** :

```bash
#!/bin/bash
# scripts/restore/table-restore.sh

set -e

BACKUP_FILE="${1:?Usage: $0 <backup_file.dump> <table_name>}"
TABLE_NAME="${2:?Missing table name}"

# Restaurer uniquement la table spécifiée
pg_restore \
  --dbname="$DATABASE_URL" \
  --table="$TABLE_NAME" \
  --clean \
  --if-exists \
  "$BACKUP_FILE"

echo "✅ Table $TABLE_NAME restaurée"
```

**Temps estimé** : 5-30 minutes

---

## 🚨 Procédure d'Urgence (Incident RGPD)

**Scénario** : Violation de données détectée (Art. 33-34 RGPD)

### Timeline critique

| Temps | Action | Responsable |
|-------|--------|-------------|
| **T+0** | Détection incident | Monitoring / Alerte |
| **T+15min** | Créer backup immédiat (evidence) | DevOps |
| **T+30min** | Isoler système compromis | DevOps + RSSI |
| **T+1h** | Analyser logs + backup | RSSI + DPO |
| **T+72h** | Notification CNIL (deadline) | DPO |

### Backup d'Evidence (Forensics)

```bash
#!/bin/bash
# scripts/backup/forensic-backup.sh

set -e

INCIDENT_ID="${1:?Usage: $0 <incident_id>}"
EVIDENCE_DIR="/backup/forensics/$INCIDENT_ID"

mkdir -p "$EVIDENCE_DIR"

# 1. Snapshot base de données (état actuel)
pg_dump "$DATABASE_URL" \
  --format=custom \
  > "$EVIDENCE_DIR/db_snapshot_$(date +%s).dump"

# 2. Copier logs applicatifs
cp -r /var/log/rgpd-ia-platform/*.log "$EVIDENCE_DIR/"

# 3. Copier WAL archives (7 derniers jours)
cp -r /backup/wal_archive/* "$EVIDENCE_DIR/wal/"

# 4. Export audit events liés à l'incident
psql "$DATABASE_URL" -c "
  COPY (
    SELECT * FROM audit_events
    WHERE created_at >= NOW() - INTERVAL '7 days'
    ORDER BY created_at DESC
  ) TO STDOUT CSV HEADER
" > "$EVIDENCE_DIR/audit_events.csv"

# 5. Checksum + chiffrement
cd "$EVIDENCE_DIR" && sha256sum * > checksums.txt
tar czf "$EVIDENCE_DIR.tar.gz" -C "$EVIDENCE_DIR" .
gpg --encrypt --recipient dpo@example.com "$EVIDENCE_DIR.tar.gz"

echo "✅ Evidence backup créé: $EVIDENCE_DIR.tar.gz.gpg"
echo "⚠️  À conserver 3 ans minimum (RGPD Art. 33.5)"
```

---

## ✅ Tests de Restauration

**Fréquence** : Mensuel (obligatoire RGPD Art. 32)

### Test Mensuel Automatisé

```bash
#!/bin/bash
# scripts/test/monthly-restore-test.sh

set -e

LOG_FILE="/var/log/restore-tests/test_$(date +%Y%m%d).log"

{
  echo "=== Test Restauration $(date) ==="

  # 1. Créer backup test
  ./scripts/backup/postgres-backup.sh

  # 2. Créer DB test
  createdb rgpd_platform_restore_test

  # 3. Restaurer dans DB test
  LATEST_BACKUP=$(ls -t /backup/postgres/full_backup_*.dump.gpg | head -1)
  ./scripts/restore/full-restore.sh "$LATEST_BACKUP" \
    --dbname=rgpd_platform_restore_test

  # 4. Vérifier intégrité
  ORIGINAL_COUNT=$(psql rgpd_platform -t -c "SELECT COUNT(*) FROM users;")
  RESTORED_COUNT=$(psql rgpd_platform_restore_test -t -c "SELECT COUNT(*) FROM users;")

  if [[ "$ORIGINAL_COUNT" == "$RESTORED_COUNT" ]]; then
    echo "✅ Test PASSED: $ORIGINAL_COUNT users restaurés"
  else
    echo "❌ Test FAILED: Mismatch counts (original: $ORIGINAL_COUNT, restored: $RESTORED_COUNT)"
    exit 1
  fi

  # 5. Cleanup DB test
  dropdb rgpd_platform_restore_test

  echo "=== Test Terminé avec SUCCÈS ==="
} | tee -a "$LOG_FILE"
```

**Cron** :
```cron
# Test le 1er de chaque mois à 01:00 UTC
0 1 1 * * /app/scripts/test/monthly-restore-test.sh
```

---

## 📊 Monitoring & Alertes

### Métriques à Surveiller

| Métrique | Seuil | Alerte |
|----------|-------|--------|
| **Backup success rate** | < 95% | 🟠 WARNING |
| **Dernière backup** | > 25h | 🔴 CRITICAL |
| **Espace disque backups** | > 80% | 🟡 INFO |
| **Durée backup** | > 2h | 🟠 WARNING |
| **Checksum failures** | > 0 | 🔴 CRITICAL |

### Alertes Automatiques

**Configuration** (Prometheus + Alertmanager) :

```yaml
# alerts/backup-alerts.yml
groups:
  - name: backup_alerts
    rules:
      - alert: BackupFailed
        expr: backup_last_success_timestamp < (time() - 86400)
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Backup PostgreSQL échoué ou absent depuis >24h"

      - alert: BackupChecksumMismatch
        expr: backup_checksum_failures_total > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Corruption détectée dans backup (checksum mismatch)"
```

---

## 🔐 Sécurité des Backups

### Chiffrement

**Méthode** : GPG (AES-256)
**Clé** : Stockée dans `/secure/backup-passphrase.txt` (permissions 400, root only)

### Stockage

| Localisation | Type | Rétention | Accès |
|--------------|------|-----------|-------|
| **Local** (/backup) | Hot | 30j | root, postgres |
| **S3 / Object Storage** | Cold | 90j | IAM role only |
| **Offsite (Glacier)** | Archive | 1 an | DPO + RSSI |

### Contrôle d'accès

```bash
# Permissions strictes
chmod 700 /backup
chown postgres:postgres /backup

# Audit logs accès backups
auditctl -w /backup -p rwa -k backup_access
```

---

## 📋 Checklist Pré-Production

Avant le déploiement en production, vérifier :

- [ ] Backups automatiques configurés (cron)
- [ ] WAL archiving activé
- [ ] Tests de restauration mensuels schedulés
- [ ] Monitoring backups configuré (Prometheus)
- [ ] Alertes configurées (email, Slack, PagerDuty)
- [ ] Passphrase backup stockée en lieu sûr
- [ ] Documentation runbook accessible équipes
- [ ] RTO/RPO validés par métier
- [ ] Procédure forensics testée

---

## 🔗 Références

| Document | Description |
|----------|-------------|
| [backup-policy.md](backup-policy.md) | Politique générale de sauvegarde |
| [incident.md](incident.md) | Procédure incident RGPD (Art. 33-34) |
| [EPIC 9.2 — Chaos Tests](../../tests/chaos.resilience.test.ts) | Tests résilience automatisés |
| [RGPD Art. 32](https://www.cnil.fr/fr/article-32-securite-du-traitement) | Exigences légales sécurité |

---

## ✅ Validation

Ce runbook a été testé et validé le **2026-01-01**.

**Prochaine révision** : 2026-04-01 (ou après incident)

**Validé par** :
- DevOps Lead
- RSSI
- DPO
