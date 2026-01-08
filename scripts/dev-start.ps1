#!/usr/bin/env pwsh
# Script de demarrage developpement local
# Usage: .\scripts\dev-start.ps1

Write-Host "Demarrage environnement de developpement..." -ForegroundColor Green

# 1. Arreter les conteneurs existants
Write-Host "`nNettoyage des conteneurs existants..." -ForegroundColor Yellow
docker stop rgpd-db 2>$null
docker rm rgpd-db 2>$null

# 2. Demarrer PostgreSQL
Write-Host "`nDemarrage PostgreSQL..." -ForegroundColor Cyan
docker run -d `
  --name rgpd-db `
  -e POSTGRES_USER=devuser `
  -e POSTGRES_PASSWORD=devpass `
  -e POSTGRES_DB=rgpd_platform `
  -p 5432:5432 `
  -v rgpd-postgres-data:/var/lib/postgresql/data `
  postgres:16-alpine

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du demarrage de PostgreSQL" -ForegroundColor Red
    exit 1
}

# 3. Attendre que PostgreSQL soit pret
Write-Host "`nAttente de PostgreSQL (5 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 4. Verifier le statut
Write-Host "`nVerification des conteneurs..." -ForegroundColor Cyan
docker ps --filter "name=rgpd-db" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`nPostgreSQL est pret !" -ForegroundColor Green

# 5. Executer les migrations
Write-Host "`nExecution des migrations..." -ForegroundColor Cyan
npm run migrate

# 6. Creer les utilisateurs de test
Write-Host "`nCreation des utilisateurs de test..." -ForegroundColor Cyan
npm run test:e2e:setup
Write-Host "   - Host: localhost" -ForegroundColor White
Write-Host "   - Port: 5432" -ForegroundColor White
Write-Host "   - Database: rgpd_platform" -ForegroundColor White
Write-Host "   - User: devuser" -ForegroundColor White
Write-Host "   - Password: devpass" -ForegroundColor White

# 7. Demarrer Next.js
Write-Host "`nDemarrage Next.js..." -ForegroundColor Cyan
Write-Host "   URL: http://localhost:3000" -ForegroundColor White
Write-Host "   Login: http://localhost:3000/login" -ForegroundColor White
Write-Host "`n   Identifiants:" -ForegroundColor Yellow
Write-Host "   - Email: admin@platform.local" -ForegroundColor White
Write-Host "   - Password: AdminPass123!" -ForegroundColor White

Write-Host "`nPour arreter, appuyez sur Ctrl+C puis executez:" -ForegroundColor Yellow
Write-Host "   .\scripts\dev-stop.ps1`n" -ForegroundColor White

# Lancer Next.js (bloquant)
npm run dev
