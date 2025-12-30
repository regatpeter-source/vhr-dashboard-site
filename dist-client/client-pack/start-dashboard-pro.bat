@echo off
REM Démarrage local du Dashboard Pro (HTTP) avec logs silencieux
set FORCE_HTTP=1
set QUIET_MODE=1
set NODE_ENV=production
set SUPPRESS_WARNINGS=1

REM Déterminer le dossier racine (un niveau au-dessus de client-pack)
set "ROOT_DIR=%~dp0.."
set "SERVER_JS=%ROOT_DIR%\server.js"

if not exist "%ROOT_DIR%" (
	echo [ERREUR] Dossier racine introuvable : "%ROOT_DIR%"
	echo Assurez-vous d'avoir **extrait tout le ZIP** et lancez ce fichier depuis le dossier client-pack.
	pause
	exit /b 1
)

if not exist "%SERVER_JS%" (
	echo [ERREUR] Fichier server.js introuvable dans "%ROOT_DIR%"
	echo L'extraction semble incomplète. Gardez la structure originale puis relancez start-dashboard-pro depuis client-pack.
	pause
	exit /b 1
)

REM Utiliser automatiquement le Node portable inclus (../node-portable)
set "NODE_PORTABLE=%ROOT_DIR%\node-portable"
if exist "%NODE_PORTABLE%\node.exe" (
	set "PATH=%NODE_PORTABLE%;%PATH%"
)

REM Assurer la présence du .env local (copie depuis l'exemple si absent)
if not exist "%ROOT_DIR%\.env" (
	if exist "%~dp0.env.client-example" copy "%~dp0.env.client-example" "%ROOT_DIR%\.env" >nul
)

REM Lancer l'ouverture du navigateur après 2s (double fallback PS + start) — correction de guillemets
set "TARGET_URL=http://localhost:3000/vhr-dashboard-pro.html"
start "" powershell -NoLogo -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process \"%TARGET_URL%\"" 1>nul 2>nul
start "" cmd /c "timeout /t 3 >nul & start "" \"%TARGET_URL%\""" 1>nul 2>nul

REM Lancer le serveur (console courante) avec affichage des erreurs
pushd "%ROOT_DIR%" >nul 2>nul
if errorlevel 1 (
	echo [ERREUR] Impossible d'accéder à "%ROOT_DIR%" (vérifiez le chemin et les droits).
	pause
	exit /b 1
)

echo [INFO] Démarrage du serveur avec node portable (si présent)...
if exist "%NODE_PORTABLE%\node.exe" (
	"%NODE_PORTABLE%\node.exe" server.js
) else (
	node server.js
)

set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
	echo [ERREUR] Le serveur s'est arrêté avec le code %EXITCODE%.
	echo Vérifiez les messages ci-dessus (port occupé, dépendances manquantes, .env...).
	pause
)
popd
exit /b %EXITCODE%
