// ============================================================================
// BLUE LOCK: EGOIST CAREER - SONS (Web Audio, tudo sintetizado na hora, sem arquivos)
// Chute, rede, torcida, apito, defesa, trave, drible e os "plins" de recompensa.
// O navegador só libera o som depois do primeiro clique/tecla: SFX.unlock() cuida disso.
// ============================================================================

window.SFX = {
  ctx: null,
  master: null,
  muted: false,
  crowd: null,

  init() {
    try {
      this.muted = localStorage.getItem('bluelock_muted') === '1';
    } catch (e) {
      this.muted = false;
    }
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    this.updateButtons();
  },

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this.makeNoise(2);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('bluelock_muted', this.muted ? '1' : '0');
    } catch (e) {
      // ignore storage errors
    }
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.55, this.ctx.currentTime, 0.05);
    this.updateButtons();
  },

  updateButtons() {
    document.querySelectorAll('.js-mute-btn').forEach((b) => (b.textContent = this.muted ? '🔇 SOM' : '🔊 SOM'));
  },

  ready() {
    return !!(this.ctx && this.ctx.state === 'running');
  },

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  },

  // Envelope rápido: sobe em a segundos e cai até zero em r segundos
  env(gainNode, t, peak, a, r) {
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(peak, t + a);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + a + r);
  },

  tone(type, f0, f1, dur, peak = 0.4, when = 0) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, peak, 0.005, dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  noise(filterType, freq, dur, peak = 0.3, when = 0, q = 1, freqEnd = null) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t, peak, Math.min(0.03, dur / 4), dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.1);
  },

  // "Vozes" da torcida: vários tons de serra desafinados passando por um filtro
  // grave soam como gente gritando "uuuh"/"aaah" (sem o chiado do ruído branco)
  crowdVoice(f0, f1, dur, peak = 0.12, when = 0) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + when;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.18);
    g.gain.setValueAtTime(peak, t + dur * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g).connect(this.master);
    for (let i = 0; i < 7; i++) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      const det = 1 + (i - 3) * 0.018;
      o.frequency.setValueAtTime(f0 * det, t);
      o.frequency.linearRampToValueAtTime(f1 * det, t + dur);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  },

  // power 0..1: chute fraco "tuc", chute forte "DOM"
  kick(power = 0.5) {
    this.tone('sine', 150 + power * 40, 45, 0.12 + power * 0.08, 0.55 + power * 0.4);
    this.noise('lowpass', 1400, 0.04, 0.12 + power * 0.1, 0, 0.8);
    if (power > 0.7) this.tone('sine', 70, 35, 0.3, 0.45, 0.01);
  },

  pass() {
    this.tone('sine', 230, 95, 0.08, 0.35);
  },

  whoosh() {
    this.noise('bandpass', 500, 0.2, 0.12, 0, 3, 1600);
    this.tone('sine', 600, 1100, 0.12, 0.06);
  },

  tackle() {
    this.noise('lowpass', 600, 0.16, 0.28);
    this.tone('sine', 110, 60, 0.1, 0.35);
  },

  save() {
    this.tone('sine', 120, 55, 0.15, 0.55);
    this.noise('lowpass', 500, 0.1, 0.25);
    this.crowdVoice(230, 170, 1.1, 0.09, 0.05); // "uuuh"
  },

  post() {
    this.tone('triangle', 880, 860, 0.7, 0.3);
    this.tone('triangle', 1318, 1290, 0.5, 0.16);
    this.tone('sine', 140, 60, 0.12, 0.4);
    this.crowdVoice(240, 180, 0.9, 0.07, 0.1);
  },

  // Bola estufando a rede + a torcida explodindo num "AAAH"
  goal(big = false) {
    this.tone('sine', 90, 40, 0.25, 0.5);
    this.noise('lowpass', 900, 0.25, 0.14);
    this.crowdVoice(200, 260, big ? 3 : 2.3, big ? 0.16 : 0.13, 0.05);
    this.crowdVoice(300, 380, big ? 2.6 : 2, 0.07, 0.1);
    this.jingle(big ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047], 0.25);
  },

  concede() {
    this.crowdVoice(220, 150, 1.4, 0.08);
    this.tone('triangle', 220, 110, 0.6, 0.12);
  },

  // Voz dos diálogos: um "blip" curtinho por letra, com o tom de quem fala
  blip(pitch = 440) {
    if (!this.ready()) return;
    this.tone('square', pitch, pitch * 0.92, 0.035, 0.045);
  },

  // Troca de fala / caixa de diálogo
  page() {
    this.tone('triangle', 660, 880, 0.06, 0.07);
  },

  // Apito: count = 1 (falta), 2 (começo), 3 (fim)
  whistle(count = 1) {
    if (!this.ready()) return;
    for (let i = 0; i < count; i++) {
      const t = this.ctx.currentTime + i * 0.32;
      const o = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 2900;
      lfo.frequency.value = 32;
      lfoGain.gain.value = 140;
      lfo.connect(lfoGain).connect(o.frequency);
      const dur = i === count - 1 && count === 3 ? 0.55 : 0.22;
      this.env(g, t, 0.22, 0.01, dur);
      o.connect(g).connect(this.master);
      o.start(t);
      lfo.start(t);
      o.stop(t + dur + 0.05);
      lfo.stop(t + dur + 0.05);
    }
  },

  // Notinhas em sequência (recompensa, conquista, gol no ângulo)
  jingle(notes, when = 0, type = 'triangle') {
    notes.forEach((f, i) => this.tone(type, f, f, 0.18, 0.22, when + i * 0.09));
  },

  click() {
    this.tone('square', 900, 700, 0.04, 0.08);
  },

  // Torcida de fundo durante a partida: ruído bem grave (murmúrio de estádio, sem chiado)
  // com uma "onda" lenta
  startCrowd() {
    if (!this.ready() || this.crowd) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 380;
    f.Q.value = 0.4;
    const g = this.ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.045, this.ctx.currentTime + 1.5);
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(g.gain);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    lfo.start();
    this.crowd = { src, g, lfo };
  },

  // Torcida sobe quando o seu time chega perto do gol (0..1)
  crowdTension(level) {
    if (!this.crowd) return;
    this.crowd.g.gain.setTargetAtTime(0.04 + level * 0.05, this.ctx.currentTime, 0.4);
  },

  stopCrowd() {
    if (!this.crowd) return;
    const { src, g, lfo } = this.crowd;
    g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.3);
    src.stop(this.ctx.currentTime + 1.2);
    lfo.stop(this.ctx.currentTime + 1.2);
    this.crowd = null;
  },

  // A música (trilhas, sintetizador e arquivos em musica/) fica em js/music_engine.js
};
