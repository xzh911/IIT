// ============================================================
// afs-slider.js — 复刻层离线滑块（window.noCaptcha 自供实现）
// ------------------------------------------------------------
// 官方 cdn-www/nc.js 是真实阿里云 JSONP 客户端（依赖网络，离线不可用），
// build.sh 已移除其 script 引用；本 overlay 提供同名全局 API：
//   window.noCaptcha(opts) -> NcInstance，渲染官方老版 no-captcha 滑块。
//
// 视觉规格 = 官方真机截图像素采样（2026-08-20 复核，勿再自创）：
//   IMG_3952（初始态）:
//     轨道 : 左右各≈29px; height≈52px; background:#F1F1F2; radius≈5px
//     手柄 : 白 #fff; 约52px正方形; radius≈5px; 轻投影
//     箭头 : 官方 nc.js 的 btn_slide/e601 双右箭头语义，截图采样 #656565
//     文字 : 「请按住滑块，拖动到最右边」#CACACA 16px
//   IMG_3953（通过态）:
//     全绿 #7AC23C + #009431 实心圆内绿勾 + 白字「验证通过！」
//   生成按钮: #4285F4 常亮可点（fixture 已保证 enabled）
// 交互（已容器调通）: mousedown/pointerdown/touchstart 挂手柄，
//                     move/up 挂 document（指针离开仍持续拖动）。
// 决策（已实锤）：EMBOo=(K,q)=>K!==q、DEVzJ=(K,q)=>K===q，故
//   /zh/afs/config/query 返回 newAfsSwitch!=="Y" 才走 window.noCaptcha
//   老版分支（callback 由官方 app 自己写 localStorage.afsSig）。
// 兼容 KOtm.js renderScrollBlock 调用的 .reset() / .upLang('cn', {...})。
// ============================================================
(function () {
  'use strict';

  var _id = 0;
  function nextId() { _id += 1; return 'etax-nc-' + _id; }

  function defaultLang() {
    return {
      SLIDER_LABEL: '请按住滑块，拖动到最右边',
      CHECK_Y: '验证通过！',
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
    w.className = 'nc-container etax-nc-widget';
    w.style.position = 'relative';
    w.style.boxSizing = 'border-box';
    w.style.width = 'calc(100% - 58px)';
    w.style.margin = '0 29px';
    w.style.touchAction = 'none';
    w.style.msTouchAction = 'none';

    // 真机截图在 402px 视口中为 x≈29..373、h≈52；颜色沿用官方 .nc_scale。
    var scale = document.createElement('div');
    scale.className = 'nc_scale';
    scale.style.position = 'relative';
    scale.style.width = '100%';
    scale.style.height = '52px';
    scale.style.background = '#F1F1F2';
    scale.style.borderRadius = '5px';
    scale.style.margin = '0';
    scale.style.padding = '0';
    scale.style.overflow = 'hidden';
    scale.style.boxSizing = 'border-box';

    // 绿色进度（官方 #7AC23C，随拖动从左变宽）
    var fill = document.createElement('div');
    fill.className = 'nc_bg etax-nc-fill';
    fill.style.position = 'absolute';
    fill.style.left = '0';
    fill.style.top = '0';
    fill.style.bottom = '0';
    fill.style.width = '0';
    fill.style.background = '#7AC23C';
    fill.style.zIndex = '1';

    // 轨道提示文字；尺寸按截图，结构/居中方式沿用官方 scale_text。
    var label = document.createElement('div');
    label.className = 'scale_text etax-nc-label';
    label.style.position = 'absolute';
    label.style.left = '0';
    label.style.right = '0';
    label.style.top = '0';
    label.style.height = '100%';
    label.style.textAlign = 'center';
    label.style.color = '#CACACA';
    label.style.fontSize = '16px';
    label.style.lineHeight = '52px';
    label.style.zIndex = '1';
    label.style.background = 'transparent';
    label.style.cursor = 'pointer';
    label.style.userSelect = 'none';
    label.style.webkitUserSelect = 'none';
    label.style.textIndent = '0';

    // 真机手柄约 52px 正方形；不是此前误判的 80px 宽块。
    var grab = document.createElement('div');
    grab.className = 'etax-nc-grab';
    grab.style.position = 'absolute';
    grab.style.left = '0';
    grab.style.top = '0';
    grab.style.width = '52px';
    grab.style.height = '52px';
    grab.style.boxSizing = 'border-box';
    grab.style.background = '#ffffff';
    grab.style.border = '0';
    grab.style.borderRadius = '5px';
    grab.style.boxShadow = '0 3px 10px rgba(0,0,0,0.12)';
    grab.style.zIndex = '2';
    grab.style.cursor = 'move';
    grab.style.display = 'flex';
    grab.style.alignItems = 'center';
    grab.style.justifyContent = 'center';
    grab.style.userSelect = 'none';
    grab.style.webkitUserSelect = 'none';
    // nc.js 实际 DOM 使用 nc_iconfont.btn_slide 的 e601（双箭头）；
    // 离线不加载其 CDN 字体，用等几何 SVG 保留官方图标语义与色值。
    var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('viewBox', '0 0 20 20');
    arrow.setAttribute('width', '20');
    arrow.setAttribute('height', '20');
    arrow.style.display = 'block';
    arrow.style.pointerEvents = 'none';
    var arrowLeft = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    arrowLeft.setAttribute('points', '3,3 9,10 3,17');
    arrowLeft.setAttribute('fill', 'none');
    arrowLeft.setAttribute('stroke', '#656565');
    arrowLeft.setAttribute('stroke-width', '2.2');
    arrowLeft.setAttribute('stroke-linecap', 'square');
    arrowLeft.setAttribute('stroke-linejoin', 'miter');
    var arrowRight = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    arrowRight.setAttribute('points', '10,3 17,10 10,17');
    arrowRight.setAttribute('fill', 'none');
    arrowRight.setAttribute('stroke', '#656565');
    arrowRight.setAttribute('stroke-width', '2.2');
    arrowRight.setAttribute('stroke-linecap', 'square');
    arrowRight.setAttribute('stroke-linejoin', 'miter');
    arrow.appendChild(arrowLeft);
    arrow.appendChild(arrowRight);
    grab.appendChild(arrow);

    // 成功覆盖层：全绿 + 深绿实心圆/浅绿勾（按 IMG_3953 采样）。
    var ok = document.createElement('div');
    ok.className = 'nc_ok etax-nc-ok';
    ok.style.position = 'absolute';
    ok.style.left = '0';
    ok.style.top = '0';
    ok.style.right = '0';
    ok.style.bottom = '0';
    ok.style.display = 'none';
    ok.style.background = '#7AC23C';
    ok.style.borderRadius = '5px';
    ok.style.zIndex = '3';
    ok.style.color = '#ffffff';
    ok.style.fontSize = '16px';
    ok.style.lineHeight = '52px';
    ok.style.textAlign = 'center';
    ok.style.userSelect = 'none';
    // 左侧 #009431 圆圈 + 轨道绿色勾。
    var tickWrap = document.createElement('span');
    tickWrap.style.display = 'inline-block';
    tickWrap.style.width = '16px';
    tickWrap.style.height = '16px';
    tickWrap.style.borderRadius = '50%';
    tickWrap.style.background = '#009431';
    tickWrap.style.verticalAlign = '-3px';
    tickWrap.style.marginRight = '7px';
    tickWrap.style.position = 'relative';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '11');
    svg.setAttribute('height', '11');
    svg.style.position = 'absolute';
    svg.style.left = '3px';
    svg.style.top = '2px';
    var pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    pl.setAttribute('points', '2,8 6,12 14,3');
    pl.setAttribute('fill', 'none');
    pl.setAttribute('stroke', '#7AC23C');
    pl.setAttribute('stroke-width', '2.4');
    pl.setAttribute('stroke-linecap', 'round');
    pl.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(pl);
    tickWrap.appendChild(svg);
    ok.appendChild(tickWrap);
    var okText = document.createElement('span');
    okText.textContent = this.lang.CHECK_Y;
    ok.appendChild(okText);

    scale.appendChild(fill);
    scale.appendChild(label);
    scale.appendChild(grab);
    scale.appendChild(ok);
    w.appendChild(scale);

    this.bg = w;
    this.scale = scale;
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
    var tw = this.scale.getBoundingClientRect().width || 300;
    var gw = this.grab.getBoundingClientRect().width || 52;
    var track = Math.max(0, tw - gw);
    var x = p * track;
    this.fill.style.width = Math.round(x) + 'px';
    this.grab.style.left = Math.round(x) + 'px';
    // 拖动中：文字变白左对齐（官方滑动中左侧变绿语义）
    if (p > 0 && p < 1 && !this.done) {
      this.label.style.color = '#ffffff';
      this.label.style.textAlign = 'left';
      this.label.style.textIndent = '10px';
    }
    this.progress = p;
  };

  NcInstance.prototype._applyLang = function () {
    if (this.label) this.label.textContent = this.lang.SLIDER_LABEL || '';
    if (this.okText) {
      var passed = this.lang.CHECK_Y || '';
      // 页面 upLang 传入旧文案“验证通过”，参考 IMG_3953 带感叹号。
      if (passed && !/[!！]$/.test(passed)) passed += '!';
      this.okText.textContent = passed;
    }
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
    this.label.style.color = '#CACACA';
    this.label.style.textAlign = 'center';
    this.label.style.textIndent = '0';
    this._setProgress(0);
    if (this.ok) this.ok.style.display = 'none';
    return this;
  };

  NcInstance.prototype.cancel = function () {
    this.dragStart = null;
    this.busy = false;
    this.label.style.color = '#CACACA';
    this.label.style.textAlign = 'center';
    this.label.style.textIndent = '0';
    this._setProgress(0);
  };

  // ---- 交互（move/up 挂 document，指针离开 grab 仍持续拖动）----
  NcInstance.prototype._bind = function () {
    var self = this;

    function startDrag(ev) {
      if (self.done || self._completeLock) return;
      var tw = self.scale.getBoundingClientRect().width || 300;
      var gw = self.grab.getBoundingClientRect().width || 52;
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
    this.ok.style.display = 'block';
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
