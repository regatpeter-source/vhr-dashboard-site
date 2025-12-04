#!/usr/bin/env pwsh
# VHR Dashboard Local Launcher
# Télécharge et lance le VHR Dashboard en local

$DashboardUrl = "https://vhr-dashboard-site.onrender.com/VHR-Dashboard-Portable.zip"
$DownloadPath = "$env:TEMP\VHR-Dashboard-Portable.zip"
$ExtractPath = "$env:TEMP\VHR-Dashboard"
$DashboardPath = "$ExtractPath\VHR-Dashboard-Portable"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🥽 VHR Dashboard Local Launcher" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Étape 1 : Télécharger
Write-Host "[1/4] 📥 Téléchargement du dashboard..." -ForegroundColor Yellow
try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $DashboardUrl -OutFile $DownloadPath -UseBasicParsing
    Write-Host "✓ Téléchargement terminé" -ForegroundColor Green
} catch {
    Write-Host "✗ Erreur de téléchargement: $_" -ForegroundColor Red
    exit 1
}

# Étape 2 : Extraire
Write-Host "[2/4] 📦 Extraction du fichier..." -ForegroundColor Yellow
if (Test-Path $ExtractPath) {
    Remove-Item -Path $ExtractPath -Recurse -Force
}
try {
    Expand-Archive -Path $DownloadPath -DestinationPath $ExtractPath
    Write-Host "✓ Extraction terminée" -ForegroundColor Green
} catch {
    Write-Host "✗ Erreur d'extraction: $_" -ForegroundColor Red
    exit 1
}

# Étape 3 : Chercher le dossier du dashboard
Write-Host "[3/4] 🔍 Recherche du dashboard..." -ForegroundColor Yellow
if (!(Test-Path $DashboardPath)) {
    $SubFolders = Get-ChildItem -Path $ExtractPath -Directory
    if ($SubFolders.Count -gt 0) {
        $DashboardPath = $SubFolders[0].FullName
    } else {
        Write-Host "✗ Dossier du dashboard non trouvé" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ Dashboard trouvé: $DashboardPath" -ForegroundColor Green

# Étape 4 : Lancer
Write-Host "[4/4] 🚀 Lancement du dashboard..." -ForegroundColor Yellow
try {
    if (Test-Path "$DashboardPath\index.html") {
        Start-Process "$DashboardPath\index.html"
        Write-Host "✓ Dashboard lancé avec succès!" -ForegroundColor Green
    } elseif (Test-Path "$DashboardPath\VHR-Dashboard.exe") {
        Start-Process "$DashboardPath\VHR-Dashboard.exe"
        Write-Host "✓ Dashboard lancé avec succès!" -ForegroundColor Green
    } else {
        Write-Host "✗ Impossible de trouver le fichier à lancer" -ForegroundColor Red
        Get-ChildItem -Path $DashboardPath -Recurse | Select-Object -First 10
        exit 1
    }
} catch {
    Write-Host "✗ Erreur au lancement: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Nettoyage du fichier ZIP..." -ForegroundColor Gray
Remove-Item -Path $DownloadPath -Force -ErrorAction SilentlyContinue
Write-Host "✓ Terminé!" -ForegroundColor Green
