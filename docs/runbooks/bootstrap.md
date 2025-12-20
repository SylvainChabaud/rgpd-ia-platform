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

⚠️ Ne jamais committer de secrets. Utiliser `.env` local et `.env.example` comme modèle.

## 4 - Commandes
### 4.1 Statut
```bash
pnpm bootstrap:status
```

### 4.2 Créer le Platform SuperAdmin (NON REJOUABLE)
```bash
pnpm bootstrap:superadmin --email "admin@example.com" --displayName "Platform Admin" --password "ChangeMeNow!"
```
Résultat : `platform_user_id` (opaque) affiché. Aucun email complet n'est loggé.

### 4.3 Créer un tenant
```bash
pnpm bootstrap:tenant --name "Cabinet Dupont" --slug "cabinet-dupont"
```

### 4.4 Créer un tenant admin
```bash
pnpm bootstrap:tenant-admin --tenantSlug "cabinet-dupont" --email "dupont.admin@cabinet.fr" --displayName "Admin Cabinet" --password "ChangeMeNow!"
```

## 5 - Politique logs / audit
- Logs applicatifs : **événements techniques** uniquement (IDs opaques)
- Audit events : `audit_events` (event_name, actor_id, tenant_id, target_id, timestamp)
- Aucun contenu utilisateur (P2/P3) en logs

## 6 - Dépannage
- Si `bootstrap:superadmin` refuse : c'est normal, le superadmin est non rejouable.
- Vérifier la connexion DB (`DATABASE_URL`).
- Vérifier les migrations exécutées.

## 7 - Preuves (EPIC 7)
- Rapports tests : `pnpm test`
- Scripts de collecte : `pnpm audit:collect`
