// ============================================================================
// O CORINGA (cine_wildcard) — o arco do Wild Card (Rensuke Kunigami). Ver js/cine_kit.js
//   wildcard_door    • a noite da eliminação: o corredor branco → ELIMINADO → duas portas →
//                      a mão no peito → a porta preta se fecha → WILD CARD
//   wildcard_hell    • lá dentro: o subsolo → o escaneamento → DIA 1... DIA 47 → "Apague." →
//                      o atacante perfeito
//   kunigami_return  • véspera da NEL: os refletores morrem → a porta preta abre → ele volta →
//                      os olhos vazios → O RETORNO DO CORINGA
//   wildcard_verdict • depois do jogo: o estádio vazio → as mãos → uma rachadura →
//                      APROVADO → "Na NEL eu vou te devorar."
//   + fundo de diálogo VN_BG.wildcard_lab (a instalação do Wild Card)
// Usa os bonecos guardados da cine_final (finSpr/finHead/finCrop/finRim), o rincStamp da
// cine_rin e o foxcGradH/foxcGrain da cine_fox. Helpers daqui têm o prefixo "wcd".
// Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas, sem tela piscando (um flash por
// impacto), olhos em close em pixel art, frame 0 = piscada (não usar).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine) return;
  CE.VN_BG = CE.VN_BG || {};
  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  const line = (ctx, a, b) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  // Passo da caminhada: os quadros da corrida, devagar
  // (4 quadros por ciclo: cada quadro é um boneco guardado, e memória também conta)
  const WALKF = (f, sp = 5) => 1 + (Math.floor(f / sp) % 4) * 4;
  const RUNF = (f) => 1 + (Math.floor(f / 3) % 4) * 4;
  const mixHex = (a, b, k) => {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp(k)).toString(16).padStart(2, '0')).join('');
  };
  // Perspectivas (ponto de fuga) dos cenários: corredor, laboratório, arena
  const CP = (x, y, z) => [640 + (x - 640) / z, 318 + (y - 318) / z];
  const LP = (x, y, z) => [640 + (x - 640) / z, 300 + (y - 300) / z];
  const AP = (x, y, z) => [640 + (x - 640) / z, 240 + (y - 240) / z];
  const CZF = 3.6;
  const LZF = 3.2;

  const KUNI_C = '#fb923c';
  const COLD_C = '#c8ab94';
  const EGO_C = '#00f5d4';
  const VOICE_C = '#f87171';
  const NARR_C = '#94a3b8';
  const CHI_C = '#fb7185';
  const WILD = { jerseyPrimary: '#17171c', jerseySecondary: '#9a3412' };
  // As duas portas (cenário da porta) e a porta preta no fundo da arena
  const DOOR_A = { x0: 784, x1: 1056, y0: 184, y1: 560, mid: 920 };
  const END_A = { x0: 532, x1: 748, y0: 214, y1: 560, mid: 640 };
  // Refletores da arena: [x, y, largura] e a poça de luz no gramado [x, y, raio]
  const RIGS = [[150, 118, 130], [318, 150, 96], [440, 170, 70], [1130, 118, 130], [962, 150, 96], [840, 170, 70]];
  const POOLS = [[300, 640, 380], [430, 500, 270], [520, 432, 190], [980, 640, 380], [850, 500, 270], [760, 432, 190]];

  // ==========================================================================
  // HELPERS (prefixo wcd)
  // ==========================================================================
  Object.assign(CE, {
    wcdCast() {
      const bl = this.KITS.blueLock;
      const cold = { mouth: 'thin', eyeColor: '#6b625b', hairColor: '#d97a34', hairSecondary: '#b7611f', auraColor: '#a8927e' };
      return {
        kuni: this.cineChar('kunigami', bl),
        smile: this.cineChar('kunigami', Object.assign({ mouth: 'grin' }, bl)),
        wild: this.cineChar('kunigami', WILD),
        cold: this.cineChar('kunigami', Object.assign({}, cold, WILD)),
        kid: this.cineChar('kunigami', { outfit: 'casual', clothesColor: '#b91c1c', mouth: 'grin' }),
        chigiri: this.cineChar('chigiri', bl),
        bachira: this.cineChar('bachira', bl),
        you: this.cineYou(Object.assign({}, bl))
      };
    },
    wcdHoloChar() {
      return { id: 'wcd_holo', name: 'Holograma', hairStyle: 'spiky_tall', hairColor: '#111111', hairSecondary: '#111111', skinColor: '#111111', eyeColor: '#111111', jerseyPrimary: '#111111', jerseySecondary: '#111111' };
    },

    // Aquecimento: um item por quadro durante o plano 1 (sem travada na troca de plano)
    wcdWarm(S, list) {
      if (S.phase !== 0 || S.t < 3) return;
      const run = `${this.sakugaType}|${this._cineRun}`;
      if (this._wcdWarmRun !== run) {
        this._wcdWarmRun = run;
        this._wcdWarmIdx = 0;
      }
      if (this._wcdWarmIdx < list.length) list[this._wcdWarmIdx++].call(this);
    },

    // Pixel art pequena guardada: fn desenha em baixa resolução, o alfa vira 0/255 e ganha
    // contorno escuro (como os bonecos). Desenhada ampliada sem suavizar (wcdPix)
    wcdPixelize(key, w, h, fn, outline = '#0a0f1c') {
      const c = this._wcdPixC || (this._wcdPixC = new Map());
      if (c.has(key)) return c.get(key);
      const a = document.createElement('canvas');
      a.width = w;
      a.height = h;
      const g = a.getContext('2d');
      fn.call(this, g);
      const img = g.getImageData(0, 0, w, h);
      for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 100 ? 255 : 0;
      g.putImageData(img, 0, 0);
      const o = document.createElement('canvas');
      o.width = w + 2;
      o.height = h + 2;
      const og = o.getContext('2d');
      if (outline) {
        [[0, 1], [2, 1], [1, 0], [1, 2]].forEach(([dx, dy]) => og.drawImage(a, dx, dy));
        og.globalCompositeOperation = 'source-in';
        og.fillStyle = outline;
        og.fillRect(0, 0, o.width, o.height);
        og.globalCompositeOperation = 'source-over';
      }
      og.drawImage(a, 1, 1);
      c.set(key, o);
      return o;
    },
    wcdPix(ctx, cv, x, y, s, flip = false) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (flip) {
        ctx.translate(Math.round(x + cv.width * s), Math.round(y));
        ctx.scale(-1, 1);
        ctx.drawImage(cv, 0, 0, cv.width * s, cv.height * s);
      } else ctx.drawImage(cv, Math.round(x), Math.round(y), cv.width * s, cv.height * s);
      ctx.restore();
    },

    // A mala do Blue Lock no ombro (alça atravessando as costas), em unidades do boneco
    wcdBagCv() {
      return this.wcdPixelize('bag', 72, 72, (g) => {
        g.fillStyle = '#1f2937';
        poly(g, [[48.4, 27], [51, 28.6], [22.6, 44.6], [20, 43]]);
        g.fill();
        g.fillStyle = '#1e3a5f';
        g.fillRect(4, 38, 20, 12);
        g.fillStyle = '#152a45';
        g.fillRect(4, 46, 20, 4);
        g.fillStyle = '#0f172a';
        g.fillRect(4, 38, 2, 12);
        g.fillRect(22, 38, 2, 12);
        g.fillStyle = '#38bdf8';
        g.fillRect(6, 42, 16, 2);
        g.fillStyle = '#334155';
        g.fillRect(8, 38, 12, 1);
      });
    },
    wcdBagDarkCv() {
      return this.wcdPixelize('bagdark', 72, 72, (g) => {
        g.drawImage(this.wcdBagCv(), -1, -1);
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(12,4,4,0.86)';
        g.fillRect(0, 0, 72, 72);
      }, '#fed7aa');
    },
    // fr = quadro da caminhada (acompanha o balanço e a inclinação da corrida), null = parado
    wcdBag(ctx, x, feet, size, fr = null, dark = false) {
      const u = size / 36;
      const top = feet - size * 0.87;
      ctx.save();
      if (fr != null) {
        const bob = -Math.abs(Math.sin((fr * 0.38) % TAU)) * 1.8;
        const py = top + 0.55 * size + 2 * u;
        ctx.translate(x, py);
        ctx.rotate(0.08);
        ctx.translate(-x, -py + bob * u);
      }
      this.wcdPix(ctx, dark ? this.wcdBagDarkCv() : this.wcdBagCv(), x - 18 * u - u / 2, top - u / 2, u / 2);
      ctx.restore();
    },

    // Capa vermelha do menino herói (atrás do boneco)
    wcdCapeCv() {
      return this.wcdPixelize('cape', 72, 76, (g) => {
        g.fillStyle = '#dc2626';
        poly(g, [[11.5, 14.2], [24.5, 14.2], [30, 31.5], [27, 30.6], [24, 32.2], [20.5, 30.8], [16.5, 32.4], [12.5, 30.8], [8.5, 32]].map(([x, y]) => [x * 2, y * 2]));
        g.fill();
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = '#991b1b';
        g.fillRect(44, 0, 30, 80);
        g.fillStyle = '#f87171';
        g.fillRect(16, 32, 4, 28);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = '#facc15';
        g.fillRect(34, 27, 4, 3);
      }, '#1a0505');
    },
    wcdCape(ctx, x, feet, size) {
      const u = size / 36;
      this.wcdPix(ctx, this.wcdCapeCv(), x - 18 * u - u / 2, feet - size * 0.87 - u / 2, u / 2);
    },

    // Mão aberta, palma para cima (mão direita; a esquerda é espelhada), manga do Wild Card
    wcdHandCv() {
      return this.wcdPixelize('hand', 18, 22, (g) => {
        const S = '#f0cdb2';
        const D = '#d9a98a';
        const L = '#fde3cf';
        const C = '#c48d6e';
        [[2, 7], [5, 4], [8, 3], [11, 4]].forEach(([x, y0]) => {
          g.fillStyle = S;
          g.fillRect(x, y0, 2, 11 - y0);
          g.fillStyle = L;
          g.fillRect(x, y0, 1, 10 - y0);
          g.fillStyle = C;
          g.fillRect(x, y0 + Math.floor((11 - y0) / 2), 2, 1);
        });
        g.fillStyle = S;
        g.fillRect(2, 10, 11, 6);
        g.fillStyle = D;
        g.fillRect(11, 10, 2, 6);
        g.fillRect(2, 15, 11, 1);
        g.fillStyle = C;
        [[4, 12], [5, 12], [6, 13], [7, 13], [8, 11], [9, 11], [10, 12]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
        g.fillStyle = S;
        poly(g, [[12.5, 11], [16, 7.5], [17.6, 8.6], [14.6, 14], [12.5, 14]]);
        g.fill();
        g.fillStyle = D;
        g.fillRect(13, 13, 2, 1);
        g.fillStyle = S;
        g.fillRect(4, 16, 8, 3);
        g.fillStyle = D;
        g.fillRect(10, 16, 2, 3);
        g.fillStyle = '#16161b';
        g.fillRect(3, 18, 10, 4);
        g.fillStyle = '#9a3412';
        g.fillRect(3, 18, 10, 1);
      }, '#2a160c');
    },

    // O punho fechado agarrando o colete no peito (painel inteiro em pixel art, 60 x 32)
    wcdFistCv() {
      return this.wcdPixelize('fist', 28, 17, (g) => {
        const S = '#f0cdb2';
        const D = '#d6a283';
        const L = '#fde7d6';
        const C = '#b9805f';
        g.fillStyle = '#0a0d14';
        g.fillRect(19, 1, 9, 8);
        g.fillStyle = '#1e2633';
        g.fillRect(19, 1, 9, 1);
        g.fillStyle = S;
        g.fillRect(3, 2, 17, 6);
        g.fillStyle = L;
        g.fillRect(4, 2, 13, 1);
        g.fillStyle = D;
        g.fillRect(16, 3, 4, 5);
        [3, 7, 11, 15].forEach((x) => {
          g.fillStyle = S;
          g.fillRect(x, 8, 3, 5);
          g.fillStyle = L;
          g.fillRect(x, 8, 2, 1);
          g.fillStyle = D;
          g.fillRect(x, 12, 3, 1);
          g.fillStyle = C;
          g.fillRect(x + 2, 9, 1, 3);
        });
        g.fillStyle = C;
        [4, 8, 12, 16].forEach((x) => g.fillRect(x, 7, 1, 1));
        g.fillStyle = S;
        g.fillRect(0, 4, 4, 4);
        g.fillStyle = D;
        g.fillRect(0, 7, 4, 1);
        g.fillStyle = L;
        g.fillRect(1, 4, 2, 1);
      }, '#1a0f0a');
    },
    wcdFistPanelCv() {
      const c = this._wcdPixC || (this._wcdPixC = new Map());
      if (c.has('fistpanel')) return c.get('fistpanel');
      const cv = document.createElement('canvas');
      cv.width = 46;
      cv.height = 25;
      const g = cv.getContext('2d');
      g.fillStyle = '#133a68';
      g.fillRect(0, 0, 46, 25);
      g.fillStyle = '#0f3058';
      g.fillRect(0, 15, 46, 10);
      g.fillStyle = '#38bdf8';
      g.fillRect(1, 0, 3, 25);
      g.fillStyle = '#0a1a33';
      g.fillRect(4, 0, 1, 25);
      // dobras do tecido puxadas para o punho (linhas em escada, escura + clara)
      const fold = (x0, y0, x1, y1) => {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i <= n; i++) {
          const x = Math.round(x0 + ((x1 - x0) * i) / n);
          const y = Math.round(y0 + ((y1 - y0) * i) / n);
          g.fillStyle = '#081a33';
          g.fillRect(x, y, 1, 1);
          g.fillStyle = '#2563a6';
          g.fillRect(x, y - 1, 1, 1);
        }
      };
      fold(8, 8, 5, 2);
      fold(8, 13, 5, 12);
      fold(8, 19, 5, 24);
      fold(16, 22, 13, 25);
      fold(26, 22, 28, 25);
      fold(14, 3, 11, 0);
      g.drawImage(this.wcdFistCv(), 8, 3);
      c.set('fistpanel', cv);
      return cv;
    },

    // Holograma (defensor de treino): silhueta laranja com linhas de varredura e borda clara,
    // montado uma vez por pose e desenhado com luz aditiva
    wcdHoloEntry(o) {
      const c = this._wcdHoloC || (this._wcdHoloC = new Map());
      const key = `${o.animState || 'idle'}|${o.frame || 45}|${o.flipX ? 1 : 0}`;
      let e = c.get(key);
      if (e) return e;
      const sil = this.finSprEntry(this.wcdHoloChar(), 180, Object.assign({}, o, { tint: '#ffffff' }));
      const w = sil.cv.width;
      const h = sil.cv.height;
      const body = document.createElement('canvas');
      body.width = w;
      body.height = h;
      const b = body.getContext('2d');
      b.drawImage(sil.cv, 0, 0);
      b.globalCompositeOperation = 'source-in';
      b.fillStyle = 'rgba(251,146,60,0.5)';
      b.fillRect(0, 0, w, h);
      b.globalCompositeOperation = 'source-atop';
      b.fillStyle = 'rgba(255,237,213,0.55)';
      for (let y = 0; y < h; y += 6) b.fillRect(0, y, w, 2);
      b.fillStyle = 'rgba(255,247,237,0.35)';
      b.fillRect(0, 0, w, h * 0.32);
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const g = cv.getContext('2d');
      [[-3, 0], [3, 0], [0, -3], [0, 3]].forEach(([dx, dy]) => g.drawImage(sil.cv, dx, dy));
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#fed7aa';
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(sil.cv, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.drawImage(body, 0, 0);
      e = { cv, pad: sil.pad };
      c.set(key, e);
      return e;
    },
    // shatter 0..1: o holograma some e vira cubinhos de luz voando
    wcdHolo(ctx, x, feet, size, o = {}, alpha = 1, shatter = 0, t = 0) {
      const e = this.wcdHoloEntry(o);
      const k = size / 180;
      const fade = alpha * (1 - seg(shatter, 0, 0.35));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = false;
      if (fade > 0) {
        ctx.globalAlpha = fade * (0.85 + 0.15 * Math.sin(t * 0.3 + x));
        ctx.drawImage(e.cv, x - size / 2 - e.pad * k, feet - size * 0.87 - e.pad * k, e.cv.width * k, e.cv.height * k);
      }
      if (shatter > 0 && shatter < 1) {
        const u = size / 36;
        const cell = Math.max(3, Math.round(u * 0.7));
        ctx.fillStyle = '#fdba74';
        for (let i = 0; i < 34; i++) {
          const sx = x + (rnd(i, 3) - 0.5) * 12 * u;
          const sy = feet - (2 + rnd(i, 4) * 28) * u;
          const a = rnd(i, 5) * TAU;
          const d = ease(shatter) * (20 + rnd(i, 6) * 70) * u * 0.3;
          ctx.globalAlpha = alpha * (1 - shatter);
          ctx.fillRect(Math.round(sx + Math.cos(a) * d), Math.round(sy + Math.sin(a) * d + shatter * shatter * 30), cell, cell);
        }
      }
      ctx.restore();
    },

    // Aura fria (labaredas em pixel, cinza-laranja), atrás do boneco
    wcdAura(ctx, cx, feet, size, t, k, pal = ['#4a3328', '#8f7462', '#d9c3ae']) {
      if (k <= 0) return;
      const u = size / 36;
      const top = feet - size * 0.87;
      const cell = Math.max(3, Math.round(u * 0.55));
      const snap = (v) => Math.round(v / cell) * cell;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cols = 9;
      const step = cell / u;
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = pal[j];
        ctx.globalAlpha = k * (0.6 + j * 0.15);
        for (let i = 0; i < cols; i++) {
          const fx = 3 + i * (30 / (cols - 1));
          const edge = Math.min(i, cols - 1 - i);
          const hb = edge < 2 ? 30 - edge * 4 : 17 + (4 - Math.min(4, edge)) * 2;
          const hh = (hb + Math.sin(t * 0.09 + i * 1.7) * 3 + Math.sin(t * 0.23 + i) * 1.4) * (1 - j * 0.32) * (0.6 + 0.4 * k);
          const ww = 6.2 * (1 - j * 0.3);
          for (let r = 0; r < hh; r += step) {
            const w2 = ww * Math.pow(1 - r / (hh + 1), 0.7);
            const sway = Math.sin(t * 0.1 + r * 0.3 + i) * 0.7 * (r / hh);
            const px = snap(cx + (fx - 18 + sway - w2 / 2) * u);
            const py = snap(top + (32 - r) * u);
            ctx.fillRect(px, py, Math.max(cell, snap(w2 * u)), cell);
          }
        }
      }
      // faíscas subindo
      ctx.fillStyle = '#e7e5e4';
      for (let i = 0; i < 16; i++) {
        const ph = (t * (0.4 + rnd(i, 2) * 0.5) + rnd(i, 3) * 60) % 60;
        ctx.globalAlpha = k * (1 - ph / 60);
        ctx.fillRect(snap(cx + (rnd(i, 4) - 0.5) * 30 * u), snap(top + (30 - ph * 0.6) * u), cell, cell);
      }
      ctx.restore();
    },

    // Fumaça rente ao chão: manchas de luz grandes andando devagar
    wcdSmoke(ctx, x0, x1, y0, y1, t, n, color, alpha = 1, seed = 1, drift = 0.3) {
      const span = x1 - x0;
      for (let i = 0; i < n; i++) {
        const x = x0 + (((rnd(i, seed) * span + t * drift * (0.5 + rnd(i, seed + 1))) % span) + span) % span;
        const y = y0 + rnd(i, seed + 2) * (y1 - y0) + Math.sin(t * 0.012 + i) * 6;
        const r = 60 + rnd(i, seed + 3) * 110;
        this.cineGlow(ctx, x, y, r, color, alpha * (0.55 + 0.45 * Math.sin(t * 0.02 + i * 1.3)));
      }
    },

    // Luz de recorte assada no boneco guardado, com a espessura fixa em px da pixel art (rimD):
    // a chave do cache não muda quando o boneco cresce ou encolhe na tela
    // (silhuetas coloridas deslocadas + o boneco por cima, sem montar um terceiro canvas)
    wcdRim(ctx, char, x, feet, size, o, color, sides = [-1, 1], rimD = 1) {
      const base = size >= 180 ? 180 : Math.max(36, 36 * Math.ceil(size / 36));
      const d = (rimD * size) / base;
      const so = Object.assign({}, o, { tint: color, dim: 0, showAura: false });
      sides.forEach((s) => this.finSpr(ctx, char, x + s * d, feet - d * 0.35, size, so));
      this.finSpr(ctx, char, x, feet, size, o);
    },
    // Luz de recorte com duas cores (uma de cada lado)
    wcdRim2(ctx, char, x, feet, size, o, colL, colR, d = 2) {
      const so = Object.assign({}, o, { dim: 0, dimTint: '', showAura: false });
      this.finSpr(ctx, char, x - d, feet - d * 0.35, size, Object.assign({}, so, { tint: colL }));
      this.finSpr(ctx, char, x + d, feet - d * 0.35, size, Object.assign({}, so, { tint: colR }));
      this.finSpr(ctx, char, x, feet, size, o);
    },

    // Um olho em pixel art por cima do close (side -1 = olho da esquerda da tela)
    wcdEye(ctx, ex, ey, px, side, o = {}) {
      if (o.glow) this.cineGlow(ctx, ex, ey, px * 10, o.glow, o.glowA ?? 1);
      this.drawPixelEye(ctx, ex, ey, px, { line: o.line || '#0a0f1c', white: o.white, iris: o.iris, ring: o.ring, look: o.look || 0, tiny: o.tiny, blink: o.blink });
      if (o.blink) return;
      const x0 = Math.round(ex - 6 * px);
      const y0 = Math.round(ey - 3.5 * px);
      const s = Math.ceil(px);
      const ic = 3 + (o.look || 0);
      if (o.shine) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = o.shine;
        ctx.fillRect(Math.round(x0 + (ic + 1) * px), Math.round(y0 + 2 * px), s, s);
        ctx.globalAlpha = 1;
      }
      if (o.reflect) {
        ctx.fillStyle = o.reflect;
        ctx.fillRect(Math.round(x0 + (ic + 4) * px), Math.round(y0 + 3 * px), s, s);
      }
      if (o.angry) this.finLid(ctx, ex, ey, px, side < 0 ? 1 : -1, 'angry', o.line || '#0a0f1c');
      if (o.half) this.finLid(ctx, ex, ey, px, side < 0 ? 1 : -1, 'half', o.lid || '#b88f74');
    },
    wcdEyes(ctx, cx, eyeY, u, o = {}) {
      const px = u * (o.scale || 0.3);
      [-1, 1].forEach((s) => this.wcdEye(ctx, cx + s * 3.5 * u, eyeY, px, s, o));
    },
    // Faixa dos olhos em close extremo (16 x 9 unidades do rosto); devolve U (px/unidade)
    wcdEyeBand(ctx, char, cx, eyeY, dw, o = {}) {
      const U = dw / 16;
      this.finCrop(ctx, char, o, 10, 5.4, 16, 9, cx - 8 * U, eyeY - (10.1 - 5.4) * U, dw, 9 * U);
      return U;
    },

    // Interface da "voz": caixinha com a onda do áudio (origem desconhecida)
    wcdVoiceHud(ctx, x, y, t, talk, label = 'VOZ • ORIGEM DESCONHECIDA') {
      ctx.save();
      ctx.fillStyle = 'rgba(12,4,4,0.82)';
      ctx.fillRect(x, y, 300, 66);
      ctx.strokeStyle = 'rgba(248,113,113,0.65)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 300, 66);
      ctx.fillStyle = `rgba(239,68,68,${0.5 + 0.5 * Math.abs(Math.sin(t * 0.08))})`;
      ctx.beginPath();
      ctx.arc(x + 16, y + 17, 5, 0, TAU);
      ctx.fill();
      ctx.font = '900 12px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(label.split('').join(' '), x + 28, y + 17);
      for (let i = 0; i < 34; i++) {
        const lv = talk * (0.25 + 0.75 * Math.abs(Math.sin(t * 0.31 + i * 0.7) * Math.sin(t * 0.13 + i * 0.29)));
        const hh = Math.max(2, lv * 26);
        ctx.fillStyle = i % 2 ? '#f87171' : '#fb923c';
        ctx.fillRect(x + 14 + i * 8, y + 46 - hh / 2, 5, hh);
      }
      ctx.restore();
    },

    // ------------------------------------------------------------- o corredor branco
    wcdCorrBg(g, w, h) {
      const q = (pts, f) => {
        g.fillStyle = f;
        poly(g, pts);
        g.fill();
      };
      const [fx0, fy0] = CP(0, 0, CZF);
      const [fx1, fy1] = CP(1280, 720, CZF);
      g.fillStyle = '#0a0f17';
      g.fillRect(0, 0, w, h);
      let gr = g.createLinearGradient(0, 0, 0, fy0);
      gr.addColorStop(0, '#5a6678');
      gr.addColorStop(1, '#222a36');
      q([[0, 0], [w, 0], [fx1, fy0], [fx0, fy0]], gr);
      gr = g.createLinearGradient(0, 0, fx0, 0);
      gr.addColorStop(0, '#a3afbf');
      gr.addColorStop(1, '#3c4656');
      q([[0, 0], [fx0, fy0], [fx0, fy1], [0, h]], gr);
      gr = g.createLinearGradient(fx1, 0, w, 0);
      gr.addColorStop(0, '#3c4656');
      gr.addColorStop(1, '#9dabbc');
      q([[w, 0], [fx1, fy0], [fx1, fy1], [w, h]], gr);
      gr = g.createLinearGradient(0, fy1, 0, h);
      gr.addColorStop(0, '#1d232d');
      gr.addColorStop(1, '#4f5a6a');
      q([[0, h], [w, h], [fx1, fy1], [fx0, fy1]], gr);
      this.cineGradient(g, fx0, fy0, fx1 - fx0, fy1 - fy0, [[0, '#121822'], [1, '#090d14']]);
      // a passagem escura embaixo do telão (o corredor vira lá no fim)
      q([CP(520, 430, CZF), CP(760, 430, CZF), CP(760, 720, CZF), CP(520, 720, CZF)], '#04060a');
      // piso: juntas convergindo
      g.save();
      poly(g, [[0, h], [w, h], [fx1, fy1], [fx0, fy1]]);
      g.clip();
      g.strokeStyle = 'rgba(16,22,32,0.55)';
      g.lineWidth = 1.5;
      for (let x = -960; x <= 2240; x += 320) line(g, CP(x, 720, 1), CP(x, 720, CZF));
      [1.2, 1.5, 1.9, 2.4, 3.0].forEach((z) => line(g, CP(-2000, 720, z), CP(3280, 720, z)));
      g.restore();
      // rodapé e a faixa ciano do Blue Lock nas duas paredes
      [0, 1280].forEach((X) => {
        q([CP(X, 690, 1), CP(X, 690, CZF), CP(X, 720, CZF), CP(X, 720, 1)], '#202733');
        q([CP(X, 420, 1), CP(X, 420, CZF), CP(X, 428, CZF), CP(X, 428, 1)], 'rgba(56,189,248,0.7)');
      });
      // emendas das placas
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(28,36,50,0.5)';
      [1.18, 1.42, 1.75, 2.1, 2.5, 2.95, 3.3].forEach((z) => [0, 1280].forEach((X) => line(g, CP(X, 0, z), CP(X, 690, z))));
      // portas dos times (visor e plaquinha ciano)
      [[0, 1.5, 1.72], [0, 2.55, 2.75], [1280, 1.9, 2.12], [1280, 2.95, 3.12]].forEach(([X, z0, z1]) => {
        q([CP(X, 240, z0), CP(X, 240, z1), CP(X, 690, z1), CP(X, 690, z0)], '#4d596b');
        g.strokeStyle = '#1a212d';
        g.lineWidth = 3 / z0;
        poly(g, [CP(X, 240, z0), CP(X, 240, z1), CP(X, 690, z1), CP(X, 690, z0)]);
        g.stroke();
        q([CP(X, 300, z0 + 0.04), CP(X, 300, z1 - 0.04), CP(X, 360, z1 - 0.04), CP(X, 360, z0 + 0.04)], 'rgba(147,197,253,0.35)');
        q([CP(X, 210, z0 + 0.03), CP(X, 210, z1 - 0.03), CP(X, 226, z1 - 0.03), CP(X, 226, z0 + 0.03)], 'rgba(56,189,248,0.6)');
      });
      // luminárias do teto (uma queimada) e o reflexo no piso
      [1.06, 1.42, 1.82, 2.26, 2.74, 3.24].forEach((z, i) => {
        const dead = i === 4;
        q([CP(470, 0, z), CP(810, 0, z), CP(810, 0, z + 0.16), CP(470, 0, z + 0.16)], dead ? '#4a5466' : '#eef5ff');
        if (dead) return;
        const c = CP(640, 0, z + 0.08);
        this.cineGlow(g, c[0], c[1] + 10 / z, 260 / z, 'rgba(219,234,254,0.35)');
        const f = CP(640, 720, z + 0.3);
        g.save();
        g.translate(f[0], f[1]);
        g.scale(0.5, 1);
        this.cineGlow(g, 0, 0, 200 / z, 'rgba(219,234,254,0.22)');
        g.restore();
      });
      g.fillStyle = 'rgba(8,16,40,0.22)';
      g.fillRect(0, 0, w, h);
    },

    // O telão vermelho: ELIMINADO, o rosto riscado e o nome
    wcdElimScreen(ctx, x, y, w, h, t) {
      const c = this.wcdCast();
      const fl = 0.9 + 0.1 * Math.sin(t * 0.21) * Math.sin(t * 0.07);
      this.cineGlow(ctx, x + w / 2, y + h / 2, w * 1.3, 'rgba(239,68,68,0.5)', fl);
      ctx.save();
      ctx.fillStyle = '#05070b';
      ctx.fillRect(x - w * 0.03, y - h * 0.07, w * 1.06, h * 1.14);
      this.cineGradient(ctx, x, y, w, h, [[0, '#8a1c1c'], [1, '#3b0909']]);
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      const pw = w * 0.28;
      const px0 = x + w * 0.04;
      ctx.fillStyle = '#2a0606';
      ctx.fillRect(px0, y + h * 0.1, pw, h * 0.8);
      ctx.save();
      ctx.beginPath();
      ctx.rect(px0, y + h * 0.1, pw, h * 0.8);
      ctx.clip();
      this.finHead(ctx, c.kuni, px0 + pw / 2, y + h * 0.42, h * 1.3, { dim: 0.45, dimTint: '90,10,10' });
      ctx.restore();
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = Math.max(2, h * 0.045);
      line(ctx, [px0 + pw * 0.1, y + h * 0.18], [px0 + pw * 0.9, y + h * 0.84]);
      line(ctx, [px0 + pw * 0.9, y + h * 0.18], [px0 + pw * 0.1, y + h * 0.84]);
      this.finPixelText(ctx, 'ELIMINADO', x + w * 0.66, y + h * 0.36, h * 0.034, '#fee2e2', 'center', w * 0.6);
      this.finPixelText(ctx, 'RENSUKE KUNIGAMI', x + w * 0.66, y + h * 0.7, h * 0.02, '#fca5a5', 'center', w * 0.6);
      this.finFillPat(ctx, 'scan', x, y, w, h, 0.8);
      const by = y + ((t * 0.9) % (h * 1.6)) - h * 0.3;
      ctx.fillStyle = 'rgba(254,202,202,0.08)';
      ctx.fillRect(x, by, w, h * 0.18);
      ctx.restore();
    },

    // ------------------------------------------------------------- as duas portas
    wcdDoorsBg(g, w, h) {
      const A = DOOR_A;
      this.cineGradient(g, 0, 0, w, 560, [[0, '#0c1018'], [1, '#161c26']]);
      // placas de concreto da parede
      g.strokeStyle = 'rgba(4,6,10,0.6)';
      g.lineWidth = 3;
      for (let x = 80; x < w; x += 200) line(g, [x, 70], [x, 560]);
      line(g, [0, 300], [w, 300]);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${rnd(i, 2) < 0.5 ? '0,0,0' : '148,163,184'},0.05)`;
        g.fillRect(rnd(i, 3) * w, 70 + rnd(i, 4) * 480, 20 + rnd(i, 5) * 90, 4 + rnd(i, 6) * 30);
      }
      // teto e o cano
      this.cineGradient(g, 0, 0, w, 72, [[0, '#04060a'], [1, '#0b0f17']]);
      g.fillStyle = '#1b222d';
      g.fillRect(0, 80, w, 14);
      g.fillStyle = 'rgba(148,163,184,0.18)';
      g.fillRect(0, 80, w, 3);
      for (let x = 60; x < w; x += 240) {
        g.fillStyle = '#0f141c';
        g.fillRect(x, 76, 14, 22);
      }
      // piso em perspectiva
      const gr = g.createLinearGradient(0, 560, 0, h);
      gr.addColorStop(0, '#0b0e14');
      gr.addColorStop(1, '#1b212b');
      g.fillStyle = gr;
      g.fillRect(0, 560, w, h - 560);
      g.strokeStyle = 'rgba(30,38,52,0.6)';
      g.lineWidth = 1.5;
      for (let i = -12; i <= 12; i++) line(g, [640 + i * 70, 560], [640 + i * 300, h]);
      [574, 594, 622, 662].forEach((y) => line(g, [0, y], [w, y]));
      g.fillStyle = '#05070b';
      g.fillRect(0, 556, w, 6);
      // SAÍDA: porta comum, janela fosca, barra e placa verde
      g.fillStyle = '#20262f';
      g.fillRect(196, 254, 238, 306);
      g.fillStyle = '#4a5466';
      g.fillRect(210, 266, 210, 294);
      g.fillStyle = '#3c4555';
      g.fillRect(396, 266, 24, 294);
      this.cineGradient(g, 262, 292, 108, 92, [[0, '#fff7d6'], [1, '#f5d77a']]);
      g.fillStyle = 'rgba(120,90,30,0.25)';
      for (let y = 296; y < 382; y += 6) g.fillRect(262, y, 108, 2);
      g.strokeStyle = '#20262f';
      g.lineWidth = 4;
      g.strokeRect(262, 292, 108, 92);
      g.fillStyle = '#9aa5b5';
      g.fillRect(226, 430, 178, 10);
      g.fillStyle = '#5b6576';
      g.fillRect(226, 438, 178, 4);
      g.fillStyle = '#0f3d22';
      g.fillRect(250, 204, 132, 36);
      g.fillStyle = '#16a34a';
      g.fillRect(254, 208, 124, 28);
      g.font = '900 17px "Segoe UI", sans-serif';
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      g.fillStyle = '#f0fdf4';
      g.fillText('SAÍDA', 296, 223);
      // bonequinho correndo da placa
      g.fillStyle = '#f0fdf4';
      [[268, 213, 4, 4], [267, 217, 4, 7], [263, 219, 4, 2], [271, 219, 4, 2], [264, 224, 3, 5], [270, 224, 3, 3], [272, 226, 3, 3], [282, 222, 9, 3], [289, 219, 3, 9]].forEach(([x, y, ww, hh]) => g.fillRect(x, y, ww, hh));
      // A porta do Wild Card: preta, sem maçaneta, faixas de perigo, lente vermelha
      g.fillStyle = '#020203';
      g.fillRect(A.x0 - 22, A.y0 - 20, A.x1 - A.x0 + 44, A.y1 - A.y0 + 20);
      g.fillStyle = '#0d0d10';
      g.fillRect(A.x0 - 14, A.y0 - 12, A.x1 - A.x0 + 28, 8);
      this.wcdLeaf(g, A.x0, A.y0, A.mid - A.x0, A.y1 - A.y0, -1);
      this.wcdLeaf(g, A.mid, A.y0, A.x1 - A.mid, A.y1 - A.y0, 1);
      g.save();
      g.beginPath();
      g.rect(A.x0 - 22, A.y1 - 30, A.x1 - A.x0 + 44, 30);
      g.clip();
      for (let x = A.x0 - 60; x < A.x1 + 40; x += 28) {
        g.fillStyle = '#c2410c';
        poly(g, [[x, A.y1], [x + 14, A.y1], [x + 44, A.y1 - 30], [x + 30, A.y1 - 30]]);
        g.fill();
      }
      g.restore();
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(A.x0 - 22, A.y1 - 30, A.x1 - A.x0 + 44, 30);
      g.font = '900 15px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillStyle = '#7f1d1d';
      g.fillText('W I L D   C A R D', A.mid, A.y0 + 34);
      // teclado ao lado
      g.fillStyle = '#05050a';
      g.fillRect(A.x1 + 36, 330, 34, 56);
      g.fillStyle = '#18181f';
      for (let r = 0; r < 3; r++) for (let cc = 0; cc < 3; cc++) g.fillRect(A.x1 + 41 + cc * 9, 346 + r * 11, 6, 7);
      // o alto-falante no teto
      g.fillStyle = '#0b0f17';
      g.fillRect(634, 94, 12, 50);
      g.fillStyle = '#05070b';
      g.fillRect(604, 140, 72, 40);
      g.fillStyle = '#1b222d';
      for (let i = 0; i < 6; i++) g.fillRect(612 + i * 10, 148, 5, 24);
    },
    // Folha da porta preta (metal escovado)
    wcdLeaf(g, x, y, w, h, side) {
      g.fillStyle = '#060608';
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,0.025)';
      for (let i = 4; i < w; i += 9) g.fillRect(x + i, y, 2, h);
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(side < 0 ? x + 3 : x + w - 5, y, 2, h);
      g.fillStyle = '#0e0e12';
      g.fillRect(x + 14, y + 60, w - 28, 3);
      g.fillRect(x + 14, y + h - 80, w - 28, 3);
    },
    // A porta preta: frestas vazando luz, aberta (o corredor vermelho lá dentro), fumaça
    wcdWildDoor(ctx, A, t, o = {}) {
      const open = o.open || 0;
      const leak = (o.leak ?? 1) * (0.78 + 0.22 * Math.sin(t * 0.05));
      const W0 = A.x1 - A.x0;
      const H0 = A.y1 - A.y0;
      if (open > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(A.x0, A.y0, W0, H0);
        ctx.clip();
        const cx = A.mid;
        const cy = A.y0 + H0 * 0.55;
        const gr = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(W0, H0) * 0.75);
        gr.addColorStop(0, '#fff7ed');
        gr.addColorStop(0.25, '#fdba74');
        gr.addColorStop(0.6, '#c2410c');
        gr.addColorStop(1, '#3b0707');
        ctx.fillStyle = gr;
        ctx.fillRect(A.x0, A.y0, W0, H0);
        // o corredor descendo lá dentro (linhas para o fundo)
        ctx.strokeStyle = 'rgba(69,10,10,0.55)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const k = i / 6;
          line(ctx, [A.x0 + W0 * k, A.y1], [cx + (k - 0.5) * W0 * 0.2, cy + H0 * 0.05]);
        }
        for (let i = 1; i < 6; i++) {
          const yy = cy + H0 * 0.05 + (A.y1 - cy) * Math.pow(i / 6, 1.6);
          line(ctx, [A.x0, yy], [A.x1, yy]);
        }
        if (o.inside) o.inside();
        const off = open * (W0 / 2 + 6);
        this.wcdLeaf(ctx, A.x0 - off, A.y0, A.mid - A.x0, H0, -1);
        this.wcdLeaf(ctx, A.mid + off, A.y0, A.x1 - A.mid, H0, 1);
        ctx.restore();
        // luz saindo para o cômodo
        this.cineShafts(ctx, cx, cy, Math.PI / 2, 760, 2.5, 9, '251,146,60', 0.11 * open, t);
        this.cineGlow(ctx, cx, cy, W0 * 1.6, 'rgba(251,146,60,0.55)', open);
      }
      if (leak > 0 && open < 0.04) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = leak;
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(A.mid - 1, A.y0, 3, H0);
        ctx.fillRect(A.x0, A.y0, 2, H0);
        ctx.fillRect(A.x1 - 2, A.y0, 2, H0);
        ctx.fillRect(A.x0, A.y0, W0, 2);
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(A.x0, A.y1 - 4, W0, 4);
        ctx.restore();
        for (let i = 0; i < 4; i++) this.cineGlow(ctx, A.mid, A.y0 + H0 * (0.15 + i * 0.25), 60, 'rgba(249,115,22,0.35)', leak);
      }
      // poça vermelha no chão e a lente
      ctx.save();
      ctx.translate(A.mid, A.y1 + 18);
      ctx.scale(1, 0.18);
      this.cineGlow(ctx, 0, 0, W0 * (1.1 + open * 1.4), 'rgba(249,115,22,0.6)', Math.max(leak * 0.8, open));
      ctx.restore();
      this.cineGlow(ctx, A.mid, A.y0 + 14, 26, 'rgba(239,68,68,0.9)', 0.6 + 0.4 * Math.sin(t * 0.07));
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(A.mid - 3, A.y0 + 11, 6, 6);
    },
    // O cômodo das duas portas, montado: fundo + luzes + porta preta + alto-falante
    wcdDoorScene(ctx, t, o = {}) {
      const A = DOOR_A;
      ctx.drawImage(this.finBg('wcd_doors', 1280, 720, this.wcdDoorsBg), 0, 0);
      if (o.dark) {
        ctx.fillStyle = `rgba(1,2,4,${0.62 * o.dark})`;
        ctx.fillRect(-200, -200, 1680, 1120);
      }
      // a SAÍDA: janela quente, placa verde, luz por baixo da porta
      this.cineGlow(ctx, 316, 336, 190, 'rgba(253,224,71,0.32)');
      this.cineGlow(ctx, 316, 222, 140, 'rgba(74,222,128,0.55)', 0.9 + 0.1 * Math.sin(t * 0.04));
      ctx.save();
      ctx.translate(316, 572);
      ctx.scale(1, 0.16);
      this.cineGlow(ctx, 0, 0, 260, 'rgba(253,230,138,0.5)');
      ctx.restore();
      this.wcdWildDoor(ctx, A, t, { open: o.open || 0, leak: 1 - (o.dark || 0) * 0.65, inside: o.inside });
      // fumaça fria saindo por baixo da porta preta
      this.wcdSmoke(ctx, A.x0 - 120, A.x1 + 140, A.y1 - 10, A.y1 + 40, t, 9, 'rgba(249,115,22,0.13)', 1 + (o.open || 0) * 1.5, 4, -0.3);
      if (o.talk > 0) {
        ctx.save();
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const ph = ((t * 1.1 + i * 32) % 96) / 96;
          ctx.globalAlpha = o.talk * (1 - ph) * 0.7;
          ctx.beginPath();
          ctx.arc(640, 160, 40 + ph * 110, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }
        ctx.restore();
        this.cineGlow(ctx, 640, 160, 70, 'rgba(0,245,212,0.5)', o.talk);
      }
    },

    // ------------------------------------------------------------- o laboratório
    wcdLabBg(g, w, h) {
      const q = (pts, f) => {
        g.fillStyle = f;
        poly(g, pts);
        g.fill();
      };
      const [fx0, fy0] = LP(0, 0, LZF);
      const [fx1, fy1] = LP(1280, 720, LZF);
      g.fillStyle = '#060507';
      g.fillRect(0, 0, w, h);
      let gr = g.createLinearGradient(0, 0, 0, fy0);
      gr.addColorStop(0, '#171115');
      gr.addColorStop(1, '#09070a');
      q([[0, 0], [w, 0], [fx1, fy0], [fx0, fy0]], gr);
      gr = g.createLinearGradient(0, 0, fx0, 0);
      gr.addColorStop(0, '#1d1518');
      gr.addColorStop(1, '#0b090b');
      q([[0, 0], [fx0, fy0], [fx0, fy1], [0, h]], gr);
      gr = g.createLinearGradient(fx1, 0, w, 0);
      gr.addColorStop(0, '#0b090b');
      gr.addColorStop(1, '#1d1518');
      q([[w, 0], [fx1, fy0], [fx1, fy1], [w, h]], gr);
      gr = g.createLinearGradient(0, fy1, 0, h);
      gr.addColorStop(0, '#09080a');
      gr.addColorStop(1, '#19120f');
      q([[0, h], [w, h], [fx1, fy1], [fx0, fy1]], gr);
      this.cineGradient(g, fx0, fy0, fx1 - fx0, fy1 - fy0, [[0, '#0e0a0c'], [1, '#080608']]);
      // parede do fundo: WILD CARD enorme e a faixa de luz
      g.save();
      g.font = 'italic 900 70px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(127,29,29,0.32)';
      g.fillText('WILD CARD', 640, 300);
      g.strokeStyle = 'rgba(249,115,22,0.12)';
      g.lineWidth = 1.5;
      g.strokeText('WILD CARD', 640, 300);
      g.restore();
      g.fillStyle = 'rgba(249,115,22,0.55)';
      g.fillRect(fx0 + 8, 376, fx1 - fx0 - 16, 3);
      this.cineGlow(g, 640, 378, 260, 'rgba(249,115,22,0.18)');
      // racks de máquinas nas paredes, cheios de LEDs
      [[1.04, 1.36], [1.46, 1.84], [1.95, 2.35], [2.45, 2.85]].forEach(([z0, z1], ri) => {
        [0, 1280].forEach((X, si) => {
          q([LP(X, 130, z0), LP(X, 130, z1), LP(X, 720, z1), LP(X, 720, z0)], '#100c0f');
          g.strokeStyle = 'rgba(60,40,40,0.6)';
          g.lineWidth = 2 / z0;
          poly(g, [LP(X, 130, z0), LP(X, 130, z1), LP(X, 720, z1), LP(X, 720, z0)]);
          g.stroke();
          for (let r = 0; r < 15; r++) {
            const yy = 170 + r * 36;
            g.fillStyle = 'rgba(40,28,28,0.7)';
            const a = LP(X, yy + 12, z0 + 0.02);
            const b = LP(X, yy + 12, z1 - 0.02);
            g.fillRect(Math.min(a[0], b[0]), a[1], Math.abs(b[0] - a[0]), 2 / z0);
            for (let j = 0; j < 6; j++) {
              const v = rnd(r * 7 + j + ri * 131 + si * 977, 5);
              if (v < 0.35) continue;
              const z = z0 + ((j + 0.5) / 6) * (z1 - z0);
              const p = LP(X, yy, z);
              const s = Math.max(2, 7 / z);
              g.fillStyle = v < 0.8 ? '#f59e0b' : v < 0.93 ? '#ef4444' : '#fde68a';
              g.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
            }
          }
        });
      });
      // monitores na parede direita (dados laranja)
      [[1.37, 1.44], [1.85, 1.94]].forEach(([z0, z1]) => {
        const za = z0 - 0.3;
        const zb = z1 + 0.05;
        q([LP(1280, 200, za), LP(1280, 200, zb), LP(1280, 420, zb), LP(1280, 420, za)], '#1a0d08');
        g.strokeStyle = 'rgba(253,186,116,0.55)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 9; i++) {
          const y = 222 + i * 22;
          const len = 0.25 + rnd(i + z0 * 10, 31) * 0.65;
          line(g, LP(1280, y, za + 0.04), LP(1280, y, za + 0.04 + (zb - za - 0.08) * len));
        }
        g.strokeStyle = 'rgba(239,68,68,0.7)';
        g.beginPath();
        for (let i = 0; i <= 20; i++) {
          const p = LP(1280, 380 - Math.abs(Math.sin(i * 1.7)) * 26, za + 0.04 + ((zb - za - 0.08) * i) / 20);
          if (i) g.lineTo(p[0], p[1]);
          else g.moveTo(p[0], p[1]);
        }
        g.stroke();
      });
      // vigas do teto e cabos pendurados
      [1.15, 1.55, 2.0, 2.5, 3.0].forEach((z) => {
        q([LP(0, 0, z), LP(1280, 0, z), LP(1280, 46, z), LP(0, 46, z)], '#0c0a0d');
        g.fillStyle = 'rgba(251,146,60,0.18)';
        const a = LP(0, 46, z);
        const b = LP(1280, 46, z);
        g.fillRect(a[0], a[1] - 2 / z, b[0] - a[0], 2 / z);
      });
      g.strokeStyle = '#030203';
      for (let i = 0; i < 9; i++) {
        const x1 = 100 + rnd(i, 21) * 1080;
        const x2 = x1 + (rnd(i, 22) - 0.5) * 500;
        const z1 = 1.1 + rnd(i, 23) * 1.4;
        const z2 = z1 + 0.3 + rnd(i, 24) * 0.8;
        const a = LP(x1, 40, z1);
        const b = LP(x2, 40, z2);
        g.lineWidth = 4 / z1 + 1;
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 60 / z1 + rnd(i, 25) * 50, b[0], b[1]);
        g.stroke();
      }
      // piso: grade laranja e a plataforma redonda no meio
      g.save();
      poly(g, [[0, h], [w, h], [fx1, fy1], [fx0, fy1]]);
      g.clip();
      g.strokeStyle = 'rgba(234,88,12,0.16)';
      g.lineWidth = 1.5;
      for (let x = -1600; x <= 2880; x += 160) line(g, LP(x, 720, 1), LP(x, 720, LZF));
      [1.0, 1.15, 1.3, 1.5, 1.75, 2.05, 2.4, 2.8].forEach((z) => line(g, LP(-3000, 720, z), LP(4280, 720, z)));
      g.restore();
      g.fillStyle = '#0d0909';
      g.beginPath();
      g.ellipse(640, 528, 232, 54, 0, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(249,115,22,0.75)';
      g.lineWidth = 3;
      g.stroke();
      g.strokeStyle = 'rgba(249,115,22,0.3)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.ellipse(640, 528, 176, 40, 0, 0, TAU);
      g.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        g.fillStyle = 'rgba(253,186,116,0.8)';
        g.fillRect(640 + Math.cos(a) * 232 - 3, 528 + Math.sin(a) * 54 - 2, 6, 4);
      }
      // a neblina laranja rente ao chão
      g.save();
      g.globalCompositeOperation = 'lighter';
      gr = g.createLinearGradient(0, fy1 - 60, 0, h);
      gr.addColorStop(0, 'rgba(234,88,12,0)');
      gr.addColorStop(0.4, 'rgba(234,88,12,0.10)');
      gr.addColorStop(1, 'rgba(234,88,12,0.03)');
      g.fillStyle = gr;
      g.fillRect(0, fy1 - 60, w, h - fy1 + 60);
      g.restore();
      // o "olho": a lente no teto (quem fala nunca aparece)
      g.fillStyle = '#050405';
      g.fillRect(634, 0, 12, 92);
      g.fillStyle = '#0c0b0d';
      g.beginPath();
      g.arc(640, 128, 50, 0, TAU);
      g.fill();
      g.strokeStyle = '#2a2326';
      g.lineWidth = 6;
      g.stroke();
      const lg = g.createRadialGradient(632, 120, 2, 640, 128, 26);
      lg.addColorStop(0, '#fca5a5');
      lg.addColorStop(0.35, '#b91c1c');
      lg.addColorStop(1, '#2a0505');
      g.fillStyle = lg;
      g.beginPath();
      g.arc(640, 128, 26, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.fillRect(628, 116, 6, 6);
    },
    wcdLabScene(ctx, t, talk = 0) {
      ctx.drawImage(this.finBg('wcd_lab', 1280, 720, this.wcdLabBg), 0, 0);
      // LEDs piscando devagar (alguns), a lente pulsando, um feixe varrendo o chão
      for (let i = 0; i < 22; i++) {
        const z = 1.1 + rnd(i, 41) * 1.6;
        const X = rnd(i, 42) < 0.5 ? 0 : 1280;
        const p = LP(X, 170 + Math.floor(rnd(i, 43) * 15) * 36, z);
        const a = Math.max(0, Math.sin(t * (0.04 + rnd(i, 44) * 0.05) + i * 2.1));
        this.cineGlow(ctx, p[0], p[1], 16 / z, 'rgba(251,146,60,0.8)', a);
      }
      const pulse = 0.55 + 0.25 * Math.sin(t * 0.05) + talk * (0.3 + 0.2 * Math.abs(Math.sin(t * 0.33)));
      this.cineGlow(ctx, 640, 128, 120, 'rgba(239,68,68,0.6)', pulse);
      const sx = 640 + Math.sin(t * 0.012) * 420;
      ctx.save();
      ctx.translate(sx, 560);
      ctx.scale(0.25, 1);
      this.cineGlow(ctx, 0, 0, 260, 'rgba(249,115,22,0.28)');
      ctx.restore();
      this.cineDust(ctx, 1280, 720, t, 30, 'rgba(253,186,116,0.4)', 11);
    },

    // ------------------------------------------------------------- a arena do Blue Lock
    wcdArenaBg(g, w, h) {
      const q = (pts, f) => {
        g.fillStyle = f;
        poly(g, pts);
        g.fill();
      };
      this.cineGradient(g, 0, 0, w, h, [[0, '#02040a'], [0.4, '#050a16'], [1, '#03060b']]);
      // treliças do teto convergindo
      g.strokeStyle = 'rgba(30,41,59,0.6)';
      g.lineWidth = 2;
      for (let i = -6; i <= 6; i++) line(g, AP(640 + i * 420, -900, 1), AP(640 + i * 420, -900, 7));
      [1.2, 1.6, 2.2, 3, 4.2, 6].forEach((z) => line(g, AP(-1600, -900, z), AP(2880, -900, z)));
      // arquibancadas dos dois lados (cadeiras azuis vazias)
      [-1, 1].forEach((s) => {
        const xb = s < 0 ? -1150 : 2430;
        const xt = s < 0 ? -2300 : 3580;
        for (let r = 0; r < 16; r++) {
          const v0 = r / 16;
          const v1 = (r + 1) / 16;
          const P0 = (v, z) => AP(lerp(xb, xt, v), lerp(720, -260, v), z);
          q([P0(v0, 1), P0(v0, 7), P0(v1, 7), P0(v1, 1)], r % 2 ? '#0a1222' : '#0c1528');
          g.fillStyle = '#16295a';
          for (let z = 1.2; z < 7; z *= 1.09) {
            const p = P0(v0 + 0.03, z);
            g.fillRect(p[0] - 7 / z, p[1] - 9 / z, 14 / z, 7 / z);
          }
        }
        // placa verde de saída no meio da arquibancada
        const p = AP(lerp(xb, xt, 0.35), lerp(720, -260, 0.35), 3.2);
        g.fillStyle = '#16a34a';
        g.fillRect(p[0] - 8, p[1] - 4, 16, 7);
      });
      // a parede do fundo, o telão e a porta preta
      q([AP(-1150, 720, 7), AP(2430, 720, 7), AP(2430, -700, 7), AP(-1150, -700, 7)], '#070c18');
      const s0 = AP(60, -420, 7);
      const s1 = AP(1220, 120, 7);
      g.fillStyle = '#1e293b';
      g.fillRect(s0[0] - 4, s0[1] - 4, s1[0] - s0[0] + 8, s1[1] - s0[1] + 8);
      g.fillStyle = '#020409';
      g.fillRect(s0[0], s0[1], s1[0] - s0[0], s1[1] - s0[1]);
      const d0 = AP(1440, 330, 7);
      const d1 = AP(1720, 720, 7);
      g.fillStyle = '#010102';
      g.fillRect(d0[0], d0[1], d1[0] - d0[0], d1[1] - d0[1]);
      // gramado em faixas
      const zs = [1, 1.25, 1.55, 1.95, 2.45, 3.1, 3.95, 5.1, 7];
      for (let i = 0; i < zs.length - 1; i++) {
        q([AP(-1150, 720, zs[i]), AP(2430, 720, zs[i]), AP(2430, 720, zs[i + 1]), AP(-1150, 720, zs[i + 1])], i % 2 ? '#0b2314' : '#0d2818');
      }
      g.strokeStyle = 'rgba(203,213,225,0.4)';
      g.lineWidth = 2;
      line(g, AP(-1000, 720, 1), AP(-1000, 720, 7));
      line(g, AP(2280, 720, 1), AP(2280, 720, 7));
      line(g, AP(-1000, 720, 7), AP(2280, 720, 7));
      line(g, AP(-1000, 720, 2.45), AP(2280, 720, 2.45));
      g.beginPath();
      g.ellipse(640, 436, 262, 52, 0, 0, TAU);
      g.stroke();
      const b0 = AP(160, 720, 5.6);
      const b1 = AP(1120, 720, 5.6);
      g.beginPath();
      g.moveTo(AP(160, 720, 7)[0], AP(160, 720, 7)[1]);
      g.lineTo(b0[0], b0[1]);
      g.lineTo(b1[0], b1[1]);
      g.lineTo(AP(1120, 720, 7)[0], AP(1120, 720, 7)[1]);
      g.stroke();
      // os refletores apagados (carcaças)
      RIGS.forEach(([x, y, rw]) => {
        g.strokeStyle = '#0b1220';
        g.lineWidth = 3;
        line(g, [x, 0], [x, y - rw * 0.2]);
        g.fillStyle = '#0b1220';
        g.fillRect(x - rw / 2 - 4, y - rw * 0.22 - 4, rw + 8, rw * 0.44 + 8);
        g.fillStyle = '#141d30';
        for (let r = 0; r < 2; r++) for (let cc = 0; cc < 4; cc++) g.fillRect(x - rw / 2 + 3 + cc * (rw / 4), y - rw * 0.2 + r * (rw * 0.21), rw / 4 - 6, rw * 0.17);
      });
    },
    // Luz da arena: lv[i] 0..1 por refletor. Lâmpadas, feixes, poças no gramado, ambiente
    wcdArenaLights(ctx, t, lv, flick = []) {
      let sum = 0;
      RIGS.forEach(([x, y, rw], i) => {
        const L = lv[i] || 0;
        const lamp = flick[i] ?? L;
        sum += L;
        if (lamp > 0) {
          ctx.save();
          ctx.globalAlpha = lamp;
          ctx.fillStyle = '#fffbeb';
          for (let r = 0; r < 2; r++) for (let cc = 0; cc < 4; cc++) ctx.fillRect(x - rw / 2 + 3 + cc * (rw / 4), y - rw * 0.2 + r * (rw * 0.21), rw / 4 - 6, rw * 0.17);
          ctx.restore();
          this.cineGlow(ctx, x, y, rw * 1.3, 'rgba(255,250,235,0.75)', lamp);
        }
        if (L > 0) {
          const [px, py, pr] = POOLS[i];
          const ang = Math.atan2(py - y, px - x);
          this.cineShafts(ctx, x, y + rw * 0.2, ang, Math.hypot(px - x, py - y) * 1.1, 0.34, 3, '226,240,255', 0.06 * L, t + i * 30);
          ctx.save();
          ctx.translate(px, py);
          ctx.scale(1, 0.28);
          this.cineGlow(ctx, 0, 0, pr, 'rgba(190,235,205,0.55)', L * 0.85);
          ctx.restore();
        }
      });
      const amb = sum / 6;
      if (amb > 0) {
        ctx.save();
        ctx.translate(640, 520);
        ctx.scale(1, 0.4);
        this.cineGlow(ctx, 0, 0, 760, 'rgba(110,170,130,0.35)', amb);
        ctx.restore();
        this.cineGlow(ctx, 120, 260, 420, 'rgba(147,197,253,0.14)', amb);
        this.cineGlow(ctx, 1160, 260, 420, 'rgba(147,197,253,0.14)', amb);
      }
      return amb;
    },

    // A parede do fundo da arena de perto (com a porta preta)
    wcdEndBg(g, w, h) {
      const A = END_A;
      this.cineGradient(g, 0, 0, w, 560, [[0, '#04060c'], [1, '#0a0e18']]);
      g.strokeStyle = 'rgba(2,4,8,0.7)';
      g.lineWidth = 3;
      for (let x = 0; x < w; x += 160) line(g, [x, 90], [x, 560]);
      line(g, [0, 180], [w, 180]);
      g.fillStyle = 'rgba(56,189,248,0.35)';
      g.fillRect(0, 470, w, 3);
      if (this.bgblLock) {
        g.save();
        g.translate(1010, 300);
        this.bgblLock(g, 110, [56, 189, 248], 'neon', 0.18);
        g.restore();
        g.save();
        g.translate(270, 300);
        this.bgblLock(g, 110, [56, 189, 248], 'neon', 0.18);
        g.restore();
      }
      g.fillStyle = '#020203';
      g.fillRect(A.x0 - 20, A.y0 - 18, A.x1 - A.x0 + 40, A.y1 - A.y0 + 18);
      this.wcdLeaf(g, A.x0, A.y0, A.mid - A.x0, A.y1 - A.y0, -1);
      this.wcdLeaf(g, A.mid, A.y0, A.x1 - A.mid, A.y1 - A.y0, 1);
      g.font = '900 13px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#7f1d1d';
      g.fillText('W I L D   C A R D', A.mid, A.y0 + 30);
      // gramado em perspectiva até a linha de fundo
      const zs = [1, 1.07, 1.15, 1.25, 1.37, 1.5];
      for (let i = 0; i < zs.length - 1; i++) {
        const y0 = 240 + 480 / zs[i + 1];
        const y1 = 240 + 480 / zs[i];
        g.fillStyle = i % 2 ? '#0a2012' : '#0c2415';
        g.fillRect(0, y0, w, y1 - y0 + 1);
      }
      g.fillStyle = '#05070b';
      g.fillRect(0, 556, w, 5);
      g.fillStyle = 'rgba(203,213,225,0.35)';
      g.fillRect(0, 574, w, 3);
    }
  });

  // ==========================================================================
  // 1. A PORTA (a noite da eliminação)
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — o corredor branco: ele anda com a mala, o telão lá no fim
    wcdDoor0(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.wcdCast();
      const k = easeIO(t / 290);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(368, 334, k), zoom: lerp(1.0, 1.16, k), shake: 0.6 });
      ctx.drawImage(this.finBg('wcd_corr', 1280, 720, this.wcdCorrBg), 0, 0);
      const [sx0, sy0] = CP(240, 40, CZF);
      const [sx1, sy1] = CP(1040, 370, CZF);
      this.wcdElimScreen(ctx, sx0, sy0, sx1 - sx0, sy1 - sy0, t);
      ctx.save();
      ctx.translate(640, 470);
      ctx.scale(1.7, 0.36);
      this.cineGlow(ctx, 0, 0, 240, 'rgba(239,68,68,0.32)');
      ctx.restore();
      const z = lerp(1.14, 2.0, t / 300);
      const [fx, fy] = CP(430, 720, z);
      const size = 440 / z;
      const fr = WALKF(S.f, 5);
      ctx.fillStyle = 'rgba(2,4,8,0.45)';
      ctx.beginPath();
      ctx.ellipse(fx, fy, size * 0.3, size * 0.05, 0, 0, TAU);
      ctx.fill();
      this.wcdRim(ctx, c.kuni, fx, fy, size, { facing: 'back', animState: 'run', frame: fr, dim: 0.25, dimTint: '8,12,24' }, '#fca5a5', [-1, 1], 1);
      this.wcdBag(ctx, fx, fy, size, fr);
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'BLUE LOCK • ALA DOS ELIMINADOS • 02:14', seg(t, 8, 50));
      this.finKicker(ctx, 40, top + 58, 'FIM DA SEGUNDA SELEÇÃO', seg(t, 40, 90), '#ef4444');
    },

    // PLANO 2 — o rosto na luz vermelha → a memória do menino que queria ser herói
    wcdDoor1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      const k = easeIO(t / 360);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.75;
      ctx.drawImage(this.finBg('wcd_corr', 1280, 720, this.wcdCorrBg), 360, 170, 560, 320, -60, -40, W + 120, H + 80);
      ctx.restore();
      ctx.fillStyle = 'rgba(6,4,10,0.5)';
      ctx.fillRect(0, 0, W, H);
      this.cineBokeh(ctx, W, top + 20, bot - 120, t, 10, ['rgba(248,113,113,0.3)', 'rgba(219,234,254,0.22)'], 7);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 + this.cineNoise(t * 0.5, 2) * 4, y: 360 + this.cineNoise(t * 0.5, 5) * 3, zoom: lerp(1, 1.06, k) });
      const x = 450;
      const eyeY = 352;
      const r = this.finHead(ctx, c.kuni, x, eyeY, 860, { dim: 0.3, dimTint: '70,8,8', rim: '#fca5a5', rimSides: [1], rimD: 2 });
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.foxcGradH(ctx, x - 14 * r.u, top, 28 * r.u, bot - top, [[0, 'rgba(239,68,68,0)'], [0.6, 'rgba(239,68,68,0.09)'], [1, 'rgba(239,68,68,0.18)']]);
      const by = top + ((t * 1.4) % (bot - top + 200)) - 100;
      const bg = ctx.createLinearGradient(0, by - 40, 0, by + 40);
      bg.addColorStop(0, 'rgba(248,113,113,0)');
      bg.addColorStop(0.5, 'rgba(248,113,113,0.12)');
      bg.addColorStop(1, 'rgba(248,113,113,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(x - 15 * r.u, by - 40, 30 * r.u, 80);
      ctx.restore();
      const down = seg(t, 70, 100);
      this.wcdEyes(ctx, x, eyeY, r.u, {
        ring: '#f59e0b', iris: '#7c2d12', half: down >= 1, lid: '#9c7565',
        glow: 'rgba(249,115,22,0.3)', glowA: 1 - down * 0.6, reflect: down < 1 ? '#ef4444' : null
      });
      ctx.restore();
      this.rincStamp(ctx, 'ELIMINADO.', 960, top + 120, 74, '#fecaca', t, 14, 3, 520, 'center', 1 - seg(t, 118, 134));
      const km = ease(seg(t, 130, 150));
      if (km > 0) {
        const pts = [[700, top + 22], [W - 26, top + 14], [W - 26, bot - 20], [672, bot - 12]];
        this.finPanel(ctx, pts, () => this.wcdKidMemory(ctx, 660, top, W - 660, bot - top, t - 130, seg(t, 290, 345)), { dx: (1 - km) * 620 });
      }
      this.cineSfx(S, 130, 'memoria', () => window.SFX?.whoosh?.());
    },
    wcdKidMemory(ctx, x0, y0, w, h, lt, desat) {
      const c = this.wcdCast();
      this.cineGradient(ctx, x0, y0, w, h, [[0, '#fde68a'], [0.45, '#fb923c'], [1, '#9f1239']]);
      const sx = x0 + w * 0.66;
      const sy = y0 + h * 0.5;
      this.cineGlow(ctx, sx, sy, 230, 'rgba(255,247,237,0.7)');
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.arc(sx, sy, 62, 0, TAU);
      ctx.fill();
      this.drawRadialSpeedLines(ctx, x0 + w * 0.45, y0 + h * 0.6, 900, '#fff7ed', 0.2);
      for (let i = 0; i < 12; i++) {
        const bw = 26 + rnd(i, 3) * 40;
        const bh = 40 + rnd(i, 4) * 110;
        ctx.fillStyle = '#7f1d3a';
        ctx.fillRect(x0 + i * 52 - 10, y0 + h - 70 - bh, bw, bh + 80);
      }
      ctx.fillStyle = '#2a0a12';
      ctx.beginPath();
      ctx.ellipse(x0 + w * 0.45, y0 + h + 30, w * 0.7, 110, 0, 0, TAU);
      ctx.fill();
      const kx = x0 + w * 0.45;
      const kf = y0 + h - 30;
      const ks = 290;
      this.wcdCape(ctx, kx, kf, ks);
      this.finSpr(ctx, c.kid, kx, kf, ks, { animState: 'call_pass', frame: 1 });
      this.finFillPat(ctx, 'dots', x0, y0, w, h, 0.22);
      this.finKicker(ctx, x0 + 64, y0 + 40, 'DEZ ANOS ATRÁS', seg(lt, 6, 40), '#fde68a');
      this.rincStamp(ctx, '"EU VOU SER UM HERÓI!"', x0 + w / 2, y0 + 92, 36, '#fff7ed', lt, 24, 2, w * 0.86);
      if (desat > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'saturation';
        ctx.globalAlpha = desat;
        ctx.fillStyle = '#777777';
        ctx.fillRect(x0, y0, w, h);
        ctx.restore();
        ctx.fillStyle = `rgba(8,8,12,${0.4 * desat})`;
        ctx.fillRect(x0, y0, w, h);
      }
    },

    // PLANO 3 — as duas portas: a SAÍDA verde e a porta preta do WILD CARD
    wcdDoor2(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.wcdCast();
      const k = easeIO(t / 300);
      const talk = seg(t, 48, 58) * (1 - seg(t, 262, 280));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(560, 724, k), y: 376, zoom: lerp(1.06, 1.15, k), shake: 0.5 });
      this.wcdDoorScene(ctx, t, { talk });
      ctx.fillStyle = 'rgba(2,4,8,0.5)';
      ctx.beginPath();
      ctx.ellipse(640, 612, 80, 12, 0, 0, TAU);
      ctx.fill();
      this.wcdRim2(ctx, c.kuni, 640, 612, 250, { facing: 'back', dim: 0.32, dimTint: '8,12,24' }, '#86efac', '#fb923c', 2);
      this.wcdBag(ctx, 640, 612, 250);
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'O FIM DO CORREDOR', seg(t, 6, 40));
      this.finKicker(ctx, 40, top + 58, 'DUAS PORTAS', seg(t, 30, 70), '#fb923c');
      this.cineSfx(S, 48, 'falante', () => window.SFX?.blip?.(160));
    },

    // PLANO 4 — a luz dividida no rosto (verde x vermelho), a mão agarrando o peito
    wcdDoor3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      ctx.fillStyle = '#030406';
      ctx.fillRect(0, 0, W, H);
      this.cineGlow(ctx, 110, 330, 400, 'rgba(34,197,94,0.32)');
      this.cineGlow(ctx, 1170, 330, 440, 'rgba(234,88,12,0.4)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.foxcGradH(ctx, 1120, top, 70, bot - top, [[0, 'rgba(253,186,116,0)'], [0.5, 'rgba(253,186,116,0.22)'], [1, 'rgba(253,186,116,0)']]);
      ctx.restore();
      const k = easeIO(t / 300);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 + this.cineNoise(t * 0.5, 1) * 3, y: 360 + this.cineNoise(t * 0.5, 7) * 2, zoom: lerp(1, 1.07, k) });
      const x = 640;
      const eyeY = 352;
      const size = 880;
      const u = size / 36;
      const feet = eyeY - 10.1 * u + size * 0.87;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-400, -400, x + 400, H + 800);
      ctx.clip();
      this.wcdRim(ctx, c.kuni, x, feet, size, { dim: 0.42, dimTint: '2,34,14' }, '#86efac', [-1], 2);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, -400, W + 400, H + 800);
      ctx.clip();
      this.wcdRim(ctx, c.kuni, x, feet, size, { dim: 0.42, dimTint: '48,6,2' }, '#fdba74', [1], 2);
      ctx.restore();
      const look = t < 30 ? 0 : t < 105 ? -1 : t < 205 ? 1 : 0;
      this.wcdEyes(ctx, x, eyeY, u, { ring: '#f59e0b', iris: '#7c2d12', look, angry: t > 215, glow: 'rgba(249,115,22,0.25)', glowA: seg(t, 205, 240) });
      // gota de suor na têmpora
      const dy = ease(seg(t, 40, 130)) * 3.4 * u;
      ctx.fillStyle = 'rgba(186,230,253,0.85)';
      ctx.fillRect(Math.round(x - 7.6 * u), Math.round(eyeY - 2 * u + dy), Math.ceil(u * 0.5), Math.ceil(u * 0.8));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x - 7.6 * u), Math.round(eyeY - 2 * u + dy), Math.ceil(u * 0.2), Math.ceil(u * 0.2));
      ctx.restore();
      // o punho no peito (painel)
      const kp = ease(seg(t, 118, 136));
      if (kp > 0) {
        const beat = [146, 168, 226, 248].reduce((m, b) => Math.max(m, t >= b ? 1 - seg(t, b, b + 10) : 0), 0);
        this.finPanel(ctx, [[34, bot - 236], [478, bot - 250], [494, bot - 18], [26, bot - 12]], () => {
          const s = 10.4 * (1 + beat * 0.03);
          const cv = this.wcdFistPanelCv();
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(cv, 262 - cv.width * s / 2, bot - 134 - cv.height * s / 2, cv.width * s, cv.height * s);
          ctx.restore();
          ctx.fillStyle = 'rgba(40,6,2,0.18)';
          ctx.fillRect(0, bot - 260, 520, 260);
        }, { dy: (1 - kp) * 300 });
        [146, 168, 226, 248].forEach((b, i) => {
          if (t >= b && t < b + 40) this.rincStamp(ctx, 'TUM', 560 + (i % 2) * 130, bot - 206 + (i % 2) * 60, 40, '#fecaca', t, b, 2, 0, 'center', 1 - seg(t, b + 24, b + 40));
        });
      }
      [146, 168, 226, 248].forEach((b, i) => this.cineSfx(S, b, 'tum' + i, () => window.SFX?.kick?.(0.15)));
    },

    // PLANO 5 — ele entra na porta preta; a porta se fecha. WILD CARD.
    wcdDoor4(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.wcdCast();
      const open = ease(seg(t, 46, 96)) * (1 - seg(t, 196, 206));
      const shut = t >= 206;
      const shake = 0.6 + (t >= 46 && t < 96 ? 2 * (1 - seg(t, 46, 96)) : 0) + (shut ? 9 * (1 - seg(t, 206, 236)) : 0);
      const kc = easeIO(seg(t, 0, 200));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(700, 860, kc), y: lerp(384, 372, kc), zoom: lerp(1.12, 1.3, kc), shake });
      let kx;
      let kf;
      let ks;
      let ka = 1;
      if (t < 140) {
        const e = easeIO(seg(t, 0, 140));
        kx = lerp(640, 906, e);
        kf = lerp(612, 566, e);
        ks = lerp(250, 214, e);
      } else {
        const e = seg(t, 140, 192);
        kx = lerp(906, 918, e);
        kf = lerp(566, 520, e);
        ks = lerp(214, 160, e);
        ka = 1 - seg(t, 186, 196);
      }
      const sil = open > 0.05;
      const fr = WALKF(S.f, 5);
      const o = { facing: 'back', animState: 'run', frame: fr, dim: 0.25, dimTint: '8,12,24' };
      const drawK = () => {
        if (ka <= 0) return;
        ctx.save();
        ctx.globalAlpha = ka;
        this.wcdRim(ctx, c.kuni, kx, kf, ks, o, '#fca5a5', [-1, 1], 1);
        // contra a luz: o mesmo boneco coberto pela silhueta escura (a borda de luz fica)
        if (sil) this.finSpr(ctx, c.kuni, kx, kf, ks, Object.assign({}, o, { tint: '#0c0404', dim: 0, alpha: 0.86 }));
        this.wcdBag(ctx, kx, kf, ks, fr, sil);
        ctx.restore();
        // a luz lá de dentro engole a silhueta aos poucos
        if (t >= 140) this.cineGlow(ctx, kx, kf - ks * 0.45, ks * 1.2, 'rgba(255,237,213,0.9)', seg(t, 150, 192));
      };
      this.wcdDoorScene(ctx, t, { open, dark: shut ? 1 : 0, inside: t >= 140 ? drawK : null });
      if (t < 140) {
        ctx.fillStyle = 'rgba(2,4,8,0.45)';
        ctx.beginPath();
        ctx.ellipse(kx, kf, ks * 0.3, ks * 0.05, 0, 0, TAU);
        ctx.fill();
        drawK();
      }
      ctx.restore();
      if (t >= 46) this.cineFlash(ctx, W, H, 0.32 * (1 - seg(t, 46, 62)), '#fed7aa');
      this.cineTitleCard(ctx, W, (top + S.bot) / 2 - 30, seg(t, 236, 268), { kicker: 'UMA SEGUNDA CHANCE • UM PREÇO', title: 'WILD CARD', sub: 'O que acontece lá dentro, ninguém sabe.', color: '#f97316' });
      this.cineSfx(S, 46, 'abre', () => window.SFX?.whoosh?.());
      this.cineSfx(S, 206, 'fecha', () => {
        window.SFX?.kick?.(1);
        window.SFX?.tackle?.();
      });
    }
  });

  // ==========================================================================
  // 2. O INFERNO (dentro do Wild Card)
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — o subsolo: a câmera desce da lente no teto até ele na plataforma
    wcdHell0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      const k = easeIO(t / 300);
      const talk = seg(t, 60, 70) * (1 - seg(t, 220, 236));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(112, 378, k), zoom: lerp(1.34, 1.0, k), shake: 0.5 });
      // o teto continua acima do cenário (a câmera começa olhando para cima)
      this.cineGradient(ctx, -200, -400, 1680, 402, [[0, '#060407'], [1, '#171115']]);
      ctx.fillStyle = '#050405';
      ctx.fillRect(634, -400, 12, 402);
      this.wcdLabScene(ctx, t, talk);
      this.cineShafts(ctx, 640, 160, Math.PI / 2, 400, 0.34, 5, '253,186,116', 0.1, t);
      ctx.save();
      ctx.translate(640, 528);
      ctx.scale(1, 0.24);
      this.cineGlow(ctx, 0, 0, 200, 'rgba(253,186,116,0.5)');
      ctx.restore();
      this.wcdRim(ctx, c.wild, 640, 528, 190, {}, '#fdba74', [-1, 1], 2);
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'LOCAL: NÃO REGISTRADO • -80 M', seg(t, 8, 50), '#ef4444');
      this.finKicker(ctx, 40, top + 58, 'PROGRAMA WILD CARD • DIA 1', seg(t, 36, 86), '#fb923c');
      this.wcdVoiceHud(ctx, W - 340, bot - 92, t, talk);
      this.cineSfx(S, 60, 'voz', () => window.SFX?.blip?.(120));
    },

    // PLANO 2 — o escaneamento: o laser descendo pelo corpo, os dados do lado
    wcdHell1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      const k = easeIO(t / 330);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.finBg('wcd_lab', 1280, 720, this.wcdLabBg), 360, 150, 560, 330, -40, -20, W + 80, H + 40);
      ctx.restore();
      ctx.fillStyle = 'rgba(5,3,4,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1, 1.06, k), shake: 0.4 });
      const x = 500;
      const feet = bot - 14;
      const size = 470;
      const u = size / 36;
      const sTop = feet - size * 0.87;
      // o anel do scanner (chão e teto) e os postes
      ctx.strokeStyle = 'rgba(249,115,22,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, feet - 6, 220, 34, 0, 0, TAU);
      ctx.stroke();
      [x - 250, x + 250].forEach((px) => {
        ctx.fillStyle = '#0d090a';
        ctx.fillRect(px - 12, top - 10, 24, feet - top + 10);
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = (Math.floor(t / 6) + i) % 7 === 0 ? '#fdba74' : '#7c2d12';
          ctx.fillRect(px - 4, top + 20 + i * 34, 8, 18);
        }
      });
      this.wcdRim(ctx, c.wild, x, feet, size, {}, '#fdba74', [-1, 1], 1);
      // o laser: duas passadas de cima para baixo
      const pass = (t % 165) / 165;
      const ly = lerp(sTop - 30, feet + 10, pass);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, ly - 26, W, 52);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55;
      this.finSpr(ctx, c.wild, x, feet, size, { tint: '#fb923c' });
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(254,215,170,0.95)';
      ctx.fillRect(x - 250, ly - 1, 500, 3);
      const lg = ctx.createLinearGradient(0, ly - 60, 0, ly);
      lg.addColorStop(0, 'rgba(249,115,22,0)');
      lg.addColorStop(1, 'rgba(249,115,22,0.22)');
      ctx.fillStyle = lg;
      ctx.fillRect(x - 250, ly - 60, 500, 60);
      ctx.restore();
      // marcadores em pixel na cabeça, no peito e na perna esquerda
      const marks = [[x, sTop + 9.6 * u, 'CABEÇA', 40], [x - 1.5 * u, sTop + 16.5 * u, 'CORAÇÃO', 80], [x + 3.2 * u, sTop + 28 * u, 'PERNA ESQ.', 120]];
      marks.forEach(([mx, my, lab, at]) => {
        const a = ease(seg(t, at, at + 14));
        if (a <= 0) return;
        const r = lerp(70, 30, a);
        ctx.strokeStyle = lab === 'CORAÇÃO' || lab === 'PERNA ESQ.' ? '#ef4444' : '#fdba74';
        ctx.lineWidth = 3;
        ctx.beginPath();
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
          ctx.moveTo(mx + sx * r, my + sy * r - sy * 12);
          ctx.lineTo(mx + sx * r, my + sy * r);
          ctx.lineTo(mx + sx * r - sx * 12, my + sy * r);
        });
        ctx.stroke();
        ctx.globalAlpha = a;
        ctx.lineWidth = 1.5;
        line(ctx, [mx + r, my], [830, my]);
        ctx.font = '900 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(lab, mx + r + 8, my - 8);
        ctx.globalAlpha = 1;
      });
      ctx.restore();
      // painel de dados
      const px0 = 846;
      const py0 = top + 24;
      ctx.fillStyle = 'rgba(14,6,4,0.86)';
      ctx.fillRect(px0, py0, 400, bot - top - 48);
      ctx.strokeStyle = 'rgba(249,115,22,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(px0, py0, 400, bot - top - 48);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(px0, py0, 400, 4);
      this.finKicker(ctx, px0 + 18, py0 + 30, 'BIOMETRIA • INDIVÍDUO 50', seg(t, 6, 40), '#fb923c');
      const rows = [
        ['ALTURA', '1,88 M', 0.7, '#fdba74'],
        ['VELOCIDADE MÁX.', '33,9 KM/H', 0.78, '#fdba74'],
        ['PERNA DIREITA', '91%', 0.91, '#fdba74'],
        ['PERNA ESQUERDA', '41% • FRACA', 0.41, '#ef4444'],
        ['EMOÇÃO', 'INSTÁVEL', 0.95, '#ef4444']
      ];
      rows.forEach(([lab, val, v, col], i) => {
        const at = 40 + i * 30;
        const a = seg(t, at, at + 20);
        if (a <= 0) return;
        const y = py0 + 76 + i * 62;
        ctx.font = '800 14px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(253,186,116,0.75)';
        ctx.fillText(this.cineType(lab, a * 1.4), px0 + 20, y);
        ctx.textAlign = 'right';
        ctx.font = '900 16px monospace';
        ctx.fillStyle = col;
        const blink = col === '#ef4444' && t > at + 30 && Math.floor(t / 16) % 2 === 0 ? 0.45 : 1;
        ctx.globalAlpha = seg(t, at + 8, at + 20) * blink;
        ctx.fillText(val, px0 + 380, y);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(253,186,116,0.15)';
        ctx.fillRect(px0 + 20, y + 16, 360, 8);
        const jit = lab === 'EMOÇÃO' ? Math.sin(t * 0.7) * 0.05 : 0;
        ctx.fillStyle = col;
        ctx.fillRect(px0 + 20, y + 16, 360 * (v + jit) * ease(seg(t, at + 6, at + 30)), 8);
      });
      // o coração: eletro correndo embaixo
      const ey0 = bot - 108;
      ctx.fillStyle = 'rgba(14,6,4,0.86)';
      ctx.fillRect(40, ey0, 330, 80);
      ctx.strokeStyle = 'rgba(239,68,68,0.6)';
      ctx.strokeRect(40, ey0, 330, 80);
      ctx.font = '900 13px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText('BPM  ' + (146 + Math.round(Math.sin(t * 0.1) * 3)), 54, ey0 + 18);
      ctx.save();
      ctx.beginPath();
      ctx.rect(42, ey0 + 2, 326, 76);
      ctx.clip();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 160; i++) {
        const xx = 42 + i * 2.05;
        const ph = (i * 2 + t * 2.2) % 70;
        const yy = ey0 + 50 - (ph > 30 && ph < 34 ? (ph - 30) * 9 : ph >= 34 && ph < 38 ? (38 - ph) * 9 - 14 : 0);
        if (i) ctx.lineTo(xx, yy);
        else ctx.moveTo(xx, yy);
      }
      ctx.stroke();
      ctx.restore();
      this.cineSfx(S, 30, 'scan', () => window.SFX?.whoosh?.());
    },

    // PLANO 3 — DIA 1... DIA 47: página de mangá (o tombo, o suor, a perna esquerda)
    wcdHell2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      ctx.fillStyle = '#070405';
      ctx.fillRect(0, 0, W, H);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      const mid = 362;
      // A: o carrinho do holograma e o tombo
      const kA = ease(seg(t, 0, 16));
      this.finPanel(ctx, [[20, top + 14], [760, top + 14], [730, mid - 8], [20, mid]], () => {
        const lt = t;
        this.cineGradient(ctx, 0, top, 780, mid - top, [[0, '#120a0b'], [1, '#1f0f0a']]);
        ctx.strokeStyle = 'rgba(234,88,12,0.25)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) line(ctx, [i * 80 - 60, mid], [i * 80 + 40, top + 150]);
        line(ctx, [0, mid - 40], [780, mid - 40]);
        const feet = mid - 40;
        const hit = 52;
        const hx = lerp(820, 420, seg(lt, 10, hit));
        this.wcdHolo(ctx, hx, feet, 210, { animState: 'run', flipX: true }, 1, 0, lt);
        if (lt < hit) {
          this.wcdRim(ctx, c.wild, lerp(120, 360, seg(lt, 0, hit)), feet, 200, { animState: 'run', frame: RUNF(S.f) }, '#fdba74', [-1, 1], 2);
        } else {
          const u2 = lt - hit;
          const fall = ease(seg(u2, 0, 18));
          ctx.save();
          ctx.translate(lerp(380, 300, fall), feet - lerp(70, 18, fall));
          ctx.rotate(-lerp(0.3, 1.45, fall));
          this.wcdRim(ctx, c.wild, 0, 90, 200, {}, '#fdba74', [-1, 1], 2);
          ctx.restore();
          this.cineImpactText(ctx, 'TUM!', 520, top + 90, 64, '#fdba74', seg(u2, 0, 8), 0, -0.12);
          ctx.fillStyle = `rgba(214,190,170,${0.6 * (1 - seg(u2, 0, 40))})`;
          for (let i = 0; i < 10; i++) ctx.fillRect(300 + (rnd(i, 2) - 0.5) * 160 * (0.4 + seg(u2, 0, 30)), feet - 6 - rnd(i, 3) * 30 * seg(u2, 0, 30), 8, 8);
        }
      }, { dx: (1 - kA) * -800 });
      // B: o rosto pingando de suor — "DE NOVO."
      const kB = ease(seg(t, 110, 126));
      if (kB > 0) {
        this.finPanel(ctx, [[20, mid + 12], [716, mid + 4], [700, bot - 14], [20, bot - 14]], () => {
          const lt = t - 110;
          this.cineGradient(ctx, 0, mid, 720, bot - mid, [[0, '#1a0c08'], [1, '#080405']]);
          this.cineGlow(ctx, 360, mid + 60, 300, 'rgba(249,115,22,0.18)');
          const r = this.finHead(ctx, c.wild, 330, mid + 150, 620, { rim: '#fdba74' });
          this.wcdEyes(ctx, 330, mid + 150, r.u, { ring: '#f59e0b', iris: '#7c2d12', angry: true, glow: 'rgba(249,115,22,0.25)' });
          this.rincDrops(ctx, [330 - 8.6 * r.u, 330 + 8.4 * r.u, 330 - 6.4 * r.u, 330 + 5.8 * r.u], mid + 110, bot + 20, lt, r.u * 0.45, 4);
          this.rincStamp(ctx, '"DE NOVO."', 560, mid + 56, 40, '#ef4444', lt, 26, 3, 0, 'center');
        }, { dy: (1 - kB) * 300 });
      }
      // C: a perna esquerda, chute no gol holográfico
      const kC = ease(seg(t, 200, 216));
      if (kC > 0) {
        this.finPanel(ctx, [[776, top + 14], [W - 20, top + 14], [W - 20, bot - 14], [740, bot - 14]], () => {
          const lt = t - 200;
          this.cineGradient(ctx, 720, top, 560, bot - top, [[0, '#0f0708'], [1, '#22100a']]);
          this.drawRadialSpeedLines(ctx, 1010, 330, 700, '#fdba74', 0.16);
          const gx = 1150;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(249,115,22,0.8)';
          ctx.lineWidth = 3;
          ctx.strokeRect(gx - 70, top + 70, 140, 130);
          ctx.strokeStyle = 'rgba(249,115,22,0.25)';
          ctx.lineWidth = 1;
          for (let i = 1; i < 7; i++) line(ctx, [gx - 70 + i * 20, top + 70], [gx - 70 + i * 20, top + 200]);
          for (let i = 1; i < 6; i++) line(ctx, [gx - 70, top + 70 + i * 22], [gx + 70, top + 70 + i * 22]);
          ctx.restore();
          const shot = 40;
          const st = lt < shot - 12 ? 'idle' : lt < shot ? 'windup' : 'shoot';
          this.wcdRim(ctx, c.wild, 930, bot - 40, 360, { animState: st, frame: 1, flipX: true }, '#fdba74', [-1, 1], 1);
          if (lt >= shot) {
            const bp = seg(lt, shot, shot + 14);
            const bx = lerp(880, gx, bp);
            const byy = lerp(bot - 70, top + 130, bp);
            ctx.strokeStyle = 'rgba(253,186,116,0.6)';
            ctx.lineWidth = 6;
            line(ctx, [lerp(880, gx, Math.max(0, bp - 0.35)), lerp(bot - 70, top + 130, Math.max(0, bp - 0.35))], [bx, byy]);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(Math.round(bx - 10), Math.round(byy - 10), 20, 20);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(Math.round(bx - 4), Math.round(byy - 4), 8, 8);
            if (bp >= 1) this.cineGlow(ctx, gx, top + 130, 120, 'rgba(249,115,22,0.7)', 1 - seg(lt, shot + 14, shot + 40));
          }
          this.rincStamp(ctx, 'ESQUERDA.', 920, top + 56, 46, '#fdba74', lt, shot + 6, 3, 0, 'center');
        }, { dx: (1 - kC) * 560 });
      }
      // o contador de dias
      const day = t < 100 ? 1 : t < 190 ? 9 : t < 262 ? 23 : 47;
      const at = t < 100 ? 0 : t < 190 ? 100 : t < 262 ? 190 : 262;
      const pop = 1 - seg(t, at, at + 10);
      ctx.save();
      ctx.translate(1060, bot - 70);
      ctx.scale(1 + pop * 0.25, 1 + pop * 0.25);
      ctx.fillStyle = 'rgba(8,3,3,0.92)';
      ctx.fillRect(-170, -48, 340, 96);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 4;
      ctx.strokeRect(-170, -48, 340, 96);
      this.finPixelText(ctx, 'DIA', -96, 0, 4, '#fdba74');
      this.finPixelText(ctx, String(day).padStart(2, '0'), 58, 0, 6.4, day === 47 ? '#ef4444' : '#f8fafc');
      ctx.restore();
      [100, 190, 262].forEach((b, i) => this.cineSfx(S, b, 'dia' + i, () => window.SFX?.blip?.(300 + i * 80)));
      this.cineSfx(S, 52, 'tombo', () => window.SFX?.tackle?.());
      this.cineSfx(S, 240, 'chute', () => window.SFX?.kick?.(0.9));
    },

    // PLANO 4 — "O herói é peso morto. Apague." O olho perde a luz
    wcdHell3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      const kk = seg(t, 110, 250);
      const bx = lerp(-120, W + 120, easeIO(kk));
      ctx.fillStyle = '#050304';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      const z = 1 + easeIO(t / 330) * 0.08;
      ctx.translate(640, 360);
      ctx.scale(z, z);
      ctx.translate(-640 + this.cineNoise(t * 0.4, 3) * 2, -360);
      const U = this.wcdEyeBand(ctx, c.wild, 640, 352, 1280, {});
      // a luz vermelha da lente passando no rosto
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.foxcGradH(ctx, 0, 0, W, H, [[0, 'rgba(239,68,68,0.10)'], [0.5, 'rgba(239,68,68,0)'], [1, 'rgba(239,68,68,0.08)']]);
      ctx.restore();
      [-1, 1].forEach((s) => {
        const ex = 640 + s * 3.5 * U;
        const kE = seg(bx, ex - 60, ex + 160);
        this.wcdEye(ctx, ex, 352, U * 0.3, s, {
          ring: mixHex('#f59e0b', '#78716c', kE), iris: mixHex('#7c2d12', '#1c1917', kE),
          glow: 'rgba(249,115,22,0.35)', glowA: 1 - kE, shine: 1 - kE, reflect: '#ef4444', tiny: kE > 0.2 && kE < 0.8
        });
      });
      ctx.restore();
      // a varredura que apaga a cor
      if (kk > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, Math.max(0, bx), bot - top);
        ctx.clip();
        ctx.globalCompositeOperation = 'saturation';
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, top, W, bot - top);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(10,8,8,0.18)';
        ctx.fillRect(0, top, W, bot - top);
        ctx.restore();
        if (kk < 1) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          this.foxcGradH(ctx, bx - 90, top, 110, bot - top, [[0, 'rgba(249,115,22,0)'], [0.85, 'rgba(249,115,22,0.35)'], [1, 'rgba(255,237,213,0.9)']]);
          ctx.restore();
        }
      }
      this.rincStamp(ctx, '"O HERÓI É PESO MORTO."', 640, top + 58, 44, '#fca5a5', t, 20, 2, W * 0.8);
      this.cineImpactText(ctx, 'APAGUE.', 640, bot - 76, 104, '#ef4444', seg(t, 150, 160), W * 0.7, -0.03);
      this.cineSfx(S, 110, 'varre', () => window.SFX?.whoosh?.());
      this.cineSfx(S, 150, 'apague', () => window.SFX?.kick?.(0.8));
    },

    // PLANO 5 — dia 47: passa por três hologramas e marca. O rosto: vazio, perfeito
    wcdHell4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      const cut = 190;
      if (t < cut) {
        const kx = 120 + Math.min(t, 150) * 7.4;
        const camX = Math.min(kx - 160, 1180) + this.cineNoise(t * 0.6, 4) * 3;
        const X = (wx) => wx - camX + 640;
        // o galpão de treino visto de lado: racks acesos passando em paralaxe, faixa de luz,
        // piso que reflete, riscos de velocidade
        this.cineGradient(ctx, 0, 0, W, H, [[0, '#0a0506'], [0.62, '#1c0d08'], [1, '#0a0506']]);
        const span = 13 * 250;
        for (let i = 0; i < 13; i++) {
          const x = ((i * 250 - camX * 0.4) % span + span) % span - 300;
          ctx.fillStyle = '#120a0b';
          ctx.fillRect(x, top + 24, 160, 440);
          ctx.fillStyle = '#2a1712';
          ctx.fillRect(x, top + 24, 160, 4);
          ctx.fillRect(x, top + 24, 4, 440);
          for (let j = 0; j < 36; j++) {
            const v = rnd(i * 36 + j, 3);
            if (v < 0.45) continue;
            ctx.fillStyle = v < 0.85 ? '#f59e0b' : v < 0.95 ? '#ef4444' : '#fef3c7';
            ctx.fillRect(x + 18 + (j % 6) * 22, top + 50 + Math.floor(j / 6) * 62, 8, 6);
          }
          this.cineGlow(ctx, x + 80, top + 230, 140, 'rgba(249,115,22,0.18)');
        }
        ctx.fillStyle = 'rgba(2,1,1,0.35)';
        ctx.fillRect(0, top, W, 480);
        ctx.fillStyle = '#fdba74';
        ctx.fillRect(0, 520, W, 4);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.foxcGrad(ctx, 0, 470, W, 54, [[0, 'rgba(249,115,22,0)'], [1, 'rgba(249,115,22,0.28)']]);
        ctx.restore();
        this.cineGradient(ctx, 0, 590, W, H - 590, [[0, '#1a0d09'], [1, '#070405']]);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.foxcGrad(ctx, 0, 590, W, 40, [[0, 'rgba(253,186,116,0.22)'], [1, 'rgba(253,186,116,0)']]);
        ctx.restore();
        ctx.strokeStyle = 'rgba(234,88,12,0.3)';
        ctx.lineWidth = 2;
        for (let i = -2; i < 14; i++) {
          const x = ((i * 160 - camX) % 2240 + 2240) % 2240 - 300;
          line(ctx, [x, 590], [x - 140, H]);
        }
        line(ctx, [0, 590], [W, 590]);
        ctx.fillStyle = 'rgba(255,237,213,0.16)';
        for (let i = 0; i < 14; i++) {
          const y = top + 40 + rnd(i, 51) * 480;
          const x = ((rnd(i, 52) * 2400 - t * (30 + rnd(i, 53) * 20)) % 2400 + 2400) % 2400 - 400;
          ctx.fillRect(x, y, 140 + rnd(i, 54) * 200, 2);
        }
        ctx.save();
        ctx.translate(X(kx), 600);
        ctx.scale(1, 0.2);
        this.cineGlow(ctx, 0, 0, 220, 'rgba(253,186,116,0.45)');
        ctx.restore();
        // os três hologramas
        const holos = [[520, 'idle'], [800, 'run'], [1080, 'idle']];
        holos.forEach(([hx, st], i) => {
          const tp = (hx - 120) / 7.4;
          const sh = seg(t, tp - 2, tp + 22);
          const lunge = st === 'run' ? seg(t, tp - 18, tp) * 80 : 0;
          this.wcdHolo(ctx, X(hx - lunge), 600, 230, { animState: st, flipX: true }, 1, sh, t + i * 20);
        });
        // o gol holográfico
        const gx = X(1640);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const hitK = seg(t, 172, 190);
        ctx.strokeStyle = 'rgba(249,115,22,0.85)';
        ctx.lineWidth = 4;
        ctx.strokeRect(gx - 110, 380, 220, 210);
        ctx.strokeStyle = 'rgba(249,115,22,0.25)';
        ctx.lineWidth = 1.5;
        for (let i = 1; i < 10; i++) {
          const dx = Math.sin(i * 1.3) * 10 * hitK * (1 - hitK) * 4;
          line(ctx, [gx - 110 + i * 22 + dx, 380], [gx - 110 + i * 22 + dx, 590]);
        }
        ctx.restore();
        // ele: correndo → pulo do carrinho → chute de esquerda
        const jumpTp = (800 - 120) / 7.4;
        const jump = Math.sin(Math.PI * seg(t, jumpTp - 12, jumpTp + 10)) * 60;
        const st = t < 140 ? 'run' : t < 150 ? 'windup' : 'shoot';
        this.wcdRim(ctx, c.cold, X(kx), 600 - jump, 280, { animState: st, frame: st === 'run' ? RUNF(S.f) : 1, flipX: st !== 'run' }, '#d6c2b0', [-1, 1], 2);
        if (t >= 150) {
          const bp = seg(t, 150, 172);
          const bxx = lerp(X(kx + 30), gx - 20, bp);
          const byy = lerp(570, 470, bp) - Math.sin(Math.PI * bp) * 40;
          ctx.strokeStyle = 'rgba(214,194,176,0.6)';
          ctx.lineWidth = 8;
          line(ctx, [lerp(X(kx + 30), gx - 20, Math.max(0, bp - 0.3)), lerp(570, 470, Math.max(0, bp - 0.3))], [bxx, byy]);
          if (bp < 1) {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(Math.round(bxx - 12), Math.round(byy - 12), 24, 24);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(Math.round(bxx - 5), Math.round(byy - 5), 10, 10);
          }
          if (t >= 172) {
            this.cineGlow(ctx, gx, 470, 200, 'rgba(249,115,22,0.8)', 1 - seg(t, 172, 190));
            this.finKicker(ctx, gx - 60, 350, 'ALVO • 100%', seg(t, 172, 184), '#fdba74');
          }
        }
        this.cineSfx(S, 150, 'chute', () => window.SFX?.kick?.(1));
        this.cineSfx(S, 172, 'rede', () => window.SFX?.post?.());
        return;
      }
      // O close: o rosto vazio, a aura fria
      const u2 = t - cut;
      const k = easeIO(u2 / 170);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#060505'], [1, '#14100e']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 372, zoom: 1 + k * 0.08, shake: 0.5 });
      this.cineGlow(ctx, 640, 330, 520, 'rgba(168,146,126,0.22)');
      const size = 860;
      const eyeY = 352;
      const r = { u: size / 36 };
      const feet = eyeY - 10.1 * r.u + size * 0.87;
      this.wcdAura(ctx, 640, feet, size, t, ease(seg(u2, 0, 40)));
      this.finHead(ctx, c.cold, 640, eyeY, size, { rim: '#d6c2b0', dim: 0.12, dimTint: '20,16,14' });
      this.wcdEyes(ctx, 640, eyeY, r.u, { ring: '#78716c', iris: '#1c1917', half: true, lid: this.finShade(c.cold.skinColor, -0.2) });
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'DIA 47 • ERROS: 0 • EMOÇÃO: 0%', seg(u2, 6, 40), '#a8a29e');
      this.cineImpactText(ctx, 'PERFEITO.', 640, bot - 76, 92, '#e7e5e4', seg(u2, 50, 60), W * 0.7, -0.03);
      this.cineSfx(S, cut + 50, 'perfeito', () => window.SFX?.kick?.(0.6));
    }
  });

  // ==========================================================================
  // 3. O RETORNO (véspera da NEL)
  // ==========================================================================
  // Quando cada refletor morre (plano 1)
  const DEATHS = [92, 128, 160, 190, 218, 246];
  const lightAt = (t, d) => {
    if (t < d) return [1, 1];
    const u = t - d;
    const flick = u < 14 ? [1, 0.15, 0.9, 0, 0.5, 0, 0.2][Math.floor(u / 2)] : 0;
    return [1 - seg(u, 0, 12), flick];
  };
  Object.assign(CE, {
    // PLANO 1 — a arena: os refletores morrem um a um
    wcdRet0(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.wcdCast();
      const k = easeIO(t / 330);
      const lv = [];
      const fl = [];
      DEATHS.forEach((d) => {
        const [a, b] = lightAt(t, d);
        lv.push(a);
        fl.push(b);
      });
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(372, 390, k), zoom: lerp(1.0, 1.1, k), shake: 0.5 });
      ctx.drawImage(this.finBg('wcd_arena', 1280, 720, this.wcdArenaBg), 0, 0);
      ctx.fillStyle = `rgba(1,3,8,${0.62 * (1 - lv.reduce((a, b) => a + b, 0) / 6)})`;
      ctx.fillRect(-200, -200, 1680, 1120);
      const amb = this.wcdArenaLights(ctx, t, lv, fl);
      // luz de emergência quando tudo apaga
      this.cineGlow(ctx, 640, 300, 600, 'rgba(56,120,220,0.12)', 1 - amb);
      const ppl = [[c.bachira, 430, 2.7], [c.you, 600, 2.3], [c.chigiri, 820, 2.0]];
      ppl.forEach(([ch, wx, z], i) => {
        const [x, f] = AP(wx, 720, z);
        const s = 300 / z;
        ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.2 * amb})`;
        ctx.beginPath();
        ctx.ellipse(x, f, s * 0.28, s * 0.05, 0, 0, TAU);
        ctx.fill();
        const dark = amb < 0.5;
        this.wcdRim(ctx, ch, x, f, s, { dim: dark ? 0.62 : 0.15, dimTint: '4,10,26' }, dark ? '#93c5fd' : '#e0f2fe', [-1, 1], 1);
        const surp = seg(t, 140 + i * 8, 150 + i * 8);
        if (surp > 0) this.cineImpactText(ctx, '!?', x + s * 0.2, f - s * 1.0, 26, '#facc15', surp, 0, 0.1);
      });
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'BLUE LOCK • ARENA CENTRAL', seg(t, 6, 46));
      this.finKicker(ctx, 40, top + 58, 'VÉSPERA DA NEO EGOIST LEAGUE • 23:51', seg(t, 34, 84), '#38bdf8');
      DEATHS.forEach((d, i) => this.cineSfx(S, d, 'apaga' + i, () => window.SFX?.tackle?.()));
    },

    // PLANO 2 — no escuro, a porta preta do fundo abre; fumaça; alguém sai
    wcdRet1(ctx, S) {
      const { W, H, t, bot } = S;
      const c = this.wcdCast();
      const A = END_A;
      const k = easeIO(t / 330);
      const open = ease(seg(t, 70, 124));
      const seam = seg(t, 16, 60);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(392, 380, k), zoom: lerp(1.0, 1.16, k), shake: 0.5 });
      ctx.drawImage(this.finBg('wcd_end', 1280, 720, this.wcdEndBg), 0, 0);
      ctx.fillStyle = 'rgba(2,3,8,0.35)';
      ctx.fillRect(-200, -200, 1680, 1120);
      // ele, de frente, saindo de dentro (recortado pela porta enquanto está lá dentro)
      const wk = seg(t, 140, 330);
      const kf = lerp(520, 600, wk);
      const ks = lerp(170, 250, wk);
      const fr = WALKF(S.f, 6);
      const out = kf > A.y1 + 6;
      const o = { animState: 'run', frame: fr, dim: 0.25, dimTint: '12,10,10' };
      const drawK = () => {
        if (t < 140) return;
        ctx.save();
        ctx.globalAlpha = seg(t, 140, 170);
        this.wcdRim(ctx, c.cold, 640, kf, ks, o, '#fdba74', [-1, 1], 2);
        this.finSpr(ctx, c.cold, 640, kf, ks, Object.assign({}, o, { tint: '#0a0404', dim: 0, alpha: 0.9 }));
        ctx.restore();
      };
      this.wcdWildDoor(ctx, A, t, { open, leak: seam, inside: out ? null : drawK });
      if (out) drawK();
      this.wcdSmoke(ctx, 200, 1080, 520, 640, t, 14, 'rgba(234,120,80,0.16)', open, 9, 0.25);
      ctx.restore();
      // vocês dois em primeiro plano, de costas, recortados pela luz da porta
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.04, shake: 0.8 });
      const rim = open > 0.1 ? '#fb923c' : '#334155';
      this.wcdRim2(ctx, c.you, 200, bot + 200, 520, { facing: 'back', dim: 0.82, dimTint: '3,3,6' }, '#1e293b', rim, 4);
      this.wcdRim2(ctx, c.chigiri, 1085, bot + 190, 500, { facing: 'back', dim: 0.82, dimTint: '3,3,6' }, rim, '#1e293b', 4);
      ctx.restore();
      if (t >= 70) this.cineFlash(ctx, W, H, 0.28 * (1 - seg(t, 70, 86)), '#fed7aa');
      this.cineSfx(S, 70, 'porta', () => window.SFX?.whoosh?.());
    },

    // PLANO 3 — ele sai da fumaça, debaixo da única luz; o choque do Chigiri e o seu
    wcdRet2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      const k = easeIO(t / 330);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(this.finBg('wcd_arena', 1280, 720, this.wcdArenaBg), 300, 120, 680, 380, -60, -40, W + 120, H + 80);
      ctx.restore();
      ctx.fillStyle = 'rgba(2,3,8,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1, 1.05, k), shake: 0.6 });
      const x = 430;
      const wk = easeIO(seg(t, 0, 210));
      const feet = lerp(520, 650, wk);
      const size = lerp(300, 440, wk);
      this.cineShafts(ctx, x, top - 40, Math.PI / 2, 700, 0.5, 6, '226,232,240', 0.08, t);
      this.cineGlow(ctx, x, top, 200, 'rgba(226,232,240,0.4)');
      ctx.save();
      ctx.translate(x, feet);
      ctx.scale(1, 0.2);
      this.cineGlow(ctx, 0, 0, 240, 'rgba(226,232,240,0.35)');
      ctx.restore();
      const walking = t < 210;
      this.wcdAura(ctx, x, feet, size, t, 0.35 * seg(t, 150, 230));
      this.wcdRim(ctx, c.cold, x, feet, size, { animState: walking ? 'run' : 'idle', frame: walking ? WALKF(S.f, 6) : 45, dim: 0.25, dimTint: '12,10,10' }, '#fdba74', [-1, 1], 2);
      this.wcdSmoke(ctx, 0, 860, bot - 60, bot + 30, t, 12, 'rgba(214,194,176,0.12)', 1, 3, 0.4);
      ctx.restore();
      // o choque: Chigiri em cima, você embaixo
      const kA = ease(seg(t, 40, 56));
      if (kA > 0) {
        this.finPanel(ctx, [[792, top + 16], [W - 20, top + 16], [W - 20, 352], [812, 344]], () => {
          this.cineGradient(ctx, 780, top, 520, 280, [[0, '#2a0f1a'], [1, '#08060c']]);
          this.drawRadialSpeedLines(ctx, 1040, 230, 600, '#fecdd3', 0.16);
          const r = this.finHead(ctx, c.chigiri, 1040, 236, 560, { rim: '#fda4af' });
          this.wcdEyes(ctx, 1040, 236, r.u, { ring: c.chigiri.eyeColor, iris: this.finShade(c.chigiri.eyeColor, -0.55), tiny: true, look: Math.round(Math.sin(t * 0.4)) });
          ctx.fillStyle = 'rgba(186,230,253,0.85)';
          ctx.fillRect(Math.round(1040 + 7.6 * r.u), Math.round(236 - 1.5 * r.u + ease(seg(t, 60, 140)) * 2 * r.u), Math.ceil(r.u * 0.5), Math.ceil(r.u * 0.8));
        }, { dx: (1 - kA) * 520 });
      }
      const kB = ease(seg(t, 130, 146));
      if (kB > 0) {
        this.finPanel(ctx, [[812, 358], [W - 20, 366], [W - 20, bot - 16], [792, bot - 16]], () => {
          this.cineGradient(ctx, 780, 350, 520, 300, [[0, '#06202a'], [1, '#04070e']]);
          const r = this.finHead(ctx, c.you, 1040, 476, 560, { rim: '#67e8f9' });
          const eye = c.you.eyeColor || '#ef4444';
          this.wcdEyes(ctx, 1040, 476, r.u, { ring: eye, iris: this.finShade(eye, -0.55), tiny: true });
          this.rincStamp(ctx, '...!', 1180, 400, 34, '#e0f2fe', t, 150, 3);
        }, { dy: (1 - kB) * 300 });
      }
      this.cineSfx(S, 40, 'choque', () => window.SFX?.whoosh?.());
    },

    wcdRetEyesBg(g) {
      const c = this.wcdCast();
      g.fillStyle = '#040303';
      g.fillRect(0, 0, 1280, 720);
      const U = this.wcdEyeBand(g, c.cold, 640, 356, 1280, {});
      this.wcdEyes(g, 640, 356, U, { ring: '#78716c', iris: '#1c1917', half: true, lid: this.finShade(c.cold.skinColor, -0.2) });
    },
    // PLANO 4 — os olhos vazios: "O herói morreu naquela porta."
    wcdRet3(ctx, S) {
      const { W, H, t, top, bot } = S;
      ctx.fillStyle = '#040303';
      ctx.fillRect(0, 0, W, H);
      // o close parado fica pronto num canvas e é ampliado inteiro (sem emendas entre os pixels)
      const band = this.finBg('wcd_ret_eyes', 1280, 720, this.wcdRetEyesBg);
      ctx.save();
      const z = 1 + easeIO(t / 320) * 0.06;
      ctx.translate(640, 360);
      ctx.scale(z, z);
      ctx.translate(-640, -360);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(band, 0, 0);
      ctx.restore();
      ctx.fillStyle = 'rgba(20,16,14,0.18)';
      ctx.fillRect(0, top, W, bot - top);
      this.wcdSmoke(ctx, -100, W + 100, top + 40, bot - 40, t, 7, 'rgba(168,146,126,0.10)', 1, 6, 1.4);
      this.rincStamp(ctx, '"O HERÓI MORREU NAQUELA PORTA."', 640, bot - 60, 44, '#e7e5e4', t, 40, 2, W * 0.86);
    },

    // PLANO 5 — de baixo: a aura fria subindo. O RETORNO DO CORINGA
    wcdRet4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      const k = easeIO(t / 340);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#030409'], [0.6, '#080a12'], [1, '#100c0a']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(390, 370, k), zoom: lerp(1, 1.1, k), rot: -0.02 * k, shake: 0.6 });
      // o teto da arena visto de baixo: treliças e refletores mortos
      ctx.strokeStyle = 'rgba(30,41,59,0.7)';
      ctx.lineWidth = 3;
      for (let i = -8; i <= 8; i++) line(ctx, [640 + i * 40, 250], [640 + i * 260, -200]);
      [60, 130, 190].forEach((y) => line(ctx, [-200, y], [1480, y]));
      [[220, 90], [460, 150], [820, 150], [1060, 90]].forEach(([x, y]) => {
        ctx.fillStyle = '#0b1220';
        ctx.fillRect(x - 60, y - 20, 120, 40);
        ctx.fillStyle = '#151e30';
        for (let i = 0; i < 4; i++) ctx.fillRect(x - 54 + i * 28, y - 14, 22, 28);
      });
      this.cineGlow(ctx, 640, top - 20, 260, 'rgba(226,232,240,0.45)');
      this.cineShafts(ctx, 640, top - 30, Math.PI / 2, 760, 0.4, 5, '226,232,240', 0.07, t);
      const feet = bot + 60;
      const size = 580;
      this.wcdAura(ctx, 640, feet, size, t, ease(seg(t, 10, 80)));
      this.wcdRim(ctx, c.cold, 640, feet, size, { dim: 0.22, dimTint: '14,12,12' }, '#d6c2b0', [-1, 1], 1);
      const r = { u: size / 36 };
      const eyeY = feet - size * 0.87 + 10.1 * r.u;
      this.wcdEyes(ctx, 640, eyeY, r.u, { ring: '#78716c', iris: '#1c1917', half: true, lid: this.finShade(c.cold.skinColor, -0.2) });
      this.wcdSmoke(ctx, 0, W, bot - 40, bot + 40, t, 12, 'rgba(214,194,176,0.13)', 1, 8, 0.5);
      ctx.restore();
      // letreiro embaixo, numa faixa escura
      const tk = seg(t, 150, 186);
      if (tk > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, tk * 2);
        const g = ctx.createLinearGradient(0, bot - 240, 0, bot);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = g;
        ctx.fillRect(0, bot - 240, W, 240);
        ctx.restore();
      }
      this.cineTitleCard(ctx, W, bot - 112, tk, { kicker: 'NEO EGOIST LEAGUE', title: 'O RETORNO DO CORINGA', sub: '', color: '#c2410c' });
      this.cineSfx(S, 150, 'titulo', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 4. O VEREDITO (depois do jogo contra ele)
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — o estádio vazio, duas luzes acesas, ele sozinho no meio
    wcdVer0(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.wcdCast();
      const k = easeIO(t / 300);
      const [x, f] = AP(640, 720, 2.45);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, x, k), y: lerp(372, f - 70, k), zoom: lerp(1.0, 1.4, k), shake: 0.5 });
      ctx.drawImage(this.finBg('wcd_arena', 1280, 720, this.wcdArenaBg), 0, 0);
      this.wcdArenaLights(ctx, t, [0, 0.8, 0, 0, 0.8, 0]);
      ctx.fillStyle = 'rgba(2,4,10,0.3)';
      ctx.fillRect(-200, -200, 1680, 1120);
      const s0 = AP(60, -420, 7);
      const s1 = AP(1220, 120, 7);
      this.finPixelText(ctx, 'FIM DE JOGO', (s0[0] + s1[0]) / 2, (s0[1] + s1[1]) / 2, 1.3, '#38bdf8', 'center', s1[0] - s0[0] - 12);
      this.cineGlow(ctx, (s0[0] + s1[0]) / 2, (s0[1] + s1[1]) / 2, 120, 'rgba(56,189,248,0.25)');
      const s = 300 / 2.45;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(x, f, s * 0.28, s * 0.05, 0, 0, TAU);
      ctx.fill();
      this.wcdRim(ctx, c.cold, x, f, s, { dim: 0.2, dimTint: '8,10,20' }, '#d6c2b0', [-1, 1], 1);
      // papel picado / poeira caindo devagar na luz
      this.cineDust(ctx, W, H, t, 26, 'rgba(226,232,240,0.45)', 13);
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'NEO EGOIST LEAGUE • FIM DE JOGO', seg(t, 6, 46));
      this.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
    },

    // PLANO 2 — as mãos (o olhar dele); o Chigiri lá na frente
    wcdVer1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      // gramado visto de cima, luzes desfocadas no alto
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#04060c'], [0.35, '#081018'], [0.36, '#0b2314'], [1, '#0f2c1a']]);
      this.cineBokeh(ctx, W, top + 10, top + 140, t, 12, ['rgba(255,250,235,0.35)', 'rgba(147,197,253,0.3)'], 4);
      for (let i = 0; i < 9; i++) {
        const y = 340 + Math.pow(i / 9, 1.4) * 420;
        ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.02)';
        ctx.fillRect(0, y, W, 30 + i * 14);
      }
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 + this.cineNoise(t * 0.4, 6) * 3, y: 360, zoom: 1 + easeIO(t / 330) * 0.05 });
      // Chigiri parado a alguns metros, olhando para ele
      ctx.save();
      ctx.translate(660, 446);
      ctx.scale(1, 0.18);
      this.cineGlow(ctx, 0, 0, 160, 'rgba(226,232,240,0.25)');
      ctx.restore();
      this.wcdRim(ctx, c.chigiri, 660, 446, 250, { dim: 0.3, dimTint: '6,10,24' }, '#fda4af', [-1, 1], 2);
      // as mãos tremendo (param quando ele ouve a pergunta)
      const tr = 1 - seg(t, 190, 220);
      const hv = this.wcdHandCv();
      const px = 13;
      [-1, 1].forEach((s) => {
        const dx = Math.round(this.cineNoise(S.f * 2.7, s + 3) * 3 * tr);
        const dy = Math.round(this.cineNoise(S.f * 2.3, s + 9) * 2 * tr);
        const hx = s < 0 ? 300 : 980 - hv.width * px;
        this.wcdPix(ctx, hv, hx + dx, 404 + dy, px, s < 0);
      });
      ctx.restore();
      ctx.fillStyle = 'rgba(4,6,14,0.22)';
      ctx.fillRect(0, top, W, bot - top);
    },

    // PLANO 3 — uma rachadura: um segundo do Time Z... e fecha de novo
    wcdVer2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      const hit = 70;
      const warm = seg(t, hit, hit + 6) * (1 - seg(t, 196, 230));
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#050506'], [1, '#110d0c']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 368, zoom: 1 + easeIO(t / 330) * 0.08, shake: 0.5 + (t >= hit ? 4 * (1 - seg(t, hit, hit + 20)) : 0) });
      this.cineGlow(ctx, 640, 330, 520, 'rgba(168,146,126,0.2)');
      this.cineGlow(ctx, 640, 330, 460, 'rgba(251,146,60,0.25)', warm);
      const size = 860;
      const eyeY = 352;
      const r = this.finHead(ctx, c.cold, 400, eyeY, size, { rim: '#d6c2b0', dim: 0.12, dimTint: '20,16,14' });
      this.wcdEyes(ctx, 400, eyeY, r.u, {
        ring: mixHex('#78716c', '#f59e0b', warm), iris: mixHex('#1c1917', '#7c2d12', warm), tiny: warm > 0.5,
        half: warm < 0.3, lid: this.finShade(c.cold.skinColor, -0.2), glow: 'rgba(249,115,22,0.35)', glowA: warm
      });
      ctx.restore();
      // a memória: o Time Z, rindo — e ela racha e cai
      const kp = ease(seg(t, hit + 2, hit + 18));
      if (kp > 0 && t < 250) {
        const fall = seg(t, 186, 240);
        ctx.save();
        ctx.globalAlpha = 1 - fall;
        ctx.translate(0, fall * fall * 260);
        const pts = [[600, top + 34], [W - 40, top + 22], [W - 58, bot - 52], [574, bot - 36]];
        this.finPanel(ctx, pts, () => {
          this.wcdTimeZ(ctx, 560, top, W - 560, bot - top, t - hit);
          if (t > 160) this.wcdCracks(ctx, 930, 330, seg(t, 160, 186));
        }, { dx: (1 - kp) * 700, border: '#fde68a' });
        ctx.restore();
      }
      if (t >= hit) this.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, hit, hit + 12)), '#fff7ed');
      this.cineSfx(S, hit, 'racha', () => window.SFX?.kick?.(0.7));
      this.cineSfx(S, 162, 'quebra', () => window.SFX?.post?.());
    },
    wcdTimeZ(ctx, x0, y0, w, h, lt) {
      const c = this.wcdCast();
      this.cineGradient(ctx, x0, y0, w, h, [[0, '#fde68a'], [0.55, '#fb923c'], [1, '#7c2d12']]);
      this.drawRadialSpeedLines(ctx, x0 + w / 2, y0 + h * 0.5, 900, '#fff7ed', 0.22);
      this.cineGlow(ctx, x0 + w / 2, y0 + h * 0.45, 300, 'rgba(255,247,237,0.55)');
      const fy = y0 + h + 40;
      this.finSpr(ctx, c.you, x0 + w * 0.2, fy + 10, 330, { animState: 'idle', frame: 1 });
      this.finSpr(ctx, c.bachira, x0 + w * 0.8, fy + 10, 330, { animState: 'idle', frame: 1 });
      this.finSpr(ctx, c.smile, x0 + w * 0.5, fy, 400, { animState: 'call_pass', frame: 1 });
      this.finFillPat(ctx, 'dots', x0, y0, w, h, 0.2);
      this.rincStamp(ctx, 'TIME Z', x0 + w / 2, y0 + 62, 50, '#fff7ed', lt, 8, 3);
      this.finKicker(ctx, x0 + 24, y0 + h - 30, 'PRIMEIRA SELEÇÃO • ANTES DE TUDO', seg(lt, 12, 50), '#fde68a');
    },
    // Rachaduras saindo de um ponto (k 0..1 = quanto já rachou)
    wcdCracks(ctx, cx, cy, k) {
      if (k <= 0) return;
      ctx.save();
      ctx.lineJoin = 'miter';
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU + rnd(i, 7) * 0.5;
        const len = (160 + rnd(i, 8) * 320) * ease(k);
        const pts = [[cx, cy]];
        for (let j = 1; j <= 6; j++) {
          const d = (len * j) / 6;
          const aa = a + (rnd(i * 6 + j, 9) - 0.5) * 0.6;
          pts.push([cx + Math.cos(aa) * d, cy + Math.sin(aa) * d]);
        }
        [['#020617', 7], ['#fff7ed', 3]].forEach(([col, lw]) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.beginPath();
          pts.forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        });
      }
      ctx.restore();
    },

    // PLANO 4 — o telão do Ego: WILD CARD APROVADO → MANSHINE CITY
    wcdVer3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      const k = easeIO(t / 300);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#02050c'], [1, '#050a14']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(372, 352, k), zoom: lerp(1, 1.06, k), shake: 0.4 });
      this.cineGlow(ctx, 640, 260, 620, 'rgba(0,245,212,0.16)');
      this.finEgoScreen(ctx, 220, top + 20, 760, 300, t, { live: true, ticker: 'WILD CARD • RENSUKE KUNIGAMI • RESULTADO: APROVADO • DESTINO: MANSHINE CITY •' });
      this.cineShafts(ctx, 600, top + 320, Math.PI / 2, 360, 1.6, 6, '94,234,212', 0.06, t);
      this.rincStamp(ctx, 'WILD CARD: APROVADO', 600, top + 370, 52, '#00f5d4', t, 74, 2, 720);
      if (t > 130) {
        const kk = ease(seg(t, 130, 142));
        const pw = this.finPixelText(ctx, '→ MANSHINE CITY', 600, top + 432, 3.2 * kk + 0.01, '#7dd3fc');
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(600 - pw / 2, top + 458, pw, 3);
      }
      this.wcdRim(ctx, c.cold, 1110, bot + 240, 520, { facing: 'back', dim: 0.7, dimTint: '2,8,14' }, '#5eead4', [-1, 1], 1);
      ctx.restore();
      this.cineSfx(S, 74, 'aprovado', () => window.SFX?.blip?.(520));
      this.cineSfx(S, 130, 'destino', () => window.SFX?.blip?.(660));
    },

    // PLANO 5 — ele vai embora; meio rosto no escuro: "Na NEL eu vou te devorar."
    wcdVer4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcdCast();
      const cut = 100;
      if (t < cut) {
        const k = easeIO(t / cut);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: 1.08 + k * 0.04, shake: 0.5 });
        ctx.drawImage(this.finBg('wcd_arena', 1280, 720, this.wcdArenaBg), 0, 0);
        this.wcdArenaLights(ctx, t, [0, 0.55, 0, 0, 0.55, 0]);
        ctx.fillStyle = 'rgba(2,4,10,0.4)';
        ctx.fillRect(-200, -200, 1680, 1120);
        const z = lerp(1.7, 2.0, k);
        const [x, f] = AP(700, 720, z);
        this.wcdRim(ctx, c.cold, x, f, 360 / z, { facing: 'back', animState: 'run', frame: WALKF(S.f, 6), dim: 0.3, dimTint: '8,10,20' }, '#d6c2b0', [-1, 1], 2);
        ctx.restore();
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1, shake: 0.8 });
        this.wcdRim2(ctx, c.chigiri, 150, bot + 190, 480, { facing: 'back', dim: 0.78, dimTint: '3,4,8' }, '#1e293b', '#94a3b8', 3);
        this.wcdRim2(ctx, c.you, 360, bot + 220, 540, { facing: 'back', dim: 0.78, dimTint: '3,4,8' }, '#1e293b', '#94a3b8', 3);
        ctx.restore();
        return;
      }
      const u2 = t - cut;
      const k = easeIO(u2 / 270);
      ctx.fillStyle = '#030303';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 680, y: 370, zoom: 1 + k * 0.07, shake: 0.4 });
      this.cineGlow(ctx, 520, 340, 420, 'rgba(168,146,126,0.18)');
      const x = 820;
      const eyeY = 350;
      const size = 1000;
      const r = this.finHead(ctx, c.cold, x, eyeY, size, { rim: '#c8ab94', rimSides: [-1], dim: 0.18, dimTint: '16,12,10' });
      // a sombra engole o lado direito do rosto
      this.foxcGradH(ctx, x - 1.5 * r.u, top - 40, 6 * r.u, bot - top + 80, [[0, 'rgba(3,3,3,0)'], [1, 'rgba(3,3,3,0.96)']]);
      ctx.fillStyle = 'rgba(3,3,3,0.96)';
      ctx.fillRect(x + 4.5 * r.u, top - 40, W, bot - top + 80);
      this.wcdEye(ctx, x - 3.5 * r.u, eyeY, r.u * 0.3, -1, { ring: '#78716c', iris: '#1c1917', look: -1, half: true, lid: this.finShade(c.cold.skinColor, -0.2), reflect: '#fb923c' });
      ctx.restore();
      this.rincStamp(ctx, 'NA NEL...', 290, top + 120, 56, '#d6d3d1', u2, 24, 3);
      this.cineImpactText(ctx, 'EU VOU TE DEVORAR.', 330, bot - 96, 64, '#fdba74', seg(u2, 92, 102), 600, -0.04);
      if (u2 >= 92) this.cineFlash(ctx, W, H, 0.25 * (1 - seg(u2, 92, 104)), '#fed7aa');
      // fim frio: escurece até o preto
      const fo = seg(u2, 226, 268);
      if (fo > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fo})`;
        ctx.fillRect(0, 0, W, H);
      }
      this.cineSfx(S, cut + 92, 'devorar', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // FUNDO DE DIÁLOGO: a instalação do Wild Card (estático, guardado pelo motor)
  // ==========================================================================
  CE.VN_BG.wildcard_lab = function (ctx, W, H) {
    const src = this.finBg('wcd_lab', 1280, 720, this.wcdLabBg);
    const s = Math.max(W / 1280, H / 720);
    const dw = 1280 * s;
    const dh = 720 * s;
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2 - (dh - H) * 0.15, dw, dh);
    const ox = (W - dw) / 2;
    const oy = (H - dh) / 2 - (dh - H) * 0.15;
    const P = (x, y) => [ox + x * s, oy + y * s];
    // a luz da lente, os LEDs acesos, a plataforma iluminada e a fumaça
    const lens = P(640, 128);
    this.cineGlow(ctx, lens[0], lens[1], 130 * s, 'rgba(239,68,68,0.6)', 0.85);
    for (let i = 0; i < 26; i++) {
      const z = 1.1 + rnd(i, 41) * 1.6;
      const X = rnd(i, 42) < 0.5 ? 0 : 1280;
      const p = LP(X, 170 + Math.floor(rnd(i, 43) * 15) * 36, z);
      const q = P(p[0], p[1]);
      this.cineGlow(ctx, q[0], q[1], (18 / z) * s, 'rgba(251,146,60,0.8)', 0.6 + rnd(i, 44) * 0.4);
    }
    const sp = P(640, 160);
    this.cineShafts(ctx, sp[0], sp[1], Math.PI / 2, 420 * s, 0.36, 5, '253,186,116', 0.09, 40);
    const pl = P(640, 528);
    ctx.save();
    ctx.translate(pl[0], pl[1]);
    ctx.scale(1, 0.24);
    this.cineGlow(ctx, 0, 0, 240 * s, 'rgba(253,186,116,0.45)');
    ctx.restore();
    this.wcdSmoke(ctx, 0, W, H * 0.78, H * 1.02, 120, 12, 'rgba(234,88,12,0.10)', 1, 5, 0);
    this.cineDust(ctx, W, H * 0.8, 0, 46, 'rgba(253,186,116,0.35)', 17);
    // sombra suave atrás de quem fala, vinheta
    let g = ctx.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, Math.max(W * 0.22, H * 0.5));
    g.addColorStop(0, 'rgba(4,2,2,0.3)');
    g.addColorStop(1, 'rgba(4,2,2,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.56);
    g.addColorStop(0, 'rgba(2,1,1,0)');
    g.addColorStop(1, 'rgba(2,1,1,0.7)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };

  // ==========================================================================
  // AQUECIMENTO (um item por quadro durante o plano 1): bonecos em três partes (corpo,
  // silhueta da luz de recorte, montagem) e "ensaios" de cada plano num canvas escondido,
  // que montam de antemão os cenários, brilhos e degradês guardados
  // ==========================================================================
  const parts = (who, o, base = 180) => {
    const mk = (oo) =>
      function () {
        this.finSprEntry(this.wcdCast()[who], base, oo);
      };
    if (!o.rim) return [mk(o)];
    const plain = Object.assign({}, o, { rim: null });
    return [mk(plain), mk(Object.assign({}, plain, { tint: o.rim, dim: 0, showAura: false })), mk(o)];
  };
  // o corpo + a silhueta colorida do wcdRim
  const partsRim = (who, o, color, base = 180) => [...parts(who, o, base), ...parts(who, Object.assign({}, o, { tint: color, dim: 0, showAura: false }), base)];
  // as duas silhuetas coloridas do wcdRim2 + o corpo
  const parts2 = (who, o, cols) => [...parts(who, o), ...cols.map((tint) => parts(who, Object.assign({}, o, { dim: 0, dimTint: '', showAura: false, tint }))[0])];
  const R = (o, rim, sides, rimD) => Object.assign({}, o, { rim, rimSides: sides, rimD });
  const W4 = (fn) => [0, 1, 2, 3].flatMap((i) => fn(1 + i * 4));
  const bg = (key, fn) =>
    function () {
      this.finBg(key, 1280, 720, this[fn]);
    };
  const fn = (name) =>
    function () {
      this[name]();
    };
  // ensaio: desenha o plano num canvas escondido (sem tocar sons)
  const dry = (scene, phase, name, t, f) =>
    function () {
      const def = this.CINE[scene];
      if (!this._wcdDryCv) {
        this._wcdDryCv = document.createElement('canvas');
        // canvas minúsculo: o ensaio só serve para montar o que fica guardado (cenários, brilhos,
        // bonecos), o desenho em si é descartado e quase não custa nada
        this._wcdDryCv.width = 64;
        this._wcdDryCv.height = 36;
      }
      const g = this._wcdDryCv.getContext('2d');
      const top = Math.round(720 * (def.letterbox ?? 0.12));
      const dur = def.phases[phase];
      const S = { W: 1280, H: 720, t, phase, dur, p: t / dur, f: f ?? t + phase * 100, top, bot: 720 - top, stageH: 720 - top * 2 };
      const sfx = this.cineSfx;
      this.cineSfx = () => {};
      try {
        g.save();
        g.scale(0.05, 0.05);
        this[name](g, S);
      } finally {
        g.restore();
        this.cineSfx = sfx;
      }
    };
  // brilhos prontos (um sprite de degradê por cor), em lotes pequenos
  const glows = (cols) =>
    function () {
      cols.forEach((col) => this.cineGlowSprite(col));
    };
  const DOOR_GLOWS = [['rgba(253,224,71,0.32)', 'rgba(74,222,128,0.55)', 'rgba(253,230,138,0.5)', 'rgba(249,115,22,0.6)'], ['rgba(239,68,68,0.9)', 'rgba(249,115,22,0.35)', 'rgba(249,115,22,0.13)', 'rgba(0,245,212,0.5)', 'rgba(251,146,60,0.55)']];
  const DW = 'wildcard_door';
  const warmDoor = [
    ...W4((fr) => partsRim('kuni', { facing: 'back', animState: 'run', frame: fr, dim: 0.25, dimTint: '8,12,24' }, '#fca5a5')).slice(2),
    fn('wcdBagCv'),
    fn('wcdCapeCv'),
    fn('wcdFistPanelCv'),
    ...parts('kuni', { dim: 0.3, dimTint: '70,8,8', rim: '#fca5a5', rimSides: [1], rimD: 2 }),
    ...parts('kid', { animState: 'call_pass', frame: 1 }),
    dry(DW, 1, 'wcdDoor1', 20),
    dry(DW, 1, 'wcdDoor1', 170),
    dry(DW, 1, 'wcdDoor1', 320),
    bg('wcd_doors', 'wcdDoorsBg'),
    ...parts2('kuni', { facing: 'back', dim: 0.32, dimTint: '8,12,24' }, ['#86efac', '#fb923c']),
    ...DOOR_GLOWS.map(glows),
    dry(DW, 2, 'wcdDoor2', 70),
    ...partsRim('kuni', { dim: 0.42, dimTint: '2,34,14' }, '#86efac'),
    ...partsRim('kuni', { dim: 0.42, dimTint: '48,6,2' }, '#fdba74'),
    dry(DW, 3, 'wcdDoor3', 10),
    dry(DW, 3, 'wcdDoor3', 160),
    ...W4((fr) => parts('kuni', { facing: 'back', animState: 'run', frame: fr, dim: 0, dimTint: '8,12,24', tint: '#0c0404' })),
    fn('wcdBagDarkCv'),
    dry(DW, 4, 'wcdDoor4', 20),
    dry(DW, 4, 'wcdDoor4', 110),
    dry(DW, 4, 'wcdDoor4', 170),
    dry(DW, 4, 'wcdDoor4', 220),
    dry(DW, 4, 'wcdDoor4', 260)
  ];
  const DH = 'wildcard_hell';
  const warmHell = [
    ...partsRim('wild', {}, '#fdba74'),
    ...parts('wild', { tint: '#fb923c' }),
    dry(DH, 1, 'wcdHell1', 60),
    dry(DH, 1, 'wcdHell1', 200),
    function () {
      this.wcdHoloEntry({ animState: 'run', flipX: true });
    },
    function () {
      this.wcdHoloEntry({ animState: 'idle', flipX: true });
    },
    ...W4((fr) => partsRim('wild', { animState: 'run', frame: fr }, '#fdba74')),
    ...['idle', 'windup', 'shoot'].flatMap((st) => partsRim('wild', { animState: st, frame: 1, flipX: true }, '#fdba74')),
    ...parts('wild', { rim: '#fdba74' }),
    dry(DH, 2, 'wcdHell2', 40),
    dry(DH, 2, 'wcdHell2', 140),
    dry(DH, 2, 'wcdHell2', 250),
    dry(DH, 2, 'wcdHell2', 300),
    dry(DH, 3, 'wcdHell3', 60),
    dry(DH, 3, 'wcdHell3', 200),
    ...W4((fr) => partsRim('cold', { animState: 'run', frame: fr }, '#d6c2b0')),
    ...['windup', 'shoot'].flatMap((st) => partsRim('cold', { animState: st, frame: 1, flipX: true }, '#d6c2b0')),
    ...parts('cold', { rim: '#d6c2b0', dim: 0.12, dimTint: '20,16,14' }),
    dry(DH, 4, 'wcdHell4', 40),
    dry(DH, 4, 'wcdHell4', 120),
    dry(DH, 4, 'wcdHell4', 180),
    dry(DH, 4, 'wcdHell4', 260)
  ];
  const DR = 'kunigami_return';
  const warmRet = [
    ...partsRim('bachira', { dim: 0.62, dimTint: '4,10,26' }, '#93c5fd', 144),
    ...partsRim('you', { dim: 0.62, dimTint: '4,10,26' }, '#93c5fd', 144),
    ...partsRim('chigiri', { dim: 0.62, dimTint: '4,10,26' }, '#93c5fd'),
    dry(DR, 0, 'wcdRet0', 300),
    bg('wcd_end', 'wcdEndBg'),
    ...W4((fr) => partsRim('cold', { animState: 'run', frame: fr, dim: 0.25, dimTint: '12,10,10' }, '#fdba74')),
    ...W4((fr) => parts('cold', { animState: 'run', frame: fr, dim: 0, dimTint: '12,10,10', tint: '#0a0404' })),
    ...parts2('you', { facing: 'back', dim: 0.82, dimTint: '3,3,6' }, ['#1e293b', '#334155', '#fb923c']),
    ...parts2('chigiri', { facing: 'back', dim: 0.82, dimTint: '3,3,6' }, ['#1e293b', '#334155', '#fb923c']),
    ...DOOR_GLOWS.map(glows),
    glows(['rgba(234,120,80,0.16)', 'rgba(255,237,213,0.9)']),
    dry(DR, 1, 'wcdRet1', 40),
    dry(DR, 1, 'wcdRet1', 150),
    dry(DR, 1, 'wcdRet1', 300),
    ...partsRim('cold', { animState: 'idle', frame: 45, dim: 0.25, dimTint: '12,10,10' }, '#fdba74'),
    ...parts('chigiri', { rim: '#fda4af' }),
    ...parts('you', { rim: '#67e8f9' }),
    dry(DR, 2, 'wcdRet2', 60),
    dry(DR, 2, 'wcdRet2', 160),
    dry(DR, 2, 'wcdRet2', 280),
    bg('wcd_ret_eyes', 'wcdRetEyesBg'),
    dry(DR, 3, 'wcdRet3', 100),
    ...partsRim('cold', { dim: 0.22, dimTint: '14,12,12' }, '#d6c2b0'),
    dry(DR, 4, 'wcdRet4', 40),
    dry(DR, 4, 'wcdRet4', 200)
  ];
  const DV = 'wildcard_verdict';
  const warmVer = [
    fn('wcdHandCv'),
    ...partsRim('chigiri', { dim: 0.3, dimTint: '6,10,24' }, '#fda4af'),
    dry(DV, 1, 'wcdVer1', 100),
    ...parts('cold', { rim: '#d6c2b0', dim: 0.12, dimTint: '20,16,14' }),
    ...parts('you', { animState: 'idle', frame: 1 }),
    ...parts('bachira', { animState: 'idle', frame: 1 }),
    ...parts('smile', { animState: 'call_pass', frame: 1 }),
    dry(DV, 2, 'wcdVer2', 30),
    dry(DV, 2, 'wcdVer2', 120),
    dry(DV, 2, 'wcdVer2', 200),
    function () {
      this.getSpeakerCharData && this.finSprEntry(this.getSpeakerCharData('EGO'), 180, {});
    },
    function () {
      const g = document.createElement('canvas').getContext('2d');
      this.finEgoScreen(g, 0, 0, 760, 300, 0, {});
    },
    dry(DV, 3, 'wcdVer3', 20),
    dry(DV, 3, 'wcdVer3', 150),
    ...partsRim('cold', { facing: 'back', dim: 0.7, dimTint: '2,8,14' }, '#5eead4'),
    ...W4((fr) => partsRim('cold', { facing: 'back', animState: 'run', frame: fr, dim: 0.3, dimTint: '8,10,20' }, '#d6c2b0')),
    ...parts2('chigiri', { facing: 'back', dim: 0.78, dimTint: '3,4,8' }, ['#1e293b', '#94a3b8']),
    ...parts2('you', { facing: 'back', dim: 0.78, dimTint: '3,4,8' }, ['#1e293b', '#94a3b8']),
    dry(DV, 4, 'wcdVer4', 40),
    ...parts('cold', { rim: '#c8ab94', rimSides: [-1], dim: 0.18, dimTint: '16,12,10' }),
    dry(DV, 4, 'wcdVer4', 150),
    dry(DV, 4, 'wcdVer4', 250)
  ];

  // ==========================================================================
  // REGISTRO
  // ==========================================================================
  CE.wcdWarmLists = { wildcard_door: warmDoor, wildcard_hell: warmHell, kunigami_return: warmRet, wildcard_verdict: warmVer };
  const draw = (fns, warm) =>
    function (ctx, S) {
      fns[S.phase].call(this, ctx, S);
      this.wcdWarm(S, warm);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
    };

  CE.registerCine('wildcard_door', {
    phases: [290, 360, 300, 300, 360],
    music: 'mystery',
    title: '🃏 A PORTA DO CORINGA',
    tags: ['PLANO 1 • O CORREDOR BRANCO', 'PLANO 2 • ELIMINADO', 'PLANO 3 • DUAS PORTAS', 'PLANO 4 • A MÃO NO PEITO', 'PLANO 5 • WILD CARD'],
    subs: [
      [{ from: 16, to: 282, who: 'NARRADOR', text: 'Segunda Seleção. Fim da linha.', color: NARR_C }],
      [{ from: 92, to: 352, who: 'KUNIGAMI', text: '(Eu só queria ser um herói...)', color: KUNI_C }],
      [{ from: 50, to: 292, who: 'EGO', text: '"Existe uma segunda chance."', color: EGO_C }],
      [{ from: 20, to: 240, who: 'EGO', text: '"Ela vai te custar tudo."', color: EGO_C }],
      [{ from: 8, to: 258, who: 'KUNIGAMI', text: '"...Que custe o que custar."', color: KUNI_C }]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw([CE.wcdDoor0, CE.wcdDoor1, CE.wcdDoor2, CE.wcdDoor3, CE.wcdDoor4], warmDoor)
  });

  CE.registerCine('wildcard_hell', {
    phases: [300, 330, 360, 330, 360],
    music: 'tension',
    title: '🃏 O INFERNO DO WILD CARD',
    tags: ['PLANO 1 • SUBSOLO', 'PLANO 2 • ESCANEAMENTO', 'PLANO 3 • DIA 1... DIA 47', 'PLANO 4 • APAGUE', 'PLANO 5 • O ATACANTE PERFEITO'],
    subs: [
      [{ from: 60, to: 292, who: '???', text: '"Bem-vindo ao Wild Card."', color: VOICE_C }],
      [{ from: 30, to: 322, who: '???', text: '"Perna esquerda: fraca. Emoção: instável."', color: VOICE_C }],
      [{ from: 20, to: 352, who: 'NARRADOR', text: 'Dia após dia. Cair. Levantar. Cair de novo.', color: NARR_C }],
      [{ from: 20, to: 300, who: '???', text: '"O herói é peso morto. Apague."', color: VOICE_C }],
      [{ from: 200, to: 356, who: '???', text: '"Perfeito."', color: VOICE_C }]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw([CE.wcdHell0, CE.wcdHell1, CE.wcdHell2, CE.wcdHell3, CE.wcdHell4], warmHell)
  });

  CE.registerCine('kunigami_return', {
    phases: [330, 330, 330, 320, 340],
    music: 'dread',
    title: '🃏 O RETORNO DO CORINGA',
    tags: ['PLANO 1 • O APAGÃO', 'PLANO 2 • A PORTA PRETA', 'PLANO 3 • O CORINGA', 'PLANO 4 • OLHOS VAZIOS', 'PLANO 5 • O RETORNO'],
    subs: [
      [{ from: 14, to: 322, who: 'NARRADOR', text: 'Véspera da NEL. Os refletores se apagam.', color: NARR_C }],
      [{ from: 100, to: 322, who: 'CHIGIRI', text: '"...Quem é aquele?"', color: CHI_C }],
      [{ from: 40, to: 322, who: 'CHIGIRI', text: '"Kunigami?! Por onde você andou?!"', color: CHI_C }],
      [{ from: 30, to: 312, who: 'KUNIGAMI', text: '"O herói morreu naquela porta."', color: COLD_C }],
      [{ from: 10, to: 334, who: 'KUNIGAMI', text: '"Agora só sobrou o atacante."', color: COLD_C }]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw([CE.wcdRet0, CE.wcdRet1, CE.wcdRet2, CE.wcdRet3, CE.wcdRet4], warmRet)
  });

  CE.registerCine('wildcard_verdict', {
    phases: [300, 330, 330, 300, 370],
    music: 'mystery',
    title: '🃏 O VEREDITO',
    tags: ['PLANO 1 • DEPOIS DO APITO', 'PLANO 2 • AS MÃOS', 'PLANO 3 • UMA RACHADURA', 'PLANO 4 • APROVADO', 'PLANO 5 • NA NEL'],
    subs: [
      [{ from: 10, to: 298, who: 'NARRADOR', text: 'Fim de jogo. O estádio já está vazio.', color: NARR_C }],
      [{ from: 40, to: 324, who: 'CHIGIRI', text: '"Rensuke... você ainda tá aí dentro?"', color: CHI_C }],
      [{ from: 4, to: 328, who: 'NARRADOR', text: 'Por um segundo, alguma coisa lá dentro sorriu.', color: NARR_C }],
      [{ from: 30, to: 296, who: 'EGO', text: '"Aprovado. Destino: Manshine City."', color: EGO_C }],
      [{ from: 104, to: 364, who: 'KUNIGAMI', text: '"Na NEL... eu vou te devorar."', color: COLD_C }]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw([CE.wcdVer0, CE.wcdVer1, CE.wcdVer2, CE.wcdVer3, CE.wcdVer4], warmVer)
  });
})();
