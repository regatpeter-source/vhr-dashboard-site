param([string]$projectDir)

if (-not $projectDir) { $projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent }
$root = (Resolve-Path $projectDir).Path

Write-Host "VHR Dashboard Launcher" -ForegroundColor Cyan
Write-Host "Project: $root"

# --- Vérif Node.js ---
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Host "[ERREUR] Node.js n'est pas installe. Installe-le depuis https://nodejs.org" -ForegroundColor Red
  pause; exit 1
}

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