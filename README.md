# Ruroiord

Discordライクなデスクトップチャットアプリケーション

## 機能

- **ユーザー認証**: 登録・ログイン機能
- **リアルタイムメッセージング**: Socket.ioを使用したテキストチャット
- **ボイスチャット**: WebRTCを使用したリアルタイム音声通信
- **音声録音**: 低容量WebM形式での音声ファイル保存
- **チャンネル管理**: 複数のチャンネルでの会話
- **音声制御**: ミュート・デフ・録音機能
- **メッセージ履歴**: SQLiteデータベースによる永続化
- **モダンなUI/UX**: Discordライクなインターフェース
- **クロスプラットフォーム対応**: Windows, macOS, Linux, Raspberry Pi

## 技術スタック

### フロントエンド
- **Electron** - デスクトップアプリケーションフレームワーク
- **React** - UIライブラリ
- **TypeScript** - 型安全なJavaScript
- **Vite** - ビルドツール

### バックエンド
- **Node.js** - JavaScriptランタイム
- **Express** - Webフレームワーク
- **Socket.io** - リアルタイム通信・WebRTCシグナリング
- **SQLite** - データベース
- **JWT** - 認証
- **WebRTC** - ピアツーピア音声通信

## セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn

### インストール

1. リポジトリをクローン
```bash
git clone <repository-url>
cd Ruroiord
```

2. 依存関係をインストール
```bash
npm install
```

3. 環境変数を設定
```bash
cp env.example .env
# .envファイルを編集して必要な設定を行ってください
```

### 開発サーバーの起動

#### Windows環境
Windows環境では、以下のバッチファイルを使用できます：

**開発モード（推奨）**：
```cmd
dev-ruroiord.bat
```

**本番モード**：
```cmd
start-ruroiord.bat
```

**停止**：
```cmd
stop-ruroiord.bat
```

#### 手動起動
1. バックエンドサーバーを起動（HTTPS）
```bash
npm run server:dev
```

2. フロントエンド開発サーバーを起動（HTTPS）
```bash
npm run dev:renderer
```

3. Electronアプリを起動
```bash
npm run dev:main
```

または、すべてを一度に起動：
```bash
npm run dev
```

#### HTTPS証明書について
開発環境では自己署名証明書を使用しています：
- 証明書ファイル: `server/localhost-key.pem`, `server/localhost.pem`
- ブラウザでアクセスする際は「詳細設定」→「安全でないサイトにアクセス」を選択してください
- Electronアプリでは自動的に証明書が信頼されます

### ビルド

```bash
npm run build
```

### パッケージング

```bash
npm run package
```

## プロジェクト構造

```
Ruroiord/
├── src/                    # Reactアプリケーション
│   ├── components/         # Reactコンポーネント
│   ├── contexts/          # Reactコンテキスト
│   └── ...
├── server/                # バックエンドサーバー
│   ├── routes/           # APIルート
│   ├── database.ts       # データベース設定
│   └── socket.ts         # Socket.io設定
├── electron/             # Electron設定
├── dist/                 # ビルド出力
└── ...
```

## ボイスチャット機能

### 使用方法
1. アプリケーションにログイン
2. チャンネルを選択
3. ボイスチャットセクションで「参加」ボタンをクリック
4. マイクアクセスを許可
5. 音声制御ボタンでミュート・デフ・録音切り替え
6. 録音ボタン（🎙️）で音声ファイルを保存

## 画面共有機能

### 使用方法
1. ボイスチャンネルに参加
2. 画面共有ボタン（🖥️）をクリック
3. 画面全体またはアプリケーションを選択
4. 共有中はボタンが赤色（⏹️）に変わる
5. 停止するにはボタンをクリックまたはブラウザの停止ボタン

### 機能
- **画面全体共有**: デスクトップ全体を共有
- **アプリケーション共有**: 特定のアプリケーションのみを共有
- **カーソル表示**: マウスカーソルも含めて共有
- **自動停止**: 画面共有停止時に自動で停止
- **リモート表示**: 他のユーザーの画面共有を表示

### 重要: HTTPS環境が必要
画面共有機能は**セキュリティ上の理由でHTTPS環境でのみ動作**します：
- 開発環境: 自動的にHTTPSが有効化されます
- 本番環境: 有効なSSL証明書が必要です
- 自己署名証明書: 開発用に自動生成されます

### 技術仕様
- **WebRTC**: ピアツーピア音声通信
- **STUNサーバー**: GoogleのパブリックSTUNサーバー
- **音声レベル監視**: リアルタイム音声レベル表示
- **自動接続**: ユーザー参加時に自動的にWebRTC接続確立
- **音声録音**: WebM/Opus形式で低容量保存
- **ファイル形式**: .webm（高圧縮、低容量）

### デバッグ情報
ブラウザの開発者ツール（F12）のコンソールで以下のログを確認できます：
- 🎤 音声レベル監視
- 🔗 WebRTC接続状態
- 📡 音声トラック追加
- 🎧 リモート音声受信

### 開発者用録音機能
音声録音機能は開発者用として実装されています：

**使用方法**：
```javascript
// ブラウザコンソールで実行
startVoiceRecording();  // 録音開始
stopVoiceRecording();   // 録音停止
isRecording();          // 録音状態確認
```

**保存先**：
- ファイル形式: `voice-chat-YYYY-MM-DDTHH-MM-SS.webm`
- 保存場所: ブラウザのデフォルトダウンロードフォルダ
- 容量: 約50-100KB/分（高圧縮WebM/Opus形式）

## 開発者用デバッグ機能

認証やlocalStorageの問題を解決するための開発者向けコマンドです：

**使用方法**：
```javascript
// ブラウザコンソールで実行
clearToken();           // 認証トークンのみをクリア
clearLocalStorage();    // すべてのlocalStorageデータをクリア
testAudio();            // 音声テスト（自分の声を聞く）
testScreenShare();      // 画面共有テスト
checkVoiceConnections(); // ボイス接続状態確認
resetVoiceConnections(); // ボイス接続を強制リセット
startConnectionMonitoring(); // 接続状態を定期的に監視
stopConnectionMonitoring();  // 接続監視を停止
```

**トラブルシューティング**：
- 403エラーや認証問題が発生した場合
- チャンネル情報が表示されない場合
- ログイン状態が異常な場合

**手順**：
1. ブラウザの開発者ツール（F12）を開く
2. コンソールタブを選択
3. `clearToken()`を実行
4. ページをリロード
5. 再ログイン

## Raspberry Pi対応

このアプリケーションはRaspberry Piでの動作を考慮して設計されています：

### 要件
- Raspberry Pi 4 (推奨)
- 4GB RAM以上
- 16GBストレージ以上
- 安定したインターネット接続

### 最適化
- 軽量なUIフレームワーク
- 効率的なメモリ使用
- ARM64アーキテクチャ対応

## ライセンス

MIT License

## 開発者

Ruroiord Team
