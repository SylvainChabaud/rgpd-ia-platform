# Guide interne — Claude Code & agents IA (développement FULL RGPD)

> Objectif : standardiser l’usage de **Claude Code** et des **agents IA** pour développer une application Next.js (front + back) orientée métiers sensibles, en garantissant un niveau **FULL RGPD** (privacy-by-design, sécurité, auditabilité) et une qualité de livraison élevée.

---

## 0 - Règles d’or (non négociables)

1. **Aucune donnée sensible réelle** (patient, client, dossier comptable, pièce juridique, email réel, etc.) ne doit sortir du périmètre contrôlé.
2. **Aucun appel modèle externe** sans :
   - base légale + information + (si nécessaire) consentement,
   - analyse sous-traitance (DPA),
   - localisation des données, rétention, logs, et garanties contractuelles,
   - validation interne (DPO/RSSI).
3. Tous les prompts / sorties IA destinés à être stockés passent par la **Gateway LLM** et la **politique de redaction/pseudonymisation**.
4. Le dépôt ne doit contenir **aucun secret** (clé API, token, URL privée). Scan secrets obligatoire.
5. Le code généré par IA est **revue/validé** comme tout code (tests + lint + sécurité + revue humaine).

---

## 1 - Modèle de collaboration : “Claude Code = agent de dev”, pas auteur

### Rôles recommandés
- **Architect Agent** : propose structure, contrats, patterns, dépendances.
- **Implementer Agent** : code par petites PRs, focalisé sur une US.
- **Reviewer Agent** : critique, tests, edge cases, sécurité.
- **Compliance Agent** : vérifie RGPD-by-design, logs, rétention, export/effacement.

> En pratique : on simule ces rôles avec des sessions distinctes et des consignes strictes dans les markdowns.

---

## 2 - Arborescence repo recommandée (compat Next.js + API)

```
/ (repo)
  /apps
    /web               # Next.js (UI)
    /api               # Backend (si séparé) OU Next API routes
  /packages
    /domain            # Types, règles métier, invariants
    /security          # RBAC/ABAC, audit, crypto wrappers
    /llm-gateway       # clients modèles, redaction, policies
    /rgpd              # consent, export, delete orchestration (EPIC 5)
    /storage           # DAL, schémas, migrations (EPIC 4)
    /shared            # libs partagées
  /docs
    /architecture
    /rgpd
    /runbooks
  CLAUDE.md            # mémoire et règles globales (obligatoire)
  AGENTS.md            # conventions “dev agent” (optionnel)
  SECURITY.md          # politique sécurité
```

---

## 3 - Les fichiers “mémoire” (Markdowns) à maintenir

### 3.1 CLAUDE.md (global — chargé par défaut)
Contenu minimal conseillé :
- **Contexte produit** (objectif, contraintes, multi-tenant, données sensibles).
- **Règles RGPD** (data minimization, no real data, no external calls sans validation).
- **Architecture** (modules, boundaries, Gateway LLM obligatoire).
- **Conventions code** (TS strict, tests, lint, patterns).
- **Commandes de dev** (install, test, lint, build, e2e).
- **Definition of Done** (checklist).

> Le CLAUDE.md doit être court (1–2 pages), mais très normatif.

### 3.2 AGENTS.md (optionnel mais utile)
- Règles d’écriture du code
- Comment découper une tâche
- Format des PR
- Standards de test
- Interdictions (secrets, bypass gateway, logs sensibles)

### 3.3 Docs métier / RGPD (source de vérité)
- `/docs/rgpd/policies.md` : règles de rétention, export, effacement, bases légales.
- `/docs/rgpd/dpia.md` : DPIA vivant.
- `/docs/runbooks/incident.md` : playbook incident.

---

## 4 - Template CLAUDE.md prêt à copier

```md
# Projet — Contexte & règles

## Objectif
Application Next.js (front+back) multi-tenant pour métiers sensibles (comptable, médecin, avocat). IA orchestrée via Gateway LLM.

## Règles RGPD & sécurité (NON NÉGOCIABLES)
- Pas de données réelles/sensibles dans les prompts.
- Appels modèles externes interdits par défaut. Si autorisés : passer par Gateway LLM + redaction + validation DPO/RSSI + DPA.
- Aucune donnée sensible dans les logs. Logs = événements, IDs, métriques.
- Aucun secret dans le repo. Utiliser le secret manager.

## Architecture
- Front: Next.js UI
- API: services sécurisés
- Gateway LLM: point unique vers les modèles
- Storage: relationnel + vectoriel (si nécessaire), chiffré au repos
- RBAC/ABAC: décisions centralisées

## Conventions dev
- TypeScript strict, tests unitaires obligatoires
- Petites PRs (≤ 300 lignes modifiées)
- Toujours proposer un plan avant d’implémenter

## Commandes
- pnpm i
- pnpm test
- pnpm lint
- pnpm build

## Definition of Done
- Tests OK, lint OK
- Pas de logs sensibles
- Pas de bypass Gateway LLM
- Data minimization respectée
```

---

## 5 - Configuration environnement Claude Code (pratiques internes)

### 5.1 Profils d’exécution (séparés)
- **DEV (local)** : données fictives, modèles locaux si possible.
- **STAGING** : données anonymisées/pseudonymisées.
- **PROD** : jamais de debug IA “verbeux”, logs techniques only.

### 5.2 Secrets & variables
- Stocker toutes les clés dans un **gestionnaire de secrets**.
- Exposer au runtime uniquement ce qui est nécessaire.
- Rotation régulière.

### 5.3 Réseaux et egress
- En dev : egress autorisé uniquement pour dépendances.
- En prod : egress “deny-by-default”, allowlist (si appels externes validés).

---

## 6 - Patterns d’usage Claude Code (workflow)

### Pattern A — “Plan → Diff” (recommandé)
1. Demander un **plan** (fichiers impactés, étapes, tests).
2. Faire coder une **petite unité**.
3. Exécuter tests + lint.
4. Demander un **review** (risques, sécurité, RGPD).

### Pattern B — “Bug triage”
1. Reproduire, minimal test.
2. Hypothèses + instrumentation **sans logs sensibles**.
3. Fix + test non-régression.

### Pattern C — “Refactor safe”
1. Écrire/renforcer tests.
2. Refactor par étapes.
3. Verrouiller invariants domaine.

---

## 7 - Multi-agents : orchestration recommandée

### Découpage type d’une feature
1. **Architect Agent** : diagramme + contrats (DTO, domain, policies).
2. **Implementer Agent** : implémentation minimale + tests.
3. **Reviewer Agent** : revue sécurité + perfs + edge cases.
4. **Compliance Agent** : vérifie :
   - minimisation
   - stockage opt-in
   - export/effacement compatible
   - logs safe

> Règle : un agent ne fait qu’un rôle par session.

---

## 8 - Garde-fous FULL RGPD (checklist)

### Avant d’autoriser un modèle externe
- DPA + clauses + localisation
- Politique de rétention et logs
- Pseudonymisation/redaction validée
- Consentement/information si requis
- “Kill switch” (désactivation rapide)

### À chaque PR
- Pas de nouveaux champs de stockage sans justification
- Pas de logs de payloads
- Pas de secrets
- Tests : unitaires + sécurité (au minimum)

---

## 9 - Qualité & sécurité : gates CI/CD

- `lint` + `typecheck` bloquants
- `test` bloquant
- scan secrets bloquant
- scan vulnérabilités dépendances
- contrôle “no external LLM calls” hors Gateway

---

## 10 - Prompts internes (bibliothèque)

### 10.1 Prompt “Plan d’implémentation”
- Objectif
- Contraintes RGPD
- Fichiers touchés
- Plan
- Tests à ajouter

### 10.2 Prompt “Review sécurité/RGPD”
- Cherche logs sensibles
- Bypass gateway
- Surstockage
- Mauvaise isolation tenant
- Exposition API

---

## 11 - Annexes

- Références internes : EPIC 1 à 7 (docs/epics)
- Politique de données : `/docs/ia/LLM_USAGE_POLICY.md`

