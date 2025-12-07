@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo VHR Dashboard Launcher
echo ========================================
echo.

REM Find the project directory (where this batch file is located)
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."

echo Project directory: %PROJECT_DIR%
echo.
echo Downloading and executing launcher...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$projectDir='%PROJECT_DIR%'; ^
   iex (New-Object System.Net.WebClient).DownloadString('https://vhr-dashboard-site.onrender.com/scripts/launch-dashboard.ps1')"

pause
