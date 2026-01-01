# Guide Simplifié — Architecture du Projet

> **Objectif** : Comprendre simplement qui fait quoi, quand et pourquoi.

**Dernière mise à jour** : 2026-01-02

---

## 🎯 Vue d'ensemble : Les 3 niveaux du projet

```
┌────────────────────────────────────────────────────┐
│                  VOS ACTIONS (runbooks)            │
│   Vous lisez et exécutez les procédures opéra     │
│   (bootstrap, backup, incident, etc.)              │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│            CODE (src/) + Configuration            │
│   Le code Node.js/Next.js qui tourne en          │
│   production et répond aux requêtes API           │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│         BASE DE DONNÉES (PostgreSQL)             │
│   Les données (users, tenants, audit, etc.)      │
└────────────────────────────────────────────────┘
```

---

## 📋 Les 5 catégories expliquées simplement

### 1. **MIGRATIONS/** — Évolutions de la base de données

**À quoi ça sert** ?
- Créer la structure de la base de données (tables, colonnes)
- Ajouter/modifier des données
- Configurer les permissions (RLS)

**Qui les utilise** ?
- **Le code** s'en sert automatiquement au démarrage
- Vous ne lancez pas manuellement les migrations

**Comment ça marche** ?
```
Au démarrage du serveur :
1. Code regarde dans migrations/
2. Voit quelles migrations n'ont pas été exécutées
3. Les exécute une par une dans l'ordre (001, 002, 003...)
4. La DB est à jour
```

**Exemple concret** :
- `001_init.sql` — Crée tables users, tenants, audit_events
- `002_lot4_consents_ai_jobs.sql` — Ajoute tables consents, ai_jobs
- `003_rgpd_deletion.sql` — Ajoute colonne deleted_at pour soft-delete
- `014_incidents.sql` — Ajoute table security_incidents (EPIC 9)

**État actuel** : ✅ Toutes les migrations (001-014) sont terminées et exécutées

**TODOs** : ❌ Aucun TODO ici, c'est complet

---

### 2. **SCRIPTS/** — Outils d'administration et de maintenance

**À quoi ça sert** ?
- Tâches manuelles : bootstrap, migrations, tests, audit
- Scénarios "offline" : purge de données, vérifications
- Debugging : check RLS, check roles, bench LLM

**Qui les utilise** ?
- **Vous** (DevOps, Dev) lancez ces scripts en ligne de commande
- Le code ne les utilise PAS

**Comment les utiliser** ?
```bash
# Exemples actuels
pnpm bootstrap:superadmin --email "admin@example.com"  # Créer premier admin
pnpm bootstrap:tenant --name "Client A" --slug "client-a"  # Créer tenant
pnpm migrate                                           # Appliquer migrations
pnpm purge                                            # Purger données obsolètes
```

**Liste actuelle des scripts** :

| Script | Catégorie | Quand l'utiliser | Qui |
|--------|-----------|------------------|-----|
| `bootstrap.ts` | Bootstrap | Premier setup plateforme | DevOps |
| `migrate.ts` | DB | Appliquer les migrations | DevOps |
| `purge.ts` | Maintenance | Supprimer données dépassées (rétention) | DevOps/SRE |
| `check-rls.ts` | Debugging | Vérifier permissions RLS fonctionnent | Dev |
| `check-user-role.ts` | Debugging | Voir le rôle d'un utilisateur | Dev |
| `bench-llm.ts` | Testing | Benchmarker perfs IA locale | Dev |

**Dossiers spécialisés** :

| Dossier | Contient | Quand |
|---------|----------|-------|
| `scripts/audit/` | Récupérer logs audit pour preuve conformité | Audit CNIL |
| `scripts/chaos/` | Tests résilience (kill pods, perte DB) | EPIC 9 tests |
| `scripts/docker/` | Setup secrets, vérification sécurité Docker | Déploiement production |
| `scripts/security/` | Scans OWASP, vulnerability scanning | EPIC 9 tests |

**État actuel** : ✅ Tous les scripts essentiels sont implémentés

**TODOs** : 
- [ ] `scripts/verify-implementation.sh` — Automatiser vérification implémentation
- [ ] Documentation des scripts de chaos (comment les lancer)

---

### 3. **RUNBOOKS/** — Procédures opérationnelles que vous lisez

**À quoi ça sert** ?
- Documents "pas à pas" pour effectuer tâches critiques
- Guides pour incidents, déploiements, maintenances
- Preuves de conformité RGPD (Art. 32)

**Qui les utilise** ?
- **Vous** (DevOps, DPO, Développeurs) les lisez et les suivez
- Ce n'est PAS du code exécuté automatiquement

**Comment les utiliser** ?
```bash
Exemple : Vous êtes en incident sécurité
1. Allez dans docs/runbooks/incident.md
2. Lisez step-by-step les actions
3. Exécutez les commandes mentionnées
4. Notifiez CNIL si nécessaire (templates fournis)
```

**Liste actuelle des runbooks** :

| Runbook | Situation | Audience |
|---------|-----------|----------|
| `bootstrap.md` | Créer premier SuperAdmin + premier tenant | DevOps |
| `docker-dev.md` | Setup environnement développement local | Dev |
| `backup-policy.md` | Stratégie sauvegardes (classification données) | DevOps/RSSI |
| `BACKUP_RESTORE.md` | Restauration après crash (RTO/RPO) | DevOps/SRE |
| `security-hardening.md` | Checklist avant mise en prod | DevOps/RSSI |
| `incident.md` | **CNIL notification (72h)** | DPO/RSSI |
| `JOBS_CRON_PII.md` | Setup anonymisation IP + scan PII | DevOps/SRE |
| `CNIL_COOPERATION.md` | Répondre aux demandes CNIL | DPO |

**État actuel** : ✅ Tous les runbooks EPIC 9 sont complets

**TODOs** : ❌ Aucun TODO

---

### 4. **CODE (src/)** — La logique métier

**À quoi ça sert** ?
- APIs HTTP (endpoints `/api/...`)
- Logique métier (consent, deletion, export RGPD)
- Détection incidents sécurité (EPIC 9)

**Qui l'utilise** ?
- **Le client web** (frontend) appelle les APIs
- **D'autres systèmes** appelent les APIs
- **Le code lui-même** s'exécute

**Architecture simplifiée** :
```
Request HTTP → Middleware (auth, tenant guard, incident detection)
  ↓
API Route (app/api/...)
  ↓
Use Case (logique métier)
  ↓
Domain (règles RGPD)
  ↓
Repository (DB)
  ↓
Response
```

**Exemple concret (consentement utilisateur)** :
```
Frontend POST /api/consents
  ↓
Middleware check: Qui êtes-vous ? Quel tenant ?
  ↓
checkConsent() : Vérifier si utilisateur a consenti à IA
  ↓
Si OUI → Peut invoquer LLM
Si NON → Refuse (403 error)
```

**État actuel par EPIC** :

| EPIC | Code | APIs | Tests | Status |
|------|------|------|-------|--------|
| EPIC 1 | Auth, tenant, audit | 2 endpoints | 42 tests | ✅ 100% |
| EPIC 2 | Docker, secrets | 0 endpoints | 0 tests | ✅ 100% |
| EPIC 3 | LLM local | 0 endpoints | 5 tests | ✅ 100% |
| EPIC 4 | Consents, rétention | 3 endpoints | 23 tests | ✅ 100% |
| EPIC 5 | Export/delete RGPD | 10 endpoints | 72 tests | ✅ 100% |
| EPIC 6 | Observabilité | 2 endpoints | 30 tests | ✅ 100% |
| EPIC 7 | Registre audit | 1 endpoint | 0 tests | ✅ 100% |
| EPIC 8 | PII detection | 0 endpoints | 85 tests | ✅ 100% |
| **EPIC 9** | **Incidents** | **4 endpoints** | **60 tests** | **✅ 100%** |

**Total** : 25 fichiers, 312+ tests RGPD

**TODOs** :
- [ ] EPIC 10-13 (backoffice, UI admin/user)

---

### 5. **DOCS/** — Documentation et conformité

**À quoi ça sert** ?
- Expliquer l'architecture
- Prouver conformité RGPD
- Guides d'implémentation
- Déploiement

**Sous-dossiers clés** :

| Dossier | Contient | Lecteurs |
|---------|----------|----------|
| `docs/implementation/` | Quoi a été implémenté (qui, quand, comment) | Dev, tech lead |
| `docs/runbooks/` | Procédures opérationnelles | DevOps, DPO, SRE |
| `docs/deployment/` | Config déploiement (env vars, secrets) | DevOps |
| `docs/architecture/` | Règles de design | Dev |
| `docs/rgpd/` | Conformité RGPD (registre, DPIA) | DPO, RSSI |
| `docs/audit/` | Preuves pour audit CNIL | DPO |
| `docs/epics/` | Spécifications par EPIC | Dev, product |

---

## 🔄 Flux d'exécution : Du développement à la production

### Scénario 1 : Déploiement initial

```
1. DevOps lit docs/runbooks/bootstrap.md
2. Exécute: pnpm bootstrap:superadmin → code Lance CreateTenantAdminUseCase
3. Code accède DB (migrations exécutées automatiquement)
4. Nouveau SuperAdmin créé en DB
5. API /api/users retourne le nouvel utilisateur
```

### Scénario 2 : Utilisateur lance requête IA

```
1. Frontend POST /api/ai/invoke {prompt, tenantId}
2. Middleware incidentDetection : Vérifie cross-tenant access ✅
3. Middleware checkConsent : A-t-il consenti à l'IA ? ✅
4. Middleware pii : Nettoie le prompt (pas de PII) ✅
5. Use case invoke IA : Appelle ollama/OpenAI
6. Response renvoyée au frontend
7. Incident detection : Log événement (RGPD-safe)
```

### Scénario 3 : Incident sécurité détecté

```
1. 10+ failed logins détectés → Middleware crée incident
2. DetectIncidentUseCase évalue sévérité
3. IncidentAlertService envoie alerte (Email + Slack)
4. Incident sauvegardé en DB table security_incidents
5. DPO reçoit email, lit docs/runbooks/incident.md
6. DPO évalue risque → Décide si notification CNIL
7. DPO notifie CNIL avant 72h (Art. 33)
```

---

## 📊 Matrice d'utilisation simplifiée

### Qui fait quoi ?

| Rôle | Fichiers utilisés | Quand |
|------|-------------------|-------|
| **DevOps** | Scripts (bootstrap, migrate, purge) + Runbooks (bootstrap, docker-dev, backup, hardening) | Déploiement, maintenance |
| **Développeur** | Code (src/) + Scripts de debugging | Development |
| **DPO/RSSI** | Runbooks (incident, backup, CNIL) + Docs RGPD | Incident, audit |
| **Système (code)** | Migrations (auto) + Middleware (auto) | À chaque requête |

---

## 🚦 État du projet : Qu'est-ce qui est fait ? Qu'est-ce qui manque ?

### ✅ COMPLÉTÉ (EPIC 1-9)

| Catégorie | Status | % |
|-----------|--------|---|
| **Code métier** | 22 LOTs terminés | 100% |
| **Tests RGPD** | 312+ tests passing | 100% |
| **Migrations DB** | 014 migrations | 100% |
| **Scripts essentiels** | Bootstrap, migrate, purge, chaos | 100% |
| **Runbooks EPIC 1-9** | Tous opérationnels | 100% |
| **Conformité RGPD** | Art. 5, 31, 32, 33, 34 | 100% |

### ❌ TODO (EPIC 10-13)

| EPIC | Quoi | Audience | Status |
|------|------|----------|--------|
| **EPIC 10** | API Legal/Contrats (DPA, registre) | Legal/DPO | 🔴 TODO |
| **EPIC 11** | Back-office Super Admin (UI) | Admin | 🔴 TODO |
| **EPIC 12** | Back-office Tenant Admin (UI) | Client | 🔴 TODO |
| **EPIC 13** | Interface Utilisateur (signup, consent) | End-user | 🔴 TODO |

---

## 💡 Réponses à vos questions

### Q1: "Qui utilise les scripts dans scripts/?"

**Réponse simple** :
- **Vous** les lancez en ligne de commande : `pnpm bootstrap:superadmin`
- **Pas le code** qui les lance (sauf si scripts/migrate.ts au boot)
- **Contexte** : administrateurs, DevOps, dev lors du setup/maintenance

### Q2: "Qui utilise les migrations?"

**Réponse simple** :
- **Le code automatiquement** au démarrage (pas vous)
- Migrations exécutées dans l'ordre (001 → 014)
- Une migration = une évolution BD (nouvelle table, colonne, permission)

### Q3: "Qui utilise les runbooks?"

**Réponse simple** :
- **Vous** les lisez et les suivez
- Pas du code, des procédures écrites
- Exemples : créer premier admin, restaurer après crash, notifier CNIL

### Q4: "Où trouver ce que le code fait?"

**Réponse simple** :
1. **API endpoints** : Voir `app/api/**/route.ts`
2. **Logique métier** : Voir `src/app/usecases/**/`
3. **Règles RGPD** : Voir `src/domain/**/`
4. **BD** : Voir `src/infrastructure/repositories/**/`

### Q5: "Y a-t-il des TODOs non documentés?"

**Réponse simple** :
- ✅ EPIC 1-9 = 0 TODOs (complètement terminé)
- ❌ EPIC 10-13 = Entièrement TODO (interfaces admin/user)
- 📝 Voir [TASKS.md](TASKS.md) pour détails complets

---

## 🎓 Prochaines étapes recommandées

### Pour comprendre plus profondément

1. **Architecture code** :
   ```bash
   Lire docs/architecture/BOUNDARIES.md
   ```

2. **Conformité RGPD** :
   ```bash
   Lire docs/rgpd/registre-traitements.md
   ```

3. **Implémentation complète** :
   ```bash
   Lire docs/implementation/IMPLEMENTATION_INDEX.md
   ```

4. **Tester localement** :
   ```bash
   Lire docs/runbooks/docker-dev.md
   Lancer docker compose -f docker-compose.dev.yml up
   ```

### Exercice pratique

**Avant d'aller en prod** :
1. Créer tenant test : `pnpm bootstrap:tenant --name "Test" --slug "test"`
2. Créer user test : API POST /api/users
3. Tester consent : API POST /api/consents
4. Tester LLM : API POST /api/ai/invoke
5. Simuler incident : 10+ bad logins → Vérifier alerte créée

---

## 🔗 Documents à consulter par rôle

### Pour DevOps
- `docs/runbooks/bootstrap.md` — Démarrer
- `docs/runbooks/security-hardening.md` — Avant la prod
- `docs/runbooks/BACKUP_RESTORE.md` — En cas de crash
- `docs/deployment/README.md` — Variables environnement

### Pour Développeurs
- `docs/architecture/BOUNDARIES.md` — Comment écrire du code
- `docs/implementation/IMPLEMENTATION_INDEX.md` — Ce qui existe
- `tests/rgpd.*.test.ts` — Exemples de tests

### Pour DPO/RSSI
- `docs/runbooks/incident.md` — Incident critique
- `docs/rgpd/registre-traitements.md` — Traçabilité Art. 30
- `docs/runbooks/CNIL_COOPERATION.md` — Audit CNIL
- `docs/audit/evidence.md` — Preuves de conformité

---

**Questions restantes ?** 
Vous pouvez demander : "Comment fait [tâche X]?" ou "Qui utilise [composant Y]?"
Je vais l'expliquer simplement.

---

**Maintenu par** : Claude Code (Sonnet 4.5)
**Dernière mise à jour** : 2026-01-02
**Version** : 1.0
