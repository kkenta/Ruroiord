@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Ruroiord 開発モード起動スクリプト
REM Windows用

echo 🚀 Ruroiord 開発モードを起動しています...

REM プロジェクトディレクトリに移動
cd /d "%~dp0"

REM 環境変数ファイルが存在しない場合は作成
if not exist .env (
    echo 📝 環境変数ファイルを作成しています...
    copy env.example .env >nul
    if !errorlevel! equ 0 (
        echo ✅ 環境変数ファイルが作成されました
    ) else (
        echo ❌ 環境変数ファイルの作成に失敗しました
        pause
        exit /b 1
    )
)

REM 依存関係がインストールされているかチェック
if not exist node_modules (
    echo 📦 依存関係をインストールしています...
    npm install
    if !errorlevel! neq 0 (
        echo ❌ 依存関係のインストールに失敗しました
        pause
        exit /b 1
    )
    echo ✅ 依存関係のインストールが完了しました
) else (
    echo ✅ 依存関係は既にインストールされています
)

REM 開発モードで起動（フロントエンドとメインプロセスを同時に起動）
echo 🔧 開発モードで起動しています...
echo 🎤 ボイスチャット機能が利用可能です
echo 🎙️ 音声録音機能も利用可能です
echo.
echo 💡 開発モードでは、コードの変更が自動的に反映されます
echo 💡 アプリケーションを停止するには、このウィンドウで Ctrl+C を押してください
echo.

npm run dev

echo.
echo 🛑 開発モードを終了しています...
pause 
