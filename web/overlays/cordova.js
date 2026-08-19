// ============================================================
// O1: cordova.js 正式 mock（复刻层浏览器/iOS 壳共用）
// 依赖: api-stub.js 先于本文件加载（window.__API_STUB__ 已定义）
// 职责: 触发 deviceready + 最小 Cordova 插件方法集
//       业务请求由 __API_STUB__.handleSendRequest 接管（O2）
// ============================================================
(function () {
  'use strict';
  function noop() {}

  var cordova = {
    version: '6.0.0',
    plugins: {
      Device: {
        getInfo: function (s) { s && s({ platform: 'iOS', version: '17.0', model: 'iPhone', uuid: 'mock-uuid', cordova: '6.0.0' }); },
      },
      http: {
        setSSLCertMode: noop,
        setSSLCertModeToLock: noop,
        setRequestTimeout: noop,
        enableSSLPinning: noop,
        acceptAllCerts: noop,
        sendRequest: function (url, options, success, failure) {
          var stub = window.__API_STUB__;
          if (stub && stub.handleSendRequest) {
            stub.handleSendRequest(url, options, success, failure);
          } else if (failure) {
            failure({ status: -1, error: 'cordova-mock: no api-stub registered' });
          }
        },
      },
      statusbar: {
        overlaysWebView: noop, styleLightContent: noop, styleDefault: noop,
        styleBlackTranslucent: noop, styleBlackOpaque: noop, hide: noop, show: noop,
      },
      app: {
        getVoiceOverStatus: function (s) { s && s(false); },
        getAppEnterForegroundBackStatus: function (s) { s && s({ status: 'foreground' }); },
        isJailBreak: function (s) { s && s(false); },
        getDeviceStatus: function (s) { s && s({}); },
        getAppVersion: function (s) { s && s('2.3.3'); },
        getModel: function (s) { s && s('iPhone'); },
        getPlatform: function (s) { s && s('iOS'); },
        disableScreen: function (cb) { cb && cb(); },
        enableScreen: function (cb) { cb && cb(); },
        goBack: function (cb) { cb && cb(); },
        closeApp: function (cb) { cb && cb(); },
        getUUID: function (cb) { cb && cb('mock-uuid-123'); },
        getNetworkType: function (cb) { cb && cb('wifi'); },
        getNetworkStatus: function (cb) { cb && cb({ networkStatus: 'wifi', networkType: 'wifi' }); },
        getSignalStrength: function (cb) { cb && cb(80); },
        getBatteryLevel: function (cb) { cb && cb(90); },
        getStatusBarHeight: function (cb) { cb && cb(44); },
        getSafeAreaInsets: function (cb) { cb && cb({ top: 44, bottom: 34 }); },
        getTimeZone: function (cb) { cb && cb('Asia/Shanghai'); },
        setScreenBrightness: noop,
        getScreenBrightness: function (cb) { cb && cb(1); },
        setStatusBarStyle: noop,
        setStatusBarHidden: noop,
        vibrate: noop,
        makePhoneCall: noop,
        openSettings: noop,
        startEnvDetection: function (s, f) { s && s({}); },
        appOnCreate: function (s, f) { s && s({}); },
      },
      imageResizer: { resizeImage: noop },
      photoGallery: { saveImageToGallery: noop },
      etasIfaa: {
        isSupportIfaa: function (o, cb) { cb && cb({ result: false }); },
        hasPermissionForFaceID: function (cb) { cb && cb(false); },
        initIfaaBaseInfo: function (o, cb) { cb && cb({}); },
        regInit: function (o, cb) { cb && cb({}); },
        register: function (o, cb) { cb && cb({}); },
        regFinish: function (o, cb) { cb && cb({}); },
        authInit: function (o, cb) { cb && cb({}); },
        auth: function (o, cb) { cb && cb({}); },
        authFinish: function (o, cb) { cb && cb({}); },
        checkStatusInit: function (o, cb) { cb && cb({}); },
        parseResult: function (o, cb) { cb && cb({}); },
        checkLocalStatus: function (o, cb) { cb && cb({}); },
        templateUpdaInit: function (o, cb) { cb && cb({}); },
        templateUpdaFinish: function (o, cb) { cb && cb({}); },
      },
      aliyunpush: {
        SettingScore: noop,
        getRegistrationID: function (s) { s && s('mock-rid'); },
        onMessage: noop,
        onNotification: noop,
      },
      NativeAnalytics: { init: noop, onPageStart: noop, onPageEnd: noop, logEvent: noop },
    },
    require: function () { return {}; },
    exec: noop,
    fireDocumentEvent: function (e) {
      var ev = document.createEvent('Events');
      ev.initEvent(e, false, false);
      document.dispatchEvent(ev);
    },
  };
  window.cordova = cordova;

  // O1.5: InAppBrowser —— 官方"外链"（办税指南/最新法规/热点问题/mobilezty 等）
  // 均为内置浏览器直开的外部站点（12366 纳税服务平台等），不属于 App 自身 UI，
  // 不本地化：联网设备直接放行真实 URL（与原 App 行为一致），离线仅记录日志。
  var _iab = {
    open: function (url, target) {
      try {
        console.log('[cordova-mock] InAppBrowser.open →', String(url).slice(0, 160));
      } catch (e2) {}
      if (typeof url === 'string' && /^https?:\/\//.test(url)) {
        try { window.open(url, target || '_blank'); } catch (e3) {}
      }
      return { addEventListener: function () {}, removeEventListener: function () {} };
    },
    notify: function () {},
    close: function () {},
  };
  cordova.InAppBrowser = _iab;
  cordova.plugins.InAppBrowser = _iab;

  window.SMGNativeJS = window.SMGNativeJS || {};
  var _nr = window.SMGNativeJS.nativeRouter || function () {};
  window.SMGNativeJS.nativeRouter = function (service, payload, cb) {
    var stub = window.__API_STUB__;
    if (stub && stub.handleNativeRouter) {
      stub.handleNativeRouter(service, payload, cb);
    } else if (cb) {
      cb({ status: -1, error: 'intercepted' });
    }
  };

  window.plugins = window.plugins || {};
  // 顺带补齐浏览器环境缺失对象（防各页面初始化报错）
  try {
    if (!window.navigator.connection) {
      window.navigator.connection = { type: 'wifi', effectiveType: '4g' };
    }
  } catch (e) {}
  window.plugins.sim = window.plugins.sim || {
    getSimInfo: function (cb) { cb && cb({ phoneNumber: '', countryCode: '86' }); },
  };
  window.plugins.NativeAnalytics = { init: noop, onPageStart: noop, onPageEnd: noop, logEvent: noop };
  window.plugins.LaunchHotCode = {
    launch: noop,
    getConfig: function (cb) { cb && cb({}); },
    hasUpdate: function (cb) { cb && cb({ result: false }); },
    installCompleteStatus: function (o, cb) { cb && cb({ status: 'installed' }); },
    updateCompleteStatus: function (o, cb) { cb && cb({ status: 'updated' }); },
    checkUpdateStatus: function (o, cb) { cb && cb({ status: 'none' }); },
  };
  window.plugins.hotCode = window.plugins.LaunchHotCode;
  // 注意: app 端 $native.LaunchHotCode.hotCodeAnalytics 是 Promise 包装, 会对回调结果 JSON.parse
  // 必须传 JSON 字符串, 不能传对象 (对象会被 String() 成 "[object Object]" 导致 parse 崩)
  window.plugins.LaunchHotCode.hotCodeAnalytics = function (o, s, f) { s && s('{}'); };

  var fired = false;
  function fireDeviceReady() {
    if (fired) return;
    fired = true;
    var e = document.createEvent('Events');
    e.initEvent('deviceready', false, false);
    document.dispatchEvent(e);
    // 自定义层：官方 deviceready 会清除 authToken（防过期），这里补回 mock 登录态，
    // 使所有"登录后"页面可进入（无验证需求）。仅当用户未自行登录时生效。
    try {
      if (!localStorage.getItem('authToken')) {
        localStorage.setItem('authToken', 'mock-offline-token');
        localStorage.setItem('tokenTime', String(Date.now()));
      }
    } catch (e2) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fireDeviceReady, false);
  } else {
    setTimeout(fireDeviceReady, 50);
  }
  document.addEventListener('DOMContentLoaded', fireDeviceReady, false);
  setTimeout(fireDeviceReady, 3000);
})();
