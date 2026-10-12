(function () {
  'use strict';
  var C = window.C122 = window.C122 || {};
  var root, ui = {}, students = [], folder = '', csrf = '', chats = [], current = null, usage = null;
  var initialized = false, shown = false, configured = false, busy = false, loading = false, authenticating = false, epoch = 0, pendingRequest = null;
  var drafts = Object.create(null);
  var selectionKey = 'c122-ai-student';
  function stored(key) { try { return localStorage.getItem(key) || ''; } catch (e) { return ''; } }
  function remember(key, value) { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch (e) { /* Storage is optional. */ } }
  function selectedName() { var student = students.find(function (s) { return s.id === folder; }); return student ? student.name : ''; }
  function status(message, error) { ui.status.textContent = message || ''; ui.status.classList.toggle('is-error', !!error); }
  function requestId() {
    var data = new Uint8Array(16); window.crypto.getRandomValues(data);
    return Array.prototype.map.call(data, function (n) { return n.toString(16).padStart(2, '0'); }).join('');
  }
  async function api(action, options) {
    options = options || {}; var query = options.query || {}, url = 'api.php?action=' + encodeURIComponent(action);
    Object.keys(query).forEach(function (key) { url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(query[key]); });
    var headers = {}; if (csrf) headers['X-Folder-CSRF'] = csrf;
    var init = { method: options.body ? 'POST' : 'GET', headers: headers, credentials: 'same-origin', cache: 'no-store' };
    if (options.body) { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(options.body); }
    var response;
    try { response = await fetch(url, init); } catch (e) { var network = new Error('Сүлжээний алдаа. Яриаг дахин нээж хариу хадгалагдсан эсэхийг шалгаарай.'); network.status = 0; throw network; }
    var data; try { data = await response.json(); } catch (e) { data = null; }
    if (!response.ok || !data || data.ok === false) { var error = new Error(data && data.error || 'Серверийн алдаа (' + response.status + ').'); error.status = response.status; error.data = data; throw error; }
    return data;
  }
  function displayError(error) {
    if (error.status === 401 || error.data && error.data.csrfInvalid) { csrf = ''; current = null; chats = []; usage = null; render(); }
    if (error.data && error.data.usage) usage = error.data.usage;
    status(error.message || 'Яриаг ачаалж чадсангүй.', true); controls();
  }
  function controls() {
    var unlocked = !!csrf, working = busy || loading || !!(usage && usage.busy);
    ui.student.disabled = busy || loading || authenticating;
    ui.unlock.hidden = unlocked; ui.unlock.disabled = loading || busy || authenticating; ui.lock.hidden = !unlocked; ui.lock.disabled = busy || loading;
    ui.newChat.disabled = !unlocked || working;
    ui.trash.disabled = !unlocked || working; ui.refresh.disabled = !unlocked || loading || busy;
    // Drafting does not require a server request, a PIN or a configured provider.
    ui.message.disabled = false;
    ui.longReply.disabled = false;
    ui.send.disabled = working || authenticating || !ui.message.value.trim();
    ui.composerHint.textContent = authenticating ? 'Илгээхийн тулд хавтасны 4 оронтой кодоо оруулна уу.' :
      busy || usage && usage.busy ? 'Өмнөх хариуг хүлээж байна. Дараагийн зурвасаа бичиж болно.' :
      loading ? 'Яриаг ачаалж байна. Зурвасаа бичиж болно.' :
      !folder ? 'Зурвасаа бичээд, илгээхийн өмнө нэрээ сонгоорой.' :
      !unlocked ? 'Зурвасаа бэлдэж болно. Илгээхэд хавтасны кодоороо нэвтэрнэ.' :
      !configured ? 'Илгээхийн өмнө админ Egune API тохиргоог хийнэ. Бичсэн зурвас чинь хэвээрээ үлдэнэ.' :
      'Enter · илгээх / Shift + Enter · шинэ мөр';
    ui.rename.hidden = !current; ui.deleteChat.hidden = !current;
    ui.rename.disabled = working; ui.deleteChat.disabled = working;
    ui.busy.hidden = !busy && !(usage && usage.busy);
    ui.accountStatus.textContent = unlocked ? selectedName() + ' · Хувийн яриа. Энэ нэрээр бүх төхөөрөмж дээрээ үргэлжлүүлж болно.' : 'Нэрээ сонгоод хавтасны кодоороо нэвтрээрэй. Яриа зөвхөн чамд харагдана.';
    ui.usage.textContent = usage ? 'Өнөөдөр ' + usage.remainingToday + ' хүсэлт үлдсэн · Хүсэлтгүй үед токен зарцуулахгүй' : 'Enter · илгээх / Shift + Enter · шинэ мөр';
  }
  function dateLabel(iso, timeOnly) {
    try { return new Intl.DateTimeFormat((window.C122I18n ? window.C122I18n.locale() : 'mn-MN'), timeOnly ? { timeZone: 'Asia/Ulaanbaatar', hour: '2-digit', minute: '2-digit' } : { timeZone: 'Asia/Ulaanbaatar', month: 'short', day: 'numeric' }).format(new Date(iso)); } catch (e) { return ''; }
  }
  function list() {
    ui.list.innerHTML = '';
    if (!csrf || !chats.length) { var empty = document.createElement('p'); empty.className = 'ai-chat-side-empty'; empty.textContent = csrf ? 'Шинэ яриа нээгээд асуултаа бичээрэй.' : 'Яриагаа хадгалахын тулд нэвтрээрэй.'; ui.list.appendChild(empty); return; }
    chats.forEach(function (chat) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'ai-chat-card' + (current && current.id === chat.id ? ' on' : ''); button.dataset.chatId = chat.id;
      button.innerHTML = '<strong>' + C.esc(chat.title) + '</strong><small>' + C.esc(dateLabel(chat.updated)) + ' · ' + chat.messageCount + ' зурвас</small>';
      button.setAttribute('aria-pressed', current && current.id === chat.id ? 'true' : 'false'); button.disabled = busy || loading;
      ui.list.appendChild(button);
    });
  }
  function stripThink(text) {
    text = String(text || '');
    for (var n = 0; n < 3; n++) text = text.replace(/&(?:amp;)*lt;\s*(\/?)\s*think\b[^\r\n]*?&(?:amp;)*gt;/gi, function (_, slash) { return '<' + slash + 'think>'; });
    text = text.replace(/\\([<>])/g, '$1'); var depth = 0, out = '';
    text.split(/(<\s*\/?\s*think\b[^>]*>)/gi).forEach(function (part) { if (/^<\s*\/\s*think\b[^>]*>$/i.test(part)) depth = Math.max(0, depth - 1); else if (/^<\s*think\b[^>]*>$/i.test(part)) depth++; else if (!depth) out += part; });
    return out.trim();
  }
  function markdown(text) {
    // Escape first; no model-controlled HTML, image embeds, scripts or unsafe URL schemes.
    return text.split(/(```[\s\S]*?```)/g).map(function (part) {
      if (part.slice(0, 3) === '```') { var code = part.slice(3, -3).replace(/^[\w.+-]*\n/, ''); return '<pre><code>' + C.esc(code) + '</code></pre>'; }
      return C.esc(part).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    }).join('');
  }
  function messageNode(message, isPending) {
    var assistant = message.role === 'assistant', text = assistant ? stripThink(message.content) : message.content;
    var article = document.createElement('article'); article.className = 'ai-chat-message ' + (assistant ? 'is-assistant' : 'is-user') + (isPending ? ' is-pending' : '');
    var label = document.createElement('div'); label.className = 'ai-chat-message-label';
    var author = document.createElement('span'); author.textContent = assistant ? 'IwnlX AI' : selectedName(); label.appendChild(author);
    if (assistant) { var copy = document.createElement('button'); copy.type = 'button'; copy.className = 'ai-chat-copy'; copy.textContent = 'Хуулах'; copy.setAttribute('aria-label', 'AI хариултыг хуулах'); copy.addEventListener('click', async function () { try { await navigator.clipboard.writeText(text); copy.textContent = 'Хуулсан'; setTimeout(function () { copy.textContent = 'Хуулах'; }, 1800); } catch (e) { status('Хуулж чадсангүй. Хариултын текстээ сонгоод хуулж болно.', true); } }); label.appendChild(copy); }
    else { var time = document.createElement('span'); time.textContent = dateLabel(message.time, true); label.appendChild(time); }
    var content = document.createElement('div'); content.className = 'ai-chat-message-content';
    if (assistant) content.innerHTML = markdown(text); else content.textContent = text;
    article.appendChild(label); article.appendChild(content); return article;
  }
  function welcome() {
    ui.messages.innerHTML = '<div class="ai-chat-welcome"><div class="ai-welcome-symbol" aria-hidden="true">ix</div><h3>' + C.esc(csrf ? 'Сайн уу, ' + selectedName() + '.' : 'Сайн уу. Юу ярилцах вэ?') + '</h3><p>Хичээлийн бодлого, шинэ санаа, эсвэл зүгээр л өнөөдрийн тухай.</p><div class="ai-chat-prompts"><button type="button" data-ai-prompt="Надад математикийн ойлголтыг энгийн жишээгээр тайлбарлаач.">Хичээлээ ойлгох <span>↗</span></button><button type="button" data-ai-prompt="Өнөөдрийн хичээл, амралтаа тэнцвэржүүлэх төлөвлөгөө гаргахад туслаач.">Өдрөө төлөвлөх <span>↗</span></button><button type="button" data-ai-prompt="Let\'s practise conversational English. Ask me a simple question and help me improve my answer.">English practice <span>↗</span></button></div></div>';
  }
  function messages(scroll) {
    ui.title.textContent = current ? current.title : 'Чиний дараагийн санаа эндээс.';
    if (!current || !current.messages.length) welcome();
    else { ui.messages.innerHTML = ''; current.messages.forEach(function (message) { ui.messages.appendChild(messageNode(message)); }); }
    if (busy && pendingRequest) ui.messages.appendChild(messageNode({ role: 'user', content: pendingRequest.message, time: new Date().toISOString() }, true));
    if (scroll) ui.messages.scrollTop = ui.messages.scrollHeight;
  }
  function render(scroll) { list(); messages(scroll); controls(); }
  function upsert(chat) {
    chats = chats.filter(function (existing) { return existing.id !== chat.id; });
    if (!chat.deleted) chats.unshift({ id: chat.id, title: chat.title, version: chat.version, updated: chat.updated, created: chat.created, deleted: chat.deleted, messageCount: chat.messages.length });
  }
  async function openChat(id) {
    if (!csrf || busy || loading) return;
    var ticket = epoch; loading = true; controls(); status('Яриаг нээж байна…');
    try { var data = await api('ai_chat', { query: { folder: folder, id: id } }); if (ticket !== epoch) return; current = data.chat; usage = data.usage; csrf = data.csrf; remember('c122-ai-chat-' + folder, id); status(''); render(true); }
    catch (e) { if (ticket === epoch) displayError(e); }
    finally { if (ticket === epoch) { loading = false; controls(); list(); } }
  }
  async function session(restore) {
    if (!folder) return;
    var ticket = epoch; loading = true; controls();
    try {
      var data = await api('ai_session', { query: { folder: folder } }); if (ticket !== epoch) return;
      csrf = data.csrf; chats = data.chats; usage = data.usage; status(configured ? '' : 'AI тохиргоо хараахан хийгдээгүй байна. Админ Egune түлхүүрээ оруулна уу.'); render();
      var target = current && chats.some(function (chat) { return chat.id === current.id; }) ? current.id : restore ? stored('c122-ai-chat-' + folder) : '';
      if (!target || !chats.some(function (chat) { return chat.id === target; })) target = chats[0] && chats[0].id;
      if (target) { loading = false; await openChat(target); }
    } catch (e) { if (ticket === epoch) { csrf = ''; current = null; chats = []; usage = null; render(); if (e.status !== 401) displayError(e); } }
    finally { if (ticket === epoch) { loading = false; controls(); list(); } }
  }
  async function choose() {
    if (busy) return;
    var previousFolder = folder, previousDraft = ui.message.value;
    if (previousDraft || !drafts[previousFolder || 'anonymous']) drafts[previousFolder || 'anonymous'] = { message: previousDraft, longReply: ui.longReply.checked };
    epoch++; folder = ui.student.value; csrf = ''; current = null; chats = []; usage = null; pendingRequest = null; loading = false;
    if (previousFolder !== folder) {
      var student = students.find(function (s) { return s.id === folder; });
      var savedDraft = drafts[folder || 'anonymous'];
      if (!previousFolder && folder && previousDraft) drafts[folder] = savedDraft = { message: previousDraft, longReply: ui.longReply.checked };
      ui.message.value = savedDraft && (student && student.unlocked || !folder || !previousFolder) ? savedDraft.message : '';
      if (savedDraft && ui.message.value) ui.longReply.checked = savedDraft.longReply;
      adjustInput(false);
    }
    remember(selectionKey, folder); status(configured ? '' : 'AI тохиргоо хараахан хийгдээгүй байна. Админ Egune түлхүүрээ оруулна уу.'); render();
    if (folder) await session(true);
  }
  function unlock() {
    if (!folder) { status('Эхлээд нэрээ сонгоорой.', true); ui.student.focus(); return; }
    if (authenticating) return Promise.resolve(false);
    authenticating = true; controls();
    return new Promise(function (resolve) {
      var success = false, unlockFolder = folder;
      var modal = C.openModal('<form class="ai-chat-pin-form"><h3>' + C.esc(selectedName()) + ' · AI CHAT</h3><p class="lead">Хавтасны 4 оронтой нууц кодоо оруулна уу.</p><label class="ai-sr-only" for="aiChatPin">Нууц код</label><input class="input" id="aiChatPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" autofocus required><div class="ai-chat-pin-error" role="alert"></div><div class="actions"><button class="btn btn-ghost" type="button" data-close>Цуцлах</button><button class="btn btn-primary" type="submit">Нээх</button></div></form>', { onClose: function () { if (!success) { authenticating = false; controls(); resolve(false); } } });
      var form = modal.el.querySelector('form'); form.addEventListener('submit', async function (event) {
        event.preventDefault(); var submit = form.querySelector('[type=submit]'), pin = form.querySelector('input'), error = form.querySelector('.ai-chat-pin-error'); submit.disabled = true; error.textContent = '';
        try {
          var data = await api('folder_unlock', { body: { folder: unlockFolder, pin: pin.value } }); success = true; modal.close();
          if (folder !== unlockFolder) { authenticating = false; controls(); resolve(false); return; }
          csrf = data.csrf;
          if (!ui.message.value && drafts[folder]) { ui.message.value = drafts[folder].message; ui.longReply.checked = drafts[folder].longReply; adjustInput(); }
          await session(true); authenticating = false; controls(); resolve(true); ui.message.focus();
        }
        catch (e) { error.textContent = e.message; pin.value = ''; pin.focus(); }
        finally { submit.disabled = false; }
      });
    });
  }
  async function createChat() {
    if (!csrf) { await unlock(); if (!csrf) return; }
    if (busy || loading || usage && usage.busy) return;
    loading = true; controls(); list();
    try {
      var data = await api('ai_chat_create', { body: { folder: folder } }); current = data.chat; usage = data.usage; csrf = data.csrf; upsert(current); remember('c122-ai-chat-' + folder, current.id); pendingRequest = null; status(''); render(true); return current;
    } finally { loading = false; controls(); list(); ui.message.focus(); }
  }
  function adjustInput(save) { if (save !== false) drafts[folder || 'anonymous'] = { message: ui.message.value, longReply: ui.longReply.checked }; ui.count.textContent = Array.from(ui.message.value).length + ' / 4000'; ui.message.style.height = 'auto'; ui.message.style.height = Math.min(180, Math.max(56, ui.message.scrollHeight)) + 'px'; controls(); }
  async function send(event) {
    event.preventDefault(); if (busy || loading || authenticating || usage && usage.busy || !ui.message.value.trim()) return;
    if (!folder) { status('Илгээхийн өмнө нэрээ сонгоорой. Бичсэн зурвас чинь хэвээрээ үлдэнэ.', true); ui.student.focus(); return; }
    if (!configured) { status('AI тохиргоо хараахан хийгдээгүй байна. Админ Egune түлхүүрээ оруулна уу. Бичсэн зурвас чинь хэвээрээ үлдэнэ.', true); return; }
    if (!csrf) { await unlock(); if (!csrf || busy || loading || usage && usage.busy) return; }
    var message = ui.message.value.trim(), longReply = ui.longReply.checked;
    if (!message) return;
    if (Array.from(message).length > 4000) { status('Асуултаа 4000 тэмдэгтээс бага бичээрэй.', true); return; }
    busy = true; controls(); status('');
    try {
      if (!current) { var created = await api('ai_chat_create', { body: { folder: folder } }); current = created.chat; csrf = created.csrf; usage = created.usage; upsert(current); remember('c122-ai-chat-' + folder, current.id); }
      if (!pendingRequest || pendingRequest.message !== message || pendingRequest.chat !== current.id || pendingRequest.longReply !== longReply) pendingRequest = { id: requestId(), message: message, chat: current.id, longReply: longReply };
      ui.message.value = ''; adjustInput();
      render(true);
      var data = await api('ai_send', { body: { folder: folder, id: current.id, version: current.version, message: message, longReply: longReply, requestId: pendingRequest.id } });
      current = data.chat; csrf = data.csrf; usage = data.usage; upsert(current); pendingRequest = null;
      status(''); adjustInput();
    } catch (e) {
      if (!ui.message.value) { ui.message.value = message; adjustInput(); }
      if (e.status !== 0 && !(e.data && e.data.pending)) pendingRequest = null;
      if (e.data && e.data.conflict) status(e.message + ' “Яриануудыг шинэчлэх” товчийг дараарай.', true); else displayError(e);
    } finally { busy = false; render(true); if (shown && !ui.message.disabled) ui.message.focus(); }
  }
  function rename() {
    if (!current || busy) return;
    var modal = C.openModal('<form class="ai-chat-edit-form"><h3>Ярианы нэр</h3><label class="ai-sr-only" for="aiChatNewTitle">Нэр</label><input class="input" id="aiChatNewTitle" maxlength="80" value="' + C.esc(current.title) + '" autofocus required><p class="ai-chat-pin-error" role="alert"></p><div class="actions"><button class="btn btn-ghost" type="button" data-close>Цуцлах</button><button class="btn btn-primary" type="submit">Хадгалах</button></div></form>');
    modal.el.querySelector('form').addEventListener('submit', async function (event) {
      event.preventDefault(); var button = modal.el.querySelector('[type=submit]'); button.disabled = true;
      try { var data = await api('ai_chat_update', { body: { folder: folder, id: current.id, version: current.version, title: modal.el.querySelector('input').value } }); current = data.chat; usage = data.usage; upsert(current); modal.close(); status('Ярианы нэр хадгалагдлаа.'); render(); }
      catch (e) { modal.el.querySelector('.ai-chat-pin-error').textContent = e.message; }
      finally { button.disabled = false; }
    });
  }
  async function deleteChat() {
    if (!current || busy) return;
    var confirmed = await C.confirm({ title: 'Энэ яриаг устгах уу?', text: 'Яриа “Устгасан” хэсэгт орно. Дараа нь сэргээж болно.', danger: true, ok: 'Устгах' });
    if (!confirmed) return;
    try { var data = await api('ai_chat_delete', { body: { folder: folder, id: current.id, version: current.version } }); upsert(data.chat); current = null; pendingRequest = null; remember('c122-ai-chat-' + folder, ''); usage = data.usage; status('Яриа устгасан хэсэгт орлоо.'); render(); if (chats.length) await openChat(chats[0].id); }
    catch (e) { displayError(e); }
  }
  async function trash() {
    if (!csrf || busy) return;
    try {
      var data = await api('ai_trash', { query: { folder: folder } });
      var modal = C.openModal('<h3>Устгасан ярианууд</h3><p class="lead">Хүссэн яриагаа сэргээж үргэлжлүүлээрэй.</p><div class="ai-chat-trash-list"></div><p class="ai-chat-pin-error" role="alert"></p><div class="actions"><button class="btn btn-ghost" data-close>Хаах</button></div>');
      var box = modal.el.querySelector('.ai-chat-trash-list');
      if (!data.chats.length) box.innerHTML = '<p class="lead">Устгасан яриа байхгүй байна.</p>';
      data.chats.forEach(function (chat) {
        var row = document.createElement('div'); row.className = 'ai-chat-trash-row'; row.innerHTML = '<div><strong>' + C.esc(chat.title) + '</strong><small>' + chat.messageCount + ' зурвас · ' + C.esc(dateLabel(chat.updated)) + '</small></div><button class="btn btn-primary btn-sm" type="button">Сэргээх</button>'; box.appendChild(row);
        row.querySelector('button').addEventListener('click', async function (event) { var button = event.currentTarget; button.disabled = true; try { var restored = await api('ai_chat_restore', { body: { folder: folder, id: chat.id, version: chat.version } }); upsert(restored.chat); current = restored.chat; usage = restored.usage; remember('c122-ai-chat-' + folder, current.id); row.remove(); render(true); status('Яриа сэргээгдлээ.'); if (!box.children.length) box.innerHTML = '<p class="lead">Бүх яриа сэргээгдлээ.</p>'; } catch (e) { modal.el.querySelector('.ai-chat-pin-error').textContent = e.message; button.disabled = false; } });
      });
    } catch (e) { displayError(e); }
  }
  async function lock() {
    if (!csrf || busy) return;
    try { await api('folder_lock', { body: { folder: folder } }); epoch++; csrf = ''; current = null; chats = []; usage = null; pendingRequest = null; delete drafts[folder]; delete drafts.anonymous; ui.message.value = ''; adjustInput(); render(); status('Хувийн яриа түгжигдлээ.'); }
    catch (e) { displayError(e); }
  }
  async function start() {
    status('AI CHAT-ыг нээж байна…');
    try { var data = await api('ai_status'); students = data.students; configured = data.configured; ui.student.innerHTML = '<option value="">Нэрээ сонгоорой</option>'; students.forEach(function (student) { var option = document.createElement('option'); option.value = student.id; option.textContent = student.name; ui.student.appendChild(option); }); var saved = stored(selectionKey); if (students.some(function (student) { return student.id === saved; })) ui.student.value = saved; await choose(); }
    catch (e) { displayError(e); }
  }
  function init() {
    root = document.querySelector('#view-ai-chat'); if (!root) return false;
    var ids = { student: 'aiChatStudent', unlock: 'aiChatUnlock', lock: 'aiChatLock', accountStatus: 'aiChatAccountStatus', status: 'aiChatStatus', newChat: 'aiChatNew', list: 'aiChatList', trash: 'aiChatTrash', refresh: 'aiChatRefresh', title: 'aiChatTitle', rename: 'aiChatRename', deleteChat: 'aiChatDelete', messages: 'aiChatMessages', busy: 'aiChatBusy', form: 'aiChatForm', message: 'aiChatMessage', composerHint: 'aiChatComposerHint', count: 'aiChatCharCount', longReply: 'aiChatLongReply', send: 'aiChatSend', usage: 'aiChatUsage' };
    Object.keys(ids).forEach(function (key) { ui[key] = document.getElementById(ids[key]); });
    ui.student.addEventListener('change', choose); ui.unlock.addEventListener('click', unlock); ui.lock.addEventListener('click', lock);
    ui.newChat.addEventListener('click', function () { createChat().catch(displayError); }); ui.refresh.addEventListener('click', function () { session(true); }); ui.trash.addEventListener('click', trash);
    ui.rename.addEventListener('click', rename); ui.deleteChat.addEventListener('click', deleteChat); ui.form.addEventListener('submit', send);
    ui.message.addEventListener('input', adjustInput); ui.longReply.addEventListener('change', adjustInput); ui.message.addEventListener('keydown', function (event) { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); if (!ui.send.disabled) ui.form.requestSubmit(); } });
    ui.list.addEventListener('click', function (event) { var button = event.target.closest('[data-chat-id]'); if (button) openChat(button.dataset.chatId); });
    ui.messages.addEventListener('click', function (event) { var button = event.target.closest('[data-ai-prompt]'); if (!button) return; ui.message.value = button.dataset.aiPrompt; adjustInput(); ui.message.focus(); });
    initialized = true; return true;
  }
  C.AIChat = {
    show: function () { shown = true; if (!initialized) { if (init()) start(); } else if (!busy) start(); },
    hide: function () { shown = false; /* An already-sent request finishes and saves even when this tab is hidden. */ }
  };
})();
