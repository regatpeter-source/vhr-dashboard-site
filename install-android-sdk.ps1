$SDK_ROOT = "C:\Android\SDK"
$CMDLINE_TOOLS = "$SDK_ROOT\cmdline-tools\latest\bin"

Write-Host "[SDK] Installation des composants Android SDK..." -ForegroundColor Cyan

# Définir les variables d'environnement
$env:ANDROID_SDK_ROOT = $SDK_ROOT
$env:ANDROID_HOME = $SDK_ROOT

# Accepter les licences
Write-Host "[SDK] Acceptation des licences..." -ForegroundColor Yellow
$licenses = Get-ChildItem "$SDK_ROOT\licenses" -ErrorAction SilentlyContinue
if (-not $licenses) {
    New-Item -ItemType Directory -Path "$SDK_ROOT\licenses" -Force | Out-Null
}

# Créer les fichiers de licence acceptés
@("android-sdk-license", "android-sdk-preview-license", "google-android-sdk-license", "mips-android-system-image", "intel-android-extra") | ForEach-Object {
    $license_file = "$SDK_ROOT\licenses\$_"
    if (-not (Test-Path $license_file)) {
        "8975348f24b3f76e1e4d1bfa76d27f63" | Out-File -FilePath $license_file -Encoding ASCII -Force
        Write-Host "[SDK] Licence acceptée: $_" -ForegroundColor Green
    }
}

# Installer les platforms
Write-Host "[SDK] Installation de android-32..." -ForegroundColor Yellow
& "$CMDLINE_TOOLS\sdkmanager.bat" "platforms;android-32" --sdk_root="$SDK_ROOT" 2>&1 | ForEach-Object { Write-Host "[SDK] $_" }

# Installer les build-tools
Write-Host "[SDK] Installation de build-tools-32.0.0..." -ForegroundColor Yellow
& "$CMDLINE_TOOLS\sdkmanager.bat" "build-tools;32.0.0" --sdk_root="$SDK_ROOT" 2>&1 | ForEach-Object { Write-Host "[SDK] $_" }

# Vérifier l'installation
Write-Host "[SDK] Vérification de l'installation..." -ForegroundColor Cyan
if (Test-Path "$SDK_ROOT\platforms\android-32") {
    Write-Host "[SDK] ✅ android-32 installé" -ForegroundColor Green
} else {
    Write-Host "[SDK] ❌ android-32 non trouvé" -ForegroundColor Red
}

if (Test-Path "$SDK_ROOT\build-tools\32.0.0") {
    Write-Host "[SDK] ✅ build-tools-32.0.0 installé" -ForegroundColor Green
} else {
    Write-Host "[SDK] ❌ build-tools-32.0.0 non trouvé" -ForegroundColor Red
}

Write-Host "[SDK] Terminé!" -ForegroundColor Green
