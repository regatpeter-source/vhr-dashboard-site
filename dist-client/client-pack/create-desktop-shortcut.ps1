# ============================================
# Crée ou recrée le raccourci VHR Dashboard Pro
# ============================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$TargetBat = Join-Path $ScriptDir "start-dashboard-pro.bat"
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutName = "VHR Dashboard Pro.lnk"
$ShortcutPath = Join-Path $Desktop $ShortcutName

if (-not (Test-Path $TargetBat)) {
    Write-Host "⚠️ Impossible de créer le raccourci : `start-dashboard-pro.bat` est introuvable dans $ScriptDir." -ForegroundColor Yellow
    Write-Host "Assure-toi d'être dans le dossier extrait du pack avant de relancer ce script." -ForegroundColor Yellow
    exit 1
}

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetBat
$Shortcut.WorkingDirectory = $ScriptDir
$Shortcut.IconLocation = "shell32.dll,69"
$Shortcut.Description = "Lance VHR Dashboard Pro en local"
$Shortcut.Save()

Write-Host "✅ Le raccourci '$ShortcutName' a été créé sur le bureau." -ForegroundColor Green
Write-Host "Tu peux épingler ce raccourci à la barre des tâches ou le copier dans un autre dossier." -ForegroundColor Cyan
