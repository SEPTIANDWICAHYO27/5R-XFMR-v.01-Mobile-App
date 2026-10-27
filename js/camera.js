/* =========================================================
 * 5R XFMR — Kamera (MediaDevices API), kompres & watermark,
 * serta pemindai QR (BarcodeDetector API)
 * ========================================================= */
(function (g) {
  'use strict';
  const CFG = g.XF_CONFIG || {};
  const MAX = CFG.PHOTO_MAX_PX || 1280;
  const Q = CFG.PHOTO_QUALITY || 0.72;

  function pad(n) { return String(n).padStart(2, '0'); }
  function stampTime() {
    const d = new Date();
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ' WIB';
  }

  /** Gambar sumber (video/img) ke canvas: resize + watermark bukti */
  function render(src, sw, sh, meta) {
    const scale = Math.min(1, MAX / Math.max(sw, sh));
    const w = Math.round(sw * scale), h = Math.round(sh * scale);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0, w, h);
    meta = meta || {};
    const lines = [
      '5R XFMR • ' + (meta.label || 'FOTO'),
      stampTime() + (meta.area ? ' • ' + meta.area : ''),
      meta.coords ? meta.coords.lat.toFixed(5) + ', ' + meta.coords.lng.toFixed(5) + ' (±' + Math.round(meta.coords.acc || 0) + ' m)' : ''
    ].filter(Boolean);
    const fs = Math.max(14, Math.round(w / 34));
    const lh = Math.round(fs * 1.3);
    const boxH = lh * lines.length + fs * 0.8;
    x.fillStyle = 'rgba(0,0,0,.55)';
    x.fillRect(0, h - boxH, w, boxH);
    x.fillStyle = meta.label === 'SESUDAH' ? '#4ADE80' : '#FBBF24';
    x.fillRect(0, h - boxH, Math.max(6, fs * 0.35), boxH);
    x.font = '700 ' + fs + 'px system-ui, sans-serif';
    x.fillStyle = '#fff';
    x.textBaseline = 'top';
    lines.forEach((t, i) => x.fillText(t, fs * 0.9, h - boxH + fs * 0.4 + i * lh));
    return c.toDataURL('image/jpeg', Q);
  }

  function fileToDataURL(file, meta) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { try { resolve(render(img, img.naturalWidth, img.naturalHeight, meta)); } finally { URL.revokeObjectURL(url); } };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('File bukan gambar')); };
      img.src = url;
    });
  }

  /**
   * Buka kamera layar penuh. Return Promise<dataURL|null>.
   * Fallback otomatis ke <input capture> bila getUserMedia tidak ada / ditolak.
   */
  function openCamera(opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      let stream = null, facing = 'environment', done = false;
      const el = document.createElement('div');
      el.className = 'cam';
      el.innerHTML =
        '<div class="cam-top"><button class="cam-x" aria-label="Tutup"><svg class="i"><use href="#i-x"/></svg></button>' +
        '<b>' + (opts.title || 'Ambil Foto') + '</b><span></span></div>' +
        '<div class="cam-stage"><video playsinline autoplay muted></video><img class="cam-prev" alt="" hidden>' +
        '<div class="cam-msg" hidden></div></div>' +
        '<div class="cam-bar cam-live">' +
        '<button class="cam-side cam-gal" aria-label="Galeri"><svg class="i"><use href="#i-image"/></svg><small>Galeri</small></button>' +
        '<button class="cam-shutter" aria-label="Ambil foto"></button>' +
        '<button class="cam-side cam-flip" aria-label="Ganti kamera"><svg class="i"><use href="#i-flip"/></svg><small>Balik</small></button></div>' +
        '<div class="cam-bar cam-review" hidden>' +
        '<button class="btn btn-ghost-light cam-retake"><svg class="i"><use href="#i-refresh"/></svg> ULANGI</button>' +
        '<button class="btn btn-ok cam-use"><svg class="i"><use href="#i-check"/></svg> PAKAI FOTO</button></div>' +
        '<input type="file" accept="image/*" capture="environment" hidden>';
      document.body.appendChild(el);
      const video = el.querySelector('video');
      const prev = el.querySelector('.cam-prev');
      const msg = el.querySelector('.cam-msg');
      const input = el.querySelector('input');
      let shot = null;

      function stop() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }
      function close(val) { if (done) return; done = true; stop(); el.remove(); resolve(val || null); }
      function review(dataUrl) {
        shot = dataUrl; stop();
        prev.src = dataUrl; prev.hidden = false; video.hidden = true; msg.hidden = true;
        el.querySelector('.cam-live').hidden = true;
        el.querySelector('.cam-review').hidden = false;
      }
      function fallback(text) {
        video.hidden = true; msg.hidden = false;
        msg.innerHTML = '<p>' + text + '</p><button class="btn btn-primary btn-xl cam-open">' +
          '<svg class="i"><use href="#i-camera"/></svg> BUKA KAMERA HP</button>';
        msg.querySelector('.cam-open').onclick = () => input.click();
        el.querySelector('.cam-shutter').disabled = true;
      }
      async function start() {
        stop();
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return fallback('Kamera langsung tidak didukung browser ini.');
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false
          });
          video.srcObject = stream; video.hidden = false; msg.hidden = true;
          el.querySelector('.cam-shutter').disabled = false;
        } catch (e) {
          fallback('Izin kamera ditolak / tidak tersedia. Gunakan kamera bawaan HP.');
        }
      }

      el.querySelector('.cam-x').onclick = () => close(null);
      el.querySelector('.cam-flip').onclick = () => { facing = facing === 'environment' ? 'user' : 'environment'; start(); };
      el.querySelector('.cam-gal').onclick = () => { input.removeAttribute('capture'); input.click(); };
      el.querySelector('.cam-shutter').onclick = () => {
        if (!video.videoWidth) return;
        if (navigator.vibrate) navigator.vibrate(40);
        review(render(video, video.videoWidth, video.videoHeight, opts.meta));
      };
      input.onchange = async () => {
        const f = input.files && input.files[0];
        input.value = ''; input.setAttribute('capture', 'environment');
        if (!f) return;
        try { review(await fileToDataURL(f, opts.meta)); } catch (e) { fallback(e.message); }
      };
      el.querySelector('.cam-retake').onclick = () => {
        shot = null; prev.hidden = true;
        el.querySelector('.cam-live').hidden = false;
        el.querySelector('.cam-review').hidden = true;
        start();
      };
      el.querySelector('.cam-use').onclick = () => close(shot);
      start();
    });
  }

  /** Pindai QR area (BarcodeDetector). Return Promise<string|null> */
  function scanQR() {
    return new Promise(async (resolve) => {
      if (!('BarcodeDetector' in g)) return resolve(null);
      let stream, raf, done = false;
      const det = new g.BarcodeDetector({ formats: ['qr_code'] });
      const el = document.createElement('div');
      el.className = 'cam';
      el.innerHTML = '<div class="cam-top"><button class="cam-x" aria-label="Tutup"><svg class="i"><use href="#i-x"/></svg></button><b>Arahkan ke QR Area</b><span></span></div>' +
        '<div class="cam-stage"><video playsinline autoplay muted></video><div class="qr-frame"></div></div>';
      document.body.appendChild(el);
      const v = el.querySelector('video');
      const close = (val) => { if (done) return; done = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); el.remove(); resolve(val); };
      el.querySelector('.cam-x').onclick = () => close(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        v.srcObject = stream;
        const loop = async () => {
          if (done) return;
          try {
            const codes = await det.detect(v);
            if (codes.length) { if (navigator.vibrate) navigator.vibrate(80); return close(codes[0].rawValue); }
          } catch (_) { /* frame belum siap */ }
          raf = requestAnimationFrame(loop);
        };
        v.onloadeddata = loop;
      } catch (e) { close(null); }
    });
  }

  g.XFCam = { openCamera, scanQR, fileToDataURL, qrSupported: () => 'BarcodeDetector' in g };
})(window);
