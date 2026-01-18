# Email Encryption Key Management

**LOT 1.6 - RGPD Art. 32 (Sécurité du traitement)**

Ce document décrit la gestion de la clé `EMAIL_ENCRYPTION_KEY` utilisée pour chiffrer les emails utilisateurs.

---

## Vue d'ensemble

| Propriété | Valeur |
|-----------|--------|
| Algorithme | AES-256-GCM |
| Taille clé | 32 bytes (256 bits) |
| Format | Hex (64 chars) ou Base64 (44 chars) |
| Usage | Chiffrement emails pour Art. 15, 34 RGPD |

### Qui accède aux emails déchiffrés ?

| Rôle | Accès | Article RGPD |
|------|-------|--------------|
| User | Son propre email uniquement | Art. 15 (Droit d'accès) |
| DPO | Tous les emails | Art. 34 (Notification violations) |
| Système | Tous les emails | Notifications, reset password |
| Tenant Admin | ❌ Interdit | - |
| Platform Admin | ❌ Interdit | - |

---

## Configuration

### Développement (`.env`)

```bash
# Générer une clé
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Ajouter dans .env
EMAIL_ENCRYPTION_KEY=<votre_clé_64_chars_hex>
```

### Production (Docker Secrets)

```bash
# 1. Générer la clé
openssl rand -hex 32 > secrets/email_encryption_key.txt
chmod 600 secrets/email_encryption_key.txt

# 2. La clé est automatiquement montée par docker-compose
# L'application lit EMAIL_ENCRYPTION_KEY_FILE=/run/secrets/email_encryption_key
```

---

## Procédures opérationnelles

### Génération initiale

```bash
# Via le script d'initialisation
./scripts/docker/init-secrets.sh

# Ou manuellement
openssl rand -hex 32 > secrets/email_encryption_key.txt
chmod 600 secrets/email_encryption_key.txt
```

### Rotation de clé

**⚠️ CRITIQUE : Suivre cette procédure exactement**

#### Qui exécute la rotation ?

| Étape | Qui | Où |
|-------|-----|-----|
| Script de migration | Admin/DevOps | Machine avec accès DB (hors container) |
| Mise à jour du secret | Admin/DevOps | Serveur de production |
| Redémarrage | Admin/DevOps | `docker-compose restart app` |

**Important** : Le script de rotation ne met PAS à jour le fichier secret automatiquement (séparation des responsabilités pour la sécurité).

#### 1. Préparer la rotation

```bash
# Sauvegarder la base de données
pg_dump -Fc rgpd_platform > backup_before_rotation.dump

# Sauvegarder l'ancienne clé
cp secrets/email_encryption_key.txt secrets/email_encryption_key.txt.backup
```

#### 2. Générer la nouvelle clé

```bash
# Générer et afficher la nouvelle clé
npx ts-node scripts/security/rotate-email-key.ts --generate-new

# OU manuellement
openssl rand -hex 32
```

#### 3. Tester la rotation (dry-run)

```bash
npx ts-node scripts/security/rotate-email-key.ts \
  --old-key $(cat secrets/email_encryption_key.txt) \
  --new-key <nouvelle_clé> \
  --dry-run
```

#### 4. Exécuter la rotation

```bash
CONFIRM_ROTATION=1 npx ts-node scripts/security/rotate-email-key.ts \
  --old-key $(cat secrets/email_encryption_key.txt) \
  --new-key <nouvelle_clé>
```

#### 5. Mettre à jour la configuration (MANUEL)

```bash
# IMPORTANT: Cette étape est MANUELLE - le script ne le fait pas automatiquement

# Sur le serveur de production, mettre à jour le fichier secret
echo "<nouvelle_clé>" > secrets/email_encryption_key.txt
chmod 600 secrets/email_encryption_key.txt

# Redémarrer l'application pour qu'elle relise le nouveau secret
docker-compose restart app

# OU pour un redémarrage sans interruption (rolling restart)
docker-compose up -d --no-deps app
```

**Pourquoi le script ne met pas à jour le fichier ?**
- Séparation des responsabilités (le script n'a pas accès au serveur de prod)
- Permet de valider manuellement avant de basculer
- Permet un rollback facile si problème

#### 6. Vérifier

```bash
# Tester l'accès email via l'API
curl -H "Authorization: Bearer <token_user>" http://localhost:3000/api/users/me

# Vérifier les logs
docker-compose logs app | grep -i email
```

### Récupération d'urgence

Si la clé est perdue et qu'aucun backup n'existe :

1. **Les emails chiffrés sont IRRÉCUPÉRABLES**
2. Options :
   - Demander aux utilisateurs de re-saisir leur email
   - Restaurer depuis un backup de la base + clé

---

## Stockage sécurisé de la clé

### Recommandations RGPD

| Méthode | Sécurité | Complexité | Recommandé |
|---------|----------|------------|------------|
| Docker Secrets | ✅ Bonne | Faible | ✅ PME/Startup |
| HashiCorp Vault | ✅✅ Excellente | Moyenne | Entreprise |
| AWS KMS | ✅✅ Excellente | Moyenne | Cloud AWS |
| HSM physique | ✅✅✅ Maximale | Élevée | Banques, Santé |

### Bonnes pratiques

1. **Ne jamais commiter** la clé dans git
2. **Stocker dans 2-3 endroits séparés** :
   - Docker Secret (production)
   - Gestionnaire de mots de passe entreprise
   - Coffre-fort physique (imprimé, scellé)
3. **Documenter qui a accès** (principe du moindre privilège)
4. **Rotation périodique** : tous les 6-12 mois
5. **Audit** : tracer qui accède aux emails (logs applicatifs)

---

## Fréquence de rotation recommandée

| Contexte | Fréquence |
|----------|-----------|
| Normal | 12 mois |
| Après départ d'un admin | Immédiat |
| Suspicion de compromission | Immédiat |
| Audit de sécurité | Selon recommandation |

---

## Checklist de sécurité

- [ ] Clé générée avec `openssl rand` ou équivalent cryptographique
- [ ] Clé stockée dans Docker Secret (pas en variable d'environnement en prod)
- [ ] Backup de la clé dans 2+ emplacements sécurisés
- [ ] Procédure de rotation documentée et testée
- [ ] Accès à la clé restreint (principe du moindre privilège)
- [ ] Rotation planifiée (calendrier)
- [ ] secrets/ dans .gitignore

---

## Références

- **RGPD Art. 32** : Sécurité du traitement
- **RGPD Art. 15** : Droit d'accès de la personne concernée
- **RGPD Art. 34** : Communication à la personne concernée d'une violation
- **ANSSI** : Guide de gestion des clés cryptographiques
