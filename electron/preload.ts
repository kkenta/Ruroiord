import { contextBridge, ipcRenderer } from 'electron';

// レンダラープロセスで使用可能なAPIを定義
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  // 必要に応じて他のAPIを追加
});

// TypeScriptの型定義
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
    };
  }
} 