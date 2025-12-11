@echo off
REM ============================================================================
REM VHR Dashboard TTS Receiver - One-Click Installer for Windows
REM ============================================================================
REM
REM Ce fichier lance automatiquement le script PowerShell d'installation
REM AUCUNE dépendance requise - tout est installé automatiquement!
REM
REM Usage: Double-cliquez sur ce fichier ou lancez depuis PowerShell
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   VHR Dashboard TTS Receiver - One-Click Installer       ║
echo ║   Compilation et Installation Automatiques              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Obtenir le répertoire du script
set SCRIPT_DIR=%~dp0

REM Vérifier que le script PowerShell existe
if not exist "%SCRIPT_DIR%VHR-TTS-Complete-Installer.ps1" (
    echo ❌ Erreur: VHR-TTS-Complete-Installer.ps1 non trouvé
    echo   Attendu à: %SCRIPT_DIR%VHR-TTS-Complete-Installer.ps1
    pause
    exit /b 1
)

REM Vérifier la version de PowerShell
powershell -Version 5.0 -NoProfile -Command "exit 0" >nul 2>&1
if errorlevel 1 (
    echo ❌ Erreur: PowerShell 5.0+ requis
    echo   Téléchargez Windows Management Framework 5.0 depuis Microsoft
    pause
    exit /b 1
)

REM Afficher les options disponibles
echo Options d'installation:
echo   [1] Installation Complète (Recommandé)
echo   [2] Compiler uniquement
echo   [3] Installer uniquement
echo.

REM Obtenir le choix de l'utilisateur
set /p CHOICE="Choisissez une option (1/2/3) [1]: "
if "%CHOICE%"=="" set CHOICE=1

echo.
echo ⏳ Démarrage de l'installation...
echo.

REM Lancer le script PowerShell avec les paramètres appropriés
if "%CHOICE%"=="1" (
    REM Installation complète
    powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_DIR%VHR-TTS-Complete-Installer.ps1'"
) else if "%CHOICE%"=="2" (
    REM Compiler uniquement
    powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_DIR%VHR-TTS-Complete-Installer.ps1' -SkipInstall"
) else if "%CHOICE%"=="3" (
    REM Installer uniquement (supposer que l'APK est déjà compilé)
    powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_DIR%VHR-TTS-Complete-Installer.ps1' -SkipCompile -SkipJava -SkipGradle"
) else (
    echo ❌ Option invalide
    pause
    exit /b 1
)

REM Vérifier le code de sortie
if %ERRORLEVEL% equ 0 (
    echo.
    echo ✅ Installation terminée avec succès!
    echo.
) else (
    echo.
    echo ❌ Installation échouée (Code: %ERRORLEVEL%)
    echo.
)

pause
