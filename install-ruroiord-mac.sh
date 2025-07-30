#!/bin/bash

# Ruroiord インストールスクリプト
# macOS用

echo "📦 Ruroiord のインストールを開始します..."

# Homebrewのインストール確認
if ! command -v brew &> /dev/null; then
    echo "🍺 Homebrewをインストールしています..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # M1/M2 Macの場合のPATH設定
    if [[ $(uname -m) == 'arm64' ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    echo "✅ Homebrew は既にインストールされています"
fi

# Node.jsのインストール確認
if ! command -v node &> /dev/null; then
    echo "📦 Node.jsをインストールしています..."
    brew install node@18
    
    # PATH設定
    echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
    export PATH="/opt/homebrew/bin:$PATH"
else
    echo "✅ Node.js は既にインストールされています"
    node --version
fi

# npmの更新
echo "📦 npmを更新しています..."
npm install -g npm@latest

# Gitのインストール確認
if ! command -v git &> /dev/null; then
    echo "📦 Gitをインストールしています..."
    brew install git
else
    echo "✅ Git は既にインストールされています"
fi

# Xcode Command Line Toolsの確認
if ! xcode-select -p &> /dev/null; then
    echo "🔧 Xcode Command Line Toolsをインストールしています..."
    xcode-select --install
    echo "⚠️  Xcode Command Line Toolsのインストールが完了したら、このスクリプトを再実行してください"
    exit 1
else
    echo "✅ Xcode Command Line Tools は既にインストールされています"
fi

# プロジェクトディレクトリの確認
PROJECT_DIR="$PWD"
echo "📁 プロジェクトディレクトリ: $PROJECT_DIR"

# プロジェクトファイルが存在しない場合はエラー
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
chmod +x start-ruroiord-mac.sh
chmod +x stop-ruroiord.sh

# アプリケーションアイコンの作成（オプション）
echo "🖥️ アプリケーションアイコンを作成しています..."
mkdir -p assets
# アイコンファイルが存在しない場合はデフォルトアイコンを作成
if [ ! -f "assets/icon.png" ]; then
    echo "📝 デフォルトアイコンを作成しています..."
    # 簡単なアイコンを作成（実際のプロジェクトでは適切なアイコンを使用）
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > assets/icon.png
fi

# アプリケーションのビルド
echo "🔨 アプリケーションをビルドしています..."
npm run build:renderer
npm run build:main

if [ $? -ne 0 ]; then
    echo "❌ ビルドに失敗しました"
    exit 1
fi

echo "✅ インストールが完了しました！"
echo ""
echo "🎉 Ruroiord のインストールが正常に完了しました"
echo ""
echo "📋 次の手順："
echo "1. ターミナルで以下を実行して起動："
echo "   ./start-ruroiord-mac.sh"
echo ""
echo "2. または、開発モードで起動："
echo "   npm run dev"
echo ""
echo "🔧 トラブルシューティング："
echo "- 権限エラーが発生した場合は：chmod +x *.sh"
echo "- Node.jsのバージョンが古い場合は：brew upgrade node"
echo "- 依存関係でエラーが発生した場合は：rm -rf node_modules && npm install"
echo ""
echo "📞 サポートが必要な場合は、ログファイルを確認してください" 