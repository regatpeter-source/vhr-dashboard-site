param([string]$Domain = "https://vhr-dashboard-site.onrender.com")

Write-Host "VHR Dashboard - Diagnostic" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Test diagnosis endpoint
Write-Host "Testing diagnostic endpoint..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$Domain/api/admin/diagnose" `
        -Method GET `
        -UseBasicParsing `
        -TimeoutSec 10 `
        -ErrorAction Stop
    
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "DIAGNOSIS RESULTS:" -ForegroundColor Green
    Write-Host "=================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Mode: $($data.mode)" -ForegroundColor Yellow
    Write-Host "Timestamp: $($data.timestamp)" -ForegroundColor Gray
    Write-Host ""
    
    # Database check
    if ($data.checks.database) {
        $dbOk = $data.checks.database.ok
        $color = if ($dbOk) { "Green" } else { "Red" }
        Write-Host "Database: $($data.checks.database.message)" -ForegroundColor $color
    }
    
    # Users table check
    if ($data.checks.usersTable) {
        $tableOk = $data.checks.usersTable.ok
        $color = if ($tableOk) { "Green" } else { "Red" }
        Write-Host "Users Table: $($data.checks.usersTable.message)" -ForegroundColor $color
    }
    
    # Users count
    if ($data.checks.users) {
        $userCount = $data.checks.users.count
        Write-Host ""
        Write-Host "Users in database: $userCount" -ForegroundColor Cyan
        
        if ($data.checks.users.users -and $data.checks.users.users.length -gt 0) {
            foreach ($user in $data.checks.users.users) {
                Write-Host "  - $($user.username) ($($user.role)) [$($user.email)]" -ForegroundColor Green
            }
        } else {
            Write-Host "  NO USERS FOUND!" -ForegroundColor Red
        }
    }
    
    # Admin user check
    if ($data.checks.adminUser) {
        $adminOk = $data.checks.adminUser.ok
        $color = if ($adminOk) { "Green" } else { "Red" }
        Write-Host ""
        Write-Host "Admin user: $($data.checks.adminUser.message)" -ForegroundColor $color
    }
    
    Write-Host ""
    
    if ($data.checks.users.count -eq 0) {
        Write-Host "ACTION REQUIRED:" -ForegroundColor Yellow
        Write-Host "No users found. Run the initialization:" -ForegroundColor Yellow
        Write-Host "  .\init-users.ps1" -ForegroundColor Green
    } else {
        Write-Host "LOGIN CREDENTIALS:" -ForegroundColor Cyan
        Write-Host "  Username: vhr" -ForegroundColor Green
        Write-Host "  Password: VHR@Render#2025!SecureAdmin789" -ForegroundColor Green
        Write-Host "  URL: $Domain/account.html" -ForegroundColor Green
    }
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
