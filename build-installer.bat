@echo off
REM Markdown Live Previewer - Electron Build Installer

echo.
echo ========================================
echo Markdown Live Previewer - Build Installer
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

echo [信息] 检查依赖...
if not exist node_modules (
    echo [信息] 正在安装依赖...
    call npm install
)

echo [信息] 清理旧构建文件...
if exist dist (
    rmdir /s /q dist >nul 2>nul
)
if exist dist-electron (
    rmdir /s /q dist-electron >nul 2>nul
)

echo [信息] 正在构建 Vite 应用...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Vite 构建失败
    pause
    exit /b 1
)

echo [信息] 正在打包 Electron 应用...
call npm run electron-dist
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Electron 打包失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo 构建完成！
echo ========================================
echo.
echo 输出文件位置: dist/
echo.
echo 文件内容：
dir dist /b
echo.
pause
