# Guide de setup Ollama (LOT 3.0 POC)

> **Objectif** : Guide pratique pour démarrer et utiliser le provider Ollama local dans le cadre du LOT 3.0.

---

## 1. Prérequis

- Docker et Docker Compose installés
- 2GB RAM disponible minimum
- ~1GB espace disque (pour le modèle tinyllama)

---

## 2. Démarrage rapide (Docker)

### 2.1 Lancer l'infrastructure complète

```bash
# Depuis la racine du projet
docker compose -f docker-compose.dev.yml up -d

# Vérifier que tous les services sont OK
docker compose -f docker-compose.dev.yml ps
```

**Services lancés** :
- `db` : PostgreSQL (port 5432, non exposé)
- `ollama` : Ollama LLM (port 11434, non exposé)
- `app` : Next.js (port 3000, exposé)

### 2.2 Télécharger le modèle tinyllama

**Première utilisation uniquement** :

```bash
# Télécharger tinyllama (~800MB)
docker exec rgpd-platform-ollama-poc ollama pull tinyllama

# Vérifier que le modèle est installé
docker exec rgpd-platform-ollama-poc ollama list
```

**Sortie attendue** :

```
NAME            ID              SIZE    MODIFIED
tinyllama:latest 2af3b81862c6    637 MB  2 minutes ago
```

### 2.3 Tester Ollama

```bash
# Test healthcheck
docker exec rgpd-platform-ollama-poc curl -f http://localhost:11434/api/tags

# Test génération (rapide)
docker exec rgpd-platform-ollama-poc ollama run tinyllama "Hello, this is a test"
```

---

## 3. Configuration de l'application

### 3.1 Variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```bash
# Activer le provider Ollama
AI_PROVIDER=ollama

# URL Ollama (Docker)
OLLAMA_URL=http://ollama:11434

# Modèle à utiliser
OLLAMA_MODEL=tinyllama

# Timeout (ms)
OLLAMA_TIMEOUT=30000
```

### 3.2 Redémarrer l'app

```bash
# Redémarrer uniquement l'app (pour prendre en compte les variables)
docker compose -f docker-compose.dev.yml restart app

# Ou relancer complètement
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

---

## 4. Benchmark de latence

### 4.1 Exécuter le bench

```bash
# Depuis la racine du projet
AI_PROVIDER=ollama tsx scripts/bench-llm.ts
```

**Sortie attendue** :

```
=== LLM Latency Benchmark (LOT 3.0 POC) ===
Provider: ollama
Prompts: 10 fictitious prompts

[1/10] Invoking LLM...
  ✓ Latency: 1.23s
  ✓ Tokens: 42 in / 58 out

[2/10] Invoking LLM...
  ✓ Latency: 945ms
  ✓ Tokens: 38 in / 62 out

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

### 4.2 Interpréter les résultats

**Latences attendues** (tinyllama, CPU uniquement) :
- **P50** : 1-2s (acceptable pour POC)
- **P95** : 2-3s (acceptable pour POC)
- **P99** : 3-5s (acceptable pour POC)

⚠️ **Performances CPU** : Ollama sans GPU est plus lent. Pour des performances optimales, utiliser une machine avec GPU compatible.

---

## 5. Modèles alternatifs (POC)

### 5.1 Modèles légers recommandés

| Modèle | Taille | Performances | Cas d'usage |
|--------|--------|--------------|-------------|
| `tinyllama` | 637 MB | Rapide (CPU OK) | POC, tests, bench |
| `phi` | 1.6 GB | Moyen | POC avancé |
| `gemma:2b` | 1.4 GB | Moyen | Classification |
| `qwen2:1.5b` | 934 MB | Rapide | Extraction |

### 5.2 Changer de modèle

```bash
# Télécharger un nouveau modèle
docker exec rgpd-platform-ollama-poc ollama pull phi

# Lister les modèles installés
docker exec rgpd-platform-ollama-poc ollama list

# Modifier .env.local
OLLAMA_MODEL=phi

# Redémarrer l'app
docker compose -f docker-compose.dev.yml restart app
```

### 5.3 Modèles NON recommandés (POC)

❌ **Éviter pour le POC** :
- `llama3` (4.7 GB) : Trop lourd, nécessite GPU
- `mistral` (4.1 GB) : Trop lourd, nécessite GPU
- `mixtral` (26 GB) : Trop lourd, GPU obligatoire

---

## 6. Dépannage

### 6.1 Ollama ne démarre pas

**Symptôme** : `docker compose ps` montre `ollama` en status `unhealthy` ou `restarting`

**Solutions** :

```bash
# Vérifier les logs
docker logs rgpd-platform-ollama-poc

# Redémarrer le service
docker compose -f docker-compose.dev.yml restart ollama

# Si le problème persiste, supprimer le volume et recommencer
docker compose -f docker-compose.dev.yml down
docker volume rm rgpd-ia-platform_ollama_data
docker compose -f docker-compose.dev.yml up -d
```

### 6.2 Erreur "model not found"

**Symptôme** : `Error: model 'tinyllama' not found`

**Solution** :

```bash
# Télécharger le modèle
docker exec rgpd-platform-ollama-poc ollama pull tinyllama

# Vérifier
docker exec rgpd-platform-ollama-poc ollama list
```

### 6.3 Timeouts fréquents

**Symptôme** : `Error: Ollama provider timeout after 30000ms`

**Solutions** :

1. **Augmenter le timeout** (`.env.local`) :

```bash
OLLAMA_TIMEOUT=60000
```

2. **Utiliser un modèle plus léger** :

```bash
OLLAMA_MODEL=tinyllama  # Plus rapide
```

3. **Vérifier les ressources Docker** :

```bash
# Allouer plus de RAM à Docker (Docker Desktop > Settings > Resources)
# Recommandé : 4GB RAM minimum
```

### 6.4 Bench échoue avec "fetch failed"

**Symptôme** : `Error: fetch failed` ou `ECONNREFUSED`

**Solutions** :

```bash
# Vérifier qu'Ollama est démarré
docker compose -f docker-compose.dev.yml ps

# Vérifier l'URL Ollama
echo $OLLAMA_URL
# Doit être : http://ollama:11434 (Docker) ou http://localhost:11434 (local)

# Tester manuellement
docker exec rgpd-platform-ollama-poc curl http://localhost:11434/api/tags
```

---

## 7. Setup local (hors Docker)

### 7.1 Installer Ollama en local

**macOS / Linux** :

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows** :

Télécharger l'installateur depuis [ollama.com/download](https://ollama.com/download)

### 7.2 Démarrer Ollama

```bash
# Démarrer le serveur (port 11434)
ollama serve

# Dans un autre terminal, télécharger le modèle
ollama pull tinyllama

# Tester
ollama run tinyllama "Hello, this is a test"
```

### 7.3 Configurer l'application

**`.env.local`** :

```bash
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=tinyllama
```

### 7.4 Exécuter le bench

```bash
AI_PROVIDER=ollama tsx scripts/bench-llm.ts
```

---

## 8. Mode production (hors scope LOT 3.0)

⚠️ **LOT 3.0 = POC uniquement**. Pour une utilisation production :

1. **GPU requis** : Performances CPU insuffisantes
2. **Modèles plus performants** : llama3, mistral, etc.
3. **Scaling** : Load balancing, réplication
4. **Monitoring** : Métriques, alertes, healthchecks
5. **Sécurité** : Réseau isolé, pas d'exposition externe
6. **Redaction** : Gateway doit implémenter la redaction active (LOT futur)

---

## 9. Nettoyage

### 9.1 Arrêter tous les services

```bash
docker compose -f docker-compose.dev.yml down
```

### 9.2 Supprimer les volumes (reset complet)

```bash
# ATTENTION : Supprime TOUTES les données (PostgreSQL + Ollama)
docker compose -f docker-compose.dev.yml down -v

# Ou supprimer uniquement le volume Ollama
docker volume rm rgpd-ia-platform_ollama_data
```

### 9.3 Supprimer les images

```bash
# Lister les images
docker images | grep ollama

# Supprimer l'image Ollama
docker rmi ollama/ollama:latest
```

---

## 10. Commandes utiles (référence)

### Docker Compose

```bash
# Démarrer tout
docker compose -f docker-compose.dev.yml up -d

# Démarrer uniquement Ollama
docker compose -f docker-compose.dev.yml up -d ollama

# Arrêter tout
docker compose -f docker-compose.dev.yml down

# Logs temps réel
docker logs -f rgpd-platform-ollama-poc

# Shell dans le container
docker exec -it rgpd-platform-ollama-poc sh
```

### Ollama CLI

```bash
# Lister les modèles
docker exec rgpd-platform-ollama-poc ollama list

# Télécharger un modèle
docker exec rgpd-platform-ollama-poc ollama pull <model>

# Supprimer un modèle
docker exec rgpd-platform-ollama-poc ollama rm <model>

# Tester un modèle
docker exec rgpd-platform-ollama-poc ollama run <model> "prompt"

# API tags
docker exec rgpd-platform-ollama-poc curl http://localhost:11434/api/tags
```

### Tests

```bash
# Tous les tests (53)
npm test

# Test no-prompt-storage (LOT 3.0)
npm test rgpd.no-prompt-storage

# Test no-llm-bypass
npm test rgpd.no-llm-bypass
```

### Bench

```bash
# Bench Ollama
AI_PROVIDER=ollama tsx scripts/bench-llm.ts

# Bench stub (CI)
AI_PROVIDER=stub tsx scripts/bench-llm.ts
```

---

## 11. Ressources

### Documentation Ollama

- [Ollama Official Docs](https://github.com/ollama/ollama/blob/main/docs/README.md)
- [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Ollama Model Library](https://ollama.com/library)

### Documentation projet

- [LOT3_IMPLEMENTATION.md](../implementation/LOT3_IMPLEMENTATION.md) — Documentation complète LOT 3.0
- [LLM_USAGE_POLICY.md](../ai/LLM_USAGE_POLICY.md) — Politique d'usage LLM
- [TASKS.md](../../TASKS.md) — Roadmap EPIC/LOTS

---

**Guide produit dans le cadre du LOT 3.0 — EPIC 3 : Validation technique IA locale (POC contrôlé)**
