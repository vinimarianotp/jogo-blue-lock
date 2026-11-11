// ============================================================================
// CUTSCENES EM 3D — a viagem para a Espanha, o clássico, o discurso e a promessa
// ego_ticket • spain_flight • clasico_bunny • captain_speech • loki_hugo_promise
// Refeitas no padrão do gol da Sub-20 (js/cine3d_u20.js, ver docs/DIRECAO_DE_ARTE.md):
// câmera sempre andando (grua, travelling, push-in), câmera lenta com rampa nos momentos
// certos, closes como quadros de mangá em pixel art (CA.panel com pixel: 6), no máximo um
// quadro de impacto por cena, pouco texto (legenda, letreiro pequeno de lugar e uma
// onomatopeia no golpe). Texturas desenhadas pequenas (viram pixel no 3D).
// Lugares: a sala dos monitores do Ego (área vazia K.VOID, é também onde o js/cine3d.js
// filma as conversas com bg 'monitor_room': CE.c3EgoRoom), o aeroporto, o avião e
// Barcelona (área vazia), o campo do prédio (o clássico e a final) e o vestiário.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;

  // ---------------------------------------------------------------- contas
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
  const mixP = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const kick = (t, at, len = 10) => (t < at ? 0 : Math.max(0, 1 - (t - at) / len));
  const rnd = (i, s = 1) => {
    const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  // tempo da ação com câmera lenta: keys = [[tempo real, tempo da ação], ...] (rampa nos dois lados)
  const remap = (t, keys) => {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    }
    return keys[keys.length - 1][1] + (t - keys[keys.length - 1][0]);
  };
  // câmera tremendo com ruído suave (nunca aleatório por quadro)
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp * 0.6, p[2] + K.noise(f, seed + 7) * amp];
  const VX = 86;
  const VY = 17;
  const PIX = 6; // tamanho do pixel dos quadros de mangá (a escala dos bonecos)
  const CAa = () => CE.ART;
  const reg = (type, def) => CE.registerCine3D(type, Object.assign({ letterbox: 0.12, grain: 0.05, vignette: 0.5 }, def));

  // Canvas pintado uma vez só (pequeno: no 3D a textura é ampliada sem suavizar = pixel)
  const CV = new Map();
  function paint(key, w, h, fn) {
    let cv = CV.get(key);
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      fn(g, w, h);
      CV.set(key, cv);
    }
    return cv;
  }

  // ---------------------------------------------------------------- letrinhas de pixel (3x5)
  // Para letreiros DENTRO das texturas e dos quadros (passagem, painel de voos): pixel de
  // verdade, sem fonte lisa
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
    G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
    S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111',
    4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
    '.': '000000000000010', ',': '000000000010100', '-': '000000111000000', ':': '000010000010000', "'": '010010000000000',
    '>': '100010001010100', '/': '001001010100100', '!': '010010010000010', '?': '110001010000010', '•': '000000010000000', '°': '010101010000000'
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

  // ---------------------------------------------------------------- pós (no overlay)
  // preto e branco com tom azulado; circle.inside: só dentro do círculo / fora: só fora dele
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
  // a cor indo embora devagar de fora para dentro, com a borda macia (r0 = ainda colorido,
  // r1 = já sem cor): o personagem no meio fica com a cor dele
  function bwSoft(ctx, W, H, cx, cy, r0, r1, a = 1) {
    if (a <= 0) return;
    ctx.save();
    const g1 = ctx.createRadialGradient(cx, cy, Math.max(0, r0), cx, cy, Math.max(r0 + 1, r1));
    g1.addColorStop(0, 'rgba(128,128,128,0)');
    g1.addColorStop(1, `rgba(128,128,128,${clamp(a)})`);
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createRadialGradient(cx, cy, Math.max(0, r0), cx, cy, Math.max(r0 + 1, r1));
    g2.addColorStop(0, 'rgba(59,130,246,0)');
    g2.addColorStop(1, `rgba(59,130,246,${0.32 * clamp(a)})`);
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // quadro de impacto (como no anime): preto e branco com as cores invertidas
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
  // reflexo de lente numa luz forte do cenário (refletor, sol): brilho, risco e reflexos
  function flareAt(ctx, S, p, k = 1, tint = '186,230,253') {
    if (!p || k <= 0) return;
    const { W, H } = S;
    if (p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 120) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    CE.cineGlow(ctx, p.x, p.y, 120, 'rgba(255,255,255,0.5)', k);
    CE.cineGlow(ctx, p.x, p.y, 36, 'rgba(255,255,255,0.95)', k);
    const gr = ctx.createLinearGradient(p.x - 420, 0, p.x + 420, 0);
    gr.addColorStop(0, `rgba(${tint},0)`);
    gr.addColorStop(0.5, `rgba(${tint},${0.45 * k})`);
    gr.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(p.x - 420, p.y - 2, 840, 4);
    [[0.45, 24, 'rgba(56,189,248,0.2)'], [0.8, 12, 'rgba(250,204,21,0.18)'], [1.3, 38, 'rgba(99,102,241,0.12)']].forEach(([f, r, col]) => {
      CE.cineGlow(ctx, p.x + (W / 2 - p.x) * f * 2, p.y + (H / 2 - p.y) * f * 2, r, col, k);
    });
    ctx.restore();
  }
  // os refletores do estádio do prédio (as lâmpadas a ~3,3 de altura nas quatro torres)
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
      const R = 260;
      if (d > R) return [x, y];
      const k = Math.cos(((d / R) * Math.PI) / 2) * q;
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
  function confetti(ctx, S, t, n = 60, k = 1) {
    if (k <= 0) return;
    const { W, top, bot } = S;
    ctx.save();
    ctx.globalAlpha = k;
    for (let i = 0; i < n; i++) {
      const x = (rnd(i, 21) * W + Math.sin(t * 0.03 + i) * 30) % W;
      const y = top + ((rnd(i, 22) * (bot - top) + t * (1.2 + rnd(i, 23) * 1.6)) % (bot - top));
      ctx.fillStyle = ['#7f1d1d', '#facc15', '#f8fafc', '#1d4ed8', '#ef4444'][i % 5];
      ctx.fillRect(Math.round(x / 6) * 6, Math.round(y / 6) * 6, 6, 6);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- braço e mão em pixel
  // Antebraço com a manga e a mão (fechada ou segurando algo), desenhado pixel a pixel num
  // canvas pequeno (48 x 22, apontando para a direita) — para os quadros de mangá
  function armPx(skin, sleeve, cuff, kind = 'fist') {
    return paint(['arm', skin, sleeve, cuff, kind].join('|'), 48, 22, (g) => {
      const cy = 11;
      const dk = CE.ART ? CE.ART.shade(skin, -0.45) : '#3b2416';
      const sh = CE.ART ? CE.ART.shade(skin, -0.18) : skin;
      const lt = CE.ART ? CE.ART.shade(skin, 0.22) : skin;
      // manga (com o punho da camisa)
      for (let x = 0; x < 18; x++) {
        for (let y = cy - 7; y <= cy + 7; y++) {
          const e = y === cy - 7 || y === cy + 7;
          g.fillStyle = e ? '#05070d' : x >= 15 ? cuff : y < cy - 3 ? (CE.ART ? CE.ART.shade(sleeve, 0.2) : sleeve) : y > cy + 4 ? (CE.ART ? CE.ART.shade(sleeve, -0.35) : sleeve) : sleeve;
          g.fillRect(x, y, 1, 1);
        }
      }
      // antebraço afinando
      for (let x = 18; x < 33; x++) {
        const half = Math.round(lerp(5.5, 4.5, (x - 18) / 15));
        for (let y = cy - half; y <= cy + half; y++) {
          const e = y === cy - half || y === cy + half;
          g.fillStyle = e ? dk : y < cy - half + 2 ? lt : y > cy + half - 2 ? sh : skin;
          g.fillRect(x, y, 1, 1);
        }
      }
      if (kind === 'fist') {
        // punho fechado (maior que o pulso): quatro dedos dobrados na frente e o polegar
        // atravessando por cima
        const inFist = (x, y) => {
          const dx = Math.max(0, Math.abs(x + 0.5 - 38) - 5);
          const dy = Math.max(0, Math.abs(y + 0.5 - cy) - 4.5);
          return dx * dx + dy * dy <= 9;
        };
        for (let x = 30; x < 47; x++) {
          for (let y = cy - 9; y <= cy + 9; y++) {
            if (!inFist(x, y)) continue;
            const edge = !inFist(x - 1, y) || !inFist(x + 1, y) || !inFist(x, y - 1) || !inFist(x, y + 1);
            const fold = x > 39 && (y - cy + 9) % 4 === 0;
            g.fillStyle = edge || fold ? dk : x > 42 ? lt : x < 33 ? sh : skin;
            g.fillRect(x, y, 1, 1);
          }
        }
        // o polegar (por cima dos dedos) e o nó de cada dedo mais claro
        g.fillStyle = sh;
        g.fillRect(33, cy - 3, 7, 3);
        g.fillStyle = dk;
        g.fillRect(33, cy, 7, 1);
        g.fillRect(40, cy - 3, 1, 3);
        g.fillStyle = CE.ART ? CE.ART.shade(skin, 0.4) : '#fff';
        for (let i = 0; i < 4; i++) g.fillRect(44, cy - 7 + i * 4, 1, 2);
      } else {
        // mão aberta segurando (polegar por cima, quatro dedos por baixo)
        for (let x = 32; x < 40; x++) {
          for (let y = cy - 5; y <= cy + 5; y++) {
            const e = y === cy - 5 || y === cy + 5 || x === 39;
            g.fillStyle = e ? dk : y < cy - 2 ? lt : skin;
            g.fillRect(x, y, 1, 1);
          }
        }
        for (let f = 0; f < 4; f++) {
          const y = cy - 3 + f * 2;
          g.fillStyle = dk;
          g.fillRect(39, y, 6 - (f === 3 ? 2 : 0), 2);
          g.fillStyle = f % 2 ? skin : lt;
          g.fillRect(39, y, 5 - (f === 3 ? 2 : 0), 1);
        }
        g.fillStyle = dk;
        g.fillRect(36, cy - 7, 6, 2);
        g.fillStyle = lt;
        g.fillRect(36, cy - 7, 5, 1);
      }
    });
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

  // ---------------------------------------------------------------- peças 3D soltas
  const toward = (x, y, eye) => Math.atan2(eye[2] - y, eye[0] - x);
  const glowCv = () =>
    paint('glow', 64, 64, (g) => {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)');
      r.addColorStop(0.35, 'rgba(255,255,255,0.5)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 64, 64);
    });
  function glowAt(K, x, y, z, s, color, alpha, eye) {
    if (alpha <= 0.01) return;
    K.quad({ x, y, z: z - s / 2, w: s, h: s, ang: toward(x, y, eye), img: glowCv(), color, alpha, em: true });
  }
  const coneCv = () =>
    paint('cone', 32, 64, (g) => {
      for (let y = 0; y < 64; y++) {
        const half = 3 + (y / 63) * 13;
        g.fillStyle = `rgba(255,255,255,${(0.75 - (y / 63) * 0.6).toFixed(3)})`;
        g.fillRect(Math.round(16 - half), y, Math.round(half * 2), 1);
      }
    });
  const shaftCv = () =>
    paint('shaft', 32, 64, (g) => {
      for (let y = 0; y < 64; y++) {
        const q = 1 - y / 63;
        const half = 4 + (y / 63) * 12;
        g.fillStyle = `rgba(255,255,255,${(0.9 * q).toFixed(3)})`;
        g.fillRect(Math.round(16 - half), 63 - y, Math.round(half * 2), 1);
      }
    });
  const ringCv = () =>
    paint('ring', 64, 64, (g) => {
      g.fillStyle = 'rgba(255,255,255,0.95)';
      for (let a = 0; a < TAU; a += 0.02) g.fillRect(Math.round(32 + Math.cos(a) * 28) - 1, Math.round(32 + Math.sin(a) * 28) - 1, 3, 3);
    });
  // várias caixas iguais numa peça só
  const pq = (v, a, b, c, d, n) => {
    const P = (p, u, w) => v.push(p[0], p[1], p[2], u, w, n[0], n[1], n[2]);
    P(a, 0, 0);
    P(b, 1, 0);
    P(c, 1, 1);
    P(a, 0, 0);
    P(c, 1, 1);
    P(d, 0, 1);
  };
  function boxes(K, list, o) {
    if (!K._push) {
      list.forEach((b) => K.box(Object.assign({}, o, b)));
      return;
    }
    const s = [];
    const tp = [];
    list.forEach(({ x0, y0, x1, y1, z0 = 0, z1 = 1 }) => {
      pq(s, [x1, z1, y0], [x0, z1, y0], [x0, z0, y0], [x1, z0, y0], [0, 0, -1]);
      pq(s, [x0, z1, y1], [x1, z1, y1], [x1, z0, y1], [x0, z0, y1], [0, 0, 1]);
      pq(s, [x0, z1, y0], [x0, z1, y1], [x0, z0, y1], [x0, z0, y0], [-1, 0, 0]);
      pq(s, [x1, z1, y1], [x1, z1, y0], [x1, z0, y0], [x1, z0, y1], [1, 0, 0]);
      pq(tp, [x0, z1, y0], [x1, z1, y0], [x1, z1, y1], [x0, z1, y1], [0, 1, 0]);
    });
    K._push(s, o);
    K._push(tp, Object.assign({}, o, { color: o.top || o.color }));
  }
  // gente genérica (rostos variados, cores de camisa dadas) — sempre a mesma
  const CROWDS = new Map();
  function crowdOf(key, n, shirts, seed) {
    if (CROWDS.has(key)) return CROWDS.get(key);
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = ['#f3d1b8', '#e8b796', '#c98e6a', '#8d5a3b', '#f1c9a5'];
    const cols = ['#1c1917', '#3f2a1d', '#78350f', '#a16207', '#d6b370', '#57534e'];
    const out = [];
    for (let i = 0; i < n; i++) {
      const q = Math.floor(rnd(i, seed) * 9973);
      out.push({ name: key + i, skinColor: skins[q % skins.length], hairColor: cols[(q >> 3) % cols.length], hairSecondary: cols[(q >> 5) % cols.length], eyeColor: '#1e293b', hairStyle: hairs[(q >> 2) % hairs.length], outfit: 'casual', clothesColor: shirts[(q >> 4) % shirts.length], jerseyPrimary: shirts[q % shirts.length], jerseySecondary: '#f8fafc', number: 2 + (q % 30) });
    }
    CROWDS.set(key, out);
    return out;
  }

  // ==========================================================================
  // A SALA DOS MONITORES DO EGO (área vazia) — também o lugar das conversas com ele
  // ==========================================================================
  const EGO_AT = [VX, 14.15];
  const YOU_T = [VX - 0.8, 16.6];
  const DESK = { x0: VX - 1.6, y0: 14.55, x1: VX + 1.6, y1: 15.35, z1: 0.44 };
  // a parede de monitores em pixel (8 x 4 telas): campo com setas, barras, AO VIVO e números
  const monitorWall = () =>
    paint('monitors', 256, 112, (g, w, h) => {
      g.fillStyle = '#01040b';
      g.fillRect(0, 0, w, h);
      const mw = 32;
      const mh = 28;
      for (let r = 0; r < 4; r++) {
        for (let i = 0; i < 8; i++) {
          const x = i * mw;
          const y = r * mh;
          const kind = [0, 1, 3, 1, 0, 3, 2][(i * 3 + r * 5) % 7];
          g.fillStyle = '#0a1a2c';
          g.fillRect(x + 1, y + 1, mw - 2, mh - 2);
          g.fillStyle = '#050b18';
          g.fillRect(x + 2, y + 2, mw - 4, mh - 4);
          if (kind === 0) {
            g.fillStyle = '#0b3a26';
            g.fillRect(x + 3, y + 3, mw - 6, mh - 6);
            g.fillStyle = 'rgba(220,252,231,0.55)';
            g.fillRect(x + 5, y + 5, mw - 10, 1);
            g.fillRect(x + 5, y + mh - 6, mw - 10, 1);
            g.fillRect(x + 5, y + 5, 1, mh - 10);
            g.fillRect(x + mw - 6, y + 5, 1, mh - 10);
            g.fillRect(x + mw / 2, y + 5, 1, mh - 10);
            g.fillStyle = '#ef4444';
            for (let d = 0; d < 4; d++) g.fillRect(x + 7 + ((d * 5 + i * 3) % (mw - 14)), y + 7 + d * 3, 2, 2);
            g.fillStyle = '#00f5d4';
            g.fillRect(x + 9 + ((i * 7) % 12), y + 15, 2, 2);
          } else if (kind === 1) {
            g.fillStyle = '#0b1736';
            g.fillRect(x + 3, y + 3, mw - 6, mh - 6);
            g.fillStyle = '#00b8a0';
            for (let b = 0; b < 4; b++) g.fillRect(x + 5, y + 6 + b * 5, Math.round((mw - 12) * (0.3 + 0.7 * Math.abs(Math.sin(b * 1.7 + i + r)))), 3);
          } else if (kind === 2) {
            g.fillStyle = '#7f1d1d';
            g.fillRect(x + 3, y + 3, (mw - 6) / 2, mh - 6);
            g.fillStyle = '#1e3a8a';
            g.fillRect(x + 3 + (mw - 6) / 2, y + 3, (mw - 6) / 2, mh - 6);
            pxText(g, 'AO VIVO', x + mw / 2, y + 8, 1, '#facc15', 'center');
            pxText(g, 'ESP', x + mw / 2, y + 16, 1, '#f8fafc', 'center');
          } else {
            g.fillStyle = '#0b1736';
            g.fillRect(x + 3, y + 3, mw - 6, mh - 6);
            pxText(g, '#' + ((i * 7 + r * 13) % 300), x + 5, y + 6, 1, '#93c5fd');
            g.fillStyle = '#1e3a8a';
            g.fillRect(x + 5, y + 14, mw - 10, 8);
            g.fillStyle = '#38bdf8';
            g.fillRect(x + 5, y + 14, Math.round((mw - 10) * rnd(i + r * 8, 4)), 8);
          }
        }
      }
    });
  // a rota Tóquio → Barcelona na parede inteira (o fim da cena da passagem)
  const ROUTE = { cv: null, key: '' };
  function routeWall(t) {
    if (!ROUTE.cv) {
      ROUTE.cv = document.createElement('canvas');
      ROUTE.cv.width = 128;
      ROUTE.cv.height = 56;
    }
    const q = clamp(t / 90);
    const key = String(Math.floor(q * 40)) + (Math.floor(t / 10) % 2);
    if (key === ROUTE.key) return { cv: ROUTE.cv, dirty: false };
    ROUTE.key = key;
    const g = ROUTE.cv.getContext('2d');
    g.fillStyle = '#020a14';
    g.fillRect(0, 0, 128, 56);
    // continentes (manchas de pixel)
    g.fillStyle = '#0f3b46';
    [[8, 14, 22, 12], [14, 26, 12, 16], [40, 12, 40, 14], [56, 26, 18, 14], [86, 10, 26, 18], [100, 30, 10, 8]].forEach(([x, y, w, h]) => {
      for (let yy = 0; yy < h; yy++) {
        const k = 1 - Math.abs(yy / h - 0.5) * 1.4;
        const ww = Math.round(w * Math.max(0.3, k));
        g.fillRect(x + Math.round((w - ww) / 2), y + yy, ww, 1);
      }
    });
    g.fillStyle = 'rgba(0,245,212,0.18)';
    for (let x = 0; x < 128; x += 8) g.fillRect(x, 0, 1, 56);
    for (let y = 0; y < 56; y += 8) g.fillRect(0, y, 128, 1);
    // o caminho pontilhado e o aviãozinho andando
    const A = [112, 22];
    const B = [22, 20];
    const at = (s) => [lerp(A[0], B[0], s), lerp(A[1], B[1], s) - Math.sin(s * Math.PI) * 14];
    for (let i = 0; i <= 40; i++) {
      const s = i / 40;
      const [x, y] = at(s);
      g.fillStyle = s <= q ? '#00f5d4' : i % 2 ? 'rgba(165,243,252,0.4)' : 'rgba(0,0,0,0)';
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    const [px, py] = at(q);
    g.fillStyle = '#f8fafc';
    g.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3);
    [A, B].forEach(([x, y], i) => {
      g.fillStyle = i ? '#facc15' : '#ef4444';
      g.fillRect(x - 1, y - 1, 3, 3);
    });
    pxText(g, 'TOQUIO', A[0], A[1] + 4, 1, '#94a3b8', 'center');
    pxText(g, 'BARCELONA', B[0] + 6, B[1] + 4, 1, '#facc15', 'center');
    if (Math.floor(t / 10) % 2) pxText(g, 'BL-011', 64, 46, 1, '#00f5d4', 'center');
    return { cv: ROUTE.cv, dirty: true };
  }
  // A sala: parede de monitores ao norte, paredes escuras dos lados, a mesa com a borda acesa.
  // o (opcional) = { wall, wallDirty, wall2, wall2Dirty, wall2a, wallLight, ambient, glow }:
  // a cena troca o que passa nos monitores; a conversa chama só com (K, t, eye)
  function monitorRoom(K, t, eye, o = {}) {
    K.sky('#01030a', '#040a18', 0);
    K.fog('#01040b', 0.05);
    K.ambient(o.ambient || '#7c97b8');
    K.floor({ x0: VX - 4.5, y0: 12.9, x1: VX + 4.5, y1: 20, color: '#070c16' });
    const wl = o.wallLight || [1, 1, 1];
    K.quad({ x: VX, y: 13.0, z: 0, w: 8.6, h: 3.75, ang: -Math.PI / 2, img: o.wall || monitorWall(), dirty: o.wallDirty, color: '#c7d2e0', em: true, light: wl });
    if (o.wall2 && o.wall2a > 0) K.quad({ x: VX, y: 13.02, z: 0, w: 8.6, h: 3.75, ang: -Math.PI / 2, img: o.wall2, dirty: o.wall2Dirty, color: '#d6f5f0', alpha: Math.min(1, o.wall2a), em: true });
    // faixa de varredura descendo pelos monitores
    K.quad({ x: VX, y: 13.03, z: 3.55 - ((t * 0.012) % 3.5), w: 8.6, h: 0.16, ang: Math.PI / 2, color: '#00f5d4', alpha: 0.1, em: true });
    K.quad({ x: VX - 4.3, y: 16.4, z: 0, w: 7, h: 3.75, ang: 0, color: '#04070e' });
    K.quad({ x: VX + 4.3, y: 16.4, z: 0, w: 7, h: 3.75, ang: Math.PI, color: '#04070e' });
    // a mesa (borda acesa pelo reflexo dos monitores)
    K.box({ x0: DESK.x0, y0: DESK.y0, x1: DESK.x1, y1: DESK.y1, z0: 0, z1: DESK.z1, color: '#0b1324', top: '#121c30' });
    K.box({ x0: DESK.x0, y0: DESK.y1 - 0.02, x1: DESK.x1, y1: DESK.y1 + 0.01, z0: DESK.z1 - 0.025, z1: DESK.z1 + 0.003, color: '#00f5d4', alpha: 0.85, em: true });
    // brilho ciano dos monitores atrás do Ego
    glowAt(K, VX, 13.2, 1.1, 3.4, '#00f5d4', o.glow ?? 0.22, eye);
  }
  // A sala do Ego é também o lugar das conversas com ele (fala com bg 'monitor_room'): o
  // diretor das conversas em 3D (js/cine3d.js) filma a conversa aqui, com o Ego atrás da
  // mesa, e as cenas que acontecem nessa conversa (a passagem; no modo Dupla, o Elo e as
  // máscaras) usam a mesma sala. build(K, t, eye[, o]): o 4º parâmetro é só das cenas
  CE.c3EgoRoom = { VX, EGO_AT, YOU_T, DESK, build: (K, t, eye, o) => monitorRoom(K, t, eye, o), pxText, wallOf: monitorWall };

  // ---------------------------------------------------------------- a passagem (pixel)
  const envelopePx = () =>
    paint('envPx', 40, 24, (g, w, h) => {
      g.fillStyle = '#00f5d4';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#070b14';
      g.fillRect(1, 1, w - 2, h - 2);
      g.fillStyle = '#0f3b46';
      for (let i = 0; i < 18; i++) {
        g.fillRect(1 + i, h - 2 - Math.floor(i * 0.55), 1, 1);
        g.fillRect(w - 2 - i, h - 2 - Math.floor(i * 0.55), 1, 1);
      }
      pxText(g, 'BLUE LOCK', w / 2, h - 8, 1, '#00f5d4', 'center');
    });
  const flapPx = (inside) =>
    paint('flapPx' + (inside ? 1 : 0), 40, 12, (g, w, h) => {
      for (let r = 0; r < h; r++) {
        const k = inside ? (r + 1) / h : 1 - r / h;
        const ww = Math.max(2, Math.round(w * k));
        g.fillStyle = '#00f5d4';
        g.fillRect(Math.round((w - ww) / 2), r, ww, 1);
        g.fillStyle = inside ? '#101a30' : '#070b14';
        if (ww > 2) g.fillRect(Math.round((w - ww) / 2) + 1, r, ww - 2, 1);
      }
    });
  const lockPx = (half) =>
    paint('lockPx' + half, 10, 12, (g) => {
      g.fillStyle = '#00f5d4';
      const L = (x, y, w, h) => {
        if (half < 0 && x >= 5) return;
        if (half > 0 && x + w <= 5) return;
        g.fillRect(x, y, w, h);
      };
      L(2, 0, 6, 1);
      L(1, 1, 2, 4);
      L(7, 1, 2, 4);
      L(0, 5, 10, 7);
      g.fillStyle = '#020617';
      if (!half) g.fillRect(4, 7, 2, 3);
    });
  // o cartão de embarque em pixel (72 x 28): HND > BCN, o seu nome, o voo
  const passPx = () => {
    const name = plain(CE.cinePlayerName ? CE.cinePlayerName() : 'VOCE').slice(0, 12);
    return paint('passPx|' + name, 72, 28, (g, w, h) => {
      g.fillStyle = '#f8fafc';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#0891b2';
      g.fillRect(0, 0, w, 6);
      pxText(g, 'BLUE LOCK AIR', 2, 1, 1, '#f8fafc');
      pxText(g, 'HND', 3, 9, 2, '#0f172a');
      g.fillStyle = '#0891b2';
      g.fillRect(28, 13, 7, 1);
      g.fillRect(33, 12, 1, 3);
      g.fillRect(34, 13, 1, 1);
      pxText(g, 'BCN', 37, 9, 2, '#0f172a');
      pxText(g, name, 3, 21, 1, '#334155');
      g.fillStyle = '#cbd5e1';
      g.fillRect(57, 6, 1, h - 6);
      g.fillStyle = '#0f172a';
      for (let i = 0; i < 6; i++) g.fillRect(60 + i * 2, 9, 1 + (i % 2), 16);
    });
  };
  const ticketPx = () =>
    paint('ticketPx', 64, 20, (g, w, h) => {
      for (let x = 0; x < w; x++) {
        g.fillStyle = x < w / 2 ? '#7f1d1d' : '#1e40af';
        g.fillRect(x, 0, 1, h);
      }
      g.fillStyle = '#facc15';
      g.fillRect(1, 1, w - 2, 1);
      g.fillRect(1, h - 2, w - 2, 1);
      g.fillRect(1, 1, 1, h - 2);
      g.fillRect(w - 2, 1, 1, h - 2);
      pxText(g, 'EL CLASICO', w / 2, 4, 1, '#facc15', 'center');
      pxText(g, 'BARCHA X RE AL', w / 2, 11, 1, '#f8fafc', 'center');
    });
  // A mão do Ego na mesa (caixas): o punho branco da camisa, a manga do terno e os dedos
  function egoHand(K, x, y, z) {
    K.box({ x0: x - 0.06, y0: 14.3, x1: x + 0.06, y1: y - 0.12, z0: z + 0.02, z1: z + 0.1, color: '#0b0f1a' });
    K.box({ x0: x - 0.062, y0: y - 0.135, x1: x + 0.062, y1: y - 0.11, z0: z + 0.02, z1: z + 0.1, color: '#e5e7eb' });
    K.box({ x0: x - 0.05, y0: y - 0.11, x1: x + 0.05, y1: y - 0.02, z0: z + 0.01, z1: z + 0.05, color: '#f1dfcd' });
    K.box({ x0: x - 0.035, y0: y - 0.02, x1: x - 0.008, y1: y + 0.07, z0: z + 0.008, z1: z + 0.025, color: '#f1dfcd' });
    K.box({ x0: x + 0.006, y0: y - 0.02, x1: x + 0.033, y1: y + 0.06, z0: z + 0.008, z1: z + 0.025, color: '#f1dfcd' });
  }
  // o envelope na mesa (fechado, abrindo ou aberto); fold 1 = aba fechada, -1 = aberta
  function envelope3D(K, ex, ey, fold = 1, brk = 0) {
    const z = DESK.z1;
    K.floor({ x0: ex - 0.25, y0: ey - 0.15, x1: ex + 0.25, y1: ey + 0.15, z: z + 0.004, img: envelopePx() });
    const L = 0.16;
    if (fold > 0.02) K.floor({ x0: ex - 0.25, y0: ey - 0.15, x1: ex + 0.25, y1: ey - 0.15 + L * fold, z: z + 0.007, img: flapPx(false) });
    else if (fold < -0.02) K.floor({ x0: ex - 0.25, y0: ey - 0.15 + L * fold, x1: ex + 0.25, y1: ey - 0.15, z: z + 0.007, img: flapPx(true) });
    const ly = ey - 0.15 + L * Math.max(0, fold) - 0.05;
    if (brk <= 0) K.floor({ x0: ex - 0.045, y0: ly - 0.05, x1: ex + 0.045, y1: ly + 0.05, z: z + 0.01, img: lockPx(0) });
    else if (brk < 1) {
      [-1, 1].forEach((s) => {
        const dx = s * brk * 0.14;
        K.floor({ x0: ex - 0.045 + dx, y0: ly - 0.05 + brk * brk * 0.12, x1: ex + 0.045 + dx, y1: ly + 0.05 + brk * brk * 0.12, z: z + 0.01, img: lockPx(s), alpha: 1 - brk });
      });
    }
  }
  // quadro de mangá: a mão do Ego empurrando o envelope pela mesa
  function cutEnvelope(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    CA.panel(
      ctx,
      [[W * 0.52, bot - 250], [W - 30, bot - 250], [W - 30, bot - 26], [W * 0.52, bot - 26]],
      (b, g) => {
        g.fillStyle = '#0b1324';
        g.fillRect(b.x, b.y, b.w, b.h);
        // a borda acesa da mesa e o reflexo dos monitores
        g.fillStyle = '#00f5d4';
        g.fillRect(b.x, b.y + b.h * 0.82, b.w, 8);
        g.fillStyle = 'rgba(0,245,212,0.12)';
        g.fillRect(b.x, b.y, b.w, b.h * 0.3);
        CA.speedLines(g, 0, S.W, S.H, { color: 'rgba(0,245,212,0.25)', n: 18, t: q * 60, speed: 18, thick: 4 });
        const e = easeIO(q);
        const ex = b.x + b.w * lerp(0.28, 0.62, e) + b.ox;
        const ey = b.y + b.h * 0.5;
        blit(g, envelopePx(), ex, ey, -0.08, false, 1.1);
        blit(g, armPx('#f1dfcd', '#0b0f1a', '#e5e7eb', 'hand'), ex - 40 * PIX * 0.5 - 70, ey + 4, 0.05, false, 1);
      },
      { k: kIn, from: [0, 220], pixel: PIX }
    );
  }
  // quadro de mangá: a passagem saindo do envelope, na luz ciano (e o ingresso no quadro menor)
  function cutPass(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    CA.panel(
      ctx,
      [[34, top + 26], [W * 0.62, top + 26], [W * 0.62, bot - 30], [34, bot - 30]],
      (b, g) => {
        g.fillStyle = '#04121c';
        g.fillRect(b.x, b.y, b.w, b.h);
        const cx = b.x + b.w * 0.5 + b.ox;
        const cy = b.y + b.h * 0.46;
        CA.speedRadial(g, cx, cy + b.h * 0.25, S.W, S.H, { color: 'rgba(0,245,212,0.45)', inner: b.h * 0.2, n: 46, thick: 1.4 });
        // o envelope aberto embaixo e a passagem subindo de dentro dele
        blit(g, envelopePx(), cx, b.y + b.h * 0.9, 0, false, 1.6);
        const up = ease(q * 1.4);
        blit(g, passPx(), cx, lerp(b.y + b.h * 0.86, cy, up), lerp(0.06, -0.05, up), false, 1);
        blit(g, armPx('#f1dfcd', '#0b0f1a', '#e5e7eb', 'hand'), cx + 72 * PIX * 0.5 + 96, lerp(b.y + b.h * 0.86, cy, up) + 36, -0.05, true, 1);
      },
      { k: kIn, from: [-260, 0], pixel: PIX }
    );
  }
  function cutTicket(ctx, S, kIn) {
    const CA = CAa();
    if (!CA) return;
    const { W, top } = S;
    CA.panel(
      ctx,
      [[W * 0.64, top + 40], [W - 34, top + 26], [W - 40, top + 250], [W * 0.66, top + 262]],
      (b, g) => {
        g.fillStyle = '#1a0a14';
        g.fillRect(b.x, b.y, b.w, b.h);
        CA.speedLines(g, -0.2, S.W, S.H, { color: 'rgba(250,204,21,0.25)', n: 16, t: 0, thick: 5 });
        blit(g, ticketPx(), b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.5, -0.12, false, 1);
      },
      { k: kIn, from: [300, 0], pixel: PIX }
    );
  }

  // ==========================================================================
  // 1) A PASSAGEM — na sala dos monitores (onde a conversa com o Ego acontece)
  // ==========================================================================
  const EGO_L = [0.62, 0.8, 0.9]; // o Ego contra a luz dos monitores
  const ET_KEYS = [[0, 0], [34, 34], [104, 50], [210, 156]]; // a câmera lenta no lacre
  reg('ego_ticket', {
    phases: [170, 150, 210, 150],
    music: 'mystery',
    title: '✈ INTERLÚDIO • A PASSAGEM',
    tags: ['PLANO 1 • A SALA DOS MONITORES', 'PLANO 2 • O ENVELOPE PRETO', 'PLANO 3 • O QUE TEM DENTRO', 'PLANO 4 • RUMO À ESPANHA'],
    subs: [
      [{ from: 40, who: 'JINPACHI EGO', text: '"Vá ver com seus olhos."', color: '#22d3ee' }],
      [{ from: 20, text: 'Um envelope preto, lacrado.' }],
      [{ from: 118, who: 'JINPACHI EGO', text: '"Os monstros não esperam ninguém."', color: '#22d3ee' }],
      [{ from: 14, who: 'JINPACHI EGO', text: '"Vá. Volte com fome."', color: '#22d3ee' }]
    ],
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase, f } = S;
      K.expo(0.92);
      const st = (K.st = {});
      if (phase === 0) {
        // A GRUA: do canto alto da sala até a mesa — o Ego contra os monitores, você na frente
        const k = easeIO(seg(t, 0, 170));
        const eye = mixP([VX + 0.5, 2.6, 19.7], [VX + 1.6, 1.0, 18.3], k);
        K.cam(eye, mixP([VX, 0.9, 14.0], [VX - 0.3, 0.66, 15.0], k), lerp(50, 42, k));
        monitorRoom(K, t, eye);
        K.actor('EGO', { x: EGO_AT[0], y: EGO_AT[1], ang: Math.PI / 2, k: 0.95, light: EGO_L });
        K.actor('you', { x: YOU_T[0], y: YOU_T[1], face: EGO_AT, light: [0.5, 0.62, 0.76] });
        st.ego = [EGO_AT[0], 0.75, EGO_AT[1]];
      } else if (phase === 1) {
        // O ENVELOPE: de lado, na altura da mesa, andando junto com o envelope
        const k = easeIO(seg(t, 0, 150));
        const slide = easeIO(seg(t, 18, 96));
        const ey = lerp(14.78, 15.16, slide);
        const ex = VX + 0.12;
        const eye = shake(K, [VX + 2.45, 1.15, lerp(14.55, 15.35, k)], f, 0.004);
        K.cam(eye, [VX + 0.05, lerp(0.6, 0.52, k), lerp(14.85, 15.3, k)], lerp(42, 36, k));
        monitorRoom(K, t, eye);
        K.actor('EGO', { x: EGO_AT[0], y: EGO_AT[1], ang: Math.PI / 2, k: 0.95, light: EGO_L });
        K.actor('you', { x: YOU_T[0], y: YOU_T[1], face: EGO_AT, light: [0.5, 0.62, 0.76] });
        envelope3D(K, ex, ey);
        // a mão solta o envelope e volta
        const hy = ey - 0.06 - ease(seg(t, 104, 134)) * 0.36;
        if (hy > 14.34) egoHand(K, ex, hy, DESK.z1);
      } else if (phase === 2) {
        // O QUE TEM DENTRO: de cima (48°), o lacre quebra em câmera lenta e a luz sai
        const A = remap(t, ET_KEYS);
        const ex = VX + 0.12;
        const ey = 15.16;
        const k = easeIO(seg(t, 0, 210));
        const eye = [ex + lerp(-0.35, 0.3, k), lerp(1.66, 1.4, k), lerp(16.2, 15.95, k)];
        K.cam(eye, [ex, DESK.z1, ey - 0.08], lerp(44, 36, k));
        monitorRoom(K, t, eye, { glow: 0.22 + 0.2 * seg(A, 40, 70) });
        K.actor('EGO', { x: EGO_AT[0], y: EGO_AT[1], ang: Math.PI / 2, k: 0.95, light: mixP(EGO_L, [0.6, 1.0, 1.0], seg(A, 40, 70)) });
        const brk = seg(A, 36, 60);
        const fold = 1 - 2 * easeIO(seg(A, 44, 74));
        envelope3D(K, ex, ey, fold, brk);
        const open = seg(A, 50, 80);
        if (open > 0) {
          K.floor({ x0: ex - 0.23, y0: ey - 0.13, x1: ex + 0.23, y1: ey + 0.13, z: DESK.z1 + 0.009, color: '#00f5d4', alpha: 0.3 * open, em: true });
          K.quad({ x: ex, y: ey, z: DESK.z1 - 0.02, w: 0.9, h: 1.0, ang: toward(ex, ey, eye), img: shaftCv(), color: '#5eead4', alpha: 0.4 * open, em: true });
        }
        // a passagem subindo de dentro do envelope
        const up = ease(seg(A, 74, 120));
        if (up > 0) K.quad({ x: ex, y: ey + 0.02, z: lerp(DESK.z1 - 0.2, DESK.z1 + 0.06, up), w: 0.5, h: 0.2, ang: toward(ex, ey, eye) + Math.PI, img: passPx(), light: [1.15, 1.2, 1.22] });
        st.seal = [ex, DESK.z1 + 0.02, ey - 0.06];
        st.A = A;
      } else {
        // RUMO À ESPANHA: o Ego manda ir; você vira e vem andando para a câmera com a
        // passagem, contra a luz da rota que acende nos monitores
        const k = easeIO(seg(t, 0, 150));
        const turn = t > 46;
        const walk = ease(seg(t, 58, 150));
        const yp = [YOU_T[0] + walk * 0.25, YOU_T[1] + walk * 0.9];
        const eye = [lerp(VX - 2.3, VX - 1.6, k), lerp(1.2, 0.95, k), lerp(19.4, 19.75, k)];
        K.cam(eye, [lerp(VX - 0.5, yp[0] + 0.1, k), lerp(0.75, 0.6, k), lerp(15.1, yp[1] - 0.6, k)], lerp(46, 42, k));
        const rw = routeWall(Math.max(0, t - 10));
        monitorRoom(K, t, eye, { wall2: rw.cv, wall2Dirty: rw.dirty, wall2a: ease(seg(t, 8, 40)), glow: 0.3 });
        K.actor('EGO', { x: EGO_AT[0], y: EGO_AT[1], ang: Math.PI / 2, k: 0.95, light: [0.32, 0.5, 0.55] });
        K.actor('you', { x: yp[0], y: yp[1], ang: turn ? Math.PI / 2 : -Math.PI / 2, anim: walk > 0 && walk < 0.98 ? 'run' : 'idle', frame: walk > 0 ? Math.floor(S.f * 0.32) : undefined, light: [0.62, 0.86, 0.95] });
        // a passagem na mão (na altura da cintura, do lado de fora)
        const px = yp[0] + 0.2;
        const py = yp[1] + (turn ? 0.06 : -0.06);
        K.quad({ x: px, y: py, z: 0.3, w: 0.26, h: 0.1, ang: toward(px, py, eye) + Math.PI - 0.3, img: passPx(), light: [0.7, 0.85, 0.9] });
        st.you = [yp[0], 0.5, yp[1]];
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = K.st || {};
      const scr = (p) => (p ? K.screen(p[0], p[1], p[2]) : null);
      if (phase === 0) {
        const e = scr(st.ego);
        if (e) CE.cineGlow(ctx, e.x, e.y - 30, 170, 'rgba(34,211,238,0.16)', 1);
        CE.cineDust(ctx, W, H, t, 26, 'rgba(165,243,252,0.4)', 5);
        CE.luckKicker(ctx, 40, top + 30, 'BLUE LOCK • SALA DOS MONITORES', seg(t, 14, 50), '#22d3ee');
      } else if (phase === 1) {
        CE.cineDust(ctx, W, H, t, 18, 'rgba(165,243,252,0.35)', 6);
        if (t > 62 && t < 146) cutEnvelope(ctx, S, seg(t, 62, 72), seg(t, 62, 140));
        CE.cineSfx(S, 20, 'slide', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        const A = st.A || 0;
        const p = scr(st.seal);
        // a câmera lenta no lacre: escurece em volta, o lacre brilha e a luz sobe
        const slow = seg(t, 30, 44) * (1 - seg(t, 96, 112));
        if (slow > 0) {
          ctx.save();
          ctx.globalAlpha = 0.3 * slow;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
        }
        if (p && A > 34 && A < 70) CE.cineGlow(ctx, p.x, p.y, 120, 'rgba(94,234,212,0.7)', 1 - seg(A, 50, 70));
        if (p && A > 36 && A < 44) CE.drawRadialSpeedLines(ctx, p.x, p.y, W, '#ccfbf1', 0.3 * (1 - seg(A, 36, 44)));
        if (t > 120) cutPass(ctx, S, seg(t, 120, 130), seg(t, 120, 200));
        if (t > 160) cutTicket(ctx, S, seg(t, 160, 168));
        CE.cineSfx(S, 40, 'seal', () => window.SFX?.page?.());
        CE.cineSfx(S, 160, 'ticket', () => window.SFX?.whoosh?.());
      } else {
        const y = scr(st.you);
        if (y) CE.cineGlow(ctx, y.x, y.y, 120, 'rgba(0,245,212,0.14)', 1);
        CE.cineDust(ctx, W, H, t, 22, 'rgba(165,243,252,0.4)', 9);
        CE.luckKicker(ctx, 40, bot - 40, 'INTERLÚDIO • RUMO À ESPANHA', seg(t, 70, 110), '#00f5d4');
        CE.cineFlash(ctx, W, H, seg(t, 126, 150), '#000000');
      }
    }
  });

  // ==========================================================================
  // 2) A VIAGEM — Haneda, a decolagem, a janelinha e Barcelona (área vazia)
  // ==========================================================================
  // o avião de lado em pixel (para o pátio de Haneda)
  const planePx = () =>
    paint('planePx', 112, 40, (g) => {
      const body = '#e2e8f0';
      const sh = '#94a3b8';
      // fuselagem com o bico arredondado e a cauda
      for (let x = 8; x < 104; x++) {
        const nose = x > 92 ? Math.round(Math.sqrt(Math.max(0, 1 - ((x - 92) / 12) ** 2)) * 6) : 6;
        for (let y = 22 - nose; y <= 22 + nose; y++) {
          g.fillStyle = y === 22 - nose || y === 22 + nose ? '#475569' : y > 24 ? sh : body;
          g.fillRect(x, y, 1, 1);
        }
      }
      g.fillStyle = '#0891b2';
      g.fillRect(10, 22, 84, 2);
      for (let x = 2; x < 22; x++) {
        const hh = Math.round((22 - x) * 0.9);
        g.fillStyle = x < 6 ? '#0e7490' : '#0891b2';
        g.fillRect(x, 16 - hh, 1, hh + 1);
      }
      g.fillStyle = '#0f172a';
      for (let x = 26; x < 88; x += 4) g.fillRect(x, 19, 2, 2);
      g.fillRect(94, 18, 4, 2);
      // asa e motor
      g.fillStyle = sh;
      for (let i = 0; i < 18; i++) g.fillRect(44 + i, 27 + Math.floor(i * 0.4), 12, 1);
      g.fillStyle = '#64748b';
      g.fillRect(52, 31, 12, 5);
      g.fillStyle = '#1f2937';
      g.fillRect(48, 34, 2, 6);
      g.fillRect(86, 34, 2, 6);
    });
  const dawnCityPx = () =>
    paint('dawnCityPx', 256, 50, (g, w, h) => {
      for (let x = 0; x < w; ) {
        const bw = 5 + Math.floor(rnd(x, 3) * 12);
        const bh = 8 + Math.floor(rnd(x, 4) * 26);
        g.fillStyle = '#231a52';
        g.fillRect(x, h - 8 - bh, bw - 1, bh + 8);
        g.fillStyle = 'rgba(253,224,71,0.55)';
        for (let yy = h - 8 - bh + 2; yy < h - 9; yy += 3) for (let xx = x + 1; xx < x + bw - 2; xx += 2) if (rnd(xx * 7 + yy, 5) > 0.7) g.fillRect(xx, yy, 1, 1);
        x += bw;
      }
      g.fillStyle = '#1c1838';
      g.fillRect(0, h - 8, w, 8);
    });
  const BOARD = { cv: null, last: '' };
  function boardCv(t) {
    if (!BOARD.cv) {
      BOARD.cv = document.createElement('canvas');
      BOARD.cv.width = 96;
      BOARD.cv.height = 24;
    }
    const dest = 'BARCELONA';
    const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let shown = '';
    for (let i = 0; i < dest.length; i++) shown += t >= 18 + i * 5 ? dest[i] : AB[(Math.floor(t / 2) * 7 + i * 11) % 26];
    const key = shown + (t > 70 ? '1' : '0');
    if (key === BOARD.last) return { cv: BOARD.cv, dirty: false };
    BOARD.last = key;
    const g = BOARD.cv.getContext('2d');
    g.fillStyle = '#020617';
    g.fillRect(0, 0, 96, 24);
    g.fillStyle = '#334155';
    g.fillRect(0, 0, 96, 1);
    g.fillRect(0, 23, 96, 1);
    pxText(g, 'PARTIDAS', 3, 2, 1, '#94a3b8');
    pxText(g, '06:00', 3, 10, 1, '#fbbf24');
    pxText(g, shown, 26, 10, 1, '#fbbf24');
    pxText(g, t > 70 ? 'EMBARQUE' : 'AGUARDE', 3, 17, 1, t > 70 ? '#4ade80' : '#475569');
    return { cv: BOARD.cv, dirty: true };
  }
  // a parede da cabine com a janela oval vazada (o céu de verdade aparece pelo buraco)
  const cabinWallPx = () =>
    paint('cabinWallPx', 40, 30, (g, w, h) => {
      g.fillStyle = '#cbd5e1';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#b6c2d2';
      g.fillRect(0, h - 5, w, 5);
      g.fillStyle = '#94a3b8';
      g.fillRect(0, h - 6, w, 1);
      const cx = 20;
      const cy = 15;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const d = ((x + 0.5 - cx) / 8) ** 2 + ((y + 0.5 - cy) / 10) ** 2;
          const d2 = ((x + 0.5 - cx) / 6) ** 2 + ((y + 0.5 - cy) / 8) ** 2;
          if (d2 < 1) g.clearRect(x, y, 1, 1);
          else if (d < 1) {
            g.fillStyle = d2 < 1.35 ? '#64748b' : '#e2e8f0';
            g.fillRect(x, y, 1, 1);
          }
        }
      }
    });
  const cloudPx = () =>
    paint('cloudPx', 64, 20, (g) => {
      g.fillStyle = '#ffffff';
      [[15, 13, 14, 5], [30, 11, 17, 7], [47, 13, 14, 5], [35, 15, 25, 4]].forEach(([x, y, rx, ry]) => {
        for (let yy = -ry; yy <= ry; yy++) {
          const ww = Math.round(rx * Math.sqrt(1 - (yy / (ry + 0.5)) ** 2));
          g.fillRect(x - ww, y + yy, ww * 2, 1);
        }
      });
    });
  const ROUTE2 = { cv: null, last: -1 };
  function routeScreen(q) {
    if (!ROUTE2.cv) {
      ROUTE2.cv = document.createElement('canvas');
      ROUTE2.cv.width = 44;
      ROUTE2.cv.height = 30;
    }
    const mins = Math.round((1 - q) * 14 * 60);
    const key = Math.floor(mins / 10);
    if (key === ROUTE2.last) return { cv: ROUTE2.cv, dirty: false };
    ROUTE2.last = key;
    const g = ROUTE2.cv.getContext('2d');
    g.fillStyle = '#062033';
    g.fillRect(0, 0, 44, 30);
    const A = [38, 12];
    const B = [6, 11];
    for (let i = 0; i <= 20; i++) {
      const s = i / 20;
      g.fillStyle = s <= q ? '#00f5d4' : 'rgba(165,243,252,0.35)';
      g.fillRect(Math.round(lerp(A[0], B[0], s)), Math.round(lerp(A[1], B[1], s) - Math.sin(s * Math.PI) * 7), 1, 1);
    }
    const px = Math.round(lerp(A[0], B[0], q));
    const py = Math.round(lerp(A[1], B[1], q) - Math.sin(q * Math.PI) * 7);
    g.fillStyle = '#f8fafc';
    g.fillRect(px - 1, py - 1, 3, 3);
    pxText(g, `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`, 22, 21, 1, '#a5f3fc', 'center');
    return { cv: ROUTE2.cv, dirty: true };
  }
  // Barcelona em pixel: fachadas, a cidade no fim da rua e as palmeiras
  const facadePx = (v) =>
    paint('facadePx' + v, 40, 40, (g, w, h) => {
      const walls = ['#e7c9a0', '#d6b38a', '#ecd5b0'];
      const shut = ['#166534', '#1e3a8a', '#9a3412'];
      g.fillStyle = walls[v % 3];
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(120,80,40,0.3)';
      g.fillRect(0, 0, w, 2);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const x = 4 + c * 12;
          const y = 4 + r * 10;
          g.fillStyle = '#3b2a1a';
          g.fillRect(x, y, 6, 6);
          g.fillStyle = shut[(v + c) % 3];
          g.fillRect(x - 2, y, 2, 6);
          g.fillRect(x + 6, y, 2, 6);
          g.fillStyle = '#1f2937';
          g.fillRect(x - 1, y + 6, 8, 1);
        }
      }
      g.fillStyle = '#2a1d12';
      g.fillRect(3, h - 7, w - 6, 7);
      for (let s = 0; s < 8; s++) {
        g.fillStyle = s % 2 ? '#f8fafc' : ['#dc2626', '#1d4ed8', '#16a34a'][v % 3];
        g.fillRect(2 + s * 4.5, h - 10, 5, 3);
      }
    });
  const bcnCityPx = () =>
    paint('bcnCityPx', 256, 75, (g, w, h) => {
      const hy = h - 15;
      g.fillStyle = '#0284c7';
      g.fillRect(0, hy - 8, w * 0.42, 8);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 12; i++) g.fillRect((i * 17) % (w * 0.4), hy - 7 + (i % 3) * 2, 4, 1);
      for (let i = 0; i < 22; i++) {
        const r = rnd(i, 7);
        const bw = 10 + Math.round(r * 9);
        const bh = 7 + Math.round(r * 12);
        const x = i * 12 - 3;
        g.fillStyle = i % 2 ? '#e7c9a0' : '#d6b38a';
        g.fillRect(x, hy - bh, bw, bh + 15);
        g.fillStyle = 'rgba(120,80,40,0.4)';
        for (let wy = hy - bh + 2; wy < hy - 1; wy += 3) for (let wx = x + 2; wx < x + bw - 2; wx += 3) g.fillRect(wx, wy, 1, 2);
      }
      // as torres da basílica
      const sag = w * 0.5;
      [[-11, 42], [-4, 55], [4, 55], [11, 42]].forEach(([dx, th]) => {
        for (let y = 0; y < th; y++) {
          const half = Math.max(1, Math.round(3.5 * (1 - y / th) + 0.6));
          g.fillStyle = y % 4 === 0 ? '#8a6a44' : '#b08a5e';
          g.fillRect(sag + dx - half, hy - y, half * 2, 1);
        }
        g.fillStyle = '#f59e0b';
        g.fillRect(sag + dx - 1, hy - th - 2, 2, 2);
      });
      // o estádio do Barcha
      const stx = Math.round(w * 0.84);
      for (let y = 0; y < 11; y++) {
        const half = Math.round(30 * Math.sqrt(1 - (y / 11) ** 2));
        g.fillStyle = '#7f1d1d';
        g.fillRect(stx - half, hy - y, half * 2, 1);
      }
      g.fillStyle = '#1e40af';
      g.fillRect(stx - 30, hy - 2, 60, 2);
      g.fillStyle = '#c9a77f';
      g.fillRect(0, hy, w, h - hy);
    });
  const palmPx = () =>
    paint('palmPx', 24, 50, (g, w, h) => {
      g.fillStyle = '#5b3b1d';
      for (let y = 10; y < h; y += 2) g.fillRect(11 + Math.round(Math.sin(y * 0.1) * 1), y, 3, 2);
      g.fillStyle = '#14532d';
      for (let f = 0; f < 7; f++) {
        const a = -Math.PI / 2 + (f - 3) * 0.55;
        for (let r = 2; r < 11; r++) g.fillRect(Math.round(12 + Math.cos(a) * r), Math.round(10 + Math.sin(a) * r + (r * r) / 30), 2, 1);
      }
      g.fillStyle = '#166534';
      g.fillRect(10, 8, 4, 3);
    });
  // o avião de verdade (caixas) voando para o sul (+y); p = centro da fuselagem
  function plane3D(K, p, light) {
    const [x, y, z] = p;
    const o = { color: '#f1f5f9', top: '#e2e8f0', light };
    K.box(Object.assign({ x0: x - 0.32, y0: y - 2.4, x1: x + 0.32, y1: y + 2.4, z0: z - 0.32, z1: z + 0.32 }, o));
    K.box(Object.assign({ x0: x - 0.22, y0: y + 2.4, x1: x + 0.22, y1: y + 2.95, z0: z - 0.24, z1: z + 0.18 }, o));
    K.box({ x0: x - 3.1, y0: y - 0.45, x1: x + 3.1, y1: y + 0.5, z0: z - 0.08, z1: z + 0.02, color: '#cbd5e1', light });
    K.box({ x0: x - 1.2, y0: y - 2.4, x1: x + 1.2, y1: y - 1.9, z0: z + 0.04, z1: z + 0.1, color: '#cbd5e1', light });
    K.box({ x0: x - 0.05, y0: y - 2.4, x1: x + 0.05, y1: y - 1.45, z0: z + 0.3, z1: z + 1.35, color: '#00b4d8', light });
    [-1.35, 1.35].forEach((dx) => K.box({ x0: x + dx - 0.16, y0: y - 0.15, x1: x + dx + 0.16, y1: y + 0.75, z0: z - 0.42, z1: z - 0.1, color: '#94a3b8', light }));
    K.floor({ x0: x - 0.32, y0: y - 2.4, x1: x + 0.32, y1: y + 2.95, z: z - 0.33, color: '#64748b', light });
    K.floor({ x0: x - 3.1, y0: y - 0.45, x1: x + 3.1, y1: y + 0.5, z: z - 0.085, color: '#94a3b8', light });
    K.floor({ x0: x - 0.32, y0: y + 0.2, x1: x + 0.32, y1: y + 0.32, z: z - 0.335, color: '#00b4d8', light });
  }
  const hexMix = (a, b, k) => {
    const A = CE.ART ? CE.ART.rgb(a) : [0, 0, 0];
    const B = CE.ART ? CE.ART.rgb(b) : [0, 0, 0];
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  const c01 = (h) => (CE.ART ? CE.ART.rgb(h).map((v) => v / 255) : [1, 1, 1]);
  const FL_KEYS = [[0, 0], [30, 30], [96, 52], [130, 86]]; // a decolagem em câmera lenta
  // quadro de mangá: a janelinha oval, o céu passando da noite ao dia (k), as nuvens e a asa
  function cutWindow(ctx, S, kIn, k, t) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    const sky = (a, b, c) => (k < 0.5 ? hexMix(a, b, k * 2) : hexMix(b, c, (k - 0.5) * 2));
    CA.panel(
      ctx,
      [[W * 0.58, top + 24], [W - 28, top + 24], [W - 28, bot - 28], [W * 0.58, bot - 28]],
      (b, g) => {
        g.fillStyle = '#cbd5e1';
        g.fillRect(b.x, b.y, b.w, b.h);
        const cx = b.x + b.w / 2 + b.ox;
        const cy = b.y + b.h / 2;
        const rx = b.w * 0.27;
        const ry = b.h * 0.4;
        // a moldura da janela e o céu recortado nela
        g.fillStyle = '#e2e8f0';
        g.beginPath();
        g.ellipse(cx, cy, rx * 1.3, ry * 1.22, 0, 0, TAU);
        g.fill();
        g.fillStyle = '#64748b';
        g.beginPath();
        g.ellipse(cx, cy, rx * 1.08, ry * 1.06, 0, 0, TAU);
        g.fill();
        g.save();
        g.beginPath();
        g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
        g.clip();
        const top2 = sky('#020617', '#1e3a8a', '#0369a1');
        const hor = sky('#1e1b4b', '#fb923c', '#bae6fd');
        for (let i = 0; i < 6; i++) {
          g.fillStyle = hexMix(top2, hor, i / 5);
          g.fillRect(cx - rx, cy - ry + (i * ry * 2) / 6, rx * 2, (ry * 2) / 6 + 2);
        }
        if (k < 0.4) {
          g.fillStyle = 'rgba(255,255,255,0.8)';
          for (let i = 0; i < 14; i++) g.fillRect(cx - rx + rnd(i, 4) * rx * 2, cy - ry + rnd(i, 5) * ry * 1.2, 6, 6);
        }
        const sunK = seg(k, 0.3, 0.75);
        if (sunK > 0) {
          g.fillStyle = '#fffbeb';
          g.beginPath();
          g.arc(cx + rx * 0.2, cy + ry * lerp(0.9, -0.2, sunK), rx * 0.22, 0, TAU);
          g.fill();
        }
        // nuvens passando (três camadas)
        g.fillStyle = sky('#334155', '#fed7aa', '#ffffff');
        for (let i = 0; i < 7; i++) {
          const sp = 0.6 + (i % 3) * 0.5;
          const x = cx - rx * 1.6 + ((((rnd(i, 8) * 3.2 - t * 0.004 * sp) % 3.2) + 3.2) % 3.2) * rx;
          const y = cy + ry * (0.15 + (i % 3) * 0.22);
          g.fillRect(x, y, rx * (0.5 + (i % 2) * 0.3), 14 + (i % 3) * 6);
          g.fillRect(x + rx * 0.1, y - 10, rx * 0.3, 12);
        }
        // a ponta da asa com a luz vermelha piscando
        g.fillStyle = '#94a3b8';
        g.beginPath();
        g.moveTo(cx - rx * 1.1, cy + ry * 0.55);
        g.lineTo(cx + rx * 0.1, cy + ry * 0.72);
        g.lineTo(cx - rx * 1.1, cy + ry * 0.95);
        g.fill();
        if (Math.floor(t / 18) % 2) {
          g.fillStyle = '#ef4444';
          g.fillRect(cx + rx * 0.02, cy + ry * 0.66, 12, 12);
        }
        g.restore();
        // a cortininha de plástico erguida
        g.fillStyle = '#e2e8f0';
        g.fillRect(cx - rx * 0.9, cy - ry * 1.02, rx * 1.8, 14);
      },
      { k: kIn, from: [420, 0], pixel: PIX }
    );
  }

  reg('spain_flight', {
    phases: [170, 130, 200, 210],
    music: 'travel',
    title: '✈ INTERLÚDIO • A VIAGEM',
    tags: ['PLANO 1 • HANEDA, 06:00', 'PLANO 2 • DECOLAGEM', 'PLANO 3 • 14 HORAS', 'PLANO 4 • BARCELONA'],
    subs: [
      [{ from: 30, text: 'A primeira vez fora do Japão.' }],
      [],
      [{ from: 20, who: 'VOCÊ', text: '(Do outro lado do mundo, os monstros jogam.)', color: '#00f5d4' }],
      [{ from: 96, who: 'VOCÊ', text: '(Sol, calor... e futebol.)', color: '#00f5d4' }]
    ],
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase, p, f } = S;
      const traveler = CE.spainCast().traveler;
      const st = (K.st = {});
      if (phase === 0) {
        // HANEDA: pelo vidro do terminal, travelling de lado; o avião taxiando lá fora
        K.expo(0.95);
        K.sky('#0b1640', '#f97316', 0.25);
        K.fog('#3a2a52', 0.012);
        K.ambient('#a99cc4');
        const k = easeIO(p);
        const eye = [lerp(VX - 3.0, VX - 1.9, k), lerp(1.15, 0.95, k), lerp(20.3, 19.6, k)];
        K.cam(eye, [lerp(VX - 0.9, VX - 0.2, k), 1.0, 12.0], lerp(50, 44, k));
        K.floor({ x0: 60, y0: -40, x1: 112, y1: 13, color: '#1c1838', light: [0.75, 0.7, 0.85] });
        K.floor({ x0: 60, y0: 6.6, x1: 112, y1: 9.8, z: 0.006, color: '#151226', light: [0.75, 0.7, 0.85] });
        const lights = [];
        [[10.2, 0], [7.6, 1], [3.8, 0], [-2, 0]].forEach(([y, c]) => {
          for (let x = 66; x < 108; x += 1.6) lights.push({ x0: x, y0: y, x1: x + 0.12, y1: y + 0.12, z0: 0, z1: 0.08, c });
        });
        boxes(K, lights.filter((l) => !l.c), { color: '#fbbf24', em: true });
        boxes(K, lights.filter((l) => l.c), { color: '#38bdf8', em: true });
        K.quad({ x: VX + 4, y: -30, z: -0.6, w: 80, h: 15.6, ang: -Math.PI / 2, img: dawnCityPx(), light: [0.85, 0.72, 0.8] });
        glowAt(K, VX + 16, -29, 2.4, 22, '#fdba74', 0.75, eye);
        glowAt(K, VX + 16, -28.8, 2.4, 3.2, '#fff7ed', 1, eye);
        const px = VX - 4.5 + t * 0.014;
        K.quad({ x: px, y: 8.2, z: 0, w: 5.6, h: 2.0, ang: -Math.PI / 2, img: planePx(), light: [1.0, 0.86, 0.84] });
        glowAt(K, px - 2.5, 8.15, 1.62, 0.5, '#f87171', 0.6 + 0.4 * (Math.floor(t / 20) % 2), eye);
        // o terminal: chão, caixilhos do vidro e o painel de partidas
        K.floor({ x0: VX - 10, y0: 13.1, x1: VX + 10, y1: 24, z: 0.004, color: '#0d1022', light: [0.75, 0.72, 0.9] });
        const fr = [];
        for (let i = 0; i < 9; i++) fr.push({ x0: VX - 9 + i * 2.4, y0: 13.0, x1: VX - 9 + i * 2.4 + 0.14, y1: 13.14, z0: 0, z1: 3.4 });
        fr.push({ x0: VX - 10, y0: 13.0, x1: VX + 10, y1: 13.14, z0: 0.3, z1: 0.42 });
        fr.push({ x0: VX - 10, y0: 13.0, x1: VX + 10, y1: 13.14, z0: 2.6, z1: 2.76 });
        boxes(K, fr, { color: '#060914', light: [0.6, 0.6, 0.7] });
        K.quad({ x: VX, y: 13.08, z: 0, w: 20, h: 3.4, ang: Math.PI / 2, color: '#93c5fd', alpha: 0.05, em: true });
        const bd = boardCv(t);
        const bx = VX + 0.9;
        const by = 15.2;
        K.box({ x0: bx - 0.02, y0: by - 0.02, x1: bx + 0.02, y1: by + 0.02, z0: 2.0, z1: 3.4, color: '#111827' });
        K.quad({ x: bx, y: by, z: 1.62, w: 1.5, h: 0.38, ang: toward(bx, by, eye) + Math.PI, img: bd.cv, dirty: bd.dirty, em: true, color: '#d1d5db' });
        K.actor(traveler, { x: VX - 1.25, y: 14.2, ang: -Math.PI / 2, light: [0.42, 0.38, 0.55] });
        st.sun = [VX + 16, 2.4, -28.8];
      } else if (phase === 1) {
        // DECOLAGEM: da cabeceira da pista, o avião passa por cima da câmera (câmera lenta)
        K.expo(1.0);
        K.sky('#1e3a8a', '#fbbf24', 0);
        K.fog('#f59e0b', 0.004);
        const A = remap(t, FL_KEYS);
        const k = seg(A, 0, 86);
        const tr = 0.05 * Math.max(0, 1 - Math.abs(k - 0.36) * 3.2);
        const eye = shake(K, [VX - 0.85, 0.28, 13.0], f, tr, 2);
        K.cam(eye, [VX + 0.4 - k * 0.3, lerp(2.4, 3.6, k), 22.0], lerp(60, 56, k));
        K.floor({ x0: 50, y0: -20, x1: 122, y1: 80, color: '#24302a', light: [0.8, 0.72, 0.62] });
        K.floor({ x0: VX - 1.6, y0: -20, x1: VX + 1.6, y1: 80, z: 0.006, color: '#0b0f1c', light: [0.8, 0.75, 0.7] });
        const marks = [];
        const edge = [];
        for (let y = -20; y < 80; y += 1.7) {
          marks.push({ x0: VX - 0.06, y0: y, x1: VX + 0.06, y1: y + 0.85, z0: 0, z1: 0.012 });
          edge.push({ x0: VX - 1.66, y0: y, x1: VX - 1.54, y1: y + 0.12, z0: 0, z1: 0.07 }, { x0: VX + 1.54, y0: y, x1: VX + 1.66, y1: y + 0.12, z0: 0, z1: 0.07 });
        }
        boxes(K, marks, { color: '#fbbf24', light: [1, 0.95, 0.85] });
        boxes(K, edge, { color: '#fde68a', em: true });
        glowAt(K, VX + 9, 70, 9, 26, '#fde68a', 0.8, eye);
        glowAt(K, VX + 9, 69.8, 9, 4, '#fffbeb', 1, eye);
        if (k > 0 && k < 1) {
          const at = (q) => [VX + 0.3 + q * 1.6, 4 + q * 56, 1.6 + q * 12.4];
          plane3D(K, at(k), [0.95, 0.85, 0.82]);
          for (let i = 1; i <= 10; i++) {
            const q = at(Math.max(0, k - i * 0.012));
            [-1.35, 1.35].forEach((dx) => glowAt(K, q[0] + dx, q[1] - 0.3, q[2] - 0.3, 0.45 + i * 0.07, '#ffffff', 0.45 * (1 - i / 11), eye));
          }
        }
        st.sun = [VX + 9, 9, 70];
        st.A = A;
      } else if (phase === 2) {
        // 14 HORAS: do corredor, de lado (longe o bastante), o céu da janela vai da noite ao dia
        const k = p;
        const mixSky = (a, b, c) => (k < 0.5 ? hexMix(a, b, k * 2) : hexMix(b, c, (k - 0.5) * 2));
        K.expo(0.95);
        K.sky(mixSky('#020617', '#1e3a8a', '#0369a1'), mixSky('#1e1b4b', '#fb923c', '#bae6fd'), Math.max(0, 1 - k * 2.6));
        K.fog(mixSky('#0b1028', '#f6a564', '#cfe9fb'), 0.015);
        const amb = mixSky('#5d6f9e', '#f2b98a', '#f4e7d6');
        K.ambient(amb);
        const e = easeIO(k);
        const eye = shake(K, [lerp(VX + 0.95, VX + 0.45, e), lerp(1.0, 0.92, e), lerp(19.45, 19.15, e)], f, 0.004, 6);
        K.cam(eye, [lerp(VX + 0.45, VX + 0.15, e), 0.74, 16.8], lerp(46, 42, e));
        const cloud = mixSky('#334155', '#fed7aa', '#ffffff');
        [[9.5, 0.2, 2.6, 0.5], [5.5, -0.2, 5.0, 0.8], [1.0, -0.6, 7.5, 1]].forEach(([y, z, sp, a], L) => {
          for (let i = 0; i < 5; i++) {
            const x = ((((i * 7.3 - t * sp * 0.012) % 36) + 36) % 36) + VX - 18;
            K.quad({ x, y: y - L * 0.2, z, w: 6 + L * 2, h: 1.9 + L * 0.5, ang: -Math.PI / 2, img: cloudPx(), color: cloud, alpha: a, em: true });
          }
        });
        const sunK = seg(k, 0.3, 0.75);
        if (sunK > 0) {
          glowAt(K, VX + 3, -14, lerp(-2.5, 4, sunK), 10, '#ffedd5', 0.85 * sunK, eye);
          glowAt(K, VX + 3, -13.9, lerp(-2.5, 4, sunK), 1.6, '#fffbeb', sunK, eye);
        }
        K.box({ x0: VX - 0.15, y0: 11.4, x1: VX + 1.1, y1: 16.1, z0: 0.52, z1: 0.58, color: hexMix('#334155', '#e2e8f0', k), light: c01(amb) });
        glowAt(K, VX + 0.2, 11.5, 0.6, 0.45, '#f87171', 0.9, eye);
        // a cabine: parede com as janelas, bagageiro, teto, chão, poltronas e o corredor
        [-4.8, -2.4, 0, 2.4, 4.8].forEach((dx) => K.quad({ x: VX + dx, y: 16.4, z: 0.12, w: 2.4, h: 1.8, ang: -Math.PI / 2, img: cabinWallPx() }));
        K.box({ x0: VX - 6, y0: 16.4, x1: VX + 6, y1: 17.0, z0: 1.45, z1: 1.62, color: '#e2e8f0', top: '#cbd5e1' });
        K.box({ x0: VX - 6, y0: 16.4, x1: VX + 6, y1: 20.5, z0: 1.62, z1: 1.9, color: '#94a3b8' });
        K.floor({ x0: VX - 6, y0: 16.4, x1: VX + 6, y1: 20.5, z: 0.12, color: '#1e293b' });
        K.floor({ x0: VX - 6, y0: 18.2, x1: VX + 6, y1: 18.6, z: 0.125, color: '#7f1d1d' });
        const seats = [];
        // (encostos baixos e finos: vistos do corredor não tapam quem está sentado)
        [-2.7, -1.6, 0.55, 1.65].forEach((sx) => seats.push({ x0: VX + sx, y0: 16.5, x1: VX + sx + 0.1, y1: 17.7, z0: 0.12, z1: 0.82 }));
        boxes(K, seats, { color: '#1e3a8a', top: '#1d4ed8' });
        boxes(K, [{ x0: VX - 2.7, y0: 16.5, x1: VX - 1.6, y1: 17.7, z0: 0.12, z1: 0.36 }, { x0: VX - 1.5, y0: 16.5, x1: VX + 0.55, y1: 17.7, z0: 0.12, z1: 0.36 }, { x0: VX + 0.65, y0: 16.5, x1: VX + 1.65, y1: 17.7, z0: 0.12, z1: 0.36 }], { color: '#1e3a8a', top: '#1d4ed8' });
        const rc = routeScreen(easeIO(p));
        K.quad({ x: VX + 0.545, y: 17.2, z: 0.5, w: 0.42, h: 0.28, ang: 0, img: rc.cv, dirty: rc.dirty, em: true, color: '#e5e7eb' });
        const day = k > 0.45;
        K.actor(traveler, { x: VX - 0.5, y: 17.05, ang: -Math.PI / 2 + 0.75, anim: 'sit', seat: 0.36, light: mixP(c01(amb), [1, 1, 1], 0.25).map((v) => v * (day ? 0.98 : 0.8)) });
        st.k = k;
      } else {
        // BARCELONA: a câmera desce do sol até a rua e encontra você
        K.expo(1.0);
        K.sky('#0369a1', '#bae6fd', 0);
        K.fog('#cde8f6', 0.014);
        K.ambient('#fff1dc');
        const tilt = easeIO(seg(t, 0, 100));
        const k2 = easeIO(seg(t, 80, 210));
        const eye = [VX - 0.1 + k2 * 0.3, lerp(1.05, 0.9, k2), VY + 3.4 - k2 * 0.5];
        K.cam(eye, mixP([VX + 1.4, 7.2, VY - 10], [VX, 1.0, VY - 10], tilt), lerp(52, 46, k2));
        glowAt(K, VX + 4, VY - 26, 11, 9, '#ffedd5', 0.85, eye);
        glowAt(K, VX + 4, VY - 25.9, 11, 1.8, '#fffbeb', 1, eye);
        K.floor({ x0: VX - 12, y0: VY - 32, x1: VX + 12, y1: VY + 6, color: '#c9a27a' });
        boxes(K, [{ x0: VX - 3.2, y0: VY - 32, x1: VX - 2.0, y1: VY + 6, z0: 0, z1: 0.06 }, { x0: VX + 2.0, y0: VY - 32, x1: VX + 3.2, y1: VY + 6, z0: 0, z1: 0.06 }], { color: '#b8956c', top: '#e3cfae' });
        for (let i = 0; i < 9; i++) {
          const y = VY + 2.5 - i * 3.6;
          K.quad({ x: VX - 3.2, y, z: 0, w: 3.6, h: 3.6, ang: Math.PI, img: facadePx(i % 3), light: [0.84, 0.8, 0.78] });
          K.quad({ x: VX + 3.2, y: y - 1.2, z: 0, w: 3.6, h: 3.6, ang: 0, img: facadePx((i + 1) % 3), light: [1.12, 1.06, 0.95] });
        }
        K.quad({ x: VX, y: VY - 31, z: -0.6, w: 40, h: 11.7, ang: -Math.PI / 2, img: bcnCityPx(), light: [1.0, 0.98, 0.95] });
        [[VX - 2.6, VY - 0.6], [VX + 2.6, VY - 4.2], [VX - 2.6, VY - 9.4]].forEach(([x, y]) => K.quad({ x, y, z: 0, w: 1.7, h: 3.5, ang: toward(x, y, eye) + Math.PI, img: palmPx(), light: [0.95, 0.95, 0.9] }));
        // você entra no quadro pela esquerda, de costas, e se espreguiça
        const enter = ease(seg(t, 80, 120));
        if (t >= 74) {
          const walking = t < 120;
          K.actor(traveler, { x: lerp(VX - 1.8, VX - 0.35, enter), y: lerp(VY + 1.6, VY + 0.6, enter), ang: walking ? -Math.PI / 4 : -Math.PI / 2, anim: walking ? 'run' : t > 130 ? 'call_pass' : 'idle', frame: walking ? Math.floor(S.f * 0.45) : undefined, light: [1.12, 1.06, 0.98] });
        }
        st.sun = [VX + 4, 11, VY - 25.9];
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = K.st || {};
      const sun = st.sun ? K.screen(st.sun[0], st.sun[1], st.sun[2]) : null;
      if (phase === 0) {
        // reflexos andando no vidro
        const off = (t * 1.1) % 330;
        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        for (let x = -330 - off; x < W + 330; x += 330) {
          ctx.beginPath();
          ctx.moveTo(x + 60, top);
          ctx.lineTo(x + 140, top);
          ctx.lineTo(x + 40, bot);
          ctx.lineTo(x - 40, bot);
          ctx.closePath();
          ctx.fill();
        }
        flareAt(ctx, S, sun, 0.6, '253,186,116');
        CE.luckKicker(ctx, 40, top + 30, 'AEROPORTO DE HANEDA • 06:00', seg(t, 12, 46), '#fdba74');
      } else if (phase === 1) {
        flareAt(ctx, S, sun, 0.9, '253,230,138');
        const A = st.A || 0;
        const k = seg(A, 0, 86);
        if (k > 0.2 && k < 0.6) {
          ctx.save();
          ctx.translate(W / 2, H / 2);
          ctx.rotate(-0.42);
          ctx.translate(-W / 2, -H / 2);
          CE.drawSpeedLines(ctx, W, H, '#ffffff', 0.1);
          ctx.restore();
        }
        CE.luckKicker(ctx, 40, bot - 40, 'VOO BL-011 • TÓQUIO → BARCELONA • 14 H', seg(t, 84, 118), '#fde68a');
        CE.cineSfx(S, 16, 'takeoff', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        CE.cineDust(ctx, W, H, t, 14, 'rgba(255,237,213,0.35)', 7);
        if (t > 30) cutWindow(ctx, S, seg(t, 30, 40), st.k || 0, t);
      } else {
        // gaivotas em pixel
        for (let i = 0; i < 5; i++) {
          const gx = ((i * 260 + t * (1.2 + i * 0.2)) % (W + 200)) - 100;
          const gy = top + 40 + i * 34 + Math.sin(t * 0.05 + i) * 8 + seg(t, 0, 100) * 160;
          const up = Math.floor(t / 8 + i) % 2;
          ctx.fillStyle = 'rgba(15,23,42,0.75)';
          const px = (dx, dy) => ctx.fillRect(Math.round((gx + dx) / 4) * 4, Math.round((gy + dy) / 4) * 4, 4, 4);
          px(0, 0);
          px(-4, up ? -4 : 0);
          px(4, up ? -4 : 0);
          px(-8, up ? -8 : 4);
          px(8, up ? -8 : 4);
        }
        flareAt(ctx, S, sun, 0.7 * (1 - seg(t, 60, 120) * 0.6), '255,237,213');
        CE.cineDust(ctx, W, H, t, 22, 'rgba(254,240,138,0.55)', 2);
        CE.luckKicker(ctx, 40, top + 30, 'BARCELONA, ESPANHA • 13:40 • 31 °C', seg(t, 100, 140), '#facc15');
      }
    }
  });

  // ==========================================================================
  // 3) EL CLÁSICO — o campo do prédio à noite (você na arquibancada do sul)
  // ==========================================================================
  const SOUTH = [[21.15, 0.22], [21.75, 0.44], [22.35, 0.66]]; // degraus: y da frente, altura
  const YOU_SEAT = [51.5, 21.45, 0.22];
  let CLA = null;
  function clasicoCrowd() {
    if (CLA) return CLA;
    const people = crowdOf('cla', 24, ['#7f1d1d', '#1e40af', '#facc15', '#f8fafc', '#991b1b', '#1d4ed8'], 5);
    CLA = [];
    let n = 0;
    SOUTH.forEach(([y, z], r) => {
      for (let i = 0; i < 9; i++) {
        const x = 48.9 + i * 0.72 + (r % 2) * 0.36;
        if (r === 0 && Math.abs(x - YOU_SEAT[0]) < 0.4) continue; // você
        CLA.push({ x, y: y + 0.3, z, cd: people[n++ % people.length], arms: rnd(i, r + 2) < 0.45, ph: rnd(i, r) * 6 });
      }
    });
    return CLA;
  }
  function southStands(K, t, cheer) {
    boxes(K, SOUTH.map(([y, z]) => ({ x0: 46, y0: y, x1: 60.9, y1: 22.95, z0: 0, z1: z })), { color: '#150910', top: '#2a0f19' });
    clasicoCrowd().forEach((f, i) => {
      const jump = cheer * Math.max(0, Math.sin(t * 0.2 + f.ph)) * 0.07;
      K.actor(f.cd, { id: 'f' + i, x: f.x, y: f.y, z: f.z + jump, ang: -Math.PI / 2, anim: f.arms && cheer > 0.3 ? 'call_pass' : 'idle', frame: 0, k: 0.86, light: [0.4, 0.32, 0.4] });
    });
  }
  // sinalizadores vermelhos na torcida do norte
  function redFlares(K, t, eye, k = 1) {
    [[48.2, 0], [54.6, 2], [58.6, 4]].forEach(([x, s]) => glowAt(K, x, 6.1, 1.85, 0.9, '#f87171', (0.45 + 0.2 * Math.sin(t * 0.07 + s)) * k, eye));
  }
  const sc = () => CE.spainCast();
  const KIT_R = { jerseyPrimary: '#f8fafc', jerseySecondary: '#a78bfa' };
  function kitB() {
    const b = sc().bunny;
    return { jerseyPrimary: b.jerseyPrimary, jerseySecondary: b.jerseySecondary };
  }
  const barcha = () => crowdOf('barcha', 4, ['#7f1d1d'], 9).map((c) => Object.assign({}, c, kitB(), { outfit: undefined }));
  const real = () => crowdOf('real', 4, ['#f8fafc'], 13).map((c) => Object.assign({}, c, KIT_R, { outfit: undefined }));
  const keeperR = () => Object.assign({}, crowdOf('realgk', 1, ['#16a34a'], 21)[0], { outfit: undefined, jerseyPrimary: '#16a34a', jerseySecondary: '#052e16', number: 1 });
  function teams(K, skip = {}) {
    const bl = barcha();
    const rl = real();
    [[50.2, 12.6], [50.6, 16.4], [48.8, 14.5], [56.4, 18.2]].forEach(([x, y], i) => !skip['b' + i] && K.actor(bl[i], { id: 'b' + i, x, y, ang: 0, frame: 0, k: 0.86 }));
    [[55.8, 12.4], [55.4, 16.6], [57.2, 14.5], [54.6, 10.4]].forEach(([x, y], i) => !skip['r' + i] && K.actor(rl[i], { id: 'r' + i, x, y, ang: Math.PI, frame: 0, k: 0.86 }));
  }
  // quadro de mangá: o calcanhar do Bunny levantando a bola por cima do marcador
  function cutHeel(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, bot } = S;
    const sh = bot - S.top;
    const b = sc().bunny;
    CA.panel(
      ctx,
      [[W * 0.55, bot - sh * 0.52], [W - 16, bot - sh * 0.6], [W - 16, bot - 16], [W * 0.49, bot - 16]],
      (bx, g) => {
        g.fillStyle = '#fde2e8';
        g.fillRect(bx.x, bx.y, bx.w, bx.h);
        CA.speedLines(g, -Math.PI / 2 + 0.3, W, S.H, { color: 'rgba(15,23,42,0.6)', n: 30, t: q * 60, speed: 30, thick: 8 });
        const e = ease(q * 1.6);
        CA.boot(g, bx.x + bx.w * 0.36 + bx.ox, bx.y + bx.h * 0.82, bx.h * 0.16, { sock: b.jerseyPrimary || '#7f1d1d', sock2: b.jerseySecondary || '#1e40af', boot: '#f472b6', ang: lerp(0.35, -0.8, e), flip: true });
        CA.ball(g, bx.x + bx.w * 0.62 + bx.ox, bx.y + bx.h * (0.74 - 0.52 * ease(q)), bx.h * 0.13, { rot: q * 7 });
      },
      { k: kIn, from: [W * 0.5, 0], pixel: PIX }
    );
  }
  // o drible: o Bunny correndo para o leste em y 12,2; o calcanhar no tempo da ação HEEL
  const HEEL = 46;
  const CL_KEYS = [[0, 0], [44, 44], [104, 60], [124, 92]];
  const bunnyX = (A) => 48.7 + Math.min(A, HEEL) * 0.04 + Math.max(0, A - HEEL - 8) * 0.045;
  const heelBall = (A) => {
    const x0 = 48.7 + HEEL * 0.04;
    if (A < HEEL) return [bunnyX(A) + 0.28, 12.18, 0.09];
    const q = seg(A, HEEL, HEEL + 40);
    return [lerp(x0 + 0.1, x0 + 2.0, q), 12.2, 0.1 + Math.sin(q * Math.PI) * 1.35];
  };
  // o gol: o chute do Lavinho até o ângulo (de dentro do gol a câmera olha para fora)
  const GHIT = 26;
  const goalBall = (t) => (t < GHIT ? [lerp(54.9, 53.62, t / GHIT), lerp(10.2, 6.32, t / GHIT), lerp(0.25, 0.62, t / GHIT)] : [53.62, 6.3, Math.max(0.1, 0.62 - (t - GHIT) * 0.012)]);

  reg('clasico_bunny', {
    phases: [170, 200, 190, 190, 130],
    music: 'epic',
    title: '⚽ EL CLÁSICO • FC BARCHA x RE AL',
    tags: ['PLANO 1 • O ESTÁDIO', 'PLANO 2 • A PROVOCAÇÃO', 'PLANO 3 • O SHOW DO BUNNY', 'PLANO 4 • O ESTÁDIO EXPLODE', 'PLANO 5 • O OLHAR DO SAE'],
    subs: [
      [{ from: 70, text: '98 mil pessoas. E você no meio delas.' }],
      [{ from: 20, who: 'BUNNY IGLESIAS', text: '"Ei, Sae! Você é só o figurante."', color: '#fb7185' }],
      [{ from: 128, who: 'BUNNY IGLESIAS', text: '"Pra quê olhar?"', color: '#fb7185' }],
      [{ from: 96, who: 'BUNNY IGLESIAS', text: '"Viu, Sae? O campo é MEU."', color: '#fb7185' }],
      [{ from: 30, who: 'SAE ITOSHI', text: '"...Fala demais."', color: '#2dd4bf' }]
    ],
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase, f } = S;
      const cast = sc();
      const st = (K.st = {});
      const pinkL = [1.18, 0.98, 1.04];
      K.expo(0.95);
      if (phase === 0) {
        // A GRUA: do alto do campo até a arquibancada do sul — você no meio da torcida
        const k = easeIO(seg(t, 0, 160));
        const eye = mixP([53.2, 4.6, 8.2], [52.6, 1.25, 17.3], k);
        K.cam(eye, mixP([53, 0.3, 16.0], [51.8, 0.78, 21.5], k), lerp(56, 46, k));
        southStands(K, t, 0.35);
        redFlares(K, t, eye);
        teams(K);
        K.actor(cast.traveler, { x: YOU_SEAT[0], y: YOU_SEAT[1], z: YOU_SEAT[2], ang: -Math.PI / 2, light: [0.62, 0.62, 0.72] });
        K.actor(cast.bunny, { x: 52.6, y: 14.5, ang: 0, k: 0.9 });
        K.actor(cast.sae, { x: 53.4, y: 14.5, ang: Math.PI, k: 0.9 });
        st.you = [YOU_SEAT[0], YOU_SEAT[2] + 1.05, YOU_SEAT[1]];
      } else if (phase === 1) {
        // A PROVOCAÇÃO: os dois no meio-campo, a câmera dando a volta devagar (sem cruzar o eixo)
        const k = easeIO(seg(t, 0, 200));
        const a = lerp(-0.42, 0.18, k);
        const R = lerp(3.0, 2.55, k);
        const eye = [53 + Math.sin(a) * R, lerp(0.85, 0.66, k), 14.5 + Math.cos(a) * R];
        K.cam(eye, [lerp(52.85, 53.15, k), 0.6, 14.5], lerp(42, 38, k));
        redFlares(K, t, eye);
        teams(K, { b2: 1, r2: 1 });
        const gest = t > 14 && t < 110;
        K.actor(cast.bunny, { x: 52.55, y: 14.5, ang: 0, anim: gest ? 'call_pass' : 'idle', k: 0.9, light: pinkL });
        K.actor(cast.sae, { x: 53.45, y: 14.5, ang: Math.PI, k: 0.9, light: [0.8, 0.86, 0.95] });
      } else if (phase === 2) {
        if (t < 124) {
          // O SHOW: de lado, na altura da bola, correndo junto; câmera lenta no calcanhar
          const A = remap(t, CL_KEYS);
          const bx = bunnyX(A);
          const flick = A >= HEEL - 4 && A < HEEL + 14;
          const bp = heelBall(A);
          const up = A > HEEL ? Math.sin(seg(A, HEEL, HEEL + 40) * Math.PI) : 0;
          const camX = lerp(bx + 0.3, bp[0], seg(A, HEEL, HEEL + 30) * 0.6);
          K.cam(shake(K, [camX, 0.42, 14.8], f, 0.006), [camX + 0.35, 0.46 + up * 0.32, 12.2], 46);
          const lunaX = A < HEEL ? lerp(53.6, 51.2, ease(A / HEEL)) : 51.2 - Math.min(0.3, (A - HEEL) * 0.01);
          K.actor(cast.bunny, { x: bx, y: 12.2, ang: 0, anim: flick ? 'rabona' : 'run', opts: flick ? { animTime: (A - HEEL + 4) * 1.5 } : undefined, k: 0.9, light: pinkL });
          K.actor(cast.luna, { x: lunaX, y: 12.4, ang: Math.PI, anim: A < HEEL - 6 ? 'run' : A < HEEL + 30 ? 'jump' : 'idle', opts: A >= HEEL - 6 && A < HEEL + 30 ? { animTime: (A - HEEL + 6) * 1.2 } : undefined, z: A >= HEEL && A < HEEL + 24 ? Math.sin(seg(A, HEEL, HEEL + 24) * Math.PI) * 0.18 : 0, k: 0.9 });
          K.ball(bp[0], bp[1], bp[2], { k: 0.85 });
          st.ball = bp;
          st.A = A;
        } else {
          // O PASSE SEM OLHAR: o Bunny de frente para a câmera, a bola sai para o lado
          const tt = t - 124;
          const k = easeIO(seg(tt, 0, 66));
          const eye = shake(K, [lerp(52.75, 52.95, k), 0.52, lerp(14.5, 14.2, k)], f, 0.004, 4);
          K.cam(eye, [53.25, 0.55, 11.6], 42);
          K.actor(cast.bunny, { x: 52.75, y: 11.85, ang: Math.PI / 2, view: 'front', k: 0.9, light: pinkL, anim: tt > 4 && tt < 16 ? 'shoot' : 'idle', frame: tt > 4 && tt < 16 ? 1 : undefined });
          K.actor(cast.lavinho, { x: lerp(57.8, 55.95, ease(seg(tt, 0, 40))), y: 10.05, ang: Math.PI, anim: tt < 40 ? 'run' : 'idle', k: 0.9 });
          const a = easeIO(seg(tt, 6, 44));
          K.ball(lerp(52.9, 55.72, a), lerp(11.8, 10.12, a), 0.1 + Math.sin(a * Math.PI) * 0.28);
        }
      } else if (phase === 3) {
        if (t < 84) {
          // A REDE: de dentro do gol — o chute do Lavinho entra no ângulo e a rede estufa
          const hit = t >= GHIT;
          const eye = shake(K, [53.35, 0.46, 6.18], f * 2, hit ? 0.03 * Math.max(0, 1 - (t - GHIT) / 30) : 0.003, 5);
          K.cam(eye, [53.6, 0.5, 9.6], 58);
          const dq = seg(t, 6, 34);
          K.actor(keeperR(), { id: 'gk', x: lerp(52.95, 52.25, ease(dq)), y: 7.15, z: Math.sin(dq * Math.PI) * 0.28, face: [53, 12], anim: dq > 0 ? 'dive' : 'idle', opts: dq > 0 ? { animTime: dq * 30 } : undefined, k: 0.9 });
          K.actor(cast.lavinho, { x: 55.2, y: 10.4, face: [53.4, 6.6], anim: t < 10 ? 'shoot' : 'idle', frame: 1, k: 0.9 });
          K.actor(cast.bunny, { x: 52.7, y: 11.9, face: [53.4, 6.6], k: 0.9, light: pinkL });
          const bp = goalBall(t);
          K.ball(bp[0], bp[1], bp[2], { k: 0.85 });
          st.ball = bp;
          st.hit = hit;
        } else {
          // O ESTÁDIO EXPLODE: o Bunny apontando para o Sae; a grua sobe atrás dele
          const tt = t - 84;
          const k = easeIO(seg(tt, 0, 106));
          const eye = [lerp(53.5, 53.8, k), lerp(0.42, 1.25, k), lerp(12.4, 13.1, k)];
          K.cam(eye, [lerp(53.2, 52.6, k), lerp(0.75, 0.55, k), lerp(9.2, 8.6, k)], lerp(44, 48, k));
          redFlares(K, t, eye, 1.4);
          const rise = ease(seg(tt, 0, 18));
          K.actor(cast.bunny, { x: 53.45, y: 9.7, z: (1 - rise) * -0.05, face: [51.4, 7.6], anim: 'call_pass', k: 0.9, light: pinkL });
          const bl = barcha();
          [[54.6, 10.6, 0], [52.4, 10.9, 1], [55.3, 9.2, 2]].forEach(([x, y, i]) => {
            const run = ease(seg(tt, 4 + i * 6, 50 + i * 6));
            K.actor(bl[i], { id: 'b' + i, x: lerp(x + (i - 1) * 1.2, x, run), y: lerp(y - 1.4, y, run), face: [53.45, 9.7], anim: run < 1 ? 'run' : 'celebrate', k: 0.86 });
          });
          K.actor(cast.lavinho, { x: 54.2, y: 9.1, face: [53.45, 9.7], anim: 'celebrate', k: 0.9 });
          K.actor(cast.sae, { x: 51.4, y: 7.6, ang: Math.PI / 2, k: 0.9, light: [0.55, 0.58, 0.7] });
        }
      } else {
        // O OLHAR DO SAE: parado no meio da festa; o mundo perde a cor, só ele fica
        const k = easeIO(seg(t, 0, 130));
        const eye = [lerp(52.85, 52.55, k), lerp(0.72, 0.66, k), lerp(10.6, 10.25, k)];
        K.cam(eye, [51.4, 0.62, 7.6], lerp(42, 38, k));
        // (sem os sinalizadores aqui: ficavam bem atrás dele, como uma aura)
        K.actor(cast.sae, { x: 51.4, y: 7.6, ang: Math.PI / 2 - 0.25, k: 0.9, light: [0.95, 1.0, 1.08], opts: { expr: 'angry' } });
        const bl = barcha();
        K.actor(cast.bunny, { x: 53.6, y: 9.4, face: [54.4, 8.6], anim: 'celebrate', k: 0.9 });
        K.actor(bl[0], { id: 'b0', x: 54.4, y: 9.9, face: [53.6, 9.4], anim: 'celebrate', k: 0.86 });
        K.actor(cast.lavinho, { x: 54.2, y: 8.7, face: [53.6, 9.4], anim: 'celebrate', k: 0.9 });
        st.sae = [51.4, 7.6, 0.5];
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = K.st || {};
      const scr = (p) => (p ? K.screen(p[0], p[2] ?? 0, p[1]) : null);
      const board = (h, a, k = 1) => {
        if (k <= 0) return;
        ctx.save();
        ctx.globalAlpha = k;
        CE.espScoreboard(ctx, W - 330, top + 16, h, a, phase < 3 ? "34'" : "67'");
        ctx.restore();
      };
      if (phase === 0) {
        towerFlares(ctx, K, S, 0.9);
        CE.luckKicker(ctx, 40, top + 30, 'ESTADI BARCHA • 21:00', seg(t, 10, 40), '#facc15');
        CE.luckKicker(ctx, 40, top + 66, 'EL CLÁSICO • FC BARCHA x RE AL', seg(t, 30, 64), '#f8fafc');
        board(0, 0, seg(t, 20, 40));
        const y = st.you ? K.screen(st.you[0], st.you[1], st.you[2]) : null;
        if (y && t > 120) CE.luckKicker(ctx, Math.max(30, y.x - 40), y.y - 30, `▼ ${CE.cinePlayerName()}`, seg(t, 120, 140), '#00f5d4');
      } else if (phase === 1) {
        towerFlares(ctx, K, S, 0.7);
        board(0, 0);
      } else if (phase === 2) {
        if (t < 124) {
          towerFlares(ctx, K, S, 0.9);
          const A = st.A || 0;
          const tau = A - HEEL;
          // o toque de calcanhar: quadro de impacto (1 quadro), depois a câmera lenta
          if (tau >= 0 && tau < 0.6) impactFrame(ctx, W, H);
          const slow = seg(t, 44, 56) * (1 - seg(t, 100, 116));
          if (slow > 0) {
            ctx.save();
            ctx.globalAlpha = 0.22 * slow;
            ctx.fillStyle = '#1a0510';
            ctx.fillRect(0, top, W, bot - top);
            ctx.restore();
          }
          const b = scr(st.ball);
          if (b && tau > 0) CE.cineGlow(ctx, b.x, b.y, 56, 'rgba(255,255,255,0.5)', 0.8);
          if (tau < 0) CE.drawSpeedLines(ctx, W, H, '#fda4af', 0.1);
          if (t > 50 && t < 104) cutHeel(ctx, S, seg(t, 50, 60), seg(t, 52, 104));
          CE.cineSfx(S, 44, 'heel', () => window.SFX?.kick?.(0.6));
        } else {
          towerFlares(ctx, K, S, 0.6);
          CE.cineSfx(S, 130, 'pass', () => window.SFX?.pass?.());
        }
        board(0, 0);
      } else if (phase === 3) {
        if (t < 84) {
          const b = scr(st.ball);
          netOverlay(ctx, S, st.hit ? b : null, st.hit ? Math.max(0, 1 - (t - GHIT) / 40) * Math.abs(Math.cos((t - GHIT) * 0.25)) : 0);
          if (st.hit) {
            CE.cineFlash(ctx, W, H, 0.55 * (1 - seg(t, GHIT, GHIT + 10)));
            CE.cineImpactText(ctx, 'GOOOL!!', W / 2, top + (bot - top) * 0.42, 140, '#facc15', seg(t, GHIT + 3, GHIT + 11), W * 0.8, -0.06);
          }
          board(st.hit && t > GHIT + 10 ? 1 : 0, 0);
          CE.cineSfx(S, GHIT, 'goal', () => window.SFX?.goal?.(true));
        } else {
          towerFlares(ctx, K, S, 1);
          confetti(ctx, S, t, 70, seg(t, 84, 100));
          board(1, 0);
        }
      } else {
        // o mundo perde a cor em volta do Sae (só ele fica)
        const s = scr(st.sae);
        towerFlares(ctx, K, S, 0.8);
        if (s) bwSoft(ctx, W, H, s.x, s.y - 10, lerp(W, 34, easeIO(seg(t, 10, 60))), lerp(W * 1.4, 165, easeIO(seg(t, 10, 60))));
        board(1, 0);
        CE.cineFlash(ctx, W, H, seg(t, 108, 130), '#000000');
        CE.cineSfx(S, 12, 'sae', () => window.SFX?.whoosh?.());
      }
    }
  });

  // ==========================================================================
  // 4) O DISCURSO — o vestiário do prédio
  // ==========================================================================
  // sentados nos bancos do vestiário (banco de 17,06 a 17,4, tampo a 0,26): assento a 0,2 no
  // meio do banco (o colo no tampo, o banco esconde as pernas). A porta fica no meio (x 38,5)
  const SEAT_Y = 17.26;
  const SEAT_H = 0.2;
  const TEAM = [['nagi', 35.8], ['bachira', 36.6], ['shidou', 37.4], ['rin', 39.6], ['chigiri', 40.4], ['gagamaru', 41.2]];
  const ME_X = 42.05;
  const STAND = [41.75, 17.95]; // onde você fica de pé para falar
  function lampCone(K, x, y, alpha, eye) {
    K.quad({ x, y, z: 0, w: 1.5, h: 1.72, ang: toward(x, y, eye), img: coneCv(), color: '#bfdbfe', alpha, em: true });
    K.floor({ x0: x - 0.7, y0: y - 0.5, x1: x + 0.7, y1: y + 0.5, z: 0.006, img: glowCv(), color: '#bfdbfe', alpha: alpha * 1.4, em: true });
  }
  // o time no banco (sit_down = cabeça baixa; up = levantou a cabeça)
  function bench(K, upOf, light) {
    TEAM.forEach(([id, sx], i) => {
      const up = upOf ? upOf(i, sx) : 0;
      K.actor(id, { x: sx, y: SEAT_Y, seat: SEAT_H, anim: up > 0.5 ? 'sit' : 'sit_down', ang: Math.PI / 2, kit: 'japan', frame: 0, light: light ? light(i, up) : [0.5, 0.56, 0.74] });
    });
  }
  // quadro de mangá: o seu punho subindo, linhas de velocidade ciano
  function cutFist(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    const you = CE.cineYou ? CE.cineYou() : {};
    const kit = (CE.KITS && CE.KITS.japan) || { jerseyPrimary: '#1d4ed8' };
    CA.panel(
      ctx,
      [[W * 0.6, top + 18], [W - 24, top + 30], [W - 40, bot - 22], [W * 0.56, bot - 34]],
      (b, g) => {
        g.fillStyle = '#dbe4ef';
        g.fillRect(b.x, b.y, b.w, b.h);
        const cx = b.x + b.w * 0.5 + b.ox;
        const cy = b.y + b.h * lerp(0.62, 0.36, ease(q * 1.5));
        CA.speedRadial(g, cx, cy, W, S.H, { color: 'rgba(15,23,42,0.8)', inner: b.h * 0.24, n: 56, thick: 1.6 });
        g.fillStyle = 'rgba(0,245,212,0.35)';
        g.beginPath();
        g.arc(cx, cy, b.h * 0.2, 0, TAU);
        g.fill();
        blit(g, armPx(you.skinColor || '#f3d1b8', kit.jerseyPrimary || '#1d4ed8', '#f8fafc', 'fist'), cx, cy + 70, -Math.PI / 2, false, 1);
      },
      { k: kIn, from: [0, 260], pixel: PIX }
    );
  }
  const SP_KEYS = [[0, 0], [60, 60], [130, 76], [150, 96]]; // a câmera lenta no "devorar o mundo"

  reg('captain_speech', {
    phases: [170, 120, 200, 150, 110, 160],
    music: 'epic',
    title: '🎙 O DISCURSO • VESTIÁRIO DO JAPÃO',
    tags: ['PLANO 1 • O SILÊNCIO', 'PLANO 2 • DE PÉ', 'PLANO 3 • O DISCURSO', 'PLANO 4 • DEVORAR', 'PLANO 5 • OS OLHOS', 'PLANO 6 • VAMOS!!!'],
    subs: [
      [{ from: 12, text: 'Lá fora, a torcida. Aqui, silêncio.' }],
      [{ from: 50, who: 'VOCÊ', text: '"...Escutem."', color: '#00f5d4' }],
      [
        { from: 6, who: 'VOCÊ', text: '"O mundo acha que o Japão veio só participar."', color: '#00f5d4' },
        { from: 100, who: 'VOCÊ', text: '"Que a gente é o time que \'corre bastante\'."', color: '#00f5d4' }
      ],
      [
        { from: 0, who: 'VOCÊ', text: '"Eu não vim participar."', color: '#00f5d4' },
        { from: 70, who: 'VOCÊ', text: '"Eu vim devorar o mundo."', color: '#00f5d4' }
      ],
      [{ from: 10, who: 'VOCÊ', text: '"E vocês?"', color: '#00f5d4' }],
      []
    ],
    theme: 'worldcup_england',
    scene(K, S) {
      const { t, phase, p, f } = S;
      const kit = 'japan';
      const st = (K.st = {});
      if (phase === 0) {
        // O SILÊNCIO: a câmera corre o banco, cabeças baixas; a torcida batendo lá fora
        K.expo(0.72);
        const thump = Math.max(kick(t, 40, 16), kick(t, 90, 16), kick(t, 140, 16));
        const x = lerp(36.0, 41.4, easeIO(p));
        const eye = shake(K, [x, 0.62, 19.95], f * 2, 0.012 * thump, 2);
        K.cam(eye, [x + 0.3, 0.42, 17.2], 44);
        bench(K, null, (i) => [0.46, 0.52, 0.72]);
        K.actor('you', { x: ME_X, y: SEAT_Y, seat: SEAT_H, anim: 'sit_down', ang: Math.PI / 2, kit, frame: 0, light: [0.95, 1.0, 1.1] });
        lampCone(K, ME_X, SEAT_Y + 0.15, 0.2 + thump * 0.06, eye);
      } else if (phase === 1) {
        // DE PÉ: você se levanta para dentro da luz; a câmera sobe junto
        K.expo(0.74);
        const rise = easeIO(seg(t, 24, 84));
        const k = easeIO(p);
        const eye = [lerp(41.0, 41.35, k), lerp(0.3, 0.42, k), lerp(20.7, 20.4, k)];
        K.cam(eye, [lerp(41.6, 41.9, k), lerp(0.55, 0.72, rise), 17.6], lerp(44, 40, k));
        bench(K, null, () => [0.4, 0.45, 0.62]);
        const youL = mixP([0.5, 0.56, 0.7], [1.05, 1.1, 1.18], rise);
        const you = K.actor('you', { x: lerp(ME_X, STAND[0], seg(rise, 0.5, 1)), y: lerp(SEAT_Y, STAND[1], seg(rise, 0.5, 1)), ang: Math.PI / 2, kit, light: youL, anim: rise < 0.2 ? 'sit_down' : 'sit', seat: SEAT_H });
        if (rise >= 0.5) {
          you.anim = 'idle';
          you.z = lerp(K.headZ(Object.assign({}, you, { anim: 'sit' })), 0, easeIO(seg(rise, 0.5, 1)));
        }
        lampCone(K, STAND[0], STAND[1] - 0.1, 0.18 + 0.12 * rise, eye);
      } else if (phase === 2) {
        // O DISCURSO: câmera baixa dando a volta devagar; o time de cabeça baixa ainda
        K.expo(0.78);
        const k = easeIO(p);
        const eye = [lerp(40.0, 40.7, k), lerp(0.3, 0.36, k), lerp(20.75, 20.35, k)];
        K.cam(eye, [lerp(40.9, 41.3, k), 0.68, 17.7], lerp(46, 42, k));
        bench(K, null, () => [0.44, 0.5, 0.66]);
        K.actor('you', { x: STAND[0], y: STAND[1], ang: Math.PI / 2 - 0.35 * k, kit, anim: t > 90 && t < 150 ? 'call_pass' : 'idle', light: [1.05, 1.08, 1.12] });
        lampCone(K, STAND[0], STAND[1] - 0.1, 0.3, eye);
      } else if (phase === 3) {
        // DEVORAR: push-in de baixo, câmera lenta no "devorar o mundo"
        K.expo(0.8);
        const A = remap(t, SP_KEYS);
        const k = easeIO(seg(A, 0, 96));
        const eye = shake(K, [lerp(41.2, 41.45, k), lerp(0.26, 0.3, k), lerp(20.75, 20.45, k)], f, 0.003, 3);
        K.cam(eye, [STAND[0], lerp(0.66, 0.74, k), STAND[1]], lerp(44, 40, k));
        bench(K, null, () => [0.4, 0.46, 0.6]);
        K.actor('you', { x: STAND[0], y: STAND[1], ang: Math.PI / 2, view: 'front', kit, anim: A > 60 ? 'call_pass' : 'idle', light: mixP([1.05, 1.08, 1.12], [0.85, 1.25, 1.2], seg(A, 60, 80)) });
        lampCone(K, STAND[0], STAND[1] - 0.1, 0.3 + 0.15 * seg(A, 60, 80), eye);
        if (A > 60) glowAt(K, STAND[0], STAND[1] - 0.1, 0.5, 1.6, '#00f5d4', 0.25 * seg(A, 60, 80), eye);
        st.A = A;
      } else if (phase === 4) {
        // OS OLHOS: a câmera corre o banco de novo e um por um levanta a cabeça
        K.expo(0.82);
        const k = easeIO(p);
        const x = lerp(41.0, 36.4, k);
        const eye = [x, 0.6, 19.9];
        K.cam(eye, [x - 0.2, 0.46, 17.25], 42);
        const upOf = (i, sx) => seg(x, sx + 1.0, sx + 0.4) * 2;
        bench(K, upOf, (i, up) => mixP([0.44, 0.5, 0.66], [1.0, 1.04, 1.1], clamp(up)));
        K.actor('you', { x: STAND[0], y: STAND[1], ang: Math.PI, kit, light: [1.0, 1.05, 1.1] });
        lampCone(K, STAND[0], STAND[1] - 0.1, 0.25, eye);
      } else {
        // VAMOS!!!: todo mundo de pé de uma vez; a grua sobe; a onda no chão
        K.expo(0.86);
        const HIT = 16;
        const k = easeIO(seg(t, 0, 160));
        const C = [40.4, 18.3]; // você no meio do grupo
        const eye = shake(K, [lerp(40.6, 40.35, k), lerp(0.26, 0.85, k), lerp(21.3, 21.6, k)], f * 2, t >= HIT ? 0.035 * Math.max(0, 1 - (t - HIT) / 34) : 0.002, 5);
        K.cam(eye, [40.4, lerp(0.8, 0.55, k), 18.0], lerp(48, 54, k));
        // o time sai do banco e fecha em volta de você
        const GROUP = [[38.6, 17.95], [39.2, 18.45], [39.8, 17.85], [41.0, 17.85], [41.6, 18.45], [42.2, 17.95]];
        TEAM.forEach(([id, sx], i) => {
          const go = ease(seg(t, 2 + i * 2, 26 + i * 2));
          const p = [lerp(sx, GROUP[i][0], go), lerp(SEAT_Y + 0.3, GROUP[i][1], go)];
          const jump = t > HIT + 6 ? Math.abs(Math.sin(t * 0.16 + i)) * 0.06 : 0;
          const moving = go > 0 && go < 1;
          K.actor(id, { x: p[0], y: p[1], z: jump, ang: Math.PI / 2, view: moving ? undefined : 'front', face: moving ? GROUP[i] : undefined, kit, anim: moving ? 'run' : t > HIT ? 'celebrate' : 'idle', light: [1.0, 1.04, 1.1] });
        });
        const jy = t > HIT ? Math.abs(Math.sin(t * 0.14)) * 0.06 : 0;
        K.actor('you', { x: C[0], y: C[1], z: jy, ang: Math.PI / 2, view: 'front', kit, anim: t > HIT ? 'call_pass' : 'idle', light: [1.1, 1.18, 1.18] });
        if (t >= HIT) {
          for (let r = 0; r < 3; r++) {
            const rr = (((t - HIT) * 0.045 + r * 0.9) % 2.7) + 0.1;
            const a = Math.max(0, 1 - rr / 2.7) * 0.7;
            K.floor({ x0: C[0] - rr, y0: C[1] - rr * 0.8, x1: C[0] + rr, y1: C[1] + rr * 0.8, z: 0.01 + r * 0.002, img: ringCv(), color: '#00f5d4', alpha: a, em: true });
          }
        }
        st.you = [C[0], 0.5, C[1]];
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = K.st || {};
      if (phase === 0) {
        const thump = Math.max(kick(t, 40, 16), kick(t, 90, 16), kick(t, 140, 16));
        CE.cineDust(ctx, W, H, t, 22 + Math.round(thump * 30), 'rgba(191,219,254,0.45)', 11);
        if (thump > 0) {
          ctx.save();
          ctx.globalAlpha = 0.12 * thump;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
        }
        CE.luckKicker(ctx, 40, top + 30, 'VESTIÁRIO DO JAPÃO • COPA DO MUNDO SUB-20', seg(t, 14, 50), '#93c5fd');
        CE.cineSfx(S, 40, 'tum1', () => window.SFX?.kick?.(0.25));
        CE.cineSfx(S, 90, 'tum2', () => window.SFX?.kick?.(0.25));
        CE.cineSfx(S, 140, 'tum3', () => window.SFX?.kick?.(0.25));
      } else if (phase === 1 || phase === 2) {
        CE.cineDust(ctx, W, H, t, 26, 'rgba(191,219,254,0.5)', 12);
      } else if (phase === 3) {
        const A = st.A || 0;
        CE.cineDust(ctx, W, H, t, 26, 'rgba(165,243,252,0.5)', 13);
        const slow = seg(t, 56, 70) * (1 - seg(t, 128, 146));
        if (slow > 0) {
          ctx.save();
          ctx.globalAlpha = 0.25 * slow;
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
        }
        if (t > 64 && t < 146) cutFist(ctx, S, seg(t, 64, 74), seg(t, 64, 130));
        void A;
        CE.cineSfx(S, 70, 'devorar', () => window.SFX?.whoosh?.());
      } else if (phase === 4) {
        CE.cineDust(ctx, W, H, t, 20, 'rgba(254,240,138,0.35)', 14);
        CE.cineSfx(S, 30, 'olhos', () => window.SFX?.whoosh?.());
      } else {
        const HIT = 16;
        if (t >= HIT && t < HIT + 1.2) impactFrame(ctx, W, H);
        const y = st.you ? K.screen(st.you[0], st.you[1], st.you[2]) : null;
        if (t >= HIT) {
          CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, HIT + 1, HIT + 9)));
          if (y && t < HIT + 10) CE.drawRadialSpeedLines(ctx, y.x, y.y, W, '#facc15', 0.35 * (1 - (t - HIT) / 10));
          CE.cineImpactText(ctx, 'VAMOS!!!', W / 2, top + 110, 120, '#facc15', seg(t, HIT, HIT + 8), W * 0.8, -0.04);
        }
        CE.cineFlash(ctx, W, H, seg(t, 140, 160), '#000000');
        CE.cineSfx(S, HIT, 'roar', () => window.SFX?.goal?.(false));
      }
    }
  });

  // ==========================================================================
  // 5) A PROMESSA DE LOKI E HUGO — a final (campo) e Paris anos atrás (área vazia)
  // ==========================================================================
  // Paris ao pôr do sol em pixel: os telhados (mansardas e chaminés) e a Torre Eiffel
  const parisPx = () =>
    paint('parisPx', 256, 90, (g, w, h) => {
      const base = h - 2;
      g.fillStyle = '#5a3418';
      for (let i = -1; i < 16; i++) {
        const r = rnd(i, 3);
        const x = i * 24;
        const hh = 18 + Math.round(r * 18);
        g.fillRect(x, base - hh, 23, hh);
        for (let s = 0; s < 6; s++) g.fillRect(x + 3 + s, base - hh - 6 + s, 23 - 2 * (3 + s) + 6, 1);
        g.fillRect(x + 5 + Math.round(r * 10), base - hh - 11, 3, 6);
      }
      // a torre
      const tx = Math.round(w * 0.7);
      const th = 62;
      g.fillStyle = '#3b2412';
      for (let y = 0; y < th; y++) {
        const q = y / th;
        const half = Math.round(lerp(14, 1, Math.pow(q, 0.55)));
        if (q < 0.18) {
          g.fillRect(tx - half, base - y, 3, 1);
          g.fillRect(tx + half - 3, base - y, 3, 1);
        } else g.fillRect(tx - half, base - y, half * 2, 1);
      }
      g.fillRect(tx - 9, base - Math.round(th * 0.3), 18, 2);
      g.fillRect(tx - 5, base - Math.round(th * 0.58), 10, 1);
      g.fillRect(tx, base - th - 6, 1, 6);
    });
  const parisNearPx = () =>
    paint('parisNearPx', 256, 50, (g, w, h) => {
      g.fillStyle = '#6b3d1c';
      for (let i = -1; i < 16; i++) {
        const r = rnd(i, 9);
        const x = i * 24 + 10;
        const hh = 16 + Math.round(r * 16);
        g.fillRect(x, h - hh, 23, hh);
        for (let s = 0; s < 6; s++) g.fillRect(x + 3 + s, h - hh - 6 + s, 23 - 2 * (3 + s) + 6, 1);
        g.fillStyle = '#e8a35c';
        for (let wy = h - hh + 4; wy < h - 4; wy += 6) for (let wx = x + 3; wx < x + 20; wx += 6) if (rnd(wx + wy, 4) > 0.6) g.fillRect(wx, wy, 2, 3);
        g.fillStyle = '#6b3d1c';
      }
    });
  const stonePx = () =>
    paint('stonePx', 32, 8, (g, w, h) => {
      g.fillStyle = '#7c4a24';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#5c3618';
      for (let r = 0; r < 2; r++) for (let x = (r % 2) * 4; x < w; x += 8) g.fillRect(x, r * 4, 1, 4);
      g.fillRect(0, 3, w, 1);
      g.fillRect(0, 7, w, 1);
    });
  function paris(K, eye, sunAt) {
    K.sky('#6b2a12', '#fcd9a0', 0);
    K.fog('#e8a35c', 0.02);
    K.ambient('#ffd2a0');
    K.floor({ x0: VX - 50, y0: VY - 46, x1: VX + 50, y1: VY + 8, color: '#b98345', light: [1, 0.9, 0.78] });
    K.quad({ x: VX + 6, y: VY - 42, z: -8.0, w: 90, h: 31.6, ang: -Math.PI / 2, img: parisPx(), light: [0.92, 0.78, 0.68] });
    K.quad({ x: VX, y: VY - 20, z: -4.6, w: 50, h: 9.8, ang: -Math.PI / 2, img: parisNearPx(), light: [0.95, 0.8, 0.7] });
    glowAt(K, sunAt[0], sunAt[1], sunAt[2], sunAt[3] * 8, '#fff0c8', 0.9, eye);
    glowAt(K, sunAt[0], sunAt[1] + 0.1, sunAt[2], sunAt[3], '#fff4dc', 1, eye);
  }
  // quadro de mangá: os dois punhos de criança se encontrando na frente do sol
  function cutFists(ctx, S, kIn, q) {
    const CA = CAa();
    if (!CA) return;
    const { W, top, bot } = S;
    const fr = CE.espFrance();
    CA.panel(
      ctx,
      [[W * 0.18, top + 40], [W * 0.82, top + 40], [W * 0.82, bot - 70], [W * 0.18, bot - 70]],
      (b, g) => {
        // o pôr do sol em faixas (pixel) e o sol no meio
        const bands = ['#6b2a12', '#9a3d14', '#c2581a', '#e8892c', '#f4b062', '#fcd9a0'];
        bands.forEach((c, i) => {
          g.fillStyle = c;
          g.fillRect(b.x, b.y + (b.h * i) / bands.length, b.w, b.h / bands.length + 2);
        });
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h * 0.52;
        g.fillStyle = '#fff4dc';
        g.beginPath();
        g.arc(cx, cy, b.h * 0.3, 0, TAU);
        g.fill();
        g.fillStyle = '#5a3418';
        g.fillRect(b.x, b.y + b.h * 0.86, b.w, b.h * 0.14);
        const meet = ease(seg(q, 0.05, 0.5));
        const gap = lerp(b.w * 0.42, 40 * PIX * 0.5 + 6, meet);
        blit(g, armPx(fr.kidLoki.skinColor || '#8d5a3b', '#1e3a8a', '#f8fafc', 'fist'), cx - gap, cy + 10, 0, false, 1);
        blit(g, armPx(fr.kidHugo.skinColor || '#f3d1b8', '#f1f5f9', '#1e3a8a', 'fist'), cx + gap, cy + 10, 0, true, 1);
        if (meet >= 1) {
          const r = seg(q, 0.5, 0.85);
          g.strokeStyle = `rgba(255,251,235,${1 - r})`;
          g.lineWidth = 12;
          for (let i = 0; i < 10; i++) {
            const an = (i / 10) * TAU;
            g.beginPath();
            g.moveTo(cx + Math.cos(an) * (50 + r * 60), cy + 10 + Math.sin(an) * (50 + r * 60));
            g.lineTo(cx + Math.cos(an) * (90 + r * 160), cy + 10 + Math.sin(an) * (90 + r * 160));
            g.stroke();
          }
        }
      },
      { k: kIn, from: [0, 300], pixel: PIX }
    );
  }
  const LK_RISE = 74; // a hora em que os dois se levantam (o único quadro de impacto)

  reg('loki_hugo_promise', {
    phases: [80, 160, 170, 150],
    music: 'promise',
    grain: 0.1,
    title: '✦ FLASHBACK • A PROMESSA DE LOKI E HUGO',
    tags: ['PLANO 1 • O OLHAR DO LOKI', 'PLANO 2 • PARIS, ANOS ATRÁS', 'PLANO 3 • A PROMESSA', 'PLANO 4 • A FRANÇA DESPERTA'],
    subs: [
      [],
      [{ from: 40, who: 'HUGO (CRIANÇA)', text: '"Vamos ganhar a Copa?"', color: '#f9a8d4' }],
      [{ from: 30, who: 'LOKI (CRIANÇA)', text: '"Juntos. Eu prometo."', color: '#7dd3fc' }],
      [{ from: 8, who: 'HUGO', text: '"Eu lembro. Ainda não acabou."', color: '#f472b6' }]
    ],
    theme: 'worldcup_final',
    scene(K, S) {
      const { t, phase, f } = S;
      const fr = CE.espFrance();
      const st = (K.st = {});
      if (phase === 0) {
        // O OLHAR DO LOKI: na final, ofegante; a câmera chega devagar e a imagem esquenta
        K.expo(0.88);
        const k = easeIO(seg(t, 0, 80));
        const eye = shake(K, [lerp(53.9, 53.35, k), lerp(0.7, 0.62, k), lerp(15.6, 15.2, k)], f, 0.003);
        K.cam(eye, [53.0, 0.58, 12.4], lerp(42, 36, k));
        K.actor(fr.loki, { x: 53, y: 12.4, ang: Math.PI / 2 + 0.2, k: 0.9, light: [0.9, 0.95, 1.08], frame: Math.floor(S.f / 6) % 2 });
        K.actor(fr.hugo, { x: 54.6, y: 11.2, ang: Math.PI / 2, k: 0.9, light: [0.7, 0.7, 0.8] });
      } else if (phase === 1) {
        // PARIS, ANOS ATRÁS: os dois meninos trocando passes; travelling de lado
        K.expo(1.0);
        const k = easeIO(seg(t, 0, 160));
        const eye = [VX - 0.6 + k * 1.0, lerp(0.62, 0.5, k), VY + lerp(3.0, 2.6, k)];
        K.cam(eye, [VX - 0.2 + k * 0.6, 0.4, VY], 44);
        paris(K, eye, [VX + 8, VY - 46, 12, 3.2]);
        const lx = VX - 1.25;
        const hx = VX + 1.25;
        const cyc = t % 84;
        const toHugo = cyc < 42;
        const a = (cyc % 42) / 42;
        K.actor(fr.kidLoki, { x: lx, y: VY, ang: 0, anim: toHugo && a < 0.2 ? 'shoot' : 'idle', frame: toHugo && a < 0.2 ? 1 : undefined, k: 0.72, light: [1.05, 0.9, 0.8] });
        K.actor(fr.kidHugo, { x: hx, y: VY, ang: Math.PI, anim: !toHugo && a < 0.2 ? 'shoot' : 'idle', frame: !toHugo && a < 0.2 ? 1 : undefined, k: 0.72, light: [1.05, 0.9, 0.8] });
        const from = toHugo ? lx + 0.25 : hx - 0.25;
        const to = toHugo ? hx - 0.25 : lx + 0.25;
        K.ball(lerp(from, to, a), VY + 0.05, 0.07 + Math.sin(a * Math.PI) * 0.35, { k: 0.6 });
        st.sun = [VX + 8, 12, VY - 46];
      } else if (phase === 2) {
        // A PROMESSA: sentados no muro de pedra, contra o sol; a grua sobe devagar
        K.expo(1.0);
        const k = easeIO(seg(t, 0, 170));
        const eye = [lerp(VX + 2.2, VX + 1.4, k), lerp(0.75, 1.1, k), lerp(VY + 2.6, VY + 2.9, k)];
        K.cam(eye, [VX, lerp(0.85, 1.4, k), VY - 4], 44);
        paris(K, eye, [VX, VY - 46, 11, 4.5]);
        K.box({ x0: VX - 6, y0: VY - 0.3, x1: VX + 6, y1: VY + 0.3, z0: 0, z1: 0.5, img: stonePx(), light: [0.62, 0.42, 0.3] });
        K.actor(fr.kidLoki, { x: VX - 0.36, y: VY, seat: 0.46, anim: 'sit', ang: -Math.PI / 2, k: 0.72, light: [0.5, 0.32, 0.22] });
        K.actor(fr.kidHugo, { x: VX + 0.36, y: VY, seat: 0.46, anim: 'sit', ang: -Math.PI / 2, k: 0.72, light: [0.5, 0.32, 0.22] });
        st.sun = [VX, 11, VY - 46];
      } else {
        // A FRANÇA DESPERTA: de volta à final; os dois ajoelhados se levantam de uma vez
        K.expo(0.92);
        const up = t >= LK_RISE;
        const k = easeIO(seg(t, 0, 150));
        const eye = shake(K, [lerp(53.3, 52.9, k), lerp(0.22, 0.46, k), lerp(15.25, 15.5, k)], f * 2, up ? 0.035 * Math.max(0, 1 - (t - LK_RISE) / 30) : 0.002, 5);
        K.cam(eye, [53, lerp(0.8, 0.7, k), 12.6], lerp(44, 48, k));
        K.actor(fr.loki, { x: 52.42, y: 12.6, ang: Math.PI / 2, view: 'front', k: 0.92, anim: up ? 'idle' : 'kneel_one', light: up ? [0.9, 1.0, 1.18] : [0.6, 0.65, 0.8] });
        K.actor(fr.hugo, { x: 53.58, y: 12.6, ang: Math.PI / 2, view: 'front', left: true, k: 0.92, anim: up ? 'idle' : 'kneel_one', light: up ? [1.15, 0.92, 1.05] : [0.7, 0.6, 0.72] });
        st.loki = [52.42, 0.55, 12.6];
        st.hugo = [53.58, 0.55, 12.6];
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = K.st || {};
      const scr = (p) => (p ? K.screen(p[0], p[1], p[2]) : null);
      if (phase === 0) {
        towerFlares(ctx, K, S, 0.8);
        // a lembrança chegando: a imagem esquenta e clareia até o branco
        const w = easeIn(seg(t, 34, 80));
        if (w > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'color';
          ctx.globalAlpha = 0.5 * w;
          ctx.fillStyle = '#c2581a';
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
        CE.cineFlash(ctx, W, H, easeIn(seg(t, 56, 80)), '#fff1d6');
        CE.cineSfx(S, 40, 'memory', () => window.SFX?.whoosh?.());
      } else if (phase === 1) {
        flareAt(ctx, S, scr(st.sun ? [st.sun[0], st.sun[1], st.sun[2]] : null), 0.6, '255,214,160');
        CE.espMemory(ctx, S, 1);
        CE.luckKicker(ctx, 40, top + 30, 'PARIS • ANOS ATRÁS', seg(t, 12, 40), '#fde68a');
        CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 16), '#fff1d6');
      } else if (phase === 2) {
        flareAt(ctx, S, scr(st.sun ? [st.sun[0], st.sun[1], st.sun[2]] : null), 0.8, '255,214,160');
        if (t > 76) cutFists(ctx, S, seg(t, 76, 86), seg(t, 76, 166));
        CE.espMemory(ctx, S, 1);
        CE.cineSfx(S, 110, 'fist', () => window.SFX?.kick?.(0.4));
      } else {
        towerFlares(ctx, K, S, 1);
        const up = t >= LK_RISE;
        const l = scr(st.loki);
        const h = scr(st.hugo);
        // contraluz: o azul do Loki e o rosa do Hugo acendem atrás deles quando levantam
        const g = up ? 1 - seg(t, LK_RISE + 40, LK_RISE + 76) * 0.5 : 0.25;
        if (l) CE.cineGlow(ctx, l.x, l.y, 150, 'rgba(56,189,248,0.32)', g);
        if (h) CE.cineGlow(ctx, h.x, h.y, 150, 'rgba(236,72,153,0.32)', g);
        if (!up) bwBlue(ctx, W, H, 0.85);
        else bwBlue(ctx, W, H, 1, { inside: false, x: W / 2, y: (top + bot) / 2, r: ease(seg(t, LK_RISE, LK_RISE + 18)) * W * 1.3 });
        if (t >= LK_RISE && t < LK_RISE + 1.2) impactFrame(ctx, W, H);
        if (up) CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(t, LK_RISE + 1, LK_RISE + 9)), '#fff1d6');
        CE.cineFlash(ctx, W, H, 1 - seg(t, 0, 12), '#fff1d6');
        CE.cineSfx(S, LK_RISE, 'awake', () => window.SFX?.kick?.(1));
      }
    }
  });
})();
