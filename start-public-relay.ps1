# Démarrage du serveur VHR Dashboard en HTTPS (port 443) pour le relais public
# Prérequis : cert.pem et key.pem présents à la racine, port 443 ouvert en entrée

$ErrorActionPreference = "Stop"

# Emplacement du projet
$projectRoot = "C:\Users\peter\VR-Manager"
Set-Location $projectRoot

# Vérification des certificats
$certPath = Join-Path $projectRoot "cert.pem"
$keyPath  = Join-Path $projectRoot "key.pem"
if (-not (Test-Path $certPath)) { throw "Certificat introuvable : $certPath" }
if (-not (Test-Path $keyPath))  { throw "Clé privée introuvable : $keyPath" }

# Variables d'environnement pour HTTPS + relais public
$env:PORT = "443"
$env:HTTPS_ENABLED = "1"
$env:HTTPS_CERT_FILE = $certPath
$env:HTTPS_KEY_FILE  = $keyPath
$env:NO_ADB = "1"
$env:RELAY_SESSION_ID = "default"
# Mode verbeux (mettre 1 pour réduire les logs)
$env:QUIET_MODE = "0"

Write-Host "[start] Lancement du serveur en HTTPS sur https://www.vhr-dashboard-site.com (port 443)" -ForegroundColor Cyan
Write-Host "[start] Namespace Socket.IO /relay exposé publiquement" -ForegroundColor Cyan

# Démarrer le serveur
node server.js
