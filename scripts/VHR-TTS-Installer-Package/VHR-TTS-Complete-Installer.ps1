#!/usr/bin/env powershell
<#
.SYNOPSIS
    VHR Dashboard TTS Receiver App - Complete One-Click Installer
    
.DESCRIPTION
    Installe automatiquement tout (JDK 11, Gradle, compile l'APK, et installe sur le casque)
    Sans dépendances externes - tout en 1 clic!
    
.EXAMPLE
    .\VHR-TTS-Complete-Installer.ps1
    
.AUTHOR
    VHR Dashboard Team
#>

param(
    [switch]$SkipJava,
    [switch]$SkipGradle,
    [switch]$SkipCompile,
    [switch]$SkipInstall,
    [string]$DeviceSerial = ""
)

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Chemins
$scriptDir = Split-Path -Parent $MyInvocation.MyCommandPath
$projectRoot = Split-Path -Parent $scriptDir
$appDir = Join-Path $projectRoot "tts-receiver-app"
$buildOutputDir = Join-Path $appDir "app\build\outputs\apk\debug"
$apkPath = Join-Path $buildOutputDir "app-debug.apk"

# Outils
$javaInstallPath = "C:\Java\jdk-11"
$gradleVersion = "8.0"
$gradleInstallPath = "C:\Gradle\gradle-$gradleVersion"

# URLs de téléchargement
$javaDownloadUrl = "https://github.com/adoptium/temurin11-binaries/releases/download/jdk-11.0.21%2B9/OpenJDK11U-jdk_x64_windows_hotspot_11.0.21_9.zip"
$gradleDownloadUrl = "https://services.gradle.org/distributions/gradle-8.0-bin.zip"

# Couleurs
$Colors = @{
    Header   = 'Cyan'
    Success  = 'Green'
    Warning  = 'Yellow'
    Error    = 'Red'
    Info     = 'Gray'
    Highlight = 'Magenta'
}

# ═══════════════════════════════════════════════════════════════════════════════
# FONCTIONS UTILITAIRES
# ═══════════════════════════════════════════════════════════════════════════════

function Write-Header {
    param([string]$Message)
    Write-Host "`n" -NoNewline
    Write-Host "╔$('═' * ($Message.Length + 2))╗" -ForegroundColor $Colors.Header
    Write-Host "║ $Message ║" -ForegroundColor $Colors.Header
    Write-Host "╚$('═' * ($Message.Length + 2))╝" -ForegroundColor $Colors.Header
}

function Write-Step {
    param([string]$Message, [int]$StepNumber)
    Write-Host "`n[$StepNumber] " -ForegroundColor $Colors.Header -NoNewline
    Write-Host "$Message" -ForegroundColor $Colors.Highlight
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $Colors.Success
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $Colors.Error
}

function Write-Info {
    param([string]$Message)
    Write-Host "  → $Message" -ForegroundColor $Colors.Info
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor $Colors.Warning
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Download-File {
    param(
        [string]$Url,
        [string]$OutPath,
        [string]$Description
    )
    
    Write-Info "Téléchargement: $Description"
    try {
        Invoke-WebRequest -Uri $Url -OutFile $OutPath -UseBasicParsing -TimeoutSec 600
        Write-Success "Téléchargement terminé: $(Split-Path -Leaf $OutPath)"
        return $true
    } catch {
        Write-Error-Custom "Erreur de téléchargement: $_"
        return $false
    }
}

function Extract-Archive-Safe {
    param(
        [string]$ZipPath,
        [string]$ExtractPath,
        [string]$Description
    )
    
    Write-Info "Extraction: $Description"
    try {
        $null = mkdir -Force $ExtractPath -ErrorAction SilentlyContinue
        Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force
        Remove-Item $ZipPath -Force
        Write-Success "Extraction terminée"
        return $true
    } catch {
        Write-Error-Custom "Erreur d'extraction: $_"
        return $false
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 1: VÉRIFIER LES PRÉREQUIS DE BASE
# ═══════════════════════════════════════════════════════════════════════════════

function Check-Prerequisites {
    Write-Header "Vérification des Prérequis"
    
    # Vérifier PowerShell version
    $psVersion = $PSVersionTable.PSVersion.Major
    if ($psVersion -lt 5) {
        Write-Error-Custom "PowerShell 5.0+ requis (vous avez $psVersion)"
        exit 1
    }
    Write-Success "PowerShell version: $psVersion.x"
    
    # Vérifier projet Android
    if (-not (Test-Path $appDir)) {
        Write-Error-Custom "Répertoire tts-receiver-app introuvable à: $appDir"
        exit 1
    }
    Write-Success "Projet Android trouvé: $appDir"
    
    # Vérifier ADB
    if (-not (Test-Command "adb")) {
        Write-Warning-Custom "ADB non trouvé dans PATH"
        Write-Info "Assurez-vous que Android Platform Tools est installé et dans PATH"
        Write-Info "Téléchargez depuis: https://developer.android.com/studio/releases/platform-tools"
        Read-Host "Appuyez sur Entrée une fois ADB installé"
    } else {
        Write-Success "ADB trouvé"
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 2: INSTALLER JAVA JDK 11
# ═══════════════════════════════════════════════════════════════════════════════

function Install-Java {
    Write-Step "Installation de Java JDK 11" 2
    
    if ($SkipJava) {
        Write-Info "Sauté par l'utilisateur"
        return
    }
    
    # Vérifier si Java est déjà installé
    if (Test-Command "java") {
        $javaVersion = java -version 2>&1 | Select-String "11\." | Select-Object -First 1
        if ($javaVersion) {
            Write-Success "Java 11 déjà installé"
            return
        }
    }
    
    # Télécharger et installer
    Write-Info "Java JDK 11 non trouvé - Installation automatique"
    
    $jdkZip = Join-Path $env:TEMP "openjdk11.zip"
    
    if (-not (Download-File $javaDownloadUrl $jdkZip "Java JDK 11")) {
        Write-Error-Custom "Impossible de télécharger Java"
        exit 1
    }
    
    $tempExtract = Join-Path $env:TEMP "java-temp"
    if (-not (Extract-Archive-Safe $jdkZip $tempExtract "Java JDK 11")) {
        Write-Error-Custom "Impossible d'extraire Java"
        exit 1
    }
    
    # Trouver le dossier JDK extrait
    $jdkFolder = Get-ChildItem $tempExtract -Directory | Select-Object -First 1
    
    # Déplacer vers le chemin final
    $null = mkdir -Force "C:\Java" -ErrorAction SilentlyContinue
    Move-Item -Path $jdkFolder.FullName -Destination $javaInstallPath -Force
    Remove-Item $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
    
    # Configurer les variables d'environnement
    [Environment]::SetEnvironmentVariable("JAVA_HOME", $javaInstallPath, "User")
    $env:JAVA_HOME = $javaInstallPath
    
    $javaBinPath = Join-Path $javaInstallPath "bin"
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($currentPath -notlike "*$javaBinPath*") {
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$javaBinPath", "User")
        $env:PATH = "$env:PATH;$javaBinPath"
    }
    
    Write-Success "Java JDK 11 installé à: $javaInstallPath"
    Write-Info "Variables d'environnement configurées"
}

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 3: CONFIGURER GRADLE
# ═══════════════════════════════════════════════════════════════════════════════

function Install-Gradle {
    Write-Step "Configuration de Gradle" 3
    
    if ($SkipGradle) {
        Write-Info "Sauté par l'utilisateur"
        return
    }
    
    # Vérifier gradlew dans le projet
    $gradleWrapper = Join-Path $appDir "gradlew.bat"
    if (Test-Path $gradleWrapper) {
        Write-Success "Gradle Wrapper trouvé dans le projet"
        Write-Info "Gradle se configurera automatiquement"
        return
    }
    
    Write-Info "Gradle Wrapper non trouvé - Installation manuelle non requise"
    Write-Info "Le wrapper Gradle téléchargera les dépendances automatiquement"
}

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 4: COMPILER L'APK
# ═══════════════════════════════════════════════════════════════════════════════

function Compile-APK {
    Write-Step "Compilation de l'APK" 4
    
    if ($SkipCompile) {
        Write-Info "Sauté par l'utilisateur"
        return
    }
    
    # Vérifier que Java est disponible
    if (-not (Test-Command "java")) {
        Write-Error-Custom "Java non trouvé - Impossible de compiler"
        exit 1
    }
    
    Write-Info "Répertoire: $appDir"
    Push-Location $appDir
    
    try {
        Write-Info "Ceci peut prendre 5-15 minutes la première fois"
        Write-Info "Les dépendances Gradle seront téléchargées automatiquement"
        Write-Info ""
        
        # Nettoyer les builds précédentes
        Write-Info "Nettoyage des builds précédentes..."
        & .\gradlew.bat clean -q
        
        # Compiler
        Write-Info "Compilation en cours... (cela peut être long)"
        Write-Info "📦 Gradle télécharge les dépendances..."
        
        $startTime = Get-Date
        & .\gradlew.bat assembleDebug
        $duration = (Get-Date) - $startTime
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "La compilation a échoué"
            Write-Warning-Custom "Vérifiez que Java JDK 11+ est correctement installé"
            Write-Warning-Custom "JAVA_HOME = $env:JAVA_HOME"
            exit 1
        }
        
        Write-Success "Compilation réussie en $($duration.TotalSeconds) secondes"
        
        # Vérifier que l'APK a été créé
        if (-not (Test-Path $apkPath)) {
            Write-Error-Custom "APK introuvable à: $apkPath"
            exit 1
        }
        
        $apkSize = (Get-Item $apkPath).Length / 1MB
        Write-Success "APK généré: $(Split-Path -Leaf $apkPath) ($([math]::Round($apkSize, 2)) MB)"
        
    } finally {
        Pop-Location
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 5: INSTALLER SUR LE CASQUE
# ═══════════════════════════════════════════════════════════════════════════════

function Install-On-Device {
    Write-Step "Installation sur le casque Quest" 5
    
    if ($SkipInstall) {
        Write-Info "Sauté par l'utilisateur"
        Write-Info "APK disponible à: $apkPath"
        return
    }
    
    # Obtenir la liste des appareils
    Write-Info "Recherche des appareils ADB..."
    $devices = & adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\s+device$" }
    
    if ($devices.Count -eq 0) {
        Write-Warning-Custom "Aucun appareil détecté en ADB"
        Write-Info "Étapes de dépannage:"
        Write-Info "  1. Connectez votre Meta Quest en USB"
        Write-Info "  2. Activez le mode développeur sur le casque"
        Write-Info "  3. Acceptez le débogage USB sur l'écran du casque"
        Write-Info "  4. Réessayez"
        Read-Host "Appuyez sur Entrée une fois prêt"
        
        $devices = & adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\s+device$" }
        if ($devices.Count -eq 0) {
            Write-Error-Custom "Toujours aucun appareil trouvé"
            exit 1
        }
    }
    
    # Sélectionner l'appareil
    $selectedSerial = $null
    if ($DeviceSerial) {
        $selectedSerial = $DeviceSerial
    } elseif ($devices.Count -eq 1) {
        $selectedSerial = ($devices[0] -split '\s+')[0]
        Write-Success "Un seul appareil détecté: $selectedSerial"
    } else {
        Write-Info "Appareils détectés:"
        for ($i = 0; $i -lt $devices.Count; $i++) {
            $serial = ($devices[$i] -split '\s+')[0]
            Write-Host "  [$($i+1)] $serial"
        }
        $choice = Read-Host "Sélectionnez l'appareil (numéro)"
        if ($choice -ge 1 -and $choice -le $devices.Count) {
            $selectedSerial = ($devices[$choice - 1] -split '\s+')[0]
        } else {
            Write-Error-Custom "Sélection invalide"
            exit 1
        }
    }
    
    Write-Info "Installation sur: $selectedSerial"
    
    # Installer l'APK
    Write-Info "Transfert et installation..."
    & adb -s $selectedSerial install -r $apkPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "L'installation ADB a échoué"
        exit 1
    }
    
    Write-Success "APK installé sur le casque"
    
    # Lancer l'app
    Write-Info "Lancement de l'application..."
    & adb -s $selectedSerial shell am start -n com.vhr.dashboard/.MainActivity
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Application lancée!"
        Write-Success "Vous devriez voir 'VHR TTS Receiver' sur votre casque"
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# ÉTAPE 6: TEST
# ═══════════════════════════════════════════════════════════════════════════════

function Test-Installation {
    Write-Step "Vérification de l'installation" 6
    
    Write-Info "Vérification que l'app est installée..."
    
    try {
        $installed = & adb shell pm list packages | Select-String "com.vhr.dashboard"
        if ($installed) {
            Write-Success "L'app TTS est installée sur le casque"
            Write-Info ""
            Write-Info "Prochaines étapes:"
            Write-Info "  1. Ouvrez le Dashboard: http://localhost:3000/vhr-dashboard-pro.html"
            Write-Info "  2. Allez à la section 'Envoyeur de Voix'"
            Write-Info "  3. Entrez un texte et cliquez 'Envoyer au casque'"
            Write-Info "  4. Écoutez le casque prononcer le texte!"
        }
    } catch {
        Write-Warning-Custom "Impossible de vérifier l'installation"
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

function Main {
    Write-Host ""
    Write-Header "🚀 VHR Dashboard TTS Receiver - Installation Complète"
    Write-Host ""
    
    Write-Host "Cet installateur va:" -ForegroundColor $Colors.Highlight
    Write-Host "  ✓ Télécharger et installer Java JDK 11" -ForegroundColor $Colors.Info
    Write-Host "  ✓ Configurer Gradle" -ForegroundColor $Colors.Info
    Write-Host "  ✓ Compiler l'APK (5-15 minutes)" -ForegroundColor $Colors.Info
    Write-Host "  ✓ Installer sur votre Meta Quest" -ForegroundColor $Colors.Info
    Write-Host ""
    
    # Vérifier les prérequis
    Check-Prerequisites
    
    # Installer les outils
    Install-Java
    Install-Gradle
    
    # Compiler
    Compile-APK
    
    # Installer
    Install-On-Device
    
    # Vérifier et tester
    Test-Installation
    
    # Résumé final
    Write-Header "✨ Installation Terminée avec Succès!"
    Write-Host ""
    Write-Success "L'app TTS Receiver est maintenant prête à utiliser"
    Write-Info "APK sauvegardé à: $apkPath"
    Write-Info ""
    Write-Host "Documentation:" -ForegroundColor $Colors.Highlight
    Write-Host "  • Quick Start: $projectRoot\QUICK_START_TTS.md" -ForegroundColor $Colors.Info
    Write-Host "  • Guide Complet: $projectRoot\VHR_TTS_RECEIVER_APP.md" -ForegroundColor $Colors.Info
    Write-Host ""
}

# Lancer le programme principal
try {
    Main
} catch {
    Write-Host ""
    Write-Error-Custom "Erreur fatale: $_"
    exit 1
}
