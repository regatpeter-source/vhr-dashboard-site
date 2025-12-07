@echo off
REM VHR Dashboard Launcher Shortcut
REM Downloads and executes the PowerShell launcher script

setlocal enabledelayedexpansion

echo.
echo ========================================
echo VHR Dashboard Launcher
echo ========================================
echo.
echo Starting the PowerShell launcher...
echo.

REM Download the PowerShell script directly from the web and execute it
REM This avoids issues with file paths and encoding
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $ProgressPreference='SilentlyContinue'; iex (New-Object System.Net.WebClient).DownloadString('https://vhr-dashboard-site.onrender.com/scripts/launch-dashboard.ps1') }"

pause
