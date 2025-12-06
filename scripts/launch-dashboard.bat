@echo off
REM VHR Dashboard Launcher Shortcut
REM This batch file launches the PowerShell launcher script
REM Execution policy is bypassed for this session only (no admin rights needed)

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

echo.
echo ========================================
echo VHR Dashboard Launcher
echo ========================================
echo.
echo Starting the PowerShell launcher...
echo.

REM Launch PowerShell with execution policy bypassed for this session
REM Using -Command with & operator (call operator) and iex (Invoke-Expression)
REM This is the most compatible way to bypass execution policy without admin rights
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { . '%~dp0launch-dashboard.ps1' }"

pause
