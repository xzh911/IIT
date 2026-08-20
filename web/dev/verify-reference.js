// 严格的官方参考状态验证（Playwright WebKit）。
// 用法：
//   wk web/dev/verify-reference.js --list
//   wk web/dev/verify-reference.js --validate-manifest
//   wk web/dev/verify-reference.js img-3952-taxproof-slider-initial [等待秒] [url]
//   wk web/dev/verify-reference.js all [等待秒] [url]
//
// 与旧 verify.js / sweep.js 并存，不改变它们的参数和宽松诊断行为。
const { webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'reference-cases.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const selector = process.argv[2] || '--list';
const waitSec = Number(process.argv[3] || 3);
const baseUrl = process.argv[4] || 'http://host.containers.internal:8088/index.html';
const outputRoot = path.join(__dirname, 'diffs', 'reference');

function fail(message) {
  console.error('ERROR:', message);
  process.exitCode = 1;
}

function mergeCase(raw) {
  const defaults = manifest.defaults || {};
  return {
    ...defaults,
    ...raw,
    viewport: { ...(defaults.viewport || {}), ...(raw.viewport || {}) },
    fixtureSeed: { ...(defaults.fixtureSeed || {}), ...(raw.fixtureSeed || {}) },
    query: raw.query || defaults.query || {},
    scroll: { ...(defaults.scroll || {}), ...(raw.scroll || {}) },
    maskRegions: raw.maskRegions && raw.maskRegions.length ? raw.maskRegions : (defaults.maskRegions || []),
    allowedMisses: [...(defaults.allowedMisses || []), ...(raw.allowedMisses || [])]
  };
}

function validateManifest() {
  const errors = [];
  const ids = new Set();
  const required = ['id', 'referenceImage', 'viewport', 'fixtureSeed', 'query', 'uiState', 'scroll', 'maskRegions'];
  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!Array.isArray(manifest.cases) || manifest.cases.length < 27) {
    errors.push(`cases must contain at least the original 27 entries (got ${(manifest.cases || []).length})`);
  }
  for (const raw of manifest.cases || []) {
    const c = mergeCase(raw);
    required.forEach(key => {
      if (c[key] === undefined) errors.push(`${raw.id || '<missing id>'}: missing ${key}`);
    });
    if (ids.has(c.id)) errors.push(`${c.id}: duplicate id`);
    ids.add(c.id);
    if (!fs.existsSync(path.resolve(__dirname, '..', '..', c.referenceImage))) {
      errors.push(`${c.id}: missing referenceImage ${c.referenceImage}`);
    }
    const vp = c.viewport || {};
    if (c.kind === 'screen' && (vp.width !== 402 || vp.height !== 874 || vp.deviceScaleFactor !== 3 || vp.browser !== 'webkit')) {
      errors.push(`${c.id}: screen viewport must be WebKit 402x874 @3`);
    }
    if (c.runnable !== false && !c.route) errors.push(`${c.id}: runnable case needs a route`);
    if (!Array.isArray(c.maskRegions)) errors.push(`${c.id}: maskRegions must be an array`);
    if (!Array.isArray((c.uiState || {}).actions)) errors.push(`${c.id}: uiState.actions must be an array`);
  }
  return errors;
}

function normalizePath(value) {
  try {
    const u = new URL(value, baseUrl);
    return u.pathname.replace(/\/+$/, '') || '/';
  } catch (_) {
    return String(value || '').split('?')[0].replace(/\/+$/, '') || '/';
  }
}

function isAllowedMiss(entry, allowlist) {
  const method = String(entry.method || '').toUpperCase();
  const entryPath = normalizePath(entry.path || entry.url || entry.service || '');
  return allowlist.some(rule => {
    const allowedMethod = String(rule.method || '*').toUpperCase();
    return (allowedMethod === '*' || allowedMethod === method) && normalizePath(rule.path) === entryPath;
  });
}

function isLocalUrl(value) {
  if (!/^https?:/i.test(value)) return true;
  try {
    const u = new URL(value);
    const base = new URL(baseUrl);
    return u.origin === base.origin || ['localhost', '127.0.0.1', 'host.containers.internal'].includes(u.hostname);
  } catch (_) {
    return false;
  }
}

async function acceptStartupDialogs(page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const clicked = await page.evaluate(() => {
      const candidates = [...document.querySelectorAll('button,a,div,span')];
      const agree = candidates.find(el => el.children.length === 0 && el.textContent.trim() === '同意' &&
        /agreement-dialog|zdj-confirm/i.test((el.closest('.agreement-dialog, .zdj-confirm') || {}).className || ''));
      if (agree) { agree.click(); return 'agree'; }
      const skip = candidates.find(el => el.children.length === 0 && el.textContent.trim() === '跳过');
      if (skip) { skip.click(); return 'skip'; }
      return '';
    });
    if (!clicked) {
      // 首页功能引导的“跳过”文案可能在按钮子节点中，直接点击叶节点不会触发
      // 组件监听；提升到最近的可点击祖先，保持严格截图不被引导遮罩污染。
      const skipped = await page.evaluate(() => {
        const leaf = [...document.querySelectorAll('*')]
          .find(el => el.textContent.trim() === '跳过' && el.children.length === 0);
        if (!leaf) return false;
        const target = leaf.closest('button,a,[role="button"],.guide-skip,.skip') || leaf;
        target.click();
        return true;
      });
      if (skipped) {
        await page.waitForTimeout(500);
        continue;
      }
      // 引导的“跳过”有些版本由带子节点的组件渲染，DOM 叶节点匹配不到。
      let dismissed = false;
      for (const text of ['知道了', '我知道了', '跳过']) {
        const dismiss = page.getByText(text, { exact: true }).last();
        if (await dismiss.count() && await dismiss.isVisible().catch(() => false)) {
          await dismiss.click({ force: true });
          await page.waitForTimeout(500);
          dismissed = true;
          break;
        }
      }
      if (dismissed) continue;
      break;
    }
    await page.waitForTimeout(500);
  }
}

async function routeToCase(page, c) {
  const result = await page.evaluate(({ route, query }) => {
    let vm = null;
    for (const node of document.querySelectorAll('*')) {
      const candidate = node.__vue__;
      if (candidate && candidate.$router) { vm = candidate; break; }
    }
    if (!vm) return { ok: false, reason: 'Vue router not found' };
    try {
      const nav = vm.$router.replace({ path: route, query: query || {} });
      if (nav && typeof nav.catch === 'function') nav.catch(() => {});
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: String(error) };
    }
  }, {
    route: c.entryRoute || c.route,
    query: c.entryRoute ? (c.entryQuery || {}) : c.query
  });
  if (!result.ok) throw new Error(result.reason);
}

async function clickExactText(page, text) {
  return page.evaluate(value => {
    const visible = el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    };
    const matches = [...document.querySelectorAll('button,a,[role="button"],li,span,div')]
      .filter(el => el.children.length === 0 && el.textContent.trim() === value && visible(el));
    if (!matches.length) return false;
    matches[0].click();
    return true;
  }, text);
}

async function setCarouselFrame(page, index) {
  return page.evaluate(frame => {
    const selectors = ['.swiper-pagination-bullet', '.van-swipe__indicator', '.mint-swipe-indicator'];
    for (const selector of selectors) {
      const items = [...document.querySelectorAll(selector)];
      if (items[frame]) { items[frame].click(); return selector; }
    }
    return '';
  }, index);
}

async function freezeHomeNotice(page, text) {
  return page.evaluate(targetText => {
    const noticePattern = /(?:虚假退税宣传|严防电信网络诈骗|谨防退税骗局)/;
    const visible = el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const node = [...document.querySelectorAll('span,p,div')]
      .filter(el => !el.children.length && noticePattern.test(el.textContent || '') && visible(el))[0];
    if (!node) return false;
    node.textContent = targetText;
    const host = node.parentElement || node;
    host.style.animationPlayState = 'paused';
    host.style.transition = 'none';
    return true;
  }, text);
}

async function setHomePromoFrame(page, index) {
  return page.evaluate(frame => {
    const image = document.querySelector('.zty-banner-swiper .zty-swiper-img');
    if (!image || frame < 0 || frame > 5) return '';
    const number = String(frame + 1).padStart(2, '0');
    image.src = `./static/images/home-promo-${number}.png`;
    image.setAttribute('data-reference-frame', String(frame));
    return image.getAttribute('src') || '';
  }, Number(index));
}

async function dragSliderToEnd(page) {
  const selectors = ['#nc .btn_slide', '#nc .nc_iconfont', '#nc .etax-nc-grab', '.nc-container .btn_slide', '.afs-slider-handle', '[data-afs-slider-handle]'];
  for (const selector of selectors) {
    const handle = page.locator(selector).first();
    if (await handle.count() && await handle.isVisible().catch(() => false)) {
      const box = await handle.boundingBox();
      const track = await handle.locator('xpath=..').boundingBox().catch(() => null);
      if (!box) continue;
      const startX = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const endX = track ? track.x + track.width - box.width / 2 - 2 : 390;
      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(endX, y, { steps: 18 });
      await page.mouse.up();
      return selector;
    }
  }
  return '';
}

async function applyActions(page, actions) {
  const results = [];
  for (const action of actions || []) {
    let ok = false;
    let detail = '';
    if (action.type === 'clickText') ok = await clickExactText(page, action.text);
    else if (action.type === 'click') {
      const target = page.locator(action.selector).nth(Number(action.index || 0));
      ok = !!(await target.count()) && await target.isVisible().catch(() => false);
      if (ok) await target.click();
    } else if (action.type === 'carouselFrame') {
      detail = await setCarouselFrame(page, action.index);
      ok = !!detail;
    } else if (action.type === 'homePromoFrame') {
      detail = await setHomePromoFrame(page, action.index);
      ok = !!detail;
    } else if (action.type === 'freezeHomeNotice') {
      ok = await freezeHomeNotice(page, action.text);
    } else if (action.type === 'sliderToEnd') {
      detail = await dragSliderToEnd(page);
      ok = !!detail;
    } else if (action.type === 'wait') {
      await page.waitForTimeout(Number(action.ms || 0));
      ok = true;
    } else {
      detail = `unsupported action: ${action.type}`;
    }
    results.push({ ...action, ok, detail });
    if (!ok && action.required !== false) throw new Error(detail || `action failed: ${action.type}`);
    await page.waitForTimeout(350);
  }
  return results;
}

async function scrollCase(page, scroll) {
  if (!scroll) return null;
  return page.evaluate(({ container, x, y }) => {
    if (!container || container === 'window') {
      window.scrollTo(Number(x || 0), Number(y || 0));
      return {
        container: 'window',
        scrollLeft: window.scrollX,
        scrollTop: window.scrollY,
        scrollWidth: document.scrollingElement.scrollWidth,
        scrollHeight: document.scrollingElement.scrollHeight,
        clientWidth: document.scrollingElement.clientWidth,
        clientHeight: document.scrollingElement.clientHeight
      };
    }
    const el = document.querySelector(container);
    if (!el) throw new Error(`scroll container not found: ${container}`);
    el.scrollTo(Number(x || 0), Number(y || 0));
    return {
      container,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
      scrollWidth: el.scrollWidth,
      scrollHeight: el.scrollHeight,
      clientWidth: el.clientWidth,
      clientHeight: el.clientHeight
    };
  }, scroll);
}

async function collectState(page) {
  return page.evaluate(() => {
    const stub = window.__API_STUB__;
    const log = (stub && stub.getLog ? stub.getLog() : []).slice(-300);
    const root = document.querySelector('.app-container') || document.querySelector('#app');
    const visibleMedia = root ? [...root.querySelectorAll('img,svg,canvas,video,button,input')].filter(el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 1 && r.height > 1 && s.display !== 'none' && s.visibility !== 'hidden';
    }).length : 0;
    const text = root ? (root.innerText || '').trim() : '';
    const scrollContainers = [...document.querySelectorAll('*')].map(el => {
      const style = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : '',
        overflowY: style.overflowY,
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight
      };
    }).filter(item => item.scrollHeight > item.clientHeight + 1 && /auto|scroll/.test(item.overflowY));
    let vueRoute = null;
    for (const node of document.querySelectorAll('*')) {
      if (node.__vue__ && node.__vue__.$route) {
        vueRoute = { path: node.__vue__.$route.path, fullPath: node.__vue__.$route.fullPath };
        break;
      }
    }
    return {
      title: document.title,
      url: location.href,
      vueRoute,
      rootFound: !!root,
      rootHtmlLength: root ? root.innerHTML.length : 0,
      textLength: text.length,
      // expectedText may intentionally target a lower scrolled section (for example IMG_3951).
      // Keep enough deterministic page text for assertions; reports remain small at 10k chars.
      text: text.slice(0, 10000),
      visibleMedia,
      scrollContainers,
      stubLog: log.map(entry => ({
        kind: String(entry.kind || ''),
        method: String(entry.method || ''),
        path: String(entry.path || entry.url || entry.service || '')
      })),
      mode: stub && stub.mode ? stub.mode() : 'n/a'
    };
  });
}

async function runCase(browser, raw) {
  const c = mergeCase(raw);
  const caseDir = path.join(outputRoot, c.id);
  fs.mkdirSync(caseDir, { recursive: true });
  if (c.runnable === false) {
    const skipped = { id: c.id, status: 'skipped', reason: c.note || 'non-runnable reference artifact' };
    fs.writeFileSync(path.join(caseDir, 'report.json'), JSON.stringify(skipped, null, 2));
    console.log(`SKIP ${c.id}: ${skipped.reason}`);
    return skipped;
  }

  const consoleErrors = [];
  const pageErrors = [];
  const outbound = [];
  const blockedRequests = [];
  const badResponses = [];
  const context = await browser.newContext({
    userAgent: 'ETaxClient/2.3.3 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    viewport: { width: c.viewport.width, height: c.viewport.height },
    deviceScaleFactor: c.viewport.deviceScaleFactor
  });
  await context.addInitScript(seed => {
    // 官方 bundle 在首页初始化时会产生一个无 reason 的 rejection；它没有堆栈、
    // 不影响页面状态。仅过滤严格为 undefined 的这一种浏览器噪声，其余 rejection
    // 与 pageerror 仍由下方监听捕获并使严格验证失败。
    addEventListener('unhandledrejection', event => {
      if (event.reason === undefined) event.preventDefault();
    });
    let value = Number(seed.randomSeed || 1) >>> 0;
    Math.random = () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
    if (seed.fixedTime) {
      const NativeDate = Date;
      const fixed = NativeDate.parse(seed.fixedTime);
      class FixedDate extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [fixed])); }
        static now() { return fixed; }
      }
      Object.setPrototypeOf(FixedDate, NativeDate);
      globalThis.Date = FixedDate;
    }
    // 严格参考截图都处于功能引导已完成状态。预置官方 guideList 契约，避免
    // 首次启动遮罩改变页面滚动/遮住首页专题；case 自带 seed 仍可覆盖此默认值。
    const guideList = {
      'guide1-home-ndhs': true,
      'guide2-home-zdfw': true,
      'guide3-home-dclsx': true,
      'guide4-tasks-bt': true,
      'guide5-service-bt': true,
      'guide6-service-ndhs': true,
      'guide7-message-tab': true,
      'guide8-user-tab': true
    };
    localStorage.setItem('guideList', JSON.stringify(guideList));
    for (const [key, stored] of Object.entries(seed.localStorage || {})) localStorage.setItem(key, String(stored));
    globalThis.__REFERENCE_FIXTURE_SEED__ = seed.name || '';
  }, c.fixtureSeed);

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 500));
  });
  page.on('pageerror', error => pageErrors.push(String(error).slice(0, 500)));
  page.on('request', request => {
    if (!isLocalUrl(request.url())) outbound.push(request.url());
  });
  page.on('requestfailed', request => blockedRequests.push(`${request.method()} ${request.url()} :: ${(request.failure() || {}).errorText || 'failed'}`));
  page.on('response', response => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  const runnerErrors = [];
  let actions = [];
  let scrollResult = null;
  try {
    await page.goto(baseUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1000);
    await acceptStartupDialogs(page);
    await routeToCase(page, c);
    await page.waitForTimeout(1200);
    // 引导层可能在首个路由渲染后才挂载；再清一次，避免遮住参考状态。
    await acceptStartupDialogs(page);
    actions = await applyActions(page, c.uiState.actions);
    scrollResult = await scrollCase(page, c.scroll);
    await page.waitForTimeout(Math.max(0, waitSec) * 1000);
  } catch (error) {
    runnerErrors.push(String(error && error.stack || error).slice(0, 1000));
  }

  const state = await collectState(page).catch(error => ({ collectionError: String(error) }));
  const actualPath = path.join(caseDir, 'actual.png');
  await page.screenshot({ path: actualPath }).catch(error => runnerErrors.push(`screenshot: ${error}`));

  const misses = (state.stubLog || []).filter(entry => entry.kind === 'miss');
  const disallowedMisses = misses.filter(entry => !isAllowedMiss(entry, c.allowedMisses));
  const stubBlocked = (state.stubLog || []).filter(entry => entry.kind.startsWith('blocked'));
  const expectedMissing = (c.uiState.expectedText || []).filter(text => !(state.text || '').includes(text));
  const routeMismatch = !state.vueRoute || state.vueRoute.path !== c.route;
  const whiteScreen = !state.rootFound || state.rootHtmlLength < 20 || (state.textLength === 0 && state.visibleMedia === 0);
  const failures = [];
  if (runnerErrors.length) failures.push(`runner errors: ${runnerErrors.length}`);
  if (disallowedMisses.length) failures.push(`non-whitelisted API misses: ${disallowedMisses.length}`);
  if (outbound.length) failures.push(`outbound requests: ${new Set(outbound).size}`);
  if (stubBlocked.length || blockedRequests.length) failures.push(`blocked/failed requests: ${stubBlocked.length + blockedRequests.length}`);
  if (badResponses.length) failures.push(`HTTP >=400 responses: ${badResponses.length}`);
  if (whiteScreen) failures.push('white/empty screen');
  if (pageErrors.length) failures.push(`page errors: ${pageErrors.length}`);
  if (consoleErrors.length) failures.push(`console errors: ${consoleErrors.length}`);
  if (routeMismatch) failures.push(`route mismatch: expected ${c.route}, got ${(state.vueRoute || {}).path || '<none>'}`);
  if (expectedMissing.length) failures.push(`expected text missing: ${expectedMissing.join(', ')}`);

  const report = {
    id: c.id,
    status: failures.length ? 'failed' : 'passed',
    referenceImage: c.referenceImage,
    viewport: c.viewport,
    route: c.route,
    query: c.query,
    fixtureSeed: c.fixtureSeed,
    uiState: c.uiState.name,
    scroll: c.scroll,
    scrollResult,
    maskRegions: c.maskRegions,
    actions,
    state,
    diagnostics: {
      failures,
      runnerErrors,
      disallowedMisses,
      allowedMissesObserved: misses.filter(entry => isAllowedMiss(entry, c.allowedMisses)),
      outbound: [...new Set(outbound)],
      stubBlocked,
      blockedRequests: [...new Set(blockedRequests)],
      badResponses: [...new Set(badResponses)],
      pageErrors,
      consoleErrors,
      expectedMissing,
      routeMismatch,
      whiteScreen
    },
    artifacts: { actual: path.relative(process.cwd(), actualPath) }
  };
  fs.writeFileSync(path.join(caseDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`${failures.length ? 'FAIL' : 'PASS'} ${c.id}${failures.length ? ` — ${failures.join('; ')}` : ''}`);
  await context.close();
  return report;
}

(async () => {
  const manifestErrors = validateManifest();
  if (selector === '--list') {
    manifest.cases.forEach(c => console.log(`${c.id}\t${c.runnable === false ? 'artifact' : c.route}\t${c.referenceImage}`));
    return;
  }
  if (selector === '--validate-manifest') {
    if (manifestErrors.length) manifestErrors.forEach(fail);
    else console.log(`OK: ${manifest.cases.length} reference cases; screen baseline is WebKit 402x874 @3`);
    return;
  }
  if (manifestErrors.length) {
    manifestErrors.forEach(fail);
    return;
  }
  const selected = selector === 'all' ? manifest.cases : manifest.cases.filter(c => c.id === selector);
  if (!selected.length) {
    fail(`unknown case: ${selector}; use --list`);
    return;
  }

  fs.mkdirSync(outputRoot, { recursive: true });
  const browser = await webkit.launch();
  const reports = [];
  try {
    for (const c of selected) reports.push(await runCase(browser, c));
  } finally {
    await browser.close();
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    selected: selector,
    total: reports.length,
    passed: reports.filter(r => r.status === 'passed').length,
    failed: reports.filter(r => r.status === 'failed').length,
    skipped: reports.filter(r => r.status === 'skipped').length,
    cases: reports.map(r => ({ id: r.id, status: r.status, failures: (r.diagnostics || {}).failures || [] }))
  };
  fs.writeFileSync(path.join(outputRoot, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(`SUMMARY total=${summary.total} passed=${summary.passed} failed=${summary.failed} skipped=${summary.skipped}`);
  if (summary.failed) process.exitCode = 1;
})().catch(error => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
