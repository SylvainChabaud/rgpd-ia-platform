# LLM_USAGE_POLICY.md — Politique d’usage des LLM (FULL RGPD)

> **Objectif** : encadrer strictement l’usage des **modèles de langage (LLM)** au sein de la plateforme afin de garantir la **sécurité**, la **conformité RGPD**, la **qualité fonctionnelle** et la **maîtrise des risques**.

Ce document est **normatif**. Toute dérogation doit être **explicitement validée** (DPO / RSSI / Tech Lead).

---

## 1. Principes fondamentaux

1. **IA sous contrôle** : aucun LLM n’est utilisé librement.
2. **Local first** : un modèle local est toujours privilégié.
3. **Gateway obligatoire** : tout appel LLM passe par la Gateway LLM.
4. **Minimisation stricte** : seules les données nécessaires sont transmises.
5. **Traçabilité sans contenu sensible** : logs événementiels uniquement.

---

## 2. Cas d’usage autorisés

Les usages LLM doivent appartenir à l’une des catégories suivantes :

### A. Transformation
- Reformulation
- Résumé
- Normalisation de texte

➡️ **Risque RGPD faible**, données pseudonymisées.

---

### B. Classification
- Catégorisation
- Détection de type de document
- Scoring non décisionnel

➡️ **Risque RGPD modéré**, vigilance sur les biais.

---

### C. Extraction
- Extraction de champs
- Structuration de contenu

➡️ **Risque RGPD modéré**, opt-in requis si stockage.

---

### D. Génération assistée
- Aide à la rédaction
- Suggestions

➡️ **Risque RGPD élevé**, jamais automatique, toujours sous contrôle utilisateur.

---

## 3. Cas d’usage interdits

❌ Décision automatisée ayant un effet juridique
❌ Diagnostic médical
❌ Conseil juridique engageant
❌ Profilage sans base légale
❌ Apprentissage sur données utilisateurs
❌ Appels LLM depuis le frontend

---

## 4. Typologie des modèles

### Modèles locaux
- Hébergés sur l’infrastructure maîtrisée
- Aucun flux sortant
- Usage privilégié par défaut

### Modèles externes (exceptionnels)
- Interdits par défaut
- Autorisation écrite requise
- DPA obligatoire
- Localisation UE exigée
- Opt-in utilisateur si requis

---

## 5. Politique de prompts

### Règles générales
- Aucun identifiant direct (nom, email, n° dossier)
- Pas de données sensibles brutes
- Préférer IDs techniques

### Redaction & pseudonymisation
- Appliquées systématiquement par la Gateway
- Vérifiées avant envoi

---

## 6. Politique de stockage des sorties LLM

- ❌ Pas de stockage par défaut
- ✅ Stockage uniquement si justifié fonctionnellement
- Durée de rétention limitée
- Suppression compatible EPIC 5

---

## 7. Journalisation & audit

### Journalisation autorisée
- Type d’opération
- Modèle utilisé
- Horodatage
- Identifiants anonymisés

### Journalisation interdite
- Prompt brut
- Réponse brute
- Données métier

---

## 8. Sécurité & risques spécifiques IA

### Risques identifiés
- Prompt injection
- Data exfiltration
- Hallucinations
- Biais

### Mesures
- Filtrage des entrées
- Limitation de contexte
- Validation humaine
- Kill switch LLM

---

## 9. Workflow d’ajout d’un nouvel usage LLM

1. Description du cas d’usage
2. Classification du risque
3. Validation technique
4. Validation RGPD
5. Implémentation via Gateway
6. Tests

---

## 10. Checklist de conformité (PR / Feature)

- [ ] Usage autorisé
- [ ] Modèle local privilégié
- [ ] Gateway utilisée
- [ ] Données minimisées
- [ ] Pas de logs sensibles
- [ ] Tests ajoutés

---

## 11. Références internes

- BOUNDARIES.md
- EPIC 1 — Gouvernance applicative
- EPIC 4 — Stockage RGPD
- EPIC 5 — Pipeline RGPD
- Guide interne Claude Code

---

**Document normatif — toute violation est un défaut critique.**

