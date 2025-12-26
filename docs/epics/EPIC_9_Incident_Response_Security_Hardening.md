# EPIC 9 — Incident Response & Security Hardening

**Date** : 25 décembre 2025  
**Statut** : ❌ TODO  
**Périmètre** : Backend + Ops/Sec + Documentation  
**Scope** : PLATFORM (DevOps, SRE, DPO)  
**RGPD Coverage** : Art. 33-34 (Notification violations), Art. 32 (Sécurité), Art. 5.1(f) (Intégrité)  
**Durée estimée** : 2 semaines

---

## 1. Contexte et objectifs

### 1.1 Contexte RGPD

**Gap critique identifié** (cf. `ANALYSE_COUVERTURE_RGPD.md`) :
- ❌ **Notification violations (Art. 33-34)** : Aucun processus
- ⚠️ **Tests sécurité incomplets** : Pas de pentest, pas de tests chaos
- ⚠️ **Backup/restore** : Non testé E2E

**Articles RGPD concernés** :
- **Art. 33** : Notification violation à l'autorité de contrôle (CNIL) **dans les 72 heures**
- **Art. 34** : Communication violation aux personnes concernées si **risque élevé**
- **Art. 32** : Mesures techniques appropriées (tests résilience, vulnérabilités)
- **Art. 5.1(f)** : Intégrité et confidentialité (sécurité)

### 1.2 Objectifs techniques

Créer **processus complet gestion incidents RGPD** + **hardening sécurité** :

1. **Runbook incident RGPD** (Art. 33-34)
   - Détection violations automatique (alertes logs)
   - Workflow escalade (DPO, CNIL, users)
   - Templates emails notification
   - Registre violations (obligatoire Art. 33.5)

2. **Pentest & Vulnerability Scanning**
   - Scan OWASP Top 10
   - Pentest API endpoints
   - Scan dépendances (npm audit, Snyk)

3. **Chaos Engineering & Résilience**
   - Tests résilience (kill pods, perte DB)
   - Tests backup/restore (RTO/RPO)
   - Tests failover (haute disponibilité)

### 1.3 Articulation avec autres EPICs

| EPIC | Relation | Détails |
|------|----------|---------|
| **EPIC 1** | ✅ Améliore | Audit trail + détection violations |
| **EPIC 6** | ✅ Dépend | Docker prod pour tests chaos |
| **EPIC 7** | ✅ Dépend | Observabilité pour détection incidents |
| **EPIC 8** | ✅ Complète | Scan PII logs + anonymisation IP |

---

## 2. Exigences RGPD (Art. 33-34)

### 2.1 Notification violation autorité (Art. 33)

**Obligation légale** :
> En cas de violation de données, le responsable du traitement **notifie la violation à l'autorité de contrôle compétente dans les 72 heures** (RGPD Art. 33).

**Cas exemptions** :
- Violation **ne présente pas de risque** pour droits/libertés personnes

**Informations à fournir** (Art. 33.3) :
1. Nature de la violation (catégories/nombre personnes/enregistrements concernés)
2. Nom et coordonnées DPO
3. Conséquences probables violation
4. Mesures prises/envisagées pour remédier + atténuer effets

**Registre violations** (Art. 33.5 - obligatoire) :
> Le responsable du traitement **documente toute violation** (faits, effets, mesures).

**Implémentation** :
- **Détection automatique** : Alertes logs anomalie (accès non autorisé, fuite données)
- **Workflow escalade** : Notification automatique DPO → Décision notification CNIL
- **Formulaire CNIL** : Template pré-rempli (gain temps 72h)
- **Registre violations** : Table DB `data_breaches` (append-only)

### 2.2 Communication violation personnes (Art. 34)

**Obligation légale** :
> Si violation présente **risque élevé** pour droits/libertés personnes, le responsable **communique la violation à la personne concernée sans délai** (RGPD Art. 34).

**Cas exemptions** (Art. 34.3) :
1. Mesures protection appropriées appliquées (ex. chiffrement)
2. Mesures ultérieures assurent absence risque élevé
3. Communication exigerait efforts disproportionnés (communication publique alors)

**Informations à fournir** (Art. 34.2) :
1. Nature de la violation (langage clair et simple)
2. Nom et coordonnées DPO
3. Conséquences probables violation
4. Mesures prises/envisagées pour remédier

**Implémentation** :
- **Évaluation risque** : Grille évaluation (données concernées, nombre users, sensibilité)
- **Template email users** : Message clair, non-alarmiste, actions recommandées
- **Notification bulk** : Email automatique users concernés
- **Traçabilité** : Audit events `breach.user_notified`

### 2.3 Détection violations (Automatisation)

**Types violations à détecter** :
1. **Accès non autorisé** :
   - Tentatives login multiples échouées (brute force)
   - Accès cross-tenant détecté (isolation violée)
   - Élévation privilèges non autorisée
2. **Fuite données** :
   - Export massif données (volume anormal)
   - API endpoint exposant données sensibles (faille détectée)
   - Logs contenant PII en clair (scan EPIC 8)
3. **Perte données** :
   - Échec backup (RTO/RPO non respectés)
   - Corruption DB détectée
4. **Indisponibilité prolongée** :
   - Downtime > 4h (impact service)

**Métriques déclenchement alertes** :
- **Failed logins** : > 10 tentatives / user / 5 min
- **Cross-tenant access** : ANY (alerte critique immédiate)
- **Export volume** : > 10 000 records / user / heure
- **PII logs** : ANY (alerte quotidienne EPIC 8)
- **Backup failures** : 2 échecs consécutifs

---

## 3. Périmètre fonctionnel

### 3.1 LOT 9.0 — Runbook "Incident RGPD"

**Objectif** : Créer processus complet gestion violations données (Art. 33-34).

**User Stories** :

#### US 9.1 : Détection automatique violations
**En tant que** Système monitoring  
**Je veux** détecter automatiquement violations de données  
**Afin de** alerter équipe dans délai 72h

**Acceptance Criteria** :
- [ ] Règles alertes configurées :
  - Failed logins > 10 / 5 min → Alerte Slack/email DevOps
  - Cross-tenant access ANY → Alerte critique PagerDuty
  - Export volume > 10k records/h → Alerte DPO
  - PII logs détectée → Alerte quotidienne (EPIC 8)
  - Backup failures 2× → Alerte critique DevOps
- [ ] Alertes contiennent :
  - Type violation présumée
  - Horodatage
  - Données concernées (estimé)
  - Lien dashboard monitoring

**Implémentation** :
```yaml
# config/alerts.yaml
alerts:
  - name: brute_force_detected
    condition: failed_logins > 10 in 5m
    severity: warning
    notify: [slack-devops, email-dpo]
    
  - name: cross_tenant_access
    condition: cross_tenant_query_detected
    severity: critical
    notify: [pagerduty, slack-devops, email-dpo]
    
  - name: mass_export
    condition: export_records > 10000 in 1h
    severity: high
    notify: [email-dpo]
    
  - name: pii_in_logs
    condition: pii_scan_violations > 0
    severity: high
    notify: [email-devops]
    
  - name: backup_failure
    condition: backup_failed count >= 2
    severity: critical
    notify: [pagerduty, slack-devops]
```

**Tests RGPD obligatoires** :
```typescript
// tests/rgpd.incident-detection.test.ts
describe('Incident Detection', () => {
  it('alerte brute force après 10 failed logins', async () => {
    for (let i = 0; i < 11; i++) {
      await login({ email: 'test@example.com', password: 'wrong' });
    }
    
    const alerts = await getAlerts('brute_force_detected');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('warning');
  });

  it('alerte critique cross-tenant access', async () => {
    // Simuler tentative accès cross-tenant (impossible normalement)
    const tenantAUser = await createUser({ tenantId: 'tenant-a' });
    await attemptAccessTenantB(tenantAUser); // Doit échouer + alerter

    const alerts = await getAlerts('cross_tenant_access');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
  });
});
```

---

#### US 9.2 : Workflow escalade violation
**En tant que** DPO  
**Je veux** recevoir workflow clair en cas de violation  
**Afin de** notifier CNIL dans 72h si nécessaire

**Workflow** :

```
┌─────────────────────────────────────────────┐
│ 1. DÉTECTION (automatique)                  │
│    - Alerte monitoring déclenchée           │
│    - Notification DPO + DevOps              │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 2. INVESTIGATION (< 2h)                     │
│    - DevOps confirme violation réelle       │
│    - Évaluation données concernées          │
│    - Évaluation nombre users impactés       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 3. ÉVALUATION RISQUE (DPO)                  │
│    - Grille évaluation risque (faible/élevé)│
│    - Décision notification CNIL (Art. 33)   │
│    - Décision notification users (Art. 34)  │
└──────────────┬──────────────────────────────┘
               │
          ┌────┴────┐
          │         │
          ▼         ▼
    FAIBLE RISQUE   RISQUE ÉLEVÉ
          │         │
          │         ▼
          │    ┌─────────────────────────────┐
          │    │ 4A. NOTIFICATION CNIL (< 72h)│
          │    │    - Formulaire CNIL pré-rempli│
          │    │    - Envoi notification         │
          │    │    - Registre violation         │
          │    └─────────────────────────────┘
          │         │
          │         ▼
          │    ┌─────────────────────────────┐
          │    │ 4B. NOTIFICATION USERS       │
          │    │    - Email users concernés   │
          │    │    - Template clair          │
          │    │    - Actions recommandées    │
          │    └─────────────────────────────┘
          │         │
          └─────────┴───────────────────────────┐
                                                │
                                                ▼
                    ┌─────────────────────────────────┐
                    │ 5. REMÉDIATION                  │
                    │    - Patch faille sécurité      │
                    │    - Mesures atténuation        │
                    │    - Monitoring renforcé        │
                    └─────────────────────────────────┘
                                                │
                                                ▼
                    ┌─────────────────────────────────┐
                    │ 6. DOCUMENTATION                │
                    │    - Registre violations (DB)   │
                    │    - Post-mortem incident       │
                    │    - Amélioration continue      │
                    └─────────────────────────────────┘
```

**Acceptance Criteria** :
- [ ] Runbook documenté : `/docs/runbooks/INCIDENT_RGPD.md`
- [ ] Grille évaluation risque (checklist) :
  - Données sensibles concernées ? (P2/P3 = risque élevé)
  - Nombre users > 100 ? (risque élevé)
  - Fuite externe (hors organisation) ? (risque élevé)
  - Mesures protection appliquées ? (chiffrement = risque réduit)
- [ ] Templates documents :
  - Formulaire CNIL (pré-rempli)
  - Email users (template clair)
  - Post-mortem incident (template)
- [ ] Checklist actions (timeline 72h) :
  - H+0 : Détection + investigation
  - H+2 : Évaluation risque DPO
  - H+12 : Notification CNIL si nécessaire
  - H+24 : Notification users si risque élevé
  - H+72 : Remédiation + documentation

---

#### US 9.3 : Registre violations (Art. 33.5)
**En tant que** DPO  
**Je veux** tenir registre de toutes violations (confirmées ou non)  
**Afin de** prouver conformité RGPD en audit CNIL

**Acceptance Criteria** :
- [ ] Table DB `data_breaches` :
  - `id` (UUID, PK)
  - `detected_at` (timestamp détection)
  - `type` (accès non autorisé, fuite, perte, indisponibilité)
  - `description` (texte libre)
  - `data_categories` (P0/P1/P2/P3 concernées)
  - `users_affected` (count estimé)
  - `risk_level` (faible, moyen, élevé)
  - `cnil_notified` (boolean)
  - `cnil_notified_at` (timestamp)
  - `users_notified` (boolean)
  - `users_notified_at` (timestamp)
  - `remediation_actions` (texte libre)
  - `resolved_at` (timestamp résolution)
  - `created_by` (user_id DPO)
- [ ] Interface Back Office (Super Admin/DPO) :
  - Liste violations (table)
  - Formulaire ajout violation manuelle
  - Export registre (CSV/PDF pour audit CNIL)
- [ ] Audit trail : Toutes modifications registre tracées

**Implémentation** :
```sql
-- migrations/005_data_breaches.sql
CREATE TABLE data_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  data_categories TEXT[], -- ['P1', 'P2']
  users_affected INTEGER,
  risk_level VARCHAR(50) NOT NULL, -- faible, moyen, élevé
  cnil_notified BOOLEAN DEFAULT false,
  cnil_notified_at TIMESTAMPTZ,
  users_notified BOOLEAN DEFAULT false,
  users_notified_at TIMESTAMPTZ,
  remediation_actions TEXT,
  resolved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_data_breaches_detected ON data_breaches(detected_at);
CREATE INDEX idx_data_breaches_risk ON data_breaches(risk_level);
```

---

#### US 9.4 : Templates notification CNIL/Users
**En tant que** DPO  
**Je veux** disposer de templates pré-remplis notification  
**Afin de** gagner temps dans délai 72h

**Template notification CNIL** :
```markdown
# Notification de violation de données - RGPD Art. 33

**Responsable du traitement** : [NOM ENTREPRISE]  
**Adresse** : [ADRESSE COMPLÈTE]  
**DPO** : [NOM DPO] - dpo@example.com  
**Date détection** : [DATE/HEURE]  
**Date notification** : [DATE/HEURE] (< 72h après détection)

---

## 1. Nature de la violation

**Type** : [Accès non autorisé / Fuite de données / Perte / Indisponibilité]

**Description** : 
[Décrire circonstances violation : comment, quand, quelle faille exploitée]

**Données concernées** :
- Catégories : [P1 - Métadonnées / P2 - Authentification / P3 - Contenus]
- Nombre d'enregistrements : [NOMBRE]
- Nombre de personnes concernées : [NOMBRE]

---

## 2. Conséquences probables

[Décrire impacts potentiels pour droits/libertés personnes]

Exemples :
- Accès non autorisé emails users → Risque phishing
- Fuite mots de passe (hashés) → Risque accès comptes si collision
- Indisponibilité service → Aucun impact données (disponibilité uniquement)

---

## 3. Mesures prises ou envisagées

**Actions immédiates** :
- [DATE/HEURE] : Détection violation (alerte monitoring)
- [DATE/HEURE] : Investigation confirmée
- [DATE/HEURE] : Mesures atténuation (ex. blocage accès, patch faille)

**Mesures remédiation** :
- [Action 1] : Patch vulnérabilité [CVE-XXX] appliqué
- [Action 2] : Réinitialisation mots de passe users concernés (envoi email)
- [Action 3] : Audit sécurité complet en cours

**Mesures prévention** :
- [Action 1] : Renforcement monitoring (alertes temps réel)
- [Action 2] : Tests sécurité renforcés (pentest trimestriel)
- [Action 3] : Formation équipe DevOps (bonnes pratiques)

---

## 4. Communication aux personnes concernées

**Notification users** : [Oui / Non / En cours]

Si Oui :
- Date notification : [DATE]
- Moyen : [Email / Communication publique site web]
- Contenu : Voir email ci-joint

Si Non (justification Art. 34.3) :
- [ ] Mesures protection appropriées (chiffrement appliqué)
- [ ] Mesures ultérieures absence risque élevé
- [ ] Efforts disproportionnés (nombre users > 10 000, communication publique)

---

## 5. Contact DPO

**Nom** : [NOM DPO]  
**Email** : dpo@example.com  
**Téléphone** : [NUMÉRO]

---

**Annexes** :
- Post-mortem incident détaillé
- Logs pertinents (extraits anonymisés)
- Preuve mesures remédiation

**Signature** : [NOM DPO]  
**Date** : [DATE]
```

**Template email users** :
```markdown
Objet : Information importante concernant vos données

Bonjour,

Nous vous informons qu'un incident de sécurité a affecté notre plateforme le [DATE].

**Que s'est-il passé ?**
[Description claire incident, sans termes techniques]
Exemple : "Une vulnérabilité dans notre système a permis à une personne non autorisée d'accéder temporairement à certaines données utilisateurs."

**Vos données concernées :**
- [Liste simple : Email, Nom, Métadonnées utilisation IA]
- [Préciser données NON concernées : Mots de passe, contenus documents]

**Actions entreprises :**
- Faille corrigée immédiatement le [DATE]
- Accès non autorisé bloqué
- Enquête en cours avec autorités compétentes

**Que devez-vous faire ?**
Par précaution, nous vous recommandons de :
1. Modifier votre mot de passe (lien : [URL])
2. Vérifier activité récente compte (lien : [URL])
3. Être vigilant emails suspects (phishing)

**Vos droits :**
Vous pouvez exercer vos droits RGPD (accès, effacement, etc.) via [URL My Data].
Pour toute question : dpo@example.com

Nous nous excusons pour cet incident et mettons tout en œuvre pour éviter sa reproduction.

Cordialement,
L'équipe [NOM ENTREPRISE]

---
DPO : dpo@example.com
Plus d'informations : [URL page incident publique]
```

**Acceptance Criteria** :
- [ ] Templates créés : `/docs/templates/NOTIFICATION_CNIL.md`, `/docs/templates/NOTIFICATION_USERS.md`
- [ ] Variables à remplacer clairement identifiées (`[VARIABLE]`)
- [ ] Validation juridique templates (avocat RGPD)

---

### 3.2 LOT 9.1 — Pentest & Vulnerability Scanning

**Objectif** : Identifier et corriger vulnérabilités sécurité (Art. 32).

**User Stories** :

#### US 9.5 : Scan OWASP Top 10
**En tant que** Équipe sécurité  
**Je veux** scanner API/frontend pour OWASP Top 10  
**Afin de** corriger vulnérabilités courantes

**OWASP Top 10 (2021)** :
1. **A01:2021 – Broken Access Control** : Isolation tenant, RBAC/ABAC
2. **A02:2021 – Cryptographic Failures** : TLS 1.3, AES-256-GCM
3. **A03:2021 – Injection** : SQL injection (parameterized queries)
4. **A04:2021 – Insecure Design** : Privacy by Design (EPICs 1-13)
5. **A05:2021 – Security Misconfiguration** : Secrets management, CORS
6. **A06:2021 – Vulnerable Components** : npm audit, Snyk
7. **A07:2021 – Authentication Failures** : JWT, bcrypt, MFA
8. **A08:2021 – Software/Data Integrity** : Signature packages, SBOM
9. **A09:2021 – Logging Failures** : Audit trail (EPIC 1)
10. **A10:2021 – SSRF** : Validation URLs, whitelist domains

**Outils recommandés** :
- **OWASP ZAP** : Scanner automatique web app
- **Burp Suite Community** : Tests manuels API
- **Snyk** : Scan dépendances npm
- **npm audit** : Scan vulnérabilités npm (intégré)

**Acceptance Criteria** :
- [ ] Scan OWASP ZAP exécuté (rapport généré)
- [ ] Scan npm audit/Snyk exécuté (rapport généré)
- [ ] Vulnérabilités critiques/hautes corrigées (100%)
- [ ] Vulnérabilités moyennes : plan remédiation documenté
- [ ] Rapport final : `/docs/security/PENTEST_REPORT_[DATE].md`
- [ ] Tests E2E validant corrections

**Commandes** :
```bash
# npm audit
pnpm audit --audit-level=high

# Snyk (requires account)
npx snyk test --severity-threshold=high

# OWASP ZAP (Docker)
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://your-app.example.com \
  -r zap-report.html
```

---

#### US 9.6 : Pentest API endpoints
**En tant que** Pen tester  
**Je veux** tester manuellement endpoints critiques  
**Afin de** identifier failles logiques

**Endpoints critiques à tester** :
1. **Auth** :
   - Brute force login (rate limiting OK ?)
   - JWT token manipulation (signature validée ?)
   - Session fixation/hijacking
2. **RBAC/ABAC** :
   - Élévation privilèges (MEMBER → ADMIN)
   - Cross-tenant access (tenant A → tenant B)
   - Bypass scope PLATFORM (TENANT_ADMIN → SUPER_ADMIN)
3. **Gateway LLM** :
   - Bypass consentement (appel direct provider)
   - Injection prompts (prompt injection attacks)
   - Rate limiting (DDoS protection)
4. **Export RGPD** :
   - Export données autre user (IDOR)
   - Export massif (DoS)
5. **API inputs** :
   - SQL injection (parameterized queries OK ?)
   - XSS (sanitization OK ?)
   - Path traversal (file upload)

**Acceptance Criteria** :
- [ ] Tests manuels 20 scénarios minimum
- [ ] Rapport détaillé : Vulnérabilités trouvées, PoC, remédiation
- [ ] Corrections appliquées (vulnérabilités critiques/hautes)
- [ ] Tests régression validant corrections

---

### 3.3 LOT 9.2 — Chaos Engineering & Résilience

**Objectif** : Tester résilience infrastructure (Art. 32 - disponibilité).

**User Stories** :

#### US 9.7 : Tests chaos (Kill pods, perte DB)
**En tant que** SRE  
**Je veux** tester résilience infrastructure sous stress  
**Afin de** garantir disponibilité service

**Scénarios chaos** :
1. **Kill random pod** : API pod tué → Service continue (auto-restart)
2. **Kill DB replica** : DB replica down → Failover automatique
3. **Network latency** : Latence réseau +500ms → Timeouts gérés
4. **CPU spike** : CPU 100% → Throttling gracieux
5. **Disk full** : Disque plein → Alertes + purge automatique

**Outils recommandés** :
- **Chaos Mesh** (Kubernetes)
- **Gremlin** (SaaS)
- **Litmus Chaos** (open source)

**Acceptance Criteria** :
- [ ] Tests chaos exécutés (5 scénarios minimum)
- [ ] Service reste disponible (uptime > 99%)
- [ ] Alertes déclenchées correctement
- [ ] Auto-recovery fonctionne (< 30s downtime)
- [ ] Rapport : `/docs/testing/CHAOS_REPORT_[DATE].md`

**Exemple test** :
```bash
# Chaos Mesh : Kill random pod
kubectl apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kill-api-pod
spec:
  action: pod-kill
  mode: one
  selector:
    labelSelectors:
      app: api
  scheduler:
    cron: "@every 10m"
EOF
```

---

#### US 9.8 : Tests backup/restore (RTO/RPO)
**En tant que** DBA  
**Je veux** tester backup/restore complet DB  
**Afin de** garantir récupération données en cas désastre

**Objectifs** :
- **RTO (Recovery Time Objective)** : < 4 heures (temps max restauration)
- **RPO (Recovery Point Objective)** : < 1 heure (perte max données)

**Tests** :
1. **Backup automatique quotidien** : Vérifier backup créé chaque nuit
2. **Restore complet** : Restaurer backup sur env staging
3. **Restore partiel** : Restaurer table spécifique (ex. `users`)
4. **Point-in-time recovery** : Restaurer DB état H-2

**Acceptance Criteria** :
- [ ] Backup automatique configuré (cron quotidien)
- [ ] Test restore complet réussi (< 4h)
- [ ] Données restaurées identiques (checksum)
- [ ] Point-in-time recovery testé (< 1h perte)
- [ ] Runbook backup/restore : `/docs/runbooks/BACKUP_RESTORE.md`

**Commandes** :
```bash
# Backup PostgreSQL
pg_dump -h localhost -U postgres -F c -b -v -f backup_$(date +%Y%m%d).dump mydatabase

# Restore
pg_restore -h localhost -U postgres -d mydatabase -v backup_20251225.dump

# Point-in-time recovery (PostgreSQL WAL)
# Requires WAL archiving configured
```

---

#### US 9.9 : Tests failover (Haute disponibilité)
**En tant que** SRE  
**Je veux** tester failover automatique DB/services  
**Afin de** garantir haute disponibilité

**Tests** :
1. **DB primary failure** : Primary DB down → Promotion replica en primary (< 30s)
2. **Load balancer failure** : LB down → Traffic reroute autre LB
3. **Multi-AZ failure** : Zone availability AWS down → Services continuent (autre AZ)

**Acceptance Criteria** :
- [ ] Failover DB automatique (< 30s downtime)
- [ ] Aucune perte données (transactions repliquées)
- [ ] Tests E2E passent après failover
- [ ] Monitoring détecte failover (alertes)

---

## 4. Architecture technique

### 4.1 Structure fichiers (nouveau)

```
docs/
  runbooks/
    INCIDENT_RGPD.md              # Workflow complet incident
    BACKUP_RESTORE.md             # Procédure backup/restore
  templates/
    NOTIFICATION_CNIL.md          # Template formulaire CNIL
    NOTIFICATION_USERS.md         # Template email users
  security/
    PENTEST_REPORT_[DATE].md      # Rapport pentest
  testing/
    CHAOS_REPORT_[DATE].md        # Rapport tests chaos

src/
  infrastructure/
    monitoring/
      alerts.config.ts            # Configuration alertes
      incident-detector.ts        # Détection violations
    jobs/
      backup-db.job.ts            # Job backup quotidien

migrations/
  005_data_breaches.sql           # Registre violations
```

### 4.2 Base de données (ajouts)

```sql
-- Registre violations (Art. 33.5)
CREATE TABLE data_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  data_categories TEXT[],
  users_affected INTEGER,
  risk_level VARCHAR(50) NOT NULL,
  cnil_notified BOOLEAN DEFAULT false,
  cnil_notified_at TIMESTAMPTZ,
  users_notified BOOLEAN DEFAULT false,
  users_notified_at TIMESTAMPTZ,
  remediation_actions TEXT,
  resolved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Monitoring & Alertes

**Stack recommandée** :
- **Prometheus** : Métriques (CPU, mémoire, latence)
- **Grafana** : Dashboards visualisation
- **AlertManager** : Gestion alertes
- **PagerDuty** : Escalade incidents critiques
- **Sentry** : Erreurs applicatives

**Alertes critiques** :
```yaml
# prometheus/alerts.yml
groups:
  - name: rgpd_violations
    interval: 1m
    rules:
      - alert: CrossTenantAccessDetected
        expr: cross_tenant_queries_total > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Violation isolation tenant détectée"
          description: "Requête cross-tenant détectée (possible violation RGPD)"
          
      - alert: MassiveExport
        expr: rate(rgpd_export_records_total[1h]) > 10000
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Export massif détecté"
          description: "User a exporté > 10k records en 1h (possible exfiltration)"
          
      - alert: BackupFailure
        expr: backup_failures_total >= 2
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Échec backup DB"
          description: "2 backups consécutifs échoués (risque perte données)"
```

---

## 5. Tests RGPD obligatoires

| Test | Fichier | Objectif |
|------|---------|----------|
| Détection brute force | `rgpd.incident-detection.test.ts` | Alerte > 10 failed logins |
| Détection cross-tenant | `rgpd.incident-detection.test.ts` | Alerte critique isolation violée |
| Registre violations CRUD | `rgpd.data-breaches.test.ts` | CRUD registre violations |
| Export registre | `rgpd.data-breaches.test.ts` | Export CSV registre (audit CNIL) |
| Backup automatique | `infra.backup.test.ts` | Backup quotidien créé |
| Restore DB | `infra.restore.test.ts` | Restore complet réussi |
| Failover DB | `infra.failover.test.ts` | Promotion replica < 30s |
| Chaos pod kill | `infra.chaos.test.ts` | Service continue après kill pod |

**Total** : 8 tests minimum

---

## 6. Definition of Done (DoD)

### 6.1 Code
- [ ] Runbook incident RGPD créé (`/docs/runbooks/INCIDENT_RGPD.md`)
- [ ] Templates notification créés (CNIL, users)
- [ ] Table `data_breaches` créée (registre violations)
- [ ] Interface Back Office registre violations (CRUD, export)
- [ ] Configuration alertes monitoring (Prometheus/AlertManager)
- [ ] Job backup automatique DB (cron quotidien)

### 6.2 Tests
- [ ] 8 tests RGPD/infra passants (100%)
- [ ] Tests E2E détection incidents (brute force, cross-tenant)
- [ ] Tests E2E backup/restore (complet, partiel, PITR)
- [ ] Tests E2E failover DB (< 30s downtime)
- [ ] Tests chaos engineering (5 scénarios minimum)
- [ ] `pnpm test` passe (100% tests)

### 6.3 Documentation
- [ ] Runbook incident RGPD complet (workflow, timeline 72h, grille risque)
- [ ] Runbook backup/restore (procédure détaillée, RTO/RPO)
- [ ] Templates notification validés juridiquement
- [ ] Rapport pentest créé (`PENTEST_REPORT_[DATE].md`)
- [ ] Rapport chaos engineering (`CHAOS_REPORT_[DATE].md`)

### 6.4 Sécurité
- [ ] Scan OWASP ZAP exécuté (rapport)
- [ ] Scan npm audit/Snyk (vulnérabilités critiques/hautes corrigées)
- [ ] Pentest manuel 20 scénarios (rapport détaillé)
- [ ] Vulnérabilités critiques : 0
- [ ] Vulnérabilités hautes : Plan remédiation documenté

### 6.5 Résilience
- [ ] RTO < 4h (backup/restore testé)
- [ ] RPO < 1h (PITR testé)
- [ ] Failover DB < 30s (testé)
- [ ] Tests chaos passants (service disponible)
- [ ] Monitoring alertes fonctionnelles (tests déclenchement)

### 6.6 Conformité RGPD
- [ ] Art. 33 (Notification CNIL) : ✅ Workflow + templates
- [ ] Art. 34 (Notification users) : ✅ Templates + grille risque
- [ ] Art. 33.5 (Registre violations) : ✅ Table DB + interface
- [ ] Art. 32 (Sécurité) : ✅ Pentest + tests résilience

---

## 7. Risques et mitigation

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Détection violations faux positifs | 🟡 Moyen | Élevé | Tuning alertes, investigation manuelle |
| Délai 72h CNIL dépassé | 🔴 Élevé | Faible | Workflow clair, templates pré-remplis, alertes |
| Pentest trouve vulnérabilités critiques | 🔴 Élevé | Moyen | Corrections immédiates, re-test, audit externe |
| Tests chaos causent downtime prod | 🟡 Moyen | Faible | Tests env staging uniquement, fenêtres maintenance |
| Backup/restore échoue | 🔴 Élevé | Faible | Tests réguliers, monitoring, alertes, multi-backups |

---

## 8. Métriques de succès

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| **Détection violations** | < 2h investigation | Temps moyen alerte → confirmation |
| **Notification CNIL** | 100% < 72h | Délai détection → notification |
| **Vulnérabilités critiques** | 0 | Scan pentest |
| **RTO** | < 4h | Tests backup/restore |
| **RPO** | < 1h | Tests PITR |
| **Uptime post-chaos** | > 99% | Tests chaos engineering |

---

## 9. Checklist de livraison

### Phase 1 : LOT 9.0 (Incident RGPD)
- [ ] Runbook incident RGPD documenté
- [ ] Configuration alertes monitoring (Prometheus)
- [ ] Table `data_breaches` + interface Back Office
- [ ] Templates notification CNIL/users
- [ ] Tests E2E détection incidents

### Phase 2 : LOT 9.1 (Pentest)
- [ ] Scan OWASP ZAP exécuté
- [ ] Scan npm audit/Snyk exécuté
- [ ] Pentest manuel 20 scénarios
- [ ] Corrections vulnérabilités critiques/hautes
- [ ] Rapport pentest final

### Phase 3 : LOT 9.2 (Chaos & Résilience)
- [ ] Tests chaos engineering (5 scénarios)
- [ ] Tests backup/restore (RTO/RPO)
- [ ] Tests failover DB (< 30s)
- [ ] Runbook backup/restore
- [ ] Rapport chaos engineering

---

**Document créé le 25 décembre 2025**  
**Version 1.0**  
**Auteur** : Équipe Plateforme RGPD-IA
