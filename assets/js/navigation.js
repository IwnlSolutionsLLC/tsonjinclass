/* Compact class navigation: every section lives in one keyboard-accessible drawer. */
(function () {
  'use strict';
  var menu = document.getElementById('siteMenu'), trigger = document.getElementById('siteMenuButton'), close = document.getElementById('siteMenuClose'), current = document.getElementById('siteCurrentSection');
  if (!menu || !trigger || !close) return;
  var opened = false, previousFocus = null;
  var names = {schedule:'nav.schedule',clubs:'nav.clubs',album:'nav.album',folders:'nav.folders',textbooks:'nav.textbooks',doodle:'nav.doodle',board:'nav.board',music:'nav.music',youtube:'nav.youtube',google:'nav.google',games:'nav.games',photobooth:'nav.photobooth','ai-chat':'nav.aiChat',teachermirror:'nav.teachermirror'};
  function restore() {
    opened = false; trigger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('site-menu-open');
    if (previousFocus && previousFocus.isConnected && previousFocus.focus) previousFocus.focus();
    previousFocus = null;
  }
  function hide() {
    if (!opened) return;
    if (typeof menu.close === 'function') menu.close(); else { menu.removeAttribute('open'); menu.hidden = true; }
    restore();
  }
  function show() {
    if (opened) return;
    previousFocus = document.activeElement; menu.hidden = false;
    if (typeof menu.showModal === 'function') menu.showModal(); else menu.setAttribute('open', '');
    opened = true; trigger.setAttribute('aria-expanded', 'true'); document.body.classList.add('site-menu-open');
    var selected = menu.querySelector('.tab.on') || close; selected.focus();
  }
  function update(name) {
    name = names[name] ? name : 'schedule';
    if (!current) return;
    var label = menu.querySelector('[data-tab="' + name + '"] span[data-i18n]');
    current.dataset.i18n = names[name];
    current.textContent = label ? label.textContent : name;
    if (window.C122I18n) window.C122I18n.translate(current);
  }
  trigger.addEventListener('click', function () { if (opened) hide(); else show(); });
  close.addEventListener('click', hide);
  menu.addEventListener('close', restore);
  menu.addEventListener('click', function (event) {
    if (event.target.closest('[data-tab],a,[data-add-media],[data-menu-action]')) { hide(); return; }
    if (event.target === menu) { var rect = menu.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) hide(); }
  });
  menu.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && typeof menu.showModal !== 'function') { event.preventDefault(); hide(); }
    if (event.key !== 'Home' && event.key !== 'End') return;
    var tabs = menu.querySelectorAll('[role="tab"]'); if (!tabs.length) return;
    event.preventDefault(); tabs[event.key === 'Home' ? 0 : tabs.length - 1].click();
  });
  document.addEventListener('c122:tab', function (event) { update(event.detail && event.detail.name); });
  document.addEventListener('c122:language', function () { update(document.body.dataset.tab); });
  update(document.body.dataset.tab);

  /* Full screen is offered here, never forced: it starts only when this button is pressed. */
  var fullscreenButton = document.getElementById('siteFullscreenButton');
  if (fullscreenButton) {
    var fullscreenLabel = fullscreenButton.querySelector('span'), fullscreenIcon = fullscreenButton.querySelector('use'), page = document.documentElement;
    var fullscreenText = function (key, fallback) { return window.C122I18n ? window.C122I18n.t(key, fallback) : fallback; };
    var fullscreenNotice = function (message) { if (window.C122 && window.C122.toast) window.C122.toast(message, 'error'); };
    var fullscreenOn = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };
    var fullscreenRender = function () {
      var on = fullscreenOn();
      fullscreenButton.setAttribute('aria-pressed', String(on));
      fullscreenLabel.setAttribute('data-i18n', on ? 'nav.exitFullscreen' : 'mirror.fullscreen');
      fullscreenLabel.textContent = on ? 'Бүтэн дэлгэцээс гарах' : 'Бүтэн дэлгэц';
      if (fullscreenIcon) fullscreenIcon.setAttribute('href', on ? '#i-compress' : '#i-expand');
      if (window.C122I18n) window.C122I18n.translate(fullscreenLabel);
    };
    fullscreenButton.addEventListener('click', function () {
      if (fullscreenOn()) {
        var leave = document.exitFullscreen || document.webkitExitFullscreen;
        if (leave) Promise.resolve(leave.call(document)).catch(function () {});
        return;
      }
      var enter = page.requestFullscreen || page.webkitRequestFullscreen;
      if (!enter || document.fullscreenEnabled === false) { fullscreenNotice(fullscreenText('nav.fullscreenUnsupported', 'Энэ хөтөч бүтэн дэлгэцийг дэмжихгүй байна. iPhone дээр Safari-ийн «Хуваалцах» → «Үндсэн дэлгэцэнд нэмэх» ашиглан апп болгон нээвэл бүтэн дэлгэцээр нээгдэнэ.')); return; }
      Promise.resolve(enter.call(page, { navigationUI: 'hide' })).catch(function () { fullscreenNotice(fullscreenText('nav.fullscreenBlocked', 'Бүтэн дэлгэц нээгдсэнгүй. Дахин оролдоно уу.')); });
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (name) { document.addEventListener(name, fullscreenRender); });
    document.addEventListener('c122:language', fullscreenRender);
    fullscreenRender();
  }
})();
