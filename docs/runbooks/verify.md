# Runbook de vérification — RGPD IA Platform

Ce runbook définit les étapes de vérification avant toute livraison.

## Checklist obligatoire

### 1. Quality Gate

```bash
npm run quality-gate
```

- [ ] ✅ QUALITY GATE PASSED
- [ ] Pas de secrets détectés
- [ ] Pas de PII non autorisées

### 2. Tests

```bash
npm run test
```

- [ ] Tests unitaires passants
- [ ] Tests d'intégration passants
- [ ] Tests RGPD passants (cf. `docs/testing/RGPD_TESTING.md`)

### 3. Lint & Typecheck

```bash
npm run lint
npm run typecheck
```

- [ ] Aucune erreur de lint
- [ ] Aucune erreur de type

### 4. Vérifications RGPD

- [ ] Isolation des données par tenant vérifiée
- [ ] Droits d'accès testés
- [ ] Export/suppression de données fonctionnels
- [ ] Consentements gérés correctement

### 5. Architecture

- [ ] Frontières respectées (cf. `docs/architecture/BOUNDARIES.md`)
- [ ] Pas d'appel IA direct (Gateway LLM uniquement)
- [ ] Classification des données respectée

## Rapport de livraison

À inclure dans chaque PR :

```markdown
## Livrables
- [ ] Feature X implémentée
- [ ] Tests ajoutés

## Preuves
- Quality gate: PASSED
- Tests: X/Y passants
- Lint/Typecheck: OK

## Limites
- [Indiquer les limites connues]

## Risques
- [Indiquer les risques identifiés]
```

## Référence

- `CLAUDE.md` — Règles de gouvernance
- `docs/testing/RGPD_TESTING.md` — Scénarios de test RGPD
- `tools/quality-gate.ts` — Script de vérification automatique
