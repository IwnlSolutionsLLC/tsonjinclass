(function () {
  'use strict';
  var boot = JSON.parse(document.getElementById('officeBoot').textContent), status = document.getElementById('officeSaveStatus'), editor, lastSave = null;
  function error(message) { document.getElementById('officeError').hidden = false; status.textContent = message || 'Office сервертэй холбогдож чадсангүй.'; }
  document.getElementById('officeRetry').onclick = function () { location.reload(); };
  var script = document.createElement('script'); script.src = boot.apiUrl; script.referrerPolicy = 'no-referrer';
  script.onerror = function () { error(); };
  script.onload = function () {
    if (!window.DocsAPI) return error();
    boot.config.events = {
      onAppReady: function () { status.textContent = 'Бэлэн · өөрчлөлтөө Office-ийн Хадгалах товчоор хадгална уу'; },
      onDocumentStateChange: function (event) { status.textContent = event.data ? 'Өөрчлөлт хийгдэж байна…' : 'Office хадгалалтыг шалгаж байна…'; },
      onError: function () { status.textContent = 'Office алдаа гарлаа. Файлаа хаахаасаа өмнө татаж нөөцлөнө үү.'; }
    };
    try { editor = new DocsAPI.DocEditor('officeDocument', boot.config); } catch (e) { error(); }
  };
  document.head.appendChild(script);
  async function poll() {
    try {
      var res = await fetch(boot.statusUrl, { credentials: 'same-origin', cache: 'no-store' }), data = await res.json();
      if (!res.ok || !data.ok) { status.textContent = 'Засварлах холбоосын хугацаа дууслаа. Файлаа татаж нөөцлөнө үү.'; return; }
      if (data.lastSave && data.lastSave !== lastSave) {
        lastSave = data.lastSave; status.textContent = 'Сайтад хадгалагдсан · ' + new Date(lastSave).toLocaleTimeString();
        if (window.opener && !window.opener.closed) window.opener.postMessage({ type: 'c122:office-saved', folder: boot.folder, file: boot.file }, location.origin);
      }
      if (data.status === 3 || data.status === 7) status.textContent = 'Сайтад хадгалахад алдаа гарлаа. Office-оос файлаа татаж нөөцлөнө үү.';
    } catch (e) { status.textContent = 'Хадгалалтыг шалгаж чадсангүй. Холболтоо шалгана уу.'; }
  }
  var timer = setInterval(poll, 7000);
  window.addEventListener('pagehide', function () { clearInterval(timer); if (editor) editor.destroyEditor(); });
})();
