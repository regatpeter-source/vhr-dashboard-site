# Android APK Compilation Error - Windows Gradle Issue

## Problem Identified

**Error**: `java.io.IOException: La syntaxe du nom de fichier, de répertoire ou de volume est incorrecte`  
**Location**: `com.android.build.gradle.internal.SdkLocator.validateSdkPath`

The Android Gradle Plugin (7.0.4+) has a known issue with Windows file paths when:
1. Using certain combinations of Android Gradle Plugin + Kotlin versions
2. SDK paths contain certain character sequences
3. Long Windows paths (>260 characters without special handling)

## Symptoms
- Compilation stops immediately with syntax error
- No specific file name mentioned
- Error happens during dependency resolution, not compilation
- Gradle daemon becomes unresponsive

## Solutions Attempted
1. ✅ Installed Android SDK 32 with proper licenses
2. ✅ Installed Build-Tools 32.0.0
3. ✅ Set ANDROID_HOME and ANDROID_SDK_ROOT variables
4. ✅ Downgraded Android Gradle Plugin from 7.4.2 → 7.0.4
5. ✅ Moved SDK to shorter path (C:\S instead of C:\Android\SDK)
6. ✅ Cleared all Gradle caches
7. ❌ Still failing with path syntax error

##  Root Cause
The Android Gradle Plugin's SdkLocator class validates SDK paths too strictly for Windows paths. The error message is vague and doesn't identify the actual problematic path.

## Workaround Options

### Option 1: Use Docker/Linux Build Environment
Instead of compiling on Windows, use:
- Docker container with Android SDK
- Linux VM with proper Android setup
- CI/CD pipeline (GitHub Actions, etc.)

### Option 2: Pre-built APK
Use the existing demo APK that's already compiled and available in `/dist/demo/`

### Option 3: Lower Android Plugin Version Further
Try Android Gradle 6.x (much older, might have different issues)

## Recommendation

Since the build chain is broken on Windows due to a deep Android Gradle issue, I recommend:

1. **For Development**: Use the pre-built APK in `/dist/demo/vhr-dashboard-demo.apk`
2. **For Production**: Set up Docker-based compilation or move to a Linux CI/CD system
3. **Alternative**: Use Android Studio directly on Windows (might work better than Gradle CLI)

## Files Modified
- `gradle/libs.versions.toml` - Downgraded plugins
- `build.gradle.kts` - Updated Kotlin compiler version
- `local.properties` - Moved SDK to shorter path
- `tts-receiver-app/.gradle` - Cleared all caches

## Next Steps
Would you like me to:
1. Create a Docker Dockerfile for compiling APKs on Linux?
2. Set up GitHub Actions workflow for automated APK builds?
3. Use the pre-built demo APK and focus on other features?
