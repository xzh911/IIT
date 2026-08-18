#!/usr/bin/env node
// ============================================================
// tools/deob-materialize.js — 字符串表物化（零依赖启发式）
// 把 webcrack 拆出的模块文件里模块级 `var _$X = {K:"V", ...}` 常量表
// 的引用 `_$X.K` / `_$X['K']` 原地替换成字面量，便于 rg 全文搜索。
// 用法: node tools/deob-materialize.js <file.js> [file2.js ...]
//   或  node tools/deob-materialize.js <目录>   （递归处理目录下所有 .js）
// 输出: 原地改写（只对 web/deob 副本执行，勿动 reference/）
// ============================================================
const fs = require('fs');
const path = require('path');

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function materialize(src) {
  const m = src.match(/var (_\$[A-Za-z0-9_$]{1,8}) = (\{[\s\S]*?\n\});/);
  if (!m) return false;
  const name = m[1];
  const pairs = [...m[2].matchAll(/([A-Za-z_$][\w$]*)\s*:\s*("(?:\\.|[^"\\])*")/g)];
  if (!pairs.length) return false;
  let out = src;
  let hit = 0;
  for (const [, k, v] of pairs) {
    const re = new RegExp('(?:' + escRe(name) + '\\.' + k + "|" + escRe(name) + "\\['" + k + "\\'])", 'g');
    const after = out.replace(re, v);
    if (after !== out) { hit++; out = after; }
  }
  if (hit) { fs.writeFileSync(mFile, out); return hit; }
  return false;
}

let mFile;
const targets = process.argv.slice(2);
const files = [];
for (const t of targets) {
  const st = fs.statSync(t);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(t)) if (f.endsWith('.js')) files.push(path.join(t, f));
  } else if (st.isFile()) files.push(t);
}
let total = 0;
for (const f of files) {
  mFile = f;
  const n = materialize(fs.readFileSync(f, 'utf8'));
  if (n) { total += n; console.log('[ok] ' + f + ' 表键 ' + n + ' 个已物化'); }
}
console.log('完成: ' + files.length + ' 文件, 物化表 ' + total + ' 个');
