import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});

declare global {
  interface Window {
    electron: {
      getAppVersion: () => Promise<string>;
    };
  }
}
