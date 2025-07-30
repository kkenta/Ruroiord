import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'アクセストークンが必要です' });
  }

  const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
  
  jwt.verify(token, secret, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: '無効なトークンです' });
    }
    
    req.user = user;
    next();
  });
}; 