// ============================================================
// O2: api-stub.js — 离线 mock 数据路由器（复刻层）
// 依赖: fixtures-inline.js 先加载（window.__FIXTURES__）
// 职责:
//   1. cordova.plugins.http.sendRequest → 按 fixtures 返回 mock 响应
//   2. SMGNativeJS.nativeRouter → 记录并返回 mock
//   3. 拦截跨域 XHR/fetch → 零外联兜底（不回退到真实网络）
// 响应格式与 cordova-plugin-advanced-http 一致:
//   success({status:200, url, headers:{'content-type':'application/json'},
//            data:<JSON 字符串>})   ← app.js MK5j 包装层会 JSON.parse
// 未命中 fixture 时走 failure（与官方接口超时/失败同路径，页面显示空态）
// ============================================================
(function () {
  'use strict';

  var LOG_KEY = 'etax_stub_log';
  var MODE_KEY = 'etax_fixture_mode';

  function getFixtures() {
    return window.__FIXTURES__ || { meta: {}, reference: { routes: [] }, custom: { routes: [] } };
  }

  function effectiveMode() {
    var m = 'reference';
    try { m = localStorage.getItem(MODE_KEY) || 'reference'; } catch (e) {}
    return m === 'custom' ? 'custom' : 'reference';
  }

  function routesFor(mode) {
    var f = getFixtures();
    var list = [];
    if (f.reference && f.reference.routes) list = list.concat(f.reference.routes);
    if (mode === 'custom' && f.custom && f.custom.routes) list = list.concat(f.custom.routes);
    return list;
  }

  // 运行时自定义覆盖层：/dev 面板编辑的内容存 localStorage['etax_custom_overrides']，
  // 优先于 fixtures 匹配（无需 rebuild，刷新即生效）
  function runtimeOverrides() {
    try {
      var raw = localStorage.getItem('etax_custom_overrides');
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function normalizePath(url) {
    try {
      var u = String(url || '');
      u = u.replace(/^https?:\/\/[^/]+/i, '');
      u = u.replace(/^\/+/, '');
      u = u.split('?')[0].split('#')[0];
      return u;
    } catch (e) { return String(url || ''); }
  }

  var PERSONAL_PROFILE_KEY = 'etax_personal_profile';
  var MASKED_ID = '3****************6';

  function defaultPersonalProfile() {
    return {
      xm: '张伟',
      sfzjlxMc: '居民身份证',
      sfzjlxDm: '201',
      sfzjhm: MASKED_ID,
      csrq: 631123200000,
      nsrsbh: MASKED_ID,
      gjhdqMc: '中国',
      jwrzsggjDm: '156',
      jwrzsggjMc: '中国',
      sjhm: '13800001234',
      xbDm: '1',
      mzDm: '01',
      xlDm: '30',
      dzyx: '',
      dzxx: [],
      source: 'mock',
    };
  }

  function readPersonalProfile() {
    var saved = {};
    var gs = {};
    try { saved = JSON.parse(localStorage.getItem(PERSONAL_PROFILE_KEY) || '{}'); } catch (e) {}
    try { gs = JSON.parse(localStorage.getItem('etax_global_state') || '{}'); } catch (e2) {}
    var profile = Object.assign(defaultPersonalProfile(), saved);
    if (gs.userName) profile.xm = gs.userName;
    // 查询接口只向普通页面提供脱敏号码；完整识别号仅在短信校验接口返回。
    profile.sfzjhm = MASKED_ID;
    profile.nsrsbh = MASKED_ID;
    profile.dzxx = Array.isArray(profile.dzxx) ? profile.dzxx : [];
    return profile;
  }

  function parseRequestData(options) {
    var body = options && (options.data !== undefined ? options.data : options.body);
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    return body && typeof body === 'object' ? body : {};
  }

  var INCOME_TYPE_RULES = [
    { code: '0100', text: /工资薪金/ },
    { code: '0200', text: /经营所得|个体工商户经营/ },
    { code: '0300', text: /利息[、,，]股息[、,，]红利/ },
    { code: '0400', text: /劳务报酬/ },
    { code: '0500', text: /稿酬/ },
    { code: '0600', text: /特许权使用费/ },
    { code: '0700', text: /财产租赁/ },
    { code: '0800', text: /财产转让/ },
    { code: '0900', text: /偶然所得/ },
  ];

  // IMG_3947-3951 的官方参考状态。只在严格 reference runner 显式选择该 seed
  // 时启用，避免改变 /dev 与 income_filter_probe 使用的经营所得 94000 动态数据。
  var OFFICIAL_INCOME_REFERENCE_SEED = 'official-income-img-3947-3951';
  var OFFICIAL_INCOME_REFERENCE_ROWS = [
    {
      skssqq: '2026-05-01', skssqz: '2026-05-31', sdxmDlDm: '0400',
      sdxmDlmc: '劳务报酬', grsdssdxmmc: '其他连续劳务报酬',
      ywlxDm: 'A061001020', ywlxmc: '一般劳务报酬',
      kjywrMc: '大连益签信息科技有限公司大连第一分公司',
      kjywrsbh: '91210283MAEXP6F19T', zgswjgMc: '国家税务总局庄河市税务局',
      sre: 9.6, ybtse: 0, sblsh: 'REF202605090000000001', mxxh: '1',
      nsrdah: 'REF210283202605000001', sbrq: 1780934400000,
    },
    {
      skssqq: '2026-05-01', skssqz: '2026-05-31', sdxmDlDm: '0400',
      sdxmDlmc: '劳务报酬', grsdssdxmmc: '其他连续劳务报酬',
      ywlxDm: 'A061001020', ywlxmc: '一般劳务报酬',
      kjywrMc: '淮安霖木网络科技有限公司',
      sre: 16.6, ybtse: 0, sblsh: 'REF202605090000000002', mxxh: '1',
      nsrdah: 'REF320800202605000002', sbrq: 1780934400000,
    },
  ];

  function useOfficialIncomeReference() {
    return window.__REFERENCE_FIXTURE_SEED__ === OFFICIAL_INCOME_REFERENCE_SEED;
  }

  function incomeTypeCode(item) {
    var code = String((item && item.sdxmDlDm) || '');
    if (/^\d{4}$/.test(code)) return code;
    var text = [item && item.grsdssdxmmc, item && item.sdxmDlmc, item && item.ywlxmc]
      .filter(Boolean).join('|');
    for (var i = 0; i < INCOME_TYPE_RULES.length; i++) {
      if (INCOME_TYPE_RULES[i].text.test(text)) return INCOME_TYPE_RULES[i].code;
    }
    return code;
  }

  function incomeTypeList(value) {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value !== 'string') return [];
    var text = value.trim();
    if (!text) return [];
    if (text.charAt(0) === '[') {
      try {
        var parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch (e) {}
    }
    return text.split(',').map(function (code) { return code.trim(); }).filter(Boolean);
  }

  function referenceFixture(match, method) {
    var fixtures = getFixtures();
    var routes = fixtures.reference && fixtures.reference.routes || [];
    for (var i = 0; i < routes.length; i++) {
      var route = routes[i];
      if (route.method && route.method.toLowerCase() !== method) continue;
      if (String(route.match || '').indexOf(match) !== -1) return route.data;
    }
    return null;
  }

  function dynamicIncomeList(options) {
    var body = parseRequestData(options);
    var selected = incomeTypeList(body.sdxmDms);
    var fixture = referenceFixture('cxNsmxList', 'post') || {};
    var fixtureData = fixture.data || {};
    var rows = useOfficialIncomeReference()
      ? OFFICIAL_INCOME_REFERENCE_ROWS
      : (Array.isArray(fixtureData.nsmxList) ? fixtureData.nsmxList : []);
    var filtered = rows.map(function (item) {
      return Object.assign({}, item, { sdxmDlDm: incomeTypeCode(item) });
    }).filter(function (item) {
      if (selected.indexOf(item.sdxmDlDm) === -1) return false;
      return !body.sdnd || String(item.skssqq || '').slice(0, 4) === String(body.sdnd);
    });
    var totals = filtered.reduce(function (sum, item) {
      sum.sre += Number(item.sre) || 0;
      sum.ybtse += Number(item.ybtse) || 0;
      return sum;
    }, { sre: 0, ybtse: 0 });
    var pageNum = Math.max(1, Number(body.pageNum) || 1);
    var pageSize = Math.max(1, Number(body.pageSize) || filtered.length || 1);
    var start = (pageNum - 1) * pageSize;
    return {
      code: 'SUCCESS',
      data: {
        nsmxList: filtered.slice(start, start + pageSize),
        sreHj: Math.round(totals.sre * 100) / 100,
        ybtseHj: Math.round(totals.ybtse * 100) / 100,
      },
    };
  }

  function dynamicIncomeDetail(options) {
    var body = parseRequestData(options);
    var fixture = referenceFixture('cxNsmxXq', 'post') || {};
    var detail = fixture.data || {};
    var listFixture = referenceFixture('cxNsmxList', 'post') || {};
    var rows = useOfficialIncomeReference()
      ? OFFICIAL_INCOME_REFERENCE_ROWS
      : (listFixture.data && listFixture.data.nsmxList || []);
    var row = rows.find(function (item) {
      return String(item.sblsh || '') === String(body.sblsh || '') &&
        (!body.mxxh || String(item.mxxh || '') === String(body.mxxh));
    });
    if (!row) return fixture;
    var official = useOfficialIncomeReference();
    var jbqk = Object.assign({}, detail.jbqkDetail || {}, {
      ywlxDm: row.ywlxDm,
      ywlxmc: row.ywlxmc,
      sdxmDlDm: incomeTypeCode(row),
      sdxmDlmc: row.sdxmDlmc,
      sdxmmc: row.grsdssdxmmc,
      kjywrMc: row.kjywrMc,
      sblsh: row.sblsh,
      mxxh: row.mxxh,
      sbmxxh: row.sbmxxh || row.mxxh,
      nsrdah: row.nsrdah,
      skssqq: new Date(row.skssqq + 'T00:00:00').getTime(),
      skssqz: new Date(row.skssqz + 'T00:00:00').getTime(),
      sbjlSre: row.sre,
      sbjlYbtse: row.ybtse,
    });
    if (official) {
      jbqk.sdxmDm = '0489';
      jbqk.sdxmmc = '其他连续劳务报酬';
      jbqk.kjywrsbh = row.kjywrsbh;
      jbqk.zgswjgMc = row.zgswjgMc;
      jbqk.jyqdMc = '其他';
      jbqk.sbrq = row.sbrq;
      // 参考记录是普通劳务报酬，不展示工资薪金专属的免申报/累计计税提示。
      jbqk.sfhm = null;
      jbqk.sfljsd = 'N';
    }
    var bq = Object.assign({}, detail.bqDetail || {}, official ? {
      sre: row.sre, fyje: 1.92, mssr: 0, jbjcfy: 5000, zjfkc: 0,
      zykcdjze: 0, zxkchj: 0, qtkchj: 0, xdsl: 0,
    } : { sre: row.sre });
    var skjs = Object.assign({}, detail.skjsDetail || {}, {
      ynse: row.ybtse,
      yjse: row.ybtse,
      ybtse: row.ybtse,
    });
    if (official) {
      skjs.ynssde = 0;
      skjs.sl1 = 0.03;
      skjs.sskcs = 0;
      skjs.jmse = 0;
    }
    return {
      code: 'SUCCESS',
      data: Object.assign({}, detail, {
        jbqkDetail: jbqk,
        bqDetail: bq,
        skjsDetail: skjs,
      }),
    };
  }

  function persistPersonalProfile(options) {
    var body = parseRequestData(options);
    var current = readPersonalProfile();
    var next = Object.assign({}, current, body, { source: 'mock' });
    var addressNames = {
      '110000': '北京市',
      '110105': '朝阳区',
      '110105017': '望京街道',
    };
    if (Array.isArray(body.dzxx)) {
      next.dzxx = body.dzxx.map(function (item) {
        var address = Object.assign({}, item);
        address.sjQhMc = address.sjQhMc || addressNames[address.sjQhdm] || '';
        address.dsQhMc = address.dsQhMc || addressNames[address.dsQhdm] || '';
        address.qxQhMc = address.qxQhMc || addressNames[address.qxQhdm] || '';
        address.xzjdQhMc = address.xzjdQhMc || addressNames[address.xzjdQhdm] || '';
        return address;
      });
    }
    next.sfzjhm = MASKED_ID;
    next.nsrsbh = MASKED_ID;
    try { localStorage.setItem(PERSONAL_PROFILE_KEY, JSON.stringify(next)); } catch (e) {}
  }

  function matchRoute(path, method) {
    var routes = routesFor(effectiveMode());
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      if (r.method && r.method.toLowerCase() !== String(method || 'get').toLowerCase()) continue;
      var m = String(r.match || '');
      if (!m) continue;
      if (r.exact) {
        if (path === m) return r;
      } else if (path.indexOf(m) !== -1) {
        return r;
      }
    }
    return null;
  }

  var log = [];

  // 动态路由：需要运行时计算值的接口（不进 JSON fixture）
  var DYNAMIC_ROUTES = [
    {
      match: 'common/system/globalsystemtime',
      data: function () {
        return { code: 'SUCCESS', data: Date.now() };
      },
    },
    {
      // P2 兜底：tab 点击前 gotoPage 调 POST /limit/check/{{gndm}}（menuCode，如 0107）
      // shape 未实证，先返回空 data；若 gotoPage 仍 abort 再从 HAR 翻真实形状
      match: 'limit/check/',
      data: function () {
        return { code: 'SUCCESS', data: {} };
      },
    },
    {
      // 收入纳税明细：按筛选页提交的所得类型和年度过滤，并从过滤结果重算合计。
      match: 'sb/yd/gg/cxNsmxList',
      method: 'post',
      data: dynamicIncomeList,
    },
    {
      // 明细沿用所点列表记录，避免离线静态详情与列表的所得类型、金额互相矛盾。
      match: 'sb/yd/gg/cxNsmxXq',
      method: 'post',
      data: dynamicIncomeDetail,
    },
    {
      // 用户基本信息：读 /dev 面板全局状态（userName），默认张伟
      match: 'zrr/jbxx/query',
      method: 'get',
      data: function () {
        return {
          code: 'SUCCESS',
          data: readPersonalProfile(),
        };
      },
    },
  ];

  function matchRoute(path, method) {
    var routes = routesFor(effectiveMode());
    var i;
    var overrides = runtimeOverrides();
    for (i = 0; i < overrides.length; i++) {
      var o = overrides[i];
      if (o.method && o.method.toLowerCase() !== String(method || 'get').toLowerCase()) continue;
      var om = String(o.match || '');
      if (!om) continue;
      if (o.exact ? path === om : path.indexOf(om) !== -1) return o;
    }
    for (i = 0; i < DYNAMIC_ROUTES.length; i++) {
      var dr = DYNAMIC_ROUTES[i];
      if (dr.method && dr.method.toLowerCase() !== String(method || 'get').toLowerCase()) continue;
      if (path.indexOf(dr.match) !== -1) return { dynamic: true, data: dr.data };
    }
    for (var j = 0; j < routes.length; j++) {
      var r = routes[j];
      if (r.method && r.method.toLowerCase() !== String(method || 'get').toLowerCase()) continue;
      var m = String(r.match || '');
      if (!m) continue;
      if (r.exact) {
        if (path === m) return r;
      } else if (path.indexOf(m) !== -1) {
        return r;
      }
    }
    return null;
  }

  // 手势密码页在第二次绘制一致后会先取 SM2 公钥，再提交设置接口。
  // 离线版没有服务端，必须给出一个合法曲线公钥；这里使用 SM2 标准基点
  // （对应测试私钥 1，仅用于本地加密流程占位，不承载真实凭据）。
  var OFFLINE_GESTURE_PUBLIC_KEY =
    '0432C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7' +
    'BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0';

  function offlineGesturePayload(path, method) {
    var verb = String(method || 'get').toLowerCase();
    var gesturePath = String(path || '').replace(/^web\//, '');
    if (verb === 'get' && gesturePath === 'zh/ssdl/smgm/gy/query') {
      return { code: 'SUCCESS', message: '', data: OFFLINE_GESTURE_PUBLIC_KEY };
    }
    if (verb === 'get' && gesturePath === 'zh/ssdl/status/get') {
      var enabled = false;
      try { enabled = !!localStorage.getItem('sssx'); } catch (e) {}
      // 官方页面会对响应执行 JSON.parse，因此这里必须返回字符串而不是布尔值。
      return { code: 'SUCCESS', message: '', data: enabled ? 'true' : 'false' };
    }
    if (verb === 'post' && gesturePath === 'zh/ssdl/verify') {
      return { code: 'SUCCESS', message: '', data: { ssgxuuid: 'offline-gesture-verify' } };
    }
    if (verb === 'post' && gesturePath === 'zh/ssdl/verfykey/find') {
      return { code: 'SUCCESS', message: '', data: 'offline-gesture-login' };
    }
    if (verb === 'post' && (
      gesturePath === 'zh/ssdl/set' ||
      gesturePath === 'zh/ssdl/xgssmm/set' ||
      gesturePath === 'zh/ssdl/wjssmm/set' ||
      gesturePath === 'zh/ssdl/deregister'
    )) {
      return { code: 'SUCCESS', message: '', data: {} };
    }
    return undefined;
  }

  window.__API_STUB__ = {
    version: 1,
    mode: effectiveMode,
    getLog: function () { return log; },
    clearLog: function () { log.length = 0; },

    handleSendRequest: function (url, options, success, failure) {
      var method = (options && options.method) || 'get';
      var path = normalizePath(url);
      var gesturePayload = offlineGesturePayload(path, method);
      var route = gesturePayload !== undefined ? { data: gesturePayload } : matchRoute(path, method);
      log.push({ kind: route ? 'hit' : 'miss', url: url, method: method, path: path });
      if (window.__ETAX_STUB_DEBUG__) {
        console.log('[STUB]', route ? 'HIT ' : 'MISS', method.toUpperCase(), path);
      }
      if (route) {
        if (path.indexOf('zrr/jbxx/update') !== -1 && String(method).toLowerCase() === 'post') {
          persistPersonalProfile(options);
        }
        var payload = route.data;
        if (typeof payload === 'function') {
          try { payload = payload(options, path, method); } catch (e) { payload = null; }
        }
        if (payload === undefined || payload === null) payload = {};
        try {
          success && success({
            status: 200,
            url: url,
            headers: { 'content-type': 'application/json' },
            data: JSON.stringify(payload),
          });
        } catch (e) {
          failure && failure({ status: -1, error: 'stub-error:' + e.message });
        }
      } else {
        // 未 mock 接口：返回成功空响应（页面按空态渲染），避免官方"很抱歉"错误弹层。
        // 真机离线/未覆盖接口不再挂起超时（原 5s 转圈）也不弹错误页。
        if (window.__ETAX_STUB_DEBUG__) {
          console.warn('[STUB] MISS fallback -> SUCCESS empty', method.toUpperCase(), path);
        }
        try {
          success && success({
            status: 200,
            url: url,
            headers: { 'content-type': 'application/json' },
            data: JSON.stringify({ code: 'SUCCESS', message: '', data: null }),
          });
        } catch (e) {
          failure && failure({ status: -1, error: 'stub-fallback:' + e.message });
        }
      }
    },

    handleNativeRouter: function (service, payload, cb) {
      log.push({ kind: 'nativeRouter', service: service, payload: payload });
      if (window.__ETAX_STUB_DEBUG__) {
        console.log('[STUB] nativeRouter', service);
      }
      if (cb) cb({ status: -1, error: 'intercepted' });
    },

    // 开发面板使用：列出当前模式与路由数
    describe: function () {
      return {
        mode: effectiveMode(),
        referenceRoutes: (getFixtures().reference || {}).routes
          ? getFixtures().reference.routes.length : 0,
        customRoutes: (getFixtures().custom || {}).routes
          ? getFixtures().custom.routes.length : 0,
        logLength: log.length,
      };
    },
  };

  // ---- 零外联兜底：拦截跨域 fetch/XHR ----
  // fetch
  var realFetch = window.fetch;
  if (typeof realFetch === 'function') {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/^https?:/i.test(url)) {
        var a = document.createElement('a');
        a.href = url;
        if (a.host !== window.location.host) {
          log.push({ kind: 'blocked-fetch', url: url });
          if (window.__ETAX_STUB_DEBUG__) console.log('[STUB] blocked fetch', url);
          return Promise.reject(new Error('blocked-by-stub:' + url));
        }
      }
      return realFetch.apply(this, arguments);
    };
  }

  // XHR
  var realOpen = XMLHttpRequest.prototype.open;
  var realSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, async, user, pass) {
    this.__stubBlocked = false;
    this.__stubUrl = String(url || '');
    try {
      if (/^https?:/i.test(this.__stubUrl)) {
        var a = document.createElement('a');
        a.href = this.__stubUrl;
        if (a.host !== window.location.host) this.__stubBlocked = true;
      }
    } catch (e) {}
    return realOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    if (this.__stubBlocked) {
      var xhr = this;
      log.push({ kind: 'blocked-xhr', url: this.__stubUrl });
      if (window.__ETAX_STUB_DEBUG__) console.log('[STUB] blocked xhr', this.__stubUrl);
      queueMicrotask(function () {
        try {
          Object.defineProperty(xhr, 'readyState', { get: function () { return 4; }, configurable: true });
          Object.defineProperty(xhr, 'status', { get: function () { return 0; }, configurable: true });
          Object.defineProperty(xhr, 'statusText', { get: function () { return 'blocked-by-stub'; }, configurable: true });
          Object.defineProperty(xhr, 'responseText', { get: function () { return ''; }, configurable: true });
          if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange();
          xhr.dispatchEvent(new Event('error'));
          if (typeof xhr.onerror === 'function') xhr.onerror(new Error('blocked-by-stub'));
          xhr.dispatchEvent(new ProgressEvent('loadend'));
          if (typeof xhr.onloadend === 'function') xhr.onloadend();
        } catch (e) {}
      });
      return;
    }
    return realSend.apply(this, arguments);
  };
})();
