@echo off
title VHR Dashboard - Démarrage...
cd /d "%~dp0"

echo ========================================
echo   VHR DASHBOARD - Gestionnaire VR
echo ========================================
echo.
echo Demarrage du serveur...
echo.

REM Vérifier si Node.js est installé
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe!
    echo Telechargez Node.js sur https://nodejs.org
    pause
    exit /b 1
)

REM Vérifier si les dépendances sont installées
if not exist "node_modules\" (
    echo Installation des dependances...
    call npm install
)

REM Démarrer le serveur en arrière-plan
echo Lancement du serveur VHR Dashboard...
start /B node server.js

REM Attendre que le serveur démarre
timeout /t 3 /nobreak >nul

REM Ouvrir le navigateur
echo Ouverture du dashboard PRO...
start http://localhost:3000/vhr-dashboard-pro.html

echo.
echo ========================================
echo Dashboard ouvert dans votre navigateur!
echo.
echo Pour arreter le serveur:
echo   - Fermez cette fenetre
echo   - Ou appuyez sur CTRL+C
echo ========================================
echo.

REM Garder la fenêtre ouverte pour voir les logs
node server.js
