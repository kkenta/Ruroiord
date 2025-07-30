import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
}

interface ChannelContextType {
  channels: Channel[];
  currentChannel: Channel | null;
  isLoading: boolean;
  setChannels: (channels: Channel[]) => void;
  setCurrentChannel: (channel: Channel) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  deleteChannel: (channelId: string) => void;
  loadChannels: () => Promise<void>;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

interface ChannelProviderProps {
  children: ReactNode;
}

export const ChannelProvider: React.FC<ChannelProviderProps> = ({ children }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // チャンネル一覧をデータベースから取得
  const loadChannels = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 loadChannels開始 - Token:', token ? '存在' : 'なし');
      
      if (!token) {
        console.log('❌ トークンがありません');
        setIsLoading(false);
        return;
      }

      console.log('📡 APIリクエスト送信中...');
      const response = await fetch('http://localhost:3001/api/channels', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📊 レスポンス状態:', response.status, response.statusText);

      if (response.ok) {
        const channelsData = await response.json();
        console.log('✅ チャンネルデータ取得成功:', channelsData);
        setChannels(channelsData);
        
        // 現在のチャンネルが設定されていない場合、最初のチャンネルを設定
        if (!currentChannel && channelsData.length > 0) {
          console.log('🎯 最初のチャンネルを設定:', channelsData[0]);
          setCurrentChannel(channelsData[0]);
        }
      } else if (response.status === 403) {
        // トークンが無効な場合、localStorageをクリア
        console.log('🚫 トークンが無効です。localStorageをクリアします。');
        localStorage.removeItem('token');
        localStorage.removeItem('user'); // ユーザー情報もクリア
        setChannels([]);
        setCurrentChannel(null);
        console.log('🔄 ページをリロードして再ログインしてください。');
      } else {
        const errorText = await response.text();
        console.error('❌ チャンネル取得に失敗しました:', response.status, errorText);
      }
    } catch (error) {
      console.error('💥 チャンネル読み込みエラー:', error);
    } finally {
      setIsLoading(false);
      console.log('🏁 loadChannels完了');
    }
  };

  // 初期ロード時にチャンネルを取得
  useEffect(() => {
    loadChannels();
  }, []);

  // 認証状態が変更されたときにチャンネルを再読み込み
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && channels.length === 0) {
      console.log('🔄 認証状態変更を検出、チャンネルを再読み込み');
      loadChannels();
    }
  }, [channels.length]);

  // トークンが無効な場合の処理
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        // トークンが削除された場合、チャンネル情報をクリア
        setChannels([]);
        setCurrentChannel(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 開発者用：localStorageをクリアする関数
  const clearLocalStorage = () => {
    localStorage.clear();
    setChannels([]);
    setCurrentChannel(null);
    console.log('localStorageをクリアしました。ページをリロードしてください。');
  };

  // 開発者用：トークンのみをクリアする関数
  const clearToken = () => {
    localStorage.removeItem('token');
    setChannels([]);
    setCurrentChannel(null);
    console.log('🗑️ トークンをクリアしました。ページをリロードしてください。');
    console.log('🔄 ページをリロードして再ログインしてください。');
  };

  // 開発者用：強制的にチャンネルを再読み込みする関数
  const forceReloadChannels = () => {
    console.log('🔄 チャンネルを強制再読み込みします...');
    setIsLoading(true);
    loadChannels();
  };

  // 開発者用関数をグローバルに公開
  useEffect(() => {
    (window as any).clearLocalStorage = clearLocalStorage;
    (window as any).clearToken = clearToken;
    (window as any).forceReloadChannels = forceReloadChannels;
    
    return () => {
      delete (window as any).clearLocalStorage;
      delete (window as any).clearToken;
      delete (window as any).forceReloadChannels;
    };
  }, []);

  const addChannel = (channel: Channel) => {
    setChannels(prev => [...prev, channel]);
  };

  const updateChannel = (channelId: string, updates: Partial<Channel>) => {
    setChannels(prev => prev.map(ch => 
      ch.id === channelId ? { ...ch, ...updates } : ch
    ));
    
    // 現在のチャンネルが更新された場合、それも更新
    if (currentChannel && currentChannel.id === channelId) {
      setCurrentChannel(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteChannel = (channelId: string) => {
    if (channels.length <= 1) {
      alert('最低1つのチャンネルが必要です');
      return;
    }
    
    const updatedChannels = channels.filter(ch => ch.id !== channelId);
    setChannels(updatedChannels);
    
    // 削除されたチャンネルが現在のチャンネルの場合、最初のチャンネルに切り替え
    if (currentChannel && currentChannel.id === channelId) {
      setCurrentChannel(updatedChannels[0]);
    }
  };

  const value: ChannelContextType = {
    channels,
    currentChannel,
    isLoading,
    setChannels,
    setCurrentChannel,
    addChannel,
    updateChannel,
    deleteChannel,
    loadChannels
  };

  return (
    <ChannelContext.Provider value={value}>
      {children}
    </ChannelContext.Provider>
  );
};

export const useChannels = (): ChannelContextType => {
  const context = useContext(ChannelContext);
  if (context === undefined) {
    throw new Error('useChannels must be used within a ChannelProvider');
  }
  return context;
}; 