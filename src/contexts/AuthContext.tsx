import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSocket } from './SocketContext';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, email: string, password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const socketContext = useSocket();
  const { connect: connectSocket, disconnect: disconnectSocket } = socketContext;

  useEffect(() => {
    // ローカルストレージからユーザー情報を復元
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    console.log('🔐 AuthContext初期化 - User:', savedUser ? '存在' : 'なし', 'Token:', savedToken ? '存在' : 'なし');
    
    if (savedUser && savedToken) {
      const userData = JSON.parse(savedUser);
      console.log('✅ 認証情報を復元:', userData);
      setUser(userData);
      setIsAuthenticated(true);
      // Socket.io接続を復元（少し遅延させる）
      setTimeout(() => {
        connectSocket(savedToken);
      }, 100);
    } else if (savedUser && !savedToken) {
      // ユーザー情報はあるがトークンがない場合（異常状態）
      console.log('⚠️ 異常状態を検出: ユーザー情報はあるがトークンがない');
      console.log('🔧 認証情報をクリアします');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
    } else {
      console.log('❌ 認証情報が見つかりません');
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 ログイン試行:', email);
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ ログイン成功:', userData.user);
        console.log('🔑 トークン保存:', userData.token ? '成功' : '失敗');
        setUser(userData.user);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userData.user));
        localStorage.setItem('token', userData.token);
        // Socket.io接続を確立
        connectSocket(userData.token);
        
        // チャンネル読み込みをトリガー
        setTimeout(() => {
          console.log('🔄 ログイン後、チャンネル読み込みをトリガー');
          if ((window as any).forceReloadChannels) {
            (window as any).forceReloadChannels();
          }
        }, 500);
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('❌ ログイン失敗:', errorData);
        return false;
      }
    } catch (error) {
      console.error('💥 ログインエラー:', error);
      return false;
    }
  };

  const logout = () => {
    console.log('🚪 ログアウト実行');
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // Socket.io接続を切断
    disconnectSocket();
  };

  // 開発者用：認証状態を確認する関数
  const checkAuthStatus = () => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    console.log('🔍 認証状態確認:');
    console.log('  - User:', savedUser ? JSON.parse(savedUser) : 'なし');
    console.log('  - Token:', savedToken ? '存在' : 'なし');
    console.log('  - isAuthenticated:', isAuthenticated);
    console.log('  - Current User:', user);
  };

  // 開発者用：認証状態を修正する関数
  const fixAuthState = () => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && !savedToken) {
      console.log('🔧 認証状態を修正中...');
      console.log('❌ トークンが存在しないため、認証情報をクリアします');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
      console.log('✅ 認証情報をクリアしました。ページをリロードしてください。');
    } else if (savedUser && savedToken) {
      console.log('✅ 認証情報は正常です');
      const userData = JSON.parse(savedUser);
      setUser(userData);
      setIsAuthenticated(true);
    } else {
      console.log('❌ 認証情報が不完全です');
    }
  };

  // 開発者用関数をグローバルに公開
  useEffect(() => {
    (window as any).checkAuthStatus = checkAuthStatus;
    (window as any).fixAuthState = fixAuthState;
    
    return () => {
      delete (window as any).checkAuthStatus;
      delete (window as any).fixAuthState;
    };
  }, [user, isAuthenticated]);

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userData.user));
        localStorage.setItem('token', userData.token);
        // Socket.io接続を確立
        connectSocket(userData.token);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Register failed:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 