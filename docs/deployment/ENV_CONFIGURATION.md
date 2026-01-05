# Configuration des environnements - Guide rapide

## 📋 Fichiers de configuration par environnement

| Fichier | Environnement | Git | Usage |
|---------|---------------|-----|-------|
| `.env.example` | Template production | ✅ Commité | Template à copier |
| `.env.staging.example` | Template staging | ✅ Commité | Template à copier |
| `.env.production.example` | Template production | ✅ Commité | Template à copier |
| `.env.test` | Tests | ✅ Commité | Tests unitaires/E2E |
| `.env` | Local dev | ❌ Git-ignored | Développement local |
| `.env.staging` | Staging | ❌ Git-ignored | Déploiement staging |
| `.env.production` | Production | ❌ Git-ignored | Déploiement prod |

## 🚀 Configuration initiale (première fois)

### 1. Environnement Local (Dev)
```bash
# Copier le template
cp .env.example .env

# Éditer les valeurs (secrets simples pour dev)
nano .env

# Valeurs minimales pour démarrer :
DATABASE_URL=postgresql://devuser:devpass@localhost:5432/rgpd_platform
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
NODE_ENV=development
```

### 2. Environnement Staging
```bash
# Copier le template
cp .env.staging.example .env.staging

# Générer les secrets (forts)
echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env.staging
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env.staging
echo "BOOTSTRAP_PLATFORM_SECRET=$(openssl rand -hex 32)" >> .env.staging

# Éditer les autres valeurs
nano .env.staging

# Important : Remplacer TOUS les REPLACE_WITH_*
```

### 3. Environnement Production
```bash
# Copier le template
cp .env.production.example .env.production

# Générer les secrets (très forts)
echo "SESSION_SECRET=$(openssl rand -hex 64)" >> .env.production
echo "JWT_SECRET=$(openssl rand -hex 64)" >> .env.production
echo "BOOTSTRAP_PLATFORM_SECRET=$(openssl rand -hex 64)" >> .env.production

# Éditer les autres valeurs
nano .env.production

# ⚠️ NE JAMAIS commiter ce fichier
# Stocker dans un vault sécurisé (AWS Secrets Manager, etc.)
```

## 🔐 Sécurité des secrets

### ❌ NE JAMAIS FAIRE
```bash
# INTERDIT : Commiter des secrets
git add .env.production  # ❌
git add .env.staging     # ❌

# INTERDIT : Partager des secrets par email/Slack
echo "Voici mon JWT_SECRET: abc123"  # ❌

# INTERDIT : Réutiliser les secrets entre environnements
cp .env.production .env.staging  # ❌
```

### ✅ BONNES PRATIQUES
```bash
# 1. Générer des secrets différents par environnement
openssl rand -hex 32  # Nouveau secret à chaque fois

# 2. Stocker dans un vault
# - AWS Secrets Manager
# - Azure Key Vault
# - HashiCorp Vault
# - 1Password / LastPass (pour petites équipes)

# 3. Vérifier que .env* est dans .gitignore
cat .gitignore | grep .env

# 4. Scanner les commits pour éviter les fuites
npm run audit:secrets
```

## 🔍 Vérification de la configuration

### Script de vérification
```bash
# Créer un script de vérification
cat > scripts/check-env.sh << 'EOF'
#!/bin/bash

echo "🔍 Vérification de la configuration des environnements"

# Vérifier que les templates existent
for file in .env.example .env.staging.example .env.production.example; do
  if [ -f "$file" ]; then
    echo "✅ $file existe"
  else
    echo "❌ $file manquant"
  fi
done

# Vérifier que les secrets ne sont pas commitables
if git check-ignore .env.staging >/dev/null 2>&1; then
  echo "✅ .env.staging est dans .gitignore"
else
  echo "⚠️  .env.staging n'est PAS ignoré par git (DANGER!)"
fi

# Vérifier que les secrets sont définis (pour l'env actuel)
if [ -f ".env" ]; then
  missing=()
  for var in DATABASE_URL JWT_SECRET SESSION_SECRET; do
    if ! grep -q "^$var=" .env; then
      missing+=("$var")
    fi
  done
  
  if [ ${#missing[@]} -eq 0 ]; then
    echo "✅ Toutes les variables essentielles sont définies"
  else
    echo "⚠️  Variables manquantes : ${missing[*]}"
  fi
fi

echo ""
echo "✨ Vérification terminée"
EOF

chmod +x scripts/check-env.sh
./scripts/check-env.sh
```

## 📦 Déploiement avec les bons fichiers

### Développement local
```bash
# Utilise .env (local)
npm run dev
```

### Staging
```bash
# Option 1 : Docker avec .env.staging
cp .env.staging .env
docker-compose -f docker-compose.staging.yml up -d

# Option 2 : Injection via CI/CD
# Les secrets sont injectés automatiquement depuis GitHub Secrets
```

### Production
```bash
# Option 1 : Docker avec .env.production
cp .env.production .env
docker-compose up -d

# Option 2 : CI/CD (recommandé)
# Les secrets sont injectés depuis AWS Secrets Manager / Vault
git tag v1.0.0
git push --tags  # Déclenche le déploiement
```

## 🛠️ Commandes utiles

### Générer des secrets
```bash
# Session secret (32 bytes = 64 chars hex)
openssl rand -hex 32

# JWT secret (32 bytes)
openssl rand -hex 32

# Password fort (20 caractères alphanumériques)
openssl rand -base64 20

# UUID v4 (pour IDs)
uuidgen
```

### Vérifier les variables chargées
```bash
# En dev
node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"

# Vérifier toutes les variables (sans afficher les valeurs)
node -e "require('dotenv').config(); console.log(Object.keys(process.env).filter(k => k.includes('_SECRET')))"
```

### Tester une configuration
```bash
# Tester staging en local
TEST_BASE_URL=https://staging.rgpd-platform.com npm test -- api.e2e

# Tester la connexion BDD
psql "$DATABASE_URL" -c "SELECT version();"
```

## 🔄 Rotation des secrets

### Quand changer les secrets ?
- ✅ Tous les 90 jours (bonne pratique)
- ✅ Après un départ d'un membre de l'équipe
- ✅ En cas de suspicion de compromission
- ✅ Après une fuite de code (ex: commit public accidentel)

### Procédure de rotation
```bash
# 1. Générer le nouveau secret
NEW_JWT_SECRET=$(openssl rand -hex 32)

# 2. Staging : Tester avec le nouveau secret
echo "JWT_SECRET=$NEW_JWT_SECRET" >> .env.staging
# Déployer et valider

# 3. Production : Rotation sans downtime
# - Supporter ancien + nouveau secret (dual-token)
# - Déployer avec nouveau secret
# - Attendre expiration des anciens tokens (JWT_EXPIRY)
# - Retirer l'ancien secret

# 4. Mettre à jour le vault
aws secretsmanager update-secret \
  --secret-id rgpd-platform/prod/jwt-secret \
  --secret-string "$NEW_JWT_SECRET"
```

## 📚 Ressources

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Guide complet de déploiement
- [E2E_TESTING_GUIDE.md](../testing/E2E_TESTING_GUIDE.md) - Tests par environnement
- [.env.example](.env.example) - Template production
- [.env.staging.example](.env.staging.example) - Template staging
- [.env.production.example](.env.production.example) - Template production

## ✅ Checklist avant déploiement

### Avant staging
- [ ] `.env.staging` créé et configuré
- [ ] Tous les `REPLACE_WITH_*` remplacés
- [ ] Secrets différents de la prod
- [ ] BDD staging créée et accessible
- [ ] Domaine DNS configuré (staging.exemple.com)
- [ ] SSL/TLS configuré

### Avant production
- [ ] `.env.production` créé et configuré
- [ ] Secrets stockés dans un vault
- [ ] Secrets différents de staging/dev
- [ ] BDD prod avec réplication
- [ ] Backups automatisés testés
- [ ] Monitoring configuré (Sentry, etc.)
- [ ] Alertes configurées (PagerDuty, etc.)
- [ ] Tests E2E passent sur staging
- [ ] Équipe formée sur le déploiement
