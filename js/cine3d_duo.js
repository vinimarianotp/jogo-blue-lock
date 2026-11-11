// ============================================================================
// CUTSCENES EM 3D — CARREIRA EM DUPLA "PROJETO ELO" (lore original do jogo)
//   duo_ponte       • a quadra debaixo da Ponte Velha (área vazia): a final de rua, o frente
//                     a frente, o lance roubado pelos mascarados, o poste e as duas casas
//   duo_elo         • a sala dos monitores do Ego (onde a conversa acontece): as trinta duplas
//                     nos monitores, a pulseira fechando, a corrente de luz
//   duo_ressonancia • os dois no mesmo segundo, a corrida, o chute dos dois e o gol (campo)
//   duo_regra       • o auditório vermelho (saguão): o Ego no telão, o "1", a corrente rachando
//   duo_mascaras    • a sala do Ego no escuro (onde a conversa acontece): a máscara rachando,
//                     Shion Mikami e Haru Ibuki
//   duo_final       • a final no campo: sem olhar, o chute, o gol e as pulseiras
// Refeitas no padrão do gol da Sub-20 (js/cine3d_u20.js, docs/DIRECAO_DE_ARTE.md): câmera
// sempre andando, câmera lenta com rampa nos momentos certos, closes em quadros de mangá em
// pixel art (pulseira, chuteiras, máscara, carta), no máximo um quadro de impacto por cena e
// pouco texto (legenda, letreiro pequeno de lugar e uma onomatopeia no golpe).
// Os dois protagonistas vêm do CE.duoCast (A = quem fundou a dupla, ciano; B = o parceiro,
// coral; os dois juntos: o dourado do Elo). A sala do Ego é a de js/cine3d_espanha.js
// (CE.c3EgoRoom), a mesma em que o js/cine3d.js filma as conversas com bg 'monitor_room'.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;

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
  const mixP = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const mod = (a, n) => ((a % n) + n) % n;
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const rgbOf = (hex) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    return m ? [1, 2, 3].map((i) => parseInt(m[i], 16)) : [253, 224, 71];
  };
  const rgba = (hex, a) => `rgba(${rgbOf(hex).join(',')},${a})`;
  // tempo da ação com câmera lenta: keys = [[tempo real, tempo da ação], ...]
  const remap = (t, keys) => {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    }
    return keys[keys.length - 1][1] + (t - keys[keys.length - 1][0]);
  };
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp * 0.6, p[2] + K.noise(f, seed + 7) * amp];
  const PIX = 6; // pixel dos quadros de mangá (a escala dos bonecos)
  const CAa = () => CE.ART;
  // (os padrões entram no próprio def: Object.assign num objeto novo leria o "get theme" uma
  // vez só, e a Ressonância na partida perderia as cores do estádio da partida)
  const reg = (type, def) => {
    [['letterbox', 0.1], ['grain', 0.05], ['vignette', 0.5]].forEach(([k, v]) => {
      if (!(k in def)) def[k] = v;
    });
    CE.registerCine3D(type, def);
  };

  // Cores e uniformes
  const GOLD = '#fde047';
  const CA = '#38bdf8';
  const CB = '#fb7185';
  const RED = '#dc2626';
  const HOKUTO = { jerseyPrimary: '#0f766e', jerseySecondary: '#f8fafc' };
  const SEIRAN = { jerseyPrimary: '#7f1d1d', jerseySecondary: '#fbbf24' };
  const ELO = { jerseyPrimary: '#111c44', jerseySecondary: '#fde047' };
  const CASUAL_A = { jerseyPrimary: '#1f2937', jerseySecondary: '#38bdf8' };
  const CASUAL_B = { jerseyPrimary: '#3f1d1d', jerseySecondary: '#fb7185' };
  const MASK_KIT = { jerseyPrimary: '#0a0a0a', jerseySecondary: '#e5e7eb' };
  const SHION_KIT = { jerseyPrimary: '#0a0a0a', jerseySecondary: '#e5e7eb' };
  const HARU_KIT = { jerseyPrimary: '#0a0a0a', jerseySecondary: '#dc2626' };
  const LA = [1.0, 1.12, 1.25]; // luz puxada pro ciano (A) e pro coral (B), de leve
  const LB = [1.25, 1.04, 1.06];

  // ---------------------------------------------------------------- utilidades
  const mkCv = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (draw) draw(g, w, h);
    return c;
  };
  const lazy = (fn) => {
    let v = null;
    return () => v || (v = fn());
  };
  const M10 = () => (window.SPRITE_MAPY || ((v) => v))(10);
  // os olhos de um boneco na tela (e px por unidade do boneco): para a máscara por cima
  function eyeOf(K, x, y, z = 0, k = 0.9, dir = 0) {
    const ez = z + (k * (66 - 2 * M10())) / 66;
    const p = K.screen(x, ez, y);
    const q = K.screen(x, ez + 0.2, y);
    if (!p || !q) return null;
    const u = (Math.hypot(p.x - q.x, p.y - q.y) / 0.2) * ((2 * k) / 66);
    return { x: p.x + dir * 2.6 * u, y: p.y, u };
  }
  const plateAng = (x, y, vx, vy) => Math.atan2(y - vy, x - vx);
  const camAng = (K, x, y) => plateAng(x, y, K.c.eye[0], K.c.eye[2]);

  // ---------------------------------------------------------------- letrinhas de pixel (3x5)
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
    G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
    S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111',
    4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
    '.': '000000000000010', ',': '000000000010100', '-': '000000111000000', ':': '000010000010000', '!': '010010010000010', '•': '000000010000000', '+': '000010111010000'
  };
  const plain = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const pxW = (s, k = 1) => Math.max(0, plain(s).length * 4 - 1) * k;
  function pxText(g, s, x, y, k, color, align = 'left') {
    const str = plain(s);
    let x0 = align === 'center' ? x - pxW(str, k) / 2 : align === 'right' ? x - pxW(str, k) : x;
    g.fillStyle = color;
    for (const ch of str) {
      const bits = FONT[ch];
      if (bits) for (let i = 0; i < 15; i++) if (bits[i] === '1') g.fillRect(Math.round(x0 + (i % 3) * k), Math.round(y + Math.floor(i / 3) * k), k, k);
      x0 += 4 * k;
    }
  }
  // desenha um canvas de pixel no quadro de mangá (1 px da arte = 1 px do quadro)
  function blit(g, cv, x, y, ang = 0, flip = false, k = 1) {
    g.save();
    g.imageSmoothingEnabled = false;
    g.translate(x, y);
    if (ang) g.rotate(ang);
    if (flip) g.scale(-1, 1);
    const w = cv.width * PIX * k;
    const h = cv.height * PIX * k;
    g.drawImage(cv, -w / 2, -h / 2, w, h);
    g.restore();
  }

  // ---------------------------------------------------------------- pós (no overlay)
  function bwBlue(ctx, W, H, a = 1) {
    if (a <= 0) return;
    ctx.save();
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
  // a cor indo embora de fora para dentro com a borda macia (r0 = colorido, r1 = sem cor)
  function bwSoft(ctx, W, H, cx, cy, r0, r1, a = 1) {
    if (a <= 0) return;
    ctx.save();
    [['saturation', 'rgba(128,128,128,', 1], ['color', 'rgba(59,130,246,', 0.32]].forEach(([op, col, m]) => {
      const g = ctx.createRadialGradient(cx, cy, Math.max(0, r0), cx, cy, Math.max(r0 + 1, r1));
      g.addColorStop(0, col + '0)');
      g.addColorStop(1, col + clamp(a) * m + ')');
      ctx.globalCompositeOperation = op;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });
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
  function flareAt(ctx, S, p, k = 1, tint = '186,230,253') {
    if (!p || k <= 0) return;
    const { W, H } = S;
    if (p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 120) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    CE.cineGlow(ctx, p.x, p.y, 110, 'rgba(255,255,255,0.5)', k);
    CE.cineGlow(ctx, p.x, p.y, 34, 'rgba(255,255,255,0.95)', k);
    const gr = ctx.createLinearGradient(p.x - 400, 0, p.x + 400, 0);
    gr.addColorStop(0, `rgba(${tint},0)`);
    gr.addColorStop(0.5, `rgba(${tint},${0.45 * k})`);
    gr.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(p.x - 400, p.y - 2, 800, 4);
    [[0.45, 24, 'rgba(56,189,248,0.2)'], [0.8, 12, 'rgba(250,204,21,0.18)'], [1.3, 38, 'rgba(99,102,241,0.12)']].forEach(([f, r, col]) => {
      CE.cineGlow(ctx, p.x + (W / 2 - p.x) * f * 2, p.y + (H / 2 - p.y) * f * 2, r, col, k);
    });
    ctx.restore();
  }
  const TOWERS = [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]];
  const towerFlares = (ctx, K, S, k = 1) => TOWERS.forEach(([x, y]) => flareAt(ctx, S, K.screen(x, 3.33, y), k));
  // rede em primeiro plano estufando onde a bola bate (de dentro do gol)
  function netOverlay(ctx, S, hit, q) {
    const { W, top, bot } = S;
    const N = 26;
    const cell = W / N;
    const bulge = (x, y) => {
      if (!hit) return [x, y];
      const dx = x - hit.x;
      const dy = y - hit.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 260) return [x, y];
      const k = Math.cos(((d / 260) * Math.PI) / 2) * q;
      return [x + (dx / d) * k * 70, y + (dy / d) * k * 70];
    };
    ctx.save();
    ctx.strokeStyle = 'rgba(241,245,249,0.5)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= N + 2; i++) {
      [0, 1].forEach((side) => {
        ctx.beginPath();
        for (let j = 0; j <= 30; j++) {
          const y = top + ((bot - top) * j) / 30;
          const x = side ? i * cell - (j % 2) * cell * 0.5 + cell * 0.5 : i * cell + (j % 2) * cell * 0.5;
          const [bx, by] = bulge(x, y);
          if (j) ctx.lineTo(bx, by);
          else ctx.moveTo(bx, by);
        }
        ctx.stroke();
      });
    }
    ctx.restore();
  }
  // confete em quadradinhos (pixel)
  function confetti(ctx, S, t, n = 60, k = 1, cols = [GOLD, CA, CB, '#f8fafc']) {
    if (k <= 0) return;
    const { W, top, bot } = S;
    ctx.save();
    ctx.globalAlpha = clamp(k);
    for (let i = 0; i < n; i++) {
      const x = (rnd(i, 21) * W + Math.sin(t * 0.03 + i) * 30) % W;
      const y = top + ((rnd(i, 22) * (bot - top) + t * (1.2 + rnd(i, 23) * 1.6)) % (bot - top));
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(Math.round(x / 6) * 6, Math.round(y / 6) * 6, 6, 6);
    }
    ctx.restore();
  }
  const kicker = (ctx, x, y, text, k, color) => CE.luckKicker && CE.luckKicker(ctx, x, y, text, k, color);
  const sfx = (S, at, id, fn) => (CE.ptdSfx ? CE.ptdSfx(S, at, id, fn) : CE.cineSfx(S, at, id, fn));
  const fadeIn = (ctx, S) => {
    if (S.phase === 0 && S.t < 10) CE.cineFlash(ctx, S.W, S.H, 1 - S.t / 10, '#000000');
  };

  // ---------------------------------------------------------------- elenco
  const PARTNER = { name: 'Parceiro', hairColor: '#f97316', hairSecondary: '#fde047', hairStyle: 'knight_wild', eyeColor: '#38bdf8', skinColor: '#f1c9a5', number: 7 };
  let CAST = null;
  function cast() {
    const run = CE._cineRun || 0;
    if (CAST && CAST.run === run) return CAST;
    let c = null;
    try {
      c = CE.duoCast ? CE.duoCast() : null;
    } catch (e) {
      c = null;
    }
    if (!c || !c.a || !c.b) {
      const p = window.App?.state?.profile || {};
      c = { a: Object.assign({ skinColor: '#f3d1b8', hairStyle: 'spiky_tall' }, p, { id: 'duo_a' }), b: Object.assign({ id: 'duo_b' }, PARTNER), an: String(p.name || 'A').toUpperCase(), bn: 'PARCEIRO' };
    }
    CAST = Object.assign({ run }, c);
    return CAST;
  }
  const duo = (K, side, kit, o) => K.actor(cast()[side], Object.assign({ id: side, extra: Object.assign({ duoSide: side }, kit) }, o));
  const masked = (i) => (CE.duoMasked ? CE.duoMasked(i) : Object.assign({ name: 'mascarado' + i, hairStyle: 'slick_back' }, MASK_KIT));
  function people(n, seed, kit) {
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    const cols = A.CREATOR_HAIR_COLORS || ['#1b2340'];
    let s = seed;
    const r = (m) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % m);
    const out = [];
    for (let i = 0; i < n; i++) out.push(Object.assign({ name: 'duo_fig' + seed + '_' + i, skinColor: skins[r(skins.length)], hairColor: cols[r(cols.length)], hairSecondary: cols[r(cols.length)], eyeColor: '#1e293b', hairStyle: hairs[r(hairs.length)], number: 1 + r(60) }, kit));
    return out;
  }

  // ---------------------------------------------------------------- texturas
  const HALO = lazy(() =>
    mkCv(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    })
  );
  const CONE = lazy(() =>
    mkCv(32, 64, (g) => {
      for (let y = 0; y < 64; y++) {
        const q = y / 63;
        const half = 2 + q * 14;
        g.fillStyle = `rgba(255,255,255,${(0.7 * (1 - q * 0.75)).toFixed(3)})`;
        g.fillRect(Math.round(16 - half), y, Math.round(half * 2), 1);
      }
    })
  );
  const RING = lazy(() =>
    mkCv(64, 64, (g) => {
      g.fillStyle = 'rgba(255,255,255,0.95)';
      for (let a = 0; a < TAU; a += 0.02) g.fillRect(Math.round(32 + Math.cos(a) * 28) - 1, Math.round(32 + Math.sin(a) * 28) - 1, 3, 3);
    })
  );
  const dot = (c) => mkCv(2, 2, (g) => ((g.fillStyle = c), g.fillRect(0, 0, 2, 2)));
  const LED_ON = lazy(() => dot(GOLD));
  const LED_RED = lazy(() => dot('#ef4444'));
  const LED_OFF = lazy(() => dot('#334155'));
  const PHONE = lazy(() => mkCv(3, 4, (g) => ((g.fillStyle = '#ffffff'), g.fillRect(0, 0, 3, 4))));
  const link = (w, h, col) =>
    mkCv(w, h, (g) => {
      g.fillStyle = '#020617';
      g.fillRect(0, 0, w, h);
      g.fillStyle = col;
      g.fillRect(1, 1, w - 2, h - 2);
      g.fillStyle = '#020617';
      if (w > h) g.fillRect(3, Math.floor(h / 2), w - 6, 1);
      else g.fillRect(Math.floor(w / 2), 3, 1, h - 6);
    });
  const LINKS = lazy(() => ({ h: link(12, 7, GOLD), v: link(7, 12, GOLD), hr: link(12, 7, '#ef4444'), vr: link(7, 12, '#ef4444') }));
  function halo(K, x, y, z, size, color, a) {
    if (a <= 0.01) return;
    K.quad({ x, y, z: z - size / 2, w: size, h: size, ang: camAng(K, x, y), img: HALO(), color, alpha: Math.min(0.98, a), em: true });
  }
  // corrente de luz em 3D entre p0 e p1 ([x, y, z]); k = quanto já apareceu, brk = rachando
  function chain3d(K, p0, p1, t, k = 1, brk = 0) {
    if (k <= 0) return;
    const L = LINKS();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const q = i / n;
      if (q > k) break;
      const mid = Math.abs(q - 0.5) < 0.12;
      let x = lerp(p0[0], p1[0], q);
      const y = lerp(p0[1], p1[1], q);
      let z = lerp(p0[2], p1[2], q) - Math.sin(q * Math.PI) * 0.1 + Math.sin(t * 0.25 + i) * 0.006;
      let a = 1;
      if (brk > 0 && mid) {
        z -= easeIn(brk) * (0.35 + i * 0.015);
        x += (rnd(i, 4) - 0.5) * 0.25 * brk;
        a = 1 - brk;
      }
      if (a <= 0.02 || z < 0.02) continue;
      const red = brk > 0 && mid;
      const vert = i % 2;
      const cv = vert ? (red ? L.vr : L.v) : red ? L.hr : L.h;
      const w = vert ? 0.055 : 0.095;
      const h = vert ? 0.095 : 0.055;
      K.sprite(cv, { x, y, z: z - h / 2, w, h, glow: true, alpha: a < 1 ? a : 1 });
    }
  }
  function wristLed(K, S, x, y, i, red) {
    const on = mod(S.f * 0.05 + rnd(i, 12) * 6, 6) < 3.5;
    K.sprite(on ? (red ? LED_RED() : LED_ON()) : LED_OFF(), { x, y, z: 0.31, w: 0.04, h: 0.04, glow: on });
  }

  // ======================================================================
  // CENÁRIO 1 — A QUADRA DEBAIXO DA PONTE VELHA (na área vazia, à noite)
  // ======================================================================
  const V = [86, 17];
  const COURT = { x0: 79, x1: 93, y0: 14.2, y1: 21.8 };
  const LAMPS = [82.4, 86.0, 89.6];
  const LAMP_Y = 14.3;
  const COURT_TEX = lazy(() =>
    mkCv(140, 76, (g, w, h) => {
      g.fillStyle = '#20263a';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = i % 2 ? 'rgba(148,163,184,0.12)' : 'rgba(2,6,23,0.3)';
        g.fillRect(Math.floor(rnd(i, 8) * w), Math.floor(rnd(i, 9) * h), 1, 1);
      }
      [[30, 50, 11], [100, 20, 8], [75, 60, 6]].forEach(([x, y, r]) => {
        g.fillStyle = 'rgba(30,41,82,0.55)';
        for (let yy = -Math.round(r / 2); yy <= Math.round(r / 2); yy++) {
          const ww = Math.round(r * Math.sqrt(Math.max(0, 1 - (yy / (r / 2 + 0.5)) ** 2)));
          g.fillRect(x - ww, y + yy, ww * 2, 1);
        }
      });
      g.fillStyle = 'rgba(226,232,240,0.5)';
      g.fillRect(3, 3, w - 6, 1);
      g.fillRect(3, h - 4, w - 6, 1);
      g.fillRect(3, 3, 1, h - 6);
      g.fillRect(w - 4, 3, 1, h - 6);
      g.fillRect(w / 2, 3, 1, h - 6);
      for (let a = 0; a < TAU; a += 0.04) g.fillRect(Math.floor(w / 2 + Math.cos(a) * 15), Math.floor(h / 2 + Math.sin(a) * 15), 1, 1);
      for (let i = 0; i < 160; i++) g.clearRect(Math.floor(rnd(i, 3) * w), Math.floor(rnd(i, 5) * h), 1, 1);
    })
  );
  const MESH = lazy(() =>
    mkCv(320, 25, (g, w, h) => {
      g.fillStyle = 'rgba(120,135,160,0.6)';
      for (let y = 2; y < h; y++) for (let x = 0; x < w; x++) if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) g.fillRect(x, y, 1, 1);
      g.fillStyle = '#475569';
      g.fillRect(0, 0, w, 2);
      for (let x = 0; x < w; x += 40) g.fillRect(x, 0, 2, h);
    })
  );
  const NET = lazy(() =>
    mkCv(24, 16, (g, w, h) => {
      g.fillStyle = 'rgba(226,232,240,0.55)';
      for (let x = 0; x < w; x += 3) g.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
    })
  );
  const CITY = lazy(() =>
    mkCv(512, 80, (g, w, h) => {
      for (let x = 0; x < w; ) {
        const bw = 8 + Math.floor(rnd(x, 3) * 20);
        const bh = 10 + Math.floor(rnd(x, 4) * 30);
        const by = h - bh;
        g.fillStyle = '#0d0a2a';
        g.fillRect(x, by, bw - 1, bh);
        for (let yy = by + 3; yy < h - 2; yy += 4) {
          for (let xx = x + 2; xx < x + bw - 3; xx += 3) {
            if (rnd(xx * 7 + yy, 5) > 0.72) {
              g.fillStyle = rnd(xx + yy, 6) > 0.5 ? '#fbbf24' : '#93c5fd';
              g.fillRect(xx, yy, 1, 1);
            }
          }
        }
        x += bw;
      }
    })
  );
  const MOON = lazy(() =>
    mkCv(24, 24, (g) => {
      g.fillStyle = '#fef3c7';
      for (let y = 0; y < 24; y++) {
        const half = Math.floor(Math.sqrt(Math.max(0, 132 - (y - 11.5) * (y - 11.5))));
        g.fillRect(12 - half, y, half * 2, 1);
      }
      g.fillStyle = 'rgba(203,213,225,0.75)';
      [[6, 8, 3], [14, 13, 2], [9, 16, 2]].forEach(([x, y, r]) => g.fillRect(x, y, r, r));
    })
  );
  const PILLAR = lazy(() =>
    mkCv(24, 60, (g, w, h) => {
      g.fillStyle = '#161d2e';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#24304a';
      g.fillRect(2, 0, 3, h);
      for (let i = 0; i < 80; i++) {
        g.fillStyle = 'rgba(2,6,23,0.4)';
        g.fillRect(Math.floor(rnd(i, 2) * w), Math.floor(rnd(i, 7) * h), 2, 1);
      }
      g.fillStyle = '#7c3aed';
      g.fillRect(6, 34, 12, 3);
      g.fillStyle = '#dc2626';
      g.fillRect(8, 39, 9, 2);
      g.fillStyle = '#fde047';
      g.fillRect(7, 44, 3, 3);
    })
  );
  const RAIL = lazy(() =>
    mkCv(160, 8, (g, w, h) => {
      g.fillStyle = '#111827';
      g.fillRect(0, 0, w, 1);
      for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
    })
  );
  const ARCH = lazy(() =>
    mkCv(204, 24, (g, w, h) => {
      g.fillStyle = '#0b0f1c';
      for (let x = 0; x < w; x++) {
        const k = (x - w / 2) / (w / 2);
        g.fillRect(x, 0, 1, Math.max(2, Math.floor(k * k * h * 0.95)));
      }
    })
  );
  const KIDS = lazy(() => {
    const cds = people(22, 31, { jerseyPrimary: '#111827', jerseySecondary: '#374151' });
    const out = [];
    for (let i = 0; i < 22; i++) {
      const x = 78.7 + ((i + 0.5) / 22) * 14.6 + (rnd(i, 4) - 0.5) * 0.4;
      if (Math.abs(x - 86) < 0.9) continue;
      out.push({ cd: cds[i], x, y: 13.35 + (rnd(i, 8) - 0.5) * 0.3, k: 0.72 + rnd(i, 5) * 0.12, phone: rnd(i, 7) > 0.5, jump: rnd(i, 6) > 0.6, i });
    }
    return out;
  });
  // a gaiola (gol de rua): boca virada para dir (+1 = leste)
  function cage(K, x, dir, bulge = 0) {
    const y0 = 17.2;
    const y1 = 18.8;
    const zt = 0.85;
    const back = x - dir * 0.5;
    const post = (px, py) => K.box({ x0: px - 0.03, y0: py - 0.03, x1: px + 0.03, y1: py + 0.03, z0: 0, z1: zt, color: '#e2e8f0' });
    post(x, y0);
    post(x, y1);
    post(back, y0);
    post(back, y1);
    K.box({ x0: x - 0.03, y0, x1: x + 0.03, y1, z0: zt - 0.06, z1: zt, color: '#e2e8f0' });
    K.quad({ x: back - dir * bulge * 0.18, y: 18, z: 0, w: 1.6, h: zt, ang: 0, img: NET() });
    [y0, y1].forEach((py) => K.quad({ x: (x + back) / 2 - dir * bulge * 0.09, y: py, z: 0, w: 0.5 + bulge * 0.18, h: zt, ang: Math.PI / 2, img: NET() }));
    K.floor({ x0: Math.min(x, back), y0, x1: Math.max(x, back), y1, z: zt, img: NET() });
  }
  // monta a quadra. o = { lamp (força dos postes), kids, fog, fogK, ambient, expo, bulgeE }
  function street(K, S, o = {}) {
    const t = S.f;
    K.sky('#02030f', '#2a1a5a', 1);
    K.fog(o.fog || '#160f3a', o.fogK ?? 0.028);
    K.ambient(o.ambient || '#a3acd9');
    K.expo(o.expo || 0.95);
    K.floor({ x0: 56, y0: -6, x1: 116, y1: 42, z: 0.004, color: '#0a0c16' });
    K.floor({ x0: COURT.x0, y0: COURT.y0, x1: COURT.x1, y1: COURT.y1, z: 0.01, img: COURT_TEX(), light: [0.78, 0.8, 0.95] });
    K.quad({ x: V[0], y: -3, z: -0.2, w: 66, h: 10.3, ang: plateAng(V[0], -3, V[0], 30), img: CITY(), em: true, color: '#9aa3c7' });
    K.quad({ x: 97, y: 0, z: 9.2, w: 1.9, h: 1.9, ang: plateAng(97, 0, V[0], 30), img: MOON(), em: true });
    halo(K, 97, 0.1, 10.15, 7, '#fef3c7', 0.32);
    K.box({ x0: 64, y0: 11.4, x1: 108, y1: 13.0, z0: 3.05, z1: 3.5, color: '#0b0f1c', top: '#121a2c' });
    K.box({ x0: 64, y0: 12.98, x1: 108, y1: 13.04, z0: 3.03, z1: 3.1, color: '#334155' });
    K.quad({ x: V[0], y: 13.02, z: 3.5, w: 44, h: 0.32, ang: plateAng(V[0], 13.02, V[0], 30), img: RAIL() });
    K.quad({ x: V[0], y: 12.95, z: 2.1, w: 10.2, h: 0.96, ang: plateAng(V[0], 12.95, V[0], 30), img: ARCH() });
    [80.2, 91.8].forEach((px) => K.box({ x0: px - 0.7, y0: 11.6, x1: px + 0.7, y1: 12.9, z0: 0, z1: 3.05, img: PILLAR(), light: [0.62, 0.64, 0.8] }));
    K.quad({ x: V[0], y: 14.0, z: 0, w: 16, h: 1.25, ang: plateAng(V[0], 14, V[0], 30), img: MESH() });
    cage(K, 79.45, 1, o.bulgeW || 0);
    cage(K, 92.55, -1, o.bulgeE || 0);
    const lamp = o.lamp ?? 1;
    LAMPS.forEach((px, i) => {
      const fl = 0.75 + 0.25 * Math.sin(t * 0.09 + i * 2) * (rnd(Math.floor(t / 9) + i, 3) > 0.1 ? 1 : 0.2);
      K.box({ x0: px - 0.04, y0: LAMP_Y - 0.04, x1: px + 0.04, y1: LAMP_Y + 0.04, z0: 0, z1: 2.32, color: '#05070f' });
      K.box({ x0: px - 0.22, y0: LAMP_Y - 0.05, x1: px + 0.22, y1: LAMP_Y + 0.05, z0: 2.26, z1: 2.32, color: '#05070f' });
      K.box({ x0: px - 0.17, y0: LAMP_Y - 0.04, x1: px + 0.17, y1: LAMP_Y + 0.04, z0: 2.22, z1: 2.26, color: lamp > 0.2 ? '#fde68a' : '#6b5d2e', em: lamp > 0.2 });
      halo(K, px, LAMP_Y + 0.05, 2.22, 1.3, '#fde68a', 0.42 * fl * lamp);
      K.floor({ x0: px - 1.5, y0: LAMP_Y - 0.6, x1: px + 1.5, y1: LAMP_Y + 2.2, z: 0.015, img: HALO(), color: '#fde68a', alpha: 0.2 * fl * lamp, em: true });
    });
    if (o.kids !== false) {
      KIDS().forEach((c) => {
        const jump = c.jump ? Math.max(0, Math.sin(t * 0.25 + c.i * 1.7)) * 0.12 * (o.cheer ?? 1) : 0;
        K.actor(c.cd, { id: 'kid' + c.i, x: c.x, y: c.y, z: jump, face: [86, 24], frame: 0, dark: true, k: c.k, shadow: 0 });
        if (c.phone) K.sprite(PHONE(), { x: c.x + 0.13, y: c.y + 0.03, z: c.k * 1.02 + jump, w: 0.055, h: 0.075, glow: true, alpha: 0.75 + 0.25 * Math.sin(t * 0.3 + c.i) });
      });
    }
  }

  // ======================================================================
  // CENÁRIO 2 — AS DUAS CASAS (área vazia, ao lado: dois quartos em corte)
  // ======================================================================
  const ROOM_Y = 27.5;
  const RA = [83.8, 29.2];
  const RB = [88.2, 29.2];
  const paper = (g, w, h, c0, c1, stripe) => {
    g.fillStyle = c0;
    g.fillRect(0, 0, w, h / 2);
    g.fillStyle = c1;
    g.fillRect(0, h / 2, w, h / 2);
    g.fillStyle = stripe;
    for (let x = 1; x < w; x += 4) g.fillRect(x, 0, 1, h - 3);
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(0, h - 3, w, 3);
  };
  const WALL_A = lazy(() =>
    mkCv(74, 35, (g, w, h) => {
      paper(g, w, h, '#0c1a44', '#14306a', 'rgba(147,197,253,0.08)');
      g.fillStyle = '#05091c';
      g.fillRect(4, 6, 20, 16);
      g.fillStyle = '#0b1a44';
      g.fillRect(5, 7, 18, 14);
      g.fillStyle = '#05091c';
      g.fillRect(14, 7, 1, 14);
      g.fillRect(5, 13, 18, 1);
      g.fillStyle = 'rgba(191,219,254,0.35)';
      g.fillRect(16, 8, 5, 4);
      g.fillStyle = '#020617';
      g.fillRect(41, 5, 12, 15);
      g.fillStyle = '#1e40af';
      g.fillRect(42, 6, 10, 13);
      g.fillStyle = CA;
      g.fillRect(44, 13, 6, 3);
      g.fillStyle = '#0a1430';
      g.fillRect(58, 17, 12, 1);
      g.fillStyle = '#e2e8f0';
      g.fillRect(62, 14, 3, 3);
    })
  );
  const WALL_B = lazy(() =>
    mkCv(74, 35, (g, w, h) => {
      paper(g, w, h, '#3a1a08', '#6b3410', 'rgba(253,230,138,0.08)');
      g.fillStyle = '#020617';
      g.fillRect(10, 5, 12, 15);
      g.fillStyle = '#991b1b';
      g.fillRect(11, 6, 10, 13);
      g.fillStyle = CB;
      g.fillRect(13, 8, 6, 6);
      g.fillStyle = '#2b1305';
      g.fillRect(31, 15, 15, 1);
      g.fillStyle = '#fbbf24';
      g.fillRect(35, 11, 3, 4);
      g.fillStyle = '#f1f5f9';
      g.fillRect(52, 7, 7, 8);
      g.fillStyle = '#dc2626';
      g.fillRect(52, 7, 7, 2);
    })
  );
  const SIDE_A = lazy(() => mkCv(62, 35, (g, w, h) => paper(g, w, h, '#0a1638', '#14306a', 'rgba(147,197,253,0.06)')));
  const SIDE_B = lazy(() => mkCv(62, 35, (g, w, h) => paper(g, w, h, '#311505', '#5a2b0c', 'rgba(253,230,138,0.06)')));
  const ENV = lazy(() =>
    [0, 1].map((open) =>
      mkCv(26, 22, (g) => {
        const y0 = 6;
        g.fillStyle = '#0b0f19';
        g.fillRect(0, y0, 26, 16);
        g.fillStyle = '#f1f5f9';
        g.fillRect(1, y0 + 1, 24, 14);
        g.fillStyle = '#94a3b8';
        for (let i = 0; i < 12; i++) {
          g.fillRect(1 + i, y0 + 14 - Math.floor(i * 0.6), 1, 1);
          g.fillRect(24 - i, y0 + 14 - Math.floor(i * 0.6), 1, 1);
        }
        if (!open) {
          g.fillStyle = '#cbd5e1';
          for (let r = 0; r < 8; r++) g.fillRect(1 + r * 1.5, y0 + 1 + r, 24 - r * 3, 1);
          g.fillStyle = '#1d4ed8';
          g.fillRect(11, y0 + 5, 4, 4);
        } else {
          g.fillStyle = '#f8fafc';
          g.fillRect(4, y0 - 2, 18, 6);
          g.fillStyle = '#1d4ed8';
          g.fillRect(4, y0 - 2, 18, 1);
          g.fillStyle = '#e2e8f0';
          for (let r = 0; r < 6; r++) g.fillRect(1 + r * 2, y0 - r, 24 - r * 4, 1);
        }
      })
    )
  );
  function rooms(K, S) {
    const t = S.f;
    K.sky('#02030f', '#0b1030', 0.6);
    K.fog('#03040c', 0.02);
    K.ambient('#9aa6cc');
    K.expo(1.0);
    const LA0 = [0.8, 0.9, 1.25];
    const LB0 = [1.3, 1.0, 0.72];
    K.floor({ x0: 82.3, y0: ROOM_Y, x1: 86, y1: 30.6, z: 0.01, color: '#1d2a4c', light: LA0 });
    K.floor({ x0: 86, y0: ROOM_Y, x1: 89.7, y1: 30.6, z: 0.01, color: '#4a2e18', light: LB0 });
    K.quad({ x: 84.15, y: ROOM_Y, z: 0, w: 3.7, h: 1.75, ang: plateAng(84.15, ROOM_Y, 84.15, 40), img: WALL_A(), light: [1.0, 1.05, 1.2] });
    K.quad({ x: 87.85, y: ROOM_Y, z: 0, w: 3.7, h: 1.75, ang: plateAng(87.85, ROOM_Y, 87.85, 40), img: WALL_B(), light: [1.2, 1.05, 0.9] });
    K.box({ x0: 82.15, y0: ROOM_Y - 0.1, x1: 82.3, y1: 30.6, z0: 0, z1: 1.75, img: SIDE_A(), light: LA0 });
    K.box({ x0: 89.7, y0: ROOM_Y - 0.1, x1: 89.85, y1: 30.6, z0: 0, z1: 1.75, img: SIDE_B(), light: LB0 });
    K.box({ x0: 85.93, y0: ROOM_Y - 0.1, x1: 86.07, y1: 30.6, z0: 0, z1: 1.95, color: '#0b0f19', light: [0.5, 0.5, 0.5] });
    K.box({ x0: 82.0, y0: ROOM_Y - 0.1, x1: 90.0, y1: 30.6, z0: 1.75, z1: 1.95, color: '#0b0f19', light: [0.5, 0.5, 0.5] });
    K.floor({ x0: 82.4, y0: ROOM_Y + 0.1, x1: 84.4, y1: 29.6, z: 0.02, img: HALO(), color: '#93c5fd', alpha: 0.22, em: true });
    K.box({ x0: 89.0, y0: 27.75, x1: 89.45, y1: 28.2, z0: 0, z1: 0.42, color: '#2b1305', light: LB0 });
    K.box({ x0: 89.12, y0: 27.88, x1: 89.32, y1: 28.07, z0: 0.42, z1: 0.72, color: '#78350f', light: LB0 });
    K.box({ x0: 89.06, y0: 27.82, x1: 89.38, y1: 28.13, z0: 0.72, z1: 0.86, color: '#fbbf24', em: true });
    halo(K, 89.22, 28.1, 0.8, 1.6, '#fbbf24', 0.36 * (0.9 + 0.1 * Math.sin(t * 0.2)));
    K.floor({ x0: 87.6, y0: ROOM_Y + 0.1, x1: 89.7, y1: 29.8, z: 0.02, img: HALO(), color: '#fbbf24', alpha: 0.26, em: true });
    K.box({ x0: 82.35, y0: 29.2, x1: 83.05, y1: 30.5, z0: 0, z1: 0.26, color: '#1e3a8a', top: '#3b5bb5', light: LA0 });
    K.box({ x0: 82.38, y0: 29.25, x1: 82.75, y1: 29.55, z0: 0.26, z1: 0.33, color: '#e2e8f0', light: LA0 });
    K.box({ x0: 86.2, y0: 27.6, x1: 87.1, y1: 28.05, z0: 0, z1: 0.4, color: '#4a2a12', top: '#6b3d1a', light: LB0 });
    K.box({ x0: 86.45, y0: 28.2, x1: 86.8, y1: 28.5, z0: 0, z1: 0.24, color: '#2b1305', light: LB0 });
    return { LA0, LB0 };
  }

  // ======================================================================
  // CENÁRIO 3 — O AUDITÓRIO DO PROJETO ELO (o saguão do prédio, com o telão)
  // ======================================================================
  const SCR_W = 192;
  const SCR_H = 62;
  let SCR = null;
  // o telão por cima do telão do saguão. o.one (0..1) = troca o rosto do Ego por um "1" vermelho
  function egoScreen(K, S, o = {}) {
    if (!SCR) SCR = mkCv(SCR_W, SCR_H);
    const key = (o.key || 'elo') + '|' + Math.floor(S.f / 3) + '|' + Math.round((o.glasses || 0) * 10) + '|' + Math.round((o.one || 0) * 10);
    const dirty = SCR._key !== key;
    if (dirty) {
      SCR._key = key;
      const g = SCR.getContext('2d');
      const w = SCR_W;
      const h = SCR_H;
      const sh = h - 11;
      const f = S.f;
      g.imageSmoothingEnabled = false;
      g.fillStyle = '#020617';
      g.fillRect(0, 0, w, h);
      g.fillStyle = o.frame || '#1e293b';
      g.fillRect(1, 1, w - 2, sh);
      g.fillStyle = o.screen || '#03120d';
      g.fillRect(3, 3, w - 6, sh - 3);
      g.save();
      g.beginPath();
      g.rect(3, 3, w - 6, sh - 3);
      g.clip();
      if ((o.one || 0) < 0.5) {
        const ego = CE.getSpeakerCharData('JINPACHI EGO');
        const size = (o.size || 250) / 2;
        const eyeY = (o.eyeY || 46) / 2;
        const u = size / 36;
        if (CE.ptdHead) CE.ptdHead(g, ego, w / 2, eyeY, size, o.rim ? { rim: o.rim, rimD: 2 } : {});
        if (o.glasses) {
          g.fillStyle = `rgba(255,255,255,${0.4 + o.glasses * 0.55})`;
          [-1, 1].forEach((s) => g.fillRect(Math.round(w / 2 + s * 3.5 * u - 2.4 * u), Math.round(eyeY - 1.3 * u), Math.round(4.8 * u), Math.round(2.4 * u)));
        }
      } else {
        // o "1" gigante em pixel
        g.fillStyle = '#140306';
        g.fillRect(3, 3, w - 6, sh - 3);
        pxText(g, '1', w / 2, 6, 8, '#ef4444', 'center');
      }
      g.fillStyle = o.tint || 'rgba(0,245,212,0.08)';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.28)';
      for (let yy = 3; yy < sh; yy += 2) g.fillRect(3, yy, w - 6, 1);
      g.fillStyle = o.scan || 'rgba(0,245,212,0.09)';
      g.fillRect(3, 3 + mod(f * 0.8, sh), w - 6, 4);
      if (o.glitch && rnd(Math.floor(f / 4), 3) > 0.7) {
        g.fillStyle = 'rgba(220,38,38,0.35)';
        g.fillRect(3, 3 + Math.floor(rnd(Math.floor(f / 4), 5) * (sh - 6)), w - 6, 2);
      }
      g.restore();
      pxText(g, o.title || 'PROJETO ELO', w / 2, h - 8, 1, o.label || '#00f5d4', 'center');
      if (Math.floor(f / 30) % 2) {
        g.fillStyle = '#ef4444';
        g.fillRect(w - 9, 5, 3, 3);
      }
    }
    K.quad({ x: 25, y: 9.04, z: 0.27, w: 3.86, h: 1.27, ang: plateAng(25, 9.04, 25, 20), img: SCR, dirty, em: true });
  }
  let HALL = null;
  const hall = () => {
    if (HALL) return HALL;
    const cds = people(64, 17, ELO);
    HALL = [];
    let k = 0;
    for (let row = 0; row < 3; row++) {
      const y = 16.0 + row * 1.12;
      for (let i = 0; i < 9; i++) {
        const cx = 18.95 + i * 1.5 + (row % 2) * 0.35;
        if (row === 0 && i === 4) continue; // o lugar dos dois
        if (cx > 31.6) continue;
        const pair = [];
        [-1, 1].forEach((s) => {
          const x = cx + s * 0.22;
          if (y > 16.6 && y < 18.4 && (Math.abs(x - 21.5) < 0.72 || Math.abs(x - 28.5) < 0.72)) return;
          pair.push({ x, s, cd: cds[k++ % cds.length] });
        });
        if (pair.length) HALL.push({ row, y, pair, order: rnd(row * 9 + i, 7) });
      }
    }
    return HALL;
  };
  const YA = [24.58, 16.0];
  const YB = [25.42, 16.0];
  function crowdHall(K, S, o = {}) {
    let i = 0;
    hall().forEach((p, j) => {
      if (o.only && p.order > o.only) return;
      p.pair.forEach((m) => {
        K.actor(m.cd, { id: 'fila' + i, x: m.x, y: p.y, face: [25, 9], frame: 0, k: 0.86, light: o.light });
        wristLed(K, S, m.x + m.s * 0.13, p.y + 0.02, i + j, o.red);
        i++;
      });
    });
  }

  // ======================================================================
  // A SALA DO EGO (de js/cine3d_espanha.js): o que passa nos monitores nas cenas da dupla
  // ======================================================================
  const ROOM = () => CE.c3EgoRoom;
  // as trinta duplas (6 x 5 telas, duas cabecinhas e o LED de cada pulseira); a 27 é a de vocês
  const PAIRS = { cv: null, key: '' };
  function pairsWall(t, lit27) {
    if (!PAIRS.cv) PAIRS.cv = mkCv(256, 112);
    const key = Math.floor(t / 8) + '|' + Math.round(lit27 * 4);
    if (key === PAIRS.key) return { cv: PAIRS.cv, dirty: false };
    PAIRS.key = key;
    const g = PAIRS.cv.getContext('2d');
    const c = cast();
    g.fillStyle = '#01040b';
    g.fillRect(0, 0, 256, 112);
    const hairs = ['#1f2937', '#78350f', '#facc15', '#e5e7eb', '#7c3aed', '#dc2626', '#0ea5e9', '#16a34a'];
    for (let r = 0; r < 5; r++) {
      for (let i = 0; i < 6; i++) {
        const n = r * 6 + i + 1;
        const x = 4 + i * 42;
        const y = 2 + r * 22;
        const mine = n === 27;
        g.fillStyle = mine && lit27 > 0 ? GOLD : '#0e2a3a';
        g.fillRect(x, y, 40, 20);
        g.fillStyle = '#050b18';
        g.fillRect(x + 1, y + 1, 38, 18);
        // duas cabecinhas (cabelo e rosto) com a camisa do Elo
        [0, 1].forEach((s) => {
          const hx = x + 9 + s * 12;
          const hc = mine ? (s ? c.b.hairColor : c.a.hairColor) || '#1f2937' : hairs[(n * 3 + s * 5) % hairs.length];
          g.fillStyle = '#111c44';
          g.fillRect(hx - 3, y + 13, 8, 6);
          g.fillStyle = '#f1c9a5';
          g.fillRect(hx - 2, y + 6, 6, 6);
          g.fillStyle = hc;
          g.fillRect(hx - 2, y + 4, 6, 3);
        });
        const on = mine ? lit27 > 0.5 : (Math.floor(t / 8) + n * 7) % 5 !== 0;
        g.fillStyle = on ? (mine ? GOLD : '#00f5d4') : '#334155';
        g.fillRect(x + 33, y + 3, 3, 3);
        pxText(g, String(n).padStart(2, '0'), x + 31, y + 12, 1, mine ? GOLD : '#64748b');
      }
    }
    return { cv: PAIRS.cv, dirty: true };
  }
  // monitores com estática vermelha (a sala no escuro das máscaras)
  const STATIC = { cv: null, key: -1 };
  function staticWall(t) {
    if (!STATIC.cv) STATIC.cv = mkCv(128, 56);
    const key = Math.floor(t / 4);
    if (key === STATIC.key) return { cv: STATIC.cv, dirty: false };
    STATIC.key = key;
    const g = STATIC.cv.getContext('2d');
    g.fillStyle = '#05010a';
    g.fillRect(0, 0, 128, 56);
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 8; i++) {
        const x = i * 16;
        const y = r * 14;
        g.fillStyle = '#12040a';
        g.fillRect(x + 1, y + 1, 14, 12);
        for (let k = 0; k < 18; k++) {
          const v = rnd(k + i * 31 + r * 97, key);
          if (v > 0.55) {
            g.fillStyle = v > 0.85 ? '#ef4444' : '#5b0f16';
            g.fillRect(x + 2 + Math.floor(rnd(k, key + i) * 12), y + 2 + Math.floor(rnd(k + 9, key + r) * 10), 2, 1);
          }
        }
      }
    }
    return { cv: STATIC.cv, dirty: true };
  }

  // ======================================================================
  // QUADROS DE MANGÁ (pixel art) — pulseira, chuteiras, máscara e carta
  // ======================================================================
  // a pulseira em close (a arte de pixel da pulseira do Elo: CE.duoWristCv); mirror = a do
  // parceiro (vem da direita). Desenha na hora (o canvas da pulseira é um só)
  function wristBlit(g, side, o, x, y) {
    if (!CE.duoWristCv) return;
    const mirror = side === 'b';
    const cv = CE.duoWristCv(o.skin || '#f3d1b8', o.sleeve || '#111c44', o.open ?? 1, o.lit ?? 0, o.num, o.t || 0, o.glow, mirror);
    blit(g, cv, x, y, 0, mirror, 1);
  }
  // o punho fica a 58 px da arte do meio do canvas (ponta do punho em 124 de 132)
  const FIST = 58 * PIX;
  // quadro com a(s) pulseira(s) (só os punhos e as pulseiras; as mangas ficam cortadas):
  // a = { ...opções }, b = idem ou null; meet 0..1 = os punhos se encontram no meio;
  // sym = os dois entram cada um do seu lado; dx = desloca o A (sozinho fica no meio); gap
  function cutWrists(ctx, S, kIn, o) {
    const CAx = CAa();
    if (!CAx) return;
    const { W, top, bot } = S;
    const c = cast();
    const cyc = (top + bot) / 2 + 24;
    CAx.panel(
      ctx,
      o.poly || [[W / 2 - 380, cyc - 160], [W / 2 + 380, cyc - 172], [W / 2 + 368, cyc + 160], [W / 2 - 370, cyc + 172]],
      (b, g) => {
        g.fillStyle = o.bg || '#0b1020';
        g.fillRect(b.x, b.y, b.w, b.h);
        const cx = b.x + b.w / 2 + b.ox;
        const cy = b.y + b.h / 2 + 12;
        if (o.lines) CAx.speedLines(g, 0, S.W, S.H, { color: o.lines, n: 26, t: (o.t || 0) * 2, speed: 22, thick: 6 });
        if (o.radial) CAx.speedRadial(g, cx, cy - 12, S.W, S.H, { color: o.radial, inner: b.h * 0.22, n: 56, thick: 1.4 });
        const meet = o.meet ?? 1;
        const gap = o.gap ?? 6;
        const offA = o.sym ? (1 - meet) * 400 : (1 - meet) * 260 - (o.dx || 0);
        const offB = o.sym ? (1 - meet) * 400 : (1 - meet) * 520 + (o.dx || 0);
        if (o.a) wristBlit(g, 'a', Object.assign({ skin: c.a.skinColor }, o.a), cx - FIST - gap - offA, cy);
        if (o.b) wristBlit(g, 'b', Object.assign({ skin: c.b.skinColor }, o.b), cx + FIST + gap + offB, cy);
        if (o.burst > 0) CAx.burst(g, cx, cy - 6, 80 * o.burst, { fill: '#fef9c3', stroke: '#0b0f19', lw: 10 });
      },
      { k: kIn, from: o.from || [0, 240], pixel: PIX }
    );
  }
  // chuteiras em volta da bola (o frente a frente, o roubo, o chute dos dois)
  // boots = [{ x, y (frações do quadro), s, ang, flip, sock, sock2, boot }], ball = { x, y, r, rot }
  function cutBoots(ctx, S, kIn, poly, o) {
    const CAx = CAa();
    if (!CAx) return;
    CAx.panel(
      ctx,
      poly,
      (b, g) => {
        g.fillStyle = o.bg || '#e2e8f0';
        g.fillRect(b.x, b.y, b.w, b.h);
        const X = (f) => b.x + b.w * f + b.ox;
        const Y = (f) => b.y + b.h * f;
        if (o.radial) CAx.speedRadial(g, X(o.ball.x), Y(o.ball.y), S.W, S.H, { color: o.radial, inner: b.h * 0.18, n: 54, thick: 1.6 });
        if (o.lines) CAx.speedLines(g, o.linesAng || 0, S.W, S.H, { color: o.lines, n: 28, t: o.t || 0, speed: 30, thick: 7 });
        if (o.glow) {
          g.fillStyle = o.glow;
          g.beginPath();
          g.arc(X(o.ball.x), Y(o.ball.y), b.h * 0.2, 0, TAU);
          g.fill();
        }
        if (o.burst > 0) CAx.burst(g, X(o.ball.x), Y(o.ball.y), b.h * 0.3 * o.burst, { fill: '#f8fafc', stroke: '#0b0f19', lw: 12 });
        (o.boots || []).forEach((bt) => CAx.boot(g, X(bt.x), Y(bt.y), b.h * (bt.s || 0.15), { sock: bt.sock, sock2: bt.sock2, boot: bt.boot, ang: bt.ang || 0, flip: bt.flip }));
        if (o.ball) CAx.ball(g, X(o.ball.x), Y(o.ball.y), b.h * (o.ball.r || 0.12), { rot: o.ball.rot || 0 });
      },
      { k: kIn, from: o.from || [0, 0], pixel: PIX }
    );
  }
  // a máscara branca em close (a mesma arte de pixel da máscara, maior), rachando
  function cutMask(ctx, S, kIn, crack, o = {}) {
    const CAx = CAa();
    if (!CAx || !CE.duoMask) return;
    const { W, top, bot } = S;
    CAx.panel(
      ctx,
      o.poly || [[W * 0.24, top + 22], [W * 0.76, top + 22], [W * 0.76, bot - 22], [W * 0.24, bot - 22]],
      (b, g) => {
        g.fillStyle = '#12030a';
        g.fillRect(b.x, b.y, b.w, b.h);
        const cx = b.x + b.w / 2 + b.ox;
        const cy = b.y + b.h * 0.46;
        CAx.speedRadial(g, cx, cy, S.W, S.H, { color: 'rgba(220,38,38,0.45)', inner: b.h * 0.34, n: 50, thick: 1.4 });
        // a máscara: px da máscara = u/2 → u = 24 dá pixels de 12 (2 do quadro)
        CE.duoMask(g, cx, cy, 24, { stripe: o.stripe || '#e5e7eb', glow: o.glow || '#ffffff', crack, seed: 5 });
        // lascas soltando
        if (crack > 0.7) {
          g.fillStyle = '#e2e8f0';
          for (let i = 0; i < 5; i++) {
            const q = seg(crack, 0.7 + i * 0.02, 1);
            g.fillRect(cx + (rnd(i, 3) - 0.5) * 220, cy + 40 + q * 220, 12 + (i % 3) * 6, 12);
          }
        }
      },
      { k: kIn, from: [0, 300], pixel: PIX }
    );
  }
  // a carta do Projeto Elo em pixel (o texto é o da carta: aparece linha a linha)
  function cutLetter(ctx, S, kIn, q) {
    const CAx = CAa();
    if (!CAx) return;
    const { W, top, bot } = S;
    CAx.panel(
      ctx,
      [[W * 0.31, top + 26], [W * 0.69, top + 34], [W * 0.68, bot - 30], [W * 0.3, bot - 38]],
      (b, g) => {
        g.fillStyle = '#f8fafc';
        g.fillRect(b.x, b.y, b.w, b.h);
        g.fillStyle = '#1d4ed8';
        g.fillRect(b.x, b.y, b.w, 18);
        g.fillRect(b.x, b.y + b.h - 18, b.w, 18);
        const cx = b.x + b.w / 2 + b.ox;
        pxText(g, 'PROJETO ELO', cx, b.y + 40, 6, '#0b0f19', 'center');
        ['VOCES DOIS.', 'JUNTOS.', 'OU NENHUM.'].forEach((ln, i) => {
          const k = seg(q, 0.15 + i * 0.2, 0.3 + i * 0.2);
          if (k <= 0) return;
          const s = ln.slice(0, Math.ceil(ln.length * k));
          pxText(g, s, cx, b.y + 110 + i * 62, 8, i === 2 ? RED : '#0b0f19', 'center');
        });
        // o carimbo do Elo (duas argolas)
        const sk = seg(q, 0.8, 0.88);
        if (sk > 0) {
          g.strokeStyle = '#1d4ed8';
          g.lineWidth = 12;
          [-24, 24].forEach((dx) => {
            g.beginPath();
            g.ellipse(b.x + b.w - 120 + dx, b.y + b.h - 70, 36 * lerp(1.6, 1, sk), 24 * lerp(1.6, 1, sk), 0.3, 0, TAU);
            g.stroke();
          });
        }
      },
      { k: kIn, from: [0, 360], pixel: PIX }
    );
  }
  // botas: cores de cada um
  const BOOT_A = (kit) => ({ sock: kit.jerseyPrimary, sock2: kit.jerseySecondary, boot: CA });
  const BOOT_B = (kit) => ({ sock: kit.jerseyPrimary, sock2: kit.jerseySecondary, boot: CB });
  const BOOT_M = { sock: '#0a0a0a', sock2: '#e5e7eb', boot: '#e5e7eb' };

  // máscara branca em cima do rosto de um boneco 3D (de frente)
  function maskAt(ctx, K, x, y, z, k, o) {
    const e = eyeOf(K, x, y, z, k);
    if (!e || e.u < 0.8 || !CE.duoMask) return e;
    CE.duoMask(ctx, e.x, e.y + 0.6 * e.u, e.u, o);
    return e;
  }

  // ======================================================================
  // O CHUTE DOS DOIS E O GOL (Ressonância e a final) — no campo
  // ======================================================================
  const FOOT = [53.1, 10.15];
  const GOAL_IN = [53.62, 6.32, 0.62];
  const shotBall = (q) => [lerp(FOOT[0], GOAL_IN[0], q), lerp(FOOT[1], GOAL_IN[1] + 0.4, q), lerp(0.1, GOAL_IN[2], q) + Math.sin(q * Math.PI) * 0.22];
  // o chute de baixo, atrás e ao lado; câmera lenta chegando no contato (KICK)
  const KICK = 56;
  const SHOT_KEYS = [[0, 0], [24, 24], [60, 40], [80, 60], [90, 70]];
  function shotScene(K, S, both) {
    const { t, f } = S;
    const A = remap(t, SHOT_KEYS);
    const hit = A >= 40;
    const anim = A < 32 ? 'run' : hit ? 'shoot' : 'windup';
    const fr = anim === 'run' ? undefined : 1;
    const ap = [lerp(53.6, 53.2, ease(seg(A, 0, 38))), lerp(11.4, 10.35, ease(seg(A, 0, 38)))];
    duo(K, 'a', ELO, { x: ap[0], y: ap[1], face: [53.4, 6.6], anim, frame: fr, light: LA });
    if (both) {
      const bp = [lerp(52.3, 52.8, ease(seg(A, 0, 38))), lerp(11.5, 10.4, ease(seg(A, 0, 38)))];
      duo(K, 'b', ELO, { x: bp[0], y: bp[1], face: [53.4, 6.6], anim, frame: fr, light: LB });
    }
    const tr = hit ? 0.03 * Math.max(0, 1 - (A - 40) / 26) : 0.003;
    const push = easeIO(seg(A, 0, 40));
    K.cam(shake(K, [lerp(54.8, 54.45, push), 0.3, lerp(12.4, 11.85, push)], f * 2, tr, 3), [53.15, lerp(0.5, 0.55, push), lerp(9.9, 9.5, push)], lerp(46, 40, push));
    if (!hit) {
      const q = ease(seg(A, 0, 40));
      K.ball(lerp(52.4, FOOT[0], q), lerp(11.0, FOOT[1], q), 0.06 + Math.sin(q * Math.PI) * 0.2);
    } else {
      const b = shotBall(easeIn(seg(A, 40, 64)));
      K.ball(b[0], b[1], b[2], { k: 0.9 });
    }
    return A;
  }
  function shotOverlay(ctx, S, K, A, o) {
    const { W, H, top } = S;
    const fp = K.screen(FOOT[0], 0.12, FOOT[1]) || { x: W * 0.5, y: H * 0.7 };
    const slow = seg(A, 26, 32) * (1 - seg(A, 44, 50));
    if (slow > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25 * slow;
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, top, W, S.bot - top);
      ctx.restore();
    }
    // antecipação: o quadro grande com a(s) chuteira(s) indo na bola
    if (A > 28 && A < 40) {
      const q = seg(A, 28, 40);
      const e = easeIO(q);
      const boots = [Object.assign({ x: lerp(0.16, 0.47, e), y: lerp(0.95, 0.68, e), s: 0.15, ang: lerp(1.0, -0.15, e) }, BOOT_A(ELO))];
      if (o.both) boots.push(Object.assign({ x: lerp(0.86, 0.68, e), y: lerp(1.0, 0.72, e), s: 0.15, ang: lerp(-1.0, 0.15, e), flip: true }, BOOT_B(ELO)));
      cutBoots(ctx, S, seg(A, 28, 31), [[40, top + 24], [W - 30, top + 12], [W - 50, S.bot - 24], [24, S.bot - 40]], { bg: '#e8e3cf', ball: { x: 0.58, y: lerp(0.42, 0.46, q), r: 0.16, rot: q * 3 }, radial: 'rgba(15,23,42,0.8)', glow: 'rgba(253,224,71,0.4)', burst: q > 0.8 ? ease((q - 0.8) / 0.2) : 0, boots, from: [0, 50] });
    }
    if (A >= 40 && A < 40.6) impactFrame(ctx, W, H);
    if (A >= 40) {
      const k2 = seg(A, 40, 46);
      CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(A, 40.5, 46)));
      if (A < 48) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - seg(A, 40, 48)));
      const b = shotBall(easeIn(seg(A, 40, 64)));
      const p = K.screen(b[0], b[2], b[1]);
      if (p && CE.luckStreak) {
        CE.luckStreak(ctx, fp.x - 6, fp.y, p.x, p.y, 4, 26, '56,189,248', 0.7 * (1 - seg(A, 60, 70)));
        if (o.both) CE.luckStreak(ctx, fp.x + 6, fp.y + 6, p.x, p.y, 4, 26, '251,113,133', 0.7 * (1 - seg(A, 60, 70)));
        CE.cineGlow(ctx, p.x, p.y, 90, rgba(GOLD, 0.6), 1);
      }
      CE.cineImpactText(ctx, 'DOM!!', W * 0.74, top + 110, 104, '#f8fafc', k2, W * 0.4, -0.1);
    }
  }
  // o gol de dentro do gol: a bola vem na cara da câmera, a rede estufa
  const GHIT = 30;
  const goalBall = (t) => (t < GHIT ? [lerp(53.25, 53.62, t / GHIT), lerp(9.6, 6.3, t / GHIT), lerp(0.4, 0.62, t / GHIT)] : [53.62, 6.28, Math.max(0.1, 0.62 - (t - GHIT) * 0.012)]);
  function goalScene(K, S, keeper) {
    const { t, f } = S;
    const dq = seg(t, 8, 40);
    K.actor(keeper || 'elo_gk_final', { id: 'gk', x: lerp(52.45, 51.85, ease(dq)), y: 7.6, z: Math.sin(dq * Math.PI) * 0.28, face: [53, 12], anim: dq > 0 ? 'dive' : 'idle', opts: dq > 0 ? { animTime: dq * 30 } : undefined, k: 0.9 });
    const cel = t > 60;
    duo(K, 'a', ELO, { x: lerp(53.2, 52.4, seg(t, 60, 120)), y: lerp(10.35, 9.6, seg(t, 60, 120)), face: cel ? [51, 10] : [53.4, 6.6], anim: cel ? 'run' : 'shoot', frame: cel ? undefined : 1, light: LA });
    duo(K, 'b', ELO, { x: lerp(52.8, 52.0, seg(t, 60, 120)), y: lerp(10.4, 9.9, seg(t, 60, 120)), face: cel ? [51, 10] : [53.4, 6.6], anim: cel ? 'run' : 'idle', light: LB });
    const hit = t >= GHIT;
    K.cam(shake(K, [53.35, 0.46, 6.18], f * 2, hit ? 0.03 * Math.max(0, 1 - (t - GHIT) / 30) : 0.003, 5), [53.3, 0.5, 9.6], 60);
    const b = goalBall(t);
    K.ball(b[0], b[1], b[2], { k: 0.9 });
    return { b, hit };
  }
  function goalOverlay(ctx, S, K, b, hit, o = {}) {
    const { W, H, t, top, bot } = S;
    const p = K.screen(b[0], b[2], b[1]);
    netOverlay(ctx, S, hit ? p : null, hit ? Math.max(0, 1 - (t - GHIT) / 40) * Math.abs(Math.cos((t - GHIT) * 0.25)) : 0);
    if (!hit && p) CE.cineGlow(ctx, p.x, p.y, 80, rgba(GOLD, 0.55), 1);
    if (hit) {
      CE.cineFlash(ctx, W, H, 0.55 * (1 - seg(t, GHIT, GHIT + 10)));
      confetti(ctx, S, t - GHIT, 60, seg(t, GHIT, GHIT + 12));
      if (o.word && t < GHIT + 56) CE.cineImpactText(ctx, o.word, W / 2, top + (bot - top) * 0.42, 130, GOLD, seg(t, GHIT + 3, GHIT + 11), W * 0.8, -0.06);
    }
  }
  // a corrida pelo campo rumo ao gol norte, com a câmera acompanhando de lado
  const runY = (t, dur) => lerp(19.6, 10.8, t / dur);
  function runScene(K, S) {
    const { t, dur } = S;
    const y = runY(t, dur);
    const bob = (i) => Math.abs(Math.sin(t * 0.5 + i * 2)) * 0.03;
    duo(K, 'a', ELO, { x: 52.7, y: y + 0.65, z: bob(0), ang: -Math.PI / 2, anim: 'run', frame: Math.floor(S.f * 1.3), light: LA });
    duo(K, 'b', ELO, { x: 53.3, y: y - 0.15, z: bob(1), ang: -Math.PI / 2, anim: 'run', frame: Math.floor(S.f * 1.3) + 3, light: LB });
    const q = (Math.sin(t * 0.2) + 1) / 2;
    K.ball(lerp(52.72, 53.3, q), y - 0.35 + (1 - q) * 0.75, 0.08 + Math.sin(q * Math.PI) * 0.12);
    K.cam(shake(K, [50.55, 0.62, y + 0.85], S.f, 0.02, 6), [53.0, 0.48, y - 0.25], 46);
    return y;
  }
  // o rastro das duas cores atrás dos pés na corrida
  function runOverlay(ctx, S, K) {
    const { W, H, t, dur } = S;
    const y = runY(t, dur);
    CE.drawSpeedLines(ctx, W, H, '#e0f2fe', 0.14);
    [[52.7, y + 0.65, '56,189,248'], [53.3, y - 0.15, '251,113,133']].forEach(([x, yy, col]) => {
      const a = K.screen(x, 0.08, yy + 1.6);
      const b = K.screen(x, 0.08, yy + 0.05);
      if (a && b && CE.luckStreak) CE.luckStreak(ctx, a.x, a.y, b.x, b.y, 2, 16, col, 0.6);
    });
  }

  // ======================================================================
  // duo_ponte — A PONTE VELHA
  // ======================================================================
  const PY = 17.6; // a linha do meio da quadra (onde fica a bola)
  const ST_KEYS = [[0, 0], [40, 40], [96, 54], [165, 123]]; // a câmera lenta no roubo
  const STEAL = 50; // o pé do mascarado chega na bola (tempo da ação)
  reg('duo_ponte', {
    phases: [175, 130, 165, 160, 200],
    music: 'mystery',
    title: '🌉 A PONTE VELHA',
    tags: ['PLANO 1 • MEIA-NOITE', 'PLANO 2 • FRENTE A FRENTE', 'PLANO 3 • O ÚLTIMO LANCE', 'PLANO 4 • OS MASCARADOS', 'PLANO 5 • A CARTA'],
    subs: [
      [{ from: 20, who: 'NARRADOR', text: 'Final do torneio de rua da Ponte Velha. Meia-noite. A quadra cheia de gente no alambrado.', color: '#cbd5e1' }],
      [{ from: 10, who: 'NARRADOR', text: 'Dois colégios rivais. Dois atacantes que não se suportam.', color: '#cbd5e1' }],
      [{ from: 8, who: 'NARRADOR', text: 'No último lance, os dois foram na mesma bola... e ela sumiu.', color: '#cbd5e1' }],
      [{ from: 30, who: '???', text: '"Sozinhos, vocês dois são só barulho."', color: '#ef4444' }],
      [{ from: 12, who: 'NARRADOR', text: 'Naquela mesma noite, a mesma carta chegou nas duas casas.', color: '#cbd5e1' }]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, dur, f } = S;
      const st = (K.st = {});
      if (phase === 0) {
        // MEIA-NOITE: a grua desce da lua e da ponte até a quadra; os dois vão para o meio
        const pan = easeIO(seg(t, 0, 150));
        K.cam(mixP([86, 3.4, 26.0], [86.4, 0.95, 22.2], pan), mixP([90, 7.6, 6], [86, 0.58, 16.9], pan), lerp(50, 46, pan));
        street(K, S);
        const walk = ease(seg(t, 70, 150));
        const moving = walk > 0 && walk < 1;
        duo(K, 'a', HOKUTO, { x: lerp(80.4, 85.3, walk), y: PY, ang: 0, anim: moving ? 'run' : 'idle', frame: moving ? Math.floor(S.f * 0.5) : undefined });
        duo(K, 'b', SEIRAN, { x: lerp(91.6, 86.7, walk), y: PY, ang: Math.PI, anim: moving ? 'run' : 'idle', frame: moving ? Math.floor(S.f * 0.5) + 2 : undefined });
        K.ball(86, PY, 0);
        st.lamp = [86, 2.22, LAMP_Y];
      } else if (phase === 1) {
        // FRENTE A FRENTE: de lado, rente ao chão, a câmera dando a volta devagar
        const k = easeIO(seg(t, 0, 130));
        const a = lerp(-0.3, 0.22, k);
        const R = lerp(3.1, 2.7, k);
        const eye = shake(K, [86 + Math.sin(a) * R, lerp(0.5, 0.42, k), PY + Math.cos(a) * R], f, 0.004, 2);
        K.cam(eye, [86, lerp(0.42, 0.34, seg(t, 40, 60)), PY], lerp(42, 38, k));
        street(K, S, { lamp: 0.9, cheer: 0.4 });
        duo(K, 'a', HOKUTO, { x: 85.35, y: PY, ang: 0, light: LA, opts: { expr: 'angry' } });
        duo(K, 'b', SEIRAN, { x: 86.65, y: PY, ang: Math.PI, light: LB, opts: { expr: 'angry' } });
        K.ball(86, PY, 0);
        st.lamp = [86, 2.22, LAMP_Y];
      } else if (phase === 2) {
        const A = remap(t, ST_KEYS);
        const run = ease(seg(A, 0, STEAL));
        st.A = A;
        if (A < STEAL + 14) {
          // O ÚLTIMO LANCE: os dois arrancando para a bola, câmera rente ao asfalto; câmera
          // lenta quando os dois chegam — e um pé de fora leva a bola
          const sh = lerp(0.003, 0.016, seg(A, 0, STEAL));
          K.cam(shake(K, [86 + 0.15, 0.26, 20.6 - run * 0.5], f * 2, sh, 1), [86, 0.42, PY], lerp(48, 40, easeIn(seg(A, 0, STEAL))));
          street(K, S, { lamp: 0.8, cheer: 1.3 });
          duo(K, 'a', HOKUTO, { x: lerp(80.8, 85.6, run), y: PY, ang: 0, anim: A < STEAL - 6 ? 'run' : 'windup', frame: A < STEAL - 6 ? Math.floor(S.f * 1.4) : 1, light: LA });
          duo(K, 'b', SEIRAN, { x: lerp(91.2, 86.4, run), y: PY, ang: Math.PI, anim: A < STEAL - 6 ? 'run' : 'windup', frame: A < STEAL - 6 ? Math.floor(S.f * 1.4) + 3 : 1, light: LB });
          const mq = ease(seg(A, STEAL - 14, STEAL));
          K.actor(masked(0), { id: 'm0', x: lerp(86.4, 86.05, mq), y: lerp(PY - 1.6, PY - 0.35, mq), face: [86, PY], anim: A < STEAL ? 'run' : 'rabona', opts: A >= STEAL ? { animTime: (A - STEAL) * 2 } : undefined, frame: A < STEAL ? Math.floor(S.f * 1.4) : undefined, light: [0.5, 0.5, 0.55] });
          const bq = ease(seg(A, STEAL, STEAL + 14));
          K.ball(lerp(86.0, 86.6, bq), lerp(PY, PY - 0.9, bq), Math.sin(bq * Math.PI) * 0.35);
          st.mask = [lerp(86.4, 86.05, mq), lerp(PY - 1.6, PY - 0.35, mq)];
        } else {
          // os mascarados tocam entre eles e a bola entra na gaiola (vista de trás da rede)
          const u = A - STEAL - 14;
          const q = ease(seg(u, 4, 22));
          const goal = seg(u, 30, 44);
          const k = easeIO(seg(u, 0, 60));
          K.cam(shake(K, [lerp(89.6, 90.4, k), 0.5, lerp(20.4, 21.0, k)], f, u > 44 && u < 60 ? 0.012 : 0.003, 4), [lerp(88.4, 91.8, k), 0.42, 17.8], 44);
          street(K, S, { lamp: 0.6, bulgeE: u >= 44 ? Math.sin(seg(u, 44, 64) * Math.PI) : 0, cheer: 0.2 });
          duo(K, 'a', HOKUTO, { x: 85.6, y: PY + 0.15, ang: -0.3, anim: 'stun', light: [0.6, 0.6, 0.72] });
          duo(K, 'b', SEIRAN, { x: 86.4, y: PY + 0.15, ang: Math.PI + 0.3, anim: 'stun', light: [0.6, 0.6, 0.72] });
          K.actor(masked(0), { id: 'm0', x: lerp(87.0, 88.2, q), y: lerp(16.9, 17.1, q), face: [91, 18], anim: u < 8 ? 'shoot' : 'run', frame: u < 8 ? 1 : Math.floor(S.f * 1.2), light: [0.5, 0.5, 0.55] });
          K.actor(masked(1), { id: 'm1', x: lerp(88.6, 90.0, seg(u, 0, 30)), y: 17.6, face: [92.5, 18], anim: u > 26 && u < 36 ? 'shoot' : u < 26 ? 'run' : 'idle', frame: u > 26 && u < 36 ? 1 : u < 26 ? Math.floor(S.f * 1.2) + 2 : undefined, light: [0.5, 0.5, 0.55] });
          let bp;
          if (u < 22) bp = [lerp(86.6, 89.5, q), lerp(16.7, 17.55, q), 0.08 + Math.sin(q * Math.PI) * 0.25];
          else if (u < 30) bp = [89.6 + (u - 22) * 0.02, 17.6, 0.06];
          else bp = [lerp(89.9, 92.75, ease(goal)) + (u >= 44 ? Math.sin(seg(u, 44, 64) * Math.PI) * 0.12 : 0), lerp(17.6, 18.05, goal), 0.06 + Math.sin(goal * Math.PI) * 0.2];
          K.ball(bp[0], bp[1], bp[2], { k: 0.85 });
          st.m0 = [lerp(87.0, 88.2, q), lerp(16.9, 17.1, q)];
          st.m1 = [lerp(88.6, 90.0, seg(u, 0, 30)), 17.6];
          st.u = u;
        }
      } else if (phase === 3) {
        // OS MASCARADOS: debaixo do poste; os dois no chão em primeiro plano (longe o bastante)
        const e = easeIO(seg(t, 0, 160));
        K.cam(mixP([85.2, 0.66, 22.6], [85.6, 0.55, 21.9], e), [85.9, lerp(0.7, 0.66, e), 15.2], lerp(44, 38, e));
        street(K, S, { lamp: 0.5, kids: false, expo: 0.8 });
        K.quad({ x: 86, y: LAMP_Y + 0.35, z: 0, w: 2.0, h: 2.2, ang: camAng(K, 86, LAMP_Y + 0.35), img: CONE(), color: '#fef3c7', alpha: 0.28, em: true });
        [0, 1].forEach((i) => K.actor(masked(i), { id: 'm' + i, x: 85.58 + i * 0.84, y: 14.85, face: [86, 22], frame: 45 + i, light: [0.5, 0.48, 0.5] }));
        duo(K, 'a', HOKUTO, { x: 84.9, y: 17.85, ang: -Math.PI / 2 + 0.3, anim: 'sit_floor', light: [0.45, 0.47, 0.6] });
        duo(K, 'b', SEIRAN, { x: 87.0, y: 17.95, ang: -Math.PI / 2 - 0.3, anim: 'kneel_down', light: [0.45, 0.47, 0.6] });
      } else {
        // A CARTA: as duas casas lado a lado em corte; a câmera recua
        const e = easeIO(t / dur);
        K.cam(mixP([86, 0.85, 33.2], [86, 0.78, 33.9], e), [86, 0.62, 29.0], lerp(42, 46, e));
        const L = rooms(K, S);
        const ENVs = ENV();
        const flap = ease(seg(t, 24, 40));
        const lit = seg(t, 160, 175);
        duo(K, 'a', CASUAL_A, { x: RA[0], y: RA[1], face: [RA[0] + 0.6, 34], light: lit > 0 ? [0.95, 0.98, 1.2] : L.LA0 });
        duo(K, 'b', CASUAL_B, { x: RB[0], y: RB[1], face: [RB[0] - 0.6, 34], light: lit > 0 ? [1.25, 1.05, 0.85] : L.LB0 });
        K.sprite(ENVs[flap > 0.5 ? 1 : 0], { x: RA[0] + 0.22, y: RA[1] + 0.09, z: 0.22, w: 0.24, h: 0.2, light: [0.95, 1.0, 1.15] });
        K.sprite(ENVs[flap > 0.5 ? 1 : 0], { x: RB[0] - 0.22, y: RB[1] + 0.09, z: 0.22, w: 0.24, h: 0.2, light: [1.15, 1.0, 0.85] });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = K.st || {};
      if (phase === 0) {
        CE.cineRain(ctx, W, H, t, 0.1, 70, 0.2);
        kicker(ctx, 40, top + 30, 'PONTE VELHA • MEIA-NOITE', seg(t, 20, 56), GOLD);
        kicker(ctx, 40, top + 62, 'FINAL DE RUA • HOKUTO x SEIRAN', seg(t, 50, 90), '#e2e8f0');
        sfx(S, 70, 'passos', () => window.SFX?.whoosh?.());
      } else if (phase === 1) {
        CE.cineRain(ctx, W, H, t, 0.08, 50, 0.2);
        // os dois pés, cada um de um lado da bola (quadros diagonais, um de cada cor)
        if (t > 46 && t < 122) {
          const kA = seg(t, 46, 54);
          const kB = seg(t, 56, 64);
          const q = seg(t, 46, 122);
          cutBoots(ctx, S, kA, [[30, bot - 196], [W * 0.5 - 8, bot - 212], [W * 0.5 - 36, bot - 20], [30, bot - 20]], { bg: '#cfe8f5', lines: 'rgba(14,116,144,0.35)', linesAng: 0, t: q * 40, ball: { x: 0.86, y: 0.62, r: 0.2, rot: 0 }, boots: [Object.assign({ x: 0.42, y: 0.78, s: 0.2, ang: -0.1 }, BOOT_A(HOKUTO))], from: [-500, 0] });
          cutBoots(ctx, S, kB, [[W * 0.5 + 8, bot - 212], [W - 30, bot - 228], [W - 30, bot - 20], [W * 0.5 - 20, bot - 20]], { bg: '#f8dde2', lines: 'rgba(159,18,57,0.35)', linesAng: Math.PI, t: q * 40, ball: { x: 0.12, y: 0.64, r: 0.2, rot: 2 }, boots: [Object.assign({ x: 0.58, y: 0.8, s: 0.2, ang: 0.1, flip: true }, BOOT_B(SEIRAN))], from: [500, 0] });
        }
        sfx(S, 54, 'zap', () => window.SFX?.jingle?.([988, 1319], 0, 'square'));
      } else if (phase === 2) {
        const A = st.A || 0;
        if (A < STEAL + 14) {
          CE.drawSpeedLines(ctx, W, H, '#e2e8f0', 0.12 * (1 - seg(A, STEAL - 10, STEAL)));
          const slow = seg(t, 38, 48) * (1 - seg(t, 92, 104));
          if (slow > 0) {
            ctx.save();
            ctx.globalAlpha = 0.3 * slow;
            ctx.fillStyle = '#1a0306';
            ctx.fillRect(0, top, W, bot - top);
            ctx.restore();
          }
          if (st.mask) maskAt(ctx, K, st.mask[0], st.mask[1], 0, 0.9, { stripe: '#e5e7eb', glow: '#e5e7eb' });
          // o roubo em close: as duas chuteiras chegando e a do mascarado levando a bola
          if (t > 52 && t < 100) {
            const q = seg(t, 52, 100);
            const e = ease(q * 1.5);
            cutBoots(ctx, S, seg(t, 52, 60), [[W * 0.18, top + 20], [W - 26, top + 34], [W - 40, bot - 20], [W * 0.24, bot - 36]], {
              bg: '#f1e4e6',
              radial: 'rgba(127,29,29,0.7)',
              ball: { x: lerp(0.52, 0.6, e), y: lerp(0.62, 0.3, e), r: 0.13, rot: q * 6 },
              boots: [
                Object.assign({ x: 0.2, y: 0.9, s: 0.15, ang: -0.35 }, BOOT_A(HOKUTO)),
                Object.assign({ x: 0.86, y: 0.92, s: 0.15, ang: 0.35, flip: true }, BOOT_B(SEIRAN)),
                Object.assign({ x: lerp(0.38, 0.5, e), y: lerp(0.5, 0.42, e), s: 0.16, ang: lerp(0.9, -0.6, e) }, BOOT_M)
              ],
              from: [0, -300]
            });
          }
          const tau = A - STEAL;
          if (tau >= 0 && tau < 0.4) impactFrame(ctx, W, H);
          sfx(S, 80, 'roubo', () => window.SFX?.kick?.(0.6));
        } else {
          const u = st.u || 0;
          ctx.fillStyle = 'rgba(40,0,8,0.18)';
          ctx.fillRect(0, 0, W, H);
          if (st.m0) maskAt(ctx, K, st.m0[0], st.m0[1], 0, 0.9, { stripe: '#e5e7eb', glow: '#e5e7eb' });
          if (st.m1) maskAt(ctx, K, st.m1[0], st.m1[1], 0, 0.9, { stripe: RED, glow: '#ef4444' });
          if (u > 44 && u < 52) CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(u, 44, 52)));
          sfx(S, 150, 'gaiola', () => window.SFX?.post?.());
        }
      } else if (phase === 3) {
        [0, 1].forEach((i) => maskAt(ctx, K, 85.58 + i * 0.84, 14.85, 0, 0.9, { stripe: i ? RED : '#e5e7eb', glow: t > 40 ? (i ? '#ef4444' : '#e5e7eb') : null }));
        CE.cineRain(ctx, W, H, t, 0.15, 90, 0.2);
        // a máscara em close (pixel) quando ela fala
        if (t > 84 && t < 156) cutMask(ctx, S, seg(t, 84, 94), 0, { poly: [[W * 0.56, top + 30], [W - 34, top + 22], [W - 30, bot - 30], [W * 0.6, bot - 22]], stripe: '#e5e7eb', glow: '#ffffff' });
        sfx(S, 84, 'mascara', () => window.SFX?.jingle?.([220, 196], 0, 'square'));
      } else {
        const w0 = K.screen(82.6, 1.45, ROOM_Y + 0.02);
        const w1 = K.screen(83.45, 0.66, ROOM_Y + 0.02);
        if (w0 && w1) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(w0.x, w0.y, w1.x - w0.x, w1.y - w0.y);
          ctx.clip();
          CE.cineRain(ctx, W, H, t, 0.45, 60, 0.15);
          ctx.restore();
        }
        if (t > 40 && t < 160) cutLetter(ctx, S, seg(t, 40, 52), seg(t, 46, 150));
        // no fim, os olhos dos dois acendem dourado (pequeno, no boneco)
        const lit = seg(t, 162, 175);
        if (lit > 0) {
          [eyeOf(K, RA[0], RA[1]), eyeOf(K, RB[0], RB[1])].forEach((e) => {
            if (!e) return;
            [-2.6, 2.6].forEach((dx) => CE.cineGlow(ctx, e.x + dx * e.u, e.y, 4 * e.u, rgba(GOLD, 0.9), lit));
          });
        }
        sfx(S, 26, 'envelope', () => window.SFX?.click?.());
        sfx(S, 162, 'olhos', () => window.SFX?.jingle?.([523, 784], 0, 'triangle'));
        CE.cineFlash(ctx, W, H, seg(t, 182, 200), '#000000');
      }
      fadeIn(ctx, S);
    }
  });

  // ======================================================================
  // duo_elo — O ELO SE FECHA (na sala do Ego, onde a conversa acontece)
  // ======================================================================
  const EL_KEYS = [[0, 0], [30, 30], [70, 40], [140, 110]]; // a câmera lenta na trava
  reg('duo_elo', {
    phases: [150, 150, 140],
    music: 'mystery',
    title: '🔗 O ELO SE FECHA',
    tags: ['PLANO 1 • AS TRINTA DUPLAS', 'PLANO 2 • A PULSEIRA', 'PLANO 3 • PRESOS'],
    subs: [
      [{ from: 30, who: 'ANRI TEIERI', text: 'Trinta duplas. Uma pulseira para cada um.', color: '#38bdf8' }],
      [{ from: 70, who: 'ANRI TEIERI', text: 'Elo ativado. A partir de agora, o ranking é da dupla.', color: '#38bdf8' }],
      [{ from: 20, who: 'JINPACHI EGO', text: '"Se um cair... os dois caem."', color: '#00f5d4' }]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const R = ROOM();
      const st = (K.st = {});
      if (!R) return;
      const VX = R.VX;
      const A0 = R.YOU_T;
      const B0 = [A0[0] + 0.85, A0[1] + 0.25];
      const AN = [A0[0] + 1.7, A0[1] + 0.35];
      K.expo(0.92);
      if (phase === 0) {
        // AS TRINTA DUPLAS: a grua desce da parede de monitores até os dois na frente da mesa
        const k = easeIO(seg(t, 0, 150));
        const eye = mixP([VX - 0.4, 2.5, 19.7], [VX - 2.2, 1.0, 18.9], k);
        K.cam(eye, mixP([VX, 1.1, 13.4], [VX - 0.15, 0.62, 15.6], k), lerp(50, 44, k));
        const pw = pairsWall(t, seg(t, 90, 110));
        R.build(K, f, eye, { wall: pw.cv, wallDirty: pw.dirty, glow: 0.2 });
        K.actor('EGO', { x: R.EGO_AT[0], y: R.EGO_AT[1], ang: Math.PI / 2, k: 0.95, light: [0.62, 0.8, 0.9] });
        duo(K, 'a', ELO, { x: A0[0], y: A0[1], face: R.EGO_AT, light: LA });
        duo(K, 'b', ELO, { x: B0[0], y: B0[1], face: R.EGO_AT, light: LB });
        K.actor('ANRI', { x: AN[0], y: AN[1], face: [VX, 16], light: [0.8, 0.85, 0.95] });
        [A0, B0].forEach((p, i) => wristLed(K, S, p[0] + 0.13, p[1] + 0.02, i, false));
      } else if (phase === 1) {
        // A PULSEIRA: de lado, os dois olhando o pulso; o close da trava no quadro grande
        const A = remap(t, EL_KEYS);
        st.A = A;
        const k = easeIO(seg(t, 0, 150));
        const eye = shake(K, [lerp(VX - 3.2, VX - 2.9, k), lerp(0.8, 0.72, k), lerp(18.3, 17.9, k)], f, A > 30 && A < 34 ? 0.01 : 0.003, 2);
        K.cam(eye, [lerp(VX - 0.6, VX - 0.3, k), 0.56, 16.65], lerp(42, 38, k));
        const pw = pairsWall(t + 200, 1);
        R.build(K, f, eye, { wall: pw.cv, wallDirty: pw.dirty, glow: 0.2 });
        K.actor('EGO', { x: R.EGO_AT[0], y: R.EGO_AT[1], ang: Math.PI / 2, k: 0.95, light: [0.62, 0.8, 0.9] });
        duo(K, 'a', ELO, { x: A0[0], y: A0[1], ang: 0.2, light: LA });
        duo(K, 'b', ELO, { x: B0[0], y: B0[1], ang: Math.PI - 0.2, light: LB });
        K.actor('ANRI', { x: AN[0], y: AN[1], face: A0, light: [0.8, 0.85, 0.95] });
        [A0, B0].forEach((p, i) => wristLed(K, S, p[0] + 0.13, p[1] + 0.02, i, false));
      } else {
        // PRESOS: os dois de cara feia, frente a frente; a corrente de luz entre os pulsos e o
        // Ego atrás da mesa, no meio deles
        const k = easeIO(seg(t, 0, 140));
        const a = lerp(-0.25, 0.2, k);
        const C = [VX - 0.35, 16.6];
        const eye = [C[0] + Math.sin(a) * 2.9, lerp(0.72, 0.62, k), C[1] + Math.cos(a) * 2.9];
        K.cam(eye, [C[0], 0.62, C[1] - 0.4], lerp(42, 38, k));
        const pw = pairsWall(t + 400, 1);
        R.build(K, f, eye, { wall: pw.cv, wallDirty: pw.dirty, glow: 0.24 });
        K.actor('EGO', { x: R.EGO_AT[0], y: R.EGO_AT[1], ang: Math.PI / 2, k: 0.95, light: [0.7, 0.88, 0.95] });
        const pa = [C[0] - 0.5, C[1]];
        const pb = [C[0] + 0.5, C[1]];
        duo(K, 'a', ELO, { x: pa[0], y: pa[1], ang: 0, light: LA, opts: { expr: 'angry' } });
        duo(K, 'b', ELO, { x: pb[0], y: pb[1], ang: Math.PI, light: LB, opts: { expr: 'angry' } });
        chain3d(K, [pa[0] + 0.12, pa[1] + 0.02, 0.36], [pb[0] - 0.12, pb[1] + 0.02, 0.36], t, seg(t, 14, 40));
        st.ego = [R.EGO_AT[0], 0.82, R.EGO_AT[1]];
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = K.st || {};
      if (phase === 0) {
        CE.cineDust(ctx, W, H, t, 24, 'rgba(165,243,252,0.4)', 4);
        kicker(ctx, 40, top + 30, 'PROJETO ELO • 30 DUPLAS • 60 ATACANTES', seg(t, 14, 50), GOLD);
        sfx(S, 10, 'salao', () => window.SFX?.jingle?.([196, 262], 0, 'triangle'));
      } else if (phase === 1) {
        const A = st.A || 0;
        // a trava: câmera lenta, a pulseira fecha (CLACK), os LEDs acendem e o parceiro
        // encosta o punho (TOC) — tudo no quadro de mangá
        const slow = seg(A, 22, 30) * (1 - seg(A, 44, 54));
        if (slow > 0) {
          ctx.save();
          ctx.globalAlpha = 0.25 * slow;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
        }
        if (t > 22 && t < 144) {
          const shut = ease(seg(A, 26, 34));
          const lit = Math.floor(clamp((A - 40) / 24) * 5);
          const meet = ease(seg(A, 74, 92));
          const bump = A >= 92;
          cutWrists(ctx, S, seg(t, 22, 32), {
            a: { open: shut, lit, num: 27, t, glow: GOLD },
            b: A > 70 ? { open: 1, lit: 5, num: 27, t, glow: GOLD } : null,
            meet,
            dx: (1 - meet) * 500,
            lines: 'rgba(253,224,71,0.22)',
            radial: bump ? 'rgba(253,224,71,0.5)' : null,
            burst: bump ? ease(seg(A, 92, 100)) * (1 - seg(A, 104, 112)) : 0,
            t
          });
          if (A >= 34 && A < 34.4) impactFrame(ctx, W, H);
          if (A >= 34 && A < 66) CE.cineImpactText(ctx, 'CLACK!', W * 0.24, top + 70, 72, '#f8fafc', seg(A, 34, 38), 0, -0.1);
        }
        sfx(S, 46, 'clack', () => window.SFX?.kick?.(0.8));
        sfx(S, 78, 'led', () => window.SFX?.jingle?.([523, 659, 784, 988, 1175], 0, 'square'));
        sfx(S, 122, 'soquinho', () => window.SFX?.kick?.(0.5));
      } else {
        // os óculos do Ego brilham atrás deles (pequeno, no boneco)
        const e = st.ego ? K.screen(st.ego[0], st.ego[1], st.ego[2]) : null;
        if (e && t > 70) CE.cineGlow(ctx, e.x, e.y, 30, 'rgba(255,255,255,0.85)', seg(t, 70, 78) * (1 - seg(t, 84, 100)));
        CE.cineDust(ctx, W, H, t, 20, 'rgba(253,224,71,0.35)', 8);
        sfx(S, 80, 'caem', () => window.SFX?.jingle?.([196, 147], 0, 'sawtooth'));
        CE.cineFlash(ctx, W, H, seg(t, 122, 140), '#000000');
      }
      fadeIn(ctx, S);
    }
  });

  // ======================================================================
  // duo_ressonancia — RESSONÂNCIA / ATAQUE DE DUPLA (no campo)
  // ======================================================================
  const HA = [53.4, 13.0];
  const HB = [52.6, 13.0];
  const SYNC = 46; // os dois corações batendo no mesmo segundo
  const DEF = [[24, 0.9], [52, 1.25], [78, 0.75]]; // [quando é derrubado, quanto voa] (sempre para longe da câmera)
  // os dois pulsos piscando (o batimento de cada um; no SYNC os dois juntos, dourados)
  function cutBeats(ctx, S, kIn, t) {
    const { W, top } = S;
    const sync = t >= SYNC;
    const beat = (ph) => (mod(t + ph, sync ? 24 : 30) < 5 ? 5 : 2);
    [['a', CA, 0, [[24, top + 20], [W * 0.42, top + 20], [W * 0.4, top + 190], [24, top + 190]], [-400, 0]], ['b', CB, 13, [[W * 0.58, top + 20], [W - 24, top + 20], [W - 24, top + 190], [W * 0.6, top + 190]], [400, 0]]].forEach(([side, col, ph, poly, from]) => {
      const CAx = CAa();
      if (!CAx) return;
      const c = cast();
      CAx.panel(
        ctx,
        poly,
        (b, g) => {
          g.fillStyle = '#0b1020';
          g.fillRect(b.x, b.y, b.w, b.h);
          const lit = beat(sync ? 0 : ph);
          // (a pulseira no meio do quadro: o canvas tem a pulseira em ~85 de 132)
          const off = (85 - 66) * PIX;
          const x = b.x + b.w / 2 + b.ox + (side === 'a' ? -off : off);
          wristBlit(g, side, { skin: side === 'a' ? c.a.skinColor : c.b.skinColor, open: 1, lit, num: 27, t, glow: sync ? GOLD : col }, x, b.y + b.h / 2 + 10);
        },
        { k: kIn, from, pixel: PIX }
      );
    });
  }
  reg('duo_ressonancia', {
    phases: [110, 110, 90, 120],
    music: 'epic',
    title: '🔗 RESSONÂNCIA',
    tags: ['PLANO 1 • NO MESMO SEGUNDO', 'PLANO 2 • RESSONÂNCIA', 'PLANO 3 • ATAQUE DE DUPLA', 'PLANO 4 • GOL DO ELO'],
    subs: [[{ from: 14, who: 'NARRADOR', text: 'Os dois corações batem no mesmo segundo. As pulseiras disparam.', color: '#fde047' }], [], [], []],
    // na partida, o estádio com as cores da partida
    get theme() {
      return window.MatchEngine?.active && CE.ptdTheme ? CE.ptdTheme('bluelock_holo') : 'bluelock_holo';
    },
    scene(K, S) {
      const { t, phase, dur, f } = S;
      const st = (K.st = {});
      K.expo(0.95);
      if (phase === 0) {
        // NO MESMO SEGUNDO: os dois parados olhando o gol; a câmera dando a volta devagar
        const k = easeIO(seg(t, 0, 110));
        const a = lerp(0.35, -0.2, k);
        const eye = [53 + Math.sin(a) * 2.8, lerp(0.62, 0.55, k), 13.0 - Math.cos(a) * 2.8];
        K.cam(eye, [53, 0.58, 13.0], lerp(44, 40, k));
        const l = t >= SYNC ? [1.25, 1.2, 1.0] : null;
        duo(K, 'a', ELO, { x: HA[0], y: HA[1], face: [53, 8], light: l || LA });
        duo(K, 'b', ELO, { x: HB[0], y: HB[1], face: [53, 8], light: l || LB });
        st.mid = [53, 0.5, 13.0];
      } else if (phase === 1) {
        // RESSONÂNCIA: a corrida derrubando a marcação, a câmera correndo junto de lado
        runScene(K, S);
        DEF.forEach(([at, side], i) => {
          const dy = runY(at, dur) - 0.35;
          const hit = t > at;
          const q = ease(seg(t, at, at + 26));
          K.actor('elo_gen_b', { id: 'def' + i, extra: { jerseyPrimary: '#334155', jerseySecondary: '#94a3b8' }, x: 53.0 + side * q * 1.3, y: dy - q * 0.9, z: hit ? Math.sin(q * Math.PI) * 0.5 : 0, face: [53, 22], anim: hit ? 'dive' : 'idle', left: side < 0 });
        });
      } else if (phase === 2) {
        st.A = shotScene(K, S, true);
      } else {
        const keeper = window.MatchEngine?.active ? window.MatchEngine.entities?.find((e) => e.team === 'away' && e.isGK)?.charData : null;
        Object.assign(st, goalScene(K, S, keeper));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = K.st || {};
      if (phase === 0) {
        towerFlares(ctx, K, S, 0.6);
        // o tempo para no mesmo segundo: a cor vai embora em volta dos dois e volta
        const m = st.mid ? K.screen(st.mid[0], st.mid[1], st.mid[2]) : null;
        const bw = seg(t, SYNC, SYNC + 10) * (1 - seg(t, 90, 106));
        if (m && bw > 0) bwSoft(ctx, W, H, m.x, m.y - 20, 150, 460, bw);
        if (t > 6) cutBeats(ctx, S, seg(t, 6, 16), t);
        if (t >= SYNC && t < SYNC + 8) CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, SYNC, SYNC + 8)), '#fde047');
        sfx(S, SYNC, 'reso', () => window.SFX?.jingle?.([523, 659, 784, 1047], 0, 'square'));
      } else if (phase === 1) {
        towerFlares(ctx, K, S, 0.6);
        runOverlay(ctx, S, K);
        DEF.forEach(([at]) => {
          if (t > at && t < at + 6) {
            const p = K.screen(53.0, 0.6, runY(at, S.dur) - 0.35);
            if (p) CE.cineGlow(ctx, p.x, p.y, 70, 'rgba(255,255,255,0.6)', 1 - (t - at) / 6);
          }
        });
        sfx(S, 24, 'bam', () => window.SFX?.tackle?.());
      } else if (phase === 2) {
        towerFlares(ctx, K, S, 0.7);
        shotOverlay(ctx, S, K, st.A || 0, { both: true });
        sfx(S, 60, 'chute', () => window.SFX?.kick?.(1));
      } else {
        if (st.b) goalOverlay(ctx, S, K, st.b, st.hit, { word: 'GOOOL!!' });
        sfx(S, GHIT, 'rede', () => window.SFX?.goal?.(true));
      }
      fadeIn(ctx, S);
    }
  });

  // ======================================================================
  // duo_regra — A REGRA DO UM (o auditório: o saguão, com o telão)
  // ======================================================================
  const RED_SCR = { key: 'regra', frame: '#3f0a0a', screen: '#140306', tint: 'rgba(239,68,68,0.12)', scan: 'rgba(239,68,68,0.1)', label: '#ef4444', title: 'RESTAM 12 DUPLAS', glitch: true };
  const CH = [24.25, 25.75, 10.75]; // x de A, x de B, y (os dois frente a frente com a corrente)
  const RG_KEYS = [[0, 0], [40, 40], [100, 52], [160, 112]]; // a câmera lenta na corrente rachando
  function redHall(K) {
    K.ambient('#ffc4c4');
    K.fog('#2a0508', 0.04);
    K.expo(0.78);
  }
  reg('duo_regra', {
    phases: [150, 110, 160],
    music: 'dread',
    title: '⚖️ A REGRA DO UM',
    tags: ['PLANO 1 • O AUDITÓRIO', 'PLANO 2 • UM', 'PLANO 3 • A CORRENTE RACHA'],
    subs: [
      [{ from: 20, who: 'NARRADOR', text: 'Auditório do Projeto Elo. Restam doze duplas.', color: '#cbd5e1' }],
      [{ from: 14, who: 'JINPACHI EGO', text: '"A Sub-20 vai levar UM atacante do Projeto Elo. Um."', color: '#ef4444' }],
      [{ from: 30, who: 'NARRADOR', text: 'A corrente entre os dois racha. Agora cada um tem o seu número.', color: '#cbd5e1' }]
    ],
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      redHall(K);
      const RL = [1.2, 0.8, 0.8];
      if (phase === 0) {
        // O AUDITÓRIO: a câmera passa por cima das doze duplas e chega no telão
        egoScreen(K, S, RED_SCR);
        const z = easeIO(seg(t, 0, 150));
        K.cam(mixP([25.6, 1.7, 20.8], [25.2, 1.0, 13.2], z), mixP([25, 0.75, 10.0], [25, 0.9, 9.0], z), lerp(52, 44, z));
        crowdHall(K, S, { only: 0.48, light: RL, red: true });
        duo(K, 'a', ELO, { x: YA[0], y: YA[1], face: [25, 9], light: [1.15, 1.0, 1.1], k: 0.88 });
        duo(K, 'b', ELO, { x: YB[0], y: YB[1], face: [25, 9], light: [1.3, 0.92, 0.95], k: 0.88 });
      } else if (phase === 1) {
        // UM: de baixo, no meio das duplas, olhando o telão; o rosto do Ego vira um "1"
        const one = t >= 34 ? 1 : 0;
        egoScreen(K, S, Object.assign({}, RED_SCR, { key: 'um', size: 380, eyeY: 50, rim: RED, glasses: seg(t, 10, 18) * (1 - one), one, glitch: t > 30 && t < 40, title: 'PROJETO ELO • A REGRA DO UM' }));
        const k = easeIO(seg(t, 0, 110));
        const eye = shake(K, [lerp(25.8, 25.5, k), lerp(0.32, 0.4, k), lerp(14.6, 13.9, k)], f * 2, t >= 34 ? 0.02 * Math.max(0, 1 - (t - 34) / 20) : 0.002, 3);
        K.cam(eye, [25.0, lerp(0.95, 1.0, k), 9.0], lerp(46, 42, k));
        crowdHall(K, S, { only: 0.48, light: RL, red: true });
        duo(K, 'a', ELO, { x: YA[0], y: YA[1], face: [25, 9], light: [1.15, 1.0, 1.1], k: 0.88 });
        duo(K, 'b', ELO, { x: YB[0], y: YB[1], face: [25, 9], light: [1.3, 0.92, 0.95], k: 0.88 });
      } else {
        // A CORRENTE RACHA: os dois frente a frente; câmera lenta quando os elos do meio caem
        egoScreen(K, S, RED_SCR);
        const A = remap(t, RG_KEYS);
        st.A = A;
        const brk = ease(seg(A, 40, 64));
        const k = easeIO(seg(t, 0, 160));
        const a = lerp(0.2, -0.22, k);
        const eye = shake(K, [25 + Math.sin(a) * 2.8, lerp(0.5, 0.42, k), CH[2] + Math.cos(a) * 2.8], f * 2, A >= 40 && A < 52 ? 0.02 : 0.002, 2);
        K.cam(eye, [25, 0.55, CH[2]], lerp(40, 36, k));
        duo(K, 'a', ELO, { x: CH[0], y: CH[2], ang: 0, light: [1.1, 1.05, 1.2] });
        duo(K, 'b', ELO, { x: CH[1], y: CH[2], ang: Math.PI, light: [1.3, 0.95, 1.0] });
        chain3d(K, [CH[0] + 0.12, CH[2] + 0.02, 0.36], [CH[1] - 0.12, CH[2] + 0.02, 0.36], t, 1, brk);
        st.mid = [25, 0.36, CH[2]];
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = K.st || {};
      // o salão puxado para o vermelho (multiplicar é barato, sem filtro)
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(255,140,140,${phase === 1 ? 0.25 : 0.35})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      if (phase === 0) {
        CE.cineShafts(ctx, W * 0.15, top - 10, Math.PI * 0.35, H, 0.25, 3, '254,202,202', 0.06, t);
        CE.cineShafts(ctx, W * 0.85, top - 10, Math.PI * 0.65, H, 0.25, 3, '254,202,202', 0.06, t);
        kicker(ctx, 40, top + 30, 'PROJETO ELO • AUDITÓRIO', seg(t, 14, 44), '#ef4444');
        sfx(S, 30, 'zoom', () => window.SFX?.whoosh?.());
      } else if (phase === 1) {
        const p = K.screen(25, 0.9, 9.05);
        if (p && t >= 34) CE.cineGlow(ctx, p.x, p.y, 260, 'rgba(239,68,68,0.35)', 1 - seg(t, 40, 90) * 0.5);
        if (t >= 34 && t < 40) CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, 34, 40)), '#ef4444');
        sfx(S, 34, 'um', () => window.SFX?.kick?.(1));
      } else {
        const A = st.A || 0;
        const m = st.mid ? K.screen(st.mid[0], st.mid[1], st.mid[2]) : null;
        const slow = seg(t, 36, 46) * (1 - seg(t, 92, 104));
        if (slow > 0) {
          ctx.save();
          ctx.globalAlpha = 0.25 * slow;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
        }
        if (A >= 40 && A < 40.4) impactFrame(ctx, W, H);
        if (m && A >= 40) CE.cineGlow(ctx, m.x, m.y, 120, 'rgba(239,68,68,0.6)', 1 - seg(A, 40, 60));
        if (A >= 40 && A < 46 && m) CE.drawRadialSpeedLines(ctx, m.x, m.y, W, '#fecaca', 0.35 * (1 - seg(A, 40, 46)));
        // cada um com o seu número: as duas pulseiras, cada uma com o contador zerado
        if (t > 112) {
          cutWrists(ctx, S, seg(t, 112, 122), {
            a: { open: 1, lit: 1, num: 0, t, glow: CA },
            b: { open: 1, lit: 1, num: 0, t, glow: CB },
            meet: 1,
            gap: 70,
            bg: '#140306',
            lines: 'rgba(239,68,68,0.2)',
            t
          });
        }
        sfx(S, 40, 'racha', () => window.SFX?.tackle?.());
      }
      fadeIn(ctx, S);
    }
  });

  // ======================================================================
  // duo_mascaras — AS MÁSCARAS CAEM (a sala do Ego no escuro, onde a conversa acontece)
  // ======================================================================
  const MK_KEYS = [[0, 0], [40, 40], [80, 48], [110, 78]]; // a câmera lenta na máscara rachando
  reg('duo_mascaras', {
    phases: [150, 110, 160],
    music: 'mystery',
    title: '🎭 AS MÁSCARAS CAEM',
    tags: ['PLANO 1 • NO ESCURO', 'PLANO 2 • A RACHADURA', 'PLANO 3 • OS ROSTOS'],
    subs: [
      [{ from: 30, who: 'NARRADOR', text: 'No escuro, as duas máscaras brancas esperando.', color: '#cbd5e1' }],
      [],
      [{ from: 60, who: 'NARRADOR', text: 'Shion Mikami e Haru Ibuki. A primeira dupla do Projeto Elo.', color: '#e5e7eb' }]
    ],
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase, f } = S;
      const R = ROOM();
      const st = (K.st = {});
      if (!R) return;
      const VX = R.VX;
      const M = [[VX - 0.45, 16.15], [VX + 0.45, 16.15]]; // os dois mascarados, na frente da mesa
      const DIM = [0.42, 0.36, 0.42];
      const sw = staticWall(f);
      const room = (eye, a = 0.8) => R.build(K, f, eye, { wall2: sw.cv, wall2Dirty: sw.dirty, wall2a: a, wallLight: [0.3, 0.2, 0.25], ambient: '#8a6a80', glow: 0.06 });
      K.expo(0.86);
      if (phase === 0) {
        // NO ESCURO: vocês entram pela porta; as duas máscaras esperando na frente da mesa
        const k = easeIO(seg(t, 0, 150));
        const eye = [lerp(VX + 3.0, VX + 2.6, k), lerp(1.25, 1.0, k), lerp(19.8, 19.6, k)];
        K.cam(eye, [lerp(VX - 0.1, VX - 0.3, k), lerp(0.7, 0.62, k), lerp(16.4, 16.9, k)], lerp(46, 42, k));
        room(eye);
        K.actor('EGO', { x: R.EGO_AT[0], y: R.EGO_AT[1], ang: Math.PI / 2, k: 0.95, light: [0.32, 0.24, 0.3] });
        M.forEach((p, i) => K.actor(masked(i), { id: 'm' + i, x: p[0], y: p[1], ang: Math.PI / 2, frame: 45 + i, light: DIM }));
        const walk = ease(seg(t, 10, 110));
        const moving = walk > 0 && walk < 1;
        duo(K, 'a', ELO, { x: lerp(VX - 0.6, VX - 1.0, walk), y: lerp(20.8, 17.6, walk), ang: -Math.PI / 2, anim: moving ? 'run' : 'idle', frame: moving ? Math.floor(S.f * 0.4) : undefined, light: [0.6, 0.58, 0.7] });
        duo(K, 'b', ELO, { x: lerp(VX + 0.4, VX + 0.55, walk), y: lerp(21.0, 17.7, walk), ang: -Math.PI / 2, anim: moving ? 'run' : 'idle', frame: moving ? Math.floor(S.f * 0.4) + 2 : undefined, light: [0.62, 0.55, 0.62] });
        st.m = M;
      } else if (phase === 1) {
        // A RACHADURA: de lado, a câmera chegando; o close da máscara rachando no quadro
        const A = remap(t, MK_KEYS);
        st.A = A;
        const k = easeIO(seg(t, 0, 110));
        const eye = shake(K, [lerp(VX + 3.1, VX + 2.7, k), 0.75, lerp(16.9, 16.6, k)], f * 2, A > 48 && A < 60 ? 0.012 : 0.002, 4);
        K.cam(eye, [VX, 0.62, 16.15], lerp(42, 38, k));
        room(eye, 0.9);
        K.actor('EGO', { x: R.EGO_AT[0], y: R.EGO_AT[1], ang: Math.PI / 2, k: 0.95, light: [0.32, 0.24, 0.3] });
        M.forEach((p, i) => K.actor(masked(i), { id: 'm' + i, x: p[0], y: p[1], ang: Math.PI / 2, frame: 45 + i, light: DIM }));
        st.m = M;
      } else {
        // OS ROSTOS: as máscaras caem; Shion e Haru contra a luz vermelha dos monitores
        const k = easeIO(seg(t, 0, 160));
        const eye = [lerp(VX - 0.5, VX + 0.3, k), lerp(0.42, 0.5, k), lerp(19.1, 18.9, k)];
        K.cam(eye, [VX, lerp(0.72, 0.66, k), 16.15], lerp(42, 40, k));
        room(eye, 1);
        K.actor('EGO', { x: R.EGO_AT[0], y: R.EGO_AT[1], ang: Math.PI / 2, k: 0.95, light: [0.36, 0.26, 0.32] });
        const lit = seg(t, 60, 72);
        const L = mixP([0.55, 0.5, 0.58], [0.85, 0.82, 0.9], lit);
        K.actor('elo_shion', { id: 'sh', extra: SHION_KIT, x: M[0][0], y: M[0][1], ang: Math.PI / 2, light: L });
        K.actor('elo_haru', { id: 'ha', extra: HARU_KIT, x: M[1][0], y: M[1][1], ang: Math.PI / 2, light: L });
        st.m = M;
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = K.st || {};
      const M = st.m;
      if (!M) return;
      if (phase === 0) {
        M.forEach((p, i) => maskAt(ctx, K, p[0], p[1], 0, 0.9, { stripe: i ? RED : '#e5e7eb', glow: t > 70 ? (i ? '#ef4444' : '#e5e7eb') : null }));
        CE.cineDust(ctx, W, H, t, 18, 'rgba(254,202,202,0.35)', 3);
        sfx(S, 30, 'passo0', () => window.SFX?.click?.());
        sfx(S, 62, 'passo1', () => window.SFX?.click?.());
      } else if (phase === 1) {
        const A = st.A || 0;
        M.forEach((p, i) => maskAt(ctx, K, p[0], p[1], 0, 0.9, { stripe: i ? RED : '#e5e7eb', glow: i ? '#ef4444' : '#e5e7eb' }));
        const crack = ease(seg(A, 12, 48));
        const slow = seg(t, 36, 46) * (1 - seg(t, 78, 92));
        if (slow > 0) {
          ctx.save();
          ctx.globalAlpha = 0.28 * slow;
          ctx.fillStyle = '#12030a';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
        }
        if (t > 8) cutMask(ctx, S, seg(t, 8, 18), Math.min(0.82, crack * 0.7 + seg(A, 48, 70) * 0.12), { stripe: '#e5e7eb', glow: '#ffffff' });
        if (A >= 48 && A < 48.6) impactFrame(ctx, W, H);
        if (A >= 48) CE.cineImpactText(ctx, 'CRAC', W * 0.8, top + 90, 76, '#f8fafc', seg(A, 48, 52), 0, 0.1);
        sfx(S, 14, 'crac', () => window.SFX?.tackle?.());
      } else {
        // as máscaras caindo dos rostos (rachadas, em pixel) e os olhos acendendo pequeno
        M.forEach((p, i) => {
          const e = eyeOf(K, p[0], p[1]);
          if (!e || !CE.duoMask) return;
          const fall = easeIn(seg(t, 18 + i * 10, 58 + i * 10));
          if (fall < 1) {
            ctx.save();
            ctx.globalAlpha = 1 - fall;
            ctx.translate(Math.round(e.x + (i ? 3 : -3) * fall * 30), Math.round(e.y + 0.6 * e.u + fall * 260));
            ctx.rotate((i ? 1 : -1) * Math.round(fall * 6) * 0.25);
            CE.duoMask(ctx, 0, 0, e.u, { stripe: i ? RED : '#e5e7eb', crack: 0.6, seed: 3 + i });
            ctx.restore();
          }
          const lit = seg(t, 62, 72);
          if (lit > 0) [-2.6, 2.6].forEach((dx) => CE.cineGlow(ctx, e.x + dx * e.u, e.y, 2.2 * e.u, i ? 'rgba(239,68,68,0.75)' : 'rgba(255,255,255,0.75)', lit));
        });
        kicker(ctx, 40, bot - 40, 'SHION MIKAMI  •  HARU IBUKI', seg(t, 74, 104), '#ef4444');
        sfx(S, 20, 'cai', () => window.SFX?.click?.());
        sfx(S, 62, 'olhos', () => window.SFX?.jingle?.([392, 523], 0, 'triangle'));
        CE.cineFlash(ctx, W, H, seg(t, 142, 160), '#000000');
      }
      fadeIn(ctx, S);
    }
  });

  // ======================================================================
  // duo_final — DOIS EGOS, UM GOL (a final no campo)
  // ======================================================================
  const NL_KEYS = [[0, 0], [34, 34], [80, 46], [100, 66]]; // a câmera lenta no passe sem olhar
  const PASS_AT = 40;
  reg('duo_final', {
    phases: [110, 100, 90, 210],
    music: 'epic',
    title: '🏆 DOIS EGOS, UM GOL',
    tags: ['PLANO 1 • O ÚLTIMO LANCE', 'PLANO 2 • SEM OLHAR', 'PLANO 3 • O CHUTE', 'PLANO 4 • O ELO'],
    subs: [
      [{ from: 10, who: 'NARRADOR', text: 'Final da Liga dos Pares. 2 a 2. Último lance.', color: '#fde047' }],
      [],
      [],
      [{ from: 120, who: 'NARRADOR', text: 'As duas pulseiras, desligadas no bolso, acendem sozinhas.', color: '#fde047' }]
    ],
    theme: 'worldcup_final',
    scene(K, S) {
      const { t, phase, dur, f } = S;
      const st = (K.st = {});
      K.expo(0.95);
      if (phase === 0) {
        // O ÚLTIMO LANCE: a corrida; o Shion se joga e fica para trás
        runScene(K, S);
        const at = 34;
        const sy = runY(at + 8, dur) - 0.2;
        const q = ease(seg(t, at, at + 30));
        K.actor('elo_shion', { id: 'sh', extra: SHION_KIT, x: 53.4 + q * 1.1, y: sy + q * 0.6, z: Math.sin(q * Math.PI) * 0.35, face: [53, 22], anim: t > at ? 'dive' : 'idle', opts: t > at ? { animTime: q * 30 } : undefined });
      } else if (phase === 1) {
        // SEM OLHAR: os dois correndo para a câmera (ela recua na frente); o passe sai de lado
        const A = remap(t, NL_KEYS);
        st.A = A;
        const y = lerp(15.8, 12.9, seg(A, 0, 66));
        const eye = shake(K, [53 + Math.sin(t * 0.03) * 0.1, 0.58, y - 2.7], f, 0.012, 5);
        K.cam(eye, [53, 0.58, y], 40);
        duo(K, 'a', ELO, { x: 53.45, y, ang: -Math.PI / 2, anim: 'run', frame: Math.floor(S.f * 1.2), light: LA });
        duo(K, 'b', ELO, { x: 52.55, y: y + 0.08, ang: -Math.PI / 2, anim: A > PASS_AT - 4 && A < PASS_AT + 6 ? 'shoot' : 'run', frame: A > PASS_AT - 4 && A < PASS_AT + 6 ? 1 : Math.floor(S.f * 1.2) + 3, light: LB });
        const bq = ease(seg(A, PASS_AT, PASS_AT + 14));
        K.ball(lerp(52.75, 53.35, bq), y - 0.3 - bq * 0.05, 0.06 + Math.sin(bq * Math.PI) * 0.1);
      } else if (phase === 2) {
        st.A = shotScene(K, S, false);
      } else if (t < 110) {
        Object.assign(st, goalScene(K, S, null));
      } else {
        // O ELO: os dois comemorando; no quadro, os punhos se encontram e as pulseiras acendem
        const u = t - 110;
        const k = easeIO(seg(u, 0, 100));
        K.cam([lerp(53.2, 53.0, k), lerp(0.5, 1.2, k), lerp(12.6, 13.4, k)], [52.6, lerp(0.55, 0.45, k), 9.6], lerp(44, 50, k));
        duo(K, 'a', ELO, { x: 52.35, y: 9.6, face: [52.85, 9.6], anim: 'celebrate', light: LA });
        duo(K, 'b', ELO, { x: 52.85, y: 9.6, face: [52.35, 9.6], anim: 'celebrate', light: LB });
        st.mid = [52.6, 0.4, 9.6];
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = K.st || {};
      const score = (k = 1, h = 2) => CE.ptdScore && CE.ptdScore(ctx, W - 410, top + 18, { hl: 'ELO', al: 'S&H', hs: h, as: 2, minute: "90+3'", hc: GOLD, ac: '#ef4444', k });
      if (phase === 0) {
        towerFlares(ctx, K, S, 0.7);
        runOverlay(ctx, S, K);
        score(seg(t, 4, 14));
        sfx(S, 34, 'drible', () => window.SFX?.whoosh?.());
      } else if (phase === 1) {
        const A = st.A || 0;
        towerFlares(ctx, K, S, 0.6);
        CE.drawSpeedLines(ctx, W, H, '#f8fafc', 0.1);
        // a câmera lenta no passe: escurece em volta e o quadro com a chuteira do parceiro
        const slow = seg(t, 30, 40) * (1 - seg(t, 76, 88));
        if (slow > 0) {
          ctx.save();
          ctx.globalAlpha = 0.25 * slow;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
        }
        if (t > 36 && t < 84) {
          const q = seg(A, PASS_AT - 4, PASS_AT + 10);
          cutBoots(ctx, S, seg(t, 36, 44), [[W * 0.52, top + 30], [W - 26, top + 20], [W - 36, bot - 24], [W * 0.56, bot - 32]], { bg: '#fbe4e8', lines: 'rgba(15,23,42,0.5)', linesAng: 0, t: q * 60, ball: { x: lerp(0.5, 0.86, ease(q)), y: 0.6, r: 0.13, rot: q * 5 }, boots: [Object.assign({ x: lerp(0.22, 0.36, ease(q)), y: 0.74, s: 0.18, ang: lerp(0.4, -0.25, ease(q)) }, BOOT_B(ELO))], from: [400, 0] });
        }
        score();
        sfx(S, 40, 'olhar', () => window.SFX?.jingle?.([784, 1047], 0, 'square'));
      } else if (phase === 2) {
        towerFlares(ctx, K, S, 0.7);
        shotOverlay(ctx, S, K, st.A || 0, { both: false });
        sfx(S, 60, 'chute', () => window.SFX?.kick?.(1));
      } else if (t < 110) {
        if (st.b) goalOverlay(ctx, S, K, st.b, st.hit, { word: 'GOOOL!!' });
        score(1, st.hit && t > GHIT + 10 ? 3 : 2);
        sfx(S, GHIT, 'rede', () => window.SFX?.goal?.(true));
      } else {
        const u = t - 110;
        towerFlares(ctx, K, S, 0.9);
        confetti(ctx, S, t, 50, 1);
        const lit = Math.floor(clamp((u - 26) / 30) * 5);
        const meet = ease(seg(u, 8, 22));
        if (u > 4) {
          cutWrists(ctx, S, seg(u, 4, 14), {
            sym: true,
            a: { open: 1, lit, num: 27, t, glow: GOLD },
            b: { open: 1, lit, num: 27, t, glow: GOLD },
            meet,
            bg: '#111827',
            radial: lit >= 5 ? 'rgba(253,224,71,0.45)' : null,
            burst: u >= 22 ? ease(seg(u, 22, 28)) * (1 - seg(u, 30, 38)) : 0,
            t
          });
        }
        kicker(ctx, 40, bot - 34, 'PROJETO ELO • DOIS EGOS. UM GOL.', seg(u, 50, 80), GOLD);
        score(1, 3);
        sfx(S, 132, 'elo', () => window.SFX?.jingle?.([523, 659, 784, 1047], 0, 'square'));
        CE.cineFlash(ctx, W, H, seg(t, 192, 210), '#000000');
      }
      fadeIn(ctx, S);
    }
  });
})();
