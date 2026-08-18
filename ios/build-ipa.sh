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

ICONSET="ios/platforms/ios/ETaxSim/Assets.xcassets/AppIcon.appiconset"
ICON_SRC="$ICONSET/orig/AppIcon60x60@2x.png"

echo "[1/6] 生成全套 App 图标（原版 CgBI PNG -> sips 转标准 PNG + 缩放）"
# 原版图标为 Apple CgBI 格式，标准工具不可读；sips(macOS) 可解码。
# 尺寸清单与 Assets.xcassets/AppIcon.appiconset/Contents.json 一致。
gen_icon() { sips -s format png -z "$1" "$1" "$ICON_SRC" --out "$ICONSET/$2" >/dev/null; }
gen_icon 20  icon-20.png
gen_icon 40  icon-20@2x.png
gen_icon 60  icon-20@3x.png
gen_icon 29  icon-29.png
gen_icon 58  icon-29@2x.png
gen_icon 87  icon-29@3x.png
gen_icon 40  icon-40.png
gen_icon 80  icon-40@2x.png
gen_icon 120 icon-40@3x.png
gen_icon 50  icon-50.png
gen_icon 100 icon-50@2x.png
gen_icon 72  icon-72.png
gen_icon 144 icon-72@2x.png
gen_icon 76  icon-76.png
gen_icon 152 icon-76@2x.png
gen_icon 167 icon-83.5@2x.png
gen_icon 120 icon-60@2x.png
gen_icon 180 icon-60@3x.png
gen_icon 48  icon-24@2x.png
gen_icon 55  icon-27.5@2x.png
gen_icon 88  icon-44@2x.png
gen_icon 172 icon-86@2x.png
gen_icon 196 icon-98@2x.png
gen_icon 1024 icon-1024.png
gen_icon 114 icon@2x.png
gen_icon 57  icon.png

echo "[2/6] 填充平台 www（web/www -> $APP_DIR/www）"
rm -rf "$APP_DIR/www" && mkdir -p "$APP_DIR/www"
cp -R web/www/. "$APP_DIR/www/"

echo "[3/6] 覆盖 cordova.js 为复刻 mock（api-stub 拦截全部请求，零外联）"
cp web/overlays/cordova.js "$APP_DIR/www/cordova.js"
rm -f "$APP_DIR/www/cordova_plugins.js"
rm -rf "$APP_DIR/www/plugins"

echo "[4/6] xcodebuild 免签构建（CODE_SIGNING_ALLOWED=NO）"
mkdir -p "$OUT"
# 注: 工程无共享 xcscheme，用 -target 而非 -scheme（target 名 = ETaxSim）
xcodebuild -project "$XCODEPROJ" -target "$SCHEME" \
  -configuration Release -sdk iphoneos \
  CODE_SIGNING_ALLOWED=NO \
  CONFIGURATION_BUILD_DIR="$PWD/$OUT/app" build 2>&1 | tail -30

echo "[5/6] 打包 IPA（免签，SideStore 重签）"
rm -rf "$OUT/Payload" && mkdir -p "$OUT/Payload"
cp -R "$OUT/app/ETaxSim.app" "$OUT/Payload/"
rm -rf "$OUT/Payload/ETaxSim.app/_CodeSignature" 2>/dev/null || true
(cd "$OUT" && zip -qr etax-sim.ipa Payload)
ls -lh "$OUT/etax-sim.ipa"
echo "[6/6] 完成: $OUT/etax-sim.ipa（SideStore 导入安装）"
