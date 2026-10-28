'use strict';
// =====================================================================
//  ZOMBİLER, KUTULAR ve PARÇACIKLAR (efektler)
// =====================================================================

// ---------------------------------------------------------------------
//  Parçacık sistemi: yeşil zombi lekesi, tahta parçaları, yıldız, duman
// ---------------------------------------------------------------------
const Parcaciklar = {
  liste: [],
  ekle(p) { if (this.liste.length < 600) this.liste.push(p); },
  temizle() { this.liste.length = 0; },

  guncelle(dt) {
    const l = this.liste;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.omur -= dt;
      if (p.omur <= 0) { l.splice(i, 1); continue; }
      if (p.yercekimi !== 0) p.vy += (p.yercekimi || YC * 0.8) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += (p.vr || 0) * dt;
      // zemine düşen parçacıklar dursun
      if (p.zemin && Seviye) {
        const hy = yukseklik(p.x);
        if (p.y > hy) { p.y = hy; p.vy *= -0.3; p.vx *= 0.6; p.vr = (p.vr || 0) * 0.5; }
      }
      if (p.buyu) p.boy += p.buyu * dt;
    }
  },

  ciz(ctx) {
    for (const p of this.liste) {
      const a = Math.min(1, p.omur / (p.solma || 0.4));
      ctx.globalAlpha = a * (p.alfa || 1);
      ctx.fillStyle = p.renk;
      if (p.tip === 'tahta') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.boy, -p.boy * 0.25, p.boy * 2, p.boy * 0.5);
        ctx.restore();
      } else if (p.tip === 'yildiz') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? p.boy * 0.45 : p.boy;
          const aa = (i / 10) * Math.PI * 2;
          ctx.lineTo(Math.cos(aa) * r, Math.sin(aa) * r);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.boy, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },

  // Zombi ezilince: yeşil lekeler + yıldızlar
  zombiPatla(x, y, vx) {
    for (let i = 0; i < 16; i++) {
      this.ekle({ x, y, vx: vx * 0.4 + (Math.random() - 0.5) * 380, vy: -Math.random() * 420 - 60,
        omur: 0.9 + Math.random() * 0.6, renk: ['#7cb342', '#9ccc65', '#558b2f'][i % 3], boy: 2.5 + Math.random() * 4, rot: 0, zemin: true });
    }
    for (let i = 0; i < 5; i++) {
      this.ekle({ x, y: y - 20, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 300 - 120, omur: 0.8, renk: '#ffd54a',
        boy: 6, tip: 'yildiz', rot: 0, vr: 6, zemin: true });
    }
  },

  // Kutu kırılınca: tahta parçaları
  kutuPatla(x, y, vx) {
    for (let i = 0; i < 9; i++) {
      this.ekle({ x: x + (Math.random() - 0.5) * 30, y: y - Math.random() * 30, vx: vx * 0.7 + (Math.random() - 0.3) * 300,
        vy: -Math.random() * 450 - 100, omur: 1.4 + Math.random(), renk: i % 2 ? '#b5793f' : '#8d5a2b',
        boy: 6 + Math.random() * 6, tip: 'tahta', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20, zemin: true, solma: 0.6 });
    }
  },

  // Toz bulutu
  toz(x, y, renk) {
    this.ekle({ x, y, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 40, omur: 0.6, renk: renk || 'rgba(160,140,120,1)',
      boy: 4 + Math.random() * 4, buyu: 14, yercekimi: 0, alfa: 0.5, solma: 0.6 });
  },

  // Hasarlı kamyondan çıkan duman
  duman(x, y) {
    this.ekle({ x, y, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 30, omur: 1.2, renk: '#555',
      boy: 4, buyu: 12, yercekimi: 0, alfa: 0.45, solma: 1.2 });
  },

  // Havai fişek (final)
  havaiFisek(x, y) {
    const renk = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb'][Math.floor(Math.random() * 5)];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2, h = 150 + Math.random() * 120;
      this.ekle({ x, y, vx: Math.cos(a) * h, vy: Math.sin(a) * h, omur: 1.3 + Math.random() * 0.5, renk, boy: 3, yercekimi: 120, solma: 0.8 });
    }
  },
};

// ---------------------------------------------------------------------
//  Uçan yazılar (+5, KOMBO! gibi)
// ---------------------------------------------------------------------
const Yazilar = {
  liste: [],
  ekle(x, y, metin, renk, boy) { this.liste.push({ x, y, metin, renk: renk || '#ffd54a', boy: boy || 22, omur: 1.1 }); },
  guncelle(dt) {
    for (let i = this.liste.length - 1; i >= 0; i--) {
      const y = this.liste[i]; y.omur -= dt; y.y -= 50 * dt;
      if (y.omur <= 0) this.liste.splice(i, 1);
    }
  },
  ciz(ctx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const y of this.liste) {
      ctx.globalAlpha = Math.min(1, y.omur / 0.4);
      ctx.font = `${y.boy}px "Lilita One", "Arial Black", sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(y.metin, y.x, y.y);
      ctx.fillStyle = y.renk; ctx.fillText(y.metin, y.x, y.y);
    }
    ctx.globalAlpha = 1;
  },
};

// ---------------------------------------------------------------------
//  ZOMBİ GÜNCELLEME + ÇARPIŞMA
//  olay(tip, z) fonksiyonu oyuna haber verir: 'ez' | 'saldiri'
// ---------------------------------------------------------------------
function zombileriGuncelle(dt, araba, olay) {
  const liste = Seviye.zombiler;
  for (let i = 0; i < liste.length; i++) {
    const z = liste[i];
    if (z.durum === 'olu') continue;
    const dx = araba.x - z.x;
    if (Math.abs(dx) > 1600 && z.durum !== 'ucuyor') continue; // uzaktakileri hesaplama

    // --- Havaya uçan (ezilmiş) zombi
    if (z.durum === 'ucuyor') {
      z.vy += YC * dt; z.x += z.vx * dt; z.y += z.vy * dt; z.rot += z.vr * dt;
      if (z.vy > 0 && z.y > yukseklik(z.x) - 10) {
        z.durum = 'olu';
        Parcaciklar.zombiPatla(z.x, z.y - 10, z.vx);
      }
      continue;
    }

    // --- Yürüme: araba yaklaşınca uyanır ve arabaya doğru yürür
    if (Math.abs(dx) < 850) z.uyandi = true;
    if (z.uyandi) {
      z.yon = dx < 0 ? -1 : 1;
      z.vx = z.saldiriSure > 0 ? 0 : z.yon * z.t.hiz;
    } else z.vx = 0;
    z.x += z.vx * dt;
    z.y = yukseklik(z.x);
    z.faz += dt * (z.vx !== 0 ? (z.t.hiz / 9) : 1.5);
    if (z.saldiriSure > 0) z.saldiriSure -= dt;

    if (z.uyandi && Math.abs(dx) < 700) {
      z.inlemeSure -= dt;
      if (z.inlemeSure <= 0) { z.inlemeSure = 3 + Math.random() * 6; Ses.inleme(); }
    }

    // --- Kamyonla çarpışma (zombinin ortasını kamyonun yerel koordinatına çevir)
    const boy = 60 * z.t.boy;
    const yer = araba.yerele(z.x, z.y - boy * 0.5);
    const yariGen = (z.tip === 'sisko' ? 16 : 11);
    const onUc = araba.yuk.tampon >= 1 ? 86 : 72;
    if (yer.x > -68 - yariGen && yer.x < onUc + yariGen && yer.y > -54 - boy * 0.5 && yer.y < 44 + boy * 0.5) {
      const bagilHiz = Math.hypot(araba.vx - z.vx, araba.vy * 0.7);
      if (bagilHiz > z.t.esik * araba.ezmeCarpan) {
        // EZİLDİ! Havaya fırlat
        z.durum = 'ucuyor';
        const yon = araba.vx >= 0 ? 1 : -1;
        z.vx = araba.vx * 0.9 + yon * (60 + Math.random() * 120);
        z.vy = -(260 + Math.random() * 240 + bagilHiz * 0.35);
        z.vr = yon * (6 + Math.random() * 8);
        z.y -= 8;
        araba.yavasla(z.t.yavas);
        olay('ez', z);
      } else {
        // Yavaş çarpma: zombi kamyona vurur ve geri sekip sersemler.
        // (Kamyonu durdurmaz, böylece hızlanıp sonra ezebilirsin.)
        if (z.saldiriSure <= 0) {
          z.saldiriSure = 1.0;
          araba.hasarAl(z.t.hasar);
          olay('saldiri', z);
          const geri = yer.x > 0 ? 1 : -1; // kamyonun önündeyse ileri, arkasındaysa geri it
          z.x += geri * Math.cos(araba.a) * 45;
          z.y = yukseklik(z.x);
        }
      }
    }
  }
}

// Zombi çizimi
function zombiCiz(ctx, z, zaman) {
  if (z.durum === 'olu') return;
  const boy = z.t.boy;
  const sisko = z.tip === 'sisko';
  ctx.save();
  ctx.translate(z.x, z.y);
  if (z.durum === 'ucuyor') { ctx.translate(0, -35 * boy); ctx.rotate(z.rot); ctx.translate(0, 35 * boy); }
  ctx.scale(z.yon * boy, boy);

  const sal = z.durum === 'ucuyor' ? Math.sin(zaman * 30) * 0.9 : Math.sin(z.faz) * 0.5;
  const saldiri = z.saldiriSure > 0;

  // bacaklar
  ctx.strokeStyle = z.pantolon; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (const k of [1, -1]) {
    const a = sal * k;
    ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(Math.sin(a) * 24, -26 + Math.cos(a) * 24); ctx.stroke();
    ctx.fillStyle = '#3b2a1e';
    ctx.beginPath(); ctx.ellipse(Math.sin(a) * 24 + 3, -26 + Math.cos(a) * 24, 5, 3, 0, 0, 7); ctx.fill();
  }

  // gövde (yırtık tişört)
  ctx.fillStyle = z.gomlek;
  const gx = sisko ? -15 : -9, gw = sisko ? 30 : 18;
  ctx.beginPath();
  ctx.moveTo(gx, -50);
  ctx.lineTo(gx + gw, -50);
  ctx.lineTo(gx + gw + (sisko ? 3 : 0), -24);
  for (let i = 0; i <= 4; i++) ctx.lineTo(gx + gw - (i / 4) * gw, -24 + (i % 2 ? -5 : 0));
  ctx.closePath(); ctx.fill();
  if (sisko) { // göbek
    ctx.fillStyle = z.deri;
    ctx.beginPath(); ctx.ellipse(6, -30, 11, 7, 0, 0, 7); ctx.fill();
  }

  // kollar (öne uzanmış)
  ctx.strokeStyle = z.deri; ctx.lineWidth = 5;
  const kolSal = saldiri ? Math.sin(zaman * 25) * 6 : Math.sin(z.faz * 0.5) * 3;
  ctx.beginPath();
  ctx.moveTo(2, -46); ctx.lineTo(26, -44 + kolSal);
  ctx.moveTo(-2, -42); ctx.lineTo(22, -36 - kolSal);
  ctx.stroke();
  ctx.fillStyle = z.deri;
  ctx.beginPath(); ctx.arc(27, -44 + kolSal, 3.5, 0, 7); ctx.arc(23, -36 - kolSal, 3.5, 0, 7); ctx.fill();

  // kafa
  ctx.fillStyle = z.deri;
  ctx.beginPath(); ctx.arc(4, -61, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(60,90,30,0.35)';
  ctx.beginPath(); ctx.arc(-1, -66, 3.5, 0, 7); ctx.fill();
  // saç tutamları
  ctx.strokeStyle = '#3b3b2a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -71); ctx.lineTo(-2, -77); ctx.moveTo(5, -72); ctx.lineTo(6, -78); ctx.moveTo(-5, -69); ctx.lineTo(-9, -73); ctx.stroke();
  // gözler (biri büyük biri küçük - komik)
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(9, -63, 4.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(2, -62, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#d32f2f';
  ctx.beginPath(); ctx.arc(10, -63, 2, 0, 7); ctx.arc(2.6, -62, 1.4, 0, 7); ctx.fill();
  // ağız
  ctx.fillStyle = '#3b1f1f';
  ctx.beginPath(); ctx.moveTo(4, -55); ctx.lineTo(13, -56); ctx.lineTo(12, -52); ctx.lineTo(5, -52); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(7, -56, 2, 2); ctx.fillRect(10, -56, 2, 2);

  ctx.lineCap = 'butt';
  ctx.restore();
}

// ---------------------------------------------------------------------
//  KUTULAR: çarpınca kırılır ve kamyonu yavaşlatır
// ---------------------------------------------------------------------
function kutulariGuncelle(araba, olay) {
  for (const k of Seviye.kutular) {
    if (k.kirildi) continue;
    if (Math.abs(araba.x - k.x) > 140) continue;
    const zeminY = yukseklik(k.x);
    const ust = zeminY - k.adet * KUTU_BOYU;
    // kutunun birkaç noktasını kamyonun yerel koordinatında kontrol et
    let carpti = false;
    for (let yy = zeminY - 10; yy > ust; yy -= 18) {
      for (const xx of [k.x - KUTU_BOYU / 2, k.x + KUTU_BOYU / 2]) {
        const y = araba.yerele(xx, yy);
        if (y.x > -68 && y.x < (araba.yuk.tampon >= 1 ? 88 : 72) && y.y > -54 && y.y < 44) { carpti = true; break; }
      }
      if (carpti) break;
    }
    if (carpti) {
      k.kirildi = true;
      for (let i = 0; i < k.adet; i++) {
        Parcaciklar.kutuPatla(k.x, zeminY - (i + 0.5) * KUTU_BOYU, araba.vx);
        araba.yavasla(0.8);
      }
      olay('kutu', k);
    }
  }
}

function kutuCiz(ctx, x, y, s) {
  ctx.fillStyle = '#b5793f';
  ctx.fillRect(x - s / 2, y - s, s, s);
  ctx.strokeStyle = '#7a4b22'; ctx.lineWidth = 3;
  ctx.strokeRect(x - s / 2 + 1.5, y - s + 1.5, s - 3, s - 3);
  ctx.beginPath();
  ctx.moveTo(x - s / 2 + 3, y - s + 3); ctx.lineTo(x + s / 2 - 3, y - 3);
  ctx.moveTo(x + s / 2 - 3, y - s + 3); ctx.lineTo(x - s / 2 + 3, y - 3);
  ctx.stroke();
  ctx.fillStyle = '#5a3818';
  for (const p of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.beginPath(); ctx.arc(x + p[0] * (s / 2 - 5), y - s / 2 + p[1] * (s / 2 - 5), 1.6, 0, 7); ctx.fill();
  }
}

function kutulariCiz(ctx, x0, x1) {
  for (const k of Seviye.kutular) {
    if (k.kirildi || k.x < x0 - 60 || k.x > x1 + 60) continue;
    const zy = yukseklik(k.x);
    for (let i = 0; i < k.adet; i++) kutuCiz(ctx, k.x, zy - i * KUTU_BOYU + 2, KUTU_BOYU);
  }
}
