// ============================================================================
// MOMENTOS DO MANGÁ (cine_manga) — ver js/cine_kit.js
//   nagi_reo_split • 2ª Seleção, a sala branca: o Reo estende a mão → o Nagi olha
//                    para você (pela 1ª vez ele QUER alguma coisa) → atravessa a sala →
//                    a coroa do Reo racha → o Reo sozinho: "O TESOURO QUE FOI EMBORA"
//   itoshi_snow    • os irmãos Itoshi: a promessa na praia de Kamakura → anos depois, a
//                    neve e o Sae de volta da Espanha → "some da minha vida" → a bola cai
//                    na neve, a lembrança congela e quebra → o Rin chora e os olhos
//                    esfriam: "NEVE EM KAMAKURA"
// Fundo de diálogo: VN_BG.snow_night (rua de Kamakura à noite, nevando, poste aceso).
// Helpers daqui têm o prefixo "mgm". Usa os bonecos guardados da cine_final (finSpr,
// finRim, finHead, finCrop, finPanel, finKicker, finBg) e o rincStamp/rincShade da
// cine_rin. Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas, sem tela piscando
// (um clarão por impacto), olhos em close em pixel art, frame 0 = piscada (não usar).
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
  const smooth = (x) => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
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
  // Trecho inicial de uma linha quebrada (k 0..1 do comprimento em segmentos)
  const partial = (path, k) => {
    const n = path.length - 1;
    const f = clamp(k) * n;
    const i = Math.min(n - 1, Math.floor(f));
    const out = path.slice(0, i + 1);
    const a = path[i];
    const b = path[i + 1];
    out.push([lerp(a[0], b[0], f - i), lerp(a[1], b[1], f - i)]);
    return out;
  };

  const REO_C = '#c084fc';
  const NAGI_C = '#e2e8f0';
  const RIN_C = '#22d3ee';
  const SAE_C = '#f9a8d4';
  const NARR_C = '#94a3b8';
  const REO_RGB = '168,85,247';
  const NAGI_RGB = '100,116,139';
  const YOU_RGB = '13,148,136';

  // Bola em pixel art (12 x 12)
  const BALL = [
    '....KKKK....',
    '..KKWKKWKK..',
    '.KWWWKKWWWK.',
    '.KWWWWWWWWK.',
    'KWWWWKKWWWWK',
    'KKWWKKKKWWKK',
    'KKWWKKKKWWSK',
    'KWWWWKKWWWSK',
    '.KWWWWWWWSK.',
    '.KKKWWWWKKK.',
    '..KKWWSSKK..',
    '....KKKK....'
  ];
  const BALL_PAL = { K: '#0f172a', W: '#f8fafc', S: '#a5b4c8' };

  // ==========================================================================
  // HELPERS (prefixo mgm)
  // ==========================================================================
  Object.assign(CE, {
    mgmCast() {
      const bl = this.KITS.blueLock;
      return {
        reo: this.cineChar('reo', Object.assign({}, bl)),
        nagi: this.cineChar('nagi', Object.assign({}, bl)),
        you: this.cineYou(Object.assign({}, bl)),
        nagiMem: this.cineChar('nagi', { outfit: 'casual', clothesColor: '#334155' }),
        saeKid: this.cineChar('sae', { outfit: 'casual', clothesColor: '#fb7185' }),
        rinKid: this.cineChar('rin', { outfit: 'casual', clothesColor: '#2dd4bf' }),
        sae: this.cineChar('sae', { outfit: 'casual', clothesColor: '#1f2937' }),
        rin: this.cineChar('rin', { outfit: 'casual', clothesColor: '#1e3a4c' }),
        rinCold: this.cineChar('rin', { outfit: 'casual', clothesColor: '#1e3a4c', angry: true })
      };
    },

    // Sorteio com semente (o cenário sai sempre igual)
    mgmRng(seed) {
      let a = seed >>> 0;
      return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    // Peça em pixel art guardada pronta (braço, punho, coroa, bola...): desenhada em
    // unidades (ppu px por unidade, como os bonecos: 5) com o mesmo contorno escuro
    mgmPart(key, wU, hU, ppu, outline, draw, dim = 0, dimTint = '20,10,40') {
      const c = this._mgmParts || (this._mgmParts = new Map());
      let e = c.get(key);
      if (e) return e;
      const pad = outline + 2;
      const w = Math.ceil(wU * ppu) + pad * 2;
      const h = Math.ceil(hU * ppu) + pad * 2;
      const body = document.createElement('canvas');
      body.width = w;
      body.height = h;
      const g = body.getContext('2d');
      const r = (x, y, ww, hh, col) => {
        g.fillStyle = col;
        g.fillRect(pad + Math.round(x * ppu), pad + Math.round(y * ppu), Math.max(1, Math.round(ww * ppu)), Math.max(1, Math.round(hh * ppu)));
      };
      draw.call(this, r, g);
      let cv = body;
      if (outline) {
        cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const og = cv.getContext('2d');
        [[-outline, 0], [outline, 0], [0, -outline], [0, outline]].forEach(([dx, dy]) => og.drawImage(body, dx, dy));
        og.globalCompositeOperation = 'source-in';
        og.fillStyle = '#0a0f1c';
        og.fillRect(0, 0, w, h);
        og.globalCompositeOperation = 'source-over';
        og.drawImage(body, 0, 0);
      }
      if (dim) {
        const og = cv.getContext('2d');
        og.globalCompositeOperation = 'source-atop';
        og.fillStyle = `rgba(${dimTint},${dim})`;
        og.fillRect(0, 0, w, h);
        og.globalCompositeOperation = 'source-over';
      }
      e = { cv, pad, ppu };
      c.set(key, e);
      return e;
    },
    // Cola a peça com a origem (0,0) das unidades em (x, y); u = px por unidade
    mgmPartAt(ctx, e, x, y, u) {
      const k = u / e.ppu;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(e.cv, x - e.pad * k, y - e.pad * k, e.cv.width * k, e.cv.height * k);
      ctx.restore();
    },
    mgmMap(key, rows, pal) {
      return this.mgmPart(key, rows[0].length, rows.length, 1, 0, (r) => {
        rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && pal[ch] && r(x, y, 1, 1, pal[ch])));
      });
    },
    // Bola: gira só de 90 em 90 graus (pixel art girando torto fica feio)
    mgmBall(ctx, x, y, r, spin = 0) {
      const e = this.mgmMap('ball', BALL, BALL_PAL);
      const u = (r * 2) / 12;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      const q = ((Math.floor(spin) % 4) + 4) % 4;
      if (q) ctx.rotate((Math.PI / 2) * q);
      this.mgmPartAt(ctx, e, -6 * u, -6 * u, u);
      ctx.restore();
    },

    // Braço estendido (manga térmica, antebraço, mão aberta com a palma pra cima), na
    // escala do boneco. Origem = unidade (24.6, 12.9) do boneco (o ombro da direita)
    mgmArm(char, dim = 0) {
      const skin = char.skinColor || '#f3d1b8';
      return this.mgmPart(`arm|${skin}|${dim}`, 18.6, 4.8, 5, 2, (r) => {
        const sh = this.finShade(skin, -0.14);
        r(0, 1.0, 7.4, 3.3, '#090d16');
        r(0, 1.0, 7.4, 0.6, '#1e293b');
        r(7.4, 1.25, 5.0, 2.8, skin);
        r(7.4, 3.45, 5.0, 0.6, sh);
        r(12.2, 0.9, 3.2, 3.3, skin);
        r(12.2, 3.6, 3.2, 0.6, sh);
        r(13.0, 0.0, 1.3, 1.2, skin);
        r(15.2, 1.1, 2.6, 0.75, skin);
        r(15.2, 2.0, 2.9, 0.75, skin);
        r(15.2, 2.9, 2.6, 0.75, skin);
        r(15.2, 1.85, 2.6, 0.15, sh);
        r(15.2, 2.75, 2.6, 0.15, sh);
        r(15.2, 3.65, 2.0, 0.5, sh);
      }, dim);
    },
    // Punho fechado de frente (os nós dos dedos pra câmera)
    mgmFist(char) {
      const skin = char.skinColor || '#f3d1b8';
      return this.mgmPart(`fist2|${skin}`, 8, 8.2, 5, 2, (r) => {
        const sh = this.finShade(skin, -0.16);
        const sh2 = this.finShade(skin, -0.38);
        const hi = this.finShade(skin, 0.22);
        r(1.4, 5.6, 5.2, 2.6, '#090d16');
        r(1.4, 5.6, 5.2, 0.45, '#1e293b');
        r(0.6, 1.2, 6.8, 4.6, skin);
        for (let i = 0; i < 4; i++) {
          r(0.75 + i * 1.65, 0.55 + (i === 1 || i === 2 ? -0.15 : 0.1), 1.45, 0.9, skin);
          r(1.05 + i * 1.65, 0.75 + (i === 1 || i === 2 ? -0.15 : 0.1), 0.75, 0.3, hi);
        }
        for (let i = 1; i < 4; i++) r(0.55 + i * 1.65, 0.9, 0.28, 2.4, sh2);
        r(0.6, 3.15, 6.8, 0.28, sh2);
        r(0.6, 3.6, 4.6, 1.35, skin);
        r(0.6, 3.45, 4.6, 0.25, sh2);
        r(5.2, 3.5, 0.28, 1.45, sh2);
        r(4.1, 3.8, 0.8, 0.6, hi);
        r(0.6, 5.2, 6.8, 0.55, sh);
      });
    },
    // Mão segurando a bola de lado (dedos por cima) + a manga do casaco descendo
    mgmHold(char, flip) {
      const skin = char.skinColor || '#f3d1b8';
      const coat = char.clothesColor || '#1e3a4c';
      return this.mgmPart(`hold|${skin}|${coat}|${flip ? 1 : 0}`, 3.4, 9, 5, 2, (r) => {
        const sh = this.finShade(skin, -0.16);
        const x = flip ? 0.4 : 0;
        r(x, 0, 2.8, 3.4, skin);
        for (let i = 1; i < 4; i++) r(x, i * 0.85, 2.8, 0.15, sh);
        r(flip ? x + 2.2 : x, 0, 0.6, 3.4, sh);
        r(x - 0.2 + (flip ? 0.4 : 0), 3.2, 3.2, 5.8, coat);
        r(x - 0.2 + (flip ? 0.4 : 0), 3.2, 3.2, 0.5, this.finShade(coat, 0.25));
      });
    },
    // Celular do Nagi (a lembrança: ele jogando no celular quando o Reo o achou)
    mgmPhone() {
      return this.mgmPart('phone', 3.2, 5.4, 5, 2, (r) => {
        r(0, 0, 3.2, 5.4, '#0f172a');
        r(0.3, 0.4, 2.6, 4.4, '#38bdf8');
        r(0.3, 0.4, 2.6, 1.2, '#7dd3fc');
        r(0.7, 2.2, 0.6, 0.6, '#facc15');
        r(1.6, 3.0, 0.6, 0.6, '#f472b6');
        r(0.9, 3.8, 1.4, 0.4, '#e0f2fe');
      });
    },

    // A coroa do Reo (o "tesouro", o sonho de ganhar a Copa com o Nagi), 22 x 16 células
    mgmCrownPart() {
      return this.mgmPart('crown', 22, 16, 1, 1, (r) => {
        const G = '#facc15';
        const Y = '#fef9c3';
        const D = '#ca8a04';
        const DD = '#a16207';
        for (let row = 3; row <= 9; row++) {
          for (let col = 3; col <= 18; col++) {
            const center = col >= 10 - (row - 3) && col <= 11 + (row - 3);
            const left = row >= 5 && col <= 4 + (row - 5);
            const right = row >= 5 && col >= 17 - (row - 5);
            if (center || left || right) r(col, row, 1, 1, col >= 15 ? D : col === 10 || col === 4 ? Y : G);
          }
        }
        for (let col = 3; col <= 18; col++) {
          r(col, 10, 1, 1, Y);
          r(col, 11, 1, 3, col >= 15 ? D : G);
          r(col, 14, 1, 1, DD);
        }
        [[5, '#e11d48'], [10, '#a855f7'], [15, '#e11d48']].forEach(([c, col]) => {
          r(c, 11, 2, 2, col);
          r(c, 11, 1, 1, '#ffffff');
        });
        r(10, 1, 2, 2, Y);
        r(10, 1, 1, 1, '#ffffff');
        r(3, 3, 2, 2, Y);
        r(17, 3, 2, 2, Y);
      });
    },
    // A coroa partida em 3 pedaços (recortados UMA vez) + o caminho da rachadura
    mgmCrownPieces() {
      if (this._mgmCrownP) return this._mgmCrownP;
      const e = this.mgmCrownPart();
      const P = [[11.2, -3], [10.4, 3.5], [12.3, 6.5], [10.2, 9.8], [11.6, 12.6], [10.8, 19]];
      const Q = [[10.2, 9.8], [14, 11], [17.5, 10.2], [25, 12]];
      const polys = [
        [[-3, -3], ...P, [-3, 19]],
        [[11.2, -3], [25, -3], [25, 12], [17.5, 10.2], [14, 11], [10.2, 9.8], [12.3, 6.5], [10.4, 3.5]],
        [[10.2, 9.8], [14, 11], [17.5, 10.2], [25, 12], [25, 19], [10.8, 19], [11.6, 12.6]]
      ];
      const vel = [[-1.3, -0.6, -0.05], [1.5, -1.6, 0.07], [0.7, -0.3, 0.035]];
      const list = polys.map((pts, i) => {
        const cv = document.createElement('canvas');
        cv.width = e.cv.width;
        cv.height = e.cv.height;
        const g = cv.getContext('2d');
        g.translate(e.pad, e.pad);
        poly(g, pts);
        g.clip();
        g.translate(-e.pad, -e.pad);
        g.drawImage(e.cv, 0, 0);
        const cs = pts.map(([x, y]) => [Math.max(2, Math.min(20, x)), Math.max(1, Math.min(15, y))]);
        return { cv, cx: cs.reduce((s, p) => s + p[0], 0) / cs.length, cy: cs.reduce((s, p) => s + p[1], 0) / cs.length, vx: vel[i][0], vy: vel[i][1], vr: vel[i][2] };
      });
      this._mgmCrownP = { e, list, P, Q };
      return this._mgmCrownP;
    },
    // crack 0..1 = a rachadura correndo; brk = quadros desde que partiu (-1 = inteira)
    mgmCrown(ctx, cx, cy, cell, crack, brk) {
      const { e, list, P, Q } = this.mgmCrownPieces();
      const x0 = cx - 11 * cell;
      const y0 = cy - 8 * cell;
      if (brk < 0) {
        this.mgmPartAt(ctx, e, x0, y0, cell);
        if (crack <= 0) return;
        const paths = [partial(P, crack)];
        if (crack > 0.55) paths.push(partial(Q, seg(crack, 0.55, 1)));
        ctx.save();
        ctx.lineJoin = 'miter';
        [['#1c0f02', cell * 0.6], ['#fffbeb', cell * 0.2]].forEach(([col, lw]) => {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          paths.forEach((p) => {
            ctx.beginPath();
            p.forEach(([x, y], i) => (i ? ctx.lineTo(x0 + x * cell, y0 + y * cell) : ctx.moveTo(x0 + x * cell, y0 + y * cell)));
            ctx.stroke();
          });
        });
        ctx.restore();
        return;
      }
      list.forEach((p) => {
        const f = brk;
        const dx = p.vx * f * cell * 0.32;
        const dy = (p.vy * f * 0.3 + 0.018 * f * f) * cell;
        ctx.save();
        ctx.translate(x0 + p.cx * cell + dx, y0 + p.cy * cell + dy);
        ctx.rotate(p.vr * f);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(p.cv, -(e.pad + p.cx) * cell, -(e.pad + p.cy) * cell, e.cv.width * cell, e.cv.height * cell);
        ctx.restore();
      });
    },

    // Sombra de mangá numa FAIXA do rosto (unidades y0→y1 entra, y2→y3 sai), só nos
    // pixels do boneco; pronta por boneco/faixa (como a rincShade, mas sem cobrir o topo)
    mgmBandShade(ctx, char, x, feet, size, amount, y0, y1, y2, y3) {
      const src = this.finSprEntry(char, 180, { tint: '#000000', showAura: false });
      const key = `${src.key}|${y0}|${y1}|${y2}|${y3}`;
      const cache = this._mgmBandC || (this._mgmBandC = new Map());
      let cv = cache.get(key);
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = src.cv.width;
        cv.height = src.cv.height;
        const g = cv.getContext('2d');
        g.drawImage(src.cv, 0, 0);
        g.globalCompositeOperation = 'destination-in';
        const Y = (u) => src.pad + SPRITE_MAPY(u) * 5;
        const gr = g.createLinearGradient(0, Y(y0), 0, Y(y3));
        const span = Y(y3) - Y(y0);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop((Y(y1) - Y(y0)) / span, 'rgba(0,0,0,1)');
        gr.addColorStop((Y(y2) - Y(y0)) / span, 'rgba(0,0,0,1)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, cv.width, cv.height);
        if (cache.size > 12) cache.delete(cache.keys().next().value);
        cache.set(key, cv);
      }
      const k = size / 180;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha *= amount;
      ctx.drawImage(cv, x - size / 2 - src.pad * k, feet - size * 0.87 - src.pad * k, cv.width * k, cv.height * k);
      ctx.restore();
    },

    // O boneco SEM o braço da direita pendurado (o mgmArm entra no lugar)
    mgmSprCut(ctx, char, o, x, feet, size) {
      const k = size / 36;
      const x0 = x - size / 2;
      const top = feet - size * 0.87;
      this.finCrop(ctx, char, o, -16, -16, 41.1, 60, x0 - 16 * k, top + SPRITE_MAPY(-16) * k, 41.1 * k, 60 * k);
      this.finCrop(ctx, char, o, 24.9, -16, 27, 29.8, x0 + 24.9 * k, top + SPRITE_MAPY(-16) * k, 27 * k, 29.8 * k);
      ctx.fillStyle = '#0a0f1c';
      ctx.fillRect(x0 + 24.8 * k, top + SPRITE_MAPY(17) * k, Math.max(2, 0.4 * k), 4.6 * k);
      return { u: k, top };
    },

    // Os dois olhos em pixel art em cima do boneco (close): pálpebra com N linhas (sono,
    // frieza), brilho, lágrima acumulada (wet) e a pálpebra de raiva
    mgmEyes(ctx, cx, eyeY, u, o = {}) {
      const px = u * 0.3;
      const shape = this.PIXEL_EYE;
      [-1, 1].forEach((sd) => {
        const ex = cx + sd * 3.5 * u;
        if (o.glow) this.cineGlow(ctx, ex, eyeY, u * 3.2, o.glow, o.glowA ?? 1);
        this.drawPixelEye(ctx, ex, eyeY, px, { line: o.line || '#020617', iris: o.iris, ring: o.ring, look: o.look || 0, tiny: o.tiny, blink: o.blink });
        if (o.blink) return;
        const x0 = Math.round(ex - 6 * px);
        const y0 = Math.round(eyeY - 3.5 * px);
        const s = Math.ceil(px);
        const cell = (c, r, col) => {
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + r * px), s, s);
        };
        const ic = 3 + (o.look || 0);
        if (o.shine && !o.tiny) {
          cell(ic + 1, 2, '#ffffff');
          if (o.wet) {
            cell(ic + 2, 2, '#ffffff');
            cell(ic + 1, 3, '#ffffff');
            cell(ic + 4, 4, '#e0f2fe');
          }
        }
        if (o.wet) for (let c = 2; c < 10; c++) cell(c, 5, 'rgba(186,230,253,0.85)');
        const rows = o.lid || 0;
        if (rows > 0) {
          for (let r = 0; r < rows; r++) for (let c = 0; c < 12; c++) if (shape[r][c] !== '.') cell(c, r, o.lidColor || '#d6b49a');
          for (let c = 0; c < 12; c++) if (shape[rows][c] !== '.') cell(c, rows, o.line || '#020617');
        }
        if (o.angry) this.finLid(ctx, ex, eyeY, px, sd < 0 ? 1 : -1, 'angry', o.line || '#020617');
      });
    },

    // Neve caindo: quadradinhos (pixel) em camadas; soft = floco perto da lente (borrado)
    mgmSnow(ctx, W, y0, y1, t, n, sz, speed, color, alpha, seed = 1, wind = 0.5, soft = false) {
      const h = y1 - y0;
      const span = W + 160;
      ctx.save();
      ctx.fillStyle = `rgb(${color})`;
      for (let i = 0; i < n; i++) {
        const r1 = rnd(i, seed);
        const r2 = rnd(i, seed + 1);
        const r3 = rnd(i, seed + 2);
        const sp = speed * (0.7 + r3 * 0.6);
        const y = y0 + ((r2 * h + t * sp) % h);
        const x = ((((r1 * span + t * sp * wind + Math.sin(t * 0.02 * (0.5 + r3) + i) * 12 * sz) % span) + span) % span) - 80;
        const s = Math.max(1, Math.round(sz * (0.6 + r3 * 0.8)));
        if (soft) {
          // floco perto da lente: brilho redondo e borrado + um miolo pequeno
          this.cineGlow(ctx, x, y, s * 1.7, 'rgba(240,246,255,0.55)', alpha);
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillRect(Math.round(x - s * 0.2), Math.round(y - s * 0.2), Math.ceil(s * 0.4), Math.ceil(s * 0.4));
          continue;
        }
        ctx.globalAlpha = alpha * (0.6 + 0.4 * r2);
        ctx.fillRect(Math.round(x), Math.round(y), s, s);
      }
      ctx.restore();
    },

    // Bafo no frio: nuvenzinhas subindo da boca
    mgmBreath(ctx, x, y, t, period = 96, seed = 1, sc = 1, dir = 1, amt = 1) {
      for (let j = 0; j < 2; j++) {
        const ph = (t + j * period * 0.5 + seed * 17) % period;
        const k = ph / (period * 0.62);
        if (k > 1) continue;
        this.cineGlow(ctx, x + dir * k * 44 * sc, y - k * 30 * sc, (12 + k * 36) * sc, 'rgba(226,232,240,0.5)', (1 - k) * 0.55 * amt);
      }
    },

    // Plaquinha holográfica com o nome (sala branca)
    mgmHoloTag(ctx, x, y, text, rgb, k, t) {
      if (k <= 0) return;
      ctx.save();
      ctx.font = '900 15px "Segoe UI", sans-serif';
      const w = ctx.measureText(text).width + 34;
      const h = 30;
      const fy = y + Math.sin(t * 0.05 + x) * 2;
      ctx.globalAlpha = Math.min(1, k * 2.5) * (0.9 + 0.1 * Math.sin(t * 0.07 + x));
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.fillRect(x - w / 2, fy - h, w, h);
      ctx.fillStyle = `rgba(${rgb},0.18)`;
      ctx.fillRect(x - w / 2, fy - h, w, h);
      ctx.strokeStyle = `rgba(${rgb},0.95)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x - w / 2, fy - h, w, h);
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.fillRect(x - w / 2, fy - h, 6, h);
      poly(ctx, [[x - 8, fy], [x + 8, fy], [x, fy + 9]]);
      ctx.fill();
      this.finFillPat(ctx, 'scan', x - w / 2, fy - h, w, h, 0.35);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(this.cineType(text, k * 1.4), x + 3, fy - h / 2 + 1);
      ctx.restore();
    },

    // Balão de fala de mangá que estoura (k 0..1), rabicho apontando para (tx, ty)
    mgmBubble(ctx, x, y, text, fs, tx, ty, k) {
      if (k <= 0) return;
      ctx.save();
      const sc = 0.55 + 0.45 * ease(k);
      ctx.translate(x, y);
      ctx.scale(sc, sc);
      ctx.globalAlpha = Math.min(1, k * 3);
      ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      const w = ctx.measureText(text).width + fs * 1.6;
      const h = fs * 2.1;
      const lx = (tx - x) / sc;
      const ly = (ty - y) / sc;
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 5;
      poly(ctx, [[-fs * 0.45, 0], [lx, ly], [fs * 0.45, 0]]);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      poly(ctx, [[-fs * 0.36, 0], [lx * 0.8, ly * 0.8], [fs * 0.36, 0]]);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#020617';
      ctx.fillText(text, 0, fs * 0.06);
      ctx.restore();
    },

    // Versão desfocada de um cenário pronto (reduz pela metade várias vezes e amplia de
    // volta suavizando): fundo dos closes, sem ctx.filter
    // Fica pequeno (1/4 da tela): quem usa amplia suavizando na hora (mgmBlurDraw)
    mgmBlur(key, src, W, H, f = 8) {
      const bw = Math.round(W / 4);
      const bh = Math.round(H / 4);
      return this.finBg(key, bw, bh, (g) => {
        let cur = src;
        while (cur.width > W / f) {
          const nx = document.createElement('canvas');
          nx.width = Math.max(2, Math.round(cur.width / 2));
          nx.height = Math.max(2, Math.round(cur.height / 2));
          const ng = nx.getContext('2d');
          ng.imageSmoothingEnabled = true;
          ng.drawImage(cur, 0, 0, nx.width, nx.height);
          cur = nx;
        }
        while (cur.width * 2 <= bw) {
          const nx = document.createElement('canvas');
          nx.width = cur.width * 2;
          nx.height = cur.height * 2;
          const ng = nx.getContext('2d');
          ng.imageSmoothingEnabled = true;
          ng.drawImage(cur, 0, 0, nx.width, nx.height);
          cur = nx;
        }
        g.imageSmoothingEnabled = true;
        g.drawImage(cur, 0, 0, bw, bh);
      });
    },
    // Desenha um pedaço (em coordenadas da tela cheia) do cenário desfocado
    mgmBlurDraw(ctx, cv, W, sx, sy, sw, sh, dx, dy, dw, dh) {
      const k = cv.width / W;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(cv, sx * k, sy * k, sw * k, sh * k, dx, dy, dw, dh);
      ctx.restore();
    },
    // Câmera que não deixa ver fora do cenário (fundo do tamanho da tela)
    mgmCam(ctx, S, cam) {
      const z = cam.zoom || 1;
      const hw = S.W / 2 / z + (cam.shake || 0) / z + 1;
      const hh = S.H / 2 / z + (cam.shake || 0) / z + 1;
      const x = Math.max(hw, Math.min(S.W - hw, cam.x));
      const y = Math.max(hh, Math.min(S.H - hh, cam.y));
      this.cineCamera(ctx, S.W, S.H, Object.assign({}, cam, { x, y }));
    },

    // Aquecimento: monta antes (um item por quadro, no plano 1) o que os planos usam
    mgmWarm(S, list) {
      if (S.phase !== 0 || S.t < 4) return;
      const run = `${this.sakugaType}|${this._cineRun}`;
      if (this._mgmWarmRun !== run) {
        this._mgmWarmRun = run;
        this._mgmWarmIdx = 0;
      }
      if (this._mgmWarmIdx < list.length) list[this._mgmWarmIdx++].call(this);
    },

    // Cenário pintado em etapas (cada etapa num quadro diferente durante o aquecimento)
    mgmBake(key, W, H, steps, all = true) {
      const c = this._mgmBakes || (this._mgmBakes = {});
      const k = `${key}|${W}x${H}`;
      let b = c[k];
      if (!b) {
        const cv = document.createElement('canvas');
        cv.width = W;
        cv.height = H;
        b = c[k] = { cv, i: 0 };
      }
      const g = b.cv.getContext('2d');
      while (b.i < steps.length) {
        g.save();
        steps[b.i++].call(this, g, W, H);
        g.restore();
        if (!all) {
          // o Chrome só pinta de verdade quando o canvas é usado: força agora, neste quadro
          g.getImageData(0, 0, 1, 1);
          break;
        }
      }
      return b.cv;
    },
    mgmFlush(cv) {
      if (cv) cv.getContext('2d').getImageData(0, 0, 1, 1);
    }
  });

  // ==========================================================================
  // CENÁRIOS
  // ==========================================================================
  Object.assign(CE, {
    // ---------------------------------------------------------------- a sala branca
    // 2ª Seleção: sala toda branca em perspectiva, grade ciano no chão, telão holográfico
    // (pintada em 3 etapas, part 0..2, uma por quadro no aquecimento; sem part = tudo)
    mgmRoomBg(g, w, h, part) {
      const all = part === undefined;
      const vx = w * 0.5;
      const vy = h * 0.44;
      const bx0 = w * 0.29;
      const bx1 = w * 0.71;
      const by0 = h * 0.21;
      const by1 = h * 0.58;
      const lin = (x0, y0, x1, y1, stops) => {
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        stops.forEach(([o, c]) => gr.addColorStop(o, c));
        return gr;
      };
      if (all || part === 0) {
      g.fillStyle = lin(0, 0, 0, by0, [[0, '#c3cedb'], [1, '#e6ecf3']]);
      poly(g, [[0, 0], [w, 0], [bx1, by0], [bx0, by0]]);
      g.fill();
      g.fillStyle = lin(0, 0, bx0, 0, [[0, '#cbd6e2'], [1, '#eef2f7']]);
      poly(g, [[0, 0], [bx0, by0], [bx0, by1], [0, h]]);
      g.fill();
      g.fillStyle = lin(w, 0, bx1, 0, [[0, '#c7d2df'], [1, '#ebf0f6']]);
      poly(g, [[w, 0], [bx1, by0], [bx1, by1], [w, h]]);
      g.fill();
      }
      if (all || part === 1) {
      g.fillStyle = lin(0, by0, 0, by1, [[0, '#f8fafc'], [1, '#e3e9f1']]);
      g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
      g.fillStyle = lin(0, by1, 0, h, [[0, '#e7edf4'], [1, '#d0dae6']]);
      poly(g, [[0, h], [bx0, by1], [bx1, by1], [w, h]]);
      g.fill();
      // luz do teto batendo no chão
      [w * 0.22, w * 0.5, w * 0.78].forEach((x) => this.cineGlow(g, lerp(vx, x, 0.75), h * 0.84, w * 0.17, 'rgba(255,255,255,0.4)'));
      // sombra de canto (onde a parede encontra o chão)
      g.fillStyle = lin(0, by1, 0, by1 + 26, [[0, 'rgba(100,116,139,0.28)'], [1, 'rgba(100,116,139,0)']]);
      g.fillRect(bx0, by1, bx1 - bx0, 26);
      }
      if (all || part === 2) {
      // grade do chão
      g.strokeStyle = 'rgba(56,189,248,0.2)';
      g.lineWidth = 1.5;
      g.beginPath();
      for (let i = -14; i <= 14; i++) {
        const xf = vx + i * 104;
        const xb = vx + ((xf - vx) * (by1 - vy)) / (h - vy);
        g.moveTo(xb, by1);
        g.lineTo(xf, h);
      }
      [1, 1.16, 1.36, 1.62, 1.95, 2.4, 3.0, 3.7].forEach((z) => {
        const y = vy + (h - vy) / z;
        if (y < by1) return;
        const xl = lerp(0, bx0, (h - y) / (h - by1));
        g.moveTo(xl, y);
        g.lineTo(w - xl, y);
      });
      g.stroke();
      // emblema no chão (círculos em perspectiva)
      g.strokeStyle = 'rgba(14,165,233,0.28)';
      g.lineWidth = 3;
      [[0.3, 0.075], [0.21, 0.052]].forEach(([rx, ry]) => {
        g.beginPath();
        g.ellipse(vx, h * 0.83, w * rx, h * ry, 0, 0, TAU);
        g.stroke();
      });
      // emendas das paredes + faixa de luz ciano
      g.strokeStyle = 'rgba(148,163,184,0.45)';
      g.lineWidth = 2;
      g.beginPath();
      [0.16, 0.36, 0.56, 0.76].forEach((k) => {
        g.moveTo(bx0 * k, by0 * k);
        g.lineTo(bx0 * k, h + (by1 - h) * k);
        const xr = w - (w - bx1) * k;
        g.moveTo(xr, by0 * k);
        g.lineTo(xr, h + (by1 - h) * k);
      });
      g.stroke();
      const strip = (side) => {
        const xa = side < 0 ? 0 : w;
        const xb = side < 0 ? bx0 : bx1;
        const ya = (f) => lerp(0, h, f);
        const yb = (f) => lerp(by0, by1, f);
        poly(g, [[xa, ya(0.6)], [xb, yb(0.6)], [xb, yb(0.615)], [xa, ya(0.635)]]);
        g.fillStyle = 'rgba(56,189,248,0.6)';
        g.fill();
      };
      strip(-1);
      strip(1);
      g.strokeStyle = 'rgba(100,116,139,0.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(bx0, by0);
      g.lineTo(bx0, by1);
      g.lineTo(0, h);
      g.moveTo(w, 0);
      g.lineTo(bx1, by0);
      g.lineTo(bx1, by1);
      g.lineTo(w, h);
      g.moveTo(bx0, by0);
      g.lineTo(bx1, by0);
      g.moveTo(bx0, by1);
      g.lineTo(bx1, by1);
      g.stroke();
      // painéis de luz do teto
      const f = (vy - by0) / vy;
      [w * 0.2, w * 0.5, w * 0.8].forEach((xf) => {
        const hw = w * 0.045;
        const xb = vx + (xf - vx) * f;
        const pts = [[xf - hw, 0], [xf + hw, 0], [xb + hw * f, by0 - 6], [xb - hw * f, by0 - 6]];
        poly(g, pts);
        g.fillStyle = '#ffffff';
        g.fill();
        g.strokeStyle = 'rgba(125,211,252,0.85)';
        g.lineWidth = 2;
        g.stroke();
      });
      }
      // telão holográfico na parede do fundo
      const sx = bx0 + (bx1 - bx0) * 0.18;
      const sw = (bx1 - bx0) * 0.64;
      const sy = by0 + 28;
      const sh = 140;
      if (all || part === 3) {
      g.fillStyle = 'rgba(186,230,253,0.5)';
      g.fillRect(sx, sy, sw, sh);
      g.fillStyle = 'rgba(14,165,233,0.12)';
      for (let y = sy; y < sy + sh; y += 4) g.fillRect(sx, y, sw, 2);
      g.strokeStyle = '#38bdf8';
      g.lineWidth = 3;
      g.strokeRect(sx, sy, sw, sh);
      g.strokeStyle = '#0c4a6e';
      g.lineWidth = 4;
      g.beginPath();
      [[sx, sy, 1, 1], [sx + sw, sy, -1, 1], [sx, sy + sh, 1, -1], [sx + sw, sy + sh, -1, -1]].forEach(([x, y, a, b]) => {
        g.moveTo(x, y + b * 18);
        g.lineTo(x, y);
        g.lineTo(x + a * 18, y);
      });
      g.stroke();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = 'italic 900 40px "Segoe UI", sans-serif';
      g.fillStyle = '#0c4a6e';
      g.fillText('2ª SELEÇÃO', sx + sw / 2, sy + 52);
      g.font = '900 14px "Segoe UI", sans-serif';
      g.fillStyle = '#0369a1';
      g.fillText('E S C O L H A   D E   P A R C E I R O', sx + sw / 2, sy + 92);
      g.fillStyle = 'rgba(3,105,161,0.55)';
      g.fillRect(sx + sw / 2 - 90, sy + 108, 180, 3);
      g.font = '800 12px "Segoe UI", sans-serif';
      g.fillText('3 x 3  •  O VENCEDOR ESCOLHE  •  1 VAGA', sx + sw / 2, sy + 124);
      }
      if (!(all || part === 4)) return;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      // painéis menores (barras de ranking)
      [[bx0 + 18, 1], [bx1 - 78, -1]].forEach(([x, s]) => {
        g.fillStyle = 'rgba(186,230,253,0.42)';
        g.fillRect(x, sy + 10, 60, 118);
        g.strokeStyle = 'rgba(56,189,248,0.8)';
        g.lineWidth = 2;
        g.strokeRect(x, sy + 10, 60, 118);
        for (let i = 0; i < 6; i++) {
          g.fillStyle = i === 0 ? 'rgba(14,165,233,0.75)' : 'rgba(14,165,233,0.35)';
          g.fillRect(x + 8, sy + 22 + i * 17, 14 + ((i * 37 + (s > 0 ? 11 : 29)) % 30), 8);
        }
      });
      // porta de saída
      const dx = bx1 - 64;
      g.fillStyle = '#cbd5e1';
      g.fillRect(dx - 4, by1 - 96, 52, 96);
      g.fillStyle = '#e2e8f0';
      g.fillRect(dx, by1 - 92, 44, 92);
      g.fillStyle = '#94a3b8';
      g.fillRect(dx + 36, by1 - 50, 4, 10);
      g.fillStyle = '#16a34a';
      g.fillRect(dx - 2, by1 - 114, 48, 12);
      g.font = '900 9px "Segoe UI", sans-serif';
      g.fillStyle = '#f0fdf4';
      g.fillText('SAÍDA', dx + 22, by1 - 108);
      // brilho geral (a sala estoura de branco no meio)
      this.cineGlow(g, vx, vy, w * 0.45, 'rgba(255,255,255,0.35)');
    },

    // ---------------------------------------------------------------- a praia de Kamakura
    // Pôr do sol de verão: Enoshima no horizonte, o reflexo dourado, as sandálias de trave
    // (2 etapas: part 0 = céu, sol e morros; part 1 = mar e areia; sem part = tudo)
    mgmBeachBg(g, w, h, part) {
      const all = part === undefined;
      const hz = h * 0.56;
      const sunX = w * 0.7;
      const sunY = hz - 16;
      if (all || part === 0) {
      const R = this.mgmRng(2112);
      this.cineGradient(g, 0, 0, w, hz, [[0, '#2b1a46'], [0.35, '#8a3b63'], [0.7, '#ee8a4f'], [1, '#ffd28a']]);
      // nuvens compridas acesas por baixo
      for (let i = 0; i < 11; i++) {
        const x = R() * w;
        const y = h * 0.08 + R() * hz * 0.6;
        const len = 120 + R() * 260;
        const th = 6 + R() * 12;
        g.fillStyle = 'rgba(90,36,80,0.45)';
        g.beginPath();
        g.ellipse(x, y, len / 2, th, 0, 0, TAU);
        g.fill();
        g.fillStyle = `rgba(255,${150 + Math.round(R() * 60)},120,0.45)`;
        g.beginPath();
        g.ellipse(x + 6, y + th * 0.45, len * 0.45, th * 0.45, 0, 0, TAU);
        g.fill();
      }
      this.cineGlow(g, sunX, sunY, 360, 'rgba(255,190,110,0.55)');
      this.cineGlow(g, sunX, sunY, 140, 'rgba(255,236,170,0.8)');
      g.fillStyle = '#fff3c4';
      g.beginPath();
      g.arc(sunX, sunY, 44, Math.PI, 0);
      g.lineTo(sunX + 44, hz);
      g.lineTo(sunX - 44, hz);
      g.fill();
      // morros de Kamakura (esquerda) e Enoshima com o farol (direita)
      const hill = (x0, x1, peak, col) => {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(x0, hz + 1);
        for (let x = x0; x <= x1; x += 6) {
          const k = (x - x0) / (x1 - x0);
          g.lineTo(x, hz - peak * Math.sin(k * Math.PI) * (0.8 + 0.2 * Math.sin(k * 17)));
        }
        g.lineTo(x1, hz + 1);
        g.fill();
      };
      hill(-40, w * 0.36, 70, '#7a3b5f');
      hill(-80, w * 0.2, 104, '#5b2d55');
      hill(w * 0.79, w * 0.98, 52, '#4a2244');
      hill(w * 0.86, w * 0.95, 70, '#43203f');
      g.fillStyle = '#3b1a3a';
      g.fillRect(w * 0.902, hz - 118, 8, 60);
      g.fillRect(w * 0.897, hz - 124, 18, 8);
      this.cineGlow(g, w * 0.906, hz - 124, 18, 'rgba(255,247,214,0.9)');
      }
      if (!(all || part === 1)) return;
      const R = this.mgmRng(2113);
      // mar
      this.cineGradient(g, 0, hz, w, h * 0.19, [[0, '#f4a261'], [0.3, '#c76a6a'], [1, '#4c3270']]);
      g.fillStyle = 'rgba(255,226,170,0.85)';
      for (let i = 0; i < 28; i++) {
        const y = hz + 3 + i * 4.6;
        const ww = (12 + i * 5) * (0.5 + R() * 0.8);
        g.globalAlpha = 0.85 - i * 0.025;
        g.fillRect(sunX - ww / 2 + (R() - 0.5) * i * 3, y, ww, 2);
      }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,220,200,0.22)';
      for (let i = 0; i < 40; i++) g.fillRect(R() * w, hz + 8 + R() * h * 0.17, 20 + R() * 60, 2);
      // areia molhada + espuma
      const ys = h * 0.745;
      this.cineGradient(g, 0, ys, w, h * 0.04, [[0, '#a8654f'], [1, '#c9845a']]);
      g.fillStyle = 'rgba(255,214,170,0.25)';
      g.fillRect(sunX - 80, ys + 2, 160, h * 0.035);
      this.cineGradient(g, 0, ys + h * 0.035, w, h - ys, [[0, '#e3a46d'], [1, '#b8774a']]);
      g.strokeStyle = 'rgba(255,246,236,0.85)';
      g.lineWidth = 3;
      g.beginPath();
      for (let x = -10; x <= w + 10; x += 8) {
        const y = ys - 2 + Math.sin(x * 0.02) * 3 + Math.sin(x * 0.051) * 2;
        x <= -10 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
      // grãos e pegadas na areia
      for (let i = 0; i < 260; i++) {
        g.fillStyle = R() < 0.5 ? 'rgba(120,70,40,0.25)' : 'rgba(255,230,190,0.3)';
        g.fillRect(R() * w, ys + h * 0.05 + R() * h * 0.2, 2, 2);
      }
      g.fillStyle = 'rgba(120,64,36,0.35)';
      for (let i = 0; i < 14; i++) {
        const x = 520 + i * 26 + (i % 2) * 6;
        g.beginPath();
        g.ellipse((x / 1280) * w, h * (0.86 + (i % 2) * 0.012), 7, 3, 0, 0, TAU);
        g.fill();
      }
      // as sandálias de trave (o gol dos dois)
      [[0.12, '#2563eb'], [0.2, '#2563eb']].forEach(([fx, col]) => {
        const x = w * fx;
        const y = h * 0.85;
        g.fillStyle = 'rgba(90,40,30,0.3)';
        g.fillRect(x - 12, y + 8, 30, 4);
        g.fillStyle = col;
        g.fillRect(x - 10, y, 10, 8);
        g.fillRect(x + 4, y + 1, 10, 8);
        g.fillStyle = '#facc15';
        g.fillRect(x - 6, y, 2, 4);
        g.fillRect(x + 8, y + 1, 2, 4);
      });
      // gaivotas
      g.strokeStyle = 'rgba(60,20,50,0.7)';
      g.lineWidth = 2;
      [[0.42, 0.2], [0.47, 0.24], [0.6, 0.15]].forEach(([fx, fy]) => {
        const x = w * fx;
        const y = h * fy;
        g.beginPath();
        g.moveTo(x - 9, y - 3);
        g.lineTo(x, y + 2);
        g.lineTo(x + 9, y - 3);
        g.stroke();
      });
    },

    mgmBeach(W, H, step) {
      const steps = [0, 1].map((p) =>
        function (g, w, h) {
          this.mgmBeachBg(g, w, h, p);
        }
      );
      return this.mgmBake('mgm_beach', W, H, steps, !step);
    },

    // Os dois meninos, a bola indo e voltando (t pode ser "congelado")
    mgmKids(ctx, t) {
      const c = this.mgmCast();
      const gy = 600;
      const sx = 470;
      const rx = 800;
      const T = 100;
      const half = T / 2;
      const ph = ((t % T) + T) % T;
      const fromSae = ph < half;
      const q = (fromSae ? ph : ph - half) / half;
      const ax = fromSae ? sx + 30 : rx - 26;
      const bx = fromSae ? rx - 26 : sx + 30;
      const bxp = lerp(ax, bx, q);
      const byp = gy - 12 - Math.sin(q * Math.PI) * 74;
      ctx.fillStyle = 'rgba(110,50,30,0.3)';
      [[sx, 46, 9], [rx, 40, 8]].forEach(([x, rx2, ry]) => {
        ctx.beginPath();
        ctx.ellipse(x, gy + 2, rx2, ry, 0, 0, TAU);
        ctx.fill();
      });
      ctx.beginPath();
      ctx.ellipse(bxp, gy + 2, 12 * (1 - 0.4 * Math.sin(q * Math.PI)), 4, 0, 0, TAU);
      ctx.fill();
      const saeKick = fromSae && ph < 12;
      const rinKick = !fromSae && ph - half < 12;
      this.finSpr(ctx, c.saeKid, sx, gy, 150, saeKick ? { animState: 'shoot' } : {});
      this.finSpr(ctx, c.rinKid, rx, gy, 128, rinKick ? { animState: 'shoot', flipX: true } : {});
      this.mgmBall(ctx, bxp, byp, 11, t / 6);
    },

    // A lembrança pronta (a foto da praia que vai congelar e quebrar)
    mgmBeachMem(g, w, h) {
      g.drawImage(this.mgmBeach(w, h), 0, 0);
      this.mgmKids(g, 26);
      g.fillStyle = 'rgba(255,170,90,0.12)';
      g.fillRect(0, 0, w, h);
      this.cineGlow(g, w * 0.08, h * 0.15, 420, 'rgba(255,170,90,0.4)');
    },
    // Vinheta quente (das lembranças), pronta
    mgmWarmVig(g, w, h) {
      const grd = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.56);
      grd.addColorStop(0, 'rgba(60,24,6,0)');
      grd.addColorStop(1, 'rgba(60,24,6,0.6)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    },

    // ---------------------------------------------------------------- a rua de Kamakura na neve
    mgmSnowGeo(W, H) {
      const vpx = W * 0.5;
      const vpy = H * 0.47;
      const yG = H * 1.28;
      return { vpx, vpy, yG, camH: yG - vpy, s: H / 720, X: (xn, z) => vpx + (xn - vpx) / z, Y: (yn, z) => vpy + (yn - vpy) / z };
    },
    mgmLampGeo(W, H, lampX) {
      const s = H / 720;
      const dir = lampX < W / 2 ? 1 : -1;
      return { x: lampX, s, dir, baseY: H * 0.95, topY: H * 0.14, headX: lampX + dir * 62 * s, headY: H * 0.165, poolY: H * 0.86 };
    },
    // parede vertical (plano x = xn) entre z0 e z1, da altura ya até yb
    mgmQuad(g, P, xn0, z0, xn1, z1, ya, yb, style) {
      poly(g, [[P.X(xn0, z0), P.Y(ya, z0)], [P.X(xn1, z1), P.Y(ya, z1)], [P.X(xn1, z1), P.Y(yb, z1)], [P.X(xn0, z0), P.Y(yb, z0)]]);
      g.fillStyle = style;
      g.fill();
    },
    // faixa horizontal (chão, parte de baixo do beiral) na altura yn
    mgmFlat(g, P, xa, xb, z0, z1, yn, style) {
      poly(g, [[P.X(xa, z0), P.Y(yn, z0)], [P.X(xb, z0), P.Y(yn, z0)], [P.X(xb, z1), P.Y(yn, z1)], [P.X(xa, z1), P.Y(yn, z1)]]);
      g.fillStyle = style;
      g.fill();
    },

    // Etapa 1: céu de neve, morros, o torii no fim da rua e o santuário no morro
    mgmSnowSky(g, W, H, part) {
      const P = this.mgmSnowGeo(W, H);
      const s = P.s;
      if (part === undefined || part === 0) this.cineGradient(g, 0, 0, W, P.vpy + 60 * s, [[0, '#02040b'], [0.55, '#0b1428'], [1, '#27344f']]);
      if (part === undefined || part === 2) {
        const R0 = this.mgmRng(4401);
        for (let i = 0; i < 4; i++) this.cineGlow(g, R0() * W, R0() * P.vpy * 0.7, (100 + R0() * 100) * s, 'rgba(44,58,92,0.5)');
        this.cineGlow(g, P.vpx, P.vpy, 380 * s, 'rgba(255,186,140,0.13)');
      }
      if (part === 0 || part === 2) return;
      const R = this.mgmRng(4402);
      const ridge = (base, amp, col, seed, trees) => {
        const top = (x) => base - amp * (0.6 + 0.4 * Math.sin(x * 0.0042 + seed) * Math.sin(x * 0.0117 + seed * 2.3));
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0, base + 80 * s);
        for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, top(x));
        g.lineTo(W, base + 80 * s);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(205,220,242,0.32)';
        g.lineWidth = 2 * s;
        g.beginPath();
        for (let x = 0; x <= W + 8; x += 8) (x ? g.lineTo(x, top(x)) : g.moveTo(x, top(x)));
        g.stroke();
        if (!trees) return;
        for (let x = 4; x < W; x += 9 + R() * 10) {
          const y = top(x);
          const th = (8 + R() * 10) * s;
          g.fillStyle = '#060a14';
          poly(g, [[x - th * 0.35, y + 2], [x, y - th], [x + th * 0.35, y + 2]]);
          g.fill();
          g.fillStyle = 'rgba(220,232,248,0.55)';
          g.fillRect(x - 1, y - th, 2, 2 * s);
        }
      };
      ridge(P.vpy - 18 * s, 70 * s, '#16203a', 1.3, false);
      ridge(P.vpy + 6 * s, 52 * s, '#0e1629', 4.1, true);
      // o santuário no morro (Tsurugaoka): telhado escuro com lanternas acesas
      const sx = P.vpx;
      const sy = P.vpy - 30 * s;
      g.fillStyle = '#0a0f1c';
      poly(g, [[sx - 96 * s, sy + 6 * s], [sx - 70 * s, sy - 16 * s], [sx + 70 * s, sy - 16 * s], [sx + 96 * s, sy + 6 * s]]);
      g.fill();
      g.fillStyle = 'rgba(226,236,250,0.8)';
      poly(g, [[sx - 92 * s, sy + 4 * s], [sx - 70 * s, sy - 16 * s], [sx + 70 * s, sy - 16 * s], [sx + 92 * s, sy + 4 * s], [sx + 70 * s, sy - 11 * s], [sx - 70 * s, sy - 11 * s]]);
      g.fill();
      g.fillStyle = '#120c08';
      g.fillRect(sx - 64 * s, sy + 6 * s, 128 * s, 26 * s);
      for (let i = 0; i < 6; i++) {
        const x = sx - 54 * s + i * 21.6 * s;
        g.fillStyle = 'rgba(255,190,110,0.85)';
        g.fillRect(x, sy + 12 * s, 9 * s, 12 * s);
        this.cineGlow(g, x + 4 * s, sy + 18 * s, 22 * s, 'rgba(255,170,90,0.6)');
      }
      // escadaria iluminada descendo do santuário
      for (let i = 0; i < 9; i++) {
        const y = sy + 34 * s + i * 4.6 * s;
        const ww = (40 + i * 7) * s;
        g.fillStyle = i % 2 ? 'rgba(200,214,236,0.5)' : 'rgba(120,136,168,0.45)';
        g.fillRect(sx - ww / 2, y, ww, 2.4 * s);
      }
      // o torii vermelho no fim da rua (com neve em cima)
      const zT = 7.6;
      const gy = P.Y(P.yG, zT);
      const tH = P.camH * 2.25;
      const pw = W * 0.34;
      const X = (xn) => P.X(xn, zT);
      const Y = (yn) => P.Y(yn, zT);
      const pillar = (xn) => {
        const x = X(xn);
        const ww = (W * 0.028) / zT;
        g.fillStyle = '#8f2a12';
        g.fillRect(x - ww / 2, Y(P.yG - tH * 0.98), ww, gy - Y(P.yG - tH * 0.98));
        g.fillStyle = 'rgba(255,170,120,0.25)';
        g.fillRect(x - ww / 2, Y(P.yG - tH * 0.98), ww * 0.3, gy - Y(P.yG - tH * 0.98));
        g.fillStyle = '#1a0f0a';
        g.fillRect(x - ww * 0.7, gy - 6 * s, ww * 1.4, 6 * s);
      };
      pillar(P.vpx - pw / 2);
      pillar(P.vpx + pw / 2);
      const nukiY = Y(P.yG - tH * 0.78);
      g.fillStyle = '#9a3412';
      g.fillRect(X(P.vpx - pw * 0.64), nukiY, X(P.vpx + pw * 0.64) - X(P.vpx - pw * 0.64), (P.camH * 0.08) / zT);
      g.fillStyle = '#7c2d12';
      g.fillRect(P.vpx - 3 * s, nukiY - 16 * s, 6 * s, 16 * s);
      const ky = Y(P.yG - tH);
      const kx0 = X(P.vpx - pw * 0.78);
      const kx1 = X(P.vpx + pw * 0.78);
      const kh = (P.camH * 0.16) / zT;
      g.fillStyle = '#a3341a';
      poly(g, [[kx0 - 6 * s, ky - 7 * s], [kx0 + 10 * s, ky], [kx1 - 10 * s, ky], [kx1 + 6 * s, ky - 7 * s], [kx1, ky + kh], [kx0, ky + kh]]);
      g.fill();
      g.fillStyle = '#1a0f0a';
      g.fillRect(kx0 + 6 * s, ky - 2 * s, kx1 - kx0 - 12 * s, 3 * s);
      g.fillStyle = '#e8eef8';
      poly(g, [[kx0 - 6 * s, ky - 9 * s], [kx0 + 10 * s, ky - 4 * s], [kx1 - 10 * s, ky - 4 * s], [kx1 + 6 * s, ky - 9 * s], [kx1 - 4 * s, ky - 12 * s], [kx0 + 4 * s, ky - 12 * s]]);
      g.fill();
      [-1, 1].forEach((sd) => {
        const x = P.vpx + sd * (pw / 2 / zT + 16 * s);
        g.fillStyle = '#2a2f3a';
        g.fillRect(x - 3 * s, gy - 22 * s, 6 * s, 22 * s);
        g.fillStyle = 'rgba(255,200,130,0.9)';
        g.fillRect(x - 4 * s, gy - 30 * s, 8 * s, 8 * s);
        this.cineGlow(g, x, gy - 26 * s, 26 * s, 'rgba(255,170,90,0.7)');
      });
      // névoa da neve no fundo
      const fog = g.createLinearGradient(0, P.vpy - 90 * s, 0, P.vpy + 60 * s);
      fog.addColorStop(0, 'rgba(150,170,205,0)');
      fog.addColorStop(0.6, 'rgba(150,170,205,0.2)');
      fog.addColorStop(1, 'rgba(150,170,205,0)');
      g.fillStyle = fog;
      g.fillRect(0, P.vpy - 90 * s, W, 150 * s);
    },

    // Etapa 2: o chão de neve (marcas de pneu, montes nas calçadas, pegadas)
    mgmSnowGround(g, W, H) {
      const P = this.mgmSnowGeo(W, H);
      const s = P.s;
      const zM = 11;
      g.fillStyle = (() => {
        const gr = g.createLinearGradient(0, P.Y(P.yG, zM), 0, H);
        gr.addColorStop(0, '#4b5a7a');
        gr.addColorStop(0.25, '#6b7da0');
        gr.addColorStop(1, '#c2cee2');
        return gr;
      })();
      poly(g, [[-W, H * 1.2], [-W, P.Y(P.yG, zM)], [2 * W, P.Y(P.yG, zM)], [2 * W, H * 1.2]]);
      g.fill();
      // marcas de pneu
      [-0.2, -0.11, 0.11, 0.2].forEach((f) => this.mgmFlat(g, P, P.vpx + W * f - W * 0.018, P.vpx + W * f + W * 0.018, 1, zM, P.yG, 'rgba(46,60,92,0.34)'));
      // montes de neve na beira da rua
      [-1, 1].forEach((sd) => {
        const xb = sd < 0 ? -W * 0.3 : W * 1.3;
        const xo = sd < 0 ? -W * 0.42 : W * 1.42;
        this.mgmFlat(g, P, Math.min(xb, xo), Math.max(xb, xo), 1, zM, P.yG, 'rgba(206,218,236,0.55)');
        this.mgmQuad(g, P, xb, 1, xb, zM, P.yG - P.camH * 0.16, P.yG, '#d3deec');
        this.mgmQuad(g, P, xb, 1, xb, zM, P.yG - P.camH * 0.16, P.yG - P.camH * 0.13, '#f1f5fb');
      });
      // pegadas atravessando a rua
      g.fillStyle = 'rgba(48,62,96,0.42)';
      for (let i = 0; i < 26; i++) {
        const z = 1.25 + i * 0.22;
        const xn = lerp(W * 0.62, W * 0.47, i / 26) + (i % 2 ? 1 : -1) * W * 0.014;
        const x = P.X(xn, z);
        const y = P.Y(P.yG, z);
        const rx = (W * 0.011) / z;
        g.beginPath();
        g.ellipse(x, y, rx, rx * 0.4, 0, 0, TAU);
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.25)';
      const R = this.mgmRng(77);
      for (let i = 0; i < 200; i++) g.fillRect(R() * W, P.vpy + 40 * s + R() * (H - P.vpy), 2 * s, 2 * s);
    },

    // Etapas 3 e 4: as casas de madeira de um lado da rua (telhado e beiral com neve,
    // pingentes de gelo, vitrines acesas, noren, lanternas vermelhas)
    mgmSnowSide(g, W, H, side) {
      const P = this.mgmSnowGeo(W, H);
      const R = this.mgmRng(side < 0 ? 777 : 991);
      const s = P.s;
      const xw = side < 0 ? -W * 0.42 : W * 1.42;
      const in1 = -side * W * 0.05;
      const in2 = -side * W * 0.075;
      const houses = [];
      let z = 1.1;
      while (z < 10) {
        const dz = 0.85 + R() * 0.7;
        houses.push({ z0: z, z1: z + dz, hT: P.camH * (2.6 + R() * 1.0), wood: R() < 0.5 ? '#1c1712' : '#231b14', lit: R() < 0.75, lit2: R() < 0.55, noren: R() < 0.5, lantern: R() < 0.4 });
        z += dz + 0.07;
      }
      this.mgmQuad(g, P, xw, 1, xw, 10.5, P.yG - P.camH * 3.8, P.yG, '#05070c');
      houses.reverse().forEach((hs) => {
        const { z0, z1 } = hs;
        const zm = (z0 + z1) / 2;
        const top = P.yG - hs.hT;
        const mid = P.yG - P.camH * 1.55;
        this.mgmQuad(g, P, xw, z0, xw, z1, top, P.yG, hs.wood);
        for (let q = z0 + 0.09; q < z1 - 0.02; q += 0.12) this.mgmQuad(g, P, xw, q, xw, q + 0.014, top, P.yG, 'rgba(0,0,0,0.35)');
        // térreo: vitrine com treliça
        const wa = z0 + 0.12;
        const wb = z1 - 0.12;
        this.mgmQuad(g, P, xw, wa, xw, wb, P.yG - P.camH * 1.3, P.yG - P.camH * 0.12, hs.lit ? 'rgba(255,196,120,0.95)' : '#0f131b');
        if (hs.lit) {
          for (let q = wa + 0.1; q < wb; q += 0.1) this.mgmQuad(g, P, xw, q, xw, q + 0.012, P.yG - P.camH * 1.3, P.yG - P.camH * 0.12, 'rgba(74,47,22,0.85)');
          this.mgmQuad(g, P, xw, wa, xw, wb, P.yG - P.camH * 0.74, P.yG - P.camH * 0.7, 'rgba(74,47,22,0.85)');
          this.cineGlow(g, P.X(xw + in1 * 1.6, zm), P.Y(P.yG, zm), (P.camH * 0.9) / zm, 'rgba(255,170,90,0.4)');
        }
        if (hs.noren) {
          const na = lerp(wa, wb, 0.25);
          const nb = lerp(wa, wb, 0.75);
          this.mgmQuad(g, P, xw, na, xw, nb, P.yG - P.camH * 1.3, P.yG - P.camH * 1.0, '#1e3a8a');
          this.mgmQuad(g, P, xw, lerp(na, nb, 0.48), xw, lerp(na, nb, 0.52), P.yG - P.camH * 1.3, P.yG - P.camH * 1.0, '#0b1d4d');
          this.mgmQuad(g, P, xw, lerp(na, nb, 0.2), xw, lerp(na, nb, 0.3), P.yG - P.camH * 1.2, P.yG - P.camH * 1.1, 'rgba(241,245,249,0.85)');
        }
        // andar de cima: janela de shoji
        const ua = z0 + 0.25;
        const ub = z1 - 0.25;
        const uy0 = top + P.camH * 0.45;
        const uy1 = mid - P.camH * 0.28;
        if (ub > ua && uy1 > uy0) {
          this.mgmQuad(g, P, xw, ua, xw, ub, uy0, uy1, hs.lit2 ? 'rgba(255,214,150,0.88)' : '#0d1018');
          if (hs.lit2) {
            for (let q = ua + 0.08; q < ub; q += 0.08) this.mgmQuad(g, P, xw, q, xw, q + 0.01, uy0, uy1, 'rgba(90,60,30,0.7)');
            [0.33, 0.66].forEach((f) => this.mgmQuad(g, P, xw, ua, xw, ub, lerp(uy0, uy1, f), lerp(uy0, uy1, f) + P.camH * 0.025, 'rgba(90,60,30,0.7)'));
          }
        }
        // beiral do meio com neve
        this.mgmFlat(g, P, Math.min(xw, xw + in1), Math.max(xw, xw + in1), z0, z1, mid, '#0b0e15');
        this.mgmQuad(g, P, xw + in1, z0 - 0.02, xw + in1, z1 + 0.02, mid - P.camH * 0.1, mid + P.camH * 0.02, '#dbe4f0');
        this.mgmQuad(g, P, xw + in1, z0 - 0.02, xw + in1, z1 + 0.02, mid - P.camH * 0.01, mid + P.camH * 0.02, '#9fb0c8');
        // telhado: beiral escuro + neve grossa + pingentes
        this.mgmFlat(g, P, Math.min(xw, xw + in2), Math.max(xw, xw + in2), z0 - 0.04, z1 + 0.04, top, '#07090e');
        this.mgmQuad(g, P, xw + in2, z0 - 0.06, xw + in2, z1 + 0.06, top - P.camH * 0.18, top + P.camH * 0.035, '#e6edf7');
        this.mgmQuad(g, P, xw + in2, z0 - 0.06, xw + in2, z1 + 0.06, top - P.camH * 0.18, top - P.camH * 0.15, '#ffffff');
        this.mgmQuad(g, P, xw + in2, z0 - 0.06, xw + in2, z1 + 0.06, top + P.camH * 0.005, top + P.camH * 0.035, '#a9b9d0');
        g.fillStyle = 'rgba(226,236,250,0.9)';
        for (let q = z0; q < z1; q += 0.07 + R() * 0.06) {
          const x = P.X(xw + in2, q);
          const y = P.Y(top + P.camH * 0.035, q);
          const len = (P.camH * (0.05 + R() * 0.12)) / q;
          const ww = Math.max(1.5, (P.camH * 0.018) / q);
          poly(g, [[x - ww, y], [x + ww, y], [x, y + len]]);
          g.fill();
        }
        // lanterna vermelha pendurada
        if (hs.lantern) {
          const x = P.X(xw + in1 * 0.75, zm);
          const y = P.Y(mid + P.camH * 0.28, zm);
          const rr = (P.camH * 0.1) / zm;
          this.cineGlow(g, x, y, rr * 5, 'rgba(239,68,68,0.45)');
          g.fillStyle = '#dc2626';
          g.beginPath();
          g.ellipse(x, y, rr * 0.8, rr, 0, 0, TAU);
          g.fill();
          g.fillStyle = 'rgba(127,29,29,0.8)';
          for (let i = -1; i <= 1; i++) g.fillRect(x - rr * 0.8, y + i * rr * 0.4, rr * 1.6, Math.max(1, rr * 0.08));
          g.fillStyle = '#111827';
          g.fillRect(x - rr * 0.5, y - rr * 1.1, rr, rr * 0.2);
          g.fillRect(x - rr * 0.5, y + rr * 0.92, rr, rr * 0.2);
          g.fillStyle = 'rgba(255,220,180,0.6)';
          g.fillRect(x - rr * 0.5, y - rr * 0.5, rr * 0.2, rr * 0.8);
        }
      });
      // postes de fiação com neve nas cruzetas
      const zs = side < 0 ? [1.6, 3.0, 5.2, 8.4] : [2.2, 4.0, 7.0];
      const xp = side < 0 ? -W * 0.355 : W * 1.355;
      const ends = [];
      zs.slice().reverse().forEach((zp) => {
        const x = P.X(xp, zp);
        const yb = P.Y(P.yG, zp);
        const yt = P.Y(P.yG - P.camH * 4.6, zp);
        const pw = Math.max(2, (W * 0.016) / zp);
        g.fillStyle = '#05070d';
        g.fillRect(x - pw / 2, yt, pw, yb - yt);
        g.fillStyle = 'rgba(150,170,210,0.3)';
        g.fillRect(x + pw / 2 - 1, yt, 1, yb - yt);
        const ya = P.Y(P.yG - P.camH * 4.0, zp);
        const arm = (W * 0.07) / zp;
        g.fillStyle = '#05070d';
        g.fillRect(x - arm, ya, arm * 2, pw * 0.6);
        g.fillStyle = '#e2e8f0';
        g.fillRect(x - arm, ya - pw * 0.35, arm * 2, pw * 0.35);
        ends.push([x, ya, arm, zp]);
      });
      ends.reverse();
      g.strokeStyle = 'rgba(3,5,10,0.9)';
      for (let i = 0; i < ends.length - 1; i++) {
        const [x0, y0, a0, z0] = ends[i];
        const [x1, y1, a1] = ends[i + 1];
        g.lineWidth = Math.max(1, (2.4 * s) / Math.sqrt(z0));
        [-1, 0, 1].forEach((f) => {
          g.beginPath();
          g.moveTo(x0 + a0 * f * 0.9, y0);
          g.quadraticCurveTo((x0 + x1) / 2 + (a0 + a1) * f * 0.45, (y0 + y1) / 2 + (H * 0.05) / z0, x1 + a1 * f * 0.9, y1);
          g.stroke();
        });
      }
      const [fx, fy, fa] = ends[0];
      g.lineWidth = 2 * s;
      [-1, 0, 1].forEach((f, i) => {
        g.beginPath();
        g.moveTo(fx + fa * f * 0.9, fy);
        g.quadraticCurveTo(fx + side * -W * 0.2, fy - H * 0.12, fx + side * -W * 0.5, fy - H * (0.32 + i * 0.04));
        g.stroke();
      });
    },

    // Etapa 5: os objetos da rua (lanterna de pedra, máquina de bebidas, fio cruzando)
    mgmSnowProps(g, W, H) {
      const P = this.mgmSnowGeo(W, H);
      const s = P.s;
      // fio cruzando a rua
      g.strokeStyle = 'rgba(3,5,10,0.85)';
      g.lineWidth = 1.5 * s;
      g.beginPath();
      g.moveTo(P.X(-W * 0.355, 3.0), P.Y(P.yG - P.camH * 4.0, 3.0));
      g.quadraticCurveTo(P.vpx, P.Y(P.yG - P.camH * 3.2, 3.4), P.X(W * 1.355, 4.0), P.Y(P.yG - P.camH * 4.0, 4.0));
      g.stroke();
      // lanterna de pedra (tōrō) com chapéu de neve, na calçada da esquerda
      {
        const z = 3.3;
        const x = P.X(-W * 0.36, z);
        const yb = P.Y(P.yG, z);
        const u = (P.camH * 0.9) / z / 10;
        g.fillStyle = '#3b4252';
        g.fillRect(x - 2.2 * u, yb - 1.4 * u, 4.4 * u, 1.4 * u);
        g.fillRect(x - 0.9 * u, yb - 5 * u, 1.8 * u, 3.8 * u);
        g.fillRect(x - 2 * u, yb - 5.8 * u, 4 * u, 0.9 * u);
        g.fillStyle = '#2b303b';
        g.fillRect(x - 1.5 * u, yb - 8.2 * u, 3 * u, 2.5 * u);
        g.fillStyle = 'rgba(255,200,130,0.95)';
        g.fillRect(x - 0.8 * u, yb - 7.7 * u, 1.6 * u, 1.5 * u);
        this.cineGlow(g, x, yb - 7 * u, 4 * u, 'rgba(255,170,90,0.55)');
        g.fillStyle = '#3b4252';
        poly(g, [[x - 2.8 * u, yb - 8.2 * u], [x + 2.8 * u, yb - 8.2 * u], [x + 1.2 * u, yb - 9.6 * u], [x - 1.2 * u, yb - 9.6 * u]]);
        g.fill();
        g.fillStyle = '#eef3fa';
        poly(g, [[x - 2.9 * u, yb - 8.4 * u], [x - 1.2 * u, yb - 9.8 * u], [x + 1.2 * u, yb - 9.8 * u], [x + 2.9 * u, yb - 8.4 * u], [x + 2 * u, yb - 8.9 * u], [x - 2 * u, yb - 8.9 * u]]);
        g.fill();
        g.fillRect(x - 2.2 * u, yb - 1.7 * u, 4.4 * u, 0.4 * u);
      }
      // máquina de bebidas acesa na calçada da direita (com neve em cima)
      {
        const xa = W * 1.33;
        const z0 = 2.25;
        const z1 = 2.6;
        const top = P.yG - P.camH * 1.05;
        this.cineGlow(g, P.X(xa, 2.4), P.Y(P.yG - P.camH * 0.5, 2.4), (P.camH * 1.3) / 2.4, 'rgba(180,215,255,0.45)');
        this.mgmQuad(g, P, xa, z0, xa, z1, top, P.yG, '#d6e4f5');
        this.mgmQuad(g, P, xa, z0 + 0.012, xa, z1 - 0.012, top + P.camH * 0.03, top + P.camH * 0.13, '#d23a3a');
        const cols = ['#ffd34a', '#e8483a', '#4ad06a', '#ff8a3a', '#3a8ae8', '#f2f2f2'];
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 5; c++) {
            const za = z0 + 0.03 + c * ((z1 - z0 - 0.06) / 5);
            const ya = top + P.camH * (0.17 + r * 0.11);
            this.mgmQuad(g, P, xa, za, xa, za + (z1 - z0) * 0.11, ya, ya + P.camH * 0.07, cols[(r * 2 + c) % 6]);
          }
        }
        this.mgmQuad(g, P, xa, z0 + 0.06, xa, z1 - 0.06, P.yG - P.camH * 0.26, P.yG - P.camH * 0.14, '#121826');
        this.mgmQuad(g, P, xa, z0 - 0.01, xa, z1 + 0.01, top - P.camH * 0.07, top, '#f1f5fb');
      }
    },
    // vinheta fria (etapa separada: o degradê da tela inteira pesa)
    mgmSnowVig(g, W, H) {
      const v = g.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.3, W / 2, H * 0.55, Math.hypot(W, H) * 0.6);
      v.addColorStop(0, 'rgba(2,4,12,0)');
      v.addColorStop(1, 'rgba(2,4,12,0.45)');
      g.fillStyle = v;
      g.fillRect(0, 0, W, H);
    },

    // Etapa 6: o poste de luz em primeiro plano (cone quente, poça de luz na neve)
    mgmSnowLamp(g, W, H, lampX) {
      const L = this.mgmLampGeo(W, H, lampX);
      const s = L.s;
      g.save();
      g.globalCompositeOperation = 'lighter';
      const pool = g.createRadialGradient(L.headX, L.poolY, 4, L.headX, L.poolY, 250 * s);
      pool.addColorStop(0, 'rgba(255,214,150,0.42)');
      pool.addColorStop(1, 'rgba(255,214,150,0)');
      g.fillStyle = pool;
      g.save();
      g.translate(L.headX, L.poolY);
      g.scale(1, 0.28);
      g.translate(-L.headX, -L.poolY);
      g.fillRect(L.headX - 260 * s, L.poolY - 260 * s, 520 * s, 520 * s);
      g.restore();
      const cone = g.createLinearGradient(0, L.headY, 0, L.poolY);
      cone.addColorStop(0, 'rgba(255,220,160,0.24)');
      cone.addColorStop(1, 'rgba(255,220,160,0.03)');
      g.fillStyle = cone;
      poly(g, [[L.headX - 16 * s, L.headY + 12 * s], [L.headX + 16 * s, L.headY + 12 * s], [L.headX + 200 * s, L.poolY], [L.headX - 200 * s, L.poolY]]);
      g.fill();
      g.restore();
      // o poste
      g.fillStyle = '#05070d';
      g.fillRect(L.x - 6 * s, L.topY, 12 * s, L.baseY - L.topY);
      g.fillRect(L.x - 10 * s, L.baseY - 30 * s, 20 * s, 30 * s);
      g.fillStyle = 'rgba(255,214,150,0.4)';
      g.fillRect(L.x + L.dir * 4 * s - (L.dir > 0 ? 0 : 2 * s), L.topY, 2 * s, L.baseY - L.topY);
      g.fillStyle = 'rgba(150,180,230,0.3)';
      g.fillRect(L.x - L.dir * 6 * s - (L.dir > 0 ? 0 : -4 * s), L.topY, 2 * s, L.baseY - L.topY);
      // plaquinha da rua
      g.fillStyle = '#1d4ed8';
      g.fillRect(L.x - 34 * s, H * 0.42, 68 * s, 22 * s);
      g.strokeStyle = '#e2e8f0';
      g.lineWidth = 1.5 * s;
      g.strokeRect(L.x - 31 * s, H * 0.42 + 3 * s, 62 * s, 16 * s);
      g.font = `900 ${Math.round(9 * s)}px "Segoe UI", sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#f8fafc';
      g.fillText('KAMAKURA 2', L.x, H * 0.42 + 11.5 * s);
      // monte de neve na base do poste
      g.fillStyle = '#c9d5e7';
      g.beginPath();
      g.ellipse(L.x + 4 * s, L.baseY + 4 * s, 46 * s, 14 * s, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#eef3fa';
      g.beginPath();
      g.ellipse(L.x, L.baseY - 2 * s, 36 * s, 11 * s, 0, 0, TAU);
      g.fill();
      // braço curvo e a luminária
      g.strokeStyle = '#05070d';
      g.lineWidth = 7 * s;
      g.beginPath();
      g.moveTo(L.x, L.topY + 8 * s);
      g.quadraticCurveTo(L.x, L.topY - 14 * s, L.headX, L.headY - 10 * s);
      g.stroke();
      g.fillStyle = '#0a0d16';
      poly(g, [[L.headX - 24 * s, L.headY + 4 * s], [L.headX + 24 * s, L.headY + 4 * s], [L.headX + 12 * s, L.headY - 10 * s], [L.headX - 12 * s, L.headY - 10 * s]]);
      g.fill();
      g.fillStyle = '#eef3fa';
      poly(g, [[L.headX - 26 * s, L.headY - 1 * s], [L.headX - 12 * s, L.headY - 13 * s], [L.headX + 12 * s, L.headY - 13 * s], [L.headX + 26 * s, L.headY - 1 * s], [L.headX + 14 * s, L.headY - 7 * s], [L.headX - 14 * s, L.headY - 7 * s]]);
      g.fill();
      g.fillStyle = '#fff4dc';
      g.fillRect(L.headX - 16 * s, L.headY + 4 * s, 32 * s, 5 * s);
      this.cineGlow(g, L.headX, L.headY + 8 * s, 150 * s, 'rgba(255,210,150,0.55)');
      this.cineGlow(g, L.headX, L.headY + 8 * s, 34 * s, 'rgba(255,255,255,1)');
    },

    // Neve parada (só no fundo de diálogo: na cena ela cai de verdade)
    mgmSnowStill(g, W, H, lampX) {
      const R = this.mgmRng(5150);
      const s = H / 720;
      const L = this.mgmLampGeo(W, H, lampX);
      for (let i = 0; i < 620; i++) {
        const x = R() * W;
        const y = R() * H;
        const d = R();
        const sz = Math.max(1, Math.round((1 + d * d * 3.5) * s));
        g.fillStyle = `rgba(232,240,252,${0.35 + d * 0.5})`;
        g.fillRect(x, y, sz, sz);
      }
      g.save();
      poly(g, [[L.headX - 16 * s, L.headY + 12 * s], [L.headX + 16 * s, L.headY + 12 * s], [L.headX + 200 * s, L.poolY], [L.headX - 200 * s, L.poolY]]);
      g.clip();
      for (let i = 0; i < 90; i++) {
        g.fillStyle = 'rgba(255,236,200,0.9)';
        const sz = Math.max(2, Math.round((2 + R() * 2) * s));
        g.fillRect(L.headX - 200 * s + R() * 400 * s, L.headY + R() * (L.poolY - L.headY), sz, sz);
      }
      g.restore();
      for (let i = 0; i < 22; i++) {
        const x = R() * W;
        const y = R() * H;
        const sz = (6 + R() * 8) * s;
        this.cineGlow(g, x, y, sz * 1.6, 'rgba(240,246,255,0.5)', 0.8);
        g.fillStyle = 'rgba(248,250,255,0.7)';
        g.fillRect(Math.round(x - sz * 0.2), Math.round(y - sz * 0.2), Math.ceil(sz * 0.4), Math.ceil(sz * 0.4));
      }
    },

    mgmSnowSteps(lampX, flakes) {
      const steps = [
        function (g, W, H) {
          this.mgmSnowSky(g, W, H, 0);
        },
        function (g, W, H) {
          this.mgmSnowSky(g, W, H, 2);
        },
        function (g, W, H) {
          this.mgmSnowSky(g, W, H, 1);
        },
        function (g, W, H) {
          this.mgmSnowGround(g, W, H);
        },
        function (g, W, H) {
          this.mgmSnowSide(g, W, H, -1);
        },
        function (g, W, H) {
          this.mgmSnowSide(g, W, H, 1);
        },
        function (g, W, H) {
          this.mgmSnowProps(g, W, H);
        },
        function (g, W, H) {
          this.mgmSnowVig(g, W, H);
        },
        function (g, W, H) {
          this.mgmSnowLamp(g, W, H, (lampX || 0.62) * W);
        }
      ];
      if (flakes) {
        steps.push(function (g, W, H) {
          this.mgmSnowStill(g, W, H, (lampX || 0.62) * W);
        });
      }
      return steps;
    },
    // A rua da cena (sem neve parada; o poste à direita, onde o Sae espera)
    mgmSnowCv(W, H) {
      return this.mgmBake('mgm_snow', W, H, this.mgmSnowSteps(0.62, false));
    }
  });

  // Fundo de diálogo: rua de Kamakura à noite, nevando, poste aceso à esquerda
  CE.VN_BG.snow_night = function (ctx, W, H) {
    this.mgmSnowSteps(0.2, true).forEach((fn) => {
      ctx.save();
      fn.call(this, ctx, W, H);
      ctx.restore();
    });
  };

  // ==========================================================================
  // 1. NAGI E REO — O TESOURO QUE FOI EMBORA
  // ==========================================================================
  Object.assign(CE, {
    mgmRoom(step) {
      const cv = document.getElementById('sakuga-action-canvas');
      const steps = [0, 1, 2, 3, 4].map((p) =>
        function (g, W, H) {
          this.mgmRoomBg(g, W, H, p);
        }
      );
      return this.mgmBake('mgm_room', cv?.width || 1280, cv?.height || 720, steps, !step);
    },
    mgmRoomBlur() {
      const room = this.mgmRoom();
      return this.mgmBlur('mgm_room_blur', room, room.width, room.height, 10);
    },
    mgmFloorShadow(ctx, x, y, rx) {
      ctx.fillStyle = 'rgba(71,85,105,0.22)';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.2, 0, 0, TAU);
      ctx.fill();
    },

    // PLANO 1 — abertura no preto ("2ª SELEÇÃO") → a sala estoura de branco
    mgmNr0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const intro = 46;
      if (t < intro) {
        ctx.fillStyle = '#020409';
        ctx.fillRect(0, 0, W, H);
        this.cineGlow(ctx, W / 2, (top + bot) / 2, 360, 'rgba(56,189,248,0.16)', seg(t, 0, 20));
        this.finKicker(ctx, W / 2, (top + bot) / 2 - 64, 'BLUE LOCK', seg(t, 2, 22), '#38bdf8', 'center');
        this.rincStamp(ctx, '2ª SELEÇÃO', W / 2, (top + bot) / 2 + 4, 86, '#f8fafc', t, 8, 2, W * 0.7);
        this.cineFlash(ctx, W, H, seg(t, 32, intro), '#f8fafc');
        this.cineSfx(S, 8, 'abre', () => window.SFX?.whoosh?.());
        return;
      }
      this.mgmNr0Room(ctx, Object.assign({}, S, { t: t - intro, dur: S.dur - intro }));
      this.cineFlash(ctx, W, H, 1 - seg(t, intro, intro + 28), '#f8fafc');
    },
    // a sala branca: o Reo, o Nagi no meio, você
    mgmNr0Room(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.mgmCast();
      const k = easeIO(t / S.dur);
      ctx.save();
      this.mgmCam(ctx, S, { x: 640, y: lerp(350, 404, k), zoom: lerp(1.02, 1.17, k), shake: 0.4 });
      ctx.drawImage(this.mgmRoom(), 0, 0);
      this.cineShafts(ctx, 640, -10, Math.PI / 2, 640, 1.1, 6, '224,242,254', 0.1, t);
      // faixa de varredura no telão
      const sy = 179 + ((t * 1.1) % 140);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(468, sy, 344, 6);
      const feet = 604;
      const size = 232;
      [[420, 64], [640, 64], [860, 64]].forEach(([x, r]) => this.mgmFloorShadow(ctx, x, feet + 2, r));
      // o anel holográfico da escolha em volta do Nagi
      ctx.save();
      ctx.strokeStyle = `rgba(14,165,233,${0.35 + 0.25 * Math.sin(t * 0.08)})`;
      ctx.lineWidth = 3;
      [[96, 20], [120, 26]].forEach(([rx, ry], i) => {
        ctx.setLineDash([18, 10]);
        ctx.lineDashOffset = (i ? -t : t) * 0.6;
        ctx.beginPath();
        ctx.ellipse(640, feet + 2, rx, ry, 0, 0, TAU);
        ctx.stroke();
      });
      ctx.restore();
      this.finRim(ctx, c.reo, 420, feet, size, {}, '#c084fc', [-1], 2);
      this.finRim(ctx, c.nagi, 640, feet, size, {}, '#94a3b8', [-1, 1], 2);
      this.finRim(ctx, c.you, 860, feet, size, {}, '#2dd4bf', [1], 2);
      const ty = feet - size * 0.87 - 18;
      this.mgmHoloTag(ctx, 420, ty, 'REO MIKAGE', REO_RGB, seg(t, 40, 76), t);
      this.mgmHoloTag(ctx, 860, ty, this.cinePlayerName(), YOU_RGB, seg(t, 60, 96), t);
      this.mgmHoloTag(ctx, 640, ty - 30, 'SEISHIRO NAGI  •  ?', NAGI_RGB, seg(t, 92, 128), t);
      // setinhas holográficas: para quem ele vai?
      const ka = seg(t, 128, 150);
      if (ka > 0) {
        ctx.save();
        ctx.globalAlpha = ka * (0.6 + 0.4 * Math.sin(t * 0.12));
        ctx.fillStyle = 'rgba(14,165,233,0.85)';
        [-1, 1].forEach((sd) => {
          const x = 640 + sd * 92;
          const y = ty - 45;
          poly(ctx, [[x, y - 9], [x + sd * 16, y], [x, y + 9]]);
          ctx.fill();
        });
        ctx.restore();
      }
      ctx.restore();
      // primeiro plano: telas holográficas perto da lente (passam mais rápido = profundidade)
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 + k * 30, y: 360, zoom: 1 + k * 0.4 });
      [[-70, 150, 190, 420, 0], [1150, 120, 200, 460, 1]].forEach(([x, y, w, h, i]) => {
        ctx.fillStyle = 'rgba(125,211,252,0.12)';
        ctx.fillRect(x, y, w, h);
        this.finFillPat(ctx, 'scan', x, y, w, h, 0.3);
        ctx.strokeStyle = 'rgba(14,165,233,0.45)';
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = 'rgba(14,165,233,0.35)';
        for (let j = 0; j < 7; j++) ctx.fillRect(x + 22, y + 40 + j * 46, 40 + ((j * 53 + i * 31) % 90), 12);
      });
      ctx.restore();
      this.cineDust(ctx, W, H, t, 34, 'rgba(56,189,248,0.55)', 7);
      this.finKicker(ctx, 40, top + 30, 'BLUE LOCK • 2ª SELEÇÃO • A SALA BRANCA', seg(t, 8, 54), '#0ea5e9');
      this.finKicker(ctx, 40, top + 58, 'O NAGI VAI ESCOLHER COM QUEM SEGUE', seg(t, 40, 90), REO_C);
    },

    // Lembrança dentro do painel: o Reo achando o Nagi (o "tesouro") na escola Hakuho
    mgmNrMemory(ctx, S, u, x0, y0, w, h) {
      const c = this.mgmCast();
      this.cineGradient(ctx, x0, y0, w, h, [[0, '#4a2a0a'], [1, '#1c0f05']]);
      const cx = x0 + w * 0.5;
      const cy = y0 + h * 0.48;
      this.foxcRays(ctx, cx, cy, 0, 420, 28, '#fde68a', 0.22, u * 0.004, 0.035);
      this.cineGlow(ctx, cx, cy, 200, 'rgba(250,204,21,0.35)');
      const size = 470;
      const r = this.finHead(ctx, c.nagiMem, cx, y0 + 108, size, { dim: 0.12, dimTint: '80,40,0' });
      this.mgmEyes(ctx, cx, y0 + 108, r.u, { iris: '#334155', ring: '#94a3b8', lid: 3, lidColor: this.finShade(c.nagiMem.skinColor, -0.16), look: 0 });
      const ph = this.mgmPhone();
      this.mgmPartAt(ctx, ph, cx + 2.2 * r.u, y0 + 108 + 4.4 * r.u, r.u);
      this.cineGlow(ctx, cx + 3.8 * r.u, y0 + 108 + 6 * r.u, 70, 'rgba(56,189,248,0.4)');
      for (let i = 0; i < 7; i++) {
        const per = 50 + rnd(i, 3) * 40;
        const p = ((u + rnd(i, 4) * per) % per) / per;
        const a = Math.sin(p * Math.PI);
        this.finSparkle(ctx, x0 + 30 + rnd(i, 5) * (w - 60), y0 + 30 + rnd(i, 6) * (h - 90), 7 + rnd(i, 7) * 8, a, 'rgba(253,230,138,0.8)');
      }
      ctx.fillStyle = 'rgba(120,70,20,0.18)';
      ctx.fillRect(x0, y0, w, h);
      this.finFillPat(ctx, 'tone', x0, y0, w, h, 1);
      this.finKicker(ctx, x0 + 18, y0 + 24, 'HÁ UM ANO • ESCOLA HAKUHO', seg(u, 8, 40), '#facc15');
      this.rincStamp(ctx, 'ACHEI O MEU TESOURO.', cx, y0 + h - 34, 30, '#fef3c7', u, 30, 2, w - 40);
    },

    // PLANO 2 — o Reo estende a mão: "vem comigo"
    mgmNr1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.mgmCast();
      const k = easeIO(t / 360);
      this.mgmBlurDraw(ctx, this.mgmRoomBlur(), W, 360 + k * 20, 130, 560, 315, -60, -40, W + 120, H + 80);
      ctx.fillStyle = 'rgba(241,245,249,0.3)';
      ctx.fillRect(0, 0, W, H);
      this.cineBokeh(ctx, W, top, bot, t, 14, ['rgba(255,255,255,0.35)', 'rgba(125,211,252,0.3)'], 4);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(560, 600, k), y: lerp(372, 350, k), zoom: lerp(1.0, 1.1, k), shake: 0.7 });
      const size = 820;
      const x = 430;
      const eyeY = 318;
      this.cineGlow(ctx, x - 260, eyeY + 40, 520, 'rgba(192,132,252,0.28)');
      const cut = this.mgmSprCut(ctx, c.reo, { rim: '#a855f7', rimSides: [-1], rimD: 1 }, x, eyeY - SPRITE_MAPY(10.1) * (size / 36) + size * 0.87, size);
      const u = cut.u;
      const tremble = t > 250 ? Math.round(Math.sin(t * 0.8)) : 0;
      this.mgmPartAt(ctx, this.mgmArm(c.reo), x - size / 2 + 24.6 * u, cut.top + SPRITE_MAPY(12.9) * u + tremble, u);
      // luz roxa de recorte em cima do braço
      ctx.fillStyle = 'rgba(216,180,254,0.75)';
      ctx.fillRect(x - size / 2 + 25 * u, cut.top + SPRITE_MAPY(13.75) * u + tremble, 7 * u, Math.max(2, 0.18 * u));
      this.mgmEyes(ctx, x, eyeY, u, { iris: '#581c87', ring: '#c084fc', look: 1, shine: true });
      ctx.restore();
      // painel: a lembrança do dia em que ele achou o Nagi
      const kp = ease(seg(t, 150, 168));
      if (kp > 0) {
        this.cineSfx(S, 150, 'page', () => window.SFX?.page?.());
        const x0 = 842;
        const y0 = top + 12;
        const pts = [[x0, y0 + 6], [W - 22, y0], [W - 22, y0 + 250], [x0 + 24, y0 + 260]];
        this.finPanel(ctx, pts, () => this.mgmNrMemory(ctx, S, t - 150, x0, y0, W - 22 - x0, 260), { dx: (1 - kp) * 480 });
      }
      this.finKicker(ctx, 40, top + 30, 'REO MIKAGE', seg(t, 10, 40), REO_C);
    },

    // PLANO 3 — o Nagi olha para o Reo... e depois para você. Pela primeira vez, ele quer.
    mgmNr2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.mgmCast();
      const choose = 150;
      this.mgmBlurDraw(ctx, this.mgmRoomBlur(), W, 420, 150, 440, 248, -60, -40, W + 120, H + 80);
      ctx.fillStyle = 'rgba(226,232,240,0.35)';
      ctx.fillRect(0, 0, W, H);
      const kc = seg(t, choose, choose + 40);
      this.cineGlow(ctx, 0, 380, 520, 'rgba(192,132,252,0.32)', 1 - kc * 0.6);
      this.cineGlow(ctx, W, 380, 520, 'rgba(45,212,191,0.3)', 0.6 + kc * 0.6);
      this.cineBokeh(ctx, W, top, bot, t, 10, ['rgba(255,255,255,0.35)', 'rgba(147,197,253,0.3)'], 9);
      const k = easeIO(t / 330);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(370, 352, k), zoom: 1 + k * 0.1, shake: 0.6 });
      const size = 900;
      const x = 640;
      const eyeY = 346;
      const r = this.finHead(ctx, c.nagi, x, eyeY, size, { rim: '#f8fafc' });
      const look = t < 96 ? -2 : Math.round(lerp(-2, 2, seg(t, 96, 128)));
      const lid = t < choose ? 3 : 3 - Math.min(3, Math.floor(seg(t, choose, choose + 26) * 4));
      const wants = t >= choose;
      this.mgmEyes(ctx, x, eyeY, r.u, {
        iris: wants ? '#0e7490' : '#334155',
        ring: wants ? '#a5f3fc' : '#94a3b8',
        look,
        lid,
        lidColor: this.finShade(c.nagi.skinColor, -0.16),
        shine: wants,
        glow: wants ? 'rgba(165,243,252,0.3)' : null,
        glowA: kc
      });
      if (wants) {
        const ks = seg(t, choose + 18, choose + 40);
        if (ks > 0 && ks < 1) this.finSparkle(ctx, x + 5.4 * r.u, eyeY - 1.6 * r.u, 26, Math.sin(ks * Math.PI), 'rgba(165,243,252,0.8)');
      }
      ctx.restore();
      this.cineSfx(S, choose, 'quer', () => window.SFX?.blip?.(880));
      // painéis dos lados: o Reo (para quem ele olha primeiro) e você
      const panel = (sd, who, at, rgb) => {
        const kp = ease(seg(t, at, at + 16));
        if (kp <= 0) return;
        const x0 = sd < 0 ? 22 : W - 290;
        const pts = sd < 0 ? [[22, top + 22], [290, top + 30], [282, top + 236], [22, top + 228]] : [[W - 290, top + 30], [W - 22, top + 22], [W - 22, top + 228], [W - 282, top + 236]];
        const chosen = sd > 0 && wants;
        const left = sd < 0 && wants;
        this.finPanel(ctx, pts, () => {
          this.cineGradient(ctx, x0, top + 20, 270, 220, [[0, `rgba(${rgb},0.55)`], [1, '#0f172a']]);
          const U = 17.5;
          this.finCrop(ctx, who, {}, 10.5, 2.5, 15, 11.5, x0 + 4, top + 26, 15 * U, 11.5 * U);
          if (left) {
            ctx.fillStyle = `rgba(15,23,42,${0.62 * kc})`;
            ctx.fillRect(x0, top + 20, 272, 220);
          }
          if (chosen) this.cineGlow(ctx, x0 + 135, top + 130, 200, 'rgba(45,212,191,0.3)', kc);
        }, { dx: (1 - kp) * sd * 330, border: chosen ? '#5eead4' : left ? '#64748b' : '#f8fafc' });
      };
      panel(-1, c.reo, 16, REO_RGB);
      panel(1, c.you, 104, YOU_RGB);
      this.rincStamp(ctx, '...EU QUERO.', 640, bot - 64, 64, '#e0f2fe', t, choose + 40, 3, W * 0.6);
      this.finKicker(ctx, W / 2, bot - 122, 'PELA PRIMEIRA VEZ, O NAGI QUIS ALGUMA COISA', seg(t, choose + 70, choose + 130), '#5eead4', 'center');
    },

    // O painel da coroa (o sonho do Reo): racha e parte em pedaços
    mgmCrownPanel(ctx, S, u, x0, y0, w, h) {
      const crackAt = 30;
      const breakAt = 64;
      const brk = u >= breakAt ? u - breakAt : -1;
      this.cineGradient(ctx, x0, y0, w, h, [[0, '#2e1065'], [1, '#0b0420']]);
      const cx = x0 + w / 2;
      const cy = y0 + h * 0.56;
      const glow = brk < 0 ? 1 : 1 - seg(brk, 0, 40);
      this.foxcRays(ctx, cx, cy, 0, 480, 30, '#fde68a', 0.22 * glow, u * 0.003, 0.04);
      this.cineGlow(ctx, cx, cy, 240, 'rgba(250,204,21,0.4)', glow);
      const shake = u >= crackAt && brk < 0 ? Math.round(Math.sin(u * 2.1) * 2) : 0;
      this.mgmCrown(ctx, cx + shake, cy - 6, 12, seg(u, crackAt, crackAt + 22), brk);
      if (brk >= 0) {
        // poeira dourada caindo dos pedaços
        for (let i = 0; i < 22; i++) {
          const d = brk - rnd(i, 3) * 10;
          if (d < 0) continue;
          const px = cx + (rnd(i, 4) - 0.5) * 200 + (rnd(i, 5) - 0.5) * d * 2;
          const py = cy + (rnd(i, 6) - 0.5) * 80 + d * d * 0.03 + d;
          ctx.fillStyle = `rgba(253,224,71,${0.9 * (1 - seg(d, 20, 60))})`;
          ctx.fillRect(px, py, 4, 4);
        }
      }
      this.finFillPat(ctx, 'tone', x0, y0, w, h, 1);
      this.finKicker(ctx, x0 + 18, y0 + 24, 'O TESOURO DO REO', seg(u, 4, 30), '#facc15');
      if (u >= crackAt) this.rincStamp(ctx, 'CRACK', x0 + w - 80, y0 + 52, 40, '#fef3c7', u, crackAt, 2);
    },

    // PLANO 4 — o Nagi atravessa a sala; a mão do Reo fica no ar; a coroa racha
    mgmNr3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.mgmCast();
      const k = easeIO(t / 300);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(620, 660, k), y: lerp(380, 370, k), zoom: lerp(1.04, 1.12, k), shake: 0.5 });
      ctx.drawImage(this.mgmRoom(), 0, 0);
      this.cineShafts(ctx, 640, -10, Math.PI / 2, 640, 1.1, 6, '224,242,254', 0.1, t);
      const feet = 598;
      const sz = 286;
      const wk = seg(t, 30, 150);
      const nx = lerp(600, 892, smooth(wk));
      const walking = wk > 0 && wk < 1;
      this.mgmFloorShadow(ctx, 1040, feet + 2, 76);
      this.mgmFloorShadow(ctx, nx, feet + 2, 76);
      this.finRim(ctx, c.you, 1040, feet, sz, {}, '#2dd4bf', [1], 2);
      // passos sem pressa (o Nagi anda devagar: só o corpo subindo e descendo)
      const step = walking ? Math.round(Math.abs(Math.sin(t * 0.16)) * 4) : 0;
      this.finRim(ctx, c.nagi, nx, feet - step, sz, {}, '#94a3b8', [-1, 1], 2);
      this.cineSfx(S, 34, 'passo', () => window.SFX?.pass?.());
      ctx.restore();
      // o Reo em primeiro plano, de costas, a mão ainda estendida
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 - k * 24, y: 360, zoom: 1 + k * 0.05, shake: 0.9 });
      const rs = 680;
      const rx = 240;
      const rfeet = bot + 220;
      const o = { facing: 'back', dim: 0.3, dimTint: '30,16,60', rim: '#c084fc', rimSides: [1], rimD: 1 };
      const cut = this.mgmSprCut(ctx, c.reo, o, rx, rfeet, rs);
      const ru = cut.u;
      const tremble = t > 150 ? Math.round(Math.sin(t * 1.1) * 1.5) : 0;
      this.mgmPartAt(ctx, this.mgmArm(c.reo, 0.3), rx - rs / 2 + 24.6 * ru, cut.top + SPRITE_MAPY(12.9) * ru + tremble, ru);
      ctx.fillStyle = 'rgba(216,180,254,0.8)';
      ctx.fillRect(rx - rs / 2 + 25 * ru, cut.top + SPRITE_MAPY(13.75) * ru + tremble, 7 * ru, Math.max(2, 0.16 * ru));
      ctx.restore();
      // a coroa (o sonho dele) desce num painel e racha
      const kc = ease(seg(t, 165, 182));
      if (kc > 0) {
        this.cineSfx(S, 165, 'painel', () => window.SFX?.page?.());
        this.cineSfx(S, 195, 'racha', () => window.SFX?.post?.());
        this.cineSfx(S, 229, 'quebra', () => window.SFX?.tackle?.());
        const x0 = 392;
        const y0 = top + 16;
        const pts = [[x0, y0 + 8], [x0 + 506, y0], [x0 + 496, y0 + 286], [x0 + 10, y0 + 278]];
        this.finPanel(ctx, pts, () => this.mgmCrownPanel(ctx, S, t - 165, x0, y0, 506, 286), { dy: (1 - kc) * -440, border: '#fde68a' });
      }
      if (t >= 229) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, 229, 241)), '#fef3c7');
    },

    // PLANO 5 — o Reo sozinho na sala branca; as luzes apagando; a lágrima; o título
    mgmNr4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.mgmCast();
      const cutAt = 120;
      if (t < cutAt) {
        const k = easeIO(t / cutAt);
        const offs = [18, 40, 62];
        const n = offs.filter((a) => t >= a).length;
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: lerp(392, 360, k), zoom: lerp(1.16, 1.0, k), shake: 0.3 });
        ctx.drawImage(this.mgmRoom(), 0, 0);
        // as luzes do teto apagando, uma de cada vez (fica só a de cima do Reo)
        const vy = H * 0.44;
        const by0 = H * 0.21;
        const f = (vy - by0) / vy;
        [W * 0.2, W * 0.8].forEach((xf, i) => {
          if (n < i + 1) return;
          const hw = W * 0.045;
          const xb = W / 2 + (xf - W / 2) * f;
          poly(ctx, [[xf - hw, 0], [xf + hw, 0], [xb + hw * f, by0 - 6], [xb - hw * f, by0 - 6]]);
          ctx.fillStyle = '#9aa7b8';
          ctx.fill();
        });
        ctx.fillStyle = `rgba(15,23,42,${0.17 * n})`;
        ctx.fillRect(-200, -200, W + 400, H + 400);
        this.cineShafts(ctx, 640, -10, Math.PI / 2, 640, 0.5, 4, '224,242,254', 0.08 + 0.05 * n, t);
        this.cineGlow(ctx, 640, 600, 200, 'rgba(255,255,255,0.3)', n / 3);
        // o telão já mostra o resultado
        if (t >= 70) {
          const ka = seg(t, 70, 84);
          ctx.save();
          ctx.globalAlpha = ka;
          ctx.fillStyle = '#0b1222';
          ctx.fillRect(468, 179, 344, 140);
          this.finFillPat(ctx, 'scan', 468, 179, 344, 140, 0.6);
          ctx.strokeStyle = '#fb7185';
          ctx.lineWidth = 3;
          ctx.strokeRect(468, 179, 344, 140);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'italic 900 24px "Segoe UI", sans-serif';
          ctx.fillStyle = '#5eead4';
          ctx.fillText(`NAGI  →  ${this.cinePlayerName()}`, 640, 228, 320);
          ctx.font = '900 15px "Segoe UI", sans-serif';
          ctx.fillStyle = '#fb7185';
          ctx.fillText('REO MIKAGE  •  SEM DUPLA', 640, 272, 320);
          ctx.restore();
        }
        this.mgmFloorShadow(ctx, 640, 602, 58);
        this.finRim(ctx, c.reo, 640, 600, 236, { dim: 0.12 * n, dimTint: '20,16,40' }, '#c084fc', [-1, 1], 2);
        ctx.restore();
        offs.forEach((a, i) => this.cineSfx(S, a, 'luz' + i, () => window.SFX?.blip?.(140 - i * 20)));
        this.finKicker(ctx, 40, top + 30, 'SALA BRANCA • DEPOIS DA ESCOLHA', seg(t, 6, 50), '#94a3b8');
        return;
      }
      // o close: os olhos na sombra, os dentes trincados, uma lágrima só
      const u0 = t - cutAt;
      this.mgmBlurDraw(ctx, this.mgmRoomBlur(), W, 420, 130, 440, 248, -60, -40, W + 120, H + 80);
      ctx.fillStyle = 'rgba(15,23,42,0.66)';
      ctx.fillRect(0, 0, W, H);
      this.cineGlow(ctx, 600, top + 40, 460, 'rgba(192,132,252,0.22)');
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 620, y: 360, zoom: 1 + easeIO(u0 / 180) * 0.08, shake: 0.6 });
      const size = 880;
      const x = 600;
      const eyeY = 336;
      const r = this.finHead(ctx, c.reo, x, eyeY, size, { dim: 0.25, dimTint: '20,10,40', rim: '#c084fc' });
      // a sombra da franja engolindo os olhos (uma faixa só: o cabelo roxo de cima continua)
      this.mgmBandShade(ctx, c.reo, x, r.feet, size, 0.95, 7.3, 8.0, 10.9, 12.3);
      // o brilho dos olhos sumindo debaixo da sombra
      [-1, 1].forEach((sd) => this.cineGlow(ctx, x + sd * 3.5 * r.u, eyeY, r.u * 2, 'rgba(192,132,252,0.5)', 0.5 * (1 - seg(u0, 0, 60))));
      // dentes trincados
      this.finU(ctx, x, r.top, r.u, 15.9, 11.75, 4.2, 1.1, '#0a0f1c');
      this.finU(ctx, x, r.top, r.u, 16.2, 11.95, 3.6, 0.65, '#f1f5f9');
      [17.1, 18, 18.9].forEach((ux) => this.finU(ctx, x, r.top, r.u, ux, 11.95, 0.16, 0.65, '#64748b'));
      // uma lágrima só (pixel), saindo de baixo da sombra e descendo pela bochecha
      const tx = Math.round(x - 3.7 * r.u);
      const ty = eyeY + 1.1 * r.u;
      const len = ease(seg(u0, 22, 100)) * 3.4 * r.u;
      const pw = Math.ceil(r.u * 0.42);
      if (len > 0) {
        ctx.fillStyle = 'rgba(186,230,253,0.92)';
        ctx.fillRect(tx, Math.round(ty), pw, Math.round(len));
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(tx, Math.round(ty), Math.ceil(pw / 3), Math.round(len));
        const fall = Math.max(0, u0 - 104);
        const dy = fall * fall * 0.05;
        if (ty + len + dy < bot + 40) {
          ctx.fillStyle = 'rgba(186,230,253,0.95)';
          ctx.fillRect(tx - Math.round(pw * 0.25), Math.round(ty + len - pw * 0.3 + dy), Math.round(pw * 1.5), Math.round(pw * 1.6));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tx - Math.round(pw * 0.1), Math.round(ty + len + dy), Math.ceil(pw / 3), Math.ceil(pw / 3));
        }
      }
      ctx.restore();
      // painel: o punho fechado, tremendo
      const kf = ease(seg(u0, 34, 50));
      if (kf > 0) {
        const x0 = W - 300;
        const pts = [[x0, top + 26], [W - 22, top + 20], [W - 22, top + 232], [x0 + 18, top + 240]];
        this.finPanel(ctx, pts, () => {
          this.cineGradient(ctx, x0, top + 20, 300, 230, [[0, '#2e1065'], [1, '#0b0420']]);
          ctx.strokeStyle = 'rgba(216,180,254,0.55)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * TAU;
            const cx2 = x0 + 140;
            const cy2 = top + 132;
            ctx.moveTo(cx2 + Math.cos(a) * 92, cy2 + Math.sin(a) * 80);
            ctx.lineTo(cx2 + Math.cos(a) * (130 + (i % 3) * 14), cy2 + Math.sin(a) * (116 + (i % 3) * 12));
          }
          ctx.stroke();
          const sh = Math.round(Math.sin(t * 1.7) * 2);
          this.mgmPartAt(ctx, this.mgmFist(c.reo), x0 + 140 - 4 * 21 + sh, top + 134 - 4.1 * 21, 21);
          this.finFillPat(ctx, 'tone', x0, top + 20, 300, 230, 1);
        }, { dx: (1 - kf) * 340, border: '#e9d5ff' });
      }
      // o título
      const kt = seg(t, 196, 236);
      if (kt > 0) {
        this.foxcGrad(ctx, 0, bot - 230, W, 230, [[0, 'rgba(2,6,23,0)'], [0.5, `rgba(2,6,23,${0.65 * kt})`], [1, `rgba(2,6,23,${0.8 * kt})`]]);
        this.cineTitleCard(ctx, W, bot - 104, kt, { kicker: 'REO MIKAGE • 2ª SELEÇÃO', title: 'O TESOURO QUE FOI EMBORA', color: REO_C });
      }
      this.cineSfx(S, 196, 'titulo', () => window.SFX?.kick?.(0.6));
    }
  });

  // ==========================================================================
  // 2. OS IRMÃOS ITOSHI — NEVE EM KAMAKURA
  // ==========================================================================
  Object.assign(CE, {
    // Visual de lembrança: luz vazando, tom quente, riscos de filme (sem piscar)
    mgmMemoryLook(ctx, S, t) {
      const { W, H, top } = S;
      ctx.fillStyle = 'rgba(255,170,90,0.1)';
      ctx.fillRect(0, 0, W, H);
      this.cineGlow(ctx, 90, top + 50, 380, 'rgba(255,170,90,0.4)', 0.75 + 0.15 * Math.sin(t * 0.02));
      this.cineGlow(ctx, W - 60, S.bot - 40, 300, 'rgba(255,120,80,0.25)', 0.6 + 0.2 * Math.sin(t * 0.017 + 2));
      ctx.drawImage(this.finBg('mgm_vigwarm', W, H, this.mgmWarmVig), 0, 0);
      const seed = Math.floor(t / 9);
      ctx.fillStyle = 'rgba(255,240,220,0.12)';
      ctx.fillRect(Math.round(rnd(seed, 7) * W), top, 1.5, S.stageH);
      ctx.fillRect(Math.round(rnd(seed, 9) * W), top, 1, S.stageH);
    },

    // Rosto de criança recortado (painel), com olhos fechados de rir e boca aberta
    mgmKidFace(ctx, char, dx, dy, U) {
      this.finCrop(ctx, char, {}, 10, 0.5, 16, 14, dx, dy, 16 * U, 14 * U);
      const ux = (x) => dx + (x - 10) * U;
      const uy = (y) => dy + (y - 0.5) * U;
      // brilho nos olhos (felizes)
      ctx.fillStyle = '#ffffff';
      [14.1, 21.1].forEach((ex) => ctx.fillRect(ux(ex), uy(9.3), Math.ceil(0.6 * U), Math.ceil(0.6 * U)));
      ctx.fillStyle = 'rgba(251,113,133,0.45)';
      ctx.fillRect(ux(12.6), uy(11), 1.4 * U, 0.6 * U);
      ctx.fillRect(ux(22), uy(11), 1.4 * U, 0.6 * U);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(ux(16.2), uy(11.5), 3.6 * U, 1.2 * U);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(ux(16.4), uy(11.5), 3.2 * U, 0.42 * U);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(ux(17.2), uy(12.25), 1.6 * U, 0.45 * U);
    },

    // PLANO 1 — abertura no preto ("muitos anos atrás...") → a praia surge, quente
    mgmIs0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const intro = 50;
      if (t < intro + 30) {
        if (t >= intro) this.mgmIs0Beach(ctx, Object.assign({}, S, { t: t - intro, dur: S.dur - intro }));
        const a = t < intro ? 1 : 1 - seg(t, intro, intro + 30);
        ctx.fillStyle = `rgba(6,3,2,${a})`;
        ctx.fillRect(0, 0, W, H);
        const ka = 1 - seg(t, intro - 6, intro + 10);
        ctx.save();
        ctx.globalAlpha = ka;
        this.cineGlow(ctx, W / 2, (top + bot) / 2, 320, 'rgba(255,170,90,0.2)', seg(t, 0, 24));
        this.finKicker(ctx, W / 2, (top + bot) / 2 - 56, 'KAMAKURA', seg(t, 2, 20), '#fbbf24', 'center');
        this.rincStamp(ctx, 'MUITOS ANOS ATRÁS...', W / 2, (top + bot) / 2 + 6, 58, '#fde68a', t, 8, 2, W * 0.7);
        ctx.restore();
        return;
      }
      this.mgmIs0Beach(ctx, Object.assign({}, S, { t: t - intro, dur: S.dur - intro }));
    },
    // verão, a praia de Kamakura: a promessa dos dois irmãos
    mgmIs0Beach(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.mgmCast();
      const kc = easeIO(seg(t, 0, 160));
      ctx.save();
      this.mgmCam(ctx, S, { x: lerp(900, 640, kc), y: lerp(372, 394, kc), zoom: lerp(1.32, 1.02, kc) + easeIO(seg(t, 160, 300)) * 0.05, shake: 0.5 });
      ctx.drawImage(this.mgmBeach(W, H), 0, 0);
      // brilhos na água e a espuma indo e vindo
      for (let i = 0; i < 8; i++) {
        const per = 40 + rnd(i, 2) * 30;
        const p = ((t + rnd(i, 3) * per) % per) / per;
        this.finSparkle(ctx, 896 + (rnd(i, 4) - 0.5) * 220, 412 + rnd(i, 5) * 90, 4 + rnd(i, 6) * 5, Math.sin(p * Math.PI), 'rgba(255,236,170,0.8)');
      }
      const fy = 536 + Math.sin(t * 0.03) * 5;
      ctx.fillStyle = 'rgba(255,246,236,0.35)';
      for (let x = 0; x < W; x += 40) ctx.fillRect(x + Math.sin(x * 0.03 + t * 0.04) * 8, fy + Math.sin(x * 0.05) * 3, 26, 3);
      this.mgmKids(ctx, t);
      ctx.restore();
      const ki = Math.floor(t / 50);
      this.cineSfx(S, ki * 50, 'chute' + ki, () => window.SFX?.kick?.(0.22));
      this.mgmMemoryLook(ctx, S, t);
      // painel: os dois rindo
      const kp = ease(seg(t, 166, 184));
      if (kp > 0) {
        this.cineSfx(S, 166, 'page', () => window.SFX?.page?.());
        const x0 = W - 566;
        const pts = [[x0, top + 12], [W - 24, top + 18], [W - 24, top + 222], [x0 + 18, top + 214]];
        this.finPanel(ctx, pts, () => {
          this.cineGradient(ctx, x0, top, 560, 240, [[0, '#f6a25e'], [1, '#8a3b63']]);
          this.cineGlow(ctx, x0 + 280, top + 70, 260, 'rgba(255,236,170,0.6)');
          const U = 14;
          this.mgmKidFace(ctx, c.saeKid, x0 + 24, top + 18, U);
          this.mgmKidFace(ctx, c.rinKid, x0 + 290, top + 30, U * 0.94);
          ctx.fillStyle = 'rgba(255,170,90,0.12)';
          ctx.fillRect(x0, top, 560, 240);
          this.finFillPat(ctx, 'tone', x0, top, 560, 240, 1);
        }, { dx: (1 - kp) * 620, border: '#fff7ed' });
        this.mgmBubble(ctx, W - 250, top + 268, 'PROMETIDO!', 26, W - 160, top + 206, seg(t, 200, 214));
        this.cineSfx(S, 200, 'prometido', () => window.SFX?.jingle?.([72, 76, 79], 0, 'triangle'));
      }
      this.finKicker(ctx, 40, top + 30, 'A PRAIA DE CASA • VERÃO', seg(t, 8, 50), '#fbbf24');
      this.finKicker(ctx, 40, top + 58, 'OS IRMÃOS ITOSHI', seg(t, 40, 80), SAE_C);
    },

    // A neve caindo em 3 camadas (tela), com o vento
    mgmSnowLayers(ctx, S, t, amt = 1, near = true) {
      const { W, top, bot } = S;
      this.mgmSnow(ctx, W, top - 10, bot + 10, t, Math.round(110 * amt), 2, 0.9, '214,226,245', 0.55, 3, 0.45);
      this.mgmSnow(ctx, W, top - 10, bot + 10, t, Math.round(70 * amt), 3.5, 1.5, '232,240,252', 0.75, 5, 0.5);
      if (near) this.mgmSnow(ctx, W, top - 30, bot + 30, t, Math.round(12 * amt), 9, 2.6, '240,246,255', 0.6, 8, 0.6, true);
    },

    // PLANO 2 — inverno, anos depois: o Sae embaixo do poste; o Rin chega correndo
    mgmIs1(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.mgmCast();
      const bg = this.mgmSnowCv(W, H);
      const L = this.mgmLampGeo(W, H, W * 0.62);
      const kA = easeIO(seg(t, 0, 150));
      const kB = easeIO(seg(t, 150, 372));
      ctx.save();
      this.mgmCam(ctx, S, { x: lerp(lerp(620, 650, kA), L.headX - 44, kB), y: lerp(372, 436, kB), zoom: lerp(1.02, 1.06, kA) + kB * 0.7, shake: 0.5 });
      ctx.drawImage(bg, 0, 0);
      // a luz do poste em cima do Sae
      this.cineGlow(ctx, L.headX, 612, 190, 'rgba(255,200,130,0.3)');
      this.cineGlow(ctx, L.headX, 400, 150, 'rgba(255,214,150,0.22)');
      // neve acesa dentro do cone do poste
      ctx.save();
      poly(ctx, [[L.headX - 16, L.headY + 12], [L.headX + 16, L.headY + 12], [L.headX + 200, L.poolY], [L.headX - 200, L.poolY]]);
      ctx.clip();
      ctx.translate(L.headX - 220, L.headY);
      this.mgmSnow(ctx, 440, 0, L.poolY - L.headY, t, 46, 3, 1.2, '255,236,200', 0.9, 11, 0.4);
      ctx.restore();
      // o Rin chegando (pegadas atrás dele), a bola debaixo do braço
      const wk = seg(t, 16, 140);
      const rx = lerp(150, 474, 1 - Math.pow(1 - wk, 1.7));
      const walking = wk > 0 && wk < 1;
      const fr = 1 + (Math.floor(t / 4) % 16);
      ctx.fillStyle = 'rgba(46,60,92,0.45)';
      for (let x = 160; x < rx - 20; x += 30) {
        ctx.beginPath();
        ctx.ellipse(x, 616 + ((x / 30) % 2 ? 3 : -2), 8, 3, 0, 0, TAU);
        ctx.fill();
      }
      const rs = 236;
      const ru = rs / 36;
      const rfeet = 614;
      ctx.fillStyle = 'rgba(20,28,48,0.35)';
      ctx.beginPath();
      ctx.ellipse(rx, rfeet + 2, 50, 9, 0, 0, TAU);
      ctx.fill();
      this.finRim(ctx, c.rin, rx, rfeet, rs, walking ? { animState: 'run', frame: fr } : {}, '#7dd3fc', [-1], 3);
      // andando (boneco novo de lado), a bola rola no pé dele; parado, fica na mão
      const rolling = walking && window.PixelRenderer.spritesV2;
      this.mgmBall(ctx, rolling ? rx + 4.6 * ru : rx + 9.6 * ru, rolling ? rfeet - 2.2 * ru : rfeet - rs * 0.87 + SPRITE_MAPY(20.2) * ru, 2.2 * ru, walking ? t / 5 : 0);
      // o Sae embaixo da luz, de casaco, parado
      const ss = 254;
      this.finRim(ctx, c.sae, L.headX, 614, ss, {}, '#fde68a', [-1, 1], 2);
      const su = ss / 36;
      this.mgmBreath(ctx, L.headX + su * 1.4, 614 - ss * 0.87 + SPRITE_MAPY(12.3) * su, t, 110, 2, 0.8, 1);
      this.mgmBreath(ctx, rx + ru * 1.4, rfeet - rs * 0.87 + SPRITE_MAPY(12.3) * ru, t, 60, 5, 0.7, -1, wk >= 1 ? 1 : 0.5);
      ctx.restore();
      this.mgmSnowLayers(ctx, S, t);
      this.finKicker(ctx, 40, top + 30, 'KAMAKURA • INVERNO • ANOS DEPOIS', seg(t, 8, 54), '#7dd3fc');
      this.finKicker(ctx, 40, top + 58, 'O SAE VOLTOU DA ESPANHA', seg(t, 40, 86), SAE_C);
    },

    // Fundo dos closes: a rua desfocada (ampliada suavizando) + escurecida
    mgmSnowBlurCv(W, H) {
      return this.mgmBlur('mgm_snow_blur', this.mgmSnowCv(W, H), W, H, 8);
    },
    mgmSnowBlur(ctx, S, sx, sy, sw, sh, dark = 0.45, drift = 0) {
      const { W, H } = S;
      this.mgmBlurDraw(ctx, this.mgmSnowBlurCv(W, H), W, sx, sy, sw, sh, -40 + drift, -30, W + 80, H + 60);
      ctx.fillStyle = `rgba(3,7,18,${dark})`;
      ctx.fillRect(0, 0, W, H);
    },

    // PLANO 3 — o Rin: "Mas... e o nosso sonho?"
    mgmIs2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.mgmCast();
      this.mgmSnowBlur(ctx, S, 120, 170, 560, 315, 0.42, Math.sin(t * 0.01) * 6);
      this.cineBokeh(ctx, W, top, bot - 140, t, 10, ['rgba(255,214,150,0.35)', 'rgba(147,197,253,0.25)'], 6);
      this.mgmSnow(ctx, W, top, bot, t, 90, 2, 0.8, '214,226,245', 0.5, 13, 0.4);
      const k = easeIO(t / 260);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(372, 352, k), zoom: 1 + k * 0.08, shake: 0.8 });
      const size = 860;
      const x = 640;
      const eyeY = 330;
      this.cineGlow(ctx, x + 420, top - 20, 420, 'rgba(255,200,130,0.3)');
      const r = this.finHead(ctx, c.rin, x, eyeY, size, { dim: 0.22, dimTint: '8,20,44', rim: '#7dd3fc', rimSides: [-1] });
      // luz quente do poste pelo lado direito
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.foxcGradH(ctx, x + 2 * r.u, top, 9 * r.u, bot - top, [[0, 'rgba(255,200,130,0)'], [1, 'rgba(255,200,130,0.1)']]);
      ctx.restore();
      const shock = t >= 40;
      const look = shock ? [0, 1, 0, -1][Math.floor(t / 3) % 4] : 0;
      this.mgmEyes(ctx, x, eyeY, r.u, { iris: '#0f766e', ring: '#5eead4', tiny: shock, look, glow: 'rgba(34,211,238,0.25)', shine: !shock });
      this.finU(ctx, x, r.top, r.u, 16.8, 11.85, 2.4, 0.9, '#3b0a0a');
      // a bola nas mãos, na frente do peito
      const bx = x + 1.2 * r.u;
      const by = r.top + SPRITE_MAPY(21.2) * r.u;
      const br = 3.5 * r.u;
      this.mgmBall(ctx, bx, by, br, 0);
      this.mgmPartAt(ctx, this.mgmHold(c.rin, false), bx - br - 1.6 * r.u, by - 1.8 * r.u, r.u);
      this.mgmPartAt(ctx, this.mgmHold(c.rin, true), bx + br - 1.4 * r.u, by - 1.8 * r.u, r.u);
      this.mgmBreath(ctx, x + 0.6 * r.u, r.top + SPRITE_MAPY(12.6) * r.u, t, 80, 3, 1.6, 1);
      ctx.restore();
      this.mgmSnow(ctx, W, top - 30, bot + 30, t, 14, 10, 2.4, '240,246,255', 0.55, 21, 0.5, true);
      this.finKicker(ctx, 40, top + 30, 'RIN ITOSHI', seg(t, 10, 40), RIN_C);
    },

    // PLANO 4 — o Sae, frio, embaixo da luz: "Esse sonho é seu."
    mgmIs3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.mgmCast();
      this.mgmSnowBlur(ctx, S, 600, 120, 520, 292, 0.5);
      this.cineGlow(ctx, 640, top - 40, 560, 'rgba(255,210,150,0.35)');
      this.cineShafts(ctx, 640, top - 60, Math.PI / 2, 700, 0.8, 6, '255,220,170', 0.08, t);
      ctx.save();
      poly(ctx, [[560, top - 60], [720, top - 60], [1100, bot], [180, bot]]);
      ctx.clip();
      this.mgmSnow(ctx, W, top, bot, t, 60, 3, 1.1, '255,236,200', 0.85, 23, 0.35);
      ctx.restore();
      const k = easeIO(t / 230);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(370, 356, k), zoom: 1 + k * 0.09, rot: -0.012 * k, shake: 0.5 });
      const size = 900;
      const x = 640;
      const eyeY = 372;
      const r = this.finHead(ctx, c.sae, x, eyeY, size, { dim: 0.2, dimTint: '10,16,36', rim: '#fde68a' });
      this.rincShade(ctx, c.sae, x, r.feet, size, 0.5, {}, 9.3, 11.6);
      this.mgmEyes(ctx, x, eyeY, r.u, { iris: '#134e4a', ring: '#2dd4bf', lid: 3, lidColor: this.finShade(c.sae.skinColor, -0.22), glow: 'rgba(45,212,191,0.2)' });
      this.mgmBreath(ctx, x + 0.4 * r.u, r.top + SPRITE_MAPY(12.6) * r.u, t, 100, 7, 1.6, -1, 0.8);
      ctx.restore();
      this.mgmSnow(ctx, W, top - 30, bot + 30, t, 12, 10, 2.2, '240,246,255', 0.5, 27, 0.5, true);
      this.rincStamp(ctx, 'ESSE SONHO É SEU.', 640, top + 64, 56, '#fbcfe8', t, 34, 2, W * 0.8);
      this.finKicker(ctx, 40, bot - 36, 'SAE ITOSHI', seg(t, 10, 40), SAE_C);
    },

    // Shards de vidro/gelo para um retângulo w x h (mesmo formato do getShards do motor,
    // então o drawCracks dele desenha as rachaduras)
    mgmShards(w, h, cx, cy) {
      const key = `${w}x${h}x${Math.round(cx)}x${Math.round(cy)}`;
      if (this._mgmShards?.key === key) return this._mgmShards;
      let seed = 11;
      const R = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      const radii = [0, 34, 92, 170, 290, Math.hypot(w, h)];
      const n = 11;
      const angles = Array.from({ length: n }, (_, j) => (j / n) * TAU + (R() - 0.5) * 0.4);
      const V = radii.map((rr, i) =>
        angles.map((a) => {
          if (i === 0) return [cx, cy];
          const r2 = rr * (i === radii.length - 1 ? 1 : 0.85 + R() * 0.3);
          const a2 = a + (R() - 0.5) * 0.18;
          return [cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2];
        })
      );
      const list = [];
      for (let i = 0; i < radii.length - 1; i++) {
        for (let j = 0; j < n; j++) {
          const j2 = (j + 1) % n;
          const pts = i === 0 ? [V[0][j], V[1][j], V[1][j2]] : [V[i][j], V[i][j2], V[i + 1][j2], V[i + 1][j]];
          const sx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
          const sy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
          const d = Math.hypot(sx - cx, sy - cy) || 1;
          const xs = pts.map((p) => p[0]);
          const ys = pts.map((p) => p[1]);
          const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 2);
          const y0 = Math.max(0, Math.floor(Math.min(...ys)) - 2);
          const x1 = Math.min(w, Math.ceil(Math.max(...xs)) + 2);
          const y1 = Math.min(h, Math.ceil(Math.max(...ys)) + 2);
          if (x1 <= x0 || y1 <= y0) continue;
          list.push({ pts, cx: sx, cy: sy, ring: i, vx: ((sx - cx) / d) * (1 + R() * 2.5), vy: ((sy - cy) / d) * (1 + R() * 1.5) - 1.5, vr: (R() - 0.5) * 0.07, bb: [x0, y0, x1 - x0, y1 - y0], dl: R() });
        }
      }
      this._mgmShards = { key, list, V, rings: radii.length - 1, n };
      return this._mgmShards;
    },

    // Cristais de gelo (pré-sorteados, ordenados da borda para o meio)
    mgmFrostList(w, h, n = 260) {
      const key = `${w}x${h}x${n}`;
      if (this._mgmFrost?.key === key) return this._mgmFrost.list;
      const R = this.mgmRng(3131);
      const list = [];
      for (let i = 0; i < n; i++) {
        const x = R() * w;
        const y = R() * h;
        const e = Math.min(x, w - x, y, h - y) / (Math.min(w, h) / 2);
        // cristal em pixel: um floquinho em cruz (braços de 1 a 3 células) + pontas soltas
        const sq = [];
        const s = 2 + Math.floor(R() * 2);
        const arm = 1 + Math.floor(R() * 3);
        sq.push([0, 0, s, true]);
        for (let a = 1; a <= arm; a++) {
          const white = a < arm;
          sq.push([a * s, 0, s, white], [-a * s, 0, s, white], [0, a * s, s, white], [0, -a * s, s, white]);
        }
        if (R() < 0.5) sq.push([s, s, s, false], [-s, -s, s, false], [s, -s, s, false], [-s, s, s, false]);
        list.push({ x, y, e: e * (0.75 + R() * 0.5), sq });
      }
      list.sort((a, b) => a.e - b.e);
      this._mgmFrost = { key, list };
      return list;
    },
    mgmFrost(ctx, x0, y0, w, h, p) {
      if (p <= 0) return;
      const list = this.mgmFrostList(w, h);
      ctx.save();
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.e > p * 1.15) break;
        c.sq.forEach(([dx, dy, s, white]) => {
          ctx.fillStyle = white ? 'rgba(255,255,255,0.92)' : 'rgba(191,219,254,0.75)';
          ctx.fillRect(Math.round(x0 + c.x + dx), Math.round(y0 + c.y + dy), s, s);
        });
      }
      ctx.restore();
    },

    // A foto da lembrança (praia) dentro de uma moldura branca, em coordenadas locais
    mgmMemPhoto(g, S, frost) {
      const PW = 720;
      const PH = 414;
      g.fillStyle = '#f5efe6';
      g.fillRect(0, 0, PW, PH);
      g.save();
      g.imageSmoothingEnabled = true;
      g.drawImage(this.finBg('mgm_beachmem', S.W, S.H, this.mgmBeachMem), 140, 90, 1000, 560, 12, 12, PW - 24, PH - 24);
      g.restore();
      if (frost > 0) {
        g.fillStyle = `rgba(148,180,220,${0.38 * frost})`;
        g.fillRect(12, 12, PW - 24, PH - 24);
        this.mgmFrostEdges(g, 0, 0, PW, PH, frost, 90);
        this.mgmFrost(g, 0, 0, PW, PH, frost);
      }
    },
    // Gelo branco subindo pelas bordas (degradês prontos, intensidade no globalAlpha)
    mgmFrostEdges(g, x, y, w, h, a, d) {
      if (a <= 0) return;
      const on = [[0, 'rgba(240,248,255,0.95)'], [0.35, 'rgba(226,240,255,0.5)'], [1, 'rgba(226,240,255,0)']];
      const off = [[0, 'rgba(226,240,255,0)'], [0.65, 'rgba(226,240,255,0.5)'], [1, 'rgba(240,248,255,0.95)']];
      g.save();
      g.globalAlpha *= Math.min(1, a);
      this.foxcGrad(g, x, y, w, d, on);
      this.foxcGrad(g, x, y + h - d, w, d, off);
      this.foxcGradH(g, x, y, d * 1.2, h, on);
      this.foxcGradH(g, x + w - d * 1.2, y, d * 1.2, h, off);
      g.restore();
    },

    // PLANO 5 — "Some da minha vida." → a bola cai na neve → a lembrança congela e quebra
    mgmIs4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.mgmCast();
      const L = this.mgmLampGeo(W, H, W * 0.62);
      if (t < 130) {
        // por cima do ombro do Rin: o Sae fala, vira as costas e vai embora
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 700, y: 404, zoom: 1.22 + easeIO(t / 130) * 0.05, shake: 0.5 });
        ctx.drawImage(this.mgmSnowCv(W, H), 0, 0);
        const turn = t >= 84;
        const w = easeIO(seg(t, 96, 130));
        const sx = lerp(L.headX, 690, w);
        const sfeet = lerp(614, 520, w);
        const ss = lerp(254, 180, w);
        this.finRim(ctx, c.sae, sx, sfeet, ss, turn ? { facing: 'back' } : {}, '#fde68a', [-1, 1], 2);
        ctx.restore();
        this.mgmSnowLayers(ctx, S, t, 0.8, false);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + easeIO(t / 130) * 0.03, shake: 0.8 });
        const rs = 700;
        const rfeet = bot + 250;
        this.cineGlow(ctx, 470, 420, 300, 'rgba(34,211,238,0.12)');
        this.finRim(ctx, c.rin, 250, rfeet, rs, { facing: 'back', dim: 0.5, dimTint: '2,6,16' }, '#22d3ee', [1], 10);
        // a bola ainda na mão dele
        const ru = rs / 36;
        this.mgmBall(ctx, 250 + 9.4 * ru, rfeet - rs * 0.87 + SPRITE_MAPY(20.6) * ru, 2.3 * ru, 0);
        ctx.restore();
        this.mgmSnow(ctx, W, top - 30, bot + 30, t, 10, 10, 2.4, '240,246,255', 0.5, 31, 0.5, true);
        return;
      }
      if (t < 200) {
        // a bola cai na neve
        const u = t - 130;
        this.cineGradient(ctx, 0, 0, W, H, [[0, '#050a18'], [0.45, '#141f38'], [0.58, '#4b5a7a'], [1, '#a9b8d1']]);
        this.cineBokeh(ctx, W, top + 20, 330, t, 12, ['rgba(255,214,150,0.4)', 'rgba(147,197,253,0.3)'], 12);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: 1.02 + easeIO(u / 70) * 0.06, shake: u >= 20 && u < 34 ? 3 : 0.5 });
        // a poça de luz do poste na neve e a sombra comprida do Rin entrando no quadro
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(640, 600);
        ctx.scale(1, 0.22);
        this.cineGlow(ctx, 0, 0, 520, 'rgba(255,200,130,0.4)');
        ctx.restore();
        // as pegadas dele chegando até ali
        ctx.fillStyle = 'rgba(40,52,84,0.5)';
        for (let i = 0; i < 6; i++) {
          const fx = 120 + i * 78 + (i % 2) * 10;
          const fy = 650 - i * 8 + (i % 2 ? 10 : 0);
          ctx.beginPath();
          ctx.ellipse(fx, fy, 22 - i, 8 - i * 0.6, -0.15, 0, TAU);
          ctx.fill();
        }
        const land = 20;
        const br = 70;
        let by;
        if (u < land) by = lerp(top - 120, 600 - br, (u / land) * (u / land));
        else {
          const b = u - land;
          by = 600 - br + 18 - (b < 14 ? Math.sin((b / 14) * Math.PI) * 36 : 0);
        }
        this.mgmBall(ctx, 640, by, br, u < land ? Math.floor(u / 4) : 2);
        // a neve na frente da bola (ela afunda) + respingo de neve
        ctx.fillStyle = '#c3cfe2';
        ctx.beginPath();
        ctx.ellipse(640, 604, br * 1.25, 16, 0, 0, TAU);
        ctx.fill();
        if (u >= land) {
          const b = u - land;
          for (let i = 0; i < 26; i++) {
            const a = Math.PI + rnd(i, 41) * Math.PI;
            const v = 3 + rnd(i, 42) * 6;
            const px = 640 + Math.cos(a) * v * b * 1.4;
            const py = 596 + Math.sin(a) * v * b + b * b * 0.18;
            if (py > 610 || b > 40) continue;
            ctx.fillStyle = `rgba(241,245,251,${1 - b / 40})`;
            ctx.fillRect(px, py, 6, 6);
          }
          // flocos pousando na bola
          ctx.fillStyle = 'rgba(241,245,251,0.95)';
          for (let i = 0; i < Math.min(14, Math.floor(b / 3)); i++) ctx.fillRect(640 - br * 0.7 + rnd(i, 44) * br * 1.4, 600 - br * 2 + 14 + rnd(i, 45) * 26 + Math.abs(rnd(i, 46) - 0.5) * 30, 6, 4);
        }
        ctx.restore();
        this.cineSfx(S, 150, 'bola', () => window.SFX?.kick?.(0.15));
        this.mgmSnowLayers(ctx, S, t, 0.9);
        this.rincStamp(ctx, '...tum.', 900, 470, 34, '#cbd5e1', u, land + 4, 3);
        return;
      }
      // a lembrança congela, racha e cai em pedaços
      const u = t - 200;
      const PW = 720;
      const PH = 414;
      const crackAt = 56;
      const fallAt = 92;
      this.mgmSnowBlur(ctx, S, 300, 200, 680, 380, 0.7);
      this.mgmSnow(ctx, W, top, bot, t, 70, 2, 0.8, '214,226,245', 0.45, 33, 0.4);
      const px = W / 2 - PW / 2;
      const py = (top + bot) / 2 - PH / 2 - 4;
      const kin = ease(seg(u, 0, 18));
      const rot = -0.03;
      const frost = seg(u, 10, 50);
      ctx.save();
      ctx.translate(W / 2, (top + bot) / 2 - 4 + (1 - kin) * 40);
      ctx.rotate(rot);
      ctx.globalAlpha = Math.min(1, kin * 2);
      ctx.translate(-PW / 2, -PH / 2);
      this.cineGlow(ctx, PW / 2, PH / 2, 520, 'rgba(255,190,120,0.25)', 1 - frost);
      const shards = this.mgmShards(PW, PH, PW * 0.42, PH * 0.47);
      // a foto congelada é montada UMA vez, alguns quadros antes da rachadura (o gelo já
      // está completo); cada caco é recortado na 1ª vez que aparece
      if (!this._mgmMemSrc) this._mgmMemSrc = document.createElement('canvas');
      const src = this._mgmMemSrc;
      const key = `${this._cineRun}|${S.W}`;
      if (u >= crackAt - 6 && this._mgmMemKey !== key) {
        src.width = PW;
        src.height = PH;
        const g = src.getContext('2d');
        g.clearRect(0, 0, PW, PH);
        this.mgmMemPhoto(g, S, 1);
        g.getImageData(0, 0, 1, 1);
        this._mgmMemKey = key;
      }
      if (u < crackAt) {
        this.mgmMemPhoto(ctx, S, frost);
      } else {
        const bake = (sh) => {
          if (sh.bakeKey === key) return;
          const [bx, by, bw, bh] = sh.bb;
          const cv = sh.cv || document.createElement('canvas');
          cv.width = bw;
          cv.height = bh;
          const g = cv.getContext('2d');
          g.save();
          g.translate(-bx, -by);
          poly(g, sh.pts);
          g.clip();
          g.drawImage(src, bx, by, bw, bh, bx, by, bw, bh);
          g.restore();
          sh.cv = cv;
          sh.bakeKey = key;
        };
        const drawShard = (sh, dx, dy, rr, dark, edge) => {
          bake(sh);
          ctx.save();
          ctx.translate(sh.cx + dx, sh.cy + dy);
          if (rr) ctx.rotate(rr);
          ctx.translate(-sh.cx, -sh.cy);
          ctx.drawImage(sh.cv, sh.bb[0], sh.bb[1]);
          if (dark > 0 || edge > 0) {
            // o contorno do caco só dentro da foto (os cacos de fora passam da moldura)
            ctx.beginPath();
            ctx.rect(0, 0, PW, PH);
            ctx.clip();
            poly(ctx, sh.pts);
            if (dark > 0) {
              ctx.fillStyle = `rgba(2,6,23,${dark})`;
              ctx.fill();
            }
            if (edge > 0) {
              ctx.strokeStyle = `rgba(224,242,254,${edge})`;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
          ctx.restore();
        };
        const v = u - crackAt;
        if (u < fallAt) {
          const rings = Math.min(shards.rings, 1 + Math.floor(v / 4));
          const spread = ease(seg(v, 4, 36)) * 3;
          ctx.drawImage(src, 0, 0);
          shards.list.forEach((sh) => {
            if (sh.ring >= rings) return;
            drawShard(sh, sh.vx * spread, sh.vy * spread * 0.5 + spread * 0.4, sh.vr * spread * 0.5, 0, 0);
          });
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, PW, PH);
          ctx.clip();
          this.drawCracks(ctx, shards, rings);
          ctx.restore();
        } else {
          const f = u - fallAt;
          shards.list.forEach((sh) => {
            const d = Math.max(0, f - (sh.ring * 5 + sh.dl * 8));
            const dx = sh.vx * 3 + sh.vx * d * 1.4;
            const dy = sh.vy * 1.5 + 1.2 + sh.vy * d * 0.5 + 0.11 * d * d;
            if (py + sh.cy + dy - 200 > H) return;
            drawShard(sh, dx, dy, sh.vr * (2 + d * 1.4), Math.min(0.8, d * 0.012), Math.max(0, 0.8 - d * 0.01));
          });
        }
        if (u >= crackAt) this.cineFlash(ctx, PW, PH, 0.35 * (1 - seg(v, 0, 10)), '#e0f2fe');
      }
      ctx.restore();
      if (u >= crackAt) {
        this.cineImpactText(ctx, 'CRACK', W - 210, top + 80, 80, '#e0f2fe', seg(u - crackAt, 0, 8), 0, -0.1);
        this.cineSfx(S, 200 + crackAt, 'gelo', () => window.SFX?.kick?.(1));
        this.cineSfx(S, 200 + fallAt, 'cai', () => window.SFX?.post?.());
      }
      this.finKicker(ctx, 40, top + 30, 'A PROMESSA', seg(u, 6, 30), '#fbbf24');
      this.mgmSnow(ctx, W, top - 30, bot + 30, t, 10, 10, 2.4, '240,246,255', 0.45, 37, 0.5, true);
    },

    // PLANO 6 — o Rin chora... a neve passa... e os olhos esfriam
    mgmIs5(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.mgmCast();
      const swap = 157;
      const cold = t >= swap;
      this.mgmSnowBlur(ctx, S, 80, 200, 600, 338, cold ? 0.62 : 0.5, Math.sin(t * 0.008) * 8);
      this.cineGlow(ctx, W - 80, top + 20, 380, cold ? 'rgba(125,211,252,0.18)' : 'rgba(255,200,130,0.28)');
      this.mgmSnow(ctx, W, top, bot, t, 90, 2, 0.9, '214,226,245', 0.5, 41, 0.45);
      const k = easeIO(t / 330);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(372, 352, k), zoom: 1 + k * 0.12, shake: cold ? 0.6 : 1.1 });
      const size = 900;
      const x = 640;
      const eyeY = 346;
      const char = cold ? c.rinCold : c.rin;
      if (cold) this.cineGlow(ctx, x, eyeY, 420, 'rgba(34,211,238,0.18)');
      const ho = cold ? { dim: 0.3, dimTint: '0,24,36', rim: '#67e8f9' } : { dim: 0.2, dimTint: '8,20,44', rim: '#7dd3fc' };
      const r = this.finHead(ctx, char, x, eyeY, size, ho);
      // a veia de raiva do boneco fica de fora do close: o cabelo do boneco sem raiva por cima
      if (cold) this.finCrop(ctx, c.rin, ho, 20.5, 3.1, 4.6, 3.7, x - size / 2 + 20.5 * r.u, r.top + SPRITE_MAPY(3.1) * r.u, 4.6 * r.u, 3.7 * r.u);
      const pw = Math.ceil(r.u * 0.4);
      // as lágrimas (pixel): correndo enquanto ele chora; depois ficam paradas, congeladas
      [-1, 1].forEach((sd) => {
        const tx = Math.round(x + sd * 3.5 * r.u - pw / 2 + sd * 0.6 * r.u);
        const ty = Math.round(eyeY + 1.0 * r.u);
        const len = Math.round(ease(seg(t, 6 + (sd > 0 ? 10 : 0), 70)) * 3.3 * r.u);
        if (len <= 0) return;
        ctx.fillStyle = cold ? 'rgba(224,242,254,0.55)' : 'rgba(186,230,253,0.9)';
        ctx.fillRect(tx, ty, pw, len);
        ctx.fillStyle = cold ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)';
        ctx.fillRect(tx, ty, Math.ceil(pw / 3), len);
        if (cold) {
          ctx.fillStyle = 'rgba(240,249,255,0.8)';
          ctx.fillRect(tx - Math.round(pw * 0.2), ty + len - pw, Math.round(pw * 1.4), Math.round(pw * 1.2));
          return;
        }
        if (t < 60) return;
        // gotas pingando do queixo
        for (let j = 0; j < 2; j++) {
          const ph = (t + j * 25 + (sd > 0 ? 13 : 0)) % 50;
          const dy = ph * ph * 0.1;
          if (ty + len + dy > S.bot + 30) continue;
          ctx.fillStyle = 'rgba(186,230,253,0.9)';
          ctx.fillRect(tx - Math.round(pw * 0.2), ty + len + Math.round(dy), Math.round(pw * 1.4), Math.round(pw * 1.5));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(tx, ty + len + Math.round(dy), Math.ceil(pw / 3), Math.ceil(pw / 3));
        }
      });
      if (!cold) {
        this.mgmEyes(ctx, x, eyeY, r.u, { iris: '#0f766e', ring: '#5eead4', look: 0, shine: true, wet: true, glow: 'rgba(34,211,238,0.18)' });
        // a boca tremendo, virada pra baixo (choro engolido)
        const jit = Math.floor(t / 4) % 2 ? 0.1 : 0;
        this.finU(ctx, x, r.top, r.u, 16.9, 11.75 + jit, 2.2, 0.55, '#3b0a0a');
        this.finU(ctx, x, r.top, r.u, 16.3, 12.2 + jit, 0.7, 0.5, '#3b0a0a');
        this.finU(ctx, x, r.top, r.u, 19.0, 12.2 + jit, 0.7, 0.5, '#3b0a0a');
        // sobrancelhas subindo no meio (tristeza)
        this.finU(ctx, x, r.top, r.u, 15.2, 7.6, 1.2, 0.6, '#090d16');
        this.finU(ctx, x, r.top, r.u, 19.6, 7.6, 1.2, 0.6, '#090d16');
        this.mgmBreath(ctx, x + 0.6 * r.u, r.top + SPRITE_MAPY(12.6) * r.u, t, 70, 9, 1.6, 1);
      } else {
        const kk = seg(t, swap, swap + 50);
        this.mgmEyes(ctx, x, eyeY, r.u, { iris: '#021a1d', ring: '#22d3ee', look: 0, angry: true, line: '#010409', glow: 'rgba(34,211,238,0.55)', glowA: 0.4 + 0.6 * kk });
        this.mgmBreath(ctx, x + 0.6 * r.u, r.top + SPRITE_MAPY(12.6) * r.u, t, 120, 9, 1.6, 1, 0.6);
      }
      ctx.restore();
      if (cold) {
        ctx.fillStyle = `rgba(8,47,73,${0.22 * seg(t, swap, swap + 40)})`;
        ctx.fillRect(0, 0, W, H);
        // o gelo tomando as bordas da tela
        const fk = seg(t, swap + 10, swap + 120);
        this.mgmFrostEdges(ctx, 0, top, W, bot - top, fk * 0.7, 120);
        this.mgmFrost(ctx, 0, top, W, bot - top, fk * 0.2);
      }
      this.mgmSnow(ctx, W, top - 30, bot + 30, t, 12, 10, 2.4, '240,246,255', 0.5, 43, 0.5, true);
      // a rajada de neve que passa (esconde a troca: o choro vira gelo)
      const gk = seg(t, 138, 178);
      if (gk > 0 && gk < 1) {
        const dens = Math.sin(gk * Math.PI);
        ctx.save();
        for (let i = 0; i < 150; i++) {
          const y = top + rnd(i, 51) * (bot - top);
          const sp = 40 + rnd(i, 52) * 60;
          const xx = ((rnd(i, 53) * (W + 600) + (t - 138) * sp) % (W + 600)) - 300;
          ctx.fillStyle = `rgba(226,236,248,${(0.25 + rnd(i, 55) * 0.5) * dens})`;
          ctx.fillRect(xx, y, 60 + rnd(i, 54) * 170, 2 + rnd(i, 56) * 5);
        }
        ctx.fillStyle = `rgba(226,236,248,${0.85 * Math.pow(dens, 3)})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      this.cineSfx(S, 138, 'rajada', () => window.SFX?.whoosh?.());
      const kt = seg(t, 214, 254);
      if (kt > 0) {
        this.foxcGrad(ctx, 0, bot - 230, W, 230, [[0, 'rgba(2,6,23,0)'], [0.5, `rgba(2,6,23,${0.6 * kt})`], [1, `rgba(2,6,23,${0.8 * kt})`]]);
        this.cineTitleCard(ctx, W, bot - 104, kt, { kicker: 'RIN & SAE ITOSHI', title: 'NEVE EM KAMAKURA', color: RIN_C });
      }
      this.cineSfx(S, 214, 'titulo', () => window.SFX?.kick?.(0.7));
    }
  });

  // ==========================================================================
  // AQUECIMENTO (montado durante o plano 1, um item por quadro)
  // ==========================================================================
  const spr = (who, o, size = 180) =>
    function () {
      this.finSprEntry(this.mgmCast()[who], size, o);
    };
  const roomStep = function () {
    this.mgmRoom(true);
  };
  const warmNagi = [
    roomStep,
    roomStep,
    roomStep,
    roomStep,
    roomStep,
    spr('reo', { rim: '#c084fc', rimSides: [-1], rimD: 2 }),
    spr('nagi', { rim: '#94a3b8', rimSides: [-1, 1], rimD: 2 }),
    spr('you', { rim: '#2dd4bf', rimSides: [1], rimD: 2 }),
    spr('reo', { rim: '#a855f7', rimSides: [-1], rimD: 1 }),
    spr('reo', { facing: 'back', dim: 0.3, dimTint: '30,16,60', rim: '#c084fc', rimSides: [1], rimD: 1 }),
    function () {
      const c = this.mgmCast();
      this.mgmArm(c.reo);
      this.mgmArm(c.reo, 0.3);
      this.mgmFist(c.reo);
      this.mgmPhone();
    },
    spr('nagiMem', { dim: 0.12, dimTint: '80,40,0' }),
    spr('nagi', { rim: '#f8fafc' }),
    spr('reo', {}),
    spr('you', {}),
    function () {
      this.mgmCrownPieces();
    },
    spr('reo', { dim: 0.25, dimTint: '20,10,40', rim: '#c084fc' }),
    function () {
      this.mgmFlush(this.mgmRoomBlur());
    },
    function () {
      if (!this._mgmDummy) this._mgmDummy = document.createElement('canvas').getContext('2d');
      this.mgmBandShade(this._mgmDummy, this.mgmCast().reo, 0, 0, 180, 1, 7.3, 8.0, 10.9, 12.3);
    }
  ];
  const scr = () => {
    const cv = document.getElementById('sakuga-action-canvas');
    return [cv?.width || 1280, cv?.height || 720];
  };
  const snowStep = function () {
    const [w, h] = scr();
    this.mgmBake('mgm_snow', w, h, this.mgmSnowSteps(0.62, false), false);
  };
  const beachStep = function () {
    const [w, h] = scr();
    this.mgmBeach(w, h, true);
  };
  const warmItoshi = [
    beachStep,
    beachStep,
    function () {
      const [w, h] = scr();
      this.mgmFlush(this.finBg('mgm_vigwarm', w, h, this.mgmWarmVig));
    },
    spr('saeKid', {}),
    spr('saeKid', { animState: 'shoot' }),
    spr('rinKid', {}, 144),
    spr('rinKid', { animState: 'shoot', flipX: true }, 144),
    snowStep,
    snowStep,
    snowStep,
    snowStep,
    snowStep,
    snowStep,
    snowStep,
    snowStep,
    snowStep,
    function () {
      const [w, h] = scr();
      this.mgmFlush(this.finBg('mgm_beachmem', w, h, this.mgmBeachMem));
    },
    spr('rin', { rim: '#7dd3fc', rimSides: [-1], rimD: 2 }),
    spr('sae', { rim: '#fde68a', rimSides: [-1, 1], rimD: 1 }),
    spr('rin', { dim: 0.22, dimTint: '8,20,44', rim: '#7dd3fc', rimSides: [-1] }),
    spr('sae', { dim: 0.2, dimTint: '10,16,36', rim: '#fde68a' }),
    function () {
      const c = this.mgmCast();
      this.mgmHold(c.rin, false);
      this.mgmHold(c.rin, true);
      if (!this._mgmDummy) this._mgmDummy = document.createElement('canvas').getContext('2d');
      this.rincShade(this._mgmDummy, c.sae, 0, 0, 180, 1, {}, 9.3, 11.6);
    },
    spr('rin', { facing: 'back', dim: 0.5, dimTint: '2,6,16', rim: '#22d3ee', rimSides: [1], rimD: 3 }),
    spr('sae', { facing: 'back', rim: '#fde68a', rimSides: [-1, 1], rimD: 2 }),
    spr('rin', { dim: 0.2, dimTint: '8,20,44', rim: '#7dd3fc' }),
    spr('rinCold', { dim: 0.3, dimTint: '0,24,36', rim: '#67e8f9' }),
    spr('rin', { dim: 0.3, dimTint: '0,24,36', rim: '#67e8f9' }),
    function () {
      const [w, h] = scr();
      this.mgmFlush(this.mgmSnowBlurCv(w, h));
    },
    function () {
      this.mgmFrostList(720, 414);
    }
  ];

  // ==========================================================================
  // REGISTRO
  // ==========================================================================
  CE.registerCine('nagi_reo_split', {
    phases: [206, 364, 340, 304, 286],
    music: 'mystery',
    title: '👑 O TESOURO QUE FOI EMBORA',
    tags: ['PLANO 1 • A SALA BRANCA', 'PLANO 2 • VEM COMIGO', 'PLANO 3 • EU QUERO', 'PLANO 4 • A MÃO NO AR', 'PLANO 5 • SOZINHO'],
    subs: [
      [],
      [{ from: 10, who: 'REO MIKAGE', text: '"Nagi, vem comigo. A gente começou isso juntos."', color: REO_C }],
      [{ from: 8, who: 'SEISHIRO NAGI', text: '"Desculpa, Reo. Eu quero jogar com ele."', color: NAGI_C }],
      [{ from: 8, who: 'NARRADOR', text: 'O tesouro do Reo escolheu outro dono.', color: NARR_C }],
      [{ from: 40, to: 270, who: 'REO MIKAGE', text: '"...Vai, então."', color: REO_C }]
    ],
    grain: 0,
    vignette: 0.5,
    draw(ctx, S) {
      [this.mgmNr0, this.mgmNr1, this.mgmNr2, this.mgmNr3, this.mgmNr4][S.phase].call(this, ctx, S);
      this.mgmWarm(S, warmNagi);
      this.foxcGrain(ctx, S.W, S.H, 0.05);
    }
  });

  CE.registerCine('itoshi_snow', {
    phases: [330, 384, 262, 234, 344, 330],
    music: 'promise',
    title: '❄️ NEVE EM KAMAKURA',
    tags: ['PLANO 1 • A PROMESSA', 'PLANO 2 • ANOS DEPOIS', 'PLANO 3 • O NOSSO SONHO', 'PLANO 4 • ESSE SONHO É SEU', 'PLANO 5 • SOME DA MINHA VIDA', 'PLANO 6 • NEVE EM KAMAKURA'],
    subs: [
      [{ from: 10, who: 'SAE ITOSHI', text: '"Nós dois. A melhor dupla do mundo."', color: SAE_C }],
      [{ from: 4, who: 'SAE ITOSHI', text: '"Eu não vou mais ser atacante. Vou ser meio-campista."', color: SAE_C }],
      [{ from: 10, who: 'RIN ITOSHI', text: '"Mas... e o nosso sonho?"', color: RIN_C }],
      [{ from: 8, who: 'SAE ITOSHI', text: '"Esse sonho é seu."', color: SAE_C }],
      [{ from: 4, who: 'SAE ITOSHI', text: '"Você não serve pra mim. Some da minha vida."', color: SAE_C }],
      [{ from: 24, who: 'RIN ITOSHI', text: '"...Então eu vou te destruir, Sae."', color: RIN_C }]
    ],
    grain: 0,
    vignette: 0.6,
    draw(ctx, S) {
      [this.mgmIs0, this.mgmIs1, this.mgmIs2, this.mgmIs3, this.mgmIs4, this.mgmIs5][S.phase].call(this, ctx, S);
      this.mgmWarm(S, warmItoshi);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
    }
  });
})();
