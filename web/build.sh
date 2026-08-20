#!/usr/bin/env bash
# ============================================================
# web/build.sh — 复刻前端构建（基线 + O1-O5 overlays + fixtures 内联）
# 产物: web/www/（gitignore，不入库）
# 用法: bash web/build.sh [--keep-src]
#   --keep-src  保留 www/index.orig.html 与 www/overlays-src/ 调试副本（默认不保留）
# 流程:
#   1. 基线 = reference/cdn-www 全量复制
#   2. O3  telemetry-remove: index.html 移除高德外联 + yata 替换为 noop
#   3. 注入 overlay 脚本标签（fixtures-inline / api-stub / config-overrides / dev-entry）
#   4. O1  cordova.js / O2  api-stub.js / O4  dev-entry.js / O5  config-overrides.js 复制
#   5. fixtures-inline.js 生成（reference + custom 两套路由）
#   6. server.json / chcp.json 本地化（O5 静态部分）
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

KEEP_SRC=0
[ "${1:-}" = "--keep-src" ] && KEEP_SRC=1

ROOT="$(cd .. && pwd)"
SRC="$ROOT/reference/cdn-www"
WWW="$PWD/www"
OVL="$PWD/overlays"
FIX="$PWD/fixtures"

rm -rf "$WWW"
cp -r "$SRC" "$WWW"
rm -f "$WWW/index.orig.html"

echo "[1/6] 基线复制完成: $SRC -> $WWW"

# ---- O3 + 注入: index.html 补丁（python，防 sed 转义地狱）----
python3 - "$WWW/index.html" "$OVL" "$KEEP_SRC" <<'PYEOF'
import sys, re
html_path, ovl_dir, keep = sys.argv[1], sys.argv[2], bool(int(sys.argv[3]))
html = open(html_path, encoding='utf-8').read()
orig = html

# 1) 移除高德地图外联脚本（唯一真实外域请求源）
html = re.sub(r'<script[^>]*src=["\']?https?://webapi\.amap\.com[^>]*>', '', html)

# 2) yata 遥测脚本替换为 noop 存根（app.js 仅调用 setConfig/track）
html = re.sub(
    r'<script[^>]*src=["\']?\./yata_v_0_1_11\.js[^>]*>\s*</script>',
    '<script>window.yata={setConfig:function(){return window.yata;},track:function(){},init:function(){}};</script>',
    html,
)

html = re.sub(r"<script>var noCaptcha;</script>\s*<script src=\./nc\.js></script>\s*<script src=\./AliyunCaptcha\.js></script>", '', html)

# 业务 bundle 在 cordova overlay 执行前就可能读取 network-information 常量；必须早于 sdk/app 声明。
connection_bootstrap = (
    '<script>window.Connection=window.Connection||{UNKNOWN:"unknown",ETHERNET:"ethernet",'
    'WIFI:"wifi",CELL_2G:"2g",CELL_3G:"3g",CELL_4G:"4g",CELL:"cellular",NONE:"none"};</script>'
)
if '<script src=./sdk.js>' in html:
    html = html.replace('<script src=./sdk.js>', connection_bootstrap + '<script src=./sdk.js>', 1)

# 3) 注入 overlay 脚本（在 cordova.js 之前，保证 api-stub 先就绪）
inject = (
    '<script src="./fixtures-inline.js"></script>'
    '<script src="./api-stub.js"></script>'
    '<script src="./config-overrides.js"></script>'
    '<script src="./dev-entry.js"></script><script src="./mock-login.js"></script>'
    '<script src="./afs-slider.js"></script>'
    '<script src="./home-annual-card.js"></script>'
)
if '<script src=./cordova.js>' in html:
    html = html.replace('<script src=./cordova.js>', inject + '<script src=./cordova.js>', 1)
else:
    # 兜底：在 manifest chunk 前注入
    m = re.search(r'<script src=\./static/js/manifest[^>]*>', html)
    if m:
        html = html[:m.start()] + inject + html[m.start():]
    else:
        sys.exit('FATAL: 找不到 cordova.js 注入点')

open(html_path, 'w', encoding='utf-8').write(html)
if keep:
    open(html_path.replace('index.html', 'index.orig.html'), 'w', encoding='utf-8').write(orig)
print('      index.html: amap 移除 / yata noop / overlay 注入完成')
PYEOF

echo "[2/6] index.html 补丁完成"

cp "$OVL/cordova.js"           "$WWW/cordova.js"
cp "$OVL/api-stub.js"          "$WWW/api-stub.js"
cp "$OVL/config-overrides.js"  "$WWW/config-overrides.js"
cp "$OVL/dev-entry.js"         "$WWW/dev-entry.js"
cp "$OVL/mock-login.js"        "$WWW/mock-login.js"
cp "$OVL/afs-slider.js"        "$WWW/afs-slider.js"
cp "$OVL/home-annual-card.js"  "$WWW/home-annual-card.js"
echo "[3/6] O1/O2/O4/O5 overlay 复制完成"

# 非 JSON 资源（svg/png 等）复制到 static/images
mkdir -p "$WWW/static/images"
for f in "$FIX"/reference/*.svg "$FIX"/reference/*.png "$FIX"/reference/*.js "$FIX"/custom/*.svg "$FIX"/custom/*.png; do
    [ -f "$f" ] && cp -f "$f" "$WWW/static/images/"
done
# 首页年度卡与 6 张宣传图属于 release-only 资源：本地来自 gitignored private/home，
# CI 从固定 Release home-assets-v1 下载。缺失或哈希不符必须中止，禁止静默发布缺图 IPA。
python3 "$ROOT/tools/verify-home-assets.py" "$FIX/private/home"
cp -f "$FIX/private/home/home-annual-card-full.png" "$WWW/static/images/"
for f in "$FIX"/private/home/home-promo-0[1-6].png; do cp -f "$f" "$WWW/static/images/"; done
python3 "$ROOT/tools/verify-home-assets.py" "$WWW/static/images"
cp -f "$FIX"/reference/menu-shim.js "$WWW/static/" 2>/dev/null || true
mkdir -p "$WWW/static/js"
for f in "$FIX"/reference/cjwt-*.js; do [ -f "$f" ] && cp -f "$f" "$WWW/static/js/"; done
echo "[3.5/6] fixture 图片资源复制完成"

# ---- fixtures-inline.js 生成 ----
python3 - "$FIX" "$WWW/fixtures-inline.js" <<'PYEOF'
import sys, json, os, datetime

fix_dir, out_path = sys.argv[1], sys.argv[2]

def load_routes(sub):
    """加载 fixtures/<sub>/*.json，合并每个文件内的 routes 数组或单条路由"""
    routes = []
    d = os.path.join(fix_dir, sub)
    if not os.path.isdir(d):
        return routes
    for fn in sorted(os.listdir(d)):
        if not fn.endswith('.json'):
            continue
        p = os.path.join(d, fn)
        try:
            obj = json.load(open(p, encoding='utf-8'))
        except Exception as e:
            print('WARN: fixture 解析失败 %s: %s' % (p, e))
            continue
        if isinstance(obj, list):
            for r in obj:
                if isinstance(r, dict) and r.get('match'):
                    r['_file'] = os.path.join(sub, fn)
                    routes.append(r)
        elif isinstance(obj, dict) and isinstance(obj.get('routes'), list):
            for r in obj['routes']:
                if isinstance(r, dict) and r.get('match'):
                    r['_file'] = os.path.join(sub, fn)
                    routes.append(r)
        elif isinstance(obj, dict) and obj.get('match'):
            obj['_file'] = os.path.join(sub, fn)
            routes.append(obj)
    return routes

ref = load_routes('reference')
cus = load_routes('custom')
meta = {
    'source': 'mock',
    'generated': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    'note': 'synthetic mock fixtures for offline replica; not official data',
}
js = 'window.__FIXTURES__ = ' + json.dumps({
    'meta': meta,
    'reference': {'routes': ref},
    'custom': {'routes': cus},
}, ensure_ascii=False, indent=1) + ';\n'
open(out_path, 'w', encoding='utf-8').write(js)
print('      fixtures-inline.js: reference=%d custom=%d' % (len(ref), len(cus)))
PYEOF

echo "[4/6] fixtures 内联完成"

# ---- O5 静态部分: server.json / chcp.json 本地化 ----
cat > "$WWW/server.json" <<'EOF'
{
  "SERVER_API": "/api/",
  "ANALYTICS_API": "",
  "HOTUPDATE_API": "",
  "source": "mock"
}
EOF
cat > "$WWW/chcp.json" <<'EOF'
{
  "name": "etax",
  "update": "none",
  "content_url": "local",
  "release": "offline-replica",
  "source": "mock"
}
EOF
echo "[5/6] server.json / chcp.json 本地化完成"

if [ "$KEEP_SRC" = "1" ]; then
    mkdir -p "$WWW/overlays-src"
    cp "$OVL"/*.js "$WWW/overlays-src/"
    echo "[6/6] --keep-src: 调试副本保留（www/overlays-src/）"
else
    echo "[6/6] 完成"
fi

echo "构建完成: $WWW"
