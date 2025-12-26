$ErrorActionPreference = 'Continue'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir
$port = 3000
$maxRetries = 5
$retryDelay = 3

$env:FORCE_HTTP = '1'
$dashboardUrl = 'http://localhost:' + $port + '/vhr-dashboard-pro.html'
Write-Host '[Launcher] FORCE_HTTP forcé sur 1 – ouverture de ' + $dashboardUrl

function Test-PortOpen {
	param([int]$Port)
	try {
		return (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop).Count -gt 0
	} catch {
		return $false
	}
}

function Open-Dashboard {
	param([string]$Url, [int]$DelaySeconds = 3)
	Start-Job -ArgumentList $Url, $DelaySeconds -ScriptBlock {
		param($UrlToOpen, $DelaySeconds)
		Start-Sleep -Seconds $DelaySeconds
		Start-Process $UrlToOpen
	} | Out-Null
}

if (Test-PortOpen -Port $port) {
	Write-Host 'Serveur déjà actif sur le port ' + $port + '. Ouverture directe du dashboard...'
	Start-Process $dashboardUrl
	exit 0
}

Write-Host 'Lancement auto-restart du serveur (Ctrl+C pour arrêter).'
for ($i = 0; $i -lt $maxRetries; $i++) {
	if ($i -gt 0) {
		Write-Host 'Relance n°' + $i + ' dans ' + $retryDelay + ' secondes...'
		Start-Sleep -Seconds $retryDelay
	} else {
		Open-Dashboard -Url $dashboardUrl -DelaySeconds 3
	}

	$startTime = Get-Date
	try {
		& node server.js
		$exitCode = $LASTEXITCODE
	} catch {
		$exitCode = 1
	}

	$duration = [math]::Round((Get-Date - $startTime).TotalSeconds, 1)
	Write-Host 'Serveur arrêté (code $exitCode, durée ${duration}s)'

	if ($duration -gt 60) {
		Write-Host 'Serveur a tourné plus de 60s. Réinitialisation du compteur de relances.'
		$i = -1
	}
}

Write-Host 'Limite de relances atteinte. Appuie sur Entrée pour fermer.'
Read-Host 'Entrer pour fermer'
