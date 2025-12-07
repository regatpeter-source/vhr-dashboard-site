@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo VHR Dashboard Launcher
echo ========================================
echo.
echo Downloading and executing launcher...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (New-Object System.Net.WebClient).DownloadString('https://vhr-dashboard-site.onrender.com/scripts/launch-dashboard.ps1')"

pause
