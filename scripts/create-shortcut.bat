@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo VHR Dashboard - Desktop Shortcut Creator
echo ========================================
echo.

REM Get Desktop path
set "DESKTOP=%USERPROFILE%\Desktop"
set "SCRIPT_PATH=C:\Users\peter\VR-Manager\scripts\launch-dashboard-smart.bat"
set "SHORTCUT_PATH=%DESKTOP%\VHR Dashboard.lnk"

if not exist "!SCRIPT_PATH!" (
  echo ERROR: Script not found at !SCRIPT_PATH!
  pause
  exit /b 1
)

echo Creating shortcut on Desktop...
echo Source: !SCRIPT_PATH!
echo Target: !SHORTCUT_PATH!
echo.

REM Use PowerShell to create shortcut
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$WshShell = New-Object -ComObject WScript.Shell; " ^
  "$Shortcut = $WshShell.CreateShortcut('!SHORTCUT_PATH!'); " ^
  "$Shortcut.TargetPath = '!SCRIPT_PATH!'; " ^
  "$Shortcut.WorkingDirectory = 'C:\Users\peter\VR-Manager'; " ^
  "$Shortcut.IconLocation = 'C:\Users\peter\VR-Manager\public\icon.ico'; " ^
  "$Shortcut.Save(); " ^
  "Write-Host 'Shortcut created successfully!'"

if exist "!SHORTCUT_PATH!" (
  echo.
  echo SUCCESS! Shortcut created on Desktop
  echo.
  echo You can now:
  echo  1. Double-click "VHR Dashboard" on your Desktop
  echo  2. OR add http://localhost:3000/vhr-dashboard-pro.html to browser favorites
  echo.
  timeout /t 3 /nobreak
) else (
  echo ERROR: Failed to create shortcut
  pause
)
