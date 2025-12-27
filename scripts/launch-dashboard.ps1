param([string]$projectDir)

if (-not $projectDir) { $projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent }
$root = (Resolve-Path $projectDir).Path

Write-Host "VHR Dashboard Launcher" -ForegroundColor Cyan
Write-Host "Project: $root"

# --- Node.js portable (auto-install si absent) ---
$nodeDir = Join-Path $root 'node-portable'
$nodeExe = Join-Path $nodeDir 'node.exe'

function Ensure-NodePortable {
  param(
    [string]$TargetDir,
    [string]$NodeVersion = 'v20.11.1'
  )

  if (Test-Path $nodeExe) { return }

  Write-Host "[INFO] Node portable manquant, téléchargement..." -ForegroundColor Yellow
  New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
  $zipUrl = "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-win-x64.zip"
  $zipPath = Join-Path $env:TEMP "node-$NodeVersion-win-x64.zip"

  try {
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath $env:TEMP -Force
    $extracted = Join-Path $env:TEMP "node-$NodeVersion-win-x64"
    if (-not (Test-Path $extracted)) { throw "Extraction échouée" }
    Move-Item -Force $extracted\* $TargetDir
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
  } catch {
    Write-Host "[ERREUR] Impossible de télécharger/extraire Node portable : $($_.Exception.Message)" -ForegroundColor Red
    pause; exit 1
  }
}

Ensure-NodePortable -TargetDir $nodeDir

# Préfixer le PATH pour cette session (pour npm et node)
$env:Path = "$nodeDir;$env:Path"
Write-Host "[OK] Node portable prêt: $nodeExe" -ForegroundColor Green

# --- Installer les dépendances si absentes ---
$pkg = Join-Path $root 'package.json'
if (-not (Test-Path $pkg)) {
  Write-Host "[ERREUR] package.json introuvable dans $root" -ForegroundColor Red
  pause; exit 1
}

$nodeModules = Join-Path $root 'node_modules'
if (-not (Test-Path $nodeModules)) {
  Write-Host "[INFO] Installation des dépendances (npm install --omit=dev)" -ForegroundColor Yellow
  Push-Location $root
  try {
    npm install --omit=dev
    if ($LASTEXITCODE -ne 0) {
      throw "npm install a retourné $LASTEXITCODE"
    }
  } catch {
    Write-Host "[ERREUR] Installation npm échouée: $($_.Exception.Message)" -ForegroundColor Red
    Pop-Location
    pause; exit 1
  }
  Pop-Location
} else {
  Write-Host "[OK] Dépendances déjà présentes" -ForegroundColor Green
}

$autoScript = Join-Path $root 'start-server-auto-restart.ps1'
if (-not (Test-Path $autoScript)) {
  Write-Host "[ERREUR] start-server-auto-restart.ps1 introuvable dans $root" -ForegroundColor Red
  pause; exit 1
}

Write-Host "Lancement du serveur (auto-restart)..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File $autoScript

exit $LASTEXITCODE