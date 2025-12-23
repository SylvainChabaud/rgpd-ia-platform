# Runbook — Bootstrap plateforme (SuperAdmin / Tenants) — CLI ONLY

## 1 - Objectif
Exécuter l'initialisation **sécurisée** de la plateforme :
- création du **Platform SuperAdmin**
- création des **tenants**
- création des **Tenant Admins**

**Interdiction** : aucun endpoint HTTP public pour ces opérations.

## 2 - Pré-requis Ops/Sec (EPIC 2)
- Exécution **sur le serveur** (session SSH admin) ou dans un bastion sécurisé.
- Accès limité à un administrateur système autorisé.
- Secrets fournis via mécanisme sécurisé (Vault / secrets docker / env protégées).
- Journalisation système des connexions admin (sans données métier).
- Ports exposés : strict minimum (HTTPS uniquement côté reverse proxy).

## 3 - Variables d’environnement (exemples)
- `DATABASE_URL` : URL PostgreSQL (non committée)
- `BOOTSTRAP_PLATFORM_SECRET` : secret serveur pour signer des opérations bootstrap (optionnel mais recommandé)
- `BOOTSTRAP_MODE` : autorise SYSTEM pour le bootstrap (dev uniquement, interdit en prod)

⚠️ Ne jamais committer de secrets. Utiliser `.env` local et `.env.example` comme modèle.

## 4 - Commandes
### 4.1 Statut
```bash
pnpm bootstrap:status
```

### 4.2 Créer le Platform SuperAdmin (NON REJOUABLE)
```bash
pnpm bootstrap:superadmin --email "admin@example.com" --displayName "Platform Admin"
```
Résultat : `platform_user_id` (opaque) affiché. Aucun email complet n'est loggé.
Mot de passe : désactivé par défaut (`password_hash="__DISABLED__"`), à définir via un flux ultérieur.

### 4.3 Créer un tenant
```bash
pnpm bootstrap:tenant --name "Cabinet Dupont" --slug "cabinet-dupont"
```
Si `BOOTSTRAP_MODE` est désactivé, ajouter `--platformActorId "<superadmin_id>"`.

### 4.4 Créer un tenant admin
```bash
pnpm bootstrap:tenant-admin --tenantSlug "cabinet-dupont" --email "dupont.admin@cabinet.fr" --displayName "Admin Cabinet"
```
Si `BOOTSTRAP_MODE` est désactivé, ajouter `--platformActorId "<superadmin_id>"`.
Mot de passe : désactivé par défaut (`password_hash="__DISABLED__"`), à définir via un flux ultérieur.

## 5 - Politique logs / audit
- Logs applicatifs : **événements techniques** uniquement (IDs opaques)
- Audit events : `audit_events` (event_name, actor_id, tenant_id, target_id, timestamp)
- Aucun contenu utilisateur (P2/P3) en logs
- Aucun mot de passe en clair (champ désactivé)

## 6 - Dépannage
- Si `bootstrap:superadmin` refuse : c'est normal, le superadmin est non rejouable.
- Vérifier la connexion DB (`DATABASE_URL`).
- Vérifier les migrations exécutées.

## 7 - Limitations & scope EPIC1
### Flux d'activation password
Le flux d'activation de mot de passe (invitation email + reset link + authN complète) sera livré dans **EPIC 5 (IAM complet)**.

En EPIC1, les comptes sont créés avec `password_hash="__DISABLED__"` :
- **SuperAdmin plateforme** : accès direct via session SSH admin + commandes CLI
- **Tenant Admin** : activation manuelle hors plateforme (ex: accès direct DB admin pour set password hash, ou attendre EPIC5)

Cette limitation est **conforme** au périmètre EPIC1 qui ne couvre que le bootstrap CLI, sans endpoints métier ni interface d'authentification.

## 8 - Preuves (EPIC 7)
- Rapports tests : `pnpm test`
- Scripts de collecte : `pnpm audit:collect`
- Scan secrets : `pnpm audit:secrets`
