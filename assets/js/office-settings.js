(function () {
  'use strict';
  var C = window.C122, form = document.getElementById('officeForm');
  if (!form) return;
  var enabled = document.getElementById('officeEnabled'), server = document.getElementById('officeServer'), site = document.getElementById('officeSite'), internal = document.getElementById('officeInternal'), secret = document.getElementById('officeSecret'), status = document.getElementById('officeSettingsStatus'), error = document.getElementById('officeSettingsError'), save = document.getElementById('officeSave');
  function apply(settings) {
    enabled.checked = settings.enabled; server.value = settings.serverUrl || ''; site.value = settings.siteUrl || ''; internal.value = settings.serverInternalUrl || ''; secret.value = '';
    secret.placeholder = settings.hasSecret ? 'Хоосон орхивол одоогийн түлхүүр хэвээр' : '32-с дээш тэмдэгттэй нууц түлхүүр';
    status.textContent = settings.enabled ? 'Бүрэн Office идэвхтэй' : 'Энгийн засварлагч ашиглаж байна';
  }
  C.api('office_settings').then(function (data) { apply(data.settings); }).catch(function (e) { error.textContent = e.message; });
  form.onsubmit = async function (event) {
    event.preventDefault(); save.disabled = true; error.textContent = ''; status.textContent = 'Хадгалж байна…';
    try {
      var data = await C.api('office_settings', { body: { enabled: enabled.checked, serverUrl: server.value.trim(), siteUrl: site.value.trim(), serverInternalUrl: internal.value.trim(), jwtSecret: secret.value } });
      apply(data.settings); C.toast('Office тохиргоо хадгалагдлаа.');
    } catch (e) { error.textContent = e.message; status.textContent = ''; }
    finally { save.disabled = false; }
  };
})();
