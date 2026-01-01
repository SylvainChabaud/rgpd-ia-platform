# Runbook : Coopération avec la CNIL (Art. 31 RGPD)

> **Article concerné** : Art. 31 RGPD — Coopération avec l'autorité de contrôle
>
> **Obligation** : Le responsable de traitement et le sous-traitant coopèrent avec l'autorité de contrôle (CNIL) sur demande
>
> **Dernière mise à jour** : 2026-01-01

---

## 1. Contexte légal

### Article 31 RGPD

> "Le responsable du traitement et le sous-traitant ainsi que, le cas échéant, leurs représentants coopèrent, sur demande, avec l'autorité de contrôle dans l'exécution de ses missions."

### Sanctions en cas de non-coopération

- **Amende administrative** : jusqu'à 10 000 000 € ou 2% du chiffre d'affaires annuel mondial (Art. 83.4)
- **Mesures correctrices** : Limitation temporaire ou définitive du traitement (Art. 58.2)
- **Poursuites pénales** : En cas d'obstruction délibérée (selon législation nationale)

---

## 2. Types de demandes CNIL

### 2.1 Demande d'informations

**Délai de réponse** : Généralement 1 mois (peut être réduit à 7-15 jours en cas d'urgence)

**Informations couramment demandées** :
- Registre des traitements (Art. 30)
- DPIA (Art. 35)
- DPA avec sous-traitants (Art. 28)
- Preuves de consentement
- Procédures de gestion des droits RGPD
- Mesures de sécurité (Art. 32)
- Historique violations de données (Art. 33)

### 2.2 Contrôle sur pièces

**Délai de réponse** : Variable selon la demande

**Documents à fournir** :
- Registre des traitements complet
- Analyses d'impact (DPIA)
- Contrats avec sous-traitants (DPA)
- Politiques internes (confidentialité, sécurité, rétention)
- Logs d'audit (échantillons)
- Rapports de tests RGPD
- Certifications ISO 27001 (si applicable)

### 2.3 Contrôle sur place

**Préavis** : Généralement 2 semaines (peut être immédiat en cas de plainte grave)

**Accès requis** :
- Locaux techniques (serveurs, datacenters)
- Postes de travail (échantillons)
- Systèmes informatiques (accès lecture seule)
- Documentation technique et organisationnelle
- Entretiens avec personnel clé (DPO, RSSI, développeurs)

### 2.4 Enquête suite à une plainte

**Délai de réponse** : 7-15 jours (urgent)

**Informations requises** :
- Circonstances de l'incident (timeline)
- Mesures prises
- Preuves de conformité sur le point litigieux
- Plan d'action correctif

---

## 3. Procédure de réponse CNIL

### Étape 1 : Réception de la demande CNIL

**Canaux de réception** :
- Email officiel CNIL (contact DPO)
- Courrier recommandé AR
- Portail en ligne CNIL (compte professionnel)
- Signification d'huissier (rare)

**Actions immédiates (J+0)** :
1. ✅ Accuser réception de la demande (email + courrier AR)
2. ✅ Notifier le DPO et la direction générale
3. ✅ Créer un dossier de réponse (référence unique)
4. ✅ Inscrire dans le registre des échanges CNIL

### Étape 2 : Analyse de la demande (J+1)

**Responsable** : DPO + Équipe juridique

**Questions à se poser** :
- ✅ Quel est l'objet exact de la demande ?
- ✅ Quel est le délai de réponse ?
- ✅ Quels documents doivent être fournis ?
- ✅ Y a-t-il des demandes ambiguës nécessitant clarification ?
- ✅ Y a-t-il un risque juridique (incohérences, non-conformités) ?

**Livrables** :
- ✅ Note de synthèse (objet, délai, risques)
- ✅ Liste des documents à préparer
- ✅ Répartition des tâches (qui fournit quoi ?)
- ✅ Planning de réponse (jalons internes)

### Étape 3 : Collecte des preuves (J+2 à J+15)

**Coordination** : DPO

#### 3.1 Documents légaux

**Responsable** : Équipe juridique + DPO

Documents à collecter :
- ✅ Registre des traitements à jour ([docs/rgpd/registre-traitements.md](../rgpd/registre-traitements.md))
- ✅ DPIA Gateway LLM ([docs/rgpd/dpia.md](../rgpd/dpia.md))
- ✅ DPA avec sous-traitants ([docs/legal/DPA_TEMPLATE.md](../legal/DPA_TEMPLATE.md))
- ✅ Politique de confidentialité ([docs/legal/POLITIQUE_CONFIDENTIALITE.md](../legal/POLITIQUE_CONFIDENTIALITE.md))
- ✅ CGU ([docs/legal/CGU.md](../legal/CGU.md))

#### 3.2 Preuves techniques

**Responsable** : CTO + Équipe DevOps

**Commandes de collecte** :
```bash
# Générer le rapport d'audit complet
npm run audit:full

# Artefacts générés dans audit-artifacts/
# - audit-report-YYYY-MM-DD.md
# - coverage/
# - metadata.json
```

Documents techniques à fournir :
- ✅ Rapport d'audit RGPD complet (cf. [scripts/audit/README.md](../../scripts/audit/README.md))
- ✅ Rapports de tests RGPD (couverture + résultats)
- ✅ Logs d'audit échantillons (10 derniers jours)
- ✅ Schéma d'architecture ([docs/architecture/BOUNDARIES.md](../architecture/BOUNDARIES.md))
- ✅ Politique classification des données ([docs/data/DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md))
- ✅ Politique LLM ([docs/ai/LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md))

#### 3.3 Preuves organisationnelles

**Responsable** : DPO + RH

Documents à fournir :
- ✅ Organigramme RGPD (DPO, RSSI, équipes)
- ✅ Formations RGPD des employés (registre de présence)
- ✅ Procédures internes (runbooks)
- ✅ Registre des violations de données (si applicable, [EPIC 9](../../TASKS.md#epic-9))
- ✅ Contrats de confidentialité employés (échantillons)

### Étape 4 : Rédaction de la réponse (J+16 à J+25)

**Responsable** : DPO + Équipe juridique

**Structure recommandée de la réponse** :

```markdown
# Réponse à la demande CNIL [RÉFÉRENCE]

## 1. Objet de la demande
[Reprendre l'objet exact de la demande CNIL]

## 2. Contexte de l'organisation
- Nom : [Organisation]
- SIRET : [SIRET]
- Activité : Plateforme SaaS multi-tenant RGPD-IA
- DPO : [Nom] <[Email]>
- Nombre d'utilisateurs : [Approximatif]
- Nombre de tenants : [Approximatif]

## 3. Réponse aux points soulevés

### Point 1 : [Titre]
[Réponse détaillée avec références aux documents fournis]

**Preuves jointes** :
- Annexe 1 : [Document]
- Annexe 2 : [Document]

### Point 2 : [Titre]
[Réponse détaillée avec références aux documents fournis]

**Preuves jointes** :
- Annexe 3 : [Document]

## 4. Mesures de conformité en place

### 4.1 Privacy by Design (Art. 25)
[Description architecture RGPD-compliant]

### 4.2 Sécurité (Art. 32)
[Description mesures techniques et organisationnelles]

### 4.3 Droits des personnes (Art. 15-22)
[Description APIs et procédures]

### 4.4 Sous-traitance (Art. 28)
[Liste sous-traitants + DPA]

## 5. Plan d'action (si non-conformités identifiées)

| Non-conformité | Action corrective | Responsable | Échéance |
|----------------|-------------------|-------------|----------|
| [Description]  | [Action]          | [Nom]       | [Date]   |

## 6. Annexes
- Annexe 1 : Registre des traitements
- Annexe 2 : DPIA Gateway LLM
- Annexe 3 : DPA sous-traitants
- Annexe 4 : Rapport d'audit technique RGPD
- Annexe 5 : Politique de confidentialité
- Annexe 6 : CGU
- Annexe 7 : Schéma d'architecture

## 7. Contact
Pour toute question complémentaire :
- DPO : [Nom] <[Email]> - [Téléphone]
- Direction : [Nom] <[Email]>

Fait à [Ville], le [Date]
[Signature]
```

### Étape 5 : Revue juridique (J+26 à J+28)

**Responsable** : Conseil juridique externe (recommandé)

**Points de vigilance** :
- ✅ Cohérence entre les documents fournis
- ✅ Absence de contradictions
- ✅ Ton respectueux et collaboratif
- ✅ Transparence sur les éventuelles non-conformités
- ✅ Plan d'action réaliste et chiffré

### Étape 6 : Envoi de la réponse (J+29)

**Modalités d'envoi** :
- ✅ Email (si demande CNIL reçue par email)
- ✅ + Courrier recommandé AR (preuve de réception)
- ✅ + Portail CNIL (si applicable)

**Accusé de réception** :
- ✅ Demander confirmation de réception à la CNIL
- ✅ Archiver la réponse (7 ans minimum, Art. 5.e RGPD)

---

## 4. Registre des échanges CNIL

**Localisation** : `/docs/rgpd/REGISTRE_ECHANGES_CNIL.md` (à créer si nécessaire)

**Contenu** :

| Date demande | Référence CNIL | Objet | Délai réponse | Date réponse | Responsable | Statut | Suites |
|--------------|----------------|-------|---------------|--------------|-------------|--------|--------|
| 2026-XX-XX   | REF-CNIL-XXXX  | [Objet] | [Délai] | 2026-XX-XX | [DPO] | ✅ Clos | Aucune |

---

## 5. Contacts CNIL

### Contacts officiels

- **Téléphone** : 01 53 73 22 22 (standard CNIL)
- **Email** : [À adapter selon le contact CNIL attribué]
- **Adresse** : Commission Nationale de l'Informatique et des Libertés (CNIL)
  3 Place de Fontenoy - TSA 80715 - 75334 PARIS CEDEX 07
- **Site** : https://www.cnil.fr

### Portail professionnel

- **Compte CNIL Pro** : https://www.cnil.fr/professionnel (créer un compte si non existant)
- **Déclaration violations** : Formulaire en ligne (délai 72h)
- **Suivi dossiers** : Tableau de bord en ligne

---

## 6. Ressources disponibles

### Documentation interne

| Document | Chemin | Usage |
|----------|--------|-------|
| Registre des traitements | [docs/rgpd/registre-traitements.md](../rgpd/registre-traitements.md) | Fournir à la CNIL (Art. 30) |
| DPIA Gateway LLM | [docs/rgpd/dpia.md](../rgpd/dpia.md) | Fournir à la CNIL (Art. 35) |
| DPA Template | [docs/legal/DPA_TEMPLATE.md](../legal/DPA_TEMPLATE.md) | Fournir à la CNIL (Art. 28) |
| Rapport d'audit complet | [scripts/audit/README.md](../../scripts/audit/README.md) | Générer via `npm run audit:full` |
| Runbook incident RGPD | [docs/runbooks/incident.md](./incident.md) | Procédure violations Art. 33-34 |

### Scripts automatisés

```bash
# Générer le rapport d'audit complet (preuves techniques)
npm run audit:full

# Exporter les logs d'audit (10 derniers jours)
npm run audit:collect

# Vérifier la conformité RLS (isolation tenant)
tsx scripts/check-rls.ts

# Vérifier les privilèges utilisateur DB
tsx scripts/check-user-role.ts
```

---

## 7. Checklist de coopération CNIL

### Avant réception de la demande (préparation)

- [ ] DPO désigné et contact CNIL à jour
- [ ] Registre des traitements à jour (révision trimestrielle)
- [ ] DPIA à jour
- [ ] DPA signés avec tous les sous-traitants
- [ ] Documentation technique RGPD complète
- [ ] Scripts de collecte de preuves fonctionnels (`npm run audit:full`)
- [ ] Procédures internes documentées (runbooks)
- [ ] Formation RGPD des équipes (preuve de participation)
- [ ] Contact avocat spécialisé RGPD identifié

### À réception de la demande (J+0)

- [ ] Accusé de réception envoyé à la CNIL
- [ ] DPO + Direction notifiés
- [ ] Dossier de réponse créé (référence unique)
- [ ] Délai de réponse identifié et respecté
- [ ] Équipe de réponse constituée (DPO, CTO, Juridique)

### Pendant la préparation (J+1 à J+28)

- [ ] Analyse de la demande complète
- [ ] Documents légaux collectés
- [ ] Preuves techniques générées
- [ ] Preuves organisationnelles rassemblées
- [ ] Réponse rédigée (structure claire, ton collaboratif)
- [ ] Revue juridique effectuée (avocat externe recommandé)
- [ ] Annexes numérotées et cohérentes

### À l'envoi de la réponse (J+29)

- [ ] Réponse envoyée avant le délai
- [ ] Email + Courrier AR + Portail CNIL (multi-canal)
- [ ] Accusé de réception demandé
- [ ] Réponse archivée (7 ans minimum)
- [ ] Registre des échanges CNIL mis à jour

### Après la réponse

- [ ] Confirmation de réception CNIL obtenue
- [ ] Plan d'action (si demandé) suivi et reporté
- [ ] Capitalisation : amélioration documentation interne
- [ ] Débriefing équipe : leçons apprises

---

## 8. Cas particuliers

### Demande urgente (< 7 jours)

**Action** : Demander prolongation de délai à la CNIL (email + téléphone)
- Justification raisonnable (complexité technique, absence DPO, etc.)
- Proposer délai alternatif réaliste (15-20 jours)
- Fournir réponse partielle si possible (quick wins)

### Contrôle sur place imminent

**Action** : Préparer l'accueil CNIL
- Réserver salle de réunion
- Préparer accès systèmes (lecture seule, logs audit)
- Brief employés (répondre factuellement, ne pas spéculer)
- Avocat présent (recommandé)

### Plainte d'un utilisateur

**Action** : Investiguer en interne avant réponse CNIL
- Vérifier les faits (logs, audit trail)
- Identifier la cause (bug, erreur humaine, non-conformité)
- Corriger immédiatement si non-conformité avérée
- Réponse CNIL : transparence + plan d'action

---

## 9. Sanctions et recours

### Sanctions possibles (Art. 58 RGPD)

- **Rappel à l'ordre** (simple warning)
- **Mise en demeure** (délai de mise en conformité : 1-3 mois)
- **Limitation temporaire du traitement** (suspension partielle activité)
- **Amende administrative** (jusqu'à 10M€ ou 2% CA en cas de non-coopération)
- **Interdiction définitive du traitement** (sanction ultime, rare)

### Recours en cas de désaccord

- **Recours gracieux** : Demander réexamen à la CNIL (délai 2 mois)
- **Recours contentieux** : Conseil d'État (délai 2 mois après décision CNIL)
- **Médiation** : Possible avant saisine du Conseil d'État

---

## 10. Amélioration continue

### Après chaque échange CNIL

- ✅ Mettre à jour la documentation interne (registre, DPIA, DPA)
- ✅ Corriger les non-conformités identifiées
- ✅ Former les équipes sur les points soulevés
- ✅ Automatiser davantage (scripts, tests RGPD)
- ✅ Réviser les procédures internes (runbooks)

### Audits internes réguliers

- **Fréquence** : Trimestrielle (minimum)
- **Périmètre** : Registre, DPIA, DPA, preuves techniques
- **Responsable** : DPO + Audit interne
- **Livrables** : Rapport d'audit + plan d'action

---

**Dernière révision** : 2026-01-01
**Prochaine révision** : 2026-04-01 (trimestrielle)
**Responsable** : DPO
