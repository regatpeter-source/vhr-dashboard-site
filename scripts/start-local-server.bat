@echo off
REM Wrapper batch file to launch PowerShell script for VHR Dashboard
REM This allows execution from web downloads

setlocal enabledelayedexpansion

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Run the PowerShell script
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%launch-dashboard.ps1"

pause
