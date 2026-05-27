import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
// 定義 __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 簡單的 development 檢查 - 優先檢查 process.env
const isDev = !app.isPackaged ||
    process.env.NODE_ENV === 'development' ||
    process.env.VITE_DEV_SERVER_URL !== undefined;
console.log('[Electron] isDev:', isDev);
console.log('[Electron] app.isPackaged:', app.isPackaged);
console.log('[Electron] NODE_ENV:', process.env.NODE_ENV);
let mainWindow = null;
const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, '../public/favicon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            plugins: true,
        },
    });
    if (isDev) {
        const devServerUrl = 'http://localhost:5173';
        console.log('Loading URL:', devServerUrl);
        mainWindow.loadURL(devServerUrl);
        mainWindow.webContents.openDevTools();
    }
    else {
        const prodPath = path.join(__dirname, '../dist/index.html');
        console.log('Loading file:', prodPath);
        mainWindow.loadFile(prodPath);
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Create menu
    createMenu();
};
const createMenu = () => {
    // 1. 開發環境：保留完整的選單以便除錯
    if (isDev) {
        const template = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Exit',
                        accelerator: 'CmdOrCtrl+Q',
                        click: () => {
                            app.quit();
                        },
                    },
                ],
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectAll' },
                ],
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                ],
            },
        ];
        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
        return;
    }
    // 2. 生產環境：
    if (process.platform === 'darwin') {
        // macOS 選單顯示在螢幕頂端保留基本選單與 Edit 選單
        const template = [
            {
                label: app.name,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services' },
                    { type: 'separator' },
                    { role: 'hide' },
                    { role: 'hideOthers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit' },
                ],
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectAll' },
                ],
            },
        ];
        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }
    else {
        // Windows & Linux：完全移除全域選單，快捷鍵由 Chromium 核心自動處理。
        Menu.setApplicationMenu(null);
    }
};
const setupAutoUpdater = () => {
    if (isDev) {
        console.log('[Electron] 開發模式下跳過自動更新檢查。');
        return;
    }
    // 配置 autoUpdater 自動下載更新
    autoUpdater.autoDownload = true;
    // 監聽更新下載完成事件
    autoUpdater.on('update-downloaded', (info) => {
        dialog.showMessageBox({
            type: 'info',
            title: '發現新版本',
            message: `新版本 ${info.version} 已經下載完成，是否立即重啟安裝更新？`,
            buttons: ['是', '稍後'],
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });
    // 執行檢查
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.error('[Electron] 檢查更新出錯:', err);
    });
};
app.on('ready', () => {
    createWindow();
    setupAutoUpdater();
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
// IPC handlers
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});
ipcMain.handle('print', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.webContents.print({ silent: false, printBackground: true });
    }
});
