param(
  [string]$ApiKey = $env:RENDER_API_KEY,
  [string]$ServiceId = $env:RENDER_SERVICE_ID
)

if (-not $ApiKey -or -not $ServiceId) {
  Write-Host "RENDER_API_KEY and RENDER_SERVICE_ID environment variables must be set"
  exit 1
}

$headers = @{ Authorization = "Bearer $ApiKey"; "Content-Type" = "application/json" }
$body = @{ type = "manual" } | ConvertTo-Json
$uri = "https://api.render.com/v1/services/$ServiceId/deploys"

try {
  $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
  Write-Host "Deploy triggered: $($resp.id)"
  Write-Host "You can check logs with scripts/render-logs.ps1 -DeployId $($resp.id)"
} catch {
  Write-Host "Error triggering deploy: $($_.Exception.Message)" -ForegroundColor Red
  exit 2
}
