/* 12-2 анги — нүүр хуудас: Хуваарь, Цомог, Хавтас */
(function () {
  'use strict';
  var C = window.C122;
  var boot = JSON.parse(document.getElementById('boot').textContent);
  var sch = boot.schedule;
  function ui(key, fallback, params) { if (window.C122I18n) return window.C122I18n.t(key, fallback, params); return fallback.replace(/\{(\w+)\}/g, function (_, name) { return params && params[name] != null ? params[name] : ''; }); }
  C.state.admin = !!boot.admin;
  C.state.member = !!(boot.member || boot.admin);
  C.state.setup = !!boot.setup;
  C.state.csrf = boot.csrf || null;

  /* ---------- Огноо (Улаанбаатарын цагаар) ---------- */
  var keyFmt = null;
  try { keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar', year: 'numeric', month: '2-digit', day: '2-digit' }); } catch (e) { /* хуучин хөтөч */ }
  var hmFmt = null;
  try { hmFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ulaanbaatar', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { /* */ }
  function ubHm(ts) {
    var d = new Date(ts * 1000);
    return hmFmt ? hmFmt.format(d) : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function ubDateTime(ts) { return dayKey(ts).replace(/-/g, '.') + ' ' + ubHm(ts); }
  function dayKey(ts) {
    var d = new Date(ts * 1000);
    if (keyFmt) return keyFmt.format(d);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function weekdayOf(key) {
    var p = key.split('-');
    var wd = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12)).getUTCDay();
    return C.DAYS[wd === 0 ? 7 : wd];
  }
  function dayLabel(key) {
    var nowTs = Date.now() / 1000;
    if (key === dayKey(nowTs)) return 'Өнөөдөр';
    if (key === dayKey(nowTs - 86400)) return 'Өчигдөр';
    var p = key.split('-');
    var sameYear = p[0] === dayKey(nowTs).slice(0, 4);
    return (sameYear ? '' : p[0] + ' оны ') + (+p[1]) + '-р сарын ' + (+p[2]) + ', ' + weekdayOf(key);
  }

  /* ================= Табууд ================= */
  var tab = 'schedule';
  var sectionNames = ['schedule', 'clubs', 'album', 'folders', 'textbooks', 'doodle', 'board', 'music', 'youtube', 'google', 'games', 'photobooth', 'ai-chat', 'teachermirror'];
  var pill = C.$('.tab-pill');

  function movePill() {
    var on = C.$('.tabs .tab.on');
    if (!on || !pill) return;
    var first = !pill.style.width;
    if (first) pill.style.transition = 'none';   // анх ачаалахад хөдөлгөөнгүй байрлуулна
    pill.style.width = on.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    if (first) { void pill.offsetWidth; pill.style.transition = ''; }
    var strip = on.parentElement;
    if (strip.scrollWidth > strip.clientWidth) strip.scrollLeft = Math.max(0, on.offsetLeft - (strip.clientWidth - on.offsetWidth) / 2);
  }

  function showTab(name, opts) {
    opts = opts || {};
    var requestedGame = ['flashcards','ludo','chooser'].indexOf(name) >= 0 ? name : null;
    if (requestedGame) name = 'games';
    if (sectionNames.indexOf(name) < 0) name = 'schedule';
    var changed = name !== tab;
    if (changed && tab === 'doodle' && C.Doodle && C.Doodle.hide) C.Doodle.hide();
    if (changed && tab === 'board' && C.Board && C.Board.hide) C.Board.hide();
    if (changed && tab === 'textbooks' && C.Textbooks && C.Textbooks.onHide) C.Textbooks.onHide();
    if (changed && tab === 'clubs' && C.Clubs && C.Clubs.hide) C.Clubs.hide();
    if (changed && tab === 'music' && C.Music && C.Music.hide) C.Music.hide();
    if (changed && tab === 'youtube' && C.YouTube && C.YouTube.hide) C.YouTube.hide();
    if (changed && tab === 'google' && C.Google && C.Google.hide) C.Google.hide();
    if (changed && tab === 'games' && C.Games) C.Games.hide();
    if (changed && tab === 'ai-chat' && C.AIChat && C.AIChat.hide) C.AIChat.hide();
    if (changed && tab === 'photobooth' && C.Photobooth && C.Photobooth.hide) C.Photobooth.hide();
    if (changed && tab === 'teachermirror' && C.TeacherMirror && C.TeacherMirror.hide) C.TeacherMirror.hide();
    tab = name;
    document.body.setAttribute('data-tab', name);
    C.$$('[data-tab]:not(body)').forEach(function (b) {
      var on = b.getAttribute('data-tab') === name;
      b.classList.toggle('on', on);
      if (b.getAttribute('role') === 'tab') {
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      }
    });
    sectionNames.forEach(function (v) {
      var el = C.$('#view-' + v);
      var show = v === name;
      if (show && el.hidden) {
        el.hidden = false;
        el.classList.remove('enter');
        void el.offsetWidth;
        el.classList.add('enter');
      } else if (!show) el.hidden = true;
    });
    movePill();
    var mobileTabs = C.$('.bottom-tabs'), selectedMobile = mobileTabs && mobileTabs.querySelector('.on');
    if (selectedMobile && mobileTabs.scrollWidth > mobileTabs.clientWidth) mobileTabs.scrollLeft = Math.max(0, selectedMobile.offsetLeft - (mobileTabs.clientWidth - selectedMobile.offsetWidth) / 2);
    if (name === 'album') showAlbum();
    else if (name === 'clubs' && C.Clubs) C.Clubs.show();
    else if (name === 'folders' && C.Folders) C.Folders.show();
    else if (name === 'textbooks' && C.Textbooks) C.Textbooks.show();
    else if (name === 'doodle' && C.Doodle) C.Doodle.show();
    else if (name === 'board' && C.Board) C.Board.show();
    else if (name === 'music' && C.Music) C.Music.show();
    else if (name === 'youtube' && C.YouTube) C.YouTube.show();
    else if (name === 'google' && C.Google) C.Google.show();
    else if (name === 'games' && C.Games) C.Games.show(requestedGame);
    else if (name === 'photobooth' && C.Photobooth) C.Photobooth.show();
    else if (name === 'ai-chat' && C.AIChat) C.AIChat.show();
    else if (name === 'teachermirror' && C.TeacherMirror) C.TeacherMirror.show();
    else if (name === 'schedule') renderSchedule();
    var hash = '#' + name;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    document.dispatchEvent(new CustomEvent('c122:tab', {detail:{name:name}}));
    if (changed && !opts.keepScroll) window.scrollTo(0, 0);
  }

  // body[data-tab]-г CSS ашигладаг тул сонгогчоос хасна (эс бөгөөс хуудсан дээрх бүх товшилт цуцлагдана)
  C.$$('[data-tab]:not(body)').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      showTab(b.getAttribute('data-tab'));
    });
  });
  // Табуудын хооронд сум товчоор шилжих
  C.$('.tabs').addEventListener('keydown', function (e) {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key) < 0) return;
    e.preventDefault();
    var tabs = sectionNames;
    showTab(tabs[(tabs.indexOf(tab) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : tabs.length - 1)) % tabs.length]);
    C.$('.tabs .tab.on').focus();
  });
  window.addEventListener('hashchange', function () {
    var h = location.hash.replace('#', '');
    showTab(h === 'photos' ? 'album' : h, { keepScroll: true });
  });

  /* ================= Хуваарь ================= */
  var viewSeg = C.$('#viewSeg');
  var schedView = C.$('#schedView');
  var wide = window.matchMedia('(min-width: 900px)');
  var now = C.ubNow();
  var view = wide.matches ? 'week' : (now.day <= 5 ? now.day : 1);
  var grade = (/^(\d{1,2})/.exec(sch.className || '') || [])[1];
  function renderSubtitle() { C.$('#schedSub').textContent = grade ? ui('schedule.subtitle', '{className} анги болон {grade}-р ангийн нийтлэг хичээлүүд', {className:sch.className,grade:grade}) : ui('schedule.subtitleGeneral','{className} анги болон түвшний нийтлэг хичээлүүд',{className:sch.className}); }
  renderSubtitle();

  function slotCount(day) {
    var slots = {};
    sch.lessons.forEach(function (l) { if (!day || l.day === day) slots[l.day + ':' + l.period] = 1; });
    return Object.keys(slots).length;
  }

  function renderHeader() {
    now = C.ubNow();
    var key = dayKey(Date.now() / 1000).split('-');
    var mongolian = !window.C122I18n || window.C122I18n.language() === 'mn';
    var dateText = '';
    if (mongolian) dateText = Number(key[1]) + '-р сарын ' + Number(key[2]);
    else try { dateText = new Intl.DateTimeFormat(window.C122I18n.locale(), {timeZone:'Asia/Ulaanbaatar',month:'long',day:'numeric'}).format(new Date()); } catch (_) { dateText = key[1] + '.' + key[2]; }
    setText('#todayDay', C.DAYS[now.day] || '');
    setText('#todayNum', String(Number(key[2])));
    setText('#dateLine', dateText);
    setText('#factWeek', sch.lessons.length ? ui('schedule.factPeriods','{count} цаг',{count:slotCount()}) : ui('schedule.noSchedule','Хуваарь оруулаагүй'));
    var t = slotCount(now.day);
    setText('#factToday', t ? ui('schedule.factPeriods','{count} цаг',{count:t}) : ui('schedule.factFree','Хичээлгүй'));
  }
  function setText(selector, text) { var el = C.$(selector); if (el && el.textContent !== text) el.textContent = text; }

  function renderSeg() {
    var days = C.daysOf(sch);
    var html = '<button role="tab" data-v="week" class="' + (view === 'week' ? 'on' : '') + '">' + C.icon('grid', 'i-sm') + '7 хоног</button>';
    days.forEach(function (d) {
      html += '<button role="tab" data-v="' + d + '" class="' + (view === d ? 'on ' : '') + (d === now.day ? 'today-tab' : '') + '">' + C.DAYS[d] + '</button>';
    });
    viewSeg.innerHTML = html;
    C.$$('button', viewSeg).forEach(function (b) {
      b.onclick = function () {
        var v = b.getAttribute('data-v');
        view = v === 'week' ? 'week' : +v;
        renderSchedule();
      };
    });
    var on = viewSeg.querySelector('.on');
    if (on && viewSeg.scrollWidth > viewSeg.clientWidth) viewSeg.scrollLeft = Math.max(0, on.offsetLeft - 8);
  }

  function renderSchedule() {
    now = C.ubNow();
    renderSeg();
    if (!sch.lessons.length) {
      schedView.innerHTML = '<div class="day-empty">' + C.icon('calendar') + 'Хуваарь хараахан оруулаагүй байна.' +
        (C.state.admin ? '<div style="margin-top:14px"><a class="btn btn-primary" href="admin.php#schedule">' + C.icon('upload') + 'Хуваарь оруулах</a></div>' : '') + '</div>';
      return;
    }
    var opts = { today: now.day, nowMin: now.min };
    if (view === 'week') C.renderWeek(schedView, sch, opts);
    else C.renderDay(schedView, sch, view, opts);
    var upd = C.$('#schedUpdated');
    if (sch.updatedAt) {
      var d = new Date(sch.updatedAt);
      if (!isNaN(d)) upd.textContent = ui('schedule.updated','Шинэчилсэн: {date}',{date:C.fmtDate(d.getTime()/1000)});
    }
  }

  function untilText(w) {
    var h = Math.floor(w / 60), mm = w % 60;
    if (!h) return ui('schedule.minutesUntil','{count} минутын дараа',{count:mm});
    return mm ? ui('schedule.hoursUntil','{hours} цаг {minutes} минутын дараа',{hours:h,minutes:mm}) : ui('schedule.wholeHoursUntil','{hours} цагийн дараа',{hours:h});
  }
  function blockTitle(b) {
    var subs = [];
    b.lessons.forEach(function (l) { if (subs.indexOf(l.subject) < 0) subs.push(l.subject); });
    return subs.join(' / ');
  }
  function blockWho(b) {
    if (b.lessons.length === 1) return [b.lessons[0].teacher, b.lessons[0].room ? ui('schedule.room','{room} тоот',{room:b.lessons[0].room}) : ''].filter(Boolean).join(' · ');
    return ui('schedule.groupCount','{count} бүлэг',{count:b.lessons.length}) + ' · ' + b.lessons.map(function (l) { return l.teacher; }).filter(Boolean).slice(0, 3).join(', ') + (b.lessons.length > 3 ? '…' : '');
  }
  function ring(pct, big, small) {
    return '<div class="ring"><svg viewBox="0 0 48 48" aria-hidden="true"><circle class="trk" cx="24" cy="24" r="20"/>' +
      '<circle class="val" cx="24" cy="24" r="20" pathLength="100" stroke-dasharray="100" stroke-dashoffset="' + (100 - Math.max(0, Math.min(100, pct))).toFixed(1) + '"/></svg>' +
      '<div><b>' + big + '</b><small>' + small + '</small></div></div>';
  }

  /* Одоогийн / дараагийн хичээл */
  function renderNow() {
    renderHeader();
    C.$('#clock').textContent = now.hm;
    var main = C.$('#nowMain'), list = C.$('#nextList'), label = C.$('#nowLabel');
    var day = now.day;
    var blocks = C.dayBlocks(sch, day);
    var cur = null, next = [];
    blocks.forEach(function (b) {
      var s = C.toMin(b.start), e = C.toMin(b.end);
      if (now.min >= s && now.min < e) cur = b;
      else if (s > now.min) next.push(b);
    });
    label.textContent = ui('schedule.todayDay','Өнөөдөр · {day}',{day:C.DAYS[day]});

    if (!sch.lessons.length) {
      main.className = 'now-main idle';
      main.innerHTML = '<div class="now-text"><span class="tag"><span class="pulse"></span>Хуваарь</span><h3>Хуваарь оруулаагүй байна</h3><div class="meta">Удирдлага хэсгээс хуваариа оруулна уу.</div></div>';
      list.innerHTML = '';
      return;
    }

    if (cur) {
      var s = C.toMin(cur.start), e = C.toMin(cur.end);
      var left = e - now.min;
      var pct = ((now.min - s + now.sec / 60) / (e - s)) * 100;
      main.className = 'now-main';
      main.innerHTML = ring(pct, left, ui('schedule.minuteShort','мин')) +
        '<div class="now-text"><span class="tag"><span class="pulse"></span>Одоо орж байна</span><h3 data-i18n-skip>' + C.esc(blockTitle(cur)) + '</h3>' +
        '<div class="meta" data-i18n-skip>' + C.esc(blockWho(cur)) + '</div>' +
        '<div class="meta">' + cur.start + '–' + cur.end + ' · ' + C.esc(ui('schedule.remaining','{count} минут үлдсэн',{count:left})) + '</div></div>';
    } else if (next.length) {
      var n0 = next[0];
      var wait = C.toMin(n0.start) - now.min;
      var first = n0 === blocks[0];
      main.className = 'now-main idle';
      main.innerHTML = '<div class="now-ico">' + C.icon(first ? 'sparkle' : 'coffee', 'i-lg') + '</div>' +
        '<div class="now-text"><span class="tag"><span class="pulse"></span>' + (first ? 'Өнөөдрийн эхний хичээл' : 'Завсарлага') + '</span>' +
        '<h3 data-i18n-skip>' + C.esc(blockTitle(n0)) + '</h3><div class="meta">' + C.esc(ui('schedule.startsAt','{time}-д эхэлнэ',{time:n0.start})) + ' · ' + C.esc(untilText(wait)) + '</div></div>';
      next = next.slice(1);
    } else {
      // Өнөөдөр хичээлгүй эсвэл дууссан → дараагийн хичээлтэй өдрийг олно
      var nd = 0;
      for (var k = 1; k <= 7; k++) {
        var dd = ((day - 1 + k) % 7) + 1;
        if (C.dayBlocks(sch, dd).length) { nd = dd; break; }
      }
      var nb = nd ? C.dayBlocks(sch, nd)[0] : null;
      main.className = 'now-main idle';
      main.innerHTML = '<div class="now-ico">' + C.icon(blocks.length ? 'check' : 'sparkle', 'i-lg') + '</div>' +
        '<div class="now-text"><span class="tag"><span class="pulse"></span>' + (blocks.length ? 'Өнөөдрийн хичээл дууслаа' : (day > 5 ? 'Амралтын өдөр' : 'Өнөөдөр хичээлгүй')) + '</span>' +
        (nb ? '<h3 data-i18n-skip>' + C.DAYS[nd] + ': ' + C.esc(blockTitle(nb)) + '</h3><div class="meta">' + C.esc(ui('schedule.startsAt','{time}-д эхэлнэ',{time:nb.start})) + '</div>' : '<h3>Амжилт хүсье!</h3>') + '</div>';
      next = nd ? C.dayBlocks(sch, nd).slice(1, 4) : [];
      if (nd) label.textContent = ui('schedule.nextDay','Дараагийн хичээл · {day}',{day:C.DAYS[nd]});
    }
    list.innerHTML = next.slice(0, 3).map(function (b) {
      return '<div class="next-item"><span class="t">' + b.start + '–' + b.end + '</span><span class="s" data-i18n-skip>' + C.esc(blockTitle(b)) + '<small>' + C.esc(blockWho(b)) + '</small></span></div>';
    }).join('');
  }

  setInterval(renderNow, 15000);
  setInterval(function () { if (tab === 'schedule') renderSchedule(); }, 60000);
  if (wide.addEventListener) wide.addEventListener('change', function () {
    view = wide.matches ? 'week' : (now.day <= 5 ? now.day : 1);
    renderSchedule();
  });

  /* ================= Цомог ================= */
  var gal = C.$('#gallery');
  var items = [];
  var byName = new Map();     // нэр -> item (мянган файлтай үед хайлт хурдан байх)
  var tileEls = new Map();    // нэр -> дэлгэц дээрх элемент
  var total = 0;
  var filter = 'all';
  var loading = false;
  var loadedOnce = false;
  var PAGE = 60;
  var groups = [];
  var colCount = 0;
  var selecting = false;
  var picked = {};
  var pin = null;

  /* Түгжээтэй бол кодын самбар, нээлттэй бол цомог */
  function showAlbum() {
    var member = C.state.member;
    C.$('#albumLock').hidden = member;
    var body = C.$('#albumBody');
    if (!member) {
      body.hidden = true;
      // Гарын сумаар таб сольж байвал фокусыг табаас булаахгүй (цифрүүд фокусгүйгээр ч бичигдэнэ)
      var inTabs = document.activeElement && document.activeElement.closest && document.activeElement.closest('.tabs');
      if (!pin) pin = C.pinPad(C.$('#albumPin'), { autofocus: !inTabs, onSuccess: unlocked });
      else pin.reset();
      return;
    }
    if (pin) { pin.destroy(); pin = null; }
    if (body.hidden) {
      body.hidden = false;
      body.classList.remove('enter');
      void body.offsetWidth;
      body.classList.add('enter');
    }
    if (!loadedOnce) {
      loadedOnce = true;
      layout(true);
      load(true);
    } else if (colsFor(gal.clientWidth) !== colCount) layout(true);
    syncAdminUi();
  }

  function unlocked() {
    C.toast('Цомог нээгдлээ');
    showAlbum();
  }

  function lockAlbum() {
    C.api('album_lock', { body: {} }).then(function (s) {
      C.applyStatus(s);
      resetGallery();
      if (C.state.member) C.toast('Админаар нэвтэрсэн тул цомог нээлттэй хэвээр байна');
      else C.toast('Цомог түгжигдлээ');
      showAlbum();
    }).catch(function (e) { C.toast(e.message, 'error'); });
  }
  C.$('#albumLockBtn').onclick = lockAlbum;

  function resetGallery() {
    reqSeq++;
    loading = false;
    loadedOnce = false;
    items = [];
    byName.clear();
    tileEls.clear();
    total = 0;
    gal.innerHTML = '';
    groups = [];
    var empty = C.$('#galEmpty');
    if (empty) empty.remove();
    closeLightbox();
  }

  function colsFor(w) { return w >= 1100 ? 4 : w >= 720 ? 3 : 2; }

  function layout(reset) {
    var n = colsFor(gal.clientWidth || window.innerWidth);
    if (reset || n !== colCount) {
      colCount = n;
      gal.innerHTML = '';
      groups = [];
      tileEls.clear();
      items.forEach(function (it) { place(it, false); });
    }
    renderEmpty();
  }

  function groupFor(key) {
    for (var i = 0; i < groups.length; i++) if (groups[i].key === key) return groups[i];
    var el = C.el('<section class="day-group"><header class="day-head"><h3></h3><span class="cnt"></span></header><div class="masonry"></div></section>');
    el.querySelector('h3').textContent = dayLabel(key);
    var m = el.querySelector('.masonry');
    var g = { key: key, el: el, cols: [], colH: [], img: 0, vid: 0, cnt: el.querySelector('.cnt') };
    for (var c = 0; c < colCount; c++) {
      var col = document.createElement('div');
      col.className = 'col';
      m.appendChild(col);
      g.cols.push(col);
      g.colH.push(0);
    }
    // Шинээс хуучин руу эрэмбэлсэн байрлалд оруулна
    var at = -1;
    for (i = 0; i < groups.length; i++) if (groups[i].key < key) { at = i; break; }
    if (at < 0) { gal.appendChild(el); groups.push(g); }
    else { gal.insertBefore(el, groups[at].el); groups.splice(at, 0, g); }
    return g;
  }

  function ratio(it) {
    if (it.w && it.h) return Math.max(0.4, Math.min(2.2, it.h / it.w));
    return it.type === 'video' ? 0.5625 : 1;
  }

  // Жижиг зураг үүсгэж болох эсэх (HEIC-ийг Chrome задалж чадахгүй, маш том зургийг татахгүй)
  // Хуучин зургийн жижиг хувилбарыг сервер (GD) үүсгэнэ. Хөтөч дээр зөвхөн видео,
  // Safari-д HEIC-ийг (сервер уншиж чадахгүй) админ үүсгэнэ.
  var isSafari = /^((?!chrome|chromium|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  function canHeal(it) {
    if (it.thumb || !C.state.admin) return false;   // бусдын файлд жижиг зураг тавих эрх зөвхөн админд
    if (it.type === 'video') return true;
    return isSafari && (it.ext === 'heic' || it.ext === 'heif') && it.size < 40 * 1024 * 1024;
  }
  function serverThumbUrl(it) { return 'api.php?action=thumb&name=' + encodeURIComponent(it.name); }

  function tileHtml(it) {
    var style = 'aspect-ratio:' + (1 / ratio(it)).toFixed(4);
    var media;
    if (it.thumb) media = '<img src="' + C.esc(it.thumb) + '" alt="" loading="lazy" decoding="async" style="' + style + '">';
    // Хуучин зураг: сервер жижиг хувилбарыг нь үүсгэж өгнө (чадахгүй бол эх файл руу чиглүүлнэ)
    else if (it.raw && it.type === 'image') media = '<img src="' + C.esc(serverThumbUrl(it)) + '" alt="" loading="lazy" decoding="async" style="' + style + '">';
    else if (it.raw) media = '<div class="ph" style="' + style + '">' + C.icon('video') + '</div>';
    // Жижиг зураг бэлэн болтол эх файлыг (олон МБ) татахгүй, хөнгөн орлуулагч харуулна
    else media = '<div class="ph shimmer" style="' + style + '">' + C.icon(it.type === 'video' ? 'video' : 'images') + '</div>';
    var html = '<figure class="tile" data-name="' + C.esc(it.name) + '" tabindex="0" role="button" aria-label="' + C.esc(it.original) + '">' + media;
    if (it.type === 'video') {
      html += '<div class="play"><span>' + C.icon('play') + '</span></div><span class="vbadge">' + C.icon('video') + (it.duration ? C.fmtDuration(it.duration) : 'Видео') + '</span>';
    }
    else if (isShot(it)) html += '<span class="vbadge">' + C.icon('screen') + C.esc(ui('album.screenshotTag', 'Screenshot')) + '</span>';
    html += '<figcaption>' + ubHm(it.time) + ' · ' + C.fmtBytes(it.size) + '</figcaption>';
    return html + '<span class="sel">' + C.icon('check', 'i-sm') + '</span></figure>';
  }

  function buildTile(it) {
    if (!it.thumb && !it.raw && !it.fresh && !canHeal(it) && !C.thumbs.has(it.name)) it.raw = true;
    var el = C.el(tileHtml(it));
    var img = el.querySelector('img');
    if (img) img.onerror = function () {
      var ph = C.el('<div class="ph">' + C.icon(it.type === 'video' ? 'video' : 'images') + '<span></span></div>');
      ph.querySelector('span').textContent = it.original;
      img.replaceWith(ph);
    };
    if (picked[it.name]) el.classList.add('picked');
    el.addEventListener('click', function () { onTile(it, el); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTile(it, el); } });
    tileEls.set(it.name, el);
    // Хуучин, жижиг зураггүй файлд хөтөч дээр нэг нэгээр нь үүсгэж өгнө (шинэ байршуулалтыг байршуулагч өөрөө хийнэ)
    if (!it.thumb && !it.raw && !it.fresh && canHeal(it)) {
      C.thumbs.add({
        name: it.name, kind: it.type, url: it.url,
        onDone: function (fresh) { refreshItem(fresh); },
        onFail: function () { it.raw = true; redrawTile(it); },
      });
    }
    return el;
  }

  /* Нэг хавтангийн дүрсийг шинэчилнэ (бүх цомгийг дахин зурахгүй) */
  function redrawTile(it) {
    var old = tileEls.get(it.name);
    if (!old || !old.parentNode) return;
    var el = buildTile(it);
    old.replaceWith(el);
  }

  function refreshItem(fresh) {
    var it = byName.get(fresh.name);
    if (!it) return;
    Object.assign(it, fresh);
    it.raw = !!fresh.raw;
    it.fresh = false;
    redrawTile(it);
  }

  function place(it, prepend) {
    var g = groupFor(dayKey(it.time));
    var el = buildTile(it);
    var k = 0;
    for (var i = 1; i < g.colH.length; i++) if (g.colH[i] < g.colH[k] - 0.01) k = i;
    if (prepend) g.cols[k].insertBefore(el, g.cols[k].firstChild);
    else g.cols[k].appendChild(el);
    g.colH[k] += ratio(it) + 0.08;
    if (it.type === 'video') g.vid++; else g.img++;
    g.cnt.textContent = [g.img ? g.img + ' зураг' : '', g.vid ? g.vid + ' видео' : ''].filter(Boolean).join(' · ');
  }

  function renderEmpty() {
    var empty = C.$('#galEmpty');
    if (empty && empty.getAttribute('data-filter') !== filter) { empty.remove(); empty = null; }   // шүүлтүүр солигдоход хуучин бичвэр үлдэхгүй
    if (!items.length && !loading && loadedOnce) {
      if (!empty) {
        var shotsOnly = filter === 'screenshot';
        empty = C.el('<div class="gal-empty glass" id="galEmpty" data-filter="' + C.esc(filter) + '"><div class="art">' + C.icon(shotsOnly ? 'screen' : 'images') + '</div>' +
          '<h3>' + (shotsOnly ? C.esc(ui('album.noScreenshots', 'Screenshot алга')) : filter === 'video' ? 'Видео алга' : filter === 'image' ? 'Зураг алга' : 'Одоогоор зураг алга') + '</h3>' +
          (shotsOnly ? '<p>' + C.esc(ui('album.screenshotHint', 'Дэлгэц хуваалцаж байх үед ⋮ цэснээс SCREENSHOT авч цомогт хадгална.')) + '</p></div>'
            : '<p>Ангийнхаа анхны дурсамжийг нэмээрэй.</p><button class="btn btn-primary" data-add-media>' + C.icon('plus') + 'Зураг нэмэх</button></div>'));
        gal.parentNode.insertBefore(empty, gal.nextSibling);
        var addBtn = empty.querySelector('[data-add-media]');
        if (addBtn) addBtn.onclick = addMedia;
      }
    } else if (empty) empty.remove();
  }

  function updateStats(d) {
    if (!d.counts) return;
    C.$$('[data-c]').forEach(function (b) { b.textContent = d.counts[b.getAttribute('data-c')] || 0; });
    C.$('#albumStats').textContent = d.counts.all
      ? d.counts.image + ' зураг · ' + d.counts.video + ' видео'
      : 'Дурсамжит зураг, бичлэгүүд';
    C.$('#galStats').textContent = d.counts.all ? 'Нийт ' + C.fmtBytes(d.bytes) : '';
  }

  var reqSeq = 0;
  function load(reset) {
    // Шүүлтүүр солиход (reset) өмнөх хүсэлтийг хүлээхгүй — хамгийн сүүлийнх нь ялна
    if (loading && !reset) return Promise.resolve();
    var my = ++reqSeq;
    loading = true;
    var more = C.$('#loadMore');
    more.disabled = true;
    if (reset && !items.length) gal.innerHTML = '<div class="gal-loading"><span class="spinner dark"></span>Ачаалж байна…</div>';
    return C.api('media', { query: { offset: reset ? 0 : items.length, limit: PAGE, type: filter } })
      .then(function (d) {
        if (my !== reqSeq) return;
        if (reset) { items = []; byName.clear(); }
        total = d.total;
        var fresh = d.items.filter(function (x) { return !byName.has(x.name); });
        fresh.forEach(function (x) { byName.set(x.name, x); });
        items = items.concat(fresh);
        loading = false;
        if (reset) layout(true);
        else fresh.forEach(function (it) { place(it, false); });
        updateStats(d);
        more.hidden = items.length >= total;
        more.disabled = false;
        renderEmpty();
      })
      .catch(function (e) {
        if (my !== reqSeq) return;
        loading = false;
        more.disabled = false;
        var spin = C.$('.gal-loading', gal);
        if (spin) spin.remove();
        if (e.data && e.data.locked) { resetGallery(); showAlbum(); return; }
        C.toast('Зураг ачаалж чадсангүй: ' + e.message, 'error');
      });
  }

  C.$('#loadMore').onclick = function () { load(false); };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && tab === 'album' && !C.$('#loadMore').hidden && !loading) load(false);
    }, { rootMargin: '600px' }).observe(C.$('#loadMore'));
  }

  // «Дэлгэц хуваалцах» хэсгээс авсан screenshot: эх нэр нь «screenshot-» гэж эхэлсэн зураг (сервертэй ижил дүрэм)
  function isShot(it) { return !!it && it.type === 'image' && /^screenshot-/i.test(String(it.original || '')); }
  function matchesFilter(it) { return filter === 'all' || filter === it.type || (filter === 'screenshot' && isShot(it)); }
  function setFilter(f, force) {
    var btn = C.$('#galFilter [data-f="' + f + '"]');
    if (!btn) return;
    C.$$('#galFilter button').forEach(function (x) { x.classList.toggle('on', x === btn); });
    var changed = f !== filter;
    filter = f;
    if (loadedOnce && (changed || force)) load(true);
  }
  C.$$('#galFilter button').forEach(function (b) {
    b.onclick = function () { setFilter(b.getAttribute('data-f'), true); };
  });
  // Бусад хэсгээс цомгийг тодорхой шүүлтүүрээр нээнэ (жишээ нь screenshot авсны дараа «Үзэх»)
  C.openAlbum = function (f) {
    if (f) setFilter(f);
    showTab('album');
  };

  var rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      movePill();
      if (tab === 'album' && loadedOnce && colsFor(gal.clientWidth) !== colCount) layout(true);
    }, 150);
  });

  /* ---------- Сонгох / устгах (зөвхөн админ) ---------- */
  function syncAdminUi() {
    C.$$('.admin-only').forEach(function (el) {
      if (el.id === 'selDelete') el.hidden = !C.state.admin || !selecting;
      else el.hidden = !C.state.admin;
    });
    if (!C.state.admin && selecting) setSelecting(false);
  }
  function setSelecting(on) {
    selecting = on;
    picked = {};
    gal.classList.toggle('selecting', on);
    C.$$('.tile.picked', gal).forEach(function (t) { t.classList.remove('picked'); });
    C.$('#selToggle span').textContent = on ? 'Болих' : 'Сонгох';
    updateSel();
  }
  function updateSel() {
    var n = Object.keys(picked).length;
    var del = C.$('#selDelete');
    del.hidden = !selecting || !C.state.admin;
    del.disabled = !n;
    del.querySelector('span').textContent = n ? 'Устгах (' + n + ')' : 'Устгах';
  }
  C.$('#selToggle').onclick = function () { setSelecting(!selecting); };
  C.$('#selDelete').onclick = function () {
    var names = Object.keys(picked);
    if (!names.length) return;
    deleteMedia(names).then(function (ok) { if (ok) setSelecting(false); });
  };

  function deleteMedia(names, label) {
    return C.confirm({
      title: names.length === 1 ? 'Энэ файлыг устгах уу?' : names.length + ' файлыг устгах уу?',
      text: (label ? '«' + label + '». ' : '') + 'Устгасан файлыг сэргээх боломжгүй.',
      ok: 'Устгах',
      danger: true,
    }).then(function (yes) {
      if (!yes) return false;
      return C.api('media_delete', { body: { names: names } }).then(function (r) {
        var gone = {};
        r.deleted.forEach(function (n) { gone[n] = 1; byName.delete(n); });
        items = items.filter(function (x) { return !gone[x.name]; });
        total -= r.deleted.length;
        layout(true);
        refreshCounts();
        C.toast(r.deleted.length + ' файл устгагдлаа');
        return true;
      }).catch(function (e) { C.toast(e.message, 'error'); return false; });
    });
  }

  function refreshCounts() {
    C.api('media', { query: { offset: 0, limit: 1, type: 'all' } }).then(updateStats).catch(function () {});
  }

  function onTile(it, el) {
    if (selecting) {
      if (picked[it.name]) delete picked[it.name];
      else picked[it.name] = 1;
      el.classList.toggle('picked', !!picked[it.name]);
      updateSel();
      return;
    }
    openLightbox(items.indexOf(it));
  }

  /* ---------- Lightbox ---------- */
  var lb = null, lbIndex = 0, lbItem = null;
  function syncLbIndex() {
    // Шинэ файл нэмэгдэх, устах үед индекс шилжих тул харуулж буй файлаар нь дахин олно
    var i = lbItem ? items.indexOf(lbItem) : -1;
    if (i < 0 && lbItem) items.forEach(function (x, k) { if (x.name === lbItem.name) i = k; });
    if (i >= 0) lbIndex = i;
  }
  function lbCaption() {
    if (!lb || !lbItem) return;
    lb.querySelector('.lb-title small').textContent = ubDateTime(lbItem.time) + ' · ' + C.fmtBytes(lbItem.size) + ' · ' + (lbIndex + 1) + '/' + total;
  }
  function openLightbox(i) {
    if (i < 0) return;
    lbIndex = i;
    if (!lb) {
      lb = C.el('<div class="lb" role="dialog" aria-modal="true" aria-label="Зураг үзэх">' +
        '<div class="lb-top"><div class="lb-title"><b></b><small></small></div>' +
        '<a class="btn btn-ghost btn-sm" data-dl download>' + C.icon('download', 'i-sm') + '<span class="lbl">Татах</span></a>' +
        '<button class="btn btn-danger-ghost btn-sm" data-del hidden>' + C.icon('trash', 'i-sm') + '<span class="lbl">Устгах</span></button>' +
        '<button class="btn btn-ghost btn-icon btn-sm" data-x aria-label="Хаах">' + C.icon('x') + '</button></div>' +
        '<div class="lb-stage"><div class="lb-media"></div>' +
        '<button class="lb-nav prev" aria-label="Өмнөх">' + C.icon('left') + '</button><button class="lb-nav next" aria-label="Дараах">' + C.icon('right') + '</button></div></div>');
      lb.querySelector('[data-x]').onclick = closeLightbox;
      lb.querySelector('.prev').onclick = function () { step(-1); };
      lb.querySelector('.next').onclick = function () { step(1); };
      lb.querySelector('[data-del]').onclick = function () {
        var it = lbItem;
        if (!it || !C.state.admin) return;
        syncLbIndex();
        deleteMedia([it.name], it.original).then(function (ok) {
          if (!ok) return;
          if (!items.length) return closeLightbox();
          lbIndex = Math.min(lbIndex, items.length - 1);
          showLb();
        });
      };
      var stage = lb.querySelector('.lb-stage');
      var sx = null, sy = null;
      stage.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
      stage.addEventListener('touchend', function (e) {
        if (sx == null) return;
        var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1);
        sx = null;
      });
      stage.addEventListener('click', function (e) { if (e.target === stage || e.target.classList.contains('lb-media')) closeLightbox(); });
    }
    document.body.appendChild(lb);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', lbKey);
    showLb();
    lb.querySelector('[data-x]').focus({ preventScroll: true });
  }
  function closeLightbox() {
    if (!lb || !lb.parentNode) return;
    var v = lb.querySelector('video');
    if (v) v.pause();
    lb.querySelector('.lb-media').innerHTML = '';
    lb.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', lbKey);
    if (lbItem) {
      var t = C.$('.tile[data-name="' + (window.CSS && CSS.escape ? CSS.escape(lbItem.name) : lbItem.name) + '"]', gal);
      if (t) t.focus({ preventScroll: true });
    }
  }
  function lbKey(e) {
    if (document.querySelector('.modal-back')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  }
  function step(d) {
    syncLbIndex();
    var n = lbIndex + d;
    if (n < 0) return;
    if (n >= items.length) {
      if (items.length < total) load(false).then(function () { if (n < items.length) { lbIndex = n; showLb(); } });
      return;
    }
    lbIndex = n;
    showLb();
  }
  function showLb() {
    var it = items[lbIndex];
    if (!it) return;
    lbItem = it;
    lb.querySelector('.lb-title b').textContent = it.original;
    lbCaption();
    var dl = lb.querySelector('[data-dl]');
    dl.href = it.url;
    dl.setAttribute('download', it.original);
    lb.querySelector('[data-del]').hidden = !C.state.admin;
    lb.querySelector('.prev').hidden = lbIndex === 0;
    lb.querySelector('.next').hidden = lbIndex >= total - 1;
    var box = lb.querySelector('.lb-media');
    var old = box.querySelector('video');
    if (old) old.pause();
    box.innerHTML = '';
    var fallback = function () {
      box.innerHTML = '<div class="lb-fallback">' + C.icon(it.type === 'video' ? 'video' : 'images') +
        '<div>Энэ файлыг хөтөч дээр шууд харуулах боломжгүй байна.<br>Татаж аваад үзнэ үү.</div>' +
        '<a class="btn btn-primary" href="' + C.esc(it.url) + '" download>' + C.icon('download') + 'Татах</a></div>';
    };
    if (it.type === 'video') {
      var v = document.createElement('video');
      v.controls = true;
      v.playsInline = true;
      v.autoplay = true;
      v.preload = 'metadata';
      if (it.thumb) v.poster = it.thumb;
      v.onerror = fallback;
      v.src = it.url;
      box.appendChild(v);
    } else {
      var img = new Image();
      img.alt = it.original;
      img.decoding = 'async';
      if (it.thumb) {
        // Эхлээд жижиг зургийг харуулж, эх зураг ачаалагдмагц солино
        img.src = it.thumb;
        var full = new Image();
        full.onload = function () { if (lbItem === it) img.src = it.url; };
        full.onerror = function () { if (lbItem === it && it.ext === 'heic') fallback(); };
        full.src = it.url;
      } else {
        img.onerror = fallback;
        img.src = it.url;
      }
      box.appendChild(img);
    }
    // Дараагийн зургийг урьдчилан ачаална
    var nx = items[lbIndex + 1];
    if (nx && nx.type === 'image') { var pre = new Image(); pre.src = nx.thumb || nx.url; }
  }

  /* ---------- Зураг нэмэх (цомгийн код мэдэх хүн бүр) ---------- */
  var uploader = null;
  // Шинэ байршуулсан файлыг (байршуулагч эсвэл дэлгэцийн screenshot) нээлттэй цомогт шууд нэмнэ
  function onUploaded(item, updated) {
    if (byName.has(item.name)) { refreshItem(item); return; }
    // Шинэчлэл эсвэл өмнө нь байсан файл: ачаалагдаагүй бол цомогт шинээр нэмэхгүй
    if (updated) return;
    clearTimeout(onUploaded._t);
    onUploaded._t = setTimeout(refreshCounts, 2500);
    if (!loadedOnce || !matchesFilter(item)) return;
    if (!item.thumb) item.fresh = true;   // жижиг зургийг байршуулагч файлаас нь үүсгэнэ
    byName.set(item.name, item);
    items.unshift(item);
    total++;
    if (items.length === 1) layout(true);
    else place(item, true);
    if (lb && lb.parentNode) { syncLbIndex(); lbCaption(); }
    renderEmpty();
  }
  document.addEventListener('c122:media-item', function (e) { if (e.detail && e.detail.item) onUploaded(e.detail.item, e.detail.updated); });
  function getUploader() {
    if (!uploader) {
      uploader = new C.Uploader({ onItem: onUploaded });
    }
    uploader.serverMax = C.state.chunkMax || uploader.serverMax;
    return uploader;
  }

  function addMedia() {
    if (!C.state.member) {
      showTab('album');
      C.toast('Эхлээд цомгийн кодоо оруулна уу');
      return;
    }
    if (tab !== 'album') showTab('album');
    // Файл сонгох цонхыг товч дарсан даруйд нээх ёстой (хөтөч хориглохоос сэргийлнэ)
    C.pickFiles(function (files) { getUploader().add(files); });
  }
  C.$$('[data-add-media]').forEach(function (b) { b.onclick = addMedia; });

  // Файлыг хуудас руу чирж оруулах
  var dragDepth = 0, hint = null;
  function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; }
  function clearHint() { dragDepth = 0; if (hint) { hint.remove(); hint = null; } }
  window.addEventListener('dragenter', function (e) {
    if (!hasFiles(e)) return;
    if (tab === 'folders' || tab === 'doodle' || tab === 'textbooks' || tab === 'clubs' || tab === 'photobooth') return;
    dragDepth++;
    if (!hint) {
      hint = C.el('<div class="drop-hint"><div>' + C.icon('upload', 'i-lg') + 'Зураг, видеогоо энд тавина уу</div></div>');
      document.body.appendChild(hint);
    }
  });
  window.addEventListener('dragleave', function () { if (--dragDepth <= 0) clearHint(); });
  window.addEventListener('dragover', function (e) { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    clearHint();
    var files = e.dataTransfer.files;
    if (tab === 'doodle' || tab === 'textbooks' || tab === 'clubs' || tab === 'photobooth') return;
    if (tab === 'folders') {
      if (C.Folders) C.Folders.drop(files);
      return;
    }
    if (tab !== 'album') showTab('album');
    C.ensureMember().then(function (ok) {
      if (!ok) return;
      showAlbum();
      getUploader().add(files);
    });
  });

  document.addEventListener('c122:media-added', function () { resetGallery(); if (tab === 'album') showAlbum(); });

  // Нэвтрэлт өөрчлөгдвөл (түгжих, хугацаа дуусах, админаар нэвтрэх) дэлгэцийг тааруулна
  document.addEventListener('c122:auth', function () {
    syncAdminUi();
    if (uploader && C.state.chunkMax) uploader.serverMax = C.state.chunkMax;
    if (!C.state.member && loadedOnce) {
      resetGallery();
      if (tab === 'album') showAlbum();
    } else if (C.state.member && tab === 'album' && !C.$('#albumLock').hidden) {
      setTimeout(showAlbum, 400);   // «Дахин оролдох» цонхоор код оруулсан бол цомгийг нээнэ
    }
  });

  document.addEventListener('c122:language', function () { renderSubtitle(); renderNow(); if (tab === 'schedule') renderSchedule(); });

  /* ---------- Эхлэл ---------- */
  renderNow();
  var h0 = location.hash.replace('#', '');
  showTab(h0 === 'photos' ? 'album' : h0, { keepScroll: true });
  syncAdminUi();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
  C.refreshStatus().then(function () {
    syncAdminUi();
    if (tab === 'album' && C.state.member && !loadedOnce) showAlbum();
  }).catch(function () {});
})();
