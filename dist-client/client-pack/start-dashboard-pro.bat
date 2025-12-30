@echo off
REM Wrapper minimal: délègue à PowerShell (plus fiable que CMD sur certains systèmes)
setlocal
set "PS_SCRIPT=%~dp0start-dashboard-pro.ps1"

if not exist "%PS_SCRIPT%" (
	echo [ERREUR] Fichier start-dashboard-pro.ps1 introuvable dans %~dp0
	pause
	exit /b 1
)

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

endlocal
exit /b %ERRORLEVEL%
