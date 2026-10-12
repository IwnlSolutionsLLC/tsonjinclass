/* Дугуйлангийн эх зурагт байгаа цагууд; анги, гараг, багшаар харах. */
(function () {
  'use strict';
  var C = window.C122, view = document.getElementById('view-clubs');
  if (!C || !view) return;
  var $ = function (id) { return document.getElementById(id); };
  var catalog;
  try { catalog = JSON.parse($('clubsData').textContent); } catch (error) { catalog = {}; }
  var clubs = Array.isArray(catalog.clubs) ? catalog.clubs : [];
  var days = Array.isArray(catalog.days) && catalog.days.length ? catalog.days : [
    { id: 1, name: 'Даваа' }, { id: 2, name: 'Мягмар' }, { id: 3, name: 'Лхагва' }, { id: 4, name: 'Пүрэв' }, { id: 7, name: 'Ням' }
  ];
  var state = { day: 0, grade: 12, allSchool: false, search: '', today: 0, initialized: false };
  var sourceImage = typeof catalog.sourceImage === 'string' && /^assets\/img\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/.test(catalog.sourceImage) ? catalog.sourceImage : 'assets/img/clubs-schedule.jpg';
  var dayNames = ['', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
  document.addEventListener('c122:language', function () { dayNames = C.DAYS.slice(); days = days.map(function (day) { return Object.assign({}, day, {name:dayNames[day.id] || day.name}); }); if (state.initialized) render(); });
  function text(value) { return C.esc(value); }
  function normalize(value) { return String(value || '').toLocaleLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim(); }
  function sessions(club) { return Array.isArray(club.sessions) ? club.sessions : []; }
  function sourceNumber(club) { return Array.isArray(club.sourceNumbers) && club.sourceNumbers.length ? club.sourceNumbers.join('–') : club.number; }
  function unknownGrade(club) { return !Array.isArray(club.grades) || !club.grades.length; }
  function gradeLabel(club) {
    if (unknownGrade(club)) return (club.gradesLabel ? club.gradesLabel + ' · ' : '') + 'Анги тодорхойгүй';
    return club.gradesLabel || club.grades.join(', ');
  }
  function matchesGrade(club) { return state.allSchool || unknownGrade(club) || club.grades.indexOf(state.grade) >= 0; }
  function matchesSearch(club) {
    var term = normalize(state.search);
    if (!term) return true;
    var haystack = normalize([club.name, club.teacher, club.room, club.gradesLabel, club.group, (club.notes || []).join(' ')].join(' '));
    return term.split(' ').every(function (word) { return haystack.indexOf(word) >= 0; });
  }
  function daySessions(club, day) { return sessions(club).filter(function (session) { return Number(session.day) === day; }); }
  function currentSessions(club) {
    return sessions(club).filter(function (session) { return !state.day || Number(session.day) === state.day; });
  }
  function timeLabel(session) { return session.start + '–' + session.end; }
  function details(club) {
    var info = [];
    if (Number.isInteger(club.students)) info.push('Сурагч: ' + club.students);
    if (club.weeklyCount != null) info.push('Эх зурагт «7 хоногт»: ' + club.weeklyCount);
    (club.notes || []).forEach(function (note) { info.push(note); });
    var participants = C.StudentClubs ? C.StudentClubs.participants(club.id) : [];
    if (participants.length) info.push('12-2 ангийн сонголт (' + participants.length + '): ' + participants.map(function (student) { return student.name + ' · ' + student.rank + '-р сонголт'; }).join(', '));
    if (!info.length) return '';
    return '<details class="clubs-row-detail"><summary>Дэлгэрэнгүй</summary>' + info.map(function (line) { return '<p>' + text(line) + '</p>'; }).join('') + '</details>';
  }
  function refreshToday() {
    var now = new Date(), parts = {};
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ulaanbaatar', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).forEach(function (part) { parts[part.type] = part.value; });
      state.today = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[parts.weekday] || 0;
    } catch (error) {
      var ub = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      state.today = ub.getUTCDay() || 7;
      parts.year = ub.getUTCFullYear(); parts.month = String(ub.getUTCMonth() + 1).padStart(2, '0'); parts.day = String(ub.getUTCDate()).padStart(2, '0');
    }
    $('clubsToday').textContent = 'Өнөөдөр ' + dayNames[state.today] + ' · ' + parts.year + '.' + parts.month + '.' + parts.day;
  }
  function renderDays(eligible) {
    var buttons = [{ id: 0, name: 'Бүх өдөр' }].concat(days);
    $('clubsDays').innerHTML = buttons.map(function (day) {
      var id = Number(day.id), count = id ? eligible.filter(function (club) { return daySessions(club, id).length > 0; }).length : eligible.length;
      return '<button class="clubs-day' + (id === state.day ? ' on' : '') + (id === state.today ? ' today' : '') + '" type="button" data-club-day="' + id + '" aria-pressed="' + (id === state.day) + '">' + text(day.name) + '<span class="clubs-day-count" aria-hidden="true">' + count + '</span></button>';
    }).join('');
  }
  function renderTable(filtered) {
    var shownDays = state.day ? days.filter(function (day) { return Number(day.id) === state.day; }) : days;
    var table = view.querySelector('.clubs-table');
    table.classList.toggle('is-filtered', !!state.day);
    $('clubsTableHead').innerHTML = '<tr><th scope="col">Дугуйлан / секц</th><th scope="col" class="clubs-teacher-column">Багш</th><th scope="col" class="clubs-grade-column">Хамрагдах анги</th>' + shownDays.map(function (day) {
      return '<th scope="col" class="clubs-day-column' + (Number(day.id) === state.today ? ' today' : '') + '">' + text(day.name) + '</th>';
    }).join('') + '<th scope="col" class="clubs-room-column">Танхим</th></tr>';
    $('clubsTableBody').innerHTML = filtered.map(function (club) {
      return '<tr><td><span class="clubs-row-number">№ ' + text(sourceNumber(club)) + '</span><h3 class="clubs-name">' + text(club.name) + '</h3>' + details(club) + '</td><td>' + text(club.teacher || '—') + '</td><td>' + text(gradeLabel(club)) + '</td>' + shownDays.map(function (day) {
        var list = daySessions(club, Number(day.id));
        return '<td' + (Number(day.id) === state.today ? ' class="today"' : '') + '>' + (list.length ? list.map(function (session) { return '<span class="clubs-time">' + text(timeLabel(session)) + '</span>'; }).join('') : '<span class="clubs-no-session" aria-label="Цаг тэмдэглээгүй">—</span>') + '</td>';
      }).join('') + '<td>' + text(club.room || '—') + '</td></tr>';
    }).join('');
  }
  function renderCards(filtered) {
    $('clubsCards').innerHTML = filtered.map(function (club, index) {
      var list = currentSessions(club);
      return '<article class="clubs-card" style="--club-order:' + index + '"><div class="clubs-card-head"><div><span class="clubs-row-number">№ ' + text(sourceNumber(club)) + '</span><h3 class="clubs-name">' + text(club.name) + '</h3></div><span class="clubs-card-grade">' + text(gradeLabel(club)) + '</span></div><div class="clubs-card-meta"><span>' + C.icon('user') + text(club.teacher || 'Багш заагаагүй') + '</span><span>' + C.icon('door') + text(club.room || 'Танхим заагаагүй') + '</span></div>' + (list.length ? '<div class="clubs-card-sessions">' + list.map(function (session) {
        return '<div class="clubs-session' + (Number(session.day) === state.today ? ' today' : '') + '"><span>' + text(dayNames[Number(session.day)]) + '</span><strong>' + text(timeLabel(session)) + '</strong></div>';
      }).join('') + '</div>' : '<p class="clubs-no-times">Эх зурагт цаг тэмдэглээгүй.</p>') + details(club) + '</article>';
    }).join('');
  }
  function render() {
    var eligible = clubs.filter(function (club) { return matchesGrade(club) && matchesSearch(club); });
    var filtered = eligible.filter(function (club) { return !state.day || daySessions(club, state.day).length > 0; });
    renderDays(eligible); renderTable(filtered); renderCards(filtered);
    var scope = state.allSchool ? 'Бүх анги' : state.grade + '-р анги';
    $('clubsResultCount').innerHTML = '<b>' + filtered.length + '</b> дугуйлан · ' + text(scope) + (state.day ? ' · ' + text(dayNames[state.day]) : '');
    $('clubsGrade').disabled = state.allSchool;
    $('clubsAllSchool').setAttribute('aria-pressed', String(state.allSchool));
    $('clubsReset').hidden = !state.day && !state.search && !state.allSchool && state.grade === 12;
    $('clubsEmpty').hidden = filtered.length > 0;
    $('clubsTableWrap').hidden = $('clubsCards').hidden = filtered.length === 0;
    $('clubsGradeNote').hidden = state.allSchool || !filtered.some(unknownGrade);
    $('clubsEmptyText').textContent = state.search ? 'Нэр, багш эсвэл танхимыг өөрөөр хайгаарай.' : state.day ? 'Энэ ангийн ' + dayNames[state.day] + ' гарагийн цаг эх хуваарьт тэмдэглэгдээгүй байна.' : 'Энэ ангид зориулсан цаг эх хуваарьт тэмдэглэгдээгүй байна.';
    $('clubsEmptyReset').textContent = state.search ? 'Хайлтыг цэвэрлэх' : 'Бүх өдрийг харах';
  }
  function reset() {
    state.day = 0; state.grade = 12; state.allSchool = false; state.search = '';
    $('clubsSearch').value = ''; $('clubsGrade').value = '12'; render();
  }
  function sourceView() {
    var modal = C.openModal('<div class="clubs-photo-header"><h3>Дугуйлангийн эх хуваарь</h3><button class="btn btn-ghost btn-sm" type="button" data-close autofocus>' + C.icon('x', 'i-sm') + 'Хаах</button></div><a href="' + text(sourceImage) + '" target="_blank" rel="noopener"><img class="clubs-photo" src="' + text(sourceImage) + '" alt="Цонжин Кибер Боардинг сургуулийн 2026–2027 оны I улирлын дугуйлан, секцийн эх хуваарь" decoding="async"></a><p class="clubs-photo-caption">Зураг дээр дарж бүтэн хэмжээгээр нээнэ. ' + text(catalog.schoolYear || '2026–2027') + ' · ' + text(catalog.term || 'I улирал') + '</p>', { wide: true });
    modal.el.setAttribute('aria-label', 'Дугуйлангийн эх хуваарь');
  }
  function initialize() {
    if (state.initialized) return;
    state.initialized = true;
    $('clubsTerm').textContent = (catalog.schoolYear || '2026–2027') + ' · ' + (catalog.term || 'I улирал');
    $('clubsSchool').textContent = catalog.school || 'Цонжин Кибер Боардинг сургууль';
    $('clubsSourceDownload').href = sourceImage;
    var notes = Array.isArray(catalog.notes) ? catalog.notes : [];
    $('clubsSourceNotes').hidden = !notes.length;
    $('clubsSourceNotesList').innerHTML = notes.map(function (note) { return '<li>' + text(note) + '</li>'; }).join('');
    $('clubsSearch').addEventListener('input', function () { state.search = this.value; render(); });
    $('clubsGrade').addEventListener('change', function () { state.grade = Number(this.value); render(); });
    $('clubsAllSchool').addEventListener('click', function () { state.allSchool = !state.allSchool; render(); });
    $('clubsDays').addEventListener('click', function (event) {
      var button = event.target.closest('[data-club-day]');
      if (!button) return;
      state.day = Number(button.getAttribute('data-club-day')); render();
      var active = $('clubsDays').querySelector('[data-club-day="' + state.day + '"]');
      if (active) active.focus({ preventScroll: true });
    });
    $('clubsReset').addEventListener('click', reset);
    $('clubsEmptyReset').addEventListener('click', function () { state.search = ''; state.day = 0; $('clubsSearch').value = ''; render(); });
    $('clubsSourceView').addEventListener('click', sourceView);
    document.addEventListener('c122:clubs-view', function () { if (!view.hidden) { refreshToday(); render(); } });
  }
  C.Clubs = {
    show: function () { initialize(); if (C.StudentClubs) C.StudentClubs.show(); refreshToday(); render(); },
    hide: function () { if (C.StudentClubs) C.StudentClubs.hide(); }
  };
}());
