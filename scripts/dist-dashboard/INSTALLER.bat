@echo off
title VHR Dashboard - Installation
echo ========================================
echo   VHR Dashboard - Installation
echo ========================================
echo.
echo Installation des dependances...
echo Cela peut prendre quelques minutes...
echo.

npm install

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Installation terminee avec succes!
    echo.
    echo Vous pouvez maintenant lancer:
    echo   "VHR Dashboard.bat"
    echo ========================================
) else (
    echo.
    echo [ERREUR] L'installation a echoue!
    echo Verifiez que Node.js est bien installe.
)

echo.
pause
