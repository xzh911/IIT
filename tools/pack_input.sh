#!/usr/bin/env bash
# 打包 GitHub Actions 构建输入资产 etax-input.zip
# 内容：官方 ipa（必需）+ cdn-www（可选，避免 CI 直接拉 CDN 被区域网络拦截）
# 用法: bash tools/pack_input.sh [--with-www]
set -uo pipefail
cd "$(dirname "$0")/.."

OUT="/home/xxx/workload/IIT/etax-input.zip"
IPA="reference/inputs/个人所得税 2.3.3.ipa"
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/etax-input"
[ -f "$IPA" ] || { echo "缺少 $IPA"; exit 1; }
cp "$IPA" "$STAGE/etax-input/its.ipa"

if [ "${1:-}" = "--with-www" ] && [ -d reference/cdn-www ]; then
  mkdir -p "$STAGE/etax-input/www"
  cp -r reference/cdn-www/. "$STAGE/etax-input/www/"
  echo "已附带 cdn-www ($(find reference/cdn-www -type f | wc -l) 文件)"
fi

( cd "$STAGE" && zip -qr "$OUT" etax-input )
echo "打包完成: $OUT ($(du -h "$OUT" | cut -f1))"
echo "请上传到 https://github.com/xzh911/IIT/releases 作为资产 etax-input.zip"
