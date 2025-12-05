#!/usr/bin/env pwsh
# VHR Dashboard Quick Launcher
# Starts local server and opens dashboard - completely automated and silent

# Configuration
$serverPort = 3000
$dashboardUrl = "http://localhost:$serverPort/vhr-dashboard-app.html"
$maxWaitSeconds = 30

# Colors for output
function Write-Status { Write-Host $args -ForegroundColor Cyan }
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error-Custom { Write-Host $args -ForegroundColor Red }

Write-Status "🚀 Lancement du VHR Dashboard..."

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error-Custom "❌ Node.js n'est pas installé"
    Write-Host "Téléchargez Node.js depuis: https://nodejs.org" -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    exit 1
}

Write-Success "✓ Node.js détecté"

# Get the project directory (parent of scripts folder)
$projectDir = Split-Path -Parent $PSScriptRoot

# Check if already running on port
try {
    $testConnection = Test-NetConnection -ComputerName localhost -Port $serverPort -ErrorAction SilentlyContinue
    if ($testConnection.TcpTestSucceeded) {
        Write-Status "✓ Serveur déjà actif sur le port $serverPort"
        # Open dashboard directly
        Start-Sleep -Milliseconds 500
        Start-Process $dashboardUrl
        exit 0
    }
} catch {}

# Install dependencies if node_modules doesn't exist
if (-not (Test-Path "$projectDir\node_modules")) {
    Write-Status "📦 Installation des dépendances..."
    Push-Location $projectDir
    npm install --silent 2>$null | Out-Null
    Pop-Location
    Write-Success "✓ Dépendances installées"
}

# Start the server in the background (hidden window)
Write-Status "🔧 Démarrage du serveur..."

$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "node"
$processInfo.Arguments = "server.js"
$processInfo.WorkingDirectory = $projectDir
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.CreateNoWindow = $true

$serverProcess = New-Object System.Diagnostics.Process
$serverProcess.StartInfo = $processInfo

try {
    $serverProcess.Start() | Out-Null
    Write-Success "✓ Serveur lancé (PID: $($serverProcess.Id))"
} catch {
    Write-Error-Custom "❌ Impossible de lancer le serveur"
    exit 1
}

# Wait for server to be ready (max 30 seconds)
Write-Status "⏳ Attente du serveur..."
$startTime = Get-Date
$serverReady = $false

while ((Get-Date) - $startTime -lt (New-TimeSpan -Seconds $maxWaitSeconds)) {
    try {
        $response = Invoke-WebRequest -Uri "$dashboardUrl/ping" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
            break
        }
    } catch {}
    
    Start-Sleep -Milliseconds 500
}

if (-not $serverReady) {
    Write-Error-Custom "❌ Le serveur n'a pas répondu à temps"
    $serverProcess.Kill()
    exit 1
}

Write-Success "✓ Serveur prêt!"

# Open dashboard in browser (only one window)
Write-Status "📱 Ouverture du dashboard..."
Start-Sleep -Milliseconds 200
Start-Process $dashboardUrl

Write-Success "✓ Dashboard lancé avec succès!"
Write-Host ""
Write-Host "Le serveur continue de fonctionner en arrière-plan." -ForegroundColor Gray
Write-Host "Fermez cette fenêtre quand vous avez fini." -ForegroundColor Gray

# Wait for user to close the window or server crashes
$serverProcess.WaitForExit()

# Clean up
if (-not $serverProcess.HasExited) {
    $serverProcess.Kill()
}
