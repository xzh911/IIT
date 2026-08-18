// ============================================================
// O4: dev-entry.js — 隐蔽开发者入口 + /dev 数据面板（自定义层）
// 触发: 「关于&更新」页「自然人办税服务平台」连点 5 次
// 功能:
//   1. fixture 模式切换（reference/custom）
//   2. 一键生成 mock 数据（用户/税务记录/消息/完税证明/任职受雇）→ 写入
//      localStorage['etax_custom_overrides']（api-stub 运行时覆盖层，刷新即生效）
//   3. 覆盖层 JSON 编辑器（导入/导出/清空）
//   4. 请求日志查看 / 重置本地数据 / 关闭
// 所有生成数据均带 source:"mock" 标识；面板明确声明非官方。
// ============================================================
(function () {
  'use strict';

  var OVERRIDE_KEY = 'etax_custom_overrides';
  var MODE_KEY = 'etax_fixture_mode';
  var GLOBAL_STATE_KEY = 'etax_global_state';

  function getGlobalState() {
    try { return JSON.parse(localStorage.getItem(GLOBAL_STATE_KEY) || '{}'); } catch (e) { return {}; }
  }

  // ---- 模板库：快速生成（数据全部 source:mock） ----
  var TEMPLATES = {
    user: {
      label: '示例用户（我的页/登录/实名）',
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
      routes: [
        {
          match: '/zrr/wszm/query',
          method: 'post',
          data: { code: 'SUCCESS', data: { total: 1, hjse: 1906, list: [{ ddbh: 'MOCK202600000099', pzMc: '税收完税证明（表格式）', pzje: 1906, zfje: 1906, kjrq: '2026-08-18', payTime: '2026-08-18 11:00:00', jkfsMc: '三方协议缴税', pzztMc: '已开具', wszmztDm: '01', sdxm: '综合所得', skssqq: '2026-05-01', skssqz: '2026-06-30', sjtse: 1906, skssjg: '国家税务总局北京市税务局', sz: '个人所得税', ypzh: 'MOCK202600000099', sbrq: '2026-08-18', hsqj: false, state: false, source: 'mock' }] } },
        },
      ],
    },
  };

  // ---- 覆盖层读写 ----
  function getOverrides() {
    try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '[]'); } catch (e) { return []; }
  }
  function setOverrides(list) {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(list));
  }
  function mergeTemplate(key) {
    var t = TEMPLATES[key];
    if (!t) return false;
    var cur = getOverrides();
    var need = (t.routes || []).filter(function (r) {
      return !cur.some(function (c) { return c.match === r.match; });
    });
    cur = cur.concat(need);
    setOverrides(cur);
    return need.length;
  }

  function modeLabel() {
    try { return localStorage.getItem(MODE_KEY) === 'custom' ? 'custom' : 'reference'; } catch (e) { return 'reference'; }
  }

  // ---- 入口：5 连击（协议页「用户注册协议」标题 / 注册协议正文） ----
  var TAP_TARGETS = ['用户注册协议', '自然人办税服务平台'];
  var taps = 0, lastTap = 0;
  document.addEventListener('click', function (e) {
    var el = e.target;
    // 排除协议/更新弹窗内的点击（弹窗正文含「服务平台」等字样会误触入口）
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
        if (taps >= 5) { taps = 0; openDevPanel(); }
        return;
      }
    }
  });

  // ---- 面板 ----
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

    overlay.appendChild(el('h1', '开发者工具 · /dev', 'font-size:20px;font-weight:700;margin:0 0 4px;'));
    overlay.appendChild(el('div', '自定义开发层（非官方界面）。所有生成数据 source:mock。', 'color:#8e8e93;margin-bottom:14px;'));

    var status = el('div', '', 'background:#2c2c2e;border-radius:8px;padding:10px;margin-bottom:10px;');
    function refreshStatus() {
      var d = (stub && stub.describe) ? stub.describe() : {};
      status.textContent = 'fixture 模式: ' + modeLabel() +
        ' | reference: ' + d.referenceRoutes + ' 条 | custom: ' + d.customRoutes +
        ' 条 | 覆盖层: ' + getOverrides().length + ' 条 | 请求记录: ' + d.logLength + ' 条';
    }
    refreshStatus();
    overlay.appendChild(status);

    // ---- 生成区 ----
    overlay.appendChild(title('一键生成 mock 数据（写入覆盖层，刷新页面生效）'));
    Object.keys(TEMPLATES).forEach(function (k) {
      var t = TEMPLATES[k];
      overlay.appendChild(btn('➕ ' + t.label, function () {
        var n = mergeTemplate(k);
        showToast(n > 0 ? ('已生成 ' + n + ' 条路由，刷新页面生效') : '该模板已存在，未重复添加');
        refreshStatus();
      }));
    });

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

    // ---- 编辑器 ----
    overlay.appendChild(title('自定义路由覆盖层（JSON 编辑器）'));
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
        refreshStatus();
      } catch (e) { showToast('JSON 无效: ' + e.message); }
    }, 'flex:1;'));
    editRow.appendChild(btn('清空覆盖层', function () {
      editor.value = '[]';
      setOverrides([]);
      showToast('已清空');
      refreshStatus();
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
    overlay.appendChild(btn('关闭', function () { document.body.removeChild(overlay); }));

    overlay.appendChild(el('div', '提示: 覆盖层数据仅存于本机 localStorage；如需持久化，复制 JSON 到 web/fixtures/custom/ 对应文件后运行 web/build.sh。', 'color:#8e8e93;margin-top:16px;font-size:12px;'));
    document.body.appendChild(overlay);

    function showToast(msg) {
      var t = el('div', msg, 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:8px 14px;border-radius:6px;font-size:13px;z-index:2147483648;');
      document.body.appendChild(t);
      setTimeout(function () { document.body.removeChild(t); }, 2200);
    }
  }
})();