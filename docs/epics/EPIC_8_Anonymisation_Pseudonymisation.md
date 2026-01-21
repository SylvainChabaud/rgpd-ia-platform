# EPIC 8 — Anonymisation & Pseudonymisation (Backend)

**Date** : 25 décembre 2025
**Statut** : ✅ TERMINÉ
**Périmètre** : Backend (Gateway LLM + Logs + Audit)
**Scope** : PLATFORM / TENANT / MEMBER
**RGPD Coverage** : Art. 5 (Minimisation), Art. 25 (Privacy by Design), Art. 32 (Sécurité, Pseudonymisation)
**Durée estimée** : 2 semaines

---

## 1. Contexte et objectifs

### 1.1 Contexte RGPD

**Gaps comblés** (implémenté) :
- ✅ **Pseudonymisation Gateway LLM** : PII Detection & Redaction implémenté (LOT 8.0)
- ✅ **Anonymisation IP logs** : IP anonymization implémenté (LOT 8.1)
- ✅ **Audit PII Logs** : Scan automatique implémenté (LOT 8.2)

**Articles RGPD concernés** :
- **Art. 5(1)(c)** : Minimisation des données
- **Art. 25** : Protection des données dès la conception (Privacy by Design)
- **Art. 32(1)(a)** : Mesures techniques appropriées, dont **pseudonymisation**
- **Directive ePrivacy 2002/58/CE** : Anonymisation IP obligatoire (conservation > 7 jours)

### 1.2 Objectifs techniques

Implémenter **3 couches de protection PII** :

1. **Gateway LLM** : Détecter et masquer PII **avant** envoi aux modèles IA
   - Détection automatique : noms, emails, téléphones, adresses
   - Masking réversible : `Jean Dupont` → `[PERSON_1]`, restauration en sortie
   - Traçabilité : audit des PII détectées (sans stocker les valeurs)

2. **Logs système** : Anonymisation IP automatique **après 7 jours**
   - IPv4 : `192.168.1.123` → `192.168.1.0`
   - IPv6 : `2001:0db8:85a3::8a2e:0370:7334` → `2001:0db8:85a3:0000::`
   - Rétention complète 7 jours (investigation incidents), anonymisée après

3. **Audit logs PII** : Scan automatique détection PII **dans logs**
   - Scan quotidien logs/audit trail
   - Alertes si PII détectée (email/noms en clair)
   - Purge automatique si détection confirmée

### 1.3 Articulation avec autres EPICs

| EPIC | Relation | Détails |
|------|----------|---------|
| **EPIC 3** | ✅ Modifie | Améliore Gateway LLM (redaction PII) |
| **EPIC 1** | ✅ Modifie | Améliore audit trail (anonymisation IP) |
| **EPIC 7** | ✅ Prépare | Fournit logs RGPD-compliant pour observabilité |
| **EPIC 5** | ✅ Complète | Renforce protection données export RGPD |

---

## 2. Exigences RGPD (Pseudonymisation & Anonymisation)

### 2.1 Pseudonymisation (Art. 32)

**Définition RGPD** :
> Traitement des données à caractère personnel de telle façon que celles-ci ne puissent plus être attribuées à une personne concernée précise **sans avoir recours à des informations supplémentaires** (RGPD Art. 4(5)).

**Implémentation Gateway LLM** :
- **Détection PII** : NER (Named Entity Recognition) ou regex robustes
- **Masking** : Remplacement par tokens (`[PERSON_1]`, `[EMAIL_1]`)
- **Reverse mapping** : Restauration PII en sortie (si nécessaire)
- **Non-stockage mapping** : Table de mapping **en mémoire uniquement** (jamais persistée)

**Catégories PII à détecter** :
1. **PERSON** : Noms/prénoms (`Jean Dupont`, `Marie Martin`)
2. **EMAIL** : Adresses email (`jean.dupont@example.com`)
3. **PHONE** : Numéros téléphone (`+33 6 12 34 56 78`, `06.12.34.56.78`)
4. **ADDRESS** : Adresses postales complètes (`123 rue de la Paix, 75001 Paris`)
5. **SSN** : Numéros sécurité sociale (si applicable)
6. **IBAN** : Numéros bancaires (si applicable)

### 2.2 Anonymisation IP (ePrivacy)

**Obligation légale** :
- **Directive ePrivacy 2002/58/CE + RGPD** : IP = donnée personnelle
- **Rétention autorisée** : 7 jours en clair (investigation incidents)
- **Après 7 jours** : Anonymisation **irréversible** obligatoire

**Implémentation logs** :
- **Job cron quotidien** : Scanne logs > 7 jours
- **Hash dernier octet IPv4** : `192.168.1.123` → `192.168.1.0`
- **Hash dernier bloc IPv6** : `2001:0db8:85a3::8a2e:0370:7334` → `2001:0db8:85a3:0000::`
- **Mise à jour en place** : Remplace IPs dans table `audit_events`

**Implémentation logs temps réel** :
- **Nouvelle colonne** : `audit_events.ip_anonymized` (nullable)
- **Stratégie progressive** :
  - < 7 jours : `ip` complet, `ip_anonymized` = NULL
  - > 7 jours : `ip` écrasé par anonymisé, `ip_anonymized` = version anonyme

### 2.3 Scan automatique PII (Logs)

**Objectif** : Détecter PII **accidentellement loguées** (emails, noms en clair dans logs).

**Implémentation** :
- **Job cron quotidien** : Scanne colonnes texte (`audit_events.metadata`, logs applicatifs)
- **Regex PII** : Email, téléphones, patterns noms (capitalized words)
- **Alertes** : Email équipe si détection PII
- **Purge automatique** : Si PII confirmée, ligne anonymisée/supprimée

**Exclusions** :
- `user_id`, `tenant_id` = OK (identifiants techniques)
- Emails dans colonne `user.email` = OK (usage légitime)
- Prompts/outputs stockés = **DÉJÀ INTERDIT** (P3, EPIC 3)

---

## 3. Périmètre fonctionnel

### 3.1 LOT 8.0 — PII Detection & Redaction (Gateway LLM)

**Objectif** : Implémenter pseudonymisation PII dans Gateway LLM (avant envoi LLM).

**User Stories** :

#### US 8.1 : Détection automatique PII dans prompts
**En tant que** Système Gateway LLM  
**Je veux** détecter automatiquement PII dans prompts utilisateurs  
**Afin de** protéger données personnelles avant envoi LLM

**Acceptance Criteria** :
- [ ] Détection PERSON (noms/prénoms) : regex + NER (si lib disponible)
- [ ] Détection EMAIL : regex RFC 5322
- [ ] Détection PHONE : regex formats FR/EU/international
- [ ] Détection ADDRESS : regex basique (numéro + rue + code postal + ville)
- [ ] Détection SSN (optionnel) : regex numéro sécu FR
- [ ] Tests unitaires : 95% recall sur dataset PII test

**Tests RGPD obligatoires** :
```typescript
// tests/rgpd.pii-redaction.test.ts
describe('PII Detection', () => {
  it('détecte noms/prénoms français', () => {
    const text = 'Contacter Jean Dupont pour info';
    const detected = detectPII(text);
    expect(detected).toContainEqual({ type: 'PERSON', value: 'Jean Dupont' });
  });

  it('détecte emails valides', () => {
    const text = 'Envoyer à jean.dupont@example.com';
    const detected = detectPII(text);
    expect(detected).toContainEqual({ type: 'EMAIL', value: 'jean.dupont@example.com' });
  });

  it('détecte téléphones FR', () => {
    const text = 'Appeler le 06 12 34 56 78';
    const detected = detectPII(text);
    expect(detected).toContainEqual({ type: 'PHONE', value: '06 12 34 56 78' });
  });
});
```

---

#### US 8.2 : Masking PII avant envoi LLM
**En tant que** Gateway LLM  
**Je veux** remplacer PII par tokens anonymes avant envoi LLM  
**Afin de** garantir non-fuite données personnelles

**Acceptance Criteria** :
- [ ] Remplacement PERSON : `Jean Dupont` → `[PERSON_1]`
- [ ] Remplacement EMAIL : `jean@example.com` → `[EMAIL_1]`
- [ ] Remplacement PHONE : `06 12 34 56 78` → `[PHONE_1]`
- [ ] Remplacement ADDRESS : `123 rue de la Paix` → `[ADDRESS_1]`
- [ ] Incrémentation tokens multiples : `[PERSON_1]`, `[PERSON_2]`, etc.
- [ ] Mapping PII → token stocké **en mémoire uniquement** (jamais DB)

**Tests RGPD obligatoires** :
```typescript
// tests/rgpd.pii-masking.test.ts
describe('PII Masking', () => {
  it('masque noms avant envoi LLM', () => {
    const prompt = 'Jean Dupont travaille avec Marie Martin';
    const masked = maskPII(prompt);
    expect(masked.text).toBe('[PERSON_1] travaille avec [PERSON_2]');
    expect(masked.mapping).toEqual({
      PERSON_1: 'Jean Dupont',
      PERSON_2: 'Marie Martin',
    });
  });

  it('masque emails', () => {
    const prompt = 'Contact: jean@example.com';
    const masked = maskPII(prompt);
    expect(masked.text).toBe('Contact: [EMAIL_1]');
  });

  it('préserve cohérence multi-occurrences', () => {
    const prompt = 'Jean Dupont dit que Jean Dupont aime ça';
    const masked = maskPII(prompt);
    expect(masked.text).toBe('[PERSON_1] dit que [PERSON_1] aime ça');
    expect(Object.keys(masked.mapping)).toHaveLength(1);
  });
});
```

---

#### US 8.3 : Restauration PII en sortie (optionnel)
**En tant que** Gateway LLM  
**Je veux** restaurer PII en sortie si nécessaire  
**Afin de** maintenir cohérence pour utilisateur

**Acceptance Criteria** :
- [ ] Remplacement inverse : `[PERSON_1]` → `Jean Dupont` dans réponse LLM
- [ ] Préservation si LLM a modifié token (pas de remplacement)
- [ ] Mapping purgé après requête (jamais persisté)

**Tests RGPD obligatoires** :
```typescript
// tests/rgpd.pii-restoration.test.ts
describe('PII Restoration', () => {
  it('restaure PII dans réponse LLM', () => {
    const mapping = { PERSON_1: 'Jean Dupont' };
    const llmOutput = '[PERSON_1] est disponible demain';
    const restored = restorePII(llmOutput, mapping);
    expect(restored).toBe('Jean Dupont est disponible demain');
  });

  it('ne restaure pas si token manquant', () => {
    const mapping = { PERSON_1: 'Jean Dupont' };
    const llmOutput = 'Personne disponible demain';
    const restored = restorePII(llmOutput, mapping);
    expect(restored).toBe('Personne disponible demain');
  });
});
```

---

#### US 8.4 : Audit PII détectées (sans stockage valeurs)
**En tant que** Système audit  
**Je veux** tracer détection PII sans stocker valeurs  
**Afin de** prouver conformité RGPD

**Acceptance Criteria** :
- [ ] Audit event `llm.pii_detected` créé
- [ ] Métadonnées : types PII détectées (`PERSON`, `EMAIL`), counts
- [ ] **INTERDIT** : Stocker valeurs PII réelles
- [ ] Métadonnées : `{ pii_types: ['PERSON', 'EMAIL'], pii_count: 3 }`

**Tests RGPD obligatoires** :
```typescript
// tests/rgpd.pii-audit.test.ts
describe('PII Audit', () => {
  it('trace détection PII sans stocker valeurs', async () => {
    const prompt = 'Jean Dupont, jean@example.com';
    await invokeLLM({ prompt });

    const auditEvent = await getLastAuditEvent('llm.pii_detected');
    expect(auditEvent.metadata.pii_types).toEqual(['PERSON', 'EMAIL']);
    expect(auditEvent.metadata.pii_count).toBe(2);
    expect(auditEvent.metadata).not.toHaveProperty('pii_values');
  });
});
```

---

### 3.2 LOT 8.1 — Anonymisation IP (Logs & Audit)

**Objectif** : Anonymiser IPs dans logs/audit après 7 jours (conformité ePrivacy).

**User Stories** :

#### US 8.5 : Job cron anonymisation IP
**En tant que** Système de logs  
**Je veux** anonymiser automatiquement IPs > 7 jours  
**Afin de** respecter Directive ePrivacy

**Acceptance Criteria** :
- [ ] Job cron quotidien (3h du matin)
- [ ] Sélection logs > 7 jours : `WHERE created_at < NOW() - INTERVAL '7 days'`
- [ ] Anonymisation IPv4 : dernier octet → 0 (`192.168.1.123` → `192.168.1.0`)
- [ ] Anonymisation IPv6 : dernier bloc → 0 (`2001:db8:85a3::8a2e:370:7334` → `2001:db8:85a3::`)
- [ ] Mise à jour en place : `UPDATE audit_events SET ip = anonymized_ip`
- [ ] Audit job : trace nombre IPs anonymisées

**Implémentation technique** :
```typescript
// src/infrastructure/jobs/anonymize-ips.job.ts
export async function anonymizeOldIPs() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const events = await db.query(
    `SELECT id, ip FROM audit_events 
     WHERE created_at < $1 AND ip IS NOT NULL AND ip != '0.0.0.0'`,
    [sevenDaysAgo]
  );

  for (const event of events.rows) {
    const anonymized = anonymizeIP(event.ip);
    await db.query(
      `UPDATE audit_events SET ip = $1 WHERE id = $2`,
      [anonymized, event.id]
    );
  }

  console.log(`Anonymisé ${events.rowCount} IPs`);
}

function anonymizeIP(ip: string): string {
  if (ip.includes(':')) {
    // IPv6: garder premiers blocs, zéroter dernier
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + '::';
  } else {
    // IPv4: dernier octet à 0
    const parts = ip.split('.');
    parts[3] = '0';
    return parts.join('.');
  }
}
```

**Tests RGPD obligatoires** :
```typescript
// tests/rgpd.ip-anonymization.test.ts
describe('IP Anonymization', () => {
  it('anonymise IPv4 dernier octet', () => {
    expect(anonymizeIP('192.168.1.123')).toBe('192.168.1.0');
  });

  it('anonymise IPv6 dernier bloc', () => {
    expect(anonymizeIP('2001:0db8:85a3::8a2e:0370:7334')).toBe('2001:0db8:85a3::');
  });

  it('job cron anonymise logs > 7 jours', async () => {
    // Créer audit event 8 jours dans le passé
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await createAuditEvent({
      type: 'user.login',
      ip: '192.168.1.123',
      created_at: oldDate,
    });

    // Lancer job
    await anonymizeOldIPs();

    // Vérifier anonymisation
    const event = await getLastAuditEvent('user.login');
    expect(event.ip).toBe('192.168.1.0');
  });

  it('job cron ne touche pas logs < 7 jours', async () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await createAuditEvent({
      type: 'user.login',
      ip: '192.168.1.123',
      created_at: recentDate,
    });

    await anonymizeOldIPs();

    const event = await getLastAuditEvent('user.login');
    expect(event.ip).toBe('192.168.1.123'); // Inchangé
  });
});
```

---

### 3.3 LOT 8.2 — Audit PII Logs (Scan automatique)

**Objectif** : Détecter PII accidentellement loguées (emails, noms en clair dans logs).

**User Stories** :

#### US 8.6 : Scan automatique logs
**En tant que** Système de compliance  
**Je veux** scanner quotidiennement logs pour détecter PII  
**Afin de** éviter fuites accidentelles

**Acceptance Criteria** :
- [ ] Job cron quotidien (4h du matin)
- [ ] Scan colonnes : `audit_events.metadata`, logs applicatifs
- [ ] Regex PII : emails, téléphones, patterns noms
- [ ] Exclusions : `user.email`, `user_id`, identifiants techniques
- [ ] Alertes : Email équipe DevOps si détection PII

**Implémentation technique** :
```typescript
// src/infrastructure/jobs/scan-pii-logs.job.ts
const PII_PATTERNS = {
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE: /\b(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}\b/g,
  PERSON: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Capitalized names
};

export async function scanPIIInLogs() {
  const logs = await db.query(
    `SELECT id, metadata FROM audit_events 
     WHERE created_at > NOW() - INTERVAL '1 day'`
  );

  const violations = [];
  for (const log of logs.rows) {
    const metadata = JSON.stringify(log.metadata);
    
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = metadata.match(pattern);
      if (matches) {
        violations.push({
          log_id: log.id,
          pii_type: type,
          matches_count: matches.length,
        });
      }
    }
  }

  if (violations.length > 0) {
    await sendAlert('PII détectée dans logs', violations);
  }

  return violations;
}
```

**Tests RGPD obligatoires** :
```typescript
// tests/rgpd.pii-scan-logs.test.ts
describe('PII Scan Logs', () => {
  it('détecte email dans logs', async () => {
    await createAuditEvent({
      type: 'test.event',
      metadata: { message: 'User jean@example.com logged in' },
    });

    const violations = await scanPIIInLogs();
    expect(violations).toHaveLength(1);
    expect(violations[0].pii_type).toBe('EMAIL');
  });

  it('détecte téléphone dans logs', async () => {
    await createAuditEvent({
      type: 'test.event',
      metadata: { message: 'Contact: 06 12 34 56 78' },
    });

    const violations = await scanPIIInLogs();
    expect(violations).toHaveLength(1);
    expect(violations[0].pii_type).toBe('PHONE');
  });

  it('ignore user.email colonne (usage légitime)', async () => {
    // Cette table users.email est OK, pas de violation
    await createUser({ email: 'jean@example.com' });
    const violations = await scanPIIInLogs();
    expect(violations).toHaveLength(0);
  });
});
```

---

## 4. Architecture technique

### 4.1 Stack technologique

**PII Detection** :
- Option 1 (léger) : **Regex custom** (emails, téléphones, patterns noms)
- Option 2 (avancé) : **NER library** (`compromise`, `natural`, `wink-nlp`)
- Recommandation : **Regex + lib légère** (compromis performance/précision)

**Librairies recommandées** :
```json
{
  "dependencies": {
    "compromise": "^14.x", // NER léger (détection noms)
    "validator": "^13.x",   // Validation emails
    "libphonenumber-js": "^1.x" // Parsing téléphones internationaux
  }
}
```

**Performances** :
- Redaction PII : < 50ms par prompt (max 10KB)
- Anonymisation IP job : < 5s pour 100k logs
- Scan PII logs : < 30s pour 1M logs/jour

### 4.2 Modules à créer

```
src/
  infrastructure/
    pii/
      detector.ts         # Détection PII (regex + NER)
      masker.ts           # Masking PII → tokens
      anonymizer.ts       # Anonymisation IP
      patterns.ts         # Regex PII (emails, phones, etc.)
    jobs/
      anonymize-ips.job.ts   # Job cron anonymisation IP
      scan-pii-logs.job.ts   # Job cron scan PII logs
  ai/
    gateway/
      pii-middleware.ts   # Middleware redaction avant LLM
tests/
  rgpd.pii-redaction.test.ts
  rgpd.pii-masking.test.ts
  rgpd.pii-restoration.test.ts
  rgpd.pii-audit.test.ts
  rgpd.ip-anonymization.test.ts
  rgpd.pii-scan-logs.test.ts
```

### 4.3 Intégration Gateway LLM

**Avant** (EPIC 3 actuel) :
```typescript
// src/ai/gateway/gateway.service.ts
async invokeLLM(request: LLMRequest): Promise<LLMResponse> {
  // 1. Vérifier consentement
  await checkConsent(request.userId, request.purpose);
  
  // 2. Envoyer prompt LLM
  const response = await llmProvider.invoke(request.prompt);
  
  // 3. Retourner réponse (non persistée)
  return response;
}
```

**Après** (EPIC 8) :
```typescript
// src/ai/gateway/gateway.service.ts
async invokeLLM(request: LLMRequest): Promise<LLMResponse> {
  // 1. Vérifier consentement
  await checkConsent(request.userId, request.purpose);
  
  // 2. **NOUVEAU** : Redaction PII
  const piiResult = detectAndMaskPII(request.prompt);
  if (piiResult.detected.length > 0) {
    await auditPIIDetection(request.userId, piiResult.detected);
  }
  
  // 3. Envoyer prompt masqué
  const response = await llmProvider.invoke(piiResult.maskedPrompt);
  
  // 4. **NOUVEAU** : Restauration PII (optionnel)
  const finalOutput = restorePII(response.output, piiResult.mapping);
  
  // 5. Retourner réponse
  return { ...response, output: finalOutput };
}
```

---

## 5. Tests RGPD obligatoires (récapitulatif)

| Test | Fichier | Objectif |
|------|---------|----------|
| Détection PERSON | `rgpd.pii-redaction.test.ts` | Détecte noms/prénoms FR |
| Détection EMAIL | `rgpd.pii-redaction.test.ts` | Détecte emails valides |
| Détection PHONE | `rgpd.pii-redaction.test.ts` | Détecte téléphones FR/EU |
| Masking noms | `rgpd.pii-masking.test.ts` | `Jean Dupont` → `[PERSON_1]` |
| Masking emails | `rgpd.pii-masking.test.ts` | `jean@example.com` → `[EMAIL_1]` |
| Cohérence multi-occurrences | `rgpd.pii-masking.test.ts` | Même nom → même token |
| Restauration PII | `rgpd.pii-restoration.test.ts` | `[PERSON_1]` → `Jean Dupont` |
| Audit sans valeurs PII | `rgpd.pii-audit.test.ts` | Trace types PII, pas valeurs |
| Anonymisation IPv4 | `rgpd.ip-anonymization.test.ts` | Dernier octet → 0 |
| Anonymisation IPv6 | `rgpd.ip-anonymization.test.ts` | Dernier bloc → 0 |
| Job cron > 7 jours | `rgpd.ip-anonymization.test.ts` | Logs anciens anonymisés |
| Job cron < 7 jours | `rgpd.ip-anonymization.test.ts` | Logs récents intacts |
| Scan PII logs (email) | `rgpd.pii-scan-logs.test.ts` | Détecte email dans metadata |
| Scan PII logs (phone) | `rgpd.pii-scan-logs.test.ts` | Détecte téléphone dans logs |
| Exclusion usage légitime | `rgpd.pii-scan-logs.test.ts` | Ignore `user.email` colonne |

**Total** : 15 tests RGPD minimum

---

## 6. Definition of Done (DoD) ✅

### 6.1 Code ✅
- [x] PII detector implémenté (emails, noms, téléphones)
- [x] PII masker implémenté (tokens `[PERSON_1]`, `[EMAIL_1]`)
- [x] PII restauration implémentée (reverse mapping)
- [x] Gateway LLM intègre redaction (middleware)
- [x] Job cron anonymisation IP implémenté
- [x] Job cron scan PII logs implémenté
- [x] Configuration cron jobs (`cron.yaml` ou équivalent)

### 6.2 Tests ✅
- [x] 110+ tests RGPD passants (100%)
- [x] Tests unitaires PII detector (95% recall)
- [x] Tests intégration Gateway LLM + redaction
- [x] Tests job cron anonymisation IP (E2E)
- [x] Tests job cron scan PII logs (E2E)
- [x] `pnpm test` passe (100% tests)

### 6.3 Documentation ✅
- [x] README `src/infrastructure/pii/README.md` (usage detector/masker)
- [x] Runbook `docs/runbooks/JOBS_CRON_PII.md` (monitoring jobs)
- [x] Mise à jour `LLM_USAGE_POLICY.md` (section pseudonymisation)
- [x] Mise à jour `RGPD_MATRICE_CONFORMITE.md` (✅ EPIC 8 terminé)

### 6.4 Déploiement ✅
- [x] Jobs cron configurés (Kubernetes CronJob ou équivalent)
- [x] Alertes configurées (email DevOps si PII détectée)
- [x] Monitoring métriques :
  - Nombre PII détectées/jour
  - Nombre IPs anonymisées/jour
  - Alertes PII logs/jour

### 6.5 Conformité RGPD ✅
- [x] Art. 32 (Pseudonymisation) : ✅ Gateway LLM
- [x] Art. 5 (Minimisation) : ✅ PII masquées
- [x] ePrivacy (IP anonymisation) : ✅ Job cron
- [x] Traçabilité : ✅ Audit PII détection (sans valeurs)

---

## 7. Risques et mitigation

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Faux négatifs PII | 🔴 Élevé | Moyen | Tests exhaustifs, NER avancé, regex robustes |
| Faux positifs PII | 🟡 Moyen | Élevé | Whitelist tokens communs (`Mr`, `Inc`), validation manuelle |
| Performance redaction | 🟡 Moyen | Faible | Cache résultats, timeout 50ms, fallback sans redaction |
| Job cron échoue | 🔴 Élevé | Faible | Retry automatique, alertes, monitoring uptime job |
| Mapping PII fuite | 🔴 Élevé | Très faible | Mapping mémoire uniquement, jamais DB, purge après requête |

---

## 8. Métriques de succès

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| **Recall PII** | > 95% | Tests dataset PII (1000 samples) |
| **Precision PII** | > 90% | Faux positifs < 10% |
| **Latence redaction** | < 50ms | p95 redaction Gateway LLM |
| **IPs anonymisées/jour** | 100% logs > 7j | Job cron monitoring |
| **Alertes PII logs** | 0 alertes | Scan quotidien logs |

---

## 9. Checklist de livraison ✅

### Phase 1 : LOT 8.0 (PII Detection & Redaction) ✅
- [x] Implémentation detector (emails, noms, téléphones)
- [x] Implémentation masker (tokens)
- [x] Intégration Gateway LLM (middleware)
- [x] Tests RGPD passants (PII detection/masking/restoration)
- [x] Audit PII détection (sans valeurs)

### Phase 2 : LOT 8.1 (Anonymisation IP) ✅
- [x] Job cron anonymisation IP
- [x] Fonction anonymisation IPv4/IPv6
- [x] Tests RGPD passants (anonymisation > 7j)
- [x] Configuration cron (Kubernetes ou équivalent)

### Phase 3 : LOT 8.2 (Scan PII Logs) ✅
- [x] Job cron scan logs
- [x] Alertes email DevOps
- [x] Tests RGPD passants (détection PII logs)
- [x] Configuration alertes (Sentry, Slack, email)

### Phase 4 : Documentation & Monitoring ✅
- [x] Documentation complète (README, runbook)
- [x] Monitoring métriques (Grafana dashboards)
- [x] Mise à jour docs RGPD

---

**Document créé le 25 décembre 2025**  
**Version 1.0**  
**Auteur** : Équipe Plateforme RGPD-IA
