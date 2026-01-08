#!/usr/bin/env pwsh
# Script de reset complet (supprime les données)
# Usage: .\scripts\dev-reset.ps1

Write-Host "⚠️  ATTENTION : Ce script va SUPPRIMER toutes les données PostgreSQL !" -ForegroundColor Red
$confirmation = Read-Host "Taper 'OUI' pour confirmer"

if ($confirmation -ne "OUI") {
    Write-Host "❌ Opération annulée" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🗑️  Reset complet de l'environnement..." -ForegroundColor Red

# 1. Arrêter tout
Write-Host "`n🛑 Arrêt des services..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next dev*" } | Stop-Process -Force -ErrorAction SilentlyContinue
docker stop rgpd-db 2>$null
docker rm rgpd-db 2>$null

# 2. Supprimer le volume (DONNÉES PERDUES)
Write-Host "`n💾 Suppression du volume PostgreSQL..." -ForegroundColor Red
docker volume rm rgpd-postgres-data 2>$null

# 3. Supprimer le dossier .next
Write-Host "`n🗂️  Nettoyage du cache Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
}

Write-Host "`n✅ Reset terminé !" -ForegroundColor Green
Write-Host "   Toutes les données ont été supprimées" -ForegroundColor White
Write-Host "`n💡 Pour redémarrer avec une base vierge:" -ForegroundColor Cyan
Write-Host "   .\scripts\dev-start.ps1`n" -ForegroundColor White
