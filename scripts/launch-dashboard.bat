@echo off
REM VHR Dashboard Launcher Shortcut
REM This batch file launches the PowerShell launcher script

REM Get the directory where this script is located
setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Check if PowerShell is available
where powershell >nul 2>nul
if errorlevel 1 (
    echo ERROR: PowerShell not found on your system
    echo Please install PowerShell 5.0 or later
    pause
    exit /b 1
)

REM Launch the PowerShell script
echo.
echo ========================================
echo 🥽 VHR Dashboard Launcher
echo ========================================
echo.
echo Starting the PowerShell launcher...
echo.

REM Launch PowerShell with the script
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-dashboard.ps1"

REM If PowerShell execution failed, try with RemoteSigned policy
if errorlevel 1 (
    echo.
    echo Attempting with RemoteSigned policy...
    powershell -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0launch-dashboard.ps1"
)

pause
