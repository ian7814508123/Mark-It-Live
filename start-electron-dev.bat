@echo off
REM Markdown Live Previewer - Electron Development Launcher

echo.
echo ========================================
echo Markdown Live Previewer - Electron Dev
echo ========================================
echo.

REM 检查 Node 是否已安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Node.js 未找到，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查依赖是否已安装
if not exist node_modules (
    echo [信息] 正在安装依赖...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo [信息] 启动开发环境...
echo [信息] - Vite 开发服务器: http://localhost:5173
echo [信息] - Electron 应用窗口将在 5 秒后启动
echo [信息] - 按 Ctrl+C 停止
echo.

call npm run dev-electron

pause
