<#
.SYNOPSIS
    Configure l'auto-demarrage du VHR Dashboard (serveur Node + ouverture du dashboard Pro).
.DESCRIPTION
    - Cree/Met a jour une regle pare-feu TCP 3000 (profil Prive)
    - Enregistre une tache planifiee "VHR Dashboard AutoLaunch" au logon utilisateur
    - Execute immediatement l'auto-launcher pour validation
.NOTES
    Necessite PowerShell 5+ et les droits admin pour la regle pare-feu / tache planifiee.
#>

param(
    [switch]$SkipFirewall,
    [switch]$SkipTask,
    [switch]$NoImmediateLaunch
)

$ErrorActionPreference = 'Stop'
$projectDir = Split-Path $PSScriptRoot -Parent
$autoLauncher = Join-Path $projectDir 'scripts\auto-launch-dashboard.ps1'
if (-not (Test-Path $autoLauncher)) {
    throw "Auto-launcher introuvable: $autoLauncher"
}

function Ensure-FirewallRule {
    $ruleName = 'VHR Dashboard - Port 3000'
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Regle pare-feu deja presente: $ruleName"
        return
    }
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private |
        Out-Null
    Write-Host "[OK] Regle pare-feu creee (profil Prive, port 3000)."
}

function Ensure-ScheduledTask {
    $taskName = 'VHR Dashboard AutoLaunch'
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

    if ($existing) {
        Write-Host "Suppression de l'ancienne tache ($taskName) pour recreer une version propre."
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }

    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$autoLauncher`" -Silent"
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopOnIdleEnd -StartWhenAvailable
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Auto-start VHR Dashboard (server + browser)' | Out-Null
    Write-Host "[OK] Tache planifiee creee: $taskName"
}

if (-not $SkipFirewall) {
    try {
        Ensure-FirewallRule
    } catch {
        Write-Warning "Impossible de creer la regle pare-feu: $($_.Exception.Message)"
    }
}

if (-not $SkipTask) {
    Ensure-ScheduledTask
}

if (-not $NoImmediateLaunch) {
    Write-Host "Test immediat de l'auto-launcher..."
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $autoLauncher
}

Write-Host "Configuration terminee."