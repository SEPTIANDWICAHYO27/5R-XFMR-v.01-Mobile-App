/* =========================================================
 * 5R XFMR — Aplikasi (router, tampilan per role, aksi)
 * ========================================================= */
(function () {
  'use strict';
  const C = window.XF_CONFIG || {};
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, cls) => '<svg class="i ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>';

  /* ---------------- Master data ---------------- */
  const CATS = [
    { k: 'Sampah', e: '🗑️' }, { k: 'Debu/Kotor', e: '🧹' }, { k: 'Tumpahan/Genangan', e: '💧' },
    { k: 'Tidak Rapi', e: '📦' }, { k: 'Toilet/Sanitasi', e: '🚽' }, { k: 'Dapur', e: '🍳' },
    { k: 'Kerusakan Fasilitas', e: '🔧' }, { k: 'Lainnya', e: '📝' }
  ];
  const ST = {
    'Pending': { l: 'MENUNGGU', c: 'st-pending', i: 'clock' },
    'In Progress': { l: 'DIKERJAKAN', c: 'st-progress', i: 'play' },
    'Resolved': { l: 'SELESAI', c: 'st-resolved', i: 'check' },
    'Verified': { l: 'TERVERIFIKASI', c: 'st-verified', i: 'shield' }
  };
  const STATUSES = Object.keys(ST);
  const AREA_COLORS = ['#2563EB', '#EA580C', '#16A34A', '#9333EA', '#0891B2'];
  const PRIO = ['Normal', 'Tinggi', 'Darurat'];
  const DEADLINES = [{ k: '1 Jam', h: 1 }, { k: '4 Jam', h: 4 }, { k: 'Hari Ini', eod: 0 }, { k: 'Besok', eod: 1 }];
  const DAYS = ['Setiap Hari', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const FEEDBACK_CHIPS = ['Bersih sekali 👍', 'Cepat ⚡', 'Rapi 📐', 'Kurang bersih', 'Terlambat'];
  const BADGES = [
    { k: 'kilat', e: '⚡', n: 'Kilat', d: 'Rata-rata selesai ≤ 60 menit (min. 5 tugas)' },
    { k: 'bintang', e: '⭐', n: 'Bintang 5', d: 'Rata-rata rating ≥ 4,5 (min. 5 rating)' },
    { k: 'rajin', e: '💪', n: 'Rajin', d: '20 tugas terverifikasi' },
    { k: 'master', e: '🧹', n: 'Resik Master', d: '50 tugas terverifikasi' },
    { k: 'pelapor', e: '📣', n: 'Mata Elang', d: '10 laporan valid' },
    { k: 'juara', e: '👑', n: 'Juara Bulan Ini', d: 'Peringkat 1 poin bulan ini' }
  ];

  /* ---------------- State ---------------- */
  const S = {
    user: null, areas: [], users: [], schedules: [], reports: [],
    pending: 0, online: navigator.onLine, installEvt: null, draft: null,
    filter: null, rank: { tab: 'poin', period: 'month' }
  };
  const roleKey = (r) => {
    r = String(r || '').toUpperCase();
    if (r.includes('TKNO')) return 'TKNO';
    if (r.includes('TKO')) return 'TKO';
    if (r.includes('JAVP')) return 'JAVP';
    if (r.includes('AVP')) return 'AVP';
    if (r.includes('SUPERVISOR')) return 'SUPERVISOR';
    if (r.includes('ADMIN')) return 'ADMIN';
    return 'TKO';
  };
  const ROLE_LABEL = { TKO: 'TKO • Pelapor', TKNO: 'TKNO • Petugas', ADMIN: 'Admin • Approver', AVP: 'AVP • Approver', JAVP: 'JAVP • Approver', SUPERVISOR: 'Supervisor • Approver' };
  const me = () => (S.user ? String(S.user.id) : '');
  const role = () => (S.user ? S.user.roleKey : '');
  const isApprover = () => ['ADMIN', 'AVP', 'JAVP', 'SUPERVISOR'].includes(role());

  /* ---------------- Helpers ---------------- */
  const toDate = (v) => (v ? new Date(v) : null);
  const mins = (a, b) => (a && b ? (toDate(b) - toDate(a)) / 60000 : null);
  function timeAgo(v) {
    if (!v) return '-';
    const s = (Date.now() - new Date(v).getTime()) / 1000;
    if (s < 60) return 'baru saja';
    if (s < 3600) return Math.floor(s / 60) + ' mnt lalu';
    if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
    if (s < 172800) return 'kemarin';
    return fmtDate(v, true);
  }
  function fmtDate(v, short) {
    if (!v) return '-';
    const d = new Date(v);
    return d.toLocaleDateString('id-ID', short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }) +
      (short ? '' : ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  }
  function fmtDur(m) {
    if (m == null || isNaN(m)) return '-';
    if (m < 60) return Math.round(m) + ' mnt';
    if (m < 1440) return (m / 60).toFixed(1).replace('.', ',') + ' jam';
    return (m / 1440).toFixed(1).replace('.', ',') + ' hari';
  }
  const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const areaById = (id) => S.areas.find((a) => a.ID_Area === id) || { ID_Area: id, Nama_Area: id || '-' };
  const areaColor = (id) => { const i = S.areas.findIndex((a) => a.ID_Area === id); return AREA_COLORS[(i < 0 ? 0 : i) % AREA_COLORS.length]; };
  const areaShort = (id) => { const a = areaById(id); return a.Nama_Area || id; };
  const titikList = (id) => String(areaById(id).Titik || '').split(/\s*[;\n]\s*/).filter(Boolean);
  const userById = (id) => S.users.find((u) => String(u.id) === String(id));
  const userName = (id) => { const u = userById(id); return u ? u.nama : (id || '-'); };
  const petugasList = () => S.users.filter((u) => u.roleKey === 'TKNO' || u.roleKey === 'TKO');
  const catOf = (k) => CATS.find((c) => c.k === k) || CATS[CATS.length - 1];
  const sortByTime = (a, b) => new Date(b.Timestamp) - new Date(a.Timestamp);
  const defFilter = (o) => Object.assign({ status: '', area: '', period: 'month', q: '', scope: 'mine', limit: 40 }, o || {});
  const prioRank = (p) => ({ Darurat: 0, Tinggi: 1 }[p] ?? 2);

  function toast(msg, type) {
    const t = $('#toast');
    const d = document.createElement('div');
    d.className = 'toast ' + (type || '');
    d.textContent = msg;
    t.appendChild(d);
    while (t.children.length > 2) t.firstChild.remove();
    setTimeout(() => d.classList.add('out'), 2600);
    setTimeout(() => d.remove(), 3100);
  }
  function haversine(a, b, c, d) {
    const R = 6371000, r = Math.PI / 180;
    const x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function getPos(timeout) {
    return new Promise((ok) => {
      if (!navigator.geolocation) return ok(null);
      navigator.geolocation.getCurrentPosition(
        (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
        () => ok(null),
        { enableHighAccuracy: true, timeout: timeout || 12000, maximumAge: 30000 }
      );
    });
  }
  function nearestArea(pos) {
    if (!pos) return null;
    let best = null;
    S.areas.forEach((a) => {
      const lat = parseFloat(a.Latitude), lng = parseFloat(a.Longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const d = haversine(pos.lat, pos.lng, lat, lng);
      if (!best || d < best.d) best = { area: a, d: d };
    });
    return best;
  }
  function mapsUrl(lat, lng) { return 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=walking'; }
  function deadlineFrom(opt) {
    const d = new Date();
    if (opt.h) return new Date(d.getTime() + opt.h * 3600000).toISOString();
    d.setDate(d.getDate() + opt.eod); d.setHours(16, 0, 0, 0);
    return d.toISOString();
  }
  const isLate = (r) => r.Deadline && ['Pending', 'In Progress'].includes(r.Status) && new Date(r.Deadline) < new Date();

  /* ---------------- Data load / sync ---------------- */
  async function loadLocal() {
    S.user = await XF.kv.get('user');
    if (S.user) S.user.roleKey = roleKey(S.user.role);
    S.areas = (await XF.kv.get('areas')) || [];
    S.users = ((await XF.kv.get('users')) || []).map((u) => Object.assign(u, { roleKey: roleKey(u.role) }));
    S.schedules = (await XF.kv.get('schedules')) || [];
    S.reports = (await XF.reports.all()).sort(sortByTime);
    S.pending = await XF.outbox.count();
  }

  let refreshing = false;
  async function refresh(opts) {
    opts = opts || {};
    if (!S.user || refreshing) return;
    refreshing = true;
    updatePill(true);
    try {
      if (navigator.onLine) {
        const res = await XF.sync();
        if (res && res.auth) return forceLogout('Sesi berakhir, silakan masuk lagi');
        if (res && res.failed && res.failed.length) res.failed.forEach((f) => toast('Gagal: ' + f.error, 'err'));
        if (res && res.sent) toast(res.sent + ' data terkirim ✓', 'ok');
        if (opts.boot) await bootstrap();
        const out = await XF.pull(!!opts.full);
        handleNotifs(out.notifications);
      }
    } catch (e) {
      if (e.code === 'AUTH') return forceLogout('Sesi berakhir, silakan masuk lagi');
      if (e.code !== 'NETWORK' && opts.manual) toast(e.message, 'err');
    } finally {
      refreshing = false;
      await loadLocal();
      updatePill(false);
      softRender();
    }
  }

  async function bootstrap() {
    const d = await XF.api('bootstrap', {});
    await XF.kv.set('user', d.user);
    await XF.kv.set('areas', d.areas || []);
    await XF.kv.set('users', d.users || []);
    await XF.kv.set('schedules', d.schedules || []);
  }

  async function handleNotifs(list) {
    if (!list || !list.length) return;
    list.slice(-3).forEach((n) => toast('🔔 ' + n.Judul + (n.Pesan ? ' — ' + n.Pesan : '')));
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      const reg = await navigator.serviceWorker.ready;
      list.forEach((n) => reg.showNotification(n.Judul, {
        body: n.Pesan, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: n.ID,
        data: { url: n.ID_Laporan ? './#/r/' + encodeURIComponent(n.ID_Laporan) : './' }
      }));
    }
  }

  async function forceLogout(msg) {
    await XF.kv.del('token'); await XF.kv.del('user');
    S.user = null;
    if (msg) toast(msg, 'err');
    location.hash = '#/';
    render();
  }

  /* ---------------- Shell ---------------- */
  function navItems() {
    const r = role();
    if (r === 'TKNO') return [['', 'home', 'Tugas'], ['laporan', 'list', 'History'], ['lapor', 'camera', 'Lapor', 1], ['peringkat', 'trophy', 'Peringkat'], ['profil', 'user', 'Saya']];
    if (isApprover()) return [['', 'grid', 'Dashboard'], ['laporan', 'list', 'History'], ['lapor', 'camera', 'Lapor', 1], ['jadwal', 'calendar', 'Jadwal'], ['profil', 'user', 'Saya']];
    return [['', 'home', 'Beranda'], ['laporan', 'list', 'History'], ['lapor', 'camera', 'Lapor', 1], ['peringkat', 'trophy', 'Peringkat'], ['profil', 'user', 'Saya']];
  }
  function currentRoute() { const h = location.hash.replace(/^#\/?/, ''); const p = h.split('/'); return { name: p[0] || '', arg: decodeURIComponent(p.slice(1).join('/') || '') }; }

  function pillHTML() {
    const on = navigator.onLine;
    return '<button class="pill ' + (on ? 'on' : 'off') + '" data-act="syncNow" aria-label="Status sinkron">' +
      ic(on ? 'wifi' : 'wifioff') + '<span>' + (on ? 'Online' : 'Offline') + '</span>' +
      (S.pending ? '<em>' + S.pending + '</em>' : '') + '</button>';
  }
  function updatePill(spin) {
    const p = $('.pill');
    if (p) { p.outerHTML = pillHTML(); if (spin) { const n = $('.pill'); if (n) n.classList.add('spin'); } }
  }

  function shell(title, body, opts) {
    opts = opts || {};
    const r = currentRoute().name;
    const nav = opts.noNav ? '' : '<nav class="bnav">' + navItems().map((n) =>
      '<a href="#/' + n[0] + '" class="' + (n[3] ? 'fab ' : '') + (r === n[0] ? 'act' : '') + '">' + ic(n[1]) + '<span>' + n[2] + '</span></a>').join('') + '</nav>';
    $('#app').innerHTML =
      '<header class="top">' +
      (opts.back ? '<button class="iconbtn" data-act="back" aria-label="Kembali">' + ic('back') + '</button>' : '<img src="icons/logo.png" class="toplogo" alt="5R XFMR">') +
      '<div class="toptitle"><b' + (title === '5R XFMR' ? ' class="brand"' : '') + '>' + esc(title) + '</b>' + (opts.sub ? '<small>' + esc(opts.sub) + '</small>' : '') + '</div>' + pillHTML() +
      '</header>' +
      (!navigator.onLine ? '<div class="offbar">' + ic('wifioff') + ' Mode offline — data disimpan & dikirim otomatis saat ada sinyal</div>' : '') +
      '<main class="main ' + (opts.cls || '') + '">' + body + '</main>' + nav;
    window.scrollTo(0, opts.keepScroll ? window.scrollY : 0);
  }

  /* ---------------- Komponen ---------------- */
  function statusChip(s) { const m = ST[s] || ST.Pending; return '<span class="chip ' + m.c + '">' + ic(m.i) + m.l + '</span>'; }
  function card(r, opts) {
    opts = opts || {};
    const cat = catOf(r.Kategori);
    const late = isLate(r);
    return '<a class="rcard" href="#/r/' + encodeURIComponent(r.ID_Laporan) + '" style="--ac:' + areaColor(r.ID_Area) + '">' +
      '<div class="rthumb">' + (r.Foto_Before_URL ? '<img loading="lazy" src="' + esc(r.Foto_Before_URL) + '" alt="">' : '<span>' + cat.e + '</span>') + '</div>' +
      '<div class="rbody">' +
      '<div class="rrow">' + statusChip(r.Status) +
      (r.Prioritas && r.Prioritas !== 'Normal' ? '<span class="chip prio-' + esc(r.Prioritas) + '">' + esc(r.Prioritas) + '</span>' : '') +
      (late ? '<span class="chip prio-Darurat">TELAT</span>' : '') +
      (r._local || r._dirty ? '<span class="chip chip-sync" title="Menunggu sinyal">' + ic('cloud') + '</span>' : '') + '</div>' +
      '<div class="rtitle">' + cat.e + ' ' + esc(r.Kategori) + '</div>' +
      '<div class="rmeta">' + ic('pin') + esc(areaShort(r.ID_Area)) + (r.Titik ? ' · ' + esc(r.Titik) : '') + '</div>' +
      '<div class="rmeta">' + ic('clock') + timeAgo(r.Timestamp) + (r.Nama_Petugas ? ' · ' + ic('user') + esc(r.Nama_Petugas) : (r.Status === 'Pending' ? ' · <b class="open">Belum ada petugas</b>' : '')) + '</div>' +
      '</div>' + (opts.take ? '<button class="btn btn-primary take" data-act="take" data-id="' + esc(r.ID_Laporan) + '">AMBIL</button>' : '') +
      '</a>';
  }
  function empty(emoji, title, sub) { return '<div class="empty"><div class="em">' + emoji + '</div><b>' + esc(title) + '</b>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>'; }
  function section(title, inner, extra) { return '<section class="sec"><div class="sec-h"><h2>' + title + '</h2>' + (extra || '') + '</div>' + inner + '</section>'; }

  /* =========================================================
   * VIEW: Login
   * ========================================================= */
  function viewLogin() {
    $('#app').innerHTML =
      '<div class="login glass">' +
      '<img src="icons/logo.png" class="login-logo" alt="Logo 5R XFMR">' +
      '<h1>5R XFMR</h1><p class="login-sub">Kebersihan Area Plant<br><b>' + esc(C.UNIT || 'Asam Sulfat & Utilitas IIIB') + '</b></p>' +
      (!C.API_URL ? '<div class="alert">⚙️ <b>API_URL belum diatur.</b> Isi URL Web App Apps Script di <code>config.js</code>.</div>' : '') +
      '<form id="fLogin" class="glass-card form" autocomplete="on">' +
      '<label>' + ic('user') + ' NIK</label><input name="nik" inputmode="numeric" autocomplete="username" placeholder="Contoh: 2146103" required>' +
      '<label>' + ic('shield') + ' Kata Sandi</label><div class="pw"><input name="password" type="password" autocomplete="current-password" placeholder="••••••" required>' +
      '<button type="button" class="pw-eye" data-act="togglePw">LIHAT</button></div>' +
      '<button class="btn btn-primary btn-xl" type="submit">MASUK</button>' +
      '</form><p class="foot">Gugus 5R XFMR • ' + new Date().getFullYear() + '</p></div>';
    $('#fLogin').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target, b = f.querySelector('button[type=submit]');
      if (!navigator.onLine) return toast('Login pertama butuh internet', 'err');
      b.disabled = true; b.textContent = 'MEMERIKSA…';
      try {
        const d = await XF.api('login', { nik: f.nik.value.trim(), password: f.password.value });
        await XF.kv.set('token', d.token);
        await XF.kv.set('user', d.user);
        await XF.kv.set('lastPull', '');
        await bootstrap();
        await XF.pull(true);
        await loadLocal();
        toast('Selamat datang, ' + S.user.nama.split(' ')[0] + '!', 'ok');
        location.hash = '#/';
        render();
        XFPush.initIfGranted();
      } catch (er) {
        toast(er.message, 'err');
        b.disabled = false; b.textContent = 'MASUK';
      }
    };
  }

  /* =========================================================
   * VIEW: Beranda per role
   * ========================================================= */
  function viewHome() {
    if (role() === 'TKNO') return homeTKNO();
    if (isApprover()) return homeApprover();
    return homeTKO();
  }

  function greet() {
    const h = new Date().getHours();
    const g = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
    return '<div class="greet"><div class="avatar">' + initials(S.user.nama) + '</div><div><small>' + g + ',</small><b>' + esc(S.user.nama) + '</b><span class="role">' + esc(ROLE_LABEL[role()] || S.user.role) + '</span></div></div>';
  }

  function areaTiles() {
    return '<div class="areas">' + S.areas.map((a) => {
      const open = S.reports.filter((r) => r.ID_Area === a.ID_Area && ['Pending', 'In Progress'].includes(r.Status)).length;
      return '<a class="area-tile" href="#/laporan" data-act="filterArea" data-id="' + esc(a.ID_Area) + '" style="--ac:' + areaColor(a.ID_Area) + '">' +
        '<b>' + esc(a.ID_Area.replace('A', 'AREA ')) + '</b><span>' + esc(a.Nama_Area) + '</span>' +
        '<em class="' + (open ? 'warn' : 'ok') + '">' + (open ? open + ' kotor' : '✓ Bersih') + '</em></a>';
    }).join('') + '</div>';
  }

  function homeTKO() {
    const mine = S.reports.filter((r) => String(r.ID_Pelapor) === me());
    const toRate = mine.filter((r) => ['Resolved', 'Verified'].includes(r.Status) && !r.Rating);
    const delegated = S.reports.filter((r) => r.Status !== 'Verified' && r.Status !== 'Resolved' && String(r.ID_Pelapor) === me());
    shell('5R XFMR', greet() +
      '<a href="#/lapor" class="hero">' + ic('camera') + '<div><b>LAPOR AREA KOTOR</b><span>Foto • Lokasi • Kirim</span></div></a>' +
      areaTiles() +
      (toRate.length ? section('⭐ Beri Rating (' + toRate.length + ')', toRate.slice(0, 5).map((r) => card(r)).join('')) : '') +
      section('Laporan Saya (aktif)', delegated.length ? delegated.slice(0, 10).map((r) => card(r)).join('') : empty('✨', 'Tidak ada laporan aktif', 'Area bersih. Terima kasih!'), '<a href="#/laporan" class="more">Semua</a>'));
  }

  function homeTKNO() {
    const mine = S.reports.filter((r) => String(r.ID_Petugas) === me() && ['Pending', 'In Progress'].includes(r.Status))
      .sort((a, b) => prioRank(a.Prioritas) - prioRank(b.Prioritas) || new Date(a.Timestamp) - new Date(b.Timestamp));
    const open = S.reports.filter((r) => !r.ID_Petugas && r.Status === 'Pending').sort((a, b) => prioRank(a.Prioritas) - prioRank(b.Prioritas));
    const done = S.reports.filter((r) => String(r.ID_Petugas) === me() && r.Status === 'Verified');
    const pts = done.reduce((s, r) => s + (+r.Poin || 0), 0);
    shell('Tugas Saya', greet() +
      '<div class="kpis three">' +
      '<div class="kpi"><b>' + mine.length + '</b><span>Tugas aktif</span></div>' +
      '<div class="kpi"><b>' + open.length + '</b><span>Tugas terbuka</span></div>' +
      '<div class="kpi gold"><b>' + pts + '</b><span>Poin saya</span></div></div>' +
      section('🧹 Tugas Saya', mine.length ? mine.map((r) => card(r)).join('') : empty('🎉', 'Semua tugas beres!', 'Cek tugas terbuka di bawah.')) +
      section('📢 Tugas Terbuka', open.length ? open.map((r) => card(r, { take: true })).join('') : empty('✅', 'Tidak ada tugas terbuka')));
  }

  function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }
  function homeApprover() {
    const from = monthStart();
    const month = S.reports.filter((r) => new Date(r.Timestamp) >= from);
    const cnt = (s) => S.reports.filter((r) => r.Status === s).length;
    const verifyQ = S.reports.filter((r) => r.Status === 'Resolved').sort((a, b) => new Date(a.Resolved_At) - new Date(b.Resolved_At));
    const late = S.reports.filter(isLate);
    const resp = month.map((r) => mins(r.Timestamp, r.Started_At)).filter((v) => v != null && v >= 0);
    const comp = month.map((r) => mins(r.Timestamp, r.Resolved_At)).filter((v) => v != null && v >= 0);
    const rates = month.map((r) => +r.Rating).filter(Boolean);
    const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
    const maxA = Math.max(1, ...S.areas.map((a) => month.filter((r) => r.ID_Area === a.ID_Area).length));
    const bars = S.areas.map((a) => {
      const all = month.filter((r) => r.ID_Area === a.ID_Area);
      const ok = all.filter((r) => r.Status === 'Verified').length;
      return '<div class="bar-row"><span class="bar-l" style="color:' + areaColor(a.ID_Area) + '">' + esc(a.ID_Area) + '</span>' +
        '<div class="bar"><i style="width:' + (all.length / maxA * 100) + '%;background:' + areaColor(a.ID_Area) + '33"></i><i style="width:' + (ok / maxA * 100) + '%;background:' + areaColor(a.ID_Area) + '"></i></div>' +
        '<span class="bar-v">' + ok + '/' + all.length + '</span></div>';
    }).join('');
    const top = leaderboard('poin', 'month').slice(0, 3);
    shell('Dashboard', greet() +
      '<div class="kpis">' +
      '<a class="kpi k-pending" href="#/laporan" data-act="filterStatus" data-s="Pending"><b>' + cnt('Pending') + '</b><span>Menunggu</span></a>' +
      '<a class="kpi k-progress" href="#/laporan" data-act="filterStatus" data-s="In Progress"><b>' + cnt('In Progress') + '</b><span>Dikerjakan</span></a>' +
      '<a class="kpi k-resolved" href="#/laporan" data-act="filterStatus" data-s="Resolved"><b>' + cnt('Resolved') + '</b><span>Perlu verifikasi</span></a>' +
      '<a class="kpi k-verified" href="#/laporan" data-act="filterStatus" data-s="Verified"><b>' + cnt('Verified') + '</b><span>Terverifikasi</span></a></div>' +
      '<div class="card stats"><div><small>Laporan bulan ini</small><b>' + month.length + '</b></div><div><small>Respon rata²</small><b>' + fmtDur(avg(resp)) + '</b></div>' +
      '<div><small>Selesai rata²</small><b>' + fmtDur(avg(comp)) + '</b></div><div><small>Rating rata²</small><b>' + (avg(rates) ? avg(rates).toFixed(1).replace('.', ',') + ' ⭐' : '-') + '</b></div></div>' +
      section('Per Area (bulan ini)', '<div class="card">' + (bars || '<p class="muted">Data area belum ada</p>') + '<p class="legend"><i></i>Terverifikasi <i class="l2"></i>Total laporan</p></div>') +
      (late.length ? section('⏰ Lewat Batas Waktu (' + late.length + ')', late.slice(0, 5).map((r) => card(r)).join('')) : '') +
      section('✅ Perlu Verifikasi (' + verifyQ.length + ')', verifyQ.length ? verifyQ.slice(0, 10).map((r) => card(r)).join('') : empty('👌', 'Tidak ada antrean verifikasi')) +
      section('🏆 Petugas Terbaik Bulan Ini', top.length ? '<div class="card">' + top.map((p, i) => rankRow(p, i, 'poin')).join('') + '</div>' : empty('🏁', 'Belum ada data'), '<a href="#/peringkat" class="more">Lihat</a>'));
  }

  /* =========================================================
   * VIEW: Daftar laporan
   * ========================================================= */
  /* =========================================================
   * VIEW: History — terstruktur & informatif
   * ========================================================= */
  const PERIODS = [['today', 'Hari Ini'], ['7d', '7 Hari'], ['month', 'Bulan Ini'], ['all', 'Semua']];
  function periodStart(p) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (p === 'today') return d;
    if (p === '7d') { d.setDate(d.getDate() - 6); return d; }
    if (p === 'month') { d.setDate(1); return d; }
    return new Date(0);
  }
  function histBase() {
    const f = S.filter;
    const from = periodStart(f.period);
    let list = S.reports.filter((r) => new Date(r.Timestamp) >= from);
    if (f.scope === 'mine' && !isApprover()) list = list.filter((r) => String(r.ID_Pelapor) === me() || String(r.ID_Petugas) === me());
    if (f.area) list = list.filter((r) => r.ID_Area === f.area);
    if (f.q) {
      const q = f.q.toLowerCase();
      list = list.filter((r) => [r.ID_Laporan, r.Kategori, r.Titik, r.Deskripsi, r.Nama_Petugas, r.Nama_Pelapor, areaShort(r.ID_Area)].join(' ').toLowerCase().includes(q));
    }
    return list;
  }
  function histFiltered(base) {
    const f = S.filter;
    if (f.status === 'aktif') return base.filter((r) => r.Status !== 'Verified');
    if (f.status === 'telat') return base.filter(isLate);
    if (f.status) return base.filter((r) => r.Status === f.status);
    return base;
  }
  function dayLabel(v) {
    const d = new Date(v); d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const diff = Math.round((t - d) / 864e5);
    if (diff === 0) return 'Hari Ini';
    if (diff === 1) return 'Kemarin';
    return new Date(v).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function miniSteps(r) {
    const idx = Math.max(0, STATUSES.indexOf(r.Status));
    return '<div class="hsteps">' + STATUSES.map((s, i) => '<i class="' + (i <= idx ? 'on ' + ST[s].c : '') + '" title="' + ST[s].l + '"></i>').join('') + '</div>';
  }
  function histCard(r) {
    const cat = catOf(r.Kategori);
    const dur = mins(r.Started_At || r.Timestamp, r.Resolved_At);
    const resp = mins(r.Timestamp, r.Started_At);
    const thumb = (u, l) => '<span class="hph">' + (u ? '<img loading="lazy" src="' + esc(u) + '" alt="">' : ic('camera')) + '<em>' + l + '</em></span>';
    return '<a class="hcard" href="#/r/' + encodeURIComponent(r.ID_Laporan) + '" style="--ac:' + areaColor(r.ID_Area) + '">' +
      '<div class="hc-top"><span class="hc-id">' + esc(r.ID_Laporan.indexOf('L-') === 0 ? 'Belum terkirim' : r.ID_Laporan) + '</span>' +
      '<span class="hc-time">' + ic('clock') + new Date(r.Timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + '</span></div>' +
      '<div class="hc-main"><div class="hc-ph">' + thumb(r.Foto_Before_URL, 'SEBELUM') + thumb(r.Foto_After_URL, 'SESUDAH') + '</div>' +
      '<div class="hc-info"><div class="rrow">' + statusChip(r.Status) +
      (r.Prioritas && r.Prioritas !== 'Normal' ? '<span class="chip prio-' + esc(r.Prioritas) + '">' + esc(r.Prioritas) + '</span>' : '') +
      (isLate(r) ? '<span class="chip prio-Darurat">TELAT</span>' : '') +
      (r._local || r._dirty ? '<span class="chip chip-sync">' + ic('cloud') + '</span>' : '') + '</div>' +
      '<b class="hc-title">' + cat.e + '\u00a0' + esc(r.Kategori).replace('/', '/<wbr>') + '</b>' +
      '<span class="hc-loc">' + ic('pin') + esc(r.ID_Area) + ' · ' + esc(areaShort(r.ID_Area)) + (r.Titik ? ' — ' + esc(r.Titik) : '') + '</span>' +
      miniSteps(r) + '</div></div>' +
      '<dl class="hc-meta">' +
      '<div><dt>Pelapor</dt><dd>' + esc((r.Nama_Pelapor || userName(r.ID_Pelapor) || '-').split(' ').slice(0, 2).join(' ')) + '</dd></div>' +
      '<div><dt>Petugas</dt><dd>' + esc(r.Nama_Petugas ? r.Nama_Petugas.split(' ').slice(0, 2).join(' ') : '—') + '</dd></div>' +
      '<div><dt>Respon</dt><dd>' + (resp != null && resp >= 0 ? fmtDur(resp) : '—') + '</dd></div>' +
      '<div><dt>Durasi</dt><dd>' + (r.Resolved_At && dur >= 0 ? fmtDur(dur) : '—') + '</dd></div>' +
      '<div><dt>Rating</dt><dd class="star">' + (+r.Rating ? '★'.repeat(+r.Rating) : '—') + '</dd></div>' +
      '<div><dt>Poin</dt><dd>' + (+r.Poin ? '+' + r.Poin : '—') + '</dd></div>' +
      '</dl>' + (r.Deskripsi ? '<p class="hc-desc">' + esc(r.Deskripsi) + '</p>' : '') + '</a>';
  }
  function renderHist() {
    const box = $('#histBody'); if (!box) return;
    const base = histBase();
    const list = histFiltered(base).slice().sort(sortByTime);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const done = base.filter((r) => ['Resolved', 'Verified'].includes(r.Status));
    const durs = done.map((r) => mins(r.Started_At || r.Timestamp, r.Resolved_At)).filter((v) => v != null && v >= 0);
    const rates = base.map((r) => +r.Rating).filter(Boolean);
    const pct = base.length ? Math.round(done.length / base.length * 100) : 0;
    const cnt = (s) => base.filter((r) => r.Status === s).length;
    const late = base.filter(isLate).length;
    const f = S.filter;
    // Ringkasan + filter status yang bisa diketuk
    let html = '<div class="hsum">' +
      '<div class="hsum-top"><div><small>Total laporan</small><b>' + base.length + '</b></div>' +
      '<div class="ring" style="--p:' + pct + '"><span>' + pct + '%</span><small>selesai</small></div></div>' +
      '<div class="hsum-stats"><div><small>Rata² durasi</small><b>' + fmtDur(avg(durs)) + '</b></div>' +
      '<div><small>Rata² rating</small><b>' + (avg(rates) ? avg(rates).toFixed(1).replace('.', ',') + ' ★' : '—') + '</b></div>' +
      '<div><small>Terlambat</small><b class="' + (late ? 'bad' : '') + '">' + late + '</b></div></div>' +
      '<div class="hsum-st">' + [['', 'SEMUA', base.length]].concat(STATUSES.map((s) => [s, { 'Pending': 'TUNGGU', 'In Progress': 'PROSES', 'Resolved': 'SELESAI', 'Verified': 'VERIFIED' }[s], cnt(s)])).concat(late ? [['telat', 'TELAT', late]] : []).map((c) =>
        '<button class="hst ' + (c[0] ? (ST[c[0]] ? ST[c[0]].c : 'prio-Darurat') : '') + (f.status === c[0] ? ' on' : '') + '" data-act="setFilter" data-k="status" data-v="' + c[0] + '"><b>' + c[2] + '</b><span>' + c[1] + '</span></button>').join('') + '</div></div>';
    if (!list.length) {
      html += empty('🗂️', 'Tidak ada riwayat', f.q ? 'Tidak ada yang cocok dengan “' + f.q + '”' : 'Coba ganti periode atau filter');
    } else {
      // Kelompok per tanggal
      const shown = list.slice(0, f.limit);
      let curDay = '';
      html += '<p class="count">Menampilkan ' + shown.length + ' dari ' + list.length + ' laporan</p>';
      shown.forEach((r) => {
        const dl = dayLabel(r.Timestamp);
        if (dl !== curDay) {
          const n = list.filter((x) => dayLabel(x.Timestamp) === dl).length;
          html += '<h3 class="hday"><span>' + esc(dl) + '</span><em>' + n + '</em></h3>';
          curDay = dl;
        }
        html += histCard(r);
      });
      if (list.length > shown.length) html += '<button class="btn btn-ghost btn-xl" data-act="histMore">MUAT ' + Math.min(40, list.length - shown.length) + ' LAGI</button>';
    }
    box.innerHTML = html;
  }
  function viewList() {
    if (!S.filter) S.filter = defFilter({ scope: isApprover() ? 'all' : 'mine' });
    const f = S.filter;
    shell('History',
      '<div class="hsearch">' + ic('list') + '<input id="hq" type="search" placeholder="Cari ID, kategori, titik, petugas…" value="' + esc(f.q) + '">' +
      (isApprover() ? '<button class="iconbtn" data-act="exportCsv" aria-label="Unduh CSV" title="Unduh CSV">' + ic('download') + '</button>' : '') + '</div>' +
      (!isApprover() ? '<div class="seg sm">' + [['mine', role() === 'TKNO' ? 'Tugas Saya' : 'Laporan Saya'], ['all', 'Semua']].map((x) =>
        '<button class="' + (f.scope === x[0] ? 'on' : '') + '" data-act="setFilter" data-k="scope" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' : '') +
      '<div class="chips scroll">' + PERIODS.map((c) => '<button class="fchip ' + (f.period === c[0] ? 'on' : '') + '" data-act="setFilter" data-k="period" data-v="' + c[0] + '">' + ic('calendar') + ' ' + c[1] + '</button>').join('') + '</div>' +
      '<div class="chips scroll">' + [['', 'Semua Area']].concat(S.areas.map((a) => [a.ID_Area, a.ID_Area + ' · ' + a.Nama_Area])).map((c) =>
        '<button class="fchip ' + (f.area === c[0] ? 'on' : '') + '" data-act="setFilter" data-k="area" data-v="' + c[0] + '">' + esc(c[1]) + '</button>').join('') + '</div>' +
      '<div id="histBody"></div>');
    renderHist();
    let t;
    $('#hq').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { S.filter.q = e.target.value.trim(); S.filter.limit = 40; renderHist(); }, 250); };
  }
  function exportCsv() {
    const list = histFiltered(histBase()).slice().sort(sortByTime);
    const cols = ['ID_Laporan', 'Timestamp', 'ID_Area', 'Nama_Area', 'Titik', 'Kategori', 'Deskripsi', 'Prioritas', 'Status', 'Nama_Pelapor', 'Nama_Petugas', 'Started_At', 'Resolved_At', 'Verified_At', 'Rating', 'Feedback', 'Poin', 'Foto_Before_URL', 'Foto_After_URL'];
    const cell = (v) => { v = v == null ? '' : String(v); if (/^data:/.test(v)) v = '(belum terkirim)'; return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const csv = '﻿' + cols.join(',') + '\n' + list.map((r) => cols.map((c) => cell(r[c])).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const d = new Date(); a.download = 'History_5R_XFMR_' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    toast(list.length + ' laporan diunduh', 'ok');
  }

  /* =========================================================
   * VIEW: Detail laporan / tugas
   * ========================================================= */
  function viewDetail(id) {
    const r = S.reports.find((x) => x.ID_Laporan === id);
    if (!r) {
      if (id.indexOf('L-') === 0) {
        // Laporan offline sudah terkirim → pindah ke nomor resmi dari server
        XF.kv.get('idmap').then((m) => { if (m && m[id]) location.replace('#/r/' + encodeURIComponent(m[id])); });
      }
      return shell('Detail', empty('🔍', 'Laporan tidak ditemukan', 'Mungkin belum tersinkron.'), { back: true });
    }
    const a = areaById(r.ID_Area);
    const cat = catOf(r.Kategori);
    const mine = String(r.ID_Petugas) === me();
    const rk = role();
    const canTake = r.Status === 'Pending' && !r.ID_Petugas && (rk === 'TKNO' || rk === 'TKO');
    const canStart = r.Status === 'Pending' && (mine || canTake);
    const canResolve = r.Status === 'In Progress' && mine;
    const canVerify = r.Status === 'Resolved' && isApprover();
    const canAssign = ['Pending', 'In Progress'].includes(r.Status) && (isApprover() || (rk === 'TKO' && String(r.ID_Pelapor) === me()));
    const canRate = ['Resolved', 'Verified'].includes(r.Status) && String(r.ID_Pelapor) === me() && !r.Rating;
    const lat = parseFloat(r.Latitude) || parseFloat(a.Latitude), lng = parseFloat(r.Longitude) || parseFloat(a.Longitude);
    const steps = [
      ['Dilaporkan', r.Timestamp, r.Nama_Pelapor],
      ['Dikerjakan', r.Started_At, r.Nama_Petugas],
      ['Selesai', r.Resolved_At, r.Started_At && r.Resolved_At ? 'Durasi ' + fmtDur(mins(r.Started_At, r.Resolved_At)) : ''],
      ['Terverifikasi', r.Verified_At, r.ID_Verifikator ? userName(r.ID_Verifikator) : '']
    ];
    const photo = (url, label, cls) => '<figure class="ph ' + cls + '">' + (url ? '<img src="' + esc(url) + '" alt="' + label + '" data-act="zoom">' : '<div class="ph-empty">' + ic('camera') + '<span>Belum ada</span></div>') + '<figcaption>' + label + '</figcaption></figure>';

    let actions = '';
    if (canStart) actions += '<button class="btn btn-primary btn-xl" data-act="start" data-id="' + esc(r.ID_Laporan) + '">' + ic('play') + (canTake ? 'AMBIL & MULAI KERJAKAN' : 'MULAI KERJAKAN') + '</button>';
    if (canResolve) actions += '<button class="btn btn-ok btn-xl" data-act="resolve" data-id="' + esc(r.ID_Laporan) + '">' + ic('camera') + 'FOTO SESUDAH & SELESAI</button>';
    if ((canStart || canResolve) && !isNaN(lat)) actions += '<a class="btn btn-ghost btn-xl" target="_blank" rel="noopener" href="' + mapsUrl(lat, lng) + '">' + ic('nav') + 'NAVIGASI KE LOKASI</a>';
    if (canVerify) actions +=
      '<textarea id="resp" rows="2" placeholder="Tanggapan / catatan (opsional untuk setuju, wajib untuk tolak)"></textarea>' +
      '<div class="row2"><button class="btn btn-danger btn-xl" data-act="reject" data-id="' + esc(r.ID_Laporan) + '">' + ic('undo') + 'TOLAK</button>' +
      '<button class="btn btn-ok btn-xl" data-act="verify" data-id="' + esc(r.ID_Laporan) + '">' + ic('shield') + 'SETUJUI</button></div>';
    if (canAssign) actions += '<button class="btn btn-ghost" data-act="assign" data-id="' + esc(r.ID_Laporan) + '">' + ic('users') + (r.ID_Petugas ? 'GANTI PETUGAS / JOBDESK' : 'ATUR PETUGAS / JOBDESK') + '</button>';

    let rating = '';
    if (r.Rating) rating = '<div class="card"><div class="stars-v">' + '★★★★★'.slice(0, +r.Rating) + '<s>' + '★★★★★'.slice(+r.Rating) + '</s></div>' + (r.Feedback ? '<p>“' + esc(r.Feedback) + '”</p>' : '') + (r.Response ? '<p class="muted">↳ Tanggapan: ' + esc(r.Response) + '</p>' : '') + '</div>';
    else if (canRate) rating = '<div class="card rate"><b>Bagaimana hasilnya?</b><div class="stars" role="radiogroup">' + [1, 2, 3, 4, 5].map((n) => '<button data-act="star" data-n="' + n + '" aria-label="' + n + ' bintang">★</button>').join('') + '</div>' +
      '<div class="chips wrap">' + FEEDBACK_CHIPS.map((c) => '<button class="fchip" data-act="fbChip">' + c + '</button>').join('') + '</div>' +
      '<textarea id="fb" rows="2" placeholder="Masukan (opsional)"></textarea><button class="btn btn-primary btn-xl" data-act="rate" data-id="' + esc(r.ID_Laporan) + '">KIRIM RATING</button></div>';

    shell(r.ID_Laporan.indexOf('L-') === 0 ? 'Laporan Baru' : r.ID_Laporan,
      '<div class="dhead" style="--ac:' + areaColor(r.ID_Area) + '"><div class="rrow">' + statusChip(r.Status) +
      (r.Prioritas && r.Prioritas !== 'Normal' ? '<span class="chip prio-' + esc(r.Prioritas) + '">' + esc(r.Prioritas) + '</span>' : '') +
      (isLate(r) ? '<span class="chip prio-Darurat">TELAT</span>' : '') +
      (r._local || r._dirty ? '<span class="chip chip-sync">' + ic('cloud') + ' menunggu sinyal</span>' : '') + '</div>' +
      '<h2>' + cat.e + ' ' + esc(r.Kategori) + '</h2>' +
      '<p class="dloc">' + ic('pin') + '<b>' + esc(a.ID_Area) + ' · ' + esc(a.Nama_Area) + '</b>' + (r.Titik ? ' — ' + esc(r.Titik) : '') + '</p>' +
      (r.Deskripsi ? '<p class="ddesc">' + esc(r.Deskripsi) + '</p>' : '') +
      (r.Catatan ? '<div class="alert">↩️ <b>Catatan approver:</b> ' + esc(r.Catatan) + '</div>' : '') + '</div>' +
      '<div class="photos">' + photo(r.Foto_Before_URL, 'SEBELUM', 'before') + photo(r.Foto_After_URL, 'SESUDAH', 'after') + '</div>' +
      (actions ? '<div class="actions">' + actions + '</div>' : '') +
      rating +
      '<div class="card"><ol class="timeline">' + steps.map((s) => '<li class="' + (s[1] ? 'done' : '') + '"><b>' + s[0] + '</b><span>' + (s[1] ? fmtDate(s[1]) : '—') + (s[2] ? ' · ' + esc(s[2]) : '') + '</span></li>').join('') + '</ol></div>' +
      '<div class="card info">' +
      '<div><small>Pelapor</small><b>' + esc(r.Nama_Pelapor || userName(r.ID_Pelapor)) + '</b></div>' +
      '<div><small>Petugas</small><b>' + esc(r.Nama_Petugas || '—') + '</b></div>' +
      '<div><small>Batas waktu</small><b>' + (r.Deadline ? fmtDate(r.Deadline) : '—') + '</b></div>' +
      '<div><small>Sumber</small><b>' + esc(r.Sumber || 'LAPORAN') + '</b></div>' +
      (r.Poin ? '<div><small>Poin petugas</small><b>+' + esc(r.Poin) + '</b></div>' : '') +
      (!isNaN(lat) ? '<div><small>Koordinat</small><b><a target="_blank" rel="noopener" href="https://maps.google.com/?q=' + lat + ',' + lng + '">' + lat.toFixed(5) + ', ' + lng.toFixed(5) + '</a></b></div>' : '') +
      '</div>', { back: true, sub: fmtDate(r.Timestamp) });
  }

  /* =========================================================
   * VIEW: Lapor (wizard 3 langkah)
   * ========================================================= */
  function newDraft() {
    S.draft = { step: 1, foto: null, area: S.presetArea || '', titik: '', kategori: '', deskripsi: '', petugas: '', prioritas: 'Normal', deadline: '', pos: null, gps: 'loading', auto: false };
    S.presetArea = '';
    getPos(15000).then((p) => {
      if (!S.draft) return;
      S.draft.pos = p; S.draft.gps = p ? 'ok' : 'fail';
      const n = nearestArea(p);
      if (n && !S.draft.area && n.d <= (parseFloat(n.area.Radius_M) || 100)) { S.draft.area = n.area.ID_Area; S.draft.auto = true; S.draft.dist = n.d; }
      if (currentRoute().name === 'lapor') viewLapor();
    });
  }
  function viewLapor() {
    if (!S.draft) newDraft();
    const d = S.draft;
    const stepper = '<ol class="stepper">' + ['Foto', 'Lokasi', 'Detail'].map((t, i) => '<li class="' + (d.step > i + 1 ? 'done' : d.step === i + 1 ? 'cur' : '') + '"><b>' + (i + 1) + '</b>' + t + '</li>').join('') + '</ol>';
    let body = '';
    if (d.step === 1) {
      body = '<h3 class="q">📸 Foto area yang kotor</h3>' +
        (d.foto ? '<div class="shot"><img src="' + d.foto + '" alt="Foto sebelum"><button class="btn btn-ghost" data-act="takeBefore">' + ic('refresh') + 'ULANGI FOTO</button></div>'
          : '<button class="bigcam" data-act="takeBefore">' + ic('camera') + '<b>AMBIL FOTO SEBELUM</b><span>Wajib</span></button>') +
        '<button class="btn btn-primary btn-xl" data-act="step" data-n="2" ' + (d.foto ? '' : 'disabled') + '>LANJUT →</button>';
    } else if (d.step === 2) {
      const gps = d.gps === 'loading' ? '<div class="gps load">' + ic('pin') + ' Mencari lokasi GPS…</div>'
        : d.gps === 'ok' ? '<div class="gps ok">' + ic('pin') + ' Lokasi terkunci (±' + Math.round(d.pos.acc) + ' m)' + (d.auto ? ' · terdekat: <b>' + esc(areaShort(d.area)) + '</b>' : '') + '</div>'
          : '<div class="gps fail">' + ic('pin') + ' GPS tidak tersedia — pilih area manual <button class="link" data-act="retryGps">Coba lagi</button></div>';
      body = '<h3 class="q">📍 Di area mana?</h3>' + gps +
        (XFCam.qrSupported() ? '<button class="btn btn-ghost" data-act="scanQR">' + ic('qr') + 'SCAN QR AREA</button>' : '') +
        '<div class="area-pick">' + S.areas.map((a) => '<button class="apick ' + (d.area === a.ID_Area ? 'on' : '') + '" data-act="pickArea" data-id="' + esc(a.ID_Area) + '" style="--ac:' + areaColor(a.ID_Area) + '"><b>' + esc(a.ID_Area.replace('A', 'AREA ')) + '</b><span>' + esc(a.Nama_Area) + '</span></button>').join('') + '</div>' +
        (d.area && titikList(d.area).length ? '<h3 class="q sm">Titik / lokasi detail</h3><div class="chips wrap">' + titikList(d.area).map((t) => '<button class="fchip ' + (d.titik === t ? 'on' : '') + '" data-act="pickTitik" data-v="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' : '') +
        '<div class="row2"><button class="btn btn-ghost btn-xl" data-act="step" data-n="1">← KEMBALI</button><button class="btn btn-primary btn-xl" data-act="step" data-n="3" ' + (d.area ? '' : 'disabled') + '>LANJUT →</button></div>';
    } else {
      const canDelegate = role() === 'TKO' || isApprover();
      body = '<h3 class="q">🏷️ Jenis masalah</h3><div class="cats">' + CATS.map((c) => '<button class="cat ' + (d.kategori === c.k ? 'on' : '') + '" data-act="pickCat" data-v="' + esc(c.k) + '"><span>' + c.e + '</span>' + esc(c.k).replace('/', '/<wbr>') + '</button>').join('') + '</div>' +
        '<h3 class="q sm">Keterangan (opsional)</h3><div class="ta-wrap"><textarea id="desc" rows="3" placeholder="Contoh: Ada tumpahan oli di depan panel">' + esc(d.deskripsi) + '</textarea>' +
        (('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) ? '<button class="mic" data-act="dictate" aria-label="Bicara">' + ic('mic') + '</button>' : '') + '</div>' +
        (canDelegate ?
          '<h3 class="q sm">👷 Tugaskan ke (jobdesk)</h3><select id="petugas" class="sel"><option value="">— Semua petugas (siapa cepat) —</option>' +
          petugasList().filter((u) => u.roleKey === 'TKNO').concat(petugasList().filter((u) => u.roleKey !== 'TKNO')).map((u) => '<option value="' + esc(u.id) + '" ' + (String(d.petugas) === String(u.id) ? 'selected' : '') + '>' + esc(u.nama) + ' (' + u.roleKey + ')</option>').join('') + '</select>' +
          '<h3 class="q sm">Prioritas</h3><div class="chips">' + PRIO.map((p) => '<button class="fchip p-' + p + ' ' + (d.prioritas === p ? 'on' : '') + '" data-act="pickPrio" data-v="' + p + '">' + p + '</button>').join('') + '</div>' +
          '<h3 class="q sm">Batas waktu</h3><div class="chips">' + DEADLINES.map((o, i) => '<button class="fchip ' + (d.deadlineIdx === i ? 'on' : '') + '" data-act="pickDeadline" data-i="' + i + '">' + o.k + '</button>').join('') + '</div>' : '') +
        '<div class="row2"><button class="btn btn-ghost btn-xl" data-act="step" data-n="2">← KEMBALI</button><button class="btn btn-ok btn-xl" data-act="submitReport" ' + (d.kategori ? '' : 'disabled') + '>' + ic('check') + 'KIRIM</button></div>';
    }
    shell('Lapor Area Kotor', stepper + '<div class="wizard">' + body + '</div>', { back: true, noNav: true });
  }

  async function submitReport() {
    const d = S.draft;
    d.deskripsi = ($('#desc') || {}).value || d.deskripsi;
    const sel = $('#petugas');
    if (sel) d.petugas = sel.value;
    const a = areaById(d.area);
    const pt = d.petugas ? userById(d.petugas) : null;
    const payload = {
      areaId: d.area, titik: d.titik, kategori: d.kategori, deskripsi: d.deskripsi,
      fotoBefore: d.foto, lat: d.pos ? d.pos.lat : '', lng: d.pos ? d.pos.lng : '', acc: d.pos ? d.pos.acc : '',
      petugasId: d.petugas || '', prioritas: d.prioritas, deadline: d.deadline || ''
    };
    const cid = await XF.enqueue('createReport', payload, {
      create: (cid) => ({
        ID_Laporan: 'L-' + cid, ID_Pelapor: me(), Nama_Pelapor: S.user.nama, ID_Area: d.area, Nama_Area: a.Nama_Area,
        Titik: d.titik, Kategori: d.kategori, Deskripsi: d.deskripsi, Prioritas: d.prioritas, Deadline: d.deadline,
        Foto_Before_URL: d.foto, Latitude: payload.lat, Longitude: payload.lng, Status: 'Pending',
        ID_Petugas: d.petugas || '', Nama_Petugas: pt ? pt.nama : '', Timestamp: new Date().toISOString(), Sumber: 'LAPORAN'
      })
    });
    S.draft = null;
    toast(navigator.onLine ? 'Laporan dikirim ✓' : 'Tersimpan offline — dikirim otomatis saat ada sinyal', 'ok');
    await loadLocal();
    location.hash = '#/r/' + encodeURIComponent('L-' + cid);
    refresh();
  }

  /* =========================================================
   * VIEW: Jadwal (Approver)
   * ========================================================= */
  function viewJadwal() {
    if (!isApprover()) return shell('Jadwal', empty('🔒', 'Khusus Approver'), {});
    const byArea = S.areas.map((a) => {
      const list = S.schedules.filter((s) => s.ID_Area === a.ID_Area);
      return '<div class="card sched" style="--ac:' + areaColor(a.ID_Area) + '"><h3>' + esc(a.ID_Area) + ' · ' + esc(a.Nama_Area) + '</h3>' +
        (list.length ? list.map((s) => '<div class="srow ' + (String(s.Aktif).toUpperCase() === 'FALSE' ? 'off' : '') + '"><div><b>' + catOf(s.Kategori).e + ' ' + esc(s.Kategori) + (s.Titik ? ' — ' + esc(s.Titik) : '') + '</b>' +
          '<span>' + ic('calendar') + esc(s.Hari) + ' · ' + esc(s.Jam || '07:00') + ' · ' + ic('user') + esc(s.ID_Petugas ? userName(s.ID_Petugas) : 'Semua petugas') + '</span></div>' +
          '<button class="iconbtn danger" data-act="delSched" data-id="' + esc(s.ID_Jadwal) + '" aria-label="Hapus">' + ic('trash') + '</button></div>').join('') : '<p class="muted">Belum ada jadwal rutin</p>') + '</div>';
    }).join('');
    shell('Jadwal Kebersihan', '<p class="hint">Jadwal rutin otomatis dibuat menjadi tugas setiap pagi (05.30) dan dikirim ke petugas.</p>' +
      '<button class="btn btn-primary btn-xl" data-act="addSched">' + ic('plus') + 'TAMBAH JADWAL</button>' + byArea +
      (role() === 'ADMIN' ? '<button class="btn btn-ghost" data-act="runSched">' + ic('play') + 'Buat tugas jadwal hari ini sekarang</button>' : ''));
  }

  function sheet(html, onMount) {
    const el = document.createElement('div');
    el.className = 'sheet-wrap';
    el.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div>';
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-close]')) el.remove(); });
    document.body.appendChild(el);
    if (onMount) onMount(el);
    return el;
  }

  function schedForm() {
    let days = ['Setiap Hari'];
    sheet('<h3>Tambah Jadwal Rutin</h3><form id="fS" class="form">' +
      '<label>Area</label><select name="area" class="sel" required>' + S.areas.map((a) => '<option value="' + esc(a.ID_Area) + '">' + esc(a.ID_Area + ' · ' + a.Nama_Area) + '</option>').join('') + '</select>' +
      '<label>Titik (opsional)</label><select name="titik" class="sel"></select>' +
      '<label>Kegiatan</label><select name="kategori" class="sel">' + CATS.map((c) => '<option>' + esc(c.k) + '</option>').join('') + '</select>' +
      '<label>Keterangan</label><input name="desk" placeholder="Contoh: Sapu & pel lantai CCR">' +
      '<label>Hari</label><div class="chips wrap" id="days">' + DAYS.map((dname) => '<button type="button" class="fchip ' + (dname === 'Setiap Hari' ? 'on' : '') + '" data-d="' + dname + '">' + dname + '</button>').join('') + '</div>' +
      '<label>Jam</label><input name="jam" type="time" value="07:00">' +
      '<label>Petugas</label><select name="petugas" class="sel"><option value="">— Semua petugas —</option>' + petugasList().map((u) => '<option value="' + esc(u.id) + '">' + esc(u.nama) + ' (' + u.roleKey + ')</option>').join('') + '</select>' +
      '<div class="row2"><button type="button" class="btn btn-ghost btn-xl" data-close>BATAL</button><button class="btn btn-primary btn-xl">SIMPAN</button></div></form>', (el) => {
      const f = $('#fS', el);
      const fillTitik = () => { f.titik.innerHTML = '<option value="">— Seluruh area —</option>' + titikList(f.area.value).map((t) => '<option>' + esc(t) + '</option>').join(''); };
      fillTitik(); f.area.onchange = fillTitik;
      $('#days', el).onclick = (e) => {
        const b = e.target.closest('[data-d]'); if (!b) return;
        const v = b.dataset.d;
        if (v === 'Setiap Hari') days = ['Setiap Hari'];
        else { days = days.filter((x) => x !== 'Setiap Hari'); days = days.includes(v) ? days.filter((x) => x !== v) : days.concat(v); if (!days.length) days = ['Setiap Hari']; }
        el.querySelectorAll('#days .fchip').forEach((c) => c.classList.toggle('on', days.includes(c.dataset.d)));
      };
      f.onsubmit = async (e) => {
        e.preventDefault();
        const s = { ID_Jadwal: 'J-' + XF.uid().slice(0, 8), ID_Area: f.area.value, Titik: f.titik.value, Kategori: f.kategori.value, Deskripsi: f.desk.value, Hari: days.join(','), Jam: f.jam.value, ID_Petugas: f.petugas.value, Aktif: true };
        await XF.enqueue('saveSchedule', { schedule: s });
        S.schedules.push(s); await XF.kv.set('schedules', S.schedules);
        el.remove(); toast('Jadwal disimpan', 'ok'); viewJadwal(); refresh();
      };
    });
  }

  /* =========================================================
   * VIEW: Peringkat & Gamifikasi
   * ========================================================= */
  function leaderboard(tab, period) {
    const from = period === 'month' ? monthStart() : new Date(0);
    const m = {};
    const get = (id, nama) => (m[id] = m[id] || { id: id, nama: nama || userName(id), poin: 0, tasks: 0, dur: 0, durN: 0, rate: 0, rateN: 0 });
    S.reports.forEach((r) => {
      if (r.Status !== 'Verified') return;
      if (new Date(r.Verified_At || r.Resolved_At || r.Timestamp) < from) return;
      if (r.ID_Petugas) {
        const p = get(String(r.ID_Petugas), r.Nama_Petugas);
        p.poin += +r.Poin || 0; p.tasks++;
        const d = mins(r.Started_At || r.Timestamp, r.Resolved_At);
        if (d != null && d >= 0) { p.dur += d; p.durN++; }
        if (+r.Rating) { p.rate += +r.Rating; p.rateN++; }
      }
      if (r.ID_Pelapor && +r.Poin_Pelapor) get(String(r.ID_Pelapor), r.Nama_Pelapor).poin += +r.Poin_Pelapor;
    });
    let arr = Object.values(m);
    if (tab === 'cepat') arr = arr.filter((p) => p.durN >= 3).map((p) => Object.assign(p, { v: p.dur / p.durN })).sort((a, b) => a.v - b.v);
    else if (tab === 'bersih') arr = arr.filter((p) => p.rateN >= 3).map((p) => Object.assign(p, { v: p.rate / p.rateN })).sort((a, b) => b.v - a.v || b.rateN - a.rateN);
    else arr = arr.filter((p) => p.poin > 0).map((p) => Object.assign(p, { v: p.poin })).sort((a, b) => b.v - a.v);
    return arr;
  }
  function rankRow(p, i, tab) {
    const medal = ['🥇', '🥈', '🥉'][i] || '<span class="rn">' + (i + 1) + '</span>';
    const v = tab === 'cepat' ? fmtDur(p.v) : tab === 'bersih' ? p.v.toFixed(2).replace('.', ',') + ' ⭐' : p.v + ' poin';
    return '<div class="rank ' + (String(p.id) === me() ? 'me' : '') + '"><span class="medal">' + medal + '</span><div class="avatar sm">' + initials(p.nama) + '</div><div class="rk-n"><b>' + esc(p.nama) + '</b><small>' + p.tasks + ' tugas</small></div><b class="rk-v">' + v + '</b></div>';
  }
  function myBadges() {
    const id = me();
    const done = S.reports.filter((r) => String(r.ID_Petugas) === id && r.Status === 'Verified');
    const durs = done.map((r) => mins(r.Started_At || r.Timestamp, r.Resolved_At)).filter((v) => v != null && v >= 0);
    const rates = done.map((r) => +r.Rating).filter(Boolean);
    const avg = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
    const reportsValid = S.reports.filter((r) => String(r.ID_Pelapor) === id && r.Status === 'Verified').length;
    const lb = leaderboard('poin', 'month');
    return {
      kilat: durs.length >= 5 && avg(durs) <= 60,
      bintang: rates.length >= 5 && avg(rates) >= 4.5,
      rajin: done.length >= 20,
      master: done.length >= 50,
      pelapor: reportsValid >= 10,
      juara: lb.length > 0 && String(lb[0].id) === id
    };
  }
  function badgeGrid() {
    const b = myBadges();
    return '<div class="badges">' + BADGES.map((x) => '<div class="badge ' + (b[x.k] ? 'got' : '') + '" title="' + esc(x.d) + '"><span>' + x.e + '</span><b>' + x.n + '</b><small>' + esc(x.d) + '</small></div>').join('') + '</div>';
  }
  function viewRank() {
    const t = S.rank.tab, p = S.rank.period;
    const lb = leaderboard(t, p);
    const tabs = [['poin', '🏆 Poin'], ['cepat', '⚡ Tercepat'], ['bersih', '⭐ Terbersih']];
    const podium = lb.slice(0, 3);
    shell('Peringkat',
      '<div class="seg">' + tabs.map((x) => '<button class="' + (t === x[0] ? 'on' : '') + '" data-act="rankTab" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      '<div class="seg sm">' + [['month', 'Bulan Ini'], ['all', 'Sepanjang Waktu']].map((x) => '<button class="' + (p === x[0] ? 'on' : '') + '" data-act="rankPeriod" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      (podium.length ? '<div class="podium">' + [1, 0, 2].filter((i) => podium[i]).map((i) => '<div class="pod p' + (i + 1) + '"><div class="avatar">' + initials(podium[i].nama) + '</div><b>' + esc(podium[i].nama.split(' ')[0]) + '</b><span>' + ['🥇', '🥈', '🥉'][i] + '</span><div class="block">' + (i + 1) + '</div></div>').join('') + '</div>' : '') +
      (lb.length ? '<div class="card">' + lb.map((x, i) => rankRow(x, i, t)).join('') + '</div>' : empty('🏁', 'Belum ada data peringkat', t === 'poin' ? 'Poin didapat setelah tugas diverifikasi.' : 'Minimal 3 tugas/rating untuk masuk peringkat.')) +
      section('Lencana Saya', badgeGrid()) +
      '<div class="card rules"><b>Cara dapat poin</b><ul><li>Tugas terverifikasi: <b>+10</b></li><li>Selesai ≤ 60 mnt: <b>+10</b> • ≤ 4 jam: <b>+5</b></li><li>Rating dari pelapor: <b>+2 × bintang</b></li><li>Prioritas Darurat: <b>+5</b></li><li>Pelapor (laporan valid): <b>+3</b></li></ul></div>');
  }

  /* =========================================================
   * Deskripsi Area (dari Profil Gugus 5R XFMR)
   * ========================================================= */
  const AREA_INFO = {
    A1: { icon: '🖥️', koor: 'Taufiqur Rahman', fungsi: 'Central Control Room', desc: 'Ruang kendali utama Pabrik Asam Sulfat & Utilitas 3B: panel operasi, meja pelaporan, meja rapat, dan SASU 3B Learning Hub. Area kerja operator 24 jam dan area kunjungan tamu.', fokus: ['Meja panel bebas debu', 'APD & sepatu tamu tertata', 'Jalur pintu SA/SU bebas halangan', 'APAR siap pakai'] },
    A2: { icon: '🍳', koor: 'Ahmad Afandi', fungsi: 'Ruang istirahat & dapur operator', desc: 'Barak dengan dapur, meja makan, musala, loker, area cuci-jemur & wudhu, kamar mandi, serta lorong hall of fame menuju CCR.', fokus: ['Dapur & meja makan bersih', 'Kamar mandi kering & wangi', 'Loker & gantungan PDL rapi', 'Area wudhu tidak tergenang'] },
    A3: { icon: '🛏️', koor: 'Purnawan', fungsi: 'Barak lantai dasar (ground floor)', desc: 'Barak operator lantai dasar: musala, meja operator, kursi istirahat, loker, lemari peralatan kerja, dapur kecil, area sanitasi dan area jemur.', fokus: ['Musala bersih & rapi', 'Lemari peralatan tertata', 'Area sanitasi higienis', 'Akuarium & kulkas terawat'] }
  };
  function areaPhotoCards() {
    return '<div class="aphoto-list">' + S.areas.map((a) => {
      const info = AREA_INFO[a.ID_Area] || { icon: '📍', fungsi: '' };
      const rs = S.reports.filter((r) => r.ID_Area === a.ID_Area);
      const open = rs.filter((r) => ['Pending', 'In Progress'].includes(r.Status)).length;
      const photos = [];
      rs.forEach((r) => {
        if (r.Foto_After_URL) photos.push({ url: r.Foto_After_URL, kind: 'SESUDAH', t: r.Resolved_At || r.Updated_At || r.Timestamp, r: r });
        if (r.Foto_Before_URL) photos.push({ url: r.Foto_Before_URL, kind: 'SEBELUM', t: r.Timestamp, r: r });
      });
      photos.sort((x, y) => new Date(y.t) - new Date(x.t));
      const hero = photos[0];
      const rest = photos.slice(1, 13);
      const link = (p) => '#/r/' + encodeURIComponent(p.r.ID_Laporan);
      const cap = (p) => '<span class="ap-k ' + (p.kind === 'SESUDAH' ? 'ok' : 'bad') + '">' + p.kind + '</span>';
      return '<article class="aphoto" style="--ac:' + areaColor(a.ID_Area) + '">' +
        '<header><span class="ai-ic">' + info.icon + '</span><div><small>' + esc(a.ID_Area.replace('A', 'AREA ')) + '</small><h3>' + esc(a.Nama_Area) + '</h3>' +
        '<span class="ai-fn">' + (photos.length ? photos.length + ' foto · terbaru ' + timeAgo(hero.t) : 'Belum ada foto') + '</span></div>' +
        '<span class="ai-st ' + (open ? 'warn' : 'ok') + '">' + (open ? open + ' kotor' : '✓ Bersih') + '</span></header>' +
        (hero ? '<a class="ap-hero" href="' + link(hero) + '"><img loading="lazy" src="' + esc(hero.url) + '" alt="Foto terbaru ' + esc(a.Nama_Area) + '">' +
          '<div class="ap-ov">' + cap(hero) + '<b>' + catOf(hero.r.Kategori).e + ' ' + esc(hero.r.Kategori) + (hero.r.Titik ? ' — ' + esc(hero.r.Titik) : '') + '</b>' +
          '<small>' + ic('clock') + fmtDate(hero.t) + (hero.r.Nama_Petugas && hero.kind === 'SESUDAH' ? ' · ' + esc(hero.r.Nama_Petugas) : '') + '</small></div></a>'
          : '<div class="ap-empty">' + ic('camera') + '<span>Belum ada foto di area ini</span></div>') +
        (rest.length ? '<div class="ap-strip">' + rest.map((p) => '<a href="' + link(p) + '" class="ap-th"><img loading="lazy" src="' + esc(p.url) + '" alt="">' + cap(p) +
          '<small>' + timeAgo(p.t) + '</small></a>').join('') + '</div>' : '') +
        '<div class="row2"><button class="btn btn-primary" data-act="laporArea" data-id="' + esc(a.ID_Area) + '">' + ic('camera') + 'LAPOR</button>' +
        '<button class="btn btn-ghost" data-act="historyArea" data-id="' + esc(a.ID_Area) + '">' + ic('list') + 'HISTORY</button></div>' +
        '</article>';
    }).join('') + '</div>';
  }

  /* =========================================================
   * VIEW: Profil
   * ========================================================= */
  async function viewProfil() {
    const errs = (await XF.kv.get('syncErrors')) || [];
    const ps = XFPush.status();
    const pts = leaderboard('poin', 'all').find((p) => String(p.id) === me());
    const standalone = XFPush.isStandalone();
    shell('Profil Saya',
      '<div class="card prof"><div class="avatar lg">' + initials(S.user.nama) + '</div><b>' + esc(S.user.nama) + '</b><span>NIK ' + esc(S.user.nik || S.user.id) + '</span><span class="role">' + esc(ROLE_LABEL[role()] || S.user.role) + '</span>' +
      '<div class="pts"><b>' + (pts ? pts.poin : 0) + '</b><small>Total poin</small></div></div>' +
      section('📸 Foto Terbaru Di Tiap-Tiap Area', areaPhotoCards()) +
      section('Pengaturan',
        '<div class="card list">' +
        '<button class="li" data-act="enablePush">' + ic('bell') + '<div><b>Notifikasi</b><small>' + ({ granted: 'Aktif ✓', denied: 'Diblokir — buka pengaturan browser', default: 'Ketuk untuk mengaktifkan', unsupported: 'Tidak didukung', 'ios-install': 'iPhone: pasang ke Layar Utama dulu' }[ps] || ps) + (XFPush.fcm ? '' : ' • mode lokal') + '</small></div></button>' +
        '<button class="li" data-act="syncNow">' + ic('refresh') + '<div><b>Sinkronkan sekarang</b><small>' + (S.pending ? S.pending + ' data menunggu dikirim' : 'Semua data terkirim ✓') + '</small></div></button>' +
        (!standalone ? '<button class="li" data-act="install">' + ic('download') + '<div><b>Pasang Aplikasi</b><small>' + (XFPush.isIOS() ? 'Safari: Bagikan ⬆️ → Tambah ke Layar Utama' : 'Tambahkan ke layar utama HP') + '</small></div></button>' : '') +
        '<button class="li danger" data-act="logout">' + ic('logout') + '<div><b>Keluar</b><small>' + esc(S.user.nama) + '</small></div></button>' +
        '</div>') +
      (errs.length ? section('Riwayat gagal kirim', '<div class="card">' + errs.slice(-5).reverse().map((e) => '<p class="muted">• ' + fmtDate(e.at) + ' — ' + esc(e.action) + ': ' + esc(e.error) + '</p>').join('') + '</div>') : '') +
      (isApprover() ? section('Koordinat Area (GPS)', '<div class="card">' + S.areas.map((a) => '<div class="srow"><div><b>' + esc(a.ID_Area + ' · ' + a.Nama_Area) + '</b><span>' + (a.Latitude ? esc((+a.Latitude).toFixed(5) + ', ' + (+a.Longitude).toFixed(5)) + ' · radius ' + esc(a.Radius_M || 100) + ' m' : 'Belum diatur') + '</span></div>' +
        '<button class="btn btn-ghost sm" data-act="setCoord" data-id="' + esc(a.ID_Area) + '">' + ic('pin') + 'Set di sini</button></div>').join('') + '<p class="hint">Berdiri di tengah area, lalu ketuk “Set di sini”.</p></div>') : '') +
      '<p class="foot">5R XFMR v1.0 • ' + esc(C.UNIT || '') + '</p>');
  }

  /* =========================================================
   * Router
   * ========================================================= */
  function render() {
    if (!S.user) return viewLogin();
    const r = currentRoute();
    if (r.name !== 'lapor') S.draft = null;
    switch (r.name) {
      case 'lapor': return viewLapor();
      case 'r': return viewDetail(r.arg);
      case 'laporan': return viewList();
      case 'jadwal': return viewJadwal();
      case 'peringkat': return viewRank();
      case 'profil': return viewProfil();
      default: return viewHome();
    }
  }
  function softRender() {
    const r = currentRoute().name;
    const a = document.activeElement;
    if (!S.user || r === 'lapor' || document.querySelector('.sheet-wrap, .cam')) return;
    if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.tagName === 'SELECT')) return;
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }

  /* =========================================================
   * Aksi (event delegation)
   * ========================================================= */
  async function patchReport(action, id, payload, patch) {
    await XF.enqueue(action, Object.assign({ id: id }, payload || {}), { id: id, patch: patch });
    await loadLocal();
    render();
    refresh();
  }
  const camMeta = (r, label) => ({ label: label, area: r ? areaShort(r.ID_Area) : '', coords: null });

  const ACT = {
    back: () => (history.length > 1 ? history.back() : (location.hash = '#/')),
    togglePw: (b) => { const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'LIHAT' : 'TUTUP'; },
    syncNow: () => { if (!navigator.onLine) return toast('Belum ada sinyal. Data aman tersimpan di HP.', 'err'); toast('Menyinkronkan…'); refresh({ manual: true, boot: true }); },
    setFilter: (b) => { S.filter[b.dataset.k] = b.dataset.v; S.filter.limit = 40; viewList(); },
    laporArea: (b) => { S.presetArea = b.dataset.id; S.draft = null; location.hash = '#/lapor'; },
    historyArea: (b) => { S.filter = defFilter({ area: b.dataset.id, scope: 'all', period: 'month' }); location.hash = '#/laporan'; },
    histMore: () => { S.filter.limit += 40; renderHist(); },
    exportCsv: () => exportCsv(),
    filterArea: (b, e) => { e.preventDefault(); S.filter = defFilter({ area: b.dataset.id, scope: 'all', period: 'all', status: 'aktif' }); location.hash = '#/laporan'; },
    filterStatus: (b, e) => { e.preventDefault(); S.filter = defFilter({ status: b.dataset.s, scope: 'all', period: 'all' }); location.hash = '#/laporan'; },
    zoom: (img) => sheet('<img class="zoom" src="' + esc(img.src) + '" alt=""><button class="btn btn-ghost btn-xl" data-close>TUTUP</button>'),

    /* --- Lapor wizard --- */
    takeBefore: async () => {
      const shot = await XFCam.openCamera({ title: 'Foto SEBELUM', meta: { label: 'SEBELUM', coords: S.draft && S.draft.pos } });
      if (shot && S.draft) { S.draft.foto = shot; viewLapor(); }
    },
    step: (b) => { S.draft.deskripsi = ($('#desc') || {}).value || S.draft.deskripsi; const sel = $('#petugas'); if (sel) S.draft.petugas = sel.value; S.draft.step = +b.dataset.n; viewLapor(); },
    retryGps: () => { S.draft.gps = 'loading'; viewLapor(); getPos(15000).then((p) => { if (!S.draft) return; S.draft.pos = p; S.draft.gps = p ? 'ok' : 'fail'; viewLapor(); }); },
    pickArea: (b) => { S.draft.area = b.dataset.id; S.draft.titik = ''; S.draft.auto = false; viewLapor(); },
    pickTitik: (b) => { S.draft.titik = S.draft.titik === b.dataset.v ? '' : b.dataset.v; viewLapor(); },
    pickCat: (b) => { S.draft.deskripsi = ($('#desc') || {}).value || ''; const sel = $('#petugas'); if (sel) S.draft.petugas = sel.value; S.draft.kategori = b.dataset.v; viewLapor(); },
    pickPrio: (b) => { S.draft.deskripsi = ($('#desc') || {}).value || ''; const sel = $('#petugas'); if (sel) S.draft.petugas = sel.value; S.draft.prioritas = b.dataset.v; viewLapor(); },
    pickDeadline: (b) => {
      S.draft.deskripsi = ($('#desc') || {}).value || ''; const sel = $('#petugas'); if (sel) S.draft.petugas = sel.value;
      const i = +b.dataset.i;
      if (S.draft.deadlineIdx === i) { S.draft.deadlineIdx = null; S.draft.deadline = ''; } else { S.draft.deadlineIdx = i; S.draft.deadline = deadlineFrom(DEADLINES[i]); }
      viewLapor();
    },
    scanQR: async () => {
      const code = await XFCam.scanQR();
      if (!code) return;
      const a = S.areas.find((x) => String(x.QR_Code_ID).trim() === code.trim());
      if (!a) return toast('QR tidak dikenal: ' + code, 'err');
      S.draft.area = a.ID_Area; S.draft.titik = ''; S.draft.auto = false;
      toast('Area: ' + a.Nama_Area, 'ok'); viewLapor();
    },
    dictate: (b) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR(); rec.lang = 'id-ID'; rec.interimResults = false;
      b.classList.add('rec');
      rec.onresult = (e) => { const ta = $('#desc'); ta.value = (ta.value ? ta.value + ' ' : '') + e.results[0][0].transcript; };
      rec.onend = () => b.classList.remove('rec');
      rec.onerror = () => { b.classList.remove('rec'); toast('Suara tidak terdengar, coba lagi', 'err'); };
      rec.start();
    },
    submitReport: (b) => { b.disabled = true; submitReport(); },

    /* --- Tugas --- */
    take: async (b, e) => { e.preventDefault(); e.stopPropagation(); location.hash = '#/r/' + encodeURIComponent(b.dataset.id); },
    start: async (b) => {
      const id = b.dataset.id;
      const r = S.reports.find((x) => x.ID_Laporan === id);
      let fotoBefore = null;
      if (!r.Foto_Before_URL) {
        toast('Ambil foto SEBELUM dibersihkan');
        fotoBefore = await XFCam.openCamera({ title: 'Foto SEBELUM', meta: camMeta(r, 'SEBELUM') });
        if (!fotoBefore) return;
      }
      const patch = { Status: 'In Progress', Started_At: new Date().toISOString() };
      if (!r.ID_Petugas) { patch.ID_Petugas = me(); patch.Nama_Petugas = S.user.nama; }
      if (fotoBefore) patch.Foto_Before_URL = fotoBefore;
      await patchReport('start', id, fotoBefore ? { fotoBefore: fotoBefore } : {}, patch);
      toast('Tugas dimulai — semangat! 💪', 'ok');
    },
    resolve: async (b) => {
      const id = b.dataset.id;
      const r = S.reports.find((x) => x.ID_Laporan === id);
      const foto = await XFCam.openCamera({ title: 'Foto SESUDAH', meta: camMeta(r, 'SESUDAH') });
      if (!foto) return toast('Foto SESUDAH wajib', 'err');
      const pos = await getPos(6000);
      await patchReport('resolve', id, { fotoAfter: foto, lat: pos ? pos.lat : '', lng: pos ? pos.lng : '' }, { Status: 'Resolved', Foto_After_URL: foto, Resolved_At: new Date().toISOString() });
      toast('Tugas selesai ✓ menunggu verifikasi', 'ok');
    },
    verify: async (b) => {
      const resp = ($('#resp') || {}).value || '';
      await patchReport('verify', b.dataset.id, { response: resp }, { Status: 'Verified', Verified_At: new Date().toISOString(), ID_Verifikator: me(), Response: resp });
      toast('Diverifikasi ✓', 'ok');
    },
    reject: async (b) => {
      const note = (($('#resp') || {}).value || '').trim();
      if (!note) { $('#resp').focus(); return toast('Tulis alasan penolakan dulu', 'err'); }
      await patchReport('reject', b.dataset.id, { note: note }, { Status: 'In Progress', Resolved_At: '', Foto_After_URL: '', Catatan: note });
      toast('Dikembalikan ke petugas', 'ok');
    },
    assign: (b) => {
      const id = b.dataset.id;
      const r = S.reports.find((x) => x.ID_Laporan === id);
      let prio = r.Prioritas || 'Normal', dl = r.Deadline || '';
      sheet('<h3>Atur Petugas & Jobdesk</h3><div class="pick-list">' + petugasList().map((u) => '<label class="pu"><input type="radio" name="pu" value="' + esc(u.id) + '" ' + (String(r.ID_Petugas) === String(u.id) ? 'checked' : '') + '><span class="avatar sm">' + initials(u.nama) + '</span><b>' + esc(u.nama) + '</b><small>' + u.roleKey + '</small></label>').join('') + '</div>' +
        '<label class="lbl">Prioritas</label><div class="chips" id="pp">' + PRIO.map((p) => '<button class="fchip p-' + p + ' ' + (prio === p ? 'on' : '') + '" data-p="' + p + '">' + p + '</button>').join('') + '</div>' +
        '<label class="lbl">Batas waktu</label><div class="chips" id="dd">' + DEADLINES.map((o, i) => '<button class="fchip" data-i="' + i + '">' + o.k + '</button>').join('') + '</div>' +
        '<div class="row2"><button class="btn btn-ghost btn-xl" data-close>BATAL</button><button class="btn btn-primary btn-xl" id="okA">SIMPAN</button></div>', (el) => {
        $('#pp', el).onclick = (e) => { const x = e.target.closest('[data-p]'); if (!x) return; prio = x.dataset.p; el.querySelectorAll('#pp .fchip').forEach((c) => c.classList.toggle('on', c === x)); };
        $('#dd', el).onclick = (e) => { const x = e.target.closest('[data-i]'); if (!x) return; dl = deadlineFrom(DEADLINES[+x.dataset.i]); el.querySelectorAll('#dd .fchip').forEach((c) => c.classList.toggle('on', c === x)); };
        $('#okA', el).onclick = async () => {
          const sel = el.querySelector('input[name=pu]:checked');
          if (!sel) return toast('Pilih petugas', 'err');
          const u = userById(sel.value);
          el.remove();
          await patchReport('assign', id, { petugasId: sel.value, prioritas: prio, deadline: dl }, { ID_Petugas: sel.value, Nama_Petugas: u ? u.nama : '', Prioritas: prio, Deadline: dl });
          toast('Ditugaskan ke ' + (u ? u.nama : sel.value), 'ok');
        };
      });
    },
    star: (b) => {
      const n = +b.dataset.n;
      b.parentElement.dataset.v = n;
      b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', +x.dataset.n <= n));
    },
    fbChip: (b) => { const ta = $('#fb'); ta.value = (ta.value ? ta.value + ', ' : '') + b.textContent; b.classList.add('on'); },
    rate: async (b) => {
      const n = +($('.stars').dataset.v || 0);
      if (!n) return toast('Pilih jumlah bintang dulu', 'err');
      const fb = ($('#fb') || {}).value || '';
      await patchReport('rate', b.dataset.id, { rating: n, feedback: fb }, { Rating: n, Feedback: fb });
      toast('Terima kasih atas penilaiannya! ⭐', 'ok');
    },

    /* --- Jadwal --- */
    addSched: () => schedForm(),
    delSched: async (b) => {
      if (!confirm('Hapus jadwal ini?')) return;
      S.schedules = S.schedules.filter((s) => s.ID_Jadwal !== b.dataset.id);
      await XF.kv.set('schedules', S.schedules);
      await XF.enqueue('deleteSchedule', { scheduleId: b.dataset.id });
      viewJadwal(); refresh();
    },
    runSched: async () => {
      try { const d = await XF.api('runSchedules', {}); toast(d.created + ' tugas dibuat', 'ok'); refresh(); } catch (e) { toast(e.message, 'err'); }
    },

    /* --- Peringkat --- */
    rankTab: (b) => { S.rank.tab = b.dataset.v; viewRank(); },
    rankPeriod: (b) => { S.rank.period = b.dataset.v; viewRank(); },

    /* --- Profil --- */
    enablePush: async () => {
      try { const m = await XFPush.enable(); toast(m === 'fcm' ? 'Notifikasi push aktif ✓' : 'Notifikasi aktif ✓ (mode lokal)', 'ok'); } catch (e) { toast(e.message, 'err'); }
      viewProfil();
    },
    install: async () => {
      if (S.installEvt) { S.installEvt.prompt(); await S.installEvt.userChoice; S.installEvt = null; viewProfil(); }
      else sheet('<h3>Pasang ke Layar Utama</h3>' + (XFPush.isIOS()
        ? '<ol class="howto"><li>Buka di <b>Safari</b></li><li>Ketuk tombol <b>Bagikan ⬆️</b></li><li>Pilih <b>Tambah ke Layar Utama</b></li><li>Buka 5R XFMR dari ikon baru</li></ol>'
        : '<ol class="howto"><li>Ketuk menu <b>⋮</b> di Chrome</li><li>Pilih <b>Instal aplikasi</b> / <b>Tambahkan ke layar utama</b></li><li>Buka 5R XFMR dari ikon baru</li></ol>') + '<button class="btn btn-primary btn-xl" data-close>MENGERTI</button>');
    },
    setCoord: async (b) => {
      toast('Mengambil lokasi…');
      const p = await getPos(20000);
      if (!p) return toast('GPS tidak tersedia', 'err');
      if (p.acc > 60 && !confirm('Akurasi GPS ±' + Math.round(p.acc) + ' m (kurang akurat). Tetap simpan?')) return;
      const a = S.areas.find((x) => x.ID_Area === b.dataset.id);
      a.Latitude = p.lat; a.Longitude = p.lng;
      await XF.kv.set('areas', S.areas);
      await XF.enqueue('setAreaCoord', { areaId: a.ID_Area, lat: p.lat, lng: p.lng });
      toast('Koordinat ' + a.ID_Area + ' disimpan', 'ok'); viewProfil(); refresh();
    },
    logout: async () => {
      if (S.pending && !confirm(S.pending + ' data belum terkirim dan akan hilang. Tetap keluar?')) return;
      try { if (navigator.onLine) await XF.api('logout', {}); } catch (_) { /* abaikan */ }
      await XF.kv.clear(); await XF.outbox.clear(); await XF.reports.clear();
      S.user = null; location.hash = '#/'; render();
    }
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !ACT[b.dataset.act]) return;
    if (b.tagName === 'A' && b.dataset.act !== 'filterArea' && b.dataset.act !== 'filterStatus') { /* link biasa */ }
    ACT[b.dataset.act](b, e);
  });

  /* =========================================================
   * Boot
   * ========================================================= */
  window.addEventListener('hashchange', render);
  window.addEventListener('online', () => { toast('Sinyal kembali — menyinkronkan…', 'ok'); refresh(); });
  window.addEventListener('offline', () => { updatePill(false); softRender(); });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; });
  window.addEventListener('xf-push', (e) => { const d = e.detail || {}; toast('🔔 ' + (d.title || '') + (d.body ? ' — ' + d.body : '')); refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  setInterval(() => { if (!document.hidden && navigator.onLine) refresh(); }, (C.POLL_SECONDS || 60) * 1000);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW gagal', e));
    navigator.serviceWorker.addEventListener('message', (e) => {
      const d = e.data || {};
      if (d.type === 'synced') loadLocal().then(() => { updatePill(false); softRender(); });
      if (d.type === 'navigate' && d.url) { const h = d.url.split('#')[1]; if (h) location.hash = h; }
    });
  }

  (async function boot() {
    try {
      await loadLocal();
      render();
      if (S.user) { refresh({ boot: true }); XFPush.initIfGranted(); }
    } catch (e) {
      $('#app').innerHTML = '<div class="login"><div class="alert">Gagal memuat: ' + esc(e.message) + '</div></div>';
    }
  })();

  // Ekspos untuk debug
  window.__XFAPP = { S: S, render: render, refresh: refresh };
})();
