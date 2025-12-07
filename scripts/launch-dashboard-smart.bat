@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo VHR Dashboard Smart Launcher
echo ========================================
echo.

REM Project directory
set "PROJECT_DIR=C:\Users\peter\VR-Manager"

if not exist "!PROJECT_DIR!\package.json" (
  echo ERROR: Project not found at !PROJECT_DIR!
  pause
  exit /b 1
)

echo Project: !PROJECT_DIR!
echo.

REM Check if server is already running on port 3000
echo Checking if server is running...
netstat -ano | find ":3000" >nul

if errorlevel 1 (
  echo Port 3000 is FREE - Starting server...
  echo.
  
  REM Check Node.js
  node --version >nul 2>&1
  if errorlevel 1 (
    echo ERROR: Node.js not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
  )
  
  REM Start server in background
  cd /d "!PROJECT_DIR!"
  start "VHR Dashboard Server" cmd /k "npm start"
  
  echo.
  echo Server starting... Waiting 3 seconds for server to initialize...
  timeout /t 3 /nobreak
) else (
  echo Port 3000 is ALREADY IN USE - Server is running!
)

echo.
echo Opening dashboard in browser...
echo http://localhost:3000/vhr-dashboard-pro.html
echo.

REM Open dashboard in default browser
start http://localhost:3000/vhr-dashboard-pro.html

echo.
echo Dashboard opened! You can close this window.
echo.
timeout /t 2 /nobreak
