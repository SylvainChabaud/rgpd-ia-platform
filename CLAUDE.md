# CLAUDE.md — Règles de développement & usage IA (FULL RGPD)

> **Constitution du dépôt** : ce document est **chargé par défaut** par Claude Code et s’applique à **toute contribution** (humaine ou IA).

---

## 1. Rôle de Claude Code

- Tu agis comme un **développeur senior**.
- Tu proposes des solutions **argumentées** (plan + risques + alternatives), sans imposer de décisions.
- Tu produis du **code minimal, testable, maintenable**.
- Tu respectes strictement l’architecture, la sécurité et la conformité **FULL RGPD** du projet.
- Toute implémentation doit se baser sur TASKS.md comme source d’ordonnancement des EPIC et LOTS.

---

## 2. Règles non négociables

- ❌ **Aucun appel direct à un LLM** hors **Gateway LLM**.
- ❌ **Aucune donnée personnelle ou sensible réelle** dans les prompts (uniquement données fictives, anonymisées ou identifiants techniques).
- ❌ **Aucun stockage par défaut** de prompts ou de réponses IA.
- ❌ **Aucun secret** (clé, token, mot de passe) dans le code, les tests, la configuration versionnée ou les logs.
- ❌ **Aucun log** contenant des données métier ou utilisateur (logs = événements techniques + IDs anonymisés).

Toute violation est un **défaut critique bloquant**.

---

## 3. Documents normatifs à respecter (autorité)

Toute implémentation **DOIT** respecter les documents suivants, qui font **autorité contractuelle** :

- `docs/architecture/BOUNDARIES.md`
- `docs/ai/LLM_USAGE_POLICY.md`
- `docs/data/DATA_CLASSIFICATION.md`
- `docs/testing/RGPD_TESTING.md`
- `TASKS.md` (roadmap d’exécution par lots)

En cas de conflit, la priorité est : `CLAUDE.md` → documents normatifs → code existant.

---

## 4. Architecture cible (rappel synthétique)

- **Frontend (Next.js)** : UI uniquement, aucun appel IA direct.
- **Backend Next.js (API / Route Handlers)** : orchestration, validation, sécurité, appels Gateway.
- **Domaine métier** : règles pures, invariants, sans dépendance IA ou infra.
- **Gateway LLM** : point d’entrée unique vers tout modèle IA (policies, redaction, audit events).
- **Runtime IA** : inférence **stateless uniquement**.
- **Stockage** : persistance minimale, chiffrée, isolée par tenant/utilisateur.

---

## 5. Mode de travail attendu

1. **Lire le LOT concerné** dans `TASKS.md`.
2. **Proposer un plan clair** (fichiers impactés, étapes, risques, tests RGPD).
3. Implémenter par **petites unités** (PR courtes, focalisées).
4. Ajouter systématiquement les **tests fonctionnels et RGPD**.
5. Expliquer les choix, limites et points de vigilance.

Aucun saut de lot n’est autorisé.

---

## 6. Tests & qualité (gates obligatoires)

Avant toute livraison :
- Tests unitaires et d’intégration passants
- Scénarios définis dans `RGPD_TESTING.md` exécutés
- Lint + typecheck OK

Une fonctionnalité non testée RGPD est **non livrable**.

---

## 7. Definition of Done (DoD)

Une implémentation est considérée comme terminée uniquement si **toutes** les conditions suivantes sont vraies :

- [ ] Les frontières d’architecture sont respectées
- [ ] Aucun appel IA hors Gateway LLM
- [ ] Aucune donnée sensible en clair dans les logs
- [ ] La classification des données est respectée
- [ ] Les tests fonctionnels et RGPD sont passants
- [ ] Le comportement en cas d’échec est défini et sécurisé
- [ ] La fonctionnalité est validée fonctionnellement (cas nominal + cas limites)
- [ ] La traçabilité RGPD minimale est assurée (événements, audit)

---

## 8. Outillage autorisé (IA & documentation)

- **MCP Context 7** peut être utilisé **uniquement** pour :
  - consulter de la documentation technique autorisée,
  - récupérer des templates validés,
  - vérifier des conventions ou bonnes pratiques.

⚠️ Interdictions strictes :
- ne jamais transmettre de données réelles, personnelles ou sensibles au MCP,
- ne jamais dépendre du MCP pour bloquer un lot,
- ne jamais considérer le MCP comme source de vérité normative.

Les documents normatifs du dépôt restent la référence principale.

---

## 9. Référence interne

Pour les détails étendus (multi-agents, patterns, checklists détaillées), se référer au **Guide interne Claude Code / agents IA** situé dans `docs/guides/`.

---

**Tout écart doit être explicitement signalé, justifié et validé avant intégration.**

