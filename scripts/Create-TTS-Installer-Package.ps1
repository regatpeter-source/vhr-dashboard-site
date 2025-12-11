#!/usr/bin/env powershell
<#
.SYNOPSIS
    Crée un package téléchargeable complet pour l'installation TTS
    
.DESCRIPTION
    Crée un fichier ZIP contenant:
    - Le script d'installation PowerShell
    - Le fichier batch pour Windows
    - La documentation
    - Prêt à être téléchargé et exécuté en 1 clic
#>

param(
    [string]$OutputPath = "$env:USERPROFILE\Downloads\VHR-TTS-Installer",
    [switch]$CreateZip = $true,
    [switch]$Upload
)

$ErrorActionPreference = "Stop"

# Configuration
$scriptDir = Split-Path -Parent $MyInvocation.MyCommandPath
$projectRoot = Split-Path -Parent $scriptDir

$filesToInclude = @(
    @{ Source = "$scriptDir\VHR-TTS-Complete-Installer.ps1"; Dest = "VHR-TTS-Complete-Installer.ps1" },
    @{ Source = "$scriptDir\VHR-TTS-Installer.bat"; Dest = "VHR-TTS-Installer.bat" },
    @{ Source = "$projectRoot\QUICK_START_TTS.md"; Dest = "QUICK_START.md" },
    @{ Source = "$projectRoot\VHR_TTS_RECEIVER_APP.md"; Dest = "DOCUMENTATION.md" }
)

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Création du Package d'Installation TTS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Créer le répertoire
$null = mkdir -Force $OutputPath
Write-Host "✓ Répertoire créé: $OutputPath" -ForegroundColor Green

# Copier les fichiers
Write-Host ""
Write-Host "Copie des fichiers..." -ForegroundColor Yellow
foreach ($file in $filesToInclude) {
    if (Test-Path $file.Source) {
        Copy-Item $file.Source (Join-Path $OutputPath $file.Dest) -Force
        Write-Host "  ✓ $(Split-Path -Leaf $file.Source)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $(Split-Path -Leaf $file.Source) - INTROUVABLE" -ForegroundColor Red
    }
}

# Créer un fichier README
$readmePath = Join-Path $OutputPath "README.txt"
@"
═══════════════════════════════════════════════════════════════════════
  VHR DASHBOARD - TTS RECEIVER INSTALLER (One-Click)
═══════════════════════════════════════════════════════════════════════

🎯 DÉMARRAGE RAPIDE:

1. Assurez-vous que Meta Quest est connecté en USB
2. Double-cliquez sur: VHR-TTS-Installer.bat
3. Suivez les instructions
4. C'est tout! L'app sera installée automatiquement

⏱️  DURÉE:
   - Première exécution: 5-15 minutes (téléchargement des dépendances)
   - Exécutions suivantes: <5 minutes (utilise le cache)

📋 PRÉ-REQUIS AVANT DE COMMENCER:

✓ Meta Quest 2, 3, ou Pro (connecté en USB)
✓ Windows 7+ avec PowerShell 5.0+
✓ Android Platform Tools (ADB) - https://bit.ly/android-tools
✓ Connexion Internet stable

❌ NE PAS REQUIS (installé automatiquement):
   • Java JDK 11 ← Téléchargé et installé automatiquement
   • Gradle ← Téléchargé et configuré automatiquement
   • Android Studio ← Non requis

🚀 QUE FAIT CE SCRIPT:

1. ✓ Télécharge et installe Java JDK 11 (s'il manque)
2. ✓ Configure Gradle automatiquement
3. ✓ Compile l'APK (5-15 minutes la première fois)
4. ✓ Installe l'app sur votre Meta Quest
5. ✓ Lance l'app TTS

💬 SI CELA N'OBTIENT PAS:

1. Vérifiez que ADB est installé:
   adb devices
   
2. Vérifiez que le casque est en mode développeur (depuis l'app Meta)

3. Vérifiez la connexion USB

4. Si Java JDK 11 ne s'installe pas:
   - Téléchargez: https://adoptopenjdk.net/
   - Installez: OpenJDK 11 (LTS)
   - Définissez JAVA_HOME dans les variables d'environnement

📖 DOCUMENTATION COMPLÈTE:

- QUICK_START.md: Guide de démarrage rapide
- DOCUMENTATION.md: Documentation technique complète

🔗 RESSOURCES:

- Android Platform Tools: https://developer.android.com/studio/releases/platform-tools
- Meta Quest Developer Docs: https://developer.oculus.com/
- Java JDK 11: https://adoptopenjdk.net/

✉️  SUPPORT:

Contactez: support@vhr-dashboard.com
ou visitez: https://vhr-dashboard-site.onrender.com/contact.html

═══════════════════════════════════════════════════════════════════════
Version: 2.0
Dernière mise à jour: $(Get-Date -Format "dd/MM/yyyy")
═══════════════════════════════════════════════════════════════════════
"@ | Out-File -FilePath $readmePath -Encoding UTF8 -Force
Write-Host "  ✓ README.txt" -ForegroundColor Green

# Créer un raccourci PowerShell
$psLnkPath = Join-Path $OutputPath "Lancer l'Installateur.lnk"
$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($psLnkPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $OutputPath 'VHR-TTS-Complete-Installer.ps1')`""
$shortcut.WorkingDirectory = $OutputPath
$shortcut.IconLocation = "powershell.exe"
$shortcut.Save()
Write-Host "  ✓ Raccourci PowerShell" -ForegroundColor Green

# Créer le ZIP si demandé
if ($CreateZip) {
    Write-Host ""
    Write-Host "Création du fichier ZIP..." -ForegroundColor Yellow
    
    $zipPath = "$OutputPath.zip"
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    # Créer le ZIP avec Compress-Archive
    Compress-Archive -Path "$OutputPath\*" -DestinationPath $zipPath -Force
    
    $zipSize = (Get-Item $zipPath).Length / 1MB
    Write-Host "✓ ZIP créé: $zipPath ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "📦 Package prêt à être téléchargé!" -ForegroundColor Cyan
    Write-Host "   Fichier: $zipPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pour distribuer:" -ForegroundColor Yellow
    Write-Host "  1. Compressez: $zipPath" -ForegroundColor Gray
    Write-Host "  2. Téléchargez vers votre serveur" -ForegroundColor Gray
    Write-Host "  3. Partagez le lien de téléchargement" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "📁 Fichiers préparés à:" -ForegroundColor Cyan
    Write-Host "   $OutputPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✓ Préparation terminée" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
