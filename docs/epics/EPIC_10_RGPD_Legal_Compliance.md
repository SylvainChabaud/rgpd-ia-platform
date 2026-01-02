# EPIC 10 — RGPD Legal & Compliance (Backend + Documents)

**Date** : 25 décembre 2025 (mis à jour 2 janvier 2026)  
**Statut** : ❌ TODO  
**Périmètre** : Backend APIs + Documents Légaux + Composants React  
**Scope** : PLATFORM / TENANT / MEMBER  
**RGPD Coverage** : Art. 13-14 (Information), Art. 18-22 (Droits), Art. 30 (Registre), Art. 35 (DPIA), ePrivacy (Cookies)  
**Durée estimée** : **2-3 semaines**  
**Tests estimés** : **~80 tests** (backend 50 + frontend 30)

---

## 📋 Périmètre de l'EPIC 10

Cet EPIC fournit **tous les composants backend et documents** requis pour conformité RGPD légale :

**Livrables** :
- ✅ **9 endpoints backend** : Cookies consent + Droits Art. 18/21/22 (suspend, oppose, contest)
- ✅ **4 documents légaux** : Politique confidentialité, CGU, Registre traitements, DPIA
- ✅ **3 pages SSG Next.js** : `/legal/privacy-policy`, `/legal/terms-of-service`, `/legal/rgpd-info`
- ✅ **Composant React** : `CookieConsentBanner.tsx` (standalone, prêt à intégrer)
- ✅ **Tables DB** : `cgu_versions`, `user_cgu_acceptances`, `user_disputes`, `user_oppositions`

**Intégrations frontend** (responsabilité EPIC 11-13) :
- Cookie Banner dans layout → **EPIC 13/LOT 13.0**
- Droits Art. 18/21/22 UI → **EPIC 13/LOT 13.4**
- Accès Registre/DPIA → **EPIC 11/LOT 11.3**
- Dashboards suspensions/contests → **EPIC 12/LOT 12.3**

**Ordonnancement** :
1. ✅ EPIC 8-9 (terminés)
2. **👉 EPIC 10 (démarrer MAINTENANT)** ← Backend + Docs + Composants
3. EPIC 11-13 (frontends, incluent nativement intégrations RGPD)

---

## 1. Contexte et objectifs

### 1.1 Contexte RGPD

**Gap critique identifié** (cf. `ANALYSE_COUVERTURE_RGPD.md`) :
- ❌ **Politique de confidentialité** : Absente (Art. 13-14)
- ❌ **CGU / CGV** : Absentes (base légale contrat)
- ❌ **Page "Informations RGPD"** : Contact DPO, droits utilisateurs, réclamation CNIL manquants
- ❌ **Cookie consent banner** : Absent (ePrivacy)
- ❌ **Registre des traitements** : Manquant (Art. 30)
- ❌ **DPIA** : Non réalisée (Art. 35)
- ⚠️ **Droits complémentaires** : Art. 18 (Limitation), Art. 21 (Opposition), Art. 22 (Décisions automatisées) non couverts

**Articles RGPD concernés** :
- **Art. 13-14** : Information des personnes (transparence)
- **Art. 18** : Droit à la limitation du traitement
- **Art. 21** : Droit d'opposition
- **Art. 22** : Décisions individuelles automatisées (profilage)
- **Art. 30** : Registre des activités de traitement
- **Art. 35** : Analyse d'impact relative à la protection des données (DPIA)
- **Directive ePrivacy 2002/58/CE Art. 5.3** : Consentement cookies

### 1.2 Objectifs techniques

Créer **tous les documents légaux et interfaces RGPD** manquants :

1. **Documents légaux** (accessibles publiquement)
   - Politique de confidentialité (Art. 13-14)
   - Conditions Générales d'Utilisation (CGU)
   - Page "Informations RGPD" (DPO, droits, réclamation CNIL)

2. **Interfaces utilisateur**
   - Cookie consent banner (ePrivacy)
   - Droits complémentaires (Art. 18/21/22)
   - Acceptation CGU au signup

3. **Documents conformité internes** (audits CNIL)
   - Registre des traitements (Art. 30)
   - DPIA Gateway LLM (Art. 35)

### 1.3 Articulation avec autres EPICs

| EPIC | Relation | Détails |
|------|----------|---------|
| **EPIC 11-13** | ✅ Modifie | Ajoute interfaces RGPD (cookies, droits) dans frontends |
| **EPIC 8-9** | ✅ Utilise | Accès registre/DPIA pour admins, scan PII |
| **EPIC 5** | ✅ Complète | Ajoute droits Art. 18/21/22 |
| **EPIC 1** | ✅ Utilise | Auth/audit pour nouvelles fonctionnalités |

---

## 1.4 Spécifications API Endpoints RGPD (Art. 18/21/22 + Cookies)

> **⚠️ CRITIQUE** : Ces endpoints BACK sont requis avant développement des FRONTs (EPIC 11-13).

### 1.4.1 Cookie Consent API (ePrivacy)

#### `GET /api/consents/cookies`
**Description** : Récupérer les préférences cookies de l'utilisateur courant.

**Request** :
```http
GET /api/consents/cookies
Authorization: Bearer <jwt> (optionnel si anonyme)
Cookie: cookie_consent_id=<uuid> (si anonyme)
```

**Response (200)** :
```json
{
  "necessary": true,
  "analytics": false,
  "marketing": false,
  "savedAt": "2025-12-26T10:00:00Z"
}
```

**Response (404)** : Aucune préférence enregistrée.

---

#### `POST /api/consents/cookies`
**Description** : Enregistrer les préférences cookies.

**Request** :
```json
{
  "necessary": true,
  "analytics": true,
  "marketing": false
}
```

**Response (201)** :
```json
{
  "id": "uuid",
  "necessary": true,
  "analytics": true,
  "marketing": false,
  "savedAt": "2025-12-26T10:00:00Z"
}
```

**Audit Event** : `cookies.consent.saved`

---

### 1.4.2 Data Suspension API (Art. 18)

#### `POST /api/rgpd/suspend`
**Description** : Suspendre le traitement des données utilisateur (Art. 18).

**Request** :
```json
{
  "reason": "Investigation en cours sur exactitude données"
}
```

**Response (200)** :
```json
{
  "userId": "uuid",
  "dataSuspended": true,
  "suspendedAt": "2025-12-26T10:00:00Z",
  "message": "Données suspendues. Vous ne pouvez plus utiliser les outils IA."
}
```

**Effect** : 
- `users.data_suspended = true`
- Toute invocation LLM renvoie HTTP 403

**Audit Event** : `user.data_suspended`

---

#### `POST /api/rgpd/unsuspend`
**Description** : Réactiver le traitement des données utilisateur.

**Request** : (aucun body)

**Response (200)** :
```json
{
  "userId": "uuid",
  "dataSuspended": false,
  "reactivatedAt": "2025-12-26T11:00:00Z",
  "message": "Données réactivées. Vous pouvez à nouveau utiliser les outils IA."
}
```

**Audit Event** : `user.data_reactivated`

---

### 1.4.3 Opposition API (Art. 21)

#### `POST /api/rgpd/oppose`
**Description** : Soumettre une opposition au traitement (Art. 21).

**Request** :
```json
{
  "treatmentType": "analytics",
  "reason": "Je ne souhaite plus que mes données soient utilisées pour statistiques"
}
```

**Response (201)** :
```json
{
  "id": "uuid",
  "userId": "uuid",
  "treatmentType": "analytics",
  "status": "pending",
  "createdAt": "2025-12-26T10:00:00Z",
  "estimatedResponseDate": "2026-01-26T10:00:00Z"
}
```

**Workflow** : Ticket créé → Admin traite → Email réponse sous 1 mois.

**Audit Event** : `user.opposition_submitted`

---

#### `GET /api/rgpd/oppositions`
**Description** : Liste des oppositions de l'utilisateur courant.

**Response (200)** :
```json
{
  "oppositions": [
    {
      "id": "uuid",
      "treatmentType": "analytics",
      "status": "resolved",
      "createdAt": "2025-12-01T10:00:00Z",
      "resolvedAt": "2025-12-15T10:00:00Z",
      "response": "Opposition acceptée. Analytics désactivé pour votre compte."
    }
  ]
}
```

---

### 1.4.4 Contest AI API (Art. 22)

#### `POST /api/rgpd/contest`
**Description** : Contester un résultat IA et demander révision humaine (Art. 22).

**Request** :
```json
{
  "aiJobId": "uuid",
  "reason": "Le résumé généré contient des informations factuellement incorrectes",
  "attachmentUrl": "https://storage.example.com/proof.pdf"
}
```

**Response (201)** :
```json
{
  "id": "uuid",
  "userId": "uuid",
  "aiJobId": "uuid",
  "status": "pending",
  "createdAt": "2025-12-26T10:00:00Z",
  "estimatedResponseDate": "2026-01-26T10:00:00Z",
  "message": "Contestation enregistrée. Révision humaine sous 30 jours."
}
```

**Audit Event** : `user.dispute_submitted`

---

#### `GET /api/rgpd/contests`
**Description** : Liste des contestations de l'utilisateur courant.

**Query Params** : `?status=pending|reviewed|resolved`

**Response (200)** :
```json
{
  "contests": [
    {
      "id": "uuid",
      "aiJobId": "uuid",
      "aiJobPurpose": "Résumé de documents",
      "status": "resolved",
      "createdAt": "2025-12-01T10:00:00Z",
      "resolvedAt": "2025-12-20T10:00:00Z",
      "adminResponse": "Après vérification, le résumé a été corrigé manuellement."
    }
  ]
}
```

---

#### `PATCH /api/rgpd/contests/:contestId` (Admin only)
**Description** : Résoudre une contestation (Tenant Admin ou Super Admin).

**Request** :
```json
{
  "status": "resolved",
  "adminResponse": "Après vérification, le résumé a été corrigé manuellement."
}
```

**Response (200)** :
```json
{
  "id": "uuid",
  "status": "resolved",
  "resolvedAt": "2025-12-26T10:00:00Z",
  "adminResponse": "Après vérification, le résumé a été corrigé manuellement."
}
```

**Effect** : Email envoyé à l'utilisateur avec la réponse.

**Audit Event** : `admin.dispute_resolved`

---

### 1.4.5 Tenant Admin Endpoints (RGPD Monitoring)

Ces endpoints permettent au Tenant Admin de suivre les droits RGPD exercés par ses users.

#### `GET /api/tenants/:tenantId/rgpd/suspensions`
**Description** : Liste des utilisateurs ayant suspendu leurs données.

**Response (200)** :
```json
{
  "suspensions": [
    {
      "userId": "uuid",
      "userEmail": "j***@example.com",
      "suspendedAt": "2025-12-26T10:00:00Z",
      "reason": "Investigation en cours"
    }
  ]
}
```

---

#### `GET /api/tenants/:tenantId/rgpd/oppositions`
**Description** : Liste des oppositions des utilisateurs du tenant.

---

#### `GET /api/tenants/:tenantId/rgpd/contests`
**Description** : Liste des contestations IA des utilisateurs du tenant.

---

### 1.4.6 Corrélation Endpoints → FRONT

| Endpoint | FRONT Consumer | EPIC | User Story |
|----------|----------------|------|------------|
| `POST /api/consents/cookies` | Cookie Banner (Layout) | EPIC 10/13 | US 10.4 |
| `GET /api/consents/cookies` | Cookie Banner (Layout) | EPIC 10/13 | US 10.4 |
| `POST /api/rgpd/suspend` | My Data page (EPIC 13) | EPIC 10/13 | US 10.7 |
| `POST /api/rgpd/unsuspend` | My Data page (EPIC 13) | EPIC 10/13 | US 10.7 |
| `POST /api/rgpd/oppose` | My Data page (EPIC 13) | EPIC 10/13 | US 10.8 |
| `GET /api/rgpd/oppositions` | My Data page (EPIC 13) | EPIC 10/13 | US 10.8 |
| `POST /api/rgpd/contest` | AI Result view (EPIC 13) | EPIC 10/13 | US 10.9 |
| `GET /api/rgpd/contests` | My Data page (EPIC 13) | EPIC 10/13 | US 10.9 |
| `GET /api/tenants/:id/rgpd/suspensions` | RGPD Dashboard (EPIC 12) | EPIC 10/12 | - |
| `GET /api/tenants/:id/rgpd/oppositions` | RGPD Dashboard (EPIC 12) | EPIC 10/12 | - |
| `GET /api/tenants/:id/rgpd/contests` | RGPD Dashboard (EPIC 12) | EPIC 10/12 | - |
| `PATCH /api/rgpd/contests/:id` | Contest Detail (EPIC 12) | EPIC 10/12 | - |

---

## 2. Exigences RGPD (Articles 13-14, 18-22, 30, 35, ePrivacy)

### 2.1 Information des personnes (Art. 13-14)

**Obligation légale** :
> Le responsable du traitement fournit à la personne concernée **au moment où les données sont collectées** les informations suivantes (RGPD Art. 13).

**Informations obligatoires** :
1. **Identité responsable traitement** : Nom entreprise, adresse, contact
2. **Contact DPO** : Email, formulaire contact
3. **Finalités traitement** : Usage IA, gestion compte, analytics
4. **Base légale** : Consentement, contrat, obligation légale
5. **Destinataires données** : Fournisseurs LLM (OpenAI, Anthropic), hébergeur (AWS/GCP)
6. **Durée conservation** : 90 jours ai_jobs, 3 ans users inactifs
7. **Droits utilisateurs** : Accès, rectification, effacement, portabilité, opposition
8. **Droit réclamation** : Autorité de contrôle (CNIL en France)
9. **Décisions automatisées** : Si profilage IA, mention explicite

**Implémentation** :
- **Politique de confidentialité** : Document public accessible footer
- **Page "Informations RGPD"** : Page dédiée avec toutes informations
- **Popup consentement** : Résumé + lien politique complète

### 2.2 Droit à la limitation (Art. 18)

**Obligation légale** :
> La personne concernée a le droit d'obtenir du responsable du traitement la **limitation du traitement** dans certains cas (RGPD Art. 18).

**Cas d'application** :
1. Personne conteste exactitude des données (investigation en cours)
2. Traitement illicite mais personne ne souhaite pas effacement
3. Données nécessaires pour constat/exercice/défense de droits

**Implémentation** :
- **Interface utilisateur** : Bouton "Suspendre mes données" (My Data)
- **Effet** : Flag `user.data_suspended = true` → Bloc invocations LLM
- **Notification** : Email confirmation suspension
- **Restauration** : User peut réactiver à tout moment

### 2.3 Droit d'opposition (Art. 21)

**Obligation légale** :
> La personne concernée a le droit de **s'opposer à tout moment** au traitement de données la concernant fondé sur l'intérêt légitime (RGPD Art. 21).

**Cas d'application** :
- Si base légale = **intérêt légitime** (pas consentement)
- Marketing direct (opt-out obligatoire)

**Implémentation** :
- **Formulaire opposition** : Page "My Data" → "Je m'oppose au traitement"
- **Champ motif** : Textarea libre (optionnel)
- **Effet** : Suspension traitement similaire Art. 18
- **Délai réponse** : 1 mois (notification email)

### 2.4 Décisions automatisées (Art. 22)

**Obligation légale** :
> La personne concernée a le droit de ne pas faire l'objet d'une décision fondée **exclusivement** sur un traitement automatisé (RGPD Art. 22).

**Cas d'application** :
- Si IA prend décisions automatisées (classification documents, scoring, profiling)
- User doit pouvoir demander **intervention humaine**

**Implémentation** :
- **Bouton "Révision humaine"** : Sur résultats IA contestés
- **Formulaire** : Explication contestation + upload preuve
- **Workflow** : Ticket support → Révision manuelle admin
- **Délai réponse** : 1 mois (notification email)

### 2.5 Registre des traitements (Art. 30)

**Obligation légale** :
> Chaque responsable du traitement tient un **registre des activités de traitement** effectuées sous sa responsabilité (RGPD Art. 30).

**Contenu registre** (par traitement) :
1. Nom et coordonnées responsable traitement
2. Finalités du traitement
3. Catégories de personnes concernées
4. Catégories de données à caractère personnel
5. Catégories de destinataires
6. Durées de conservation
7. Description mesures de sécurité

**Traitements à documenter** :
1. **Authentification users** (gestion comptes)
2. **Invocation Gateway LLM** (traitement IA)
3. **Consentements IA** (gestion purposes)
4. **Export/effacement RGPD** (droits personnes)
5. **Audit trail** (traçabilité)

**Implémentation** :
- Document Markdown : `/docs/rgpd/REGISTRE_TRAITEMENTS.md`
- Accessible Super Admin (interface Back Office)

### 2.6 DPIA (Art. 35)

**Obligation légale** :
> Lorsqu'un traitement est susceptible d'engendrer un **risque élevé** pour les droits et libertés des personnes physiques, le responsable du traitement effectue une **analyse d'impact** (RGPD Art. 35).

**Cas d'application** :
- ✅ **Traitement IA = risque élevé** (décisions automatisées, profilage potentiel)
- ✅ **DPIA obligatoire** pour Gateway LLM

**Contenu DPIA** :
1. Description systématique traitement (Gateway LLM, modèles, purposes)
2. Nécessité et proportionnalité traitement
3. Évaluation risques pour droits/libertés (hallucinations, biais, fuite données)
4. Mesures envisagées pour atténuer risques (consentement, audit trail, rétention 90j, chiffrement)
5. Consultation DPO (validation)

**Implémentation** :
- Document Markdown : `/docs/rgpd/DPIA_GATEWAY_LLM.md`
- Accessible Super Admin (interface Back Office)

### 2.7 Cookie consent (ePrivacy)

**Obligation légale** :
> Le stockage d'informations sur l'équipement terminal requiert le **consentement préalable** de l'utilisateur (Directive ePrivacy 2002/58/CE Art. 5.3).

**Catégories cookies** :
1. **Strictement nécessaires** : Session JWT, CSRF token (pas de consentement requis)
2. **Analytics** : Google Analytics, Plausible (consentement requis)
3. **Marketing** : Publicités, tracking (consentement requis)

**Implémentation** :
- **Cookie banner** : Popup première visite
- **Catégories** : Checkboxes opt-in par catégorie
- **Persistance choix** : localStorage (12 mois)
- **Blocage scripts** : Analytics/marketing bloqués jusqu'à consentement

---

## 3. Périmètre fonctionnel

### 3.1 LOT 10.0 — Politique de Confidentialité

**Objectif** : Rédiger et publier politique de confidentialité complète (Art. 13-14).

**User Stories** :

#### US 10.1 : Rédaction politique de confidentialité
**En tant que** Équipe juridique  
**Je veux** rédiger politique de confidentialité RGPD-compliant  
**Afin de** informer utilisateurs sur usage données

**Contenu requis** :
- [ ] Identité responsable traitement (nom entreprise, adresse)
- [ ] Contact DPO (email, formulaire)
- [ ] Finalités traitement (usage IA, gestion compte, analytics)
- [ ] Base légale (consentement opt-in, contrat CGU)
- [ ] Catégories données collectées (P0-P3, cf. DATA_CLASSIFICATION.md)
- [ ] Destinataires données (fournisseurs LLM, hébergeur)
- [ ] Transferts hors UE (si applicable, clauses contractuelles types)
- [ ] Durée conservation (90j ai_jobs, 3 ans users inactifs)
- [ ] Droits utilisateurs (accès, rectification, effacement, portabilité, opposition, limitation)
- [ ] Droit réclamation CNIL
- [ ] Décisions automatisées (mention IA, droit révision humaine)
- [ ] Cookies utilisés (catégories, purposes)
- [ ] Mise à jour politique (versioning, date dernière modification)

**Template** :
```markdown
# Politique de Confidentialité — Plateforme RGPD-IA

**Dernière mise à jour** : [DATE]  
**Version** : 1.0

## 1. Responsable du traitement
**[NOM ENTREPRISE]**  
Adresse : [ADRESSE COMPLÈTE]  
Email : contact@example.com  
DPO : dpo@example.com

## 2. Données collectées
Nous collectons les données suivantes :
- **Compte utilisateur** : Email, nom, prénom (P1)
- **Authentification** : Mot de passe hashé (P2)
- **Usage IA** : Métadonnées invocations (dates, modèles, statuts) (P1)
- **Consentements** : Historique consentements purposes IA (P1)
- **Navigation** : IP (anonymisée après 7 jours), user-agent (P1)

**Nous ne collectons PAS** :
- Contenus prompts/outputs IA (non persistés, P3)

## 3. Finalités traitement
- **Gestion compte** : Authentification, gestion profil (base légale : contrat)
- **Traitement IA** : Invocation modèles LLM (base légale : consentement opt-in)
- **Amélioration service** : Analytics anonymes (base légale : intérêt légitime)
- **Conformité légale** : Audit trail RGPD (base légale : obligation légale)

## 4. Destinataires données
- **Fournisseurs LLM** : OpenAI, Anthropic (traitement prompts, non persistés)
- **Hébergeur** : AWS/GCP (stockage DB, chiffré)
- **Analytics** : [Si applicable, ex. Plausible Analytics]

## 5. Transferts hors UE
[Si applicable]
Les données peuvent être transférées hors UE (USA) avec garanties appropriées :
- Clauses contractuelles types (CCT)
- Privacy Shield (si applicable)

## 6. Durée conservation
- **ai_jobs** : 90 jours maximum (purge automatique)
- **Users actifs** : Durée utilisation service
- **Users inactifs** : 3 ans puis suppression
- **Audit trail** : 5 ans (obligation légale)

## 7. Vos droits
Vous disposez des droits suivants :
- **Accès** : Obtenir copie de vos données (export RGPD)
- **Rectification** : Corriger données inexactes
- **Effacement** : Supprimer vos données ("droit à l'oubli")
- **Portabilité** : Récupérer données format structuré (JSON/CSV)
- **Opposition** : Vous opposer au traitement (si base légale = intérêt légitime)
- **Limitation** : Suspendre temporairement traitement
- **Révision humaine** : Contester décision IA automatisée

Pour exercer vos droits : [Lien My Data]

## 8. Réclamation
Vous pouvez introduire réclamation auprès de la CNIL :
- Site : https://www.cnil.fr/
- Adresse : 3 Place de Fontenoy, 75007 Paris

## 9. Cookies
Voir [Politique Cookies] pour détails.

## 10. Modifications
Cette politique peut être mise à jour. Date dernière modification affichée en haut.
Vous serez notifié par email des modifications majeures.

## 11. Contact
Questions RGPD : dpo@example.com
```

**Acceptance Criteria** :
- [ ] Document créé : `/docs/legal/POLITIQUE_CONFIDENTIALITE.md`
- [ ] Page frontend accessible : `/legal/privacy-policy`
- [ ] Lien footer : "Politique de confidentialité"
- [ ] Versioning : Date dernière modification affichée
- [ ] Format : Markdown + HTML (Next.js SSG)

---

### 3.2 LOT 10.1 — CGU / CGV

**Objectif** : Rédiger conditions générales d'utilisation (base légale contrat).

**User Stories** :

#### US 10.2 : Rédaction CGU
**En tant que** Équipe juridique  
**Je veux** rédiger CGU RGPD-compliant  
**Afin de** définir cadre contractuel utilisation plateforme

**Contenu requis** :
- [ ] Objet service (plateforme IA RGPD-compliant)
- [ ] Conditions accès (inscription, âge minimum 16 ans)
- [ ] Obligations utilisateur (usage licite, pas de contournement)
- [ ] Propriété intellectuelle (modèles, code, données)
- [ ] Responsabilité (limitations, hallucinations IA)
- [ ] Durée/résiliation (suspension compte, effacement données)
- [ ] Modifications CGU (notification email)
- [ ] Loi applicable (droit français, tribunaux compétents)

**Template** :
```markdown
# Conditions Générales d'Utilisation (CGU)

**Dernière mise à jour** : [DATE]  
**Version** : 1.0

## 1. Objet
Les présentes CGU régissent l'utilisation de la plateforme RGPD-IA.

## 2. Acceptation CGU
En créant un compte, vous acceptez les présentes CGU.

## 3. Conditions d'accès
- Âge minimum : 16 ans
- Email valide requis
- Acceptation CGU obligatoire

## 4. Obligations utilisateur
Vous vous engagez à :
- Utiliser service conformément à la loi
- Ne pas contourner mesures RGPD (bypass Gateway LLM)
- Ne pas tenter d'accéder données autres utilisateurs

## 5. Propriété intellectuelle
Tous droits réservés [NOM ENTREPRISE].

## 6. Responsabilité
Nous ne garantissons pas :
- Exactitude résultats IA (hallucinations possibles)
- Disponibilité 100% service (maintenance programmée)

## 7. Durée et résiliation
- Durée : Indéterminée
- Résiliation : À tout moment via "Supprimer mon compte"
- Effacement données : 30 jours après suppression

## 8. Modifications CGU
Toute modification notifiée par email 30 jours avant application.

## 9. Loi applicable
Droit français. Tribunaux de Paris compétents.

## 10. Contact
Questions : support@example.com
```

**Acceptance Criteria** :
- [ ] Document créé : `/docs/legal/CGU.md`
- [ ] Page frontend accessible : `/legal/terms-of-service`
- [ ] Lien footer : "CGU"
- [ ] Checkbox signup : "J'accepte les CGU" (obligatoire)
- [ ] Versioning : Historique versions CGU (DB `cgu_versions`)
- [ ] Acceptation tracée : `user_cgu_acceptances` (user_id, cgu_version_id, accepted_at)

---

### 3.3 LOT 10.2 — Page "Informations RGPD"

**Objectif** : Créer page centralisée informations RGPD (DPO, droits, réclamation).

**User Stories** :

#### US 10.3 : Page "Informations RGPD"
**En tant que** Utilisateur  
**Je veux** accéder facilement à toutes informations RGPD  
**Afin de** connaître mes droits et contacts

**Contenu page** :
- [ ] Identité responsable traitement (nom, adresse)
- [ ] Contact DPO (email + formulaire contact)
- [ ] Finalités traitement (résumé clair)
- [ ] Bases légales (consentement opt-in, contrat CGU)
- [ ] Droits utilisateurs (liste complète avec liens actions)
- [ ] Droit réclamation CNIL (lien site CNIL)
- [ ] Liens utiles :
  - Politique de confidentialité
  - CGU
  - Cookie policy
  - Export RGPD (My Data)

**Maquette** :
```
┌─────────────────────────────────────────────┐
│         Informations RGPD                   │
├─────────────────────────────────────────────┤
│ Responsable du traitement                   │
│ [NOM ENTREPRISE]                            │
│ [ADRESSE]                                   │
│                                             │
│ Contact DPO                                 │
│ Email: dpo@example.com                      │
│ [Formulaire contact]                        │
│                                             │
│ Vos droits                                  │
│ - Droit d'accès (Export RGPD)              │
│ - Droit de rectification (Modifier profil) │
│ - Droit à l'effacement (Supprimer compte)  │
│ - Droit à la portabilité (Export données)  │
│ - Droit d'opposition (Formulaire)          │
│ - Droit à la limitation (Suspendre)        │
│                                             │
│ Réclamation                                 │
│ Vous pouvez introduire réclamation CNIL    │
│ [Lien site CNIL]                            │
│                                             │
│ Liens utiles                                │
│ - Politique de confidentialité             │
│ - CGU                                       │
│ - Cookie policy                             │
└─────────────────────────────────────────────┘
```

**Acceptance Criteria** :
- [ ] Page accessible : `/legal/rgpd-info`
- [ ] Lien footer : "Informations RGPD"
- [ ] Formulaire contact DPO fonctionnel (email backend)
- [ ] Tous liens droits utilisateurs actifs
- [ ] Responsive (mobile/desktop)

---

### 3.4 LOT 10.3 — Cookie Consent Banner

**Objectif** : Implémenter cookie consent banner ePrivacy-compliant.

**User Stories** :

#### US 10.4 : Cookie banner première visite
**En tant que** Utilisateur  
**Je veux** être informé des cookies et donner mon consentement  
**Afin de** respecter ma vie privée

**Acceptance Criteria** :
- [ ] Banner affiché première visite (si pas de choix précédent)
- [ ] Catégories cookies :
  - **Nécessaires** (JWT, CSRF) : Pré-cochées, non modifiables
  - **Analytics** (Plausible, GA) : Opt-in, checkbox
  - **Marketing** (si applicable) : Opt-in, checkbox
- [ ] Boutons : "Accepter tout", "Refuser tout", "Personnaliser"
- [ ] Lien "Politique cookies" (détails complets)
- [ ] Persistance choix : localStorage (`cookie_consent`, 12 mois)
- [ ] Blocage scripts : Analytics/marketing bloqués si refus

**Maquette** :
```
┌─────────────────────────────────────────────┐
│ 🍪 Nous utilisons des cookies               │
│                                             │
│ Pour améliorer votre expérience, nous      │
│ utilisons des cookies. Vous pouvez         │
│ personnaliser vos choix ci-dessous.        │
│                                             │
│ ☑️ Nécessaires (obligatoires)               │
│ ☐ Analytics (optionnel)                    │
│ ☐ Marketing (optionnel)                    │
│                                             │
│ [Accepter tout] [Refuser tout]              │
│ [Personnaliser]                             │
│                                             │
│ En savoir plus : Politique cookies          │
└─────────────────────────────────────────────┘
```

**Backend API** :
- `GET /api/consents/cookies` : Récupérer préférences cookies user
- `POST /api/consents/cookies` : Enregistrer préférences (necessary, analytics, marketing)
- Table : `cookie_consents` (tenant_id, user_id, necessary, analytics, marketing)
- Audit event : `cookies.consent.saved`

**Frontend Component** :
- `src/app/components/CookieConsentBanner.tsx`
- Affichage première visite (si pas de consentement backend)
- Boutons : "Accepter tout", "Refuser tout", "Personnaliser"
- Scripts bloqués si refus (analytics, marketing)
- Révocation possible via page "Gérer cookies"

**Acceptance Criteria** :
- [ ] Banner non intrusif (bas de page, dismissible)
- [ ] Choix persistés 12 mois (localStorage)
- [ ] Révocation possible : Page "Gérer cookies" (footer)
- [ ] Scripts bloqués si refus (tests E2E)
- [ ] Conformité CNIL (guidelines cookies françaises)

---

### 3.5 LOT 10.4 — Registre des Traitements (Art. 30)

**Objectif** : Créer registre des traitements RGPD-compliant.

**User Stories** :

#### US 10.5 : Registre des traitements documenté
**En tant que** DPO  
**Je veux** disposer d'un registre des traitements à jour  
**Afin de** prouver conformité RGPD en cas d'audit CNIL

**Contenu registre** :

```markdown
# Registre des Activités de Traitement (Art. 30 RGPD)

**Responsable du traitement** : [NOM ENTREPRISE]  
**DPO** : dpo@example.com  
**Dernière mise à jour** : [DATE]

---

## Traitement 1 : Authentification et gestion des comptes utilisateurs

| Champ | Valeur |
|-------|--------|
| **Finalité** | Authentification users, gestion profils, contrôle accès |
| **Base légale** | Contrat (CGU) + consentement opt-in |
| **Catégories personnes** | Users inscrits (MEMBER, TENANT_ADMIN, SUPER_ADMIN) |
| **Catégories données** | Email (P1), nom/prénom (P1), mot de passe hashé (P2), roles/permissions (P1) |
| **Destinataires** | Hébergeur DB (AWS RDS), équipe support (accès restreint) |
| **Transferts hors UE** | Non (hébergement UE) OU Oui (AWS USA, CCT) |
| **Durée conservation** | Durée utilisation service + 3 ans inactivité |
| **Mesures sécurité** | Chiffrement TLS 1.3, hashage bcrypt (12 rounds), MFA optionnel, isolation tenant |

---

## Traitement 2 : Invocation Gateway LLM (Traitement IA)

| Champ | Valeur |
|-------|--------|
| **Finalité** | Traitement IA (résumé, classification, extraction) via LLM |
| **Base légale** | Consentement opt-in par purpose |
| **Catégories personnes** | Users ayant accepté consentement IA |
| **Catégories données** | Métadonnées invocations (P1), prompts/outputs **non persistés** (P3) |
| **Destinataires** | Fournisseurs LLM (OpenAI, Anthropic), hébergeur (logs temporaires) |
| **Transferts hors UE** | Oui (OpenAI USA, Anthropic USA, CCT + Privacy Shield) |
| **Durée conservation** | Métadonnées : 90 jours max (purge auto), prompts/outputs : 0 jour (non stockés) |
| **Mesures sécurité** | Gateway LLM unique, consentement opt-in, pseudonymisation PII (EPIC 8), audit trail |

---

## Traitement 3 : Gestion des consentements IA

| Champ | Valeur |
|-------|--------|
| **Finalité** | Traçabilité consentements purposes IA (RGPD Art. 7) |
| **Base légale** | Obligation légale (RGPD) |
| **Catégories personnes** | Users ayant interagi avec popup consentement |
| **Catégories données** | user_id (P1), purpose (P1), granted (boolean), timestamps (P1) |
| **Destinataires** | Aucun (usage interne uniquement) |
| **Transferts hors UE** | Non |
| **Durée conservation** | 5 ans (preuve conformité RGPD) |
| **Mesures sécurité** | Isolation tenant, audit trail modifications, accès lecture seule users |

---

## Traitement 4 : Export et effacement RGPD (Droits des personnes)

| Champ | Valeur |
|-------|--------|
| **Finalité** | Exercice droits RGPD (accès, effacement, portabilité) |
| **Base légale** | Obligation légale (RGPD Art. 15-20) |
| **Catégories personnes** | Users demandant export/effacement |
| **Catégories données** | Toutes données user (P1/P2), métadonnées ai_jobs (P1) |
| **Destinataires** | User uniquement (export chiffré) |
| **Transferts hors UE** | Non |
| **Durée conservation** | Export : téléchargement immédiat puis purge 24h, Effacement : soft delete 30j puis purge définitive |
| **Mesures sécurité** | Chiffrement AES-256-GCM exports, authentification forte requise, audit trail actions |

---

## Traitement 5 : Audit trail et logs système

| Champ | Valeur |
|-------|--------|
| **Finalité** | Traçabilité actions utilisateurs, sécurité, conformité RGPD |
| **Base légale** | Obligation légale (RGPD Art. 5.2, Art. 32) |
| **Catégories personnes** | Tous users |
| **Catégories données** | user_id (P1), tenant_id (P1), action (P1), IP (P1, anonymisée > 7j), timestamps (P1) |
| **Destinataires** | Équipe DevOps (accès restreint), DPO |
| **Transferts hors UE** | Non |
| **Durée conservation** | 5 ans (obligation légale), IP anonymisée après 7 jours |
| **Mesures sécurité** | Append-only logs, anonymisation IP auto (EPIC 8), chiffrement at-rest, accès RBAC |

---

**Validé par** : [NOM DPO]  
**Date validation** : [DATE]
```

**Backend API Access** :
- `GET /api/docs/registre` : Lecture registre (SUPER_ADMIN/DPO uniquement)
- Fichier source : `docs/rgpd/REGISTRE_TRAITEMENTS.md`
- Parser markdown → HTML (library `marked`)
- Response : { title, content (HTML), lastModified }

**Acceptance Criteria** :
- [ ] Document créé : `/docs/rgpd/REGISTRE_TRAITEMENTS.md`
- [ ] 5 traitements documentés (Auth, LLM, Consentements, Export/effacement, Audit)
- [ ] Accessible Super Admin (interface Back Office, lecture seule)
- [ ] Versioning : Date dernière mise à jour
- [ ] Validation DPO (signature électronique)
- [ ] API backend `/api/docs/registre` créée (Super Admin/DPO only)
- [ ] Parser markdown → HTML fonctionnel

**Tests obligatoires** :
- Tests API backend (GET /api/docs/registre, protection RBAC)
- Tests E2E accès registre (Super Admin uniquement, implémenté dans LOT 11.3)

---

### 3.6 LOT 10.5 — DPIA Gateway LLM (Art. 35)

**Objectif** : Réaliser analyse d'impact DPIA pour traitement IA (risque élevé).

**User Stories** :

#### US 10.6 : DPIA Gateway LLM documentée
**En tant que** DPO  
**Je veux** réaliser DPIA pour traitement IA  
**Afin de** prouver évaluation risques conformité RGPD

**Contenu DPIA** :

```markdown
# Analyse d'Impact Relative à la Protection des Données (DPIA)
## Traitement : Gateway LLM (Plateforme RGPD-IA)

**Date réalisation** : [DATE]  
**Responsable DPIA** : [NOM DPO]  
**Version** : 1.0

---

## 1. Description systématique du traitement

### 1.1 Nature du traitement
- **Finalité** : Invocation modèles LLM (résumé, classification, extraction texte)
- **Moyens** : Gateway LLM centralisé (OpenAI GPT-4, Anthropic Claude)
- **Données traitées** : Prompts utilisateurs (P3, non persistés), métadonnées invocations (P1, persistées 90j)
- **Personnes concernées** : Users ayant accepté consentement opt-in purposes IA
- **Volume** : Estimé 10k invocations/jour

### 1.2 Architecture technique
- Gateway unique : `src/ai/gateway/gateway.service.ts`
- Flux : User → API → Gateway LLM → Provider LLM → Réponse (non persistée)
- Sécurité : Consentement opt-in, audit trail, isolation tenant, pas de stockage outputs

### 1.3 Contexte et justification
- **Nécessité** : Fournir capacités IA aux users (résumé documents, classification)
- **Proportionnalité** : Minimisation données (métadonnées uniquement), consentement explicite

---

## 2. Nécessité et proportionnalité

### 2.1 Nécessité du traitement
- ✅ **Traitement nécessaire** pour fournir service IA promis users
- ✅ **Pas d'alternative moins intrusive** : IA nécessite prompts texte

### 2.2 Proportionnalité
- ✅ **Minimisation** : Prompts/outputs non persistés (P3 interdit)
- ✅ **Limitation finalités** : Uniquement purposes explicites (résumé, classification, extraction)
- ✅ **Limitation durée** : Métadonnées 90 jours max (purge auto)
- ✅ **Consentement opt-in** : User accepte explicitement par purpose

---

## 3. Évaluation des risques

### 3.1 Risque 1 : Hallucinations IA (Exactitude données)

**Description** : LLM peut générer informations fausses (hallucinations).

**Impact** : 🟡 Moyen (décisions utilisateur basées sur fausses infos)

**Vraisemblance** : 🔴 Élevée (hallucinations courantes LLM)

**Mesures atténuation** :
- ✅ Disclaimer interface : "Résultats IA non garantis, vérifier informations"
- ✅ Droit révision humaine (Art. 22) : User peut contester décision IA
- ⚠️ Limitation responsabilité CGU

**Risque résiduel** : 🟢 Faible (users informés, révision possible)

---

### 3.2 Risque 2 : Fuite données personnelles (Confidentialité)

**Description** : Prompts peuvent contenir PII (noms, emails) envoyées fournisseurs LLM tiers (OpenAI, Anthropic).

**Impact** : 🔴 Élevé (violation confidentialité)

**Vraisemblance** : 🟡 Moyenne (users peuvent inclure PII prompts)

**Mesures atténuation** :
- ✅ **EPIC 8** : Pseudonymisation automatique PII avant envoi LLM
- ✅ Consentement opt-in explicite (mention partage tiers)
- ✅ Clauses contractuelles types (CCT) avec fournisseurs LLM
- ✅ Outputs non persistés (P3 interdit)
- ✅ Audit trail invocations (traçabilité)

**Risque résiduel** : 🟢 Faible (pseudonymisation + CCT + non-stockage)

---

### 3.3 Risque 3 : Biais/Discrimination (Équité)

**Description** : LLM peuvent reproduire biais (genre, origine, religion) dans classifications/résumés.

**Impact** : 🔴 Élevé (discrimination potentielle)

**Vraisemblance** : 🟡 Moyenne (biais modèles connus)

**Mesures atténuation** :
- ✅ Droit révision humaine (Art. 22) : User peut contester décision IA biaisée
- ✅ Disclaimer interface : "Vérifier résultats IA"
- ⚠️ Monitoring biais (TODO EPIC futur : détection biais outputs)

**Risque résiduel** : 🟡 Moyen (révision humaine possible mais pas automatique)

---

### 3.4 Risque 4 : Contournement consentement (Licéité)

**Description** : User ou dev pourrait contourner Gateway LLM (appel direct fournisseur).

**Impact** : 🔴 Élevé (violation RGPD consentement)

**Vraisemblance** : 🟢 Faible (architecture empêche)

**Mesures atténuation** :
- ✅ Gateway unique obligatoire (pas de clés API users)
- ✅ Tests E2E bypass interdit (`rgpd.no-llm-bypass.test.ts`)
- ✅ Audit trail toutes invocations (traçabilité)
- ✅ Rate limiting (prévention abus)

**Risque résiduel** : 🟢 Très faible (architecture robuste)

---

### 3.5 Risque 5 : Accès non autorisé logs (Sécurité)

**Description** : Logs/audit contiennent métadonnées invocations (user_id, purpose) accessibles admins.

**Impact** : 🟡 Moyen (violation confidentialité cross-tenant)

**Vraisemblance** : 🟢 Faible (isolation tenant robuste)

**Mesures atténuation** :
- ✅ Isolation tenant (WHERE tenant_id = $1)
- ✅ RBAC/ABAC (Super Admin seul accès cross-tenant)
- ✅ Audit trail accès logs (traçabilité admins)
- ✅ Tests E2E isolation tenant (`db.cross-tenant-isolation.test.ts`)
- ✅ Anonymisation IP après 7 jours (EPIC 8)

**Risque résiduel** : 🟢 Très faible (isolation validée tests)

---

## 4. Mesures envisagées pour atténuer les risques

### 4.1 Mesures techniques
- ✅ **Gateway LLM unique** : Point central contrôle (EPIC 3)
- ✅ **Consentement opt-in** : Popup explicite par purpose (EPIC 5)
- ✅ **Pseudonymisation PII** : Masking automatique avant LLM (EPIC 8)
- ✅ **Non-stockage outputs** : P3 jamais persisté (EPIC 3)
- ✅ **Rétention limitée** : 90 jours max métadonnées (EPIC 4)
- ✅ **Chiffrement** : TLS 1.3, AES-256-GCM exports (EPIC 5)
- ✅ **Isolation tenant** : Séparation données clients (EPIC 1)
- ✅ **Audit trail** : Traçabilité toutes actions (EPIC 1)

### 4.2 Mesures organisationnelles
- ✅ **DPO désigné** : Responsable conformité RGPD
- ✅ **Formation équipe** : Sensibilisation RGPD/IA
- ✅ **Clauses contractuelles** : CCT avec fournisseurs LLM
- ✅ **Politique usage IA** : `LLM_USAGE_POLICY.md` (règles strictes)
- ✅ **Tests RGPD** : 72 tests E2E validant conformité

### 4.3 Mesures utilisateurs
- ✅ **Transparence** : Politique confidentialité claire (EPIC 10)
- ✅ **Droit révision humaine** : Art. 22 (US 10.8)
- ✅ **Export/effacement** : Droits RGPD facilités (EPIC 5)
- ✅ **Révocation consentement** : Toggle on/off instantané (EPIC 5)

---

## 5. Consultation des parties prenantes

### 5.1 DPO
- **Consulté** : Oui
- **Date** : [DATE]
- **Avis** : Favorable sous réserve implémentation EPIC 11 (pseudonymisation)
- **Validation** : ✅

### 5.2 Représentants utilisateurs
- **Consulté** : Non (pas de comité users pour l'instant)
- **Prévu** : Tests beta avec users pilotes (phase production)

---

## 6. Conclusion

### 6.1 Synthèse risques résiduels

| Risque | Impact initial | Vraisemblance | Risque résiduel |
|--------|----------------|---------------|-----------------|
| Hallucinations IA | 🟡 Moyen | 🔴 Élevée | 🟢 Faible |
| Fuite PII | 🔴 Élevé | 🟡 Moyenne | 🟢 Faible |
| Biais/Discrimination | 🔴 Élevé | 🟡 Moyenne | 🟡 Moyen |
| Contournement consentement | 🔴 Élevé | 🟢 Faible | 🟢 Très faible |
| Accès non autorisé | 🟡 Moyen | 🟢 Faible | 🟢 Très faible |

### 6.2 Acceptabilité du risque
✅ **Risques acceptables** après implémentation mesures (EPICs 1-13).

### 6.3 Validation
- **DPO** : ✅ Validé
- **Date validation** : [DATE]
- **Prochaine révision** : [DATE + 1 an]

---

**Signatures**

**Responsable traitement** : [NOM]  
**DPO** : [NOM]  
**Date** : [DATE]
```

**Backend API Access** :
- `GET /api/docs/dpia` : Lecture DPIA (SUPER_ADMIN/DPO uniquement)
- Fichier source : `docs/rgpd/DPIA_GATEWAY_LLM.md`
- Parser markdown → HTML (library `marked`)
- Response : { title, content (HTML), lastModified }

**Acceptance Criteria** :
- [ ] Document créé : `/docs/rgpd/DPIA_GATEWAY_LLM.md`
- [ ] 5 risques évalués (hallucinations, fuite PII, biais, contournement, accès)
- [ ] Mesures atténuation documentées (EPICs 1-13)
- [ ] Validation DPO (signature)
- [ ] Accessible Super Admin (interface Back Office, lecture seule)
- [ ] API backend `/api/docs/dpia` créée (Super Admin/DPO only)
- [ ] Parser markdown → HTML fonctionnel

**Tests obligatoires** :
- Tests API backend (GET /api/docs/dpia, protection RBAC)
- Tests E2E accès DPIA (Super Admin/DPO uniquement, implémenté dans LOT 11.3)

---

### 3.7 LOT 10.6 — Droits complémentaires (Art. 18, 21, 22)

**Objectif** : Implémenter droits RGPD manquants (limitation, opposition, révision humaine).

**User Stories** :

#### US 10.7 : Droit à la limitation (Art. 18)
**En tant que** Utilisateur  
**Je veux** suspendre temporairement traitement de mes données  
**Afin de** exercer mon droit à la limitation

**Acceptance Criteria** :
- [ ] Bouton "Suspendre mes données" (My Data page)
- [ ] Modal confirmation : "En suspendant, vous ne pourrez plus utiliser IA jusqu'à réactivation"
- [ ] Flag DB : `users.data_suspended = true`
- [ ] Effet : Bloc invocations LLM (HTTP 403)
- [ ] Email confirmation suspension
- [ ] Bouton "Réactiver mes données" (réversible à tout moment)
- [ ] Audit event : `user.data_suspended` / `user.data_reactivated`
- [ ] **Backend endpoints créés** :
  - POST `/api/rgpd/suspend` (user suspend données)
  - POST `/api/rgpd/unsuspend` (user réactive données)
  - GET `/api/tenants/:id/rgpd/suspensions` (Tenant Admin liste suspensions)
- [ ] Middleware Gateway LLM vérifie `data_suspended = true` → HTTP 403

**Backend API** :
- **Art. 18 Limitation** :
  - `POST /api/rgpd/suspend` : Suspendre données user (flag `users.data_suspended = true`)
  - `POST /api/rgpd/unsuspend` : Réactiver données
  - `GET /api/tenants/:id/rgpd/suspensions` : Liste suspensions (Tenant Admin)
  - Effet : Middleware Gateway LLM bloque si `data_suspended = true` → HTTP 403
  - Emails confirmation + audit events
- **Art. 21 Opposition** :
  - `POST /api/rgpd/oppose` : Soumettre opposition traitement
  - `GET /api/rgpd/oppositions` : Liste oppositions user
  - `GET /api/tenants/:id/rgpd/oppositions` : Liste oppositions (Tenant Admin)
  - Table : `user_oppositions` (treatment_type, reason, status)
  - Emails confirmation + audit events
- **Art. 22 Révision humaine** :
  - `POST /api/rgpd/contest` : Contester décision IA
  - `GET /api/rgpd/contests?status=pending|resolved` : Liste contestations user
  - `PATCH /api/rgpd/contests/:id` : Résoudre contestation (Tenant Admin)
  - `GET /api/tenants/:id/rgpd/contests` : Liste contestations (Tenant Admin)
  - Table : `user_disputes` (ai_job_id, reason, attachment_url, status, admin_response)
  - Upload pièces jointes (< 10MB, table `uploaded_files`, chiffré)
  - Emails confirmation/réponse + audit events

---

#### US 10.8 : Droit d'opposition (Art. 21)
**En tant que** Utilisateur  
**Je veux** m'opposer au traitement de mes données si base légale = intérêt légitime  
**Afin de** exercer mon droit d'opposition

**Acceptance Criteria** :
- [ ] Page "Opposition traitement" (My Data)
- [ ] Formulaire :
  - Traitement concerné (dropdown : Analytics, Usage stats)
  - Motif opposition (textarea optionnel)
- [ ] Effet : Suppression données concernées + opt-out futur
- [ ] Email confirmation : "Opposition enregistrée, réponse sous 1 mois"
- [ ] Workflow back-office : Ticket support pour traitement manuel
- [ ] Audit event : `user.opposition_submitted`
- [ ] **Backend endpoints créés** :
  - POST `/api/rgpd/oppose` (user soumet opposition)
  - GET `/api/rgpd/oppositions` (user liste ses oppositions)
  - GET `/api/tenants/:id/rgpd/oppositions` (Tenant Admin liste oppositions)

**Note** : Si tous traitements = consentement opt-in, ce droit est moins pertinent (révocation consentement suffit). À implémenter si ajout traitements intérêt légitime futur (analytics, marketing).

---

#### US 10.9 : Révision humaine décision IA (Art. 22)
**En tant que** Utilisateur  
**Je veux** contester une décision IA et demander révision humaine  
**Afin de** exercer mon droit à ne pas être soumis à décision automatisée

**Acceptance Criteria** :
- [ ] Bouton "Contester ce résultat" (sur outputs IA)
- [ ] Modal formulaire :
  - Job IA concerné (auto-rempli job_id)
  - Motif contestation (textarea obligatoire)
  - Upload preuve (optionnel, fichier < 10MB)
- [ ] Création ticket support : `user_disputes` (job_id, reason, status: pending)
- [ ] Email confirmation : "Contestation enregistrée, révision humaine sous 1 mois"
- [ ] Workflow back-office : Admin voit disputes, révise manuellement, répond
- [ ] Email réponse : "Révision terminée, voici conclusion"
- [ ] Audit event : `user.dispute_submitted` / `admin.dispute_resolved`
- [ ] **Backend endpoints créés** :
  - POST `/api/rgpd/contest` (user conteste décision IA)
  - GET `/api/rgpd/contests?status=pending|resolved` (user liste ses contestations)
  - PATCH `/api/rgpd/contests/:id` (Tenant Admin résout contestation)
  - GET `/api/tenants/:id/rgpd/contests` (Tenant Admin liste contestations tenant)
- [ ] Table `uploaded_files` pour stockage temporaire pièces jointes (< 10MB, chiffré, purge auto 1 mois)

**Implémentation** :
```sql
-- migrations/003_user_disputes.sql
CREATE TABLE user_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  ai_job_id UUID REFERENCES ai_jobs(id),
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, resolved
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

---

## 4. Architecture technique

### 4.1 Structure fichiers (nouveau)

```
docs/
  legal/
    POLITIQUE_CONFIDENTIALITE.md
    CGU.md
  rgpd/
    REGISTRE_TRAITEMENTS.md
    DPIA_GATEWAY_LLM.md

app/
  legal/
    privacy-policy/
      page.tsx               # Politique confidentialité
    terms-of-service/
      page.tsx               # CGU
    rgpd-info/
      page.tsx               # Informations RGPD
    cookie-policy/
      page.tsx               # Politique cookies

src/
  app/
    components/
      CookieConsentBanner.tsx
    usecases/
      suspend-user-data.usecase.ts
      submit-dispute.usecase.ts

migrations/
  003_user_disputes.sql
  004_cgu_versions.sql
```

### 4.2 Base de données (ajouts)

```sql
-- CGU versions
CREATE TABLE cgu_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Acceptations CGU users
CREATE TABLE user_cgu_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  cgu_version_id UUID NOT NULL REFERENCES cgu_versions(id),
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cgu_version_id)
);

-- Disputes users (Art. 22)
CREATE TABLE user_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  ai_job_id UUID REFERENCES ai_jobs(id),
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Suspensions données users (Art. 18)
ALTER TABLE users ADD COLUMN data_suspended BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN data_suspended_at TIMESTAMPTZ;
```

---

## 5. Tests RGPD obligatoires

| Test | Fichier | Objectif |
|------|---------|----------|
| CGU acceptées signup | `rgpd.cgu-acceptance.test.ts` | Checkbox obligatoire |
| Versioning CGU | `rgpd.cgu-versions.test.ts` | Historique versions |
| Cookie banner affiché | `rgpd.cookie-banner.test.ts` | Première visite |
| Blocage scripts refus | `rgpd.cookie-banner.test.ts` | Analytics bloqué si refus |
| Suspension données | `rgpd.data-suspension.test.ts` | LLM bloqué si suspended |
| Réactivation données | `rgpd.data-suspension.test.ts` | LLM débloqué après |
| Dispute IA soumise | `rgpd.dispute-submission.test.ts` | Ticket créé |
| Workflow dispute | `rgpd.dispute-workflow.test.ts` | Admin résout, email envoyé |

**Total** : 8 tests RGPD minimum

---

## 6. Definition of Done (DoD)

### 6.1 Code
- [ ] Politique confidentialité créée (`/docs/legal/POLITIQUE_CONFIDENTIALITE.md`)
- [ ] CGU créées (`/docs/legal/CGU.md`)
- [ ] Page Informations RGPD (`/legal/rgpd-info`)
- [ ] Cookie banner implémenté (`CookieConsentBanner.tsx`)
- [ ] Registre traitements créé (`/docs/rgpd/REGISTRE_TRAITEMENTS.md`)
- [ ] DPIA créée (`/docs/rgpd/DPIA_GATEWAY_LLM.md`)
- [ ] Droits Art. 18/21/22 implémentés (suspension, opposition, disputes)
- [ ] Migrations DB (`cgu_versions`, `user_disputes`, `data_suspended`)

### 6.2 Tests
- [ ] 8 tests RGPD passants (100%)
- [ ] Tests E2E CGU acceptées signup
- [ ] Tests E2E cookie banner (blocage scripts)
- [ ] Tests E2E suspension données (LLM bloqué)
- [ ] Tests E2E workflow disputes (admin résout)
- [ ] `pnpm test` passe (100% tests)

### 6.3 Documentation
- [ ] Politique confidentialité complète (tous articles Art. 13-14)
- [ ] CGU complètes (cadre contractuel)
- [ ] Registre traitements (5 traitements documentés)
- [ ] DPIA (5 risques évalués, validation DPO)
- [ ] README `docs/legal/README.md` (index documents légaux)

### 6.4 Interface
- [ ] Liens footer :
  - Politique de confidentialité
  - CGU
  - Informations RGPD
  - Cookie policy
  - Gérer cookies
- [ ] Pages accessibles (SSG Next.js)
- [ ] Responsive (mobile/desktop)
- [ ] Formulaire contact DPO fonctionnel

### 6.5 Conformité RGPD
- [ ] Art. 13-14 (Information) : ✅ Politique confidentialité + page RGPD
- [ ] Art. 18 (Limitation) : ✅ Suspension données
- [ ] Art. 21 (Opposition) : ✅ Formulaire opposition
- [ ] Art. 22 (Décisions auto) : ✅ Révision humaine
- [ ] Art. 30 (Registre) : ✅ 5 traitements documentés
- [ ] Art. 35 (DPIA) : ✅ Gateway LLM évalué
- [ ] ePrivacy (Cookies) : ✅ Banner opt-in

---

## 7. Risques et mitigation

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Rédaction légale incorrecte | 🔴 Élevé | Moyen | Validation avocat spécialisé RGPD |
| CGU non acceptées (UX friction) | 🟡 Moyen | Élevé | UX claire, checkbox visible |
| Cookie banner bloque analytics | 🟡 Moyen | Élevé | Analytics privacy-friendly (Plausible) |
| Workflow disputes manuel lourd | 🟡 Moyen | Moyen | Automatisation partielle (IA modération) |
| DPIA obsolète | 🟡 Moyen | Faible | Révision annuelle planifiée |

---

## 8. Métriques de succès

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| **Acceptation CGU** | 100% signups | Checkbox obligatoire |
| **Cookie consent rate** | > 70% opt-in analytics | Tracking localStorage |
| **Disputes IA/mois** | < 5 disputes | Monitoring table `user_disputes` |
| **Délai résolution disputes** | < 30 jours | Moyenne (resolved_at - created_at) |
| **Validation DPO** | 100% docs RGPD | Signatures électroniques |

---

## 9. Checklist de livraison

### Phase 1 : LOT 10.0-10.1 (Documents légaux)
- [ ] Rédaction politique confidentialité
- [ ] Rédaction CGU
- [ ] Pages frontend accessibles
- [ ] Liens footer actifs
- [ ] Tests E2E acceptation CGU

### Phase 2 : LOT 10.2-10.3 (Interfaces RGPD)
- [ ] Page Informations RGPD
- [ ] Formulaire contact DPO
- [ ] Cookie consent banner
- [ ] Tests E2E cookie banner

### Phase 3 : LOT 10.4-10.5 (Conformité interne)
- [ ] Registre traitements documenté
- [ ] DPIA réalisée et validée DPO
- [ ] Interfaces Back Office (accès registre/DPIA)

### Phase 4 : LOT 10.6 (Droits complémentaires)
- [ ] Suspension données (Art. 18)
- [ ] Formulaire opposition (Art. 21)
- [ ] Workflow disputes (Art. 22)
- [ ] Tests E2E droits complémentaires

---

**Document créé le 25 décembre 2025**  
**Version 1.0**  
**Auteur** : Équipe Plateforme RGPD-IA
