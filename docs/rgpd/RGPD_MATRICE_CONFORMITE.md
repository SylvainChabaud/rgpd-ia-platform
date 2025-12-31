# 📊 Matrice de Conformité RGPD — Détail Article par Article

> **Document de référence** : Correspondance détaillée entre chaque article du RGPD et son implémentation dans la plateforme
> **Dernière mise à jour** : 31 décembre 2025
> **Périmètre** : EPICs 1-8 développés, EPICs 9-13 en attente
> **Score global actuel** : **~70%** (objectif 100% après EPICs 9-13)

---

## 📋 Légende

| Icône | Signification |
|-------|---------------|
| ✅ | Conformité complète (implémenté et testé) |
| ⚙️ | Conformité partielle (en cours ou amélioration requise) |
| ❌ | Non implémenté (action requise) |
| 🔜 | Planifié (EPIC/LOT identifié) |
| N/A | Non applicable au projet |

---

## 📈 Tableau de Bord — État Actuel

| Catégorie | Articles | Score | Gaps Critiques |
|-----------|----------|-------|----------------|
| **Chapitre II — Principes** | Art. 5-11 | ✅ 100% | — |
| **Chapitre III — Droits personnes** | Art. 12-22 | ⚙️ 75% | Art. 18, 21, 22 |
| **Chapitre IV — Responsabilités** | Art. 24-43 | ⚙️ 70% | Art. 28 (DPA), Art. 33-34 |
| **ePrivacy — Cookies** | Directive 2002/58 | ❌ 0% | Cookie banner |

### 🔴 Gaps Bloquants Production

| Gap | Article | Criticité | EPIC/LOT | Effort |
|-----|---------|-----------|----------|--------|
| Cookie consent banner | ePrivacy | 🔴 BLOQUANT | LOT 10.3 | 3j |
| Notification violations CNIL 72h | Art. 33-34 | 🔴 CRITIQUE | EPIC 9 | 5j |
| Révision humaine décisions IA | Art. 22 | 🔴 CRITIQUE (IA) | LOT 10.6 | 3j |
| Template DPA sous-traitant | Art. 28 | 🟡 IMPORTANT | LOT 10.1 | 2j |
| Droit limitation | Art. 18 | 🟡 MOYEN | LOT 10.6 | 2j |
| Droit opposition | Art. 21 | 🟡 MOYEN | LOT 10.6 | 2j |

---

## 🏛️ Chapitre II — Principes (Articles 5-11)

### Article 5 — Principes relatifs au traitement

| Principe | Exigence RGPD | Implémentation plateforme | Statut |
|----------|---------------|---------------------------|--------|
| **5.1.a — Licéité** | Base légale pour chaque traitement | Consentement opt-in (Art. 6.1.a) + Contrat CGU (Art. 6.1.b) | ✅ |
| **5.1.a — Loyauté** | Traitement honnête et transparent | Politique de confidentialité claire, pas de dark patterns | ✅ |
| **5.1.a — Transparence** | Information accessible | Pages légales publiques, popups explicatifs | ✅ |
| **5.1.b — Limitation finalités** | Données utilisées uniquement pour finalités déclarées | Purposes définis et contrôlés, consentement par purpose | ✅ |
| **5.1.c — Minimisation** | Collecter uniquement le nécessaire | Pas de stockage prompts/outputs, métadonnées minimales | ✅ |
| **5.1.d — Exactitude** | Données à jour | Profil utilisateur modifiable, rectification possible | ✅ |
| **5.1.e — Limitation conservation** | Durée limitée | Purge automatique 90 jours ai_jobs, 3 ans users inactifs | ✅ |
| **5.1.f — Intégrité** | Protection contre perte/destruction | Backups chiffrés, redondance | ✅ |
| **5.1.f — Confidentialité** | Protection contre accès non autorisé | Isolation tenant, chiffrement, authentification | ✅ |
| **5.2 — Responsabilité** | Prouver la conformité | Documentation complète, audit trail, tests RGPD | ✅ |

**Implémentation technique :**
- LOT 1 : Isolation tenant, audit trail
- LOT 3 : Gateway LLM stateless (pas de stockage)
- LOT 4.1 : Job de purge automatique
- EPIC 10 : Documentation légale

---

### Article 6 — Licéité du traitement

| Base légale | Utilisation dans la plateforme | Statut |
|-------------|--------------------------------|--------|
| **6.1.a — Consentement** | Traitement IA (opt-in par purpose) | ✅ |
| **6.1.b — Contrat** | Création compte, authentification | ✅ |
| **6.1.c — Obligation légale** | Audit trail (5 ans), notification violations | ✅ |
| **6.1.d — Intérêts vitaux** | Non utilisé | N/A |
| **6.1.e — Mission publique** | Non applicable (SaaS privé) | N/A |
| **6.1.f — Intérêt légitime** | Analytics anonymes (si implémenté) | ⚠️ |

**Implémentation technique :**
- LOT 5.0 : Système de consentements avec purposes
- EPIC 13 : Popup consentement obligatoire avant 1ère utilisation IA
- EPIC 10 : CGU (base légale contrat)

---

### Article 7 — Conditions du consentement

| Exigence | Description | Implémentation | Statut |
|----------|-------------|----------------|--------|
| **7.1 — Preuve** | Pouvoir démontrer le consentement | Table `consents` avec timestamp, audit event | ✅ |
| **7.2 — Distinguable** | Consentement séparé des autres conditions | Popup dédié par purpose, non bundled | ✅ |
| **7.3 — Retrait facile** | Aussi simple que d'accorder | Toggle on/off dans "Mes consentements" | ✅ |
| **7.4 — Libre** | Pas de conditionnement abusif | Service utilisable même sans tous les purposes | ✅ |

**Implémentation technique :**
- LOT 5.0 : CRUD consentements avec historique
- EPIC 13 : Interface "Mes consentements" avec toggles

---

### Article 8 — Consentement des enfants

| Exigence | Implémentation | Statut |
|----------|----------------|--------|
| Âge minimum 16 ans (ou 13 selon pays) | Mention dans CGU prévue (LOT 10.1) | ⚙️ |
| Vérification technique de l'âge | Non implémenté | N/A |

**Applicabilité** : ⚠️ **FAIBLE** — Plateforme B2B destinée aux professionnels (avocats, médecins, comptables).

**Recommandation** : Ajouter clause CGU "Réservé aux professionnels majeurs" (LOT 10.1).

---

### Article 9 — Données sensibles (catégories particulières)

| Catégorie Art. 9 | Présence plateforme | Mesures de protection | Statut |
|------------------|---------------------|----------------------|--------|
| Origine ethnique | Non collecté explicitement | — | ✅ |
| Opinions politiques | Non collecté | — | ✅ |
| Convictions religieuses | Non collecté | — | ✅ |
| Données génétiques | Non collecté | — | ✅ |
| Données biométriques | Non collecté | — | ✅ |
| **Données de santé** | ⚠️ Possible dans prompts (médecins) | Consentement explicite + **AUCUN stockage** | ✅ |
| **Orientation sexuelle** | Non collecté | — | ✅ |

**Applicabilité** : 🔴 **HAUTE** — Les utilisateurs (médecins, avocats) peuvent envoyer des documents contenant des données Art. 9 à l'IA.

**Protection Privacy by Design** :
- ✅ Consentement explicite obligatoire avant tout traitement IA
- ✅ **Aucun stockage** des prompts/outputs (Gateway LLM stateless)
- ✅ Classification P3 = données Art. 9 → **rejet automatique** par défaut
- ✅ PII masking avant envoi LLM (EPIC 8)

**Référence** : [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) — Classification P3 interdite par défaut.

---

### Article 10 — Données pénales

| Situation | Mesure de protection | Statut |
|-----------|---------------------|--------|
| Non collecté explicitement par la plateforme | — | ✅ |
| ⚠️ Possible dans prompts (avocats pénalistes) | Consentement explicite + **AUCUN stockage** | ✅ |

**Applicabilité** : ⚠️ **MOYENNE** — Avocats peuvent traiter dossiers pénaux via l'IA.

**Responsabilité** : L'avocat (utilisateur) reste responsable du traitement des données pénales de ses clients, pas la plateforme (qui agit comme outil technique sans stockage).

**Recommandation** : Ajouter clause CGU : "L'utilisateur reste seul responsable du traitement des données pénales" (LOT 10.1).

---

### Article 11 — Traitement sans identification

| Situation | Implémentation | Statut |
|-----------|----------------|--------|
| Traitement ne nécessitant pas identification | Non applicable | N/A |

**Applicabilité** : ❌ **NON APPLICABLE** — Tous les traitements de la plateforme sont liés à un `user_id` + `tenant_id` (identification obligatoire).

---

## 👤 Chapitre III — Droits des personnes (Articles 12-22)

### Article 12 — Transparence

| Exigence | Description | Implémentation | Statut |
|----------|-------------|----------------|--------|
| **12.1 — Forme concise** | Information claire et accessible | Langage simple, pas de jargon juridique | ✅ |
| **12.2 — Faciliter l'exercice des droits** | Procédures accessibles | Boutons dédiés dans interface utilisateur | ✅ |
| **12.3 — Délai réponse** | 1 mois maximum | Actions automatiques (instant) ou ticket + rappel | ✅ |
| **12.4 — Demandes excessives** | Possibilité de refuser | Non implémenté (toutes demandes traitées) | ✅ |
| **12.5 — Gratuité** | Pas de frais | Gratuit | ✅ |
| **12.6 — Vérification identité** | S'assurer de l'identité du demandeur | Authentification obligatoire | ✅ |

**Implémentation technique :**
- EPIC 10 : Documents légaux en langage clair
- EPIC 13 : Interface "Mes données RGPD" avec boutons dédiés

---

### Article 13 — Information (collecte directe)

| Information requise | Présente dans politique confidentialité | Statut |
|---------------------|----------------------------------------|--------|
| Identité responsable traitement | ✅ Nom, adresse, contact | ✅ |
| Contact DPO | ✅ Email dpo@ | ✅ |
| Finalités traitement | ✅ Liste détaillée | ✅ |
| Base légale | ✅ Consentement/Contrat | ✅ |
| Intérêts légitimes | ✅ Si applicable (analytics) | ✅ |
| Destinataires | ✅ "Aucun tiers IA" (local) | ✅ |
| Transferts hors UE | ✅ "Aucun" (local) | ✅ |
| Durée conservation | ✅ 90j ai_jobs, 3 ans users | ✅ |
| Droits utilisateurs | ✅ Liste complète | ✅ |
| Droit réclamation CNIL | ✅ Lien et adresse | ✅ |
| Décisions automatisées | ✅ Mention IA + révision humaine | ✅ |

**Implémentation technique :**
- EPIC 10 : Document `/docs/legal/POLITIQUE_CONFIDENTIALITE.md`
- EPIC 10 : Page frontend `/legal/privacy-policy`

---

### Article 14 — Information (collecte indirecte)

| Situation | Implémentation | Statut |
|-----------|----------------|--------|
| Pas de collecte indirecte | Toutes données collectées directement auprès de l'utilisateur | N/A |

---

### Article 15 — Droit d'accès

| Exigence | Implémentation | EPIC | Statut |
|----------|----------------|------|--------|
| Confirmation traitement en cours | Liste purposes avec consentement actif | LOT 5.0, EPIC 13 | ✅ |
| Copie données personnelles | Export RGPD (bundle chiffré ZIP) | LOT 5.1, EPIC 13 | ✅ |
| Finalités | Visible dans politique confidentialité | EPIC 10 | ✅ |
| Catégories données | Détail dans export (users, consents, ai_jobs) | LOT 5.1 | ✅ |
| Destinataires | Visible dans politique confidentialité | EPIC 10 | ✅ |
| Durée conservation | Visible dans politique confidentialité | EPIC 10 | ✅ |
| Source données | "Collecte directe" | EPIC 10 | ✅ |
| Décisions automatisées | Mention dans politique + bouton révision | EPIC 10 | ✅ |

**Parcours utilisateur :**
1. Connexion → "Mes données RGPD" → "Exporter mes données"
2. Email avec lien téléchargement (sécurisé, TTL 7 jours)
3. Fichier ZIP chiffré contenant : profil, consentements, historique ai_jobs, audit trail

---

### Article 16 — Droit de rectification

| Exigence | Implémentation | EPIC | Statut |
|----------|----------------|------|--------|
| Corriger données inexactes | Édition profil (nom) | EPIC 12, 13 | ✅ |
| Compléter données incomplètes | Édition profil | EPIC 12, 13 | ✅ |

**Note :** Email non modifiable (identifiant unique). Changement email = nouveau compte.

---

### Article 17 — Droit à l'effacement ("droit à l'oubli")

| Exigence | Implémentation | EPIC | Statut |
|----------|----------------|------|--------|
| Effacement sur demande | Bouton "Supprimer mon compte" | LOT 5.2, EPIC 13 | ✅ |
| Données plus nécessaires | Purge automatique 90j | LOT 4.1 | ✅ |
| Retrait consentement | Suppression données liées au purpose | LOT 5.0 | ✅ |
| Traitement illicite | Suppression immédiate | LOT 5.2 | ✅ |
| Obligation légale | Suppression sauf exceptions | LOT 5.2 | ✅ |

**Exceptions conservées :**
- Audit trail (obligation légale 5 ans)
- Logs anonymisés (Art. 89)

**Parcours utilisateur :**
1. Connexion → "Mes données RGPD" → "Supprimer mon compte"
2. Confirmation obligatoire (popup)
3. Effacement immédiat + email confirmation

---

### Article 18 — Droit à la limitation

| Cas d'application | Implémentation | EPIC | Statut |
|-------------------|----------------|------|--------|
| Exactitude contestée | ❌ `POST /api/rgpd/suspend` non implémenté | LOT 10.6 | ❌ |
| Traitement illicite sans effacement | ❌ Flag suspension non implémenté | LOT 10.6 | ❌ |
| Données nécessaires pour droits | ❌ Rétention pendant procédure non implémenté | LOT 10.6 | ❌ |
| Interface utilisateur | ❌ Bouton "Suspendre mes données" absent | EPIC 13 | ❌ |

**État actuel** : ❌ **NON IMPLÉMENTÉ** — En attente LOT 10.6 (EPIC 10)

**Effet attendu de la limitation :**
- Invocations IA bloquées
- Compte accessible en lecture seule
- Données conservées mais non traitées

---

### Article 19 — Notification rectification/effacement

| Exigence | Implémentation | Statut |
|----------|----------------|--------|
| Notifier les destinataires de rectification/effacement | ✅ Email automatique (EPIC 5) | ✅ |
| Pas de destinataires tiers | ✅ Données locales uniquement, pas de partage | ✅ |
| Audit trail des modifications | ✅ Table `audit_events` | ✅ |

**État actuel** : ✅ **COUVERT** — Notification automatique implémentée dans EPIC 5.

---

### Article 20 — Droit à la portabilité

| Exigence | Implémentation | EPIC | Statut |
|----------|----------------|------|--------|
| Format structuré | JSON + CSV dans ZIP | LOT 5.1 | ✅ |
| Lisible par machine | JSON standard | LOT 5.1 | ✅ |
| Transmission directe | Téléchargement sécurisé | LOT 5.1, EPIC 13 | ✅ |

**Contenu export :**
```
export_user_xxx.zip
├── user.json          (profil)
├── consents.json      (historique consentements)
├── ai_jobs.json       (historique invocations IA - métadonnées)
├── ai_jobs.csv        (même chose en CSV)
└── audit_events.json  (actions de l'utilisateur)
```

---

### Article 21 — Droit d'opposition

| Cas | Implémentation | EPIC | Statut |
|-----|----------------|------|--------|
| Opposition intérêt légitime | ❌ `POST /api/rgpd/oppose` non implémenté | LOT 10.6 | ❌ |
| Formulaire opposition | ❌ Interface absent | EPIC 13 | ❌ |
| Marketing direct | N/A (pas de marketing) | — | N/A |
| Recherche/statistiques | N/A | — | N/A |

**État actuel** : ❌ **NON IMPLÉMENTÉ** — En attente LOT 10.6 (EPIC 10)

**Parcours attendu :**
1. "Mes données RGPD" → "Je m'oppose au traitement"
2. Formulaire avec motif (optionnel)
3. Suspension traitement (effet immédiat)
4. Email confirmation sous 1 mois

---

### Article 22 — Décisions individuelles automatisées

| Exigence | Implémentation | EPIC | Statut |
|----------|----------------|------|--------|
| Information sur l'existence | ⚙️ Prévu dans politique confidentialité | EPIC 10 | 🔜 |
| Logique sous-jacente | ⚙️ Explication générale prévue | EPIC 10 | 🔜 |
| **Droit de contester** | ❌ `POST /api/rgpd/contest` non implémenté | LOT 10.6 | ❌ |
| **Intervention humaine** | ❌ Workflow révision absent | LOT 10.6 | ❌ |
| Interface "Contester" | ❌ Bouton absent | EPIC 13 | ❌ |

**État actuel** : ❌ **NON IMPLÉMENTÉ** — 🔴 **CRITIQUE** pour une plateforme IA

**Importance** : L'Art. 22 est **particulièrement critique** pour votre plateforme car elle utilise l'IA pour produire des résultats. Les utilisateurs DOIVENT pouvoir :
- Être informés qu'une décision est automatisée
- Comprendre la logique générale du traitement
- Demander une intervention humaine
- Contester un résultat IA

**Parcours attendu :**
1. Résultat IA affiché → Bouton "Contester ce résultat"
2. Formulaire avec explication
3. Ticket créé → Révision par admin
4. Réponse sous 1 mois

---

## 🔒 Chapitre IV — Responsabilités (Articles 24-43)

### Article 24 — Responsabilité du responsable

| Exigence | Implémentation | Statut |
|----------|----------------|--------|
| Mesures techniques appropriées | Architecture Privacy by Design | ✅ |
| Politiques de protection | Documents `/docs/rgpd/` | ✅ |
| Démontrer la conformité | Tests RGPD, audit trail, documentation | ✅ |

---

### Article 25 — Privacy by Design

| Principe | Implémentation | Statut |
|----------|----------------|--------|
| **Dès la conception** | Architecture conçue RGPD-first | ✅ |
| **Par défaut** | Minimisation par défaut (pas de stockage P3) | ✅ |
| Pseudonymisation | PII masking disponible (EPIC 8) | ✅ |
| Minimisation | Métadonnées uniquement, prompts non stockés | ✅ |

---

### Article 26 — Responsables conjoints

| Situation | Implémentation | Statut |
|-----------|----------------|--------|
| Définition des rôles | ⚙️ À clarifier dans CGU | 🔜 LOT 10.1 |
| Accord écrit si conjoints | ⚙️ Non nécessaire si sous-traitant (Art. 28) | ⚙️ |

**Clarification recommandée** :
- **Plateforme** = Sous-traitant technique (Art. 28)
- **Tenant (client)** = Responsable du traitement de ses données
- Ajouter clause claire dans CGU (LOT 10.1)

---

### Article 27 — Représentant dans l'UE

| Situation | Implémentation | Statut |
|-----------|----------------|--------|
| Établissement hors UE | N/A si établi dans l'UE | N/A |
| Désignation représentant | Non requis si établi UE | N/A |

**Note** : Si établissement hors UE, désigner un représentant légal dans un État membre.

---

### Article 28 — Sous-traitant (DPA) 🔴 IMPORTANT

| Exigence | Implémentation | Statut |
|----------|----------------|--------|
| Contrat écrit (DPA) avec sous-traitants | ❌ Template DPA non créé | ❌ |
| Garanties suffisantes | ✅ Architecture conforme | ✅ |
| Instructions documentées | ✅ Gateway LLM contrôlée | ✅ |
| Confidentialité personnels | ✅ Accès restreint | ✅ |
| Mesures Art. 32 | ✅ Sécurité implémentée | ✅ |
| Audit possible | ✅ Audit trail complet | ✅ |
| Suppression/restitution données | ✅ Export + Delete RGPD | ✅ |

**État actuel** : ⚙️ **PARTIELLEMENT COUVERT**

**🔴 Action requise** : Créer template DPA (Data Processing Agreement) pour :
1. Relation plateforme ↔ clients (tenants)
2. Relation plateforme ↔ hébergeur (si cloud)
3. Relation plateforme ↔ providers LLM (si OpenAI/cloud ultérieur)

**Contenu DPA obligatoire (Art. 28.3)** :
- Identification des parties
- Objet et durée du traitement
- Nature et finalité (Gateway LLM, conformité RGPD)
- Types de données (P0-P2, jamais P3)
- Catégories de personnes (utilisateurs des tenants)
- Obligations sous-traitant (Art. 28.3.a-h)
- Clause audit
- Clause sous-traitance ultérieure
- Clause restitution/suppression des données

**EPIC cible** : LOT 10.1 ou LOT dédié

---

### Article 29 — Traitement sous autorité

| Exigence | Implémentation | Statut |
|----------|----------------|--------|
| Traitement sur instruction du responsable | ✅ Gateway LLM = point unique contrôlé | ✅ |
| Pas de traitement hors instructions | ✅ Middleware auth/tenant vérifie permissions | ✅ |
| Personnel autorisé uniquement | ✅ Accès restreint par rôles | ✅ |

**État actuel** : ✅ **COUVERT**

---

### Article 30 — Registre des traitements

| Exigence | Implémentation | Statut |
|----------|----------------|--------|
| Registre tenu | ✅ `/docs/rgpd/registre-traitements.md` | ✅ |
| Nom responsable | ✅ Documenté | ✅ |
| Finalités | ✅ 5 traitements documentés | ✅ |
| Catégories personnes | ✅ Documenté | ✅ |
| Catégories données | ✅ Documenté | ✅ |
| Destinataires | ✅ "Aucun pour IA locale" | ✅ |
| Durées conservation | ✅ 90j ai_jobs, 3 ans users | ✅ |
| Mesures sécurité | ✅ Référence Art. 32 | ✅ |

**État actuel** : ✅ **COUVERT**

---

### Article 31 — Coopération avec autorité de contrôle

| Exigence | Implémentation | Statut |
|----------|----------------|--------|
| Coopérer avec CNIL sur demande | ⚙️ Audit trail disponible | ⚙️ |
| Scripts export preuves | ✅ `pnpm audit:full` | ✅ |
| Documentation DPIA | ✅ `/docs/rgpd/dpia.md` | ✅ |
| Procédure formelle réponse CNIL | ❌ Runbook non créé | 🔜 EPIC 9 |

**État actuel** : ⚙️ **PARTIELLEMENT COUVERT**

**Recommandation** : Créer runbook `docs/runbooks/CNIL_COOPERATION.md` (EPIC 9)

---

### Article 32 — Sécurité du traitement

| Mesure | Implémentation | EPIC | Statut |
|--------|----------------|------|--------|
| Pseudonymisation | ✅ PII masking avant LLM | EPIC 8 | ✅ |
| Chiffrement transit | ✅ TLS 1.3 | LOT 2 | ✅ |
| Chiffrement repos | ✅ AES-256-GCM exports | LOT 5.1 | ✅ |
| Confidentialité | ✅ Isolation tenant stricte (RLS) | LOT 1 | ✅ |
| Intégrité | ✅ Audit trail immuable | LOT 1 | ✅ |
| Disponibilité | ⚙️ Backups prévus | LOT 2 | ⚙️ |
| Résilience | ❌ Tests chaos non implémentés | EPIC 9 | 🔜 |
| Tests réguliers | ✅ Tests RGPD automatisés (110+) | Tous | ✅ |
| Anonymisation IP | ❌ Job cron non implémenté | LOT 8.1 | 🔜 |

**État actuel** : ⚙️ **80% COUVERT**

**Gaps** : Anonymisation IP (LOT 8.1), Tests résilience (EPIC 9)
| Chiffrement transit | TLS 1.3 | LOT 2 | ✅ |
| Chiffrement repos | DB chiffrée | LOT 2 | ✅ |
| Confidentialité | Isolation tenant | LOT 1 | ✅ |
| Intégrité | Audit trail immuable | LOT 1 | ✅ |
| Disponibilité | Backups, redondance | LOT 2 | ✅ |
| Résilience | Procédures incidents | EPIC 9 | ✅ |
| Tests réguliers | Tests RGPD automatisés | Tous | ✅ |

---

### Article 33 — Notification violation (autorité)

| Exigence | Implémentation | EPIC | Statut |
|----------|----------------|------|--------|
| Notification CNIL 72h | ❌ Runbook + workflow non implémentés | EPIC 9 | ❌ |
| Nature violation | ❌ Template notification non créé | EPIC 9 | ❌ |
| Contact DPO | ⚙️ À inclure dans notification | EPIC 9 | 🔜 |
| Conséquences probables | ❌ Grille évaluation risque non créée | EPIC 9 | ❌ |
| Mesures prises | ❌ Checklist remédiation non créée | EPIC 9 | ❌ |
| Registre violations | ❌ Table `data_breaches` non créée | EPIC 9 | ❌ |

**État actuel** : ❌ **NON IMPLÉMENTÉ** — 🔴 **CRITIQUE** (risque amende majeur)

**Actions requises (EPIC 9 LOT 9.0)** :
1. Créer table `data_breaches` (registre violations Art. 33.5)
2. Créer runbook `/docs/runbooks/INCIDENT_RGPD.md`
3. Créer templates notifications CNIL
4. Implémenter API `POST /api/admin/data-breaches`
5. Configurer alertes monitoring (brute force, cross-tenant, etc.)

---

### Article 34 — Communication violation (personnes)

| Exigence | Implémentation | EPIC | Statut |
|----------|----------------|------|--------|
| Si risque élevé → notification personnes | ❌ Workflow non implémenté | EPIC 9 | ❌ |
| Langage clair | ❌ Template email non créé | EPIC 9 | ❌ |
| Notification sans délai | ❌ Email bulk non implémenté | EPIC 9 | ❌ |
| Grille évaluation risque | ❌ Non créée | EPIC 9 | ❌ |

**État actuel** : ❌ **NON IMPLÉMENTÉ** — En attente EPIC 9 LOT 9.0

---

### Article 35 — Analyse d'impact (DPIA)

| Exigence | Implémentation | Statut |
|----------|----------------|--------|
| DPIA pour traitements à risque | `/docs/rgpd/dpia.md` | ✅ |
| Description systématique | ✅ Gateway LLM détaillée | ✅ |
| Nécessité/proportionnalité | ✅ Justification minimisation | ✅ |
| Risques identifiés | ✅ Hallucinations, biais, fuite | ✅ |
| Mesures atténuation | ✅ Consentement, audit, chiffrement | ✅ |

---

## 🍪 Directive ePrivacy (2002/58/CE)

### Article 5.3 — Cookies

| Exigence | Implémentation | EPIC | Statut |
|----------|----------------|------|--------|
| Consentement préalable | ❌ Cookie banner non implémenté | LOT 10.3 | ❌ |
| Information claire | ❌ Description par catégorie non créée | LOT 10.3 | ❌ |
| Cookies essentiels | ⚙️ Session/CSRF (pas de consentement requis) | LOT 1 | ✅ |
| Cookies analytics | ❌ Opt-in non implémenté | LOT 10.3 | ❌ |
| Persistance choix | ❌ Non implémenté | LOT 10.3 | ❌ |
| API consent cookies | ❌ `POST /api/consents/cookies` absent | LOT 10.3 | ❌ |

**État actuel** : ❌ **NON IMPLÉMENTÉ** — 🔴 **BLOQUANT PRODUCTION**

**Actions requises (LOT 10.3)** :
1. Créer composant Cookie Banner (opt-in)
2. Implémenter API cookies consent
3. Bloquer scripts analytics/marketing jusqu'à consentement
4. Permettre révocation via page "Gérer mes cookies"

---

### Anonymisation IP

| Exigence | Implémentation | EPIC | Statut |
|----------|----------------|------|--------|
| IP = donnée personnelle | ✅ Reconnue comme telle | — | ✅ |
| Rétention limitée (7 jours en clair) | ❌ Non implémenté | LOT 8.1 | ❌ |
| Anonymisation après 7j | ❌ Job cron non créé | LOT 8.1 | ❌ |
| IPv4 anonymisée (dernier octet → 0) | ❌ Fonction non implémentée | LOT 8.1 | ❌ |
| IPv6 anonymisée (dernier bloc → 0) | ❌ Fonction non implémentée | LOT 8.1 | ❌ |

**État actuel** : ❌ **NON IMPLÉMENTÉ** — En attente LOT 8.1

---

## ✅ Synthèse de conformité — ÉTAT RÉEL (31 décembre 2025)

### Par chapitre RGPD

| Chapitre | Articles | Statut | Score | Gaps |
|----------|----------|--------|-------|------|
| **II — Principes** | 5-11 | ✅ | 100% | — |
| **III — Droits personnes** | 12-22 | ⚙️ | 75% | Art. 18, 21, 22 |
| **IV — Responsabilités** | 24-43 | ⚙️ | 70% | Art. 28 (DPA), 31, 33-34 |
| **ePrivacy** | Cookies, IP | ❌ | 0% | Cookie banner, Anonymisation IP |

### Score global

| Critère | État |
|---------|------|
| **Articles conformes** | 22/30 applicable |
| **Articles partiels** | 4/30 |
| **Articles non conformes** | 4/30 |
| **Conformité globale** | ⚙️ **~70%** |
| **Niveau** | 🟡 **EN COURS — EPICS 9-13 REQUIS** |

---

## 🔴 Plan d'action pour 100% RGPD

### Priorité 1 — BLOQUANTS PRODUCTION (13 jours)

| Gap | Article | EPIC/LOT | Effort |
|-----|---------|----------|--------|
| Cookie consent banner | ePrivacy | LOT 10.3 | 3j |
| Notification violations CNIL | Art. 33-34 | EPIC 9 LOT 9.0 | 5j |
| Registre violations | Art. 33.5 | EPIC 9 LOT 9.0 | 2j |
| Art. 22 révision humaine IA | Art. 22 | LOT 10.6 | 3j |

### Priorité 2 — Conformité légale (9 jours)

| Gap | Article | EPIC/LOT | Effort |
|-----|---------|----------|--------|
| Template DPA | Art. 28 | LOT 10.1 | 2j |
| Politique confidentialité | Art. 13-14 | LOT 10.0 | 2j |
| CGU versionnées | Art. 6.1.b | LOT 10.1 | 2j |
| Page RGPD Info | Art. 12-14 | LOT 10.2 | 1j |
| Runbook coopération CNIL | Art. 31 | EPIC 9 | 1j |
| Anonymisation IP | ePrivacy | LOT 8.1 | 2j |

### Priorité 3 — Droits complémentaires (6 jours)

| Gap | Article | EPIC/LOT | Effort |
|-----|---------|----------|--------|
| Droit limitation | Art. 18 | LOT 10.6 | 2j |
| Droit opposition | Art. 21 | LOT 10.6 | 2j |
| Clauses Art. 9/10 CGU | Art. 9, 10 | LOT 10.1 | 1j |
| Clause Art. 26 CGU | Art. 26 | LOT 10.1 | 1j |

**TOTAL estimé** : ~28 jours (4-5 semaines)

---

## 📋 Checklist Production

### ❌ Avant mise en production (obligatoire)

- [ ] EPIC 9 LOT 9.0 : Workflow violations CNIL 72h
- [ ] LOT 10.3 : Cookie consent banner fonctionnel
- [ ] LOT 10.6 : Art. 22 — Révision humaine décisions IA
- [ ] LOT 10.0-10.2 : Documents légaux publiés
- [ ] LOT 10.1 : Template DPA créé

### ⚙️ Recommandé avant production

- [ ] LOT 8.1 : Anonymisation IP > 7 jours
- [ ] LOT 10.6 : Art. 18/21 — Droits limitation/opposition
- [ ] EPIC 9 LOT 9.1 : Pentest & vulnerability scan
- [ ] Registre traitements finalisé

---

## 📚 Documents liés

- [Couverture RGPD complète](./RGPD_COUVERTURE_COMPLETE.md)
- [Validation conformité](./RGPD_CONFORMITY_VALIDATION.md)
- [Explication simple](./RGPD_EXPLICATION_SIMPLE.md)
- [Registre des traitements](./registre-traitements.md)
- [DPIA Gateway LLM](./dpia.md)

---

**Document mis à jour le** : 31 décembre 2025
**Prochaine révision** : Après développement EPIC 9
