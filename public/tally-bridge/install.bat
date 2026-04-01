@echo off
echo ============================================
echo   Tally Bridge - Setup
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo   https://nodejs.org/
    echo.
    echo After installing Node.js, run this script again.
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

:: Install dependencies
echo Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo Failed to install dependencies.
    pause
    exit /b 1
)
echo.

:: Build executable
echo Building tally-bridge.exe...
call npx pkg server.js --targets node18-win-x64 --output tally-bridge.exe
if %ERRORLEVEL% neq 0 (
    echo.
    echo Build failed. You can still run the bridge using:
    echo   node server.js
    echo.
) else (
    echo.
    echo ============================================
    echo   Build complete!
    echo   Run tally-bridge.exe to start the bridge.
    echo ============================================
)

echo.
pause
