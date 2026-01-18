# Hooks Claude Code — RGPD IA Platform

Ce dossier contient les hooks de sécurité exécutés par Claude Code.

## Hooks disponibles

| Hook | Événement | Fonction |
|------|-----------|----------|
| `pretooluse-block-destructive.ts` | PreToolUse (Bash) | Bloque `rm -rf`, `mkfs`, `dd` |
| `pretooluse-block-dangerous.ts` | PreToolUse (Bash) | Bloque `sudo` |
| `stop-quality-gate.ts` | Stop | Exécute le quality gate avant fin de session |

## Codes de retour

- `0` : Autorisé (hook passant)
- `2` : Bloqué (DENY)

## Exécution

Les hooks sont exécutés via `npx tsx` (TypeScript runtime).

## Personnalisation

Pour ajouter de nouveaux patterns à bloquer, modifier les tableaux `PATTERNS` dans les hooks correspondants.

## Référence

Configuration dans `.claude/settings.json`.
