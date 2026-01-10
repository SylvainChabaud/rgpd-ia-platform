@echo off
REM ============================================================================
REM RGPD-IA Platform - Commandes de développement quotidiennes
REM ============================================================================
REM
REM Usage:
REM   dev.bat start   - Démarre PostgreSQL + Next.js
REM   dev.bat db      - Démarre uniquement PostgreSQL
REM   dev.bat stop    - Arrête tous les services
REM   dev.bat logs    - Affiche les logs PostgreSQL
REM   dev.bat restart - Redémarre PostgreSQL
REM
REM ============================================================================

set COMPOSE_FILE=docker-compose.dev.yml
set DB_CONTAINER=rgpd-platform-db-dev

if "%~1"=="" goto :show_usage
if /i "%~1"=="start" goto :start
if /i "%~1"=="db" goto :start_db
if /i "%~1"=="stop" goto :stop
if /i "%~1"=="logs" goto :logs
if /i "%~1"=="restart" goto :restart
echo [91m✗[0m Commande inconnue: %~1
goto :show_usage

:start
echo [96m========================================================================[0m
echo [96m  Démarrage de l'environnement de développement[0m
echo [96m========================================================================[0m
echo.
echo [96m[1/2][0m Démarrage de PostgreSQL...
docker-compose -f %COMPOSE_FILE% up -d db
if errorlevel 1 (
    echo [91m✗[0m Échec du démarrage de PostgreSQL
    exit /b 1
)
echo [92m✓[0m PostgreSQL démarré
echo.
echo [96m[2/2][0m Vérification de la disponibilité...
ping 127.0.0.1 -n 3 >nul 2>&1
docker exec %DB_CONTAINER% pg_isready -U devuser -d rgpd_platform >nul 2>&1
if errorlevel 1 (
    echo [93m⚠[0m  PostgreSQL démarre... Attente de quelques secondes...
    ping 127.0.0.1 -n 6 >nul 2>&1
    docker exec %DB_CONTAINER% pg_isready -U devuser -d rgpd_platform >nul 2>&1
    if errorlevel 1 (
        echo [91m✗[0m PostgreSQL n'est pas prêt
        echo [96mℹ[0m  Vérifiez les logs: dev.bat logs
        exit /b 1
    )
)
echo [92m✓[0m PostgreSQL prêt
echo.
echo [92m========================================================================[0m
echo [92m  ✓ Environnement prêt ![0m
echo [92m========================================================================[0m
echo.
echo [96mProchaines étapes:[0m
echo.
echo   1. Lancer Next.js dans un autre terminal:
echo      [93mnpm run dev[0m
echo.
echo   2. Ouvrir le navigateur:
echo      [93mhttp://localhost:3000[0m
echo.
echo [96mCommandes utiles:[0m
echo   - Voir les logs DB:  [93mdev.bat logs[0m
echo   - Arrêter:           [93mdev.bat stop[0m
echo   - Redémarrer DB:     [93mdev.bat restart[0m
echo.
exit /b 0

:start_db
echo [96mDémarrage de PostgreSQL...[0m
docker-compose -f %COMPOSE_FILE% up -d db
if errorlevel 1 (
    echo [91m✗[0m Échec
    exit /b 1
)
echo [92m✓[0m PostgreSQL démarré
exit /b 0

:stop
echo [96mArrêt des services...[0m
docker-compose -f %COMPOSE_FILE% down
echo [92m✓[0m Services arrêtés
exit /b 0

:logs
echo [96mLogs PostgreSQL (Ctrl+C pour quitter):[0m
echo.
docker logs %DB_CONTAINER% -f
exit /b 0

:restart
echo [96mRedémarrage de PostgreSQL...[0m
docker-compose -f %COMPOSE_FILE% restart db
ping 127.0.0.1 -n 4 >nul 2>&1
docker exec %DB_CONTAINER% pg_isready -U devuser -d rgpd_platform >nul 2>&1
if errorlevel 1 (
    echo [93m⚠[0m  Attente supplémentaire...
    ping 127.0.0.1 -n 6 >nul 2>&1
)
echo [92m✓[0m PostgreSQL redémarré
exit /b 0

:show_usage
echo.
echo [96mUsage:[0m dev.bat [COMMANDE]
echo.
echo [96mCommandes:[0m
echo   start    Démarre PostgreSQL + instructions pour Next.js
echo   db       Démarre uniquement PostgreSQL (mode daemon)
echo   stop     Arrête tous les services Docker
echo   logs     Affiche les logs PostgreSQL en temps réel
echo   restart  Redémarre PostgreSQL
echo.
echo [96mExemples:[0m
echo   dev.bat start      [90m# Workflow quotidien complet[0m
echo   dev.bat db         [90m# Juste la DB en arrière-plan[0m
echo   dev.bat stop       [90m# Tout arrêter en fin de journée[0m
echo.
exit /b 0
