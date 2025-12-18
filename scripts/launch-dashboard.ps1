$port = 3000
$url = "http://localhost:$port/vhr-dashboard-pro.html"

# Use project directory passed from batch, or current location
if (-not $projectDir) { $projectDir = Get-Location }
$dir = $projectDir.ToString()

# ========== FUNCTIONS ==========
function Show-Progress {
  param([string]$msg)
  Write-Host "[VHR] $msg" -ForegroundColor Cyan
}

function Show-Error {
  param([string]$msg, [string]$solution = "")
  Write-Host "[ERROR] $msg" -ForegroundColor Red
  if ($solution) { Write-Host "        💡 $solution" -ForegroundColor Yellow }
}

function Show-Success {
  param([string]$msg)
  Write-Host "[OK] $msg" -ForegroundColor Green
}

function Check-NodeJS {
  Show-Progress "Vérification de Node.js..."
  $nodeVersion = node --version 2>&1
  if ($LASTEXITCODE -ne 0) {
    Show-Error "Node.js n'est pas installé" "Téléchargez Node.js depuis https://nodejs.org"
    pause; exit 1
  }
  Show-Success "Node.js $nodeVersion trouvé"
}

function Check-ProjectDir {
  if (-not (Test-Path "$dir\package.json")) {
    Show-Error "Projet VR-Manager non trouvé dans $dir" "Assurez-vous que le fichier package.json existe"
    pause; exit 1
  }
  Show-Success "Répertoire du projet: $dir"
}

function Check-PortAvailable {
  param([int]$port)
  try {
    $connection = New-Object System.Net.Sockets.TcpClient
    $connection.Connect("127.0.0.1", $port)
    $connection.Dispose()
    return $false  # Port is in use
  } catch {
    return $true   # Port is available
  }
}

function Install-Dependencies {
  Show-Progress "Vérification des dépendances npm..."
  if (-not (Test-Path "$dir\node_modules")) {
    Show-Progress "Installation des dépendances (cela peut prendre 1-2 minutes)..."
    Push-Location $dir
    npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Show-Error "Erreur lors de l'installation npm" "Vérifiez votre connexion Internet"
      pause; exit 1
    }
    Pop-Location
  }
  Show-Success "Dépendances OK"
}

function Start-Server {
  Show-Progress "Démarrage du serveur..."
  
  # Check if port is available
  if (-not (Check-PortAvailable $port)) {
    Show-Error "Le port $port est déjà utilisé" "Fermer les autres applications ou utiliser un port différent"
    pause; exit 1
  }
  
  $proc = New-Object System.Diagnostics.ProcessStartInfo
  $proc.FileName = "node"
  $proc.Arguments = "server.js"
  $proc.WorkingDirectory = $dir
  $proc.UseShellExecute = $false
  $proc.RedirectStandardOutput = $true
  $proc.RedirectStandardError = $true
  $proc.CreateNoWindow = $true
  
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $proc
  $p.Start() | Out-Null
  
  return $p
}

function Wait-ForServer {
  param([object]$process, [int]$timeout = 120)
  
  Show-Progress "Attente du démarrage du serveur..."
  
  for ($i = 0; $i -lt $timeout; $i++) {
    if ($process.HasExited) {
      $stdout = $process.StandardOutput.ReadToEnd()
      $stderr = $process.StandardError.ReadToEnd()
      Show-Error "Le serveur a échoué au démarrage" "Vérifiez les détails ci-dessous:"
      Write-Host ""
      Write-Host $stderr -ForegroundColor Yellow
      Write-Host $stdout
      pause; exit 1
    }
    
    try {
      $r = Invoke-WebRequest -Uri "http://localhost:$port/ping" -TimeoutSec 1 -UseBasicParsing -ErrorAction SilentlyContinue -WarningAction SilentlyContinue
      if ($r.StatusCode -eq 200) {
        Show-Success "Serveur prêt après $(($i * 0.5).ToString('F1'))s"
        return $true
      }
    } catch { }
    
    Start-Sleep -Milliseconds 500
    if ($i % 4 -eq 0 -and $i -gt 0) { Write-Host "." -NoNewline }
  }
  
  Show-Error "Le serveur n'a pas démarré après ${timeout}s" "Vérifiez qu'il n'y a pas d'erreur JavaScript dans le code"
  $process.Kill()
  pause; exit 1
}

# ========== MAIN FLOW ==========
Clear-Host
Write-Host ""
Write-Host "╔════════════════════════════════════════╗"
Write-Host "║   VHR DASHBOARD - Lancement en cours   ║"
Write-Host "╚════════════════════════════════════════╝"
Write-Host ""

Check-NodeJS
Check-ProjectDir
Install-Dependencies

$serverProcess = Start-Server
Wait-ForServer $serverProcess

Show-Success "Ouverture du dashboard..."
Start-Process $url

Write-Host ""
Write-Host "╔════════════════════════════════════════╗"
Write-Host "║   ✓ Dashboard lancé avec succès!      ║"
Write-Host "║   URL: $url" -PadRight 41 -ForegroundColor Green
Write-Host "║   Fermer cette fenêtre pour arrêter   ║"
Write-Host "╚════════════════════════════════════════╝"
Write-Host ""

# Keep server running
$serverProcess.WaitForExit()