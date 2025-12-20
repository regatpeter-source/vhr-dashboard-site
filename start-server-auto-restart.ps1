$ErrorActionPreference="Continue"
$dir=Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $dir
$port=3000;$max=5;$delay=3
function t{try{(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction Stop).Count -gt 0}catch{$false}}
function o{Start-Sleep 2;Start-Process "http://localhost:3000/vhr-dashboard-pro.html"}
if(t){Write-Host "Serveur deja actif sur $port";o;exit 0}
Write-Host "Lancement auto-restart";Write-Host "Ctrl+C pour arreter"
for($i=0;$i -lt $max;$i++){
 if($i){Write-Host "Relance #$i dans $delay s";Start-Sleep $delay}else{Start-Job -ScriptBlock {Start-Sleep 3;Start-Process "http://localhost:3000/vhr-dashboard-pro.html"}|Out-Null}
 $start=Get-Date;try{& node server.js;$c=$LASTEXITCODE}catch{$c=1}
 $d=[math]::Round((Get-Date-$start).TotalSeconds,1)
 Write-Host "Serveur arrete (code $c, ${d}s)"
 if($d -gt 60){$i=0}
}
Write-Host "Limite relances atteinte";Read-Host "Entrer pour fermer"
