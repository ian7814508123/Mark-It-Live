@echo off
REM Markdown Live Previewer - Electron Build Installer

echo.
echo ========================================
echo Markdown Live Previewer - Build Installer
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

echo [信息] 檢查依賴...
if not exist node_modules (
    echo [信息] 正在安裝依賴...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [錯誤] 依賴安裝失敗
        pause
        exit /b 1
    )
)

echo [信息] 清理舊構建檔案...
if exist dist (
    rmdir /s /q dist >nul 2>nul
)

echo [信息] 開始構建 Electron 應用...
echo [信息] - 步驟 1: Vite 前端構建
echo [信息] - 步驟 2: TypeScript 編譯
echo [信息] - 步驟 3: electron-builder 打包
echo.

call npm run electron-build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [錯誤] 構建失敗！
    echo 常見問題:
    echo - 確保已將 favicon.svg 轉換為 favicon.ico 並放在 public/ 目錄
    echo - 確保 Node.js 版本 >= 22
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo 構建完成！
echo ========================================
echo.
echo 輸出檔案位置: dist/
echo.
echo 檔案內容:
dir dist /b
echo.
echo 生成的安裝程式:
for /r dist %%F in (*.exe) do echo   - %%~nxF
echo.
pause
