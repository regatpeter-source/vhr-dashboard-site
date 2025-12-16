param(
    [string]$Domain = "https://vhr-dashboard-site.onrender.com",
    [string]$Username = "vhr",
    [SecureString]$Password = (ConvertTo-SecureString -String "[REDACTED]" -AsPlainText -Force)
)

# Convert SecureString to plain text for API call
$plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($Password))

Write-Host "Testing login..." -ForegroundColor Cyan
Write-Host "Domain: $Domain" -ForegroundColor Yellow
Write-Host "Username: $Username" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "$Domain/api/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body (ConvertTo-Json @{ username = $Username; password = $plainPassword }) `
        -UseBasicParsing `
        -TimeoutSec 10 `
        -ErrorAction Stop
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5) -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Login works! You should be able to access the dashboard." -ForegroundColor Green
}
catch {
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to get response body
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $response = $reader.ReadToEnd()
        Write-Host "Response: $response" -ForegroundColor Red
    }
}
