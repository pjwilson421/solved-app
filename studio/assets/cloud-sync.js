/* SOLVED cloud sync.
   Mirrors the studio's browser storage (localStorage "solved-*" keys + the IndexedDB "solved-studio/kv" store)
   to the signed-in user's Supabase account, so projects are backed up and the same on every computer.
   Images saved as data URLs are uploaded to the private "project-files" bucket and replaced by a file reference.
   Loads right after the multi-project storage shim and before the app. */
(function () {
  'use strict';
  // If this browser was signed in before, hide the page immediately — before first paint — so a
  // stale empty-local-storage flash never shows while pull() catches it up with the cloud. This
  // script is a synchronous <head> tag, so this runs before the body is even parsed. Every path
  // below that can finish pull() (success, failure, or "nothing to do") un-hides it again.
  if (document.cookie.indexOf('sb_at=') > -1) document.documentElement.style.visibility = 'hidden';
  var URL_ = 'https://wetzjfsdumraslfojcva.supabase.co', KEY = 'sb_publishable_bw0_xjD26NDCDCUAYKM0TA_NS9DE_D1';
  var BUCKET = 'project-files', META = 'solved-sync-meta', PULLED = 'solved-sync-pulled';
  var QKEY = 'solved-sync-queue', SKIP_LS = { 'solved-current': 1, 'solved-hf': 1, 'solved-sync-meta': 1, 'solved-sync-queue': 1 };
  var S = window.__solved, LS = window.localStorage;
  if (!window.supabase || !S) { document.documentElement.style.visibility = ''; return; }
  var sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'sb-solved-auth' } });
  var user = null, ready = false, suppress = 0, queue = new Map(), timer = null, busy = false, fails = 0;

  /* ---------- status badge (only shown while saving or on a problem) ---------- */
  var badge;
  function status(text, kind) {
    if (!badge) {
      if (!document.body) { document.addEventListener('DOMContentLoaded', function () { status(text, kind); }); return; }
      badge = document.createElement('div');
      badge.setAttribute('role', 'status');
      badge.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;padding:8px 12px;border-radius:8px;background:#141414;border:1px solid #2a2a2a;color:#a3a3a3;font:12px "Helvetica Neue",Helvetica,Arial,sans-serif;transition:opacity .3s;pointer-events:none';
      document.body.appendChild(badge);
    }
    badge.innerHTML = text;
    badge.style.color = kind === 'err' ? '#ff6b6b' : '#a3a3a3';
    badge.style.pointerEvents = kind === 'link' ? 'auto' : 'none';
    badge.style.opacity = text ? '1' : '0';
  }

  /* ---------- helpers ---------- */
  function meta() { try { return JSON.parse(S.get(META) || '{}') || {}; } catch (e) { return {}; } }
  function setMeta(m) { try { S.set(META, JSON.stringify(m)); } catch (e) {} }
  function syncLs(k) { return k.indexOf('solved') === 0 && !SKIP_LS[k]; }
  var EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'audio/mpeg': 'mp3', 'application/pdf': 'pdf' };
  async function sha(str) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('').slice(0, 40);
  }
  function dataToBlob(d) {
    var i = d.indexOf(','), head = d.slice(5, i), b64 = head.indexOf(';base64') > -1, type = head.split(';')[0] || 'application/octet-stream';
    var raw = b64 ? atob(d.slice(i + 1)) : decodeURIComponent(d.slice(i + 1)), arr = new Uint8Array(raw.length);
    for (var j = 0; j < raw.length; j++) arr[j] = raw.charCodeAt(j);
    return { blob: new Blob([arr], { type: type }), type: type };
  }
  function blobToData(blob) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(blob); }); }

  // Replace large data URLs with uploaded-file references (deep).
  async function pack(v) {
    if (typeof v === 'string') {
      if (v.length > 2000 && v.indexOf('data:') === 0) {
        var b = dataToBlob(v), path = user.id + '/files/' + (await sha(v)) + '.' + (EXT[b.type] || 'bin');
        var up = await sb.storage.from(BUCKET).upload(path, b.blob, { contentType: b.type, upsert: false });
        if (up.error && !/exists|Duplicate/i.test(up.error.message)) throw up.error;
        return { $sbfile: path, $type: b.type };
      }
      return v;
    }
    if (Array.isArray(v)) { var out = []; for (var i = 0; i < v.length; i++) out.push(await pack(v[i])); return out; }
    if (v && typeof v === 'object') {
      if (v instanceof Blob) return pack(await blobToData(v));
      var o = {}; for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) o[k] = await pack(v[k]); return o;
    }
    return v;
  }
  var dl = {};
  async function unpack(v) {
    if (Array.isArray(v)) { var out = []; for (var i = 0; i < v.length; i++) out.push(await unpack(v[i])); return out; }
    if (v && typeof v === 'object') {
      if (v.$sbfile) {
        if (!dl[v.$sbfile]) dl[v.$sbfile] = sb.storage.from(BUCKET).download(v.$sbfile).then(function (r) { if (r.error) throw r.error; return blobToData(r.data); });
        return dl[v.$sbfile];
      }
      var o = {}; for (var k in v) o[k] = await unpack(v[k]); return o;
    }
    return v;
  }

  /* ---------- raw IndexedDB access (bypasses capture) ---------- */
  var dbp;
  function db() { return dbp || (dbp = new Promise(function (res, rej) { var q = indexedDB.open('solved-studio', 1); q.onupgradeneeded = function () { q.result.createObjectStore('kv'); }; q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; })); }
  function idbAll() {
    return db().then(function (d) { return new Promise(function (res, rej) {
      var out = [], t = d.transaction('kv', 'readonly'), c = t.objectStore('kv').openCursor();
      c.onsuccess = function () { var cur = c.result; if (cur) { out.push([String(cur.key), cur.value]); cur.continue(); } };
      t.oncomplete = function () { res(out); }; t.onerror = function () { rej(t.error); };
    }); });
  }
  function idbGet(k) {
    return db().then(function (d) { return new Promise(function (res, rej) {
      var q = d.transaction('kv', 'readonly').objectStore('kv').get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); };
    }); });
  }
  function idbWrite(k, v, del) {
    return db().then(function (d) { return new Promise(function (res, rej) {
      suppress++; var t = d.transaction('kv', 'readwrite'), st = t.objectStore('kv');
      try { del ? st.delete(k) : st.put(v, k); } finally { suppress--; }
      t.oncomplete = res; t.onerror = function () { rej(t.error); };
    }); });
  }

  /* ---------- capture writes ---------- */
  function enqueue(src, k, op, value) {
    if (src === 'ls' && !syncLs(k)) return;
    queue.set(src + '\u0000' + k, { src: src, k: k, op: op, value: value, at: new Date().toISOString() });
    saveQ();
    if (ready) schedule();
  }
  // The pending list is kept in localStorage so changes made right before a reload (e.g. creating a project) still upload.
  function saveQ() { try { S.set(QKEY, JSON.stringify(Array.from(queue.values()).map(function (it) { return { src: it.src, k: it.k, op: it.op, at: it.at }; }))); } catch (e) {} }
  try { (JSON.parse(S.get(QKEY) || '[]') || []).forEach(function (it) { if (it && it.k) queue.set(it.src + '\u0000' + it.k, it); }); } catch (e) {}
  var P = Storage.prototype, setI = P.setItem, delI = P.removeItem;
  P.setItem = function (k, v) { var r = setI.apply(this, arguments); if (this === LS && !suppress) enqueue('ls', S.lsKey(S.current, String(k)), 'set'); return r; };
  P.removeItem = function (k) { var r = delI.apply(this, arguments); if (this === LS && !suppress) enqueue('ls', S.lsKey(S.current, String(k)), 'del'); return r; };
  var sset = S.set, sdel = S.del, sreg = S.saveRegistry;
  S.set = function (k, v) { var r = sset(k, v); if (!suppress) enqueue('ls', String(k), 'set'); return r; };
  S.del = function (k) { var r = sdel(k); if (!suppress) enqueue('ls', String(k), 'del'); return r; };
  S.saveRegistry = function (r) { var x = sreg(r); if (!suppress) enqueue('ls', 'solved-projects', 'set'); return x; };
  var O = IDBObjectStore.prototype, put = O.put, del = O.delete;
  function ours(st) { try { return st.name === 'kv' && st.transaction.db.name === 'solved-studio'; } catch (e) { return false; } }
  O.put = function (v, k) { var r = put.apply(this, arguments); if (!suppress && ours(this) && k !== undefined) enqueue('idb', String(k), 'set', v); return r; };
  O.delete = function (k) { var r = del.apply(this, arguments); if (!suppress && ours(this) && typeof k !== 'object') enqueue('idb', String(k), 'del'); return r; };

  /* ---------- push ---------- */
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(flush, ms == null ? 1500 : ms); }
  async function flush() {
    if (busy || !user || !queue.size) return;
    busy = true; status('Saving to cloud…');
    var m = meta();
    try {
      for (var [id, it] of Array.from(queue.entries())) {
        if (it.op === 'del') {
          var d = await sb.from('kv_store').delete().eq('owner_id', user.id).eq('src', it.src).eq('k', it.k);
          if (d.error) throw d.error;
          delete m[id];
        } else {
          var raw = it.src === 'ls' ? S.get(it.k) : (it.value !== undefined ? it.value : await idbGet(it.k));
          if (raw === null || raw === undefined) { queue.delete(id); continue; }
          var val;
          if (it.src === 'ls') { var parsed; try { parsed = { t: 'json', d: JSON.parse(raw) }; } catch (e) { parsed = { t: 'str', d: raw }; } val = await pack(parsed); }
          else val = { t: 'v', d: await pack(raw) };
          var body = JSON.stringify(val);
          var u = await sb.from('kv_store').upsert({ owner_id: user.id, src: it.src, k: it.k, v: val, bytes: body.length, updated_at: it.at });
          if (u.error) throw u.error;
          m[id] = Date.parse(it.at);
        }
        if (queue.get(id) === it) queue.delete(id);
      }
      setMeta(m); fails = 0; status('');
    } catch (e) {
      setMeta(m); fails++;
      console.warn('[cloud-sync]', e);
      status('Couldn’t save to cloud — retrying', 'err');
      schedule(Math.min(60000, 3000 * fails));
    } finally { busy = false; saveQ(); if (queue.size && !fails) schedule(300); }
  }
  window.addEventListener('beforeunload', function () { if (queue.size) flush(); });

  /* ---------- pull (once per browser tab) ---------- */
  async function pull() {
    var rows = [], from = 0;
    for (;;) {
      var r = await sb.from('kv_store').select('src,k,v,updated_at').order('k').range(from, from + 499);
      if (r.error) throw r.error;
      rows = rows.concat(r.data); if (r.data.length < 500) break; from += 500;
    }
    var m = meta(), changed = false, cloud = {}, cloudReg = null;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i], id = row.src + '\u0000' + row.k; cloud[id] = 1;
      if (row.src === 'ls' && row.k === 'solved-projects') cloudReg = JSON.stringify(row.v.d);
      var ts = Date.parse(row.updated_at);
      // A locally-made change not yet uploaded has no entry in m[id] yet, so without this check
      // it looks "stale" and gets clobbered by the cloud's older copy — silently losing the edit
      // (e.g. a just-toggled keyframe) and cancelling the very upload that would have fixed it.
      if (queue.has(id)) continue;
      if (m[id] && m[id] >= ts) continue;
      var v = await unpack(row.v.d);
      suppress++;
      try {
        if (row.src === 'ls') S.set(row.k, row.v.t === 'json' ? JSON.stringify(v) : v);
      } finally { suppress--; }
      if (row.src === 'idb') await idbWrite(row.k, v);
      m[id] = ts; changed = true;
    }
    setMeta(m);
    // project list: if this browser's list differs from the cloud's and wasn't just replaced by it, upload it
    if (cloudReg !== null) { try { if (JSON.stringify(JSON.parse(S.get('solved-projects'))) !== cloudReg) enqueue('ls', 'solved-projects', 'set'); } catch (e) {} }
    // anything local the cloud doesn't have yet gets uploaded
    S.keys().forEach(function (k) { if (syncLs(k) && !cloud['ls\u0000' + k] && !m['ls\u0000' + k]) enqueue('ls', k, 'set'); });
    (await idbAll()).forEach(function (e) { if (!cloud['idb\u0000' + e[0]] && !m['idb\u0000' + e[0]]) enqueue('idb', e[0], 'set', e[1]); });
    return changed;
  }

  function setCookie(s) { document.cookie = s ? 'sb_at=' + encodeURIComponent(s.access_token) + '; Path=/; Max-Age=3600; Secure; SameSite=Lax' : 'sb_at=; Path=/; Max-Age=0; Secure; SameSite=Lax'; }
  sb.auth.onAuthStateChange(function (ev, s) { if (s) setCookie(s); });

  window.__solvedSync = { client: sb, flush: flush, pending: function () { return queue.size; }, status: status };

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('#solved-retry-pull');
    if (!t) return;
    e.preventDefault();
    sessionStorage.removeItem(PULLED);
    location.reload();
  });

  sb.auth.getSession().then(async function (r) {
    var s = r.data && r.data.session;
    if (!s) { document.documentElement.style.visibility = ''; ready = true; status('<a href="/studio/login" style="color:#00bd50">Sign in</a> to save projects to the cloud', 'link'); return; }
    user = s.user; setCookie(s);
    var tabKey = user.id;
    if (sessionStorage.getItem(PULLED) !== tabKey) {
      document.documentElement.style.visibility = 'hidden';
      try {
        var changed = await pull();
        sessionStorage.setItem(PULLED, tabKey);
        saveQ(); if (changed) { location.reload(); return; }
      } catch (e) {
        console.warn('[cloud-sync] pull failed', e);
        // Leaving PULLED unset means the next reload retries automatically, but don't leave the
        // user stuck on stale/empty local data with only a tiny badge as the only cue — offer an
        // explicit retry instead of requiring them to know to refresh.
        status('Couldn’t load from cloud — <a href="#" id="solved-retry-pull" style="color:#6fb3ff">retry</a>, or continue offline', 'link');
      }
    }
    document.documentElement.style.visibility = '';
    ready = true; schedule(500);
  }).catch(function (e) {
    // getSession() itself can reject (e.g. storage access blocked); without this, the page
    // would stay hidden forever for anyone whose browser previously signed in.
    console.warn('[cloud-sync] session check failed', e);
    document.documentElement.style.visibility = '';
    ready = true;
  });
})();
