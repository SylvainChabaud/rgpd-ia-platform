# Variables d'Environnement — RGPD IA Platform

> **Documentation complète** de toutes les variables d'environnement pour le déploiement et la configuration.

**Dernière mise à jour** : 2026-01-01
**Version** : EPIC 9 complet
**Fichier template** : `.env.example`

---

## 📋 Vue d'ensemble

### Configuration Requise

| Environnement | Fichier | Méthode |
|---------------|---------|---------|
| **Development** | `.env` | Copy from `.env.example` |
| **Staging** | Docker secrets | `secrets/*.txt` files |
| **Production** | Docker secrets + Vault | Secure storage mandatory |

### Priorité des Variables

| Priorité | Description | Exemples |
|----------|-------------|----------|
| 🔴 **CRITICAL** | Secrets sensibles (JAMAIS hardcodés) | Passwords, JWT_SECRET, API keys |
| 🟠 **HIGH** | Configuration sécurité | Alerting emails, RLS enforcement |
| 🟡 **MEDIUM** | Configuration fonctionnelle | Timeouts, thresholds |
| 🟢 **LOW** | Configuration optionnelle | Log level, feature flags |

---

## 🔐 Variables CRITICAL (Secrets)

### DATABASE_URL

**Description** : Connection string PostgreSQL complète
**Format** : `postgresql://user:password@host:port/database`
**Priorité** : 🔴 CRITICAL
**Production** : Docker secret (`/run/secrets/db_url`)

**Exemples** :
```bash
# Development
DATABASE_URL=postgresql://devuser:devpass@localhost:5432/rgpd_platform

# Docker (production)
DATABASE_URL=postgresql://rgpd_user:${DB_PASSWORD}@db:5432/rgpd_platform
```

**Sécurité** :
- ❌ JAMAIS commiter dans Git
- ✅ Utiliser Docker secrets en production
- ✅ Chiffrer dans Vault (HashiCorp, AWS Secrets Manager)

---

### SESSION_SECRET

**Description** : Secret pour signer les sessions HTTP
**Format** : String hexadécimale 64 caractères
**Priorité** : 🔴 CRITICAL
**Génération** : `openssl rand -hex 32`

**Exemple** :
```bash
SESSION_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

**Sécurité** :
- ✅ Générer unique par environnement
- ✅ Rotation tous les 6 mois minimum
- ❌ JAMAIS réutiliser entre environnements

---

### JWT_SECRET

**Description** : Secret pour signer les JWT tokens (authentication)
**Format** : String hexadécimale 64 caractères
**Priorité** : 🔴 CRITICAL
**Génération** : `openssl rand -hex 32`

**Exemple** :
```bash
JWT_SECRET=fedcba098765432109876543210987654321098765432109876543210abcdef
```

**Sécurité** :
- ✅ DIFFÉRENT de SESSION_SECRET
- ✅ Rotation nécessite re-login tous utilisateurs
- ✅ Stockage Vault mandatory en production

---

### BOOTSTRAP_PLATFORM_SECRET

**Description** : Secret pour créer le premier Super Admin
**Format** : String hexadécimale 64 caractères
**Priorité** : 🔴 CRITICAL
**Usage** : One-time lors du bootstrap initial

**Exemple** :
```bash
BOOTSTRAP_PLATFORM_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

**Sécurité** :
- ✅ Utilisé UNIQUEMENT pour `pnpm bootstrap:superadmin`
- ✅ Désactiver après bootstrap (`BOOTSTRAP_MODE=false`)
- ✅ Supprimer de l'environnement après usage

---

## 🛡️ Variables EPIC 9 — Incident Response & Security

### ALERT_DPO_EMAILS

**Description** : Emails du DPO (Data Protection Officer) pour incidents RGPD
**Format** : Comma-separated emails
**Priorité** : 🟠 HIGH
**EPIC** : 9.0

**Exemples** :
```bash
# Single DPO
ALERT_DPO_EMAILS=dpo@example.com

# Multiple DPOs
ALERT_DPO_EMAILS=dpo@example.com,deputy-dpo@example.com
```

**Usage** :
- Incidents `CRITICAL` + `cross_tenant_access`
- Notification deadline CNIL (Art. 33)
- Mass export detection (Art. 17)

---

### ALERT_DEVOPS_EMAILS

**Description** : Emails équipe DevOps pour incidents infrastructure
**Format** : Comma-separated emails
**Priorité** : 🟠 HIGH
**EPIC** : 9.0

**Exemples** :
```bash
ALERT_DEVOPS_EMAILS=devops@example.com,sre@example.com,oncall@example.com
```

**Usage** :
- Backup failures
- Container crashes
- Database connection exhaustion
- Service unavailability

---

### ALERT_SECURITY_EMAILS

**Description** : Emails équipe sécurité pour incidents de sécurité
**Format** : Comma-separated emails
**Priorité** : 🟠 HIGH
**EPIC** : 9.0

**Exemples** :
```bash
ALERT_SECURITY_EMAILS=security@example.com,rssi@example.com
```

**Usage** :
- Brute force attacks
- Cross-tenant access attempts
- SQL injection attempts
- Unauthorized access

---

### SLACK_WEBHOOK_URL

**Description** : Webhook URL pour alertes Slack
**Format** : `https://hooks.slack.com/services/...`
**Priorité** : 🟡 MEDIUM (Optionnel)
**EPIC** : 9.0

**Configuration** :
1. Créer Slack App : https://api.slack.com/apps
2. Activer Incoming Webhooks
3. Ajouter webhook à workspace
4. Copier URL

**Exemple** :
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
SLACK_CHANNEL=#security-alerts
```

**Usage** :
- Incidents `HIGH` et `CRITICAL`
- Real-time notifications équipe sécurité

---

### PAGERDUTY_ROUTING_KEY

**Description** : Routing key PagerDuty pour incidents CRITICAL
**Format** : String alphanumérique
**Priorité** : 🟡 MEDIUM (Optionnel)
**EPIC** : 9.0

**Configuration** :
1. Créer service PagerDuty
2. Add integration → Events API v2
3. Copier Routing Key

**Exemple** :
```bash
PAGERDUTY_ROUTING_KEY=R01234567890ABCDEFGHIJKLMNOP
```

**Usage** :
- Incidents `CRITICAL` uniquement
- Escalade automatique équipe on-call

---

### DASHBOARD_URL

**Description** : URL du dashboard pour liens dans emails/alertes
**Format** : `https://domain.com`
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.0

**Exemples** :
```bash
# Production
DASHBOARD_URL=https://rgpd-platform.example.com

# Staging
DASHBOARD_URL=https://staging.rgpd-platform.example.com

# Development
DASHBOARD_URL=http://localhost:3000
```

---

### DETECTION_BRUTE_FORCE_ATTEMPTS

**Description** : Nombre de tentatives login échouées avant détection
**Format** : Integer (1-100)
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.0
**Default** : `10`

**Exemples** :
```bash
# Strict (prod)
DETECTION_BRUTE_FORCE_ATTEMPTS=5

# Standard
DETECTION_BRUTE_FORCE_ATTEMPTS=10

# Permissive (dev)
DETECTION_BRUTE_FORCE_ATTEMPTS=20
```

---

### DETECTION_BRUTE_FORCE_WINDOW_MINUTES

**Description** : Fenêtre de temps pour compter les tentatives échouées
**Format** : Integer (1-60 minutes)
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.0
**Default** : `5`

**Exemples** :
```bash
# Strict
DETECTION_BRUTE_FORCE_WINDOW_MINUTES=2

# Standard
DETECTION_BRUTE_FORCE_WINDOW_MINUTES=5

# Permissive
DETECTION_BRUTE_FORCE_WINDOW_MINUTES=10
```

**Exemple calcul** :
- Seuil : 10 tentatives / 5 minutes
- Si 10 tentatives échouées dans une fenêtre de 5 minutes → incident CRITICAL

---

### DETECTION_MASS_EXPORT_RECORDS

**Description** : Nombre de records exportés déclenchant alerte RGPD
**Format** : Integer (1000-100000)
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.0
**Default** : `10000`

**Exemples** :
```bash
# Small tenant (strict)
DETECTION_MASS_EXPORT_RECORDS=1000

# Medium tenant
DETECTION_MASS_EXPORT_RECORDS=10000

# Large tenant (permissive)
DETECTION_MASS_EXPORT_RECORDS=50000
```

**Usage RGPD** :
- Détection export massif de données (Art. 17, 20)
- Alerte DPO pour vérification légitimité

---

### DETECTION_MASS_EXPORT_WINDOW_MINUTES

**Description** : Fenêtre de temps pour compter exports
**Format** : Integer (15-1440 minutes)
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.0
**Default** : `60`

**Exemples** :
```bash
# Strict (1 heure)
DETECTION_MASS_EXPORT_WINDOW_MINUTES=60

# Standard (4 heures)
DETECTION_MASS_EXPORT_WINDOW_MINUTES=240

# Permissive (24 heures)
DETECTION_MASS_EXPORT_WINDOW_MINUTES=1440
```

---

### DETECTION_BACKUP_CONSECUTIVE_FAILURES

**Description** : Nombre de backups échoués consécutifs avant alerte
**Format** : Integer (1-10)
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.2
**Default** : `2`

**Exemples** :
```bash
# Strict (alerte immédiate)
DETECTION_BACKUP_CONSECUTIVE_FAILURES=1

# Standard
DETECTION_BACKUP_CONSECUTIVE_FAILURES=2

# Permissive
DETECTION_BACKUP_CONSECUTIVE_FAILURES=3
```

---

### FAIL_ON_HIGH

**Description** : Fail CI/CD sur vulnérabilités HIGH/CRITICAL
**Format** : Boolean (`true` | `false`)
**Priorité** : 🟠 HIGH
**EPIC** : 9.1
**Default** : `true`

**Exemples** :
```bash
# Production (strict - RECOMMENDED)
FAIL_ON_HIGH=true

# Development (permissive - NOT RECOMMENDED)
FAIL_ON_HIGH=false
```

**Impact** :
- `true` : CI/CD bloqué si vulns HIGH/CRITICAL détectées
- `false` : CI/CD continue (WARNING seulement)

---

### MAX_RECOVERY_TIME_SECONDS

**Description** : Timeout maximum pour recovery container (chaos tests)
**Format** : Integer (10-300 seconds)
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.2
**Default** : `30`

**Exemples** :
```bash
# Strict SLA (prod)
MAX_RECOVERY_TIME_SECONDS=15

# Standard
MAX_RECOVERY_TIME_SECONDS=30

# Permissive (dev/staging)
MAX_RECOVERY_TIME_SECONDS=60
```

---

### RTO_DATABASE_HOURS

**Description** : RTO (Recovery Time Objective) pour restauration DB
**Format** : Integer (1-24 hours)
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.2
**Default** : `4`

**Exemples** :
```bash
# Strict SLA
RTO_DATABASE_HOURS=2

# Standard (RGPD Art. 32)
RTO_DATABASE_HOURS=4

# Permissive
RTO_DATABASE_HOURS=8
```

**Conformité RGPD** :
- Art. 32 : Capacité à rétablir la disponibilité

---

### RPO_DATABASE_HOURS

**Description** : RPO (Recovery Point Objective) pour perte de données
**Format** : Integer (1-24 hours)
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.2
**Default** : `1`

**Exemples** :
```bash
# Strict (WAL continuous)
RPO_DATABASE_HOURS=0.25  # 15 minutes

# Standard
RPO_DATABASE_HOURS=1

# Permissive
RPO_DATABASE_HOURS=6
```

---

### BACKUP_RETENTION_HOT_DAYS

**Description** : Rétention backups hot (accès rapide)
**Format** : Integer (7-90 days)
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.2
**Default** : `30`

**Exemples** :
```bash
# Minimum RGPD
BACKUP_RETENTION_HOT_DAYS=7

# Standard
BACKUP_RETENTION_HOT_DAYS=30

# Extended
BACKUP_RETENTION_HOT_DAYS=90
```

---

### BACKUP_RETENTION_COLD_DAYS

**Description** : Rétention backups cold (archivage)
**Format** : Integer (30-365 days)
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.2
**Default** : `90`

**Exemples** :
```bash
BACKUP_RETENTION_COLD_DAYS=90  # Standard (3 mois)
BACKUP_RETENTION_COLD_DAYS=180  # Extended (6 mois)
```

---

### BACKUP_RETENTION_ARCHIVE_DAYS

**Description** : Rétention backups archive (compliance légale)
**Format** : Integer (365-3650 days)
**Priorité** : 🟡 MEDIUM
**EPIC** : 9.2
**Default** : `365`

**Exemples** :
```bash
BACKUP_RETENTION_ARCHIVE_DAYS=365   # 1 an (minimum RGPD)
BACKUP_RETENTION_ARCHIVE_DAYS=1095  # 3 ans (RGPD Art. 30, 33.5)
BACKUP_RETENTION_ARCHIVE_DAYS=3650  # 10 ans (secteur finance)
```

**Conformité RGPD** :
- Art. 30 : Registre traitements (3 ans minimum)
- Art. 33.5 : Documentation violations (3 ans minimum)

---

## 🧪 Variables de Configuration

### NODE_ENV

**Description** : Mode environnement Node.js
**Format** : `development` | `staging` | `production`
**Priorité** : 🟠 HIGH
**Default** : `production`

**Exemples** :
```bash
NODE_ENV=development  # Local dev
NODE_ENV=staging      # Pre-prod
NODE_ENV=production   # Prod
```

**Impact** :
- Error handling (stack traces vs messages génériques)
- Logging verbosity
- Hot reload (dev only)

---

### LOG_LEVEL

**Description** : Niveau de verbosité des logs
**Format** : `error` | `warn` | `info` | `debug`
**Priorité** : 🟡 MEDIUM
**Default** : `info`

**Exemples** :
```bash
LOG_LEVEL=error   # Prod (minimal)
LOG_LEVEL=warn    # Prod (recommended)
LOG_LEVEL=info    # Staging
LOG_LEVEL=debug   # Development
```

**Sécurité** :
- ⚠️ `debug` peut exposer données sensibles (dev only)

---

### PORT

**Description** : Port HTTP de l'application
**Format** : Integer (1024-65535)
**Priorité** : 🟡 MEDIUM
**Default** : `3000`

**Exemples** :
```bash
PORT=3000   # Standard Next.js
PORT=8080   # Alternative
```

---

### BOOTSTRAP_MODE

**Description** : Activer mode bootstrap (création Super Admin)
**Format** : Boolean (`true` | `false`)
**Priorité** : 🔴 CRITICAL
**Default** : `false`

**Usage** :
```bash
# Activation temporaire pour bootstrap
BOOTSTRAP_MODE=true

# APRÈS bootstrap (MANDATORY)
BOOTSTRAP_MODE=false
```

**Sécurité** :
- ✅ DÉSACTIVER immédiatement après création Super Admin
- ❌ JAMAIS laisser `true` en production

---

## 📋 Checklist Déploiement Production

### Avant le Déploiement

- [ ] Copier `.env.example` → `.env`
- [ ] Générer tous les secrets (`openssl rand -hex 32`)
- [ ] Configurer `DATABASE_URL` (sans password en clair)
- [ ] Configurer emails alerting (DPO, DevOps, Security)
- [ ] Tester connexion Slack (optionnel)
- [ ] Tester connexion PagerDuty (optionnel)
- [ ] Vérifier `FAIL_ON_HIGH=true`
- [ ] Vérifier `BOOTSTRAP_MODE=false`
- [ ] Vérifier `NODE_ENV=production`
- [ ] Vérifier `LOG_LEVEL=info` ou `warn`

### Après le Déploiement

- [ ] Vérifier backup quotidien fonctionne
- [ ] Tester alerte email (créer incident test)
- [ ] Vérifier logs ne contiennent pas de secrets
- [ ] Tester restoration backup (monthly test)
- [ ] Documenter secrets dans Vault
- [ ] Planifier rotation secrets (6 mois)

---

## 🔗 Références

| Document | Description |
|----------|-------------|
| [.env.example](.env.example) | Template complet |
| [LOT9.md](docs/implementation/LOT9.md) | Documentation EPIC 9 |
| [BACKUP_RESTORE.md](docs/runbooks/BACKUP_RESTORE.md) | Procédures backup |
| [incident.md](docs/runbooks/incident.md) | Runbook incidents RGPD |

---

**Dernière mise à jour** : 2026-01-01
**Prochaine révision** : Après EPIC 10 ou modification critique
