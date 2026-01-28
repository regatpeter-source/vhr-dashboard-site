param()

function Remove-IfExists {
    param(
        [string]$Path
    )

    if (Test-Path $Path) {
        Write-Host "Supprimer : $Path" -ForegroundColor Yellow
        Remove-Item $Path -Recurse -Force
        Write-Host "✅ Supprimé : $Path" -ForegroundColor Green
    } else {
        Write-Host "🚫 Introuvable : $Path" -ForegroundColor DarkGray
    }
}

Write-Host '--- Nettoyage du cache Electron (VHR Dashboard) ---' -ForegroundColor Cyan
Remove-IfExists "$env:APPDATA\VHR Dashboard"
Remove-IfExists "$env:LOCALAPPDATA\VHR Dashboard"
Write-Host '--- Terminé ---' -ForegroundColor Cyan