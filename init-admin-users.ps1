# Initialize default admin users on production
param(
    [string]$Domain = "https://vhr-dashboard-site.onrender.com"
)

Write-Host "Initializing default admin users on: $Domain" -ForegroundColor Green
Write-Host ""

# Call the initialization endpoint
try {
    $response = Invoke-WebRequest -Uri "$Domain/api/admin/init-users" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{}' `
        -UseBasicParsing
    
    Write-Host "Response:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host ""
Write-Host "Default login credentials:" -ForegroundColor Yellow
Write-Host "   Username: vhr"
Write-Host "   Password: VHR@Render#2025!SecureAdmin789"
Write-Host ""
Write-Host "Try logging in at: $Domain/account.html" -ForegroundColor Cyan
