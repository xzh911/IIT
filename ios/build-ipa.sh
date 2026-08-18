#!/usr/bin/env bash
# ============================================================
# build-ipa.sh — 最小 Cordova 壳构建（本地/CI 共用）
# 流程: 填平台 www(web/www) → 覆盖 mock cordova.js → xcodebuild 免签 → zip IPA
# 产物: ios/out/etax-sim.ipa（免签，SideStore 设备端 Apple ID 重签安装）
# 前置: bash web/build.sh 已产出 web/www（本脚本会检查）
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."

APP_DIR="ios/platforms/ios"
XCODEPROJ="ios/platforms/ios/ETaxSim.xcodeproj"
OUT="ios/out"
SCHEME="ETaxSim"

[ -d web/www ] || { echo "缺少 web/www，先运行: bash web/build.sh"; exit 1; }

echo "[1/4] 填充平台 www（web/www -> $APP_DIR/www）"
rm -rf "$APP_DIR/www" && mkdir -p "$APP_DIR/www"
cp -R web/www/. "$APP_DIR/www/"

echo "[2/4] 覆盖 cordova.js 为复刻 mock（api-stub 拦截全部请求，零外联）"
cp web/overlays/cordova.js "$APP_DIR/www/cordova.js"
rm -f "$APP_DIR/www/cordova_plugins.js"
rm -rf "$APP_DIR/www/plugins"

echo "[3/4] xcodebuild 免签构建（CODE_SIGNING_ALLOWED=NO）"
mkdir -p "$OUT"
# 注: 工程无共享 xcscheme，用 -target 而非 -scheme（target 名 = ETaxSim）
xcodebuild -project "$XCODEPROJ" -target "$SCHEME" \
  -configuration Release -sdk iphoneos \
  CODE_SIGNING_ALLOWED=NO \
  CONFIGURATION_BUILD_DIR="$PWD/$OUT/app" build 2>&1 | tail -30

echo "[4/4] 打包 IPA（免签，SideStore 重签）"
rm -rf "$OUT/Payload" && mkdir -p "$OUT/Payload"
cp -R "$OUT/app/ETaxSim.app" "$OUT/Payload/"
rm -rf "$OUT/Payload/ETaxSim.app/_CodeSignature" 2>/dev/null || true
(cd "$OUT" && zip -qr etax-sim.ipa Payload)
ls -lh "$OUT/etax-sim.ipa"
echo "完成: $OUT/etax-sim.ipa（SideStore 导入安装）"
