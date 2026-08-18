#!/usr/bin/env node
// tools/api-fields.js — 从官方混淆代码自动提取某 API 的响应字段候选清单
// 用法: node tools/api-fields.js <api路径片段> [--chunk=<文件子串>] [--ctx=400]
// 原理: 在 static/js/*.js 中定位包含该路径的代码段（API 表定义与消费 chunk），
//       提取段内所有 `['字段名']` 引用并去重（模板渲染字段集中在消费 chunk）。
// 输出: 候选字段清单（按出现次数排序）→ 可直接作为 fixture 字段名参考。
const fs = require('fs');
const path = require('path');

const api = process.argv[2];
if (!api) { console.log('用法: node tools/api-fields.js <api路径片段> [--chunk=子串] [--ctx=400]'); process.exit(1); }
const chunkFilter = (process.argv.find(a => a.startsWith('--chunk=')) || '').split('=')[1] || '';
const ctxN = Number((process.argv.find(a => a.startsWith('--ctx=')) || '--ctx=400').split('=')[1]) || 400;

const jsDir = path.join(__dirname, '..', 'reference', 'cdn-www', 'static', 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
if (chunkFilter) {
  files.sort((a, b) => (b.includes(chunkFilter) ? 1 : 0) - (a.includes(chunkFilter) ? 1 : 0));
}

const fields = new Map();
let apiDef = null;

for (const f of files) {
  const s = fs.readFileSync(path.join(jsDir, f), 'utf-8');
  let i = 0;
  while ((i = s.indexOf(api, i)) !== -1) {
    const seg = s.slice(Math.max(0, i - ctxN), i + ctxN);
    // 提取 ['xxx'] 字段引用
    const re = /\[['"]([A-Za-z][A-Za-z0-9_]*)['"]\]/g;
    let m;
    while ((m = re.exec(seg)) !== null) {
      const k = m[1];
      if (['config', 'headers', 'data', 'status', 'url', 'test', 'toString', 'valueOf', 'length', 'push', 'forEach', 'map', 'filter', 'find', 'concat', 'slice', 'indexOf', 'includes', 'substring', 'split', 'join', 'keys', 'assign', 'default', '__esModule', 'prototype', 'constructor'].includes(k)) continue;
      fields.set(k, (fields.get(k) || 0) + 1);
    }
    // 记录 API 表定义（url 字段所在）
    if (!apiDef && s.indexOf("'url':'" + api.replace(/\//g, '\\/')) === -1 && /'url':[^,]*'\/?'/.test(seg.slice(-200))) {
      const dm = seg.slice(-200).match(/'desc':'([^']*)'/);
      apiDef = dm ? dm[1] : null;
    }
    i += api.length;
  }
}

const sorted = [...fields.entries()].sort((a, b) => b[1] - a[1]);
console.log('API:', api, '| 消费代码命中文件数:', new Set([...files].filter(f => fs.readFileSync(path.join(jsDir, f), 'utf-8').includes(api))).size);
console.log('候选响应字段（按频率）:');
sorted.slice(0, 40).forEach(([k, n]) => console.log('  ' + k + '  (' + n + ')'));