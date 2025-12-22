$ErrorActionPreference="Continue"
$dir=Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir
$port=3000;$max=5;$delay=3

# Detect the correct protocol to open the dashboard with (HTTPS when certs exist and FORCE_HTTP≠1)
$hasCert = (Test-Path (Join-Path $dir 'cert.pem')) -and (Test-Path (Join-Path $dir 'key.pem'))
$forceHttp = $env:FORCE_HTTP -eq '1'
if ($hasCert -and -not $forceHttp) { $protocol = 'https' } else { $protocol = 'http' }
$dashboardUrl = "$protocol://localhost:$port/vhr-dashboard-pro.html"

Write-Host "[Launcher] Protocol sélectionné : $protocol (FORCE_HTTP=${forceHttp})"

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
