# LOT 3.0 - Provider IA local POC branché à la Gateway

> **EPIC 3** : Validation technique IA locale (POC contrôlé)
> **Statut** : ✅ Implémenté
> **Date** : 2025-12-24

---

## 1. Objectifs du LOT 3.0

Valider la faisabilité d'un provider IA local en conditions contrôlées, tout en garantissant une conformité RGPD stricte.

### Acceptance Criteria (bloquants)

- [x] Prompts/outputs NON persistés par défaut
- [x] IA accessible uniquement via la Gateway LLM (pas de bypass)
- [x] Provider local (Ollama) branché sur `invokeLLM()`
- [x] Bench latence sur données fictives uniquement (P0)
- [x] Tests RGPD obligatoires passants

---

## 2. Architecture implémentée

### 2.1 Composants créés

```
src/ai/gateway/
├── config.ts                    # Configuration providers (stub | ollama)
├── invokeLLM.ts                 # Gateway LLM avec routing (modifié)
└── providers/
    ├── types.ts                 # Types communs providers
    ├── stub.ts                  # Provider stub (existant, inchangé)
    └── ollama.ts                # Provider Ollama local (nouveau)

docker-compose.dev.yml           # Service Ollama ajouté (modifié)

scripts/
└── bench-llm.ts                 # Bench latence minimal (nouveau)

tests/
└── rgpd.no-prompt-storage.test.ts  # Test bloquant LOT 3.0 (nouveau)

docs/implementation/
└── LOT3_IMPLEMENTATION.md       # Ce document
```

### 2.2 Flux d'appel

```
Frontend / API
      ↓
invokeLLM() [Gateway LLM unique]
      ↓
   config.ts (AI_PROVIDER)
      ↓
   ┌──────────┬──────────┐
   │   stub   │  ollama  │
   └──────────┴──────────┘
        ↓           ↓
   Réponse    Ollama local
   fictive    (http://ollama:11434)
```

**Conformité** :
- ✅ Gateway unique ([BOUNDARIES.md](../architecture/BOUNDARIES.md))
- ✅ Aucun bypass possible (test `rgpd.no-llm-bypass.test.ts`)
- ✅ Providers stateless (aucun stockage)

---

## 3. Provider Ollama (local POC)

### 3.1 Caractéristiques

- **Image** : `ollama/ollama:latest`
- **Réseau** : `rgpd_internal` (isolé)
- **Ports** : NON exposés (accès interne uniquement)
- **Modèle** : `tinyllama` (léger, POC)
- **Volume** : `ollama_data` (persistance modèles uniquement)

### 3.2 Contraintes RGPD

**Conformité stricte** :
- ❌ AUCUN stockage prompts/outputs ([LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md) §6)
- ❌ AUCUN log de contenu (événements uniquement)
- ✅ Données fictives uniquement (P0)
- ✅ Isolation réseau complète (pas de flux externe)
- ✅ Stateless (pas d'historique, pas de cache)

### 3.3 Configuration

Variables d'environnement (`.env` ou `docker-compose.dev.yml`) :

```bash
# Provider actif (stub | ollama)
AI_PROVIDER=ollama

# Ollama configuration
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=tinyllama
OLLAMA_TIMEOUT=30000
```

**Valeurs par défaut** :
- `AI_PROVIDER=stub` (fallback sécurisé)
- `OLLAMA_URL=http://localhost:11434`
- `OLLAMA_MODEL=tinyllama`

---

## 4. Tests RGPD (LOT 3.0)

### 4.1 Tests obligatoires (bloquants)

| Test | Fichier | Statut | Conformité |
|------|---------|--------|-----------|
| No prompt storage | `rgpd.no-prompt-storage.test.ts` | ✅ Passant | LLM_USAGE_POLICY §6 |
| No LLM bypass | `rgpd.no-llm-bypass.test.ts` | ✅ Passant | BOUNDARIES.md §6 |
| No sensitive logs | `rgpd.no-sensitive-logs.test.ts` | ✅ Passant | DATA_CLASSIFICATION §7 |

### 4.2 Test "No Prompt Storage" (nouveau)

**Objectif** : Vérifier que AUCUN prompt ou output n'est persisté.

**Assertions** :
1. ✅ Aucun pattern de stockage DB dans le code source
2. ✅ Invocation LLM ne persiste rien
3. ✅ Pas de cache entre invocations
4. ✅ Pas de table DB pour prompts/outputs

**Couverture** :
- Scan statique des patterns interdits (`INSERT INTO prompts`, `.create({ prompt: ... })`)
- Test runtime (double invocation, pas de cache)
- Validation schéma DB (pas de tables prompts/outputs)

---

## 5. Bench latence minimal

### 5.1 Usage

**Prérequis** : Ollama en cours d'exécution (Docker ou local)

```bash
# Lancer Ollama (Docker)
docker compose -f docker-compose.dev.yml up -d ollama

# Télécharger le modèle (première fois uniquement)
docker exec rgpd-platform-ollama-poc ollama pull tinyllama

# Exécuter le bench
AI_PROVIDER=ollama tsx scripts/bench-llm.ts
```

**Avec provider stub** (tests CI) :

```bash
AI_PROVIDER=stub tsx scripts/bench-llm.ts
```

### 5.2 Prompts fictifs (P0 uniquement)

Le bench utilise **10 prompts fictifs** (données publiques, non personnelles, non sensibles) :

- Résumé de texte Lorem Ipsum
- Catégorisation de documents types
- Extraction de champs structurés fictifs
- Reformulation de texte technique générique
- Détection de type de document
- Normalisation de processus
- Suggestions UI génériques
- Classification de demandes
- Identification d'entités fictives
- Résumé d'articles techniques

**Conformité** :
- ✅ P0 uniquement ([DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md))
- ✅ Aucune donnée réelle, personnelle ou sensible
- ✅ Résultats NON persistés (console uniquement)

### 5.3 Métriques mesurées

- **Latence** : Min, P50, Avg, P95, P99, Max
- **Tokens** : Total input, total output, moyennes

**Exemple de sortie** :

```
=== LLM Latency Benchmark (LOT 3.0 POC) ===
Provider: ollama
Prompts: 10 fictitious prompts

[1/10] Invoking LLM...
  ✓ Latency: 1.23s
  ✓ Tokens: 42 in / 58 out

...

=== Benchmark Results ===
Successful invocations: 10/10

Latency statistics:
  Min:  852ms
  P50:  1.15s
  Avg:  1.23s
  P95:  1.89s
  P99:  2.01s
  Max:  2.01s

Token statistics:
  Total input tokens:  385
  Total output tokens: 612
  Avg input tokens:    39
  Avg output tokens:   61

✓ Benchmark completed
```

---

## 6. Setup développement local

### 6.1 Démarrage complet (Docker)

```bash
# Lancer l'infra complète (PostgreSQL + Ollama + App)
docker compose -f docker-compose.dev.yml up -d

# Vérifier les services
docker compose -f docker-compose.dev.yml ps

# Logs Ollama
docker logs rgpd-platform-ollama-poc

# Healthcheck Ollama
docker exec rgpd-platform-ollama-poc curl -f http://localhost:11434/api/tags
```

### 6.2 Téléchargement du modèle

**Première utilisation uniquement** :

```bash
# Télécharger tinyllama (léger, ~800MB)
docker exec rgpd-platform-ollama-poc ollama pull tinyllama

# Vérifier les modèles installés
docker exec rgpd-platform-ollama-poc ollama list
```

**Modèles alternatifs** (POC) :

- `phi` : Microsoft Phi (1.3B params)
- `gemma:2b` : Google Gemma 2B
- `qwen2:1.5b` : Qwen 1.5B

**⚠️ Attention** : Modèles plus lourds (llama3, mistral) non recommandés pour POC (ressources CPU/RAM).

### 6.3 Test manuel

```bash
# Depuis l'app Next.js (dans le container)
docker exec -it rgpd-platform-app-dev sh

# Ou en local (si Ollama exposé)
curl http://localhost:11434/api/generate -d '{
  "model": "tinyllama",
  "prompt": "Hello, this is a test",
  "stream": false
}'
```

---

## 7. Conformité RGPD (validation)

### 7.1 Definition of Done (CLAUDE.md §7)

- [x] Frontières d'architecture respectées (Gateway seule entrée)
- [x] Aucun appel IA hors Gateway LLM (test validé)
- [x] Aucune donnée sensible en logs (test validé)
- [x] Classification données respectée (P0 uniquement dans bench)
- [x] Tests fonctionnels passants (provider Ollama OK)
- [x] Tests RGPD passants (no-prompt-storage OK)
- [x] Comportement échec défini (timeout, error handling)
- [x] Fonctionnalité validée (bench latence OK)
- [x] Traçabilité RGPD minimale (events only, pas de contenu)

### 7.2 Checklist LLM_USAGE_POLICY.md §10

- [x] Usage autorisé (POC contrôlé, transformation/classification)
- [x] Modèle local privilégié (Ollama)
- [x] Gateway utilisée (routing via `invokeLLM()`)
- [x] Données minimisées (prompts fictifs P0)
- [x] Pas de logs sensibles (events uniquement)
- [x] Tests ajoutés (no-prompt-storage)

### 7.3 Preuves de conformité

**Artefacts produits** (auditables) :

1. ✅ Tests RGPD passants (49 + 4 = 53 tests)
2. ✅ Scan statique anti-bypass (`rgpd.no-llm-bypass.test.ts`)
3. ✅ Scan patterns stockage (`rgpd.no-prompt-storage.test.ts`)
4. ✅ Bench latence sur données fictives (console output)
5. ✅ Documentation normative ([BOUNDARIES.md](../architecture/BOUNDARIES.md), [LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md))

---

## 8. Limitations & points de vigilance

### 8.1 Limitations POC

- ⚠️ **Modèle léger** : tinyllama a des capacités limitées (POC uniquement)
- ⚠️ **Pas de GPU** : Inférence CPU uniquement (latences plus élevées)
- ⚠️ **Pas de streaming** : Réponses complètes uniquement (POC)
- ⚠️ **Pas de redaction** : Gateway ne fait PAS encore de redaction active (LOT futur)

### 8.2 Risques identifiés & mitigations

| Risque | Mitigation |
|--------|-----------|
| Fuite réseau Ollama | ✅ Ports NON exposés, réseau interne uniquement |
| Stockage involontaire prompts | ✅ Test bloquant + scan statique |
| Logs sensibles | ✅ Test existant `no-sensitive-logs` |
| Données réelles en bench | ✅ P0 uniquement, données fictives strictes |
| Dépendance Ollama prod | ✅ Stub reste fallback, config explicite |

### 8.3 Points de vigilance opérationnels

- 📌 **Ressources** : Ollama nécessite ~2GB RAM + CPU pour tinyllama
- 📌 **Premier démarrage** : Téléchargement modèle (~800MB) requis
- 📌 **Healthcheck** : 60s start_period (Ollama peut être lent au boot)
- 📌 **Logs** : Ollama génère des logs techniques (pas de logs métier)

---

## 9. Évolutions futures (hors LOT 3.0)

### LOT 4.0+ (Stockage RGPD)

- [ ] Implémenter table `ai_jobs` (métadonnées uniquement, pas de contenu)
- [ ] Valider que test "no prompt storage" reste passant
- [ ] Politique de rétention stricte (si stockage métadonnées)

### LOT 5.0+ (Pipeline RGPD)

- [ ] Intégrer Gateway avec enforcement consentement
- [ ] Journalisation audit events IA (sans contenu)

### LOT 6.0+ (Production-ready)

- [ ] Évaluer modèles locaux plus performants (avec GPU)
- [ ] Implémenter streaming (si requis)
- [ ] Redaction active dans Gateway (avant envoi provider)
- [ ] Kill switch LLM (circuit breaker)

---

## 10. Commandes utiles

### Docker

```bash
# Démarrer uniquement Ollama
docker compose -f docker-compose.dev.yml up -d ollama

# Arrêter tout
docker compose -f docker-compose.dev.yml down

# Logs en temps réel
docker logs -f rgpd-platform-ollama-poc

# Supprimer les volumes (reset complet)
docker compose -f docker-compose.dev.yml down -v
```

### Tests

```bash
# Tous les tests (49 + 4 = 53)
npm test

# Test spécifique LOT 3.0
npm test rgpd.no-prompt-storage

# Test anti-bypass
npm test rgpd.no-llm-bypass
```

### Bench

```bash
# Bench avec Ollama (local)
AI_PROVIDER=ollama tsx scripts/bench-llm.ts

# Bench avec stub (CI)
AI_PROVIDER=stub tsx scripts/bench-llm.ts
```

---

## 11. Références

### Documents normatifs

- [TASKS.md](../../TASKS.md) — LOT 3.0 (lignes 290-312)
- [CLAUDE.md](../../CLAUDE.md) — Règles développement IA
- [BOUNDARIES.md](../architecture/BOUNDARIES.md) — Frontières d'architecture
- [LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md) — Politique d'usage LLM
- [DATA_CLASSIFICATION.md](../data/DATA_CLASSIFICATION.md) — Classification données
- [RGPD_TESTING.md](../testing/RGPD_TESTING.md) — Tests RGPD

### Implémentations

- [src/ai/gateway/invokeLLM.ts](../../src/ai/gateway/invokeLLM.ts) — Gateway LLM
- [src/ai/gateway/providers/ollama.ts](../../src/ai/gateway/providers/ollama.ts) — Provider Ollama
- [src/ai/gateway/config.ts](../../src/ai/gateway/config.ts) — Configuration
- [tests/rgpd.no-prompt-storage.test.ts](../../tests/rgpd.no-prompt-storage.test.ts) — Test bloquant
- [scripts/bench-llm.ts](../../scripts/bench-llm.ts) — Bench latence

### Documentation externe

- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Ollama Docker](https://hub.docker.com/r/ollama/ollama)

---

**Document produit dans le cadre du LOT 3.0 — EPIC 3 : Validation technique IA locale (POC contrôlé)**

**Conformité** : ✅ FULL RGPD
