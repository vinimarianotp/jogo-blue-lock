// ============================================================================
// O GOL DOS QUATRO EGOS (cine_final_franca) — ver js/cine_kit.js
//   wc_final_goal • o gol do título na final da Copa do Mundo Sub-20, Japão x França
// Nada de choque e rebote (esse é o "Gol da Sorte" do Blue Lock x Sub-20, cine_luck):
// aqui o gol nasce de QUATRO EGOS. O Sae vê um passe que ninguém vê e entrega a bola;
// o Rin, por puro ego, arrasta o Hugo como isca; o Loki dispara com a Velocidade Divina
// para te alcançar... e chega um instante tarde. Você finaliza de primeira, no ângulo.
// Helpers no CutsceneEngine com o prefixo "wcfg". Bonecos e cenários ficam guardados
// prontos (colar um canvas é bem mais barato que redesenhar a pixel art) e são montados
// aos poucos num "ensaio" escondido durante os primeiros planos (sem travada no corte).
// Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas, um flash por impacto,
// olhos em close em pixel art, frame 0 = piscada (não usar).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine) return;
  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIn = (x) => clamp(x) * clamp(x);
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
  // Ponto numa curva de Bézier quadrática
  const qb = (p0, p1, p2, k) => [
    (1 - k) * (1 - k) * p0[0] + 2 * (1 - k) * k * p1[0] + k * k * p2[0],
    (1 - k) * (1 - k) * p0[1] + 2 * (1 - k) * k * p1[1] + k * k * p2[1]
  ];
  // Quadros de corrida guardados (4 por ciclo; o 0 é o do piscar)
  const RUNS = [3, 7, 11, 15];
  const runF = (f, sp = 3) => RUNS[Math.floor(f / sp) % 4];

  const YOU_C = '#00f5d4';
  const SAE_C = '#f9a8d4';
  const RIN_C = '#22d3ee';
  const LOKI_C = '#facc15';
  const HUGO_C = '#fb7185';
  const NARR_C = '#94a3b8';
  const KIT_GK_JP = { jerseyPrimary: '#facc15', jerseySecondary: '#111827' };
  const KIT_GK_FR = { jerseyPrimary: '#22c55e', jerseySecondary: '#052e16' };

  // ==========================================================================
  // HELPERS (prefixo wcfg)
  // ==========================================================================
  Object.assign(CE, {
    // Elenco da final (refeito só quando muda a cena ou o nome do perfil)
    wcfgCast() {
      const key = `${this._cineRun || 0}|${window.App?.state?.profile?.name || ''}`;
      if (this._wcfgCastC?.key === key) return this._wcfgCastC.c;
      const J = this.KITS.japan;
      const F = this.KITS.france;
      const ch = (id, kit, extra) => this.cineChar(id, Object.assign({}, kit, extra || {}));
      const c = {
        you: this.cineYou(Object.assign({}, J)),
        sae: ch('sae', J),
        rin: ch('rin', J, { angry: true }),
        shidou: ch('shidou', J),
        gaga: ch('gagamaru', KIT_GK_JP),
        loki: ch('loki', F),
        hugo: ch('hugo', F),
        charles: ch('charles', F),
        kaiser: ch('gen_france_mf', F),
        lorenzo: ch('gen_france_df', F),
        gk: ch('gk_france', KIT_GK_FR),
        tada: ch('tada', { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' })
      };
      this._wcfgCastC = { key, c };
      return c;
    },

    // Boneco pronto num canvas guardado (com margem). o = { facing, animState, frame, flipX,
    // tint, dim, dimTint, rim, rimSides, rimD }. Luz de recorte assada no próprio canvas
    wcfgEntry(char, base, o) {
      const cache = this._wcfgSpr || (this._wcfgSpr = new Map());
      if (o.rim) {
        const plain = Object.assign({}, o, { rim: null });
        const body = this.wcfgEntry(char, base, plain);
        const ck = `rim|${o.rim}|${(o.rimSides || [-1, 1]).join(',')}|${o.rimD || 0}|${body.key}`;
        let e = cache.get(ck);
        if (e) return e;
        const sil = this.wcfgEntry(char, base, Object.assign({}, plain, { tint: o.rim, dim: 0 }));
        const cv = document.createElement('canvas');
        cv.width = body.cv.width;
        cv.height = body.cv.height;
        const g = cv.getContext('2d');
        const d = o.rimD || Math.max(1, Math.round(base / 75));
        (o.rimSides || [-1, 1]).forEach((s) => g.drawImage(sil.cv, s * d, -Math.round(d * 0.35)));
        g.drawImage(body.cv, 0, 0);
        e = { cv, pad: body.pad, base, key: ck };
        if (cache.size > 230) cache.delete(cache.keys().next().value);
        cache.set(ck, e);
        return e;
      }
      const key = [
        base, char.id || '', char.name || '', char.jerseyPrimary, char.jerseySecondary, char.angry ? 1 : 0, char.outfit || '',
        char.hairColor, char.hairSecondary, char.skinColor, char.eyeColor, char.hairStyle, char.eyeStyle || '',
        o.facing || 'front', o.animState || 'idle', o.frame || 45, o.flipX ? 1 : 0, o.tint || '', o.dim || 0, o.dimTint || '',
        o.view || '', o.mirror === undefined ? '' : o.mirror ? 1 : 0, o.expr || ''
      ].join('|');
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
        // bonecos novos: 'front' = correndo de frente pra câmera; mirror/expr
        view: o.view,
        mirror: o.mirror,
        expr: o.expr
      });
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (o.dim) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = `rgba(${o.dimTint || '0,0,0'},${o.dim})`;
        g.fillRect(0, 0, cv.width, cv.height);
        g.globalCompositeOperation = 'source-over';
      }
      e = { cv, pad, base, key };
      if (cache.size > 230) cache.delete(cache.keys().next().value);
      cache.set(key, e);
      return e;
    },

    // Boneco com os pés em (x, feet). >= 180 amplia a base de 180 sem suavizar
    wcfgSpr(ctx, char, x, feet, size, o = {}) {
      const base = size >= 180 ? 180 : Math.max(36, 36 * Math.ceil(size / 36));
      const e = this.wcfgEntry(char, base, o);
      const k = size / base;
      ctx.save();
      ctx.imageSmoothingEnabled = size < base;
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.drawImage(e.cv, x - size / 2 - e.pad * k, feet - size * 0.87 - e.pad * k, e.cv.width * k, e.cv.height * k);
      ctx.restore();
    },

    // Close: o olho do boneco fica em eyeY. Devolve { u, top, feet }
    wcfgHead(ctx, char, cx, eyeY, size, o = {}) {
      const u = size / 36;
      const top = eyeY - 10.1 * u;
      const feet = top + size * 0.87;
      this.wcfgSpr(ctx, char, cx, feet, size, o);
      return { u, top, feet };
    },

    // Olhos em pixel por cima de um close (wcfgHead). o = { ring, iris, look, tiny, angry, half, lid }
    wcfgEyes(ctx, char, cx, eyeY, u, o = {}) {
      const px = u * 0.27;
      [-1, 1].forEach((s) => {
        const ex = cx + s * 3.5 * u;
        this.drawPixelEye(ctx, ex, eyeY, px, { line: '#020617', iris: o.iris || '#020617', ring: o.ring || char.eyeColor || '#ef4444', look: o.look || 0, tiny: o.tiny });
        if (o.angry) this.finLid(ctx, ex, eyeY, px, s < 0 ? 1 : -1, 'angry', '#020617');
        if (o.half) this.finLid(ctx, ex, eyeY, px, s < 0 ? 1 : -1, 'half', o.lid || this.finShade(char.skinColor || '#f3d1b8', -0.18));
      });
    },

    // Faixa dos olhos em close extremo: o rosto recortado e ampliado + olhos em pixel.
    // dw = largura (14 unidades da pixel art). Devolve { U, ly, lx, rx }
    wcfgBand(ctx, char, dx, dy, dw, o = {}) {
      const U = dw / 14;
      const e = this.wcfgEntry(char, 180, o.spr || {});
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(e.cv, e.pad + 11 * 5, e.pad + 7 * 5, 14 * 5, 6 * 5, dx, dy, dw, U * 6);
      ctx.restore();
      const px = U * 0.3;
      const ly = dy + 3.1 * U;
      const xs = [dx + 3.5 * U, dx + 10.5 * U];
      xs.forEach((ex, i) => {
        this.drawPixelEye(ctx, ex, ly, px, { line: '#020617', iris: o.iris || '#020617', ring: o.ring || char.eyeColor || '#ef4444', look: o.look || 0, tiny: o.tiny });
        if (o.angry) this.finLid(ctx, ex, ly, px, i === 0 ? 1 : -1, 'angry', '#020617');
        if (o.half) this.finLid(ctx, ex, ly, px, i === 0 ? 1 : -1, 'half', o.lid || this.finShade(char.skinColor || '#f3d1b8', -0.18));
      });
      return { U, ly, lx: xs[0], rx: xs[1] };
    },

    wcfgBg(key, w, h, fn) {
      const c = this._wcfgBgC || (this._wcfgBgC = {});
      if (!c[key]) {
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        fn.call(this, cv.getContext('2d'), w, h);
        c[key] = cv;
      }
      return c[key];
    },
    // A Catedral Mundial (o mesmo estádio do mapa da final), pronta em 1920 x 1080
    wcfgCath() {
      return this.wcfgBg('cath', 1920, 1080, (g, w, h) => this.drawVnBackground(g, w, h, 'worldcup_final'));
    },
    // O campo do Colégio Ichinan ao pôr do sol (o flashback)
    wcfgSchool() {
      return this.wcfgBg('school', 1920, 1080, (g, w, h) => this.drawVnBackground(g, w, h, 'school_sunset'));
    },
    // Versão fora de foco (reduz e amplia suavizando): profundidade de campo barata
    wcfgBlur(src, key, f = 5) {
      return this.wcfgBg(`blur|${key}|${f}`, src.width, src.height, (g, w, h) => {
        const sm = document.createElement('canvas');
        sm.width = Math.ceil(w / f);
        sm.height = Math.ceil(h / f);
        const s = sm.getContext('2d');
        s.imageSmoothingEnabled = true;
        s.drawImage(src, 0, 0, sm.width, sm.height);
        g.imageSmoothingEnabled = true;
        g.drawImage(sm, 0, 0, w, h);
      });
    },

    // Câmera no nível do gramado: a arquibancada da Catedral (fora de foco) com as placas
    // de LED no horizonte hz e o gramado na frente. o = { sx, hz, zoom, blur, camX, dark }
    wcfgField(ctx, S, o = {}) {
      const { W } = S;
      const k = o.zoom || 1.6;
      const src = this.wcfgCath();
      const cv = o.blur === 0 ? src : this.wcfgBlur(src, 'cath', o.blur || 5);
      const sx = o.sx ?? 960;
      const y0 = o.hz - 690 * k;
      ctx.fillStyle = '#01030b';
      ctx.fillRect(-400, y0 - 600, W + 800, 604);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(cv, W / 2 - sx * k, y0, 1920 * k, 1080 * k);
      ctx.restore();
      if (o.dark) {
        ctx.fillStyle = `rgba(1,4,14,${o.dark})`;
        ctx.fillRect(-400, y0 - 600, W + 800, o.hz - y0 + 600);
      }
      this.wcfgPitch(ctx, S, o.hz, o.camX || 0);
    },

    // Gramado da Catedral: faixas de corte em perspectiva e o reflexo das placas de LED
    wcfgPitch(ctx, S, hz, camX = 0) {
      const { W, H } = S;
      const b = H + 200;
      this.cineGradient(ctx, -400, hz, W + 800, b - hz, [[0, '#226e43'], [0.18, '#145a33'], [0.6, '#0b3b21'], [1, '#05200f']]);
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      const vx = W / 2;
      const span = b - hz;
      const i0 = Math.floor((camX - W * 3) / 300) * 2;
      for (let i = i0; i < (camX + W * 3) / 150; i += 2) {
        const b0 = i * 150 - camX;
        const b1 = b0 + 150;
        ctx.beginPath();
        ctx.moveTo(vx + (b0 - vx) * 0.25, hz);
        ctx.lineTo(vx + (b1 - vx) * 0.25, hz);
        ctx.lineTo(vx + (b1 - vx) * 2.4, hz + span);
        ctx.lineTo(vx + (b0 - vx) * 2.4, hz + span);
        ctx.closePath();
        ctx.fill();
      }
      // reflexo ciano/dourado das placas de LED no gramado molhado de orvalho
      const rf = ctx.createLinearGradient(0, hz, 0, hz + 70);
      rf.addColorStop(0, 'rgba(0,245,212,0.22)');
      rf.addColorStop(0.35, 'rgba(250,204,21,0.08)');
      rf.addColorStop(1, 'rgba(0,245,212,0)');
      ctx.fillStyle = rf;
      ctx.fillRect(-400, hz, W + 800, 70);
      ctx.fillStyle = 'rgba(236,253,245,0.5)';
      ctx.fillRect(-400, hz + 12, W + 800, 3);
    },

    wcfgShadow(ctx, x, y, rx, a = 0.4) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#01040a';
      ctx.beginPath();
      ctx.ellipse(x, y, rx, rx * 0.2, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    },

    // Placar da transmissão da final
    wcfgScore(ctx, x, y, hs, minute, k = 1, pop = 0) {
      this.ptdScore(ctx, x, y, { hl: 'JAPÃO', al: 'FRANÇA', hs, as: 2, minute, hc: '#1d4ed8', ac: '#ef4444', pop: pop > 0 ? 'home' : null, popK: pop, k });
    },

    // Etiqueta de telestrator (TV) presa num jogador: anel no pé da linha + caixinha com o nome
    wcfgTag(ctx, x, y, label, color, k) {
      if (k <= 0) return;
      const e = ease(k);
      ctx.save();
      ctx.globalAlpha *= clamp(k * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(x, y, 9 * e, 3.5 * e, 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x + 18 * e, y - 40 * e);
      ctx.stroke();
      ctx.font = '900 14px "Segoe UI", sans-serif';
      const w = (ctx.measureText(label).width + 24) * e;
      const bx = x + 18 * e;
      const by = y - 40 * e - 26;
      ctx.fillStyle = 'rgba(2,6,23,0.9)';
      ctx.fillRect(bx, by, w, 26);
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, 4, 26);
      ctx.fillRect(bx, by + 24, w, 2);
      if (e > 0.8) {
        ctx.fillStyle = '#f8fafc';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(label, bx + 12, by + 13.5);
      }
      ctx.restore();
    },

    // Raio da Velocidade Divina: zigue-zague dourado (a forma troca a cada 3 quadros)
    wcfgBolt(ctx, x0, y0, x1, y1, seed, amp = 22, color = '#facc15', w = 5) {
      const n = 8;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d;
      const ny = dx / d;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const o = i && i < n ? (rnd(i, seed) - 0.5) * 2 * amp : 0;
        pts.push([x0 + dx * k + nx * o, y0 + dy * k + ny * o]);
      }
      ctx.save();
      ctx.lineJoin = 'miter';
      [[color, w], ['#fffbeb', Math.max(1.5, w * 0.35)]].forEach(([col, lw]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      });
      ctx.restore();
    },

    // Trecho de uma curva quadrática desenhado até k (linha de passe), com brilho
    wcfgCurve(ctx, p0, p1, p2, k0, k1, layers) {
      if (k1 <= k0) return;
      const n = 48;
      layers.forEach(([col, lw, dash]) => {
        ctx.save();
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        if (dash) {
          ctx.setLineDash(dash[0]);
          ctx.lineDashOffset = dash[1];
        }
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const [x, y] = qb(p0, p1, p2, lerp(k0, k1, i / n));
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      });
    },

    // Fundo de painel de close (degradê na cor + linhas radiais bem fracas)
    wcfgPanelBg(ctx, x, y, w, h, c0, c1, ray, cx, cy, rot = 0) {
      this.cineGradient(ctx, x, y, w, h, [[0, c0], [1, c1]]);
      if (ray) this.ptdRays(ctx, cx, cy, Math.max(w, h) * 1.2, ray, 0.16, rot, 44, 0.03);
    },

    // Gota de suor em pixel na têmpora
    wcfgSweat(ctx, x, y, u, k) {
      if (k <= 0) return;
      const dy = ease(k) * 2.4 * u;
      ctx.fillStyle = 'rgba(186,230,253,0.9)';
      ctx.fillRect(Math.round(x), Math.round(y + dy), Math.ceil(u * 0.55), Math.ceil(u * 0.85));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(x), Math.round(y + dy), Math.ceil(u * 0.2), Math.ceil(u * 0.2));
    },

    // ---------------------------------------------------------------- ensaio (aquecimento)
    // Desenha um plano num canvas minúsculo escondido (sem sons): monta antes os bonecos e
    // cenários guardados que ele usa, um item por quadro
    wcfgDry(phase, t, f) {
      const def = this.CINE.wc_final_goal;
      if (!this._wcfgDryCv) {
        this._wcfgDryCv = document.createElement('canvas');
        this._wcfgDryCv.width = 64;
        this._wcfgDryCv.height = 36;
      }
      const g = this._wcfgDryCv.getContext('2d');
      const top = Math.round(720 * (def.letterbox ?? 0.12));
      const dur = def.phases[phase];
      const S = { W: 1280, H: 720, t, phase, dur, p: t / dur, f: f ?? t + phase * 100, top, bot: 720 - top, stageH: 720 - top * 2 };
      const sfx = this.cineSfx;
      this.cineSfx = () => {};
      try {
        g.save();
        g.scale(0.05, 0.05);
        this.WCFG_PLANS[phase].call(this, g, S);
      } finally {
        g.restore();
        this.cineSfx = sfx;
      }
    },
    wcfgWarmList() {
      if (this._wcfgWarmL) return this._wcfgWarmL;
      const L = [() => this.wcfgCath(), () => this.wcfgBlur(this.wcfgCath(), 'cath', 5), () => this.wcfgSchool(), () => this.wcfgBlur(this.wcfgCath(), 'cath', 6)];
      // [plano, t, quadros extras para os ciclos de corrida]
      const plan = [
        [0, 60, 4], [0, 120, 4], [1, 20, 0], [1, 100, 0], [1, 170, 0],
        [2, 20, 4], [2, 90, 4], [2, 150, 4], [2, 200, 0],
        [3, 20, 0], [3, 50, 0], [3, 100, 0], [3, 190, 4], [3, 240, 4],
        [4, 20, 4], [4, 90, 4], [4, 160, 4],
        [5, 30, 0], [5, 130, 0],
        [6, 30, 0], [6, 66, 0], [6, 120, 0],
        [7, 10, 0], [7, 60, 0], [7, 140, 0],
        [8, 20, 4], [8, 120, 4],
        [9, 40, 0], [9, 150, 0], [9, 230, 0], [9, 300, 0]
      ];
      plan.forEach(([p, t, extra]) => {
        const fs = extra ? [0, 3, 6, 9] : [0];
        fs.forEach((df) => L.push(() => this.wcfgDry(p, t, t + p * 100 + df)));
      });
      this._wcfgWarmL = L;
      return L;
    },
    wcfgWarm(S) {
      const run = `${this._cineRun}`;
      if (this._wcfgWarmRun !== run) {
        this._wcfgWarmRun = run;
        this._wcfgWarmIdx = 0;
      }
      const L = this.wcfgWarmList();
      if (this._wcfgWarmIdx >= L.length) return;
      // Nos primeiros quadros a tela ainda está preta: dá para montar bastante coisa de uma
      // vez (a travada não aparece). Depois, um item por quadro
      if (S.phase === 0 && S.t < 14) {
        const t0 = performance.now();
        do L[this._wcfgWarmIdx++].call(this);
        while (this._wcfgWarmIdx < L.length && performance.now() - t0 < 50);
        return;
      }
      L[this._wcfgWarmIdx++].call(this);
    }
  });

  // ==========================================================================
  // OS PLANOS
  // ==========================================================================
  Object.assign(CE, {
    // PLANO 1 — a Catedral inteira; a grua desce até o lance e a TV marca os quatro egos
    wcfgP1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcfgCast();
      const k = easeIO(seg(t, 0, 196));
      const sc = lerp(0.74, 1.04, k);
      const cx = lerp(960, 990, k);
      const cy = lerp(520, 700, k);
      const nx = this.cineNoise(t * 0.4, 2) * 2.5;
      const ny = this.cineNoise(t * 0.4, 5) * 1.5;
      const X = (x) => W / 2 + (x - cx) * sc + nx;
      const Y = (y) => H / 2 + (y - cy) * sc + ny;
      ctx.save();
      ctx.translate(W / 2 + nx, H / 2 + ny);
      ctx.scale(sc, sc);
      ctx.translate(-cx, -cy);
      ctx.drawImage(this.wcfgCath(), 0, 0);
      // flashes de câmera na arquibancada (cada um acende e apaga)
      for (let i = 0; i < 26; i++) {
        const per = 60 + rnd(i, 3) * 70;
        const ph = (t + rnd(i, 4) * per) % per;
        if (ph >= 7) continue;
        this.finSparkle(ctx, rnd(i, 5) * 1920, 360 + rnd(i, 6) * 240, 7 + rnd(i, 7) * 6, 1 - ph / 7);
      }
      // os feixes dos refletores descendo no gramado
      [300, 760, 1160, 1620].forEach((x, i) => this.cineShafts(ctx, x, 300, Math.atan2(860 - 300, 960 - x), 700, 0.2, 2, '191,219,254', 0.05, t + i * 40));
      // o lance: o Sae com a bola no meio, três franceses fechando; o Rin puxando o Hugo;
      // o Loki lá atrás; você entrando pela esquerda (o Japão ataca para a direita)
      const P = [
        { ch: c.lorenzo, x: lerp(730, 800, k), y: 885, s: 142, o: { animState: 'run', frame: runF(S.f + 2, 5) } },
        { ch: c.charles, x: lerp(1150, 1060, k), y: 815, s: 126, o: { animState: 'run', frame: runF(S.f + 6, 5), flipX: true } },
        { ch: c.kaiser, x: lerp(1120, 1080, k), y: 762, s: 108, o: { animState: 'run', frame: runF(S.f + 1, 5), flipX: true } },
        { ch: c.sae, x: 930, y: 850, s: 136, o: {} },
        { ch: c.rin, x: lerp(1220, 1400, k), y: 786, s: 116, o: { animState: 'run', frame: runF(S.f, 4) } },
        { ch: c.hugo, x: lerp(1160, 1335, k), y: 772, s: 112, o: { animState: 'run', frame: runF(S.f + 3, 4) } },
        { ch: c.loki, x: 1470, y: 905, s: 146, o: { flipX: true } },
        { ch: c.shidou, x: lerp(600, 690, k), y: 760, s: 104, o: { animState: 'run', frame: runF(S.f + 5, 4) } },
        { ch: c.you, x: lerp(400, 600, k), y: 935, s: 152, o: { animState: 'run', frame: runF(S.f, 4) } }
      ];
      P.sort((a, b) => a.y - b.y).forEach((p) => {
        this.wcfgShadow(ctx, p.x, p.y, p.s * 0.22, 0.45);
        this.wcfgSpr(ctx, p.ch, p.x, p.y, p.s, p.o);
      });
      this.cineGlow(ctx, 966, 840, 26, 'rgba(249,168,212,0.6)', 0.8);
      this.ptdBall(ctx, 966, 840, 10, S.f * 0.1);
      ctx.restore();
      // a parte de cima fica mais escura (o letreiro e o placar precisam ler)
      this.cineGradient(ctx, 0, top, W, 150, [[0, 'rgba(1,3,11,0.7)'], [1, 'rgba(1,3,11,0)']]);
      // o telestrator da TV marca os quatro egos
      const tagOut = 1 - seg(t, 140, 152);
      const tags = [
        [c.sae, 930, 850, 136, 'SAE ITOSHI', SAE_C, 62],
        [c.hugo, lerp(1160, 1335, k), 772, 112, 'HUGO', HUGO_C, 76],
        [c.loki, 1470, 905, 146, 'JULIAN LOKI', LOKI_C, 90],
        [c.you, lerp(400, 600, k), 935, 152, this.cinePlayerName(), YOU_C, 104]
      ];
      tags.forEach(([ch, x, y, s, nm, col, at]) => this.wcfgTag(ctx, X(x), Y(y - s * 0.98), nm, col, seg(t, at, at + 14) * tagOut));
      // o fim do plano: o mundo prende a respiração — QUATRO EGOS
      const dk = seg(t, 146, 164);
      if (dk > 0) {
        ctx.fillStyle = `rgba(1,3,11,${0.62 * dk})`;
        ctx.fillRect(0, top, W, bot - top);
        this.rincStamp(ctx, 'QUATRO EGOS.', W / 2, top + 210, 104, '#f8fafc', t, 152, 2, W * 0.8);
        const names = [[this.cinePlayerName(), YOU_C], ['SAE', SAE_C], ['LOKI', LOKI_C], ['HUGO', HUGO_C]];
        ctx.save();
        ctx.font = 'italic 900 26px "Segoe UI", sans-serif';
        const ws = names.map(([n]) => ctx.measureText(n).width);
        const gap = 46;
        let x = W / 2 - (ws.reduce((a, b) => a + b, 0) + gap * 3) / 2;
        ctx.restore();
        names.forEach(([n, col], i) => {
          this.cineImpactText(ctx, n, x + ws[i] / 2, top + 300, 26, col, seg(t, 170 + i * 6, 178 + i * 6));
          x += ws[i] + gap;
        });
      }
      this.wcfgScore(ctx, W - 414, top + 18, 2, "90+5'", seg(t, 8, 24));
      this.finKicker(ctx, 40, top + 30, 'CATEDRAL MUNDIAL • FINAL DA COPA SUB-20', seg(t, 10, 60));
      this.finKicker(ctx, 40, top + 58, "90+5' • O ÚLTIMO ATAQUE", seg(t, 40, 90), '#facc15');
      this.cineFlash(ctx, W, H, 1 - seg(t, 14, 32), '#000000');
      this.cineSfx(S, 2, 'torcida', () => window.SFX?.whistle?.(1));
      this.cineSfx(S, 152, 'egos', () => window.SFX?.kick?.(0.6));
    },

    // PLANO 2 — o Sae com a bola, três franceses em cima; o olho dele encontra o passe
    wcfgP2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcfgCast();
      const k = easeIO(t / 190);
      const hz = top + 270;
      const slow = (off) => runF(S.f + off, 9);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2 + k * 30, y: H / 2 + k * 8, zoom: 1 + k * 0.07, shake: 0.6 });
      this.wcfgField(ctx, S, { sx: 830, hz, zoom: 1.7, blur: 5, dark: 0.18 });
      this.cineBokeh(ctx, W, top, hz - 10, t * 0.5, 14, ['rgba(0,245,212,0.28)', 'rgba(250,204,21,0.26)', 'rgba(249,168,212,0.3)'], 21);
      // dois marcadores franceses: um lá atrás, outro pela esquerda
      this.wcfgShadow(ctx, lerp(1010, 950, k), hz + 140, 40, 0.35);
      this.wcfgSpr(ctx, c.kaiser, lerp(1010, 950, k), hz + 140, 220, { animState: 'run', frame: slow(1), flipX: true, dim: 0.42, dimTint: '6,10,30', rim: '#93c5fd', rimSides: [-1] });
      this.wcfgShadow(ctx, lerp(360, 450, k), bot - 46, 70, 0.4);
      this.wcfgSpr(ctx, c.lorenzo, lerp(360, 450, k), bot - 46, 380, { animState: 'run', frame: slow(4), dim: 0.32, dimTint: '8,6,26', rim: '#c4b5fd', rimSides: [1] });
      // o Sae, parado no meio do furacão
      const sx = 760;
      const feet = bot - 14;
      this.cineGlow(ctx, sx, feet - 230, 300, 'rgba(249,168,212,0.3)', 1);
      this.wcfgShadow(ctx, sx, feet, 90, 0.5);
      this.wcfgSpr(ctx, c.sae, sx, feet, 470, { rim: SAE_C, rimSides: [-1, 1], rimD: 3 });
      this.ptdBall(ctx, sx + 70, feet - 18, 18, S.f * 0.05, '#f9a8d4');
      // ondas rosa quando ele vê a linha
      this.ptdRings(ctx, sx, feet - 330, seg(t, 124, 164), ['#f9a8d4', '#fdf2f8'], 240, 0);
      // o Charles em primeiro plano, enorme e escuro, entrando pela direita
      this.wcfgSpr(ctx, c.charles, lerp(1460, 1150, ease(t / 190)), bot + 330, 820, { animState: 'run', frame: slow(6), flipX: true, dim: 0.74, dimTint: '3,6,20', rim: '#fca5a5', rimSides: [-1], rimD: 3 });
      ctx.restore();
      // câmera lenta: a luz puxa para o rosa
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      this.cineGradient(ctx, 0, top, W, bot - top, [[0, 'rgba(80,20,50,0.18)'], [1, 'rgba(80,20,50,0)']]);
      ctx.restore();
      if (t < 96) this.ptdChip(ctx, 'TRÊS EM CIMA DELE', W - 220, top + 44, '#ef4444', seg(t, 12, 26) * (1 - seg(t, 84, 96)));
      // painel: um olho do Sae, de perto (pálpebra a meio mastro... até ele ver)
      const kp = ease(seg(t, 62, 80));
      if (kp > 0) {
        const pts = [[22, top + 22], [420, top + 22], [388, bot - 22], [22, bot - 22]];
        this.cinePanel(ctx, pts, () => {
          this.wcfgPanelBg(ctx, 0, top, 440, bot - top, '#1a0715', '#3b0a2a', '#f9a8d4', 210, top + 270, t * 0.002);
          const dw = 380;
          const U = dw / 6;
          const x0 = 210 - dw / 2;
          const y0 = top + 270 - 3.1 * U;
          this.finCrop(ctx, c.sae, {}, 11.5, 7, 6, 6, x0, y0, dw, U * 6);
          const ex = x0 + (14.5 - 11.5) * U;
          const ey = y0 + 3.1 * U;
          const saw = t >= 120;
          this.drawPixelEye(ctx, ex, ey, U * 0.3, { line: '#020617', iris: '#0f766e', ring: '#5eead4', look: saw ? 2 : 0, tiny: false });
          if (!saw) this.finLid(ctx, ex, ey, U * 0.3, 1, 'half', this.finShade(c.sae.skinColor, -0.18));
          ctx.fillStyle = 'rgba(40,8,30,0.22)';
          ctx.fillRect(0, top, 440, bot - top);
          if (saw) this.ptdEyeFlare(ctx, ex + U * 0.6, ey, seg(t, 120, 134) * (1 - seg(t, 150, 186) * 0.6), '#f9a8d4', 900);
        }, { dx: (1 - kp) * -460 });
      }
      this.finKicker(ctx, 40, top + 30, 'SAE ITOSHI • O PRODÍGIO', seg(t, 6, 44) * (1 - seg(t, 56, 64)), SAE_C);
      this.cineSfx(S, 120, 'viu', () => window.SFX?.blip?.(880));
    },

    // PLANO 3 — o Rin dispara pedindo a bola, por puro ego; o Hugo morde a isca
    wcfgP3(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcfgCast();
      const hz = top + 230;
      const a = easeIn(seg(t, 0, 214));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2 + Math.sin(t * 0.32) * 3, zoom: 1.02 + a * 0.05, shake: 1.6 });
      this.wcfgField(ctx, S, { sx: 1350, hz, zoom: 2.0, blur: 6, dark: 0.2 });
      this.ptdRays(ctx, W / 2, hz + 30, 900, '#e0f2fe', 0.07, t * 0.002, 44, 0.03);
      // o Hugo colado nas costas do Rin
      const rs = lerp(320, 520, a);
      const rf = lerp(bot - 40, bot + 120, a);
      const rx = lerp(620, 600, a);
      const hs = rs * 0.8;
      const hf = rf - lerp(60, 110, a);
      const hx = lerp(830, 870, a);
      this.cineGlow(ctx, hx, hf - hs * 0.5, hs * 0.6, 'rgba(251,113,133,0.35)', 0.9);
      this.wcfgShadow(ctx, hx, hf, hs * 0.2, 0.45);
      // os dois vêm de frente pra câmera (view 'front' nos bonecos novos)
      this.wcfgSpr(ctx, c.hugo, hx, hf, hs, { animState: 'run', view: 'front', frame: runF(S.f + 2, 3), rim: HUGO_C, rimSides: [-1, 1], dim: 0.12, dimTint: '30,4,12' });
      this.cineGlow(ctx, rx, rf - rs * 0.5, rs * 0.65, 'rgba(34,211,238,0.4)', 1);
      this.wcfgShadow(ctx, rx, rf, rs * 0.2, 0.5);
      this.wcfgSpr(ctx, c.rin, rx, rf, rs, { animState: 'run', view: 'front', frame: runF(S.f, 3), rim: RIN_C, rimSides: [-1, 1], rimD: 3 });
      // grama levantando dos passos
      ctx.fillStyle = 'rgba(134,239,172,0.6)';
      for (let i = 0; i < 12; i++) {
        const q = ((t * 2.2 + i * 17) % 50) / 50;
        ctx.fillRect(rx - 120 + rnd(i, 5) * 240, bot - 20 - Math.sin(q * Math.PI) * 60 - rnd(i, 6) * 30, 4, 4);
      }
      ctx.restore();
      // painel: o grito (boca aberta, dentes)
      const kp = ease(seg(t, 8, 22)) * (1 - ease(seg(t, 104, 116)));
      if (kp > 0) {
        const pts = [[W * 0.6, top + 18], [W - 22, top + 18], [W - 22, top + 206], [W * 0.585, top + 222]];
        this.cinePanel(ctx, pts, () => {
          this.wcfgPanelBg(ctx, W * 0.55, top, W * 0.45, 240, '#021a1d', '#04343a', '#2dd4bf', W * 0.8, top + 120, t * 0.003);
          const cw = 520;
          const U = cw / 14;
          const x0 = W * 0.8 - cw / 2;
          const y0 = top + 30 - 1.5 * U;
          const cu0 = 11;
          const cv0 = 7;
          this.finCrop(ctx, c.rin, {}, cu0, cv0, 14, 8, x0, y0, cw, U * 8);
          const ey = y0 + (10.1 - cv0) * U;
          [14.5, 21.5].forEach((ux, i) => {
            const ex = x0 + (ux - cu0) * U;
            this.drawPixelEye(ctx, ex, ey, U * 0.3, { line: '#020617', iris: '#0f766e', ring: RIN_C, look: i ? -1 : 1 });
            this.finLid(ctx, ex, ey, U * 0.3, i === 0 ? 1 : -1, 'angry', '#020617');
          });
          const fu = (ux, uy, uw, uh, col) => {
            ctx.fillStyle = col;
            ctx.fillRect(Math.round(x0 + (ux - cu0) * U), Math.round(y0 + (uy - cv0) * U), Math.ceil(uw * U), Math.ceil(uh * U));
          };
          fu(16.2, 12.1, 3.6, 2.0, '#1f0606');
          fu(16.4, 12.1, 3.2, 0.45, '#f1f5f9');
          fu(16.6, 13.6, 2.8, 0.4, '#f1f5f9');
          ctx.fillStyle = 'rgba(2,26,29,0.2)';
          ctx.fillRect(W * 0.55, top, W * 0.45, 240);
        }, { dx: (1 - kp) * 560 });
        this.rincStamp(ctx, 'SAE!!', W * 0.585 - 24, top + 64, 66, RIN_C, t, 20, 3, 0, 'right', clamp(kp * 2));
      }
      // painel: os olhos do Hugo, grudados no Rin (em cima, à esquerda)
      const kh = ease(seg(t, 112, 128));
      if (kh > 0) {
        const pts = [[22, top + 18], [W * 0.4, top + 18], [W * 0.385, top + 196], [22, top + 210]];
        this.cinePanel(ctx, pts, () => {
          this.wcfgPanelBg(ctx, 0, top, W * 0.45, 230, '#1c0510', '#3f0a1c', '#fb7185', W * 0.2, top + 110, t * 0.003);
          const dw = 520;
          const U = dw / 14;
          this.wcfgBand(ctx, c.hugo, W * 0.205 - dw / 2, top + 118 - 3.1 * U, dw, { ring: '#fda4af', iris: '#3f0a1c', look: -2, half: true });
          ctx.fillStyle = 'rgba(40,4,16,0.22)';
          ctx.fillRect(0, top, W * 0.45, 230);
        }, { dx: (1 - kh) * -620 });
        this.finKicker(ctx, 46, top + 186, 'HUGO', seg(t, 124, 140), HUGO_C);
      }
      if (t > 150) this.ptdChip(ctx, 'HUGO MORDEU A ISCA', W - 200, bot - 60, HUGO_C, seg(t, 150, 164));
      this.finKicker(ctx, 40, top + 30, 'RIN ITOSHI • POR PURO EGO', seg(t, 4, 44) * (1 - seg(t, 100, 112)), RIN_C);
      this.cineSfx(S, 20, 'grito', () => window.SFX?.whoosh?.());
    },

    // PLANO 4 — o passe que ninguém viu: a trivela, a linha rosa, e o colégio voltando
    wcfgP4(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcfgCast();
      const mid = (top + bot) / 2;
      // ---- A: o pé do Sae (câmera no chão)
      if (t < 72) {
        const kick = 34;
        const hz = top + 64;
        ctx.save();
        this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1.04 + seg(t, 0, kick) * 0.06, shake: t >= kick ? 9 * (1 - seg(t, kick, kick + 24)) : 0.8 });
        this.wcfgField(ctx, S, { sx: 1000, hz, zoom: 2.6, blur: 6, dark: 0.15 });
        this.cineBokeh(ctx, W, top - 20, hz, t, 12, ['rgba(249,168,212,0.32)', 'rgba(0,245,212,0.25)'], 31);
        // câmera rente ao chão: da cintura para baixo, a chuteira e a bola
        const size = 1150;
        const u = size / 36;
        const sx = 400;
        const ground = bot - 96;
        const feet = ground - 1.5 * u;
        this.wcfgShadow(ctx, sx + 4 * u, ground + 6, 260, 0.5);
        this.wcfgSpr(ctx, c.sae, sx, feet, size, { animState: t < kick ? 'windup' : 'shoot', rim: SAE_C, rimSides: [1], rimD: 3 });
        const bx0 = sx + 12.4 * u;
        const by0 = ground - 32;
        if (t < kick) {
          this.wcfgShadow(ctx, bx0, ground + 4, 36, 0.55);
          this.ptdBall(ctx, bx0, by0, 32, 0, '#f9a8d4');
        } else {
          const q = t - kick;
          const bx = bx0 + q * 34;
          const by = by0 - q * 13 - q * q * 0.05;
          const tail = [];
          for (let i = 0; i < 8; i++) {
            const qq = Math.max(0, q - i * 1.6);
            tail.push({ x: bx0 + qq * 34, y: by0 - qq * 13 - qq * qq * 0.05 + Math.sin(i * 0.8) * i * 1.5 });
          }
          this.ptdStreak(ctx, tail, '#f9a8d4', 50, 0.85);
          this.ptdBall(ctx, bx, by, 30, q * 0.9, '#f9a8d4');
          this.ptdRings(ctx, bx0, by0, seg(t, kick, kick + 26), ['#f9a8d4', '#ffffff', '#f9a8d4'], 260, -0.4);
          ctx.fillStyle = 'rgba(134,239,172,0.85)';
          for (let i = 0; i < 16; i++) {
            const a = Math.PI + rnd(i, 41) * Math.PI;
            const d = q * (3 + rnd(i, 42) * 6);
            const gy = ground - 10 + Math.sin(a) * d + q * q * 0.14;
            if (gy < ground + 10) ctx.fillRect(bx0 + Math.cos(a) * d, gy, 6, 6);
          }
        }
        // grama de perto (primeiro plano)
        ctx.drawImage(this.luckGrassCv(), -200, ground - 40, 1700, 150);
        ctx.restore();
        if (t >= kick) {
          if (t < kick + 10) this.drawRadialSpeedLines(ctx, bx0, by0, W, '#020617', 0.5 * (1 - (t - kick) / 10));
          this.cineFlash(ctx, W, H, 0.55 * (1 - seg(t, kick, kick + 9)), '#fdf2f8');
          this.cineImpactText(ctx, 'TRIVELA!', W * 0.74, top + 110, 96, SAE_C, seg(t, kick + 2, kick + 10), W * 0.5, -0.1);
        }
        this.cineSfx(S, kick, 'passe', () => window.SFX?.kick?.(0.8));
        return;
      }
      // ---- B: a linha que só ele viu (o mundo em retícula, a linha e você em cor)
      if (t < 160) {
        const u = t - 72;
        const hz = top + 196;
        ctx.save();
        this.cineCamera(ctx, W, H, { x: W / 2 + u * 0.3, y: H / 2, zoom: 1.02 + u * 0.0006, shake: 0.5 });
        this.wcfgField(ctx, S, { sx: 1100, hz, zoom: 1.5, blur: 5, dark: 0.1 });
        const far = [
          [c.kaiser, 690, hz + 74, 140, { animState: 'run', frame: runF(S.f, 8), flipX: true }],
          [c.rin, 1010, hz + 92, 168, { animState: 'run', frame: runF(S.f + 2, 8) }],
          [c.hugo, 950, hz + 86, 160, { animState: 'run', frame: runF(S.f + 4, 8) }],
          [c.charles, 520, hz + 140, 240, { animState: 'run', frame: runF(S.f + 1, 8), flipX: true }],
          [c.lorenzo, 800, hz + 176, 280, { animState: 'run', frame: runF(S.f + 3, 8), flipX: true }]
        ];
        far.forEach(([ch, x, f, s, o]) => {
          this.wcfgShadow(ctx, x, f, s * 0.2, 0.4);
          this.wcfgSpr(ctx, ch, x, f, s, o);
        });
        ctx.restore();
        // tudo vira cinza de mangá (só o que importa fica em cor)
        ctx.save();
        ctx.globalCompositeOperation = 'saturation';
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, top, W, bot - top);
        ctx.restore();
        ctx.fillStyle = 'rgba(6,10,24,0.32)';
        ctx.fillRect(0, top, W, bot - top);
        this.finFillPat(ctx, 'dots', 0, top, W, bot - top, 0.35);
        ctx.save();
        this.cineCamera(ctx, W, H, { x: W / 2 + u * 0.3, y: H / 2, zoom: 1.02 + u * 0.0006 });
        // o Sae de costas em primeiro plano: quem passa e quem recebe ficam em cor
        this.wcfgSpr(ctx, c.sae, 200, bot + 330, 860, { facing: 'back', animState: 'shoot', dim: 0.5, dimTint: '24,6,20', rim: SAE_C, rimSides: [1], rimD: 3 });
        // você, lá longe
        const yx = lerp(1150, 1190, seg(u, 0, 88));
        this.cineGlow(ctx, yx, hz + 10, 90, 'rgba(0,245,212,0.5)', 1);
        this.wcfgSpr(ctx, c.you, yx, hz + 62, 132, { animState: 'run', frame: runF(S.f, 4), rim: YOU_C, rimSides: [-1, 1] });
        const ring = 0.6 + 0.4 * Math.sin(t * 0.2);
        ctx.strokeStyle = `rgba(0,245,212,${ring})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(yx + 30, hz + 64, 44, 10, 0, 0, TAU);
        ctx.stroke();
        // a linha de passe: por cima de todo mundo
        const p0 = [300, bot - 30];
        const p1 = [760, top - 70];
        const p2 = [yx + 30, hz + 40];
        const lk = ease(seg(u, 2, 40));
        this.wcfgCurve(ctx, p0, p1, p2, 0, lk, [['rgba(249,168,212,0.25)', 18], [SAE_C, 6], ['#ffffff', 2]]);
        const bk = seg(u, 26, 88);
        if (bk > 0) {
          const [bx, by] = qb(p0, p1, p2, easeIO(bk) * 0.9);
          this.ptdBall(ctx, bx, by, lerp(26, 12, bk), u * 0.5, '#f9a8d4');
        }
        ctx.restore();
        this.finKicker(ctx, 40, top + 30, 'A LINHA QUE SÓ O SAE VIU', seg(u, 6, 46), SAE_C);
        this.cineSfx(S, 74, 'linha', () => window.SFX?.whoosh?.());
        return;
      }
      // ---- C: o colégio (em cima) e agora (embaixo): a mesma bola, a mesma pergunta
      const v = t - 160;
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, top, W, bot - top);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      const kA = ease(seg(v, 0, 16));
      const pA = [[18, top + 16], [W - 18, top + 16], [W - 18, mid - 18], [18, mid + 8]];
      this.cinePanel(ctx, pA, () => {
        const k = 0.75;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.wcfgSchool(), W / 2 - 960 * k - v * 0.4, top + 196 - 690 * k, 1920 * k, 1080 * k);
        ctx.restore();
        // o Tada lá na frente, de braço erguido pedindo
        this.wcfgSpr(ctx, c.tada, 930, top + 196, 118, { animState: 'call_pass' });
        this.rincStamp(ctx, 'PASSA!', 1030, top + 92, 34, '#fed7aa', v, 18, 2);
        // você no colégio, de costas, com a bola no pé
        this.wcfgSpr(ctx, c.you, 600, mid - 6, 236, { facing: 'back', rim: '#fdba74', rimSides: [-1, 1] });
        this.ptdBall(ctx, 650, mid - 18, 13, 0);
        // memória: sépia quente e granulada
        ctx.fillStyle = 'rgba(234,88,12,0.2)';
        ctx.fillRect(0, top, W, mid - top);
        this.finFillPat(ctx, 'dots', 0, top, W, mid - top, 0.25);
      }, { dx: (1 - kA) * -W });
      this.finKicker(ctx, 46, top + 44, 'COLÉGIO ICHINAN • A FINAL REGIONAL', seg(v, 10, 44), '#fb923c');
      const kB = ease(seg(v, 22, 38));
      const pB = [[18, mid + 24], [W - 18, mid - 2], [W - 18, bot - 16], [18, bot - 16]];
      this.cinePanel(ctx, pB, () => {
        const hz = mid + 120;
        this.wcfgField(ctx, S, { sx: 1150, hz, zoom: 1.6, blur: 5, dark: 0.1 });
        this.wcfgSpr(ctx, c.loki, lerp(1040, 960, seg(v, 22, 102)), hz + 40, 120, { animState: 'run', frame: runF(S.f, 3), flipX: true, rim: LOKI_C, rimSides: [1] });
        this.wcfgSpr(ctx, c.hugo, 1160, hz + 34, 100, { animState: 'run', frame: runF(S.f + 1, 4) });
        this.wcfgSpr(ctx, c.rin, 1210, hz + 38, 104, { animState: 'run', frame: runF(S.f + 3, 4), rim: RIN_C, rimSides: [1] });
        this.cineGlow(ctx, 600, bot - 140, 170, 'rgba(0,245,212,0.3)', 1);
        this.wcfgSpr(ctx, c.you, 600, bot - 20, 236, { facing: 'back', animState: 'run', frame: runF(S.f, 5), rim: YOU_C, rimSides: [-1, 1] });
        // a bola do Sae passa por cima da câmera e cai à sua frente
        const bp = (q) => [lerp(380, 860, q), lerp(mid + 40, bot - 170, q) - Math.sin(q * Math.PI) * 70];
        const q = seg(v, 30, 102);
        const [bx, by] = bp(q);
        const tail = [];
        for (let i = 0; i < 7; i++) {
          const [tx, ty] = bp(Math.max(0, q - i * 0.035));
          tail.push({ x: tx, y: ty });
        }
        if (q > 0) {
          this.ptdStreak(ctx, tail, '#f9a8d4', lerp(40, 20, q), 0.7);
          this.ptdBall(ctx, bx, by, lerp(30, 14, q), v * 0.4, '#f9a8d4');
        }
      }, { dx: (1 - kB) * W });
      if (kB > 0) this.finKicker(ctx, W - 46, bot - 40, 'AGORA • A CATEDRAL', seg(v, 34, 70), YOU_C, 'right');
    },

    // PLANO 5 — a Velocidade Divina: o Loki surge do nada e encosta em você
    wcfgP5(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcfgCast();
      const hz = top + 220;
      const kk = easeIn(seg(t, 8, 128));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2 + Math.sin(t * 0.34) * 3, zoom: 1.03, shake: 1.5 + kk * 3 });
      this.wcfgField(ctx, S, { sx: 1480, hz, zoom: 1.9, blur: 6, dark: 0.25 });
      this.ptdRays(ctx, W / 2, hz + 20, 1000, '#fde68a', 0.06 + kk * 0.08, t * 0.003, 44, 0.03);
      // a bola lá no alto, descendo à frente de vocês dois
      const bq = seg(t, 0, 190);
      this.cineGlow(ctx, 820, lerp(top + 40, top + 150, bq), 60, 'rgba(249,168,212,0.5)', 1);
      this.ptdBall(ctx, 820, lerp(top + 40, top + 150, bq), lerp(12, 20, bq), t * 0.3);
      // o Loki: de pontinho no fundo a ombro a ombro em dois segundos
      const ls = lerp(140, 500, kk);
      const lf = lerp(hz + 80, bot + 80, kk);
      const lx = lerp(1000, 820, kk);
      for (let i = 0; i < 4; i++) {
        const sd = Math.floor(t / 3) * 7 + i * 13;
        const yy = lf - ls * (0.25 + i * 0.17);
        this.wcfgBolt(ctx, lx + ls * 0.25, yy, lx + ls * 0.25 + 260 + i * 60, yy - 30 + i * 18, sd, 16 + i * 4, LOKI_C, 5 - i);
      }
      this.cineGlow(ctx, lx, lf - ls * 0.5, ls * 0.7, 'rgba(250,204,21,0.45)', 0.9);
      this.wcfgShadow(ctx, lx, lf, ls * 0.2, 0.45);
      this.wcfgSpr(ctx, c.loki, lx, lf, ls, { animState: 'run', view: 'front', frame: runF(S.f, 2), rim: LOKI_C, rimSides: [-1, 1], rimD: 3 });
      // você correndo para a câmera
      const yx = 450;
      const yf = bot + 90;
      this.cineGlow(ctx, yx, yf - 280, 260, 'rgba(0,245,212,0.35)', 1);
      this.wcfgShadow(ctx, yx, yf, 110, 0.5);
      this.wcfgSpr(ctx, c.you, yx, yf, 540, { animState: 'run', view: 'front', frame: runF(S.f, 3), rim: YOU_C, rimSides: [-1, 1], rimD: 3 });
      // faíscas douradas no chão por onde ele passa
      ctx.fillStyle = 'rgba(253,230,138,0.85)';
      for (let i = 0; i < 14; i++) {
        const q = ((t * 3 + i * 11) % 30) / 30;
        ctx.fillRect(lx - ls * 0.3 + rnd(i, 3) * ls * 0.6 + q * 120, lf - 6 - Math.sin(q * Math.PI) * 40 * rnd(i, 4), 4, 4);
      }
      ctx.restore();
      // os olhos acendem quando ele encosta
      if (t > 140) {
        const e = seg(t, 140, 152);
        this.ptdEyeFlare(ctx, lx - 30, lf - ls * 0.87 + 10.1 * (ls / 36) - 16, e * (1 - seg(t, 170, 190)), '#facc15', W * 0.6);
      }
      this.cineImpactText(ctx, 'VELOCIDADE DIVINA', W * 0.33, top + 58, 54, LOKI_C, seg(t, 30, 42), W * 0.56, -0.05);
      this.finKicker(ctx, 50, top + 112, 'GODSPEED • JULIAN LOKI', seg(t, 46, 80), LOKI_C);
      this.cineSfx(S, 10, 'vento', () => window.SFX?.whoosh?.());
      this.cineSfx(S, 120, 'vento2', () => window.SFX?.whoosh?.());
    },

    // PLANO 6 — metavisão: três faixas. Os seus olhos, o caminho até o ângulo, os do Loki
    wcfgP6(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcfgCast();
      ctx.fillStyle = '#01030a';
      ctx.fillRect(0, top, W, bot - top);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      const beat = 1 + Math.pow(Math.max(0, Math.sin(t * 0.16)), 14) * 0.015;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(beat, beat);
      ctx.translate(-W / 2, -H / 2);
      // 1) os seus olhos
      const b1 = [top + 12, top + 172];
      const k1 = ease(seg(t, 0, 14));
      this.cinePanel(ctx, [[18, b1[0]], [W - 18, b1[0]], [W - 18, b1[1] - 8], [18, b1[1]]], () => {
        this.wcfgPanelBg(ctx, 0, b1[0], W, 170, '#021016', '#03262b', null);
        const dw = 760 + easeIO(t / 170) * 40;
        const U = dw / 14;
        const e = this.wcfgBand(ctx, c.you, W / 2 - dw / 2, (b1[0] + b1[1]) / 2 - 3.1 * U, dw, { ring: YOU_C, iris: '#064e3b', look: 1 });
        const gl = ease(seg(t, 16, 50));
        this.luckStreak(ctx, e.rx + 2.4 * U + gl * 520, e.ly - 0.3 * U, e.rx + 2.2 * U, e.ly, 2, 12, '0,245,212', 0.9);
        this.luckStreak(ctx, e.lx - 2.4 * U - gl * 520, e.ly - 0.3 * U, e.lx - 2.2 * U, e.ly, 2, 12, '0,245,212', 0.9);
        this.cineGlow(ctx, e.rx, e.ly, 80, 'rgba(0,245,212,0.45)', gl);
        this.cineGlow(ctx, e.lx, e.ly, 80, 'rgba(0,245,212,0.45)', gl);
        ctx.fillStyle = 'rgba(0,30,40,0.18)';
        ctx.fillRect(0, b1[0], W, 170);
      }, { dx: (1 - k1) * -W });
      // 2) o que você vê: a bola parada no ar e o caminho até o ângulo
      const b2 = [top + 186, top + 362];
      const k2 = ease(seg(t, 18, 32));
      this.cinePanel(ctx, [[18, b2[0] - 6], [W - 18, b2[0] + 2], [W - 18, b2[1]], [18, b2[1] - 6]], () => {
        const y0 = b2[0];
        const h = b2[1] - b2[0];
        this.cineGradient(ctx, 0, y0 - 10, W, h + 20, [[0, '#020b1a'], [1, '#04142c']]);
        // grade do campo em perspectiva (fio ciano)
        const vx = W * 0.8;
        const vy = y0 + 34;
        ctx.save();
        ctx.strokeStyle = 'rgba(0,245,212,0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = -12; i <= 12; i++) {
          ctx.moveTo(vx, vy);
          ctx.lineTo(vx + i * 160, y0 + h + 20);
        }
        for (let i = 1; i < 9; i++) {
          const y = vy + Math.pow(i / 9, 1.8) * (h - 10);
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
        }
        ctx.stroke();
        ctx.restore();
        // o gol lá no fundo
        const g0 = [W * 0.71, y0 + 44];
        const g1 = [W * 0.89, y0 + 110];
        ctx.fillStyle = 'rgba(2,6,23,0.7)';
        ctx.fillRect(g0[0], g0[1], g1[0] - g0[0], g1[1] - g0[1]);
        ctx.strokeStyle = 'rgba(226,232,240,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = g0[0]; x <= g1[0]; x += 12) {
          ctx.moveTo(x, g0[1]);
          ctx.lineTo(x, g1[1]);
        }
        for (let y = g0[1]; y <= g1[1]; y += 12) {
          ctx.moveTo(g0[0], y);
          ctx.lineTo(g1[0], y);
        }
        ctx.stroke();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(g0[0], g1[1]);
        ctx.lineTo(g0[0], g0[1]);
        ctx.lineTo(g1[0], g0[1]);
        ctx.lineTo(g1[0], g1[1]);
        ctx.stroke();
        // o goleiro, pequeno, adiantado
        this.wcfgSpr(ctx, c.gk, W * 0.79, g1[1] + 4, 64, { dim: 0.25, dimTint: '2,10,30' });
        // a bola quase parada no ar (o tempo arrastando)
        const bx = W * 0.2;
        const by = y0 + 70 + t * 0.12;
        this.cineGlow(ctx, bx, by, 70, 'rgba(249,168,212,0.45)', 1);
        this.ptdBall(ctx, bx, by, 20, t * 0.04);
        // o caminho até o ângulo (pontilhado andando) e a mira travando
        const tgt = [g1[0] - 10, g0[1] + 10];
        const pk = ease(seg(t, 46, 96));
        this.wcfgCurve(ctx, [bx + 24, by - 6], [W * 0.5, y0 - 40], tgt, 0, pk, [['rgba(0,245,212,0.25)', 10], [YOU_C, 3, [[10, 9], -t * 0.8]]]);
        const lock = ease(seg(t, 80, 116));
        if (pk > 0.6) {
          const rs = lerp(70, 20, lock);
          ctx.save();
          ctx.strokeStyle = lock >= 1 ? YOU_C : '#f8fafc';
          ctx.lineWidth = 3;
          ctx.beginPath();
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
            const x = tgt[0] + sx * rs;
            const y = tgt[1] + sy * rs;
            ctx.moveTo(x, y - sy * 12);
            ctx.lineTo(x, y);
            ctx.lineTo(x - sx * 12, y);
          });
          ctx.stroke();
          ctx.restore();
          if (lock >= 1) {
            this.cineGlow(ctx, tgt[0], tgt[1], 60, 'rgba(0,245,212,0.6)', 0.6 + 0.3 * Math.sin(t * 0.3));
            this.ptdChip(ctx, 'O ÂNGULO', tgt[0] - 100, y0 + 150, YOU_C, seg(t, 116, 128), { size: 14 });
          }
        }
        this.finKicker(ctx, 34, y0 + 26, 'METAVISÃO', seg(t, 30, 60), YOU_C);
      }, { dx: (1 - k2) * W });
      // 3) os olhos do Loki: ele percebe tarde
      const b3 = [top + 376, bot - 12];
      const k3 = ease(seg(t, 36, 50));
      this.cinePanel(ctx, [[18, b3[0]], [W - 18, b3[0] + 8], [W - 18, b3[1]], [18, b3[1]]], () => {
        this.wcfgPanelBg(ctx, 0, b3[0], W, 170, '#140f02', '#3f2e06', null);
        const dw = 760;
        const U = dw / 14;
        const late = t > 122;
        const e = this.wcfgBand(ctx, c.loki, W / 2 - dw / 2, (b3[0] + b3[1]) / 2 - 3.1 * U, dw, { ring: '#f0b429', iris: '#3b2a05', look: late ? 0 : -1, tiny: late });
        this.cineGlow(ctx, e.rx, e.ly, 70, 'rgba(250,204,21,0.4)', 0.8);
        this.wcfgSweat(ctx, e.rx + 2.6 * U, e.ly - 1.6 * U, U, seg(t, 126, 166));
        ctx.fillStyle = 'rgba(30,20,0,0.2)';
        ctx.fillRect(0, b3[0], W, 170);
      }, { dx: (1 - k3) * -W });
      ctx.restore();
      [60, 100, 140].forEach((a, i) => this.cineSfx(S, a, 'tic' + i, () => window.SFX?.blip?.(330 - i * 30)));
    },

    // PLANO 7 — de primeira: a câmera atrás de você e o gol lá no fundo; o Loki chega de
    // carrinho pela direita um instante tarde e a bola rasga o campo até o ângulo
    wcfgP7(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcfgCast();
      const kick = 60;
      const hold = 12;
      const tt = t < kick ? t : t < kick + hold ? kick : t - hold;
      const after = Math.max(0, tt - kick);
      const hz = top + 236;
      const size = 470;
      const u = size / 36;
      const yx = 500;
      const feet = bot - 52;
      const ground = feet + 1.5 * u;
      // o ponto do chute: a chuteira esticada da pose de chute, rente à grama
      const cx = yx + 12 * u;
      const cy = ground - 22;
      // o gol lá no fundo, de frente para a câmera, e o ângulo onde a bola vai entrar
      const G = { x0: 830, x1: 1090, y0: hz - 16, y1: hz + 60 };
      const tgt = [G.x1 - 16, G.y0 + 12];
      const lf = bot + 96;
      const lxOf = (q) => lerp(1480, 860, ease(seg(q, 24, 90))) - Math.max(0, q - 90) * 0.6;
      const lx = lxOf(tt);
      const impact = t >= kick && t < kick + hold;
      const cam = (g) => {
        const z = t < kick ? 1 + seg(t, 0, kick) * 0.08 : 1.08 - seg(t, kick + hold, kick + 70) * 0.05;
        const pan = t >= kick ? easeIO(seg(t, kick + hold, kick + 60)) * 70 : 0;
        this.cineCamera(g, W, H, { x: W / 2 + pan, y: H / 2, zoom: z, shake: t >= kick ? 12 * Math.max(0, 1 - (t - kick) / 30) : 1 });
      };
      const goal = (ink) => {
        if (!ink) {
          ctx.fillStyle = 'rgba(2,6,23,0.55)';
          ctx.fillRect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0);
          ctx.strokeStyle = 'rgba(226,232,240,0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = G.x0; x <= G.x1; x += 13) {
            ctx.moveTo(x, G.y0);
            ctx.lineTo(x, G.y1);
          }
          for (let y = G.y0; y <= G.y1; y += 13) {
            ctx.moveTo(G.x0, y);
            ctx.lineTo(G.x1, y);
          }
          ctx.stroke();
        }
        ctx.strokeStyle = ink ? '#0a1430' : '#f8fafc';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(G.x0, G.y1);
        ctx.lineTo(G.x0, G.y0);
        ctx.lineTo(G.x1, G.y0);
        ctx.lineTo(G.x1, G.y1);
        ctx.stroke();
      };
      // o goleiro lá no fundo: parado... e voando tarde demais para o ângulo
      const gkO = () => {
        const d = ease(seg(after, 4, 30));
        return { x: lerp((G.x0 + G.x1) / 2, G.x1 - 40, d), f: lerp(G.y1, G.y1 - 24, Math.sin(d * Math.PI * 0.7)), st: after > 4 ? 'dive' : 'idle' };
      };
      if (impact) {
        // QUADRO DE IMPACTO: papel claro, linhas em tinta; você de costas, o Loki e o gol em nanquim
        this.ptdImpactBg(ctx, S, cx, cy, '#0a1430', '#e0f2fe', 0.05);
        ctx.save();
        cam(ctx);
        goal(true);
        const gk = gkO();
        this.wcfgSpr(ctx, c.gk, gk.x, gk.f, 96, { animState: gk.st, tint: '#0a1430' });
        this.wcfgSpr(ctx, c.loki, lx, lf, 520, { animState: 'slide', flipX: true, tint: '#0a1430' });
        this.wcfgSpr(ctx, c.you, yx, feet, size, { facing: 'back', animState: 'shoot', tint: '#0a1430' });
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#0a1430';
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.strokeStyle = YOU_C;
        ctx.beginPath();
        ctx.arc(cx, cy, 44 + (t - kick) * 5, 0, TAU);
        ctx.stroke();
        // a mira no ângulo, ainda em tinta
        ctx.lineWidth = 4;
        ctx.strokeStyle = YOU_C;
        ctx.strokeRect(tgt[0] - 16, tgt[1] - 16, 32, 32);
        ctx.restore();
        this.cineImpactText(ctx, 'BAM!!', W * 0.26, top + 120, 150, '#f8fafc', seg(t, kick, kick + 6), W * 0.44, -0.1);
        this.cineSfx(S, kick, 'chute', () => window.SFX?.kick?.(1));
        return;
      }
      ctx.save();
      cam(ctx);
      this.wcfgField(ctx, S, { sx: 960, hz, zoom: 1.6, blur: 5, dark: 0.12 });
      this.cineBokeh(ctx, W, top, hz - 20, t, 12, ['rgba(224,242,254,0.32)', 'rgba(0,245,212,0.28)', 'rgba(250,204,21,0.28)'], 41);
      goal(false);
      const gk = gkO();
      this.wcfgSpr(ctx, c.gk, gk.x, gk.f, 96, { animState: gk.st, dim: 0.15, dimTint: '2,10,30' });
      // a mira da metavisão no ângulo (até o chute)
      if (t < kick) {
        const lk = ease(seg(t, 10, 50));
        const rs = lerp(40, 14, lk);
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * lk;
        ctx.strokeStyle = YOU_C;
        ctx.lineWidth = 3;
        ctx.beginPath();
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
          const x = tgt[0] + sx * rs;
          const y = tgt[1] + sy * rs;
          ctx.moveTo(x, y - sy * 8);
          ctx.lineTo(x, y);
          ctx.lineTo(x - sx * 8, y);
        });
        ctx.stroke();
        ctx.restore();
      }
      // a bola: cai do passe do Sae na frente do corpo... e depois rasga o campo até o ângulo
      const fly = (k) => {
        const e = 1 - Math.pow(1 - k, 1.5);
        return [lerp(cx, tgt[0], e), lerp(cy, tgt[1], e) - Math.sin(e * Math.PI) * 80, lerp(24, 6, e)];
      };
      let ballFront = true;
      if (tt >= kick) {
        const k = seg(after, 0, 24);
        const [bx, by, br] = fly(k);
        const tail = [];
        for (let i = 0; i < 9; i++) {
          const [tx, ty] = fly(Math.max(0, k - i * 0.05));
          tail.push({ x: tx, y: ty });
        }
        if (k < 1) this.ptdStreak(ctx, tail, YOU_C, br * 2.6, 0.85);
        this.ptdBall(ctx, bx, by + (k >= 1 ? Math.min(14, (after - 24) * 0.6) : 0), br, after * 0.9, YOU_C);
        if (k >= 1) this.ptdRings(ctx, tgt[0], tgt[1], seg(after, 24, 44), [YOU_C, '#ffffff'], 90, 0);
        ballFront = false;
      }
      // o Loki entrando de carrinho com o rastro dourado
      if (tt < 110) {
        for (let i = 0; i < 3; i++) this.wcfgBolt(ctx, lx + 150, lf - 120 - i * 40, lx + 460 + i * 40, lf - 140 - i * 30, Math.floor(t / 3) * 5 + i * 9, 14, LOKI_C, 4 - i);
      }
      this.cineGlow(ctx, lx, lf - 190, 230, 'rgba(250,204,21,0.35)', 0.9);
      this.wcfgShadow(ctx, lx - 40, ground + 10, 160, 0.45);
      this.wcfgSpr(ctx, c.loki, lx, lf, 520, { animState: 'slide', flipX: true, rim: LOKI_C, rimSides: [-1], rimD: 3 });
      // você, de costas: correndo, armando e batendo de primeira
      const st = t < kick - 26 ? 'run' : t < kick ? 'windup' : 'shoot';
      this.cineGlow(ctx, yx, feet - 220, 290, 'rgba(0,245,212,0.4)', 1);
      this.wcfgShadow(ctx, yx + 40, ground + 4, 110, 0.5);
      this.wcfgSpr(ctx, c.you, yx, feet, size, { facing: 'back', animState: st, frame: st === 'run' ? runF(S.f, 3) : 45, rim: YOU_C, rimSides: [-1, 1], rimD: 3 });
      if (ballFront && tt < kick) {
        const q = tt / kick;
        const p = (qq) => [lerp(780, cx, qq), lerp(top - 80, cy, easeIn(qq))];
        const [bx, by] = p(q);
        if (q > 0.1) {
          const tail = [];
          for (let i = 0; i < 6; i++) {
            const [tx, ty] = p(Math.max(0, q - i * 0.04));
            tail.push({ x: tx, y: ty });
          }
          this.ptdStreak(ctx, tail, '#f9a8d4', 30, 0.6);
        }
        this.wcfgShadow(ctx, cx, ground + 6, lerp(10, 26, q), 0.2 + q * 0.3);
        this.ptdBall(ctx, bx, by, 24, tt * 0.3, '#f9a8d4');
      }
      if (tt >= kick) {
        this.ptdRings(ctx, cx, cy, seg(after, 0, 30), [YOU_C, '#ffffff', YOU_C], 260, -0.2);
        ctx.fillStyle = 'rgba(134,239,172,0.85)';
        for (let i = 0; i < 18; i++) {
          const a = Math.PI + rnd(i, 51) * Math.PI;
          const d = after * (3 + rnd(i, 52) * 6);
          const gy = ground - 8 + Math.sin(a) * d + after * after * 0.12;
          if (gy < ground + 10) ctx.fillRect(cx - 20 + Math.cos(a) * d, gy, 6, 6);
        }
      }
      ctx.restore();
      if (t >= kick + hold && t < kick + hold + 10) this.drawRadialSpeedLines(ctx, cx, cy, W, '#020617', 0.5 * (1 - (t - kick - hold) / 10));
      if (t >= kick + hold) this.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, kick + hold, kick + hold + 8)));
      if (t > 104) this.cineImpactText(ctx, 'UM INSTANTE TARDE!', W * 0.3, top + 84, 48, LOKI_C, seg(t, 104, 114), W * 0.52, -0.05);
      if (t < kick) this.finKicker(ctx, 40, top + 30, 'SEM DOMINAR • DE PRIMEIRA', seg(t, 10, 50), YOU_C);
    },

    // PLANO 8 — de frente para o gol: a bola some no ângulo, o goleiro voa e não chega
    wcfgP8(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcfgCast();
      const hit = 40;
      const geo = { gx0: 250, gx1: 1030, gy0: 200, gy1: 516 };
      const hx = 976;
      const hy = 232;
      const shake = t >= hit ? 12 * Math.max(0, 1 - (t - hit) / 30) : 0.8;
      ctx.save();
      this.cineCamera(ctx, W, H, { x: W / 2, y: H / 2, zoom: 1 + seg(t, hit, 190) * 0.05, shake });
      this.wcfgField(ctx, S, { sx: 960, hz: 470, zoom: 1.45, blur: 5, dark: 0.12 });
      // fogos estourando em cima da cobertura depois do gol
      [[200, top + 30, 52], [1080, top + 20, 64], [640, top + 10, 80], [380, top + 40, 96], [940, top + 50, 112], [120, top + 60, 130]].forEach(([x, y, at], i) =>
        this.luckFirework(ctx, x, y, t - at, ['#facc15', YOU_C, '#f8fafc', '#ef4444'][i % 4], 24, 110 + (i % 3) * 30)
      );
      // o fundo da rede e as redes laterais
      const { gx0, gx1, gy0, gy1 } = geo;
      const bx0 = gx0 + 60;
      const bx1 = gx1 - 60;
      const by0 = gy0 + 34;
      const by1 = gy1 - 36;
      ctx.fillStyle = 'rgba(2,6,23,0.5)';
      poly(ctx, [[gx0, gy0], [gx1, gy0], [bx1, by0], [bx1, by1], [gx1, gy1], [gx0, gy1], [bx0, by1], [bx0, by0]]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(226,232,240,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const x = lerp(bx0, bx1, i / 20);
        ctx.moveTo(x, by0);
        ctx.lineTo(x, by1);
      }
      for (let i = 0; i <= 9; i++) {
        const y = lerp(by0, by1, i / 9);
        ctx.moveTo(bx0, y);
        ctx.lineTo(bx1, y);
      }
      for (let i = 0; i <= 6; i++) {
        const k = i / 6;
        ctx.moveTo(lerp(gx0, bx0, k), lerp(gy0, by0, k));
        ctx.lineTo(lerp(gx0, bx0, k), lerp(gy1, by1, k));
        ctx.moveTo(lerp(gx1, bx1, k), lerp(gy0, by0, k));
        ctx.lineTo(lerp(gx1, bx1, k), lerp(gy1, by1, k));
      }
      ctx.stroke();
      // o goleiro da França voando para o ângulo
      const gd = ease(seg(t, 6, 46));
      const fall = seg(t, 52, 84);
      const gkx = lerp(600, 750, gd);
      const gkf = t < 52 ? lerp(gy1, gy1 - 150, Math.sin(gd * Math.PI * 0.6)) : lerp(gy1 - 150 * Math.sin(Math.PI * 0.6), gy1 + 6, easeIn(fall));
      this.wcfgShadow(ctx, gkx, gy1 + 6, 70, 0.4);
      this.wcfgSpr(ctx, c.gk, gkx, gkf, 300, { animState: t < 6 ? 'idle' : 'dive', rim: '#bbf7d0', rimSides: [-1], dim: 0.1, dimTint: '2,10,20' });
      // a bola: vem da câmera e diminui até o ângulo
      let bx = hx;
      let by = hy;
      let br = 15;
      if (t < hit) {
        const q = 1 - Math.pow(1 - t / hit, 1.6);
        bx = lerp(840, hx, q);
        by = lerp(800, hy, q) - Math.sin(q * Math.PI) * 40;
        br = lerp(90, 15, q);
        const tail = [];
        for (let i = 0; i < 7; i++) {
          const qq = Math.max(0, q - i * 0.05);
          tail.push({ x: lerp(840, hx, qq), y: lerp(800, hy, qq) - Math.sin(qq * Math.PI) * 40 });
        }
        this.ptdStreak(ctx, tail, YOU_C, br * 1.6, 0.6);
      } else {
        by = hy + Math.min(40, (t - hit) * 0.5);
      }
      if (t < hit + 70) this.ptdBall(ctx, bx, by, br, t * 0.6, YOU_C);
      // a rede da frente estufando e as traves por cima
      const A = t >= hit ? Math.sin((t - hit) * 0.25) * Math.exp(-(t - hit) / 34) * 0.9 + 0.5 * Math.exp(-(t - hit) / 70) : 0;
      this.ptdGoalFront(ctx, geo, hx, hy, Math.max(0, A));
      if (t >= hit && t < hit + 30) this.ptdRings(ctx, hx, hy, seg(t, hit, hit + 30), [YOU_C, '#facc15', '#ffffff'], 320, 0);
      if (t > hit + 26) this.drawConfetti(ctx, W, H, t - hit, 60);
      ctx.restore();
      this.cineFlash(ctx, W, H, t >= hit ? 0.7 * (1 - seg(t, hit, hit + 9)) : 0);
      if (t >= hit + 6) {
        this.cineGradient(ctx, 0, bot - 190, W, 190, [[0, 'rgba(1,3,11,0)'], [1, 'rgba(1,3,11,0.6)']]);
        this.rincStamp(ctx, 'GOOOOOOL!!', W / 2, bot - 100, 120, '#facc15', t, hit + 6, 3, W * 0.86);
        this.finKicker(ctx, W / 2, bot - 30, 'NO ÂNGULO • DE PRIMEIRA', seg(t, hit + 40, hit + 80), YOU_C, 'center');
      }
      const flipped = t >= 66;
      this.wcfgScore(ctx, 28, top + 18, flipped ? 3 : 2, "90+5'", 1, flipped ? seg(t, 66, 86) : 0);
      this.cineSfx(S, hit, 'gol', () => window.SFX?.goal?.(true));
      this.cineSfx(S, 12, 'mergulho', () => window.SFX?.whoosh?.());
    },

    // PLANO 9 — o apito final: a Catedral explode e você, de costas, de braço erguido
    wcfgP9(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcfgCast();
      const k = easeIO(t / 200);
      const sc = lerp(0.86, 0.8, k);
      const cx = 960;
      const cy = lerp(560, 540, k);
      ctx.save();
      ctx.translate(W / 2, H / 2 + (t < 24 ? this.cineNoise(S.f * 2, 3) * 6 * (1 - t / 24) : 0));
      ctx.scale(sc, sc);
      ctx.translate(-cx, -cy);
      ctx.drawImage(this.wcfgCath(), 0, 0);
      const fw = [[300, 150, 2], [1500, 120, 14], [900, 90, 26], [600, 210, 40], [1700, 230, 54], [1200, 170, 68], [200, 260, 82], [1050, 110, 96], [700, 140, 112], [1600, 150, 128], [420, 120, 144], [1350, 220, 160]];
      fw.forEach(([x, y, at], i) => this.luckFirework(ctx, x, y, t - at, ['#facc15', YOU_C, '#f8fafc', '#ef4444', '#60a5fa'][i % 5], 26, 150 + (i % 3) * 40));
      for (let i = 0; i < 30; i++) {
        const per = 40 + rnd(i, 13) * 50;
        const ph = (t + rnd(i, 14) * per) % per;
        if (ph >= 6) continue;
        this.finSparkle(ctx, rnd(i, 15) * 1920, 360 + rnd(i, 16) * 260, 8 + rnd(i, 17) * 6, 1 - ph / 6);
      }
      ctx.restore();
      this.cineShafts(ctx, 160, top - 30, 1.0 + Math.sin(t * 0.03) * 0.3, 760, 0.18, 2, '191,219,254', 0.08, t);
      this.cineShafts(ctx, 1120, top - 30, 2.1 + Math.sin(t * 0.03 + 1) * 0.3, 760, 0.18, 2, '191,219,254', 0.08, t);
      // o time correndo até você; o Sae indo embora de costas; o Rin parado
      const g = bot - 70;
      this.wcfgSpr(ctx, c.rin, 930, g - 14, 168, { dim: 0.3, dimTint: '2,14,20', rim: RIN_C, rimSides: [-1] });
      this.wcfgSpr(ctx, c.sae, lerp(1060, 1110, k), g, 190, { facing: 'back', dim: 0.12, dimTint: '20,6,16', rim: SAE_C, rimSides: [-1] });
      this.wcfgSpr(ctx, c.gaga, lerp(40, 300, ease(t / 200)), g - 6, 180, { animState: 'run', frame: runF(S.f, 3) });
      this.wcfgSpr(ctx, c.shidou, lerp(120, 440, ease(t / 200)), g + 20, 220, { animState: 'run', frame: runF(S.f + 2, 3) });
      // você, pequeno diante da Catedral inteira, de costas para a câmera e de braço erguido
      this.cineGlow(ctx, W / 2, bot - 170, 230, 'rgba(0,245,212,0.4)', 1);
      const jump = Math.abs(Math.sin(t * 0.09)) * 10;
      this.wcfgShadow(ctx, W / 2, bot - 30, 70, 0.5);
      this.wcfgSpr(ctx, c.you, W / 2, bot - 34 - jump, 340, { facing: 'back', animState: 'call_pass', rim: YOU_C, rimSides: [-1, 1], rimD: 3 });
      this.drawConfetti(ctx, W, H, t + 200, 90);
      // letreiro
      const dk = seg(t, 30, 50);
      if (dk > 0) this.cineGradient(ctx, 0, top, W, 230, [[0, `rgba(1,3,11,${0.85 * dk})`], [0.75, `rgba(1,3,11,${0.4 * dk})`], [1, 'rgba(1,3,11,0)']]);
      // o placar final carimbado no céu da Catedral, com as bandeirinhas dos dois lados
      const st = this.rincStamp(ctx, '3 x 2', W / 2, top + 92, 132, '#f8fafc', t, 40, 4, W * 0.6);
      if (st) {
        const lk = ease(seg(t, 66, 90));
        ctx.fillStyle = YOU_C;
        ctx.fillRect(W / 2 - (st.w / 2 + 30) * lk, top + 92 + st.fs * 0.5, (st.w + 60) * lk, 5);
        const fl = ease(seg(t, 60, 76));
        [[-1, '#1d4ed8', '#f8fafc', 'JAPÃO'], [1, '#0b1d4d', '#ef4444', 'FRANÇA']].forEach(([sd, c0, c1, nm]) => {
          const x = W / 2 + sd * (st.w / 2 + 80);
          ctx.save();
          ctx.globalAlpha = fl;
          ctx.fillStyle = c0;
          ctx.fillRect(x - 34, top + 64, 68, 44);
          ctx.fillStyle = c1;
          if (sd < 0) {
            ctx.beginPath();
            ctx.arc(x, top + 86, 13, 0, TAU);
            ctx.fill();
          } else ctx.fillRect(x + 11, top + 64, 23, 44);
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 3;
          ctx.strokeRect(x - 34, top + 64, 68, 44);
          ctx.restore();
          this.finKicker(ctx, x, top + 128, nm, fl, sd < 0 ? '#60a5fa' : '#f87171', 'center');
        });
      }
      this.finKicker(ctx, W / 2, top + 176, 'FIM DE JOGO • O JAPÃO É CAMPEÃO DO MUNDO SUB-20', seg(t, 96, 140), '#facc15', 'center');
      this.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
    },

    // PLANO 10 — os quatro egos (e o Rin): uma página de mangá, um quadro para cada um
    wcfgP10(ctx, S) {
      const { W, H, t, top, bot } = S;
      const c = this.wcfgCast();
      ctx.fillStyle = '#03050c';
      ctx.fillRect(0, top, W, bot - top);
      this.finFillPat(ctx, 'tone', 0, top, W, bot - top, 1);
      const cxm = 640;
      const cym = 360;
      const g = 9;
      const head = (ch, x, y, size, eyes, glow) => {
        if (glow) this.cineGlow(ctx, x, y, size * 0.45, glow, 1);
        const r = this.wcfgHead(ctx, ch, x, y, size, eyes.spr || {});
        this.wcfgEyes(ctx, ch, x, y, r.u, eyes);
        return r;
      };
      // Sae (em cima, à esquerda)
      const kA = ease(seg(t, 0, 16));
      this.cinePanel(ctx, [[16, top + 14], [680 - g, top + 14], [cxm - g, cym - g], [16, cym + 12 - g]], () => {
        this.wcfgPanelBg(ctx, 0, top, 700, 290, '#1a0715', '#3b0a2a', '#f9a8d4', 330, top + 150, t * 0.002);
        head(c.sae, 330 + Math.sin(t * 0.01) * 4, top + 150, 780, { ring: '#5eead4', iris: '#0f766e', half: true, spr: { rim: SAE_C, rimSides: [1], rimD: 2 } }, 'rgba(249,168,212,0.3)');
        ctx.fillStyle = 'rgba(40,8,30,0.2)';
        ctx.fillRect(0, top, 700, 290);
      }, { dx: (1 - kA) * -700 });
      this.finKicker(ctx, 34, top + 40, 'SAE ITOSHI', seg(t, 10, 40), SAE_C);
      // Rin (em cima, à direita)
      const kB = ease(seg(t, 100, 116));
      if (kB > 0) {
        this.cinePanel(ctx, [[680 + g, top + 14], [W - 16, top + 14], [W - 16, cym - 12 - g], [cxm + g, cym - g]], () => {
          this.wcfgPanelBg(ctx, 620, top, 680, 290, '#021a1d', '#04343a', '#2dd4bf', 960, top + 150, -t * 0.003);
          head(c.rin, 960, top + 160, 780, { ring: RIN_C, iris: '#0f766e', angry: true, look: -1, spr: { rim: RIN_C, rimSides: [-1], rimD: 2, dim: 0.15, dimTint: '0,20,26' } }, 'rgba(34,211,238,0.3)');
          ctx.fillStyle = 'rgba(2,26,29,0.22)';
          ctx.fillRect(620, top, 680, 290);
        }, { dx: (1 - kB) * 700 });
        this.finKicker(ctx, W - 34, top + 40, 'RIN ITOSHI', seg(t, 108, 136), RIN_C, 'right');
      }
      // Loki (embaixo, à esquerda): ele chegou um instante tarde
      const kC = ease(seg(t, 188, 204));
      if (kC > 0) {
        this.cinePanel(ctx, [[16, cym + 12 + g], [cxm - g, cym + g], [600 - g, bot - 14], [16, bot - 14]], () => {
          this.wcfgPanelBg(ctx, 0, cym, 660, bot - cym, '#140f02', '#3f2e06', '#facc15', 320, cym + 130, t * 0.002);
          const r = head(c.loki, 320, cym + 128, 780, { ring: '#f0b429', iris: '#3b2a05', tiny: true, spr: { rim: LOKI_C, rimSides: [1], rimD: 2 } }, 'rgba(250,204,21,0.25)');
          this.wcfgSweat(ctx, 320 + 6.6 * r.u, cym + 128 - 1.4 * r.u, r.u, seg(t, 206, 260));
          this.wcfgSweat(ctx, 320 - 7.6 * r.u, cym + 128 - 0.6 * r.u, r.u, seg(t, 236, 300));
          ctx.fillStyle = 'rgba(30,20,0,0.2)';
          ctx.fillRect(0, cym, 660, bot - cym);
        }, { dy: (1 - kC) * 320 });
        this.finKicker(ctx, 34, bot - 36, 'JULIAN LOKI', seg(t, 198, 230), LOKI_C);
      }
      // Hugo (embaixo, à direita): calado
      const kD = ease(seg(t, 240, 256));
      if (kD > 0) {
        this.cinePanel(ctx, [[cxm + g, cym + g], [W - 16, cym - 12 + g], [W - 16, bot - 14], [600 + g, bot - 14]], () => {
          this.wcfgPanelBg(ctx, 580, cym - 20, 720, bot - cym + 20, '#1c0510', '#3f0a1c', '#fb7185', 960, cym + 130, -t * 0.002);
          head(c.hugo, 960, cym + 120, 780, { ring: '#fda4af', iris: '#3f0a1c', half: true, spr: { rim: HUGO_C, rimSides: [-1], rimD: 2, dim: 0.2, dimTint: '30,4,12' } }, 'rgba(251,113,133,0.22)');
          ctx.fillStyle = 'rgba(40,4,16,0.25)';
          ctx.fillRect(580, cym - 20, 720, bot - cym + 20);
        }, { dx: (1 - kD) * 700 });
        this.finKicker(ctx, W - 34, bot - 36, 'HUGO', seg(t, 250, 276), HUGO_C, 'right');
      }
      // no meio de todos eles: você
      const kE = ease(seg(t, 272, 288));
      if (kE > 0) {
        const s = lerp(1.6, 1, kE);
        ctx.save();
        ctx.translate(cxm, cym);
        ctx.scale(s, s);
        ctx.translate(-cxm, -cym);
        const R = 118;
        const pts = [[cxm, cym - R], [cxm + R * 1.55, cym], [cxm, cym + R], [cxm - R * 1.55, cym]];
        this.cinePanel(ctx, pts, () => {
          this.wcfgPanelBg(ctx, cxm - 200, cym - 130, 400, 260, '#021016', '#03323a', null);
          const dw = 340;
          const U = dw / 14;
          this.wcfgBand(ctx, c.you, cxm - dw / 2, cym - 3.1 * U, dw, { ring: YOU_C, iris: '#064e3b' });
          this.cineGlow(ctx, cxm, cym, 140, 'rgba(0,245,212,0.25)', 1);
        }, { border: YOU_C, width: 6 });
        ctx.restore();
        this.ptdRings(ctx, cxm, cym, seg(t, 272, 310), [YOU_C, '#ffffff'], 380, 0);
        if (t >= 272) this.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, 272, 282)));
      }
      this.cineFlash(ctx, W, H, seg(t, 312, 330), '#000000');
      this.cineSfx(S, 2, 'p1', () => window.SFX?.page?.());
      this.cineSfx(S, 100, 'p2', () => window.SFX?.page?.());
      this.cineSfx(S, 188, 'p3', () => window.SFX?.page?.());
      this.cineSfx(S, 240, 'p4', () => window.SFX?.page?.());
      this.cineSfx(S, 272, 'voce', () => window.SFX?.kick?.(0.7));
    }
  });

  CE.WCFG_PLANS = [CE.wcfgP1, CE.wcfgP2, CE.wcfgP3, CE.wcfgP4, CE.wcfgP5, CE.wcfgP6, CE.wcfgP7, CE.wcfgP8, CE.wcfgP9, CE.wcfgP10];

  // ==========================================================================
  // REGISTRO
  // ==========================================================================
  CE.registerCine('wc_final_goal', {
    phases: [210, 190, 214, 262, 190, 170, 170, 190, 200, 330],
    music: 'epic',
    title: '🏆 O GOL DOS QUATRO EGOS',
    tags: [
      "PLANO 1 • 90+5' — A CATEDRAL", 'PLANO 2 • O REI COM A BOLA', 'PLANO 3 • A ISCA', 'PLANO 4 • O PASSE QUE NINGUÉM VIU', 'PLANO 5 • VELOCIDADE DIVINA',
      'PLANO 6 • METAVISÃO', 'PLANO 7 • DESSA VEZ, O CHUTE', 'PLANO 8 • O ÂNGULO', 'PLANO 9 • O APITO FINAL', 'PLANO 10 • QUATRO EGOS'
    ],
    get subs() {
      const me = CE.cinePlayerName();
      return [
        [{ from: 14, who: 'NARRADOR', text: "90+5'. Japão 2 x 2 França.", color: NARR_C }],
        [{ from: 30, who: 'SAE ITOSHI', text: '(...Ali. Ninguém mais viu.)', color: SAE_C }],
        [
          { from: 4, to: 116, who: 'RIN ITOSHI', text: '"SAE! É MEU!"', color: '#2dd4bf' },
          { from: 116, who: 'HUGO', text: '"Te peguei."', color: HUGO_C }
        ],
        [
          { from: 16, to: 118, who: 'SAE ITOSHI', text: '"Receba."', color: SAE_C },
          { from: 118, who: me, text: '(Passar... ou chutar?)', color: YOU_C }
        ],
        [{ from: 20, who: 'JULIAN LOKI', text: '"Você não escapa de mim."', color: LOKI_C }],
        [{ from: 4, who: me, text: '(Eu já vi onde ela vai cair.)', color: YOU_C }],
        [{ from: 14, who: me, text: '(Dessa vez... eu chutei.)', color: YOU_C }],
        [{ from: 44, who: 'NARRADOR', text: 'GOOOOL DO JAPÃO!! 3 x 2!', color: '#facc15' }],
        [{ from: 36, who: 'NARRADOR', text: 'O JAPÃO É CAMPEÃO DO MUNDO!', color: '#facc15' }],
        [
          { from: 6, to: 108, who: 'SAE ITOSHI', text: '"Bom gol."', color: SAE_C },
          { from: 108, to: 196, who: 'RIN ITOSHI', text: '"Tch."', color: '#2dd4bf' },
          { from: 196, who: 'JULIAN LOKI', text: '"...Um instante."', color: LOKI_C }
        ]
      ];
    },
    draw(ctx, S) {
      this.WCFG_PLANS[S.phase]?.call(this, ctx, S);
      this.wcfgWarm(S);
    }
  });
})();
