param([string]$Domain = "https://vhr-dashboard-site.onrender.com")

Write-Host "Testing admin init endpoint..." -ForegroundColor Cyan

$maxRetries = 5
$retryDelay = 3

for ($i = 1; $i -le $maxRetries; $i++) {
    Write-Host "[$i/$maxRetries] Calling $Domain/api/admin/init-users..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "$Domain/api/admin/init-users" -Method POST -ContentType "application/json" -Body '{}' -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        
        Write-Host "SUCCESS!" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Login with:" -ForegroundColor Cyan
        Write-Host "  Username: vhr" -ForegroundColor Green  
        Write-Host "  Password: [REDACTED]" -ForegroundColor Green
        Write-Host "  URL: $Domain/account.html" -ForegroundColor Green
        Write-Host ""
        exit 0
    }
    catch {
        $msg = $_.Exception.Message
        Write-Host "Error: $msg" -ForegroundColor Red
        
        if ($i -lt $maxRetries) {
            Write-Host "Retrying in ${retryDelay}s..." -ForegroundColor Yellow
            Start-Sleep -Seconds $retryDelay
        }
    }
}

Write-Host ""
Write-Host "FAILED after $maxRetries attempts" -ForegroundColor Red
Write-Host "Check: https://dashboard.render.com" -ForegroundColor Yellow
