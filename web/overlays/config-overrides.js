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

  // ---- 平台类标记（复刻壳必需）----
  // 官方 CSS 全部安全区规则挂在 .ios/.harmony 前缀下（如 .ios .zdj-header{height:calc(env(safe-area-inset-top)*1*1 + 1.17333rem)}），
  // bundle 只在鸿蒙分支 add('harmony')，iOS 分支由官方原生壳/页面注入完成。复刻壳无此注入 → 安全区规则全灭 → 顶部内容顶穿状态栏。
  // 这里按 UA 补挂 .ios，恢复官方 CSS 安全区避让（配合 viewport-fit=cover + 壳 edge-to-edge）。
  try {
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent || '')) {
      document.body.classList.add('ios');
    }
  } catch (e) { /* 忽略 */ }

  // ---- 一次性引导/提示弹窗全跳过（用户确认不需要） ----
  // 官方 bundle 弱规则：以下 localStorage 标记为真 → 对应引导不再弹出。
  // 首次安装欢迎轮播（welcome-page）、首页功能卡引导（租/贷/教育/赡养…）、
  // 分类警告等。预置标记即可永久跳过；官方 clearHomeDiologFromDeclare 在
  // 申报流程结束时会 delete 这些键，故定时重设兜底（只影响引导键，不碰业务数据）。
  var GUIDE_KEYS = [
    'firstEntry',
    'rentStorageFlag',
    'housingLoanStorageFlag',
    'housingloanStorageFlag',
    'educationStorageFlag',
    'illnessStorageFlag',
    'ContinutEducationStorageFlag',
    'elderlyStorageFlag',
    'advancePopStorageFlag',
    'nonResidentPopStorageFlag',
    'tstzbaPopShowStorageFlag',
    'neverShowClassificationWarning'
  ];
  function setGuideFlags() {
    try {
      for (var i = 0; i < GUIDE_KEYS.length; i++) {
        if (!localStorage.getItem(GUIDE_KEYS[i])) {
          localStorage.setItem(GUIDE_KEYS[i], '1');
        }
      }
    } catch (e) { /* 忽略存储异常 */ }
  }
  setGuideFlags();
  setInterval(setGuideFlags, 3000);
})();
