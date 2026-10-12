/*
 * Хурдан, үргэлжлүүлж болох байршуулагч.
 *  • Жижиг файл (≤ 32 МБ) — нэг хүсэлтээр.
 *  • Том файл — хэсгүүдэд хувааж, нэг файлын 4 хэсгийг зэрэг илгээнэ (сервер мужаар нь тэмдэглэнэ).
 *  • Нийтдээ 5 хүсэлт зэрэг явна; Cloudflare-ийн 100 МБ хязгаараас хэсэг бүр бага.
 *  • Мянга мянган файлтай үед ч гацахгүйн тулд самбарыг хураангуйлж, секундэд ~3 удаа л шинэчилнэ.
 *  • Жижиг зургийг (thumbnail) нэг нэгээр нь, боломжтой бол хөтчийн ар талын thread дээр үүсгэнэ.
 */
(function () {
  'use strict';
  var C = window.C122;
  var MB = 1024 * 1024;
  var MAX_REQ = 5;           // бүх файлд нийт зэрэг илгээх хүсэлт
  var MAX_FILES = 8;         // зэрэг боловсруулах файл
  var STREAMS = 4;           // нэг том файлын зэрэг хэсэг
  var MIN_CHUNK = 256 * 1024;
  var SMALL_MAX = 32 * MB;   // үүнээс бага файлыг нэг хүсэлтээр
  var COMPACT_AT = 40;       // үүнээс олон файл бол жагсаалтыг хураана
  var MAX_ROWS = 40;         // хураасан үед харуулах мөрийн дээд тоо
  var EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif', 'bmp', 'mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', '3gp', 'mts', 'm2ts', 'mpg', 'mpeg', 'wmv'];
  var VIDEO = ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', '3gp', 'mts', 'm2ts', 'mpg', 'mpeg', 'wmv'];
  var ACTIVE = { queued: 1, init: 1, uploading: 1, finishing: 1, retrying: 1, paused: 1 };
  var seq = 0;

  function extOf(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function backoff(n) { return Math.min(30000, 1000 * Math.pow(2, Math.max(0, n - 1))); }
  function fatal(e) { return e.status === 401 || e.status === 403 || e.status === 404 || e.status === 415 || e.status === 507; }

  C.MEDIA_ACCEPT = 'image/*,video/*,' + EXT.map(function (e) { return '.' + e; }).join(',');
  C.isMediaFile = function (f) { return EXT.indexOf(extOf(f.name)) >= 0; };

  /* ================= Жижиг зураг (thumbnail) ================= */
  function drawThumb(src, w, h) {
    if (!w || !h) return Promise.resolve(null);
    var s = Math.min(1, 720 / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s));
    c.height = Math.max(1, Math.round(h * s));
    try { c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); } catch (e) { return Promise.resolve(null); }
    return new Promise(function (res) {
      try {
        c.toBlob(function (b) {
          if (b && b.type === 'image/webp') return res({ blob: b, w: w, h: h });
          c.toBlob(function (b2) { res(b2 ? { blob: b2, w: w, h: h } : null); }, 'image/jpeg', 0.82);
        }, 'image/webp', 0.8);
      } catch (e) { res(null); }
    });
  }

  /* src: File/Blob эсвэл URL (цомогт байгаа, жижиг зураггүй файлд) */
  function thumbViaElement(src, kind) {
    return new Promise(function (resolve) {
      var done = false;
      var isUrl = typeof src === 'string';
      var url = isUrl ? src : URL.createObjectURL(src);
      var finish = function (v) {
        if (done) return;
        done = true;
        Promise.resolve(v).then(function (r) { if (!isUrl) URL.revokeObjectURL(url); resolve(r); });
      };
      setTimeout(function () { finish(null); }, 30000);
      if (kind === 'image') {
        var img = new Image();
        img.decoding = 'async';
        img.onload = function () { finish(drawThumb(img, img.naturalWidth, img.naturalHeight)); };
        img.onerror = function () { finish(null); };
        img.src = url;
      } else {
        var v = document.createElement('video');
        v.muted = true;
        v.playsInline = true;
        v.preload = 'metadata';
        v.onloadedmetadata = function () {
          var d = isFinite(v.duration) ? v.duration : 0;
          try { v.currentTime = d ? Math.min(1, d * 0.1) : 0.01; } catch (e) { finish(null); }
        };
        v.onseeked = function () {
          finish(drawThumb(v, v.videoWidth, v.videoHeight).then(function (r) {
            if (r) r.duration = isFinite(v.duration) ? v.duration : 0;
            v.removeAttribute('src');
            v.load();
            return r;
          }));
        };
        v.onerror = function () { finish(null); };
        v.src = url;
      }
    });
  }

  C.makeThumb = function (src, kind) {
    // Chrome: createImageBitmap нь зургийг ар талын thread дээр, жижигрүүлэн задална — хуудас гацахгүй
    if (kind === 'image' && typeof src !== 'string' && window.createImageBitmap && src.size < 80 * MB) {
      return createImageBitmap(src, { resizeWidth: 720, resizeQuality: 'medium', imageOrientation: 'from-image' })
        .then(function (bmp) {
          return drawThumb(bmp, bmp.width, bmp.height).then(function (r) { if (bmp.close) bmp.close(); return r; });
        })
        .catch(function () { return thumbViaElement(src, kind); });
    }
    return thumbViaElement(src, kind);
  };

  C.uploadThumb = function (name, th, key) {
    var q = { name: name, w: th.w || 0, h: th.h || 0 };
    if (key) q.key = key;
    if (th.duration) q.duration = th.duration.toFixed(2);
    return C.api('media_thumb', { query: q, raw: th.blob, type: th.blob.type }).then(function (r) { return r.item; });
  };

  /* Жижиг зургийн дараалал (зэрэг 3). job: { name, kind, file?|url?, key?, onDone(item), onFail() } */
  C.thumbs = (function () {
    var q = [], pending = new Map(), busy = 0, LIMIT = 3;
    function next() {
      while (busy < LIMIT && q.length) run(q.shift());
    }
    function run(job) {
      busy++;
      C.makeThumb(job.file || job.url, job.kind)
        .then(function (th) { return th ? C.uploadThumb(job.name, th, job.key) : null; })
        .then(function (item) {
          if (item) job.done.forEach(function (cb) { cb(item); });
          else job.fail.forEach(function (cb) { cb(); });
        })
        .catch(function () { job.fail.forEach(function (cb) { cb(); }); })
        .then(function () { pending.delete(job.name); busy--; setTimeout(next, 10); });
    }
    return {
      add: function (job) {
        var ex = pending.get(job.name);
        if (ex) {
          if (job.file && !ex.file) ex.file = job.file;   // файл байгаа бол дахин татахгүй
          if (job.key && !ex.key) ex.key = job.key;
          if (job.onDone) ex.done.push(job.onDone);
          if (job.onFail) ex.fail.push(job.onFail);
          return;
        }
        job.done = job.onDone ? [job.onDone] : [];
        job.fail = job.onFail ? [job.onFail] : [];
        pending.set(job.name, job);
        if (job.file) q.unshift(job); else q.push(job);   // шинэ байршуулалт түрүүлнэ
        next();
      },
      has: function (name) { return pending.has(name); },
    };
  })();

  /* ================= Сүлжээ ================= */
  function Slots(n) { this.free = n; this.wait = []; }
  Slots.prototype.take = function () {
    var s = this;
    if (s.free > 0) { s.free--; return Promise.resolve(); }
    return new Promise(function (r) { s.wait.push(r); });
  };
  Slots.prototype.give = function () {
    var r = this.wait.shift();
    if (r) r(); else this.free++;
  };

  function xhrSend(task, url, blob, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      task.xhrs.add(xhr);
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      if (C.state.csrf) xhr.setRequestHeader('X-CSRF', C.state.csrf);
      // Хамгийн багадаа 5 мин, эсвэл 20 КБ/с хурдаар дуусах хугацаа
      xhr.timeout = Math.max(5 * 60 * 1000, Math.ceil(blob.size / 20));
      xhr.upload.onprogress = function (e) { onProgress(e.loaded); };
      var end = function () { task.xhrs.delete(xhr); };
      xhr.onload = function () {
        end();
        var data = null;
        try { data = JSON.parse(xhr.responseText); } catch (e) { /* nginx/Cloudflare HTML алдаа */ }
        if (xhr.status >= 200 && xhr.status < 300 && data && data.ok) return resolve(data);
        var err = new Error((data && data.error) || ('HTTP ' + xhr.status));
        err.status = xhr.status;
        err.data = data;
        reject(err);
      };
      xhr.onerror = function () { end(); var e = new Error('Сүлжээ тасарлаа'); e.status = 0; reject(e); };
      xhr.ontimeout = function () { end(); var e = new Error('Хугацаа хэтэрлээ'); e.status = 0; reject(e); };
      xhr.onabort = function () { end(); var e = new Error('abort'); e.aborted = true; reject(e); };
      xhr.send(blob);
    });
  }

  function apiRetry(action, opts, tries) {
    tries = tries || 0;
    return C.api(action, opts).catch(function (e) {
      var transient = !e.status || e.status >= 500 || (e.status === 200 && !e.data);
      if (!transient || tries >= 6) throw e;
      return sleep(backoff(tries + 1)).then(function () { return apiRetry(action, opts, tries + 1); });
    });
  }

  function gaps(ranges, size) {
    var out = [], pos = 0;
    (ranges || []).slice().sort(function (a, b) { return a[0] - b[0]; }).forEach(function (r) {
      if (r[0] > pos) out.push([pos, r[0]]);
      pos = Math.max(pos, r[1]);
    });
    if (pos < size) out.push([pos, size]);
    return out;
  }
  function spanTotal(list) { var t = 0; list.forEach(function (r) { t += r[1] - r[0]; }); return t; }

  /* ================= Байршуулагч ================= */
  function Uploader(opts) {
    opts = opts || {};
    this.tasks = [];
    this.queue = [];
    this.qi = 0;
    this.running = new Set();
    this.keys = new Map();
    this.slots = new Slots(MAX_REQ);
    this.onItem = opts.onItem || function () {};
    this.chunk = 8 * MB;
    this.serverMax = C.state.chunkMax || 8 * MB;
    this.cap413 = Infinity;
    this.stats = { files: 0, done: 0, failed: 0, bytes: 0, sent: 0 };
    this.samples = [];
    this.pausedAll = false;
    this.panel = null;
    this.rows = new Map();
    this.minimized = false;
    this._timer = 0;
    this._lastRender = 0;
    this._wake = null;
    var self = this;
    window.addEventListener('beforeunload', function (e) {
      if (self.isBusy()) { e.preventDefault(); e.returnValue = ''; return ''; }
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) self.wake(); });
  }

  Uploader.prototype.isBusy = function () { return this.running.size > 0 || this.qi < this.queue.length; };

  Uploader.prototype.maxChunk = function () { return Math.max(MIN_CHUNK, Math.min(this.serverMax, this.cap413)); };
  Uploader.prototype.chunkSize = function () { return Math.max(MIN_CHUNK, Math.min(this.chunk, this.maxChunk())); };
  // Хэсэг бүр ~8–40 секундэд явах хэмжээнд тохируулна
  Uploader.prototype.adapt = function (bytes, ms) {
    if (ms < 8000 && bytes >= this.chunk) this.chunk = Math.min(this.maxChunk(), this.chunk * 2);
    else if (ms > 40000) this.chunk = Math.max(MB, Math.floor(this.chunk / 2));
  };

  // Удаан байршуулалтын үеэр утасны дэлгэц унтрахаас сэргийлнэ
  Uploader.prototype.wake = function () {
    var self = this;
    if (!navigator.wakeLock || document.hidden) return;
    if (self.running.size && !self._wake) {
      navigator.wakeLock.request('screen').then(function (l) {
        self._wake = l;
        l.addEventListener('release', function () { self._wake = null; });
      }).catch(function () {});
    } else if (!self.running.size && self._wake) {
      self._wake.release().catch(function () {});
      self._wake = null;
    }
  };

  function keyOf(f) { return f.name + '|' + f.size + '|' + f.lastModified; }

  Uploader.prototype.add = function (fileList) {
    var self = this, bad = 0, added = 0;
    Array.prototype.forEach.call(fileList || [], function (f) {
      if (!C.isMediaFile(f) || !f.size) { bad++; return; }
      var k = keyOf(f);
      if (self.keys.has(k)) return;
      var t = {
        uid: ++seq, key: k, file: f, name: f.name, size: f.size, kind: VIDEO.indexOf(extOf(f.name)) >= 0 ? 'video' : 'image',
        status: 'queued', error: '', note: '', paused: false, id: null, confirmed: 0, inflight: 0, inflightMap: new Map(),
        missing: [], xhrs: new Set(), failStreak: 0, samples: [], dirty: true,
      };
      self.keys.set(k, t);
      self.tasks.push(t);
      self.queue.push(t);
      self.stats.files++;
      self.stats.bytes += f.size;
      added++;
    });
    if (bad) C.toast(bad + ' файл алгаслаа — зөвхөн зураг, видео байршуулна', 'error');
    if (!added) return;
    this._doneToast = false;
    this.showPanel();
    this.pump();
    this.schedule(true);
  };

  Uploader.prototype.pump = function () {
    if (this.pausedAll) return;
    while (this.running.size < MAX_FILES) {
      var t = null;
      while (this.qi < this.queue.length) {
        var c = this.queue[this.qi++];
        if (c.status === 'queued') { t = c; break; }
      }
      if (!t) break;
      this.start(t);
    }
    if (this.qi > 2000) { this.queue = this.queue.slice(this.qi); this.qi = 0; }
    this.wake();
  };

  Uploader.prototype.setConfirmed = function (t, v) {
    this.stats.sent += v - t.confirmed;
    t.confirmed = v;
  };

  Uploader.prototype.mark = function (t) { t.dirty = true; this.schedule(); };

  Uploader.prototype.start = function (t) {
    var self = this;
    self.running.add(t);
    t.status = 'init';
    t.fatal = null;
    self.mark(t);
    var small = !t.forceChunked && t.size <= Math.min(SMALL_MAX, self.maxChunk());
    (small ? self.runSmall(t) : self.runChunked(t))
      .then(function (item) {
        if (t.status === 'canceled' || !item) return;
        self.setConfirmed(t, t.size);
        t.status = 'done';
        t.item = item;
        t.error = '';
        t.note = '';
        self.stats.done++;
        self.keys.delete(t.key);
        self.onItem(item, !!t.existing);
        if (!t.existing && !item.thumb) {
          C.thumbs.add({
            name: item.name, kind: t.kind, file: t.file, key: item.thumbKey,
            onDone: function (it) { t.item = it; self.mark(t); self.onItem(it, true); },
            onFail: function () { self.onItem(Object.assign({}, item, { raw: true }), true); },
          });
        }
        t.file = null;   // санах ойг чөлөөлнө
      })
      .catch(function (e) {
        if (t.status === 'canceled') return;
        if (e && e.toChunked) { t.forceChunked = true; t.status = 'queued'; self.queue.push(t); return; }
        self.abortAll(t);
        t.status = 'error';
        t.error = (e && e.message) || 'Алдаа гарлаа';
        self.stats.failed++;
      })
      .then(function () {
        self.running.delete(t);
        self.mark(t);
        self.pump();
        self.wake();
      });
  };

  Uploader.prototype.abortAll = function (t) {
    t.xhrs.forEach(function (x) { try { x.abort(); } catch (e) { /* */ } });
  };

  function waitResume(t) {
    return new Promise(function (r) {
      (function check() { if (!t.paused || t.status === 'canceled') r(); else setTimeout(check, 400); })();
    });
  }

  function authMsg(e) {
    if (e.status === 401 || e.status === 403) e.message = 'Цомгийн нэвтрэлт дууссан. «Дахин оролдох» дарж кодоо оруулна уу.';
    return e;
  }

  /* Жижиг файл: нэг хүсэлт */
  Uploader.prototype.runSmall = function (t) {
    var self = this, tries = 0;
    function attempt() {
      if (t.status === 'canceled') return Promise.resolve(null);
      if (t.paused) return waitResume(t).then(attempt);
      return self.slots.take().then(function () {
        if (t.status === 'canceled') { self.slots.give(); return null; }
        if (t.paused) { self.slots.give(); return attempt(); }
        t.status = 'uploading';
        self.mark(t);
        var url = 'api.php?action=upload_small&name=' + encodeURIComponent(t.name) + '&size=' + t.size + '&lm=' + encodeURIComponent(String(t.file.lastModified || ''));
        return xhrSend(t, url, t.file, function (loaded) { t.inflight = loaded; self.schedule(); }).then(function (r) {
          self.slots.give();
          t.inflight = 0;
          t.existing = !!r.existing;
          return r.item;
        }, function (e) {
          self.slots.give();
          t.inflight = 0;
          if (e.aborted) return attempt();          // түр зогсоосон эсвэл цуцалсан
          if (e.status === 413) {                    // сервер/nginx хэт том гэвэл хэсэгчилж илгээнэ
            self.cap413 = Math.max(MIN_CHUNK, Math.floor(t.size / 2));
            var x = new Error('413');
            x.toChunked = true;
            throw x;
          }
          if (fatal(e)) throw authMsg(e);
          if (++tries > 10) throw e;
          t.status = 'retrying';
          t.error = e.message + ' — дахин оролдож байна (' + tries + ')';
          self.mark(t);
          return sleep(backoff(tries)).then(attempt);
        });
      });
    }
    return attempt();
  };

  /* Том файл: init → олон хэсэг зэрэг → finish */
  Uploader.prototype.runChunked = function (t) {
    var self = this;
    return apiRetry('upload_init', { body: { name: t.name, size: t.size, lastModified: String(t.file.lastModified || '') } })
      .then(function (init) {
        t.id = init.id;
        if (t.status === 'canceled') { C.api('upload_cancel', { body: { id: init.id } }).catch(function () {}); return null; }
        if (init.chunkMax) self.serverMax = init.chunkMax;
        if (init.item) { t.existing = true; return init.item; }
        if (init.resumed) t.note = 'Тасарсан газраасаа үргэлжилж байна';
        t.missing = gaps(init.ranges, t.size);
        self.setConfirmed(t, t.size - spanTotal(t.missing));
        t.status = 'uploading';
        self.mark(t);
        return self.streamChunks(t).then(function () { return self.finish(t, 0); });
      }, function (e) { throw fatal(e) ? authMsg(e) : e; });
  };

  Uploader.prototype.streamChunks = function (t) {
    var self = this;
    function take() {
      if (!t.missing.length) return null;
      var r = t.missing[0], cs = self.chunkSize();
      var s = r[0], e = Math.min(r[1], s + cs);
      if (e >= r[1]) t.missing.shift(); else r[0] = e;
      return [s, e];
    }
    function putBack(ch) { t.missing.unshift(ch); }
    function worker() {
      if (t.status === 'canceled' || t.fatal) return Promise.resolve();
      if (t.paused) {
        if (t.status !== 'paused' && !t.xhrs.size) { t.status = 'paused'; self.mark(t); }
        return waitResume(t).then(function () {
          if (t.status === 'paused') { t.status = 'uploading'; self.mark(t); }
          return worker();
        });
      }
      var ch = take();
      if (!ch) return Promise.resolve();
      return self.slots.take().then(function () {
        if (t.status === 'canceled' || t.fatal || t.paused) { self.slots.give(); putBack(ch); return worker(); }
        var size = ch[1] - ch[0], t0 = performance.now(), key = {};
        t.inflightMap.set(key, 0);
        return xhrSend(t, 'api.php?action=upload_chunk&id=' + encodeURIComponent(t.id) + '&offset=' + ch[0], t.file.slice(ch[0], ch[1]), function (l) {
          t.inflightMap.set(key, l);
          self.schedule();
        }).then(function () {
          self.slots.give();
          t.inflightMap.delete(key);
          t.failStreak = 0;
          t.error = '';
          if (t.status === 'retrying') t.status = 'uploading';
          self.setConfirmed(t, t.confirmed + size);
          self.adapt(size, performance.now() - t0);
          self.mark(t);
          return worker();
        }, function (e) {
          self.slots.give();
          t.inflightMap.delete(key);
          putBack(ch);
          if (e.aborted) return worker();
          if (e.status === 413) {
            if (size <= MIN_CHUNK) { t.fatal = e; return; }
            self.cap413 = Math.max(MIN_CHUNK, Math.floor(size / 2));
            self.chunk = Math.min(self.chunk, self.cap413);
            return worker();
          }
          if (fatal(e)) { t.fatal = authMsg(e); self.abortAll(t); return; }
          if (!e.status || e.status === 408 || e.status === 504 || e.status === 524) {
            self.chunk = Math.max(MB, Math.floor(Math.min(self.chunk, size) / 2));
          }
          t.failStreak++;
          if (t.failStreak > 12) { t.fatal = e; self.abortAll(t); return; }
          t.status = 'retrying';
          t.error = e.message + ' — дахин оролдож байна (' + t.failStreak + ')';
          self.mark(t);
          return sleep(backoff(t.failStreak)).then(worker);
        });
      });
    }
    var n = Math.max(1, Math.min(STREAMS, Math.ceil(spanTotal(t.missing) / self.chunkSize())));
    var ws = [];
    for (var i = 0; i < n; i++) ws.push(worker());
    return Promise.all(ws).then(function () { if (t.fatal) throw t.fatal; });
  };

  Uploader.prototype.finish = function (t, round) {
    var self = this;
    if (t.status === 'canceled') return Promise.resolve(null);
    t.status = 'finishing';
    self.mark(t);
    return apiRetry('upload_finish', { body: { id: t.id } }).then(function (fin) { return fin.item; }, function (e) {
      // Сервер дээр дутуу муж байвал (ховор) тэдгээрийг дахин илгээнэ
      if (e.status === 409 && e.data && e.data.ranges && round < 2) {
        t.missing = gaps(e.data.ranges, t.size);
        self.setConfirmed(t, t.size - spanTotal(t.missing));
        t.status = 'uploading';
        return self.streamChunks(t).then(function () { return self.finish(t, round + 1); });
      }
      throw fatal(e) ? authMsg(e) : e;
    });
  };

  Uploader.prototype.pause = function (t) {
    if (!ACTIVE[t.status] || t.status === 'queued' || t.status === 'finishing') return;
    t.paused = true;
    this.abortAll(t);
    t.status = 'paused';
    this.mark(t);
  };
  Uploader.prototype.resume = function (t) {
    t.paused = false;
    if (t.status === 'paused') t.status = 'uploading';
    this.mark(t);
  };
  Uploader.prototype.toggleAll = function () {
    var self = this;
    this.pausedAll = !this.pausedAll;
    this.running.forEach(function (t) { if (self.pausedAll) self.pause(t); else self.resume(t); });
    if (!this.pausedAll) this.pump();
    this.schedule(true);
  };
  Uploader.prototype.cancel = function (t) {
    var wasError = t.status === 'error';
    var hadId = t.id && t.status !== 'done';
    t.status = 'canceled';
    t.paused = false;
    this.abortAll(t);
    if (hadId) C.api('upload_cancel', { body: { id: t.id } }).catch(function () {});
    this.stats.files--;
    this.stats.bytes -= t.size;
    this.stats.sent -= t.confirmed;
    if (wasError) this.stats.failed--;
    this.keys.delete(t.key);
    var i = this.tasks.indexOf(t);
    if (i >= 0) this.tasks.splice(i, 1);
    this.schedule(true);
  };
  Uploader.prototype.requeue = function (t) {
    t.status = 'queued';
    t.error = '';
    t.failStreak = 0;
    this.stats.failed--;
    this.queue.push(t);
  };
  Uploader.prototype.retry = function (t) {
    var self = this;
    C.refreshStatus().catch(function () {}).then(function () { return C.ensureMember(); }).then(function (ok) {
      if (!ok || t.status !== 'error') return;
      self.requeue(t);
      self.pump();
      self.schedule(true);
    });
  };
  Uploader.prototype.retryAll = function () {
    var self = this;
    C.refreshStatus().catch(function () {}).then(function () { return C.ensureMember(); }).then(function (ok) {
      if (!ok) return;
      self.tasks.forEach(function (t) { if (t.status === 'error') self.requeue(t); });
      self.pump();
      self.schedule(true);
    });
  };

  /* ================= Самбар ================= */
  Uploader.prototype.showPanel = function () {
    if (this.panel) { this.panel.hidden = false; return; }
    var self = this;
    var p = C.el(
      '<section class="up-panel glass" aria-label="Байршуулалт">' +
      '<div class="up-head"><div style="margin-right:auto;min-width:0"><b>Байршуулалт</b><small class="up-sum"></small><small class="up-speed"></small></div>' +
      '<button class="btn btn-ghost btn-icon btn-sm" data-all title="Бүгдийг түр зогсоох">' + C.icon('pause', 'i-sm') + '</button>' +
      '<button class="btn btn-ghost btn-icon btn-sm" data-min title="Жижигрүүлэх" style="transform:rotate(-90deg)">' + C.icon('left', 'i-sm') + '</button>' +
      '<button class="btn btn-ghost btn-icon btn-sm" data-x title="Хаах">' + C.icon('x', 'i-sm') + '</button></div>' +
      '<div class="up-total"><i></i></div>' +
      '<div class="up-summary" hidden></div>' +
      '<div class="up-list"></div>' +
      '<div class="up-drop" tabindex="0" role="button">' + C.icon('upload', 'i-sm') + ' Файл нэмэх — энд чирж оруулах эсвэл дарж сонгох</div>' +
      '</section>'
    );
    document.body.appendChild(p);
    this.panel = p;
    this.el = {
      sum: p.querySelector('.up-sum'), speed: p.querySelector('.up-speed'), bar: p.querySelector('.up-total i'),
      summary: p.querySelector('.up-summary'), list: p.querySelector('.up-list'), all: p.querySelector('[data-all]'),
    };
    p.querySelector('[data-min]').onclick = function () {
      self.minimized = !self.minimized;
      p.classList.toggle('min', self.minimized);
      this.innerHTML = C.icon(self.minimized ? 'right' : 'left', 'i-sm');
      this.title = self.minimized ? 'Томруулах' : 'Жижигрүүлэх';
    };
    this.el.all.onclick = function () { self.toggleAll(); };
    p.querySelector('[data-x]').onclick = function () {
      if (self.isBusy()) {
        C.confirm({ title: 'Байршуулалтыг зогсоох уу?', text: 'Дуусаагүй бүх байршуулалт цуцлагдана.', ok: 'Зогсоох', danger: true }).then(function (y) {
          if (!y) return;
          self.pausedAll = false;
          self.tasks.slice().forEach(function (t) { if (ACTIVE[t.status] || t.status === 'error') self.cancel(t); });
          self.clearDone();
          p.hidden = true;
        });
      } else {
        self.clearDone();
        p.hidden = true;
      }
    };
    this.el.summary.addEventListener('click', function (e) { if (e.target.closest('[data-retry-all]')) self.retryAll(); });
    var drop = p.querySelector('.up-drop');
    drop.onclick = function () { C.pickFiles(function (files) { self.add(files); }); };
    drop.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop.click(); } };
    ['dragover', 'dragenter'].forEach(function (ev) { p.addEventListener(ev, function (e) { e.preventDefault(); e.stopPropagation(); }); });
    p.addEventListener('drop', function (e) { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer && e.dataTransfer.files.length) self.add(e.dataTransfer.files); });
  };

  // Дууссан/алдаатай мөрүүдийг цэвэрлэнэ (алдаатайн хэсэг сервер дээр үлдэж, дахин сонгоход үргэлжилнэ)
  Uploader.prototype.clearDone = function () {
    var self = this;
    this.tasks = this.tasks.filter(function (t) {
      if (t.status === 'done' || t.status === 'error') {
        if (t.status === 'error') self.keys.delete(t.key);
        return false;
      }
      return true;
    });
    this.stats = { files: 0, done: 0, failed: 0, bytes: 0, sent: 0 };
    this.tasks.forEach(function (t) { self.stats.files++; self.stats.bytes += t.size; self.stats.sent += t.confirmed; });
    this.samples = [];
    this.rows.forEach(function (r) { r.el.remove(); });
    this.rows.clear();
    this.schedule(true);
  };

  // Шинэчлэлийг ~3 удаа/сек болгож хязгаарлана
  Uploader.prototype.schedule = function (now) {
    var self = this;
    if (now) { clearTimeout(this._timer); this._timer = 0; this.render(); return; }
    if (this._timer) return;
    var wait = Math.max(0, 300 - (performance.now() - this._lastRender));
    this._timer = setTimeout(function () { self._timer = 0; self.render(); }, wait);
  };

  function rowFor(self, t) {
    var r = self.rows.get(t);
    if (r) return r;
    var el = C.el('<div class="up-item"><div class="up-thumb">' + C.icon(t.kind === 'video' ? 'video' : 'images', 'i-sm') + '</div>' +
      '<div style="min-width:0"><div class="up-name"></div><div class="up-meta"></div><div class="up-bar"><i></i></div></div><div class="up-btns"></div></div>');
    el.querySelector('.up-name').textContent = t.name;
    el.querySelector('.up-name').title = t.name;
    r = { el: el, bar: el.querySelector('.up-bar i'), meta: el.querySelector('.up-meta'), btns: el.querySelector('.up-btns'), thumb: el.querySelector('.up-thumb'), txt: '', cls: '', w: '', key: '' };
    r.btns.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]');
      if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'pause') self.pause(t);
      else if (a === 'resume') self.resume(t);
      else if (a === 'retry') self.retry(t);
      else if (a === 'cancel') self.cancel(t);
    });
    self.rows.set(t, r);
    return r;
  }

  function taskInflight(t) {
    var s = t.inflight || 0;
    t.inflightMap.forEach(function (v) { s += v; });
    return s;
  }

  function rate(samples, now, bytes) {
    samples.push([now, bytes]);
    while (samples.length > 2 && now - samples[0][0] > 8000) samples.shift();
    var a = samples[0], dt = (now - a[0]) / 1000;
    return dt > 0.8 ? Math.max(0, (bytes - a[1]) / dt) : 0;
  }

  Uploader.prototype.render = function () {
    if (!this.panel) return;
    var self = this, st = this.stats, now = performance.now();
    this._lastRender = now;

    var inflight = 0;
    this.running.forEach(function (t) { inflight += taskInflight(t); });
    var sent = Math.min(st.bytes, st.sent + inflight);
    var sp = rate(this.samples, now, sent);
    var queued = 0, active = 0;
    var visible = [];
    var compact = this.tasks.length > COMPACT_AT;
    var lastDone = [];
    for (var i = 0; i < this.tasks.length; i++) {
      var t = this.tasks[i];
      if (t.status === 'queued') queued++;
      else if (ACTIVE[t.status]) active++;
      if (!compact) visible.push(t);
      else if ((ACTIVE[t.status] && t.status !== 'queued') || t.status === 'error') { if (visible.length < MAX_ROWS) visible.push(t); }
      else if (t.status === 'done') { lastDone.push(t); if (lastDone.length > 3) lastDone.shift(); }
    }
    if (compact) visible = visible.concat(lastDone);

    // Толгой
    this.el.sum.textContent = st.files
      ? st.done + '/' + st.files + ' файл · ' + C.fmtBytes(sent) + ' / ' + C.fmtBytes(st.bytes)
      : 'Файл сонгоогүй байна';
    var busy = this.running.size > 0;
    this.el.speed.textContent = this.pausedAll ? 'Бүгд түр зогссон'
      : busy && sp > 0 ? C.fmtBytes(sp) + '/с · ' + (C.fmtEta((st.bytes - sent) / sp) || '—') + ' үлдсэн · хуудсаа хаалгүй байна уу'
      : '';
    this.el.bar.style.width = (st.bytes ? (sent / st.bytes) * 100 : 0).toFixed(2) + '%';
    var allKey = this.pausedAll ? 'play' : 'pause';
    if (this.el.all.getAttribute('data-k') !== allKey) {
      this.el.all.setAttribute('data-k', allKey);
      this.el.all.innerHTML = C.icon(allKey, 'i-sm');
      this.el.all.title = this.pausedAll ? 'Бүгдийг үргэлжлүүлэх' : 'Бүгдийг түр зогсоох';
    }
    this.el.all.hidden = !(busy || queued || this.pausedAll);

    // Хураангуй мөр
    var sumHtml = '';
    if (compact || st.failed) {
      sumHtml = '<span>Хүлээгдэж буй <b>' + queued + '</b></span><span>Явж буй <b>' + active + '</b></span><span>Дууссан <b>' + st.done + '</b></span>' +
        (st.failed ? '<span class="bad">Алдаатай <b>' + st.failed + '</b></span><button class="btn btn-ghost btn-sm" data-retry-all>' + C.icon('refresh', 'i-sm') + 'Дахин оролдох</button>' : '');
    }
    if (this._sumHtml !== sumHtml) {
      this._sumHtml = sumHtml;
      this.el.summary.innerHTML = sumHtml;
      this.el.summary.hidden = !sumHtml;
    }

    // Мөрүүд: зөвхөн харагдах ёстойг нь, өөрчлөгдсөн хэсгийг нь шинэчилнэ
    var keep = new Set(visible);
    this.rows.forEach(function (r, t) { if (!keep.has(t)) { r.el.remove(); self.rows.delete(t); } });
    var list = this.el.list, prev = null;
    visible.forEach(function (t) {
      var r = rowFor(self, t);
      var want = prev ? prev.nextSibling : list.firstChild;
      if (want !== r.el) list.insertBefore(r.el, want);
      prev = r.el;
      var cur = t.status === 'done' ? t.size : Math.min(t.size, t.confirmed + taskInflight(t));
      var pct = t.size ? (cur / t.size) * 100 : 0;
      var w = pct.toFixed(1) + '%';
      if (r.w !== w) { r.w = w; r.bar.style.width = w; }
      var txt = '', cls = 'up-meta';
      if (t.status === 'queued') txt = 'Хүлээгдэж байна · ' + C.fmtBytes(t.size);
      else if (t.status === 'init') txt = 'Бэлтгэж байна…';
      else if (t.status === 'uploading') {
        var s = rate(t.samples, now, cur);
        txt = pct.toFixed(pct < 10 ? 1 : 0) + '% · ' + C.fmtBytes(cur) + ' / ' + C.fmtBytes(t.size);
        if (s > 0 && t.size > 4 * MB) txt += ' · ' + C.fmtBytes(s) + '/с';
        if (t.note) txt = t.note + ' · ' + txt;
      } else if (t.status === 'retrying') { txt = t.error; cls += ' err'; }
      else if (t.status === 'paused') txt = 'Түр зогссон · ' + pct.toFixed(0) + '%';
      else if (t.status === 'finishing') txt = 'Хадгалж байна…';
      else if (t.status === 'done') { txt = (t.existing ? 'Өмнө нь байршсан' : 'Амжилттай байршлаа') + ' · ' + C.fmtBytes(t.size); cls += ' ok'; }
      else if (t.status === 'error') { txt = t.error; cls += ' err'; }
      if (r.txt !== txt || r.cls !== cls) { r.txt = txt; r.cls = cls; r.meta.className = cls; r.meta.textContent = txt; }
      var key = t.status;
      if (r.key !== key) {
        r.key = key;
        var b = '';
        var btn = function (a, icon, title) { return '<button type="button" data-a="' + a + '" title="' + title + '" aria-label="' + title + '">' + C.icon(icon, 'i-sm') + '</button>'; };
        if (t.status === 'uploading' || t.status === 'retrying') b += btn('pause', 'pause', 'Түр зогсоох');
        if (t.status === 'paused') b += btn('resume', 'play', 'Үргэлжлүүлэх');
        if (t.status === 'error') b += btn('retry', 'refresh', 'Дахин оролдох');
        if (t.status !== 'done' && t.status !== 'finishing') b += btn('cancel', 'x', 'Цуцлах');
        if (t.status === 'done') b += '<span class="up-ok">' + C.icon('check', 'i-sm') + '</span>';
        r.btns.innerHTML = b;
      }
      if (t.status === 'done' && t.item && t.item.thumb && !r.hasThumb) {
        r.hasThumb = true;
        r.thumb.innerHTML = '<img alt="" src="' + C.esc(t.item.thumb) + '">';
      }
      t.dirty = false;
    });

    if (!busy && !queued && st.files && st.done + st.failed === st.files && !this._doneToast) {
      this._doneToast = true;
      C.toast(st.done + ' файл амжилттай байршлаа' + (st.failed ? ' · ' + st.failed + ' алдаатай' : ''));
    }
  };

  /* Файл сонгох цонх нээх */
  C.pickFiles = function (cb) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.multiple = true;
    inp.accept = C.MEDIA_ACCEPT;
    inp.style.display = 'none';
    inp.onchange = function () { if (inp.files && inp.files.length) cb(inp.files); inp.remove(); };
    document.body.appendChild(inp);
    inp.click();
  };

  C.Uploader = Uploader;
})();
