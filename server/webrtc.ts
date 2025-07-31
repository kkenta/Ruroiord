import { Server, Socket } from 'socket.io';

interface VoiceUser {
  userId: string;
  username: string;
  socketId: string;
  channelId: string;
  isMuted?: boolean;
  isDeafened?: boolean;
}

interface WebRTCOffer {
  from: string;
  to: string;
  offer: any;
}

interface WebRTCAnswer {
  from: string;
  to: string;
  answer: any;
}

interface WebRTCIceCandidate {
  from: string;
  to: string;
  candidate: any;
}

export function setupWebRTCHandlers(io: Server) {
  const voiceUsers = new Map<string, VoiceUser>();

  io.on('connection', (socket: Socket) => {
    console.log(`WebRTC接続: ${socket.id}`);

    // ボイスチャンネルに参加
    socket.on('join-voice-channel', (data: { channelId: string; userId: string; username: string }) => {
      const { channelId, userId, username } = data;
      
      console.log(`🎤 ボイスチャンネル参加要求: ${username} (${userId}) -> ${channelId}`);
      
      // 既存の接続を削除
      voiceUsers.delete(socket.id);
      
      // 新しい接続を追加
      voiceUsers.set(socket.id, {
        userId,
        username,
        socketId: socket.id,
        channelId
      });

      // チャンネルに参加
      socket.join(`voice-${channelId}`);
      
      // チャンネル内の他のユーザーに通知
      socket.to(`voice-${channelId}`).emit('user-joined-voice', {
        userId,
        username,
        socketId: socket.id
      });

      // チャンネル内の既存ユーザーリストを送信
      const channelUsers = Array.from(voiceUsers.values())
        .filter(user => user.channelId === channelId && user.socketId !== socket.id);
      
      socket.emit('voice-users-list', channelUsers);
      
      // 新しい参加者を他のユーザーに通知
      socket.to(`voice-${channelId}`).emit('user-joined-voice', {
        userId,
        username,
        socketId: socket.id,
        isMuted: false,
        isDeafened: false
      });
      
      console.log(`✅ ユーザー ${username} がボイスチャンネル ${channelId} に参加しました (接続数: ${channelUsers.length + 1})`);
    });

    // ボイスチャンネルから退出
    socket.on('leave-voice-channel', (channelId: string) => {
      const user = voiceUsers.get(socket.id);
      if (user) {
        socket.leave(`voice-${channelId}`);
        voiceUsers.delete(socket.id);
        
        // 他のユーザーに通知
        socket.to(`voice-${channelId}`).emit('user-left-voice', {
          userId: user.userId,
          username: user.username,
          socketId: socket.id
        });
        
        console.log(`ユーザー ${user.username} がボイスチャンネル ${channelId} から退出しました`);
      }
    });

    // WebRTC Offer送信
    socket.on('webrtc-offer', (data: WebRTCOffer) => {
      console.log(`📤 WebRTC Offer送信: ${socket.id} -> ${data.to}`);
      socket.to(data.to).emit('webrtc-offer', {
        from: socket.id,
        offer: data.offer
      });
    });

    // WebRTC Answer送信
    socket.on('webrtc-answer', (data: WebRTCAnswer) => {
      console.log(`📤 WebRTC Answer送信: ${socket.id} -> ${data.to}`);
      socket.to(data.to).emit('webrtc-answer', {
        from: socket.id,
        answer: data.answer
      });
    });

    // ICE Candidate送信
    socket.on('webrtc-ice-candidate', (data: WebRTCIceCandidate) => {
      console.log(`🧊 ICE Candidate送信: ${socket.id} -> ${data.to}`);
      socket.to(data.to).emit('webrtc-ice-candidate', {
        from: socket.id,
        candidate: data.candidate
      });
    });

    // ユーザーの状態更新
    socket.on('voice-user-update', (data: { channelId: string; userId: string; username: string; isMuted?: boolean; isDeafened?: boolean }) => {
      const { channelId, userId, username, isMuted, isDeafened } = data;
      
      console.log(`📡 ユーザー状態更新: ${username} (ミュート: ${isMuted}, デフ: ${isDeafened})`);
      
      // ユーザー情報を更新
      const user = voiceUsers.get(socket.id);
      if (user && user.channelId === channelId) {
        user.isMuted = isMuted;
        user.isDeafened = isDeafened;
        voiceUsers.set(socket.id, user);
        
        // 他のユーザーに通知
        socket.to(`voice-${channelId}`).emit('voice-user-update', {
          userId,
          username,
          socketId: socket.id,
          isMuted,
          isDeafened
        });
      }
    });

    // ボイスチャンネル参加者リスト取得
    socket.on('get-voice-participants', (data: { channelId: string }) => {
      const { channelId } = data;
      
      // チャンネル内の全ユーザーを取得（自分も含める）
      const channelUsers = Array.from(voiceUsers.values())
        .filter(user => user.channelId === channelId);
      
      socket.emit('voice-participants-list', channelUsers);
    });

    // 画面共有開始
    socket.on('screen-share-start', (data: { channelId: string; userId: string; username: string; stream: MediaStream }) => {
      const { channelId, userId, username } = data;
      console.log(`🖥️ 画面共有開始: ${username} (チャンネル: ${channelId})`);
      
      // 他のユーザーに画面共有開始を通知
      socket.to(`voice-${channelId}`).emit('screen-share-start', {
        userId,
        username,
        socketId: socket.id
      });
    });

    // 画面共有停止
    socket.on('screen-share-stop', (data: { channelId: string; userId: string }) => {
      const { channelId, userId } = data;
      console.log(`⏹️ 画面共有停止: ${userId} (チャンネル: ${channelId})`);
      
      // 他のユーザーに画面共有停止を通知
      socket.to(`voice-${channelId}`).emit('screen-share-stop', {
        userId,
        socketId: socket.id
      });
    });

    // 接続切断
    socket.on('disconnect', () => {
      const user = voiceUsers.get(socket.id);
      if (user) {
        voiceUsers.delete(socket.id);
        
        // 他のユーザーに通知
        socket.to(`voice-${user.channelId}`).emit('user-left-voice', {
          userId: user.userId,
          username: user.username,
          socketId: socket.id
        });
        
        console.log(`ユーザー ${user.username} がボイスチャットから切断しました`);
      }
    });
  });
} 