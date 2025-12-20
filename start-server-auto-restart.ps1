# VHR Dashboard - Auto start avec relance simple
$ErrorActionPreference = "Continue"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir

$port = 3000
$maxRestarts = 5
$delay = 3

function Test-Port {
    try { (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction Stop).Count -gt 0 }
    catch { $false }
}

function Open-Dashboard {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000/vhr-dashboard-pro.html"
}

if (Test-Port) {
    Write-Host "Serveur deja actif sur $port, ouverture du dashboard..." -ForegroundColor Green
    Open-Dashboard
    exit 0
}

Write-Host "Lancement VHR Dashboard (auto-restart)" -ForegroundColor Cyan
Write-Host "Ctrl+C pour arreter" -ForegroundColor Yellow

for ($i = 0; $i -lt $maxRestarts; $i++) {
    if ($i -gt 0) {
        Write-Host "Relance #$i dans $delay s..." -ForegroundColor Yellow
        Start-Sleep -Seconds $delay
    } else {
        Start-Job -ScriptBlock { Start-Sleep -Seconds 3; Start-Process "http://localhost:3000/vhr-dashboard-pro.html" } | Out-Null
    }

    $start = Get-Date
    try {
        & node server.js
        $code = $LASTEXITCODE
    } catch {
        $code = 1
        Write-Host "Exception: $_" -ForegroundColor Red
    }

    $duration = [math]::Round((Get-Date - $start).TotalSeconds, 1)
    Write-Host "Serveur arrete (code $code, ${duration}s)" -ForegroundColor Yellow

    if ($duration -gt 60) { $i = 0 } # reset compteur apres run stable
}

Write-Host "Limite de relances atteinte ($maxRestarts)." -ForegroundColor Red
Read-Host "Appuyez sur Entree pour fermer"
