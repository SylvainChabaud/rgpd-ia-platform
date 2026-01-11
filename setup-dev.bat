@echo off
REM ============================================================================
REM RGPD-IA Platform - Setup complet environnement de développement
REM ============================================================================
REM
REM Ce script effectue un setup COMPLET de l'environnement de développement:
REM   1. Nettoie Docker (conteneurs + volumes)
REM   2. Lance PostgreSQL via docker-compose.dev.yml
REM   3. Attend que la DB soit prête
REM   4. Exécute toutes les migrations SQL
REM   5. Crée un Super Admin via CLI bootstrap
REM   6. Crée un tenant via CLI bootstrap
REM   7. Crée un Tenant Admin via CLI bootstrap
REM   8. Affiche les credentials pour se connecter
REM
REM Usage:
REM   setup-dev.bat              - Setup complet interactif
REM   setup-dev.bat --skip-clean - Skip le nettoyage Docker (plus rapide)
REM   setup-dev.bat --help       - Affiche cette aide
REM
REM Prérequis:
REM   - Docker Desktop installé et démarré
REM   - Node.js 18+ installé
REM   - npm install déjà exécuté
REM   - Fichier .env configuré (ou utilise .env.example)
REM
REM ============================================================================

setlocal enabledelayedexpansion

REM ============================================================================
REM Configuration
REM ============================================================================

set COMPOSE_FILE=docker-compose.dev.yml
set DB_SERVICE=db
set DB_CONTAINER=rgpd-platform-db-dev

REM Variables de configuration (définies dans .env mais utilisées ici pour bootstrap)
REM Note: Le fichier .env est lu par Node.js (npm scripts), pas par ce script batch

REM Super Admin (Platform)
set TEST_PLATFORM_ADMIN_EMAIL=admin@platform.local
set TEST_PLATFORM_ADMIN_PASSWORD=Admin1234
set TEST_PLATFORM_ADMIN_NAME=Platform Administrator

REM Tenant 1: Acme Corp
set TENANT1_NAME=Acme Corp
set TENANT1_SLUG=acme
set TENANT1_ADMIN_EMAIL=admin@acme.local
set TENANT1_ADMIN_PASSWORD=Admin1234
set TENANT1_ADMIN_NAME=Tenant Administrator

REM Tenant 1 - Utilisateurs
set TENANT1_USER1_EMAIL=alice@acme.local
set TENANT1_USER1_NAME=Alice Martin
set TENANT1_USER1_PASSWORD=User1234

set TENANT1_USER2_EMAIL=bob@acme.local
set TENANT1_USER2_NAME=Bob Dupont
set TENANT1_USER2_PASSWORD=User1234

set TENANT1_USER3_EMAIL=charlie@acme.local
set TENANT1_USER3_NAME=Charlie Bernard
set TENANT1_USER3_PASSWORD=User1234

REM Tenant 2: TechCorp
set TENANT2_NAME=TechCorp
set TENANT2_SLUG=techcorp
set TENANT2_ADMIN_EMAIL=admin@techcorp.local
set TENANT2_ADMIN_PASSWORD=Admin1234
set TENANT2_ADMIN_NAME=TechCorp Administrator

REM Tenant 2 - Utilisateurs
set TENANT2_USER1_EMAIL=david@techcorp.local
set TENANT2_USER1_NAME=David Laurent
set TENANT2_USER1_PASSWORD=User1234

set TENANT2_USER2_EMAIL=emma@techcorp.local
set TENANT2_USER2_NAME=Emma Rousseau
set TENANT2_USER2_PASSWORD=User1234

REM Tenant 3: GlobalServices
set TENANT3_NAME=GlobalServices
set TENANT3_SLUG=globalservices
set TENANT3_ADMIN_EMAIL=admin@globalservices.local
set TENANT3_ADMIN_PASSWORD=Admin1234
set TENANT3_ADMIN_NAME=GlobalServices Administrator

REM Tenant 3 - Utilisateurs
set TENANT3_USER1_EMAIL=frank@globalservices.local
set TENANT3_USER1_NAME=Frank Moreau
set TENANT3_USER1_PASSWORD=User1234

set TENANT3_USER2_EMAIL=grace@globalservices.local
set TENANT3_USER2_NAME=Grace Lefevre
set TENANT3_USER2_PASSWORD=User1234

set TENANT3_USER3_EMAIL=henry@globalservices.local
set TENANT3_USER3_NAME=Henry Simon
set TENANT3_USER3_PASSWORD=User1234

if exist .env (
    echo [92m✓[0m Fichier .env détecté
    echo [96mℹ[0m  Les credentials par défaut seront utilisés (voir setup-dev.bat pour personnaliser)
) else (
    echo [93m⚠[0m  Fichier .env non trouvé
    echo [96mℹ[0m  Créez un fichier .env depuis .env.example pour Next.js
)

REM ============================================================================
REM Parsing des arguments
REM ============================================================================

set SKIP_CLEAN=false

:parse_args
if "%~1"=="" goto :end_parse_args
if /i "%~1"=="--skip-clean" (
    set SKIP_CLEAN=true
    shift
    goto :parse_args
)
if /i "%~1"=="--help" (
    goto :show_help
)
if /i "%~1"=="-h" (
    goto :show_help
)
echo [91m✗[0m Argument inconnu: %~1
echo.
goto :show_help

:end_parse_args

REM ============================================================================
REM Affichage du header
REM ============================================================================

echo.
echo [96m========================================================================[0m
echo [96m  RGPD-IA Platform - Setup Environnement de Développement[0m
echo [96m========================================================================[0m
echo.
echo [93m⚠  ATTENTION: Ce script va SUPPRIMER toutes les données existantes ![0m
echo.
echo Configuration à créer:
echo   - 1 Super Admin
echo   - 3 Tenants: %TENANT1_NAME%, %TENANT2_NAME%, %TENANT3_NAME%
echo   - 3 Tenant Admins
echo   - 8 Utilisateurs réguliers
echo.
echo Voir le début du script pour personnaliser les credentials
echo.

if "%SKIP_CLEAN%"=="false" (
    set /p "CONFIRM=Tapez 'OUI' pour continuer: "
    if /i not "!CONFIRM!"=="OUI" (
        echo [91m✗[0m Setup annulé par l'utilisateur
        exit /b 1
    )
)

echo.

REM ============================================================================
REM Étape 1: Nettoyage Docker
REM ============================================================================

if "%SKIP_CLEAN%"=="false" (
    echo [96m[Étape 1/16][0m Nettoyage de l'environnement Docker...
    echo.

    echo [90m  Arrêt des services Docker...[0m
    docker-compose -f %COMPOSE_FILE% down -v 2>nul

    echo [90m  Suppression des conteneurs orphelins...[0m
    docker rm -f %DB_CONTAINER% 2>nul

    echo [90m  Suppression du volume PostgreSQL...[0m
    docker volume rm rgpd-ia-platform_postgres_data 2>nul

    echo [92m✓[0m Docker nettoyé
    echo.
) else (
    echo [96m[Étape 1/16][0m [93m⊘[0m  Nettoyage Docker ignoré (--skip-clean)
    echo.
)

REM ============================================================================
REM Étape 2: Démarrage PostgreSQL
REM ============================================================================

echo [96m[Étape 2/16][0m Démarrage de PostgreSQL...
echo.

docker-compose -f %COMPOSE_FILE% up -d %DB_SERVICE%

if errorlevel 1 (
    echo [91m✗[0m Échec du démarrage de PostgreSQL
    echo [93m⚠[0m  Vérifiez que Docker Desktop est démarré
    exit /b 1
)

echo [92m✓[0m PostgreSQL démarré
echo.

REM ============================================================================
REM Étape 3: Attente de la disponibilité PostgreSQL
REM ============================================================================

echo [96m[Étape 3/16][0m Attente de la disponibilité de PostgreSQL...
echo.

set MAX_RETRIES=30
set RETRY_COUNT=0

:wait_db
set /a RETRY_COUNT+=1

docker exec %DB_CONTAINER% pg_isready -U devuser -d rgpd_platform >nul 2>&1

if errorlevel 1 (
    if !RETRY_COUNT! geq %MAX_RETRIES% (
        echo [91m✗[0m PostgreSQL n'est pas prêt après %MAX_RETRIES% secondes
        echo [93m⚠[0m  Vérifiez les logs: docker logs %DB_CONTAINER%
        exit /b 1
    )
    echo [90m  Tentative !RETRY_COUNT!/%MAX_RETRIES% - Attente...[0m
    REM Compatible Windows CMD et Git Bash
    ping 127.0.0.1 -n 2 >nul 2>&1
    goto :wait_db
)

echo [92m✓[0m PostgreSQL est prêt (après !RETRY_COUNT! secondes)
echo.

REM ============================================================================
REM Étape 4: Exécution des migrations SQL
REM ============================================================================

echo [96m[Étape 4/16][0m Exécution des migrations SQL...
echo.

call npm run migrate

if errorlevel 1 (
    echo [91m✗[0m Échec des migrations SQL
    echo [93m⚠[0m  Vérifiez les logs ci-dessus pour plus de détails
    exit /b 1
)

echo [92m✓[0m Migrations SQL exécutées avec succès
echo.

REM ============================================================================
REM Étape 5: Seed des données de développement (violations RGPD)
REM ============================================================================

echo [96m[Étape 5/16][0m Seed des violations RGPD de simulation...
echo.

REM Exécuter le seed SQL via stdin pour éviter problèmes de montage de volumes
type migrations\seeds\dev-incidents.sql | docker exec -i %DB_CONTAINER% psql -U devuser -d rgpd_platform >nul 2>&1

if errorlevel 1 (
    echo [93m⚠[0m  Échec du seed des violations (non bloquant)
) else (
    echo [92m✓[0m 10 violations RGPD de simulation créées
)
echo.

REM ============================================================================
REM Étape 6: Création du Super Admin
REM ============================================================================

echo [96m[Étape 6/16][0m Création du Super Admin...
echo.

REM Note: BOOTSTRAP_MODE doit être à true dans .env pour que cette commande fonctionne
call npm run bootstrap:superadmin -- --email %TEST_PLATFORM_ADMIN_EMAIL% --displayName "%TEST_PLATFORM_ADMIN_NAME%" --password %TEST_PLATFORM_ADMIN_PASSWORD%

if errorlevel 1 (
    echo [91m✗[0m Échec de la création du Super Admin
    echo [93m⚠[0m  Vérifiez les logs ci-dessus pour plus de détails
    exit /b 1
)

echo [92m✓[0m Super Admin créé: %TEST_PLATFORM_ADMIN_EMAIL%
echo.

REM ============================================================================
REM Étape 6: Création du tenant
REM ============================================================================

echo [96m[Étape 7/16][0m Création du tenant "%TENANT1_NAME%"...
echo.

call npm run bootstrap:tenant -- --name "%TENANT1_NAME%" --slug %TENANT1_SLUG%

if errorlevel 1 (
    echo [91m✗[0m Échec de la création du tenant
    echo [93m⚠[0m  Vérifiez les logs ci-dessus pour plus de détails
    exit /b 1
)

echo [92m✓[0m Tenant créé: %TENANT1_NAME% (slug: %TENANT1_SLUG%)
echo.

REM ============================================================================
REM Étape 7: Création du Tenant Admin
REM ============================================================================

echo [96m[Étape 8/16][0m Création du Tenant Admin...
echo.

call npm run bootstrap:tenant-admin -- --tenantSlug %TENANT1_SLUG% --email %TENANT1_ADMIN_EMAIL% --displayName "%TENANT1_ADMIN_NAME%" --password %TENANT1_ADMIN_PASSWORD%

if errorlevel 1 (
    echo [91m✗[0m Échec de la création du Tenant Admin
    echo [93m⚠[0m  Vérifiez les logs ci-dessus pour plus de détails
    exit /b 1
)

echo [92m✓[0m Tenant Admin créé: %TENANT1_ADMIN_EMAIL%
echo.

REM ============================================================================
REM Étape 8: Création des utilisateurs Tenant 1 (Acme Corp)
REM ============================================================================

echo [96m[Étape 9/16][0m Création des utilisateurs pour "%TENANT1_NAME%"...
echo.

call npm run bootstrap:tenant-user -- --tenantSlug %TENANT1_SLUG% --email %TENANT1_USER1_EMAIL% --displayName "%TENANT1_USER1_NAME%" --password %TENANT1_USER1_PASSWORD%
if errorlevel 1 goto :user_error

call npm run bootstrap:tenant-user -- --tenantSlug %TENANT1_SLUG% --email %TENANT1_USER2_EMAIL% --displayName "%TENANT1_USER2_NAME%" --password %TENANT1_USER2_PASSWORD%
if errorlevel 1 goto :user_error

call npm run bootstrap:tenant-user -- --tenantSlug %TENANT1_SLUG% --email %TENANT1_USER3_EMAIL% --displayName "%TENANT1_USER3_NAME%" --password %TENANT1_USER3_PASSWORD%
if errorlevel 1 goto :user_error

echo [92m✓[0m 3 utilisateurs créés pour %TENANT1_NAME%
echo.

REM ============================================================================
REM Étape 9: Création du Tenant 2 (TechCorp)
REM ============================================================================

echo [96m[Étape 10/16][0m Création du tenant "%TENANT2_NAME%"...
echo.

call npm run bootstrap:tenant -- --name "%TENANT2_NAME%" --slug %TENANT2_SLUG%
if errorlevel 1 goto :tenant_error

echo [92m✓[0m Tenant créé: %TENANT2_NAME% (slug: %TENANT2_SLUG%)
echo.

REM ============================================================================
REM Étape 10: Création du Tenant Admin pour TechCorp
REM ============================================================================

echo [96m[Étape 11/16][0m Création du Tenant Admin pour %TENANT2_NAME%...
echo.

call npm run bootstrap:tenant-admin -- --tenantSlug %TENANT2_SLUG% --email %TENANT2_ADMIN_EMAIL% --displayName "%TENANT2_ADMIN_NAME%" --password %TENANT2_ADMIN_PASSWORD%
if errorlevel 1 goto :admin_error

echo [92m✓[0m Tenant Admin créé: %TENANT2_ADMIN_EMAIL%
echo.

REM ============================================================================
REM Étape 11: Création des utilisateurs Tenant 2 (TechCorp)
REM ============================================================================

echo [96m[Étape 12/16][0m Création des utilisateurs pour %TENANT2_NAME%...
echo.

call npm run bootstrap:tenant-user -- --tenantSlug %TENANT2_SLUG% --email %TENANT2_USER1_EMAIL% --displayName "%TENANT2_USER1_NAME%" --password %TENANT2_USER1_PASSWORD%
if errorlevel 1 goto :user_error

call npm run bootstrap:tenant-user -- --tenantSlug %TENANT2_SLUG% --email %TENANT2_USER2_EMAIL% --displayName "%TENANT2_USER2_NAME%" --password %TENANT2_USER2_PASSWORD%
if errorlevel 1 goto :user_error

echo [92m✓[0m 2 utilisateurs créés pour %TENANT2_NAME%
echo.

REM ============================================================================
REM Étape 12: Création du Tenant 3 (GlobalServices)
REM ============================================================================

echo [96m[Étape 13/16][0m Création du tenant "%TENANT3_NAME%"...
echo.

call npm run bootstrap:tenant -- --name "%TENANT3_NAME%" --slug %TENANT3_SLUG%
if errorlevel 1 goto :tenant_error

echo [92m✓[0m Tenant créé: %TENANT3_NAME% (slug: %TENANT3_SLUG%)
echo.

REM ============================================================================
REM Étape 13: Création du Tenant Admin pour GlobalServices
REM ============================================================================

echo [96m[Étape 14/16][0m Création du Tenant Admin pour %TENANT3_NAME%...
echo.

call npm run bootstrap:tenant-admin -- --tenantSlug %TENANT3_SLUG% --email %TENANT3_ADMIN_EMAIL% --displayName "%TENANT3_ADMIN_NAME%" --password %TENANT3_ADMIN_PASSWORD%
if errorlevel 1 goto :admin_error

echo [92m✓[0m Tenant Admin créé: %TENANT3_ADMIN_EMAIL%
echo.

REM ============================================================================
REM Étape 14: Création des utilisateurs Tenant 3 (GlobalServices)
REM ============================================================================

echo [96m[Étape 15/16][0m Création des utilisateurs pour %TENANT3_NAME%...
echo.

call npm run bootstrap:tenant-user -- --tenantSlug %TENANT3_SLUG% --email %TENANT3_USER1_EMAIL% --displayName "%TENANT3_USER1_NAME%" --password %TENANT3_USER1_PASSWORD%
if errorlevel 1 goto :user_error

call npm run bootstrap:tenant-user -- --tenantSlug %TENANT3_SLUG% --email %TENANT3_USER2_EMAIL% --displayName "%TENANT3_USER2_NAME%" --password %TENANT3_USER2_PASSWORD%
if errorlevel 1 goto :user_error

call npm run bootstrap:tenant-user -- --tenantSlug %TENANT3_SLUG% --email %TENANT3_USER3_EMAIL% --displayName "%TENANT3_USER3_NAME%" --password %TENANT3_USER3_PASSWORD%
if errorlevel 1 goto :user_error

echo [92m✓[0m 3 utilisateurs créés pour %TENANT3_NAME%
echo.

REM ============================================================================
REM Étape 16: Seed des données dashboard (consents, ai_jobs, rgpd_requests, audit_events)
REM ============================================================================

echo [96m[Étape 16/16][0m Seed des données dashboard...
echo.

REM Exécuter le seed SQL via stdin pour éviter problèmes de montage de volumes
type migrations\seeds\dev-dashboard-data.sql | docker exec -i %DB_CONTAINER% psql -U devuser -d rgpd_platform >nul 2>&1

if errorlevel 1 (
    echo [93m⚠[0m  Échec du seed des données dashboard (non bloquant)
) else (
    echo [92m✓[0m Données dashboard créées (consents, ai_jobs, rgpd_requests, audit_events)
)
echo.

REM ============================================================================
REM Résumé final
REM ============================================================================

echo.
echo [92m========================================================================[0m
echo [92m  ✓ Setup terminé avec succès ![0m
echo [92m========================================================================[0m
echo.
echo [96mComptes créés:[0m
echo.
echo   [1m1. Super Admin (accès plateforme)[0m
echo      Email:    %TEST_PLATFORM_ADMIN_EMAIL%
echo      Password: %TEST_PLATFORM_ADMIN_PASSWORD%
echo.
echo   [1m2. Tenant "%TENANT1_NAME%" (slug: %TENANT1_SLUG%)[0m
echo      Admin:    %TENANT1_ADMIN_EMAIL% / %TENANT1_ADMIN_PASSWORD%
echo      Users:    %TENANT1_USER1_EMAIL% / %TENANT1_USER1_PASSWORD%
echo                %TENANT1_USER2_EMAIL% / %TENANT1_USER2_PASSWORD%
echo                %TENANT1_USER3_EMAIL% / %TENANT1_USER3_PASSWORD%
echo.
echo   [1m3. Tenant "%TENANT2_NAME%" (slug: %TENANT2_SLUG%)[0m
echo      Admin:    %TENANT2_ADMIN_EMAIL% / %TENANT2_ADMIN_PASSWORD%
echo      Users:    %TENANT2_USER1_EMAIL% / %TENANT2_USER1_PASSWORD%
echo                %TENANT2_USER2_EMAIL% / %TENANT2_USER2_PASSWORD%
echo.
echo   [1m4. Tenant "%TENANT3_NAME%" (slug: %TENANT3_SLUG%)[0m
echo      Admin:    %TENANT3_ADMIN_EMAIL% / %TENANT3_ADMIN_PASSWORD%
echo      Users:    %TENANT3_USER1_EMAIL% / %TENANT3_USER1_PASSWORD%
echo                %TENANT3_USER2_EMAIL% / %TENANT3_USER2_PASSWORD%
echo                %TENANT3_USER3_EMAIL% / %TENANT3_USER3_PASSWORD%
echo.
echo [96mProchaines étapes:[0m
echo.
echo   1. Démarrer l'application:
echo      [93mnpm run dev[0m
echo.
echo   2. Ouvrir le navigateur:
echo      [93mhttp://localhost:3000[0m
echo.
echo   3. Se connecter avec l'un des comptes ci-dessus
echo.
echo [96mCommandes utiles:[0m
echo.
echo   - Voir les logs DB:     [93mdocker logs %DB_CONTAINER% -f[0m
echo   - Accéder à la DB:      [93mdocker exec -it %DB_CONTAINER% psql -U devuser -d rgpd_platform[0m
echo   - Arrêter les services: [93mdocker-compose -f %COMPOSE_FILE% down[0m
echo   - Reset complet:        [93msetup-dev.bat[0m (ce script)
echo.
echo [92m========================================================================[0m
echo.

exit /b 0

REM ============================================================================
REM Gestion des erreurs
REM ============================================================================

:user_error
echo [91m✗[0m Échec de la création de l'utilisateur
echo [93m⚠[0m  Vérifiez les logs ci-dessus pour plus de détails
exit /b 1

:admin_error
echo [91m✗[0m Échec de la création du Tenant Admin
echo [93m⚠[0m  Vérifiez les logs ci-dessus pour plus de détails
exit /b 1

:tenant_error
echo [91m✗[0m Échec de la création du tenant
echo [93m⚠[0m  Vérifiez les logs ci-dessus pour plus de détails
exit /b 1

REM ============================================================================
REM Aide
REM ============================================================================

:show_help
echo.
echo [96mUsage:[0m setup-dev.bat [OPTIONS]
echo.
echo [96mOptions:[0m
echo   --skip-clean    Skip le nettoyage Docker (garde les données existantes)
echo   --help, -h      Affiche cette aide
echo.
echo [96mDescription:[0m
echo   Ce script effectue un setup COMPLET de l'environnement de développement
echo   en une seule commande. Il crée:
echo     - Une base de données PostgreSQL propre
echo     - Un Super Admin (accès plateforme)
echo     - 3 tenants de test (Acme Corp, TechCorp, GlobalServices)
echo     - 1 Tenant Admin par tenant
echo     - 2-3 utilisateurs réguliers par tenant
echo.
echo [96mConfiguration:[0m
echo   Les credentials par défaut sont définis dans .env (ou .env.example).
echo   Variables utilisées:
echo     - TEST_PLATFORM_ADMIN_EMAIL
echo     - TEST_PLATFORM_ADMIN_PASSWORD
echo     - TEST_PLATFORM_ADMIN_NAME
echo     - TEST_TENANT_ADMIN_EMAIL
echo     - TEST_TENANT_ADMIN_PASSWORD
echo     - TEST_TENANT_ADMIN_NAME
echo     - TEST_TENANT_NAME
echo     - TEST_TENANT_SLUG
echo.
echo [96mExemples:[0m
echo   setup-dev.bat              Setup complet (recommandé)
echo   setup-dev.bat --skip-clean Setup rapide (garde les données)
echo.
exit /b 0
