import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ContextMenu from './ContextMenu';
import './Sidebar.css';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

interface SidebarProps {
  user: User;
  channels: Channel[];
  currentChannel: Channel;
  onChannelChange: (channel: Channel) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  channels,
  currentChannel,
  onChannelChange,
  onLogout
}) => {
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    x: number;
    y: number;
    channel?: Channel;
  }>({
    isVisible: false,
    x: 0,
    y: 0
  });



  const sidebarRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 右クリックメニューを閉じる
  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  };

  // 右クリックイベントハンドラー
  const handleContextMenu = (e: React.MouseEvent, channel?: Channel) => {
    e.preventDefault();
    setContextMenu({
      isVisible: true,
      x: e.clientX,
      y: e.clientY,
      channel
    });
  };

  // チャンネル追加
  const handleAddChannel = () => {
    navigate('/manage-channels');
  };

  // チャンネル編集
  const handleEditChannel = () => {
    if (contextMenu.channel) {
      navigate('/manage-channels');
    }
  };

  // チャンネル削除
  const handleDeleteChannel = () => {
    if (contextMenu.channel && channels.length > 1) {
      // チャンネル削除はChannelContextで管理されるため、ここでは何もしない
      // 削除処理はChannelManagerで行う
      navigate('/manage-channels');
    }
  };

  // ボイスチャンネルクリック時の処理
  const handleChannelClick = (channel: Channel) => {
    // すべてのチャンネルで通常通りチャンネルを変更
    onChannelChange(channel);
  };

  // ESCキーでメニューを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="sidebar" ref={sidebarRef} onContextMenu={(e) => handleContextMenu(e)}>
      <div className="sidebar-header">
        <img src="./icon-removebg-text.png" alt="Ruroiord" className="sidebar-logo" />
      </div>
      
      <div className="sidebar-content">
        <div className="channels-section">
          <div className="channels-header">
            <h4>チャンネル</h4>
            <button 
              className="manage-channels-btn"
              onClick={() => navigate('/manage-channels')}
            >
              ⚙️
            </button>
          </div>
          <div className="channel-list">
            {channels.map((channel) => (
              <button
                key={channel.id}
                className={`channel-item ${currentChannel.id === channel.id ? 'active' : ''}`}
                onClick={() => handleChannelClick(channel)}
                onContextMenu={(e) => handleContextMenu(e, channel)}
              >
                <span className="channel-icon">
                  {channel.type === 'voice' ? '🔊' : '#'}
                </span>
                <span className="channel-name">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              <div className="avatar-placeholder">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="user-details">
            <span className="username">{user.username}</span>
            <span className="user-status">オンライン</span>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            🚪
          </button>
        </div>
      </div>

      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        isVisible={contextMenu.isVisible}
        onClose={closeContextMenu}
        onAddChannel={handleAddChannel}
        onEditChannel={contextMenu.channel ? handleEditChannel : undefined}
        onDeleteChannel={contextMenu.channel ? handleDeleteChannel : undefined}
        channelName={contextMenu.channel?.name}
      />


    </div>
  );
};

export default Sidebar; 