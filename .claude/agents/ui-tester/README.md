# UI Tester - Scénarios de test

Ce dossier contient les scénarios de test UI pour l'agent `ui-tester`.

## Structure

```
ui-tester/
├── README.md                 # Ce fichier
├── scenarios/
│   ├── auth.yaml            # Authentification (login, logout, session)
│   ├── consents.yaml        # Gestion des consentements et finalités
│   ├── rgpd.yaml            # Droits RGPD (exports, effacements, etc.)
│   ├── admin.yaml           # Dashboard super admin
│   └── portal.yaml          # Dashboard tenant admin
└── fixtures/
    └── test-data.yaml       # Données de test (credentials, tenants)
```

## Format des scénarios

Chaque fichier YAML suit ce format :

```yaml
name: "Nom du module"
description: "Description"
priority: critical | high | medium | low
tags: [auth, rgpd, security]

scenarios:
  - id: "MODULE-001"
    name: "Nom du test"
    steps:
      - navigate: "/path"
      - wait_for: "texte"
      - fill_form:
          field: "value"
      - click: "button"
      - screenshot: true
    expected:
      - status: pass
      - no_console_errors: true
```

## Utilisation de l'agent UI Tester

L'agent `ui-tester` utilise Chrome DevTools MCP pour automatiser les tests navigateur.

### Invocation de l'agent

Dans Claude Code, utiliser la syntaxe `@agent-name` :

```bash
# Syntaxe générale
@ui-tester <instruction>
```

### Modes d'exécution

#### 1. Test manuel (ad-hoc)

Tester une fonctionnalité spécifique sans scénario prédéfini :

```bash
@ui-tester Teste la page de login avec admin@platform.local

@ui-tester Vérifie que le dashboard tenant affiche les statistiques correctement

@ui-tester Teste le formulaire de création de finalité
```

#### 2. Exécution d'un scénario par ID

```bash
@ui-tester Exécute le scénario AUTH-001

@ui-tester Execute scenario RGPD-010
```

#### 3. Exécution de tous les scénarios d'un fichier

```bash
@ui-tester Exécute tous les scénarios de auth.yaml

@ui-tester Run all scenarios from consents.yaml
```

#### 4. Exécution par tag

```bash
@ui-tester Exécute tous les scénarios avec le tag [security]

@ui-tester Run scenarios tagged [rgpd]

@ui-tester Execute critical priority scenarios
```

#### 5. Test de performance

```bash
@ui-tester Analyse les performances de /portal/dashboard

@ui-tester Mesure LCP et CLS sur la page de login
```

#### 6. Test responsive

```bash
@ui-tester Teste le dashboard en vue mobile (375x667)

@ui-tester Vérifie le responsive sur tablette (768x1024)
```

### Exemples complets

```bash
# Test complet d'authentification
@ui-tester Teste le flow complet : login admin@acme.local → navigation dashboard → logout

# Vérification RGPD
@ui-tester Vérifie que la page /portal/rgpd affiche tous les articles RGPD (15-22)

# Test d'isolation tenant
@ui-tester Connecte-toi en tant que tenant admin et vérifie qu'on ne peut pas accéder à /admin

# Capture d'écran pour documentation
@ui-tester Prends des screenshots de toutes les pages du portail tenant pour la doc
```

### Rapport de test

L'agent produit un rapport structuré avec :
- Résumé PASS/FAIL par scénario
- Screenshots des erreurs
- Logs console pertinents
- Métriques de performance (si demandé)
- Recommandations d'amélioration

## Prérequis

- Serveur de dev lancé (`npm run dev`)
- Chrome disponible (MCP chrome-devtools)
- Données de test seedées (`npm run db:seed`)

## Données de test

Les credentials et données de test sont dans `fixtures/test-data.yaml`.

**Important** : Utiliser uniquement des emails de test :
- `@platform.local`
- `@acme.local`
- `@example.com`
- `@test.com`

## Convention de nommage des IDs

| Préfixe | Module |
|---------|--------|
| AUTH-   | Authentification |
| CONS-   | Consentements |
| PURP-   | Finalités |
| RGPD-   | Droits RGPD |
| ADMIN-  | Administration |
| PORT-   | Portail tenant |
| PERF-   | Performance |
| A11Y-   | Accessibilité |

## Ajout de nouveaux scénarios

1. Identifier le fichier approprié (ou créer un nouveau)
2. Ajouter le scénario avec un ID unique
3. Documenter les prérequis si nécessaires
4. Tester manuellement avant de valider
