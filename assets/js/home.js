/* Home: a time-of-day greeting on the today card (Ulaanbaatar time), refreshed every minute. */
(function () {
  'use strict';
  var el = document.getElementById('homeGreeting'); if (!el) return;
  var kicker = document.querySelector('.site-menu-kicker'), className = kicker ? kicker.textContent.trim() : '';
  var T = function (key, fallback) { return window.C122I18n ? window.C122I18n.t(key, fallback) : fallback; };
  var GREETINGS = {
    night: ['🌙', 'home.greet.night', 'Сайхан амраарай'],
    morning: ['☀️', 'home.greet.morning', 'Өглөөний мэнд'],
    day: ['🌤️', 'home.greet.day', 'Өдрийн мэнд'],
    evening: ['🌆', 'home.greet.evening', 'Оройн мэнд']
  };
  function hour() {
    try { return parseInt(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Ulaanbaatar' }).format(new Date()), 10) % 24; }
    catch (e) { return new Date().getHours(); }
  }
  function render() {
    var h = hour(), g = GREETINGS[h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'day' : h < 22 ? 'evening' : 'night'];
    var text = g[0] + ' ' + T(g[1], g[2]) + (className ? ', ' + className + '!' : '!');
    if (el.textContent !== text) el.textContent = text;
  }
  render();
  setInterval(render, 60000);
  document.addEventListener('c122:language', render);
})();
