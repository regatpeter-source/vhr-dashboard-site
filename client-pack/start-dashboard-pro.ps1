# Démarrage local du Dashboard Pro (HTTP) avec logs silencieux
$env:FORCE_HTTP = "1"
$env:QUIET_MODE = "1"
$env:NODE_ENV = "production"
$env:SUPPRESS_WARNINGS = "1"

# Utiliser automatiquement le Node portable inclus (../node-portable)
$nodePortable = Join-Path $PSScriptRoot "..\node-portable"
if (Test-Path (Join-Path $nodePortable "node.exe")) {
	$env:PATH = "$nodePortable;$env:PATH"
}

# Assurer la présence du .env local (copie depuis l'exemple si absent)
$envTarget = Join-Path $PSScriptRoot "..\.env"
$envExample = Join-Path $PSScriptRoot ".env.client-example"
if (-not (Test-Path $envTarget) -and (Test-Path $envExample)) {
	Copy-Item $envExample $envTarget -Force | Out-Null
}

# Ouvrir le navigateur après 2s (job en arrière-plan)
Start-Job -ScriptBlock {
	Start-Sleep -Seconds 2
	Start-Process "http://localhost:3000/vhr-dashboard-pro.html"
} | Out-Null

Set-Location (Join-Path $PSScriptRoot "..")
node server.js
