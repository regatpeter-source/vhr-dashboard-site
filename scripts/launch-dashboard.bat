@echo off
REM VHR Dashboard Launcher - Standalone Batch Wrapper
REM This batch file downloads and executes the PowerShell launcher script
REM No external dependencies, works offline

setlocal enabledelayedexpansion
cd /d "%TEMP%"

echo.
echo ========================================
echo VHR Dashboard Launcher
echo ========================================
echo.

REM Create a temporary directory for our scripts
set TMPDIR=%TEMP%\vhr-launcher-%RANDOM%
mkdir "%TMPDIR%" 2>nul
cd /d "%TMPDIR%"

echo Downloading launcher script...
echo.

REM Download the PowerShell launcher script using PowerShell directly
REM This is more reliable than using certutil or other methods
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Continue'; ^
   try { ^
     $url='https://vhr-dashboard-site.onrender.com/scripts/launch-dashboard.ps1'; ^
     $output='launcher.ps1'; ^
     $ProgressPreference='SilentlyContinue'; ^
     (New-Object System.Net.WebClient).DownloadFile($url, $output); ^
     if(Test-Path $output) { ^
       Write-Host 'Script downloaded. Starting launcher...'; ^
       Write-Host ''; ^
       & $output; ^
     } else { ^
       Write-Host 'ERROR: Failed to download script'; ^
       exit 1; ^
     } ^
   } catch { ^
     Write-Host 'ERROR: ' $_.Exception.Message; ^
     exit 1; ^
   } ^
  "

pause
