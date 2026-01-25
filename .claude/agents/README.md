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
| **lot-validator** | Validation périmètre LOT/EPIC | Read, Glob, Grep, Bash | Avant clôture LOT, validation DoD |

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

| Dossier | Domaine | Nb scénarios | LOT/EPIC |
|---------|---------|--------------|----------|
| `common/` | Auth, Sécurité transverse | ~20 | - |
| `super-admin/` | Dashboard PLATFORM | ~40 | EPIC 11 |
| `tenant-admin/` | Dashboard TENANT | ~45 | EPIC 12 |
| `dpo/` | Interface DPO | ~30 | EPIC 12 |
| **`user/`** | **Frontend MEMBER** | **52** | **LOT 13.0 ✅** |

**Détail user/ (LOT 13.0) :**
- `functional.yaml` : 21 scénarios (auth, home, header, profile, footer, responsive)
- `security.yaml` : 13 scénarios (scope isolation, XSS, CSRF, defense in depth)
- `rgpd.yaml` : 18 scénarios (cookies, P1-only, legal links, consent granularity)

Voir [ui-tester/scenarios/README.md](ui-tester/scenarios/README.md) pour la documentation complète.

### Agent LOT Validator

L'agent `lot-validator` vérifie qu'un LOT ou EPIC a été **entièrement implémenté** selon les spécifications de TASKS.md et des fichiers EPIC.

**Utilisation :**

```bash
# L'agent demande automatiquement le LOT à vérifier
@lot-validator

# Ou spécifier directement
@lot-validator Vérifie le LOT 10.3
@lot-validator Valide EPIC 13 complet
@lot-validator Check LOT 13.2 (Mes consentements)
```

**Formats acceptés :**
- `LOT 10.3` ou `10.3`
- `EPIC 13` ou `13`
- `LOT 13.2` (LOT spécifique d'un EPIC)

**Ce que vérifie l'agent :**
1. Fichiers créés (API routes, use cases, components, tests)
2. Tests présents et passants
3. Documentation mise à jour
4. Respect du DoD (Definition of Done)
5. Conformité RGPD

**Rapport généré :**
- Liste des éléments attendus vs implémentés
- Status de chaque livrable (PRÉSENT / MANQUANT / PARTIEL)
- Résultat des tests
- Validation du DoD
- Conclusion (COMPLET / PARTIEL / NON COMPLET)

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
