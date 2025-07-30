# Ruroiord - macOS セットアップガイド

## 📋 前提条件

- macOS 10.15 (Catalina) 以上
- Intel Mac または Apple Silicon (M1/M2) Mac
- 4GB RAM以上
- 10GB空き容量以上
- インターネット接続

## 🚀 クイックセットアップ

### 1. プロジェクトのダウンロード

```bash
# ホームディレクトリに移動
cd ~

# プロジェクトをクローンまたはコピー
# (GitHubからクローンする場合)
git clone https://github.com/your-repo/Ruroiord.git
cd Ruroiord

# または、プロジェクトファイルを直接コピー
```

### 2. 自動インストール

```bash
# インストールスクリプトに実行権限を付与
chmod +x install-ruroiord-mac.sh

# インストールを実行
./install-ruroiord-mac.sh
```

### 3. アプリケーションの起動

```bash
# 手動起動
./start-ruroiord-mac.sh

# または、開発モードで起動
npm run dev
```

## 🔧 手動セットアップ

### 1. Homebrewのインストール

```bash
# Homebrewをインストール
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# M1/M2 Macの場合のPATH設定
if [[ $(uname -m) == 'arm64' ]]; then
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi
```

### 2. Node.js 18のインストール

```bash
# Node.jsをインストール
brew install node@18

# バージョン確認
node --version
npm --version
```

### 3. Xcode Command Line Toolsのインストール

```bash
# Xcode Command Line Toolsをインストール
xcode-select --install
```

### 4. プロジェクトのセットアップ

```bash
# プロジェクトディレクトリに移動
cd ~/Ruroiord

# 依存関係をインストール
npm install

# 環境変数ファイルを作成
cp env.example .env

# アプリケーションをビルド
npm run build:renderer
npm run build:main
```

## 🎯 使用方法

### 基本的な起動

```bash
cd ~/Ruroiord
./start-ruroiord-mac.sh
```

### 開発モードでの起動

```bash
# バックエンドサーバーを起動
npm run server:dev

# 別のターミナルでフロントエンドを起動
npm run dev:renderer

# 別のターミナルでElectronを起動
npm run dev:main
```

### アプリケーションの停止

```bash
./stop-ruroiord-mac.sh
```

## 📊 システム管理

### プロセス管理

```bash
# 実行中のプロセスを確認
ps aux | grep ruroiord

# プロセスを強制終了
pkill -f ruroiord

# Activity Monitorで確認
open -a "Activity Monitor"
```

### ログの確認

```bash
# アプリケーションログ
tail -f ~/Ruroiord/logs/app.log

# システムログ
log show --predicate 'process == "Ruroiord"' --last 1h
```

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. 権限エラー

```bash
# スクリプトに実行権限を付与
chmod +x *.sh

# ファイルの所有者を確認
ls -la
```

#### 2. Homebrewパスエラー

```bash
# M1/M2 Macの場合
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Intel Macの場合
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### 3. Xcode Command Line Toolsエラー

```bash
# 再インストール
sudo rm -rf /Library/Developer/CommandLineTools
xcode-select --install
```

#### 4. ポート競合

```bash
# 使用中のポートを確認
lsof -i :3001

# プロセスを終了
kill -9 <PID>
```

#### 5. ビルドエラー

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install

# キャッシュをクリア
npm cache clean --force
```

### セキュリティ設定

#### 1. ファイアウォール設定

```bash
# システム環境設定 > セキュリティとプライバシー > ファイアウォール
# Ruroiordに接続を許可
```

#### 2. アプリケーションの許可

```bash
# システム環境設定 > セキュリティとプライバシー > 一般
# ダウンロードしたアプリケーションの実行を許可
```

## 📈 パフォーマンス最適化

### 1. メモリ使用量の最適化

```bash
# 不要なアプリケーションを終了
# Activity Monitorでメモリ使用量を確認
```

### 2. ディスク容量の確保

```bash
# 不要なファイルを削除
npm cache clean --force
rm -rf ~/Library/Caches/npm
```

### 3. 自動起動の設定

```bash
# システム環境設定 > ユーザーとグループ > ログイン項目
# Ruroiordを追加
```

## 🔒 セキュリティ設定

### 1. ファイアウォール設定

```bash
# システム環境設定 > セキュリティとプライバシー > ファイアウォール
# 詳細設定でRuroiordを追加
```

### 2. アプリケーションの署名

```bash
# 開発者証明書でアプリケーションに署名
codesign --force --deep --sign - Ruroiord.app
```

## 📞 サポート

問題が発生した場合は、以下の情報を収集してください：

1. エラーメッセージ
2. システム情報 (`uname -a`)
3. Node.jsバージョン (`node --version`)
4. macOSバージョン (`sw_vers`)
5. ログファイルの内容

## 📝 更新履歴

- v1.0.0: 初回リリース
- macOS 10.15以上対応
- Apple Silicon (M1/M2) 対応
- Homebrew統合
- 自動インストール機能 