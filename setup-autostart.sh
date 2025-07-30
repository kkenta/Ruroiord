#!/bin/bash

# Ruroiord 自動起動設定スクリプト
# Raspberry Pi用

echo "🔧 Ruroiord の自動起動設定を行います..."

# プロジェクトディレクトリに移動
cd "$(dirname "$0")"

# systemdサービスファイルをコピー
echo "📋 systemdサービスファイルを設定しています..."
sudo cp ruroiord.service /etc/systemd/system/

# サービスを有効化
echo "✅ サービスを有効化しています..."
sudo systemctl daemon-reload
sudo systemctl enable ruroiord.service

echo "✅ 自動起動設定が完了しました！"
echo ""
echo "📋 管理コマンド："
echo "  サービス開始: sudo systemctl start ruroiord"
echo "  サービス停止: sudo systemctl stop ruroiord"
echo "  サービス再起動: sudo systemctl restart ruroiord"
echo "  ステータス確認: sudo systemctl status ruroiord"
echo "  ログ確認: sudo journalctl -u ruroiord -f"
echo ""
echo "🔄 次回起動時にRuroiordが自動的に開始されます" 