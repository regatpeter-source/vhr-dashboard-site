param([string]$projectDir)

# Délègue au script auto-restart unique pour éviter les divergences
if (-not $projectDir) { $projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent }
$root = (Resolve-Path $projectDir).Path
$autoScript = Join-Path $root "start-server-auto-restart.ps1"

if (-not (Test-Path $autoScript)) {
  Write-Host "[ERREUR] start-server-auto-restart.ps1 introuvable dans $root" -ForegroundColor Red
  pause; exit 1
}

Write-Host "VHR Dashboard Launcher (delegue auto-restart)" -ForegroundColor Cyan
Write-Host "Project: $root"
Write-Host "Lancement du script auto-restart..."

# On passe par PowerShell pour garder la même logique que le .bat principal
powershell -ExecutionPolicy Bypass -File $autoScript

exit $LASTEXITCODE