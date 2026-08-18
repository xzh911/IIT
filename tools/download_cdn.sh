#!/usr/bin/env bash
# 阶段1：从税务总局热更新 CDN 全量下载 www 到 reference/cdn-www/
# Python 多线程 + 断点续传 + md5 校验
# 用法: bash tools/download_cdn.sh
set -uo pipefail

BASE="https://wcdn.etax.chinatax.gov.cn/chcpAssets"
OUT="/home/xxx/workload/IIT/reference/cdn-www"
UA="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
JOBS="${JOBS:-12}"
export OUT BASE UA

mkdir -p "$OUT"
cd "$OUT"

echo "== 拉取 chcp.json + chcp.manifest =="
curl -sfL -A "$UA" "$BASE/chcp.json" -o chcp.json
curl -sfL -A "$UA" "$BASE/chcp.manifest" -o chcp.manifest

python3 - "$OUT" "$BASE" "$UA" "$JOBS" <<'PYEOF'
import json, os, sys, hashlib, urllib.request, concurrent.futures

out, base, ua, jobs = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
manifest = json.load(open(os.path.join(out, "chcp.manifest")))
print(f"manifest 文件数: {len(manifest)}")

need = []
for f in manifest:
    rel, want = f["file"], f["hash"]
    dest = os.path.join(out, rel)
    if os.path.exists(dest) and hashlib.md5(open(dest, "rb").read()).hexdigest() == want:
        continue
    need.append((rel, want))
print(f"待下载: {len(need)} (已存在/校验通过: {len(manifest)-len(need)})")

def fetch(item):
    rel, want = item
    dest = os.path.join(out, rel)
    os.makedirs(os.path.dirname(dest) or out, exist_ok=True)
    tmp = dest + ".tmp"
    try:
        req = urllib.request.Request(base + "/" + rel, headers={"User-Agent": ua})
        with urllib.request.urlopen(req, timeout=45) as r:
            data = r.read()
        if hashlib.md5(data).hexdigest() != want:
            return f"HASH: {rel}"
        with open(tmp, "wb") as f:
            f.write(data)
        os.replace(tmp, dest)
        return None
    except Exception as e:
        try:
            os.remove(tmp)
        except OSError:
            pass
        return f"FAIL: {rel} ({type(e).__name__})"

bad = 0
with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as ex:
    for i, res in enumerate(ex.map(fetch, need), 1):
        if res:
            print(res)
            bad += 1
        if i % 300 == 0:
            print(f"  ... {i}/{len(need)}")

ok = cbad = miss = 0
for f in manifest:
    rel, want = f["file"], f["hash"]
    dest = os.path.join(out, rel)
    if not os.path.exists(dest):
        miss += 1; continue
    if hashlib.md5(open(dest, "rb").read()).hexdigest() == want:
        ok += 1
    else:
        cbad += 1
print(f"完成: OK={ok} BAD={cbad} MISS={miss} / {len(manifest)}  (中途异常={bad})")
PYEOF
