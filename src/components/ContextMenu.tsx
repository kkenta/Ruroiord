import React from 'react';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  isVisible: boolean;
  onClose: () => void;
  onAddChannel: () => void;
  onEditChannel?: () => void;
  onDeleteChannel?: () => void;
  channelName?: string;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  isVisible,
  onClose,
  onAddChannel,
  onEditChannel,
  onDeleteChannel,
  channelName
}) => {
  if (!isVisible) return null;

  const handleClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      <div className="context-menu-overlay" onClick={onClose} />
      <div 
        className="context-menu"
        style={{ 
          left: x, 
          top: y,
          transform: 'translate(-50%, -100%)'
        }}
      >
        {channelName ? (
          // チャンネル上での右クリック
          <>
            <div className="context-menu-header">
              <span className="channel-name">{channelName}</span>
            </div>
            <div className="context-menu-separator" />
            <button 
              className="context-menu-item"
              onClick={() => handleClick(onEditChannel!)}
            >
              ✏️ 名前を変更
            </button>
            <button 
              className="context-menu-item delete"
              onClick={() => handleClick(onDeleteChannel!)}
            >
              🗑️ チャンネルを削除
            </button>
          </>
        ) : (
          // 空の場所での右クリック
          <button 
            className="context-menu-item"
            onClick={() => handleClick(onAddChannel)}
          >
            ➕ チャンネルを追加
          </button>
        )}
      </div>
    </>
  );
};

export default ContextMenu; 