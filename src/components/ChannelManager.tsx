import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChannels } from '../contexts/ChannelContext';
import './ChannelManager.css';

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

const ChannelManager: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { channels, currentChannel, addChannel, updateChannel, deleteChannel } = useChannels();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, navigate]);

  const handleAddChannel = async () => {
    if (!newChannelName.trim()) return;
    
    const newChannel: Channel = {
      id: `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newChannelName.trim(),
      type: newChannelType
    };
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('https://localhost:3001/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newChannel)
      });

      if (response.ok) {
        addChannel(newChannel);
        setNewChannelName('');
        setNewChannelType('text');
        setIsModalOpen(false);
      } else {
        console.error('チャンネル作成に失敗しました');
      }
    } catch (error) {
      console.error('チャンネル作成エラー:', error);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`https://localhost:3001/api/channels/${channelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        deleteChannel(channelId);
      } else {
        console.error('チャンネル削除に失敗しました');
      }
    } catch (error) {
      console.error('チャンネル削除エラー:', error);
    }
  };

  const startEditChannel = (channel: Channel) => {
    setEditingChannel(channel);
    setNewChannelName(channel.name);
    setNewChannelType(channel.type);
    setIsModalOpen(true);
  };

  const saveEditChannel = async () => {
    if (!editingChannel || !newChannelName.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`https://localhost:3001/api/channels/${editingChannel.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newChannelName.trim(),
          type: newChannelType
        })
      });

      if (response.ok) {
        updateChannel(editingChannel.id, {
          name: newChannelName.trim(),
          type: newChannelType
        });
        
        setEditingChannel(null);
        setNewChannelName('');
        setNewChannelType('text');
        setIsModalOpen(false);
      } else {
        console.error('チャンネル更新に失敗しました');
      }
    } catch (error) {
      console.error('チャンネル更新エラー:', error);
    }
  };

  const cancelEdit = () => {
    setEditingChannel(null);
    setNewChannelName('');
    setNewChannelType('text');
    setIsModalOpen(false);
  };

  if (!isAuthenticated || !user) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="channel-manager-page">
      <div className="channel-manager">
        <div className="channel-manager-header">
          <h3>チャンネル管理</h3>
          <div className="header-actions">
            <button 
              className="add-channel-btn"
              onClick={() => setIsModalOpen(true)}
            >
              ＋ チャンネル追加
            </button>
            <button 
              className="back-btn"
              onClick={() => navigate('/')}
            >
              ← 戻る
            </button>
          </div>
        </div>

      <div className="channel-list">
        {channels.map((channel) => (
          <div key={channel.id} className="channel-item">
            <div className="channel-info">
              <span className="channel-icon">
                {channel.type === 'voice' ? '🔊' : '#'}
              </span>
              <span className="channel-name">{channel.name}</span>
              <span className="channel-type">
                {channel.type === 'voice' ? 'ボイス' : 'テキスト'}
              </span>
            </div>
            <div className="channel-actions">
              <button 
                className="edit-btn"
                onClick={() => startEditChannel(channel)}
              >
                編集
              </button>
              <button 
                className="delete-btn"
                onClick={() => handleDeleteChannel(channel.id)}
                disabled={channels.length <= 1}
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingChannel ? 'チャンネル編集' : 'チャンネル追加'}</h3>
            <div className="form-group">
              <label>チャンネル名</label>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="チャンネル名を入力"
              />
            </div>
            <div className="form-group">
              <label>チャンネルタイプ</label>
              <select
                value={newChannelType}
                onChange={(e) => setNewChannelType(e.target.value as 'text' | 'voice')}
              >
                <option value="text">テキストチャンネル</option>
                <option value="voice">ボイスチャンネル</option>
              </select>
            </div>
            <div className="modal-actions">
              <button 
                className="save-btn"
                onClick={editingChannel ? saveEditChannel : handleAddChannel}
                disabled={!newChannelName.trim()}
              >
                {editingChannel ? '保存' : '追加'}
              </button>
              <button className="cancel-btn" onClick={cancelEdit}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default ChannelManager; 