# Politique de Confidentialité

**Date d'entrée en vigueur** : 5 janvier 2026
**Version** : 1.0

---

## 1. Responsable du Traitement

**Nom** : [NOM DE VOTRE ORGANISATION]
**Adresse** : [ADRESSE COMPLÈTE]
**Email** : contact@votre-plateforme.fr
**Téléphone** : [TÉLÉPHONE]

**Délégué à la Protection des Données (DPO)** :
Email : dpo@votre-plateforme.fr

---

## 2. Introduction

La présente politique de confidentialité décrit comment nous collectons, utilisons, stockons et protégeons vos données personnelles conformément au **Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679)** et à la loi Informatique et Libertés.

Notre plateforme d'intelligence artificielle traite des données personnelles dans le cadre de la fourniture de services d'IA en mode multi-tenant. Nous nous engageons à garantir la protection de votre vie privée et la sécurité de vos données.

---

## 3. Données Personnelles Collectées

Conformément au principe de **minimisation des données (Art. 5.1.c RGPD)**, nous collectons uniquement les données strictement nécessaires :

### 3.1 Données d'Identification
- **Email** (hashé SHA-256 en base de données)
- **Nom d'affichage** (pseudonyme accepté)
- **Mot de passe** (hashé avec bcrypt + salt, jamais stocké en clair)

### 3.2 Données de Connexion
- **Adresse IP** (anonymisée après 7 jours - Art. 32 RGPD)
- **User-Agent** (navigateur)
- **Horodatages de connexion**

### 3.3 Données d'Utilisation des Services IA
- **Texte des requêtes IA** (chiffrées en base, jamais transmises à des tiers)
- **Résultats générés par l'IA** (chiffrés)
- **Métadonnées techniques** (date, modèle utilisé, tenant ID)

### 3.4 Cookies et Consentements
- **Cookie de session** (authentification, durée : session)
- **Consentement cookies analytiques** (si accepté, durée : 12 mois)
- **Consentement CGU** (obligatoire, durée : illimitée avec preuve)

---

## 4. Finalités et Bases Légales du Traitement

Conformément à l'**Art. 6 RGPD**, nos traitements reposent sur les bases légales suivantes :

| Finalité | Base Légale | Durée de Conservation |
|----------|-------------|------------------------|
| **Création et gestion du compte utilisateur** | Exécution du contrat (Art. 6.1.b) | Durée du compte + 3 ans |
| **Fourniture des services IA** | Exécution du contrat (Art. 6.1.b) | Durée du compte |
| **Sécurité et prévention des fraudes** | Intérêt légitime (Art. 6.1.f) | 12 mois |
| **Audit et conformité RGPD** | Obligation légale (Art. 6.1.c) | 3 ans minimum |
| **Cookies analytiques** | Consentement (Art. 6.1.a) | 12 mois |
| **Amélioration des services** | Intérêt légitime (Art. 6.1.f) | Données anonymisées uniquement |

---

## 5. Destinataires des Données

Vos données personnelles sont accessibles **uniquement** aux personnes suivantes, dans le cadre strict de leurs fonctions :

### 5.1 Personnel Autorisé
- **Équipe technique** (maintenance, support)
- **DPO** (Délégué à la Protection des Données)
- **Super Administrateurs plateforme** (gestion multi-tenant)

### 5.2 Sous-Traitants
Nous pouvons faire appel à des **sous-traitants conformes RGPD (Art. 28)** pour :
- Hébergement sécurisé des données (serveurs en UE uniquement)
- Monitoring et observabilité technique

**Engagement** : Aucune donnée n'est transmise à des modèles d'IA externes hébergés aux USA. Toute inférence IA est exécutée **localement** sur nos serveurs européens.

### 5.3 Aucun Transfert Hors UE
Conformément à l'**Art. 44-50 RGPD**, **aucune donnée personnelle n'est transférée hors de l'Union Européenne**.

---

## 6. Durée de Conservation des Données

Nous appliquons le principe de **limitation de la conservation (Art. 5.1.e RGPD)** :

| Type de Données | Durée de Conservation | Suppression |
|-----------------|------------------------|-------------|
| **Données de compte actif** | Durée du compte | Suppression à la demande |
| **Données de compte supprimé** | 0 jour (suppression immédiate) | Soft delete puis purge après 30j |
| **Logs d'audit RGPD** | 3 ans | Anonymisation automatique |
| **Adresses IP** | 7 jours | Anonymisation automatique |
| **Consentements cookies** | 12 mois | Expiration automatique |
| **Requêtes IA** | Durée du compte | Chiffrées, suppression à la demande |

---

## 7. Vos Droits RGPD (Art. 12-22)

Conformément au RGPD, vous disposez des **droits suivants** sur vos données personnelles :

### 7.1 Droit d'Accès (Art. 15)
Vous pouvez demander une copie de toutes vos données personnelles.
**Délai de réponse** : 1 mois maximum.

### 7.2 Droit de Rectification (Art. 16)
Vous pouvez corriger vos données inexactes depuis votre profil utilisateur.

### 7.3 Droit à l'Effacement / "Droit à l'oubli" (Art. 17)
Vous pouvez demander la suppression définitive de vos données.
**Effet** : Suppression immédiate et irréversible (soft delete 30 jours puis purge).

### 7.4 Droit à la Limitation du Traitement (Art. 18)
Vous pouvez demander le gel temporaire de vos données personnelles.
**Effet** : Blocage des traitements IA pendant la durée de la limitation.

### 7.5 Droit à la Portabilité (Art. 20)
Vous pouvez récupérer vos données dans un format structuré (JSON).

### 7.6 Droit d'Opposition (Art. 21)
Vous pouvez vous opposer à certains traitements basés sur l'intérêt légitime (analytics, profiling).
**Délai de traitement** : 1 mois maximum.

### 7.7 Droit à la Révision Humaine (Art. 22)
Si une décision automatisée vous affecte, vous pouvez demander une révision humaine.
**Fenêtre de contestation** : 90 jours après la décision.

### 7.8 Droit de Réclamation (Art. 77)
Vous pouvez déposer une réclamation auprès de la **CNIL** (Commission Nationale de l'Informatique et des Libertés) :
- Site web : https://www.cnil.fr/
- Adresse : 3 Place de Fontenoy, 75007 Paris, France

---

## 8. Exercice de Vos Droits

Pour exercer l'un de vos droits, contactez-nous :

### Par Email
**dpo@votre-plateforme.fr**
Objet : "Exercice de mes droits RGPD - [Type de demande]"

### Via l'Interface Utilisateur
- **Mon Compte** > **Mes Données RGPD**
- Actions disponibles : Export, Effacement, Suspension, Opposition, Contestation

### Délais de Réponse
- **Standard** : 1 mois maximum (Art. 12.3 RGPD)
- **Complexe** : Prolongation possible de 2 mois (avec justification)

### Pièces Justificatives
Pour vérifier votre identité, nous pouvons demander :
- Copie de pièce d'identité (usage unique, non conservée)

---

## 9. Sécurité des Données (Art. 32 RGPD)

Nous mettons en œuvre des **mesures techniques et organisationnelles** appropriées :

### 9.1 Mesures Techniques
- **Chiffrement AES-256** des données sensibles en base
- **Chiffrement TLS 1.3** pour toutes les communications
- **Hachage bcrypt** des mots de passe (12 rounds + salt)
- **Anonymisation automatique** des IPs après 7 jours
- **Redaction PII** dans les logs et prompts IA

### 9.2 Mesures Organisationnelles
- **Isolation stricte multi-tenant** (filtrage par tenantId)
- **RBAC** (Role-Based Access Control) sur tous les endpoints
- **Audit trail** complet de toutes les actions RGPD
- **Politique de gestion des incidents** (Art. 33-34 RGPD)

### 9.3 Violations de Données (Art. 33-34)
En cas de violation de données personnelles :
- **Notification CNIL** : sous 72h si risque élevé
- **Notification utilisateurs** : si risque élevé pour leurs droits
- **Documentation** : Registre des violations tenu à jour

---

## 10. Cookies et Technologies Similaires (ePrivacy 5.3)

Conformément à la **Directive ePrivacy 2002/58/CE Art. 5.3**, nous utilisons des cookies avec votre consentement préalable.

### 10.1 Cookies Strictement Nécessaires (Sans Consentement)
- **Session d'authentification** (durée : session)
- **Sécurité CSRF** (durée : session)

### 10.2 Cookies Optionnels (Avec Consentement)
- **Analytics** : Mesure d'audience anonymisée (durée : 12 mois)
- **Marketing** : Non utilisés actuellement

### 10.3 Gestion des Cookies
Vous pouvez modifier vos préférences à tout moment :
- **Banner cookies** affiché à la première visite
- **Mon Compte** > **Mes Consentements**

---

## 11. Traitement Automatisé et Profilage (Art. 22)

### 11.1 Décisions Automatisées
Notre plateforme utilise des **modèles d'IA locaux** pour traiter vos requêtes. Ces traitements automatisés peuvent affecter vos résultats.

### 11.2 Garanties
- **Transparence** : Vous êtes informé quand une IA traite vos données
- **Révision humaine** : Vous pouvez contester toute décision (90 jours)
- **Limitation** : Vous pouvez suspendre le traitement de vos données (Art. 18)

### 11.3 Aucun Profilage Marketing
Nous **ne pratiquons pas** de profilage à des fins marketing ou publicitaires.

---

## 12. Données des Mineurs

Notre service n'est **pas destiné aux mineurs de moins de 16 ans**.

Si vous avez connaissance qu'un mineur a créé un compte, contactez immédiatement : dpo@votre-plateforme.fr

---

## 13. Modifications de la Politique

Nous pouvons modifier cette politique de confidentialité. En cas de changement substantiel :
- **Notification par email** 30 jours avant l'entrée en vigueur
- **Nouvelle acceptation** requise si changement majeur
- **Historique des versions** disponible sur demande

---

## 14. Registre des Traitements (Art. 30 RGPD)

Conformément à l'Art. 30 RGPD, nous tenons un **registre des activités de traitement** accessible aux autorités de contrôle.

**Consultation** : Réservée aux Super Admins et DPO via `/api/docs/registre`

---

## 15. Analyse d'Impact (DPIA - Art. 35 RGPD)

Notre Gateway LLM fait l'objet d'une **Analyse d'Impact relative à la Protection des Données (DPIA)** actualisée annuellement.

**Consultation** : Réservée aux Super Admins et DPO via `/api/docs/dpia`

---

## 16. Contact

Pour toute question relative à la protection de vos données personnelles :

**Délégué à la Protection des Données (DPO)**
Email : dpo@votre-plateforme.fr
Adresse : [ADRESSE COMPLÈTE]

**Support utilisateur**
Email : support@votre-plateforme.fr

---

## 17. Versions

| Version | Date | Modifications |
|---------|------|---------------|
| 1.0 | 05/01/2026 | Version initiale |

---

**Dernière mise à jour** : 5 janvier 2026
