(function () {
  'use strict';
  var C = window.C122, form = document.getElementById('aiSettingsForm');
  if (!C || !form) return;
  function $(id) { return document.getElementById(id); }
  var key = $('aiEguneKey'), clear = $('aiClearEgune'), error = $('aiSettingsError'), status = $('aiSettingsStatus'), save = $('aiSettingsSave');
  function apply(data) {
    key.value = ''; clear.checked = false;
    key.disabled = clear.disabled = data.source === 'environment';
    status.textContent = data.configured ? 'egune-nano холбогдсон' : 'Egune түлхүүр хараахан холбогдоогүй';
    ['maxOutput', 'maxDaily', 'siteDaily', 'budgetMnt'].forEach(function (field) {
      var ids = {maxOutput:'aiMaxOutput', maxDaily:'aiMaxDaily', siteDaily:'aiSiteDaily', budgetMnt:'aiBudgetMnt'};
      if (data[field] != null) $(ids[field]).value = data[field];
    });
    if (data.totals) {
      var totals = data.totals;
      $('aiUsageStatus').textContent = 'Нийт: ' + Number(totals.input || 0).toLocaleString() + ' оролтын, ' + Number(totals.output || 0).toLocaleString() + ' гаралтын токен · ойролцоогоор ₮' + Number(totals.costMnt || 0).toFixed(2);
    }
  }
  C.api('ai_settings').then(apply).catch(function (e) { error.textContent = e.message; });
  form.addEventListener('submit', function (event) {
    event.preventDefault(); if (!form.reportValidity()) return;
    save.disabled = true; error.textContent = ''; status.textContent = 'Хадгалж байна…';
    var body = {eguneApiKey:key.value.trim(), clearEgune:clear.checked, maxOutput:Number($('aiMaxOutput').value), maxDaily:Number($('aiMaxDaily').value), siteDaily:Number($('aiSiteDaily').value), budgetMnt:Number($('aiBudgetMnt').value)};
    C.api('ai_settings_save', {body:body}).then(function (data) { apply(data); C.toast('AI тохиргоо хадгалагдлаа.'); })
      .catch(function (e) { error.textContent = e.message; status.textContent = ''; })
      .finally(function () { save.disabled = false; });
  });
}());
