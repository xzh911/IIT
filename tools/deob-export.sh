#!/usr/bin/env bash
# ============================================================
# tools/deob-export.sh — webcrack 拆包提取（反混淆调查脚手架）
# 产物: web/deob/（gitignored，可随时重建）
#    web/deob/app/        app.js webpack 模块树（~1900 个模块文件）
#    web/deob/commons/    commons chunk 模块树
#    web/deob/chunks/*    各业务 chunk 模块树（--all 才拆）
# 用法: bash tools/deob-export.sh [--all]
# 调查方式: cd web/deob/app && rg -l "<接口路径>" . → 命中模块即 API 定义；
#           rg -l "<方法名>" . → 命中即消费端。配合物化脚本去表查。
# 注: webcrack 拒绝非空输出目录，脚本内每次先 rm -rf 对应目录。
# ============================================================
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$PWD/web/deob"
SRC="$PWD/web/www/static/js"
mkdir -p "$OUT/app" "$OUT/commons" "$OUT/chunks"

echo "[1/3] 拆 app.js..."
rm -rf "$OUT/app"
if npx -y webcrack "$SRC/app."*.js -o "$OUT/app" >/dev/null 2>&1; then
  echo "      app.js 模块数: $(find "$OUT/app" -maxdepth 1 -name '*.js' | wc -l)"
else
  echo "      app.js 拆包失败（见输出）"; exit 1
fi

echo "[2/3] 拆 commons..."
rm -rf "$OUT/commons"
if npx -y webcrack "$SRC/commons."*.js -o "$OUT/commons" >/dev/null 2>&1; then
  echo "      commons 模块数: $(find "$OUT/commons" -maxdepth 1 -name '*.js' | wc -l)"
else
  echo "      commons 拆包失败（见输出）"; exit 1
fi

if [ "${1:-}" = "--all" ]; then
  echo "[3/3] 拆全部业务 chunk..."
  for f in "$SRC"/*.js; do
    base=$(basename "$f")
    case "$base" in app.*|commons.*|manifest.*) continue;; esac
    out="$OUT/chunks/${base%.js}"
    rm -rf "$out"
    npx -y webcrack "$f" -o "$out" >/dev/null 2>&1 || true
  done
  echo "      全量 chunk 完成: $(find "$OUT/chunks" -name '*.js' | wc -l) 个模块"
else
  echo "[3/3] 跳过业务 chunk（用 --all 全量拆）"
fi
echo "完成: $OUT"
