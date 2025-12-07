param([switch]$SkipJava, [switch]$SkipGradle)

if (-not $SkipJava) {
    Write-Host "Downloading Java JDK 11..." -ForegroundColor Cyan
    $jdkUrl = "https://api.adoptium.net/v3/binary/latest/11/ga/windows/x64/jdk/hotspot/normal/eclipse"
    $jdkZip = "C:\Temp\openjdk.zip"
    $jdkExtract = "C:\Java"
    
    mkdir -Force C:\Temp, C:\Java | Out-Null
    
    Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkZip -UseBasicParsing
    Expand-Archive -Path $jdkZip -DestinationPath $jdkExtract -Force
    
    $jdkPath = Get-ChildItem $jdkExtract -Directory | Select-Object -First 1 -ExpandProperty FullName
    
    [Environment]::SetEnvironmentVariable("JAVA_HOME", $jdkPath, "User")
    $env:JAVA_HOME = $jdkPath
    Write-Host "[OK] Java installed at: $jdkPath" -ForegroundColor Green
}

if (-not $SkipGradle) {
    Write-Host "Downloading Gradle 8.7..." -ForegroundColor Cyan
    $gradleUrl = "https://services.gradle.org/distributions/gradle-8.7-bin.zip"
    $gradleZip = "C:\Temp\gradle.zip"
    $gradleExtract = "C:\Gradle"
    
    mkdir -Force C:\Temp, C:\Gradle | Out-Null
    
    Invoke-WebRequest -Uri $gradleUrl -OutFile $gradleZip -UseBasicParsing
    Expand-Archive -Path $gradleZip -DestinationPath $gradleExtract -Force
    
    $gradleBin = "C:\Gradle\gradle-8.7\bin"
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    
    if ($currentPath -notlike "*gradle*") {
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$gradleBin", "User")
        $env:PATH = "$env:PATH;$gradleBin"
    }
    
    Write-Host "[OK] Gradle installed" -ForegroundColor Green
}

Write-Host "Installation complete! Restart your terminal." -ForegroundColor Green
