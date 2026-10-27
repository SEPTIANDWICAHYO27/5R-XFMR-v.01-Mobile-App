/**
 * =========================================================
 *  5R XFMR — Backend Google Apps Script (Web App + Google Sheets)
 *  Asam Sulfat & Utilitas IIIB
 * ---------------------------------------------------------
 *  Cara pasang:
 *   1. Buka spreadsheet "dB_ 5R XFMR 2026" → Extensions → Apps Script.
 *   2. Hapus isi Code.gs lama, tempel file ini, Save.
 *   3. Pilih fungsi setup → Run → izinkan akses. Baca Execution log:
 *      semua baris harus ✓. Baris ✗ menjelaskan apa yang harus diperbaiki.
 *   4. (Opsional) Run tesLogin untuk menguji login dari editor.
 *   5. Deploy → Manage deployments → ✏️ Edit → Version: New version,
 *      Execute as: Me, Who has access: Anyone → Deploy.
 *   6. Cek di browser (Incognito): URL/exec?cek=1  → harus tampil {"ok":true,...}
 * =========================================================
 */

const APP_VERSION = '1.1.0';
const TZ = 'Asia/Jakarta';
const SH = {
  USERS: 'USER',
  AREAS: 'Areas',
  REPORTS: 'Reports',
  SCHEDULES: 'Schedules',
  PUSH: 'PushTokens',
  NOTIF: 'Notifications',
  LOG: 'Log'
};
const STATUS = { P: 'Pending', IP: 'In Progress', R: 'Resolved', V: 'Verified' };
const APPROVER_ROLES = ['ADMIN', 'AVP', 'JAVP', 'SUPERVISOR'];
const TOKEN_DAYS = 30;

const HEAD = {
  USERS_EXTRA: ['Email_NoHP', 'Token', 'Token_Exp', 'Poin', 'Last_Login'],
  AREAS: ['ID_Area', 'Nama_Area', 'Latitude', 'Longitude', 'QR_Code_ID', 'Radius_M', 'Koordinator', 'Sheet_Name', 'Titik', 'QR_Image'],
  REPORTS: ['ID_Laporan', 'Client_ID', 'ID_Pelapor', 'Nama_Pelapor', 'ID_Area', 'Nama_Area', 'Titik', 'Kategori', 'Deskripsi',
    'Prioritas', 'Deadline', 'Foto_Before_URL', 'Foto_After_URL', 'Latitude', 'Longitude', 'Maps_URL', 'Status',
    'ID_Petugas', 'Nama_Petugas', 'Timestamp', 'Started_At', 'Resolved_At', 'Verified_At', 'ID_Verifikator',
    'Catatan', 'Rating', 'Feedback', 'Response', 'Poin', 'Poin_Pelapor', 'Sumber', 'Updated_At'],
  SCHEDULES: ['ID_Jadwal', 'ID_Area', 'Titik', 'Kategori', 'Deskripsi', 'Hari', 'Jam', 'ID_Petugas', 'Aktif', 'Dibuat_Oleh', 'Last_Run'],
  PUSH: ['ID_User', 'Token', 'Platform', 'Updated_At'],
  NOTIF: ['ID', 'ID_User', 'Judul', 'Pesan', 'ID_Laporan', 'Timestamp'],
  LOG: ['Timestamp', 'User', 'Action', 'Detail']
};

/* Area default — diambil dari dokumen Profil Gugus 5R XFMR */
const DEFAULT_AREAS = [
  ['A1', 'CCR SASU3B', '', '', '5RXFMR-A1', 60, 'Taufiqur Rahman', 'AREA 1 (CCR SASU3B)',
    'SASU 3B Learning Hub;Rak sepatu & APD tamu;Meja pelaporan;Meja panel;AC;Lemari pendukung;Kabinet APD;Meja rapat;Kotak kunci & P3K;Pintu masuk/keluar tamu;Pintu marshaling room SA;Pintu marshaling room SU;Pintu masuk/keluar SU;Pintu masuk/keluar SA;Dispenser air minum;APAR'],
  ['A2', 'Barak Dapur', '', '', '5RXFMR-A2', 60, 'Ahmad Afandi', 'AREA 2 (BARAK DAPUR)',
    'Pintu masuk;Lorong hall of fame;Lorong arah CCR;Fire extinguisher;Loker operator;Musala & lemari musala;Meja transit operator;Meja makan & air minum;Lemari serbaguna;Kulkas & kotak P3K;Dapur;Kabinet APD & APAR;Area cuci jemur & wudhu;Area gantungan basah;Kamar mandi 1;Kamar mandi 2;Rak sepatu & APD operator;Gantungan PDL & PDH operator;Meja pingpong'],
  ['A3', 'Barak GF', '', '', '5RXFMR-A3', 60, 'Purnawan', 'AREA 3 (BARAK GF)',
    'Musala;Dispenser air minum;Kabinet APD & APAR;Kotak P3K;Meja operator;Akuarium;Kursi istirahat;Loker operator;Lemari peralatan kerja;Kulkas;Dapur;Area sanitasi;Area jemur;Kamar mandi']
];

/* =========================================================
 *  ENTRY POINTS
 * ========================================================= */
function doGet(e) {
  const out = { app: '5R XFMR', version: APP_VERSION, time: new Date().toISOString() };
  if (e && e.parameter && e.parameter.cek) out.cek = cekSistem_();
  return json({ ok: true, data: out });
}

/** Pemeriksaan sistem (tanpa data pribadi). Buka: URL/exec?cek=1 */
function cekSistem_() {
  const r = {};
  try { const d = dbSS_(); r.dB = '✓ ' + d.getName(); r.tab_dB = d.getSheets().map(function (s) { return s.getName(); }); } catch (e) { r.dB = '✗ ' + e.message; }
  try {
    const u = usersSS_(); const sh = findSheet_(u, SH.USERS);
    r.USER = sh ? '✓ ' + u.getName() + ' / tab ' + sh.getName() : '✗ tab USER tidak ditemukan di ' + u.getName();
    if (sh) {
      const t = table_(u, SH.USERS);
      r.jumlah_user = t.rows.filter(function (x) { return x[t.i.NIK]; }).length;
      r.kolom_wajib = ['NIK', 'Kata Sandi', 'Nama', 'Role'].map(function (k) { return k + (t.i[k] != null ? ' ✓' : ' ✗ HILANG'); });
      r.kolom_setup = HEAD.USERS_EXTRA.map(function (k) { return k + (t.i[k] != null ? ' ✓' : ' ✗ jalankan setup()'); });
    }
  } catch (e) { r.USER = '✗ ' + e.message; }
  try {
    const d = dbSS_();
    r.tab_aplikasi = [SH.AREAS, SH.REPORTS, SH.SCHEDULES, SH.PUSH, SH.NOTIF, SH.LOG].map(function (n) { return n + (d.getSheetByName(n) ? ' ✓' : ' ✗ jalankan setup()'); });
  } catch (e) { }
  try { r.trigger = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }); } catch (e) { r.trigger = '✗ ' + e.message; }
  r.push_fcm = PropertiesService.getScriptProperties().getProperty('FCM_PROJECT_ID') ? '✓' : '— (opsional, belum diatur)';
  return r;
}

/** Jalankan dari editor untuk melihat hasil pemeriksaan di Execution log */
function cekSistem() { Logger.log(JSON.stringify(cekSistem_(), null, 2)); }

function doPost(e) {
  let p;
  try { p = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json({ ok: false, error: 'Format data salah' }); }
  const action = p.action;
  try {
    if (action === 'login') return json({ ok: true, data: login_(p) });
    const user = auth_(p.token);
    if (!user) return json({ ok: false, code: 'AUTH', error: 'Sesi berakhir, silakan login ulang' });
    const fn = ACTIONS[action];
    if (!fn) return json({ ok: false, error: 'Aksi tidak dikenal: ' + action });
    const needsLock = WRITE_ACTIONS.indexOf(action) >= 0;
    const lock = LockService.getScriptLock();
    if (needsLock) lock.waitLock(25000);
    try {
      return json({ ok: true, data: fn(p, user) });
    } finally {
      if (needsLock) { SpreadsheetApp.flush(); lock.releaseLock(); }
    }
  } catch (err) {
    log_('ERR', action, String(err && err.stack || err));
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

const ACTIONS = {
  bootstrap: bootstrap_,
  pull: pull_,
  logout: logout_,
  createReport: createReport_,
  assign: assign_,
  start: start_,
  resolve: resolve_,
  verify: verify_,
  reject: reject_,
  rate: rate_,
  saveSchedule: saveSchedule_,
  deleteSchedule: deleteSchedule_,
  runSchedules: function (p, u) { mustApprover_(u); return { created: generateScheduledTasks() }; },
  setAreaCoord: setAreaCoord_,
  savePushToken: savePushToken_
};
const WRITE_ACTIONS = ['createReport', 'assign', 'start', 'resolve', 'verify', 'reject', 'rate', 'saveSchedule',
  'deleteSchedule', 'setAreaCoord', 'savePushToken', 'logout', 'runSchedules'];

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* =========================================================
 *  SETUP (jalankan sekali dari editor)
 * ========================================================= */
function setup() {
  const L = function (m) { Logger.log(m); };
  const step = function (name, fn) {
    try { const r = fn(); L('✓ ' + name + (r ? ' — ' + r : '')); return true; }
    catch (e) { L('✗ ' + name + ' GAGAL: ' + e.message); return false; }
  };
  let ss, us;
  if (!step('Buka spreadsheet dB', function () { ss = dbSS_(); return ss.getName(); })) return L('STOP: periksa DEFAULT_DB_SS_ID / akses akun ke spreadsheet dB.');

  step('Buat/periksa tab aplikasi', function () {
    [[SH.AREAS, HEAD.AREAS], [SH.REPORTS, HEAD.REPORTS], [SH.SCHEDULES, HEAD.SCHEDULES], [SH.PUSH, HEAD.PUSH], [SH.NOTIF, HEAD.NOTIF], [SH.LOG, HEAD.LOG]]
      .forEach(function (x) { ensureSheet_(ss, x[0], x[1]); });
    return 'Areas, Reports, Schedules, PushTokens, Notifications, Log';
  });

  step('Isi data Area default', function () {
    const a = ss.getSheetByName(SH.AREAS);
    if (a.getLastRow() >= 2) return 'sudah ada (' + (a.getLastRow() - 1) + ' area)';
    a.getRange(2, 1, DEFAULT_AREAS.length, 9).setValues(DEFAULT_AREAS);
    for (let i = 0; i < DEFAULT_AREAS.length; i++) {
      a.getRange(i + 2, 10).setFormula('=IMAGE("https://quickchart.io/qr?size=300&text="&ENCODEURL(E' + (i + 2) + '))');
    }
    return DEFAULT_AREAS.length + ' area';
  });

  if (!step('Temukan tab USER', function () {
    us = findSheet_(usersSS_(), SH.USERS);
    if (!us) throw new Error('tab USER tidak ditemukan. Periksa DEFAULT_USERS_SS_ID & akses akun ke spreadsheet User_Roles.');
    return usersSS_().getName() + ' / tab "' + us.getName() + '"';
  })) return L('STOP: perbaiki akses tab USER lalu jalankan setup() lagi.');

  step('Periksa kolom USER', function () {
    const t = table_(usersSS_(), SH.USERS);
    const miss = ['NIK', 'Kata Sandi', 'Nama', 'Role'].filter(function (k) { return t.i[k] == null; });
    if (miss.length) throw new Error('kolom wajib tidak ada: ' + miss.join(', ') + ' (judul kolom ditemukan: ' + t.head.join(' | ') + ')');
    const hdrRow = t.hr + 1;
    const added = [];
    HEAD.USERS_EXTRA.forEach(function (h) {
      if (t.i[h] == null) { us.getRange(hdrRow, us.getLastColumn() + 1).setValue(h); added.push(h); }
    });
    us.getRange(hdrRow + 1, t.i.NIK + 1, Math.max(1, us.getMaxRows() - hdrRow), 1).setNumberFormat('@');
    const n = t.rows.filter(function (r) { return r[t.i.NIK]; }).length;
    return n + ' user' + (added.length ? ', kolom ditambah: ' + added.join(', ') : '');
  });

  step('Cek NIK ganda', function () {
    const dup = checkDuplicateNIK_();
    if (dup.length) throw new Error('NIK ganda: ' + dup.join('; '));
    return 'semua unik';
  });

  step('Folder foto Google Drive', function () { return photoFolder_().getName(); });

  step('Trigger otomatis (jadwal 05.30 & per jam)', function () {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (['generateScheduledTasks', 'hourlyJob'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('generateScheduledTasks').timeBased().atHour(5).nearMinute(30).everyDays(1).inTimezone(TZ).create();
    ScriptApp.newTrigger('hourlyJob').timeBased().everyHours(1).create();
    return '2 trigger';
  });

  step('Tab area dB', function () { return ss.getSheets().map(function (x) { return x.getName(); }).join(', '); });
  L('==== Setup selesai. Lanjut: Deploy → Manage deployments → Edit → New version → Who has access: Anyone → Deploy ====');
}

/** Uji login dari editor tanpa aplikasi: ganti NIK & sandi lalu Run */
function tesLogin() {
  try { const r = login_({ nik: '2146103', password: 'admin123' }); Logger.log('✓ Login OK: ' + r.user.nama + ' (' + r.user.roleKey + ')'); }
  catch (e) { Logger.log('✗ Login gagal: ' + e.message); }
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#1B2A5B').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  } else {
    const cur = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    headers.forEach(function (h) { if (cur.indexOf(h) < 0) { sh.getRange(1, sh.getLastColumn() + 1).setValue(h); cur.push(h); } });
  }
  return sh;
}

function checkDuplicateNIK_() {
  const t = table_(usersSS_(), SH.USERS);
  const seen = {}, dup = [];
  t.rows.forEach(function (r) {
    if (!r[t.i.NIK]) return;
    const nik = String(r[t.i.NIK]).replace(/\.0$/, '');
    if (seen[nik]) dup.push(nik + ': ' + seen[nik] + ' / ' + r[t.i.Nama]); else seen[nik] = r[t.i.Nama];
  });
  return dup;
}

/* =========================================================
 *  SPREADSHEET HELPERS
 * ========================================================= */
/* ID Google Sheets milik gugus (bisa ditimpa lewat Script Properties) */
const DEFAULT_DB_SS_ID = '1B_Wq55FLmX7P6zOcpyd9SmaNQrI96Q9-H7JSUyez0_g';    // dB_ 5R XFMR 2026
const DEFAULT_USERS_SS_ID = '1F1LluUX5yJP6_da1GNHFWmsgqYhVefmsj8hyhiX3gyM'; // User_Roles 5R XFMR 2026

let _dbSS = null, _usersSS = null;
function dbSS_() {
  if (_dbSS) return _dbSS;
  const id = PropertiesService.getScriptProperties().getProperty('DB_SS_ID') || DEFAULT_DB_SS_ID;
  return (_dbSS = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet());
}
/** Spreadsheet berisi tab USER: file User_Roles, atau dB bila tab USER dipindah ke sana */
function usersSS_() {
  if (_usersSS) return _usersSS;
  const id = PropertiesService.getScriptProperties().getProperty('USERS_SS_ID') || DEFAULT_USERS_SS_ID;
  const cands = [id ? SpreadsheetApp.openById(id) : null, dbSS_()].filter(Boolean);
  for (let i = 0; i < cands.length; i++) if (findSheet_(cands[i], SH.USERS)) return (_usersSS = cands[i]);
  return (_usersSS = cands[0]);
}
/** Cari tab tanpa peduli huruf besar/kecil & spasi ("USER" = "User", "AREA 1 (CCR SASU3B)" = "Area 1 (CCR SASU3B)") */
function findSheet_(ss, name) {
  const exact = ss.getSheetByName(name);
  if (exact) return exact;
  const norm = function (s) { return String(s).toUpperCase().replace(/\s+/g, ''); };
  const want = norm(name);
  const all = ss.getSheets();
  for (let i = 0; i < all.length; i++) if (norm(all[i].getName()) === want) return all[i];
  // tab user hanya satu di file User_Roles → pakai tab pertama yang punya kolom NIK
  if (name === SH.USERS) {
    for (let i = 0; i < all.length; i++) {
      const h = all[i].getRange(1, 1, 1, Math.max(1, all[i].getLastColumn())).getValues()[0].map(String);
      if (h.indexOf('NIK') >= 0 && h.indexOf('Role') >= 0) return all[i];
    }
  }
  return null;
}

/** Baca sheet → {sh, head, i (index per header), rows} */
function table_(ss, name) {
  const sh = findSheet_(ss, name);
  if (!sh) throw new Error('Sheet ' + name + ' tidak ada. Jalankan setup().');
  const data = sh.getDataRange().getValues();
  // Baris judul tidak selalu di baris 1 (mis. ada judul di atasnya) → cari di 5 baris pertama
  let hr = 0;
  const KEYS = ['NIK', 'ID_Laporan', 'ID_Area', 'ID_Jadwal', 'ID_User', 'ID', 'Timestamp'];
  for (let r = 0; r < Math.min(5, data.length); r++) {
    const cells = data[r].map(function (h) { return String(h).trim(); });
    if (KEYS.some(function (k) { return cells.indexOf(k) >= 0; })) { hr = r; break; }
  }
  const head = (data[hr] || []).map(function (h) { return String(h).trim(); });
  const i = {};
  head.forEach(function (h, k) { if (h && i[h] == null) i[h] = k; });
  // Alias nama kolom (huruf besar/kecil & sebutan lain)
  const ALIAS = { 'Kata Sandi': ['Password', 'Kata sandi', 'KATA SANDI', 'Sandi', 'Token Login'], 'Nama': ['Nama Lengkap', 'NAMA', 'Name'], 'Role': ['ROLE', 'Jabatan', 'Peran'], 'NIK': ['Nik', 'No NIK', 'NO. NIK'] };
  Object.keys(ALIAS).forEach(function (k) {
    if (i[k] != null) return;
    ALIAS[k].forEach(function (a) { if (i[k] == null && i[a] != null) i[k] = i[a]; });
  });
  const rows = data.slice(hr + 1);
  return { sh: sh, head: head, i: i, hr: hr, rows: rows };
}
function rowToObj_(t, row) {
  const o = {};
  t.head.forEach(function (h, k) {
    if (!h) return;
    let v = iso_(row[k]);
    // NIK/ID yang tersimpan sebagai angka oleh Sheets → kembalikan ke teks
    if (h.indexOf('ID_') === 0 && typeof v === 'number') v = nikStr_(v);
    o[h] = v;
  });
  return o;
}
function iso_(v) { return v instanceof Date ? v.toISOString() : v; }
function findIdx_(t, col, val) {
  const c = t.i[col];
  for (let k = 0; k < t.rows.length; k++) if (String(t.rows[k][c]) === String(val)) return k;
  return -1;
}
/** Tulis perubahan ke satu baris (k = index data, 0-based) */
function writeRow_(t, k, patch) {
  const row = t.rows[k];
  const sheetRow = k + (t.hr || 0) + 2;
  Object.keys(patch).forEach(function (key) {
    const c = t.i[key];
    if (c == null) return;
    row[c] = patch[key];
    t.sh.getRange(sheetRow, c + 1).setValue(patch[key] === undefined ? '' : patch[key]);
  });
  return row;
}
function appendObj_(t, obj) {
  const row = t.head.map(function (h) { return obj[h] != null ? obj[h] : ''; });
  t.sh.appendRow(row);
  t.rows.push(row);
  return row;
}
function log_(user, action, detail) {
  try { dbSS_().getSheetByName(SH.LOG).appendRow([new Date(), user, action, String(detail).slice(0, 2000)]); } catch (e) { }
}

/* =========================================================
 *  AUTH
 * ========================================================= */
function roleKey_(r) {
  r = String(r || '').toUpperCase();
  if (r.indexOf('TKNO') >= 0) return 'TKNO';
  if (r.indexOf('TKO') >= 0) return 'TKO';
  if (r.indexOf('JAVP') >= 0) return 'JAVP';
  if (r.indexOf('AVP') >= 0) return 'AVP';
  if (r.indexOf('SUPERVISOR') >= 0) return 'SUPERVISOR';
  if (r.indexOf('ADMIN') >= 0) return 'ADMIN';
  return 'TKO';
}
function nikStr_(v) { return String(v).replace(/\.0$/, '').trim(); }
function publicUser_(t, r) {
  return { id: nikStr_(r[t.i.NIK]), nik: nikStr_(r[t.i.NIK]), nama: String(r[t.i.Nama]).trim(), role: String(r[t.i.Role]), roleKey: roleKey_(r[t.i.Role]), avatar: r[t.i.Avatar] || '' };
}
function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
/** Password boleh plaintext (seperti sheet saat ini) atau "sha256:<hash>". */
function checkPw_(stored, input) {
  stored = String(stored);
  if (stored.indexOf('sha256:') === 0) return stored.slice(7) === sha256_(input);
  return stored === String(input);
}

function login_(p) {
  const nik = nikStr_(p.nik || ''), pw = String(p.password || '');
  if (!nik || !pw) throw new Error('NIK & kata sandi wajib diisi');
  const t = table_(usersSS_(), SH.USERS);
  for (let k = 0; k < t.rows.length; k++) {
    const r = t.rows[k];
    if (nikStr_(r[t.i.NIK]) !== nik || !checkPw_(r[t.i['Kata Sandi']], pw)) continue;
    let token = r[t.i.Token], exp = r[t.i.Token_Exp];
    if (!token || !(exp instanceof Date) || exp < new Date()) {
      token = Utilities.getUuid() + Utilities.getUuid().slice(0, 8);
      exp = new Date(Date.now() + TOKEN_DAYS * 864e5);
    }
    const patch = { Token: token, Token_Exp: exp, Last_Login: new Date() };
    if (PropertiesService.getScriptProperties().getProperty('HASH_PASSWORDS') === 'true' && String(r[t.i['Kata Sandi']]).indexOf('sha256:') !== 0) {
      patch['Kata Sandi'] = 'sha256:' + sha256_(pw);
    }
    writeRow_(t, k, patch);
    const user = publicUser_(t, r);
    CacheService.getScriptCache().put('tok_' + token, JSON.stringify(user), 21600);
    log_(user.nama, 'login', '');
    return { token: token, user: user };
  }
  Utilities.sleep(600); // perlambat tebak-tebakan password
  throw new Error('NIK atau kata sandi salah');
}

function auth_(token) {
  if (!token) return null;
  const c = CacheService.getScriptCache();
  const hit = c.get('tok_' + token);
  if (hit) return JSON.parse(hit);
  const t = table_(usersSS_(), SH.USERS);
  const k = findIdx_(t, 'Token', token);
  if (k < 0) return null;
  const exp = t.rows[k][t.i.Token_Exp];
  if (exp instanceof Date && exp < new Date()) return null;
  const user = publicUser_(t, t.rows[k]);
  c.put('tok_' + token, JSON.stringify(user), 21600);
  return user;
}

function logout_(p, u) {
  const t = table_(usersSS_(), SH.USERS);
  const k = findIdx_(t, 'Token', p.token);
  if (k >= 0) writeRow_(t, k, { Token: '', Token_Exp: '' });
  CacheService.getScriptCache().remove('tok_' + p.token);
  // hapus push token user ini
  const pt = table_(dbSS_(), SH.PUSH);
  for (let i = pt.rows.length - 1; i >= 0; i--) if (String(pt.rows[i][pt.i.ID_User]) === u.id) pt.sh.deleteRow(i + 2);
  return { ok: true };
}

function isApprover_(u) { return APPROVER_ROLES.indexOf(u.roleKey) >= 0; }
function mustApprover_(u) { if (!isApprover_(u)) throw new Error('Hanya Approver (Admin/AVP/JAVP/Supervisor)'); }

/* =========================================================
 *  READ
 * ========================================================= */
function usersList_() {
  const t = table_(usersSS_(), SH.USERS);
  const seen = {};
  return t.rows.filter(function (r) { return r[t.i.NIK] && r[t.i.Nama]; })
    .map(function (r) { return publicUser_(t, r); })
    .filter(function (u) { if (seen[u.id]) return false; seen[u.id] = 1; return true; });
}
function areasList_() {
  const t = table_(dbSS_(), SH.AREAS);
  return t.rows.filter(function (r) { return r[t.i.ID_Area]; }).map(function (r) {
    const o = rowToObj_(t, r); delete o.QR_Image; return o;
  });
}
function schedulesList_() {
  const t = table_(dbSS_(), SH.SCHEDULES);
  return t.rows.filter(function (r) { return r[t.i.ID_Jadwal]; }).map(function (r) { return rowToObj_(t, r); });
}

function bootstrap_(p, u) {
  return { user: u, users: usersList_(), areas: areasList_(), schedules: schedulesList_(), serverTime: new Date().toISOString() };
}

/** Delta sync: laporan yang berubah sejak `since` + notifikasi untuk user */
function pull_(p, u) {
  const now = new Date();
  const since = p.since ? new Date(p.since) : null;
  const t = table_(dbSS_(), SH.REPORTS);
  const iu = t.i.Updated_At;
  const reports = [];
  t.rows.forEach(function (r) {
    if (!r[t.i.ID_Laporan]) return;
    if (since && r[iu] instanceof Date && r[iu] <= since) return;
    reports.push(rowToObj_(t, r));
  });
  let notifications = [];
  if (p.notifSince) {
    const ns = new Date(p.notifSince);
    const n = table_(dbSS_(), SH.NOTIF);
    notifications = n.rows.filter(function (r) {
      return String(r[n.i.ID_User]) === u.id && r[n.i.Timestamp] instanceof Date && r[n.i.Timestamp] > ns;
    }).map(function (r) { return rowToObj_(n, r); });
  }
  return { reports: reports, notifications: notifications, schedules: schedulesList_(), serverTime: now.toISOString() };
}

/* =========================================================
 *  WRITE: LAPORAN / TUGAS
 * ========================================================= */
function newReportId_(t, areaId) {
  const prefix = '5R-' + areaId + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMdd') + '-';
  let max = 0;
  t.rows.forEach(function (r) {
    const id = String(r[t.i.ID_Laporan]);
    if (id.indexOf(prefix) === 0) max = Math.max(max, parseInt(id.slice(prefix.length), 10) || 0);
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

function createReport_(p, u) {
  const t = table_(dbSS_(), SH.REPORTS);
  // Idempotent: kiriman ulang dari outbox tidak membuat duplikat
  if (p.clientId) {
    const k0 = findIdx_(t, 'Client_ID', p.clientId);
    if (k0 >= 0) return { report: rowToObj_(t, t.rows[k0]) };
  }
  if (!p.areaId) throw new Error('Area wajib dipilih');
  if (!p.fotoBefore) throw new Error('Foto SEBELUM wajib');
  const areas = areasList_();
  const area = areas.filter(function (a) { return a.ID_Area === p.areaId; })[0];
  if (!area) throw new Error('Area tidak dikenal');
  const id = newReportId_(t, p.areaId);
  const fotoBefore = savePhoto_(p.fotoBefore, id + '_before');
  let petugas = null;
  if (p.petugasId) {
    if (!(u.roleKey === 'TKO' || isApprover_(u))) throw new Error('Hanya TKO/Approver yang dapat menugaskan');
    petugas = usersList_().filter(function (x) { return x.id === String(p.petugasId); })[0];
  }
  const now = new Date();
  const lat = p.lat || area.Latitude, lng = p.lng || area.Longitude;
  const obj = {
    ID_Laporan: id, Client_ID: p.clientId || '', ID_Pelapor: u.id, Nama_Pelapor: u.nama,
    ID_Area: area.ID_Area, Nama_Area: area.Nama_Area, Titik: p.titik || '', Kategori: p.kategori || 'Lainnya',
    Deskripsi: p.deskripsi || '', Prioritas: p.prioritas || 'Normal', Deadline: p.deadline ? new Date(p.deadline) : '',
    Foto_Before_URL: fotoBefore, Foto_After_URL: '', Latitude: lat, Longitude: lng,
    Maps_URL: lat && lng ? 'https://maps.google.com/?q=' + lat + ',' + lng : '',
    Status: STATUS.P, ID_Petugas: petugas ? petugas.id : '', Nama_Petugas: petugas ? petugas.nama : '',
    Timestamp: now, Sumber: p.sumber || 'LAPORAN', Updated_At: now
  };
  appendObj_(t, obj);
  mirrorToAreaSheet_(obj, area);
  log_(u.nama, 'createReport', id);

  const title = (obj.Prioritas === 'Darurat' ? '🚨 ' : '🧹 ') + 'Tugas baru: ' + area.Nama_Area;
  const body = obj.Kategori + (obj.Titik ? ' — ' + obj.Titik : '') + (obj.Deskripsi ? ': ' + obj.Deskripsi : '');
  if (petugas) notify_([petugas.id], title, body, id);
  else notify_(usersList_().filter(function (x) { return x.roleKey === 'TKNO'; }).map(function (x) { return x.id; }), title, body, id);
  return { report: rowToObj_(t, t.rows[t.rows.length - 1]) };
}

function getReport_(id) {
  const t = table_(dbSS_(), SH.REPORTS);
  const k = findIdx_(t, 'ID_Laporan', id);
  if (k < 0) throw new Error('Laporan ' + id + ' tidak ditemukan');
  return { t: t, k: k, r: rowToObj_(t, t.rows[k]) };
}
function update_(g, patch) {
  patch.Updated_At = new Date();
  const row = writeRow_(g.t, g.k, patch);
  const obj = rowToObj_(g.t, row);
  mirrorToAreaSheet_(obj);
  return obj;
}

function assign_(p, u) {
  const g = getReport_(p.id);
  if (!(isApprover_(u) || (u.roleKey === 'TKO' && g.r.ID_Pelapor === u.id))) throw new Error('Tidak berhak mengatur petugas');
  if ([STATUS.R, STATUS.V].indexOf(g.r.Status) >= 0) throw new Error('Tugas sudah selesai');
  const pt = usersList_().filter(function (x) { return x.id === String(p.petugasId); })[0];
  if (!pt) throw new Error('Petugas tidak ditemukan');
  const rep = update_(g, { ID_Petugas: pt.id, Nama_Petugas: pt.nama, Prioritas: p.prioritas || g.r.Prioritas, Deadline: p.deadline ? new Date(p.deadline) : g.t.rows[g.k][g.t.i.Deadline] });
  notify_([pt.id], '🧹 Tugas untuk Anda: ' + rep.Nama_Area, rep.Kategori + (rep.Titik ? ' — ' + rep.Titik : ''), rep.ID_Laporan);
  log_(u.nama, 'assign', p.id + ' → ' + pt.nama);
  return { report: rep };
}

function start_(p, u) {
  const g = getReport_(p.id);
  if (g.r.Status !== STATUS.P) {
    if (g.r.Status === STATUS.IP && g.r.ID_Petugas === u.id) return { report: g.r }; // kiriman ulang
    throw new Error('Tugas sudah ' + g.r.Status);
  }
  if (g.r.ID_Petugas && g.r.ID_Petugas !== u.id) throw new Error('Tugas ini milik ' + g.r.Nama_Petugas);
  if (!g.r.ID_Petugas && ['TKNO', 'TKO'].indexOf(u.roleKey) < 0) throw new Error('Hanya petugas yang dapat mengambil tugas');
  const patch = { Status: STATUS.IP, Started_At: new Date(), ID_Petugas: u.id, Nama_Petugas: u.nama };
  if (!g.r.Foto_Before_URL) {
    if (!p.fotoBefore) throw new Error('Foto SEBELUM wajib');
    patch.Foto_Before_URL = savePhoto_(p.fotoBefore, p.id + '_before');
  }
  const rep = update_(g, patch);
  if (rep.ID_Pelapor && rep.ID_Pelapor !== u.id) notify_([rep.ID_Pelapor], '▶️ Sedang dikerjakan', u.nama + ' mulai membersihkan ' + rep.Nama_Area, rep.ID_Laporan);
  log_(u.nama, 'start', p.id);
  return { report: rep };
}

function resolve_(p, u) {
  const g = getReport_(p.id);
  if ([STATUS.R, STATUS.V].indexOf(g.r.Status) >= 0) return { report: g.r }; // idempotent
  if (g.r.Status !== STATUS.IP) throw new Error('Tugas belum dimulai');
  if (g.r.ID_Petugas !== u.id) throw new Error('Tugas ini milik ' + g.r.Nama_Petugas);
  if (!p.fotoAfter) throw new Error('Foto SESUDAH wajib');
  if (!g.r.Foto_Before_URL) throw new Error('Foto SEBELUM belum ada');
  const rep = update_(g, { Status: STATUS.R, Resolved_At: new Date(), Foto_After_URL: savePhoto_(p.fotoAfter, p.id + '_after'), Catatan: '' });
  const dur = minutes_(rep.Started_At || rep.Timestamp, rep.Resolved_At);
  if (rep.ID_Pelapor && rep.ID_Pelapor !== u.id) notify_([rep.ID_Pelapor], '✅ Tugas selesai: ' + rep.Nama_Area, 'Dikerjakan ' + u.nama + ' (' + Math.round(dur) + ' mnt). Ketuk untuk beri rating ⭐', rep.ID_Laporan);
  notify_(usersList_().filter(isApprover_).map(function (x) { return x.id; }), '🔎 Perlu verifikasi', rep.ID_Laporan + ' — ' + rep.Nama_Area, rep.ID_Laporan);
  log_(u.nama, 'resolve', p.id);
  return { report: rep };
}

function verify_(p, u) {
  mustApprover_(u);
  const g = getReport_(p.id);
  if (g.r.Status === STATUS.V) return { report: g.r };
  if (g.r.Status !== STATUS.R) throw new Error('Tugas belum selesai dikerjakan');
  const patch = { Status: STATUS.V, Verified_At: new Date(), ID_Verifikator: u.id };
  if (p.response) patch.Response = p.response;
  Object.assign(patch, calcPoints_(Object.assign({}, g.r, patch)));
  const rep = update_(g, patch);
  addUserPoints_();
  notify_([rep.ID_Petugas], '🏆 Diverifikasi! +' + rep.Poin + ' poin', rep.Nama_Area + ' — ' + rep.Kategori, rep.ID_Laporan);
  log_(u.nama, 'verify', p.id);
  return { report: rep };
}

function reject_(p, u) {
  mustApprover_(u);
  const g = getReport_(p.id);
  if (g.r.Status !== STATUS.R) throw new Error('Hanya tugas berstatus Resolved yang dapat ditolak');
  if (!p.note) throw new Error('Alasan penolakan wajib');
  const rep = update_(g, { Status: STATUS.IP, Resolved_At: '', Foto_After_URL: '', Catatan: p.note, Response: p.note });
  notify_([rep.ID_Petugas], '↩️ Perlu diperbaiki: ' + rep.Nama_Area, p.note, rep.ID_Laporan);
  log_(u.nama, 'reject', p.id + ': ' + p.note);
  return { report: rep };
}

function rate_(p, u) {
  const g = getReport_(p.id);
  if (g.r.ID_Pelapor !== u.id) throw new Error('Hanya pelapor yang dapat memberi rating');
  if ([STATUS.R, STATUS.V].indexOf(g.r.Status) < 0) throw new Error('Tugas belum selesai');
  const n = Math.max(1, Math.min(5, parseInt(p.rating, 10) || 0));
  const patch = { Rating: n, Feedback: p.feedback || '' };
  if (g.r.Status === STATUS.V) Object.assign(patch, calcPoints_(Object.assign({}, g.r, patch)));
  const rep = update_(g, patch);
  if (g.r.Status === STATUS.V) addUserPoints_();
  notify_([rep.ID_Petugas], '⭐ Rating ' + n + ' dari ' + u.nama, p.feedback || rep.Nama_Area, rep.ID_Laporan);
  log_(u.nama, 'rate', p.id + ' ' + n);
  return { report: rep };
}

/* =========================================================
 *  GAMIFIKASI
 * ========================================================= */
function minutes_(a, b) { return a && b ? (new Date(b) - new Date(a)) / 60000 : 9999; }
/**
 * Poin petugas: 10 dasar; ≤60 mnt +10, ≤4 jam +5; Darurat +5; rating × 2.
 * Poin pelapor: +3 per laporan yang terverifikasi.
 */
function calcPoints_(r) {
  let pts = 10;
  const d = minutes_(r.Started_At || r.Timestamp, r.Resolved_At);
  if (d <= 60) pts += 10; else if (d <= 240) pts += 5;
  if (r.Prioritas === 'Darurat') pts += 5;
  if (+r.Rating) pts += 2 * (+r.Rating);
  return { Poin: pts, Poin_Pelapor: r.Sumber === 'JADWAL' ? 0 : 3 };
}
/** Rekap total poin ke kolom Poin di tab USER */
function addUserPoints_() {
  const t = table_(dbSS_(), SH.REPORTS);
  const tot = {};
  t.rows.forEach(function (r) {
    if (r[t.i.Status] !== STATUS.V) return;
    const p = String(r[t.i.ID_Petugas]), l = String(r[t.i.ID_Pelapor]);
    if (p) tot[p] = (tot[p] || 0) + (+r[t.i.Poin] || 0);
    if (l) tot[l] = (tot[l] || 0) + (+r[t.i.Poin_Pelapor] || 0);
  });
  const u = table_(usersSS_(), SH.USERS);
  if (u.i.Poin == null) return;
  const col = u.rows.map(function (r) { return [tot[nikStr_(r[u.i.NIK])] || 0]; });
  if (col.length) u.sh.getRange((u.hr || 0) + 2, u.i.Poin + 1, col.length, 1).setValues(col);
}

/* =========================================================
 *  JADWAL
 * ========================================================= */
function saveSchedule_(p, u) {
  mustApprover_(u);
  const s = p.schedule || {};
  if (!s.ID_Jadwal || !s.ID_Area) throw new Error('Data jadwal tidak lengkap');
  const t = table_(dbSS_(), SH.SCHEDULES);
  const k = findIdx_(t, 'ID_Jadwal', s.ID_Jadwal);
  s.Dibuat_Oleh = u.id;
  if (k >= 0) writeRow_(t, k, s); else appendObj_(t, s);
  log_(u.nama, 'saveSchedule', JSON.stringify(s));
  return { schedules: schedulesList_() };
}
function deleteSchedule_(p, u) {
  mustApprover_(u);
  const t = table_(dbSS_(), SH.SCHEDULES);
  const k = findIdx_(t, 'ID_Jadwal', p.scheduleId);
  if (k >= 0) t.sh.deleteRow(k + 2);
  return { schedules: schedulesList_() };
}

/** Trigger harian 05:30 — ubah jadwal rutin menjadi tugas */
function generateScheduledTasks() {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = days[parseInt(Utilities.formatDate(new Date(), TZ, 'u'), 10) % 7];
  const todayKey = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const t = table_(dbSS_(), SH.SCHEDULES);
  const areas = areasList_();
  const users = usersList_();
  const rt = table_(dbSS_(), SH.REPORTS);
  let created = 0;
  t.rows.forEach(function (r, k) {
    const s = rowToObj_(t, r);
    if (!s.ID_Jadwal || String(s.Aktif).toUpperCase() === 'FALSE') return;
    const hari = String(s.Hari || 'Setiap Hari');
    if (hari.indexOf('Setiap Hari') < 0 && hari.split(',').map(function (x) { return x.trim(); }).indexOf(today) < 0) return;
    if (String(s.Last_Run).slice(0, 10) === todayKey) return;
    const area = areas.filter(function (a) { return a.ID_Area === s.ID_Area; })[0];
    if (!area) return;
    const pt = users.filter(function (x) { return x.id === String(s.ID_Petugas); })[0];
    const jam = String(s.Jam || '07:00').split(':');
    const deadline = new Date(); deadline.setHours(+jam[0] + 2, +jam[1] || 0, 0, 0);
    const now = new Date();
    const id = newReportId_(rt, area.ID_Area);
    const obj = {
      ID_Laporan: id, ID_Pelapor: s.Dibuat_Oleh || 'SYSTEM', Nama_Pelapor: 'Jadwal Rutin', ID_Area: area.ID_Area, Nama_Area: area.Nama_Area,
      Titik: s.Titik || '', Kategori: s.Kategori || 'Debu/Kotor', Deskripsi: s.Deskripsi || 'Kebersihan rutin', Prioritas: 'Normal',
      Deadline: deadline, Status: STATUS.P, ID_Petugas: pt ? pt.id : '', Nama_Petugas: pt ? pt.nama : '',
      Latitude: area.Latitude, Longitude: area.Longitude, Timestamp: now, Sumber: 'JADWAL', Updated_At: now
    };
    appendObj_(rt, obj);
    mirrorToAreaSheet_(obj, area);
    t.sh.getRange(k + 2, t.i.Last_Run + 1).setValue(todayKey);
    const ids = pt ? [pt.id] : users.filter(function (x) { return x.roleKey === 'TKNO'; }).map(function (x) { return x.id; });
    notify_(ids, '📅 Jadwal rutin: ' + area.Nama_Area, obj.Kategori + (obj.Titik ? ' — ' + obj.Titik : '') + ' (jam ' + (s.Jam || '07:00') + ')', id);
    created++;
  });
  return created;
}

/** Trigger per jam: eskalasi tugas yang lama tidak diambil & bersih-bersih */
function hourlyJob() {
  const t = table_(dbSS_(), SH.REPORTS);
  const cache = CacheService.getScriptCache();
  const approvers = usersList_().filter(isApprover_).map(function (x) { return x.id; });
  const now = Date.now();
  t.rows.forEach(function (r) {
    const id = r[t.i.ID_Laporan];
    if (!id) return;
    const st = r[t.i.Status], ts = r[t.i.Timestamp], dl = r[t.i.Deadline];
    const late = dl instanceof Date && dl.getTime() < now && (st === STATUS.P || st === STATUS.IP);
    const stale = st === STATUS.P && ts instanceof Date && now - ts.getTime() > 2 * 3600e3;
    if ((late || stale) && !cache.get('esc_' + id)) {
      notify_(approvers, '⏰ ' + (late ? 'Lewat batas waktu' : 'Belum diambil > 2 jam'), id + ' — ' + r[t.i.Nama_Area] + ' (' + r[t.i.Kategori] + ')', id);
      if (r[t.i.ID_Petugas]) notify_([String(r[t.i.ID_Petugas])], '⏰ Pengingat tugas', r[t.i.Nama_Area] + ' — ' + r[t.i.Kategori], id);
      cache.put('esc_' + id, '1', 21600);
    }
  });
  // Hapus notifikasi > 30 hari
  const n = table_(dbSS_(), SH.NOTIF);
  const cut = now - 30 * 864e5;
  let del = 0;
  for (let k = 0; k < n.rows.length; k++) { const ts = n.rows[k][n.i.Timestamp]; if (ts instanceof Date && ts.getTime() < cut) del++; else break; }
  if (del) n.sh.deleteRows(2, del);
}

/* =========================================================
 *  AREA
 * ========================================================= */
function setAreaCoord_(p, u) {
  mustApprover_(u);
  const t = table_(dbSS_(), SH.AREAS);
  const k = findIdx_(t, 'ID_Area', p.areaId);
  if (k < 0) throw new Error('Area tidak ditemukan');
  writeRow_(t, k, { Latitude: +p.lat, Longitude: +p.lng });
  return { areas: areasList_() };
}

/** Salin ke tab AREA 1/2/3 sesuai format dB asli (Tanggal … Rating) */
function mirrorToAreaSheet_(o, area) {
  try {
    area = area || areasList_().filter(function (a) { return a.ID_Area === o.ID_Area; })[0];
    if (!area || !area.Sheet_Name) return;
    const ss = dbSS_();
    let sh = findSheet_(ss, area.Sheet_Name);
    if (!sh) { // cocokkan awalan "AREA 1", "AREA 2", …
      const key = 'AREA' + String(area.ID_Area).replace(/\D/g, '');
      sh = ss.getSheets().filter(function (s) { return s.getName().toUpperCase().replace(/\s+/g, '').indexOf(key) === 0; })[0];
    }
    if (!sh) return;
    const data = sh.getDataRange().getValues();
    let hr = 0;
    for (let i = 0; i < Math.min(5, data.length); i++) if (data[i].map(function (x) { return String(x).trim(); }).indexOf('No. Reg Job') >= 0) { hr = i; break; }
    const head = data[hr].map(function (h) { return String(h).trim(); });
    const col = function (n) { return head.indexOf(n); };
    const link = function (url, label) { return url && /^https?:/.test(url) ? '=HYPERLINK("' + url + '","' + label + '")' : ''; };
    const vals = {
      'Tanggal': o.Timestamp ? new Date(o.Timestamp) : new Date(),
      'Timestamp': o.Timestamp ? new Date(o.Timestamp) : new Date(),
      'No. Reg Job': o.ID_Laporan,
      'Kapten': area.Koordinator || o.Nama_Pelapor,
      'Koordinator': area.Koordinator || o.Nama_Pelapor,
      'Area': area.Nama_Area + (o.Titik ? ' — ' + o.Titik : ''),
      'Kegiatan': o.Kategori + (o.Nama_Petugas ? ' (' + o.Nama_Petugas + ')' : ''),
      'Foto Before': link(o.Foto_Before_URL, 'Foto Before'),
      'Foto After': link(o.Foto_After_URL, 'Foto After'),
      'Maps': link(o.Maps_URL, 'Buka Maps'),
      'Deskripsi': o.Deskripsi || '',
      'Status': o.Status,
      'Feedback': o.Feedback || '',
      'Response': o.Response || '',
      'Rating': o.Rating || ''
    };
    const row = head.map(function (h) { return vals[h] != null ? vals[h] : ''; });
    const ci = col('No. Reg Job');
    let target = -1;
    for (let i = hr + 1; i < data.length; i++) if (String(data[i][ci]) === o.ID_Laporan) { target = i; break; }
    if (target >= 0) sh.getRange(target + 1, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
  } catch (e) { log_('SYSTEM', 'mirror', String(e)); }
}

/* =========================================================
 *  FOTO → Google Drive
 * ========================================================= */
function photoFolder_() {
  const pr = PropertiesService.getScriptProperties();
  const id = pr.getProperty('PHOTO_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { } }
  const f = DriveApp.createFolder('5R XFMR — Foto Bukti');
  pr.setProperty('PHOTO_FOLDER_ID', f.getId());
  return f;
}
function savePhoto_(dataUrl, name) {
  if (!dataUrl) return '';
  if (/^https?:\/\//.test(dataUrl)) return dataUrl;
  const m = String(dataUrl).match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!m) throw new Error('Format foto tidak valid');
  const bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > 4 * 1024 * 1024) throw new Error('Foto terlalu besar (maks 4 MB)');
  const month = Utilities.formatDate(new Date(), TZ, 'yyyy-MM');
  const root = photoFolder_();
  const it = root.getFoldersByName(month);
  const folder = it.hasNext() ? it.next() : root.createFolder(month);
  const file = folder.createFile(Utilities.newBlob(bytes, m[1], name + '.jpg'));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { }
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200';
}

/* =========================================================
 *  NOTIFIKASI: sheet (polling) + Web Push via FCM HTTP v1
 * ========================================================= */
function notify_(userIds, title, body, reportId) {
  userIds = (userIds || []).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
  if (!userIds.length) return;
  const n = table_(dbSS_(), SH.NOTIF);
  const now = new Date();
  const rows = userIds.map(function (uid) { return ['N-' + Utilities.getUuid().slice(0, 8), uid, title, body, reportId || '', now]; });
  n.sh.getRange(n.sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  try { sendPush_(userIds, title, body, reportId, rows); } catch (e) { log_('SYSTEM', 'push', String(e)); }
}

function sendPush_(userIds, title, body, reportId, rows) {
  const pr = PropertiesService.getScriptProperties();
  const projectId = pr.getProperty('FCM_PROJECT_ID');
  if (!projectId) return; // FCM belum dikonfigurasi → cukup polling
  const at = fcmAccessToken_();
  if (!at) return;
  const pt = table_(dbSS_(), SH.PUSH);
  const reqs = [], meta = [];
  userIds.forEach(function (uid, i) {
    pt.rows.forEach(function (r, k) {
      if (String(r[pt.i.ID_User]) !== String(uid)) return;
      const url = './#/r/' + encodeURIComponent(reportId || '');
      reqs.push({
        url: 'https://fcm.googleapis.com/v1/projects/' + projectId + '/messages:send',
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + at },
        payload: JSON.stringify({
          message: {
            token: r[pt.i.Token],
            data: { title: String(title), body: String(body), url: reportId ? url : './', tag: String(rows[i][0]) },
            webpush: { headers: { Urgency: 'high', TTL: '86400' } }
          }
        })
      });
      meta.push(k);
    });
  });
  if (!reqs.length) return;
  const res = UrlFetchApp.fetchAll(reqs);
  const dead = [];
  res.forEach(function (r, i) {
    const c = r.getResponseCode();
    if (c === 404 || (c === 400 && /UNREGISTERED|INVALID_ARGUMENT/.test(r.getContentText()))) dead.push(meta[i]);
  });
  dead.sort(function (a, b) { return b - a; }).forEach(function (k) { pt.sh.deleteRow(k + 2); });
}

/** OAuth2 access token dari Service Account (JWT RS256) — cache 55 menit */
function fcmAccessToken_() {
  const c = CacheService.getScriptCache();
  const hit = c.get('fcm_at');
  if (hit) return hit;
  const pr = PropertiesService.getScriptProperties();
  const email = pr.getProperty('FCM_CLIENT_EMAIL');
  const key = (pr.getProperty('FCM_PRIVATE_KEY') || '').replace(/\\n/g, '\n');
  if (!email || !key) return null;
  const now = Math.floor(Date.now() / 1000);
  const b64 = function (s) { return Utilities.base64EncodeWebSafe(s).replace(/=+$/, ''); };
  const head = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(head + '.' + claim, key)).replace(/=+$/, '');
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post', muteHttpExceptions: true,
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + claim + '.' + sig }
  });
  const tok = JSON.parse(r.getContentText()).access_token;
  if (tok) c.put('fcm_at', tok, 3300);
  return tok || null;
}

function savePushToken_(p, u) {
  if (!p.pushToken) throw new Error('Token kosong');
  const t = table_(dbSS_(), SH.PUSH);
  const k = findIdx_(t, 'Token', p.pushToken);
  const obj = { ID_User: u.id, Token: p.pushToken, Platform: p.platform || '', Updated_At: new Date() };
  if (k >= 0) writeRow_(t, k, obj); else appendObj_(t, obj);
  return { ok: true };
}

/* =========================================================
 *  UTIL ADMIN (jalankan manual dari editor)
 * ========================================================= */
/** Ubah semua password plaintext menjadi hash SHA-256 */
function hashAllPasswords() {
  const t = table_(usersSS_(), SH.USERS);
  const c = t.i['Kata Sandi'];
  const col = t.rows.map(function (r) { const v = String(r[c]); return [v && v.indexOf('sha256:') !== 0 ? 'sha256:' + sha256_(v) : v]; });
  t.sh.getRange(2, c + 1, col.length, 1).setValues(col);
}
/** Uji kirim notifikasi ke diri sendiri (isi NIK) */
function testNotify() { notify_(['2146103'], '🔔 Tes 5R XFMR', 'Notifikasi berfungsi', ''); }
