# 📋 Documentation RGPD — Conformité Plateforme IA

> **Accueil de la documentation RGPD** : Tous les documents permettant de comprendre et vérifier la conformité de la plateforme RGPD-IA aux exigences légales (RGPD, ePrivacy).

**Dernière mise à jour** : 2026-01-21
**Version** : 3.1 (EPIC 12 intégré)
**Conformité globale** : ✅ ~98% (44/45 articles)
**Status** : ✅ Production-ready backend + Security + Legal + Back Office (EPIC 11-12) | ⚠️ Front User (EPIC 13) TODO

---

## 🎯 Trouver ce que vous cherchez

Sélectionnez votre profil pour une navigation optimisée :

### 👨‍💼 Je suis DPO ou responsable de conformité

**Vous avez besoin de** : Vue complète de la conformité, registre légal, plan d'action.

**Lisez dans cet ordre** :
1. [**RGPD_MATRICE_CONFORMITE.md**](#📊-rgpd_matrice_conformite) — Tableau de bord complet avec tous les articles RGPD
2. [**registre-traitements.md**](#📋-registre-traitements) — Registre officiel des traitements (Art. 30)
3. [**dpia.md**](#⚡-dpia) — Analyse d'impact de la Gateway LLM (Art. 35)

**Actions prioritaires** :
- [ ] Vérifier les 7 articles bloquants production (voir tableau de bord)
- [ ] Valider les mesures d'atténuation des risques (DPIA)
- [ ] Planifier EPICs 9-10 (4-5 semaines d'effort)

---

### 👨‍💻 Je suis développeur ou architecte technique

**Vous avez besoin de** : Mapping implémentation technique, tests, fichiers sources.

**Lisez dans cet ordre** :
1. [**RGPD_MATRICE_CONFORMITE.md**](#📊-rgpd_matrice_conformite) — Section "Résumé exécutif" et "Synthèse par EPIC"
2. Sections 1-10 pour le mapping article → implémentation avec **liens directs aux fichiers sources**
3. **Annexe B** pour la couverture Front vs Back

**Ressources techniques** :
- 252+ tests RGPD dans `tests/` (tous passants)
- Sources implémentation dans `src/app/`, `src/infrastructure/`
- Migrations SQL dans `migrations/`

**Exemple** : Pour vérifier la pseudonymisation PII (Art. 32, EPIC 8), consultez :
```
fichier source : src/infrastructure/pii/masker.ts
tests : tests/rgpd.pii-masking.test.ts (25 tests)
documentation : RGPD_MATRICE_CONFORMITE.md → Section "EPIC 8.0"
```

---

### 👤 Je suis utilisateur final ou administrateur tenant

**Vous avez besoin de** : Comprendre vos droits, comment vos données sont protégées.

**Lisez** : [**RGPD_EXPLICATION_SIMPLE.md**](#🔐-rgpd_explication_simple)

Ce document explique en langage simple :
- ✅ Où vont vos données (restent sur le serveur, aucun tiers)
- ✅ Vos 6 droits RGPD et comment les exercer
- ✅ Comment le consentement fonctionne
- ✅ Combien de temps vos données sont conservées
- ✅ Qui contacter en cas de problème

---

### 🔍 Je dois auditer la plateforme

**Vous avez besoin de** : Couverture exhaustive de tous les articles RGPD.

**Lisez dans cet ordre** :
1. **RGPD_MATRICE_CONFORMITE.md** (document principal)
   - Tableau de bord pour vue d'ensemble
   - Sections 1-10 pour articles 5-34 détaillés
   - **Annexe A** : Articles 1-99 exhaustifs
   - **Annexe B** : Vue Front vs Back
   - **Annexe C** : Synthèse par statut

2. **Checklists et plan d'action** : Section finale du document

3. **Fichiers obligatoires** :
   - `registre-traitements.md` (Art. 30)
   - `dpia.md` (Art. 35)

---

## 📚 Vue d'ensemble des documents

### 📊 RGPD_MATRICE_CONFORMITE.md
**Le document de référence unique**

| Aspect | Contenu |
|--------|---------|
| **Taille** | 43 Ko, ~1400 lignes |
| **Contenu** | Mapping exhaustif articles RGPD ↔ implémentation technique |
| **Sections principales** | Tableau de bord + 10 articles détaillés + 3 annexes |
| **Audience** | DPO, devs, auditeurs |
| **Validité** | Art. 1-99 RGPD couverts |
| **Format** | Tables structurées + références fichiers source |
| **Mises à jour** | À réviser après EPIC 9-10 |

**Structure** :
- ✅ Tableau de bord avec score global et gaps bloquants
- ✅ Mapping détaillé articles 5-34 (13 sections)
- ✅ **Annexe A** : Articles 1-99 exhaustifs avec statut applicabilité
- ✅ **Annexe B** : Vue cohérence Front vs Back
- ✅ **Annexe C** : Synthèse, plan d'action, checklist production
- ✅ Liens directs aux fichiers sources et tests

**À consulter pour** :
- Vérifier si un article spécifique est implémenté ✅
- Comprendre le niveau de conformité actuel (70%)
- Identifier les gaps pour EPICs 9-10
- Valider qu'une feature RGPD est correctement testée

---

### 📋 registre-traitements.md
**Registre officiel des traitements (Art. 30 RGPD)**

| Aspect | Contenu |
|--------|---------|
| **Taille** | 16 Ko, ~400 lignes |
| **Contenu** | Liste des 5 traitements de données avec détails |
| **Audience** | DPO, autorités de contrôle (CNIL), clients |
| **Statut légal** | 🔴 **DOCUMENT NORMATIF** — Obligatoire avant production |
| **Format** | Tables détaillées + descriptifs structurés |

**Traitements documentés** :
1. Authentification et gestion des utilisateurs
2. Invocation Gateway LLM (IA)
3. Gestion des consentements
4. Exercice des droits RGPD (export, deletion)
5. Audit trail et traçabilité

**Chaque traitement inclut** :
- Finalité légale
- Base légale (consentement, contrat, obligation légale)
- Catégories de données
- Catégories de personnes
- Durée de conservation
- Mesures de sécurité
- Références techniques

**À consulter pour** :
- Répondre aux demandes CNIL
- Valider la Documentation Art. 30 ✅
- Comprendre les finalités de chaque traitement
- Vérifier les durées de rétention

---

### ⚡ dpia.md
**Analyse d'Impact relative à la Protection des Données (Art. 35 RGPD)**

| Aspect | Contenu |
|--------|---------|
| **Taille** | 18 Ko, ~435 lignes |
| **Contenu** | Évaluation risques/mesures pour la Gateway LLM |
| **Audience** | DPO, auditeurs, CNIL si demande consultation |
| **Statut légal** | 🔴 **DOCUMENT NORMATIF** — Obligatoire (Art. 35) |
| **Scope** | Traitement IA uniquement (risque moyen après atténuation) |
| **Format** | Narrative + tableaux d'évaluation |

**Sections principales** :
1. Résumé exécutif avec risque global (MOYEN après mesures)
2. Description systématique du traitement
3. Nécessité et proportionnalité
4. Évaluation des risques (5 risques identifiés)
5. Mesures d'atténuation implémentées
6. Consultation préalable CNIL (NON requise — risque acceptable)

**Risques évalués** :
- Hallucinations LLM → Disclaimer + review humaine
- Fuite PII → Masking automatique + audit + RLS
- Biais IA → Monitoring + feedback utilisateur
- Bypass consentement → Gateway unique + tests
- Accès non autorisé → RLS + RBAC/ABAC + audit

**À consulter pour** :
- Comprendre les risques de la plateforme IA
- Vérifier les mesures d'atténuation ✅
- Justifier auprès de CNIL que consultation préalable non requise
- Valider la proportionnalité des mesures

---

### 🔐 RGPD_EXPLICATION_SIMPLE.md
**Guide simplifié pour utilisateurs et administrateurs**

| Aspect | Contenu |
|--------|---------|
| **Taille** | 10 Ko, ~250 lignes |
| **Contenu** | Explications vulgarisées (sans jargon technique) |
| **Audience** | Utilisateurs finaux, administrateurs tenants, support |
| **Format** | Langage simple, tableaux comparatifs, FAQ |
| **Objectif** | Transparence Art. 12 (langage clair et accessible) |

**Sections principales** :
1. En une phrase — promesse simple
2. FAQ utilisateurs (7 questions courantes)
3. 7 protections clés expliquées
4. Comparaison avec autres solutions
5. Parcours par profil (utilisateur, admin, DPO)
6. Références vers documents détaillés

**À consulter pour** :
- Former les utilisateurs à leurs droits RGPD
- Communiquer sur la sécurité des données
- Support client — répondre aux questions de confidentialité
- Pages de transparence publiques (Art. 12, 13)

---

## 📊 État de la Conformité — Vue Synthétique

### Score Global : ⚙️ ~76%

```
✅ Conforme          : 34 articles (64%)
⚙️  Partiellement    : 2 articles (4%)
❌ Non conforme      : 5 articles (9%)
🔵 Non applicable    : ~50 articles (23%)
```

### Articles Conformes ✅
- Art. 5 (Principes) — Privacy by Design complet
- Art. 6-7 (Consentements) — Opt-in avec révocation
- Art. 15-17, 20 (Droits : accès, rectification, effacement, portabilité)
- Art. 24-25 (Responsabilité + Privacy by Design)
- Art. 30 (Registre) — Documenté
- Art. 32 (Sécurité) — 100% (pentest + chaos + scanning)
- Art. 33-34 (Violations) — 100% (notification CNIL 72h + utilisateurs)
- Art. 35 (DPIA) — Complète

### Gaps Critiques ❌

| Gap | Critique | Effort | EPIC |
|-----|----------|--------|------|
| ePrivacy (Cookie banner) | 🔴 Bloquant web | 3j | LOT 10.3 |
| Art. 22 (Révision humaine IA) | 🔴 Critique IA | 3j | LOT 10.6 |

### Gaps Importants 🟡
- Art. 13-14 (Docs légales) — 2j (LOT 10.0-10.2)
- Art. 18 (Limitation) — 2j (LOT 10.6)
- Art. 21 (Opposition) — 2j (LOT 10.6)

**Total pour 100% conformité** : ~15 jours (3 semaines) avec EPIC 10

---

## 🔄 Navigation Rapide par Article RGPD

Besoin de vérifier un article spécifique ? Consultez :

| Article | Sujet | Fichier | Statut |
|---------|-------|---------|--------|
| **Art. 5** | Principes | RGPD_MATRICE_CONFORMITE.md (section 1) | ✅ 100% |
| **Art. 6-7** | Consentements | RGPD_MATRICE_CONFORMITE.md (section 2) | ✅ 100% |
| **Art. 15-17, 20** | Droits accès/export/delete | RGPD_MATRICE_CONFORMITE.md (section 3) | ✅ 100% |
| **Art. 18, 21, 22** | Limitation/Opposition/IA | RGPD_MATRICE_CONFORMITE.md (section 3) | ✅ 100% |
| **Art. 24-25** | Responsabilité + Privacy by Design | RGPD_MATRICE_CONFORMITE.md (section 4) | ✅ 100% |
| **Art. 28** | Sous-traitant (DPA) | RGPD_MATRICE_CONFORMITE.md (section 4) | ✅ 100% |
| **Art. 30** | Registre traitements | registre-traitements.md | ✅ 100% |
| **Art. 32** | Sécurité | RGPD_MATRICE_CONFORMITE.md (section 6) | ✅ 100% |
| **Art. 33-34** | Violations CNIL | docs/runbooks/incident.md + EPIC 9 | ✅ 100% |
| **Art. 35** | DPIA | dpia.md | ✅ 100% |
| **Cookies** | Directive ePrivacy | RGPD_MATRICE_CONFORMITE.md (Chapitre X) | ✅ 100% |
| **Art. 1-99** | Vue exhaustive | RGPD_MATRICE_CONFORMITE.md (Annexe A) | ✅ ~98% |
| **Front vs Back** | Cohérence implémentation | RGPD_MATRICE_CONFORMITE.md (Annexe B) | ✅ 100% |

---

## 🛠️ Tests de Conformité

**252+ tests RGPD** couvrent les articles implémentés :

```
EPIC 1 (Socle)       : 42 tests ✅
EPIC 4 (Stockage)    : 23 tests ✅
EPIC 5 (Pipeline)    : 72 tests ✅
EPIC 6 (Docker)      : ~30 tests ✅
EPIC 8 (Anonymisation) : 110 tests ✅
─────────────────────────────────
TOTAL                : 252+ tests ✅ (100% passing)
```

**Voir** : `tests/` pour exécuter `pnpm test:rgpd`

---

## 📅 Calendrier — De 70% à 100% RGPD

| Phase | Semaines | EPICs | Effort |
|-------|----------|-------|--------|
| **Actuellement** | 0 | 1-9 | ✅ Complet |
| **Phase 1** | 1-2 | 10 | Documents légaux (5j) + Droits RGPD (5j) + Cookies (3j) |
| **Phase 2** | 2-4 | 11-13 | Frontend avec tous endpoints — 2-3 semaines |
| **🎯 TOTAL** | ~4 semaines | 10-13 | **100% RGPD + Production-ready** |

---

## ❓ FAQ Rapide

### Q1 : Puis-je mettre en production maintenant ?
**R** : Presque. Le backend est ✅ 100% conforme incluant violations CNIL (Art. 33-34). Manquent : cookie banner (3j), révision humaine IA (3j).

### Q2 : Où vérifier si mon feature respecte le RGPD ?
**R** : RGPD_MATRICE_CONFORMITE.md → trouvez l'article concerné → consultez "Implémentation" et "Fichier test".

### Q3 : Comment répondre à une demande CNIL ou incident RGPD ?
**R** : Voir runbook `docs/runbooks/incident.md` (EPIC 9 ✅ terminé). Utilisez aussi `registre-traitements.md` + `dpia.md`.

### Q4 : Où sont les documents légaux publics ?
**R** : Non publiés. En attente EPIC 10 LOT 10.0-10.2. Templates dans `docs/legal/`.

### Q5 : Comment vérifier que les données utilisateur sont bien supprimées ?
**R** : Tests de suppression dans `tests/rgpd.deletion.test.ts`. Voir RGPD_MATRICE_CONFORMITE.md Art. 17.

### Q6 : Nos données transitent-elles par un tiers (OpenAI, etc.) ?
**R** : **NON**. IA locale (Ollama) ou UE/Suisse avec DPA. Voir RGPD_EXPLICATION_SIMPLE.md.

---

## 🔗 Ressources complémentaires

| Ressource | Localisation | Contenu |
|-----------|--------------|---------|
| **Politique confidentialité** | `docs/legal/POLITIQUE_CONFIDENTIALITE.md` | Documentation Art. 13-14 |
| **CGU** | `docs/legal/CGU.md` | Conditions légales |
| **Tests RGPD** | `tests/` (fichiers `*rgpd*`) | 252+ tests passants |
| **Sources implémentation** | `src/app/`, `src/infrastructure/` | Code source avec liens |
| **Migrations SQL** | `migrations/` (007, 008, etc.) | RLS, audit, consentements |
| **Architecture** | `docs/architecture/BOUNDARIES.md` | Isolation tenant + sécurité |

---

## 📝 Maintenance et Mises à Jour

### Qui met à jour ces documents ?
- **DPO** : En cas de changement légal ou incident
- **Devs** : À chaque implémentation de feature RGPD
- **Audit** : Trimestriellement (ou après EPIC 9-10)

### Calendrier mises à jour
- ✅ Après chaque EPIC (update RGPD_MATRICE_CONFORMITE.md)
- ✅ Après incident (update registre + DPIA + runbook CNIL)
- ✅ Annuellement (2026-01-01 prochain audit)

### Version control
```bash
git log docs/rgpd/  # Historique des modifications
git diff docs/rgpd/ # Changements depuis dernier commit
```

---

## 📞 Support et Contacts

| Besoin | Contact | Rôle |
|--------|---------|------|
| **Questions RGPD techniques** | Équipe dev | Implémentation |
| **Conformité légale** | DPO | Validation |
| **Audit/Certification** | DPO | Documentation |
| **Questions utilisateurs** | Support client | Communication transparence |

---

**Dernière révision** : 2026-01-01  
**Prochaine révision** : Après EPIC 9 (Art. 33-34 implémentés)  
**Mainteneur** : Équipe conformité RGPD
