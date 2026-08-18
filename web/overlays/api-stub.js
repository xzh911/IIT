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
        return Date.now();
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
      // 用户基本信息：读 /dev 面板全局状态（userName），默认张伟
      match: 'zrr/jbxx/query',
      data: function () {
        var gs = {};
        try { gs = JSON.parse(localStorage.getItem('etax_global_state') || '{}'); } catch (e) {}
        return {
          xm: gs.userName || '张伟',
          sfzjhm: '110101199001011234',
          nsrsbh: '110101199001011234',
          sfzjlxMc: '居民身份证',
          xbDm: ['1'],
          source: 'mock',
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

  window.__API_STUB__ = {
    version: 1,
    mode: effectiveMode,
    getLog: function () { return log; },
    clearLog: function () { log.length = 0; },

    handleSendRequest: function (url, options, success, failure) {
      var method = (options && options.method) || 'get';
      var path = normalizePath(url);
      var route = matchRoute(path, method);
      log.push({ kind: route ? 'hit' : 'miss', url: url, method: method, path: path });
      if (window.__ETAX_STUB_DEBUG__) {
        console.log('[STUB]', route ? 'HIT ' : 'MISS', method.toUpperCase(), path);
      }
      if (route) {
        var payload = route.data;
        if (typeof payload === 'function') {
          try { payload = payload(options); } catch (e) { payload = null; }
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
