// web/dev/sweep.mjs — 批量路由巡检（容器 WebKit）
// 用法: wk web/dev/sweep.mjs <逗号分隔路由> [每页等待秒]
// 例:   wk web/dev/sweep.mjs /zdj-service,/zdj-pending-tasks,/zdj-message,../messages 12
// 对每个路由: 加载 → 跳引导 → push 路由 → 等待 → 记录 URL/文本/stub 日志 → 截图
// 汇总输出: web/dev/diffs/sweep-report.json（miss 清单 = 待 mock 接口清单）
const { webkit } = require('playwright');

const routes = (process.argv[2] || '').split(',').filter(Boolean);
const waitSec = Number(process.argv[3] || 12);
if (!routes.length) {
  console.log('用法: wk web/dev/sweep.mjs route1,route2,... [秒]');
  process.exit(1);
}

(async () => {
  const b = await webkit.launch();
  const ctx = await b.newContext({
    userAgent: 'ETaxClient/2.3.3 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const p = await ctx.newPage();
  await p.goto('http://host.containers.internal:8088/index.html', { waitUntil: 'load', timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(5000);
  // 首次启动协议弹窗（「个人信息及隐私保护政策」同意/不同意，根组件全局触发）：
  // 点击「同意」写入 homeAgreementSuccess=true 后消失；不处理则遮挡后续所有截图
  for (let attempt = 0; attempt < 5; attempt++) {
    const agreed = await p.evaluate(() => {
      const btns = [...document.querySelectorAll('*')];
      const btn = btns.find(e => e.textContent.trim() === '同意' && e.children.length === 0 &&
        /agreement-dialog|zdj-confirm/i.test((e.closest('.agreement-dialog, .zdj-confirm') || {}).className || ''));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (!agreed) break;
    await p.waitForTimeout(1500);
  }
  await p.evaluate(() => {
    const skip = [...document.querySelectorAll('*')].find(e => e.textContent.trim() === '跳过' && e.children.length === 0);
    if (skip) skip.click();
  });
  await p.waitForTimeout(2000);

  const fs = require('fs');
  const outDir = __dirname + '/diffs';
  fs.mkdirSync(outDir, { recursive: true });
  const report = { generated: new Date().toISOString(), pages: [] };

  for (const rt of routes) {
    await p.evaluate((r) => {
      let vm = null;
      for (const n of document.querySelectorAll('*')) {
        const v = n.__vue__;
        if (v && v.$router && !vm) vm = v;
      }
      if (vm) vm.$router.push(r);
    }, rt);
    await p.waitForTimeout(waitSec * 1000);
    const s = await p.evaluate(() => {
      const c = document.querySelector('.app-container');
      const stub = window.__API_STUB__;
      const log = (stub && stub.getLog ? stub.getLog() : []).slice(-200);
      return {
        url: location.href,
        text: c ? c.innerText.slice(0, 600) : '',
        log: log.map(e => ({ kind: e.kind, method: e.method || '', path: e.path || e.url || e.service || '' })),
      };
    });
    const misses = s.log.filter(e => e.kind === 'miss').map(e => (e.method.toUpperCase() + ' ' + e.path));
    const hits = s.log.filter(e => e.kind === 'hit').length;
    const safe = rt.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'root';
    await p.screenshot({ path: outDir + '/sweep-' + safe + '.png' });
    report.pages.push({ route: rt, url: s.url, text: s.text.slice(0, 400), hits, misses: [...new Set(misses)] });
    console.log('== ' + rt + ' (' + s.url.split('#')[1] + ') hits=' + hits + ' miss=' + [...new Set(misses)].length);
    [...new Set(misses)].forEach(m => console.log('   MISS ' + m));
    if (s.text) console.log('   文本: ' + JSON.stringify(s.text.slice(0, 120)));
  }
  fs.writeFileSync(outDir + '/sweep-report.json', JSON.stringify(report, null, 2));
  console.log('报告: web/dev/diffs/sweep-report.json');
  await b.close();
})();