# Scénarios de test UI - RGPD IA Platform

Structure organisée par backoffice et type de test.

## Structure des dossiers

```
scenarios/
├── common/                 # Tests communs à tous les backoffices
│   ├── auth.yaml          # Authentification (login, logout, session)
│   └── security.yaml      # Sécurité transverse (rate limiting, headers)
│
├── super-admin/           # Backoffice administrateur plateforme
│   ├── functional.yaml    # Fonctionnel (dashboard, tenants, users)
│   ├── security.yaml      # Sécurité (isolation, audit trail)
│   └── rgpd.yaml          # RGPD (monitoring, audit, incidents)
│
├── tenant-admin/          # Backoffice administrateur tenant
│   ├── functional.yaml    # Fonctionnel (dashboard, navigation)
│   ├── security.yaml      # Sécurité (isolation tenant, scopes)
│   └── rgpd.yaml          # RGPD (consentements, finalités, droits)
│
├── dpo/                   # Backoffice DPO
│   ├── functional.yaml    # Fonctionnel (accès DPIA, demandes)
│   ├── security.yaml      # Sécurité (isolation, permissions)
│   └── rgpd.yaml          # RGPD (approbation DPIA, audit)
│
└── user/                  # Backoffice utilisateur (à venir)
    └── .gitkeep           # Placeholder - backoffice non développé
```

## Types de tests

| Type | Description | Priorité |
|------|-------------|----------|
| **functional** | Tests fonctionnels de base (navigation, affichage) | High |
| **security** | Tests de sécurité (isolation, headers, audit) | Critical |
| **rgpd** | Tests de conformité RGPD (Art. 5-35) | Critical |

## Convention de nommage des IDs

- `AUTH-XXX` : Tests d'authentification
- `SEC-XXX` : Tests de sécurité communs
- `SADM-FXXX` : Super Admin - Fonctionnel
- `SADM-SXXX` : Super Admin - Sécurité
- `TADM-FXXX` : Tenant Admin - Fonctionnel
- `TADM-SXXX` : Tenant Admin - Sécurité
- `TADM-RXXX` : Tenant Admin - RGPD
- `DPO-FXXX` : DPO - Fonctionnel
- `DPO-SXXX` : DPO - Sécurité
- `DPO-RXXX` : DPO - RGPD
- `SADM-RXXX` : Super Admin - RGPD

## Utilisateurs de test

| Variable | Email | Rôle | Scope |
|----------|-------|------|-------|
| `{{users.platform_admin}}` | admin@platform.local | SUPERADMIN | PLATFORM |
| `{{users.tenant_admin}}` | admin@acme.local | TENANT_ADMIN | TENANT |
| `{{users.dpo}}` | dpo@acme.local | DPO | TENANT |
| `{{users.member}}` | user@acme.local | MEMBER | TENANT |

## Exécution

Les scénarios sont exécutés par l'agent UI Tester via Chrome DevTools MCP.

```yaml
# Exemple d'exécution
- login_as: "{{users.tenant_admin}}"
- click: "Consentements"
- wait_for: "Gestion des Consentements"
- screenshot: "consents-page.png"
```

## Règles critiques

1. **Navigation** : Uniquement par clics UI (pas de changement d'URL direct)
2. **Attente** : Vérifier les requêtes réseau avant de valider le chargement
3. **Screenshots** : Stockés dans `.claude/agents/ui-tester/outputs/`
