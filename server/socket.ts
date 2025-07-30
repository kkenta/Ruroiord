import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createMessage, getUserById } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export function setupSocketHandlers(io: Server) {
  // 認証ミドルウェア
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('認証が必要です'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      const user = await getUserById(decoded.userId);
      
      if (!user) {
        return next(new Error('ユーザーが見つかりません'));
      }

      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch (error) {
      next(new Error('無効なトークンです'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`ユーザー ${socket.username} が接続しました`);

    // チャンネルに参加
    socket.on('join-channel', (channelId: string) => {
      socket.join(channelId);
      console.log(`ユーザー ${socket.username} がチャンネル ${channelId} に参加しました`);
      
      // チャンネル内の他のユーザーに通知
      socket.to(channelId).emit('user-joined', {
        userId: socket.userId,
        username: socket.username,
        channelId
      });
    });

    // チャンネルから退出
    socket.on('leave-channel', (channelId: string) => {
      socket.leave(channelId);
      console.log(`ユーザー ${socket.username} がチャンネル ${channelId} から退出しました`);
      
      // チャンネル内の他のユーザーに通知
      socket.to(channelId).emit('user-left', {
        userId: socket.userId,
        username: socket.username,
        channelId
      });
    });

    // メッセージ送信
    socket.on('send-message', async (data: { content: string; channelId: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: '認証が必要です' });
          return;
        }

        const { content, channelId } = data;

        if (!content.trim()) {
          socket.emit('error', { message: 'メッセージ内容が必要です' });
          return;
        }

        // データベースにメッセージを保存
        const messageId = await createMessage({
          content: content.trim(),
          user_id: socket.userId,
          channel_id: channelId,
        });

        // チャンネル内の全ユーザーにメッセージを送信
        io.to(channelId).emit('new-message', {
          id: messageId,
          content: content.trim(),
          userId: socket.userId,
          username: socket.username,
          channelId,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('メッセージ送信エラー:', error);
        socket.emit('error', { message: 'メッセージの送信に失敗しました' });
      }
    });

    // タイピング状態の送信
    socket.on('typing-start', (channelId: string) => {
      socket.to(channelId).emit('user-typing', {
        userId: socket.userId,
        username: socket.username,
        channelId,
        isTyping: true
      });
    });

    socket.on('typing-stop', (channelId: string) => {
      socket.to(channelId).emit('user-typing', {
        userId: socket.userId,
        username: socket.username,
        channelId,
        isTyping: false
      });
    });

    // 接続切断
    socket.on('disconnect', () => {
      console.log(`ユーザー ${socket.username} が切断しました`);
    });
  });
} 