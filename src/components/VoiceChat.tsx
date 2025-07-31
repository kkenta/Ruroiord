import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import './VoiceChat.css';

interface VoiceUser {
  userId: string;
  username: string;
  socketId: string;
}

interface VoiceChatProps {
  channelId: string;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ channelId }) => {
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [isInVoiceChannel, setIsInVoiceChannel] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // マイクの取得
  const getLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      localStreamRef.current = stream;
      
      // 音声レベル監視を開始
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        if (average > 10) {
          console.log(`🎤 音声レベル: ${average.toFixed(2)} (検出中)`);
        }
        
        if (localStreamRef.current) {
          requestAnimationFrame(checkAudioLevel);
        }
      };
      
      checkAudioLevel();
      console.log('✅ マイクアクセス成功 - 音声レベル監視開始');
      
      return stream;
    } catch (error) {
      console.error('❌ マイクの取得に失敗しました:', error);
      return null;
    }
  };

  // ボイスチャンネルに参加
  const joinVoiceChannel = async () => {
    if (!socket || !user || !isConnected) return;

    console.log('🎤 ボイスチャンネル参加中...');
    const stream = await getLocalStream();
    if (!stream) {
      alert('マイクへのアクセスが許可されていません');
      return;
    }

    socket.emit('join-voice-channel', {
      channelId,
      userId: user.id,
      username: user.username
    });

    setIsInVoiceChannel(true);
    console.log('✅ ボイスチャンネルに参加しました');
  };

  // ボイスチャンネルから退出
  const leaveVoiceChannel = () => {
    if (!socket || !isConnected) return;

    // ローカルストリームを停止
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // ピア接続を閉じる
    peerConnectionsRef.current.forEach(connection => {
      connection.close();
    });
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();

    socket.emit('leave-voice-channel', channelId);
    setIsInVoiceChannel(false);
    setVoiceUsers([]);
  };

  // ミュート切り替え
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // デフ切り替え
  const toggleDeafen = () => {
    const newDeafenedState = !isDeafened;
    setIsDeafened(newDeafenedState);
    
    console.log(`🔊 デフ状態変更: ${newDeafenedState ? 'ON' : 'OFF'}`);
    
    // リモートストリームの音声を切り替え
    remoteStreamsRef.current.forEach((stream, socketId) => {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !newDeafenedState;
        console.log(`🎧 音声トラック ${socketId}: ${track.enabled ? '有効' : '無効'}`);
      });
    });
    
    // Audio要素の音量も制御
    const audioElements = document.querySelectorAll('audio[id^="audio-"]') as NodeListOf<HTMLAudioElement>;
    audioElements.forEach(audio => {
      audio.volume = newDeafenedState ? 0 : 1.0;
      audio.muted = newDeafenedState;
      console.log(`🔊 Audio要素音量設定: ${audio.id} = ${newDeafenedState ? '0' : '1.0'}`);
    });
  };

  // 録音開始
  const startRecording = () => {
    if (!localStreamRef.current) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(localStreamRef.current, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      
      // ダウンロードリンクを作成
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice-chat-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ 音声ファイルを保存しました');
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000); // 1秒ごとにデータを取得
    setIsRecording(true);
    console.log('🎙️ 録音を開始しました');
  };

  // 録音停止
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('⏹️ 録音を停止しました');
    }
  };

  // WebRTC接続の確立
  // 再接続機能
  const reconnectPeer = (remoteSocketId: string) => {
    console.log(`🔄 ピア再接続中: ${remoteSocketId}`);
    
    // 既存の接続を閉じる
    const existingConnection = peerConnectionsRef.current.get(remoteSocketId);
    if (existingConnection) {
      existingConnection.close();
      peerConnectionsRef.current.delete(remoteSocketId);
    }
    
    // 新しい接続を作成
    const newConnection = createPeerConnection(remoteSocketId);
    
    // Offerを作成して送信
    newConnection.createOffer()
      .then(offer => newConnection.setLocalDescription(offer))
      .then(() => {
        if (socket) {
          socket.emit('webrtc-offer', {
            from: socket.id,
            to: remoteSocketId,
            offer: newConnection.localDescription
          });
        }
      })
      .catch(error => {
        console.error(`❌ 再接続Offer作成失敗: ${remoteSocketId}`, error);
      });
  };

  const createPeerConnection = (remoteSocketId: string) => {
    console.log(`🔗 WebRTC接続確立中: ${remoteSocketId}`);
    
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 5,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    // ローカルストリームを追加
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
        console.log(`📡 音声トラック追加: ${track.kind}`);
      });
    }

    // リモートストリームの処理
    peerConnection.ontrack = (event) => {
      console.log(`🎧 リモート音声受信: ${remoteSocketId}`);
      console.log('📊 トラック情報:', event.track.kind, 'ID:', event.track.id);
      remoteStreamsRef.current.set(remoteSocketId, event.streams[0]);
      
      // デフ状態を適用
      if (isDeafened) {
        event.streams[0].getAudioTracks().forEach(track => {
          track.enabled = false;
        });
        console.log(`🔇 デフ状態のため音声トラックを無効化: ${remoteSocketId}`);
      }
      
      // リモート音声の再生
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
      audio.volume = isDeafened ? 0 : 1.0;
      audio.muted = isDeafened;
      audio.id = `audio-${remoteSocketId}`;
      
      // 音声再生の詳細ログ
      audio.onloadedmetadata = () => {
        console.log(`🎵 音声メタデータ読み込み完了: ${remoteSocketId}`);
      };
      
      audio.onplay = () => {
        console.log(`▶️ 音声再生開始: ${remoteSocketId}`);
      };
      
      audio.onerror = (e) => {
        console.error(`❌ 音声再生エラー: ${remoteSocketId}`, e);
      };
      
      // 音声再生を確実に開始
      const playAudio = async () => {
        try {
          await audio.play();
          console.log(`✅ 音声再生成功: ${remoteSocketId}`);
        } catch (e) {
          console.error(`❌ 音声再生失敗: ${remoteSocketId}`, e);
          // 再試行
          setTimeout(() => {
            audio.play().catch(e2 => {
              console.error(`❌ 音声再生再試行失敗: ${remoteSocketId}`, e2);
            });
          }, 1000);
        }
      };
      
      playAudio();
    };

    // ICE Candidateの処理
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log(`🧊 ICE Candidate送信: ${remoteSocketId}`);
        socket.emit('webrtc-ice-candidate', {
          from: socket.id,
          to: remoteSocketId,
          candidate: event.candidate
        });
      }
    };

    // 接続状態の監視
    peerConnection.onconnectionstatechange = () => {
      console.log(`🔗 接続状態変更 (${remoteSocketId}): ${peerConnection.connectionState}`);
      if (peerConnection.connectionState === 'connected') {
        console.log(`✅ WebRTC接続確立完了: ${remoteSocketId}`);
      } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        console.log(`❌ WebRTC接続失敗/切断: ${remoteSocketId}`);
        // 接続が失敗した場合、再接続を試行
        setTimeout(() => {
          if (peerConnectionsRef.current.has(remoteSocketId)) {
            console.log(`🔄 再接続を試行中: ${remoteSocketId}`);
            reconnectPeer(remoteSocketId);
          }
        }, 3000);
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE接続状態変更 (${remoteSocketId}): ${peerConnection.iceConnectionState}`);
      if (peerConnection.iceConnectionState === 'connected') {
        console.log(`✅ ICE接続確立: ${remoteSocketId}`);
      } else if (peerConnection.iceConnectionState === 'failed') {
        console.log(`❌ ICE接続失敗: ${remoteSocketId}`);
      }
    };

    peerConnection.onicegatheringstatechange = () => {
      console.log(`🧊 ICE収集状態変更 (${remoteSocketId}): ${peerConnection.iceGatheringState}`);
    };

    peerConnection.onicecandidateerror = (event) => {
      console.error(`❌ ICE候補エラー (${remoteSocketId}):`, event);
      // ICE候補エラーが発生しても接続を継続
      console.log(`🔄 ICE候補エラーを無視して接続を継続: ${remoteSocketId}`);
    };

    peerConnectionsRef.current.set(remoteSocketId, peerConnection);
    return peerConnection;
  };

  useEffect(() => {
    if (!socket || !isConnected) return;

      // 開発者用録音機能をグローバルに公開
  (window as any).startVoiceRecording = startRecording;
  (window as any).stopVoiceRecording = stopRecording;
  (window as any).isRecording = () => isRecording;

  // 開発者用：音声テスト機能
  (window as any).testAudio = async () => {
    console.log('🎵 音声テスト開始');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audio = new Audio();
      audio.srcObject = stream;
      audio.play();
      console.log('✅ 音声テスト成功 - 自分の声が聞こえるはずです');
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        console.log('🛑 音声テスト終了');
      }, 5000);
    } catch (error) {
      console.error('❌ 音声テスト失敗:', error);
    }
  };

  // 開発者用：接続状態確認
  (window as any).checkVoiceConnections = () => {
    console.log('🔍 ボイス接続状態確認:');
    console.log('  - ピア接続数:', peerConnectionsRef.current.size);
    console.log('  - リモートストリーム数:', remoteStreamsRef.current.size);
    console.log('  - ローカルストリーム:', localStreamRef.current ? '存在' : 'なし');
    console.log('  - ボイスユーザー数:', voiceUsers.length);
    console.log('  - デフ状態:', isDeafened ? 'ON' : 'OFF');
    console.log('  - ミュート状態:', isMuted ? 'ON' : 'OFF');
    peerConnectionsRef.current.forEach((pc, id) => {
      console.log(`  - 接続 ${id}:`, pc.connectionState, pc.iceConnectionState);
    });
    
    // 音声トラックの状態も確認
    remoteStreamsRef.current.forEach((stream, id) => {
      stream.getAudioTracks().forEach(track => {
        console.log(`  - 音声トラック ${id}: ${track.enabled ? '有効' : '無効'}`);
      });
    });
    
    // Audio要素の状態も確認
    const audioElements = document.querySelectorAll('audio[id^="audio-"]') as NodeListOf<HTMLAudioElement>;
    audioElements.forEach(audio => {
      console.log(`  - Audio要素 ${audio.id}: volume=${audio.volume}, muted=${audio.muted}`);
    });
  };

  // 開発者用：接続を強制リセット
  (window as any).resetVoiceConnections = () => {
    console.log('🔄 ボイス接続をリセット中...');
    peerConnectionsRef.current.forEach((pc, id) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    setVoiceUsers([]);
    console.log('✅ ボイス接続をリセットしました');
  };

  // 開発者用：接続状態を定期的にチェック
  (window as any).startConnectionMonitoring = () => {
    console.log('🔍 接続監視を開始');
    const interval = setInterval(() => {
      peerConnectionsRef.current.forEach((pc, id) => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.log(`⚠️ 不安定な接続を検出: ${id} (${pc.connectionState})`);
          reconnectPeer(id);
        }
      });
    }, 10000); // 10秒ごとにチェック
    
    // グローバルに保存して停止できるようにする
    (window as any).stopConnectionMonitoring = () => {
      clearInterval(interval);
      console.log('🛑 接続監視を停止');
    };
  };

    // ユーザーがボイスチャンネルに参加
    const handleUserJoinedVoice = (data: VoiceUser) => {
      setVoiceUsers(prev => [...prev, data]);
      
      // 新しいユーザーとのWebRTC接続を確立
      const peerConnection = createPeerConnection(data.socketId);
      
      // Offerを作成して送信
      peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
          socket.emit('webrtc-offer', {
            from: socket.id,
            to: data.socketId,
            offer: peerConnection.localDescription
          });
        });
    };

    // ユーザーがボイスチャンネルから退出
    const handleUserLeftVoice = (data: VoiceUser) => {
      setVoiceUsers(prev => prev.filter(user => user.socketId !== data.socketId));
      
      // ピア接続を閉じる
      const peerConnection = peerConnectionsRef.current.get(data.socketId);
      if (peerConnection) {
        peerConnection.close();
        peerConnectionsRef.current.delete(data.socketId);
      }
      remoteStreamsRef.current.delete(data.socketId);
    };

    // 既存ユーザーリストを受信
    const handleVoiceUsersList = (users: VoiceUser[]) => {
      setVoiceUsers(users);
      
      // 既存ユーザーとのWebRTC接続を確立
      users.forEach(user => {
        const peerConnection = createPeerConnection(user.socketId);
        
        // Offerを作成して送信
        peerConnection.createOffer()
          .then(offer => peerConnection.setLocalDescription(offer))
          .then(() => {
            socket.emit('webrtc-offer', {
              from: socket.id,
              to: user.socketId,
              offer: peerConnection.localDescription
            });
          });
      });
    };

    // WebRTC Offerを受信
    const handleWebRTCOffer = async (data: any) => {
      const peerConnection = createPeerConnection(data.from);
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      socket.emit('webrtc-answer', {
        from: socket.id,
        to: data.from,
        answer: peerConnection.localDescription
      });
    };

    // WebRTC Answerを受信
    const handleWebRTCAnswer = async (data: any) => {
      const peerConnection = peerConnectionsRef.current.get(data.from);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    };

    // ICE Candidateを受信
    const handleWebRTCCandidate = async (data: any) => {
      const peerConnection = peerConnectionsRef.current.get(data.from);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    // イベントリスナーの登録
    socket.on('user-joined-voice', handleUserJoinedVoice);
    socket.on('user-left-voice', handleUserLeftVoice);
    socket.on('voice-users-list', handleVoiceUsersList);
    socket.on('webrtc-offer', handleWebRTCOffer);
    socket.on('webrtc-answer', handleWebRTCAnswer);
    socket.on('webrtc-ice-candidate', handleWebRTCCandidate);

    // クリーンアップ
    return () => {
      socket.off('user-joined-voice', handleUserJoinedVoice);
      socket.off('user-left-voice', handleUserLeftVoice);
      socket.off('voice-users-list', handleVoiceUsersList);
      socket.off('webrtc-offer', handleWebRTCOffer);
      socket.off('webrtc-answer', handleWebRTCAnswer);
      socket.off('webrtc-ice-candidate', handleWebRTCCandidate);
    };
  }, [socket, isConnected]);

  return (
    <div className="voice-chat">
      <div className="voice-chat-header">
        <h3>ボイスチャット</h3>
        {!isInVoiceChannel ? (
          <button 
            className="join-voice-btn"
            onClick={joinVoiceChannel}
            disabled={!isConnected}
          >
            参加
          </button>
        ) : (
          <button 
            className="leave-voice-btn"
            onClick={leaveVoiceChannel}
          >
            退出
          </button>
        )}
      </div>

      {isInVoiceChannel && (
        <div className="voice-controls">
          <button 
            className={`mute-btn ${isMuted ? 'muted' : ''}`}
            onClick={toggleMute}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button 
            className={`deafen-btn ${isDeafened ? 'deafened' : ''}`}
            onClick={toggleDeafen}
          >
            {isDeafened ? '🔇' : '🔊'}
          </button>

        </div>
      )}

      <div className="voice-users">
        {isInVoiceChannel && (
          <div className="voice-user local">
            <span className="username">{user?.username}</span>
            <span className="status">
              {isMuted ? '🔇' : '🎤'} {isDeafened ? '🔇' : '🔊'}
            </span>
          </div>
        )}
        
        {voiceUsers.map(user => (
          <div key={user.socketId} className="voice-user remote">
            <span className="username">{user.username}</span>
            <span className="status">🎤 🔊</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceChat; 
