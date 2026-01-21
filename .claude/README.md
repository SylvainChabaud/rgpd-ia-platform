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
    ├── ui-tester.md           # Tests UI via Chrome DevTools MCP
    ├── ui-tester/             # Scénarios et fixtures pour ui-tester
    │   ├── README.md              # Documentation d'utilisation
    │   ├── scenarios/             # Scénarios YAML par domaine
    │   │   ├── auth.yaml          # Authentification
    │   │   ├── consents.yaml      # Consentements/finalités
    │   │   ├── rgpd.yaml          # Droits RGPD
    │   │   ├── admin.yaml         # Dashboard admin
    │   │   └── portal.yaml        # Dashboard tenant
    │   └── fixtures/
    │       └── test-data.yaml     # Données de test
    └── README.md

.mcp.json                  # Configuration MCP serveurs (racine projet)
```

## MCP Servers

Le projet utilise des serveurs MCP (Model Context Protocol) pour étendre les capacités de Claude Code.

### Configuration

Le fichier `.mcp.json` à la racine du projet définit les serveurs MCP partagés avec l'équipe.

### Serveurs disponibles

| Serveur | Description | Outils |
|---------|-------------|--------|
| **chrome-devtools** | Contrôle Chrome DevTools pour automation et débogage | Navigation, clics, screenshots, performance, réseau |

### Usage

Les outils MCP sont automatiquement disponibles dans Claude Code une fois le serveur approuvé.

**Exemples d'utilisation avec chrome-devtools :**
- Automatiser des tests E2E visuels
- Analyser les performances (LCP, FID, CLS)
- Déboguer des problèmes réseau
- Prendre des screenshots pour documentation

### Commandes MCP utiles

```bash
# Lister les serveurs configurés
claude mcp list

# Voir le statut des serveurs
/mcp

# Ajouter un serveur personnel (non partagé)
claude mcp add --transport stdio --scope local myserver -- npx -y @some/package

# Réinitialiser les choix d'approbation
claude mcp reset-project-choices
```

### Prérequis

- **chrome-devtools** : Node.js 22+, Chrome installé

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
| **ui-tester** | Tests UI via Chrome DevTools | `@ui-tester <instruction>` |

Les agents avec `PROACTIVELY` dans leur description peuvent être invoqués automatiquement par Claude Code quand pertinent.

### Agent UI Tester

L'agent `ui-tester` utilise Chrome DevTools MCP pour automatiser les tests navigateur.

**Exemples d'utilisation :**

```bash
# Test manuel
@ui-tester Teste la page de login avec admin@platform.local

# Exécution d'un scénario par ID
@ui-tester Exécute le scénario AUTH-001

# Exécution par fichier
@ui-tester Exécute tous les scénarios de auth.yaml

# Exécution par tag
@ui-tester Exécute les scénarios avec le tag [security]

# Test de performance
@ui-tester Analyse les performances de /portal/dashboard
```

Les scénarios sont définis dans `.claude/agents/ui-tester/scenarios/` au format YAML.

Voir [agents/ui-tester/README.md](agents/ui-tester/README.md) pour la documentation complète.

Voir [agents/README.md](agents/README.md) pour plus de détails sur les autres agents.

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
