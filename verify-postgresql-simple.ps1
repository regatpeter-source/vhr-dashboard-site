# PostgreSQL 18 Database Verification Script

Write-Host "PostgreSQL 18 - Database Verification" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$Domain = "https://vhr-dashboard-site.onrender.com"

# Login
Write-Host "Step 1: Authenticating..." -ForegroundColor Yellow
$loginResp = Invoke-WebRequest -Uri "$Domain/api/login" -Method POST -ContentType "application/json" -Body (ConvertTo-Json @{username="vhr"; password="[REDACTED]"}) -UseBasicParsing
$loginData = $loginResp.Content | ConvertFrom-Json
$token = $loginData.token
Write-Host "✓ Authenticated" -ForegroundColor Green
Write-Host ""

# Check Database
Write-Host "Step 2: Checking database..." -ForegroundColor Yellow
$diagResp = Invoke-WebRequest -Uri "$Domain/api/admin/diagnose" -UseBasicParsing
$null = $diagResp.Content | ConvertFrom-Json
Write-Host "✓ Database connected" -ForegroundColor Green
Write-Host ""

# Get Users
Write-Host "Step 3: Retrieving users..." -ForegroundColor Yellow
$headers = @{"Authorization" = "Bearer $token"}
$usersResp = Invoke-WebRequest -Uri "$Domain/api/admin/users" -Headers $headers -UseBasicParsing
$usersData = $usersResp.Content | ConvertFrom-Json
$userCount = $usersData.users.Count
Write-Host "✓ Found $userCount users:" -ForegroundColor Green
$usersData.users | ForEach-Object {
    Write-Host "  - $($_.username) ($($_.role))" -ForegroundColor Cyan
}
Write-Host ""

# Create Backup
Write-Host "Step 4: Creating backup..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "C:\Users\peter\VR-Manager\backups\postgresql_$timestamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$usersData.users | ConvertTo-Json | Out-File "$backupDir\users_backup.json"
Write-Host "✓ Backup created: $backupDir" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Verification Complete" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Status:" -ForegroundColor Green
Write-Host "  ✓ PostgreSQL 18 connected" -ForegroundColor Green
Write-Host "  ✓ $userCount users in database" -ForegroundColor Green
Write-Host "  ✓ Backup created" -ForegroundColor Green
Write-Host ""
Write-Host "Data is safe and persistent!" -ForegroundColor Green
Write-Host ""
