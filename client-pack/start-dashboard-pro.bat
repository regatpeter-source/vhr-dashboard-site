@echo off
setlocal EnableExtensions
rem Stub: délègue au script PowerShell pour éviter les soucis d'encodage
powershell -ExecutionPolicy Bypass -File "%~dp0start-dashboard-pro.ps1"
exit /b %ERRORLEVEL%
