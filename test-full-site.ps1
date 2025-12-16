param(
    [string]$Domain = "https://vhr-dashboard-site.onrender.com"
)

Write-Host "VHR Dashboard - Full Site Verification" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Domain: $Domain" -ForegroundColor Yellow
Write-Host ""

$results = @()
$check = "[OK]"
$cross = "[FAIL]"

# Test 1: Homepage
Write-Host "[1/8] Testing homepage..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Domain/" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  $check Homepage accessible" -ForegroundColor Green
        $results += @{ test = "Homepage"; status = "OK"; code = 200 }
    }
} catch {
    Write-Host "  $cross Homepage failed: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Homepage"; status = "FAILED"; error = $_.Exception.Message }
}

# Test 2: Account/Login page
Write-Host "[2/8] Testing account page..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Domain/account.html" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  $check Account page accessible" -ForegroundColor Green
        $results += @{ test = "Account Page"; status = "OK"; code = 200 }
    }
} catch {
    Write-Host "  $cross Account page failed: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Account Page"; status = "FAILED"; error = $_.Exception.Message }
}

# Test 3: Dashboard Pro
Write-Host "[3/8] Testing dashboard pro..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Domain/admin-dashboard.html" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  $check Dashboard Pro accessible" -ForegroundColor Green
        $results += @{ test = "Dashboard Pro"; status = "OK"; code = 200 }
    }
} catch {
    Write-Host "  $cross Dashboard Pro failed: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Dashboard Pro"; status = "FAILED"; error = $_.Exception.Message }
}

# Test 4: Login endpoint
Write-Host "[4/8] Testing login endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Domain/api/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body (ConvertTo-Json @{ username = "vhr"; password = "[REDACTED]" }) `
        -UseBasicParsing `
        -TimeoutSec 10 `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    if ($data.ok -and $data.token) {
        Write-Host "  $check Login works (token issued)" -ForegroundColor Green
        $results += @{ test = "Login Endpoint"; status = "OK"; code = 200 }
    } else {
        Write-Host "  $cross Login failed: No token" -ForegroundColor Red
        $results += @{ test = "Login Endpoint"; status = "FAILED"; error = "No token" }
    }
} catch {
    Write-Host "  $cross Login failed: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Login Endpoint"; status = "FAILED"; error = $_.Exception.Message }
}

# Test 5: Database diagnostic
Write-Host "[5/8] Testing database status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Domain/api/admin/diagnose" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 10 `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    $userCount = $data.checks.users.count
    if ($data.checks.database.ok -and $userCount -gt 0) {
        Write-Host "  $check Database connected ($userCount users)" -ForegroundColor Green
        $results += @{ test = "Database"; status = "OK"; users = $userCount }
    } else {
        Write-Host "  $cross Database issue" -ForegroundColor Red
        $results += @{ test = "Database"; status = "FAILED" }
    }
} catch {
    Write-Host "  $cross Database check failed: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Database"; status = "FAILED"; error = $_.Exception.Message }
}

# Test 6: Features page
Write-Host "[6/8] Testing features page..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Domain/features.html" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  $check Features page accessible" -ForegroundColor Green
        $results += @{ test = "Features Page"; status = "OK"; code = 200 }
    }
} catch {
    Write-Host "  $cross Features page failed: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Features Page"; status = "FAILED"; error = $_.Exception.Message }
}

# Test 7: Pricing page
Write-Host "[7/8] Testing pricing page..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Domain/pricing.html" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  $check Pricing page accessible" -ForegroundColor Green
        $results += @{ test = "Pricing Page"; status = "OK"; code = 200 }
    }
} catch {
    Write-Host "  $cross Pricing page failed: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Pricing Page"; status = "FAILED"; error = $_.Exception.Message }
}

# Test 8: Server health
Write-Host "[8/8] Testing server health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$Domain/robots.txt" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  $check Server responding normally" -ForegroundColor Green
        $results += @{ test = "Server Health"; status = "OK"; code = 200 }
    }
} catch {
    Write-Host "  $cross Server health check failed: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{ test = "Server Health"; status = "FAILED"; error = $_.Exception.Message }
}

# Summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$passCount = ($results | Where-Object { $_.status -eq "OK" }).Count
$failCount = ($results | Where-Object { $_.status -eq "FAILED" }).Count

Write-Host "Tests Passed: $passCount" -ForegroundColor Green
Write-Host "Tests Failed: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

Write-Host "Test Results:" -ForegroundColor Cyan
$results | ForEach-Object {
    $color = if ($_.status -eq "OK") { "Green" } else { "Red" }
    $icon = if ($_.status -eq "OK") { $check } else { $cross }
    Write-Host "  $icon $($_.test): $($_.status)" -ForegroundColor $color
}

Write-Host ""
if ($failCount -eq 0) {
    Write-Host "$check ALL TESTS PASSED - SITE IS FULLY OPERATIONAL!" -ForegroundColor Green
} else {
    Write-Host "$cross Some tests failed - review above" -ForegroundColor Red
}

Write-Host ""
Write-Host "Access the site at: $Domain" -ForegroundColor Cyan
Write-Host "Admin login: vhr / [REDACTED]" -ForegroundColor Yellow
