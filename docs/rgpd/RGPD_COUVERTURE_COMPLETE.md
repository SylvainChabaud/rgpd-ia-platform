# 🛡️ Couverture RGPD Complète — Plateforme IA RGPD Multi-Tenant

> **Document de référence** : Vue d'ensemble de la conformité RGPD de la plateforme
> **Dernière mise à jour** : 31 décembre 2025
> **Statut** : ⚙️ EN COURS (~70%) — EPICs 9-13 requis pour FULL RGPD

---

## 📋 Résumé exécutif

La plateforme **RGPD-IA** est conçue pour permettre à des entreprises d'utiliser l'Intelligence Artificielle sur leurs documents **en totale conformité avec le Règlement Général sur la Protection des Données (RGPD)**.

### ⚙️ Notre niveau de conformité actuel : ~70%

| Caractéristique | Statut | État réel |
|-----------------|--------|-----------|
| **Traitement IA 100% local** | ✅ | Aucune donnée envoyée à des tiers |
| **Aucun transfert hors UE** | ✅ | Données restent sur votre serveur |
| **Aucun sous-traitant IA** | ✅ | Pas d'OpenAI, Anthropic, etc. |
| **Droits fondamentaux** | ✅ | Accès (15), Export (20), Effacement (17) |
| **Consentement explicite** | ✅ | Opt-in obligatoire avant tout traitement IA |
| **Isolation des données** | ✅ | RLS PostgreSQL — 100% isolation |
| **Traçabilité complète** | ✅ | Audit trail de toutes les actions |
| **Art. 18 — Limitation** | ❌ | Non implémenté (LOT 10.6) |
| **Art. 21 — Opposition** | ❌ | Non implémenté (LOT 10.6) |
| **Art. 22 — Révision humaine IA** | ❌ | 🔴 Non implémenté (LOT 10.6) — **CRITIQUE** |
| **Art. 33-34 — Violations** | ❌ | 🔴 Non implémenté (EPIC 9) — **BLOQUANT** |
| **ePrivacy — Cookies** | ❌ | Non implémenté (LOT 10.3) — **BLOQUANT** |

### 🔴 Gaps bloquants pour production

| Gap | Article | Risque | EPIC/LOT |
|-----|---------|--------|----------|
| Notification CNIL 72h | Art. 33 | ⛔ Amende | EPIC 9 |
| Cookie consent banner | ePrivacy | ⛔ Amende | LOT 10.3 |
| Révision humaine décisions IA | Art. 22 | ⛔ Non-conformité IA | LOT 10.6 |
| Documents légaux publiés | Art. 12-14 | ⚠️ Information | LOT 10.0-10.2 |

---

## 🎯 Matrice de conformité : Articles RGPD ↔ EPICs

Cette matrice montre comment chaque article du RGPD est couvert par les différents EPICs de la plateforme.

### Principes fondamentaux (Art. 5)

| Principe RGPD | Description | Implémentation | EPIC |
|---------------|-------------|----------------|------|
| **Licéité** | Base légale pour chaque traitement | Consentement opt-in obligatoire | LOT 5.0, EPIC 13 |
| **Loyauté** | Traitement transparent | Politique de confidentialité claire | EPIC 10 |
| **Transparence** | Information des personnes | Pages légales, popups consentement | EPIC 10, 13 |
| **Limitation des finalités** | Usage limité à ce qui est déclaré | Purposes définis et contrôlés | LOT 5.0 |
| **Minimisation** | Collecter uniquement le nécessaire | Pas de stockage prompts/outputs | LOT 1, 3, 4 |
| **Exactitude** | Données à jour | Profil utilisateur modifiable | EPIC 12, 13 |
| **Limitation conservation** | Durée de conservation limitée | Purge automatique 90 jours | LOT 4.1 |
| **Intégrité/Confidentialité** | Sécurité des données | Chiffrement, isolation tenant | LOT 1, 2, EPIC 9 |

### Droits des personnes (Art. 12-22)

| Article | Droit | Description | Implémentation | EPIC | Statut |
|---------|-------|-------------|----------------|------|--------|
| **Art. 12** | Transparence | Communication claire et accessible | Langage simple dans toutes les interfaces | EPIC 10-13 | ⚙️ Partiel |
| **Art. 13-14** | Information | Informer sur le traitement des données | ❌ Documents non créés | LOT 10.0-10.2 | ❌ |
| **Art. 15** | Accès | Obtenir copie de ses données | ✅ `GET /api/rgpd/export` | LOT 5.1 | ✅ |
| **Art. 16** | Rectification | Corriger ses données | ✅ API users update | EPIC 12, 13 | ✅ |
| **Art. 17** | Effacement | "Droit à l'oubli" | ✅ `DELETE /api/rgpd/delete` | LOT 5.2 | ✅ |
| **Art. 18** | Limitation | Suspendre le traitement | ❌ Non implémenté | LOT 10.6 | ❌ |
| **Art. 20** | Portabilité | Récupérer ses données (format standard) | ✅ Export JSON/CSV chiffré | LOT 5.1 | ✅ |
| **Art. 21** | Opposition | S'opposer au traitement | ❌ Non implémenté | LOT 10.6 | ❌ |
| **Art. 22** | Décisions automatisées | Contester une décision IA | ❌ **Non implémenté — 🔴 CRITIQUE** | LOT 10.6 | ❌ |

### Responsabilités (Art. 24-32)

| Article | Obligation | Description | Implémentation | EPIC |
|---------|------------|-------------|----------------|------|
| **Art. 24** | Responsabilité | Prouver la conformité | Documentation complète, audits | Tous |
| **Art. 25** | Privacy by Design | Protection dès la conception | Architecture sécurisée native | LOT 1-4 |
| **Art. 30** | Registre traitements | Documenter tous les traitements | `/docs/rgpd/registre-traitements.md` | EPIC 10 |
| **Art. 32** | Sécurité | Mesures techniques appropriées | Chiffrement, isolation, audit trail | LOT 1, 2, EPIC 9 |

### Violations de données (Art. 33-34)

| Article | Obligation | Description | Implémentation | EPIC | Statut |
|---------|------------|-------------|----------------|------|--------|
| **Art. 33** | Notification autorité | Informer la CNIL sous 72h | ❌ **Non implémenté — 🔴 BLOQUANT** | EPIC 9 | ❌ |
| **Art. 34** | Notification personnes | Informer les utilisateurs si risque élevé | ❌ **Non implémenté — 🔴 BLOQUANT** | EPIC 9 | ❌ |

> ⚠️ **ATTENTION** : Sans EPIC 9, la plateforme ne peut pas être mise en production car elle ne serait pas conforme en cas de violation de données.

### Analyse d'impact (Art. 35)

| Article | Obligation | Description | Implémentation | EPIC |
|---------|------------|-------------|----------------|------|
| **Art. 35** | DPIA | Analyse d'impact pour traitements à risque | `/docs/rgpd/dpia.md` | EPIC 10 |

### Cookies et vie privée (Directive ePrivacy)

| Exigence | Description | Implémentation | EPIC | Statut |
|----------|-------------|----------------|------|--------|
| **Consentement cookies** | Opt-in avant dépôt cookies non-essentiels | ❌ **Non implémenté — 🔴 BLOQUANT** | LOT 10.3 | ❌ |
| **Anonymisation IP** | IP = donnée personnelle | ❌ Non implémenté | LOT 8.1 | ❌ |

> ⚠️ **ATTENTION** : Sans cookie banner, la plateforme ne peut pas être mise en production conformément à la directive ePrivacy.

---

## 📊 Vue synthétique par EPIC

### EPICs Backend (Fondations RGPD) — ✅ IMPLÉMENTÉS

| EPIC | Nom | Articles couverts | Fonctionnalités clés | Statut |
|------|-----|-------------------|----------------------|--------|
| **LOT 1** | Fondations | Art. 5, 25, 32 | Isolation tenant, auth, audit trail | ✅ |
| **LOT 2** | Infrastructure | Art. 32 | Sécurisation serveur, Docker, backups | ✅ |
| **LOT 3** | Gateway LLM | Art. 5, 25 | IA locale, stateless, pas de stockage | ✅ |
| **LOT 4.0** | Stockage RGPD | Art. 5, 30 | Tables consents, ai_jobs (métadonnées) | ✅ |
| **LOT 4.1** | Purge | Art. 5(e) | Rétention 90 jours, suppression auto | ✅ |
| **LOT 5.0** | Consentements | Art. 6, 7 | Opt-in obligatoire par purpose | ✅ |
| **LOT 5.1** | Export | Art. 15, 20 | Bundle chiffré, téléchargement sécurisé | ✅ |
| **LOT 5.2** | Effacement | Art. 17 | Suppression complète, audit | ✅ |

### EPICs Sécurité & Conformité — ⚙️ PARTIELLEMENT IMPLÉMENTÉS

| EPIC | Nom | Articles couverts | Fonctionnalités clés | Statut |
|------|-----|-------------------|----------------------|--------|
| **EPIC 8** | Anonymisation | Art. 5, 32, ePrivacy | ⚙️ Scan PII logs (IP anonymisation pending) | ⚙️ Partiel |
| **EPIC 9** | Incidents | Art. 33, 34 | ❌ Runbook + workflow non créés | ❌ |
| **EPIC 10** | Documents légaux | Art. 13-14, 18, 21, 22, 30, 35 | ⚙️ DPIA ok, reste non créé | ⚙️ Partiel |

### EPICs Frontend (Interfaces utilisateur) — ❌ NON IMPLÉMENTÉS

| EPIC | Nom | Articles couverts | Fonctionnalités clés | Statut |
|------|-----|-------------------|----------------------|--------|
| **EPIC 11** | Back Office Super Admin | Art. 25, 32 | ❌ Gestion tenants, monitoring | ❌ |
| **EPIC 12** | Back Office Tenant Admin | Art. 15-20, 25 | ❌ Gestion users, consentements, RGPD | ❌ |
| **EPIC 13** | Front User | Art. 6, 15-17, 20-22 | ❌ IA tools, droits RGPD, consentements | ❌ |

---

## 🔒 Garanties spécifiques IA

### Modèle LOCAL uniquement (Ollama)

| Garantie | Description |
|----------|-------------|
| **Aucune fuite de données** | Le modèle IA tourne sur le même serveur que la plateforme |
| **Pas de sous-traitant IA** | Pas de contrat Art. 28 nécessaire avec fournisseur LLM |
| **Pas de transfert hors UE** | Données ne quittent jamais votre infrastructure |
| **Stateless** | Le modèle n'apprend pas sur vos données, ne les mémorise pas |
| **Pas de stockage prompts/outputs** | Les contenus IA ne sont jamais persistés par défaut |

### Gateway LLM (point de contrôle unique)

| Fonction | Description |
|----------|-------------|
| **Point d'entrée unique** | Tous les appels IA passent par la Gateway (pas de bypass) |
| **Vérification consentement** | Bloque l'appel IA si l'utilisateur n'a pas consenti |
| **Audit automatique** | Trace chaque invocation (métadonnées, pas le contenu) |
| **Kill switch** | Possibilité de couper l'accès IA instantanément |

---

## ✅ Certification de conformité

### État actuel (31 décembre 2025)

> ### ⚙️ Déclaration de conformité RGPD — EN COURS
>
> **La plateforme RGPD-IA est à ~70% de conformité RGPD :**
>
> ✅ Conforme Art. 5 — Principes fondamentaux (Privacy by Design)  
> ✅ Conforme Art. 6-7 — Base légale (consentements opt-in)  
> ✅ Conforme Art. 15, 17, 20 — Droits accès, effacement, portabilité  
> ✅ Conforme Art. 24-25 — Responsabilité et Privacy by Design  
> ✅ Conforme Art. 30, 35 — Documentation (registre, DPIA)  
> ✅ Traitement IA 100% local (aucun tiers)  
>
> ❌ **Non conforme Art. 33-34** — Workflow violations absent (EPIC 9)  
> ❌ **Non conforme Art. 22** — Révision humaine décisions IA absente (LOT 10.6)  
> ❌ **Non conforme ePrivacy** — Cookie banner absent (LOT 10.3)  
> ❌ **Non conforme Art. 18, 21** — Droits limitation/opposition absents (LOT 10.6)

### 🏆 Objectif FULL RGPD LOCAL

Après développement des EPICs 9-13, la plateforme pourra affirmer :

> ✅ Conforme au Règlement (UE) 2016/679 (RGPD)  
> ✅ Conforme à la Directive 2002/58/CE (ePrivacy)  
> ✅ Traitement IA 100% local (aucun tiers)  
> ✅ Privacy by Design (Art. 25)  
> ✅ Droits des personnes garantis (Art. 15-22)  
> ✅ Documentation complète (Art. 30, 35)  
> ✅ Procédures incidents (Art. 33-34)

**Estimation pour 100%** : ~28 jours de développement (EPICs 9-13)

---

## 📚 Documents associés

| Document | Description | Emplacement |
|----------|-------------|-------------|
| Explication simple | Guide vulgarisé pour non-développeurs | `/docs/rgpd/RGPD_EXPLICATION_SIMPLE.md` |
| Matrice de conformité | Détail article par article | `/docs/rgpd/RGPD_MATRICE_CONFORMITE.md` |
| Registre des traitements | Liste des traitements Art. 30 | `/docs/rgpd/registre-traitements.md` |
| DPIA Gateway LLM | Analyse d'impact Art. 35 | `/docs/rgpd/dpia.md` |
| Politique de confidentialité | Document public utilisateurs | `/docs/legal/POLITIQUE_CONFIDENTIALITE.md` |
| CGU | Conditions d'utilisation | `/docs/legal/CGU.md` |
