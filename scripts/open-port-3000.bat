@echo off
:: VHR Voice - ouvrir le port 3000 en inbound TCP (Windows Firewall)
:: Nécessite une confirmation UAC (élévation automatique)
:: À exécuter une seule fois sur le PC qui héberge le Dashboard Pro

:: Relance ce script en mode administrateur si nécessaire
whoami /groups | find "S-1-16-12288" >nul 2>&1
if errorlevel 1 (
  echo [VHR] Elevation requise, demande d'autorisation UAC...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo [VHR] Ouverture du port TCP 3000 (Dashboard Pro voix)...
netsh advfirewall firewall add rule name="VHR-Node-3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
if errorlevel 1 (
  echo [VHR] La règle existe peut-être déjà ou l'ajout a échoué.
  netsh advfirewall firewall show rule name="VHR-Node-3000"
  goto :end
)

echo [VHR] Règle ajoutée avec succès.
netsh advfirewall firewall show rule name="VHR-Node-3000"

:end
echo.
pause
