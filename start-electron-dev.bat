@echo off
REM Markdown Live Previewer - Electron Development Launcher

echo.
echo ========================================
echo Markdown Live Previewer - Electron Dev
echo ========================================
echo.

REM 檢查 Node.js 是否已安裝
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [錯誤] 找不到 Node.js，請先安裝 Node.js。
    echo 下載地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 檢查依賴是否已安裝
if not exist node_modules (
    echo [訊息] 正在安裝相依套件...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [錯誤] 安裝相依套件失敗。
        pause
        exit /b 1
    )
)

echo [訊息] 正在啟動開發環境...
echo [訊息] - Vite 開發伺服器: http://localhost:5173
echo [訊息] - Electron 應用程式視窗將自動啟動
echo [訊息] - 按 Ctrl+C 結束運作
echo.

call npm run dev-electron-wait

pause
