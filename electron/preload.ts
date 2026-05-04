import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  print: () => ipcRenderer.invoke('print'),
});

declare global {
  interface Window {
    electron: {
      getAppVersion: () => Promise<string>;
      print: () => Promise<void>;
    };
  }
}
