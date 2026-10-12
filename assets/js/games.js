/* One Games section, with separate lifecycle and keyboard controls for each game. */
(function () {
  'use strict';
  var C = window.C122, view = document.getElementById('view-games'); if (!C || !view) return;
  var names = ['flashcards','ludo','chooser'], selected = 'flashcards', visible = false;
  var controllers = {flashcards:'Flashcards',ludo:'Ludo',chooser:'Chooser'};
  try { var saved = localStorage.getItem('c122:game'); if (names.indexOf(saved) >= 0) selected = saved; } catch (_) {}
  function controller(name) { return C[controllers[name]]; }
  function stop(name) { var game = controller(name); if (game && game.hide) game.hide(); if (C.SFX && C.SFX.stop) C.SFX.stop(); }
  function choose(name) {
    if (names.indexOf(name) < 0) name = selected;
    var changed = name !== selected;
    if (visible && changed) stop(selected);
    selected = name;
    names.forEach(function (key) {
      var button = document.getElementById('game-tab-' + key), panel = document.getElementById('view-' + key), on = key === selected;
      button.setAttribute('aria-selected',String(on)); button.tabIndex = on ? 0 : -1; panel.hidden = !on;
    });
    try { localStorage.setItem('c122:game',selected); } catch (_) {}
    if (visible) { var game = controller(selected); if (game && game.show) game.show(); }
  }
  view.querySelector('.games-picker').addEventListener('click',function (event) {
    var button = event.target.closest('[data-game]'); if (button && button.dataset.game !== selected) choose(button.dataset.game);
  });
  view.querySelector('.games-picker').addEventListener('keydown',function (event) {
    var index = names.indexOf(selected), next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % names.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + names.length - 1) % names.length;
    else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = names.length - 1; else return;
    event.preventDefault(); choose(names[next]); document.getElementById('game-tab-' + selected).focus();
  });
  C.Games = {
    show:function (name) { if (visible && (!name || name === selected)) return; visible = true; choose(name || selected); },
    hide:function () { if (visible) stop(selected); visible = false; }
  };
})();
