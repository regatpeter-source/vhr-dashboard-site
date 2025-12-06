# VHR Dashboard Quick Launcher
# Starts local server and opens dashboard

$serverPort = 3000
$dashboardUrl = "http://localhost:$serverPort/vhr-dashboard-app.html"
$maxWaitSeconds = 30

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VHR Dashboard Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking for Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed" -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

$projectDir = Split-Path -Parent $PSScriptRoot
Write-Host "Project directory: $projectDir" -ForegroundColor Cyan

Write-Host "Checking if server is already running..." -ForegroundColor Cyan
try {
    $testConnection = Test-NetConnection -ComputerName localhost -Port $serverPort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($testConnection.TcpTestSucceeded -eq $true) {
        Write-Host "Server already running on port $serverPort" -ForegroundColor Green
        Write-Host "Opening dashboard..." -ForegroundColor Cyan
        Start-Sleep -Milliseconds 500
        try {
            Start-Process $dashboardUrl
            Write-Host "Dashboard opened successfully!" -ForegroundColor Green
            exit 0
        } catch {
            Write-Host "Failed to open browser: $_" -ForegroundColor Red
            Write-Host "Try manually opening: $dashboardUrl" -ForegroundColor Yellow
            Write-Host "Press any key to exit..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            exit 1
        }
    }
} catch {
    Write-Host "Server not running, will start it now" -ForegroundColor Cyan
}

Write-Host "Checking dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "$projectDir\node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Cyan
    Push-Location $projectDir
    try {
        npm install 2>&1 | Out-Null
        Write-Host "Dependencies installed" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install dependencies: $_" -ForegroundColor Red
        Pop-Location
        Write-Host "Press any key to exit..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Pop-Location
} else {
    Write-Host "Dependencies already installed" -ForegroundColor Green
}

Write-Host "Starting server..." -ForegroundColor Cyan

$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = "node"
$processInfo.Arguments = "server.js"
$processInfo.WorkingDirectory = $projectDir
$processInfo.UseShellExecute = $false
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.CreateNoWindow = $true

$serverProcess = New-Object System.Diagnostics.Process
$serverProcess.StartInfo = $processInfo

try {
    $serverProcess.Start() | Out-Null
    Write-Host "Server started (PID: $($serverProcess.Id))" -ForegroundColor Green
} catch {
    Write-Host "Failed to start server: $_" -ForegroundColor Red
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "Waiting for server to be ready..." -ForegroundColor Cyan
$startTime = Get-Date
$serverReady = $false
$attempts = 0

while ((Get-Date) - $startTime -lt (New-TimeSpan -Seconds $maxWaitSeconds)) {
    $attempts++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$serverPort/ping" -TimeoutSec 2 -ErrorAction SilentlyContinue -WarningAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
            Write-Host "Server is ready!" -ForegroundColor Green
            break
        }
    } catch {
    }
    
    Start-Sleep -Milliseconds 500
    if ($attempts % 4 -eq 0) {
        Write-Host "." -NoNewline -ForegroundColor Cyan
    }
}

Write-Host ""

if (-not $serverReady) {
    Write-Host "ERROR: Server failed to respond after $maxWaitSeconds seconds" -ForegroundColor Red
    Write-Host "Stopping server..." -ForegroundColor Yellow
    try {
        $serverProcess.Kill()
    } catch {}
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "- Check if port $serverPort is already in use"
    Write-Host "- Check if Node.js dependencies are installed"
    Write-Host "- Try deleting node_modules folder and rerun this script"
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "Opening dashboard in browser..." -ForegroundColor Cyan
Write-Host "URL: $dashboardUrl" -ForegroundColor Gray
Start-Sleep -Milliseconds 500

try {
    Start-Process $dashboardUrl
    Write-Host "Dashboard opened successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to open browser: $_" -ForegroundColor Red
    Write-Host "Try manually opening this URL:" -ForegroundColor Yellow
    Write-Host $dashboardUrl -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Server is running in the background." -ForegroundColor Green
Write-Host "Close this window when you are done." -ForegroundColor Gray
Write-Host ""

$serverProcess.WaitForExit()

if (-not $serverProcess.HasExited) {
    try {
        $serverProcess.Kill()
    } catch {}
}

Write-Host "Server has stopped." -ForegroundColor Red
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
exit 0
