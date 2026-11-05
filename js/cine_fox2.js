// Cenas cinematográficas (cine_fox2) — ver js/cine_kit.js
// fox_entrance • fox_watch • four_egos_intro
// Tudo que é auxiliar fica no CutsceneEngine com o prefixo fx2 (não colide com os outros arquivos).
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine) return;

  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = (i, s = 0) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  // Batida que acende e decai (soco de câmera, brilho)
  const pulse = (t, at, len = 18) => (t < at || t > at + len ? 0 : Math.pow(1 - (t - at) / len, 2));

  const FOX_COLOR = '#f59e0b';
  const YOU_COLOR = '#00f5d4';
  const NARR = '#94a3b8';
  const TOWERS = [110, 400, 880, 1170];
  // Opções dos bonecos guardados (as mesmas no desenho e no aquecimento: a chave do cache bate)
  const O = {
    youBackRim: { facing: 'back', tint: '#dbeafe' },
    youBackMoon: { facing: 'back', tint: '#64748b' },
    youBackDim: { facing: 'back', dim: 0.8, dimTint: '2,4,12' },
    youBackBlack: { facing: 'back', tint: '#02040a' },
    foxDark: { tint: '#020203', rim: '#5b1414', rimSides: [-1, 1, 0], rimD: 1 },
    foxSpot: {
      grad: [[0, 'rgba(239,246,255,0.1)'], [0.45, 'rgba(15,23,42,0.1)'], [1, 'rgba(2,6,23,0.55)']],
      shade: [7.5, 9.4, 10.8, 12.2, 0.72, '2,6,23'],
      rim: '#e0f2fe',
      rimSides: [-1, 1, 0]
    },
    foxEyesCrop: { dim: 0.3, dimTint: '6,12,34', shade: [6.5, 8.6, 11.2, 12.6, 0.78, '2,4,14'] },
    foxMouthCrop: { dim: 0.72, dimTint: '12,4,8' },
    // o Fox na arquibancada: rosto na sombra até o sorriso (11.6 → 12.4), luz fria de recorte
    foxHidden: (rim) => ({ dim: 0.28, dimTint: '8,14,40', shade: [0, 0, 11.6, 12.4, 1], rim, rimSides: [-1, 1, 0] }),
    youKick: (anim, frame) => ({ facing: 'back', animState: anim, frame, rim: '#bfdbfe', rimSides: [0] })
  };

  Object.assign(CE, {
    // ======================================================================
    // AUXILIARES (prefixo fx2)
    // ======================================================================
    fx2Fox() {
      return this.getSpeakerCharData('FOX');
    },

    // Limpa a tela e, a cada vez que uma cena começa, joga fora os bonecos guardados
    // (o uniforme/visual do jogador pode ter mudado)
    fx2Begin(ctx, S) {
      ctx.clearRect(0, 0, S.W, S.H);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, S.W, S.H);
      this._fx2T0 = performance.now();
      const run = `${this.sakugaType}|${this._cineRun}`;
      if (this._fx2Run !== run) {
        this._fx2Run = run;
        if (this._fx2Spr) this._fx2Spr.clear();
        this._fx2Close = null;
        this._fx2WarmList = null;
      }
    },
    // Fila de aquecimento: monta antes (nos quadros com folga) o que os próximos planos usam,
    // para o primeiro quadro de cada plano não travar montando tudo de uma vez
    fx2Warm(def) {
      if (!def.warm) return;
      if (!this._fx2WarmList) {
        this._fx2WarmList = def.warm.call(this);
        this._fx2WarmIdx = 0;
      }
      const list = this._fx2WarmList;
      while (this._fx2WarmIdx < list.length && performance.now() - this._fx2T0 < 4) list[this._fx2WarmIdx++].call(this);
    },

    fx2Rgba(hex, a) {
      const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
      if (!m) return `rgba(255,255,255,${a})`;
      return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
    },
    fx2Shade(hex, amt) {
      const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
      if (!m) return hex;
      const f = (v) => {
        v = parseInt(v, 16);
        v = amt < 0 ? v * (1 + amt) : v + (255 - v) * amt;
        return Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
      };
      return '#' + f(m[1]) + f(m[2]) + f(m[3]);
    },

    // ---------------------------------------------------------------- bonecos guardados
    // Boneco pronto num canvas (pixel art na base pequena, ampliado sem suavizar).
    // o = { facing, animState, frame (padrão 45: o 0 é o quadro do piscar), flipX, tint,
    //       dim, dimTint, grad: [[0..1, cor]] (luz de cima p/ baixo), shade: [y0,y1,y2,y3,a,'r,g,b']
    //       (faixa de sombra em unidades 0..36 a partir do topo: sobe em y0→y1, fica até y2,
    //       some em y3; y1<=y0 = sólida desde o topo), rim, rimSides ([-1,1,0]), rimD }
    fx2Key(c) {
      return [c.id || '', c.name || '', c.jerseyPrimary, c.jerseySecondary, c.outfit || '', c.hairColor, c.hairStyle, c.skinColor, c.eyeColor, c.angry ? 1 : 0].join(',');
    },
    fx2Entry(char, base, o = {}) {
      const cache = this._fx2Spr || (this._fx2Spr = new Map());
      const key = `${base}|${this.fx2Key(char)}|${JSON.stringify(o)}`;
      let e = cache.get(key);
      if (e) return e;
      const pad = Math.ceil(base * 0.45);
      const cv = document.createElement('canvas');
      cv.width = base + pad * 2;
      cv.height = Math.ceil(base * 1.1) + pad * 2;
      const g = cv.getContext('2d');
      g.translate(pad, pad);
      window.PixelRenderer.drawCharacterSprite(g, char, base, base * 1.1, {
        facing: o.facing || 'front',
        animState: o.animState || 'idle',
        frame: o.frame ?? 45,
        flipX: !!o.flipX,
        tint: o.tint
      });
      g.setTransform(1, 0, 0, 1, 0, 0);
      const u = base / 36;
      const over = (fill) => {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = fill;
        g.fillRect(0, 0, cv.width, cv.height);
        g.globalCompositeOperation = 'source-over';
      };
      if (o.dim) over(`rgba(${o.dimTint || '0,0,0'},${o.dim})`);
      if (o.grad) {
        const gr = g.createLinearGradient(0, pad, 0, pad + 36 * u);
        o.grad.forEach(([k, c]) => gr.addColorStop(k, c));
        over(gr);
      }
      if (o.shade) {
        const [y0, y1, y2, y3, a, col = '0,0,0'] = o.shade;
        const span = y3 - y0;
        const gr = g.createLinearGradient(0, pad + y0 * u, 0, pad + y3 * u);
        gr.addColorStop(0, `rgba(${col},${y1 <= y0 ? a : 0})`);
        gr.addColorStop(clamp((y1 - y0) / span), `rgba(${col},${a})`);
        gr.addColorStop(clamp((y2 - y0) / span), `rgba(${col},${a})`);
        gr.addColorStop(1, `rgba(${col},0)`);
        over(gr);
      }
      if (o.rim) {
        const sil = this.fx2Entry(char, base, { facing: o.facing, animState: o.animState, frame: o.frame, flipX: o.flipX, tint: o.rim });
        // boneco sem tinta tem contorno escuro em volta: a borda precisa sair mais para aparecer
        const d = o.rimD || Math.max(1, Math.round(base / (o.tint ? 75 : 40)));
        g.globalCompositeOperation = 'destination-over';
        (o.rimSides || [-1, 1]).forEach((s) => g.drawImage(sil.cv, s === 0 ? 0 : s * d, s === 0 ? -d : -Math.round(d * 0.35)));
        g.globalCompositeOperation = 'source-over';
      }
      e = { cv, pad, base };
      if (cache.size > 110) cache.delete(cache.keys().next().value);
      cache.set(key, e);
      return e;
    },
    // Pés em (x, feet). Base 180 para bonecos grandes; menores usam base múltipla de 36
    fx2Spr(ctx, char, x, feet, size, o = {}, base = 0) {
      base = base || (size >= 180 ? 180 : Math.max(36, 36 * Math.ceil(size / 36)));
      const e = this.fx2Entry(char, base, o);
      const k = size / base;
      ctx.save();
      ctx.imageSmoothingEnabled = size < base;
      ctx.drawImage(e.cv, x - size / 2 - e.pad * k, feet - size * 0.87 - e.pad * k, e.cv.width * k, e.cv.height * k);
      ctx.restore();
    },
    // Close: o centro dos olhos do boneco fica em eyeY. Devolve { u, top, feet }
    fx2Head(ctx, char, cx, eyeY, size, o = {}) {
      const u = size / 36;
      const top = eyeY - 10.25 * u;
      const feet = top + size * 0.87;
      this.fx2Spr(ctx, char, cx, feet, size, o);
      return { u, top, feet };
    },
    // Recorte ampliado de um pedaço do boneco (unidades 0..36) — closes extremos
    fx2Crop(ctx, char, o, ux, uy, uw, uh, dx, dy, dw, dh) {
      const e = this.fx2Entry(char, 180, o || {});
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(e.cv, e.pad + ux * 5, e.pad + uy * 5, uw * 5, uh * 5, dx, dy, dw, dh);
      ctx.restore();
    },

    // Fundo parado guardado pronto
    fx2Bg(key, w, h, fn) {
      const cache = this._fx2Bg || (this._fx2Bg = new Map());
      const k = `${key}|${w}x${h}`;
      let cv = cache.get(k);
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        fn.call(this, cv.getContext('2d'), w, h);
        cache.set(k, cv);
      }
      return cv;
    },

    // Granulado barato: 3 texturas prontas, ampliadas
    fx2Grain(ctx, W, H, alpha = 0.06) {
      if (!this._fx2Noise) this._fx2Noise = [];
      if (this._fx2Noise.length < 3) {
        const cv = document.createElement('canvas');
        cv.width = 360;
        cv.height = 210;
        const g = cv.getContext('2d');
        const img = g.createImageData(360, 210);
        let seed = 7 + this._fx2Noise.length * 7919;
        for (let i = 0; i < img.data.length; i += 4) {
          seed = (seed * 16807) % 2147483647;
          const v = seed & 1 ? 255 : 0;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = (seed >> 3) % 150;
        }
        g.putImageData(img, 0, 0);
        this._fx2Noise.push(cv);
      }
      const f = this.sakugaFrame;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this._fx2Noise[f % this._fx2Noise.length], (f * 37) % 40, (f * 23) % 30, 320, 180, 0, 0, W, H);
      ctx.restore();
    },

    // ---------------------------------------------------------------- tipografia
    // Texto de impacto com alpha multiplicado (k = entrada 0..1)
    fx2Word(ctx, text, x, y, size, color, k = 1, alpha = 1, rot = 0, maxW = 0, align = 'center') {
      if (k <= 0 || alpha <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      const sc = 1.5 - ease(k) * 0.5;
      ctx.scale(sc, sc);
      ctx.globalAlpha *= Math.min(1, k * 2.5) * alpha;
      let fs = size;
      ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      while (maxW && fs > 16 && ctx.measureText(text).width > maxW) {
        fs -= 2;
        ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      }
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#020617';
      ctx.fillText(text, fs * 0.05, fs * 0.07);
      ctx.lineWidth = Math.max(4, fs / 9);
      ctx.strokeStyle = '#020617';
      ctx.strokeText(text, 0, 0);
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    },
    fx2Text(ctx, text, x, y, font, color, alpha = 1, align = 'center', spacing = false) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.font = font;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(spacing ? text.split('').join(' ') : text, x, y);
      ctx.restore();
    },
    // Letreiro pequeno (lugar / hora): barrinha colorida + texto espaçado que se escreve
    fx2Kicker(ctx, x, y, text, k, color = '#00f5d4', align = 'left') {
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, k * 3);
      ctx.font = '900 15px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      const shown = this.cineType(text, k * 1.4).split('').join(' ');
      const full = text.split('').join(' ');
      const w = ctx.measureText(full).width;
      const x0 = align === 'left' ? x : align === 'right' ? x - w - 16 : x - (w + 16) / 2;
      ctx.fillStyle = 'rgba(2,6,23,0.7)';
      ctx.fillRect(x0 - 8, y - 15, (w + 32) * ease(k), 30);
      ctx.fillStyle = color;
      ctx.fillRect(x0 - 8, y - 15, 4, 30);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(shown, x0 + 8, y + 1);
      ctx.restore();
    },

    // ---------------------------------------------------------------- efeitos
    // Linhas radiais prontas num canvas (fundo de impacto / painel)
    fx2Rays(ctx, cx, cy, r1, n, color, alpha = 0.3, rot = 0, width = 0.04) {
      const cache = this._fx2RayCv || (this._fx2RayCv = new Map());
      const key = `${color}|${n}|${width}`;
      let cv = cache.get(key);
      if (!cv) {
        cv = document.createElement('canvas');
        cv.width = 512;
        cv.height = 512;
        const g = cv.getContext('2d');
        g.fillStyle = color;
        g.beginPath();
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + hash(i, 9) * 0.05;
          const w = width * (0.5 + hash(i, 4));
          g.moveTo(256 + Math.cos(a) * 20, 256 + Math.sin(a) * 20);
          g.lineTo(256 + Math.cos(a - w) * 400, 256 + Math.sin(a - w) * 400);
          g.lineTo(256 + Math.cos(a + w) * 400, 256 + Math.sin(a + w) * 400);
          g.closePath();
        }
        g.fill();
        cache.set(key, cv);
      }
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.drawImage(cv, -r1, -r1, r1 * 2, r1 * 2);
      ctx.restore();
    },
    // Painel de mangá (refaz o caminho do painel antes do contorno)
    fx2Panel(ctx, pts, draw, opts = {}) {
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
    // Estrelinha (flash de celular/fotógrafo): pequena, sem piscar a tela
    fx2Sparkle(ctx, x, y, r, a) {
      if (a <= 0) return;
      this.cineGlow(ctx, x, y, r * 2.2, 'rgba(255,255,255,0.7)', a * 0.7);
      ctx.save();
      ctx.globalAlpha *= Math.min(1, a);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y);
      ctx.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r);
      ctx.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y);
      ctx.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r);
      ctx.fill();
      ctx.restore();
    },
    // Flashes espalhados numa área (cada um dura ~8 quadros, posições fixas por janela de tempo)
    fx2Flashes(ctx, x0, x1, y0, y1, t, n = 6, r = 7, seed = 1) {
      for (let i = 0; i < n; i++) {
        const per = 22 + Math.floor(hash(i, seed) * 30);
        const local = t + hash(i, seed + 1) * per;
        const cyc = Math.floor(local / per);
        const age = local % per;
        if (age > 8) continue;
        const x = x0 + hash(i * 13 + cyc, seed + 2) * (x1 - x0);
        const y = y0 + hash(i * 7 + cyc, seed + 3) * (y1 - y0);
        this.fx2Sparkle(ctx, x, y, r * (0.7 + hash(i, seed + 4) * 0.6), 1 - age / 8);
      }
    },
    // O giro do dedo (arcos em volta da ponta do dedo)
    fx2Twirl(ctx, x, y, r, t, color = '#fde68a') {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      for (let i = 0; i < 3; i++) {
        const a0 = -t * 0.24 + i * 2.1;
        ctx.globalAlpha *= 1;
        ctx.globalAlpha = 0.95 - i * 0.25;
        ctx.lineWidth = Math.max(1.5, r * 0.16 - i * r * 0.03);
        ctx.beginPath();
        ctx.ellipse(x, y, r * (1 + i * 0.45), r * (1 + i * 0.45) * 0.42, 0, a0, a0 + 1.7);
        ctx.stroke();
      }
      ctx.restore();
    },
    // A mão do Fox com o indicador para cima (ponta do dedo em x, y). px = tamanho do pixel
    fx2Finger(ctx, x, y, px, skin = '#d6a77a', sleeve = true) {
      const r = (cx, cy, w, h, c) => {
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(x + cx * px), Math.round(y + cy * px), Math.ceil(w * px), Math.ceil(h * px));
      };
      // contorno
      r(-1.5, -0.5, 3, 7, '#0c0a09');
      r(-4, 5, 8, 6.5, '#0c0a09');
      // dedo e punho
      r(-1, 0, 2, 6.5, skin);
      r(-3.5, 5.5, 7, 5.5, skin);
      r(-3.5, 7.5, 6, 0.5, 'rgba(0,0,0,0.22)');
      r(-3.5, 9, 6, 0.5, 'rgba(0,0,0,0.22)');
      r(-1, 0, 0.6, 6, 'rgba(255,255,255,0.22)');
      r(2.6, 6, 0.9, 4.5, 'rgba(0,0,0,0.18)');
      if (sleeve) {
        r(-4, 11, 8, 1.2, '#f5f5f4');
        r(-4.5, 12.2, 9, 9, '#0b0f1a');
        r(-4.5, 12.2, 1, 9, '#0c0a09');
      }
    },
    // O indicador saindo da mão direita do próprio boneco (mão em x 25.2..27.8, y 20.2 un.)
    // e o giro em volta da ponta. Devolve a ponta { x, y }
    fx2SpriteFinger(ctx, x, feet, size, t, skin = '#d6a77a', lift = 0) {
      const u = size / 36;
      const top = feet - size * 0.87;
      const fx = x + (25.5 - 18) * u;
      const fy = top + (20.4 - lift) * u;
      const len = 2.8 * u;
      ctx.fillStyle = '#0c0a09';
      ctx.fillRect(Math.round(fx - 0.15 * u), Math.round(fy - len - 0.15 * u), Math.ceil(1.2 * u), Math.ceil(len + 0.3 * u));
      ctx.fillStyle = skin;
      ctx.fillRect(Math.round(fx), Math.round(fy - len), Math.ceil(0.9 * u), Math.ceil(len));
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(Math.round(fx), Math.round(fy - len), Math.ceil(0.3 * u), Math.ceil(len));
      const tip = { x: fx + 0.45 * u, y: fy - len - 0.6 * u };
      this.fx2Twirl(ctx, tip.x, tip.y, 1.5 * u, t);
      return tip;
    },
    // Antebraço do terno levantado (do cotovelo até o punho), com a mão e o dedo em cima
    fx2RaisedHand(ctx, x, elbowY, tipY, px, skin) {
      const handTop = tipY;
      const cuffY = handTop + 11 * px;
      ctx.fillStyle = '#0c0a09';
      ctx.fillRect(Math.round(x - 5 * px), Math.round(cuffY), Math.ceil(10 * px), Math.ceil(elbowY - cuffY + px));
      ctx.fillStyle = '#0b0f1a';
      ctx.fillRect(Math.round(x - 4.2 * px), Math.round(cuffY + px), Math.ceil(8.4 * px), Math.ceil(elbowY - cuffY - px));
      ctx.fillStyle = 'rgba(148,163,184,0.18)';
      ctx.fillRect(Math.round(x - 4.2 * px), Math.round(cuffY + px), Math.ceil(1.2 * px), Math.ceil(elbowY - cuffY - px));
      this.fx2Finger(ctx, x, handTop, px, skin, false);
      ctx.fillStyle = '#f5f5f4';
      ctx.fillRect(Math.round(x - 4 * px), Math.round(cuffY), Math.ceil(8 * px), Math.ceil(1.2 * px));
    },

    // Olho do Fox em pixel: íris em anéis e pálpebra pesada (lid = cor da pálpebra)
    fx2FoxEye(ctx, cx, cy, px, o = {}) {
      this.drawPixelEye(ctx, cx, cy, px, { line: '#0c0a09', white: o.white || '#f5f5f4', iris: o.iris || '#1c1917', ring: o.ring || '#f5f5f4', look: o.look || 0, blink: o.blink });
      if (o.blink) return;
      const x0 = Math.round(cx - 6 * px);
      const y0 = Math.round(cy - 3.5 * px);
      const s = Math.ceil(px);
      const cell = (c, r) => ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + r * px), s, s);
      ctx.fillStyle = o.lid || '#0c0a09';
      for (let c = 1; c < 11; c++) {
        cell(c, 0);
        cell(c, 1);
      }
      ctx.fillStyle = '#0c0a09';
      for (let c = 0; c < 12; c++) cell(c, 2);
      // canto de fora puxado para cima (olhar de raposa)
      cell(o.side > 0 ? 0 : 11, 1);
      if (!o.noGlint) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        cell(4 + (o.look || 0), 3);
      }
    },
    // Os dois olhos do Fox no lugar dos olhos do boneco (cx = centro do rosto, u = unidade)
    fx2FoxEyes(ctx, cx, eyeY, u, open = 1, o = {}) {
      if (open <= 0) return;
      [-1, 1].forEach((s) => {
        if (o.glow) this.cineGlow(ctx, cx + s * 3.45 * u, eyeY, u * 4.5, o.glow, open);
        this.fx2FoxEye(ctx, cx + s * 3.45 * u, eyeY, u * 0.27, Object.assign({}, o, { side: s, look: o.look ?? (s > 0 ? -1 : 1), blink: open < 0.55 }));
      });
    },
    // Pálpebra brava (canto de dentro desce) para os olhos dos 4 egos
    fx2Angry(ctx, cx, cy, px, side, color = '#020617') {
      const x0 = Math.round(cx - 6 * px);
      const y0 = Math.round(cy - 3.5 * px);
      const s = Math.ceil(px);
      ctx.fillStyle = color;
      for (let c = 1; c < 11; c++) {
        const inner = side > 0 ? c : 11 - c;
        if (inner >= 5) ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + 2 * px), s, s);
        if (inner >= 8) ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + 3 * px), s, s);
      }
    },

    // O sorriso em lua crescente (pixel art), pronto num canvas pequeno
    fx2GrinCv() {
      if (this._fx2GrinCv) return this._fx2GrinCv;
      const Wc = 46;
      const Hc = 17;
      const P = 2;
      const grid = [];
      for (let r = 0; r < Hc; r++) grid.push(new Array(Wc).fill(0));
      const yU = [];
      const yL = [];
      for (let c = 0; c < Wc; c++) {
        const n = (c + 0.5 - Wc / 2) / (Wc / 2);
        const q = 1 - n * n;
        yU[c] = 0.6 + 3.6 * q;
        yL[c] = 1.4 + 13.6 * Math.pow(q, 0.72);
        for (let r = 0; r < Hc; r++) if (r + 0.5 > yU[c] && r + 0.5 < yL[c]) grid[r][c] = 1;
      }
      const cv = document.createElement('canvas');
      cv.width = Wc + P * 2;
      cv.height = Hc + P * 2;
      const g = cv.getContext('2d');
      const at = (r, c) => (r >= 0 && r < Hc && c >= 0 && c < Wc ? grid[r][c] : 0);
      // contorno: preto por fora, vermelho escuro (gengiva) colado nos dentes
      for (let r = -P; r < Hc + P; r++) {
        for (let c = -P; c < Wc + P; c++) {
          if (at(r, c)) continue;
          let near1 = false;
          let near2 = false;
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              if (!at(r + dr, c + dc)) continue;
              const d = Math.max(Math.abs(dr), Math.abs(dc));
              if (d === 1 && Math.abs(dr) + Math.abs(dc) === 1) near1 = true;
              else near2 = true;
            }
          }
          if (near1) {
            g.fillStyle = '#7f1d1d';
            g.fillRect(c + P, r + P, 1, 1);
          } else if (near2) {
            g.fillStyle = '#050102';
            g.fillRect(c + P, r + P, 1, 1);
          }
        }
      }
      for (let c = 0; c < Wc; c++) {
        const mid = yU[c] + (yL[c] - yU[c]) * 0.42;
        for (let r = 0; r < Hc; r++) {
          if (!grid[r][c]) continue;
          let col = '#f5f5f4';
          if (Math.abs(r + 0.5 - mid) < 0.5) col = '#1c0606';
          else if (c % 3 === 0) col = '#3f0d0d';
          else if (r + 0.5 > yL[c] - 1.2 || (r + 0.5 < mid && r + 1.5 > mid)) col = '#cbd5e1';
          else if (c % 3 === 2) col = '#e2e8f0';
          g.fillStyle = col;
          g.fillRect(c + P, r + P, 1, 1);
        }
      }
      this._fx2GrinCv = cv;
      return cv;
    },
    // Desenha o sorriso centrado em (cx, cy) com largura w; open 0..1 abre do meio para os lados
    fx2Grin(ctx, cx, cy, w, open = 1) {
      if (open <= 0) return;
      const cv = this.fx2GrinCv();
      const h = (w * cv.height) / cv.width;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - (w / 2) * open, cy - h, w * open, h * 2);
      ctx.clip();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, Math.round(cx - w / 2), Math.round(cy - h * 0.3), Math.round(w), Math.round(h));
      ctx.restore();
    },

    // Bola pequena (vista de longe)
    fx2Ball(ctx, x, y, r) {
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(x, y, r + 1.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      if (r > 3) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(Math.round(x - r * 0.3), Math.round(y - r * 0.3), Math.ceil(r * 0.6), Math.ceil(r * 0.6));
        ctx.fillRect(Math.round(x + r * 0.45), Math.round(y + r * 0.15), Math.ceil(r * 0.35), Math.ceil(r * 0.4));
        ctx.fillRect(Math.round(x - r * 0.85), Math.round(y + r * 0.2), Math.ceil(r * 0.35), Math.ceil(r * 0.4));
      }
    },

    // Bandeiras prontas (jp, fr, en) tremulando em fatias
    fx2FlagCv(code) {
      const cache = this._fx2Flags || (this._fx2Flags = {});
      if (cache[code]) return cache[code];
      const cv = document.createElement('canvas');
      cv.width = 120;
      cv.height = 80;
      const g = cv.getContext('2d');
      if (code === 'jp') {
        g.fillStyle = '#f8fafc';
        g.fillRect(0, 0, 120, 80);
        g.fillStyle = '#dc2626';
        g.beginPath();
        g.arc(60, 40, 24, 0, TAU);
        g.fill();
      } else if (code === 'fr') {
        ['#1d4ed8', '#f8fafc', '#dc2626'].forEach((c, i) => {
          g.fillStyle = c;
          g.fillRect(i * 40, 0, 40, 80);
        });
      } else {
        g.fillStyle = '#f8fafc';
        g.fillRect(0, 0, 120, 80);
        g.fillStyle = '#dc2626';
        g.fillRect(50, 0, 20, 80);
        g.fillRect(0, 30, 120, 20);
      }
      cache[code] = cv;
      return cv;
    },
    fx2Flag(ctx, code, x, y, w, h, t, amp = 0.07, dim = 0) {
      const cv = this.fx2FlagCv(code);
      const n = 12;
      const sw = w / n;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < n; i++) {
        const ph = i / n;
        const wv = Math.sin(t * 0.11 - ph * 5);
        const off = wv * h * amp * (0.3 + ph);
        ctx.drawImage(cv, ph * 120, 0, 120 / n + 0.5, 80, x + i * sw, y + off, sw + 1, h);
        ctx.fillStyle = wv > 0 ? `rgba(255,255,255,${wv * 0.1})` : `rgba(0,0,0,${-wv * 0.22 + dim})`;
        ctx.fillRect(x + i * sw, y + off, sw + 1, h);
      }
      ctx.restore();
    },

    // ======================================================================
    // 1) A ENTRADA DO FOX
    // ======================================================================
    // O campo do Blue Lock de madrugada (fundo parado): céu, prédios, torres, arquibancada,
    // gramado e o gol lá no fundo
    fx2BgBlueLockNight(g, w, h) {
      this.cineGradient(g, 0, 0, w, 330, [[0, '#01030b'], [1, '#0c1a3d']]);
      for (let i = 0; i < 140; i++) {
        g.fillStyle = `rgba(226,232,240,${0.2 + hash(i, 1) * 0.55})`;
        const s = hash(i, 5) < 0.85 ? 1.5 : 2.5;
        g.fillRect(hash(i, 2) * w, hash(i, 3) * 210, s, s);
      }
      // Os prédios do Blue Lock atrás da arquibancada (a torre no meio)
      const blocks = [[0, 150, 230], [210, 190, 150], [960, 160, 200], [1150, 200, 130]];
      blocks.forEach(([x, y, bw], b) => {
        g.fillStyle = '#060c1e';
        g.fillRect(x, y, bw, 260 - y);
        for (let wy = y + 12; wy < 236; wy += 14) {
          for (let wx = x + 10; wx < x + bw - 10; wx += 16) {
            if (hash(wx * 0.37 + wy, b + 2) < 0.18) {
              g.fillStyle = 'rgba(56,189,248,0.35)';
              g.fillRect(wx, wy, 6, 4);
            }
          }
        }
      });
      g.fillStyle = '#081129';
      g.fillRect(560, 46, 160, 214);
      g.fillRect(600, 20, 80, 30);
      g.fillStyle = '#0b1838';
      g.fillRect(636, 0, 8, 22);
      g.fillStyle = 'rgba(0,245,212,0.45)';
      for (let wy = 64; wy < 240; wy += 18) g.fillRect(572, wy, 136, 2);
      g.fillStyle = 'rgba(0,245,212,0.75)';
      g.font = '900 13px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.fillText('BLUE LOCK', 640, 40);
      // Mastros dos refletores (as cabeças com as lâmpadas são desenhadas por quadro)
      TOWERS.forEach((x) => {
        g.fillStyle = '#050a18';
        g.fillRect(x - 4, 62, 8, 200);
        for (let y = 80; y < 250; y += 22) {
          g.fillStyle = '#0b142b';
          g.fillRect(x - 10, y, 20, 2);
        }
        g.fillStyle = '#0a1226';
        g.fillRect(x - 46, 30, 92, 38);
        g.fillStyle = '#02040b';
        g.fillRect(x - 42, 34, 84, 30);
      });
      // A arquibancada vazia
      g.fillStyle = '#050a18';
      g.fillRect(0, 238, w, 12);
      for (let r = 0; r < 8; r++) {
        const y = 250 + r * 11;
        g.fillStyle = r % 2 ? '#0c1834' : '#0a142d';
        g.fillRect(0, y, w, 11);
        g.fillStyle = r % 2 ? '#132650' : '#112247';
        for (let x = (r % 2) * 6; x < w; x += 12) g.fillRect(x, y + 2, 7, 6);
      }
      g.fillStyle = '#03060e';
      g.fillRect(0, 338, w, 16);
      g.font = '900 10px "Segoe UI", sans-serif';
      g.fillStyle = 'rgba(0,245,212,0.45)';
      g.textAlign = 'left';
      for (let x = 0; x < w; x += 180) g.fillText('BLUE LOCK • PROJETO', x + 14, 349);
      // O gramado em perspectiva
      for (let i = 0; i < 12; i++) {
        const y0 = 354 + (h - 354) * Math.pow(i / 12, 1.5);
        const y1 = 354 + (h - 354) * Math.pow((i + 1) / 12, 1.5);
        g.fillStyle = i % 2 ? '#0b3222' : '#0d3a27';
        g.fillRect(0, y0, w, y1 - y0 + 1);
      }
      g.strokeStyle = 'rgba(226,232,240,0.5)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 364);
      g.lineTo(w, 364);
      // grande área em perspectiva em volta do gol
      g.moveTo(520, 364);
      g.lineTo(470, 452);
      g.lineTo(1010, 452);
      g.lineTo(960, 364);
      g.moveTo(640, 364);
      g.lineTo(628, 392);
      g.lineTo(852, 392);
      g.lineTo(840, 364);
      g.stroke();
      g.beginPath();
      g.ellipse(740, 452, 90, 22, 0, 0, Math.PI);
      g.stroke();
      // O gol lá no fundo (a rede é desenhada por quadro)
      g.fillStyle = '#e2e8f0';
      g.fillRect(668, 318, 6, 48);
      g.fillRect(806, 318, 6, 48);
      g.fillRect(668, 316, 144, 6);
      const sheen = g.createLinearGradient(0, 354, 0, h);
      sheen.addColorStop(0, 'rgba(147,197,253,0.08)');
      sheen.addColorStop(1, 'rgba(2,6,23,0.4)');
      g.fillStyle = sheen;
      g.fillRect(0, 354, w, h - 354);
    },
    // Cabeça do refletor: lit 1 = aceso, 0..1 depois de apagar = filamento esfriando
    fx2Lamp(ctx, x, lit, cool) {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 7; c++) {
          let col = '#111a2e';
          if (lit) col = '#f8fafc';
          else if (cool > 0) col = `rgba(251,146,60,${cool * 0.9})`;
          ctx.fillStyle = col;
          ctx.fillRect(x - 38 + c * 11.5, 37 + r * 9.5, 8, 6);
        }
      }
    },
    // A rede do gol (estufa quando a bola entra)
    fx2Net(ctx, bulge, balls) {
      ctx.save();
      ctx.strokeStyle = 'rgba(226,232,240,0.38)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const bx = 742;
      const by = 340;
      for (let i = 0; i <= 12; i++) {
        const x = 674 + i * 11;
        const d = Math.exp(-Math.pow((x - bx) / 26, 2)) * bulge;
        ctx.moveTo(x, 322);
        ctx.quadraticCurveTo(x + d * 4, by - 6 - d * 10, x, 366);
      }
      for (let j = 0; j <= 4; j++) {
        const y = 322 + j * 11;
        ctx.moveTo(674, y);
        const d = Math.exp(-Math.pow((y - by) / 18, 2)) * bulge;
        ctx.quadraticCurveTo(bx, y - d * 12, 806, y);
      }
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < balls; i++) this.fx2Ball(ctx, 690 + i * 19 + (i % 2) * 4, 361 - (i % 2) * 3, 4);
    },

    // Plano 1: o campo vazio de madrugada, você chutando sozinho (de costas, lá embaixo)
    fx2Ent0(ctx, S) {
      const { W, H, t, top } = S;
      const you = this.cineYou(this.KITS.blueLock);
      const k = easeIO(t / 180);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, 660, k), y: lerp(360, 410, k), zoom: lerp(1, 1.22, k), shake: 0.6 });
      ctx.drawImage(this.fx2Bg('fx2_blnight', W, H, this.fx2BgBlueLockNight), 0, 0);
      TOWERS.forEach((x, i) => {
        this.fx2Lamp(ctx, x, true, 0);
        this.cineGlow(ctx, x, 50, 170, 'rgba(219,234,254,0.85)');
        this.cineShafts(ctx, x, 62, Math.atan2(420, 700 - x), 640, 0.32, 3, '191,219,254', 0.06, t + i * 40);
      });
      // poças de luz no gramado
      ctx.save();
      ctx.scale(1, 0.3);
      [[340, 520], [740, 470], [1060, 540]].forEach(([x, y]) => this.cineGlow(ctx, x, y / 0.3, 260, 'rgba(191,219,254,0.22)'));
      ctx.restore();
      // Os chutes: preparo, chute, a bola voando até a rede
      const kicks = [40, 126];
      let anim = 'idle';
      let fr = 45;
      let flight = null;
      let inNet = 3;
      let bulge = 0;
      kicks.forEach((kt) => {
        if (t >= kt - 14 && t < kt) {
          anim = 'windup';
          fr = 46;
        } else if (t >= kt && t < kt + 16) {
          anim = 'shoot';
          fr = 47;
        }
        if (t >= kt && t < kt + 24) flight = (t - kt) / 24;
        if (t >= kt + 24) {
          inNet++;
          bulge = Math.max(bulge, pulse(t, kt + 24, 16) * 1.4);
        }
        this.cineSfx(S, kt, 'kick' + kt, () => window.SFX?.kick?.(0.75));
      });
      this.fx2Net(ctx, bulge, inNet);
      const fx = 560;
      const feet = 600;
      // bolas espalhadas (de novo e de novo)
      [[470, 606], [506, 616], [640, 612]].forEach(([bx, by]) => this.fx2Ball(ctx, bx, by, 7));
      ctx.save();
      ctx.scale(1, 0.25);
      this.cineGlow(ctx, fx, (feet + 4) / 0.25, 90, 'rgba(0,0,0,0.6)');
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(fx, feet + 2, 46, 9, 0, 0, TAU);
      ctx.fill();
      this.fx2Spr(ctx, you, fx, feet, 210, O.youKick(anim, fr));
      if (flight !== null) {
        const e = ease(flight);
        const bx = lerp(fx + 24, 742, e);
        const by = lerp(feet - 8, 342, e) - Math.sin(flight * Math.PI) * 60;
        this.fx2Ball(ctx, bx, by, lerp(8, 4, e));
      } else if (!kicks.some((kt) => t >= kt + 24 && t < kt + 70)) {
        this.fx2Ball(ctx, fx + 22, feet - 4, 8);
      }
      this.cineDust(ctx, W, H * 0.8, t, 24, 'rgba(219,234,254,0.5)', 7);
      ctx.restore();
      this.fx2Kicker(ctx, 40, top + 36, 'UMA SEMANA DEPOIS DO TÍTULO', seg(t, 6, 50), '#facc15');
      this.fx2Kicker(ctx, 40, top + 74, 'BLUE LOCK • 03:12 DA MADRUGADA', seg(t, 34, 84), '#38bdf8');
    },

    // Plano 2: por trás de você, as torres apagando uma por uma — CLACK
    fx2Ent1(ctx, S) {
      const { W, H, t, top } = S;
      const you = this.cineYou(this.KITS.blueLock);
      const offAt = [24, 50, 76, 102];
      const offN = offAt.filter((a) => t >= a).length;
      const punch = offAt.reduce((s, a) => s + pulse(t, a, 14), 0);
      const k = easeIO(t / 170);
      const cam = { x: lerp(620, 660, k), y: lerp(215, 200, k), zoom: lerp(1.22, 1.3, k) + punch * 0.02, shake: punch * 3 };
      ctx.save();
      this.cineCamera(ctx, W, H, cam);
      ctx.drawImage(this.fx2Bg('fx2_blnight', W, H, this.fx2BgBlueLockNight), 0, 0);
      this.fx2Net(ctx, 0, 5);
      // escurece o mundo conforme as luzes apagam
      ctx.fillStyle = `rgba(0,1,6,${Math.min(0.82, offN * 0.19 + seg(t, 102, 130) * 0.06)})`;
      ctx.fillRect(-200, -200, W + 400, H + 400);
      TOWERS.forEach((x, i) => {
        const on = t < offAt[i];
        const cool = on ? 0 : 1 - seg(t, offAt[i], offAt[i] + 30);
        this.fx2Lamp(ctx, x, on, cool);
        if (on) {
          this.cineGlow(ctx, x, 50, 190, 'rgba(219,234,254,0.9)');
          this.cineShafts(ctx, x, 62, Math.atan2(420, 640 - x), 640, 0.3, 3, '191,219,254', 0.07, t + i * 40);
        } else if (cool > 0) {
          this.cineGlow(ctx, x, 50, 70, 'rgba(251,146,60,0.6)', cool);
        }
      });
      ctx.restore();
      // CLACK em cada torre (em tela)
      TOWERS.forEach((x, i) => {
        const a = t - offAt[i];
        if (a < 0 || a > 30) return;
        const sx = Math.max(110, Math.min(W - 110, (x - cam.x) * cam.zoom + W / 2));
        const sy = (110 - cam.y) * cam.zoom + H / 2;
        this.fx2Word(ctx, 'CLACK', sx, sy + 30, 30, '#e2e8f0', seg(a, 0, 6), 1 - seg(a, 20, 30), (i % 2 ? 0.08 : -0.08));
        this.cineSfx(S, offAt[i], 'clack' + i, () => window.SFX?.tackle?.());
      });
      // Você de costas, contra a luz: a borda acesa vai apagando junto com as torres
      const lit = 1 - offN / 4;
      const fx = 360;
      const feet = S.bot + 110;
      const size = 400;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1 + k * 0.03, shake: punch * 4 });
      const d = 8;
      if (lit > 0) {
        ctx.globalAlpha = lit;
        this.fx2Spr(ctx, you, fx - d, feet - 3, size, O.youBackRim);
        this.fx2Spr(ctx, you, fx + d, feet - 3, size, O.youBackRim);
        this.fx2Spr(ctx, you, fx, feet - d, size, O.youBackRim);
        ctx.globalAlpha = 1;
      }
      const moon = seg(t, 104, 130);
      if (moon > 0) {
        ctx.globalAlpha = moon * 0.8;
        this.fx2Spr(ctx, you, fx + 6, feet - 4, size, O.youBackMoon);
        ctx.globalAlpha = 1;
      }
      // contra a luz: dá para ver a camisa 11, mas quase preta
      this.fx2Spr(ctx, you, fx, feet, size, O.youBackDim);
      if (lit < 1) {
        ctx.globalAlpha = 1 - lit;
        this.fx2Spr(ctx, you, fx, feet, size, O.youBackBlack);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      // A faixa dos seus olhos: alguém está ali
      const e1 = ease(seg(t, 116, 132));
      if (e1 > 0) {
        const y0 = top + 26;
        const y1 = top + 170;
        this.fx2Panel(
          ctx,
          [[W * 0.4, y0], [W - 26, y0], [W - 26, y1], [W * 0.4 - 30, y1]],
          () => {
            ctx.fillStyle = '#01030a';
            ctx.fillRect(0, y0 - 10, W, y1 - y0 + 20);
            const dw = 620;
            const U = dw / 14;
            const cx = W * 0.71;
            const cy = (y0 + y1) / 2;
            this.fx2Crop(ctx, you, {}, 11, 7, 14, 6, cx - dw / 2, cy - 3.25 * U, dw, 6 * U);
            [14.55, 21.45].forEach((ux) => {
              this.drawPixelEye(ctx, cx - dw / 2 + (ux - 11) * U, cy, U * 0.28, { line: '#020617', iris: this.fx2Shade(you.eyeColor || '#0f766e', -0.5), ring: you.eyeColor || '#5eead4', tiny: true, look: Math.round(Math.sin(t * 0.3)) });
            });
            ctx.fillStyle = 'rgba(8,16,44,0.5)';
            ctx.fillRect(0, y0 - 10, W, y1 - y0 + 20);
          },
          { dx: (1 - e1) * W * 0.7, width: 5 }
        );
      }
    },

    // Plano 3: no escuro, só os olhos e o sorriso... rindo cada vez mais alto
    fx2Ent2(ctx, S) {
      const { W, H, t } = S;
      const fox = this.fx2Fox();
      const laughs = [
        { at: 52, text: 'hehe...', x: 0.16, y: 0.26, s: 26, r: -0.1 },
        { at: 92, text: 'Hehehe...', x: 0.84, y: 0.32, s: 34, r: 0.08 },
        { at: 130, text: 'HEHEHEHE!!', x: 0.2, y: 0.74, s: 46, r: -0.06 },
        { at: 160, text: 'HEHEHEHEHE!!!', x: 0.76, y: 0.8, s: 52, r: 0.06 }
      ];
      const shake = laughs.reduce((s, l) => s + pulse(t, l.at, 22), 0);
      ctx.fillStyle = '#010103';
      ctx.fillRect(0, 0, W, H);
      const k = easeIO(t / 190);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 330, zoom: lerp(0.94, 1.16, k), shake: 0.6 + shake * 2 + seg(t, 150, 190) * 1.5 });
      this.cineGlow(ctx, 640, 300, 560, 'rgba(127,29,29,0.5)', 0.25 + seg(t, 40, 190) * 0.6);
      const size = 820;
      const u = size / 36;
      const eyeY = 300;
      const bob = Math.sin(t * 0.5) * shake * 3;
      const top0 = eyeY - 10.25 * u + bob;
      const feet = top0 + size * 0.87;
      // Só o contorno do cabelo e dos ombros aparece (luz vermelha bem fraca)
      ctx.globalAlpha = 0.35 + seg(t, 0, 40) * 0.65;
      this.fx2Spr(ctx, fox, 640, feet, size, O.foxDark);
      ctx.globalAlpha = 1;
      // os olhos com anéis abrem
      const open = seg(t, 30, 40);
      this.fx2FoxEyes(ctx, 640, eyeY + bob, u, open, { glow: 'rgba(254,226,226,0.22)' });
      // o sorriso abre do meio para os lados
      this.fx2Grin(ctx, 640, top0 + SPRITE_MAPY(13.2) * u, 9 * u, ease(seg(t, 62, 100)));
      ctx.restore();
      laughs.forEach((l) => {
        const a = seg(t, l.at, l.at + 10);
        this.fx2Word(ctx, l.text, W * l.x, H * l.y, l.s, '#ef4444', a, 1, l.r);
      });
    },

    // As cadeiras da arquibancada no escuro (fundo parado do plano do holofote)
    fx2BgStands(g, w, h) {
      g.fillStyle = '#020409';
      g.fillRect(0, 0, w, h);
      let y = 700;
      for (let r = 0; r < 14; r++) {
        const rh = 66 * Math.pow(0.88, r);
        const y0 = y - rh;
        g.fillStyle = '#070b16';
        g.fillRect(0, y0, w, rh);
        g.fillStyle = '#0c1220';
        g.fillRect(0, y0, w, rh * 0.3);
        const sw = 34 * Math.pow(0.9, r);
        const step = 50 * Math.pow(0.9, r);
        for (let x = (r % 2) * step * 0.5; x < w; x += step) {
          if (Math.abs(x - 830) < 80 && r < 9) continue; // a escada do corredor
          g.fillStyle = '#0d1424';
          g.fillRect(x, y0 - rh * 0.55, sw, rh * 0.7);
          g.fillStyle = '#18213a';
          g.fillRect(x, y0 - rh * 0.55, sw, Math.max(2, rh * 0.08));
        }
        y = y0;
      }
      // a escada do corredor
      g.fillStyle = '#0a0f1c';
      g.beginPath();
      g.moveTo(720, 700);
      g.lineTo(940, 700);
      g.lineTo(880, 240);
      g.lineTo(780, 240);
      g.closePath();
      g.fill();
      g.strokeStyle = '#151d33';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(740, 700);
      g.lineTo(790, 240);
      g.moveTo(920, 700);
      g.lineTo(870, 240);
      g.stroke();
    },

    // Plano 4: o holofote acende — o Fox de pé na arquibancada, girando o dedo
    fx2Ent3(ctx, S) {
      const { W, H, t, top } = S;
      const fox = this.fx2Fox();
      const fx = 830;
      const feet = 560;
      const size = 430;
      const u = size / 36;
      const k = easeIO(seg(t, 10, 160));
      const cam = { x: lerp(640, 790, k), y: lerp(360, 300, k), zoom: lerp(1, 1.32, k) + pulse(t, 0, 14) * 0.04, shake: pulse(t, 0, 20) * 4 };
      this.cineSfx(S, 0, 'spot', () => window.SFX?.post?.());
      ctx.save();
      this.cineCamera(ctx, W, H, cam);
      ctx.drawImage(this.fx2Bg('fx2_stands', W, H, this.fx2BgStands), 0, 0);
      // O cone do holofote
      const lx = fx + 60;
      const ly = -80;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const cone = ctx.createLinearGradient(0, ly, 0, feet + 40);
      cone.addColorStop(0, 'rgba(219,234,254,0.42)');
      cone.addColorStop(1, 'rgba(191,219,254,0.09)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(lx - 30, ly);
      ctx.lineTo(lx + 30, ly);
      ctx.lineTo(fx + 250, feet + 50);
      ctx.lineTo(fx - 250, feet + 50);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.scale(1, 0.26);
      this.cineGlow(ctx, fx, (feet + 6) / 0.26, 260, 'rgba(219,234,254,0.4)');
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(fx, feet + 2, 90, 14, 0, 0, TAU);
      ctx.fill();
      // O Fox iluminado de cima: cabelo aceso, os olhos na sombra da franja
      this.fx2Spr(ctx, fox, fx, feet, size, O.foxSpot);
      const eyeY = feet - size * 0.87 + SPRITE_MAPY(10.25) * u;
      this.fx2FoxEyes(ctx, fx, eyeY, u, seg(t, 22, 30), { lid: '#6b4a32' });
      // o dedo girando ao lado do corpo
      this.fx2SpriteFinger(ctx, fx, feet, size, t, fox.skinColor);
      this.cineDust(ctx, W, H * 0.8, t, 22, 'rgba(219,234,254,0.55)', 11);
      ctx.restore();
      this.cineFlash(ctx, W, H, 0.85 * (1 - seg(t, 0, 10)), '#e0f2fe');
      // O letreiro dele
      const kc = seg(t, 58, 90);
      this.fx2Kicker(ctx, 60, top + 120, 'TÉCNICO DA INGLATERRA SUB-20', kc, '#ef4444');
      const kf = seg(t, 72, 84);
      this.cineImpactText(ctx, 'FOX', 230, top + 230, 150, '#f5f5f4', kf);
      if (kf > 0) {
        ctx.fillStyle = FOX_COLOR;
        ctx.fillRect(70, top + 300, 330 * ease(seg(t, 80, 100)), 6);
      }
      this.fx2Text(ctx, 'O homem que vocês eliminaram.', 70, top + 336, 'italic 700 20px "Segoe UI", sans-serif', '#cbd5e1', seg(t, 100, 116), 'left');
    },

    // Plano 5: página de mangá — o olho, o dedo, o sorriso
    fx2Ent4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const fox = this.fx2Fox();
      ctx.fillStyle = '#020308';
      ctx.fillRect(0, 0, W, H);
      this.fx2Rays(ctx, W / 2, H / 2, W, 44, '#111a33', 0.7, t * 0.002);
      const yA0 = top + 16;
      const yA1 = top + 196;
      const yB = top + 214;
      const yD = bot - 16;
      // A: os olhos em close extremo
      const eA = ease(seg(t, 0, 18));
      this.fx2Panel(
        ctx,
        [[24, yA0], [W - 24, yA0], [W - 24, yA1 - 22], [24, yA1]],
        () => {
          ctx.fillStyle = '#05060d';
          ctx.fillRect(0, yA0, W, yA1 - yA0);
          const dw = 820 + t * 0.5;
          const U = dw / 16;
          const cx = W / 2;
          const cy = (yA0 + yA1) / 2 + 4;
          this.fx2Crop(ctx, fox, O.foxEyesCrop, 10, 5.5, 16, 9, cx - dw / 2, cy - 4.75 * U, dw, 9 * U);
          const look = t < 80 ? 0 : -1;
          [-1, 1].forEach((s) => {
            this.cineGlow(ctx, cx + s * 3.45 * U, cy, U * 3.2, 'rgba(219,234,254,0.18)');
            this.fx2FoxEye(ctx, cx + s * 3.45 * U, cy, U * 0.27, { side: s, look: s > 0 ? look : -look, lid: '#2a1d14' });
          });
        },
        { dx: (1 - eA) * -W, width: 5 }
      );
      // C: o sorriso (a parte de baixo do rosto)
      const eC = ease(seg(t, 26, 46));
      this.fx2Panel(
        ctx,
        [[24, yB], [800, yB], [770, yD], [24, yD]],
        () => {
          ctx.fillStyle = '#0a0406';
          ctx.fillRect(0, yB, 820, yD - yB);
          const dw = 820 + t * 0.4;
          const U = dw / 16;
          const cx = 410;
          const my = (yB + yD) / 2 - 10;
          // a parte de baixo do rosto quase toda na sombra; o sorriso se abre por cima
          this.fx2Crop(ctx, fox, O.foxMouthCrop, 10, 9, 16, 10, cx - dw / 2, my - 4 * U, dw, 10 * U);
          this.cineGradient(ctx, 0, yB, 820, (yD - yB) * 0.45, [[0, 'rgba(0,0,0,0.9)'], [1, 'rgba(0,0,0,0)']]);
          this.cineGlow(ctx, cx, my, 260, 'rgba(239,68,68,0.2)');
          this.fx2Grin(ctx, cx, my, 8.6 * U, ease(seg(t, 40, 70)));
        },
        { dy: (1 - eC) * H * 0.8, width: 5 }
      );
      // B: o dedo girando
      const eB = ease(seg(t, 54, 74));
      this.fx2Panel(
        ctx,
        [[836, yB], [W - 24, yB], [W - 24, yD], [806, yD]],
        () => {
          this.cineGradient(ctx, 790, yB, 500, yD - yB, [[0, '#120b02'], [1, '#040203']]);
          this.cineGlow(ctx, 1040, yB + 150, 230, 'rgba(245,158,11,0.22)');
          const px = 13;
          const tip = yB + 150;
          this.fx2RaisedHand(ctx, 1040, yD + 20, tip, px, fox.skinColor);
          this.fx2Twirl(ctx, 1040, tip - 8, 52, t, '#fde68a');
          this.fx2Word(ctx, 'TWIRL', 930, yB + 64, 30, '#fde68a', seg(t, 74, 84), 1, -0.12);
        },
        { dx: (1 - eB) * 520, width: 5 }
      );
      // fecha no preto para o diálogo
      ctx.fillStyle = `rgba(0,0,0,${seg(t, 150, 170)})`;
      ctx.fillRect(0, 0, W, H);
    },

    // ======================================================================
    // 2) O FOX NA ARQUIBANCADA (contra a Inglaterra) — o rosto NUNCA aparece
    // ======================================================================
    fx2CrowdChars() {
      if (!this._fx2Crowd) {
        // silhuetas de gente comum: cabelos curtos e variados (os penteados dos jogadores viravam ruído)
        const styles = ['short_sharp', 'buzz_tall', 'soft_side', 'soft_curls'];
        this._fx2Crowd = styles.map((hairStyle, i) => this.cineChar('teddy_knight', { id: 'fx2_fan_' + i, name: 'fan' + i, hairStyle, outfit: 'casual', clothesColor: '#1e293b' }));
      }
      return this._fx2Crowd;
    },
    // Fundo: o anel de cima da arquibancada inglesa, cheio de gente e bandeiras
    fx2BgEngStands(g, w, h) {
      this.cineGradient(g, 0, 0, w, h, [[0, '#02040c'], [0.45, '#0a1430'], [1, '#050814']]);
      // cobertura com a fileira de refletores
      g.fillStyle = '#03060f';
      g.fillRect(0, 0, w, 96);
      g.fillStyle = '#e0f2fe';
      for (let x = 20; x < w; x += 46) g.fillRect(x, 78, 26, 6);
      // a multidão de longe (pontinhos brancos/vermelhos/azuis)
      for (let r = 0; r < 18; r++) {
        const y = 108 + r * 9;
        for (let x = (r % 2) * 4; x < w; x += 8) {
          const q = hash(x * 0.13 + r * 7.1, 3);
          const col = q < 0.34 ? '#cbd5e1' : q < 0.62 ? '#b91c1c' : q < 0.86 ? '#1e3a8a' : '#0f172a';
          g.globalAlpha = 0.35 + r * 0.025;
          g.fillStyle = col;
          g.fillRect(x, y, 5, 6);
        }
      }
      g.globalAlpha = 1;
      g.fillStyle = '#060a17';
      g.fillRect(0, 270, w, 30);
      // faixas penduradas na borda do anel
      [[90, 'en'], [430, 'txt'], [760, 'en'], [1050, 'txt']].forEach(([x, kind]) => {
        if (kind === 'en') {
          g.drawImage(this.fx2FlagCv('en'), x, 262, 150, 70);
        } else {
          g.fillStyle = '#f8fafc';
          g.fillRect(x, 264, 200, 50);
          g.fillStyle = '#b91c1c';
          g.font = 'italic 900 22px "Segoe UI", sans-serif';
          g.textAlign = 'center';
          g.fillText(x < 600 ? 'THREE LIONS' : 'ENGLAND U-20', x + 100, 297);
        }
      });
      const fog = g.createLinearGradient(0, 300, 0, h);
      fog.addColorStop(0, 'rgba(10,20,48,0.0)');
      fog.addColorStop(1, 'rgba(2,4,10,0.6)');
      g.fillStyle = fog;
      g.fillRect(0, 300, w, h - 300);
    },
    fx2FanOpts(arms, fill) {
      return { animState: arms ? 'call_pass' : 'idle', tint: fill, rim: '#5574bd', rimSides: [0] };
    },
    // Um torcedor em silhueta com cachecol (pula quando cheer > 0)
    fx2Fan(ctx, i, row, x, feet, size, t, cheer) {
      const chars = this.fx2CrowdChars();
      const c = chars[Math.floor(hash(i, row + 1) * chars.length)] || {};
      const ph = hash(i, row + 7) * 6;
      const jump = cheer * Math.max(0, Math.sin(t * 0.22 + ph)) * size * 0.07;
      const arms = cheer > 0 && hash(i, row + 3) < 0.6;
      const flip = hash(i, row + 5) < 0.5;
      const y = feet - jump;
      ctx.save();
      if (flip) {
        ctx.translate(x, 0);
        ctx.scale(-1, 1);
        ctx.translate(-x, 0);
      }
      // uma cor só para todos (menos bonecos para montar); a névoa entre as fileiras dá a profundidade
      this.fx2Spr(ctx, c, x, y, size, this.fx2FanOpts(arms, '#060a16'), 108);
      ctx.restore();
      // cachecol listrado nas cores da Inglaterra
      const u = size / 36;
      const sy = y - size * 0.87 + SPRITE_MAPY(14.2) * u;
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = s % 2 ? '#e2e8f0' : '#b91c1c';
        ctx.fillRect(Math.round(x - 4.5 * u + s * 1.5 * u), Math.round(sy), Math.ceil(1.5 * u), Math.ceil(1.1 * u));
      }
      if (arms && hash(i, row + 9) < 0.35) {
        // cachecol erguido acima da cabeça
        const hy = y - size * 0.87 + SPRITE_MAPY(1.5) * u;
        for (let s = 0; s < 8; s++) {
          ctx.fillStyle = s % 2 ? '#e2e8f0' : '#b91c1c';
          ctx.fillRect(Math.round(x - 8 * u + s * 2 * u), Math.round(hy + Math.sin(t * 0.3 + s) * u * 0.4), Math.ceil(2 * u), Math.ceil(1.2 * u));
        }
      }
    },
    // Uma fileira de torcida: n pessoas a cada step px, com o buraco do Fox em skipX
    fx2FanRow(ctx, row, x0, x1, feet, size, step, t, cheer, skipX = null, skipW = 0) {
      let i = 0;
      for (let x = x0 + (row % 2) * step * 0.5; x < x1; x += step, i++) {
        if (skipX !== null && Math.abs(x - skipX) < (skipW || step * 0.6)) continue;
        this.fx2Fan(ctx, i, row, x + (hash(i, row) - 0.5) * step * 0.25, feet, size, t, cheer);
      }
    },
    // O Fox sentado: rosto na sombra (11.6 → 12.4), só o sorriso aparece; luz fria de recorte
    fx2FoxHidden(ctx, x, feet, size, rim = '#bfdbfe') {
      this.fx2Spr(ctx, this.fx2Fox(), x, feet, size, O.foxHidden(rim));
    },

    // Plano 1: a torcida inglesa pulando... menos um homem sentado
    fx2Watch0(ctx, S) {
      const { W, H, t, top } = S;
      const pan = easeIO(seg(t, 0, 150)) * 240;
      const push = easeIO(seg(t, 110, 200));
      const foxX = 820;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, 600, push), y: lerp(360, 420, push), zoom: lerp(1, 1.2, push) });
      ctx.save();
      ctx.translate(-pan * 0.35, 0);
      ctx.drawImage(this.fx2Bg('fx2_engstands', W + 200, H, this.fx2BgEngStands), -40, 0);
      for (let i = 0; i < 14; i++) this.cineGlow(ctx, 30 + i * 92, 80, 60, 'rgba(219,234,254,0.55)', 0.8);
      ctx.restore();
      // fileira de trás
      ctx.save();
      ctx.translate(-pan * 0.6, 0);
      this.fx2FanRow(ctx, 0, -60, W + 360, 452, 170, 100, t, 1);
      this.fx2Flashes(ctx, 0, W + 200, 300, 420, t, 5, 6, 3);
      ctx.restore();
      ctx.fillStyle = 'rgba(40,62,120,0.22)';
      ctx.fillRect(-200, 0, W + 400, H + 200);
      // a fileira dele
      ctx.save();
      ctx.translate(-pan, 0);
      this.fx2FanRow(ctx, 1, -80, W + 400, 612, 250, 142, t, 1, foxX);
      this.fx2FoxHidden(ctx, foxX, 612, 250);
      ctx.restore();
      // fileira da frente (só cabeças e ombros)
      ctx.save();
      ctx.translate(-pan * 1.45, 0);
      this.fx2FanRow(ctx, 2, -120, W + 600, 850, 380, 200, t, 1);
      ctx.restore();
      ctx.restore();
      this.fx2Kicker(ctx, 40, top + 36, 'ENQUANTO ISSO, NA ARQUIBANCADA INGLESA...', seg(t, 4, 50), '#ef4444');
      this.fx2Word(ctx, 'TODO MUNDO GRITA.', 44, top + 96, 40, '#f8fafc', seg(t, 22, 34), 1 - seg(t, 104, 120) * 0.6, -0.04, 0, 'left');
      this.fx2Word(ctx, 'MENOS UM.', 44, top + 156, 58, '#ef4444', seg(t, 112, 124), 1, -0.04, 0, 'left');
      this.cineSfx(S, 2, 'crowd', () => window.SFX?.crowdVoice?.(300, 520, 1.6, 0.1));
    },

    // Plano 2: close no rosto na sombra — só o sorriso aparece
    fx2Watch1(ctx, S) {
      const { W, H, t } = S;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#01020a'], [1, '#050b1c']]);
      this.cineBokeh(ctx, W, 120, 520, t, 16, ['rgba(219,234,254,0.32)', 'rgba(239,68,68,0.22)', 'rgba(147,197,253,0.3)'], 4);
      ctx.fillStyle = 'rgba(1,2,8,0.45)';
      ctx.fillRect(0, 0, W, H);
      const k = easeIO(t / 220);
      const mon = pulse(t, 150, 40);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1, 1.1, k) + mon * 0.03, shake: 0.5 + mon * 3 });
      const size = 780;
      const u = size / 36;
      const x = W * 0.33;
      const mouthY = 400;
      const top0 = mouthY - 12.65 * u;
      const feet = top0 + size * 0.87;
      this.cineGlow(ctx, x, top0 + SPRITE_MAPY(6) * u, 420, 'rgba(30,58,138,0.55)');
      this.cineGlow(ctx, x, mouthY, 200, 'rgba(127,29,29,0.35)', 0.4 + mon);
      this.fx2FoxHidden(ctx, x, feet + Math.sin(t * 0.08) * 2, size, '#93c5fd');
      ctx.restore();
      const words = [
        { at: 14, text: '...hehe.', y: 0.24, s: 34, c: '#cbd5e1' },
        { at: 52, text: 'FINALMENTE.', y: 0.38, s: 64, c: '#f8fafc' },
        { at: 98, text: 'DEPOIS DE TANTO TEMPO...', y: 0.53, s: 42, c: '#cbd5e1' },
        { at: 150, text: 'UM MONSTRO.', y: 0.7, s: 86, c: '#ef4444' }
      ];
      words.forEach((w, i) => {
        const next = words[i + 1];
        const dim = next && t > next.at ? 0.35 : 1;
        this.fx2Word(ctx, w.text, W * 0.76, H * w.y, w.s, w.c, seg(t, w.at, w.at + 12), dim, -0.04, W * 0.44);
      });
    },

    // Plano 3: ele rindo sentado no meio da festa inglesa, girando o dedo
    fx2Watch2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const fox = this.fx2Fox();
      const k = easeIO(t / 180);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: lerp(1.04, 1.12, k) });
      ctx.drawImage(this.fx2Bg('fx2_engstands', W + 200, H, this.fx2BgEngStands), -100, -40);
      for (let i = 0; i < 14; i++) this.cineGlow(ctx, i * 92 - 70, 40, 60, 'rgba(219,234,254,0.55)', 0.8);
      this.fx2FanRow(ctx, 3, -80, W + 120, 470, 210, 104, t, 0.8);
      this.fx2Flashes(ctx, 0, W, 260, 420, t, 4, 6, 9);
      ctx.fillStyle = 'rgba(40,62,120,0.22)';
      ctx.fillRect(-200, -200, W + 400, H + 400);
      // ele: ombros sacudindo de rir, o rosto na sombra
      const laugh = Math.round(Math.abs(Math.sin(t * 0.32)) * (t > 20 ? 3 : 0));
      const fx = 640;
      const feet = bot + 70;
      const size = 400;
      this.cineGlow(ctx, fx, feet - size * 0.6, 280, 'rgba(30,58,138,0.5)');
      this.fx2FoxHidden(ctx, fx, feet - laugh, size, '#e0f2fe');
      // o dedo girando na mão dele
      const tip = this.fx2SpriteFinger(ctx, fx, feet - laugh, size, t, fox.skinColor, 0.6);
      this.fx2FanRow(ctx, 4, -140, W + 200, bot + 250, 420, 230, t, 0.8, fx, 250);
      ctx.restore();
      this.fx2Word(ctx, 'HEHEHEHE...', W / 2, top + 70, 58, '#fca5a5', seg(t, 26, 38), 1, -0.03);
      const z = lerp(1.04, 1.12, k);
      this.fx2Word(ctx, 'TWIRL', (tip.x - 640) * z + W / 2 + 80, (tip.y - 380) * z + H / 2 - 40, 22, '#fde68a', seg(t, 44, 52), 1, -0.1);
      ctx.fillStyle = `rgba(0,0,0,${seg(t, 160, 180)})`;
      ctx.fillRect(0, 0, W, H);
    },

    // ======================================================================
    // 3) FINAL CONTRA A FRANÇA — "4 EGO'S"
    // ======================================================================
    fx2Cast() {
      const cast = this.getFourEgosCast();
      return cast.map((c) => Object.assign({}, c, { char: Object.assign({}, c.char) }));
    },

    // O estádio da final visto do alto (fundo parado): céu, cobertura, anel de torcida e gramado
    fx2BgBowl(g, w, h) {
      this.cineGradient(g, 0, 0, w, h, [[0, '#010312'], [0.5, '#0a1a46'], [1, '#050a1c']]);
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(226,232,240,${0.2 + hash(i, 21) * 0.5})`;
        g.fillRect(hash(i, 22) * w, hash(i, 23) * 120, 1.5, 1.5);
      }
      const cx = 640;
      const cy = 470;
      // a cobertura
      g.fillStyle = '#04081a';
      g.beginPath();
      g.ellipse(cx, cy, 900, 380, 0, 0, TAU);
      g.fill();
      // anel da torcida: textura de pontinhos nas cores dos dois países (um preenchimento só)
      const tile = document.createElement('canvas');
      tile.width = 96;
      tile.height = 48;
      const tg = tile.getContext('2d');
      tg.fillStyle = '#060c22';
      tg.fillRect(0, 0, 96, 48);
      const pal = ['#1d4ed8', '#f8fafc', '#ef4444', '#1e3a8a', '#0b1d4d', '#f8fafc', '#2563eb', '#dc2626'];
      for (let y = 0; y < 48; y += 6) {
        for (let x = (y / 6) % 2 ? 3 : 0; x < 96; x += 6) {
          tg.fillStyle = pal[Math.floor(hash(x * 7.1 + y * 13.7, 5) * pal.length)];
          tg.fillRect(x, y, 4, 3);
        }
      }
      g.save();
      g.beginPath();
      g.ellipse(cx, cy, 862, 354, 0, 0, TAU);
      g.ellipse(cx, cy, 536, 182, 0, 0, TAU);
      g.clip('evenodd');
      g.fillStyle = g.createPattern(tile, 'repeat');
      g.fillRect(0, 0, w, h);
      // os anéis de cima mais escuros (profundidade) e as divisões entre os setores
      for (let r = 0; r < 4; r++) {
        g.strokeStyle = '#020617';
        g.lineWidth = 4;
        g.beginPath();
        g.ellipse(cx, cy, lerp(536, 862, (r + 1) / 4.6), lerp(182, 354, (r + 1) / 4.6), 0, 0, TAU);
        g.stroke();
      }
      const shade = g.createRadialGradient(cx, cy, 300, cx, cy, 900);
      shade.addColorStop(0, 'rgba(2,6,23,0)');
      shade.addColorStop(1, 'rgba(2,6,23,0.55)');
      g.fillStyle = shade;
      g.fillRect(0, 0, w, h);
      g.restore();
      // borda interna (placas de publicidade)
      g.strokeStyle = '#020617';
      g.lineWidth = 12;
      g.beginPath();
      g.ellipse(cx, cy, 530, 178, 0, 0, TAU);
      g.stroke();
      g.strokeStyle = 'rgba(56,189,248,0.6)';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(cx, cy, 524, 174, 0, 0, TAU);
      g.stroke();
      // gramado
      g.save();
      g.beginPath();
      g.ellipse(cx, cy, 520, 172, 0, 0, TAU);
      g.clip();
      g.fillStyle = '#0c3a22';
      g.fillRect(0, 280, w, 400);
      const quad = (a0, a1, col) => {
        const L = (s, y) => cx + (s - 0.5) * lerp(640, 900, (y - 330) / 280);
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(L(a0, 330), 330);
        g.lineTo(L(a1, 330), 330);
        g.lineTo(L(a1, 610), 610);
        g.lineTo(L(a0, 610), 610);
        g.closePath();
        g.fill();
      };
      for (let i = 0; i < 12; i++) quad(i / 12, (i + 1) / 12, i % 2 ? '#14532d' : '#166534');
      g.strokeStyle = 'rgba(241,245,249,0.75)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx - 320, 330);
      g.lineTo(cx + 320, 330);
      g.lineTo(cx + 450, 610);
      g.lineTo(cx - 450, 610);
      g.closePath();
      g.moveTo(cx, 330);
      g.lineTo(cx, 610);
      g.stroke();
      g.beginPath();
      g.ellipse(cx, 455, 70, 32, 0, 0, TAU);
      g.stroke();
      g.restore();
      // os refletores na borda da cobertura
      for (let i = 0; i < 16; i++) {
        const a = Math.PI + (i / 15) * Math.PI;
        g.fillStyle = '#e0f2fe';
        g.fillRect(cx + Math.cos(a) * 880 - 6, cy + Math.sin(a) * 368 - 2, 12, 4);
      }
    },

    // Plano 1: "FINAL WORLD CUP U-20" — o estádio inteiro de pé
    fx2Ego0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const k = easeIO(t / 170);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(330, 420, k), zoom: lerp(1, 1.24, k) });
      ctx.drawImage(this.fx2Bg('fx2_bowl', W, H, this.fx2BgBowl), 0, 0);
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + ((i + 0.5) / 9) * Math.PI;
        this.cineGlow(ctx, 640 + Math.cos(a) * 880, 470 + Math.sin(a) * 368, 120, 'rgba(219,234,254,0.6)');
      }
      this.cineShafts(ctx, 640, 60, Math.PI / 2, 520, 1.2, 6, '191,219,254', 0.05, t);
      // os dois times perfilados no meio-campo
      for (let i = 0; i < 11; i++) {
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(560 + i * 7 - 38, 452 - 9, 4, 8);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(660 + i * 7 - 38, 452 - 9, 4, 8);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(560 + i * 7 - 38, 449, 4, 3);
        ctx.fillStyle = '#0b1d4d';
        ctx.fillRect(660 + i * 7 - 38, 449, 4, 3);
      }
      this.fx2Flashes(ctx, 120, 1160, 140, 340, t, 12, 5, 2);
      this.fx2Flashes(ctx, 0, 1280, 520, 700, t, 6, 6, 5);
      ctx.restore();
      this.fx2Kicker(ctx, W / 2, top + 50, 'COPA DO MUNDO SUB-20 • A GRANDE FINAL', seg(t, 4, 46), '#facc15', 'center');
      const kt = seg(t, 18, 30);
      this.cineImpactText(ctx, 'FINAL WORLD CUP U-20', W / 2, top + 138, 84, '#facc15', kt, W * 0.9);
      if (kt > 0) {
        const lw = 620 * ease(seg(t, 26, 46));
        ctx.fillStyle = '#facc15';
        ctx.fillRect(W / 2 - lw / 2, top + 192, lw, 5);
      }
      this.cineSfx(S, 18, 'title', () => window.SFX?.kick?.(1));
      // JAPÃO vs FRANÇA
      const kl = ease(seg(t, 60, 78));
      const kr = ease(seg(t, 66, 84));
      const py = bot - 130;
      const plate = (x, w, col, code, label, dir, kk) => {
        if (kk <= 0) return;
        ctx.save();
        ctx.translate((1 - kk) * dir * 700, 0);
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.moveTo(x - 6, py - 6);
        ctx.lineTo(x + w + 26, py - 6);
        ctx.lineTo(x + w + 6, py + 70);
        ctx.lineTo(x - 26, py + 70);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x, py);
        ctx.lineTo(x + w + 18, py);
        ctx.lineTo(x + w, py + 64);
        ctx.lineTo(x - 18, py + 64);
        ctx.closePath();
        ctx.fill();
        const fxp = dir < 0 ? x + 14 : x + w - 90;
        this.fx2Flag(ctx, code, fxp, py + 12, 72, 40, t);
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2;
        ctx.strokeRect(fxp, py + 12, 72, 40);
        this.fx2Text(ctx, label, dir < 0 ? x + w - 20 : x + 20, py + 33, 'italic 900 38px "Segoe UI", sans-serif', '#ffffff', 1, dir < 0 ? 'right' : 'left');
        ctx.restore();
      };
      plate(W / 2 - 410, 320, '#1d4ed8', 'jp', 'JAPÃO', -1, kl);
      plate(W / 2 + 90, 320, '#0b1d4d', 'fr', 'FRANÇA', 1, kr);
      this.cineImpactText(ctx, 'VS', W / 2, py + 32, 54, '#facc15', seg(t, 82, 92));
    },

    // Panorama da arquibancada (para o giro da câmera): 2400 px que dão a volta
    fx2BgPano(g, w, h) {
      this.cineGradient(g, 0, 0, w, h, [[0, '#020617'], [0.3, '#050c24'], [1, '#0a1838']]);
      g.fillStyle = '#03061a';
      g.fillRect(0, 0, w, 50);
      for (let x = 30; x < w; x += 300) {
        g.fillStyle = '#0b1324';
        g.fillRect(x, 18, 120, 26);
        g.fillStyle = '#e0f2fe';
        for (let c = 0; c < 9; c++) g.fillRect(x + 6 + c * 12.5, 24, 8, 14);
      }
      const pal = ['#1d4ed8', '#f8fafc', '#ef4444', '#1e3a8a', '#0b1d4d', '#2563eb'];
      for (let r = 0; r < 22; r++) {
        const y = 60 + r * 8.5;
        g.globalAlpha = 0.45 + r * 0.022;
        for (let x = (r % 2) * 4; x < w; x += 8) {
          g.fillStyle = pal[Math.floor(hash(x * 0.71 + r * 13.3, 8) * pal.length)];
          g.fillRect(x, y, 5, 6);
        }
      }
      g.globalAlpha = 1;
      // faixas das torcidas
      for (let x = 100; x < w; x += 600) {
        g.drawImage(this.fx2FlagCv('jp'), x, 120, 90, 56);
        g.drawImage(this.fx2FlagCv('fr'), x + 300, 110, 90, 56);
      }
      g.fillStyle = '#020617';
      g.fillRect(0, h - 26, w, 26);
      g.fillStyle = 'rgba(56,189,248,0.75)';
      g.font = '900 13px "Segoe UI", sans-serif';
      g.textAlign = 'left';
      for (let x = 0; x < w; x += 300) g.fillText('FIFA U-20 WORLD CUP • FINAL', x + 20, h - 9);
    },

    // Plano 2: a câmera gira em volta dos quatro no gramado
    fx2Ego1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const cast = this.fx2Cast();
      const ang = -0.75 + t * 0.0118;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const D = 1250;
      const f = 940;
      const horizon = top + 170;
      const camH = 150;
      const proj = (x, z) => {
        const rx = x * cosA - z * sinA;
        const rz = x * sinA + z * cosA + D;
        return { sx: W / 2 + (rx * f) / rz, sy: horizon + (camH * f) / rz, depth: rz };
      };
      this.cineSfx(S, 0, 'whoosh', () => window.SFX?.whoosh?.());
      // arquibancada girando ao fundo
      const pano = this.fx2Bg('fx2_pano', 2400, 260, this.fx2BgPano);
      const off = (((ang * 760) % 2400) + 2400) % 2400;
      ctx.drawImage(pano, -off, horizon - 252);
      ctx.drawImage(pano, 2400 - off, horizon - 252);
      ctx.fillStyle = '#071226';
      ctx.fillRect(0, horizon + 6, W, H);
      for (let i = 0; i < 8; i++) {
        const x = ((i * 300 + 90 - off) % 2400 + 2400) % 2400;
        if (x < W + 100) this.cineGlow(ctx, x, horizon - 222, 110, 'rgba(219,234,254,0.55)');
      }
      // o gramado em perspectiva (faixas)
      const L = 880;
      const Wd = 560;
      for (let i = 0; i < 16; i++) {
        const x0 = -L + (i * 2 * L) / 16;
        const x1 = -L + ((i + 1) * 2 * L) / 16;
        const c = [proj(x0, -Wd), proj(x1, -Wd), proj(x1, Wd), proj(x0, Wd)];
        ctx.fillStyle = i % 2 ? '#14532d' : '#166534';
        ctx.beginPath();
        c.forEach((p, j) => (j ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(241,245,249,0.75)';
      ctx.lineWidth = 2;
      const line = (pts, close) => {
        ctx.beginPath();
        pts.forEach(([x, z], i) => {
          const p = proj(x, z);
          if (i) ctx.lineTo(p.sx, p.sy);
          else ctx.moveTo(p.sx, p.sy);
        });
        if (close) ctx.closePath();
        ctx.stroke();
      };
      line([[-L, -Wd], [L, -Wd], [L, Wd], [-L, Wd]], true);
      line([[0, -Wd], [0, Wd]]);
      const circle = [];
      for (let k = 0; k <= 28; k++) circle.push([Math.cos((k / 28) * TAU) * 130, Math.sin((k / 28) * TAU) * 130]);
      line(circle);
      line([[-L, -270], [-L + 250, -270], [-L + 250, 270], [-L, 270]]);
      line([[L, -270], [L - 250, -270], [L - 250, 270], [L, 270]]);
      // os 4 egos, do mais longe para o mais perto
      const placed = cast.map((c, i) => ({ c, i, p: proj(c.pos[0], c.pos[1]) })).sort((a, b) => b.p.depth - a.p.depth);
      placed.forEach(({ c, p }) => {
        const size = Math.max(64, (230 * f) / p.depth);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(p.sx, p.sy, size * 0.3, size * 0.06, 0, 0, TAU);
        ctx.fill();
        this.cineGlow(ctx, p.sx, p.sy - size * 0.1, size * 0.5, 'rgba(255,255,255,0.12)');
        this.fx2Spr(ctx, c.char, p.sx, p.sy, size, { rim: c.color, rimSides: [-1, 1, 0] });
        ctx.font = '900 13px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tw = ctx.measureText(c.label).width + 14;
        const ly = p.sy - size * 0.98;
        ctx.fillStyle = 'rgba(2,6,23,0.8)';
        ctx.fillRect(p.sx - tw / 2, ly - 10, tw, 20);
        ctx.fillStyle = c.color;
        ctx.fillRect(p.sx - tw / 2, ly + 9, tw, 2);
        ctx.fillText(c.label, p.sx, ly);
      });
      this.cineDust(ctx, W, H * 0.8, t, 20, 'rgba(219,234,254,0.45)', 13);
      // o mais perto ganha o nome grande embaixo (entra quando muda)
      const closest = placed[placed.length - 1];
      if (!this._fx2Close || this._fx2Close.phase !== S.phase || t < this._fx2Close.at) this._fx2Close = { i: closest.i, at: 0, phase: S.phase };
      else if (this._fx2Close.i !== closest.i) this._fx2Close = { i: closest.i, at: t, phase: S.phase };
      const ka = seg(t, this._fx2Close.at, this._fx2Close.at + 12);
      const c = closest.c;
      ctx.fillStyle = 'rgba(2,6,23,0.72)';
      ctx.fillRect(0, bot - 104, 560 * ease(ka), 84);
      ctx.fillStyle = c.color;
      ctx.fillRect(0, bot - 104, 8, 84);
      this.fx2Word(ctx, c.label, 36, bot - 74, 46, c.color, ka, 1, -0.03, 500, 'left');
      this.fx2Text(ctx, c.role, 40, bot - 38, '900 15px "Segoe UI", sans-serif', '#e2e8f0', seg(t, this._fx2Close.at + 6, this._fx2Close.at + 18), 'left', true);
    },

    // Plano 3: impacto — "4 EGO'S", os quatro em silhueta com os olhos acesos
    fx2Ego2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const cast = this.fx2Cast();
      this.cineSfx(S, 0, 'impact', () => window.SFX?.kick?.(1));
      ctx.fillStyle = '#03050c';
      ctx.fillRect(0, 0, W, H);
      const sh = pulse(t, 0, 34) * 10;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.04 - ease(seg(t, 0, 130)) * 0.04, shake: sh });
      this.fx2Rays(ctx, W / 2, top + 150, W * 0.9, 56, '#0f1b3d', 0.9, t * 0.003);
      // os quatro cortes coloridos saindo do centro
      cast.forEach((c, i) => {
        const a = -Math.PI / 2 + (i - 1.5) * 0.55 + Math.sin(t * 0.02 + i) * 0.02;
        const k = ease(seg(t, 2 + i * 3, 14 + i * 3));
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 14;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(W / 2 + Math.cos(a + Math.PI) * 40, top + 150 + Math.sin(a + Math.PI) * 40);
        ctx.lineTo(W / 2 + Math.cos(a + Math.PI) * 40 * (1 + k * 30), top + 150 + Math.sin(a + Math.PI) * 40 * (1 + k * 30));
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
      // silhuetas lado a lado: Japão (Sae, você) x França (Loki, Hugo)
      const order = [[2, 190], [0, 470], [1, 810], [3, 1090]];
      const size = 470;
      const u = size / 36;
      const feet = bot + 150;
      order.forEach(([ci, x], j) => {
        const c = cast[ci];
        const kk = ease(seg(t, 4 + j * 4, 18 + j * 4));
        const fy = feet + (1 - kk) * 120;
        this.cineGlow(ctx, x, fy - size * 0.55, 260, this.fx2Rgba(c.color, 0.22), kk);
        this.fx2Spr(ctx, c.char, x, fy, size, { tint: '#02030a', rim: c.color, rimSides: [-1, 1, 0], rimD: 2, flipX: j > 1 });
        const open = seg(t, 46 + j * 6, 54 + j * 6);
        if (open > 0) {
          const eyeY = fy - size * 0.87 + SPRITE_MAPY(10.25) * u;
          [-1, 1].forEach((s) => {
            const ex = x + s * 3.45 * u;
            this.cineGlow(ctx, ex, eyeY, u * 4, 'rgba(255,255,255,0.25)', open);
            this.drawPixelEye(ctx, ex, eyeY, u * 0.26, { line: '#000000', white: '#f8fafc', iris: '#020617', ring: c.color, look: j > 1 ? -1 : 1, blink: open < 0.5 });
            if (open >= 0.5) this.fx2Angry(ctx, ex, eyeY, u * 0.26, s < 0 ? 1 : -1, '#000000');
          });
        }
      });
      ctx.restore();
      this.cineFlash(ctx, W, H, 0.9 * (1 - seg(t, 0, 9)));
      this.cineImpactText(ctx, "4 EGO'S", W / 2, top + 150, 170, '#f8fafc', seg(t, 6, 18), W * 0.86);
      const lw = 520 * ease(seg(t, 16, 34));
      ctx.fillStyle = '#00f5d4';
      ctx.fillRect(W / 2 - lw / 2, top + 242, lw, 6);
    },

    // Faixas diagonais de velocidade (prontas como textura repetida)
    fx2Speed(ctx) {
      if (!this._fx2SpeedPat) {
        const cv = document.createElement('canvas');
        cv.width = 160;
        cv.height = 160;
        const g = cv.getContext('2d');
        g.strokeStyle = 'rgba(255,255,255,0.22)';
        g.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const y = i * 27 + hash(i, 3) * 10;
          g.beginPath();
          g.moveTo(0, y + 40);
          g.lineTo(160, y);
          g.moveTo(0, y + 200);
          g.lineTo(160, y + 160);
          g.moveTo(0, y - 120);
          g.lineTo(160, y - 160);
          g.stroke();
        }
        this._fx2SpeedPat = ctx.createPattern(cv, 'repeat');
      }
      return this._fx2SpeedPat;
    },

    // Plano 4: tela dividida em 4 — você, Loki, Sae e Hugo
    fx2Ego3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const cast = this.fx2Cast();
      ctx.fillStyle = '#03050c';
      ctx.fillRect(0, 0, W, H);
      this.fx2Rays(ctx, W / 2, H / 2, W, 48, '#16224a', 0.8, t * 0.003);
      const pw = W / 4;
      const skew = 40;
      cast.forEach((c, i) => {
        const at = i * 24;
        const kk = ease(seg(t, at, at + 18));
        if (kk <= 0) return;
        this.cineSfx(S, at, 'pan' + i, () => window.SFX?.whoosh?.());
        const x0 = i * pw;
        const l = i === 0 ? 0 : skew;
        const r = i === 3 ? 0 : skew;
        const pts = [[x0 + l + 5, top + 10], [x0 + pw + r - 5, top + 10], [x0 + pw - r - 5, bot - 10], [x0 - l + 5, bot - 10]];
        const dir = i % 2 ? 1 : -1;
        this.fx2Panel(
          ctx,
          pts,
          () => {
            const cx = x0 + pw / 2;
            this.cineGradient(ctx, x0 - skew, top, pw + skew * 2, bot - top, [[0, '#03050c'], [0.55, this.fx2Shade(c.color, -0.55)], [1, c.color]]);
            ctx.save();
            ctx.translate(0, -((t * 9 + i * 40) % 160));
            ctx.fillStyle = this.fx2Speed(ctx);
            ctx.fillRect(x0 - skew, top, pw + skew * 2, bot - top + 160);
            ctx.restore();
            this.cineGlow(ctx, cx, top + 200, 200, 'rgba(255,255,255,0.12)');
            const z = 1 + ease(seg(t, at, at + 300)) * 0.08;
            this.fx2Head(ctx, c.char, cx + (i % 2 ? -6 : 6), top + 230, 520 * z, { rim: c.color, rimSides: [-1, 1, 0], rimD: 3 });
            // placa com o nome
            const pk = ease(seg(t, at + 14, at + 30));
            ctx.fillStyle = 'rgba(2,6,23,0.88)';
            ctx.fillRect(x0 - 10, bot - 104, (pw + 20) * pk, 76);
            ctx.fillStyle = c.color;
            ctx.fillRect(x0 - 10, bot - 104, (pw + 20) * pk, 3);
            this.fx2Word(ctx, c.label.slice(0, 16), cx, bot - 76, 28, c.color, pk, 1, -0.04, pw - 40);
            this.fx2Text(ctx, c.role, cx, bot - 44, '800 12px "Segoe UI", sans-serif', '#e2e8f0', seg(t, at + 22, at + 34));
          },
          { dy: (1 - kk) * dir * H, width: 5 }
        );
      });
    },

    // Plano 5: os olhos dos quatro em faixas — "SÓ UM EGO VAI REINAR"
    fx2Ego4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const cast = this.fx2Cast();
      ctx.fillStyle = '#020308';
      ctx.fillRect(0, 0, W, H);
      const order = [0, 1, 2, 3];
      const gap = 8;
      const sh = (bot - top - 28 - gap * 3) / 4;
      order.forEach((ci, j) => {
        const c = cast[ci];
        const kk = ease(seg(t, j * 10, j * 10 + 16));
        if (kk <= 0) return;
        const y0 = top + 14 + j * (sh + gap);
        const y1 = y0 + sh;
        const dir = j % 2 ? 1 : -1;
        this.fx2Panel(
          ctx,
          [[20, y0], [W - 20, y0 - 6], [W - 20, y1 - 6], [20, y1]],
          () => {
            ctx.fillStyle = '#04060d';
            ctx.fillRect(0, y0 - 10, W, sh + 20);
            const dw = 640 + t * 0.4;
            const U = dw / 14;
            const cx = W / 2 + (j % 2 ? 90 : -90) + (dir * (1 - ease(seg(t, j * 10, 170)))) * 40;
            const cy = (y0 + y1) / 2 - 3;
            this.fx2Crop(ctx, c.char, {}, 11, 7, 14, 6, cx - dw / 2, cy - 3.25 * U, dw, 6 * U);
            const eye = c.char.eyeColor || '#0f766e';
            [14.55, 21.45].forEach((ux, e) => {
              const ex = cx - dw / 2 + (ux - 11) * U;
              this.drawPixelEye(ctx, ex, cy, U * 0.27, { line: '#020617', iris: this.fx2Shade(eye, -0.5), ring: eye, look: j % 2 ? -1 : 1 });
              this.fx2Angry(ctx, ex, cy, U * 0.27, e === 0 ? 1 : -1, '#020617');
            });
            ctx.fillStyle = `rgba(2,6,23,${0.25 + seg(t, 96, 116) * 0.45})`;
            ctx.fillRect(0, y0 - 10, W, sh + 20);
            // o nome na ponta da faixa, na cor do ego
            const nx = j % 2 ? W - 44 : 44;
            ctx.fillStyle = c.color;
            ctx.fillRect(j % 2 ? W - 28 : 20, y0, 8, sh);
            this.fx2Text(ctx, c.label, nx, y0 + 26, 'italic 900 22px "Segoe UI", sans-serif', c.color, ease(seg(t, j * 10 + 10, j * 10 + 22)), j % 2 ? 'right' : 'left');
          },
          { dx: (1 - kk) * dir * W, width: 4 }
        );
      });
      const k1 = seg(t, 104, 116);
      this.fx2Kicker(ctx, W / 2, H / 2 - 74, 'FINAL WORLD CUP U-20 • JAPÃO x FRANÇA', k1, '#facc15', 'center');
      this.cineImpactText(ctx, 'SÓ UM EGO VAI REINAR.', W / 2, H / 2 + 6, 78, '#f8fafc', seg(t, 112, 124), W * 0.9);
      this.cineSfx(S, 150, 'whistle', () => window.SFX?.whistle?.(1));
    }
  });

  // ==========================================================================
  // LISTAS DE AQUECIMENTO (o que os próximos planos usam, montado nos quadros com folga)
  // ==========================================================================
  const canvasSize = () => {
    const cv = document.getElementById('sakuga-action-canvas');
    return [cv?.width || 1280, cv?.height || 720];
  };
  const warmEntrance = function () {
    const fox = this.fx2Fox();
    const you = this.cineYou(this.KITS.blueLock);
    const [W, H] = canvasSize();
    return [
      () => this.fx2Entry(you, 180, O.youKick('windup', 46)),
      () => this.fx2Entry(you, 180, O.youKick('shoot', 47)),
      () => this.fx2Entry(you, 180, O.youBackRim),
      () => this.fx2Entry(you, 180, O.youBackDim),
      () => this.fx2Entry(you, 180, O.youBackBlack),
      () => this.fx2Entry(you, 180, O.youBackMoon),
      () => this.fx2Entry(you, 180, {}),
      () => this.fx2Entry(fox, 180, O.foxDark),
      () => this.fx2GrinCv(),
      () => this.fx2Bg('fx2_stands', W, H, this.fx2BgStands),
      () => this.fx2Entry(fox, 180, O.foxSpot),
      () => this.fx2Entry(fox, 180, O.foxEyesCrop),
      () => this.fx2Entry(fox, 180, O.foxMouthCrop)
    ];
  };
  const warmWatch = function () {
    const fox = this.fx2Fox();
    const [W, H] = canvasSize();
    const list = [() => this.fx2Bg('fx2_engstands', W + 200, H, this.fx2BgEngStands), () => this.fx2Entry(fox, 180, O.foxHidden('#bfdbfe'))];
    this.fx2CrowdChars().forEach((c) => [false, true].forEach((arms) => list.push(() => this.fx2Entry(c, 108, this.fx2FanOpts(arms, '#060a16')))));
    list.push(() => this.fx2Entry(fox, 180, O.foxHidden('#93c5fd')), () => this.fx2Entry(fox, 180, O.foxHidden('#e0f2fe')));
    return list;
  };
  const warmEgos = function () {
    const cast = this.fx2Cast();
    const [W, H] = canvasSize();
    const list = [() => this.fx2Bg('fx2_bowl', W, H, this.fx2BgBowl), () => this.fx2Bg('fx2_pano', 2400, 260, this.fx2BgPano)];
    cast.forEach((c) => [108, 144, 180].forEach((b) => list.push(() => this.fx2Entry(c.char, b, { rim: c.color, rimSides: [-1, 1, 0] }))));
    [[2, 0], [0, 1], [1, 2], [3, 3]].forEach(([ci, j]) => list.push(() => this.fx2Entry(cast[ci].char, 180, { tint: '#02030a', rim: cast[ci].color, rimSides: [-1, 1, 0], rimD: 2, flipX: j > 1 })));
    cast.forEach((c) => list.push(() => this.fx2Entry(c.char, 180, { rim: c.color, rimSides: [-1, 1, 0], rimD: 3 }), () => this.fx2Entry(c.char, 180, {})));
    return list;
  };

  // ==========================================================================
  // REGISTRO DAS CENAS
  // ==========================================================================
  CE.registerCine('fox_entrance', {
    warm: warmEntrance,
    phases: [180, 170, 190, 200, 170],
    music: 'dread',
    title: '🦊 A ENTRADA DO FOX',
    tags: ['PLANO 1 • MADRUGADA NO BLUE LOCK', 'PLANO 2 • AS LUZES', 'PLANO 3 • O SORRISO', 'PLANO 4 • A RAPOSA', 'PLANO 5 • NINGUÉM SABE'],
    // "BLUE LOCK • 03:12", os CLACK dos refletores, as risadas, o holofote com "FOX • TÉCNICO
    // DA INGLATERRA SUB-20" já estão na imagem
    subs: [
      [{ from: 4, who: 'VOCÊ', text: '(Mais um. Até esquecer como se erra.)', color: YOU_COLOR }],
      [{ from: 64, who: 'VOCÊ', text: '"...Quem tá aí?"', color: YOU_COLOR }],
      [{ from: 20, text: 'No escuro, alguém está rindo.' }],
      [{ from: 80, who: 'FOX', text: '"Boa noite, campeão."', color: FOX_COLOR }],
      [{ from: 6, text: 'Quem descobre o que ele quer... muda.', color: '#fca5a5' }]
    ],
    grain: 0,
    vignette: 0.6,
    draw(ctx, S) {
      this.fx2Begin(ctx, S);
      [this.fx2Ent0, this.fx2Ent1, this.fx2Ent2, this.fx2Ent3, this.fx2Ent4][S.phase].call(this, ctx, S);
      this.fx2Warm(this.CINE[this.sakugaType]);
      this.fx2Grain(ctx, S.W, S.H, 0.06);
    }
  });

  CE.registerCine('fox_watch', {
    warm: warmWatch,
    phases: [200, 220, 180],
    music: 'dread',
    title: '🦊 ENQUANTO ISSO, NA ARQUIBANCADA...',
    tags: ['PLANO 1 • A ARQUIBANCADA', 'PLANO 2 • O SORRISO', 'PLANO 3 • ???'],
    // "TODO MUNDO GRITA. / MENOS UM.", a fala dele em letreiros (...hehe. FINALMENTE. DEPOIS
    // DE TANTO TEMPO... UM MONSTRO.) e o "HEHEHEHE..." já estão na imagem
    subs: [
      [{ from: 54, text: 'Menos um homem de terno, imóvel.', color: '#fca5a5' }],
      [
        { from: 14, to: 108, who: '???', text: '"Finalmente..."', color: FOX_COLOR },
        { from: 108, who: '???', text: '"Eu vi um MONSTRO."', color: FOX_COLOR }
      ],
      [{ from: 2, text: 'Ninguém viu ele sorrir. Quem é esse homem?', color: '#fca5a5' }]
    ],
    grain: 0,
    vignette: 0.6,
    draw(ctx, S) {
      this.fx2Begin(ctx, S);
      [this.fx2Watch0, this.fx2Watch1, this.fx2Watch2][S.phase].call(this, ctx, S);
      this.fx2Warm(this.CINE[this.sakugaType]);
      this.fx2Grain(ctx, S.W, S.H, 0.06);
    }
  });

  CE.registerCine('four_egos_intro', {
    warm: warmEgos,
    phases: [170, 270, 130, 300, 180],
    music: 'epic',
    title: '🎬 FINAL WORLD CUP U-20 • JAPÃO x FRANÇA',
    tags: ['PLANO 1 • A GRANDE FINAL', 'PLANO 2 • A CÂMERA GIRA', "PLANO 3 • 4 EGO'S", 'PLANO 4 • VOCÊ • LOKI • SAE • HUGO', 'PLANO 5 • SÓ UM REINA'],
    subs: [
      [{ from: 30, who: 'NARRADOR', text: 'O estádio inteiro está de pé. Os hinos terminaram.', color: NARR }],
      [{ from: 20, who: 'NARRADOR', text: 'Quatro monstros esperam o apito no centro do mundo...', color: NARR }],
      [{ from: 24, who: 'NARRADOR', text: 'Quatro egos absolutos dividindo o mesmo gramado.', color: NARR }],
      [
        { from: 20, to: 150, text: 'Japão: você e Sae Itoshi. França: Julian Loki e Hugo.' },
        { from: 154, text: 'Cada um acha que o gramado é só dele.' }
      ],
      [{ from: 30, who: 'NARRADOR', text: 'O apito vai soar. Só um ego vai reinar no topo do mundo!', color: NARR }]
    ],
    grain: 0,
    vignette: 0.5,
    draw(ctx, S) {
      this.fx2Begin(ctx, S);
      [this.fx2Ego0, this.fx2Ego1, this.fx2Ego2, this.fx2Ego3, this.fx2Ego4][S.phase].call(this, ctx, S);
      this.fx2Warm(this.CINE[this.sakugaType]);
      this.fx2Grain(ctx, S.W, S.H, 0.05);
    }
  });
})();
