# Data Processing Agreement (DPA)
# Accord de Sous-Traitance RGPD — Article 28

> **Document légal obligatoire** : Contrat de sous-traitance au sens de l'Article 28 du RGPD
>
> **Version** : 1.0
> **Dernière mise à jour** : 2026-01-01
> **Validité** : Ce template doit être personnalisé et signé pour chaque Tenant

---

## Préambule

Le présent accord de traitement des données (ci-après "DPA" ou "l'Accord") est conclu entre :

**Le Responsable de Traitement** (ci-après "le Client") :
- Nom de l'organisation : **[NOM DU TENANT]**
- Adresse : **[ADRESSE COMPLÈTE]**
- Représenté par : **[NOM DU REPRÉSENTANT LÉGAL]**
- Contact DPO (si applicable) : **[EMAIL DPO CLIENT]**

**Le Sous-Traitant** (ci-après "le Prestataire") :
- Nom de l'organisation : **[NOM DE VOTRE ENTREPRISE — Éditeur RGPD-IA Platform]**
- Adresse : **[ADRESSE COMPLÈTE]**
- Représenté par : **[NOM DU REPRÉSENTANT LÉGAL]**
- Contact DPO : **dpo@example.com**
- SIRET : **[SIRET]**

**Date d'entrée en vigueur** : **[DATE DE SIGNATURE]**

---

## Article 1 — Objet et durée du traitement

### 1.1 Objet

Le présent DPA définit les conditions dans lesquelles le Prestataire traite des données à caractère personnel pour le compte du Client, dans le cadre de la fourniture du service **RGPD-IA Platform** (ci-après "le Service").

### 1.2 Nature et finalité du traitement

Le Prestataire fournit une plateforme SaaS multi-tenant permettant au Client d'utiliser des services d'Intelligence Artificielle sur ses documents de manière sécurisée et conforme au RGPD.

**Finalités autorisées** :
- Authentification et gestion des utilisateurs du Client
- Invocation Gateway LLM pour traitement IA (résumé, classification, extraction)
- Gestion des consentements des utilisateurs finaux du Client
- Exercice des droits RGPD (accès, effacement, portabilité)
- Audit trail et traçabilité des actions

### 1.3 Durée

Le présent DPA entre en vigueur à la date de signature et reste en vigueur pendant toute la durée du contrat de service SaaS principal.

En cas de résiliation du contrat principal, le Prestataire s'engage à :
- Restituer ou supprimer toutes les données personnelles du Client dans un délai de **30 jours calendaires**
- Fournir une preuve de suppression (certificat de destruction)

---

## Article 2 — Données personnelles traitées

### 2.1 Types de données à caractère personnel

Le Prestataire traite les catégories de données suivantes pour le compte du Client :

| Catégorie | Classification | Exemples | Base légale |
|-----------|----------------|----------|-------------|
| **P0 — Identifiants techniques** | Non personnelle | `user_id`, `tenant_id`, `job_id` | Nécessité contractuelle |
| **P1 — Données utilisateur** | Personnelle faible risque | Email, nom, prénom, rôle | Consentement + Contrat (Art. 6.1.a, 6.1.b) |
| **P2 — Métadonnées IA** | Personnelle modéré | `input_text_hash`, métadonnées jobs IA | Consentement explicite (Art. 6.1.a) |
| **P3 — Données sensibles** | **INTERDITES** | Santé, opinions politiques, origine ethnique, etc. | ❌ Rejet automatique (Art. 9) |

**⚠️ IMPORTANT** : Les contenus soumis à l'IA (prompts/outputs) ne sont **JAMAIS persistés** par défaut (traitement stateless). Seules les métadonnées techniques sont conservées (durée, statut, modèle utilisé).

### 2.2 Catégories de personnes concernées

- Administrateurs du Tenant Client
- Membres/utilisateurs finaux du Tenant Client
- Toute personne dont les données sont traitées via le Service par le Client

### 2.3 Origine des données

- Saisie directe par les utilisateurs du Client (inscription, profil, upload documents)
- Génération automatique par le Service (métadonnées, audit trail)

---

## Article 3 — Obligations du Sous-Traitant (Art. 28.3 RGPD)

### 3.1 Traitement uniquement sur instruction (Art. 28.3.a)

Le Prestataire s'engage à :
- Traiter les données personnelles **uniquement sur instruction documentée du Client**
- Ne pas utiliser les données pour d'autres finalités que celles définies à l'Article 1.2
- Informer immédiatement le Client si une instruction lui semble contraire au RGPD ou à toute autre disposition légale

**Instructions documentées** :
- Le présent DPA
- Les Conditions Générales d'Utilisation (CGU)
- La Politique de Confidentialité
- Les paramètres de configuration du Tenant (purposes, consentements, rétention)

### 3.2 Confidentialité (Art. 28.3.b)

Le Prestataire garantit que :
- Toute personne autorisée à traiter les données personnelles s'est engagée à respecter la confidentialité (clause contractuelle ou obligation légale)
- Les accès aux données sont strictement limités selon le principe du moindre privilège
- Les employés et sous-traitants sont formés aux exigences du RGPD

### 3.3 Sécurité (Art. 28.3.c)

Le Prestataire met en œuvre les mesures techniques et organisationnelles suivantes (conformes à l'Art. 32 RGPD) :

#### Mesures techniques
- **Chiffrement au repos** : AES-256-GCM pour toutes les données P1-P2
- **Chiffrement en transit** : TLS 1.3 obligatoire (HTTPS only)
- **Hachage passwords** : bcrypt avec cost factor 12
- **Isolation multi-tenant** : Tenant ID obligatoire sur toutes requêtes, Row-Level Security (RLS) PostgreSQL
- **Pseudonymisation PII** : Détection et masquage automatique avant exposition LLM (EPIC 8)
- **Anonymisation IP** : Anonymisation automatique après 7 jours (ePrivacy compliant)

#### Mesures organisationnelles
- **Contrôle d'accès** : RBAC/ABAC centralisé, principe du moindre privilège
- **Audit trail complet** : Traçabilité de toutes les actions (RGPD-safe, pas de contenu métier)
- **Sauvegardes chiffrées** : Backups quotidiens (3 copies, 3 sites, 90 jours)
- **Tests sécurité** : Pentests semestriels, scan vulnérabilités automatisé (CI/CD)
- **Monitoring** : Alertes incidents RGPD (brute force, cross-tenant, export massif)
- **Plan de continuité** : RTO < 4h, RPO < 1h, failover automatique DB < 30s

**Documentation détaillée** : [docs/architecture/BOUNDARIES.md](../architecture/BOUNDARIES.md), [TASKS.md LOT 2.0-2.1, EPIC 9](../../TASKS.md)

### 3.4 Sous-traitants ultérieurs (Art. 28.3.d)

#### Autorisation générale
Le Client autorise le Prestataire à recourir à des sous-traitants ultérieurs pour la fourniture du Service, sous réserve des conditions suivantes :

**Liste des sous-traitants ultérieurs actuels** :

| Sous-traitant | Service fourni | Localisation | Garanties | Substitution possible |
|---------------|----------------|--------------|-----------|----------------------|
| **[Hébergeur Infrastructure]** | Hébergement serveurs, bases de données | UE (France) | Certification ISO 27001, contrat DPA, serveurs UE | Oui (préavis 30j) |
| **[Provider LLM]** (si cloud) | Inférence IA (optionnel, si non local) | UE/Suisse | Contrat DPA, pas de stockage, données pseudonymisées | Oui (préavis 30j) |
| **[Service Email]** | Envoi emails transactionnels (notifications RGPD) | UE | Contrat DPA, TLS obligatoire | Oui (préavis 30j) |

**Note** : Si le Client choisit un déploiement **on-premise avec modèle IA local (Ollama)**, le Provider LLM n'est **pas un sous-traitant** (traitement 100% local, aucun tiers).

#### Obligations en cas de changement de sous-traitant
Le Prestataire s'engage à :
- Informer le Client de tout changement de sous-traitant (ajout ou remplacement) avec un préavis de **30 jours calendaires**
- Permettre au Client de s'opposer à ce changement pour des motifs légitimes
- Imposer aux sous-traitants ultérieurs les mêmes obligations que celles du présent DPA
- Rester pleinement responsable vis-à-vis du Client en cas de manquement d'un sous-traitant ultérieur

### 3.5 Aide aux droits des personnes concernées (Art. 28.3.e)

Le Prestataire met à disposition du Client les fonctionnalités suivantes pour faciliter l'exercice des droits RGPD :

| Droit | Article RGPD | API/Fonctionnalité | Délai de réponse |
|-------|--------------|-------------------|------------------|
| **Accès** | Art. 15 | `POST /api/rgpd/export` | Immédiat (bundle généré) |
| **Rectification** | Art. 16 | `PATCH /api/users/:id` | Immédiat |
| **Effacement** | Art. 17 | `DELETE /api/rgpd/delete` | Immédiat (soft delete), purge 30j |
| **Portabilité** | Art. 20 | `POST /api/rgpd/export` (JSON structuré) | Immédiat |
| **Limitation** | Art. 18 | Suspension compte (interface Back Office) | Immédiat |
| **Opposition** | Art. 21 | Formulaire contact DPO | 1 mois max |
| **Révision humaine IA** | Art. 22 | Formulaire contestation résultat (EPIC 10) | 1 mois max |

**Obligation du Client** : Le Client reste responsable de la réponse finale aux demandes des personnes concernées. Le Prestataire fournit uniquement les outils techniques.

### 3.6 Aide à la conformité RGPD (Art. 28.3.f)

Le Prestataire fournit au Client la documentation suivante pour l'aider à respecter ses obligations RGPD :

- **Analyse d'Impact (DPIA)** : [docs/rgpd/dpia.md](../rgpd/dpia.md)
- **Registre des Traitements** : [docs/rgpd/registre-traitements.md](../rgpd/registre-traitements.md)
- **Politique de Confidentialité** : [docs/legal/POLITIQUE_CONFIDENTIALITE.md](./POLITIQUE_CONFIDENTIALITE.md)
- **Runbook Incident RGPD** : [docs/runbooks/incident.md](../runbooks/incident.md)
- **Matrice de conformité RGPD** : [docs/rgpd/RGPD_COUVERTURE_COMPLETE.md](../rgpd/RGPD_COUVERTURE_COMPLETE.md)

Le Prestataire s'engage également à :
- Informer le Client de toute évolution du Service impactant le traitement des données personnelles
- Fournir des preuves de conformité (rapports d'audit, certifications) sur demande raisonnable
- Coopérer avec le Client lors d'audits ou inspections de l'autorité de contrôle (CNIL)

### 3.7 Suppression ou restitution des données (Art. 28.3.g)

À l'issue du contrat, le Prestataire s'engage, au choix du Client, à :

**Option A : Restitution**
- Export complet des données du Tenant (format JSON structuré)
- Fourniture du bundle chiffré sous 15 jours calendaires
- Assistance technique pour migration (optionnel, facturable)

**Option B : Suppression**
- Suppression définitive de toutes les données personnelles du Tenant dans un délai de **30 jours calendaires**
- Purge des sauvegardes (destruction sécurisée selon procédure certifiée)
- Fourniture d'un certificat de destruction signé

**Exception** : Les données anonymisées à des fins d'audit légal (Art. 7.1, 30, 33.5 RGPD) peuvent être conservées 3 ans maximum (sans identifiants personnels).

### 3.8 Audits et inspections (Art. 28.3.h)

Le Client a le droit de vérifier la conformité du Prestataire par :

**Audits documentaires** (sans frais) :
- Consultation des rapports d'audit existants (pentests, certifications ISO 27001)
- Accès à la documentation technique RGPD (cf. Article 3.6)
- Scripts de preuves automatisées : `npm run audit:full`

**Audits sur site** (frais raisonnables à la charge du Client) :
- Préavis minimum : 30 jours calendaires
- Fréquence : 1 fois par an maximum (hors incident)
- Portée : Infrastructures et processus liés au traitement des données du Client
- Confidentialité : Signature NDA obligatoire par l'auditeur
- Rapport : Fourniture sous 15 jours après audit

**Audits CNIL** :
- Le Prestataire s'engage à coopérer pleinement avec la CNIL en cas de contrôle
- Mise à disposition de toute preuve requise dans les délais légaux

---

## Article 4 — Notification des violations de données (Art. 33-34 RGPD)

### 4.1 Obligation de notification

Le Prestataire s'engage à notifier au Client toute violation de données personnelles dans un délai maximum de **24 heures** après en avoir pris connaissance.

### 4.2 Contenu de la notification

La notification comprendra :
- Nature de la violation (accès non autorisé, perte, destruction, modification)
- Catégories et nombre approximatif de personnes concernées
- Catégories et nombre approximatif d'enregistrements concernés
- Conséquences probables de la violation
- Mesures prises ou proposées pour remédier à la violation et atténuer ses effets

### 4.3 Responsabilité de notification CNIL et personnes concernées

- **Notification CNIL (72h)** : Responsabilité du **Client** (responsable de traitement)
- **Notification personnes concernées** : Responsabilité du **Client** si risque élevé
- **Assistance du Prestataire** : Fourniture de tous les éléments nécessaires à la notification (templates disponibles)

**Documentation** : [docs/runbooks/incident.md](../runbooks/incident.md)

---

## Article 5 — Transferts de données hors UE

### 5.1 Principe général

Le Prestataire s'engage à traiter les données personnelles du Client **exclusivement au sein de l'Union Européenne (UE)** ou dans des pays bénéficiant d'une décision d'adéquation de la Commission Européenne.

### 5.2 Exceptions autorisées

En cas de transfert vers un pays tiers pour des raisons opérationnelles (hébergement de secours, sous-traitant ultérieur), le Prestataire garantit la mise en place de garanties appropriées :
- Clauses Contractuelles Types (CCT) de la Commission Européenne
- Ou Règles d'Entreprise Contraignantes (BCR)
- Ou Certification (Privacy Shield successeur validé)

### 5.3 Localisation actuelle

**Hébergement principal** : France (UE)
**Sauvegardes** : France et/ou autre État membre UE
**Sous-traitants** : Cf. Article 3.4

---

## Article 6 — Responsabilité et indemnisation

### 6.1 Responsabilité du Prestataire

Le Prestataire est responsable des dommages causés par le traitement s'il :
- N'a pas respecté les obligations du RGPD incombant spécifiquement aux sous-traitants (Art. 28)
- A agi en dehors des instructions licites du Client ou contrairement à celles-ci

### 6.2 Limitation de responsabilité

Conformément au contrat de service principal, la responsabilité du Prestataire est limitée à **[MONTANT OU % DU CONTRAT ANNUEL]** par année contractuelle, sauf en cas de :
- Faute intentionnelle ou négligence grave
- Violation délibérée du présent DPA
- Non-respect des mesures de sécurité (Art. 3.3)

### 6.3 Assurance

Le Prestataire déclare disposer d'une assurance responsabilité civile professionnelle couvrant les risques liés au traitement des données personnelles (cyber-risques).

---

## Article 7 — Durée et résiliation

### 7.1 Durée

Le présent DPA entre en vigueur à la date de signature et reste en vigueur tant que le Prestataire traite des données personnelles pour le compte du Client.

### 7.2 Résiliation

Le DPA peut être résilié dans les cas suivants :
- Résiliation du contrat de service principal
- Manquement grave du Prestataire à ses obligations (résiliation immédiate par le Client)
- Accord mutuel écrit des parties

### 7.3 Conséquences de la résiliation

Cf. Article 3.7 (suppression ou restitution des données).

---

## Article 8 — Dispositions générales

### 8.1 Droit applicable

Le présent DPA est régi par le **droit français** et le **Règlement (UE) 2016/679 (RGPD)**.

### 8.2 Tribunal compétent

En cas de litige, les tribunaux français seront compétents.

### 8.3 Modification

Toute modification du présent DPA doit faire l'objet d'un avenant écrit signé par les deux parties.

### 8.4 Intégralité

Le présent DPA, conjointement avec le contrat de service principal, constitue l'intégralité de l'accord entre les parties concernant le traitement des données personnelles.

### 8.5 Hiérarchie des documents

En cas de contradiction entre le DPA et le contrat principal, le **DPA prévaut** pour tout ce qui concerne la protection des données personnelles.

---

## Article 9 — Signatures

**Pour le Client (Responsable de traitement)** :

Nom : **[NOM DU REPRÉSENTANT LÉGAL CLIENT]**
Titre : **[FONCTION]**
Date : **[DATE]**
Signature : **___________________________**

**Pour le Prestataire (Sous-traitant)** :

Nom : **[NOM DU REPRÉSENTANT LÉGAL PRESTATAIRE]**
Titre : **[FONCTION]**
Date : **[DATE]**
Signature : **___________________________**

---

## Annexes

### Annexe A : Liste détaillée des traitements

Cf. [Registre des Traitements](../rgpd/registre-traitements.md) :
1. Authentification et gestion des utilisateurs
2. Invocation Gateway LLM (IA)
3. Gestion des consentements IA
4. Export et effacement RGPD (Droits des personnes)
5. Audit trail et logs système

### Annexe B : Mesures de sécurité détaillées

Cf. [BOUNDARIES.md](../architecture/BOUNDARIES.md) et [TASKS.md LOT 2.0-2.1, EPIC 9](../../TASKS.md).

### Annexe C : Procédure de gestion des incidents

Cf. [Runbook Incident RGPD](../runbooks/incident.md).

### Annexe D : Analyse d'Impact (DPIA) Gateway LLM

Cf. [DPIA Gateway LLM](../rgpd/dpia.md).

---

**Fin du DPA**
