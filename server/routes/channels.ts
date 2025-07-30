import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { 
  getChannels, 
  createChannel, 
  updateChannel, 
  deleteChannel 
} from '../database';

const router = express.Router();

// チャンネル一覧を取得
router.get('/', authenticateToken, async (_req, res) => {
  try {
    const channels = await getChannels();
    res.json(channels);
  } catch (error) {
    console.error('チャンネル取得エラー:', error);
    res.status(500).json({ error: 'チャンネルの取得に失敗しました' });
  }
});

// チャンネルを作成
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, name, type } = req.body;
    
    if (!id || !name || !type) {
      return res.status(400).json({ error: '必要な情報が不足しています' });
    }
    
    if (!['text', 'voice'].includes(type)) {
      return res.status(400).json({ error: '無効なチャンネルタイプです' });
    }
    
    await createChannel({ id, name, type });
    res.status(201).json({ message: 'チャンネルが作成されました' });
  } catch (error) {
    console.error('チャンネル作成エラー:', error);
    res.status(500).json({ error: 'チャンネルの作成に失敗しました' });
  }
});

// チャンネルを更新
router.put('/:channelId', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { name, type } = req.body;
    
    if (!name && !type) {
      return res.status(400).json({ error: '更新する情報がありません' });
    }
    
    const updates: any = {};
    if (name) updates.name = name;
    if (type) {
      if (!['text', 'voice'].includes(type)) {
        return res.status(400).json({ error: '無効なチャンネルタイプです' });
      }
      updates.type = type;
    }
    
    await updateChannel(channelId, updates);
    res.json({ message: 'チャンネルが更新されました' });
  } catch (error) {
    console.error('チャンネル更新エラー:', error);
    res.status(500).json({ error: 'チャンネルの更新に失敗しました' });
  }
});

// チャンネルを削除
router.delete('/:channelId', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // デフォルトチャンネルは削除できない
    if (['general', 'random', 'announcements'].includes(channelId)) {
      return res.status(400).json({ error: 'デフォルトチャンネルは削除できません' });
    }
    
    await deleteChannel(channelId);
    res.json({ message: 'チャンネルが削除されました' });
  } catch (error) {
    console.error('チャンネル削除エラー:', error);
    res.status(500).json({ error: 'チャンネルの削除に失敗しました' });
  }
});

export default router; 