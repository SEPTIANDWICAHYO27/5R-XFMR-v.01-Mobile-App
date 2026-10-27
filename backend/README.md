# Backend 5R XFMR (Google Apps Script)

File di folder ini **bukan** untuk GitHub Pages — salin ke Apps Script:

1. Buka spreadsheet **dB_ 5R XFMR 2026** → Extensions → Apps Script.
2. Hanya boleh ada **Code.gs** (+ appsscript.json). **Jangan** tempel `config.js` sebagai `Config.gs`.
3. Run `setup` → semua ✓. Run `tesLogin` → "Login OK".
4. Deploy → Manage deployments → ✏️ → Version: New version · Execute as: Me · **Who has access: Anyone** → Deploy.
5. Tes di jendela Incognito: `<URL /exec>?cek=1` → harus JSON, bukan halaman login Google.
