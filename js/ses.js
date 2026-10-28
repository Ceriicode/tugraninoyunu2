'use strict';
// =====================================================================
//  SES: Tüm sesler Web Audio API ile kodla üretilir (ses dosyası yok).
//  Tarayıcılar sesi ancak ilk dokunuş/tıklamadan sonra açmaya izin verir,
//  bu yüzden Ses.baslat() ilk dokunuşta çağrılır.
// =====================================================================
const Ses = {
  ctx: null,
  ana: null,          // ana ses seviyesi (master gain)
  acik: true,
  gurultu: null,      // beyaz gürültü buffer'ı (çarpma sesleri için)
  motorOsc: null, motorOsc2: null, motorFiltre: null, motorGain: null,

  baslat() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    } catch (e) { return; }
    const c = this.ctx;

    this.ana = c.createGain();
    this.ana.gain.value = this.acik ? 0.55 : 0;
    this.ana.connect(c.destination);

    // 1 saniyelik beyaz gürültü
    const uzunluk = c.sampleRate;
    const buf = c.createBuffer(1, uzunluk, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < uzunluk; i++) d[i] = Math.random() * 2 - 1;
    this.gurultu = buf;

    // Motor sesi: iki osilatör + alçak geçiren filtre
    this.motorOsc = c.createOscillator(); this.motorOsc.type = 'sawtooth'; this.motorOsc.frequency.value = 40;
    this.motorOsc2 = c.createOscillator(); this.motorOsc2.type = 'square'; this.motorOsc2.frequency.value = 20;
    const g2 = c.createGain(); g2.gain.value = 0.35;
    this.motorFiltre = c.createBiquadFilter(); this.motorFiltre.type = 'lowpass'; this.motorFiltre.frequency.value = 400;
    this.motorGain = c.createGain(); this.motorGain.gain.value = 0;
    this.motorOsc.connect(this.motorFiltre);
    this.motorOsc2.connect(g2); g2.connect(this.motorFiltre);
    this.motorFiltre.connect(this.motorGain); this.motorGain.connect(this.ana);
    this.motorOsc.start(); this.motorOsc2.start();
  },

  // Sesi aç / kapat
  acKapa() {
    this.acik = !this.acik;
    if (this.ana) this.ana.gain.value = this.acik ? 0.55 : 0;
    Kayit.veri.ses = this.acik; Kayit.kaydet();
    return this.acik;
  },

  // Motor sesini hıza ve gaza göre güncelle
  motor(hiz, gaz, aktif) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 36 + Math.min(Math.abs(hiz), 900) * 0.11 + (gaz ? 16 : 0);
    this.motorOsc.frequency.setTargetAtTime(f, t, 0.06);
    this.motorOsc2.frequency.setTargetAtTime(f / 2, t, 0.06);
    this.motorFiltre.frequency.setTargetAtTime(gaz ? 950 : 420, t, 0.1);
    this.motorGain.gain.setTargetAtTime(aktif ? (gaz ? 0.2 : 0.11) : 0, t, 0.12);
  },

  // Filtrelenmiş gürültü patlaması (çarpma, kırılma)
  patlat(sure, frekans, seviye, tip = 'lowpass') {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const kaynak = c.createBufferSource(); kaynak.buffer = this.gurultu;
    const f = c.createBiquadFilter(); f.type = tip; f.frequency.value = frekans;
    const g = c.createGain();
    g.gain.setValueAtTime(seviye, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + sure);
    kaynak.connect(f); f.connect(g); g.connect(this.ana);
    kaynak.start(t, Math.random() * 0.5); kaynak.stop(t + sure + 0.02);
  },

  // Basit ton (osilatör) - kayma: bitiş frekansı
  ton(frek, sure, tip, seviye, kayma, gecikme = 0) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + gecikme;
    const o = c.createOscillator(); o.type = tip; o.frequency.setValueAtTime(frek, t);
    if (kayma) o.frequency.exponentialRampToValueAtTime(kayma, t + sure);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(seviye, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + sure);
    o.connect(g); g.connect(this.ana);
    o.start(t); o.stop(t + sure + 0.02);
  },

  zombiEz() { this.patlat(0.2, 700, 0.55); this.ton(160, 0.22, 'square', 0.12, 50); },
  kutuKir() { this.patlat(0.14, 2200, 0.45, 'bandpass'); this.ton(240, 0.09, 'triangle', 0.2, 120); },
  carpma(guc = 1) { this.patlat(0.3, 380, 0.5 * guc); },
  inleme() { this.ton(90 + Math.random() * 40, 0.7, 'sawtooth', 0.04, 60); },
  para() { this.ton(988, 0.07, 'square', 0.05); this.ton(1318, 0.1, 'square', 0.05, null, 0.06); },
  tik() { this.ton(660, 0.05, 'square', 0.05); },
  vapurDudugu() { this.ton(110, 1.6, 'sawtooth', 0.14); this.ton(138, 1.6, 'sawtooth', 0.1); },
  kazandi() { [523, 659, 784, 1046].forEach((f, i) => this.ton(f, 0.25, 'square', 0.07, null, i * 0.12)); },
  kaybetti() { [392, 330, 262, 196].forEach((f, i) => this.ton(f, 0.3, 'triangle', 0.12, null, i * 0.15)); },
  havaiFisek() { this.patlat(0.5, 1200, 0.25); },
};
