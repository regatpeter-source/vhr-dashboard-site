# Démarrage local du Dashboard Pro (HTTP) avec logs silencieux
$env:FORCE_HTTP = "1"
$env:QUIET_MODE = "1"
$env:NODE_ENV = "production"
$env:SUPPRESS_WARNINGS = "1"

# Info rapide pour l'utilisateur final (drivers / pop-up ADB)
Write-Host "[INFO] Si le casque n'apparait pas dans 'adb devices':" -ForegroundColor Cyan
Write-Host "       1) Sur le casque, accepter 'Autoriser le débogage USB' et cocher 'Toujours autoriser'." -ForegroundColor Cyan
Write-Host "       2) Si la liste reste vide, installer le driver Quest (app Meta Quest PC) ou le Google USB Driver." -ForegroundColor Cyan

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

# Ajouter ADB si les platform-tools sont présents (../platform-tools)
$adbTools = Join-Path $root "platform-tools"
if (Test-Path (Join-Path $adbTools "adb.exe")) {
	$env:PATH = "$adbTools;$env:PATH"
}

# Vérifier que Node est disponible (portable ou installé)
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
	Write-Host "[ERREUR] Node.js introuvable.`nInstallez Node.js (v18+ LTS) ou placez le dossier 'node-portable' à la racine du pack." -ForegroundColor Red
	Read-Host "Appuyez sur Entrée pour fermer"
	exit 1
}

# Initialiser ADB pour déclencher la popup d'autorisation sur le casque
$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
if ($adbCmd) {
	try {
		& adb start-server | Out-Null
		Start-Sleep -Milliseconds 400
		& adb devices | Out-Null
		Write-Host "[INFO] ADB initialisé. Si une popup apparait dans le casque, acceptez et cochez 'Toujours autoriser'." -ForegroundColor Green
	} catch {
		Write-Host "[WARN] ADB détecté mais initialisation incomplète: $($_.Exception.Message)" -ForegroundColor Yellow
	}
} else {
	Write-Host "[WARN] adb introuvable dans le PATH. Placez 'platform-tools' à la racine du pack ou installez Android platform-tools." -ForegroundColor Yellow
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

try {
	node server.js
} catch {
	Write-Host "[ERREUR] Impossible de démarrer le serveur Node.js.`n$($_.Exception.Message)" -ForegroundColor Red
	Read-Host "Appuyez sur Entrée pour fermer"
	exit 1
}
