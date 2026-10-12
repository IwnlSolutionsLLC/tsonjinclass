(function () {
  'use strict';
  var C = window.C122, windows = [];
  function status() { return fetch('api.php?action=office_status', { credentials: 'same-origin', cache: 'no-store' }).then(function (res) { if (!res.ok) throw new Error('Office тохиргоог шалгаж чадсангүй.'); return res.json(); }); }
  async function open(file) {
    var context = C.Folders.context();
    if (!context.folder || context.readOnly) throw new Error('Хавтасны нууц үгээр нэвтэрнэ үү.');
    var popup = window.open('about:blank', '_blank');
    if (popup) { popup.document.title = 'Office'; popup.document.body.textContent = 'Office засварлагчийг ачаалж байна…'; }
    try {
      var data = await C.Folders.request('office_open', { body: { folder: context.folder, file: file.id }, timeout: 240000 });
      var current = C.Folders.context();
      if (current.folder !== context.folder || current.parent !== context.parent) throw new Error('Хавтас өөрчлөгдсөн байна. Файлаа дахин нээнэ үү.');
      if (popup && !popup.closed) { windows.push(popup); popup.location.replace(data.editorUrl); }
      else {
        var m = C.openModal('<h3>Office засварлагч бэлэн</h3><p class="lead">Доорх товчоор засварлагчийг шинэ цонхонд нээнэ үү.</p><div class="actions"><button class="btn btn-ghost" data-close>Хаах</button><a class="btn btn-primary" id="officeLaunch" target="_blank">Засварлагч нээх</a></div>');
        m.el.querySelector('#officeLaunch').href = data.editorUrl;
        m.el.querySelector('#officeLaunch').onclick = function (event) { event.preventDefault(); var win = window.open(data.editorUrl, '_blank'); if (win) { windows.push(win); m.close(); } };
      }
      if (data.converted) { C.toast('Office-д засах шинэ хуулбар үүслээ. Эх файл хэвээр хадгалагдана.'); await C.Folders.refresh(); }
      return data;
    } catch (e) { if (popup && !popup.closed) popup.close(); throw e; }
  }
  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin || windows.indexOf(event.source) < 0 || !event.data || event.data.type !== 'c122:office-saved') return;
    if (C.Folders.context().folder === event.data.folder) C.Folders.refresh().catch(function () {});
    windows = windows.filter(function (win) { return !win.closed; });
  });
  C.OfficeEditor = { status: status, open: open };
})();
