@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Ruroiord 停止スクリプト
REM Windows用

echo 🛑 Ruroiord を停止しています...

REM プロジェクトディレクトリに移動
cd /d "%~dp0"

REM Ruroiord関連のプロセスを検索して停止
echo 🔍 Ruroiord関連のプロセスを検索しています...

REM Node.jsプロセス（バックエンドサーバー）を停止
echo 🌐 バックエンドサーバーを停止しています...
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr "server"') do (
    echo プロセス %%i を停止しています...
    taskkill /pid %%i /f >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ プロセス %%i を停止しました
    )
)

REM Electronプロセスを停止
echo 🖥️ Electronアプリケーションを停止しています...
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq electron.exe" /fo csv') do (
    echo プロセス %%i を停止しています...
    taskkill /pid %%i /f >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ プロセス %%i を停止しました
    )
)

REM 開発サーバー（Vite）を停止
echo 🔧 開発サーバーを停止しています...
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr "vite"') do (
    echo プロセス %%i を停止しています...
    taskkill /pid %%i /f >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ プロセス %%i を停止しました
    )
)

REM npmプロセスも停止
echo 📦 npmプロセスを停止しています...
taskkill /im npm.exe /f >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ npmプロセスを停止しました
)

echo ✅ Ruroiord の停止が完了しました

REM 実行中のプロセスを確認
echo.
echo 📊 現在のRuroiord関連プロセス：
tasklist /fi "imagename eq node.exe" /fo csv | findstr "server\|vite" || echo 実行中のプロセスはありません
tasklist /fi "imagename eq electron.exe" /fo csv || echo Electronプロセスはありません

pause 
