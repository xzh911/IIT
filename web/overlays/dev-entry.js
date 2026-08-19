// ============================================================
// O4: dev-entry.js — 隐蔽开发者入口 + /dev 数据面板（自定义层）V2
// 触发: 「用户注册协议」/「自然人办税服务平台」连点 5 次
// 功能:
//   1. fixture 模式显示（reference/custom）
//   2. 【V2】模板 + 表单编辑：选中模板 → 同一面板展示该模拟数据字段表单
//      （姓名/金额/日期…自动识别类型），改动即写覆盖层，含「查看效果」直达
//   3. 【V2】通用路由字段编辑器：任一路由（覆盖层 or reference fixtures）
//      可展开为字段表单编辑，替代手写 JSON —— schema 从现有 JSON 推导
//   4. 保留 JSON 原始编辑器（导入/导出/清空/复制持久化）
//   5. 请求日志查看 / 重置本地数据 / 关闭
// 所有生成数据均带 source:"mock"；面板明确声明非官方。
// ============================================================
(function () {
  'use strict';

  var OVERRIDE_KEY = 'etax_custom_overrides';
  var MODE_KEY = 'etax_fixture_mode';
  var GLOBAL_STATE_KEY = 'etax_global_state';

  function getGlobalState() {
    try { return JSON.parse(localStorage.getItem(GLOBAL_STATE_KEY) || '{}'); } catch (e) { return {}; }
  }
  function setGlobalState(o) {
    try { localStorage.setItem(GLOBAL_STATE_KEY, JSON.stringify(o || {})); } catch (e) {}
  }

  function deepClone(x) {
    try { return JSON.parse(JSON.stringify(x)); } catch (e) { return x; }
  }

  // 模块级 toast（renderRouteForm / gotoRoute / 面板共用）
  function showToast(msg) {
    try {
      var t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:8px 14px;border-radius:6px;font-size:13px;z-index:2147483648;';
      document.body.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2200);
    } catch (e) {}
  }

  // ---- 覆盖层读写 ----
  function getOverrides() {
    try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '[]'); } catch (e) { return []; }
  }
  function setOverrides(list) {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(list));
  }
  function upsertOverride(route) {
    var cur = getOverrides();
    var idx = -1;
    for (var i = 0; i < cur.length; i++) {
      if (cur[i].match === route.match && String(cur[i].method || '').toLowerCase() === String(route.method || '').toLowerCase()) {
        idx = i; break;
      }
    }
    var copy = { match: route.match, method: route.method, data: deepClone(route.data), source: 'mock' };
    if (idx >= 0) cur[idx] = copy; else cur.push(copy);
    setOverrides(cur);
    return cur.length;
  }
  function removeOverride(match, method) {
    var cur = getOverrides().filter(function (r) {
      return !(r.match === match && String(r.method || '').toLowerCase() === String(method || '').toLowerCase());
    });
    setOverrides(cur);
  }

  function modeLabel() {
    try { return localStorage.getItem(MODE_KEY) === 'custom' ? 'custom' : 'reference'; } catch (e) { return 'reference'; }
  }

  // ---- 模板库：快速生成（数据全部 source:mock）----
  var TEMPLATES = {
    user: {
      label: '示例用户（我的页/登录/实名）',
      page: '/zdj-profile',
      routes: [
        {
          match: '/zrr/jbxx/query',
          method: 'get',
          data: { code: 'SUCCESS', data: { xm: '李娜', sfzjhm: '110105199203153328', nsrsbh: '110105199203153328', xbDm: ['2'], sjhm: '13900002222', source: 'mock' } },
        },
      ],
    },
    employment: {
      label: '示例任职受雇（/incomeType/employed）',
      page: '/incomeType/employed',
      routes: [
        {
          match: '/zrr/srlx/sgdw/query',
          method: 'get',
          data: { code: 'SUCCESS', data: [
            { sgdwmc: '示例集团有限公司', tyshxydm: '91110108MOCK0002', rzrq: '2023-06-01', lzrq: '', rzzwMc: '财务总监', source: 'mock' },
          ] },
        },
      ],
    },
    'tax-records': {
      label: '示例税务记录（收入纳税明细）',
      page: '/IncomeTaxPayment/taxRecordList',
      routes: [
        {
          match: '/sb/yd/gg/cxNsmxList',
          method: 'post',
          data: {
            code: 'SUCCESS',
            data: {
              nsmxList: [
                { skssqq: '2026-05-01', skssqz: '2026-05-31', sdxmDlDm: '01', sdxmDlmc: '综合所得', grsdssdxmmc: '工资薪金所得', ywlxDm: 'A061001019', ywlxmc: '正常工资薪金', kjywrMc: '示例科技有限公司', sre: 18200, ybtse: 626, sblsh: 'MOCK202605010000010', mxxh: '1', nsrdah: 'MOCK110105199203153328' },
                { skssqq: '2026-06-01', skssqz: '2026-06-30', sdxmDlDm: '01', sdxmDlmc: '综合所得', grsdssdxmmc: '劳务报酬所得', ywlxDm: 'A061001020', ywlxmc: '一般劳务报酬', kjywrMc: '示例文化传媒有限公司', sre: 8000, ybtse: 1280, sblsh: 'MOCK202606010000011', mxxh: '1', nsrdah: 'MOCK110105199203153328' },
              ],
              ybtseHj: 1906, sreHj: 26200,
            },
          },
        },
      ],
    },
    messages: {
      label: '示例消息（消息页+详情）',
      page: '/zdj-message',
      routes: [
        {
          match: '/zrr/message/znx/list/query',
          method: 'post',
          data: { code: 'SUCCESS', data: { total: 1, content: [{ messageId: 'MOCK-CUSTOM-001', messageTypeName: '办理提醒', title: '您的年度汇算申报已受理', receiveDate: '2026-08-18 09:00:00', readed: false, source: 'mock' }] } },
        },
        {
          match: '/zrr/message/znx/content/query',
          method: 'get',
          data: { code: 'SUCCESS', data: { content: '<h3>您的年度汇算申报已受理</h3><p>税务机关已受理您的申报，请耐心等待审核。</p><p style="color:#999">（mock 数据）</p>', source: 'mock' } },
        },
      ],
    },
    taxproof: {
      label: '示例完税证明（纳税记录开具）',
      page: '/taxProof/taxProofQuery?year=2026',
      routes: [
        {
          match: '/zrr/wszm/query',
          method: 'post',
          data: { code: 'SUCCESS', data: { total: 1, hjse: 1906, list: [{ ddbh: 'MOCK202600000099', pzMc: '税收完税证明（表格式）', pzje: 1906, zfje: 1906, kjrq: '2026-08-18', payTime: '2026-08-18 11:00:00', jkfsMc: '三方协议缴税', pzztMc: '已开具', wszmztDm: '01', sdxm: '综合所得', skssqq: '2026-05-01', skssqz: '2026-06-30', sjtse: 1000, skssjg: '国家税务总局北京市税务局', sz: '个人所得税', ypzh: 'MOCK202600000099', sbrq: '2026-08-18', hsqj: false, state: false, source: 'mock' }] } },
        },
      ],
    },
  };

  // ============================================================
  // Schema 推导：从任意 JSON 推断字段类型（对象/字符串/数字/布尔/数组）
  // ============================================================
  function schemaOf(v, key) {
    if (v === null || v === undefined) return { key: key, type: 'string', value: v == null ? '' : v };
    var t = typeof v;
    if (t === 'string') return { key: key, type: 'string', value: v };
    if (t === 'number') return { key: key, type: 'number', value: v };
    if (t === 'boolean') return { key: key, type: 'boolean', value: v };
    if (Array.isArray(v)) {
      var prim = v.every(function (x) { return x === null || ['string', 'number', 'boolean'].indexOf(typeof x) !== -1; });
      if (prim) return { key: key, type: 'arrayPrim', value: v };
      var itemProto = v.length ? deepClone(v[0]) : {};
      return { key: key, type: 'arrayObj', value: v, itemSchema: schemaOf(itemProto, '$item') };
    }
    if (t === 'object') {
      var children = [];
      Object.keys(v).forEach(function (k) { children.push(schemaOf(v[k], k)); });
      return { key: key, type: 'object', children: children };
    }
    return { key: key, type: 'string', value: String(v) };
  }

  function getPath(o, path) { var x = o; for (var i = 0; i < path.length; i++) if (x != null) x = x[path[i]]; return x; }
  function setPath(o, path, v) {
    var x = o;
    for (var i = 0; i < path.length - 1; i++) { if (x[path[i]] == null) x[path[i]] = {}; x = x[path[i]]; }
    x[path[path.length - 1]] = v;
  }
  function delPath(o, path) {
    var x = o;
    for (var i = 0; i < path.length - 1; i++) if (x != null) x = x[path[i]];
    if (x != null) delete x[path[path.length - 1]];
  }

  // ============================================================
  // 单路由表单编辑器：把 route.data 渲染成字段表单，绑定 work 写入
  // ============================================================
  function renderRouteForm(host, route, opts) {
    opts = opts || {};
    var work = deepClone(route.data);
    var W = host.ownerDocument;

    var box = W.createElement('div');
    box.dataset.routeMatch = route.match || '';
    box.dataset.routeMethod = String(route.method || 'get');
    box.style.cssText = 'border:1px solid #38383a;border-radius:10px;background:#161618;padding:10px;margin:10px 0;';

    var head = W.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
    var mBadge = W.createElement('span');
    mBadge.textContent = String(route.method || 'get').toUpperCase();
    mBadge.style.cssText = 'background:#0a84ff;color:#fff;border-radius:4px;padding:1px 6px;font-size:10px;';
    var mText = W.createElement('span');
    mText.textContent = route.match;
    mText.style.cssText = 'font:11px monospace;color:#8e8e93;word-break:break-all;flex:1;';
    head.appendChild(mBadge); head.appendChild(mText);
    box.appendChild(head);

    // 字段区
    var fields = W.createElement('div');
    box.appendChild(fields);

    // 按钮区
    var btns = W.createElement('div');
    btns.style.cssText = 'display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;';
    btns.appendChild(badgeBtn('💾 保存到覆盖层', function () {
      var n = upsertOverride({ match: route.match, method: route.method, data: work });
      if (opts.onSave) { try { opts.onSave(work, route); } catch (e) {} }
      showToast('已保存（覆盖层共 ' + n + ' 条），刷新页面或导航查看效果');
      if (opts.refreshStatus) opts.refreshStatus();
    }));
    if (opts.targetPage) {
      btns.appendChild(badgeBtn('👀 查看效果', function () {
        finishWork(work, route);
        gotoRoute(opts.targetPage);
      }));
    }
    if (opts.showDelete) {
      btns.appendChild(badgeBtn('🗑 删除覆盖层', function () {
        removeOverride(route.match, route.method);
        box.parentNode.removeChild(box);
        showToast('已删除该覆盖层');
        if (opts.refreshStatus) opts.refreshStatus();
      }));
    }
    box.appendChild(btns);

    // 渲染字段树
    function fieldRow(label, ctrl, hint) {
      var row = W.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:4px 0;';
      var lab = W.createElement('span');
      lab.textContent = label;
      lab.dataset.fkey = label;
      lab.style.cssText = 'width:150px;flex-shrink:0;color:#d1d1d6;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      var wrap = W.createElement('div');
      wrap.style.cssText = 'flex:1;display:flex;align-items:center;gap:6px;';
      if (ctrl && ctrl.dataset) ctrl.dataset.fkey = label;
      wrap.appendChild(ctrl);
      row.appendChild(lab); row.appendChild(wrap);
      if (hint) {
        var h = W.createElement('span');
        h.textContent = hint;
        h.style.cssText = 'color:#636366;font-size:10px;';
        wrap.appendChild(h);
      }
      return row;
    }
    function styleInput() {
      var inp = W.createElement('input');
      inp.style.cssText = 'flex:1;min-width:0;background:#111;color:#f2f2f7;border:1px solid #333;border-radius:6px;padding:6px;font-size:12px;';
      return inp;
    }
    function groupBlock(indexLabel) {
      var g = W.createElement('div');
      g.style.cssText = 'border-left:2px solid #0a84ff;padding-left:10px;margin:4px 0;';
      if (indexLabel) {
        var l = W.createElement('div');
        l.textContent = indexLabel;
        l.style.cssText = 'color:#0a84ff;font-size:11px;margin:6px 0 2px;';
        g.appendChild(l);
      }
      return g;
    }

    function renderNode(schema, path) {
      var val = getPath(work, path);
      switch (schema.type) {
        case 'string':
          var si = styleInput();
          si.value = val == null ? '' : String(val);
          si.addEventListener('input', function () { setPath(work, path, this.value); });
          fields.appendChild(fieldRow(schema.key, si));
          break;
        case 'number':
          var ni = styleInput();
          ni.type = 'number'; ni.step = 'any';
          ni.value = val == null ? '' : String(val);
          ni.addEventListener('input', function () {
            var raw = this.value;
            setPath(work, path, raw === '' ? 0 : Number(raw));
          });
          fields.appendChild(fieldRow(schema.key, ni));
          break;
        case 'boolean':
          var cb = W.createElement('input');
          cb.type = 'checkbox';
          cb.checked = !!val;
          cb.style.cssText = 'width:18px;height:18px;';
          cb.addEventListener('change', function () { setPath(work, path, this.checked); });
          fields.appendChild(fieldRow(schema.key, cb));
          break;
        case 'arrayPrim':
          var ai = styleInput();
          var arr = val || [];
          ai.value = arr.join(', ');
          ai.addEventListener('input', function () {
            var parts = this.value.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s !== ''; });
            setPath(work, path, parts);
          });
          fields.appendChild(fieldRow(schema.key + '（数组，逗号分隔）', ai));
          break;
        case 'object': {
          var g = groupBlock(schema.key);
          fields.appendChild(g);
          var sub = W.createElement('div');
          g.appendChild(sub);
          schema.children.forEach(function (ch) { renderNodeInto(sub, ch, path.concat(ch.key)); });
          break;
        }
        case 'arrayObj': {
          var g2 = groupBlock(schema.key + '（数组 ' + (val ? val.length : 0) + ' 项）');
          fields.appendChild(g2);
          var listC = W.createElement('div');
          g2.appendChild(listC);
          function rerenderItems() {
            listC.innerHTML = '';
            var arr2 = getPath(work, path) || [];
            arr2.forEach(function (_, idx) {
              var it = W.createElement('div');
              it.dataset.arrIdx = idx;
              it.style.cssText = 'border:1px solid #2c2c2e;border-radius:8px;padding:6px;margin:4px 0;background:#131316;';
              var itHead = W.createElement('div');
              itHead.style.cssText = 'display:flex;align-items:center;gap:6px;';
              var tag = W.createElement('span');
              tag.textContent = '#' + idx;
              tag.style.cssText = 'color:#0a84ff;font-size:10px;';
              var del = W.createElement('button');
              del.textContent = '删除';
              del.style.cssText = 'margin-left:auto;background:none;border:0;color:#ff453a;font-size:11px;';
              del.addEventListener('click', function () {
                var arr3 = getPath(work, path) || [];
                arr3.splice(idx, 1);
                setPath(work, path, arr3);
                rerenderItems();
              });
              itHead.appendChild(tag); itHead.appendChild(del);
              it.appendChild(itHead);
              var itBody = W.createElement('div');
              it.appendChild(itBody);
              var itemPath = path.concat(String(idx));
              schema.itemSchema.children.forEach(function (ch) {
                renderNodeInto(itBody, ch, itemPath.concat(ch.key));
              });
              listC.appendChild(it);
            });
          }
          rerenderItems();
          var addBtn = W.createElement('button');
          addBtn.textContent = '＋ 添加一项';
          addBtn.style.cssText = 'display:block;margin:6px 0 0;background:#2c2c2e;color:#0a84ff;border:0;border-radius:6px;padding:6px;font-size:12px;';
          addBtn.addEventListener('click', function () {
            var arr4 = getPath(work, path) || [];
            arr4 = deepClone(arr4);
            arr4.push(deepClone(schema.itemSchema.value));
            setPath(work, path, arr4);
            rerenderItems();
          });
          fields.appendChild(addBtn);
          break;
        }
      }
    }
    // 递归渲染到指定容器（arrayObj 内部/对象子块复用）
    function renderNodeInto(container, schema, path) {
      var tmp = W.createElement('div');
      var saved = fields;
      fields = tmp;
      renderNode(schema, path);
      Array.prototype.slice.call(tmp.childNodes).forEach(function (n) { container.appendChild(n); });
      fields = saved;
    }

    schemaOf(work, 'data').children.forEach(function (ch) {
      renderNode(ch, [ch.key]);
    });

    host.appendChild(box);
    return box;

    function badgeBtn(label, cb) {
      var b = W.createElement('button');
      b.textContent = label;
      b.style.cssText = 'flex:0 0 auto;background:#2c2c2e;color:#0a84ff;border:0;border-radius:6px;padding:6px 10px;font-size:12px;';
      b.addEventListener('click', cb);
      return b;
    }
  }

  // ---- 保存用户模板时同步全局状态 + store（姓名即时生效）----
  // 注意：renderRouteForm 的 work = 完整 payload { code, data: <业务> }，
  // 业务对象是 work.data（不是 work.data.data）。
  function applyUserNameLive(work, route) {
    var biz = work && work.data;
    if (!biz || typeof biz !== 'object' || !biz.xm) return;
    var xm = String(biz.xm);
    var gs = getGlobalState();
    gs.userName = xm;
    setGlobalState(gs);
    // 直接改 store，免刷新即时生效（与 mock-login 注入同路）
    try {
      var store = findStore();
      if (store) {
        var ui = store.state.userInfo;
        if (ui && ui.userInfoObj) {
          ui.userInfoObj = Object.assign({}, ui.userInfoObj, { xm: xm, nsrsbh: biz.nsrsbh || ui.userInfoObj.nsrsbh || '', sfzjhm: biz.sfzjhm || ui.userInfoObj.sfzjhm || '' });
          try { store.commit('@USER/COPY_USERINFO_ORIGINAL_DATA'); } catch (e2) {}
          if (!store.state.config.logined) {
            try { store.commit('@USER/SET_BASE_INFO', Object.assign({}, biz, { xm: xm })); } catch (e2) {}
          }
        }
      }
    } catch (e) {}
  }

  function findStore() {
    try {
      var nodes = document.querySelectorAll('*');
      for (var i = 0; i < nodes.length; i++) {
        var v = nodes[i].__vue__;
        if (v && v.$store) return v.$store;
      }
    } catch (e) {}
    return null;
  }
  function findRouter() {
    try {
      var nodes = document.querySelectorAll('*');
      for (var i = 0; i < nodes.length; i++) {
        var v = nodes[i].__vue__;
        if (v && v.$router) return v.$router;
      }
    } catch (e) {}
    return null;
  }
  function gotoRoute(path) {
    var r = findRouter();
    if (!r) { showToast('未找到 router'); return; }
    closePanel();
    try {
      if (path.indexOf('?') === -1) r.push(path);
      else {
        var parts = path.split('?'), q = {};
        parts[1].split('&').forEach(function (kv) { var p = kv.split('='); q[p[0]] = p[1] || ''; });
        r.push({ path: parts[0], query: q });
      }
      showToast('已跳转 ' + path);
    } catch (e) { showToast('跳转失败: ' + String(e).slice(0, 60)); }
  }
  function closePanel() {
    var p = document.getElementById('etax-dev-panel');
    if (p) p.parentNode.removeChild(p);
  }
  // 保存前的收尾钩子（用户模板 → 同步姓名）
  function finishWork(work, route) {
    if (route.match.indexOf('jbxx/query') !== -1) applyUserNameLive(work, route);
  }

  // ============================================================
  // 入口：5 连击（协议页「用户注册协议」/「自然人办税服务平台」）
  // 用 capture 阶段监听：首页/个人页等页脚文本点击会被页面组件
  // stopPropagation 截断气泡，capture 时 document 最先执行不受影响。
  // ============================================================
  var TAP_TARGETS = ['用户注册协议', '自然人办税服务平台'];
  var taps = 0, lastTap = 0;
  document.addEventListener('click', function (e) {
    var el = e.target;
    var inDialog = !!(el && el.closest && el.closest('.agreement-dialog, .zdj-confirm, .vux-x-dialog, .window-dialog-update'));
    if (inDialog) return;
    for (var i = 0; el && el.nodeType === 1 && i < 6; i++, el = el.parentElement) {
      var txt = (el.textContent || '').replace(/\s+/g, '');
      var hit = false;
      for (var t = 0; t < TAP_TARGETS.length; t++) {
        if (txt.indexOf(TAP_TARGETS[t]) !== -1) { hit = true; break; }
      }
      if (hit) {
        var now = Date.now();
        if (now - lastTap > 2500) taps = 0;
        lastTap = now;
        taps += 1;
        if (taps >= 5) {
          taps = 0;
          try { window.__devOpenedAt = Date.now(); openDevPanel(); }
          catch (e) { window.__devErr = String((e && e.stack) || e); }
        }
        return;
      }
    }
  }, true);

  // ============================================================
  // 面板
  // ============================================================
  function openDevPanel() {
    if (document.getElementById('etax-dev-panel')) return;
    var stub = window.__API_STUB__;

    var overlay = document.createElement('div');
    overlay.id = 'etax-dev-panel';
    overlay.style.cssText = [
      'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;',
      'background:#1c1c1e;color:#f2f2f7;font:13px/1.5 -apple-system,"PingFang SC","Helvetica Neue",sans-serif;',
      'padding:20px;overflow:auto;',
    ].join('');

    function el(tag, text, style) {
      var n = document.createElement(tag);
      if (text !== undefined) n.textContent = text;
      if (style) n.style.cssText = style;
      return n;
    }
    function btn(text, cb, style) {
      var b = el('button', text, style || 'display:block;width:100%;margin:6px 0;padding:10px;border:0;border-radius:8px;background:#2c2c2e;color:#0a84ff;font-size:14px;text-align:left;');
      b.addEventListener('click', cb);
      return b;
    }
    function title(text) {
      return el('h2', text, 'font-size:15px;font-weight:700;margin:18px 0 6px;color:#0a84ff;');
    }
    function chip(text, cb) {
      var c = el('button', text, 'display:inline-block;margin:4px 6px 4px 0;padding:8px 10px;border:1px solid #38383a;border-radius:8px;background:#2c2c2e;color:#f2f2f7;font-size:13px;');
      c.addEventListener('click', cb);
      return c;
    }

    overlay.appendChild(el('h1', '开发者工具 · /dev（V2 表单编辑器）', 'font-size:20px;font-weight:700;margin:0 0 4px;'));
    overlay.appendChild(el('div', '自定义开发层（非官方界面）。所有生成数据 source:mock。表单改动即写覆盖层（localStorage），导航/刷新即见效果。', 'color:#8e8e93;margin-bottom:14px;'));

    var status = el('div', '', 'background:#2c2c2e;border-radius:8px;padding:10px;margin-bottom:10px;');
    function refreshStatus() {
      var d = (stub && stub.describe) ? stub.describe() : {};
      status.textContent = 'fixture 模式: ' + modeLabel() +
        ' | reference: ' + d.referenceRoutes + ' 条 | custom: ' + d.customRoutes +
        ' 条 | 覆盖层: ' + getOverrides().length + ' 条 | 请求记录: ' + d.logLength + ' 条';
    }
    refreshStatus();
    overlay.appendChild(status);

    // ---- 模板 + 表单编辑 ----
    overlay.appendChild(title('模板 + 表单编辑（改动即写覆盖层）'));
    var tplBar = el('div');
    Object.keys(TEMPLATES).forEach(function (k) {
      var t = TEMPLATES[k];
      var c = chip('✏️ ' + t.label, function () {
        toggleTemplateEditor(k);
      });
      c.dataset.tpl = k;
      tplBar.appendChild(c);
    });
    overlay.appendChild(tplBar);
    var tplHost = el('div');
    overlay.appendChild(tplHost);

    var activeTemplate = null;
    function toggleTemplateEditor(key) {
      if (activeTemplate === key) { activeTemplate = null; tplHost.innerHTML = ''; return; }
      activeTemplate = key;
      tplHost.innerHTML = '';
      var t = TEMPLATES[key];
      tplHost.appendChild(el('div', '模板「' + t.label + '」— ' + t.routes.length + ' 个路由（编辑后点保存）', 'color:#0a84ff;margin:6px 0;font-weight:600;'));
      t.routes.forEach(function (route) {
        renderRouteForm(tplHost, route, {
          targetPage: t.page,
          refreshStatus: refreshStatus,
          showDelete: true,
          onSave: function (work, r) { finishWork(work, r); },
        });
      });
      refreshStatus();
    }

    // ---- 全局状态编辑 ----
    overlay.appendChild(title('全局状态（用户/年度/城市，刷新页面生效）'));
    var gs = getGlobalState();
    function fieldRow(label, key, ph) {
      var row = el('div', '', 'display:flex;align-items:center;gap:8px;margin:6px 0;');
      row.appendChild(el('span', label, 'width:70px;flex-shrink:0;color:#8e8e93;'));
      var inp = el('input', '', 'flex:1;background:#111;color:#f2f2f7;border:1px solid #333;border-radius:6px;padding:8px;font-size:13px;');
      inp.value = gs[key] || '';
      inp.setAttribute('placeholder', ph || '');
      row.appendChild(inp);
      row._inp = inp;
      return row;
    }
    var rName = fieldRow('姓名', 'userName', '如：张伟');
    var rYear = fieldRow('年度', 'year', '如：2026');
    var rCityDm = fieldRow('城市代码', 'cityDm', '如：110100');
    var rCityMc = fieldRow('城市名称', 'cityMc', '如：北京市');
    [rName, rYear, rCityDm, rCityMc].forEach(function (r) { overlay.appendChild(r); });
    overlay.appendChild(btn('保存全局状态', function () {
      var obj = {
        userName: rName._inp.value.trim() || undefined,
        year: rYear._inp.value.trim() || undefined,
        cityDm: rCityDm._inp.value.trim() || undefined,
        cityMc: rCityMc._inp.value.trim() || undefined,
      };
      Object.keys(obj).forEach(function (k) { if (!obj[k]) delete obj[k]; });
      localStorage.setItem(GLOBAL_STATE_KEY, JSON.stringify(obj));
      showToast('已保存，刷新页面生效（姓名/年度/城市）');
    }));

    // ---- 通用路由字段编辑器 ----
    overlay.appendChild(title('通用路由字段编辑器（任意路由，表单编辑替代手写 JSON）'));
    var uniHost = el('div');
    overlay.appendChild(uniHost);

    function renderOverrideList() {
      uniHost.innerHTML = '';
      var ovs = getOverrides();
      if (!ovs.length) {
        uniHost.appendChild(el('div', '当前覆盖层为空 — 从模板生成或从下方 reference 路由添加。', 'color:#636366;font-size:12px;margin:6px 0;'));
      }
      ovs.forEach(function (o) {
        var row = el('div', '', 'display:flex;align-items:center;gap:8px;margin:4px 0;');
        var badge = el('span', String(o.method || '').toUpperCase(), 'background:#48484a;color:#fff;border-radius:4px;padding:1px 6px;font-size:10px;');
        var txt = el('span', o.match, 'flex:1;font:11px monospace;color:#8e8e93;word-break:break-all;');
        var edit = el('button', '编辑', 'background:none;border:0;color:#0a84ff;font-size:12px;');
        edit.addEventListener('click', function () {
          renderRouteForm(uniHost, o, { targetPage: null, refreshStatus: refreshStatus, showDelete: true, onSave: function (w, r) { finishWork(w, r); } });
          renderOverrideList();
        });
        row.appendChild(badge); row.appendChild(txt); row.appendChild(edit);
        uniHost.appendChild(row);
      });
      // 从 reference fixtures 添加
      var fx = (window.__FIXTURES__ && window.__FIXTURES__.reference && window.__FIXTURES__.reference.routes) || [];
      if (fx.length) {
        var addRow = el('div', '', 'display:flex;gap:6px;margin-top:8px;');
        var sel = document.createElement('select');
        sel.style.cssText = 'flex:1;background:#111;color:#f2f2f7;border:1px solid #333;border-radius:6px;padding:6px;font-size:12px;';
        fx.forEach(function (r, i) {
          var o = document.createElement('option');
          o.value = i;
          o.textContent = String(r.method || 'get').toUpperCase() + ' ' + r.match + '  (' + (r._file || '').split('/').pop() + ')';
          sel.appendChild(o);
        });
        var go = el('button', '＋ 添加为新覆盖层并编辑', 'flex:0 0 auto;background:#2c2c2e;color:#0a84ff;border:0;border-radius:6px;padding:6px 8px;font-size:12px;');
        go.addEventListener('click', function () {
          var r = fx[Number(sel.value)]; if (!r) return;
          var route = { match: r.match, method: r.method, data: deepClone(r.data) };
          upsertOverride(route);
          renderRouteForm(uniHost, route, { targetPage: null, refreshStatus: refreshStatus, showDelete: true, onSave: function (w, rr) { finishWork(w, rr); } });
          renderOverrideList();
          showToast('已添加 ' + route.match + ' 并进入表单编辑');
        });
        addRow.appendChild(sel); addRow.appendChild(go);
        uniHost.appendChild(addRow);
        uniHost.appendChild(el('div', '提示：schema 从该路由当前 JSON 自动推导；数组项可「＋添加一项 / 删除」，数组用逗号分隔。', 'color:#636366;font-size:11px;margin-top:4px;'));
      }
    }
    renderOverrideList();

    // ---- 编辑器（原始 JSON，保留）----
    overlay.appendChild(title('自定义路由覆盖层（原始 JSON 编辑器）'));
    var editor = el('textarea', '', 'width:100%;height:160px;background:#111;color:#7ee787;border:1px solid #333;border-radius:8px;padding:8px;font:12px/1.4 monospace;white-space:pre;box-sizing:border-box;');
    editor.value = JSON.stringify(getOverrides(), null, 1);
    overlay.appendChild(editor);
    var editRow = el('div', '', 'display:flex;gap:8px;');
    editRow.appendChild(btn('保存覆盖层', function () {
      try {
        var list = JSON.parse(editor.value);
        if (!Array.isArray(list)) throw new Error('必须是数组');
        setOverrides(list);
        showToast('已保存 ' + list.length + ' 条，刷新页面生效');
        refreshStatus(); renderOverrideList();
      } catch (e) { showToast('JSON 无效: ' + e.message); }
    }, 'flex:1;'));
    editRow.appendChild(btn('清空覆盖层', function () {
      editor.value = '[]';
      setOverrides([]);
      showToast('已清空');
      refreshStatus(); renderOverrideList();
    }, 'flex:1;'));
    overlay.appendChild(editRow);
    overlay.appendChild(btn('📋 复制覆盖层 JSON（可粘贴到 web/fixtures/custom/*.json 持久化）', function () {
      try {
        var ta = document.createElement('textarea');
        ta.value = editor.value;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('已复制');
      } catch (e) { showToast('复制失败，请手动选择复制'); }
    }));

    // ---- 日志 ----
    overlay.appendChild(title('请求日志'));
    var logArea = el('pre', '', 'background:#111;border-radius:8px;padding:10px;max-height:180px;overflow:auto;white-space:pre-wrap;word-break:break-all;display:none;');
    overlay.appendChild(btn('查看最近请求日志（miss 是需要补 fixture 的接口）', function () {
      var entries = (stub && stub.getLog) ? stub.getLog() : [];
      logArea.textContent = entries.slice(-100).map(function (e) {
        return '[' + e.kind + '] ' + (e.method ? e.method.toUpperCase() + ' ' : '') + (e.path || e.url || e.service || '');
      }).join('\n') || '（无记录）';
      logArea.style.display = 'block';
    }));
    overlay.appendChild(logArea);

    // ---- 通用 ----
    overlay.appendChild(title('通用'));
    overlay.appendChild(btn('重置本地数据（清空 localStorage 并刷新）', function () {
      localStorage.clear();
      window.location.reload();
    }));
    overlay.appendChild(btn('关闭', function () { closePanel(); }));

    overlay.appendChild(el('div', '提示: 覆盖层数据仅存于本机 localStorage；如需持久化，复制 JSON 到 web/fixtures/custom/ 对应文件后运行 web/build.sh。', 'color:#8e8e93;margin-top:16px;font-size:12px;'));
    document.body.appendChild(overlay);
  }
})();
