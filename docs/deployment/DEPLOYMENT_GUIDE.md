---

## ⚙️ Configuration des secrets GitHub

Pour que le CI/CD fonctionne, configurez ces secrets dans GitHub :

### Settings → Secrets and variables → Actions

#### Secrets Staging
- `STAGING_SSH_KEY` : Clé SSH privée pour accès serveur staging
- `STAGING_HOST` : IP/hostname du serveur staging
- `STAGING_USER` : User SSH (ex: ubuntu, deploy)
- `STAGING_DATABASE_URL` : URL PostgreSQL staging
- `STAGING_JWT_SECRET` : Secret JWT pour staging

#### Secrets Production
- `PROD_SSH_KEY` : Clé SSH privée pour accès serveur prod
- `PROD_HOST` : IP/hostname du serveur prod
- `PROD_USER` : User SSH
- `PROD_DB_HOST` : Host PostgreSQL prod
- `PROD_DB_USER` : User PostgreSQL prod
- `PROD_DB_PASSWORD` : Password PostgreSQL prod
- `AWS_ACCESS_KEY_ID` : Pour backups S3
- `AWS_SECRET_ACCESS_KEY` : Pour backups S3

#### Secrets optionnels
- `SLACK_WEBHOOK` : Pour notifications Slack

---

## 📝 Checklist de déploiement

### Avant le premier déploiement

- [ ] Créer les 3 bases de données (local, staging, prod)
- [ ] Générer tous les secrets (JWT, SESSION, etc.)
- [ ] Configurer les fichiers `.env.*`
- [ ] Tester en local avec `docker-compose up`
- [ ] Configurer les domaines DNS
- [ ] Obtenir les certificats SSL (Let's Encrypt)
- [ ] Configurer le monitoring (Sentry, CloudWatch)
- [ ] Configurer les backups automatiques
- [ ] Tester les migrations sur staging
- [ ] Valider les tests E2E sur staging

### Workflow de déploiement quotidien

```bash
# 1. Développement local
git checkout -b feat/nouvelle-feature
# ... coder ...
npm test
git commit -m "feat: Nouvelle feature"
git push origin feat/nouvelle-feature

# 2. Pull Request
# → Tests automatiques (CI)
# → Code review
# → Merge vers main

# 3. Déploiement staging (automatique)
# → Build Docker image
# → Deploy sur staging
# → Tests E2E automatiques

# 4. Validation staging
# → Tests manuels
# → Validation QA/client

# 5. Déploiement production (manuel)
git tag v1.2.3
git push --tags
# → Backup BDD prod
# → Deploy sur prod
# → Health checks
# → Monitoring
```

---

## 🆘 Troubleshooting

### Problème : E2E tests échouent sur staging
```bash
# 1. Vérifier que l'app est accessible
curl https://staging.rgpd-platform.com/api/health

# 2. Vérifier les logs
docker-compose -f docker-compose.staging.yml logs -f app

# 3. Vérifier la BDD
docker-compose -f docker-compose.staging.yml exec db psql -U staginguser -d rgpd_staging -c "SELECT * FROM tenants;"

# 4. Relancer les tests manuellement
TEST_BASE_URL=https://staging.rgpd-platform.com npm test -- api.e2e
```

### Problème : Migrations échouent en production
```bash
# 1. Se connecter au serveur prod
ssh produser@prod-server

# 2. Vérifier l'état des migrations
docker-compose exec app npm run migrate -- status

# 3. Si besoin, rollback
docker-compose exec app npm run migrate -- down

# 4. Restaurer le backup
aws s3 cp s3://rgpd-platform-backups/pre-deploy/backup-latest.sql.gz .
gunzip backup-latest.sql.gz
psql -h prod-db -U produser rgpd_production < backup-latest.sql
```

### Problème : Déploiement production échoué
```bash
# Le workflow GitHub Actions fait automatiquement le rollback
# Mais si besoin de rollback manuel :

ssh produser@prod-server
cd /opt/rgpd-platform

# Revenir au tag précédent
git tag  # Lister les tags
git checkout v1.2.2  # Tag stable précédent

# Redéployer
docker-compose up -d --no-deps app

# Vérifier
curl https://rgpd-platform.com/api/health
```

---

## 📊 Monitoring post-déploiement

### Métriques à surveiller (24-48h après déploiement)

1. **Santé application**
   - Taux d'erreurs HTTP (< 1%)
   - Temps de réponse API (< 200ms P95)
   - Disponibilité (> 99.9%)

2. **Base de données**
   - Connexions actives
   - Temps de requête
   - Taille BDD

3. **Ressources**
   - CPU usage (< 70%)
   - Memory usage (< 80%)
   - Disk usage (< 80%)

4. **Business**
   - Nombre de tenants actifs
   - Requêtes AI/jour
   - Exports RGPD demandés

### Outils recommandés
- **Sentry** : Tracking des erreurs
- **DataDog / New Relic** : APM
- **CloudWatch / Azure Monitor** : Métriques infra
- **PagerDuty** : Alertes critiques
- **Grafana** : Dashboards personnalisés

---

## 🎯 Résumé des commandes

```bash
# ============================================================================
# LOCAL (Dev)
# ============================================================================
npm run dev                              # Démarrer Next.js
docker-compose -f docker-compose.dev.yml up -d  # Démarrer PostgreSQL
npm test                                 # Tests unitaires
npm test -- api.e2e                      # Tests E2E

# ============================================================================
# STAGING
# ============================================================================
# Configuration
cp .env.staging.example .env.staging
nano .env.staging  # Éditer les secrets

# Déploiement
docker build -t rgpd-platform:staging .
docker-compose -f docker-compose.staging.yml up -d
docker-compose -f docker-compose.staging.yml exec app npm run migrate

# Tests E2E
docker-compose -f docker-compose.staging.yml --profile testing up e2e-tests

# ============================================================================
# PRODUCTION
# ============================================================================
# Déploiement (via CI/CD uniquement)
git tag v1.2.3
git push --tags

# Monitoring
docker-compose logs -f app
curl https://rgpd-platform.com/api/health

# Rollback (urgence uniquement)
git checkout v1.2.2
docker-compose up -d --no-deps app
```

---

## 📚 Prochaines étapes

1. **Immédiat** :
   - [ ] Configurer `.env.staging` avec vos secrets
   - [ ] Tester le déploiement staging en local avec Docker

2. **Court terme** (1-2 semaines) :
   - [ ] Louer un serveur staging (AWS/Azure/DigitalOcean)
   - [ ] Déployer sur staging
   - [ ] Tester le workflow complet dev → staging

3. **Moyen terme** (1 mois) :
   - [ ] Configurer le CI/CD GitHub Actions
   - [ ] Préparer l'infrastructure production
   - [ ] Former l'équipe sur le processus de déploiement

4. **Long terme** :
   - [ ] Mettre en place le monitoring avancé
   - [ ] Configurer l'auto-scaling
   - [ ] Optimiser les performances

---

Pour toute question sur le déploiement, consultez :
- [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) - Guide des tests E2E
- [ARCHITECTURE_GUIDE.md](../ARCHITECTURE_GUIDE.md) - Architecture globale
- [QUICK_START.md](../QUICK_START.md) - Démarrage rapide local
