$port = 3000
$url = "http://localhost:$port/vhr-dashboard-app.html"

# Use project directory passed from batch, or current location
if (-not $projectDir) { $projectDir = Get-Location }
$dir = $projectDir.ToString()

Write-Host "VHR Dashboard Launcher"
Write-Host "======================================"
Write-Host "Checking Node.js..."
node --version
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Node.js not found"; pause; exit 1 }
Write-Host "Project: $dir"
Write-Host "Checking npm dependencies..."
if (-not (Test-Path "$dir\node_modules")) {
  Write-Host "Installing..."
  Push-Location $dir
  npm install 2>&1 | Out-Null
  Pop-Location
}
Write-Host "Starting server..."
$proc = New-Object System.Diagnostics.ProcessStartInfo
$proc.FileName = "node"
$proc.Arguments = "server.js"
$proc.WorkingDirectory = $dir
$proc.UseShellExecute = $false
$proc.RedirectStandardOutput = $true
$proc.RedirectStandardError = $true
$proc.CreateNoWindow = $true
$p = New-Object System.Diagnostics.Process
$p.StartInfo = $proc
$p.Start() | Out-Null
$serverpid = $p.Id
Write-Host "Server started (PID: $serverpid)"
Write-Host "Waiting for server..."

$done = $false
$output_task = $p.StandardOutput.ReadToEndAsync()
$error_task = $p.StandardError.ReadToEndAsync()

for ($i = 0; $i -lt 120; $i++) {
  if ($p.HasExited) {
    Write-Host ""
    Write-Host "ERROR: Server crashed!"
    if ($output_task.IsCompleted) { Write-Host "Output: $($output_task.Result)" }
    if ($error_task.IsCompleted) { Write-Host "Error: $($error_task.Result)" }
    pause
    exit 1
  }
  
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:$port/ping" -TimeoutSec 1 -ErrorAction SilentlyContinue -WarningAction SilentlyContinue
    if ($r.StatusCode -eq 200) { $done = $true; break }
  } catch { }
  
  Start-Sleep -Milliseconds 500
  if ($i % 4 -eq 0) { Write-Host "." -NoNewline }
}

Write-Host ""
if (-not $done) { Write-Host "ERROR: Server timeout after 60 seconds"; $p.Kill(); pause; exit 1 }

Write-Host "Server ready! Opening browser..."
Start-Process $url
Write-Host "Dashboard opened at $url"
Write-Host "Press Ctrl+C to stop server"
$p.WaitForExit()
if (-not $p.HasExited) { $p.Kill() }
Write-Host "Server stopped"
pause
exit 0