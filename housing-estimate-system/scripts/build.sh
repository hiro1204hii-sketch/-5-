#!/usr/bin/env bash
# 単一サービス用ビルド: フロントをビルドしてバックエンドの配信ディレクトリへ配置する。
set -euo pipefail
cd "$(dirname "$0")/.."   # housing-estimate-system/

echo "[build] フロントエンドをビルド..."
( cd frontend && npm install && npm run build )

echo "[build] バックエンドをビルド..."
( cd backend && npm install && npm run build )

echo "[build] フロントをバックエンドへ配置 (backend/dist/public)..."
rm -rf backend/dist/public
mkdir -p backend/dist/public
cp -r frontend/dist/* backend/dist/public/

echo "[build] 完了"
