import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import messageRoutes from './routes/messages';
import channelRoutes from './routes/channels';
import { setupSocketHandlers } from './socket';
import { setupWebRTCHandlers } from './webrtc';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 利用可能なポートを自動で選択する関数
function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// ルート
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/channels', channelRoutes);

// ヘルスチェック
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io ハンドラーの設定
setupSocketHandlers(io);
setupWebRTCHandlers(io);

// データベース初期化とサーバー起動
async function startServer() {
  try {
    await initDatabase();
    console.log('データベースが初期化されました');
    
    // 利用可能なポートを自動で選択
    const availablePort = await findAvailablePort(parseInt(PORT.toString()));
    console.log(`ポート ${PORT} が使用中のため、ポート ${availablePort} を使用します`);
    
    server.listen(availablePort, () => {
      console.log(`サーバーがポート ${availablePort} で起動しました`);
      console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
      
      // ポート情報をファイルに保存（Electronが読み取るため）
      const fs = require('fs');
      fs.writeFileSync('./server-port.txt', availablePort.toString());
    });
  } catch (error) {
    console.error('サーバー起動エラー:', error);
    process.exit(1);
  }
}

startServer(); 
