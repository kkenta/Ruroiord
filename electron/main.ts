import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
      icon: path.join(__dirname, '../icononly-removebg.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  });

  // 開発環境ではローカルサーバーを使用
  if (process.env.NODE_ENV === 'development') {
    // Viteサーバーのポートを動的に検出
    const net = require('net');
    const http = require('http');
    
    function checkViteServer(port: number): Promise<boolean> {
      return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}`, (res: any) => {
          resolve(res.statusCode === 200);
        });
        
        req.on('error', () => {
          resolve(false);
        });
        
        req.setTimeout(1000, () => {
          req.destroy();
          resolve(false);
        });
      });
    }
    
    async function findVitePort(): Promise<number> {
      // 一般的なViteポートを順番にチェック
      const ports = [3000, 3001, 3002, 3003, 5173, 4173];
      
      for (const port of ports) {
        console.log(`ポート ${port} をチェック中...`);
        const isAvailable = await checkViteServer(port);
        if (isAvailable) {
          console.log(`Viteサーバーをポート ${port} で発見`);
          return port;
        }
      }
      
      throw new Error('Viteサーバーが見つかりません');
    }
    
    // Viteサーバーのポートを検出して接続
    findVitePort().then((port) => {
      console.log(`開発モード: http://localhost:${port} に接続中...`);
      mainWindow?.loadURL(`http://localhost:${port}`);
      mainWindow?.webContents.openDevTools();
    }).catch((error) => {
      console.error('Viteサーバーに接続できません:', error.message);
      // フォールバック: 本番モードで起動
      console.log('本番モード: dist/index.html を読み込み中...');
      mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    console.log('本番モード: dist/index.html を読み込み中...');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC通信の設定
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
}); 
