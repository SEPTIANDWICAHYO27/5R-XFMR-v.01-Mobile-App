/* =========================================================
 * 5R XFMR — Konfigurasi (dipakai oleh halaman & Service Worker)
 * Isi API_URL dengan URL Web App Google Apps Script (…/exec)
 * ========================================================= */
self.XF_CONFIG = {
  APP_NAME: '5R XFMR',
  UNIT: 'Asam Sulfat & Utilitas IIIB',

  // WAJIB: URL deployment Web App Apps Script
  API_URL: 'https://script.google.com/macros/s/AKfycbwH5THLO9hQjBWEnb_IImtB6rNW0uO0qzmlN4DT5b4fVfgZoae1XMf8bpPQQ3v0Lta-/exec',

  // OPSIONAL (Push Notification via Firebase Cloud Messaging).
  // Biarkan null bila belum dipakai → aplikasi tetap memberi notifikasi
  // lewat polling (saat aplikasi terbuka / periodic sync Android).
  FIREBASE: null,
  /* contoh:
  FIREBASE: {
    apiKey: 'AIza...',
    authDomain: 'xfmr-5r.firebaseapp.com',
    projectId: 'xfmr-5r',
    messagingSenderId: '1234567890',
    appId: '1:1234567890:web:abcdef'
  },
  */
  FIREBASE_VAPID_KEY: '',

  POLL_SECONDS: 60,          // interval tarik data saat aplikasi terbuka
  PHOTO_MAX_PX: 1280,        // sisi terpanjang foto setelah kompres
  PHOTO_QUALITY: 0.72
};
