param(
    [switch]$Silent
)

$ErrorActionPreference = 'Stop'
$ProjectDir = Split-Path $PSScriptRoot -Parent
$script:ProjectDir = $ProjectDir
$script:LogPath = Join-Path $ProjectDir 'launcher-log.txt'

function Write-Log {
    param([string]$Message)
    $line = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' - ' + $Message
    try {
        Add-Content -LiteralPath $script:LogPath -Value $line -Encoding UTF8
    } catch {
        if (-not $Silent) { Write-Warning "Log unavailable: $($_.Exception.Message)" }
    }
    if (-not $Silent) { Write-Host $line }
}


function Test-ServerReady {
    param([string]$Url)
    try {
        $uri = [Uri]::new($Url)
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect($uri.Host, $uri.Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne(2000)) {
            $client.Close()
            return $false
        }
        $client.EndConnect($async)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Wait-Server {
    param(
        [string]$Url,
        [int]$Retries = 30,
        [int]$DelayMs = 1000
    )
    for ($i = 0; $i -lt $Retries; $i++) {
        if (Test-ServerReady -Url $Url) { return $true }
        Start-Sleep -Milliseconds $DelayMs
    }
    return $false
}

function Get-NodeExecutable {
    param([string]$ProjectDir)
    $candidates = @(
        (Join-Path -Path $ProjectDir -ChildPath 'node.exe'),
        'C:\Program Files\nodejs\node.exe',
        'C:\Program Files (x86)\nodejs\node.exe'
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) { return $candidate }
    }
    $nodeInPath = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeInPath) { return $nodeInPath.Source }
    return $null
}

function Ensure-Server {
    param([string]$ProjectDir)
    $nodeExe = Get-NodeExecutable -ProjectDir $ProjectDir
    if (-not $nodeExe) {
        Write-Log 'Node.js introuvable - installer Node ou deposer node.exe dans le projet.'
        return $false
    }

    $portBusy = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($portBusy) {
        Write-Log 'Port 3000 deja en ecoute - aucun redemarrage necessaire.'
        return $true
    }

    Write-Log "Demarrage de node server.js via $nodeExe"
    Start-Process -FilePath $nodeExe -ArgumentList 'server.js' -WorkingDirectory $ProjectDir -WindowStyle Hidden
    return $true
}

$pingUrl = 'http://localhost:3000/ping'
$dashboardUrl = "http://localhost:3000/vhr-dashboard-pro.html"

Write-Log '-----'
Write-Log 'Auto-launch declenche (localhost)'

if (-not (Test-ServerReady -Url $pingUrl)) {
    if (-not (Ensure-Server -ProjectDir $ProjectDir)) {
        Write-Log 'Echec du demarrage du serveur.'
        exit 1
    }
    if (-not (Wait-Server -Url $pingUrl)) {
        Write-Log "Timeout d'attente du serveur (ping)."
        exit 2
    }
}

Write-Log ("Serveur operationnel - ouverture du dashboard (localhost): {0}" -f $dashboardUrl)
$browserLauncher = "cmd"
$browserArgs = "/c start \"\" \"$dashboardUrl\""
try {
    Start-Process -FilePath $browserLauncher -ArgumentList $browserArgs | Out-Null
} catch {
    Write-Log "Échec de l'ouverture automatique du navigateur : $($_.Exception.Message)"
}
exit 0
