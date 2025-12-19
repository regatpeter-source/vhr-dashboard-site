@echo off
title VHR Dashboard - Auto-Restart Server
cd /d "%~dp0"

echo.
echo ========================================
echo   VHR DASHBOARD - Auto-Restart Server
echo ========================================
echo.

REM Vérifier PowerShell
where powershell >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] PowerShell non trouve!
    pause
    exit /b 1
)

REM Lancer le script PowerShell
powershell -ExecutionPolicy Bypass -File "start-server-auto-restart.ps1"

pause
