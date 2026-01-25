# Scénarios de test UI - RGPD IA Platform

Structure organisée par backoffice et type de test.

## Vue d'ensemble

| Dossier | LOT/EPIC | Scénarios | Status |
|---------|----------|-----------|--------|
| **common/** | - | ~20 | Tests communs (auth, sécurité transverse) |
| **super-admin/** | EPIC 11 | ~40 | Backoffice Super Admin (PLATFORM scope) |
| **tenant-admin/** | EPIC 12 | ~45 | Backoffice Tenant Admin (TENANT scope) |
| **dpo/** | EPIC 12 | ~30 | Interface DPO (TENANT scope) |
| **user/** | **LOT 13.0** | **52** | ✅ Frontend utilisateur (MEMBER scope) |

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
└── user/                  # Frontend utilisateur (MEMBER scope) — LOT 13.0 ✅
    ├── functional.yaml    # Fonctionnel — 21 scénarios
    ├── security.yaml      # Sécurité — 13 scénarios
    └── rgpd.yaml          # RGPD — 18 scénarios
```

## Détail User (LOT 13.0) — 52 scénarios

### functional.yaml (21 scénarios)

| ID | Catégorie | Description |
|----|-----------|-------------|
| USER-F001-F003 | Auth | Login, accès sans auth, logout |
| USER-F010-F012 | Home | Welcome message, cards, section À propos |
| USER-F020-F023 | Header | Logo, nav items, user menu, theme toggle |
| USER-F030-F032 | Profile | Accès, infos actuelles, sections placeholder |
| USER-F040-F043 | Footer | Liens légaux (4 tests) |
| USER-F050-F051 | Responsive | Mobile, tablet viewport |
| USER-F060 | Performance | LCP/CLS metrics |

### security.yaml (13 scénarios)

| ID | Catégorie | Description |
|----|-----------|-------------|
| USER-S001-S004 | Scope isolation | MEMBER → /app, cross-scope redirects |
| USER-S010-S012 | Session/Token | httpOnly, expiration, refresh |
| USER-S020-S021 | XSS | DisplayName sanitisé, URL injection |
| USER-S030 | Headers | X-Content-Type-Options, X-Frame-Options |
| USER-S040 | CSRF | Logout credentials |
| USER-S050-S051 | Defense in depth | Loading state, contenu protégé |

### rgpd.yaml (18 scénarios)

| ID | Catégorie | Article RGPD |
|----|-----------|--------------|
| USER-R001-R007 | Cookie Consent | Art. 7, ePrivacy 5.3 |
| USER-R010-R012 | P1 data only | Art. 5.1.c (minimisation) |
| USER-R020-R023 | Legal links | Art. 13/14 (information) |
| USER-R030 | Data transparency | Art. 12 |
| USER-R040-R042 | Consent granularity | Art. 7 (opt-in, révocation) |

## Types de tests

| Type | Description | Priorité |
|------|-------------|----------|
| **functional** | Tests fonctionnels de base (navigation, affichage) | High |
| **security** | Tests de sécurité (isolation, headers, audit) | Critical |
| **rgpd** | Tests de conformité RGPD (Art. 5-35) | Critical |

## Convention de nommage des IDs

| Préfixe | Scope | Type |
|---------|-------|------|
| `AUTH-XXX` | Common | Authentification |
| `SEC-XXX` | Common | Sécurité transverse |
| `SADM-FXXX` | Super Admin | Fonctionnel |
| `SADM-SXXX` | Super Admin | Sécurité |
| `SADM-RXXX` | Super Admin | RGPD |
| `TADM-FXXX` | Tenant Admin | Fonctionnel |
| `TADM-SXXX` | Tenant Admin | Sécurité |
| `TADM-RXXX` | Tenant Admin | RGPD |
| `DPO-FXXX` | DPO | Fonctionnel |
| `DPO-SXXX` | DPO | Sécurité |
| `DPO-RXXX` | DPO | RGPD |
| `USER-FXXX` | User (MEMBER) | Fonctionnel |
| `USER-SXXX` | User (MEMBER) | Sécurité |
| `USER-RXXX` | User (MEMBER) | RGPD |

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
- login_as: "{{users.member}}"
- wait_for: "Bienvenue"
- click: "Mon Profil"
- screenshot: "user-profile.png"
```

### Commandes d'exécution

```bash
# Exécuter tous les scénarios user
@ui-tester Exécute tous les scénarios de user/

# Exécuter un type spécifique
@ui-tester Exécute user/functional.yaml
@ui-tester Exécute user/security.yaml
@ui-tester Exécute user/rgpd.yaml

# Exécuter un scénario par ID
@ui-tester Exécute le scénario USER-F001
@ui-tester Exécute le scénario USER-R001

# Exécuter par tag
@ui-tester Exécute les scénarios avec le tag [lot-13.0]
@ui-tester Exécute les scénarios avec le tag [responsive]
```

## Règles critiques

1. **Navigation** : Uniquement par clics UI (pas de changement d'URL direct sauf tests spécifiques)
2. **Attente** : Vérifier les requêtes réseau avant de valider le chargement
3. **Screenshots** : Stockés dans `.claude/agents/ui-tester/outputs/`
4. **Priorité** : `critical` > `high` > `medium` > `low`

## Couverture LOT 13.0

| Acceptance Criteria (TASKS.md) | Scénario(s) |
|-------------------------------|-------------|
| User MEMBER peut se connecter | USER-F001, USER-F002 |
| Navigation intuitive | USER-F020, USER-F021, USER-F022 |
| Profile éditable | USER-F030, USER-F031, USER-F032 |
| Logout fonctionnel | USER-F003 |
| Cookie Banner première visite | USER-R001, USER-R002, USER-R003 |
| Footer liens pages légales | USER-F040, USER-F041, USER-F042, USER-F043 |
| Redirections scope-based | USER-S001, USER-S002, USER-S003, USER-S004 |
| Pas de P2 data affichée | USER-R010, USER-R011, USER-R012 |
