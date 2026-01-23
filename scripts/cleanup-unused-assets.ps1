Param(
    [switch]$Apply
)

$workspace = 'C:\Users\peter\VR-Manager'
$archiveRoot = Join-Path $workspace 'cleanup-archive'
$patterns = @('*.apk', '*.app', '*.msi', '*.exe', '*.zip', '*.7z', '*.bat', '*.ps1', '*.pkg')
$excludeDirs = @(
    '.git',
    'node_modules',
    'dist-client',
    'dist',
    'backups',
    'backup-stable',
    'tmp-pack',
    'vhr-dashboard-pro-client-full-updated-new3-node-adb\dist',
    'scripts',
    'build',
    'dist-client\platform-tools',
    'dist-client\scrcpy',
    'dist-client\node-portable'
)
$found = @()

Write-Host ("Recherche de fichiers inutiles ({0} patterns) ..." -f $patterns.Count)

foreach ($pattern in $patterns) {
    $files = Get-ChildItem -Path $workspace -Filter $pattern -Recurse -File -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        $relative = $file.FullName.Substring($workspace.Length + 1)
        if ($excludeDirs | ForEach-Object { $relative -like "$_*" }) {
            continue
        }
        $found += [PSCustomObject]@{
            Path = $file.FullName
            RelativePath = $relative
            Length = $file.Length
        }
    }
}

if (-not $found) {
    Write-Host "Aucun fichier correspondant n'a été trouvé."
    return
}

$found | Sort-Object Length -Descending | Format-Table -AutoSize
Write-Host "
Total: $($found.Count) fichiers potentiellement inutiles (plus gros en haut)."

if ($Apply) {
    New-Item -ItemType Directory -Path $archiveRoot -Force | Out-Null
    foreach ($f in $found) {
        $dest = Join-Path $archiveRoot $f.RelativePath
        $destDir = Split-Path $dest
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        Move-Item -Path $f.Path -Destination $dest -Force
    }
    Write-Host "Tous les fichiers ont été déplacés vers $archiveRoot"
} else {
    Write-Host "
>>> Pour déplacer ces fichiers dans '$archiveRoot' (au lieu de les supprimer), relance la commande avec -Apply."
}
