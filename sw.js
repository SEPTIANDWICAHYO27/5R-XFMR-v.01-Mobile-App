/* =========================================================
 * 5R XFMR — Service Worker
 * - App shell cache (offline-first)
 * - Runtime cache foto (Google Drive) & font
 * - Background Sync: kirim outbox saat sinyal kembali
 * - Periodic Sync: tarik tugas baru & tampilkan notifikasi
 * - Web Push (FCM bila dikonfigurasi, atau push standar)
 * ========================================================= */
const VERSION = '5r-xfmr-v1.0.3';
const SHELL_CACHE = 'shell-' + VERSION;
const IMG_CACHE = 'img-v1';
const FONT_CACHE = 'font-v1';
const SHELL = [
  './', 'index.html', 'css/app.css', 'config.js',
  'js/core.js', 'js/camera.js', 'js/push.js', 'js/app.js',
  'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png',
  'icons/logo.png', 'icons/badge-96.png',
  'images/login-bg.jpg', 'images/login-bg-sm.jpg'
];

importScripts('config.js', 'js/core.js');

const CFG = self.XF_CONFIG || {};
const HAS_FCM = !!(CFG.FIREBASE && CFG.FIREBASE.apiKey);

if (HAS_FCM) {
  try {
    importScripts(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js'
    );
    firebase.initializeApp(CFG.FIREBASE);
    // Backend mengirim pesan data-only → kita yang menampilkan notifikasi
    firebase.messaging().onBackgroundMessage((p) => showNotif((p && p.data) || {}));
  } catch (e) { /* FCM gagal dimuat: tetap jalan tanpa push */ }
} else {
  self.addEventListener('push', (e) => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
    e.waitUntil(showNotif(d.data || d));
  });
}

/* ---------------- Lifecycle ---------------- */
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== SHELL_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'SYNC') e.waitUntil(doSync());
});

/* ---------------- Fetch strategy ---------------- */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API Apps Script: selalu jaringan (data dikelola IndexedDB)
  if (url.hostname.endsWith('script.google.com') || (url.hostname.endsWith('googleusercontent.com') && url.pathname.includes('/macros/'))) return;

  // Navigasi → app shell (SPA)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((r) => { const cp = r.clone(); caches.open(SHELL_CACHE).then((c) => c.put('index.html', cp)); return r; })
        .catch(() => caches.match('index.html', { ignoreSearch: true }))
    );
    return;
  }

  // Foto bukti (Google Drive thumbnail) → cache-first
  if (url.hostname === 'drive.google.com' || url.hostname.endsWith('googleusercontent.com')) {
    e.respondWith(cacheFirst(req, IMG_CACHE, 300));
    return;
  }

  // Font Google → cache-first
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(cacheFirst(req, FONT_CACHE, 30));
    return;
  }

  // Aset sendiri → stale-while-revalidate
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(SHELL_CACHE);
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || new Response('', { status: 504 });
    })());
  }
});

async function cacheFirst(req, name, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const r = await fetch(req);
    if (r.ok || r.type === 'opaque') {
      cache.put(req, r.clone());
      trim(cache, max);
    }
    return r;
  } catch (e) {
    return new Response('', { status: 504 });
  }
}
async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

/* ---------------- Background Sync ---------------- */
self.addEventListener('sync', (e) => {
  if (e.tag === 'xfmr-outbox') e.waitUntil(doSync());
});

async function doSync() {
  const res = await XF.sync();
  await broadcast({ type: 'synced', res: res });
  if (res && res.blocked) throw new Error('offline'); // minta browser mencoba lagi
}

/* ---------------- Periodic Sync (Android/Chrome terpasang) ---------------- */
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'xfmr-pull') {
    e.waitUntil((async () => {
      try {
        await XF.sync();
        const out = await XF.pull(false);
        for (const n of out.notifications) {
          await showNotif({ title: n.Judul, body: n.Pesan, tag: n.ID, url: n.ID_Laporan ? './#/r/' + encodeURIComponent(n.ID_Laporan) : './' });
        }
        await broadcast({ type: 'synced' });
      } catch (_) { /* offline */ }
    })());
  }
});

/* ---------------- Notifikasi ---------------- */
function showNotif(d) {
  return self.registration.showNotification(d.title || '5R XFMR', {
    body: d.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-96.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    vibrate: [200, 100, 200],
    data: { url: d.url || './' }
  });
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) {
        c.postMessage({ type: 'navigate', url: target });
        return c.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});

async function broadcast(msg) {
  const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  all.forEach((c) => c.postMessage(msg));
}
