import { Server, Socket } from 'socket.io';

interface VoiceUser {
  userId: string;
  username: string;
  socketId: string;
  channelId: string;
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