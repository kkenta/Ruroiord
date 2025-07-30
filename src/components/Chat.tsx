import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useChannels } from '../contexts/ChannelContext';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import VoiceChat from './VoiceChat';
import './Chat.css';

interface Message {
  id: string;
  content: string;
  userId: string;
  username: string;
  timestamp: string | Date;
  avatar?: string;
  channelId?: string;
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

const Chat: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const { channels, currentChannel, setCurrentChannel, isLoading } = useChannels();
  const [messagesByChannel, setMessagesByChannel] = useState<{ [channelId: string]: Message[] }>({});

  // 現在のチャンネルのメッセージを取得
  const messages = currentChannel ? messagesByChannel[currentChannel.id] || [] : [];

  useEffect(() => {
    if (!isAuthenticated) {
      // 認証されていない場合はログインページにリダイレクト
      window.location.href = '/login';
      return;
    }

    // currentChannelがnullの場合は処理をスキップ
    if (!currentChannel) return;

    // Socket.io接続が確立されたらチャンネルに参加
    if (socket && isConnected) {
      socket.emit('join-channel', currentChannel.id);
      
      // 新しいメッセージを受信
      const handleNewMessage = (message: Message) => {
        if (message.channelId && typeof message.channelId === 'string') {
          setMessagesByChannel(prev => {
            const channelMessages = prev[message.channelId as string] || [];
            // 重複チェック
            const exists = channelMessages.some((msg: Message) => msg.id === message.id);
            if (exists) return prev;
            return {
              ...prev,
              [message.channelId as string]: [...channelMessages, message]
            };
          });
        }
      };

      socket.on('new-message', handleNewMessage);

      // テキストチャンネルの場合のみメッセージ履歴を読み込む
      if (currentChannel.type === 'text') {
        loadMessageHistory();
      }

      // クリーンアップ関数
      return () => {
        socket.off('new-message', handleNewMessage);
      };
    }
  }, [isAuthenticated, socket, isConnected, currentChannel?.id, currentChannel?.type]);

  // メッセージ履歴を読み込む関数
  const loadMessageHistory = async () => {
    if (!currentChannel) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3001/api/messages/channels/${currentChannel.id}/messages?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const messages = await response.json();
        setMessagesByChannel(prev => ({
          ...prev,
          [currentChannel.id]: messages
        }));
      } else {
        console.error('メッセージ履歴の読み込みに失敗しました');
      }
    } catch (error) {
      console.error('メッセージ履歴読み込みエラー:', error);
    }
  };

  const handleSendMessage = (content: string) => {
    if (!content.trim() || !user || !socket || !currentChannel) return;

    // Socket.ioでメッセージを送信
    socket.emit('send-message', {
      content: content.trim(),
      channelId: currentChannel.id
    });
  };

  const handleChannelChange = (channel: Channel) => {
    if (socket && isConnected && currentChannel) {
      // 現在のチャンネルから退出
      socket.emit('leave-channel', currentChannel.id);
      // 新しいチャンネルに参加
      socket.emit('join-channel', channel.id);
    }
    setCurrentChannel(channel);
    // テキストチャンネルの場合のみ履歴を読み込む
    if (channel.type === 'text' && !messagesByChannel[channel.id]) {
      setTimeout(() => {
        loadMessageHistory();
      }, 100);
    }
  };

  if (!isAuthenticated || !user || isLoading) {
    return <div>読み込み中...</div>;
  }

  if (!currentChannel) {
    return <div>チャンネルが見つかりません</div>;
  }

  return (
    <div className="chat-container">
      <Sidebar
        user={user}
        channels={channels}
        currentChannel={currentChannel}
        onChannelChange={handleChannelChange}
        onLogout={logout}
      />
      <div className="chat-main">
                            <div className="chat-header">
                      <h2>
                        {currentChannel?.type === 'voice' ? '🔊' : '#'}
                        {currentChannel?.name}
                      </h2>
                    </div>
                            <div className="chat-content">
                      {currentChannel?.type === 'text' ? (
                        <>
                          <MessageList messages={messages} currentUser={user} />
                          <MessageInput onSendMessage={handleSendMessage} />
                        </>
                      ) : (
                        <div className="voice-channel-content">
                          <div className="voice-channel-info">
                            <h3>🔊 ボイスチャンネル</h3>
                            <p>このチャンネルでは音声での会話ができます。</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {currentChannel?.type === 'voice' && (
                      <VoiceChat channelId={currentChannel.id} />
                    )}
      </div>
    </div>
  );
};

export default Chat; 