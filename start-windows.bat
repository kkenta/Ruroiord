@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Ruroiord Windows環境専用起動スクリプト

echo 🚀 Ruroiord を起動しています...

REM プロジェクトディレクトリに移動
cd /d "%~dp0"

REM 環境変数ファイルが存在しない場合は作成
if not exist .env (
    echo 📝 環境変数ファイルを作成しています...
    echo PORT=3002 > .env
    echo NODE_ENV=development >> .env
    echo CLIENT_URL=http://localhost:3003 >> .env
    echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production >> .env
    echo DB_PATH=./ruroiord.db >> .env
    echo ✅ 環境変数ファイルが作成されました
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
)

REM 既存のプロセスを停止
echo 🛑 既存のプロセスを停止しています...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im electron.exe >nul 2>&1

REM バックエンドサーバーを起動
echo 🌐 バックエンドサーバーを起動しています...
start /b npm run server:dev

REM サーバーが起動するまで少し待機
timeout /t 3 /nobreak >nul

REM Viteサーバーを起動
echo 🔧 Viteサーバーを起動しています...
start /b npm run dev:renderer

REM サーバーが起動するまで少し待機
timeout /t 5 /nobreak >nul

REM Electronメインプロセスをビルド
echo 🔨 Electronメインプロセスをビルドしています...
npm run build:main
if !errorlevel! neq 0 (
    echo ❌ Electronメインプロセスのビルドに失敗しました
    pause
    exit /b 1
)

REM Electronアプリケーションを起動
echo 🖥️ デスクトップアプリケーションを起動しています...
echo 🎤 ボイスチャット機能が利用可能です
echo 🎙️ 音声録音機能も利用可能です
echo.
echo 💡 アプリケーションを停止するには、このウィンドウで Ctrl+C を押してください
echo.

set NODE_ENV=development
npx electron .

echo.
echo 🛑 アプリケーションを終了しています...
pause 
