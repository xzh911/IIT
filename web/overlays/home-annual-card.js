// 首页年度汇算卡：直接复用 IMG_3983 中的完整官方卡片像素，避免拆层重建造成
// 字体、插画边缘和圆角误差；专题入口与申报按钮仍保留为真实可访问点击区域。
(function () {
  'use strict';

  var CARD_ID = 'etax-home-annual-card';

  function findRouter() {
    var nodes = document.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
      var vm = nodes[i].__vue__;
      if (vm && vm.$router) return vm.$router;
    }
    return null;
  }

  function openAnnual() {
    var router = findRouter();
    if (!router) return;
    try {
      var nav = router.push('/ndhsqj');
      if (nav && typeof nav.catch === 'function') nav.catch(function () {});
    } catch (e) { /* 离线壳不抛出导航异常 */ }
  }

  function mount() {
    if (!/^#\/(zdj-home|home)(?:[/?]|$)/.test(location.hash || '')) return;
    if (document.getElementById(CARD_ID)) return;
    var slot = document.querySelector('.zdj-home-content .declare-swiper .declare-swiper-item');
    var important = document.querySelector('.zdj-home-content .zdj-home-important');
    if (!slot && important && important.parentNode) {
      slot = document.createElement('div');
      slot.className = 'etax-home-annual-fallback';
      important.parentNode.insertBefore(slot, important);
    }
    if (!slot) return;
    var existingText = slot.textContent || '';
    if (/2025综合所得年度汇算|已于6月30日结束/.test(existingText)) return;

    var placeholder = slot.querySelector('.contents-declare-banner');
    if (placeholder) placeholder.style.visibility = 'hidden';
    slot.classList.add('etax-home-annual-slot');
    if (important) important.classList.add('etax-home-important-after-annual');

    var card = document.createElement('section');
    card.id = CARD_ID;
    card.className = 'etax-home-annual-card';
    card.setAttribute('aria-label', '2025综合所得年度汇算，已于6月30日结束，请您尽快申报');
    card.innerHTML =
      '<img class="etax-home-annual-image" src="./static/images/home-annual-card-full.png" alt="2025综合所得年度汇算，已于6月30日结束，逾期办理可能会产生滞纳金，请您尽快申报">' +
      '<button class="etax-home-annual-topic-hit" type="button" aria-label="进入2025综合所得年度汇算专题页"></button>' +
      '<button class="etax-home-annual-start-hit" type="button" aria-label="开始申报2025综合所得年度汇算"></button>';
    var hits = card.querySelectorAll('button');
    for (var i = 0; i < hits.length; i++) hits[i].addEventListener('click', openAnnual);
    slot.appendChild(card);
  }

  var style = document.createElement('style');
  style.textContent =
    '.etax-home-annual-slot{position:relative;overflow:visible!important}' +
    '.etax-home-annual-fallback{box-sizing:border-box;height:208px;margin:8px 12.86px 28px;position:relative}' +
    '.etax-home-annual-card{position:absolute;z-index:2;box-sizing:border-box;left:12.86px;right:12.86px;top:94px;height:208px;overflow:hidden;border-radius:9px;background:#edf7ff;box-shadow:0 8px 20px rgba(57,124,212,.08)}' +
    '.etax-home-annual-fallback .etax-home-annual-card{inset:0}' +
    '.etax-home-annual-image{display:block;width:100%;height:100%;object-fit:contain;border-radius:inherit;pointer-events:none}' +
    '.etax-home-annual-card button{position:absolute;z-index:3;margin:0;padding:0;border:0;background:transparent;color:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.etax-home-annual-topic-hit{top:0;right:0;width:112px;height:39px;border-radius:0 9px 0 24px!important}' +
    '.etax-home-annual-start-hit{left:17px;top:139px;width:168px;height:48px;border-radius:25px!important}' +
    '.etax-home-annual-card button:focus-visible{outline:2px solid #1f7ff5;outline-offset:-3px}' +
    '.etax-home-annual-slot+.etax-home-important-after-annual{margin-top:48px!important}' +
    '.zdj-home-container .zdj-home-notify-box .notify-item .notify-loop-div{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","PingFangSC-Regular","Helvetica Neue",sans-serif!important;font-weight:400!important}' +
    '.zdj-outter{background:rgba(255,255,255,.84)!important;-webkit-backdrop-filter:blur(12px) saturate(135%)!important;backdrop-filter:blur(12px) saturate(135%)!important;box-shadow:inset 0 0 10px rgba(255,255,255,.68),0 2px 15px rgba(0,0,0,.08)!important}' +
    '.zty-banner-swiper{margin-top:11px!important}' +
    '.zty-banner-swiper .swiper-pagination{display:none!important}';
  (document.head || document.documentElement).appendChild(style);

  var observer = new MutationObserver(mount);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('hashchange', function () { setTimeout(mount, 0); });
  setInterval(mount, 600);
  mount();
})();
