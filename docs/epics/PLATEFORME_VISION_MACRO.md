# 🎯 Vision Macro : La Plateforme RGPD-IA expliquée simplement

> **Document de référence** : Vue d'ensemble complète de la plateforme pour tous les acteurs
> **Date** : 13 janvier 2026
> **Audience** : Développeurs, Product Owners, Stakeholders

---

## 📖 C'est quoi cette plateforme ?

**En une phrase** : C'est une plateforme SaaS multi-tenant qui permet à des entreprises d'utiliser l'IA (ChatGPT, etc.) sur leurs documents **tout en respectant le RGPD**.

**Pourquoi c'est important ?** 
- Les entreprises ne peuvent pas utiliser ChatGPT directement avec des données clients (RGPD interdit)
- Cette plateforme agit comme un "coffre-fort IA" : elle contrôle, isole, et sécurise les données

---

## 👥 Les 3 types d'utilisateurs

### 1. **SUPER ADMIN** (Équipe technique plateforme)
- Gère toute la plateforme
- Crée les tenants (clients/entreprises)
- **Gère le catalogue des outils IA** (EPIC 15)
- Surveille les logs, la sécurité
- Lance les migrations de base de données

### 2. **TENANT ADMIN** (Ex: Responsable IT chez un client "Entreprise ABC")
- Gère **son** entreprise uniquement (isolation totale)
- Crée les comptes utilisateurs de son entreprise
- **Active les outils IA** du catalogue pour son organisation
- Configure les consentements IA (finalités)
- Exporte/supprime les données RGPD de **ses** utilisateurs

### 3. **USER** (Ex: Marie, employée chez "Entreprise ABC")
- Utilise l'IA pour son travail quotidien
- Peut demander l'export de ses données
- Peut retirer son consentement
- **NE VOIT JAMAIS** les données d'une autre entreprise

---

## 🏗️ Ce que fait chaque LOT (vision fonctionnelle)

### **LOT 1 : Les Fondations (Isolation + Sécurité)**
**Ce qui est construit** :
- La base de données avec isolation par tenant
- Le système d'authentification (qui peut faire quoi)
- La Gateway LLM (porte d'entrée unique vers l'IA)
- Les logs d'audit (traçabilité)

**Cas d'usage concret** :
```
Marie (User chez Entreprise ABC) se connecte
├─ Authentification : OK
├─ Vérification tenant : Entreprise ABC
└─ Accès limité : Ne voit QUE les données d'Entreprise ABC

Paul (User chez Entreprise XYZ) se connecte
├─ Authentification : OK
├─ Vérification tenant : Entreprise XYZ
└─ Accès limité : Ne voit QUE les données d'Entreprise XYZ

❌ Marie NE PEUT PAS voir les données de Paul (isolation tenant)
```

---

### **LOT 2 : Le Serveur Sécurisé (Infrastructure)**
**Ce qui est construit** :
- Documentation de sécurisation du serveur
- Configuration Docker pour développement local
- Politique de sauvegarde

**Cas d'usage concret** :
```
SUPER ADMIN déploie la plateforme en production
├─ Suit la checklist sécurité (LOT 2.0)
│   ├─ Firewall configuré
│   ├─ HTTPS activé
│   ├─ Base de données chiffrée
│   └─ Logs centralisés
└─ Configure les sauvegardes automatiques (LOT 2.1)
    ├─ Backup quotidien chiffré
    ├─ Restauration testée mensuellement
    └─ Rétention 30 jours
```

---

### **LOT 3 : L'IA Locale (POC Ollama)**
**Ce qui est construit** :
- Provider Ollama (IA locale sans fuite de données)
- Validation que l'IA ne stocke RIEN
- Benchmark de performance

**Cas d'usage concret** :
```
Marie (User) envoie un document à résumer
├─ Document envoyé via le FRONT USER
├─ Gateway LLM (seule entrée) reçoit la demande
├─ Vérification consentement de Marie : OK
├─ Envoi vers Ollama (IA locale)
├─ Résumé généré
├─ ⚠️ RIEN n'est stocké (ni le document, ni le résumé)
└─ Résumé affiché à Marie

Audit log créé (LOT 1) :
- Qui : Marie (user_id: xxx)
- Quand : 2025-12-25 14:30
- Quoi : Résumé IA demandé
- ❌ PAS de contenu (RGPD)
```

---

### **LOT 4.0 : Le Stockage RGPD**
**Ce qui est construit** :
- Table `consents` : qui a accepté quoi
- Table `ai_jobs` : métadonnées des jobs IA (SANS le contenu)
- Migrations de base de données

**Cas d'usage concret** :
```
TENANT ADMIN chez Entreprise ABC demande :
"Liste les jobs IA de Marie en décembre 2025"

Backend répond :
├─ Requête à la DB : SELECT * FROM ai_jobs WHERE tenant_id = 'ABC' AND user_id = 'marie'
├─ Résultat :
│   Job 1 : Résumé, 2025-12-10, statut: completed, model: tinyllama
│   Job 2 : Classification, 2025-12-15, statut: completed, model: tinyllama
│   Job 3 : Extraction, 2025-12-20, statut: failed, model: tinyllama
└─ ⚠️ PAS le contenu (prompts/outputs), JUSTE les métadonnées

Marie demande : "Export RGPD de mes données"
├─ Backend récupère :
│   ├─ Ses consentements (table consents)
│   ├─ Ses jobs IA (table ai_jobs, métadonnées uniquement)
│   └─ Ses logs d'audit (table audit_events)
└─ ZIP chiffré envoyé à Marie
```

---

### **LOT 4.1 : La Purge Automatique**
**Ce qui est construit** :
- Politique de rétention (combien de temps on garde les données)
- Job de purge automatique

**Cas d'usage concret** :
```
SUPER ADMIN configure un cron quotidien :
"Purge les jobs IA > 90 jours"

Chaque nuit à 2h du matin :
├─ Script purge.ts s'exécute
├─ Pour chaque tenant (ABC, XYZ, ...)
│   ├─ Trouve les jobs IA créés avant le 25 septembre 2025
│   ├─ Supprime ces jobs (minimisation RGPD)
│   └─ Log : "Tenant ABC : 45 jobs purgés"
└─ ⚠️ Ne touche PAS aux consentements (preuve légale)

Résultat :
- Base de données allégée
- Conformité RGPD respectée (minimisation des données)
```

---

## 🔄 Flux d'utilisation complets

### **Scénario 1 : Création d'un nouveau client (SUPER ADMIN)**

```
SUPER ADMIN dans le BACK OFFICE :

1. Crée un nouveau tenant "Entreprise ABC"
   └─ INSERT INTO tenants (name, status) VALUES ('ABC', 'active')

2. Crée le premier admin de ce tenant
   └─ INSERT INTO users (tenant_id, email, scope) 
       VALUES ('abc-id', 'admin@abc.com', 'TENANT')

3. Admin@abc.com reçoit un email d'activation

4. Entreprise ABC peut commencer à utiliser la plateforme
```

---

### **Scénario 2 : Configuration d'une entreprise (TENANT ADMIN)**

```
TENANT ADMIN (admin@abc.com) se connecte au BACK OFFICE :

1. Tableau de bord :
   ├─ Nombre d'utilisateurs : 0
   ├─ Jobs IA ce mois : 0
   └─ Consentements : 0

2. Crée des comptes utilisateurs :
   ├─ Marie (marie@abc.com) → MEMBER
   ├─ Paul (paul@abc.com) → MEMBER
   └─ Jeanne (jeanne@abc.com) → MEMBER

3. Configure les consentements IA :
   ├─ Purpose: "Résumé documents"
   ├─ Purpose: "Classification emails"
   └─ Purpose: "Extraction données"

4. Marie, Paul, Jeanne reçoivent un email d'activation
```

---

### **Scénario 3 : Utilisation quotidienne de l'IA (USER)**

```
Marie (marie@abc.com) se connecte au FRONT USER :

1. Écran d'accueil :
   ├─ Upload document
   ├─ Mes consentements
   └─ Historique jobs IA

2. Marie upload un contrat PDF :
   ├─ Clique "Résumer ce document"
   ├─ Popup : "Consentement requis pour 'Résumé documents'"
   ├─ Marie accepte (1ère fois uniquement)
   └─ INSERT INTO consents (tenant_id, user_id, purpose, granted)
       VALUES ('abc-id', 'marie-id', 'summary', true)

3. Backend traite :
   ├─ Vérifie consentement : OK
   ├─ Crée job IA :
   │   └─ INSERT INTO ai_jobs (tenant_id, user_id, purpose, status)
   │       VALUES ('abc-id', 'marie-id', 'summary', 'pending')
   ├─ Envoie au Gateway LLM
   ├─ Ollama génère résumé
   ├─ UPDATE ai_jobs SET status = 'completed'
   └─ ⚠️ Contenu (PDF + résumé) NON stocké

4. Marie voit le résumé à l'écran (en temps réel)

5. Audit log automatique (LOT 1) :
   └─ INSERT INTO audit_events (tenant_id, user_id, action)
       VALUES ('abc-id', 'marie-id', 'llm.invoked')
```

---

### **Scénario 4 : Demande RGPD (USER → TENANT ADMIN)**

```
Marie demande l'export de ses données :

1. Marie clique "Exporter mes données" (FRONT USER)

2. Backend génère export :
   ├─ SELECT * FROM consents WHERE tenant_id = 'abc' AND user_id = 'marie'
   ├─ SELECT * FROM ai_jobs WHERE tenant_id = 'abc' AND user_id = 'marie'
   └─ SELECT * FROM audit_events WHERE tenant_id = 'abc' AND user_id = 'marie'

3. ZIP chiffré généré :
   ├─ consents.json (ses consentements)
   ├─ ai_jobs.json (métadonnées jobs, pas de contenu)
   └─ audit_events.json (ses actions)

4. Marie télécharge le ZIP

---

Marie demande la suppression de ses données :

1. Marie clique "Supprimer mon compte" (FRONT USER)

2. TENANT ADMIN reçoit notification (BACK OFFICE)

3. TENANT ADMIN valide la demande

4. Backend exécute suppression RGPD :
   ├─ DELETE FROM consents WHERE user_id = 'marie'
   ├─ DELETE FROM ai_jobs WHERE user_id = 'marie'
   ├─ DELETE FROM users WHERE id = 'marie'
   └─ Audit log : "User marie deleted (RGPD request)"

5. Marie ne peut plus se connecter
```

---

## 🐳 Docker & Migrations expliqués simplement

### **Docker = Boîtes isolées pour chaque service**

Imagine des containers comme des boîtes :

```
┌─────────────────────────────────────────┐
│  docker-compose.dev.yml                 │  ← Fichier de configuration
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────┐│
│  │   App    │  │   DB     │  │ Ollama││  ← 3 containers
│  │ Next.js  │  │Postgres  │  │  IA   ││
│  │ Port     │  │ Port     │  │ Port  ││
│  │ 3000     │  │ 5432     │  │ 11434 ││
│  └──────────┘  └──────────┘  └───────┘│
│       ↓             ↓           ↓      │
│  ┌────────────────────────────────┐   │
│  │  Réseau interne (rgpd_internal)│   │  ← Réseau isolé
│  └────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Commandes** :
```bash
# Démarre tous les containers
docker compose -f docker-compose.dev.yml up -d

# Voit les containers qui tournent
docker ps

# Arrête tout
docker compose -f docker-compose.dev.yml down
```

---

### **Migrations = Versions de la base de données**

Les migrations sont comme des **instructions de construction** pour la base de données :

```
migrations/
├─ 001_init.sql              ← Version 1 : Tables de base
│   ├─ CREATE TABLE tenants
│   ├─ CREATE TABLE users
│   └─ CREATE TABLE audit_events
│
└─ 002_lot4_consents_ai_jobs.sql  ← Version 2 : Tables LOT 4
    ├─ CREATE TABLE consents
    ├─ CREATE TABLE ai_jobs
    └─ CREATE TABLE schema_migrations
```

**Comment ça marche** :

```
1. Tu lances : npm run migrate

2. Script regarde table schema_migrations :
   ├─ Version actuelle : 1
   └─ Migrations disponibles : 001, 002

3. Script applique 002 (manquante) :
   ├─ Exécute 002_lot4_consents_ai_jobs.sql
   ├─ Crée tables consents + ai_jobs
   └─ INSERT INTO schema_migrations (version) VALUES (2)

4. Maintenant version DB = 2

5. Si tu relances npm run migrate :
   └─ Rien ne se passe (déjà à jour) ✅ Idempotent
```

**Pourquoi c'est important** :
- ✅ Évolutif : tu ajoutes des tables sans casser l'existant
- ✅ Traçable : tu sais quelle version de DB tu as
- ✅ Rejouable : tu peux relancer sans erreur

---

## 🎬 Mise en route complète (de zéro à prod)

### **Phase 1 : Développement local**

```bash
# 1. Clone le projet
git clone <repo>
cd rgpd-ia-platform

# 2. Installe dépendances
npm install

# 3. Copie config environnement
cp .env.example .env.local

# 4. Démarre Docker (DB + Ollama)
docker compose -f docker-compose.dev.yml up -d

# 5. Lance migrations
npm run migrate

# 6. Lance l'app Next.js
npm run dev

# 7. Ouvre http://localhost:3000
```

**Tu as maintenant** :
- ✅ Base de données avec isolation tenant
- ✅ Ollama (IA locale) qui tourne
- ✅ App Next.js accessible
- ✅ Migrations appliquées (tables créées)

---

### **Phase 2 : Premier tenant (SUPER ADMIN)**

```bash
# Tu te connectes au BACK OFFICE comme SUPER ADMIN
# Tu crées manuellement (ou via script) :

INSERT INTO tenants (id, name, status) 
VALUES ('tenant-abc', 'Entreprise ABC', 'active');

INSERT INTO users (id, tenant_id, email, scope, role)
VALUES (
  'user-admin-abc',
  'tenant-abc',
  'admin@abc.com',
  'TENANT',
  'ADMIN'
);
```

---

### **Phase 3 : Configuration entreprise (TENANT ADMIN)**

```
Admin@abc.com se connecte au BACK OFFICE :
├─ Dashboard : Stats entreprise
├─ Users : Crée Marie, Paul, Jeanne
├─ Consents : Configure purposes IA
└─ Settings : Configure logo, branding
```

---

### **Phase 4 : Utilisation (USER)**

```
Marie@abc.com se connecte au FRONT USER :
├─ Upload document
├─ Accepte consentement
├─ Résumé généré
└─ Historique accessible
```

---

## 📊 Résumé des acteurs et leurs actions

| Acteur | Interface | Actions principales |
|--------|-----------|---------------------|
| **SUPER ADMIN** | BACK OFFICE (Admin Panel) | - Créer tenants<br>- Surveiller logs système<br>- Lancer migrations<br>- Gérer sauvegardes |
| **TENANT ADMIN** | BACK OFFICE (Tenant Panel) | - Créer users de son tenant<br>- Gérer consentements<br>- Exporter données utilisateurs<br>- Voir stats IA |
| **USER** | FRONT USER (App Web) | - Utiliser IA (résumé, classification, etc.)<br>- Gérer consentements<br>- Exporter ses données<br>- Voir historique jobs |

---

## 🔐 Sécurité en 3 niveaux

```
Niveau 1 : Isolation Tenant (LOT 1)
├─ Marie (Entreprise ABC) NE VOIT PAS Paul (Entreprise XYZ)
└─ Chaque requête DB inclut tenant_id

Niveau 2 : Gateway LLM (LOT 1 + 3)
├─ SEULE porte d'entrée vers l'IA
├─ Vérifie consentement avant appel IA
└─ Ne stocke RIEN (validation LOT 3)

Niveau 3 : Audit & Purge (LOT 1 + 4)
├─ Toute action tracée (audit_events)
├─ Purge automatique > 90 jours
└─ Export RGPD complet possible
```

---

## ❓ Questions fréquentes

### "Où est le code du FRONT BACK OFFICE ?"
→ **Pas encore fait**. Les LOTs actuels sont le **backend** (API + DB). Le front admin sera fait en LOT 5+.

### "Comment Marie se connecte ?"
→ Via authentification (LOT 1). Pour l'instant, c'est du code backend. Le formulaire de login sera fait en LOT 5+.

### "Ollama tourne où ?"
→ Dans un container Docker. Quand tu fais `docker compose up`, Ollama démarre automatiquement.

### "Les migrations, je les lance quand ?"
→ 
- **Dev** : à chaque fois que tu pull du code avec nouvelle migration
- **Prod** : avant chaque déploiement (CI/CD automatique)

### "Comment je teste tout ça ?"
→ 
```bash
npm test              # Tous les tests
npm run test:rgpd     # Tests RGPD uniquement
npm run test:lot4     # Tests LOT 4 uniquement
```

---

## 🎯 Roadmap simplifiée

```
✅ EPIC 1 : Socle applicatif sécurisé (IAM, multi-tenant, Gateway LLM)
✅ EPIC 2 : Durcissement serveur & réseau (Ops/Sec RGPD)
✅ EPIC 3 : Validation technique IA locale (POC contrôlé)
✅ EPIC 4 : Stockage IA & données utilisateur RGPD
✅ EPIC 5 : Pipeline RGPD (Droits des personnes)
✅ EPIC 6 : Stack IA Docker RGPD-ready (industrialisation)
✅ EPIC 7 : Kit conformité & audit RGPD
✅ EPIC 8 : Anonymisation & Pseudonymisation (Backend)
✅ EPIC 9 : Incident Response & Security Hardening (Backend)
✅ EPIC 10 : RGPD Legal & Compliance (Backend + Docs)
✅ EPIC 11 : Back Office Super Admin (Frontend PLATFORM)

🟡 EPIC 12 : Back Office Tenant Admin (Frontend TENANT) — EN COURS (LOT 12.0-12.2 ✅)
🚧 EPIC 13 : Front User (Frontend utilisateur final)
🚧 EPIC 14 : Sécurité & Gouvernance RGPD Plateforme
🚧 EPIC 15 : Catalogue Outils IA (Gestion Platform Admin)
```

---

## 💡 En résumé (TL;DR)

**Ce que tu as construit** : Un backend SaaS multi-tenant RGPD-compliant avec IA locale

**Pour qui** :
- Super Admin → Gère la plateforme
- Tenant Admin → Gère son entreprise
- Users → Utilisent l'IA en toute sécurité

**Comment ça tourne** :
- Docker : 3 containers (App, DB, Ollama)
- Migrations : Évolution DB versionnée
- Tests : Validation RGPD automatique

**Prochaines étapes** :
- EPIC 12 : Back Office Tenant Admin (LOT 12.0-12.2 ✅, LOT 12.3-12.4 en cours)
- EPIC 13 : Front User (interface utilisateur final)
- EPIC 14 : Sécurité & Gouvernance RGPD Plateforme (monitoring, escalades)
- EPIC 15 : Catalogue Outils IA (gestion des outils IA par le Platform Admin)

---

## 📚 Références

### Documents techniques
- [LOT1_IMPLEMENTATION.md](../implementation/LOT1_IMPLEMENTATION.md)
- [LOT2_IMPLEMENTATION.md](../implementation/LOT2_IMPLEMENTATION.md)
- [LOT3_IMPLEMENTATION.md](../implementation/LOT3_IMPLEMENTATION.md)
- [LOT4.0_IMPLEMENTATION.md](../implementation/LOT4.0_IMPLEMENTATION.md)
- [LOT4.1_IMPLEMENTATION.md](../implementation/LOT4.1_IMPLEMENTATION.md)

### Guides
- [Spec Fonctionnelle Complète](../guides/spec_fonctionnelle_plateforme_ia_rgpd_multi_tenant.md)
- [Guide Ollama Setup](../guides/OLLAMA_SETUP.md)
- [Guide Claude Code Agents](../guides/guide_interne_claude_code_agents_ia.md.md)

### Architecture
- [BOUNDARIES.md](../architecture/BOUNDARIES.md) - Frontières d'architecture
- [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) - Classification des données
- [LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md) - Politique d'usage IA

### Runbooks
- [Docker Dev Setup](../runbooks/docker-dev.md)
- [Security Hardening](../runbooks/security-hardening.md)
- [Backup Policy](../runbooks/backup-policy.md)
- [Bootstrap](../runbooks/bootstrap.md)

---

**Document créé le 25 décembre 2025**
**Version 1.0**
