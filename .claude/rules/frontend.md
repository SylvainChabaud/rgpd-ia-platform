---
scope: project
paths:
  - "app/**"
  - "src/components/**"
  - "!app/api/**"
---

# Frontend rules

## Structure des composants

- Directive `'use client'` obligatoire en haut de chaque page/composant client.
- Composant ≤ 200 lignes (sinon extraire en sous-composants).
- Props typées avec interface TypeScript explicite.
- Structure de page : `<div className="space-y-6">` pour l'espacement vertical.

## États UI obligatoires

Chaque composant de données gère 3 états :

1. **Loading** : Spinner centré dans `min-h-[400px]` ou skeleton avec `animate-pulse`.
2. **Error** : Card avec `border-destructive`, icône `AlertCircle`, bouton "Réessayer".
3. **Empty** : Icône centrée `h-12 w-12`, message explicatif, CTA pour créer.

## Gestion des formulaires

- Validation avec Zod schema avant soumission.
- État formulaire : `useState<FormData>({...})` + `errors: Partial<Record<keyof FormData, string>>`.
- Handler de changement qui efface l'erreur du champ modifié.
- Affichage erreur inline : `text-sm text-destructive` avec `AlertCircle h-3 w-3`.
- Bouton submit : affiche spinner + texte différent pendant `isPending`.

## Appels API

- Utiliser TanStack Query (`useQuery`, `useMutation`) pour tous les appels.
- Hooks API dans `src/lib/api/hooks/` avec directive `'use client'`.
- Pattern mutation : `onSuccess` → `invalidateQueries` + `toast.success()`.
- Smart endpoint selection basé sur `user.scope` (PLATFORM vs TENANT).
- Toujours `enabled: !!user` pour attendre l'authentification.

## Données affichées (RGPD)

- **P1 uniquement** : displayName, IDs, rôle, agrégats → OK à afficher.
- **P2 interdit** : Email → JAMAIS affiché (hashé côté backend).
- **P3 interdit** : Prompts, outputs IA, mots de passe → JAMAIS transmis.
- Ajouter JSDoc avec notes RGPD sur les données affichées.

## Pagination et filtres

- État pagination : `page`, `limit`, `sortBy`, `sortOrder`.
- `useMemo` pour construire les query params.
- Filtres : reset `page` à 0 quand un filtre change.
- Headers de table cliquables pour le tri avec indicateur `↑`/`↓`.

## Composants UI

- Utiliser les composants shadcn/ui : `Card`, `Button`, `Input`, `Label`, `Badge`.
- Notifications avec `sonner` : `toast.success()`, `toast.error()`.
- Messages en français.
- Icônes lucide-react avec tailles : `h-4 w-4` (boutons), `h-5 w-5` (headers), `h-6 w-6` (états).

## Interdictions

- Aucun appel IA direct depuis le frontend (passer par app/api/).
- Pas de secrets côté client (`NEXT_PUBLIC_` uniquement pour config publique).
- Pas de `dangerouslySetInnerHTML` sans sanitization préalable.
- Pas d'effet de bord dans le rendu (side-effects dans useEffect/handlers).
