'use strict';
// =====================================================================
//  DÜNYA ÇİZİMİ: gökyüzü, paralaks arka plan, zemin/yol, süsler,
//  bitiş kapısı ve SON VAPUR
// =====================================================================

// Arka plan katmanlarını bölüme göre hazırla (rastgele ama hep aynı)
function arkaPlanHazirla(sev) {
  const rnd = mulberry32(5000 + sev.i * 31);
  const tema = sev.tema;
  const uzunluk = sev.L + 4000;

  // Paralaks katmanı: f = kameraya göre ne kadar yavaş kayacağı
  const katman = (f, aralikMin, aralikMax, uret) => {
    const ogeler = [];
    for (let x = -600; x < uzunluk * f + 3000; x += aralik(rnd, aralikMin, aralikMax)) ogeler.push(uret(x));
    return { f, ogeler };
  };

  let uzak, orta;
  if (tema === 'sehir' || tema === 'gece' || tema === 'otoyol') {
    uzak = katman(0.15, 50, 110, x => ({ tip: 'bina', x, w: aralik(rnd, 50, 110), h: aralik(rnd, 90, 230), seed: rnd() * 1e6 }));
    orta = katman(0.4, 90, 190, x => ({ tip: tema === 'otoyol' ? 'tabelaUzak' : 'bina', x, w: aralik(rnd, 60, 120), h: aralik(rnd, 60, 170), seed: rnd() * 1e6 }));
  } else if (tema === 'sanayi' || tema === 'liman') {
    uzak = katman(0.15, 70, 160, x => ({ tip: tema === 'liman' && rnd() < 0.4 ? 'vinc' : 'fabrika', x, w: aralik(rnd, 70, 140), h: aralik(rnd, 60, 140), seed: rnd() * 1e6 }));
    orta = katman(0.4, 80, 160, x => ({ tip: tema === 'liman' ? 'konteyner' : 'fabrika', x, w: aralik(rnd, 60, 120), h: aralik(rnd, 40, 100), seed: rnd() * 1e6 }));
  } else if (tema === 'orman' || tema === 'koy') {
    uzak = katman(0.12, 200, 380, x => ({ tip: 'tepe', x, w: aralik(rnd, 300, 600), h: aralik(rnd, 80, 170) }));
    orta = katman(0.4, 30, 90, x => ({ tip: tema === 'koy' && rnd() < 0.25 ? 'ev' : 'cam', x, w: aralik(rnd, 30, 50), h: aralik(rnd, 70, 150), seed: rnd() * 1e6 }));
  } else if (tema === 'dag') {
    uzak = katman(0.1, 180, 340, x => ({ tip: 'dag', x, w: aralik(rnd, 300, 560), h: aralik(rnd, 200, 340) }));
    orta = katman(0.4, 35, 100, x => ({ tip: 'cam', x, w: aralik(rnd, 30, 50), h: aralik(rnd, 70, 150) }));
  } else { // col
    uzak = katman(0.12, 220, 420, x => ({ tip: 'mesa', x, w: aralik(rnd, 200, 380), h: aralik(rnd, 90, 170) }));
    orta = katman(0.4, 120, 300, x => ({ tip: 'kayaOrta', x, w: aralik(rnd, 60, 140), h: aralik(rnd, 30, 70) }));
  }

  // Bulutlar
  const bulutlar = katman(0.05, 250, 500, x => ({ x, y: aralik(rnd, 40, 200), s: aralik(rnd, 0.7, 1.4) }));

  // Yol kenarı süsleri (dünya koordinatında, kameraya göre tam hızda)
  const yakin = [];
  const secenekler = {
    sehir: ['lamba', 'lamba', 'hurdaAraba', 'koni', 'varil', 'tabela'],
    sanayi: ['varil', 'varil', 'hurdaAraba', 'koni', 'tabela', 'lamba'],
    orman: ['agac', 'cam', 'cam', 'kaya', 'tabela', 'hurdaAraba'],
    koy: ['agac', 'cit', 'saman', 'kaya', 'tabela', 'hurdaAraba'],
    dag: ['cam', 'kaya', 'kaya', 'tabela', 'hurdaAraba'],
    col: ['kaktus', 'kaktus', 'kaya', 'varil', 'tabela', 'hurdaAraba'],
    otoyol: ['lamba', 'hurdaAraba', 'hurdaAraba', 'bariyer', 'koni', 'tabela'],
    gece: ['lamba', 'lamba', 'hurdaAraba', 'varil', 'tabela'],
    liman: ['lamba', 'konteynerYakin', 'varil', 'hurdaAraba', 'tabela'],
  }[tema];
  for (let x = 400; x < sev.L - 300; x += aralik(rnd, 160, 420)) {
    yakin.push({ tip: secenekler[Math.floor(rnd() * secenekler.length)], x, seed: rnd(), renk: ['#4f81bd', '#c0504d', '#9bbb59', '#7f7f7f', '#e0b040'][Math.floor(rnd() * 5)] });
  }

  return { uzak, orta, bulutlar, yakin };
}

// Gökyüzü
function gokyuzuCiz(ctx, VW, VH, renk, zaman) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, renk.gok[0]); g.addColorStop(1, renk.gok[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
  if (renk.gece) {
    // yıldızlar + ay
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) {
      const x = (i * 137.5) % VW, y = (i * 71.3) % (VH * 0.55);
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(zaman * 1.5 + i));
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f5f0d0';
    ctx.beginPath(); ctx.arc(VW * 0.8, VH * 0.16, 34, 0, 7); ctx.fill();
    ctx.fillStyle = renk.gok[0];
    ctx.beginPath(); ctx.arc(VW * 0.8 + 14, VH * 0.16 - 8, 30, 0, 7); ctx.fill();
  } else {
    // güneş
    ctx.fillStyle = 'rgba(255,250,210,0.9)';
    ctx.beginPath(); ctx.arc(VW * 0.78, VH * 0.17, 36, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,210,0.25)';
    ctx.beginPath(); ctx.arc(VW * 0.78, VH * 0.17, 56, 0, 7); ctx.fill();
  }
}

// Bulutlar
function bulutlarCiz(ctx, ap, kamX, VW, zaman, gece) {
  ctx.fillStyle = gece ? 'rgba(120,130,170,0.25)' : 'rgba(255,255,255,0.85)';
  for (const b of ap.bulutlar.ogeler) {
    const x = b.x - kamX * ap.bulutlar.f - zaman * 6;
    const xx = ((x % (VW + 400)) + VW + 400) % (VW + 400) - 200;
    ctx.beginPath();
    ctx.arc(xx, b.y, 22 * b.s, 0, 7);
    ctx.arc(xx + 24 * b.s, b.y - 10 * b.s, 26 * b.s, 0, 7);
    ctx.arc(xx + 52 * b.s, b.y, 20 * b.s, 0, 7);
    ctx.fill();
  }
}

// Paralaks katmanı çiz (silüet tarzı)
function katmanCiz(ctx, k, kamX, kamY, VW, VH, renk, gece, pencereRengi) {
  const taban = karistir(VH * 0.7, -kamY + 40, k.f * 0.9);
  ctx.fillStyle = renk;
  for (const o of k.ogeler) {
    const x = o.x - kamX * k.f;
    if (x + (o.w || 600) < -50 || x > VW + 50) continue;
    switch (o.tip) {
      case 'bina': {
        ctx.fillStyle = renk;
        ctx.fillRect(x, taban - o.h, o.w, o.h + 400);
        // pencereler
        const r = mulberry32(o.seed | 0);
        ctx.fillStyle = pencereRengi;
        for (let yy = taban - o.h + 10; yy < taban - 12; yy += 16) {
          for (let xx = x + 7; xx < x + o.w - 10; xx += 13) {
            if (r() < (gece ? 0.35 : 0.55)) ctx.fillRect(xx, yy, 6, 8);
          }
        }
        ctx.fillStyle = renk;
        break;
      }
      case 'fabrika': {
        ctx.fillRect(x, taban - o.h, o.w, o.h + 400);
        // testere çatı
        ctx.beginPath();
        for (let xx = x; xx < x + o.w - 1; xx += 22) { ctx.moveTo(xx, taban - o.h); ctx.lineTo(xx + 22, taban - o.h - 14); ctx.lineTo(xx + 22, taban - o.h); }
        ctx.fill();
        ctx.fillRect(x + o.w * 0.7, taban - o.h - 60, 12, 60); // baca
        break;
      }
      case 'vinc': {
        ctx.fillRect(x + 20, taban - o.h - 90, 10, o.h + 90 + 400);
        ctx.fillRect(x - 30, taban - o.h - 95, o.w + 40, 8);
        ctx.fillRect(x + o.w * 0.6, taban - o.h - 88, 2, 50);
        break;
      }
      case 'konteyner': {
        const r = mulberry32(o.seed | 0);
        const renkler = ['#a84432', '#3d6e9e', '#4f8a4f', '#c08a2e', '#6c5b8f'];
        for (let i = 0; i < 3; i++) {
          if (r() < 0.3 && i > 0) break;
          ctx.fillStyle = renkler[Math.floor(r() * renkler.length)];
          ctx.globalAlpha = 0.75;
          ctx.fillRect(x, taban - (i + 1) * 30, o.w, 29);
        }
        ctx.globalAlpha = 1; ctx.fillStyle = renk;
        ctx.fillRect(x - 10, taban, o.w + 20, 400);
        break;
      }
      case 'tabelaUzak': {
        ctx.fillRect(x + o.w / 2 - 3, taban - o.h, 6, o.h + 400);
        ctx.fillRect(x, taban - o.h - 40, o.w, 40);
        break;
      }
      case 'tepe': {
        ctx.beginPath(); ctx.ellipse(x + o.w / 2, taban + 20, o.w / 2, o.h, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(x, taban + 19, o.w, 400);
        break;
      }
      case 'dag': {
        ctx.beginPath(); ctx.moveTo(x, taban + 30); ctx.lineTo(x + o.w / 2, taban - o.h); ctx.lineTo(x + o.w, taban + 30); ctx.fill();
        ctx.fillRect(x, taban + 29, o.w, 400);
        ctx.fillStyle = '#eef3fa';
        ctx.beginPath(); ctx.moveTo(x + o.w / 2, taban - o.h); ctx.lineTo(x + o.w / 2 - o.w * 0.12, taban - o.h * 0.72);
        ctx.lineTo(x + o.w / 2, taban - o.h * 0.78); ctx.lineTo(x + o.w / 2 + o.w * 0.12, taban - o.h * 0.72); ctx.fill();
        ctx.fillStyle = renk;
        break;
      }
      case 'mesa': {
        ctx.beginPath(); ctx.moveTo(x, taban + 20); ctx.lineTo(x + o.w * 0.15, taban - o.h); ctx.lineTo(x + o.w * 0.85, taban - o.h); ctx.lineTo(x + o.w, taban + 20); ctx.fill();
        ctx.fillRect(x, taban + 19, o.w, 400);
        break;
      }
      case 'kayaOrta': {
        ctx.beginPath(); ctx.ellipse(x + o.w / 2, taban + 10, o.w / 2, o.h, 0, Math.PI, 0); ctx.fill();
        ctx.fillRect(x, taban + 9, o.w, 400);
        break;
      }
      case 'cam': {
        ctx.fillRect(x + o.w / 2 - 3, taban - 20, 6, 420);
        ctx.beginPath(); ctx.moveTo(x, taban - 12); ctx.lineTo(x + o.w / 2, taban - o.h); ctx.lineTo(x + o.w, taban - 12); ctx.fill();
        break;
      }
      case 'ev': {
        ctx.fillRect(x, taban - 50, 60, 450);
        ctx.beginPath(); ctx.moveTo(x - 8, taban - 50); ctx.lineTo(x + 30, taban - 80); ctx.lineTo(x + 68, taban - 50); ctx.fill();
        break;
      }
    }
  }
  // katmanın altını doldur
  ctx.fillStyle = renk;
  ctx.fillRect(0, taban, VW, VH - taban + 400);
}

// Zemin ve yol
function zeminCiz(ctx, kamX, kamY, VW, VH, renk, sev) {
  const x0 = Math.floor(kamX / 8) * 8 - 16;
  const x1 = kamX + VW + 24;
  const sonX = sev.tema === 'liman' ? Math.min(x1, sev.L + 260) : x1; // limanda iskeleden sonrası deniz

  // toprak
  ctx.fillStyle = renk.zemin;
  ctx.beginPath();
  ctx.moveTo(x0, kamY + VH + 50);
  for (let x = x0; x <= sonX; x += 8) ctx.lineTo(x, yukseklik(x));
  ctx.lineTo(sonX, kamY + VH + 50);
  ctx.closePath(); ctx.fill();

  // toprak içindeki taşlar
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = Math.floor(x0 / 70) * 70; x < sonX; x += 70) {
    const r = Math.abs(Math.sin(x * 12.9898) * 43758.5453) % 1;
    ctx.beginPath(); ctx.ellipse(x + r * 40, yukseklik(x) + 40 + r * 60, 6 + r * 6, 4 + r * 3, 0, 0, 7); ctx.fill();
  }

  // yol bandı
  ctx.lineJoin = 'round';
  ctx.strokeStyle = renk.yol; ctx.lineWidth = 22;
  ctx.beginPath();
  for (let x = x0; x <= sonX; x += 8) { const y = yukseklik(x) + 10; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();

  // yol üst kenarı (asfaltta koyu kenar, ormanda çimen)
  ctx.strokeStyle = renk.kenar; ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = x0; x <= sonX; x += 8) { const y = yukseklik(x) + 1.5; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();

  // orta şerit çizgisi
  if (renk.cizgi) {
    ctx.strokeStyle = renk.cizgi; ctx.lineWidth = 3;
    ctx.setLineDash([28, 34]); ctx.lineDashOffset = -(x0 % 62);
    ctx.beginPath();
    for (let x = x0; x <= sonX; x += 8) { const y = yukseklik(x) + 11; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// Yol kenarı süsleri
function yakinSuslerCiz(ctx, ap, x0, x1, gece) {
  for (const o of ap.yakin) {
    if (o.x < x0 - 120 || o.x > x1 + 120) continue;
    const y = yukseklik(o.x) + 2;
    ctx.save(); ctx.translate(o.x, y);
    switch (o.tip) {
      case 'lamba':
        ctx.fillStyle = '#4a4f57';
        ctx.fillRect(-3, -150, 6, 150);
        ctx.fillRect(-3, -150, 34, 5);
        ctx.fillStyle = gece ? '#fff3a0' : '#cfd6dd';
        ctx.fillRect(22, -146, 14, 6);
        if (gece) {
          const g = ctx.createRadialGradient(29, -140, 2, 29, -100, 120);
          g.addColorStop(0, 'rgba(255,240,170,0.4)'); g.addColorStop(1, 'rgba(255,240,170,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(29, -142); ctx.lineTo(-40, 0); ctx.lineTo(100, 0); ctx.fill();
        }
        break;
      case 'hurdaAraba':
        ctx.rotate(o.seed > 0.5 ? 0.06 : -0.05);
        ctx.fillStyle = o.renk;
        ctx.beginPath(); yuvarlakDikdortgen(ctx, -40, -30, 80, 22, 5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-24, -30); ctx.lineTo(-14, -46); ctx.lineTo(16, -46); ctx.lineTo(26, -30); ctx.fill();
        ctx.fillStyle = 'rgba(30,40,50,0.7)';
        ctx.fillRect(-12, -43, 12, 12); ctx.fillRect(3, -43, 12, 12);
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(-24, -8, 9, 0, 7); ctx.arc(24, -8, 9, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(80,40,20,0.4)';
        ctx.beginPath(); ctx.arc(10, -24, 7, 0, 7); ctx.fill();
        break;
      case 'koni':
        ctx.fillStyle = '#ff7a1a';
        ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(0, -28); ctx.lineTo(9, 0); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(-5, -16, 10, 4);
        break;
      case 'varil':
        ctx.fillStyle = o.seed > 0.5 ? '#2f7d4a' : '#b0372a';
        ctx.beginPath(); yuvarlakDikdortgen(ctx, -12, -34, 24, 34, 3); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-12, -24, 24, 3); ctx.fillRect(-12, -12, 24, 3);
        break;
      case 'tabela':
        ctx.fillStyle = '#5b4a3a'; ctx.fillRect(-3, -70, 6, 70);
        ctx.fillStyle = '#1f6f3f';
        ctx.beginPath(); yuvarlakDikdortgen(ctx, -50, -98, 100, 34, 4); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); yuvarlakDikdortgen(ctx, -47, -95, 94, 28, 3); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '13px "Lilita One", "Arial Black", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('SON VAPUR →', 0, -81);
        break;
      case 'agac':
        ctx.fillStyle = '#6b4a2b'; ctx.fillRect(-5, -60, 10, 60);
        ctx.fillStyle = gece ? '#1f3a26' : '#3f8f45';
        ctx.beginPath(); ctx.arc(0, -78, 28, 0, 7); ctx.arc(-18, -62, 20, 0, 7); ctx.arc(18, -62, 20, 0, 7); ctx.fill();
        break;
      case 'cam':
        ctx.fillStyle = '#5a3d26'; ctx.fillRect(-4, -30, 8, 30);
        ctx.fillStyle = '#2f6b3a';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(-26 + i * 5, -22 - i * 26); ctx.lineTo(0, -62 - i * 26); ctx.lineTo(26 - i * 5, -22 - i * 26); ctx.fill();
        }
        break;
      case 'kaya':
        ctx.fillStyle = '#8a8580';
        ctx.beginPath(); ctx.ellipse(0, 0, 22 + o.seed * 14, 14 + o.seed * 8, 0, Math.PI, 0); ctx.fill();
        break;
      case 'cit':
        ctx.fillStyle = '#c9a26b';
        for (let i = -2; i <= 2; i++) ctx.fillRect(i * 18 - 3, -34, 6, 34);
        ctx.fillRect(-42, -28, 84, 5); ctx.fillRect(-42, -14, 84, 5);
        break;
      case 'saman':
        ctx.fillStyle = '#e2bf54';
        ctx.beginPath(); ctx.arc(0, -20, 20, 0, 7); ctx.fill();
        ctx.strokeStyle = '#c9a23a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -20, 12, 0, 5); ctx.stroke();
        break;
      case 'kaktus':
        ctx.fillStyle = '#4f8f3a';
        ctx.beginPath(); yuvarlakDikdortgen(ctx, -7, -70, 14, 70, 7); ctx.fill();
        ctx.beginPath(); yuvarlakDikdortgen(ctx, -24, -50, 10, 26, 5); ctx.fill();
        ctx.fillRect(-20, -30, 16, 7);
        ctx.beginPath(); yuvarlakDikdortgen(ctx, 14, -58, 10, 24, 5); ctx.fill();
        ctx.fillRect(4, -40, 16, 7);
        break;
      case 'bariyer':
        ctx.fillStyle = '#b8bec5';
        ctx.fillRect(-60, -30, 120, 10);
        ctx.fillRect(-50, -30, 5, 30); ctx.fillRect(45, -30, 5, 30);
        break;
      case 'konteynerYakin':
        ctx.fillStyle = o.renk;
        ctx.fillRect(-60, -56, 120, 56);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        for (let i = -54; i < 60; i += 12) ctx.fillRect(i, -52, 4, 48);
        break;
    }
    ctx.restore();
  }
}

// Rampa uyarı okları
function rampaIsaretleriCiz(ctx, x0, x1) {
  for (const r of Seviye.rampalar) {
    const x = r.x - 120;
    if (x < x0 - 60 || x > x1 + 60) continue;
    const y = yukseklik(x);
    ctx.fillStyle = '#5b4a3a'; ctx.fillRect(x - 2, y - 46, 4, 46);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.moveTo(x - 18, y - 46); ctx.lineTo(x, y - 66); ctx.lineTo(x + 18, y - 46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1d1d22'; ctx.font = '16px "Lilita One", "Arial Black", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', x, y - 52);
  }
}

// Bitiş: güvenli bölge kapısı (1-9. gün)
function bitisKapisiCiz(ctx, L, zaman) {
  const y = yukseklik(L);
  ctx.save(); ctx.translate(L, y);
  // direkler
  ctx.fillStyle = '#4a4f57';
  ctx.fillRect(-110, -170, 10, 170); ctx.fillRect(100, -170, 10, 170);
  // pankart
  ctx.fillStyle = '#2e7d32';
  ctx.beginPath(); yuvarlakDikdortgen(ctx, -115, -205, 230, 42, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '22px "Lilita One", "Arial Black", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('GÜVENLİ BÖLGE', 0, -183);
  // dalgalanan bayrak (dama)
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
    ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff';
    const dalga = Math.sin(zaman * 5 + i * 0.7) * 3;
    ctx.fillRect(110 + i * 8, -170 + j * 8 + dalga, 8, 8);
  }
  // kum torbaları
  ctx.fillStyle = '#c2a878';
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(-160 - (i % 3) * 26, -10 - Math.floor(i / 3) * 16, 16, 9, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}

// Liman: iskele, deniz ve SON VAPUR. vapurX: vapurun kayma miktarı (final)
function limanCiz(ctx, L, kamY, VH, zaman, vapurX) {
  const iskeleBas = L + 260;
  const denizY = 46;
  // deniz
  const g = ctx.createLinearGradient(0, denizY, 0, denizY + 400);
  g.addColorStop(0, '#2b7bb9'); g.addColorStop(1, '#174a75');
  ctx.fillStyle = g;
  ctx.fillRect(iskeleBas - 20, denizY, 6000, kamY + VH - denizY + 100);
  // dalgalar
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = iskeleBas; x < iskeleBas + 5000; x += 60) {
    const yy = denizY + 8 + Math.sin(zaman * 2 + x * 0.05) * 3;
    ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + 15, yy - 5, x + 30, yy);
  }
  ctx.stroke();

  // iskele (ahşap) - kamyon iskele üzerinden vapura biner
  ctx.fillStyle = '#7a5434';
  ctx.fillRect(iskeleBas - 20, 0, 200, 14);
  ctx.fillStyle = '#5e3f25';
  for (let x = iskeleBas; x < iskeleBas + 180; x += 40) ctx.fillRect(x, 14, 10, denizY + 40);

  // VAPUR
  ctx.save();
  const sallanma = Math.sin(zaman * 1.6) * 2;
  ctx.translate(vapurX, sallanma);
  const vb = L + 440, vs = L + 1500; // vapur başı ve sonu
  // gövde
  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath(); ctx.moveTo(vb - 30, 0); ctx.lineTo(vs + 60, -10); ctx.lineTo(vs, 100); ctx.lineTo(vb + 30, 100); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1f3c6e';
  ctx.beginPath(); ctx.moveTo(vb + 4, 50); ctx.lineTo(vs + 28, 50); ctx.lineTo(vs, 100); ctx.lineTo(vb + 30, 100); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d32f2f'; ctx.fillRect(vb - 10, 34, vs - vb + 60, 9);
  ctx.fillStyle = '#1f3c6e'; ctx.font = '34px "Lilita One", "Arial Black", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SON VAPUR', (vb + vs) / 2 + 60, 18);
  // yuvarlak lombozlar
  ctx.fillStyle = '#8fc6ee';
  for (let x = vb + 40; x < vs; x += 46) { ctx.beginPath(); ctx.arc(x, 62, 6, 0, 7); ctx.fill(); }
  // güverte korkuluğu
  ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(vb, -26); ctx.lineTo(vb + 520, -26);
  for (let x = vb; x <= vb + 520; x += 26) { ctx.moveTo(x, 0); ctx.lineTo(x, -26); }
  ctx.stroke();
  // üst yapı (kaptan köşkü)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(vb + 560, -150, vs - vb - 560, 150);
  ctx.fillRect(vb + 620, -210, vs - vb - 700, 62);
  ctx.fillStyle = '#5fa8de';
  for (let x = vb + 580; x < vs - 30; x += 44) ctx.fillRect(x, -130, 28, 22);
  for (let x = vb + 640; x < vs - 100; x += 40) ctx.fillRect(x, -195, 26, 20);
  // baca
  ctx.fillStyle = '#d32f2f'; ctx.fillRect(vs - 230, -300, 70, 95);
  ctx.fillStyle = '#222'; ctx.fillRect(vs - 230, -300, 70, 18);
  // duman
  ctx.fillStyle = 'rgba(90,90,90,0.35)';
  for (let i = 0; i < 5; i++) {
    const t = (zaman * 0.5 + i * 0.2) % 1;
    ctx.beginPath(); ctx.arc(vs - 195 - t * 120, -310 - t * 160, 14 + t * 30, 0, 7); ctx.fill();
  }
  // bayrak
  ctx.fillStyle = '#555'; ctx.fillRect(vb + 30, -110, 3, 110);
  ctx.fillStyle = '#e53935';
  ctx.beginPath(); ctx.moveTo(vb + 33, -110); ctx.lineTo(vb + 70 + Math.sin(zaman * 6) * 4, -100); ctx.lineTo(vb + 33, -88); ctx.fill();
  ctx.restore();

  // rampa (iskeleden vapura)
  if (vapurX < 5) {
    ctx.fillStyle = '#8a8f96';
    ctx.fillRect(iskeleBas + 160, -2, vb - iskeleBas - 150, 8);
  }
}
