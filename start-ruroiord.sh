#!/bin/bash

# Ruroiord デスクトップアプリケーション起動スクリプト
# Raspberry Pi用

echo "🚀 Ruroiord を起動しています..."

# プロジェクトディレクトリに移動
cd "$(dirname "$0")"

# 環境変数ファイルが存在しない場合は作成
if [ ! -f .env ]; then
    echo "📝 環境変数ファイルを作成しています..."
    cp env.example .env
    echo "✅ 環境変数ファイルが作成されました"
fi

# 依存関係がインストールされているかチェック
if [ ! -d "node_modules" ]; then
    echo "📦 依存関係をインストールしています..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依存関係のインストールに失敗しました"
        exit 1
    fi
    echo "✅ 依存関係のインストールが完了しました"
fi

# フロントエンドをビルド
echo "🔨 フロントエンドをビルドしています..."
npm run build:renderer
if [ $? -ne 0 ]; then
    echo "❌ フロントエンドのビルドに失敗しました"
    exit 1
fi

# Electronメインプロセスをビルド
echo "🔨 Electronメインプロセスをビルドしています..."
npm run build:main
if [ $? -ne 0 ]; then
    echo "❌ Electronメインプロセスのビルドに失敗しました"
    exit 1
fi

# バックエンドサーバーをバックグラウンドで起動
echo "🌐 バックエンドサーバーを起動しています..."
npm run server:dev &
SERVER_PID=$!

# サーバーが起動するまで少し待機
sleep 3

# サーバーが正常に起動しているかチェック
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ バックエンドサーバーの起動に失敗しました"
    exit 1
fi

echo "✅ バックエンドサーバーが起動しました (PID: $SERVER_PID)"

# Electronアプリケーションを起動
echo "🖥️ デスクトップアプリケーションを起動しています..."
echo "🎤 ボイスチャット機能が利用可能です"
echo "🎙️ 音声録音機能も利用可能です"
npm start

# アプリケーションが終了したらサーバーも停止
echo "🛑 アプリケーションを終了しています..."
kill $SERVER_PID 2>/dev/null
echo "✅ Ruroiord が正常に終了しました" 