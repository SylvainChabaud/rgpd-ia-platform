# DATA_CLASSIFICATION.md — Classification des données & règles de traitement (FULL RGPD)

> **Objectif** : définir une **classification claire, opérationnelle, opposable et audit‑ready** des données manipulées par la plateforme IA afin de garantir la **minimisation**, la **sécurité**, la **rétention maîtrisée** et la **conformité RGPD**.

Ce document est **normatif**. Toute donnée **non classifiée explicitement** est **interdite par défaut**.

---

## 1. Principes fondamentaux

1. **Minimisation stricte** : ne collecter, traiter et stocker que le strict nécessaire.
2. **Classification avant implémentation** : aucune donnée ne peut être stockée, transmise ou loggée sans catégorie.
3. **Principe du refus par défaut** : stockage, logs, export et IA sont interdits sans règle explicite.
4. **Traçabilité sans exposition** : les logs contiennent uniquement des **événements techniques**, jamais de contenu.
5. **Isolation par tenant** : toute donnée classifiée est implicitement **tenant‑scoped**.

---

## 2. Niveaux de classification

### 🟢 P0 — Données publiques / non personnelles

**Définition** : données ne permettant aucune identification directe ou indirecte.

**Exemples**
- Documentation publique
- Templates génériques
- Données techniques statiques non identifiantes

**Règles**
- Stockage : autorisé
- Logs : autorisés
- Rétention : libre
- Chiffrement : recommandé

---

### 🟡 P1 — Données internes non sensibles

**Définition** : données techniques internes sans lien direct avec une personne physique.

**Exemples**
- Identifiants techniques (UUID, IDs opaques)
- Métriques agrégées
- États applicatifs

**Règles**
- Stockage : autorisé
- Logs : autorisés (sans corrélation directe)
- Rétention : définie et documentée
- Chiffrement : recommandé

---

### 🟠 P2 — Données personnelles

**Définition** : données relatives à une personne physique identifiée ou identifiable.

**Exemples**
- Nom, prénom
- Adresse email professionnelle
- Identifiant client
- Historique d’utilisation
- Données de bootstrap (email admin, nom tenant)

**Règles**
- Stockage : **autorisé uniquement si nécessaire et justifié**
- Base légale : requise (contrat, obligation légale, consentement, intérêt légitime)
- Logs : **interdits (contenu)**
- Rétention : **courte, documentée et configurable**
- Chiffrement : **obligatoire**
- Indexation RGPD (export / effacement) : **obligatoire**

---

### 🔴 P3 — Données sensibles / métiers réglementés

**Définition** : données à risque élevé pour les droits et libertés (art. 9 RGPD ou équivalent métier).

**Exemples**
- Données de santé
- Données financières détaillées
- Contenus juridiques identifiants
- Prompts métier non redactionnés

**Règles**
- Stockage : **interdit par défaut**
- Exception : justification écrite + validation explicite (DPO / responsable)
- Logs : **strictement interdits**
- Rétention : minimale et exceptionnelle
- Chiffrement : **obligatoire avec clés dédiées**
- Usage IA : **local uniquement** ou DPIA validé

---

## 3. Application par composant

| Composant | P0 | P1 | P2 | P3 |
|---------|----|----|----|----|
| Frontend (UI) | ✅ | ⚠️ | ❌ | ❌ |
| API / Application | ✅ | ✅ | ⚠️ | ❌ |
| Domaine Métier | ✅ | ⚠️ | ❌ | ❌ |
| Gateway LLM | ❌ | ⚠️ | ⚠️ | ❌ |
| Runtime IA | ❌ | ❌ | ❌ | ❌ |
| Stockage | ✅ | ✅ | ⚠️ | ❌ |
| Logs | ✅ | ⚠️ | ❌ | ❌ |
| CLI Bootstrap | ⚠️ | ⚠️ | ⚠️ | ❌ |

⚠️ = autorisé uniquement sous conditions strictes et documentées

---

## 4. Données IA spécifiques

### Prompts
- Classés **P2 par défaut**
- Peuvent devenir **P3** si non redactionnés
- Redaction obligatoire avant Gateway LLM
- Stockage **désactivé par défaut**

### Réponses IA
- Classées selon le contenu généré
- Validation humaine requise si P2
- Interdiction absolue si P3 non maîtrisé

### Embeddings
- Considérés **P2**
- Chiffrement obligatoire
- Isolation par tenant
- Rétention limitée et documentée

---

## 5. Politique de rétention (exemple de référence)

| Type de donnée | Classe | Rétention indicative |
|--------------|-------|----------------------|
| Logs techniques | P1 | 30 jours |
| Données bootstrap | P2 | Durée de vie du compte |
| Prompts (si exception) | P2 | ≤ 7 jours |
| Outputs IA | P2 | 7–30 jours |
| Embeddings | P2 | ≤ 90 jours |

📌 Les durées exactes sont définies dans EPIC 4 et documentées dans le registre des traitements.

---

## 6. Lien avec les EPIC RGPD

- **EPIC 1** : classification utilisée dès le bootstrap et l’IAM
- **EPIC 4** : implémentation du stockage et de la rétention
- **EPIC 5** : export, effacement et portabilité
- **EPIC 6** : chiffrement, isolation et secrets
- **EPIC 7** : preuves documentaires et audit

---

## 7. Checklist de validation (feature / PR)

- [ ] Toutes les données sont explicitement classifiées
- [ ] Aucune donnée P3 stockée sans validation formelle
- [ ] Aucun contenu P2/P3 dans les logs
- [ ] Rétention définie et testée
- [ ] Données compatibles export / effacement

---

## 8. Exemples de violations critiques

- ❌ Stocker un prompt métier en clair
- ❌ Logger une réponse IA contenant des données personnelles
- ❌ Envoyer des données P3 à un LLM externe
- ❌ Générer des logs bootstrap avec emails complets

---

## 9. Références internes

- BOUNDARIES.md
- LLM_USAGE_POLICY.md
- EPIC 1 — Socle applicatif sécurisé
- EPIC 4 — Stockage RGPD
- EPIC 5 — Pipeline RGPD
- EPIC 7 — Kit conformité & audit

---

**Document normatif — toute donnée non classifiée ou non justifiée est interdite.**

