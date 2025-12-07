@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo VHR Dashboard Launcher
echo ========================================
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
  echo ERROR: Could not find VR-Manager project
  pause
  exit /b 1
)

echo Project: !PROJECT_DIR!
echo.
echo Downloading and executing launcher...
echo.

REM Download script to temp and execute
set "TEMP_PS1=%TEMP%\vhr-launcher-%RANDOM%.ps1"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url = 'https://vhr-dashboard-site.onrender.com/scripts/launch-dashboard.ps1'; " ^
  "$tempFile = '%TEMP_PS1%'; " ^
  "$projectDir = '!PROJECT_DIR!'; " ^
  "try { " ^
  "  (New-Object System.Net.WebClient).DownloadFile($url, $tempFile); " ^
  "  if (Test-Path $tempFile) { " ^
  "    & $tempFile; " ^
  "  } " ^
  "} finally { " ^
  "  Remove-Item $tempFile -Force -ErrorAction SilentlyContinue; " ^
  "}"

pause
