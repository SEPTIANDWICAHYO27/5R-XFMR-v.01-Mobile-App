# 5R-XFMR-v.01-Mobile-App
Menurunkan Temuan Housekeeping dengan  menciptakan lingkungan yang lebih bersih, sehat, dan berkelanjutan. Dengan memanfaatkan sensor, aplikasi, GPS, dan analisis data, pengelolaan kebersihan dapat dilakukan secara lebih cepat, transparan, dan efisien.

**Aplikasi:** https://septiandwicahyo27.github.io/5R-XFMR-v.01-Mobile-App/

---

**Asam Sulfat & Utilitas IIIB** · Frontend: GitHub Pages · Backend: Google Apps Script · DB: Google Sheets + Google Drive (foto)

## Struktur folder
```
5r-xfmr/
├── index.html          ← shell aplikasi + ikon SVG
├── manifest.json       ← installability (Add to Home Screen)
├── sw.js               ← Service Worker (cache, background sync, push)
├── config.js           ← ISI API_URL & (opsional) Firebase
├── css/app.css         ← tema abu-abu terang, tombol besar
├── js/core.js          ← IndexedDB, API, Outbox & Sync (dipakai halaman + SW)
├── js/camera.js        ← kamera langsung, kompres + watermark, scan QR
├── js/push.js          ← Web Push (FCM) + izin notifikasi
├── js/app.js           ← router & tampilan semua role
├── icons/              ← ikon dari logo gugus
├── backend/Code.gs     ← Apps Script (API + trigger + push)
├── backend/appsscript.json
└── BLUEPRINT.md        ← dokumen rancangan lengkap
```

## A. Pasang backend (±10 menit)
Database sudah terhubung ke dua Google Sheets milik gugus (ID tertanam di `Code.gs`, tidak perlu diisi lagi):

| Fungsi | Spreadsheet | ID |
|---|---|---|
| Database laporan (dB) | [dB_ 5R XFMR 2026](https://docs.google.com/spreadsheets/d/1B_Wq55FLmX7P6zOcpyd9SmaNQrI96Q9-H7JSUyez0_g/edit) | `1B_Wq55FLmX7P6zOcpyd9SmaNQrI96Q9-H7JSUyez0_g` |
| Data user (tab USER) | [User_Roles 5R XFMR 2026](https://docs.google.com/spreadsheets/d/1F1LluUX5yJP6_da1GNHFWmsgqYhVefmsj8hyhiX3gyM/edit) | `1F1LluUX5yJP6_da1GNHFWmsgqYhVefmsj8hyhiX3gyM` |

1. Pastikan Anda login dengan akun Google **pemilik/editor kedua spreadsheet** di atas (script berjalan atas nama akun ini).
2. Pastikan spreadsheet User_Roles berisi data versi bersih (`data/User_Roles_Js_XFMR_2026_clean.xlsx`: 59 user, NIK unik). Nama tab boleh `USER`/`User` — aplikasi mencari otomatis.
3. Buka spreadsheet **dB** → **Extensions → Apps Script**. Hapus isi `Code.gs`, tempel `backend/Code.gs`.
   *Project Settings → centang "Show appsscript.json"* → tempel `backend/appsscript.json`.
4. Pilih fungsi **`setup`** → **Run** → izinkan akses. Ini membuat tab `Areas, Reports, Schedules, PushTokens, Notifications, Log`, folder foto di Drive, trigger harian 05.30 & per jam, dan menambah kolom `Email_NoHP, Token, Token_Exp, Poin, Last_Login` di tab USER. Cek *Execution log*: harus tampil nama kedua spreadsheet, jumlah user, dan daftar tab area. Tab `Area 1/2/3` dengan kolom `Timestamp, No. Reg Job, Koordinator, Area, …, Rating` akan terisi otomatis setiap ada laporan.
5. **Deploy → New deployment → Web app** · Execute as: **Me** · Who has access: **Anyone** → salin URL yang berakhiran `/exec`.

> Setiap mengubah `Code.gs`: *Deploy → Manage deployments → Edit (pensil) → Version: New version → Deploy* (URL tetap sama).

## B. Pasang frontend (GitHub Pages)
1. Buka `config.js` → isi `API_URL: 'https://script.google.com/macros/s/XXXX/exec'`.
2. Buat repo baru (mis. `5R-XFMR-SASU3B`), upload semua file **kecuali folder `backend/`**.
3. *Settings → Pages → Branch: main / root* → tunggu link `https://<user>.github.io/<repo>/`.
4. Buka di HP → login NIK + kata sandi → *Saya → Pasang Aplikasi*.

> Setiap rilis baru: naikkan `VERSION` di `sw.js` (mis. `v1.0.1`) agar HP mengambil file terbaru.

## C. Isi koordinat & QR area
- Login sebagai Approver → **Saya → Koordinat Area** → berdiri di tengah tiap area → *Set di sini*.
- Tab `Areas` kolom `QR_Image` berisi gambar QR (`5RXFMR-A1/A2/A3`) → cetak & tempel di pintu tiap area. Tombol **SCAN QR AREA** muncul di HP Android (Chrome).

## D. (Opsional) Push notification saat aplikasi tertutup — Firebase Cloud Messaging (gratis)
Tanpa langkah ini notifikasi tetap muncul saat aplikasi dibuka (polling 60 detik) dan di Android terpasang via *periodic sync*.
1. https://console.firebase.google.com → *Add project* → *Add app → Web* → salin config ke `FIREBASE` di `config.js`.
2. *Project settings → Cloud Messaging → Web Push certificates → Generate key pair* → salin ke `FIREBASE_VAPID_KEY`.
3. *Project settings → Service accounts → Generate new private key* (file JSON).
4. Apps Script → *Project Settings → Script Properties* tambahkan:
   | Property | Isi |
   |---|---|
   | `FCM_PROJECT_ID` | `project_id` dari JSON |
   | `FCM_CLIENT_EMAIL` | `client_email` dari JSON |
   | `FCM_PRIVATE_KEY` | `private_key` dari JSON (termasuk `-----BEGIN…`) |
5. Di HP: *Saya → Notifikasi* → izinkan. iPhone wajib iOS 16.4+ **dan** aplikasi dibuka dari ikon Layar Utama.

## Script Properties lain (opsional)
| Property | Fungsi |
|---|---|
| `USERS_SS_ID` | ID spreadsheet berisi tab USER (bila terpisah) |
| `DB_SS_ID` | ID spreadsheet dB (bila script tidak terikat ke file dB) |
| `HASH_PASSWORDS` | `true` → kata sandi otomatis diubah ke hash SHA-256 saat login berhasil. Admin tetap bisa reset dengan menulis kata sandi biasa di sel. |

## Akun uji
Gunakan NIK & kata sandi dari tab USER (mis. Admin `2146103`).
