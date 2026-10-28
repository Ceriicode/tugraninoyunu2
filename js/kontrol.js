'use strict';
// =====================================================================
//  KONTROLLER: klavye + dokunmatik butonlar
//  gaz  : → veya D           fren : ← veya A
//  arka : ↑, W veya B  (arka tekerin üstüne kalk / şaha kalk)
//  on   : ↓, S veya N  (ön tekerin üstüne kalk)
// =====================================================================
const Girdi = { gaz: false, fren: false, arka: false, on: false };

const TUS_HARITASI = {
  ArrowRight: 'gaz', KeyD: 'gaz',
  ArrowLeft: 'fren', KeyA: 'fren',
  ArrowUp: 'arka', KeyW: 'arka', KeyB: 'arka',
  ArrowDown: 'on', KeyS: 'on', KeyN: 'on',
};

function girdiSifirla() {
  Girdi.gaz = Girdi.fren = Girdi.arka = Girdi.on = false;
  document.querySelectorAll('.tus.basili').forEach(b => b.classList.remove('basili'));
}

function kontrolleriKur(duraklatFn) {
  // --- Klavye
  window.addEventListener('keydown', e => {
    const ad = TUS_HARITASI[e.code];
    if (ad) { Girdi[ad] = true; e.preventDefault(); Ses.baslat(); }
    if (e.code === 'KeyP' || e.code === 'Escape') duraklatFn();
  });
  window.addEventListener('keyup', e => {
    const ad = TUS_HARITASI[e.code];
    if (ad) { Girdi[ad] = false; e.preventDefault(); }
  });
  window.addEventListener('blur', girdiSifirla);

  // --- Dokunmatik butonlar (aynı anda birden fazla parmak desteklenir)
  document.querySelectorAll('.tus').forEach(btn => {
    const ad = btn.dataset.tus;
    const parmaklar = new Set();
    const bas = e => {
      e.preventDefault();
      Ses.baslat();
      parmaklar.add(e.pointerId);
      try { btn.setPointerCapture(e.pointerId); } catch (_) { /* yoksay */ }
      Girdi[ad] = true; btn.classList.add('basili');
    };
    const birak = e => {
      parmaklar.delete(e.pointerId);
      if (parmaklar.size === 0) { Girdi[ad] = false; btn.classList.remove('basili'); }
    };
    btn.addEventListener('pointerdown', bas);
    btn.addEventListener('pointerup', birak);
    btn.addEventListener('pointercancel', birak);
    btn.addEventListener('lostpointercapture', birak);
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });

  // Sayfada kaydırma / yakınlaştırmayı engelle
  document.addEventListener('touchmove', e => { if (e.target.closest('.tus, canvas')) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());
}
