'use strict';
// =====================================================================
//  BÖLÜMLER (10 GÜN) ve ARAZİ ÜRETİMİ
//  Her gün bir bölüm. 10. günün sonunda liman ve SON VAPUR var.
// =====================================================================

const ADIM = 5; // arazi yüksekliğinin kaç pikselde bir saklandığı (çözünürlük)

// Her bölümün ayarları:
//  uzunluk : yolun uzunluğu (px)      zorluk : tepelerin büyüklüğü (0..1)
//  zombi   : zombi sayısı             kutu   : kutu yığını sayısı
//  rampa   : rampa sayısı             tipler : zombi türü olasılıkları
const BOLUMLER = [
  { ad: 'Şehir Merkezi',       tema: 'sehir',  uzunluk: 9000,  zorluk: 0.25, zombi: 26, kutu: 9,  rampa: 2, kosucu: 0.0,  sisko: 0.0 },
  { ad: 'Alışveriş Caddesi',   tema: 'sehir',  uzunluk: 10500, zorluk: 0.35, zombi: 34, kutu: 11, rampa: 3, kosucu: 0.15, sisko: 0.0 },
  { ad: 'Sanayi Bölgesi',      tema: 'sanayi', uzunluk: 12000, zorluk: 0.45, zombi: 40, kutu: 13, rampa: 3, kosucu: 0.15, sisko: 0.1 },
  { ad: 'Orman Yolu',          tema: 'orman',  uzunluk: 13000, zorluk: 0.55, zombi: 44, kutu: 13, rampa: 4, kosucu: 0.2,  sisko: 0.1 },
  { ad: 'Köy Yolu',            tema: 'koy',    uzunluk: 14000, zorluk: 0.6,  zombi: 50, kutu: 15, rampa: 4, kosucu: 0.2,  sisko: 0.15 },
  { ad: 'Dağ Geçidi',          tema: 'dag',    uzunluk: 15000, zorluk: 0.85, zombi: 46, kutu: 13, rampa: 4, kosucu: 0.25, sisko: 0.15 },
  { ad: 'Çöl Kanyonu',         tema: 'col',    uzunluk: 16000, zorluk: 0.7,  zombi: 56, kutu: 17, rampa: 6, kosucu: 0.25, sisko: 0.2 },
  { ad: 'Terk Edilmiş Otoyol', tema: 'otoyol', uzunluk: 17000, zorluk: 0.6,  zombi: 64, kutu: 21, rampa: 6, kosucu: 0.3,  sisko: 0.2 },
  { ad: 'Karanlık Şehir',      tema: 'gece',   uzunluk: 18000, zorluk: 0.7,  zombi: 68, kutu: 20, rampa: 6, kosucu: 0.3,  sisko: 0.25 },
  { ad: 'Liman: Son Vapur',    tema: 'liman',  uzunluk: 19500, zorluk: 0.75, zombi: 80, kutu: 24, rampa: 7, kosucu: 0.3,  sisko: 0.25 },
];

// Tema renkleri: gökyüzü, uzak ve orta katman silüetleri, toprak, yol
const TEMALAR = {
  sehir:  { gok: ['#78c2ee', '#d4f0fb'], uzak: '#a6bccf', orta: '#7890a8', zemin: '#5b4636', yol: '#3e3e46', cizgi: '#f2d34b', kenar: '#2c2c33' },
  sanayi: { gok: ['#c7ad86', '#f1e4c7'], uzak: '#ad9f8c', orta: '#7f7368', zemin: '#4e4136', yol: '#39373b', cizgi: '#e0c04a', kenar: '#28262a' },
  orman:  { gok: ['#86cbe6', '#e4f6e1'], uzak: '#84b391', orta: '#4c875a', zemin: '#5a3d26', yol: '#7b5b3b', cizgi: null, kenar: '#4c9a3f' },
  koy:    { gok: ['#94d3f4', '#fdf1d4'], uzak: '#acc98c', orta: '#79a45c', zemin: '#6a4a2c', yol: '#8c6b45', cizgi: null, kenar: '#6fb04a' },
  dag:    { gok: ['#6aafe4', '#d8edfa'], uzak: '#8e9db7', orta: '#647390', zemin: '#4c4952', yol: '#6e675f', cizgi: null, kenar: '#5f5a62' },
  col:    { gok: ['#f0b15e', '#fde6b5'], uzak: '#dc9d5d', orta: '#c27b41', zemin: '#a86f3c', yol: '#d6a668', cizgi: null, kenar: '#c08a50' },
  otoyol: { gok: ['#e6956a', '#f9d8ae'], uzak: '#bb8c78', orta: '#8b6b61', zemin: '#5d4b40', yol: '#3b3939', cizgi: '#f0f0f0', kenar: '#2b2929' },
  gece:   { gok: ['#0a0f2e', '#2c3160'], uzak: '#1e2549', orta: '#141935', zemin: '#1d1b24', yol: '#2a2a33', cizgi: '#c9b23a', kenar: '#15151b', gece: true },
  liman:  { gok: ['#ef865a', '#fbd690'], uzak: '#c97c6b', orta: '#8b5b5b', zemin: '#4a3a34', yol: '#3b3739', cizgi: '#f2d34b', kenar: '#2a2628' },
};

// Zombi türleri:
//  hiz: yürüme hızı, esik: ezmek için gereken çarpma hızı,
//  yavas: çarpınca arabanın hızının çarpılacağı sayı, altin: kazandırdığı altın
const ZOMBI_TIPLERI = {
  normal: { hiz: 38,  esik: 150, yavas: 0.94, altin: 5,  hasar: 6,  boy: 1.0 },
  kosucu: { hiz: 105, esik: 150, yavas: 0.95, altin: 8,  hasar: 5,  boy: 0.95 },
  sisko:  { hiz: 24,  esik: 230, yavas: 0.84, altin: 15, hasar: 10, boy: 1.18 },
};

const KUTU_BOYU = 42;

// Şu an oynanan bölümün verisi (arazi, zombiler, kutular...)
let Seviye = null;

// x konumundaki zemin yüksekliği (y aşağı doğru artar; zemin ~0 civarı)
function yukseklik(x) {
  const h = Seviye.h;
  const k = x / ADIM;
  if (k <= 0) return h[0];
  const n = h.length - 1;
  if (k >= n) return h[n];
  const i = k | 0, f = k - i;
  return h[i] + (h[i + 1] - h[i]) * f;
}

// x konumundaki eğim (dy/dx)
function egim(x) {
  return (yukseklik(x + 4) - yukseklik(x - 4)) / 8;
}

// Bir bölümü sıfırdan üretir (her seferinde aynı yol çıkar)
function seviyeOlustur(i) {
  const b = BOLUMLER[i];
  const rnd = mulberry32(1000 + i * 7919);
  const L = b.uzunluk;
  const N = Math.ceil((L + 3500) / ADIM);
  const h = new Float32Array(N);
  const z = b.zorluk;
  const p = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const T = Math.PI * 2;

  // 1) Tepeler: farklı dalga boylarındaki sinüslerin toplamı
  for (let k = 0; k < N; k++) {
    const x = k * ADIM;
    let y = Math.sin((x / 4100) * T + p[3]) * 150 * z
          + Math.sin((x / 1900) * T + p[0]) * 100 * z
          + Math.sin((x / 760) * T + p[1]) * 34 * z
          + Math.sin((x / 330) * T + p[2]) * 8 * z;
    // Başlangıç ve bitiş düz olsun
    const f = yumusak(300, 1300, x) * (1 - yumusak(L - 1500, L - 450, x));
    h[k] = y * f;
  }

  // 2) Rampalar: yavaşça yükselen, sonra aniden biten tümsekler (zıplama!)
  const rampalar = [];
  for (let r = 0; r < b.rampa; r++) {
    const bolge = (L - 3600) / b.rampa;
    const x0 = 1800 + r * bolge + rnd() * bolge * 0.6;
    const yuk = aralik(rnd, 45, 80) * (0.8 + z * 0.4);
    const gen = yuk * 5.2; // rampa uzunluğu (eğim çok dik olmasın)
    rampalar.push({ x: x0, gen, yuk });
    for (let k = Math.floor(x0 / ADIM); k < Math.ceil((x0 + gen + 40) / ADIM) && k < N; k++) {
      const x = k * ADIM;
      let ek = 0;
      if (x < x0 + gen) { const t = (x - x0) / gen; ek = yuk * t * t; }
      else { ek = yuk * (1 - (x - x0 - gen) / 40); }
      h[k] -= Math.max(0, ek);
    }
  }

  // 3) Yokuşları sınırla: kamyon hiçbir yokuşta takılıp kalmasın.
  //    (y aşağı doğru arttığı için "yukarı çıkmak" = h'nin azalması)
  const maxEgim = (0.36 + i * 0.012) * ADIM;
  for (let k = 1; k < N; k++) {
    if (h[k] < h[k - 1] - maxEgim) h[k] = h[k - 1] - maxEgim;
  }

  // Bir x'in rampaya yakın olup olmadığı (kutu/zombi koymamak için)
  const rampaYakin = (x, pay) => rampalar.some(r => x > r.x - pay && x < r.x + r.gen + 40 + pay);

  // 4) Zombiler (bazen tek, bazen sürü halinde)
  const zombiler = [];
  let kalan = b.zombi;
  while (kalan > 0) {
    const x = aralik(rnd, 1000, L - 500);
    const suru = rnd() < 0.3 ? Math.min(kalan, 3 + Math.floor(rnd() * 3)) : 1;
    for (let s = 0; s < suru; s++) {
      const r = rnd();
      const tip = r < b.sisko ? 'sisko' : r < b.sisko + b.kosucu ? 'kosucu' : 'normal';
      zombiler.push(zombiYap(x + s * aralik(rnd, 30, 60), tip, rnd));
    }
    kalan -= suru;
  }
  zombiler.sort((a, c) => a.x - c.x);

  // 5) Kutu yığınları (çarpınca arabayı yavaşlatır)
  const kutular = [];
  for (let k = 0; k < b.kutu; k++) {
    let x, deneme = 0;
    do { x = aralik(rnd, 1300, L - 900); deneme++; } while (rampaYakin(x, 120) && deneme < 20);
    const adet = 1 + Math.floor(rnd() * Math.min(3, 1 + i * 0.35));
    kutular.push({ x, adet, kirildi: false });
  }

  return { i, b, ad: b.ad, tema: b.tema, renk: TEMALAR[b.tema], L, h, rampalar, zombiler, kutular,
           sure: Math.round(L / 240) + 8 }; // bölüm süresi (saniye)
}

// Tek bir zombi nesnesi oluşturur
function zombiYap(x, tip, rnd) {
  const gomlekler = ['#c0504d', '#4f81bd', '#9bbb59', '#8064a2', '#f79646', '#7f7f7f', '#d4a017'];
  const pantolonlar = ['#2f3b59', '#4a3b2a', '#3b3b3b', '#55402f'];
  return {
    x, y: 0, tip, t: ZOMBI_TIPLERI[tip],
    durum: 'yuru',                  // yuru | ucuyor | olu
    vx: 0, vy: 0, rot: 0, vr: 0,
    yon: -1,                         // -1: sola bakıyor (arabaya doğru)
    faz: rnd() * 6.28,
    uyandi: false,
    gomlek: gomlekler[Math.floor(rnd() * gomlekler.length)],
    pantolon: pantolonlar[Math.floor(rnd() * pantolonlar.length)],
    deri: ['#8bc34a', '#9ccc65', '#7cb342', '#a5c27a'][Math.floor(rnd() * 4)],
    inlemeSure: 2 + rnd() * 6,
    saldiriSure: 0,
  };
}
