<#
PowerShell helper script to build a debug demo APK locally using the saket/Hello-World-Android sample.
- Clones the sample to ./sample-android if not already present (or pulls latest).
- Runs gradlew assembleDebug to build the APK.
- Copies the resulting APK to ./downloads/vhr-dashboard-demo.apk and ./public/vhr-dashboard-demo.apk.
- Creates ./downloads/vhr-dashboard-demo.zip with the APK and demo_readme.txt.
- Optionally validates the APK using `node scripts/check-apk.js`.

Prerequisites:
- Java 17+ installed and available in PATH (java -version).
- Android SDK and platform tools available (when building a real APK). For local builds, installing Android Studio or standalone SDK is recommended.
- Git CLI installed to clone the sample repo.

Usage:
- Open PowerShell at the repository root and run: .\scripts\build-demo-apk.ps1
#>

param(
    [string]$SampleRepo = 'https://github.com/saket/Hello-World-Android.git',
    [string]$SampleDir = 'sample-android',
    [switch]$ForceClone = $false,
    [switch]$CloneOnly = $false,
    [switch]$SkipPrereqCheck = $false
)

function Write-Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Write-ErrorMsg($m) { Write-Host "[ERROR] $m" -ForegroundColor Red }

try {
    $origDir = Get-Location
    $repoRoot = $origDir.Path
} catch {
    Write-ErrorMsg "Failed to capture current directory: $_"; exit 2
}

# Check Java (unless skipped or clone-only)
if (-not $SkipPrereqCheck -and -not $CloneOnly) {
    try {
        $java = & java -version 2>&1
        if ($LASTEXITCODE -ne 0) { throw 'java not found' }
        Write-Info "Java detected: $($java[0])"
    } catch {
        Write-ErrorMsg "Java not found in PATH. Please install Java 17 (OpenJDK Temurin recommended) and add it to PATH. Aborting build (you can still use -CloneOnly to just clone the sample)."; if ($CloneOnly) { exit 0 } else { exit 1 }
    }
}

# Ensure Git present
try {
    $gitVer = & git --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'git not found' }
    Write-Info "Git detected: $($gitVer)"
} catch {
    Write-ErrorMsg "Git not found in PATH. Please install Git CLI. Exiting."; exit 1
}

# Clone or update sample
$samplePath = Join-Path -Path (Get-Location) -ChildPath $SampleDir
if (Test-Path $samplePath -PathType Container -ErrorAction SilentlyContinue) {
    if ($ForceClone) { Remove-Item -Recurse -Force -LiteralPath $samplePath }
    else {
        Write-Info "Sample dir exists. Updating: $samplePath"
        try { Set-Location -Path $samplePath; & git pull --ff-only 2>&1 | Write-Output; Set-Location -Path $origDir } catch { Write-Info "Warning: failed to pull sample repo (ignored): $_" }
    }
}
if (!(Test-Path $samplePath -PathType Container)) {
    Write-Info "Cloning sample repo $SampleRepo into $SampleDir"
    & git clone $SampleRepo $SampleDir | Write-Output
    if ($LASTEXITCODE -ne 0) { Write-ErrorMsg "git clone failed with exit code $LASTEXITCODE. Please check repo URL and network access." ; exit 10 }
}

# If only cloning requested, skip the build step
if ($CloneOnly) { Write-Info "Clone-only mode: skipping build step as requested."; Set-Location -Path $repoRoot; Write-Info "Sample cloned to: $samplePath"; exit 0 }

# Build the APK using gradle wrapper.
$gradlewBat = Join-Path $samplePath 'gradlew.bat'
$gradlew = Join-Path $samplePath 'gradlew'

Set-Location -Path $samplePath

$buildOk = $false
if (Test-Path $gradlewBat) {
    Write-Info "Using Windows Gradle wrapper (gradlew.bat)."
    $ret = & cmd.exe /c "gradlew.bat assembleDebug" 2>&1 | Write-Output
    $buildOk = ($LASTEXITCODE -eq 0)
} elseif (Test-Path $gradlew) {
    Write-Info "Using Unix gradlew wrapper (sh)."
    try { & bash -c "chmod +x ./gradlew && ./gradlew assembleDebug" 2>&1 | Write-Output; $buildOk = ($LASTEXITCODE -eq 0) } catch { $buildOk = $false }
} else {
    Write-ErrorMsg "No gradlew wrapper found in $samplePath. Please run Gradle build manually. Exiting."; Set-Location -Path $scriptDir; exit 3
}

Set-Location -Path $repoRoot
if (-not $buildOk) {
    Write-ErrorMsg "Gradle build failed. Make sure Android SDK is installed and configured (ANDROID_SDK_ROOT, PATH includes platform-tools). Exiting."; exit 4
}

# Locate APK
$apkOutput = Get-ChildItem -Path (Join-Path $samplePath 'app') -Recurse -Filter '*-debug.apk' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1
if (-not $apkOutput) {
    Write-ErrorMsg "Could not find built debug APK in sample project. Search results empty."; exit 5
}
Write-Info "Found APK: $apkOutput"

# Ensure downloads and public directories exist
$downloadsDir = Join-Path (Get-Location) 'downloads'
$publicDir = Join-Path (Get-Location) 'public'
if (-not (Test-Path $downloadsDir)) { New-Item -ItemType Directory -Path $downloadsDir | Out-Null }
if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir | Out-Null }

$destApkDownloads = Join-Path $downloadsDir 'vhr-dashboard-demo.apk'
$destApkPublic = Join-Path $publicDir 'vhr-dashboard-demo.apk'
Copy-Item -Path $apkOutput -Destination $destApkDownloads -Force
Copy-Item -Path $apkOutput -Destination $destApkPublic -Force

# Recreate ZIP
$origReadme = Join-Path $downloadsDir 'demo_readme.txt'
if (-not (Test-Path $origReadme)) {
    "Ce fichier est un exemple de demo zip contenant un petit fichier README et un fichier APK placeholder pour les tests." | Out-File -FilePath $origReadme -Encoding UTF8
}
$zipPath = Join-Path $downloadsDir 'vhr-dashboard-demo.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Write-Info "Creating ZIP: $zipPath (containing APK and demo_readme.txt)"
Compress-Archive -Path $destApkDownloads, $origReadme -DestinationPath $zipPath -Force

# Validate APK using scripts/check-apk.js if present
$nodeCheckScript = Join-Path (Get-Location) 'scripts\check-apk.js'
if (Test-Path $nodeCheckScript) {
    Write-Info "Validating built APK using Node script: $nodeCheckScript"
    try { node $nodeCheckScript $destApkDownloads | Write-Output } catch { Write-Info "Node is not available or check-apk failed (ignored)" }
}

Write-Info "Demo APK built and copied to:"
Write-Host "  - $destApkDownloads" -ForegroundColor Green
Write-Host "  - $destApkPublic" -ForegroundColor Green
Write-Host "  - ZIP: $zipPath" -ForegroundColor Green
Write-Info "Next steps: start server (node server.js) and access /vhr-dashboard-demo.apk or the downloads folder to verify the APK is downloadable."

exit 0
