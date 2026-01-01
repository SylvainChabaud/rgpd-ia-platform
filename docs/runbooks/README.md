# Runbooks — RGPD IA Platform

> **Procédures opérationnelles** pour l'exploitation et la maintenance de la plateforme.

**Dernière mise à jour** : 2026-01-02
**Version** : EPIC 9 complet

---

## 📋 Qu'est-ce qu'un runbook ?

Un **runbook** est une procédure documentée qui décrit **pas à pas** comment effectuer une tâche opérationnelle critique. Ces documents sont essentiels pour :

- **Standardisation** : Tous exécutent les mêmes étapes, même sous pression
- **Continuité** : Le savoir-faire est préservé si une personne quitte l'équipe
- **Conformité RGPD** : Art. 32 exige des procédures de sécurité documentées
- **Audit-ready** : Preuves de conformité pour contrôle CNIL

---

## 📁 Liste des runbooks

| Document | LOT | Description | Audience | Criticité |
|----------|-----|-------------|----------|-----------|
| [bootstrap.md](bootstrap.md) | LOT 1.0 | Initialisation plateforme (SuperAdmin, tenants) | DevOps, Dev | ✅ Essentiel |
| [docker-dev.md](docker-dev.md) | LOT 2.1 | Environnement de développement Docker | Dev | ✅ Essentiel |
| [backup-policy.md](backup-policy.md) | LOT 2.0 | Stratégie de sauvegarde et restauration | DevOps, RSSI | 🔴 **RGPD Art. 32** |
| [BACKUP_RESTORE.md](BACKUP_RESTORE.md) | **LOT 9.2** | Procédures backup/restore complètes (RTO/RPO) | DevOps, SRE | 🔴 **RGPD Art. 32** |
| [security-hardening.md](security-hardening.md) | LOT 2.0 | Checklist sécurité production | DevOps, RSSI | 🔴 **RGPD Art. 32** |
| [incident.md](incident.md) | **LOT 9.0** | Gestion des violations de données (72h CNIL) | DPO, RSSI, DevOps | 🔴 **RGPD Art. 33-34** |
| [JOBS_CRON_PII.md](JOBS_CRON_PII.md) | EPIC 4 | Opération des cron jobs PII (anonymisation, scan) | DevOps, SRE | 🔴 **RGPD Art. 5, 32** |
| [CNIL_COOPERATION.md](CNIL_COOPERATION.md) | EPIC 7 | Procédure de coopération avec la CNIL | DPO, RSSI | 🔴 **RGPD Art. 31** |

---

## 🎯 Quand utiliser chaque runbook ?

### `bootstrap.md` — Initialisation plateforme

**Quand** :
- ✅ Premier déploiement en production
- ✅ Création d'un nouveau tenant (client)
- ✅ Setup d'un environnement de dev/test

**Qui** : DevOps, Développeurs

**Commandes clés** :
```bash
pnpm bootstrap:status                    # Vérifier état
pnpm bootstrap:superadmin --email "..."  # Créer SuperAdmin (une seule fois)
pnpm bootstrap:tenant --name "..." --slug "..."  # Créer tenant
```

---

### `docker-dev.md` — Environnement de développement

**Quand** :
- ✅ Arrivée d'un nouveau développeur (onboarding)
- ✅ Setup d'un nouveau poste de travail
- ✅ Dépannage environnement local

**Qui** : Développeurs

**Commandes clés** :
```bash
docker compose -f docker-compose.dev.yml up -d      # Démarrer
docker compose -f docker-compose.dev.yml logs -f    # Voir logs
docker compose -f docker-compose.dev.yml down       # Arrêter
```

---

### `backup-policy.md` — Stratégie de sauvegarde

**Quand** :
- ✅ Configuration initiale d'un serveur de production
- ✅ Audit annuel de conformité
- ✅ Incident nécessitant restauration

**Qui** : DevOps, RSSI, DPO (validation)

**Contenus clés** :
- Classification des données à sauvegarder (P0-P3)
- Fréquence des backups (quotidien, horaire)
- Rétention (30j hot, 90j cold, 1 an archive)
- Procédure de restauration

**Obligation RGPD** : Art. 32 — Mesures techniques garantissant disponibilité et résilience

---

### `BACKUP_RESTORE.md` — Procédures backup/restore (RTO/RPO) ⚠️

**Quand** :
- 🚨 **Restauration après crash/incident** (urgence)
- ✅ Test mensuel de restauration (validation RTO/RPO)
- ✅ Après un incident majeur (post-mortem)
- ✅ Audit de conformité (preuve de résilience)

**Qui** : DevOps, SRE, RSSI (validation)

**Contenus clés** :
- Procédure de sauvegarde complète (DB, fichiers, secrets)
- Procédure de restauration pas à pas
- Validation RTO < 4h, RPO < 1h
- Tests de restauration (checklist)
- Rollback et recovery

**Commandes clés** :
```bash
# Backup manuel
pg_dump -Fc rgpd_platform > backup_$(date +%Y%m%d).dump

# Restauration
pg_restore -d rgpd_platform backup_20260101.dump

# Vérification intégrité
pnpm db:verify
```

**Obligation RGPD** : Art. 32 — Capacité de rétablir la disponibilité et l'accès aux données

---

### `security-hardening.md` — Checklist sécurité

**Quand** :
- ✅ **AVANT** chaque mise en production (obligatoire)
- ✅ Audit de sécurité périodique (trimestriel)
- ✅ Après un incident de sécurité

**Qui** : DevOps, RSSI

**Contenus clés** :
- SSH hardening (clés, no root)
- Firewall (ports minimaux)
- PostgreSQL hardening (TLS, chiffrement, privilèges)
- Gestion des secrets (Vault)
- Monitoring et alertes

**Obligation RGPD** : Art. 32 — Mesures techniques de sécurité appropriées

---

### `incident.md` — Gestion des incidents RGPD ⚠️

**Quand** :
- 🚨 **En cas de violation de données** (urgence)
- ✅ Exercice de simulation annuel
- ✅ Formation équipe DPO/RSSI

**Qui** : DPO, RSSI, DevOps (astreinte)

**Contenus clés** :
- Définition d'une violation (Art. 4)
- Alertes automatiques configurées
- Timeline de réponse (T+0 → T+72h)
- Grille d'évaluation des risques
- Templates de notification CNIL
- Checklist complète

**Obligation RGPD** :
- Art. 33 — Notification CNIL sous 72h
- Art. 34 — Notification aux personnes si risque élevé

---

### `JOBS_CRON_PII.md` — Cron jobs PII (anonymisation)

**Quand** :
- ✅ Configuration initiale des cron jobs
- ✅ Dépannage des jobs PII
- ✅ Maintenance et monitoring quotidien

**Qui** : DevOps, SRE, Équipe sécurité

**Contenus clés** :
- Job 1: Anonymisation des adresses IP (03:00 UTC quotidien)
- Job 2: Scan des logs PII (04:00 UTC quotidien)
- Monitoring et alertes
- Procédure de restauration

**Obligation RGPD** :
- Art. 5 — Rétention et purge des données
- Art. 32 — Mesures techniques de sécurité

---

### `CNIL_COOPERATION.md` — Coopération CNIL

**Quand** :
- ✅ Suite à une demande d'information de la CNIL
- ✅ Audit/contrôle CNIL
- ✅ Notification d'incident grave

**Qui** : DPO, RSSI, Direction

**Contenus clés** :
- Procédure de réception des demandes CNIL
- Timeline de réponse (obligation 30-45 jours)
- Préparation de dossiers d'audit
- Escalade interne
- Templates de correspondance

**Obligation RGPD** : Art. 31 — Coopération avec l'autorité de contrôle

---

## 📊 Matrice d'utilisation

| Situation | Runbook à utiliser |
|-----------|-------------------|
| Nouveau développeur arrive | `docker-dev.md` |
| Premier déploiement production | `bootstrap.md` → `security-hardening.md` |
| Nouveau client/tenant | `bootstrap.md` |
| Maintenance planifiée | `backup-policy.md` |
| Cron job PII à configurer/dépanner | `JOBS_CRON_PII.md` |
| Incident de sécurité / violation données | `incident.md` → `CNIL_COOPERATION.md` |
| Demande d'information CNIL | `CNIL_COOPERATION.md` |
| Audit CNIL | Tous (preuves de conformité) |
| Restauration après crash | `BACKUP_RESTORE.md` |
| Test mensuel RTO/RPO | `BACKUP_RESTORE.md` |
| Violation données détectée (72h) | `incident.md` → `CNIL_COOPERATION.md` |
| Post-mortem incident | `incident.md` + `BACKUP_RESTORE.md` |

---

## 🔒 Conformité RGPD

### Articles couverts

| Article | Exigence | Runbook |
|---------|----------|---------|
| **Art. 5** | Rétention et purge des données | `JOBS_CRON_PII.md`, `backup-policy.md` |
| **Art. 31** | Coopération avec l'autorité de contrôle | `CNIL_COOPERATION.md` |
| **Art. 32** | Mesures de sécurité techniques | `security-hardening.md`, `backup-policy.md`, `BACKUP_RESTORE.md`, `JOBS_CRON_PII.md` |
| **Art. 33** | Notification CNIL (72h) | `incident.md` |
| **Art. 34** | Notification aux personnes | `incident.md` |

### Preuves pour audit CNIL

Ces runbooks constituent des **preuves documentaires** de conformité :

- ✅ Procédures de sécurité formalisées (Art. 32)
- ✅ Procédure de notification des violations (Art. 33-34)
- ✅ Politique de sauvegarde (disponibilité, résilience)
- ✅ Procédures de restauration testées (RTO/RPO) — **EPIC 9**
- ✅ Checklist de durcissement (sécurité)
- ✅ Registre des incidents de sécurité (Art. 33.5) — **EPIC 9**

---

## 📅 Maintenance des runbooks

| Action | Fréquence | Responsable |
|--------|-----------|-------------|
| Relecture et mise à jour | Trimestrielle | DevOps + DPO |
| Test procédure restoration | Mensuel | DevOps |
| Exercice simulation incident | Annuel | DPO + RSSI |
| Revue checklist sécurité | Après chaque déploiement | DevOps |

---

## 🔗 Références

| Document | Description |
|----------|-------------|
| [TASKS.md](../../TASKS.md) | Roadmap par EPIC/LOT |
| [CLAUDE.md](../../CLAUDE.md) | Constitution du projet |
| [BOUNDARIES.md](../architecture/BOUNDARIES.md) | Règles d'architecture |
| [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) | Classification P0-P3 |
| [registre-traitements.md](../rgpd/registre-traitements.md) | Registre des traitements (Art. 30) |
| [dpia.md](../rgpd/dpia.md) | Analyse d'impact Gateway LLM (Art. 35) |
