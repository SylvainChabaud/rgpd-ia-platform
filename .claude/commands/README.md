# Slash Commands — RGPD IA Platform

Ce répertoire contient les slash commands personnalisés pour le projet.

## Commands disponibles

| Command | Description | Usage |
|---------|-------------|-------|
| `/full-review` | Orchestrateur de validation multi-agents | Revue complète avant PR/release |

## Utilisation

### Via le terminal Claude Code

```bash
/full-review                      # Analyse les fichiers modifiés
/full-review src/domain/          # Analyse un dossier spécifique
/full-review app/api/auth/        # Analyse les routes d'auth
```

## Différence entre Commands et Agents

| Aspect | Slash Commands (`.claude/commands/`) | Subagents (`.claude/agents/`) |
|--------|--------------------------------------|-------------------------------|
| **Invocation** | `/command-name` | `@agent-name` ou automatique |
| **Rôle** | Orchestration, workflows complexes | Tâche spécialisée unique |
| **Peut spawner des agents** | ✅ Oui (via Task tool) | ❌ Non |
| **Interaction utilisateur** | ✅ Oui (AskUserQuestion) | Limitée |
| **Cas d'usage** | Pipelines, revues complètes | Audit ciblé, revue single-focus |

## Architecture d'orchestration

```
┌─────────────────────────────────────────────────────────┐
│  /full-review                                           │
│  (Slash Command - Orchestrateur)                        │
├─────────────────────────────────────────────────────────┤
│                         │                               │
│    ┌────────────────────▼────────────────────┐          │
│    │  Task(architecture-guardian)            │          │
│    │  → Rapport + Corrections                │          │
│    │  → [Validation utilisateur]             │          │
│    └────────────────────┬────────────────────┘          │
│                         │                               │
│    ┌────────────────────▼────────────────────┐          │
│    │  Task(security-reviewer)                │          │
│    │  → Rapport + Corrections                │          │
│    │  → [Validation utilisateur]             │          │
│    └────────────────────┬────────────────────┘          │
│                         │                               │
│    ┌────────────────────▼────────────────────┐          │
│    │  Task(rgpd-auditor)                     │          │
│    │  → Rapport + Corrections                │          │
│    │  → [Validation utilisateur]             │          │
│    └────────────────────┬────────────────────┘          │
│                         │                               │
│    ┌────────────────────▼────────────────────┐          │
│    │  Task(code-reviewer)                    │          │
│    │  → Rapport + Corrections                │          │
│    │  → [Validation utilisateur]             │          │
│    └────────────────────┬────────────────────┘          │
│                         │                               │
│    ┌────────────────────▼────────────────────┐          │
│    │  Task(test-analyst)                     │          │
│    │  → Rapport + Corrections                │          │
│    │  → [Validation utilisateur]             │          │
│    └────────────────────┬────────────────────┘          │
│                         │                               │
│    ┌────────────────────▼────────────────────┐          │
│    │  RAPPORT FINAL CONSOLIDÉ                │          │
│    │  → Score global                         │          │
│    │  → Corrections appliquées               │          │
│    │  → Recommandations                      │          │
│    └─────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

## Création d'une nouvelle command

1. Créer un fichier `.md` dans ce répertoire
2. Le nom du fichier devient le nom de la command (ex: `my-command.md` → `/my-command`)
3. Rédiger le prompt avec :
   - Objectif clair
   - Arguments attendus (`$ARGUMENTS`)
   - Workflow d'exécution
   - Format de sortie

## Bonnes pratiques

- **Single Responsibility** : Une command = un workflow clair
- **Interactivité** : Utiliser `AskUserQuestion` pour les décisions
- **Traçabilité** : Produire un rapport structuré
- **Sécurité** : Toujours demander confirmation avant modifications
- **Rollback** : Informer l'utilisateur des options de rollback

## Référence

- [Claude Code Slash Commands Documentation](https://code.claude.com/docs/en/slash-commands)
- [wshobson/commands - Production-ready examples](https://github.com/wshobson/commands)
- `.claude/agents/README.md` — Documentation des subagents
