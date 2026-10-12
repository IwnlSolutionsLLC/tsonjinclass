(function () {
  'use strict';
  var C = window.C122, form = document.getElementById('musicSettingsForm');
  if (!C || !form) return;
  var key = document.getElementById('musicApiKey'), clear = document.getElementById('musicClearKey');
  var status = document.getElementById('musicSettingsStatus'), error = document.getElementById('musicSettingsError'), save = document.getElementById('musicSettingsSave');
  function apply(data) {
    key.value = ''; clear.checked = false;
    var fromServer = data.source === 'environment';
    key.disabled = clear.disabled = fromServer;
    status.textContent = fromServer ? 'Серверийн тохиргоогоор YouTube хайлт холбогдсон' : data.configured ? 'YouTube хайлт холбогдсон' : 'Хайлт холбогдоогүй · YouTube холбоос ашиглаж болно';
    key.placeholder = data.configured ? 'Хоосон орхивол одоогийн түлхүүр хэвээр' : 'YouTube Data API v3 түлхүүр';
  }
  C.api('music_settings').then(apply).catch(function (e) { error.textContent = e.message; });
  form.addEventListener('submit', function (event) {
    event.preventDefault(); save.disabled = true; error.textContent = ''; status.textContent = 'Хадгалж байна…';
    C.api('music_settings_save', { body: { apiKey: key.value.trim(), clear: clear.checked } }).then(function (data) {
      apply(data); C.toast('Music тохиргоо хадгалагдлаа.');
    }).catch(function (e) { error.textContent = e.message; status.textContent = ''; }).finally(function () { save.disabled = false; });
  });
}());
