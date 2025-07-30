import express from 'express';
import jwt from 'jsonwebtoken';
import { getMessagesByChannel, getChannels } from '../database';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// 認証ミドルウェア
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'トークンが必要です' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: '無効なトークンです' });
  }
};

// チャンネル一覧の取得
router.get('/channels', authenticateToken, async (_req, res) => {
  try {
    const channels = await getChannels();
    res.json({ channels });
  } catch (error) {
    console.error('チャンネル取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// チャンネルのメッセージ取得
router.get('/channels/:channelId/messages', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const messages = await getMessagesByChannel(channelId, limit);
    
    // メッセージ形式を統一（新しい順に並べ替え）
    const formattedMessages = messages
      .map(msg => ({
        id: msg.id,
        content: msg.content,
        userId: msg.user_id,
        username: msg.username,
        channelId: msg.channel_id,
        timestamp: msg.created_at,
        avatar: msg.avatar
      }))
      .reverse(); // 古い順に並べ替え
    
    res.json(formattedMessages);
  } catch (error) {
    console.error('メッセージ取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

export default router; 