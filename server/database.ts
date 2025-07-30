import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./ruroiord.db');

// Promise化
const dbRun = (sql: string, params?: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql: string, params?: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql: string, params?: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  content: string;
  user_id: string;
  channel_id: string;
  created_at: string;
  username?: string;
  avatar?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  created_at: string;
}

export async function initDatabase() {
  // ユーザーテーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // チャンネルテーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('text', 'voice')) DEFAULT 'text',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // メッセージテーブル
  await dbRun(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (channel_id) REFERENCES channels (id)
    )
  `);

  // デフォルトチャンネルの作成
  const defaultChannels = [
    { id: 'general', name: '一般', type: 'text' },
    { id: 'random', name: '雑談', type: 'text' },
    { id: 'announcements', name: 'お知らせ', type: 'text' }
  ];

  for (const channel of defaultChannels) {
    await dbRun(`
      INSERT OR IGNORE INTO channels (id, name, type)
      VALUES (?, ?, ?)
    `, [channel.id, channel.name, channel.type]);
  }

  console.log('データベーステーブルが初期化されました');
}

export async function createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await dbRun(`
    INSERT INTO users (id, username, email, password_hash, avatar)
    VALUES (?, ?, ?, ?, ?)
  `, [id, user.username, user.email, user.password_hash, user.avatar]);

  return id;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
  return user as User | null;
}

export async function getUserById(id: string): Promise<User | null> {
  const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
  return user as User | null;
}

export async function createMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const id = `msg_${timestamp}_${random}`;
  
  await dbRun(`
    INSERT INTO messages (id, content, user_id, channel_id)
    VALUES (?, ?, ?, ?)
  `, [id, message.content, message.user_id, message.channel_id]);

  return id;
}

export async function getMessagesByChannel(channelId: string, limit: number = 50): Promise<Message[]> {
  const messages = await dbAll(`
    SELECT m.*, u.username, u.avatar
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.channel_id = ?
    ORDER BY m.created_at DESC
    LIMIT ?
  `, [channelId, limit]);
  return messages as Message[];
}

export async function getChannels(): Promise<Channel[]> {
  const channels = await dbAll('SELECT * FROM channels ORDER BY created_at ASC');
  return channels as Channel[];
}

export async function createChannel(channel: Omit<Channel, 'created_at'>): Promise<string> {
  await dbRun(`
    INSERT INTO channels (id, name, type)
    VALUES (?, ?, ?)
  `, [channel.id, channel.name, channel.type]);
  
  return channel.id;
}

export async function updateChannel(channelId: string, updates: Partial<Omit<Channel, 'id' | 'created_at'>>): Promise<void> {
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  
  await dbRun(`
    UPDATE channels 
    SET ${setClause}
    WHERE id = ?
  `, [...values, channelId]);
}

export async function deleteChannel(channelId: string): Promise<void> {
  // まず、そのチャンネルのメッセージを削除
  await dbRun('DELETE FROM messages WHERE channel_id = ?', [channelId]);
  
  // 次に、チャンネルを削除
  await dbRun('DELETE FROM channels WHERE id = ?', [channelId]);
}

export { db }; 