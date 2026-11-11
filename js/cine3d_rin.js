// ============================================================================
// CUTSCENES EM 3D — o rival mortal (js/cine_rin.js) e a engrenagem do Hugo (js/cine_hugo.js),
// refeitas como cinema no padrão do gol da Sub-20 (js/cine3d_u20.js; regras em
// docs/DIRECAO_DE_ARTE.md): bonecos em planos abertos e médios, câmera sempre viva, closes só
// em quadros de mangá em pixel art (mão, gota, engrenagem, chuteira), pouco texto.
// Kit: js/cine3d_kit.js.
//   sae_interview • a coletiva do Sae na sala de imprensa (o saguão montado como a sala do
//                   Estádio Nacional, onde a conversa acontece) → o SEU nome → no vestiário,
//                   o Rin ouvindo pela TV, sentado com a toalha → algo se parte
//   rin_rival     • o vestiário: uma luz acesa em cima do Rin → "pra nós dois?" → a lâmpada
//                   estoura → ele se levanta no escuro → "VOCÊ É O MEU RIVAL."
//   hugo_gears    • a final da Copa Sub-20, no campo: o Hugo encosta do seu lado, as
//                   engrenagens (em quadros de mangá) e ele dispara no Fluxo
// Aqui os pontos são [x, y, z] (z = altura).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;

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
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };

  const RIN_C = '#22d3ee';
  const SAE_C = '#f9a8d4';
  const YOU_C = '#00f5d4';
  const NARR_C = '#94a3b8';
  const REP_C = '#facc15';
  const PINK = '#ec4899';
  const PAPER = '#eef2f7';
  const INK = '#0b0f19';
  const PIX = 6; // pixel dos quadros de mangá (a escala dos bonecos)

  // ---------------------------------------------------------------- ajudantes 3D
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  // (o kit guarda os bonecos pelo nome: boneco sem nome ganha um, senão dois sem nome viram o mesmo)
  const act = (K, who, p, o = {}) => {
    if (who && typeof who === 'object' && !who.name) who = Object.assign({}, who, { name: '_' + (o.id || '') });
    return K.actor(who, Object.assign({ x: p[0], y: p[1], z: p[2] || 0 }, o));
  };
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp, p[2] + K.noise(f, seed + 7) * amp * 0.6];
  // os dois olhos de quem está em p (altura z) vistos da câmera: [esquerda, direita] na tela
  // e quantos px vale 1 unidade da pixel art do boneco
  const UNIT = 0.0273; // 1 unidade da pixel art em ladrilhos (boneco k 0,9)
  const eyesAt = (K, p, z) => {
    const c = K.c;
    let rx = -(c.look[2] - c.eye[2]);
    let ry = c.look[0] - c.eye[0];
    const l = Math.hypot(rx, ry) || 1;
    rx /= l;
    ry /= l;
    const a = K.screen(p[0] - rx * 3.5 * UNIT, z, p[1] - ry * 3.5 * UNIT);
    const b = K.screen(p[0] + rx * 3.5 * UNIT, z, p[1] + ry * 3.5 * UNIT);
    if (!a || !b) return null;
    const L = a.x < b.x ? a : b;
    const R = a.x < b.x ? b : a;
    return { L, R, u: Math.abs(R.x - L.x) / 7, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };
  // A cena guarda pontos do MUNDO e o overlay projeta na tela (a matriz da câmera, K.VP, só
  // fica pronta depois do desenho 3D): wp = um ponto, eyesW = os dois olhos de alguém
  const wp = (p) => (p ? { __w: p } : null);
  const eyesW = (p, z) => ({ __eyes: [p, z] });
  const resolve = (K, v) => {
    if (!v || typeof v !== 'object') return v;
    if (v.__w) return K.screen(v.__w[0], v.__w[2] || 0, v.__w[1]);
    if (v.__eyes) return eyesAt(K, v.__eyes[0], v.__eyes[1]);
    if (Array.isArray(v)) return v.map((x) => resolve(K, x));
    const o = {};
    for (const k in v) o[k] = resolve(K, v[k]);
    return o;
  };
  // retângulo de cantos redondos (o roundRect do canvas não existe em navegador antigo)
  const rrect = (g, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  const darken = (ctx, S, a) => {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(a);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, S.W, S.H);
    ctx.restore();
  };

  // ---------------------------------------------------------------- quadros de mangá (pixel)
  // a mão fechando com força (na toalha ou na beira do banco); o = { skin, cloth, bg, poly, from }
  function cutHand(ctx, S, kIn, q, o) {
    const CA = CE.ART;
    if (!CA || kIn <= 0) return;
    CA.panel(
      ctx,
      o.poly,
      (b, g) => {
        g.fillStyle = o.bg || '#0b1424';
        g.fillRect(b.x, b.y, b.w, b.h);
        if (o.lines) CA.speedRadial(g, b.x + b.w * 0.5, b.y + b.h * 0.55, S.W, S.H, { color: o.lines, inner: b.h * 0.34, n: 40, thick: 1.2 });
        const s = b.h / 10;
        const cx = b.x + b.w * 0.5 + Math.sin(q * 90) * s * 0.06 * q;
        const cy = b.y + b.h * 0.56;
        // o pano (dobras puxadas na direção da mão)
        g.fillStyle = o.cloth || '#97a5bb';
        g.beginPath();
        g.moveTo(b.x - 10, cy + s * 1.6);
        g.quadraticCurveTo(cx - s * 3, cy - s * (0.6 + q * 0.8), cx, cy + s * 0.2);
        g.quadraticCurveTo(cx + s * 3, cy - s * (0.6 + q * 0.8), b.x + b.w + 10, cy + s * 1.4);
        g.lineTo(b.x + b.w + 10, b.y + b.h + 10);
        g.lineTo(b.x - 10, b.y + b.h + 10);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(15,23,42,0.45)';
        g.lineWidth = s * 0.18;
        for (let i = -2; i <= 2; i++) {
          g.beginPath();
          g.moveTo(cx + i * s * 1.6, b.y + b.h);
          g.quadraticCurveTo(cx + i * s * 0.8, cy + s * 1.4, cx + i * s * 0.2, cy + s * 0.6);
          g.stroke();
        }
        // os dedos apertando (os nós dos dedos clareiam com a força)
        const skin = o.skin || '#f1c9a5';
        const knuckle = q > 0.6 ? '#fde7d4' : skin;
        g.lineWidth = s * 0.22;
        g.strokeStyle = INK;
        for (let i = 0; i < 4; i++) {
          const fx = cx - s * 1.9 + i * s * 1.05;
          const fy = cy - s * (0.9 + (i === 1 || i === 2 ? 0.25 : 0)) + (1 - ease(q * 1.4)) * s * 0.6;
          g.fillStyle = skin;
          g.beginPath();
          rrect(g, fx, fy, s * 1.0, s * 1.9, s * 0.45);
          g.fill();
          g.stroke();
          g.fillStyle = knuckle;
          g.fillRect(fx + s * 0.2, fy + s * 0.2, s * 0.6, s * 0.35);
        }
        // o polegar por cima
        g.fillStyle = skin;
        g.beginPath();
        rrect(g, cx - s * 2.3, cy + s * 0.5, s * 2.6, s * 0.95, s * 0.45);
        g.fill();
        g.stroke();
        CA.halftone(g, b.x, b.y, b.w, b.h * 0.45, { color: 'rgba(2,6,23,0.55)', step: 12, from: 'top', max: 0.8 });
      },
      { k: kIn, from: o.from || [0, 40], pixel: PIX }
    );
  }
  // uma gota caindo da ponta da toalha até o chão do vestiário (quadro calmo, reto)
  function cutDrop(ctx, S, kIn, u, o) {
    const CA = CE.ART;
    if (!CA || kIn <= 0) return;
    CA.panel(
      ctx,
      o.poly,
      (b, g) => {
        g.fillStyle = '#0c1424';
        g.fillRect(b.x, b.y, b.w, b.h);
        // a ponta da toalha em cima e o piso embaixo
        g.fillStyle = '#5b6b84';
        g.beginPath();
        g.moveTo(b.x + b.w * 0.3, b.y - 4);
        g.lineTo(b.x + b.w * 0.72, b.y - 4);
        g.lineTo(b.x + b.w * 0.56, b.y + b.h * 0.16);
        g.lineTo(b.x + b.w * 0.48, b.y + b.h * 0.12);
        g.closePath();
        g.fill();
        const fy = b.y + b.h * 0.8;
        g.fillStyle = '#111827';
        g.fillRect(b.x, fy, b.w, b.h);
        g.fillStyle = 'rgba(56,189,248,0.25)';
        g.fillRect(b.x, fy, b.w, 6);
        const gx = b.x + b.w * 0.52;
        const fall = 34;
        const k = u % 70;
        if (k < fall) {
          const y = lerp(b.y + b.h * 0.15, fy - 10, easeIn(k / fall));
          g.fillStyle = '#bae6fd';
          g.fillRect(gx - 15, y, 30, 42);
          g.fillRect(gx - 9, y - 12, 18, 14);
          g.fillStyle = '#f0f9ff';
          g.fillRect(gx - 9, y + 6, 10, 10);
        } else {
          const a = k - fall;
          g.strokeStyle = `rgba(186,230,253,${0.9 * (1 - seg(a, 0, 30))})`;
          g.lineWidth = 12;
          g.beginPath();
          g.ellipse(gx, fy + 4, 18 + a * 4.2, 5 + a * 1.1, 0, 0, TAU);
          g.stroke();
          g.fillStyle = `rgba(186,230,253,${1 - seg(a, 0, 16)})`;
          [-1, 1].forEach((sd) => g.fillRect(gx + sd * (12 + a * 2) - 8, fy - 16 - a * 2.4 + a * a * 0.14, 16, 16));
        }
      },
      { k: kIn, from: o.from || [0, 0], pixel: PIX, border: '#e2e8f0' }
    );
  }

  // =========================================================================
  // 1) A COLETIVA DO SAE (sae_interview)
  // =========================================================================
  // figurantes da imprensa (repórteres e fotógrafos de terno), montados uma vez
  let PRESS = null;
  const press = () => {
    if (PRESS) return PRESS;
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    const cols = ['#111827', '#1f2937', '#3f2a1d', '#0f172a', '#52525b', '#78350f'];
    const suits = ['#1f2937', '#111827', '#334155', '#3f3f46', '#1e293b'];
    let s = 11;
    const r = (n) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % n);
    PRESS = [];
    const rows = [[11.75, 21.7, 28.4, 0.68], [12.5, 21.4, 28.7, 0.74], [13.05, 20.8, 29.3, 0.8]];
    rows.forEach(([y, x0, x1, step], row) => {
      for (let x = x0 + (row % 2) * 0.3; x <= x1; x += step) {
        if (row === 2 && x > 23.7 && x < 26.3) continue; // a mesinha do saguão
        const hc = cols[r(cols.length)];
        PRESS.push({ x, y: y + (r(10) - 5) * 0.02, row, cam: r(3) === 0, cd: { name: 'reporter' + PRESS.length, skinColor: skins[r(skins.length)], hairColor: hc, hairSecondary: hc, eyeColor: '#1e293b', hairStyle: hairs[r(hairs.length)], outfit: 'casual', jerseyPrimary: suits[r(suits.length)], jerseySecondary: '#e5e7eb', number: 1 } });
      }
    });
    return PRESS;
  };
  // painel de fundo da coletiva (logotipos repetidos), pronto uma vez
  let WALL = null;
  const pressWall = () => {
    if (WALL) return WALL;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 96;
    const g = cv.getContext('2d');
    // (a placa virada para o sul mostra a textura espelhada: desenha espelhado)
    g.translate(256, 0);
    g.scale(-1, 1);
    g.fillStyle = '#0b1d4d';
    g.fillRect(0, 0, 256, 96);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const x = 26 + col * 51 + (row % 2) * 25;
        const y = 12 + row * 24;
        const k = (row + col) % 3;
        g.fillStyle = k === 0 ? '#ef4444' : k === 1 ? '#f8fafc' : '#60a5fa';
        g.font = '900 9px "Segoe UI", sans-serif';
        g.fillText(k === 0 ? 'JFU' : k === 1 ? 'JAPAN' : 'SUB-20', x, y);
      }
    }
    g.fillStyle = '#ef4444';
    g.fillRect(0, 92, 256, 4);
    WALL = cv;
    return cv;
  };
  // A sala de imprensa no saguão: palco, painel, mesa com microfones e a imprensa
  const SAE_AT = [25, 10.1];
  function pressRoom(K, o = {}) {
    K.quad({ x: 25, y: 9.12, z: 0, w: 4.4, h: 1.6, ang: Math.PI / 2, img: pressWall() });
    K.box({ x0: 22.9, y0: 9.15, x1: 27.1, y1: 10.95, z0: 0, z1: 0.2, color: '#0b1220', top: '#152238' });
    K.box({ x0: 23.6, y0: 10.38, x1: 26.4, y1: 10.82, z0: 0.2, z1: 0.6, color: '#0b1d4d', top: '#1b2a4a' });
    K.floor({ x0: 23.6, y0: 10.81, x1: 26.4, y1: 10.83, z: 0.2, color: '#ef4444', em: true });
    // microfones (haste + cabeça colorida com o logo da TV)
    [[24.45, '#ef4444'], [24.7, '#38bdf8'], [25.3, '#facc15'], [25.55, '#22c55e'], [25.78, '#f8fafc']].forEach(([x, col], i) => {
      const y = 10.5 + (i % 2) * 0.05;
      K.box({ x0: x - 0.01, y0: y - 0.01, x1: x + 0.01, y1: y + 0.01, z0: 0.6, z1: 0.66, color: '#111827' });
      K.box({ x0: x - 0.03, y0: y - 0.03, x1: x + 0.03, y1: y + 0.03, z0: 0.64, z1: 0.7, color: col, top: '#1f2937' });
    });
    // câmeras de TV nos tripés, nos cantos
    [[21.6, 12.1], [28.4, 12.1]].forEach(([x, y]) => {
      K.box({ x0: x - 0.03, y0: y - 0.03, x1: x + 0.03, y1: y + 0.03, z0: 0, z1: 0.85, color: '#111827' });
      K.box({ x0: x - 0.12, y0: y - 0.18, x1: x + 0.12, y1: y + 0.16, z0: 0.85, z1: 1.02, color: '#1f2937', top: '#374151' });
    });
    K.box({ x0: SAE_AT[0] - 0.13, y0: SAE_AT[1] - 0.16, x1: SAE_AT[0] + 0.13, y1: SAE_AT[1] + 0.1, z0: 0.2, z1: 0.42, color: '#111827', top: '#1f2937' });
    K.box({ x0: SAE_AT[0] - 0.13, y0: SAE_AT[1] - 0.18, x1: SAE_AT[0] + 0.13, y1: SAE_AT[1] - 0.14, z0: 0.42, z1: 0.8, color: '#111827' });
    act(K, CE.rincCast().sae, [SAE_AT[0], SAE_AT[1], 0.2], { id: 'sae', face: [25, 16], anim: 'sit', seat: 0.22, light: o.saeLight });
    if (o.noCrowd) return;
    press().forEach((p, i) => {
      if (o.skip && Math.hypot(p.x - o.skip[0], p.y - o.skip[1]) < o.skip[2]) return;
      act(K, p.cd, [p.x, p.y, 0], { id: 'p' + i, face: [25 + (p.x - 25) * 0.3, 10.1], frame: 0, k: 0.86, light: o.crowdLight });
    });
  }
  // a TV do vestiário: a coletiva ao vivo em pixel (o Sae na mesa e a tarja com o seu nome)
  let TV = null;
  const tvCv = (name) => {
    if (TV && TV.key === name) return TV;
    const cv = TV || document.createElement('canvas');
    cv.width = 96;
    cv.height = 60;
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#0b1d4d';
    g.fillRect(0, 0, 96, 60);
    for (let y = 4; y < 34; y += 8) for (let x = (y % 16) / 2; x < 96; x += 12) {
      g.fillStyle = (x + y) % 3 ? '#1e3a8a' : '#7f1d1d';
      g.fillRect(x, y, 6, 2);
    }
    // o Sae (cabelo rosa-escuro, terno da seleção) atrás da mesa
    const sae = CE.rincCast().sae;
    g.fillStyle = sae.jerseyPrimary || '#f8fafc';
    g.fillRect(40, 27, 16, 10);
    g.fillStyle = sae.skinColor || '#f1c9a5';
    g.fillRect(43, 17, 10, 10);
    g.fillStyle = sae.hairColor || '#7f1d1d';
    g.fillRect(42, 14, 12, 5);
    g.fillRect(42, 17, 2, 6);
    g.fillRect(52, 17, 2, 4);
    g.fillStyle = '#0f172a';
    g.fillRect(0, 34, 96, 10);
    g.fillStyle = '#ef4444';
    g.fillRect(0, 34, 96, 1);
    g.fillStyle = '#111827';
    [38, 46, 54].forEach((x) => g.fillRect(x, 30, 2, 4));
    // a tarja
    g.fillStyle = '#020617';
    g.fillRect(0, 46, 96, 14);
    g.fillStyle = '#dc2626';
    g.fillRect(0, 46, 4, 14);
    CE.finPixelText(g, `"${name}."`, 50, 53, 1, '#f8fafc', 'center', 88);
    // linhas de TV
    g.fillStyle = 'rgba(148,163,184,0.12)';
    for (let y = 0; y < 60; y += 2) g.fillRect(0, y, 96, 1);
    cv.key = name;
    cv.fresh = true;
    TV = cv;
    return cv;
  };
  // o Rin SENTADO com a toalha na cabeça: o tronco desce por cima das pernas, num canvas
  // pronto uma vez (pixel art na escala dos bonecos); em pé no mundo como um boneco
  let SEAT = null;
  const seatCv = () => {
    const { rin } = CE.rincCast();
    const key = JSON.stringify([rin.hairColor, rin.skinColor, rin.jerseyPrimary]);
    if (SEAT && SEAT.key === key) return SEAT;
    const e = CE.finSprEntry(rin, 180, {});
    const cv = SEAT || document.createElement('canvas');
    cv.width = e.cv.width;
    cv.height = e.cv.height;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    g.imageSmoothingEnabled = false;
    const feet = e.pad + 180 * 0.87;
    const up = CE.rincSeat(g, rin, cv.width / 2, feet, 180, {});
    CE.rincTowel(g, cv.width / 2, up, 180, '#97a5bb');
    cv.key = key;
    cv.pad = e.pad;
    SEAT = cv;
    return cv;
  };
  // tamanho no mundo: 5 px por unidade da arte (base 180) → 1 px = UNIT / 5 ladrilhos
  const RIN_SEAT = [42.42, 21.2];
  const SEAT_EYE = 0.485; // altura dos olhos dele sentado
  const seatRin = (K, light, dy = 0) => {
    const cv = seatCv();
    const s = UNIT / 5;
    const w = cv.width * s;
    const h = cv.height * s;
    const foot = (cv.height - (cv.pad + 33 * 5)) / cv.height;
    K.sprite(cv, { x: RIN_SEAT[0], y: RIN_SEAT[1], z: dy, w, h, foot, light, shadow: 0.2 });
  };
  // a TV do vestiário na parede sul, perto da porta (a luz dela bate no Rin)
  const TV_AT = [40.3, 22.96];
  function lockerTv(K, name, flick) {
    K.box({ x0: TV_AT[0] - 0.5, y0: TV_AT[1] - 0.02, x1: TV_AT[0] + 0.5, y1: TV_AT[1] + 0.04, z0: 0.7, z1: 1.34, color: '#05070c' });
    const tv = tvCv(name);
    // (virada para o norte, para dentro do vestiário)
    K.quad({ x: TV_AT[0], y: TV_AT[1] - 0.03, z: 0.74, w: 0.92, h: 0.56, ang: Math.PI / 2, img: tv, em: true, dirty: !!tv.fresh, alpha: flick });
    tv.fresh = false;
    K.floor({ x0: TV_AT[0] - 1.4, y0: TV_AT[1] - 2.2, x1: TV_AT[0] + 1.4, y1: TV_AT[1] - 0.05, z: 0.01, color: '#38bdf8', em: true, alpha: 0.07 * flick });
  }
  let SRC = null; // o quadro congelado na hora em que "algo se parte" (vira os cacos)
  let SRC_KEY = '';

  CE.registerCine3D('sae_interview', {
    phases: [190, 180, 180, 170, 230],
    music: 'dread',
    title: '🎤 A COLETIVA DO SAE',
    tags: ['PLANO 1 • CEM CÂMERAS', 'PLANO 2 • AO VIVO', 'PLANO 3 • O NOME', 'PLANO 4 • O IRMÃO', 'PLANO 5 • ALGO SE PARTIU'],
    get subs() {
      const nm = CE.cinePlayerName().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
      const nameNeed = 30 + `SAE ITOSHI "${nm}."`.length * 3.4;
      const ask = 84 + nameNeed <= 180;
      return [
        [{ from: 0, who: 'REPÓRTER', text: '"Alguém do Blue Lock te impressionou?"', color: REP_C }],
        [{ from: 20, who: 'SAE ITOSHI', text: '"...Tem um. Muito bom."', color: SAE_C }],
        ask
          ? [
              { from: 0, to: 80, who: 'REPÓRTER', text: '"Quem?"', color: REP_C },
              { from: 84, who: 'SAE ITOSHI', text: `"${nm}."`, color: SAE_C }
            ]
          : [{ from: Math.max(0, Math.min(80, Math.floor(180 - nameNeed))), who: 'SAE ITOSHI', text: `"${nm}."`, color: SAE_C }],
        [{ from: 30, who: 'NARRADOR', text: 'O irmão disse outro nome.', color: NARR_C }],
        [
          { from: 6, to: 80, who: 'RIN ITOSHI', text: '"...o quê?"', color: RIN_C },
          { from: 110, who: 'NARRADOR', text: 'Algo se partiu.', color: NARR_C }
        ]
      ];
    },
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    theme: 'u20_national',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      if (phase === 0) {
        // CEM CÂMERAS: a grua entra por cima da imprensa até a mesa
        K.expo(0.85);
        pressRoom(K);
        const k = easeIO(t / 190);
        cam(K, shake(K, mixP([25.4, 18.6, 1.5], [25.15, 16.4, 1.64], k), f * 0.4, 0.006), mixP([25, 10.4, 0.5], [25, 10.1, 0.74], k), lerp(46, 28, k));
        st.pops = press().filter((p) => p.cam).map((p) => [wp([p.x, p.y, 0.95]), p.row === 2 ? 9 : 7]);
      } else if (phase === 1) {
        // AO VIVO: de lado, do palco — o Sae de perfil atrás dos microfones, a imprensa ao fundo
        K.expo(0.8);
        // (do canto do palco, na altura da mesa: o Sae de perfil, a imprensa ao fundo)
        const k = easeIO(t / 180);
        pressRoom(K, { saeLight: [1.05, 1.12, 1.25] });
        cam(K, shake(K, [lerp(27.75, 27.5, k), lerp(10.4, 10.6, k), 0.8], f * 0.3, 0.003), [25.0, 10.32, 0.6], lerp(45, 41, k));
        st.pops = press().filter((p) => p.cam).map((p) => [wp([p.x, p.y, 0.95]), 7]);
      } else if (phase === 2) {
        const hit = 80;
        if (t < hit) {
          // o silêncio: por cima da imprensa, a câmera chegando devagar no Sae (sala mais escura)
          K.expo(0.62);
          pressRoom(K, { saeLight: [1.0, 1.08, 1.25], crowdLight: [0.5, 0.55, 0.7] });
          const k = easeIO(t / hit);
          cam(K, shake(K, [25.0, lerp(14.6, 14.2, k), 1.7], f * 0.3, 0.002), [25.0, 10.15, 0.62], lerp(32, 27, k));
        } else {
          // O NOME: do canto do palco, a imprensa inteira disparando as câmeras
          K.expo(0.95);
          pressRoom(K, { crowdLight: [1.1, 1.12, 1.2] });
          const u = t - hit;
          const k = easeIO(u / 100);
          cam(K, shake(K, [lerp(27.7, 27.5, k), lerp(9.75, 9.9, k), 1.45], f * 2, 0.016 * (1 - seg(u, 0, 26)), 4), [24.4, 12.6, 0.55], lerp(56, 52, k));
          st.crowd = press().map((p) => wp([p.x, p.y, 0.95]));
          st.u = u;
        }
      } else {
        // O IRMÃO / ALGO SE PARTIU: no vestiário, só a TV acesa; o Rin sentado com a toalha
        K.expo(0.5);
        const flick = 0.85 + 0.15 * Math.sin(t * 0.21) * Math.sin(t * 0.07);
        lockerTv(K, CE.cinePlayerName(), flick);
        const L = [0.5 * flick, 0.66 * flick, 0.95 * flick];
        seatRin(K, L);
        if (phase === 3) {
          // da porta: o vestiário escuro, a TV ligada e ele sozinho no banco
          const k = easeIO(t / 170);
          cam(K, shake(K, mixP([38.1, 18.0, 1.15], [38.6, 18.4, 1.0], k), f * 0.3, 0.003), mixP([41.2, 21.6, 0.55], [41.6, 21.3, 0.5], k), lerp(48, 42, k));
        } else {
          // de lado, chegando devagar: o Rin parado, a TV piscando nele
          const k = easeIO(t / 230);
          cam(K, shake(K, mixP([39.9, 20.0, 0.62], [40.25, 20.35, 0.58], k), f * 0.3, 0.003), [RIN_SEAT[0], RIN_SEAT[1] + 0.1, 0.42], lerp(44, 38, k));
          st.rin = wp([RIN_SEAT[0], RIN_SEAT[1], SEAT_EYE]);
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const st = resolve(K, K.st || {});
      if (phase === 0) {
        if (st.pops) CE.rincPops(ctx, st.pops.filter((a) => a[0]).map(([s, r]) => [s.x, s.y, r]), t, 11, 70, 6);
        CE.finKicker(ctx, 40, top + 30, 'ESTÁDIO NACIONAL • SALA DE IMPRENSA', seg(t, 8, 50));
        CE.finKicker(ctx, 40, top + 58, 'LOGO DEPOIS DO BLUE LOCK x SUB-20', seg(t, 36, 84), '#38bdf8');
      } else if (phase === 1) {
        if (st.pops) CE.rincPops(ctx, st.pops.filter((a) => a[0]).map(([s, r]) => [s.x, s.y, r]), t, 19, 90, 6);
        // o "REC" discreto da transmissão
        if (Math.floor(t / 30) % 2) {
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(W - 96, top + 26, 10, 10);
        }
        CE.finKicker(ctx, W - 80, top + 31, 'AO VIVO', seg(t, 4, 20), '#ef4444');
      } else if (phase === 2) {
        const hit = 80;
        if (t < hit) {
          darken(ctx, S, 0.18 * seg(t, 10, 60));
          return;
        }
        const u = t - hit;
        // as câmeras disparam todas de uma vez (cada uma uma vez), depois aos poucos
        const crowd = st.crowd || [];
        for (let i = 0; i < 34 && crowd.length; i++) {
          const at = i < 18 ? rnd(i, 63) * 6 : 10 + rnd(i, 63) * 80;
          const a = 1 - (u - at) / 8;
          if (u < at || a <= 0) continue;
          const p = crowd[Math.floor(rnd(i, 61) * crowd.length)];
          if (!p) continue;
          CE.cineGlow(ctx, p.x, p.y, 60, 'rgba(226,232,240,0.5)', a * 0.8);
          CE.finSparkle(ctx, p.x, p.y, 8 + rnd(i, 64) * 10, a);
        }
        if (u >= 0) CE.cineFlash(ctx, W, H, 0.45 * (1 - seg(u, 0, 10)));
        CE.cineSfx(S, hit, 'nome', () => window.SFX?.kick?.(0.8));
      } else if (phase === 3) {
        CE.cineDust(ctx, W, H, t, 18, 'rgba(186,230,253,0.25)', 9);
        CE.finKicker(ctx, 40, top + 30, 'VESTIÁRIO DO BLUE LOCK • AO MESMO TEMPO', seg(t, 20, 70), '#38bdf8');
      } else {
        saeBreak(ctx, S, st);
      }
    }
  });

  // PLANO 5 da coletiva: "...o quê?" → a mão aperta a toalha (quadro em pixel) → a imagem
  // racha a partir dele e os cacos caem no preto
  function saeBreak(ctx, S, st) {
    const { W, H, t, top, bot } = S;
    const crackAt = 118;
    const fallAt = 160;
    if (t < crackAt) {
      CE.cineDust(ctx, W, H, t, 14, 'rgba(186,230,253,0.2)', 9);
      if (t > 40) {
        const { rin } = CE.rincCast();
        cutHand(ctx, S, seg(t, 40, 48), seg(t, 40, crackAt), { poly: [[W * 0.52, top + 20], [W - 22, top + 14], [W - 22, bot - 20], [W * 0.46, bot - 26]], from: [60, 0], skin: rin.skinColor, cloth: '#97a5bb' });
      }
      return;
    }
    // congela o quadro da rachadura (uma vez por vez que a cena toca), sem o quadro da mão
    if (!SRC) SRC = document.createElement('canvas');
    const key = `${CE._cineRun}|${W}x${H}`;
    const c0 = st.rin || { x: W * 0.55, y: H * 0.45 };
    if (SRC_KEY !== key || SRC.width !== W || SRC.height !== H) {
      SRC.width = W;
      SRC.height = H;
      SRC.getContext('2d').drawImage(ctx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, W, H);
      SRC_KEY = key;
      SRC.eye = { cx: c0.x, cy: c0.y };
    }
    const eye = SRC.eye;
    const shards = CE.getShards(W, H, eye.cx, eye.cy);
    if (!shards.list[0].bb) {
      shards.list.forEach((sh) => {
        const xs = sh.pts.map((p) => p[0]);
        const ys = sh.pts.map((p) => p[1]);
        const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 2);
        const y0 = Math.max(0, Math.floor(Math.min(...ys)) - 2);
        const x1 = Math.min(W, Math.ceil(Math.max(...xs)) + 2);
        const y1 = Math.min(H, Math.ceil(Math.max(...ys)) + 2);
        sh.bb = [x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)];
      });
    }
    // cada caco recortado UMA vez (o quadro já está congelado)
    const bakeKey = `${key}|${shards.key}|3d2`;
    const bake = (sh) => {
      if (sh.bakeKey === bakeKey) return;
      const [bx, by, bw, bh] = sh.bb;
      const cv = sh.cv || document.createElement('canvas');
      cv.width = bw;
      cv.height = bh;
      const g = cv.getContext('2d');
      g.save();
      g.translate(-bx, -by);
      poly(g, sh.pts);
      g.clip();
      g.drawImage(SRC, bx, by, bw, bh, bx, by, bw, bh);
      g.restore();
      sh.cv = cv;
      sh.bakeKey = bakeKey;
    };
    const drawShard = (sh, dx, dy, rot, sc, dark, edge) => {
      bake(sh);
      ctx.save();
      ctx.translate(sh.cx + dx, sh.cy + dy);
      if (rot) ctx.rotate(rot);
      if (sc !== 1) ctx.scale(sc, sc);
      ctx.translate(-sh.cx, -sh.cy);
      ctx.drawImage(sh.cv, sh.bb[0], sh.bb[1]);
      poly(ctx, sh.pts);
      if (dark > 0) {
        ctx.fillStyle = `rgba(0,0,0,${dark})`;
        ctx.fill();
      }
      if (edge > 0) {
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = `rgba(224,242,254,${edge})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    };
    if (t < fallAt) {
      const u = t - crackAt;
      const sh = CE.cineNoise(S.f * 2.3, 4) * 7 * (1 - seg(u, 0, 22));
      ctx.save();
      ctx.translate(sh, sh * 0.6);
      ctx.drawImage(SRC, 0, 0);
      const rings = Math.min(shards.rings, 1 + Math.floor(u / 4));
      const spread = ease(seg(u, 6, 40)) * 3;
      shards.list.forEach((s, i) => {
        const ring = Math.floor(i / shards.n);
        if (ring >= rings) return;
        drawShard(s, s.vx * spread * (1 + ring * 0.3), s.vy * spread + spread * 0.6, s.vr * spread * 0.5, 1, 0, 0);
      });
      CE.drawCracks(ctx, shards, rings);
      ctx.restore();
      CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(u, 0, 8)), '#e0f2fe');
      CE.cineSfx(S, crackAt, 'crack', () => window.SFX?.kick?.(1));
    } else {
      const fl = t - fallAt;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      CE.cineGlow(ctx, eye.cx, eye.cy, 300, 'rgba(34,211,238,0.18)', 1 - seg(fl, 0, 60));
      shards.list.forEach((s, i) => {
        const ring = Math.floor(i / shards.n);
        const d = Math.max(0, fl - (ring * 7 + rnd(i, 5) * 9));
        const dx = s.vx * 3 * (1 + ring * 0.3) + s.vx * d * 1.6;
        const dy = s.vy * 3 + 2.4 + s.vy * d * 0.7 + 0.085 * d * d;
        if (s.cy + dy - 260 > H) return;
        const sc = 1 / (1 + d * 0.012);
        drawShard(s, dx, dy, s.vr * (2 + d * 1.6), sc, Math.min(0.85, 0.08 * ring + d * 0.012), Math.max(0, 0.85 - d * 0.008));
      });
    }
  }

  // =========================================================================
  // 2) O RIVAL MORTAL (rin_rival) — no vestiário do prédio
  // =========================================================================
  // a luz única pendurada em cima do Rin (lâmpada + cone de luz)
  let CONE = null;
  const coneCv = () => {
    if (CONE) return CONE;
    const cv = document.createElement('canvas');
    cv.width = 32;
    cv.height = 64;
    const g = cv.getContext('2d');
    for (let y = 0; y < 64; y++) {
      const k = y / 63;
      const half = Math.round(2 + k * 14);
      const a = 0.22 * (1 - k * 0.55);
      g.fillStyle = `rgba(219,234,254,${a.toFixed(3)})`;
      g.fillRect(16 - half, y, half * 2, 1);
    }
    CONE = cv;
    return cv;
  };
  const LAMP_Z = 1.5;
  const lamp = (K, power = 1, broken = false) => {
    K.box({ x0: RIN_SEAT[0] - 0.14, y0: RIN_SEAT[1] - 0.14, x1: RIN_SEAT[0] + 0.14, y1: RIN_SEAT[1] + 0.14, z0: LAMP_Z, z1: LAMP_Z + 0.06, color: broken ? '#1f2937' : '#e0f2fe', em: !broken });
    K.box({ x0: RIN_SEAT[0] - 0.01, y0: RIN_SEAT[1] - 0.01, x1: RIN_SEAT[0] + 0.01, y1: RIN_SEAT[1] + 0.01, z0: LAMP_Z + 0.06, z1: LAMP_Z + 0.25, color: '#111827' });
    if (power <= 0.01) return;
    const c = K.c;
    const ang = Math.atan2(c.eye[2] - RIN_SEAT[1], c.eye[0] - RIN_SEAT[0]);
    K.quad({ x: RIN_SEAT[0] - Math.cos(ang) * 0.3, y: RIN_SEAT[1] - Math.sin(ang) * 0.3, z: 0, w: 1.3, h: LAMP_Z, ang, img: coneCv(), em: true, alpha: power });
    K.floor({ x0: RIN_SEAT[0] - 0.75, y0: RIN_SEAT[1] - 0.75, x1: RIN_SEAT[0] + 0.55, y1: RIN_SEAT[1] + 0.75, z: 0.01, color: '#dbeafe', em: true, alpha: 0.08 * power });
  };
  // faíscas da lâmpada estourando (tau = quadros desde o estouro)
  function sparks(K, tau) {
    if (tau < 0 || tau > 60) return;
    for (let i = 0; i < 16; i++) {
      const a = rnd(i, 41) * TAU;
      const v = 0.006 + rnd(i, 42) * 0.012;
      const x = RIN_SEAT[0] + Math.cos(a) * v * tau;
      const y = RIN_SEAT[1] + Math.sin(a) * v * tau;
      const z = LAMP_Z - 0.0006 * tau * tau * (0.6 + rnd(i, 43)) + rnd(i, 44) * 0.004 * tau;
      if (z < 0.02) continue;
      K.box({ x0: x - 0.012, y0: y - 0.012, x1: x + 0.012, y1: y + 0.012, z0: z, z1: z + 0.024, color: i % 3 ? '#fde68a' : '#f8fafc', em: true, alpha: 1 - seg(tau, 30, 60) });
    }
  }
  const YOU_AT = [41.05, 20.75]; // você, de frente para o banco do Rin
  const RIN_UP = [41.6, 20.95]; // onde o Rin para, em pé, na sua frente
  const POP = 92; // a lâmpada estoura (plano 4)

  CE.registerCine3D('rin_rival', {
    phases: [200, 190, 190, 220, 270],
    music: 'dread',
    title: '🩸 O RIVAL MORTAL',
    tags: ['PLANO 1 • UMA LUZ ACESA', 'PLANO 2 • PRA NÓS DOIS?', 'PLANO 3 • NÃO ESQUECE', 'PLANO 4 • O ABISMO', 'PLANO 5 • O RIVAL MORTAL'],
    subs: [
      [{ from: 30, who: 'VOCÊ', text: '"...Obrigado, Rin. Esse gol é de nós dois."', color: YOU_C }],
      [{ from: 30, who: 'RIN ITOSHI', text: '"...Pra nós dois?"', color: RIN_C }],
      [{ from: 14, who: 'RIN ITOSHI', text: '"Não esquece. Eu VOU te matar."', color: RIN_C }],
      [
        { from: 4, to: 70, who: 'VOCÊ', text: '(...Rin?)', color: YOU_C },
        { from: POP + 30, who: 'NARRADOR', text: 'Algo faminto acordou.', color: NARR_C }
      ],
      [{ from: 50, who: 'RIN ITOSHI', text: '"A partir deste momento... VOCÊ É O MEU RIVAL."', color: RIN_C }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const { you, rin } = CE.rincCast();
      const st = (K.st = {});
      if (phase === 0) {
        // UMA LUZ ACESA: da porta — o vestiário apagado, uma luz em cima do Rin; você chegando
        K.expo(0.5);
        const k = easeIO(t / 200);
        cam(K, shake(K, mixP([35.9, 22.3, 1.5], [37.7, 21.5, 1.1], k), f * 0.3, 0.003), mixP([40.6, 19.8, 0.35], [41.6, 20.8, 0.4], k), lerp(50, 40, k));
        const yk = easeIO(seg(t, 20, 170));
        act(K, you, [lerp(38.55, 39.6, yk), lerp(17.25, 18.7, yk), 0], { id: 'y', face: RIN_SEAT, anim: yk > 0 && yk < 1 ? 'run' : 'idle', frame: yk > 0 && yk < 1 ? Math.floor(t * 0.3) : 1, light: [0.42, 0.48, 0.62] });
        seatRin(K, [1.2, 1.3, 1.45]);
        lamp(K, 1);
      } else if (phase === 1) {
        // PRA NÓS DOIS?: de lado, os dois de perfil; os ombros dele tremem
        K.expo(0.55);
        const k = easeIO(t / 190);
        const tremble = t > 34 && t < 110 ? Math.round(Math.sin(t * 1.3)) * 0.004 : 0;
        cam(K, shake(K, mixP([41.55, 17.6, 0.66], [41.85, 17.75, 0.62], k), f * 0.3, 0.003), [41.75, 21.0, 0.48], lerp(42, 38, k));
        act(K, you, [YOU_AT[0], YOU_AT[1], 0], { id: 'y', face: RIN_SEAT, frame: 1, light: [0.34, 0.4, 0.55] });
        seatRin(K, [1.15, 1.25, 1.42], tremble);
        lamp(K, 0.85);
      } else if (phase === 2) {
        // NÃO ESQUECE: de baixo, do chão, de frente para ele — o rosto escondido pela toalha
        K.expo(0.45);
        const k = easeIO(t / 190);
        cam(K, shake(K, mixP([40.05, 22.35, 0.16], [40.3, 22.15, 0.18], k), f * 0.3, 0.003), [RIN_SEAT[0], RIN_SEAT[1], 0.55], 44);
        seatRin(K, [0.95, 1.05, 1.25]);
        lamp(K, 0.7);
      } else if (phase === 3) {
        // O ABISMO: a luz falha e estoura; no escuro, ele se levanta
        const pop = t >= POP;
        const flk = pop ? 0 : t < 30 ? 0.7 : 0.7 * (0.55 + 0.45 * Math.sign(Math.sin(t * 0.9 + Math.sin(t * 0.31) * 3)));
        K.expo(pop ? 0.3 : 0.48);
        const k = easeIO(t / 220);
        const sh = pop ? 0.03 * Math.max(0, 1 - (t - POP) / 30) : 0.003;
        cam(K, shake(K, mixP([40.15, 18.2, 0.72], [40.35, 18.45, 0.68], k), f * 2, sh, 5), [41.8, 21.0, 0.55], 46);
        act(K, you, [YOU_AT[0], YOU_AT[1], 0], { id: 'y', face: RIN_SEAT, frame: 1, light: [0.25, 0.32, 0.45] });
        if (t < POP + 40) seatRin(K, pop ? [0.08, 0.1, 0.14] : [0.9 * flk + 0.2, 1.0 * flk + 0.2, 1.2 * flk + 0.2]);
        else {
          // em pé, só a silhueta (a toalha ficou no banco)
          const rk = ease(seg(t, POP + 40, 200));
          act(K, rin, [lerp(RIN_SEAT[0], 42.15, rk), RIN_SEAT[1] - 0.05, 0], { id: 'rin', face: [YOU_AT[0], YOU_AT[1]], frame: 1, dark: true });
          K.box({ x0: 42.6, y0: 21.0, x1: 42.9, y1: 21.45, z0: 0.26, z1: 0.29, color: '#5b6b84' });
          st.eyes = eyesW([lerp(RIN_SEAT[0], 42.15, rk), RIN_SEAT[1] - 0.05], 0.556);
        }
        lamp(K, flk, pop);
        sparks(K, t - POP);
        st.pop = pop ? t - POP : -1;
        st.lamp = wp([RIN_SEAT[0], RIN_SEAT[1], LAMP_Z]);
      } else {
        // O RIVAL MORTAL: no escuro, ele vem até você e para na sua frente (contraluz da porta)
        K.expo(0.4);
        const rk = easeIO(seg(t, 10, 80));
        const rp = [lerp(42.15, RIN_UP[0], rk), lerp(21.15, RIN_UP[1], rk), 0];
        act(K, rin, rp, { id: 'rin', face: [YOU_AT[0], YOU_AT[1]], anim: rk > 0.02 && rk < 0.98 ? 'run' : 'idle', frame: rk > 0.02 && rk < 0.98 ? Math.floor(t * 0.25) : 1, dark: true, opts: { expr: 'angry' } });
        act(K, you, [YOU_AT[0], YOU_AT[1], 0], { id: 'y', face: [rp[0], rp[1]], frame: 1, light: [0.3, 0.42, 0.6] });
        K.box({ x0: 42.6, y0: 21.0, x1: 42.9, y1: 21.45, z0: 0.26, z1: 0.29, color: '#334155' });
        lamp(K, 0, true);
        // a luz azul do corredor entrando pela porta
        K.floor({ x0: 38.0, y0: 17.1, x1: 41.6, y1: 20.4, z: 0.01, color: '#38bdf8', em: true, alpha: 0.08 });
        const k = easeIO(t / 270);
        cam(K, shake(K, mixP([41.2, 18.05, 0.6], [41.3, 18.45, 0.58], k), f * 0.3, 0.003), [41.33, 20.85, 0.56], lerp(42, 36, k));
        st.eyes = eyesW([rp[0], rp[1]], 0.556);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const st = resolve(K, K.st || {});
      if (phase === 0) {
        CE.cineDust(ctx, W, H, t, 24, 'rgba(226,232,240,0.3)', 9);
        CE.finKicker(ctx, 40, top + 30, 'VESTIÁRIO DO BLUE LOCK • 23:40', seg(t, 8, 50));
      } else if (phase === 1) {
        CE.cineDust(ctx, W, H, t, 16, 'rgba(226,232,240,0.25)', 5);
        // a gota que cai da toalha (quadro calmo, reto)
        if (t > 112) cutDrop(ctx, S, seg(t, 112, 120), t - 112, { poly: [[W - 360, top + 20], [W - 24, top + 20], [W - 24, bot - 24], [W - 360, bot - 24]], from: [0, 30] });
        CE.cineSfx(S, 146, 'gota', () => window.SFX?.blip?.(1760));
      } else if (phase === 2) {
        CE.cineDust(ctx, W, H, t, 14, 'rgba(226,232,240,0.22)', 7);
        // a mão dele apertando a toalha
        if (t > 96) {
          const { rin } = CE.rincCast();
          cutHand(ctx, S, seg(t, 96, 104), seg(t, 96, 190), { poly: [[24, top + 22], [W * 0.46, top + 14], [W * 0.4, bot - 20], [24, bot - 26]], from: [-60, 0], skin: rin.skinColor, cloth: '#97a5bb', lines: 'rgba(34,211,238,0.22)' });
        }
      } else if (phase === 3) {
        if (st.pop >= 0) {
          if (st.lamp) CE.cineGlow(ctx, st.lamp.x, st.lamp.y, 160, 'rgba(254,249,195,0.8)', 1 - seg(st.pop, 0, 14));
          CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(st.pop, 0, 6)), '#fefce8');
        }
        // no escuro, só os olhos dele (pequenos, longe)
        const e = st.eyes;
        if (e) [e.L, e.R].forEach((p) => CE.cineGlow(ctx, p.x, p.y, Math.max(6, e.u * 2.2), 'rgba(34,211,238,0.85)', seg(t, POP + 70, POP + 100)));
        CE.cineSfx(S, POP, 'lampada', () => window.SFX?.tackle?.());
      } else {
        const e = st.eyes;
        if (e) {
          [e.L, e.R].forEach((p) => {
            CE.cineGlow(ctx, p.x, p.y, Math.max(8, e.u * 2.6), 'rgba(34,211,238,0.8)', 0.9);
            ctx.fillStyle = '#ecfeff';
            ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 1), 4, 2);
          });
        }
        darken(ctx, S, seg(t, 236, 270));
        CE.cineSfx(S, 70, 'rival', () => window.SFX?.kick?.(0.7));
      }
    }
  });

  // =========================================================================
  // 3) A ENGRENAGEM DO HUGO (hugo_gears) — no campo, na final da Copa Sub-20
  // =========================================================================
  const TOWERS = [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]];
  // reflexo da lente nos refletores visíveis
  function flares(ctx, K, S, k = 1) {
    if (k <= 0) return;
    const { W, H } = S;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    TOWERS.forEach(([x, y]) => {
      const p = K.screen(x, 3.33, y);
      if (!p || p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 120) return;
      CE.cineGlow(ctx, p.x, p.y, 110, 'rgba(255,255,255,0.5)', k);
      CE.cineGlow(ctx, p.x, p.y, 36, 'rgba(255,255,255,0.95)', k);
      const gr = ctx.createLinearGradient(p.x - 380, 0, p.x + 380, 0);
      gr.addColorStop(0, 'rgba(244,114,182,0)');
      gr.addColorStop(0.5, `rgba(251,207,232,${0.45 * k})`);
      gr.addColorStop(1, 'rgba(244,114,182,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(p.x - 380, p.y - 2, 760, 4);
    });
    ctx.restore();
  }
  // quadro de mangá com engrenagens girando em tinta (em pixel art); pink = a engrenagem dele
  function cutGears(ctx, S, kIn, t, o) {
    const CA = CE.ART;
    if (!CA || kIn <= 0) return;
    CA.panel(
      ctx,
      o.poly,
      (b, g) => {
        g.fillStyle = PAPER;
        g.fillRect(b.x, b.y, b.w, b.h);
        CA.halftone(g, b.x, b.y, b.w, b.h, { color: 'rgba(11,15,25,0.28)', step: 14, from: o.from2 || 'bottom', max: 0.8 });
        const s = b.h / 6;
        (o.gears || []).forEach(([fx, fy, r, n, dir, pink], i) => {
          CE.hgoGear(g, b.x + b.w * fx, b.y + b.h * fy, r * s, n, t * 0.02 * dir * (12 / n) + i, { fill: pink ? PINK : INK, hole: PAPER, ring: pink ? '#fbcfe8' : null });
        });
      },
      { k: kIn, from: o.from || [0, 40], pixel: PIX }
    );
  }
  const HUGO_STOP = [53.55, 12.9];
  const YOU_HG = [52.85, 12.95];

  CE.registerCine3D('hugo_gears', {
    phases: [190, 100, 250, 170],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    music: 'dread',
    theme: 'worldcup_final',
    title: '⚙️ A ENGRENAGEM DO HUGO',
    tags: ['PLANO 1 • HUGO', 'PLANO 2 • POR QUÊ?', 'PLANO 3 • O MECANISMO', 'PLANO 4 • O FLUXO'],
    subs: [
      [{ from: 14, who: 'HUGO', text: '"Aceite: um de nós dois vai ser o segundo melhor."', color: PINK }],
      [{ from: 8, who: 'VOCÊ', text: '"...Por quê??"', color: '#38bdf8' }],
      [{ from: 10, who: 'HUGO', text: '"Porque gente como a gente... não nasceu para ser o primeiro lugar."', color: PINK }],
      [{ from: 4, who: 'NARRADOR', text: 'As engrenagens giram. O Hugo entrou no Fluxo.', color: NARR_C }]
    ],
    scene(K, S) {
      const { t, phase, f } = S;
      const o = CE.hgoCast();
      const st = (K.st = {});
      K.expo(1.0);
      // os outros lá no fundo, esperando o lance recomeçar
      const extras = () => {
        act(K, CE.cineChar('loki', { jerseyPrimary: '#1e3a8a', jerseySecondary: '#ffffff' }), [50.9, 16.4, 0], { id: 'lk', face: [53, 10], frame: 0 });
        act(K, CE.cineChar('rin', { jerseyPrimary: '#f8fafc', jerseySecondary: '#1d4ed8' }), [55.7, 15.9, 0], { id: 'rn', face: [53, 10], frame: 0 });
      };
      if (phase === 0) {
        // HUGO: de lado, travelling; ele vem andando e para colado em você
        const k = easeIO(t / 190);
        const hk = easeIO(seg(t, 0, 70));
        const hp = [lerp(55.7, HUGO_STOP[0], hk), lerp(13.4, HUGO_STOP[1], hk), 0];
        act(K, o.hugo, hp, { id: 'h', face: hk < 1 ? [HUGO_STOP[0], HUGO_STOP[1]] : [53.4, 9], anim: hk > 0.02 && hk < 0.98 ? 'run' : 'idle', frame: hk > 0.02 && hk < 0.98 ? Math.floor(t * 0.3) : 1 });
        act(K, o.you, [YOU_HG[0], YOU_HG[1], 0], { id: 'y', face: [52.9, 9], frame: 1 });
        extras();
        cam(K, shake(K, [lerp(54.9, 54.35, k), lerp(9.9, 10.2, k), 0.62], f * 0.4, 0.004), [lerp(53.9, 53.3, k), 12.95, 0.55], lerp(44, 40, k));
      } else if (phase === 1) {
        // POR QUÊ?: de frente e baixo — você vira para ele; ele continua olhando o lance
        const k = easeIO(t / 100);
        act(K, o.hugo, [HUGO_STOP[0], HUGO_STOP[1], 0], { id: 'h', face: [53.4, 9], frame: 1 });
        act(K, o.you, [YOU_HG[0], YOU_HG[1], 0], { id: 'y', face: t > 6 ? [HUGO_STOP[0], HUGO_STOP[1]] : [52.9, 9], frame: 1, opts: { expr: 'sweat' } });
        // (de baixo, pela frente e de lado: você virando para ele, ele olhando o lance)
        cam(K, shake(K, [lerp(51.6, 51.8, k), lerp(10.85, 10.95, k), 0.16], f * 0.4, 0.003), [53.1, 12.9, 0.62], 44);
      } else if (phase === 2) {
        // O MECANISMO: ele fala sem olhar para você; a câmera gira devagar em volta dos dois
        const k = easeIO(t / 250);
        act(K, o.hugo, [HUGO_STOP[0], HUGO_STOP[1], 0], { id: 'h', face: [53.4, 9], frame: 1, light: [1.12, 0.96, 1.08] });
        act(K, o.you, [YOU_HG[0], YOU_HG[1], 0], { id: 'y', face: [HUGO_STOP[0], HUGO_STOP[1]], frame: 1 });
        extras();
        const ang = lerp(-0.9, -0.45, k);
        const ctr = [53.2, 12.9];
        cam(K, [ctr[0] + Math.cos(ang) * 3.1, ctr[1] + Math.sin(ang) * 3.1, lerp(0.42, 0.5, k)], [53.2, 12.9, 0.55], 42);
      } else {
        // O FLUXO: o lance recomeça e ele dispara; a câmera rente ao chão tenta acompanhar
        const run = easeIn(seg(t, 10, 160));
        const hp = [HUGO_STOP[0] + run * 0.6, HUGO_STOP[1] - run * 5.2, 0];
        act(K, o.hugo, hp, { id: 'h', face: [hp[0] + 0.1, 6], anim: t > 10 ? 'run' : 'idle', frame: t > 10 ? undefined : 1, light: [1.25, 0.95, 1.12] });
        act(K, o.you, [YOU_HG[0], YOU_HG[1], 0], { id: 'y', face: [hp[0], hp[1]], frame: 1 });
        extras();
        const cy = lerp(13.6, 10.4, ease(seg(t, 10, 160)));
        cam(K, shake(K, [55.6, cy, 0.3], f, 0.01, 2), [hp[0] - 0.4, lerp(cy - 0.6, hp[1], 0.6), 0.45], 48);
        st.hugo = wp([hp[0], hp[1], 0.35]);
        st.hugo1 = wp([hp[0], hp[1] + 0.8, 0.35]);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const st = resolve(K, K.st || {});
      if (phase === 0) {
        if (t < 10) CE.cineFlash(ctx, W, H, 1 - t / 10, '#000000');
        flares(ctx, K, S, 0.8);
        CE.finKicker(ctx, 40, top + 30, 'FINAL • COPA DO MUNDO SUB-20 • JAPÃO x FRANÇA', seg(t, 8, 46), '#e2e8f0');
        CE.cineSfx(S, 4, 'hugo', () => window.SFX?.jingle?.([392, 330], 0, 'triangle'));
      } else if (phase === 1) {
        flares(ctx, K, S, 0.6);
      } else if (phase === 2) {
        flares(ctx, K, S, 0.6);
        // o mecanismo: dois quadros de engrenagens girando (a dele em rosa)
        if (t > 50)
          cutGears(ctx, S, seg(t, 50, 58), t, {
            poly: [[W * 0.56, top + 18], [W - 22, top + 12], [W - 22, top + (bot - top) * 0.56], [W * 0.6, top + (bot - top) * 0.6]],
            from: [60, 0],
            gears: [[0.3, 0.5, 1.6, 14, 1, false], [0.62, 0.42, 1.2, 12, -1, true], [0.86, 0.66, 1.0, 10, 1, false]]
          });
        if (t > 96)
          cutGears(ctx, S, seg(t, 96, 104), t + 40, {
            poly: [[W * 0.6 + 4, top + (bot - top) * 0.6 + 12], [W - 22, top + (bot - top) * 0.56 + 12], [W - 22, bot - 18], [W * 0.62, bot - 18]],
            from: [0, 50],
            from2: 'top',
            gears: [[0.25, 0.55, 1.3, 12, -1, true], [0.6, 0.45, 1.7, 16, 1, false]]
          });
        CE.cineSfx(S, 52, 'engrenagem', () => window.SFX?.click?.());
      } else {
        flares(ctx, K, S, 0.8);
        CE.drawSpeedLines(ctx, W, H, '#fbcfe8', 0.12 * seg(t, 10, 40));
        // a chuteira dele empurrando o gramado, com a engrenagem rosa atrás (pixel)
        if (t > 22 && t < 78) {
          const CA = CE.ART;
          const q = seg(t, 22, 78);
          if (CA)
            CA.panel(
              ctx,
              [[30, bot - 230], [W * 0.38, bot - 250], [W * 0.36, bot - 22], [24, bot - 22]],
              (b, g) => {
                g.fillStyle = PAPER;
                g.fillRect(b.x, b.y, b.w, b.h);
                CA.speedLines(g, Math.PI, W, H, { color: 'rgba(236,72,153,0.55)', n: 30, t: q * 60, speed: 30, thick: 8 });
                CE.hgoGear(g, b.x + b.w * 0.62, b.y + b.h * 0.42, b.h * 0.3, 12, q * 6, { fill: PINK, hole: PAPER });
                g.fillStyle = '#16a34a';
                g.fillRect(b.x, b.y + b.h * 0.8, b.w, b.h * 0.2);
                CA.boot(g, b.x + b.w * lerp(0.42, 0.34, ease(q)), b.y + b.h * 0.78, b.h * 0.16, { sock: '#1e3a8a', sock2: '#f8fafc', boot: '#f8fafc', ang: lerp(-0.2, -0.75, ease(q)) });
                for (let i = 0; i < 8; i++) {
                  g.fillStyle = '#4ade80';
                  g.fillRect(b.x + b.w * (0.2 + rnd(i, 3) * 0.3) - q * 60 * rnd(i, 4), b.y + b.h * (0.78 - rnd(i, 5) * 0.2 * q), 12, 12);
                }
              },
              { k: seg(t, 22, 30), from: [-60, 0], pixel: PIX }
            );
        }
        CE.cineSfx(S, 12, 'fluxo', () => window.SFX?.whoosh?.());
      }
    }
  });
})();
