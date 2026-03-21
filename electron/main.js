import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
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
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    // 優先嘗試連接 Vite 開發服務器
    const devServerUrl = 'http://localhost:5173';
    const prodUrl = `file://${path.join(__dirname, '../dist/index.html')}`;
    console.log('Loading URL:', isDev ? devServerUrl : prodUrl);
    mainWindow.loadURL(isDev ? devServerUrl : prodUrl);
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Create menu
    createMenu();
};
const createMenu = () => {
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
};
app.on('ready', createWindow);
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
