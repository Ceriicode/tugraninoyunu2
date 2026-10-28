'use strict';
// =====================================================================
//  YARDIMCI FONKSİYONLAR ve KAYIT (ilerleme kaydı)
// =====================================================================

// Seed'li (tohumlu) rastgele sayı üreteci.
// Aynı seed hep aynı sayıları verir -> her bölümün yolu hep aynı olur.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bir değeri [a, b] aralığına sıkıştırır (clamp)
const sinirla = (v, a, b) => (v < a ? a : v > b ? b : v);

// İki değer arasında doğrusal geçiş (lerp)
const karistir = (a, b, t) => a + (b - a) * t;

// Yumuşak geçiş (smoothstep): x, a'dan b'ye giderken 0'dan 1'e yumuşakça çıkar
function yumusak(a, b, x) {
  const t = sinirla((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// rnd fonksiyonu ile [a, b) arası sayı
const aralik = (rnd, a, b) => a + (b - a) * rnd();

// Açıyı -PI..PI aralığına getirir
const aciNormal = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Canvas için yuvarlak köşeli dikdörtgen (eski tarayıcılarda roundRect yoksa)
function yuvarlakDikdortgen(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------
//  KAYIT: açılan günler, altın, yükseltmeler tarayıcıda (localStorage) saklanır.
//  Gizli sekmede localStorage hata verebilir; o yüzden hep try/catch içinde.
// ---------------------------------------------------------------------
const Kayit = {
  anahtar: 'tugra-son-vapur-v1',
  veri: {
    acik: 1,                       // kaç gün açık (1 = sadece 1. gün)
    tamam: [],                     // tamamlanan günler (true/false)
    altin: 0,                      // toplam altın
    yukseltme: { motor: 0, zirh: 0, tampon: 0 },
    ses: true,
    toplamZombi: 0,
  },
  yukle() {
    try {
      const s = localStorage.getItem(this.anahtar);
      if (s) {
        const v = JSON.parse(s);
        Object.assign(this.veri, v);
        this.veri.yukseltme = Object.assign({ motor: 0, zirh: 0, tampon: 0 }, v.yukseltme || {});
        if (!Array.isArray(this.veri.tamam)) this.veri.tamam = [];
      }
    } catch (e) { /* kayıt okunamadı, varsayılanlarla devam */ }
  },
  kaydet() {
    try { localStorage.setItem(this.anahtar, JSON.stringify(this.veri)); } catch (e) { /* yoksay */ }
  },
  sifirla() {
    this.veri = { acik: 1, tamam: [], altin: 0, yukseltme: { motor: 0, zirh: 0, tampon: 0 }, ses: this.veri.ses, toplamZombi: 0 };
    this.kaydet();
  },
};
