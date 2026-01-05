# Guide de déploiement cloud - Recommandations et plan d'action

Ce guide récapitule les recommandations et le plan d'action pour déployer la plateforme sur **Staging** et **Production** dans le cloud.

---

## 🎯 Recommandation : Railway

**Pourquoi Railway ?**
- ✅ Configuration minimale (10 minutes)
- ✅ Parfait pour tester le déploiement
- ✅ Bon rapport qualité/prix (~$10-50/mois)
- ✅ Database PostgreSQL incluse
- ✅ CI/CD GitHub automatique
- ✅ Si ça grandit, facile de migrer vers AWS

**Autres options** : Vercel (plus simple), Azure (plus complet), AWS (plus flexible)

---

## 📋 Plan d'action par phase

### 🔵 Phase 1 : Configuration Staging (Semaine 1-2)

**Objectif** : Avoir une première version de staging en ligne

**Temps estimé** : 1-2 heures (la première fois)

#### Étape 1.1 : Créer un compte Railway (5 min)
```
1. Aller sur https://railway.app
2. Cliquer "Sign up with GitHub"
3. Autoriser l'accès à tes repositories
4. Confirmation email
```

#### Étape 1.2 : Créer un projet Railway (10 min)
```
1. Dashboard Railway → New Project
2. Sélectionner "Deploy from GitHub"
3. Autoriser Railway à accéder à GitHub
4. Sélectionner : rgpd-ia-platform
5. Confirmer
```

**Résultat** : Railway crée auto le projet et détecte Next.js ✨

#### Étape 1.3 : Ajouter une base de données PostgreSQL (5 min)
```
1. Dans le projet Railway
2. Add → Database
3. Sélectionner PostgreSQL
4. Confirmer
```

**Résultat** : Railway crée une BDD staging + génère la DATABASE_URL auto

#### Étape 1.4 : Configurer les variables d'environnement (10 min)
```
1. Project Settings → Variables
2. Ajouter les variables pour staging :

DATABASE_URL → auto-généré par Railway (ne pas toucher)
NODE_ENV=production
JWT_SECRET=<générer: openssl rand -hex 32>
SESSION_SECRET=<générer: openssl rand -hex 32>
BOOTSTRAP_PLATFORM_SECRET=<générer: openssl rand -hex 32>
OPENAI_API_KEY=sk-xxx-staging
ANTHROPIC_API_KEY=sk-xxx-staging
TEST_BASE_URL=https://[railwayURL]/app  # On récupère après déploiement
TEST_SKIP_E2E=false
```

#### Étape 1.5 : Déployer (5 min)
```
1. Railway détecte auto le changement
2. Clique sur "Deploy" (ou attend le auto-deploy depuis main)
3. Vérifie les logs : Project → Deployments
```

**Résultat** : Ton app est en ligne sur `https://[randomname].railway.app` 🎉

#### Étape 1.6 : Tester le déploiement (10 min)
```bash
# Vérifier que l'app répond
curl https://[railwayURL].railway.app/api/health

# Récupérer l'URL réelle
# Aller dans Railway → View Domains

# Tester localement les E2E tests contre staging
TEST_BASE_URL=https://[railwayURL].railway.app npm test -- api.e2e
```

**Résultat** : Les tests E2E passent contre staging ✅

---

### 🟢 Phase 2 : Configurer CI/CD (Semaine 2-3)

**Objectif** : Automatiser les déploiements

**Temps estimé** : 1-2 heures

#### Étape 2.1 : Connecter Railway à GitHub automatiquement
```
Railway fait déjà ça ! 
1. Chaque push vers 'main' → déploie auto en staging
2. Logs disponibles dans Railway → Deployments
```

**Pas d'action requise** : Railway gère tout automatiquement 🎉

#### Étape 2.2 : Configurer GitHub Secrets (pour Production plus tard)
```
1. GitHub → Settings → Secrets and variables → Actions
2. Ajouter pour le CI/CD :

STAGING_DATABASE_URL=postgresql://...  (copier de Railway)
STAGING_JWT_SECRET=xxx
STAGING_SESSION_SECRET=xxx

PROD_DATABASE_URL=postgresql://...     (plus tard)
PROD_JWT_SECRET=xxx                    (plus tard)
etc.
```

#### Étape 2.3 : Tester le workflow CI/CD
```bash
# 1. Faire un changement en local
nano app/page.tsx
git commit -m "test: Minor change"
git push origin main

# 2. Vérifier que Railway redéploie auto
# Railway dashboard → Deployments → Vérifie la dernière déploiement

# 3. Tester le déploiement
curl https://[railwayURL].railway.app/api/health
```

---

### 🔴 Phase 3 : Production (Plus tard - avant de lancer aux clients)

**Objectif** : Avoir la production en ligne et bloquée (TEST_SKIP_E2E=true)

**Temps estimé** : 2-3 heures

#### Étape 3.1 : Créer un second projet Railway (pour Prod)
```
1. Railway dashboard → New Project
2. Deploy from GitHub → rgpd-ia-platform
3. Ajouter PostgreSQL
4. Configurer les variables AVEC TEST_SKIP_E2E=true
5. Déployer
```

#### Étape 3.2 : Configurer les domaines de production
```
1. Railway → View Domains
2. Ajouter custom domain : rgpd-platform.com
3. Configurer DNS (Railway montre les étapes)
4. Attendre 24-48h pour propagation DNS
```

#### Étape 3.3 : Configurer les secrets GitHub pour Production
```
Ajouter dans GitHub Secrets :
PROD_DATABASE_URL
PROD_JWT_SECRET
etc.
```

#### Étape 3.4 : Tester le workflow Production
```bash
# 1. Créer un tag
git tag v1.0.0

# 2. Push le tag
git push --tags

# 3. GitHub Actions s'exécute
# 4. Vérifie que ça déploie sur prod (via ton workflow GitHub)
```

---

## 📊 Timeline recommandée

```
Jour 1-2 : Phase 1 (Staging sur Railway)
  □ Créer compte Railway
  □ Déployer staging
  □ Tester les E2E tests
  
Jour 3-7 : Phase 2 (CI/CD automatique)
  □ Tester que main → staging auto
  □ Configurer GitHub Secrets
  
Jour 8-14 : Développement + tests
  □ Continuer le dev local
  □ Merger vers main régulièrement
  □ Valider sur staging
  
Jour 15+ : Phase 3 (Production)
  □ Créer un second projet Railway pour Prod
  □ Configurer domaines
  □ Tester le workflow complet
  □ Lancer en production
```

---

## 🔑 Variables d'environnement par phase

### Phase 1 : Staging sur Railway

```env
# .env.staging (à créer)
NODE_ENV=production

# Database (auto-générée par Railway, copier de Railway dashboard)
DATABASE_URL=postgresql://...

# Secrets (générer avec: openssl rand -hex 32)
JWT_SECRET=xxxxxxxxxxxxxxxx...
SESSION_SECRET=xxxxxxxxxxxxxxxx...
BOOTSTRAP_PLATFORM_SECRET=xxxxxxxxxxxxxxxx...

# E2E Tests (AUTORISÉS en staging)
TEST_BASE_URL=https://votreprojet.railway.app
TEST_E2E_SERVER_AVAILABLE=true
TEST_SKIP_E2E=false

# APIs (clés staging)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
```

### Phase 3 : Production sur Railway

```env
# .env.production (à créer)
NODE_ENV=production

# Database (BDD prod dédiée)
DATABASE_URL=postgresql://produser:xxx@prod-db-cluster...

# Secrets (DIFFÉRENTS de staging!)
JWT_SECRET=yyyyyyyyyyyyyyyy...  # Pas le même que staging
SESSION_SECRET=yyyyyyyyyyyyyy...
BOOTSTRAP_PLATFORM_SECRET=yyyyyyyyyy...

# E2E Tests (BLOQUÉS en production)
TEST_SKIP_E2E=true
# Pas de TEST_BASE_URL

# APIs (clés production)
OPENAI_API_KEY=sk-xxx-prod
ANTHROPIC_API_KEY=sk-xxx-prod

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/123
```

---

## ✅ Checklist - Avant chaque phase

### Avant Phase 1 (Staging)
- [ ] Railway account créé
- [ ] GitHub connecté à Railway
- [ ] Tous les secrets générés (openssl rand -hex 32)
- [ ] Secrets différents de local/dev

### Avant Phase 2 (CI/CD)
- [ ] Staging fonctionne (curl /api/health répond)
- [ ] Tests E2E passent contre staging
- [ ] Workflow GitHub Actions créé et configuré
- [ ] GitHub Secrets configurés

### Avant Phase 3 (Production)
- [ ] Staging validé par QA team
- [ ] Domaines configurés (DNS)
- [ ] Monitoring configuré (Sentry, etc.)
- [ ] Backups configurés
- [ ] Plan de rollback testé
- [ ] TEST_SKIP_E2E=true configuré

---

## 🔄 Workflow quotidien après la Phase 1

```
1. Tu développes en local
   npm run dev
   npm test

2. Tu commit et push vers main
   git commit -m "feat: nouvelle feature"
   git push origin main

3. Railway redéploie auto en staging
   (attendre 2-3 minutes)

4. Tu testes sur staging
   curl https://staging.railway.app/api/health
   TEST_BASE_URL=... npm test -- api.e2e

5. Quand c'est bon pour prod
   git tag v1.0.1
   git push --tags

6. GitHub Actions déploie auto en prod
   (voir les logs dans GitHub → Actions)
```

---

## 🆘 Troubleshooting rapide

### "Le déploiement échoue"
```bash
# 1. Vérifier les logs Railway
Railway dashboard → Deployments → View logs

# 2. Chercher l'erreur (npm install, migration, etc.)

# 3. Si c'est une migration qui échoue
# Utilise Railway CLI pour debug
railway logs
```

### "Staging est en ligne mais API répond 500"
```bash
# 1. Vérifier que la database est connectée
# Railway dashboard → Services → PostgreSQL → Checks

# 2. Vérifier les logs de l'app
# Railway dashboard → Logs

# 3. Vérifier DATABASE_URL est correct
# Railway dashboard → Variables → DATABASE_URL
```

### "Tests E2E échouent contre staging"
```bash
# 1. Vérifier que l'app répond
curl https://[railwayURL].railway.app/api/health

# 2. Attendre que le déploiement soit complètement fini
# (parfois 2-3 min supplémentaires)

# 3. Tester localement
TEST_BASE_URL=https://[railwayURL].railway.app npm test -- api.e2e
```

---

## 📚 Ressources

### Pour démarrer
- [Railway Docs](https://docs.railway.app)
- [Next.js on Railway](https://docs.railway.app/guides/nextjs)
- [PostgreSQL on Railway](https://docs.railway.app/databases/postgresql)

### Autres options si tu veux changer plus tard
- Vercel : https://vercel.com/docs
- Azure : https://docs.microsoft.com/azure
- AWS : https://docs.aws.amazon.com

### Nos docs du projet
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Guide technique complet
- [ENV_CONFIGURATION.md](./ENV_CONFIGURATION.md) - Configuration des .env
- [../testing/E2E_TESTING_GUIDE.md](../testing/E2E_TESTING_GUIDE.md) - Tests E2E

---

## 🎯 Résumé - Juste l'essentiel

**Phase 1 (Cette semaine)** :
1. Créer compte Railway
2. Déployer staging
3. Tester que ça marche

**Phase 2 (La semaine prochaine)** :
1. Configurer GitHub Secrets
2. Vérifier que main → staging fonctionne auto

**Phase 3 (Avant la vraie prod)** :
1. Créer un second projet Railway
2. Ajouter ton domaine custom
3. Déployer la première version

**Total** : 3-4 heures de travail réparti sur 2-3 semaines = très faisable 💪

---

## ❓ Questions fréquentes

**Q: Est-ce que je dois le faire maintenant ?**
A: Non, tu peux continuer en dev local. Mais c'est facile (30 min pour Phase 1), donc pourquoi pas cette semaine ?

**Q: Ça va me coûter combien ?**
A: Phase 1 (Staging) : gratuit pour tester, puis ~$10-20/mois
   Phase 3 (Production) : ~$30-50/mois

**Q: Je peux changer de plateforme plus tard ?**
A: Oui ! Mais après 1000+ lignes de config, c'est plus compliqué. Railway est bon pour tester.

**Q: Et si je veux Azure à la place ?**
A: Pareil, mais plus complexe. Voir [DEPLOYMENT_GUIDE.md § Option A: Azure](./DEPLOYMENT_GUIDE.md)

**Q: Faut-il un VPN pour accéder à staging ?**
A: Non, staging est public (parfait pour tests). Prod peut être privée si tu veux.

---

*Dernière mise à jour : Janvier 2026*
*Auteur : GitHub Copilot*
