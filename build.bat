@echo off
setlocal enabledelayedexpansion
:: Set UTF-8 encoding
chcp 65001 >nul

echo ========================================
echo   Markdown Live Previewer Build Tool
echo ========================================
echo.

:: 1. Check Node.js
echo [1/4] Checking environment...
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found.
    pause
    exit /b 1
)

:: 2. Dependencies
echo [2/4] Checking node_modules...
if not exist "node_modules\cross-env" (
    echo [INFO] Incomplete dependencies, installing...
    call npm install
)
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

:: 3. Clean
echo [3/4] Cleaning build folder...
if exist dist (
    rmdir /s /q dist >nul 2>nul
)

:: 4. Build
echo [4/4] Starting build process (npm run electron-build)...
echo.
call npm run electron-build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed! Please check messages above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build Finished!
echo ========================================
if exist dist\*.exe (
    echo Installers found in dist/
    dir dist\*.exe /b
) else (
    echo Build completed, check dist/ folder.
)
echo.
pause
