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

REM Launch PowerShell script directly with project directory
powershell -NoProfile -ExecutionPolicy Bypass -File "!PROJECT_DIR!\scripts\launch-dashboard.ps1" -projectDir "!PROJECT_DIR!"

if errorlevel 1 (
  color 0C
  echo.
  echo [ERREUR] Le lancement a échoué
  echo.
  pause
  exit /b 1
)

exit /b 0
