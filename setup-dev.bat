@echo off
chcp 65001 >nul 2>&1
REM ============================================================================
REM RGPD-IA Platform - Setup environnement de developpement
REM ============================================================================
REM
REM Usage:
REM   setup-dev.bat          - Menu interactif avec 3 options
REM   setup-dev.bat 1        - Option 1: Tout recreer (reset complet)
REM   setup-dev.bat 2        - Option 2: Comptes uniquement (sans simulation)
REM   setup-dev.bat 3        - Option 3: Donnees de simulation uniquement
REM   setup-dev.bat --help   - Affiche cette aide
REM
REM ============================================================================

setlocal enabledelayedexpansion

REM ============================================================================
REM Configuration
REM ============================================================================

set COMPOSE_FILE=docker-compose.dev.yml
set DB_SERVICE=db
set DB_CONTAINER=rgpd-platform-db-dev

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
set TENANT3_USER1_EMAIL=frank@globalservices.local
set TENANT3_USER1_NAME=Frank Moreau
set TENANT3_USER1_PASSWORD=User1234
set TENANT3_USER2_EMAIL=grace@globalservices.local
set TENANT3_USER2_NAME=Grace Lefevre
set TENANT3_USER2_PASSWORD=User1234
set TENANT3_USER3_EMAIL=henry@globalservices.local
set TENANT3_USER3_NAME=Henry Simon
set TENANT3_USER3_PASSWORD=User1234

REM ============================================================================
REM Parsing des arguments
REM ============================================================================

if /i "%~1"=="--help" goto :show_help
if /i "%~1"=="-h" goto :show_help
if "%~1"=="1" (
    set MODE=1
    goto :execute_mode
)
if "%~1"=="2" (
    set MODE=2
    goto :execute_mode
)
if "%~1"=="3" (
    set MODE=3
    goto :execute_mode
)

REM ============================================================================
REM Menu interactif
REM ============================================================================

:show_menu
echo.
echo ========================================================================
echo   RGPD-IA Platform - Setup Environnement de Developpement
echo ========================================================================
echo.
echo Choisissez une option:
echo.
echo   1 - Tout recreer (reset complet)
echo       Supprime tout, recree la DB, les comptes ET les donnees de simulation
echo.
echo   2 - Comptes uniquement
echo       Reset complet mais SANS donnees de simulation
echo       (finalites, consentements, jobs IA, violations...)
echo.
echo   3 - Donnees de simulation uniquement
echo       Ajoute les donnees de simulation aux comptes existants
echo       (ne touche pas aux comptes)
echo.
set /p "MODE=Votre choix (1/2/3): "

if "!MODE!"=="1" goto :execute_mode
if "!MODE!"=="2" goto :execute_mode
if "!MODE!"=="3" goto :execute_mode

echo.
echo [X] Choix invalide. Veuillez entrer 1, 2 ou 3.
goto :show_menu

REM ============================================================================
REM Execution selon le mode choisi
REM ============================================================================

:execute_mode

echo.
if "%MODE%"=="1" (
    echo [+] Mode 1: Tout recreer - reset complet + simulation
    set DO_CLEAN=true
    set DO_ACCOUNTS=true
    set DO_SIMULATION=true
)
if "%MODE%"=="2" (
    echo [+] Mode 2: Comptes uniquement - reset complet, sans simulation
    set DO_CLEAN=true
    set DO_ACCOUNTS=true
    set DO_SIMULATION=false
)
if "%MODE%"=="3" (
    echo [+] Mode 3: Donnees de simulation uniquement
    set DO_CLEAN=false
    set DO_ACCOUNTS=false
    set DO_SIMULATION=true
)
echo.

REM ============================================================================
REM Confirmation pour les modes destructifs
REM ============================================================================

if "%DO_CLEAN%"=="true" (
    echo [!] ATTENTION: Ce mode va SUPPRIMER toutes les donnees existantes !
    echo.
    set /p "CONFIRM=Tapez 'OUI' pour continuer: "
    if /i not "!CONFIRM!"=="OUI" (
        echo [X] Setup annule
        exit /b 1
    )
    echo.
)

REM ============================================================================
REM Mode 3: Simulation uniquement - sauter directement aux seeds
REM ============================================================================

if "%MODE%"=="3" goto :clean_simulation

REM ============================================================================
REM Etape 1: Nettoyage Docker
REM ============================================================================

echo [Etape 1/14] Nettoyage de l'environnement Docker...
echo.

echo   Arret des services Docker...
docker-compose -f %COMPOSE_FILE% down -v 2>nul

echo   Suppression des conteneurs orphelins...
docker rm -f %DB_CONTAINER% 2>nul

echo   Suppression du volume PostgreSQL...
docker volume rm rgpd-ia-platform_postgres_data 2>nul

echo [+] Docker nettoye
echo.

REM ============================================================================
REM Etape 2: Demarrage PostgreSQL
REM ============================================================================

echo [Etape 2/14] Demarrage de PostgreSQL...
echo.

docker-compose -f %COMPOSE_FILE% up -d %DB_SERVICE%

if errorlevel 1 (
    echo [X] Echec du demarrage de PostgreSQL
    echo [!] Verifiez que Docker Desktop est demarre
    exit /b 1
)

echo [+] PostgreSQL demarre
echo.

REM ============================================================================
REM Etape 3: Attente de la disponibilite PostgreSQL
REM ============================================================================

echo [Etape 3/14] Attente de la disponibilite de PostgreSQL...
echo.

set MAX_RETRIES=30
set RETRY_COUNT=0

:wait_db
set /a RETRY_COUNT+=1

docker exec %DB_CONTAINER% pg_isready -U devuser -d rgpd_platform >nul 2>&1

if errorlevel 1 (
    if !RETRY_COUNT! geq %MAX_RETRIES% (
        echo [X] PostgreSQL n'est pas pret apres %MAX_RETRIES% secondes
        exit /b 1
    )
    echo   Tentative !RETRY_COUNT!/%MAX_RETRIES%...
    ping 127.0.0.1 -n 2 >nul 2>&1
    goto :wait_db
)

echo [+] PostgreSQL est pret
echo.

REM ============================================================================
REM Etape 4: Execution des migrations SQL
REM ============================================================================

echo [Etape 4/14] Execution des migrations SQL...
echo.

call npm run migrate

if errorlevel 1 (
    echo [X] Echec des migrations SQL
    exit /b 1
)

echo [+] Migrations SQL executees
echo.

REM ============================================================================
REM Etape 5: Creation du Super Admin
REM ============================================================================

echo [Etape 5/14] Creation du Super Admin...
echo.

call npm run bootstrap:superadmin -- --email %TEST_PLATFORM_ADMIN_EMAIL% --displayName "%TEST_PLATFORM_ADMIN_NAME%" --password %TEST_PLATFORM_ADMIN_PASSWORD%

if errorlevel 1 (
    echo [X] Echec de la creation du Super Admin
    exit /b 1
)

echo [+] Super Admin cree: %TEST_PLATFORM_ADMIN_EMAIL%
echo.

REM ============================================================================
REM Etape 6-8: Tenant 1 (Acme Corp)
REM ============================================================================

echo [Etape 6/14] Creation du tenant "%TENANT1_NAME%"...
call npm run bootstrap:tenant -- --name "%TENANT1_NAME%" --slug %TENANT1_SLUG%
if errorlevel 1 goto :tenant_error

echo [Etape 7/14] Creation du Tenant Admin pour %TENANT1_NAME%...
call npm run bootstrap:tenant-admin -- --tenantSlug %TENANT1_SLUG% --email %TENANT1_ADMIN_EMAIL% --displayName "%TENANT1_ADMIN_NAME%" --password %TENANT1_ADMIN_PASSWORD%
if errorlevel 1 goto :admin_error

echo [Etape 8/14] Creation des utilisateurs pour %TENANT1_NAME%...
call npm run bootstrap:tenant-user -- --tenantSlug %TENANT1_SLUG% --email %TENANT1_USER1_EMAIL% --displayName "%TENANT1_USER1_NAME%" --password %TENANT1_USER1_PASSWORD%
call npm run bootstrap:tenant-user -- --tenantSlug %TENANT1_SLUG% --email %TENANT1_USER2_EMAIL% --displayName "%TENANT1_USER2_NAME%" --password %TENANT1_USER2_PASSWORD%
call npm run bootstrap:tenant-user -- --tenantSlug %TENANT1_SLUG% --email %TENANT1_USER3_EMAIL% --displayName "%TENANT1_USER3_NAME%" --password %TENANT1_USER3_PASSWORD%
echo [+] Tenant %TENANT1_NAME% cree avec 3 utilisateurs
echo.

REM ============================================================================
REM Etape 9-11: Tenant 2 (TechCorp)
REM ============================================================================

echo [Etape 9/14] Creation du tenant "%TENANT2_NAME%"...
call npm run bootstrap:tenant -- --name "%TENANT2_NAME%" --slug %TENANT2_SLUG%
if errorlevel 1 goto :tenant_error

echo [Etape 10/14] Creation du Tenant Admin pour %TENANT2_NAME%...
call npm run bootstrap:tenant-admin -- --tenantSlug %TENANT2_SLUG% --email %TENANT2_ADMIN_EMAIL% --displayName "%TENANT2_ADMIN_NAME%" --password %TENANT2_ADMIN_PASSWORD%
if errorlevel 1 goto :admin_error

echo [Etape 11/14] Creation des utilisateurs pour %TENANT2_NAME%...
call npm run bootstrap:tenant-user -- --tenantSlug %TENANT2_SLUG% --email %TENANT2_USER1_EMAIL% --displayName "%TENANT2_USER1_NAME%" --password %TENANT2_USER1_PASSWORD%
call npm run bootstrap:tenant-user -- --tenantSlug %TENANT2_SLUG% --email %TENANT2_USER2_EMAIL% --displayName "%TENANT2_USER2_NAME%" --password %TENANT2_USER2_PASSWORD%
echo [+] Tenant %TENANT2_NAME% cree avec 2 utilisateurs
echo.

REM ============================================================================
REM Etape 12-14: Tenant 3 (GlobalServices)
REM ============================================================================

echo [Etape 12/14] Creation du tenant "%TENANT3_NAME%"...
call npm run bootstrap:tenant -- --name "%TENANT3_NAME%" --slug %TENANT3_SLUG%
if errorlevel 1 goto :tenant_error

echo [Etape 13/14] Creation du Tenant Admin pour %TENANT3_NAME%...
call npm run bootstrap:tenant-admin -- --tenantSlug %TENANT3_SLUG% --email %TENANT3_ADMIN_EMAIL% --displayName "%TENANT3_ADMIN_NAME%" --password %TENANT3_ADMIN_PASSWORD%
if errorlevel 1 goto :admin_error

echo [Etape 14/14] Creation des utilisateurs pour %TENANT3_NAME%...
call npm run bootstrap:tenant-user -- --tenantSlug %TENANT3_SLUG% --email %TENANT3_USER1_EMAIL% --displayName "%TENANT3_USER1_NAME%" --password %TENANT3_USER1_PASSWORD%
call npm run bootstrap:tenant-user -- --tenantSlug %TENANT3_SLUG% --email %TENANT3_USER2_EMAIL% --displayName "%TENANT3_USER2_NAME%" --password %TENANT3_USER2_PASSWORD%
call npm run bootstrap:tenant-user -- --tenantSlug %TENANT3_SLUG% --email %TENANT3_USER3_EMAIL% --displayName "%TENANT3_USER3_NAME%" --password %TENANT3_USER3_PASSWORD%
echo [+] Tenant %TENANT3_NAME% cree avec 3 utilisateurs
echo.

REM ============================================================================
REM Donnees de simulation (si mode 1)
REM ============================================================================

if "%DO_SIMULATION%"=="false" goto :show_summary

REM ============================================================================
REM Mode 3: Nettoyage des donnees de simulation (sans toucher aux comptes)
REM ============================================================================

:clean_simulation

echo.
echo ========================================================================
echo   Nettoyage des donnees de simulation existantes
echo ========================================================================
echo.

echo [Clean 1/6] Suppression des consentements...
docker exec -i %DB_CONTAINER% psql -U devuser -d rgpd_platform -c "DELETE FROM consents;" >nul 2>&1
if errorlevel 1 (
    echo [!] Echec de la suppression des consents
) else (
    echo [+] Consentements supprimes
)

echo [Clean 2/6] Suppression des finalites...
docker exec -i %DB_CONTAINER% psql -U devuser -d rgpd_platform -c "DELETE FROM purposes;" >nul 2>&1
if errorlevel 1 (
    echo [!] Echec de la suppression des purposes
) else (
    echo [+] Finalites supprimees
)

echo [Clean 3/6] Suppression des jobs IA...
docker exec -i %DB_CONTAINER% psql -U devuser -d rgpd_platform -c "DELETE FROM ai_jobs;" >nul 2>&1
if errorlevel 1 (
    echo [!] Echec de la suppression des ai_jobs
) else (
    echo [+] Jobs IA supprimes
)

echo [Clean 4/6] Suppression des requetes RGPD...
docker exec -i %DB_CONTAINER% psql -U devuser -d rgpd_platform -c "DELETE FROM rgpd_requests;" >nul 2>&1
if errorlevel 1 (
    echo [!] Echec de la suppression des rgpd_requests
) else (
    echo [+] Requetes RGPD supprimees
)

echo [Clean 5/6] Suppression des violations...
docker exec -i %DB_CONTAINER% psql -U devuser -d rgpd_platform -c "DELETE FROM security_incidents;" >nul 2>&1
if errorlevel 1 (
    echo [!] Echec de la suppression des security_incidents
) else (
    echo [+] Violations supprimees
)

echo [Clean 6/6] Suppression des evenements d'audit...
docker exec -i %DB_CONTAINER% psql -U devuser -d rgpd_platform -c "DELETE FROM audit_events;" >nul 2>&1
if errorlevel 1 (
    echo [!] Echec de la suppression des audit_events
) else (
    echo [+] Evenements d'audit supprimes
)

echo.

:seed_simulation

echo.
echo ========================================================================
echo   Generation des donnees de simulation
echo ========================================================================
echo.

echo [Seed 1/3] Finalites et consentements...
type migrations\seeds\dev-purposes-consents.sql | docker exec -i %DB_CONTAINER% psql -U devuser -d rgpd_platform >nul 2>&1
if errorlevel 1 (
    echo [!] Echec du seed purposes/consents
) else (
    echo [+] Finalites et consentements crees
)

echo [Seed 2/3] Violations RGPD...
type migrations\seeds\dev-incidents.sql | docker exec -i %DB_CONTAINER% psql -U devuser -d rgpd_platform >nul 2>&1
if errorlevel 1 (
    echo [!] Echec du seed violations
) else (
    echo [+] 10 violations RGPD creees
)

echo [Seed 3/3] Donnees dashboard (ai_jobs, rgpd_requests, audit_events)...
type migrations\seeds\dev-dashboard-data.sql | docker exec -i %DB_CONTAINER% psql -U devuser -d rgpd_platform >nul 2>&1
if errorlevel 1 (
    echo [!] Echec du seed dashboard
) else (
    echo [+] Donnees dashboard creees
)

echo.

REM ============================================================================
REM Resume final
REM ============================================================================

:show_summary

echo.
echo ========================================================================
echo   [+] Setup termine avec succes !
echo ========================================================================
echo.

if "%DO_ACCOUNTS%"=="true" (
    echo Comptes crees:
    echo.
    echo   Super Admin: %TEST_PLATFORM_ADMIN_EMAIL% / %TEST_PLATFORM_ADMIN_PASSWORD%
    echo.
    echo   %TENANT1_NAME%:
    echo     Admin: %TENANT1_ADMIN_EMAIL% / %TENANT1_ADMIN_PASSWORD%
    echo     Users: %TENANT1_USER1_EMAIL%, %TENANT1_USER2_EMAIL%, %TENANT1_USER3_EMAIL%
    echo.
    echo   %TENANT2_NAME%:
    echo     Admin: %TENANT2_ADMIN_EMAIL% / %TENANT2_ADMIN_PASSWORD%
    echo     Users: %TENANT2_USER1_EMAIL%, %TENANT2_USER2_EMAIL%
    echo.
    echo   %TENANT3_NAME%:
    echo     Admin: %TENANT3_ADMIN_EMAIL% / %TENANT3_ADMIN_PASSWORD%
    echo     Users: %TENANT3_USER1_EMAIL%, %TENANT3_USER2_EMAIL%, %TENANT3_USER3_EMAIL%
    echo.
)

if "%DO_SIMULATION%"=="true" (
    echo Donnees de simulation creees:
    echo   - Finalites de traitement IA (purposes)
    echo   - Consentements utilisateurs (consents)
    echo   - Jobs IA (ai_jobs)
    echo   - Requetes RGPD (rgpd_requests)
    echo   - Violations de securite (security_incidents)
    echo   - Evenements d'audit (audit_events)
    echo.
    echo [!] Ces donnees sont FICTIVES (simulation).
    echo.
)

echo Prochaine etape: npm run dev
echo.

exit /b 0

REM ============================================================================
REM Gestion des erreurs
REM ============================================================================

:tenant_error
echo [X] Echec de la creation du tenant
exit /b 1

:admin_error
echo [X] Echec de la creation du Tenant Admin
exit /b 1

REM ============================================================================
REM Aide
REM ============================================================================

:show_help
echo.
echo Usage: setup-dev.bat [OPTION]
echo.
echo Options:
echo   (aucune)    Menu interactif avec 3 choix
echo   1           Tout recreer (reset complet + simulation)
echo   2           Comptes uniquement (reset complet, sans simulation)
echo   3           Donnees de simulation uniquement
echo   --help      Affiche cette aide
echo.
echo Exemples:
echo   setup-dev.bat       Affiche le menu interactif
echo   setup-dev.bat 1     Reset complet avec toutes les donnees
echo   setup-dev.bat 3     Ajoute les donnees de simulation (sans toucher aux comptes)
echo.
exit /b 0
