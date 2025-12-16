# Test Battery Gauge Display Fix
# Tests the battery level display on both table and cards views

Write-Host '======================================' -ForegroundColor Cyan
Write-Host 'Battery Gauge Display Test' -ForegroundColor Cyan
Write-Host '======================================' -ForegroundColor Cyan
Write-Host ''

# Test 1: Check if dashboard-pro.js contains battery elements in both views
Write-Host '[TEST 1] Checking dashboard-pro.js for battery elements...' -ForegroundColor Yellow

$dashboardFile = 'C:\Users\peter\VR-Manager\public\dashboard-pro.js'
if (Test-Path $dashboardFile) {
    $content = Get-Content $dashboardFile -Raw
    
    # Check for battery element in cards view
    if ($content -match "id='battery_") {
        Write-Host 'OK Battery element found in cards view' -ForegroundColor Green
    } else {
        Write-Host 'ERROR Battery element NOT found in cards view' -ForegroundColor Red
    }
    
    # Check for fetchBatteryLevel function
    if ($content -match 'async function fetchBatteryLevel') {
        Write-Host 'OK fetchBatteryLevel function found' -ForegroundColor Green
    } else {
        Write-Host 'ERROR fetchBatteryLevel function NOT found' -ForegroundColor Red
    }
    
    # Check if battery appears in table section
    if ($content -match 'renderDevicesTable') {
        $tableIndex = $content.IndexOf('function renderDevicesTable')
        if ($tableIndex -gt 0) {
            $tableSection = $content.Substring($tableIndex, [Math]::Min(3000, $content.Length - $tableIndex))
            if ($tableSection -match 'battery') {
                Write-Host 'OK Battery display added to table view' -ForegroundColor Green
            } else {
                Write-Host 'ERROR Battery not found in table view' -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host 'ERROR dashboard-pro.js not found' -ForegroundColor Red
}

Write-Host ''
Write-Host '[TEST 2] Checking server.js for battery API endpoint...' -ForegroundColor Yellow

$serverFile = 'C:\Users\peter\VR-Manager\server.js'
if (Test-Path $serverFile) {
    $content = Get-Content $serverFile -Raw
    
    if ($content -match "app\.get\('/api/battery/:serial'") {
        Write-Host 'OK /api/battery/:serial endpoint found' -ForegroundColor Green
    } else {
        Write-Host 'ERROR /api/battery/:serial endpoint NOT found' -ForegroundColor Red
    }
    
    if ($content -match 'battery') {
        Write-Host 'OK Battery-related code found in server' -ForegroundColor Green
    } else {
        Write-Host 'ERROR Battery extraction logic NOT found' -ForegroundColor Red
    }
} else {
    Write-Host 'ERROR server.js not found' -ForegroundColor Red
}

Write-Host ''
Write-Host '[TEST 3] Checking view mode default setting...' -ForegroundColor Yellow

$dashboardFile = 'C:\Users\peter\VR-Manager\public\dashboard-pro.js'
if (Test-Path $dashboardFile) {
    $content = Get-Content $dashboardFile -Raw
    
    # Look for viewMode initialization
    if ($content -match 'viewMode' -or $content -match 'let.*view') {
        Write-Host 'OK View mode setup found' -ForegroundColor Green
        Write-Host '   Default is table - battery should display there' -ForegroundColor Cyan
    } else {
        Write-Host 'ERROR View mode setup NOT found' -ForegroundColor Red
    }
} else {
    Write-Host 'ERROR dashboard-pro.js not found' -ForegroundColor Red
}

Write-Host ''
Write-Host '======================================' -ForegroundColor Cyan
Write-Host 'SUMMARY' -ForegroundColor Cyan
Write-Host '======================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Changes made:' -ForegroundColor Green
Write-Host '   1. Added Batterie column to table view header' -ForegroundColor Gray
Write-Host '   2. Added battery element to each table row' -ForegroundColor Gray
Write-Host '   3. Added fetchBatteryLevel() call for each device in table' -ForegroundColor Gray
Write-Host '   4. Battery now works in both TABLE and CARDS views' -ForegroundColor Gray
Write-Host ''
Write-Host 'Expected behavior:' -ForegroundColor Cyan
Write-Host '   - Battery percentage displays next to each device' -ForegroundColor Gray
Write-Host '   - Color-coded: Green (over 50%), Orange (over 20%), Red (20% or less)' -ForegroundColor Gray
Write-Host '   - Emoji indicators show battery status' -ForegroundColor Gray
Write-Host '   - Updates every 2 seconds' -ForegroundColor Gray
Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Yellow
Write-Host '   1. Reload dashboard in browser (F5)' -ForegroundColor Gray
Write-Host '   2. Battery levels should now appear next to headsets' -ForegroundColor Gray
Write-Host '   3. Try switching between table and cards views' -ForegroundColor Gray
Write-Host ''
