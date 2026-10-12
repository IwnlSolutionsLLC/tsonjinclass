/* Apply the saved appearance before paint, then wire the accessible switch. */
(function () {
  'use strict';
  var key = 'c122:theme', root = document.documentElement;
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var preference = null;
  try { preference = localStorage.getItem(key); } catch (_) { /* Storage may be unavailable. */ }
  if (preference !== 'dark' && preference !== 'light') preference = null;
  var mode = preference || (media && media.matches ? 'dark' : 'light');
  var timer;
  function updateButtons() {
    var dark = mode === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      var label = dark ? 'Цагаан горимд шилжих' : 'Харанхуй горимд шилжих';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(dark));
      var text = button.querySelector('[data-theme-label]');
      if (text) text.textContent = dark ? 'Цагаан' : 'Харанхуй';
    });
  }
  function apply(value, animate) {
    mode = value;
    if (animate) {
      clearTimeout(timer); root.classList.add('theme-switching');
      timer = setTimeout(function () { root.classList.remove('theme-switching'); }, 350);
    }
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = mode === 'dark' ? '#0b0920' : '#f3f1ff';
    updateButtons();
  }
  apply(mode, false);
  function initialize() {
    updateButtons();
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        preference = mode === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(key, preference); } catch (_) { /* The switch still works. */ }
        apply(preference, true);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
  function systemChanged() { if (!preference) apply(media && media.matches ? 'dark' : 'light', false); }
  if (media && media.addEventListener) media.addEventListener('change', systemChanged);
  else if (media && media.addListener) media.addListener(systemChanged);
  window.addEventListener('storage', function (event) {
    if (event.key !== key) return;
    preference = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : null;
    apply(preference || (media && media.matches ? 'dark' : 'light'), true);
  });
})();
