// ============================================================================
// A NOITE DA BOLA DE OURO e A LIÇÃO DO SAE (cine_bola_ouro) — ver js/cine_kit.js
//   bola_de_ouro_discurso • Paris: o troféu → você sobe ao palco → o discurso (o nº 299,
//                           "sem talento") → devorei um por um, ainda tenho fome → a plateia
//                           de pé → a última fileira: o Rin sozinho, sem aplaudir → ele sai
//                           pela porta dos fundos
//   rin_sae_licao         • o corredor do hotel: o Sae bloqueia o Rin ("garoto chorão") →
//                           uma da manhã, o Rin chutando sozinho na chuva → o Sae chega:
//                           "joga comigo" → 10 x 0 → "transforma isso em fome" → o reflexo
//                           na poça, o sorriso → o olho do destruidor
// Usa os bonecos guardados da cine_final (finSpr/finRim/finHead/finCrop/finGoldBall/finHallBg),
// o rincStamp/rincShade/rincSeat/rincPops da cine_rin, o wcdEyes/wcdEyeBand/wcdAura/wcdFistCv
// da cine_wildcard, o zselKneel da cine_selecao1, o ptdBall/ptdRays/ptdCloseBg/ptdChip/ptdSpeed
// da cine_partida e o foxcGrad/foxcGrain da cine_fox. Helpers daqui têm o prefixo "bdor".
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
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  // Quadros da caminhada (4 bonecos guardados; o 0 é a piscada)
  const WALKF = (f, sp = 6) => 1 + (Math.floor(f / sp) % 4) * 4;

  const YOU_C = '#00f5d4';
  const RIN_C = '#2dd4bf';
  const SAE_C = '#fb7185';
  const NARR_C = '#94a3b8';
  const HOST_C = '#fde68a';
  const GOLD = '#facc15';
  // roupa de treino do Rin (escura com faixas verde-água: lê bem na chuva)
  const KIT_TR = { jerseyPrimary: '#0b1f24', jerseySecondary: '#14b8a6' };

  // flashes dos fotógrafos (pequenos, nunca a tela toda)
  const POPS0 = [[150, 560, 10], [300, 610, 9], [470, 580, 8], [820, 600, 9], [990, 570, 11], [1130, 540, 9], [80, 470, 8], [1210, 460, 8], [640, 620, 7]];
  const POPS1 = [[120, 600, 10], [260, 570, 8], [430, 615, 9], [760, 590, 8], [920, 612, 10], [1080, 580, 9], [1220, 600, 8]];

  // ==========================================================================
  // HELPERS (prefixo bdor)
  // ==========================================================================
  Object.assign(CE, {
    bdorCast() {
      const nm = window.App?.state?.profile?.name || '';
      const f = this.sakugaFrame;
      const m = this._bdorCastC;
      if (m && m.f === f && m.nm === nm) return m.c;
      const c = {
        you: this.cineYou({ outfit: 'suit' }),
        youBL: this.cineYou(Object.assign({}, this.KITS.blueLock)),
        rin: this.cineChar('rin', { outfit: 'suit', angry: true }),
        rinTr: this.cineChar('rin', Object.assign({ angry: true }, KIT_TR)),
        // (a boca não entra na chave do boneco guardado: o nome diferente separa as versões)
        rinGrin: this.cineChar('rin', Object.assign({ angry: true, mouth: 'grin', name: 'Rin Itoshi • sorriso' }, KIT_TR)),
        rinK: this.cineChar('rin', { angry: true }),
        sae: this.cineChar('sae', { outfit: 'suit' }),
        barou: this.cineChar('barou', { angry: true }),
        nagi: this.cineChar('nagi'),
        shidou: this.cineChar('shidou'),
        kaiser: this.cineChar('kaiser')
      };
      this._bdorCastC = { f, nm, c };
      return c;
    },

    // ------------------------------------------------------------------ bonecos
    // Boneco guardado com retoques (braços cruzados), escurecido e com luz de recorte, tudo
    // assado num canvas só (base 180, mesmo enquadramento do finSprEntry)
    bdorEntry(char, o = {}) {
      const plain = { facing: o.facing, animState: o.animState, frame: o.frame, flipX: o.flipX, shirtNumber: o.shirtNumber };
      const src = this.finSprEntry(char, 180, plain);
      const sides = o.rimSides || [-1, 1];
      const key = `bdor|${src.key}|${o.cross ? 1 : 0}|${o.tint || ''}|${o.dim || 0}|${o.dimTint || ''}|${o.rim || ''}|${sides.join(',')}|${o.rimD || 2}`;
      const cache = this._bdorSpr || (this._bdorSpr = new Map());
      let e = cache.get(key);
      if (e) return e;
      const w = src.cv.width;
      const h = src.cv.height;
      const body = document.createElement('canvas');
      body.width = w;
      body.height = h;
      const g = body.getContext('2d');
      g.drawImage(src.cv, 0, 0);
      if (o.cross) this.bdorCrossArms(g, src.pad, char);
      if (o.tint || o.dim) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = o.tint || `rgba(${o.dimTint || '0,0,0'},${o.dim})`;
        g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = 'source-over';
      }
      let cv = body;
      if (o.rim) {
        const sil = document.createElement('canvas');
        sil.width = w;
        sil.height = h;
        const sg = sil.getContext('2d');
        sg.drawImage(body, 0, 0);
        sg.globalCompositeOperation = 'source-in';
        sg.fillStyle = o.rim;
        sg.fillRect(0, 0, w, h);
        cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const cg = cv.getContext('2d');
        const d = o.rimD || 2;
        sides.forEach((s) => cg.drawImage(sil, s * d, -Math.round(d * 0.35)));
        cg.drawImage(body, 0, 0);
      }
      e = { cv, pad: src.pad, base: 180, key };
      if (cache.size > 40) cache.delete(cache.keys().next().value);
      cache.set(key, e);
      return e;
    },
    bdorSpr(ctx, char, x, feet, size, o = {}) {
      const e = this.bdorEntry(char, o);
      const k = size / e.base;
      ctx.save();
      ctx.imageSmoothingEnabled = size < e.base;
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.drawImage(e.cv, x - size / 2 - e.pad * k, feet - size * 0.87 - e.pad * k, e.cv.width * k, e.cv.height * k);
      ctx.restore();
    },
    bdorHead(ctx, char, cx, eyeY, size, o = {}) {
      const u = size / 36;
      const top = eyeY - SPRITE_MAPY(10.1) * u;
      const feet = top + size * 0.87;
      this.bdorSpr(ctx, char, cx, feet, size, o);
      return { u, top, feet };
    },
    // Braços cruzados em pixel art: apaga os braços caídos e desenha os antebraços cruzados
    // no peito (em unidades do boneco, 5 px por unidade na base 180)
    bdorCrossArms(g, pad, char) {
      const u = 5;
      const R = (x, y, w, h, c) => {
        g.fillStyle = c;
        g.fillRect(Math.round(pad + x * u), Math.round(pad + y * u), Math.round(w * u), Math.round(h * u));
      };
      g.save();
      g.globalCompositeOperation = 'destination-out';
      R(6.6, 13.4, 4.5, 9.8, '#000');
      R(24.9, 13.4, 4.5, 9.8, '#000');
      g.restore();
      const sl = char.outfit === 'suit' ? '#1a2133' : char.jerseyPrimary || '#0f2942';
      const hi = this.finShade(sl, 0.22);
      const lo = this.finShade(sl, -0.4);
      const ink = '#0a0f1c';
      const skin = char.skinColor || '#f3d1b8';
      R(10.4, 13.8, 0.7, 7.4, ink);
      R(24.9, 13.8, 0.7, 7.4, ink);
      R(9.6, 13.8, 3.2, 5.4, ink);
      R(23.2, 13.8, 3.2, 5.4, ink);
      R(10.0, 14.2, 2.4, 4.6, sl);
      R(23.6, 14.2, 2.4, 4.6, lo);
      R(10.5, 15.8, 15.0, 3.9, ink);
      R(10.9, 16.2, 14.2, 3.1, sl);
      R(10.9, 18.7, 14.2, 0.6, lo);
      R(16.4, 15.8, 9.0, 1.7, ink);
      R(16.8, 16.2, 8.2, 1.1, hi);
      R(12.4, 16.6, 0.5, 2.3, '#e2e8f0');
      R(12.9, 16.8, 1.5, 1.9, skin);
      R(23.0, 16.2, 0.5, 1.1, '#e2e8f0');
      R(21.6, 16.2, 1.4, 1.1, skin);
    },
    // Deitado de costas no chão (cabeça para a esquerda)
    bdorLying(ctx, char, x, groundY, size, o = {}) {
      const u = size / 36;
      ctx.save();
      ctx.translate(x, groundY - 6.5 * u);
      ctx.rotate(-Math.PI / 2);
      if (o.rim) this.finRim(ctx, char, 0, 0, size, Object.assign({}, o, { rim: null }), o.rim, o.rimSides || [-1, 1], o.rimD || 2);
      else this.finSpr(ctx, char, 0, 0, size, o);
      ctx.restore();
      return { u, headX: x - 0.87 * size + SPRITE_MAPY(10.1) * u, y: groundY - 6.5 * u };
    },
    // Mancha de luz achatada no chão
    bdorFloorGlow(ctx, x, y, rx, color, a = 1, flat = 0.26) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, flat);
      this.cineGlow(ctx, 0, 0, rx, color, a);
      ctx.restore();
    },

    // ------------------------------------------------------------------ aquecimento
    // Um "ensaio" por quadro durante o plano 1 (num canvas minúsculo): monta de antemão os
    // cenários, brilhos e bonecos guardados que os próximos planos usam
    bdorWarm(S, list) {
      if (S.phase !== 0 || S.t < 3) return;
      const run = `${this.sakugaType}|${this._cineRun}`;
      if (this._bdorWarmRun !== run) {
        this._bdorWarmRun = run;
        this._bdorWarmIdx = 0;
      }
      if (this._bdorWarmIdx < list.length) list[this._bdorWarmIdx++].call(this);
    },
    bdorDry(scene, phase, name, t) {
      const def = this.CINE[scene];
      if (!this._bdorDryCv) {
        this._bdorDryCv = document.createElement('canvas');
        this._bdorDryCv.width = 64;
        this._bdorDryCv.height = 36;
      }
      const g = this._bdorDryCv.getContext('2d');
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
    },

    // ------------------------------------------------------------------ a gala
    bdorStageBg(g, w, h) {
      this.cineGradient(g, 0, 0, w, h, [[0, '#06030c'], [0.55, '#120a20'], [1, '#05030a']]);
      // o telão dourado do fundo
      const sx = 330;
      const sy = 64;
      const sw = 620;
      const sh = 300;
      g.fillStyle = '#2a1a05';
      g.fillRect(sx - 14, sy - 14, sw + 28, sh + 28);
      this.cineGradient(g, sx, sy, sw, sh, [[0, '#211606'], [1, '#090502']]);
      g.save();
      g.beginPath();
      g.rect(sx, sy, sw, sh);
      g.clip();
      this.ptdRays(g, 640, 190, 520, '#fbbf24', 0.16, 0, 40, 0.03);
      this.cineGlow(g, 640, 190, 260, 'rgba(251,191,36,0.35)');
      g.restore();
      g.strokeStyle = '#ca8a04';
      g.lineWidth = 4;
      g.strokeRect(sx - 7, sy - 7, sw + 14, sh + 14);
      g.strokeStyle = 'rgba(253,230,138,0.5)';
      g.lineWidth = 1.5;
      g.strokeRect(sx - 2, sy - 2, sw + 4, sh + 4);
      this.finGoldBall(g, 640, 172, 58, 0);
      g.font = 'italic 900 38px Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#fde68a';
      g.fillText('BOLA DE OURO', 640, 326);
      // cortinas de veludo dos dois lados
      [0, 1].forEach((side) => {
        const x0 = side ? w - 220 : 0;
        for (let i = 0; i < 11; i++) {
          g.fillStyle = i % 2 ? '#4c0b18' : '#6e1124';
          g.fillRect(x0 + i * 20, 0, 20, 610);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(x0 + i * 20 + 14, 0, 6, 610);
        }
        const gr = g.createLinearGradient(x0, 0, x0 + 220, 0);
        gr.addColorStop(0, side ? 'rgba(5,2,8,0.05)' : 'rgba(5,2,8,0.8)');
        gr.addColorStop(1, side ? 'rgba(5,2,8,0.8)' : 'rgba(5,2,8,0.05)');
        g.fillStyle = gr;
        g.fillRect(x0, 0, 220, 610);
        g.fillStyle = '#a16207';
        g.fillRect(x0, 0, 220, 16);
        g.fillStyle = '#fde68a';
        for (let i = 0; i < 22; i++) g.fillRect(x0 + i * 10 + 3, 16, 3, 7);
      });
      // o palco
      this.cineGradient(g, 0, 470, w, 132, [[0, '#2a1838'], [1, '#160c20']]);
      g.strokeStyle = 'rgba(251,191,36,0.1)';
      g.lineWidth = 2;
      g.beginPath();
      for (let i = -9; i <= 9; i++) {
        g.moveTo(640 + i * 40, 470);
        g.lineTo(640 + i * 150, 602);
      }
      g.stroke();
      g.save();
      g.globalCompositeOperation = 'lighter';
      const rf = g.createLinearGradient(0, 470, 0, 600);
      rf.addColorStop(0, 'rgba(251,191,36,0.16)');
      rf.addColorStop(1, 'rgba(251,191,36,0)');
      g.fillStyle = rf;
      g.fillRect(sx, 470, sw, 130);
      g.restore();
      g.fillStyle = '#ca8a04';
      g.fillRect(0, 600, w, 4);
      this.cineGradient(g, 0, 604, w, h - 604, [[0, '#0d0612'], [1, '#030105']]);
      // degraus do lado esquerdo
      for (let i = 0; i < 3; i++) {
        g.fillStyle = ['#22132e', '#1a0f24', '#120a1a'][i];
        g.fillRect(150 - i * 20, 604 + i * 26, 170 + i * 40, 26);
        g.fillStyle = 'rgba(202,138,4,0.6)';
        g.fillRect(150 - i * 20, 604 + i * 26, 170 + i * 40, 2);
      }
    },

    // Púlpito com o emblema dourado e os dois microfones (micH = altura dos microfones)
    bdorLectern(ctx, x, floorY, s = 1, micH = 26) {
      const h = 112 * s;
      const tw = 74 * s;
      const bw = 58 * s;
      const ty = floorY - h;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#05050a';
      ctx.lineWidth = Math.max(2, 3 * s);
      ctx.beginPath();
      ctx.moveTo(x - 16 * s, ty);
      ctx.quadraticCurveTo(x - 22 * s, ty - micH * 0.6 * s, x - 9 * s, ty - micH * s);
      ctx.moveTo(x + 16 * s, ty);
      ctx.quadraticCurveTo(x + 22 * s, ty - micH * 0.6 * s, x + 9 * s, ty - micH * s);
      ctx.stroke();
      [-1, 1].forEach((sd) => {
        ctx.fillStyle = '#05050a';
        ctx.beginPath();
        ctx.ellipse(x + sd * 8 * s, ty - (micH + 2) * s, 3.4 * s, 4.6 * s, sd * 0.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#374151';
        ctx.beginPath();
        ctx.ellipse(x + sd * 8 * s, ty - (micH + 2.6) * s, 2.4 * s, 3.4 * s, sd * 0.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(253,230,138,0.8)';
        ctx.fillRect(x + sd * 8 * s - 1.4 * s, ty - (micH + 5.2) * s, 1.6 * s, 1.6 * s);
      });
      const gr = ctx.createLinearGradient(x - tw, 0, x + tw, 0);
      gr.addColorStop(0, '#120a06');
      gr.addColorStop(0.45, '#2e1d0d');
      gr.addColorStop(1, '#0a0503');
      ctx.fillStyle = gr;
      poly(ctx, [[x - tw, ty], [x + tw, ty], [x + bw, floorY], [x - bw, floorY]]);
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(x - tw - 4 * s, ty - 6 * s, tw * 2 + 8 * s, 8 * s);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(x - tw - 4 * s, ty - 6 * s, tw * 2 + 8 * s, 2 * s);
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(x, ty + h * 0.4, 18 * s, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, ty + h * 0.4, 11 * s, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(x - 6 * s, ty + h * 0.4 - 6 * s, 3 * s, 3 * s);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(x - 30 * s, ty + h * 0.7, 60 * s, 3 * s);
      ctx.restore();
    },

    // Fileira de silhuetas da plateia (de frente ou de costas), com luz de recorte e mãos
    // batendo palma (clap = fração que aplaude; handDy = altura das mãos)
    bdorHeads(ctx, W, y, s, t, o = {}) {
      const { color = '#030108', rim = null, clap = 0, seed = 1, gap = null, x0 = -60, x1 = W + 60, step = 92, jit = 1, handDy = 4, hand = '#2b1d12' } = o;
      const st = step * s;
      for (let i = 0; x0 + i * st < x1 + st; i++) {
        const x = x0 + i * st + (seed % 2) * st * 0.5 + Math.sin(i * 3.1 + seed) * 10 * s * jit;
        if (gap && x > gap[0] && x < gap[1]) continue;
        const yy = y + Math.sin(i * 1.7 + seed * 2) * 6 * s * jit;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, yy - 30 * s, 21 * s, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x, yy + 22 * s, 42 * s, 30 * s, 0, Math.PI, TAU);
        ctx.fill();
        ctx.fillRect(x - 42 * s, yy + 21 * s, 84 * s, 140 * s);
        if (rim) {
          ctx.strokeStyle = rim;
          ctx.lineWidth = Math.max(1.5, 2 * s);
          ctx.beginPath();
          ctx.arc(x, yy - 30 * s, 21 * s, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        }
        if (clap > 0 && rnd(i, seed + 7) < clap) {
          const gp = Math.abs(Math.sin(t * 0.3 + i * 1.3)) * 9 * s;
          const hy = yy + handDy * s + Math.sin(i * 2.3) * 4 * s;
          // braços erguidos (da cor da silhueta) até as mãos
          ctx.strokeStyle = color;
          ctx.lineWidth = 8 * s;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x - 30 * s, yy + 12 * s);
          ctx.lineTo(x - gp - 6 * s, hy + 2 * s);
          ctx.moveTo(x + 30 * s, yy + 12 * s);
          ctx.lineTo(x + gp + 6 * s, hy + 2 * s);
          ctx.stroke();
          ctx.fillStyle = hand;
          ctx.fillRect(x - gp - 11 * s, hy - 12 * s, 11 * s, 15 * s);
          ctx.fillRect(x + gp, hy - 12 * s, 11 * s, 15 * s);
          if (rim) {
            ctx.fillStyle = rim;
            ctx.fillRect(x - gp - 11 * s, hy - 12 * s, 11 * s, Math.max(1.5, 2 * s));
            ctx.fillRect(x + gp, hy - 12 * s, 11 * s, Math.max(1.5, 2 * s));
          }
        }
      }
    },
    // Encostos das poltronas de uma fileira (vermelho escuro; o topo fica em y)
    bdorSeats(ctx, W, y, s, light, seed = 1) {
      const st = 96 * s;
      const off = rnd(seed, 9) * st;
      for (let i = -1; -80 + off + i * st < W + 120; i++) {
        const x = -80 + off + i * st;
        ctx.fillStyle = '#1a060e';
        ctx.fillRect(x - 38 * s, y, 76 * s, 70 * s);
        ctx.fillStyle = `rgba(190,18,60,${0.08 + 0.3 * light})`;
        ctx.fillRect(x - 38 * s, y, 76 * s, Math.max(1.5, 3 * s));
      }
    },
    // Fileira da plateia DE FRENTE, de pé, aplaudindo (vista do palco)
    bdorCrowdFront(ctx, W, y, s, t, light, seed, gap = null) {
      const st = 96 * s;
      const off = rnd(seed, 9) * st;
      const body = `rgb(${Math.round(9 + 16 * light)},${Math.round(5 + 9 * light)},${Math.round(13 + 12 * light)})`;
      const arm = `rgb(${Math.round(16 + 22 * light)},${Math.round(9 + 13 * light)},${Math.round(20 + 14 * light)})`;
      const skin = `rgb(${Math.round(34 + 96 * light)},${Math.round(22 + 62 * light)},${Math.round(16 + 36 * light)})`;
      const rim = `rgba(251,191,36,${0.12 + 0.55 * light})`;
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = -1; -80 + off + i * st < W + 120; i++) {
        const x = -80 + off + i * st + (rnd(i, seed) - 0.5) * 22 * s;
        if (gap && x > gap[0] && x < gap[1]) continue;
        const hs = s * (0.9 + rnd(i, seed + 1) * 0.22);
        const yy = y - rnd(i, seed + 2) * 14 * s;
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(x, yy + 26 * hs, 40 * hs, 26 * hs, 0, Math.PI, TAU);
        ctx.fill();
        ctx.fillRect(x - 40 * hs, yy + 25 * hs, 80 * hs, 120 * hs);
        ctx.beginPath();
        ctx.arc(x, yy - 12 * hs, 20 * hs, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(251,191,36,${0.04 + 0.1 * light})`;
        ctx.beginPath();
        ctx.arc(x, yy - 9 * hs, 14 * hs, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = rim;
        ctx.lineWidth = Math.max(1.2, 2 * hs);
        ctx.beginPath();
        ctx.arc(x, yy - 12 * hs, 20 * hs, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        if (rnd(i, seed + 3) < 0.85) {
          const gp = Math.abs(Math.sin(t * 0.3 + i * 1.3 + seed)) * 9 * hs;
          const hy = yy + 20 * hs + Math.sin(i * 2.3) * 4 * hs;
          ctx.strokeStyle = arm;
          ctx.lineWidth = 11 * hs;
          ctx.beginPath();
          ctx.moveTo(x - 32 * hs, yy + 36 * hs);
          ctx.lineTo(x - gp - 7 * hs, hy + 6 * hs);
          ctx.moveTo(x + 32 * hs, yy + 36 * hs);
          ctx.lineTo(x + gp + 7 * hs, hy + 6 * hs);
          ctx.stroke();
          ctx.fillStyle = skin;
          ctx.fillRect(x - gp - 11 * hs, hy - 8 * hs, 11 * hs, 15 * hs);
          ctx.fillRect(x + gp, hy - 8 * hs, 11 * hs, 15 * hs);
          ctx.fillStyle = rim;
          ctx.fillRect(x - gp - 11 * hs, hy - 8 * hs, 11 * hs, Math.max(1, 2 * hs));
          ctx.fillRect(x + gp, hy - 8 * hs, 11 * hs, Math.max(1, 2 * hs));
        }
      }
      ctx.restore();
    },

    // Plateia vista do palco, em perspectiva dos dois lados do corredor (fn por poltrona)
    bdorAisleRows(fn) {
      for (let j = 9; j >= 0; j--) {
        const f = Math.pow(j / 10, 0.8);
        const y = lerp(735, 350, f);
        const s = lerp(1.2, 0.2, f);
        const ah = lerp(250, 44, f) + 30 * s;
        const st = 84 * s;
        for (let i = 0; i < 60; i++) {
          const x = 640 - ah - i * st;
          if (x < -90) break;
          fn(x, y, s, j, i, -1);
        }
        for (let i = 0; i < 60; i++) {
          const x = 640 + ah + i * st;
          if (x > 1370) break;
          fn(x, y, s, j, i, 1);
        }
      }
    },
    bdorAisleBg(g, w, h) {
      g.fillStyle = '#030108';
      g.fillRect(0, 0, w, h);
      // a parede do fundo, com arandelas
      this.cineGradient(g, 0, 80, w, 260, [[0, '#090410'], [1, '#170b1f']]);
      [250, 450, 830, 1030].forEach((x) => {
        this.cineGlow(g, x, 214, 70, 'rgba(251,191,36,0.4)');
        g.fillStyle = '#a16207';
        g.fillRect(x - 4, 208, 8, 14);
      });
      // a porta (a luz é desenhada por quadro) e a placa de saída
      g.fillStyle = '#1c1016';
      g.fillRect(584, 184, 112, 154);
      g.fillStyle = '#052e16';
      g.fillRect(608, 156, 64, 20);
      this.cineGlow(g, 640, 166, 60, 'rgba(74,222,128,0.35)');
      g.font = '900 12px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#4ade80';
      g.fillText('SAÍDA', 640, 167);
      // chão e o tapete do corredor
      this.cineGradient(g, 0, 336, w, h - 336, [[0, '#0b0612'], [1, '#05020a']]);
      const cg = g.createLinearGradient(0, 336, 0, h);
      cg.addColorStop(0, '#2a0812');
      cg.addColorStop(1, '#4a0f1f');
      g.fillStyle = cg;
      poly(g, [[598, 336], [682, 336], [905, h], [375, h]]);
      g.fill();
      g.strokeStyle = 'rgba(251,191,36,0.35)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(598, 336);
      g.lineTo(375, h);
      g.moveTo(682, 336);
      g.lineTo(905, h);
      g.stroke();
      // as poltronas lotadas (silhuetas de frente, com a luz dourada do palco)
      this.bdorAisleRows((x, y, s) => {
        g.fillStyle = '#1a0710';
        g.fillRect(x - 36 * s, y - 8 * s, 72 * s, 60 * s);
        g.fillStyle = 'rgba(190,18,60,0.3)';
        g.fillRect(x - 36 * s, y - 8 * s, 72 * s, Math.max(1, 3 * s));
        g.fillStyle = '#07030a';
        g.beginPath();
        g.arc(x, y - 34 * s, 19 * s, 0, TAU);
        g.fill();
        g.beginPath();
        g.ellipse(x, y + 10 * s, 38 * s, 26 * s, 0, Math.PI, TAU);
        g.fill();
        g.fillRect(x - 38 * s, y + 9 * s, 76 * s, 44 * s);
        g.strokeStyle = 'rgba(251,191,36,0.45)';
        g.lineWidth = Math.max(1, 2 * s);
        g.beginPath();
        g.arc(x, y - 34 * s, 19 * s, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
      });
    },

    // Garra ciano rasgando o painel (devorado)
    bdorClaw(ctx, cx, cy, k, w, color = YOU_C) {
      if (k <= 0) return;
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        const kk = ease(clamp(k * 1.5 - (i + 1) * 0.2));
        if (kk <= 0) continue;
        const x0 = cx + i * w * 0.2 - w * 0.36;
        const y0 = cy - w * 0.62;
        const x1 = x0 + w * 0.7 * kk;
        const y1 = y0 + w * 1.3 * kk;
        [['#020617', 17], [color, 10], ['#ecfeff', 3]].forEach(([c, lw]) => {
          ctx.strokeStyle = c;
          ctx.lineWidth = lw;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        });
      }
      ctx.restore();
    },

    // ------------------------------------------------------------------ o campo à noite
    bdorPitchBg(g, w, h) {
      this.cineGradient(g, 0, 0, w, 300, [[0, '#010208'], [1, '#0b1630']]);
      g.fillStyle = 'rgba(30,41,59,0.45)';
      for (let i = 0; i < 8; i++) {
        g.beginPath();
        g.ellipse(rnd(i, 41) * w, 20 + rnd(i, 42) * 110, 160 + rnd(i, 43) * 180, 20 + rnd(i, 44) * 22, 0, 0, TAU);
        g.fill();
      }
      // a arquibancada vazia
      g.fillStyle = '#040814';
      g.fillRect(0, 182, w, 118);
      for (let r = 0; r < 9; r++) {
        const y = 188 + r * 11.5;
        g.fillStyle = r % 2 ? '#0a1328' : '#08101f';
        g.fillRect(0, y, w, 9);
        g.fillStyle = r % 2 ? '#14244a' : '#111f40';
        for (let x = (r % 2) * 6; x < w; x += 12) g.fillRect(x, y + 2, 7, 6);
      }
      g.fillStyle = '#02040b';
      g.fillRect(0, 176, w, 8);
      // placas de publicidade apagadas
      g.fillStyle = '#060c1c';
      g.fillRect(0, 292, w, 18);
      g.fillStyle = 'rgba(45,212,191,0.3)';
      for (let x = 8; x < w; x += 160) g.fillRect(x, 298, 110, 5);
      // as torres de refletor
      [150, 1130].forEach((x) => {
        g.fillStyle = '#050a16';
        g.fillRect(x - 5, 60, 10, 240);
        g.fillStyle = '#0b1324';
        g.fillRect(x - 52, 20, 104, 44);
        g.fillStyle = '#e0f2fe';
        for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) g.fillRect(x - 47 + c * 12, 25 + r * 12, 8, 8);
        this.cineGlow(g, x, 42, 210, 'rgba(224,242,254,0.55)');
      });
      // o gramado molhado
      for (let i = 0; i < 12; i++) {
        const y0 = 310 + (h - 310) * Math.pow(i / 12, 1.5);
        const y1 = 310 + (h - 310) * Math.pow((i + 1) / 12, 1.5);
        g.fillStyle = i % 2 ? '#0a2c1d' : '#0c3322';
        g.fillRect(0, y0, w, y1 - y0 + 1);
      }
      g.save();
      g.globalCompositeOperation = 'lighter';
      [[300, 70], [980, 70]].forEach(([x, hw]) => {
        const gr = g.createLinearGradient(0, 310, 0, h);
        gr.addColorStop(0, 'rgba(191,219,254,0.2)');
        gr.addColorStop(1, 'rgba(191,219,254,0)');
        g.fillStyle = gr;
        poly(g, [[x - hw * 0.3, 310], [x + hw * 0.3, 310], [x + hw, h], [x - hw, h]]);
        g.fill();
      });
      g.restore();
      // linhas: linha de fundo e a grande área
      g.strokeStyle = 'rgba(226,232,240,0.42)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 420);
      g.lineTo(w, 420);
      g.moveTo(300, 420);
      g.lineTo(170, 720);
      g.moveTo(980, 420);
      g.lineTo(1110, 720);
      g.moveTo(450, 420);
      g.lineTo(420, 500);
      g.lineTo(860, 500);
      g.lineTo(830, 420);
      g.stroke();
      const sh = g.createLinearGradient(0, 310, 0, h);
      sh.addColorStop(0, 'rgba(147,197,253,0.06)');
      sh.addColorStop(1, 'rgba(2,6,23,0.4)');
      g.fillStyle = sh;
      g.fillRect(0, 310, w, h - 310);
    },
    // O gol de frente (rede de trás, dos lados e do teto); as traves vêm depois (bdorPosts)
    bdorGoal(ctx) {
      const L = 460;
      const R = 820;
      const G = 420;
      const T = 292;
      const bl = 490;
      const br = 790;
      const bt = 306;
      const bg = 404;
      ctx.fillStyle = 'rgba(2,6,14,0.6)';
      ctx.fillRect(bl, bt, br - bl, bg - bt);
      ctx.strokeStyle = 'rgba(226,232,240,0.26)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const x = lerp(bl, br, i / 16);
        ctx.moveTo(x, bt);
        ctx.lineTo(x, bg);
      }
      for (let i = 0; i <= 6; i++) {
        const y = lerp(bt, bg, i / 6);
        ctx.moveTo(bl, y);
        ctx.lineTo(br, y);
      }
      for (let i = 0; i <= 6; i++) {
        const k = i / 6;
        ctx.moveTo(L, lerp(T, G, k));
        ctx.lineTo(bl, lerp(bt, bg, k));
        ctx.moveTo(R, lerp(T, G, k));
        ctx.lineTo(br, lerp(bt, bg, k));
      }
      for (let i = 0; i <= 10; i++) {
        const k = i / 10;
        ctx.moveTo(lerp(L, R, k), T);
        ctx.lineTo(lerp(bl, br, k), bt);
      }
      ctx.moveTo(L, G);
      ctx.lineTo(bl, bg);
      ctx.lineTo(br, bg);
      ctx.lineTo(R, G);
      ctx.stroke();
    },
    bdorPosts(ctx) {
      ctx.save();
      ctx.lineCap = 'square';
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(460, 421);
      ctx.lineTo(460, 292);
      ctx.lineTo(820, 292);
      ctx.lineTo(820, 421);
      ctx.stroke();
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
    },
    // Bolas amontoadas no fundo do gol (cresce com n)
    bdorPile(ctx, n) {
      const per = 20;
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / per);
        const col = i % per;
        const x = 500 + col * 14.6 + (row % 2) * 7 + (rnd(i, 5) - 0.5) * 4;
        const y = 410 - row * 11 + (rnd(i, 6) - 0.5) * 3;
        this.ptdBall(ctx, x, y, 9, i);
      }
    },
    // A rede em primeiro plano (câmera atrás do gol): estufa em volta de (hx, hy)
    bdorNetFront(ctx, S, hx, hy, b) {
      const { W, top, bot } = S;
      const disp = (x, y) => {
        if (b <= 0) return [x, y];
        const dx = x - hx;
        const dy = y - hy;
        const d2 = dx * dx + dy * dy;
        const f = b * 60 * Math.exp(-d2 / 30000);
        const d = Math.sqrt(d2) || 1;
        return [x + (dx / d) * f, y + (dy / d) * f];
      };
      ctx.save();
      ctx.strokeStyle = 'rgba(226,232,240,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 52) {
        for (let y = top - 20, k = 0; y <= bot + 30; y += 26, k++) {
          const p = disp(x, y);
          if (k) ctx.lineTo(p[0], p[1]);
          else ctx.moveTo(p[0], p[1]);
        }
      }
      for (let y = top - 20; y <= bot + 30; y += 52) {
        for (let x = -20, k = 0; x <= W + 20; x += 26, k++) {
          const p = disp(x, y);
          if (k) ctx.lineTo(p[0], p[1]);
          else ctx.moveTo(p[0], p[1]);
        }
      }
      ctx.stroke();
      ctx.restore();
    },
    // Placar do mano a mano
    bdorTally(ctx, x, y, n, pop = 0) {
      ctx.save();
      ctx.translate(x, y);
      const w = 340;
      const h = 58;
      ctx.fillStyle = '#020617';
      ctx.fillRect(-w / 2 + 5, -h / 2 + 5, w, h);
      ctx.fillStyle = 'rgba(10,6,14,0.94)';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(-w / 2, -h / 2, 8, h);
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(w / 2 - 8, -h / 2, 8, h);
      ctx.strokeStyle = 'rgba(226,232,240,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.font = '900 20px "Segoe UI", sans-serif';
      ctx.fillStyle = SAE_C;
      ctx.fillText('SAE', -118, 1);
      ctx.fillStyle = RIN_C;
      ctx.fillText('RIN', 118, 1);
      ctx.font = 'italic 900 36px "Segoe UI", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('x', 0, -1);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText('0', 48, 0);
      ctx.save();
      ctx.translate(-48, 0);
      const sc = 1 + pop * 0.7;
      ctx.scale(sc, sc);
      ctx.fillStyle = pop > 0.05 ? '#fecdd3' : '#f8fafc';
      ctx.fillText(String(n), 0, 0);
      ctx.restore();
      ctx.restore();
    },
    bdorPuddleVig(g, w, h) {
      const grd = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.55);
      grd.addColorStop(0, 'rgba(1,7,11,0)');
      grd.addColorStop(1, 'rgba(1,7,11,0.9)');
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
    },
    bdorRain(ctx, W, H, t, a = 1) {
      this.cineRain(ctx, W, H, t, 0.26 * a, 160, 0.2);
      this.cineRain(ctx, W, H, t * 1.45 + 300, 0.42 * a, 46, 0.24);
    }
  });

  // ==========================================================================
  // 1. A NOITE DA BOLA DE OURO
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — o troféu no escuro → você sobe ao palco
    bdorGala0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const cut = 150;
      if (t < cut) {
        const k = easeIO(t / cut);
        ctx.fillStyle = '#030108';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: lerp(316, 350, k), zoom: lerp(1.3, 1.08, k), shake: 0.3 });
        this.cineShafts(ctx, 640, -60, Math.PI / 2, 720, 0.34, 5, '254,240,138', 0.15, t);
        this.cineGlow(ctx, 640, 290, 380, 'rgba(251,191,36,0.2)');
        this.foxcGrad(ctx, 566, 470, 148, 320, [[0, '#24142e'], [1, '#05030a']]);
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(552, 466, 176, 8);
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(552, 466, 176, 2);
        this.finGoldBall(ctx, 640, 296, 96, t);
        for (let i = 0; i < 5; i++) {
          const a = Math.max(0, Math.sin(t * 0.05 + i * 1.7));
          this.finSparkle(ctx, 640 + Math.cos(i * 2.4) * 78, 296 + Math.sin(i * 2.4) * 70, 10, a * 0.9, 'rgba(253,230,138,0.7)');
        }
        ctx.restore();
        this.cineDust(ctx, W, H, t, 26, 'rgba(254,240,138,0.45)', 4);
        this.rincPops(ctx, POPS0, t, 3, 64, 7);
        this.finKicker(ctx, 40, top + 30, 'PARIS • THÉÂTRE DU CHÂTELET', seg(t, 8, 50), GOLD);
        this.finKicker(ctx, 40, top + 58, 'A CERIMÔNIA DA BOLA DE OURO', seg(t, 30, 80), '#e2e8f0');
        if (t > cut - 12) this.cineFlash(ctx, W, H, seg(t, cut - 12, cut), '#000000');
        this.cineSfx(S, 20, 'flash', () => window.SFX?.blip?.(1200));
        return;
      }
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      const walk = easeIO(seg(u, 6, 120));
      const px = lerp(250, 640, walk);
      const moving = u > 6 && u < 118;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(540, 640, k), y: lerp(392, 380, k), zoom: lerp(1.12, 1.22, k), shake: 0.3 });
      ctx.drawImage(this.finBg('bdor_stage', 1280, 720, this.bdorStageBg), 0, 0);
      this.cineShafts(ctx, px, -80, Math.PI / 2, 700, 0.2, 4, '254,240,138', 0.12, t);
      this.bdorFloorGlow(ctx, px, 588, 140, 'rgba(254,240,138,0.5)');
      // o troféu no pedestal, do lado
      this.foxcGrad(ctx, 908, 494, 44, 106, [[0, '#2a1838'], [1, '#0c0612']]);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(900, 490, 60, 5);
      this.cineGlow(ctx, 930, 448, 80, 'rgba(251,191,36,0.35)');
      this.finGoldBall(ctx, 930, 448, 25, t);
      this.finRim(ctx, c.you, px, 588, 220, moving ? { animState: 'run', frame: WALKF(S.f, 7) } : {}, '#fde68a', [-1, 1], 2);
      this.bdorLectern(ctx, 640, 590, 0.8, 24);
      ctx.restore();
      // a plateia de costas em primeiro plano, aplaudindo
      this.bdorHeads(ctx, W, bot - 4, 1.0, t, { color: '#020106', rim: 'rgba(251,191,36,0.55)', clap: 0.6, seed: 2, handDy: -46, hand: '#1f150d' });
      this.bdorHeads(ctx, W, bot + 70, 1.4, t, { color: '#010004', rim: 'rgba(251,191,36,0.4)', clap: 0.45, seed: 5, handDy: -46, hand: '#1a110a' });
      this.rincPops(ctx, POPS1, t, 7, 50, 7);
      this.finKicker(ctx, 40, top + 30, 'O VENCEDOR SOBE AO PALCO', seg(u, 10, 50), GOLD);
      this.finKicker(ctx, 40, top + 58, this.cinePlayerName(), seg(u, 30, 70), YOU_C);
      this.cineFlash(ctx, W, H, 1 - seg(u, 0, 12), '#000000');
    },

    // PLANO 2 — o discurso: o nº 299, "sem talento"
    bdorGala1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const k = easeIO(t / S.dur);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.finBg('bdor_stage', 1280, 720, this.bdorStageBg), 300, 40, 680, 380, -60, -30, W + 120, H + 60);
      ctx.restore();
      ctx.fillStyle = 'rgba(6,3,12,0.5)';
      ctx.fillRect(0, 0, W, H);
      this.cineBokeh(ctx, W, top, bot, t, 16, ['rgba(251,191,36,0.35)', 'rgba(254,240,138,0.25)'], 21);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1, 1.06, k), shake: 0.35 });
      const x = 430;
      const eyeY = 316;
      const size = 720;
      this.cineGlow(ctx, x, 280, 440, 'rgba(253,230,138,0.2)');
      const r = this.finHead(ctx, c.you, x, eyeY, size, { rim: '#fde68a' });
      const past = t > 200 && t < 330;
      this.wcdEyes(ctx, x, eyeY, r.u, {
        ring: YOU_C, iris: '#065f46', shine: 0.8, look: past ? 0 : t < 200 ? [0, 1, 0, -1][Math.floor(t / 40) % 4] : 0,
        half: past, lid: this.finShade(c.you.skinColor || '#f3d1b8', -0.18), angry: t >= 330
      });
      this.bdorLectern(ctx, x, 516 + 112 * 3, 3, 34);
      ctx.restore();
      // painel: o nº 299 (o último do ranking do Blue Lock)
      const kA = ease(seg(t, 24, 40)) * (1 - ease(seg(t, 186, 198)));
      if (kA > 0) {
        this.finPanel(ctx, [[770, top + 22], [W - 22, top + 14], [W - 30, bot - 22], [748, bot - 14]], () => {
          this.cineGradient(ctx, 700, top, 600, bot - top, [[0, '#071a33'], [1, '#020814']]);
          this.ptdRays(ctx, 1010, 330, 640, '#38bdf8', 0.12, t * 0.003, 36, 0.03);
          this.finRim(ctx, c.youBL, 1010, bot + 100, 520, { facing: 'back', dim: 0.25, dimTint: '2,8,20', shirtNumber: 299 }, '#38bdf8', [-1, 1], 3);
          this.rincStamp(ctx, 'Nº 299', 1010, top + 74, 70, '#e0f2fe', t, 40, 3);
          this.finKicker(ctx, 786, bot - 46, 'O ÚLTIMO DO RANKING', seg(t, 60, 100), '#38bdf8');
        }, { dx: (1 - kA) * 620, border: '#bae6fd' });
      }
      // painel: a derrota, "sem talento"
      const kB = ease(seg(t, 200, 216));
      if (kB > 0) {
        this.finPanel(ctx, [[760, top + 14], [W - 22, top + 22], [W - 22, bot - 14], [740, bot - 22]], () => {
          this.cineGradient(ctx, 700, top, 600, bot - top, [[0, '#2a0508'], [1, '#0a0103']]);
          this.ptdRays(ctx, 1010, 320, 640, '#ef4444', 0.16, -t * 0.003, 36, 0.03);
          this.zselKneel(ctx, c.youBL, 1010, bot + 30, 400, { dim: 0.55, dimTint: '30,2,6' });
          this.rincShade(ctx, c.youBL, 1010, bot + 30 + (31.3 - 26.4) * (400 / 36), 400, 0.85);
          this.rincStamp(ctx, 'SEM', 1010, top + 70, 58, '#fecaca', t, 222, 3);
          this.rincStamp(ctx, 'TALENTO.', 1010, top + 134, 70, '#ef4444', t, 236, 3, 460);
        }, { dx: (1 - kB) * 620, border: '#fecaca' });
      }
    },

    // PLANO 3 — devorei um por um → ainda tenho fome
    bdorGala2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const cut = 176;
      if (t < cut) {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, W, H);
        this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
        const list = [[c.barou, 'BAROU', '#ef4444'], [c.nagi, 'NAGI', '#e2e8f0'], [c.shidou, 'SHIDOU', '#ec4899'], [c.kaiser, 'KAISER', '#60a5fa'], [c.rinK, 'RIN', RIN_C]];
        const pw = 222;
        const gap = 22;
        const x00 = (W - (pw * 5 + gap * 4)) / 2;
        list.forEach(([ch, nm, col], i) => {
          const a = 4 + i * 10;
          const kk = ease(seg(t, a, a + 14));
          if (kk <= 0) return;
          const x0 = x00 + i * (pw + gap);
          const sl = 14;
          const pts = [[x0 + sl, top + 16], [x0 + pw + sl, top + 16], [x0 + pw - sl, bot - 16], [x0 - sl, bot - 16]];
          const hit = 46 + i * 24;
          const dv = seg(t, hit, hit + 8);
          this.finPanel(ctx, pts, () => {
            this.cineGradient(ctx, x0 - 20, top, pw + 40, bot - top, [[0, '#0b1120'], [1, '#020409']]);
            this.cineGlow(ctx, x0 + pw / 2, top + 220, 220, rgba(col, 0.28));
            const dw = pw * 1.3;
            this.finCrop(ctx, ch, {}, 9, -1, 18, 25, x0 + pw / 2 - dw / 2, top + 34, dw, (dw * 25) / 18);
            if (dv > 0) {
              ctx.fillStyle = `rgba(2,6,12,${0.55 * dv})`;
              ctx.fillRect(x0 - 20, top, pw + 40, bot - top);
              this.bdorClaw(ctx, x0 + pw / 2, (top + bot) / 2 - 30, dv, pw);
            }
            ctx.fillStyle = 'rgba(2,6,23,0.85)';
            ctx.fillRect(x0 - 20, bot - 74, pw + 40, 58);
            ctx.font = 'italic 900 26px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = dv > 0 ? '#475569' : col;
            ctx.fillText(nm, x0 + pw / 2 - 6, bot - 46);
          }, { dy: (1 - kk) * -(bot - top), border: dv > 0 ? '#99f6e4' : '#e2e8f0' });
          this.cineSfx(S, hit, 'garra' + i, () => window.SFX?.tackle?.());
        });
        this.cineImpactText(ctx, 'UM POR UM.', W / 2, (top + bot) / 2 + 10, 92, YOU_C, seg(t, 150, 160), W * 0.7, -0.05);
        return;
      }
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      const hit = 56;
      this.ptdCloseBg(ctx, S, YOU_C, 640);
      this.ptdRays(ctx, 640, 330, W * 1.1, YOU_C, 0.1 + 0.16 * seg(u, 40, 70), u * 0.004, 50, 0.028);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 340, zoom: 1 + k * 0.08, shake: 0.6 + (u >= hit ? 6 * (1 - seg(u, hit, hit + 24)) : 0) });
      const U = this.wcdEyeBand(ctx, c.you, 640, 330, 1300, { dim: 0.08, dimTint: '0,20,20' });
      this.wcdEyes(ctx, 640, 330, U, { ring: YOU_C, iris: '#022c22', line: '#010405', glow: 'rgba(0,245,212,0.85)', glowA: 0.3 + 0.7 * seg(u, 20, 60), shine: 1, angry: u > hit });
      ctx.restore();
      ctx.fillStyle = 'rgba(1,8,10,0.8)';
      ctx.fillRect(0, top, W, 84);
      ctx.fillRect(0, bot - 120, W, 120);
      this.rincStamp(ctx, 'E EU AINDA TÔ...', 640, top + 44, 44, '#ccfbf1', u, 14, 2, W * 0.8);
      this.cineImpactText(ctx, 'COM FOME.', 640, bot - 62, 100, YOU_C, seg(u, hit, hit + 10), W * 0.7, -0.04);
      if (u >= hit) this.cineFlash(ctx, W, H, 0.32 * (1 - seg(u, hit, hit + 12)), '#ccfbf1');
      this.cineSfx(S, cut + hit, 'fome', () => window.SFX?.kick?.(1));
    },

    // PLANO 4 — a plateia de pé → a última fileira: o Rin sozinho, sem aplaudir
    bdorGala3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const cut = 204;
      if (t < cut) {
        const k = easeIO(seg(t, 4, cut - 14));
        ctx.fillStyle = '#04020a';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        const zoom = lerp(1, 2.1, k * k);
        this.cineCamera(ctx, W, H, { x: lerp(640, 690, k), y: lerp(560, 4, k), zoom, shake: 0.4 });
        // a parede do fundo (só a placa verde de saída)
        this.foxcGrad(ctx, -200, -460, W + 400, 440, [[0, '#020105'], [1, '#0b0610']]);
        ctx.fillStyle = '#052e16';
        ctx.fillRect(874, -120, 52, 16);
        this.cineGlow(ctx, 900, -112, 46, 'rgba(74,222,128,0.35)');
        ctx.font = '900 10px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#4ade80';
        ctx.fillText('SAÍDA', 900, -111);
        for (let r = 7; r >= 0; r--) {
          const y = 700 - r * 100;
          const s = 1.15 - r * 0.08;
          const light = 1 - r / 7;
          this.bdorSeats(ctx, W, y + 22 * s, s, light, r + 3);
          if (r === 7) {
            // o Rin, sentado sozinho na última fileira (as poltronas dos lados vazias)
            const st = 96 * s;
            const off = rnd(r + 3, 9) * st;
            const rx = -80 + off + Math.round((690 + 80 - off) / st) * st;
            const size = 245 * s;
            const uu = size / 36;
            const feet = y + 92 * s;
            this.cineGlow(ctx, rx, y - 10, 130 * s, 'rgba(20,184,166,0.2)');
            const up = this.rincSeat(ctx, c.rin, rx, feet, size, { dim: 0.45, dimTint: '0,12,16', rim: '#2dd4bf' });
            const eyeY = up - size * 0.87 + SPRITE_MAPY(10.1) * uu;
            const glow = 0.7 + 0.3 * Math.sin(t * 0.09);
            this.wcdEyes(ctx, rx, eyeY, uu, { ring: '#5eead4', iris: '#042f2e', line: '#010405', angry: true, glow: 'rgba(45,212,191,0.85)', glowA: glow });
            this.bdorCrowdFront(ctx, W, y, s, t, light, r + 3, [rx - 3.2 * st, rx + 3.2 * st]);          } else {
            this.bdorCrowdFront(ctx, W, y, s, t, light, r + 3, r === 6 ? [440, 940] : null);
          }
          // a fileira da frente esconde a parte de baixo desta
          ctx.fillStyle = '#0d040a';
          ctx.fillRect(-300, y + 62 * s, W + 600, 40 * s);
          ctx.fillStyle = `rgba(190,18,60,${0.08 + 0.25 * light})`;
          ctx.fillRect(-300, y + 62 * s, W + 600, Math.max(1.5, 2 * s));
        }
        ctx.restore();
        this.finKicker(ctx, 40, top + 30, 'DE PÉ, O TEATRO INTEIRO', seg(t, 10, 50), GOLD);
        this.finKicker(ctx, 40, top + 58, 'MENOS UM.', seg(t, 150, 186), RIN_C);
        if (t > 150) this.finKicker(ctx, W / 2 + 120, bot - 40, 'RIN ITOSHI • ÚLTIMA FILEIRA', seg(t, 160, 196), RIN_C);
        return;
      }
      // close: o rosto no escuro, os olhos acesos; o punho fechado no braço da poltrona
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      ctx.fillStyle = '#010507';
      ctx.fillRect(0, 0, W, H);
      this.ptdRays(ctx, 520, 330, W, '#0f766e', 0.12, u * 0.002, 40, 0.025);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.06, shake: 0.5 });
      ctx.fillStyle = '#12050b';
      [[60, 520], [1060, 500], [1240, 520]].forEach(([sx, sy]) => ctx.fillRect(sx - 90, sy, 180, 260));
      const x = 520;
      const eyeY = 330;
      const size = 860;
      this.cineGlow(ctx, x, 360, 440, 'rgba(20,184,166,0.13)');
      const r = this.finHead(ctx, c.rin, x, eyeY, size, { dim: 0.42, dimTint: '0,10,14', rim: '#14b8a6' });
      this.rincShade(ctx, c.rin, x, r.feet, size, 0.85);
      const pulse = 0.7 + 0.3 * Math.sin(u * 0.08);
      this.wcdEyes(ctx, x, eyeY, r.u, { ring: '#2dd4bf', iris: '#042f2e', line: '#010405', angry: true, tiny: u > 70, glow: 'rgba(45,212,191,0.7)', glowA: pulse, shine: 0.9 });
      ctx.restore();
      const kp = ease(seg(u, 40, 56));
      if (kp > 0) {
        this.finPanel(ctx, [[850, bot - 236], [W - 22, bot - 250], [W - 22, bot - 18], [830, bot - 18]], () => {
          this.cineGradient(ctx, 800, bot - 260, 500, 260, [[0, '#04161a'], [1, '#010608']]);
          ctx.fillStyle = '#2a0a12';
          ctx.fillRect(800, bot - 66, 500, 60);
          ctx.fillStyle = 'rgba(190,18,60,0.35)';
          ctx.fillRect(800, bot - 66, 500, 3);
          const sh = Math.round(this.cineNoise(S.f * 3.3, 2) * 3);
          this.cineGlow(ctx, 1040, bot - 150, 200, 'rgba(45,212,191,0.16)');
          this.wcdPix(ctx, this.wcdFistCv(), 890 + sh, bot - 226, 11);
          ctx.fillStyle = 'rgba(0,16,20,0.22)';
          ctx.fillRect(800, bot - 260, 500, 260);
          // risquinhos do tremor
          ctx.strokeStyle = '#ccfbf1';
          ctx.lineWidth = 3;
          ctx.beginPath();
          [[872, bot - 200, -1], [872, bot - 150, -1], [1226, bot - 206, 1], [1226, bot - 156, 1]].forEach(([mx, my, d], i) => {
            const o = (Math.floor(S.f / 3) + i) % 2 ? 4 : 0;
            ctx.moveTo(mx + d * o, my);
            ctx.lineTo(mx + d * (o + 16), my - 8);
          });
          ctx.stroke();
        }, { dy: (1 - kp) * 300, border: '#5eead4' });
      }
      this.finKicker(ctx, 40, top + 30, 'RIN ITOSHI', seg(u, 6, 30), RIN_C);
      this.rincStamp(ctx, 'NÃO APLAUDE.', 1010, top + 74, 46, '#99f6e4', u, 20, 2, 460);
      this.cineFlash(ctx, W, H, 1 - seg(u, 0, 10), '#000000');
    },

    // PLANO 5 — o Rin sobe o corredor e sai pela porta dos fundos; a porta fecha
    bdorGala4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const close = 238;
      const open = 1 - ease(seg(t, close, close + 22));
      const k = easeIO(t / S.dur);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(370, 330, k), zoom: lerp(1, 1.12, k), shake: 0.35 });
      ctx.drawImage(this.finBg('bdor_aisle', 1280, 720, this.bdorAisleBg), 0, 0);
      // a luz do corredor pela porta aberta
      if (open > 0) {
        const dw = 44 * open;
        this.cineGlow(ctx, 640, 268, 90 + 150 * open, 'rgba(255,237,180,0.45)', open);
        ctx.fillStyle = '#fff6dc';
        ctx.fillRect(640 - dw, 194, dw * 2, 142);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const lg = ctx.createLinearGradient(0, 336, 0, 720);
        lg.addColorStop(0, `rgba(255,237,180,${0.3 * open})`);
        lg.addColorStop(1, 'rgba(255,237,180,0)');
        ctx.fillStyle = lg;
        poly(ctx, [[640 - dw, 336], [640 + dw, 336], [640 + dw * 4.6, 720], [640 - dw * 4.6, 720]]);
        ctx.fill();
        ctx.restore();
      }
      // as mãos batendo palma (as fileiras da frente)
      this.bdorAisleRows((x, y, s, j, i, side) => {
        if (j > 6 || rnd(i * 7 + j, side + 4) > 0.65) return;
        const gp = Math.abs(Math.sin(t * 0.3 + i * 1.3 + j)) * 6 * s;
        const hy = y + 2 * s;
        ctx.fillStyle = '#2e2014';
        ctx.fillRect(x - gp - 8 * s, hy - 10 * s, 8 * s, 12 * s);
        ctx.fillRect(x + gp, hy - 10 * s, 8 * s, 12 * s);
        ctx.fillStyle = 'rgba(251,191,36,0.55)';
        ctx.fillRect(x - gp - 8 * s, hy - 10 * s, 8 * s, Math.max(1, 2 * s));
        ctx.fillRect(x + gp, hy - 10 * s, 8 * s, Math.max(1, 2 * s));
      });
      // o Rin subindo o corredor, de costas, até a porta
      const wk = easeIO(seg(t, 0, close - 4));
      const feet = lerp(706, 337, wk);
      const size = lerp(320, 92, wk);
      if (t < close + 20) {
        if (open > 0.05) {
          ctx.fillStyle = `rgba(0,0,0,${0.45 * open})`;
          poly(ctx, [[640 - size * 0.1, feet], [640 + size * 0.1, feet], [640 + size * 0.3, Math.min(feet + size * 1.4, 760)], [640 - size * 0.3, Math.min(feet + size * 1.4, 760)]]);
          ctx.fill();
        }
        const walking = t < close - 6;
        this.finRim(ctx, c.rin, 640, feet, size, { facing: 'back', animState: walking ? 'run' : 'idle', frame: walking ? WALKF(S.f, 8) : 45, dim: 0.55, dimTint: '2,6,10' }, '#2dd4bf', [-1, 1], 2);
      }
      // as folhas da porta fechando
      if (open < 1) {
        ctx.fillStyle = '#1c1016';
        ctx.fillRect(588, 190, 52 - 44 * open, 148);
        ctx.fillRect(640 + 44 * open, 190, 52 - 44 * open, 148);
        ctx.strokeStyle = 'rgba(251,191,36,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(588, 190, 104, 148);
      }
      if (open <= 0) {
        ctx.fillStyle = 'rgba(255,237,180,0.8)';
        ctx.fillRect(592, 334, 96, 3);
        this.cineGlow(ctx, 640, 336, 70, 'rgba(255,237,180,0.3)');
      }
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'O DISCURSO AINDA ECOA', seg(t, 10, 50), GOLD);
      this.rincStamp(ctx, 'CLAC.', 900, top + 150, 52, '#e2e8f0', t, close + 20, 3);
      this.finKicker(ctx, W / 2, bot - 40, 'O RIN SAIU ANTES DO FIM', seg(t, close + 26, close + 42), RIN_C, 'center');
      this.cineFlash(ctx, W, H, 1 - seg(t, 0, 10), '#000000');
      this.cineSfx(S, close + 20, 'porta', () => window.SFX?.tackle?.());
    }
  });

  // ==========================================================================
  // 2. A LIÇÃO DO SAE
  // ==========================================================================
  Object.assign(CE, {
    // O Sae encostado na parede do corredor, braços cruzados (lean = inclinação)
    bdorSaeLean(ctx, c, lean = 0.07, x = 1096, feet = 676, size = 400) {
      ctx.save();
      ctx.translate(x, feet);
      ctx.rotate(lean);
      this.bdorSpr(ctx, c.sae, 0, 0, size, { cross: true, dim: 0.18, dimTint: '22,4,10', rim: '#e11d48', rimSides: [-1, 1], rimD: 2 });
      ctx.restore();
    },
    bdorHall(ctx, W, H, t) {
      ctx.drawImage(this.finBg('fin_hall', 1280, 720, this.finHallBg), 0, 0);
      ctx.fillStyle = 'rgba(6,2,10,0.38)';
      ctx.fillRect(0, 0, W, H);
      [[330, 250], [950, 250], [180, 200], [1100, 200]].forEach(([x, y], i) => this.cineGlow(ctx, x, y, 90, 'rgba(251,191,36,0.3)', 0.8 + 0.2 * Math.sin(t * 0.04 + i)));
    },

    // PLANO 1 — o corredor do hotel: o Rin vem andando, o Sae está esperando
    bdorLic0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const k = easeIO(t / S.dur);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(360, 368, k), zoom: lerp(1.0, 1.1, k), shake: 0.4 });
      this.bdorHall(ctx, W, H, t);
      const wk = easeIO(seg(t, 0, 190));
      const feet = lerp(354, 606, wk);
      const size = lerp(62, 300, wk);
      const x = lerp(640, 560, wk);
      const walking = t < 186;
      this.bdorFloorGlow(ctx, x, feet, size * 0.4, 'rgba(0,0,0,0.6)');
      // vem pelo corredor na direção da câmera (view 'front' nos bonecos novos)
      this.finRim(ctx, c.rin, x, feet, size, { animState: walking ? 'run' : 'idle', view: walking ? 'front' : undefined, frame: walking ? WALKF(S.f, 7) : 45, dim: 0.22, dimTint: '6,2,12' }, '#2dd4bf', [-1, 1], 2);
      if (!walking) this.wcdEyes(ctx, x, feet - size * 0.87 + SPRITE_MAPY(10.1) * (size / 36), size / 36, { ring: '#2dd4bf', iris: '#042f2e', angry: true, look: 1 });
      this.cineGlow(ctx, 1110, 420, 260, 'rgba(225,29,72,0.14)');
      this.bdorSaeLean(ctx, c);
      ctx.restore();
      this.finKicker(ctx, 40, top + 30, 'HOTEL DA GALA • 23:58', seg(t, 8, 50), GOLD);
      this.finKicker(ctx, 40, top + 58, 'SAE ITOSHI ESTAVA ESPERANDO', seg(t, 30, 80), SAE_C);
      // faixa: os olhos do Rin ("não enche")
      const kE = ease(seg(t, 204, 218));
      if (kE > 0) {
        this.finPanel(ctx, [[18, top + 14], [W - 18, top + 14], [W - 18, top + 150], [18, top + 164]], () => {
          ctx.fillStyle = '#010608';
          ctx.fillRect(0, top, W, 180);
          const ey = top + 90;
          const U = this.wcdEyeBand(ctx, c.rin, 640, ey, 800, { dim: 0.2, dimTint: '0,20,24' });
          this.wcdEyes(ctx, 640, ey, U, { ring: '#2dd4bf', iris: '#042f2e', angry: true, line: '#010405', look: 1, glow: 'rgba(45,212,191,0.5)', glowA: 0.6 });
        }, { dx: (1 - kE) * -W, border: '#99f6e4' });
      }
    },

    // PLANO 2 — o Sae, frio: "garoto chorão que não aceita perder" → o Rin explode e passa
    bdorLic1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const cut = 352;
      if (t < cut) {
        const k = easeIO(t / cut);
        const rage = seg(t, 290, cut);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.finBg('fin_hall', 1280, 720, this.finHallBg), 700, 120, 580, 330, -40, -20, W + 80, H + 40);
        ctx.restore();
        ctx.fillStyle = 'rgba(14,2,8,0.55)';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1, 1.08, k), shake: 0.4 + rage * 3 });
        this.cineGlow(ctx, 820, 300, 420, 'rgba(225,29,72,0.16)');
        const r = this.bdorHead(ctx, c.sae, 820, 300, 760, { cross: true, dim: 0.14, dimTint: '24,4,10', rim: '#fb7185', rimSides: [1], rimD: 2 });
        this.wcdEyes(ctx, 820, 300, r.u, { ring: '#2aa198', iris: '#134e4a', half: true, lid: this.finShade(c.sae.skinColor || '#fbe6d8', -0.2), look: -1 });
        ctx.restore();
        // o Rin de costas em primeiro plano
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.03, shake: 0.7 + rage * 5 });
        this.cineGlow(ctx, 250, 520, 360, 'rgba(20,184,166,0.1)', 1 + rage);
        this.finRim(ctx, c.rin, 250, bot + 290, 720, { facing: 'back', dim: 0.72, dimTint: '2,8,10' }, '#2dd4bf', [-1, 1], 4);
        ctx.restore();
        const fadeA = 1 - seg(t, 176, 190);
        this.rincStamp(ctx, 'GAROTO', 560, top + 64, 56, '#fecdd3', t, 40, 3, 0, 'center', fadeA);
        this.rincStamp(ctx, 'CHORÃO.', 560, top + 128, 66, SAE_C, t, 70, 3, 0, 'center', fadeA);
        // painel: os olhos do Rin tremendo
        const kp = ease(seg(t, 196, 210));
        if (kp > 0) {
          this.finPanel(ctx, [[22, top + 16], [560, top + 16], [540, top + 176], [22, top + 190]], () => {
            ctx.fillStyle = '#010608';
            ctx.fillRect(0, top, 580, 200);
            const ey = top + 98;
            const U = this.wcdEyeBand(ctx, c.rin, 290, ey, 720, { dim: 0.2, dimTint: '0,20,24' });
            const shaky = t < 290 ? [0, 1, 0, -1][Math.floor(t / 2) % 4] : 0;
            this.wcdEyes(ctx, 290, ey, U, { ring: '#2dd4bf', iris: '#042f2e', line: '#010405', tiny: true, look: shaky, angry: t >= 290, glow: 'rgba(45,212,191,0.6)', glowA: rage });
          }, { dx: (1 - kp) * -620, border: '#99f6e4' });
        }
        this.cineImpactText(ctx, 'PERDER.', 340, bot - 72, 84, SAE_C, seg(t, 270, 280), 520, -0.05);
        return;
      }
      // o Rin explode e passa pelo Sae, ombro com ombro; o Sae nem se mexe
      const u = t - cut;
      const hitU = 22;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 700, y: 390, zoom: 1.15, shake: 1 + (u >= hitU ? 8 * (1 - seg(u, hitU, hitU + 20)) : 2) });
      this.bdorHall(ctx, W, H, t);
      const bump = u >= hitU ? Math.sin(seg(u, hitU, hitU + 14) * Math.PI) * 0.035 : 0;
      this.bdorSaeLean(ctx, c, 0.07 - bump);
      const wk = seg(u, 0, 46);
      const rx = lerp(600, 1330, wk);
      const rf = lerp(600, 700, wk);
      const rs = lerp(320, 430, wk);
      this.finRim(ctx, c.rin, rx, rf, rs, { animState: 'run', frame: WALKF(S.f, 3), dim: 0.22, dimTint: '6,2,12' }, '#2dd4bf', [-1, 1], 2);
      ctx.restore();
      this.cineImpactText(ctx, 'CALA A BOCA!!', 430, top + 104, 96, RIN_C, seg(u, 0, 8), 760, -0.06);
      if (u >= hitU) this.rincStamp(ctx, 'TOC.', 1080, top + 70, 52, '#e2e8f0', u, hitU, 3);
      if (u >= hitU) this.cineFlash(ctx, W, H, 0.25 * (1 - seg(u, hitU, hitU + 8)), '#ccfbf1');
      this.cineSfx(S, cut + hitU, 'ombro', () => window.SFX?.tackle?.());
    },

    // PLANO 3 — uma da manhã: o Rin chutando sozinho na chuva, as bolas se amontoando
    bdorLic2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const cut = 170;
      const N0 = 34;
      if (t < cut) {
        const k = easeIO(t / cut);
        const per = 26;
        const n = Math.max(0, Math.floor((t - 8) / per));
        const q = t < 8 ? 0 : (t - 8) % per;
        const kickT = 8 + n * per + 10;
        const landed = (tt) => Math.max(0, Math.floor((tt - 8 - 22) / per) + 1);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: lerp(360, 350, k), zoom: lerp(1.0, 1.08, k), shake: 0.4 });
        ctx.drawImage(this.finBg('bdor_pitch', 1280, 720, this.bdorPitchBg), 0, 0);
        this.cineShafts(ctx, 1130, 50, Math.atan2(370, -560), 900, 0.3, 4, '224,242,254', 0.07, t);
        this.bdorGoal(ctx);
        this.bdorPile(ctx, N0 + landed(t));
        this.bdorPosts(ctx);
        // a bola indo para o gol
        if (t >= kickT && t < kickT + 12) {
          const p = (t - kickT) / 12;
          const tx = 520 + rnd(n, 3) * 240;
          const ty = 312 + rnd(n, 4) * 80;
          const bx = lerp(448, tx, ease(p));
          const by = lerp(612, ty, ease(p)) - Math.sin(p * Math.PI) * 40;
          this.ptdBall(ctx, bx, by, lerp(22, 9, p), t);
        }
        // a bola na marca, antes do chute
        if (q < 10) this.ptdBall(ctx, 448, 612, 22, 0);
        const pose = q < 10 ? 'windup' : q < 18 ? 'shoot' : 'idle';
        this.finRim(ctx, c.rinTr, 360, bot + 14, 380, { facing: 'back', animState: pose, dim: 0.3, dimTint: '0,10,16' }, '#5eead4', [-1, 1], 2);
        this.finSplashes(ctx, 100, 1180, 430, 700, t, 30);
        ctx.restore();
        this.bdorRain(ctx, W, H, t);
        this.cineSfx(S, kickT, 'chute' + n, () => window.SFX?.kick?.(0.7));
        this.finKicker(ctx, 40, top + 30, 'CAMPO DE TREINO • 01:07', seg(t, 8, 50), '#38bdf8');
        this.finKicker(ctx, 40, top + 58, 'SOZINHO, NA CHUVA', seg(t, 30, 80), RIN_C);
        this.ptdChip(ctx, `${N0 + landed(t)} BOLAS NA REDE`, W - 250, top + 34, RIN_C, seg(t, 20, 34), { size: 16, left: true });
        if (t > cut - 8) this.cineFlash(ctx, W, H, seg(t, cut - 8, cut) * 0.8, '#000000');
        return;
      }
      // contraplano: atrás da rede, o Rin chutando em você
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      const per = 24;
      const n = Math.max(0, Math.floor((u - 6) / per));
      const q = u < 6 ? 0 : (u - 6) % per;
      const kickU = 6 + n * per + 9;
      const fly = 9;
      const shotsA = Math.floor((cut - 8 - 22) / 26) + 1;
      const landedB = (uu) => Math.max(0, Math.floor((uu - 6 - 9 - fly - 10) / per) + 1);
      const hitAt = kickU + fly;
      const hx = 430 + rnd(n, 7) * 420;
      const hy = top + 150 + rnd(n, 8) * 170;
      const bulge = u >= hitAt ? 1 - seg(u, hitAt, hitAt + 16) : 0;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1.04, 1.1, k), shake: 0.6 + bulge * 4 });
      ctx.drawImage(this.finBg('bdor_pitch', 1280, 720, this.bdorPitchBg), 0, 40);
      ctx.fillStyle = '#010208';
      ctx.fillRect(-100, -100, W + 200, 140);
      ctx.fillStyle = 'rgba(2,6,14,0.3)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      this.bdorFloorGlow(ctx, 640, 568, 220, 'rgba(191,219,254,0.3)');
      const pose = q < 9 ? 'windup' : q < 16 ? 'shoot' : 'idle';
      const rs = 300;
      this.finRim(ctx, c.rinTr, 640, 568, rs, { animState: pose, dim: 0.2, dimTint: '0,14,20' }, '#5eead4', [-1, 1], 2);
      const ru = rs / 36;
      this.wcdEyes(ctx, 640, 568 - rs * 0.87 + SPRITE_MAPY(10.1) * ru, ru, { ring: '#2dd4bf', iris: '#042f2e', angry: true, glow: 'rgba(45,212,191,0.6)', glowA: 0.7 });
      this.finSplashes(ctx, 200, 1080, 470, 700, t, 26);
      ctx.restore();
      // as traves (do lado de lá da rede)
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(56, top - 10, 18, H);
      ctx.fillRect(W - 74, top - 10, 18, H);
      ctx.fillRect(56, top + 14, W - 112, 16);
      ctx.fillStyle = 'rgba(2,6,23,0.4)';
      ctx.fillRect(68, top - 10, 6, H);
      ctx.fillRect(W - 62, top - 10, 6, H);
      // as bolas amontoadas lá dentro
      const m = Math.min(18, 7 + landedB(u));
      for (let i = 0; i < m; i++) {
        const row = i < 9 ? 0 : i < 15 ? 1 : 2;
        const kk = row === 0 ? i : row === 1 ? i - 9 : i - 15;
        const cnt = [9, 6, 3][row];
        const bx = 640 + (kk - (cnt - 1) / 2) * 92 + (rnd(i, 51) - 0.5) * 18;
        const by = 610 - row * 60 + (rnd(i, 52) - 0.5) * 8;
        this.ptdBall(ctx, bx, by, 46, i);
      }
      // a bola vindo na sua direção → estufa a rede → cai no monte
      if (u >= kickU && u < hitAt) {
        const p = (u - kickU) / fly;
        this.ptdBall(ctx, lerp(668, hx, p * p), lerp(548, hy, p * p), lerp(10, 64, p * p), u);
      } else if (u >= hitAt && u < hitAt + 14) {
        const p = (u - hitAt) / 14;
        this.ptdBall(ctx, hx + (640 - hx) * p * 0.3, lerp(hy, bot + 20, p * p), lerp(58, 46, p), u);
      }
      this.bdorNetFront(ctx, S, hx, hy, bulge);
      if (u >= hitAt && u < hitAt + 12) this.cineImpactText(ctx, 'DOM!', hx + 60, hy - 70, 54, '#ccfbf1', seg(u, hitAt, hitAt + 5), 0, -0.1);
      this.bdorRain(ctx, W, H, t, 0.8);
      this.cineSfx(S, cut + hitAt, 'rede' + n, () => window.SFX?.post?.());
      this.ptdChip(ctx, `${N0 + shotsA + landedB(u)} BOLAS NA REDE`, W - 250, top + 34, RIN_C, 1, { size: 16, left: true });
      // faixa: os olhos do Rin, cheios de raiva
      const kE = ease(seg(u, 60, 74));
      if (kE > 0) {
        this.finPanel(ctx, [[110, top + 50], [760, top + 44], [750, top + 170], [110, top + 180]], () => {
          ctx.fillStyle = '#010608';
          ctx.fillRect(90, top + 30, 700, 170);
          const ey = top + 114;
          const U = this.wcdEyeBand(ctx, c.rinTr, 430, ey, 760, { dim: 0.25, dimTint: '0,20,24' });
          this.wcdEyes(ctx, 430, ey, U, { ring: '#2dd4bf', iris: '#0f766e', line: '#010405', angry: true, glow: 'rgba(45,212,191,0.6)', glowA: 0.8, shine: 0.8 });
        }, { dx: (1 - kE) * -800, border: '#99f6e4' });
      }
      this.cineFlash(ctx, W, H, 0.8 * (1 - seg(u, 0, 10)), '#000000');
    },

    // PLANO 4 — passos na chuva: o Sae entra na luz, pega uma bola. "Joga comigo."
    bdorLic3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const cut = 120;
      if (t < cut) {
        // rente ao chão: os sapatos do Sae pisando nas poças
        ctx.fillStyle = '#010309';
        ctx.fillRect(0, 0, W, H);
        this.foxcGrad(ctx, 0, top, W, 240, [[0, '#040a18'], [1, '#0a1f1a']]);
        this.cineGlow(ctx, 980, top + 40, 300, 'rgba(224,242,254,0.35)');
        this.cineGradient(ctx, 0, top + 240, W, bot - top - 240, [[0, '#0b2a1e'], [1, '#03100b']]);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.bdorFloorGlow(ctx, 900, bot - 70, 420, 'rgba(191,219,254,0.35)', 1, 0.18);
        ctx.restore();
        [[340, bot - 40, 220], [880, bot - 54, 260], [620, bot - 20, 160]].forEach(([px, py, rx]) => {
          ctx.fillStyle = 'rgba(2,10,20,0.75)';
          ctx.beginPath();
          ctx.ellipse(px, py, rx, rx * 0.14, 0, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = 'rgba(191,219,254,0.25)';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
        const wx = lerp(1420, 740, seg(t, 0, 112));
        // contraluz do refletor atrás dele: a silhueta recorta
        this.cineGlow(ctx, wx + 60, bot - 260, 520, 'rgba(224,242,254,0.4)');
        this.cineGlow(ctx, wx, bot - 300, 420, 'rgba(225,29,72,0.14)');
        this.finRim(ctx, c.sae, wx, bot + 4, 1150, { animState: t < 112 ? 'run' : 'idle', frame: t < 112 ? WALKF(S.f, 10) : 45, flipX: true, dim: 0.3, dimTint: '22,4,10' }, '#fb7185', [-1, 1], 13);
        this.finSplashes(ctx, 200, 1180, bot - 80, bot - 10, t, 30);
        [30, 62, 94].forEach((st, i) => {
          if (t < st || t > st + 26) return;
          const p = (t - st) / 26;
          ctx.strokeStyle = `rgba(224,242,254,${0.7 * (1 - p)})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(lerp(1420, 740, seg(st, 0, 112)) - 60, bot - 24, 30 + p * 140, 6 + p * 20, 0, 0, TAU);
          ctx.stroke();
          this.rincStamp(ctx, 'TAP.', [300, 520, 380][i], top + [90, 150, 210][i], 44, '#e2e8f0', t, st, 3, 0, 'center', 1 - seg(t, st + 16, st + 26));
          this.cineSfx(S, st, 'passo' + i, () => window.SFX?.blip?.(180));
        });
        this.bdorRain(ctx, W, H, t, 0.9);
        this.finKicker(ctx, 40, top + 30, 'PASSOS NA CHUVA', seg(t, 6, 40), SAE_C);
        return;
      }
      // o Sae na luz do refletor, a bola no pé; o Rin do outro lado
      const u = t - cut;
      const k = easeIO(u / (S.dur - cut));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1.04, 1.12, k), shake: 0.4 });
      ctx.drawImage(this.finBg('bdor_pitch', 1280, 720, this.bdorPitchBg), 0, 0);
      ctx.fillStyle = 'rgba(2,6,14,0.3)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      this.cineShafts(ctx, 1130, 50, Math.atan2(510, -290), 700, 0.24, 4, '224,242,254', 0.1, t);
      this.bdorFloorGlow(ctx, 860, 566, 260, 'rgba(224,242,254,0.4)');
      this.bdorFloorGlow(ctx, 360, 566, 160, 'rgba(45,212,191,0.18)');
      // bolas espalhadas perto do Rin
      [[230, 572, 14], [470, 578, 13], [520, 560, 11], [180, 552, 10]].forEach(([bx, by, br], i) => this.ptdBall(ctx, bx, by, br, i));
      this.finRim(ctx, c.rinTr, 360, 566, 290, { dim: 0.3, dimTint: '0,12,18' }, '#5eead4', [1], 2);
      const ru = 290 / 36;
      this.wcdEyes(ctx, 360, 566 - 290 * 0.87 + SPRITE_MAPY(10.1) * ru, ru, { ring: '#2dd4bf', iris: '#042f2e', angry: true, look: 1, glow: 'rgba(45,212,191,0.5)', glowA: 0.6 });
      const wk = easeIO(seg(u, 0, 70));
      const sx = lerp(1180, 870, wk);
      const walking = u < 68;
      this.finRim(ctx, c.sae, sx, 566, 300, { animState: walking ? 'run' : 'idle', frame: walking ? WALKF(S.f, 8) : 45, flipX: walking, dim: 0.2, dimTint: '22,4,10' }, '#fb7185', [-1, 1], 2);
      // a bola rola até o pé dele → embaixadinhas → presa debaixo do sapato
      let bx;
      let by;
      if (u < 40) {
        bx = 470;
        by = 578;
      } else if (u < 96) {
        const p = ease(seg(u, 40, 96));
        bx = lerp(470, 840, p);
        by = lerp(578, 556, p);
      } else if (u < 230 && u > 140) {
        const j = (u - 140) / 30;
        bx = 846;
        by = 556 - Math.abs(Math.sin(j * Math.PI)) * (u < 200 ? 120 : 70);
      } else {
        bx = 840;
        by = 556;
      }
      this.ptdBall(ctx, bx, by, 13, Math.floor(u * 0.4));
      this.finSplashes(ctx, 100, 1180, 470, 700, t, 24);
      ctx.restore();
      this.bdorRain(ctx, W, H, t, 0.85);
      // painel: o olhar do Sae
      const kS = ease(seg(u, 8, 22)) * (1 - ease(seg(u, 120, 132)));
      if (kS > 0) {
        this.finPanel(ctx, [[680, top + 16], [W - 18, top + 16], [W - 18, top + 160], [664, top + 172]], () => {
          ctx.fillStyle = '#0c0306';
          ctx.fillRect(640, top, 660, 190);
          const ey = top + 96;
          const U = this.wcdEyeBand(ctx, c.sae, 975, ey, 720, { dim: 0.18, dimTint: '24,4,10' });
          this.wcdEyes(ctx, 975, ey, U, { ring: '#2aa198', iris: '#134e4a', half: true, lid: this.finShade(c.sae.skinColor || '#fbe6d8', -0.2), look: -1 });
        }, { dx: (1 - kS) * 700, border: '#fecdd3' });
      }
      // painel: o olhar do Rin
      const kR = ease(seg(u, 134, 148));
      if (kR > 0) {
        this.finPanel(ctx, [[18, top + 16], [600, top + 16], [584, top + 172], [18, top + 160]], () => {
          ctx.fillStyle = '#010608';
          ctx.fillRect(0, top, 620, 190);
          const ey = top + 96;
          const U = this.wcdEyeBand(ctx, c.rinTr, 300, ey, 720, { dim: 0.2, dimTint: '0,20,24' });
          this.wcdEyes(ctx, 300, ey, U, { ring: '#2dd4bf', iris: '#042f2e', line: '#010405', angry: true, look: 1, glow: 'rgba(45,212,191,0.6)', glowA: 0.8 });
        }, { dx: (1 - kR) * -640, border: '#99f6e4' });
      }
      if (u > 20) this.finKicker(ctx, W - 300, bot - 40, 'SAE ITOSHI', seg(u, 20, 50), SAE_C);
      this.cineFlash(ctx, W, H, 0.9 * (1 - seg(u, 0, 10)), '#000000');
    },

    // PLANO 5 — o mano a mano: o Sae passa por ele de novo e de novo (1 x 0 ... 10 x 0)
    bdorLic4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const R = [6, 50, 92, 128, 160, 188, 214, 238, 260, 282];
      const END = 312;
      const G = 566;
      let i = 0;
      for (let j = 0; j < R.length; j++) if (t >= R[j]) i = j;
      const passOf = (j) => R[j] + ((R[j + 1] ?? END) - R[j]) * 0.55;
      let score = 0;
      R.forEach((r, j) => {
        if (t >= passOf(j)) score = j + 1;
      });
      const lastPass = passOf(Math.max(0, score - 1));
      const pop = score > 0 ? 1 - seg(t, lastPass, lastPass + 10) : 0;
      const after = t >= END;
      ctx.save();
      const k = after ? easeIO(seg(t, END, S.dur)) : 0;
      this.cineCamera(ctx, W, H, { x: lerp(640, 640, k), y: lerp(380, 400, k), zoom: lerp(1.08, 1.2, k), shake: after ? 0.4 : 1.2 + pop * 5 });
      ctx.drawImage(this.finBg('bdor_pitch', 1280, 720, this.bdorPitchBg), 0, 0);
      ctx.fillStyle = 'rgba(2,6,14,0.32)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      this.cineShafts(ctx, 1130, 50, Math.atan2(510, -490), 760, 0.3, 4, '224,242,254', 0.08, t);
      this.bdorFloorGlow(ctx, 640, G, 380, 'rgba(224,242,254,0.32)');
      if (!after) {
        const L = (R[i + 1] ?? END) - R[i];
        const q = (t - R[i]) / L;
        const dir = i % 2 ? -1 : 1;
        const slideRound = i % 2 === 0;
        // o Sae passa por trás (mais longe), o Rin dá o bote pela frente
        const SG = G - 26;
        const RG = G + 30;
        const saeX = 640 + dir * lerp(-380, 380, q);
        const lunge = ease(seg(q, 0.24, 0.46));
        const rinX = 640 + dir * (60 - lunge * (slideRound ? 230 : 150));
        const rinPose = lunge > 0 ? (slideRound ? 'slide' : 'run') : 'idle';
        const over = Math.sin(seg(q, 0.3, 0.56) * Math.PI);
        const hop = slideRound ? over * 46 : over * 16;
        // linhas de velocidade e as sombras nos pés
        this.ptdSpeed(ctx, S, t, '#e0f2fe', 0.16, dir, 50, 18, top + 40, bot - 40, 4 + i);
        this.bdorFloorGlow(ctx, saeX, SG, 60, 'rgba(0,0,0,0.6)');
        this.finRim(ctx, c.sae, saeX, SG - hop, 270, { animState: 'run', frame: WALKF(S.f, 3), flipX: dir < 0, dim: 0.18, dimTint: '22,4,10' }, '#fb7185', [-1, 1], 2);
        const bx = saeX + dir * 30;
        let by = SG - 10 - hop * 0.6;
        if (slideRound) by -= over * 110;
        this.ptdBall(ctx, bx, by, 12, Math.floor(t * 0.5));
        this.bdorFloorGlow(ctx, rinX, RG, 70, 'rgba(0,0,0,0.6)');
        // só cai depois que o Sae já passou (antes o Sae aparecia "sentado" em cima dele)
        if (i === R.length - 1 && q > 0.72) this.bdorLying(ctx, c.rinTr, rinX - dir * 40, RG, 310, { dim: 0.3, dimTint: '0,12,18', rim: '#5eead4' });
        else this.finRim(ctx, c.rinTr, rinX, RG + (rinPose === 'slide' ? 12 : 0), 310, { animState: rinPose, frame: rinPose === 'run' ? 5 : 45, flipX: dir > 0, dim: 0.3, dimTint: '0,12,18' }, '#5eead4', [-1, 1], 2);
        this.finSplashes(ctx, 200, 1080, G - 30, G + 50, t, 26);
      } else {
        // o Rin caído na lama; o Sae em pé, a bola debaixo do sapato
        const ly = this.bdorLying(ctx, c.rinTr, 700, G + 6, 290, { dim: 0.32, dimTint: '0,12,18', rim: '#5eead4' });
        this.rincDrops(ctx, [ly.headX - 20, ly.headX + 40, 560, 640], ly.y - 30, G + 20, t, 3, 5);
        this.finRim(ctx, c.sae, 900, G, 300, { dim: 0.2, dimTint: '22,4,10' }, '#fb7185', [-1, 1], 2);
        this.ptdBall(ctx, 878, G - 10, 12, 0);
        this.finSplashes(ctx, 300, 1000, G - 10, G + 30, t, 20);
      }
      ctx.restore();
      this.bdorRain(ctx, W, H, t, 1);
      if (!after || t < END + 14) this.bdorTally(ctx, W / 2, top + 46, score, pop);
      if (after) {
        this.cineImpactText(ctx, `${score} x 0`, W / 2, top + 150, 130, SAE_C, seg(t, END + 10, END + 20), W * 0.6, -0.04);
        if (t >= END + 10) this.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, END + 10, END + 20)), '#fecdd3');
      }
      R.forEach((r, j) => this.cineSfx(S, passOf(j), 'passe' + j, () => window.SFX?.whoosh?.()));
      this.cineSfx(S, END + 10, 'dez', () => window.SFX?.kick?.(1));
    },

    // PLANO 6 — o Sae em pé sobre ele: "Perder dói? Ótimo." → e vai embora no escuro
    bdorLic5(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const leave = 300;
      const k = easeIO(t / S.dur);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(360, 350, k), zoom: lerp(1.0, 1.06, k), shake: 0.5 });
      ctx.fillStyle = '#010208';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      ctx.drawImage(this.finBg('bdor_pitch', 1280, 720, this.bdorPitchBg), 0, 90);
      ctx.fillStyle = 'rgba(2,6,14,0.35)';
      ctx.fillRect(-100, -100, W + 200, H + 200);
      this.cineGlow(ctx, 1130, 130, 320, 'rgba(224,242,254,0.4)');
      this.cineShafts(ctx, 1130, 130, Math.atan2(420, -330), 760, 0.32, 4, '224,242,254', 0.1, t);
      // o Sae, de contraluz
      if (t < leave) {
        this.cineGlow(ctx, 820, 250, 260, 'rgba(225,29,72,0.14)');
        const sz = 440;
        const su = sz / 36;
        this.finRim(ctx, c.sae, 820, 560, sz, { dim: 0.38, dimTint: '22,4,10' }, '#fb7185', [-1, 1], 3);
        this.wcdEyes(ctx, 820, 560 - sz * 0.87 + SPRITE_MAPY(10.1) * su, su, { ring: '#2aa198', iris: '#134e4a', half: true, lid: this.finShade(c.sae.skinColor || '#fbe6d8', -0.4), look: -1, shine: 0.7 });
        this.ptdBall(ctx, 846, 548, 15, 0);
      } else {
        const w = easeIO(seg(t, leave, S.dur));
        const sz = lerp(440, 190, w);
        const sf = lerp(560, 450, w);
        this.ptdBall(ctx, 846, 548, 15, 0);
        this.finRim(ctx, c.sae, lerp(820, 1010, w), sf, sz, { facing: 'back', animState: 'run', frame: WALKF(S.f, 9), dim: 0.38 + 0.4 * w, dimTint: '8,2,6', alpha: 1 - 0.7 * w }, '#fb7185', [-1, 1], 3);
      }
      ctx.restore();
      // o Rin caído em primeiro plano, encharcado
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + k * 0.03, shake: 0.6 });
      const ly = this.bdorLying(ctx, c.rinTr, 690, bot + 20, 480, { dim: 0.42, dimTint: '0,12,18', rim: '#14b8a6' });
      this.rincDrops(ctx, [300, 380, 480, 560], ly.y - 100, bot + 30, t, 4, 9);
      this.finSplashes(ctx, 60, 1220, bot - 40, bot + 20, t, 26);
      ctx.restore();
      this.bdorRain(ctx, W, H, t, 1);
      this.rincStamp(ctx, 'PERDER DÓI?', 330, top + 64, 52, '#fecdd3', t, 16, 2, 0, 'center', 1 - seg(t, 140, 152));
      this.rincStamp(ctx, 'ÓTIMO.', 330, top + 128, 62, SAE_C, t, 84, 3, 0, 'center', 1 - seg(t, 140, 152));
      // painel: os olhos frios do Sae
      const kE = ease(seg(t, 156, 170)) * (1 - ease(seg(t, 284, 296)));
      if (kE > 0) {
        this.finPanel(ctx, [[22, top + 16], [600, top + 16], [584, top + 176], [22, top + 164]], () => {
          ctx.fillStyle = '#0c0306';
          ctx.fillRect(0, top, 620, 200);
          const ey = top + 96;
          const U = this.wcdEyeBand(ctx, c.sae, 300, ey, 720, { dim: 0.2, dimTint: '24,4,10' });
          this.wcdEyes(ctx, 300, ey, U, { ring: '#2aa198', iris: '#134e4a', half: true, lid: this.finShade(c.sae.skinColor || '#fbe6d8', -0.2), look: 0, shine: 0.6 });
        }, { dx: (1 - kE) * -640, border: '#fecdd3' });
      }
      this.cineImpactText(ctx, 'FOME.', 400, top + 120, 104, SAE_C, seg(t, 300, 310) * (1 - seg(t, 380, 396)), 420, -0.06);
    },

    // PLANO 7 — de joelhos, a poça → o reflexo sorri → o olho do destruidor → o título
    bdorLic6(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.bdorCast();
      const cA = 70;
      const cB = 150;
      const cC = 300;
      if (t < cA) {
        const k = easeIO(t / cA);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: lerp(380, 400, k), zoom: lerp(1.08, 1.16, k), shake: 0.4 });
        ctx.drawImage(this.finBg('bdor_pitch', 1280, 720, this.bdorPitchBg), 0, 0);
        ctx.fillStyle = 'rgba(2,6,14,0.45)';
        ctx.fillRect(-100, -100, W + 200, H + 200);
        this.cineShafts(ctx, 640, -40, Math.PI / 2, 640, 0.3, 4, '224,242,254', 0.08, t);
        const size = 330;
        const kn = 470;
        const u = size / 36;
        const drop = (31.3 - 26.4) * u;
        // a poça e o reflexo
        const wy = 548;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(640, wy + 30, 330, 70, 0, 0, TAU);
        ctx.fillStyle = 'rgba(2,10,16,0.9)';
        ctx.fill();
        ctx.clip();
        ctx.translate(0, 2 * (kn + 6));
        ctx.scale(1, -1);
        ctx.globalAlpha = 0.35;
        this.zselKneel(ctx, c.rinTr, 640, kn, size, { dim: 0.45, dimTint: '0,20,26' });
        ctx.restore();
        this.finSplashes(ctx, 360, 920, wy, wy + 80, t, 14, '165,243,252');
        this.zselKneel(ctx, c.rinTr, 640, kn, size, { dim: 0.45, dimTint: '0,12,18', rim: '#14b8a6' });
        this.rincShade(ctx, c.rinTr, 640, kn + drop, size, 0.8);
        ctx.restore();
        this.bdorRain(ctx, W, H, t, 1);
        this.finKicker(ctx, 40, top + 30, 'SOZINHO DE NOVO', seg(t, 6, 40), RIN_C);
        return;
      }
      if (t < cB) {
        // o rosto refletido na poça: o sorriso aparece
        const u = t - cA;
        const grin = u >= 36;
        ctx.fillStyle = '#01070b';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1 + u * 0.0012, shake: 0.4 });
        const ch = grin ? c.rinGrin : c.rinTr;
        const r = this.finHead(ctx, ch, 640, 300, 900, { dim: 0.4, dimTint: '0,24,30' });
        this.wcdEyes(ctx, 640, 300, r.u, { ring: '#2dd4bf', iris: '#0f766e', line: '#010405', angry: grin, half: !grin, lid: this.finShade(c.rinTr.skinColor || '#f8dcc4', -0.45), glow: 'rgba(45,212,191,0.6)', glowA: grin ? 0.9 : 0.15, shine: 0.8 });
        ctx.restore();
        // a água por cima: tom, ondas e os pingos
        ctx.fillStyle = 'rgba(4,36,48,0.32)';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const ph = ((t * 0.02 + rnd(i, 61)) % 1);
          const x = 180 + rnd(i + Math.floor(t * 0.02 + rnd(i, 61)), 62) * 920;
          const y = top + 60 + rnd(i + Math.floor(t * 0.02 + rnd(i, 61)), 63) * (bot - top - 120);
          ctx.strokeStyle = `rgba(165,243,252,${0.5 * (1 - ph)})`;
          ctx.beginPath();
          ctx.ellipse(x, y, 10 + ph * 120, 4 + ph * 44, 0, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
        // borda da poça (vinheta própria guardada: a cineVignette guarda só uma por vez)
        ctx.drawImage(this.finBg('bdor_puddle_vig', 1280, 720, this.bdorPuddleVig), 0, 0, W, H);
        if (grin) this.rincStamp(ctx, 'HAH.', 1040, bot - 100, 60, '#99f6e4', u, 40, 3);
        this.cineFlash(ctx, W, H, 1 - seg(u, 0, 8), '#000000');
        return;
      }
      // o olho do destruidor (e o título por cima, no fim)
      const u = t - cB;
      const hit = 86;
      const k = easeIO(u / (S.dur - cB));
      this.ptdCloseBg(ctx, S, '#14b8a6', 640);
      this.ptdRays(ctx, 640, 330, W * 1.15, '#14b8a6', 0.14 + 0.2 * seg(u, 20, 80), u * 0.004, 50, 0.028);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 340, zoom: 1 + k * 0.1, shake: 0.6 + (u >= hit ? 7 * (1 - seg(u, hit, hit + 26)) : 0) });
      const U = this.wcdEyeBand(ctx, c.rinGrin, 640, 330, 1300, { dim: 0.12, dimTint: '0,20,24' });
      this.wcdEyes(ctx, 640, 330, U, { ring: '#5eead4', iris: '#0f766e', line: '#010405', angry: true, glow: 'rgba(45,212,191,0.9)', glowA: 0.6 + 0.4 * seg(u, 20, 60), shine: 1, reflect: '#ccfbf1' });
      // faíscas verde-água subindo
      ctx.fillStyle = '#99f6e4';
      for (let i = 0; i < 26; i++) {
        const ph = (u * (0.8 + rnd(i, 71)) + rnd(i, 72) * 300) % 300;
        ctx.globalAlpha = (1 - ph / 300) * 0.8;
        ctx.fillRect(Math.round(200 + rnd(i, 73) * 880), Math.round(620 - ph * 2), 5, 5);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.fillStyle = 'rgba(0,8,10,0.82)';
      ctx.fillRect(0, top, W, 84);
      ctx.fillRect(0, bot - 120, W, 120);
      const fadeT = 1 - seg(t, cC, cC + 14);
      this.rincStamp(ctx, 'NA COPA DO MUNDO...', 640, top + 44, 46, '#ccfbf1', u, 14, 2, W * 0.8, 'center', fadeT);
      this.ptdWord(ctx, 'EU DESTRUO ELE.', 640, bot - 62, 104, RIN_C, seg(u, hit, hit + 10), fadeT, -0.04, W * 0.8);
      if (u >= hit) this.cineFlash(ctx, W, H, 0.38 * (1 - seg(u, hit, hit + 12)), '#ccfbf1');
      this.cineSfx(S, cB + hit, 'destruo', () => window.SFX?.kick?.(1));
      if (t >= cC) {
        const tk = seg(t, cC, cC + 30);
        ctx.fillStyle = `rgba(0,4,6,${0.78 * tk})`;
        ctx.fillRect(0, 0, W, H);
        this.cineTitleCard(ctx, W, 360, tk, { kicker: 'RIN ITOSHI • O DESTRUIDOR ACORDOU', title: 'A LIÇÃO DO SAE', sub: 'Próxima parada: a Copa do Mundo.', color: RIN_C });
        this.cineSfx(S, cC + 4, 'titulo', () => window.SFX?.kick?.(0.8));
      }
    }
  });

  // ==========================================================================
  // REGISTRO
  // ==========================================================================
  const dry = (scene, phase, name, t) =>
    function () {
      this.bdorDry(scene, phase, name, t);
    };
  const plan = (scene, phase, name, ts) => ts.map((t) => dry(scene, phase, name, t));
  const bg = (key, fn) =>
    function () {
      this.finBg(key, 1280, 720, this[fn]);
    };

  const G1 = 'bola_de_ouro_discurso';
  const GALA = ['bdorGala0', 'bdorGala1', 'bdorGala2', 'bdorGala3', 'bdorGala4'];
  const warmGala = [
    bg('bdor_stage', 'bdorStageBg'),
    ...plan(G1, 0, 'bdorGala0', [160, 200, 240, 280]),
    ...plan(G1, 1, 'bdorGala1', [20, 120, 260, 340]),
    ...plan(G1, 2, 'bdorGala2', [60, 140, 200, 260]),
    ...plan(G1, 3, 'bdorGala3', [40, 180, 230, 330]),
    bg('bdor_aisle', 'bdorAisleBg'),
    ...plan(G1, 4, 'bdorGala4', [30, 90, 150, 200, 250])
  ];
  const G2 = 'rin_sae_licao';
  const LIC = ['bdorLic0', 'bdorLic1', 'bdorLic2', 'bdorLic3', 'bdorLic4', 'bdorLic5', 'bdorLic6'];
  const warmLic = [
    ...plan(G2, 0, 'bdorLic0', [150, 210, 260]),
    ...plan(G2, 1, 'bdorLic1', [20, 220, 300, 370, 390]),
    bg('bdor_pitch', 'bdorPitchBg'),
    ...plan(G2, 2, 'bdorLic2', [12, 22, 40, 200, 230, 260]),
    ...plan(G2, 3, 'bdorLic3', [10, 30, 50, 70, 140, 170, 200, 300]),
    ...plan(G2, 4, 'bdorLic4', [10, 20, 30, 60, 100, 300, 330]),
    ...plan(G2, 5, 'bdorLic5', [20, 200, 310, 340, 370]),
    ...plan(G2, 6, 'bdorLic6', [20, 90, 120, 200, 320])
  ];
  // Pré-montagem do 1º plano (tela preta por alguns quadros, um item pesado por quadro)
  const PRE = {
    [G1]: [],
    [G2]: [bg('fin_hall', 'finHallBg'), ...plan(G2, 0, 'bdorLic0', [30, 60, 90, 120])]
  };
  const draw = (names, warm, pre) =>
    function (ctx, S) {
      if (S.phase === 0) {
        const run = `${this.sakugaType}|${this._cineRun}`;
        if (this._bdorPreRun !== run) {
          this._bdorPreRun = run;
          this._bdorPreIdx = 0;
          this._bdorPreDone = S.t < 30 && pre.length ? null : -999;
        }
        if (this._bdorPreDone === null) {
          if (this._bdorPreIdx < pre.length) {
            pre[this._bdorPreIdx++].call(this);
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, S.W, S.H);
            return;
          }
          this._bdorPreDone = S.t;
        }
      }
      this[names[S.phase]](ctx, S);
      this.bdorWarm(S, warm);
      this.foxcGrain(ctx, S.W, S.H, 0.05);
      if (S.phase === 0 && this._bdorPreDone > -999) {
        const a = 1 - seg(S.t, this._bdorPreDone, this._bdorPreDone + 14);
        if (a > 0) this.cineFlash(ctx, S.W, S.H, a, '#000000');
      }
    };

  CE.registerCine(G1, {
    phases: [320, 380, 330, 380, 300],
    music: 'victory',
    title: '🥇 A NOITE DA BOLA DE OURO',
    tags: ['PLANO 1 • O TROFÉU', 'PLANO 2 • O DISCURSO', 'PLANO 3 • A FOME', 'PLANO 4 • A ÚLTIMA FILEIRA', 'PLANO 5 • A PORTA DOS FUNDOS'],
    subs: [
      [
        { from: 12, to: 150, who: 'NARRADOR', text: 'Paris. A Bola de Ouro.', color: NARR_C },
        { from: 164, to: 318, who: 'APRESENTADORA', text: '"O melhor do mundo!"', color: HOST_C }
      ],
      [
        { from: 10, to: 196, who: 'VOCÊ', text: '"Eu entrei no Blue Lock como o nº 299."', color: YOU_C },
        { from: 198, to: 378, who: 'VOCÊ', text: '"Perdi. Me chamaram de sem talento."', color: YOU_C }
      ],
      [
        { from: 8, to: 190, who: 'VOCÊ', text: '"Então eu devorei um por um até aqui."', color: YOU_C },
        { from: 192, to: 330, who: 'VOCÊ', text: '"E eu ainda tô com fome."', color: YOU_C }
      ],
      [
        { from: 10, to: 200, who: 'NARRADOR', text: 'Paris inteira aplaude de pé.', color: NARR_C },
        { from: 206, to: 380, who: 'RIN ITOSHI', text: '(Esse troféu era pra ser meu.)', color: RIN_C }
      ],
      [{ from: 10, to: 236, who: 'VOCÊ', text: '"Quem quiser este troféu... que venha tomar."', color: YOU_C }]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw(GALA, warmGala, PRE[G1])
  });

  CE.registerCine(G2, {
    phases: [320, 400, 340, 380, 450, 400, 430],
    music: 'dread',
    title: '🌧️ A LIÇÃO DO SAE',
    tags: ['PLANO 1 • O CORREDOR', 'PLANO 2 • GAROTO CHORÃO', 'PLANO 3 • UMA DA MANHÃ', 'PLANO 4 • JOGA COMIGO', 'PLANO 5 • 10 x 0', 'PLANO 6 • A LIÇÃO', 'PLANO 7 • O DESTRUIDOR'],
    subs: [
      [
        { from: 12, to: 200, who: 'SAE ITOSHI', text: '"Saindo no meio do discurso, Rin?"', color: SAE_C },
        { from: 204, to: 320, who: 'RIN ITOSHI', text: '"Não enche."', color: RIN_C }
      ],
      [
        { from: 10, to: 186, who: 'SAE ITOSHI', text: '"Você é só um garoto chorão..."', color: SAE_C },
        { from: 188, to: 352, who: 'SAE ITOSHI', text: '"...que não aceita perder."', color: SAE_C }
      ],
      [
        { from: 10, to: 172, who: 'NARRADOR', text: 'Uma da manhã. Campo vazio.', color: NARR_C },
        { from: 174, to: 340, who: 'RIN ITOSHI', text: '(De novo. De novo. DE NOVO.)', color: RIN_C }
      ],
      [
        { from: 120, to: 246, who: 'SAE ITOSHI', text: '"Joga comigo."', color: SAE_C },
        { from: 250, to: 380, who: 'RIN ITOSHI', text: '"Vou te esmagar."', color: RIN_C }
      ],
      [
        { from: 16, to: 112, who: 'SAE ITOSHI', text: '"Lento."', color: SAE_C },
        { from: 116, to: 262, who: 'SAE ITOSHI', text: '"Previsível. De novo."', color: SAE_C },
        { from: 270, to: 450, who: 'RIN ITOSHI', text: '(Por que eu não alcanço?!)', color: RIN_C }
      ],
      [
        { from: 10, to: 150, who: 'SAE ITOSHI', text: '"Perder dói? Ótimo."', color: SAE_C },
        { from: 152, to: 372, who: 'SAE ITOSHI', text: '"Para de chorar e transforma isso em fome."', color: SAE_C }
      ],
      [
        { from: 14, to: 130, who: 'RIN ITOSHI', text: '(...Fome.)', color: RIN_C },
        { from: 150, to: 344, who: 'RIN ITOSHI', text: '"Aproveita o troféu enquanto pode."', color: RIN_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    draw: draw(LIC, warmLic, PRE[G2])
  });
})();
