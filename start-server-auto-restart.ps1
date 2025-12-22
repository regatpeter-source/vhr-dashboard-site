$ErrorActionPreference="Continue"
$dir=Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir
$port=3000;$max=5;$delay=3

# Forcer toujours l'utilisation de HTTP pour le dashboard pro (nécessaire pour détecter les casques)
$env:FORCE_HTTP = '1'
$dashboardUrl = "http://localhost:$port/vhr-dashboard-pro.html"
Write-Host "[Launcher] FORCED HTTP (FORCE_HTTP=1) – ouverture de $dashboardUrl"

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
