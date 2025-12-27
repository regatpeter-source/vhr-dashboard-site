@echo off
REM Démarrage local du Dashboard Pro (HTTP) avec logs silencieux
set FORCE_HTTP=1
set QUIET_MODE=1
set NODE_ENV=production

REM Utiliser automatiquement le Node portable inclus (../node-portable)
set "NODE_PORTABLE=%~dp0..\node-portable"
if exist "%NODE_PORTABLE%\node.exe" (
	set "PATH=%NODE_PORTABLE%;%PATH%"
)

REM Assurer la présence du .env local (copie depuis l'exemple si absent)
if not exist "%~dp0..\.env" (
	if exist "%~dp0.env.client-example" copy "%~dp0.env.client-example" "%~dp0..\.env" >nul
)

REM Lancer l'ouverture du navigateur après 2s (en parallèle)
start "" cmd /c "timeout /T 2 /NOBREAK >nul & start \"\" http://localhost:3000/vhr-dashboard-pro.html"

REM Lancer le serveur (console courante)
cd /d "%~dp0.."
node server.js
