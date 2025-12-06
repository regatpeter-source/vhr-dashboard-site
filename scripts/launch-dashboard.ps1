# VHR Dashboard Quick Launcher
# Starts local server and opens dashboard - completely automated

# Configuration
$serverPort = 3000
$dashboardUrl = "http://localhost:$serverPort/vhr-dashboard-app.html"
$maxWaitSeconds = 30

# Colors for output
function Write-Status {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

Write-Status "============================================"
Write-Status "VHR Dashboard Launcher"
Write-Status "============================================"
Write-Host ""

# Check if Node.js is installed
Write-Status "Checking for Node.js..."
try {
    $nodeVersion = node --version
    Write-Success "Node.js found: $nodeVersion"
} catch {
    Write-ErrorMsg "ERROR: Node.js is not installed"
    Write-Host "Download from: https://nodejs.org" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Get the project directory (parent of scripts folder)
$projectDir = Split-Path -Parent $PSScriptRoot
Write-Status "Project directory: $projectDir"

# Check if already running on port
Write-Status "Checking if server is already running..."
try {
    $testConnection = Test-NetConnection -ComputerName localhost -Port $serverPort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($testConnection.TcpTestSucceeded -eq $true) {
        Write-Success "Server already running on port $serverPort"
        Write-Status "Opening dashboard..."
        Start-Sleep -Milliseconds 500
        try {
            Start-Process $dashboardUrl
            Write-Success "Dashboard opened successfully!"
            exit 0
        } catch {
            Write-ErrorMsg "Failed to open browser: $_"
            Write-Host "Try manually opening: $dashboardUrl" -ForegroundColor Yellow
            Write-Host "Press any key to exit..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            exit 1
        }
    }
} catch {
    Write-Status "Server not running, will start it now"
}

# Install dependencies if node_modules doesn't exist
Write-Status "Checking dependencies..."
if (-not (Test-Path "$projectDir\node_modules")) {
    Write-Status "Installing npm dependencies..."
    Push-Location $projectDir
    try {
        npm install 2>&1 | Out-Null
        Write-Success "Dependencies installed"
    } catch {
        Write-ErrorMsg "Failed to install dependencies: $_"
        Pop-Location
        Write-Host "Press any key to exit..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Pop-Location
} else {
    Write-Success "Dependencies already installed"
}

# Start the server in the background (hidden window)
Write-Status "Starting server..."

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
    Write-Success "Server started (PID: $($serverProcess.Id))"
} catch {
    Write-ErrorMsg "Failed to start server: $_"
    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Wait for server to be ready (max 30 seconds)
Write-Status "Waiting for server to be ready..."
$startTime = Get-Date
$serverReady = $false
$attempts = 0

while ((Get-Date) - $startTime -lt (New-TimeSpan -Seconds $maxWaitSeconds)) {
    $attempts++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$serverPort/ping" -TimeoutSec 2 -ErrorAction SilentlyContinue -WarningAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $serverReady = $true
            Write-Success "Server is ready!"
            break
        }
    } catch {
        # Server not ready yet
    }
    
    Start-Sleep -Milliseconds 500
    if ($attempts % 4 -eq 0) {
        Write-Host "." -NoNewline -ForegroundColor Cyan
    }
}

Write-Host ""

if (-not $serverReady) {
    Write-ErrorMsg "ERROR: Server failed to respond after $maxWaitSeconds seconds"
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

# Open dashboard in browser
Write-Status "Opening dashboard in browser..."
Write-Host "URL: $dashboardUrl" -ForegroundColor Gray
Start-Sleep -Milliseconds 500

try {
    Start-Process $dashboardUrl
    Write-Success "Dashboard opened successfully!"
} catch {
    Write-ErrorMsg "Failed to open browser: $_"
    Write-Host "Try manually opening this URL:" -ForegroundColor Yellow
    Write-Host $dashboardUrl -ForegroundColor Yellow
}

Write-Host ""
Write-Success "Server is running in the background."
Write-Host "Close this window when you're done." -ForegroundColor Gray
Write-Host ""

# Wait for user input or server crash
$serverProcess.WaitForExit()

# Clean up if still running
if (-not $serverProcess.HasExited) {
    try {
        $serverProcess.Kill()
    } catch {}
}

Write-ErrorMsg "Server has stopped."
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
exit 0
