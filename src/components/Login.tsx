import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let success = false;
      
      if (isLogin) {
        success = await login(email, password);
      } else {
        success = await register(username, email, password);
      }

      if (success) {
        navigate('/');
      } else {
        setError(isLogin ? 'ログインに失敗しました。メールアドレスとパスワードを確認してください。' : '登録に失敗しました。入力内容を確認してください。');
      }
    } catch (err) {
      console.error('Login/Register error:', err);
      setError('ネットワークエラーが発生しました。サーバーが起動しているか確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="./icon-removebg.png" alt="Ruroiord" className="login-logo" />
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">ユーザー名</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required={!isLogin}
                placeholder="ユーザー名を入力"
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="メールアドレスを入力"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="パスワードを入力"
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? '処理中...' : (isLogin ? 'ログイン' : '登録')}
          </button>
        </form>
        
        <div className="login-footer">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="toggle-btn"
          >
            {isLogin ? 'アカウントを作成' : 'ログインに戻る'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login; 