# Fix Build Environment - Java & Gradle Configuration
# Usage: .\scripts\fix-build-env.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VHR Dashboard - Build Environment Fix" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠️  This script should be run as Administrator for best results." -ForegroundColor Yellow
    Write-Host "Consider running: powershell -NoProfile -ExecutionPolicy Bypass -Command `"& {.\scripts\fix-build-env.ps1}`"" -ForegroundColor Yellow
    Write-Host ""
}

# 1. Check Java
Write-Host "1️⃣  Checking Java..." -ForegroundColor Cyan
$javaPath = "C:\Java\jdk-11.0.29+7\bin\java.exe"
$javaExists = Test-Path $javaPath

if ($javaExists) {
    Write-Host "✅ Java found at: $javaPath" -ForegroundColor Green
} else {
    Write-Host "❌ Java NOT found. Installing..." -ForegroundColor Yellow
    $jdkUrl = "https://api.adoptium.net/v3/binary/latest/11/ga/windows/x64/jdk/hotspot/normal/eclipse"
    $jdkZip = "$env:TEMP\openjdk.zip"
    $jdkExtract = "C:\Java"
    
    Write-Host "   Downloading Java JDK 11..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkZip -UseBasicParsing -ErrorAction Stop
        Write-Host "   Extracting..." -ForegroundColor Yellow
        mkdir -Force $jdkExtract | Out-Null
        Expand-Archive -Path $jdkZip -DestinationPath $jdkExtract -Force
        $jdkPath = (Get-ChildItem $jdkExtract -Directory | Select-Object -First 1).FullName
        Write-Host "✅ Java installed at: $jdkPath" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to download Java: $_" -ForegroundColor Red
        exit 1
    }
}

# 2. Check Gradle
Write-Host ""
Write-Host "2️⃣  Checking Gradle..." -ForegroundColor Cyan
$gradlePath = "C:\Gradle\gradle-8.7\bin\gradle.bat"
$gradleExists = Test-Path $gradlePath

if ($gradleExists) {
    Write-Host "✅ Gradle found at: $gradlePath" -ForegroundColor Green
} else {
    Write-Host "❌ Gradle NOT found. Installing..." -ForegroundColor Yellow
    $gradleUrl = "https://services.gradle.org/distributions/gradle-8.7-bin.zip"
    $gradleZip = "$env:TEMP\gradle.zip"
    $gradleExtract = "C:\Gradle"
    
    Write-Host "   Downloading Gradle 8.7..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $gradleUrl -OutFile $gradleZip -UseBasicParsing -ErrorAction Stop
        Write-Host "   Extracting..." -ForegroundColor Yellow
        mkdir -Force $gradleExtract | Out-Null
        Expand-Archive -Path $gradleZip -DestinationPath $gradleExtract -Force
        Write-Host "✅ Gradle installed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to download Gradle: $_" -ForegroundColor Red
        exit 1
    }
}

# 3. Set Environment Variables
Write-Host ""
Write-Host "3️⃣  Configuring Environment Variables..." -ForegroundColor Cyan

$jdkFolder = if ($javaExists) { (Get-Item $javaPath).Directory.Parent.FullName } else { $jdkPath }
[Environment]::SetEnvironmentVariable("JAVA_HOME", $jdkFolder, "User")
$env:JAVA_HOME = $jdkFolder
Write-Host "   JAVA_HOME = $jdkFolder" -ForegroundColor Green

$gradleBin = "C:\Gradle\gradle-8.7\bin"
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*gradle*") {
    [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$gradleBin", "User")
    $env:PATH = "$env:PATH;$gradleBin"
    Write-Host "   Added Gradle to PATH" -ForegroundColor Green
} else {
    Write-Host "   Gradle already in PATH" -ForegroundColor Green
}

# 4. Verify Installation
Write-Host ""
Write-Host "4️⃣  Verifying Installation..." -ForegroundColor Cyan

try {
    $javaVersion = & java -version 2>&1 | Select-Object -First 1
    Write-Host "   Java: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Java not accessible yet. Please restart terminal." -ForegroundColor Yellow
}

try {
    $gradleVersion = & gradle --version 2>&1 | Select-Object -First 1
    Write-Host "   Gradle: $gradleVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Gradle not accessible yet. Please restart terminal." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Close this PowerShell window" -ForegroundColor White
Write-Host "   2. Open a NEW PowerShell window (to refresh PATH)" -ForegroundColor White
Write-Host "   3. Go to your project directory" -ForegroundColor White
Write-Host "   4. Run: npm start" -ForegroundColor White
Write-Host ""
Write-Host "🎯 Your system is now ready to compile VR apps!" -ForegroundColor Green
