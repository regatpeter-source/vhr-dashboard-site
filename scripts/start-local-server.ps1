#!/usr/bin/env pwsh
# VHR Dashboard Local Server Launcher
# Démarre le serveur Node.js en local et ouvre le dashboard

$RepoPath = $PSScriptRoot -replace '\\scripts$', ''
$DashboardUrl = "http://localhost:3000"
$Port = 3000

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🥽 VHR Dashboard - Local Server" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier Node.js
Write-Host "[1/3] 🔍 Vérification de Node.js..." -ForegroundColor Yellow
$NodeVersion = node --version 2>$null
if ($NodeVersion) {
    Write-Host "✓ Node.js trouvé: $NodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js n'est pas installé!" -ForegroundColor Red
    Write-Host "Téléchargez Node.js depuis https://nodejs.org/" -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Start-Process "https://nodejs.org/"
    exit 1
}

# Vérifier si le port 3000 est déjà utilisé
Write-Host "[2/3] 🔌 Vérification du serveur..." -ForegroundColor Yellow
$PortInUse = $null
try {
    $PortInUse = (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue) -ne $null
} catch {
    # netstat alternative pour les systèmes sans Get-NetTCPConnection
    $PortInUse = (netstat -ano | Select-String ":$Port " -ErrorAction SilentlyContinue) -ne $null
}

if ($PortInUse) {
    Write-Host "✓ Serveur déjà en cours d'exécution sur le port $Port" -ForegroundColor Green
    Write-Host "  (Le tableau de bord s'ouvrira dans votre navigateur)" -ForegroundColor Gray
} else {
    Write-Host "🚀 Démarrage du serveur..." -ForegroundColor Yellow
    
    # Vérifier les dépendances
    if (!(Test-Path "$RepoPath\node_modules")) {
        Write-Host "  📦 Installation des dépendances..." -ForegroundColor Yellow
        Set-Location $RepoPath
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ Erreur lors de l'installation des dépendances" -ForegroundColor Red
            exit 1
        }
    }
    
    # Démarrer le serveur en arrière-plan
    Set-Location $RepoPath
    $ProcessArgs = @('-NoNewWindow', '-RedirectStandardOutput', "$env:TEMP\vhr-server.log", '-PassThru')
    $Process = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $RepoPath @ProcessArgs
    
    if ($Process) {
        Write-Host "✓ Serveur démarré (PID: $($Process.Id))" -ForegroundColor Green
        Write-Host "  Logs: $env:TEMP\vhr-server.log" -ForegroundColor Gray
        # Attendre que le serveur soit prêt
        Start-Sleep -Seconds 2
    } else {
        Write-Host "✗ Impossible de démarrer le serveur" -ForegroundColor Red
        exit 1
    }
}

# Ouvrir le dashboard
Write-Host "[3/3] 🌐 Ouverture du dashboard..." -ForegroundColor Yellow
try {
    Start-Process $DashboardUrl
    Write-Host "✓ Dashboard ouvert dans votre navigateur!" -ForegroundColor Green
} catch {
    Write-Host "⚠ Impossible d'ouvrir automatiquement le navigateur" -ForegroundColor Yellow
    Write-Host "  Accédez manuellement à: $DashboardUrl" -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✓ Tout est prêt!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Astuces:" -ForegroundColor Cyan
Write-Host "  - Le serveur continue de fonctionner en arrière-plan" -ForegroundColor Gray
Write-Host "  - Pour arrêter: Ctrl+C dans la console de commande" -ForegroundColor Gray
Write-Host "  - Logs du serveur: $env:TEMP\vhr-server.log" -ForegroundColor Gray
Write-Host ""

Start-Sleep -Seconds 1
