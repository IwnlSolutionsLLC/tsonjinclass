/* Weekly club times use the school's clock, regardless of the device's zone. */
(function () {
  'use strict';
  var C = window.C122;
  if (!C) return;
  var ZONE = 'Asia/Ulaanbaatar', MINUTE = 60000, DAY = 24 * 60 * MINUTE, WEEK = 7 * DAY;
  var formatter = null;
  try {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
  } catch (error) { /* Older browsers use Ulaanbaatar's UTC+08:00 school clock. */ }

  function nowValue(value) {
    var result = value == null ? Date.now() : Number(value);
    return Number.isFinite(result) ? result : Date.now();
  }
  function schoolParts(epoch) {
    var parts = {};
    if (formatter) {
      formatter.formatToParts(new Date(epoch)).forEach(function (part) {
        if (part.type !== 'literal') parts[part.type] = Number(part.value);
      });
    } else {
      var date = new Date(epoch + 8 * 60 * MINUTE);
      parts = { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(),
        hour: date.getUTCHours(), minute: date.getUTCMinutes(), second: date.getUTCSeconds() };
    }
    parts.weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay() || 7;
    return parts;
  }
  function wallTime(parts) {
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0);
  }
  function fromSchoolWall(wall) {
    var candidate = wall - 8 * 60 * MINUTE;
    if (!formatter) return candidate;
    // Resolve the zone's offset from Intl rather than from the device timezone.
    for (var step = 0; step < 3; step++) {
      var correction = wall - wallTime(schoolParts(candidate));
      candidate += correction;
      if (!correction) break;
    }
    return candidate;
  }
  function minutes(value) {
    var match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  }
  function validSessions(club) {
    return (Array.isArray(club.sessions) ? club.sessions : []).map(function (session, index) {
      var day = Number(session.day), start = minutes(session.start), end = minutes(session.end);
      if (!Number.isInteger(day) || day < 1 || day > 7 || start == null || end == null || start === end) return null;
      return { session: session, index: index, day: day, start: start, end: end,
        duration: end > start ? end - start : end + 1440 - start };
    }).filter(Boolean);
  }
  function uniqueClubs(clubs) {
    var seen = Object.create(null);
    return (Array.isArray(clubs) ? clubs : []).filter(function (club) {
      if (!club || typeof club.id !== 'string' || !club.id || seen[club.id]) return false;
      seen[club.id] = true; return true;
    });
  }
  function occurrence(club, item, wall, now) {
    var startMs = fromSchoolWall(wall), endMs = fromSchoolWall(wall + item.duration * MINUTE);
    var active = startMs <= now && now < endMs;
    return { club: club, clubId: club.id, session: item.session, sessionIndex: item.index, day: item.day,
      start: item.session.start, end: item.session.end, startMs: startMs, endMs: endMs,
      durationMinutes: item.duration, status: active ? 'active' : 'upcoming',
      remainingMs: Math.max(0, (active ? endMs : startMs) - now),
      progress: active ? Math.min(1, Math.max(0, (now - startMs) / (endMs - startMs))) : 0,
      conflicts: [] };
  }
  function order(a, b) { return a.startMs - b.startMs || a.endMs - b.endMs || a.clubId.localeCompare(b.clubId); }
  function buildClubPlan(club, now, weekWall) {
    var active = [], upcoming = [];
    validSessions(club).forEach(function (item) {
      var sessionWall = weekWall + (item.day - 1) * DAY + item.start * MINUTE, next = null;
      // The previous week covers overnight Sunday sessions still running Monday.
      for (var offset = -1; offset <= 1; offset++) {
        var itemOccurrence = occurrence(club, item, sessionWall + offset * WEEK, now);
        if (itemOccurrence.status === 'active') active.push(itemOccurrence);
        else if (itemOccurrence.startMs > now && (!next || itemOccurrence.startMs < next.startMs)) next = itemOccurrence;
      }
      if (next) upcoming.push(next);
    });
    active.sort(order); upcoming.sort(order);
    return { club: club, status: active.length ? 'active' : upcoming.length ? 'upcoming' : 'unscheduled',
      active: active, next: upcoming[0] || null, current: active[0] || null, conflicts: [],
      occurrences: active.concat(upcoming).sort(order) };
  }
  function weeklyConflicts(clubs) {
    var all = [], result = [], seen = Object.create(null);
    clubs.forEach(function (club) {
      validSessions(club).forEach(function (item) {
        all.push({ club: club, item: item, start: (item.day - 1) * 1440 + item.start,
          end: (item.day - 1) * 1440 + item.start + item.duration });
      });
    });
    for (var i = 0; i < all.length; i++) {
      for (var j = i + 1; j < all.length; j++) {
        var first = all[i], second = all[j];
        if (first.club.id === second.club.id) continue;
        [-10080, 0, 10080].forEach(function (shift) {
          var start = Math.max(first.start, second.start + shift), end = Math.min(first.end, second.end + shift);
          if (start >= end) return; // A session ending as the next begins does not overlap.
          var weekMinute = ((start % 10080) + 10080) % 10080;
          var id = first.club.id + ':' + first.item.index + '|' + second.club.id + ':' + second.item.index + '|' + weekMinute;
          if (seen[id]) return;
          seen[id] = true;
          result.push({ id: id, clubIds: [first.club.id, second.club.id], clubs: [first.club, second.club],
            sessionIndices: [first.item.index, second.item.index], day: Math.floor(weekMinute / 1440) + 1,
            start: timeString(weekMinute % 1440), end: timeString((weekMinute + end - start) % 1440),
            startMinute: weekMinute, endMinute: weekMinute + end - start, durationMinutes: end - start });
        });
      }
    }
    return result.sort(function (a, b) { return a.startMinute - b.startMinute; });
  }
  function timeString(value) {
    return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
  }
  function plan(clubs, suppliedNow) {
    var now = nowValue(suppliedNow), parts = schoolParts(now), todayWall = Date.UTC(parts.year, parts.month - 1, parts.day);
    var weekWall = todayWall - (parts.weekday - 1) * DAY, selected = uniqueClubs(clubs);
    var conflicts = weeklyConflicts(selected), byClub = Object.create(null), timeline = [];
    selected.forEach(function (club) {
      var entry = buildClubPlan(club, now, weekWall);
      entry.conflicts = conflicts.filter(function (conflict) { return conflict.clubIds.indexOf(club.id) >= 0; });
      entry.occurrences.forEach(function (item) {
        item.conflicts = entry.conflicts.filter(function (conflict) {
          var index = conflict.clubIds.indexOf(club.id);
          return conflict.sessionIndices[index] === item.sessionIndex;
        });
      });
      byClub[club.id] = entry; timeline = timeline.concat(entry.occurrences);
    });
    timeline.sort(order);
    var active = timeline.filter(function (item) { return item.status === 'active'; });
    var next = timeline.filter(function (item) { return item.status === 'upcoming'; })[0] || null;
    return { now: now, timeZone: ZONE, active: active, next: next, occurrences: timeline,
      conflicts: conflicts, byClub: byClub, today: { year: parts.year, month: parts.month, day: parts.day, weekday: parts.weekday },
      weekStart: fromSchoolWall(weekWall) };
  }
  function dayPlan(clubs, target, suppliedNow) {
    var now = nowValue(suppliedNow), today = schoolParts(now);
    var dayWall = Date.UTC(today.year, today.month - 1, today.day);
    if (Number.isInteger(target)) dayWall += target * DAY;
    else if (typeof target === 'string') {
      var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(target);
      if (match) {
        var candidate = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        var check = new Date(candidate);
        if (check.getUTCFullYear() === Number(match[1]) && check.getUTCMonth() + 1 === Number(match[2]) && check.getUTCDate() === Number(match[3])) dayWall = candidate;
      }
    }
    var date = new Date(dayWall), weekday = date.getUTCDay() || 7;
    var dayStart = fromSchoolWall(dayWall), dayEnd = fromSchoolWall(dayWall + DAY), items = [];
    uniqueClubs(clubs).forEach(function (club) {
      validSessions(club).forEach(function (item) {
        // Include a previous evening's overnight club while it occupies this day.
        [-1, 0].forEach(function (offset) {
          var sessionDay = (weekday + offset + 6) % 7 + 1;
          if (item.day !== sessionDay) return;
          var entry = occurrence(club, item, dayWall + offset * DAY + item.start * MINUTE, now);
          if (entry.endMs <= dayStart || entry.startMs >= dayEnd) return;
          if (entry.endMs <= now) { entry.status = 'completed'; entry.remainingMs = 0; entry.progress = 1; }
          items.push(entry);
        });
      });
    });
    items.sort(order);
    var conflicts = [];
    items.forEach(function (first, index) {
      items.slice(index + 1).forEach(function (second) {
        if (first.clubId === second.clubId) return;
        var startMs = Math.max(first.startMs, second.startMs, dayStart), endMs = Math.min(first.endMs, second.endMs, dayEnd);
        if (startMs >= endMs) return;
        var conflict = { clubIds: [first.clubId, second.clubId], clubs: [first.club, second.club],
          sessionIndices: [first.sessionIndex, second.sessionIndex], startMs: startMs, endMs: endMs,
          durationMinutes: (endMs - startMs) / MINUTE };
        first.conflicts.push(conflict); second.conflicts.push(conflict); conflicts.push(conflict);
      });
    });
    var key = date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + String(date.getUTCDate()).padStart(2, '0');
    return { now: now, timeZone: ZONE, date: { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1,
      day: date.getUTCDate(), weekday: weekday, key: key }, occurrences: items, conflicts: conflicts };
  }
  function resolveChoice(choice, catalog) {
    choice = choice && typeof choice === 'object' ? choice : {};
    var list = Array.isArray(catalog) ? catalog : catalog && Array.isArray(catalog.clubs) ? catalog.clubs : [];
    var ids = Array.isArray(choice.clubIds) ? choice.clubIds.filter(function (id, index, all) {
      return typeof id === 'string' && id && all.indexOf(id) === index;
    }) : [];
    var clubs = [], missingIds = [];
    ids.forEach(function (id) {
      var found = list.filter(function (club) { return club && club.id === id; })[0];
      if (found) clubs.push(found); else missingIds.push(id);
    });
    var resolved = clubs.length > 0 && missingIds.length === 0;
    return { name: String(choice.name || ''), clubs: clubs, clubIds: clubs.map(function (club) { return club.id; }),
      missingIds: missingIds, resolved: resolved, status: resolved ? 'resolved' : clubs.length ? 'partial' : 'unresolved',
      reason: typeof choice.reason === 'string' ? choice.reason : resolved ? '' : 'Эх хуваарьт тохирох цаг тодорхойгүй байна.' };
  }
  function formatRemaining(value) {
    var seconds = Math.ceil(Math.max(0, Number(value) || 0) / 1000);
    if (seconds < 60) return seconds + ' сек';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' мин ' + seconds % 60 + ' сек';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' цаг ' + Math.floor(seconds % 3600 / 60) + ' мин';
    return Math.floor(seconds / 86400) + ' өдөр ' + Math.floor(seconds % 86400 / 3600) + ' цаг';
  }
  C.ClubClock = {
    timeZone: ZONE, plan: plan, dayPlan: dayPlan, resolveChoice: resolveChoice, formatRemaining: formatRemaining,
    nextForClub: function (club, now) {
      var result = plan([club], now);
      return club && result.byClub[club.id] || null;
    },
    schoolParts: function (now) { return schoolParts(nowValue(now)); }
  };
}());
