// ============================================================================
// CENAS DO FIM DA CARREIRA (cine_final) — ver js/cine_kit.js
//   convocation_call  • a convocação do Ego para a Copa (camisa 11)
//   camp_night        • a madrugada no hotel da seleção (Rin, Sae, Shidou)
//   rin_final_duel    • a véspera do último duelo: o estádio do Blue Lock na chuva
//   rin_final_end     • depois do duelo: deitados na grama, o placar e o Nº 1
//   ballon_dor        • a noite da Bola de Ouro em Paris
//   epilogue_destinies• o destino de cada um (páginas de mangá)
// Helpers daqui ficam no CutsceneEngine com o prefixo "fin".
// Bonecos parados são guardados prontos (finSpr): colar um canvas é bem mais barato
// que redesenhar a pixel art a cada quadro.
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

  const KIT_BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const KIT_RIN = { jerseyPrimary: '#0f766e', jerseySecondary: '#020617' };
  // Os 25 convocados antes de você (os 6 primeiros ganham o rosto no telão)
  const CONV_NAMES = [
    ['SAE ITOSHI', 'MEIA • CAPITÃO', 'sae'], ['RIN ITOSHI', 'ATACANTE', 'rin'], ['RYUSEI SHIDOU', 'ATACANTE', 'shidou'],
    ['MEGURU BACHIRA', 'PONTA', 'bachira'], ['SEISHIRO NAGI', 'ATACANTE', 'nagi'], ['HYOMA CHIGIRI', 'PONTA', 'chigiri'],
    ['GIN GAGAMARU', 'GOLEIRO'], ['RENSUKE KUNIGAMI', 'ATACANTE'], ['REO MIKAGE', 'MEIA'], ['SHOUEI BAROU', 'ATACANTE'],
    ['YO HIORI', 'MEIA'], ['EITA OTOYA', 'PONTA'], ['TABITO KARASU', 'VOLANTE'], ['KENYU YUKIMIYA', 'PONTA'],
    ['JYUBEI ARYU', 'ZAGUEIRO'], ['ZANTETSU TSURUGI', 'LATERAL'], ['OLIVER AIKU', 'ZAGUEIRO'], ['IKKI NIKO', 'VOLANTE'],
    ['AOSHI TOKIMITSU', 'ZAGUEIRO'], ['KURONA RANZE', 'MEIA'], ['GURIMU IGARASHI', 'MEIA'], ['NIJIRO NANASE', 'MEIA'],
    ['JIN KIYORA', 'ZAGUEIRO'], ['JINGO RAICHI', 'ZAGUEIRO'], ['SHUTO SENDO', 'ATACANTE']
  ];

  // ==========================================================================
  // HELPERS (prefixo fin)
  // ==========================================================================
  Object.assign(CE, {
    // Boneco pronto num canvas guardado (pixel art de 5 px por unidade, ampliado sem
    // suavizar). o = { facing, animState, frame, flipX, tint, dim, dimTint, shirtNumber, showAura }
    // frame padrão 45: o frame 0 do PixelRenderer é o quadro do piscar (olho fechado)
    finSprEntry(char, base, o) {
      // Luz de recorte já assada no canvas guardado: um drawImage por quadro em vez de três
      if (o.rim) {
        const rkey = `rim|${base}|${o.rim}|${(o.rimSides || [-1, 1]).join(',')}|${o.rimD || 0}`;
        const plain = Object.assign({}, o, { rim: null });
        const body = this.finSprEntry(char, base, plain);
        const cache = this._finSpr;
        const ck = rkey + '|' + (body.key || '');
        let e = cache.get(ck);
        if (e) return e;
        const sil = this.finSprEntry(char, base, Object.assign({}, plain, { tint: o.rim, dim: 0, showAura: false }));
        const cv = document.createElement('canvas');
        cv.width = body.cv.width;
        cv.height = body.cv.height;
        const g = cv.getContext('2d');
        const d = o.rimD || Math.max(1, Math.round(base / 75));
        (o.rimSides || [-1, 1]).forEach((s) => g.drawImage(sil.cv, s * d, -Math.round(d * 0.35)));
        g.drawImage(body.cv, 0, 0);
        e = { cv, pad: body.pad, base, key: ck };
        cache.set(ck, e);
        return e;
      }
      const key = [
        base, char.id || '', char.name || '', char.jerseyPrimary, char.jerseySecondary, char.angry ? 1 : 0, char.outfit || '', char.clothesColor || '',
        char.hairColor, char.hairSecondary, char.skinColor, char.eyeColor, char.hairStyle, char.eyeStyle || '', char.hat || '',
        o.facing || 'front', o.animState || 'idle', o.frame || 45, o.flipX ? 1 : 0, o.tint || '', o.dim || 0, o.dimTint || '', o.shirtNumber || '', o.showAura ? 1 : 0, o.expr || '',
        o.view || '', o.mirror === undefined ? '' : o.mirror ? 1 : 0
      ].join('|');
      const cache = this._finSpr || (this._finSpr = new Map());
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
        frame: o.frame || 45,
        flipX: !!o.flipX,
        tint: o.tint,
        showAura: !!o.showAura,
        shirtNumber: o.shirtNumber,
        // bonecos novos: expressão do rosto (ex. 'angry' = dentes trincados), direção
        // ('front' = correndo de frente pra câmera) e perna/braço do outro lado (mirror)
        expr: o.expr,
        view: o.view,
        mirror: o.mirror
      });
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (o.dim) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = `rgba(${o.dimTint || '0,0,0'},${o.dim})`;
        g.fillRect(0, 0, cv.width, cv.height);
        g.globalCompositeOperation = 'source-over';
      }
      e = { cv, pad, base, key };
      if (cache.size > 170) cache.delete(cache.keys().next().value);
      cache.set(key, e);
      return e;
    },

    // Desenha o boneco com os pés em (x, feet). Tamanhos < 180 usam uma base menor (múltiplo
    // de 36) e reduzem suavizando um pouco; >= 180 ampliam a base de 180 sem suavizar
    finSpr(ctx, char, x, feet, size, o = {}) {
      const base = size >= 180 ? 180 : Math.max(36, 36 * Math.ceil(size / 36));
      const e = this.finSprEntry(char, base, o);
      const k = size / base;
      ctx.save();
      ctx.imageSmoothingEnabled = size < base;
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.drawImage(e.cv, x - size / 2 - e.pad * k, feet - size * 0.87 - e.pad * k, e.cv.width * k, e.cv.height * k);
      ctx.restore();
    },

    // Luz de recorte: silhuetas coloridas deslocadas atrás + o boneco por cima
    // (assada no canvas guardado; d = deslocamento em px do tamanho final, vira px da base)
    finRim(ctx, char, x, feet, size, o = {}, color = '#7dd3fc', sides = [-1, 1], d = 0) {
      const base = size >= 180 ? 180 : Math.max(36, 36 * Math.ceil(size / 36));
      const rimD = d ? Math.max(1, Math.round((d * base) / size)) : 0;
      this.finSpr(ctx, char, x, feet, size, Object.assign({}, o, { rim: color, rimSides: sides, rimD }));
    },

    // Close: o olho do boneco fica em eyeY. o.rim = cor da luz de recorte (os dois lados)
    finHead(ctx, char, cx, eyeY, size, o = {}) {
      const u = size / 36;
      const top = eyeY - SPRITE_MAPY(10.1) * u;
      const feet = top + size * 0.87;
      this.finSpr(ctx, char, cx, feet, size, o);
      return { u, top, feet };
    },

    // Recorte ampliado de um pedaço do boneco (unidades 0..36 da pixel art) — closes extremos
    // a qualquer aumento sem desenhar o boneco gigante
    finCrop(ctx, char, o, ux, uy, uw, uh, dx, dy, dw, dh) {
      const e = this.finSprEntry(char, 180, o || {});
      const b = 5;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      // (uy em unidades do corpo antigo: SPRITE_MAPY leva pro boneco atual — chibi)
      ctx.drawImage(e.cv, e.pad + ux * b, e.pad + SPRITE_MAPY(uy) * b, uw * b, uh * b, dx, dy, dw, dh);
      ctx.restore();
    },

    // Retângulo em unidades do boneco (para mexer no rosto: pálpebra, boca, gota)
    finU(ctx, cx, top, u, x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(cx + (x - 18) * u), Math.round(top + SPRITE_MAPY(y) * u), Math.ceil(w * u), Math.ceil(h * u));
    },

    finShade(hex, amt) {
      const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
      if (!m) return hex;
      const f = (v) => {
        v = parseInt(v, 16);
        v = amt < 0 ? v * (1 + amt) : v + (255 - v) * amt;
        return Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
      };
      return '#' + f(m[1]) + f(m[2]) + f(m[3]);
    },

    // Faixa dos olhos em close extremo: o rosto recortado e ampliado + olhos em pixel art
    // (drawPixelEye) por cima. dw = largura da faixa (14 unidades); devolve U (px/unidade)
    finEyes(ctx, char, dx, dy, dw, o = {}) {
      const U = dw / 14;
      this.finCrop(ctx, char, {}, 11, 7, 14, 6, dx, dy, dw, U * 6);
      const px = U * 0.3;
      const eye = char.eyeColor || '#0f766e';
      [14.5, 21.5].forEach((ux, i) => {
        const cx = dx + (ux - 11) * U;
        const cy = dy + 3.1 * U;
        this.drawPixelEye(ctx, cx, cy, px, { line: o.line || '#020617', iris: o.iris || this.finShade(eye, -0.5), ring: o.ring || eye, look: o.look || 0, tiny: o.tiny, blink: o.blink });
        if (o.blink) return;
        if (o.angry) this.finLid(ctx, cx, cy, px, i === 0 ? 1 : -1, 'angry', o.line || '#020617');
        if (o.half) this.finLid(ctx, cx, cy, px, i === 0 ? 1 : -1, 'half', o.lid || this.finShade(char.skinColor || '#f3d1b8', -0.18));
      });
      return U;
    },

    // Pálpebra por cima do olho em pixel (mesma grade de 12 x 7 do drawPixelEye)
    finLid(ctx, cx, cy, px, side, kind, color) {
      const x0 = Math.round(cx - 6 * px);
      const y0 = Math.round(cy - 3.5 * px);
      const s = Math.ceil(px);
      const cell = (c, r) => ctx.fillRect(Math.round(x0 + c * px), Math.round(y0 + r * px), s, s);
      ctx.fillStyle = color;
      if (kind === 'angry') {
        // Desce para o lado do nariz (side 1 = olho da esquerda da tela)
        for (let c = 1; c < 11; c++) {
          const inner = side > 0 ? c : 11 - c;
          if (inner >= 5) cell(c, 2);
          if (inner >= 8) cell(c, 3);
        }
      } else {
        for (let c = 1; c < 11; c++) {
          cell(c, 0);
          cell(c, 1);
          cell(c, 2);
        }
        ctx.fillStyle = '#020617';
        for (let c = 0; c < 12; c++) cell(c, 3);
      }
    },

    // Texturas repetidas: linhas de TV, grade de LED, retícula de mangá
    finPat(ctx, kind) {
      this._finPats = this._finPats || {};
      if (!this._finPats[kind]) {
        const cv = document.createElement('canvas');
        const g = cv.getContext('2d');
        if (kind === 'scan') {
          cv.width = 4;
          cv.height = 4;
          g.fillStyle = 'rgba(0,0,0,0.32)';
          g.fillRect(0, 0, 4, 2);
        } else if (kind === 'dots') {
          cv.width = 6;
          cv.height = 6;
          g.fillStyle = 'rgba(0,0,0,0.5)';
          g.fillRect(0, 0, 6, 6);
          g.clearRect(1, 1, 4, 4);
        } else {
          cv.width = 10;
          cv.height = 10;
          g.fillStyle = 'rgba(148,163,184,0.09)';
          g.beginPath();
          g.arc(2.5, 2.5, 1.4, 0, TAU);
          g.arc(7.5, 7.5, 1.4, 0, TAU);
          g.fill();
        }
        this._finPats[kind] = ctx.createPattern(cv, 'repeat');
      }
      return this._finPats[kind];
    },
    finFillPat(ctx, kind, x, y, w, h, alpha = 1) {
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = this.finPat(ctx, kind);
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    },

    // Texto em pixel (placar de LED, número da camisa): escrito pequeno e ampliado sem suavizar.
    // px = tamanho de cada pixel; maxW limita a largura
    finPixelText(ctx, text, x, y, px, color = '#f8fafc', align = 'center', maxW = 0) {
      const key = `${text}|${color}`;
      const cache = this._finPT || (this._finPT = new Map());
      let cv = cache.get(key);
      if (!cv) {
        cv = document.createElement('canvas');
        let g = cv.getContext('2d');
        g.font = '900 11px monospace';
        cv.width = Math.ceil(g.measureText(text).width) + 4;
        cv.height = 14;
        g = cv.getContext('2d');
        g.font = '900 11px monospace';
        g.textBaseline = 'middle';
        g.fillStyle = color;
        g.fillText(text, 2, 7.5);
        const img = g.getImageData(0, 0, cv.width, cv.height);
        for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 110 ? 255 : 0;
        g.putImageData(img, 0, 0);
        if (cache.size > 80) cache.delete(cache.keys().next().value);
        cache.set(key, cv);
      }
      if (maxW) px = Math.min(px, maxW / cv.width);
      const w = cv.width * px;
      const h = cv.height * px;
      const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, Math.round(x0), Math.round(y - h / 2), w, h);
      ctx.restore();
      return w;
    },

    // Quebra de linha guardada (o measureText por quadro não é preciso)
    finWrap(ctx, text, maxW) {
      const key = `${ctx.font}|${maxW}|${text}`;
      const c = this._finWrapC || (this._finWrapC = new Map());
      if (c.has(key)) return c.get(key);
      const lines = [];
      let cur = '';
      text.split(' ').forEach((wd) => {
        const tr = cur ? cur + ' ' + wd : wd;
        if (ctx.measureText(tr).width > maxW && cur) {
          lines.push(cur);
          cur = wd;
        } else cur = tr;
      });
      if (cur) lines.push(cur);
      if (c.size > 200) c.clear();
      c.set(key, lines);
      return lines;
    },

    // Caixa de narração de mangá: faixa colorida + nome + texto
    finBox(ctx, x, y, w, label, text, color = '#0f766e', k = 1) {
      if (k <= 0) return 0;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, k * 2.5);
      ctx.translate((1 - ease(k)) * -24, 0);
      ctx.font = 'italic 700 17px "Segoe UI", sans-serif';
      const lines = this.finWrap(ctx, text, w - 34);
      const h = (label ? 34 : 12) + lines.length * 22 + 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, w, h);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#020617';
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = color;
      ctx.fillRect(x + 2, y + 2, 8, h - 4);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      if (label) {
        ctx.font = '900 15px "Segoe UI", sans-serif';
        ctx.fillText(label, x + 20, y + 10);
      }
      ctx.font = 'italic 700 17px "Segoe UI", sans-serif';
      ctx.fillStyle = '#0b1120';
      lines.forEach((l, i) => ctx.fillText(l, x + 20, y + (label ? 34 : 12) + i * 22));
      ctx.restore();
      return h;
    },

    // Letreiro pequeno espaçado, digitado (local e hora no começo do plano)
    finKicker(ctx, x, y, text, k, color = '#00f5d4', align = 'left') {
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, k * 3);
      ctx.font = '900 14px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = align;
      const s = this.cineType(text, k * 1.15).split('').join(' ');
      ctx.fillStyle = color;
      if (align === 'left') ctx.fillRect(x, y - 9, 4, 18);
      else if (align === 'right') ctx.fillRect(x + 6, y - 9, 4, 18);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(2,6,23,0.85)';
      ctx.strokeText(s, align === 'left' ? x + 14 : x, y);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(s, align === 'left' ? x + 14 : x, y);
      ctx.restore();
    },

    // Fundo guardado pronto (cenário parado e cheio de detalhe)
    finBg(key, w, h, fn) {
      const c = this._finBgC || (this._finBgC = {});
      if (!c[key]) {
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        fn.call(this, cv.getContext('2d'), w, h);
        c[key] = cv;
      }
      return c[key];
    },

    // Estrelinha de 4 pontas (flash de fotógrafo, brilho da torre)
    finSparkle(ctx, x, y, r, a, glow = 'rgba(255,255,255,0.8)') {
      if (a <= 0) return;
      this.cineGlow(ctx, x, y, r * 1.8, glow, a * 0.8);
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

    // Gotas de chuva batendo no chão (anéis achatados)
    finSplashes(ctx, x0, x1, y0, y1, t, n = 30, color = '191,219,254') {
      ctx.save();
      ctx.lineWidth = 1.5;
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.045 + rnd(i, 4)) % 1;
        const x = x0 + rnd(i, 2) * (x1 - x0);
        const y = y0 + rnd(i + Math.floor(t * 0.045 + rnd(i, 4)), 3) * (y1 - y0);
        const sc = 0.5 + ((y - y0) / Math.max(1, y1 - y0)) * 0.8;
        ctx.strokeStyle = `rgba(${color},${(1 - ph) * 0.55})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 3 + ph * 14 * sc, (1 + ph * 4) * sc, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    },

    // Gotas paradas na lente da câmera
    finLensDrops(ctx, W, top, bot, seed = 1, n = 9) {
      ctx.save();
      for (let i = 0; i < n; i++) {
        const x = rnd(i, seed) * W;
        const y = top + rnd(i, seed + 3) * (bot - top);
        const r = 6 + rnd(i, seed + 5) * 16;
        ctx.fillStyle = 'rgba(191,219,254,0.10)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(224,242,254,0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x - r * 0.4, y - r * 0.5, Math.max(2, r * 0.22), Math.max(2, r * 0.22));
      }
      ctx.restore();
    },

    // O telão com o Ego (sala da seleção, estádio do Blue Lock)
    finEgoScreen(ctx, x, y, w, h, t, o = {}) {
      const ego = this.getSpeakerCharData('EGO');
      // A parte parada do telão (fundo, grade, rosto, tom e linhas) fica guardada pronta
      const W0 = Math.ceil(w);
      const H0 = Math.ceil(h);
      const still = this.finBg(`fin_ego|${W0}|${H0}|${o.size || 0}|${o.fx ?? 0.5}|${o.fy ?? 0.42}`, W0, H0, (g) => {
        this.cineGradient(g, 0, 0, W0, H0, [[0, '#06283a'], [1, '#020b16']]);
        g.strokeStyle = 'rgba(0,245,212,0.10)';
        g.lineWidth = 1;
        g.beginPath();
        for (let gx = 17; gx < W0; gx += 34) {
          g.moveTo(gx, 0);
          g.lineTo(gx, H0);
        }
        for (let gy = 17; gy < H0; gy += 34) {
          g.moveTo(0, gy);
          g.lineTo(W0, gy);
        }
        g.stroke();
        this.finHead(g, ego, W0 * (o.fx ?? 0.5), H0 * (o.fy ?? 0.42), o.size || H0 * 1.8);
        g.fillStyle = 'rgba(0,245,212,0.08)';
        g.fillRect(0, 0, W0, H0);
        this.finFillPat(g, 'scan', 0, 0, W0, H0, 0.8);
      });
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.drawImage(still, x, y, w, h);
      const by = y + ((t * 2.4) % (h + 120)) - 60;
      const g = ctx.createLinearGradient(0, by - 50, 0, by + 50);
      g.addColorStop(0, 'rgba(0,245,212,0)');
      g.addColorStop(0.5, 'rgba(0,245,212,0.10)');
      g.addColorStop(1, 'rgba(0,245,212,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, by - 50, w, 100);
      if (o.ticker) {
        ctx.fillStyle = 'rgba(2,6,23,0.88)';
        ctx.fillRect(x, y + h - 30, w, 30);
        ctx.fillStyle = '#00f5d4';
        ctx.fillRect(x, y + h - 30, w, 2);
        ctx.font = '900 14px "Segoe UI", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#e2e8f0';
        const tw = ctx.measureText(o.ticker).width + 60;
        for (let tx = x - ((t * 1.6) % tw); tx < x + w; tx += tw) ctx.fillText(o.ticker, tx, y + h - 14);
      }
      if (o.live) {
        ctx.fillStyle = 'rgba(2,6,23,0.8)';
        ctx.fillRect(x + 14, y + 14, 100, 26);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x + 30, y + 27, 6, 0, TAU);
        ctx.fill();
        ctx.font = '900 14px "Segoe UI", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('AO VIVO', x + 44, y + 28);
      }
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      this.glowStroke(ctx, '#00f5d4', 3);
      ctx.restore();
    },

    // Cabeças da plateia em silhueta com luz de recorte; alguns com o celular erguido
    finCrowdHeads(ctx, W, t, rows, rim, phones = true, color = '#01030a') {
      rows.forEach((row, r) => {
        const s = row.s;
        const step = 88 * s;
        for (let i = -1; i * step < W + step; i++) {
          const x = i * step + (r % 2) * step * 0.5 + Math.sin(i * 3.1 + r) * 10 * s;
          const y = row.y + Math.sin(i * 1.7 + r * 2) * 6 * s - (row.rise ? row.rise(i, x) : 0);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y - 30 * s, 22 * s, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x, y + 26 * s, 44 * s, 34 * s, 0, Math.PI, TAU);
          ctx.fill();
          ctx.fillRect(x - 44 * s, y + 25 * s, 88 * s, 200 * s);
          if (rim) {
            ctx.strokeStyle = rim;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y - 30 * s, 22 * s, Math.PI * 1.1, Math.PI * 1.9);
            ctx.stroke();
          }
          if (phones && rnd(i + 3, r + 1) < 0.2) {
            const px = x + 26 * s;
            const py = y - 74 * s;
            ctx.fillStyle = color;
            ctx.fillRect(px - 4 * s, py, 8 * s, 60 * s);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(px - 11 * s, py - 20 * s, 22 * s, 34 * s);
            ctx.fillStyle = 'rgba(165,243,252,0.85)';
            ctx.fillRect(px - 9 * s, py - 18 * s, 18 * s, 30 * s);
            this.cineGlow(ctx, px, py - 3 * s, 34 * s, 'rgba(165,243,252,0.5)', 0.6);
          }
        }
      });
    },

    // Câmera de TV em silhueta (primeiro plano)
    finTvCam(ctx, x, y, s, dir) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s * dir, s);
      ctx.strokeStyle = '#02050b';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, 30);
      ctx.lineTo(-55, 240);
      ctx.moveTo(0, 30);
      ctx.lineTo(48, 240);
      ctx.moveTo(0, 30);
      ctx.lineTo(0, 240);
      ctx.stroke();
      ctx.fillStyle = '#02050b';
      ctx.fillRect(-70, -40, 122, 72);
      ctx.fillRect(50, -30, 74, 48);
      ctx.fillRect(-62, -64, 62, 26);
      ctx.strokeStyle = 'rgba(45,212,191,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-70, -40);
      ctx.lineTo(50, -40);
      ctx.lineTo(50, -30);
      ctx.lineTo(124, -30);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-56, -30, 7, 7);
      ctx.restore();
    },

    // Túnel do vestiário para o campo, com a luz estourada lá no fim
    finTunnel(ctx, W, H, t) {
      const ox0 = 548;
      const ox1 = 732;
      const oy0 = 236;
      const oy1 = 430;
      const quad = (pts, c) => {
        ctx.fillStyle = c;
        poly(ctx, pts);
        ctx.fill();
      };
      quad([[-200, -200], [ox0, oy0], [ox0, oy1], [-200, H + 200]], '#0a1428');
      quad([[W + 200, -200], [ox1, oy0], [ox1, oy1], [W + 200, H + 200]], '#09122a');
      quad([[-200, -200], [W + 200, -200], [ox1, oy0], [ox0, oy0]], '#050a17');
      quad([[-200, H + 200], [W + 200, H + 200], [ox1, oy1], [ox0, oy1]], '#0d1a35');
      ctx.strokeStyle = 'rgba(56,189,248,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      [[-200, 160, ox0, oy0 + 40], [W + 200, 160, ox1, oy0 + 40], [-200, 760, ox0, oy1 - 20], [W + 200, 760, ox1, oy1 - 20]].forEach(([a, b, c, d]) => {
        ctx.moveTo(a, b);
        ctx.lineTo(c, d);
      });
      ctx.stroke();
      // A boca do túnel: o estádio estourado de luz
      this.cineGradient(ctx, ox0, oy0, ox1 - ox0, oy1 - oy0, [[0, '#f0f9ff'], [0.62, '#bae6fd'], [1, '#86efac']]);
      ctx.fillStyle = 'rgba(30,64,175,0.22)';
      for (let r = 0; r < 4; r++) for (let i = 0; i < 18; i++) ctx.fillRect(ox0 + 4 + i * 10 + (r % 2) * 5, oy0 + 50 + r * 12, 5, 5);
      this.cineGlow(ctx, 640, 334, 420, 'rgba(224,242,254,0.55)');
      this.cineShafts(ctx, 640, 334, Math.PI / 2, 760, 2.7, 9, '224,242,254', 0.08, t);
      const fl = ctx.createLinearGradient(0, oy1, 0, H);
      fl.addColorStop(0, 'rgba(186,230,253,0.35)');
      fl.addColorStop(1, 'rgba(186,230,253,0)');
      ctx.fillStyle = fl;
      poly(ctx, [[ox0, oy1], [ox1, oy1], [ox1 + 260, H], [ox0 - 260, H]]);
      ctx.fill();
    },

    // Camisa da seleção em pixel art (de costas), pendurada no cabide
    finJerseyCv(num) {
      if (this._finJersey?.num === num) return this._finJersey.cv;
      const cv = document.createElement('canvas');
      cv.width = 40;
      cv.height = 46;
      const g = cv.getContext('2d');
      const body = [[14, 2], [26, 2], [34, 5], [40, 16], [34, 20], [32, 15], [32, 45], [8, 45], [8, 15], [6, 20], [0, 16], [6, 5]];
      poly(g, body);
      g.fillStyle = '#1d4ed8';
      g.fill();
      g.save();
      poly(g, body);
      g.clip();
      g.fillStyle = '#1e40af';
      g.fillRect(26, 0, 14, 46);
      g.fillStyle = '#1e3a8a';
      g.fillRect(0, 41, 40, 5);
      g.fillStyle = '#3b82f6';
      g.fillRect(9, 7, 2, 33);
      g.fillStyle = '#f8fafc';
      g.fillRect(14, 2, 12, 2);
      g.restore();
      g.strokeStyle = '#f8fafc';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(1, 15);
      g.lineTo(6.5, 18.5);
      g.moveTo(39, 15);
      g.lineTo(33.5, 18.5);
      g.stroke();
      poly(g, body);
      g.strokeStyle = '#020617';
      g.lineWidth = 1;
      g.stroke();
      g.font = '900 17px monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#020617';
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => g.fillText(num, 20 + dx, 29 + dy));
      g.fillStyle = '#f8fafc';
      g.fillText(num, 20, 29);
      const img = g.getImageData(0, 0, 40, 46);
      for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 100 ? 255 : 0;
      g.putImageData(img, 0, 0);
      this._finJersey = { num, cv };
      return cv;
    },

    // A Bola de Ouro: esfera dourada com gomos girando devagar, na base
    finGoldBall(ctx, x, y, r, t) {
      ctx.save();
      const gb = ctx.createLinearGradient(x - r, 0, x + r, 0);
      gb.addColorStop(0, '#78350f');
      gb.addColorStop(0.45, '#fcd34d');
      gb.addColorStop(1, '#92400e');
      ctx.fillStyle = gb;
      poly(ctx, [[x - r * 0.32, y + r * 0.8], [x + r * 0.32, y + r * 0.8], [x + r * 0.62, y + r * 1.55], [x - r * 0.62, y + r * 1.55]]);
      ctx.fill();
      ctx.fillRect(x - r * 0.78, y + r * 1.52, r * 1.56, r * 0.24);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - r * 0.78, y + r * 1.72, r * 1.56, r * 0.06);
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r);
      g.addColorStop(0, '#fffbeb');
      g.addColorStop(0.3, '#fde047');
      g.addColorStop(0.75, '#ca8a04');
      g.addColorStop(1, '#713f12');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.clip();
      ctx.strokeStyle = 'rgba(120,53,15,0.5)';
      ctx.lineWidth = Math.max(1.5, r * 0.035);
      for (let i = 0; i < 4; i++) {
        const ph = ((t * 0.006 + i / 4) % 1) * Math.PI;
        ctx.beginPath();
        ctx.ellipse(x, y, Math.max(0.5, Math.abs(Math.cos(ph)) * r), r, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.32, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = Math.max(2, r * 0.04);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.stroke();
      this.cineGlow(ctx, x - r * 0.38, y - r * 0.42, r * 0.55, 'rgba(255,255,255,0.85)', 0.9);
      ctx.restore();
    },

    // Torre Eiffel em silhueta com a estrutura dourada acesa
    finEiffel(ctx, x, baseY, h, t) {
      const w = h * 0.4;
      const yAt = (k) => baseY - h * k;
      const half = (k) => (w / 2) * Math.pow(1 - k, 1.9) + w * 0.025;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - half(0), baseY);
      for (let k = 0; k <= 1.0001; k += 0.05) ctx.lineTo(x - half(k), yAt(k * 0.94));
      ctx.lineTo(x, yAt(1));
      for (let k = 1; k >= -0.0001; k -= 0.05) ctx.lineTo(x + half(k), yAt(k * 0.94));
      ctx.lineTo(x + half(0) * 0.62, baseY);
      ctx.quadraticCurveTo(x, baseY - h * 0.2, x - half(0) * 0.62, baseY);
      ctx.closePath();
      ctx.fillStyle = '#120a22';
      ctx.fill();
      ctx.strokeStyle = 'rgba(251,191,36,0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Treliça dourada e as plataformas
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(251,191,36,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k < 0.94; k += 0.045) {
        const y0 = yAt(k);
        const y1 = yAt(k + 0.045);
        ctx.moveTo(x - half(k), y0);
        ctx.lineTo(x + half(k + 0.045), y1);
        ctx.moveTo(x + half(k), y0);
        ctx.lineTo(x - half(k + 0.045), y1);
      }
      ctx.stroke();
      ctx.restore();
      [0.2, 0.42, 0.72].forEach((k) => {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x - half(k) - 6, yAt(k) - 3, half(k) * 2 + 12, 5);
      });
      this.cineGlow(ctx, x, yAt(1) + 6, 26, 'rgba(253,224,71,0.9)', 0.8);
      // Brilhinhos que acendem e apagam devagar (nada de piscar a tela)
      for (let i = 0; i < 14; i++) {
        const k = rnd(i, 21) * 0.9;
        const sx = x + (rnd(i, 22) - 0.5) * 2 * half(k) * 0.9;
        const a = Math.max(0, Math.sin(t * 0.05 + i * 2.3));
        this.finSparkle(ctx, sx, yAt(k), 5 + rnd(i, 23) * 4, a * 0.9, 'rgba(253,230,138,0.7)');
      }
      ctx.restore();
    },

    // O monstro de quem você é: uma fera de sombra carmesim (sem copiar o boneco)
    finYouMonster(ctx, x, cy, R, t, k) {
      if (k <= 0) return;
      const RR = R * (0.55 + 0.45 * k);
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= 56; i++) {
        const a = (i / 56) * TAU;
        const up = Math.max(0, -Math.sin(a));
        const tongue = Math.pow(Math.abs(Math.sin(a * 4.5 + t * 0.06)), 3);
        const r = RR * (0.82 + up * (0.25 + 0.45 * tongue) + Math.sin(a * 11 - t * 0.05) * 0.035);
        const px = x + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r * 0.92;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.94 * k;
      ctx.fillStyle = '#1c0307';
      ctx.fill();
      ctx.globalAlpha = k;
      this.glowStroke(ctx, '#ef4444', 3);
      // Redemoinho de brasas por dentro
      ctx.strokeStyle = 'rgba(239,68,68,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 6; a += 0.14) {
        const r = (8 + a * 11) * (RR / 300);
        const px = x + Math.cos(a - t * 0.03) * r * 2.2;
        const py = cy + Math.sin(a - t * 0.03) * r * 1.8;
        if (a) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
      // Os olhos (pixel art) e a bocarra com dentes
      const ey = cy - RR * 0.2;
      [-1, 1].forEach((s) => {
        this.cineGlow(ctx, x + s * RR * 0.34, ey, RR * 0.22, 'rgba(239,68,68,0.6)', k);
        this.drawPixelEye(ctx, x + s * RR * 0.34, ey, RR * 0.026, { line: '#ef4444', white: '#fee2e2', iris: '#450a0a', ring: '#f87171', tiny: true, look: s });
      });
      const mw = RR * 0.62;
      const my = cy + RR * 0.26;
      const mh = RR * (0.14 + Math.abs(Math.sin(t * 0.04)) * 0.06);
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(x, my, mw, mh, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fee2e2';
      const n = 9;
      for (let i = 0; i < n; i++) {
        const tx = x - mw * 0.88 + (i + 0.5) * ((mw * 1.76) / n);
        const tw = (mw * 1.76) / n / 2;
        const edge = Math.sqrt(Math.max(0, 1 - ((tx - x) / mw) ** 2)) * mh;
        ctx.beginPath();
        ctx.moveTo(tx - tw, my - edge);
        ctx.lineTo(tx + tw, my - edge);
        ctx.lineTo(tx, my - edge + mh * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tx - tw, my + edge);
        ctx.lineTo(tx + tw, my + edge);
        ctx.lineTo(tx, my + edge - mh * 0.7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    // Placar final do duelo (o MatchEngine guarda o último jogo; se não fizer sentido, 3 x 2)
    finScore() {
      const ME = window.MatchEngine;
      let h = ME?.scoreHome;
      let a = ME?.scoreAway;
      if (!(h >= 3 && a >= 0 && h > a && h < 10)) {
        h = 3;
        a = 2;
      }
      return [h, a];
    },

    // Criança genérica (campinho)
    finKid(i, extra = {}) {
      const skins = ['#8d5524', '#c68642', '#f1c27d', '#6b4423'];
      const hairs = ['#1c1917', '#3f2a1d', '#0f172a', '#451a03'];
      const shirts = [['#facc15', '#16a34a'], ['#ef4444', '#ffffff'], ['#22c55e', '#facc15'], ['#3b82f6', '#ffffff']];
      return Object.assign({
        id: 'fin_kid' + i, name: 'Criança ' + i, skinColor: skins[i % 4], hairColor: hairs[i % 4], hairSecondary: hairs[(i + 1) % 4], eyeColor: '#3f2a1d',
        hairStyle: ['soft_side', 'spiky_tall', 'short_sharp', 'soft_curls'][i % 4], eyeStyle: 'round', jerseyPrimary: shirts[i % 4][0], jerseySecondary: shirts[i % 4][1], auraColor: '#facc15'
      }, extra);
    },

    // Painel de mangá (como o cinePanel, mas refaz o contorno depois do draw(): o draw()
    // troca o caminho atual e o traço saía numa linha solta no meio da tela)
    finPanel(ctx, pts, draw, opts = {}) {
      const { dx = 0, dy = 0, border = '#f8fafc', width = 6 } = opts;
      ctx.save();
      ctx.translate(dx, dy);
      poly(ctx, pts);
      ctx.save();
      ctx.clip();
      draw();
      ctx.restore();
      poly(ctx, pts);
      ctx.lineJoin = 'miter';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = width + 4;
      ctx.stroke();
      ctx.strokeStyle = border;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.restore();
    },

    // Página de mangá: painéis que entram deslizando, cada um com a sua caixa de texto
    finPage(ctx, S, panels) {
      const { W, H, t, top, bot } = S;
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, W, H);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      panels.forEach((p) => {
        const k = ease(seg(t, p.at, p.at + 16));
        if (k <= 0) return;
        const off = (1 - k) * 520;
        const [dx, dy] = p.from === 'right' ? [off, 0] : p.from === 'bottom' ? [0, off] : p.from === 'top' ? [0, -off] : [-off, 0];
        this.finPanel(ctx, p.pts, () => p.draw(t - p.at), { dx, dy });
      });
      panels.forEach((p) => {
        (p.boxes || []).forEach((b) => this.finBox(ctx, b.x, b.y, b.w, b.label, b.text, b.color, seg(t, p.at + (b.at ?? 22), p.at + (b.at ?? 22) + 14)));
      });
    }
  });

  // ==========================================================================
  // 1. A CONVOCAÇÃO — o telão → os 26 nomes → os óculos do Ego → a camisa 11 → você
  // ==========================================================================
  CE.registerCine('convocation_call', {
    phases: [180, 210, 160, 150, 190],
    music: 'epic',
    title: '📣 A CONVOCAÇÃO',
    tags: ['PLANO 1 • A SEDE DA SELEÇÃO', 'PLANO 2 • OS 26 NOMES', 'PLANO 3 • CAMISA 11', 'PLANO 4 • A CAMISA', 'PLANO 5 • CONVOCADO'],
    get subs() {
      const n = CE.cinePlayerName();
      // "SEDE DA JFU • TÓQUIO • 23:00", os nomes no telão (com o contador e o "CAMISA 11 • ???"),
      // o "CAMISA 11" e a cartela com o seu nome já estão na imagem
      return [
        [{ from: 10, who: 'JINPACHI EGO', text: '"26 nomes. Nem um a mais."', color: '#00f5d4' }],
        [{ from: 4, who: 'JINPACHI EGO', text: '"Sae. Rin. Shidou. Bachira. Nagi..."', color: '#00f5d4' }],
        [{ from: 0, who: 'JINPACHI EGO', text: '"E o atacante titular..."', color: '#00f5d4' }],
        [{ from: 6, who: 'NARRADOR', text: 'A camisa 11 já tem dono.', color: '#94a3b8' }],
        [{ from: 10, who: 'NARRADOR', text: `${n}: convocado para a Copa.`, color: '#94a3b8' }]
      ];
    },
    draw(ctx, S) {
      this.finConv(ctx, S);
    }
  });

  CE.finConv = function (ctx, S) {
    const { W, H, t, phase, top, bot } = S;
    const name = this.cinePlayerName();
    if (phase === 0) {
      // A sede: o telão gigante com o Ego, câmeras e a plateia de costas
      const k = easeIO(t / 180);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#020611'], [0.55, '#061633'], [1, '#02050d']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(372, 300, k), zoom: lerp(1, 1.24, k), shake: 0.5 });
      ctx.fillStyle = '#081227';
      for (let i = -2; i < 12; i++) ctx.fillRect(i * 140, 60, 4, 560);
      ctx.fillStyle = 'rgba(0,245,212,0.10)';
      ctx.fillRect(-200, 452, W + 400, 3);
      this.cineGlow(ctx, 640, 265, 420, 'rgba(0,245,212,0.22)');
      this.finEgoScreen(ctx, 330, 110, 620, 310, t, { size: 560, fy: 0.42, live: true, ticker: 'CONVOCAÇÃO OFICIAL • SELEÇÃO JAPONESA • COPA DO MUNDO • TÉCNICO: JINPACHI EGO' });
      this.cineShafts(ctx, 640, 410, Math.PI / 2, 420, 1.6, 7, '94,234,212', 0.08, t);
      ctx.restore();
      this.cineDust(ctx, W, H, t, 30, 'rgba(153,246,228,0.55)', 5);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360 + k * 8, zoom: lerp(1, 1.07, k) });
      this.finCrowdHeads(ctx, W, t, [{ y: 520, s: 0.85 }, { y: 590, s: 1.05 }, { y: 680, s: 1.3 }], 'rgba(45,212,191,0.6)');
      this.finTvCam(ctx, 120, 540, 1.25, 1);
      this.finTvCam(ctx, 1160, 556, 1.35, -1);
      ctx.restore();
      this.finKicker(ctx, 40, top + 32, 'SEDE DA JFU • TÓQUIO • 23:00', seg(t, 6, 50));
    } else if (phase === 1) {
      // O telão de perto: a lista rolando, o rosto de cada convocado à esquerda
      ctx.drawImage(this.finBg('fin_led', W, H, (g) => {
        this.cineGradient(g, 0, 0, W, H, [[0, '#031327'], [1, '#020814']]);
        this.finFillPat(g, 'dots', 0, top, W, bot - top, 0.9);
      }), 0, 0);
      let pos;
      if (t < 132) {
        const c = Math.floor(t / 22);
        pos = c - 1 + ease(seg(t - c * 22, 0, 9));
      } else pos = 5 + 19 * easeIO(seg(t, 132, 200));
      const rowH = 58;
      const cy = 380;
      ctx.save();
      ctx.beginPath();
      ctx.rect(560, top + 74, W - 560, bot - top - 74);
      ctx.clip();
      ctx.fillStyle = 'rgba(0,245,212,0.16)';
      ctx.fillRect(560, cy - rowH / 2, W - 560, rowH);
      ctx.fillStyle = '#00f5d4';
      ctx.fillRect(560, cy - rowH / 2, 6, rowH);
      const n = CONV_NAMES.length;
      for (let i = Math.max(0, Math.floor(pos) - 6); i <= Math.min(n, Math.ceil(pos) + 6); i++) {
        const y = cy + (i - pos) * rowH;
        const d = Math.abs(i - pos);
        const isYou = i === n;
        const [nm, role] = isYou ? ['? ? ?', 'CAMISA 11'] : CONV_NAMES[i];
        ctx.globalAlpha = Math.max(0.14, 1 - d * 0.2);
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.font = '900 18px "Segoe UI", sans-serif';
        ctx.fillStyle = d < 0.5 ? '#00f5d4' : '#64748b';
        ctx.fillText(String(i + 1).padStart(2, '0'), 590, y);
        ctx.font = `italic 900 ${d < 0.5 ? 38 : 30}px "Segoe UI", sans-serif`;
        ctx.fillStyle = isYou ? '#facc15' : d < 0.5 ? '#ffffff' : '#cbd5e1';
        ctx.fillText(nm, 640, y);
        ctx.font = '800 14px "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = isYou ? '#facc15' : '#7dd3fc';
        ctx.fillText(role, W - 40, y);
      }
      ctx.restore();
      // Cabeçalho e contador
      ctx.fillStyle = 'rgba(2,6,23,0.85)';
      ctx.fillRect(560, top + 14, W - 580, 54);
      ctx.fillStyle = '#00f5d4';
      ctx.fillRect(560, top + 66, W - 580, 2);
      this.finKicker(ctx, 580, top + 41, 'CONVOCAÇÃO OFICIAL', 1);
      const cnt = Math.min(25, Math.max(1, Math.round(pos) + 1));
      this.finPixelText(ctx, `${String(cnt).padStart(2, '0')}/26`, W - 40, top + 41, 3.2, '#00f5d4', 'right');
      // O painel com o rosto
      const c = t < 132 ? Math.min(5, Math.floor(t / 22)) : -1;
      const local = t < 132 ? t - c * 22 : t - 132;
      this.finPanel(ctx, [[36, top + 18], [540, top + 18], [496, bot - 18], [36, bot - 18]], () => {
        const slide = (1 - ease(local / 9)) * -280;
        if (c >= 0) {
          const ch = this.cineChar(CONV_NAMES[c][2], this.KITS.japan);
          const aura = ch.auraColor || '#38bdf8';
          this.cineGradient(ctx, 0, top, 560, bot - top, [[0, this.finShade(aura, -0.5)], [1, '#020617']]);
          this.drawRadialSpeedLines(ctx, 280 + slide, 330, 700, aura, 0.2);
          ctx.font = 'italic 900 230px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillText(String(c + 1).padStart(2, '0'), 300, 400);
          this.finHead(ctx, ch, 280 + slide, top + 250, 700);
          ctx.fillStyle = 'rgba(2,6,23,0.88)';
          ctx.fillRect(36, bot - 92, 500, 60);
          ctx.fillStyle = aura;
          ctx.fillRect(36, bot - 92, 500, 4);
          ctx.textAlign = 'left';
          ctx.font = 'italic 900 30px "Segoe UI", sans-serif';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(CONV_NAMES[c][0], 60 + slide * 0.3, bot - 60);
        } else {
          this.cineGradient(ctx, 0, top, 560, bot - top, [[0, '#2a1d02'], [1, '#020617']]);
          this.drawRadialSpeedLines(ctx, 280, 330, 700, '#facc15', 0.14);
          this.finHead(ctx, this.cineYou(this.KITS.japan), 280, top + 250, 700, { tint: '#010205' });
          this.cineImpactText(ctx, '?', 280, top + 230, 150, '#facc15', ease(local / 10));
          ctx.fillStyle = 'rgba(2,6,23,0.88)';
          ctx.fillRect(36, bot - 92, 500, 60);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(36, bot - 92, 500, 4);
          ctx.textAlign = 'left';
          ctx.font = 'italic 900 30px "Segoe UI", sans-serif';
          ctx.fillText('CAMISA 11 • ???', 60, bot - 60);
        }
      });
    } else if (phase === 2) {
      // Close extremo nos óculos do Ego (pixel art ampliada): o "11" aparece refletido nas lentes
      const ego = this.getSpeakerCharData('EGO');
      const z = lerp(1, 1.22, easeIO(t / 160));
      const shx = this.cineNoise(S.f * 1.3, 3) * 2;
      const shy = this.cineNoise(S.f * 1.1, 4) * 1.5;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#06283a'], [1, '#020b16']]);
      const uw = 25 / z;
      const U = W / uw;
      const uh = (bot - top) / U;
      const ux = 18 - uw / 2;
      const uy = 10.3 - uh / 2;
      this.finCrop(ctx, ego, {}, ux, uy, uw, uh, shx, top + shy, W, bot - top);
      const toX = (x) => shx + (x - ux) * U;
      const toY = (y) => top + shy + (y - uy) * U;
      [12.4, 19.4].forEach((gx, i) => {
        const lx = toX(gx + 0.7);
        const ly = toY(9.3);
        const lw = 2.8 * U;
        const lh = 2.1 * U;
        ctx.save();
        ctx.beginPath();
        ctx.rect(lx, ly, lw, lh);
        ctx.clip();
        ctx.fillStyle = 'rgba(0,245,212,0.12)';
        ctx.fillRect(lx, ly, lw, lh);
        if (t > 62) {
          ctx.globalAlpha = 0.75 * seg(t, 62, 92);
          this.finPixelText(ctx, '11', lx + lw * 0.62, ly + lh * 0.62, U * 0.1, '#5eead4');
          ctx.globalAlpha = 1;
        }
        // O brilho correndo na lente (uma passada só)
        const gp = seg(t, 18 + i * 6, 58 + i * 6);
        if (gp > 0 && gp < 1) {
          const bx = lerp(lx - lw, lx + lw * 1.6, gp);
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          poly(ctx, [[bx, ly], [bx + lw * 0.22, ly], [bx - lw * 0.18, ly + lh], [bx - lw * 0.4, ly + lh]]);
          ctx.fill();
        }
        ctx.restore();
      });
      ctx.fillStyle = 'rgba(0,245,212,0.06)';
      ctx.fillRect(0, top, W, bot - top);
      this.finFillPat(ctx, 'scan', 0, top, W, bot - top, 0.7);
      const by = top + ((t * 3) % (bot - top + 160)) - 80;
      const g = ctx.createLinearGradient(0, by - 60, 0, by + 60);
      g.addColorStop(0, 'rgba(0,245,212,0)');
      g.addColorStop(0.5, 'rgba(0,245,212,0.08)');
      g.addColorStop(1, 'rgba(0,245,212,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, by - 60, W, 120);
      if (t > 92) this.cineImpactText(ctx, 'CAMISA 11', W / 2, bot - 72, 76, '#facc15', seg(t, 92, 106), W * 0.8);
    } else if (phase === 3) {
      // A camisa pendurada no armário, a câmera subindo até o nome
      const k = easeIO(t / 150);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(470, 318, k), zoom: lerp(1.32, 1.06, k), shake: 0.4 });
      ctx.fillStyle = '#050a16';
      ctx.fillRect(-300, -300, W + 600, H + 600);
      this.cineGradient(ctx, 380, 60, 520, 760, [[0, '#0e1c38'], [1, '#060c1a']]);
      ctx.fillStyle = '#13244a';
      ctx.fillRect(352, 50, 32, 800);
      ctx.fillRect(896, 50, 32, 800);
      ctx.fillStyle = '#0b1630';
      for (let y = 160; y < 700; y += 18) {
        ctx.fillRect(360, y, 16, 6);
        ctx.fillRect(904, y, 16, 6);
      }
      ctx.fillStyle = '#1b2d55';
      ctx.fillRect(352, 96, 576, 20);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(552, 70, 176, 26);
      ctx.fillStyle = '#334155';
      ctx.fillRect(552, 94, 176, 2);
      ctx.font = '900 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`11 • ${name}`.slice(0, 22), 640, 84);
      this.cineShafts(ctx, 640, 118, Math.PI / 2, 620, 0.55, 5, '219,234,254', 0.15, t);
      this.cineGlow(ctx, 640, 340, 340, 'rgba(147,197,253,0.3)');
      // Cabide
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(640, 182);
      ctx.lineTo(640, 162);
      ctx.arc(652, 162, 12, Math.PI, Math.PI * 1.9);
      ctx.moveTo(640, 182);
      ctx.lineTo(520, 214);
      ctx.moveTo(640, 182);
      ctx.lineTo(760, 214);
      ctx.stroke();
      const sc = 8;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.finJerseyCv('11'), 640 - 20 * sc, 360 - 23 * sc + 18, 40 * sc, 46 * sc);
      ctx.restore();
      ctx.globalAlpha = seg(t, 30, 70);
      this.finPixelText(ctx, name, 640, 360 - 23 * sc + 18 + 12 * sc, sc * 0.55, '#f8fafc', 'center', 22 * sc);
      ctx.globalAlpha = 1;
      ctx.restore();
      this.cineDust(ctx, W, H, t, 36, 'rgba(219,234,254,0.6)', 8);
    } else {
      // Você de costas com a 11, de frente para a luz do campo
      const k = easeIO(t / 190);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(380, 404, k), zoom: lerp(1, 1.1, k), shake: 0.6 });
      this.finTunnel(ctx, W, H, t);
      const you = this.cineYou(this.KITS.japan);
      const size = 540;
      const feet = bot + 104;
      this.finRim(ctx, you, 640, feet, size, { facing: 'back', shirtNumber: 11, dim: 0.5, dimTint: '8,16,40' }, '#bae6fd', [-1, 1], 5);
      const u = size / 36;
      const sTop = feet - size * 0.87;
      ctx.globalAlpha = 0.75;
      this.finPixelText(ctx, name, 640, sTop + (window.PixelRenderer.spritesV2 ? 17.2 : 16.2) * u, u * 0.17, '#e2e8f0', 'center', 11 * u);
      ctx.globalAlpha = 1;
      ctx.restore();
      this.cineDust(ctx, W, H, t, 26, 'rgba(224,242,254,0.6)', 2);
      this.cineTitleCard(ctx, W, top + 78, seg(t, 50, 84), { kicker: 'SELEÇÃO JAPONESA • COPA DO MUNDO', title: name, sub: 'Camisa 11 • atacante titular', color: '#38bdf8' });
      if (t >= 50) this.cineFlash(ctx, W, H, (1 - seg(t, 50, 64)) * 0.5);
      this.cineSfx(S, 50, 'convocado', () => window.SFX?.whoosh?.());
    }
  };

  // ==========================================================================
  // 2. A VÉSPERA — o hotel → o Rin na varanda → o Sae na porta → o Shidou → os quatro
  // ==========================================================================
  CE.registerCine('camp_night', {
    phases: [190, 200, 180, 160, 190],
    music: 'mystery',
    title: '🌃 A VÉSPERA',
    tags: ['PLANO 1 • O HOTEL DA SELEÇÃO', 'PLANO 2 • A VARANDA', 'PLANO 3 • A PORTA', 'PLANO 4 • O BARULHO', 'PLANO 5 • QUATRO EGOS'],
    // "CONCENTRAÇÃO DA SELEÇÃO • 02:47", os três pares de olhos, o "HAHAHA!" e o
    // "4 EGOS. 1 GOL." já estão na imagem
    subs: [
      [{ from: 12, who: 'NARRADOR', text: 'O hotel inteiro dorme... quase.', color: '#94a3b8' }],
      [{ from: 20, who: 'RIN ITOSHI', text: '"...Também não consegue dormir?"', color: '#2dd4bf' }],
      [{ from: 8, who: 'SAE ITOSHI', text: '"Barulho na varanda às três?"', color: '#f472b6' }],
      [{ from: 6, who: 'RYUSEI SHIDOU', text: '"Parece velório aqui!"', color: '#f472b6' }],
      [{ from: 12, who: 'NARRADOR', text: 'Quatro egos. Amanhã, um gol só.', color: '#94a3b8' }]
    ],
    draw(ctx, S) {
      this.finCamp(ctx, S);
    }
  });

  CE.finHotelBg = function (g, w, h) {
    this.cineNightSky(g, w, 700, 0, { top: '#020617', bottom: '#16336e' });
    this.cineCity(g, w, 690, 300, '#0b1a36', 'rgba(147,197,253,0.35)', 3, 0);
    // A torre do hotel
    const x0 = 560;
    const x1 = 820;
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, '#13234a');
    gr.addColorStop(0.7, '#0c1834');
    gr.addColorStop(1, '#070e22');
    g.fillStyle = gr;
    g.fillRect(x0, 120, x1 - x0, 680);
    g.fillStyle = '#0a1430';
    g.fillRect(x0 - 10, 108, x1 - x0 + 20, 14);
    g.fillStyle = '#e2e8f0';
    g.font = '900 15px "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.fillText('HOTEL • JFA', (x0 + x1) / 2, 100);
    for (let r = 0; r < 22; r++) {
      for (let c = 0; c < 8; c++) {
        const wx = x0 + 16 + c * 30;
        const wy = 140 + r * 30;
        if (r === 4 && (c === 5 || c === 6)) continue;
        const q = rnd(r * 8 + c, 9);
        g.fillStyle = q < 0.1 ? 'rgba(253,224,71,0.75)' : q < 0.16 ? 'rgba(147,197,253,0.5)' : '#071026';
        g.fillRect(wx, wy, 18, 18);
      }
    }
    this.cineCity(g, w, 790, 240, '#050b1a', 'rgba(253,224,71,0.5)', 6, 120);
    g.fillStyle = '#04070f';
    g.fillRect(0, 790, w, h - 790);
    g.fillStyle = '#0b1222';
    g.fillRect(0, 790, w, 10);
    g.fillStyle = 'rgba(226,232,240,0.35)';
    for (let x = 0; x < w; x += 70) g.fillRect(x, 852, 34, 3);
  };

  CE.finHallBg = function (g, w, h) {
    const vx = 640;
    const vy = 300;
    const quad = (pts, c) => {
      g.fillStyle = c;
      poly(g, pts);
      g.fill();
    };
    g.fillStyle = '#140b18';
    g.fillRect(0, 0, w, h);
    quad([[0, 0], [vx - 70, vy - 60], [vx - 70, vy + 50], [0, h]], '#2a1730');
    quad([[w, 0], [vx + 70, vy - 60], [vx + 70, vy + 50], [w, h]], '#24132b');
    quad([[0, 0], [w, 0], [vx + 70, vy - 60], [vx - 70, vy - 60]], '#170c1d');
    quad([[0, h], [w, h], [vx + 70, vy + 50], [vx - 70, vy + 50]], '#4a0f1f');
    // Listras do carpete
    g.strokeStyle = 'rgba(251,191,36,0.18)';
    g.lineWidth = 3;
    g.beginPath();
    [-0.6, -0.2, 0.2, 0.6].forEach((f) => {
      g.moveTo(vx + f * 140, vy + 50);
      g.lineTo(vx + f * 2400, h);
    });
    g.stroke();
    // Portas dos quartos dos dois lados
    [0.18, 0.42, 0.62].forEach((k, i) => {
      [-1, 1].forEach((s) => {
        const xa = vx + s * (70 + (640 - 70) * (1 - k));
        const xb = vx + s * (70 + (640 - 70) * (1 - k - 0.12));
        const yt = (x) => vy - 60 + ((vy - 60) / (vx - 70)) * -Math.abs(x - vx) * 0 - (Math.abs(x - vx) - 70) * 0.5;
        const yb = (x) => vy + 50 + (Math.abs(x - vx) - 70) * 0.72;
        g.fillStyle = '#3b1f2c';
        poly(g, [[xa, yt(xa) + (Math.abs(xa - vx) - 70) * 0.25], [xb, yt(xb) + (Math.abs(xb - vx) - 70) * 0.25], [xb, yb(xb)], [xa, yb(xa)]]);
        g.fill();
        g.fillStyle = '#fbbf24';
        g.fillRect((xa + xb) / 2 + s * 8, (yb(xa) + yb(xb)) / 2 - (Math.abs(xa - vx) - 70) * 0.5, 5, 5);
        g.font = '900 12px "Segoe UI", sans-serif';
        g.textAlign = 'center';
        g.fillStyle = 'rgba(253,230,138,0.6)';
        g.fillText(`11${s > 0 ? 2 * i + 2 : 2 * i + 1}`.padEnd(4, '0'), (xa + xb) / 2, yt((xa + xb) / 2) + (Math.abs((xa + xb) / 2 - vx) - 70) * 0.25 + 18);
      });
    });
    g.fillStyle = '#fff7ed';
    g.fillRect(vx - 70, vy - 60, 140, 110);
    g.fillStyle = '#fde68a';
    g.fillRect(vx - 56, vy - 46, 112, 82);
  };

  CE.finCamp = function (ctx, S) {
    const { W, H, t, phase, top, bot } = S;
    if (phase === 0) {
      // O hotel visto de fora: a grua sobe até a única varanda acesa
      const k = easeIO(t / 190);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, 728, k), y: lerp(640, 262, k), zoom: lerp(1, 1.75, k) });
      ctx.drawImage(this.finBg('fin_hotel', W, 960, this.finHotelBg), 0, 0);
      this.cineGlow(ctx, 1080, 120, 120, 'rgba(191,219,254,0.4)');
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(1080, 120, 26, 0, TAU);
      ctx.fill();
      // A varanda da suíte acesa
      const bx = 709;
      const by = 260;
      this.cineGlow(ctx, bx + 25, by - 12, 70, 'rgba(125,211,252,0.6)');
      ctx.fillStyle = 'rgba(165,215,252,0.9)';
      ctx.fillRect(bx - 4, by - 30, 58, 32);
      this.finSpr(ctx, this.cineChar('rin'), bx + 34, by + 2, 34, { tint: '#020617' });
      ctx.fillStyle = '#0b1328';
      ctx.fillRect(bx - 10, by + 2, 70, 5);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 10, by - 10);
      ctx.lineTo(bx + 60, by - 10);
      for (let x = bx - 8; x < bx + 60; x += 6) {
        ctx.moveTo(x, by - 10);
        ctx.lineTo(x, by + 2);
      }
      ctx.stroke();
      // Luz vermelha do topo (acende e apaga devagar)
      this.cineGlow(ctx, 690, 104, 16, 'rgba(239,68,68,0.9)', 0.4 + 0.4 * Math.sin(t * 0.06));
      // Faróis passando na avenida
      for (let i = 0; i < 6; i++) {
        const dir = i % 2 ? 1 : -1;
        const x = ((rnd(i, 4) * W + t * (5 + i) * dir) % (W + 400) + W + 400) % (W + 400) - 200;
        const y = dir > 0 ? 835 : 870;
        const c = dir > 0 ? 'rgba(254,240,138,0.85)' : 'rgba(248,113,113,0.85)';
        const tg = ctx.createLinearGradient(x, 0, x - dir * 140, 0);
        tg.addColorStop(0, c);
        tg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = tg;
        ctx.fillRect(Math.min(x, x - dir * 140), y - 2, 140, 4);
      }
      ctx.restore();
      this.cineBokeh(ctx, W, bot - 90, bot + 20, t, 10, ['rgba(253,224,71,0.35)', 'rgba(147,197,253,0.35)'], 3);
      this.finKicker(ctx, 40, top + 32, 'CONCENTRAÇÃO DA SELEÇÃO • 02:47', seg(t, 8, 60));
    } else if (phase === 1) {
      // De dentro do quarto escuro: o Rin de costas na varanda, a cidade lá fora
      const k = easeIO(t / 200);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 650, y: 360, zoom: lerp(1, 1.1, k), shake: 0.4 });
      this.cineGradient(ctx, 0, 0, W, 580, [[0, '#020617'], [0.65, '#0f2a5a'], [1, '#1e4a7a']]);
      this.cineGlow(ctx, 1000, 180, 110, 'rgba(191,219,254,0.45)');
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(1000, 180, 24, 0, TAU);
      ctx.fill();
      this.cineCity(ctx, W, 580, 280, '#0a1834', 'rgba(147,197,253,0.42)', 4, 60);
      this.cineBokeh(ctx, W, 400, 580, t, 18, ['rgba(253,224,71,0.32)', 'rgba(147,197,253,0.32)'], 4);
      this.cineGradient(ctx, 0, 580, W, 200, [[0, '#0c1529'], [1, '#04070f']]);
      const rin = this.cineChar('rin', { outfit: 'casual', clothesColor: '#1f2a44' });
      this.finRim(ctx, rin, 700, 612, 400, { facing: 'back', dim: 0.35, dimTint: '8,20,50' }, '#93c5fd', [1], 4);
      ctx.fillStyle = '#0f172a';
      for (let x = 268; x < 1020; x += 26) ctx.fillRect(x, 476, 5, 120);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(250, 466, 780, 12);
      ctx.fillRect(250, 592, 780, 8);
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.fillRect(250, 466, 780, 2);
      ctx.restore();
      // Primeiro plano: o batente e a cortina mexendo com o vento (parallax maior)
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 650, y: 360, zoom: lerp(1, 1.17, k) });
      ctx.fillStyle = '#02040a';
      ctx.fillRect(-200, -200, 440, H + 400);
      ctx.fillRect(1040, -200, 440, H + 400);
      ctx.fillRect(-200, -200, W + 400, 300);
      ctx.fillStyle = '#0b1222';
      ctx.fillRect(230, 100, 14, 700);
      ctx.fillRect(1030, 100, 14, 700);
      ctx.fillRect(230, 92, 814, 14);
      ctx.fillStyle = 'rgba(147,197,253,0.35)';
      ctx.fillRect(242, 106, 2, 700);
      const sway = Math.sin(t * 0.04) * 26;
      ctx.fillStyle = 'rgba(148,163,184,0.16)';
      ctx.beginPath();
      ctx.moveTo(920, 106);
      ctx.lineTo(1040, 106);
      ctx.lineTo(1040, 760);
      ctx.bezierCurveTo(1000, 700, 960 + sway, 520, 900 + sway * 1.4, 760);
      ctx.bezierCurveTo(930 + sway, 500, 905 + sway * 0.6, 300, 920, 106);
      ctx.fill();
      ctx.strokeStyle = 'rgba(191,219,254,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    } else if (phase === 2) {
      // Mangá: o Sae na porta (luz do corredor) / o olho do Rin / os seus olhos
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, W, H);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      const sA = ease(seg(t, 0, 16));
      const sB = ease(seg(t, 40, 56));
      const sC = ease(seg(t, 85, 101));
      this.finPanel(ctx, [[24, top + 14], [700, top + 14], [612, bot - 14], [24, bot - 14]], () => {
        const z = lerp(1.06, 1, easeIO(t / 180));
        ctx.save();
        ctx.translate(330, 380);
        ctx.scale(z, z);
        ctx.translate(-330, -380);
        ctx.fillStyle = '#04070f';
        ctx.fillRect(0, 0, 720, H);
        const dx0 = 200;
        const dx1 = 430;
        const dy0 = top + 40;
        const dy1 = bot - 80;
        this.cineGradient(ctx, dx0, dy0, dx1 - dx0, dy1 - dy0, [[0, '#fef3c7'], [1, '#f59e0b']]);
        ctx.fillStyle = 'rgba(146,64,14,0.35)';
        poly(ctx, [[dx0, dy0], [dx0 + 60, dy0 + 70], [dx0 + 60, dy1 - 50], [dx0, dy1]]);
        ctx.fill();
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const wg = ctx.createLinearGradient(0, dy1, 0, bot);
        wg.addColorStop(0, 'rgba(251,191,36,0.38)');
        wg.addColorStop(1, 'rgba(251,191,36,0.06)');
        ctx.fillStyle = wg;
        poly(ctx, [[dx0, dy1], [dx1, dy1], [dx1 + 280, bot + 20], [dx0 + 30, bot + 20]]);
        ctx.fill();
        ctx.restore();
        const sae = this.cineChar('sae', { outfit: 'casual', clothesColor: '#e5e7eb' });
        ctx.save();
        ctx.translate(dx0 + 70, dy1 + 6);
        ctx.rotate(-0.05);
        this.finRim(ctx, sae, 0, 0, 340, { dim: 0.5, dimTint: '30,18,6' }, '#fde68a', [-1, 1], 4);
        ctx.restore();
        ctx.fillStyle = '#0b0f1a';
        poly(ctx, [[dx1, dy0], [dx1 + 70, dy0 - 22], [dx1 + 70, dy1 + 34], [dx1, dy1]]);
        ctx.fill();
        ctx.restore();
      }, { dx: (1 - sA) * -720 });
      if (sB > 0) {
        this.finPanel(ctx, [[716, top + 14], [1256, top + 14], [1256, 354], [690, 354]], () => {
          this.cineGradient(ctx, 680, top, 600, 280, [[0, '#071533'], [1, '#020617']]);
          const z = 1 + easeIO(seg(t, 40, 180)) * 0.08;
          const dw = 640 * z;
          this.finEyes(ctx, this.cineChar('rin'), 973 - dw / 2, 227 - (dw / 14) * 3.1, dw, { look: -2, half: true, ring: '#2dd4bf', iris: '#0f766e' });
          const lg = ctx.createLinearGradient(690, 0, 1256, 0);
          lg.addColorStop(0, 'rgba(2,6,23,0.75)');
          lg.addColorStop(0.45, 'rgba(2,6,23,0)');
          lg.addColorStop(1, 'rgba(147,197,253,0.16)');
          ctx.fillStyle = lg;
          ctx.fillRect(680, top, 600, 280);
        }, { dx: (1 - sB) * 600 });
      }
      if (sC > 0) {
        this.finPanel(ctx, [[680, 370], [1256, 370], [1256, bot - 14], [596, bot - 14]], () => {
          this.cineGradient(ctx, 590, 360, 680, 280, [[0, '#0a1024'], [1, '#03050c']]);
          const you = this.cineYou();
          const dw = 660;
          this.finEyes(ctx, you, 926 - dw / 2, 495 - (dw / 14) * 3.1, dw, { look: t < 140 ? -2 : 2 });
          const lg = ctx.createLinearGradient(0, 370, 0, bot);
          lg.addColorStop(0, 'rgba(2,6,23,0)');
          lg.addColorStop(1, 'rgba(2,6,23,0.6)');
          ctx.fillStyle = lg;
          ctx.fillRect(590, 360, 680, 280);
        }, { dy: (1 - sC) * 320 });
      }
    } else if (phase === 3) {
      // O Shidou abrindo a porta do corredor gargalhando (aura rosa, boca aberta)
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.04 + Math.sin(t * 0.08) * 0.012, shake: t < 60 ? 5 : 2 });
      ctx.drawImage(this.finBg('fin_hall', W, H, this.finHallBg), 0, 0);
      [[300, 190], [980, 190], [470, 250], [810, 250]].forEach(([x, y]) => this.cineGlow(ctx, x, y, 90, 'rgba(253,186,116,0.55)'));
      this.drawRadialSpeedLines(ctx, 640, 360, W, '#f9a8d4', 0.16);
      const shidou = this.cineChar('shidou', { outfit: 'casual', clothesColor: '#be185d' });
      this.finRim(ctx, shidou, 640, bot + 150, 650, { showAura: true }, '#f9a8d4', [-1, 1], 5);
      ctx.restore();
      const letters = ['H', 'A', 'H', 'A', 'H', 'A', '!'];
      letters.forEach((ch, i) => {
        const k = seg(t, 8 + i * 5, 18 + i * 5);
        if (k <= 0) return;
        const x = 250 + i * 130;
        const y = top + 92 + Math.abs(Math.sin(t * 0.18 + i * 1.1)) * -16 + (i % 2) * 26;
        this.cineImpactText(ctx, ch, x, y, 96, i % 2 ? '#f9a8d4' : '#fdf2f8', k, 0, (i % 2 ? 1 : -1) * 0.14);
      });
      this.cineSfx(S, 8, 'haha', () => window.SFX?.whoosh?.());
    } else {
      // O quarto inteiro: o Sae na porta, o Shidou atrás, o Rin na varanda, você na cama
      const k = easeIO(t / 190);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 372, zoom: lerp(1.14, 1, k), shake: 0.3 });
      this.cineGradient(ctx, 0, 0, W, 560, [[0, '#070d1c'], [1, '#0e1832']]);
      ctx.fillStyle = 'rgba(148,163,184,0.04)';
      for (let x = 0; x < W; x += 36) ctx.fillRect(x, 0, 14, 560);
      // A porta de vidro da varanda
      const gx0 = 780;
      const gx1 = 1200;
      const gy0 = 140;
      const gy1 = 556;
      ctx.save();
      ctx.beginPath();
      ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0);
      ctx.clip();
      this.cineGradient(ctx, gx0, gy0, gx1 - gx0, gy1 - gy0, [[0, '#020617'], [1, '#1e3a6a']]);
      this.cineCity(ctx, W, gy1 - 40, 220, '#0a1834', 'rgba(147,197,253,0.45)', 4, 300);
      this.cineBokeh(ctx, W, gy1 - 170, gy1 - 40, t, 10, ['rgba(253,224,71,0.3)', 'rgba(147,197,253,0.3)'], 7);
      this.finRim(ctx, this.cineChar('rin', { outfit: 'casual', clothesColor: '#1f2a44' }), 1010, 560, 250, { facing: 'back', dim: 0.4, dimTint: '8,20,50' }, '#93c5fd', [1], 3);
      ctx.fillStyle = '#0f172a';
      for (let x = gx0; x < gx1; x += 18) ctx.fillRect(x, 470, 4, 86);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(gx0, 464, gx1 - gx0, 8);
      ctx.restore();
      ctx.fillStyle = '#0b1222';
      [gx0 - 6, 984, gx1 - 6].forEach((x) => ctx.fillRect(x, gy0, 12, gy1 - gy0));
      ctx.fillRect(gx0 - 6, gy0 - 6, gx1 - gx0 + 12, 12);
      ctx.strokeStyle = 'rgba(191,219,254,0.12)';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(gx0 + 40, gy1);
      ctx.lineTo(gx0 + 180, gy0);
      ctx.moveTo(1010, gy1);
      ctx.lineTo(1120, gy0);
      ctx.stroke();
      // A porta do corredor (esquerda)
      const dx0 = 120;
      const dx1 = 350;
      const dy0 = 168;
      const dy1 = 556;
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx0, dy0, dx1 - dx0, dy1 - dy0);
      ctx.clip();
      this.cineGradient(ctx, dx0, dy0, dx1 - dx0, dy1 - dy0, [[0, '#fef3c7'], [1, '#f59e0b']]);
      this.finSpr(ctx, this.cineChar('shidou', { outfit: 'casual', clothesColor: '#be185d' }), dx1 - 30, dy1 + 4, 240, { dim: 0.45, dimTint: '40,10,30' });
      ctx.restore();
      ctx.save();
      ctx.translate(dx0 + 92, dy1 + 2);
      ctx.rotate(-0.05);
      this.finRim(ctx, this.cineChar('sae', { outfit: 'casual', clothesColor: '#e5e7eb' }), 0, 0, 262, { dim: 0.5, dimTint: '30,18,6' }, '#fde68a', [-1, 1], 3);
      ctx.restore();
      ctx.fillStyle = '#0b1222';
      ctx.fillRect(dx0 - 10, dy0 - 10, 10, dy1 - dy0 + 10);
      ctx.fillRect(dx1, dy0 - 10, 12, dy1 - dy0 + 10);
      ctx.fillRect(dx0 - 10, dy0 - 10, dx1 - dx0 + 22, 10);
      // Chão com a cunha de luz do corredor
      this.cineGradient(ctx, 0, 556, W, 260, [[0, '#0b1324'], [1, '#03060d']]);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const wg = ctx.createLinearGradient(0, 556, 0, 760);
      wg.addColorStop(0, 'rgba(251,191,36,0.3)');
      wg.addColorStop(1, 'rgba(251,191,36,0.02)');
      ctx.fillStyle = wg;
      poly(ctx, [[dx0, 556], [dx1, 556], [dx1 + 340, 760], [dx0 + 60, 760]]);
      ctx.fill();
      ctx.restore();
      // A cama e você sentado nela, de costas (primeiro plano)
      ctx.fillStyle = '#0a1226';
      ctx.fillRect(330, 600, 520, 220);
      ctx.fillStyle = '#16213e';
      ctx.fillRect(330, 596, 520, 12);
      this.finRim(ctx, this.cineYou({ outfit: 'casual', clothesColor: '#1e3a8a' }), 600, bot + 380, 620, { facing: 'back', tint: '#02040a' }, '#38bdf8', [-1, 1], 3);
      ctx.restore();
      this.cineImpactText(ctx, '4 EGOS.', W * 0.36, top + 58, 52, '#e2e8f0', seg(t, 60, 72));
      this.cineImpactText(ctx, '1 GOL.', W * 0.64, top + 58, 52, '#facc15', seg(t, 95, 107));
      this.finKicker(ctx, W - 40, bot - 30, 'AMANHÃ • JAPÃO x COREIA DO SUL', seg(t, 130, 175), '#facc15', 'right');
    }
  };

  // ==========================================================================
  // 3. O ÚLTIMO DUELO — o estádio vazio na chuva → frente a frente → o telão do Ego →
  // os dois monstros → o título
  // ==========================================================================
  CE.registerCine('rin_final_duel', {
    phases: [190, 190, 170, 220, 190],
    music: 'tension',
    title: '🌧️ O ÚLTIMO DUELO',
    tags: ['PLANO 1 • O ESTÁDIO VAZIO', 'PLANO 2 • FRENTE A FRENTE', 'PLANO 3 • O TELÃO', 'PLANO 4 • OS MONSTROS', 'PLANO 5 • O ÚLTIMO DUELO'],
    // "ESTÁDIO DO BLUE LOCK • 23:41", o letreiro do telão ("SEM SELEÇÃO • SEM CLUBE • SÓ
    // EGO") e o título "O ÚLTIMO DUELO" já estão na imagem
    subs: [
      [{ from: 12, who: 'NARRADOR', text: 'Só a chuva... e dois atacantes.', color: '#94a3b8' }],
      [
        { from: 6, to: 100, who: 'RIN ITOSHI', text: '"Você veio."', color: '#2dd4bf' },
        { from: 100, who: 'VOCÊ', text: '"Claro."', color: '#00f5d4' }
      ],
      [{ from: 10, who: 'JINPACHI EGO', text: '"Sem torcida. Só ego."', color: '#00f5d4' }],
      [{ from: 6, who: 'NARRADOR', text: 'O monstro do Rin acorda... e o seu responde.', color: '#94a3b8' }],
      [{ from: 2, who: 'NARRADOR', text: 'Um é o nº 1. O outro, o 2 pra sempre.', color: '#94a3b8' }]
    ],
    draw(ctx, S) {
      this.finDuel(ctx, S);
    }
  });

  CE.finDuelBg = function (g, w, h) {
    this.cineGradient(g, 0, 0, w, 300, [[0, '#010309'], [1, '#0a1a3a']]);
    g.fillStyle = 'rgba(15,23,42,0.6)';
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.ellipse(rnd(i, 30) * w, 30 + rnd(i, 31) * 90, 140 + rnd(i, 32) * 160, 22 + rnd(i, 33) * 20, 0, 0, TAU);
      g.fill();
    }
    // Telão em cima da arquibancada
    g.fillStyle = '#050a16';
    g.fillRect(520, 140, 10, 40);
    g.fillRect(750, 140, 10, 40);
    g.fillRect(492, 48, 296, 102);
    // Torres de refletor
    [110, 390, 890, 1170].forEach((x) => {
      g.fillStyle = '#060b18';
      g.fillRect(x - 4, 60, 8, 130);
      g.fillStyle = '#0b1324';
      g.fillRect(x - 42, 36, 84, 34);
      g.fillStyle = '#e0f2fe';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) g.fillRect(x - 38 + c * 11.5, 40 + r * 10, 7, 6);
    });
    // Arquibancada vazia do outro lado
    g.fillStyle = '#050a18';
    g.fillRect(0, 160, w, 20);
    g.fillStyle = '#0a1430';
    g.fillRect(0, 180, w, 150);
    for (let r = 0; r < 11; r++) {
      const y = 184 + r * 12.6;
      g.fillStyle = r % 2 ? '#0d1b3c' : '#0b1834';
      g.fillRect(0, y, w, 10);
      g.fillStyle = r % 2 ? '#16306a' : '#132a5c';
      for (let x = (r % 2) * 5; x < w; x += 10) g.fillRect(x, y + 2, 6, 6);
    }
    g.fillStyle = '#04070f';
    g.fillRect(0, 320, w, 14);
    g.font = '900 11px "Segoe UI", sans-serif';
    g.fillStyle = 'rgba(0,245,212,0.6)';
    g.textAlign = 'left';
    for (let x = 0; x < w; x += 170) g.fillText('BLUE LOCK • PROJETO', x + 10, 331);
    // Gramado em perspectiva
    for (let i = 0; i < 12; i++) {
      const y0 = 334 + (h - 334) * Math.pow(i / 12, 1.5);
      const y1 = 334 + (h - 334) * Math.pow((i + 1) / 12, 1.5);
      g.fillStyle = i % 2 ? '#0b3220' : '#0d3a25';
      g.fillRect(0, y0, w, y1 - y0 + 1);
    }
    g.strokeStyle = 'rgba(226,232,240,0.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 342);
    g.lineTo(w, 342);
    g.moveTo(640, 342);
    g.lineTo(640, h);
    g.stroke();
    g.beginPath();
    g.ellipse(640, 470, 160, 54, 0, 0, TAU);
    g.stroke();
    g.fillStyle = 'rgba(226,232,240,0.7)';
    g.beginPath();
    g.ellipse(640, 470, 5, 2.5, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(0, 380);
    g.lineTo(170, 380);
    g.lineTo(90, 560);
    g.moveTo(w, 380);
    g.lineTo(w - 170, 380);
    g.lineTo(w - 90, 560);
    g.stroke();
    const sheen = g.createLinearGradient(0, 334, 0, h);
    sheen.addColorStop(0, 'rgba(147,197,253,0.10)');
    sheen.addColorStop(1, 'rgba(2,6,23,0.35)');
    g.fillStyle = sheen;
    g.fillRect(0, 334, w, h - 334);
    // Cadeiras vazias da nossa arquibancada (primeiro plano)
    for (let r = 0; r < 3; r++) {
      const y = 642 + r * 30;
      g.fillStyle = '#04070f';
      g.fillRect(0, y, w, 40);
      for (let x = (r % 2) * 24; x < w; x += 48) {
        g.fillStyle = '#070d1b';
        g.fillRect(x + 4, y - 18, 38, 24);
        g.fillStyle = '#1a2a4a';
        g.fillRect(x + 4, y - 18, 38, 3);
      }
    }
  };

  CE.finDuel = function (ctx, S) {
    const { W, H, t, phase, top, bot } = S;
    const rin = this.cineChar('rin', Object.assign({ angry: true }, KIT_RIN));
    const you = this.cineYou(KIT_BL);
    if (phase === 0) {
      // Plano geral do alto: a grua desce até os dois no círculo central
      const k = easeIO(t / 190);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(340, 452, k), zoom: lerp(1, 1.5, k) });
      ctx.drawImage(this.finBg('fin_duel', W, H, this.finDuelBg), 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(496, 52, 288, 94);
      ctx.clip();
      this.cineGradient(ctx, 496, 52, 288, 94, [[0, '#062a3a'], [1, '#020b16']]);
      this.finPixelText(ctx, 'BLUE LOCK', 640, 82, 2.4, '#00f5d4');
      this.finPixelText(ctx, 'Nº 1 ?', 640, 120, 2.2, '#facc15');
      this.finFillPat(ctx, 'dots', 496, 52, 288, 94, 0.8);
      ctx.restore();
      this.cineGlow(ctx, 640, 100, 200, 'rgba(0,245,212,0.25)');
      [110, 390, 890, 1170].forEach((x, i) => {
        this.cineGlow(ctx, x, 54, 150, 'rgba(219,234,254,0.85)');
        this.cineShafts(ctx, x, 60, Math.atan2(410, 640 - x), 620, 0.3, 3, '191,219,254', 0.07, t + i * 30);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const rx = 640 + (x - 640) * 0.55;
        const rg = ctx.createLinearGradient(0, 345, 0, 640);
        rg.addColorStop(0, 'rgba(191,219,254,0.16)');
        rg.addColorStop(1, 'rgba(191,219,254,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(rx - 16, 345, 32, 295);
        ctx.restore();
      });
      this.cineGlow(ctx, 640, 470, 150, 'rgba(191,219,254,0.3)');
      this.finSpr(ctx, you, 612, 480, 64, {});
      this.finSpr(ctx, rin, 668, 480, 64, {});
      this.finSplashes(ctx, 200, 1080, 360, 640, t, 34);
      ctx.restore();
      this.cineRain(ctx, W, H, t, 0.28, 180, 0.2);
      this.cineRain(ctx, W, H, t * 1.4 + 300, 0.45, 50, 0.24);
      this.finKicker(ctx, 40, top + 30, 'UMA SEMANA DEPOIS DA COPA', seg(t, 8, 46));
      this.finKicker(ctx, 40, top + 58, 'ESTÁDIO DO BLUE LOCK • 23:41', seg(t, 36, 80), '#38bdf8');
    } else if (phase === 1) {
      // Por cima do seu ombro: o Rin parado na chuva, contraluz dos refletores
      const k = easeIO(t / 190);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, 700, k), y: lerp(360, 340, k), zoom: lerp(1, 1.12, k), shake: 1.2 });
      this.cineGradient(ctx, 0, 0, W, 340, [[0, '#01040c'], [1, '#0a1838']]);
      ctx.fillStyle = '#081129';
      ctx.fillRect(0, 190, W, 150);
      this.cineBokeh(ctx, W, 110, 300, t, 14, ['rgba(219,234,254,0.55)', 'rgba(125,211,252,0.4)'], 6);
      this.cineGradient(ctx, 0, 338, W, 400, [[0, '#0d3a25'], [1, '#03140c']]);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      [[300, 0.12], [820, 0.2], [1100, 0.1]].forEach(([x, a]) => {
        const rg = ctx.createLinearGradient(0, 340, 0, 720);
        rg.addColorStop(0, `rgba(191,219,254,${a})`);
        rg.addColorStop(1, 'rgba(191,219,254,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(x - 30, 340, 60, 380);
      });
      ctx.restore();
      this.cineGlow(ctx, 790, 250, 260, 'rgba(103,232,249,0.3)');
      this.finRim(ctx, rin, 790, 606, 400, { dim: 0.28, dimTint: '2,24,30' }, '#67e8f9', [-1, 1], 5);
      this.finSplashes(ctx, 560, 1040, 570, 640, t, 18);
      ctx.restore();
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1, 1.05, k), shake: 1.6 });
      this.finRim(ctx, this.cineYou(KIT_BL), 230, bot + 420, 860, { facing: 'back', tint: '#02040a' }, '#38bdf8', [1], 6);
      ctx.restore();
      this.cineRain(ctx, W, H, t, 0.3, 160, 0.18);
      this.cineRain(ctx, W, H, t * 1.5 + 200, 0.5, 40, 0.22);
      // Faixas com os olhos (mangá): o Rin em cima, você embaixo
      const e1 = ease(seg(t, 92, 108));
      if (e1 > 0) {
        this.finPanel(ctx, [[0, top + 18], [W, top + 18], [W, top + 128], [0, top + 128]], () => {
          ctx.fillStyle = '#010409';
          ctx.fillRect(0, top, W, 150);
          const dw = 520;
          this.finEyes(ctx, rin, 640 - dw / 2, top + 73 - (dw / 14) * 3.1, dw, { angry: true, ring: '#22d3ee', iris: '#0f766e', tiny: t > 130 });
          ctx.fillStyle = 'rgba(2,24,30,0.3)';
          ctx.fillRect(0, top, W, 150);
        }, { dx: (1 - e1) * -W });
      }
      const e2 = ease(seg(t, 140, 156));
      if (e2 > 0) {
        this.finPanel(ctx, [[0, bot - 128], [W, bot - 128], [W, bot - 18], [0, bot - 18]], () => {
          ctx.fillStyle = '#0a0204';
          ctx.fillRect(0, bot - 140, W, 150);
          const dw = 520;
          this.finEyes(ctx, you, 640 - dw / 2, bot - 73 - (dw / 14) * 3.1, dw, {});
        }, { dx: (1 - e2) * W });
      }
    } else if (phase === 2) {
      // O telão: o Ego enorme; a câmera abre e mostra os dois pequenos lá embaixo
      const k = easeIO(seg(t, 10, 160));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(250, 352, k), zoom: lerp(1.42, 1, k) });
      this.cineGradient(ctx, -200, -200, W + 400, 700, [[0, '#010309'], [1, '#081733']]);
      ctx.fillStyle = '#04081a';
      ctx.fillRect(-200, 430, W + 400, 60);
      ctx.fillStyle = '#050a16';
      ctx.fillRect(330, 400, 20, 60);
      ctx.fillRect(930, 400, 20, 60);
      this.cineGlow(ctx, 640, 250, 400, 'rgba(0,245,212,0.24)');
      this.finEgoScreen(ctx, 250, 100, 780, 300, t, { size: 560, fy: 0.42, ticker: '3 GOLS • QUEM MARCAR PRIMEIRO É O Nº 1 DO BLUE LOCK • SEM SELEÇÃO • SEM CLUBE • SÓ EGO' });
      this.cineGradient(ctx, -200, 488, W + 400, 400, [[0, '#0b3220'], [1, '#03140c']]);
      // Reflexo do telão no gramado molhado (borrado para baixo, com ondinhas)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const rg = ctx.createLinearGradient(0, 490, 0, 720);
      rg.addColorStop(0, 'rgba(0,245,212,0.16)');
      rg.addColorStop(1, 'rgba(0,245,212,0)');
      ctx.fillStyle = rg;
      poly(ctx, [[250, 490], [1030, 490], [1090, 720], [190, 720]]);
      ctx.fill();
      ctx.fillStyle = 'rgba(165,243,252,0.08)';
      for (let i = 0; i < 7; i++) {
        const y = 500 + i * 26;
        const off = Math.sin(t * 0.06 + i * 1.7) * 30;
        ctx.fillRect(330 + off - i * 8, y, 620 + i * 16, 3);
      }
      ctx.restore();
      this.finRim(ctx, you, 568, 616, 160, { facing: 'back', dim: 0.55, dimTint: '2,10,20' }, '#5eead4', [-1, 1], 2);
      this.finRim(ctx, rin, 712, 616, 160, { facing: 'back', dim: 0.55, dimTint: '2,10,20' }, '#5eead4', [-1, 1], 2);
      this.finSplashes(ctx, 300, 980, 560, 660, t, 20, '153,246,228');
      ctx.restore();
      this.cineRain(ctx, W, H, t, 0.34, 190, 0.2);
    } else if (phase === 3) {
      // A aura do Rin sobe; depois a tela racha na diagonal e o seu monstro responde
      const ks = ease(seg(t, 80, 100));
      const seamT = lerp(W + 300, 790, ks);
      const seamB = seamT - 280;
      const shake = this.cineNoise(S.f * 2, 7) * (t > 80 && t < 118 ? 5 : 1.2);
      const z = 1 + easeIO(t / 220) * 0.06;
      ctx.save();
      if (ks > 0) {
        poly(ctx, [[0, 0], [seamT, 0], [seamB, H], [0, H]]);
        ctx.clip();
      }
      const rx = lerp(640, 400, ks);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#000a0d'], [1, '#02191c']]);
      ctx.save();
      ctx.translate(rx, 380);
      ctx.scale(z, z);
      ctx.translate(-rx, -380);
      this.drawRinAbyss(ctx, rx, 470, 1.1, t, ease(t / 75));
      this.finHead(ctx, rin, rx + shake, 330, 720, { dim: 0.25, dimTint: '0,30,36', rim: '#67e8f9' });
      ctx.restore();
      this.cineRain(ctx, W, H, t, 0.25, 120, 0.2);
      ctx.restore();
      if (ks > 0) {
        ctx.save();
        poly(ctx, [[seamT, 0], [W, 0], [W, H], [seamB, H]]);
        ctx.clip();
        this.cineGradient(ctx, 0, 0, W, H, [[0, '#0c0204'], [1, '#2a0609']]);
        ctx.save();
        ctx.translate(980, 380);
        ctx.scale(z, z);
        ctx.translate(-980, -380);
        this.finYouMonster(ctx, 980, 226, 300, t, ease(seg(t, 84, 140)));
        this.finHead(ctx, you, 980 - shake, 452, 600, { dim: 0.25, dimTint: '40,0,0', rim: '#f87171' });
        ctx.restore();
        this.cineRain(ctx, W, H, t + 77, 0.25, 120, 0.2);
        ctx.restore();
        // A costura: um raio branco com contorno preto
        const pts = [];
        for (let i = 0; i <= 12; i++) {
          const f = i / 12;
          const j = i % 2 ? 14 : -14;
          pts.push([lerp(seamT, seamB, f) + (i && i < 12 ? j : 0), lerp(-20, H + 20, f)]);
        }
        ctx.save();
        ctx.lineJoin = 'miter';
        [['#020617', 12], ['#f8fafc', 5]].forEach(([c, w]) => {
          ctx.strokeStyle = c;
          ctx.lineWidth = w;
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        });
        ctx.restore();
        if (t >= 80) this.cineFlash(ctx, W, H, (1 - seg(t, 80, 92)) * 0.45);
        this.cineSfx(S, 80, 'racha', () => window.SFX?.kick?.(1));
      }
    } else {
      // Os dois no meio do campo, as auras se chocando na linha do meio, e o título
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: lerp(1, 1.06, easeIO(t / 190)), shake: 1 });
      this.cineGradient(ctx, 0, 0, W, 340, [[0, '#010309'], [1, '#0a1838']]);
      ctx.fillStyle = '#081129';
      ctx.fillRect(0, 210, W, 130);
      this.cineBokeh(ctx, W, 120, 300, t, 12, ['rgba(219,234,254,0.5)', 'rgba(125,211,252,0.35)'], 9);
      this.cineGradient(ctx, 0, 338, W, 400, [[0, '#0b3220'], [1, '#03140c']]);
      ctx.strokeStyle = 'rgba(226,232,240,0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(640, 338);
      ctx.lineTo(640, 720);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(640, 600, 330, 70, 0, Math.PI * 1.02, Math.PI * 1.98);
      ctx.stroke();
      this.drawRinAbyss(ctx, 440, 470, 0.62, t, 1);
      this.finYouMonster(ctx, 840, 262, 215, t, 1);
      // O choque: a linha de luz no meio com faíscas
      const cg = ctx.createLinearGradient(600, 0, 680, 0);
      cg.addColorStop(0, 'rgba(34,211,238,0)');
      cg.addColorStop(0.35, 'rgba(34,211,238,0.6)');
      cg.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      cg.addColorStop(0.65, 'rgba(239,68,68,0.6)');
      cg.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(600, 140, 80, 470);
      this.cineGlow(ctx, 640, 380, 170, 'rgba(255,255,255,0.45)');
      for (let i = 0; i < 26; i++) {
        const ph = (t * 0.03 + rnd(i, 40)) % 1;
        const a = (rnd(i, 41) - 0.5) * 2.4 + (i % 2 ? 0 : Math.PI);
        const d = ph * 240;
        ctx.fillStyle = i % 2 ? `rgba(165,243,252,${1 - ph})` : `rgba(254,202,202,${1 - ph})`;
        ctx.fillRect(640 + Math.cos(a) * d, 300 + rnd(i, 42) * 200 + Math.sin(a) * d * 0.5, 4, 4);
      }
      this.finRim(ctx, rin, 450, 610, 300, { dim: 0.18, dimTint: '0,30,36' }, '#67e8f9', [-1, 1], 4);
      this.finRim(ctx, you, 830, 610, 300, { dim: 0.18, dimTint: '40,0,0' }, '#f87171', [-1, 1], 4);
      this.finSplashes(ctx, 200, 1080, 560, 640, t, 24);
      ctx.restore();
      this.cineRain(ctx, W, H, t, 0.3, 170, 0.2);
      this.cineTitleCard(ctx, W, top + 92, seg(t, 30, 62), { kicker: 'BLUE LOCK • A DISPUTA PELO Nº 1', title: 'O ÚLTIMO DUELO', sub: '', color: '#22d3ee' });
      const kp = ease(seg(t, 70, 90));
      if (kp > 0) {
        ctx.save();
        ctx.globalAlpha = kp;
        [[450, 'RIN ITOSHI', '#22d3ee'], [830, this.cinePlayerName(), '#f87171']].forEach(([x, nm, c]) => {
          ctx.font = 'italic 900 22px "Segoe UI", sans-serif';
          const w = Math.min(320, ctx.measureText(nm).width + 34);
          ctx.fillStyle = 'rgba(2,6,23,0.88)';
          ctx.fillRect(x - w / 2, bot - 52, w, 36);
          ctx.fillStyle = c;
          ctx.fillRect(x - w / 2, bot - 52, w, 3);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText(nm, x, bot - 33, w - 16);
        });
        ctx.restore();
      }
      if (t >= 30) this.cineFlash(ctx, W, H, (1 - seg(t, 30, 44)) * 0.55);
      this.cineSfx(S, 30, 'titulo', () => window.SFX?.whistle?.(1));
    }
  };

  // ==========================================================================
  // 4. DEPOIS DO DUELO — deitados na grama → o céu → o rosto do Rin → o placar → o Nº 1
  // ==========================================================================
  CE.registerCine('rin_final_end', {
    phases: [180, 170, 210, 160, 210],
    music: 'promise',
    title: '🌌 O NÚMERO 1',
    tags: ['PLANO 1 • FIM DE JOGO', 'PLANO 2 • O CÉU', 'PLANO 3 • O RIN', 'PLANO 4 • O PLACAR', 'PLANO 5 • RANKING FINAL'],
    // O placar ("FIM DE JOGO • VOCÊ 3 x 2 RIN"), o telão do estádio e o ranking com a
    // "ATUALIZAÇÃO FINAL" já estão na imagem
    subs: [
      [{ from: 2, who: 'NARRADOR', text: 'Nenhum dos dois consegue levantar.', color: '#94a3b8' }],
      [{ from: 6, who: 'NARRADOR', text: 'A chuva para. Enfim, estrelas.', color: '#94a3b8' }],
      [
        { from: 2, to: 90, who: 'NARRADOR', text: 'Perdeu.', color: '#94a3b8' },
        { from: 90, who: 'NARRADOR', text: '...e quase sorri.', color: '#2dd4bf' }
      ],
      [{ from: 6, who: 'NARRADOR', text: 'Ninguém grita. Nem precisa.', color: '#94a3b8' }],
      [{ from: 86, who: 'JINPACHI EGO', text: '"...Perfeito."', color: '#00f5d4' }]
    ],
    draw(ctx, S) {
      this.finEnd(ctx, S);
    }
  });

  CE.finGrassBg = function (g, w, h) {
    for (let x = 0; x < w; x += 90) {
      g.fillStyle = (x / 90) % 2 ? '#0c3a22' : '#0f4428';
      g.fillRect(x, 0, 90, h);
    }
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = i % 3 ? 'rgba(2,44,22,0.5)' : 'rgba(74,222,128,0.12)';
      g.fillRect(rnd(i, 50) * w, rnd(i, 51) * h, 2, 5);
    }
    g.strokeStyle = 'rgba(226,232,240,0.6)';
    g.lineWidth = 7;
    g.beginPath();
    g.arc(w * 0.5 + 40, h * 0.5 + 40, 300, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(w * 0.5 + 40, 0);
    g.lineTo(w * 0.5 + 40, h);
    g.stroke();
    [[560, 420, 120, 50], [1200, 860, 160, 60], [1300, 380, 90, 36], [420, 980, 140, 48]].forEach(([x, y, rx, ry]) => {
      g.fillStyle = 'rgba(30,58,95,0.75)';
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0.3, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(191,219,254,0.16)';
      g.beginPath();
      g.ellipse(x - rx * 0.2, y - ry * 0.2, rx * 0.5, ry * 0.4, 0.3, 0, TAU);
      g.fill();
    });
  };

  CE.finEnd = function (ctx, S) {
    const { W, H, t, phase, top, bot } = S;
    const rin = this.cineChar('rin', Object.assign({ angry: true }, KIT_RIN));
    const you = this.cineYou(KIT_BL);
    const [sh, sa] = this.finScore();
    if (phase === 0) {
      // Vista de cima: os dois deitados, cabeça com cabeça, a câmera subindo e girando
      const k = easeIO(t / 180);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 362, zoom: lerp(1.65, 1.02, k), rot: lerp(-0.4, -0.08, k) });
      ctx.drawImage(this.finBg('fin_grass', 1800, 1400, this.finGrassBg), -260, -340);
      this.cineGlow(ctx, 260, 140, 300, 'rgba(147,197,253,0.18)');
      [[300, 80, 120, 50], [940, 520, 160, 60], [1040, 40, 90, 36], [160, 640, 140, 48]].forEach(([x, y, rx, ry], j) => {
        for (let i = 0; i < 2; i++) {
          const ph = (t * 0.02 + i * 0.5 + j * 0.3) % 1;
          ctx.strokeStyle = `rgba(191,219,254,${(1 - ph) * 0.5})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(x + (rnd(j * 3 + i, 60) - 0.5) * rx, y + (rnd(j * 3 + i, 61) - 0.5) * ry, ph * 30, ph * 13, 0.3, 0, TAU);
          ctx.stroke();
        }
      });
      const lie = (ch, cx, cy, ang, size) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        this.finSpr(ctx, ch, 0, size * 0.42, size, {});
        ctx.restore();
      };
      lie(rin, 465, 328, Math.PI / 2, 340);
      lie(you, 815, 398, -Math.PI / 2, 340);
      // Vapor da respiração subindo para a câmera
      [[506, 328], [774, 398]].forEach(([x, y], j) => {
        for (let i = 0; i < 2; i++) {
          const ph = (t * 0.018 + i * 0.5 + j * 0.25) % 1;
          ctx.fillStyle = `rgba(226,232,240,${(1 - ph) * 0.16})`;
          ctx.beginPath();
          ctx.ellipse(x + (j ? 1 : -1) * ph * 26, y - ph * 14, 6 + ph * 26, 5 + ph * 18, 0, 0, TAU);
          ctx.fill();
        }
      });
      this.finSplashes(ctx, 0, W, 0, H, t, 26);
      ctx.restore();
      this.cineRain(ctx, W, H, t, 0.14, 70, 0.1);
      this.finKicker(ctx, 40, top + 32, `FIM DE JOGO • VOCÊ ${sh} x ${sa} RIN`, seg(t, 20, 70), '#38bdf8');
    } else if (phase === 1) {
      // O ponto de vista dos dois: o céu abrindo entre as nuvens, as últimas gotas
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 + t * 0.12, y: 366 - t * 0.05, zoom: 1.04 });
      this.cineNightSky(ctx, W, H, t, { top: '#01030a', bottom: '#0f2148' });
      // A lua aparece quando as nuvens abrem; uma estrela cadente no fim
      this.cineGlow(ctx, 700, 300, 240, 'rgba(191,219,254,0.35)', seg(t, 20, 90));
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(700, 300, 46, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(148,163,184,0.45)';
      ctx.beginPath();
      ctx.arc(686, 290, 10, 0, TAU);
      ctx.arc(716, 316, 7, 0, TAU);
      ctx.fill();
      const sk = seg(t, 118, 142);
      if (sk > 0 && sk < 1) {
        const sx = lerp(300, 1000, sk);
        const sy = lerp(150, 220, sk);
        const sg = ctx.createLinearGradient(sx, sy, sx - 160, sy - 31);
        sg.addColorStop(0, 'rgba(255,255,255,0.95)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = sg;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 160, sy - 31);
        ctx.stroke();
      }
      [[-1, 560, 300, 1.15], [1, 820, 280, 1.0], [-1, 260, 230, 1.0], [1, 980, 210, 0.9], [-1, 340, 520, 0.8], [1, 900, 540, 1.1], [-1, 600, 140, 0.7]].forEach(([dir, x, y, s], j) => {
        const cx = x + dir * t * 1.8;
        ctx.fillStyle = 'rgba(11,19,36,0.92)';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.ellipse(cx + (i - 2) * 70 * s, y + Math.sin(i * 2 + j) * 18, 90 * s, 46 * s, 0, 0, TAU);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(96,165,250,0.18)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, y - 10, 200 * s, 52 * s, 0, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      });
      ctx.restore();
      // A borda do estádio em volta e os refletores nos cantos
      ctx.fillStyle = '#01030a';
      poly(ctx, [[0, 0], [W, 0], [W, 140], [980, 170], [640, 150], [300, 170], [0, 140]]);
      ctx.fill();
      poly(ctx, [[0, H], [W, H], [W, 590], [980, 560], [640, 580], [300, 560], [0, 590]]);
      ctx.fill();
      [[96, 150], [1184, 150], [96, 570], [1184, 570]].forEach(([x, y]) => {
        this.cineGlow(ctx, x, y, 120, 'rgba(219,234,254,0.6)');
        ctx.fillStyle = '#0b1324';
        ctx.fillRect(x - 40, y - 16, 80, 32);
        ctx.fillStyle = '#e0f2fe';
        for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) ctx.fillRect(x - 36 + c * 12.5, y - 12 + r * 13, 8, 9);
      });
      // As últimas gotas caindo na lente (cada vez menos)
      const nDrops = Math.round(26 * (1 - seg(t, 0, 150)));
      for (let i = 0; i < nDrops; i++) {
        const ph = (t * 0.03 + rnd(i, 70)) % 1;
        const a = rnd(i, 71) * TAU;
        const d = 30 + ph * ph * 520;
        const r = 1 + ph * 4;
        ctx.fillStyle = `rgba(191,219,254,${0.3 + ph * 0.5})`;
        ctx.beginPath();
        ctx.arc(640 + Math.cos(a) * d, 360 + Math.sin(a) * d * 0.7, r, 0, TAU);
        ctx.fill();
      }
      // A respiração (vapor saindo de baixo)
      [[320, 0], [960, 0.5]].forEach(([x, o]) => {
        const ph = (t * 0.016 + o) % 1;
        ctx.fillStyle = `rgba(226,232,240,${(1 - ph) * 0.18})`;
        ctx.beginPath();
        ctx.ellipse(x, bot + 20 - ph * 160, 60 + ph * 80, 30 + ph * 40, 0, 0, TAU);
        ctx.fill();
      });
      [[34, 300, 'hah...'], [70, 940, 'hah...'], [108, 330, '...hah.']].forEach(([at, x, s]) => {
        const k = seg(t, at, at + 50);
        if (k <= 0 || k >= 1) return;
        ctx.save();
        ctx.globalAlpha = Math.sin(k * Math.PI) * 0.8;
        ctx.font = 'italic 800 26px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(s, x, bot - 70 - k * 70);
        ctx.restore();
      });
    } else if (phase === 2) {
      // O rosto do Rin deitado na grama molhada: a raiva... e o quase sorriso
      const calm = t >= 108;
      const ch = calm ? this.cineChar('rin', KIT_RIN) : rin;
      ctx.drawImage(this.finBg('fin_grass', 1800, 1400, this.finGrassBg), -200, -400);
      ctx.fillStyle = 'rgba(2,10,24,0.35)';
      ctx.fillRect(0, 0, W, H);
      const z = 1 + easeIO(t / 210) * 0.07;
      ctx.save();
      ctx.translate(640, 380);
      ctx.scale(z, z);
      ctx.translate(-640, -380);
      const U = 42;
      const ox = 640 - 10 * U;
      const oy = top - 2.5 * U + 6 + Math.sin(t * 0.09) * 2;
      this.finCrop(ctx, ch, {}, 8, 2.5, 20, 14, ox, oy + 2.5 * U, 20 * U, 14 * U);
      const cx = 640;
      // (o finCrop já converteu a origem do recorte: aqui desfaz a 2ª conversão do finU)
      const sTop = oy - (SPRITE_MAPY(10.1) - 10.1) * U;
      // Pálpebras: fechadas na respirada funda, depois meio abertas e calmas
      const skin = '#f8dcc4';
      const shade = this.finShade(skin, -0.24);
      if (t >= 96 && t < 108) {
        this.finU(ctx, cx, sTop, U, 12.8, 8.6, 3.5, 2.8, skin);
        this.finU(ctx, cx, sTop, U, 19.7, 8.6, 3.5, 2.8, skin);
        this.finU(ctx, cx, sTop, U, 12.9, 10.2, 3.3, 0.45, '#0a0f1c');
        this.finU(ctx, cx, sTop, U, 19.8, 10.2, 3.3, 0.45, '#0a0f1c');
      } else if (calm) {
        this.finU(ctx, cx, sTop, U, 12.9, 8.95, 3.2, 0.8, shade);
        this.finU(ctx, cx, sTop, U, 19.9, 8.95, 3.2, 0.8, shade);
        this.finU(ctx, cx, sTop, U, 12.8, 9.7, 3.4, 0.4, '#0a0f1c');
        this.finU(ctx, cx, sTop, U, 19.8, 9.7, 3.4, 0.4, '#0a0f1c');
        // O canto da boca subindo (um lado só)
        const k = seg(t, 120, 160);
        this.finU(ctx, cx, sTop, U, 16.6, 11.8, 2.8, 1.2, skin);
        this.finU(ctx, cx, sTop, U, 16.8, 12.15, 1.9, 0.38, '#7c2d12');
        if (k > 0) this.finU(ctx, cx, sTop, U, 18.6, 12.15 - 0.4 * k, 0.6, 0.38, '#7c2d12');
      }
      // Gotas de chuva no rosto (pixels), uma escorrendo
      [[14.2, 7.4], [21.6, 12.6], [13.4, 13.2], [22.4, 8.2]].forEach(([x, y]) => this.finU(ctx, cx, sTop, U, x, y, 0.35, 0.35, 'rgba(219,234,254,0.85)'));
      this.finU(ctx, cx, sTop, U, 22.1, 11 + seg(t, 20, 200) * 3, 0.3, 0.5, 'rgba(219,234,254,0.8)');
      ctx.restore();
      const lg = ctx.createLinearGradient(0, 0, W, 0);
      lg.addColorStop(0, 'rgba(147,197,253,0.14)');
      lg.addColorStop(0.5, 'rgba(147,197,253,0)');
      lg.addColorStop(1, 'rgba(2,6,23,0.5)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);
    } else if (phase === 3) {
      // O placar do estádio, de baixo, com gotas na lente
      const k = easeIO(t / 160);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 330, zoom: lerp(1, 1.1, k) });
      this.cineNightSky(ctx, W, H, t, { top: '#01030a', bottom: '#102350' });
      ctx.fillStyle = '#050a16';
      ctx.fillRect(300, 440, 24, 400);
      ctx.fillRect(956, 440, 24, 400);
      this.cineGlow(ctx, 640, 300, 380, 'rgba(56,189,248,0.2)');
      // O placar é parado: fica pronto num canvas guardado (o padrão de LED com zoom pesava)
      const board = this.finBg(`fin_board|${sh}|${sa}`, 856, 356, (g) => {
        g.translate(-212, -110);
        g.fillStyle = '#04070f';
        g.fillRect(214, 112, 852, 352);
        g.fillStyle = '#020409';
        g.fillRect(232, 130, 816, 316);
        this.finPixelText(g, 'BLUE LOCK • DUELO PELO Nº 1', 640, 168, 2.6, '#00f5d4');
        this.finPixelText(g, 'VOCÊ', 380, 290, 4.2, '#f8fafc');
        this.finPixelText(g, 'RIN', 900, 290, 4.2, '#2dd4bf');
        this.finPixelText(g, `${sh}`, 530, 290, 11, '#facc15');
        this.finPixelText(g, '-', 640, 290, 8, '#64748b');
        this.finPixelText(g, `${sa}`, 750, 290, 11, '#facc15');
        this.finPixelText(g, 'FIM DE JOGO', 640, 404, 3.2, '#f87171');
        this.finFillPat(g, 'dots', 232, 130, 816, 316, 0.85);
        g.strokeStyle = '#1e293b';
        g.lineWidth = 4;
        g.strokeRect(214, 112, 852, 352);
      });
      ctx.drawImage(board, 212, 110);
      ctx.restore();
      const fog = ctx.createLinearGradient(0, bot - 160, 0, bot);
      fog.addColorStop(0, 'rgba(203,213,225,0)');
      fog.addColorStop(1, 'rgba(203,213,225,0.14)');
      ctx.fillStyle = fog;
      ctx.fillRect(0, bot - 160, W, 160);
      this.finLensDrops(ctx, W, top, bot, 4, 10);
    } else {
      // O ranking do Ego: o Nº 2 entra, o Nº 1 rola como uma roleta e para no seu nome
      const name = this.cinePlayerName();
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#020a18'], [1, '#03122a']]);
      ctx.strokeStyle = 'rgba(0,245,212,0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < W; x += 40) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bot);
      }
      for (let y = top; y < bot; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();
      this.finPanel(ctx, [[30, top + 20], [380, top + 20], [340, bot - 20], [30, bot - 20]], () => {
        this.finEgoScreen(ctx, 0, top, 420, bot - top, t, { size: 520, fx: 0.46, fy: 0.42 });
      });
      this.finPixelText(ctx, 'RANKING DO BLUE LOCK', 420, top + 46, 3.2, '#00f5d4', 'left');
      this.finKicker(ctx, 424, top + 86, 'ATUALIZAÇÃO FINAL', 1, '#38bdf8');
      const row = (y, k, rank, label, color, hi) => {
        if (k <= 0) return;
        const x = 420 + (1 - ease(k)) * 600;
        ctx.save();
        ctx.fillStyle = hi ? 'rgba(250,204,21,0.14)' : 'rgba(2,6,23,0.85)';
        ctx.fillRect(x, y - 44, 820, 88);
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 44, 8, 88);
        ctx.restore();
        this.finPixelText(ctx, rank, x + 30, y, 5, color, 'left');
        return x;
      };
      const x2 = row(410, seg(t, 6, 22), 'Nº 2', 'RIN ITOSHI', '#2dd4bf', false);
      if (x2 !== undefined) this.finPixelText(ctx, 'RIN ITOSHI', x2 + 240, 410, 4, '#e2e8f0', 'left', 520);
      const land = 92;
      const x1 = row(260, seg(t, 26, 42), 'Nº 1', '', '#facc15', t >= land);
      if (x1 !== undefined) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x1 + 220, 216, 600, 88);
        ctx.clip();
        if (t < land) {
          // Roleta vertical desacelerando (os nomes passam rolando, sem piscar a tela)
          const pool = ['SHIDOU', 'BACHIRA', 'NAGI', 'KUNIGAMI', 'BAROU', 'CHIGIRI', 'REO', 'RIN ITOSHI'];
          const p = easeIO(seg(t, 34, land)) * 22;
          for (let i = Math.floor(p) - 1; i <= Math.floor(p) + 1; i++) {
            const y = 260 + (i - p) * 70;
            this.finPixelText(ctx, i >= 22 ? name : pool[((i % pool.length) + pool.length) % pool.length], x1 + 240, y, 4, '#94a3b8', 'left', 560);
          }
        } else {
          this.finPixelText(ctx, name, x1 + 240, 260, 4.4, '#facc15', 'left', 560);
        }
        ctx.restore();
      }
      if (t >= land) {
        const k = seg(t, land, land + 14);
        this.cineImpactText(ctx, 'Nº 1', 1090, bot - 82, 104, '#facc15', k, 0, -0.08);
        const kp = ease(seg(t, land + 8, land + 60));
        this.drawPuzzle3D(ctx, 1150, 262 - (1 - kp) * 200, 82, (1 - kp) * 9, -0.12 * kp, 'Nº1', kp);
        this.cineFlash(ctx, W, H, (1 - k) * 0.45, '#fef3c7');
        this.cineSfx(S, land, 'numero1', () => window.SFX?.goal?.(true));
      }
      if (t > 150) this.finKicker(ctx, 424, bot - 40, 'A ÚLTIMA PEÇA DO QUEBRA-CABEÇA', seg(t, 150, 200), '#facc15');
    }
  };

  // ==========================================================================
  // 5. A BOLA DE OURO — Paris → o tapete vermelho → o envelope → o troféu → de pé
  // ==========================================================================
  CE.registerCine('ballon_dor', {
    phases: [180, 190, 180, 210, 200],
    music: 'epic',
    title: '🏆 A BOLA DE OURO',
    tags: ['PLANO 1 • PARIS', 'PLANO 2 • O TAPETE VERMELHO', 'PLANO 3 • O ENVELOPE', 'PLANO 4 • A BOLA DE OURO', 'PLANO 5 • DE PÉ'],
    // "PARIS • THÉÂTRE DU CHÂTELET", o "BOLA DE OURO" com o seu nome e o "DE PÉ, O TEATRO
    // INTEIRO" já estão na imagem
    subs: [
      [{ from: 12, who: 'NARRADOR', text: 'Paris inteira espera um nome.', color: '#94a3b8' }],
      [{ from: 15, who: 'NARRADOR', text: 'Ninguém mais erra o seu nome.', color: '#94a3b8' }],
      [{ from: 6, who: 'APRESENTADORA', text: '"O envelope, por favor."', color: '#facc15' }],
      [{ from: 10, who: 'NARRADOR', text: 'O troféu mais pesado... pesa tão pouco.', color: '#94a3b8' }],
      [{ from: 8, who: 'NARRADOR', text: 'O nº 1 do mundo se levanta primeiro.', color: '#94a3b8' }]
    ],
    draw(ctx, S) {
      this.finGala(ctx, S);
    }
  });

  CE.finParisBg = function (g, w, h) {
    this.cineNightSky(g, w, 780, 0, { top: '#020617', bottom: '#3b2a6b' });
    this.cineCity(g, w, 780, 190, '#160f2e', 'rgba(253,224,71,0.45)', 7, 0);
    this.cineCity(g, w, 860, 150, '#0a0718', 'rgba(251,191,36,0.55)', 9, 200);
    // O teatro
    g.fillStyle = '#2a1f3d';
    g.fillRect(760, 470, 520, 440);
    g.fillStyle = '#1d1530';
    g.fillRect(740, 450, 560, 26);
    for (let i = 0; i < 6; i++) {
      const x = 790 + i * 82;
      g.fillStyle = '#3a2d52';
      g.fillRect(x, 610, 18, 300);
      g.fillStyle = '#d97706';
      g.globalAlpha = 0.6;
      g.beginPath();
      g.moveTo(x + 26, 900);
      g.lineTo(x + 26, 700);
      g.arc(x + 48, 700, 22, Math.PI, 0);
      g.lineTo(x + 70, 900);
      g.fill();
      g.globalAlpha = 1;
    }
    g.fillStyle = '#0b0614';
    g.fillRect(760, 900, 520, 10);
    g.fillStyle = '#050309';
    g.fillRect(0, 910, w, h - 910);
    g.fillStyle = '#7f1d1d';
    poly(g, [[960, 910], [1080, 910], [1180, h], [860, h]]);
    g.fill();
    g.fillStyle = '#facc15';
    g.fillRect(952, 910, 4, h - 910);
    g.fillRect(1084, 910, 4, h - 910);
  };

  CE.finGala = function (ctx, S) {
    const { W, H, t, phase, top, bot } = S;
    const name = this.cinePlayerName();
    const you = this.cineYou({ outfit: 'suit' });
    if (phase === 0) {
      // A torre acesa → a câmera desce até o teatro e o tapete vermelho
      const k = easeIO(t / 180);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(500, 640, k), y: lerp(330, 735, k), zoom: lerp(1.3, 1, k) });
      ctx.drawImage(this.finBg('fin_paris', W, 1100, this.finParisBg), 0, 0);
      // Holofotes varrendo o céu
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      [[900, 0.35], [1160, -0.3]].forEach(([x, ph]) => {
        const a = -Math.PI / 2 + Math.sin(t * 0.015 + ph * 6) * 0.45;
        const g = ctx.createLinearGradient(x, 460, x + Math.cos(a) * 700, 460 + Math.sin(a) * 700);
        g.addColorStop(0, 'rgba(254,243,199,0.28)');
        g.addColorStop(1, 'rgba(254,243,199,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, 460);
        ctx.lineTo(x + Math.cos(a - 0.05) * 800, 460 + Math.sin(a - 0.05) * 800);
        ctx.lineTo(x + Math.cos(a + 0.05) * 800, 460 + Math.sin(a + 0.05) * 800);
        ctx.fill();
      });
      ctx.restore();
      this.finEiffel(ctx, 430, 790, 620, t);
      // O letreiro do teatro com lâmpadas correndo
      ctx.fillStyle = '#120a20';
      ctx.fillRect(820, 520, 400, 70);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.strokeRect(820, 520, 400, 70);
      ctx.font = 'italic 900 34px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fde68a';
      ctx.fillText('BOLA DE OURO', 1020, 556);
      for (let i = 0; i < 24; i++) {
        const bx = i < 12 ? 826 + i * 33 : 826 + (i - 12) * 33;
        const by = i < 12 ? 512 : 598;
        const a = 0.45 + 0.55 * Math.max(0, Math.sin(t * 0.12 - i * 0.7));
        ctx.fillStyle = `rgba(254,240,138,${a})`;
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, TAU);
        ctx.fill();
      }
      this.cineGlow(ctx, 1020, 556, 260, 'rgba(251,191,36,0.25)');
      // Fotógrafos e flashes pequenos no tapete
      for (let i = 0; i < 14; i++) {
        const x = 880 + (i % 7) * 50 + (i > 6 ? 30 : 0);
        const y = 960 + (i > 6 ? 50 : 0);
        ctx.fillStyle = '#020105';
        ctx.beginPath();
        ctx.arc(x, y - 16, 7, 0, TAU);
        ctx.fill();
        ctx.fillRect(x - 10, y - 9, 20, 30);
        const ph = (S.f + i * 37) % 61;
        if (ph < 6) this.finSparkle(ctx, x + 6, y - 22, 10, 1 - ph / 6);
      }
      ctx.restore();
      this.cineBokeh(ctx, W, bot - 80, bot + 20, t, 10, ['rgba(251,191,36,0.4)', 'rgba(254,240,138,0.3)'], 12);
      this.finKicker(ctx, 40, top + 32, 'PARIS • THÉÂTRE DU CHÂTELET', seg(t, 8, 50), '#facc15');
    } else if (phase === 1) {
      // O tapete vermelho: você vindo de terno, fotógrafos dos dois lados
      const k = easeIO(t / 190);
      const vx = 640;
      const vy = 250;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: lerp(1.08, 1, k), shake: 0.8 });
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#0b0614'], [1, '#05030a']]);
      // O painel de fundo com o logo repetido
      ctx.fillStyle = '#0f0a24';
      ctx.fillRect(340, 120, 600, 220);
      ctx.font = 'italic 900 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'italic 900 13px Georgia, serif';
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.fillStyle = (r + c) % 2 ? 'rgba(250,204,21,0.55)' : 'rgba(250,204,21,0.25)';
          ctx.fillText('BOLA DE OURO', 420 + c * 150 + (r % 2) * 75, 140 + r * 36);
        }
      }
      this.cineGlow(ctx, 640, 220, 360, 'rgba(251,191,36,0.18)');
      const cg = ctx.createLinearGradient(0, 330, 0, 720);
      cg.addColorStop(0, '#5b1414');
      cg.addColorStop(1, '#991b1b');
      ctx.fillStyle = cg;
      poly(ctx, [[560, 330], [720, 330], [1080, 720], [200, 720]]);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(560, 330);
      ctx.lineTo(200, 720);
      ctx.moveTo(720, 330);
      ctx.lineTo(1080, 720);
      ctx.stroke();
      // Pedestais dourados com a corda de veludo
      [-1, 1].forEach((s) => {
        let prev = null;
        for (let i = 0; i < 6; i++) {
          const f = Math.pow(i / 5, 1.3);
          const x = vx + s * (90 + f * 520);
          const y = 340 + f * 380;
          const sc = 0.4 + f * 1.1;
          ctx.fillStyle = '#ca8a04';
          ctx.fillRect(x - 3 * sc, y - 70 * sc, 6 * sc, 70 * sc);
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(x, y - 72 * sc, 6 * sc, 0, TAU);
          ctx.fill();
          if (prev) {
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 5 * sc;
            ctx.beginPath();
            ctx.moveTo(prev[0], prev[1] - 62 * prev[2]);
            ctx.quadraticCurveTo((prev[0] + x) / 2, (prev[1] + y) / 2 - 30 * sc, x, y - 62 * sc);
            ctx.stroke();
          }
          prev = [x, y, sc];
        }
      });
      // Você vindo pelo tapete
      const size = lerp(250, 380, k);
      const feet = lerp(470, 650, k) - Math.abs(Math.sin(t * 0.22)) * 5;
      ctx.save();
      ctx.translate(640, feet);
      ctx.rotate(Math.sin(t * 0.11) * 0.02);
      this.finRim(ctx, you, 0, 0, size, {}, '#fde68a', [-1, 1], 3);
      ctx.restore();
      ctx.restore();
      // Os fotógrafos em primeiro plano, com flashes pequenos
      this.cineGlow(ctx, 150, 400, 210, 'rgba(251,191,36,0.16)');
      this.cineGlow(ctx, 1130, 400, 210, 'rgba(251,191,36,0.16)');
      [-1, 1].forEach((s) => {
        for (let i = 0; i < 4; i++) {
          const x = s < 0 ? 40 + i * 60 : W - 40 - i * 60;
          const y = 470 + i * 50;
          const sc = 1.4 - i * 0.12;
          ctx.fillStyle = '#020105';
          ctx.beginPath();
          ctx.arc(x, y - 40 * sc, 26 * sc, 0, TAU);
          ctx.fill();
          ctx.fillRect(x - 44 * sc, y - 16 * sc, 88 * sc, 300);
          ctx.fillRect(x - s * 24 * sc - 18 * sc, y - 64 * sc, 36 * sc, 26 * sc);
          ctx.strokeStyle = 'rgba(251,191,36,0.55)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(x, y - 40 * sc, 26 * sc, s < 0 ? Math.PI * 1.5 : Math.PI * 1.0, s < 0 ? Math.PI * 2.05 : Math.PI * 1.55);
          ctx.moveTo(x + (s < 0 ? 44 : -44) * sc, y - 16 * sc);
          ctx.lineTo(x + (s < 0 ? 44 : -44) * sc, y + 80 * sc);
          ctx.stroke();
          ctx.fillStyle = 'rgba(251,191,36,0.6)';
          ctx.fillRect(x - s * 24 * sc - 18 * sc, y - 64 * sc, 36 * sc, 2);
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(x - s * 24 * sc - s * 20 * sc, y - 52 * sc, 9 * sc, 0, TAU);
          ctx.fill();
          const ph = (S.f + i * 29 + (s > 0 ? 13 : 0)) % 47;
          if (ph < 6) this.finSparkle(ctx, x - s * 24 * sc, y - 52 * sc, 16, 1 - ph / 6);
        }
      });
      this.cineBokeh(ctx, W, top, top + 160, t, 14, ['rgba(251,191,36,0.35)', 'rgba(254,240,138,0.3)'], 14);
    } else if (phase === 2) {
      // Close: as mãos da apresentadora tirando o cartão do envelope dourado
      const k = easeIO(t / 180);
      const pull = easeIO(seg(t, 28, 150));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(400, 300, pull), zoom: lerp(1, 1.14, k), shake: 0.8 });
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#0a0614'], [1, '#140a1e']]);
      this.cineBokeh(ctx, W, 80, 600, t, 20, ['rgba(251,191,36,0.4)', 'rgba(254,240,138,0.25)'], 16);
      const ex = 640;
      const ey = 470;
      const ew = 520;
      const eh = 300;
      // Cartão (atrás) saindo do envelope
      const cy = ey - 40 - pull * 190;
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(ex - 230, cy - 120, 460, 400);
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 3;
      ctx.strokeRect(ex - 220, cy - 110, 440, 380);
      ctx.font = 'italic 900 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#a16207';
      ctx.fillText('BOLA DE OURO', ex, cy - 70);
      ctx.fillRect(ex - 60, cy - 50, 120, 2);
      ctx.font = 'italic 900 50px "Segoe UI", sans-serif';
      ctx.fillStyle = '#0b1120';
      ctx.fillText(name, ex, cy + 10, 420);
      ctx.font = '800 16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('JAPÃO', ex, cy + 58);
      // Frente do envelope (cobre o cartão)
      const eg = ctx.createLinearGradient(ex - ew / 2, 0, ex + ew / 2, 0);
      eg.addColorStop(0, '#a16207');
      eg.addColorStop(0.45, '#fcd34d');
      eg.addColorStop(1, '#b45309');
      ctx.fillStyle = eg;
      ctx.fillRect(ex - ew / 2, ey - 40, ew, eh);
      ctx.fillStyle = 'rgba(120,53,15,0.35)';
      poly(ctx, [[ex - ew / 2, ey - 40], [ex, ey + 90], [ex + ew / 2, ey - 40]]);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.strokeRect(ex - ew / 2, ey - 40, ew, eh);
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(ex, ey + 92, 22, 0, TAU);
      ctx.fill();
      // As mãos (em pixel: blocos de 12 px) segurando o envelope e puxando o cartão
      const P = 12;
      const blk = (x, y, w, h, c) => {
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(x), Math.round(y), w * P, h * P);
      };
      const skin = '#f1c9a5';
      const skinS = '#d9a77f';
      const hand = (x, y, flip) => {
        blk(x, y, 5, 4, skin);
        blk(x + (flip ? -3 : 5) * P, y + P, 3, 2, skin);
        blk(x, y + 3 * P, 5, 1, skinS);
        blk(x + (flip ? 5 : -4) * P, y - P, 4, 6, '#0b0b12');
        blk(x + (flip ? 4 : -1) * P, y - P, 1, 6, '#f8fafc');
      };
      hand(ex - ew / 2 - 2 * P, ey + 60, false);
      hand(ex + ew / 2 - 3 * P, ey + 60, true);
      hand(ex + 150, cy - 140, true);
      ctx.restore();
      if (pull > 0.98) this.cineGlow(ctx, 640, 300, 380, 'rgba(251,191,36,0.3)', seg(t, 150, 170));
      for (let i = 0; i < 6; i++) {
        const a = Math.max(0, Math.sin(t * 0.06 + i * 1.9));
        if (pull > 0.9) this.finSparkle(ctx, 360 + rnd(i, 80) * 560, top + 40 + rnd(i, 81) * 240, 9, a * 0.8);
      }
    } else if (phase === 3) {
      // No palco: você de terno com a Bola de Ouro, dois canhões de luz e confete dourado
      const k = easeIO(t / 210);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(400, 370, k), zoom: lerp(1, 1.12, k), shake: 0.4 });
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#07040e'], [1, '#120a1c']]);
      ctx.strokeStyle = 'rgba(250,204,21,0.25)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(640, 330, 250, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(640, 330, 290, 0, TAU);
      ctx.stroke();
      this.cineGradient(ctx, 0, 600, W, 200, [[0, '#2a1a36'], [1, '#0a0612']]);
      this.cineShafts(ctx, 160, 40, Math.atan2(560, 480), 760, 0.22, 3, '254,240,138', 0.16, t);
      this.cineShafts(ctx, 1120, 40, Math.atan2(560, -480), 760, 0.22, 3, '254,240,138', 0.16, t + 40);
      this.cineGlow(ctx, 640, 610, 260, 'rgba(254,240,138,0.25)');
      const size = 400;
      const feet = 616;
      this.finRim(ctx, you, 640, feet, size, {}, '#fde68a', [-1, 1], 4);
      this.finGoldBall(ctx, 640, feet - size * 0.87 + SPRITE_MAPY(17.64) * (size / 36), 44, t);
      ctx.restore();
      for (let i = 0; i < 70; i++) {
        const x = (i * 137.5 + Math.sin(t * 0.03 + i) * 30) % W;
        const y = ((i * 71 + t * (1.6 + (i % 4) * 0.5)) % (H + 40)) - 20;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 0.08 + i);
        ctx.fillStyle = i % 3 ? '#facc15' : i % 2 ? '#fef3c7' : '#ca8a04';
        ctx.fillRect(-5, -2, 10, 4);
        ctx.restore();
      }
      this.cineImpactText(ctx, 'BOLA DE OURO', W / 2, top + 64, 70, '#facc15', seg(t, 40, 54), W * 0.8);
      this.cineImpactText(ctx, name, W / 2, top + 130, 40, '#f8fafc', seg(t, 66, 80), W * 0.6);
      if (t >= 40) this.cineFlash(ctx, W, H, (1 - seg(t, 40, 54)) * 0.45, '#fef9c3');
      this.cineSfx(S, 40, 'bola', () => window.SFX?.goal?.(true));
    } else {
      // O Noa de pé aplaudindo → a câmera abre: o teatro inteiro de pé, você lá no palco
      const k = easeIO(seg(t, 50, 195));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(330, 640, k), y: lerp(560, 390, k), zoom: lerp(1.85, 1, k), shake: 0.4 });
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#0a0614'], [1, '#05030a']]);
      ctx.fillStyle = '#1b1028';
      ctx.fillRect(400, 130, 480, 190);
      this.cineShafts(ctx, 640, 20, Math.PI / 2, 300, 0.5, 4, '254,240,138', 0.2, t);
      this.cineGlow(ctx, 640, 260, 200, 'rgba(254,240,138,0.4)');
      ctx.fillStyle = '#2a1a36';
      ctx.fillRect(380, 300, 520, 20);
      this.finSpr(ctx, you, 640, 304, 96, {});
      this.finGoldBall(ctx, 640, 304 - 96 * 0.87 + SPRITE_MAPY(15.57) * (96 / 36), 11, t);
      this.finSparkle(ctx, 640, 304 - 96 * 0.87 + SPRITE_MAPY(15.57) * (96 / 36), 9, 0.6 + 0.4 * Math.sin(t * 0.1));
      // A plateia levantando (de trás pra frente, devagar)
      const rows = [];
      for (let r = 0; r < 5; r++) {
        rows.push({
          y: 360 + r * 66,
          s: 0.55 + r * 0.16,
          rise: (i) => ease(seg(t, 100 + (4 - r) * 8 + (i % 5) * 3, 130 + (4 - r) * 8 + (i % 5) * 3)) * 22 * (0.55 + r * 0.16)
        });
      }
      this.finCrowdHeads(ctx, W, t, rows, 'rgba(251,191,36,0.45)', false, '#030108');
      // O Noa na primeira fila, de pé, aplaudindo
      const noa = this.cineChar('noa', { outfit: 'suit' });
      // aplauso: pose 'clap' do boneco (abre / bate); 2 quadros só, pra não encher o cache
      const clapShut = Math.floor(t / 7) % 2 === 1;
      if (window.PixelRenderer.spritesV2) {
        this.finRim(ctx, noa, 330, 742, 300, { animState: 'clap', frame: clapShut ? 6 : 0, dim: 0.2, dimTint: '30,15,0' }, '#fde68a', [1], 3);
      } else {
        this.finRim(ctx, noa, 330, 742, 300, { dim: 0.2, dimTint: '30,15,0' }, '#fde68a', [1], 3);
      }
      const u = 300 / 36;
      const hy = 742 - 300 * 0.87 + SPRITE_MAPY(18.5) * u;
      const gap = window.PixelRenderer.spritesV2 ? (clapShut ? 0 : 3 * u) : Math.abs(Math.sin(t * 0.22)) * 3 * u;
      if (!window.PixelRenderer.spritesV2) {
        // (boneco antigo: as mãos do aplauso desenhadas por cima)
        ctx.fillStyle = '#f3d1b8';
        ctx.fillRect(330 - gap - 2.4 * u, hy, 2.4 * u, 2.4 * u);
        ctx.fillRect(330 + gap, hy, 2.4 * u, 2.4 * u);
        ctx.fillStyle = '#0a0f1c';
        ctx.fillRect(330 - gap - 2.4 * u, hy + 2.4 * u, 2.4 * u, 0.5 * u);
        ctx.fillRect(330 + gap, hy + 2.4 * u, 2.4 * u, 0.5 * u);
      }
      if (gap < 0.6 * u) {
        ctx.font = 'italic 900 16px "Segoe UI", sans-serif';
        ctx.fillStyle = '#fde68a';
        ctx.textAlign = 'center';
        ctx.fillText('CLAP', 330 + 34, hy - 10);
      }
      ctx.restore();
      if (t > 150) this.finKicker(ctx, W / 2, bot - 34, 'DE PÉ, O TEATRO INTEIRO', seg(t, 150, 190), '#facc15', 'center');
    }
  };

  // ==========================================================================
  // 6. O DESTINO DE CADA UM — páginas de mangá com o que aconteceu com cada um
  // ==========================================================================
  CE.registerCine('epilogue_destinies', {
    phases: [220, 220, 220, 210, 200, 210],
    music: 'promise',
    title: '📖 O DESTINO DE CADA UM',
    tags: ['PÁGINA 1 • RIN ITOSHI', 'PÁGINA 2 • BACHIRA • NAGI & REO • CHIGIRI', 'PÁGINA 3 • KUNIGAMI • SAE • SHIDOU', 'PÁGINA 4 • KAISER & NESS • EGO', 'PÁGINA 5 • DO OUTRO LADO DO MUNDO', 'PÁGINA 6 • E VOCÊ'],
    subs: [
      [{ from: 10, who: 'NARRADOR', text: 'Depois da Copa, cada egoísta seguiu o próprio caminho.', color: '#94a3b8' }],
      [],
      [],
      [],
      [{ from: 10, who: 'NARRADOR', text: 'E, do outro lado do mundo...', color: '#94a3b8' }],
      [{ from: 30, who: 'NARRADOR', text: '...você voltou pro lugar onde tudo começou.', color: '#94a3b8' }]
    ],
    draw(ctx, S) {
      this.finEpi(ctx, S);
    }
  });

  CE.finEpi = function (ctx, S) {
    const { W, H, t, phase, top, bot } = S;
    if (phase === 0) {
      this.finPage(ctx, S, [
        {
          at: 0, from: 'left',
          pts: [[24, 430], [610, 412], [590, bot - 14], [24, bot - 14]],
          draw: (lt) => {
            ctx.fillStyle = '#010205';
            ctx.fillRect(0, 380, 640, 300);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = '900 15px "Segoe UI", sans-serif';
            ctx.fillStyle = '#00f5d4';
            ctx.fillText('E P Í L O G O', 60, 470);
            ctx.font = 'italic 900 50px "Segoe UI", sans-serif';
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#020617';
            ctx.fillStyle = '#f8fafc';
            const s = this.cineType('O DESTINO', lt / 30);
            const s2 = this.cineType('DE CADA UM', (lt - 20) / 30);
            ctx.fillText(s, 56, 520);
            ctx.fillText(s2, 56, 574);
            ctx.fillStyle = '#00f5d4';
            ctx.fillRect(58, 604, 380 * ease(lt / 60), 4);
          }
        },
        {
          at: 30, from: 'top',
          pts: [[24, top + 14], [1256, top + 14], [1256, 398], [24, 414]],
          boxes: [{ x: 44, y: top + 30, w: 430, label: 'RIN ITOSHI', text: 'Todo dia, antes do sol nascer. Sozinho. Ainda caçando o número 1.', color: '#14b8a6', at: 30 }],
          draw: (lt) => {
            const pan = lt * 0.12;
            this.cineGradient(ctx, 0, top, W, 330, [[0, '#0b1446'], [0.45, '#7c2d6b'], [0.8, '#f97316'], [1, '#fde68a']]);
            this.cineGlow(ctx, 920 - pan, 384, 220, 'rgba(253,186,116,0.6)');
            ctx.fillStyle = '#fef3c7';
            ctx.beginPath();
            ctx.arc(920 - pan, 392, 60, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = '#071512';
            ctx.fillRect(0, 386, W, 60);
            ctx.strokeStyle = '#020617';
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(150 - pan, 390);
            ctx.lineTo(150 - pan, 250);
            ctx.lineTo(420 - pan, 250);
            ctx.lineTo(420 - pan, 390);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(2,6,23,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 160; x < 420; x += 16) {
              ctx.moveTo(x - pan, 254);
              ctx.lineTo(x - pan, 388);
            }
            ctx.stroke();
            ctx.fillStyle = 'rgba(2,6,23,0.45)';
            ctx.beginPath();
            ctx.ellipse(640 - pan, 392, 160, 8, 0, 0, TAU);
            ctx.fill();
            const rin = this.cineChar('rin', KIT_RIN);
            // o gol fica à esquerda (a bola vai de 650 pra 330): chuta virado pra esquerda
            this.finRim(ctx, rin, 720 - pan, 392, 230, { animState: 'shoot', flipX: true, dim: 0.55, dimTint: '30,10,30' }, '#fdba74', [1], 3);
            const bk = clamp((lt % 80) / 50);
            this.drawAnimeBall(ctx, lerp(650, 330, bk) - pan, 370 - Math.sin(bk * Math.PI) * 90, 11, 'rgba(253,186,116,0.4)', lt);
          }
        },
        {
          at: 110, from: 'right',
          pts: [[632, 412], [1256, 402], [1256, bot - 14], [612, bot - 14]],
          draw: () => {
            this.cineGradient(ctx, 600, 400, 680, 240, [[0, '#1a0b1c'], [1, '#04060c']]);
            const dw = 640;
            this.finEyes(ctx, this.cineChar('rin'), 940 - dw / 2, 520 - (dw / 14) * 3.1, dw, { ring: '#2dd4bf', iris: '#0f766e' });
            const lg = ctx.createLinearGradient(612, 0, 1256, 0);
            lg.addColorStop(0, 'rgba(2,6,23,0.6)');
            lg.addColorStop(1, 'rgba(249,115,22,0.18)');
            ctx.fillStyle = lg;
            ctx.fillRect(600, 400, 680, 240);
          }
        }
      ]);
    } else if (phase === 1) {
      this.finPage(ctx, S, [
        {
          at: 0, from: 'left',
          pts: [[24, top + 14], [560, top + 14], [500, bot - 14], [24, bot - 14]],
          boxes: [{ x: 40, y: top + 28, w: 400, label: 'MEGURU BACHIRA', text: 'Voltou pro bairro. Agora o monstro dele tem alunos.', color: '#ca8a04' }],
          draw: (lt) => {
            this.cineGradient(ctx, 0, top, 580, 548, [[0, '#7c2d6b'], [0.55, '#f97316'], [1, '#3b1d2b']]);
            ctx.fillStyle = '#4a2c3a';
            ctx.fillRect(0, 300, 580, 220);
            [['#facc15', 90, 360, 70], ['#22d3ee', 260, 340, 60], ['#f472b6', 420, 380, 80]].forEach(([c, x, y, r]) => {
              ctx.fillStyle = c;
              ctx.globalAlpha = 0.55;
              ctx.beginPath();
              ctx.ellipse(x, y, r, r * 0.5, 0.3, 0, TAU);
              ctx.fill();
            });
            ctx.globalAlpha = 1;
            ctx.font = 'italic 900 44px "Segoe UI", sans-serif';
            ctx.fillStyle = '#1e3a8a';
            ctx.fillText('MONSTRO', 160, 400);
            this.cineGradient(ctx, 0, 500, 580, 140, [[0, '#2a1e33'], [1, '#120a18']]);
            ctx.strokeStyle = 'rgba(250,204,21,0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 560);
            ctx.lineTo(580, 540);
            ctx.stroke();
            const bach = this.cineChar('bachira', { outfit: 'casual', clothesColor: '#facc15' });
            this.finSpr(ctx, this.finKid(0), 92, 590, 150, {});
            this.finSpr(ctx, this.finKid(1), 410, 586, 140, { animState: 'call_pass' });
            this.finSpr(ctx, bach, 250, 600, 270, {});
            this.finSpr(ctx, this.finKid(2), 470, 612, 160, {});
            const bx = 250 + Math.sin(lt * 0.14) * 70;
            this.drawAnimeBall(ctx, bx, 590 - Math.abs(Math.sin(lt * 0.28)) * 34, 12, 'rgba(250,204,21,0.35)', lt);
            ctx.font = 'italic 900 22px "Segoe UI", sans-serif';
            ctx.fillStyle = '#fef9c3';
            ctx.textAlign = 'center';
            if (lt > 40) ctx.fillText('UAAAU!', 440, 440);
          }
        },
        {
          at: 45, from: 'right',
          pts: [[576, top + 14], [1256, top + 14], [1256, 354], [552, 354]],
          boxes: [{ x: 588, y: top + 26, w: 320, label: 'NAGI & REO', text: '"Mais uma." (Era a décima. O Reo pagou o jogo novo.)', color: '#9333ea' }],
          draw: (lt) => {
            ctx.fillStyle = '#03050d';
            ctx.fillRect(540, top, 740, 280);
            this.cineGlow(ctx, 1100, 220, 300, 'rgba(96,165,250,0.4)');
            ctx.fillStyle = '#0b1120';
            ctx.fillRect(990, 130, 240, 150);
            this.cineGradient(ctx, 998, 138, 224, 134, [[0, '#93c5fd'], [1, '#1d4ed8']]);
            this.finPixelText(ctx, lt % 90 < 70 ? 'WIN' : 'GG', 1110, 205, 4, '#f8fafc');
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath();
            ctx.ellipse(800, 330, 190, 40, 0, 0, TAU);
            ctx.fill();
            const nagi = this.cineChar('nagi', { outfit: 'casual', clothesColor: '#cbd5e1' });
            ctx.save();
            ctx.translate(760, 300);
            ctx.rotate(-Math.PI / 2 + 0.15);
            this.finSpr(ctx, nagi, 0, 210 * 0.42, 210, { dim: 0.3, dimTint: '30,64,175' });
            ctx.restore();
            this.finSpr(ctx, this.cineChar('reo', { outfit: 'casual', clothesColor: '#6d28d9' }), 930, 344, 210, { dim: 0.3, dimTint: '30,64,175' });
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(902, 280, 22, 12);
            ctx.fillRect(820, 268, 22, 12);
          }
        },
        {
          at: 95, from: 'bottom',
          pts: [[552, 370], [1256, 370], [1256, bot - 14], [500, bot - 14]],
          boxes: [{ x: 1000, y: 386, w: 240, label: 'HYOMA CHIGIRI', text: 'Ninguém alcança. Nem a lesão.', color: '#e11d48' }],
          draw: (lt) => {
            this.cineGradient(ctx, 480, 360, 800, 280, [[0, '#0f2a4a'], [0.5, '#14532d'], [1, '#0b3a20']]);
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.45)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 22; i++) {
              const y = 380 + ((i * 53) % 250);
              const len = 120 + (i % 5) * 70;
              const x = 1300 - ((i * 211 + lt * 30) % 1000);
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + len, y);
              ctx.stroke();
            }
            ctx.restore();
            this.finRim(ctx, this.cineChar('chigiri'), 820, 640, 290, { animState: 'run', frame: 1 + (Math.floor(lt / 2) % 17) }, '#fda4af', [-1], 4);
            this.cineDust(ctx, W, H, lt * 6, 20, 'rgba(226,232,240,0.6)', 11);
          }
        }
      ]);
    } else if (phase === 2) {
      this.finPage(ctx, S, [
        {
          at: 0, from: 'left',
          pts: [[24, top + 14], [760, top + 14], [730, 354], [24, 354]],
          boxes: [{ x: 40, y: top + 28, w: 400, label: 'RENSUKE KUNIGAMI', text: 'Voltou do fundo do poço. Treina em dobro: o herói agora é ele mesmo.', color: '#ea580c' }],
          draw: (lt) => {
            ctx.fillStyle = '#04070f';
            ctx.fillRect(0, top, 780, 280);
            ctx.fillStyle = '#0d1f14';
            ctx.fillRect(0, 300, 780, 60);
            ctx.fillStyle = '#111827';
            ctx.fillRect(600, 110, 8, 200);
            this.cineGlow(ctx, 604, 112, 70, 'rgba(254,240,138,0.7)');
            this.cineShafts(ctx, 604, 112, Math.PI / 2 + 0.25, 320, 0.7, 4, '254,240,138', 0.14, lt);
            const kun = this.cineChar('kunigami');
            this.finRim(ctx, kun, 560, 340, 230, { animState: lt % 70 < 30 ? 'windup' : 'shoot' }, '#fb923c', [-1, 1], 3);
            if (lt % 70 >= 30) {
              const bk = ((lt % 70) - 30) / 40;
              const bx = 640 + bk * 140;
              this.drawSpeedLines(ctx, 780, 360, 'rgba(251,146,60,0.6)', 0.25);
              this.drawAnimeBall(ctx, bx, 300 - bk * 40, 12, 'rgba(249,115,22,0.6)', lt);
            }
          }
        },
        {
          at: 45, from: 'right',
          pts: [[776, top + 14], [1256, top + 14], [1256, bot - 14], [742, bot - 14]],
          boxes: [{ x: 790, y: bot - 140, w: 440, label: 'SAE ITOSHI', text: 'Em Madri. Ainda procura alguém que mereça o passe dele. Achou um.', color: '#db2777' }],
          draw: (lt) => {
            this.cineGradient(ctx, 740, top, 540, 548, [[0, '#0b1126'], [1, '#1c1430']]);
            for (let r = 0; r < 6; r++) {
              ctx.fillStyle = r % 2 ? '#141c38' : '#10182f';
              ctx.fillRect(740, 130 + r * 22, 540, 18);
            }
            this.cineBokeh(ctx, W, 110, 260, lt, 12, ['rgba(254,240,138,0.5)', 'rgba(255,255,255,0.4)'], 18);
            this.cineGradient(ctx, 740, 380, 540, 260, [[0, '#14532d'], [1, '#052e16']]);
            this.finRim(ctx, this.cineChar('sae'), 1010, 560, 330, {}, '#fbcfe8', [-1, 1], 3);
            this.drawAnimeBall(ctx, 1080, 548, 13, 'rgba(236,72,153,0.3)', 0);
          }
        },
        {
          at: 95, from: 'bottom',
          pts: [[24, 370], [726, 370], [700, bot - 14], [24, bot - 14]],
          boxes: [{ x: 40, y: 386, w: 330, label: 'RYUSEI SHIDOU', text: 'Continua explodindo. O PXG já trocou a rede três vezes.', color: '#db2777' }],
          draw: (lt) => {
            this.cineGradient(ctx, 0, 360, 740, 280, [[0, '#2a0a24'], [1, '#0a0410']]);
            ctx.save();
            ctx.translate(500, 500);
            ctx.rotate(lt * 0.01);
            ctx.fillStyle = 'rgba(244,114,182,0.55)';
            ctx.beginPath();
            for (let i = 0; i < 24; i++) {
              const r = i % 2 ? 70 : 220;
              const a = (i / 24) * TAU;
              if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
              else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.fill();
            ctx.restore();
            this.finSpr(ctx, this.cineChar('shidou'), 430, 590, 250, { animState: 'bicycle', showAura: true });
            this.drawAnimeBall(ctx, 640, 440, 14, 'rgba(244,114,182,0.7)', lt);
            this.cineImpactText(ctx, 'BOOM!', 610, 600, 48, '#f9a8d4', clamp(lt / 12), 0, -0.12);
          }
        }
      ]);
    } else if (phase === 3) {
      this.finPage(ctx, S, [
        {
          at: 0, from: 'left',
          pts: [[24, top + 14], [640, top + 14], [580, bot - 14], [24, bot - 14]],
          boxes: [{ x: 40, y: top + 28, w: 380, label: 'KAISER & NESS', text: '"Da próxima vez, a coroa volta pra Alemanha." Eles também não esqueceram.', color: '#2563eb' }],
          draw: (lt) => {
            this.cineGradient(ctx, 0, top, 660, 548, [[0, '#0b1a3a'], [1, '#1e3a5f']]);
            for (let r = 0; r < 7; r++) {
              ctx.fillStyle = r % 2 ? '#132a52' : '#0f2347';
              ctx.fillRect(0, 210 + r * 20, 660, 16);
            }
            this.cineGradient(ctx, 0, 350, 660, 300, [[0, '#e2e8f0'], [1, '#94a3b8']]);
            this.finRim(ctx, this.cineChar('ness'), 160, 600, 250, { dim: 0.25, dimTint: '20,30,60' }, '#f9a8d4', [1], 3);
            this.finRim(ctx, this.cineChar('kaiser'), 360, 624, 330, {}, '#93c5fd', [-1, 1], 4);
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 50; i++) {
              const x = (rnd(i, 90) * 660 + Math.sin(lt * 0.03 + i) * 20) % 660;
              const y = top + ((rnd(i, 91) * 548 + lt * (0.8 + rnd(i, 92))) % 548);
              ctx.fillRect(x, y, 3, 3);
            }
            const ph = (lt * 0.02) % 1;
            ctx.fillStyle = `rgba(241,245,249,${(1 - ph) * 0.35})`;
            ctx.beginPath();
            ctx.ellipse(400 + ph * 40, 440 - ph * 30, 10 + ph * 26, 8 + ph * 16, 0, 0, TAU);
            ctx.fill();
          }
        },
        {
          at: 60, from: 'right',
          pts: [[656, top + 14], [1256, top + 14], [1256, bot - 14], [596, bot - 14]],
          boxes: [{ x: 700, y: bot - 128, w: 520, label: 'JINPACHI EGO', text: 'No escuro, de novo. Já está assistindo a próxima geração.', color: '#0d9488' }],
          draw: (lt) => {
            ctx.save();
            ctx.translate(596, top);
            this.drawBgMonitorRoom(ctx, 660, 548);
            ctx.restore();
            ctx.fillStyle = '#020617';
            ctx.fillRect(820, 150, 240, 140);
            this.cineGradient(ctx, 826, 156, 228, 128, [[0, '#0f3b46'], [1, '#04161c']]);
            this.finPixelText(ctx, 'PRÓXIMA', 940, 196, 2.6, '#00f5d4');
            this.finPixelText(ctx, 'GERAÇÃO', 940, 236, 2.6, '#00f5d4');
            this.finFillPat(ctx, 'scan', 826, 156, 228, 128, 0.8);
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 3;
            ctx.strokeRect(820, 150, 240, 140);
            this.cineGlow(ctx, 940, 300, 260, 'rgba(0,245,212,0.22)');
            this.finRim(ctx, this.getSpeakerCharData('EGO'), 940, 600, 320, { facing: 'back', dim: 0.6, dimTint: '2,8,16' }, '#2dd4bf', [-1, 1], 3);
            ctx.fillStyle = '#05080f';
            ctx.fillRect(860, 520, 160, 120);
            void lt;
          }
        }
      ]);
    } else if (phase === 4) {
      // Brasil: o garoto no campinho de terra; o Fox no escuro, só o sorriso
      const fox = this.getSpeakerCharData('FOX');
      this.finPage(ctx, S, [
        {
          at: 0, from: 'bottom',
          pts: [[24, top + 14], [1256, top + 14], [1256, bot - 14], [24, bot - 14]],
          boxes: [
            { x: 44, y: top + 30, w: 420, label: 'BRASIL', text: 'Um campinho de terra. Um garoto de 14 anos. Fome nos olhos.', color: '#16a34a', at: 20 },
            { x: 760, y: top + 30, w: 300, label: '???', text: '"Hehehe... esse vai ficar caro."', color: '#b91c1c', at: 120 }
          ],
          draw: (lt) => {
            const pan = lt * 0.15;
            this.cineGradient(ctx, 0, top, W, 340, [[0, '#3b0d4a'], [0.5, '#c2410c'], [1, '#fdba74']]);
            this.cineGlow(ctx, 360, 330, 160, 'rgba(254,215,170,0.8)');
            for (let i = 0; i < 26; i++) {
              const x = i * 52 - pan * 0.3;
              const hgt = 50 + rnd(i, 100) * 90;
              const y = 360 - (i % 7) * 6 - hgt;
              ctx.fillStyle = ['#7c2d12', '#9a3412', '#a16207', '#1e3a8a', '#9d174d'][i % 5];
              ctx.fillRect(x, y, 48, hgt + 20);
              ctx.fillStyle = 'rgba(254,240,138,0.7)';
              if (rnd(i, 101) < 0.6) ctx.fillRect(x + 10, y + 14, 8, 8);
              if (rnd(i, 102) < 0.4) ctx.fillRect(x + 28, y + 30, 8, 8);
            }
            this.cineGradient(ctx, 0, 380, W, 260, [[0, '#9a4a1f'], [1, '#4a2410']]);
            ctx.strokeStyle = '#e7e5e4';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(150 - pan, 520);
            ctx.lineTo(150 - pan, 410);
            ctx.lineTo(330 - pan, 404);
            ctx.lineTo(330 - pan, 520);
            ctx.stroke();
            const kid = this.finKid(0, { name: 'Garoto do campinho', jerseyPrimary: '#facc15', jerseySecondary: '#16a34a' });
            const kx = 560 - pan * 0.5;
            ctx.fillStyle = 'rgba(41,20,8,0.45)';
            ctx.beginPath();
            ctx.ellipse(kx + 50, 572, 90, 8, 0, 0, TAU);
            ctx.fill();
            this.finRim(ctx, kid, kx, 572, 210, {}, '#fdba74', [-1], 3);
            const jb = Math.abs(Math.sin(lt * 0.09));
            this.drawAnimeBall(ctx, kx + 46, 556 - jb * 84, 12, 'rgba(253,186,116,0.35)', lt);
            this.cineDust(ctx, W, H, lt, 30, 'rgba(253,186,116,0.6)', 13);
            // O Fox no primeiro plano
            const fs = 660;
            const ffeet = bot + 200;
            this.finSpr(ctx, fox, 1060, ffeet, fs, { dim: 0.3, dimTint: '20,6,4' });
            this.drawFaceShadow(ctx, fox, 1060, ffeet, fs, { animState: 'idle', frame: 45 }, 1, 11.6, 12.4);
            const u = fs / 36;
            // O sorriso aceso por cima da sombra (como no fox_watch: só ele aparece)
            const fTop = ffeet - fs * 0.87;
            this.finU(ctx, 1060, fTop, u, 15.4, 11.9, 5.2, 1.5, '#0a0f1c');
            this.finU(ctx, 1060, fTop, u, 15.7, 12.05, 4.6, 0.75, '#f8fafc');
            this.finU(ctx, 1060, fTop, u, 17.3, 12.05, 0.65, 1.1, '#f8fafc');
            this.finU(ctx, 1060, fTop, u, 18.05, 12.05, 0.65, 1.1, '#f8fafc');
            const cx = 1060 + 4.5 * u;
            const cy = ffeet - fs * 0.87 + SPRITE_MAPY(12.6) * u;
            ctx.fillStyle = '#e7e5e4';
            ctx.fillRect(cx - 4, cy - 4, 46, 8);
            this.cineGlow(ctx, cx + 46, cy, 14, 'rgba(251,146,60,0.95)', 0.7 + 0.3 * Math.sin(lt * 0.2));
            ctx.strokeStyle = 'rgba(214,211,209,0.28)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 18; i++) {
              const y = cy - i * 12;
              const x = cx + 46 + Math.sin(i * 0.6 - lt * 0.06) * (6 + i * 1.6);
              if (i) ctx.lineTo(x, y);
              else ctx.moveTo(x, y);
            }
            ctx.stroke();
          }
        },
        {
          at: 70, from: 'left',
          pts: [[60, 410], [400, 400], [390, bot - 40], [60, bot - 40]],
          draw: () => {
            ctx.fillStyle = '#1c0d05';
            ctx.fillRect(40, 380, 380, 260);
            const kid = this.finKid(0, { jerseyPrimary: '#facc15', jerseySecondary: '#16a34a' });
            const dw = 380;
            this.finEyes(ctx, kid, 228 - dw / 2, 500 - (dw / 14) * 3.1, dw, { iris: '#1c0d05', ring: '#a16207', look: 1 });
          }
        }
      ]);
    } else {
      // E você: o campinho do colégio à noite, uma bola velha, a luz de um poste
      const name = this.cinePlayerName();
      const k = easeIO(t / 210);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(380, 372, k), zoom: lerp(1, 1.16, k), shake: 0.4 });
      this.cineNightSky(ctx, W, H, t, { top: '#01030a', bottom: '#0c1c40' });
      this.cineCity(ctx, W, 440, 120, '#060c1c', 'rgba(253,224,71,0.45)', 21, 0);
      this.cineGradient(ctx, 0, 440, W, 300, [[0, '#0b2a1a'], [1, '#04120a']]);
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -120; x < W + 120; x += 30) {
        ctx.moveTo(x, 300);
        ctx.lineTo(x + 140, 440);
        ctx.moveTo(x + 140, 300);
        ctx.lineTo(x, 440);
      }
      ctx.stroke();
      ctx.fillStyle = '#111827';
      ctx.fillRect(-400, 296, W + 800, 6);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(930, 470);
      ctx.lineTo(930, 380);
      ctx.lineTo(1140, 374);
      ctx.lineTo(1140, 470);
      ctx.stroke();
      ctx.fillStyle = '#0b1120';
      ctx.fillRect(330, 150, 10, 420);
      ctx.fillRect(330, 150, 70, 10);
      this.cineGlow(ctx, 400, 162, 60, 'rgba(254,240,138,0.85)');
      this.cineShafts(ctx, 400, 166, Math.PI / 2 + 0.2, 480, 0.75, 5, '254,240,138', 0.12, t);
      ctx.fillStyle = 'rgba(2,6,23,0.45)';
      ctx.beginPath();
      ctx.ellipse(700, 594, 170, 10, 0.05, 0, TAU);
      ctx.fill();
      const you = this.cineYou({ outfit: 'casual', clothesColor: '#1e3a8a' });
      this.finRim(ctx, you, 640, 596, 360, {}, '#fde68a', [-1], 4);
      this.drawAnimeBall(ctx, 690, 584, 15, 'rgba(0,0,0,0)', 4);
      ctx.fillStyle = 'rgba(120,53,15,0.35)';
      ctx.beginPath();
      ctx.arc(690, 584, 15, 0, TAU);
      ctx.fill();
      ctx.restore();
      this.cineDust(ctx, W, H, t, 24, 'rgba(254,240,138,0.6)', 17);
      const e = ease(seg(t, 100, 116));
      if (e > 0) {
        this.finPanel(ctx, [[0, top + 16], [W, top + 16], [W, top + 122], [0, top + 122]], () => {
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, top, W, 150);
          const dw = 600;
          this.finEyes(ctx, this.cineYou(), 640 - dw / 2, top + 69 - (dw / 14) * 3.1, dw, {});
          this.drawSpeedLines(ctx, W, top + 140, 'rgba(0,245,212,0.5)', 0.18);
        }, { dx: (1 - e) * -W });
      }
      this.finBox(ctx, 760, bot - 150, 470, name, 'Campeão do mundo. Bola de Ouro. Número 1. E continua com fome.', '#0d9488', seg(t, 130, 146));
    }
  };
})();
