# Règles par domaine — RGPD IA Platform

Ce dossier contient les règles de développement par domaine, chargées automatiquement par Claude Code.

## Index des règles

| Fichier | Domaine | Scope (paths) |
|---------|---------|---------------|
| [frontend.md](frontend.md) | Frontend/UI | `app/**`, `src/components/**` |
| [backend.md](backend.md) | Backend/API | `app/api/**`, `src/app/**`, `src/infrastructure/**` |
| [domain.md](domain.md) | Domain | `src/domain/**` |
| [testing.md](testing.md) | Tests | `tests/**` |
| [security.md](security.md) | Sécurité | Global (tout le projet) |
| [rgpd.md](rgpd.md) | RGPD | Global (tout le projet) |

## Format des règles

Chaque fichier utilise le format avec frontmatter YAML :

```yaml
---
scope: project
paths:
  - "chemin/vers/dossier/**"
---
```

## Principes

- **1 domaine = 1 fichier** avec 5-8 règles maximum
- **Règles claires et vérifiables** (pas de termes subjectifs)
- **Scoping cohérent** pour éviter les conflits entre règles
- **Règles actionnables** (on peut vérifier si elles sont respectées)

## Priorité

En cas de conflit entre règles :
1. `CLAUDE.md` (racine) — invariants universels
2. Documents normatifs (`docs/`) — spécifications
3. Règles domaine (ce dossier) — comportements concrets

## Documents normatifs de référence

- `docs/architecture/BOUNDARIES.md`
- `docs/ai/LLM_USAGE_POLICY.md`
- `docs/data/DATA_CLASSIFICATION.md`
- `docs/testing/RGPD_TESTING.md`
