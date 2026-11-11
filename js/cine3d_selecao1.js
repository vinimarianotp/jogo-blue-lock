// ============================================================================
// CUTSCENES EM 3D — 1ª SELEÇÃO, refeitas no padrão do gol da Sub-20 (js/cine3d_u20.js):
// câmera sempre viva (grua, travelling, push-in), câmera lenta com rampa só nos
// momentos-chave, no máximo um quadro de impacto e duas tremidas fortes por cena, closes
// só em quadros de mangá em pixel art (chuteira, bola, mão, joelho, silhueta), contraluz
// dos refletores e pouco texto na tela.
//   barou_king / barou_king_win • ego_victory • kuon_betrayal • chigiri_sprint
// Tudo no campo do Prédio 5 (o Time Z ataca o gol norte), no vestiário e no túnel do treino.
// Kit: js/cine3d_kit.js. Arte dos quadros: js/cine_art.js (CE.ART).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;

  // ---------------------------------------------------------------- tempo e contas
  const TAU = Math.PI * 2;
  const PI = Math.PI;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mixP = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  // tempo da ação com câmera lenta (rampa): keys = [[tempo real, tempo da ação], ...]
  const remap = (t, keys) => {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    }
    return keys[keys.length - 1][1] + (t - keys[keys.length - 1][0]);
  };
  // batida do coração: 1 no instante da batida, caindo em 14 quadros
  const beatOf = (t, beats) => beats.reduce((m, b) => Math.max(m, t >= b ? 1 - seg(t, b, b + 14) : 0), 0);

  // ---------------------------------------------------------------- 3D (pontos [x, y, altura])
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  const ball = (K, p, o) => K.ball(p[0], p[1], p[2] || 0, o);
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp, p[2] + K.noise(f, seed + 7) * amp * 0.6];
  const W3 = (p) => ({ __w: p });
  const onScreen = (K) => {
    const st = {};
    Object.keys(K.st || {}).forEach((k) => {
      const v = K.st[k];
      st[k] = v && v.__w ? K.screen(v.__w[0], v.__w[2], v.__w[1]) : v;
    });
    return st;
  };
  const paint = (w, h, fn) => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    cv.g = g;
    if (fn) fn(g, w, h);
    return cv;
  };
  const ART = new Map();
  const art = (key, w, h, fn) => {
    let cv = ART.get(key);
    if (!cv) ART.set(key, (cv = paint(w, h, fn)));
    return cv;
  };
  // torres dos refletores do campo (lâmpadas a ~3,3 de altura)
  const TOWERS = [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]];
  const LAMP_Z = 3.33;
  // câmera de frente para p, com a torre t atrás dele (contraluz), a dist ladrilhos
  const backlit = (p, tower, dist) => {
    const dx = p[0] - tower[0];
    const dy = p[1] - tower[1];
    const d = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / d) * dist, p[1] + (dy / d) * dist];
  };

  // sombra comprida no gramado (luz de um refletor)
  let SHADOW = null;
  const shadowCv = () =>
    SHADOW ||
    (SHADOW = paint(64, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0.62)');
      gr.addColorStop(0.55, 'rgba(0,0,0,0.38)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, TAU);
      g.fill();
    }));
  function longShadow(K, x, y, len, ang, w, a) {
    if (a <= 0.01) return;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const px = -dy;
    const py = dx;
    const h = 0.006;
    const q0 = [x - px * w * 0.5, h, y - py * w * 0.5];
    const q1 = [x + px * w * 0.5, h, y + py * w * 0.5];
    const q2 = [x + dx * len + px * w * 0.35, h, y + dy * len + py * w * 0.35];
    const q3 = [x + dx * len - px * w * 0.35, h, y + dy * len - py * w * 0.35];
    const V = (p, u, v) => [p[0], p[1], p[2], u, v, 0, 1, 0];
    const v = [].concat(V(q0, 0, 0.5), V(q1, 1, 0.5), V(q2, 1, 1), V(q0, 0, 0.5), V(q2, 1, 1), V(q3, 0, 1));
    K._push(v, { img: shadowCv(), color: '#000000', alpha: a });
  }
  // a sombra que um refletor (o mais perto) faz de quem está em p
  const towerShadow = (K, p, a = 0.3, len = 1.3) => {
    let best = TOWERS[0];
    let bd = 1e9;
    TOWERS.forEach((tw) => {
      const d = Math.hypot(p[0] - tw[0], p[1] - tw[1]);
      if (d < bd) {
        bd = d;
        best = tw;
      }
    });
    longShadow(K, p[0], p[1], len, Math.atan2(p[1] - best[1], p[0] - best[0]), 0.28, a);
  };
  // mancha de luz no chão (holofote, brilho do Rei)
  const DISC = {};
  const lightDisc = (K, x, y, r, color, alpha, z = 0.014) => {
    const cv = DISC[color] || (DISC[color] = paint(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    }));
    K.floor({ x0: x - r, y0: y - r, x1: x + r, y1: y + r, z, img: cv, em: true, alpha });
  };

  // ---------------------------------------------------------------- pós (no overlay)
  function bwBlue(ctx, W, H, a = 1, circle = null) {
    if (a <= 0) return;
    ctx.save();
    if (circle) {
      ctx.beginPath();
      if (circle.inside) ctx.arc(circle.x, circle.y, Math.max(0, circle.r), 0, TAU);
      else {
        ctx.rect(0, 0, W, H);
        ctx.arc(circle.x, circle.y, Math.max(0, circle.r), 0, TAU, true);
      }
      ctx.clip('evenodd');
    }
    ctx.globalAlpha = clamp(a);
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = clamp(a) * 0.32;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
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
  function flares(ctx, K, S, k = 1, tint = '186,230,253') {
    if (k <= 0) return;
    const { W, H } = S;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    TOWERS.forEach(([x, y]) => {
      const p = K.screen(x, LAMP_Z, y);
      if (!p || p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 120) return;
      CE.cineGlow(ctx, p.x, p.y, 120, 'rgba(255,255,255,0.5)', k);
      CE.cineGlow(ctx, p.x, p.y, 38, 'rgba(255,255,255,0.95)', k);
      const gr = ctx.createLinearGradient(p.x - 400, 0, p.x + 400, 0);
      gr.addColorStop(0, `rgba(${tint},0)`);
      gr.addColorStop(0.5, `rgba(${tint},${0.5 * k})`);
      gr.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(p.x - 400, p.y - 2, 800, 4);
      const cx = W / 2;
      const cy = H / 2;
      [[0.45, 26, 'rgba(56,189,248,0.22)'], [0.8, 14, 'rgba(250,204,21,0.2)'], [1.3, 40, 'rgba(99,102,241,0.14)']].forEach(([f, r, col]) => {
        CE.cineGlow(ctx, p.x + (cx - p.x) * f * 2, p.y + (cy - p.y) * f * 2, r, col, k);
      });
    });
    ctx.restore();
  }
  // a rede em primeiro plano (de dentro do gol) estufando onde a bola bate
  function netOverlay(ctx, S, hit, q, a = 0.5) {
    const { W, top, bot } = S;
    const N = 26;
    const cell = W / N;
    const bulge = (x, y) => {
      if (!hit || q <= 0) return [x, y];
      const dx = x - hit.x;
      const dy = y - hit.y;
      const d = Math.hypot(dx, dy) || 1;
      const R = 260;
      if (d > R) return [x, y];
      const k = Math.cos(((d / R) * Math.PI) / 2) * q;
      return [x + (dx / d) * k * 70, y + (dy / d) * k * 70];
    };
    ctx.save();
    ctx.strokeStyle = `rgba(241,245,249,${a})`;
    ctx.lineWidth = 2;
    for (let i = -2; i <= N + 2; i++) {
      for (let side = 0; side < 2; side++) {
        ctx.beginPath();
        for (let j = 0; j <= 30; j++) {
          const y = top + ((bot - top) * j) / 30;
          const x = side ? i * cell - (j % 2) * cell * 0.5 + cell * 0.5 : i * cell + (j % 2) * cell * 0.5;
          const [bx, by] = bulge(x, y);
          if (j) ctx.lineTo(bx, by);
          else ctx.moveTo(bx, by);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // a rede estufando: bola batendo (onde, e há quantos quadros)
  const netHit = (ctx, S, st, t, at) => netOverlay(ctx, S, t >= at ? st.ball : null, t >= at ? Math.max(0, 1 - (t - at) / 40) * Math.abs(Math.cos((t - at) * 0.25)) : 0);
  // olhos acesos na contraluz: p = [x, y, z dos olhos]
  function litEyes(ctx, K, p, on, color = 'rgba(0,245,212,0.9)') {
    if (on <= 0) return;
    const a = K.screen(p[0], p[2], p[1]);
    const b = K.screen(p[0], p[2] + 0.1, p[1]);
    if (!a || !b) return;
    const u = Math.abs(a.y - b.y) * 10;
    [-1, 1].forEach((s) => {
      CE.cineGlow(ctx, a.x + s * u * 0.06, a.y, u * 0.07, color, on);
      CE.cineGlow(ctx, a.x + s * u * 0.06, a.y, u * 0.02, 'rgba(240,253,250,1)', on);
    });
  }
  // raio do círculo de cor em volta de um boneco (pela altura dele na tela)
  const figR = (st, def) => (st.feet && st.top ? Math.abs(st.feet.y - st.top.y) * 0.62 : def);
  // placar de TV do Time Z (pequeno, no canto)
  const scoreZ = (ctx, S, away, awayCol, hg, ag, clock, k = 1, flash = 0) => CE.luckScore(ctx, { home: 'TIME Z', away, homeCol: '#1d4ed8', awayCol }, S.W - 440, S.top + 18, hg, ag, clock, 0.85 * k, flash);

  // ---------------------------------------------------------------- quadros de mangá (pixel art)
  const PIX = 6;
  const manga = (ctx, poly, k, from, draw) => {
    const CA = CE.ART;
    if (!CA || k <= 0) return;
    CA.panel(ctx, poly, (b, g) => draw(CA, b, g), { k, from, pixel: PIX });
  };
  // a chuteira e a bola
  function artBoot(CA, b, g, o) {
    g.fillStyle = o.bg || '#dbe4ef';
    g.fillRect(b.x, b.y, b.w, b.h);
    const bx = b.x + b.w * (o.bx ?? 0.6) + b.ox;
    const by = b.y + b.h * (o.by ?? 0.62);
    if (o.radial) CA.speedRadial(g, bx, by, b.x + b.w * 2, b.y + b.h * 2, { color: o.radial, inner: b.h * 0.22, n: 56, thick: 1.6 });
    if (o.lines !== undefined) CA.speedLines(g, o.lines, b.x + b.w * 2, b.y + b.h * 2, { color: 'rgba(15,23,42,0.5)', n: 30, t: o.t || 0, speed: 24, thick: 7 });
    if (o.burst) CA.burst(g, bx, by, b.h * 0.3 * o.burst, { fill: '#f8fafc', stroke: '#0b0f19', lw: 12 });
    if (o.aura) {
      g.fillStyle = o.aura;
      g.beginPath();
      g.arc(bx, by, b.h * 0.22, 0, TAU);
      g.fill();
    }
    CA.ball(g, bx, by, b.h * (o.ballR ?? 0.16), { rot: o.rot || 0 });
    CA.boot(g, b.x + b.w * o.fx + b.ox, b.y + b.h * o.fy, b.h * (o.s ?? 0.15), { sock: o.sock, sock2: o.sock2, boot: o.boot, ang: o.ang, flip: o.flip });
    if (o.tone) CA.halftone(g, b.x, b.y, b.w, b.h, { color: 'rgba(15,23,42,0.3)', from: 'bottom', step: 14 });
  }
  // a mão (pixel art do jogo); drop = gota caindo na palma (0..1)
  function artHand(CA, b, g, o) {
    g.fillStyle = o.bg || '#0b1730';
    g.fillRect(b.x, b.y, b.w, b.h);
    if (o.rays) CA.speedRadial(g, b.x + b.w * 0.5, b.y + b.h * 0.55, b.x + b.w * 2, b.y + b.h * 2, { color: o.rays, inner: b.h * 0.3, n: 40, thick: 1.2 });
    const cv = CE.zselHandCv && CE.zselHandCv(o.skin || '#f3d1b8');
    if (cv) {
      const s = Math.max(PIX, Math.floor((b.h * 0.8) / cv.height / PIX) * PIX);
      const hx = b.x + b.w * 0.5 - (cv.width * s) / 2 + b.ox + (o.jit || 0);
      const hy = b.y + b.h * 0.12;
      g.imageSmoothingEnabled = false;
      g.drawImage(cv, hx, hy, cv.width * s, cv.height * s);
      if (o.drop > 0) {
        const dk = clamp(o.drop);
        if (dk < 1) {
          g.fillStyle = '#bae6fd';
          g.fillRect(hx + 7 * s, lerp(b.y - 20, hy + 11 * s, dk * dk), s, s * 1.6);
        } else {
          g.strokeStyle = 'rgba(186,230,253,0.9)';
          g.lineWidth = PIX;
          g.beginPath();
          g.ellipse(hx + 7.5 * s, hy + 11.8 * s, s * (1 + (o.ring || 0) * 3), s * (0.4 + (o.ring || 0)), 0, 0, TAU);
          g.stroke();
        }
      }
    }
  }
  // uma corrente (elos alternados) de (x0, y0) a (x1, y1); gap = rompida no meio (0..1)
  function chainArt(g, x0, y0, x1, y1, link, gap = 0) {
    const d = Math.hypot(x1 - x0, y1 - y0) || 1;
    const n = Math.max(2, Math.floor(d / (link * 0.78)));
    const ux = (x1 - x0) / d;
    const uy = (y1 - y0) / d;
    const ang = Math.atan2(uy, ux);
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      let x = x0 + (x1 - x0) * f;
      let y = y0 + (y1 - y0) * f;
      if (gap > 0) {
        if (Math.abs(f - 0.5) < 0.06) continue;
        const side = f < 0.5 ? -1 : 1;
        x += side * ux * gap * link * 3 - uy * gap * link * 2 * (1 - Math.abs(f - 0.5) * 2);
        y += side * uy * gap * link * 3 + ux * gap * link * 2 * (1 - Math.abs(f - 0.5) * 2) + gap * gap * link * 4;
      }
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.strokeStyle = '#0b0f19';
      g.lineWidth = link * 0.42;
      g.beginPath();
      if (i % 2) g.ellipse(0, 0, link * 0.5, link * 0.16, 0, 0, TAU);
      else g.ellipse(0, 0, link * 0.5, link * 0.3, 0, 0, TAU);
      g.stroke();
      g.strokeStyle = i % 2 ? '#9ca3af' : '#d1d5db';
      g.lineWidth = link * 0.22;
      g.stroke();
      g.restore();
    }
  }

  // ---------------------------------------------------------------- elenco
  const YOU_C = '#00f5d4';
  const BAROU_C = '#ef4444';
  const CHI_C = '#fb7185';
  const RAICHI_C = '#facc15';
  const KUON_C = '#a5b4fc';
  const BL = { kit: 'blueLock' };
  const KX = { jerseyPrimary: '#111827', jerseySecondary: '#dc2626' };
  const KY = { jerseyPrimary: '#b91c1c', jerseySecondary: '#0a0a0a' };
  const T = {
    you: ['you', BL],
    bachira: ['bachira', BL],
    kunigami: ['kunigami', BL],
    chigiri: ['chigiri', BL],
    raichi: ['raichi', { kit: 'blueLock', extra: { angry: true } }],
    igarashi: ['igarashi', BL],
    kuon: ['kuon', BL],
    iemon: ['iemon', {}],
    barou: ['barou', { extra: KX }],
    barouA: ['barou', { extra: Object.assign({ angry: true }, KX) }],
    xa: ['gen_teamx_a', {}],
    xb: ['gen_teamx_b', {}],
    xc: ['gen_teamx_c', {}],
    gkx: ['gk_teamx', {}],
    niko: ['niko', { extra: KY }],
    okawa: ['okawa', {}],
    ya: ['gen_teamy_a', {}],
    gky: ['gk_teamy', {}],
    wj: ['wanima_junichi', {}],
    wk: ['wanima_keisuke', {}],
    wjG: ['wanima_junichi', { extra: { mouth: 'grin' } }],
    wkG: ['wanima_keisuke', { extra: { mouth: 'grin' } }],
    wa: ['gen_teamw_a', {}],
    gkw: ['gk_teamw', {}]
  };
  const A = (K, who, p, o = {}) => {
    const [id, base] = T[who];
    return K.actor(id, Object.assign({}, base, { x: p[0], y: p[1], z: p[2] || 0 }, o));
  };
  const cdOf = (K, who) => {
    const [id, base] = T[who];
    return K.charData(id, base);
  };
  // gols: o norte (o Time Z ataca) e o sul (o Time Z defende)
  const GOAL_N = 6.62;
  const GOAL_S = 22.38;

  // ==========================================================================
  // 1. O REI (Time Z x Time X) — derrota (barou_king) e vitória (barou_king_win)
  // A estreia: a grua desce até o Barou no círculo central; o Rei atravessa o campo sozinho
  // (três trancos) e chuta em câmera lenta; a rede estufa de novo e de novo; na derrota ele
  // passa por você ("Some do meu campo") e a grua sobe deixando você de joelhos, pequeno;
  // na vitória o seu chute vira o jogo e os dois se encaram na contraluz dos refletores.
  // ==========================================================================
  const BAROU_AT = [53.0, 13.4];
  const ZL = { you: [52.4, 15.7], bachira: [54.6, 16.0], kunigami: [48.9, 17.3], raichi: [50.4, 16.2], kuon: [53.6, 17.9], igarashi: [51.0, 18.3] };
  const XL = { gkx: [53, 7.0], xa: [51.4, 10.4], xb: [49.8, 12.0], xc: [56.2, 11.6] };
  // o lance do Rei: ele desce o campo (y) até o chute; os três que tentam parar (quando, quem)
  const BAROU_RUN = (A0) => [53.2 + Math.sin(A0 * 0.05) * 0.12, lerp(BAROU_AT[1], 19.6, seg(A0, 0, 226))];
  const TRANCOS = [['kuon', 70], ['raichi', 138], ['igarashi', 196]];
  const BSHOT = 232; // (tempo da ação) o chute do Rei
  const barouShot = (u) => {
    // u = quadros desde o chute; entra no gol sul em ~20
    const p0 = [53.3, 19.95, 0.12];
    const p1 = [53.4, GOAL_S + 0.25, 0.55];
    const k = seg(u, 0, 20);
    return u < 20 ? [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k), lerp(p0[2], p1[2], k) + Math.sin(k * PI) * 0.12] : [p1[0], p1[1] + 0.05, Math.max(0.1, 0.55 - (u - 20) * 0.02)];
  };
  // de dentro do gol sul olhando o campo; a bola entra e a rede estufa (para os 3 gols)
  const southNet = (K, S, b, sh, f) => cam(K, shake(K, [lerp(52.75, 53.25, S.t / S.dur), 22.78, 0.46], f * 2, sh, 5), [53.0, 19.2, 0.5], 60);

  const barouScene = (K, S, win) => {
    const { t, phase, f } = S;
    const st = (K.st = {});
    K.expo(0.98);
    if (phase === 0) {
      // A ESTREIA: a grua desce do canto até o meio-campo; depois o Rei, de frente
      const cut = 160;
      lightDisc(K, BAROU_AT[0], BAROU_AT[1], 1.2, 'rgba(239,68,68,0.9)', 0.5 + 0.12 * Math.sin(t * 0.06));
      Object.keys(XL).forEach((w) => A(K, w, XL[w], { face: [53, 16], frame: 0 }));
      A(K, 'barou', BAROU_AT, { face: [53, 18], frame: 0, light: [1.3, 0.82, 0.78] });
      Object.keys(ZL).forEach((w) => A(K, w, ZL[w], { face: [ZL[w][0], 8], frame: 0 }));
      A(K, 'iemon', [53, 21.9], { face: [53, 14], frame: 0 });
      [BAROU_AT, ZL.you, ZL.bachira, ZL.raichi, XL.xa, XL.xc].forEach((p) => towerShadow(K, p, 0.24));
      if (t < cut) {
        const k = easeIO(seg(t, 0, cut));
        cam(K, shake(K, mixP([59.4, 21.8, 3.1], [57.3, 19.5, 1.0], k), f * 0.5, 0.006), mixP([53.0, 13.0, 0.2], [53.3, 13.8, 0.5], k), lerp(58, 44, k));
      } else {
        // o Rei de frente, entre os dois times (os do Time Z ficam fora do quadro)
        const k = easeIO(seg(t, cut, 240));
        cam(K, shake(K, [lerp(55.55, 55.3, k), lerp(14.75, 14.55, k), 0.48], f * 0.4, 0.004), [BAROU_AT[0], BAROU_AT[1], lerp(0.66, 0.7, k)], lerp(46, 42, k));
      }
      st.king = W3([BAROU_AT[0], BAROU_AT[1], 0.5]);
    } else if (phase === 1) {
      // O REI ATRAVESSA: câmera de lado, na altura da bola, acompanhando; três trancos
      // e o chute em câmera lenta (rampa)
      const A0 = remap(t, [[0, 0], [218, 218], [262, BSHOT + 2], [300, 270]]);
      const pos = BAROU_RUN(A0);
      const shot = A0 >= BSHOT;
      const anim = A0 < BSHOT - 14 ? 'run' : A0 < BSHOT ? 'windup' : 'shoot';
      A(K, 'barou', pos, { face: [53, 23], anim, frame: anim === 'run' ? Math.floor(A0 * 0.5) : 4, light: [1.25, 0.86, 0.82] });
      towerShadow(K, pos, 0.28);
      TRANCOS.forEach(([who, at], i) => {
        const u = A0 - at;
        if (u < -70 || u > 64) return;
        const yAt = BAROU_RUN(at)[1];
        if (u < 0) {
          A(K, who, [53.25, yAt + 0.55 - u * 0.03], { face: pos, anim: 'run', frame: Math.floor(A0 * 0.5) });
          return;
        }
        // o tranco: voa de lado, para longe da câmera, e cai
        const kk = seg(u, 0, 30);
        A(K, who, [53.5 + ease(kk) * 1.3, yAt + 0.5 - kk * 0.4, Math.sin(kk * PI) * (0.36 + i * 0.05)], { face: [51, yAt], anim: 'dive', opts: { animTime: kk * 30 }, alpha: 1 - seg(u, 44, 64) });
      });
      let b;
      if (!shot) b = [pos[0] + 0.05, pos[1] + 0.32, 0.05 + Math.abs(Math.sin(A0 * 0.3)) * 0.06];
      else b = barouShot(A0 - BSHOT);
      ball(K, b);
      A(K, 'iemon', [53, 21.7], { face: [53, 14], anim: A0 > BSHOT + 4 ? 'dive' : 'idle', opts: A0 > BSHOT + 4 ? { animTime: (A0 - BSHOT) * 2 } : undefined, frame: 0 });
      const after = shot ? ease(seg(A0, BSHOT, BSHOT + 34)) : 0;
      const sh = shot ? 0.035 * Math.max(0, 1 - (A0 - BSHOT) / 26) : 0.006;
      cam(K, shake(K, [50.2, pos[1] + 0.3 - after * 0.4, 0.5], f * 2, sh, 2), [lerp(pos[0], 53.2, after), pos[1] + 0.6 + after * 1.6, 0.48], 46);
      st.A = A0;
      st.foot = W3([pos[0] + 0.05, pos[1] + 0.32, 0.1]);
    } else if (phase === 2) {
      // DE NOVO E DE NOVO: a rede estufa (de dentro do gol), o Rei na contraluz, mais dois
      // gols em cortes secos e você parado no meio do campo
      if (t < 64) {
        const u = t + 2;
        const b = barouShot(u);
        ball(K, b, { k: 0.9 });
        A(K, 'barou', [53.3, 19.6], { face: [53, 23], anim: 'shoot', frame: 4, light: [1.2, 0.85, 0.8] });
        const kk = seg(t, 2, 24);
        A(K, 'iemon', [lerp(52.4, 53.6, ease(kk)), 20.6], { face: [53, 14], z: Math.sin(kk * PI) * 0.2, anim: 'dive', opts: { animTime: kk * 30 } });
        southNet(K, S, b, t >= 18 ? 0.012 * (1 - seg(t, 18, 40)) : 0.002, f);
        st.ball = W3(b);
      } else if (t < 140) {
        // o Rei de braço erguido contra o refletor
        const bp = [53.4, 19.8];
        lightDisc(K, bp[0], bp[1], 1.0, 'rgba(239,68,68,0.9)', 0.55);
        A(K, 'barou', bp, { face: [53, 12], anim: 'call_pass', frame: 4, light: [0.42, 0.2, 0.2] });
        A(K, 'iemon', [55.0, 21.5], { face: [53, 14], anim: 'sit_floor', frame: 0, light: [0.5, 0.5, 0.6] });
        const e = backlit(bp, TOWERS[1], 2.6);
        const k = easeIO(seg(t, 64, 140));
        cam(K, [e[0] + 0.2, e[1], lerp(0.26, 0.4, k)], [bp[0], bp[1], lerp(0.95, 1.1, k)], 46);
        st.eyes = W3([bp[0], bp[1], 0.57]);
      } else if (t < 204) {
        // mais dois: cortes secos na rede
        const at = t < 172 ? 140 : 172;
        const u = (t - at) * 1.2 + 8;
        const sx = at === 140 ? 52.6 : 53.7;
        const k = seg(u, 0, 20);
        const b = u < 20 ? [lerp(53.0, sx, k), lerp(19.6, GOAL_S + 0.25, k), lerp(0.15, at === 140 ? 0.7 : 0.35, k)] : [sx, GOAL_S + 0.3, 0.3];
        ball(K, b, { k: 0.9 });
        A(K, 'iemon', [at === 140 ? 53.6 : 52.4, 20.7], { face: [53, 14], anim: 'dive', opts: { animTime: 26 } });
        A(K, 'barou', [53.0, 18.6], { face: [53, 23], anim: 'shoot', frame: 4, light: [1.2, 0.85, 0.8] });
        southNet(K, S, b, 0.004, f);
        st.ball = W3(b);
        st.at = at;
      } else {
        // você, parado, olhando o próprio gol; o Rei volta para o meio atrás de você
        const k = easeIO(seg(t, 204, 290));
        A(K, 'you', ZL.you, { face: [52.6, 22], frame: 0, light: [0.6, 0.66, 0.85] });
        A(K, 'bachira', [54.6, 15.2], { face: [53, 22], frame: 0, light: [0.55, 0.6, 0.78] });
        A(K, 'kunigami', [50.4, 15.4], { face: [53, 22], frame: 0, light: [0.55, 0.6, 0.78] });
        const bx = lerp(55.8, 50.6, easeIO(seg(t, 214, 290)));
        A(K, 'barou', [bx, 13.9], { face: [bx - 2, 13.9], anim: 'run', frame: Math.floor(f * 0.4), light: [1.1, 0.8, 0.78] });
        cam(K, shake(K, [lerp(53.0, 52.85, k), lerp(18.35, 18.15, k), 0.58], f * 0.4, 0.004), [ZL.you[0], ZL.you[1], 0.58], lerp(44, 41, k));
      }
    } else if (!win && phase === 3) {
      // NENHUM TALENTO: os dois de perfil; o Rei passa trombando no seu ombro
      const you = [52.55, 15.2];
      const bump = 232;
      const walk = seg(t, 196, 300);
      const bx = t < 196 ? 53.45 : lerp(53.45, 50.4, walk);
      const by = t < 196 ? 15.2 : 15.2 + Math.sin(seg(t, 196, 250) * PI) * 0.12;
      A(K, t < 196 ? 'barouA' : 'barou', [bx, by], { face: t < 196 ? you : [bx - 2, by], anim: t < 196 ? 'idle' : 'run', frame: t < 196 ? 0 : Math.floor(f * 0.4), light: [1.25, 0.82, 0.8] });
      const hit = t >= bump && t < bump + 24;
      A(K, 'you', [you[0] + (t >= bump ? Math.min(0.12, (t - bump) * 0.01) : 0), you[1]], { face: [53.45, 15.2], anim: hit ? 'stun' : 'idle', frame: 0, light: [0.62, 0.68, 0.88] });
      towerShadow(K, you, 0.3);
      towerShadow(K, [bx, by], 0.3);
      const k = easeIO(t / 330);
      const sh = t >= bump ? 0.03 * Math.max(0, 1 - (t - bump) / 26) : 0.004;
      cam(K, shake(K, [lerp(52.6, 53.3, k), lerp(17.75, 17.55, k), 0.55], f * 2, sh, 3), [lerp(53.0, 52.8, k), 15.2, 0.62], lerp(42, 40, k));
    } else if (!win && phase === 4) {
      // A DISTÂNCIA: você de joelhos; a grua sobe e se afasta; o mundo perde a cor
      const you = [53.0, 15.4];
      A(K, 'you', you, { face: [53, 22], anim: 'kneel_down', frame: 0, light: [0.6, 0.66, 0.86] });
      towerShadow(K, you, 0.32, 1.6);
      ['xa', 'xc', 'xb'].forEach((w, i) => A(K, w, [51.2 + i * 1.7, 20.4 + (i % 2) * 0.5, Math.abs(Math.sin(t * 0.12 + i)) * 0.15], { face: [52 + i, 14], anim: 'celebrate' }));
      A(K, 'barou', [54.8, lerp(19.2, 21.0, t / 330)], { face: [55, 24], anim: 'run', frame: Math.floor(f * 0.35), light: [1.0, 0.72, 0.72] });
      A(K, 'bachira', [56.2, 13.6], { face: [54, 15], frame: 0, light: [0.5, 0.55, 0.7] });
      const k = easeIO(t / 330);
      cam(K, mixP([55.3, 13.3, 0.5], [57.4, 11.2, 2.9], k), mixP([53.0, 15.4, 0.38], [53.2, 16.0, 0.1], k), lerp(44, 52, k));
      st.you = W3([you[0], you[1], 0.3]);
    } else if (win && phase === 3) {
      const shotEnd = 150;
      const netEnd = 232;
      if (t < shotEnd) {
        // A VIRADA: de perfil, rente ao chão; o tempo para, o quadro do pé na bola e o chute
        const A0 = remap(t, [[0, 0], [52, 52], [112, 66], [150, 104]]);
        const KT = 66;
        const you = [lerp(51.7, 52.45, ease(seg(A0, 0, 62))), lerp(12.1, 10.55, ease(seg(A0, 0, 62)))];
        const an = A0 < 54 ? 'run' : A0 < KT ? 'windup' : 'shoot';
        A(K, 'you', you, { face: [53.4, 6], anim: an, frame: an === 'run' ? Math.floor(A0 * 0.5) : 4 });
        towerShadow(K, you, 0.28);
        let b;
        if (A0 < KT) b = [lerp(53.6, 52.62, ease(seg(A0, 0, KT))), lerp(9.6, 10.25, ease(seg(A0, 0, KT))), 0.05 + Math.abs(Math.sin(A0 * 0.2)) * 0.08 * (1 - seg(A0, 40, KT))];
        else {
          const q = (A0 - KT) / 30;
          b = [lerp(52.62, 52.4, clamp(q)), lerp(10.25, 7.0, clamp(q)), lerp(0.08, 0.6, clamp(q))];
        }
        ball(K, b);
        A(K, 'barou', [lerp(54.8, 54.0, ease(seg(A0, 0, 80))), lerp(9.0, 9.6, ease(seg(A0, 0, 80)))], { face: you, anim: 'run', frame: Math.floor(A0 * 0.5), light: [1.15, 0.8, 0.78] });
        A(K, 'gkx', [53, 7.2], { face: you, frame: 0 });
        const sh = A0 >= KT ? 0.035 * Math.max(0, 1 - (A0 - KT) / 24) : 0.004;
        cam(K, shake(K, [49.4, lerp(11.5, 11.0, seg(A0, 0, KT)), 0.32], f * 2, sh, 6), [52.4, 10.4, 0.5], lerp(46, 42, seg(A0, 0, KT)));
        st.A = A0;
        st.foot = W3([52.6, 10.25, 0.1]);
        st.ball = W3(b);
      } else if (t < netEnd) {
        // a rede, de dentro do gol norte; o Rei parado lá atrás
        const u = t - shotEnd;
        const HIT = 16;
        const b = u < HIT ? [lerp(52.5, 52.35, u / HIT), lerp(8.6, 6.32, u / HIT), lerp(0.4, 0.55, u / HIT)] : [52.35, 6.3, Math.max(0.1, 0.55 - (u - HIT) * 0.02)];
        ball(K, b, { k: 0.9 });
        const kk = seg(u, 2, HIT + 10);
        A(K, 'gkx', [lerp(53.5, 52.7, ease(kk)), 8.5], { face: [53, 14], z: Math.sin(kk * PI) * 0.2, anim: 'dive', opts: { animTime: kk * 30 } });
        A(K, 'barou', [54.0, 10.4], { face: [53, 6], frame: 0, light: [0.9, 0.62, 0.6] });
        A(K, 'you', [52.45, 11.0], { face: [53, 6], anim: u > 40 ? 'celebrate' : 'shoot', frame: 4 });
        cam(K, shake(K, [lerp(53.4, 53.1, seg(u, 0, 82)), 6.18, 0.46], f * 2, u >= HIT ? 0.012 * Math.max(0, 1 - (u - HIT) / 26) : 0.002, 5), [53.0, 9.6, 0.5], lerp(60, 55, seg(u, 0, 82)));
        st.ball = W3(b);
        st.u = u;
      } else {
        // o Rei se vira, na luz vermelha: "Sorte de principiante."
        const u = t - netEnd;
        const bp = [54.0, 10.4];
        lightDisc(K, bp[0], bp[1], 0.9, 'rgba(239,68,68,0.9)', 0.4);
        A(K, u > 20 ? 'barouA' : 'barou', bp, { face: u > 20 ? [52.0, 13.0] : [53, 6], frame: 0, light: [1.2, 0.74, 0.72] });
        towerShadow(K, bp, 0.3);
        const k = easeIO(seg(u, 0, 98));
        cam(K, shake(K, [lerp(52.6, 52.75, k), lerp(12.35, 12.15, k), 0.5], f * 0.4, 0.004), [bp[0], bp[1], 0.64], lerp(44, 41, k));
      }
    } else {
      // O PRIMEIRO OLHAR: o Rei na contraluz, só os olhos acesos; e você, aceso de volta
      const cut = 180;
      if (t < cut) {
        const bp = [53.8, 10.0];
        A(K, 'barouA', bp, { face: [52.6, 12.6], frame: 0, light: [0.2, 0.12, 0.13] });
        const e = backlit(bp, TOWERS[1], 2.7);
        const k = easeIO(t / cut);
        cam(K, [lerp(e[0] - 0.15, e[0] + 0.05, k), lerp(e[1], e[1] - 0.15, k), lerp(0.28, 0.36, k)], [bp[0], bp[1], 0.95], lerp(46, 42, k));
        st.eyes = W3([bp[0], bp[1], 0.57]);
      } else {
        const yp = [52.6, 12.6];
        A(K, 'you', yp, { face: [53.8, 10.0], frame: 0, light: [0.22, 0.26, 0.34] });
        A(K, 'barou', [53.8, 10.0], { face: yp, frame: 0, light: [0.4, 0.26, 0.26] });
        const e = backlit(yp, TOWERS[2], 2.7);
        const k = easeIO(seg(t, cut, 420));
        cam(K, [lerp(e[0], e[0] + 0.25, k), lerp(e[1], e[1] - 0.1, k), lerp(0.3, 0.9, k)], [yp[0], yp[1], lerp(0.9, 0.6, k)], lerp(46, 50, k));
        st.eyes = W3([yp[0], yp[1], 0.57]);
      }
    }
  };

  const barouOverlay = (ctx, S, K, win) => {
    const { W, H, t, phase, top, bot, stageH } = S;
    const st = onScreen(K);
    if (phase === 0) {
      flares(ctx, K, S, 0.9);
      if (st.king) CE.cineGlow(ctx, st.king.x, st.king.y, 160, 'rgba(239,68,68,0.2)', 0.7 + 0.2 * Math.sin(t * 0.06));
      CE.luckKicker(ctx, 40, top + 30, 'BLUE LOCK • PRÉDIO 5 • 1ª SELEÇÃO', seg(t, 8, 50), '#22d3ee');
      scoreZ(ctx, S, 'TIME X', '#dc2626', 0, 0, 'JOGO 1', seg(t, 20, 40));
      CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 14), '#000000');
      CE.cineSfx(S, 150, 'apito', () => window.SFX?.whistle?.(1));
    } else if (phase === 1) {
      const A0 = st.A || 0;
      CE.drawSpeedLines(ctx, W, H, '#fecaca', 0.1);
      TRANCOS.forEach(([, at], i) => CE.cineSfx(S, at, 'tranco' + i, () => window.SFX?.tackle?.()));
      // câmera lenta: o pé do Rei na bola, num quadro (chuteira preta e vermelha)
      if (A0 > 219 && A0 < BSHOT) {
        const q = seg(A0, 219, BSHOT);
        manga(ctx, [[W * 0.5, top + 20], [W - 18, top + 12], [W - 26, bot - 20], [W * 0.54, bot - 12]], seg(t, 220, 228), [W * 0.4, 0], (CA, b, g) =>
          artBoot(CA, b, g, { bg: '#fee2e2', bx: 0.36, by: 0.56, fx: lerp(0.86, 0.6, easeIO(q)), fy: lerp(0.92, 0.66, easeIO(q)), s: 0.15, ang: lerp(-1.0, 0.15, easeIO(q)), flip: true, sock: '#111827', sock2: '#dc2626', boot: '#0b0f19', radial: 'rgba(127,29,29,0.75)', burst: q > 0.82 ? ease((q - 0.82) / 0.18) : 0, rot: q * 3, tone: true })
        );
      }
      if (A0 >= BSHOT) {
        const fp = st.foot || { x: W / 2, y: H * 0.6 };
        const u = A0 - BSHOT;
        // (o quadro de impacto da derrota é o chute do Rei; na vitória ele fica para o seu)
        if (!win && u < 1.5) impactFrame(ctx, W, H);
        CE.cineFlash(ctx, W, H, 0.55 * (1 - seg(u, 1, 8)), '#fee2e2');
        if (u < 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - u / 8));
      }
      scoreZ(ctx, S, 'TIME X', '#dc2626', 0, 0, 'JOGO 1');
      CE.cineSfx(S, 262, 'chute', () => window.SFX?.kick?.(1));
    } else if (phase === 2) {
      if (t < 64) {
        netHit(ctx, S, st, t, 18);
        if (t >= 18) CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, 18, 26)), '#fee2e2');
        scoreZ(ctx, S, 'TIME X', '#dc2626', 0, t >= 18 ? 1 : 0, 'JOGO 1', 1, t >= 18 ? 1 - seg(t, 18, 48) : 0);
      } else if (t < 140) {
        flares(ctx, K, S, 1, '254,202,202');
        if (K.st.eyes) litEyes(ctx, K, K.st.eyes.__w, seg(t, 90, 104), 'rgba(239,68,68,0.9)');
      } else if (t < 204) {
        const at = st.at || 140;
        netHit(ctx, S, st, t, at + 10);
        if (t >= at + 10) CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, at + 10, at + 16)), '#fee2e2');
        scoreZ(ctx, S, 'TIME X', '#dc2626', 0, at === 140 ? (t >= 150 ? 2 : 1) : t >= 182 ? 3 : 2, 'JOGO 1', 1);
      } else {
        bwBlue(ctx, W, H, 0.35 * seg(t, 214, 260));
        scoreZ(ctx, S, 'TIME X', '#dc2626', 0, 3, 'JOGO 1');
      }
      [18, 150, 182].forEach((at, i) => CE.cineSfx(S, at, 'gol' + i, () => window.SFX?.kick?.(i ? 0.6 : 0.9)));
    } else if (!win && phase === 3) {
      CE.cineSfx(S, 232, 'tranco', () => window.SFX?.tackle?.());
    } else if (!win && phase === 4) {
      // o mundo perde a cor; a mão tremendo e a gota
      bwBlue(ctx, W, H, 0.85 * seg(t, 90, 170));
      CE.luckKicker(ctx, 40, top + 30, 'FIM DE JOGO • TIME Z x TIME X', seg(t, 6, 46), '#ef4444');
      if (t > 160 && t < 300) {
        const you = cdOf(K, 'you');
        const u = t - 160;
        manga(ctx, [[W * 0.06, top + 22], [W * 0.42, top + 14], [W * 0.4, bot - 20], [W * 0.04, bot - 12]], seg(t, 160, 168), [-W * 0.4, 0], (CA, b, g) =>
          artHand(CA, b, g, { bg: '#0a1530', skin: you.skinColor || '#f3d1b8', jit: Math.round(K.noise(S.f * 2.7, 3) * 2) * PIX * (1 - seg(u, 90, 140) * 0.7), drop: seg(u, 50, 76) + (u >= 76 ? 1 : 0), ring: seg(u, 76, 110) })
        );
      }
      if (t > 296) {
        ctx.fillStyle = `rgba(0,0,0,${seg(t, 296, 330) * 0.9})`;
        ctx.fillRect(0, 0, W, H);
      }
      CE.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
      CE.cineSfx(S, 236, 'gota', () => window.SFX?.blip?.(880));
    } else if (win && phase === 3) {
      const shotEnd = 150;
      if (t < shotEnd) {
        const A0 = st.A || 0;
        const KT = 66;
        const fp = st.foot || { x: W * 0.5, y: H * 0.7 };
        // o tempo para (sem cor) até o chute; a cor volta em círculo a partir do seu pé
        if (A0 < KT) bwBlue(ctx, W, H, seg(A0, 46, 56));
        else bwBlue(ctx, W, H, 1, { inside: false, x: fp.x, y: fp.y, r: ease(seg(A0, KT, KT + 16)) * W * 1.4 });
        if (A0 > 54 && A0 < KT) {
          const q = seg(A0, 54, KT);
          // (espelhado: nesta câmera o gol fica à esquerda da tela)
          manga(ctx, [[30, top + 12], [W - 40, top + 24], [W - 24, bot - 40], [50, bot - 24]], seg(A0, 54, 56), [0, 50], (CA, b, g) =>
            artBoot(CA, b, g, { bg: '#dbe4ef', bx: 0.37, by: 0.4 + 0.06 * q, fx: lerp(0.84, 0.53, easeIO(q)), fy: lerp(0.95, 0.66, easeIO(q)), s: 0.15, ang: lerp(-1.0, 0.15, easeIO(q)), flip: true, sock: '#0f2942', sock2: '#38bdf8', boot: '#22d3ee', radial: 'rgba(15,23,42,0.8)', aura: 'rgba(0,245,212,0.35)', burst: q > 0.82 ? ease((q - 0.82) / 0.18) : 0, rot: q * 3, ballR: 0.17 })
          );
        }
        if (A0 >= KT && A0 < KT + 1.5) impactFrame(ctx, W, H);
        if (A0 >= KT) {
          CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(A0, KT + 1, KT + 8)));
          if (A0 < KT + 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - (A0 - KT) / 8));
          if (st.ball) CE.luckStreak(ctx, fp.x, fp.y, st.ball.x, st.ball.y, 5, 30, '0,245,212', 0.85 * (1 - seg(A0, KT + 20, KT + 36)));
          CE.cineImpactText(ctx, 'DOM!!', W * 0.74, top + 120, 110, '#f8fafc', seg(A0, KT, KT + 6), W * 0.4, -0.1);
        }
        CE.cineSfx(S, 112, 'chute', () => window.SFX?.kick?.(1));
      } else if (t < 232) {
        const u = st.u || 0;
        netHit(ctx, S, st, u, 16);
        if (u >= 16) {
          CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(u, 16, 26)));
          CE.cineBokeh(ctx, W, top, top + stageH * 0.5, t, 24, ['rgba(255,255,255,0.55)', 'rgba(0,245,212,0.45)'], 4);
          CE.cineImpactText(ctx, 'GOOOOL!!', W / 2, top + stageH * 0.44, 140, '#f8fafc', seg(u, 20, 28), W * 0.86, -0.06);
        }
        CE.cineSfx(S, 166, 'rede', () => window.SFX?.goal?.(true));
      } else {
        CE.luckKicker(ctx, 40, top + 30, 'FIM DE JOGO • TIME Z x TIME X', seg(t, 236, 270), YOU_C);
      }
    } else {
      // o Rei com os olhos vermelhos acesos / você com os seus, ciano
      const cut = 180;
      flares(ctx, K, S, 1, t < cut ? '254,202,202' : '186,230,253');
      if (K.st.eyes) {
        if (t < cut) litEyes(ctx, K, K.st.eyes.__w, seg(t, 50, 66), 'rgba(239,68,68,0.9)');
        else litEyes(ctx, K, K.st.eyes.__w, seg(t, 280, 296), 'rgba(0,245,212,0.9)');
      }
      if (t > 390) {
        ctx.fillStyle = `rgba(0,0,0,${seg(t, 390, 420) * 0.9})`;
        ctx.fillRect(0, 0, W, H);
      }
      CE.cineSfx(S, 52, 'odio', () => window.SFX?.whoosh?.());
      CE.cineSfx(S, 282, 'existo', () => window.SFX?.whoosh?.());
    }
  };

  const barouSubs0 = [
    [
      { from: 20, to: 156, who: 'NARRADOR', text: 'Prédio 5. A estreia.', color: '#94a3b8' },
      { from: 166, who: 'SHOUEI BAROU', text: '"Hmph. Plebeus."', color: BAROU_C }
    ],
    [
      { from: 16, to: 150, who: 'SHOUEI BAROU', text: '"Saiam da frente!"', color: BAROU_C },
      { from: 154, who: 'NARRADOR', text: 'Ninguém encosta nele.', color: '#94a3b8' }
    ],
    [
      { from: 10, to: 200, who: 'NARRADOR', text: 'Gol. E outro. E mais outro.', color: '#94a3b8' },
      { from: 214, who: 'SHOUEI BAROU', text: '"É só isso, Time Z?"', color: BAROU_C }
    ]
  ];
  CE.registerCine3D('barou_king', {
    phases: [240, 300, 290, 330, 330],
    music: 'tension',
    title: '👑 O REI',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    tags: ['PLANO 1 • A ESTREIA', 'PLANO 2 • O REI ATRAVESSA', 'PLANO 3 • DE NOVO E DE NOVO', 'PLANO 4 • NENHUM TALENTO', 'PLANO 5 • A DISTÂNCIA'],
    subs: [
      ...barouSubs0,
      [
        { from: 30, to: 190, who: 'SHOUEI BAROU', text: '"Você não tem talento nenhum."', color: BAROU_C },
        { from: 200, who: 'SHOUEI BAROU', text: '"Some do meu campo."', color: BAROU_C }
      ],
      [
        { from: 16, to: 170, who: 'VOCÊ', text: '(Eu nem encostei na bola.)', color: YOU_C },
        { from: 176, who: 'VOCÊ', text: '(Então essa é a distância...)', color: YOU_C }
      ]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      barouScene(K, S, false);
    },
    overlay(ctx, S, K) {
      barouOverlay(ctx, S, K, false);
    }
  });
  CE.registerCine3D('barou_king_win', {
    phases: [240, 300, 290, 330, 420],
    music: 'tension',
    title: '👑 O REI (A VIRADA)',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    tags: ['PLANO 1 • A ESTREIA', 'PLANO 2 • O REI ATRAVESSA', 'PLANO 3 • DE NOVO E DE NOVO', 'PLANO 4 • A VIRADA', 'PLANO 5 • O PRIMEIRO OLHAR'],
    subs: [
      ...barouSubs0,
      [
        { from: 4, to: 150, who: 'NARRADOR', text: 'O Time Z virou contra o Rei.', color: '#94a3b8' },
        { from: 254, who: 'SHOUEI BAROU', text: '"Sorte de principiante."', color: BAROU_C }
      ],
      [
        { from: 20, to: 176, who: 'SHOUEI BAROU', text: '"O Rei não perde duas vezes."', color: BAROU_C },
        { from: 190, to: 300, who: 'VOCÊ', text: '(O Rei me olhou com ódio.)', color: YOU_C },
        { from: 306, who: 'VOCÊ', text: '(Então eu existo aqui.)', color: YOU_C }
      ]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      barouScene(K, S, true);
    },
    overlay(ctx, S, K) {
      barouOverlay(ctx, S, K, true);
    }
  });

  // ==========================================================================
  // 2. O GOSTO DO EGO (Time Z x Time Y) — ego_victory
  // A leitura do Niko riscada no gramado (do alto); o tempo para e a câmera gira em volta
  // de você até achar o lugar "um passo depois"; o chute (o golpe da cena), a rede, o Niko
  // de joelhos; o coração batendo (a mão num quadro) e o monstro aceso na contraluz.
  // ==========================================================================
  const NIKO_AT = [53.4, 9.4];
  const YOU_E = [52.0, 10.8];
  const SPOT = [53.85, 8.35];
  // a leitura do Niko projetada no gramado: setas vermelhas (riscadas no xeque) e,
  // um passo depois, a sua linha ciano até o lugar
  let TACT = null;
  const tactics = (red, cross, cyan) => {
    const key = [Math.round(red * 12), Math.round(cross * 8), Math.round(cyan * 12)].join('|');
    if (!TACT) TACT = paint(512, 544);
    if (TACT.key === key) return false;
    TACT.key = key;
    const g = TACT.g;
    const P = (x, y) => [(x - 45) * 32, (y - 6) * 32];
    g.clearRect(0, 0, 512, 544);
    g.lineCap = 'round';
    const arrow = (a, b, k, color, w) => {
      if (k <= 0) return;
      const p = P(a[0], a[1]);
      const q = P(lerp(a[0], b[0], k), lerp(a[1], b[1], k));
      g.strokeStyle = color;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(p[0], p[1]);
      g.lineTo(q[0], q[1]);
      g.stroke();
      if (k >= 1) {
        const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(q[0] + Math.cos(ang) * 14, q[1] + Math.sin(ang) * 14);
        g.lineTo(q[0] + Math.cos(ang + 2.4) * 14, q[1] + Math.sin(ang + 2.4) * 14);
        g.lineTo(q[0] + Math.cos(ang - 2.4) * 14, q[1] + Math.sin(ang - 2.4) * 14);
        g.closePath();
        g.fill();
      }
    };
    const R = [[[55.8, 12.2], [54.6, 9.2]], [[49.6, 12.6], [51.2, 9.4]], [[YOU_E[0], YOU_E[1]], [52.6, 8.4]], [[47.6, 11.5], [49.4, 8.6]]];
    R.forEach(([a, b], i) => {
      const k = seg(red, i * 0.2, i * 0.2 + 0.4);
      arrow(a, b, k, 'rgba(239,68,68,0.95)', 7);
      if (cross > 0 && k >= 1) {
        const q = P(b[0], b[1]);
        const s = 16 * Math.min(1, cross * 2);
        g.strokeStyle = 'rgba(254,202,202,0.95)';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(q[0] - s, q[1] - s);
        g.lineTo(q[0] + s, q[1] + s);
        g.moveTo(q[0] + s, q[1] - s);
        g.lineTo(q[0] - s, q[1] + s);
        g.stroke();
      }
    });
    if (cyan > 0) {
      g.setLineDash([18, 10]);
      arrow([YOU_E[0], YOU_E[1]], SPOT, cyan, 'rgba(0,245,212,0.98)', 9);
      g.setLineDash([]);
      if (cyan >= 1) {
        const q = P(SPOT[0], SPOT[1]);
        g.strokeStyle = 'rgba(0,245,212,0.9)';
        g.lineWidth = 5;
        g.beginPath();
        g.arc(q[0], q[1], 26, 0, PI * 2);
        g.stroke();
      }
    }
    return true;
  };
  const tacticsFloor = (K, red, cross, cyan, alpha = 0.85) => {
    const dirty = tactics(red, cross, cyan);
    K.floor({ x0: 45, y0: 6, x1: 61, y1: 23, z: 0.014, img: TACT, em: true, alpha, dirty });
  };
  // o lance final: os dois times parados na leitura do Niko (frame = passo da animação)
  const egoField = (K, o = {}) => {
    const fr = o.frame;
    const skip = o.omit || [];
    A(K, 'niko', NIKO_AT, Object.assign({ face: [52.6, 13], frame: 0, light: [1.15, 0.8, 0.78] }, o.niko || {}));
    if (!skip.includes('okawa')) A(K, 'okawa', [55.4, 9.9], { face: [55, 14], anim: fr !== undefined ? 'run' : 'idle', frame: fr !== undefined ? fr : 0 });
    A(K, 'ya', [50.6, 9.7], { face: [50, 14], anim: fr !== undefined ? 'run' : 'idle', frame: fr !== undefined ? fr + 3 : 0 });
    if (!o.noGk) A(K, 'gky', [53, 7.1], { face: [53, 14], frame: 0 });
    if (!skip.includes('bachira')) A(K, 'bachira', [55.8, 12.2], { face: [54, 8], anim: fr !== undefined ? 'run' : 'idle', frame: fr !== undefined ? fr + 1 : 0 });
    A(K, 'kunigami', [49.6, 12.6], { face: [51, 8], anim: fr !== undefined ? 'run' : 'idle', frame: fr !== undefined ? fr + 2 : 0 });
    A(K, 'chigiri', [47.6, 11.5], { face: [49, 8], anim: fr !== undefined ? 'run' : 'idle', frame: fr !== undefined ? fr + 4 : 0 });
    if (!o.noYou) A(K, 'you', YOU_E, Object.assign({ face: [52.4, 7], frame: 0 }, o.you || {}));
  };
  const LED = () => art('led_zy', 512, 152, (g) => CE.zselLed(g, 12, 12, 488, 128, 0, { top: 'FIM DE JOGO', left: 'TIME Z', right: 'TIME Y', leftOn: true, mid: '•' }));
  const EGO_PH = [240, 280, 230, 290, 260, 270];
  const YOU_W = [53.1, 9.7];

  CE.registerCine3D('ego_victory', {
    phases: EGO_PH,
    music: 'epic',
    title: '😈 O GOSTO DO EGO',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    tags: ['PLANO 1 • XEQUE', 'PLANO 2 • UM PASSO DEPOIS', 'PLANO 3 • O ÚLTIMO LANCE', 'PLANO 4 • DE JOELHOS', 'PLANO 5 • BOM DEMAIS', 'PLANO 6 • O MONSTRO'],
    subs: [
      [
        { from: 20, to: 150, who: 'IKKI NIKO', text: '"Li tudo. Acabou."', color: '#fca5a5' },
        { from: 164, who: 'VOCÊ', text: '(...Será?)', color: YOU_C }
      ],
      [
        { from: 16, to: 176, who: 'VOCÊ', text: '(Ele leu tudo... então eu leio ele.)', color: YOU_C },
        { from: 184, who: 'VOCÊ', text: '(Um passo depois.)', color: YOU_C }
      ],
      [{ from: 6, who: 'NARRADOR', text: 'Último lance. Um chute só.', color: '#94a3b8' }],
      [
        { from: 20, to: 170, who: 'IKKI NIKO', text: '"...Impossível. Eu li tudo."', color: '#fca5a5' },
        { from: 176, who: 'VOCÊ', text: '(Leu. Mas eu li depois.)', color: YOU_C }
      ],
      [
        { from: 14, to: 140, who: 'VOCÊ', text: '(Que sensação é essa...?)', color: YOU_C },
        { from: 146, who: 'VOCÊ', text: '(Vencer... é bom DEMAIS.)', color: YOU_C }
      ],
      [
        { from: 12, to: 150, who: 'VOCÊ', text: '(Devorar o plano de outro...)', color: YOU_C },
        { from: 156, who: 'VOCÊ', text: '(Quero sentir isso DE NOVO.)', color: YOU_C }
      ]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      K.expo(0.98);
      if (phase === 0) {
        // XEQUE: do alto, atrás do gol; a leitura do Niko vai sendo riscada no gramado
        tacticsFloor(K, seg(t, 30, 140), seg(t, 150, 190), 0);
        egoField(K, { frame: Math.floor(t * 0.12) });
        const k = easeIO(t / 240);
        cam(K, shake(K, mixP([54.7, 6.45, 2.5], [54.1, 6.9, 1.7], k), f * 0.4, 0.005), mixP([52.6, 11.8, 0.0], [52.8, 11.2, 0.25], k), lerp(58, 50, k));
      } else if (phase === 1) {
        // UM PASSO DEPOIS: o tempo para; a câmera gira em volta de você e acha o lugar
        tacticsFloor(K, 1, 1, seg(t, 150, 206));
        egoField(K, { you: { face: t > 140 ? SPOT : [52.4, 7], light: t > 150 ? [1.1, 1.25, 1.3] : undefined } });
        if (t > 206) lightDisc(K, SPOT[0], SPOT[1], 0.55, 'rgba(0,245,212,0.95)', 0.6 * seg(t, 206, 226));
        const a = lerp(PI * 0.66, PI * 0.18, easeIO(t / 280));
        const r = 2.65;
        cam(K, [YOU_E[0] + Math.cos(a) * r, YOU_E[1] + Math.sin(a) * r, lerp(0.95, 1.2, easeIO(t / 280))], [lerp(YOU_E[0], 52.8, seg(t, 150, 230)), lerp(YOU_E[1], 9.7, seg(t, 150, 230)), 0.38], 48);
        st.you = W3([YOU_E[0], YOU_E[1], 0.45]);
        st.feet = W3([YOU_E[0], YOU_E[1], 0]);
        st.top = W3([YOU_E[0], YOU_E[1], 0.9]);
      } else if (phase === 2) {
        const KT = 96;
        const netAt = 110;
        if (t < netAt) {
          // O ÚLTIMO LANCE: a bola espirra no Niko e vem; você chega um passo depois e chuta
          const A0 = remap(t, [[0, 0], [52, 52], [92, 64], [110, 82]]);
          const KA = 64;
          const run = ease(seg(A0, 0, 58));
          const you = [lerp(YOU_E[0], SPOT[0] - 0.05, run), lerp(YOU_E[1], SPOT[1] + 0.32, run)];
          const an = A0 < 52 ? 'run' : A0 < KA ? 'windup' : 'shoot';
          A(K, 'you', you, { face: [53.0, 6.6], anim: an, frame: an === 'run' ? Math.floor(A0 * 0.5) : 4 });
          egoField(K, { noYou: true, omit: ['okawa', 'bachira'], frame: Math.floor(A0 * 0.3) });
          let b;
          if (A0 < 30) b = [lerp(55.4, NIKO_AT[0] + 0.15, A0 / 30), lerp(11.8, NIKO_AT[1] + 0.25, A0 / 30), 0.08];
          else if (A0 < KA) {
            const q = seg(A0, 30, KA);
            b = [lerp(NIKO_AT[0] + 0.15, SPOT[0] + 0.12, q), lerp(NIKO_AT[1] + 0.25, SPOT[1] + 0.02, q), 0.05 + Math.sin(q * PI) * 0.35];
          } else {
            const q = seg(A0, KA, KA + 18);
            b = [lerp(SPOT[0] + 0.12, 53.75, q), lerp(SPOT[1] + 0.02, 6.4, q), lerp(0.1, 0.6, q)];
          }
          ball(K, b);
          const sh = A0 >= KA ? 0.035 * Math.max(0, 1 - (A0 - KA) / 24) : 0.004;
          cam(K, shake(K, [lerp(56.5, 56.2, seg(A0, 0, KA)), lerp(11.3, 10.8, seg(A0, 0, KA)), 0.38], f * 2, sh, 4), [lerp(53.1, 53.7, seg(A0, 0, KA)), lerp(9.6, 8.6, seg(A0, 0, KA)), 0.5], lerp(48, 42, seg(A0, 0, KA)));
          st.A = A0;
          st.foot = W3([SPOT[0], SPOT[1] + 0.05, 0.1]);
          st.ball = W3(b);
        } else {
          // a rede, de dentro do gol; o Niko de costas, parado
          const u = t - netAt;
          const HIT = 14;
          const b = u < HIT ? [lerp(53.7, 53.75, u / HIT), lerp(8.0, 6.3, u / HIT), lerp(0.45, 0.6, u / HIT)] : [53.75, 6.28, Math.max(0.1, 0.6 - (u - HIT) * 0.02)];
          ball(K, b, { k: 0.9 });
          egoField(K, { noGk: true, niko: { face: [53.2, 6], light: [0.7, 0.5, 0.5] }, you: { anim: u > 46 ? 'celebrate' : 'shoot', frame: 4, face: [53.9, 7.6] }, noYou: true });
          A(K, 'you', [SPOT[0] - 0.05, SPOT[1] + 0.32], { anim: u > 46 ? 'celebrate' : 'shoot', frame: 4, face: [53.9, 6.6] });
          const kk = seg(u, 2, HIT + 12);
          A(K, 'gky', [lerp(52.6, 53.4, ease(kk)), 8.6], { face: [53, 14], z: Math.sin(kk * PI) * 0.2, anim: 'dive', opts: { animTime: kk * 30 } });
          cam(K, shake(K, [lerp(52.7, 53.0, seg(u, 0, 120)), 6.18, 0.46], f * 2, u >= HIT ? 0.012 * Math.max(0, 1 - (u - HIT) / 26) : 0.002, 5), [53.4, 9.6, 0.5], lerp(60, 54, seg(u, 0, 120)));
          st.ball = W3(b);
          st.u = u;
        }
      } else if (phase === 3) {
        // DE JOELHOS: você de pé na luz, o Niko de joelhos; o placar lá em cima
        K.quad({ x: 53, y: 6.02, z: 2.3, w: 3.6, h: 1.07, ang: -PI / 2, img: LED(), em: true });
        lightDisc(K, YOU_W[0], YOU_W[1], 0.95, 'rgba(224,242,254,0.95)', 0.55);
        A(K, 'you', YOU_W, { face: [51.9, 11.0], frame: 0, light: [1.2, 1.3, 1.35] });
        A(K, 'niko', [51.85, 11.0], { face: YOU_W, anim: 'kneel_down', frame: 0, light: [0.5, 0.36, 0.38] });
        A(K, 'okawa', [56.0, 9.0], { face: [53, 10], frame: 0, light: [0.4, 0.34, 0.36] });
        A(K, 'ya', [49.8, 9.3], { face: [53, 10], frame: 0, light: [0.4, 0.34, 0.36] });
        towerShadow(K, YOU_W, 0.32);
        const k = easeIO(t / 290);
        cam(K, shake(K, [lerp(50.6, 51.6, k), lerp(13.6, 13.9, k), lerp(0.42, 0.5, k)], f * 0.4, 0.004), [lerp(52.3, 52.6, k), 10.2, lerp(0.75, 0.8, k)], lerp(48, 44, k));
      } else if (phase === 4) {
        // BOM DEMAIS: você de frente; o coração batendo no enquadramento
        const beat = beatOf(t, [40, 58, 110, 128, 180, 198]);
        A(K, 'you', YOU_W, { face: [53.2, 13], frame: 0, light: [0.95, 1.2, 1.2] });
        lightDisc(K, YOU_W[0], YOU_W[1], 0.9, 'rgba(224,242,254,0.95)', 0.5);
        towerShadow(K, YOU_W, 0.3);
        const k = easeIO(t / 260);
        cam(K, shake(K, [lerp(53.5, 53.35, k), lerp(12.25, 12.05, k), 0.6], f * 0.6, 0.004 + beat * 0.006), [YOU_W[0], YOU_W[1], 0.56], lerp(44, 41, k) - beat * 1.2);
        st.beat = beat;
      } else {
        // O MONSTRO: contra-plongée com o refletor atrás; só os olhos acendem
        A(K, 'you', YOU_W, { face: [55.4, 10.7], frame: 0, light: [0.2, 0.24, 0.3] });
        const e = backlit(YOU_W, TOWERS[0], 2.55);
        const k = easeIO(t / 270);
        cam(K, [lerp(e[0], e[0] - 0.2, k), lerp(e[1], e[1] - 0.1, k), lerp(0.22, 0.42, k)], [YOU_W[0], YOU_W[1], lerp(0.9, 0.72, k)], lerp(46, 42, k));
        st.eyes = W3([YOU_W[0], YOU_W[1], 0.57]);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, stageH } = S;
      const st = onScreen(K);
      if (phase === 0) {
        flares(ctx, K, S, 0.7, '254,202,202');
        CE.luckKicker(ctx, 40, top + 30, 'TIME Z x TIME Y • ÚLTIMO MINUTO', seg(t, 8, 50), '#ef4444');
        scoreZ(ctx, S, 'TIME Y', '#b91c1c', 1, 1, '89:41', seg(t, 16, 36));
        CE.cineSfx(S, 150, 'xeque', () => window.SFX?.kick?.(0.5));
      } else if (phase === 1) {
        // o tempo parado; a cor volta em você quando a linha aparece
        const p = st.you || { x: W / 2, y: H * 0.6 };
        const r = figR(st, 80);
        if (t < 150) bwBlue(ctx, W, H, seg(t, 0, 24));
        else bwBlue(ctx, W, H, 1, { inside: false, x: p.x, y: p.y, r: r * ease(seg(t, 150, 170)) });
        CE.cineSfx(S, 206, 'achei', () => window.SFX?.blip?.(1320));
      } else if (phase === 2) {
        const netAt = 110;
        if (t < netAt) {
          const A0 = st.A || 0;
          const KA = 64;
          const fp = st.foot || { x: W * 0.5, y: H * 0.7 };
          if (A0 < KA) bwBlue(ctx, W, H, seg(A0, 44, 54));
          else bwBlue(ctx, W, H, 1, { inside: false, x: fp.x, y: fp.y, r: ease(seg(A0, KA, KA + 16)) * W * 1.4 });
          if (A0 > 52 && A0 < KA) {
            const q = seg(A0, 52, KA);
            manga(ctx, [[40, top + 24], [W - 30, top + 12], [W - 50, bot - 24], [24, bot - 40]], seg(A0, 52, 54), [0, 50], (CA, b, g) =>
              artBoot(CA, b, g, { bg: '#dbe4ef', bx: 0.63, by: 0.4 + 0.06 * q, fx: lerp(0.16, 0.47, easeIO(q)), fy: lerp(0.95, 0.66, easeIO(q)), s: 0.15, ang: lerp(1.0, -0.15, easeIO(q)), sock: '#0f2942', sock2: '#38bdf8', boot: '#22d3ee', radial: 'rgba(15,23,42,0.8)', aura: 'rgba(0,245,212,0.35)', burst: q > 0.82 ? ease((q - 0.82) / 0.18) : 0, rot: q * 3, ballR: 0.17 })
            );
          }
          if (A0 >= KA && A0 < KA + 1.5) impactFrame(ctx, W, H);
          if (A0 >= KA) {
            CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(A0, KA + 1, KA + 8)));
            if (A0 < KA + 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - (A0 - KA) / 8));
            if (st.ball) CE.luckStreak(ctx, fp.x, fp.y, st.ball.x, st.ball.y, 5, 30, '0,245,212', 0.85 * (1 - seg(A0, KA + 10, KA + 18)));
            CE.cineImpactText(ctx, 'DOM!!', W * 0.26, top + 120, 110, '#f8fafc', seg(A0, KA, KA + 6), W * 0.4, -0.1);
          }
          CE.cineSfx(S, 92, 'chute', () => window.SFX?.kick?.(1));
        } else {
          const u = st.u || 0;
          netHit(ctx, S, st, u, 14);
          if (u >= 14) {
            CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(u, 14, 24)));
            CE.cineBokeh(ctx, W, top, top + stageH * 0.5, t, 24, ['rgba(255,255,255,0.55)', 'rgba(0,245,212,0.45)'], 4);
            CE.cineImpactText(ctx, 'GOOOOL!!', W / 2, top + stageH * 0.44, 140, '#f8fafc', seg(u, 18, 26), W * 0.86, -0.06);
          }
          scoreZ(ctx, S, 'TIME Y', '#b91c1c', u >= 14 ? 2 : 1, 1, '89:58', 1, u >= 14 ? 1 - seg(u, 14, 44) : 0);
          CE.cineSfx(S, netAt + 14, 'rede', () => window.SFX?.goal?.(true));
        }
      } else if (phase === 3) {
        flares(ctx, K, S, 0.9);
        CE.cineDust(ctx, W, H, t, 24, 'rgba(226,232,240,0.45)', 21);
        CE.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
      } else if (phase === 4) {
        // a mão tremendo, num quadro; o coração bate no quadro todo (um pulso de luz)
        const beat = st.beat || 0;
        if (beat > 0) {
          ctx.fillStyle = `rgba(0,245,212,${0.05 * beat})`;
          ctx.fillRect(0, top, W, stageH);
        }
        if (t > 70 && t < 214) {
          const you = cdOf(K, 'you');
          manga(ctx, [[W * 0.04, top + stageH * 0.36], [W * 0.38, top + stageH * 0.3], [W * 0.37, bot - 14], [W * 0.03, bot - 10]], seg(t, 70, 78), [-W * 0.4, 0], (CA, b, g) =>
            artHand(CA, b, g, { bg: '#04201c', skin: you.skinColor || '#f3d1b8', jit: Math.round(K.noise(S.f * 3.1, 1) * 2) * PIX, rays: 'rgba(0,245,212,0.3)' })
          );
        }
        [40, 58, 110, 128, 180, 198].forEach((b, i) => CE.cineSfx(S, b, 'tum' + i, () => window.SFX?.kick?.(0.15)));
      } else {
        flares(ctx, K, S, 1);
        if (K.st.eyes) litEyes(ctx, K, K.st.eyes.__w, seg(t, 90, 106));
        if (t > 240) {
          ctx.fillStyle = `rgba(0,0,0,${seg(t, 240, 270) * 0.85})`;
          ctx.fillRect(0, 0, W, H);
        }
        CE.cineSfx(S, 92, 'monstro', () => window.SFX?.whoosh?.());
      }
    }
  });

  // ==========================================================================
  // 3. O TRAIDOR (Time Z x Time W) — kuon_betrayal
  // A jogada ensaiada e o gêmeo que já estava lá (câmera lenta no corte); os gêmeos rindo;
  // o Kuon desviando o olhar; o vestiário no intervalo (o Raichi bate no armário); a
  // memória do acordo no túnel (sem cor, com retícula); a confissão no meio-escuro; o gol
  // vazio e você indo embora do vestiário.
  // ==========================================================================
  // o Kuon SENTADO no banco do vestiário (banco de 17,06 a 17,4, tampo a 0,26). Assento a
  // 0,2 no meio do banco: o colo encosta no tampo e o banco esconde as pernas penduradas
  const KUON_AT = [36.5, 17.26];
  const KUON_SEAT = 0.2;
  const kuonSit = (K, o) => A(K, 'kuon', KUON_AT, Object.assign({ anim: 'sit', seat: KUON_SEAT, frame: 0 }, o));
  const KUON_PH = [270, 260, 280, 340, 300];

  CE.registerCine3D('kuon_betrayal', {
    phases: KUON_PH,
    music: 'mystery',
    title: '🗡️ O TRAIDOR',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    tags: ['PLANO 1 • TUDO LIDO', 'PLANO 2 • OS GÊMEOS', 'PLANO 3 • O VESTIÁRIO', 'PLANO 4 • A CONFISSÃO', 'PLANO 5 • EGOÍSMO SEM GOL'],
    subs: [
      [
        { from: 6, to: 120, who: 'NARRADOR', text: 'Jogada ensaiada.', color: '#94a3b8' },
        { from: 176, who: 'CHIGIRI', text: '"Eles sabiam pra onde a bola ia!"', color: CHI_C }
      ],
      [
        { from: 14, to: 138, who: 'WANIMA', text: '"Valeu pela dica, Time Z."', color: '#4ade80' },
        { from: 160, who: 'VOCÊ', text: '(...Dica? Que dica?)', color: YOU_C }
      ],
      [
        { from: 12, to: 180, who: 'RAICHI', text: '"Foi você, Kuon! Você vendeu a gente!"', color: RAICHI_C },
        { from: 190, who: 'KUON', text: '"...E se fui?"', color: KUON_C }
      ],
      [
        { from: 40, to: 186, who: 'KUON', text: '"Os gêmeos me fazem artilheiro."', color: KUON_C },
        { from: 200, who: 'KUON', text: '"Eu só fiz o que o Ego mandou: ser egoísta."', color: KUON_C }
      ],
      [
        { from: 14, to: 170, who: 'VOCÊ', text: '(Egoísmo sem gol... é só traição.)', color: YOU_C },
        { from: 178, who: 'VOCÊ', text: '"A gente vence sem você."', color: YOU_C }
      ]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      K.expo(0.98);
      if (phase === 0) {
        // TUDO LIDO: travelling com a jogada; o gêmeo corta o passe em câmera lenta
        const A0 = remap(t, [[0, 0], [100, 100], [170, 116], [270, 216]]);
        const pass = 92;
        const cutIn = 110;
        const by = lerp(15.8, 13.7, seg(A0, 0, pass));
        const ba = A0 < pass - 12 ? 'run' : A0 < pass ? 'windup' : A0 < pass + 20 ? 'shoot' : 'idle';
        // (depois do passe o Bachira sai pela esquerda, para não ficar na frente da câmera)
        const bg = ease(seg(A0, pass + 6, pass + 40));
        const bp = [lerp(52.3, 51.3, bg), lerp(by, 12.8, bg)];
        A(K, 'bachira', bp, { face: bg > 0 ? [50.6, 12] : [55, 9], anim: bg > 0 && bg < 1 ? 'run' : ba, frame: ba === 'run' || (bg > 0 && bg < 1) ? Math.floor(A0 * 0.5) : ba === 'idle' ? 0 : 4 });
        A(K, 'you', [lerp(49.6, 50.4, seg(A0, 0, 140)), lerp(13.0, 11.6, seg(A0, 0, 140))], { face: [52, 9], anim: 'run', frame: Math.floor(A0 * 0.5) });
        A(K, 'kuon', [49.9, 14.6], { face: [52, 12], frame: 0 });
        A(K, 'chigiri', [48.2, 15.6], { face: [52, 12], anim: A0 > 150 ? 'call_pass' : 'run', frame: Math.floor(A0 * 0.5) });
        const wIn = ease(seg(A0, pass - 6, cutIn));
        const intercept = [55.25, 11.75];
        const wx = lerp(58.4, intercept[0], wIn);
        const wy = lerp(10.4, intercept[1], wIn);
        A(K, A0 >= cutIn ? 'wjG' : 'wj', [wx, wy], { face: [52.3, 13.7], anim: A0 < cutIn ? 'run' : 'slide', frame: A0 < cutIn ? Math.floor(A0 * 0.5) : 4 });
        if (A0 > cutIn + 20) {
          const kk = ease(seg(A0, cutIn + 20, cutIn + 60));
          A(K, 'wkG', [lerp(59.4, 56.6, kk), lerp(12.6, 12.3, kk)], { face: [52.3, 13.7], anim: kk < 1 ? 'run' : 'call_pass', frame: Math.floor(A0 * 0.5) });
        }
        A(K, 'wa', [53.4, 9.6], { face: [53, 14], frame: 0 });
        let b;
        if (A0 < pass) b = [52.5, by - 0.3, 0.05 + Math.abs(Math.sin(A0 * 0.3)) * 0.05];
        else {
          const kb = A0 < cutIn ? seg(A0, pass, cutIn) : 1;
          b = [lerp(52.6, intercept[0] - 0.2, kb), lerp(13.4, intercept[1] + 0.12, kb), 0.05 + Math.sin(kb * PI) * 0.12];
        }
        ball(K, b);
        [bp, [wx, wy]].forEach((p) => towerShadow(K, p, 0.24));
        // (de trás e do alto, à esquerda; depois do passe a câmera anda e empurra para o gêmeo)
        const go = ease(seg(A0, pass, cutIn + 50));
        const eye = mixP([49.4, Math.max(by, 13.7) + 3.1, 1.5], [54.8, 15.25, 0.95], go);
        const look = A0 < pass ? [52.6, by - 0.5, 0.4] : mixP([52.6, 13.2, 0.4], [55.1, 11.9, 0.5], ease(seg(A0, pass, cutIn + 10)));
        const sh = A0 >= cutIn && A0 < cutIn + 12 ? 0.012 : 0.005;
        cam(K, shake(K, eye, f * 0.6, sh, 2), look, lerp(48, 42, go));
        st.A = A0;
      } else if (phase === 1) {
        if (t < 140) {
          // os gêmeos Wanima, rindo
          A(K, 'wjG', [55.0, 11.8], { face: [54.6, 14.4], frame: 0, light: [0.85, 1.15, 0.9] });
          A(K, 'wkG', [55.95, 11.95], { face: [55.4, 14.4], frame: 0, light: [0.85, 1.15, 0.9] });
          towerShadow(K, [55.0, 11.8], 0.26);
          towerShadow(K, [55.95, 11.95], 0.26);
          const k = easeIO(t / 140);
          cam(K, shake(K, [lerp(54.7, 55.3, k), lerp(14.5, 14.3, k), 0.5], f * 0.4, 0.004), [55.5, 11.9, 0.62], 44);
        } else {
          // o Kuon desvia o olhar; você lá atrás, olhando para ele
          A(K, 'kuon', [51.0, 14.6], { face: [48.6, 15.6], frame: 0, light: [0.6, 0.64, 0.8] });
          A(K, 'you', [49.6, 13.2], { face: [51.0, 14.6], frame: 0, light: [0.75, 0.82, 0.95] });
          A(K, 'wjG', [54.0, 12.2], { face: [51, 14.6], frame: 0, light: [0.5, 0.62, 0.52] });
          const k = easeIO(seg(t, 140, 260));
          cam(K, shake(K, [lerp(52.55, 52.3, k), lerp(16.65, 16.45, k), 0.56], f * 0.4, 0.004), [lerp(50.7, 50.6, k), 14.3, 0.56], lerp(44, 41, k));
        }
      } else if (phase === 2) {
        // O VESTIÁRIO: o Kuon no banco, o time em volta; o Raichi bate no armário
        const hit = 44;
        kuonSit(K, { face: [36.5, 22], light: [0.82, 0.86, 1.05] });
        A(K, 'kunigami', [38.7, 18.6], { face: KUON_AT, frame: 0 });
        A(K, 'chigiri', [39.6, 18.2], { face: KUON_AT, frame: 0 });
        A(K, 'bachira', [35.4, 18.9], { face: KUON_AT, frame: 0 });
        A(K, 'raichi', [lerp(37.9, 37.45, ease(seg(t, 20, 44))), 18.1], { face: [37.1, 17.1], anim: t >= hit - 8 && t < hit + 30 ? 'shoot' : 'idle', frame: 4, light: [1.15, 1.0, 0.85] });
        A(K, 'you', [39.1, 19.7], { face: KUON_AT, frame: 0, light: [0.55, 0.6, 0.75] });
        const k = easeIO(t / 280);
        const sh = t >= hit ? 0.03 * Math.max(0, 1 - (t - hit) / 26) : 0.004;
        cam(K, shake(K, [lerp(37.4, 37.15, k), lerp(22.5, 21.9, k), lerp(1.0, 0.92, k)], f * 2, sh, 3), [lerp(36.9, 36.8, k), 17.7, 0.42], lerp(50, 44, k));
        st.raichi = W3([37.15, 17.05, 0.6]);
      } else if (phase === 3) {
        const memEnd = 196;
        if (t < memEnd) {
          // a memória: o acordo no túnel do treino, antes do jogo
          A(K, 'wjG', [40.1, 13.6], { face: [38.7, 14.6], frame: 0 });
          A(K, 'wkG', [40.8, 14.4], { face: [38.7, 14.6], frame: 0 });
          A(K, 'kuon', [38.7, 14.7], { face: [40.4, 14.0], frame: 0 });
          const k = easeIO(seg(t, 0, memEnd));
          cam(K, [lerp(36.6, 37.0, k), lerp(13.4, 13.5, k), 0.8], [lerp(39.6, 39.8, k), 14.1, 0.5], 46);
        } else {
          // a confissão: o rosto frio, meio no escuro
          kuonSit(K, { face: [36.6, 22], light: [0.5, 0.55, 0.78] });
          const k = easeIO(seg(t, memEnd, 340));
          cam(K, shake(K, [lerp(36.95, 36.75, k), lerp(19.75, 19.55, k), 0.6], f * 0.4, 0.003), [36.5, KUON_AT[1], 0.6], lerp(44, 41, k));
          st.kuon = W3([KUON_AT[0], KUON_AT[1], 0.5]);
        }
      } else {
        const goalEnd = 100;
        if (t < goalEnd) {
          // o gol vazio e a bola parada na linha
          K.expo(0.78);
          ball(K, [53.2, 6.75, 0.05]);
          const k = easeIO(t / goalEnd);
          cam(K, [lerp(54.6, 54.2, k), lerp(10.4, 9.9, k), 0.34], [53.1, 6.6, 0.45], 42);
        } else {
          // você de pé, na luz; o Kuon no escuro; você sai pela porta do vestiário
          const walk = ease(seg(t, 214, 300));
          const yp = [lerp(38.1, 38.5, walk), lerp(19.2, 17.5, walk)];
          A(K, 'you', yp, { face: walk > 0 ? [38.5, 16] : KUON_AT, anim: walk > 0 && walk < 1 ? 'run' : 'idle', frame: walk > 0 && walk < 1 ? Math.floor(f * 0.35) : 0, light: [0.95, 1.12, 1.15] });
          kuonSit(K, { face: [37, 22], light: [0.3, 0.32, 0.45] });
          const k = easeIO(seg(t, goalEnd, 300));
          cam(K, shake(K, [lerp(36.9, 37.6, k), lerp(21.7, 21.9, k), 0.62], f * 0.4, 0.003), [lerp(37.4, 37.6, k), 18.3, 0.55], lerp(48, 50, k));
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, stageH } = S;
      const st = onScreen(K);
      if (phase === 0) {
        const A0 = st.A || 0;
        CE.luckKicker(ctx, 40, top + 30, 'TIME Z x TIME W • 1º TEMPO', seg(t, 6, 50), '#38bdf8');
        if (A0 < 100) CE.drawSpeedLines(ctx, W, H, '#bae6fd', 0.08);
        // o corte: a chuteira verde pisando na bola, no meio da câmera lenta
        if (A0 > 108 && A0 < 124) {
          const q = seg(A0, 108, 124);
          manga(ctx, [[W * 0.52, top + 22], [W - 20, top + 14], [W - 28, bot - 22], [W * 0.56, bot - 14]], seg(A0, 108, 110), [W * 0.4, 0], (CA, b, g) =>
            artBoot(CA, b, g, { bg: '#dcfce7', bx: 0.5, by: 0.72, fx: 0.38, fy: lerp(0.38, 0.5, easeIO(q)), s: 0.17, ang: 1.2, sock: '#14532d', sock2: '#f8fafc', boot: '#0b0f19', radial: 'rgba(20,83,45,0.6)', rot: q, tone: true })
          );
        }
        CE.cineSfx(S, 92, 'passe', () => window.SFX?.pass?.());
        CE.cineSfx(S, 104, 'corte', () => window.SFX?.tackle?.());
      } else if (phase === 1) {
        if (t >= 140) bwBlue(ctx, W, H, 0.25);
      } else if (phase === 2) {
        CE.luckKicker(ctx, 40, top + 30, 'INTERVALO • VESTIÁRIO DO TIME Z', seg(t, 6, 50), RAICHI_C);
        if (t >= 44 && st.raichi) {
          CE.cineGlow(ctx, st.raichi.x, st.raichi.y, 90, 'rgba(250,204,21,0.45)', 1 - seg(t, 44, 64));
          if (t < 52) CE.drawRadialSpeedLines(ctx, st.raichi.x, st.raichi.y, W, '#020617', 0.35 * (1 - (t - 44) / 8));
        }
        CE.cineSfx(S, 44, 'armario', () => window.SFX?.tackle?.());
      } else if (phase === 3) {
        const memEnd = 196;
        if (t < memEnd) {
          // memória: sem cor, com retícula
          bwBlue(ctx, W, H, 1);
          CE.finFillPat && CE.finFillPat(ctx, 'dots', 0, top, W, stageH, 0.18);
          CE.luckKicker(ctx, 40, top + 30, 'ANTES DO JOGO', seg(t, 20, 60), '#86efac');
        } else if (st.kuon) {
          // meio rosto no escuro (a luz vem só de um lado)
          CE.cineGradient(ctx, st.kuon.x - 20, top, 220, stageH, [[0, 'rgba(3,4,8,0)'], [1, 'rgba(3,4,8,0.82)']]);
          ctx.fillStyle = 'rgba(3,4,8,0.82)';
          ctx.fillRect(st.kuon.x + 200, top, W, stageH);
        }
        // corte de memória: escurece e volta
        const fade = Math.max(1 - Math.min(Math.abs(t - 0), Math.abs(t - memEnd)) / 10, 0);
        if (fade > 0) {
          ctx.fillStyle = `rgba(0,0,0,${fade})`;
          ctx.fillRect(0, top, W, stageH);
        }
      } else {
        if (t < 100) bwBlue(ctx, W, H, 0.55);
        if (t > 270) {
          ctx.fillStyle = `rgba(0,0,0,${seg(t, 270, 300) * 0.85})`;
          ctx.fillRect(0, 0, W, H);
        }
        CE.cineSfx(S, 214, 'sai', () => window.SFX?.kick?.(0.15));
      }
    }
  });

  // ==========================================================================
  // 4. O RELÂMPAGO VERMELHO (Chigiri) — chigiri_sprint — a ponta esquerda (oeste)
  // A ponta livre e o lançamento; o medo (o mundo sem cor, o joelho preso por correntes num
  // quadro, a lesão na memória) e a decisão (as correntes estouram, a cor volta); a arrancada
  // em travelling com câmera lenta no auge; o chute (o golpe da cena) e a rede; "não quebrou".
  // ==========================================================================
  const CHI_AT = [46.7, 17.8];
  const CHI_SHOT = [50.3, 9.0];
  const CHI_PH = [220, 330, 280, 260, 300];

  CE.registerCine3D('chigiri_sprint', {
    phases: CHI_PH,
    music: 'epic',
    title: '🐆 O RELÂMPAGO VERMELHO',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    tags: ['PLANO 1 • A PONTA LIVRE', 'PLANO 2 • AS CORRENTES', 'PLANO 3 • A ARRANCADA', 'PLANO 4 • O GOL', 'PLANO 5 • NÃO QUEBROU'],
    subs: [
      [{ from: 26, who: 'VOCÊ', text: '"CHIGIRI! A ponta tá livre!"', color: YOU_C }],
      [
        { from: 20, to: 196, who: 'CHIGIRI', text: '(E se o joelho estourar de novo?)', color: CHI_C },
        { from: 210, who: 'CHIGIRI', text: '"...Se quebrar, quebrou."', color: CHI_C }
      ],
      [
        { from: 60, to: 170, who: 'WANIMA', text: '"Ninguém alcança isso!"', color: '#4ade80' },
        { from: 176, who: 'VOCÊ', text: '(Ele tá voando!)', color: YOU_C }
      ],
      [{ from: 130, who: 'CHIGIRI', text: '"Eu sou o mais rápido daqui!"', color: CHI_C }],
      [
        { from: 24, to: 160, who: 'CHIGIRI', text: '"...Não quebrou."', color: CHI_C },
        { from: 196, who: 'BACHIRA', text: '"Que pernas, Chigiri!"', color: '#fde047' }
      ]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      K.expo(0.98);
      if (phase === 0) {
        // A PONTA LIVRE: a grua desce atrás do Time Z; o lançamento até o Chigiri
        A(K, 'gkw', [53, 7.1], { face: [53, 14], frame: 0 });
        A(K, 'wa', [55.8, 10.2], { face: [53, 16], frame: 0 });
        A(K, 'wk', [54.4, 12.0], { face: [55, 16], frame: 0 });
        A(K, 'wj', [55.6, 13.6], { face: [55, 16], frame: 0 });
        A(K, 'you', [55.2, 16.4], { face: CHI_AT, anim: t > 22 && t < 70 ? 'call_pass' : t >= 70 && t < 90 ? 'shoot' : 'idle', frame: t >= 70 && t < 90 ? 4 : t > 22 && t < 70 ? undefined : 0 });
        A(K, 'bachira', [52.6, 15.0], { face: [53, 9], frame: 0 });
        A(K, 'chigiri', CHI_AT, { face: [55, 16], frame: 0, light: [1.1, 0.88, 0.9] });
        const bk = seg(t, 72, 150);
        const b = t < 72 ? [55.0, 16.1, 0.05] : [lerp(55.0, CHI_AT[0] + 0.22, bk), lerp(16.1, CHI_AT[1] - 0.25, bk), 0.05 + Math.sin(bk * PI) * 1.1];
        ball(K, b);
        [CHI_AT, [55.2, 16.4], [54.4, 12.0]].forEach((p) => towerShadow(K, p, 0.24));
        const k = easeIO(seg(t, 0, 220));
        const fl = easeIO(seg(t, 70, 160));
        cam(K, shake(K, mixP([58.2, 21.4, 2.8], [49.7, 20.6, 0.7], k), f * 0.5, 0.006), [lerp(lerp(52.0, 54.6, seg(t, 0, 70)), CHI_AT[0], fl), lerp(lerp(13.6, 15.6, seg(t, 0, 70)), CHI_AT[1], fl), lerp(0.2, 0.5, k)], lerp(56, 44, k));
        st.ball = W3(b);
      } else if (phase === 1) {
        // AS CORRENTES: o Chigiri parado com a bola; o mundo perde a cor (o medo)
        A(K, 'chigiri', CHI_AT, { face: [47.6, 15.2], frame: 0, light: [1.05, 0.82, 0.86] });
        ball(K, [CHI_AT[0] + 0.12, CHI_AT[1] - 0.3, 0.05]);
        A(K, 'wj', [49.6, 15.4], { face: CHI_AT, frame: 0 });
        towerShadow(K, CHI_AT, 0.3);
        const decide = t >= 212;
        const k = easeIO(t / 330);
        const sh = decide && t < 236 ? 0.014 * (1 - seg(t, 212, 236)) : 0.004;
        const beat = t < 200 ? beatOf(t, [20, 38, 80, 98, 140, 158]) : 0;
        cam(K, shake(K, [lerp(48.2, 47.9, k), lerp(15.6, 15.35, k), lerp(0.45, 0.5, k)], f * 2, sh + beat * 0.004, 3), [CHI_AT[0], CHI_AT[1], 0.56], lerp(44, 40, k) - beat);
        st.chi = W3([CHI_AT[0], CHI_AT[1], 0.45]);
        st.feet = W3([CHI_AT[0], CHI_AT[1], 0]);
        st.top = W3([CHI_AT[0], CHI_AT[1], 0.9]);
      } else if (phase === 2) {
        const dashEnd = 40;
        if (t < dashEnd) {
          // DASH: rente ao chão, de frente; ele parte
          A(K, 'chigiri', [CHI_AT[0], CHI_AT[1] - seg(t, 8, 40) * 0.6], { face: [46.8, 8], anim: 'run', frame: Math.floor(f * 1.2), light: [1.25, 0.92, 0.95] });
          ball(K, [CHI_AT[0] + 0.1, CHI_AT[1] - 0.34 - seg(t, 8, 40) * 0.6, 0.05]);
          const sh = 0.02 * (1 - seg(t, 6, 26));
          cam(K, shake(K, [46.95, 15.15, 0.2], f * 2, sh, 2), [CHI_AT[0], CHI_AT[1], 0.6], 46);
        } else {
          // a arrancada pela ponta: travelling de lado; câmera lenta no auge
          const u = t - dashEnd;
          const A0 = remap(u, [[0, 0], [90, 90], [170, 118], [240, 188]]);
          const cy = lerp(17.0, 8.9, A0 / 188);
          A(K, 'chigiri', [46.85, cy], { face: [46.85, 6], anim: 'run', frame: Math.floor(A0 * 0.75), light: [1.2, 0.92, 0.94] });
          ball(K, [46.92, cy - 0.36, 0.05 + Math.abs(Math.sin(A0 * 0.35)) * 0.06]);
          towerShadow(K, [46.85, cy], 0.28);
          [['wj', 10], ['wk', 30]].forEach(([w, at], i) => {
            const wy = cy + 1.3 + Math.max(0, A0 - at) * 0.022 + i * 0.45;
            A(K, w, [46.35 - i * 0.4, wy], { face: [47, 6], anim: 'run', frame: Math.floor(A0 * 0.5) + i * 2 });
          });
          A(K, 'gkw', [53, 7.1], { face: [47, 12], frame: 0 });
          cam(K, shake(K, [49.55, cy + 0.35, 0.48], f * 0.8, 0.006), [46.85, cy - 0.15, 0.48], 44);
          st.A = A0;
          st.chi = W3([46.85, cy, 0.5]);
        }
      } else if (phase === 3) {
        const KT = 82;
        const netAt = 100;
        if (t < netAt) {
          // o corte para dentro e o chute (câmera lenta na armada)
          const A0 = remap(t, [[0, 0], [52, 52], [82, 60], [100, 78]]);
          const KA = 60;
          const cp = [lerp(49.4, CHI_SHOT[0], ease(seg(A0, 0, 52))), lerp(9.6, CHI_SHOT[1], ease(seg(A0, 0, 52)))];
          const an = A0 < 50 ? 'run' : A0 < KA ? 'windup' : 'shoot';
          A(K, 'chigiri', cp, { face: [53.6, 6.6], anim: an, frame: an === 'run' ? Math.floor(A0 * 0.6) : 4, light: [1.2, 0.9, 0.92] });
          A(K, 'gkw', [52.9, 7.3], { face: cp, frame: 0 });
          A(K, 'wj', [48.9, 10.0], { face: cp, anim: 'run', frame: Math.floor(A0 * 0.5) });
          let b;
          if (A0 < KA) b = [cp[0] + 0.22, cp[1] - 0.25, 0.05];
          else {
            const q = seg(A0, KA, KA + 16);
            b = [lerp(CHI_SHOT[0] + 0.25, 53.6, q), lerp(CHI_SHOT[1] - 0.25, 6.6, q), lerp(0.1, 0.55, q)];
          }
          ball(K, b);
          const sh = A0 >= KA ? 0.035 * Math.max(0, 1 - (A0 - KA) / 24) : 0.004;
          cam(K, shake(K, [lerp(52.2, 51.95, seg(A0, 0, KA)), lerp(11.55, 11.3, seg(A0, 0, KA)), 0.33], f * 2, sh, 6), [50.45, 8.95, 0.5], lerp(46, 42, seg(A0, 0, KA)));
          st.A = A0;
          st.foot = W3([CHI_SHOT[0] + 0.22, CHI_SHOT[1] - 0.25, 0.1]);
          st.ball = W3(b);
        } else {
          // a rede, de dentro do gol; o Chigiri comemorando lá atrás
          const u = t - netAt;
          const HIT = 12;
          const b = u < HIT ? [lerp(53.0, 53.65, u / HIT), lerp(7.9, 6.3, u / HIT), lerp(0.45, 0.55, u / HIT)] : [53.65, 6.28, Math.max(0.1, 0.55 - (u - HIT) * 0.02)];
          ball(K, b, { k: 0.9 });
          const kk = seg(u, 0, HIT + 10);
          A(K, 'gkw', [lerp(52.8, 53.5, ease(kk)), 8.5], { face: [53, 14], z: Math.sin(kk * PI) * 0.2, anim: 'dive', opts: { animTime: kk * 30 } });
          A(K, 'chigiri', [CHI_SHOT[0] + seg(u, 40, 160) * 1.2, CHI_SHOT[1] + seg(u, 40, 160) * 1.4], { face: [51, 13], anim: u > 30 ? 'celebrate' : 'shoot', frame: 4, light: [1.2, 0.9, 0.92] });
          cam(K, shake(K, [lerp(53.25, 52.9, seg(u, 0, 160)), 6.18, 0.46], f * 2, u >= HIT ? 0.012 * Math.max(0, 1 - (u - HIT) / 26) : 0.002, 5), [52.2, 9.6, 0.5], lerp(60, 53, seg(u, 0, 160)));
          st.ball = W3(b);
          st.u = u;
        }
      } else {
        // NÃO QUEBROU: ele parado, respirando; o time chega; a grua sobe
        const cp = [50.6, 9.4];
        A(K, 'chigiri', cp, { face: [50.6, 13], frame: 0, light: [1.15, 0.94, 0.96] });
        towerShadow(K, cp, 0.3);
        const kt = ease(seg(t, 170, 236));
        if (kt > 0) {
          A(K, 'bachira', [lerp(48.0, 49.6, kt), lerp(11.0, 10.1, kt)], { face: cp, anim: kt < 1 ? 'run' : 'celebrate', frame: undefined });
          A(K, 'you', [lerp(53.9, 51.9, kt), lerp(10.2, 9.9, kt)], { face: cp, anim: kt < 1 ? 'run' : 'idle', frame: kt < 1 ? undefined : 0 });
        }
        const k = easeIO(seg(t, 0, 170));
        const up = easeIO(seg(t, 170, 300));
        const breath = Math.sin(t * 0.09) * 0.008 * (1 - up);
        cam(K, mixP([lerp(50.95, 50.8, k), lerp(11.95, 11.75, k), 0.55 + breath], [52.6, 13.4, 1.9], up), mixP([cp[0], cp[1], 0.52], [50.8, 9.8, 0.3], up), lerp(42, 50, up));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, stageH } = S;
      const st = onScreen(K);
      if (phase === 0) {
        flares(ctx, K, S, 0.8, '254,205,211');
        CE.luckKicker(ctx, 40, top + 30, 'TIME Z x TIME W • RETA FINAL', seg(t, 6, 50), CHI_C);
        CE.cineSfx(S, 76, 'lancamento', () => window.SFX?.kick?.(0.6));
        CE.cineSfx(S, 150, 'domina', () => window.SFX?.pass?.());
      } else if (phase === 1) {
        const p = st.chi || { x: W / 2, y: H * 0.6 };
        const r = figR(st, 120);
        const decide = t >= 212;
        // o medo: tudo sem cor menos ele; na decisão a cor volta em círculo a partir dele
        if (!decide) bwBlue(ctx, W, H, seg(t, 4, 30), { inside: false, x: p.x, y: p.y, r });
        else bwBlue(ctx, W, H, 1, { inside: false, x: p.x, y: p.y, r: r + ease(seg(t, 212, 236)) * W * 1.3 });
        // o joelho preso pelas correntes (o quadro grande); a lesão na memória (o pequeno)
        if (t > 40) {
          const snap = seg(t, 212, 236);
          const beat = beatOf(t, [80, 98, 140, 158]);
          const chi = cdOf(K, 'chigiri');
          manga(ctx, [[W * 0.5, top + 18], [W - 18, top + 10], [W - 24, bot - 16], [W * 0.54, bot - 10]], seg(t, 40, 50), [W * 0.4, 0], (CA, b, g) => {
            g.fillStyle = decide ? '#ffe4e6' : '#d4d4d8';
            g.fillRect(b.x, b.y, b.w, b.h);
            const kx = b.x + b.w * 0.5 + b.ox;
            const ky = b.y + b.h * 0.42;
            if (decide) CA.speedRadial(g, kx, ky, b.x + b.w * 2, b.y + b.h * 2, { color: 'rgba(190,18,60,0.6)', inner: b.h * 0.22, n: 50, thick: 1.6 });
            // a perna (meião do Time Z) e a chuteira
            CA.boot(g, kx - b.w * 0.05, b.y + b.h * 0.92, b.h * 0.16, { sock: chi.jerseyPrimary || '#0f2942', sock2: '#38bdf8', boot: '#f472b6', ang: 0.05 });
            // o joelho: luz vermelha batendo junto com o coração
            g.fillStyle = `rgba(239,68,68,${0.25 + beat * 0.45})`;
            g.beginPath();
            g.arc(kx - b.w * 0.04, ky + b.h * 0.08, b.h * (0.13 + beat * 0.03), 0, TAU);
            g.fill();
            const L = b.h * 0.075;
            const gap = decide ? ease(snap) : 0;
            chainArt(g, b.x - 10, ky - b.h * 0.05, b.x + b.w + 10, ky + b.h * 0.22, L, gap);
            chainArt(g, b.x - 10, ky + b.h * 0.26, b.x + b.w + 10, ky - b.h * 0.02, L, gap);
            if (!decide) CA.halftone(g, b.x, b.y, b.w, b.h, { color: 'rgba(15,23,42,0.3)', from: 'bottom', step: 14 });
          });
          if (t > 84 && t < 200) {
            manga(ctx, [[W * 0.05, top + 20], [W * 0.36, top + 14], [W * 0.34, top + stageH * 0.55], [W * 0.04, top + stageH * 0.6]], seg(t, 84, 92), [-W * 0.4, 0], (CA, b, g) => {
              CE.cineGradient(g, b.x, b.y, b.w, b.h, [[0, '#3f3f46'], [1, '#09090b']]);
              // (a corrida de um ano atrás tombando: a silhueta gira em volta do pé)
              const fall = ease(seg(t, 96, 130));
              const fx = b.x + b.w * lerp(0.42, 0.5, fall) + b.ox;
              const fy = b.y + b.h * 0.96;
              g.save();
              g.translate(fx, fy);
              g.rotate(fall * 1.25);
              g.translate(-fx, -fy);
              CA.silhouette(g, chi, fx, fy, b.h * 1.0, { pose: 'run', frame: 4, fill: '#18181b', rim: '#a1a1aa' });
              g.restore();
              if (fall > 0.6) {
                g.fillStyle = 'rgba(239,68,68,0.85)';
                g.beginPath();
                g.arc(b.x + b.w * 0.56 + b.ox, b.y + b.h * 0.8, b.h * 0.08, 0, TAU);
                g.fill();
              }
              CA.halftone(g, b.x, b.y, b.w, b.h, { color: 'rgba(250,250,250,0.18)', from: 'bottom', step: 14 });
            });
          }
        }
        [20, 38, 80, 98, 140, 158].forEach((b, i) => CE.cineSfx(S, b, 'tum' + i, () => window.SFX?.kick?.(0.15)));
        CE.cineSfx(S, 212, 'decide', () => window.SFX?.tackle?.());
      } else if (phase === 2) {
        const dashEnd = 40;
        if (t < dashEnd) {
          CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, 0, 8)), '#ffe4e6');
          CE.drawSpeedLines(ctx, W, H, '#fda4af', 0.3 * (1 - seg(t, 20, 40)));
          CE.cineSfx(S, 2, 'dash', () => window.SFX?.whoosh?.());
        } else {
          const A0 = st.A || 0;
          const slow = seg(A0, 88, 96) * (1 - seg(A0, 112, 120));
          // linhas paralelas na direção da corrida (o vermelho dele) e o vento
          if (CE.ART) {
            ctx.save();
            CE.ART.speedLines(ctx, 0, W, H, { color: `rgba(253,164,175,${0.35 - slow * 0.2})`, n: 34, t: A0, speed: 40, thick: 3 });
            ctx.restore();
          }
          if (st.chi) CE.cineGlow(ctx, st.chi.x, st.chi.y, 120, 'rgba(251,113,133,0.22)', 0.6 + slow * 0.4);
          CE.cineSfx(S, dashEnd + 20, 'vento', () => window.SFX?.whoosh?.());
        }
      } else if (phase === 3) {
        const netAt = 100;
        if (t < netAt) {
          const A0 = st.A || 0;
          const KA = 60;
          const fp = st.foot || { x: W * 0.5, y: H * 0.7 };
          if (A0 > 50 && A0 < KA) {
            const q = seg(A0, 50, KA);
            manga(ctx, [[W * 0.46, top + 20], [W - 18, top + 12], [W - 24, bot - 20], [W * 0.5, bot - 12]], seg(A0, 50, 51.5), [W * 0.4, 0], (CA, b, g) =>
              artBoot(CA, b, g, { bg: '#ffe4e6', bx: 0.62, by: 0.46, fx: lerp(0.2, 0.46, easeIO(q)), fy: lerp(0.95, 0.68, easeIO(q)), s: 0.15, ang: lerp(1.0, -0.15, easeIO(q)), sock: '#0f2942', sock2: '#38bdf8', boot: '#f472b6', radial: 'rgba(136,19,55,0.7)', burst: q > 0.8 ? ease((q - 0.8) / 0.2) : 0, rot: q * 3, tone: true })
            );
          }
          if (A0 >= KA && A0 < KA + 1.5) impactFrame(ctx, W, H);
          if (A0 >= KA) {
            CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(A0, KA + 1, KA + 8)));
            if (A0 < KA + 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - (A0 - KA) / 8));
            if (st.ball) CE.luckStreak(ctx, fp.x, fp.y, st.ball.x, st.ball.y, 5, 30, '251,113,133', 0.85 * (1 - seg(A0, KA + 10, KA + 18)));
            CE.cineImpactText(ctx, 'DOM!!', W * 0.24, top + 120, 110, '#f8fafc', seg(A0, KA, KA + 6), W * 0.4, -0.1);
          }
          CE.cineSfx(S, 82, 'chute', () => window.SFX?.kick?.(1));
        } else {
          const u = st.u || 0;
          netHit(ctx, S, st, u, 12);
          if (u >= 12) {
            CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(u, 12, 22)));
            CE.cineBokeh(ctx, W, top, top + stageH * 0.5, t, 24, ['rgba(255,255,255,0.55)', 'rgba(251,113,133,0.45)'], 4);
            CE.cineImpactText(ctx, 'GOOOOL!!', W / 2, top + stageH * 0.44, 140, '#f8fafc', seg(u, 16, 24), W * 0.86, -0.06);
          }
          CE.cineSfx(S, netAt + 12, 'rede', () => window.SFX?.goal?.(true));
        }
      } else {
        flares(ctx, K, S, 0.6 + 0.4 * seg(t, 170, 260), '254,205,211');
        // o joelho inteiro e a corrente partida largada no gramado
        if (t > 60 && t < 150) {
          const chi = cdOf(K, 'chigiri');
          manga(ctx, [[W * 0.56, top + 22], [W - 22, top + 14], [W - 28, bot - 20], [W * 0.6, bot - 12]], seg(t, 60, 68), [W * 0.4, 0], (CA, b, g) => {
            CE.cineGradient(g, b.x, b.y, b.w, b.h, [[0, '#fff1f2'], [1, '#fecdd3']]);
            CA.boot(g, b.x + b.w * 0.45 + b.ox, b.y + b.h * 0.78, b.h * 0.16, { sock: chi.jerseyPrimary || '#0f2942', sock2: '#38bdf8', boot: '#f472b6', ang: 0.04 });
            g.fillStyle = '#15803d';
            g.fillRect(b.x, b.y + b.h * 0.86, b.w, b.h * 0.14);
            chainArt(g, b.x + b.w * 0.05, b.y + b.h * 0.9, b.x + b.w * 0.95, b.y + b.h * 0.92, b.h * 0.06, 0.55);
          });
        }
        if (t > 276) {
          ctx.fillStyle = `rgba(0,0,0,${seg(t, 276, 300) * 0.8})`;
          ctx.fillRect(0, 0, W, H);
        }
      }
    }
  });
})();
