import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, getUserByEmail, getUserById } from '../database';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// ユーザー登録
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // バリデーション
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'すべてのフィールドが必要です' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'パスワードは6文字以上である必要があります' });
    }

    // 既存ユーザーのチェック
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'このメールアドレスは既に使用されています' });
    }

    // パスワードのハッシュ化
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ユーザーの作成
    const userId = await createUser({
      username,
      email,
      password_hash: passwordHash,
    });

    // ユーザー情報の取得
    const user = await getUserById(userId);
    if (!user) {
      return res.status(500).json({ error: 'ユーザーの作成に失敗しました' });
    }

    // JWTトークンの生成
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // レスポンス（パスワードハッシュは除外）
    const { password_hash, ...userWithoutPassword } = user;
    
    res.status(201).json({
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('登録エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// ユーザーログイン
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // バリデーション
    if (!email || !password) {
      return res.status(400).json({ error: 'メールアドレスとパスワードが必要です' });
    }

    // ユーザーの検索
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: '無効なメールアドレスまたはパスワードです' });
    }

    // パスワードの検証
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '無効なメールアドレスまたはパスワードです' });
    }

    // JWTトークンの生成
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // レスポンス（パスワードハッシュは除外）
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('ログインエラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// ユーザー情報の取得
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'トークンが必要です' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await getUserById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'ユーザーが見つかりません' });
    }

    // レスポンス（パスワードハッシュは除外）
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({ user: userWithoutPassword });

  } catch (error) {
    console.error('認証エラー:', error);
    res.status(401).json({ error: '無効なトークンです' });
  }
});

export default router; 