/* =========================================================
 * 5R XFMR — Core: IndexedDB, API client, Outbox & Sync
 * Dipakai bersama oleh halaman (window) dan Service Worker (self)
 * ========================================================= */
(function (g) {
  'use strict';
  const CFG = g.XF_CONFIG || {};
  const DB_NAME = 'xfmr5r';
  const DB_VER = 1;

  /* ---------------- IndexedDB ---------------- */
  let _db = null;
  function openDB() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, DB_VER);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('outbox')) d.createObjectStore('outbox', { keyPath: 'cid' });
        if (!d.objectStoreNames.contains('reports')) d.createObjectStore('reports', { keyPath: 'ID_Laporan' });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function db() { return _db || (_db = await openDB()); }
  const req = (r) => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  async function st(name, mode) { const d = await db(); return d.transaction(name, mode || 'readonly').objectStore(name); }

  const kv = {
    get: async (k) => req((await st('kv')).get(k)),
    set: async (k, v) => req((await st('kv', 'readwrite')).put(v, k)),
    del: async (k) => req((await st('kv', 'readwrite')).delete(k)),
    clear: async () => req((await st('kv', 'readwrite')).clear())
  };

  const outbox = {
    all: async () => (await req((await st('outbox')).getAll())).sort((a, b) => a.createdAt - b.createdAt),
    put: async (o) => req((await st('outbox', 'readwrite')).put(o)),
    del: async (cid) => req((await st('outbox', 'readwrite')).delete(cid)),
    count: async () => req((await st('outbox')).count()),
    clear: async () => req((await st('outbox', 'readwrite')).clear())
  };

  const reports = {
    all: async () => req((await st('reports')).getAll()),
    get: async (id) => req((await st('reports')).get(id)),
    put: async (r) => req((await st('reports', 'readwrite')).put(r)),
    del: async (id) => req((await st('reports', 'readwrite')).delete(id)),
    clear: async () => req((await st('reports', 'readwrite')).clear()),
    putMany: async (arr) => {
      if (!arr || !arr.length) return;
      const d = await db();
      const t = d.transaction('reports', 'readwrite');
      const s = t.objectStore('reports');
      arr.forEach((r) => s.put(r));
      return new Promise((ok, no) => { t.oncomplete = () => ok(); t.onerror = () => no(t.error); });
    }
  };

  /* ---------------- Util ---------------- */
  function uid() {
    if (g.crypto && g.crypto.randomUUID) return g.crypto.randomUUID();
    return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function err(msg, code) { const e = new Error(msg); e.code = code; return e; }

  /* ---------------- API (Apps Script) ----------------
   * Content-Type text/plain → "simple request", tanpa preflight CORS.
   * Apps Script membalas 302 → googleusercontent, fetch mengikuti otomatis.
   */
  async function api(action, payload) {
    if (!CFG.API_URL) throw err('API_URL belum diatur di config.js', 'CONFIG');
    const token = await kv.get('token');
    let res;
    try {
      res = await fetch(CFG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action, token: token || '' }, payload || {})),
        redirect: 'follow',
        cache: 'no-store'
      });
    } catch (e) { throw err('Tidak ada koneksi', 'NETWORK'); }
    if (!res.ok) throw err('Server sibuk (' + res.status + ')', 'NETWORK');
    let j;
    try { j = await res.json(); } catch (e) { throw err('Respon server tidak valid', 'NETWORK'); }
    if (!j.ok) throw err(j.error || 'Gagal', j.code || 'SERVER');
    return j.data;
  }

  /* ---------------- Outbox ----------------
   * Semua perubahan (lapor, mulai, selesai, verifikasi, rating, jadwal…)
   * ditulis dulu ke IndexedDB → UI langsung berubah (optimistic) →
   * dikirim saat online. Setiap operasi membawa clientId (idempotent).
   */
  async function enqueue(action, payload, local) {
    const cid = uid();
    const op = { cid: cid, action: action, payload: payload || {}, createdAt: Date.now(), tries: 0 };
    await outbox.put(op);
    if (local) {
      if (typeof local.create === 'function') {
        await reports.put(Object.assign({ _local: true, _cid: cid }, local.create(cid)));
      } else if (local.id) {
        const r = await reports.get(local.id);
        if (r) await reports.put(Object.assign(r, local.patch || {}, { _dirty: true }));
      }
    }
    requestBgSync();
    return cid;
  }

  function requestBgSync() {
    try {
      if (g.navigator && g.navigator.serviceWorker && g.document) {
        g.navigator.serviceWorker.ready
          .then((reg) => reg.sync && reg.sync.register('xfmr-outbox'))
          .catch(() => {});
      }
    } catch (e) { /* abaikan */ }
  }

  let syncing = false;
  async function runSync() {
    if (syncing) return { skipped: true };
    syncing = true;
    const res = { sent: 0, failed: [], blocked: false, auth: false };
    try {
      const ops = await outbox.all();
      const idmap = (await kv.get('idmap')) || {};
      for (const op of ops) {
        const payload = Object.assign({}, op.payload, { clientId: op.cid });
        if (payload.id && idmap[payload.id]) payload.id = idmap[payload.id];
        if (payload.id && String(payload.id).indexOf('L-') === 0) continue; // induk belum terkirim
        try {
          const data = await api(op.action, payload);
          await outbox.del(op.cid);
          res.sent++;
          if (data && data.report) {
            if (op.action === 'createReport') {
              const localId = 'L-' + op.cid;
              idmap[localId] = data.report.ID_Laporan;
              await kv.set('idmap', idmap);
              await reports.del(localId);
            }
            await reports.put(data.report);
          }
          if (data && data.schedules) await kv.set('schedules', data.schedules);
          if (data && data.areas) await kv.set('areas', data.areas);
        } catch (e) {
          if (e.code === 'NETWORK' || e.code === 'CONFIG') { res.blocked = true; break; }
          if (e.code === 'AUTH') { res.auth = true; break; }
          // Error permanen (validasi/izin) → buang operasi & catat
          await outbox.del(op.cid);
          if (op.action === 'createReport') await reports.del('L-' + op.cid);
          res.failed.push({ action: op.action, error: e.message });
          const errs = (await kv.get('syncErrors')) || [];
          errs.push({ at: Date.now(), action: op.action, error: e.message });
          await kv.set('syncErrors', errs.slice(-20));
          await kv.set('lastPull', ''); // paksa tarik penuh agar data lokal kembali benar
        }
      }
    } finally {
      syncing = false;
    }
    return res;
  }

  async function sync() {
    const nav = g.navigator;
    if (nav && nav.locks && nav.locks.request) {
      // Kunci lintas-tab & Service Worker agar tidak ada kiriman ganda
      return nav.locks.request('xfmr-sync', { ifAvailable: true }, (lock) => (lock ? runSync() : { skipped: true }));
    }
    return runSync();
  }

  /* ---------------- Pull (delta) ---------------- */
  async function pull(full) {
    const since = full ? '' : ((await kv.get('lastPull')) || '');
    const notifSince = (await kv.get('lastNotif')) || '';
    const data = await api('pull', { since: since, notifSince: notifSince });
    const ops = await outbox.all();
    const pendingIds = new Set(ops.map((o) => o.payload && o.payload.id).filter(Boolean));
    const incoming = (data.reports || []).filter((r) => !pendingIds.has(r.ID_Laporan));
    if (!since) {
      const ids = new Set((data.reports || []).map((r) => r.ID_Laporan));
      const all = await reports.all();
      for (const r of all) if (!r._local && !ids.has(r.ID_Laporan) && !pendingIds.has(r.ID_Laporan)) await reports.del(r.ID_Laporan);
    }
    await reports.putMany(incoming);
    await kv.set('lastPull', data.serverTime);
    if (data.schedules) await kv.set('schedules', data.schedules);
    let notifs = data.notifications || [];
    if (!notifSince) notifs = []; // pertama kali: jangan banjiri notifikasi lama
    await kv.set('lastNotif', notifs.length ? notifs[notifs.length - 1].Timestamp : (notifSince || data.serverTime));
    return { count: incoming.length, notifications: notifs };
  }

  g.XF = { kv, outbox, reports, api, enqueue, sync, pull, uid, requestBgSync };
})(self);
