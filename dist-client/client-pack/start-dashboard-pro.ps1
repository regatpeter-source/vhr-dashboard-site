# Démarrage local du Dashboard Pro (HTTP) avec logs silencieux
$env:FORCE_HTTP = "1"
$env:QUIET_MODE = "1"
$env:NODE_ENV = "production"
$env:SUPPRESS_WARNINGS = "1"

# Dossier racine attendu (au-dessus de client-pack)
$root = Join-Path $PSScriptRoot ".."
$server = Join-Path $root "server.js"

if (-not (Test-Path $root)) {
	Write-Host "[ERREUR] Dossier racine introuvable : $root`nExtrayez le ZIP complet puis lancez ce fichier depuis le dossier client-pack." -ForegroundColor Red
	exit 1
}

if (-not (Test-Path $server)) {
	Write-Host "[ERREUR] server.js introuvable dans : $root`nExtraction incomplète. Gardez la structure d'origine et relancez start-dashboard-pro depuis client-pack." -ForegroundColor Red
	exit 1
}

# Utiliser automatiquement le Node portable inclus (../node-portable)
$nodePortable = Join-Path $root "node-portable"
if (Test-Path (Join-Path $nodePortable "node.exe")) {
	$env:PATH = "$nodePortable;$env:PATH"
}

# Assurer la présence du .env local (copie depuis l'exemple si absent)
$envTarget = Join-Path $root ".env"
$envExample = Join-Path $PSScriptRoot ".env.client-example"
if (-not (Test-Path $envTarget) -and (Test-Path $envExample)) {
	Copy-Item $envExample $envTarget -Force | Out-Null
}

# Ouvrir le navigateur après 5s (simplifié, sans jobs)
$targetUrl = "http://localhost:3000/vhr-dashboard-pro.html"
Start-Process powershell -ArgumentList '-NoLogo','-NoProfile','-WindowStyle','Hidden','-Command',"Start-Sleep -Seconds 5; Start-Process '$targetUrl'" | Out-Null

try {
	Set-Location $root
} catch {
	Write-Host "[ERREUR] Impossible d'accéder à : $root`n$($_.Exception.Message)" -ForegroundColor Red
	exit 1
}

node server.js
