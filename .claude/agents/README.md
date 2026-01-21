# Agents Claude Code — RGPD IA Platform

Ce répertoire contient les agents spécialisés pour le projet.

## Agents disponibles

| Agent | Description | Outils | Utilisation |
|-------|-------------|--------|-------------|
| **rgpd-auditor** | Audit de conformité RGPD | Read, Glob, Grep | Avant release, revue données |
| **security-reviewer** | Revue de sécurité | Read, Glob, Grep | PRs, features auth/authz |
| **architecture-guardian** | Validation architecture | Read, Glob, Grep | Nouveaux modules, refactoring |
| **test-analyst** | Analyse couverture tests | Read, Glob, Grep, Bash | Amélioration qualité tests |
| **code-reviewer** | Revue qualité code | Read, Glob, Grep | PRs, code review |
| **const-refactor** | Refactoring constantes hardcodées | Read, Glob, Grep, Edit, Write, Bash | Consolidation constantes par domaine |
| **ui-tester** | Tests UI via chrome-devtools MCP | Read, Glob, Grep, Bash + MCP | Tests visuels, performance, débogage |

## Orchestration complète

Pour exécuter **tous les agents en série** avec rapport consolidé, utilisez le slash command :

```bash
/full-review                      # Analyse les fichiers modifiés
/full-review src/domain/          # Analyse un dossier spécifique
```

Voir `.claude/commands/README.md` pour plus de détails sur l'orchestration.

## Utilisation individuelle

### Via le chat Claude Code

Les agents avec `PROACTIVELY` dans leur description sont automatiquement invoqués quand pertinent.

Pour invoquer manuellement un agent :
```
@rgpd-auditor Audite le fichier src/app/usecases/createUser.ts
@security-reviewer Revue de sécurité sur app/api/auth/
@architecture-guardian Vérifie les imports dans src/domain/
```

### Via la commande /agents

```bash
/agents
```

Puis sélectionnez l'agent à invoquer.

### Agent UI Tester

L'agent `ui-tester` est spécial car il utilise Chrome DevTools MCP pour l'automatisation navigateur.

**Prérequis :**
- Serveur de dev lancé (`npm run dev`)
- Chrome disponible
- Données de test seedées (`npm run db:seed`)

**Modes d'exécution :**

```bash
# Test manuel (ad-hoc)
@ui-tester Teste la page de login avec admin@platform.local

# Exécution d'un scénario par ID
@ui-tester Exécute le scénario AUTH-001

# Exécution par fichier YAML
@ui-tester Exécute tous les scénarios de auth.yaml

# Exécution par tag
@ui-tester Exécute les scénarios avec le tag [security]

# Test de performance
@ui-tester Analyse les performances de /portal/dashboard

# Test responsive
@ui-tester Teste le dashboard en vue mobile (375x667)
```

**Scénarios disponibles :**

| Fichier | Domaine | Nb scénarios |
|---------|---------|--------------|
| `auth.yaml` | Authentification | 15 |
| `consents.yaml` | Finalités/DPIA | 15 |
| `rgpd.yaml` | Droits RGPD | 14 |
| `admin.yaml` | Dashboard admin | 12 |
| `portal.yaml` | Dashboard tenant | 14 |

Voir [ui-tester/README.md](ui-tester/README.md) pour la documentation complète.

## Format des agents

Chaque agent est un fichier Markdown avec frontmatter YAML :

```yaml
---
name: agent-name
description: "Description de l'agent. PROACTIVELY pour auto-invocation."
tools: Read, Glob, Grep, Bash
model: sonnet
---

Contenu du system prompt de l'agent...
```

### Champs frontmatter

| Champ | Description | Requis |
|-------|-------------|--------|
| `name` | Identifiant unique (kebab-case) | ✓ |
| `description` | Description courte | ✓ |
| `tools` | Outils autorisés (Read, Glob, Grep, Bash, etc.) | Optionnel |
| `model` | Modèle à utiliser (sonnet, opus, haiku, inherit) | Optionnel |

## Création d'un nouvel agent

1. Créer un fichier `.md` dans ce répertoire
2. Ajouter le frontmatter YAML
3. Rédiger le system prompt avec :
   - Contexte du projet
   - Documents de référence
   - Checklist de vérification
   - Format de rapport attendu
   - Instructions d'utilisation

## Bonnes pratiques

- **Spécialisation** : Un agent = une responsabilité claire
- **Contexte** : Inclure les références aux docs du projet
- **Checklist** : Liste de vérification actionnable
- **Format** : Template de rapport structuré
- **Exemples** : Patterns à détecter avec code

## Agents utilisateur vs projet

| Emplacement | Scope | Partage |
|-------------|-------|---------|
| `.claude/agents/` | Projet | Via git (équipe) |
| `~/.claude/agents/` | Utilisateur | Personnel |

Les agents projet ont priorité sur les agents utilisateur en cas de conflit de nom.

## Référence

- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents)
- [Best practices for Claude Code subagents](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/)
