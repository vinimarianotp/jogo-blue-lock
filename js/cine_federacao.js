// ============================================================================
// A FEDERAÇÃO E O BLUE LOCK ELEVEN (cine_federacao) — ver js/cine_kit.js
//   ego_federation • a sala da JFU: os cartolas → "projeto de crianças" → o Ego entra sem
//                    convite → a aposta (perdeu = acabou / ganhou = vira a seleção) →
//                    APROVADO → o corredor: a Anri, o Aiku no tablet e o sorriso do Ego
//   bl_eleven      • o telão: a formação aparece jogador por jogador → o SEU nome no
//                    centro do ataque → as reações → o silêncio: o Shidou ficou de fora
//   shidou_cut     • o Shidou explode → o Ego, frio: "você é um risco" → o Sae na sala da
//                    Sub-20: "o Shidou vem comigo" → o Shidou de camisa da Sub-20 →
//                    o Rin olhando para o irmão
// Os cartolas e o presidente da JFU são bonecos do PixelRenderer (terno) com retoques em
// pixel por cima (calvície, bigode, papada, barriga, gravata), guardados prontos (fedxEntry).
// Usa os bonecos guardados da cine_final (finSpr/finHead/finCrop), o rincStamp da cine_rin,
// o wcdEye/wcdAura/wcdRim2 da cine_wildcard e o foxcGradH/foxcGrain da cine_fox.
// Helpers daqui têm o prefixo "fedx".
// Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas, sem tela piscando (um flash por
// impacto), olhos em close em pixel art, frame 0 = piscada (não usar).
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
  const line = (ctx, a, b) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  // Passo da caminhada: os quadros da corrida, devagar (4 quadros por ciclo)
  const WALKF = (f, sp = 6) => 1 + (Math.floor(f / sp) % 4) * 4;

  const EGO_C = '#00f5d4';
  const ANRI_C = '#fcd34d';
  const PRES_C = '#f59e0b';
  const CART_C = '#cbd5e1';
  const NARR_C = '#94a3b8';
  const SAE_C = '#f9a8d4';
  const SHIDOU_C = '#ec4899';
  const RIN_C = '#22d3ee';
  const BACH_C = '#facc15';
  const NAGI_C = '#e2e8f0';
  const CHI_C = '#fb7185';
  const YOU_C = '#00f5d4';
  // A mesa da sala da JFU (tampo) e os lugares dos cartolas [quem, x, tamanho]
  const TABLE_Y = 494;
  const SEATS = [['old3', 236, 238], ['old1', 430, 250], ['pres', 640, 300], ['old2', 850, 250], ['old4', 1044, 238]];
  const PLATES = { old3: 'CONSELHO', old1: 'DIRETORIA', pres: 'PRESIDENTE', old2: 'TESOURARIA', old4: 'SELEÇÕES' };
  // Ponto de fuga do corredor de vidro
  const HVP = [640, 318];

  // ==========================================================================
  // OS CARTOLAS (bonecos novos: velhos de terno)
  // ==========================================================================
  const OLD = {
    pres: {
      id: 'fedx_pres', name: 'Presidente da JFU', skinColor: '#efc39f', hairColor: '#d6d9de', hairSecondary: '#f1f5f9', eyeColor: '#3f2a1d',
      hairStyle: 'buzz_tall', eyeStyle: 'lidded', mouth: 'grin', outfit: 'suit', jerseyPrimary: '#111827', jerseySecondary: '#475569', auraColor: '#f59e0b',
      fedxOld: { bald: true, brows: '#f1f5f9', mustache: '#eef0f3', tie: '#b91c1c', fat: true, pin: true }
    },
    old1: {
      id: 'fedx_old1', name: 'Cartola 1', skinColor: '#f3d1b8', hairColor: '#8b9099', hairSecondary: '#c7ccd3', eyeColor: '#1f2937',
      hairStyle: 'short_sharp', glasses: true, mouth: 'thin', outfit: 'suit', jerseyPrimary: '#111827', jerseySecondary: '#475569', auraColor: '#94a3b8',
      fedxOld: { brows: '#6b7280', tie: '#1d4ed8', pocket: true }
    },
    old2: {
      id: 'fedx_old2', name: 'Cartola 2', skinColor: '#e2b48e', hairColor: '#5b6069', hairSecondary: '#80868f', eyeColor: '#292524',
      hairStyle: 'buzz_tall', eyeStyle: 'lidded', mouth: 'thin', outfit: 'suit', jerseyPrimary: '#111827', jerseySecondary: '#475569', auraColor: '#94a3b8',
      fedxOld: { bald: true, brows: '#4b5563', mustache: '#4b5563', tie: '#7f1d1d', pin: true }
    },
    old3: {
      id: 'fedx_old3', name: 'Cartola 3', skinColor: '#f0cdb1', hairColor: '#cfd3d8', hairSecondary: '#e5e7eb', eyeColor: '#374151',
      hairStyle: 'soft_side', eyeStyle: 'tired', mouth: 'thin', outfit: 'suit', jerseyPrimary: '#111827', jerseySecondary: '#475569', auraColor: '#94a3b8',
      fedxOld: { brows: '#e5e7eb', tie: '#334155', pocket: true }
    },
    old4: {
      id: 'fedx_old4', name: 'Cartola 4', skinColor: '#e9c4a4', hairColor: '#3f444c', hairSecondary: '#9ca3af', eyeColor: '#1f2937',
      hairStyle: 'sae_swept', eyeStyle: 'sharp', mouth: 'thin', outfit: 'suit', jerseyPrimary: '#111827', jerseySecondary: '#475569', auraColor: '#94a3b8',
      fedxOld: { brows: '#9ca3af', tie: '#0f766e', wrinkles: true }
    }
  };

  // ==========================================================================
  // HELPERS (prefixo fedx)
  // ==========================================================================
  Object.assign(CE, {
    fedxCast() {
      const you0 = this.cineYou();
      const key = JSON.stringify(you0);
      if (this._fedxCastC && this._fedxCastC.key === key) return this._fedxCastC.c;
      const bl = this.KITS.blueLock;
      const u20 = this.KITS.u20;
      const japan = this.KITS.japan;
      const ch = (id, kit, extra = {}) => this.cineChar(id, Object.assign({}, kit, extra));
      const c = {
        ego: this.getSpeakerCharData('JINPACHI EGO'),
        anri: this.getSpeakerCharData('ANRI TEIERI'),
        pres: OLD.pres,
        old1: OLD.old1,
        old2: OLD.old2,
        old3: OLD.old3,
        old4: OLD.old4,
        you: this.cineYou(Object.assign({}, bl)),
        youJp: this.cineYou(Object.assign({}, japan)),
        rin: ch('rin', bl),
        rinJp: ch('rin', japan),
        rinCold: ch('rin', bl, { angry: true }),
        nagi: ch('nagi', bl),
        nagiJp: ch('nagi', japan),
        bachira: ch('bachira', bl),
        chigiri: ch('chigiri', bl),
        gagamaru: ch('gagamaru', bl),
        aryu: ch('aryu', bl),
        niko: ch('niko', bl),
        karasu: ch('karasu', bl),
        otoya: ch('otoya', bl),
        yukimiya: ch('yukimiya', bl),
        shidou: ch('shidou', bl),
        shidouMad: ch('shidou', bl, { angry: true }),
        shidouU20: ch('shidou', u20),
        sae: ch('sae', u20),
        aiku: ch('aiku', u20)
      };
      this._fedxCastC = { key, c };
      return c;
    },

    // Aquecimento: um item por quadro durante o plano 1 (sem travada na troca de plano)
    fedxWarm(S, list) {
      if (S.phase !== 0 || S.t < 3) return;
      const run = `${this.sakugaType}|${this._cineRun}`;
      if (this._fedxWarmRun !== run) {
        this._fedxWarmRun = run;
        this._fedxWarmIdx = 0;
      }
      if (this._fedxWarmIdx < list.length) list[this._fedxWarmIdx++].call(this);
    },

    // ------------------------------------------------------------- os cartolas
    // Retoques em pixel por cima do boneco de terno (unidades 0..36 da pixel art)
    fedxOldPaint(g, x0, y0, u, char, o) {
      const sp = char.fedxOld;
      const R = (x, y, w, h, col) => {
        g.fillStyle = col;
        g.fillRect(Math.round(x0 + x * u), Math.round(y0 + SPRITE_MAPY(y) * u), Math.ceil(w * u), Math.ceil((SPRITE_MAPY(y + h) - SPRITE_MAPY(y)) * u));
      };
      const back = o.facing === 'back';
      // silhueta (luz de recorte, sombra): só o que muda o contorno
      if (o.tint) {
        if (sp.fat) R(10.2, 17.0, 15.6, 5.0, o.tint);
        return;
      }
      const skin = char.skinColor;
      const sh = this.finShade(skin, -0.14);
      const dk = this.finShade(skin, -0.32);
      const suit = '#0b0f1a';
      if (sp.fat) {
        R(10.2, 17.0, 15.6, 5.0, '#0a0f1c');
        R(10.7, 17.3, 14.6, 4.3, suit);
        R(22.4, 17.3, 2.9, 4.3, '#06080f');
        R(10.7, 21.0, 14.6, 0.5, '#020617');
      }
      if (back) {
        if (sp.bald) {
          R(12.8, 2.0, 10.4, 2.4, skin);
          R(14.4, 2.4, 4, 0.6, this.finShade(skin, 0.22));
        }
        return;
      }
      if (sp.bald) {
        R(12.4, 2.0, 11.2, 4.4, skin);
        R(13.4, 1.7, 9.2, 0.5, skin);
        R(14.6, 2.4, 3.6, 0.6, this.finShade(skin, 0.25));
        R(15.0, 5.5, 6.0, 0.35, sh);
        R(15.8, 6.4, 4.4, 0.35, sh);
      }
      if (sp.wrinkles) {
        R(15.2, 6.6, 5.6, 0.3, sh);
      }
      if (sp.brows) {
        R(12.8, 7.8, 3.4, 1.0, sp.brows);
        R(19.8, 7.8, 3.4, 1.0, sp.brows);
      }
      // olheiras e o vinco do nariz até a boca
      R(13.1, 11.55, 2.9, 0.32, sh);
      R(20.0, 11.55, 2.9, 0.32, sh);
      R(15.0, 11.4, 0.32, 1.3, sh);
      R(20.7, 11.4, 0.32, 1.3, sh);
      if (sp.fat) {
        // papada e bochechas
        R(11.5, 10.4, 0.9, 2.6, skin);
        R(23.6, 10.4, 0.9, 2.6, skin);
        R(11.5, 12.6, 0.9, 0.5, sh);
        R(23.6, 12.6, 0.9, 0.5, sh);
        R(14.0, 13.5, 8.0, 0.8, sh);
        R(15.0, 14.1, 6.0, 0.5, dk);
      }
      if (sp.mustache) {
        R(15.2, 11.45, 5.6, 0.75, sp.mustache);
        R(14.8, 11.9, 0.8, 0.7, sp.mustache);
        R(20.4, 11.9, 0.8, 0.7, sp.mustache);
        R(15.4, 12.05, 5.2, 0.15, this.finShade(sp.mustache, -0.3));
      }
      if (sp.tie) {
        R(17.5, 14.6, 1, 4.4, sp.tie);
        R(17.25, 14.6, 1.5, 0.8, this.finShade(sp.tie, -0.25));
        if (sp.fat) {
          R(16.5, 17.3, 3.0, 2.6, '#e2e8f0');
          R(17.5, 17.3, 1, 3.2, sp.tie);
          R(17.7, 20.4, 0.6, 0.5, '#94a3b8');
        }
      }
      if (sp.pin) R(14.1, 15.6, 0.7, 0.7, '#facc15');
      if (sp.pocket) R(21.4, 15.2, 1.4, 0.6, '#e2e8f0');
    },

    // Boneco pronto (como o finSprEntry) com os retoques dos cartolas
    fedxEntry(char, base, o) {
      if (!char.fedxOld) return this.finSprEntry(char, base, o);
      const cache = this._fedxSpr || (this._fedxSpr = new Map());
      if (o.rim) {
        const plain = Object.assign({}, o, { rim: null });
        const body = this.fedxEntry(char, base, plain);
        const ck = `rim|${o.rim}|${(o.rimSides || [-1, 1]).join(',')}|${o.rimD || 0}|${body.key}`;
        let e = cache.get(ck);
        if (e) return e;
        const sil = this.fedxEntry(char, base, Object.assign({}, plain, { tint: o.rim, dim: 0 }));
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
      const raw = this.finSprEntry(char, base, Object.assign({}, o, { dim: 0, dimTint: '' }));
      const key = `fedx|${raw.key}|${o.dim || 0}|${o.dimTint || ''}`;
      let e = cache.get(key);
      if (e) return e;
      const cv = document.createElement('canvas');
      cv.width = raw.cv.width;
      cv.height = raw.cv.height;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(raw.cv, 0, 0);
      this.fedxOldPaint(g, raw.pad, raw.pad, base / 36, char, o);
      if (o.dim) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = `rgba(${o.dimTint || '0,0,0'},${o.dim})`;
        g.fillRect(0, 0, cv.width, cv.height);
        g.globalCompositeOperation = 'source-over';
      }
      e = { cv, pad: raw.pad, base, key };
      if (cache.size > 90) cache.delete(cache.keys().next().value);
      cache.set(key, e);
      return e;
    },
    fedxSpr(ctx, char, x, feet, size, o = {}) {
      if (!char.fedxOld) return this.finSpr(ctx, char, x, feet, size, o);
      const base = size >= 180 ? 180 : Math.max(36, 36 * Math.ceil(size / 36));
      const e = this.fedxEntry(char, base, o);
      const k = size / base;
      ctx.save();
      ctx.imageSmoothingEnabled = size < base;
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.drawImage(e.cv, x - size / 2 - e.pad * k, feet - size * 0.87 - e.pad * k, e.cv.width * k, e.cv.height * k);
      ctx.restore();
    },
    // Luz de recorte assada (d = deslocamento em px do tamanho final)
    fedxRim(ctx, char, x, feet, size, o = {}, color = '#bfdbfe', sides = [-1, 1], d = 2) {
      const base = size >= 180 ? 180 : Math.max(36, 36 * Math.ceil(size / 36));
      const rimD = Math.max(1, Math.round((d * base) / size));
      this.fedxSpr(ctx, char, x, feet, size, Object.assign({}, o, { rim: color, rimSides: sides, rimD }));
    },
    fedxHead(ctx, char, cx, eyeY, size, o = {}) {
      const u = size / 36;
      const top = eyeY - SPRITE_MAPY(10.1) * u;
      const feet = top + size * 0.87;
      if (o.rimColor) this.fedxRim(ctx, char, cx, feet, size, o, o.rimColor, o.rimSides || [-1, 1], o.rimPx || 2);
      else this.fedxSpr(ctx, char, cx, feet, size, o);
      return { u, top, feet };
    },
    // Busto: o close sem as mãos (os braços somem abaixo do peito) e o pé escurecendo
    // (guardado pronto: os braços cortados no peito e o tronco sumindo para baixo, em alfa —
    // assim não sobra retângulo escuro em cima do cenário)
    // shade = em vez de sumir, o tronco escurece até quase preto (para fundo claro: nada de
    // ver o cenário através do boneco); aí o corte de baixo tem de ficar fora do quadro
    fedxBustEntry(char, o, shade = false) {
      const e = this.fedxEntry(char, 180, o);
      const cache = this._fedxBustC || (this._fedxBustC = new Map());
      const key = (shade ? 'bustS|' : 'bust|') + e.key;
      let b = cache.get(key);
      if (b) return b;
      const cv = document.createElement('canvas');
      cv.width = e.cv.width;
      cv.height = e.cv.height;
      const g = cv.getContext('2d');
      g.drawImage(e.cv, 0, 0);
      const P = e.pad;
      const U = 5;
      g.clearRect(0, P + 17.6 * U, P + 11.2 * U, cv.height);
      g.clearRect(P + 24.8 * U, P + 17.6 * U, cv.width, cv.height);
      g.globalCompositeOperation = shade ? 'source-atop' : 'destination-out';
      const grd = g.createLinearGradient(0, P + 15 * U, 0, P + 23.4 * U);
      grd.addColorStop(0, shade ? 'rgba(4,6,12,0)' : 'rgba(0,0,0,0)');
      grd.addColorStop(1, shade ? 'rgba(4,6,12,0.94)' : 'rgba(0,0,0,1)');
      g.fillStyle = grd;
      g.fillRect(0, P + 15 * U, cv.width, cv.height);
      b = { cv, pad: P };
      if (cache.size > 40) cache.delete(cache.keys().next().value);
      cache.set(key, b);
      return b;
    },
    fedxBust(ctx, char, cx, eyeY, size, o = {}, shade = false) {
      const u = size / 36;
      const top = eyeY - SPRITE_MAPY(10.1) * u;
      const oo = Object.assign({}, o);
      if (oo.rimColor) {
        oo.rim = oo.rimColor;
        oo.rimSides = oo.rimSides || [-1, 1];
        oo.rimD = 1;
        delete oo.rimColor;
        delete oo.rimPx;
      }
      const b = this.fedxBustEntry(char, oo, shade === true);
      const k = size / 180;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(b.cv, cx - size / 2 - b.pad * k, top - b.pad * k, b.cv.width * k, b.cv.height * k);
      ctx.restore();
      return { u, top, feet: top + size * 0.87 };
    },
    // Recorte ampliado (closes extremos), com os retoques
    fedxCrop(ctx, char, o, ux, uy, uw, uh, dx, dy, dw, dh) {
      const e = this.fedxEntry(char, 180, o || {});
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      // (uy em unidades do corpo antigo: SPRITE_MAPY leva pro boneco atual — chibi)
      ctx.drawImage(e.cv, e.pad + ux * 5, e.pad + SPRITE_MAPY(uy) * 5, uw * 5, uh * 5, dx, dy, dw, dh);
      ctx.restore();
    },
    // Retângulo em unidades do rosto
    fedxU(ctx, cx, top, u, x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(cx + (x - 18) * u), Math.round(top + SPRITE_MAPY(y) * u), Math.ceil(w * u), Math.ceil(h * u));
    },

    // Olhos fechados de rir (arquinhos em pixel) por cima do close
    fedxLaughEyes(ctx, cx, top, u, skin, line = '#0a0f1c', cover = 1.8) {
      const eyeY = top + SPRITE_MAPY(10.15) * u;
      [-1, 1].forEach((s) => {
        const ex = cx + s * 3.45 * u;
        ctx.fillStyle = skin;
        ctx.fillRect(Math.round(ex - cover * u), Math.round(eyeY - 1.35 * u), Math.ceil(cover * 2 * u), Math.ceil(2.6 * u));
        ctx.fillStyle = line;
        const p = Math.ceil(0.62 * u);
        [[-1.55, 0.35], [-0.95, -0.25], [-0.31, -0.5], [0.31, -0.5], [0.95, -0.25], [1.55, 0.35]].forEach(([dx, dy]) =>
          ctx.fillRect(Math.round(ex + dx * u - p / 2), Math.round(eyeY + dy * u - p / 2), p, p)
        );
      });
    },
    // Boca aberta de gargalhada (open 0..1), com o bigode por cima
    fedxLaughMouth(ctx, cx, top, u, open, mustache) {
      const U = (x, y, w, h, c) => this.fedxU(ctx, cx, top, u, x, y, w, h, c);
      const h = 1.1 + open * 1.4;
      U(15.0, 11.9, 6.0, h, '#1a0606');
      U(14.6, 12.2, 0.6, Math.max(0.4, h - 0.6), '#1a0606');
      U(20.8, 12.2, 0.6, Math.max(0.4, h - 0.6), '#1a0606');
      U(15.4, 11.95, 5.2, 0.55, '#f8fafc');
      [16.6, 17.8, 19.0].forEach((x) => U(x, 11.95, 0.18, 0.55, '#94a3b8'));
      if (open > 0.3) U(16.2, 11.9 + h - 0.75, 3.6, 0.6, '#b91c1c');
      if (mustache) {
        U(15.0, 11.4, 6.0, 0.75, mustache);
        U(14.6, 11.8, 0.8, 0.7, mustache);
        U(20.6, 11.8, 0.8, 0.7, mustache);
      }
    },
    // Reflexo nos óculos do Ego (a lente fica branca) — a = 0..1
    fedxGlare(ctx, cx, top, u, a, sweep = -1) {
      if (a <= 0 && sweep < 0) return;
      [12.4, 19.4].forEach((gx) => {
        const x = cx + (gx + 0.7 - 18) * u;
        const y = top + SPRITE_MAPY(9.3) * u;
        const w = 2.8 * u;
        const h = 2.1 * u;
        ctx.save();
        ctx.beginPath();
        ctx.rect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
        ctx.clip();
        if (a > 0) {
          ctx.fillStyle = `rgba(236,254,255,${0.96 * a})`;
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = `rgba(153,246,228,${0.55 * a})`;
          ctx.fillRect(x, y + h * 0.62, w, h * 0.38);
        }
        if (sweep >= 0 && sweep <= 1) {
          // faixa de luz passando pela lente, em degraus de pixel
          const p = u * 0.6;
          const sx = x - w + sweep * (w * 3);
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(sx + i * p), Math.round(y + h - (i + 1) * p), Math.ceil(p * 1.6), Math.ceil(p));
        }
        ctx.restore();
      });
    },
    // O canto da boca do Ego subindo (sorriso de lado)
    fedxSmirk(ctx, cx, top, u, k, skin = '#f1dfcd') {
      if (k <= 0) return;
      const U = (x, y, w, h, c) => this.fedxU(ctx, cx, top, u, x, y, w, h, c);
      const dk = this.finShade(skin, -0.45);
      U(16.3, 12.3, 3.6, 0.9, skin);
      U(16.4, 12.55, 1.3, 0.42, dk);
      U(17.6, 12.7, 1.5, 0.42, dk);
      U(19.0, 12.5 - 0.15 * k, 0.8, 0.42, dk);
      U(19.7, 12.15 - 0.2 * k, 0.7, 0.45, dk);
      U(19.5, 12.95, 0.9, 0.3, this.finShade(skin, -0.15));
    },

    // Gota de suor em pixel
    fedxSweat(ctx, x, y, s) {
      ctx.fillStyle = 'rgba(186,230,253,0.9)';
      ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(s), Math.ceil(s * 1.5));
      ctx.fillRect(Math.round(x + s * 0.25), Math.round(y - s * 0.5), Math.ceil(s * 0.5), Math.ceil(s * 0.5));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x + s * 0.15), Math.round(y + s * 0.2), Math.ceil(s * 0.35), Math.ceil(s * 0.35));
    },

    // Balãozinho de mangá (reação curta)
    fedxBubble(ctx, x, y, text, k, color = '#0b1120', size = 18, tail = -1) {
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, k * 2.5);
      const sc = 0.6 + 0.4 * ease(k);
      ctx.translate(x, y);
      ctx.scale(sc, sc);
      ctx.font = `italic 900 ${size}px "Segoe UI", sans-serif`;
      const w = ctx.measureText(text).width + 22;
      const h = size + 14;
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2 + 6, h / 2 + 2, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tail * w * 0.18, h * 0.32);
      ctx.lineTo(tail * w * 0.36, h * 0.95);
      ctx.lineTo(tail * w * 0.02, h * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(tail * w * 0.2 - 8, h * 0.2, 18, 8);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 1);
      ctx.restore();
    },

    // Carimbo vermelho (k = quanto já bateu; 0 = ainda no ar)
    fedxStampMark(ctx, x, y, text, rot, k, color = '#dc2626', size = 44) {
      if (k <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      const sc = 1 + (1 - ease(k)) * 0.5;
      ctx.scale(sc, sc);
      ctx.globalAlpha *= Math.min(1, k * 3) * 0.92;
      ctx.font = `900 ${size}px "Segoe UI", sans-serif`;
      const w = ctx.measureText(text).width + 34;
      const h = size + 22;
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 2);
      // tinta falhada (pixels do papel aparecendo)
      ctx.fillStyle = '#efe7d6';
      for (let i = 0; i < 26; i++) ctx.fillRect(-w / 2 + rnd(i, 3) * w, -h / 2 + rnd(i, 4) * h, 2 + rnd(i, 5) * 4, 2 + rnd(i, 6) * 3);
      ctx.restore();
    },
    // O carimbo (cabo de madeira) descendo; hit = quadro do impacto
    fedxStamper(ctx, x, y, t, hit, s = 1) {
      const down = t < hit ? ease(seg(t, hit - 30, hit)) : 1 - ease(seg(t, hit + 12, hit + 34));
      if (t > hit + 34) return;
      const lift = (1 - down) * 260 * s;
      ctx.save();
      // sombra no papel
      ctx.fillStyle = `rgba(0,0,0,${0.12 + 0.3 * down})`;
      ctx.beginPath();
      ctx.ellipse(x + 10 * s, y + 8 * s, (70 + 30 * (1 - down)) * s, (30 + 10 * (1 - down)) * s, 0, 0, TAU);
      ctx.fill();
      ctx.translate(x, y - lift);
      ctx.fillStyle = '#2a1a10';
      ctx.fillRect(-64 * s, -26 * s, 128 * s, 26 * s);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(-60 * s, -6 * s, 120 * s, 8 * s);
      ctx.fillStyle = '#5b3a24';
      ctx.fillRect(-14 * s, -120 * s, 28 * s, 96 * s);
      ctx.fillStyle = '#7a5232';
      ctx.fillRect(-14 * s, -120 * s, 9 * s, 96 * s);
      ctx.fillStyle = '#3d2716';
      ctx.beginPath();
      ctx.ellipse(0, -128 * s, 30 * s, 18 * s, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(-20 * s, -138 * s, 14 * s, 6 * s);
      ctx.restore();
    },

    // Folha de papel (documento) com linhas e título, desenhada em pé
    fedxPaper(ctx, x, y, w, h, rot, title, lines, o = {}) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(-w / 2 + 10, -h / 2 + 12, w, h);
      ctx.fillStyle = o.paper || '#efe7d6';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = 'rgba(120,100,70,0.12)';
      ctx.fillRect(-w / 2, -h / 2, w, 6);
      ctx.fillStyle = '#0b1d4d';
      ctx.fillRect(-w / 2 + 18, -h / 2 + 18, 46, 46);
      ctx.fillStyle = '#facc15';
      ctx.font = '900 15px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JFU', -w / 2 + 41, -h / 2 + 42);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e293b';
      ctx.font = '900 13px "Segoe UI", sans-serif';
      ctx.fillText('FEDERAÇÃO JAPONESA DE FUTEBOL', -w / 2 + 76, -h / 2 + 32);
      ctx.font = `900 ${o.titleSize || 26}px "Segoe UI", sans-serif`;
      ctx.fillStyle = '#0b1120';
      ctx.fillText(title, -w / 2 + 76, -h / 2 + 58, w - 96);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-w / 2 + 18, -h / 2 + 80, w - 36, 2);
      ctx.font = '700 14px "Segoe UI", sans-serif';
      lines.forEach((l, i) => {
        ctx.fillStyle = '#334155';
        if (l) ctx.fillText(l, -w / 2 + 20, -h / 2 + 106 + i * 24, w - 40);
        else ctx.fillRect(-w / 2 + 20, -h / 2 + 100 + i * 24, (w - 40) * (0.55 + rnd(i, 9) * 0.4), 5);
      });
      if (o.extra) o.extra(ctx, w, h);
      ctx.restore();
    },

    // ------------------------------------------------------------- a sala da JFU
    // Parede do fundo com a janela enorme (Tóquio à noite, ou o pôr do sol na versão quente)
    fedxBoardDraw(g, w, h, warm) {
      const P = warm
        ? { wall0: '#1d140e', wall1: '#2b1d13', ceil: '#0d0906', light: '#fff1d6', lightBody: '#3b2a1e', glow: 'rgba(253,230,138,0.4)', sky0: '#1c0d0a', sky1: '#9a3412', far: '#2a140c', near: '#170b06', win1: 'rgba(253,186,116,0.55)', win2: 'rgba(254,215,170,0.6)', blind: 'rgba(59,39,24,0.88)', panel: '#160f0a' }
        : { wall0: '#0b111c', wall1: '#141c2a', ceil: '#05080d', light: '#eef6ff', lightBody: '#1f2937', glow: 'rgba(219,234,254,0.4)', sky0: '#02050c', sky1: '#132544', far: '#0a1324', near: '#050a14', win1: 'rgba(253,224,71,0.5)', win2: 'rgba(191,219,254,0.55)', blind: 'rgba(30,41,59,0.9)', panel: '#090e18' };
      this.cineGradient(g, 0, 0, w, h, [[0, P.wall0], [1, P.wall1]]);
      // teto com as calhas de luz fria
      g.fillStyle = P.ceil;
      g.fillRect(0, 0, w, 100);
      for (let i = 0; i < 6; i++) {
        const x = 130 + i * 204;
        g.fillStyle = P.lightBody;
        g.fillRect(x - 82, 86, 164, 12);
        g.fillStyle = P.light;
        g.fillRect(x - 76, 96, 152, 4);
        this.cineGlow(g, x, 104, 130, P.glow);
      }
      // a janela
      const X0 = 150;
      const X1 = 1130;
      const Y0 = 128;
      const Y1 = 452;
      g.fillStyle = '#03050a';
      g.fillRect(X0 - 16, Y0 - 16, X1 - X0 + 32, Y1 - Y0 + 32);
      g.save();
      g.beginPath();
      g.rect(X0, Y0, X1 - X0, Y1 - Y0);
      g.clip();
      this.cineGradient(g, X0, Y0, X1 - X0, Y1 - Y0, [[0, P.sky0], [1, P.sky1]]);
      if (!warm) {
        for (let i = 0; i < 70; i++) {
          g.fillStyle = `rgba(255,255,255,${0.2 + rnd(i, 3) * 0.5})`;
          g.fillRect(X0 + rnd(i, 1) * (X1 - X0), Y0 + rnd(i, 2) * 160, rnd(i, 4) < 0.85 ? 1.5 : 2.5, 1.5);
        }
      } else {
        this.cineGlow(g, 900, Y1 - 40, 260, 'rgba(251,146,60,0.55)');
      }
      // a torre lá longe
      g.save();
      g.translate(780, Y1 - 6);
      g.strokeStyle = warm ? '#3b1d10' : '#7c2d12';
      g.lineWidth = 3;
      line(g, [-34, 0], [-4, -210]);
      line(g, [34, 0], [4, -210]);
      for (let k = 0; k < 7; k++) {
        const y = -24 - k * 26;
        const hw = 34 - (k + 1) * 4.2;
        line(g, [-hw, y], [hw, y]);
        line(g, [-hw, y], [hw - 4, y - 26]);
      }
      g.fillStyle = warm ? '#4a2412' : '#9a3412';
      g.fillRect(-16, -128, 32, 10);
      g.fillRect(-9, -188, 18, 7);
      line(g, [0, -210], [0, -250]);
      g.restore();
      this.cineGlow(g, 780, Y1 - 256, 22, 'rgba(239,68,68,0.9)');
      g.translate(X0, 0);
      this.cineCity(g, X1 - X0, Y1 + 4, 230, P.far, P.win1, 7);
      this.cineCity(g, X1 - X0, Y1 + 8, 140, P.near, P.win2, 3, 150);
      g.setTransform(1, 0, 0, 1, 0, 0);
      // reflexo no vidro
      g.fillStyle = 'rgba(255,255,255,0.035)';
      poly(g, [[300, Y0], [420, Y0], [250, Y1], [130, Y1]]);
      g.fill();
      poly(g, [[880, Y0], [930, Y0], [780, Y1], [730, Y1]]);
      g.fill();
      g.restore();
      // caixilhos
      for (let i = 0; i <= 6; i++) {
        const x = X0 + (i * (X1 - X0)) / 6;
        g.fillStyle = '#05080e';
        g.fillRect(x - 6, Y0, 12, Y1 - Y0);
        g.fillStyle = 'rgba(148,163,184,0.22)';
        g.fillRect(x - 6, Y0, 2, Y1 - Y0);
      }
      g.fillStyle = '#05080e';
      g.fillRect(X0, 286, X1 - X0, 9);
      // persianas meio baixadas nas pontas
      g.fillStyle = P.blind;
      for (let y = Y0; y < 330; y += 9) {
        g.fillRect(X0, y, 150, 6);
        g.fillRect(X1 - 150, y, 150, 6);
      }
      // parede de baixo (lambri) e rodameio
      g.fillStyle = P.panel;
      g.fillRect(0, Y1 + 16, w, h - Y1 - 16);
      g.fillStyle = 'rgba(148,163,184,0.18)';
      g.fillRect(0, Y1 + 16, w, 2);
      // bandeiras dos lados: Japão e JFU
      [[70, 0], [1210, 1]].forEach(([x, kind]) => {
        g.fillStyle = '#a16207';
        g.fillRect(x - 3, 118, 6, 380);
        g.fillStyle = '#facc15';
        g.beginPath();
        g.arc(x, 114, 7, 0, TAU);
        g.fill();
        const fx = kind ? x - 64 : x + 3;
        g.fillStyle = kind ? '#0b1d4d' : '#e5e7eb';
        g.fillRect(fx, 130, 61, 150);
        if (kind) {
          g.strokeStyle = '#facc15';
          g.lineWidth = 3;
          g.beginPath();
          g.arc(fx + 30, 190, 18, 0, TAU);
          g.stroke();
          g.font = '900 11px "Segoe UI", sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillStyle = '#facc15';
          g.fillText('JFU', fx + 30, 191);
        } else {
          g.fillStyle = '#b91c1c';
          g.beginPath();
          g.arc(fx + 30, 190, 17, 0, TAU);
          g.fill();
        }
        g.fillStyle = 'rgba(0,0,0,0.22)';
        [12, 30, 48].forEach((dx) => g.fillRect(fx + dx, 130, 5, 150));
      });
      if (warm) {
        // a flâmula da Sub-20 na parede
        g.fillStyle = '#0b1d4d';
        poly(g, [[1150, 300], [1250, 300], [1200, 420]]);
        g.fill();
        g.font = '900 13px "Segoe UI", sans-serif';
        g.textAlign = 'center';
        g.fillStyle = '#f8fafc';
        g.fillText('SUB-20', 1200, 330);
      }
    },
    fedxBoardBg(g, w, h) {
      this.fedxBoardDraw(g, w, h, false);
    },
    fedxBoardBgWarm(g, w, h) {
      this.fedxBoardDraw(g, w, h, true);
    },

    // A mesa comprida na frente dos cartolas (camada transparente guardada)
    fedxTableLayer(g, w, h) {
      this.cineGradient(g, -10, TABLE_Y, w + 20, 26, [[0, '#3a4558'], [1, '#141b27']]);
      g.fillStyle = 'rgba(226,232,240,0.45)';
      g.fillRect(0, TABLE_Y, w, 2);
      this.cineGradient(g, 0, TABLE_Y + 26, w, h - TABLE_Y - 26, [[0, '#0d1524'], [1, '#03060c']]);
      g.fillStyle = 'rgba(148,163,184,0.07)';
      for (let x = 80; x < w; x += 160) g.fillRect(x, TABLE_Y + 30, 3, h);
      g.fillStyle = 'rgba(226,232,240,0.18)';
      g.fillRect(0, TABLE_Y + 26, w, 2);
      // brasão na frente da mesa
      const cx = 640;
      const cy = 598;
      g.fillStyle = '#0b1d4d';
      poly(g, [[cx - 34, cy - 38], [cx + 34, cy - 38], [cx + 34, cy + 6], [cx, cy + 38], [cx - 34, cy + 6]]);
      g.fill();
      g.strokeStyle = '#ca8a04';
      g.lineWidth = 3;
      g.stroke();
      g.font = '900 20px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#facc15';
      g.fillText('JFU', cx, cy - 6);
      g.fillStyle = '#ef4444';
      g.beginPath();
      g.arc(cx, cy + 16, 6, 0, TAU);
      g.fill();
      g.font = '900 11px "Segoe UI", sans-serif';
      g.fillStyle = 'rgba(250,204,21,0.65)';
      g.fillText('J A P A N   F O O T B A L L   U N I O N', cx, cy + 56);
      // em cada lugar: plaquinha, microfone, copo e papéis
      SEATS.forEach(([who, x]) => {
        g.fillStyle = 'rgba(226,232,240,0.85)';
        poly(g, [[x + 4, TABLE_Y + 4], [x + 58, TABLE_Y + 2], [x + 64, TABLE_Y + 18], [x - 2, TABLE_Y + 20]]);
        g.fill();
        g.fillStyle = '#efe7d6';
        poly(g, [[x - 60, TABLE_Y - 8], [x - 22, TABLE_Y - 12], [x - 8, TABLE_Y + 14], [x - 54, TABLE_Y + 18]]);
        g.fill();
        g.fillStyle = 'rgba(51,65,85,0.6)';
        g.fillRect(x - 50, TABLE_Y - 2, 26, 2);
        g.fillRect(x - 48, TABLE_Y + 4, 22, 2);
        g.fillStyle = '#e2e8f0';
        poly(g, [[x - 44, TABLE_Y - 12], [x + 44, TABLE_Y - 12], [x + 48, TABLE_Y + 6], [x - 48, TABLE_Y + 6]]);
        g.fill();
        g.fillStyle = '#0b1d4d';
        g.fillRect(x - 44, TABLE_Y + 3, 88, 3);
        g.font = '900 10px "Segoe UI", sans-serif';
        g.fillStyle = '#0b1d4d';
        g.fillText(PLATES[who], x, TABLE_Y - 3);
        g.strokeStyle = '#05070c';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(x + 62, TABLE_Y + 4);
        g.quadraticCurveTo(x + 70, TABLE_Y - 30, x + 52, TABLE_Y - 46);
        g.stroke();
        g.fillStyle = '#05070c';
        g.fillRect(x + 42, TABLE_Y - 56, 14, 12);
        g.fillStyle = 'rgba(147,197,253,0.28)';
        g.fillRect(x - 86, TABLE_Y - 28, 14, 30);
        g.fillStyle = 'rgba(255,255,255,0.4)';
        g.fillRect(x - 84, TABLE_Y - 24, 3, 22);
      });
    },

    // Os cartolas sentados atrás da mesa (rosto frio, luz da janela recortando)
    fedxBoard(ctx, c, o = {}) {
      SEATS.forEach(([who, x, size]) => {
        const u = size / 36;
        const top = TABLE_Y - 20.6 * u;
        const feet = top + size * 0.87;
        const dim = o.dim ?? 0.16;
        this.fedxRim(ctx, c[who], x, feet, size, { dim, dimTint: o.tint || '8,14,30' }, o.rim || '#93c5fd', [-1, 1], 2);
        if (o.laugh) {
          const k = o.laugh(who);
          if (k > 0) {
            this.fedxLaughEyes(ctx, x, top, u, this.finShade(c[who].skinColor, -0.1), '#0a0f1c', c[who].glasses ? 1.25 : 1.8);
            this.fedxLaughMouth(ctx, x, top, u, k, c[who].fedxOld.mustache);
          }
        }
      });
    },

    // Encosto de poltrona de couro visto de trás (capitonê, tachas douradas, recorte de luz)
    fedxChair(ctx, x, y, hw, y1, light = 1) {
      const r = hw * 0.35;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - hw, y1);
      ctx.lineTo(x - hw, y + r);
      ctx.quadraticCurveTo(x - hw, y, x - hw + r, y);
      ctx.lineTo(x + hw - r, y);
      ctx.quadraticCurveTo(x + hw, y, x + hw, y + r);
      ctx.lineTo(x + hw, y1);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, y, 0, y1);
      g.addColorStop(0, '#2a1a12');
      g.addColorStop(1, '#0c0705');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = `rgba(186,230,253,${0.2 + 0.6 * light})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.clip();
      // capitonê: losangos e botões
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 2;
      const s = hw * 0.42;
      for (let yy = y + s * 0.6; yy < y1; yy += s) {
        for (let xx = x - hw + s * 0.5; xx < x + hw; xx += s) {
          ctx.beginPath();
          ctx.moveTo(xx, yy - s * 0.5);
          ctx.lineTo(xx + s * 0.5, yy);
          ctx.lineTo(xx, yy + s * 0.5);
          ctx.lineTo(xx - s * 0.5, yy);
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = 'rgba(120,80,50,0.5)';
          ctx.fillRect(xx - 2, yy - 2, 4, 4);
        }
      }
      ctx.fillStyle = 'rgba(250,204,21,0.55)';
      for (let xx = x - hw + 10; xx < x + hw - 6; xx += 14) ctx.fillRect(xx, y + 8, 3, 3);
      ctx.restore();
    },

    // Reverso: a parede do outro lado, com a porta dupla
    fedxDoorBg(g, w, h) {
      this.cineGradient(g, 0, 0, w, h, [[0, '#070b12'], [1, '#0e1520']]);
      g.fillStyle = '#04060a';
      g.fillRect(0, 0, w, 120);
      for (let i = 0; i < 6; i++) {
        const x = 130 + i * 204;
        g.fillStyle = '#1f2937';
        g.fillRect(x - 70, 108, 140, 10);
        g.fillStyle = '#eef6ff';
        g.fillRect(x - 64, 116, 128, 3);
        this.cineGlow(g, x, 122, 100, 'rgba(219,234,254,0.32)');
      }
      // lambris de madeira escura
      for (let x = 20; x < w; x += 150) {
        g.fillStyle = 'rgba(30,41,59,0.45)';
        g.fillRect(x, 150, 120, 340);
        g.strokeStyle = 'rgba(2,4,8,0.8)';
        g.lineWidth = 3;
        g.strokeRect(x, 150, 120, 340);
      }
      // retratos dos presidentes antigos
      [170, 320, 960, 1110].forEach((x, i) => {
        g.fillStyle = '#a16207';
        g.fillRect(x - 46, 176, 92, 118);
        g.fillStyle = '#1a1410';
        g.fillRect(x - 40, 182, 80, 106);
        g.fillStyle = '#0b0f1a';
        g.beginPath();
        g.ellipse(x, 288, 34, 30, 0, Math.PI, TAU);
        g.fill();
        g.fillStyle = i % 2 ? '#c9a27e' : '#b98d6a';
        g.beginPath();
        g.arc(x, 232, 17, 0, TAU);
        g.fill();
        g.fillStyle = i % 2 ? '#d1d5db' : '#4b5563';
        g.fillRect(x - 17, 214, 34, 8);
        g.fillStyle = '#e2e8f0';
        g.fillRect(x - 5, 258, 10, 18);
      });
      // a porta dupla (moldura); as folhas são desenhadas por cima no plano
      g.fillStyle = '#020305';
      g.fillRect(536, 236, 208, 290);
      g.fillStyle = '#a16207';
      g.fillRect(530, 230, 220, 8);
      g.fillStyle = '#3b2a1e';
      g.fillRect(532, 238, 6, 288);
      g.fillRect(742, 238, 6, 288);
      g.fillStyle = '#f8fafc';
      g.font = '900 12px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('SALA DO CONSELHO', 640, 214);
      // carpete em perspectiva
      this.cineGradient(g, 0, 524, w, h - 524, [[0, '#0a1222'], [1, '#05080f']]);
      g.strokeStyle = 'rgba(30,41,59,0.6)';
      g.lineWidth = 1.5;
      for (let i = -12; i <= 12; i++) line(g, [640 + i * 60, 524], [640 + i * 260, h]);
      [540, 566, 606, 664].forEach((y) => line(g, [0, y], [w, y]));
      g.fillStyle = '#020305';
      g.fillRect(0, 520, w, 6);
      // a ponta da mesa, entre os cartolas e a porta
      this.cineGradient(g, 150, 560, 980, 22, [[0, '#2b3445'], [1, '#121926']]);
      g.fillStyle = '#05080e';
      g.fillRect(150, 582, 980, 140);
      g.fillStyle = 'rgba(226,232,240,0.35)';
      g.fillRect(150, 560, 980, 2);
      [260, 450, 830, 1020].forEach((x) => {
        g.fillStyle = '#0b1120';
        poly(g, [[x - 40, 552], [x + 40, 552], [x + 44, 566], [x - 44, 566]]);
        g.fill();
      });
    },

    // As folhas da porta (open 0..1), giram para dentro da sala, na direção da câmera
    fedxDoorLeaves(ctx, open) {
      const L = 540;
      const R = 740;
      const M = 640;
      const T = 238;
      const B = 524;
      const cy = (T + B) / 2;
      [[L, -1], [R, 1]].forEach(([hx, side]) => {
        const a = open * 1.3;
        const z = 100 * Math.sin(a);
        const s = 1 + z / 240;
        const fxw = hx - side * 100 * Math.cos(a);
        const fx = M + (fxw - M) * s + side * z * 0.9;
        const ft = cy + (T - cy) * s;
        const fb = cy + (B - cy) * s;
        const pts = [[hx, T], [fx, ft], [fx, fb], [hx, B]];
        ctx.fillStyle = '#2a1d14';
        poly(ctx, pts);
        ctx.fill();
        ctx.strokeStyle = '#120c08';
        ctx.lineWidth = 3;
        ctx.stroke();
        // almofadas da porta e a maçaneta dourada
        const P = (u, v) => [lerp(hx, fx, u), lerp(lerp(T, ft, u), lerp(B, fb, u), v)];
        ctx.fillStyle = '#3b2a1e';
        [[0.18, 0.08, 0.82, 0.44], [0.18, 0.54, 0.82, 0.92]].forEach(([u0, v0, u1, v1]) => {
          poly(ctx, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)]);
          ctx.fill();
        });
        const hd = P(0.9, 0.5);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(hd[0] - 3, hd[1] - 10, 6, 20);
      });
    },

    // ------------------------------------------------------------- corredor de vidro
    fedxHallBg(g, w, h) {
      const [vx, vy] = HVP;
      const P = (x, y, z) => [vx + (x - vx) / z, vy + (y - vy) / z];
      const ZF = 4.2;
      const q = (pts, f) => {
        g.fillStyle = f;
        poly(g, pts);
        g.fill();
      };
      g.fillStyle = '#04070d';
      g.fillRect(0, 0, w, h);
      // parede de vidro (esquerda): a cidade lá fora
      g.save();
      poly(g, [P(0, 0, 1), P(0, 0, ZF), P(0, 720, ZF), P(0, 720, 1)]);
      g.clip();
      this.cineGradient(g, 0, 0, 700, 720, [[0, '#02050c'], [0.6, '#0c1a36'], [1, '#08101f']]);
      for (let i = 0; i < 60; i++) {
        g.fillStyle = `rgba(255,255,255,${0.25 + rnd(i, 7) * 0.5})`;
        g.fillRect(rnd(i, 8) * 600, rnd(i, 9) * 260, 1.5, 1.5);
      }
      this.cineCity(g, 700, 520, 260, '#0a1324', 'rgba(253,224,71,0.5)', 11);
      this.cineCity(g, 700, 560, 160, '#050a14', 'rgba(191,219,254,0.55)', 5, 90);
      g.fillStyle = 'rgba(147,197,253,0.05)';
      g.fillRect(0, 0, 700, 720);
      g.restore();
      // montantes do vidro
      g.strokeStyle = '#05080e';
      [1.0, 1.35, 1.8, 2.4, 3.2].forEach((z) => {
        g.lineWidth = 14 / z;
        line(g, P(0, 0, z), P(0, 720, z));
      });
      g.lineWidth = 3;
      line(g, P(0, 560, 1), P(0, 560, ZF));
      // parede da direita com quadros da seleção
      q([P(1280, 0, 1), P(1280, 0, ZF), P(1280, 720, ZF), P(1280, 720, 1)], '#0c1320');
      [[1.25, 1.6], [2.0, 2.35], [2.8, 3.1]].forEach(([z0, z1], i) => {
        q([P(1280, 200, z0), P(1280, 200, z1), P(1280, 460, z1), P(1280, 460, z0)], '#a16207');
        q([P(1280, 212, z0 + 0.02), P(1280, 212, z1 - 0.02), P(1280, 448, z1 - 0.02), P(1280, 448, z0 + 0.02)], i === 1 ? '#7f1d1d' : '#1d4ed8');
        const c0 = P(1280, 330, (z0 + z1) / 2);
        g.fillStyle = 'rgba(248,250,252,0.7)';
        g.beginPath();
        g.arc(c0[0], c0[1], 28 / ((z0 + z1) / 2), 0, TAU);
        g.fill();
      });
      // teto e piso
      q([P(0, 0, 1), P(1280, 0, 1), P(1280, 0, ZF), P(0, 0, ZF)], '#070b13');
      const fg = g.createLinearGradient(0, vy, 0, h);
      fg.addColorStop(0, '#0a101c');
      fg.addColorStop(1, '#141c2a');
      g.fillStyle = fg;
      poly(g, [P(0, 720, 1), P(1280, 720, 1), P(1280, 720, ZF), P(0, 720, ZF)]);
      g.fill();
      q([P(0, 0, ZF), P(1280, 0, ZF), P(1280, 720, ZF), P(0, 720, ZF)], '#03050a');
      // luzes do teto e o reflexo no piso encerado
      [1.1, 1.5, 2.0, 2.6, 3.4].forEach((z) => {
        q([P(560, 0, z), P(720, 0, z), P(720, 0, z + 0.12), P(560, 0, z + 0.12)], '#e6f0ff');
        const c = P(640, 0, z);
        this.cineGlow(g, c[0], c[1] + 14 / z, 160 / z, 'rgba(219,234,254,0.28)');
        const f = P(640, 720, z + 0.2);
        g.save();
        g.translate(f[0], f[1]);
        g.scale(0.35, 1);
        this.cineGlow(g, 0, 0, 170 / z, 'rgba(219,234,254,0.16)');
        g.restore();
      });
      // reflexo da cidade no piso, perto do vidro
      g.fillStyle = 'rgba(253,224,71,0.05)';
      poly(g, [P(0, 720, 1), P(300, 720, 1), P(300, 720, ZF), P(0, 720, ZF)]);
      g.fill();
    },

    // Tela de tablet com a chamada do Aiku
    fedxTablet(ctx, x, y, w, h, t, k = 1) {
      const c = this.fedxCast();
      ctx.save();
      ctx.fillStyle = '#05070c';
      ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
      ctx.strokeStyle = 'rgba(148,163,184,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 10, y - 10, w + 20, h + 20);
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      this.cineGradient(ctx, x, y, w, h, [[0, '#0b1d4d'], [1, '#04102a']]);
      this.cineGlow(ctx, x + w * 0.4, y + h * 0.4, w * 0.5, 'rgba(56,189,248,0.3)');
      const r = this.finHead(ctx, c.aiku, x + w * 0.4, y + h * 0.5, h * 1.9, { rim: '#93c5fd' });
      this.wcdEyes(ctx, x + w * 0.4, y + h * 0.5, r.u, { ring: c.aiku.eyeColor, iris: this.finShade(c.aiku.eyeColor, -0.55), shine: 0.9 });
      // boca sorrindo de lado
      this.fedxU(ctx, x + w * 0.4, r.top, r.u, 16.6, 12.0, 3.0, 0.5, '#0a0f1c');
      this.fedxU(ctx, x + w * 0.4, r.top, r.u, 19.4, 11.6, 0.6, 0.5, '#0a0f1c');
      ctx.fillStyle = 'rgba(2,6,23,0.85)';
      ctx.fillRect(x, y + h - 52, w, 52);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x + 18, y + h - 34, 5, 0, TAU);
      ctx.fill();
      ctx.font = '900 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText('OLIVER AIKU • CAPITÃO DA SUB-20', x + 30, y + h - 34, w - 40);
      ctx.font = '700 12px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(226,232,240,0.7)';
      const mm = Math.floor(t / 60);
      ctx.fillText(`CHAMADA • 00:${String(12 + mm).padStart(2, '0')}`, x + 30, y + h - 14);
      this.finFillPat(ctx, 'scan', x, y, w, h, 0.5);
      ctx.restore();
      // selo: desafio aceito
      if (k > 0) {
        ctx.save();
        ctx.translate(x + w - 92, y + 46);
        ctx.rotate(-0.12);
        const sc = 1 + (1 - ease(k)) * 0.6;
        ctx.scale(sc, sc);
        ctx.globalAlpha *= Math.min(1, k * 3);
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(-88, -22, 176, 44);
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.strokeRect(-88, -22, 176, 44);
        ctx.font = 'italic 900 19px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f0fdf4';
        ctx.fillText('✔ DESAFIO ACEITO', 0, 1);
        ctx.restore();
      }
    }
  });

  // ==========================================================================
  // 1. A FEDERAÇÃO (ego_federation)
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — a sala do conselho: os velhos atrás da mesa, a cidade lá fora
    fedxFed0(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.fedxCast();
      const k = easeIO(t / 225);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(336, 366, k), zoom: lerp(1.0, 1.13, k), shake: 0.35 });
      ctx.drawImage(this.finBg('fedx_board', 1280, 720, this.fedxBoardBg), 0, 0);
      for (let i = 0; i < 6; i++) this.cineShafts(ctx, 130 + i * 204, 102, Math.PI / 2, 420, 0.42, 3, '219,234,254', 0.045, t + i * 30);
      this.cineGlow(ctx, 640, 300, 420, 'rgba(147,197,253,0.10)');
      this.fedxBoard(ctx, c);
      ctx.drawImage(this.finBg('fedx_table', 1280, 720, this.fedxTableLayer), 0, 0);
      // luzinhas vermelhas dos microfones
      SEATS.forEach(([, x], i) => {
        const on = 0.6 + 0.4 * Math.sin(t * 0.08 + i);
        this.cineGlow(ctx, x + 49, TABLE_Y - 50, 12, 'rgba(239,68,68,0.9)', on);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x + 46, TABLE_Y - 52, 6, 3);
      });
      this.cineDust(ctx, W, H, t, 26, 'rgba(226,232,240,0.35)', 4);
      ctx.restore();
      // pasta em primeiro plano, fora de foco (borda de baixo)
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1, 1.2, k), shake: 0.5 });
      ctx.fillStyle = '#030509';
      poly(ctx, [[-60, 700], [420, 640], [470, 760], [-60, 760]]);
      ctx.fill();
      ctx.fillStyle = 'rgba(147,197,253,0.18)';
      ctx.fillRect(-60, 690, 470, 2);
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'SEDE DA JFU • TÓQUIO • 21:40', seg(t, 6, 46));
      this.finKicker(ctx, 40, top + 58, 'FIM DA SEGUNDA SELEÇÃO', seg(t, 34, 80), '#38bdf8');
    },

    // PLANO 2 — o presidente gargalha: "projeto de crianças" → o carimbo ENCERRADO
    fedxFed1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const k = easeIO(t / 280);
      const laughing = t < 168;
      const bob = laughing ? -Math.abs(Math.sin(t * 0.42)) * 7 : 0;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.75;
      ctx.drawImage(this.finBg('fedx_board', 1280, 720, this.fedxBoardBg), 330, 110, 620, 360, -60, -30, W + 120, H + 60);
      ctx.restore();
      ctx.fillStyle = 'rgba(3,6,14,0.32)';
      ctx.fillRect(0, 0, W, H);
      // contraluz da janela atrás dos ombros (o terno escuro não some no fundo)
      this.cineGlow(ctx, 450, 520, 520, 'rgba(147,197,253,0.3)');
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1, 1.06, k), shake: laughing ? 1.6 : 0.5 });
      this.cineBokeh(ctx, W, top + 20, bot - 200, t, 10, ['rgba(253,224,71,0.25)', 'rgba(147,197,253,0.28)'], 6);
      this.cineGlow(ctx, 420, 220, 340, 'rgba(219,234,254,0.16)');
      const r = this.fedxBust(ctx, c.pres, 450, 356 + bob, 780, { dim: 0.1, dimTint: '8,14,30', rimColor: '#bfdbfe', rimPx: 5 }, true);
      if (laughing) {
        this.fedxLaughEyes(ctx, 450, r.top, r.u, this.finShade(c.pres.skinColor, -0.04));
        this.fedxLaughMouth(ctx, 450, r.top, r.u, 0.55 + 0.45 * Math.abs(Math.sin(t * 0.42)), c.pres.fedxOld.mustache);
      }
      ctx.restore();
      ['HA', 'HA', 'HAHA!'].forEach((s, i) => this.cineImpactText(ctx, s, [130, 760, 690][i], [top + 110, top + 76, top + 200][i], [58, 64, 74][i], '#fef3c7', seg(t, 20 + i * 18, 28 + i * 18) * (1 - seg(t, 160, 176)), 0, [-0.18, 0.12, -0.08][i]));
      // painel: os outros cartolas rindo junto
      const kA = ease(seg(t, 104, 120));
      if (kA > 0) {
        this.finPanel(ctx, [[832, top + 14], [W - 16, top + 14], [W - 16, 318], [850, 330]], () => {
          this.cineGradient(ctx, 820, top, 470, 260, [[0, '#101a2c'], [1, '#060a14']]);
          this.drawRadialSpeedLines(ctx, 1050, 230, 520, '#cbd5e1', 0.1);
          [[c.old2, 960, 236], [c.old3, 1150, 248]].forEach(([ch, x, ey]) => {
            const rr = this.fedxHead(ctx, ch, x, ey, 400, { dim: 0.12, dimTint: '8,14,30', rimColor: '#93c5fd', rimPx: 3 });
            this.fedxLaughEyes(ctx, x, rr.top, rr.u, this.finShade(ch.skinColor, -0.05));
            this.fedxLaughMouth(ctx, x, rr.top, rr.u, 0.5 + 0.5 * Math.abs(Math.sin(t * 0.5 + x)), ch.fedxOld.mustache);
          });
          this.rincStamp(ctx, 'HAHAHA!', 1060, top + 52, 34, '#fef3c7', t, 112, 2);
        }, { dx: (1 - kA) * 480 });
      }
      // painel: o carimbo no projeto
      const hit = 200;
      const kB = ease(seg(t, 150, 166));
      if (kB > 0) {
        this.finPanel(ctx, [[850, 342], [W - 16, 334], [W - 16, bot - 14], [832, bot - 14]], () => {
          const sh = t >= hit ? this.cineNoise(S.f * 2.1, 3) * 6 * (1 - seg(t, hit, hit + 18)) : 0;
          ctx.save();
          ctx.translate(sh, sh * 0.5);
          this.cineGradient(ctx, 820, 330, 470, 320, [[0, '#2a1d14'], [1, '#160f0a']]);
          this.fedxPaper(ctx, 1050, 486, 330, 230, -0.05, 'PROJETO BLUE LOCK', [null, null, null, null], {
            extra: (g, w, h) => {
              // as fotos dos jogadores grampeadas no relatório
              [c.you, c.bachira, c.chigiri, c.rin].forEach((ch, i) => {
                const px = -w / 2 + 22 + i * 74;
                const py = h / 2 - 82;
                g.fillStyle = '#cbd5e1';
                g.fillRect(px - 3, py - 3, 66, 66);
                g.fillStyle = '#1e293b';
                g.fillRect(px, py, 60, 60);
                this.finCrop(g, ch, {}, 10, 2, 16, 16, px, py, 60, 60);
              });
            }
          });
          this.fedxStampMark(ctx, 1060, 470, 'ENCERRADO', -0.16, seg(t, hit, hit + 6), '#dc2626', 46);
          this.fedxStamper(ctx, 1060, 470, t, hit, 0.9);
          ctx.restore();
          if (t >= hit) this.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, hit, hit + 10)), '#fee2e2');
        }, { dy: (1 - kB) * 330 });
      }
      this.cineSfx(S, 20, 'riso', () => window.SFX?.blip?.(220));
      this.cineSfx(S, hit, 'carimbo', () => window.SFX?.tackle?.());
    },

    // PLANO 3 — o reverso: a porta dupla se abre; o Ego entra sem convite
    fedxFed2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const bang = 50;
      const open = ease(seg(t, bang, bang + 16));
      const k = easeIO(t / 300);
      const shake = 0.5 + (t >= bang ? 6 * (1 - seg(t, bang, bang + 24)) : 0);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(372, 384, k), zoom: lerp(1.04, 1.16, k), shake });
      ctx.drawImage(this.finBg('fedx_door', 1280, 720, this.fedxDoorBg), 0, 0);
      ctx.fillStyle = `rgba(2,4,9,${0.25 * (1 - open)})`;
      ctx.fillRect(-100, -100, W + 200, H + 200);
      // o corredor aceso lá fora
      if (open > 0) {
        ctx.save();
        ctx.globalAlpha = open;
        this.cineGradient(ctx, 540, 238, 200, 286, [[0, '#cfe3ff'], [1, '#f2f8ff']]);
        ctx.restore();
        this.cineGlow(ctx, 640, 380, 300, 'rgba(224,242,254,0.55)', open);
        this.cineShafts(ctx, 640, 380, Math.PI / 2, 520, 1.5, 7, '224,242,254', 0.09 * open, t);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const lg = ctx.createLinearGradient(0, 524, 0, 760);
        lg.addColorStop(0, `rgba(224,242,254,${0.3 * open})`);
        lg.addColorStop(1, 'rgba(224,242,254,0)');
        ctx.fillStyle = lg;
        poly(ctx, [[548, 524], [732, 524], [1000, 760], [280, 760]]);
        ctx.fill();
        ctx.restore();
      }
      // o Ego: contra a luz na porta, depois entrando
      if (open > 0.4) {
        const wk = easeIO(seg(t, 110, 300));
        const feet = lerp(524, 540, wk);
        const size = lerp(250, 272, wk);
        const o = { tint: '#04060b' };
        // sombra comprida na direção da câmera
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#020306';
        poly(ctx, [[640 - size * 0.12, feet], [640 + size * 0.12, feet], [640 + size * 0.5, feet + 200], [640 - size * 0.5, feet + 200]]);
        ctx.fill();
        ctx.restore();
        this.finRim(ctx, c.ego, 640, feet, size, o, '#e0f2fe', [-1, 1], 3);
        // o brilho dos óculos no escuro
        const gk = seg(t, 150, 160) * (1 - seg(t, 230, 250));
        if (gk > 0) {
          const u = size / 36;
          const tp = feet - size * 0.87;
          [-1, 1].forEach((s) => {
            const gx = 640 + s * 3.5 * u;
            this.cineGlow(ctx, gx, tp + SPRITE_MAPY(10.2) * u, u * 3, 'rgba(204,251,241,0.8)', gk);
            ctx.fillStyle = `rgba(240,253,250,${gk})`;
            ctx.fillRect(Math.round(gx - 1.4 * u), Math.round(tp + SPRITE_MAPY(9.6) * u), Math.ceil(2.8 * u), Math.ceil(1.2 * u));
          });
        }
      }
      this.fedxDoorLeaves(ctx, open);
      ctx.restore();
      // os cartolas de costas em primeiro plano, recortados pela luz da porta
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.04, shake: shake * 1.3 });
      const rim = open > 0.1 ? '#bae6fd' : '#334155';
      // de costas, afundados nas poltronas de couro: só o alto da cabeça aparece
      [[c.old2, 170, bot + 110, 400], [c.pres, 1110, bot + 120, 440]].forEach(([ch, x, feet, size]) => {
        const u = size / 36;
        const tp = feet - size * 0.87;
        this.fedxRim(ctx, ch, x, feet, size, { facing: 'back', dim: 0.62, dimTint: '3,5,10' }, rim, [-1, 1], 3);
        this.fedxChair(ctx, x, tp + SPRITE_MAPY(9.2) * u, 10 * u, bot + 40, open);
      });
      ctx.restore();
      [[260, 380], [1200, 360]].forEach(([x, y], i) => this.cineImpactText(ctx, '!?', x, y, 64, '#facc15', seg(t, bang + 6 + i * 5, bang + 14 + i * 5), 0, i ? 0.12 : -0.1));
      if (t >= bang) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, bang, bang + 12)), '#e0f2fe');
      this.finKicker(ctx, W / 2, bot - 58, 'JINPACHI EGO', seg(t, 176, 210), EGO_C, 'center');
      this.finKicker(ctx, W / 2, bot - 30, 'NINGUÉM CHAMOU', seg(t, 196, 236), '#94a3b8', 'center');
      this.cineSfx(S, bang, 'porta', () => window.SFX?.tackle?.());
      this.cineSfx(S, bang + 4, 'porta2', () => window.SFX?.whoosh?.());
    },

    // PLANO 4 — a aposta: o close do Ego → a tela racha em duas (perdeu / ganhou)
    fedxFed3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const cut = 168;
      if (t < cut) {
        const k = easeIO(t / cut);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.globalAlpha = 0.42;
        ctx.drawImage(this.finBg('fedx_board', 1280, 720, this.fedxBoardBg), 600, 110, 540, 330, -60, -30, W + 120, H + 60);
        ctx.restore();
        ctx.fillStyle = 'rgba(2,8,14,0.55)';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 660, y: 360, zoom: lerp(1, 1.08, k), shake: 0.4 });
        this.cineGlow(ctx, 800, 160, 380, 'rgba(204,251,241,0.2)');
        const x = 830;
        this.cineGlow(ctx, x, 470, 520, 'rgba(148,180,200,0.28)');
        const r = this.fedxBust(ctx, c.ego, x, 356, 760, { dim: 0.12, dimTint: '2,14,22' }, true);
        this.fedxGlare(ctx, x, r.top, r.u, 1 - seg(t, 70, 92), t >= 92 && t < 128 ? seg(t, 92, 128) : -1);
        this.foxcGradH(ctx, x + 2 * r.u, top, 10 * r.u, bot - top, [[0, 'rgba(2,8,14,0)'], [1, 'rgba(2,8,14,0.7)']]);
        ctx.restore();
        this.rincStamp(ctx, 'BLUE LOCK', 290, top + 118, 66, '#e2e8f0', t, 22, 2, 470);
        this.rincStamp(ctx, 'x', 290, top + 182, 44, EGO_C, t, 40, 2);
        this.rincStamp(ctx, 'SUB-20 DO JAPÃO', 290, top + 246, 54, '#f8fafc', t, 48, 2, 470);
        // AO VIVO
        const lk = seg(t, 84, 98);
        if (lk > 0) {
          ctx.save();
          ctx.globalAlpha = lk;
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(154, top + 300, 272, 38);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(176, top + 319, 7, 0, TAU);
          ctx.fill();
          ctx.font = 'italic 900 19px "Segoe UI", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('AO VIVO • REDE NACIONAL', 192, top + 320);
          ctx.restore();
        }
        // painel: os olhos do presidente arregalando
        const kp = ease(seg(t, 108, 122));
        if (kp > 0) {
          this.finPanel(ctx, [[40, bot - 166], [560, bot - 178], [560, bot - 16], [40, bot - 16]], () => {
            ctx.fillStyle = '#0a0f1a';
            ctx.fillRect(30, bot - 190, 540, 190);
            const dw = 640;
            const U = dw / 16;
            const cx = 300;
            const ey = bot - 92;
            this.fedxCrop(ctx, c.pres, {}, 10, 5.4, 16, 9, cx - 8 * U, ey - 4.7 * U, dw, 9 * U);
            this.wcdEyes(ctx, cx, ey, U, { ring: '#78716c', iris: '#1c1917', tiny: true, look: t > 140 ? 1 : 0 });
            this.fedxSweat(ctx, cx + 6.4 * U, ey - 3.2 * U + ease(seg(t, 120, 166)) * U * 1.6, U * 0.5);
            ctx.fillStyle = 'rgba(8,14,30,0.22)';
            ctx.fillRect(30, bot - 190, 540, 190);
          }, { dx: (1 - kp) * -600 });
        }
        this.cineSfx(S, 22, 'bl', () => window.SFX?.blip?.(330));
        this.cineSfx(S, 48, 'u20', () => window.SFX?.blip?.(440));
        return;
      }
      // a aposta: a tela racha em diagonal
      const u = t - cut;
      const op = ease(seg(u, 0, 14));
      const shake = 6 * (1 - seg(u, 0, 26));
      const mx = W / 2;
      const sk = 90;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.02 + easeIO(u / 180) * 0.04, shake });
      // ESQUERDA — perdeu: o Blue Lock acaba (vermelho, eles indo embora)
      ctx.save();
      ctx.translate(-(1 - op) * 600, 0);
      poly(ctx, [[-40, top - 40], [mx + sk, top - 40], [mx - sk, bot + 40], [-40, bot + 40]]);
      ctx.clip();
      this.cineGradient(ctx, -40, top - 40, mx + sk + 40, bot - top + 80, [[0, '#300606'], [1, '#0c0202']]);
      this.foxcRays(ctx, 300, bot + 40, 0, 900, 40, '#fca5a5', 0.07, u * 0.002, 0.03);
      const wk = easeIO(u / 190);
      [[c.bachira, 180, -1], [c.you, 330, 0], [c.chigiri, 480, 1]].forEach(([ch, x, i]) => {
        const f = lerp(bot + 40, bot - 70, wk) - Math.abs(i) * 10;
        const s = lerp(330, 210, wk);
        this.wcdRim2(ctx, ch, x + i * wk * 30, f, s, { facing: 'back', animState: 'run', frame: WALKF(S.f + i * 3, 8), dim: 0.8, dimTint: '20,2,2' }, '#7f1d1d', '#f87171', 3);
      });
      ctx.restore();
      // DIREITA — ganhou: o Blue Lock vira a seleção (ciano, camisa do Japão)
      ctx.save();
      ctx.translate((1 - op) * 600, 0);
      poly(ctx, [[mx + sk, top - 40], [W + 40, top - 40], [W + 40, bot + 40], [mx - sk, bot + 40]]);
      ctx.clip();
      this.cineGradient(ctx, mx - sk, top - 40, W - mx + sk + 40, bot - top + 80, [[0, '#032a33'], [1, '#020c12']]);
      this.foxcRays(ctx, 960, 300, 0, 900, 48, '#a5f3fc', 0.08, -u * 0.002, 0.03);
      this.cineGlow(ctx, 960, 330, 320, 'rgba(34,211,238,0.22)');
      this.finRim(ctx, c.rinJp, 820, bot + 30, 280, { dim: 0.25, dimTint: '2,20,30' }, '#67e8f9', [-1, 1], 2);
      this.finRim(ctx, c.nagiJp, 1110, bot + 30, 280, { dim: 0.25, dimTint: '2,20,30' }, '#67e8f9', [-1, 1], 2);
      this.finRim(ctx, c.youJp, 965, bot + 70, 370, {}, '#a5f3fc', [-1, 1], 3);
      ctx.restore();
      // a costura branca entre as duas metades
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 12;
      line(ctx, [mx + sk + 10, top - 40], [mx - sk - 10, bot + 40]);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 5;
      line(ctx, [mx + sk + 10, top - 40], [mx - sk - 10, bot + 40]);
      ctx.restore();
      this.rincStamp(ctx, 'PERDEU:', 250, top + 62, 40, '#fca5a5', u, 14, 2, 0);
      this.rincStamp(ctx, 'O BLUE LOCK ACABA.', 290, top + 120, 44, '#fee2e2', u, 22, 2, 480);
      this.rincStamp(ctx, 'GANHOU:', 1010, top + 62, 40, '#a5f3fc', u, 60, 2, 0);
      this.rincStamp(ctx, 'VIRA A SELEÇÃO.', 1000, top + 120, 44, '#ecfeff', u, 68, 2, 460);
      if (u >= 0) this.cineFlash(ctx, W, H, 0.5 * (1 - seg(u, 0, 10)));
      this.cineSfx(S, cut, 'racha', () => window.SFX?.kick?.(1));
    },

    // PLANO 5 — o presidente aceita, sorrindo: carimbo APROVADO
    fedxFed4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const k = easeIO(t / 210);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.45;
      ctx.drawImage(this.finBg('fedx_board', 1280, 720, this.fedxBoardBg), 200, 120, 600, 340, -60, -30, W + 120, H + 60);
      ctx.restore();
      ctx.fillStyle = 'rgba(6,6,12,0.55)';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1.0, 1.07, k), shake: 0.4 });
      // os outros cartolas, desfocados atrás, de risinho
      [[c.old1, 110, 0.6], [c.old4, 690, 0.55]].forEach(([ch, x, a]) => {
        this.fedxBust(ctx, ch, x, 467, 300, { dim: a, dimTint: '8,12,24' }, true);
      });
      this.cineGlow(ctx, 420, top + 40, 300, 'rgba(253,230,138,0.14)');
      this.cineGlow(ctx, 430, 470, 380, 'rgba(253,230,138,0.1)');
      const r = this.fedxBust(ctx, c.pres, 430, 336, 820, { dim: 0.12, dimTint: '20,14,8', rimColor: '#fde68a', rimSides: [-1], rimPx: 5 }, true);
      // o olho de lado, satisfeito (pixel por cima)
      this.wcdEyes(ctx, 430, r.top + SPRITE_MAPY(10.15) * r.u, r.u, { ring: '#57534e', iris: '#1c1917', half: true, lid: this.finShade(c.pres.skinColor, -0.2), look: t > 40 ? 1 : 0, reflect: '#fde68a' });
      // o brilho no dente do sorriso
      const sp = seg(t, 30, 42) * (1 - seg(t, 52, 66));
      if (sp > 0) this.finSparkle(ctx, 430 + 1.2 * r.u, r.top + SPRITE_MAPY(12.4) * r.u, r.u * 1.2, sp);
      ctx.restore();
      // o contrato e o carimbo
      const hit = 104;
      const kp = ease(seg(t, 44, 60));
      if (kp > 0) {
        this.finPanel(ctx, [[790, top + 18], [W - 18, top + 30], [W - 18, bot - 18], [760, bot - 30]], () => {
          const sh = t >= hit ? this.cineNoise(S.f * 2.1, 5) * 6 * (1 - seg(t, hit, hit + 18)) : 0;
          ctx.save();
          ctx.translate(sh, sh * 0.4);
          this.cineGradient(ctx, 750, top, 540, bot - top, [[0, '#2a1d14'], [1, '#120c08']]);
          this.cineGlow(ctx, 1000, top + 120, 260, 'rgba(253,230,138,0.2)');
          this.fedxPaper(ctx, 1010, (top + bot) / 2, 380, 400, 0.04, 'PARTIDA OFICIAL', ['BLUE LOCK  x  SUB-20 DO JAPÃO', 'TRANSMISSÃO: REDE NACIONAL', null, 'DERROTA DO BLUE LOCK:', 'FIM DO PROJETO.', null, null], { titleSize: 24 });
          this.fedxStampMark(ctx, 1030, bot - 120, 'APROVADO', -0.12, seg(t, hit, hit + 6), '#dc2626', 44);
          this.fedxStamper(ctx, 1030, bot - 120, t, hit, 0.9);
          ctx.restore();
        }, { dx: (1 - kp) * 540 });
      }
      if (t >= hit) this.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, hit, hit + 10)), '#fee2e2');
      this.finKicker(ctx, 40, top + 30, 'ELES ACHARAM QUE ESTAVAM ASSINANDO O FIM', seg(t, 128, 190), '#fbbf24');
      this.cineSfx(S, hit, 'aprovado', () => window.SFX?.tackle?.());
    },

    // PLANO 6 — o corredor de vidro: a Anri com o Aiku no tablet → o sorriso do Ego
    fedxFed5(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const cut = 196;
      if (t < cut) {
        const k = easeIO(t / cut);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: lerp(360, 372, k), zoom: lerp(1.02, 1.1, k), shake: 0.5 });
        ctx.drawImage(this.finBg('fedx_hall', 1280, 720, this.fedxHallBg), 0, 0);
        const wk = seg(t, 0, cut);
        const feet = lerp(560, 650, wk);
        const size = lerp(250, 360, wk);
        [[c.ego, 560, 1.0], [c.anri, 735, 0.92]].forEach(([ch, x, sc], i) => {
          const f = feet - i * 6;
          const s = size * sc;
          ctx.save();
          ctx.translate(x, f + 6);
          ctx.scale(1, 0.18);
          this.cineGlow(ctx, 0, 0, s * 0.5, 'rgba(219,234,254,0.2)');
          ctx.restore();
          this.finRim(ctx, ch, x, f, s, { animState: 'run', view: 'front', frame: WALKF(S.f + i * 9, 7), dim: 0.2, dimTint: '6,12,26' }, '#bfdbfe', [-1, 1], 2);
        });
        // o tablet na mão da Anri
        const s2 = size * 0.92;
        const u2 = s2 / 36;
        const tp = feet - 6 - s2 * 0.87;
        const tx = 735 + 6.5 * u2;
        const ty = tp + 18.5 * u2;
        ctx.fillStyle = '#05070c';
        ctx.fillRect(tx, ty, 5.2 * u2, 3.6 * u2);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(tx + 0.4 * u2, ty + 0.4 * u2, 4.4 * u2, 2.8 * u2);
        this.cineGlow(ctx, tx + 2.6 * u2, ty + 1.8 * u2, 5 * u2, 'rgba(56,189,248,0.5)');
        ctx.restore();
        // painel: a Anri, decidida
        const kA = ease(seg(t, 24, 40));
        if (kA > 0) {
          this.finPanel(ctx, [[20, top + 16], [470, top + 16], [452, 336], [20, 326]], () => {
            this.cineGradient(ctx, 0, top, 480, 260, [[0, '#2a1f10'], [1, '#0c0a06']]);
            this.drawRadialSpeedLines(ctx, 245, 220, 420, '#fde68a', 0.1);
            const r = this.finHead(ctx, c.anri, 245, 232, 460, { rim: '#fde68a' });
            this.wcdEyes(ctx, 245, 232, r.u, { ring: '#a16207', iris: '#3f2a1d', shine: 1, reflect: '#fde68a' });
            this.rincStamp(ctx, 'CONSEGUI!', 380, top + 50, 30, '#fef3c7', t, 36, 2);
          }, { dx: (1 - kA) * -520 });
        }
        // painel: a chamada com o Aiku
        const kB = ease(seg(t, 78, 94));
        if (kB > 0) {
          this.finPanel(ctx, [[812, 300], [W - 18, 290], [W - 18, bot - 16], [830, bot - 16]], () => {
            this.cineGradient(ctx, 800, 280, 480, 360, [[0, '#0a1222'], [1, '#04070e']]);
            this.fedxTablet(ctx, 852, 318, 400, 262, t, seg(t, 128, 136));
          }, { dy: (1 - kB) * 360 });
        }
        this.cineSfx(S, 132, 'aceito', () => window.SFX?.blip?.(660));
        return;
      }
      // o close do Ego: o canto da boca sobe
      const u = t - cut;
      const k = easeIO(u / 130);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#02050b'], [1, '#07101e']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 650, y: 360, zoom: 1 + k * 0.08, shake: 0.4 });
      this.cineBokeh(ctx, W, top + 10, bot - 120, t, 14, ['rgba(253,224,71,0.24)', 'rgba(147,197,253,0.3)'], 9);
      this.cineGlow(ctx, 640, 200, 420, 'rgba(204,251,241,0.14)');
      const x = 680;
      this.cineGlow(ctx, x + 120, 420, 520, 'rgba(94,234,212,0.16)');
      const r = this.fedxBust(ctx, c.ego, x, 300, 900, { dim: 0.16, dimTint: '2,10,20' }, true);
      this.fedxGlare(ctx, x, r.top, r.u, 0, u >= 14 && u < 44 ? seg(u, 14, 44) : -1);
      this.fedxSmirk(ctx, x, r.top, r.u, ease(seg(u, 40, 56)), c.ego.skinColor);
      this.foxcGradH(ctx, 0, top, x - 7 * r.u, bot - top, [[0, 'rgba(2,5,11,0.85)'], [1, 'rgba(2,5,11,0)']]);
      ctx.restore();
      const tk = seg(u, 70, 104);
      if (tk > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, tk * 2);
        this.foxcGrad(ctx, 0, bot - 230, W, 230, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.88)']]);
        ctx.restore();
      }
      this.cineTitleCard(ctx, W, bot - 100, tk, { kicker: 'A APOSTA ESTÁ FEITA', title: 'BLUE LOCK x SUB-20', sub: '', color: EGO_C });
      this.cineSfx(S, cut + 70, 'titulo', () => window.SFX?.kick?.(0.8));
    }
  });

  // ==========================================================================
  // O TELÃO E A FORMAÇÃO (cenários e peças do bl_eleven / shidou_cut)
  // ==========================================================================
  // O telão da sala do Blue Lock
  const SCR = { x: 220, y: 104, w: 840, h: 330 };
  // A formação na lousa tática (mundo 1280 x 720, ataque para a direita): quem, x, y,
  // nome, posição, quadro global em que entra (P2 começa em 0, P3 em 310, P4 em 610)
  const ELEVEN = [
    ['gagamaru', 150, 360, 'GAGAMARU', 'GOLEIRO', 24, 'GAH.'],
    ['aryu', 330, 265, 'ARYU', 'ZAGUEIRO', 56, 'OSHAAA~'],
    ['niko', 330, 455, 'NIKO', 'ZAGUEIRO', 84, '...certo.'],
    ['bachira', 520, 198, 'BACHIRA', 'LATERAL', 150, 'HEHE!'],
    ['chigiri', 520, 522, 'CHIGIRI', 'LATERAL', 178, 'BORA.'],
    ['karasu', 530, 360, 'KARASU', 'VOLANTE', 210, 'TSC. BELEZA.'],
    ['otoya', 735, 248, 'OTOYA', 'ATAQUE', 334, 'MODO NINJA.'],
    ['yukimiya', 735, 472, 'YUKIMIYA', 'ATAQUE', 362, 'TÔ PRONTO.'],
    ['nagi', 935, 198, 'NAGI', 'LINHA DE FRENTE', 430, 'ZZZ...'],
    ['rin', 935, 522, 'RIN', 'LINHA DE FRENTE', 506, '...'],
    ['you', 1050, 360, null, 'CENTRO DO ATAQUE', 750, '']
  ];
  const LINKS = [[0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 5], [5, 6], [5, 7], [3, 6], [4, 7], [6, 8], [7, 9], [6, 10], [7, 10], [8, 10], [9, 10]];
  const YOU_AT = 750;

  Object.assign(CE, {
    // A sala do telão do Blue Lock (vista de trás dos jogadores)
    fedxRoomBg(g, w, h) {
      this.cineGradient(g, 0, 0, w, h, [[0, '#02050a'], [0.6, '#06101c'], [1, '#03070d']]);
      // teto com as faixas ciano
      g.fillStyle = '#010307';
      g.fillRect(0, 0, w, 76);
      [[0, 300], [980, 1280]].forEach(([a, b]) => {
        g.fillStyle = 'rgba(34,211,238,0.5)';
        g.fillRect(a, 74, b - a, 3);
      });
      // paredes laterais com os neons verticais
      [[0, 1], [1, -1]].forEach(([side, dir]) => {
        const x0 = side ? w : 0;
        g.fillStyle = '#050b14';
        poly(g, [[x0, 70], [x0 + dir * 170, 120], [x0 + dir * 170, 480], [x0, 560]]);
        g.fill();
        [50, 120].forEach((d) => {
          g.fillStyle = 'rgba(34,211,238,0.55)';
          poly(g, [[x0 + dir * d, 82 + d * 0.3], [x0 + dir * (d + 6), 82 + d * 0.3], [x0 + dir * (d + 6), 520 - d * 0.45], [x0 + dir * d, 520 - d * 0.45]]);
          g.fill();
          this.cineGlow(g, x0 + dir * (d + 3), 300, 70, 'rgba(34,211,238,0.22)');
        });
      });
      // a moldura do telão e os suportes
      g.fillStyle = '#010205';
      g.fillRect(SCR.x - 20, SCR.y - 20, SCR.w + 40, SCR.h + 40);
      g.strokeStyle = 'rgba(148,163,184,0.25)';
      g.lineWidth = 2;
      g.strokeRect(SCR.x - 20, SCR.y - 20, SCR.w + 40, SCR.h + 40);
      g.fillStyle = '#04070d';
      g.fillRect(SCR.x + 120, SCR.y + SCR.h + 20, 24, 60);
      g.fillRect(SCR.x + SCR.w - 144, SCR.y + SCR.h + 20, 24, 60);
      // o palco embaixo do telão
      g.fillStyle = '#07101c';
      g.fillRect(150, 494, 980, 26);
      g.fillStyle = 'rgba(34,211,238,0.7)';
      g.fillRect(150, 494, 980, 3);
      g.font = 'italic 900 15px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(34,211,238,0.55)';
      g.fillText('B L U E   L O C K', 640, 508);
      // chão em perspectiva
      this.cineGradient(g, 0, 520, w, h - 520, [[0, '#06101c'], [1, '#02050a']]);
      g.strokeStyle = 'rgba(34,211,238,0.08)';
      g.lineWidth = 1.5;
      for (let i = -12; i <= 12; i++) line(g, [640 + i * 60, 520], [640 + i * 240, h]);
      [540, 572, 620, 690].forEach((y) => line(g, [0, y], [w, y]));
    },

    // A parede do outro lado (os jogadores de frente, com a luz do telão no rosto)
    fedxFrontBg(g, w, h) {
      this.cineGradient(g, 0, 0, w, h, [[0, '#02050a'], [1, '#050c16']]);
      for (let x = 40; x < w; x += 180) {
        g.fillStyle = 'rgba(15,23,42,0.6)';
        g.fillRect(x, 110, 150, 360);
        g.strokeStyle = 'rgba(2,4,8,0.9)';
        g.lineWidth = 3;
        g.strokeRect(x, 110, 150, 360);
      }
      g.font = 'italic 900 64px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(34,211,238,0.10)';
      g.fillText('BLUE LOCK', 640, 200);
      g.fillStyle = 'rgba(34,211,238,0.5)';
      g.fillRect(0, 96, w, 3);
      g.fillRect(0, 470, w, 3);
      this.cineGradient(g, 0, 473, w, h - 473, [[0, '#071321'], [1, '#02050a']]);
      g.strokeStyle = 'rgba(34,211,238,0.07)';
      g.lineWidth = 1.5;
      for (let i = -12; i <= 12; i++) line(g, [640 + i * 70, 473], [640 + i * 280, h]);
    },

    // A lousa tática (o que o telão mostra, em tela cheia)
    fedxTacBg(g, w, h) {
      g.fillStyle = '#020a14';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(34,211,238,0.06)';
      g.lineWidth = 1;
      g.beginPath();
      for (let x = 16; x < w; x += 32) {
        g.moveTo(x, 0);
        g.lineTo(x, h);
      }
      for (let y = 16; y < h; y += 32) {
        g.moveTo(0, y);
        g.lineTo(w, y);
      }
      g.stroke();
      const X0 = 60;
      const X1 = 1220;
      const Y0 = 100;
      const Y1 = 620;
      for (let i = 0; i < 10; i++) {
        if (i % 2) continue;
        g.fillStyle = 'rgba(13,148,136,0.07)';
        g.fillRect(X0 + (i * (X1 - X0)) / 10, Y0, (X1 - X0) / 10, Y1 - Y0);
      }
      g.strokeStyle = 'rgba(94,234,212,0.45)';
      g.lineWidth = 3;
      g.strokeRect(X0, Y0, X1 - X0, Y1 - Y0);
      line(g, [640, Y0], [640, Y1]);
      g.beginPath();
      g.arc(640, 360, 80, 0, TAU);
      g.stroke();
      [[X0, 1], [X1, -1]].forEach(([x, d]) => {
        g.strokeRect(Math.min(x, x + d * 170), 220, 170, 280);
        g.strokeRect(Math.min(x, x + d * 60), 300, 60, 120);
        g.beginPath();
        g.arc(x + d * 120, 360, 70, d > 0 ? -0.9 : Math.PI - 0.9, d > 0 ? 0.9 : Math.PI + 0.9);
        g.stroke();
        g.fillStyle = 'rgba(94,234,212,0.45)';
        g.fillRect(x + d * 120 - 3, 357, 6, 6);
        g.fillRect(x - (d > 0 ? 14 : 0), 320, 14, 80);
      });
      g.fillRect(637, 357, 6, 6);
      // seta do ataque
      g.fillStyle = 'rgba(94,234,212,0.18)';
      poly(g, [[560, 640], [720, 640], [720, 630], [750, 646], [720, 662], [720, 652], [560, 652]]);
      g.fill();
    },

    // A lista dos onze no telão (parada, guardada), com a varredura
    fedxListScreen(ctx, x, y, w, h, t) {
      const name = this.cinePlayerName();
      const still = this.finBg(`fedx_list|${name}|${w}x${h}`, w, h, (g) => {
        this.cineGradient(g, 0, 0, w, h, [[0, '#06283a'], [1, '#020b16']]);
        g.strokeStyle = 'rgba(0,245,212,0.08)';
        g.lineWidth = 1;
        g.beginPath();
        for (let gx = 17; gx < w; gx += 34) {
          g.moveTo(gx, 0);
          g.lineTo(gx, h);
        }
        g.stroke();
        this.finPixelText(g, 'BLUE LOCK ELEVEN', w / 2, 40, 4, '#5eead4', 'center', w * 0.8);
        g.fillStyle = '#00f5d4';
        g.fillRect(w * 0.2, 66, w * 0.6, 3);
        const L = ELEVEN.map((e) => [e[3] || name, e[4]]);
        L.forEach(([nm, pos], i) => {
          const col = i < 6 ? 0 : 1;
          const row = i < 6 ? i : i - 6;
          const px = 40 + col * (w / 2);
          const py = 100 + row * 38;
          this.finPixelText(g, `${String(i + 1).padStart(2, '0')}`, px, py, 2.2, '#22d3ee', 'left');
          this.finPixelText(g, nm, px + 50, py, 2.4, nm === name ? '#ffffff' : '#e2e8f0', 'left', w / 2 - 200);
          this.finPixelText(g, pos, px + w / 2 - 70, py, 1.6, '#64748b', 'right');
        });
        g.fillStyle = 'rgba(0,245,212,0.06)';
        g.fillRect(0, 0, w, h);
        this.finFillPat(g, 'scan', 0, 0, w, h, 0.8);
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
      ctx.restore();
    },

    // Carta de jogador na formação (k = entrada; ring = onda de luz quando pousa)
    fedxCard(ctx, char, x, y, k, name, pos, o = {}) {
      if (k <= 0) return;
      const w = o.w || 118;
      const h = Math.round(w * 1.3);
      const e = ease(k);
      const ring = o.ring ?? 0;
      if (ring > 0 && ring < 1) {
        ctx.save();
        ctx.strokeStyle = `rgba(165,243,252,${0.8 * (1 - ring)})`;
        ctx.lineWidth = 3;
        const s = 1 + ring * 0.7;
        ctx.strokeRect(x - (w / 2) * s, y - (h / 2) * s, w * s, h * s);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(x, y);
      const sc = 1 + (1 - e) * 0.9;
      ctx.scale(sc, sc);
      ctx.globalAlpha *= Math.min(1, k * 3);
      this.cineGlow(ctx, 0, 0, w * 0.95, o.hl ? 'rgba(0,245,212,0.5)' : 'rgba(34,211,238,0.22)');
      ctx.fillStyle = '#04121f';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      const fw = w - 10;
      const fh = fw * 0.85;
      this.cineGradient(ctx, -w / 2 + 5, -h / 2 + 5, fw, fh, [[0, o.hl ? '#0f5f66' : '#0d3445'], [1, '#04161f']]);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-w / 2 + 5, -h / 2 + 5, fw, fh);
      ctx.clip();
      this.finCrop(ctx, char, {}, 9, -2.5, 18, 15.3, -w / 2 + 5, -h / 2 + 5, fw, fh);
      ctx.restore();
      ctx.fillStyle = '#020617';
      ctx.fillRect(-w / 2, h / 2 - 40, w, 40);
      ctx.fillStyle = o.hl ? '#00f5d4' : '#22d3ee';
      ctx.fillRect(-w / 2, h / 2 - 40, w, 3);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let fs = o.hl ? 18 : 15;
      ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      while (fs > 9 && ctx.measureText(name).width > w - 12) {
        fs -= 1;
        ctx.font = `italic 900 ${fs}px "Segoe UI", sans-serif`;
      }
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(name, 0, h / 2 - 24);
      ctx.font = '800 10px "Segoe UI", sans-serif';
      ctx.fillStyle = o.hl ? '#5eead4' : '#7dd3fc';
      ctx.fillText(pos, 0, h / 2 - 9, w - 8);
      ctx.strokeStyle = o.hl ? '#00f5d4' : 'rgba(34,211,238,0.85)';
      ctx.lineWidth = o.hl ? 4 : 2.5;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    },

    // A lousa com as cartas até o quadro global gt; cam = câmera da lousa
    fedxTac(ctx, S, gt, cam) {
      const { W, H, top } = S;
      const c = this.fedxCast();
      const name = this.cinePlayerName();
      ctx.save();
      this.cineCamera(ctx, W, H, cam);
      ctx.fillStyle = '#020a14';
      ctx.fillRect(-700, -400, 2680, 1520);
      ctx.drawImage(this.finBg('fedx_tac', 1280, 720, this.fedxTacBg), 0, 0);
      // linhas de passe entre quem já está na lousa
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -gt * 0.6;
      ctx.lineWidth = 2;
      LINKS.forEach(([a, b]) => {
        const k = seg(gt, Math.max(ELEVEN[a][5], ELEVEN[b][5]) + 10, Math.max(ELEVEN[a][5], ELEVEN[b][5]) + 30);
        if (k <= 0) return;
        const A = ELEVEN[a];
        const B = ELEVEN[b];
        ctx.strokeStyle = `rgba(94,234,212,${0.35 * k})`;
        line(ctx, [A[1], A[2]], [lerp(A[1], B[1], k), lerp(A[2], B[2], k)]);
      });
      ctx.restore();
      // a vaga do centro, esperando
      if (gt < YOU_AT + 8) {
        const p = 0.5 + 0.5 * Math.sin(gt * 0.15);
        ctx.save();
        ctx.setLineDash([12, 8]);
        ctx.strokeStyle = `rgba(0,245,212,${0.4 + 0.4 * p})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(1050 - 66, 360 - 86, 132, 172);
        ctx.restore();
        this.cineImpactText(ctx, '?', 1050, 352, 80, '#5eead4', 1);
      }
      ELEVEN.forEach(([id, x, y, nm, pos, at]) => {
        const ch = id === 'you' ? c.you : c[id];
        const isYou = id === 'you';
        const k = seg(gt, at, at + (isYou ? 10 : 14));
        this.fedxCard(ctx, ch, x, y, k, nm || name, pos, { hl: isYou, w: isYou ? 132 : 106, ring: seg(gt, at + 8, at + 34) });
      });
      // reações curtas
      ELEVEN.forEach(([id, x, y, , , at, say]) => {
        if (!say) return;
        const k = seg(gt, at + 14, at + 24) * (1 - seg(gt, at + 88, at + 100));
        this.fedxBubble(ctx, x + 110, y - 50, say, k, '#0b1120', 17, -1);
      });
      ctx.restore();
      // HUD do telão: a faixa de cima
      this.foxcGrad(ctx, 0, top, W, 44, [[0, 'rgba(1,8,16,0.92)'], [1, 'rgba(1,8,16,0)']]);
      this.finPixelText(ctx, 'BLUE LOCK ELEVEN', 40, top + 18, 2.4, '#5eead4', 'left');
      this.finPixelText(ctx, 'vs SUB-20 DO JAPÃO', W - 150, top + 18, 1.8, '#94a3b8', 'right');
      const n = ELEVEN.filter((e) => gt >= e[5]).length;
      this.finPixelText(ctx, `${n}/11`, W - 40, top + 18, 2.4, n === 11 ? '#00f5d4' : '#e2e8f0', 'right');
      this.finFillPat(ctx, 'scan', 0, top, W, S.bot - top, 0.35);
      ELEVEN.forEach((e, i) => this.cineSfx(S, e[5] - (S.phase === 1 ? 0 : S.phase === 2 ? 310 : 610), 'carta' + i, () => window.SFX?.blip?.(380 + i * 30)));
    },

    // Os jogadores de costas na frente do telão (silhuetas com a luz ciano recortando)
    fedxCrowdBack(ctx, c, t) {
      const rows = [
        [190, 566, [['gagamaru', 470], ['aryu', 360], ['niko', 800], ['karasu', 910], ['shidou', 1160]]],
        [250, 646, [['yukimiya', 170], ['otoya', 1090], ['nagi', 470], ['chigiri', 810]]],
        [350, 790, [['bachira', 220], ['you', 640], ['rin', 1060]]]
      ];
      const tints = ['#0d1a26', '#08121c', '#03070d'];
      rows.forEach(([size, feet, list], ri) => {
        list.forEach(([id, x]) => {
          const pink = id === 'shidou';
          this.finRim(ctx, c[id], x, feet, size, { facing: 'back', tint: tints[ri] }, pink ? '#f9a8d4' : '#67e8f9', [-1, 1], size > 300 ? 3 : 2);
        });
      });
    }
  });

  // ==========================================================================
  // 2. O BLUE LOCK ELEVEN (bl_eleven)
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — o telão: o Ego aparece; todos de costas, recortados pela luz
    fedxEle0(ctx, S) {
      const { W, H, t, top } = S;
      const c = this.fedxCast();
      const k = easeIO(t / 230);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(420, 352, k), zoom: lerp(1.16, 1.0, k), shake: 0.4 });
      ctx.drawImage(this.finBg('fedx_room', 1280, 720, this.fedxRoomBg), 0, 0);
      this.cineGlow(ctx, 640, 270, 640, 'rgba(0,245,212,0.16)');
      this.finEgoScreen(ctx, SCR.x, SCR.y, SCR.w, SCR.h, t, {});
      this.cineShafts(ctx, 640, SCR.y + SCR.h, Math.PI / 2, 520, 1.8, 7, '94,234,212', 0.05, t);
      this.cineDust(ctx, W, H, t, 30, 'rgba(165,243,252,0.4)', 12);
      this.fedxCrowdBack(ctx, c, t);
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'BLUE LOCK • SALA DO TELÃO', seg(t, 8, 48));
      this.finKicker(ctx, 40, top + 58, 'TERCEIRA SELEÇÃO • 08:00', seg(t, 36, 84), '#38bdf8');
    },

    // PLANO 2 — a lousa: a defesa, carta por carta
    fedxEle1(ctx, S) {
      const t = S.t;
      const k = easeIO(t / 310);
      this.fedxTac(ctx, S, t, { x: lerp(330, 560, k), y: 360, zoom: lerp(1.22, 1.13, k), shake: 0.3 });
      // entrada: a câmera atravessa a moldura do telão
      const z = 1 - ease(seg(t, 0, 20));
      if (z > 0) {
        ctx.save();
        ctx.globalAlpha = z;
        ctx.fillStyle = '#010205';
        const m = 200 * z;
        ctx.fillRect(0, 0, S.W, m + S.top);
        ctx.fillRect(0, S.bot - m, S.W, m + S.top);
        ctx.fillRect(0, 0, m * 1.6, S.H);
        ctx.fillRect(S.W - m * 1.6, 0, m * 1.6, S.H);
        ctx.restore();
      }
    },

    // PLANO 3 — o ataque: Otoya, Yukimiya, Nagi, Rin... e a vaga do centro vazia
    fedxEle2(ctx, S) {
      const t = S.t;
      const k = easeIO(t / 300);
      this.fedxTac(ctx, S, 310 + t, { x: lerp(560, 840, k), y: 360, zoom: lerp(1.13, 1.17, k), shake: 0.3 });
    },

    // PLANO 4 — o centro do ataque: a vaga → a SUA carta → o seu rosto
    fedxEle3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const name = this.cinePlayerName();
      const hit = 140;
      const cut = 168;
      if (t < cut) {
        const k = easeIO(seg(t, 0, hit));
        const sh = t >= hit ? 8 * (1 - seg(t, hit, hit + 22)) : 0;
        this.fedxTac(ctx, S, 610 + t, { x: lerp(840, 1050, k), y: 360, zoom: lerp(1.17, 2.25, k), shake: 0.3 + sh });
        if (t >= hit) {
          const u = t - hit;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          this.foxcRays(ctx, W / 2, (top + bot) / 2, 120, 900, 48, '#5eead4', 0.16 * (1 - seg(u, 6, 28)), u * 0.01, 0.03);
          ctx.restore();
          this.cineFlash(ctx, W, H, 0.6 * (1 - seg(u, 0, 12)), '#ccfbf1');
        }
        this.cineSfx(S, hit, 'voce', () => window.SFX?.kick?.(1));
        return;
      }
      // o seu rosto: a aura sobe, o nome bate
      const u = t - cut;
      const k = easeIO(u / 92);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#011014'], [1, '#03222a']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.0 + k * 0.06, shake: 1.2 });
      this.drawRadialSpeedLines(ctx, 860, 330, 1300, '#99f6e4', 0.16);
      this.cineGlow(ctx, 860, 360, 520, 'rgba(0,245,212,0.22)');
      const size = 820;
      const x = 860;
      const eyeY = 334;
      const uu = size / 36;
      const feet = eyeY - SPRITE_MAPY(10.1) * uu + size * 0.87;
      this.wcdAura(ctx, x, feet, size, t, 0.5, ['#0e7490', '#22d3ee', '#a5f3fc']);
      const r = this.fedxBust(ctx, c.you, x, eyeY, size, {}, true);
      const eye = c.you.eyeColor || '#ef4444';
      this.wcdEyes(ctx, x, eyeY, r.u, { ring: eye, iris: this.finShade(eye, -0.55), shine: 1, reflect: '#a5f3fc' });
      ctx.restore();
      const st = this.rincStamp(ctx, name, 330, top + 210, 104, '#f8fafc', u, 4, 2, 560);
      if (st) {
        const lk = ease(seg(u, 4 + name.length * 2 + 4, 4 + name.length * 2 + 22));
        ctx.fillStyle = YOU_C;
        ctx.fillRect(330 - (st.w / 2) * lk, top + 210 + st.fs * 0.56, st.w * lk, 6);
      }
      this.finKicker(ctx, 330, top + 320, 'ATACANTE • CENTRO DO ATAQUE', seg(u, 30, 70), YOU_C, 'center');
      this.finKicker(ctx, 330, top + 352, 'BLUE LOCK ELEVEN • 11/11', seg(u, 46, 86), '#94a3b8', 'center');
    },

    // PLANO 5 — as reações: o Bachira rindo, o Nagi com preguiça, o Rin frio
    fedxEle4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, W, H);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      // A: o Bachira gargalhando
      const kA = ease(seg(t, 0, 14));
      this.finPanel(ctx, [[16, top + 14], [566, top + 14], [520, bot - 14], [16, bot - 14]], () => {
        this.cineGradient(ctx, 0, top, 580, bot - top, [[0, '#3a2a05'], [1, '#120c02']]);
        this.drawRadialSpeedLines(ctx, 290, 330, 760, '#fde68a', 0.16);
        const bob = -Math.abs(Math.sin(t * 0.4)) * 6;
        const r = this.fedxBust(ctx, c.bachira, 280, 336 + bob, 620, { rim: '#fde68a' }, '18,12,2');
        this.fedxLaughEyes(ctx, 280, r.top, r.u, this.finShade(c.bachira.skinColor, -0.04));
        this.fedxLaughMouth(ctx, 280, r.top, r.u, 0.55 + 0.45 * Math.abs(Math.sin(t * 0.4)), null);
        this.rincStamp(ctx, 'HAHAHA!', 300, top + 56, 52, '#fef08a', t, 10, 2, 460);
      }, { dx: (1 - kA) * -600 });
      // B: o Nagi, com preguiça
      const kB = ease(seg(t, 150, 164));
      if (kB > 0) {
        this.finPanel(ctx, [[584, top + 14], [W - 16, top + 14], [W - 16, 344], [560, 354]], () => {
          this.cineGradient(ctx, 540, top, 740, 280, [[0, '#1e293b'], [1, '#0b1120']]);
          this.finFillPat(ctx, 'dots', 540, top, 740, 280, 0.25);
          const r = this.fedxBust(ctx, c.nagi, 900, 254, 560, { rim: '#e2e8f0' }, '11,17,32');
          this.wcdEyes(ctx, 900, 254, r.u, { ring: '#94a3b8', iris: '#334155', half: true, lid: this.finShade(c.nagi.skinColor, -0.2), look: t > 200 ? -1 : 0 });
          this.rincStamp(ctx, 'QUE SACO...', 1110, top + 70, 34, '#e2e8f0', t, 160, 2, 300);
        }, { dx: (1 - kB) * 720 });
      }
      // C: o Rin, frio, só os olhos
      const kC = ease(seg(t, 200, 214));
      if (kC > 0) {
        this.finPanel(ctx, [[558, 370], [W - 16, 360], [W - 16, bot - 14], [532, bot - 14]], () => {
          ctx.fillStyle = '#010a0d';
          ctx.fillRect(520, 350, 760, 300);
          const ey = 482;
          const U = this.wcdEyeBand(ctx, c.rin, 905, ey, 760, { dim: 0.25, dimTint: '0,20,24' });
          this.wcdEyes(ctx, 905, ey, U, { ring: '#22d3ee', iris: '#0f766e', angry: true, line: '#010409' });
          this.foxcGrad(ctx, 520, 350, 760, 60, [[0, 'rgba(1,10,13,0.9)'], [1, 'rgba(1,10,13,0)']]);
          this.rincStamp(ctx, '...', 1180, bot - 50, 40, '#a5f3fc', t, 222, 4);
        }, { dy: (1 - kC) * 320 });
      }
      this.cineSfx(S, 150, 'nagi', () => window.SFX?.page?.());
      this.cineSfx(S, 200, 'rin', () => window.SFX?.page?.());
    },

    // PLANO 6 — o silêncio: os onze de frente... e o Shidou, sozinho no escuro
    fedxEle5(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const k = easeIO(seg(t, 90, 280));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, 880, k), y: lerp(360, 340, k), zoom: lerp(1.02, 1.34, k), shake: 0.35 });
      ctx.drawImage(this.finBg('fedx_front', 1280, 720, this.fedxFrontBg), 0, 0);
      this.cineGlow(ctx, 520, 420, 620, 'rgba(0,245,212,0.12)');
      const lit = { dim: 0.32, dimTint: '0,26,40' };
      [
        [190, 470, [['gagamaru', 300], ['aryu', 420], ['karasu', 540], ['niko', 660], ['otoya', 780]]],
        [240, 540, [['yukimiya', 200], ['chigiri', 350], ['nagi', 760], ['bachira', 880]]],
        [290, 640, [['you', 470], ['rin', 640]]]
      ].forEach(([size, feet, list]) => list.forEach(([id, x]) => this.finRim(ctx, c[id], x, feet, size, lit, '#67e8f9', [-1, 1], 2)));
      // o Shidou, separado, no escuro
      const sx = 1110;
      const sf = 600;
      const ss = 300;
      this.foxcGradH(ctx, 940, -100, 500, 920, [[0, 'rgba(0,0,0,0)'], [0.35, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0.6)']]);
      this.finRim(ctx, c.shidou, sx, sf, ss, { dim: 0.72, dimTint: '14,2,10' }, '#f472b6', [1], 2);
      this.rincShade(ctx, c.shidou, sx, sf, ss, 0.92);
      const su = ss / 36;
      const sTop = sf - ss * 0.87;
      [-1, 1].forEach((s) => {
        this.cineGlow(ctx, sx + s * 3.45 * su, sTop + SPRITE_MAPY(10.2) * su, su * 2.6, 'rgba(236,72,153,0.85)', seg(t, 150, 190));
        ctx.fillStyle = `rgba(251,207,232,${seg(t, 150, 190)})`;
        ctx.fillRect(Math.round(sx + s * 3.45 * su - su * 0.6), Math.round(sTop + SPRITE_MAPY(9.9) * su), Math.ceil(su * 1.2), Math.ceil(su * 0.6));
      });
      ctx.restore();
      this.rincStamp(ctx, '. . . . . .', 560, top + 64, 48, '#cbd5e1', t, 40, 4);
      this.finKicker(ctx, 40, top + 30, 'ONZE NOMES. NENHUM DELES: RYUSEI SHIDOU.', seg(t, 200, 270), SHIDOU_C);
      this.cineSfx(S, 150, 'olhos', () => window.SFX?.blip?.(180));
    }
  });

  // ==========================================================================
  // 3. O SHIDOU CORTADO (shidou_cut)
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — "Hah?! Eu tô fora?!": o Shidou na frente da lista, explodindo
    fedxCut0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const mad = t < 128;
      const shake = 1.2 + (t < 24 ? 7 * (1 - seg(t, 4, 24)) : 0) + (t > 128 && t < 150 ? 4 : 0);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 330, zoom: 1.12, rot: -0.03, shake });
      ctx.drawImage(this.finBg('fedx_room', 1280, 720, this.fedxRoomBg), 0, 0);
      this.fedxListScreen(ctx, SCR.x, SCR.y, SCR.w, SCR.h, t);
      ctx.fillStyle = 'rgba(30,2,16,0.35)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      const size = 620;
      const x = 640;
      const eyeY = 330;
      const uu = size / 36;
      const feet = eyeY - SPRITE_MAPY(10.1) * uu + size * 0.87;
      this.cineGlow(ctx, x, 420, 520, 'rgba(236,72,153,0.22)');
      this.wcdAura(ctx, x, feet, size, t, 0.85, ['#831843', '#ec4899', '#fbcfe8']);
      const ch = mad ? c.shidouMad : c.shidou;
      const r = this.fedxBust(ctx, ch, x, eyeY, size, {});
      if (!mad) {
        // a risada doida: olho miudinho e a boca escancarada
        this.wcdEyes(ctx, x, eyeY, r.u, { ring: '#ec4899', iris: '#831843', tiny: true, look: [0, 1, 0, -1][Math.floor(t / 3) % 4] });
        this.fedxLaughMouth(ctx, x, r.top, r.u, 0.6 + 0.4 * Math.abs(Math.sin(t * 0.5)), null);
      }
      ctx.restore();
      this.cineImpactText(ctx, 'HAAAH?!', 330, top + 96, 92, '#f9a8d4', seg(t, 6, 16) * (1 - seg(t, 118, 128)), 0, -0.1);
      ['HA', 'HAHA', 'HAHAHA!'].forEach((s, i) => this.cineImpactText(ctx, s, [250, 1020, 990][i], [top + 120, top + 90, top + 220][i], [56, 64, 76][i], '#fbcfe8', seg(t, 136 + i * 16, 144 + i * 16), 0, [-0.15, 0.1, -0.06][i]));
      // painel: os olhos, pupila miudinha
      const kp = ease(seg(t, 52, 66)) * (1 - ease(seg(t, 116, 128)));
      if (kp > 0) {
        this.finPanel(ctx, [[760, bot - 196], [W - 20, bot - 210], [W - 20, bot - 16], [740, bot - 16]], () => {
          ctx.fillStyle = '#14020c';
          ctx.fillRect(720, bot - 220, 560, 220);
          this.drawRadialSpeedLines(ctx, 1010, bot - 110, 600, '#f9a8d4', 0.14);
          const ey = bot - 104;
          const U = this.wcdEyeBand(ctx, c.shidouMad, 1010, ey, 700, {});
          this.wcdEyes(ctx, 1010, ey, U, { ring: '#ec4899', iris: '#831843', tiny: true, angry: true, look: [0, 1, 0, -1][Math.floor(t / 2) % 4] });
        }, { dx: (1 - kp) * 560 });
      }
      if (t >= 6) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, 6, 16)), '#fbcfe8');
      this.cineSfx(S, 6, 'hah', () => window.SFX?.tackle?.());
      this.cineSfx(S, 136, 'risada', () => window.SFX?.blip?.(260));
    },

    // PLANO 2 — o Ego no telão, frio: "Você não joga com o Rin. Fora."
    fedxCut1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const k = easeIO(t / 150);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(320, 290, k), zoom: lerp(1.0, 1.32, k), shake: 0.3 });
      ctx.drawImage(this.finBg('fedx_room', 1280, 720, this.fedxRoomBg), 0, 0);
      this.cineGlow(ctx, 640, 270, 640, 'rgba(0,245,212,0.18)');
      this.finEgoScreen(ctx, SCR.x, SCR.y, SCR.w, SCR.h, t, { size: SCR.h * 2.3, fy: 0.36 });
      // o reflexo branco nos óculos do Ego no telão
      const eu = (SCR.h * 2.3) / 36;
      const etop = SCR.y + SCR.h * 0.36 - SPRITE_MAPY(10.1) * eu;
      ctx.save();
      ctx.beginPath();
      ctx.rect(SCR.x, SCR.y, SCR.w, SCR.h);
      ctx.clip();
      this.fedxGlare(ctx, SCR.x + SCR.w / 2, etop, eu, 0.9 * (1 - seg(t, 60, 80)) + 0.9 * seg(t, 140, 150));
      ctx.restore();
      ctx.restore();
      // o Shidou de costas, na frente do telão
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.05, shake: 0.6 });
      this.finRim(ctx, c.shidou, 1030, bot + 330, 600, { facing: 'back', tint: '#0a0208' }, '#f472b6', [-1, 1], 4);
      ctx.restore();
      // o diagrama: Shidou x Rin
      const kd = ease(seg(t, 150, 166));
      if (kd > 0) {
        ctx.save();
        ctx.globalAlpha = kd;
        this.foxcGrad(ctx, 0, top + 160, W, bot - top - 160, [[0, 'rgba(2,6,12,0)'], [0.3, 'rgba(2,6,12,0.85)'], [1, 'rgba(2,6,12,0.95)']]);
        ctx.restore();
        this.fedxCard(ctx, c.shidou, 470, 450, kd, 'SHIDOU', 'ATACANTE', { w: 150 });
        this.fedxCard(ctx, c.rin, 810, 450, kd, 'RIN', 'ATACANTE', { w: 150 });
        const zk = seg(t, 172, 184);
        if (zk > 0) {
          ctx.save();
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 14;
          const zz = [[600, 390], [652, 430], [628, 450], [680, 510]];
          ctx.beginPath();
          zz.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.globalAlpha = zk;
          ctx.stroke();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 7;
          ctx.stroke();
          ctx.restore();
          this.cineImpactText(ctx, 'NÃO JOGAM JUNTOS', 640, top + 214, 34, '#fca5a5', zk, 600);
        }
        this.fedxStampMark(ctx, 470, 470, 'FORA', -0.2, seg(t, 214, 220), '#dc2626', 50);
      }
      this.cineSfx(S, 172, 'raio', () => window.SFX?.tackle?.());
      this.cineSfx(S, 214, 'fora', () => window.SFX?.kick?.(0.9));
    },

    // PLANO 3 — a sala da Sub-20: o Sae e a condição
    fedxCut2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const k = easeIO(t / 340);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, 680, k), y: 360, zoom: lerp(1.04, 1.12, k), shake: 0.35 });
      ctx.drawImage(this.finBg('fedx_board_w', 1280, 720, this.fedxBoardBgWarm), 0, 0);
      this.cineGlow(ctx, 900, 400, 480, 'rgba(251,146,60,0.2)');
      this.fedxBoard(ctx, c, { dim: 0.42, tint: '30,14,4', rim: '#fdba74' });
      ctx.drawImage(this.finBg('fedx_table', 1280, 720, this.fedxTableLayer), 0, 0);
      ctx.fillStyle = 'rgba(20,10,4,0.35)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      ctx.restore();
      // o Sae em primeiro plano, de pé, frio no meio do calor
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.05, shake: 0.5 });
      this.cineGlow(ctx, 300, 420, 420, 'rgba(94,234,212,0.16)');
      const r = this.fedxBust(ctx, c.sae, 310, 358, 760, {}, true);
      this.wcdEyes(ctx, 310, 358, r.u, { ring: '#2aa198', iris: '#134e4a', half: true, lid: this.finShade(c.sae.skinColor, -0.2), look: t > 200 ? 1 : 0 });
      ctx.restore();
      // painel: os olhos do Sae
      const kE = ease(seg(t, 96, 110)) * (1 - ease(seg(t, 182, 194)));
      if (kE > 0) {
        this.finPanel(ctx, [[640, top + 16], [W - 18, top + 16], [W - 18, 300], [620, 310]], () => {
          ctx.fillStyle = '#04100f';
          ctx.fillRect(600, top, 700, 240);
          const ey = 214;
          const U = this.wcdEyeBand(ctx, c.sae, 960, ey, 760, {});
          this.wcdEyes(ctx, 960, ey, U, { ring: '#5eead4', iris: '#0f766e', half: true, lid: this.finShade(c.sae.skinColor, -0.2) });
          this.rincStamp(ctx, 'COM UMA CONDIÇÃO...', 960, 290, 30, '#ccfbf1', t, 112, 2, 560);
        }, { dx: (1 - kE) * 700 });
      }
      // painel: a ficha do Shidou na mesa → carimbo SUB-20
      const kF = ease(seg(t, 196, 212));
      if (kF > 0) {
        this.finPanel(ctx, [[660, top + 20], [W - 18, top + 30], [W - 18, bot - 18], [640, bot - 30]], () => {
          const hit = 262;
          const sh = t >= hit ? this.cineNoise(S.f * 2.1, 6) * 6 * (1 - seg(t, hit, hit + 18)) : 0;
          ctx.save();
          ctx.translate(sh, sh * 0.4);
          this.cineGradient(ctx, 620, top, 680, bot - top, [[0, '#3a2414'], [1, '#160d06']]);
          this.cineGlow(ctx, 960, top + 120, 300, 'rgba(253,186,116,0.25)');
          this.fedxPaper(ctx, 960, (top + bot) / 2, 400, 410, -0.04, 'CONVOCAÇÃO • SUB-20', [null, null, 'ATACANTE • 99', 'RYUSEI SHIDOU', null], {
            titleSize: 22,
            extra: (g, w, h) => {
              g.fillStyle = '#cbd5e1';
              g.fillRect(w / 2 - 152, -h / 2 + 100, 132, 132);
              g.fillStyle = '#3b0a24';
              g.fillRect(w / 2 - 148, -h / 2 + 104, 124, 124);
              this.finCrop(g, c.shidou, {}, 9, -4, 18, 18, w / 2 - 148, -h / 2 + 104, 124, 124);
            }
          });
          this.fedxStampMark(ctx, 930, bot - 110, 'SUB-20', -0.14, seg(t, hit, hit + 6), '#1d4ed8', 50);
          this.fedxStamper(ctx, 930, bot - 110, t, hit, 0.9);
          ctx.restore();
          if (t >= hit) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, hit, hit + 10)), '#dbeafe');
        }, { dx: (1 - kF) * 700 });
      }
      this.finKicker(ctx, 40, top + 30, 'SEDE DA JFU • SALA DA SUB-20', seg(t, 6, 46), '#fb923c');
      this.finKicker(ctx, 40, top + 58, 'SAE ITOSHI • VOLTOU DA ESPANHA', seg(t, 30, 78), SAE_C);
      this.cineSfx(S, 262, 'sub20', () => window.SFX?.tackle?.());
    },

    // PLANO 4 — o Shidou com a camisa da Sub-20, saindo do túnel, de frente para vocês
    fedxCut3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const cut = 160;
      if (t < cut) {
        const k = easeIO(t / cut);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1.0, 1.08, k), shake: 0.6 });
        this.finTunnel(ctx, W, H, t);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.cineGlow(ctx, 640, 340, 520, 'rgba(236,72,153,0.22)');
        ctx.restore();
        // o Sae e o Aiku encostados nas paredes do túnel, esperando por ele
        this.finRim(ctx, c.sae, 400, 560, 250, { dim: 0.55, dimTint: '8,10,30' }, '#f9a8d4', [1], 2);
        this.finRim(ctx, c.aiku, 880, 560, 250, { dim: 0.55, dimTint: '8,10,30' }, '#bae6fd', [-1], 2);
        const wk = easeIO(seg(t, 0, cut));
        const feet = lerp(470, 700, wk);
        const size = lerp(190, 470, wk);
        this.wcdAura(ctx, 640, feet, size, t, 0.6 * wk + 0.2, ['#831843', '#ec4899', '#fbcfe8']);
        // sai do túnel vindo de frente pra câmera (view 'front' nos bonecos novos)
        this.finRim(ctx, c.shidouU20, 640, feet, size, { animState: 'run', view: 'front', frame: WALKF(S.f, 6), dim: 0.25, dimTint: '20,4,14' }, '#f9a8d4', [-1, 1], 2);
        ctx.restore();
        this.finKicker(ctx, 40, top + 30, 'DIAS DEPOIS • TÚNEL DO ESTÁDIO NACIONAL', seg(t, 10, 50), '#f472b6');
        this.finKicker(ctx, 40, top + 58, 'SUB-20 DO JAPÃO', seg(t, 36, 84), '#e2e8f0');
        return;
      }
      // o close: a camisa da Sub-20, o sorriso doido
      const u = t - cut;
      const k = easeIO(u / 160);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#14020c'], [1, '#2a0518']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.07, rot: 0.025, shake: 1 + (u < 20 ? 5 * (1 - seg(u, 0, 20)) : 0) });
      this.foxcRays(ctx, 640, 330, 100, 900, 56, '#f9a8d4', 0.1, u * 0.004, 0.03);
      const size = 760;
      const x = 640;
      const eyeY = 290;
      const uu = size / 36;
      const feet = eyeY - SPRITE_MAPY(10.1) * uu + size * 0.87;
      this.wcdAura(ctx, x, feet, size, t, 1, ['#831843', '#ec4899', '#fbcfe8']);
      const r = this.fedxBust(ctx, c.shidouU20, x, eyeY, size, {});
      this.wcdEyes(ctx, x, eyeY, r.u, { ring: '#ec4899', iris: '#831843', tiny: true, look: [0, 1, 0, -1][Math.floor(u / 4) % 4] });
      this.fedxLaughMouth(ctx, x, r.top, r.u, 0.5 + 0.5 * Math.abs(Math.sin(u * 0.3)), null);
      ctx.restore();
      this.cineImpactText(ctx, 'INIMIGO.', 1030, bot - 90, 84, '#f472b6', seg(u, 90, 100), 420, -0.05);
      this.rincStamp(ctx, 'SUB-20', 230, top + 80, 64, '#f8fafc', u, 10, 3);
      if (u >= 0) this.cineFlash(ctx, W, H, 0.4 * (1 - seg(u, 0, 10)), '#fbcfe8');
      if (u >= 90) this.cineFlash(ctx, W, H, 0.25 * (1 - seg(u, 90, 100)), '#fbcfe8');
      this.cineSfx(S, cut, 'close', () => window.SFX?.kick?.(1));
      this.cineSfx(S, cut + 90, 'inimigo', () => window.SFX?.tackle?.());
    },

    // PLANO 5 — os irmãos: os olhos do Rin, os olhos do Sae → o Rin olhando para o outro lado
    fedxCut4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.fedxCast();
      const cut = 150;
      if (t < cut) {
        ctx.fillStyle = '#020507';
        ctx.fillRect(0, 0, W, H);
        const mid = (top + bot) / 2;
        const kA = ease(seg(t, 0, 16));
        this.finPanel(ctx, [[16, top + 14], [W - 16, top + 14], [W - 16, mid - 10], [16, mid + 4]], () => {
          this.cineGradient(ctx, 0, top, W, mid - top, [[0, '#021a1f'], [1, '#01090c']]);
          const ey = top + 140;
          const U = this.wcdEyeBand(ctx, c.rin, 640, ey, 1260, { dim: 0.2, dimTint: '0,24,30' });
          this.wcdEyes(ctx, 640, ey, U, { ring: '#22d3ee', iris: '#0f766e', angry: true, look: 1, line: '#010409' });
          this.finKicker(ctx, 40, top + 40, 'RIN ITOSHI • BLUE LOCK', seg(t, 10, 40), RIN_C);
        }, { dx: (1 - kA) * -W });
        const kB = ease(seg(t, 40, 56));
        if (kB > 0) {
          this.finPanel(ctx, [[16, mid + 18], [W - 16, mid + 4], [W - 16, bot - 14], [16, bot - 14]], () => {
            this.cineGradient(ctx, 0, mid, W, bot - mid, [[0, '#1f0a14'], [1, '#0b0408']]);
            const ey = mid + 136;
            const U = this.wcdEyeBand(ctx, c.sae, 640, ey, 1260, { dim: 0.15, dimTint: '30,6,16' });
            this.wcdEyes(ctx, 640, ey, U, { ring: '#5eead4', iris: '#0f766e', half: true, lid: this.finShade(c.sae.skinColor, -0.2), look: -1 });
            this.finKicker(ctx, W - 40, bot - 40, 'SAE ITOSHI • SUB-20', seg(t, 50, 80), SAE_C, 'right');
          }, { dx: (1 - kB) * W });
        }
        return;
      }
      // o Rin, de costas, olhando o irmão do outro lado do campo
      const u = t - cut;
      const k = easeIO(u / 150);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(650, 700, k), y: lerp(360, 350, k), zoom: lerp(1.1, 1.18, k), shake: 0.4 });
      ctx.drawImage(this.finBg('wcd_arena', 1280, 720, this.wcdArenaBg), 0, 0);
      ctx.fillStyle = 'rgba(2,4,10,0.4)';
      ctx.fillRect(-200, -200, W + 400, H + 400);
      // a luz rosa do lado da Sub-20, a ciano do lado do Blue Lock
      this.cineGlow(ctx, 960, 380, 380, 'rgba(244,114,182,0.22)');
      this.cineGlow(ctx, 300, 420, 420, 'rgba(34,211,238,0.14)');
      this.cineShafts(ctx, 960, 120, Math.PI / 2, 420, 0.5, 5, '251,207,232', 0.06, t);
      [[c.aiku, 862, 168], [c.sae, 968, 182], [c.shidouU20, 1074, 172]].forEach(([ch, x, s]) => {
        ctx.save();
        ctx.translate(x, 476);
        ctx.scale(1, 0.18);
        this.cineGlow(ctx, 0, 0, s * 0.5, 'rgba(0,0,0,0.6)');
        ctx.restore();
        this.finRim(ctx, ch, x, 476, s, { dim: 0.15, dimTint: '10,6,20' }, ch === c.sae ? '#f9a8d4' : '#e2e8f0', [-1, 1], 1);
      });
      ctx.restore();
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.03, shake: 0.7 });
      this.cineGlow(ctx, 300, 430, 300, 'rgba(34,211,238,0.2)');
      this.finRim(ctx, c.rin, 300, bot + 190, 560, { facing: 'back', dim: 0.4, dimTint: '0,12,16' }, '#22d3ee', [-1, 1], 4);
      ctx.restore();
      const tk = seg(u, 64, 100);
      if (tk > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, tk * 2);
        this.foxcGrad(ctx, 0, bot - 220, W, 220, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.85)']]);
        ctx.restore();
      }
      this.cineTitleCard(ctx, W, bot - 96, tk, { kicker: 'BLUE LOCK x SUB-20', title: 'IRMÃO CONTRA IRMÃO', sub: '', color: RIN_C });
      this.cineSfx(S, cut + 64, 'titulo', () => window.SFX?.kick?.(0.8));
    }
  });

  // ==========================================================================
  // AQUECIMENTO: "ensaios" de cada plano num canvas minúsculo (montam de antemão os
  // cenários, brilhos e bonecos guardados), um por quadro durante o plano 1
  // ==========================================================================
  const dry = (scene, phase, name, t) =>
    function () {
      const def = this.CINE[scene];
      if (!this._fedxDryCv) {
        this._fedxDryCv = document.createElement('canvas');
        this._fedxDryCv.width = 64;
        this._fedxDryCv.height = 36;
      }
      const g = this._fedxDryCv.getContext('2d');
      const top = Math.round(720 * (def.letterbox ?? 0.12));
      const dur = def.phases[phase];
      const S = { W: 1280, H: 720, t, phase, dur, p: t / dur, f: t + phase * 100, top, bot: 720 - top, stageH: 720 - top * 2 };
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
  const bg = (key, fn) =>
    function () {
      this.finBg(key, 1280, 720, this[fn]);
    };
  const spr = (who, o, base = 180) =>
    function () {
      this.fedxEntry(this.fedxCast()[who], base, o);
    };
  const walk4 = (who, o, base = 180) => [0, 1, 2, 3].map((i) => spr(who, Object.assign({}, o, { animState: 'run', frame: 1 + i * 4 }), base));
  const plan = (scene, phase, name, ts) => ts.map((t) => dry(scene, phase, name, t));

  const DF = 'ego_federation';
  const warmFed = [
    bg('fedx_table', 'fedxTableLayer'),
    ...plan(DF, 0, 'fedxFed0', [10, 200]),
    spr('pres', { dim: 0.1, dimTint: '8,14,30' }),
    spr('pres', { dim: 0.1, dimTint: '8,14,30', rim: '#bfdbfe', rimSides: [-1, 1], rimD: 1 }),
    ...plan(DF, 1, 'fedxFed1', [20, 130, 190, 230]),
    bg('fedx_door', 'fedxDoorBg'),
    ...plan(DF, 2, 'fedxFed2', [20, 80, 160, 260]),
    spr('ego', { dim: 0.12, dimTint: '2,14,22' }),
    ...plan(DF, 3, 'fedxFed3', [40, 130, 175, 220, 300]),
    ...plan(DF, 4, 'fedxFed4', [30, 80, 150]),
    bg('fedx_hall', 'fedxHallBg'),
    ...walk4('ego', { dim: 0.2, dimTint: '6,12,26' }),
    ...walk4('anri', { dim: 0.2, dimTint: '6,12,26' }),
    ...plan(DF, 5, 'fedxFed5', [20, 60, 110, 170, 230, 300])
  ];
  // boneco com a luz de recorte já assada (como o finRim/fedxRim montam)
  const rimSpr = (who, o, color, sides, size, d) =>
    function () {
      const base = size >= 180 ? 180 : 36 * Math.ceil(size / 36);
      this.fedxEntry(this.fedxCast()[who], base, Object.assign({}, o, { rim: color, rimSides: sides, rimD: Math.max(1, Math.round((d * base) / size)) }));
    };
  const CARD_IDS = ['gagamaru', 'aryu', 'niko', 'bachira', 'chigiri', 'karasu', 'otoya', 'yukimiya', 'nagi', 'rin', 'you'];
  const FRONT = [['gagamaru', 190], ['aryu', 190], ['karasu', 190], ['niko', 190], ['otoya', 190], ['yukimiya', 240], ['chigiri', 240], ['nagi', 240], ['bachira', 240], ['you', 290], ['rin', 290]];
  const DE = 'bl_eleven';
  const warmEle = [
    bg('fedx_tac', 'fedxTacBg'),
    ...CARD_IDS.map((id) => spr(id, {})),
    ...plan(DE, 0, 'fedxEle0', [20, 200]),
    ...plan(DE, 1, 'fedxEle1', [60, 200, 300]),
    ...plan(DE, 2, 'fedxEle2', [100, 280]),
    ...plan(DE, 3, 'fedxEle3', [120, 170, 240]),
    ...plan(DE, 4, 'fedxEle4', [40, 180, 240]),
    bg('fedx_front', 'fedxFrontBg'),
    ...FRONT.map(([id, size]) => rimSpr(id, { dim: 0.32, dimTint: '0,26,40' }, '#67e8f9', [-1, 1], size, 2)),
    rimSpr('shidou', { dim: 0.72, dimTint: '14,2,10' }, '#f472b6', [1], 300, 2),
    ...plan(DE, 5, 'fedxEle5', [40, 200])
  ];
  const DS = 'shidou_cut';
  const warmCut = [
    ...plan(DS, 0, 'fedxCut0', [60, 160]),
    ...plan(DS, 1, 'fedxCut1', [40, 200]),
    bg('fedx_board_w', 'fedxBoardBgWarm'),
    bg('fedx_table', 'fedxTableLayer'),
    ...SEATS.map(([who, , size]) => rimSpr(who, { dim: 0.42, dimTint: '30,14,4' }, '#fdba74', [-1, 1], size, 2)),
    ...plan(DS, 2, 'fedxCut2', [40, 140, 240]),
    ...[0, 1, 2, 3].map((i) => rimSpr('shidouU20', { animState: 'run', view: 'front', frame: 1 + i * 4, dim: 0.25, dimTint: '20,4,14' }, '#f9a8d4', [-1, 1], 300, 2)),
    ...[0, 1, 2, 3].map((i) => rimSpr('shidouU20', { animState: 'run', view: 'front', frame: 1 + i * 4, dim: 0.25, dimTint: '20,4,14' }, '#f9a8d4', [-1, 1], 190, 2)),
    ...plan(DS, 3, 'fedxCut3', [20, 60, 100, 140, 200]),
    bg('wcd_arena', 'wcdArenaBg'),
    ...plan(DS, 4, 'fedxCut4', [60, 200])
  ];

  // ==========================================================================
  // REGISTRO
  // ==========================================================================
  // Pré-montagem do 1º plano: nos primeiros quadros a tela fica preta e cada quadro monta
  // UMA peça pesada (cenário, boneco com luz de recorte); depois a imagem sobe do preto.
  // Assim a cena não abre com uma travada de 300 ms.
  const crowdSpr = (id, tint, rim, d) =>
    function () {
      this.finSprEntry(this.fedxCast()[id], 180, { facing: 'back', tint, rim, rimSides: [-1, 1], rimD: d });
    };
  const seatSpr = (who, size) =>
    function () {
      const base = size >= 180 ? 180 : 36 * Math.ceil(size / 36);
      this.fedxEntry(this.fedxCast()[who], base, { dim: 0.16, dimTint: '8,14,30', rim: '#93c5fd', rimSides: [-1, 1], rimD: Math.max(1, Math.round((2 * base) / size)) });
    };
  const PRE = {
    ego_federation: [bg('fedx_board', 'fedxBoardBg'), bg('fedx_table', 'fedxTableLayer'), ...SEATS.map(([who, , size]) => seatSpr(who, size))],
    bl_eleven: [
      bg('fedx_room', 'fedxRoomBg'),
      function () {
        this.finEgoScreen(document.createElement('canvas').getContext('2d'), 0, 0, SCR.w, SCR.h, 0, {});
      },
      ...[['gagamaru', 0], ['aryu', 0], ['niko', 0], ['karasu', 0], ['shidou', 0], ['yukimiya', 1], ['otoya', 1], ['nagi', 1], ['chigiri', 1], ['bachira', 2], ['you', 2], ['rin', 2]].map(([id, ri]) =>
        crowdSpr(id, ['#0d1a26', '#08121c', '#03070d'][ri], id === 'shidou' ? '#f9a8d4' : '#67e8f9', Math.max(1, Math.round(([2, 2, 3][ri] * 180) / [190, 250, 350][ri])))
      )
    ],
    shidou_cut: [
      bg('fedx_room', 'fedxRoomBg'),
      function () {
        this.fedxListScreen(document.createElement('canvas').getContext('2d'), 0, 0, SCR.w, SCR.h, 0);
      },
      function () {
        this.fedxBustEntry(this.fedxCast().shidouMad, {});
      },
      function () {
        this.fedxBustEntry(this.fedxCast().shidou, {});
      }
    ]
  };
  CE.fedxWarmLists = { ego_federation: warmFed, bl_eleven: warmEle, shidou_cut: warmCut };
  const draw = (fns, warm, pre) =>
    function (ctx, S) {
      if (S.phase === 0) {
        const run = `${this.sakugaType}|${this._cineRun}`;
        if (this._fedxPreRun !== run) {
          this._fedxPreRun = run;
          this._fedxPreIdx = 0;
          this._fedxPreDone = S.t < 30 ? null : -999;
        }
        if (this._fedxPreDone === null) {
          if (this._fedxPreIdx < pre.length) {
            pre[this._fedxPreIdx++].call(this);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, S.W, S.H);
            return;
          }
          this._fedxPreDone = S.t;
        }
      }
      fns[S.phase].call(this, ctx, S);
      this.fedxWarm(S, warm);
      this.foxcGrain(ctx, S.W, S.H, 0.06);
      // a imagem sobe do preto depois da pré-montagem
      if (S.phase === 0 && this._fedxPreDone > -999) {
        const a = 1 - seg(S.t, this._fedxPreDone, this._fedxPreDone + 14);
        if (a > 0) this.cineFlash(ctx, S.W, S.H, a, '#000000');
      }
    };

  CE.registerCine('ego_federation', {
    phases: [225, 280, 300, 350, 210, 325],
    music: 'mystery',
    title: '🏛️ A APOSTA DO EGO',
    tags: ['PLANO 1 • A SALA DO CONSELHO', 'PLANO 2 • PROJETO DE CRIANÇAS', 'PLANO 3 • SEM CONVITE', 'PLANO 4 • A APOSTA', 'PLANO 5 • APROVADO', 'PLANO 6 • O CORREDOR'],
    subs: [
      [{ from: 12, to: 222, who: 'NARRADOR', text: 'Sede da JFU. Pauta: fechar o Blue Lock.', color: NARR_C }],
      [
        { from: 8, to: 178, who: 'PRESIDENTE', text: '"Projeto de crianças. Acabou!"', color: PRES_C },
        { from: 178, to: 272, who: 'CARTOLAS', text: '"Hahaha!"', color: CART_C }
      ],
      [
        { from: 56, to: 216, who: 'PRESIDENTE', text: '"...Ego? Quem te convidou?"', color: PRES_C },
        { from: 216, to: 298, who: 'EGO', text: '"Ninguém."', color: EGO_C }
      ],
      [
        { from: 14, to: 162, who: 'EGO', text: '"Blue Lock x Sub-20. Ao vivo."', color: EGO_C },
        { from: 162, to: 349, who: 'EGO', text: '"Perdeu, acabou. Ganhou, vira a seleção."', color: EGO_C }
      ],
      [{ from: 8, to: 206, who: 'PRESIDENTE', text: '"Fechado. Vai ser o funeral de vocês."', color: PRES_C }],
      [
        { from: 6, to: 168, who: 'ANRI', text: '"A Sub-20 topou. O Aiku aceitou!"', color: ANRI_C },
        { from: 168, to: 323, who: 'EGO', text: '"Velhos. Acham que já ganharam."', color: EGO_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw([CE.fedxFed0, CE.fedxFed1, CE.fedxFed2, CE.fedxFed3, CE.fedxFed4, CE.fedxFed5], warmFed, PRE.ego_federation)
  });

  CE.registerCine('bl_eleven', {
    phases: [230, 310, 300, 260, 270, 280],
    music: 'u20',
    title: '📺 O BLUE LOCK ELEVEN',
    tags: ['PLANO 1 • O TELÃO', 'PLANO 2 • A DEFESA', 'PLANO 3 • O ATAQUE', 'PLANO 4 • O CENTRO', 'PLANO 5 • REAÇÕES', 'PLANO 6 • O SILÊNCIO'],
    get subs() {
      const nm = CE.cinePlayerName().toLowerCase().replace(/(^|\s)\S/g, (ch) => ch.toUpperCase());
      return [
        [{ from: 20, to: 228, who: 'EGO', text: '"Os onze que vão enfrentar a Sub-20."', color: EGO_C }],
        [
          { from: 16, to: 146, who: 'EGO', text: '"Gagamaru. Aryu. Niko."', color: EGO_C },
          { from: 146, to: 306, who: 'EGO', text: '"Bachira. Chigiri. Karasu."', color: EGO_C }
        ],
        [
          { from: 10, to: 184, who: 'EGO', text: '"Otoya. Yukimiya. Na frente: Nagi..."', color: EGO_C },
          { from: 186, to: 298, who: 'EGO', text: '"...e Rin Itoshi."', color: EGO_C }
        ],
        [
          { from: 6, to: 139, who: 'EGO', text: '"E no centro do ataque..."', color: EGO_C },
          { from: 140, to: 259, who: 'EGO', text: `"...${nm}."`, color: EGO_C }
        ],
        [
          { from: 6, to: 160, who: 'BACHIRA', text: '"Hahaha! Vai ser divertido!"', color: BACH_C },
          { from: 160, to: 268, who: 'NAGI', text: '"...Que saco."', color: NAGI_C }
        ],
        [
          { from: 10, to: 150, who: 'NARRADOR', text: 'Onze nomes. Faltava um.', color: NARR_C },
          { from: 152, to: 278, who: 'CHIGIRI', text: '"...Cadê o Shidou?"', color: CHI_C }
        ]
      ];
    },
    grain: 0,
    vignette: 0.6,
    draw: draw([CE.fedxEle0, CE.fedxEle1, CE.fedxEle2, CE.fedxEle3, CE.fedxEle4, CE.fedxEle5], warmEle, PRE.bl_eleven)
  });

  CE.registerCine('shidou_cut', {
    phases: [270, 280, 340, 320, 300],
    music: 'tension',
    title: '💣 O CORTE DO SHIDOU',
    tags: ['PLANO 1 • FORA DA LISTA', 'PLANO 2 • UM RISCO', 'PLANO 3 • A CONDIÇÃO', 'PLANO 4 • O INIMIGO', 'PLANO 5 • IRMÃOS'],
    subs: [
      [
        { from: 4, to: 128, who: 'SHIDOU', text: '"Hah?! Eu tô fora?!"', color: SHIDOU_C },
        { from: 130, to: 268, who: 'SHIDOU', text: '"Isso é piada, né, Ego?"', color: SHIDOU_C }
      ],
      [
        { from: 10, to: 144, who: 'EGO', text: '"Você não joga com o Rin."', color: EGO_C },
        { from: 146, to: 278, who: 'EGO', text: '"Você é um risco. Fora."', color: EGO_C }
      ],
      [
        { from: 14, to: 185, who: 'SAE ITOSHI', text: '"Eu jogo. Com uma condição..."', color: SAE_C },
        { from: 186, to: 340, who: 'SAE ITOSHI', text: '"...o Shidou vem comigo."', color: SAE_C }
      ],
      [
        { from: 14, to: 180, who: 'SHIDOU', text: '"Vou explodir vocês, Blue Lock!"', color: SHIDOU_C },
        { from: 182, to: 318, who: 'NARRADOR', text: 'Agora ele é o inimigo.', color: NARR_C }
      ],
      [
        { from: 50, to: 156, who: 'RIN ITOSHI', text: '"...Irmão."', color: RIN_C },
        { from: 160, to: 298, who: 'NARRADOR', text: 'Irmão contra irmão.', color: NARR_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw([CE.fedxCut0, CE.fedxCut1, CE.fedxCut2, CE.fedxCut3, CE.fedxCut4], warmCut, PRE.shidou_cut)
  });
})();
