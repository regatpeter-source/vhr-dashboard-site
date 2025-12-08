param([switch]$SkipJava, [switch]$SkipGradle)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  VHR Dashboard Build Tools Installer" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if already installed
function Test-BuildTools {
    $javaExists = $null -ne (Get-Command java -ErrorAction SilentlyContinue)
    $gradleExists = $null -ne (Get-Command gradle -ErrorAction SilentlyContinue)
    
    Write-Host "`nChecking existing installations..." -ForegroundColor Yellow
    Write-Host "  Java: $(if ($javaExists) { 'FOUND ✓' } else { 'NOT FOUND ✗' })" -ForegroundColor $(if ($javaExists) { 'Green' } else { 'Red' })
    Write-Host "  Gradle: $(if ($gradleExists) { 'FOUND ✓' } else { 'NOT FOUND ✗' })" -ForegroundColor $(if ($gradleExists) { 'Green' } else { 'Red' })
    
    return @{ Java = $javaExists; Gradle = $gradleExists }
}

$status = Test-BuildTools

# Install Java
if (-not $SkipJava -and -not $status.Java) {
    Write-Host "`nInstalling Java JDK 11..." -ForegroundColor Cyan
    Write-Host "Downloading from Adoptium..." -ForegroundColor Gray
    
    try {
        $jdkUrl = "https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.21%2B9/OpenJDK11U-jdk_x64_windows_hotspot_11.0.21_9.zip"
        $jdkZip = "$env:TEMP\openjdk.zip"
        $jdkExtract = "C:\Java"
        
        mkdir -Force $jdkExtract | Out-Null
        
        Write-Host "Downloading..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkZip -UseBasicParsing -TimeoutSec 300
        
        Write-Host "Extracting..." -ForegroundColor Gray
        Expand-Archive -Path $jdkZip -DestinationPath $jdkExtract -Force
        
        $jdkPath = Get-ChildItem $jdkExtract -Directory | Select-Object -First 1 -ExpandProperty FullName
        
        Write-Host "Configuring environment variables..." -ForegroundColor Gray
        [Environment]::SetEnvironmentVariable("JAVA_HOME", $jdkPath, "User")
        $env:JAVA_HOME = $jdkPath
        
        # Add to PATH
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
        $javaBindPath = "$jdkPath\bin"
        if ($currentPath -notlike "*$javaBindPath*") {
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$javaBindPath", "User")
            $env:PATH = "$env:PATH;$javaBindPath"
        }
        
        Write-Host "[✓] Java JDK 11 installed successfully" -ForegroundColor Green
        Write-Host "   Location: $jdkPath" -ForegroundColor Green
        
        Remove-Item $jdkZip -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-Host "[✗] Failed to install Java: $_" -ForegroundColor Red
        exit 1
    }
}

# Install Gradle
if (-not $SkipGradle -and -not $status.Gradle) {
    Write-Host "`nInstalling Gradle 8.7..." -ForegroundColor Cyan
    Write-Host "Downloading from gradle.org..." -ForegroundColor Gray
    
    try {
        $gradleUrl = "https://services.gradle.org/distributions/gradle-8.7-bin.zip"
        $gradleZip = "$env:TEMP\gradle.zip"
        $gradleExtract = "C:\Gradle"
        
        mkdir -Force $gradleExtract | Out-Null
        
        Write-Host "Downloading..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $gradleUrl -OutFile $gradleZip -UseBasicParsing -TimeoutSec 300
        
        Write-Host "Extracting..." -ForegroundColor Gray
        Expand-Archive -Path $gradleZip -DestinationPath $gradleExtract -Force
        
        $gradleBin = "C:\Gradle\gradle-8.7\bin"
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
        
        if ($currentPath -notlike "*gradle*") {
            Write-Host "Configuring environment variables..." -ForegroundColor Gray
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$gradleBin", "User")
            $env:PATH = "$env:PATH;$gradleBin"
        }
        
        Write-Host "[✓] Gradle 8.7 installed successfully" -ForegroundColor Green
        Write-Host "   Location: $gradleExtract\gradle-8.7" -ForegroundColor Green
        
        Remove-Item $gradleZip -Force -ErrorAction SilentlyContinue
    }
    catch {
        Write-Host "[✗] Failed to install Gradle: $_" -ForegroundColor Red
        exit 1
    }
}

# Final verification
Write-Host "`nVerifying installation..." -ForegroundColor Yellow
$finalStatus = Test-BuildTools

Write-Host "`n================================================" -ForegroundColor Cyan
if ($finalStatus.Java -and $finalStatus.Gradle) {
    Write-Host "✓ All build tools installed successfully!" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "`nPlease:" -ForegroundColor Cyan
    Write-Host "  1. Close ALL PowerShell windows" -ForegroundColor White
    Write-Host "  2. Reopen PowerShell" -ForegroundColor White
    Write-Host "  3. Restart the VHR server" -ForegroundColor White
    Write-Host "  4. Try downloading the voice app again" -ForegroundColor White
    Write-Host "================================================`n" -ForegroundColor Cyan
    exit 0
}
else {
    Write-Host "✗ Installation incomplete" -ForegroundColor Red
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "Please try running the script again" -ForegroundColor Yellow
    exit 1
}
