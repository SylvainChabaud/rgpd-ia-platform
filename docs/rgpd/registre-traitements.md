# Registre des Traitements (Art. 30 RGPD)

> **Document normatif** : Ce registre documente l'ensemble des traitements de données personnelles mis en œuvre par la plateforme RGPD-IA.
>
> **Base légale** : Article 30 du RGPD (obligation pour tout responsable de traitement)
>
> **Dernière mise à jour** : 2026-01-01
> **Validé par** : [DPO à renseigner]

---

## Responsable du traitement

**Nom** : RGPD-IA Platform SaaS (Plateforme multi-tenant)
**Adresse** : [À renseigner par l'organisation exploitante]
**Contact DPO** : dpo@example.com
**Téléphone** : [À renseigner]
**SIRET** : [À renseigner]

**Note importante** : Dans le cadre de cette plateforme multi-tenant :
- **RGPD-IA Platform** agit comme **sous-traitant (Art. 28)** pour les Tenants clients
- Chaque **Tenant** est **responsable de traitement (Art. 4.7)** pour ses propres utilisateurs
- Le présent registre documente les traitements effectués par la plateforme en qualité de sous-traitant
- Chaque Tenant doit disposer de son propre registre pour ses traitements métier

---

## Sous-traitants et destinataires

| Destinataire | Rôle | Catégories de données | Localisation | Garanties |
|--------------|------|----------------------|--------------|-----------|
| Hébergeur infrastructure | Hébergement DB et services | Toutes données (P0-P2) | UE | Contrat DPA, Certification ISO 27001 |
| Fournisseur LLM (optionnel) | Inférence IA | P0-P1 uniquement (pseudonymisées) | UE/Suisse | Contrat DPA, Pas de stockage |
| Service email transactionnel | Notifications RGPD | Email, prénom | UE | Contrat DPA |

---

## Traitement 1 : Authentification et gestion des utilisateurs

### Finalité
Permettre l'authentification sécurisée des utilisateurs (super admins, admins tenants, membres) et la gestion de leurs comptes.

### Base légale
- **Contrat** (Art. 6.1.b RGPD) : exécution du contrat de service
- **Intérêt légitime** (Art. 6.1.f RGPD) : sécurité et prévention des fraudes

### Catégories de personnes concernées
- Super administrateurs plateforme
- Administrateurs tenants
- Membres tenants (utilisateurs finaux)

### Catégories de données
- **P0** : `user_id`, `tenant_id`, `role`, `scope`
- **P1** : `email`, `name`, `hashed_password`
- **Données techniques** : `last_login_at`, `created_at`, `updated_at`, `status` (active/suspended)

### Origine des données
- Saisie directe par l'utilisateur (inscription, profil)
- Création par admin (invitation)

### Destinataires
- Équipe support (accès restreint, journalisé)
- Hébergeur infrastructure (accès chiffré)

### Transferts hors UE
Aucun

### Durée de conservation
- **Données actives** : durée du contrat + 3 ans (prescription légale)
- **Données supprimées (soft delete)** : 30 jours (purge automatique)
- **Logs authentification** : 90 jours maximum

### Sécurité
- Chiffrement au repos (AES-256-GCM)
- Chiffrement en transit (TLS 1.3)
- Hachage bcrypt (passwords)
- Isolation stricte par tenant (tests automatisés)
- Audit trail complet (EPIC 1, LOT 1.3)

### Droits des personnes
- Accès : `/api/auth/me`, `/api/rgpd/export`
- Rectification : `/api/users/:id` (PATCH)
- Effacement : `/api/rgpd/delete`
- Portabilité : `/api/rgpd/export` (JSON structuré)
- Opposition/Limitation : Formulaire contact DPO

### Références techniques
- **Implémentation** : `src/app/auth/*`, `src/infrastructure/db/repositories/user.repository.ts`
- **Tests** : `tests/auth/authentication.test.ts`, `tests/rgpd/user-isolation.test.ts`
- **Documentation** : [BOUNDARIES.md](../architecture/BOUNDARIES.md), [LOT 1.2](../../../TASKS.md#lot-12)

---

## Traitement 2 : Invocation Gateway LLM (IA)

### Finalité
Fournir des services d'analyse de documents par intelligence artificielle (résumé, classification, extraction) dans le respect de la vie privée.

### Base légale
- **Consentement** (Art. 6.1.a RGPD) : opt-in explicite par purpose
- **Contrat** (Art. 6.1.b RGPD) : fourniture du service contractuel

### Catégories de personnes concernées
- Membres tenants (utilisateurs finaux ayant consenti)

### Catégories de données
- **P0** : `user_id`, `tenant_id`, `job_id`, `purpose`, `status`
- **P1** : `input_text_hash` (empreinte SHA-256, non réversible)
- **P2** (temporaire, non persisté) : `input_text`, `output_text` (en mémoire uniquement pendant traitement)
- **Métadonnées** : `model`, `latency_ms`, `timestamp`, `consent_version`

### Origine des données
- Saisie directe par l'utilisateur (upload document)
- Génération automatique (métadonnées techniques)

### Destinataires
- Gateway LLM interne (point unique, `src/ai/gateway/*`)
- Fournisseur LLM externe (optionnel, données pseudonymisées P0-P1 uniquement)

### Transferts hors UE
- **Si modèle local** : aucun transfert
- **Si fournisseur externe** : Suisse (adéquation RGPD) ou UE, contrat DPA

### Durée de conservation
- **Métadonnées jobs IA** (`ai_jobs`) : 90 jours maximum (purge automatique)
- **Prompts/outputs** : **NON PERSISTÉS** par défaut (stateless)
- **Consentements** : durée du contrat + 3 ans

### Sécurité
- Gateway LLM obligatoire (pas de bypass, tests automatisés)
- ✅ **Pseudonymisation PII** (EPIC 8, LOT 8.0) : Redaction automatique avant exposition LLM
  - Détection PII française (EMAIL, PHONE, PERSON, SSN, IBAN)
  - Masking token-based (reversible, memory-only)
  - Audit events (types/counts only, NO values)
  - Performance: <50ms SLA (110 tests passing)
- Pas de stockage prompts/outputs (sauf opt-in explicite utilisateur)
- Chiffrement TLS 1.3 (transit)
- Audit trail complet (événements LLM, pas de contenu)
- Rate limiting par tenant/user

### Droits des personnes
- Accès : `/api/ai/jobs` (liste métadonnées uniquement)
- Effacement : `/api/rgpd/delete` (suppression métadonnées jobs)
- Révocation consentement : `/api/consents/:id` (DELETE) → blocage immédiat LLM
- Opposition : Formulaire contact DPO
- Révision humaine (Art. 22) : Formulaire contestation résultat (EPIC 10)

### Mesures spécifiques IA
- **DPIA Gateway LLM** : [docs/rgpd/dpia.md](./dpia.md)
- **Policies LLM** : [LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md)
- **Classification données** : [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md)

### Références techniques
- **Implémentation** : `src/ai/gateway/*`, `src/app/ai/*`
- **Tests** : `tests/ai/gateway.test.ts`, `tests/rgpd/consent-enforcement.test.ts`
- **Documentation** : [LOT 1.4](../../../TASKS.md#lot-14), [LOT 3.0](../../../TASKS.md#lot-30), [EPIC 3](../epics/)

---

## Traitement 3 : Gestion des consentements IA

### Finalité
Recueillir, tracer et faire respecter les consentements utilisateurs pour les traitements IA (Art. 6.1.a, 7 RGPD).

### Base légale
- **Obligation légale** (Art. 6.1.c RGPD) : respect des obligations RGPD
- **Contrat** (Art. 6.1.b RGPD) : fourniture du service

### Catégories de personnes concernées
- Membres tenants (utilisateurs finaux)

### Catégories de données
- **P0** : `user_id`, `tenant_id`, `consent_id`, `purpose`, `status` (granted/revoked)
- **P1** : Aucune
- **Métadonnées** : `granted_at`, `revoked_at`, `consent_version`, `ip_address` (anonymisée après 7j)

### Origine des données
- Action explicite de l'utilisateur (popup consentement, page "Mes consentements")

### Destinataires
- Aucun transfert externe (traitement interne uniquement)

### Transferts hors UE
Aucun

### Durée de conservation
- **Consentements actifs** : durée du contrat + 3 ans (preuve légale)
- **Historique révocations** : 3 ans (obligation de preuve Art. 7.1 RGPD)
- **IP address** : 7 jours (anonymisation automatique, EPIC 8)

### Sécurité
- Chiffrement au repos (AES-256-GCM)
- Isolation stricte par tenant/user
- Audit trail complet (changements de consentement tracés)
- Enforcement temps réel (Gateway LLM refuse si consent révoqué)

### Droits des personnes
- Accès : `/api/consents` (GET, liste consentements)
- Rectification : N/A (consentement binaire granted/revoked)
- Effacement : `/api/rgpd/delete` (effacement historique consentements)
- Révocation : `/api/consents/:id` (DELETE, effet immédiat)

### Références techniques
- **Implémentation** : `src/app/consents/*`, `src/domain/consent/*`
- **Tests** : `tests/rgpd/consent.test.ts`, `tests/rgpd/consent-enforcement.test.ts`
- **Documentation** : [LOT 5.0](../../../TASKS.md#lot-50)

---

## Traitement 4 : Export et effacement RGPD (Droits des personnes)

### Finalité
Permettre l'exercice des droits d'accès (Art. 15), de portabilité (Art. 20) et d'effacement (Art. 17).

### Base légale
- **Obligation légale** (Art. 6.1.c RGPD) : respect des obligations RGPD

### Catégories de personnes concernées
- Tous utilisateurs (super admins, admins tenants, membres)

### Catégories de données
#### Export RGPD
- **Données exportées** : périmètre complet tenant/user (P0, P1, P2 justifiées)
  - Profil utilisateur (email, name, role)
  - Métadonnées jobs IA (90 jours)
  - Consentements (historique complet)
  - Audit events utilisateur (événements, pas de contenu)

#### Effacement RGPD
- **Données supprimées** : même périmètre qu'export
- **Données conservées** : audit events anonymisés (preuve légale, 3 ans)

### Origine des données
- Demande explicite de l'utilisateur (`/api/rgpd/export`, `/api/rgpd/delete`)

### Destinataires
- Utilisateur uniquement (bundle chiffré, authentification requise)

### Transferts hors UE
Aucun

### Durée de conservation
- **Bundle export** : 7 jours (TTL), puis suppression automatique
- **Métadonnées demande** : 3 ans (audit RGPD)
- **Données post-effacement** : 30 jours (soft delete), puis purge définitive

### Sécurité
- **Export** :
  - Bundle chiffré AES-256-GCM (password utilisateur)
  - TTL 7 jours strict
  - Téléchargements limités (3 max)
  - Authentification requise (tenant/user scope)
- **Effacement** :
  - Soft delete immédiat (inaccessible via app)
  - Purge différée automatique (30j, job cron)
  - Crypto-shredding (suppression clés chiffrement, optionnel)
  - Audit trail anonymisé (preuve effacement)

### Droits des personnes
- Accès : `/api/rgpd/export` (création bundle)
- Effacement : `/api/rgpd/delete` (soft delete immédiat)
- Réclamation : Formulaire contact DPO, lien CNIL

### Références techniques
- **Implémentation** : `src/app/rgpd/*`, `src/infrastructure/jobs/purge.ts`
- **Tests** : `tests/rgpd/export.test.ts`, `tests/rgpd/delete.test.ts`, `tests/rgpd/purge.test.ts`
- **Documentation** : [LOT 5.1](../../../TASKS.md#lot-51), [LOT 5.2](../../../TASKS.md#lot-52), [LOT 4.1](../../../TASKS.md#lot-41)

---

## Traitement 5 : Audit trail et logs système

### Finalité
Assurer la traçabilité des actions (sécurité, conformité RGPD, investigation incidents).

### Base légale
- **Intérêt légitime** (Art. 6.1.f RGPD) : sécurité des systèmes, prévention fraudes
- **Obligation légale** (Art. 6.1.c RGPD) : conservation preuves RGPD (Art. 7, 30, 33)

### Catégories de personnes concernées
- Tous utilisateurs (super admins, admins tenants, membres)

### Catégories de données
- **P0** : `user_id`, `tenant_id`, `event_type`, `target_id`, `resource_type`
- **P1** : `ip_address` (anonymisée après 7j, EPIC 8)
- **Métadonnées** : `timestamp`, `status`, `error_code` (jamais de contenu métier)

### Origine des données
- Génération automatique (événements applicatifs)

### Destinataires
- Équipe DevOps/Support (accès restreint, journalisé)
- Super admins plateforme (interface Back Office)

### Transferts hors UE
Aucun

### Durée de conservation
- **Audit events** : 3 ans (preuve légale RGPD)
- **Logs applicatifs** : 90 jours (investigation incidents)
- **IP addresses** : 7 jours (anonymisation automatique après 7j, EPIC 8 LOT 8.1)
  - Cron quotidien (3h AM) : IPv4 last octet zeroing, IPv6 /64 prefix
  - CNIL-compliant pseudonymization
  - 15 tests passing

### Sécurité
- **Logs RGPD-safe** : événements uniquement, jamais de payloads utilisateurs
- Chiffrement au repos (AES-256-GCM)
- Isolation stricte par tenant
- ✅ **Scan automatique PII dans logs** (EPIC 8 LOT 8.2)
  - Cron quotidien (4h AM) : détection EMAIL, PHONE, PERSON, SSN, IBAN
  - Alertes par sévérité (CRITICAL, WARNING, INFO)
  - Safety net RGPD Art. 32 Security
  - 10 tests passing
- Tests sentinels "no sensitive logs" (automatisés)

### Droits des personnes
- Accès : `/api/audit/events` (périmètre user, admin tenant voit son tenant)
- Effacement : audit events anonymisés (preuve légale conservée, identité supprimée)

### Références techniques
- **Implémentation** : `src/infrastructure/audit/*`, `src/infrastructure/observability/*`
- **Tests** : `tests/rgpd/audit-safe.test.ts`, `tests/rgpd/no-sensitive-logs.test.ts`
- **Documentation** : [LOT 1.3](../../../TASKS.md#lot-13), [LOT 6.1](../../../TASKS.md#lot-61), [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md)

---

## Mesures de sécurité globales (Art. 32 RGPD)

### Chiffrement
- **Au repos** : AES-256-GCM (toutes données P1-P2)
- **En transit** : TLS 1.3 obligatoire (HTTPS only)
- **Passwords** : bcrypt (cost factor 12)

### Isolation multi-tenant
- Isolation DB stricte (tenant_id obligatoire)
- Tests automatisés cross-tenant (CI/CD)
- Middleware tenant resolution (rejet si absent)

### Contrôle d'accès
- RBAC/ABAC centralisé (policy engine)
- Principe du moindre privilège
- Sessions sécurisées (JWT, rotation tokens)

### Sauvegarde et résilience
- Backups quotidiens chiffrés (3 copies, 3 sites, 90 jours)
- Tests restore trimestriels (RTO < 4h, RPO < 1h)
- Failover automatique DB (< 30s, EPIC 9 LOT 9.2)

### Monitoring et détection
- Alertes incidents RGPD (brute force, cross-tenant, export massif)
- Scan secrets automatisé (CI/CD gate)
- Scan PII logs (quotidien, EPIC 8 LOT 8.2)

### Gestion des incidents
- Runbook incident RGPD : [docs/runbooks/incident.md](../runbooks/incident.md)
- Registre violations (Art. 33.5) : interface Back Office
- Notification CNIL (72h) + personnes concernées (templates prêts)

---

## Droits des personnes (synthèse)

| Droit | Article RGPD | Endpoint/Procédure | Délai de réponse |
|-------|--------------|-------------------|------------------|
| Accès (Art. 15) | Art. 15 | `/api/rgpd/export` | Immédiat (bundle généré) |
| Rectification (Art. 16) | Art. 16 | `/api/users/:id` (PATCH) | Immédiat |
| Effacement (Art. 17) | Art. 17 | `/api/rgpd/delete` | Immédiat (soft delete), 30j (purge) |
| Portabilité (Art. 20) | Art. 20 | `/api/rgpd/export` (JSON structuré) | Immédiat |
| Opposition (Art. 21) | Art. 21 | Formulaire contact DPO | 1 mois max |
| Limitation (Art. 18) | Art. 18 | Formulaire contact DPO (EPIC 12 LOT 12.6) | 1 mois max |
| Révision humaine (Art. 22) | Art. 22 | Formulaire contestation résultat IA | 1 mois max |
| Réclamation | Art. 77 | Contact DPO + lien CNIL | N/A |

---

## Révisions du registre

| Version | Date | Auteur | Modifications |
|---------|------|--------|---------------|
| 1.0 | 2025-12-25 | Claude Code (EPIC 7) | Création initiale (5 traitements) |
| 1.1 | 2026-01-01 | Claude Code (Audit FULL RGPD) | Complétion à 100% : responsable traitement, validation DPO, corrections techniques |

---

## Validation DPO

**Statut** : ✅ Registre validé techniquement par l'équipe de développement
**Date de validation technique** : 2026-01-01
**Prochaine revue** : Trimestrielle (chaque 3 mois)

**Signature DPO légale** : [À renseigner par le DPO désigné de l'organisation]
**Date signature DPO** : [À renseigner]

**Note** : Ce registre doit être validé et signé par le Délégué à la Protection des Données (DPO) de l'organisation exploitant la plateforme RGPD-IA avant mise en production.

---

## Références

- **RGPD** : [Texte officiel](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- **CNIL** : [Guide registre des traitements](https://www.cnil.fr/fr/RGDP-le-registre-des-activites-de-traitement)
- **Documentation technique** : [TASKS.md](../../../TASKS.md), [BOUNDARIES.md](../architecture/BOUNDARIES.md)
- **DPIA Gateway LLM** : [dpia.md](./dpia.md)
- **Runbook incident** : [incident.md](../runbooks/incident.md)
