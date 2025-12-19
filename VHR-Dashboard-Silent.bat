@echo off
REM ============================================
REM VHR Dashboard - Silent Launcher
REM Lance le serveur en arrière-plan sans fenêtre visible
REM ============================================

set "PROJECT_DIR=C:\Users\peter\VR-Manager"

REM Vérifier si le serveur tourne déjà
netstat -ano | find ":3000" >nul 2>&1
if %errorlevel% equ 0 (
    REM Serveur déjà en cours, ouvrir directement le dashboard
    start http://localhost:3000/vhr-dashboard-pro.html
    exit /b 0
)

REM Lancer le serveur en mode caché via PowerShell
powershell -WindowStyle Hidden -Command "Start-Process powershell -ArgumentList '-WindowStyle Hidden -ExecutionPolicy Bypass -Command \"cd ''%PROJECT_DIR%''; node server.js\"' -WindowStyle Hidden"

REM Attendre que le serveur démarre
timeout /t 2 /nobreak >nul

REM Ouvrir le dashboard
start http://localhost:3000/vhr-dashboard-pro.html

exit /b 0
