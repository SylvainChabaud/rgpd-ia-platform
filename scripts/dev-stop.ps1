#!/usr/bin/env pwsh
# Script d'arrêt développement local
# Usage: .\scripts\dev-stop.ps1

Write-Host "🛑 Arrêt environnement de développement..." -ForegroundColor Red

# 1. Arrêter Next.js (si en background)
Write-Host "`n🔴 Arrêt Next.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next dev*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Arrêter PostgreSQL
Write-Host "`n🐘 Arrêt PostgreSQL..." -ForegroundColor Yellow
docker stop rgpd-db 2>$null

# 3. Supprimer le conteneur (garde les données dans le volume)
docker rm rgpd-db 2>$null

Write-Host "`n✅ Environnement arrêté proprement !" -ForegroundColor Green
Write-Host "   Les données PostgreSQL sont conservées dans le volume 'rgpd-postgres-data'" -ForegroundColor White
Write-Host "`n💡 Pour redémarrer, exécutez:" -ForegroundColor Cyan
Write-Host "   .\scripts\dev-start.ps1`n" -ForegroundColor White
