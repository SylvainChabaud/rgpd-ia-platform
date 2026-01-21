# BOUNDARIES.md — Frontières d’architecture & responsabilités

> **Objectif** : définir des **frontières claires, non ambiguës et auditables** entre les différentes couches de la plateforme (UI, API, Domaine, IA, Stockage, RGPD, Infra, CLI), afin d’éviter les dérives fonctionnelles, sécuritaires et RGPD.

Ce document est **normatif**. Toute violation constitue un **défaut d’architecture bloquant**.

---

## 1. Principe fondamental

👉 **Une responsabilité = une couche = un périmètre strict**

- Aucune couche ne doit implémenter la responsabilité d’une autre.
- Les échanges entre couches sont **explicitement contractuels**.
- Toute donnée sensible doit avoir un **parcours maîtrisé, justifié et traçable**.

---

## 2. Vue globale des couches

```
[ Frontend (UI) ]
        ↓
[ API / Application Layer ]
        ↓
[ Domaine Métier ]
        ↓
[ Gateway LLM ]
        ↓
[ Runtime IA ]

[ Domaine Métier ] ↔ [ Stockage ]
[ RGPD Pipeline ] ↔ [ Stockage ]

[ CLI Bootstrap ] ──→ [ Application Layer ]

[ Infrastructure ] (transverse)
```

---

## 3. Frontend (UI — Next.js)

### Rôle autorisé
- Affichage des données
- Interaction utilisateur
- Gestion d'état UI
- Déclenchement d'actions via API

### Interdictions absolues
- ❌ Appel direct à un modèle IA
- ❌ Appel direct à une API IA externe
- ❌ Manipulation de données sensibles brutes
- ❌ Implémentation de logique RGPD

### Données autorisées
- Données déjà filtrées et validées par l'API
- Identifiants techniques (IDs, tokens opaques)

### Architecture des routes et authentification (DÉCISION VALIDÉE)

**Principe de sécurité** : Login unique avec redirection scope-based (Security by Design)

```
/           → Redirect vers /login (pas de page d'accueil publique)
/login      → Login unifié → redirection automatique selon scope
/admin/*    → Super Admin (scope PLATFORM) - URL non exposée publiquement
/portal/*   → Tenant Admin (scope TENANT) - URL non exposée publiquement
/app/*      → End User (scope MEMBER) - Interface principale
```

**Règles de sécurité** :

| Règle | Justification |
|-------|---------------|
| **Pas de page d'accueil avec choix d'interface** | Évite l'exposition de l'architecture (surface d'attaque) |
| **Login unique `/login`** | Point d'entrée centralisé, redirection intelligente post-auth |
| **URLs backoffice non liées publiquement** | `/admin` et `/portal` connus uniquement des utilisateurs autorisés |
| **Redirection scope-based automatique** | Après login → interface correspondant au scope JWT |
| **Pas de hint sur existence d'autres interfaces** | Principe du moindre privilège, security by obscurity |

**Conformité standards SaaS B2B** :
- ✅ Salesforce, HubSpot, Datadog utilisent cette approche
- ✅ Backoffice admin jamais exposé sur landing page
- ✅ URLs admin communiquées en interne uniquement (documentation, bookmarks)

**Anti-patterns interdits** :
- ❌ Page d'accueil avec boutons "Super Admin | Tenant Admin | Utilisateur"
- ❌ Liens vers `/admin` depuis pages publiques
- ❌ Menu de navigation exposant toutes les interfaces

---

## 4. API / Application Layer

### Rôle autorisé
- Orchestration des cas d’usage
- Validation stricte des entrées (schemas)
- Résolution du **RequestContext** (tenant, acteur, rôles)
- Application des règles d’accès (RBAC / ABAC)
- Appel au Domaine Métier
- Appel à la Gateway LLM

### Interdictions
- ❌ Accès direct au stockage sans passer par le Domaine ou des repositories contrôlés
- ❌ Appel direct aux modèles IA
- ❌ Stockage de données sans justification métier

---

## 5. Domaine Métier

### Rôle autorisé
- Règles métier pures
- Invariants fonctionnels
- Décisions métier
- Normalisation et validation métier des données

### Interdictions
- ❌ Appels réseau
- ❌ Accès direct aux modèles IA
- ❌ Accès direct à l’infrastructure ou aux secrets

> Le Domaine **ignore l’existence de l’IA, du stockage et de l’infrastructure**.

---

## 6. Gateway LLM (barrière obligatoire)

### Rôle autorisé
- Point d’entrée **unique et obligatoire** vers toute IA
- Redaction et pseudonymisation
- Filtrage et validation des prompts
- Application des politiques RGPD et LLM
- Journalisation RGPD-safe des appels IA

### Interdictions
- ❌ Bypass par le Frontend, l’API ou le Domaine
- ❌ Appels non tracés ou non contextualisés
- ❌ Envoi de données non minimisées ou non classifiées

---

## 7. Runtime IA (modèles)

### Rôle autorisé
- Inférence uniquement

### Interdictions
- ❌ Stockage persistant (prompts, réponses, embeddings)
- ❌ Accès réseau libre
- ❌ Accès direct aux données utilisateur

> Le runtime IA est **stateless**, **jetable** et **non source de vérité**.

---

## 8. Stockage

### Rôle autorisé
- Persistance des données strictement justifiées
- Chiffrement au repos
- Isolation stricte par tenant et utilisateur

### Interdictions
- ❌ Logique métier
- ❌ Logique RGPD décisionnelle
- ❌ Accès direct depuis le Frontend

---

## 9. Pipeline RGPD

### Rôle autorisé
- Gestion du consentement
- Accès et export des données
- Effacement et purge
- Journalisation légale

### Interdictions
- ❌ Logique métier
- ❌ Appels IA directs

---

## 10. CLI Bootstrap & administration plateforme

📌 Cette couche est **introduite explicitement** pour couvrir les opérations sensibles de **bootstrap plateforme** (EPIC 1, LOT 1.5).

### Rôle autorisé
- Initialisation sécurisée de la plateforme
- Création du superadmin plateforme
- Création des tenants et de leurs administrateurs
- Exécution **locale** et contrôlée par un administrateur système

### Contraintes strictes
- La CLI **n'implémente aucune logique métier**
- Elle appelle exclusivement des **use-cases applicatifs**
- Aucun accès direct à la base de données ou aux providers
- Aucune exposition réseau (pas d'endpoint HTTP)
- **Injection de dépendances** : Les services infrastructure sont injectés via ports (ex: `PasswordHasher`)

### Interdictions
- ❌ Génération ou stockage de secrets en clair
- ❌ Logs contenant des données personnelles
- ❌ Appels directs à la Gateway LLM
- ❌ Import direct de modules infrastructure dans les use-cases (utiliser les ports)

---

## 11. Ports & Adapters (Clean Architecture)

📌 Pattern **obligatoire** pour l'injection de dépendances et le découplage infrastructure.

### Structure
```
src/app/ports/           # Interfaces (ports)
├── PasswordHasher.ts    # Hachage mots de passe
├── EncryptionService.ts # Chiffrement données
├── ExportStorage.ts     # Stockage exports
└── ...

src/infrastructure/      # Implémentations (adapters)
├── security/
│   └── BcryptPasswordHasher.ts
├── encryption/
│   └── AesEncryptionService.ts
└── ...
```

### Règles
- Les **use-cases** dépendent uniquement des **ports** (interfaces)
- Les **adapters** (infrastructure) implémentent les ports
- L'injection se fait au point d'entrée (API routes, CLI)
- En tests, utiliser des **mocks** ou **memory adapters**

### Exemple : PasswordHasher

```typescript
// Port (src/app/ports/PasswordHasher.ts)
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

// Use case (ne dépend que du port)
export class CreateUserUseCase {
  constructor(
    private readonly userRepo: UserRepo,
    private readonly passwordHasher: PasswordHasher // ✅ Port injecté
  ) {}
}

// CLI (injection de l'adapter)
const passwordHasher = new BcryptPasswordHasher(); // ✅ Adapter
const useCase = new CreateUserUseCase(userRepo, passwordHasher);
```

### Anti-patterns interdits
- ❌ `import { BcryptPasswordHasher } from '@/infrastructure'` dans un use-case
- ❌ `await import()` dynamique d'un module infrastructure
- ❌ Dépendance directe à bcrypt/argon2 dans la couche application

---

## 12. Infrastructure (transverse)

### Rôle autorisé
- Sécurité OS et réseau
- TLS, pare-feu, supervision
- Gestion des secrets (Vault, équivalent)
- **Adapters** : implémentations des ports applicatifs

### Interdictions
- ❌ Décisions métier
- ❌ Manipulation de données applicatives

---

## 13. Exemples de violations courantes (à éviter)

- ❌ Frontend appelant un LLM
- ❌ API stockant un prompt « pour debug »
- ❌ Domaine connaissant le fournisseur IA
- ❌ Logs contenant des payloads utilisateurs
- ❌ Runtime IA avec accès internet libre
- ❌ CLI accédant directement à la DB
- ❌ Use-case important directement un adapter infrastructure

---

## 14. Checklist de validation (à chaque PR)

- [x] Aucun appel IA hors Gateway LLM ✅
- [x] Aucune donnée sensible en clair dans les logs ✅
- [x] Isolation tenant respectée ✅
- [x] Responsabilités de couche respectées ✅ **FIXED 2025-12-30** (use-cases → repositories uniquement)
- [x] CLI conforme aux frontières définies ✅
- [x] Ports/Adapters respectés (pas d'import infra dans use-cases) ✅ **FIXED 2026-01-20**
- [x] Tests associés présents ✅

---

## 15. Références internes

- EPIC 1 — Socle applicatif sécurisé
- EPIC 2 — Durcissement serveur & réseau
- EPIC 4 — Stockage RGPD
- EPIC 5 — Pipeline RGPD
- EPIC 7 — Kit conformité & audit
- Guide interne Claude Code & agents IA

---

**Document normatif — toute exception doit être explicitement justifiée et validée.**

