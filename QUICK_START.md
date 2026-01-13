# Cheatsheet du Projet — Actions rapides

> **Référence rapide** : "Que dois-je faire?" → "Voilà comment"

**Dernière mise à jour** : 2026-01-13

---

## 📍 Situation actuelle du projet

```
Status:    ✅ EPIC 1-11 COMPLÉTÉS (100%)
           🟡 EPIC 12 EN COURS (LOT 12.0-12.2 ✅)
           ❌ EPIC 13-14 TODO
Lines:     ~8,000+ lignes code
Tests:     720+ tests RGPD passing (191 fichiers)
Coverage:  ~85-90%
Version:   1.1 (Backend + Legal + Back Office Super Admin)
```

---

## 🎯 "Je veux..." — Trouver la réponse rapide

### Pour les DÉVELOPPEURS

| Je veux... | Fichier à consulter | Commande |
|-----------|-------------------|----------|
| Comprendre l'archi | `docs/architecture/BOUNDARIES.md` | - |
| Voir ce qui existe | `docs/implementation/IMPLEMENTATION_INDEX.md` | - |
| Lancer localement | `docs/runbooks/docker-dev.md` | `docker-compose -f docker-compose.dev.yml up` |
| Ajouter une nouvelle API | `src/app/usecases/` (copier pattern) | `pnpm dev` |
| Lancer les tests | `tests/rgpd.*.test.ts` | `npm test` |
| Déboguer la BD | `scripts/check-rls.ts` | `pnpm check-rls` |
| Voir les logs | `src/infrastructure/logging/logger.ts` | `docker logs -f` |

### Pour les DEVOPS

| Je veux... | Fichier à consulter | Commande |
|-----------|-------------------|----------|
| Démarrer la plateforme | `docs/runbooks/bootstrap.md` | `pnpm bootstrap:superadmin --email "..."` |
| Premier tenant | `docs/runbooks/bootstrap.md` | `pnpm bootstrap:tenant --name "..."` |
| Deployer en production | `docs/runbooks/security-hardening.md` | Lire checklist |
| Configurer variables env | `docs/deployment/ENVIRONMENT_VARIABLES.md` | Créer `.env` |
| Backup BD | `docs/runbooks/backup-policy.md` | `pg_dump -Fc rgpd_platform > backup.dump` |
| Restaurer BD | `docs/runbooks/BACKUP_RESTORE.md` | `pg_restore -d rgpd_platform backup.dump` |
| Vérifier sécurité | `docs/runbooks/security-hardening.md` | Lire checklist |
| Purger données anciennes | `scripts/purge.ts` | `pnpm purge` |

### Pour les DPO / RSSI

| Je veux... | Fichier à consulter | Situation |
|-----------|-------------------|-----------|
| Comprendre la conformité | `docs/rgpd/registre-traitements.md` | Audit CNIL |
| Gestion incident critique | `docs/runbooks/incident.md` | ⚠️ Violation données |
| Notifier CNIL (72h) | `docs/runbooks/incident.md` | ⚠️ Violation haute |
| Répondre à CNIL | `docs/runbooks/CNIL_COOPERATION.md` | Demande info |
| Preuves de conformité | `docs/audit/evidence.md` | Audit |
| DPIA (analyse d'impact) | `docs/rgpd/dpia.md` | Évaluation risque |

---

## 🗂️ Structure du projet simplifié

```
├── src/                        # Code métier (ce que le système fait)
│   ├── app/auth/              # Authentification + RBAC
│   ├── app/usecases/          # Logique métier (consent, delete, export)
│   ├── domain/                # Règles RGPD (business rules)
│   ├── infrastructure/        # BD, logs, alerts, PII
│   └── middleware/            # Middleware HTTP
│
├── app/api/                   # API HTTP endpoints
│   ├── users/                 # Gestion utilisateurs
│   ├── ai/invoke/             # Appel LLM
│   ├── consents/              # Consent RGPD
│   ├── rgpd/delete/           # Effacement données
│   ├── incidents/             # Gestion incidents (EPIC 9)
│   └── health/                # Santé de l'app
│
├── migrations/                # Evolution BD (exécutées auto au boot)
│   ├── 001_init.sql           # Tables initiales
│   ├── 002_lot4_*.sql         # Consents + ai_jobs
│   ├── 014_incidents.sql      # Incidents (EPIC 9)
│   └── README.md
│
├── scripts/                   # Outils manuels (vous les lancez)
│   ├── bootstrap.ts           # Créer SuperAdmin + tenant
│   ├── migrate.ts             # Appliquer migrations
│   ├── purge.ts               # Purger données
│   ├── docker/                # Scripts déploiement
│   ├── security/              # Scans sécurité
│   └── chaos/                 # Tests résilience
│
├── docs/
│   ├── runbooks/              # Procédures vous (lisez + exécutez)
│   │   ├── bootstrap.md       # Initialisation
│   │   ├── incident.md        # ⚠️ Gestion incidents
│   │   ├── BACKUP_RESTORE.md  # Restauration
│   │   └── ...
│   │
│   ├── implementation/        # Ce qui a été fait
│   │   ├── IMPLEMENTATION_INDEX.md
│   │   └── LOT*.md
│   │
│   ├── deployment/            # Déploiement
│   │   └── ENVIRONMENT_VARIABLES.md
│   │
│   ├── architecture/          # Règles design
│   │   └── BOUNDARIES.md
│   │
│   ├── rgpd/                  # Conformité
│   │   ├── registre-traitements.md
│   │   └── dpia.md
│   │
│   └── audit/                 # Preuves audit
│       └── evidence.md
│
├── tests/                     # 492+ tests RGPD
│   ├── rgpd.*.test.ts        # Tests conformité RGPD
│   ├── domain.*.test.ts      # Tests domain entities
│   ├── repository.*.test.ts  # Tests repositories
│   ├── usecase.*.test.ts     # Tests use-cases
│   ├── api.*.test.ts         # Tests API
│   ├── legal.*.test.ts       # Tests pages légales (EPIC 10)
│   ├── db.*.test.ts          # Tests isolation DB
│   └── ...
│
├── ARCHITECTURE_GUIDE.md      # 👈 LISEZ MOI EN PREMIER
├── TASKS.md                   # Roadmap par EPIC/LOT
├── CLAUDE.md                  # Règles développement
└── docker-compose.dev.yml     # Environnement dev
```

---

## 🔄 Flux d'utilisation typiques

### Scénario 1 : Vous êtes nouveau dev

```
1. Lire ARCHITECTURE_GUIDE.md
2. Lire docs/architecture/BOUNDARIES.md
3. Lancer docs/runbooks/docker-dev.md
4. Explorer src/ en lisant les commentaires
5. Lancer tests: npm test
```

### Scénario 2 : Vous déployez en production

```
1. Lire ARCHITECTURE_GUIDE.md
2. Préparer variables: docs/deployment/ENVIRONMENT_VARIABLES.md
3. Checklist sécurité: docs/runbooks/security-hardening.md
4. Lancer bootstrap: pnpm bootstrap:superadmin
5. Créer premier tenant: pnpm bootstrap:tenant
6. Vérifier: curl https://votre-domaine.com/api/health
```

### Scénario 3 : Il y a un incident sécurité

```
1. Alerte reçue (Slack/Email)
2. Lire docs/runbooks/incident.md
3. Évaluer risque (grille fournie)
4. Si CNIL notification requise:
   - Notifier CNIL < 72h
   - Template fourni
5. Si risque élevé, notifier utilisateurs
6. Enregistrer incident (table DB)
```

### Scénario 4 : Vous devez restaurer après crash

```
1. Lire docs/runbooks/BACKUP_RESTORE.md
2. Restaurer BD: pg_restore -d rgpd_platform backup.dump
3. Redémarrer code: docker-compose up -d
4. Vérifier santé: curl /api/health
5. Valider RTO < 4h, RPO < 1h
```

---

## 📚 Documents clés par situation

### Avant de commencer à développer
- [ ] Lire `ARCHITECTURE_GUIDE.md`
- [ ] Lire `docs/architecture/BOUNDARIES.md`
- [ ] Voir `docs/implementation/IMPLEMENTATION_INDEX.md` (ce qui existe)

### Avant déploiement production
- [ ] Lire `docs/runbooks/security-hardening.md`
- [ ] Configurer `docs/deployment/ENVIRONMENT_VARIABLES.md`
- [ ] Lancer `docs/runbooks/bootstrap.md`
- [ ] Configurer backups (`docs/runbooks/backup-policy.md`)

### En cas d'incident critique
- [ ] Lire `docs/runbooks/incident.md`
- [ ] Évaluer risque (grille fournie)
- [ ] Notifier CNIL si nécessaire (< 72h)
- [ ] Post-mortem avec `docs/runbooks/incident.md`

### Audit CNIL prévu
- [ ] Lire `docs/audit/evidence.md`
- [ ] Collecter logs: `scripts/audit/audit-collect.sh`
- [ ] Vérifier `docs/rgpd/registre-traitements.md`
- [ ] Préparer `docs/rgpd/dpia.md`

---

## ✅ Checklist : Est-ce que je suis prêt ?

### Pour développer
- [ ] ARCHITECTURE_GUIDE.md lu
- [ ] BOUNDARIES.md lu
- [ ] docker-compose.dev.yml lancé
- [ ] Premiers tests passent

### Pour déployer
- [ ] security-hardening.md validé (tous checkboxes ✅)
- [ ] ENVIRONMENT_VARIABLES.md configuré
- [ ] Backup-policy.md mis en place
- [ ] Tests en staging réussis

### Pour audits RGPD
- [ ] registre-traitements.md à jour
- [ ] dpia.md validée
- [ ] evidence.md préparée
- [ ] incident.md testée (exercice annuel)

---

## 🔗 Liens directs vers les documents clés

| Document | Lien | Quand |
|----------|------|-------|
| **Ce que vous lisez maintenant** | [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) | Comprendre l'architecture |
| Architecture code | [docs/architecture/BOUNDARIES.md](docs/architecture/BOUNDARIES.md) | Avant de développer |
| Ce qui existe | [docs/implementation/IMPLEMENTATION_INDEX.md](docs/implementation/IMPLEMENTATION_INDEX.md) | Avant d'ajouter une feature |
| Démarrage | [docs/runbooks/bootstrap.md](docs/runbooks/bootstrap.md) | Créer premier SuperAdmin |
| Sécurité | [docs/runbooks/security-hardening.md](docs/runbooks/security-hardening.md) | Avant la prod |
| Incident ⚠️ | [docs/runbooks/incident.md](docs/runbooks/incident.md) | Urgence sécurité |
| Backup/Restore | [docs/runbooks/BACKUP_RESTORE.md](docs/runbooks/BACKUP_RESTORE.md) | Restaurer après crash |
| Variables env | [docs/deployment/ENVIRONMENT_VARIABLES.md](docs/deployment/ENVIRONMENT_VARIABLES.md) | Configuration prod |
| RGPD | [docs/rgpd/registre-traitements.md](docs/rgpd/registre-traitements.md) | Audit CNIL |

---

## 🆘 Questions fréquentes

### Q: "Où trouver une API spécifique?"
**A**: `app/api/*/route.ts` ou `grep -r "POST /api/..." docs/implementation/`

### Q: "Comment ajouter une nouvelle fonctionnalité?"
**A**: 
1. Lire `docs/architecture/BOUNDARIES.md`
2. Créer `src/app/usecases/votrefonctionnalite/`
3. Créer `app/api/votrefonctionnalite/route.ts`
4. Ajouter tests `tests/votrefonctionnalite.test.ts`

### Q: "Qu'est-ce qu'un runbook?"
**A**: Document écrit pour **vous** (pas du code) listant pas-à-pas comment faire une tâche critique

### Q: "Qui exécute les migrations?"
**A**: **Le code automatiquement** au démarrage. Vous ne lancez rien manuellement.

### Q: "Qu'est-ce qui reste à faire?"
**A**: EPIC 10-13 (interfaces admin/user). Voir `TASKS.md` pour détails.

---

**Dernière mise à jour** : 2026-01-02
**Maintenu par** : Claude Code (Sonnet 4.5)
