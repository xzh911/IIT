#!/usr/bin/env bash
# web/dev/serve.sh — 本地静态服务（构建产物 web/www）
# 用法: bash web/dev/serve.sh [port]
# 注意: 用 background_process 工具常驻运行
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-8088}"
exec python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$PWD/www"
