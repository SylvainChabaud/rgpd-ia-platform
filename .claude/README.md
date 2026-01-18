# Configuration Claude Code — RGPD IA Platform

Ce dossier contient la configuration Claude Code pour le projet RGPD IA Platform.

## Structure

```
.claude/
├── settings.json          # Configuration principale (hooks, permissions)
├── settings.local.json    # Permissions locales (legacy)
├── hooks/                 # Scripts de sécurité (TypeScript)
│   ├── pretooluse-block-destructive.ts
│   ├── pretooluse-block-dangerous.ts
│   ├── stop-quality-gate.ts
│   └── README.md
├── rules/                 # Règles par domaine (avec scope/paths)
│   ├── frontend.md        # app/**, src/components/**
│   ├── backend.md         # app/api/**, src/app/**, src/infrastructure/**
│   ├── domain.md          # src/domain/**
│   ├── testing.md         # tests/**
│   ├── security.md        # global
│   ├── rgpd.md            # global
│   └── README.md
└── agents/                # Agents spécialisés (subagents Claude Code)
    ├── rgpd-auditor.md        # Audit conformité RGPD
    ├── security-reviewer.md   # Revue sécurité
    ├── architecture-guardian.md # Validation architecture
    ├── test-analyst.md        # Analyse couverture tests
    ├── code-reviewer.md       # Revue qualité code
    └── README.md
```

## Hooks actifs

| Événement | Hook | Fonction |
|-----------|------|----------|
| PreToolUse (Bash) | `pretooluse-block-destructive.ts` | Bloque rm -rf, mkfs, dd |
| PreToolUse (Bash) | `pretooluse-block-dangerous.ts` | Bloque sudo |
| Stop | `stop-quality-gate.ts` | Exécute le quality gate |

Les hooks sont exécutés via `npx tsx` (TypeScript runtime).

## Permissions

- **Réseau** : Autorisé (deny_all: false)
- **Filesystem** : Écriture dans docs, src, app, tests, migrations, scripts, tools, prompts
- **Commandes bloquées** : rm -rf, sudo, mkfs, dd

## Mémoire hiérarchique

1. **Projet** : `CLAUDE.md` (racine) — Gouvernance globale
2. **Local** : `CLAUDE.local.md` (gitignored) — Configuration machine
3. **Règles** : `.claude/rules/` — Contraintes par domaine

## Agents spécialisés

Le répertoire `agents/` contient des agents spécialisés (subagents) pour automatiser certaines tâches d'analyse.

| Agent | Description | Invocation |
|-------|-------------|------------|
| **rgpd-auditor** | Audit conformité RGPD/GDPR | `@rgpd-auditor <fichier>` |
| **security-reviewer** | Revue de sécurité | `@security-reviewer <fichier>` |
| **architecture-guardian** | Validation architecture | `@architecture-guardian <dossier>` |
| **test-analyst** | Analyse couverture tests | `@test-analyst` |
| **code-reviewer** | Revue qualité code | `@code-reviewer <fichier>` |

Les agents avec `PROACTIVELY` dans leur description peuvent être invoqués automatiquement par Claude Code quand pertinent.

Voir [agents/README.md](agents/README.md) pour plus de détails.

## Quality Gate

```bash
npm run quality-gate
```

Vérifie :
- Fichiers requis présents (CLAUDE.md, settings.json)
- Pas de secrets en clair
- Pas de PII non autorisées
- Lint et TypeScript OK
- Tests passants avec couverture ≥ 80%
- Frontières domaine respectées (pas d'import infra dans domain)

## Documents normatifs

La configuration respecte les documents suivants :
- `docs/architecture/BOUNDARIES.md`
- `docs/ai/LLM_USAGE_POLICY.md`
- `docs/data/DATA_CLASSIFICATION.md`
- `docs/testing/RGPD_TESTING.md`

## Référence

Voir `CLAUDE.md` à la racine pour les règles de gouvernance complètes.
