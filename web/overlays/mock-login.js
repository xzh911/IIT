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
    sfzjhm: '110101199001011234',
    sfzjlxMc: '居民身份证',
    nsrsbh: '110101199001011234',
    sjhm: '13800001234',
    xbDm: [],
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
          nsrsbh: USER.nsrsbh,
          sfzjhm: USER.sfzjhm,
          sfzjlxMc: USER.sfzjlxMc,
          xbDm: [USER.xbDm || '1'],
          mzDm: ['01'],
          xlDm: ['110'],
        }, ui.userInfoObj || {});
        ui.nsrsbhNoHide = USER.nsrsbh;
        store.commit('@USER/COPY_USERINFO_ORIGINAL_DATA');
      }
    } catch (e) {
      if (window.__ETAX_STUB_DEBUG__) console.log('[mock-login]', String(e).slice(0, 120));
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function tick() {
      boot();
      if (!window.__MOCK_LOGIN_DONE__) setTimeout(tick, 500);
    }, 1500);
  });
})();