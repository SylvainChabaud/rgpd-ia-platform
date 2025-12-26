# Runbook — Incident RGPD (Art. 33-34)

> **Document opérationnel** : Procédure de gestion des violations de données personnelles (data breach).
>
> **Base légale** : Articles 33-34 RGPD
> - Art. 33 : Notification CNIL (72h si risque pour droits et libertés)
> - Art. 34 : Communication aux personnes concernées (si risque élevé)
>
> **Dernière mise à jour** : 2025-12-25
> **Responsable** : DPO + RSSI

---

## 1. Définition d'un incident RGPD

### Qu'est-ce qu'une violation de données ?

Selon l'Art. 4(12) RGPD, une **violation de données** est :
> "une violation de la sécurité entraînant, de manière accidentelle ou illicite, la destruction, la perte, l'altération, la divulgation non autorisée de données à caractère personnel transmises, conservées ou traitées d'une autre manière, ou l'accès non autorisé à de telles données."

### Types de violations

| Type | Exemples | Gravité initiale |
|------|----------|------------------|
| **Confidentialité** | Accès non autorisé, fuite de données, exfiltration | 🔴 Élevée |
| **Intégrité** | Modification non autorisée, corruption de données | 🟡 Moyenne |
| **Disponibilité** | Perte de données, ransomware, destruction | 🔴 Élevée |

---

## 2. Détection automatique des incidents

### 2.1 Alertes monitoring configurées

Les alertes suivantes déclenchent **automatiquement** une investigation (cf. EPIC 6, LOT 6.1) :

| Alerte | Seuil | Gravité | Action automatique |
|--------|-------|---------|-------------------|
| **Brute force login** | > 10 échecs / 5 min (même IP) | 🟡 Moyenne | Blocage IP + notification DevOps |
| **Cross-tenant access** | ANY tentative | 🔴 Critique | Blocage immédiat + escalade DPO |
| **Export massif** | > 10 000 records/h (même user) | 🟡 Moyenne | Throttling + notification admin tenant |
| **PII détectée logs** | ANY détection | 🟡 Moyenne | Alerte DevOps + rapport hebdo (EPIC 11, LOT 11.2) |
| **Backup failure** | 2× consécutifs | 🟡 Moyenne | Alerte RSSI + investigation |
| **Accès DB externe** | ANY connexion hors VPC | 🔴 Critique | Blocage firewall + escalade immédiate |
| **Modification schéma DB** | ANY DDL non approuvé | 🔴 Critique | Rollback + escalade DPO |

### 2.2 Détection manuelle

Sources de détection :
- Utilisateur signale un incident (formulaire contact DPO)
- Admin tenant constate anomalie (Back Office)
- DevOps détecte anomalie logs/metrics
- Audit externe (pentest, CNIL)

---

## 3. Workflow de gestion d'incident (timeline)

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│ DÉTECTION → ÉVALUATION → CONTAINMENT → NOTIFICATION → CLÔTURE │
│   T+0       T+1h          T+2h          T+72h         T+7j    │
└─────────────────────────────────────────────────────────────┘
```

### Timeline critique

| Heure | Étape | Responsable | Actions |
|-------|-------|-------------|---------|
| **T+0** | 🚨 Détection | Alerte auto / Humain | Notification équipe astreinte |
| **T+30min** | 📋 Évaluation initiale | DevOps + DPO | Classification incident (cf. §4) |
| **T+1h** | 🛡️ Containment | DevOps + RSSI | Isolation périmètre affecté |
| **T+2h** | 🔍 Investigation | DevOps + RSSI | Analyse logs, identification cause |
| **T+6h** | 📊 Rapport préliminaire | DPO | Évaluation risque personnes concernées |
| **T+24h** | 📝 Décision notification | DPO + Direction | Notification CNIL si risque (Art. 33) |
| **T+72h** | 📧 Notification CNIL | DPO | **DEADLINE Art. 33.1** |
| **T+72h** | 📧 Notification personnes | DPO | Si risque élevé (Art. 34) |
| **T+7j** | 🔒 Rapport final | DPO + RSSI | Clôture incident, actions correctives |

---

## 4. Évaluation et classification de l'incident

### 4.1 Grille d'évaluation des risques

Utiliser la grille suivante pour déterminer le **niveau de risque** pour les droits et libertés :

#### Critère 1 : Type de données affectées

| Catégories de données | Points |
|-----------------------|--------|
| P0 (IDs techniques) | 1 |
| P1 (email, nom, hash password) | 2 |
| P2 (metadata jobs IA, IP) | 3 |
| P3 (santé, opinions, données sensibles) | **5** |

#### Critère 2 : Volume de personnes concernées

| Volume | Points |
|--------|--------|
| 1-10 personnes | 1 |
| 11-100 personnes | 2 |
| 101-1000 personnes | 3 |
| > 1000 personnes | **4** |

#### Critère 3 : Type de violation

| Type | Points |
|------|--------|
| Disponibilité (perte temporaire) | 1 |
| Intégrité (modification détectée) | 2 |
| Confidentialité (accès interne non autorisé) | 3 |
| Exfiltration externe (fuite publique) | **4** |

#### Critère 4 : Mesures de sécurité contournées

| Mesures contournées | Points |
|---------------------|--------|
| Aucune (erreur config) | 1 |
| Chiffrement transit (TLS) | 2 |
| Chiffrement repos (AES-256) | 3 |
| Isolation tenant (cross-tenant) | **4** |

### 4.2 Calcul du score de risque

**Score total** = Critère 1 + Critère 2 + Critère 3 + Critère 4

| Score | Niveau de risque | Action requise |
|-------|------------------|----------------|
| 4-6 | 🟢 **Faible** | Documentation interne, pas de notification CNIL |
| 7-10 | 🟡 **Moyen** | Évaluation DPO, notification CNIL si aggravant |
| 11-14 | 🟠 **Élevé** | **Notification CNIL obligatoire (Art. 33)** |
| 15-17 | 🔴 **Critique** | **Notification CNIL + personnes (Art. 33-34)** |

### 4.3 Exemples de classification

#### Exemple 1 : Brute force bloqué automatiquement
- **Données** : P0 (1 pt)
- **Volume** : 1 personne (1 pt)
- **Type** : Confidentialité (tentative bloquée) (1 pt)
- **Mesures** : Aucune contournée (1 pt)
- **Score** : **4/17** → 🟢 **Faible** — Pas de notification CNIL

#### Exemple 2 : Export massif accidentel (admin tenant)
- **Données** : P1 (email, nom) (2 pts)
- **Volume** : 500 personnes (3 pts)
- **Type** : Confidentialité (accès interne) (3 pts)
- **Mesures** : Isolation tenant OK (1 pt)
- **Score** : **9/17** → 🟡 **Moyen** — Évaluation DPO, notification probable

#### Exemple 3 : Accès cross-tenant (bug)
- **Données** : P1 + P2 (métadonnées jobs IA) (3 pts)
- **Volume** : 200 personnes (3 pts)
- **Type** : Confidentialité (accès interne) (3 pts)
- **Mesures** : Isolation tenant contournée (4 pts)
- **Score** : **13/17** → 🟠 **Élevé** — **Notification CNIL obligatoire**

#### Exemple 4 : Exfiltration DB publique (ransomware)
- **Données** : P1 + P2 (tous users) (3 pts)
- **Volume** : > 10 000 personnes (4 pts)
- **Type** : Exfiltration externe (4 pts)
- **Mesures** : Chiffrement repos contourné (3 pts)
- **Score** : **14/17** → 🟠 **Élevé** → **Notification CNIL + personnes**

---

## 5. Actions de containment (T+1h)

### 5.1 Checklist immédiate

- [ ] **Isoler le périmètre affecté** (bloquer IP, désactiver compte, fermer endpoint)
- [ ] **Préserver les preuves** (snapshot DB, logs, dumps réseau)
- [ ] **Stopper la fuite** (rotation secrets, révocation tokens JWT)
- [ ] **Documenter actions** (registre incident, timestamps)
- [ ] **Notifier équipe astreinte** (DPO, RSSI, DevOps)

### 5.2 Actions par type de violation

#### Confidentialité (accès non autorisé)

- [ ] Identifier périmètre données accédées (tenant_id, user_id, tables)
- [ ] Bloquer compte compromis (status = suspended)
- [ ] Révoquer sessions actives (JWT blacklist)
- [ ] Forcer reset password (si credential compromise)
- [ ] Audit trail complet (qui, quoi, quand, comment)

#### Intégrité (modification non autorisée)

- [ ] Identifier données modifiées (diff DB, logs audit)
- [ ] Restaurer depuis backup (PITR, < 1h RPO)
- [ ] Vérifier intégrité backup (checksums)
- [ ] Bloquer vecteur d'attaque (patch vuln, WAF rule)

#### Disponibilité (perte de données)

- [ ] Activer procédure disaster recovery (cf. [backup-policy.md](./backup-policy.md))
- [ ] Restaurer DB depuis backup (RTO < 4h)
- [ ] Vérifier data loss (RPO < 1h)
- [ ] Communiquer indisponibilité (status page, email admins)

---

## 6. Notification CNIL (Art. 33)

### 6.1 Obligation de notification

**Notification CNIL obligatoire si** :
- Score de risque ≥ 11/17 (Élevé ou Critique)
- OU violation susceptible d'engendrer un risque pour droits et libertés

**Délai** : **72 heures** après avoir eu connaissance de la violation (Art. 33.1)

### 6.2 Contenu de la notification (Art. 33.3)

Utiliser le template [NOTIFICATION_CNIL.md](../templates/NOTIFICATION_CNIL.md) avec :

1. **Nature de la violation** :
   - Description circonstances
   - Catégories de personnes concernées (estimation nombre)
   - Catégories de données concernées (P0/P1/P2/P3)

2. **Contact DPO** :
   - Nom, email, téléphone

3. **Conséquences probables** :
   - Risques pour droits et libertés (usurpation identité, discrimination, etc.)

4. **Mesures prises ou envisagées** :
   - Containment (isolation, rotation secrets)
   - Remédiation (patch, correction bug)
   - Atténuation (notification personnes, assistance)

### 6.3 Procédure de notification

1. **Préparer le dossier** (DPO + RSSI) :
   - Formulaire CNIL : [https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles](https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles)
   - Remplir template [NOTIFICATION_CNIL.md](../templates/NOTIFICATION_CNIL.md)
   - Joindre preuves (logs anonymisés, rapport technique)

2. **Soumettre notification** :
   - Plateforme CNIL : [notifications.cnil.fr](https://notifications.cnil.fr/)
   - Email : [notifications@cnil.fr](mailto:notifications@cnil.fr)
   - Conserver accusé de réception

3. **Enregistrer incident** :
   - Table DB `data_breaches` (registre Art. 33.5)
   - Interface Back Office : [/admin/data-breaches](../../src/app/admin/data-breaches/)

---

## 7. Communication aux personnes concernées (Art. 34)

### 7.1 Obligation de communication

**Communication obligatoire si** :
- Score de risque ≥ 15/17 (Critique)
- OU violation engendre un **risque élevé** pour droits et libertés

**Délai** : **Sans délai indu** (dans les meilleurs délais après détection)

### 7.2 Exemptions (Art. 34.3)

Pas de communication aux personnes si :
- **Mesures techniques appropriées** (ex: chiffrement AES-256, clés non compromises)
- **Mesures ultérieures** rendant le risque improbable (ex: blocage attaquant)
- **Communication disproportionnée** (ex: > 10 000 personnes) → communication publique

### 7.3 Contenu de la communication (Art. 34.2)

Utiliser le template [NOTIFICATION_USERS.md](../templates/NOTIFICATION_USERS.md) avec :

1. **Nature de la violation** (langage clair, non technique)
2. **Contact DPO** (nom, email, téléphone)
3. **Conséquences probables** pour la personne
4. **Mesures prises** (sécurisation, correction)
5. **Mesures recommandées** pour la personne (ex: changer password, surveiller comptes)

### 7.4 Canaux de communication

- **Email principal** : notification individuelle (recommandé)
- **Interface app** : bannière d'alerte (notification in-app)
- **Communication publique** : page status, blog, presse (si > 10 000 personnes)

---

## 8. Investigation et remédiation (T+2h → T+7j)

### 8.1 Investigation technique

#### Checklist investigation

- [ ] **Collecter logs** :
  - Logs applicatifs (90 jours)
  - Audit events (filtré par période incident)
  - Logs infrastructure (firewall, load balancer)
  - Logs DB (requêtes, connexions)

- [ ] **Analyser chronologie** :
  - Première occurrence (timestamp exact)
  - Vecteur d'attaque (comment ?)
  - Périmètre affecté (quoi ?)
  - Durée d'exposition (combien de temps ?)

- [ ] **Identifier cause racine** :
  - Bug applicatif (code, config)
  - Vulnérabilité (CVE, OWASP Top 10)
  - Erreur humaine (mauvaise manip admin)
  - Attaque externe (intrusion, phishing)

### 8.2 Actions correctives

- [ ] **Correction immédiate** (hotfix) :
  - Patch vulnérabilité
  - Correction bug
  - Révocation accès compromis

- [ ] **Correction structurelle** (post-mortem) :
  - Refactoring code vulnérable
  - Renforcement tests (régression)
  - Amélioration monitoring (nouvelles alertes)
  - Formation équipe (si erreur humaine)

- [ ] **Tests validation** :
  - Tests unitaires (bug corrigé)
  - Tests d'intégration (régression)
  - Pentest ciblé (vulnérabilité)

### 8.3 Documentation post-mortem

Créer un rapport final incluant :

1. **Chronologie détaillée** (timeline complète)
2. **Cause racine** (RCA, 5 Why's)
3. **Impact réel** (nombre personnes, données, durée)
4. **Actions correctives** (immédiates + structurelles)
5. **Actions préventives** (éviter récurrence)
6. **Leçons apprises** (feedback équipe)

---

## 9. Registre des violations (Art. 33.5)

### 9.1 Obligation de tenue du registre

L'Art. 33.5 RGPD impose de **documenter toute violation** dans un registre, même si pas notifiée à la CNIL.

### 9.2 Implémentation technique

**Table DB** : `data_breaches` (cf. EPIC 13, LOT 13.0)

```sql
CREATE TABLE data_breaches (
  id UUID PRIMARY KEY,
  detected_at TIMESTAMPTZ NOT NULL,
  reported_at TIMESTAMPTZ,
  breach_type TEXT NOT NULL, -- confidentiality, integrity, availability
  severity TEXT NOT NULL, -- low, medium, high, critical
  risk_score INTEGER NOT NULL, -- 4-17
  categories_data TEXT[] NOT NULL, -- P0, P1, P2, P3
  persons_affected INTEGER NOT NULL,
  description TEXT NOT NULL,
  containment_actions TEXT,
  remediation_actions TEXT,
  cnil_notified BOOLEAN DEFAULT FALSE,
  cnil_notification_date TIMESTAMPTZ,
  persons_notified BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL, -- open, investigating, closed
  closed_at TIMESTAMPTZ,
  post_mortem_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9.3 Interface Back Office

Accessible uniquement aux **Super Admins** et **DPO** :

- **Liste incidents** : `/admin/data-breaches` (filtrable par date, gravité, statut)
- **Créer incident** : `/admin/data-breaches/new` (formulaire guidé)
- **Détails incident** : `/admin/data-breaches/:id` (chronologie, actions, documents)
- **Export CSV** : bouton export (audit CNIL)

---

## 10. Templates de notification

### 10.1 Template notification CNIL

Localisation : [docs/templates/NOTIFICATION_CNIL.md](../templates/NOTIFICATION_CNIL.md)

Contenu : Formulaire pré-rempli conforme Art. 33.3

### 10.2 Template notification utilisateurs

Localisation : [docs/templates/NOTIFICATION_USERS.md](../templates/NOTIFICATION_USERS.md)

Contenu : Email type + bannière in-app

---

## 11. Contacts d'urgence

| Rôle | Nom | Email | Téléphone | Disponibilité |
|------|-----|-------|-----------|---------------|
| **DPO** | [À renseigner] | dpo@example.com | [À renseigner] | 24/7 astreinte |
| **RSSI** | [À renseigner] | rssi@example.com | [À renseigner] | 24/7 astreinte |
| **DevOps Lead** | [À renseigner] | devops@example.com | [À renseigner] | 24/7 astreinte |
| **Direction** | [À renseigner] | direction@example.com | [À renseigner] | Heures bureau |
| **CNIL** | — | notifications@cnil.fr | +33 1 53 73 22 22 | Heures bureau |

---

## 12. Checklist récapitulative

### Phase 1 : Détection (T+0 → T+30min)

- [ ] Alerte reçue (auto ou manuelle)
- [ ] Équipe astreinte notifiée (DPO + RSSI + DevOps)
- [ ] Incident créé dans registre (table `data_breaches`)

### Phase 2 : Évaluation (T+30min → T+1h)

- [ ] Grille d'évaluation complétée (score risque calculé)
- [ ] Classification incident (Faible/Moyen/Élevé/Critique)
- [ ] Décision notification CNIL prise (si score ≥ 11)

### Phase 3 : Containment (T+1h → T+2h)

- [ ] Périmètre isolé (blocage IP, compte, endpoint)
- [ ] Preuves préservées (snapshots, logs)
- [ ] Fuite stoppée (rotation secrets, révocation tokens)

### Phase 4 : Investigation (T+2h → T+6h)

- [ ] Logs collectés et analysés
- [ ] Chronologie établie
- [ ] Cause racine identifiée

### Phase 5 : Notification (T+6h → T+72h)

- [ ] Rapport préliminaire DPO (T+6h)
- [ ] Notification CNIL (T+72h max si obligatoire)
- [ ] Notification personnes (T+72h si risque élevé)

### Phase 6 : Remédiation (T+72h → T+7j)

- [ ] Hotfix déployé (correction immédiate)
- [ ] Tests régression passants
- [ ] Actions correctives structurelles planifiées

### Phase 7 : Clôture (T+7j)

- [ ] Rapport post-mortem rédigé
- [ ] Incident fermé dans registre
- [ ] Leçons apprises partagées (équipe)

---

## Références

- **RGPD** : [Articles 33-34](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- **CNIL Guide Violations** : [https://www.cnil.fr/fr/violations-de-donnees-personnelles](https://www.cnil.fr/fr/violations-de-donnees-personnelles)
- **Registre des traitements** : [registre-traitements.md](../rgpd/registre-traitements.md)
- **DPIA Gateway LLM** : [dpia.md](../rgpd/dpia.md)
- **Backup policy** : [backup-policy.md](./backup-policy.md)
- **EPIC 9 — Incident Response** : [TASKS.md](../../TASKS.md#epic-9)
