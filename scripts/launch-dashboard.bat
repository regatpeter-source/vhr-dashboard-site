@echo off
setlocal enabledelayedexpansion

cls
echo.
echo ============================================
echo VHR Dashboard Launcher (auto-download)
echo ============================================
echo.

REM --- Where to install the portable copy ---
set "PROJECT_DIR=%LOCALAPPDATA%\VHR-Dashboard"

REM --- Download prebuilt portable zip (includes node + deps) ---
if not exist "%PROJECT_DIR%\package.json" (
  echo [INFO] Aucune installation locale trouvee. Telechargement en cours...
  set "ZIP_FILE=%TEMP%\VHR-Dashboard-Portable.zip"
  set "ZIP_URL=%LAUNCHER_BASE_URL%/VHR-Dashboard-Portable.zip"

  if "%LAUNCHER_BASE_URL%"=="" (
    set "LAUNCHER_BASE_URL=https://vhr-dashboard-site.onrender.com"
    set "ZIP_URL=%LAUNCHER_BASE_URL%/VHR-Dashboard-Portable.zip"
  )

  powershell -NoProfile -ExecutionPolicy Bypass -Command "
    $zip = '$env:ZIP_FILE';
    $url = '$env:ZIP_URL';
    Write-Host '[DL] '$url -ForegroundColor Cyan;
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing;
    $dest = '$env:LOCALAPPDATA\VHR-Dashboard';
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force -ErrorAction SilentlyContinue }
    $tmp = Join-Path $env:TEMP 'vhr-dashboard-portable';
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
    Expand-Archive -Path $zip -DestinationPath $tmp -Force;
    Move-Item (Join-Path $tmp '*') $dest;
    Remove-Item $zip -Force -ErrorAction SilentlyContinue;
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue;
  "

  if not exist "%PROJECT_DIR%\package.json" (
    color 0C
    echo [ERREUR] Telechargement ou extraction echouee.
    echo URL: %ZIP_URL%
    pause
    exit /b 1
  )
)

echo [OK] Repertoire: %PROJECT_DIR%
echo.

REM Launch PowerShell bootstrap (installe deps si besoin + lance serveur)
powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%\scripts\launch-dashboard.ps1" -projectDir "%PROJECT_DIR%"

if errorlevel 1 (
  color 0C
  echo.
  echo [ERREUR] Le lancement a echoue
  echo.
  pause
  exit /b 1
)

exit /b 0
