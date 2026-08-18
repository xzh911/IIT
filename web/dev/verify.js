// web/dev/verify.mjs — 容器 WebKit 渲染验证
// 用法: wk web/dev/verify.mjs [名称] [等待秒数] [url]
// 功能:
//   - 加载复刻前端（默认 http://host.containers.internal:8088/index.html）
//   - 收集 console 错误/警告、stub 请求日志、外联请求
//   - 截图到 web/dev/diffs/<名称>.png
//   - 输出页面状态 JSON（DOM 文本摘要 / 路由 / stub 统计）
const { webkit } = require('playwright');

const name = process.argv[2] || 'verify';
const waitSec = Number(process.argv[3] || 10);
const url = process.argv[4] || 'http://host.containers.internal:8088/index.html';

(async () => {
  const b = await webkit.launch();
  const ctx = await b.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const p = await ctx.newPage();
  const consoleErrors = [];
  const outbound = [];
  const blocked = [];
  p.on('console', m => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
  });
  p.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 300)));
  p.on('request', r => {
    const u = r.url();
    if (/^https?:\/\//.test(u) && !u.includes('host.containers.internal') && !u.startsWith('http://127.0.0.1') && !u.startsWith('http://localhost')) {
      outbound.push(u);
    }
  });

  await p.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(e => consoleErrors.push('GOTO: ' + e.message));
  // 首次启动协议弹窗：「同意」按钮（根组件全局触发，会遮挡截图与 DOM 文本）
  for (let attempt = 0; attempt < 5; attempt++) {
    const agreed = await p.evaluate(() => {
      const btn = [...document.querySelectorAll('*')].find(e =>
        e.textContent.trim() === '同意' && e.children.length === 0 &&
        /agreement-dialog|zdj-confirm/i.test((e.closest('.agreement-dialog, .zdj-confirm') || {}).className || ''));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!agreed) break;
    await p.waitForTimeout(1500);
  }
  await p.evaluate(() => {
    const skip = [...document.querySelectorAll('*')].find(e => e.textContent.trim() === '跳过' && e.children.length === 0);
    if (skip) skip.click();
  });
  await p.waitForTimeout(waitSec * 1000);

  const state = await p.evaluate(() => {
    const stub = window.__API_STUB__;
    const log = (stub && stub.getLog ? stub.getLog() : []).slice(-120);
    return {
      title: document.title,
      url: location.href,
      bodyChildren: document.body ? document.body.children.length : 0,
      appHtmlLen: (document.querySelector('.app-container') || {}).innerHTML ? document.querySelector('.app-container').innerHTML.length : 0,
      appText: (document.querySelector('.app-container') || { innerText: '' }).innerText.slice(0, 400),
      stubLog: log,
      hasDevPanel: !!document.getElementById('etax-dev-panel'),
      mode: stub && stub.mode ? stub.mode() : 'n/a',
    };
  });

  const fs = require('fs');
  const outDir = __dirname + '/diffs';
  fs.mkdirSync(outDir, { recursive: true });
  const shot = outDir + '/' + name + '.png';
  await p.screenshot({ path: shot });
  fs.writeFileSync(outDir + '/' + name + '.json', JSON.stringify(state, null, 2));

  const hits = state.stubLog.filter(e => e.kind === 'hit').length;
  const misses = state.stubLog.filter(e => e.kind === 'miss').length;
  const blockedN = state.stubLog.filter(e => e.kind.startsWith('blocked')).length;

  console.log('=== 结果:', name, '===');
  console.log('URL:', state.url, '| appHtmlLen:', state.appHtmlLen, '| mode:', state.mode);
  console.log('stub: hit=' + hits, 'miss=' + misses, 'blocked=' + blockedN);
  console.log('outbound requests:', outbound.length);
  outbound.slice(0, 10).forEach(u => console.log('  [out]', u.slice(0, 160)));
  console.log('consoleErrors:', consoleErrors.length);
  consoleErrors.slice(0, 12).forEach(e => console.log('  [err]', e));
  if (state.stubLog.length) {
    console.log('--- stub 请求日志（近 120 条）---');
    state.stubLog.forEach(e => {
      console.log('  [' + e.kind + ']', (e.method || '').toUpperCase(), (e.path || e.url || e.service || ''));
    });
  }
  console.log('截图:', shot);
  await b.close();
})();
