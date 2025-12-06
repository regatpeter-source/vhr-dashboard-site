$port = 3000
$url = "http://localhost:$port/vhr-dashboard-app.html"
$dir = Split-Path -Parent $PSScriptRoot
Write-Host "VHR Dashboard Launcher"
Write-Host "======================================"
Write-Host "Checking Node.js..."
node --version
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Node.js not found"; pause; exit 1 }
Write-Host "Project: $dir"
Write-Host "Checking npm dependencies..."
if (-not (Test-Path "$dir\node_modules")) {
  Write-Host "Installing..."
  cd $dir
  npm install 2>&1 | Out-Null
  cd $PSScriptRoot
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
Write-Host "Server started (PID: $($p.Id))"
Write-Host "Waiting for server..."
$done = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:$port/ping" -TimeoutSec 1 -ErrorAction SilentlyContinue -WarningAction SilentlyContinue
    if ($r.StatusCode -eq 200) { $done = $true; break }
  } catch { }
  Start-Sleep -Milliseconds 500
  if ($i % 4 -eq 0) { Write-Host "." -NoNewline }
}
Write-Host ""
if (-not $done) { Write-Host "ERROR: Server timeout"; $p.Kill(); pause; exit 1 }
Write-Host "Server ready! Opening browser..."
Start-Process $url
Write-Host "Dashboard opened at $url"
Write-Host "Press Ctrl+C to stop server"
$p.WaitForExit()
if (-not $p.HasExited) { $p.Kill() }
Write-Host "Server stopped"
pause
exit 0