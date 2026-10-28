/* =========================================================
 * 5R XFMR — Push Notification (Web Push via Firebase Cloud Messaging)
 * Bila FIREBASE belum diisi → mode "lokal": notifikasi tetap muncul
 * dari polling saat aplikasi terbuka / periodic background sync.
 * ========================================================= */
(function (g) {
  'use strict';
  const C = g.XF_CONFIG || {};
  const HAS_FCM = !!(C.FIREBASE && C.FIREBASE.apiKey);
  const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';

  function loadScript(src) {
    return new Promise((ok, no) => {
      if (document.querySelector('script[src="' + src + '"]')) return ok();
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => no(new Error('Gagal memuat ' + src));
      document.head.appendChild(s);
    });
  }

  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = () => g.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function status() {
    if (!('Notification' in g) || !('serviceWorker' in navigator)) return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported';
    return Notification.permission; // default | granted | denied
  }

  /** Harus dipanggil dari tap tombol (wajib di iOS) */
  async function enable() {
    if (status() === 'ios-install') throw new Error('Di iPhone: pasang dulu ke Layar Utama (Bagikan → Tambah ke Layar Utama), lalu buka dari ikon.');
    if (status() === 'unsupported') throw new Error('Browser ini tidak mendukung notifikasi');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Izin notifikasi ditolak. Aktifkan lewat pengaturan browser.');
    const reg = await navigator.serviceWorker.ready;

    // Periodic background sync (Chrome Android, aplikasi terpasang)
    try {
      if (reg.periodicSync) {
        const p = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (p.state === 'granted') await reg.periodicSync.register('xfmr-pull', { minInterval: 15 * 60 * 1000 });
      }
    } catch (_) { /* tidak didukung */ }

    if (!HAS_FCM) return subscribeWebPush(reg);
    await loadScript(FB + 'firebase-app-compat.js');
    await loadScript(FB + 'firebase-messaging-compat.js');
    if (!g.firebase.apps.length) g.firebase.initializeApp(C.FIREBASE);
    const m = g.firebase.messaging();
    const token = await m.getToken({ vapidKey: C.FIREBASE_VAPID_KEY, serviceWorkerRegistration: reg });
    if (token) {
      const old = await XF.kv.get('pushToken');
      if (old !== token) {
        await XF.kv.set('pushToken', token);
        await XF.enqueue('savePushToken', { pushToken: token, platform: (isIOS() ? 'iOS ' : '') + navigator.userAgent.slice(0, 100) });
        XF.sync();
      }
    }
    // Pesan saat aplikasi sedang dibuka (foreground)
    m.onMessage((p) => g.dispatchEvent(new CustomEvent('xf-push', { detail: (p && p.data) || {} })));
    return 'fcm';
  }

  /* Web Push standar (VAPID) — kunci publik dari server (bootstrap) */
  function keyBytes(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }
  async function subscribeWebPush(reg) {
    if (!reg.pushManager) return 'local';
    const key = await XF.kv.get('vapid');
    if (!key) return 'local'; // server lama tanpa VAPID → tetap mode lokal
    let sub = await reg.pushManager.getSubscription();
    const savedKey = await XF.kv.get('vapidUsed');
    if (sub && savedKey && savedKey !== key) { await sub.unsubscribe(); sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
    await XF.kv.set('vapidUsed', key);
    const ep = sub.endpoint;
    if ((await XF.kv.get('pushToken')) !== ep) {
      await XF.kv.set('pushToken', ep);
      await XF.enqueue('savePushToken', { pushToken: ep, platform: (isIOS() ? 'iOS ' : '') + navigator.userAgent.slice(0, 100) });
      XF.sync();
    }
    return 'webpush';
  }

  async function initIfGranted() {
    if (status() === 'granted') { try { return await enable(); } catch (_) { /* abaikan */ } }
    return null;
  }

  g.XFPush = { enable, initIfGranted, status, isIOS, isStandalone, fcm: HAS_FCM };
})(window);
