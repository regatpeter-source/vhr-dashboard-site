# ============================================
# Crée un raccourci VHR Dashboard sur le bureau
# ============================================

$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "VHR Dashboard Pro.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"C:\Users\peter\VR-Manager\VHR-Dashboard-Invisible.vbs`""
$Shortcut.WorkingDirectory = "C:\Users\peter\VR-Manager"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,13"
$Shortcut.Description = "Lance VHR Dashboard Pro (serveur en arrière-plan)"
$Shortcut.Save()

Write-Host "✅ Raccourci créé sur le bureau: VHR Dashboard Pro.lnk" -ForegroundColor Green
Write-Host ""
Write-Host "Ce raccourci lance le serveur en arrière-plan (invisible)" -ForegroundColor Cyan
Write-Host "et ouvre directement le dashboard dans le navigateur." -ForegroundColor Cyan
