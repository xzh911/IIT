// ============================================================
// O6: mock-login.js — mock 登录态注入（自定义层）
// 官方 deviceready 会清除 authToken（cordova.js 已补回）；
// 此脚本等 Vuex 就绪后 commit @USER/SET_BASE_INFO，
// 使 config.logined=true + userInfo 有值（我的页显示用户信息）。
// 轮询实现：应用加载完成（DOMContentLoaded）后每 500ms 探测 store。
// ============================================================
(function () {
  'use strict';
  var MOCK_USER = {
    xm: '张伟',
    sfzjhm: '3****************6',
    sfzjlxMc: '居民身份证',
    sfzjlxDm: '201',
    // 完整 mock 识别号仅用于离线“查看”，普通页面初始态仍写脱敏值。
    nsrsbh: '311010101234567896',
    csrq: 631123200000,
    sjhm: '13800001234',
    gjhdqMc: '中国',
    jwrzsggjDm: '156',
    jwrzsggjMc: '中国',
    xbDm: '1',
    mzDm: '01',
    xlDm: '30',
    dzyx: '',
    dzxx: [],
    houseRegionDm: [],
    houseAddress: '',
    residenceRegionDm: [],
    residenceAddress: '',
    source: 'mock',
  };

  function findStore() {
    var nodes = document.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
      var v = nodes[i].__vue__;
      if (v && v.$store) return v.$store;
    }
    return null;
  }

  function getGlobalState() {
    try {
      return JSON.parse(localStorage.getItem('etax_global_state') || '{}');
    } catch (e) { return {}; }
  }

  function applyGlobalState(store) {
    var gs = getGlobalState();
    // 城市/省份：serverRegion + citycode（官方 getCityName 读取）
    if (gs.cityDm && gs.cityMc) {
      try {
        localStorage.setItem('serverRegion', JSON.stringify([{ value: gs.cityDm, level: '1', label: gs.cityMc }]));
        localStorage.setItem('citycode', gs.cityDm);
      } catch (e) {}
    }
    // 年度：common.incomeObj.sdnd（收入明细/汇算等用）
    if (gs.year && store.state.common) {
      var io = store.state.common.incomeObj || {};
      io.sdnd = gs.year;
      store.state.common.incomeObj = io;
      try { localStorage.setItem('incomeYear', gs.year); } catch (e) {}
    }
    return gs;
  }

  function boot() {
    if (window.__MOCK_LOGIN_DONE__) return;
    var store = findStore();
    if (!store) return;
    window.__MOCK_LOGIN_DONE__ = true;
    var gs = applyGlobalState(store);
    var USER = MOCK_USER;
    if (gs.userName) USER = Object.assign({}, MOCK_USER, { xm: gs.userName });
    try { window.__MOCK_LOGIN_DBG__ = { gs: gs, userXm: USER.xm, cfgLogined: store.state.config.logined, uiXmBefore: store.state.userInfo && store.state.userInfo.userInfoObj ? store.state.userInfo.userInfoObj.xm : null }; } catch (e) {}
    try {
      var cfg = store.state.config || {};
      if (!cfg.logined) {
        store.commit('@USER/SET_BASE_INFO', USER);
      }
      // 我的页读 state.userInfo.userInfoObj（@USER/USER_INFO 模块）；
      // 直接赋值响应式属性即可（自定义层注入 mock 用户资料）
      var ui = store.state.userInfo;
      if (ui && ui.userInfoObj && !ui.userInfoObj.xm) {
        ui.userInfoObj = Object.assign({}, {
          xm: USER.xm,
          nsrsbh: '3****************6',
          sfzjhm: USER.sfzjhm,
          sfzjlxMc: USER.sfzjlxMc,
          sfzjlxDm: USER.sfzjlxDm,
          csrq: '1990-01-01',
          sjhm: USER.sjhm,
          gjhdqMc: USER.gjhdqMc,
          jwrzsggjDm: USER.jwrzsggjDm,
          jwrzsggjMc: USER.jwrzsggjMc,
          xbDm: [USER.xbDm],
          mzDm: [USER.mzDm],
          xlDm: [USER.xlDm],
          mail: USER.dzyx,
          dzxx: USER.dzxx,
        }, ui.userInfoObj || {});
        store.commit('@USER/COPY_USERINFO_ORIGINAL_DATA');
      }
      // 申报记录页（/declaration_record_general）直开兜底：
      // 官方 App 仅从申报详情入口 commit recordStore 后再跳转，直开路由时
      // store 为空 → 不拉数。这里预置 mock 申报标识（source:mock），
      // 使直开也能渲染申报详情（自定义层，仅当 recordYwlxdm 为空时写入）。
      var rs = store.state.recordStore;
      if (rs && !rs.recordYwlxdm) {
        try {
          store.commit('recordSblsh', 'MOCK202608010000000001');
          store.commit('recordSbxh', 'MOCK202608010000000001');
          store.commit('recordYwlxdm', 'A061009014');
          store.commit('tabIndex', 0);
        } catch (e2) {}
      }
    } catch (e) {
      if (window.__ETAX_STUB_DEBUG__) console.log('[mock-login]', String(e).slice(0, 120));
    }
  }

  function installLocalNsrsbhReveal() {
    if (window.__MOCK_NSRSBH_REVEAL_INSTALLED__) return;
    window.__MOCK_NSRSBH_REVEAL_INSTALLED__ = true;
    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('.show-nsrsbh-btn') : null;
      if (!target) return;
      var store = findStore();
      var ui = store && store.state && store.state.userInfo;
      if (!store || !ui || ui.nsrsbhNoHide) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      store.commit('@USER/UPDATE_USER_NSRSBH_NO_HIDE', MOCK_USER.nsrsbh);
    }, true);
  }

  document.addEventListener('DOMContentLoaded', function () {
    installLocalNsrsbhReveal();
    setTimeout(function tick() {
      boot();
      if (!window.__MOCK_LOGIN_DONE__) setTimeout(tick, 500);
    }, 1500);
  });
})();
