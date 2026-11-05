// ============================================================================
// FLUXOS COM CENA PRÓPRIA (cine_fluxos_b) — ver js/cine_kit.js
// Cada Fluxo abaixo tem a sua ativação (3 planos, ~6 s) tocada pelo [G] no meio da partida
// (CutsceneEngine.playFlowCutscene registra this.flowCfg = { flow, you, youName }):
//   flow_fl_incomum_maestro  • o campo vira planta azul, linhas até cada livre, a regência
//   flow_fl_raro_muralha     • placas de ferro travando no corpo, o tranco, a muralha subindo
//   flow_fl_raro_ginga       • o monstro de sombra acorda e dança a ginga do seu lado
//   flow_fl_epico_preguica   • o bocejo, o céu em câmera lenta, a bola morre no pé, CLEAR
//   flow_fl_epico_xadrez     • o gramado vira tabuleiro, três lances à frente, XEQUE
//   flow_fl_lendario_bigbang • células explodindo em cadeia até o BIG BANG rosa
//   flow_fl_mitico_godspeed  • o mundo congela, você é um risco amarelo, o cronômetro racha
//   flow_fl_wc_metavision    • o olho no céu, a grade 4D, o campo encaixa como quebra-cabeça
// Fluxo combinado ('a+b'): mostra o nome dos dois no letreiro; tema e cor são os desta cena.
// Helpers no CutsceneEngine com o prefixo "fxb". Bonecos e texturas ficam guardados prontos (fxbEntry/fxbBg)
// e são montados com orçamento por quadro + aquecimento (fxbWarm): sem travada nos cortes.
// Usa alguns helpers da cine_partida/cine_final/cine_rin (ptdEyes, ptdRays, ptdBall, finKicker, rincStamp).
// Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas do boneco, sem tela piscando
// (um flash só por impacto), olhos de close em pixel art, frame 0 = piscada (não usar).
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
  const back = (x) => {
    x = clamp(x);
    const c1 = 1.70158;
    return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mod = (a, n) => ((a % n) + n) % n;
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  const rgbOf = (hex) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (m) return [1, 2, 3].map((i) => parseInt(m[i], 16));
    return [0, 245, 212];
  };
  const rgba = (hex, a) => `rgba(${rgbOf(hex).join(',')},${a})`;
  const mix = (a, b, k) => {
    const A = rgbOf(a);
    const B = rgbOf(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };

  const YOU = '#00f5d4';
  const KIT_BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const KIT_RIVAL = { jerseyPrimary: '#7f1d1d', jerseySecondary: '#f8fafc' };
  const RUN = [3, 7, 11, 15];
  const AURA = [5, 9, 13];
  const runF = (t, sp = 4) => RUN[Math.floor(t / sp) % RUN.length];
  const auraF = (t) => AURA[Math.floor(t / 6) % AURA.length];

  // ==========================================================================
  // HELPERS COMUNS (prefixo fxb)
  // ==========================================================================
  Object.assign(CE, {
    // ---------------------------------------------------------------- cache com orçamento
    // Montar um boneco custa 1-3 ms: em vez de montar tudo no 1º quadro, cada quadro tem um
    // orçamento (4 ms no plano que está passando, 2 ms no aquecimento dos próximos). O que não
    // couber aparece no quadro seguinte (no começo a cena sai do preto, então não se vê).
    fxbBudget() {
      const f = this.sakugaFrame || 0;
      if (this._fxbBF !== f) {
        this._fxbBF = f;
        this._fxbBMs = 0;
      }
      // (no 1º quadro, que é todo preto, o aquecimento pode usar mais)
      if (this._fxbWarming) return (this._fxbBoot ? 6 : 2) - this._fxbBMs;
      if (!this.sakugaActive) return Infinity;
      return 4 - this._fxbBMs;
    },
    fxbCharge(ms) {
      this.fxbBudget();
      this._fxbBMs += ms;
    },
    fxbEmpty() {
      if (!this._fxbEmptyCv) {
        this._fxbEmptyCv = document.createElement('canvas');
        this._fxbEmptyCv.width = 1;
        this._fxbEmptyCv.height = 1;
      }
      return this._fxbEmptyCv;
    },
    // Fundo/textura guardado (sempre monta no quadro de verdade; no aquecimento, só com orçamento)
    fxbBg(key, w, h, fn) {
      const cache = this._fxbBgs || (this._fxbBgs = new Map());
      let cv = cache.get(key);
      if (cv) return cv;
      if (this._fxbWarming && this.fxbBudget() <= 0) {
        this._fxbStarved = true;
        return this.fxbEmpty();
      }
      const t0 = performance.now();
      cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      fn.call(this, cv.getContext('2d'), w, h);
      if (cache.size > 60) cache.delete(cache.keys().next().value);
      cache.set(key, cv);
      this.fxbCharge(performance.now() - t0);
      return cv;
    },
    // Boneco guardado (como o ptdEntry, mas com orçamento). Devolve null se não coube agora
    fxbEntry(char, base, o, must = false) {
      const cache = this._fxbSpr || (this._fxbSpr = new Map());
      const key = [
        base, this.ptdCharKey(char), o.facing || 'front', o.animState || 'idle', o.frame || 45, o.flipX ? 1 : 0, o.tint || '', o.dim || 0,
        o.dimTint || '', o.showAura ? 1 : 0, o.showAura ? o.auraColor || '' : '', o.rim || '', o.rimD || 0
      ].join('#');
      let e = cache.get(key);
      if (e) return e;
      if (!must && this.fxbBudget() <= 0) {
        this._fxbStarved = true;
        return null;
      }
      if (o.rim) {
        const plain = Object.assign({}, o, { rim: null });
        const body = this.fxbEntry(char, base, plain, true);
        const sil = this.fxbEntry(char, base, Object.assign({}, plain, { tint: o.rim, dim: 0, showAura: false }), true);
        const t0 = performance.now();
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
        this.fxbCharge(performance.now() - t0);
      } else {
        const t0 = performance.now();
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
        this.fxbCharge(performance.now() - t0);
      }
      if (cache.size > 260) cache.delete(cache.keys().next().value);
      cache.set(key, e);
      return e;
    },
    // Boneco com os pés em (x, feet); base de 180 ampliada sem suavizar (menores: base menor)
    fxbSpr(ctx, char, x, feet, size, o = {}) {
      const base = size >= 180 ? 180 : Math.max(36, 36 * Math.ceil(size / 36));
      const e = this.fxbEntry(char, base, o);
      if (!e) return;
      const k = size / base;
      ctx.save();
      ctx.imageSmoothingEnabled = size < base;
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.drawImage(e.cv, Math.round(x - size / 2 - e.pad * k), Math.round(feet - size * 0.87 - e.pad * k), e.cv.width * k, e.cv.height * k);
      ctx.restore();
    },
    fxbHead(ctx, char, cx, eyeY, size, o = {}) {
      const u = size / 36;
      const top = eyeY - 10 * u;
      this.fxbSpr(ctx, char, cx, top + size * 0.87, size, o);
      return { u, top };
    },
    fxbCrop(ctx, char, o, ux, uy, uw, uh, dx, dy, dw, dh) {
      const e = this.fxbEntry(char, 180, o || {});
      if (!e) return;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      // (uy em unidades do corpo antigo: SPRITE_MAPY leva pro boneco atual — chibi)
      ctx.drawImage(e.cv, e.pad + ux * 5, e.pad + SPRITE_MAPY(uy) * 5, uw * 5, uh * 5, dx, dy, dw, dh);
      ctx.restore();
    },
    fxbFaceCrop(ctx, char, dx, dy, dw, ux0, uy0, uw, uh, eyeOpts = {}) {
      const U = dw / uw;
      this.fxbCrop(ctx, char, {}, ux0, uy0, uw, uh, dx, dy, dw, uh * U);
      this.ptdEyes(ctx, char, dx + (18 - ux0) * U, dy + (10 - uy0) * U, U, eyeOpts);
      return U;
    },
    // Granulado de filme (3 texturas pequenas ampliadas; montar custa ~1 ms)
    fxbGrain(ctx, W, H, alpha = 0.05) {
      if (!this._fxbNoise) {
        this._fxbNoise = [0, 1, 2].map((n) => {
          const cv = document.createElement('canvas');
          cv.width = 256;
          cv.height = 150;
          const g = cv.getContext('2d');
          const img = g.createImageData(256, 150);
          let seed = 11 + n * 7919;
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
      if (ctx === this._fxbDummy) return;
      const f = this.sakugaFrame || 0;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this._fxbNoise[f % 3], (f * 37) % 32, (f * 23) % 22, 224, 128, 0, 0, W, H);
      ctx.restore();
    },
    // Aquecimento: desenha os próximos momentos da cena num canvas minúsculo (só para montar os
    // bonecos/fundos guardados), dentro do orçamento; se faltou orçamento, tenta de novo depois
    fxbWarm(fns, S, extra) {
      const durs = this.getSakugaPhaseDurations();
      const key = `${this.sakugaType}|${this._cineRun}`;
      if (!this._fxbW || this._fxbW.key !== key) {
        const list = (extra || []).slice();
        for (let p = 0; p < fns.length; p++) for (let t = 0; t < durs[p]; t += 10) list.push([p, t]);
        this._fxbW = { key, list, i: 0 };
      }
      const w = this._fxbW;
      this._fxbBoot = S.phase === 0 && S.t < 1;
      if (!this._fxbDummy) {
        const cv = document.createElement('canvas');
        cv.width = 2;
        cv.height = 2;
        this._fxbDummy = cv.getContext('2d');
      }
      const g = this._fxbDummy;
      this._fxbWarming = true;
      try {
        while (w.i < w.list.length && this.fxbBudget() > 0) {
          const it = w.list[w.i];
          if (typeof it === 'function') {
            const t0 = performance.now();
            it.call(this, g, S);
            this.fxbCharge(performance.now() - t0);
            w.i++;
            continue;
          }
          const [p, t] = it;
          if (p < S.phase || (p === S.phase && t <= S.t + 3)) {
            w.i++;
            continue;
          }
          this._fxbStarved = false;
          const t0 = performance.now();
          const before = this._fxbBMs;
          g.save();
          fns[p].call(this, g, Object.assign({}, S, { t, phase: p, dur: durs[p], p: t / durs[p] }));
          g.restore();
          // o desenho no canvas minúsculo também custa: conta o que não foi contado nas montagens
          this.fxbCharge(Math.max(0, performance.now() - t0 - (this._fxbBMs - before)));
          if (this._fxbStarved) break;
          w.i++;
        }
      } finally {
        this._fxbWarming = false;
      }
    },

    // A config do Fluxo: o da partida (this.flowCfg) ou, no teste, o próprio do banco
    fxbCfg(id) {
      const live = this.flowCfg && this.flowCfg.flow ? this.flowCfg : null;
      const key = `${id}|${this._cineRun || 0}|${live ? live.flow.id || live.flow.name : '-'}`;
      if (this._fxbCfgC && this._fxbCfgC.key === key) return this._fxbCfgC.v;
      const own = (window.FLOWS_DB || []).find((f) => f.id === id) || { id, name: id, color: YOU, rarity: 'RARO', duration: 10 };
      const fl = live ? live.flow : own;
      const tier = window.RARITY_TIERS?.[fl.rarity] || window.RARITY_TIERS?.[own.rarity];
      const v = {
        own,
        fl,
        color: own.color || YOU,
        name: String(fl.name || own.name || 'Fluxo').toUpperCase(),
        you: Object.assign({}, (live && live.you) || this.cineYou(KIT_BL)),
        youName: String((live && live.youName) || window.App?.state?.profile?.name || 'Você').toUpperCase(),
        rarity: tier ? String(tier.name).replace(/\s*\(.*\)/, '').toUpperCase() : '',
        rarityColor: tier?.color || own.color,
        desc: window.describeFlow ? window.describeFlow(fl) : fl.desc || '',
        dur: fl.duration || own.duration || 10
      };
      this._fxbCfgC = { key, v };
      return v;
    },
    // Companheiro/rival com o uniforme certo
    fxbMate(id, kit) {
      return this.cineChar(id, Object.assign({}, kit));
    },
    fxbKit(you) {
      return { jerseyPrimary: you.jerseyPrimary || KIT_BL.jerseyPrimary, jerseySecondary: you.jerseySecondary || KIT_BL.jerseySecondary };
    },
    // Som que não toca durante o aquecimento
    fxbSfx(S, at, id, fn) {
      if (this._ptdWarming || this._fxbWarming) return;
      this.cineSfx(S, at, id, fn);
    },
    // Quebra o nome em 2 linhas: no " + " (Fluxo combinado) ou no espaço do meio
    fxbSplit(name, max = 22) {
      const plus = name.indexOf(' + ');
      if (plus > 0) return [name.slice(0, plus), '+ ' + name.slice(plus + 3)];
      return this.ptdSplit(name, max);
    },
    // Boneco girado em volta do meio do corpo
    fxbSprRot(ctx, char, x, feet, size, rot, o = {}) {
      ctx.save();
      ctx.translate(x, feet - size * 0.42);
      ctx.rotate(rot);
      this.fxbSpr(ctx, char, 0, size * 0.42, size, o);
      ctx.restore();
    },
    // Letreiro final: raridade, o NOME do Fluxo carimbado letra a letra na cor dele, os bônus
    // t = quadros desde que o letreiro começou
    fxbTitle(ctx, S, t, o) {
      if (t < 0) return;
      const { W } = S;
      const c = o.cfg;
      const x = o.x ?? W / 2;
      const y = o.y;
      const lines = this.fxbSplit(c.name, 22);
      const big = o.size || (lines.length > 1 ? 60 : 80);
      const lh = big * 0.98;
      const y0 = y - ((lines.length - 1) * lh) / 2;
      // faixa escura atrás (legibilidade)
      if (o.band !== false) {
        const k = ease(seg(t, 0, 10));
        const bh = lines.length * lh + 120;
        ctx.save();
        ctx.globalAlpha = 0.78 * k;
        const g = ctx.createLinearGradient(0, y0 - lh / 2 - 60, 0, y0 - lh / 2 - 60 + bh);
        g.addColorStop(0, 'rgba(2,6,23,0)');
        g.addColorStop(0.25, 'rgba(2,6,23,0.92)');
        g.addColorStop(0.8, 'rgba(2,6,23,0.92)');
        g.addColorStop(1, 'rgba(2,6,23,0)');
        ctx.fillStyle = g;
        if (o.maxW) ctx.fillRect(x - o.maxW / 2 - 40, y0 - lh / 2 - 60, o.maxW + 80, bh);
        else ctx.fillRect(0, y0 - lh / 2 - 60, W, bh);
        ctx.restore();
      }
      const kick = `✦ FLUXO ${c.rarity} ✦`;
      this.finKicker(ctx, x, y0 - lh / 2 - 20, kick, seg(t, 0, 16), c.rarityColor, 'center');
      let wMax = 0;
      let fsUsed = big;
      lines.forEach((ln, i) => {
        const st = this.rincStamp(ctx, ln, x, y0 + i * lh, big, o.color, t, 3 + i * 7, 1.4, o.maxW || W * 0.9);
        if (st) {
          wMax = Math.max(wMax, st.w);
          fsUsed = st.fs;
        }
      });
      const ly = y0 + (lines.length - 1) * lh + fsUsed * 0.6;
      const lk = ease(seg(t, 12, 34));
      if (lk > 0 && wMax) {
        ctx.fillStyle = '#020617';
        ctx.fillRect(x - (wMax / 2) * lk - 2, ly - 2, wMax * lk + 4, 9);
        ctx.fillStyle = o.color;
        ctx.fillRect(x - (wMax / 2) * lk, ly, wMax * lk, 5);
      }
      // os bônus numa linha só + a duração
      const sk = seg(t, 22, 40);
      if (sk > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, sk * 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let fs = 17;
        const txt = `${c.desc}${c.desc ? '   •   ' : ''}⏱ ${c.dur} SEGUNDOS`;
        ctx.font = `italic 800 ${fs}px "Segoe UI", sans-serif`;
        while (fs > 11 && ctx.measureText(txt).width > (o.maxW || W * 0.9) * 0.96) {
          fs--;
          ctx.font = `italic 800 ${fs}px "Segoe UI", sans-serif`;
        }
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(2,6,23,0.9)';
        ctx.strokeText(txt, x, ly + 30 + (1 - ease(sk)) * 10);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(txt, x, ly + 30 + (1 - ease(sk)) * 10);
        ctx.restore();
      }
    },

    // ---------------------------------------------------------------- campo em perspectiva
    // Mundo em metros: X ao longo do campo (-52,5..52,5), Y na largura (-34 perto .. 34 longe).
    // cam = { cx, hy (horizonte), f, h (altura), d (distância ao meio), x0 }
    fxbProj(cam, X, Y) {
      const Z = cam.d + Y;
      const k = cam.f / Z;
      return [cam.cx + (X - (cam.x0 || 0)) * k, cam.hy + cam.h * k, k];
    },
    fxbLine(ctx, cam, pts, n = 1) {
      ctx.beginPath();
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[i + 1];
        for (let j = 0; j <= n; j++) {
          const [sx, sy] = this.fxbProj(cam, lerp(ax, bx, j / n), lerp(ay, by, j / n));
          if (i === 0 && j === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
      }
    },
    // As linhas do campo (projetadas)
    fxbPitchLines(g, cam) {
      const L = 52.5;
      const Wd = 34;
      this.fxbLine(g, cam, [[-L, -Wd], [L, -Wd], [L, Wd], [-L, Wd], [-L, -Wd]], 8);
      g.stroke();
      this.fxbLine(g, cam, [[0, -Wd], [0, Wd]], 6);
      g.stroke();
      [-1, 1].forEach((s) => {
        this.fxbLine(g, cam, [[s * L, -20.15], [s * (L - 16.5), -20.15], [s * (L - 16.5), 20.15], [s * L, 20.15]], 4);
        g.stroke();
        this.fxbLine(g, cam, [[s * L, -9.15], [s * (L - 5.5), -9.15], [s * (L - 5.5), 9.15], [s * L, 9.15]], 2);
        g.stroke();
      });
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * TAU;
        const [sx, sy] = this.fxbProj(cam, Math.cos(a) * 9.15, Math.sin(a) * 9.15);
        if (i) g.lineTo(sx, sy);
        else g.moveTo(sx, sy);
      }
      g.stroke();
    },
    // Faixa de torcida (pixels nas cores dos dois times), pronta como textura que se repete
    fxbCrowdTile(hc = '#38bdf8', ac = '#ef4444', rows = 13) {
      return this.fxbBg(`fxbCrowd|${hc}|${ac}|${rows}`, 320, rows * 12, (g) => this.ptdCrowd(g, 0, 0, 320, rows, hc, ac, 10));
    },
    fxbTile(ctx, cv, x0, y, w, h, off = 0) {
      if (cv.width < 2) return;
      ctx.save();
      ctx.translate(x0 - mod(off, cv.width), y);
      ctx.fillStyle = ctx.createPattern(cv, 'repeat');
      ctx.fillRect(0, 0, w + cv.width, h);
      ctx.restore();
    },
    // Placa de publicidade (texto repetido)
    fxbBoardTile(text, bg, sq) {
      return this.fxbBg(`fxbBoard|${text}|${bg}|${sq}`, 300, 22, (g) => {
        g.fillStyle = bg;
        g.fillRect(0, 0, 300, 22);
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(0, 0, 300, 3);
        g.fillStyle = sq;
        g.fillRect(10, 4, 14, 14);
        g.font = '900 13px "Segoe UI", sans-serif';
        g.textBaseline = 'middle';
        g.fillStyle = 'rgba(248,250,252,0.85)';
        g.fillText(text, 34, 12, 256);
      });
    },
    // Estádio + gramado (noite), a planta azul (blueprint) ou só o gramado no espaço ('space'),
    // desenhado direto (com as texturas pequenas guardadas: nada grande para montar)
    fxbPitch(g, style, W, H, cam, accent = '#22d3ee') {
      const L = 52.5;
      const Wd = 34;
      const [, farY] = this.fxbProj(cam, 0, Wd);
      const blue = style === 'blueprint';
      const nearY = Math.max(-Wd - 30, 3 - cam.d);
      const m = this.ptdMap(this.ptdTheme());
      g.save();
      if (style === 'space') {
        // só o gramado, flutuando (sem céu nem arquibancada), com a borda acesa
        g.save();
        this.fxbLine(g, cam, [[-L - 4, -Wd - 4], [L + 4, -Wd - 4], [L + 4, Wd + 4], [-L - 4, Wd + 4]], 6);
        g.closePath();
        g.clip();
        g.fillStyle = m.grass1;
        g.fillRect(-200, farY - 10, W + 400, H - farY + 400);
        g.fillStyle = m.grass2;
        for (let i = 0; i < 14; i += 2) {
          const x0 = -70 + i * 10;
          this.fxbLine(g, cam, [[x0, nearY], [x0 + 10, nearY], [x0 + 10, Wd + 4], [x0, Wd + 4]], 1);
          g.fill();
        }
        g.fillStyle = 'rgba(2,6,23,0.3)';
        g.fillRect(-200, farY - 10, W + 400, H - farY + 400);
        g.strokeStyle = 'rgba(241,245,249,0.8)';
        g.lineWidth = 3;
        this.fxbPitchLines(g, cam);
        g.restore();
        g.strokeStyle = rgba(accent, 0.8);
        g.lineWidth = 4;
        this.fxbLine(g, cam, [[-L - 4, -Wd - 4], [L + 4, -Wd - 4], [L + 4, Wd + 4], [-L - 4, Wd + 4], [-L - 4, -Wd - 4]], 6);
        g.stroke();
        g.restore();
        return;
      }
      // céu / teto
      this.cineGradient(g, -100, -100, W + 200, farY + 100, [[0, blue ? '#020c1a' : '#020617'], [1, blue ? '#062a44' : '#152a55']]);
      // arquibancada
      const sTop = farY - 170;
      if (blue) {
        g.fillStyle = '#04182c';
        g.fillRect(-100, sTop, W + 200, farY - sTop);
        g.strokeStyle = rgba(accent, 0.22);
        g.lineWidth = 1;
        g.beginPath();
        for (let y = sTop; y < farY; y += 12) {
          g.moveTo(-100, y);
          g.lineTo(W + 100, y);
        }
        for (let x = 0; x < W; x += 64) {
          g.moveTo(x, sTop);
          g.lineTo(x, farY);
        }
        g.stroke();
        g.strokeStyle = rgba(accent, 0.6);
        g.lineWidth = 2;
        g.strokeRect(-102, sTop, W + 204, farY - sTop);
      } else {
        for (let x = 160; x < W; x += 480) {
          this.cineGlow(g, x, sTop - 60, 170, 'rgba(255,255,255,0.5)');
          g.fillStyle = '#f8fafc';
          for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) g.fillRect(x - 36 + c * 12, sTop - 74 + r * 12, 8, 8);
        }
        g.fillStyle = '#0b1324';
        g.fillRect(-100, sTop, W + 200, farY - sTop);
        this.fxbTile(g, this.fxbCrowdTile('#38bdf8', '#ef4444', 12), -100, sTop + 6, W + 200, 144);
        this.fxbTile(g, this.fxbBoardTile('BLUE LOCK • PROJETO', '#0b1d4d', '#1d4ed8'), -100, farY - 22, W + 200, 22);
      }
      // gramado
      if (blue) {
        g.fillStyle = '#05223a';
        g.fillRect(-100, farY, W + 200, H - farY + 200);
        // grade de 5 m
        g.strokeStyle = rgba(accent, 0.16);
        g.lineWidth = 1;
        g.beginPath();
        for (let x = -80; x <= 80; x += 5) this.fxbLineTo(g, cam, x, nearY, x, Wd);
        for (let y = Math.ceil(nearY / 5) * 5; y <= Wd; y += 5) this.fxbLineTo(g, cam, -80, y, 80, y);
        g.stroke();
        g.strokeStyle = 'rgba(224,242,254,0.85)';
        g.lineWidth = 2.5;
        this.fxbPitchLines(g, cam);
      } else {
        g.fillStyle = m.grass1;
        g.fillRect(-100, farY, W + 200, H - farY + 200);
        g.fillStyle = m.grass2;
        for (let i = 0; i < 14; i += 2) {
          const x0 = -70 + i * 10;
          this.fxbLine(g, cam, [[x0, nearY], [x0 + 10, nearY], [x0 + 10, Wd], [x0, Wd]], 1);
          g.fill();
        }
        this.cineGradient(g, -100, farY, W + 200, H - farY + 200, [[0, 'rgba(2,6,23,0.45)'], [1, 'rgba(2,6,23,0.1)']]);
        g.strokeStyle = 'rgba(241,245,249,0.8)';
        g.lineWidth = 3;
        this.fxbPitchLines(g, cam);
      }
      g.restore();
    },
    // Segmento reto projetado (para juntar muitas linhas num caminho só)
    fxbLineTo(g, cam, ax, ay, bx, by) {
      const [x0, y0] = this.fxbProj(cam, ax, ay);
      const [x1, y1] = this.fxbProj(cam, bx, by);
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
    },
    // Estádio de lado (como o ptdArena, mas desenhado com texturas pequenas; pan em px)
    fxbArena(ctx, S, pan) {
      const { W } = S;
      const theme = this.ptdTheme();
      const m = this.ptdMap(theme);
      const indoor = this.ptdIndoor(theme);
      const bp = pan * 0.4;
      this.cineGradient(ctx, -100, -100, W + 200, 480, [[0, m.skyTop], [1, m.skyBot]]);
      if (indoor) {
        ctx.fillStyle = '#020617';
        ctx.fillRect(-100, -100, W + 200, 210);
        for (let x = -mod(bp, 160) - 160; x < W + 160; x += 160) {
          ctx.fillStyle = 'rgba(103,232,249,0.9)';
          ctx.fillRect(x + 24, 72, 112, 8);
          ctx.fillStyle = 'rgba(103,232,249,0.18)';
          ctx.fillRect(x + 14, 80, 132, 22);
        }
        ctx.fillStyle = mix(m.building, '#000000', 0.25);
        ctx.fillRect(-100, 110, W + 200, 240);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(-100, 150, W + 200, 3);
        ctx.fillRect(-100, 336, W + 200, 3);
      } else {
        for (let x = -mod(bp, 640) + 320 - 640; x < W + 640; x += 640) {
          this.cineGlow(ctx, x, 56, 150, 'rgba(255,255,255,0.55)');
          ctx.fillStyle = '#0b1220';
          ctx.fillRect(x - 5, 76, 10, 110);
          ctx.fillStyle = '#111827';
          ctx.fillRect(x - 52, 36, 104, 40);
          ctx.fillStyle = '#f8fafc';
          for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) ctx.fillRect(x - 47 + c * 12.4, 40 + r * 12, 8, 8);
        }
        ctx.fillStyle = mix(m.building, '#000000', 0.55);
        ctx.fillRect(-100, 168, W + 200, 182);
        ctx.fillStyle = mix(m.building, '#000000', 0.3);
        ctx.fillRect(-100, 168, W + 200, 10);
        this.fxbTile(ctx, this.fxbCrowdTile('#38bdf8', '#ef4444', 13), -100, 184, W + 200, 156, bp);
      }
      this.fxbTile(ctx, this.fxbBoardTile(m.signText || 'BLUE LOCK', m.signBg || '#0b1d4d', m.boardBg || '#1d4ed8'), -100, 350, W + 200, 30, bp);
      // gramado com as faixas inclinadas (textura que corre com o pan)
      const grass = this.fxbBg(`fxbGrass|${m.grass1}|${m.grass2}`, 320, 340, (g) => {
        g.fillStyle = m.grass1;
        g.fillRect(0, 0, 320, 340);
        g.fillStyle = m.grass2;
        for (let x = -320; x < 640; x += 320) {
          poly(g, [[x, 340], [x + 160, 340], [x + 310, 0], [x + 150, 0]]);
          g.fill();
        }
        for (let i = 0; i < 60; i++) {
          g.fillStyle = i % 3 ? 'rgba(2,6,23,0.18)' : 'rgba(255,255,255,0.06)';
          g.fillRect(Math.floor(rnd(i, 11) * 320), 30 + Math.floor(rnd(i, 12) * 300), 3, 6);
        }
      });
      this.fxbTile(ctx, grass, -100, 380, W + 200, 440, pan);
      this.cineGradient(ctx, -100, 380, W + 200, 440, [[0, 'rgba(2,6,23,0.55)'], [0.4, 'rgba(2,6,23,0.12)'], [1, 'rgba(2,6,23,0.3)']]);
      ctx.fillStyle = 'rgba(241,245,249,0.75)';
      ctx.fillRect(-100, 394, W + 200, 3);
    },
    // Boneco de pé no campo (X, Y em metros); scale = altura do boneco em metros
    fxbOnPitch(ctx, cam, char, X, Y, o = {}, scale = 4.4) {
      const [sx, sy, k] = this.fxbProj(cam, X, Y);
      const size = scale * k;
      this.fxbSpr(ctx, char, sx, sy, size, o);
      return { x: sx, y: sy, size, top: sy - size * 0.87 };
    },
    // Sombra oval no chão
    fxbShadow(ctx, x, y, w, a = 0.45) {
      ctx.save();
      ctx.fillStyle = `rgba(2,6,23,${a})`;
      ctx.beginPath();
      ctx.ellipse(x, y, w, w * 0.22, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
    // Fagulhas que voam de um ponto (k = 0..1 desde o impacto)
    fxbSparks(ctx, x, y, k, n, colors, spread = 1, seed = 1, dir = 0, cone = TAU, len = 260) {
      if (k <= 0 || k >= 1) return;
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const a = dir - cone / 2 + rnd(i, seed) * cone;
        const sp = (0.35 + rnd(i, seed + 1) * 0.65) * len * spread;
        const d = ease(k) * sp;
        const gy = k * k * 120 * rnd(i, seed + 2);
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d + gy;
        const tl = 10 + 26 * (1 - k);
        ctx.strokeStyle = colors[i % colors.length];
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 2 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - Math.cos(a) * tl, py - Math.sin(a) * tl - gy * 0.05);
        ctx.stroke();
      }
      ctx.restore();
    },
    // Fogo em pixel na base da tela (colunas que sobem e descem)
    fxbPixelFire(ctx, x0, x1, baseY, h, t, colors = ['#7c2d12', '#ea580c', '#f97316', '#fdba74'], cell = 12, seed = 1) {
      ctx.save();
      for (let x = x0; x < x1; x += cell) {
        const i = Math.round(x / cell);
        const hh = h * (0.35 + 0.45 * Math.abs(Math.sin(t * 0.09 + i * 0.7 + seed)) + 0.2 * rnd(i + Math.floor(t / 5), seed));
        const rows = Math.ceil(hh / cell);
        for (let r = 0; r < rows; r++) {
          const k = r / rows;
          ctx.fillStyle = colors[Math.min(colors.length - 1, Math.floor((1 - k) * colors.length * 0.999))];
          ctx.globalAlpha = 0.9 - k * 0.5;
          ctx.fillRect(x, baseY - (r + 1) * cell, cell - 1, cell - 1);
        }
      }
      ctx.restore();
    },
    // Brasas / partículas quadradas subindo
    fxbEmbers(ctx, W, y0, y1, t, n, colors, seed = 1, speed = 1.6, size = 4) {
      ctx.save();
      for (let i = 0; i < n; i++) {
        const span = y1 - y0;
        const ph = mod(t * speed * (0.6 + rnd(i, seed) * 0.8) + rnd(i, seed + 1) * span, span);
        const x = rnd(i, seed + 2) * W + Math.sin(t * 0.04 + i) * 18;
        const y = y1 - ph;
        ctx.globalAlpha = 0.9 * (1 - ph / span);
        ctx.fillStyle = colors[i % colors.length];
        const s = i % 4 ? size : size * 1.6;
        ctx.fillRect(Math.round(x), Math.round(y), s, s);
      }
      ctx.restore();
    }
  });

  // ==========================================================================
  // 1. OLHAR DO MAESTRO (Hiori) — a planta azul
  // ==========================================================================
  const MAE_C = '#22d3ee';
  const MAE_CAM1 = { cx: 640, hy: 60, f: 900, h: 26, d: 52 };
  const MAE_CAM2 = { cx: 640, hy: 170, f: 1000, h: 13, d: 44, x0: 6 };
  // companheiros livres (X, Y no campo) e marcadores
  const MAE_MATES = [['bachira', 14, 16], ['nagi', 24, 4], ['chigiri', -4, 26], ['kunigami', 30, 22]];
  const MAE_RIVALS = [['barou', 8, 8], ['aryu', 20, 12], ['tokimitsu', 4, 20], ['karasu', 18, 26], ['otoya', 34, 10]];

  Object.assign(CE, {
    fxbMaeCast() {
      const c = this.fxbCfg('fl_incomum_maestro');
      const kit = this.fxbKit(c.you);
      return {
        c,
        mates: MAE_MATES.map(([id, X, Y]) => ({ ch: this.fxbMate(id, kit), X, Y })),
        rivals: MAE_RIVALS.map(([id, X, Y]) => ({ ch: this.fxbMate(id, KIT_RIVAL), X, Y })),
        hiori: this.cineChar('hiori')
      };
    },
    // Os jogadores no campo (normal ou em planta azul)
    fxbMaePlayers(ctx, cam, o, blue, t) {
      const list = [];
      o.rivals.forEach((r) => list.push({ ch: r.ch, X: r.X, Y: r.Y, riv: true }));
      o.mates.forEach((m) => list.push({ ch: m.ch, X: m.X, Y: m.Y }));
      list.push({ ch: o.c.you, X: -6, Y: -4, you: true });
      list.sort((a, b) => b.Y - a.Y);
      const out = {};
      list.forEach((p, i) => {
        const [sx, sy, k] = this.fxbProj(cam, p.X, p.Y);
        this.fxbShadow(ctx, sx, sy, k * 1.2, blue ? 0.3 : 0.45);
        const opt = blue
          ? p.riv
            ? { tint: '#0a2236', rim: '#f43f5e', rimD: 2 }
            : { tint: '#0a2a40', rim: p.you ? '#f8fafc' : MAE_C, rimD: 2 }
          : { animState: p.riv ? 'run' : 'idle', frame: p.riv ? runF(t + i * 3, 6) : 45, flipX: !!p.riv };
        const r = this.fxbOnPitch(ctx, cam, p.ch, p.X, p.Y, opt, 4.6);
        if (p.you) out.you = r;
      });
      return out;
    },

    // PLANO 1 — a varredura: atrás da linha de luz o campo vira planta
    fxbMae0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbMaeCast();
      const cam = MAE_CAM1;
      const scanX = lerp(-140, W + 140, easeIO(seg(t, 12, 58)));
      const zoom = 1 + easeIO(t / 80) * 0.12;
      const draw = (blue) => {
        ctx.save();
        this.cineCamera(ctx, W, H, { x: lerp(640, 600, easeIO(t / 80)), y: lerp(380, 430, easeIO(t / 80)), zoom, shake: 0.7 });
        this.fxbPitch(ctx, blue ? 'blueprint' : 'night', W, H, cam, MAE_C);
        const r = this.fxbMaePlayers(ctx, cam, o, blue, t);
        if (blue) {
          // pings nos livres
          o.mates.forEach((m, i) => {
            const [sx, sy, k] = this.fxbProj(cam, m.X, m.Y);
            const ph = mod(t * 1.2 - i * 9, 40) / 40;
            ctx.strokeStyle = rgba(MAE_C, 0.9 * (1 - ph));
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(sx, sy, k * (1 + ph * 4), k * (1 + ph * 4) * 0.3, 0, 0, TAU);
            ctx.stroke();
          });
          // X vermelho nos marcadores
          o.rivals.forEach((rv) => {
            const [sx, sy, k] = this.fxbProj(cam, rv.X, rv.Y);
            const s = k * 0.7;
            ctx.strokeStyle = 'rgba(244,63,94,0.85)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(sx - s, sy - k * 5.6 - s);
            ctx.lineTo(sx + s, sy - k * 5.6 + s);
            ctx.moveTo(sx + s, sy - k * 5.6 - s);
            ctx.lineTo(sx - s, sy - k * 5.6 + s);
            ctx.stroke();
          });
        } else if (r.you) {
          this.cineGlow(ctx, r.you.x, r.you.y - r.you.size * 0.5, r.you.size, rgba(MAE_C, 0.35));
        }
        ctx.restore();
      };
      draw(false);
      if (scanX > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, Math.min(W, scanX), H);
        ctx.clip();
        draw(true);
        ctx.restore();
      }
      // a linha de varredura
      if (scanX > -40 && scanX < W + 40) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(scanX - 160, 0, scanX + 8, 0);
        g.addColorStop(0, rgba(MAE_C, 0));
        g.addColorStop(1, rgba(MAE_C, 0.32));
        ctx.fillStyle = g;
        ctx.fillRect(scanX - 160, top, 168, bot - top);
        ctx.restore();
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(scanX - 2, top, 4, bot - top);
        for (let y = top + 10; y < bot; y += 34) {
          ctx.fillStyle = MAE_C;
          ctx.fillRect(scanX + 6, y, 10, 2);
        }
        this.cineGlow(ctx, scanX, (top + bot) / 2, 160, rgba(MAE_C, 0.5));
      }
      // HUD de radar (cantos + leitura)
      const hk = seg(t, 40, 56);
      if (hk > 0) {
        ctx.save();
        ctx.globalAlpha = hk;
        ctx.strokeStyle = MAE_C;
        ctx.lineWidth = 3;
        const L = 40;
        const T = top + 18;
        const R = W - 40;
        const B = bot - 18;
        ctx.beginPath();
        [[L, T, 1, 1], [R, T, -1, 1], [L, B, 1, -1], [R, B, -1, -1]].forEach(([x, y, sx, sy]) => {
          ctx.moveTo(x, y + sy * 30);
          ctx.lineTo(x, y);
          ctx.lineTo(x + sx * 30, y);
        });
        ctx.stroke();
        ctx.font = '900 15px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = MAE_C;
        ctx.fillText(`LIVRES: ${Math.min(4, Math.floor(seg(t, 44, 70) * 5))}   MARCADORES: 5   VISÃO +50`, R - 14, B - 20);
        ctx.restore();
      }
      this.finKicker(ctx, 40, top + 34, 'O CAMPO FICA TRANSPARENTE', seg(t, 4, 40), MAE_C);
      this.fxbSfx(S, 12, 'scan', () => window.SFX?.whoosh());
    },

    // PLANO 2 — a regência: linhas acendem do seu gesto até cada livre
    fxbMae1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbMaeCast();
      const cam = MAE_CAM2;
      const k = easeIO(t / 190);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(610, 680, k), y: 360, zoom: lerp(1.02, 1.08, k), shake: 0.6 });
      this.fxbPitch(ctx, 'blueprint', W, H, cam, MAE_C);
      this.cineShafts(ctx, 640, -40, Math.PI / 2, 720, 1.2, 7, '103,232,249', 0.06, t);
      // marcadores e livres no fundo
      const pos = [];
      const all = o.rivals.map((r) => ({ ch: r.ch, X: r.X, Y: r.Y, riv: true })).concat(o.mates.map((m, i) => ({ ch: m.ch, X: m.X, Y: m.Y, i })));
      all.sort((a, b) => b.Y - a.Y);
      all.forEach((p) => {
        const [sx, sy, kk] = this.fxbProj(cam, p.X, p.Y);
        this.fxbShadow(ctx, sx, sy, kk * 1.3, 0.35);
        const r = this.fxbOnPitch(ctx, cam, p.ch, p.X, p.Y, p.riv ? { dim: 0.55, dimTint: '5,34,58', flipX: true } : { rim: MAE_C, rimD: 2 }, 4.6);
        if (!p.riv) pos[p.i] = r;
        else {
          const s = kk * 0.8;
          ctx.strokeStyle = 'rgba(244,63,94,0.8)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx - s, r.top - 14 - s);
          ctx.lineTo(sx + s, r.top - 14 + s);
          ctx.moveTo(sx + s, r.top - 14 - s);
          ctx.lineTo(sx - s, r.top - 14 + s);
          ctx.stroke();
        }
      });
      ctx.restore();

      // você em primeiro plano (mais perto: anda mais), o braço erguido regendo
      const fx = lerp(330, 300, k) + this.cineNoise(t * 0.6, 3) * 3;
      const size = 470;
      const feet = bot + 150;
      const u = size / 36;
      const sTop = feet - size * 0.87;
      const hand = { x: fx + 10.6 * u, y: sTop + 10.5 * u };
      // linhas de passe (arcos) — uma por compasso
      const beat = 34;
      pos.forEach((p, i) => {
        if (!p) return;
        const at = 24 + i * beat;
        const lk = ease(seg(t, at, at + 22));
        if (lk <= 0) return;
        const tx = p.x + (fx - 640) * 0;
        const ty = p.top + p.size * 0.35;
        const mx = (hand.x + tx) / 2;
        const my = Math.min(hand.y, ty) - 120 - i * 18;
        const N = 28;
        const pts = [];
        for (let j = 0; j <= N * lk; j++) {
          const s = j / N;
          pts.push([(1 - s) * (1 - s) * hand.x + 2 * (1 - s) * s * mx + s * s * tx, (1 - s) * (1 - s) * hand.y + 2 * (1 - s) * s * my + s * s * ty]);
        }
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = rgba(MAE_C, 0.35);
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([16, 10]);
        ctx.lineDashOffset = -t * 2.4;
        ctx.beginPath();
        pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.restore();
        // ponto de luz correndo na linha (a bola imaginária)
        const head = pts[pts.length - 1];
        if (head) this.cineGlow(ctx, head[0], head[1], 26, rgba(MAE_C, 0.9));
        if (lk >= 1) {
          const ph = mod(t - at, 30) / 30;
          const s = ph;
          const bx = (1 - s) * (1 - s) * hand.x + 2 * (1 - s) * s * mx + s * s * tx;
          const by = (1 - s) * (1 - s) * hand.y + 2 * (1 - s) * s * my + s * s * ty;
          ctx.fillStyle = '#f0fdff';
          ctx.fillRect(Math.round(bx - 3), Math.round(by - 3), 6, 6);
        }
        // anel no livre + etiqueta
        const ck = seg(t, at + 18, at + 30);
        if (ck > 0) {
          ctx.strokeStyle = rgba(MAE_C, 0.9);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 0.42, p.size * 0.12, 0, 0, TAU);
          ctx.stroke();
          this.ptdChip(ctx, `${i + 1} • LIVRE`, p.x, p.top - 26, MAE_C, ck, { size: 13 });
        }
        this.fxbSfx(S, at + 18, 'nota' + i, () => window.SFX?.blip([523, 659, 784, 1047][i] || 880));
      });
      // o traço do maestro no ar (4 tempos), saindo da mão
      const trail = [];
      for (let j = 0; j < 14; j++) {
        const tt = t - j * 1.6;
        if (tt < 10) break;
        const ph = mod(tt, beat) / beat;
        const bi = Math.floor(tt / beat) % 4;
        const dirs = [[0, 1], [-1, 0.2], [1, 0.1], [0.2, -1]];
        const [dx, dy] = dirs[bi];
        const sw = Math.sin(ph * Math.PI);
        trail.push({ x: hand.x + 40 + dx * 90 * sw + Math.sin(ph * TAU) * 14, y: hand.y - 70 + dy * 80 * sw });
      }
      if (trail.length > 2) {
        this.ptdStreak(ctx, trail, MAE_C, 16, 0.95);
        this.cineGlow(ctx, trail[0].x, trail[0].y, 34, 'rgba(224,242,254,0.9)');
      }
      this.cineGlow(ctx, fx, feet - size * 0.6, 300, rgba(MAE_C, 0.22));
      this.fxbSpr(ctx, o.c.you, fx, feet, size, { animState: 'call_pass', rim: MAE_C, rimD: 3 });
      // olhos acesos do maestro (pixel)
      this.ptdEyes(ctx, o.c.you, fx, sTop + 10 * u, u, { ring: MAE_C, iris: '#0e7490' });

      // painel: os olhos do Hiori
      const pk = ease(seg(t, 96, 114));
      if (pk > 0) {
        const pts = [[760, top + 14], [W - 16, top + 14], [W - 16, top + 168], [736, top + 184]];
        this.ptdPanel(ctx, pts, () => {
          ctx.fillStyle = '#04182c';
          ctx.fillRect(700, top, 600, 200);
          this.ptdRays(ctx, 1010, top + 96, 520, MAE_C, 0.25, t * 0.004, 40);
          const dw = 560;
          this.fxbFaceCrop(ctx, o.hiori, 1010 - dw / 2, top + 6, dw, 4, 6.4, 28, 7.6, { ring: MAE_C, iris: '#0e7490', look: -1 });
          ctx.fillStyle = 'rgba(4,24,44,0.18)';
          ctx.fillRect(700, top, 600, 200);
          this.finKicker(ctx, 1240, top + 152, 'HIORI', seg(t, 112, 130), MAE_C, 'right');
        }, { dx: (1 - pk) * 560 });
      }
      this.finKicker(ctx, 40, top + 34, 'A REGÊNCIA', seg(t, 4, 30), MAE_C);
    },

    // PLANO 3 — o radar atrás do rosto e o nome
    fxbMae2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbMaeCast();
      const hit = 6;
      const cx = W * 0.66;
      const cy = top + 250;
      const fxp = W * 0.27;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#020c1a'], [1, '#062a44']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 + easeIO(t / 90) * 20, y: 360, zoom: 1.02 + easeIO(t / 90) * 0.05, shake: 0.6 + (t >= hit ? 5 * (1 - seg(t, hit, hit + 22)) : 0) });
      // tela de radar (anéis, cruz, varredura girando com rastro)
      ctx.strokeStyle = rgba(MAE_C, 0.25);
      ctx.lineWidth = 2;
      for (let r = 90; r < 900; r += 90) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - 900, cy);
      ctx.lineTo(cx + 900, cy);
      ctx.moveTo(cx, cy - 900);
      ctx.lineTo(cx, cy + 900);
      ctx.stroke();
      const sweep = t * 0.07 - 1.2;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        const a0 = sweep - i * 0.045;
        ctx.fillStyle = rgba(MAE_C, 0.16 * (1 - i / 16));
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 900, a0 - 0.045, a0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      // pontos que acendem quando a varredura passa (os livres)
      for (let i = 0; i < 9; i++) {
        const a = rnd(i, 7) * TAU;
        const d = 200 + rnd(i, 8) * 420;
        const since = mod(sweep - a, TAU);
        const al = since < 2 ? 1 - since / 2 : 0;
        if (al <= 0) continue;
        const x = cx + Math.cos(a) * d;
        const y = cy + Math.sin(a) * d;
        this.cineGlow(ctx, x, y, 30, rgba(MAE_C, 0.8), al);
        ctx.fillStyle = `rgba(224,242,254,${al})`;
        ctx.fillRect(x - 4, y - 4, 8, 8);
      }
      // o rosto (à esquerda, olhando para o radar), com os anéis saindo dos olhos
      const size = 760;
      const eyeY = top + 250;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.foxcGradH(ctx, 0, top, 700, bot - top, [[0, 'rgba(34,211,238,0)'], [0.5, 'rgba(34,211,238,0.10)'], [1, 'rgba(34,211,238,0)']]);
      ctx.restore();
      const { u } = this.fxbHead(ctx, o.c.you, fxp, eyeY, size, { rim: MAE_C, rimD: 3 });
      this.ptdEyes(ctx, o.c.you, fxp, eyeY, u, { ring: MAE_C, iris: '#0e7490', look: 1 });
      for (let i = 0; i < 3; i++) {
        const ph = mod(t - i * 12, 36) / 36;
        if (t < i * 12) continue;
        ctx.strokeStyle = rgba(MAE_C, 0.8 * (1 - ph));
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fxp + 3.5 * u, eyeY, 30 + ph * 240, -0.7, 0.7);
        ctx.stroke();
      }
      ctx.restore();
      this.fxbTitle(ctx, S, t - 10, { cfg: o.c, x: W * 0.68, y: bot - 150, color: MAE_C, maxW: W * 0.6 });
      if (t >= hit) this.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, hit, hit + 10)), '#cffafe');
      this.fxbSfx(S, hit, 'maestro', () => window.SFX?.jingle([523, 659, 784, 1047], 0, 'triangle'));
    }
  });

  // ==========================================================================
  // 2. MURALHA DO CORINGA (Kunigami) — corpo de ferro
  // ==========================================================================
  const MUR_C = '#f97316';
  // placas: [x, y, w, h] em unidades do boneco (x a partir do centro), quando trava, de onde vem
  const MUR_PLATES = [
    { r: [-12, 13.2, 5.6, 3.6], at: 18, from: [-1, -0.6], kind: 'pad' },
    { r: [6.4, 13.2, 5.6, 3.6], at: 30, from: [1, -0.6], kind: 'pad' },
    { r: [-5.6, 14.6, 11.2, 6], at: 48, from: [0, 1], kind: 'chest' },
    { r: [-11.8, 17.2, 3.4, 3.4], at: 66, from: [-1, 0.3], kind: 'arm' },
    { r: [8.4, 17.2, 3.4, 3.4], at: 76, from: [1, 0.3], kind: 'arm' },
    { r: [-6.4, 20.6, 12.8, 1.8], at: 90, from: [0, 1], kind: 'belt' },
    { r: [-5.6, 24.2, 3.6, 3.6], at: 102, from: [-1, 1], kind: 'shin' },
    { r: [2, 24.2, 3.6, 3.6], at: 110, from: [1, 1], kind: 'shin' }
  ];

  Object.assign(CE, {
    fxbMurCast() {
      const c = this.fxbCfg('fl_raro_muralha');
      return { c, kuni: this.cineChar('kunigami'), def: this.fxbMate('barou', KIT_RIVAL) };
    },
    // Uma placa de aço em pixel (blocos de meia unidade, borda escura, rebites);
    // heat 0..1 = recém-forjada (laranja incandescente esfriando para o aço)
    fxbPlate(ctx, x, y, w, h, u, kind, heat) {
      const p = Math.max(1, u * 0.5);
      const X = Math.round(x);
      const Y = Math.round(y);
      const Wd = Math.round(w);
      const Hd = Math.round(h);
      const base = mix('#64748b', '#fb923c', heat);
      const hi = mix('#cbd5e1', '#fef3c7', heat);
      const lo = mix('#334155', '#c2410c', heat);
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(X - p, Y - p, Wd + p * 2, Hd + p * 2);
      ctx.fillStyle = base;
      ctx.fillRect(X, Y, Wd, Hd);
      ctx.fillStyle = hi;
      ctx.fillRect(X, Y, Wd, Math.ceil(p));
      ctx.fillRect(X, Y, Math.ceil(p), Hd);
      ctx.fillStyle = lo;
      ctx.fillRect(X, Y + Hd - Math.ceil(p), Wd, Math.ceil(p));
      ctx.fillRect(X + Wd - Math.ceil(p), Y, Math.ceil(p), Hd);
      if (kind === 'chest') {
        // nervura no meio e a marca "X" do coringa
        ctx.fillStyle = lo;
        ctx.fillRect(X + Wd / 2 - p / 2, Y + p * 2, p, Hd - p * 4);
        ctx.fillStyle = hi;
        ctx.fillRect(X + Wd / 2 - p * 1.5, Y + p * 2, p, Hd - p * 4);
      }
      if (kind === 'pad') {
        ctx.fillStyle = lo;
        ctx.fillRect(X + p, Y + Hd / 2, Wd - p * 2, Math.ceil(p * 0.6));
      }
      // rebites
      ctx.fillStyle = mix('#e2e8f0', '#fff7ed', heat);
      const rv = [[p * 1.5, p * 1.5], [Wd - p * 2.5, p * 1.5], [p * 1.5, Hd - p * 2.5], [Wd - p * 2.5, Hd - p * 2.5]];
      rv.forEach(([rx, ry]) => ctx.fillRect(Math.round(X + rx), Math.round(Y + ry), Math.ceil(p), Math.ceil(p)));
      if (heat > 0.05) this.cineGlow(ctx, X + Wd / 2, Y + Hd / 2, Math.max(Wd, Hd) * 0.9, 'rgba(251,146,60,0.75)', heat);
    },
    // Todas as placas sobre um boneco (cx = centro, top = topo do boneco, u = px por unidade)
    // t = quadro do plano (as que ainda não travaram voam de fora); t = 999 = todas no lugar
    fxbPlates(ctx, cx, top, u, t, W) {
      MUR_PLATES.forEach((pl) => {
        const [x, y, w, h] = pl.r;
        const k = seg(t, pl.at - 12, pl.at);
        if (k <= 0) return;
        const fly = 1 - easeIn(k);
        const dx = pl.from[0] * fly * W * 0.6;
        const dy = pl.from[1] * fly * 500;
        const heat = t >= pl.at ? 1 - seg(t, pl.at, pl.at + 40) : 1;
        this.fxbPlate(ctx, cx + x * u + dx, top + y * u + dy, w * u, h * u, u, pl.kind, heat * (t > 900 ? 0 : 1));
      });
    },
    // O muro da fortaleza: ameias + blocos de pedra em pixel (texturas pequenas que se repetem)
    fxbWall(ctx, x0, y, w, h = 460) {
      const bw = 64;
      const bh = 32;
      const crenY = 56;
      const bricks = this.fxbBg('fxbBricks', bw * 4, bh * 4, (g) => {
        g.fillStyle = '#1c1410';
        g.fillRect(0, 0, bw * 4, bh * 4);
        for (let r = 0; r < 4; r++) {
          for (let c = -1; c < 5; c++) {
            const x = c * bw + (r % 2) * (bw / 2);
            const yy = r * bh;
            const q = rnd(c * 13 + r * 7 + 40, 3);
            g.fillStyle = q < 0.3 ? '#4a3a30' : q < 0.7 ? '#3d3029' : '#56443a';
            g.fillRect(x + 2, yy + 2, bw - 4, bh - 4);
            g.fillStyle = 'rgba(253,186,116,0.18)';
            g.fillRect(x + 2, yy + 2, bw - 4, 3);
            g.fillStyle = 'rgba(0,0,0,0.3)';
            g.fillRect(x + 2, yy + bh - 6, bw - 4, 4);
            if (q > 0.8) {
              g.fillStyle = 'rgba(0,0,0,0.35)';
              g.fillRect(x + 14, yy + 10, 10, 4);
              g.fillRect(x + 22, yy + 14, 4, 8);
            }
          }
        }
      });
      const cren = this.fxbBg('fxbCren', bw * 2, crenY + 4, (g) => {
        g.fillStyle = '#1c1410';
        g.fillRect(0, 0, bw, crenY + 4);
        for (let r = 0; r < 2; r++) {
          g.fillStyle = r ? '#3d3029' : '#56443a';
          g.fillRect(2, r * 28 + 2, bw - 4, 24);
          g.fillStyle = 'rgba(253,186,116,0.3)';
          g.fillRect(2, r * 28 + 2, bw - 4, 3);
        }
        g.fillStyle = 'rgba(249,115,22,0.6)';
        g.fillRect(0, 0, bw, 4);
      });
      this.fxbTile(ctx, cren, x0, y, w, crenY + 4);
      this.fxbTile(ctx, bricks, x0, y + crenY, w, h - crenY);
      this.cineGradient(ctx, x0, y, w, h, [[0, 'rgba(10,5,3,0)'], [1, 'rgba(10,5,3,0.65)']]);
    },

    // PLANO 1 — a forja: as placas de ferro travam no corpo, o Kunigami atrás em chamas
    fxbMur0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbMurCast();
      const lastClank = MUR_PLATES.reduce((m, p) => (t >= p.at && p.at > m ? p.at : m), -99);
      const kick = t - lastClank < 14 ? 5 * (1 - (t - lastClank) / 14) : 0;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#080302'], [0.6, '#1f0b04'], [1, '#3a1406']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(380, 350, easeIO(t / 170)), zoom: lerp(1.0, 1.1, easeIO(t / 170)), shake: 0.7 + kick });
      // o Kunigami atrás, gigante, preto com borda de fogo (a muralha que te ensinou)
      const ks = 720;
      const ku = ks / 36;
      const kRise = ease(seg(t, 0, 60));
      const kTop = top + 140 - 10 * ku + (1 - kRise) * 120;
      const kFeet = kTop + ks * 0.87;
      this.cineGlow(ctx, 640, kTop + 12 * ku, 520, 'rgba(249,115,22,0.3)');
      this.fxbSpr(ctx, o.kuni, 640, kFeet, ks, { dim: 0.5, dimTint: '60,18,4', rim: MUR_C, rimD: 4, alpha: kRise });
      [-1, 1].forEach((s) => this.cineGlow(ctx, 640 + s * 3.5 * ku, kTop + 10 * ku, ku * 3, 'rgba(251,146,60,0.6)', kRise));
      if (kRise > 0.5) this.ptdEyes(ctx, o.kuni, 640, kTop + 10 * ku, ku, { ring: MUR_C, iris: '#7c2d12', angry: true });
      this.cineShafts(ctx, 640, H + 40, -Math.PI / 2, 760, 1.3, 7, '251,146,60', 0.08, t);
      this.fxbPixelFire(ctx, 0, W, bot + 6, 70, t, undefined, 12, 2);
      // você, de frente, quase inteiro
      const size = 560;
      const u = size / 36;
      const feet = bot + 110;
      const sTop = feet - size * 0.87;
      this.cineGlow(ctx, 640, feet - size * 0.55, 300, 'rgba(249,115,22,0.22)');
      this.fxbSpr(ctx, o.c.you, 640, feet, size, { rim: '#fdba74', rimD: 3 });
      this.fxbPlates(ctx, 640, sTop, u, t, W);
      // olhos firmes (acendem laranja quando o peito trava)
      const lit = seg(t, 48, 56);
      this.ptdEyes(ctx, o.c.you, 640, sTop + 10 * u, u, lit > 0 ? { ring: MUR_C, iris: '#7c2d12', angry: true } : { angry: true });
      // faíscas de cada placa travando
      MUR_PLATES.forEach((pl, i) => {
        const [x, y, w, h] = pl.r;
        this.fxbSparks(ctx, 640 + (x + w / 2) * u, sTop + (y + h / 2) * u, seg(t, pl.at, pl.at + 22), 14, ['#fde68a', '#fb923c', '#ffffff'], 1, i + 3, 0, TAU, 200);
      });
      ctx.restore();
      // brasas na frente
      this.fxbEmbers(ctx, W, top, bot, t, 46, ['#fdba74', '#f97316', '#fde68a'], 4, 2.2);
      // CLANK de cada placa
      MUR_PLATES.forEach((pl, i) => {
        if (i % 2 && i !== 2) return;
        const a = t - pl.at;
        if (a < 0 || a > 26) return;
        const [x] = pl.r;
        const sx = x < 0 ? 250 + i * 6 : 1030 - i * 6;
        this.ptdWord(ctx, i === 2 ? 'CLANK!!' : 'CLANK', sx, top + 120 + i * 40, i === 2 ? 70 : 46, '#fdba74', seg(a, 0, 6), 1 - seg(a, 16, 26), x < 0 ? -0.12 : 0.12);
      });
      MUR_PLATES.forEach((pl, i) => this.fxbSfx(S, pl.at, 'pl' + i, () => (i === 2 ? window.SFX?.post?.() : window.SFX?.tackle?.())));
      this.finKicker(ctx, 40, top + 34, 'CORPO DE FERRO', seg(t, 4, 40), MUR_C);
    },

    // PLANO 2 — o tranco: o zagueiro vem com tudo e quica para trás
    fxbMur1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbMurCast();
      const hit = 40;
      const isHit = t >= hit;
      const shake = isHit ? 11 * (1 - seg(t, hit, hit + 30)) : 0.8;
      const feet = H * 0.86;
      const yx = W * 0.4;
      const size = 330;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2 + (isHit ? 0 : t * 0.4), y: H / 2, zoom: isHit ? 1.06 - seg(t, hit, hit + 50) * 0.03 : lerp(1, 1.04, t / hit), shake });
      this.fxbArena(ctx, S, t * 1.5);
      ctx.fillStyle = 'rgba(30,8,2,0.25)';
      ctx.fillRect(-40, -40, W + 80, H + 80);
      if (!isHit) this.ptdSpeed(ctx, S, t, '#fed7aa', 0.3, -1, 38, 18, top, bot, 5);
      // você firme (placas no corpo, sem se mexer)
      this.fxbShadow(ctx, yx, feet, 90);
      const u = size / 36;
      const sTop = feet - size * 0.87;
      const lean = isHit ? Math.round(Math.sin(seg(t, hit, hit + 10) * Math.PI) * -3) : 0;
      this.fxbSpr(ctx, o.c.you, yx + lean, feet, size, { rim: MUR_C, rimD: 2 });
      this.fxbPlates(ctx, yx + lean, sTop, u, 999, W);
      this.ptdBall(ctx, yx - 70, feet - 16, 18, 0);
      // o zagueiro: corre, bate, quica para trás girando e cai
      let dx;
      let dy = 0;
      let rot = 0;
      let anim = 'run';
      if (!isHit) {
        dx = lerp(W * 1.18, yx + 120, easeIn(t / hit));
      } else {
        const a = seg(t, hit + 3, hit + 46);
        dx = yx + 120 + ease(a) * 420;
        dy = -Math.sin(a * Math.PI) * 150;
        rot = ease(a) * 1.6;
        anim = a < 1 ? 'dive' : 'slide';
      }
      this.fxbShadow(ctx, dx, feet, 80, 0.35);
      this.fxbSprRot(ctx, o.def, dx, feet + dy, 340, rot, { animState: anim, frame: anim === 'run' ? runF(t, 3) : 45, flipX: true });
      if (isHit) {
        const cx = yx + 70;
        const cy = feet - 200;
        this.ptdRings(ctx, cx, cy, seg(t, hit, hit + 30), ['#ffffff', MUR_C, '#7c2d12'], 380, 0);
        this.fxbSparks(ctx, cx, cy, seg(t, hit, hit + 34), 40, ['#fde68a', '#f97316', '#ffffff'], 1.2, 9, -0.2, 2.4, 360);
        // trincas no gramado
        ctx.strokeStyle = 'rgba(15,23,42,0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = Math.PI + (i / 5) * Math.PI * 0.9 - 0.2;
          const L = 60 + rnd(i, 4) * 90 * ease(seg(t, hit, hit + 12));
          ctx.moveTo(yx, feet);
          ctx.lineTo(yx + Math.cos(a) * L * 1.6, feet - Math.sin(a) * L * 0.2);
        }
        ctx.stroke();
      }
      ctx.restore();
      if (isHit) {
        this.ptdWord(ctx, 'CLANG!!', W * 0.72, top + 110, 120, MUR_C, seg(t, hit, hit + 8), 1, -0.1);
        this.ptdChip(ctx, 'FORÇA +60', W * 0.72, top + 210, MUR_C, seg(t, hit + 16, hit + 28), { size: 16 });
        this.cineFlash(ctx, W, H, 0.75 * (1 - seg(t, hit, hit + 8)), '#ffedd5');
      }
      this.fxbSfx(S, hit, 'clang', () => window.SFX?.post?.());
      this.fxbSfx(S, hit + 1, 'clang2', () => window.SFX?.tackle?.());
    },

    // PLANO 3 — a muralha sobe atrás de você
    fxbMur2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbMurCast();
      const rise = back(seg(t, 0, 26));
      const land = 24;
      const shake = 0.8 + (t >= land ? 6 * (1 - seg(t, land, land + 24)) : 2 * seg(t, 0, 24));
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#0a0402'], [1, '#2a0e04']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: 1.04 + easeIO(t / 85) * 0.04, rot: -0.01, shake });
      // fogo atrás do muro
      this.cineGlow(ctx, 640, top + 60, 700, 'rgba(249,115,22,0.4)');
      this.fxbPixelFire(ctx, -40, W + 40, lerp(bot + 300, top + 150, rise), 150, t, ['#7c2d12', '#c2410c', '#f97316', '#fde68a'], 16, 7);
      // o muro (sobe do chão)
      const wy = lerp(bot + 40, top + 140, rise);
      this.fxbWall(ctx, -40, wy, W + 80);
      // poeira na base quando trava
      if (t >= land) {
        const dk = seg(t, land, land + 40);
        for (let i = 0; i < 16; i++) {
          const x = rnd(i, 21) * W;
          this.cineGlow(ctx, x, bot - 20 - dk * 40, 70 + dk * 80, 'rgba(168,140,120,0.35)', 1 - dk);
        }
      }
      // o chão
      this.cineGradient(ctx, -40, bot - 70, W + 80, 200, [[0, '#1a0c06'], [1, '#0a0503']]);
      // você na frente, corpo inteiro, aura de fogo
      const size = 370;
      const feet = bot - 12;
      this.cineGlow(ctx, 640, feet - 200, 260, 'rgba(249,115,22,0.35)');
      this.fxbSpr(ctx, o.c.you, 640, feet, size, { showAura: true, auraColor: MUR_C, frame: auraF(t), rim: '#fdba74', rimD: 2 });
      this.fxbPlates(ctx, 640, feet - size * 0.87, size / 36, 999, W);
      ctx.restore();
      this.fxbEmbers(ctx, W, top, bot, t, 40, ['#fdba74', '#f97316', '#fde68a'], 8, 2.4);
      this.fxbTitle(ctx, S, t - 28, { cfg: o.c, y: top + 110, color: MUR_C });
      if (t >= land) this.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, land, land + 9)), '#ffedd5');
      this.fxbSfx(S, land, 'muro', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 3. GINGA DO MONSTRO (Bachira) — o monstro de sombra dança do seu lado
  // ==========================================================================
  const GIN_C = '#facc15';

  Object.assign(CE, {
    fxbGinCast() {
      const c = this.fxbCfg('fl_raro_ginga');
      return { c, bachira: this.cineChar('bachira'), def: this.fxbMate('reo', KIT_RIVAL) };
    },
    // O monstro em pixel art (48 x 56), pronto por pose (0..3 = os passos da ginga) e boca
    // (grin 0 = sorriso fechado, 1 = bocarra com dentes)
    fxbMonsterCv(pose, grin = 1) {
      return this.fxbBg(`fxbMonster|${pose}|${grin}`, 48, 56, (g, w, h) => {
        const lean = [-2, 0, 2, 0][pose];
        const arms = [
          [[6, 12], [42, 40]],
          [[8, 22], [40, 22]],
          [[42, 12], [6, 40]],
          [[8, 22], [40, 22]]
        ][pose];
        const legs = [[-5, 4], [-4, 4], [-4, 5], [-4, 4]][pose];
        g.fillStyle = '#000';
        // cabeça, chifrinhos, corpo, pernas e braços compridos
        g.beginPath();
        g.ellipse(24 + lean, 15, 13, 11.5, 0, 0, TAU);
        g.fill();
        poly(g, [[13 + lean, 10], [11 + lean, 1], [18 + lean, 6]]);
        g.fill();
        poly(g, [[35 + lean, 10], [37 + lean, 1], [30 + lean, 6]]);
        g.fill();
        poly(g, [[16 + lean, 22], [32 + lean, 22], [30 + lean * 0.5, 42], [18 + lean * 0.5, 42]]);
        g.fill();
        g.fillRect(24 + legs[0] - 2, 40, 4, 12);
        g.fillRect(24 + legs[1] - 1, 40, 4, 12);
        g.fillRect(24 + legs[0] - 4, 50, 6, 3);
        g.fillRect(24 + legs[1] - 1, 50, 6, 3);
        g.lineWidth = 3;
        g.lineCap = 'round';
        g.strokeStyle = '#000';
        [[17 + lean, 26, arms[0]], [31 + lean, 26, arms[1]]].forEach(([sx, sy, [hx, hy]]) => {
          g.beginPath();
          g.moveTo(sx, sy);
          g.quadraticCurveTo((sx + hx) / 2 + (hx < 24 ? -3 : 3), (sy + hy) / 2 - 4, hx, hy);
          g.stroke();
          g.beginPath();
          g.arc(hx, hy, 2.2, 0, TAU);
          g.fill();
        });
        // máscara com borda dura, contorno amarelo e sombra roxa por dentro
        const img = g.getImageData(0, 0, w, h);
        const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3] > 100);
        const out = g.createImageData(w, h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (!A(x, y)) continue;
            const edge = !A(x - 1, y) || !A(x + 1, y) || !A(x, y - 1) || !A(x, y + 1);
            const i = (y * w + x) * 4;
            const col = edge ? [250, 204, 21] : (x + y * 2) % 7 === 0 && y > 24 ? [36, 22, 58] : [8, 6, 16];
            out.data[i] = col[0];
            out.data[i + 1] = col[1];
            out.data[i + 2] = col[2];
            out.data[i + 3] = 255;
          }
        }
        g.clearRect(0, 0, w, h);
        g.putImageData(out, 0, 0);
        // olhos redondos enormes (brancos, pupila pequena) e o sorriso
        const ex = [19 + lean, 29 + lean];
        ex.forEach((x) => {
          g.fillStyle = '#fef9c3';
          g.fillRect(x - 3, 11, 6, 7);
          g.fillRect(x - 4, 12, 8, 5);
          g.fillStyle = '#000';
          g.fillRect(x - 1 + (pose === 0 ? -1 : pose === 2 ? 1 : 0), 13, 2, 3);
        });
        const mx = 24 + lean;
        if (grin) {
          g.fillStyle = '#000';
          g.fillRect(mx - 9, 20, 18, 4);
          g.fillRect(mx - 7, 24, 14, 1);
          g.fillStyle = '#fef9c3';
          for (let i = 0; i < 9; i++) {
            g.fillRect(mx - 9 + i * 2, 20, 1, 2);
            g.fillRect(mx - 8 + i * 2 - (i === 8 ? 1 : 0), 23, 1, 1);
          }
          g.fillStyle = GIN_C;
          g.fillRect(mx - 10, 19, 1, 2);
          g.fillRect(mx + 9, 19, 1, 2);
        } else {
          g.fillStyle = GIN_C;
          g.fillRect(mx - 7, 21, 14, 1);
          g.fillRect(mx - 8, 20, 1, 1);
          g.fillRect(mx + 7, 20, 1, 1);
        }
      });
    },
    // cx = centro, base = pé, s = px por pixel do monstro
    fxbMonster(ctx, cx, base, s, pose, grin = 1, alpha = 1, flip = false) {
      const cv = this.fxbMonsterCv(pose, grin);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha *= alpha;
      ctx.translate(Math.round(cx), Math.round(base));
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(cv, -24 * s, -53 * s, 48 * s, 56 * s);
      ctx.restore();
    },
    // Pétalas amarelas girando (pixel)
    fxbPetalCv() {
      return this.fxbBg('fxbPetal2', 8, 4, (g) => {
        this.fxbPix(g, ['..aaa...', '.abbba..', 'abbbcca.', '.aaaa...'], 0, 0, 1, { a: '#a16207', b: '#facc15', c: '#fef9c3' });
      });
    },
    // Palavra em fonte de pixel 5x7 (só as letras usadas aqui), centrada em x, com sombra dura
    fxbPixWord(ctx, word, x, y, s, color, shadow) {
      const F = {
        C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
        L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
        E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
        A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
        R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
        '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
        X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
        Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
        U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.']
      };
      const wTot = word.length * 6 * s - s;
      const x0 = x - wTot / 2;
      const y0 = y - 3.5 * s;
      [...word].forEach((ch, i) => {
        const g = F[ch];
        if (!g) return;
        if (shadow) this.fxbPix(ctx, g, x0 + i * 6 * s + s * 0.6, y0 + s * 0.6, s, { '#': shadow });
        this.fxbPix(ctx, g, x0 + i * 6 * s, y0, s, { '#': color });
      });
    },
    // Desenho em pixel a partir de linhas de texto (cada letra = uma cor da paleta, '.' = vazio)
    fxbPix(ctx, rows, x, y, s, pal) {
      rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          const k = row[c];
          if (k === '.' || !pal[k]) continue;
          ctx.fillStyle = pal[k];
          ctx.fillRect(Math.round(x + c * s), Math.round(y + r * s), Math.ceil(s), Math.ceil(s));
        }
      });
    },
    fxbPetals(ctx, W, top, bot, t, n, seed = 1, wind = 1.4, s = 4) {
      const cv = this.fxbPetalCv();
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < n; i++) {
        const sp = 0.6 + rnd(i, seed) * 0.9;
        const x = mod(rnd(i, seed + 1) * (W + 200) + t * wind * sp * 2.2, W + 200) - 100;
        const y = top + mod(rnd(i, seed + 2) * (bot - top) + t * sp * 1.1 + Math.sin(t * 0.05 + i) * 30, bot - top + 40) - 20;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 0.08 * sp + i);
        const sc = s * (0.45 + rnd(i, seed + 3) * 0.45);
        ctx.drawImage(cv, -4 * sc, -2 * sc, 8 * sc, 4 * sc);
        ctx.restore();
      }
      ctx.restore();
    },

    // PLANO 1 — o monstro acorda atrás de você
    fxbGin0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbGinCast();
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#050409'], [1, '#14100a']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(620, 600, easeIO(t / 85)), y: 360, zoom: lerp(1, 1.08, easeIO(t / 85)), rot: -0.02 * easeIO(t / 85), shake: 0.8 });
      // o monstro: a cabeça enorme subindo do escuro à esquerda
      const rise = ease(seg(t, 4, 50));
      const ms = 15;
      this.cineGlow(ctx, 380, 300, 420, 'rgba(250,204,21,0.16)', rise);
      this.fxbMonster(ctx, 380, bot + 560 - rise * 200, ms, 1, t > 46 ? 1 : 0, rise);
      // os olhos do monstro abrem (brilho) — e o sorriso aparece
      if (t > 26) this.cineGlow(ctx, 380, bot + 560 - rise * 200 - 38 * ms, 260, 'rgba(254,249,195,0.25)', seg(t, 26, 40));
      // você, de perfil 3/4, iluminado de amarelo pelo lado do monstro
      const size = 780;
      const eyeY = top + 250;
      const x = 820;
      const { u } = this.fxbHead(ctx, o.c.you, x, eyeY, size, { rim: GIN_C, rimD: 3, dim: 0.25, dimTint: '20,14,4' });
      const lit = seg(t, 56, 64);
      this.ptdEyes(ctx, o.c.you, x, eyeY, u, lit > 0 ? { ring: GIN_C, iris: '#713f12', look: -1 } : { look: -1 });
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.foxcGradH(ctx, 0, top, 760, bot - top, [[0, 'rgba(250,204,21,0.10)'], [1, 'rgba(250,204,21,0)']]);
      ctx.restore();
      this.fxbPetals(ctx, W, top, bot, t, 18, 3, 0.8, 4);
      this.rincStamp(ctx, 'hehe...', 560, top + 120, 44, '#fef08a', t, 50, 3);
      this.finKicker(ctx, 40, top + 34, 'O MONSTRO ACORDA', seg(t, 6, 40), GIN_C);
      this.fxbSfx(S, 30, 'olho', () => window.SFX?.blip(196));
      this.fxbSfx(S, 56, 'grin', () => window.SFX?.whoosh());
    },

    // PLANO 2 — a ginga: você conduz, o monstro dança do lado, o zagueiro fica tonto
    fxbGin1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbGinCast();
      const feet = H * 0.88;
      const pass = 108;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2 + this.cineNoise(t * 0.4, 2) * 6, y: H / 2, zoom: 1.04, rot: Math.sin(t * 0.05) * 0.012, shake: 0.6 });
      this.fxbArena(ctx, S, t * 5);
      ctx.fillStyle = 'rgba(20,14,4,0.28)';
      ctx.fillRect(-40, -40, W + 80, H + 80);
      this.ptdSpeed(ctx, S, t, '#fef08a', 0.18, 1, 30, 14, top, bot, 11);
      // o zagueiro: olha para um lado e para o outro, e fica para trás
      const dk = seg(t, pass, pass + 50);
      const dx = lerp(W * 0.74, W * 0.25, easeIn(dk));
      const dizzy = t > 40 && t < pass + 10;
      const flip = dizzy ? Math.floor(t / 9) % 2 === 0 : true;
      this.fxbShadow(ctx, dx, feet, 70, 0.4);
      this.fxbSpr(ctx, o.def, dx, feet + (dk > 0.5 ? 10 : 0), 300, { animState: dk > 0.3 ? 'slide' : 'idle', flipX: flip });
      if (dizzy) {
        // espiral de tontura em cima da cabeça
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let a = 0; a < TAU * 2; a += 0.3) {
          const r = 4 + a * 4;
          const px = dx + Math.cos(a + t * 0.2) * r;
          const py = feet - 300 - 10 + Math.sin(a + t * 0.2) * r * 0.4;
          if (a) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.stroke();
        this.ptdWord(ctx, '?!', dx + 70, feet - 330, 54, '#fef08a', seg(t, 44, 52), 1, 0.1);
      }
      // o monstro dançando a ginga do seu lado (atrás de você)
      const yx = lerp(W * 0.3, W * 0.62, easeIO(seg(t, 20, pass + 20)));
      const pose = Math.floor(t / 11) % 4;
      const sway = Math.sin((t / 44) * TAU) * 34;
      const bob = Math.abs(Math.sin((t / 22) * Math.PI)) * -14;
      this.cineGlow(ctx, yx - 150 + sway, feet - 240, 260, 'rgba(250,204,21,0.22)');
      this.fxbShadow(ctx, yx - 150 + sway, feet, 110, 0.5);
      this.fxbMonster(ctx, yx - 150 + sway, feet + bob, 8.6, pose, 1, 1, pose === 2);
      // notas musicais saindo dele
      for (let i = 0; i < 5; i++) {
        const ph = mod(t * 1.2 + i * 40, 200) / 200;
        ctx.save();
        ctx.globalAlpha = 1 - ph;
        ctx.font = '900 34px "Segoe UI", sans-serif';
        ctx.fillStyle = i % 2 ? GIN_C : '#fef9c3';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0a0806';
        const nx = yx - 200 + i * 40 + Math.sin(ph * 8 + i) * 20;
        const ny = feet - 420 - ph * 180;
        ctx.strokeText(i % 2 ? '♪' : '♫', nx, ny);
        ctx.fillText(i % 2 ? '♪' : '♫', nx, ny);
        ctx.restore();
      }
      // você conduzindo (corre / rabona no compasso)
      this.fxbShadow(ctx, yx, feet, 70, 0.45);
      const anim = t > pass - 10 && t < pass + 8 ? 'rabona' : 'run';
      this.fxbSpr(ctx, o.c.you, yx, feet, 300, { animState: anim, frame: anim === 'run' ? runF(t, 4) : 45, rim: GIN_C, rimD: 2 });
      const bx = yx + 48 + Math.sin(t * 0.3) * 8;
      this.ptdBall(ctx, bx, feet - 14 - Math.abs(Math.sin(t * 0.25)) * 26, 17, t * 0.5);
      ctx.restore();
      this.fxbPetals(ctx, W, top, bot, t, 26, 5, 2.2, 4);
      if (t >= pass) this.ptdWord(ctx, 'OLÉ!', W * 0.8, top + 110, 96, GIN_C, seg(t, pass, pass + 8), 1 - seg(t, pass + 50, pass + 70), -0.1);
      // painel: o sorriso do Bachira
      const pk = ease(seg(t, 130, 146));
      if (pk > 0) {
        const pts = [[24, top + 14], [470, top + 14], [450, top + 176], [24, top + 186]];
        this.ptdPanel(ctx, pts, () => {
          ctx.fillStyle = '#1c1504';
          ctx.fillRect(0, top, 500, 200);
          this.ptdRays(ctx, 240, top + 100, 420, GIN_C, 0.3, t * 0.004, 40);
          const dw = 470;
          this.fxbFaceCrop(ctx, o.bachira, 240 - dw / 2, top + 4, dw, 4, 7.2, 28, 7, { ring: GIN_C, iris: '#713f12' });
          this.finKicker(ctx, 430, top + 158, 'BACHIRA', seg(t, 144, 160), GIN_C, 'right');
        }, { dx: (1 - pk) * -500 });
      }
      this.fxbSfx(S, pass, 'ole', () => window.SFX?.whoosh());
    },

    // PLANO 3 — cara a cara: você e o monstro, o nome
    fxbGin2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbGinCast();
      const hit = 6;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#0c0904'], [1, '#2a1f05']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.02 + easeIO(t / 90) * 0.05, shake: 0.7 + (t >= hit ? 6 * (1 - seg(t, hit, hit + 24)) : 0) });
      this.ptdRays(ctx, 640, top + 220, W, GIN_C, 0.18, -t * 0.004, 48);
      // metade esquerda: você; direita: o monstro (cada um no seu recorte)
      const split = (side, fn) => {
        ctx.save();
        const sx = 640 + Math.sin(t * 0.1) * 6;
        poly(ctx, side < 0 ? [[-100, -100], [sx + 60, -100], [sx - 60, H + 100], [-100, H + 100]] : [[sx + 60, -100], [W + 100, -100], [W + 100, H + 100], [sx - 60, H + 100]]);
        ctx.clip();
        fn();
        ctx.restore();
      };
      split(-1, () => {
        ctx.fillStyle = 'rgba(250,204,21,0.12)';
        ctx.fillRect(-100, -100, 840, H + 200);
        const size = 820;
        const eyeY = top + 240;
        const { u } = this.fxbHead(ctx, o.c.you, 420, eyeY, size, { rim: GIN_C, rimD: 3 });
        this.ptdEyes(ctx, o.c.you, 420, eyeY, u, { ring: GIN_C, iris: '#713f12', look: 1 });
      });
      split(1, () => {
        ctx.fillStyle = '#060409';
        ctx.fillRect(560, -100, W, H + 200);
        this.cineGlow(ctx, 900, top + 230, 380, 'rgba(250,204,21,0.25)');
        const ms = 17;
        this.fxbMonster(ctx, 900, top + 230 + 38 * ms, ms, 1, 1);
      });
      // o raio que divide
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 12;
      const sx = 640 + Math.sin(t * 0.1) * 6;
      ctx.beginPath();
      ctx.moveTo(sx + 60, -100);
      ctx.lineTo(sx - 60, H + 100);
      ctx.stroke();
      ctx.strokeStyle = GIN_C;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();
      this.fxbPetals(ctx, W, top, bot, t, 30, 9, 2.6, 5);
      this.fxbTitle(ctx, S, t - 12, { cfg: o.c, y: bot - 130, color: GIN_C });
      if (t >= hit) this.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, hit, hit + 10)), '#fef9c3');
      this.fxbSfx(S, hit, 'monstro', () => window.SFX?.jingle([392, 523, 659, 784], 0, 'square'));
    }
  });

  // ==========================================================================
  // 4. DOMÍNIO PREGUIÇOSO (Nagi) — o bocejo, o céu lento, a bola morta no pé
  // ==========================================================================
  const NAG_C = '#e2e8f0';
  const NAG_INK = '#334155';

  Object.assign(CE, {
    fxbNagCast() {
      const c = this.fxbCfg('fl_epico_preguica');
      return { c, nagi: this.cineChar('nagi') };
    },
    // Nuvem em pixel (pronta por variante)
    fxbCloudCv(i) {
      return this.fxbBg(`fxbCloud|${i}`, 64, 28, (g, w, h) => {
        const blobs = [
          [[14, 18, 9], [26, 13, 11], [40, 15, 10], [52, 19, 8]],
          [[12, 19, 8], [24, 14, 10], [36, 12, 12], [50, 18, 9]],
          [[16, 17, 10], [30, 11, 10], [44, 16, 11]]
        ][i % 3];
        g.fillStyle = '#000';
        blobs.forEach(([x, y, r]) => {
          g.beginPath();
          g.arc(x, y, r, 0, TAU);
          g.fill();
        });
        g.fillRect(8, 18, 50, 8);
        const img = g.getImageData(0, 0, w, h);
        const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img.data[(y * w + x) * 4 + 3] > 120);
        const out = g.createImageData(w, h);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (!A(x, y)) continue;
            const k = (y * w + x) * 4;
            const low = !A(x, y + 2) || !A(x, y + 3);
            const hi = !A(x, y - 2) && !A(x - 1, y - 1);
            const col = hi ? [255, 255, 255] : low ? [191, 207, 228] : [241, 245, 249];
            out.data[k] = col[0];
            out.data[k + 1] = col[1];
            out.data[k + 2] = col[2];
            out.data[k + 3] = 255;
          }
        }
        g.clearRect(0, 0, w, h);
        g.putImageData(out, 0, 0);
      });
    },
    fxbClouds(ctx, W, y0, y1, t, n, speed, seed = 1, s = 6, alpha = 1) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha *= alpha;
      for (let i = 0; i < n; i++) {
        const sc = s * (0.7 + rnd(i, seed) * 0.6);
        const cw = 64 * sc;
        const x = mod(rnd(i, seed + 1) * (W + cw) + t * speed * (0.5 + rnd(i, seed + 2)), W + cw) - cw;
        const y = y0 + rnd(i, seed + 3) * (y1 - y0);
        ctx.drawImage(this.fxbCloudCv(i), Math.round(x), Math.round(y), cw, 28 * sc);
      }
      ctx.restore();
    },
    fxbSky(ctx, x, y, w, h) {
      this.cineGradient(ctx, x, y, w, h, [[0, '#60a5fa'], [0.6, '#93c5fd'], [1, '#dbeafe']]);
    },
    // Pena branca em pixel caindo (balança de um lado para o outro)
    fxbFeather(ctx, x, y, s, rot) {
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.rotate(rot);
      const p = s;
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-p * 0.5, -p * 6, p, p * 12);
      ctx.fillStyle = '#f8fafc';
      for (let i = -5; i < 5; i++) {
        const w = Math.round((3.2 - Math.abs(i + 0.5) * 0.5) * p);
        ctx.fillRect(-w - p * 0.5, i * p, w, p);
        ctx.fillRect(p * 0.5, i * p, w, p);
      }
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-p * 2.5, p * 2, p * 2, p);
      ctx.fillRect(p * 1, -p * 3, p * 2, p);
      ctx.restore();
    },

    // PLANO 1 — o bocejo (céu claro, nuvens devagar)
    fxbNag0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbNagCast();
      this.fxbSky(ctx, 0, 0, W, H);
      this.fxbClouds(ctx, W, top - 20, bot - 160, t, 6, 0.25, 2, 7);
      this.cineGlow(ctx, 1080, top + 60, 300, 'rgba(255,255,255,0.6)');
      const yawn = Math.sin(clamp(seg(t, 8, 72)) * Math.PI);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(370, 352, easeIO(t / 90)), zoom: 1 + easeIO(t / 90) * 0.06 + yawn * 0.02, rot: yawn * -0.03 });
      const size = 820;
      const eyeY = top + 250 + yawn * 6;
      const cx = 640;
      const { u, top: st } = this.fxbHead(ctx, o.c.you, cx, eyeY, size, { rim: '#ffffff', rimD: 3 });
      // olhos meio fechados (pálpebra pesada) — fecham de vez no meio do bocejo
      const px = u * 0.34;
      [-1, 1].forEach((s) => {
        const ex = cx + s * 3.5 * u;
        this.drawPixelEye(ctx, ex, eyeY, px, { line: '#020617', iris: '#334155', ring: '#94a3b8', blink: yawn > 0.6 });
        if (yawn <= 0.6) this.finLid(ctx, ex, eyeY, px, -s, 'half', mix(o.c.you.skinColor || '#f3d1b8', '#000000', 0.12));
      });
      // a boca do bocejo em pixel
      if (yawn > 0.05) {
        const mw = Math.round(2.4 + yawn * 1.2);
        const mh = Math.round(0.8 + yawn * 2.4);
        const mx = cx - mw * u * 0.5 + 0.2 * u;
        const my = st + 11.6 * u;
        ctx.fillStyle = '#1c0a0a';
        ctx.fillRect(Math.round(mx - u * 0.5), Math.round(my - u * 0.5), Math.ceil((mw + 1) * u), Math.ceil((mh + 1) * u));
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(Math.round(mx), Math.round(my), Math.ceil(mw * u), Math.ceil(mh * u));
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(Math.round(mx + u * 0.3), Math.round(my + (mh - 0.8) * u), Math.ceil((mw - 0.6) * u), Math.ceil(0.8 * u));
      }
      // lagriminha do bocejo
      const tk = seg(t, 50, 88);
      if (tk > 0) {
        ctx.fillStyle = 'rgba(186,230,253,0.95)';
        ctx.fillRect(Math.round(cx + 6.2 * u), Math.round(eyeY + u * 0.6 + tk * u * 1.4), Math.ceil(u * 0.6), Math.ceil(u * 0.8));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(cx + 6.2 * u), Math.round(eyeY + u * 0.6 + tk * u * 1.4), Math.ceil(u * 0.25), Math.ceil(u * 0.25));
      }
      ctx.restore();
      // a palavra do bocejo, mole, descendo
      if (t > 14) {
        ctx.save();
        ctx.globalAlpha = 1 - seg(t, 70, 88);
        this.rincStamp(ctx, 'FUAAAH~', 1010, top + 130 + seg(t, 14, 88) * 30, 64, '#ffffff', t, 14, 4);
        ctx.restore();
      }
      // painel: o Nagi, olhos de sono
      const pk = ease(seg(t, 30, 46));
      if (pk > 0) {
        const pts = [[30, bot - 176], [430, bot - 190], [420, bot - 16], [30, bot - 16]];
        this.ptdPanel(ctx, pts, () => {
          this.fxbSky(ctx, 0, bot - 200, 460, 200);
          this.fxbClouds(ctx, 460, bot - 210, bot - 80, t, 2, 0.3, 6, 3);
          const dw = 420;
          const U = dw / 28;
          const dx = 225 - dw / 2;
          const dy = bot - 186;
          this.fxbCrop(ctx, o.nagi, {}, 4, 3.4, 28, 12, dx, dy, dw, U * 12);
          const ey = dy + (10 - 3.4) * U;
          [-1, 1].forEach((s) => {
            const ex = dx + (18 - 4 + s * 3.5) * U;
            this.drawPixelEye(ctx, ex, ey, U * 0.34, { line: '#020617', iris: '#334155', ring: '#94a3b8' });
            this.finLid(ctx, ex, ey, U * 0.34, -s, 'half', mix(o.nagi.skinColor || '#f8e2cf', '#000000', 0.12));
          });
          this.finKicker(ctx, 400, bot - 40, 'NAGI', seg(t, 44, 60), '#475569', 'right');
        }, { dy: (1 - pk) * 260 });
      }
      this.finKicker(ctx, 40, top + 34, 'TUDO FICA LENTO', seg(t, 4, 40), '#1e3a8a');
      this.fxbSfx(S, 14, 'boc', () => window.SFX?.tone?.('sine', 330, 160, 0.9, 0.2));
    },

    // PLANO 2 — a câmera desce do céu com a bola em câmera lenta; ela morre no seu pé
    fxbNag1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbNagCast();
      const land = 138;
      const feet = H * 0.86;
      const x = W * 0.46;
      const size = 330;
      const footY = feet - 20;
      const fall = easeIO(seg(t, 0, land)) * 0.75 + seg(t, 0, land) * 0.25;
      const ballY = t < land ? lerp(-1300, footY - 16, fall) : footY - 16;
      const camY = Math.min(360, Math.max(-1150, ballY + 140));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: camY, zoom: 1.02, shake: 0.4 });
      // céu alto (acima do estádio) com nuvens em camadas e o sol
      this.fxbArena(ctx, S, 0);
      this.fxbSky(ctx, -60, -1700, W + 120, 1868);
      this.cineGlow(ctx, 980, -1180, 380, 'rgba(255,255,255,0.75)');
      this.fxbClouds(ctx, W, -1500, -200, t, 8, 0.18, 4, 9);
      this.fxbClouds(ctx, W, -900, -40, t, 4, 0.3, 8, 12, 0.85);
      // a pena que cai junto (mesma velocidade da bola: devagar)
      const fy = t < land + 30 ? lerp(-1200, footY - 60, seg(t, 0, land + 30)) : footY - 60;
      const fx = x - 150 + Math.sin(t * 0.06) * 60;
      this.fxbFeather(ctx, fx, fy, 4, Math.sin(t * 0.06) * 0.6);
      // você
      this.fxbShadow(ctx, x, feet, 70, 0.4);
      this.fxbSpr(ctx, o.c.you, x, feet, size, { rim: '#ffffff', rimD: 2 });
      // a bola: gira devagar, encosta no pé e PARA
      const bx = x + 44;
      const spin = t < land ? t * 0.08 : land * 0.08;
      this.ptdBall(ctx, bx, ballY, 20, spin, t < land ? '#ffffff' : null);
      if (t >= land) {
        const a = seg(t, land, land + 30);
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - a)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(bx, footY + 4, 20 + a * 70, 5 + a * 12, 0, 0, TAU);
        ctx.stroke();
      }
      // linhas de "câmera lenta" passando para cima (bem devagar)
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.18 * (1 - seg(t, land - 20, land));
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 16; i++) {
        const lx = rnd(i, 31) * W;
        const ly = mod(rnd(i, 32) * H - t * 2, H);
        ctx.fillRect(lx, ly, 2, 60 + rnd(i, 33) * 80);
      }
      ctx.restore();
      // HUD de câmera lenta
      ctx.save();
      ctx.font = '900 18px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.85 * (1 - seg(t, land, land + 10));
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText('VELOCIDADE  x0.1', W - 40, top + 30);
      ctx.restore();
      if (t >= land) this.rincStamp(ctx, '...toc.', x + 190, feet - 210, 48, '#ffffff', t - land, 4, 4);
      this.finKicker(ctx, 40, top + 34, 'A BOLA QUE CAI DO CÉU', seg(t, 4, 40), '#1e3a8a');
      this.fxbSfx(S, land, 'trap', () => window.SFX?.pass?.());
    },

    // PLANO 3 — tela de videogame: CLEAR!
    fxbNag2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbNagCast();
      const hit = 4;
      this.fxbSky(ctx, 0, 0, W, H);
      this.fxbClouds(ctx, W, top, bot - 120, t, 6, 0.3, 12, 7);
      // grade de pixels do "jogo"
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#1e3a8a';
      for (let x = 0; x < W; x += 16) ctx.fillRect(x, top, 1, bot - top);
      for (let y = top; y < bot; y += 16) ctx.fillRect(0, y, W, 1);
      ctx.restore();
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.02 + easeIO(t / 90) * 0.03, shake: t >= hit ? 4 * (1 - seg(t, hit, hit + 18)) : 0 });
      const feet = bot - 40;
      const yx = 240;
      this.fxbShadow(ctx, yx, feet, 90, 0.3);
      this.fxbSpr(ctx, o.c.you, yx, feet, 400, { rim: '#ffffff', rimD: 2 });
      this.ptdBall(ctx, yx + 54, feet - 20, 22, 0);
      ctx.restore();
      const MX = 760;
      // moldura de jogo (borda de pixel) + controle + placar
      ctx.save();
      ctx.fillStyle = '#0f172a';
      const B = 10;
      ctx.fillRect(20, top + 12, W - 40, B);
      ctx.fillRect(20, bot - 12 - B, W - 40, B);
      ctx.fillRect(20, top + 12, B, bot - top - 24);
      ctx.fillRect(W - 20 - B, top + 12, B, bot - top - 24);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(20 + B, top + 12 + B, W - 40 - B * 2, 4);
      ctx.restore();
      // controle em pixel no canto
      const cx0 = 60;
      const cy0 = top + 50;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx0 - 4, cy0 - 4, 88, 44);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(cx0, cy0, 80, 36);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx0 + 10, cy0 + 14, 18, 6);
      ctx.fillRect(cx0 + 16, cy0 + 8, 6, 18);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx0 + 54, cy0 + 16, 8, 8);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(cx0 + 64, cy0 + 8, 8, 8);
      this.finPixelText(ctx, `TRAP ${Math.min(100, Math.floor(seg(t, hit, hit + 30) * 100))}%`, W - 60, top + 68, 3, '#0f172a', 'right');
      // CLEAR! em pixel, caindo e quicando
      const ck = seg(t, hit, hit + 14);
      if (ck > 0) {
        const cy = lerp(top - 60, top + 110, back(ck));
        this.fxbPixWord(ctx, 'CLEAR!', MX, cy, 13, '#ffffff', '#0f172a');
      }
      // três estrelas em pixel
      const STAR = ['....o....', '...oyo...', '...oyo...', 'ooowyyooo', 'oyyyyyyyo', '.oyyyyyo.', '..oyyyo..', '.oyyoyyo.', '.oyo.oyo.', '.oo...oo.'];
      [0, 1, 2].forEach((i) => {
        const k = seg(t, hit + 12 + i * 6, hit + 20 + i * 6);
        if (k <= 0) return;
        const sx = MX + (i - 1) * 100;
        const sy = top + 196 - (i === 1 ? 18 : 0);
        const s = 6 * back(k);
        this.fxbPix(ctx, STAR, sx - 4.5 * s, sy - 5 * s, s, { o: '#0f172a', y: '#facc15', w: '#fef9c3' });
        this.fxbSfx(S, hit + 12 + i * 6, 'star' + i, () => window.SFX?.blip(880 + i * 220));
      });
      this.fxbTitle(ctx, S, t - 30, { cfg: o.c, x: MX, y: bot - 150, color: '#ffffff', maxW: W * 0.66 });
      if (t >= hit) this.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, hit, hit + 8)));
      this.fxbSfx(S, hit, 'clear', () => window.SFX?.jingle([659, 784, 1047, 1319], 0, 'square'));
    }
  });

  // ==========================================================================
  // 5. LEITURA DO XADREZ (Niko) — o gramado vira tabuleiro, três lances à frente
  // ==========================================================================
  const XAD_C = '#818cf8';
  const PIECES = {
    pawn: ['....oooo....', '...owwwwo...', '...owhwso...', '....owso....', '...owwwso...', '....owso....', '....owso....', '...owwwso...', '..owwwwwso..', '..oooooooo..'],
    rook: ['.oo.oooo.oo.', '.ow.owwo.so.', '.owwwwwwwso.', '..owhwwwso..', '..owhwwwso..', '..owwwwwso..', '..owwwwwso..', '..owwwwwso..', '.owwwwwwwso.', 'owwwwwwwwwso', 'oooooooooooo'],
    knight: ['....oo......', '...owwoo....', '..owwwwwo...', '.owhwowwwo..', '.owwwwwwwso.', '.oowwwwwwso.', '..ooowwwwso.', '....owwwwso.', '...owwwwwso.', '...owwwwwso.', '..owwwwwwwso', '..oooooooooo'],
    king: ['.....oo.....', '....owwo....', '.....oo.....', '...oooooo...', '..owwwwwwo..', '..owhwwwso..', '...owwwso...', '...owhwso...', '....owso....', '....owso....', '...owwwso...', '..owwwwwso..', '.owwwwwwwso.', '.oooooooooo.']
  };
  const PAL_W = { o: '#1e1b4b', w: '#eef2ff', h: '#ffffff', s: '#a5b4fc' };
  const PAL_B = { o: '#a5b4fc', w: '#1e1b4b', h: '#4338ca', s: '#0b0a24' };
  const PAL_Y = { o: '#0b0a24', w: '#818cf8', h: '#e0e7ff', s: '#4338ca' };
  const XAD_CAM1 = { cx: 640, hy: 70, f: 900, h: 28, d: 54 };
  const XAD_CAM2 = { cx: 640, hy: -260, f: 900, h: 50, d: 70 };
  const XAD_CAM3 = { cx: 640, hy: 250, f: 900, h: 9, d: 22 };

  Object.assign(CE, {
    fxbXadCast() {
      const c = this.fxbCfg('fl_epico_xadrez');
      const kit = this.fxbKit(c.you);
      return {
        c,
        niko: this.cineChar('niko'),
        mates: [['chigiri', 12, 10], ['bachira', 20, 22], ['kunigami', -20, 14]].map(([id, X, Y]) => ({ ch: this.fxbMate(id, kit), X, Y })),
        rivals: [['ness', 4, 18], ['kaiser', 10, 30], ['grim', -10, 26], ['gesner', 26, 14]].map(([id, X, Y]) => ({ ch: this.fxbMate(id, KIT_RIVAL), X, Y }))
      };
    },
    // Peça de xadrez em pixel pronta (canvas pequeno, ampliado sem suavizar)
    fxbPieceCv(kind, pal) {
      const rows = PIECES[kind];
      const key = `fxbPiece|${kind}|${pal.w}`;
      return this.fxbBg(key, 12, rows.length, (g) => this.fxbPix(g, rows, 0, 0, 1, pal));
    },
    // Peça com a base em (x, y); h = altura em px
    fxbPiece(ctx, kind, pal, x, y, h, glow = null, rot = 0) {
      const cv = this.fxbPieceCv(kind, pal);
      const s = h / cv.height;
      if (glow) this.cineGlow(ctx, x, y - h * 0.5, h * 0.9, glow);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(x), Math.round(y));
      if (rot) ctx.rotate(rot);
      ctx.drawImage(cv, -6 * s, -cv.height * s, 12 * s, cv.height * s);
      ctx.restore();
    },
    // Casas do tabuleiro (cols x rows de lado sq, começando em X0/Y0), aparecem em onda a partir de (wx, wy)
    fxbBoard(ctx, cam, X0, Y0, cols, rows, sq, t, t0, wx, wy, alpha = 0.9) {
      for (let r = rows - 1; r >= 0; r--) {
        for (let c = 0; c < cols; c++) {
          const xa = X0 + c * sq;
          const ya = Y0 + r * sq;
          const d = Math.hypot(xa + sq / 2 - wx, ya + sq / 2 - wy);
          const k = t0 == null ? 1 : seg(t, t0 + d * 0.9, t0 + d * 0.9 + 8);
          if (k <= 0) continue;
          const a = this.fxbProj(cam, xa, ya);
          const b = this.fxbProj(cam, xa + sq, ya);
          const e = this.fxbProj(cam, xa + sq, ya + sq);
          const f = this.fxbProj(cam, xa, ya + sq);
          ctx.globalAlpha = alpha * k;
          ctx.fillStyle = (r + c) % 2 ? '#c7d2fe' : '#1e1b4b';
          poly(ctx, [a, b, e, f]);
          ctx.fill();
          if (k < 1) {
            ctx.globalAlpha = 1 - k;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = rgba(XAD_C, 0.7);
      ctx.lineWidth = 2;
      const kAll = t0 == null ? 1 : seg(t, t0 + 30, t0 + 50);
      if (kAll > 0) {
        ctx.globalAlpha = kAll;
        this.fxbLine(ctx, cam, [[X0, Y0], [X0 + cols * sq, Y0], [X0 + cols * sq, Y0 + rows * sq], [X0, Y0 + rows * sq], [X0, Y0]], 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },
    // Seta de previsão no tabuleiro (pontilhada, com o número do lance)
    fxbArrow(ctx, a, b, k, n, color, lift = 0) {
      if (k <= 0) return;
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2 - lift;
      const N = 20;
      const pts = [];
      for (let i = 0; i <= N * k; i++) {
        const s = i / N;
        pts.push([(1 - s) * (1 - s) * a[0] + 2 * (1 - s) * s * mx + s * s * b[0], (1 - s) * (1 - s) * a[1] + 2 * (1 - s) * s * my + s * s * b[1]]);
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0b0a24';
      ctx.lineWidth = 9;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (k >= 1 && pts.length > 2) {
        const [px, py] = pts[pts.length - 2];
        const ang = Math.atan2(b[1] - py, b[0] - px);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(b[0] + Math.cos(ang) * 6, b[1] + Math.sin(ang) * 6);
        ctx.lineTo(b[0] + Math.cos(ang + 2.5) * 22, b[1] + Math.sin(ang + 2.5) * 22);
        ctx.lineTo(b[0] + Math.cos(ang - 2.5) * 22, b[1] + Math.sin(ang - 2.5) * 22);
        ctx.closePath();
        ctx.fill();
      }
      // número do lance
      ctx.fillStyle = '#0b0a24';
      ctx.beginPath();
      ctx.arc(a[0], a[1] - 30, 17, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = '900 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e0e7ff';
      ctx.fillText(String(n), a[0], a[1] - 29);
      ctx.restore();
    },

    // PLANO 1 — o gramado vira tabuleiro a partir de você; cada um ganha a sua peça
    fxbXad0(ctx, S) {
      const { W, H, t, top } = S;
      const o = this.fxbXadCast();
      const cam = XAD_CAM1;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: lerp(640, 600, easeIO(t / 95)), y: lerp(390, 420, easeIO(t / 95)), zoom: lerp(1, 1.1, easeIO(t / 95)), rot: lerp(0, -0.02, easeIO(t / 95)), shake: 0.6 });
      this.fxbPitch(ctx, 'night', W, H, cam);
      ctx.fillStyle = 'rgba(30,27,75,0.35)';
      ctx.fillRect(-50, -50, W + 100, H + 100);
      this.fxbBoard(ctx, cam, -34, -14, 8, 6, 8, t, 6, -6, -4, 0.82);
      const list = [];
      o.rivals.forEach((r) => list.push({ ch: r.ch, X: r.X, Y: r.Y, piece: r.X === 10 ? 'king' : r.X > 20 ? 'rook' : 'pawn', pal: PAL_B }));
      o.mates.forEach((m) => list.push({ ch: m.ch, X: m.X, Y: m.Y, piece: m.X < 0 ? 'rook' : 'pawn', pal: PAL_W }));
      list.push({ ch: o.c.you, X: -6, Y: -4, piece: 'knight', pal: PAL_Y, you: true });
      list.sort((a, b) => b.Y - a.Y);
      list.forEach((p, i) => {
        const [sx, sy, k] = this.fxbProj(cam, p.X, p.Y);
        this.fxbShadow(ctx, sx, sy, k * 1.2, 0.5);
        const r = this.fxbOnPitch(ctx, cam, p.ch, p.X, p.Y, p.you ? { rim: XAD_C, rimD: 2 } : { flipX: p.pal === PAL_B }, 4.6);
        const pk = back(seg(t, 40 + i * 3, 52 + i * 3));
        if (pk > 0) {
          const ph = k * (p.you ? 3.4 : 2.6) * pk;
          const by = r.top - 8 - Math.sin(t * 0.08 + i) * 3;
          this.fxbPiece(ctx, p.piece, p.pal, sx, by, ph, p.you ? rgba(XAD_C, 0.8) : p.pal === PAL_B ? 'rgba(165,180,252,0.35)' : 'rgba(255,255,255,0.4)');
        }
      });
      ctx.restore();
      this.finKicker(ctx, 40, top + 34, 'O CAMPO VIRA UM TABULEIRO', seg(t, 4, 40), XAD_C);
      this.fxbSfx(S, 6, 'board', () => window.SFX?.whoosh());
      this.fxbSfx(S, 40, 'pieces', () => window.SFX?.blip(523));
    },

    // PLANO 2 — vista de cima: três lances previstos e jogados, um atrás do outro
    fxbXad1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbXadCast();
      const cam = XAD_CAM2;
      const sq = 5;
      const C = (c, r) => this.fxbProj(cam, -20 + (c + 0.5) * sq, -20 + (r + 0.5) * sq);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#05041a'], [1, '#14114a']]);
      ctx.save();
      const k = easeIO(t / 190);
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(430, 410, k), zoom: lerp(1.0, 1.07, k), rot: lerp(0.03, -0.02, k), shake: 0.5 });
      this.cineGlow(ctx, 640, 420, 600, 'rgba(129,140,248,0.22)');
      this.fxbBoard(ctx, cam, -20, -20, 8, 8, sq, t, null, 0, 0, 0.95);
      // a partida: [peça, paleta, col, row] e os três lances
      const moves = [
        { at: 20, from: [2, 5], to: [2, 4] },
        { at: 72, from: [1, 3], to: [2, 4], take: true },
        { at: 124, from: [3, 2], to: [4, 4], jump: true }
      ];
      const pcs = [
        { kind: 'king', pal: PAL_B, at: [5, 6] },
        { kind: 'rook', pal: PAL_B, at: [1, 6] },
        { kind: 'pawn', pal: PAL_B, at: [2, 5], id: 'm0' },
        { kind: 'pawn', pal: PAL_B, at: [4, 6] },
        { kind: 'pawn', pal: PAL_B, at: [6, 5] },
        { kind: 'rook', pal: PAL_W, at: [0, 1] },
        { kind: 'pawn', pal: PAL_W, at: [1, 3], id: 'm1' },
        { kind: 'pawn', pal: PAL_W, at: [5, 2] },
        { kind: 'knight', pal: PAL_Y, at: [3, 2], id: 'm2', you: true }
      ];
      // setas de previsão (aparecem antes do lance)
      moves.forEach((m, i) => {
        const a = C(...m.from);
        const b = C(...m.to);
        this.fxbArrow(ctx, a, b, ease(seg(t, m.at - 14, m.at)) * (1 - seg(t, m.at + 30, m.at + 40)), i + 1, i === 2 ? '#e0e7ff' : XAD_C, m.jump ? 90 : 20);
      });
      const placed = pcs.map((p) => {
        let [cx, cy] = C(...p.at);
        let lift = 0;
        let gone = 0;
        moves.forEach((m, i) => {
          if (p.id === 'm' + i) {
            const mk = easeIO(seg(t, m.at + 4, m.at + 20));
            const [ax, ay] = C(...m.from);
            const [bx, by] = C(...m.to);
            cx = lerp(ax, bx, mk);
            cy = lerp(ay, by, mk);
            if (m.jump) lift = Math.sin(mk * Math.PI) * 120;
          }
          // a peça capturada sai voando do tabuleiro
          if (m.take && p.id === 'm0') gone = seg(t, m.at + 18, m.at + 34);
        });
        return { p, cx, cy, lift, gone };
      });
      placed.sort((a, b) => a.cy - b.cy);
      placed.forEach(({ p, cx, cy, lift, gone }) => {
        if (gone >= 1) return;
        // tamanho pela profundidade (linha da tela)
        const depth = clamp((cy - 240) / 400);
        const h = lerp(64, 118, depth) * (p.kind === 'king' ? 1.25 : p.kind === 'pawn' ? 0.8 : 1);
        this.fxbShadow(ctx, cx, cy + 6, h * 0.32, 0.5);
        const gy = gone > 0 ? -Math.sin(gone * Math.PI) * 80 + gone * 120 : 0;
        this.fxbPiece(ctx, p.kind, p.pal, cx + gone * 160, cy + 8 - lift + gy, h, p.you ? rgba(XAD_C, 0.85) : null, gone * 3);
      });
      // xeque: o rei acende em vermelho
      const ck = seg(t, 146, 156);
      if (ck > 0) {
        const [kx, ky] = C(5, 6);
        const r = 50 + Math.sin(t * 0.2) * 4;
        ctx.strokeStyle = `rgba(244,63,94,${ck})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(kx, ky + 6, r, r * 0.45, 0, 0, TAU);
        ctx.stroke();
        this.ptdChip(ctx, 'XEQUE', kx + 130, ky - 40, '#f43f5e', ck, { size: 15 });
      }
      ctx.restore();
      // contador de lances (HUD)
      const nMove = t < 20 ? 0 : t < 72 ? 1 : t < 124 ? 2 : 3;
      this.finKicker(ctx, 40, top + 34, `LANCE ${nMove} DE 3 — VOCÊ JÁ VIU TODOS`, seg(t, 4, 30), XAD_C);
      // painel: o olho do Niko atrás da franja
      const pk = ease(seg(t, 40, 56));
      if (pk > 0) {
        const pts = [[W - 420, bot - 190], [W - 18, bot - 200], [W - 18, bot - 16], [W - 440, bot - 16]];
        this.ptdPanel(ctx, pts, () => {
          ctx.fillStyle = '#0b0a24';
          ctx.fillRect(W - 460, bot - 210, 460, 210);
          this.ptdRays(ctx, W - 220, bot - 100, 400, XAD_C, 0.3, t * 0.003, 40);
          const dw = 420;
          const U = dw / 28;
          const dx = W - 225 - dw / 2;
          const dy = bot - 196;
          this.fxbCrop(ctx, o.niko, {}, 4, 3.4, 28, 12, dx, dy, dw, U * 12);
          const ey = dy + (10 - 3.4) * U;
          [-1, 1].forEach((sd) => this.cineGlow(ctx, dx + (14 + sd * 3.5) * U, ey, U * 3, 'rgba(129,140,248,0.7)', seg(t, 56, 66)));
          if (t > 56) this.ptdEyes(ctx, o.niko, dx + 14 * U, ey, U, { ring: XAD_C, iris: '#312e81', look: -1 });
          this.finKicker(ctx, W - 40, bot - 36, 'NIKO', seg(t, 54, 70), XAD_C, 'right');
        }, { dx: (1 - pk) * 460 });
      }
      moves.forEach((m, i) => {
        this.fxbSfx(S, m.at - 14, 'prev' + i, () => window.SFX?.blip(392 + i * 130));
        this.fxbSfx(S, m.at + 20, 'move' + i, () => window.SFX?.page?.());
      });
      this.fxbSfx(S, 146, 'xeque', () => window.SFX?.blip(1047));
    },

    // PLANO 3 — o cavalo bate no tabuleiro, o rei racha e cai: XEQUE
    fxbXad2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbXadCast();
      const cam = XAD_CAM3;
      const hit = 8;
      const isHit = t >= hit;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#05041a'], [0.5, '#1e1b4b'], [1, '#05041a']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: 1.02 + easeIO(t / 90) * 0.04, shake: 0.6 + (isHit ? 9 * (1 - seg(t, hit, hit + 26)) : 0) });
      this.ptdRays(ctx, 760, 300, W * 1.2, XAD_C, 0.16, t * 0.002, 44);
      this.fxbBoard(ctx, cam, -20, -10, 8, 10, 5, t, null, 0, 0, 0.95);
      // o rei preto, gigante, racha e tomba para trás
      const [kx, ky] = this.fxbProj(cam, 7.5, 22.5);
      const fall = easeIn(seg(t, 34, 62));
      const kh = 330;
      ctx.save();
      ctx.globalAlpha = 1 - seg(t, 60, 72);
      this.fxbPiece(ctx, 'king', PAL_B, kx, ky, kh, 'rgba(244,63,94,0.3)', fall * 1.3);
      if (isHit) {
        // rachaduras no rei (só enquanto está de pé)
        const ck = ease(seg(t, hit + 4, hit + 20)) * (1 - fall);
        if (ck > 0) {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 3;
          ctx.beginPath();
          let cx = kx - 6;
          let cy = ky - kh * 0.9;
          ctx.moveTo(cx, cy);
          for (let i = 0; i < 7 * ck; i++) {
            cx += (rnd(i, 3) - 0.5) * 40;
            cy += kh * 0.11;
            ctx.lineTo(cx, cy);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
      // o cavalo (você) bate na casa da frente
      const [nx, ny] = this.fxbProj(cam, -2.5, 7.5);
      const drop = isHit ? 0 : (1 - easeIn(seg(t, 0, hit))) * 420;
      this.fxbPiece(ctx, 'knight', PAL_Y, nx, ny - drop, 270, rgba(XAD_C, 0.7));
      if (isHit) {
        this.ptdRings(ctx, nx, ny, seg(t, hit, hit + 30), ['#ffffff', XAD_C, '#312e81'], 420, 0);
        this.fxbSparks(ctx, nx, ny - 10, seg(t, hit, hit + 30), 26, ['#e0e7ff', XAD_C, '#ffffff'], 1, 5, -Math.PI / 2, 2.6, 300);
      }
      ctx.restore();
      // você, em primeiro plano à esquerda, olhando o lance
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1, shake: isHit ? 6 * (1 - seg(t, hit, hit + 26)) : 0.6 });
      this.fxbSpr(ctx, o.c.you, 190, bot + 180, 560, { rim: XAD_C, rimD: 3 });
      const u = 560 / 36;
      this.ptdEyes(ctx, o.c.you, 190, bot + 180 - 560 * 0.87 + SPRITE_MAPY(10) * u, u, { ring: XAD_C, iris: '#312e81', look: 1 });
      ctx.restore();
      if (isHit) {
        this.ptdWord(ctx, 'XEQUE!', W * 0.62, top + 190, 130, XAD_C, seg(t, hit, hit + 8), 1 - seg(t, 30, 40), -0.08);
        this.cineFlash(ctx, W, H, 0.55 * (1 - seg(t, hit, hit + 9)), '#e0e7ff');
      }
      this.fxbTitle(ctx, S, t - 36, { cfg: o.c, x: W * 0.6, y: top + 150, color: XAD_C, maxW: W * 0.74 });
      this.fxbSfx(S, hit, 'cavalo', () => window.SFX?.kick?.(1));
      this.fxbSfx(S, 34, 'rei', () => window.SFX?.tackle?.());
    }
  });

  // ==========================================================================
  // 6. QUÍMICA EXPLOSIVA (Shidou) — células explodindo até o BIG BANG
  // ==========================================================================
  const BB_C = '#ec4899';

  Object.assign(CE, {
    fxbBBCast() {
      const c = this.fxbCfg('fl_lendario_bigbang');
      return { c, shidou: this.cineChar('shidou', { jerseyPrimary: '#1e1b4b', jerseySecondary: '#ec4899' }) };
    },
    // Célula em pixel (32 x 32): membrana clara, citoplasma em anéis e o núcleo
    fxbCellCv(v) {
      return this.fxbBg(`fxbCell|${v}`, 32, 32, (g) => {
        const pal = v ? ['#831843', '#be185d', '#ec4899', '#f9a8d4', '#fdf2f8'] : ['#581c87', '#9d174d', '#db2777', '#f472b6', '#fce7f3'];
        for (let y = 0; y < 32; y++) {
          for (let x = 0; x < 32; x++) {
            const d = Math.hypot(x + 0.5 - 16, (y + 0.5 - 16) * 1.06);
            if (d > 14.6) continue;
            let c;
            if (d > 13.4) c = pal[4];
            else if (d > 12.2) c = pal[3];
            else {
              const nd = Math.hypot(x + 0.5 - (v ? 18 : 14), y + 0.5 - 14);
              if (nd < 4.2) c = nd < 1.6 ? pal[4] : pal[0];
              else c = d > 9 ? pal[2] : pal[1];
              if ((x * 7 + y * 3) % 23 === 0 && nd > 5) c = pal[3];
            }
            g.fillStyle = c;
            g.fillRect(x, y, 1, 1);
          }
        }
        g.fillStyle = 'rgba(255,255,255,0.8)';
        g.fillRect(9, 7, 3, 2);
        g.fillRect(8, 9, 2, 2);
      });
    },
    fxbCell(ctx, x, y, r, v, wob = 0, alpha = 1) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha *= alpha;
      const s = (r * 2) / 29;
      ctx.translate(x, y);
      ctx.scale(1 + wob, 1 - wob);
      ctx.drawImage(this.fxbCellCv(v), -16 * s, -16 * s, 32 * s, 32 * s);
      ctx.restore();
    },
    // Estouro rosa: anéis, estilhaços quadrados e um brilho
    fxbBurst(ctx, x, y, k, R, seed = 1) {
      if (k <= 0 || k >= 1) return;
      this.cineGlow(ctx, x, y, Math.min(180, R * (0.6 + k)), 'rgba(236,72,153,0.8)', 1 - k);
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#fdf2f8';
      ctx.lineWidth = 5 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(x, y, R * ease(k), 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = BB_C;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, R * 0.7 * ease(k), 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = rnd(i, seed) * TAU;
        const d = R * 1.2 * ease(k) * (0.5 + rnd(i, seed + 1) * 0.6);
        ctx.fillStyle = i % 3 ? '#f9a8d4' : '#ffffff';
        const s = 6 * (1 - k) + 2;
        ctx.fillRect(Math.round(x + Math.cos(a) * d - s / 2), Math.round(y + Math.sin(a) * d - s / 2), s, s);
      }
      ctx.restore();
    },

    // PLANO 1 — dentro do corpo: as células acordam e começam a estourar
    fxbBB0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbBBCast();
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#14021a'], [0.5, '#3b0a2e'], [1, '#14021a']]);
      const beat = (at) => (t < at || t > at + 14 ? 0 : Math.pow(1 - (t - at) / 14, 2));
      const b = beat(10) + beat(34) + beat(52) + beat(64);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(1, 1.35, easeIn(t / 75)) + b * 0.03, rot: t * 0.0015, shake: 0.8 + b * 3 });
      this.cineGlow(ctx, 640, 360, 400, 'rgba(236,72,153,0.28)');
      // camadas: as do fundo maiores e escuras (fora de foco), as da frente vivas
      for (let i = 0; i < 18; i++) {
        const layer = i % 3;
        const x = 640 + (rnd(i, 3) - 0.5) * 1500 + Math.sin(t * 0.02 + i) * 20;
        const y = 360 + (rnd(i, 4) - 0.5) * 900 + Math.cos(t * 0.018 + i) * 16;
        const r = (layer === 0 ? 120 : layer === 1 ? 70 : 44) * (0.8 + rnd(i, 5) * 0.4);
        const popAt = 26 + rnd(i, 6) * 46;
        if (layer === 2 && t > popAt) {
          this.fxbBurst(ctx, x, y, seg(t, popAt, popAt + 22), r * 2.2, i);
          continue;
        }
        const wob = Math.sin(t * 0.3 + i) * 0.04 * (1 + b * 3) * seg(t, 10, 40);
        this.fxbCell(ctx, x, y, r * (1 + b * 0.08), i % 2, wob, layer === 0 ? 0.45 : layer === 1 ? 0.75 : 1);
      }
      // a célula do centro (a sua), pulsando no compasso
      this.fxbCell(ctx, 640, 360, 110 * (1 + b * 0.12), 1, Math.sin(t * 0.4) * 0.03 * seg(t, 30, 60));
      ctx.restore();
      [10, 34, 52, 64].forEach((at, i) => {
        if (t < at || t > at + 22) return;
        this.ptdWord(ctx, i < 2 ? 'BUM' : 'BUM BUM', i % 2 ? W * 0.78 : W * 0.22, i % 2 ? top + 120 : bot - 120, 50 + i * 8, '#f9a8d4', seg(t, at, at + 6), 1 - seg(t, at + 12, at + 22), i % 2 ? 0.08 : -0.08);
      });
      this.finKicker(ctx, 40, top + 34, 'SUAS CÉLULAS ESTÃO ACORDANDO', seg(t, 4, 40), BB_C);
      [10, 34, 52, 64].forEach((at, i) => this.fxbSfx(S, at, 'beat' + i, () => window.SFX?.blip(98)));
    },

    // PLANO 2 — a reação em cadeia: do Shidou até você, célula por célula
    fxbBB1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbBBCast();
      const reach = 128;
      const lit = seg(t, reach, reach + 10);
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#0d0214'], [0.6, '#2a0626'], [1, '#12030f']]);
      ctx.save();
      const k = easeIO(t / 190);
      this.cineCamera(ctx, W, H, { x: lerp(700, 600, k), y: 370, zoom: lerp(1.02, 1.08, k), shake: 0.7 + (t >= reach ? 5 * (1 - seg(t, reach, reach + 24)) : 0) });
      this.ptdRays(ctx, 640, 360, W, BB_C, 0.12, t * 0.003, 40);
      this.cineBokeh(ctx, W, top, bot, t, 14, ['rgba(236,72,153,0.4)', 'rgba(168,85,247,0.35)'], 7);
      const feet = bot + 30;
      // o Shidou à direita, aceso de rosa
      this.cineGlow(ctx, 1010, feet - 260, 300, 'rgba(236,72,153,0.3)');
      this.fxbSpr(ctx, o.shidou, 1010, feet, 470, { animState: t > 18 && t < 40 ? 'shoot' : 'idle', flipX: true, rim: BB_C, rimD: 3, showAura: true, auraColor: BB_C, frame: auraF(t) });
      // a corrente de células entre vocês dois (arco), estourando uma a uma
      const N = 9;
      for (let i = 0; i < N; i++) {
        const s = i / (N - 1);
        const x = lerp(900, 380, s);
        const y = feet - 300 - Math.sin(s * Math.PI) * 170 + Math.sin(t * 0.05 + i) * 8;
        const at = 26 + i * 12;
        if (t < at) this.fxbCell(ctx, x, y, 34 + Math.sin(s * Math.PI) * 14, i % 2, Math.sin(t * 0.3 + i) * 0.05);
        else this.fxbBurst(ctx, x, y, seg(t, at, at + 26), 110, i + 20);
        this.fxbSfx(S, at, 'pop' + i, () => window.SFX?.blip(523 + i * 60));
      }
      // você à esquerda: a onda chega e as suas células explodem junto
      this.cineGlow(ctx, 270, feet - 260, 300, `rgba(236,72,153,${0.15 + 0.25 * lit})`);
      this.fxbSpr(ctx, o.c.you, 270, feet, 470, lit > 0 ? { rim: BB_C, rimD: 3, showAura: true, auraColor: BB_C, frame: auraF(t) } : { rim: '#f9a8d4', rimD: 2 });
      const u = 470 / 36;
      const yTop = feet - 470 * 0.87;
      if (lit > 0) this.ptdEyes(ctx, o.c.you, 270, yTop + 10 * u, u, { ring: BB_C, iris: '#831843' });
      if (t >= reach) this.fxbBurst(ctx, 270, feet - 260, seg(t, reach, reach + 34), 300, 77);
      ctx.restore();
      if (t >= reach) this.ptdWord(ctx, 'REAÇÃO EM CADEIA!', W / 2, top + 90, 70, BB_C, seg(t, reach, reach + 8), 1, -0.04, W * 0.84);
      this.finKicker(ctx, 40, top + 34, 'DO SHIDOU ATÉ VOCÊ', seg(t, 4, 40), BB_C);
      this.fxbSfx(S, reach, 'chega', () => window.SFX?.kick?.(1));
    },

    // PLANO 3 — o BIG BANG rosa: um ponto, a explosão, o universo nascendo
    fxbBB2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbBBCast();
      const bang = 10;
      const k = seg(t, bang, bang + 60);
      ctx.fillStyle = '#050008';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.04 - ease(k) * 0.04, shake: t >= bang ? 10 * (1 - seg(t, bang, bang + 34)) + 0.6 : 0.6 });
      this.cineNightSky(ctx, W, H, t, { top: '#050008', bottom: '#1a0420' });
      const cx = 640;
      const cy = top + 230;
      if (t < bang) {
        // o ponto, juntando luz
        const p = seg(t, 0, bang);
        this.cineGlow(ctx, cx, cy, 60 + p * 80, 'rgba(253,242,248,0.95)');
        this.cineGlow(ctx, cx, cy, 200, 'rgba(236,72,153,0.4)', p);
      } else {
        // nebulosas abrindo
        [[0, 0, 1, 'rgba(236,72,153,0.5)'], [-160, 40, 0.8, 'rgba(168,85,247,0.45)'], [180, -30, 0.7, 'rgba(244,114,182,0.45)'], [40, 120, 0.6, 'rgba(129,140,248,0.35)']].forEach(([dx, dy, s, col]) => {
          this.cineGlow(ctx, cx + dx * ease(k), cy + dy * ease(k), (180 + 520 * ease(k)) * s, col, 1 - k * 0.3);
        });
        // estrelas riscando para fora (linhas radiais)
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < 70; i++) {
          const a = rnd(i, 41) * TAU;
          const sp = 0.4 + rnd(i, 42) * 0.9;
          const d0 = (t - bang) * 14 * sp;
          const len = 30 + 90 * sp * (1 - k * 0.6);
          if (d0 > 1200) continue;
          ctx.strokeStyle = i % 4 ? 'rgba(249,168,212,0.85)' : 'rgba(255,255,255,0.95)';
          ctx.lineWidth = 2 + (i % 3);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * d0, cy + Math.sin(a) * d0);
          ctx.lineTo(cx + Math.cos(a) * (d0 + len), cy + Math.sin(a) * (d0 + len));
          ctx.stroke();
        }
        ctx.restore();
        // cascas de choque
        [0, 8, 16].forEach((d, i) => {
          const kk = seg(t, bang + d, bang + d + 50);
          if (kk <= 0 || kk >= 1) return;
          ctx.strokeStyle = [`rgba(255,255,255,${1 - kk})`, `rgba(236,72,153,${1 - kk})`, `rgba(168,85,247,${1 - kk})`][i];
          ctx.lineWidth = 10 * (1 - kk) + 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 900 * ease(kk), 900 * ease(kk) * 0.7, 0, 0, TAU);
          ctx.stroke();
        });
        // pedaços de células voando
        for (let i = 0; i < 16; i++) {
          const a = rnd(i, 51) * TAU;
          const d = (t - bang) * (5 + rnd(i, 52) * 6);
          this.fxbCell(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 10 + rnd(i, 53) * 14, i % 2, 0, 1 - seg(t, bang + 40, bang + 80));
        }
        this.cineGlow(ctx, cx, cy, 160, 'rgba(253,242,248,0.9)', 1 - k * 0.6);
      }
      // você na frente da explosão, recortado de rosa
      const feet = bot + 60;
      this.fxbSpr(ctx, o.c.you, cx, feet, 400, { rim: '#fbcfe8', rimD: 3, dim: 0.35, dimTint: '40,4,30' });
      ctx.restore();
      if (t >= bang) {
        this.ptdWord(ctx, 'BIG BANG!!', W / 2, top + 100, 120, '#fdf2f8', seg(t, bang, bang + 8), 1 - seg(t, 34, 44), -0.06);
        this.cineFlash(ctx, W, H, 0.85 * (1 - seg(t, bang, bang + 10)), '#fdf2f8');
      }
      this.fxbTitle(ctx, S, t - 40, { cfg: o.c, y: top + 150, color: BB_C });
      this.fxbSfx(S, bang, 'bang', () => window.SFX?.goal?.(true));
    }
  });

  // ==========================================================================
  // 7. VELOCIDADE DIVINA (Loki) — o mundo congela, você é um risco amarelo
  // ==========================================================================
  const GOD_C = '#fde047';

  Object.assign(CE, {
    fxbGodCast() {
      const c = this.fxbCfg('fl_mitico_godspeed');
      return { c, loki: this.cineChar('loki'), r1: this.fxbMate('charles', KIT_RIVAL), r2: this.fxbMate('lavinho', KIT_RIVAL), r3: this.fxbMate('snuffy', KIT_RIVAL) };
    },
    // Chuva que pode parar: tau = tempo da chuva (congelada = tau fixo); frozen 0..1 = gotas viram pérolas
    fxbRain(ctx, W, top, bot, tau, frozen, pan = 0, n = 120, seed = 1) {
      ctx.save();
      const span = bot - top + 80;
      for (let i = 0; i < n; i++) {
        const x = mod(rnd(i, seed) * (W + 300) - pan * (0.6 + rnd(i, seed + 3) * 0.6) + tau * 3, W + 300) - 150;
        const y = top - 40 + mod(rnd(i, seed + 1) * span + tau * (16 + rnd(i, seed + 2) * 8), span);
        const len = lerp(22, 7, frozen);
        ctx.strokeStyle = `rgba(191,219,254,${0.45 + frozen * 0.35})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - len * 0.15, y - len);
        ctx.stroke();
        if (frozen > 0.5) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(x - 1), Math.round(y - 2), 2, 2);
        }
      }
      ctx.restore();
    },
    // Raio amarelo (polilinha quebrada, troca de forma a cada 3 quadros)
    fxbBolt(ctx, x0, y0, x1, y1, t, w = 6, seed = 1, amp = 26) {
      const seg2 = 12;
      const f = Math.floor(t / 3);
      const pts = [];
      for (let i = 0; i <= seg2; i++) {
        const k = i / seg2;
        const j = i === 0 || i === seg2 ? 0 : (rnd(i + f * 13, seed) - 0.5) * 2 * amp;
        pts.push([lerp(x0, x1, k) + j * 0.3, lerp(y0, y1, k) + j]);
      }
      ctx.save();
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(250,204,21,0.45)';
      ctx.lineWidth = w * 3;
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.strokeStyle = GOD_C;
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.5, w * 0.35);
      ctx.stroke();
      ctx.restore();
    },
    // Cronômetro (rosto, marcas, ponteiro); crack 0..1 = vidro rachando a partir do centro
    fxbWatch(ctx, x, y, R, ang, crack = 0, seed = 3) {
      ctx.save();
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(x - R * 0.16, y - R * 1.28, R * 0.32, R * 0.22);
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(x - R * 0.12, y - R * 1.24, R * 0.24, R * 0.14);
      ctx.fillRect(x - R * 0.06, y - R * 1.1, R * 0.12, R * 0.14);
      ctx.beginPath();
      ctx.arc(x, y, R * 1.06, 0, TAU);
      ctx.fillStyle = '#0b1020';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, R, 0, TAU);
      ctx.fillStyle = '#e5e7eb';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, R * 0.9, 0, TAU);
      ctx.fillStyle = '#111827';
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * TAU;
        const L = i % 5 ? 0.06 : 0.13;
        ctx.lineWidth = i % 5 ? 2 : 5;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * R * 0.86, y + Math.sin(a) * R * 0.86);
        ctx.lineTo(x + Math.cos(a) * R * (0.86 - L), y + Math.sin(a) * R * (0.86 - L));
        ctx.stroke();
      }
      ctx.font = `900 ${Math.round(R * 0.16)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = GOD_C;
      ['60', '15', '30', '45'].forEach((s, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 2;
        ctx.fillText(s, x + Math.cos(a) * R * 0.6, y + Math.sin(a) * R * 0.6);
      });
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = Math.max(3, R * 0.03);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(ang) * R * 0.15, y - Math.sin(ang) * R * 0.15);
      ctx.lineTo(x + Math.cos(ang) * R * 0.8, y + Math.sin(ang) * R * 0.8);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, R * 0.05, 0, TAU);
      ctx.fill();
      // reflexo do vidro
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = R * 0.05;
      ctx.beginPath();
      ctx.arc(x, y, R * 0.78, Math.PI * 1.1, Math.PI * 1.45);
      ctx.stroke();
      if (crack > 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'butt';
        for (let i = 0; i < 9; i++) {
          const a0 = (i / 9) * TAU + rnd(i, seed) * 0.4;
          let px = x + Math.cos(a0) * R * 0.04;
          let py = y + Math.sin(a0) * R * 0.04;
          ctx.beginPath();
          ctx.moveTo(px, py);
          const steps = Math.ceil(6 * crack);
          for (let s = 1; s <= steps; s++) {
            const a = a0 + (rnd(i * 7 + s, seed + 1) - 0.5) * 0.5;
            const d = (R * 0.92 * s) / 6;
            px = x + Math.cos(a) * d;
            py = y + Math.sin(a) * d;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        // anéis de rachadura
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        [0.3, 0.55].forEach((rr, i) => {
          if (crack < 0.4 + i * 0.3) return;
          ctx.beginPath();
          for (let k = 0; k <= 18; k++) {
            const a = (k / 18) * TAU;
            const d = R * rr * (0.9 + rnd(k, seed + 5 + i) * 0.2);
            if (k) ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
            else ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
          }
          ctx.stroke();
        });
      }
      ctx.restore();
    },

    // PLANO 1 — chuva no jogo... TIC: tudo para no ar
    fxbGod0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbGodCast();
      const stop = 34;
      const fr = seg(t, stop, stop + 6);
      const tau = Math.min(t, stop);
      const feet = H * 0.86;
      const camK = easeIO(seg(t, stop, 95));
      const cam = { x: lerp(640, 560, camK), y: lerp(360, 380, camK), zoom: lerp(1, 1.16, camK), shake: t < stop ? 1.2 : 0 };
      ctx.save();
      this.cineCamera(ctx, W, H, cam);
      this.fxbArena(ctx, S, tau * 6);
      this.finSplashes(ctx, 0, W, 400, H, tau, 26);
      // dois marcadores correndo (congelam no meio da passada) e a bola no ar
      const rx = (x0, sp) => x0 - tau * sp;
      this.fxbShadow(ctx, rx(980, 2), feet, 70, 0.4);
      this.fxbSpr(ctx, o.r1, rx(980, 2), feet, 300, { animState: 'run', frame: runF(tau, 4), flipX: true });
      this.fxbShadow(ctx, rx(1180, 2.6), feet - 30, 60, 0.4);
      this.fxbSpr(ctx, o.r2, rx(1180, 2.6), feet - 30, 260, { animState: 'run', frame: runF(tau + 2, 4), flipX: true });
      this.fxbShadow(ctx, 420, feet, 70, 0.4);
      if (fr <= 0) this.fxbSpr(ctx, o.c.you, 420, feet, 310, {});
      const bx = 640 + tau * 4;
      const by = feet - 120 - Math.sin(tau * 0.05) * 60;
      this.ptdBall(ctx, bx, by, 18, tau * 0.4);
      this.fxbRain(ctx, W, top, bot, tau, fr, tau * 6, 130, 2);
      ctx.restore();
      // o mundo perde a cor (menos você: desenhado por cima, aceso, com faíscas)
      if (fr > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'saturation';
        ctx.fillStyle = `rgba(128,128,128,${0.75 * fr})`;
        ctx.fillRect(0, top, W, bot - top);
        ctx.restore();
        ctx.fillStyle = `rgba(30,41,59,${0.25 * fr})`;
        ctx.fillRect(0, top, W, bot - top);
        ctx.save();
        this.cineCamera(ctx, W, H, cam);
        this.cineGlow(ctx, 420, feet - 140, 220, 'rgba(253,224,71,0.4)', fr);
        this.fxbSpr(ctx, o.c.you, 420, feet, 310, { rim: GOD_C, rimD: 2 });
        for (let i = 0; i < 4; i++) {
          const a = rnd(i + Math.floor(t / 4) * 4, 9) * TAU;
          const r0 = 70 + rnd(i, 10) * 40;
          const cy0 = feet - 150;
          this.fxbBolt(ctx, 420 + Math.cos(a) * r0 * 0.7, cy0 + Math.sin(a) * r0, 420 + Math.cos(a) * (r0 + 60) * 0.9, cy0 + Math.sin(a) * (r0 + 60), t + i * 5, 2.5, i + 3, 10);
        }
        ctx.restore();
      }
      // o cronômetro (HUD) e o TIC
      const ang = -Math.PI / 2 + tau * 0.18;
      this.fxbWatch(ctx, W - 110, top + 110, 62, ang, 0);
      if (t >= stop) {
        this.rincStamp(ctx, 'TIC.', W - 110, top + 210, 44, GOD_C, t - stop, 0, 3);
        this.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, stop, stop + 8)), '#fef9c3');
      }
      this.finKicker(ctx, 40, top + 34, t < stop ? 'CHUVA, MINUTO 89' : 'O TEMPO PAROU', 1, t < stop ? '#93c5fd' : GOD_C);
      this.fxbSfx(S, stop, 'tic', () => window.SFX?.blip(1568));
    },

    // PLANO 2 — o risco amarelo atravessando o mundo parado
    fxbGod1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbGodCast();
      const feet = H * 0.88;
      const pan = t * 38;
      const yx = W * 0.44;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640 + this.cineNoise(t * 2, 1) * 3, y: 360 + this.cineNoise(t * 2, 2) * 3, zoom: 1.05, rot: -0.02 });
      this.fxbArena(ctx, S, pan);
      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = 'rgba(128,128,128,0.75)';
      ctx.fillRect(-40, -40, W + 80, H + 80);
      ctx.restore();
      ctx.fillStyle = 'rgba(30,41,59,0.3)';
      ctx.fillRect(-40, -40, W + 80, H + 80);
      // estátuas: marcadores congelados que ficam para trás
      [[o.r1, 300, 1], [o.r2, 1500, 0.9], [o.r3, 2700, 1.05], [o.r1, 3900, 0.95], [o.r2, 5100, 1]].forEach(([ch, wx, sc], i) => {
        const sx = wx - pan + W;
        if (sx < -300 || sx > W + 300) return;
        const fy = feet - 70;
        this.fxbShadow(ctx, sx, fy, 60 * sc, 0.4);
        this.fxbSpr(ctx, ch, sx, fy, 250 * sc, { animState: 'run', frame: RUN[i % 4], flipX: true });
      });
      // gotas paradas no ar (as que você atravessa estouram)
      ctx.save();
      for (let i = 0; i < 90; i++) {
        const wx = rnd(i, 61) * 3000;
        const sx = mod(wx - pan * 0.9, 3000) - 200;
        const sy = top + rnd(i, 62) * (bot - top);
        if (sx < -20 || sx > W + 20) continue;
        const hitYou = Math.abs(sy - (feet - 160)) < 160 && sx < yx;
        if (hitYou) {
          const d = (yx - sx) / 400;
          if (d > 1) continue;
          ctx.fillStyle = `rgba(224,242,254,${1 - d})`;
          for (let k = 0; k < 4; k++) ctx.fillRect(sx - d * 60 * (k + 1) * 0.5, sy + (k - 1.5) * d * 30, 3, 3);
          continue;
        }
        ctx.strokeStyle = 'rgba(191,219,254,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 1, sy - 8);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 1, sy - 2, 2, 2);
      }
      ctx.restore();
      // o rastro de raio atrás de você (sem cópias do boneco: só a luz)
      this.ptdSpeed(ctx, S, t, GOD_C, 0.5, 1, 70, 22, feet - 320, feet, 13);
      this.cineGlow(ctx, yx - 200, feet - 150, 260, 'rgba(253,224,71,0.35)');
      this.fxbBolt(ctx, -40, feet - 170, yx - 40, feet - 150, t, 9, 1, 24);
      this.fxbBolt(ctx, -40, feet - 90, yx - 60, feet - 110, t + 1, 5, 2, 18);
      this.fxbBolt(ctx, 60, feet - 250, yx - 80, feet - 190, t + 2, 3, 3, 14);
      this.fxbShadow(ctx, yx, feet, 70, 0.4);
      this.fxbSpr(ctx, o.c.you, yx, feet, 320, { animState: 'run', frame: runF(t, 2), rim: GOD_C, rimD: 2 });
      this.ptdBall(ctx, yx + 60, feet - 18, 18, t * 0.9, GOD_C);
      ctx.restore();
      // painel: o olho dourado do Loki
      const pk = ease(seg(t, 90, 106));
      if (pk > 0) {
        const pts = [[W - 470, top + 14], [W - 16, top + 14], [W - 16, top + 160], [W - 450, top + 176]];
        this.ptdPanel(ctx, pts, () => {
          ctx.fillStyle = '#1a1405';
          ctx.fillRect(W - 480, top, 480, 190);
          this.ptdRays(ctx, W - 240, top + 90, 420, GOD_C, 0.3, t * 0.004, 40);
          const dw = 460;
          this.fxbFaceCrop(ctx, o.loki, W - 245 - dw / 2, top + 6, dw, 4, 6.6, 28, 7, { ring: GOD_C, iris: '#713f12' });
          this.finKicker(ctx, W - 40, top + 150, 'LOKI', seg(t, 104, 120), GOD_C, 'right');
        }, { dx: (1 - pk) * 480 });
      }
      this.ptdWord(ctx, 'ZUUM', W * 0.2, top + 100, 70, GOD_C, seg(t, 6, 14), 1 - seg(t, 50, 64), -0.08);
      this.finKicker(ctx, 40, bot - 34, 'SÓ VOCÊ SE MEXE', seg(t, 20, 50), GOD_C);
      this.fxbSfx(S, 4, 'zum', () => window.SFX?.whoosh());
    },

    // PLANO 3 — você atravessa o cronômetro e o vidro racha
    fxbGod2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbGodCast();
      const hit = 10;
      const isHit = t >= hit;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#0b0a05'], [0.5, '#2a2306'], [1, '#0b0a05']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.02 + easeIO(t / 90) * 0.04, shake: 0.6 + (isHit ? 9 * (1 - seg(t, hit, hit + 26)) : 0) });
      this.ptdRays(ctx, 640, top + 240, W * 1.2, GOD_C, 0.16, -t * 0.003, 44);
      const wx = 640;
      const wy = top + 250;
      const R = 220;
      this.cineGlow(ctx, wx, wy, R * 1.8, 'rgba(253,224,71,0.25)');
      // o ponteiro está parado (tempo parado); quando você passa ele entorta e o vidro racha
      const ang = -Math.PI / 2 + 1.2 + (isHit ? Math.sin(seg(t, hit, hit + 20) * Math.PI) * 0.3 : 0);
      this.fxbWatch(ctx, wx, wy, R, ang, isHit ? ease(seg(t, hit, hit + 18)) : 0, 7);
      // lascas de vidro saindo
      if (isHit) {
        for (let i = 0; i < 22; i++) {
          const a = rnd(i, 91) * TAU;
          const d = (t - hit) * (4 + rnd(i, 92) * 8);
          const al = 1 - seg(t, hit, hit + 50);
          if (al <= 0) break;
          ctx.fillStyle = `rgba(254,249,195,${al})`;
          ctx.fillRect(wx + Math.cos(a) * (R * 0.4 + d), wy + Math.sin(a) * (R * 0.4 + d) + (t - hit) * (t - hit) * 0.05, 5, 5);
        }
      }
      // você: um risco que atravessa a tela da esquerda para a direita
      const run = seg(t, 0, 22);
      const yx = lerp(-200, W + 260, easeIO(run));
      if (run < 1) {
        this.fxbBolt(ctx, yx - 900, wy + 60, yx - 60, wy + 40, t, 10, 5, 30);
        this.fxbSpr(ctx, o.c.you, yx, wy + 200, 300, { animState: 'run', frame: runF(t, 2), rim: GOD_C, rimD: 2 });
      } else {
        // o rastro que sobrou queimando no ar
        const fade = 1 - seg(t, 22, 70);
        ctx.save();
        ctx.globalAlpha = fade;
        this.fxbBolt(ctx, -40, wy + 60, W + 40, wy + 40, t, 6 * fade + 1, 5, 30);
        ctx.restore();
      }
      ctx.restore();
      if (isHit) {
        this.ptdWord(ctx, 'CRACK', W * 0.8, top + 90, 80, '#fef9c3', seg(t, hit, hit + 8), 1 - seg(t, 34, 44), 0.1);
        this.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, hit, hit + 9)), '#fef9c3');
      }
      this.fxbTitle(ctx, S, t - 30, { cfg: o.c, y: bot - 130, color: GOD_C });
      this.fxbSfx(S, hit, 'crack', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 8. METAVISION ABSOLUTO — o olho, a grade 4D, o campo encaixa
  // ==========================================================================
  const MV_C = '#38bdf8';
  const MV_CAM1 = { cx: 640, hy: -60, f: 820, h: 60, d: 84 };

  Object.assign(CE, {
    fxbMvCast() {
      const c = this.fxbCfg('fl_wc_metavision');
      const kit = this.fxbKit(c.you);
      return {
        c,
        mates: ['rin', 'nagi', 'bachira', 'kunigami', 'chigiri'].map((id) => this.fxbMate(id, kit)),
        rivals: ['kaiser', 'ness', 'lorenzo', 'loki', 'sae'].map((id) => this.fxbMate(id, KIT_RIVAL))
      };
    },
    // Fundo de galáxia azul (estrelas + nebulosas), pronto
    // (pronta numa textura só, um pouco maior que a tela; dy = deslocamento para a paralaxe)
    fxbGalaxy(ctx, S, t, cx, cy, dy = 0) {
      const { W, H } = S;
      // metade da resolução (degradê, brilhos e estrelas de 1 px viram 2 px: não se nota)
      const cv = this.fxbBg(`fxbGalaxy|${W}x${H}`, W / 2, (H + 160) / 2, (g, w, h) => {
        this.cineGradient(g, 0, 0, w, h, [[0, '#01030c'], [1, '#0b1740']]);
        for (let i = 0; i < 220; i++) {
          g.fillStyle = `rgba(255,255,255,${0.25 + rnd(i, 3) * 0.6})`;
          g.fillRect(Math.round(rnd(i, 5) * w), Math.round(rnd(i, 6) * h), 1, 1);
        }
        const ox = w / 2;
        const oy = h / 2;
        this.cineGlow(g, ox - 130, oy + 30, 260, 'rgba(56,189,248,0.25)');
        this.cineGlow(g, ox + 150, oy - 20, 230, 'rgba(129,140,248,0.22)');
        this.cineGlow(g, ox, oy, 150, 'rgba(14,165,233,0.25)');
      });
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(cv, Math.round(cx - W / 2), Math.round(cy - (H + 160) / 2 + dy), W, H + 160);
      ctx.restore();
    },
    // Peças de quebra-cabeça orbitando (galáxia em espiral)
    fxbPuzzleSpiral(ctx, cx, cy, t, n, R, alpha = 1, seed = 1) {
      for (let i = 0; i < n; i++) {
        const r = R * (0.25 + (i / n) * 0.9);
        const a = i * 2.4 + t * (0.012 + 0.02 * (1 - i / n));
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.5;
        const s = 14 + rnd(i, seed) * 22;
        this.ptdPuzzle(ctx, x, y, s, i % 3 ? MV_C : i % 2 ? '#818cf8' : '#e0f2fe', a + t * 0.02, alpha * (0.5 + 0.5 * (i / n)));
      }
    },

    // PLANO 1 — o olho se abre no céu, em cima do campo
    fxbMv0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbMvCast();
      const k = easeIO(seg(t, 0, 70));
      const cam = MV_CAM1;
      // céu-galáxia (fundo fixo na tela, com um pouco de paralaxe)
      this.fxbGalaxy(ctx, S, t, 640, 360, (1 - k) * 70);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(640, 225, k), zoom: lerp(1.12, 1, k), shake: 0.6 });
      this.fxbPuzzleSpiral(ctx, 640, 60, t, 26, 900, 0.8, 4);
      // o campo lá embaixo (sem arquibancada: só o gramado flutuando no espaço)
      this.fxbPitch(ctx, 'space', W, H + 320, cam, MV_C);
      const pl = [[o.c.you, -6, -12], [o.mates[0], 12, 4], [o.mates[1], 22, -6], [o.rivals[0], 4, 10], [o.rivals[1], 16, 16]];
      pl.forEach(([ch, X, Y], i) => {
        const r = this.fxbOnPitch(ctx, cam, ch, X, Y, i ? { flipX: i > 2 } : { rim: MV_C, rimD: 1 }, 5);
        ctx.strokeStyle = i ? (i < 3 ? rgba(MV_C, 0.7) : 'rgba(244,63,94,0.7)') : '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.size * 0.4, r.size * 0.12, 0, 0, TAU);
        ctx.stroke();
      });
      // o feixe do olho até o campo
      const open = seg(t, 30, 44);
      const px = 26;
      const ey = 40;
      this.cineShafts(ctx, 640, ey + 60, Math.PI / 2, 760, 0.8, 7, '56,189,248', 0.14 * open, t);
      // o olho (pixel art gigante)
      this.cineGlow(ctx, 640, ey, 300, 'rgba(56,189,248,0.45)', 0.3 + open * 0.7);
      this.drawPixelEye(ctx, 640, ey, px, { line: '#020617', white: '#e0f2fe', iris: '#1e3a8a', ring: MV_C, blink: open < 0.5, look: Math.round(Math.sin(t * 0.05) * open) });
      // pálpebras em pixel (abre)
      if (open < 1 && open >= 0.5) {
        ctx.fillStyle = '#020617';
        ctx.fillRect(640 - 6 * px, ey - 3.5 * px, 12 * px, Math.round((1 - open) * 2 * 3.5 * px));
      }
      ctx.restore();
      this.finKicker(ctx, 40, top + 34, 'UM OLHO ACIMA DO CAMPO', seg(t, 6, 40), MV_C);
      this.fxbSfx(S, 24, 'olho', () => window.SFX?.whoosh());
    },

    // PLANO 2 — o campo visto de cima, a grade 4D girando, as peças encaixando
    fxbMv1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbMvCast();
      const cx = 640;
      const cy = (top + bot) / 2 + 6;
      this.fxbGalaxy(ctx, S, t, cx, cy);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: lerp(0.98, 1.06, easeIO(t / 170)), rot: lerp(-0.04, 0.02, easeIO(t / 170)), shake: 0.5 });
      // o campo de cima (retângulo com as linhas)
      const fw = 900;
      const fh = 440;
      const x0 = cx - fw / 2;
      const y0 = cy - fh / 2;
      ctx.fillStyle = 'rgba(21,128,61,0.55)';
      ctx.fillRect(x0, y0, fw, fh);
      for (let i = 0; i < 10; i++) {
        if (i % 2) continue;
        ctx.fillStyle = 'rgba(22,101,52,0.5)';
        ctx.fillRect(x0 + (i * fw) / 10, y0, fw / 10, fh);
      }
      ctx.strokeStyle = 'rgba(241,245,249,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x0, y0, fw, fh);
      ctx.beginPath();
      ctx.moveTo(cx, y0);
      ctx.lineTo(cx, y0 + fh);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, TAU);
      ctx.stroke();
      [-1, 1].forEach((s) => {
        ctx.strokeRect(s < 0 ? x0 : x0 + fw - 140, cy - 120, 140, 240);
        ctx.strokeRect(s < 0 ? x0 : x0 + fw - 50, cy - 55, 50, 110);
      });
      // a grade 4D: três camadas girando e respirando em profundidades diferentes
      [[1.0, 0.004, 0.5], [1.35, -0.003, 0.3], [0.7, 0.006, 0.35]].forEach(([sc, rs, al], li) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * rs);
        const s = sc * (1 + Math.sin(t * 0.03 + li) * 0.05);
        ctx.scale(s, s * 0.82);
        ctx.strokeStyle = rgba(li === 1 ? '#818cf8' : MV_C, al);
        ctx.lineWidth = 1.5 / s;
        ctx.beginPath();
        for (let g = -6; g <= 6; g++) {
          ctx.moveTo(g * 80, -480);
          ctx.lineTo(g * 80, 480);
          ctx.moveTo(-480, g * 80);
          ctx.lineTo(480, g * 80);
        }
        ctx.stroke();
        ctx.restore();
      });
      // jogadores de cima (pequenos), cada um com o seu anel
      const pl = [];
      o.mates.forEach((ch, i) => pl.push({ ch, x: x0 + fw * (0.3 + rnd(i, 3) * 0.5), y: y0 + fh * (0.15 + (i / 5) * 0.75), mate: true }));
      o.rivals.forEach((ch, i) => pl.push({ ch, x: x0 + fw * (0.45 + rnd(i, 4) * 0.45), y: y0 + fh * (0.1 + (i / 5) * 0.8) }));
      pl.push({ ch: o.c.you, x: x0 + fw * 0.28, y: cy + 30, you: true });
      pl.sort((a, b) => a.y - b.y);
      pl.forEach((p, i) => {
        ctx.strokeStyle = p.you ? '#ffffff' : p.mate ? MV_C : 'rgba(244,63,94,0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 22, 8, 0, 0, TAU);
        ctx.stroke();
        this.fxbSpr(ctx, p.ch, p.x, p.y, p.you ? 96 : 78, { flipX: !p.mate && !p.you, rim: p.you ? MV_C : null, rimD: 1 });
      });
      // as peças: voam da galáxia e travam numa grade sobre o campo (8 x 4)
      const cols = 8;
      const rows = 4;
      const cw = fw / cols;
      const ch = fh / rows;
      let locked = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const at = 14 + (rnd(i, 7) * 0.6 + (c / cols) * 0.4) * 110;
          const kk = seg(t, at, at + 16);
          if (kk <= 0) continue;
          const tx = x0 + (c + 0.5) * cw;
          const ty = y0 + (r + 0.5) * ch;
          const a = rnd(i, 8) * TAU;
          const fx = tx + Math.cos(a) * 900 * (1 - ease(kk));
          const fy = ty + Math.sin(a) * 600 * (1 - ease(kk));
          if (kk >= 1) {
            locked++;
            ctx.fillStyle = 'rgba(56,189,248,0.10)';
            ctx.fillRect(tx - cw / 2 + 2, ty - ch / 2 + 2, cw - 4, ch - 4);
            ctx.strokeStyle = rgba(MV_C, 0.6);
            ctx.lineWidth = 2;
            ctx.strokeRect(tx - cw / 2 + 2, ty - ch / 2 + 2, cw - 4, ch - 4);
            const fl = 1 - seg(t, at + 16, at + 30);
            if (fl > 0) this.cineGlow(ctx, tx, ty, 70, 'rgba(56,189,248,0.8)', fl);
            this.ptdPuzzle(ctx, tx + cw * 0.36, ty - ch * 0.34, 22, MV_C, 0, 0.9);
          } else {
            this.ptdPuzzle(ctx, fx, fy, 50 - 20 * kk, i % 3 ? MV_C : '#e0f2fe', (1 - kk) * 6, 1);
          }
        }
      }
      // quando a última trava: o campo inteiro acende
      const done = seg(t, 140, 150);
      if (done > 0) {
        ctx.strokeStyle = `rgba(224,242,254,${done})`;
        ctx.lineWidth = 6;
        ctx.strokeRect(x0 - 4, y0 - 4, fw + 8, fh + 8);
        this.cineGlow(ctx, cx, cy, 600, 'rgba(56,189,248,0.3)', done * (1 - seg(t, 150, 170) * 0.5));
        // linhas de passe de você para cada companheiro
        const you = pl.find((p) => p.you);
        pl.filter((p) => p.mate).forEach((p, i) => {
          const lk = ease(seg(t, 142 + i * 3, 156 + i * 3));
          ctx.strokeStyle = `rgba(224,242,254,${0.85 * lk})`;
          ctx.lineWidth = 3;
          ctx.setLineDash([10, 8]);
          ctx.lineDashOffset = -t * 2;
          ctx.beginPath();
          ctx.moveTo(you.x, you.y - 40);
          ctx.lineTo(lerp(you.x, p.x, lk), lerp(you.y - 40, p.y - 40, lk));
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }
      ctx.restore();
      ctx.save();
      ctx.font = '900 16px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = MV_C;
      ctx.fillText(`ESPAÇOS LIDOS ${String(locked).padStart(2, '0')}/32`, W - 40, top + 34);
      ctx.restore();
      this.finKicker(ctx, 40, top + 34, 'A GRADE 4D', seg(t, 4, 30), MV_C);
      if (done > 0) this.ptdChip(ctx, 'QUEBRA-CABEÇA RESOLVIDO', W / 2, bot - 40, MV_C, done, { size: 16 });
      this.fxbSfx(S, 30, 'p1', () => window.SFX?.blip(660));
      this.fxbSfx(S, 80, 'p2', () => window.SFX?.blip(880));
      this.fxbSfx(S, 140, 'done', () => window.SFX?.jingle([659, 880, 1175], 0, 'triangle'));
    },

    // PLANO 3 — METAVISION: o rosto na galáxia, as peças orbitando, o nome
    fxbMv2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxbMvCast();
      const hit = 6;
      const cx = 640;
      const eyeY = top + 230;
      this.fxbGalaxy(ctx, S, t, cx, eyeY);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.02 + easeIO(t / 100) * 0.06, shake: 0.6 + (t >= hit ? 6 * (1 - seg(t, hit, hit + 24)) : 0) });
      this.fxbPuzzleSpiral(ctx, cx, eyeY + 40, t + 200, 34, 760, 0.9, 9);
      const size = 780;
      const { u } = this.fxbHead(ctx, o.c.you, cx, eyeY, size, { rim: MV_C, rimD: 3 });
      [-1, 1].forEach((s) => this.cineGlow(ctx, cx + s * 3.5 * u, eyeY, u * 3.4, 'rgba(56,189,248,0.6)'));
      this.ptdEyes(ctx, o.c.you, cx, eyeY, u, { ring: MV_C, iris: '#1e3a8a' });
      // anéis da visão saindo dos dois olhos
      [-1, 1].forEach((s) => {
        for (let i = 0; i < 2; i++) {
          const ph = mod(t - i * 18, 36) / 36;
          ctx.strokeStyle = rgba(MV_C, 0.7 * (1 - ph));
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(cx + s * 3.5 * u, eyeY, 30 + ph * 180, (30 + ph * 180) * 0.6, 0, 0, TAU);
          ctx.stroke();
        }
      });
      ctx.restore();
      // METAVISION em letras que batem uma a uma, depois sobe e dá lugar ao nome
      const up = ease(seg(t, 40, 56));
      if (up < 1) this.rincStamp(ctx, 'METAVISION', W / 2, lerp(top + 300, top + 160, up), 128, '#e0f2fe', t, hit, 2, W * 0.92, 'center', 1 - up);
      this.fxbTitle(ctx, S, t - 50, { cfg: o.c, y: bot - 130, color: MV_C });
      if (t >= hit) this.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, hit, hit + 10)), '#e0f2fe');
      this.fxbSfx(S, hit, 'mv', () => window.SFX?.jingle([523, 784, 1047, 1568], 0, 'triangle'));
    }
  });

  // ==========================================================================
  // REGISTRO
  // ==========================================================================
  // Coisas compartilhadas com a cine_partida que custam caro para montar: uma por quadro, antes
  const SHARED = [
    function (g, S) {
      this.fxbGrain(g, S.W, S.H, 0.05);
    },
    function () {
      for (let i = 0; i < 4; i++) this.ptdBallCv(i);
    }
  ];
  const raysWarm = (list) =>
    list.map(
      ([c, n]) =>
        function (g) {
          this.ptdRays(g, 0, 0, 1, c, 0.01, 0, n);
        }
    );
  const plan = (fns, rays = [], more = []) => {
    const extra = SHARED.concat(more, raysWarm(rays));
    return function (ctx, S) {
      this.sakugaW = S.W;
      // a cena entra saindo do preto (o 1º quadro é todo preto: só adianta o que vai ser montado)
      if (S.phase === 0 && S.t < 1) {
        this.fxbWarm(fns, S, extra);
        return;
      }
      fns[S.phase].call(this, ctx, S);
      this.fxbGrain(ctx, S.W, S.H, 0.05);
      if (S.phase === 0 && S.t < 10) this.cineFlash(ctx, S.W, S.H, 1 - (S.t - 1) / 9, '#000000');
      this.fxbWarm(fns, S, extra);
    };
  };
  const reg = (id, def) => {
    const d = Object.assign({ letterbox: 0.1, grain: 0, music: 'epic' }, def);
    Object.defineProperty(d, 'title', {
      enumerable: true,
      get() {
        return `${def.icon} ${def.label} • ${CE.fxbCfg(id).youName}`;
      }
    });
    CE.registerCine(`flow_${id}`, d);
  };

  reg('fl_incomum_maestro', {
    icon: '🎼',
    label: 'OLHAR DO MAESTRO',
    phases: [80, 190, 90],
    tags: ['PLANO 1 • A PLANTA DO CAMPO', 'PLANO 2 • A REGÊNCIA', 'PLANO 3 • MAESTRO'],
    subs: [[], [{ from: 0, who: 'HIORI', text: '"Veja o campo."', color: MAE_C }], []],
    draw: plan([CE.fxbMae0, CE.fxbMae1, CE.fxbMae2], [[MAE_C, 40]])
  });

  reg('fl_raro_muralha', {
    icon: '🛡️',
    label: 'MURALHA DO CORINGA',
    phases: [180, 95, 85],
    tags: ['PLANO 1 • CORPO DE FERRO', 'PLANO 2 • O TRANCO', 'PLANO 3 • A MURALHA'],
    subs: [[{ from: 0, who: 'KUNIGAMI', text: '"Não caio."', color: MUR_C }], [], []],
    draw: plan([CE.fxbMur0, CE.fxbMur1, CE.fxbMur2])
  });

  reg('fl_raro_ginga', {
    icon: '🐾',
    label: 'GINGA DO MONSTRO',
    phases: [85, 185, 90],
    tags: ['PLANO 1 • O MONSTRO ACORDA', 'PLANO 2 • A GINGA', 'PLANO 3 • O MONSTRO'],
    subs: [[], [{ from: 0, who: 'BACHIRA', text: '"Hehe, bora!"', color: GIN_C }], []],
    draw: plan([CE.fxbGin0, CE.fxbGin1, CE.fxbGin2], [[GIN_C, 40], [GIN_C, 48]])
  });

  reg('fl_epico_preguica', {
    icon: '☁️',
    label: 'DOMÍNIO PREGUIÇOSO',
    phases: [90, 180, 90],
    music: 'travel',
    tags: ['PLANO 1 • O BOCEJO', 'PLANO 2 • A BOLA DO CÉU', 'PLANO 3 • CLEAR'],
    subs: [[], [{ from: 0, who: 'NAGI', text: '"Que preguiça."', color: NAG_C }], []],
    draw: plan([CE.fxbNag0, CE.fxbNag1, CE.fxbNag2])
  });

  reg('fl_epico_xadrez', {
    icon: '♞',
    label: 'LEITURA DO XADREZ',
    phases: [85, 190, 85],
    music: 'mystery',
    tags: ['PLANO 1 • O TABULEIRO', 'PLANO 2 • TRÊS LANCES', 'PLANO 3 • XEQUE'],
    subs: [[], [{ from: 0, who: 'NIKO', text: '"Já li o lance."', color: XAD_C }], []],
    draw: plan([CE.fxbXad0, CE.fxbXad1, CE.fxbXad2], [[XAD_C, 40], [XAD_C, 44]])
  });

  reg('fl_lendario_bigbang', {
    icon: '💥',
    label: 'QUÍMICA EXPLOSIVA',
    phases: [75, 190, 95],
    tags: ['PLANO 1 • CÉLULAS', 'PLANO 2 • REAÇÃO EM CADEIA', 'PLANO 3 • BIG BANG'],
    subs: [[], [{ from: 0, who: 'SHIDOU', text: '"Explode, vai!"', color: BB_C }], []],
    draw: plan([CE.fxbBB0, CE.fxbBB1, CE.fxbBB2], [[BB_C, 40]])
  });

  reg('fl_mitico_godspeed', {
    icon: '⚡',
    label: 'VELOCIDADE DIVINA',
    phases: [90, 185, 85],
    music: 'tension',
    tags: ['PLANO 1 • O TEMPO PARA', 'PLANO 2 • O RISCO AMARELO', 'PLANO 3 • O CRONÔMETRO RACHA'],
    subs: [[], [{ from: 0, who: 'LOKI', text: '"Rápido demais."', color: GOD_C }], []],
    draw: plan([CE.fxbGod0, CE.fxbGod1, CE.fxbGod2], [[GOD_C, 40], [GOD_C, 44]])
  });

  reg('fl_wc_metavision', {
    icon: '🧩',
    label: 'METAVISION ABSOLUTO',
    phases: [85, 180, 95],
    tags: ['PLANO 1 • O OLHO', 'PLANO 2 • A GRADE 4D', 'PLANO 3 • METAVISION'],
    subs: [[], [{ from: 0, who: 'VOCÊ', text: '"Eu vejo tudo."', color: MV_C }], []],
    draw: plan([CE.fxbMv0, CE.fxbMv1, CE.fxbMv2], [], [
      function (g, S) {
        this.fxbGalaxy(g, S, 0, 0, 0);
      },
      function () {
        [MV_C, '#818cf8', '#e0f2fe'].forEach((c) => this.ptdPuzzleCv(c));
      }
    ])
  });
})();
