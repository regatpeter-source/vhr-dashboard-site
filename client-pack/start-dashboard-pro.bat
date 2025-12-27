@echo off
REM Démarrage local du Dashboard Pro (HTTP) avec logs silencieux
set FORCE_HTTP=1
set QUIET_MODE=1
set NODE_ENV=production
set SUPPRESS_WARNINGS=1

REM Utiliser automatiquement le Node portable inclus (../node-portable)
set "NODE_PORTABLE=%~dp0..\node-portable"
if exist "%NODE_PORTABLE%\node.exe" (
	set "PATH=%NODE_PORTABLE%;%PATH%"
)

REM Assurer la présence du .env local (copie depuis l'exemple si absent)
if not exist "%~dp0..\.env" (
	if exist "%~dp0.env.client-example" copy "%~dp0.env.client-example" "%~dp0..\.env" >nul
)

REM Lancer l'ouverture du navigateur après 2s (en parallèle, via PowerShell pour fiabilité)
start "" powershell -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000/vhr-dashboard-pro.html'"

REM Lancer le serveur (console courante)
cd /d "%~dp0.."
node server.js
