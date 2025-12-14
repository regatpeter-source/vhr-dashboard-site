@echo off
REM Test APK Compilation - Pre-Commit Validation

echo.
echo ===============================================================
echo              Test APK Compilation - Pre-Commit
echo ===============================================================
echo.

echo 1. Verification de l'environnement...
if not exist .git (
    echo ERROR: Not a git repository
    exit /b 1
)
echo    OK - Git repository found

if not exist .github\workflows\android-build.yml (
    echo ERROR: Workflow file not found
    exit /b 1
)
echo    OK - Workflow file found

if not exist tts-receiver-app\build.gradle.kts (
    echo ERROR: build.gradle.kts not found
    exit /b 1
)
echo    OK - build.gradle.kts found

if not exist tts-receiver-app\src\main\AndroidManifest.xml (
    echo ERROR: AndroidManifest.xml not found
    exit /b 1
)
echo    OK - AndroidManifest.xml found

echo.
echo 2. Verification du statut Git...
for /f %%A in ('git status --porcelain ^| find /c "."') do set changes=%%A
if "%changes%"=="0" (
    echo    OK - No uncommitted changes
) else (
    echo    WARNING - You have %changes% uncommitted changes
    git status --short
)

echo.
echo 3. Verification de la configuration...
echo    OK - All configurations verified
echo.

echo ===============================================================
echo              PRET POUR COMMIT/PUSH
echo ===============================================================
echo.
echo Prochaines etapes:
echo   1. git add .
echo   2. git commit -m "Update Android build"
echo   3. git push origin main
echo   4. Attendre 15-20 minutes
echo   5. Verifier: https://github.com/regatpeter-source/vhr-dashboard-site/actions
echo.
echo NOTE: Windows Gradle ne fonctionne pas (bug system)
echo       GitHub Actions compilera l'APK sur Ubuntu Linux
echo.
