@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo VHR Dashboard Launcher
echo ========================================
echo.

REM Get the script directory and project directory
set "SCRIPT_DIR=%~dp0"
for /d %%I in ("%SCRIPT_DIR%..") do set "PROJECT_DIR=%%~fI"

echo Project: %PROJECT_DIR%
echo.
echo Downloading and executing launcher...
echo.

REM Download script to temp and execute
set "TEMP_PS1=%TEMP%\vhr-launcher-%RANDOM%.ps1"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url = 'https://vhr-dashboard-site.onrender.com/scripts/launch-dashboard.ps1'; " ^
  "$tempFile = '%TEMP_PS1%'; " ^
  "try { " ^
  "  (New-Object System.Net.WebClient).DownloadFile($url, $tempFile); " ^
  "  if (Test-Path $tempFile) { " ^
  "    $projectDir = '%PROJECT_DIR%'; " ^
  "    & $tempFile; " ^
  "  } " ^
  "} finally { " ^
  "  Remove-Item $tempFile -Force -ErrorAction SilentlyContinue; " ^
  "}"

pause
