# Build script pour pack client (Windows)
# Objectif: générer un zip prêt à distribuer aux abonnés pour usage local
# Prérequis: PowerShell 5+, 7zip ou Compress-Archive (inclus sur Windows 10+)

param(
  [string]$Output = "vhr-dashboard-pro-client-full-updated-new3.zip",
  [string]$SourceDir = ""
)

$root = Split-Path -Parent $PSCommandPath
Set-Location $root

# Dossier source de référence (fixe) pour éviter toute confusion
if (-not $SourceDir) {
  $SourceDir = Join-Path $root "vhr-dashboard-pro-client-full-updated-new3-node-adb"
}

if (-not (Test-Path $SourceDir)) {
  Write-Error "[pack] Source introuvable: $SourceDir"
  exit 1
}

# Dossier de staging
$staging = Join-Path $root "dist-client"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

# 1) Copier l'intégralité du dossier source de référence
Copy-Item (Join-Path $SourceDir "*") -Destination $staging -Recurse -Force

# Nettoyage post-copie: retirer les dossiers parasites éventuels
$postCopyRemove = @(".git", ".github", ".vscode", "node_modules", "dist-client", "tmp", "temp", "logs", ".cache")
foreach ($r in $postCopyRemove) {
  $p = Join-Path $staging $r
  if (Test-Path $p) { Remove-Item $p -Recurse -Force }
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

# 4) Nettoyage: retirer caches/temp éventuels
$toRemove = @("node_modules/.cache", "data/logs")
foreach ($r in $toRemove) {
  $p = Join-Path $staging $r
  if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}

# 5) Créer le zip (ordre prioritaire: server.js, node-portable, client-pack)
if (Test-Path $Output) { Remove-Item $Output -Force }

# Ordre souhaité à la racine de l'archive
$priorityOrder = @('server.js', 'node-portable', 'platform-tools', 'client-pack')

# Récupérer les éléments présents dans le staging
$stagedItems = Get-ChildItem -LiteralPath $staging -Force

# Construire la liste dans l'ordre voulu, puis ajouter le reste trié
$orderedPaths = @()
foreach ($name in $priorityOrder) {
  $match = $stagedItems | Where-Object { $_.Name -ieq $name }
  if ($match) {
    $orderedPaths += $match.FullName
  }
}

$remaining = $stagedItems | Where-Object { $priorityOrder -notcontains $_.Name } | Sort-Object Name
if ($remaining) {
  $orderedPaths += $remaining.FullName
}

# Création manuelle de l'archive pour respecter l'ordre (Compress-Archive trie automatiquement)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Add-ToZip([System.IO.Compression.ZipArchive]$zip, [string]$sourcePath, [string]$entryRoot) {
  if (Test-Path $sourcePath -PathType Container) {
    # Forcer la présence du dossier racine
    if (-not ($zip.Entries.FullName -contains "$entryRoot/")) {
      $zip.CreateEntry("$entryRoot/") | Out-Null
    }

    $baseLen = ($sourcePath.TrimEnd([IO.Path]::DirectorySeparatorChar)).Length + 1
    Get-ChildItem -LiteralPath $sourcePath -Recurse -Force |
      Where-Object { -not $_.PSIsContainer } |
      Sort-Object FullName |
      ForEach-Object {
        $relative = $_.FullName.Substring($baseLen).Replace('\', '/')
        $entryName = "$entryRoot/$relative"
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
          $zip,
          $_.FullName,
          $entryName,
          [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
      }
  } else {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $sourcePath,
      $entryRoot,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
}

$fileStream = [System.IO.File]::Open($Output, [System.IO.FileMode]::Create)
$zipArchive = New-Object System.IO.Compression.ZipArchive($fileStream, [System.IO.Compression.ZipArchiveMode]::Create)

try {
  foreach ($itemPath in $orderedPaths) {
    $entryRoot = Split-Path $itemPath -Leaf
    Add-ToZip -zip $zipArchive -sourcePath $itemPath -entryRoot $entryRoot
  }
}
finally {
  $zipArchive.Dispose()
  $fileStream.Dispose()
}

Write-Host "✅ Pack client généré: $Output"
Write-Host "➡️ Contenu: dist-client/ (avec node_modules prod)"
