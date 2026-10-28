'use strict';
// =====================================================================
//  ANA OYUN: döngü, durumlar (menü, oyun, bitiş...), kamera, HUD, ekranlar
// =====================================================================

const tuval = document.getElementById('oyun');
const ctx = tuval.getContext('2d');
let W = 0, H = 0, DPR = 1, olcek = 1, VW = 0, VH = 0;

// Yükseltmeler (garaj)
const YUKSELTMELER = [
  { anahtar: 'motor',  ad: 'Motor',          aciklama: 'Kamyon daha hızlı gider, yokuşları kolay çıkar.', fiyat: [60, 140, 260, 420, 650] },
  { anahtar: 'zirh',   ad: 'Zırh',           aciklama: 'Kamyon daha dayanıklı olur, zombileri daha kolay ezer.', fiyat: [50, 120, 230, 380, 600] },
  { anahtar: 'tampon', ad: 'Dikenli Kepçe',  aciklama: 'Kutular ve zombiler kamyonu daha az yavaşlatır.', fiyat: [70, 150, 280, 450, 700] },
];
const MAX_SEVIYE = 5;

// Oyunun anlık durumu
const O = {
  durum: 'menu',       // menu | giris | oyun | duraklat | bitis | elendi | sonuc | final
  durumSure: 0,        // bu durumda geçen süre
  bolum: 0,
  araba: null,
  ap: null,            // arka plan
  kam: { x: 0, y: 0 },
  zaman: 0,
  kalan: 0, sure: 0,   // bölüm süresi (her elenişte yenilenir)
  ezilen: 0, kazanilan: 0,
  kombo: 0, komboSure: 0,
  sarsinti: 0,
  vapurX: 0, vapurHiz: 0, finalAsama: 0, fisekSure: 0,
  dumanSure: 0,
  oncekiDurum: null,
};

const $ = (id) => document.getElementById(id);
const dokunmatikMi = () => window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ---------------------------------------------------------------------
//  Ekran boyutu
// ---------------------------------------------------------------------
function boyutla() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  tuval.width = Math.round(W * DPR); tuval.height = Math.round(H * DPR);
  tuval.style.width = W + 'px'; tuval.style.height = H + 'px';
  // Ekranda yaklaşık 600 birim yükseklik görünsün; dar ekranda biraz uzaklaş
  olcek = Math.min(H / 600, W / 760);
  VW = W / olcek; VH = H / olcek;
}

// ---------------------------------------------------------------------
//  Ekran (menü) yönetimi
// ---------------------------------------------------------------------
function ekranGoster(id) {
  document.querySelectorAll('.ekran').forEach(e => e.classList.toggle('gizli', e.id !== id));
  const oyunda = id === null;
  document.body.classList.toggle('oynaniyor', oyunda);
}

function durumDegis(d) { O.durum = d; O.durumSure = 0; }

// Menü arka planında hareketsiz bir sahne göster
function menuSahnesi() {
  Seviye = seviyeOlustur(0);
  O.ap = arkaPlanHazirla(Seviye);
  O.araba = new Araba(260, Kayit.veri.yukseltme);
  Parcaciklar.temizle(); Yazilar.liste.length = 0;
  kamerayiGuncelle(0, true);
  durumDegis('menu');
}

function anaMenu() { menuSahnesi(); ekranGoster('ekranMenu'); kapakCiz($('kapakTuval'), true); }

// ---------------------------------------------------------------------
//  Bölüm başlat / bitir / elen
// ---------------------------------------------------------------------
function bolumBaslat(i) {
  Ses.baslat();
  O.bolum = i;
  Seviye = seviyeOlustur(i);
  O.ap = arkaPlanHazirla(Seviye);
  O.araba = new Araba(160, Kayit.veri.yukseltme);
  O.sure = Seviye.sure; O.kalan = Seviye.sure;   // süre her başlangıçta YENİLENİR
  O.ezilen = 0; O.kazanilan = 0; O.kombo = 0; O.komboSure = 0; O.sarsinti = 0;
  O.vapurX = 0; O.vapurHiz = 0; O.finalAsama = 0;
  Parcaciklar.temizle(); Yazilar.liste.length = 0;
  girdiSifirla();
  kamerayiGuncelle(0, true);
  ekranGoster(null);
  gunKartiGoster(i);
  durumDegis('giris');
}

function gunKartiGoster(i) {
  const kalanGun = 10 - i;
  $('kartGun').textContent = (i + 1) + '. GÜN';
  $('kartAd').textContent = BOLUMLER[i].ad;
  $('kartAlt').textContent = i === 9 ? 'Bugün son gün! Vapur limanda seni bekliyor!' :
    `Son vapurun kalkmasına ${kalanGun} gün var. Hava kararmadan güvenli bölgeye ulaş!`;
  const k = $('gunKarti');
  k.classList.remove('gizli'); k.classList.remove('cik');
  void k.offsetWidth; // animasyonu yeniden başlat
  k.classList.add('gir');
  clearTimeout(gunKartiGoster.zm);
  gunKartiGoster.zm = setTimeout(() => { k.classList.add('cik'); setTimeout(() => k.classList.add('gizli'), 400); }, 2000);
}

function bolumTamam() {
  const s = Seviye;
  const bonus = 40 + O.bolum * 15 + Math.floor(O.kalan) * 2;
  O.kazanilan += bonus;
  Kayit.veri.altin += O.kazanilan;
  Kayit.veri.toplamZombi += O.ezilen;
  Kayit.veri.tamam[O.bolum] = true;
  Kayit.veri.acik = Math.max(Kayit.veri.acik, Math.min(10, O.bolum + 2));
  Kayit.kaydet();
  Ses.kazandi();
  sonucGoster({
    baslik: `${O.bolum + 1}. GÜN TAMAM!`,
    mesaj: O.bolum < 9 ? `Güvenli bölgeye ulaştın. Son vapura ${9 - O.bolum} gün kaldı!` : '',
    satirlar: [['Ezilen zombi', O.ezilen], ['Kalan süre', Math.ceil(O.kalan) + ' sn'], ['Süre bonusu', '+' + bonus], ['Kazanılan altın', '+' + O.kazanilan]],
    butonlar: [
      { yazi: 'SONRAKİ GÜN ▶', sinif: 'ana', fn: () => bolumBaslat(Math.min(9, O.bolum + 1)) },
      { yazi: 'GARAJ', fn: () => garajAc('sonuc') },
      { yazi: 'HARİTA', fn: haritaAc },
    ],
    tur: 'kazandi',
  });
}

// Elenme: sebep = 'devrildi' | 'zaman' | 'hasar'
function elen(sebep) {
  if (O.durum !== 'oyun') return;
  durumDegis('elendi');
  O.sebep = sebep;
  O.araba.ifadeYap('korku', 3);
  Ses.kaybetti();
  if (sebep === 'devrildi') { Ses.carpma(1); O.sarsinti = 10; }
}

function elendiEkrani() {
  Kayit.veri.altin += O.kazanilan;
  Kayit.veri.toplamZombi += O.ezilen;
  Kayit.kaydet();
  const mesajlar = {
    devrildi: 'Kamyon ters döndü! Arka teker / ön teker tuşlarıyla dengede kalmaya çalış.',
    zaman: 'Hava karardı! Gece zombiler çok tehlikeli, güvenli bölgeye zamanında yetişemedin.',
    hasar: 'Zombiler kamyonu parçaladı! Hızlı git ki zombileri ezebilesin.',
  };
  sonucGoster({
    baslik: 'ELENDİN!',
    mesaj: mesajlar[O.sebep] + ' Süre yenilendi, tekrar dene!',
    satirlar: [['Ezilen zombi', O.ezilen], ['Gidilen yol', Math.round(sinirla(O.araba.x / Seviye.L, 0, 1) * 100) + '%'], ['Kazanılan altın', '+' + O.kazanilan]],
    butonlar: [
      { yazi: 'TEKRAR DENE ↻', sinif: 'ana', fn: () => bolumBaslat(O.bolum) },
      { yazi: 'GARAJ', fn: () => garajAc('sonuc') },
      { yazi: 'HARİTA', fn: haritaAc },
    ],
    tur: 'kaybetti',
  });
}

function finalEkrani() {
  Kayit.veri.altin += O.kazanilan + 500;
  Kayit.veri.toplamZombi += O.ezilen;
  Kayit.veri.tamam[9] = true;
  Kayit.kaydet();
  Ses.kazandi();
  sonucGoster({
    baslik: 'TEBRİKLER TUĞRA!',
    mesaj: 'Son vapura yetiştin! 10 gün boyunca zombilerin arasından geçtin ve kamyonunla vapura bindin. Artık güvendesin!',
    satirlar: [['Son günde ezilen zombi', O.ezilen], ['Toplam ezilen zombi', Kayit.veri.toplamZombi], ['Final ödülü', '+500 altın']],
    butonlar: [
      { yazi: 'ANA MENÜ', sinif: 'ana', fn: anaMenu },
      { yazi: 'HARİTA', fn: haritaAc },
    ],
    tur: 'final',
  });
}

function sonucGoster(s) {
  durumDegis('sonuc');
  $('sonucBaslik').textContent = s.baslik;
  $('sonucBaslik').className = 'baslik ' + s.tur;
  $('sonucMesaj').textContent = s.mesaj;
  $('sonucMesaj').style.display = s.mesaj ? '' : 'none';
  const tablo = $('sonucSatirlar'); tablo.innerHTML = '';
  for (const [a, b] of s.satirlar) {
    const d = document.createElement('div'); d.className = 'satir';
    d.innerHTML = `<span></span><b></b>`;
    d.children[0].textContent = a; d.children[1].textContent = b;
    tablo.appendChild(d);
  }
  const kutu = $('sonucButonlar'); kutu.innerHTML = '';
  for (const b of s.butonlar) {
    const el = document.createElement('button');
    el.className = 'btn ' + (b.sinif || '');
    el.textContent = b.yazi;
    el.onclick = () => { Ses.tik(); b.fn(); };
    kutu.appendChild(el);
  }
  ekranGoster('ekranSonuc');
}

// ---------------------------------------------------------------------
//  Harita (gün seçimi) ve Garaj
// ---------------------------------------------------------------------
function haritaAc() {
  if (O.durum !== 'menu') menuSahnesi();
  const kutu = $('gunler'); kutu.innerHTML = '';
  BOLUMLER.forEach((b, i) => {
    const acik = i < Kayit.veri.acik;
    const el = document.createElement('button');
    el.className = 'gun' + (acik ? '' : ' kilitli') + (Kayit.veri.tamam[i] ? ' tamam' : '') + (i === 9 ? ' son' : '');
    el.innerHTML = `<span class="no">${i + 1}</span><span class="ad"></span><span class="durum">${Kayit.veri.tamam[i] ? '✓' : acik ? '▶' : '🔒'}</span>`;
    el.querySelector('.ad').textContent = b.ad;
    if (acik) el.onclick = () => { Ses.tik(); bolumBaslat(i); };
    kutu.appendChild(el);
  });
  $('haritaAltin').textContent = Kayit.veri.altin;
  ekranGoster('ekranHarita');
}

let garajDonus = 'harita';
function garajAc(nereden) {
  garajDonus = nereden || 'harita';
  ekranGoster('ekranGaraj');
  garajCiz(); // önce ekran görünsün ki tuval boyutu doğru ölçülsün
}

function garajCiz() {
  $('garajAltin').textContent = Kayit.veri.altin;
  const kutu = $('yukseltmeler'); kutu.innerHTML = '';
  for (const y of YUKSELTMELER) {
    const sev = Kayit.veri.yukseltme[y.anahtar];
    const fiyat = sev < MAX_SEVIYE ? y.fiyat[sev] : null;
    const el = document.createElement('div');
    el.className = 'yukseltme';
    el.innerHTML = `<h3></h3><p></p><div class="noktalar">${Array.from({ length: MAX_SEVIYE }, (_, i) => `<i class="${i < sev ? 'dolu' : ''}"></i>`).join('')}</div>`;
    el.querySelector('h3').textContent = y.ad;
    el.querySelector('p').textContent = y.aciklama;
    const btn = document.createElement('button');
    btn.className = 'btn kucuk';
    if (fiyat === null) { btn.textContent = 'EN ÜST SEVİYE'; btn.disabled = true; }
    else {
      btn.innerHTML = `YÜKSELT <span class="altin-ikon"></span> ${fiyat}`;
      btn.disabled = Kayit.veri.altin < fiyat;
      btn.onclick = () => {
        if (Kayit.veri.altin < fiyat) return;
        Kayit.veri.altin -= fiyat;
        Kayit.veri.yukseltme[y.anahtar]++;
        Kayit.kaydet();
        Ses.para();
        if (O.durum === 'menu') O.araba = new Araba(260, Kayit.veri.yukseltme); // menüdeki kamyon da güncellensin
        garajCiz();
      };
    }
    el.appendChild(btn);
    kutu.appendChild(el);
  }
  // garaj önizlemesi
  kapakCiz($('garajTuval'), false);
}

function garajKapat() {
  if (garajDonus === 'menu') anaMenu();
  else if (garajDonus === 'sonuc') { ekranGoster('ekranSonuc'); }
  else haritaAc();
}

// ---------------------------------------------------------------------
//  Duraklatma
// ---------------------------------------------------------------------
function duraklat() {
  if (O.durum === 'oyun' || O.durum === 'giris') {
    O.oncekiDurum = O.durum;
    O.durum = 'duraklat';
    girdiSifirla();
    ekranGoster('ekranDuraklat');
  } else if (O.durum === 'duraklat') devamEt();
}
function devamEt() {
  if (O.durum !== 'duraklat') return;
  O.durum = O.oncekiDurum || 'oyun';
  ekranGoster(null);
}

// ---------------------------------------------------------------------
//  Oyun olayları (zombi ezildi, kutu kırıldı...)
// ---------------------------------------------------------------------
function olay(tip, nesne) {
  const a = O.araba;
  if (O.durum !== 'oyun' && O.durum !== 'bitis' && O.durum !== 'final') return;
  if (tip === 'ez') {
    O.ezilen++;
    O.kombo = O.komboSure > 0 ? O.kombo + 1 : 1;
    O.komboSure = 1.4;
    const altin = nesne.t.altin + (O.kombo - 1) * 2;
    O.kazanilan += altin;
    Yazilar.ekle(nesne.x, nesne.y - 85, '+' + altin);
    if (O.kombo >= 3) Yazilar.ekle(a.x, a.y - 120, O.kombo + 'x KOMBO!', '#ff7043', 32);
    Ses.zombiEz();
    O.sarsinti = Math.max(O.sarsinti, 5);
    a.ifadeYap('cosku', 0.9);
  } else if (tip === 'saldiri') {
    Ses.carpma(0.5);
    O.sarsinti = Math.max(O.sarsinti, 4);
    a.ifadeYap('korku', 0.7);
    Yazilar.ekle(a.x, a.y - 80, '-' + nesne.t.hasar, '#ff5252', 20);
  } else if (tip === 'kutu') {
    Ses.kutuKir();
    O.sarsinti = Math.max(O.sarsinti, 6);
    O.kazanilan += nesne.adet;
  }
}

// ---------------------------------------------------------------------
//  Güncelleme
// ---------------------------------------------------------------------
const BOS_GIRDI = { gaz: false, fren: false, arka: false, on: false };

function guncelle(dt) {
  O.zaman += dt;
  O.durumSure += dt;
  const d = O.durum;
  if (d === 'duraklat') { Ses.motor(0, false, false); return; }
  // "Telefonu yan çevir" uyarısı açıkken oyun (ve süre) beklesin
  const donUyarisi = document.body.classList.contains('dokunmatik') && !document.body.classList.contains('donKapali') &&
    window.matchMedia('(orientation: portrait)').matches && (d === 'oyun' || d === 'giris');
  if (donUyarisi) { Ses.motor(0, false, false); return; }

  const a = O.araba;
  const L = Seviye.L;

  // Bu durumda hangi girdiler kullanılacak?
  let g = BOS_GIRDI;
  if (d === 'oyun') g = Girdi;
  else if (d === 'bitis') g = { fren: true };
  else if (d === 'final' && O.finalAsama === 0) g = { gaz: a.x < L + 600, fren: a.x >= L + 600 };

  // Fizik (küçük alt adımlarla, kararlı olsun diye)
  const fizikVar = !(d === 'final' && O.finalAsama === 1);
  if (fizikVar) {
    const n = Math.ceil(dt / (1 / 240));
    const h = dt / n;
    let carpma = 0;
    for (let k = 0; k < n; k++) carpma = Math.max(carpma, a.adim(h, g));
    if (carpma > 300 && O.zaman - a.sonCarpma > 0.25) {
      a.sonCarpma = O.zaman;
      Ses.carpma(Math.min(1, carpma / 900));
      O.sarsinti = Math.max(O.sarsinti, Math.min(9, carpma / 90));
      for (let i = 0; i < 6; i++) Parcaciklar.toz(a.x + (Math.random() - 0.5) * 100, a.y + 30);
    }
  }

  // Zombiler ve kutular
  if (d !== 'menu') {
    zombileriGuncelle(dt, a, olay);
    kutulariGuncelle(a, olay);
  } else {
    for (const z of Seviye.zombiler) z.faz += dt * 1.5;
  }

  // Tekerlerden toz
  if ((d === 'oyun' || d === 'final') && Math.abs(a.vx) > 200) {
    for (const t of a.tekerler) if (t.yerde && Math.random() < 0.3) Parcaciklar.toz(t.x - 10, t.y + TEKER_R - 4);
  }
  // Hasarlı kamyon duman çıkarsın
  if (a.can / a.maxCan < 0.4 && d !== 'menu') {
    O.dumanSure -= dt;
    if (O.dumanSure <= 0) { O.dumanSure = 0.12; const p = a.dunyaya(50, -28); Parcaciklar.duman(p.x, p.y); }
  }

  Parcaciklar.guncelle(dt);
  Yazilar.guncelle(dt);
  if (O.komboSure > 0) O.komboSure -= dt;
  O.sarsinti = Math.max(0, O.sarsinti - dt * 20);

  // Durumlara özel işler
  if (d === 'giris' && O.durumSure > 1.6) durumDegis('oyun');

  if (d === 'oyun') {
    O.kalan -= dt;
    if (a.devrildi) elen('devrildi');
    else if (a.can <= 0) elen('hasar');
    else if (O.kalan <= 0) { O.kalan = 0; elen('zaman'); }
    else if (a.x >= L) {
      if (O.bolum === 9) { durumDegis('final'); O.finalAsama = 0; Ses.vapurDudugu(); }
      else { durumDegis('bitis'); a.ifadeYap('cosku', 2); }
    }
  }
  if (d === 'bitis' && O.durumSure > 1.6) bolumTamam();
  if (d === 'elendi' && O.durumSure > 1.4) elendiEkrani();

  if (d === 'final') {
    if (O.finalAsama === 0 && ((a.x >= L + 600 && Math.abs(a.vx) < 25) || O.durumSure > 9)) {
      O.finalAsama = 1; O.durumSure = 0;
      Ses.vapurDudugu();
      a.ifadeYap('cosku', 30);
    }
    if (O.finalAsama === 1) {
      O.vapurHiz = Math.min(170, O.vapurHiz + dt * 40);
      O.vapurX += O.vapurHiz * dt;
      O.fisekSure -= dt;
      if (O.fisekSure <= 0) {
        O.fisekSure = 0.35;
        Parcaciklar.havaiFisek(a.x + O.vapurX + (Math.random() - 0.3) * VW * 0.7, O.kam.y + 60 + Math.random() * 160);
        Ses.havaiFisek();
      }
      if (O.durumSure > 6.5) { finalEkrani(); O.finalAsama = 2; }
    }
  }
  if (d === 'sonuc' && O.finalAsama === 2) { // final ekranı açıkken vapur yoluna devam etsin
    O.vapurX += O.vapurHiz * dt;
  }

  // Motor sesi
  Ses.motor(a.vx, g.gaz, d === 'oyun' || d === 'giris' || d === 'bitis' || d === 'final');

  kamerayiGuncelle(dt, false);
}

function kamerayiGuncelle(dt, ani) {
  const a = O.araba;
  const vapur = (O.durum === 'final' && O.finalAsama >= 1) || O.finalAsama === 2 ? O.vapurX : 0;
  const ileri = sinirla(a.vx * 0.35, -150, 260);
  let hx = a.x + vapur - VW * 0.33 + ileri;
  // dokunmatik ekranda butonlar altta olduğu için kamyonu biraz yukarıda tut
  let hy = a.y - VH * (document.body.classList.contains('dokunmatik') ? 0.5 : 0.58);
  if (O.durum === 'menu') { hx = a.x - VW * 0.3; hy = a.y - VH * 0.6; }
  if (ani) { O.kam.x = hx; O.kam.y = hy; return; }
  O.kam.x += (hx - O.kam.x) * Math.min(1, dt * 4);
  O.kam.y += (hy - O.kam.y) * Math.min(1, dt * 3);
}

// ---------------------------------------------------------------------
//  Çizim
// ---------------------------------------------------------------------
function ciz() {
  const r = Seviye.renk;
  const ap = O.ap;
  ctx.setTransform(DPR * olcek, 0, 0, DPR * olcek, 0, 0);

  const sx = (Math.random() - 0.5) * O.sarsinti, sy = (Math.random() - 0.5) * O.sarsinti;
  const kx = O.kam.x + sx, ky = O.kam.y + sy;

  gokyuzuCiz(ctx, VW, VH, r, O.zaman);
  bulutlarCiz(ctx, ap, kx, VW, O.zaman, r.gece);
  katmanCiz(ctx, ap.uzak, kx, ky, VW, VH, r.uzak, r.gece, r.gece ? 'rgba(255,230,140,0.55)' : 'rgba(255,255,255,0.22)');
  katmanCiz(ctx, ap.orta, kx, ky, VW, VH, r.orta, r.gece, r.gece ? 'rgba(255,220,120,0.7)' : 'rgba(255,255,255,0.2)');

  ctx.save();
  ctx.translate(-kx, -ky);
  const x0 = kx, x1 = kx + VW;
  if (Seviye.tema === 'liman') limanCiz(ctx, Seviye.L, ky, VH, O.zaman, O.vapurX);
  zeminCiz(ctx, kx, ky, VW, VH, r, Seviye);
  yakinSuslerCiz(ctx, ap, x0, x1, r.gece);
  rampaIsaretleriCiz(ctx, x0, x1);
  if (Seviye.tema !== 'liman') bitisKapisiCiz(ctx, Seviye.L, O.zaman);
  kutulariCiz(ctx, x0, x1);
  for (const z of Seviye.zombiler) {
    if (z.x > x0 - 100 && z.x < x1 + 100) zombiCiz(ctx, z, O.zaman);
  }
  // kamyon (finalde vapurla birlikte kayar)
  const vapurModu = O.finalAsama >= 1;
  ctx.save();
  if (vapurModu) ctx.translate(O.vapurX, Math.sin(O.zaman * 1.6) * 2);
  O.araba.ciz(ctx, O.zaman, !!r.gece);
  ctx.restore();
  Parcaciklar.ciz(ctx);
  Yazilar.ciz(ctx);
  ctx.restore();

  // gece: kenarları karart
  if (r.gece) {
    const g = ctx.createRadialGradient(VW * 0.45, VH * 0.55, VH * 0.25, VW * 0.45, VH * 0.55, VW * 0.8);
    g.addColorStop(0, 'rgba(0,0,20,0)'); g.addColorStop(1, 'rgba(0,0,20,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }

  // HUD (ekran pikseli koordinatlarında)
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (['giris', 'oyun', 'bitis', 'elendi', 'duraklat'].includes(O.durum)) hudCiz();
}

function yaziCiz(metin, x, y, boy, renk, hiza, kalin) {
  ctx.font = `${boy}px "Lilita One", "Arial Black", sans-serif`;
  ctx.textAlign = hiza || 'left'; ctx.textBaseline = 'middle';
  ctx.lineWidth = kalin || 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineJoin = 'round';
  ctx.strokeText(metin, x, y);
  ctx.fillStyle = renk || '#fff'; ctx.fillText(metin, x, y);
}

function barCiz(x, y, w, h, oran, renk) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); yuvarlakDikdortgen(ctx, x, y, w, h, h / 2); ctx.fill();
  if (oran > 0) {
    ctx.fillStyle = renk;
    ctx.beginPath(); yuvarlakDikdortgen(ctx, x + 2, y + 2, Math.max(h - 4, (w - 4) * oran), h - 4, (h - 4) / 2); ctx.fill();
  }
}

function hudCiz() {
  const a = O.araba, s = Seviye;
  const p = 12;
  const dar = W < 620;

  // --- Sol üst: gün + kamyon sağlığı
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); yuvarlakDikdortgen(ctx, p, p, 170, 74, 12); ctx.fill();
  yaziCiz(`${O.bolum + 1}. GÜN`, p + 12, p + 18, 22, '#ffd23f');
  ctx.font = '13px Nunito, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
  ctx.fillText(s.ad, p + 12, p + 38);
  const canOran = a.can / a.maxCan;
  barCiz(p + 12, p + 50, 146, 14, canOran, canOran > 0.5 ? '#43a047' : canOran > 0.25 ? '#fbc02d' : '#e53935');
  ctx.font = 'bold 10px Nunito, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.fillText('KAMYON', p + 85, p + 57.5);

  // --- İlerleme çubuğu (orta üst; dar ekranda sol panelin altında)
  const bw = dar ? W - 2 * p - 0 : Math.min(W * 0.36, 360);
  const bx = dar ? p : (W - bw) / 2;
  const by = dar ? p + 84 : p + 6;
  const ilerleme = sinirla(a.x / s.L, 0, 1);
  barCiz(bx, by, bw, 16, ilerleme, '#29b6f6');
  // kamyon işareti
  const mx = bx + 8 + (bw - 16) * ilerleme;
  ctx.fillStyle = '#e5262b'; ctx.beginPath(); yuvarlakDikdortgen(ctx, mx - 9, by - 4, 18, 13, 3); ctx.fill();
  ctx.fillStyle = '#f7b500'; ctx.fillRect(mx - 9, by - 4, 8, 7);
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(mx - 5, by + 11, 3.5, 0, 7); ctx.arc(mx + 5, by + 11, 3.5, 0, 7); ctx.fill();
  // bitiş işareti
  yaziCiz(O.bolum === 9 ? '⚓' : '⚑', bx + bw + 4, by + 8, 18, '#fff', 'left', 3);
  const kalanM = Math.max(0, s.L - a.x) / 100; // 100px = 1 "hm"
  ctx.font = 'bold 12px Nunito, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3;
  ctx.fillText(`${O.bolum === 9 ? 'Vapura' : 'Güvenli bölgeye'} ${(kalanM / 10).toFixed(1)} km`, bx + bw / 2, by + 30);
  ctx.shadowBlur = 0;

  // --- Saat ve kalan süre
  const oran = sinirla(O.kalan / O.sure, 0, 1);
  const dakika = Math.floor((7 + (1 - oran) * 13) * 60);
  const saat = String(Math.floor(dakika / 60)).padStart(2, '0') + ':' + String(dakika % 60).padStart(2, '0');
  const sy = by + 40;
  const sw = Math.min(bw, 220);
  const sx = bx + (bw - sw) / 2;
  const tehlike = oran < 0.25;
  barCiz(sx, sy, sw, 12, oran, oran > 0.5 ? '#ffca28' : oran > 0.25 ? '#ff9800' : '#e53935');
  const yanip = tehlike && Math.sin(O.zaman * 10) > 0;
  yaziCiz(`🕒 ${saat}  ·  ${Math.ceil(O.kalan)} sn`, sx + sw / 2, sy + 26, 16, yanip ? '#ff5252' : '#fff', 'center', 3);
  if (tehlike && O.durum === 'oyun') yaziCiz('Hava kararıyor, acele et!', W / 2, sy + 50, 18, '#ff8a80', 'center', 4);

  // --- Sağ üst: altın
  const ax = W - p - 104;
  altinIkon(ax - 72, p + 22, 11);
  yaziCiz(String(Kayit.veri.altin + O.kazanilan), ax - 56, p + 23, 22, '#ffd54a', 'left');

  // --- Kombo
  if (O.kombo >= 2 && O.komboSure > 0) {
    const b = 1 + Math.max(0, O.komboSure - 1.1) * 2;
    yaziCiz(`${O.kombo}x KOMBO`, W / 2, H * 0.32, 30 * b, '#ff7043', 'center', 6);
  }

  // --- Bilgisayarda ilk saniyelerde tuş ipucu
  if (!document.body.classList.contains('dokunmatik') && O.durum === 'oyun' && O.bolum === 0 && O.sure - O.kalan < 8) {
    yaziCiz('→ GAZ   ← FREN   ↑ / B arka teker   ↓ / N ön teker', W / 2, H - 30, 18, '#fff', 'center', 4);
  }
}

function altinIkon(x, y, r) {
  ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd54a'; ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffb300'; ctx.font = `bold ${r}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('₺', x, y + 1);
}

// Menü ve garajdaki büyük kamyon resmi
function kapakCiz(cv, zombiVar) {
  if (!cv) return;
  const c = cv.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 300, h = cv.clientHeight || 160;
  cv.width = w * dpr; cv.height = h * dpr;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const s = Math.min(w / 220, h / 120);
  c.save();
  c.translate(w / 2 - (zombiVar ? 20 : 0) * s, h * 0.62);
  c.scale(s, s);
  // gölge
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(0, 44, 80, 7, 0, 0, 7); c.fill();
  tekerCiz(c, -37, 26, 0.3, TEKER_R);
  tekerCiz(c, 37, 26, 1.1, TEKER_R);
  kasaCiz(c, Kayit.veri.yukseltme, 0, 0, 'cosku');
  if (zombiVar) {
    const z = zombiYap(0, 'normal', mulberry32(3));
    z.x = 118; z.y = 40; z.durum = 'ucuyor'; z.rot = 0.6; z.yon = -1;
    zombiCiz(c, z, 0.2);
  }
  c.restore();
}

// ---------------------------------------------------------------------
//  Ana döngü
// ---------------------------------------------------------------------
let sonZaman = performance.now();
function dongu(t) {
  const dt = Math.min(0.05, (t - sonZaman) / 1000);
  sonZaman = t;
  try {
    guncelle(dt);
    ciz();
  } catch (e) { console.error(e); }
  requestAnimationFrame(dongu);
}

// ---------------------------------------------------------------------
//  Başlangıç
// ---------------------------------------------------------------------
function baslat() {
  Kayit.yukle();
  Ses.acik = Kayit.veri.ses !== false;
  $('btnSes').textContent = Ses.acik ? '🔊' : '🔇';
  if (dokunmatikMi()) document.body.classList.add('dokunmatik');
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') document.body.classList.add('dokunmatik'); });

  boyutla();
  window.addEventListener('resize', () => { boyutla(); kapakCiz($('kapakTuval'), true); });
  kontrolleriKur(duraklat);

  // Butonlar
  const tikla = (id, fn) => $(id).addEventListener('click', () => { Ses.baslat(); Ses.tik(); fn(); });
  tikla('btnOyna', haritaAc);
  tikla('btnGarajMenu', () => garajAc('menu'));
  tikla('btnNasil', () => ekranGoster('ekranNasil'));
  tikla('btnNasilGeri', anaMenu);
  tikla('btnHaritaGeri', anaMenu);
  tikla('btnHaritaGaraj', () => garajAc('harita'));
  tikla('btnGarajGeri', garajKapat);
  tikla('btnDevam', devamEt);
  tikla('btnYeniden', () => bolumBaslat(O.bolum));
  tikla('btnDurHarita', haritaAc);
  tikla('btnDonKapat', () => document.body.classList.add('donKapali'));
  $('btnDuraklat').addEventListener('click', () => { Ses.baslat(); duraklat(); });
  $('btnSes').addEventListener('click', () => { Ses.baslat(); $('btnSes').textContent = Ses.acKapa() ? '🔊' : '🔇'; });

  // İlerlemeyi sıfırla (iki kez basınca)
  let sifirlaOnay = false;
  $('btnSifirla').addEventListener('click', () => {
    if (!sifirlaOnay) { sifirlaOnay = true; $('btnSifirla').textContent = 'Emin misin? Tekrar bas'; setTimeout(() => { sifirlaOnay = false; $('btnSifirla').textContent = 'İlerlemeyi sıfırla'; }, 3000); return; }
    Kayit.sifirla(); sifirlaOnay = false; $('btnSifirla').textContent = 'Sıfırlandı ✓';
  });

  // Tam ekran (destekleyen tarayıcılarda)
  const tamEkranVar = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
  if (!tamEkranVar) $('btnTamEkran').style.display = 'none';
  tikla('btnTamEkran', () => {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
        if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* yoksay */ } }).catch(() => {});
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      }
    } catch (e) { /* yoksay */ }
  });

  // Sekme gizlenince oyunu duraklat
  document.addEventListener('visibilitychange', () => { if (document.hidden && (O.durum === 'oyun' || O.durum === 'giris')) duraklat(); });

  anaMenu();
  const fontHazir = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fontHazir.then(() => kapakCiz($('kapakTuval'), true));
  kapakCiz($('kapakTuval'), true);
  requestAnimationFrame(dongu);
}

baslat();
