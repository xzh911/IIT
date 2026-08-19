// ============================================================
// afs-slider.js — 复刻层离线滑块（window.noCaptcha 自供实现）
// ------------------------------------------------------------
// 官方 cdn-www/nc.js 是真实阿里云 JSONP 客户端（依赖网络，离线不可用），
// build.sh 已移除其 script 引用；本 overlay 提供同名全局 API：
//   window.noCaptcha(opts) -> NcInstance，渲染官方老版 no-captcha 滑块：
//   按住抓手拖动 → 左侧填充变绿 → 拖至最右 → 绿勾 + 「验证通过」→
//   调用 opts.callback({value:'pass', csessionid, sig})
// 兼容 KOtm.js renderScrollBlock 调用的 .reset() / .upLang('cn', {...})。
// 决策（已实锤）：EMBOo=(K,q)=>K!==q、DEVzJ=(K,q)=>K===q，故
//   /zh/afs/config/query 返回 newAfsSwitch!=="Y" 才走 window.noCaptcha
//   老版分支（callback 由官方 app 自己写 localStorage.afsSig）。
// 若未来翻入 newRenderScrollBlock（newAfsSwitch==="Y"），
//   initAliyunCaptcha 兜底桩以相同语义返回通过。
// ============================================================
(function () {
  'use strict';

  var _id = 0;
  function nextId() { _id += 1; return 'etax-nc-' + _id; }

  function defaultLang() {
    return {
      SLIDER_LABEL: '请按住滑块，拖动到最右边',
      CHECK_Y: '验证通过',
      CHECK_N: '验证未通过',
      LOADING: '加载中...',
      ERROR_TITLE: '非常抱歉，这出错了...'
    };
  }

  function NcInstance(opts) {
    this.opts = opts || {};
    this.lang = defaultLang();
    this.done = false;
    this.busy = false;
    this.dragStart = null;
    this.progress = 0;
    this._completeLock = false;
    this.uid = nextId();
    this._build();
  }

  NcInstance.prototype._build = function () {
    var w = document.createElement('div');
    w.className = 'etax-nc-widget';
    w.style.position = 'relative';
    w.style.boxSizing = 'border-box';
    w.style.width = '100%';
    w.style.height = '36px';
    w.style.background = '#f2f2f2';
    w.style.border = '1px solid #d3d3d3';
    w.style.borderRadius = '6px';
    w.style.overflow = 'hidden';
    w.style.userSelect = 'none';
    w.style.webkitUserSelect = 'none';

    // 左侧填充（拖动变绿）
    var fill = document.createElement('div');
    fill.className = 'etax-nc-fill';
    fill.style.position = 'absolute';
    fill.style.left = '0';
    fill.style.top = '0';
    fill.style.bottom = '0';
    fill.style.width = '0';
    fill.style.background = '#7bd02c';
    fill.style.zIndex = '1';

    // 轨道提示文字
    var label = document.createElement('div');
    label.className = 'etax-nc-label';
    label.style.position = 'absolute';
    label.style.top = '0';
    label.style.left = '0';
    label.style.right = '0';
    label.style.bottom = '0';
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.justifyContent = 'center';
    label.style.color = '#666666';
    label.style.fontSize = '13px';
    label.style.zIndex = '3';

    // 滑块把手
    var grab = document.createElement('div');
    grab.className = 'etax-nc-grab';
    grab.style.position = 'absolute';
    grab.style.left = '0';
    grab.style.top = '0';
    grab.style.bottom = '0';
    grab.style.width = '42px';
    grab.style.background = '#f0f0f0';
    grab.style.borderRight = '1px solid #c8c8c8';
    grab.style.zIndex = '4';
    grab.style.display = 'flex';
    grab.style.alignItems = 'center';
    grab.style.justifyContent = 'center';
    grab.style.color = '#999999';
    grab.style.cursor = 'pointer';
    var arrow = document.createElement('span');
    arrow.textContent = '\u25B8\u25B8';
    arrow.style.fontFamily = 'sans-serif';
    arrow.style.fontSize = '14px';
    arrow.style.userSelect = 'none';
    grab.appendChild(arrow);

    // 成功覆盖层（绿勾 + 验证通过）
    var ok = document.createElement('div');
    ok.className = 'etax-nc-ok';
    ok.style.position = 'absolute';
    ok.style.left = '0';
    ok.style.top = '0';
    ok.style.right = '0';
    ok.style.bottom = '0';
    ok.style.display = 'none';
    ok.style.background = '#7bd02c';
    ok.style.zIndex = '5';
    ok.style.color = '#ffffff';
    ok.style.fontSize = '14px';
    ok.style.alignItems = 'center';
    ok.style.justifyContent = 'center';
    var tick = document.createElement('span');
    tick.style.display = 'inline-flex';
    tick.style.marginRight = '6px';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    var pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    pl.setAttribute('points', '3,1 8,7 7,12 8,6 13,8 12,1');
    pl.setAttribute('fill', 'none');
    pl.setAttribute('stroke', '#ffffff');
    pl.setAttribute('stroke-width', '2.2');
    pl.setAttribute('stroke-linecap', 'round');
    pl.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(pl);
    tick.appendChild(svg);
    ok.appendChild(tick);
    var okText = document.createElement('span');
    okText.textContent = this.lang.CHECK_Y;
    ok.appendChild(okText);

    w.appendChild(fill);
    w.appendChild(label);
    w.appendChild(grab);
    w.appendChild(ok);

    this.bg = w;
    this.fill = fill;
    this.label = label;
    this.grab = grab;
    this.ok = ok;
    this.okText = okText;

    this._bind();
    this._applyLang();
  };

  // 渲染到容器（#nc）
  NcInstance.prototype.render = function (renderTo) {
    var host = this.opts.renderTo || renderTo || '#nc';
    var box = null;
    if (typeof host === 'string') {
      box = document.getElementById(String(host).replace(/^#/, ''));
    } else if (host && host.appendChild) {
      box = host;
    }
    if (!box) {
      var self = this;
      setTimeout(function () {
        var box2 = document.getElementById(String(host).replace(/^#/, ''));
        if (box2) box2.appendChild(self.bg);
      }, 300);
      return this;
    }
    box.appendChild(this.bg);
    this.bg.style.display = '';
    return this;
  };

  NcInstance.prototype._setProgress = function (p) {
    p = Math.max(0, Math.min(1, p));
    var tw = this.bg.getBoundingClientRect().width || 300;
    var gw = this.grab.getBoundingClientRect().width || 42;
    var track = Math.max(0, tw - gw);
    var x = p * track;
    this.fill.style.width = Math.round(x) + 'px';
    this.grab.style.left = Math.round(x) + 'px';
    this.progress = p;
  };

  NcInstance.prototype._applyLang = function () {
    if (this.label) this.label.textContent = this.lang.SLIDER_LABEL || '';
    if (this.okText) this.okText.textContent = this.lang.CHECK_Y || '';
  };

  NcInstance.prototype.upLang = function (kind, map) {
    if (map && typeof map === 'object') {
      for (var k in map) {
        if (Object.prototype.hasOwnProperty.call(map, k)) this.lang[k] = map[k];
      }
    }
    this._applyLang();
    return this;
  };

  NcInstance.prototype.reset = function () {
    this.busy = false;
    this.dragStart = null;
    this._completeLock = false;
    this.done = false;
    this._setProgress(0);
    if (this.ok) this.ok.style.display = 'none';
    return this;
  };

  NcInstance.prototype.cancel = function () {
    this.dragStart = null;
    this.busy = false;
    this._setProgress(0);
  };

  // ---- 交互（move/up 挂 document，指针离开 grab 仍持续拖动）----
  NcInstance.prototype._bind = function () {
    var self = this;

    function startDrag(ev) {
      if (self.done || self._completeLock) return;
      var tw = self.bg.getBoundingClientRect().width || 300;
      var gw = self.grab.getBoundingClientRect().width || 42;
      var w = tw - gw;
      if (w <= 0) return;
      self.busy = true;
      self.dragStart = { w: w, ptrX: ev.clientX };
      if (ev.preventDefault) ev.preventDefault();
      if (ev.stopPropagation) ev.stopPropagation();
    }

    function drag(ev) {
      if (!self.busy || self.dragStart == null || self.done) return;
      var dx = ev.clientX - self.dragStart.ptrX;
      var p = Math.max(0, Math.min(1, dx / self.dragStart.w));
      self._setProgress(p);
      if (p >= 1) self._complete();
      if (ev.preventDefault) ev.preventDefault();
    }

    function endDrag() {
      if (!self.busy) return;
      if (!self.done && self.progress < 1) self.cancel();
      self.busy = false;
      self.dragStart = null;
    }

    var g = this.grab;
    g.addEventListener('pointerdown', startDrag);
    g.addEventListener('mousedown', startDrag);
    g.addEventListener('touchstart', function (ev) {
      var t = ev.touches && ev.touches[0];
      if (t) startDrag({ clientX: t.clientX, preventDefault: function () {}, stopPropagation: function () {} });
      if (ev.preventDefault) ev.preventDefault();
    });
    document.addEventListener('pointermove', drag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchmove', function (ev) {
      var t = ev.touches && ev.touches[0];
      if (!t) return;
      drag({ clientX: t.clientX, preventDefault: function () { if (ev.preventDefault) ev.preventDefault(); } });
    });
    g.addEventListener('click', function (ev) {
      if (ev.preventDefault) ev.preventDefault();
      if (!self.done) ev.stopPropagation();
    });
  };

  // ---- 完成 ----
  NcInstance.prototype._complete = function () {
    if (this._completeLock) return;
    this._completeLock = true;
    this.done = true;
    this.busy = false;
    this.dragStart = null;
    this._setProgress(1);
    this.fill.style.background = '#7bd02c';
    this.ok.style.display = 'flex';
    if (this.opts.callback) {
      this.opts.callback({
        value: 'pass',
        csessionid: 'NCS' + Date.now().toString(36).toUpperCase(),
        sig: 'sso' + Math.random().toString(36).slice(2, 10)
      });
    }
  };

  // ---- 构造 ----
  function noCaptcha(opts) {
    if (typeof window._etaxNoCaptchaHook === 'function') {
      return window._etaxNoCaptchaHook(opts);
    }
    var inst = new NcInstance(opts || {});
    inst.render(opts && opts.renderTo ? opts.renderTo : '#nc');
    return inst;
  }

  // 新分支兜底：newAfsSwitch==="Y" 时 initAliyunCaptcha（官方阿里云新版）离线桩
  function aliyunStub(cfg) {
    cfg = cfg || {};
    setTimeout(function () {
      if (typeof cfg.captchaVerifyCallback === 'function') {
        cfg.captchaVerifyCallback(JSON.stringify({ code: 'SUCCESS', src: 'offline-mock' }));
      }
    }, 400);
    return { refresh: function () {}, getInstance: function () { return null; } };
  }

  window.noCaptcha = noCaptcha;
  window.initAliyunCaptcha = aliyunStub;
})();