# BLUEPRINT — PWA "5R XFMR"
**Monitoring, Pelaporan & Pengelolaan Kebersihan Area Plant — Asam Sulfat & Utilitas IIIB**
Gugus 5R XFMR · Gedung STG 17,5 · Versi 1.0 (Oktober 2026)

---

## 1. Ringkasan Aplikasi & User Roles
5R XFMR adalah aplikasi web yang bisa dipasang di HP seperti aplikasi biasa (PWA). Siapa pun di gugus dapat **memotret area kotor → sistem mencatat lokasi & area → tugas dikirim ke petugas → petugas membersihkan dan memotret hasilnya → approver memverifikasi → pelapor memberi rating → petugas mendapat poin**. Semua data tersimpan di Google Sheets yang sudah dipakai gugus (tab AREA 1/2/3 tetap terisi otomatis dalam format lama).

Aplikasi tetap bisa dipakai **tanpa sinyal**: laporan, foto, dan perubahan status disimpan di HP lalu terkirim otomatis begitu sinyal kembali.

| Role (kolom `Role` di tab USER) | Kode | Jumlah | Fokus layar |
|---|---|---|---|
| Admin (Approver) | ADMIN | 1 | Dashboard, verifikasi, jadwal, koordinat area |
| AVP (Approver) | AVP | 1 | Dashboard, verifikasi, jadwal |
| JAVP (Approver) | JAVP | 1 | Dashboard, verifikasi, jadwal |
| Supervisor (Approver) | SUPERVISOR | 4 | Dashboard, verifikasi, jadwal |
| TKO (User) — pelapor | TKO | 27 | Lapor, atur jobdesk, rating |
| TKNO (User) — petugas | TKNO | 25 | Tugas saya, ambil tugas, foto sesudah |

**Area (dari dokumen Profil Gugus):**
| ID | Nama | Koordinator (= kolom "Kapten") | Titik detail |
|---|---|---|---|
| A1 | CCR SASU3B | Taufiqur Rahman | 16 titik (Learning Hub, meja panel, APAR, …) |
| A2 | Barak Dapur | Ahmad Afandi | 19 titik (dapur, kamar mandi 1–2, loker, …) |
| A3 | Barak GF | Purnawan | 14 titik (musala, kulkas, area jemur, …) |

## 2. TKO (Pelapor & Pengatur Jobdesk)
- **Lapor area kotor** dalam 3 langkah: ① Foto SEBELUM (wajib, watermark waktu + GPS) → ② Area (otomatis dari GPS/QR, bisa pilih manual) + titik detail → ③ Jenis masalah, keterangan (bisa *dikte suara*), **tugaskan ke petugas**, prioritas (Normal/Tinggi/Darurat), batas waktu (1 jam / 4 jam / hari ini / besok).
- **Atur/ganti petugas** pada laporan miliknya selama belum selesai.
- Bisa juga **mengerjakan sendiri** (ambil tugas terbuka → foto sebelum → foto sesudah).
- **Memberi rating 1–5 bintang + masukan** setelah tugas selesai.
- Mendapat **+3 poin** untuk setiap laporan yang terverifikasi.

## 3. TKNO (Petugas Kebersihan)
- Beranda = **Tugas Saya** (urut prioritas) + **Tugas Terbuka** (tombol AMBIL).
- Detail tugas: tombol raksasa **MULAI KERJAKAN** → **NAVIGASI KE LOKASI** (Google Maps jalan kaki) → **FOTO SESUDAH & SELESAI**.
- Bila tugas berasal dari jadwal rutin (belum ada foto sebelum), aplikasi otomatis meminta foto SEBELUM saat mulai.
- Bila approver menolak, tugas kembali ke "Dikerjakan" dengan catatan alasan.
- Melihat poin, lencana, dan peringkat.

## 4. AVP, JAVP, Supervisor & Admin (Approver)
- **Dashboard**: jumlah per status (ketuk → daftar terfilter), laporan bulan ini, rata-rata waktu respon & selesai, rata-rata rating, grafik per area, daftar terlambat, antrean verifikasi, 3 petugas terbaik.
- **Verifikasi**: lihat foto Sebelum vs Sesudah berdampingan → **SETUJUI** (poin dihitung) atau **TOLAK** (wajib alasan; kembali ke petugas). Tanggapan masuk ke kolom *Response*.
- **Jadwal**: buat jadwal rutin per area/titik/hari/jam/petugas; setiap pagi 05.30 dibuat menjadi tugas otomatis.
- **Koordinat area**: set lat/long area dengan berdiri di lokasi.
- Menerima notifikasi eskalasi (tugas > 2 jam tidak diambil / lewat batas waktu).

## 5. Fitur Utama (Core Features)
| # | Fitur | Implementasi |
|---|---|---|
| 1 | Pelaporan berbasis lokasi (GPS) & area | Geolocation + jarak Haversine ke koordinat area; QR area; tombol area besar |
| 2 | Sistem tugas 4 status | Pending → In Progress → Resolved → Verified (+ tolak) |
| 3 | Bukti foto wajib | Sebelum wajib saat lapor/mulai, Sesudah wajib saat selesai — divalidasi di HP **dan** server |
| 4 | Rating & feedback | 1–5 bintang + chip cepat + teks, hanya oleh pelapor |
| 5 | Gamifikasi | Poin, 6 lencana, peringkat Poin/Tercepat/Terbersih, podium |
| 6 | Jadwal rutin | Sheet Schedules + trigger harian |
| 7 | Notifikasi | Tugas baru, mulai, selesai (ajak rating), perlu verifikasi, ditolak, poin, eskalasi |
| 8 | Offline-first | IndexedDB + outbox + Background Sync |
| 9 | Kompatibel dB lama | Tab AREA 1/2/3 terisi otomatis (Tanggal … Rating) |

## 6. Pelaporan Berbasis Lokasi & Kategori
- **Kategori area**: Area 1 CCR SASU3B, Area 2 Barak Dapur, Area 3 Barak GF (+ titik detail sesuai denah).
- **Jenis masalah (Kegiatan)**: 🗑️ Sampah · 🧹 Debu/Kotor · 💧 Tumpahan/Genangan · 📦 Tidak Rapi · 🚽 Toilet/Sanitasi · 🍳 Dapur · 🔧 Kerusakan Fasilitas · 📝 Lainnya.
- **Catatan jujur soal GPS**: ketiga area berada di gedung yang sama (STG 17,5), sedangkan GPS di dalam gedung biasanya meleset 10–50 m. Karena itu GPS dipakai untuk (a) membuktikan pelapor ada di lokasi, (b) menyarankan area terdekat, dan (c) navigasi. Penentu area yang paling akurat adalah **QR code di pintu tiap area** atau ketukan tombol area.

## 7. Sistem Tugas (Status)
```
            ┌──────── TOLAK (alasan wajib) ◄──────┐
            ▼                                     │
 [Pending] ──MULAI──► [In Progress] ──SELESAI──► [Resolved] ──SETUJUI──► [Verified]
  MENUNGGU            DIKERJAKAN       (foto      SELESAI                 TERVERIFIKASI
  (foto sebelum)      (+foto sebelum   sesudah)   (rating pelapor)        (poin dihitung)
                       bila belum ada)
```
| Transisi | Siapa | Syarat |
|---|---|---|
| Buat (Pending) | Semua role | Foto sebelum, area |
| Atur petugas | TKO pemilik laporan, Approver | Status Pending/In Progress |
| Mulai | Petugas yang ditugaskan / TKNO-TKO jika belum ada petugas | Foto sebelum ada |
| Selesai | Petugas tugas tsb | Foto sesudah |
| Setujui / Tolak | Approver | Status Resolved |
| Rating | Pelapor | Status Resolved/Verified |

## 8. Bukti Foto
- Kamera dibuka **langsung di aplikasi** (layar penuh, tombol jepret 84 px, tombol Galeri & Balik kamera). Bila izin kamera ditolak/browser lama → otomatis beralih ke kamera bawaan HP.
- Setiap foto dikompres (sisi terpanjang 1280 px, JPEG 72% ≈ 150–300 KB) dan diberi **watermark**: `5R XFMR • SEBELUM/SESUDAH`, tanggal-jam WIB, area, koordinat ±akurasi.
- Server menyimpan ke Google Drive folder `5R XFMR — Foto Bukti/<yyyy-MM>/`, nama `<ID_Laporan>_before.jpg` / `_after.jpg`, lalu menulis URL thumbnail ke sheet.

## 9. Rating / Feedback
Setelah status **Resolved**, pelapor menerima notifikasi "Tugas selesai — beri rating ⭐". Di layar detail muncul 5 bintang besar, chip cepat (*Bersih sekali 👍, Cepat ⚡, Rapi 📐, Kurang bersih, Terlambat*) dan kolom teks. Rating ×2 ditambahkan ke poin petugas. Approver dapat menulis tanggapan (*Response*).

## 10. Gamifikasi
**Poin petugas per tugas terverifikasi**
| Komponen | Poin |
|---|---|
| Dasar | +10 |
| Selesai ≤ 60 menit sejak mulai | +10 (≤ 4 jam: +5) |
| Prioritas Darurat | +5 |
| Rating pelapor | +2 × bintang (maks +10) |
| **Pelapor**: laporan valid terverifikasi | +3 |

**Lencana**: ⚡ Kilat (rata² ≤ 60 mnt, min 5 tugas) · ⭐ Bintang 5 (rata² rating ≥ 4,5, min 5) · 💪 Rajin (20 tugas) · 🧹 Resik Master (50 tugas) · 📣 Mata Elang (10 laporan valid) · 👑 Juara Bulan Ini.
**Peringkat**: tab 🏆 Poin · ⚡ Tercepat (rata² durasi, min 3 tugas) · ⭐ Terbersih (rata² rating, min 3) — periode Bulan Ini / Sepanjang Waktu, dengan podium 1-2-3. Total poin juga direkap ke kolom `Poin` di tab USER (bisa dipakai untuk penghargaan bulanan).

---

## 11. Spesifikasi Teknis PWA
Semua kode ada di folder proyek; ringkasan arsitektur:

```
 HP (PWA)                                                 Google
┌───────────────────────────────┐                    ┌──────────────────────┐
│ app.js (UI)                   │  POST text/plain   │ Apps Script Web App  │
│   │ enqueue()                 │ ─────────────────► │  doPost → ACTIONS    │
│   ▼                           │  {action, token,   │  LockService         │
│ IndexedDB ── outbox ──► sync()│   clientId, …}     │  ├─ Sheets (DB)      │
│   │         reports  ◄── pull()◄────────────────── │  ├─ Drive (foto)     │
│   │         kv(token,areas…)  │  delta Updated_At  │  └─ FCM HTTP v1      │
│ sw.js: cache shell, foto,     │                    │ Trigger 05.30 jadwal │
│   Background Sync, Push       │ ◄── Web Push ───── │ Trigger per jam      │
└───────────────────────────────┘     (FCM)          └──────────────────────┘
```

## 12. Offline-First Architecture
1. **App shell di-cache** saat instalasi Service Worker (`index.html`, CSS, JS, ikon) → aplikasi terbuka meski tanpa sinyal (navigasi → `index.html` dari cache). Foto Drive & font di-cache *cache-first* (maks 300 foto).
2. **Data lokal = IndexedDB** (`js/core.js`): store `reports` (semua laporan), `kv` (token, user, areas, users, schedules, waktu sinkron), `outbox` (antrean perubahan).
3. **Setiap aksi tulis** (lapor, mulai, selesai, verifikasi, rating, jadwal, token push) → `XF.enqueue()`:
   - tulis operasi ke `outbox` dengan `clientId` unik (UUID);
   - langsung ubah data lokal (*optimistic UI*) — laporan baru tampil dengan ID sementara `L-…` dan ikon awan "menunggu sinyal"; foto disimpan sebagai data-URL di IndexedDB;
   - daftarkan **Background Sync** (`xfmr-outbox`).
4. **Auto-sync** dipicu oleh: event `sync` di Service Worker (Chrome/Android — berjalan walau aplikasi sudah ditutup), event `online`, aplikasi dibuka/kembali ke depan, tombol status, dan interval 60 detik. iOS (tanpa Background Sync) sinkron saat aplikasi dibuka.
5. **Urutan & ketergantungan**: outbox dikirim berurutan; ID `L-…` dipetakan ke ID resmi (`idmap`) sehingga aksi lanjutan (mis. ganti petugas atas laporan offline) memakai ID server; halaman detail otomatis pindah ke ID resmi.
6. **Aman dari kiriman ganda**: Web Locks API mencegah halaman & Service Worker sinkron bersamaan; server **idempotent** (`Client_ID` dicek untuk laporan; start/resolve/verify mengembalikan data jika sudah berstatus tujuan).
7. **Kesalahan**: jaringan → berhenti & coba lagi nanti; sesi habis → minta login; ditolak server (mis. tugas sudah diambil orang lain) → operasi dibuang, dicatat di *Profil → Riwayat gagal kirim*, data ditarik ulang penuh.
8. **Delta pull**: `pull(since)` hanya mengambil baris dengan `Updated_At` > waktu sinkron terakhir; laporan yang masih punya operasi tertunda tidak ditimpa.
9. **Menerima tugas saat offline**: tugas yang sudah ditarik terakhir kali tetap ada di HP (dashboard & peringkat dihitung di HP dari data lokal), petugas tetap bisa MULAI → FOTO → SELESAI tanpa sinyal.

## 13. Geolocation API
- `getCurrentPosition({enableHighAccuracy:true, timeout:15s, maximumAge:30s})` dimulai saat wizard lapor dibuka (paralel dengan memotret, jadi tidak menunggu).
- Area terdekat = Haversine ke `Latitude/Longitude` di sheet Areas; dipilih otomatis bila jarak ≤ `Radius_M`.
- Koordinat & akurasi disimpan ke laporan (`Latitude, Longitude, Maps_URL`) dan dibakar ke watermark foto.
- **Navigasi petugas**: tombol membuka `https://www.google.com/maps/dir/?api=1&destination=lat,lng&travelmode=walking`.
- Approver dapat mengkalibrasi koordinat area dari HP (*Set di sini*, peringatan bila akurasi > 60 m).
- **QR**: `BarcodeDetector` (Chrome Android) memindai `QR_Code_ID` di pintu area.

## 14. Camera / Media API
- `navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}, width:1920, height:1080}})` → `<video>` layar penuh → jepret ke `<canvas>` → resize + watermark → `toDataURL('image/jpeg', 0.72)`.
- Layar tinjau: **ULANGI** / **PAKAI FOTO**. Fallback `<input type=file accept=image/* capture=environment>` (kamera bawaan) & Galeri.
- Stream kamera selalu dihentikan saat ditutup (hemat baterai & lampu kamera mati).

## 15. Push Notifications (Web Push API)
Dua lapis supaya selalu sampai:
1. **Web Push via Firebase Cloud Messaging (gratis)** — saat aplikasi tertutup.
   - HP: izin diminta dari tombol (*Saya → Notifikasi*, wajib untuk iOS) → `firebase.messaging().getToken({vapidKey, serviceWorkerRegistration})` → token disimpan ke sheet `PushTokens` lewat outbox.
   - Server: Apps Script menandatangani JWT **RS256** dengan service account (`Utilities.computeRsaSha256Signature`) → access token OAuth2 (cache 55 menit) → `POST fcm.googleapis.com/v1/projects/<id>/messages:send` (paralel via `UrlFetchApp.fetchAll`), pesan *data-only* + `Urgency: high`. Token mati (404/UNREGISTERED) dihapus otomatis.
   - Service Worker menampilkan notifikasi (`showNotification`) dengan ikon, getar, dan tautan langsung ke detail tugas (`notificationclick` → fokus/buka aplikasi).
   - Mengapa FCM: Apps Script tidak punya ECDSA P-256 + enkripsi payload yang dibutuhkan Web Push VAPID murni; FCM menanganinya dan mendukung Chrome, Edge, Firefox, serta Safari iOS 16.4+ (PWA terpasang).
2. **Inbox `Notifications` di sheet + polling** — selalu aktif walau FCM belum disiapkan: setiap `pull` membawa notifikasi baru → toast di layar; bila aplikasi di latar belakang → notifikasi sistem. Android terpasang juga memakai **Periodic Background Sync** (±15 menit).

| Pemicu | Penerima | Contoh pesan |
|---|---|---|
| Laporan baru (ada petugas) | Petugas | 🧹 Tugas baru: Barak Dapur — Tumpahan/Genangan |
| Laporan baru (tanpa petugas) | Semua TKNO | 🚨 Tugas baru … (bila Darurat) |
| Mulai dikerjakan | Pelapor | ▶️ Sedang dikerjakan |
| **Selesai** | Pelapor | ✅ Tugas selesai — ketuk untuk beri rating ⭐ |
| Selesai | Approver | 🔎 Perlu verifikasi |
| Ditolak | Petugas | ↩️ Perlu diperbaiki: <alasan> |
| Diverifikasi | Petugas | 🏆 Diverifikasi! +25 poin |
| Jadwal 05.30 | Petugas | 📅 Jadwal rutin: CCR SASU3B |
| > 2 jam / lewat batas | Approver + petugas | ⏰ Belum diambil > 2 jam |

## 16. Installability
`manifest.json`: `name`, `short_name: "5R XFMR"`, `start_url`, `scope`, `display: standalone`, `orientation: portrait`, `theme_color #1B2A5B`, `background_color #E9ECF1`, ikon 192/512 + **maskable**, `shortcuts` (Lapor, Tugas). `index.html` menambah `apple-touch-icon` & meta `apple-mobile-web-app-*` untuk iOS. Syarat terpenuhi: HTTPS (GitHub Pages), Service Worker dengan `fetch` handler, manifest valid. Tombol *Pasang Aplikasi* memakai `beforeinstallprompt` (Android) dan panduan bergambar langkah untuk Safari iOS.

---

## 17. Rekomendasi Tech Stack (Era 2026)
| Lapisan | Pilihan | Alasan |
|---|---|---|
| Frontend | **Vanilla JS (ES2022) + CSS modern, tanpa build** | Total < 100 KB, cepat di HP kelas bawah, bisa diedit langsung di GitHub tanpa Node/npm; cocok dengan alur kerja gugus (sama seperti P3K PRO). Jalur upgrade bila fitur membesar: **Vite + Preact/Svelte + vite-plugin-pwa (Workbox)**. |
| Offline | **Service Worker + IndexedDB + Background Sync + Web Locks** | API standar browser, tanpa pustaka. |
| Backend | **Google Apps Script Web App** | Gratis, tanpa server, menyatu dengan Sheets/Drive, trigger terjadwal bawaan. |
| Database | **Google Sheets** (+ **Google Drive** untuk foto) | Sudah dipakai & dipahami tim; bisa dibuka/difilter/dicetak; Looker Studio bisa langsung membaca untuk laporan manajemen. |
| Auth | **NIK + kata sandi → token sesi 30 hari** (CacheService), opsi hash SHA-256 | Sesuai tab USER yang ada; tidak butuh akun Google per petugas. |
| Push | **Firebase Cloud Messaging (Web Push)** | Gratis, mendukung iOS 16.4+, bisa dipanggil dari Apps Script dengan service account. |
| Hosting | **GitHub Pages** (HTTPS) | Gratis, wajib HTTPS untuk PWA/kamera/GPS. |

**Batasan yang perlu diketahui**: Apps Script ±1–3 detik per permintaan dan kuota harian akun Gmail (cukup untuk ±60 pengguna). Bila data > ~20.000 laporan atau butuh real-time, migrasi ke Supabase/Firebase Firestore tanpa mengubah UI (cukup ganti `XF.api`).

## 18. Struktur Database (Google Sheets)

### 18.1 Tab `USER` (sudah ada — Sheet "Users")
| Kolom | Isi | Keterangan |
|---|---|---|
| ID | 1, 2, … | nomor urut |
| NIK | 2146103 | **kunci login & ID pengguna** (format teks) |
| Kata Sandi | S4su3b / `sha256:…` | Password/Token login |
| Nama | Septian Dwi Cahyo | |
| Role | Admin (Approver) / AVP / JAVP / Supervisor / TKO (User) / TKNO (User) | |
| Avatar | URL foto (opsional) | |
| Email_NoHP *(baru)* | 08xx / email | kontak |
| Token *(baru)* | UUID | token sesi |
| Token_Exp *(baru)* | tanggal | kedaluwarsa sesi |
| Poin *(baru)* | 170 | rekap otomatis |
| Last_Login *(baru)* | tanggal | |

### 18.2 Tab `Areas`
| ID_Area | Nama_Area | Latitude | Longitude | QR_Code_ID | Radius_M | Koordinator | Sheet_Name | Titik | QR_Image |
|---|---|---|---|---|---|---|---|---|---|
| A1 | CCR SASU3B | (set dari HP) | | 5RXFMR-A1 | 60 | Taufiqur Rahman | AREA 1 (CCR SASU3B) | daftar titik dipisah `;` | `=IMAGE(QR)` |
| A2 | Barak Dapur | | | 5RXFMR-A2 | 60 | Ahmad Afandi | AREA 2 (BARAK DAPUR) | … | … |
| A3 | Barak GF | | | 5RXFMR-A3 | 60 | Purnawan | AREA 3 (BARAK GF) | … | … |

### 18.3 Tab `Reports` (pusat data)
Kolom yang diminta (`ID_Laporan, ID_Pelapor, ID_Area, Kategori, Deskripsi, Foto_URL, Status, Timestamp`) dipertahankan; `Foto_URL` dipecah menjadi **Before/After** karena keduanya wajib.

| Kolom | Contoh | Fungsi |
|---|---|---|
| ID_Laporan | 5R-A2-261026-0001 | = No. Reg Job (`5R-<area>-<yyMMdd>-<urut>`) |
| Client_ID | UUID | anti-duplikat saat sync offline |
| ID_Pelapor / Nama_Pelapor | 2146132 / Ahmad Afandi | |
| ID_Area / Nama_Area / Titik | A2 / Barak Dapur / Dapur | |
| Kategori | Tumpahan/Genangan | = Kegiatan |
| Deskripsi | Genangan di bawah wastafel | |
| Prioritas / Deadline | Tinggi / 26-10-2026 16:00 | jobdesk |
| Foto_Before_URL / Foto_After_URL | URL Drive | bukti |
| Latitude / Longitude / Maps_URL | -7.155, 112.629 | |
| Status | Pending · In Progress · Resolved · Verified | |
| ID_Petugas / Nama_Petugas | 2609752 / Kamarianto | |
| Timestamp / Started_At / Resolved_At / Verified_At | tanggal | SLA & kecepatan |
| ID_Verifikator / Catatan | NIK / alasan tolak | |
| Rating / Feedback / Response | 5 / "Bersih sekali" / tanggapan | |
| Poin / Poin_Pelapor | 30 / 3 | gamifikasi |
| Sumber | LAPORAN / JADWAL | |
| Updated_At | tanggal | delta sync |

### 18.4 Tab pendukung
- `Schedules`: ID_Jadwal, ID_Area, Titik, Kategori, Deskripsi, Hari (`Setiap Hari` / `Senin,Rabu`), Jam, ID_Petugas, Aktif, Dibuat_Oleh, Last_Run
- `PushTokens`: ID_User, Token, Platform, Updated_At
- `Notifications`: ID, ID_User, Judul, Pesan, ID_Laporan, Timestamp (otomatis dibersihkan > 30 hari)
- `Log`: Timestamp, User, Action, Detail (audit)
- `AREA 1/2/3` (format lama): Tanggal, No. Reg Job, Kapten, Area, Kegiatan, Foto Before, Foto After, Maps, Deskripsi, Status, Feedback, Response, Rating — **diisi & diperbarui otomatis** (upsert per No. Reg Job).

---

## 19. UI/UX Guidelines (untuk pengguna gagap teknologi)
**Prinsip**
1. **Satu layar = satu keputusan.** Lapor dipecah 3 langkah dengan indikator 1-2-3.
2. **Tombol besar**: aksi utama 64 px tinggi, lebar penuh; tombol kamera tengah 64 px; area sentuh minimal 46 px; teks dasar 17 px.
3. **Kontras tinggi**: latar abu-abu terang `#E9ECF1`, kartu putih, teks `#0F172A`, aksen navy `#1B2A5B` & kuning `#F5A400` dari logo gugus; status selalu warna **+ ikon + kata** (tidak bergantung warna saja).
4. **Minim teks, banyak ikon/emoji**: 🗑️💧🚽🍳, kata kerja kapital: MULAI, SELESAI, SETUJUI, TOLAK.
5. **Warna area konsisten**: A1 biru, A2 oranye, A3 hijau — dipakai di kartu, tombol, grafik.
6. **Umpan balik instan**: getar saat jepret, toast hijau/merah, status online/offline selalu terlihat di pojok kanan atas + jumlah data menunggu.
7. **Tidak ada jalan buntu**: kamera ditolak → tombol kamera bawaan; GPS gagal → pilih area manual; offline → "tersimpan, dikirim otomatis".
8. **Dikte suara** untuk keterangan (Bahasa Indonesia).
9. **Bottom navigation** 5 ikon berlabel, tombol Lapor kuning menonjol di tengah.

**User flow**
```
TKO :  Beranda ─► [LAPOR] ─► Foto ─► Area/Titik ─► Jenis+Petugas+Prioritas ─► KIRIM
                                                                         └► notifikasi "selesai" ─► Rating ⭐
TKNO:  Notifikasi ─► Detail tugas ─► MULAI ─► NAVIGASI ─► FOTO SESUDAH & SELESAI ─► +poin
Appr:  Dashboard ─► Perlu Verifikasi ─► bandingkan foto ─► SETUJUI / TOLAK(+alasan)
       Jadwal ─► + Tambah ─► area/hari/jam/petugas ─► SIMPAN (05.30 jadi tugas)
```

## 20. Wireframe & Struktur Komponen

```
┌──────────────── Login ───────────────┐   ┌──────────── Beranda TKO ─────────────┐
│            [ LOGO GUGUS ]            │   │ [logo] 5R XFMR          (● Online 1) │
│               5R XFMR                │   │ (AA) Selamat pagi, Ahmad  [TKO]      │
│  Kebersihan Area Plant SASU IIIB     │   │ ┌──────────────────────────────────┐ │
│ ┌──────────────────────────────────┐ │   │ │ 📷  LAPOR AREA KOTOR             │ │
│ │ 👤 NIK      [_______________]    │ │   │ │     Foto • Lokasi • Kirim        │ │
│ │ 🛡 Sandi    [__________][LIHAT]  │ │   │ └──────────────────────────────────┘ │
│ │ [            MASUK             ] │ │   │ [AREA1 CCR ✓] [AREA2 Dapur 1] [AREA3]│
│ └──────────────────────────────────┘ │   │ ⭐ Beri Rating (1)  ── kartu ──       │
└──────────────────────────────────────┘   │ Laporan Saya ── kartu ── kartu ──    │
                                           │ [🏠][☰][ (📷) ][🏆][👤]              │
                                           └──────────────────────────────────────┘
┌────────── Lapor 1/2/3 ───────────────┐   ┌──────────── Detail Tugas ────────────┐
│ ← Lapor Area Kotor                   │   │ ← 5R-A2-261026-0001                  │
│ (1 Foto)(2 Lokasi)(3 Detail)         │   │ [MENUNGGU][Tinggi]                   │
│ 1: ┌ - - - - - - - - - - - - - - ┐   │   │ 💧 Tumpahan/Genangan                 │
│    │   (📷) AMBIL FOTO SEBELUM    │   │   │ 📍 A2 · Barak Dapur — Dapur          │
│    └ - - - - - - - - - - - - - - ┘   │   │ ┌─────────┐ ┌─────────┐              │
│ 2: [📍 Lokasi terkunci ±12 m]        │   │ │ SEBELUM │ │ SESUDAH │              │
│    [SCAN QR] [AREA 1][AREA 2][AREA 3]│   │ └─────────┘ └─────────┘              │
│    (Dapur)(Kamar mandi 1)(Loker)     │   │ [ ▶ MULAI KERJAKAN               ]   │
│ 3: [🗑 Sampah][🧹 Debu][💧 Tumpahan]… │   │ [ ➤ NAVIGASI KE LOKASI           ]   │
│    [Keterangan .......... 🎤]        │   │ Timeline ● Dilaporkan ○ Dikerjakan … │
│    Petugas [▼]  (Normal)(Tinggi)(…)  │   │ Info: pelapor, petugas, batas waktu  │
│ [← KEMBALI]          [✓ KIRIM]       │   └──────────────────────────────────────┘
└──────────────────────────────────────┘
┌────────── Dashboard Approver ────────┐   ┌──────────── Peringkat ───────────────┐
│ [3 Menunggu][0 Dikerjakan]           │   │ [🏆 Poin][⚡ Tercepat][⭐ Terbersih]  │
│ [2 Perlu verifikasi][9 Terverifikasi]│   │ [Bulan Ini][Sepanjang Waktu]         │
│ Bulan ini 14 · Respon 19 mnt · …     │   │      🥈      🥇      🥉   (podium)   │
│ Per Area A1 ███░ A2 ███░ A3 ███░     │   │ 1 MR M Rozaqi ........ 170 poin      │
│ ⏰ Lewat batas · ✅ Perlu verifikasi  │   │ Lencana: ⚡ ⭐ 💪 🧹 📣 👑           │
│ 🏆 Petugas terbaik                   │   │ Cara dapat poin …                    │
│ [▦][☰][ (📷) ][📅][👤]               │   └──────────────────────────────────────┘
└──────────────────────────────────────┘
```

**Pohon komponen (js/app.js)**
```
App (router hash: #/ · #/lapor · #/r/:id · #/laporan · #/jadwal · #/peringkat · #/profil)
├── Shell
│   ├── TopBar (logo/kembali, judul, SyncPill online/offline + antrean)
│   ├── OfflineBanner
│   ├── <main> (view)
│   └── BottomNav (per role, FAB Lapor)
├── Views
│   ├── Login
│   ├── HomeTKO      → Greeting, HeroLapor, AreaTiles, RateList, ReportCard[]
│   ├── HomeTKNO     → Greeting, KPI×3, MyTasks(ReportCard[]), OpenTasks(ReportCard+AMBIL)
│   ├── HomeApprover → KPI×4, StatsCard, AreaBars, LateList, VerifyQueue, TopRank
│   ├── ReportList   → StatusChips, AreaChips, ReportCard[]
│   ├── ReportDetail → Header(StatusChip, Prio), PhotoPair, Actions(role), RatingCard, Timeline, InfoGrid
│   ├── LaporWizard  → Stepper, Step1 BigCamera, Step2 GpsBadge+QR+AreaPick+TitikChips, Step3 CatGrid+Dictation+Assign
│   ├── Jadwal       → ScheduleCard[] per area, ScheduleForm(Sheet)
│   ├── Peringkat    → Segments, Podium, RankRow[], BadgeGrid, PointRules
│   └── Profil       → ProfileCard, BadgeGrid, Settings(Notif, Sync, Install, Logout), AreaCoord
└── Overlays: CameraModal (camera.js), QRScanner, BottomSheet (assign/jadwal/zoom), Toast
```

---

## 21. Daftar File Kode
| Bagian | File |
|---|---|
| A. Frontend: setup PWA, manifest, SW, UI | `index.html`, `manifest.json`, `sw.js`, `css/app.css`, `js/app.js`, `js/camera.js` |
| B. Backend & database | `backend/Code.gs`, `backend/appsscript.json` |
| C. Offline-sync & push | `js/core.js`, `sw.js` (sync/periodicsync/push), `js/push.js`, `Code.gs` (`notify_`, `sendPush_`, `fcmAccessToken_`) |
| D. Wireframe & komponen | bagian 20 dokumen ini |

## 22. Catatan Data dari File User_Roles (pembaruan 26 Okt 2026)
- Total **59 pengguna**, semua NIK **unik** ✓ (Mustofa kini `2609779`; baris ganda M Rozaqi & Suhartono sudah dihapus).
- Komposisi: Admin 1 · AVP 1 · JAVP 1 · Supervisor 4 · TKO 27 · TKNO 25.
- Kolom ID sebelumnya ganda (33 = Agtian & Naufal) → di file `User_Roles_Js_XFMR_2026_clean.xlsx` ID dinomori ulang 1–59 (aplikasi memakai NIK sebagai kunci, jadi ID tidak berpengaruh ke login).
- File bersih juga sudah: NIK berformat teks, spasi di akhir nama dibuang, dan kolom `Email_NoHP, Token, Token_Exp, Poin, Last_Login` sudah tersedia.
- Semua user masih memakai kata sandi bawaan yang sama → sarankan ganti per orang dan aktifkan `HASH_PASSWORDS=true`.
