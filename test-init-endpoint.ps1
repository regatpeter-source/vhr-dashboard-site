# Test the admin init endpoint
param(
    [string]$Domain = "https://vhr-dashboard-site.onrender.com",
    [int]$MaxRetries = 5,
    [int]$RetryDelay = 3
)

Write-Host "VHR Dashboard - Admin User Initialization" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Target: $Domain" -ForegroundColor Yellow
Write-Host ""

# Retry logic
for ($i = 1; $i -le $MaxRetries; $i++) {
    Write-Host "[$i/$MaxRetries] Testing endpoint..." -ForegroundColor Yellow
    
    $success = $false
    try {
        $response = Invoke-WebRequest -Uri "$Domain/api/admin/init-users" `
            -Method POST `
            -ContentType "application/json" `
            -Body '{}' `
            -UseBasicParsing `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        Write-Host "✓ Success (HTTP $($response.StatusCode))" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Green
        $success = $true
    }
    catch {
        $errorMsg = $_.Exception.Message
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.Value__
            Write-Host "✗ Failed (HTTP $statusCode)" -ForegroundColor Red
            
            if ($statusCode -eq 404) {
                Write-Host "  Endpoint not found - deployment may still be in progress" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "✗ Connection error: $errorMsg" -ForegroundColor Red
        }
    }
    
    if ($success) {
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "✓ Users initialized successfully!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Default credentials:" -ForegroundColor Cyan
        Write-Host "  Username: vhr" -ForegroundColor Green
        Write-Host "  Password: VHR@Render#2025!SecureAdmin789" -ForegroundColor Green
        Write-Host ""
        Write-Host "Try logging in at: $Domain/account.html" -ForegroundColor Cyan
        Write-Host ""
        exit 0
    }
    
    if ($i -lt $MaxRetries) {
        Write-Host "Waiting ${RetryDelay}s before retry..." -ForegroundColor Yellow
        Start-Sleep -Seconds $RetryDelay
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Red
Write-Host "✗ Failed after $MaxRetries attempts" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Red
Write-Host ""
Write-Host "Possible issues:" -ForegroundColor Yellow
Write-Host "1. Service still deploying (wait 2-3 minutes)" -ForegroundColor Yellow
Write-Host "2. Check deployment status: https://dashboard.render.com" -ForegroundColor Yellow
Write-Host "3. Check service logs for errors" -ForegroundColor Yellow
Write-Host ""
