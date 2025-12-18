@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

cls
echo.
echo  ╔════════════════════════════════════════╗
echo  ║  VHR DASHBOARD - Lancement automatique ║
echo  ╚════════════════════════════════════════╝
echo.

REM Search for the project by looking for package.json
set "PROJECT_DIR="

REM Check common locations
if exist "C:\Users\peter\VR-Manager\package.json" (
  set "PROJECT_DIR=C:\Users\peter\VR-Manager"
) else if exist "%USERPROFILE%\VR-Manager\package.json" (
  set "PROJECT_DIR=!USERPROFILE!\VR-Manager"
) else if exist "%USERPROFILE%\Documents\VR-Manager\package.json" (
  set "PROJECT_DIR=!USERPROFILE!\Documents\VR-Manager"
) else if exist "C:\VR-Manager\package.json" (
  set "PROJECT_DIR=C:\VR-Manager"
)

if "!PROJECT_DIR!"=="" (
  color 0C
  echo [ERREUR] Impossible de trouver le répertoire VR-Manager
  echo.
  echo Vérifiez que VR-Manager est installé dans:
  echo   - C:\Users\%USERNAME%\VR-Manager
  echo   - C:\Users\%USERNAME%\Documents\VR-Manager
  echo   - C:\VR-Manager
  echo.
  pause
  exit /b 1
)

echo [OK] Répertoire trouvé: !PROJECT_DIR!
echo.
echo  Préparation du lancement...
echo.

REM Execute PowerShell launcher with admin rights handling
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$projectDir = '!PROJECT_DIR!'; " ^
  "Write-Host ''; " ^
  "$scriptPath = Join-Path $projectDir 'scripts\launch-dashboard.ps1'; " ^
  "if (-not (Test-Path $scriptPath)) { " ^
  "  Write-Host '[ERREUR] Script de lancement non trouvé!' -ForegroundColor Red; " ^
  "  Write-Host \"Expected: $scriptPath\" -ForegroundColor Yellow; " ^
  "  Read-Host 'Appuyez sur Entrée pour quitter'; " ^
  "  exit 1; " ^
  "} " ^
  "& $scriptPath"

if errorlevel 1 (
  color 0C
  echo.
  echo [ERREUR] Le lancement a échoué
  echo.
  pause
  exit /b 1
)

exit /b 0
