# Fix Build Environment - Java & Gradle Configuration
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File "scripts/fix-build-env.ps1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VHR Dashboard - Build Environment Fix" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠️  This script should ideally be run as Administrator." -ForegroundColor Yellow
    Write-Host ""
}

# Function to safely download files
function Download-File {
    param([string]$Url, [string]$OutFile, [string]$Description)
    
    Write-Host "   📥 Downloading $Description..." -ForegroundColor Gray
    try {
        Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing -TimeoutSec 300 -ErrorAction Stop
        Write-Host "   ✓ Downloaded successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "   ✗ Download failed: $_" -ForegroundColor Red
        return $false
    }
}

# 1. Check and Install Java
Write-Host "1️⃣  Checking Java JDK 11..." -ForegroundColor Cyan

$javaInstalled = $null -ne (Get-Command java -ErrorAction SilentlyContinue)
$javaHome = $env:JAVA_HOME

if ($javaInstalled) {
    Write-Host "   ✓ Java already installed" -ForegroundColor Green
    try {
        $javaVersion = & java -version 2>&1 | Select-Object -First 1
        Write-Host "     Version: $javaVersion" -ForegroundColor Gray
    } catch {}
} else {
    Write-Host "   ✗ Java NOT found. Installing..." -ForegroundColor Yellow
    
    $jdkUrl = "https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.21%2B9/OpenJDK11U-jdk_x64_windows_hotspot_11.0.21_9.zip"
    $jdkZip = "$env:TEMP\openjdk.zip"
    $jdkExtract = "C:\Java"
    
    mkdir -Force $jdkExtract | Out-Null
    
    if (Download-File -Url $jdkUrl -OutFile $jdkZip -Description "Java JDK 11") {
        Write-Host "   📦 Extracting Java..." -ForegroundColor Gray
        try {
            Expand-Archive -Path $jdkZip -DestinationPath $jdkExtract -Force -ErrorAction Stop
            $jdkPath = (Get-ChildItem $jdkExtract -Directory -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
            
            if ($jdkPath) {
                Write-Host "   ✓ Java extracted to: $jdkExtract" -ForegroundColor Green
                
                # Set JAVA_HOME
                [Environment]::SetEnvironmentVariable("JAVA_HOME", $jdkPath, "User")
                $env:JAVA_HOME = $jdkPath
                
                # Add to PATH
                $javaBindPath = "$jdkPath\bin"
                $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
                if ($currentPath -notlike "*$javaBindPath*") {
                    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$javaBindPath", "User")
                    $env:PATH = "$env:PATH;$javaBindPath"
                }
                
                Write-Host "   ✓ Java environment configured" -ForegroundColor Green
            }
        } catch {
            Write-Host "   ✗ Extraction failed: $_" -ForegroundColor Red
        }
        Remove-Item $jdkZip -Force -ErrorAction SilentlyContinue
    }
}

# 2. Check and Install Gradle
Write-Host ""
Write-Host "2️⃣  Checking Gradle 8.7..." -ForegroundColor Cyan

$gradleInstalled = $null -ne (Get-Command gradle -ErrorAction SilentlyContinue)

if ($gradleInstalled) {
    Write-Host "   ✓ Gradle already installed" -ForegroundColor Green
    try {
        $gradleVersion = & gradle --version 2>&1 | Select-Object -First 1
        Write-Host "     Version: $gradleVersion" -ForegroundColor Gray
    } catch {}
} else {
    Write-Host "   ✗ Gradle NOT found. Installing..." -ForegroundColor Yellow
    
    $gradleUrl = "https://services.gradle.org/distributions/gradle-8.7-bin.zip"
    $gradleZip = "$env:TEMP\gradle.zip"
    $gradleExtract = "C:\Gradle"
    
    mkdir -Force $gradleExtract | Out-Null
    
    if (Download-File -Url $gradleUrl -OutFile $gradleZip -Description "Gradle 8.7") {
        Write-Host "   📦 Extracting Gradle..." -ForegroundColor Gray
        try {
            Expand-Archive -Path $gradleZip -DestinationPath $gradleExtract -Force -ErrorAction Stop
            Write-Host "   ✓ Gradle extracted to: $gradleExtract\gradle-8.7" -ForegroundColor Green
            
            # Add to PATH
            $gradleBin = "$gradleExtract\gradle-8.7\bin"
            $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
            if ($currentPath -notlike "*gradle*") {
                [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$gradleBin", "User")
                $env:PATH = "$env:PATH;$gradleBin"
            }
            
            Write-Host "   ✓ Gradle added to PATH" -ForegroundColor Green
        } catch {
            Write-Host "   ✗ Extraction failed: $_" -ForegroundColor Red
        }
        Remove-Item $gradleZip -Force -ErrorAction SilentlyContinue
    }
}

# 3. Verify Final Installation
Write-Host ""
Write-Host "3️⃣  Verifying Installation..." -ForegroundColor Cyan

$javaOk = $false
$gradleOk = $false

try {
    $javaTest = & java -version 2>&1 | Select-Object -First 1
    if ($javaTest) {
        Write-Host "   ✓ Java: OK - $javaTest" -ForegroundColor Green
        $javaOk = $true
    }
} catch {
    Write-Host "   ✗ Java: NOT ACCESSIBLE (will work after restart)" -ForegroundColor Yellow
}

try {
    $gradleTest = & gradle --version 2>&1 | Select-Object -First 1
    if ($gradleTest) {
        Write-Host "   ✓ Gradle: OK - $gradleTest" -ForegroundColor Green
        $gradleOk = $true
    }
} catch {
    Write-Host "   ✗ Gradle: NOT ACCESSIBLE (will work after restart)" -ForegroundColor Yellow
}

# Final Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
if ($javaOk -and $gradleOk) {
    Write-Host "✅ All tools are installed and ready!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Installation complete, but you need to:" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. ❌ CLOSE all PowerShell windows completely" -ForegroundColor White
Write-Host "   2. ✅ OPEN a NEW PowerShell window" -ForegroundColor White
Write-Host "   3. Navigate to your VHR Dashboard folder" -ForegroundColor White
Write-Host "   4. Run: npm start" -ForegroundColor White
Write-Host "   5. Try downloading the voice app again" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Your build environment is now configured!" -ForegroundColor Green
Write-Host ""
Write-Host "❓ If you still get errors:" -ForegroundColor Yellow
Write-Host "   - Verify JAVA_HOME in System Variables: Win+X → System → Advanced → Environment Variables" -ForegroundColor Gray
Write-Host "   - Check that C:\\Java and C:\\Gradle directories exist" -ForegroundColor Gray
Write-Host "   - Restart your computer if issues persist" -ForegroundColor Gray
Write-Host ""
