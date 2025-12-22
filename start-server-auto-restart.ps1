$ErrorActionPreference="Continue"
$dir=Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir
$port=3000;$max=5;$delay=3

# Always clear FORCE_HTTP in this launcher so the server can démarrer en HTTPS
$originalForceHttp = $env:FORCE_HTTP
if ($originalForceHttp -eq '1') {
	Write-Host "[Launcher] FORCE_HTTP=1 détecté dans l'environnement - suppression pour forcer le mode HTTPS" -ForegroundColor Yellow
	$env:FORCE_HTTP = $null
}

# Detect whether local certificates are present
$hasCert = (Test-Path (Join-Path $dir 'cert.pem')) -and (Test-Path (Join-Path $dir 'key.pem'))
if ($hasCert) {
	$protocol = 'https'
	$dashboardUrl = "https://localhost:$port/vhr-dashboard-pro.html"
} else {
	$protocol = 'http'
	$dashboardUrl = "http://localhost:$port/vhr-dashboard-pro.html"
	Write-Host "[Launcher] ⚠️ Certificats introuvables (cert.pem + key.pem). Ouverture en HTTP." -ForegroundColor Yellow
}

Write-Host "[Launcher] Protocol sélectionné : $protocol (FORCE_HTTP initial=${originalForceHttp})"

function t{try{(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction Stop).Count -gt 0}catch{$false}}
function o{param($waitSeconds=2) Start-Sleep $waitSeconds;Start-Process $script:dashboardUrl}
if(t){Write-Host "Serveur deja actif sur $port";o;exit 0}
Write-Host "Lancement auto-restart";Write-Host "Ctrl+C pour arreter"
for($i=0;$i -lt $max;$i++){
 if($i){Write-Host "Relance #$i dans $delay s";Start-Sleep $delay}else{Start-Job -ArgumentList $dashboardUrl -ScriptBlock {param($url) Start-Sleep 3;Start-Process $url}|Out-Null}
 $start=Get-Date;try{& node server.js;$c=$LASTEXITCODE}catch{$c=1}
 $d=[math]::Round((Get-Date-$start).TotalSeconds,1)
 Write-Host "Serveur arrete (code $c, ${d}s)"
 if($d -gt 60){$i=0}
}
Write-Host "Limite relances atteinte";Read-Host "Entrer pour fermer"
