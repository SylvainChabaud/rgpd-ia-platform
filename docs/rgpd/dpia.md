# DPIA — Analyse d'Impact Gateway LLM (Art. 35 RGPD)

> **Document normatif** : Analyse d'impact relative à la protection des données (DPIA) pour le traitement "Invocation Gateway LLM (IA)".
>
> **Base légale** : Article 35 RGPD (obligation si risque élevé pour droits et libertés)
>
> **Date de réalisation** : 2025-12-25
> **Validé par** : [DPO à renseigner]
> **Prochaine révision** : 2026-12-25 (annuelle ou si modification majeure)

---

## Résumé exécutif

### Traitement concerné
**Invocation Gateway LLM** — Service d'analyse de documents par intelligence artificielle (résumé, classification, extraction de données structurées).

### Risque global
🟡 **MOYEN** (après mesures d'atténuation)

### Principales mesures d'atténuation
- Gateway LLM obligatoire (point unique, bypass impossible)
- Consentement explicite par purpose (Art. 6.1.a, 7 RGPD)
- Pas de persistance prompts/outputs par défaut (stateless)
- ✅ **Pseudonymisation PII** (EPIC 8 LOT 8.0) — Implémenté
  - Détection automatique EMAIL, PHONE, PERSON, SSN, IBAN
  - Masking reversible token-based
  - 110 tests passing (100% coverage)
- Audit trail complet RGPD-safe
- Droit à révision humaine (Art. 22)

---

## 1. Description systématique du traitement

### 1.1 Nature du traitement

| Élément | Description |
|---------|-------------|
| **Finalité** | Fournir des services d'analyse documentaire par IA (résumé, classification, extraction) |
| **Catégories de données** | P0 (IDs techniques), P1 (hash inputs), P2 temporaire (input/output texte, non persisté) |
| **Catégories de personnes** | Membres tenants ayant consenti (utilisateurs finaux) |
| **Volume** | ~1000-10000 requêtes/mois par tenant (estimation) |
| **Fréquence** | À la demande (actions utilisateur) |
| **Durée** | Métadonnées : 90 jours max, Prompts/outputs : non persistés |

### 1.2 Architecture technique

```
[ User Frontend ]
       ↓ HTTPS (TLS 1.3)
[ Next.js API Routes ]
       ↓ RequestContext (tenant, user, permissions)
[ Use-cases applicatifs ]
       ↓ Consent check (enforcement)
[ Gateway LLM ] ← POINT UNIQUE OBLIGATOIRE
       ↓ Redaction PII (EPIC 8)
       ↓ Prompt sanitization
[ Runtime IA ] (local ou externe, stateless)
       ↓ Inférence uniquement
[ Response ] → Output (non persisté par défaut)
```

### 1.3 Technologies utilisées

| Composant | Technologie | Localisation | Garanties |
|-----------|-------------|--------------|-----------|
| Gateway LLM | TypeScript (Next.js) | Serveur UE | Chiffrement TLS 1.3, audit trail |
| Runtime IA (local) | Ollama | Serveur local (même serveur) | Stateless, pas de stockage, aucun flux sortant |
| Base de données | PostgreSQL | Serveur UE | Chiffrement au repos (AES-256-GCM) |

### 1.4 Acteurs

| Acteur | Rôle | Responsabilité RGPD |
|--------|------|---------------------|
| [Organisation] | Responsable de traitement | Art. 24 RGPD (mesures techniques et organisationnelles) |
| Utilisateurs finaux (membres tenants) | Personnes concernées | Exercice des droits (Art. 15-22) |
| Admins tenants | Responsables de traitement (délégation) | Gestion consentements, demandes RGPD tenant |
| Hébergeur infrastructure | Sous-traitant | Art. 28 RGPD (contrat DPA) |

---

## 2. Nécessité et proportionnalité

### 2.1 Nécessité du traitement

#### Objectif légitime
Fournir un service d'analyse documentaire automatisée pour :
- **Avocats** : résumé de jurisprudence, extraction clauses contractuelles
- **Médecins** : classification pathologies (données santé exclues, cf. limitations)
- **Comptables** : extraction données factures, classification comptable

#### Alternatives évaluées

| Alternative | Faisabilité | Raison du rejet |
|-------------|-------------|-----------------|
| Traitement manuel (humain) | Possible | Trop lent, coûteux, non scalable |
| IA côté client (browser) | Limitée | Modèles trop lourds, performances insuffisantes |
| Pas de traitement IA | Possible | Réduit drastiquement la valeur du service |

**Conclusion** : Le traitement IA est **nécessaire** pour fournir le service contractuel.

### 2.2 Proportionnalité

#### Minimisation des données (Art. 5.1.c)
- ✅ **P3 (santé, opinions) INTERDITES** par défaut (classification stricte)
- ✅ **Prompts/outputs NON PERSISTÉS** (sauf opt-in explicite utilisateur)
- ✅ Métadonnées uniquement : job_id, purpose, status, latency (P0-P1)
- ✅ Hash inputs (SHA-256) au lieu de stockage texte brut

#### Limitation des finalités (Art. 5.1.b)
- ✅ Purpose explicite requis (résumé, classification, extraction)
- ✅ Pas de réutilisation hors purpose consenti
- ✅ Pas de training modèles sur données utilisateurs (contrat DPA)

#### Limitation de conservation (Art. 5.1.e)
- ✅ Métadonnées jobs : **90 jours max** (purge automatique)
- ✅ Prompts/outputs : **non persistés** (stateless)
- ✅ Consentements : durée contrat + 3 ans (preuve Art. 7.1)

**Conclusion** : Le traitement respecte le principe de **proportionnalité**.

---

## 3. Évaluation des risques

### Méthodologie
- **Impact** : Faible (1) → Moyen (2) → Élevé (3) → Critique (4)
- **Vraisemblance** : Faible (1) → Moyen (2) → Élevé (3) → Critique (4)
- **Risque brut** : Impact × Vraisemblance
- **Risque résiduel** : après mesures d'atténuation

---

### Risque 1 : Hallucinations et erreurs de l'IA

#### Description
L'IA peut générer des outputs incorrects, trompeurs ou incohérents (hallucinations), conduisant à des décisions erronées par l'utilisateur.

#### Personnes concernées
Membres tenants utilisant les résultats IA pour des décisions importantes (juridique, médical, comptable).

#### Impact
- **Dommage potentiel** : Décision juridique erronée, erreur comptable, mauvais diagnostic
- **Gravité** : 🟡 **Moyen (2)** — Impact professionnel/financier possible

#### Vraisemblance
🟡 **Moyen (2)** — Les LLMs ont un taux d'erreur connu (5-15% selon tâches)

#### Risque brut
🟡 **4/16 (Moyen)**

#### Mesures d'atténuation
1. **Avertissement explicite** : Disclaimer "L'IA peut commettre des erreurs, vérifiez les résultats"
2. **Droit à révision humaine** (Art. 22 RGPD) : Bouton "Contester ce résultat" → workflow admin
3. **Metadata transparence** : Affichage modèle utilisé, latence, confidence score (si disponible)
4. **Pas de décision automatisée critique** : L'IA assiste uniquement, décision finale = humain

#### Risque résiduel
🟢 **Faible (2/16)** — Impact réduit par validation humaine obligatoire

---

### Risque 2 : Fuite de données personnelles (PII) vers le modèle IA

#### Description
L'utilisateur upload un document contenant des PII (noms, emails, téléphones) qui sont envoyées au modèle IA (local ou externe), risque de fuite si :
- Modèle externe conserve les données (violation contrat DPA)
- Logs/monitoring du fournisseur LLM capturent les prompts

#### Personnes concernées
Membres tenants + **tiers mentionnés dans documents** (clients, patients, salariés)

#### Impact
- **Dommage potentiel** : Fuite PII, usurpation d'identité, RGPD breach
- **Gravité** : 🔴 **Élevé (3)** — Violation RGPD Art. 5.1.f (sécurité)

#### Vraisemblance
🟡 **Moyen (2)** — Dépend du respect contrat DPA par fournisseur LLM

#### Risque brut
🔴 **6/16 (Élevé)**

#### Mesures d'atténuation
1. **Contrat DPA strict** : Clause "pas de stockage, pas de training, suppression immédiate"
2. ✅ **Pseudonymisation PII** (EPIC 8 LOT 8.0) — **IMPLÉMENTÉ**
   - Détection automatique : EMAIL, PHONE, PERSON, SSN, IBAN
   - Masking token-based : `Jean Dupont` → `[PERSON_1]` avant LLM
   - Restauration après réponse : `[PERSON_1]` → `Jean Dupont`
   - Mappings memory-only (purged after request)
   - Performance: <50ms SLA (110 tests passing)
3. **Préférence modèle local** : Déploiement on-premise (pas de transfert externe)
4. ✅ **Audit trail PII** : Événement `llm.pii_detected` (types/counts only, NO values)
5. ✅ **Tests automatisés** : Scan PII dans logs (EPIC 8 LOT 8.2, cron quotidien 4h AM)
   - Alertes par sévérité (CRITICAL, WARNING, INFO)
   - 10 tests passing

#### Risque résiduel
🟡 **Moyen (3/16)** — Risque réduit mais non nul (fournisseur externe)

---

### Risque 3 : Biais et discrimination (Art. 22 RGPD)

#### Description
Les modèles IA peuvent reproduire des biais présents dans leurs données d'entraînement (genre, origine ethnique, âge), conduisant à des outputs discriminatoires.

#### Personnes concernées
Membres tenants + **tiers mentionnés dans documents**

#### Impact
- **Dommage potentiel** : Discrimination indirecte (ex: classification biaisée de CV, résumé partiel)
- **Gravité** : 🟡 **Moyen (2)** — Risque de discrimination

#### Vraisemblance
🟡 **Moyen (2)** — Les LLMs ont des biais documentés

#### Risque brut
🟡 **4/16 (Moyen)**

#### Mesures d'atténuation
1. **Choix modèles audités** : Préférence modèles open-source avec documentation biais
2. **Transparence modèle** : Affichage modèle utilisé + version
3. **Droit à révision humaine** (Art. 22) : Contestation résultats via formulaire
4. **Pas de décision automatisée critique** : L'IA assiste, l'humain décide
5. **Monitoring outputs** : Alertes si détection patterns discriminatoires (futur)

#### Risque résiduel
🟢 **Faible (2/16)** — Validation humaine obligatoire

---

### Risque 4 : Contournement du consentement

#### Description
Un utilisateur accède au service IA sans avoir donné son consentement explicite (bypass technique ou bug).

#### Personnes concernées
Membres tenants

#### Impact
- **Dommage potentiel** : Traitement illicite (Art. 6 RGPD), sanction CNIL
- **Gravité** : 🟡 **Moyen (2)** — Violation RGPD, faible impact utilisateur direct

#### Vraisemblance
🟢 **Faible (1)** — Enforcement automatisé + tests

#### Risque brut
🟡 **2/16 (Faible)**

#### Mesures d'atténuation
1. **Enforcement Gateway LLM** : Refus HTTP 403 si consent absent/révoqué
2. **Tests automatisés** : `tests/rgpd/consent-enforcement.test.ts` (CI/CD gate)
3. **Popup consentement** : 1ère utilisation du purpose → modal explicite
4. **Audit trail** : Événement `consent.granted`, `consent.revoked`, `llm.invoke.denied`

#### Risque résiduel
🟢 **Très faible (1/16)** — Risque technique maîtrisé

---

### Risque 5 : Accès non autorisé aux métadonnées IA (cross-tenant)

#### Description
Un utilisateur tenant A accède aux métadonnées jobs IA d'un tenant B (bug isolation).

#### Personnes concernées
Membres tenants

#### Impact
- **Dommage potentiel** : Fuite métadonnées (purposes utilisés, fréquence), espionnage commercial
- **Gravité** : 🟡 **Moyen (2)** — Violation confidentialité

#### Vraisemblance
🟢 **Faible (1)** — Isolation DB stricte + tests automatisés

#### Risque brut
🟡 **2/16 (Faible)**

#### Mesures d'atténuation
1. **Isolation DB stricte** : `tenant_id` obligatoire sur toutes requêtes
2. **Tests automatisés** : `tests/rgpd/cross-tenant.test.ts` (rejet garanti)
3. **Middleware tenant resolution** : Rejet si tenant absent (HTTP 403)
4. **Audit accès** : Événement `access.denied.cross_tenant` → alerte DevOps

#### Risque résiduel
🟢 **Très faible (1/16)** — Risque technique maîtrisé

---

### Synthèse des risques

| Risque | Impact | Vraisemblance | Risque brut | Risque résiduel | Priorité |
|--------|--------|---------------|-------------|-----------------|----------|
| 1. Hallucinations IA | 2 | 2 | 🟡 4/16 | 🟢 2/16 | Moyenne |
| 2. Fuite PII vers LLM | 3 | 2 | 🔴 6/16 | 🟡 3/16 | **Haute** |
| 3. Biais et discrimination | 2 | 2 | 🟡 4/16 | 🟢 2/16 | Moyenne |
| 4. Bypass consentement | 2 | 1 | 🟡 2/16 | 🟢 1/16 | Faible |
| 5. Accès cross-tenant | 2 | 1 | 🟡 2/16 | 🟢 1/16 | Faible |

**Risque global résiduel** : 🟡 **MOYEN (3/16 max)** — Acceptable avec mesures d'atténuation

---

## 4. Mesures d'atténuation (récapitulatif)

### 4.1 Mesures techniques

| Mesure | EPIC/LOT | Statut | Efficacité |
|--------|----------|--------|------------|
| Gateway LLM obligatoire (bypass impossible) | EPIC 1, LOT 1.4 | ✅ Implémenté | Élevée |
| Consent enforcement automatisé | EPIC 5, LOT 5.0 | ✅ Implémenté | Élevée |
| Pas de persistance prompts/outputs | EPIC 3, LOT 3.0 | ✅ Implémenté | Élevée |
| ✅ **Pseudonymisation PII** (détection + masking) | **EPIC 8, LOT 8.0** | **✅ Implémenté** | **Élevée** |
| ✅ **Anonymisation IP** (cron quotidien) | **EPIC 8, LOT 8.1** | **✅ Implémenté** | **Moyenne** |
| Isolation multi-tenant stricte | EPIC 1, LOT 1.1 | ✅ Implémenté | Élevée |
| Chiffrement TLS 1.3 (transit) | EPIC 2, LOT 2.0 | ✅ Implémenté | Élevée |
| Audit trail RGPD-safe | EPIC 1, LOT 1.3 | ✅ Implémenté | Moyenne |
| ✅ **Scan PII logs automatisé** (cron quotidien) | **EPIC 8, LOT 8.2** | **✅ Implémenté** | **Moyenne** |
| Tests automatisés (consent, isolation, PII) | EPIC 1-8 | ✅ Implémenté | Élevée |

### 4.2 Mesures organisationnelles

| Mesure | Responsable | Fréquence | Efficacité |
|--------|-------------|-----------|------------|
| Contrat DPA fournisseur LLM | DPO + Juridique | Avant activation | **Critique** |
| Formation admins tenants (RGPD, consentements) | DPO | Onboarding + annuelle | Moyenne |
| Audit annuel conformité RGPD | DPO externe | Annuelle | Élevée |
| Revue incidents RGPD (Art. 33-34) | DPO + DevOps | Trimestrielle | Moyenne |
| Tests pentests externes | RSSI | Annuelle (EPIC 13, LOT 13.1) | Élevée |

### 4.3 Mesures juridiques

| Mesure | Document | Statut |
|--------|----------|--------|
| Consentement explicite utilisateurs | Popup consent + CGU | ✅ Implémenté |
| Politique de confidentialité (Art. 13-14) | [docs/legal/POLITIQUE_CONFIDENTIALITE.md](../legal/) | ⏳ EPIC 12, LOT 12.0 |
| CGU (base légale contrat Art. 6.1.b) | [docs/legal/CGU.md](../legal/) | ⏳ EPIC 12, LOT 12.1 |
| Page "Informations RGPD" (DPO, droits) | [/legal/rgpd-info](../legal/) | ⏳ EPIC 12, LOT 12.2 |
| Registre des traitements (Art. 30) | [registre-traitements.md](./registre-traitements.md) | ✅ EPIC 7, LOT 7.0 |
| DPIA Gateway LLM (Art. 35) | Ce document | ✅ EPIC 7, LOT 7.0 |
| Runbook incident RGPD (Art. 33-34) | [incident.md](../runbooks/incident.md) | ⏳ EPIC 7, LOT 7.0 |

---

## 5. Droits des personnes (Art. 15-22 RGPD)

| Droit | Implémentation | Délai | Références |
|-------|----------------|-------|-----------|
| **Accès** (Art. 15) | `/api/rgpd/export` (métadonnées jobs IA incluses) | Immédiat | LOT 5.1 |
| **Rectification** (Art. 16) | N/A (métadonnées techniques non modifiables) | N/A | — |
| **Effacement** (Art. 17) | `/api/rgpd/delete` (suppression métadonnées jobs) | Immédiat (soft delete) | LOT 5.2 |
| **Portabilité** (Art. 20) | `/api/rgpd/export` (format JSON structuré) | Immédiat | LOT 5.1 |
| **Opposition** (Art. 21) | Formulaire contact DPO | 1 mois max | EPIC 12, LOT 12.2 |
| **Limitation** (Art. 18) | Bouton "Suspendre mes données" (blocage LLM) | Immédiat | EPIC 12, LOT 12.6 |
| **Révision humaine** (Art. 22) | Formulaire "Contester ce résultat" | 1 mois max | EPIC 12, LOT 12.6 |
| **Réclamation** (Art. 77) | Contact DPO + lien CNIL | N/A | EPIC 12, LOT 12.2 |

---

## 6. Consultations

### Consultation du DPO
✅ **Obligatoire** (Art. 35.2 RGPD)

**Date** : [À renseigner]
**DPO** : [Nom à renseigner]
**Avis** : [À renseigner]

### Consultation des personnes concernées
⏳ **Recommandée** (Art. 35.9 RGPD)

**Méthode prévue** : Questionnaire satisfaction utilisateurs (post-déploiement)
**Éléments consultés** : Transparence IA, utilité service, confiance données

---

## 7. Validation et suivi

### Approbation

| Rôle | Nom | Date | Signature |
|------|-----|------|-----------|
| DPO | [À renseigner] | [À renseigner] | [À renseigner] |
| Responsable de traitement | [À renseigner] | [À renseigner] | [À renseigner] |
| RSSI | [À renseigner] | [À renseigner] | [À renseigner] |

### Révisions prévues

- **Prochaine révision** : 2026-12-25 (annuelle)
- **Révision anticipée si** :
  - Nouveau modèle IA déployé
  - Nouvelle finalité (purpose)
  - Incident RGPD majeur (Art. 33)
  - Modification législative (ex: AI Act)

### Traçabilité

| Version | Date | Auteur | Modifications |
|---------|------|--------|---------------|
| 1.0 | 2025-12-25 | Claude Code (EPIC 7) | Création initiale |

---

## 8. Conclusion

### Acceptabilité du risque

Le traitement **"Invocation Gateway LLM"** présente un **risque résiduel MOYEN (3/16)**, **acceptable** sous les conditions suivantes :

1. ✅ **Implémentation complète des mesures d'atténuation** (Gateway, consent, isolation, audit)
2. ⏳ **Déploiement EPIC 11 (pseudonymisation PII)** avant traitement données sensibles
3. ✅ **Contrat DPA strict avec fournisseur LLM** (si modèle externe)
4. ✅ **Formation admins tenants** et **information utilisateurs** (transparence IA)
5. ✅ **Monitoring continu** et **audits réguliers** (EPIC 7, EPIC 13)

### Recommandations

1. **PRIORITAIRE** : Déployer EPIC 11 (pseudonymisation PII) avant activation production
2. **PRIORITAIRE** : Signer contrat DPA avec fournisseur LLM (clause "pas de training")
3. Préférer **modèle local** (on-premise) pour réduire risque fuite PII
4. Documenter **tous les modèles IA** utilisés (nom, version, biais connus)
5. Réaliser **pentests annuels** (EPIC 13, LOT 13.1) incluant tests bypass Gateway

---

## Références

- **RGPD** : [Texte officiel](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- **CNIL Guide DPIA** : [Modèle DPIA](https://www.cnil.fr/fr/modele-dpia)
- **G29 Guidelines DPIA** : [WP248](https://ec.europa.eu/newsroom/article29/items/611236)
- **AI Act (UE 2024/1689)** : [Règlement IA](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- **Documentation technique** : [TASKS.md](../../../TASKS.md), [LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md)
- **Registre des traitements** : [registre-traitements.md](./registre-traitements.md)
