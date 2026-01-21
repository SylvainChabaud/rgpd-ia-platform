# RGPD_TESTING.md — Tests & validation de conformité RGPD

> **Objectif** : définir une **stratégie de tests RGPD complète, opérationnelle et audit‑ready**, intégrée au cycle de développement, afin de **détecter, prévenir et prouver** toute conformité RGPD **avant** mise en production.

Ce document est **normatif**. Toute fonctionnalité manipulant des données est **non livrable** sans tests RGPD associés.

---

## 1. Principes généraux

1. **Le RGPD se teste** au même titre que la sécurité ou la performance.
2. **Chaque EPIC RGPD dispose de scénarios de tests dédiés**.
3. **Les tests RGPD sont bloquants** dans la CI/CD.
4. **Les preuves de tests sont conservées et auditables**.
5. **Tout contournement volontaire ou involontaire constitue un défaut critique**.

---

## 2. Typologie des tests RGPD

### A. Tests unitaires RGPD

**Objectif** : vérifier les règles locales, invariants et interdictions.

Exemples :
- Une donnée classifiée **P3 ne peut jamais être persistée**.
- Un prompt IA n’est **jamais stocké par défaut**.
- Les fonctions de log rejettent tout payload sensible.
- Le bootstrap refuse toute seconde exécution.

---

### B. Tests d’intégration RGPD

**Objectif** : vérifier les flux applicatifs complets.

Exemples :
- Tout appel IA passe obligatoirement par la **Gateway LLM**.
- Les données persistées sont chiffrées au repos.
- Les clés de chiffrement sont **segmentées par tenant**.
- La CLI de bootstrap appelle uniquement des use‑cases applicatifs.

---

### C. Tests End‑to‑End (E2E) RGPD

**Objectif** : simuler des scénarios réels d’exploitation.

Exemples :
- Création d’un tenant → aucune donnée accessible cross‑tenant.
- Demande d’export RGPD → périmètre strict tenant / utilisateur.
- Demande d’effacement → données inaccessibles immédiatement.
- Tentative d’action plateforme par un tenant admin → rejetée.

---

## 3. Scénarios de tests par EPIC

### EPIC 1 — Gouvernance applicative & bootstrap

- Test isolation tenant (read / write)
- Test RBAC / ABAC (droits minimaux)
- Test **no direct LLM call**
- Test bootstrap plateforme :
  - exécutable une seule fois
  - logs RGPD‑safe
  - pas de secrets en clair

---

### EPIC 2 — Sécurité infrastructure

- HTTPS obligatoire (refus HTTP)
- Scan ports exposés
- Accès administrateur journalisé
- Exécution bootstrap uniquement en environnement sécurisé

---

### EPIC 3 — IA locale (POC contrôlé)

- Données fictives uniquement
- Aucun stockage prompts / outputs
- Aucune egress réseau non autorisée

---

### EPIC 4 — Stockage RGPD

- Test classification obligatoire avant stockage
- Test chiffrement au repos
- Test isolation DB cross‑tenant
- Test rétention automatique

---

### EPIC 5 — Pipeline RGPD (droits des personnes)

- Test consentement requis avant traitement
- Test révocation immédiate
- Test export RGPD (bundle chiffré + TTL)
- Test effacement :
  - suppression logique immédiate
  - purge différée / crypto‑shredding

---

### EPIC 6 — Stack Docker RGPD‑ready

- Isolation des réseaux Docker
- Absence de secrets en clair (images, env)
- Observabilité RGPD‑safe (logs / metrics)

---

### EPIC 7 — Conformité & audit

- Exécution des scripts de preuves (`scripts/audit/*`)
- Génération d’artefacts versionnés
- Traçabilité entre tests, code et documentation

---
### EPIC 8 — Anonymisation & Pseudonymisation (LOT 8.0-8.2)

- Test PII detection (6 types : EMAIL, PHONE, PERSON, SSN, IBAN, CARD) — 35 tests
- Test PII masking (tokens réversibles, consistance) — 25 tests
- Test PII restoration (démasquage après LLM) — 15 tests
- Test PII audit events (tracé sans valeurs PII, métadonnées) — 10 tests
- Test PII log scanning (détection patterns dans logs existants) — 10 tests
- Test PII integration E2E (detection → masking → inference → restoration) — E2E
- Test IP anonymisation (masquage dernier octet après 7 jours) — 15 tests
- Test cross-tenant isolation (données isolées par tenant) — 3 tests

**Total EPIC 8** : 110+ tests couvrant Art. 32 (pseudonymisation, anonymisation)

Fichiers tests :
- `rgpd.pii-detection.test.ts`
- `rgpd.pii-masking.test.ts`
- `rgpd.pii-restoration.test.ts`
- `rgpd.pii-audit.test.ts`
- `rgpd.pii-scan-logs.test.ts`
- `rgpd.pii-integration.test.ts`
- `rgpd.ip-anonymization.test.ts`
- `rgpd.no-cross-tenant.test.ts`

---

### Sécurité — Art. 32 (Hachage mots de passe)

- Test format bcrypt (`$2a$` ou `$2b$`) — 1 test
- Test non-présence du mot de passe en clair — 1 test
- Test génération de hashes différents (salt) — 1 test
- Test configuration salt rounds — 2 tests
- Test vérification correcte — 1 test
- Test rejet mot de passe incorrect — 2 tests
- Test gestion `__DISABLED__` hash — 1 test
- Test caractères spéciaux et unicode — 2 tests
- Test longueur maximum (72 bytes bcrypt) — 1 test

**Total** : 13 tests (Art. 32 - Sécurité du traitement)

Fichier test : `tests/backend/unit/infrastructure/bcrypt-password-hasher.test.ts`

---

### LOT 10.4/10.5 — Export PDF RGPD

- Test conversion markdown vers texte (code blocks, inline code) — 4 tests
- Test suppression formatage (bold, italic, headers) — 3 tests
- Test conversion listes et liens — 3 tests
- Test gestion emojis et images — 2 tests
- Test thèmes PDF (DPIA purple, Registre blue) — 2 tests
- Test génération PDF (format, header %PDF-) — 2 tests
- Test métadonnées et notice confidentialité — 2 tests
- Test contenu long avec pagination — 1 test

**Total** : 15 tests (LOT 10.4/10.5 - Export documentation RGPD)

Fichier test : `tests/backend/unit/lib/markdownPdfGenerator.test.ts`

---
## 4. Tests critiques transverses (bloquants)

### A. Test « no‑bypass Gateway LLM »

- Scan statique des imports interdits
- Test runtime bloquant

---

### B. Test « no sensitive logs »

- Scan des logs générés (CI et runtime)
- Recherche de patterns P2 / P3 (emails, noms, payloads)

---

### C. Test d’effacement complet

- Suppression logique immédiate
- Vérification d’inaccessibilité
- Purge différée
- Vérification d’irréversibilité

---
### D. Test « PII masking obligatoire avant LLM »

- Tous les types PII détectés avant envoi à l'IA
- Masking réversible (tokens UUID) appliqué
- Audit trail tracé (quoi, où, quand, pas les valeurs)
- Restauration appliquée en sortie LLM

---
## 5. Automatisation CI/CD

### Gates obligatoires

- Lint RGPD (patterns interdits)
- Tests unitaires RGPD
- Tests d’intégration RGPD
- Tests E2E critiques
- Scan de secrets

📌 **Aucun déploiement n’est autorisé** sans validation complète.

---

## 6. Preuves de conformité

Les artefacts suivants sont **obligatoirement conservés** :

- Rapports de tests RGPD
- Logs CI/CD
- Résultats de scans sécurité
- Rapports d’exécution des scripts d’audit

Ces preuves alimentent le **dossier d’audit EPIC 7**.

---

## 7. Checklist RGPD (avant release)

- [ ] Isolation tenant validée
- [ ] Gateway LLM obligatoire et testée
- [ ] Aucun log sensible détecté
- [ ] Consentement, export et effacement testés
- [ ] Bootstrap plateforme validé
- [ ] Scripts d’audit exécutés

---

## 8. Exemples de non‑conformités détectées

- ❌ Donnée personnelle ou métier en log
- ❌ Prompt IA stocké sans justification
- ❌ Appel LLM direct hors Gateway
- ❌ Bootstrap rejouable
- ❌ Accès cross‑tenant possible

---

## 9. Références internes

- DATA_CLASSIFICATION.md
- LLM_USAGE_POLICY.md
- BOUNDARIES.md
- EPIC 1 à EPIC 8
- [VERIFICATION_REPORT.md](./VERIFICATION_REPORT.md) (état réel vs stratégie)

---

**Document normatif — une fonctionnalité non testée RGPD est non livrable.**

**Dernière mise à jour** : 2026-01-21 (ajout tests Art. 32 sécurité, LOT 10.4/10.5 PDF, EPIC 11-12 complétés)
**Statut** : ✅ À jour (EPICs 1-12, LOT 12.4 validé)

