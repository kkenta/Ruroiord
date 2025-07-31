import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import './VoiceChat.css';

interface VoiceUser {
  userId: string;
  username: string;
  socketId: string;
  isMuted?: boolean;
  isDeafened?: boolean;
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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
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

    // 画面共有を停止
    if (isScreenSharing) {
      stopScreenSharing();
    }

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
        const newMutedState = !audioTrack.enabled;
        setIsMuted(newMutedState);
        
        console.log(`🎤 ミュート状態変更: ${newMutedState ? 'ON' : 'OFF'}`);
        
        // 他のユーザーにミュート状態を送信
        if (socket && isInVoiceChannel) {
          socket.emit('voice-user-update', {
            channelId,
            userId: user?.id,
            username: user?.username,
            isMuted: newMutedState,
            isDeafened: isDeafened
          });
          console.log(`📡 ミュート状態を送信: ${newMutedState ? 'ON' : 'OFF'}`);
        }
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

    // 他のユーザーにデフ状態を送信
    if (socket && isInVoiceChannel) {
      socket.emit('voice-user-update', {
        channelId,
        userId: user?.id,
        username: user?.username,
        isMuted: isMuted,
        isDeafened: newDeafenedState
      });
      console.log(`📡 デフ状態を送信: ${newDeafenedState ? 'ON' : 'OFF'}`);
    }
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

  // 画面共有開始
  const startScreenSharing = async () => {
    try {
      console.log('🖥️ 画面共有開始中...');
      
      // ボイスチャンネルに参加しているかチェック
      if (!isInVoiceChannel) {
        alert('画面共有を開始するには、まずボイスチャンネルに参加してください');
        return;
      }

      // 画面共有のオプションを設定
      const displayMediaOptions = {
        video: {
          cursor: 'always',
          displaySurface: 'monitor' as const
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      console.log('📺 画面共有ストリーム取得成功:', stream.getVideoTracks().length, '個のビデオトラック');
      
      setScreenStream(stream);
      setIsScreenSharing(true);
      
      // 画面共有ストリームをピア接続に追加
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('🔗 ピア接続数:', peerConnectionsRef.current.size);
        
        peerConnectionsRef.current.forEach((connection, socketId) => {
          try {
            const sender = connection.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              console.log(`🔄 既存のビデオトラックを置換: ${socketId}`);
              sender.replaceTrack(videoTrack);
            } else {
              console.log(`➕ 新しいビデオトラックを追加: ${socketId}`);
              connection.addTrack(videoTrack, stream);
            }
          } catch (trackError) {
            console.error(`❌ トラック追加エラー (${socketId}):`, trackError);
          }
        });
      }

      // 画面共有停止時の処理
      stream.getVideoTracks()[0].onended = () => {
        console.log('🛑 画面共有が停止されました');
        stopScreenSharing();
      };

      console.log('✅ 画面共有を開始しました');
      
      // サーバーに画面共有開始を通知
      if (socket && isInVoiceChannel) {
        socket.emit('screen-share-start', {
          channelId,
          userId: user?.id,
          username: user?.username,
          stream: stream
        });
      }
    } catch (error) {
      console.error('❌ 画面共有の開始に失敗しました:', error);
      
      // より詳細なエラーメッセージ
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('画面共有が許可されていません。ブラウザの設定を確認してください。');
        } else if (error.name === 'NotSupportedError') {
          alert('このブラウザは画面共有をサポートしていません。HTTPS環境で実行されているか確認してください。');
        } else if (error.name === 'NotFoundError') {
          alert('画面共有に使用できるディスプレイが見つかりません。');
        } else if (error.message.includes('Not supported')) {
          alert('画面共有はHTTPS環境でのみサポートされています。現在の環境を確認してください。');
        } else {
          alert(`画面共有の開始に失敗しました: ${error.message}`);
        }
      } else {
        alert('画面共有の開始に失敗しました');
      }
    }
  };

  // 画面共有停止
  const stopScreenSharing = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      
      // ピア接続から画面共有トラックを削除
      peerConnectionsRef.current.forEach((connection, socketId) => {
        const senders = connection.getSenders();
        senders.forEach(sender => {
          if (sender.track?.kind === 'video') {
            connection.removeTrack(sender);
          }
        });
      });

      console.log('⏹️ 画面共有を停止しました');
      
      // サーバーに画面共有停止を通知
      if (socket && isInVoiceChannel) {
        socket.emit('screen-share-stop', {
          channelId,
          userId: user?.id
        });
      }
    }
  };

  // 画面共有切り替え
  const toggleScreenSharing = () => {
    if (isScreenSharing) {
      stopScreenSharing();
    } else {
      startScreenSharing();
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

      // リモート画面共有の表示
      const videoTracks = event.streams[0].getVideoTracks();
      if (videoTracks.length > 0) {
        const video = document.createElement('video');
        video.srcObject = event.streams[0];
        video.autoplay = true;
        video.controls = true;
        video.style.width = '100%';
        video.style.maxWidth = '400px';
        video.style.borderRadius = '8px';
        video.style.marginTop = '10px';
        video.id = `video-${remoteSocketId}`;
        
        // 画面共有表示エリアに追加
        const screenShareArea = document.getElementById('screen-share-area');
        if (screenShareArea) {
          screenShareArea.appendChild(video);
        }
        
        console.log(`📺 リモート画面共有表示: ${remoteSocketId}`);
      }
      
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
    console.log('  - 画面共有状態:', isScreenSharing ? 'ON' : 'OFF');
    console.log('  - 画面共有ストリーム:', screenStream ? '存在' : 'なし');
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

  // 開発者用：画面共有テスト
  (window as any).testScreenShare = async () => {
    try {
      console.log('🧪 画面共有テスト開始...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      console.log('✅ 画面共有テスト成功:', stream.getVideoTracks().length, '個のビデオトラック');
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('❌ 画面共有テスト失敗:', error);
    }
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

    // ユーザーの状態更新を受信
    const handleVoiceUserUpdate = (data: VoiceUser) => {
      console.log(`📡 ユーザー状態更新受信: ${data.username}`, {
        isMuted: data.isMuted,
        isDeafened: data.isDeafened
      });
      
      setVoiceUsers(prev => {
        const updated = prev.map(user => 
          user.socketId === data.socketId 
            ? { ...user, isMuted: data.isMuted, isDeafened: data.isDeafened }
            : user
        );
        console.log('🔄 ボイスユーザーリスト更新:', updated);
        return updated;
      });
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
    socket.on('voice-user-update', handleVoiceUserUpdate);
    socket.on('webrtc-offer', handleWebRTCOffer);
    socket.on('webrtc-answer', handleWebRTCAnswer);
    socket.on('webrtc-ice-candidate', handleWebRTCCandidate);

    // クリーンアップ
    return () => {
      socket.off('user-joined-voice', handleUserJoinedVoice);
      socket.off('user-left-voice', handleUserLeftVoice);
      socket.off('voice-users-list', handleVoiceUsersList);
      socket.off('voice-user-update', handleVoiceUserUpdate);
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
            {isMuted ? <span className="muted-icon">🎤</span> : '🎤'}
          </button>
          <button 
            className={`deafen-btn ${isDeafened ? 'deafened' : ''}`}
            onClick={toggleDeafen}
          >
            {isDeafened ? <span className="deafened-icon">🔊</span> : '🔊'}
          </button>
          <button 
            className={`screen-share-btn ${isScreenSharing ? 'sharing' : ''} ${!isInVoiceChannel ? 'disabled' : ''}`}
            onClick={toggleScreenSharing}
            disabled={!isInVoiceChannel}
            title={!isInVoiceChannel ? 'ボイスチャンネルに参加してください' : (isScreenSharing ? '画面共有を停止' : '画面共有を開始')}
          >
            {isScreenSharing ? '⏹️' : '🖥️'}
          </button>

        </div>
      )}

      <div className="voice-users">
              {isInVoiceChannel && (
        <div className="voice-user local">
          <span className="username">{user?.username}</span>
                      <span className="status">
              {isMuted && <span className="muted-icon">🎤</span>}
              {isDeafened && <span className="deafened-icon">🔊</span>}
            </span>
        </div>
      )}
        
        {voiceUsers.map(user => (
          <div key={user.socketId} className="voice-user remote">
            <span className="username">{user.username}</span>
            <span className="status">
              {user.isMuted && <span className="muted-icon">🎤</span>}
              {user.isDeafened && <span className="deafened-icon">🔊</span>}
            </span>
          </div>
        ))}
      </div>

      {/* 画面共有表示エリア */}
      <div id="screen-share-area" className="screen-share-area">
        {/* リモート画面共有がここに表示される */}
      </div>
    </div>
  );
};

export default VoiceChat; 
