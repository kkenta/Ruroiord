@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Ruroiord デスクトップアプリケーション起動スクリプト
REM Windows用

echo 🚀 Ruroiord を起動しています...

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
)

REM フロントエンドをビルド
echo 🔨 フロントエンドをビルドしています...
npm run build:renderer
if !errorlevel! neq 0 (
    echo ❌ フロントエンドのビルドに失敗しました
    pause
    exit /b 1
)

REM Electronメインプロセスをビルド
echo 🔨 Electronメインプロセスをビルドしています...
npm run build:main
if !errorlevel! neq 0 (
    echo ❌ Electronメインプロセスのビルドに失敗しました
    pause
    exit /b 1
)

REM バックエンドサーバーをバックグラウンドで起動
echo 🌐 バックエンドサーバーを起動しています...
start /b npm run server:dev

REM サーバーが起動するまで少し待機
timeout /t 3 /nobreak >nul

echo ✅ バックエンドサーバーが起動しました

REM Electronアプリケーションを起動
echo 🖥️ デスクトップアプリケーションを起動しています...
echo 🎤 ボイスチャット機能が利用可能です
echo 🎙️ 音声録音機能も利用可能です
npm start

REM アプリケーションが終了したらサーバーも停止
echo 🛑 アプリケーションを終了しています...
call stop-ruroiord.bat
echo ✅ Ruroiord が正常に終了しました
pause 
