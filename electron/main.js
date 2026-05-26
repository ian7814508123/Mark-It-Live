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
<<<<<<< HEAD
    mainWindow = new electron_1.BrowserWindow({
=======
    mainWindow = new BrowserWindow({
>>>>>>> 3eebec9c9e0e8f6ad7a99899947392b5c9ef4d19
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        icon: path.join(__dirname, '../public/favicon.ico'),
        webPreferences: {
<<<<<<< HEAD
            preload: path_1.default.join(__dirname, 'preload.js'),
=======
            preload: path.join(__dirname, 'preload.js'),
>>>>>>> 3eebec9c9e0e8f6ad7a99899947392b5c9ef4d19
            nodeIntegration: false,
            contextIsolation: true,
            plugins: true,
        },
    });
<<<<<<< HEAD

=======
>>>>>>> 3eebec9c9e0e8f6ad7a99899947392b5c9ef4d19
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
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
<<<<<<< HEAD
                        electron_1.app.quit();
=======
                        app.quit();
>>>>>>> 3eebec9c9e0e8f6ad7a99899947392b5c9ef4d19
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
<<<<<<< HEAD
    const menu = electron_1.Menu.buildFromTemplate(template);
    electron_1.Menu.setApplicationMenu(menu);
};
electron_1.app.on('ready', createWindow);
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
=======
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
>>>>>>> 3eebec9c9e0e8f6ad7a99899947392b5c9ef4d19
    if (mainWindow === null) {
        createWindow();
    }
});
// IPC handlers
<<<<<<< HEAD
electron_1.ipcMain.handle('get-app-version', () => {
    return electron_1.app.getVersion();
=======
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
>>>>>>> 3eebec9c9e0e8f6ad7a99899947392b5c9ef4d19
});
ipcMain.handle('print', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.webContents.print({ silent: false, printBackground: true });
    }
});
