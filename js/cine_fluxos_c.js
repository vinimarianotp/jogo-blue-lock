// ============================================================================
// FLUXOS COM CENA PRÓPRIA (cine_fluxos_c) — ver js/cine_kit.js
// Cada Fluxo abaixo tem a sua ativação (3 planos, ~6 s) tocada pelo [G] no meio da partida
// (CutsceneEngine.playFlowCutscene registra this.flowCfg = { flow, you, youName }):
//   flow_fl_epico_passe      • o Charles quer brincar: o passe faz curva, passa entre as pernas, INTOCÁVEL
//   flow_fl_lendario_kaiser  • a coroa do Imperador, a carga no máximo, o chute que o goleiro não vê
//   flow_fl_lendario_snuffy  • o tabuleiro do Snuffy encaixa, as skills recarregam 3x, sistema perfeito
// Você é o protagonista; o jogador que inspira o Fluxo aparece como o "espírito" do poder.
// Usa os helpers da cine_fluxos_b (fxbCfg, fxbSpr, fxbWarm, fxbTitle, fxbPitch, fxbArena...), da
// cine_partida (ptdEyes, ptdBall, ptdRays, ptdWord...) e da cine_fluxos_a (fxaBoltPts, fxaBolt).
// Helpers novos no CutsceneEngine com o prefixo "fxc".
// Regras: sem ctx.filter/shadowBlur, sem cópias fantasmas do boneco, sem tela piscando
// (um flash só por impacto), olhos de close em pixel art, frame 0 = preto (aquecimento).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine || !CE.fxbCfg) return;

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
  const rgbOf = (hex) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (m) return [1, 2, 3].map((i) => parseInt(m[i], 16));
    return [0, 245, 212];
  };
  const rgba = (hex, a) => `rgba(${rgbOf(hex).join(',')},${a})`;

  const KIT_RIVAL = { jerseyPrimary: '#7f1d1d', jerseySecondary: '#f8fafc' };
  const RUN = [3, 7, 11, 15];
  const AURA = [5, 9, 13];
  const runF = (t, sp = 4) => RUN[Math.floor(t / sp) % RUN.length];
  const auraF = (t) => AURA[Math.floor(t / 6) % AURA.length];

  const PAS_C = '#fb7185';
  const KZ_C = '#3b82f6';
  const SN_C = '#a855f7';

  // ==========================================================================
  // HELPERS COMUNS (prefixo fxc)
  // ==========================================================================
  Object.assign(CE, {
    // Desenho em pixel guardado pronto (linhas de texto, cada letra uma cor)
    fxcPixCv(key, rows, pal) {
      return this.fxbBg(`fxc|${key}`, rows[0].length, rows.length, (g) => this.fxbPix(g, rows, 0, 0, 1, pal));
    },
    // Canvas pequeno ampliado sem suavizar, centrado em (x, y), com altura h
    fxcBlit(ctx, cv, x, y, h, rot = 0, alpha = 1) {
      if (cv.width < 2 || h <= 0 || alpha <= 0) return;
      const s = h / cv.height;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha *= alpha;
      ctx.translate(Math.round(x), Math.round(y));
      if (rot) ctx.rotate(rot);
      ctx.drawImage(cv, (-cv.width * s) / 2, -h / 2, cv.width * s, h);
      ctx.restore();
    },
    // Pétala em pixel (rosa do Charles ou azul da rosa do Kaiser)
    fxcPetalCv(kind) {
      const pal = kind === 'blue' ? { a: '#1e3a8a', b: '#3b82f6', c: '#dbeafe' } : { a: '#9f1239', b: '#fb7185', c: '#ffe4e6' };
      return this.fxcPixCv(`petal|${kind}`, ['.aab..', 'abbbba', 'abbcca', '.aaa..'], pal);
    },
    fxcPetals(ctx, cv, W, top, bot, t, n, seed = 1, wind = 1.4, s = 4) {
      if (cv.width < 2) return;
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
        ctx.drawImage(cv, -3 * sc, -2 * sc, 6 * sc, 4 * sc);
        ctx.restore();
      }
      ctx.restore();
    },
    // Curva suave (Catmull-Rom) passando pelos pontos P; u vai de 0 a P.length - 1
    fxcCurve(P, u) {
      const n = P.length - 1;
      u = Math.max(0, Math.min(n, u));
      const i = Math.min(n - 1, Math.floor(u));
      const f = u - i;
      const p0 = P[Math.max(0, i - 1)];
      const p1 = P[i];
      const p2 = P[i + 1];
      const p3 = P[Math.min(n, i + 2)];
      const c = (a, b, d, e) => 0.5 * (2 * b + (-a + d) * f + (2 * a - 5 * b + 4 * d - e) * f * f + (-a + 3 * b - 3 * d + e) * f * f * f);
      return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
    },
    // Fita de luz seguindo a curva P até uB (k0 = começo), larga e com o miolo claro
    fxcRibbon(ctx, P, u0, u1, w, color, core = '#fff1f2', alpha = 1) {
      if (u1 <= u0 || alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const N = Math.max(2, Math.ceil((u1 - u0) * 14));
      for (let i = 0; i <= N; i++) {
        const [x, y] = this.fxcCurve(P, lerp(u0, u1, i / N));
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = w + 8;
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.strokeStyle = core;
      ctx.lineWidth = Math.max(2, w * 0.3);
      ctx.stroke();
      ctx.restore();
    },
    // Olhos acesos com brilho atrás (close)
    fxcEyes(ctx, char, cx, eyeY, u, color, iris, look = 0, k = 1) {
      if (k <= 0) return;
      [-1, 1].forEach((s) => this.cineGlow(ctx, cx + s * 3.5 * u, eyeY, u * 3.2, rgba(color, 0.6), k));
      this.ptdEyes(ctx, char, cx, eyeY, u, { ring: color, iris, look });
    }
  });

  // ==========================================================================
  // 1. PASSE PERFEITO (Charles) — o passe que ninguém toca
  // ==========================================================================
  // Câmera alta atrás da jogada (metros: X ao longo do campo, Y para o fundo)
  const PAS_CAM = { cx: 640, hy: 20, f: 1000, h: 20, d: 36 };
  // O caminho da bola: contorna o 1º, passa ENTRE AS PERNAS do 2º, foge do 3º e do 4º
  const PAS_PATH = [[-17, 0.6], [-12.5, -1.6], [-8, 1.2], [-3.4, 0.6], [0, -0.6], [3.8, -2.2], [8, 1.4], [12, 3.8], [17, 2.8]];
  const PAS_T0 = 26;
  const PAS_T1 = 142;
  const PAS_DEF = [
    { id: 'lorenzo', X: -8, Y: 4.6, u: 2 },
    { id: 'aiku', X: 0, Y: -0.6, u: 4, nut: true },
    { id: 'ness', X: 7.6, Y: 5.4, u: 6 },
    { id: 'grim', X: 11.2, Y: 0.4, u: 7 }
  ];

  Object.assign(CE, {
    fxcPasCast() {
      const c = this.fxbCfg('fl_epico_passe');
      const kit = this.fxbKit(c.you);
      return {
        c,
        charles: this.cineChar('charles'),
        mate: this.fxbMate('nagi', kit),
        defs: PAS_DEF.map((d) => Object.assign({ ch: this.fxbMate(d.id, KIT_RIVAL) }, d))
      };
    },

    // PLANO 1 — o Charles aparece rindo, fazendo embaixadinha, e os seus olhos acendem
    fxcPas0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxcPasCast();
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#12020b'], [0.55, '#3b0a24'], [1, '#12020b']]);
      ctx.save();
      const k = easeIO(t / 85);
      this.cineCamera(ctx, W, H, { x: lerp(640, 660, k), y: 360, zoom: lerp(1, 1.08, k), shake: 0.5 });
      this.ptdRays(ctx, 900, 300, W * 0.9, PAS_C, 0.14, t * 0.004, 40);
      this.cineGlow(ctx, 900, 320, 330, 'rgba(251,113,133,0.3)');
      this.fxcPetals(ctx, this.fxcPetalCv('pink'), W, top, bot, t, 22, 3, 1.2, 5);
      // o Charles surge (pulo de brinquedo), flutuando torto e equilibrando a bola na cabeça
      const ap = back(seg(t, 6, 22));
      if (ap > 0) {
        const size = 470 * ap;
        const feet = bot - 10 + Math.sin(t * 0.09) * 10;
        const rot = -0.16 + Math.sin(t * 0.05) * 0.06;
        const u = size / 36;
        ctx.save();
        ctx.translate(900, feet - size * 0.42);
        ctx.rotate(rot);
        this.fxbSpr(ctx, o.charles, 0, size * 0.42, size, { rim: PAS_C, rimD: 3 });
        const eyeY = size * 0.42 - size * 0.87 + SPRITE_MAPY(10) * u;
        if (t > 22) this.ptdEyes(ctx, o.charles, 0, eyeY, u, { ring: PAS_C, iris: '#881337', look: -1 });
        // a bola quicando na cabeça dele
        const hop = Math.abs(Math.sin(t * 0.13));
        this.ptdBall(ctx, 3 * u, eyeY - 13 * u - hop * 70, 24 * ap, t / 3, PAS_C);
        ctx.restore();
      }
      // você, em close à esquerda: os olhos acendem em rosa
      const yk = seg(t, 46, 56);
      const size = 600;
      const feet = bot + 230;
      const x = 330;
      this.fxbSpr(ctx, o.c.you, x, feet, size, yk > 0 ? { rim: PAS_C, rimD: 3 } : { rim: '#fda4af', rimD: 2, dim: 0.25, dimTint: '40,6,24' });
      const u = size / 36;
      this.fxcEyes(ctx, o.c.you, x, feet - size * 0.87 + SPRITE_MAPY(10) * u, u, PAS_C, '#881337', 1, yk);
      ctx.restore();
      // a risada dele, em pedaços
      [[24, 1130, top + 130, 0.12], [40, 700, top + 90, -0.1], [58, 1150, top + 250, 0.08]].forEach(([at, wx, wy, r], i) => {
        if (t < at || t > at + 26) return;
        this.ptdWord(ctx, i === 1 ? 'HEHEHE' : 'HEHE', wx, wy, 44 - i * 4, '#fecdd3', seg(t, at, at + 6), 1 - seg(t, at + 18, at + 26), r);
      });
      this.finKicker(ctx, 40, top + 34, 'O CHARLES QUER BRINCAR', seg(t, 4, 40), PAS_C);
      this.fxbSfx(S, 8, 'pop', () => window.SFX?.blip(784));
      this.fxbSfx(S, 46, 'olhos', () => window.SFX?.whoosh());
    },

    // PLANO 2 — o passe: a curva prevista, a bola fazendo curva entre os quatro, ninguém toca
    fxcPas1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxcPasCast();
      const n = PAS_PATH.length - 1;
      const uB = n * seg(t, PAS_T0, PAS_T1);
      const tOf = (u) => PAS_T0 + (u / n) * (PAS_T1 - PAS_T0);
      const cam = Object.assign({}, PAS_CAM, { x0: lerp(-6, 6, easeIO(seg(t, 16, 150))) });
      const lift = (u) => 0.9 * Math.abs(Math.sin((u * Math.PI) / 2));
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: 1.04, shake: 0.5 });
      this.fxbPitch(ctx, 'night', W, H, cam);
      ctx.fillStyle = 'rgba(59,7,36,0.25)';
      ctx.fillRect(-60, -60, W + 120, H + 120);
      // a curva prevista (pontilhada), desenhada antes do toque
      const pk = ease(seg(t, 4, 24));
      const pa = 0.8 * (1 - seg(t, PAS_T1, PAS_T1 + 24));
      if (pk > 0 && pa > 0) {
        ctx.save();
        ctx.globalAlpha = pa;
        ctx.strokeStyle = PAS_C;
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 10]);
        ctx.lineDashOffset = -t * 1.5;
        ctx.beginPath();
        const N = 72;
        for (let i = 0; i <= N * pk; i++) {
          const [X, Y] = this.fxcCurve(PAS_PATH, (i / N) * n);
          const [sx, sy] = this.fxbProj(cam, X, Y);
          if (i) ctx.lineTo(sx, sy);
          else ctx.moveTo(sx, sy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      // quem está em campo (do fundo para a frente)
      const list = [];
      o.defs.forEach((d) => {
        const tr = tOf(d.u);
        const [PX, PY] = this.fxcCurve(PAS_PATH, d.u);
        // (quem tentou o carrinho fica no chão)
        const lunge = d.nut ? 0 : seg(t, tr - 16, tr - 4);
        list.push({ ch: d.ch, X: lerp(d.X, PX, 0.22 * lunge), Y: lerp(d.Y, PY, 0.4 * lunge), opt: lunge > 0.35 ? { animState: 'slide', flipX: true } : { flipX: true }, d, tr });
      });
      const youAnim = t > 8 && t < PAS_T0 - 2 ? 'windup' : t >= PAS_T0 - 2 && t < PAS_T0 + 14 ? 'shoot' : 'idle';
      list.push({ ch: o.c.you, X: -18.4, Y: 0.9, opt: { animState: youAnim, rim: PAS_C, rimD: 2 }, you: true });
      list.push({ ch: o.mate, X: 17.8, Y: 3.1, opt: { animState: t < PAS_T1 ? 'call_pass' : 'idle', flipX: true }, mate: true });
      // a bola: no seu pé, voando pela curva, parada no pé do companheiro
      let bX;
      let bY;
      let bZ = 0;
      if (t < PAS_T0) [bX, bY] = PAS_PATH[0];
      else if (t >= PAS_T1) [bX, bY] = PAS_PATH[n];
      else {
        [bX, bY] = this.fxcCurve(PAS_PATH, uB);
        bZ = lift(uB);
      }
      list.push({ ball: true, X: bX, Y: bY - 0.05 });
      list.sort((a, b) => b.Y - a.Y);
      const tops = new Map();
      list.forEach((p) => {
        if (p.ball) {
          // o rastro: um risco rosa que afina (não é cópia da bola)
          if (t >= PAS_T0 && t < PAS_T1 + 6) {
            const pts = [];
            for (let i = 0; i <= 14; i++) {
              const u = Math.max(0, Math.min(uB, n) - i * 0.11);
              const [X, Y] = this.fxcCurve(PAS_PATH, u);
              const [sx, sy, kk] = this.fxbProj(cam, X, Y);
              pts.push({ x: sx, y: sy - lift(u) * kk });
            }
            this.ptdStreak(ctx, pts, PAS_C, 18, 0.9 * (1 - seg(t, PAS_T1, PAS_T1 + 6)));
          }
          const [sx, sy, kk] = this.fxbProj(cam, p.X, p.Y);
          this.fxbShadow(ctx, sx, sy + 2, kk * 0.4, 0.4);
          this.ptdBall(ctx, sx, sy - bZ * kk - kk * 0.36, Math.max(8, kk * 0.4), t >= PAS_T0 && t < PAS_T1 ? t / 2 : 0, t >= PAS_T0 ? PAS_C : null);
          return;
        }
        const [sx, sy, kk] = this.fxbProj(cam, p.X, p.Y);
        this.fxbShadow(ctx, sx, sy, kk * 1.1, 0.45);
        const r = this.fxbOnPitch(ctx, cam, p.ch, p.X, p.Y, p.opt, 4.6);
        tops.set(p, r);
        if (p.you) this.cineGlow(ctx, r.x, r.y - r.size * 0.4, r.size * 0.8, 'rgba(251,113,133,0.3)');
      });
      // reações: OLÉ em quem tentou, ENTRE AS PERNAS no do meio
      let tries = 0;
      list.forEach((p) => {
        if (!p.d) return;
        const r = tops.get(p);
        if (!r) return;
        const tr = p.tr;
        if (t >= tr) tries++;
        if (p.d.nut) {
          if (t >= tr - 2 && t < tr + 44) this.ptdChip(ctx, 'ENTRE AS PERNAS!', r.x, r.top - 34, PAS_C, seg(t, tr - 2, tr + 8), { size: 15 });
        } else if (t >= tr && t < tr + 30) {
          this.ptdWord(ctx, 'OLÉ!', r.x + 10, r.top - 26, 40, '#fecdd3', seg(t, tr, tr + 6), 1 - seg(t, tr + 20, tr + 30), p.d.u % 2 ? 0.1 : -0.1);
        }
      });
      // a bola chega: o companheiro domina
      const mate = list.find((p) => p.mate);
      const mr = tops.get(mate);
      if (mr && t >= PAS_T1) {
        this.ptdRings(ctx, mr.x, mr.y, seg(t, PAS_T1, PAS_T1 + 30), ['#ffffff', PAS_C], 170, 0);
        if (t < PAS_T1 + 40) this.ptdChip(ctx, 'NO PÉ!', mr.x, mr.top - 34, PAS_C, seg(t, PAS_T1, PAS_T1 + 8), { size: 15 });
      }
      ctx.restore();
      // HUD: ninguém interceptou
      ctx.save();
      ctx.font = '900 15px monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.globalAlpha = seg(t, 20, 34);
      const txt = `TENTATIVAS: ${tries}   INTERCEPTAÇÕES: 0`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(2,6,23,0.9)';
      ctx.strokeText(txt, 40, bot - 26);
      ctx.fillStyle = '#fecdd3';
      ctx.fillText(txt, 40, bot - 26);
      ctx.restore();
      this.finKicker(ctx, 40, top + 34, 'O PASSE QUE NINGUÉM TOCA', seg(t, 4, 40), PAS_C);
      // painel: o Charles rindo
      const pk2 = ease(seg(t, 50, 66));
      if (pk2 > 0) {
        const pts = [[W - 400, top + 14], [W - 16, top + 8], [W - 16, top + 204], [W - 420, top + 210]];
        this.ptdPanel(
          ctx,
          pts,
          () => {
            ctx.fillStyle = '#1a0510';
            ctx.fillRect(W - 440, top, 440, 220);
            this.ptdRays(ctx, W - 210, top + 110, 380, PAS_C, 0.3, t * 0.004, 44);
            const dw = 400;
            const ux0 = 5;
            const uy0 = 1.4;
            const U = dw / 26;
            const dx = W - 216 - dw / 2;
            const dy = top + 10;
            this.fxbCrop(ctx, o.charles, {}, ux0, uy0, 26, 12.6, dx, dy, dw, U * 12.6);
            if (t > 60) this.ptdEyes(ctx, o.charles, dx + (18 - ux0) * U, dy + (10 - uy0) * U, U, { ring: PAS_C, iris: '#881337', look: -1 });
            this.finKicker(ctx, W - 40, top + 186, 'CHARLES', seg(t, 60, 76), PAS_C, 'right');
          },
          { dx: (1 - pk2) * 460 }
        );
      }
      this.fxbSfx(S, PAS_T0, 'toque', () => window.SFX?.kick?.(0.6));
      PAS_DEF.forEach((d, i) => this.fxbSfx(S, Math.round(tOf(d.u)), 'ole' + i, () => window.SFX?.blip(523 + i * 120)));
      this.fxbSfx(S, PAS_T1, 'chega', () => window.SFX?.blip(1047));
    },

    // PLANO 3 — INTOCÁVEL: a fita do passe atravessa a tela e acerta o alvo em cheio
    fxcPas2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxcPasCast();
      const hit = 26;
      const R = [[120, 600], [330, 300], [540, 540], [660, 250], [800, 470], [910, 300]];
      const n = R.length - 1;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#12020b'], [0.5, '#4a0d2c'], [1, '#12020b']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.02 + easeIO(t / 90) * 0.05, shake: 0.6 + (t >= hit ? 8 * (1 - seg(t, hit, hit + 24)) : 0) });
      this.ptdRays(ctx, 910, 300, W * 1.1, PAS_C, 0.16, t * 0.003, 44);
      this.fxcPetals(ctx, this.fxcPetalCv('pink'), W, top, bot, t + 200, 18, 7, 1.6, 6);
      // o Charles, o dono do brinquedo, ao lado do alvo
      const cs = 400;
      const cFeet = bot + 70;
      const cu = cs / 36;
      this.cineGlow(ctx, 1130, bot - 190, 280, 'rgba(251,113,133,0.3)');
      this.fxbSpr(ctx, o.charles, 1130, cFeet, cs, { flipX: true, rim: PAS_C, rimD: 3, dim: 0.18, dimTint: '60,8,30' });
      this.ptdEyes(ctx, o.charles, 1130, cFeet - cs * 0.87 + SPRITE_MAPY(10) * cu, cu, { ring: PAS_C, iris: '#881337', look: -1 });
      // o alvo
      const [tx, ty] = R[n];
      const pulse = Math.sin(t * 0.2) * 4;
      [70, 48, 26].forEach((r, i) => {
        ctx.strokeStyle = i % 2 ? '#ffe4e6' : PAS_C;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(tx, ty, r + pulse, (r + pulse) * 0.62, 0, 0, TAU);
        ctx.stroke();
      });
      // a fita (o caminho da bola) e a bola na ponta
      const uB = n * easeIO(seg(t, 0, hit));
      this.fxcRibbon(ctx, R, 0, uB, 20, PAS_C, '#fff1f2', 1 - seg(t, hit + 30, hit + 60) * 0.5);
      const [bx, by] = this.fxcCurve(R, uB);
      this.ptdBall(ctx, bx, by, 30, t < hit ? t / 2 : 0, PAS_C);
      if (t >= hit) {
        this.ptdRings(ctx, tx, ty, seg(t, hit, hit + 30), ['#ffffff', PAS_C, '#9f1239'], 380, 0);
        this.fxbSparks(ctx, tx, ty, seg(t, hit, hit + 30), 24, ['#ffe4e6', PAS_C, '#ffffff'], 1, 9);
      }
      // você em primeiro plano
      const size = 620;
      const feet = bot + 250;
      this.fxbSpr(ctx, o.c.you, 250, feet, size, { rim: PAS_C, rimD: 3 });
      const u = size / 36;
      this.fxcEyes(ctx, o.c.you, 250, feet - size * 0.87 + SPRITE_MAPY(10) * u, u, PAS_C, '#881337', 1);
      ctx.restore();
      if (t >= hit) {
        this.ptdWord(ctx, 'INTOCÁVEL!', W * 0.62, top + 100, 110, '#ffe4e6', seg(t, hit, hit + 8), 1 - seg(t, hit + 22, hit + 32), -0.06);
        this.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, hit, hit + 9)), '#ffe4e6');
      }
      this.fxbTitle(ctx, S, t - (hit + 24), { cfg: o.c, x: W * 0.6, y: top + 150, color: PAS_C, maxW: W * 0.74 });
      this.fxbSfx(S, 2, 'fita', () => window.SFX?.whoosh());
      this.fxbSfx(S, hit, 'alvo', () => window.SFX?.kick?.(1));
    }
  });

  // ==========================================================================
  // 2. KAISER IMPACT (Kaiser) — a coroa, a carga no máximo, o chute que ninguém vê
  // ==========================================================================
  const CROWN = [
    '......o......',
    '.o...oyo...o.',
    'oyo..oyo..oyo',
    'oyyo.oyo.oyyo',
    'oyyyoyyyoyyyo',
    'oyyyyyyyyyyyo',
    'oyhyybbbyyhyo',
    'oyyybbwbbyyyo',
    'oyyyybbbyyyyo',
    'ossssssssssso',
    'ooooooooooooo'
  ];
  const KZ_KICK = 118;
  const KZ_GROUND = 600;

  Object.assign(CE, {
    fxcKzCast() {
      const c = this.fxbCfg('fl_lendario_kaiser');
      return {
        c,
        kaiser: this.cineChar('kaiser'),
        gk: this.cineChar('gagamaru', { jerseyPrimary: '#14532d', jerseySecondary: '#f8fafc' })
      };
    },
    fxcCrownCv() {
      return this.fxcPixCv('crown', CROWN, { o: '#0b1029', y: '#facc15', h: '#fef08a', s: '#a16207', b: '#2563eb', w: '#bfdbfe' });
    },
    // A coroa em cima da cabeça de quem está com o sprite (cx, topo do boneco, u = px por unidade)
    fxcCrown(ctx, cx, spriteTop, u, dy = 0, alpha = 1, rot = 0) {
      const w = 12 * u;
      const h = (w * CROWN.length) / CROWN[0].length;
      this.fxcBlit(ctx, this.fxcCrownCv(), cx, spriteTop + SPRITE_MAPY(-1.6) * u + dy, h, rot, alpha);
      return { y: spriteTop + SPRITE_MAPY(-1.6) * u + dy, h };
    },
    // Rosa azul em pixel (32 x 40): o botão em camadas (pétalas de trás, a abertura em espiral,
    // as laterais e a pétala da frente com a borda clara), o caule e duas folhas
    fxcRoseCv() {
      return this.fxbBg('fxcRose', 32, 40, (g) => {
        const CW = 32;
        const CH = 40;
        const P = { o: '#050a1f', d: '#1e3a8a', b: '#2563eb', m: '#3b82f6', l: '#93c5fd', w: '#dbeafe', g: '#15803d', G: '#4ade80', s: '#14532d' };
        const grid = new Array(CW * CH).fill(null);
        // cada camada pinta por cima da anterior; a borda da camada sai num tom escuro
        const layer = (inside, shade, edge) => {
          const mine = new Set();
          for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (inside(x + 0.5, y + 0.5)) mine.add(y * CW + x);
          mine.forEach((i) => {
            const x = i % CW;
            const y = (i - x) / CW;
            const e = !mine.has(i - 1) || !mine.has(i + 1) || !mine.has(i - CW) || !mine.has(i + CW) || x === 0 || x === CW - 1;
            grid[i] = e ? edge : shade(x + 0.5, y + 0.5);
          });
        };
        const ell = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
        const leaf = (cx, cy, rx, ry, a) => (x, y) => {
          const u = (x - cx) * Math.cos(a) + (y - cy) * Math.sin(a);
          const v = -(x - cx) * Math.sin(a) + (y - cy) * Math.cos(a);
          return (u / rx) ** 2 + (v / ry) ** 2 <= 1;
        };
        const leafShade = (cx, cy, a) => (x, y) => {
          const v = -(x - cx) * Math.sin(a) + (y - cy) * Math.cos(a);
          return Math.abs(v) < 0.5 ? 's' : v < 0 ? 'G' : 'g';
        };
        layer((x, y) => x > 14.6 && x < 17.6 && y > 20 && y < 40, (x) => (x < 16 ? 'G' : 'g'), 's');
        layer(leaf(10.4, 29.4, 6.4, 2.8, 0.43), leafShade(10.4, 29.4, 0.43), 's');
        layer(leaf(21.8, 32.2, 6, 2.6, -0.43), leafShade(21.8, 32.2, -0.43), 's');
        // pétalas de trás
        layer((x, y) => ell(16, 9.4, 11, 7.2)(x, y) && y > 2.6 + Math.abs(Math.sin((x - 16) * 0.55)) * 1.6, (x, y) => (y < 6 ? 'l' : 'm'), 'd');
        // a abertura em espiral
        layer(ell(16, 9.6, 7.4, 4.4), (x, y) => {
          const dx = (x - 16) / 7.4;
          const dy = (y - 9.6) / 4.4;
          const r = Math.hypot(dx, dy);
          const v = mod(Math.atan2(dy, dx) / TAU + r * 1.3, 1);
          return r < 0.22 ? 'o' : v < 0.3 ? 'l' : v < 0.55 ? 'd' : 'b';
        }, 'o');
        // as pétalas dos lados
        layer(ell(8.2, 16, 6, 8), (x) => (x < 5.6 ? 'm' : 'b'), 'd');
        layer(ell(23.8, 16, 6, 8), (x) => (x > 26.4 ? 'd' : 'b'), 'd');
        // a pétala da frente (a borda de cima faz uma onda: mais baixa no meio)
        const rim = (x) => 10.8 + 4.4 * (1 - ((x - 16) / 11) ** 2);
        layer(
          (x, y) => ell(16, 14.4, 11, 9.8)(x, y) && y >= rim(x),
          (x, y) => (y < rim(x) + 1.3 ? (x < 15 ? 'w' : 'l') : y > 21 ? 'b' : x < 12 ? 'l' : x > 21 ? 'b' : 'm'),
          'd'
        );
        // contorno de fora
        const out = grid.slice();
        for (let i = 0; i < grid.length; i++) {
          if (grid[i]) continue;
          const x = i % CW;
          if ((x > 0 && grid[i - 1]) || (x < CW - 1 && grid[i + 1]) || grid[i - CW] || grid[i + CW]) out[i] = 'o';
        }
        out.forEach((k, i) => {
          if (!k) return;
          g.fillStyle = P[k];
          g.fillRect(i % CW, Math.floor(i / CW), 1, 1);
        });
      });
    },
    // Gol visto de lado (a boca virada para a esquerda); bulge estufa a rede em volta de (bx, by)
    fxcSideGoal(ctx, gx, gy, bulge = 0, bx = 0, by = 0) {
      const H = 270;
      const D = 120;
      const top = gy - H;
      const P = (i, j) => {
        const kj = j / 6;
        const ki = i / 8;
        let x = gx + D * kj * lerp(0.75, 1, ki);
        const y = lerp(top + kj * 30, gy, ki);
        if (bulge > 0) {
          const d2 = (x - bx) * (x - bx) + (y - by) * (y - by);
          x += bulge * 46 * Math.exp(-d2 / 5000);
        }
        return [x, y];
      };
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,23,0.4)';
      ctx.beginPath();
      [P(0, 0), P(0, 6), P(8, 6), P(8, 0)].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.fill();
      ctx.strokeStyle = 'rgba(226,232,240,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        for (let j = 0; j <= 6; j++) {
          const [x, y] = P(i, j);
          if (j) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
      }
      for (let j = 1; j <= 6; j++) {
        for (let i = 0; i <= 8; i++) {
          const [x, y] = P(i, j);
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
      // a trave (por cima da rede)
      ctx.fillStyle = '#020617';
      ctx.fillRect(gx - 8, top - 4, 16, H + 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(gx - 5, top - 1, 10, H);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(gx + 1, top - 1, 4, H);
      ctx.restore();
    },

    // PLANO 1 — o Imperador aparece atrás de você e a coroa desce na sua cabeça
    fxcKz0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxcKzCast();
      const LAND = 46;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#01030f'], [0.55, '#0b1a4a'], [1, '#020617']]);
      ctx.save();
      const k = easeIO(t / 85);
      this.cineCamera(ctx, W, H, { x: 640, y: lerp(370, 350, k), zoom: lerp(1, 1.07, k), shake: 0.5 + (t >= LAND ? 4 * (1 - seg(t, LAND, LAND + 18)) : 0) });
      this.ptdRays(ctx, 900, 260, W, KZ_C, 0.12, -t * 0.003, 36);
      // o Kaiser (o espírito do poder), saindo do escuro atrás de você
      const ka = seg(t, 0, 24);
      this.cineGlow(ctx, 900, 320, 400, 'rgba(59,130,246,0.32)', ka);
      const ks = 620;
      const kFeet = bot + 250;
      const kx = 930;
      this.fxbSpr(ctx, o.kaiser, kx, kFeet, ks, { rim: KZ_C, rimD: 3, dim: 0.16, dimTint: '2,8,40', alpha: ka });
      const ku = ks / 36;
      if (t > 20) this.fxcEyes(ctx, o.kaiser, kx, kFeet - ks * 0.87 + SPRITE_MAPY(10) * ku, ku, KZ_C, '#1e3a8a', -1, seg(t, 20, 30));
      // rosas azuis abrindo nos cantos (o caule sai por baixo da tela)
      [[100, bot - 40, 250, 10], [1200, bot - 20, 230, 18]].forEach(([x, y, h, at]) => {
        this.fxcBlit(ctx, this.fxcRoseCv(), x, y, h * back(seg(t, at, at + 16)));
      });
      this.fxcPetals(ctx, this.fxcPetalCv('blue'), W, top, bot, t, 26, 5, -1.1, 5);
      // você na frente; a coroa desce e encaixa
      const size = 640;
      const feet = bot + 260;
      const x = 360;
      const on = t >= LAND;
      this.fxbSpr(ctx, o.c.you, x, feet, size, on ? { rim: KZ_C, rimD: 3 } : { rim: '#93c5fd', rimD: 2, dim: 0.3, dimTint: '2,8,40' });
      const u = size / 36;
      const sTop = feet - size * 0.87;
      const drop = on ? -Math.sin(seg(t, LAND, LAND + 10) * Math.PI) * 10 : -(1 - easeIn(seg(t, 14, LAND))) * 420;
      const cr = this.fxcCrown(ctx, x, sTop, u, drop, seg(t, 12, 20), on ? 0 : Math.sin(t * 0.15) * 0.05);
      if (on) {
        this.ptdRings(ctx, x, cr.y + cr.h * 0.3, seg(t, LAND, LAND + 26), ['#fef08a', KZ_C], 260, 0);
        this.cineGlow(ctx, x, cr.y, 160, 'rgba(250,204,21,0.45)', 1 - seg(t, LAND, LAND + 30) * 0.6);
      }
      this.fxcEyes(ctx, o.c.you, x, sTop + SPRITE_MAPY(10) * u, u, KZ_C, '#1e3a8a', 1, seg(t, LAND + 8, LAND + 16));
      ctx.restore();
      this.finKicker(ctx, 40, top + 34, 'O IMPERADOR EMPRESTA A COROA', seg(t, 4, 40), KZ_C);
      this.fxbSfx(S, 4, 'entra', () => window.SFX?.whoosh());
      this.fxbSfx(S, LAND, 'coroa', () => window.SFX?.jingle?.([784, 1175], 0, 'triangle'));
    },

    // PLANO 2 — de lado: a carga enche até o máximo, o chute sai e entra antes do goleiro pular
    fxcKz1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxcKzCast();
      const KICK = KZ_KICK;
      const hitK = t >= KICK;
      const pan = Math.min(t, KICK - 20) * 7;
      ctx.save();
      const shake = hitK ? 10 * (1 - seg(t, KICK, KICK + 26)) + 0.5 : 0.5 + seg(t, 70, KICK) * 2;
      this.cineCamera(ctx, W, H, { x: 640, y: 380, zoom: 1 + seg(t, 70, KICK) * 0.05 - seg(t, KICK, KICK + 30) * 0.03, shake });
      this.fxbArena(ctx, S, pan);
      if (t < KICK - 20) this.ptdSpeed(ctx, S, t, '#bfdbfe', 0.16, 1, 30, 18, 400, 640, 5);
      const gx = lerp(1500, 1060, easeIO(seg(t, 24, KICK - 20)));
      const G = KZ_GROUND;
      // o alvo: a gaveta, lá em cima
      const tx = gx + 56;
      const ty = G - 236;
      const bulge = hitK ? seg(t, KICK, KICK + 5) * (1 - 0.7 * seg(t, KICK + 10, KICK + 60)) : 0;
      this.fxcSideGoal(ctx, gx, G, bulge, tx, ty);
      // o goleiro: só pula quando a bola já entrou
      const dk = easeIO(seg(t, KICK + 12, KICK + 34));
      this.fxbShadow(ctx, gx - 40, G, 40, 0.4);
      this.fxbSpr(ctx, o.gk, gx - 40 - dk * 40, G - dk * 70, 240, dk > 0 ? { animState: 'dive', flipX: true } : { flipX: true });
      // você correndo com a bola, a carga, o chute
      const x = 330;
      const size = 240;
      const anim = t < KICK - 26 ? 'run' : t < KICK ? 'windup' : t < KICK + 22 ? 'shoot' : 'idle';
      const aura = t > 60;
      this.fxbShadow(ctx, x, G, 46, 0.45);
      this.fxbSpr(ctx, o.c.you, x, G, size, Object.assign({ animState: anim, frame: anim === 'run' ? runF(t) : aura ? auraF(t) : 45, rim: KZ_C, rimD: 2 }, aura ? { showAura: true, auraColor: KZ_C } : {}));
      const u = size / 36;
      this.fxcCrown(ctx, x, G - size * 0.87, u, anim === 'run' ? -Math.abs(Math.sin(t * 0.4)) * 4 : 0);
      const bx0 = x + 46;
      const by0 = G - 10;
      if (!hitK) {
        const hop = anim === 'run' ? Math.abs(Math.sin(t * 0.3)) * 10 : 0;
        this.ptdBall(ctx, bx0 + Math.sin(t * 0.3) * 6, by0 - hop, 11, t / 3, aura ? KZ_C : null);
      } else {
        // o raio azul: do pé até a gaveta, num quadro só
        const fade = 1 - seg(t, KICK + 4, KICK + 34);
        if (fade > 0) {
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.strokeStyle = 'rgba(59,130,246,0.55)';
          ctx.lineWidth = 34 * fade + 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(bx0, by0);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.restore();
          this.fxaBolt(ctx, this.fxaBoltPts(bx0, by0, tx, ty, 7, 10, 0.05), KZ_C, '#ffffff', 10 * fade + 2, 0.4 * fade);
          this.ptdRings(ctx, bx0, by0, seg(t, KICK, KICK + 24), ['#ffffff', KZ_C], 200, 0);
        }
        this.ptdBall(ctx, tx + bulge * 30, ty, 11, 0, KZ_C);
        this.fxbSparks(ctx, tx, ty, seg(t, KICK, KICK + 26), 20, ['#dbeafe', KZ_C, '#ffffff'], 0.7, 4);
      }
      ctx.restore();
      // a barra de carga do chute (o Fluxo: chute carregado até o fim)
      const ck = seg(t, 20, KICK - 10);
      const ca = seg(t, 14, 24) * (1 - seg(t, KICK, KICK + 12));
      if (ca > 0) {
        const bw = 420;
        const bx = W / 2 - bw / 2;
        const by = top + 56;
        ctx.save();
        ctx.globalAlpha = ca;
        ctx.fillStyle = '#020617';
        ctx.fillRect(bx - 4, by - 4, bw + 8, 26);
        ctx.fillStyle = '#0b1736';
        ctx.fillRect(bx, by, bw, 18);
        const full = ck >= 1;
        ctx.fillStyle = full ? (Math.floor(t / 8) % 2 ? '#93c5fd' : KZ_C) : KZ_C;
        ctx.fillRect(bx, by, Math.round(bw * ck), 18);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(bx, by, Math.round(bw * ck), 4);
        for (let i = 1; i < 10; i++) {
          ctx.fillStyle = '#020617';
          ctx.fillRect(bx + (bw * i) / 10 - 1, by, 2, 18);
        }
        ctx.font = '900 15px "Segoe UI", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(2,6,23,0.9)';
        const label = full ? 'CARGA MÁXIMA!' : `CARGA DO CHUTE ${Math.round(ck * 100)}%`;
        ctx.strokeText(label, W / 2, by + 40);
        ctx.fillStyle = full ? '#dbeafe' : '#e2e8f0';
        ctx.fillText(label, W / 2, by + 40);
        ctx.restore();
      }
      if (hitK) {
        this.ptdWord(ctx, 'IMPACTO!', 690, top + 200, 96, '#dbeafe', seg(t, KICK, KICK + 8), 1 - seg(t, KICK + 26, KICK + 36), -0.06);
        this.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, KICK, KICK + 8)), '#dbeafe');
        if (t >= KICK + 16) this.ptdChip(ctx, 'O GOLEIRO PULOU TARDE DEMAIS', 700, bot - 56, KZ_C, seg(t, KICK + 16, KICK + 26), { size: 15 });
      }
      // painel: o Kaiser (o espírito do poder), com a coroa de cabelo
      const pk = ease(seg(t, 30, 46)) * (1 - seg(t, KICK - 6, KICK + 4));
      if (pk > 0) {
        const pts = [[24, top + 16], [340, top + 10], [330, top + 300], [24, top + 306]];
        this.ptdPanel(
          ctx,
          pts,
          () => {
            ctx.fillStyle = '#020a24';
            ctx.fillRect(0, top, 360, 320);
            this.ptdRays(ctx, 180, top + 180, 340, KZ_C, 0.3, t * 0.004, 36);
            const ux0 = 5;
            const uy0 = -7.4;
            const uw = 26;
            const dw = 316;
            const U = dw / uw;
            const dx = 24;
            const dy = top + 12;
            this.fxbCrop(ctx, o.kaiser, {}, ux0, uy0, uw, 24, dx, dy, dw, U * 24);
            if (t > 40) this.ptdEyes(ctx, o.kaiser, dx + (18 - ux0) * U, dy + (10 - uy0) * U, U, { ring: KZ_C, iris: '#1e3a8a', look: 1 });
            this.finKicker(ctx, 40, top + 284, 'KAISER', seg(t, 40, 56), KZ_C);
          },
          { dx: -(1 - pk) * 380 }
        );
      }
      this.finKicker(ctx, W - 40, top + 34, 'O CHUTE MAIS RÁPIDO DO MUNDO', seg(t, 4, 40), KZ_C, 'right');
      this.fxbSfx(S, KICK - 26, 'carga', () => window.SFX?.whoosh());
      this.fxbSfx(S, KICK, 'chute', () => window.SFX?.kick?.(1));
      this.fxbSfx(S, KICK + 4, 'rede', () => window.SFX?.goal?.(true));
    },

    // PLANO 3 — a rosa azul gigante abre, o raio corta a tela: KAISER IMPACT
    fxcKz2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxcKzCast();
      const hit = 8;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#01030f'], [0.5, '#0a1a52'], [1, '#01030f']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.04 - easeIO(t / 90) * 0.03, shake: t >= hit ? 9 * (1 - seg(t, hit, hit + 26)) + 0.5 : 0.5 });
      this.ptdRays(ctx, 640, 330, W * 1.2, KZ_C, 0.18, t * 0.003, 48);
      const rk = back(seg(t, 0, 20));
      this.cineGlow(ctx, 330, 300, 400, 'rgba(59,130,246,0.4)', rk);
      this.fxcBlit(ctx, this.fxcRoseCv(), 330, 420, 600 * rk);
      // o Kaiser, o dono da coroa, de lado
      const ks = 470;
      const kFeet = bot + 120;
      const ku = ks / 36;
      this.fxbSpr(ctx, o.kaiser, 1090, kFeet, ks, { flipX: true, rim: KZ_C, rimD: 3, dim: 0.3, dimTint: '2,8,40' });
      this.ptdEyes(ctx, o.kaiser, 1090, kFeet - ks * 0.87 + SPRITE_MAPY(10) * ku, ku, { ring: KZ_C, iris: '#1e3a8a', look: -1 });
      // pétalas estourando para fora da rosa
      if (t >= hit) {
        const cv = this.fxcPetalCv('blue');
        if (cv.width > 1) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          for (let i = 0; i < 30; i++) {
            const a = rnd(i, 61) * TAU;
            const d = (t - hit) * (6 + rnd(i, 62) * 8);
            if (d > 900) continue;
            const s = 5 + rnd(i, 63) * 4;
            ctx.save();
            ctx.globalAlpha = 1 - seg(t, hit + 40, hit + 70);
            ctx.translate(330 + Math.cos(a) * d, 300 + Math.sin(a) * d * 0.8);
            ctx.rotate(t * 0.1 + i);
            ctx.drawImage(cv, -3 * s, -2 * s, 6 * s, 4 * s);
            ctx.restore();
          }
          ctx.restore();
        }
        // o raio do chute cruzando a tela
        const f = 1 - seg(t, hit + 4, hit + 30);
        if (f > 0) this.fxaBolt(ctx, this.fxaBoltPts(-40, bot - 40, W + 40, top + 60, 11, 14, 0.06), KZ_C, '#ffffff', 14 * f + 2, 0.45 * f);
      }
      // você, coroado, na frente da rosa
      const size = 420;
      const feet = bot + 70;
      const x = 680;
      this.fxbSpr(ctx, o.c.you, x, feet, size, { rim: KZ_C, rimD: 3, showAura: true, auraColor: KZ_C, frame: auraF(t) });
      const u = size / 36;
      const sTop = feet - size * 0.87;
      this.fxcCrown(ctx, x, sTop, u);
      this.fxcEyes(ctx, o.c.you, x, sTop + SPRITE_MAPY(10) * u, u, KZ_C, '#1e3a8a', 0);
      ctx.restore();
      if (t >= hit) {
        this.ptdWord(ctx, 'KAISER IMPACT!', W / 2, top + 96, 104, '#dbeafe', seg(t, hit, hit + 8), 1 - seg(t, 32, 42), -0.05, W * 0.84);
        this.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, hit, hit + 9)), '#dbeafe');
      }
      this.fxbTitle(ctx, S, t - 40, { cfg: o.c, y: top + 132, color: KZ_C });
      this.fxbSfx(S, hit, 'impact', () => window.SFX?.jingle?.([523, 784, 1047, 1568], 0, 'triangle'));
    }
  });

  // ==========================================================================
  // 3. SISTEMA PERFEITO (Snuffy) — as peças encaixam, as skills voltam 3x mais rápido
  // ==========================================================================
  const SN_CAM = { cx: 520, hy: -230, f: 900, h: 46, d: 66 };
  // a formação: 0 = você (o camisa 10 do sistema)
  const SN_FORM = [[8, 2], [-32, 1], [-22, -10], [-22, 12], [-12, -15], [-11, 1], [-12, 17], [0, -12], [0, 15], [16, -6], [17, 9]];
  const SN_LINKS = [[1, 2], [1, 3], [2, 4], [2, 5], [3, 5], [3, 6], [4, 7], [5, 7], [5, 8], [6, 8], [7, 0], [8, 0], [7, 9], [8, 10], [0, 9], [0, 10], [9, 10]];
  const SN_X3 = 50;

  Object.assign(CE, {
    fxcSnCast() {
      const c = this.fxbCfg('fl_lendario_snuffy');
      return { c, snuffy: this.cineChar('snuffy') };
    },
    // Engrenagem em pixel (10 dentes, aro e furo no meio)
    fxcGearCv() {
      return this.fxbBg('fxcGear', 40, 40, (g) => {
        const inside = (x, y) => {
          const dx = x + 0.5 - 20;
          const dy = y + 0.5 - 20;
          const r = Math.hypot(dx, dy);
          const a = Math.atan2(dy, dx);
          const R = Math.cos(a * 8) > -0.15 ? 18 : 14.5;
          return r <= R && r >= 5;
        };
        for (let y = 0; y < 40; y++) {
          for (let x = 0; x < 40; x++) {
            if (!inside(x, y)) continue;
            const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
            const r = Math.hypot(x + 0.5 - 20, y + 0.5 - 20);
            let c = '#7e22ce';
            if (edge) c = '#1a0b2e';
            else if (r > 9 && r < 10.4) c = '#4c1d95';
            else if (x + y < 34) c = '#c084fc';
            g.fillStyle = c;
            g.fillRect(x, y, 1, 1);
          }
        }
      });
    },
    // As 6 skills: quanto cada uma está carregada no quadro t (simulação determinística)
    fxcSnSlots(t) {
      const key = Math.floor(t);
      if (this._fxcSlotsK === key) return this._fxcSlotsV;
      const out = [];
      for (let i = 0; i < 6; i++) {
        let f = 0.12 + 0.12 * i;
        let ready = -1;
        let used = -99;
        let lastPop = -99;
        for (let tt = 0; tt <= key; tt++) {
          const sp = tt < SN_X3 ? 1 / 180 : 3 / 180;
          if (ready >= 0) {
            if (tt - ready >= 14 + i * 3) {
              f = 0;
              ready = -1;
              used = tt;
            }
          } else {
            f += sp;
            if (f >= 1) {
              f = 1;
              ready = tt;
              lastPop = tt;
            }
          }
        }
        out.push({ f, ready: ready >= 0, used, lastPop });
      }
      this._fxcSlotsK = key;
      this._fxcSlotsV = out;
      return out;
    },
    // Um quadrado de skill: tecla, varredura da recarga e o aro de progresso
    fxcSlot(ctx, x, y, s, label, f, ready, color, pop = 0) {
      const h = s / 2;
      ctx.save();
      ctx.fillStyle = '#020617';
      ctx.fillRect(x - h - 4, y - h - 4, s + 8, s + 8);
      ctx.fillStyle = '#1a0b2e';
      ctx.fillRect(x - h, y - h, s, s);
      ctx.font = `900 ${Math.round(s * 0.5)}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ready ? '#ffffff' : '#c4b5fd';
      ctx.fillText(label, x, y + 2);
      if (f < 1) {
        // a parte que ainda falta carregar fica escura
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - h, y - h, s, s);
        ctx.clip();
        ctx.fillStyle = 'rgba(2,6,23,0.72)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, s, -Math.PI / 2 + f * TAU, -Math.PI / 2 + TAU);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.78, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = ready ? '#f5f3ff' : color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, y, s * 0.78, -Math.PI / 2, -Math.PI / 2 + f * TAU);
      ctx.stroke();
      ctx.strokeStyle = ready ? '#ffffff' : color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x - h + 1, y - h + 1, s - 2, s - 2);
      ctx.restore();
      if (pop > 0 && pop < 1) this.cineGlow(ctx, x, y, s * (1 + pop), rgba(color, 0.8), 1 - pop);
    },

    // PLANO 1 — o tabuleiro tático: cada peça encaixa no lugar e as linhas do sistema acendem
    fxcSn0(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxcSnCast();
      const cam = SN_CAM;
      ctx.save();
      const k = easeIO(t / 85);
      this.cineCamera(ctx, W, H, { x: lerp(640, 620, k), y: lerp(380, 370, k), zoom: lerp(1, 1.06, k), rot: lerp(0.015, -0.01, k), shake: 0.5 });
      this.fxbPitch(ctx, 'blueprint', W, H, cam, SN_C);
      ctx.fillStyle = 'rgba(46,16,101,0.35)';
      ctx.fillRect(-60, -60, W + 120, H + 120);
      // onde cada peça está agora
      const pos = SN_FORM.map(([X, Y], i) => {
        const at = 6 + i * 3.6;
        const m = back(seg(t, at, at + 10));
        const sX = X + (rnd(i, 21) - 0.5) * 40;
        const sY = Y + (rnd(i, 22) - 0.5) * 26;
        return { X: lerp(sX, X, m), Y: lerp(sY, Y, m), snap: seg(t, at + 10, at + 30), at, on: t >= at + 10 };
      });
      // as linhas do sistema (depois que tudo encaixou)
      SN_LINKS.forEach(([a, b], j) => {
        const lk = ease(seg(t, 52 + j, 60 + j));
        if (lk <= 0) return;
        const [ax, ay] = this.fxbProj(cam, pos[a].X, pos[a].Y);
        const [bx, by] = this.fxbProj(cam, pos[b].X, pos[b].Y);
        ctx.strokeStyle = 'rgba(2,6,23,0.8)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(lerp(ax, bx, lk), lerp(ay, by, lk));
        ctx.stroke();
        ctx.strokeStyle = a === 0 || b === 0 ? '#f5d0fe' : SN_C;
        ctx.lineWidth = 3;
        ctx.stroke();
      });
      // as peças
      pos
        .map((p, i) => Object.assign({ i }, p))
        .sort((a, b) => b.Y - a.Y)
        .forEach((p) => {
          const [sx, sy, kk] = this.fxbProj(cam, p.X, p.Y);
          const you = p.i === 0;
          const r = kk * (you ? 1.9 : 1.5);
          if (p.on && p.snap < 1) {
            ctx.strokeStyle = `rgba(245,208,254,${1 - p.snap})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(sx, sy, r * (1 + p.snap * 2), r * (1 + p.snap * 2) * 0.55, 0, 0, TAU);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(2,6,23,0.6)';
          ctx.beginPath();
          ctx.ellipse(sx + 3, sy + 5, r, r * 0.6, 0, 0, TAU);
          ctx.fill();
          ctx.fillStyle = you ? '#f5d0fe' : '#2e1065';
          ctx.strokeStyle = you ? '#ffffff' : SN_C;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(sx, sy, r, r * 0.6, 0, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.font = `900 ${Math.round(r * 0.75)}px "Segoe UI", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = you ? '#2e1065' : '#f3e8ff';
          ctx.fillText(you ? '10' : String([0, 1, 4, 5, 2, 6, 3, 8, 7, 9, 11][p.i]), sx, sy + 1);
          if (you && p.on) this.ptdChip(ctx, 'VOCÊ', sx, sy - r - 26, SN_C, seg(t, p.at + 10, p.at + 20), { size: 13 });
        });
      // o Snuffy à direita, comandando
      const sa = seg(t, 0, 20);
      const sx = 1090;
      this.cineGlow(ctx, sx, 400, 300, 'rgba(168,85,247,0.3)', sa);
      const ss = 440;
      const sFeet = bot + 70;
      this.fxbSpr(ctx, o.snuffy, sx, sFeet, ss, { flipX: true, animState: t > 30 ? 'call_pass' : 'idle', rim: SN_C, rimD: 3, dim: 0.12, dimTint: '20,4,40', alpha: sa });
      const su = ss / 36;
      if (t > 24) this.fxcEyes(ctx, o.snuffy, sx, sFeet - ss * 0.87 + SPRITE_MAPY(10) * su, su, SN_C, '#3b0764', -1, seg(t, 24, 34));
      ctx.restore();
      const done = pos.filter((p) => p.on).length;
      ctx.save();
      ctx.font = '900 15px monospace';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(2,6,23,0.9)';
      ctx.globalAlpha = seg(t, 6, 16);
      const txt = `PEÇAS NO LUGAR: ${done}/11${done === 11 ? '   SISTEMA: ONLINE' : ''}`;
      ctx.strokeText(txt, 40, bot - 26);
      ctx.fillStyle = done === 11 ? '#f5d0fe' : '#c4b5fd';
      ctx.fillText(txt, 40, bot - 26);
      ctx.restore();
      this.finKicker(ctx, 40, top + 34, 'CADA PEÇA NO SEU LUGAR', seg(t, 4, 40), SN_C);
      SN_FORM.forEach((_, i) => {
        if (i % 2 === 0) this.fxbSfx(S, Math.round(16 + i * 3.6), 'clique' + i, () => window.SFX?.blip(392 + i * 40));
      });
      this.fxbSfx(S, 54, 'online', () => window.SFX?.whoosh());
    },

    // PLANO 2 — a recarga: as 6 skills em volta de você enchem, estalam PRONTO e voltam 3x mais rápido
    fxcSn1(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxcSnCast();
      const x3 = t >= SN_X3;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#07020f'], [0.55, '#1e0b3a'], [1, '#07020f']]);
      ctx.save();
      const k = easeIO(t / 185);
      this.cineCamera(ctx, W, H, { x: lerp(650, 620, k), y: 370, zoom: lerp(1.02, 1.07, k), shake: 0.5 + (x3 ? 5 * (1 - seg(t, SN_X3, SN_X3 + 20)) : 0) });
      this.ptdRays(ctx, 1040, 300, W, SN_C, 0.1, t * 0.002, 40);
      // engrenagens no fundo (giram 3x mais rápido depois do estalo)
      const spin = t < SN_X3 ? t * 0.01 : SN_X3 * 0.01 + (t - SN_X3) * 0.03;
      this.fxcBlit(ctx, this.fxcGearCv(), 1060, 250, 460, spin, 0.28);
      this.fxcBlit(ctx, this.fxcGearCv(), 790, 110, 230, -spin * 2 + 0.16, 0.22);
      this.fxcBlit(ctx, this.fxcGearCv(), 150, 600, 300, -spin * 1.5, 0.22);
      // o Snuffy atrás, à direita (estala os dedos: o sistema liga)
      const ss = 520;
      const sFeet = bot + 140;
      const sx = 1070;
      this.cineGlow(ctx, sx, 360, 320, 'rgba(168,85,247,0.3)');
      this.fxbSpr(ctx, o.snuffy, sx, sFeet, ss, { flipX: true, animState: t > SN_X3 - 12 ? 'call_pass' : 'idle', rim: SN_C, rimD: 3, dim: 0.22, dimTint: '20,4,40' });
      const su = ss / 36;
      this.fxcEyes(ctx, o.snuffy, sx, sFeet - ss * 0.87 + SPRITE_MAPY(10) * su, su, SN_C, '#3b0764', -1);
      // o núcleo do sistema: uma engrenagem acesa acima da mão levantada do Snuffy
      const coreX = sx - 9 * su;
      const coreY = sFeet - ss * 0.87 + SPRITE_MAPY(3) * su;
      const ck = back(seg(t, SN_X3 - 10, SN_X3));
      if (ck > 0) {
        this.cineGlow(ctx, coreX, coreY, 90, 'rgba(216,180,254,0.7)', ck);
        this.fxcBlit(ctx, this.fxcGearCv(), coreX, coreY, 70 * ck, -spin * 4);
      }
      if (x3) this.ptdRings(ctx, coreX, coreY, seg(t, SN_X3, SN_X3 + 30), ['#ffffff', SN_C], 320, 0);
      // você no meio
      const x = 470;
      const size = 560;
      const feet = bot + 170;
      this.cineGlow(ctx, x, feet - size * 0.6, 300, 'rgba(168,85,247,0.25)');
      this.fxbSpr(ctx, o.c.you, x, feet, size, Object.assign({ rim: SN_C, rimD: 3 }, x3 ? { showAura: true, auraColor: SN_C, frame: auraF(t) } : {}));
      const u = size / 36;
      this.fxcEyes(ctx, o.c.you, x, feet - size * 0.87 + SPRITE_MAPY(10) * u, u, SN_C, '#3b0764', 0, seg(t, SN_X3, SN_X3 + 10));
      // as 6 skills em arco por cima de você
      const slots = this.fxcSnSlots(t);
      const cx = x;
      const cy = 430;
      slots.forEach((sl, i) => {
        const a = Math.PI + ((i + 0.5) / 6) * Math.PI;
        const px = cx + Math.cos(a) * 340;
        const py = cy + Math.sin(a) * 250;
        // os fios do sistema (do Snuffy até cada skill)
        if (x3) {
          ctx.strokeStyle = rgba(SN_C, 0.35 * seg(t, SN_X3 + i * 3, SN_X3 + 12 + i * 3));
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.quadraticCurveTo((px + coreX) / 2, Math.min(py, coreY) - 60, coreX, coreY);
          ctx.stroke();
        }
        const pop = seg(t, sl.lastPop, sl.lastPop + 16);
        this.fxcSlot(ctx, px, py, 70, String(i + 1), sl.f, sl.ready, x3 ? SN_C : '#7c3aed', pop);
        if (sl.ready) this.ptdChip(ctx, 'PRONTO', px, py - 66, SN_C, seg(t, sl.lastPop, sl.lastPop + 6), { size: 11 });
        if (t >= sl.used && t < sl.used + 20) this.fxbSparks(ctx, px, py, seg(t, sl.used, sl.used + 20), 10, ['#f5d0fe', SN_C], 0.5, i + 3);
      });
      ctx.restore();
      if (x3) this.ptdWord(ctx, 'RECARGA x3!', W * 0.74, bot - 90, 84, '#f5d0fe', seg(t, SN_X3, SN_X3 + 8), 1 - seg(t, SN_X3 + 40, SN_X3 + 52), -0.06);
      ctx.save();
      ctx.font = '900 15px monospace';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(2,6,23,0.9)';
      const ready = slots.filter((s) => s.ready).length;
      const txt = `VELOCIDADE DE RECARGA: ${x3 ? '300%' : '100%'}   PRONTAS: ${ready}/6`;
      ctx.strokeText(txt, 40, bot - 26);
      ctx.fillStyle = x3 ? '#f5d0fe' : '#c4b5fd';
      ctx.fillText(txt, 40, bot - 26);
      ctx.restore();
      this.finKicker(ctx, 40, top + 34, 'O SISTEMA RECARREGA TUDO', seg(t, 4, 40), SN_C);
      this.fxbSfx(S, SN_X3, 'estalo', () => window.SFX?.blip(1175));
      [70, 100, 130, 160].forEach((at, i) => this.fxbSfx(S, at, 'pronto' + i, () => window.SFX?.blip(659 + i * 90)));
    },

    // PLANO 3 — as engrenagens travam juntas: tudo pronto, SISTEMA PERFEITO
    fxcSn2(ctx, S) {
      const { W, H, t, top, bot } = S;
      const o = this.fxcSnCast();
      const hit = 12;
      this.cineGradient(ctx, 0, 0, W, H, [[0, '#07020f'], [0.5, '#2e1065'], [1, '#07020f']]);
      ctx.save();
      this.cineCamera(ctx, W, H, { x: 640, y: 360, zoom: 1.03 + easeIO(t / 90) * 0.04, shake: t >= hit ? 8 * (1 - seg(t, hit, hit + 24)) + 0.5 : 0.5 });
      this.ptdRays(ctx, 640, 320, W * 1.2, SN_C, 0.16, t * 0.003, 44);
      // as três engrenagens giram rápido e travam no estalo (com um tranco)
      const lock = t < hit ? 0 : Math.sin((t - hit) * 0.9) * 0.08 * (1 - seg(t, hit, hit + 20));
      const run = Math.min(t, hit) * 0.12;
      this.cineGlow(ctx, 640, 290, 380, 'rgba(168,85,247,0.4)');
      this.fxcBlit(ctx, this.fxcGearCv(), 640, 290, 520, run + lock);
      this.fxcBlit(ctx, this.fxcGearCv(), 280, 250, 260, -run * 1.75 + 0.16 - lock, 0.9);
      this.fxcBlit(ctx, this.fxcGearCv(), 1000, 250, 260, -run * 1.75 + 0.16 - lock, 0.9);
      if (t >= hit) {
        this.ptdRings(ctx, 640, 290, seg(t, hit, hit + 30), ['#ffffff', SN_C, '#3b0764'], 520, 0);
        this.fxbSparks(ctx, 640, 290, seg(t, hit, hit + 30), 26, ['#f5d0fe', SN_C, '#ffffff'], 1.2, 13);
      }
      // você na frente
      const size = 420;
      const feet = bot + 70;
      this.fxbSpr(ctx, o.c.you, 640, feet, size, { rim: SN_C, rimD: 3, showAura: true, auraColor: SN_C, frame: auraF(t) });
      const u = size / 36;
      this.fxcEyes(ctx, o.c.you, 640, feet - size * 0.87 + SPRITE_MAPY(10) * u, u, SN_C, '#3b0764', 0);
      ctx.restore();
      // a barra de skills: as 6 enchem uma atrás da outra e acendem juntas no estalo
      for (let i = 0; i < 6; i++) {
        const f = t >= hit ? 1 : 0.55 + 0.45 * seg(t, i * 1.5, hit);
        this.fxcSlot(ctx, 640 + (i - 2.5) * 118, bot - 58, 60, String(i + 1), f, t >= hit, SN_C, seg(t, hit + i * 2, hit + 16 + i * 2));
      }
      if (t >= hit) {
        this.ptdWord(ctx, 'TUDO PRONTO!', W / 2, top + 96, 100, '#f5d0fe', seg(t, hit, hit + 8), 1 - seg(t, 34, 44), -0.05);
        this.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, hit, hit + 9)), '#f5d0fe');
      }
      this.fxbTitle(ctx, S, t - 40, { cfg: o.c, y: top + 140, color: SN_C });
      this.fxbSfx(S, hit, 'trava', () => window.SFX?.kick?.(1));
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

  reg('fl_epico_passe', {
    icon: '🎭',
    label: 'PASSE PERFEITO',
    phases: [85, 185, 90],
    music: 'travel',
    tags: ['PLANO 1 • O BRINQUEDO', 'PLANO 2 • O PASSE', 'PLANO 3 • INTOCÁVEL'],
    subs: [[], [{ from: 0, who: 'CHARLES', text: '"Hehe, pega se puder!"', color: PAS_C }], []],
    draw: plan([CE.fxcPas0, CE.fxcPas1, CE.fxcPas2], [[PAS_C, 40], [PAS_C, 44]])
  });

  reg('fl_lendario_kaiser', {
    icon: '👑',
    label: 'KAISER IMPACT',
    phases: [85, 185, 90],
    tags: ['PLANO 1 • A COROA', 'PLANO 2 • CARGA MÁXIMA', 'PLANO 3 • KAISER IMPACT'],
    subs: [[], [{ from: 0, who: 'KAISER', text: '"Curve-se ao Imperador."', color: KZ_C }], []],
    draw: plan([CE.fxcKz0, CE.fxcKz1, CE.fxcKz2], [[KZ_C, 36], [KZ_C, 48]])
  });

  reg('fl_lendario_snuffy', {
    icon: '⚙️',
    label: 'SISTEMA PERFEITO',
    phases: [85, 185, 90],
    music: 'mystery',
    tags: ['PLANO 1 • O TABULEIRO', 'PLANO 2 • RECARGA x3', 'PLANO 3 • SISTEMA PERFEITO'],
    subs: [[], [{ from: 0, who: 'SNUFFY', text: '"Tudo segue o plano."', color: SN_C }], []],
    draw: plan([CE.fxcSn0, CE.fxcSn1, CE.fxcSn2], [[SN_C, 40], [SN_C, 44]])
  });
})();
