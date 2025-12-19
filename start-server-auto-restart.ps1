# ============================================
# VHR Dashboard - Auto-Restart Server Script
# ============================================
# Ce script lance le serveur et le redémarre automatiquement en cas de crash

$ErrorActionPreference = "Continue"

# Configuration
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

$maxRestarts = 10          # Maximum de redémarrages avant d'abandonner
$restartDelay = 3          # Délai en secondes avant redémarrage
$crashWindow = 60          # Fenêtre en secondes pour compter les crashes rapides
$maxCrashesInWindow = 5    # Max crashes dans la fenêtre avant d'abandonner

# Variables d'état
$restartCount = 0
$crashTimes = @()

# Setup Java si disponible
if (Test-Path "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot") {
    $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
} elseif (Test-Path "C:\Java\jdk-11.0.29+7") {
    $env:JAVA_HOME = "C:\Java\jdk-11.0.29+7"
}

if ($env:JAVA_HOME) {
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
    Write-Host "☕ JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green
}

# Fonction pour afficher le header
function Show-Header {
    Clear-Host
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     🥽 VHR DASHBOARD - Serveur avec Auto-Restart         ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# Fonction pour vérifier les crashes rapides
function Test-RapidCrashes {
    $now = Get-Date
    $recentCrashes = $crashTimes | Where-Object { ($now - $_).TotalSeconds -lt $crashWindow }
    return $recentCrashes.Count -ge $maxCrashesInWindow
}

# Fonction pour ouvrir le dashboard
function Open-Dashboard {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000/vhr-dashboard-pro.html"
    Write-Host "🌐 Dashboard ouvert dans le navigateur" -ForegroundColor Green
}

# Boucle principale avec auto-restart
Show-Header

Write-Host "📌 Démarrage du serveur VHR Dashboard..." -ForegroundColor Yellow
Write-Host "📌 Le serveur redémarrera automatiquement en cas de crash" -ForegroundColor Yellow
Write-Host "📌 Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray

$firstStart = $true

while ($restartCount -lt $maxRestarts) {
    
    # Vérifier les crashes rapides répétés
    if (Test-RapidCrashes) {
        Write-Host ""
        Write-Host "❌ ERREUR: Trop de crashes rapides détectés!" -ForegroundColor Red
        Write-Host "❌ Le serveur crash en boucle. Vérifiez les erreurs ci-dessus." -ForegroundColor Red
        Write-Host ""
        Write-Host "Causes possibles:" -ForegroundColor Yellow
        Write-Host "  - Port 3000 déjà utilisé" -ForegroundColor White
        Write-Host "  - Erreur dans le code" -ForegroundColor White
        Write-Host "  - Dépendances manquantes (npm install)" -ForegroundColor White
        Write-Host ""
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 1
    }
    
    if ($firstStart) {
        $firstStart = $false
        # Ouvrir le dashboard au premier démarrage
        Start-Job -ScriptBlock { Start-Sleep -Seconds 3; Start-Process "http://localhost:3000/vhr-dashboard-pro.html" } | Out-Null
    } else {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
        Write-Host "🔄 Redémarrage #$restartCount dans $restartDelay secondes..." -ForegroundColor Yellow
        Start-Sleep -Seconds $restartDelay
    }
    
    Write-Host ""
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 🚀 Lancement du serveur Node.js..." -ForegroundColor Cyan
    Write-Host ""
    
    # Lancer le serveur
    $startTime = Get-Date
    
    try {
        & node server.js
        $exitCode = $LASTEXITCODE
    } catch {
        $exitCode = 1
        Write-Host "❌ Exception: $_" -ForegroundColor Red
    }
    
    $endTime = Get-Date
    $runTime = ($endTime - $startTime).TotalSeconds
    
    # Le serveur s'est arrêté
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ⚠️ Serveur arrêté! (code: $exitCode, durée: $([math]::Round($runTime, 1))s)" -ForegroundColor Yellow
    
    # Si le serveur a tourné longtemps, reset le compteur de crashes
    if ($runTime -gt 60) {
        $crashTimes = @()
        Write-Host "✅ Le serveur a fonctionné plus d'une minute, reset du compteur de crashes" -ForegroundColor Green
    } else {
        $crashTimes += $endTime
    }
    
    $restartCount++
}

Write-Host ""
Write-Host "❌ Nombre maximum de redémarrages atteint ($maxRestarts)" -ForegroundColor Red
Write-Host "❌ Vérifiez les logs ci-dessus pour identifier le problème" -ForegroundColor Red
Read-Host "Appuyez sur Entrée pour quitter"
