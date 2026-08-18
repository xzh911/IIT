// ============================================================
// O5: config-overrides.js — 运行时配置本地化（复刻层）
// 说明: 真实请求通道已被 api-stub 拦截（O2），此处只做声明性覆盖，
//       供第三方脚本/未来扩展读取，不修改官方 bundle。
// ============================================================
(function () {
  'use strict';
  window.__ETAX_OFFLINE__ = true;
  window.__ETAX_SOURCE__ = 'mock';
  window.__ETAX_CONFIG__ = {
    SERVER_API: (window.location && window.location.origin ? window.location.origin : '') + '/api/',
    ANALYTICS_API: '',
    HOTUPDATE_API: '',
    source: 'mock',
  };
})();
