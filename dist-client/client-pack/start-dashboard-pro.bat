@echo off
REM Démarrage local du Dashboard Pro (HTTP) avec logs silencieux
set FORCE_HTTP=1
set QUIET_MODE=1
set NODE_ENV=production
set SUPPRESS_WARNINGS=1

REM Déterminer le dossier racine (normalement un niveau au-dessus de client-pack)
set "ROOT_DIR=%~dp0.."
set "SERVER_JS=%ROOT_DIR%\server.js"

REM Fallback si l'utilisateur a tout aplati et lance d'ailleurs
if not exist "%SERVER_JS%" (
    set "ROOT_DIR=%~dp0."
    set "SERVER_JS=%ROOT_DIR%\server.js"
)

if not exist "%SERVER_JS%" (
	echo [ERREUR] Fichier server.js introuvable.
	echo Extraction ou structure incorrecte.
	echo Attendu : server.js et node-portable au MEME niveau que client-pack.
	echo Exemple :
	echo   racine\server.js
	echo   racine\node-portable\node.exe
	echo   racine\client-pack\start-dashboard-pro.bat
	echo Si vous voyez ce message, re-extrayez le ZIP en conservant l'arborescence.
	echo Le serveur ne peut pas demarrer tant que la structure n'est pas correcte.
	pause
	exit /b 1
)

if "%ROOT_DIR%"=="%~dp0." (
    echo [INFO] Structure aplatie detectee : server.js trouve dans le dossier courant.
    echo Il est recommande d'extraire le ZIP en gardant client-pack, server.js et node-portable au meme niveau.
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

REM Lancer l'ouverture du navigateur après 5s (simplifié)
set "TARGET_URL=http://localhost:3000/vhr-dashboard-pro.html"
start "" powershell -NoLogo -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 5; Start-Process '%TARGET_URL%'" 1>nul 2>nul

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
