// ============================================================================
// CENAS DA PARTIDA (cine_partida) — ver js/cine_kit.js
// Tocam NO MEIO do jogo, então são curtas (5–9 s) e usam a config que a partida passa:
//   scripted_shot             • gol garantido do roteiro, do seu time OU do rival (this.shotCfg)
//   chem_reaction             • reação química com o parceiro, cada um no seu estilo (this.chemCfg)
//   flow_awaken               • o despertar do Fluxo [G] (this.flowCfg)
//   first_selection_awakening • seu 1º gol no cap. 2 (o chute direto contra o Time V)
//   nel_metavision_goal       • seu 1º gol na NEL (Metavision e o chute de duas armas)
// Sem config (teste fora da partida) cada cena monta uma de demonstração.
// Helpers no CutsceneEngine com o prefixo ptd. Bonecos e fundos ficam guardados prontos.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine) return;

  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const easeIn = (x) => clamp(x) * clamp(x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const back = (x) => {
    x = clamp(x);
    const c1 = 1.70158;
    return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };
  const mod = (a, n) => ((a % n) + n) % n;
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  const rgbOf = (hex) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (m) return [1, 2, 3].map((i) => parseInt(m[i], 16));
    const s = /^#?([\da-f])([\da-f])([\da-f])$/i.exec(hex || '');
    if (s) return [1, 2, 3].map((i) => parseInt(s[i] + s[i], 16));
    return [0, 245, 212];
  };
  const rgba = (hex, a) => `rgba(${rgbOf(hex).join(',')},${a})`;
  const mix = (a, b, k) => {
    const A = rgbOf(a);
    const B = rgbOf(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  const lastName = (s) => String(s || '').trim().split(' ').pop().toUpperCase();

  const YOU = '#00f5d4';
  const INK = '#0a1430';
  const PAPER = '#e0f2fe';
  const KIT_BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const KIT_V = { jerseyPrimary: '#f8fafc', jerseySecondary: '#7e22ce' };
  const KIT_BASTARD = { jerseyPrimary: '#111827', jerseySecondary: '#dc2626' };
  const KIT_UBERS = { jerseyPrimary: '#1e1b4b', jerseySecondary: '#a855f7' };
  // Quadros de corrida/aura que ficam guardados (o 0 é o do piscar)
  const RUN = [3, 7, 11, 15];
  const AURA = [5, 9, 13];
  const runF = (t, sp = 4) => RUN[Math.floor(t / sp) % RUN.length];
  const auraF = (t) => AURA[Math.floor(t / 6) % AURA.length];

  Object.assign(CE, {
    // ======================================================================
    // BONECOS GUARDADOS
    // ======================================================================
    ptdCharKey(c) {
      return [c.id || '', c.name || '', c.jerseyPrimary, c.jerseySecondary, c.hairColor, c.hairSecondary, c.skinColor, c.eyeColor, c.hairStyle, c.eyeStyle || '', c.angry ? 1 : 0, c.outfit || '', c.clothesColor || ''].join('|');
    },
    // o = { facing, animState, frame, flipX, tint, dim, dimTint, showAura, auraColor, rim, rimD }
    ptdEntry(char, base, o) {
      const cache = this._ptdSpr || (this._ptdSpr = new Map());
      const key = [
        base, this.ptdCharKey(char), o.facing || 'front', o.animState || 'idle', o.frame || 45, o.flipX ? 1 : 0, o.tint || '', o.dim || 0,
        o.dimTint || '', o.showAura ? 1 : 0, o.showAura ? o.auraColor || '' : '', o.rim || '', o.rimD || 0
      ].join('#');
      let e = cache.get(key);
      if (e) return e;
      if (o.rim) {
        const plain = Object.assign({}, o, { rim: null });
        const body = this.ptdEntry(char, base, plain);
        const sil = this.ptdEntry(char, base, Object.assign({}, plain, { tint: o.rim, dim: 0, showAura: false }));
        const cv = document.createElement('canvas');
        cv.width = body.cv.width;
        cv.height = body.cv.height;
        const g = cv.getContext('2d');
        const d = o.rimD || Math.max(1, Math.round(base / 70));
        g.drawImage(sil.cv, -d, -Math.round(d * 0.5));
        g.drawImage(sil.cv, d, -Math.round(d * 0.5));
        g.drawImage(sil.cv, 0, -d);
        g.drawImage(body.cv, 0, 0);
        e = { cv, pad: body.pad, base };
      } else {
        const pad = Math.ceil(base * 0.45);
        const cv = document.createElement('canvas');
        cv.width = base + pad * 2;
        cv.height = Math.ceil(base * 1.1) + pad * 2;
        const g = cv.getContext('2d');
        g.translate(pad, pad);
        window.PixelRenderer.drawCharacterSprite(g, char, base, base * 1.1, {
          facing: o.facing || 'front',
          animState: o.animState || 'idle',
          frame: o.frame || 45,
          flipX: !!o.flipX,
          tint: o.tint,
          showAura: !!o.showAura,
          auraColor: o.auraColor
        });
        g.setTransform(1, 0, 0, 1, 0, 0);
        if (o.dim) {
          g.globalCompositeOperation = 'source-atop';
          g.fillStyle = `rgba(${o.dimTint || '2,6,23'},${o.dim})`;
          g.fillRect(0, 0, cv.width, cv.height);
          g.globalCompositeOperation = 'source-over';
        }
        e = { cv, pad, base };
      }
      if (cache.size > 220) cache.delete(cache.keys().next().value);
      cache.set(key, e);
      return e;
    },
    // Boneco com os pés em (x, feet). Base de 180 (5 px por unidade) ampliada sem suavizar
    ptdSpr(ctx, char, x, feet, size, o = {}) {
      const base = size >= 180 ? 180 : Math.max(36, 36 * Math.ceil(size / 36));
      const e = this.ptdEntry(char, base, o);
      const k = size / base;
      ctx.save();
      ctx.imageSmoothingEnabled = size < base;
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.drawImage(e.cv, Math.round(x - size / 2 - e.pad * k), Math.round(feet - size * 0.87 - e.pad * k), e.cv.width * k, e.cv.height * k);
      ctx.restore();
    },
    // Close: o olho do boneco fica em eyeY
    // (no PixelRenderer o olho fica de 8,8 a 11,2 unidades do topo: centro em 10)
    ptdHead(ctx, char, cx, eyeY, size, o = {}) {
      const u = size / 36;
      const top = eyeY - 10 * u;
      this.ptdSpr(ctx, char, cx, top + size * 0.87, size, o);
      return { u, top };
    },
    // Olhos em pixel art por cima dos olhos do boneco (close). u = px por unidade do boneco
    ptdEyes(ctx, char, cx, eyeY, u, o = {}) {
      const eye = char.eyeColor || '#0f766e';
      const px = u * 0.34;
      [-1, 1].forEach((s) => {
        const ex = cx + s * 3.5 * u;
        this.drawPixelEye(ctx, ex, eyeY, px, {
          line: o.line || '#020617',
          white: o.white,
          iris: o.iris || mix(eye, '#000000', 0.5),
          ring: o.ring || eye,
          look: o.look || 0,
          tiny: o.tiny,
          blink: o.blink
        });
        if (o.angry && !o.blink) this.ptdLid(ctx, ex, eyeY, px, -s, o.line || '#020617');
      });
    },
    // Pálpebra brava por cima do olho em pixel (desce para o lado do nariz; side 1 = olho da esquerda)
    ptdLid(ctx, cx, cy, px, side, color) {
      const x0 = Math.round(cx - 6 * px);
      const y0 = Math.round(cy - 3.5 * px);
      const s = Math.ceil(px);
      ctx.fillStyle = color;
      for (let c = 1; c < 11; c++) {
        const inner = side > 0 ? c : 11 - c;
        if (inner >= 4) ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + 1 * px), s, s);
        if (inner >= 6) ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + 2 * px), s, s);
        if (inner >= 9) ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + 3 * px), s, s);
      }
    },
    // Pedaço do boneco ampliado (unidades 0..36) — closes extremos sem desenhar o boneco gigante
    ptdCrop(ctx, char, o, ux, uy, uw, uh, dx, dy, dw, dh) {
      const e = this.ptdEntry(char, 180, o || {});
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(e.cv, e.pad + ux * 5, e.pad + uy * 5, uw * 5, uh * 5, dx, dy, dw, dh);
      ctx.restore();
    },
    // Rosto recortado e ampliado (unidades ux0..ux0+uw) com os olhos em pixel por cima
    ptdFaceCrop(ctx, char, dx, dy, dw, ux0, uy0, uw, uh, eyeOpts = {}) {
      const U = dw / uw;
      this.ptdCrop(ctx, char, {}, ux0, uy0, uw, uh, dx, dy, dw, uh * U);
      this.ptdEyes(ctx, char, dx + (18 - ux0) * U, dy + (10 - uy0) * U, U, eyeOpts);
      return U;
    },
    // Brilho no olho: um risco fino atravessando a tela + o ponto aceso
    ptdEyeFlare(ctx, x, y, k, color, W) {
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = 0.85 * k;
      ctx.fillStyle = color;
      const w = W * 0.55 * ease(k);
      ctx.fillRect(x - w, y - 2, w * 2, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - w * 0.4, y - 1, w * 0.8, 2);
      ctx.restore();
      this.cineGlow(ctx, x, y, 34 + 40 * k, rgba(color, 0.85), k);
    },

    // ======================================================================
    // FUNDOS, TEXTURAS E EFEITOS GUARDADOS
    // ======================================================================
    ptdBg(key, w, h, fn) {
      const cache = this._ptdBgs || (this._ptdBgs = new Map());
      let cv = cache.get(key);
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        fn.call(this, cv.getContext('2d'), w, h);
        if (cache.size > 40) cache.delete(cache.keys().next().value);
        cache.set(key, cv);
      }
      return cv;
    },
    // Granulado barato (texturas prontas ampliadas)
    ptdGrain(ctx, W, H, alpha = 0.05) {
      if (!this._ptdNoise) {
        this._ptdNoise = [0, 1, 2].map((n) => {
          const cv = document.createElement('canvas');
          cv.width = 360;
          cv.height = 210;
          const g = cv.getContext('2d');
          const img = g.createImageData(360, 210);
          let seed = 7 + n * 7919;
          for (let i = 0; i < img.data.length; i += 4) {
            seed = (seed * 16807) % 2147483647;
            const v = seed & 1 ? 255 : 0;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = (seed >> 3) % 150;
          }
          g.putImageData(img, 0, 0);
          return cv;
        });
      }
      const f = this.sakugaFrame || 0;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this._ptdNoise[f % 3], (f * 37) % 40, (f * 23) % 30, 320, 180, 0, 0, W, H);
      ctx.restore();
    },
    // Linhas radiais (fundo de painel de mangá), guardadas por cor
    ptdRays(ctx, cx, cy, R, color, alpha = 0.3, rot = 0, n = 44, width = 0.035) {
      const cv = this.ptdBg(`rays|${color}|${n}|${width}`, 512, 512, (g) => {
        g.fillStyle = color;
        g.beginPath();
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          const w = width * (0.5 + rnd(i, 4));
          g.moveTo(256 + Math.cos(a) * 16, 256 + Math.sin(a) * 16);
          g.lineTo(256 + Math.cos(a - w) * 400, 256 + Math.sin(a - w) * 400);
          g.lineTo(256 + Math.cos(a + w) * 400, 256 + Math.sin(a + w) * 400);
          g.closePath();
        }
        g.fill();
      });
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.drawImage(cv, -R, -R, R * 2, R * 2);
      ctx.restore();
    },
    // Linhas de velocidade horizontais (dir = para onde a câmera anda)
    ptdSpeed(ctx, S, t, color, alpha = 0.3, dir = 1, speed = 40, n = 24, y0 = S.top, y1 = S.bot, seed = 3) {
      const { W } = S;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const r1 = rnd(i, seed);
        const r2 = rnd(i, seed + 4);
        const len = 120 + r2 * 380;
        const span = W + len + 200;
        let x = span - mod(r1 * span + t * speed * (0.6 + r2), span) - len;
        if (dir < 0) x = W - x - len;
        const y = y0 + rnd(i, seed + 9) * (y1 - y0);
        ctx.fillRect(Math.round(x), Math.round(y), len, 2 + (i % 3));
      }
      ctx.restore();
    },
    // Rastro da bola: um risco que afina (não é cópia da bola)
    ptdStreak(ctx, pts, color, w0, alpha = 0.9) {
      const n = pts.length;
      if (n < 2) return;
      const head = pts[0];
      const tail = pts[n - 1];
      if (Math.hypot(tail.x - head.x, tail.y - head.y) < 4) return;
      // Um polígono só, afinando até a ponta (sem bolinhas sobrepostas)
      const edge = (scale) => {
        const L = [];
        const R = [];
        for (let i = 0; i < n; i++) {
          const a = pts[Math.max(0, i - 1)];
          const b = pts[Math.min(n - 1, i + 1)];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const w = (w0 / 2) * scale * (1 - i / (n - 1));
          L.push([pts[i].x - (dy / d) * w, pts[i].y + (dx / d) * w]);
          R.push([pts[i].x + (dy / d) * w, pts[i].y - (dx / d) * w]);
        }
        poly(ctx, L.concat(R.reverse()));
      };
      ctx.save();
      const g = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
      g.addColorStop(0, rgba(color, alpha));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      edge(1);
      ctx.fill();
      const g2 = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
      g2.addColorStop(0, `rgba(248,250,252,${alpha * 0.85})`);
      g2.addColorStop(0.7, 'rgba(248,250,252,0)');
      ctx.fillStyle = g2;
      edge(0.38);
      ctx.fill();
      ctx.restore();
    },
    // Bola em pixel art (4 giros guardados) com brilho opcional
    ptdBallCv(i) {
      const cache = this._ptdBalls || (this._ptdBalls = []);
      if (cache[i]) return cache[i];
      const n = 18;
      const c = 9;
      const cv = document.createElement('canvas');
      cv.width = n;
      cv.height = n;
      const g = cv.getContext('2d');
      const a0 = (i / 4) * (TAU / 5);
      const spots = [[c, c, 2.4]];
      for (let k = 0; k < 5; k++) spots.push([c + Math.cos(a0 + (k * TAU) / 5) * 5.8, c + Math.sin(a0 + (k * TAU) / 5) * 5.8, 2]);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const px = x + 0.5;
          const py = y + 0.5;
          const d = Math.hypot(px - c, py - c);
          if (d > 8.7) continue;
          let col;
          if (d > 7.5) col = '#0b1020';
          else if (spots.some(([sx, sy, r]) => Math.hypot(px - sx, py - sy) < r)) col = '#111827';
          else if (px - c + (py - c) > 6) col = '#bfd0e6';
          else if (px + py < 11) col = '#ffffff';
          else col = '#eef2f7';
          g.fillStyle = col;
          g.fillRect(x, y, 1, 1);
        }
      }
      cache[i] = cv;
      return cv;
    },
    ptdBall(ctx, x, y, r, spin = 0, glow = null, sx = 1, sy = 1) {
      if (glow) this.cineGlow(ctx, x, y, r * 2.6, rgba(glow, 0.75));
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x, y);
      ctx.scale(sx, sy);
      ctx.drawImage(this.ptdBallCv(mod(Math.floor(spin), 4)), -r, -r, r * 2, r * 2);
      ctx.restore();
    },
    // Ondas de choque (elipses)
    ptdRings(ctx, x, y, k, colors, maxR = 300, rot = 0.3) {
      if (k <= 0 || k >= 1) return;
      ctx.save();
      colors.forEach((col, i) => {
        const r = maxR * ease(k) * (0.45 + i * 0.3);
        ctx.globalAlpha = (1 - k) * 0.9;
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(2, 10 - i * 3);
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.55, rot, 0, TAU);
        ctx.stroke();
      });
      ctx.restore();
    },
    // Etiqueta (centrada em x, ou alinhada à esquerda com o.left)
    ptdChip(ctx, text, x, y, color, k = 1, o = {}) {
      if (k <= 0) return;
      const fs = o.size || 16;
      ctx.save();
      ctx.font = `900 ${fs}px "Segoe UI", sans-serif`;
      const w = ctx.measureText(text).width + fs * 1.6;
      const h = Math.round(fs * 2);
      const e = back(k);
      ctx.globalAlpha = clamp(k * 2);
      ctx.translate(Math.round(o.left ? x + w / 2 : x), Math.round(y + (1 - e) * 18));
      ctx.fillStyle = '#020617';
      ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w, h);
      ctx.fillStyle = o.fill || 'rgba(8,15,35,0.94)';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = color;
      ctx.fillRect(-w / 2, -h / 2, 5, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
      ctx.fillStyle = o.textColor || '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 3, 1);
      ctx.restore();
      return w;
    },
    // Texto de impacto com alpha multiplicado (o da kit sobrescreve o alpha)
    ptdWord(ctx, text, x, y, size, color, k = 1, alpha = 1, rot = 0, maxW = 0) {
      if (k <= 0 || alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha *= alpha;
      this.cineImpactText(ctx, text, x, y, size, color, k, maxW, rot);
      ctx.restore();
    },
    // Quebra um texto comprido em duas linhas (no espaço/“ (”/“ + ” mais perto do meio)
    ptdSplit(text, max = 22) {
      if (text.length <= max) return [text];
      const cuts = [];
      for (let i = 1; i < text.length - 1; i++) if (text[i] === ' ') cuts.push(i);
      if (!cuts.length) return [text];
      const mid = text.length / 2;
      const at = cuts.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
      return [text.slice(0, at).trim(), text.slice(at + 1).trim()];
    },
    // Placar da transmissão. pop = 'home'|'away' (o número que acabou de mudar pula)
    ptdScore(ctx, x, y, o) {
      const { hl = 'CASA', al = 'RIVAL', hs = 0, as = 0, minute = '', hc = '#38bdf8', ac = '#ef4444', pop = null, popK = 0, k = 1 } = o;
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = clamp(k * 2);
      ctx.translate(x, y + (1 - ease(k)) * -20);
      const lw = 136;
      const sw = 98;
      const h = 42;
      const W2 = lw * 2 + sw + 12;
      ctx.fillStyle = '#020617';
      ctx.fillRect(4, 4, W2, h);
      ctx.fillStyle = 'rgba(8,15,35,0.95)';
      ctx.fillRect(0, 0, W2, h);
      ctx.fillStyle = hc;
      ctx.fillRect(0, 0, 6, h);
      ctx.fillStyle = ac;
      ctx.fillRect(W2 - 6, 0, 6, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fit = (s, max) => {
        let fs = 17;
        ctx.font = `900 ${fs}px "Segoe UI", sans-serif`;
        while (fs > 10 && ctx.measureText(s).width > max) {
          fs--;
          ctx.font = `900 ${fs}px "Segoe UI", sans-serif`;
        }
      };
      ctx.fillStyle = '#e2e8f0';
      fit(String(hl).toUpperCase(), lw - 16);
      ctx.fillText(String(hl).toUpperCase(), 6 + lw / 2, h / 2 + 1);
      fit(String(al).toUpperCase(), lw - 16);
      ctx.fillText(String(al).toUpperCase(), 6 + lw + sw + lw / 2, h / 2 + 1);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(6 + lw, 0, sw, h);
      const num = (v, cx, side) => {
        const pk = pop === side ? popK : 0;
        ctx.save();
        ctx.translate(cx, h / 2 + 1);
        const sc = 1 + (pk > 0 && pk < 1 ? Math.sin(pk * Math.PI) * 0.7 : 0);
        ctx.scale(sc, sc);
        ctx.font = '900 24px "Segoe UI", sans-serif';
        ctx.fillStyle = '#0b1020';
        ctx.fillText(String(v), 0, 0);
        ctx.restore();
      };
      num(hs, 6 + lw + sw * 0.24, 'home');
      ctx.font = '900 20px "Segoe UI", sans-serif';
      ctx.fillStyle = '#0b1020';
      ctx.fillText('-', 6 + lw + sw / 2, h / 2);
      num(as, 6 + lw + sw * 0.76, 'away');
      if (minute) {
        ctx.font = '900 13px "Segoe UI", sans-serif';
        const mw = ctx.measureText(minute).width + 22;
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(0, h, mw, 24);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(minute, mw / 2, h + 12);
      }
      ctx.restore();
    },
    // Painel de mangá (o contorno do cinePanel é refeito no fim)
    ptdPanel(ctx, pts, draw, opts = {}) {
      this.cinePanel(
        ctx,
        pts,
        () => {
          draw();
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
        },
        opts
      );
    },
    // Peça de quebra-cabeça em pixel art
    ptdPuzzleCv(color) {
      // 24x24: corpo de 12 no meio, dois encaixes para fora (cima, direita) e dois para dentro
      return this.ptdBg(`puzzle|${color}`, 24, 24, (g) => {
        const on = (x, y) => {
          const px = x + 0.5;
          const py = y + 0.5;
          const body = px > 6 && px < 18 && py > 6 && py < 18;
          const top = Math.hypot(px - 12, py - 4.4) < 2.6;
          const right = Math.hypot(px - 19.6, py - 12) < 2.6;
          const holeL = Math.hypot(px - 6.4, py - 12) < 2.4;
          const holeB = Math.hypot(px - 12, py - 17.6) < 2.4;
          return (body || top || right) && !holeL && !holeB;
        };
        for (let y = 0; y < 24; y++) {
          for (let x = 0; x < 24; x++) {
            if (!on(x, y)) continue;
            const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1);
            g.fillStyle = edge ? '#020617' : x + y < 20 ? mix(color, '#ffffff', 0.35) : color;
            g.fillRect(x, y, 1, 1);
          }
        }
      });
    },
    ptdPuzzle(ctx, x, y, s, color, rot = 0, alpha = 1) {
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.drawImage(this.ptdPuzzleCv(color), -s / 2, -s / 2, s, s);
      ctx.restore();
    },
    // Fundo de close: azul fundo com um brilho na cor (canvas 2W para mover o brilho)
    ptdCloseBg(ctx, S, color, cx, cy = S.H * 0.45) {
      const { W, H } = S;
      // metade da resolução (degradê liso: ampliar não aparece) — monta 4x mais rápido
      const cv = this.ptdBg(`close|${color}|${W}x${H}`, W, Math.round(H / 2), (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#020617');
        gr.addColorStop(1, mix('#0b1736', color, 0.18));
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        const rg = g.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, w * 0.31);
        rg.addColorStop(0, rgba(color, 0.42));
        rg.addColorStop(0.5, rgba(color, 0.12));
        rg.addColorStop(1, rgba(color, 0));
        g.fillStyle = rg;
        g.fillRect(0, 0, w, h);
      });
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(cv, Math.round((W - cx) / 2), 0, W / 2, cv.height, 0, Math.round(cy - H * 0.45), W, H);
      ctx.restore();
    },
    // Quadro de impacto: papel claro + linhas radiais em tinta
    ptdImpactBg(ctx, S, cx, cy, ink = INK, paper = PAPER, rot = 0) {
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, S.W, S.H);
      this.ptdRays(ctx, cx, cy, S.W * 1.1, ink, 0.92, rot, 56, 0.03);
    },

    // ======================================================================
    // O ESTÁDIO DA PARTIDA (mesmas cores do mapa)
    // ======================================================================
    ptdTheme(fallback = 'u20_national') {
      return window.MatchEngine?.chapter?.mapTheme || fallback;
    },
    ptdMap(theme) {
      const ME = window.MatchEngine;
      let m = null;
      try {
        m = ME?.getMapColors ? ME.getMapColors(theme) : null;
      } catch (e) {
        m = null;
      }
      return (
        m || { skyTop: '#030712', skyBot: '#172554', building: '#1e293b', signBg: '#0b1d4d', signText: 'BLUE LOCK • PROJETO', boardBg: '#1d4ed8', grass1: '#15803d', grass2: '#166534' }
      );
    },
    ptdIndoor(theme) {
      return theme === 'bluelock_bunker' || theme === 'bluelock_holo';
    },
    // Arquibancada de pixels (cores dos dois times), largura qualquer, repete a cada 2560
    ptdCrowd(g, x0, y0, w, rows, hc, ac, step = 10) {
      for (let r = 0; r < rows; r++) {
        const y = y0 + r * 12;
        g.fillStyle = r % 2 ? 'rgba(2,6,23,0.35)' : 'rgba(2,6,23,0.15)';
        g.fillRect(x0, y + 8, w, 4);
        for (let x = x0 + (r % 2) * 5; x < x0 + w; x += step) {
          const q = rnd(Math.floor(mod(x, 2560) / step) * 31 + r * 7, 5);
          g.fillStyle = q < 0.36 ? hc : q < 0.72 ? ac : q < 0.86 ? '#e2e8f0' : '#1e293b';
          g.fillRect(x + 1, y, step - 3, 8);
          if (q > 0.93) {
            g.fillStyle = '#f8fafc';
            g.fillRect(x + 2, y - 4, 2, 4);
          }
        }
      }
    },
    ptdArenaCvs(theme, hc, ac, sign) {
      const m = this.ptdMap(theme);
      const text = sign || m.signText;
      const indoor = this.ptdIndoor(theme);
      const PW = 2560;
      const backCv = this.ptdBg(`arenaB|${theme}|${hc}|${ac}|${text}`, PW, 380, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 380);
        gr.addColorStop(0, m.skyTop);
        gr.addColorStop(1, m.skyBot);
        g.fillStyle = gr;
        g.fillRect(0, 0, PW, 380);
        if (indoor) {
          // Teto do bunker com fileiras de luz e a parede de painéis com telas
          g.fillStyle = '#020617';
          g.fillRect(0, 0, PW, 110);
          for (let x = 0; x < PW; x += 160) {
            g.fillStyle = '#0b1324';
            g.fillRect(x, 0, 6, 110);
            g.fillStyle = 'rgba(103,232,249,0.9)';
            g.fillRect(x + 24, 72, 112, 8);
            g.fillStyle = 'rgba(103,232,249,0.18)';
            g.fillRect(x + 14, 80, 132, 22);
          }
          g.fillStyle = mix(m.building, '#000000', 0.25);
          g.fillRect(0, 110, PW, 240);
          for (let x = 0; x < PW; x += 128) {
            g.fillStyle = 'rgba(2,6,23,0.55)';
            g.fillRect(x, 110, 3, 240);
          }
          g.fillStyle = '#22d3ee';
          g.fillRect(0, 150, PW, 3);
          g.fillRect(0, 336, PW, 3);
          for (let x = 160; x < PW; x += 640) {
            g.fillStyle = '#020617';
            g.fillRect(x - 6, 176, 292, 136);
            g.fillStyle = '#0b2447';
            g.fillRect(x, 182, 280, 124);
            g.fillStyle = '#38bdf8';
            g.font = '900 22px "Segoe UI", sans-serif';
            g.textAlign = 'left';
            g.fillText('BLUE LOCK', x + 16, 212);
            for (let r = 0; r < 5; r++) {
              g.fillStyle = r === 0 ? '#facc15' : 'rgba(125,211,252,0.7)';
              g.fillRect(x + 16, 228 + r * 15, 30, 8);
              g.fillRect(x + 56, 228 + r * 15, 120 + rnd(r + x, 2) * 80, 8);
            }
          }
        } else {
          // Torres de refletor e arquibancada lotada
          for (let x = 320; x < PW; x += 640) {
            const rg = g.createRadialGradient(x, 56, 4, x, 56, 150);
            rg.addColorStop(0, 'rgba(255,255,255,0.55)');
            rg.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = rg;
            g.fillRect(x - 150, 0, 300, 220);
            g.fillStyle = '#0b1220';
            g.fillRect(x - 5, 76, 10, 110);
            g.fillStyle = '#111827';
            g.fillRect(x - 52, 36, 104, 40);
            g.fillStyle = '#f8fafc';
            for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) g.fillRect(x - 47 + c * 12.4, 40 + r * 12, 8, 8);
          }
          g.fillStyle = mix(m.building, '#000000', 0.55);
          g.fillRect(0, 168, PW, 182);
          g.fillStyle = mix(m.building, '#000000', 0.3);
          g.fillRect(0, 168, PW, 10);
          this.ptdCrowd(g, 0, 184, PW, 13, hc, ac);
        }
        // Placa de publicidade com o letreiro do mapa
        g.fillStyle = m.signBg;
        g.fillRect(0, 350, PW, 30);
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(0, 350, PW, 4);
        g.font = '900 15px "Segoe UI", sans-serif';
        g.textAlign = 'left';
        g.textBaseline = 'middle';
        const tw = g.measureText(text).width + 90;
        const n = Math.max(1, Math.round(PW / tw));
        const step = PW / n;
        for (let i = 0; i < n; i++) {
          g.fillStyle = m.boardBg;
          g.fillRect(i * step + 10, 356, 18, 18);
          g.fillStyle = '#f8fafc';
          g.fillText(text, i * step + 38, 366);
        }
      });
      const grassCv = this.ptdBg(`arenaG|${theme}`, PW, 340, (g) => {
        g.fillStyle = m.grass1;
        g.fillRect(0, 0, PW, 340);
        g.fillStyle = m.grass2;
        for (let x = -PW; x < PW * 2; x += 320) {
          poly(g, [[x, 340], [x + 160, 340], [x + 160 + 150, 0], [x + 150, 0]]);
          g.fill();
        }
        const gr = g.createLinearGradient(0, 0, 0, 340);
        gr.addColorStop(0, 'rgba(2,6,23,0.55)');
        gr.addColorStop(0.45, 'rgba(2,6,23,0.12)');
        gr.addColorStop(1, 'rgba(2,6,23,0.3)');
        g.fillStyle = gr;
        g.fillRect(0, 0, PW, 340);
        g.fillStyle = 'rgba(241,245,249,0.75)';
        g.fillRect(0, 14, PW, 3);
        // Tufos de grama em pixel
        for (let i = 0; i < 420; i++) {
          g.fillStyle = i % 3 ? 'rgba(2,6,23,0.18)' : 'rgba(255,255,255,0.06)';
          g.fillRect(Math.floor(rnd(i, 11) * PW), 30 + Math.floor(rnd(i, 12) * 300), 3, 6);
        }
      });
      return { backCv, grassCv, PW };
    },
    ptdWrap(ctx, cv, off, y, W) {
      const PW = cv.width;
      const a = Math.min(W, PW - off);
      ctx.drawImage(cv, off, 0, a, cv.height, 0, y, a, cv.height);
      if (a < W) ctx.drawImage(cv, 0, 0, W - a, cv.height, a, y, W - a, cv.height);
    },
    // Vista de lado do estádio (gramado começa em y = 380); pan em px
    ptdArena(ctx, S, pan, o = {}) {
      const { W } = S;
      const { backCv, grassCv, PW } = this.ptdArenaCvs(o.theme || this.ptdTheme(), o.hc || '#38bdf8', o.ac || '#ef4444', o.sign);
      this.ptdWrap(ctx, backCv, Math.floor(mod(pan * 0.4, PW)), 0, W);
      this.ptdWrap(ctx, grassCv, Math.floor(mod(pan, PW)), 380, W);
      // flashes de câmera na torcida (pontinhos, trocam devagar)
      if (!this.ptdIndoor(o.theme || this.ptdTheme())) {
        const f = Math.floor((this.sakugaFrame || 0) / 5);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) {
          const x = rnd(i + f * 5, 21) * W;
          const y = 190 + rnd(i + f * 5, 22) * 150;
          ctx.fillRect(x, y, 4, 4);
        }
      }
    },
    // Gol visto de frente (da marca do pênalti): fundo guardado
    ptdGoalGeo(S) {
      return { gx0: S.W * 0.14, gx1: S.W * 0.86, gy0: 252, gy1: 560 };
    },
    ptdGoalView(ctx, S, o = {}) {
      const { W, H } = S;
      const theme = o.theme || this.ptdTheme();
      const hc = o.hc || '#38bdf8';
      const ac = o.ac || '#ef4444';
      const m = this.ptdMap(theme);
      const indoor = this.ptdIndoor(theme);
      const geo = this.ptdGoalGeo(S);
      const cv = this.ptdBg(`goal|${theme}|${hc}|${ac}|${W}x${H}`, W, H, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 420);
        gr.addColorStop(0, m.skyTop);
        gr.addColorStop(1, m.skyBot);
        g.fillStyle = gr;
        g.fillRect(0, 0, W, 420);
        if (indoor) {
          g.fillStyle = '#020617';
          g.fillRect(0, 0, W, 150);
          for (let x = 40; x < W; x += 200) {
            g.fillStyle = 'rgba(103,232,249,0.9)';
            g.fillRect(x, 120, 120, 8);
          }
          g.fillStyle = mix(m.building, '#000000', 0.3);
          g.fillRect(0, 150, W, 240);
          g.fillStyle = '#22d3ee';
          g.fillRect(0, 190, W, 3);
          g.fillStyle = '#020617';
          g.fillRect(W / 2 - 220, 200, 440, 150);
          g.fillStyle = '#0b2447';
          g.fillRect(W / 2 - 212, 208, 424, 134);
          g.fillStyle = '#38bdf8';
          g.font = '900 34px "Segoe UI", sans-serif';
          g.textAlign = 'center';
          g.fillText('BLUE LOCK', W / 2, 262);
          g.font = '900 16px "Segoe UI", sans-serif';
          g.fillStyle = '#facc15';
          g.fillText('RANKING • PRÉDIO 5', W / 2, 300);
        } else {
          for (let x = 140; x < W; x += 500) {
            const rg = g.createRadialGradient(x, 40, 4, x, 40, 160);
            rg.addColorStop(0, 'rgba(255,255,255,0.5)');
            rg.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = rg;
            g.fillRect(x - 160, -100, 320, 300);
            g.fillStyle = '#f8fafc';
            for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) g.fillRect(x - 42 + c * 12, 28 + r * 12, 8, 8);
          }
          g.fillStyle = mix(m.building, '#000000', 0.55);
          g.fillRect(0, 120, W, 270);
          this.ptdCrowd(g, 0, 128, W, 21, hc, ac, 12);
        }
        g.fillStyle = m.signBg;
        g.fillRect(0, 384, W, 30);
        g.font = '900 15px "Segoe UI", sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#f8fafc';
        const sign = o.sign || m.signText;
        g.fillText(sign, W * 0.25, 400);
        g.fillText(sign, W * 0.75, 400);
        // Gramado em perspectiva
        for (let i = 0; i < 12; i++) {
          const y0 = 414 + (H - 414) * Math.pow(i / 12, 1.5);
          const y1 = 414 + (H - 414) * Math.pow((i + 1) / 12, 1.5);
          g.fillStyle = i % 2 ? m.grass2 : m.grass1;
          g.fillRect(0, y0, W, y1 - y0 + 1);
        }
        const gg = g.createLinearGradient(0, 414, 0, H);
        gg.addColorStop(0, 'rgba(2,6,23,0.45)');
        gg.addColorStop(1, 'rgba(2,6,23,0.05)');
        g.fillStyle = gg;
        g.fillRect(0, 414, W, H - 414);
        // Linhas: fundo do gol e pequena área
        g.strokeStyle = 'rgba(241,245,249,0.8)';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(0, geo.gy1 + 2);
        g.lineTo(W, geo.gy1 + 2);
        g.moveTo(W * 0.06, geo.gy1 + 2);
        g.lineTo(-W * 0.06, H);
        g.moveTo(W * 0.94, geo.gy1 + 2);
        g.lineTo(W * 1.06, H);
        g.moveTo(-W * 0.03, H - 40);
        g.lineTo(W * 1.03, H - 40);
        g.stroke();
        // Fundo da rede (escuro) e as redes laterais
        const bx0 = geo.gx0 + 46;
        const bx1 = geo.gx1 - 46;
        const by0 = geo.gy0 + 26;
        g.fillStyle = 'rgba(2,6,23,0.55)';
        poly(g, [[geo.gx0, geo.gy0], [geo.gx1, geo.gy0], [bx1, by0], [bx1, geo.gy1 - 30], [geo.gx1, geo.gy1], [geo.gx0, geo.gy1], [bx0, geo.gy1 - 30], [bx0, by0]]);
        g.fill();
        g.strokeStyle = 'rgba(226,232,240,0.28)';
        g.lineWidth = 1.5;
        g.beginPath();
        for (let i = 0; i <= 18; i++) {
          const x = lerp(bx0, bx1, i / 18);
          g.moveTo(x, by0);
          g.lineTo(x, geo.gy1 - 30);
        }
        for (let i = 0; i <= 8; i++) {
          const y = lerp(by0, geo.gy1 - 30, i / 8);
          g.moveTo(bx0, y);
          g.lineTo(bx1, y);
        }
        for (let i = 0; i <= 6; i++) {
          const k = i / 6;
          g.moveTo(lerp(geo.gx0, bx0, k), lerp(geo.gy0, by0, k));
          g.lineTo(lerp(geo.gx0, bx0, k), lerp(geo.gy1, geo.gy1 - 30, k));
          g.moveTo(lerp(geo.gx1, bx1, k), lerp(geo.gy0, by0, k));
          g.lineTo(lerp(geo.gx1, bx1, k), lerp(geo.gy1, geo.gy1 - 30, k));
        }
        g.stroke();
      });
      ctx.drawImage(cv, 0, 0);
      return geo;
    },
    // A rede da frente (estufa em volta de hit) e as traves por cima
    ptdGoalFront(ctx, geo, hx, hy, stretch) {
      const { gx0, gx1, gy0, gy1 } = geo;
      const cols = 24;
      const rows = 10;
      const pt = (c, r) => {
        const x = lerp(gx0, gx1, c / cols);
        const y = lerp(gy0, gy1, r / rows);
        const d = Math.hypot(x - hx, y - hy);
        const w = stretch * Math.pow(Math.max(0, 1 - d / 260), 2);
        return [hx + (x - hx) * (1 - 0.42 * w), hy + (y - hy) * (1 - 0.42 * w) + 12 * w];
      };
      ctx.save();
      ctx.strokeStyle = 'rgba(241,245,249,0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const [x, y] = pt(c, r);
          if (c) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
      }
      for (let c = 0; c <= cols; c++) {
        for (let r = 0; r <= rows; r++) {
          const [x, y] = pt(c, r);
          if (r) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
      ctx.fillStyle = '#020617';
      ctx.fillRect(gx0 - 11, gy0 - 11, gx1 - gx0 + 22, 18);
      ctx.fillRect(gx0 - 11, gy0 - 11, 18, gy1 - gy0 + 13);
      ctx.fillRect(gx1 - 7, gy0 - 11, 18, gy1 - gy0 + 13);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(gx0 - 8, gy0 - 8, gx1 - gx0 + 16, 12);
      ctx.fillRect(gx0 - 8, gy0 - 8, 12, gy1 - gy0 + 8);
      ctx.fillRect(gx1 - 4, gy0 - 8, 12, gy1 - gy0 + 8);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(gx0 - 8, gy0 + 2, gx1 - gx0 + 16, 2);
      ctx.restore();
    },
    // Câmera colada na bola: o mundo passa (passers = quem fica para trás)
    ptdBallCam(ctx, S, t, o = {}) {
      const { W, H } = S;
      const color = o.color || YOU;
      const dir = o.dir || 1;
      const cv = this.ptdBg(`ballcam|${W}x${H}`, W, H, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#020617');
        gr.addColorStop(0.55, '#0b1a3a');
        gr.addColorStop(0.72, '#0b2a22');
        gr.addColorStop(1, '#06170f');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
      });
      ctx.drawImage(cv, 0, 0);
      this.cineGlow(ctx, W / 2, H * 0.48, W * 0.45, rgba(color, 0.35));
      // grama passando muito rápido
      ctx.fillStyle = 'rgba(134,239,172,0.18)';
      for (let i = 0; i < 18; i++) {
        const y = H * 0.74 + rnd(i, 2) * H * 0.26;
        const len = 160 + rnd(i, 3) * 300;
        let x = W + 200 - mod(rnd(i, 4) * (W + 600) + t * 70, W + 600);
        if (dir < 0) x = W - x - len;
        ctx.fillRect(x, y, len, 3);
      }
      this.ptdSpeed(ctx, S, t, color, 0.55, dir, 60, 22, S.top, S.bot, 3);
      if (o.color2) this.ptdSpeed(ctx, S, t, o.color2, 0.35, dir, 52, 16, S.top, S.bot, 9);
      this.ptdSpeed(ctx, S, t, '#f8fafc', 0.18, dir, 70, 12, S.top, S.bot, 17);
      (o.passers || []).forEach((p) => {
        if (t < p.t0 || t > p.t1) return;
        const k = seg(t, p.t0, p.t1);
        this.ptdSpr(ctx, p.char, lerp(p.x0, p.x1, p.ease ? ease(k) : k), p.feet, p.size, { animState: p.anim, flipX: p.flipX, frame: p.anim === 'run' ? runF(t) : 45, dim: p.dim || 0 });
      });
      const sh = o.shake ?? 5;
      const bx = W / 2 + this.cineNoise(t * 3, 1) * sh;
      const by = H * 0.48 + this.cineNoise(t * 3, 2) * sh;
      const r = o.r || 62;
      const tail = [];
      for (let i = 0; i < 8; i++) tail.push({ x: bx - dir * (i * 70), y: by + Math.sin(i * 0.5 + t * 0.3) * 3 * i });
      this.ptdStreak(ctx, tail, o.color2 || color, r * 1.2, 0.75);
      this.ptdBall(ctx, bx, by, r, t * 0.6, color);
      return { bx, by };
    },

    // ======================================================================
    // QUEM ESTÁ NA PARTIDA (com fallback para o teste fora do jogo)
    // ======================================================================
    ptdLive(type) {
      const ME = window.MatchEngine;
      return !!(ME && ME.chapter && ME.chapter.firstGoalSakuga === type && ME.playerEntity);
    },
    ptdMatchYou(kit) {
      const ME = window.MatchEngine;
      if (this.ptdLive(this.sakugaType)) return Object.assign({}, ME.playerEntity.charData);
      return this.cineYou(kit);
    },
    ptdMatchKeeper(fallbackId, kit) {
      const ME = window.MatchEngine;
      if (this.ptdLive(this.sakugaType)) {
        const gk = (ME.entities || []).find((e) => e.team === 'away' && e.isGK);
        if (gk?.charData) return gk.charData;
      }
      return this.cineChar(fallbackId, kit);
    },
    ptdMatchScore(demo) {
      const ME = window.MatchEngine;
      if (this.ptdLive(this.sakugaType)) {
        const tot = ME.totalTime || ME.matchTime?.(ME.chapter.matchDuration || 100) || 0;
        const minute = tot ? `${Math.min(90, Math.max(1, Math.round(90 * (1 - ME.timeLeft / tot))))}'` : demo.minute;
        return { hs: ME.scoreHome, as: ME.scoreAway, minute };
      }
      return demo;
    },

    // ======================================================================
    // 1) GOL GARANTIDO DO ROTEIRO (scripted_shot)
    // ======================================================================
    ptdShotCfg() {
      if (this.shotCfg) return this.shotCfg;
      if (!this._ptdDemoShot) {
        this._ptdDemoShot = {
          shooter: this.cineYou(KIT_BL),
          shooterName: window.App?.state?.profile?.name || 'Você',
          defender: this.cineChar('reo', KIT_V),
          keeper: this.cineChar('fukaku', KIT_V),
          team: 'home',
          skillName: 'Chute Direto',
          weaponName: 'Ego Desperto',
          skillColor: '#00f5d4',
          homeBefore: 1,
          awayBefore: 1,
          homeAfter: 2,
          awayAfter: 1,
          minute: "67'",
          homeLabel: 'BLUE LOCK',
          awayLabel: 'RIVAL',
          sign: 'JAPAN NATIONAL STADIUM • BLUE LOCK vs U-20'
        };
      }
      return this._ptdDemoShot;
    },
    ptdShotCtx() {
      const c = this.ptdShotCfg();
      const away = c.team === 'away';
      const dir = away ? -1 : 1;
      return {
        c,
        away,
        dir,
        X: (x) => (away ? this.sakugaW - x : x),
        color: c.skillColor || YOU,
        teamColor: away ? '#ef4444' : YOU,
        who: String(c.shooterName || 'VOCÊ').toUpperCase(),
        theme: this.ptdTheme(),
        hc: away ? '#ef4444' : '#38bdf8',
        ac: away ? '#38bdf8' : '#ef4444'
      };
    },
    ptdShotScore(o, hs, as, pop, popK) {
      const { c } = o;
      return { hl: c.homeLabel || 'BLUE LOCK', al: c.awayLabel || 'RIVAL', hs, as, minute: c.minute || '', hc: '#38bdf8', ac: '#ef4444', pop, popK };
    },
    // Plano 1: a arrancada (vista de lado, a câmera acompanha)
    ptdShot0(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.ptdShotCtx();
      const { c, dir, X, color } = o;
      const feet = H * 0.86;
      this.ptdArena(ctx, S, t * 9 * dir, { theme: o.theme, sign: c.sign, hc: '#38bdf8', ac: '#ef4444' });
      this.ptdSpeed(ctx, S, t, '#e0f2fe', 0.14, dir, 30, 14, top, H * 0.55);
      // O marcador vem de frente e se joga no carrinho; o atacante passa por cima
      const slideAt = 58;
      const sx = X(lerp(W * 0.16, W * 0.5, ease(t / 96)));
      const dx = t < slideAt ? X(lerp(W * 1.08, W * 0.7, ease(t / slideAt))) : X(lerp(W * 0.7, W * 0.3, ease((t - slideAt) / 30)));
      const hop = t > slideAt && t < slideAt + 22 ? Math.sin(((t - slideAt) / 22) * Math.PI) * 46 : 0;
      this.ptdSpr(ctx, c.defender, dx, feet + 6, 280, { animState: t < slideAt ? 'run' : 'slide', frame: runF(t), flipX: !o.away });
      if (t > slideAt && t < slideAt + 26) {
        ctx.fillStyle = 'rgba(226,232,240,0.6)';
        for (let i = 0; i < 9; i++) ctx.fillRect(dx + (rnd(i, 4) - 0.5) * 120, feet - rnd(i, 5) * 30 - (t - slideAt) * 0.6, 6, 6);
      }
      const aura = t > 40;
      this.ptdSpr(ctx, c.shooter, sx, feet - hop, 310, { animState: 'run', frame: runF(t), flipX: o.away, showAura: aura, auraColor: color });
      // bola colada no pé
      const bxl = sx + dir * 74;
      this.ptdBall(ctx, bxl, feet - 18 - hop * 0.8, 20, t * 0.5, aura ? color : null);
      this.ptdSfx(S, slideAt, 'slide', () => window.SFX?.tackle());
      this.ptdScore(ctx, 32, top + 16, Object.assign(this.ptdShotScore(o, c.homeBefore, c.awayBefore), { k: seg(t, 4, 16) }));
      this.ptdWord(ctx, `${o.who} ARRANCA!`, X(W * 0.66), top + 132, 62, color, seg(t, 16, 26), 1, -0.05 * dir, W * 0.56);
    },
    // Plano 2: close com o nome da habilidade
    ptdShot1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.ptdShotCtx();
      const { c, X, color, dir } = o;
      const cx = X(W * 0.3);
      this.ptdCloseBg(ctx, S, color, cx);
      this.ptdRays(ctx, cx, H * 0.44, W * 0.9, rgba(color, 1), 0.22, t * 0.004 * dir, 40);
      ctx.save();
      const push = ease(t / 110);
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1 + push * 0.05, shake: t > 24 && t < 40 ? 3 : 0.8 });
      const size = 800;
      const { u } = this.ptdHead(ctx, c.shooter, cx, H * 0.44, size, { flipX: o.away, rim: color });
      const lit = seg(t, 20, 30);
      this.ptdEyes(ctx, c.shooter, cx, H * 0.44, u, { ring: lit > 0 ? color : undefined, iris: lit > 0 ? mix(color, '#000000', 0.6) : undefined, look: o.away ? -1 : 1 });
      ctx.restore();
      this.ptdEyeFlare(ctx, cx + (o.away ? -1 : 1) * 3.5 * u * (1 + push * 0.05), H * 0.44, lit * (1 - seg(t, 60, 90) * 0.6), color, W);
      // Nome do golpe
      const tx = X(W * 0.72);
      this.ptdChip(ctx, `ARMA • ${String(c.weaponName || '').toUpperCase()}`, tx, H * 0.3, color, seg(t, 8, 20), { size: 15 });
      this.ptdWord(ctx, String(c.skillName || '').toUpperCase(), tx, H * 0.45, 76, color, seg(t, 24, 34), 1, -0.06 * dir, W * 0.48);
      ctx.save();
      ctx.globalAlpha = seg(t, 40, 54);
      ctx.font = 'italic 800 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('A HABILIDADE ASSINATURA', tx, H * 0.45 + 62);
      ctx.restore();
      this.ptdChip(ctx, o.who, X(W * 0.12), bot - 40, o.teamColor, seg(t, 4, 14), { size: 18 });
      this.ptdSfx(S, 24, 'skill', () => window.SFX?.whoosh());
    },
    // Plano 3: impacto (quadro de impacto) → câmera na bola
    ptdShot2(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.ptdShotCtx();
      const { c, X, color, dir } = o;
      const hit = 14;
      if (t < 54) {
        if (t < hit) {
          // a perna armando
          this.ptdCloseBg(ctx, S, color, X(W * 0.4));
          this.ptdSpeed(ctx, S, t, color, 0.3, dir, 30);
          this.ptdSpr(ctx, c.shooter, X(W * 0.4), H * 1.02, 560, { animState: 'windup', flipX: o.away, rim: color });
          this.ptdBall(ctx, X(W * 0.58), H * 0.84, 40, 0, color);
        } else {
          const bx = X(W * 0.6);
          const by = H * 0.66;
          this.ptdImpactBg(ctx, S, bx, by, INK, PAPER, t * 0.002);
          ctx.save();
          this.cineCamera(ctx, W, H, { zoom: 1.04 - seg(t, hit, 54) * 0.04, shake: 8 * (1 - seg(t, hit, hit + 20)) });
          this.ptdSpr(ctx, c.shooter, X(W * 0.38), H * 1.02, 580, { animState: 'shoot', flipX: o.away, rim: INK, rimD: 4 });
          this.ptdRings(ctx, bx, by, seg(t, hit, hit + 34), [INK, color, INK], 340);
          const sq = t < hit + 5 ? 0.7 : 1;
          this.ptdBall(ctx, bx, by, 42, (t - hit) * 0.7, null, 2 - sq, sq);
          ctx.restore();
          this.ptdWord(ctx, 'DOM!!', X(W * 0.8), top + 120, 124, color, seg(t, hit, hit + 7), 1, -0.15 * dir);
          this.cineFlash(ctx, W, H, 0.9 * (1 - seg(t, hit, hit + 8)));
        }
        this.ptdSfx(S, hit, 'kick', () => window.SFX?.kick(1));
      } else {
        const u = t - 54;
        this.ptdBallCam(ctx, S, u, {
          color,
          dir,
          r: 64,
          passers: [
            { char: c.defender, anim: 'slide', size: 340, feet: H * 0.98, x0: X(W * 1.15), x1: X(-W * 0.2), t0: 0, t1: 26, flipX: !o.away },
            { char: c.keeper, anim: 'dive', size: 330, feet: H * 0.62, x0: X(W * 1.25), x1: X(-W * 0.15), t0: 14, t1: 44, flipX: !o.away }
          ]
        });
        this.ptdSfx(S, 56, 'fly', () => window.SFX?.whoosh());
      }
    },
    // Plano 4: a rede estufa e o placar vira
    ptdShot3(ctx, S) {
      const { W, t, top } = S;
      const o = this.ptdShotCtx();
      const { c, X, color } = o;
      this.ptdGoalHit(ctx, S, {
        theme: o.theme,
        sign: c.sign,
        hc: o.hc,
        ac: o.ac,
        keeper: c.keeper,
        scorer: c.shooter,
        color,
        teamColor: o.teamColor,
        word: o.away ? 'GOL DO RIVAL!' : 'GOOOOOL!!',
        hx: X(W * 0.7),
        sfx: o.away ? () => window.SFX?.concede() : () => window.SFX?.goal(true),
        flip: o.away
      });
      const flipAt = 50;
      const flipped = t >= flipAt;
      this.ptdScore(ctx, 32, top + 16, this.ptdShotScore(o, flipped ? c.homeAfter : c.homeBefore, flipped ? c.awayAfter : c.awayBefore, o.away ? 'away' : 'home', seg(t, flipAt, flipAt + 16)));
      this.ptdSfx(S, flipAt, 'score', () => window.SFX?.blip(880));
    },
    // Gol de frente: a bola entra, o goleiro não alcança, a rede estufa, quem fez comemora
    ptdGoalHit(ctx, S, o) {
      const { W, H, t, top, bot } = S;
      const hit = o.hit ?? 20;
      const isHit = t >= hit;
      const hx = o.hx ?? W * 0.7;
      const hy = o.hy ?? 304;
      const shake = isHit ? 12 * (1 - seg(t, hit, hit + 34)) : 0;
      ctx.save();
      this.cineCamera(ctx, W, H, { zoom: 1 + (isHit ? 0.03 * (1 - seg(t, hit, hit + 40)) : 0), shake });
      const geo = this.ptdGoalView(ctx, S, o);
      // Goleiro: pula atrasado e baixo para o lado da bola (ela entra no ângulo, por cima dele)
      const kk = seg(t, 8, hit + 14);
      const gkx = lerp(W * 0.5, lerp(W * 0.5, hx, 0.5), ease(kk));
      const gky = geo.gy1 + 10 - Math.sin(clamp(kk) * Math.PI) * 36 + (isHit ? seg(t, hit + 14, hit + 34) * 20 : 0);
      this.ptdSpr(ctx, o.keeper, gkx, gky, 300, { animState: kk > 0.15 ? 'dive' : 'idle', flipX: hx < W / 2 });
      const stretch = isHit ? Math.min(1, (t - hit) / 6) * Math.max(0.3, 1 - (t - hit) / 120) : 0;
      this.ptdGoalFront(ctx, geo, hx, hy, stretch);
      // A bola: vem de baixo (perto da câmera), encolhe e para na rede
      if (!isHit || t < hit + 70) {
        const k = seg(t, 0, hit);
        const bx = isHit ? hx : lerp(W * 0.48, hx, easeIn(k));
        const by = isHit ? hy + stretch * 6 : lerp(H * 1.05, hy, ease(k));
        const r = isHit ? 24 : lerp(70, 26, k);
        if (!isHit) {
          const tail = [];
          for (let i = 0; i < 6; i++) {
            const q = Math.max(0, k - i * 0.08);
            tail.push({ x: lerp(W * 0.48, hx, easeIn(q)), y: lerp(H * 1.05, hy, ease(q)) });
          }
          this.ptdStreak(ctx, tail, o.color, r * 1.3, 0.8);
        }
        this.ptdBall(ctx, bx, by, r, t * 0.8, isHit ? null : o.color);
      }
      ctx.restore();
      this.ptdSfx(S, hit, 'net', o.sfx || (() => window.SFX?.goal(true)));
      // Quem fez sobe na frente comemorando, do lado oposto ao da bola
      if (t > hit + 30 && o.scorer) {
        const rise = ease(seg(t, hit + 30, hit + 60));
        const left = hx > W / 2;
        this.ptdSpr(ctx, o.scorer, left ? W * 0.2 : W * 0.8, lerp(bot + 420, bot + 130, rise), 470, { animState: 'call_pass', flipX: !left, rim: o.teamColor || YOU, showAura: true, auraColor: o.color, frame: auraF(t) });
      }
      if (isHit) {
        this.cineFlash(ctx, W, H, 0.8 * (1 - seg(t, hit, hit + 7)));
        this.ptdWord(ctx, o.word || 'GOOOOOL!!', W * 0.56, top + 118, 104, o.teamColor || YOU, seg(t, hit, hit + 10), 1, -0.04, W * 0.74);
      }
      return geo;
    },

    // ======================================================================
    // 2) REAÇÃO QUÍMICA (chem_reaction)
    // ======================================================================
    ptdChemCfg() {
      if (this.chemCfg) return this.chemCfg;
      if (!this._ptdDemoChem) {
        this._ptdDemoChem = {
          partner: this.cineChar('bachira', KIT_BL),
          defender: this.cineChar('reo', KIT_V),
          partnerName: 'Meguru Bachira',
          you: this.cineYou(KIT_BL),
          youName: window.App?.state?.profile?.name || 'Você',
          sign: 'BLUE LOCK FACILITY • STRATUM 5 BUNKER'
        };
      }
      return this._ptdDemoChem;
    },
    ptdChemCtx() {
      const c = this.ptdChemCfg();
      const partner = c.partner || this.cineChar('bachira', KIT_BL);
      return {
        c,
        partner,
        you: c.you || this.cineYou(KIT_BL),
        def: c.defender || this.cineChar('reo', KIT_V),
        pc: partner.auraColor || '#ec4899',
        yc: YOU,
        chemName: partner.chemName || 'Reação Química',
        pFirst: lastName(c.partnerName || partner.name),
        yFirst: lastName(c.youName || 'VOCÊ'),
        st: this.getChemStyle ? this.getChemStyle(partner) : { kind: 'through', shout: 'DOM!!', finish: 'shoot' },
        theme: this.ptdTheme()
      };
    },
    ptdChemKeeper() {
      const ME = window.MatchEngine;
      if (this.chemCfg && ME?.entities) {
        const gk = ME.entities.find((e) => e.team === 'away' && e.isGK);
        if (gk?.charData) return gk.charData;
      }
      return this.cineChar('fukaku', KIT_V);
    },
    // Plano 1: tela dividida, os dois enxergam a mesma jogada
    ptdChem0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.ptdChemCtx();
      const k = ease(t / 40);
      const eyeY = H * 0.43;
      const lit = seg(t, 38, 46);
      const half = (pts, color, cx, char, x, flip) => {
        ctx.save();
        poly(ctx, pts);
        ctx.clip();
        this.ptdCloseBg(ctx, S, color, cx);
        this.ptdRays(ctx, cx, eyeY, W * 0.8, rgba(color, 1), 0.2, t * 0.003 * (flip ? -1 : 1), 36);
        const { u } = this.ptdHead(ctx, char, x, eyeY, 780, { flipX: flip, rim: color });
        this.ptdEyes(ctx, char, x, eyeY, u, { ring: lit > 0 ? color : undefined, look: flip ? -1 : 1 });
        ctx.restore();
        return u;
      };
      const px = lerp(-W * 0.25, W * 0.25, k);
      const yx = lerp(W * 1.25, W * 0.75, k);
      const u1 = half([[0, 0], [W * 0.56, 0], [W * 0.44, H], [0, H]], o.pc, W * 0.25, o.partner, px, false);
      const u2 = half([[W * 0.56, 0], [W, 0], [W, H], [W * 0.44, H]], o.yc, W * 0.75, o.you, yx, true);
      // os olhos acendem JUNTOS
      this.ptdEyeFlare(ctx, px + 3.5 * u1, eyeY, lit * (1 - seg(t, 80, 110) * 0.6), o.pc, W * 0.5);
      this.ptdEyeFlare(ctx, yx - 3.5 * u2, eyeY, lit * (1 - seg(t, 80, 110) * 0.6), o.yc, W * 0.5);
      // o corte na diagonal com faíscas correndo
      ctx.save();
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(W * 0.56, 0);
      ctx.lineTo(W * 0.44, H);
      ctx.stroke();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 6;
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const q = mod(t * 0.02 + i / 8, 1);
        ctx.fillStyle = i % 2 ? o.pc : o.yc;
        ctx.fillRect(lerp(W * 0.56, W * 0.44, q) - 5 + (i % 2 ? 9 : -9), lerp(0, H, q) - 5, 10, 10);
      }
      ctx.restore();
      this.ptdWord(ctx, 'REAÇÃO', W * 0.33, bot - 104, 78, o.pc, seg(t, 44, 54), 1, -0.06);
      this.ptdWord(ctx, 'QUÍMICA', W * 0.66, bot - 62, 78, o.yc, seg(t, 50, 60), 1, -0.06);
      this.ptdChip(ctx, `${o.pFirst} × ${o.yFirst}`, W / 2, top + 36, '#f8fafc', seg(t, 58, 70), { size: 18 });
      this.ptdSfx(S, 40, 'sync', () => window.SFX?.jingle([659, 988], 0, 'triangle'));
    },
    // Plano 2: a jogada do parceiro, do jeito dele
    ptdChem1(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.ptdChemCtx();
      const { st, pc, partner, def } = o;
      const feet = H * 0.85;
      const aim = { x: W * 0.68, y: st.finish === 'shoot' ? feet - 30 : st.finish === 'volley' ? H * 0.56 : H * 0.42 };
      this.ptdArena(ctx, S, t * (st.kind === 'sprint' ? 8 : 2), { theme: o.theme, sign: o.c.sign });
      if (st.kind === 'sprint') this.ptdSpeed(ctx, S, t, pc, 0.4, 1, 40, 22);
      let kick = 46;
      let px = W * 0.22;
      let py = feet;
      let pAnim = 'idle';
      let from = { x: W * 0.28, y: feet - 14 };
      const shout = (txt, x, y, at, len = 40, size = 40) => this.ptdWord(ctx, txt, x, y, size, '#f8fafc', seg(t, at, at + 8), 1 - seg(t, at + len - 10, at + len), -0.06);
      if (st.kind === 'dribble') {
        kick = 80;
        px = lerp(W * 0.02, W * 0.34, ease(t / 76));
        pAnim = t < kick ? (Math.floor(t / 12) % 2 ? 'rabona' : 'run') : 'shoot';
        // Dois marcadores DIFERENTES (dois iguais lado a lado pareciam o bug de "várias imagens"):
        // o 2º é um companheiro dele com o mesmo uniforme
        const def2 = Object.assign({}, def, { name: 'Marcador', hairStyle: 'short_sharp', hairColor: '#3f2a1d', hairSecondary: '#3f2a1d', skinColor: '#e5b899', eyeStyle: undefined, mouth: undefined });
        [W * 0.14, W * 0.25].forEach((dx, i) => {
          const beaten = px > dx + 20;
          this.ptdSpr(ctx, i ? def : def2, dx + (beaten ? -24 : 0), feet, 220, { animState: beaten ? 'dive' : 'idle', flipX: true });
          if (beaten) shout('ELÁSTICO!', dx, H * 0.4, 26 + i * 26, 30, 34);
        });
        from = { x: px + 40, y: feet - 14 };
      } else if (st.kind === 'trap') {
        kick = 70;
        const fall = Math.min(1, t / 34);
        if (t < 34) this.ptdBall(ctx, W * 0.26, lerp(top - 30, feet - 16, fall * fall), 18, t * 0.5);
        else if (t < kick) {
          this.ptdBall(ctx, W * 0.26, feet - 16, 18, 0);
          this.ptdRings(ctx, W * 0.26, feet - 16, seg(t, 34, 60), [pc, '#f8fafc'], 90, 0);
          shout('TOC.', W * 0.26, H * 0.42, 34, 36, 54);
        }
        pAnim = t < kick ? 'idle' : 'shoot';
        from = { x: W * 0.28, y: feet - 20 };
      } else if (st.kind === 'sprint') {
        kick = 58;
        px = lerp(-W * 0.1, W * 0.34, ease(t / 55));
        pAnim = t < kick ? 'run' : 'shoot';
        // poeira levantada atrás (nada de cópias do boneco)
        ctx.fillStyle = 'rgba(226,232,240,0.55)';
        for (let i = 0; i < 12; i++) {
          const a = mod(t * 2 + i * 9, 40);
          ctx.fillRect(px - 60 - a * 4 - rnd(i, 2) * 40, feet - 6 - a * 0.8 - rnd(i, 3) * 20, 6, 6);
        }
        from = { x: px + 40, y: feet - 14 };
      } else if (st.kind === 'power') {
        kick = 60;
        px = lerp(W * 0.04, W * 0.26, ease(t / 40));
        pAnim = t < 40 ? 'run' : t < kick ? 'idle' : 'shoot';
        const hitT = t > 38;
        const dx = hitT ? lerp(W * 0.32, W * 0.48, ease((t - 38) / 20)) : W * 0.32;
        this.ptdSpr(ctx, def, dx, feet - (hitT ? Math.sin(Math.min(1, (t - 38) / 20) * Math.PI) * 44 : 0), 230, { animState: hitT ? 'dive' : 'idle', flipX: true });
        if (hitT) shout('BAM!!', W * 0.38, H * 0.36, 38, 32, 58);
        this.ptdSfx(S, 38, 'bam', () => window.SFX?.tackle());
        from = { x: px + 40, y: feet - 14 };
      } else if (st.kind === 'curve') {
        [W * 0.42, W * 0.5].forEach((dx) => this.ptdSpr(ctx, def, dx, feet - 20, 200, { animState: 'idle', flipX: true }));
      } else if (st.kind === 'acrobat') {
        kick = 52;
        // o pulo chega no alto bem na hora do toque
        const jump = Math.sin(Math.min(1, t / 104) * Math.PI);
        py = feet - jump * 150;
        pAnim = t < 18 ? 'run' : t < 92 ? 'bicycle' : 'idle';
        from = { x: W * 0.28, y: py - 40 };
        if (t < kick) this.ptdBall(ctx, W * 0.27, py - 50, 18, t * 0.5);
      } else {
        // Passe enfiado: a barreira de marcadores e a fresta acendendo
        [[W * 0.52, H * 0.66], [W * 0.46, H * 0.76], [W * 0.4, H * 0.92]].forEach(([x, y], i) => this.ptdSpr(ctx, def, x, y, 170 + i * 20, { animState: 'idle', flipX: true }));
        if (t < kick + 6) {
          ctx.save();
          ctx.setLineDash([14, 10]);
          ctx.lineDashOffset = -t * 2;
          ctx.strokeStyle = pc;
          ctx.globalAlpha = 0.8;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(aim.x, aim.y);
          ctx.stroke();
          ctx.restore();
          this.ptdChip(ctx, '(...a fresta.)', W * 0.47, H * 0.36, pc, seg(t, 6, 16), { size: 16 });
        }
      }
      this.ptdSpr(ctx, partner, px, py, 260, { animState: pAnim, frame: pAnim === 'run' ? runF(t) : auraF(t), showAura: true, auraColor: pc });
      // Você entra para finalizar
      const yk = ease(t / 110);
      const youX = lerp(W * 1.05, W * 0.72, yk);
      const air = st.finish === 'bicycle' ? 90 : st.finish === 'volley' ? 45 : 0;
      const youY = feet - (t > 100 ? Math.sin(Math.min(1, (t - 100) / 40) * Math.PI) * air : 0);
      const finishAnim = st.finish === 'bicycle' ? 'bicycle' : 'shoot';
      this.ptdSpr(ctx, o.you, youX, youY, 270, { animState: t > 100 ? finishAnim : 'run', frame: t > 100 ? auraF(t) : runF(t), flipX: true, showAura: true, auraColor: o.yc });
      // A bola
      const path = (u) => {
        const x = lerp(from.x, aim.x, u);
        let y = lerp(from.y, aim.y, u);
        if (st.kind === 'curve') y -= Math.sin(u * Math.PI) * 170 * (1 - u * 0.3);
        else if (st.kind !== 'power' && st.kind !== 'through') y -= Math.sin(u * Math.PI) * 110;
        return { x, y };
      };
      if (t >= kick) {
        const u = Math.min(1, (t - kick) / 56);
        const tail = [];
        for (let i = 0; i < 7; i++) tail.push(path(Math.max(0, u - i * 0.035)));
        this.ptdStreak(ctx, tail, pc, st.kind === 'power' ? 26 : 20, 0.85);
        const b = path(u);
        this.ptdBall(ctx, b.x, b.y, st.kind === 'power' ? 24 : 21, t * 0.6, pc);
      } else if (st.kind === 'curve' || st.kind === 'through' || st.kind === 'power') {
        this.ptdBall(ctx, from.x, from.y, 18, t * 0.3);
      }
      this.ptdSfx(S, kick, 'pass', () => window.SFX?.pass());
      this.ptdWord(ctx, `${o.chemName.toUpperCase()}!`, W * 0.5, top + 64, 52, pc, seg(t, 4, 14), 1, -0.03, W * 0.86);
    },
    // Plano 3: impacto — duas armas, um só chute
    ptdChem2(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.ptdChemCtx();
      const { st } = o;
      const hit = 12;
      const bx = W * 0.66;
      const by = H * 0.44;
      this.ptdImpactBg(ctx, S, bx, by, INK, PAPER, t * 0.002);
      // metade do papel na cor de cada um
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = o.pc;
      poly(ctx, [[0, 0], [W * 0.5, 0], [W * 0.38, H], [0, H]]);
      ctx.fill();
      ctx.fillStyle = o.yc;
      poly(ctx, [[W * 0.5, 0], [W, 0], [W, H], [W * 0.38, H]]);
      ctx.fill();
      ctx.restore();
      ctx.save();
      this.cineCamera(ctx, W, H, { zoom: 1.03, shake: t >= hit ? 8 * (1 - seg(t, hit, hit + 22)) : 1 });
      this.ptdSpr(ctx, o.partner, W * 0.2, H * 1.04, 400, { animState: 'shoot', rim: o.pc, dim: 0.35, dimTint: '10,20,48' });
      const anim = t < hit ? 'windup' : st.finish === 'bicycle' ? 'bicycle' : 'shoot';
      // chuta pra direita, na bola (bx fica à direita); com o boneco de lado o flipX aparecia
      this.ptdSpr(ctx, o.you, W * 0.47, H * 0.98, 540, { animState: anim, flipX: false, rim: o.yc, rimD: 3 });
      if (t >= hit) {
        this.ptdRings(ctx, bx, by, seg(t, hit, hit + 36), [o.pc, o.yc, INK], 360);
        const sq = t < hit + 5 ? 0.7 : 1;
        this.cineGlow(ctx, bx - 14, by, 120, rgba(o.pc, 0.8));
        this.cineGlow(ctx, bx + 14, by, 120, rgba(o.yc, 0.8));
        this.ptdBall(ctx, bx, by, 42, (t - hit) * 0.7, null, 2 - sq, sq);
      } else {
        this.ptdBall(ctx, lerp(W * 0.3, bx, ease(t / hit)), lerp(H * 0.3, by, ease(t / hit)), 34, t);
      }
      ctx.restore();
      if (t >= hit) {
        this.ptdWord(ctx, st.shout, W * 0.78, top + 116, st.shout.length > 10 ? 78 : 112, o.pc, seg(t, hit, hit + 8), 1, -0.15, W * 0.5);
        this.cineFlash(ctx, W, H, 0.9 * (1 - seg(t, hit, hit + 8)));
      }
      this.ptdSfx(S, hit, 'kick', () => window.SFX?.kick(1));
    },
    // Plano 4: rumo ao gol — termina com a bola no ar (o resultado é na partida)
    ptdChem3(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.ptdChemCtx();
      const z = easeIO(t / 100);
      const keeper = this.ptdChemKeeper();
      ctx.save();
      // A câmera vai entrando no gol
      const zoom = lerp(0.6, 1.25, z);
      this.cineCamera(ctx, W, H, { x: W / 2, y: 420, zoom, shake: 3 });
      ctx.fillStyle = '#020617';
      ctx.fillRect(-W, -H, W * 3, H * 3);
      const geo = this.ptdGoalView(ctx, S, { theme: o.theme, sign: o.c.sign });
      // O goleiro se prepara no meio e só no fim se joga para o canto
      const reach = seg(t, 66, 100);
      this.ptdSpr(ctx, keeper, lerp(W * 0.46, W * 0.58, ease(reach)), geo.gy1 + 6 - Math.sin(reach * Math.PI * 0.8) * 50, 290, { animState: reach > 0.1 ? 'dive' : 'idle' });
      this.ptdGoalFront(ctx, geo, W / 2, 400, 0);
      ctx.restore();
      // a bola vai para o ângulo (direita, em cima), longe do goleiro
      const bx = lerp(W * 0.5, W * 0.7, z) + this.cineNoise(t * 3, 1) * 4;
      const by = lerp(H * 0.8, H * 0.4, z) + this.cineNoise(t * 3, 2) * 4;
      const r = lerp(80, 38, z);
      const tail = [];
      for (let i = 0; i < 7; i++) {
        const q = Math.max(0, z - i * 0.06);
        tail.push({ x: lerp(W * 0.5, W * 0.7, q) - i * 8, y: lerp(H * 0.8, H * 0.4, q) + i * 34 });
      }
      this.ptdStreak(ctx, tail, o.pc, r * 1.4, 0.8);
      this.ptdBall(ctx, bx, by, r, t * 0.8, o.yc);
      this.ptdWord(ctx, `${o.pFirst} → ${o.yFirst}!!`, W / 2, top + 62, 56, '#f8fafc', seg(t, 6, 16), 1, -0.03, W * 0.8);
    },

    // ======================================================================
    // 3) DESPERTAR DO FLUXO (flow_awaken)
    // ======================================================================
    ptdFlowCfg() {
      if (this.flowCfg?.flow) return this.flowCfg;
      if (!this._ptdDemoFlow) {
        const db = window.FLOWS_DB || [];
        const tiers = Object.keys(window.RARITY_TIERS || {});
        const best = db.slice().sort((a, b) => tiers.indexOf(b.rarity) - tiers.indexOf(a.rarity))[0];
        this._ptdDemoFlow = {
          flow: best || { name: 'Fluxo Egoísta', color: '#a855f7', rarity: 'EPICO', duration: 12, effect: 'Fluxo', effectDesc: 'o mundo fica lento', desc: 'O mundo fica lento.' },
          you: this.cineYou(KIT_BL),
          youName: window.App?.state?.profile?.name || 'Você'
        };
      }
      return this._ptdDemoFlow;
    },
    ptdFlowCtx() {
      const c = this.ptdFlowCfg();
      const fl = c.flow;
      const color = fl.color || YOU;
      return {
        c,
        fl,
        color,
        color2: fl.colors?.[1] || color,
        you: Object.assign({}, c.you || this.cineYou(KIT_BL), { auraColor: color }),
        rarity: window.RARITY_TIERS?.[fl.rarity],
        desc: window.describeFlow?.(fl) || fl.desc || ''
      };
    },
    // Plano 1: o mundo para (o barulho some, dois batimentos, o olho acende)
    ptdFlow0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.ptdFlowCtx();
      const quiet = seg(t, 0, 50);
      const cv = this.ptdBg(`flowdark|${W}x${H}`, W, H, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#02040b');
        gr.addColorStop(1, '#0a1630');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
      });
      ctx.drawImage(cv, 0, 0);
      // a torcida (luzes desfocadas) apagando
      ctx.save();
      ctx.globalAlpha = 1 - quiet * 0.9;
      this.cineBokeh(ctx, W, top + 20, H * 0.6, t, 16, ['rgba(254,240,138,0.45)', 'rgba(147,197,253,0.45)'], 5);
      ctx.restore();
      const beat = (at) => (t < at || t > at + 16 ? 0 : Math.pow(1 - (t - at) / 16, 2));
      const b = beat(14) + beat(44);
      // os olhos no centro da tela (a câmera aproxima em volta deles)
      const eyeY = H / 2;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: eyeY, zoom: 1 + ease(t / 95) * 0.08 + b * 0.025, shake: 0.6 });
      const size = 900;
      const { u } = this.ptdHead(ctx, o.you, W / 2, eyeY, size, { dim: 0.3, dimTint: '6,12,32' });
      const lit = seg(t, 58, 70);
      this.ptdEyes(ctx, o.you, W / 2, eyeY, u, lit > 0 ? { ring: o.color, iris: mix(o.color, '#000000', 0.55) } : {});
      ctx.restore();
      // Batimentos
      [14, 44].forEach((at, i) => {
        const a = t - at;
        if (a < 0 || a > 36) return;
        ctx.save();
        ctx.globalAlpha = 1 - a / 36;
        ctx.strokeStyle = o.color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(W / 2, eyeY, 90 + a * 16, 0, TAU);
        ctx.stroke();
        ctx.restore();
        this.ptdWord(ctx, 'TUM...', i ? W * 0.8 : W * 0.2, i ? H * 0.3 : H * 0.6, 64, o.color, seg(t, at, at + 6), 1 - seg(t, at + 20, at + 34), i ? 0.06 : -0.06);
      });
      // O som do estádio vira uma linha reta (com os dois batimentos)
      const ly = bot - 70;
      ctx.save();
      ctx.strokeStyle = rgba(o.color, 0.9);
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 8) {
        const noise = (1 - quiet) * 26 * Math.sin(x * 0.09 + t * 0.9) * Math.sin(x * 0.023 + t * 0.3);
        let spike = 0;
        [14, 44].forEach((at) => {
          const cx = ((t - at) * 30) % (W + 400);
          if (t >= at) {
            const d = x - (W * 0.15 + cx);
            if (Math.abs(d) < 24) spike += (d < 0 ? -1 : 1) * (24 - Math.abs(d)) * 2.2 * (Math.abs(d) < 10 ? -1 : 0.5);
          }
        });
        if (x) ctx.lineTo(x, ly + noise + spike);
        else ctx.moveTo(x, ly + noise + spike);
      }
      ctx.stroke();
      ctx.restore();
      // O olho acende na cor do Fluxo
      this.ptdEyeFlare(ctx, W / 2 + 3.5 * u * (1 + ease(t / 95) * 0.08 + b * 0.025), eyeY, lit, o.color, W);
      this.ptdSfx(S, 14, 'b1', () => window.SFX?.blip(110));
      this.ptdSfx(S, 44, 'b2', () => window.SFX?.blip(110));
      this.ptdSfx(S, 58, 'eye', () => window.SFX?.whoosh());
    },
    // Plano 2: o despertar — corpo inteiro, aura e o nome do Fluxo
    ptdFlow1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.ptdFlowCtx();
      const { fl } = o;
      const cx = W * 0.3;
      this.ptdCloseBg(ctx, S, o.color, cx, H * 0.55);
      this.ptdRays(ctx, cx, H * 0.55, W, rgba(o.color, 1), 0.2, t * 0.003, 36);
      // faíscas subindo
      for (let i = 0; i < 30; i++) {
        const x = (rnd(i, 3) * W * 0.6 + Math.sin(t * 0.05 + i) * 12) % W;
        const y = bot - mod(t * (2.5 + (i % 4)) + rnd(i, 5) * H, H - top);
        ctx.fillStyle = i % 3 ? (i % 2 ? o.color : o.color2) : '#ffffff';
        ctx.fillRect(Math.round(x), Math.round(y), i % 5 ? 4 : 6, i % 5 ? 4 : 6);
      }
      const size = lerp(520, 600, ease(t / 70));
      this.ptdSpr(ctx, o.you, cx, H * 1.0 + size * 0.12 - ease(t / 50) * 40, size, { showAura: true, auraColor: o.color, frame: auraF(t), rim: o.color });
      // Texto
      const tx = W * 0.68;
      if (o.rarity) this.ptdChip(ctx, `✦ FLUXO ${String(o.rarity.name).split(' ')[0].toUpperCase()} ✦`, tx, H * 0.27, o.rarity.color || o.color, seg(t, 6, 16), { size: 15 });
      // Nome longo (ou dois Fluxos juntos) quebra em duas linhas
      const name = String(fl.name || 'Fluxo').toUpperCase();
      const lines = this.ptdSplit(name, 22);
      lines.forEach((ln, i) => this.ptdWord(ctx, ln, tx + i * 14, H * 0.42 + (i - (lines.length - 1) / 2) * 62, lines.length > 1 ? 52 : 66, o.color, seg(t, 16 + i * 5, 26 + i * 5), 1, -0.05, W * 0.56));
      // os bônus em etiquetas
      const parts = String(o.desc).split(' • ').filter(Boolean).slice(0, 4);
      ctx.save();
      ctx.font = '900 15px "Segoe UI", sans-serif';
      const ws = parts.map((p) => ctx.measureText(p).width + 24 + 12);
      ctx.restore();
      const total = ws.reduce((a, b) => a + b, 0);
      let x = tx - total / 2;
      parts.forEach((p, i) => {
        this.ptdChip(ctx, p, x, H * 0.58, o.color, seg(t, 42 + i * 8, 54 + i * 8), { size: 15, left: true });
        x += ws[i];
      });
      this.ptdChip(ctx, `⏱ ${fl.duration || 10} SEGUNDOS`, tx, H * 0.7, '#facc15', seg(t, 74, 86), { size: 15 });
    },
    // Plano 3: FLUXO!! (quadro de impacto) e a volta para o jogo
    ptdFlow2(ctx, S) {
      const { W, H, t } = S;
      const o = this.ptdFlowCtx();
      const hit = 12;
      const paper = mix(o.color, '#ffffff', 0.82);
      if (t < hit) {
        this.ptdCloseBg(ctx, S, o.color, W * 0.42);
        this.ptdSpr(ctx, o.you, W * 0.42, H * 1.04, 500, { animState: 'run', frame: runF(t), rim: o.color, showAura: true, auraColor: o.color });
      } else {
        this.ptdImpactBg(ctx, S, W * 0.42, H * 0.55, INK, paper, t * 0.002);
        ctx.save();
        this.cineCamera(ctx, W, H, { zoom: 1.02 + seg(t, hit, 85) * 0.05, shake: 8 * (1 - seg(t, hit, hit + 20)) });
        this.ptdSpr(ctx, o.you, W * 0.4, H * 1.06, 600, { animState: 'run', frame: 7, rim: INK, rimD: 4 });
        this.ptdRings(ctx, W * 0.42, H * 0.55, seg(t, hit, hit + 40), [INK, o.color, o.color2], 420);
        ctx.restore();
        this.ptdWord(ctx, 'FLUXO!!', W * 0.72, H * 0.38, 130, o.color, seg(t, hit, hit + 8), 1, -0.14);
        this.ptdChip(ctx, `${o.fl.duration || 10} SEGUNDOS`, W * 0.72, H * 0.56, o.color, seg(t, 30, 42), { size: 18 });
        this.cineFlash(ctx, W, H, 0.9 * (1 - seg(t, hit, hit + 8)));
      }
      // volta para a partida: clareia na cor do Fluxo
      this.cineFlash(ctx, W, H, seg(t, 66, 84) * 0.9, paper);
      this.ptdSfx(S, hit, 'flow', () => window.SFX?.jingle([523, 784, 1047], 0, 'sawtooth'));
    },

    // ======================================================================
    // 4) PRIMEIROS GOLS: cap. 2 (Time V) e NEL (Metavision)
    // ======================================================================
    ptdFirstCast() {
      const live = this.ptdLive('first_selection_awakening');
      const ch = live ? window.MatchEngine.chapter : null;
      const opp = ch?.opponentColor ? { jerseyPrimary: ch.opponentColor, jerseySecondary: ch.opponentSecondary } : KIT_V;
      const you = this.ptdMatchYou(KIT_BL);
      const homeKit = { jerseyPrimary: you.jerseyPrimary || KIT_BL.jerseyPrimary, jerseySecondary: you.jerseySecondary || KIT_BL.jerseySecondary };
      const sc = this.ptdMatchScore({ hs: 1, as: 0, minute: "38'" });
      return {
        you,
        bachira: this.cineChar('bachira', homeKit),
        nagi: this.cineChar('nagi', opp),
        reo: this.cineChar('reo', opp),
        keeper: this.ptdMatchKeeper('fukaku', opp),
        theme: 'bluelock_bunker',
        sign: 'BLUE LOCK FACILITY • STRATUM 5 BUNKER',
        score: { hl: 'TIME Z', al: 'TIME V', hs: sc.hs, as: sc.as, minute: sc.minute, hc: '#38bdf8', ac: '#a855f7' }
      };
    },
    ptdNelCast() {
      const live = this.ptdLive('nel_metavision_goal');
      const ch = live ? window.MatchEngine.chapter : null;
      const opp = ch?.opponentColor ? { jerseyPrimary: ch.opponentColor, jerseySecondary: ch.opponentSecondary } : KIT_UBERS;
      const club = window.NEL_CLUBS?.[window.App?.state?.nelClub];
      const you = this.ptdMatchYou(KIT_BASTARD);
      const homeKit = { jerseyPrimary: you.jerseyPrimary || KIT_BASTARD.jerseyPrimary, jerseySecondary: you.jerseySecondary || KIT_BASTARD.jerseySecondary };
      const sc = this.ptdMatchScore({ hs: 1, as: 0, minute: "52'" });
      const hl = club?.name ? String(club.name).split(' ')[0] : 'BASTARD';
      return {
        you,
        hiori: this.cineChar('hiori', homeKit),
        kaiser: this.cineChar('kaiser', opp),
        lorenzo: this.cineChar('lorenzo', opp),
        keeper: this.ptdMatchKeeper('fukaku', opp),
        theme: 'nel_dome',
        sign: 'NEO EGOIST LEAGUE • BLTV WORLD AUCTION ¥',
        score: { hl, al: 'UBERS', hs: sc.hs, as: sc.as, minute: sc.minute, hc: '#ef4444', ac: '#a855f7' }
      };
    },
    // Três cortes no mesmo chute: de baixo → impacto → de trás
    ptdTriple(ctx, S, o) {
      const { W, H, t, top, dur } = S;
      const L = Math.floor(dur / 3);
      const cut = Math.min(2, Math.floor(t / L));
      const u = t - cut * L;
      const labels = ['CORTE 1/3 • DE BAIXO', 'CORTE 2/3 • IMPACTO', 'CORTE 3/3 • DE TRÁS'];
      if (cut === 0) {
        // De baixo: a câmera no gramado, você enorme armando o chute, a bola caindo
        const cv = this.ptdBg(`low|${o.theme}|${W}x${H}`, W, H, (g) => {
          const indoor = this.ptdIndoor(o.theme);
          const gr = g.createLinearGradient(0, 0, 0, H);
          gr.addColorStop(0, indoor ? '#01030a' : '#030712');
          gr.addColorStop(1, indoor ? '#0b2447' : '#1e1b4b');
          g.fillStyle = gr;
          g.fillRect(0, 0, W, H);
          for (let i = 0; i < 7; i++) {
            const x = 80 + i * 190;
            const rg = g.createRadialGradient(x, 110, 2, x, 110, 90);
            rg.addColorStop(0, indoor ? 'rgba(103,232,249,0.9)' : 'rgba(255,255,255,0.85)');
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = rg;
            g.fillRect(x - 90, 20, 180, 180);
          }
        });
        ctx.drawImage(cv, 0, 0);
        this.ptdRays(ctx, W / 2, H * 0.2, W, rgba(o.color, 1), 0.16, u * 0.004, 30);
        ctx.save();
        this.cineCamera(ctx, W, H, { zoom: 1 + u * 0.002, rot: -0.04, shake: 1.5 });
        this.ptdSpr(ctx, o.you, W * 0.44, H * 1.2, 740, { animState: 'windup', rim: o.color, frame: 45 });
        ctx.restore();
        this.ptdBall(ctx, W * 0.74, lerp(top - 40, H * 0.62, ease(u / L)), 46, u * 0.4, o.color);
        // grama na frente da câmera
        ctx.fillStyle = '#052e1a';
        for (let x = 0; x < W; x += 12) {
          const h = 30 + rnd(x, 7) * 50;
          ctx.fillRect(x, H - 72 - h, 8, h + 72);
        }
        ctx.fillStyle = '#0b4d2b';
        for (let x = 6; x < W; x += 12) {
          const h = 16 + rnd(x, 8) * 40;
          ctx.fillRect(x, H - 72 - h, 6, h + 72);
        }
      } else if (cut === 1) {
        const bx = W * 0.62;
        const by = H * 0.6;
        this.ptdImpactBg(ctx, S, bx, by, INK, PAPER, u * 0.002);
        ctx.save();
        this.cineCamera(ctx, W, H, { zoom: 1.04, shake: 9 * (1 - seg(u, 0, 18)) });
        this.ptdSpr(ctx, o.you, W * 0.38, H * 1.02, 600, { animState: o.anim || 'shoot', rim: INK, rimD: 4 });
        this.ptdRings(ctx, bx, by, seg(u, 0, 30), [INK, o.color, INK], 360);
        const sq = u < 5 ? 0.68 : 1;
        this.ptdBall(ctx, bx, by, 44, u * 0.7, null, 2 - sq, sq);
        ctx.restore();
        this.ptdWord(ctx, o.shout, W * 0.74, top + 110, 96, o.color, seg(u, 0, 7), 1, -0.12, W * 0.5);
        this.cineFlash(ctx, W, H, 0.9 * (1 - seg(u, 0, 8)));
        this.ptdSfx(S, L, 'kick', () => window.SFX?.kick(1));
      } else {
        // De trás: o gol lá na frente, a bola indo, você de costas no primeiro plano
        const geo = this.ptdGoalView(ctx, S, o);
        const k = seg(u, 0, L);
        this.ptdSpr(ctx, o.keeper, lerp(W * 0.5, W * 0.38, ease(k)), geo.gy1 + 6 - Math.sin(k * Math.PI) * 40, 260, { animState: k > 0.3 ? 'dive' : 'idle', flipX: true });
        this.ptdGoalFront(ctx, geo, W * 0.66, 330, 0);
        const p = (q) => ({ x: lerp(W * 0.6, W * 0.66, q), y: lerp(H * 0.86, 340, ease(q)) - Math.sin(q * Math.PI) * 40 });
        const b = p(k);
        const tail = [];
        for (let i = 0; i < 6; i++) tail.push(p(Math.max(0, k - i * 0.06)));
        this.ptdStreak(ctx, tail, o.color, lerp(60, 22, k), 0.85);
        this.ptdBall(ctx, b.x, b.y, lerp(44, 20, k), u * 0.8, o.color);
        this.ptdSpr(ctx, o.you, W * 0.26, H * 1.24, 600, { facing: 'back', animState: 'shoot', rim: o.color });
      }
      this.ptdChip(ctx, labels[cut], 30, top + 34, o.color, seg(u, 0, 6), { size: 14, left: true });
    },
    // --- cap. 2: Plano 1, o cruzamento do Bachira no Prédio 5
    ptdFirst0(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.ptdFirstCast();
      const feet = H * 0.86;
      this.ptdArena(ctx, S, t * 3, { theme: c.theme, sign: c.sign });
      // Bachira chega, faz o elástico na frente do Reo e passa por ele
      const el = t >= 24 && t < 42;
      const cross = 64;
      const bxp = t < 42 ? lerp(W * 0.08, W * 0.34, ease(t / 30)) : lerp(W * 0.34, W * 0.6, ease(seg(t, 42, 62)));
      const bAnim = t >= cross ? 'shoot' : el ? 'rabona' : 'run';
      // Reo se joga para o lado errado (para a esquerda, na frente da câmera)
      const fooled = t > 32;
      const rk = ease(seg(t, 32, 50));
      this.ptdSpr(ctx, c.reo, lerp(W * 0.6, W * 0.54, seg(t, 0, 30)) - rk * 150, feet + rk * 26, 280, { animState: fooled ? 'dive' : 'idle', flipX: true });
      this.ptdSpr(ctx, c.bachira, bxp, feet, 290, { animState: bAnim, frame: bAnim === 'run' ? runF(t) : auraF(t), showAura: true, auraColor: '#facc15' });
      if (el) this.ptdWord(ctx, 'ELÁSTICO!', W * 0.4, H * 0.34, 58, '#facc15', seg(t, 24, 30), 1 - seg(t, 36, 42), -0.06);
      // a bola: no pé, depois sobe para o ponto futuro (fora da tela, à direita)
      if (t < cross) {
        const wig = el ? Math.sin((t - 26) * 0.5) * 30 : 0;
        this.ptdBall(ctx, bxp + 70 + wig, feet - 16, 20, t * 0.5);
      } else {
        const k = seg(t, cross, cross + 34);
        const bx = lerp(bxp + 70, W * 1.05, k);
        const by = lerp(feet - 16, top + 40, k) - Math.sin(k * Math.PI) * 120;
        const tail = [];
        for (let i = 0; i < 6; i++) {
          const q = Math.max(0, k - i * 0.05);
          tail.push({ x: lerp(bxp + 70, W * 1.05, q), y: lerp(feet - 16, top + 40, q) - Math.sin(q * Math.PI) * 120 });
        }
        this.ptdStreak(ctx, tail, '#facc15', 20, 0.8);
        this.ptdBall(ctx, bx, by, 20, t * 0.6, '#facc15');
      }
      // o ponto futuro aceso no gramado
      if (t > cross + 6) {
        const k = seg(t, cross + 6, cross + 16);
        ctx.save();
        ctx.strokeStyle = YOU;
        ctx.lineWidth = 4;
        ctx.globalAlpha = k;
        ctx.beginPath();
        ctx.ellipse(W * 0.86, feet + 4, 70 + Math.sin(t * 0.3) * 6, 18, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
        this.ptdChip(ctx, 'PONTO FUTURO', W * 0.86, feet - 70, YOU, k, { size: 15 });
      }
      this.ptdSfx(S, cross, 'cross', () => window.SFX?.kick(0.6));
      this.ptdScore(ctx, 32, top + 16, Object.assign({}, c.score, { hs: Math.max(0, c.score.hs - 1), k: seg(t, 4, 16) }));
    },
    // --- cap. 2: Plano 2, as peças do ego se encaixam (página de mangá)
    ptdFirst1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.ptdFirstCast();
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);
      const slide = (at) => (1 - ease(seg(t, at, at + 14))) * 60;
      const show = (at) => t >= at;
      // A: o seu olho
      const A = [[24, top + 16], [560, top + 16], [500, bot - 16], [24, bot - 16]];
      this.ptdPanel(ctx, A, () => {
        this.ptdCloseBg(ctx, S, YOU, 280);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1 + t * 0.0008, shake: 0.5 });
        this.ptdFaceCrop(ctx, c.you, 4, top + 30, 552, 10, 3, 16, 14, { ring: t > 60 ? YOU : undefined, look: 1, angry: t > 60 });
        ctx.restore();
        for (let i = 0; i < 6; i++) {
          const a = t * 0.02 + i;
          this.ptdPuzzle(ctx, 80 + rnd(i, 3) * 400 + Math.sin(a) * 20, bot - 160 + Math.cos(a) * 30 - rnd(i, 4) * 90, 44, i % 2 ? YOU : '#38bdf8', a * 0.5, 0.9);
        }
      }, { dx: -slide(0) });
      // B: as costas do Nagi e do Reo, e a fresta entre eles
      if (show(24)) {
        const B = [[580, top + 16], [W - 24, top + 16], [W - 24, 352], [560, 336]];
        this.ptdPanel(ctx, B, () => {
          ctx.fillStyle = '#071226';
          ctx.fillRect(560, top, W, 360);
          const gx = 900;
          const k = seg(t, 40, 60);
          this.cineGlow(ctx, gx, 250, 160, 'rgba(0,245,212,0.6)', k);
          ctx.fillStyle = rgba(YOU, 0.9 * k);
          ctx.fillRect(gx - 6, top + 20, 12, 260);
          this.ptdSpr(ctx, c.nagi, 790, 420, 300, { facing: 'back', dim: 0.3, dimTint: '7,18,38' });
          this.ptdSpr(ctx, c.reo, 1020, 430, 300, { facing: 'back', dim: 0.3, dimTint: '7,18,38' });
          this.ptdChip(ctx, 'A ÚLTIMA PEÇA', gx, 310, YOU, k, { size: 14 });
        }, { dx: slide(24) });
      }
      // C: a peça entrando no lugar
      if (show(46)) {
        const C = [[540, 368], [W - 24, 384], [W - 24, bot - 16], [520, bot - 16]];
        this.ptdPanel(ctx, C, () => {
          ctx.fillStyle = '#0b1736';
          ctx.fillRect(500, 360, W, 360);
          const cx = 880;
          const cy = 500;
          const s = 120;
          for (let r = -1; r <= 1; r++) {
            for (let q = -2; q <= 2; q++) {
              if (r === 0 && q === 0) continue;
              this.ptdPuzzle(ctx, cx + q * s * 0.5, cy + r * s * 0.5, s, (q + r) % 2 ? '#1e3a8a' : '#1d4ed8', 0, 0.95);
            }
          }
          const k = ease(seg(t, 56, 80));
          const px = lerp(cx + 300, cx, k);
          const py = lerp(cy - 160, cy, k);
          if (k >= 1) this.cineGlow(ctx, cx, cy, 160, 'rgba(0,245,212,0.7)', 1 - seg(t, 80, 110) * 0.5);
          this.ptdPuzzle(ctx, px, py, s, YOU, (1 - k) * 1.2, 1);
          if (t >= 80) this.ptdWord(ctx, 'CLICK!', cx + 230, cy + 60, 60, '#f8fafc', seg(t, 80, 86), 1, -0.1);
        }, { dy: slide(46) });
      }
      this.ptdSfx(S, 80, 'click', () => window.SFX?.blip(1320));
    },
    ptdFirst2(ctx, S) {
      const c = this.ptdFirstCast();
      this.ptdTriple(ctx, S, { you: c.you, keeper: c.keeper, theme: c.theme, sign: c.sign, color: YOU, shout: 'CHUTE DIRETO!!', hc: '#38bdf8', ac: '#a855f7' });
    },
    // --- cap. 2: Plano 4, a bola rasga a área passando pelo Nagi
    ptdFirst3(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.ptdFirstCast();
      this.ptdBallCam(ctx, S, t, {
        color: YOU,
        color2: '#38bdf8',
        r: 64,
        passers: [
          { char: c.nagi, anim: 'slide', size: 400, feet: H * 1.02, x0: W * 1.2, x1: -W * 0.25, t0: 10, t1: 46, flipX: true },
          { char: c.keeper, anim: 'dive', size: 320, feet: H * 0.6, x0: W * 1.25, x1: -W * 0.2, t0: 50, t1: 86, flipX: true }
        ]
      });
      this.ptdWord(ctx, 'PASSOU!', W * 0.72, top + 90, 70, YOU, seg(t, 30, 38), 1 - seg(t, 70, 84), -0.08);
      this.ptdSfx(S, 4, 'fly', () => window.SFX?.whoosh());
    },
    // --- cap. 2: Plano 5, a rede do Time V
    ptdFirst4(ctx, S) {
      const { W, t, top, bot } = S;
      const c = this.ptdFirstCast();
      this.ptdGoalHit(ctx, S, { theme: c.theme, sign: c.sign, hc: '#38bdf8', ac: '#a855f7', keeper: c.keeper, scorer: c.you, color: YOU, teamColor: YOU, word: 'GOOOOOL!!', hx: W * 0.68 });
      this.ptdScore(ctx, 32, top + 16, Object.assign({}, c.score, { hs: t >= 50 ? c.score.hs : Math.max(0, c.score.hs - 1), pop: 'home', popK: seg(t, 50, 66) }));
      this.ptdChip(ctx, 'O TIME Z SEGUE VIVO NO BLUE LOCK!', W * 0.36, bot - 44, YOU, seg(t, 70, 82), { size: 17 });
    },
    // --- NEL: Plano 1, a grade holográfica do Metavision
    ptdNel0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.ptdNelCast();
      // campo visto de cima, inclinado (pronto)
      const P = (uu, vv) => {
        const y = lerp(top + 40, bot - 20, Math.pow(vv, 1.1));
        const half = lerp(W * 0.3, W * 0.48, vv);
        return [W / 2 + (uu - 0.5) * 2 * half, y];
      };
      const cv = this.ptdBg(`meta|${W}x${H}`, W, H, (g) => {
        g.fillStyle = '#020617';
        g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(56,189,248,0.22)';
        g.lineWidth = 1;
        g.beginPath();
        for (let i = 0; i <= 24; i++) {
          const [x0, y0] = P(i / 24, 0);
          const [x1, y1] = P(i / 24, 1);
          g.moveTo(x0, y0);
          g.lineTo(x1, y1);
        }
        for (let j = 0; j <= 14; j++) {
          const [x0, y0] = P(0, j / 14);
          const [x1, y1] = P(1, j / 14);
          g.moveTo(x0, y0);
          g.lineTo(x1, y1);
        }
        g.stroke();
        g.strokeStyle = 'rgba(103,232,249,0.85)';
        g.lineWidth = 3;
        const line = (pts) => {
          g.beginPath();
          pts.forEach(([a, b], i) => {
            const [x, y] = P(a, b);
            if (i) g.lineTo(x, y);
            else g.moveTo(x, y);
          });
          g.stroke();
        };
        line([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]);
        line([[0.5, 0], [0.5, 1]]);
        line([[1, 0.22], [0.84, 0.22], [0.84, 0.78], [1, 0.78]]);
        line([[1, 0.38], [0.94, 0.38], [0.94, 0.62], [1, 0.62]]);
        line([[0, 0.22], [0.16, 0.22], [0.16, 0.78], [0, 0.78]]);
        const [ccx, ccy] = P(0.5, 0.5);
        g.beginPath();
        g.ellipse(ccx, ccy, 90, 54, 0, 0, TAU);
        g.stroke();
      });
      ctx.drawImage(cv, 0, 0);
      const me = [0.6, 0.55];
      const [mx, my] = P(...me);
      // varredura de 360°
      const ang = t * 0.11;
      ctx.save();
      for (let i = 0; i < 10; i++) {
        ctx.globalAlpha = 0.16 * (1 - i / 10);
        ctx.fillStyle = YOU;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.arc(mx, my, W * 0.6, ang - (i + 1) * 0.06, ang - i * 0.06);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      const sweepPassed = (x, y) => {
        const a = mod(Math.atan2(y - my, x - mx), TAU);
        return ang >= TAU || mod(ang, TAU) >= a;
      };
      const players = [
        { p: [0.38, 0.3], col: YOU, name: 'HIORI' },
        { p: [0.74, 0.42], col: '#ef4444', name: 'KAISER' },
        { p: [0.8, 0.64], col: '#ef4444', name: 'LORENZO' },
        { p: [0.97, 0.5], col: '#ef4444', name: 'GOLEIRO' },
        { p: [0.66, 0.78], col: '#ef4444', name: '' },
        { p: [0.48, 0.72], col: YOU, name: '' },
        { p: [0.86, 0.3], col: '#ef4444', name: '' }
      ];
      players.forEach((pl, i) => {
        const [x, y] = P(...pl.p);
        const on = sweepPassed(x, y);
        ctx.fillStyle = '#020617';
        ctx.fillRect(x - 11, y - 11, 22, 22);
        ctx.fillStyle = on ? pl.col : 'rgba(148,163,184,0.5)';
        ctx.fillRect(x - 8, y - 8, 16, 16);
        if (on && pl.name) this.ptdChip(ctx, pl.name, x, y - 30, pl.col, 1, { size: 12 });
      });
      // previsões: Kaiser e Lorenzo fechando, o passe do Hiori e o seu chute
      const dash = (a, b, col, k, w = 4) => {
        if (k <= 0) return;
        const [x0, y0] = P(...a);
        const [x1, y1] = P(...b);
        ctx.save();
        ctx.setLineDash([12, 9]);
        ctx.lineDashOffset = -t * 1.5;
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(lerp(x0, x1, k), lerp(y0, y1, k));
        ctx.stroke();
        ctx.restore();
      };
      dash([0.74, 0.42], [0.64, 0.5], '#ef4444', seg(t, 36, 52));
      dash([0.8, 0.64], [0.66, 0.58], '#ef4444', seg(t, 40, 56));
      dash([0.38, 0.3], me, YOU, seg(t, 50, 64));
      dash(me, [1, 0.34], '#facc15', seg(t, 64, 82), 5);
      ctx.fillStyle = '#020617';
      ctx.fillRect(mx - 15, my - 15, 30, 30);
      ctx.fillStyle = YOU;
      ctx.fillRect(mx - 11, my - 11, 22, 22);
      this.ptdChip(ctx, 'VOCÊ', mx, my + 36, YOU, 1, { size: 13 });
      if (t > 64) this.ptdWord(ctx, 'ROTA DE GOL', P(0.88, 0.22)[0], P(0.88, 0.22)[1] - 44, 30, '#facc15', seg(t, 66, 74), 1, -0.05);
      // o seu olho no canto
      const E = [[24, bot - 150], [372, bot - 158], [372, bot - 18], [24, bot - 18]];
      this.ptdPanel(ctx, E, () => {
        ctx.fillStyle = '#071226';
        ctx.fillRect(0, bot - 170, 380, 170);
        this.ptdFaceCrop(ctx, c.you, 24, bot - 158, 348, 11, 7.2, 14, 6.4, { ring: YOU, iris: '#0b3b4f', look: mod(Math.floor(t / 20), 3) - 1 });
      }, { width: 4 });
      this.ptdWord(ctx, 'METAVISION', 210, top + 50, 50, YOU, seg(t, 6, 14), 1, -0.05);
      this.ptdChip(ctx, 'LEITURA 4D • 360°', 210, top + 102, YOU, seg(t, 12, 22), { size: 14 });
      this.ptdSfx(S, 6, 'scan', () => window.SFX?.blip(660));
    },
    // --- NEL: Plano 2, olhos do predador e a finta no ar
    ptdNel1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.ptdNelCast();
      const cutAt = 44;
      if (t < cutAt) {
        this.ptdCloseBg(ctx, S, '#ef4444', W / 2);
        const U = W / 13;
        const dy = H / 2 - 3 * U;
        ctx.save();
        this.cineCamera(ctx, W, H, { zoom: 1 + t * 0.002, shake: 1 });
        this.ptdFaceCrop(ctx, c.you, 0, dy, W, 11.5, 7, 13, 6.4, { iris: '#1c0505', ring: '#ef4444', tiny: true, angry: true });
        ctx.restore();
        this.ptdWord(ctx, 'OLHOS DO PREDADOR', W / 2, bot - 70, 54, '#ef4444', seg(t, 8, 16), 1, -0.03, W * 0.8);
        return;
      }
      const u = t - cutAt;
      const feet = H * 0.86;
      this.ptdArena(ctx, S, u * 2, { theme: c.theme, sign: c.sign, hc: '#ef4444', ac: '#a855f7' });
      const feint = 30;
      const jump = Math.sin(clamp(u / 64) * Math.PI);
      const yy = feet - jump * 120;
      // Kaiser e Lorenzo saltam para bloquear o chute de esquerda
      const kz = ease(seg(u, 0, 26));
      const fall = easeIn(seg(u, feint + 2, feint + 26));
      // Kaiser no alto, Lorenzo por baixo; depois da finta os dois passam direto e caem
      this.ptdSpr(ctx, c.lorenzo, lerp(W * 1.15, W * 0.74, kz) - fall * 40, lerp(feet, feet - 30, kz) + fall * 40, 300, { animState: 'slide', flipX: true });
      this.ptdSpr(ctx, c.kaiser, lerp(W * 1.05, W * 0.6, kz) - fall * 50, lerp(feet - 40, feet - 190, kz) + fall * 230, 290, { animState: 'dive', flipX: true });
      // você: arma a esquerda... e troca de pé no ar
      const anim = u < feint ? 'windup' : 'shoot';
      this.ptdSpr(ctx, c.you, W * 0.34, yy, 300, { animState: anim, flipX: u < feint, rim: u >= feint ? YOU : null, showAura: u >= feint, auraColor: YOU, frame: auraF(u) });
      // o passe do Hiori chegando
      const bk = seg(u, 0, 26);
      const bx = lerp(W * 0.02, W * 0.4, bk);
      const by = lerp(feet - 60, yy - 16, bk) - Math.sin(bk * Math.PI) * 70;
      this.ptdBall(ctx, bx, by, 22, u * 0.5, '#38bdf8');
      if (u < 24) this.ptdChip(ctx, 'PASSE DO HIORI', W * 0.18, top + 80, '#38bdf8', seg(u, 0, 8), { size: 14 });
      if (u >= feint) this.ptdWord(ctx, 'FINTA NO AR!', W * 0.42, top + 90, 70, YOU, seg(u, feint, feint + 8), 1, -0.06);
      this.ptdSfx(S, cutAt + feint, 'feint', () => window.SFX?.whoosh());
    },
    ptdNel2(ctx, S) {
      const c = this.ptdNelCast();
      this.ptdTriple(ctx, S, { you: c.you, keeper: c.keeper, theme: c.theme, sign: c.sign, color: YOU, shout: 'DUAS ARMAS!!', hc: '#ef4444', ac: '#a855f7' });
    },
    // --- NEL: Plano 4, o efeito Magnus e o Kaiser parado
    ptdNel3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.ptdNelCast();
      this.ptdCloseBg(ctx, S, '#a855f7', W * 0.28);
      this.ptdRays(ctx, W * 0.28, H * 0.44, W * 0.8, 'rgba(168,85,247,1)', 0.14, t * 0.002, 32);
      // a curva impossível atrás dele
      const B = (q) => {
        const x = lerp(W * 0.42, W * 1.05, q);
        const y = lerp(bot - 30, top + 60, q) + Math.sin(q * Math.PI) * -40 - Math.sin(q * Math.PI * 1.6) * 120;
        return { x: x + Math.sin(q * Math.PI) * 140, y };
      };
      const k = seg(t, 6, 78);
      const tail = [];
      for (let i = 0; i < 12; i++) tail.push(B(Math.max(0, k - i * 0.04)));
      this.ptdStreak(ctx, tail, YOU, 34, 0.85);
      const b = B(k);
      this.ptdBall(ctx, b.x, b.y, lerp(40, 26, k), t * 0.9, YOU);
      ctx.save();
      this.cineCamera(ctx, W, H, { zoom: 1 + t * 0.0006, shake: 0.6 });
      const { u } = this.ptdHead(ctx, c.kaiser, W * 0.28, H * 0.44, 820, { rim: '#a855f7', dim: 0.15, dimTint: '20,10,40' });
      this.ptdEyes(ctx, c.kaiser, W * 0.28, H * 0.44, u, { tiny: true, look: 1 });
      // gota de suor em pixel
      const dy = seg(t, 40, 90) * u * 2;
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(W * 0.28 + 7 * u, H * 0.44 - 3 * u + dy, u * 0.6, u * 0.9);
      ctx.fillRect(W * 0.28 + 6.8 * u, H * 0.44 - 2.4 * u + dy, u, u * 0.9);
      ctx.restore();
      this.ptdWord(ctx, 'EFEITO MAGNUS', W * 0.72, bot - 70, 66, YOU, seg(t, 20, 30), 1, -0.05, W * 0.5);
      this.ptdSfx(S, 8, 'curve', () => window.SFX?.whoosh());
    },
    // --- NEL: Plano 5, a rede estufa e o telão da BLTV dispara o leilão
    ptdNel4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.ptdNelCast();
      this.ptdGoalHit(ctx, S, { theme: c.theme, sign: c.sign, hc: '#ef4444', ac: '#a855f7', keeper: c.keeper, scorer: t < 64 ? c.you : null, color: YOU, teamColor: YOU, word: 'GOOOOOL!!', hx: W * 0.32, hit: 16 });
      this.ptdScore(ctx, 32, top + 16, Object.assign({}, c.score, { hs: t >= 40 ? c.score.hs : Math.max(0, c.score.hs - 1), pop: 'home', popK: seg(t, 40, 56) }));
      const sk = ease(seg(t, 58, 76));
      if (sk <= 0) return;
      // O telão desce
      ctx.save();
      ctx.fillStyle = `rgba(2,6,23,${0.55 * sk})`;
      ctx.fillRect(0, 0, W, H);
      const x0 = W * 0.1;
      const w = W * 0.8;
      const y0 = lerp(-400, top + 26, sk);
      const h = bot - top - 64;
      ctx.fillStyle = '#020617';
      ctx.fillRect(x0 - 10, y0 - 10, w + 20, h + 20);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x0 - 6, y0 - 6, w + 12, h + 12);
      ctx.fillStyle = '#070b18';
      ctx.fillRect(x0, y0, w, h);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x0, y0, w, 44);
      ctx.font = '900 20px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0b1020';
      ctx.fillText('BLTV • LEILÃO MUNDIAL AO VIVO', x0 + 18, y0 + 23);
      if (Math.floor(t / 20) % 2) {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(x0 + w - 92, y0 + 12, 12, 12);
      }
      ctx.fillStyle = '#0b1020';
      ctx.textAlign = 'right';
      ctx.fillText('AO VIVO', x0 + w - 18, y0 + 23);
      // retrato
      const pw = 250;
      ctx.fillStyle = '#0b2447';
      ctx.fillRect(x0 + 24, y0 + 64, pw, pw);
      this.ptdCrop(ctx, c.you, {}, 9, 2, 18, 18, x0 + 24, y0 + 64, pw, pw);
      ctx.strokeStyle = YOU;
      ctx.lineWidth = 3;
      ctx.strokeRect(x0 + 24, y0 + 64, pw, pw);
      ctx.textAlign = 'left';
      ctx.font = '900 16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('NOVA OFERTA', x0 + pw + 60, y0 + 92);
      ctx.font = '900 30px "Segoe UI", sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(this.cinePlayerName(), x0 + pw + 60, y0 + 130);
      const val = Math.round(300000000 * easeIO(seg(t, 76, 118)) / 1000000) * 1000000;
      const txt = `¥ ${val.toLocaleString('pt-BR')}`;
      let fs = 62;
      ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      while (fs > 30 && ctx.measureText('¥ 300.000.000').width > w - pw - 100) {
        fs -= 4;
        ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      }
      ctx.fillStyle = '#020617';
      ctx.fillText(txt, x0 + pw + 64, y0 + 206);
      ctx.fillStyle = val >= 300000000 ? '#facc15' : '#fde68a';
      ctx.fillText(txt, x0 + pw + 60, y0 + 202);
      if (t > 118) this.ptdChip(ctx, '▲ RECORDE DA RODADA', x0 + pw + 60, y0 + 266, '#facc15', seg(t, 118, 128), { size: 15, left: true });
      // Os clubes dando lance
      const bids = [['MANSHINE CITY', 240, '#7dd3fc'], ['P.X.G', 210, '#e11d48'], ['FC BARCHA', 180, '#ef4444']];
      bids.forEach(([club, v, col], i) => {
        const k = seg(t, 84 + i * 10, 96 + i * 10);
        if (k <= 0) return;
        const y = y0 + 352 + i * 40;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.fillStyle = 'rgba(30,41,59,0.85)';
        ctx.fillRect(x0 + 24, y - 16, w - 48, 32);
        ctx.fillStyle = col;
        ctx.fillRect(x0 + 24, y - 16, 6, 32);
        ctx.font = '900 16px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(`LANCE • ${club}`, x0 + 44, y + 1);
        const barW = (w - 520) * (v / 300) * ease(k);
        ctx.fillStyle = col;
        ctx.fillRect(x0 + 300, y - 6, barW, 12);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(`¥ ${(v * 1000000).toLocaleString('pt-BR')}`, x0 + w - 40, y + 1);
        ctx.restore();
      });
      // letreiro correndo embaixo
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0 + h - 40, w, 40);
      ctx.clip();
      ctx.fillStyle = '#111827';
      ctx.fillRect(x0, y0 + h - 40, w, 40);
      ctx.font = '900 15px "Segoe UI", sans-serif';
      ctx.fillStyle = '#e2e8f0';
      const tick = 'BASTARD MÜNCHEN • MANSHINE CITY • FC BARCHA • UBERS • P.X.G • ';
      const tw = ctx.measureText(tick).width;
      const off = mod(t * 2.2, tw);
      for (let x = x0 - off; x < x0 + w; x += tw) ctx.fillText(tick, x, y0 + h - 20);
      ctx.restore();
      ctx.restore();
      this.ptdSfx(S, 118, 'offer', () => window.SFX?.jingle([784, 988, 1319], 0, 'triangle'));
    }
  });

  // ==========================================================================
  // REGISTRO DAS CENAS
  // ==========================================================================
  const runPlan = (fns) =>
    function (ctx, S) {
      this.sakugaW = S.W;
      fns[S.phase].call(this, ctx, S);
      this.ptdGrain(ctx, S.W, S.H, 0.05);
      this.ptdWarm(fns, S);
    };

  Object.assign(CE, {
    // Som que não toca durante o aquecimento
    ptdSfx(S, at, id, fn) {
      if (this._ptdWarming) return;
      this.cineSfx(S, at, id, fn);
    },
    // Aquecimento: desenha os próximos planos num canvas minúsculo (só para montar fundos e
    // bonecos guardados), um pedaço por quadro, para não travar nos cortes
    ptdWarm(fns, S) {
      const durs = this.getSakugaPhaseDurations();
      const key = `${this.sakugaType}|${this._cineRun}`;
      if (!this._ptdW || this._ptdW.key !== key) {
        const list = [];
        for (let p = 1; p < fns.length; p++) for (let t = 0; t < durs[p]; t += 6) list.push([p, t]);
        this._ptdW = { key, list, i: 0 };
      }
      const w = this._ptdW;
      if (w.i >= w.list.length || (S.phase === 0 && S.t < 2)) return;
      if (!this._ptdDummy) {
        const cv = document.createElement('canvas');
        cv.width = 2;
        cv.height = 2;
        this._ptdDummy = cv.getContext('2d');
      }
      const t0 = performance.now();
      this._ptdWarming = true;
      try {
        while (w.i < w.list.length && performance.now() - t0 < 2) {
          const [p, t] = w.list[w.i++];
          if (p <= S.phase) continue;
          const g = this._ptdDummy;
          g.save();
          fns[p].call(this, g, Object.assign({}, S, { t, phase: p, dur: durs[p], p: t / durs[p] }));
          g.restore();
        }
      } finally {
        this._ptdWarming = false;
      }
    }
  });

  // 1) Gol garantido do roteiro (vale para gol seu e do rival)
  CE.registerCine('scripted_shot', {
    phases: [100, 110, 100, 150],
    music: 'tension',
    letterbox: 0.1,
    grain: 0,
    get title() {
      const c = CE.ptdShotCfg();
      return `⚽ GOL GARANTIDO • ${String(c.shooterName || '').toUpperCase()}`;
    },
    get tags() {
      const c = CE.ptdShotCfg();
      return ['PLANO 1 • A ARRANCADA', `PLANO 2 • ${String(c.weaponName || 'A ARMA').toUpperCase()}`, 'PLANO 3 • IMPACTO!', `PLANO 4 • GOL! ${c.homeAfter} x ${c.awayAfter}`];
    },
    get subs() {
      const c = CE.ptdShotCfg();
      const away = c.team === 'away';
      const col = away ? '#ef4444' : YOU;
      const who = String(c.shooterName || '').toUpperCase();
      // Cena rápida (no meio da partida): o "X ARRANCA!", a arma e o nome do chute já
      // estão na imagem; uma fala curta por plano. O grito usa o nome do chute sem o
      // parêntese e só entra se couber no plano (o nome completo está escrito na tela)
      const sc = CE.CINE_READ_SCALE.scripted_shot ?? 1;
      const shout = `"${String(c.skillName || '').replace(/\s*\(.*\)\s*$/, '')}!!"`;
      const fits = (30 + `${who} ${shout}`.length * 3.4) * sc <= 106;
      return [
        [{ from: 4, who: 'NARRADOR', text: 'Livre! Parte pra cima!', color: '#94a3b8' }],
        fits ? [{ from: 4, who, text: shout, color: col }] : [],
        [{ from: 8, who: 'NARRADOR', text: 'O tempo congela...', color: '#94a3b8' }],
        [{ from: 24, who: 'NARRADOR', text: away ? 'A rede estufa... o rival marca!' : 'A rede estufa! Seu time marca!', color: away ? '#fca5a5' : '#94a3b8' }]
      ];
    },
    draw: runPlan([CE.ptdShot0, CE.ptdShot1, CE.ptdShot2, CE.ptdShot3])
  });

  // 2) Reação química com o parceiro
  CE.registerCine('chem_reaction', {
    phases: [110, 140, 90, 100],
    letterbox: 0.1,
    grain: 0,
    get title() {
      const c = CE.ptdChemCfg();
      return `⚗️ REAÇÃO QUÍMICA • ${String(c.partnerName || '').toUpperCase()} × ${String(c.youName || 'VOCÊ').toUpperCase()}`;
    },
    get tags() {
      const o = CE.ptdChemCtx();
      return ['PLANO 1 • SINTONIA', `PLANO 2 • ${o.chemName.toUpperCase()}`, 'PLANO 3 • IMPACTO', 'PLANO 4 • RUMO AO GOL'];
    },
    get subs() {
      // Cena rápida: os nomes (A × B), o "REAÇÃO QUÍMICA" e o nome da química já estão na
      // imagem. A frase e o bônus do parceiro (60 a 100 letras) não cabem em 2 s: só entram
      // se couberem no plano (fala de quem tem frase curta)
      const o = CE.ptdChemCtx();
      const c = o.c;
      const sc = CE.CINE_READ_SCALE.chem_reaction ?? 1;
      const fits = (who, text, room) => (30 + `${who} ${text}`.length * 3.4) * sc <= room;
      const pWho = String(c.partnerName || '').toUpperCase();
      const quote = o.partner.quote ? `"${o.partner.quote}"` : '';
      const bonus = o.partner.chemBonus || '';
      return [
        [quote && fits(pWho, quote, 106) ? { from: 4, who: pWho, text: quote, color: o.pc } : { from: 2, who: 'NARRADOR', text: 'Os dois veem o mesmo lance!', color: '#94a3b8' }],
        [{ from: 6, who: 'NARRADOR', text: bonus && fits('NARRADOR', bonus, 134) ? bonus : 'O passe sai no espaço perfeito.', color: '#94a3b8' }],
        [{ from: 8, who: 'NARRADOR', text: 'Um só chute!', color: '#94a3b8' }],
        [{ from: 2, who: 'NARRADOR', text: 'O goleiro vai alcançar?', color: '#94a3b8' }]
      ];
    },
    draw: runPlan([CE.ptdChem0, CE.ptdChem1, CE.ptdChem2, CE.ptdChem3])
  });

  // 3) O despertar do Fluxo
  CE.registerCine('flow_awaken', {
    phases: [95, 125, 85],
    letterbox: 0.1,
    grain: 0,
    get title() {
      const c = CE.ptdFlowCfg();
      return `🔥 DESPERTAR DO FLUXO • ${String(c.youName || 'VOCÊ').toUpperCase()}`;
    },
    get tags() {
      const o = CE.ptdFlowCtx();
      return ['PLANO 1 • O MUNDO PARA', `PLANO 2 • ${String(o.fl.name || 'FLUXO').toUpperCase()}`, 'PLANO 3 • FLUXO!!'];
    },
    get subs() {
      // Cena rápida: os "TUM...", o nome do fluxo, os bônus em etiquetas e o "N SEGUNDOS" já
      // estão na imagem. A descrição do fluxo só entra se couber no plano
      const o = CE.ptdFlowCtx();
      const sc = CE.CINE_READ_SCALE.flow_awaken ?? 1;
      const desc = o.desc || o.fl.desc || 'Nada consegue te parar.';
      const fits = (30 + `FLUXO ${desc}`.length * 3.4) * sc <= 113;
      return [
        [{ from: 4, who: 'VOCÊ', text: '(...tudo em silêncio.)', color: YOU }],
        fits ? [{ from: 12, who: 'FLUXO', text: desc, color: o.color }] : [],
        [{ from: 2, who: 'NARRADOR', text: 'Ninguém te para!', color: '#94a3b8' }]
      ];
    },
    draw: runPlan([CE.ptdFlow0, CE.ptdFlow1, CE.ptdFlow2])
  });

  // 4a) 1ª Seleção: o despertar do quebra-cabeça e o chute direto (cap. 2)
  CE.registerCine('first_selection_awakening', {
    phases: [100, 110, 108, 90, 130],
    music: 'epic',
    letterbox: 0.1,
    grain: 0,
    title: '🧩 1ª SELEÇÃO • O DESPERTAR',
    tags: ['PLANO 1 • O CRUZAMENTO DO BACHIRA', 'PLANO 2 • AS PEÇAS SE ENCAIXAM', 'PLANO 3 • TRÊS ÂNGULOS, UM CHUTE DIRETO', 'PLANO 4 • RASGANDO A GRANDE ÁREA', 'PLANO 5 • A REDE DO TIME V'],
    get subs() {
      // Planos de 1,5 a 2 s: uma fala curta por plano ("ELÁSTICO!", "PONTO FUTURO", "A ÚLTIMA
      // PEÇA", "CHUTE DIRETO!!", "PASSOU!", "GOOOOOL!!" e "O TIME Z SEGUE VIVO" já estão na imagem)
      return [
        [{ from: 4, who: 'MEGURU BACHIRA', text: '"É você!!"', color: '#facc15' }],
        [{ from: 0, who: 'VOCÊ', text: '(A última peça... sou EU.)', color: YOU }],
        [{ from: 6, who: 'NARRADOR', text: 'Voleio sem dominar!', color: '#94a3b8' }],
        [{ from: 8, who: 'NARRADOR', text: 'Nem o Nagi!', color: '#94a3b8' }],
        [{ from: 12, who: 'JINPACHI EGO', text: '"Isso! Esse é o EGO."', color: YOU }]
      ];
    },
    draw: runPlan([CE.ptdFirst0, CE.ptdFirst1, CE.ptdFirst2, CE.ptdFirst3, CE.ptdFirst4])
  });

  // 4b) NEL: Metavision e o chute de duas armas
  CE.registerCine('nel_metavision_goal', {
    phases: [100, 108, 108, 90, 150],
    music: 'epic',
    letterbox: 0.1,
    grain: 0,
    title: '👁️ NEL • METAVISION',
    tags: ['PLANO 1 • METAVISION 4D', 'PLANO 2 • OLHOS DO PREDADOR', 'PLANO 3 • TRÊS ÂNGULOS, DUAS ARMAS', 'PLANO 4 • EFEITO MAGNUS', 'PLANO 5 • ¥ 300.000.000'],
    get subs() {
      // "METAVISION • 360°", os nomes, a "ROTA DE GOL", o "FINTA NO AR!", o "DUAS ARMAS!!",
      // o "EFEITO MAGNUS" e o "GOOOOOL!!" já estão na imagem: uma fala curta por plano
      return [
        [{ from: 2, who: 'VOCÊ', text: '(Eu já vi esse lance.)', color: YOU }],
        [{ from: 2, who: 'VOCÊ', text: '(Vão bloquear a canhota.)', color: YOU }],
        [{ from: 8, who: 'NARRADOR', text: 'Bomba de direita!', color: '#94a3b8' }],
        [{ from: 0, who: 'MICHAEL KAISER', text: '"Impossível."', color: '#a855f7' }],
        [{ from: 40, who: 'BLTV', text: 'Seu leilão: ¥ 300.000.000!', color: '#facc15' }]
      ];
    },
    draw: runPlan([CE.ptdNel0, CE.ptdNel1, CE.ptdNel2, CE.ptdNel3, CE.ptdNel4])
  });
})();
