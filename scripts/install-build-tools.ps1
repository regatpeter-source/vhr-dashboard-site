#!/usr/bin/env pwsh
# Script d'installation automatique de Java JDK et Gradle pour VHR Dashboard
# Usage: .\install-build-tools.ps1

param(
    [switch]$SkipJava,
    [switch]$SkipGradle
)

Write-Host "======================================"
Write-Host "VHR Dashboard - Installation des outils de build"
Write-Host "======================================"
Write-Host ""

$ErrorActionPreference = "Continue"

# Fonction pour vérifier si une commande existe
function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# Installer Java JDK 11
if (-not $SkipJava) {
    Write-Host "📦 Installation de Java JDK 11..." -ForegroundColor Cyan
    
    if (Test-Command java) {
        $javaVersion = java -version 2>&1 | Select-String "version"
        Write-Host "✅ Java est déjà installé: $javaVersion" -ForegroundColor Green
    } else {
        Write-Host "⏬ Téléchargement et installation de Java JDK 11 (Eclipse Temurin)..." -ForegroundColor Yellow
        
        # Télécharger le dernier JDK 11
        $jdkUrl = "https://api.adoptium.net/v3/binary/latest/11/ga/windows/x64/jdk/hotspot/normal/eclipse"
        $jdkPath = "$env:TEMP\adoptium-jdk.msi"
        
        try {
            Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkPath -UseBasicParsing -ErrorAction Stop
            Write-Host "✅ JDK téléchargé" -ForegroundColor Green
            
            # Installer le JDK
            Write-Host "⏳ Installation du JDK..." -ForegroundColor Yellow
            Start-Process -FilePath $jdkPath -ArgumentList "/quiet" -Wait
            
            # Configurer JAVA_HOME
            $javaInstallPath = Get-ChildItem "C:\Program Files\Eclipse Adoptium\jdk-*" | Select-Object -First 1 -ExpandProperty FullName
            
            if ($javaInstallPath) {
                [Environment]::SetEnvironmentVariable("JAVA_HOME", $javaInstallPath, "User")
                [Environment]::SetEnvironmentVariable("JAVA_HOME", $javaInstallPath, "Machine")
                $env:JAVA_HOME = $javaInstallPath
                
                Write-Host "✅ Java JDK installé et JAVA_HOME configuré: $javaInstallPath" -ForegroundColor Green
            }
        } catch {
            Write-Host "❌ Erreur lors de l'installation de Java: $_" -ForegroundColor Red
            Write-Host "📥 Vous pouvez télécharger manuellement depuis: https://adoptium.net/" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# Installer Gradle
if (-not $SkipGradle) {
    Write-Host "📦 Installation de Gradle..." -ForegroundColor Cyan
    
    if (Test-Command gradle) {
        $gradleVersion = gradle --version 2>&1 | Select-String "Gradle"
        Write-Host "✅ Gradle est déjà installé: $gradleVersion" -ForegroundColor Green
    } else {
        Write-Host "⏬ Téléchargement et installation de Gradle..." -ForegroundColor Yellow
        
        $gradleUrl = "https://services.gradle.org/distributions/gradle-8.7-bin.zip"
        $gradlePath = "$env:TEMP\gradle-8.7-bin.zip"
        $gradleExtractPath = "C:\gradle"
        
        try {
            Invoke-WebRequest -Uri $gradleUrl -OutFile $gradlePath -UseBasicParsing -ErrorAction Stop
            Write-Host "✅ Gradle téléchargé" -ForegroundColor Green
            
            # Extraire Gradle
            Write-Host "⏳ Extraction de Gradle..." -ForegroundColor Yellow
            Expand-Archive -Path $gradlePath -DestinationPath $gradleExtractPath -Force
            
            # Configurer le PATH
            $gradleBinPath = "$gradleExtractPath\gradle-8.7\bin"
            $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
            
            if ($currentPath -notlike "*$gradleBinPath*") {
                [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$gradleBinPath", "User")
                $env:PATH = "$env:PATH;$gradleBinPath"
                
                Write-Host "✅ Gradle installé et PATH configuré: $gradleBinPath" -ForegroundColor Green
            }
        } catch {
            Write-Host "❌ Erreur lors de l'installation de Gradle: $_" -ForegroundColor Red
            Write-Host "📥 Vous pouvez télécharger manuellement depuis: https://gradle.org/releases/" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "======================================"
Write-Host "✅ Installation terminée!" -ForegroundColor Green
Write-Host "======================================"
Write-Host ""
Write-Host "⚠️  IMPORTANT: Fermez et rouvrez votre terminal/serveur pour que les changements prennent effet!"
Write-Host ""
Write-Host "Vérification:"
Write-Host "  - java --version"
Write-Host "  - gradle --version"
Write-Host ""
Write-Host "Ensuite, réessayez de compiler l'APK dans le dashboard."
