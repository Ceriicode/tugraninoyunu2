'use strict';
// =====================================================================
//  KAMYON: fizik + çizim
//  Gövde bir "rigid body" (konum, açı, hız, açısal hız).
//  İki teker ayrı noktasal kütleler; gövdeye yaylarla (süspansiyon) bağlı.
//  Tekerler zemine çarpar, gaz/fren kuvveti tekerlere uygulanır.
// =====================================================================

const YC = 1500;           // yer çekimi (px/s²)
const TEKER_KUTLE = 0.15;  // teker kütlesi (gövde = 1)
const KA = 80, CA = 3.2;   // süspansiyon: dikey yay sertliği ve sönüm
const KL = 900, CL = 11;   // süspansiyon: yanal sertlik ve sönüm
const DINLENME = 14;       // teker, bağlantı noktasının ne kadar altında durur
const SINIR = 9;           // süspansiyonun en fazla yukarı sıkışması
const TEKER_R = 17;        // teker yarıçapı

class Araba {
  constructor(x, yuk) {
    this.yuk = yuk; // yükseltmeler {motor, zirh, tampon}

    // Yükseltmelere göre özellikler
    this.maxHiz = 470 + yuk.motor * 55;             // en yüksek hız
    this.ivme = 820 + yuk.motor * 80;               // hızlanma
    this.frenIvme = 950;
    this.maxCan = 100 + yuk.zirh * 30;              // kamyon dayanıklılığı
    this.can = this.maxCan;
    this.ezmeCarpan = 1 - yuk.zirh * 0.06;          // zombi ezme eşiğini düşürür
    this.yavasCarpan = 1 - yuk.tampon * 0.14;       // kutu/zombi yavaşlatmasını azaltır

    // Gövde
    this.m = 1; this.I = 1250;
    this.x = x; this.a = 0; this.vx = 0; this.vy = 0; this.w = 0;
    this.y = yukseklik(x) - (12 + DINLENME + TEKER_R) - 2;

    // Tekerler (lx, ly: gövdeye bağlandığı yerel nokta)
    this.tekerler = [{ lx: -37, ly: 12 }, { lx: 37, ly: 12 }].map(t =>
      Object.assign(t, { x: 0, y: 0, vx: 0, vy: 0, rot: 0, yerde: false, nx: 0, ny: -1 }));
    for (const t of this.tekerler) { const p = this.dinlenme(t); t.x = p.x; t.y = p.y; }

    // Gövdenin zemine çarpabilen noktaları (yerel koordinat)
    this.govdeNoktalari = [
      { x: -60, y: 10 }, { x: 64, y: 8 }, { x: -64, y: -28 }, { x: 68, y: -10 },
      { x: -20, y: 12 }, { x: 20, y: 12 },
    ];
    // Kabin tavanı: buraya zemin değerse kamyon devrilmiş demektir
    this.tavanNoktalari = [{ x: 4, y: -50 }, { x: 30, y: -50 }, { x: 42, y: -28 }, { x: -30, y: -30 }];

    this.devrildi = false;
    this.yanSure = 0;      // yan/ters yatma süresi
    this.yerde = false;
    this.sonCarpma = 0;
    this.gaz = false;
    this.ifade = 'normal'; // Tuğra'nın yüz ifadesi
    this.ifadeSure = 0;
  }

  // Tekerin dinlenme noktası (dünya koordinatı)
  dinlenme(t) {
    const c = Math.cos(this.a), s = Math.sin(this.a);
    const lx = t.lx, ly = t.ly + DINLENME;
    return { x: this.x + lx * c - ly * s, y: this.y + lx * s + ly * c };
  }

  // Yerel -> dünya
  dunyaya(lx, ly) {
    const c = Math.cos(this.a), s = Math.sin(this.a);
    return { x: this.x + lx * c - ly * s, y: this.y + lx * s + ly * c };
  }

  // Dünya -> yerel
  yerele(wx, wy) {
    const c = Math.cos(this.a), s = Math.sin(this.a);
    const dx = wx - this.x, dy = wy - this.y;
    return { x: dx * c + dy * s, y: -dx * s + dy * c };
  }

  // Kutuya/zombiye çarpınca yavaşla (f: hızın çarpılacağı sayı, örn 0.85)
  yavasla(f) {
    f = 1 - (1 - f) * this.yavasCarpan;
    this.vx *= f;
    for (const t of this.tekerler) t.vx *= f;
  }

  // Hasar al
  hasarAl(miktar) {
    this.can = Math.max(0, this.can - miktar);
  }

  // Bir fizik adımı (dt saniye). g: girdi {gaz, fren, arka, on}
  adim(dt, g) {
    const c = Math.cos(this.a), s = Math.sin(this.a);
    const ux = -s, uy = c;   // gövdenin "aşağı" yönü
    const rx = c, ry = s;    // gövdenin "ileri" yönü
    this.gaz = !!g.gaz;

    // --- Yer çekimi
    this.vy += YC * dt;

    // --- Süspansiyon yayları
    let yerdeSayi = 0;
    for (const t of this.tekerler) {
      t.vy += YC * dt;
      const lx = t.lx, ly = t.ly + DINLENME;
      const px = this.x + lx * c - ly * s, py = this.y + lx * s + ly * c;
      const ax = px - this.x, ay = py - this.y;              // kol (arm)
      const pvx = this.vx - this.w * ay, pvy = this.vy + this.w * ax; // o noktanın hızı
      const dx = t.x - px, dy = t.y - py;
      const rvx = t.vx - pvx, rvy = t.vy - pvy;
      const da = dx * ux + dy * uy, dl = dx * rx + dy * ry;
      const va = rvx * ux + rvy * uy, vl = rvx * rx + rvy * ry;
      let Fa = -(KA * da + CA * va);
      if (da < -SINIR) Fa += -(da + SINIR) * KA * 10; // süspansiyon dibe vurdu
      const Fl = -(KL * dl + CL * vl);
      const Fx = ux * Fa + rx * Fl, Fy = uy * Fa + ry * Fl;
      t.vx += (Fx / TEKER_KUTLE) * dt; t.vy += (Fy / TEKER_KUTLE) * dt;
      this.vx -= (Fx / this.m) * dt; this.vy -= (Fy / this.m) * dt;
      this.w -= ((ax * Fy - ay * Fx) / this.I) * dt;
      if (t.yerde) yerdeSayi++;
    }
    this.yerde = yerdeSayi > 0;

    // --- Gaz / fren (yerdeki tekerlere zemin boyunca kuvvet)
    for (const t of this.tekerler) {
      if (!t.yerde) continue;
      const tx = -t.ny, ty = t.nx; // zemin teğeti (sağa doğru)
      const vt = t.vx * tx + t.vy * ty;
      let ivme = 0;
      if (g.gaz) {
        ivme = this.ivme * Math.max(0, 1 - vt / this.maxHiz);
      } else if (g.fren) {
        if (vt > 6) ivme = -this.frenIvme;                                         // fren
        else ivme = -this.ivme * 0.5 * Math.max(0, 1 + vt / (this.maxHiz * 0.35)); // geri vites
      } else {
        ivme = -sinirla(vt * 0.8, -50, 50); // yuvarlanma direnci
      }
      const F = (ivme * (this.m + 2 * TEKER_KUTLE)) / 2;
      t.vx += (tx * F / TEKER_KUTLE) * dt; t.vy += (ty * F / TEKER_KUTLE) * dt;
      t.rot += (vt / TEKER_R) * dt;
    }
    for (const t of this.tekerler) if (!t.yerde && g.gaz) t.rot += 25 * dt; // havada boşta dönsün

    // --- ARKA TEKER / ÖN TEKER tuşları: gövdeyi döndür
    //  arka: burun yukarı (arka tekerin üstüne kalk) -> açı azalır
    //  on  : arka yukarı (ön tekerin üstüne kalk)   -> açı artar
    const guc = this.yerde ? 46 : 9;
    if (g.arka && this.w > -3.2) this.w -= guc * dt;
    if (g.on && this.w < 3.2) this.w += guc * dt;

    // --- Sürtünmeler
    const hs = 1 - 0.03 * dt;
    this.vx *= hs; this.vy *= hs;
    this.w *= 1 - (this.yerde ? 1.4 : 0.5) * dt;

    // --- Konumları ilerlet
    this.x += this.vx * dt; this.y += this.vy * dt; this.a += this.w * dt;
    for (const t of this.tekerler) { t.x += t.vx * dt; t.y += t.vy * dt; }

    // --- Teker - zemin çarpışması
    for (const t of this.tekerler) {
      if (t.x < TEKER_R) { t.x = TEKER_R; if (t.vx < 0) t.vx = 0; } // sol duvar
      const hy = yukseklik(t.x), e = egim(t.x);
      const inv = 1 / Math.sqrt(1 + e * e);
      const nx = e * inv, ny = -inv;           // zeminin yukarı normali
      const mesafe = (hy - t.y) * inv;
      if (mesafe < TEKER_R) {
        const pen = TEKER_R - mesafe;
        t.x += nx * pen; t.y += ny * pen;
        const vn = t.vx * nx + t.vy * ny;
        if (vn < 0) { t.vx -= nx * vn; t.vy -= ny * vn; }
        t.yerde = true; t.nx = nx; t.ny = ny;
      } else {
        t.yerde = mesafe < TEKER_R + 3;
        if (t.yerde) { t.nx = nx; t.ny = ny; }
      }
    }

    // --- Gövde - zemin çarpışması
    let carpmaHizi = 0;
    const noktalar = this.govdeNoktalari.concat(this.tavanNoktalari);
    for (let k = 0; k < noktalar.length; k++) {
      const p = noktalar[k];
      const c2 = Math.cos(this.a), s2 = Math.sin(this.a);
      const wx = this.x + p.x * c2 - p.y * s2, wy = this.y + p.x * s2 + p.y * c2;
      const hy = yukseklik(wx);
      if (wy <= hy) continue;
      if (k >= this.govdeNoktalari.length) this.devrildi = true; // tavan yere değdi!
      const e = egim(wx), inv = 1 / Math.sqrt(1 + e * e);
      const nx = e * inv, ny = -inv;
      const pen = (wy - hy) * inv;
      this.x += nx * pen * 0.8; this.y += ny * pen * 0.8;
      const rxp = wx - this.x, ryp = wy - this.y;
      const vpx = this.vx - this.w * ryp, vpy = this.vy + this.w * rxp;
      const vn = vpx * nx + vpy * ny;
      if (vn < 0) {
        const rn = rxp * ny - ryp * nx;
        const j = (-(1 + 0.15) * vn) / (1 / this.m + (rn * rn) / this.I);
        this.vx += (nx * j) / this.m; this.vy += (ny * j) / this.m; this.w += (rn * j) / this.I;
        // sürtünme
        const tx = -ny, ty = nx;
        const vt = vpx * tx + vpy * ty;
        const rt = rxp * ty - ryp * tx;
        let jt = -vt / (1 / this.m + (rt * rt) / this.I);
        jt = sinirla(jt, -0.6 * j, 0.6 * j);
        this.vx += (tx * jt) / this.m; this.vy += (ty * jt) / this.m; this.w += (rt * jt) / this.I;
        carpmaHizi = Math.max(carpmaHizi, -vn);
      }
    }

    // --- Yan yatıp kaldıysa (ör. dimdik durursa) devrilmiş say
    const na = aciNormal(this.a);
    if (Math.abs(na) > 1.75 && Math.hypot(this.vx, this.vy) < 120) this.yanSure += dt; else this.yanSure = 0;
    if (this.yanSure > 1.4) this.devrildi = true;

    if (this.ifadeSure > 0) { this.ifadeSure -= dt; if (this.ifadeSure <= 0) this.ifade = 'normal'; }
    return carpmaHizi;
  }

  // Tuğra'nın yüz ifadesini kısa süre değiştir
  ifadeYap(ifade, sure) { this.ifade = ifade; this.ifadeSure = sure; }

  // Dünyaya çiz (ctx kamera dönüşümünde)
  ciz(ctx, zaman, farAcik) {
    if (farAcik) farCiz(ctx, this);
    for (const t of this.tekerler) tekerCiz(ctx, t.x, t.y, t.rot, TEKER_R);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.a);
    kasaCiz(ctx, this.yuk, 1 - this.can / this.maxCan, zaman, this.ifade);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------
//  ÇİZİM FONKSİYONLARI (menüde de kullanılıyor)
// ---------------------------------------------------------------------

// Teker
function tekerCiz(ctx, x, y, rot, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = '#18181c';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  // lastik dişleri
  ctx.fillStyle = '#2c2c33';
  for (let i = 0; i < 10; i++) {
    ctx.rotate(Math.PI / 5);
    ctx.fillRect(r - 4, -2.5, 4, 5);
  }
  // jant
  ctx.fillStyle = '#9aa3ad';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6b7480';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
  // bijonlar
  ctx.fillStyle = '#d7dde3';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Kamyon kasası (yerel koordinatlarda, sağa bakıyor). hasar: 0..1
function kasaCiz(ctx, yuk, hasar, zaman, ifade) {
  // --- Şasi
  ctx.fillStyle = '#1d1d22';
  ctx.beginPath(); yuvarlakDikdortgen(ctx, -62, 0, 128, 12, 4); ctx.fill();

  // --- Damper (sarı kasa)
  ctx.fillStyle = '#f7b500';
  ctx.beginPath();
  ctx.moveTo(-66, -30); ctx.lineTo(-2, -30); ctx.lineTo(-2, 4); ctx.lineTo(-58, 4); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-66, -30, 64, 5);
  ctx.strokeStyle = '#d69400'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (const x of [-50, -34, -18]) { ctx.moveTo(x, -23); ctx.lineTo(x, 1); }
  ctx.stroke();

  // Zırh yükseltmesi: kasada metal plaka
  if (yuk.zirh >= 1) {
    ctx.fillStyle = '#8d96a0';
    ctx.beginPath(); yuvarlakDikdortgen(ctx, -56, -20, 46, 16, 3); ctx.fill();
    ctx.fillStyle = '#5d6670';
    for (const p of [[-52, -16], [-14, -16], [-52, -8], [-14, -8]]) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.6, 0, 7); ctx.fill(); }
  }

  // --- Kabin (kırmızı)
  ctx.fillStyle = '#e5262b';
  ctx.beginPath();
  ctx.moveTo(-2, 4); ctx.lineTo(-2, -44);
  ctx.quadraticCurveTo(-2, -51, 5, -51);
  ctx.lineTo(28, -51); ctx.quadraticCurveTo(33, -51, 35, -46);
  ctx.lineTo(44, -24); ctx.lineTo(60, -22);
  ctx.quadraticCurveTo(66, -21, 66, -14);
  ctx.lineTo(66, 4); ctx.closePath();
  ctx.fill();
  // kabin üst parlaklık
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(2, -49, 26, 3);

  // --- Pencere + içinde Tuğra
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(4, -46); ctx.lineTo(27, -46); ctx.lineTo(37, -25); ctx.lineTo(4, -25); ctx.closePath();
  ctx.fillStyle = '#bfe6ff'; ctx.fill();
  ctx.clip();
  tugraCiz(ctx, 18, -31, 9.5, ifade, zaman);
  // cam parlaması
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.moveTo(22, -46); ctx.lineTo(27, -46); ctx.lineTo(17, -25); ctx.lineTo(12, -25); ctx.closePath(); ctx.fill();
  ctx.restore();
  // pencere çerçevesi
  ctx.strokeStyle = '#b3171c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(4, -46); ctx.lineTo(27, -46); ctx.lineTo(37, -25); ctx.lineTo(4, -25); ctx.closePath(); ctx.stroke();
  // zırh 3+: pencere demirleri
  if (yuk.zirh >= 3) {
    ctx.strokeStyle = '#4b535c'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (const x of [11, 19, 27]) { ctx.moveTo(x, -45); ctx.lineTo(x, -26); }
    ctx.stroke();
  }

  // --- Siyah alt bant (oyuncaktaki gibi)
  ctx.fillStyle = '#1d1d22';
  ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(66, -14); ctx.lineTo(66, -5); ctx.lineTo(-2, -5); ctx.closePath(); ctx.fill();
  // kapı çizgisi ve kolu
  ctx.strokeStyle = '#b3171c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(40, -24); ctx.lineTo(40, -14); ctx.stroke();
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(30, -20, 6, 2.5);

  // --- Far
  ctx.fillStyle = '#fff3a0';
  ctx.beginPath(); ctx.arc(62, -18, 3.5, 0, Math.PI * 2); ctx.fill();

  // --- Sarı ön tampon + ızgara
  ctx.fillStyle = '#f7b500';
  ctx.beginPath(); yuvarlakDikdortgen(ctx, 56, -5, 15, 12, 3); ctx.fill();
  ctx.strokeStyle = '#c98a00'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(59, -2); ctx.lineTo(68, -2); ctx.moveTo(59, 2); ctx.lineTo(68, 2); ctx.stroke();

  // --- Tampon yükseltmesi: dikenli kepçe
  if (yuk.tampon >= 1) {
    ctx.fillStyle = '#8a9099';
    ctx.beginPath(); ctx.moveTo(70, -18); ctx.lineTo(80, -10); ctx.lineTo(82, 12); ctx.lineTo(70, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c5ccd4';
    const n = Math.min(5, yuk.tampon + 1);
    for (let i = 0; i < n; i++) {
      const y = -10 + (i * 22) / Math.max(1, n - 1);
      ctx.beginPath(); ctx.moveTo(80, y - 3); ctx.lineTo(89, y); ctx.lineTo(80, y + 3); ctx.closePath(); ctx.fill();
    }
  }

  // --- Çamurluklar (tekerlerin üstünde)
  ctx.strokeStyle = '#1d1d22'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (const x of [-37, 37]) {
    ctx.beginPath(); ctx.arc(x, 26, 22, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // --- Hasar: çatlak ve is lekeleri
  if (hasar > 0.35) {
    ctx.strokeStyle = 'rgba(30,20,20,0.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(48, -20); ctx.lineTo(53, -16); ctx.lineTo(50, -11);
    ctx.moveTo(-40, -28); ctx.lineTo(-36, -22); ctx.lineTo(-41, -17);
    ctx.stroke();
  }
  if (hasar > 0.65) {
    ctx.fillStyle = 'rgba(20,20,20,0.35)';
    ctx.beginPath(); ctx.arc(52, -30, 6, 0, 7); ctx.arc(-20, -12, 7, 0, 7); ctx.fill();
  }
}

// TUĞRA: kıvırcık koyu saçlı, gözlüklü, beyaz tişörtlü :)
// (x, y): kafa merkezi, r: kafa yarıçapı, ifade: normal | cosku | korku
function tugraCiz(ctx, x, y, r, ifade, zaman) {
  zaman = zaman || 0;
  const sallan = ifade === 'cosku' ? Math.sin(zaman * 18) * r * 0.06 : 0;
  ctx.save();
  ctx.translate(x, y + sallan);

  // beyaz tişört / omuzlar
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath(); ctx.ellipse(-r * 0.1, r * 1.55, r * 1.35, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = r * 0.08; ctx.stroke();
  // boyun
  ctx.fillStyle = '#d99c76';
  ctx.fillRect(-r * 0.3, r * 0.7, r * 0.6, r * 0.5);

  // kafa
  ctx.fillStyle = '#eab48d';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  // kulak
  ctx.fillStyle = '#dda07a';
  ctx.beginPath(); ctx.arc(-r * 0.58, r * 0.12, r * 0.24, 0, Math.PI * 2); ctx.fill();

  // kıvırcık saç (üst ve arka)
  ctx.fillStyle = '#2a1a12';
  for (let i = 0; i <= 9; i++) {
    const a = Math.PI * 0.88 + (i / 9) * Math.PI * 0.98;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.36, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i <= 5; i++) {
    const a = Math.PI * 1.05 + (i / 5) * Math.PI * 0.7;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.12, Math.sin(a) * r * 1.12, r * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // ense saçı
  ctx.beginPath(); ctx.arc(-r * 0.8, -r * 0.05, r * 0.33, 0, Math.PI * 2); ctx.fill();
  // saç parlaklığı (bukleler)
  ctx.strokeStyle = '#4a3224'; ctx.lineWidth = r * 0.07;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * 1.15 + i * 0.45;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 1.0, Math.sin(a) * r * 1.0, r * 0.16, 0, Math.PI * 1.4); ctx.stroke();
  }

  // kaşlar
  ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
  const kasY = ifade === 'korku' ? -r * 0.42 : -r * 0.34;
  ctx.beginPath();
  ctx.moveTo(r * 0.08, kasY); ctx.lineTo(r * 0.38, kasY - r * 0.03);
  ctx.moveTo(r * 0.6, kasY - r * 0.03); ctx.lineTo(r * 0.86, kasY);
  ctx.stroke();

  // gözler
  ctx.fillStyle = '#2a1a12';
  const gozR = ifade === 'korku' ? r * 0.11 : r * 0.085;
  ctx.beginPath(); ctx.arc(r * 0.27, -r * 0.06, gozR, 0, 7); ctx.arc(r * 0.74, -r * 0.06, gozR, 0, 7); ctx.fill();

  // gözlük (koyu kahve çerçeve, yeşil sap)
  ctx.strokeStyle = '#3a2216'; ctx.lineWidth = r * 0.12;
  ctx.beginPath(); yuvarlakDikdortgen(ctx, r * 0.04, -r * 0.24, r * 0.46, r * 0.36, r * 0.1); ctx.stroke();
  ctx.beginPath(); yuvarlakDikdortgen(ctx, r * 0.56, -r * 0.24, r * 0.42, r * 0.36, r * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.1); ctx.lineTo(r * 0.56, -r * 0.1); ctx.stroke();
  ctx.strokeStyle = '#2e9e4a';
  ctx.beginPath(); ctx.moveTo(r * 0.04, -r * 0.12); ctx.lineTo(-r * 0.45, -r * 0.02); ctx.stroke();

  // burun
  ctx.strokeStyle = '#c98a66'; ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.moveTo(r * 0.95, r * 0.08); ctx.lineTo(r * 1.02, r * 0.25); ctx.lineTo(r * 0.88, r * 0.28); ctx.stroke();

  // ağız
  if (ifade === 'cosku') {
    ctx.fillStyle = '#7a2b22';
    ctx.beginPath(); ctx.arc(r * 0.55, r * 0.45, r * 0.28, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(r * 0.33, r * 0.45, r * 0.44, r * 0.08);
  } else if (ifade === 'korku') {
    ctx.fillStyle = '#7a2b22';
    ctx.beginPath(); ctx.ellipse(r * 0.55, r * 0.52, r * 0.14, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = '#7a3b2a'; ctx.lineWidth = r * 0.09;
    ctx.beginPath(); ctx.arc(r * 0.55, r * 0.3, r * 0.26, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  }
  // yanak
  ctx.fillStyle = 'rgba(240,120,110,0.28)';
  ctx.beginPath(); ctx.arc(r * 0.2, r * 0.32, r * 0.16, 0, 7); ctx.fill();
  ctx.lineCap = 'butt';
  ctx.restore();
}

// Gece farı: kamyonun önünde ışık konisi
function farCiz(ctx, araba) {
  const p = araba.dunyaya(62, -18);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(araba.a);
  const g = ctx.createLinearGradient(0, 0, 420, 0);
  g.addColorStop(0, 'rgba(255,245,180,0.45)');
  g.addColorStop(1, 'rgba(255,245,180,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(420, -90); ctx.lineTo(420, 110); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
