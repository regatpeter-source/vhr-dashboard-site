# ============================================
# VHR Dashboard - Auto-Restart Server Script
# ============================================
# Ce script lance le serveur et le redemarre automatiquement en cas de crash

$ErrorActionPreference = "Continue"

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

$maxRestarts = 10
$restartDelay = 3
$crashWindow = 60
$maxCrashesInWindow = 5
$port = 3000

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
    Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green
}

function Show-Header {
    Clear-Host
    Write-Host ""
    Write-Host "==== VHR DASHBOARD - Auto-Restart ====" -ForegroundColor Cyan
    Write-Host ""
}

function Test-RapidCrashes {
    $now = Get-Date
    $recentCrashes = $crashTimes | Where-Object { ($now - $_).TotalSeconds -lt $crashWindow }
    return $recentCrashes.Count -ge $maxCrashesInWindow
}

function Open-Dashboard {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000/vhr-dashboard-pro.html"
    Write-Host "Dashboard ouvert dans le navigateur" -ForegroundColor Green
}

function Server-Is-Listening {
    try {
        return (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction Stop | Measure-Object).Count -gt 0
    } catch {
        return $false
    }
}

if (Server-Is-Listening) {
    Write-Host "Serveur deja actif sur le port $port. Ouverture directe du dashboard..." -ForegroundColor Green
    Open-Dashboard
    return
}

Show-Header
Write-Host "Demarrage du serveur VHR Dashboard..." -ForegroundColor Yellow
Write-Host "Le serveur redemarrera automatiquement en cas de crash" -ForegroundColor Yellow
Write-Host "Appuyez sur Ctrl+C pour arreter" -ForegroundColor Yellow
Write-Host ""

$firstStart = $true

while ($restartCount -lt $maxRestarts) {
    if (Test-RapidCrashes) {
        Write-Host ""
        Write-Host "ERREUR: Trop de crashes rapides detectes!" -ForegroundColor Red
        Write-Host "Le serveur crash en boucle. Verifiez les erreurs ci-dessus." -ForegroundColor Red
        Write-Host ""
        Write-Host "Causes possibles:" -ForegroundColor Yellow
        Write-Host "  - Port 3000 deja utilise" -ForegroundColor White
        Write-Host "  - Erreur dans le code" -ForegroundColor White
        Write-Host "  - Dependances manquantes (npm install)" -ForegroundColor White
        Write-Host ""
        Read-Host "Appuyez sur Entree pour quitter"
        exit 1
    }

    if ($firstStart) {
        $firstStart = $false
        Start-Job -ScriptBlock { Start-Sleep -Seconds 3; Start-Process "http://localhost:3000/vhr-dashboard-pro.html" } | Out-Null
    } else {
        Write-Host "Redemarrage #$restartCount dans $restartDelay secondes..." -ForegroundColor Yellow
        Start-Sleep -Seconds $restartDelay
    }

    Write-Host "Lancement du serveur Node.js..." -ForegroundColor Cyan

    $startTime = Get-Date
    try {
        & node server.js
        $exitCode = $LASTEXITCODE
    } catch {
        $exitCode = 1
        Write-Host "Exception: $_" -ForegroundColor Red
    }

    $endTime = Get-Date
    $runTime = ($endTime - $startTime).TotalSeconds

    Write-Host "Serveur arrete (code: $exitCode, duree: $([math]::Round($runTime, 1))s)" -ForegroundColor Yellow

    if ($runTime -gt 60) {
        $crashTimes = @()
        Write-Host "Le serveur a tourne plus d'une minute, reset du compteur" -ForegroundColor Green
    } else {
        $crashTimes += $endTime
    }

    $restartCount++
}

Write-Host "Nombre maximum de redemarrages atteint ($maxRestarts)" -ForegroundColor Red
Write-Host "Verifiez les logs ci-dessus pour identifier le probleme" -ForegroundColor Red
Read-Host "Appuyez sur Entree pour quitter"
