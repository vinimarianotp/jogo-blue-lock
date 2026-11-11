// ============================================================================
// CUTSCENES EM 3D — a noite da Bola de Ouro e a lição do Sae, refeitas no padrão do gol da
// Sub-20 (js/cine3d_u20.js): câmera sempre andando (grua, travelling, push-in), câmera
// lenta com rampa nos momentos-chave, no máximo 1 quadro de impacto e 2 tremidas fortes por
// cena, closes só em quadros de mangá em pixel art (camisa, mãos, silhuetas, sapato na
// poça) e pouco texto na tela (legenda, um letreiro discreto de lugar, o placar do duelo).
//   bola_de_ouro_discurso • o teatro de Paris (área vazia, CE.c3fTheatre da cine3d_final):
//                           o troféu → o discurso → a fome → a plateia de pé e o Rin na
//                           última fileira → ele sai pela porta dos fundos
//   rin_sae_licao         • o corredor do hotel → o campo de treino à uma da manhã, na chuva
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D || !CE.c3fTheatre) return;
  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mixP = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  // tempo da ação com câmera lenta: keys = [[tempo real, tempo da ação], ...]
  const remap = (t, keys) => {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    }
    return keys[keys.length - 1][1] + (t - keys[keys.length - 1][0]);
  };
  const pic = (K, o) => K.quad(Object.assign({}, o, { ang: (o.ang || 0) + Math.PI }));
  const WALKF = (f, sp = 6) => 1 + (Math.floor(f / sp) % 4) * 4;
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp * 0.6, p[2] + K.noise(f, seed + 7) * amp];
  const W3 = (x, h, y) => ({ __w: [x, h, y] });
  const stOf = (K) => {
    const st = {};
    Object.keys(K.st || {}).forEach((k) => {
      const v = K.st[k];
      st[k] = v && v.__w ? K.screen(v.__w[0], v.__w[1], v.__w[2]) : v;
    });
    return st;
  };

  const YOU_C = '#00f5d4';
  const RIN_C = '#2dd4bf';
  const SAE_C = '#fb7185';
  const NARR_C = '#94a3b8';
  const HOST_C = '#fde68a';
  const GOLD = '#facc15';
  const KIT_TR = { jerseyPrimary: '#0b1f24', jerseySecondary: '#14b8a6' };
  const BLK = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };

  const TH = CE.C3F_THEATRE;
  const rowY = (r) => TH.row0 + r * TH.step;
  const rowZ = (r) => r * TH.rake;
  const canvas = CE.c3fCanvas;
  const pose = CE.c3fPose;
  const poseSprite = CE.c3fPoseSprite;
  const cast = () => CE.bdorCast();

  // ---------------------------------------------------------------- pós (no overlay)
  function impactFrame(ctx, W, H) {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  function flare(ctx, S, p, k = 1, rgb = '255,255,255', size = 1) {
    if (!p || k <= 0) return;
    const { W, H } = S;
    if (p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 120) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    CE.cineGlow(ctx, p.x, p.y, 110 * size, `rgba(${rgb},0.5)`, k);
    CE.cineGlow(ctx, p.x, p.y, 34 * size, 'rgba(255,255,255,0.95)', k);
    const gr = ctx.createLinearGradient(p.x - 380 * size, 0, p.x + 380 * size, 0);
    gr.addColorStop(0, `rgba(${rgb},0)`);
    gr.addColorStop(0.5, `rgba(${rgb},${0.45 * k})`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(p.x - 380 * size, p.y - 2, 760 * size, 4);
    const cx = W / 2;
    const cy = H / 2;
    [[0.45, 24, `rgba(${rgb},0.2)`], [0.8, 12, 'rgba(250,204,21,0.16)'], [1.3, 36, 'rgba(99,102,241,0.12)']].forEach(([fq, r, col]) => {
      CE.cineGlow(ctx, p.x + (cx - p.x) * fq * 2, p.y + (cy - p.y) * fq * 2, r * size, col, k);
    });
    ctx.restore();
  }
  // olhos acesos pequenos no boneco 3D (como no gol da Sub-20): p = meio dos olhos na tela
  function eyeGlow(ctx, p, k, rgb, gap = 7) {
    if (!p || k <= 0) return;
    [-gap, gap].forEach((dx) => {
      CE.cineGlow(ctx, p.x + dx, p.y, 20, `rgba(${rgb},0.9)`, k);
      CE.cineGlow(ctx, p.x + dx, p.y, 6, 'rgba(240,253,250,1)', k);
    });
  }
  // flashes de foto pequenos na plateia
  function photoPops(ctx, S, t, n, seed) {
    const { W, top, bot } = S;
    for (let i = 0; i < n; i++) {
      const per = 40 + Math.floor(rnd(i, seed) * 50);
      const ph = (t + Math.floor(rnd(i, seed + 1) * per)) % per;
      if (ph > 5) continue;
      const x = rnd(i + Math.floor((t + rnd(i, seed + 1) * per) / per) * 7, seed + 2) * W;
      const y = top + (bot - top) * (0.45 + rnd(i, seed + 3) * 0.5);
      CE.cineGlow(ctx, x, y, 26, 'rgba(255,255,255,0.85)', 1 - ph / 5);
    }
  }
  const rain = (ctx, S, a = 1) => CE.c3fRain && CE.c3fRain(ctx, S, a);

  // ---------------------------------------------------------------- quadros de mangá
  const PIX = 6;
  const CA = () => CE.ART;
  const cut = (ctx, poly, draw, k, from) => CA() && CA().panel(ctx, poly, draw, { k, from, pixel: PIX });
  const rr = (g, x, y, w, h, r) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  // mão de chibi (formas grossas: no quadro em pixel vira poucos blocos); close 0..1
  function hand(g, x, y, s, o = {}) {
    const skin = o.skin || '#f1c9a5';
    const dark = CA().shade(skin, -0.3);
    const close = clamp(o.close ?? 1);
    g.save();
    g.translate(x, y);
    g.rotate(o.ang || 0);
    if (o.flip) g.scale(-1, 1);
    g.lineJoin = 'round';
    g.lineWidth = Math.max(2, s * 0.08);
    g.strokeStyle = '#0b0f19';
    if (o.sleeve) {
      g.fillStyle = o.sleeve;
      g.fillRect(-s * 0.46, s * 0.32, s * 0.92, s * 1.6);
      g.strokeRect(-s * 0.46, s * 0.32, s * 0.92, s * 1.6);
      if (o.cuff) {
        g.fillStyle = o.cuff;
        g.fillRect(-s * 0.46, s * 0.32, s * 0.92, s * 0.16);
      }
      g.fillStyle = 'rgba(15,23,42,0.35)';
      g.fillRect(s * 0.1, s * 0.32, s * 0.36, s * 1.6);
    }
    for (let i = 0; i < 4; i++) {
      const fx = -s * 0.36 + i * s * 0.24;
      const len = lerp(s * 0.62, s * 0.2, close) * (i === 0 || i === 3 ? 0.86 : 1);
      const spread = (i - 1.5) * 0.12 * (1 - close);
      g.save();
      g.translate(fx, -s * 0.28);
      g.rotate(spread);
      g.fillStyle = skin;
      rr(g, -s * 0.11, -len, s * 0.22, len + s * 0.14, s * 0.1);
      g.fill();
      g.stroke();
      g.restore();
    }
    g.fillStyle = skin;
    rr(g, -s * 0.5, -s * 0.34, s, s * 0.72, s * 0.2);
    g.fill();
    g.stroke();
    if (close > 0.5) {
      g.fillStyle = dark;
      g.fillRect(-s * 0.46, -s * 0.3, s * 0.92, s * 0.16);
      g.beginPath();
      for (let i = 1; i < 4; i++) {
        g.moveTo(-s * 0.48 + i * s * 0.24, -s * 0.32);
        g.lineTo(-s * 0.48 + i * s * 0.24, -s * 0.1);
      }
      g.stroke();
    }
    g.fillStyle = skin;
    g.save();
    if (close > 0.5) {
      g.translate(-s * 0.12, s * 0.02);
      g.rotate(-0.25);
      rr(g, -s * 0.36, -s * 0.12, s * 0.62, s * 0.24, s * 0.12);
    } else {
      g.translate(-s * 0.5, s * 0.08);
      g.rotate(-0.9 + close * 0.6);
      rr(g, -s * 0.12, -s * 0.48, s * 0.24, s * 0.52, s * 0.12);
    }
    g.fill();
    g.stroke();
    g.restore();
    g.fillStyle = 'rgba(15,23,42,0.22)';
    g.fillRect(s * 0.18, -s * 0.3, s * 0.28, s * 0.64);
    g.restore();
  }
  function panelBg(g, b, c0, c1, dots = 'rgba(2,6,23,0.35)') {
    const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h);
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    g.fillStyle = gr;
    g.fillRect(b.x - 20, b.y - 20, b.w + 40, b.h + 40);
    CA().halftone(g, b.x, b.y + b.h * 0.55, b.w, b.h * 0.45, { step: 14, color: dots, from: 'bottom', max: 0.8 });
  }

  // ==========================================================================
  // 1. A NOITE DA BOLA DE OURO
  // ==========================================================================
  const LEC = [86, 11.55];
  const PED = [88.3, 11.2];
  const lectern = (K) => {
    const z = TH.stageZ;
    K.box({ x0: LEC[0] - 0.32, y0: LEC[1], x1: LEC[0] + 0.32, y1: LEC[1] + 0.26, z0: z, z1: z + 0.5, color: '#24142e', top: '#ca8a04' });
    pic(K, { x: LEC[0], y: LEC[1] + 0.265, z: z + 0.02, w: 0.5, h: 0.46, ang: Math.PI / 2, img: CE.c3fLectern(), color: '#ffffff', light: [0.9, 0.8, 0.85] });
    [0.2, 0.27].forEach((dx) => K.box({ x0: LEC[0] + dx - 0.01, y0: LEC[1] + 0.02, x1: LEC[0] + dx + 0.01, y1: LEC[1] + 0.04, z0: z + 0.5, z1: z + 0.66, color: '#111827' }));
  };
  const pedestal = (K, x, y, glow = true) => {
    const z = TH.stageZ;
    K.box({ x0: x - 0.2, y0: y - 0.2, x1: x + 0.2, y1: y + 0.2, z0: z, z1: z + 0.5, color: '#24142e', top: '#ca8a04' });
    K.sprite(CE.c3fGoldBall(), { x, y, z: z + 0.5, w: 0.28, h: 0.42, glow });
  };
  const beam = (K, x, y, a = 0.22, w = 1.2) => K.quad({ x, y, z: TH.stageZ, w, h: 2.6, ang: Math.PI / 2, img: CE.c3fBeam('254,240,138'), em: true, color: '#ffffff', alpha: a });
  // você no palco (de terno)
  const youStage = (K, o) => K.actor('you', Object.assign({ x: LEC[0], y: LEC[1] - 0.25, z: TH.stageZ, ang: Math.PI / 2, extra: { outfit: 'suit' }, frame: 0, k: 0.9, light: [1.1, 1.0, 0.88] }, o));
  // a plateia, sem os lugares do lado do corredor nas duas primeiras fileiras (a câmera passa
  // por ali e as cabeças viravam manchas enormes) e sem o lugar do Rin
  const RIN_X = 89.2;
  const RIN_R = TH.rows - 1;
  const crowd = (K, o = {}) =>
    CE.c3fAudience(K, Object.assign({ seed: 23, r0: 0, r1: TH.rows, max: 44, face: [86, 10], frame: 0, skip: (r, x) => (r < 5 && Math.abs(x - 86) < 1.4) || (r >= RIN_R - 1 && Math.abs(x - RIN_X) < 1.0) }, o));
  const clapF = (t) => (Math.floor(t / 7) % 2 ? 6 : 0);

  // quadro: as costas da camisa do Blue Lock com o nº 299, na luz fria
  function cut299(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    const c = cast();
    cut(
      ctx,
      [[W * 0.56, top + 22], [W - 22, top + 22], [W - 22, bot - 22], [W * 0.56, bot - 22]],
      (b, g) => {
        panelBg(g, b, '#0b2a4a', '#020814');
        // o feixe de luz fria de cima
        g.fillStyle = 'rgba(186,230,253,0.18)';
        g.beginPath();
        g.moveTo(b.x + b.w * 0.42, b.y);
        g.lineTo(b.x + b.w * 0.58, b.y);
        g.lineTo(b.x + b.w * 0.9, b.y + b.h);
        g.lineTo(b.x + b.w * 0.1, b.y + b.h);
        g.closePath();
        g.fill();
        const x = b.x + b.w * 0.5 + b.ox;
        const y = b.y + b.h * (0.32 + 0.03 * ease(q));
        const w = b.w * 0.66;
        const h = b.h * 0.72;
        g.lineJoin = 'round';
        g.strokeStyle = '#020617';
        g.lineWidth = 10;
        g.fillStyle = BLK.jerseyPrimary;
        g.beginPath();
        g.moveTo(x - w * 0.28, y);
        g.lineTo(x + w * 0.28, y);
        g.lineTo(x + w * 0.62, y + h * 0.16);
        g.lineTo(x + w * 0.5, y + h * 0.4);
        g.lineTo(x + w * 0.36, y + h * 0.34);
        g.lineTo(x + w * 0.36, y + h);
        g.lineTo(x - w * 0.36, y + h);
        g.lineTo(x - w * 0.36, y + h * 0.34);
        g.lineTo(x - w * 0.5, y + h * 0.4);
        g.lineTo(x - w * 0.62, y + h * 0.16);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = c.youBL.hairColor || '#1b2340';
        rr(g, x - w * 0.22, y - h * 0.22, w * 0.44, h * 0.28, w * 0.12);
        g.fill();
        g.stroke();
        g.fillStyle = '#e0f2fe';
        g.font = `900 ${Math.round(h * 0.3)}px "Segoe UI", sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('299', x, y + h * 0.56);
      },
      kIn,
      [80, 0]
    );
  }
  // quadro: a derrota — os punhos fechados no gramado molhado, a chuva caindo (no vermelho)
  function cutLoss(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    const c = cast();
    cut(
      ctx,
      [[W * 0.56, top + 22], [W - 22, top + 22], [W - 22, bot - 22], [W * 0.56, bot - 22]],
      (b, g) => {
        panelBg(g, b, '#7f1d1d', '#1a0204', 'rgba(0,0,0,0.45)');
        // o gramado (faixas escuras) e os pingos batendo
        g.fillStyle = '#2a0508';
        g.fillRect(b.x - 10, b.y + b.h * 0.5, b.w + 20, b.h * 0.6);
        g.fillStyle = '#3b0a0e';
        for (let i = 0; i < 8; i++) g.fillRect(b.x + i * b.w * 0.14, b.y + b.h * 0.5, b.w * 0.07, b.h * 0.6);
        g.fillStyle = 'rgba(254,202,202,0.4)';
        for (let i = 0; i < 26; i++) {
          const x = b.x + rnd(i, 5) * b.w;
          const y = b.y + ((rnd(i, 6) * b.h + S.t * 9) % b.h);
          g.fillRect(x, y, 3, b.h * 0.06);
        }
        // os dois punhos apertando a grama (tremem de raiva)
        const tr = Math.sin(S.t * 0.9) * 2;
        [-1, 1].forEach((s) => hand(g, b.x + b.w * (0.5 + s * 0.2) + b.ox + tr * s, b.y + b.h * 0.6, b.h * 0.3, { close: 1, skin: c.youBL.skinColor, sleeve: BLK.jerseyPrimary, cuff: BLK.jerseySecondary, ang: Math.PI + s * 0.2, flip: s > 0 }));
      },
      kIn,
      [80, 0]
    );
  }
  // quadro: os cinco que você devorou — silhuetas em fila; as garras riscam uma por uma
  const PREY = [['barou', '#ef4444'], ['nagi', '#e2e8f0'], ['shidou', '#ec4899'], ['kaiser', '#60a5fa'], ['rin', RIN_C]];
  const PREY_AT = [40, 64, 88, 112, 136];
  function cutPrey(ctx, S, kIn, t) {
    const { W, top, bot } = S;
    const c = cast();
    cut(
      ctx,
      [[30, top + 40], [W - 30, top + 22], [W - 50, bot - 60], [44, bot - 40]],
      (b, g) => {
        g.fillStyle = '#e2e8f0';
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        CA().speedLines(g, 0, S.W, S.H, { color: 'rgba(15,23,42,0.22)', n: 30, t, speed: 12, thick: 5 });
        PREY.forEach(([id, col], i) => {
          const x = b.x + b.w * (0.12 + i * 0.19) + b.ox;
          const feet = b.y + b.h * 0.92;
          const hit = t >= PREY_AT[i];
          CA().silhouette(g, c[id], x, feet, b.h * 0.7, { view: 'front', fill: hit ? '#64748b' : '#0b0f19', rim: hit ? null : col });
          if (hit) {
            // as três garras (riscos ciano) cruzando a silhueta
            const k = ease(seg(t, PREY_AT[i], PREY_AT[i] + 6));
            g.strokeStyle = YOU_C;
            g.lineWidth = 10;
            g.lineCap = 'round';
            [-1, 0, 1].forEach((j) => {
              g.beginPath();
              g.moveTo(x - b.h * 0.18 + j * 22, feet - b.h * 0.62);
              g.lineTo(x - b.h * 0.18 + j * 22 + b.h * 0.36 * k, feet - b.h * 0.62 + b.h * 0.42 * k);
              g.stroke();
            });
          }
        });
      },
      kIn,
      [-90, 40]
    );
  }
  // quadro: as suas mãos apertando a borda do púlpito
  function cutGrip(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    const c = cast();
    cut(
      ctx,
      [[W - 520, bot - 250], [W - 22, bot - 270], [W - 22, bot - 22], [W - 540, bot - 22]],
      (b, g) => {
        panelBg(g, b, '#3b0764', '#0b0614', 'rgba(0,0,0,0.4)');
        // a borda do púlpito (madeira escura com o friso dourado)
        g.fillStyle = '#24142e';
        g.fillRect(b.x - 10, b.y + b.h * 0.58, b.w + 20, b.h * 0.5);
        g.fillStyle = '#ca8a04';
        g.fillRect(b.x - 10, b.y + b.h * 0.56, b.w + 20, b.h * 0.06);
        const sq = ease(seg(q, 0.2, 0.6));
        [-1, 1].forEach((s) => hand(g, b.x + b.w * (0.5 + s * 0.24) + b.ox, b.y + b.h * (0.58 - sq * 0.02), b.h * 0.38, { close: 0.4 + sq * 0.6, skin: c.you.skinColor, sleeve: '#111827', cuff: '#e5e7eb', ang: s * 0.15, flip: s > 0 }));
      },
      kIn,
      [60, 60]
    );
  }
  // quadro: o punho do Rin fechando no braço da poltrona
  function cutRinFist(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    const c = cast();
    cut(
      ctx,
      [[W - 480, bot - 260], [W - 22, bot - 260], [W - 22, bot - 22], [W - 480, bot - 22]],
      (b, g) => {
        panelBg(g, b, '#042f2e', '#010808', 'rgba(0,0,0,0.4)');
        // o braço da poltrona de veludo vermelho
        g.fillStyle = '#7f1d1d';
        rr(g, b.x - 10, b.y + b.h * 0.62, b.w + 20, b.h * 0.24, 10);
        g.fill();
        g.fillStyle = '#991b1b';
        g.fillRect(b.x - 10, b.y + b.h * 0.62, b.w + 20, b.h * 0.05);
        const cl = ease(seg(q, 0.15, 0.45));
        const tr = cl > 0.9 ? Math.sin(q * 140) * 2 : 0;
        hand(g, b.x + b.w * 0.48 + b.ox + tr, b.y + b.h * 0.56, b.h * 0.42, { close: cl, skin: c.rin.skinColor, sleeve: '#111827', cuff: '#e5e7eb', ang: -Math.PI / 2 + 0.2 });
      },
      kIn,
      [60, 0]
    );
  }

  CE.registerCine3D('bola_de_ouro_discurso', {
    phases: [300, 360, 330, 380, 300],
    music: 'victory',
    title: '🥇 A NOITE DA BOLA DE OURO',
    tags: ['PLANO 1 • O TROFÉU', 'PLANO 2 • O DISCURSO', 'PLANO 3 • A FOME', 'PLANO 4 • A ÚLTIMA FILEIRA', 'PLANO 5 • A PORTA DOS FUNDOS'],
    subs: [
      [
        { from: 12, to: 148, who: 'NARRADOR', text: 'Paris. A Bola de Ouro.', color: NARR_C },
        { from: 164, who: 'APRESENTADORA', text: '"O melhor do mundo!"', color: HOST_C }
      ],
      [
        { from: 10, to: 196, who: 'VOCÊ', text: '"Eu entrei no Blue Lock como o nº 299."', color: YOU_C },
        { from: 198, who: 'VOCÊ', text: '"Perdi. Me chamaram de sem talento."', color: YOU_C }
      ],
      [
        { from: 8, to: 186, who: 'VOCÊ', text: '"Então eu devorei um por um até aqui."', color: YOU_C },
        { from: 192, who: 'VOCÊ', text: '"E eu ainda tô com fome."', color: YOU_C }
      ],
      [
        { from: 10, to: 196, who: 'NARRADOR', text: 'Paris inteira aplaude de pé.', color: NARR_C },
        { from: 206, who: 'RIN ITOSHI', text: '(Esse troféu era pra ser meu.)', color: RIN_C }
      ],
      [{ from: 16, who: 'VOCÊ', text: '"Quem quiser este troféu... que venha tomar."', color: YOU_C }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'nel_dome',
    scene(K, S) {
      CE.c3fCamFix(K);
      const { t, phase, f } = S;
      const st = (K.st = {});
      if (phase === 0) {
        const CUT = 150;
        if (t < CUT) {
          // O TROFÉU: no escuro do palco, o feixe de cima; a câmera dá a volta, de baixo
          CE.c3fTheatre(K, { amb: '#3a2a3a' });
          K.expo(0.85);
          pedestal(K, 86, 11.0);
          beam(K, 86, 11.0, 0.22, 1.1);
          K.floor({ x0: 85.4, y0: 10.4, x1: 86.6, y1: 11.6, z: TH.stageZ + 0.008, img: CE.c3fGlowCv('rgba(254,240,138,0.6)'), color: '#ffffff', em: true, alpha: 0.999 });
          const k = easeIO(t / CUT);
          const a = lerp(-0.5, 0.4, k);
          K.cam([86 + Math.sin(a) * lerp(2.3, 1.9, k), lerp(0.62, 0.7, k), 11.0 + Math.cos(a) * lerp(2.3, 1.9, k)], [86, TH.stageZ + 0.62, 11.0], lerp(40, 34, k));
          st.lamp = W3(86, TH.stageZ + 2.5, 11.0);
          st.ball = W3(86, TH.stageZ + 0.66, 11.0);
        } else {
          // A GRUA: do fundo do teatro, por cima da plateia, até o palco; você sobe
          const u = t - CUT;
          const k = easeIO(u / 150);
          CE.c3fTheatre(K, { amb: '#8a6a7a' });
          lectern(K);
          pedestal(K, PED[0], PED[1]);
          const walk = easeIO(seg(u, 6, 120));
          const px = lerp(83.4, LEC[0], walk);
          const moving = u > 6 && u < 118;
          youStage(K, { x: px, ang: moving ? 0 : Math.PI / 2, anim: moving ? 'run' : 'idle', frame: moving ? WALKF(f, 7) : 0 });
          beam(K, px, LEC[1] - 0.3, 0.25, 1.3);
          crowd(K, { seed: 23, r1: 7, anim: 'clap', frame: clapF(t), light: [0.4, 0.32, 0.38] });
          K.cam([lerp(86.2, 86.05, k), lerp(2.3, 1.65, k), lerp(19.8, 17.8, k)], [lerp(85.6, 86, k), lerp(0.55, 0.78, k), 11.4], lerp(48, 38, k));
          st.lamp = W3(px, TH.stageZ + 2.5, LEC[1] - 0.3);
        }
      } else if (phase === 1) {
        // O DISCURSO: do corredor da plateia, a câmera chega devagar e dá um arco curto
        CE.c3fTheatre(K, { amb: '#7a5a6a' });
        K.expo(0.92);
        lectern(K);
        pedestal(K, PED[0], PED[1]);
        youStage(K, {});
        beam(K, LEC[0], LEC[1] - 0.3, 0.2, 1.3);
        crowd(K, { seed: 25, r1: 4, light: [0.3, 0.24, 0.3] });
        const k = easeIO(t / 360);
        K.cam([lerp(85.75, 86.25, k), lerp(1.3, 1.2, k), lerp(15.6, 15.0, k)], [lerp(86.55, 86.45, k), TH.stageZ + 0.52, LEC[1]], lerp(40, 36, k));
        st.lamp = W3(LEC[0], TH.stageZ + 2.5, LEC[1] - 0.3);
      } else if (phase === 2) {
        CE.c3fTheatre(K, { amb: '#5a4a6a' });
        K.expo(0.88);
        lectern(K);
        pedestal(K, PED[0], PED[1]);
        beam(K, LEC[0], LEC[1] - 0.3, 0.2, 1.3);
        const CUT = 186;
        const HIT = 250;
        if (t < CUT) {
          // de lado, no palco: a câmera desliza enquanto você fala dos que devorou
          youStage(K, { light: [0.95, 0.9, 0.85] });
          const k = easeIO(t / CUT);
          K.cam([lerp(83.7, 84.0, k), TH.stageZ + 0.82, lerp(12.9, 12.4, k)], [86.1, TH.stageZ + 0.55, 11.3], 42);
        } else {
          // "com fome": de frente e de baixo, câmera lenta chegando; no fim, os olhos acendem
          const u = t - CUT;
          const A = remap(u, [[0, 0], [40, 40], [64, 50], [144, 130]]);
          youStage(K, { light: mixP([0.85, 0.85, 0.9], [0.62, 1.05, 1.02], seg(t, HIT, HIT + 10)) });
          const k = easeIO(seg(A, 0, 130));
          const sh = t >= HIT ? 0.03 * Math.max(0, 1 - (t - HIT) / 16) : 0.002;
          K.cam(shake(K, [lerp(86.15, 86.1, k), lerp(0.55, 0.62, k), lerp(14.3, 13.9, k)], f * 2, sh, 4), [86.0, TH.stageZ + 0.62, LEC[1]], lerp(40, 34, k));
          st.eyes = W3(LEC[0], TH.stageZ + 0.78, LEC[1] - 0.2);
          st.you = W3(LEC[0], TH.stageZ + 0.6, LEC[1] - 0.25);
        }
      } else if (phase === 3) {
        const CUT = 200;
        const rinZ = rowZ(RIN_R);
        const rin = (light) => K.actor('rin', { x: RIN_X, y: rowY(RIN_R) + 0.1, z: 0, seat: rinZ + 0.16, anim: 'sit', ang: -Math.PI / 2, extra: { outfit: 'suit', angry: true }, frame: 0, k: 0.9, light });
        if (t < CUT) {
          // DE PÉ: a plateia levanta e aplaude; a grua sobe do palco até a última fileira,
          // onde só o Rin continua sentado
          CE.c3fTheatre(K, { amb: '#8a6a7a' });
          // (sem gente no caminho da grua: as cabeças viravam manchas enormes na frente)
          crowd(K, { seed: 27, anim: 'clap', frame: clapF(t), rise: (r) => seg(t, 10 + r * 6, 30 + r * 6), skip: (r, x) => (r < RIN_R - 1 && x > 85.2 && x < 88.8) || (r >= RIN_R - 1 && Math.abs(x - RIN_X) < 1.0) });
          rin([0.55, 0.72, 0.78]);
          const k = easeIO(seg(t, 10, CUT - 10));
          K.cam(mixP([85.8, 1.8, 11.3], [88.2, rinZ + 1.5, rowY(RIN_R) - 3.0], k), mixP([86.0, 0.6, 17.0], [RIN_X, rinZ + 0.45, rowY(RIN_R)], k), lerp(54, 40, k));
        } else {
          // o Rin no escuro da última fileira (a plateia de pé na frente, desfocada no escuro)
          const u = t - CUT;
          CE.c3fTheatre(K, { amb: '#2a2a3a' });
          K.expo(0.8);
          crowd(K, { seed: 27, r0: RIN_R - 2, anim: 'clap', frame: clapF(t), rise: () => 1, light: [0.2, 0.18, 0.22] });
          rin([0.42, 0.6, 0.66]);
          const k = easeIO(u / 180);
          K.cam([lerp(RIN_X - 0.7, RIN_X - 0.45, k), rinZ + 0.72, lerp(rowY(RIN_R) - 2.4, rowY(RIN_R) - 2.1, k)], [RIN_X, rinZ + 0.45, rowY(RIN_R)], 40);
          st.eyes = W3(RIN_X, rinZ + 0.62, rowY(RIN_R) + 0.1);
        }
      } else {
        // A PORTA DOS FUNDOS: do fundo do palco, por cima de você; lá longe o Rin sobe o
        // corredor e sai; a porta fecha
        const CUT = 120;
        const CLOSE = 250;
        const open = 1 - ease(seg(t, CLOSE, CLOSE + 20));
        CE.c3fTheatre(K, { amb: '#7a5a6a' });
        lectern(K);
        crowd(K, { seed: 29, anim: 'clap', frame: clapF(t), rise: () => 1, light: [0.42, 0.34, 0.38] });
        const dz = rowZ(TH.rows);
        pic(K, { x: 86, y: TH.door + 0.57, z: dz, w: 0.9, h: 1.25, ang: -Math.PI / 2, color: '#fff6dc', em: true, alpha: Math.max(0.02, open) });
        [-1, 1].forEach((s) => K.box({ x0: 86 + s * (0.45 * open) + (s < 0 ? -0.45 : 0), y0: TH.door + 0.5, x1: 86 + s * (0.45 * open) + (s < 0 ? 0 : 0.45), y1: TH.door + 0.56, z0: dz, z1: dz + 1.25, color: '#1c1016' }));
        if (open > 0.02) K.floor({ x0: 85.55, y0: TH.door - 3, x1: 86.45, y1: TH.door + 0.5, z: dz + 0.01, color: '#ffedb4', alpha: 0.2 * open, em: true });
        // você com a Bola de Ouro nas mãos, ao lado do pedestal (vazio)
        const YX = PED[0] - 0.5;
        const YY = PED[1] + 0.05;
        K.box({ x0: PED[0] - 0.2, y0: PED[1] - 0.2, x1: PED[0] + 0.2, y1: PED[1] + 0.2, z0: TH.stageZ, z1: TH.stageZ + 0.5, color: '#24142e', top: '#ca8a04' });
        youStage(K, { x: YX, y: YY, frame: 0, light: [1.1, 1.0, 0.85] });
        K.sprite(CE.c3fGoldBall(), { x: YX, y: YY + 0.12, z: TH.stageZ + 0.36, w: 0.24, h: 0.36 });
        beam(K, YX, YY, 0.25, 1.3);
        // o caminho do Rin: pela fileira até o corredor, depois sobe até a porta
        const a1 = easeIO(seg(t, CUT, CUT + 60));
        const a2 = easeIO(seg(t, CUT + 60, CLOSE - 6));
        const rx = a2 > 0 ? 86 : lerp(RIN_X, 86, a1);
        const ry = a2 > 0 ? lerp(rowY(RIN_R), TH.door + 0.3, a2) : rowY(RIN_R) + 0.1;
        const rz = a2 > 0 ? lerp(rowZ(RIN_R), dz, seg(ry, rowY(RIN_R), TH.door - 0.4)) : rowZ(RIN_R);
        if (t < CLOSE + 4) {
          const walking = t > CUT && t < CLOSE - 6;
          K.actor('rin', { x: rx, y: ry, z: rz, ang: a2 > 0 ? Math.PI / 2 : Math.PI, extra: { outfit: 'suit', angry: true }, anim: walking ? 'run' : 'idle', frame: walking ? WALKF(f, 8) : 0, k: 0.9, light: [0.45, 0.62, 0.68] });
        }
        if (t < CUT) {
          // de frente, do corredor da plateia: a câmera chega devagar e sobe um pouco
          const k = easeIO(t / CUT);
          K.cam([lerp(87.2, 87.4, k), lerp(0.8, 1.0, k), lerp(14.6, 14.3, k)], [YX, TH.stageZ + lerp(0.5, 0.75, k), YY], lerp(40, 36, k));
          st.lamp = W3(YX, TH.stageZ + 2.5, YY);
          st.ball = W3(YX, TH.stageZ + 0.5, YY + 0.12);
        } else {
          // do alto do palco (por cima de você): lá no fundo, o Rin sobe o corredor e sai
          const k = easeIO(seg(t, CUT, 300));
          K.cam([lerp(85.2, 85.5, k), lerp(2.2, 2.35, k), lerp(9.3, 9.2, k)], [lerp(86.6, 86.2, k), lerp(0.85, 1.0, k), 20.5], lerp(42, 36, k));
        }
        st.door = W3(86, dz + 0.62, TH.door + 0.5);
        st.open = open;
      }
    },
    overlay(ctx, S, K) {
      CE.c3fCamBack();
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        const CUT = 150;
        if (t < CUT) {
          flare(ctx, S, st.lamp, 0.55, '254,240,138', 0.9);
          if (st.ball) for (let i = 0; i < 4; i++) {
            const a = Math.max(0, Math.sin(t * 0.05 + i * 1.7));
            CE.finSparkle(ctx, st.ball.x + Math.cos(i * 2.4) * 60, st.ball.y + Math.sin(i * 2.4) * 50, 8, a * 0.8, 'rgba(253,230,138,0.7)');
          }
          CE.cineDust(ctx, W, H, t, 22, 'rgba(254,240,138,0.4)', 4);
          CE.luckKicker(ctx, 40, top + 30, 'PARIS • THÉÂTRE DU CHÂTELET', seg(t, 8, 48), GOLD);
          if (t > CUT - 10) CE.cineFlash(ctx, W, H, seg(t, CUT - 10, CUT), '#000000');
        } else {
          const u = t - CUT;
          flare(ctx, S, st.lamp, 0.45, '254,240,138', 0.8);
          photoPops(ctx, S, t, 6, 3);
          CE.cineFlash(ctx, W, H, 1 - seg(u, 0, 10), '#000000');
        }
        CE.cineSfx(S, 20, 'flash', () => window.SFX?.blip?.(1200));
      } else if (phase === 1) {
        flare(ctx, S, st.lamp, 0.4, '254,240,138', 0.8);
        if (t > 30 && t < 186) cut299(ctx, S, seg(t, 30, 38), seg(t, 30, 186));
        if (t > 204 && t < 350) cutLoss(ctx, S, seg(t, 204, 212), seg(t, 204, 350));
        CE.cineSfx(S, 204, 'derrota', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        const CUT = 186;
        const HIT = 250;
        if (t < CUT) {
          if (t > 16 && t < 176) cutPrey(ctx, S, seg(t, 16, 24), t);
          PREY_AT.forEach((a, i) => CE.cineSfx(S, a, 'garra' + i, () => window.SFX?.tackle?.()));
        } else {
          // câmera lenta: bordas escuras; no "fome", o único quadro de impacto
          if (t < HIT) {
            ctx.save();
            ctx.globalAlpha = 0.2 * seg(t, CUT, CUT + 40);
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, top, W, bot - top);
            ctx.restore();
          }
          if (t > 200 && t < HIT) cutGrip(ctx, S, seg(t, 200, 208), seg(t, 200, HIT));
          if (t >= HIT && t < HIT + 2) impactFrame(ctx, W, H);
          if (t >= HIT) {
            CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, HIT + 1, HIT + 9)), '#ccfbf1');
            if (t < HIT + 8 && st.you) CE.drawRadialSpeedLines(ctx, st.you.x, st.you.y, W, '#ccfbf1', 0.4 * (1 - (t - HIT) / 8));
            eyeGlow(ctx, st.eyes, seg(t, HIT, HIT + 10), '0,245,212', 6);
          }
          CE.cineSfx(S, HIT, 'fome', () => window.SFX?.kick?.(1));
        }
      } else if (phase === 3) {
        const CUT = 200;
        if (t < CUT) {
          photoPops(ctx, S, t, 8, 7);
          CE.cineBokeh(ctx, W, top, bot, t, 14, ['rgba(251,191,36,0.3)', 'rgba(254,240,138,0.2)'], 21);
        } else {
          const u = t - CUT;
          CE.cineFlash(ctx, W, H, 1 - seg(u, 0, 10), '#000000');
          eyeGlow(ctx, st.eyes, 0.5 + 0.4 * Math.sin(u * 0.08), '45,212,191', 6);
          if (u > 40 && u < 170) cutRinFist(ctx, S, seg(u, 40, 48), seg(u, 40, 170));
        }
      } else {
        const CUT = 120;
        const CLOSE = 250;
        if (t < CUT) {
          flare(ctx, S, st.lamp, 0.5, '254,240,138', 0.9);
          if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 34, 'rgba(253,230,138,0.35)', 0.6);
          photoPops(ctx, S, t, 8, 9);
        } else {
          if (t < CUT + 3) CE.cineFlash(ctx, W, H, 0.5 * (1 - (t - CUT) / 3), '#000000');
          if (st.door && st.open > 0.02) flare(ctx, S, st.door, 0.5 * st.open, '255,237,180', 0.8);
        }
        CE.cineBokeh(ctx, W, top, bot, t, 12, ['rgba(251,191,36,0.25)', 'rgba(254,240,138,0.18)'], 24);
        const fo = seg(t, 262, 298);
        if (fo > 0) {
          ctx.fillStyle = `rgba(0,0,0,${fo})`;
          ctx.fillRect(0, 0, W, H);
        }
        CE.cineSfx(S, CLOSE + 18, 'porta', () => window.SFX?.tackle?.());
      }
    }
  });

  // ==========================================================================
  // 2. A LIÇÃO DO SAE — o corredor do hotel → o campo de treino de madrugada, na chuva
  // ==========================================================================
  const nightRain = (K, expo = 0.9) => {
    K.sky('#010309', '#0a1f1a', 0.1);
    K.fog('#03080c', 0.035);
    K.expo(expo);
  };
  // o gol sul do campo: as bolas amontoadas dentro (n bolas)
  const pile = (K, n) => {
    for (let i = 0; i < Math.min(n, 40); i++) {
      const row = i < 16 ? 0 : i < 28 ? 1 : 2;
      const kk = row === 0 ? i : row === 1 ? i - 16 : i - 28;
      const cnt = [16, 12, 12][row];
      K.ball(52.1 + (kk + 0.5) * (1.8 / cnt) + (rnd(i, 51) - 0.5) * 0.04, 22.62 + (rnd(i, 52) - 0.5) * 0.16 + row * 0.04, 0.05 + row * 0.07, { k: 0.66 });
    }
  };
  const puddleCv = () =>
    canvas('puddle', 128, 64, (g, w, h) => {
      g.fillStyle = 'rgba(2,10,16,0.92)';
      g.beginPath();
      g.ellipse(w / 2, h / 2, w * 0.48, h * 0.44, 0, 0, TAU);
      g.fill();
      const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w * 0.45);
      gr.addColorStop(0, 'rgba(45,212,191,0.28)');
      gr.addColorStop(1, 'rgba(45,212,191,0)');
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = 'rgba(165,243,252,0.35)';
      g.lineWidth = 2;
      g.stroke();
    });
  const puddles = (K, list) => list.forEach(([x, y, r]) => K.floor({ x0: x - r, y0: y - r * 0.3, x1: x + r, y1: y + r * 0.3, z: 0.008, img: puddleCv(), color: '#ffffff', alpha: 0.999 }));
  const spot = (K, x, y, r = 1.4) => K.floor({ x0: x - r, y0: y - r * 0.6, x1: x + r, y1: y + r * 0.6, z: 0.006, img: CE.c3fGlowCv('rgba(224,242,254,0.45)'), color: '#ffffff', em: true, alpha: 0.999 });
  // o Rin caído na lama (pose que o 3D não tem: desenhada uma vez pela ajudante 2D)
  const lyingPose = (key, ch, o = {}) => pose('lying|' + key, (g, x, feet, size) => CE.bdorLying(g, ch, x + 0.43 * size, feet - 30, size, o));
  const crossPose = (key, ch, o = {}) =>
    pose('cross|' + key, (g, x, feet, size) => {
      g.save();
      g.translate(x, feet);
      g.rotate(o.lean || 0);
      CE.bdorSpr(g, ch, 0, 0, size, Object.assign({ cross: true }, o));
      g.restore();
    });
  const rinTr = (K, o) => K.actor('rin', Object.assign({ extra: Object.assign({ angry: true }, KIT_TR), k: 0.9, light: [0.45, 0.68, 0.74] }, o));
  const saeSuit = (K, o) => K.actor('sae', Object.assign({ extra: { outfit: 'suit' }, k: 0.9, light: [1.0, 0.82, 0.85] }, o));
  // a torre de refletor do canto (contraluz das cenas no campo)
  const TOWER = [60.7, 3.33, 22.7];
  const TOWER_NW = [45.3, 3.33, 6.3];

  // quadro: o punho do Rin tremendo (manga do terno)
  function cutShake(ctx, S, kIn, q) {
    const { W, top } = S;
    const c = cast();
    cut(
      ctx,
      [[24, top + 24], [470, top + 24], [470, top + 300], [24, top + 300]],
      (b, g) => {
        panelBg(g, b, '#3b2414', '#0d0705', 'rgba(0,0,0,0.4)');
        const tr = Math.sin(q * 160) * 4 * (0.4 + q);
        hand(g, b.x + b.w * 0.5 + b.ox + tr, b.y + b.h * 0.55, b.h * 0.48, { close: 1, skin: c.rin.skinColor, sleeve: '#111827', cuff: '#e5e7eb', ang: 0.1 });
      },
      kIn,
      [-60, 0]
    );
  }
  // quadro: o sapato social pisando na poça, a água espirrando
  function cutPuddle(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    cut(
      ctx,
      [[W - 520, bot - 250], [W - 22, bot - 270], [W - 22, bot - 22], [W - 540, bot - 22]],
      (b, g) => {
        // contraluz: o refletor estourado atrás; o sapato preto recortado contra a luz
        panelBg(g, b, '#e0f2fe', '#38bdf8', 'rgba(8,47,73,0.35)');
        g.fillStyle = '#0c4a6e';
        g.fillRect(b.x - 10, b.y + b.h * 0.8, b.w + 20, b.h * 0.3);
        // a poça (o reflexo do refletor)
        g.fillStyle = '#bae6fd';
        g.beginPath();
        g.ellipse(b.x + b.w * 0.5, b.y + b.h * 0.86, b.w * 0.42, b.h * 0.1, 0, 0, TAU);
        g.fill();
        const land = ease(seg(q, 0.1, 0.36));
        CA().boot(g, b.x + b.w * 0.46 + b.ox, b.y + b.h * lerp(0.42, 0.8, land), b.h * 0.2, { sock: '#111827', sock2: '#111827', boot: '#0b0f19', ang: lerp(0.35, 0.02, land) });
        // os pingos subindo
        const sp = seg(q, 0.36, 0.9);
        if (sp > 0 && sp < 1) {
          g.fillStyle = 'rgba(204,251,241,0.9)';
          for (let i = 0; i < 12; i++) {
            const a = Math.PI + (i / 11) * Math.PI;
            const d = b.w * 0.34 * ease(sp);
            g.fillRect(b.x + b.w * 0.5 + Math.cos(a) * d, b.y + b.h * 0.84 + Math.sin(a) * d * 0.55 + sp * sp * b.h * 0.3, 10, 10);
          }
        }
      },
      kIn,
      [60, 50]
    );
  }
  // quadro: o chapéu — a bola subindo por cima do carrinho do Rin
  function cutOver(ctx, S, kIn, q) {
    const { W, top } = S;
    cut(
      ctx,
      [[W * 0.5, top + 26], [W - 24, top + 14], [W - 44, top + 330], [W * 0.46, top + 350]],
      (b, g) => {
        g.fillStyle = '#e2e8f0';
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        CA().speedLines(g, -0.5, S.W, S.H, { color: 'rgba(15,23,42,0.4)', n: 34, t: q * 60, speed: 20, thick: 6 });
        // a chuteira do Rin deslizando por baixo (meião do treino)
        CA().boot(g, b.x + b.w * lerp(0.15, 0.4, q) + b.ox, b.y + b.h * 0.9, b.h * 0.13, { sock: KIT_TR.jerseyPrimary, sock2: KIT_TR.jerseySecondary, boot: '#e5e7eb', ang: 1.45 });
        // a bola passando por cima
        const bx = b.x + b.w * lerp(0.3, 0.78, q) + b.ox;
        const by = b.y + b.h * (0.75 - Math.sin(q * Math.PI) * 0.5);
        CA().ball(g, bx, by, b.h * 0.1, { rot: q * 6 });
      },
      kIn,
      [70, -40]
    );
  }
  // quadro: o reflexo na poça — a silhueta do Rin, os olhos acendendo; a chuva bate na água
  function cutReflect(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    const c = cast();
    cut(
      ctx,
      [[W * 0.5, top + 22], [W - 22, top + 22], [W - 22, bot - 22], [W * 0.5, bot - 22]],
      (b, g) => {
        g.fillStyle = '#021014';
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        // o refletor lá em cima, refletido
        g.fillStyle = 'rgba(224,242,254,0.5)';
        g.beginPath();
        g.arc(b.x + b.w * 0.78, b.y + b.h * 0.22, b.h * 0.06, 0, TAU);
        g.fill();
        // ele de joelhos refletido na água (o corpo inteiro, pequeno; os olhos acendem)
        CA().silhouette(g, c.rinTr, b.x + b.w * 0.45 + b.ox, b.y + b.h * 0.9, b.h * 0.62, { pose: 'kneel', view: 'front', fill: '#010608', rim: 'rgba(45,212,191,0.5)', eyes: q > 0.45 ? 'rgba(45,212,191,0.95)' : null, eyeV: 0.38 });
        // os círculos da chuva na água
        g.strokeStyle = 'rgba(165,243,252,0.6)';
        g.lineWidth = 5;
        for (let i = 0; i < 6; i++) {
          const ph = (q * 3 + rnd(i, 61)) % 1;
          g.beginPath();
          g.ellipse(b.x + rnd(i, 62) * b.w, b.y + rnd(i, 63) * b.h, 8 + ph * 60, 3 + ph * 20, 0, 0, TAU);
          g.globalAlpha = 1 - ph;
          g.stroke();
        }
        g.globalAlpha = 1;
      },
      kIn,
      [60, 0]
    );
  }

  CE.registerCine3D('rin_sae_licao', {
    phases: [300, 360, 330, 360, 420, 360, 380],
    music: 'dread',
    title: '🌧️ A LIÇÃO DO SAE',
    tags: ['PLANO 1 • O CORREDOR', 'PLANO 2 • GAROTO CHORÃO', 'PLANO 3 • UMA DA MANHÃ', 'PLANO 4 • JOGA COMIGO', 'PLANO 5 • 10 x 0', 'PLANO 6 • A LIÇÃO', 'PLANO 7 • O DESTRUIDOR'],
    subs: [
      [
        { from: 12, to: 196, who: 'SAE ITOSHI', text: '"Saindo no meio do discurso, Rin?"', color: SAE_C },
        { from: 204, who: 'RIN ITOSHI', text: '"Não enche."', color: RIN_C }
      ],
      [
        { from: 10, to: 186, who: 'SAE ITOSHI', text: '"Você é só um garoto chorão..."', color: SAE_C },
        { from: 188, who: 'SAE ITOSHI', text: '"...que não aceita perder."', color: SAE_C }
      ],
      [
        { from: 10, to: 168, who: 'NARRADOR', text: 'Uma da manhã. Campo vazio.', color: NARR_C },
        { from: 174, who: 'RIN ITOSHI', text: '(De novo. De novo. DE NOVO.)', color: RIN_C }
      ],
      [
        { from: 140, to: 246, who: 'SAE ITOSHI', text: '"Joga comigo."', color: SAE_C },
        { from: 250, who: 'RIN ITOSHI', text: '"Vou te esmagar."', color: RIN_C }
      ],
      [
        { from: 16, to: 112, who: 'SAE ITOSHI', text: '"Lento."', color: SAE_C },
        { from: 116, to: 262, who: 'SAE ITOSHI', text: '"Previsível. De novo."', color: SAE_C },
        { from: 270, who: 'RIN ITOSHI', text: '(Por que eu não alcanço?!)', color: RIN_C }
      ],
      [
        { from: 10, to: 150, who: 'SAE ITOSHI', text: '"Perder dói? Ótimo."', color: SAE_C },
        { from: 152, who: 'SAE ITOSHI', text: '"Para de chorar e transforma isso em fome."', color: SAE_C }
      ],
      [
        { from: 14, to: 140, who: 'RIN ITOSHI', text: '(...Fome.)', color: RIN_C },
        { from: 150, who: 'RIN ITOSHI', text: '"Aproveita o troféu enquanto pode."', color: RIN_C }
      ]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'nel_dome',
    scene(K, S) {
      CE.c3fCamFix(K);
      const { t, phase, f } = S;
      const st = (K.st = {});
      const c = cast();
      const sae = crossPose('sae', c.sae, { dim: 0.18, dimTint: '22,4,10', rim: '#e11d48', rimSides: [-1, 1], rimD: 2 });
      if (phase === 0 || phase === 1) {
        // o corredor do hotel: o Sae encostado na parede, de braços cruzados
        K.sky('#140b18', '#140b18', 0);
        K.fog('#140b18', 0.05);
        CE.c3fHotelHall(K, { amb: '#b07a50' });
        K.expo(0.85);
        poseSprite(K, sae, { x: 86.05, y: 11.0, light: [0.95, 0.75, 0.65] });
        if (phase === 0) {
          // o Rin vem pelo corredor e para antes do Sae; a câmera recua devagar na frente
          const wk = easeIO(seg(t, 0, 200));
          const walking = t < 196;
          rinTr(K, { x: lerp(85.5, 85.25, wk), y: lerp(6.8, 10.3, wk), ang: Math.PI / 2, extra: { outfit: 'suit', angry: true }, anim: walking ? 'run' : 'idle', frame: walking ? WALKF(f, 7) : 0, light: [0.8, 0.7, 0.62] });
          const k = easeIO(t / 300);
          K.cam([lerp(85.45, 85.35, k), 0.74, lerp(14.4, 14.85, k)], [85.5, 0.68, 9.5], lerp(46, 40, k));
        } else {
          const PASS = 300;
          if (t < PASS) {
            // os dois: o Rin parado no meio do corredor, virado para o Sae na parede; a
            // câmera chega devagar
            rinTr(K, { x: 85.25, y: 10.3, ang: 0.62, extra: { outfit: 'suit', angry: true }, frame: 0, light: [0.75, 0.66, 0.58] });
            const k = easeIO(t / PASS);
            K.cam([lerp(85.0, 85.05, k), lerp(0.78, 0.72, k), lerp(14.9, 14.0, k)], [lerp(85.55, 85.6, k), 0.62, 10.6], lerp(42, 40, k));
          } else {
            // o ombro: o Rin passa pelo Sae, trombando, e vem embora pelo corredor
            const u = t - PASS;
            const wk = seg(u, 0, 60);
            rinTr(K, { x: lerp(85.3, 85.55, wk), y: lerp(10.3, 12.3, wk), ang: Math.PI / 2, extra: { outfit: 'suit', angry: true }, anim: 'run', frame: WALKF(f, 3), light: [0.75, 0.66, 0.6] });
            const sh = u >= 22 ? 0.04 * Math.max(0, 1 - (u - 22) / 18) : 0.004;
            K.cam(shake(K, [85.1, 0.72, 14.9], f * 2, sh, 2), [85.6, 0.66, 10.6], 44);
          }
        }
        return;
      }
      if (phase === 2) {
        nightRain(K, 0.88);
        const CUT = 170;
        const N0 = 34;
        if (t < CUT) {
          // A GRUA: do alto, atrás do Rin, descendo até ele chutando sozinho na chuva
          const per = 26;
          const n = Math.max(0, Math.floor((t - 8) / per));
          const q = t < 8 ? 0 : (t - 8) % per;
          const kickT = 8 + n * per + 10;
          const landed = Math.max(0, Math.floor((t - 8 - 22) / per) + 1);
          pile(K, N0 + landed);
          const pz = q < 10 ? 'windup' : q < 18 ? 'shoot' : 'idle';
          rinTr(K, { x: 53, y: 19.6, ang: Math.PI / 2, anim: pz, frame: 1 });
          if (q < 10) K.ball(53.15, 19.85, 0.06);
          if (t >= kickT && t < kickT + 12) {
            const p = (t - kickT) / 12;
            K.ball(lerp(53.15, 52.4 + rnd(n, 3) * 1.2, ease(p)), lerp(19.85, 22.5, ease(p)), 0.06 + Math.sin(p * Math.PI) * 0.4 + p * 0.3);
          }
          spot(K, 53, 19.8, 1.6);
          const k = easeIO(t / CUT);
          K.cam(mixP([51.6, 2.4, 15.2], [52.5, 0.82, 17.1], k), mixP([52.9, 0.2, 20.5], [53.1, 0.5, 21.6], k), lerp(54, 46, k));
          st.tower = W3(TOWER[0], TOWER[1], TOWER[2]);
        } else {
          // de dentro do gol, atrás da rede: o Rin chutando em você
          const u = t - CUT;
          const per = 24;
          const n = Math.max(0, Math.floor((u - 6) / per));
          const q = u < 6 ? 0 : (u - 6) % per;
          const kickU = 6 + n * per + 9;
          pile(K, 44);
          const pz = q < 9 ? 'windup' : q < 16 ? 'shoot' : 'idle';
          rinTr(K, { x: 53, y: 19.8, ang: Math.PI / 2, anim: pz, frame: 1, light: [0.5, 0.74, 0.8] });
          let bp = null;
          if (u >= kickU && u < kickU + 9) {
            const p = (u - kickU) / 9;
            bp = [lerp(53.1, 52.6 + rnd(n, 7) * 0.8, p * p), lerp(20, 22.85, p * p), 0.1 + p * p * (0.3 + rnd(n, 8) * 0.5)];
            K.ball(bp[0], bp[1], bp[2]);
          }
          spot(K, 53, 19.8, 1.6);
          const k = easeIO(u / 160);
          K.cam([lerp(52.9, 53.15, k), 0.55, 22.85], [53, 0.55, 19.8], 50);
          st.hit = u >= kickU + 8 && u < kickU + 22 ? W3(52.6 + rnd(n, 7) * 0.8, 0.1 + 0.3 + rnd(n, 8) * 0.5, 22.85) : null;
          st.hitU = u - (kickU + 8);
        }
      } else if (phase === 3) {
        nightRain(K, 0.86);
        const CUT = 130;
        puddles(K, [[52.6, 15.4, 0.7], [54.2, 15.1, 0.9], [55.6, 15.3, 0.6], [51.2, 14.6, 0.5]]);
        if (t < CUT) {
          // rente ao chão: o Sae vem do escuro, passos nas poças; a câmera desliza
          const wx = lerp(57.4, 54.6, seg(t, 0, CUT));
          saeSuit(K, { x: wx, y: 15.0, ang: Math.PI, anim: 'run', frame: WALKF(f, 10), light: [0.45, 0.36, 0.4] });
          rinTr(K, { x: 51.6, y: 15.0, ang: Math.PI / 2, frame: 0, light: [0.4, 0.6, 0.66] });
          spot(K, 51.8, 15.0, 1.4);
          const k = easeIO(t / CUT);
          K.cam([lerp(53.4, 53.7, k), 0.14, 17.6], [lerp(55.6, 55.0, k), 0.3, 15.0], 46);
        } else {
          // o Sae entra na luz com a bola no pé; o Rin vira para ele
          const u = t - CUT;
          const wk = easeIO(seg(u, 0, 80));
          const sx = lerp(54.9, 54.2, wk);
          saeSuit(K, { x: sx, y: 15.0, ang: Math.PI, anim: wk < 1 ? 'run' : 'idle', frame: wk < 1 ? WALKF(f, 8) : 0 });
          rinTr(K, { x: 51.6, y: 15.0, ang: u < 40 ? Math.PI / 2 : 0, frame: 0 });
          let bz = 0.06;
          if (u > 110 && u < 200) bz = 0.06 + Math.abs(Math.sin(((u - 110) / 30) * Math.PI)) * 0.4;
          K.ball(sx - 0.18, 15.05, bz);
          [[51.1, 15.3], [52.3, 15.4], [50.9, 14.7]].forEach(([x, y]) => K.ball(x, y, 0.06, { k: 0.7 }));
          spot(K, 53.0, 15.0, 1.6);
          const k = easeIO(u / 230);
          K.cam([lerp(52.6, 53.0, k), lerp(0.66, 0.6, k), lerp(18.4, 17.9, k)], [52.95, 0.5, 15.0], lerp(46, 44, k));
        }
      } else if (phase === 4) {
        // 10 x 0: o mano a mano; a câmera acompanha de lado; câmera lenta numa das passadas
        nightRain(K, 0.9);
        spot(K, 53, 15.0, 1.8);
        const R = [6, 50, 92, 128, 160, 230, 256, 278, 296, 312];
        const END = 330;
        const SLOW = 5; // a passada em câmera lenta (o chapéu por cima do carrinho)
        let i = 0;
        for (let j = 0; j < R.length; j++) if (t >= R[j]) i = j;
        if (t < END) {
          const L = (R[i + 1] ?? END) - R[i];
          const q = (t - R[i]) / L;
          const dir = i % 2 ? -1 : 1;
          const slide = i % 2 === 0;
          const saeX = 53 + dir * lerp(-1.8, 1.8, q);
          const lunge = ease(seg(q, 0.24, 0.46));
          const rinX = 53 + dir * (0.3 - lunge * (slide ? 1.1 : 0.7));
          const over = Math.sin(seg(q, 0.3, 0.56) * Math.PI);
          const hop = slide ? over * 0.22 : over * 0.08;
          saeSuit(K, { x: saeX, y: 14.6, z: hop, ang: dir > 0 ? 0 : Math.PI, anim: 'run', frame: WALKF(f, 3) });
          K.ball(saeX + dir * 0.15, 14.62, 0.06 + hop * 0.6 + (slide ? over * 0.5 : 0));
          const rinAnim = lunge > 0 ? (slide ? 'dive' : 'run') : 'idle';
          rinTr(K, { x: rinX, y: 15.2, ang: dir > 0 ? Math.PI : 0, anim: rinAnim, frame: rinAnim === 'run' ? 5 : 0, opts: rinAnim === 'dive' ? { animTime: 20 } : undefined });
          const camX = 53 + K.noise(t * 0.4, 3) * 0.4 + dir * q * 0.4;
          K.cam([camX, i === SLOW ? 0.4 : 0.62, i === SLOW ? 17.6 : 18.4], [camX, 0.48, 14.9], i === SLOW ? 42 : 50);
        } else {
          // o Rin caído na lama; o Sae em pé, a bola debaixo do sapato
          poseSprite(K, lyingPose('rin', cast().rinTr, { dim: 0.3, dimTint: '0,12,18' }), { x: 53.0, y: 15.2, light: [0.42, 0.66, 0.72] });
          saeSuit(K, { x: 54.0, y: 14.7, ang: Math.PI / 2 + 0.6, frame: 0 });
          K.ball(53.85, 14.85, 0.06);
          const k = easeIO(seg(t, END, 420));
          K.cam([lerp(53.2, 53.4, k), lerp(0.62, 0.72, k), lerp(18.4, 17.7, k)], [53.4, 0.42, 14.9], lerp(50, 44, k));
        }
        st.slow = i === SLOW && t < END ? (t - R[SLOW]) / (R[SLOW + 1] - R[SLOW]) : -1;
      } else if (phase === 5) {
        // A LIÇÃO: de baixo, do lado do Rin caído; o Sae em pé contra o refletor; depois vai
        nightRain(K, 0.86);
        const LEAVE = 290;
        poseSprite(K, lyingPose('rin', cast().rinTr, { dim: 0.42, dimTint: '0,12,18' }), { x: 52.45, y: 16.4, light: [0.35, 0.55, 0.62] });
        puddles(K, [[52.9, 16.9, 0.6]]);
        if (t < LEAVE) {
          saeSuit(K, { x: 53.7, y: 15.3, ang: Math.PI / 2 + 0.4, frame: 0, light: [0.6, 0.48, 0.52] });
          K.ball(53.9, 15.45, 0.06);
        } else {
          const w = easeIO(seg(t, LEAVE, 360));
          K.ball(53.9, 15.45, 0.06);
          saeSuit(K, { x: lerp(53.7, 55.4, w), y: lerp(15.3, 13.0, w), ang: -Math.PI / 2 + 0.5, anim: 'run', frame: WALKF(f, 9), light: [0.5, 0.38, 0.42], alpha: 1 - 0.7 * w });
        }
        const k = easeIO(t / 360);
        // (do lado leste e de baixo: o Rin caído à esquerda, o Sae em pé à direita, contra o
        // refletor do canto noroeste)
        K.cam([lerp(55.6, 55.3, k), lerp(0.24, 0.3, k), lerp(18.2, 17.9, k)], [lerp(53.0, 53.1, k), 0.62, lerp(15.6, 15.8, k)], lerp(50, 46, k));
        st.tower = W3(TOWER_NW[0], TOWER_NW[1], TOWER_NW[2]);
      } else {
        // O DESTRUIDOR: de joelhos na lama; o reflexo; ele levanta contra o refletor
        nightRain(K, 0.86);
        const UP = 200;
        puddles(K, [[53.0, 15.6, 0.7]]);
        const kneel = t < UP - 30 ? 'kneel_down' : t < UP ? 'kneel_one' : 'idle';
        rinTr(K, { x: 53, y: 15.0, ang: Math.PI / 2, anim: kneel, frame: 0, light: t >= UP ? [0.55, 0.9, 0.92] : [0.36, 0.58, 0.64] });
        const k = easeIO(t / 380);
        const sh = t >= UP ? 0.035 * Math.max(0, 1 - (t - UP) / 18) : 0.002;
        if (t < UP) K.cam([lerp(52.6, 52.8, k), lerp(0.62, 0.42, k), lerp(17.6, 17.2, k)], [53, 0.32, 15.1], 46);
        else K.cam(shake(K, [lerp(52.75, 52.6, seg(t, UP, 380)), lerp(0.16, 0.12, seg(t, UP, 380)), lerp(17.0, 17.3, seg(t, UP, 380))], f * 2, sh, 3), [53.05, 0.9, 14.6], lerp(50, 54, seg(t, UP, 380)));
        st.tower = W3(TOWER[0], TOWER[1], TOWER[2]);
        st.eyes = W3(53, 0.72, 15.0);
        st.rin = W3(53, 0.5, 15.0);
      }
    },
    overlay(ctx, S, K) {
      CE.c3fCamBack();
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        CE.luckKicker(ctx, 40, top + 30, 'HOTEL DA GALA • 23:58', seg(t, 8, 48), GOLD);
      } else if (phase === 1) {
        const PASS = 300;
        if (t > 196 && t < 296) cutShake(ctx, S, seg(t, 196, 204), seg(t, 196, 296));
        if (t >= PASS + 22) CE.cineFlash(ctx, W, H, 0.25 * (1 - seg(t, PASS + 22, PASS + 30)), '#ccfbf1');
        CE.cineSfx(S, PASS + 22, 'ombro', () => window.SFX?.tackle?.());
      } else if (phase === 2) {
        const CUT = 170;
        if (t < CUT) {
          flare(ctx, S, st.tower, 0.7, '224,242,254', 1.0);
          CE.luckKicker(ctx, 40, top + 30, 'CAMPO DE TREINO • 01:07', seg(t, 8, 48), '#38bdf8');
          const per = 26;
          const n = Math.max(0, Math.floor((t - 8) / per));
          CE.cineSfx(S, 8 + n * per + 10, 'chute' + n, () => window.SFX?.kick?.(0.7));
          if (t > CUT - 8) CE.cineFlash(ctx, W, H, seg(t, CUT - 8, CUT) * 0.8, '#000000');
        } else {
          const u = t - CUT;
          // a rede em primeiro plano (a câmera está atrás do gol), estufando onde a bola bate
          const hp = st.hit;
          const hk = hp ? Math.max(0, 1 - st.hitU / 14) : 0;
          ctx.save();
          ctx.strokeStyle = 'rgba(241,245,249,0.28)';
          ctx.lineWidth = 2;
          const cell = 34;
          for (let i = -1; i <= W / cell + 1; i++) {
            ctx.beginPath();
            for (let y = top; y <= bot; y += 12) {
              let x = i * cell;
              let yy = y;
              if (hp) {
                const dx = x - hp.x;
                const dy = yy - hp.y;
                const d = Math.hypot(dx, dy) || 1;
                if (d < 200) {
                  const kk = Math.cos(((d / 200) * Math.PI) / 2) * hk * 40;
                  x += (dx / d) * kk;
                  yy += (dy / d) * kk;
                }
              }
              if (y === top) ctx.moveTo(x, yy);
              else ctx.lineTo(x, yy);
            }
            ctx.stroke();
          }
          for (let y = top; y <= bot; y += cell) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
          }
          ctx.restore();
          if (hp && hk > 0) CE.cineGlow(ctx, hp.x, hp.y, 70, 'rgba(204,251,241,0.5)', hk);
          CE.cineFlash(ctx, W, H, 0.8 * (1 - seg(u, 0, 10)), '#000000');
          const per = 24;
          const n = Math.max(0, Math.floor((u - 6) / per));
          CE.cineSfx(S, CUT + 6 + n * per + 17, 'rede' + n, () => window.SFX?.post?.());
        }
        rain(ctx, S, 1);
      } else if (phase === 3) {
        const CUT = 130;
        if (t < CUT) {
          if (t > 20 && t < 120) cutPuddle(ctx, S, seg(t, 20, 28), seg(t, 20, 120));
          [30, 62, 94].forEach((s, i) => CE.cineSfx(S, s, 'passo' + i, () => window.SFX?.blip?.(180)));
        } else {
          CE.cineFlash(ctx, W, H, 0.9 * (1 - seg(t - CUT, 0, 10)), '#000000');
        }
        CE.finSplashes(ctx, 0, W, H * 0.66, bot, t, 22);
        rain(ctx, S, 0.9);
      } else if (phase === 4) {
        const R = [6, 50, 92, 128, 160, 230, 256, 278, 296, 312];
        const END = 330;
        const passOf = (j) => R[j] + ((R[j + 1] ?? END) - R[j]) * 0.55;
        let score = 0;
        R.forEach((r, j) => {
          if (t >= passOf(j)) score = j + 1;
        });
        const lastPass = passOf(Math.max(0, score - 1));
        const pop = score > 0 ? 1 - seg(t, lastPass, lastPass + 10) : 0;
        // o placar do duelo, pequeno no alto
        ctx.save();
        ctx.translate(W / 2, top + 36);
        ctx.scale(0.62, 0.62);
        CE.bdorTally(ctx, 0, 0, score, pop);
        ctx.restore();
        // a passada em câmera lenta: o quadro do chapéu por cima do carrinho
        if (st.slow >= 0) cutOver(ctx, S, seg(st.slow, 0, 0.1), st.slow);
        R.forEach((r, j) => CE.cineSfx(S, passOf(j), 'passe' + j, () => window.SFX?.whoosh?.()));
        CE.cineSfx(S, END + 4, 'queda', () => window.SFX?.tackle?.());
        CE.finSplashes(ctx, 0, W, H * 0.62, bot, t, 26);
        rain(ctx, S, 1);
      } else if (phase === 5) {
        flare(ctx, S, st.tower, 0.85, '224,242,254', 1.2);
        CE.finSplashes(ctx, 0, W, H * 0.62, bot, t, 26);
        rain(ctx, S, 1);
      } else {
        const UP = 200;
        flare(ctx, S, st.tower, t >= UP ? 1 : 0.5, '224,242,254', t >= UP ? 1.3 : 0.9);
        if (t > 40 && t < 160) cutReflect(ctx, S, seg(t, 40, 48), seg(t, 40, 160));
        // ele levanta: o único quadro de impacto, e os olhos acesos (pequenos)
        if (t >= UP && t < UP + 2) impactFrame(ctx, W, H);
        if (t >= UP) {
          CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, UP + 1, UP + 9)), '#ccfbf1');
          eyeGlow(ctx, st.eyes, seg(t, UP, UP + 10), '45,212,191', 7);
        }
        CE.cineSfx(S, UP, 'levanta', () => window.SFX?.kick?.(1));
        CE.finSplashes(ctx, 0, W, H * 0.66, bot, t, 18, '165,243,252');
        rain(ctx, S, 1);
        const tk = seg(t, 300, 336);
        if (tk > 0) {
          ctx.fillStyle = `rgba(0,4,6,${0.7 * tk})`;
          ctx.fillRect(0, 0, W, H);
          CE.cineTitleCard(ctx, W, (top + bot) / 2, tk, { kicker: 'RIN ITOSHI • O DESTRUIDOR ACORDOU', title: 'A LIÇÃO DO SAE', sub: 'Próxima parada: a Copa do Mundo.', color: RIN_C });
          CE.cineSfx(S, 304, 'titulo', () => window.SFX?.kick?.(0.8));
        }
      }
    }
  });
})();
