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
