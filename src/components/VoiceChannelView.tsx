import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import VoiceChat from './VoiceChat';

interface VoiceUser {
  userId: string;
  username: string;
  socketId: string;
  isMuted?: boolean;
  isDeafened?: boolean;
  avatar?: string;
  isScreenSharing?: boolean;
}

interface VoiceChannelViewProps {
  channelId: string;
  channelName: string;
}

const VoiceChannelView: React.FC<VoiceChannelViewProps> = ({ 
  channelId, 
  channelName 
}) => {
  const [participants, setParticipants] = useState<VoiceUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [screenShareUser, setScreenShareUser] = useState<VoiceUser | null>(null);
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    setIsLoading(true);
    setParticipants([]); // リストをリセット
    
    // 参加者リストを要求
    const requestParticipants = () => {
      socket.emit('get-voice-participants', { channelId });
    };
    
    // 初回リクエスト
    requestParticipants();
    
    // 0.5秒ごとにポーリング
    pollingIntervalRef.current = setInterval(requestParticipants, 500);
    
    // 参加者リストを受信
    const handleParticipantsList = (users: VoiceUser[]) => {
      console.log('📋 ボイスチャンネル参加者リスト受信:', users);
      setParticipants(users);
      setIsLoading(false);
    };

    // ユーザー参加イベント
    const handleUserJoined = (data: VoiceUser) => {
      console.log('👤 ユーザー参加:', data.username, data);
      setParticipants(prev => {
        // 既に存在する場合は更新、存在しない場合は追加
        const exists = prev.some(p => p.socketId === data.socketId);
        if (exists) {
          const updated = prev.map(p => p.socketId === data.socketId ? { ...p, ...data } : p);
          console.log('🔄 参加者リスト更新（既存ユーザー）:', updated);
          return updated;
        } else {
          const updated = [...prev, data];
          console.log('➕ 参加者リスト更新（新規ユーザー）:', updated);
          return updated;
        }
      });
    };

    // ユーザー退出イベント
    const handleUserLeft = (data: VoiceUser) => {
      console.log('👋 ユーザー退出:', data.username, data);
      setParticipants(prev => {
        const updated = prev.filter(p => p.socketId !== data.socketId);
        console.log('➖ 参加者リスト更新（ユーザー退出）:', updated);
        return updated;
      });
    };

    // ユーザー状態更新イベント
    const handleUserUpdate = (data: VoiceUser) => {
      console.log('🔄 ユーザー状態更新:', data.username);
      setParticipants(prev => prev.map(p => 
        p.socketId === data.socketId 
          ? { ...p, isMuted: data.isMuted, isDeafened: data.isDeafened, isScreenSharing: data.isScreenSharing }
          : p
      ));
    };

    // 画面共有開始イベント
    const handleScreenShareStart = (data: { userId: string; username: string; socketId: string; stream: MediaStream }) => {
      console.log('🖥️ 画面共有開始:', data.username);
      setScreenShareStream(data.stream);
      setScreenShareUser({
        userId: data.userId,
        username: data.username,
        socketId: data.socketId,
        isScreenSharing: true
      });
    };

    // 画面共有停止イベント
    const handleScreenShareStop = (data: { userId: string; socketId: string }) => {
      console.log('⏹️ 画面共有停止:', data.userId);
      setScreenShareStream(null);
      setScreenShareUser(null);
    };

    socket.on('voice-participants-list', handleParticipantsList);
    socket.on('user-joined-voice', handleUserJoined);
    socket.on('user-left-voice', handleUserLeft);
    socket.on('voice-user-update', handleUserUpdate);
    socket.on('screen-share-start', handleScreenShareStart);
    socket.on('screen-share-stop', handleScreenShareStop);

    return () => {
      // ポーリングを停止
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      socket.off('voice-participants-list', handleParticipantsList);
      socket.off('user-joined-voice', handleUserJoined);
      socket.off('user-left-voice', handleUserLeft);
      socket.off('voice-user-update', handleUserUpdate);
      socket.off('screen-share-start', handleScreenShareStart);
      socket.off('screen-share-stop', handleScreenShareStop);
    };
  }, [socket, isConnected, channelId]);

  // 画面共有ストリームの表示
  useEffect(() => {
    if (screenShareStream && screenShareVideoRef.current) {
      screenShareVideoRef.current.srcObject = screenShareStream;
      screenShareVideoRef.current.play().catch(error => {
        console.error('画面共有ビデオ再生エラー:', error);
      });
    }
  }, [screenShareStream]);

  // 参加者をグリッド表示用に整理（最大4列）
  const getGridLayout = () => {
    const maxCols = 4;
    const rows = Math.ceil(participants.length / maxCols);
    return { rows, cols: Math.min(participants.length, maxCols) };
  };

  const { rows, cols } = getGridLayout();

  return (
    <div className="voice-channel-view">
      <div className="voice-channel-header">
        <h2>🔊 {channelName}</h2>
        <div className="participant-count">
          {participants.length}人が参加中
          <span className="polling-status">🔄 リアルタイム更新中</span>
        </div>
      </div>

      <div className="voice-channel-content">
        {/* 画面共有表示エリア */}
        {screenShareStream && screenShareUser && (
          <div className="screen-share-display">
            <div className="screen-share-header">
              <span className="screen-share-icon">🖥️</span>
              <span className="screen-share-user">{screenShareUser.username} が画面共有中</span>
            </div>
            <div className="screen-share-video-container">
              <video
                ref={screenShareVideoRef}
                autoPlay
                playsInline
                muted
                className="screen-share-video"
              />
            </div>
          </div>
        )}

        {/* 参加者表示エリア */}
        {isLoading ? (
          <div className="loading-container">
            <div className="loading">読み込み中...</div>
          </div>
        ) : participants.length === 0 ? (
          <div className="empty-container">
            <div className="empty-message">
              <div className="empty-icon">🔊</div>
              <h3>ボイスチャンネルに参加しよう！</h3>
              <p>下のボタンをクリックしてボイスチャットに参加してください</p>
            </div>
          </div>
        ) : (
          <div className="participants-grid" style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`
          }}>
            {participants.map(participant => (
              <div key={participant.socketId} className="participant-card">
                <div className="participant-avatar">
                  {participant.avatar ? (
                    <img src={participant.avatar} alt={participant.username} />
                  ) : (
                    <div className="avatar-placeholder">
                      {participant.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="participant-info">
                  <div className="participant-name">
                    {participant.username}
                    {participant.userId === user?.id && (
                      <span className="you-badge">あなた</span>
                    )}
                  </div>
                  <div className="participant-status">
                    {participant.isMuted && <span className="muted-icon" style={{color: 'red'}}>🎤</span>}
                    {participant.isDeafened && <span className="deafened-icon" style={{color: 'red'}}>🔊</span>}
                    {participant.isScreenSharing && <span className="screen-share-icon">🖥️</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="voice-channel-footer">
        <VoiceChat channelId={channelId} />
      </div>
    </div>
  );
};

export default VoiceChannelView; 