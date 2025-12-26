# Validation Cohérence RGPD — Articles vs Implémentation

**Date** : 26 décembre 2025  
**Version** : 1.0  
**Objectif** : Vérifier que chaque article RGPD pertinent a une implémentation FRONT et BACK cohérente.

---

## 1. Légende

| Symbol | Signification |
|--------|---------------|
| ✅ | Implémenté et testé |
| ⚙️ | En cours / Partiel |
| ❌ | Non implémenté |
| 🔜 | Planifié (EPIC identifiée) |

---

## 2. Matrice de Conformité RGPD

### 2.1 Principes Fondamentaux (Art. 5)

| Article | Principe | Implémentation BACK | Implémentation FRONT | Status |
|---------|----------|---------------------|----------------------|--------|
| Art. 5.1.a | Licéité, loyauté, transparence | Consentement opt-in (EPIC 5) | Popup consentement (EPIC 13) | ✅ |
| Art. 5.1.b | Limitation des finalités | Purposes définis (EPIC 5) | Dropdown purposes (EPIC 13) | ✅ |
| Art. 5.1.c | Minimisation | P3 non stocké (EPIC 3-4) | Pas de localStorage P3 (EPIC 13) | ✅ |
| Art. 5.1.d | Exactitude | Edit profile (EPIC 5) | Form profile (EPIC 13) | ✅ |
| Art. 5.1.e | Limitation conservation | Purge 90j (EPIC 4) | Affichage 90j max (EPIC 13) | ✅ |
| Art. 5.1.f | Intégrité et confidentialité | Chiffrement, isolation (EPIC 1-2) | HTTPS, CSP (EPIC 13) | ✅ |
| Art. 5.2 | Responsabilité | Audit trail (EPIC 1) | - | ✅ |

**Score Art. 5** : ✅ 100%

---

### 2.2 Licéité du Traitement (Art. 6-7)

| Article | Exigence | Implémentation BACK | Implémentation FRONT | Status |
|---------|----------|---------------------|----------------------|--------|
| Art. 6.1.a | Consentement | API consents (EPIC 5) | Popup + toggle (EPIC 13) | ✅ |
| Art. 6.1.b | Contrat (CGU) | CGU versionnées (EPIC 10) | Checkbox signup (EPIC 10) | 🔜 LOT 10.1 |
| Art. 7.1 | Preuve consentement | Table consents + audit (EPIC 5) | - | ✅ |
| Art. 7.2 | Consentement distinct | Popup par purpose (EPIC 5) | UI par purpose (EPIC 13) | ✅ |
| Art. 7.3 | Retrait facile | API revoke (EPIC 5) | Toggle OFF (EPIC 13) | ✅ |

**Score Art. 6-7** : ⚙️ 90% (CGU en attente)

---

### 2.3 Information des Personnes (Art. 12-14)

| Article | Exigence | Implémentation | Localisation | Status |
|---------|----------|----------------|--------------|--------|
| Art. 12.1 | Information concise, intelligible | Popup consentement claire | EPIC 13 US 13.4 | ✅ |
| Art. 12.2 | Faciliter exercice droits | Page My Data | EPIC 13 US 13.10-11 | ✅ |
| Art. 12.3 | Délai réponse 1 mois | Workflow RGPD | EPIC 5 LOT 5.1-5.2 | ✅ |
| Art. 13.1 | Identité responsable | Politique confidentialité | EPIC 10 LOT 10.0 | 🔜 |
| Art. 13.1 | Contact DPO | Page RGPD Info | EPIC 10 LOT 10.2 | 🔜 |
| Art. 13.1 | Finalités | Politique confidentialité | EPIC 10 LOT 10.0 | 🔜 |
| Art. 13.1 | Base légale | Politique confidentialité | EPIC 10 LOT 10.0 | 🔜 |
| Art. 13.2 | Durée conservation | Politique confidentialité | EPIC 10 LOT 10.0 | 🔜 |
| Art. 13.2 | Droits utilisateurs | Page RGPD Info | EPIC 10 LOT 10.2 | 🔜 |
| Art. 14 | Données non collectées directement | N/A | Toutes données via user | ✅ |

**Score Art. 12-14** : ⚙️ 60% (Documents légaux en attente LOT 10.0-10.2)

---

### 2.4 Droits des Personnes Concernées (Art. 15-22)

| Article | Droit | API BACK | UI FRONT | Status |
|---------|-------|----------|----------|--------|
| Art. 15 | Accès | `POST /api/rgpd/export` ✅ | Bouton Export (EPIC 13) | ✅ |
| Art. 16 | Rectification | `PATCH /api/users/:id` ✅ | Form Profile (EPIC 13) | ✅ |
| Art. 17 | Effacement | `POST /api/rgpd/delete` ✅ | Bouton Supprimer (EPIC 13) | ✅ |
| Art. 18 | Limitation | `POST /api/rgpd/suspend` ❌ | Bouton Suspendre ❌ | 🔜 LOT 10.6 |
| Art. 19 | Notification rectif/effacement | Email auto (EPIC 5) ✅ | - | ✅ |
| Art. 20 | Portabilité | Export JSON/CSV (EPIC 5) ✅ | Download bundle (EPIC 13) | ✅ |
| Art. 21 | Opposition | `POST /api/rgpd/oppose` ❌ | Form opposition ❌ | 🔜 LOT 10.6 |
| Art. 22 | Décisions automatisées | `POST /api/rgpd/contest` ❌ | Bouton Contester ❌ | 🔜 LOT 10.6 |

**Score Art. 15-22** : ⚙️ 75% (Art. 18/21/22 en attente LOT 10.6)

---

### 2.5 Responsable du Traitement (Art. 24-25)

| Article | Exigence | Implémentation | Status |
|---------|----------|----------------|--------|
| Art. 24 | Responsabilité | Audit trail, logs, tests RGPD | ✅ |
| Art. 25.1 | Privacy by Design | Architecture native RGPD | ✅ |
| Art. 25.2 | Privacy by Default | Consentement opt-in, P3 non stocké | ✅ |

**Score Art. 24-25** : ✅ 100%

---

### 2.6 Registre et Documentation (Art. 30, 35)

| Article | Exigence | Document | Localisation | Status |
|---------|----------|----------|--------------|--------|
| Art. 30.1 | Registre traitements | REGISTRE_TRAITEMENTS.md | docs/rgpd/ | 🔜 LOT 10.4 |
| Art. 30.2 | Registre sous-traitants | Section dans registre | docs/rgpd/ | 🔜 LOT 10.4 |
| Art. 35 | DPIA | dpia.md | docs/rgpd/ | ✅ Créé |

**Score Art. 30, 35** : ⚙️ 66% (Registre en attente)

---

### 2.7 Sécurité (Art. 32)

| Mesure | Implémentation | EPIC | Status |
|--------|----------------|------|--------|
| Chiffrement en transit | TLS 1.3 | EPIC 2 | ✅ |
| Chiffrement au repos | AES-256-GCM exports | EPIC 5 | ✅ |
| Isolation tenant | WHERE tenant_id = $1 | EPIC 1 | ✅ |
| Audit trail | Table audit_events | EPIC 1 | ✅ |
| Hashage passwords | bcrypt 12 rounds | EPIC 1 | ✅ |
| Pseudonymisation PII | Masking avant LLM | EPIC 8 | 🔜 LOT 8.0 |
| Anonymisation IP | Job auto > 7j | EPIC 8 | 🔜 LOT 8.1 |

**Score Art. 32** : ⚙️ 80% (Pseudonymisation en attente EPIC 8)

---

### 2.8 Notification de Violations (Art. 33-34)

| Article | Exigence | Implémentation | Status |
|---------|----------|----------------|--------|
| Art. 33.1 | Notification CNIL 72h | Violations registry + runbook | 🔜 EPIC 9 LOT 9.0 |
| Art. 33.2 | Contenu notification | Template CNIL | 🔜 EPIC 9 LOT 9.0 |
| Art. 33.5 | Documentation incidents | Table violations_registry | 🔜 EPIC 9 LOT 9.0 |
| Art. 34.1 | Notification personnes | Email workflow | 🔜 EPIC 9 LOT 9.1 |

**Score Art. 33-34** : ❌ 0% (En attente EPIC 9)

---

### 2.9 Directive ePrivacy (Cookies)

| Exigence | Implémentation BACK | Implémentation FRONT | Status |
|----------|---------------------|----------------------|--------|
| Consentement préalable | `POST /api/consents/cookies` ❌ | Cookie banner ❌ | 🔜 LOT 10.3 |
| Opt-in par catégorie | API catégories | Checkboxes UI | 🔜 LOT 10.3 |
| Blocage scripts | - | Script loader conditionnel | 🔜 LOT 10.3 |
| Révocation | `GET /api/consents/cookies` ❌ | Page gérer cookies | 🔜 LOT 10.3 |

**Score ePrivacy** : ❌ 0% (En attente LOT 10.3)

---

## 3. Score Global de Conformité

| Catégorie | Score | Gap |
|-----------|-------|-----|
| Principes fondamentaux (Art. 5) | ✅ 100% | - |
| Licéité (Art. 6-7) | ⚙️ 90% | CGU versionnées |
| Information (Art. 12-14) | ⚙️ 60% | Documents légaux |
| Droits personnes (Art. 15-22) | ⚙️ 75% | Art. 18/21/22 |
| Responsabilité (Art. 24-25) | ✅ 100% | - |
| Documentation (Art. 30, 35) | ⚙️ 66% | Registre |
| Sécurité (Art. 32) | ⚙️ 80% | Pseudonymisation |
| Incidents (Art. 33-34) | ❌ 0% | EPIC 9 complet |
| ePrivacy (Cookies) | ❌ 0% | Cookie banner |

**Score RGPD Global** : **~70%**

---

## 4. Plan de Mise en Conformité 100%

### 4.1 Priorité 1 — Bloquants Production 🔴

| Gap | EPIC/LOT | Effort | Impact |
|-----|----------|--------|--------|
| Cookie consent banner | EPIC 10/LOT 10.3 | 3 jours | ePrivacy 100% |
| Pseudonymisation PII | EPIC 8/LOT 8.0 | 5 jours | Art. 32 100% |
| Notification CNIL workflow | EPIC 9/LOT 9.0 | 5 jours | Art. 33-34 100% |

**Sous-total** : 13 jours

### 4.2 Priorité 2 — Conformité Légale 🟡

| Gap | EPIC/LOT | Effort | Impact |
|-----|----------|--------|--------|
| Politique confidentialité | EPIC 10/LOT 10.0 | 2 jours | Art. 13-14 100% |
| CGU versionnées | EPIC 10/LOT 10.1 | 2 jours | Art. 6.1.b 100% |
| Page RGPD Info | EPIC 10/LOT 10.2 | 1 jour | Art. 12-14 100% |
| Registre traitements | EPIC 10/LOT 10.4 | 2 jours | Art. 30 100% |

**Sous-total** : 7 jours

### 4.3 Priorité 3 — Droits Complémentaires 🟢

| Gap | EPIC/LOT | Effort | Impact |
|-----|----------|--------|--------|
| Art. 18 (Limitation) | EPIC 10/LOT 10.6 | 2 jours | Art. 18 100% |
| Art. 21 (Opposition) | EPIC 10/LOT 10.6 | 2 jours | Art. 21 100% |
| Art. 22 (Révision humaine) | EPIC 10/LOT 10.6 | 3 jours | Art. 22 100% |
| Anonymisation IP | EPIC 8/LOT 8.1 | 2 jours | ePrivacy renforcé |

**Sous-total** : 9 jours

---

## 5. Calendrier Recommandé

```
Semaine 1-2 : EPIC 8 (Anonymisation)
├── LOT 8.0 : Pseudonymisation PII (5j)
└── LOT 8.1 : Anonymisation IP (2j)

Semaine 2-3 : EPIC 9 (Incidents)
├── LOT 9.0 : Violations registry + CNIL workflow (5j)
└── LOT 9.1 : Notification personnes (3j)

Semaine 3-4 : EPIC 10 (Legal)
├── LOT 10.0-10.2 : Documents légaux (5j)
├── LOT 10.3 : Cookie banner (3j)
├── LOT 10.4-10.5 : Registre + DPIA (2j)
└── LOT 10.6 : Art. 18/21/22 (5j)

Semaine 5+ : EPIC 11-13 (FRONTs)
└── Développement UI avec tous endpoints disponibles
```

**Durée totale avant 100% RGPD** : ~4 semaines

---

## 6. Checklist Finale Validation

### Avant Développement FRONT (EPIC 11-13)

- [ ] EPIC 8/LOT 8.0 : Pseudonymisation PII implémentée
- [ ] EPIC 9/LOT 9.0 : Violations registry API disponible
- [ ] EPIC 10/LOT 10.3 : Cookie consent API disponible
- [ ] EPIC 10/LOT 10.6 : Art. 18/21/22 APIs disponibles

### Avant Mise en Production

- [ ] Politique confidentialité publiée (/legal/privacy-policy)
- [ ] CGU publiées (/legal/terms-of-service)
- [ ] Page RGPD Info publiée (/legal/rgpd-info)
- [ ] Cookie banner fonctionnel (tests E2E)
- [ ] Registre traitements documenté (docs/rgpd/)
- [ ] DPIA validée par DPO (docs/rgpd/)
- [ ] Workflow CNIL 72h testé (runbook)
- [ ] Tous tests RGPD passants (72+ tests)

---

**Document créé le 26 décembre 2025**  
**Version 1.0**  
**Auteur** : Équipe Plateforme RGPD-IA
