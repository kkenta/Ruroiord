#!/bin/bash

# Ruroiord 停止スクリプト
# macOS用

echo "🛑 Ruroiord を停止しています..."

# プロジェクトディレクトリに移動
cd "$(dirname "$0")"

# Ruroiord関連のプロセスを検索して停止
echo "🔍 Ruroiord関連のプロセスを検索しています..."

# Node.jsプロセス（バックエンドサーバー）を停止
PIDS=$(pgrep -f "node.*server/index.ts")
if [ ! -z "$PIDS" ]; then
    echo "🌐 バックエンドサーバーを停止しています..."
    echo "$PIDS" | xargs kill -TERM
    sleep 2
    # 強制終了が必要な場合
    PIDS=$(pgrep -f "node.*server/index.ts")
    if [ ! -z "$PIDS" ]; then
        echo "⚠️ 強制終了しています..."
        echo "$PIDS" | xargs kill -KILL
    fi
    echo "✅ バックエンドサーバーを停止しました"
else
    echo "ℹ️ バックエンドサーバーは実行されていません"
fi

# Electronプロセスを停止
PIDS=$(pgrep -f "Electron.*Ruroiord")
if [ ! -z "$PIDS" ]; then
    echo "🖥️ Electronアプリケーションを停止しています..."
    echo "$PIDS" | xargs kill -TERM
    sleep 2
    # 強制終了が必要な場合
    PIDS=$(pgrep -f "Electron.*Ruroiord")
    if [ ! -z "$PIDS" ]; then
        echo "⚠️ 強制終了しています..."
        echo "$PIDS" | xargs kill -KILL
    fi
    echo "✅ Electronアプリケーションを停止しました"
else
    echo "ℹ️ Electronアプリケーションは実行されていません"
fi

# 開発サーバー（Vite）を停止
PIDS=$(pgrep -f "vite")
if [ ! -z "$PIDS" ]; then
    echo "🔧 開発サーバーを停止しています..."
    echo "$PIDS" | xargs kill -TERM
    sleep 2
    # 強制終了が必要な場合
    PIDS=$(pgrep -f "vite")
    if [ ! -z "$PIDS" ]; then
        echo "⚠️ 強制終了しています..."
        echo "$PIDS" | xargs kill -KILL
    fi
    echo "✅ 開発サーバーを停止しました"
else
    echo "ℹ️ 開発サーバーは実行されていません"
fi

# macOS特有のプロセス停止
echo "🍎 macOS特有のプロセスを停止しています..."

# アプリケーションバンドルを停止
osascript -e 'quit app "Ruroiord"' 2>/dev/null || true

# Activity Monitorでプロセスを確認
echo "✅ Ruroiord の停止が完了しました"

# 実行中のプロセスを確認
echo ""
echo "📊 現在のRuroiord関連プロセス："
pgrep -f "ruroiord\|Electron.*Ruroiord\|node.*server/index.ts\|vite" || echo "実行中のプロセスはありません"

# メモリ使用量の確認
echo ""
echo "💾 メモリ使用量："
ps aux | grep -E "(ruroiord|Electron|node.*server)" | grep -v grep | awk '{print $2, $3, $4, $11}' | head -5 