# Déploiement — RGPD IA Platform

> **Documentation complète** pour le déploiement et la configuration de la plateforme.

**Dernière mise à jour** : 2026-01-25
**Version** : EPIC 1-12 complets

---

## 📋 Qu'est-ce que ce dossier contient ?

Ce dossier regroupe toute la documentation nécessaire pour **déployer, configurer et maintenir** la plateforme RGPD IA en environnement de développement, staging ou production.

---

## 📁 Index des documents

| Document | Description | Audience | Criticité |
|----------|-------------|----------|-----------|
| [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) | Variables d'environnement complètes | DevOps, Dev, SRE | 🔴 **RGPD Art. 32** |

---

## 🚀 Processus de déploiement

### Étapes principales

```mermaid
graph LR
    A[1. Configuration] --> B[2. Build]
    B --> C[3. Deploy]
    C --> D[4. Vérification]
    D --> E[5. Monitoring]
```

### 1. Configuration des variables d'environnement

**Document** : [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)

Avant tout déploiement, configurez les variables d'environnement :

```bash
# Copier le template
cp .env.example .env

# Générer les secrets
openssl rand -hex 32  # SESSION_SECRET
openssl rand -hex 32  # JWT_SECRET
openssl rand -hex 32  # BOOTSTRAP_PLATFORM_SECRET
```

**Checklist** :
- [ ] `DATABASE_URL` configuré
- [ ] `SESSION_SECRET` généré (64 chars hex)
- [ ] `JWT_SECRET` généré (64 chars hex, différent de SESSION_SECRET)
- [ ] `BOOTSTRAP_PLATFORM_SECRET` généré (pour premier setup)
- [ ] Variables alerting configurées (`ALERT_SMTP_*`, `ALERT_SLACK_WEBHOOK`)

---

### 2. Environnements supportés

| Environnement | Docker Compose | Variables | Secrets |
|---------------|----------------|-----------|---------|
| **Development** | `docker-compose.dev.yml` | `.env` file | Fichier local |
| **Staging** | `docker-compose.yml` | Docker secrets | `secrets/*.txt` |
| **Production** | `docker-compose.yml` | Docker secrets + Vault | HashiCorp Vault |

---

### 3. Déploiement Development

```bash
# Démarrer l'environnement complet
docker compose -f docker-compose.dev.yml up -d

# Vérifier le status
docker compose -f docker-compose.dev.yml ps

# Voir les logs
docker compose -f docker-compose.dev.yml logs -f

# Arrêter
docker compose -f docker-compose.dev.yml down
```

**Runbook détaillé** : [docs/runbooks/docker-dev.md](../runbooks/docker-dev.md)

---

### 4. Déploiement Production

```bash
# Initialiser les secrets Docker
./scripts/docker/init-secrets.sh

# Vérification sécurité pré-déploiement
./scripts/docker/security-check.sh

# Démarrer en production
docker compose up -d

# Vérifier le status
docker compose ps
```

**Runbooks associés** :
- [docs/runbooks/bootstrap.md](../runbooks/bootstrap.md) — Initialisation plateforme
- [docs/runbooks/security-hardening.md](../runbooks/security-hardening.md) — Checklist sécurité
- [docs/runbooks/backup-policy.md](../runbooks/backup-policy.md) — Stratégie sauvegarde

---

## 🔐 Sécurité des déploiements

### Secrets Management

| Priorité | Type | Stockage Dev | Stockage Prod |
|----------|------|--------------|---------------|
| 🔴 CRITICAL | Passwords, JWT | `.env` | Docker secrets + Vault |
| 🟠 HIGH | API Keys | `.env` | Docker secrets |
| 🟡 MEDIUM | Config URLs | `.env` | Environment vars |

### Checklist pré-production

- [ ] Secrets générés (non hardcodés)
- [ ] HTTPS configuré (nginx avec TLS)
- [ ] RLS activé sur PostgreSQL
- [ ] Logs RGPD-safe (pas de PII)
- [ ] Backups configurés (RTO < 4h, RPO < 1h)
- [ ] Monitoring et alertes configurés

**Runbook complet** : [docs/runbooks/security-hardening.md](../runbooks/security-hardening.md)

---

## 📊 Post-déploiement

### Vérifications

```bash
# Santé de l'application
curl https://votre-domaine.com/api/health

# Métriques
curl https://votre-domaine.com/api/metrics

# Bootstrap status
pnpm bootstrap:status
```

### Bootstrap initial

```bash
# Créer le Super Admin (une seule fois)
pnpm bootstrap:superadmin --email "admin@example.com" --name "Admin"

# Créer un tenant
pnpm bootstrap:tenant --name "Client A" --slug "client-a"
```

**Runbook détaillé** : [docs/runbooks/bootstrap.md](../runbooks/bootstrap.md)

---

## 🔗 Liens vers autres documentations

### Runbooks (procédures opérationnelles)

| Runbook | Description |
|---------|-------------|
| [bootstrap.md](../runbooks/bootstrap.md) | Initialisation plateforme |
| [docker-dev.md](../runbooks/docker-dev.md) | Environnement de développement |
| [backup-policy.md](../runbooks/backup-policy.md) | Stratégie de sauvegarde |
| [BACKUP_RESTORE.md](../runbooks/BACKUP_RESTORE.md) | Procédures backup/restore |
| [security-hardening.md](../runbooks/security-hardening.md) | Checklist sécurité |
| [incident.md](../runbooks/incident.md) | Gestion des incidents |
| [JOBS_CRON_PII.md](../runbooks/JOBS_CRON_PII.md) | Cron jobs PII |

### Architecture

| Document | Description |
|----------|-------------|
| [BOUNDARIES.md](../architecture/BOUNDARIES.md) | Règles d'architecture |
| [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) | Classification P0-P3 |

### Observabilité

| Document | Description |
|----------|-------------|
| [LOGGING.md](../observability/LOGGING.md) | Configuration logging RGPD-safe |

### Implémentation

| Document | Description |
|----------|-------------|
| [IMPLEMENTATION_INDEX.md](../implementation/IMPLEMENTATION_INDEX.md) | Index complet des implémentations |
| [LOT6.0_IMPLEMENTATION.md](../implementation/LOT6.0_IMPLEMENTATION.md) | Docker compose prod-ready |
| [LOT6.1_IMPLEMENTATION.md](../implementation/LOT6.1_IMPLEMENTATION.md) | Observabilité RGPD-safe |

---

## 🔒 Conformité RGPD

### Articles concernés

| Article | Exigence | Document |
|---------|----------|----------|
| **Art. 32** | Mesures de sécurité techniques | [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) |
| **Art. 32** | Disponibilité et résilience | [backup-policy.md](../runbooks/backup-policy.md) |
| **Art. 32** | Chiffrement des données | [security-hardening.md](../runbooks/security-hardening.md) |

### Points critiques

- ✅ Secrets jamais hardcodés dans le code
- ✅ Variables sensibles via Docker secrets en production
- ✅ Rotation des secrets planifiée (6 mois)
- ✅ Logs sans données personnelles (PII)
- ✅ Backups chiffrés

---

## 📅 Maintenance

| Action | Fréquence | Responsable |
|--------|-----------|-------------|
| Rotation secrets | 6 mois | DevOps + RSSI |
| Mise à jour images Docker | Mensuel | DevOps |
| Vérification backups | Hebdomadaire | DevOps |
| Audit sécurité | Trimestriel | RSSI |
| Test restauration | Mensuel | DevOps |

---

## 🔗 Références

| Document | Description |
|----------|-------------|
| [TASKS.md](../../TASKS.md) | Roadmap par EPIC/LOT |
| [CLAUDE.md](../../CLAUDE.md) | Constitution du projet |
| [docker-compose.yml](../../docker-compose.yml) | Configuration Docker production |
| [docker-compose.dev.yml](../../docker-compose.dev.yml) | Configuration Docker développement |
| [Dockerfile](../../Dockerfile) | Image Docker production |
| [Dockerfile.dev](../../Dockerfile.dev) | Image Docker développement |

---

**Maintenu par** : Équipe DevOps/SRE
**Dernière mise à jour** : 2026-01-25
**Version** : 2.0 (EPIC 1-12)
