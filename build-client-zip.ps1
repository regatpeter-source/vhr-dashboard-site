# Build script pour pack client (Windows)
# Objectif: générer un zip prêt à distribuer aux abonnés pour usage local
# Prérequis: PowerShell 5+, 7zip ou Compress-Archive (inclus sur Windows 10+)

param(
  [string]$Output = "vhr-dashboard-pro-client.zip",
  [switch]$IncludeNode,
  [string]$NodePath = ""
)

$root = Split-Path -Parent $PSCommandPath
Set-Location $root

# Dossier de staging
$staging = Join-Path $root "dist-client"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

# 1) Copier les sources nécessaires
$include = @(
  "server.js",
  "public",
  "config",
  "services",
  "data",
  "client-pack",
  "package.json",
  "package-lock.json",
  "db.js",
  "names.json",
  "games.json",
  "favorites.json",
  "tts-receiver-app"
)

foreach ($item in $include) {
  Copy-Item $item -Destination $staging -Recurse -Force
}

# 1b) Créer un local.properties placeholder dans tts-receiver-app si absent
$ttsLocalProps = Join-Path $staging "tts-receiver-app\local.properties"
if (-not (Test-Path $ttsLocalProps)) {
  New-Item -ItemType File -Path $ttsLocalProps -Force | Out-Null
}

# 2) Installer dépendances en mode prod (sans devDependencies)
Push-Location $staging
npm ci --omit=dev
Pop-Location

# 3) Optionnel: embarquer Node portable
if ($IncludeNode -and $NodePath) {
  $nodeDest = Join-Path $staging "node-portable"
  New-Item -ItemType Directory -Path $nodeDest | Out-Null
  Copy-Item (Join-Path $NodePath "*") -Destination $nodeDest -Recurse -Force
}

# 4) Nettoyage: retirer caches/temp éventuels
$toRemove = @("node_modules/.cache", "data/logs")
foreach ($r in $toRemove) {
  $p = Join-Path $staging $r
  if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}

# 5) Créer le zip
if (Test-Path $Output) { Remove-Item $Output -Force }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $Output

Write-Host "✅ Pack client généré: $Output"
Write-Host "➡️ Contenu: dist-client/ (avec node_modules prod)"
if ($IncludeNode) { Write-Host "➡️ Node portable inclus depuis: $NodePath" }
