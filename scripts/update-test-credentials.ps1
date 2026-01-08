#!/usr/bin/env pwsh
# Script pour changer les identifiants de test
# Usage: .\scripts\update-test-credentials.ps1

Write-Host "🔑 Configuration des identifiants de test" -ForegroundColor Cyan

# Demander l'email super admin
$platformEmail = Read-Host "Email Super Admin (défaut: admin@platform.local)"
if ([string]::IsNullOrWhiteSpace($platformEmail)) {
    $platformEmail = "admin@platform.local"
}

# Demander l'email tenant admin
$tenantEmail = Read-Host "Email Tenant Admin (défaut: admin@tenant1.local)"
if ([string]::IsNullOrWhiteSpace($tenantEmail)) {
    $tenantEmail = "admin@tenant1.local"
}

# Demander le mot de passe
$password = Read-Host "Mot de passe (défaut: AdminPass123!)" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)
if ([string]::IsNullOrWhiteSpace($passwordPlain)) {
    $passwordPlain = "AdminPass123!"
}

Write-Host "`n📝 Mise à jour de seed-test-data.ts..." -ForegroundColor Yellow

# Lire le fichier
$filePath = "tests\e2e\setup\seed-test-data.ts"
$content = Get-Content $filePath -Raw

# Remplacer les valeurs
$content = $content -replace "const TEST_PASSWORD = '.*'", "const TEST_PASSWORD = '$passwordPlain'"
$content = $content -replace "const platformEmail = '.*'", "const platformEmail = '$platformEmail'"
$content = $content -replace "const tenantEmail = '.*'", "const tenantEmail = '$tenantEmail'"

# Écrire le fichier
Set-Content $filePath $content -NoNewline

Write-Host "✅ Fichier mis à jour !" -ForegroundColor Green

# Demander confirmation pour reseed
$confirm = Read-Host "`n⚠️  Voulez-vous reseed la base de données maintenant ? (O/N)"
if ($confirm -eq "O" -or $confirm -eq "o") {
    Write-Host "`n🌱 Reseed en cours..." -ForegroundColor Yellow
    npm run test:e2e:setup
    
    Write-Host "`n✅ Identifiants mis à jour !" -ForegroundColor Green
    Write-Host "`n🔐 Nouveaux identifiants:" -ForegroundColor Cyan
    Write-Host "   Super Admin:" -ForegroundColor White
    Write-Host "   - Email: $platformEmail" -ForegroundColor White
    Write-Host "   - Password: $passwordPlain" -ForegroundColor White
    Write-Host "`n   Tenant Admin:" -ForegroundColor White
    Write-Host "   - Email: $tenantEmail" -ForegroundColor White
    Write-Host "   - Password: $passwordPlain" -ForegroundColor White
} else {
    Write-Host "`n⚠️  Base non mise à jour. Exécutez manuellement:" -ForegroundColor Yellow
    Write-Host "   npm run test:e2e:setup" -ForegroundColor White
}
