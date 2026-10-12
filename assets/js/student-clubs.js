/* Choose your name, then see your clubs for today, tomorrow or another day. */
(function () {
  'use strict';
  var C = window.C122, view = document.getElementById('view-clubs');
  if (!C || !view) return;
  var $ = function (id) { return document.getElementById(id); };
  var roster = {}, catalog = {};
  try { roster = JSON.parse($('clubStudentsData').textContent); } catch (error) {}
  try { catalog = JSON.parse($('clubsData').textContent); } catch (error) {}
  var students = Array.isArray(roster.students) ? roster.students : [];
  var days = ['', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
  var state = { initialized: false, visible: false, mode: 'personal', dayMode: 'today', date: '', studentId: '', clubs: [], choices: [], timer: null, lastSchoolDate: '', lastRenderedDate: '', lastPhase: '' };
  try { state.studentId = localStorage.getItem('c122:club-student') || ''; } catch (error) {}
  if (!students.some(function (student) { return student.id === state.studentId; })) state.studentId = '';
  function esc(value) { return C.esc(value == null ? '' : String(value)); }
  function name(student) { return student.registrationName || student.name; }
  function selected() { return students.find(function (student) { return student.id === state.studentId; }) || null; }
  function clock() { return C.ClubClock; }
  function storeName() { try { localStorage.setItem('c122:club-student', state.studentId); } catch (error) {} }
  function dateKey(parts) { return parts.year + '-' + String(parts.month).padStart(2, '0') + '-' + String(parts.day).padStart(2, '0'); }
  function dateLabel(parts) { return days[parts.weekday] + ' · ' + parts.year + '.' + String(parts.month).padStart(2, '0') + '.' + String(parts.day).padStart(2, '0'); }
  function minutes(value) { var parts = String(value || '').split(':'); return Number(parts[0]) * 60 + Number(parts[1]); }
  function duration(session) { var result = minutes(session.end) - minutes(session.start); return result > 0 ? result : result + 1440; }
  function minuteCount(ms) { var count = Math.max(0, Math.ceil(ms / 60000)); return window.C122I18n ? window.C122I18n.t('count.minutes', {count:count}) : count + ' минут'; }
  function occurrenceKey(item) { return item.clubId + '-' + item.sessionIndex + '-' + item.startMs; }
  function dayPlan(now) {
    if (!clock() || !clock().dayPlan) return null;
    return clock().dayPlan(state.clubs, state.dayMode === 'date' ? state.date : state.dayMode === 'tomorrow' ? 1 : 0, now == null ? Date.now() : now);
  }
  function ranks(clubId) {
    var result = [];
    state.choices.forEach(function (entry, index) { if (!entry.choice.tentative && entry.result.clubs.some(function (club) { return club.id === clubId; })) result.push(index + 1); });
    return result;
  }
  function renderChoices() {
    $('studentClubsChoices').innerHTML = state.choices.map(function (entry, index) {
      var tentative = !!entry.choice.tentative, resolved = entry.result.clubs.length > 0;
      var reference = tentative ? '<p class="student-clubs-reference">Боломжит тааруулалт: ' + esc(entry.result.clubs.map(function (club) { return club.name; }).join(', ')) + '. Батлагдаагүй тул өдрийн хуваарь, тоолуурт оруулаагүй.</p>' : '';
      var times = entry.result.clubs.map(function (club) {
        return '<p class="student-clubs-choice-times">' + (club.sessions || []).map(function (session) { return esc(days[Number(session.day)] + ' ' + session.start + '–' + session.end); }).join(' · ') + '</p>';
      }).join('');
      return '<article class="student-clubs-choice"><h4><span>' + (index + 1) + '-р сонголт</span>' + esc(entry.choice.name) + '</h4>' +
        (entry.choice.reason ? '<p class="student-clubs-choice-reason">' + esc(entry.choice.reason) + '</p>' : '') + reference +
        (resolved ? times : '<p class="student-clubs-missing">Цаг хараахан оруулаагүй. Энэ дугуйлангийн цаг эх зурагт байхгүй.</p>') + '</article>';
    }).join('');
  }
  function renderDay() {
    var plan = dayPlan();
    if (!plan) return;
    state.lastRenderedDate = plan.date.key || dateKey(plan.date);
    state.lastSchoolDate = dateKey(clock().schoolParts(Date.now()));
    state.lastPhase = '';
    $('studentClubsDate').value = state.lastRenderedDate;
    $('studentClubsDayTitle').textContent = (state.dayMode === 'today' ? (window.C122I18n ? window.C122I18n.t('Өнөөдөр') : 'Өнөөдөр') + ' · ' : state.dayMode === 'tomorrow' ? (window.C122I18n ? window.C122I18n.t('Маргааш') : 'Маргааш') + ' · ' : '') + dateLabel(plan.date);
    var list = plan.occurrences;
    $('studentClubsDaySummary').textContent = list.length ? list.length + ' дугуйлан · ' + list.reduce(function (total, item) { return total + item.durationMinutes; }, 0) + ' минут' : '';
    $('studentClubsDayEmpty').hidden = !!list.length;
    $('studentClubsDayEmptyTitle').textContent = state.dayMode === 'today' ? 'Өнөөдөр дугуйлангүй' : state.dayMode === 'tomorrow' ? 'Маргааш дугуйлангүй' : 'Энэ өдөр дугуйлангүй';
    $('studentClubsDayEmptyText').textContent = 'Таны сонгосон дугуйлангийн цаг ' + days[plan.date.weekday] + ' гарагт эх хуваарьт тэмдэглэгдээгүй. Өөр өдөр эсвэл долоо хоногийн хуваарийг хараарай.';
    $('studentClubsDayCards').innerHTML = list.map(function (item) {
      var others = list.filter(function (other) { return other.clubId !== item.clubId && item.startMs < other.endMs && other.startMs < item.endMs; });
      return '<article class="student-clubs-day-card" data-student-clubs-occurrence="' + esc(occurrenceKey(item)) + '"><div class="student-clubs-day-card-main"><span class="student-clubs-day-rank">' + esc(ranks(item.clubId).join(', ')) + '-р сонголт</span><h4>' + esc(item.club.name) + '</h4><div class="student-clubs-day-card-meta"><strong>' + esc(item.start + '–' + item.end) + '</strong><span>' + item.durationMinutes + ' минут</span><span>' + C.icon('door', 'i-sm') + esc(item.club.room || 'Танхим заагаагүй') + '</span></div>' +
        (others.length ? '<p class="student-clubs-overlap">' + C.icon('clock', 'i-sm') + esc(others.map(function (other) { return other.club.name; }).join(', ')) + ' дугуйлантай давхцана</p>' : '') + '</div><div class="student-clubs-day-card-clock"><span class="student-clubs-day-status"></span><strong class="student-clubs-day-remaining"></strong><span class="student-clubs-day-caption"></span><small class="student-clubs-day-minutes"></small></div><div class="student-clubs-day-progress" hidden><span></span></div></article>';
    }).join('');
    updateDayClock(true);
  }
  function weeklyItems() {
    var list = [];
    state.clubs.forEach(function (club) { (club.sessions || []).forEach(function (session) { list.push({ club: club, session: session, start: minutes(session.start), end: minutes(session.start) + duration(session), conflicts: [] }); }); });
    list.sort(function (a, b) { return Number(a.session.day) - Number(b.session.day) || a.start - b.start || a.club.name.localeCompare(b.club.name, 'mn'); });
    list.forEach(function (item, index) { list.slice(index + 1).forEach(function (other) {
      if (item.club.id !== other.club.id && Number(item.session.day) === Number(other.session.day) && item.start < other.end && other.start < item.end) { item.conflicts.push(other.club.name); other.conflicts.push(item.club.name); }
    }); });
    return list;
  }
  function renderWeek() {
    var items = weeklyItems(), pairs = items.reduce(function (sum, item) { return sum + item.conflicts.length; }, 0) / 2;
    var today = clock().schoolParts(Date.now()).weekday;
    $('studentClubsWeekSummary').textContent = items.length + ' удаа · ' + items.reduce(function (total, item) { return total + duration(item.session); }, 0) + ' минут';
    $('studentClubsConflictNote').hidden = !pairs;
    $('studentClubsConflictNote').querySelector('span').textContent = pairs + ' давхцал байна. Давхцсан сонголтуудыг багштайгаа тохироорой.';
    $('studentClubsAgenda').innerHTML = days.slice(1).map(function (day, index) {
      var id = index + 1, list = items.filter(function (item) { return Number(item.session.day) === id; });
      return '<div class="student-clubs-agenda-day' + (id === today ? ' is-today' : '') + '"><div class="student-clubs-agenda-day-name"><strong>' + esc(day) + '</strong>' + (id === today ? '<span>Өнөөдөр</span>' : '') + '</div><div class="student-clubs-agenda-items">' +
        (list.length ? list.map(function (item) {
          return '<article class="student-clubs-agenda-item"><div class="student-clubs-agenda-time"><strong>' + esc(item.session.start + '–' + item.session.end) + '</strong><span>' + duration(item.session) + ' минут</span></div><div class="student-clubs-agenda-info"><h5>' + esc(item.club.name) + '</h5><p>' + esc(item.club.room || 'Танхим заагаагүй') + ' · ' + esc(ranks(item.club.id).join(', ')) + '-р сонголт</p>' + (item.conflicts.length ? '<span class="student-clubs-overlap">' + C.icon('clock', 'i-sm') + esc(item.conflicts.join(', ')) + ' дугуйлантай давхцана</span>' : '') + '</div></article>';
        }).join('') : '<p class="student-clubs-agenda-empty">Сонгосон дугуйлангүй</p>') + '</div></div>';
    }).join('');
  }
  function renderStudent() {
    var student = selected();
    state.clubs = []; state.choices = []; state.lastPhase = ''; state.lastRenderedDate = '';
    $('studentClubsWelcome').hidden = !!student;
    $('studentClubsContent').hidden = !student;
    $('studentClubsAnnouncement').textContent = '';
    if (!student) return;
    $('studentClubsTitle').textContent = name(student) + ' · Миний хуваарь';
    var choices = Array.isArray(student.choices) ? student.choices : [], unique = {};
    state.choices = choices.map(function (choice) {
      var result = clock().resolveChoice(choice, catalog, student);
      if (!choice.tentative) result.clubs.forEach(function (club) { if (!unique[club.id]) { unique[club.id] = true; state.clubs.push(club); } });
      return { choice: choice, result: result };
    });
    $('studentClubsNoRegistration').hidden = !!choices.length;
    $('studentClubsDayControls').hidden = !choices.length;
    $('studentClubsChoicesDetails').hidden = !choices.length;
    $('studentClubsChoicesDetails').open = false;
    renderChoices();
    applyDay();
  }
  function updateDayClock(initial) {
    if (!clock() || !selected() || state.dayMode === 'week') return;
    var now = Date.now(), schoolDate = dateKey(clock().schoolParts(now));
    if (state.dayMode !== 'date' && schoolDate !== state.lastSchoolDate) { renderDay(); return; }
    var plan = dayPlan(now);
    if (!plan) return;
    var byKey = {};
    plan.occurrences.forEach(function (item) { byKey[occurrenceKey(item)] = item; });
    view.querySelectorAll('[data-student-clubs-occurrence]').forEach(function (element) {
      var item = byKey[element.getAttribute('data-student-clubs-occurrence')];
      if (!item) return;
      var active = item.status === 'active', completed = item.status === 'completed';
      element.classList.toggle('is-active', active); element.classList.toggle('is-completed', completed);
      element.querySelector('.student-clubs-day-status').textContent = active ? 'Явагдаж байна' : completed ? 'Дууссан' : 'Эхлэх хүртэл';
      element.querySelector('.student-clubs-day-remaining').textContent = completed ? item.end : clock().formatRemaining(item.remainingMs);
      element.querySelector('.student-clubs-day-caption').textContent = completed ? 'цагт дууссан' : active ? 'дуусах хүртэл' : item.start + ' цагт эхэлнэ';
      element.querySelector('.student-clubs-day-minutes').hidden = completed;
      element.querySelector('.student-clubs-day-minutes').textContent = completed ? '' : 'Нийт ' + minuteCount(item.remainingMs) + ' үлдлээ';
      var progress = element.querySelector('.student-clubs-day-progress');
      progress.hidden = !active;
      progress.querySelector('span').style.width = (Math.max(0, Math.min(1, item.progress || 0)) * 100) + '%';
    });
    var phase = plan.occurrences.map(function (item) { return occurrenceKey(item) + ':' + item.status; }).join('|');
    if (phase !== state.lastPhase) {
      if (!initial && state.lastPhase) $('studentClubsAnnouncement').textContent = plan.occurrences.filter(function (item) { return item.status === 'active'; }).map(function (item) { return item.club.name + ' дугуйлан явагдаж байна.'; }).join(' ') || 'Өдрийн дугуйлангийн төлөв шинэчлэгдлээ.';
      state.lastPhase = phase;
    }
  }
  function stopTimer() { if (state.timer) window.clearInterval(state.timer); state.timer = null; }
  function startTimer() {
    stopTimer();
    if (!state.visible || state.mode !== 'personal' || state.dayMode === 'week' || document.hidden || !selected() || !state.choices.length) return;
    updateDayClock(false);
    state.timer = window.setInterval(function () { updateDayClock(false); }, 1000);
  }
  function applyDay() {
    var registered = !!state.choices.length, weekly = state.dayMode === 'week';
    $('studentClubsDay').hidden = !registered || weekly;
    $('studentClubsWeek').hidden = !registered || !weekly;
    view.querySelectorAll('[data-student-clubs-day]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.getAttribute('data-student-clubs-day') === state.dayMode)); });
    if (registered) { if (weekly) renderWeek(); else renderDay(); }
    startTimer();
  }
  function applyMode(notify) {
    $('clubsPersonalPanel').hidden = state.mode !== 'personal';
    $('clubsGeneralPanel').hidden = state.mode !== 'general';
    $('studentClubsPersonalButton').setAttribute('aria-pressed', String(state.mode === 'personal'));
    $('studentClubsGeneralButton').setAttribute('aria-pressed', String(state.mode === 'general'));
    startTimer();
    if (notify) view.dispatchEvent(new CustomEvent('c122:clubs-view', { bubbles: true, detail: { mode: state.mode } }));
  }
  function chooseMode(mode) { state.mode = mode; applyMode(true); }
  function initialize() {
    if (state.initialized) return;
    state.initialized = true;
    $('studentClubsName').innerHTML = '<option value="">Нэрээ сонгоорой</option>' + students.map(function (student) { return '<option value="' + esc(student.id) + '">' + esc(name(student)) + '</option>'; }).join('');
    $('studentClubsName').value = state.studentId;
    $('studentClubsName').addEventListener('change', function () { state.studentId = this.value; state.mode = 'personal'; state.dayMode = 'today'; storeName(); renderStudent(); applyMode(true); });
    $('studentClubsPersonalButton').addEventListener('click', function () { chooseMode('personal'); });
    ['studentClubsGeneralButton', 'studentClubsWelcomeGeneral', 'studentClubsNoRegistrationGeneral'].forEach(function (id) { $(id).addEventListener('click', function () { chooseMode('general'); }); });
    view.querySelectorAll('[data-student-clubs-day]').forEach(function (button) { button.addEventListener('click', function () { state.dayMode = this.getAttribute('data-student-clubs-day'); applyDay(); }); });
    $('studentClubsDate').addEventListener('change', function () { if (!/^\d{4}-\d{2}-\d{2}$/.test(this.value)) return; state.dayMode = 'date'; state.date = this.value; applyDay(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopTimer(); else startTimer(); });
    renderStudent();
  }
  document.addEventListener('c122:language', function () { days = C.DAYS.slice(); if (state.initialized) { renderStudent(); applyMode(false); } });
  C.StudentClubs = {
    show: function () { state.visible = true; initialize(); if (state.dayMode === 'week' && selected()) renderWeek(); applyMode(false); },
    hide: function () { state.visible = false; stopTimer(); },
    mode: function () { return state.mode; },
    participants: function (clubId) {
      var result = [];
      students.forEach(function (student) { (student.choices || []).forEach(function (choice, index) {
        if (!choice.tentative && Array.isArray(choice.clubIds) && choice.clubIds.indexOf(clubId) >= 0) result.push({ name: name(student), rank: index + 1, tentative: false });
      }); });
      return result;
    }
  };
}());
