param(
    [string]$Domain = "http://localhost:3000",
    [string]$AdminUsername = "vhr",
    [string]$AdminPassword = "admin"
)

Write-Host "`n" -ForegroundColor Cyan
Write-Host "VHR Dashboard - Admin Access Test" -ForegroundColor Cyan
Write-Host "═════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as admin
Write-Host "[STEP 1] Logging in as admin ($AdminUsername)..." -ForegroundColor Yellow
$loginData = @{
    username = $AdminUsername
    password = $AdminPassword
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$Domain/api/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginData `
        -UseBasicParsing `
        -TimeoutSec 10 `
        -ErrorAction Stop
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.ok) {
        $token = $result.token
        Write-Host "✅ Login successful - Token received" -ForegroundColor Green
        Write-Host "   Username: $($result.username)" -ForegroundColor Green
        Write-Host "   Role: $($result.role)" -ForegroundColor Green
    } else {
        Write-Host "❌ Login failed: $($result.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Login error: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Check demo/license status
Write-Host "`n[STEP 2] Checking demo/license status..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri "$Domain/api/demo/status" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing `
        -TimeoutSec 10 `
        -ErrorAction Stop
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.ok) {
        Write-Host "✅ Demo status check successful" -ForegroundColor Green
        Write-Host "   Access Blocked: $($result.demo.accessBlocked)" -ForegroundColor Green
        Write-Host "   Subscription Status: $($result.demo.subscriptionStatus)" -ForegroundColor Green
        Write-Host "   Message: $($result.demo.message)" -ForegroundColor Green
        
        if ($result.demo.accessBlocked) {
            Write-Host "`n⚠️  WARNING: Admin access is still being blocked!" -ForegroundColor Red
            Write-Host "   This means the fix didn't work properly." -ForegroundColor Red
            exit 1
        } else {
            Write-Host "`n✅ SUCCESS: Admin can access dashboard without restrictions!" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Demo status check failed: $($result.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Demo status check error: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n[RESULT] Admin dashboard access test PASSED ✅" -ForegroundColor Green
Write-Host "═════════════════════════════════════════`n" -ForegroundColor Green
