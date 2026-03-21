@echo off
REM Markdown Live Previewer - Electron Development Launcher

echo.
echo ========================================
echo Markdown Live Previewer - Electron Dev
echo ========================================
echo.

REM 檢查 Node 是否已安裝
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [錯誤] Node.js 未找到，請先安裝 Node.js
    echo 下載地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 檢查依賴是否已安裝
if not exist node_modules (
    echo [信息] 正在安裝依賴...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [錯誤] 依賴安裝失敗
        pause
        exit /b 1
    )
)

echo [信息] 啟動開發環境...
echo [信息] - Vite 開發伺服器: http://localhost:5173
echo [信息] - Electron 應用窗口將自動啟動
echo [信息] - DevTools 將自動打開以便除錯
echo [信息] - 按 Ctrl+C 停止
echo.

call npm run dev-electron-wait

pause
