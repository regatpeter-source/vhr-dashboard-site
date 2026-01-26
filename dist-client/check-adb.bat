@echo off
setlocal ENABLEDELAYEDEXPANSION
if "%~1"=="" (
  start "VHR ADB Check" /d "%~dp0" cmd /k call "%~f0" run
  exit /b 0
)

set "APP_ROOT=%~dp0"
set "PLATFORM_TOOLS_DIR="
for %%D in (
  "%APP_ROOT%platform-tools"
  "%APP_ROOT%local\platform-tools"
  "%APP_ROOT%resources\app.asar.unpacked\platform-tools"
  "%APP_ROOT%resources\app.asar.unpacked\local\platform-tools"
) do (
  if exist "%%~D\adb.exe" (
    set "PLATFORM_TOOLS_DIR=%%~D"
    goto :PLAT_FOUND
  )
)
echo [ADB CHECK] Impossible de localiser platform-tools\adb.exe
echo [ADB CHECK] Vérifiez que l’installateur a bien extrait les outils (local/platform-tools) et que rien n’a été bloqué.
pause
goto :EOF
:PLAT_FOUND
set "PLATFORM_TOOLS=%PLATFORM_TOOLS_DIR%"
cd /d "%APP_ROOT%"
echo [ADB CHECK] Ajout de %PLATFORM_TOOLS% au PATH temporaire...
set PATH=%PLATFORM_TOOLS%;%PATH%
echo [ADB CHECK] Arrêt du serveur ADB existant...
adb kill-server 1>nul 2>nul
echo [ADB CHECK] Démarrage du serveur ADB...
adb start-server 1>nul 2>nul
if errorlevel 1 (
  echo [ADB CHECK] Impossible de démarrer adb.exe (permission? ou adb déjà en cours?).
  echo [ADB CHECK] Vérifiez que Windows n’interdit pas l’exécution d’ADB ou que vous êtes en mode administrateur.
  pause
  goto :EOF
)
echo [ADB CHECK] Liste des appareils connectés :
adb devices -l
echo.
echo [ADB CHECK] Si le casque apparaît en 'unauthorized', confirmez l’autorisation depuis le casque.
echo [ADB CHECK] La fenêtre restera ouverte pour que vous puissiez lire les résultats.
pause