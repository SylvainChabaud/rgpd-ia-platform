# EPIC 13 — Front User (Interface Utilisateur Final)

**Date** : 25 décembre 2025
**Statut** : ❌ TODO
**Périmètre** : Frontend (Interface Web)
**Scope** : MEMBER (Utilisateur final)
**RGPD Coverage** : Art. 5 (Minimisation), Art. 6 (Consentement), Art. 15-17-20 (Droits utilisateurs), Art. 25 (Privacy by Design), Art. 32 (Sécurité)

---

## 0. Architecture technique (DÉCISION VALIDÉE)

### 0.1 Next.js monolithique (BACK + FRONT)

**Architecture retenue** : **Next.js monolithique avec route groups**

L'interface Front User sera développée dans le **même projet Next.js** que le backend API, en utilisant les **route groups** Next.js App Router.

**Structure** :
```
src/app/
├── api/                    # Backend API (déjà existant)
├── (backoffice)/          # Frontend Back Office (LOT 11-12)
├── (frontend)/            # 🎯 Frontend User (LOT 13.0-13.4)
│   ├── layout.tsx         # Layout User (header, footer, Cookie Banner)
│   ├── page.tsx           # Home page
│   ├── login/             # Login User
│   ├── ai-tools/          # Outils IA (résumé, classification, extraction)
│   ├── history/           # Historique d'utilisation
│   └── my-data/           # Gestion consentements + droits RGPD
├── (legal)/               # Pages légales publiques (LOT 10.0-10.2)
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   └── cookies/page.tsx
└── middleware.ts          # Middleware global (tenant, auth, RGPD)
```

**Fonctionnement route groups** :
- `(frontend)/` est un route group → **pas d'URL `/frontend`**
- URL finale : `/`, `/ai-tools`, `/history`, `/my-data`
- Séparation logique code (Frontend User vs Back Office)

**Avantages RGPD** :
- ✅ **Pas de CORS** : Frontend et API sur même origin (sécurité maximale)
- ✅ **Gateway LLM inaccessible** : Imports Gateway LLM côté serveur uniquement (pas de bypass client)
- ✅ **Middleware centralisé** : Résolution tenant, auth, permissions, audit trail
- ✅ **Consentement strict** : Middleware bloque appels IA si consentement non accordé
- ✅ **Secrets centralisés** : Un seul `.env` (pas de duplication clés API)

### 0.2 Référence

Pour les détails d'implémentation, voir **TASKS.md section 2.2** (Architecture Frontend).

---

## 1. Contexte et objectifs

### 1.1 Contexte métier

Le **User** (scope MEMBER) est l'utilisateur final de la plateforme — un employé d'une entreprise cliente qui utilise les outils IA pour son travail quotidien.

**Besoins utilisateur** :
- Utiliser les outils IA (résumer documents, classifier emails, extraire données)
- Contrôler ses consentements IA (opt-in/opt-out par usage)
- Consulter son historique d'utilisation IA
- Exercer ses droits RGPD (exporter/supprimer ses données)

**Utilisateurs cibles** :
- Collaborateur d'une entreprise cliente (tenant)
- Profil non-technique (besoin UX simple)
- Conscient RGPD (veut contrôler ses données)

### 1.2 Objectifs techniques

Construire une interface web **Front User** sécurisée et RGPD-compliant permettant à l'utilisateur de :
1. **S'authentifier** : Login simple, secure (scope MEMBER)
2. **Utiliser AI Tools** : Upload document → Choisir purpose → Obtenir résultat (résumé, classification, extraction)
3. **Gérer consentements** : Voir/accorder/révoquer consentements par purpose
4. **Consulter historique** : Voir ses jobs IA (métadonnées uniquement, max 90 jours)
5. **Exercer droits RGPD** : Exporter ses données (Art. 15/20), Supprimer son compte (Art. 17)

**Contrainte RGPD critique** :
- **Consentement obligatoire** : User doit consentir à chaque purpose avant utilisation
- **Minimisation** : Interface affiche uniquement données nécessaires (pas de P3 sauf résultat temporaire)
- **Transparence** : User comprend quels usages IA sont faits de ses données
- **Contrôle** : User peut révoquer consentements à tout moment (impact immédiat)
- **Droits** : User peut exporter/supprimer ses données facilement

### 1.3 Articulation avec autres EPICs

| EPIC | Relation | Détails |
|------|----------|---------|
| **EPIC 1** | ✅ Dépend | Utilise auth backend (RBAC/ABAC, scope MEMBER) |
| **EPIC 3** | ✅ Dépend | Appelle Gateway LLM (invokeLLM endpoint) |
| **EPIC 4** | ✅ Dépend | Lit historique ai_jobs user-scoped (max 90j) |
| **EPIC 5** | ✅ Dépend | Utilise API Routes consents, export, effacement |
| **EPIC 10** | ✅ Intègre | Intègre Cookie Banner (LOT 10.3) + liens footer pages légales (LOT 10.0-10.2) |
| **EPIC 11** | ➡️ Même codebase | Même projet Next.js (route group séparé `(backoffice)/`) |
| **EPIC 12** | ➡️ Même codebase | Même projet Next.js (route group séparé `(backoffice)/(tenant)/`) |

---

## 1.4 Corrélation FRONT ↔ BACK : Matrice des Endpoints Requis

> **⚠️ CRITIQUE** : Chaque fonctionnalité FRONT dépend d'un ou plusieurs endpoints BACK. Cette matrice garantit la cohérence et évite les oublis.

### 1.4.1 Endpoints Backend Requis par User Story

| User Story | Fonctionnalité FRONT | Endpoint BACK | Méthode | EPIC Source | Status |
|------------|---------------------|---------------|---------|-------------|--------|
| **US 13.1** | Login User | `POST /api/auth/login` | POST | EPIC 1/LOT 1.2 | ✅ Implémenté |
| **US 13.1** | Logout User | `POST /api/auth/logout` | POST | EPIC 1/LOT 1.2 | ✅ Implémenté |
| **US 13.1** | Session Check | `GET /api/auth/session` | GET | EPIC 1/LOT 1.2 | ✅ Implémenté |
| **US 13.2** | Stats Dashboard | `GET /api/users/:userId/stats` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 13.2** | Activity Feed | `GET /api/users/:userId/activity` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 13.3** | Invoke LLM | `POST /api/ai/invoke` | POST | EPIC 3/LOT 3.0 | ✅ Implémenté |
| **US 13.3** | List Purposes | `GET /api/purposes` | GET | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 13.4** | Check Consent | `GET /api/consents/:userId/:purposeId` | GET | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 13.4** | Grant Consent | `POST /api/consents` | POST | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 13.5** | Save Result (opt) | `POST /api/ai/jobs/:jobId/save` | POST | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 13.6** | List Jobs | `GET /api/users/:userId/jobs` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 13.6** | Job Details | `GET /api/ai/jobs/:jobId` | GET | EPIC 4/LOT 4.0 | ✅ Implémenté |
| **US 13.7** | List Consents | `GET /api/consents?userId=` | GET | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 13.7** | Revoke Consent | `POST /api/consents/revoke` | POST | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 13.8** | Consent History | `GET /api/consents/:userId/history` | GET | EPIC 5/LOT 5.0 | ✅ Implémenté |
| **US 13.9** | Get Profile | `GET /api/users/:userId` | GET | EPIC 5/LOT 5.3 | ✅ Implémenté |
| **US 13.9** | Update Profile | `PATCH /api/users/:userId` | PATCH | EPIC 5/LOT 5.3 | ✅ Implémenté |
| **US 13.10** | Request Export | `POST /api/rgpd/export` | POST | EPIC 5/LOT 5.1 | ✅ Implémenté |
| **US 13.10** | List Exports | `GET /api/rgpd/exports?userId=` | GET | EPIC 5/LOT 5.1 | ✅ Implémenté |
| **US 13.10** | Download Export | `GET /api/rgpd/exports/:exportId/download` | GET | EPIC 5/LOT 5.1 | ✅ Implémenté |
| **US 13.11** | Request Deletion | `POST /api/rgpd/delete` | POST | EPIC 5/LOT 5.2 | ✅ Implémenté |
| **US 13.11** | Confirm Deletion | `POST /api/rgpd/delete/confirm/:token` | POST | EPIC 5/LOT 5.2 | ✅ Implémenté |
| **Layout** | Cookie Banner | `POST /api/consents/cookies` | POST | EPIC 10/LOT 10.3 | ❌ **À implémenter** |
| **Layout** | Cookie Preferences | `GET /api/consents/cookies` | GET | EPIC 10/LOT 10.3 | ❌ **À implémenter** |

### 1.4.2 Endpoints RGPD Complémentaires (Art. 18/21/22)

> **Gaps identifiés** : Ces endpoints sont requis pour conformité RGPD complète mais non encore implémentés.

| Droit RGPD | Fonctionnalité | Endpoint BACK proposé | EPIC Source | Status |
|------------|----------------|----------------------|-------------|--------|
| **Art. 18** | Suspendre mes données | `POST /api/rgpd/suspend` | EPIC 10/LOT 10.6 | ❌ **À implémenter** |
| **Art. 18** | Réactiver mes données | `POST /api/rgpd/unsuspend` | EPIC 10/LOT 10.6 | ❌ **À implémenter** |
| **Art. 21** | Opposition traitement | `POST /api/rgpd/oppose` | EPIC 10/LOT 10.6 | ❌ **À implémenter** |
| **Art. 22** | Demander révision humaine | `POST /api/rgpd/contest` | EPIC 10/LOT 10.6 | ❌ **À implémenter** |
| **Art. 22** | List mes contestations | `GET /api/rgpd/contests?userId=` | EPIC 10/LOT 10.6 | ❌ **À implémenter** |

### 1.4.3 Prérequis BACK avant développement FRONT

| Prérequis | EPIC | Status | Bloquant FRONT |
|-----------|------|--------|----------------|
| Auth RBAC/ABAC scope MEMBER | EPIC 1 | ✅ OK | US 13.1 |
| Gateway LLM invokeLLM | EPIC 3 | ✅ OK | US 13.3 |
| Table ai_jobs + purge 90j | EPIC 4 | ✅ OK | US 13.6 |
| API Consents CRUD | EPIC 5/LOT 5.0 | ✅ OK | US 13.4, 13.7, 13.8 |
| API Export RGPD | EPIC 5/LOT 5.1 | ✅ OK | US 13.10 |
| API Deletion RGPD | EPIC 5/LOT 5.2 | ✅ OK | US 13.11 |
| **API Cookies consent** | EPIC 10/LOT 10.3 | ❌ TODO | Cookie Banner Layout |
| **API Art. 18/21/22** | EPIC 10/LOT 10.6 | ❌ TODO | Page My Data (droits complémentaires) |
| **PII Pseudonymization** | EPIC 8/LOT 8.0 | ❌ TODO | Sécurité invocation LLM (Art. 32) |

---

## 2. Exigences RGPD (bout en bout : USER → FRONT → BACK)

### 2.1 Côté Frontend (Interface)

#### ✅ Consentement obligatoire avant utilisation
- **OBLIGATOIRE** : Popup consentement à la **1ère utilisation** d'un purpose
- **OBLIGATOIRE** : Bloquer invocation LLM si consentement non accordé
- **INTERDIT** : Invoquer LLM sans consentement explicite (Art. 6 RGPD)

#### ✅ Minimisation des données affichées
- **INTERDIT** : Afficher historique prompts/outputs après traitement (P3)
- **AUTORISÉ** : Afficher résultat temporaire (le temps du traitement, puis effacé)
- **AUTORISÉ** : Afficher métadonnées historique (P1) : dates, purpose, model, status, latence
- **INTERDIT** : Persister résultats par défaut (sauf si user coche "Sauvegarder")

#### ✅ Pas de stockage local sensible
- **INTERDIT** : `localStorage` pour prompts/outputs IA (P3)
- **INTERDIT** : `localStorage` pour consentements (P2)
- **AUTORISÉ** : `sessionStorage` pour JWT token (httpOnly cookie préféré)
- **AUTORISÉ** : `localStorage` pour préférences UI (theme, langue)

#### ✅ Messages d'erreur RGPD-safe
- **INTERDIT** : Exposer détails techniques ("Ollama connection refused")
- **AUTORISÉ** : Messages génériques ("Service temporarily unavailable")

### 2.2 Côté Communication (USER → FRONT → BACK)

#### ✅ HTTPS obligatoire
- **TLS 1.3** minimum
- **HSTS** activé
- Certificat valide

#### ✅ Authentification user-scoped
- **JWT tokens** avec `userId` + `tenantId` claims
- Backend valide `userId` dans JWT = `userId` dans URL/body
- **Exemple** : `/api/users/{userId}/jobs` → JWT.userId DOIT = {userId}

#### ✅ CORS strict
- Origins autorisées : domaine Front User uniquement
- Credentials : `withCredentials: true`

#### ✅ Protection CSRF
- Tokens CSRF sur toutes mutations (POST/PUT/DELETE)

### 2.3 Côté Backend (déjà couvert)

Références aux EPICs backend existants :
- ✅ **EPIC 1** : Auth RBAC/ABAC (scope MEMBER validé)
- ✅ **EPIC 3** : Gateway LLM (consentement validé, stateless)
- ✅ **EPIC 4** : Historique jobs user-scoped (WHERE user_id = $1)
- ✅ **EPIC 5** : Consents, Export, Effacement (déjà implémentés)
- ✅ **EPIC 1** : Audit trail (actions user loguées)

---

## 3. Périmètre fonctionnel

### 3.1 User Stories

#### US 13.1 : Authentification User
**En tant que** User (scope MEMBER)  
**Je veux** me connecter à la plateforme  
**Afin de** utiliser les outils IA

**Acceptance Criteria** :
- [ ] Page login dédiée (distincte Back Office)
- [ ] Formulaire : Email, Password
- [ ] Validation : Email format valide, Password min 8 caractères
- [ ] Authentification réussie → JWT token avec scope MEMBER
- [ ] Redirection vers Home (dashboard user)
- [ ] Logout fonctionnel (invalidation token)
- [ ] 2FA optionnel (recommandé mais pas obligatoire)

---

#### US 13.2 : Page Home (Dashboard User)
**En tant que** User  
**Je veux** voir un dashboard de mon activité  
**Afin de** avoir une vue d'ensemble

**Acceptance Criteria** :
- [ ] Widgets KPIs :
  - Total jobs IA ce mois
  - Jobs succès vs échecs
  - Consentements actifs (accordés)
  - Dernière utilisation (date + purpose)
- [ ] Graphique : Jobs IA par jour (30 derniers jours)
- [ ] Section "Quick Actions" :
  - Bouton "Utiliser AI Tools" (→ US 13.3)
  - Bouton "Gérer mes consentements" (→ US 13.7)
  - Bouton "Exporter mes données" (→ US 13.10)
- [ ] Activity feed (10 dernières actions) :
  - Job IA lancé (date, purpose, status)
  - Consentement accordé/révoqué (date, purpose)
- [ ] **User-scoped** : Voit uniquement **ses** données

---

#### US 13.3 : Utiliser AI Tools (Upload + Purpose + Invoke)
**En tant que** User  
**Je veux** utiliser les outils IA sur un document  
**Afin de** obtenir un résumé/classification/extraction

**Acceptance Criteria** :
- [ ] Page "AI Tools" :
  - **Étape 1 : Upload document**
    - Drag & drop file picker
    - Formats acceptés : PDF, TXT, DOCX (max 10MB)
    - Affichage nom fichier + taille
  - **Étape 2 : Choisir purpose**
    - Dropdown purposes disponibles :
      - Résumé de documents
      - Classification de documents
      - Extraction de données structurées
    - Description purpose affichée
  - **Étape 3 : Validation consentement**
    - Si 1ère utilisation du purpose → **Popup consentement obligatoire** :
      - Titre : "Autoriser [Purpose] ?"
      - Description : Usage des données
      - Checkbox : "J'accepte que mes documents soient traités pour [Purpose]"
      - Boutons : "Accepter" / "Refuser"
    - Si consentement déjà accordé → Skip popup
    - Si consentement refusé → Bloquer invocation (message)
  - **Étape 4 : Invocation LLM**
    - Bouton "Traiter le document"
    - Progress bar (pending → processing → completed)
    - Streaming optionnel (améliore UX mais complexe)
  - **Étape 5 : Affichage résultat**
    - Zone résultat affichée (texte formaté)
    - **Temporaire** : Résultat pas persisté par défaut
    - Option "Sauvegarder résultat" (checkbox) :
      - Si cochée : résultat sauvegardé dans ai_jobs (P3)
      - Si non cochée : résultat effacé après fermeture page
- [ ] **Gestion erreurs** :
  - Document trop volumineux (> 10MB)
  - Format non supporté
  - Consentement refusé
  - LLM error (timeout, échec modèle)
- [ ] **Audit** : Chaque invocation loguée (audit event)

---

#### US 13.4 : Consentement popup (1ère utilisation purpose)
**En tant que** User  
**Je veux** être informé avant la 1ère utilisation d'un purpose  
**Afin de** donner mon consentement explicite (Art. 6 RGPD)

**Acceptance Criteria** :
- [ ] Popup consentement apparaît **avant** invocation LLM
- [ ] Contenu popup :
  - Titre : "Autoriser [Purpose] ?"
  - Description détaillée :
    - Usage des données (ex. "Vos documents seront analysés par IA pour résumer leur contenu")
    - Données traitées (ex. "Contenu des documents uploadés")
    - Durée conservation (ex. "Métadonnées conservées 90 jours, résultats non persistés par défaut")
  - Checkbox : "J'accepte que mes documents soient traités pour [Purpose]"
  - Liens : "Politique de confidentialité", "En savoir plus"
  - Boutons :
    - "Accepter" → Consent granted, invocation LLM proceed
    - "Refuser" → Consent revoked, invocation bloquée, message user
- [ ] Popup affichée **uniquement 1ère fois** (ensuite skip si consent granted)
- [ ] Backend enregistre consentement (POST /api/consents)
- [ ] Audit event créé (consent.granted ou consent.revoked)

---

#### US 13.5 : Voir le résultat LLM (temporaire, non persisté)
**En tant que** User  
**Je veux** voir le résultat de mon traitement IA  
**Afin de** exploiter l'information

**Acceptance Criteria** :
- [ ] Zone résultat affichée après invocation LLM :
  - Texte formaté (paragraphes, listes)
  - Markdown support (si output Markdown)
  - Copier résultat (bouton copy)
- [ ] **Non persisté par défaut** :
  - Résultat affiché uniquement en mémoire (React state)
  - **Pas de stockage localStorage** (P3 interdit)
  - **Pas de stockage backend** (sauf si user coche "Sauvegarder")
- [ ] Option "Sauvegarder résultat" :
  - Checkbox visible
  - Si cochée : POST /api/jobs/{jobId}/save (résultat persisté P3)
  - Si non cochée : résultat effacé dès fermeture page
- [ ] **Warning RGPD** : "Résultat temporaire. Cochez 'Sauvegarder' pour le conserver."

---

#### US 13.6 : Voir mon historique AI Jobs
**En tant que** User  
**Je veux** consulter mon historique d'utilisation IA  
**Afin de** suivre mes traitements

**Acceptance Criteria** :
- [ ] Page "Mon historique" :
  - Table jobs IA :
    - Date, Purpose, Model, Status (success/failed), Latence (ms)
  - **Pas d'affichage prompts/outputs** (P3 interdit sauf si sauvegardé)
  - Icône "Sauvegardé" (si résultat persisté)
- [ ] Filtres :
  - Par purpose (dropdown)
  - Par status (success/failed/all)
  - Par date range (30/60/90 jours)
- [ ] Pagination (50 par page)
- [ ] Tri par colonne (date, latence)
- [ ] Action "Voir détails" (clic ligne) :
  - Modal détails job :
    - Date, Purpose, Model, Status, Latence
    - **Résultat affiché uniquement si sauvegardé**
- [ ] **Rétention** : Max 90 jours (purge automatique backend)
- [ ] **User-scoped** : Voit uniquement **ses** jobs

---

#### US 13.7 : Gérer mes consentements (Liste + Toggle)
**En tant que** User  
**Je veux** gérer mes consentements IA  
**Afin de** contrôler les usages autorisés

**Acceptance Criteria** :
- [ ] Page "Mes consentements" :
  - Liste purposes disponibles :
    - Purpose label
    - Purpose description
    - État consentement : Toggle switch (on/off)
    - Historique (date accordé, date révoqué)
  - Toggle fonctionnel :
    - ON (vert) : Consent granted
    - OFF (gris) : Consent revoked
- [ ] Actions :
  - Clic toggle ON → OFF : **Confirmation obligatoire** (popup) :
    - "Révoquer [Purpose] ?"
    - Warning : "Vous ne pourrez plus utiliser [Purpose] après révocation"
    - Boutons : "Confirmer" / "Annuler"
  - Clic toggle OFF → ON : Accord immédiat (pas de confirmation)
- [ ] Backend :
  - Toggle ON → OFF : POST /api/consents/revoke
  - Toggle OFF → ON : POST /api/consents/grant
- [ ] Audit event créé (consent.granted ou consent.revoked)
- [ ] **Impact immédiat** : Invocation LLM bloquée après revoke

---

#### US 13.8 : Voir l'historique de mes consentements
**En tant que** User  
**Je veux** voir l'historique de mes consentements  
**Afin de** tracer mes changements (transparence RGPD)

**Acceptance Criteria** :
- [ ] Section "Historique consentements" (sous page "Mes consentements") :
  - Table : Date, Purpose, Action (accordé/révoqué), Source (user/admin)
- [ ] Filtres :
  - Par purpose (dropdown)
  - Par action (granted/revoked/all)
  - Par date range (30/60/90 jours)
- [ ] Pagination (50 par page)
- [ ] Export CSV historique consentements (optionnel)
- [ ] **User-scoped** : Voit uniquement **ses** consentements

---

#### US 13.9 : Éditer mon profil
**En tant que** User  
**Je veux** éditer mes informations personnelles  
**Afin de** mettre à jour mon compte

**Acceptance Criteria** :
- [ ] Page "Mon profil" :
  - Formulaire pré-rempli :
    - Name (éditable)
    - Email (lecture seule, pas éditable)
    - Password (éditable) : "Changer mot de passe" (formulaire séparé)
- [ ] Validation :
  - Name 2-100 caractères
  - Password (si changé) : min 8 caractères, 1 majuscule, 1 chiffre
- [ ] Sauvegarde :
  - PATCH /api/users/{userId}
  - Audit event créé (user.updated)
- [ ] Feedback : Toast succès

---

#### US 13.10 : Exporter mes données RGPD (Art. 15/20)
**En tant que** User  
**Je veux** exporter toutes mes données  
**Afin de** exercer mon droit RGPD (Art. 15/20)

**Acceptance Criteria** :
- [ ] Page "Mes données RGPD" :
  - Section "Exporter mes données" :
    - Bouton "Exporter mes données"
    - Description : "Vous recevrez un bundle chiffré contenant toutes vos données (profil, jobs IA, consentements, audit trail)"
  - Liste exports disponibles (table) :
    - Export ID, Créé le, Expire le (TTL 7j), Downloads restants (max 3), Status (pending/completed/expired)
- [ ] Actions :
  - Clic "Exporter mes données" :
    - POST /api/users/{userId}/exports
    - Toast : "Export en cours. Vous recevrez un email quand prêt."
  - Clic "Télécharger" (si export completed) :
    - Modal password : "Entrez un password pour chiffrer le bundle"
    - Download bundle ZIP chiffré (AES-256-GCM)
    - Décrémente downloads_count (max 3)
- [ ] **Contenu export** (backend) :
  - user.json : Profil (name, email, created_at)
  - ai_jobs.json : Historique jobs (métadonnées + résultats si sauvegardés)
  - consents.json : Consentements (purpose, granted/revoked, dates)
  - audit_events.json : Audit trail user
- [ ] **TTL** : Export expire après 7 jours (purge automatique)
- [ ] **Max downloads** : 3 fois maximum (sécurité)
- [ ] Audit event créé (rgpd.export.requested, rgpd.export.downloaded)

---

#### US 13.11 : Supprimer mon compte RGPD (Art. 17)
**En tant que** User  
**Je veux** supprimer mon compte et mes données  
**Afin de** exercer mon droit à l'effacement (Art. 17 RGPD)

**Acceptance Criteria** :
- [ ] Page "Mes données RGPD" :
  - Section "Supprimer mon compte" :
    - Bouton "Supprimer mon compte" (rouge, danger)
    - Warning : "⚠️ Action irréversible. Vos données seront supprimées définitivement après 30 jours."
- [ ] Confirmation double :
  - **Popup 1** :
    - Titre : "Supprimer mon compte ?"
    - Description : "Vos données seront rendues inaccessibles immédiatement (soft delete). Suppression définitive après 30 jours."
    - Checkbox : "Je comprends que cette action est irréversible"
    - Boutons : "Confirmer" / "Annuler"
  - **Email 2** :
    - Email envoyé avec lien confirmation (token unique, TTL 24h)
    - User clique lien → Soft delete effectué
- [ ] Soft delete immédiat :
  - User status = `deleted` (inaccessible immédiatement)
  - User ne peut plus se connecter
  - Données marquées `deleted_at = NOW()`
- [ ] Purge définitive après 30 jours :
  - Cron job backend (purge.ts)
  - Suppression physique données (user, ai_jobs, consents, audit_events)
- [ ] Audit event créé (rgpd.deletion.requested, rgpd.deletion.completed)
- [ ] Notifications :
  - Email confirmation (soft delete effectué)
  - Email 30j après (purge définitive effectuée)

---

#### US 13.12 : Notification consentement révoqué (impact LLM)
**En tant que** User  
**Je veux** être informé de l'impact d'une révocation de consentement  
**Afin de** comprendre les conséquences

**Acceptance Criteria** :
- [ ] Popup révocation consentement (US 13.7) affiche :
  - "⚠️ Attention : Si vous révoquez [Purpose], vous ne pourrez plus utiliser cet outil IA."
  - "Vos jobs IA en cours pour [Purpose] seront annulés."
- [ ] Tentative invocation LLM avec consentement révoqué :
  - Backend rejette (403 Forbidden)
  - Frontend affiche message : "Vous devez accorder votre consentement pour [Purpose] avant utilisation."
  - Bouton "Gérer mes consentements" (→ US 13.7)
- [ ] Toast notification (révocation effectuée) :
  - "Consentement révoqué pour [Purpose]. Vous ne pouvez plus utiliser cet outil."

---

### 3.2 Hors périmètre (EPIC 13)

❌ **Pas dans cet EPIC** :
- Gestion users tenant (CRUD users) → EPIC 12 (Tenant Admin)
- Gestion tenants (CRUD tenants) → EPIC 11 (Super Admin)
- Configuration purposes IA → EPIC 12 (Tenant Admin)
- Logs système → EPIC 11 (Super Admin)
- Billing/facturation → EPIC futur
- Collaboration temps réel → EPIC futur

---

## 4. Architecture technique

### 4.1 Stack technique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Framework** | Next.js 14+ App Router ou React SPA | SSR pour SEO, cohérence plateforme |
| **Auth** | NextAuth.js v5 ou JWT cookies | Session management, intégration native |
| **UI Library** | shadcn/ui (Radix UI + Tailwind) | Composants accessibles, cohérence design |
| **Styling** | Tailwind CSS | Cohérence design system |
| **Forms** | React Hook Form + Zod | Validation typesafe |
| **State** | Zustand ou Context API | Léger, suffisant |
| **Data fetching** | SWR ou TanStack Query | Cache, revalidation |
| **Upload** | React Dropzone | Drag & drop files |
| **Charts** | Recharts | Graphiques stats |
| **Tables** | TanStack Table | Filtres, tri, pagination |

### 4.2 Structure du projet (Next.js Monolithique partagé avec EPIC 11-12)

**Architecture DÉCIDÉE** : Next.js monolithique (BACK + FRONT dans le même projet) — cf. [TASKS.md section 2.2](../../TASKS.md#22-architecture-frontend)

```
src/app/
├── api/                       # Backend API (Route Handlers) - EPIC 1-7
│   ├── auth/
│   ├── tenants/
│   ├── users/
│   ├── consents/
│   ├── ai/
│   ├── rgpd/
│   └── audit/
│
├── (backoffice)/              # Frontend Back Office (EPIC 11-12)
│   └── ...                    # Voir EPIC 11-12
│
├── (frontend)/                # 🎯 Frontend User (route group) - EPIC 13
│   ├── layout.tsx             # Layout User (header, footer, Cookie Banner)
│   ├── page.tsx               # Home page
│   ├── login/page.tsx         # Login User
│   ├── ai-tools/page.tsx      # AI Tools (LOT 13.1)
│   ├── history/page.tsx       # Historique AI Jobs (LOT 13.2)
│   ├── consents/              # Mes Consentements (LOT 13.3)
│   │   ├── page.tsx           # Liste consentements
│   │   └── history/page.tsx   # Historique consentements
│   ├── my-data/               # Mes Données RGPD (LOT 13.4)
│   │   ├── export/page.tsx    # Export RGPD
│   │   └── delete/page.tsx    # Supprimer compte
│   └── profile/page.tsx       # Mon profil
│
├── (legal)/                   # Pages légales publiques (EPIC 10)
│   ├── privacy-policy/page.tsx
│   ├── terms-of-service/page.tsx
│   └── rgpd-info/page.tsx
│
└── middleware.ts              # Middleware global (tenant, auth, RGPD)

src/
├── components/
│   ├── ui/                    # shadcn components (partagés)
│   ├── backoffice/            # Components Back Office (EPIC 11-12)
│   ├── frontend/              # Components Front User (EPIC 13)
│   │   ├── ai-tools/
│   │   │   ├── FileUploader.tsx   # Drag & drop
│   │   │   ├── PurposeSelector.tsx # Dropdown purposes
│   │   │   ├── ConsentPopup.tsx   # Popup consentement
│   │   │   └── ResultViewer.tsx   # Affichage résultat LLM
│   │   └── consents/
│   │       ├── ConsentToggle.tsx  # Toggle switch
│   │       └── ConsentHistory.tsx # Table historique
│   └── shared/                # Components partagés
├── lib/
│   ├── api.ts                 # API client (fetch wrapper)
│   ├── auth.ts                # NextAuth config
│   └── utils.ts
└── middleware.ts              # Auth + scope validation
```

**Fonctionnement route groups** :
- `(frontend)/` est un route group → **pas d'URL `/frontend`**
- URL finale : `/`, `/ai-tools`, `/history`, `/my-data`, `/consents`
- Séparation logique code (Frontend User vs Back Office)

**Avantages RGPD** (cf. TASKS.md section 2.2) :
- ✅ **Pas de CORS** : Frontend et API sur même origin (sécurité maximale)
- ✅ **Gateway LLM inaccessible** : Imports Gateway LLM côté serveur uniquement (pas de bypass client)
- ✅ **Middleware centralisé** : Résolution tenant, auth, permissions, audit trail
- ✅ **Consentement strict** : Middleware bloque appels IA si consentement non accordé
- ✅ **Secrets centralisés** : Un seul `.env` (pas de duplication clés API)

### 4.3 Middleware Auth (scope MEMBER)

```typescript
// src/middleware.ts (middleware global partagé)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Routes publiques (login, pages légales)
  const publicPaths = ['/login', '/legal'];
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Auth requise
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Routes Frontend User (scope MEMBER) - route group (frontend)/
  const frontendPaths = ['/', '/ai-tools', '/history', '/consents', '/my-data', '/profile'];
  if (frontendPaths.some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'))) {
    // BLOCKER: User doit avoir scope MEMBER
    if (token.scope !== 'MEMBER') {
      return NextResponse.json(
        { error: 'Forbidden: MEMBER scope required' },
        { status: 403 }
      );
    }

    // BLOCKER: Extraction userId depuis JWT
    const userId = token.userId as string;
    if (!userId) {
      return NextResponse.json(
        { error: 'Forbidden: No user associated' },
        { status: 403 }
      );
    }

    // Inject userId dans headers (disponible dans API Routes)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 4.4 API Client User-scoped

```typescript
// src/lib/api.ts (API client partagé)
export async function apiClientUser<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Endpoint doit inclure {userId}
  // Ex: /api/users/{userId}/jobs
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    // RGPD-safe error handling
    const error = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Hook React pour récupérer userId depuis JWT
export function useUserId(): string {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error('No user authenticated');
  }

  return userId;
}

// Exemple usage
export function useJobs() {
  const userId = useUserId();

  return useSWR(`/api/users/${userId}/jobs`, apiClientUser);
}
```

### 4.5 Composants réutilisables (User-scoped)

#### FileUploader (Upload document)
```tsx
// components/ai-tools/FileUploader.tsx
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  acceptedFormats: string[]; // ['application/pdf', 'text/plain', ...]
  maxSize: number; // bytes
}

export function FileUploader({ onFileSelect, acceptedFormats, maxSize }: FileUploaderProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => onFileSelect(files[0]),
    accept: acceptedFormats,
    maxSize,
    multiple: false,
  });

  return (
    <div {...getRootProps()} className="border-2 border-dashed p-8">
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Déposez le fichier ici...</p>
      ) : (
        <p>Glissez-déposez un fichier ou cliquez pour sélectionner</p>
      )}
    </div>
  );
}
```

#### ConsentPopup (Popup consentement)
```tsx
// components/ai-tools/ConsentPopup.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ConsentPopupProps {
  purpose: Purpose;
  onAccept: () => void;
  onReject: () => void;
  open: boolean;
}

export function ConsentPopup({ purpose, onAccept, onReject, open }: ConsentPopupProps) {
  const [checked, setChecked] = React.useState(false);

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Autoriser {purpose.label} ?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>{purpose.description}</p>
          <p className="text-sm text-muted-foreground">
            Vos documents seront traités par IA. Métadonnées conservées 90 jours.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <label>J'accepte que mes documents soient traités pour {purpose.label}</label>
          </div>
          <div className="flex gap-2">
            <button onClick={onReject}>Refuser</button>
            <button onClick={onAccept} disabled={!checked}>Accepter</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### ConsentToggle (Toggle switch)
```tsx
// components/consents/ConsentToggle.tsx
import { Switch } from '@/components/ui/switch';

interface ConsentToggleProps {
  purpose: Purpose;
  granted: boolean;
  onToggle: (granted: boolean) => void;
}

export function ConsentToggle({ purpose, granted, onToggle }: ConsentToggleProps) {
  const handleToggle = async (newValue: boolean) => {
    // Si révocation (true → false), confirmation obligatoire
    if (!newValue) {
      const confirmed = window.confirm(
        `Révoquer ${purpose.label} ? Vous ne pourrez plus utiliser cet outil après révocation.`
      );
      if (!confirmed) return;
    }

    onToggle(newValue);
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3>{purpose.label}</h3>
        <p className="text-sm text-muted-foreground">{purpose.description}</p>
      </div>
      <Switch checked={granted} onCheckedChange={handleToggle} />
    </div>
  );
}
```

---

## 5. Contraintes RGPD (Frontend spécifique)

### 5.1 Consentement obligatoire avant invocation LLM

**Règle** : User doit consentir explicitement avant 1ère utilisation d'un purpose

**Implémentation** :
```typescript
// ✅ OK : Vérifier consentement avant invocation
const consent = await checkConsent(userId, purposeId);
if (!consent.granted) {
  // Afficher popup consentement
  showConsentPopup();
  return;
}

// Consentement OK → Invoquer LLM
await invokeLLM({ document, purpose });
```

**Validation** :
- [ ] Popup consentement affichée **1ère fois uniquement**
- [ ] Backend rejette invocation si consentement non accordé (403)
- [ ] Tests E2E consentement + invocation

### 5.2 Pas de persistance résultats par défaut

**Règle** : Résultats LLM affichés temporairement, pas sauvegardés sauf option user

**Implémentation** :
```typescript
// ✅ OK : Résultat en mémoire (React state)
const [result, setResult] = useState<string | null>(null);

// ❌ INTERDIT : Stocker résultat localStorage
localStorage.setItem('llm-result', result);

// ✅ OK : Option "Sauvegarder" (si user coche)
if (saveResult) {
  await apiClientUser(`/api/jobs/${jobId}/save`, {
    method: 'POST',
    body: JSON.stringify({ result }),
  });
}
```

### 5.3 Pas de stockage local sensible

**Règle** : Aucune donnée P2/P3 dans `localStorage` ou `sessionStorage`

**Autorisé** :
```typescript
// ✅ OK : Préférences UI (P0)
localStorage.setItem('theme', 'dark');
localStorage.setItem('language', 'fr');
```

**Interdit** :
```typescript
// ❌ INTERDIT : Résultats LLM (P3)
localStorage.setItem('llm-results', JSON.stringify(results));

// ❌ INTERDIT : Consentements (P2)
localStorage.setItem('consents', JSON.stringify(consents));
```

### 5.4 Messages d'erreur RGPD-safe

**Règle** : Pas d'exposition détails techniques

**Implémentation** :
```typescript
// ❌ INTERDIT
toast.error(`Ollama error: Connection refused on localhost:11434`);

// ✅ OK
toast.error('Service temporarily unavailable. Please try again later.');
```

### 5.5 Validation côté client (non bloquante sécurité)

**Règle** : Validation côté client = UX uniquement

**Implémentation** :
```typescript
// ✅ Validation Zod côté client (UX)
const fileSchema = z.object({
  name: z.string(),
  size: z.number().max(10 * 1024 * 1024), // 10MB
  type: z.enum(['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
});

// ⚠️ Backend DOIT RE-VALIDER (sécurité)
// app/api/llm/invoke/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const validated = fileSchema.parse(body); // Re-validation backend
  // ...
}
```

---

## 6. Acceptance Criteria (Epic-level)

### 6.1 Fonctionnel

- [ ] User peut se connecter (scope MEMBER)
- [ ] Dashboard user affiche stats exactes (jobs, consents)
- [ ] Upload document fonctionnel (PDF, TXT, DOCX max 10MB)
- [ ] Purpose sélectionnable (dropdown)
- [ ] Popup consentement affichée **1ère utilisation** purpose
- [ ] Invocation LLM bloquée si consentement non accordé
- [ ] Résultat LLM affiché temporairement (non persisté par défaut)
- [ ] Option "Sauvegarder résultat" fonctionnelle
- [ ] Historique jobs user-scoped (max 90 jours)
- [ ] Gestion consentements (toggle on/off par purpose)
- [ ] Export RGPD fonctionnel (bundle chiffré)
- [ ] Suppression compte fonctionnelle (soft delete + purge 30j)

### 6.2 RGPD

- [ ] **Consentement obligatoire** : Popup avant 1ère utilisation purpose
- [ ] **Minimisation** : Pas d'affichage historique prompts/outputs (sauf sauvegardés)
- [ ] **Pas de stockage local P2/P3** : localStorage/sessionStorage safe
- [ ] **Messages RGPD-safe** : Pas de stack traces, détails techniques masqués
- [ ] **Transparence** : User comprend usages IA (popup consentement)
- [ ] **Contrôle** : User peut révoquer consentements (impact immédiat)
- [ ] **Droits** : Export/effacement fonctionnels (Art. 15/17/20)

### 6.3 Sécurité

- [ ] HTTPS obligatoire (HSTS activé)
- [ ] JWT tokens httpOnly (pas localStorage)
- [ ] CSRF protection activée
- [ ] CSP headers configurés
- [ ] XSS protection (pas de dangerouslySetInnerHTML)
- [ ] Middleware valide scope MEMBER (403 si PLATFORM/TENANT tente accès)
- [ ] Backend valide userId JWT = userId URL/body

### 6.4 Performance

- [ ] Time to Interactive < 2s (home)
- [ ] Upload document < 5s (max 10MB)
- [ ] Invocation LLM < 30s (timeout configurable)
- [ ] Pagination performante (historique 100+ items)
- [ ] SWR cache actif (pas de refetch inutile)

### 6.5 UX

- [ ] Design moderne et épuré (shadcn/ui)
- [ ] Responsive (mobile-first)
- [ ] Feedback utilisateur (toasts, loading states, progress bar)
- [ ] Accessibility (WCAG 2.1 AA minimum)
- [ ] Navigation intuitive (sidebar claire, breadcrumbs)
- [ ] Onboarding user (tooltip, hints)

---

## 7. Découpage en LOTs

Référence **TASKS.md** :

| LOT | Description | Durée estimée | Dépendances |
|-----|-------------|---------------|-------------|
| **LOT 13.0** | Authentification + Layout User | 3 jours | LOT 5.3 (API Routes) |
| **LOT 13.1** | AI Tools (Upload + Invoke + Consent Popup) | 5 jours | LOT 3.0 (Gateway LLM), LOT 5.0 (Consents backend), LOT 13.0 |
| **LOT 13.2** | Historique AI Jobs (Liste + Filtres) | 3 jours | LOT 4.0 (ai_jobs backend), LOT 13.0 |
| **LOT 13.3** | Mes Consentements (Liste + Toggle + Historique) | 4 jours | LOT 5.0 (Consents backend), LOT 13.0 |
| **LOT 13.4** | Mes Données RGPD (Export + Effacement) | 4 jours | LOT 5.1-5.2 (Export/Effacement backend), LOT 13.0 |

**Total EPIC 13** : ~19 jours (3,8 semaines)

---

## 8. Risques et mitigations

### 8.1 Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| **Invocation LLM sans consentement** | Faible | 🔴 CRITIQUE | Backend valide consentement (double validation), tests E2E |
| **Exposition résultats LLM (P3)** | Moyenne | 🔴 CRITIQUE | Pas de persistance par défaut, localStorage interdit, tests RGPD |
| **Upload fichiers malveillants** | Moyenne | 🟠 ÉLEVÉ | Validation type MIME, scan antivirus (optionnel), taille max 10MB |
| **Timeout invocation LLM** | Élevée | 🟡 MOYEN | Timeout configurable (30s), retry automatique, feedback user |
| **XSS via résultats LLM** | Faible | 🟠 ÉLEVÉ | CSP strict, escape HTML, sanitize résultats |

### 8.2 Tests obligatoires

- [ ] **Tests E2E** (Playwright) :
  - Auth flow user (login → home → logout)
  - Upload document + invoke LLM E2E
  - Popup consentement (1ère utilisation)
  - Révocation consentement + bloquer LLM
  - Export RGPD E2E (download bundle)
  - Supprimer compte E2E (soft delete vérifié)
- [ ] **Tests RGPD** :
  - Consentement obligatoire avant invocation LLM
  - Pas de résultats P3 affichés (historique métadonnées uniquement)
  - Pas de données P2/P3 dans localStorage
  - Messages erreur RGPD-safe
  - Export bundle chiffré (validation format)
- [ ] **Tests Sécurité** :
  - Middleware rejette scope PLATFORM/TENANT sur routes user
  - Backend valide userId JWT = userId URL
  - CSRF tokens présents (toutes mutations)
  - Upload fichiers malveillants rejetés

---

## 9. Checklist de livraison (DoD EPIC 13)

### Code
- [ ] Tous les LOTs 13.0-13.4 implémentés
- [ ] Tests E2E passants (100%)
- [ ] Tests RGPD passants (100%)
- [ ] TypeScript strict (0 erreurs)
- [ ] Lint passant (0 warnings)

### Documentation
- [ ] README Front User (setup, usage)
- [ ] Guide utilisateur final (manuel, FAQ)

### Sécurité
- [ ] Scan sécurité frontend (npm audit)
- [ ] CSP validé
- [ ] Isolation user validée (tests)

### Performance
- [ ] Lighthouse score > 90
- [ ] Bundle size < 500KB (gzip)
- [ ] Upload/invocation LLM < 30s

### RGPD
- [ ] Consentement obligatoire (tests E2E)
- [ ] Pas de résultats P3 persistés par défaut (audit)
- [ ] Export bundle chiffré (validation)
- [ ] Soft delete + purge fonctionnel (tests)

---

## 10. Prochaines étapes

Après complétion EPIC 13 :
1. Toutes les interfaces utilisateurs (Front + Back Office) sont complétées
2. Prochains EPICs : Fonctionnalités avancées (Collaboration, Billing, Analytics)

---

**Document créé le 25 décembre 2025**  
**Version 1.0**  
**Auteur** : Équipe Plateforme RGPD-IA
