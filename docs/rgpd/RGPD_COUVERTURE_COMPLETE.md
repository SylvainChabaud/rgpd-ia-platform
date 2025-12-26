# 🛡️ Couverture RGPD Complète — Plateforme IA RGPD Multi-Tenant

> **Document de référence** : Vue d'ensemble de la conformité RGPD de la plateforme
> **Dernière mise à jour** : 26 décembre 2025
> **Statut** : FULL RGPD LOCAL (après développement complet des EPICs)

---

## 📋 Résumé exécutif

La plateforme **RGPD-IA** est conçue pour permettre à des entreprises d'utiliser l'Intelligence Artificielle sur leurs documents **en totale conformité avec le Règlement Général sur la Protection des Données (RGPD)**.

### 🏆 Notre niveau de conformité : FULL RGPD LOCAL

| Caractéristique | Statut |
|-----------------|--------|
| **Traitement IA 100% local** | ✅ Aucune donnée envoyée à des tiers |
| **Aucun transfert hors UE** | ✅ Données restent sur votre serveur |
| **Aucun sous-traitant IA** | ✅ Pas d'OpenAI, Anthropic, etc. |
| **Droits utilisateurs complets** | ✅ Accès, export, effacement, opposition |
| **Consentement explicite** | ✅ Opt-in obligatoire avant tout traitement IA |
| **Isolation des données** | ✅ Chaque entreprise totalement isolée |
| **Traçabilité complète** | ✅ Audit trail de toutes les actions |

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

| Article | Droit | Description | Implémentation | EPIC |
|---------|-------|-------------|----------------|------|
| **Art. 12** | Transparence | Communication claire et accessible | Langage simple dans toutes les interfaces | EPIC 10-13 |
| **Art. 13-14** | Information | Informer sur le traitement des données | Politique de confidentialité, popups | EPIC 10 |
| **Art. 15** | Accès | Obtenir copie de ses données | Export RGPD (bundle chiffré) | LOT 5.1, EPIC 13 |
| **Art. 16** | Rectification | Corriger ses données | Édition profil utilisateur | EPIC 12, 13 |
| **Art. 17** | Effacement | "Droit à l'oubli" | Suppression compte + données | LOT 5.2, EPIC 13 |
| **Art. 18** | Limitation | Suspendre le traitement | Bouton "Suspendre mes données" | EPIC 10 |
| **Art. 20** | Portabilité | Récupérer ses données (format standard) | Export JSON/CSV | LOT 5.1, EPIC 13 |
| **Art. 21** | Opposition | S'opposer au traitement | Formulaire opposition + suspension | EPIC 10 |
| **Art. 22** | Décisions automatisées | Contester une décision IA | Demande révision humaine | EPIC 10 |

### Responsabilités (Art. 24-32)

| Article | Obligation | Description | Implémentation | EPIC |
|---------|------------|-------------|----------------|------|
| **Art. 24** | Responsabilité | Prouver la conformité | Documentation complète, audits | Tous |
| **Art. 25** | Privacy by Design | Protection dès la conception | Architecture sécurisée native | LOT 1-4 |
| **Art. 30** | Registre traitements | Documenter tous les traitements | `/docs/rgpd/registre-traitements.md` | EPIC 10 |
| **Art. 32** | Sécurité | Mesures techniques appropriées | Chiffrement, isolation, audit trail | LOT 1, 2, EPIC 9 |

### Violations de données (Art. 33-34)

| Article | Obligation | Description | Implémentation | EPIC |
|---------|------------|-------------|----------------|------|
| **Art. 33** | Notification autorité | Informer la CNIL sous 72h | Runbook incident + workflow | EPIC 9 |
| **Art. 34** | Notification personnes | Informer les utilisateurs si risque élevé | Email automatique + registre | EPIC 9 |

### Analyse d'impact (Art. 35)

| Article | Obligation | Description | Implémentation | EPIC |
|---------|------------|-------------|----------------|------|
| **Art. 35** | DPIA | Analyse d'impact pour traitements à risque | `/docs/rgpd/dpia.md` | EPIC 10 |

### Cookies et vie privée (Directive ePrivacy)

| Exigence | Description | Implémentation | EPIC |
|----------|-------------|----------------|------|
| **Consentement cookies** | Opt-in avant dépôt cookies non-essentiels | Cookie banner + gestion catégories | EPIC 10 |
| **Anonymisation IP** | IP = donnée personnelle | Anonymisation après 7 jours | EPIC 8 |

---

## 📊 Vue synthétique par EPIC

### EPICs Backend (Fondations RGPD)

| EPIC | Nom | Articles couverts | Fonctionnalités clés |
|------|-----|-------------------|----------------------|
| **LOT 1** | Fondations | Art. 5, 25, 32 | Isolation tenant, auth, audit trail |
| **LOT 2** | Infrastructure | Art. 32 | Sécurisation serveur, Docker, backups |
| **LOT 3** | Gateway LLM | Art. 5, 25 | IA locale, stateless, pas de stockage |
| **LOT 4.0** | Stockage RGPD | Art. 5, 30 | Tables consents, ai_jobs (métadonnées) |
| **LOT 4.1** | Purge | Art. 5(e) | Rétention 90 jours, suppression auto |
| **LOT 5.0** | Consentements | Art. 6, 7 | Opt-in obligatoire par purpose |
| **LOT 5.1** | Export | Art. 15, 20 | Bundle chiffré, téléchargement sécurisé |
| **LOT 5.2** | Effacement | Art. 17 | Suppression complète, audit |

### EPICs Sécurité & Conformité

| EPIC | Nom | Articles couverts | Fonctionnalités clés |
|------|-----|-------------------|----------------------|
| **EPIC 8** | Anonymisation | Art. 5, 32, ePrivacy | Anonymisation IP, scan PII logs |
| **EPIC 9** | Incidents | Art. 33, 34 | Runbook violations, notifications CNIL |
| **EPIC 10** | Documents légaux | Art. 13-14, 18, 21, 22, 30, 35 | Politique confidentialité, CGU, DPIA |

### EPICs Frontend (Interfaces utilisateur)

| EPIC | Nom | Articles couverts | Fonctionnalités clés |
|------|-----|-------------------|----------------------|
| **EPIC 11** | Back Office Super Admin | Art. 25, 32 | Gestion tenants, monitoring |
| **EPIC 12** | Back Office Tenant Admin | Art. 15-20, 25 | Gestion users, consentements, RGPD |
| **EPIC 13** | Front User | Art. 6, 15-17, 20-22 | IA tools, droits RGPD, consentements |

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

Après développement complet de tous les EPICs, la plateforme peut affirmer :

> ### Déclaration de conformité RGPD
>
> **La plateforme RGPD-IA est FULL RGPD LOCAL :**
>
> ✅ Conforme au Règlement (UE) 2016/679 (RGPD)  
> ✅ Conforme à la Directive 2002/58/CE (ePrivacy)  
> ✅ Traitement IA 100% local (aucun tiers)  
> ✅ Privacy by Design (Art. 25)  
> ✅ Droits des personnes garantis (Art. 15-22)  
> ✅ Documentation complète (Art. 30, 35)  
> ✅ Procédures incidents (Art. 33-34)

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
