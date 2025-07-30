#!/bin/bash

# Ruroiord インストールスクリプト
# Raspberry Pi用

echo "📦 Ruroiord のインストールを開始します..."

# システムの更新
echo "🔄 システムを更新しています..."
sudo apt update && sudo apt upgrade -y

# Node.js 18のインストール
echo "📦 Node.js 18をインストールしています..."
if ! command -v node &> /dev/null; then
    # NodeSourceリポジトリを追加
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js は既にインストールされています"
fi

# npmの更新
echo "📦 npmを更新しています..."
sudo npm install -g npm@latest

# Gitのインストール（必要に応じて）
if ! command -v git &> /dev/null; then
    echo "📦 Gitをインストールしています..."
    sudo apt install -y git
fi

# 必要なシステムパッケージのインストール
echo "📦 必要なシステムパッケージをインストールしています..."
sudo apt install -y \
    build-essential \
    python3 \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf

# プロジェクトディレクトリの作成
PROJECT_DIR="$HOME/Ruroiord"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📁 プロジェクトディレクトリを作成しています..."
    mkdir -p "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# プロジェクトファイルが存在しない場合はコピー
if [ ! -f "package.json" ]; then
    echo "❌ package.jsonが見つかりません"
    echo "プロジェクトファイルを正しい場所に配置してください"
    exit 1
fi

# 依存関係のインストール
echo "📦 依存関係をインストールしています..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依存関係のインストールに失敗しました"
    exit 1
fi

# 環境変数ファイルの作成
if [ ! -f .env ]; then
    echo "📝 環境変数ファイルを作成しています..."
    cp env.example .env
fi

# 起動スクリプトに実行権限を付与
chmod +x start-ruroiord.sh

# デスクトップショートカットの作成
echo "🖥️ デスクトップショートカットを作成しています..."
cat > "$HOME/Desktop/Ruroiord.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Ruroiord
Comment=Discordライクなチャットアプリケーション
Exec=$PROJECT_DIR/start-ruroiord.sh
Icon=$PROJECT_DIR/assets/icon.png
Terminal=true
Categories=Network;InstantMessaging;
EOF

chmod +x "$HOME/Desktop/Ruroiord.desktop"

echo "✅ インストールが完了しました！"
echo ""
echo "🎉 Ruroiord のインストールが正常に完了しました"
echo ""
echo "📋 次の手順："
echo "1. デスクトップの「Ruroiord」アイコンをダブルクリックして起動"
echo "2. または、ターミナルで以下を実行："
echo "   cd $PROJECT_DIR"
echo "   ./start-ruroiord.sh"
echo ""
echo "🔧 トラブルシューティング："
echo "- アプリが起動しない場合は、ターミナルで実行してエラーメッセージを確認"
echo "- 権限エラーが発生した場合は：chmod +x start-ruroiord.sh"
echo ""
echo "📞 サポートが必要な場合は、ログファイルを確認してください" 