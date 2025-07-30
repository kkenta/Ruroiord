# Ruroiord - Raspberry Pi セットアップガイド

## 📋 前提条件

- Raspberry Pi 4 (推奨) または Raspberry Pi 3B+
- Raspberry Pi OS (Bullseye以上)
- 4GB RAM以上
- 16GBストレージ以上
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
chmod +x install-ruroiord.sh

# インストールを実行
./install-ruroiord.sh
```

### 3. アプリケーションの起動

```bash
# 手動起動
./start-ruroiord.sh

# または、デスクトップアイコンをダブルクリック
```

## 🔧 手動セットアップ

### 1. システムの更新

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Node.js 18のインストール

```bash
# NodeSourceリポジトリを追加
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.jsをインストール
sudo apt-get install -y nodejs

# バージョン確認
node --version
npm --version
```

### 3. 必要なシステムパッケージのインストール

```bash
sudo apt install -y \
    build-essential \
    python3 \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf
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
./start-ruroiord.sh
```

### アプリケーションの停止

```bash
./stop-ruroiord.sh
```

### 自動起動の設定

```bash
# 自動起動スクリプトに実行権限を付与
chmod +x setup-autostart.sh

# 自動起動を設定
./setup-autostart.sh
```

## 📊 システム管理

### systemdサービス管理

```bash
# サービスの開始
sudo systemctl start ruroiord

# サービスの停止
sudo systemctl stop ruroiord

# サービスの再起動
sudo systemctl restart ruroiord

# サービスのステータス確認
sudo systemctl status ruroiord

# ログの確認
sudo journalctl -u ruroiord -f
```

### プロセス管理

```bash
# 実行中のプロセスを確認
ps aux | grep ruroiord

# プロセスを強制終了
pkill -f ruroiord
```

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. メモリ不足エラー

```bash
# スワップファイルを増やす
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=2048 に変更
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

#### 2. 権限エラー

```bash
# スクリプトに実行権限を付与
chmod +x *.sh

# ファイルの所有者を確認
ls -la
```

#### 3. ポート競合

```bash
# 使用中のポートを確認
sudo netstat -tulpn | grep :3001

# プロセスを終了
sudo kill -9 <PID>
```

#### 4. ビルドエラー

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install

# キャッシュをクリア
npm cache clean --force
```

### ログの確認

```bash
# アプリケーションログ
tail -f ~/Ruroiord/logs/app.log

# システムログ
sudo journalctl -u ruroiord -f

# エラーログ
tail -f ~/Ruroiord/logs/error.log
```

## 📈 パフォーマンス最適化

### 1. メモリ使用量の最適化

```bash
# 不要なサービスを無効化
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
```

### 2. GPUアクセラレーション

```bash
# GPUメモリを増やす
sudo nano /boot/config.txt
# gpu_mem=128 を追加
```

### 3. 自動更新の無効化

```bash
# 自動更新を無効化
sudo systemctl disable apt-daily.service
sudo systemctl disable apt-daily.timer
```

## 🔒 セキュリティ設定

### 1. ファイアウォール設定

```bash
# UFWを有効化
sudo ufw enable

# 必要なポートのみ開放
sudo ufw allow 3001
```

### 2. ユーザー権限の制限

```bash
# 専用ユーザーを作成
sudo adduser ruroiord
sudo usermod -aG sudo ruroiord
```

## 📞 サポート

問題が発生した場合は、以下の情報を収集してください：

1. エラーメッセージ
2. システム情報 (`uname -a`)
3. Node.jsバージョン (`node --version`)
4. ログファイルの内容

## 📝 更新履歴

- v1.0.0: 初回リリース
- Raspberry Pi 4対応
- 自動起動機能
- systemdサービス統合 