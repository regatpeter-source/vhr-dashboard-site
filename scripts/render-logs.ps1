param(
  [string]$ApiKey = $env:RENDER_API_KEY,
  [string]$ServiceId = $env:RENDER_SERVICE_ID,
  [string]$DeployId = $null
)

if (-not $ApiKey -or -not $ServiceId) {
  Write-Host "RENDER_API_KEY and RENDER_SERVICE_ID environment variables must be set"
  exit 1
}

$headers = @{ Authorization = "Bearer $ApiKey" }

if (-not $DeployId) {
  # Get most recent deploy
  $uriLatest = "https://api.render.com/v1/services/$ServiceId/deploys?limit=1"
  try {
    $latest = Invoke-RestMethod -Method Get -Uri $uriLatest -Headers $headers
    $DeployId = $latest[0].id
  } catch {
    Write-Host "Error fetching latest deploy id: $($_.Exception.Message)" -ForegroundColor Red
    exit 2
  }
}

$uriLogs = "https://api.render.com/v1/services/$ServiceId/deploys/$DeployId/logs"
Write-Host "Fetching logs for deploy $DeployId..."
try {
  # Fetch logs JSON (or stream?) - Render returns lines in JSON.
  $logs = Invoke-RestMethod -Method Get -Uri $uriLogs -Headers $headers
  $logs | ForEach-Object { Write-Host $_ }
} catch {
  Write-Host "Error fetching logs: $($_.Exception.Message)" -ForegroundColor Red
  exit 3
}
