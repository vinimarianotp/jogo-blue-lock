// ============================================================================
// CUTSCENES EM 3D — o arco do Wild Card, refeitas no padrão do gol da Sub-20
// (js/cine3d_u20.js): câmera sempre andando (grua, travelling, push-in), câmera lenta com
// rampa nos 1–2 momentos-chave, no máximo 1 quadro de impacto e 2 tremidas fortes por cena,
// closes só em quadros de mangá em pixel art (mão, chuteira, silhueta) e pouco texto.
//   wildcard_door    • a ala dos quartos (o corredor do prédio, onde a conversa acontece):
//                      a mala, a lembrança do herói, a SAÍDA e a porta preta no fim dele
//   wildcard_hell    • o laboratório do Wild Card (área vazia): a lente no teto, o
//                      escaneamento, os tombos, a cor indo embora, o atacante perfeito
//   kunigami_return  • o campo do prédio: os refletores morrem, a porta preta abre
//   wildcard_verdict • o campo vazio depois do jogo, o telão do Ego e a porta preta
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
  // passo da caminhada: os quadros da corrida, devagar
  const WALKF = (f, sp = 5) => 1 + (Math.floor(f / sp) % 4) * 4;
  const RUNF = (f) => 1 + (Math.floor(f / 3) % 4) * 4;
  // câmera tremendo com ruído suave (nunca aleatório por quadro)
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp * 0.6, p[2] + K.noise(f, seed + 7) * amp];
  // ponto do mundo guardado no scene e convertido para a tela no overlay
  const W3 = (x, h, y) => ({ __w: [x, h, y] });
  const stOf = (K) => {
    const st = {};
    Object.keys(K.st || {}).forEach((k) => {
      const v = K.st[k];
      st[k] = v && v.__w ? K.screen(v.__w[0], v.__w[1], v.__w[2]) : v;
    });
    return st;
  };

  const KUNI_C = '#fb923c';
  const COLD_C = '#c8ab94';
  const EGO_C = '#00f5d4';
  const VOICE_C = '#f87171';
  const NARR_C = '#94a3b8';
  const CHI_C = '#fb7185';
  // o Kunigami: Blue Lock, Wild Card (uniforme preto) e o "frio" (olho apagado)
  const BLK = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const WILD = { jerseyPrimary: '#17171c', jerseySecondary: '#9a3412' };
  const COLD = Object.assign({ mouth: 'thin', eyeColor: '#6b625b', hairColor: '#d97a34', hairSecondary: '#b7611f', auraColor: '#a8927e' }, WILD);
  // o holograma de treino: boneco todo laranja, aceso (fantasma)
  const HOLO = { id: 'wcd3_holo', name: 'Holograma', hairStyle: 'spiky_tall', hairColor: '#fb923c', hairSecondary: '#fdba74', skinColor: '#fb923c', eyeColor: '#fed7aa', jerseyPrimary: '#ea580c', jerseySecondary: '#fdba74', number: 0 };
  const charOf = (id, extra) => CE.cineChar(id, extra || {});

  // ---------------------------------------------------------------- canvas guardados
  const CV = {};
  const paint = (key, w, h, fn) => {
    if (CV[key]) return CV[key];
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    fn(g, w, h);
    CV[key] = c;
    return c;
  };
  // canvas redesenhado de tempos em tempos (telões): devolve { cv, dirty }
  const LIVE = {};
  const live = (key, w, h, f, every, fn) => {
    let L = LIVE[key];
    if (!L) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      L = LIVE[key] = { cv: c, g: c.getContext('2d'), f: -999 };
    }
    const dirty = L.f === -999 || f - L.f >= every || f < L.f;
    if (dirty) {
      L.f = f;
      L.g.clearRect(0, 0, w, h);
      fn(L.g, w, h);
    }
    return { cv: L.cv, dirty };
  };
  // brilho redondo (degradê até o transparente); cx/cy = centro em 0..1
  const glowCv = (col, cx = 0.5, cy = 0.5) =>
    paint(`glow|${col}|${cx}|${cy}`, 64, 64, (g) => {
      const r = 64 * Math.max(cx, 1 - cx, cy, 1 - cy);
      const gr = g.createRadialGradient(64 * cx, 64 * cy, 0, 64 * cx, 64 * cy, r);
      gr.addColorStop(0, col);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    });
  // faixa vertical de luz (feixe visto de lado)
  const shaftCv = (col) =>
    paint(`shaft|${col}`, 32, 64, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, col);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 32, 64);
      const gx = g.createLinearGradient(0, 0, 32, 0);
      gx.addColorStop(0, 'rgba(0,0,0,1)');
      gx.addColorStop(0.5, 'rgba(0,0,0,0)');
      gx.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = gx;
      g.fillRect(0, 0, 32, 64);
    });
  const faceCam = (K, x, y) => Math.atan2(K.c.eye[2] - y, K.c.eye[0] - x);
  // placa em pé com a imagem do jeito certo (o K.quad do kit espelha a textura)
  const Q = (K, o) => K.quad(Object.assign({}, o, { ang: (o.ang ?? 0) + Math.PI }));
  // fumaça rente ao chão: manchas de luz deitadas, andando devagar
  const smoke = (K, x0, x1, y0, y1, t, n, col, a = 1, seed = 1) => {
    const cv = glowCv(col);
    for (let i = 0; i < n; i++) {
      const span = x1 - x0;
      const x = x0 + ((((rnd(i, seed) * span + t * 0.004 * (0.5 + rnd(i, seed + 1))) % span) + span) % span);
      const y = y0 + rnd(i, seed + 2) * (y1 - y0) + Math.sin(t * 0.012 + i) * 0.1;
      const r = 0.7 + rnd(i, seed + 3) * 0.9;
      const al = Math.min(0.95, a * (0.55 + 0.45 * Math.sin(t * 0.02 + i * 1.3)));
      if (al <= 0.02) continue;
      K.floor({ x0: x - r, y0: y - r * 0.6, x1: x + r, y1: y + r * 0.6, z: 0.02 + i * 0.004, img: cv, em: true, alpha: al });
    }
  };
  // a mala do Blue Lock nas costas (só nos planos de costas: de frente ela tapava o peito).
  // Ela vai 0,05 para o lado da boca do corredor (x 53, y 18: o ponto padrão do kit, que era
  // o que a conta lia quando a mala vinha antes da câmera; no roteiro a câmera vem antes)
  const bag = (K, x, y, dark = false) => {
    const cv = dark ? CE.wcdBagDarkCv() : CE.wcdBagCv();
    const dx = 53 - x;
    const dy = 18 - y;
    const d = Math.hypot(dx, dy) || 1;
    const s = 1.0;
    K.sprite(cv, { x: x + (dx / d) * 0.05, y: y + (dy / d) * 0.05, z: 0.81 - s * 0.93, w: s, h: s, light: dark ? [0.25, 0.2, 0.2] : [0.7, 0.72, 0.85] });
  };

  // ---------------------------------------------------------------- pós (no overlay)
  // preto e branco com tom (azulado por padrão); circle: só dentro/fora de um círculo
  function bwTint(ctx, W, H, a = 1, circle = null, tint = '#3b82f6') {
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
    ctx.globalAlpha = clamp(a) * 0.3;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // quadro de impacto (como no anime): a imagem em preto e branco com as cores invertidas
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
  // reflexo da lente numa luz da tela (brilho, risco horizontal, reflexos na diagonal)
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
  // a luz dividida em duas cores (esquerda/direita) por cima da imagem
  function splitLight(ctx, S, a, colL, colR) {
    const { W, top, bot } = S;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    let g = ctx.createLinearGradient(0, 0, W / 2, 0);
    g.addColorStop(0, colL);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W / 2, bot - top);
    g = ctx.createLinearGradient(W / 2, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, colR);
    ctx.fillStyle = g;
    ctx.fillRect(W / 2, top, W / 2, bot - top);
    ctx.restore();
  }

  // ---------------------------------------------------------------- quadros de mangá
  // Os closes são desenhos em baixa resolução ampliados sem suavizar (a escala de pixel dos
  // bonecos); nunca o boneco de 72 px ampliado
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
  // mão de chibi (formas grossas: no quadro em pixel vira poucos blocos). s = largura da
  // palma; close 0 = aberta, 1 = punho fechado; sleeve = cor da manga; ang = giro
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
      g.fillStyle = 'rgba(15,23,42,0.35)';
      g.fillRect(s * 0.1, s * 0.32, s * 0.36, s * 1.6);
    }
    // dedos: abertos (compridos e afastados) ou dobrados (curtos, só as juntas)
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
    // palma
    g.fillStyle = skin;
    rr(g, -s * 0.5, -s * 0.34, s, s * 0.72, s * 0.2);
    g.fill();
    g.stroke();
    if (close > 0.5) {
      // juntas dobradas: a faixa escura em cima e as divisões
      g.fillStyle = dark;
      g.fillRect(-s * 0.46, -s * 0.3, s * 0.92, s * 0.16);
      g.beginPath();
      for (let i = 1; i < 4; i++) {
        g.moveTo(-s * 0.48 + i * s * 0.24, -s * 0.32);
        g.lineTo(-s * 0.48 + i * s * 0.24, -s * 0.1);
      }
      g.stroke();
    }
    // polegar: aberto para o lado ou deitado na frente do punho
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
    // sombra de célula do lado
    g.fillStyle = 'rgba(15,23,42,0.22)';
    g.fillRect(s * 0.18, -s * 0.3, s * 0.28, s * 0.64);
    g.restore();
  }
  // fundo de quadro: degradê + retícula nas sombras
  function panelBg(g, b, c0, c1, dots = 'rgba(2,6,23,0.35)') {
    const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h);
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    g.fillStyle = gr;
    g.fillRect(b.x - 20, b.y - 20, b.w + 40, b.h + 40);
    CA().halftone(g, b.x, b.y + b.h * 0.55, b.w, b.h * 0.45, { step: 14, color: dots, from: 'bottom', max: 0.8 });
  }
  // a capa vermelha do herói (a lembrança): pano em ondas preso nos ombros
  // capa voando presa nos ombros (x, y = ombros; h = altura do menino): vai para a direita
  function cape(g, x, y, h, t, col = '#dc2626') {
    const wv = Math.sin(t * 0.12) * h * 0.04;
    g.fillStyle = col;
    g.strokeStyle = '#0b0f19';
    g.lineWidth = Math.max(2, h * 0.02);
    g.beginPath();
    g.moveTo(x - h * 0.1, y);
    g.lineTo(x + h * 0.1, y);
    g.quadraticCurveTo(x + h * 0.32, y + h * 0.02 + wv, x + h * 0.62, y - h * 0.04 + wv);
    g.lineTo(x + h * 0.56, y + h * 0.1 + wv);
    g.lineTo(x + h * 0.64, y + h * 0.2 + wv);
    g.quadraticCurveTo(x + h * 0.3, y + h * 0.36, x - h * 0.02, y + h * 0.3);
    g.closePath();
    g.fill();
    g.stroke();
  }
  // a capa do herói pendurada, vista de costas (dobras, gola e o fecho dourado)
  function capeHang(g, cx, y0, w, h, t) {
    const wv = (i) => Math.sin(t * 0.08 + i * 1.7) * w * 0.03;
    g.lineJoin = 'round';
    g.strokeStyle = '#0b0f19';
    g.lineWidth = Math.max(3, w * 0.025);
    const pts = [[cx - w * 0.16, y0], [cx + w * 0.16, y0], [cx + w * 0.48 + wv(1), y0 + h], [cx + w * 0.24 + wv(2), y0 + h * 0.94], [cx + wv(3), y0 + h], [cx - w * 0.24 + wv(4), y0 + h * 0.94], [cx - w * 0.48 + wv(5), y0 + h]];
    g.fillStyle = '#b91c1c';
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
    // dobras: luz à esquerda, sombra à direita
    g.save();
    g.clip();
    [[-0.3, '#ef4444'], [-0.1, '#7f1d1d'], [0.12, '#dc2626'], [0.3, '#7f1d1d']].forEach(([fx, col]) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(cx + fx * w * 0.3, y0);
      g.lineTo(cx + fx * w * 1.5 + w * 0.05, y0 + h);
      g.lineTo(cx + fx * w * 1.5 - w * 0.07, y0 + h);
      g.closePath();
      g.fill();
    });
    g.restore();
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.stroke();
    // gola e o fecho
    g.fillStyle = '#7f1d1d';
    g.fillRect(cx - w * 0.2, y0 - h * 0.05, w * 0.4, h * 0.07);
    g.strokeRect(cx - w * 0.2, y0 - h * 0.05, w * 0.4, h * 0.07);
    g.fillStyle = '#facc15';
    g.beginPath();
    g.arc(cx, y0, w * 0.06, 0, TAU);
    g.fill();
    g.stroke();
  }
  // a capa largada no chão (amassada)
  function capeFloor(g, cx, y, w, h) {
    g.lineJoin = 'round';
    g.strokeStyle = '#0b0f19';
    g.lineWidth = Math.max(3, w * 0.02);
    const pts = [[cx - w * 0.5, y + h * 0.7], [cx - w * 0.36, y + h * 0.1], [cx - w * 0.1, y + h * 0.3], [cx + w * 0.08, y], [cx + w * 0.3, y + h * 0.25], [cx + w * 0.5, y + h * 0.55], [cx + w * 0.38, y + h], [cx - w * 0.3, y + h]];
    g.fillStyle = '#b91c1c';
    g.beginPath();
    pts.forEach(([x, yy], i) => (i ? g.lineTo(x, yy) : g.moveTo(x, yy)));
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#ef4444';
    g.fillRect(cx - w * 0.4, y + h * 0.15, w * 0.18, h);
    g.fillStyle = '#7f1d1d';
    g.fillRect(cx - w * 0.05, y, w * 0.12, h);
    g.fillRect(cx + w * 0.28, y, w * 0.1, h);
    g.restore();
    g.beginPath();
    pts.forEach(([x, yy], i) => (i ? g.lineTo(x, yy) : g.moveTo(x, yy)));
    g.closePath();
    g.stroke();
    g.fillStyle = '#facc15';
    g.beginPath();
    g.arc(cx + w * 0.08, y + h * 0.12, w * 0.04, 0, TAU);
    g.fill();
    g.stroke();
  }

  // ==========================================================================
  // 1. A PORTA DO CORINGA — o corredor do prédio (x 2–16, y 18–21, parede oeste em x = 2):
  // a conversa acontece aqui, e a porta preta e a SAÍDA ficam no fim dele
  // ==========================================================================
  const CY = 19.5; // meio do corredor
  const DW = 1.3; // largura da porta preta
  const DH = 1.32;
  const EXIT_X = 3.45; // a SAÍDA, na parede norte
  const STOP_X = 5.1; // onde ele para, entre as duas portas
  const SPK = [3.7, 1.62, CY]; // o alto-falante no teto
  const LAMP = [2.06, 1.52, CY]; // a lâmpada vermelha em cima da porta preta

  const concreteCv = () =>
    paint('concrete', 128, 96, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#141922');
      gr.addColorStop(1, '#1d2430');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(4,6,10,0.6)';
      for (let x = 14; x < w; x += 32) g.fillRect(x, 0, 1, h);
      g.fillRect(0, 44, w, 1);
      for (let i = 0; i < 30; i++) {
        g.fillStyle = `rgba(${rnd(i, 2) < 0.5 ? '0,0,0' : '148,163,184'},0.06)`;
        g.fillRect(rnd(i, 3) * w, rnd(i, 4) * h, 4 + rnd(i, 5) * 14, 1 + rnd(i, 6) * 5);
      }
      g.fillStyle = '#05070b';
      g.fillRect(0, h - 4, w, 4);
    });
  // folha da porta preta (metal escovado, faixas de perigo no pé) — side -1 = esquerda
  const leafCv = (side) =>
    paint('leaf' + side, 32, 64, (g, w, h) => {
      g.fillStyle = '#060608';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.035)';
      for (let i = 2; i < w; i += 4) g.fillRect(i, 0, 1, h);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(side < 0 ? 1 : w - 2, 0, 1, h);
      g.fillStyle = '#101014';
      g.fillRect(4, 10, w - 8, 1);
      g.fillRect(4, h - 14, w - 8, 1);
      for (let x = -8; x < w + 8; x += 6) {
        g.fillStyle = '#c2410c';
        g.beginPath();
        g.moveTo(x, h);
        g.lineTo(x + 3, h);
        g.lineTo(x + 8, h - 5);
        g.lineTo(x + 5, h - 5);
        g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(0, h - 5, w, 5);
      if (window.Hub?.ptext) window.Hub.ptext(g, side < 0 ? 'WILD' : 'CARD', side < 0 ? w - 4 : 4, 4, '#7f1d1d', 1, side < 0 ? 'right' : 'left');
    });
  // lá dentro da porta preta: o corredor vermelho descendo, em perspectiva
  const insideCv = () =>
    paint('inside', 64, 64, (g, w, h) => {
      const cx = w / 2;
      const cy = h * 0.55;
      const gr = g.createRadialGradient(cx, cy, 2, cx, cy, w * 0.75);
      gr.addColorStop(0, '#fff7ed');
      gr.addColorStop(0.25, '#fdba74');
      gr.addColorStop(0.6, '#c2410c');
      gr.addColorStop(1, '#3b0707');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(69,10,10,0.55)';
      g.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const k = i / 6;
        g.beginPath();
        g.moveTo(w * k, h);
        g.lineTo(cx + (k - 0.5) * w * 0.2, cy + h * 0.05);
        g.stroke();
      }
      for (let i = 1; i < 6; i++) {
        const yy = cy + h * 0.05 + (h - cy) * Math.pow(i / 6, 1.6);
        g.beginPath();
        g.moveTo(0, yy);
        g.lineTo(w, yy);
        g.stroke();
      }
    });
  // a porta da SAÍDA: janela fosca quente, barra e a placa verde
  const exitCv = () =>
    paint('exitdoor', 40, 64, (g) => {
      g.fillStyle = '#20262f';
      g.fillRect(0, 0, 40, 64);
      g.fillStyle = '#4a5466';
      g.fillRect(2, 2, 36, 62);
      g.fillStyle = '#3c4555';
      g.fillRect(33, 2, 5, 62);
      g.fillStyle = '#9aa5b5';
      g.fillRect(6, 34, 28, 2);
      g.fillStyle = '#fde68a';
      g.fillRect(9, 7, 20, 18);
      g.fillStyle = 'rgba(120,90,30,0.25)';
      for (let y = 8; y < 25; y += 3) g.fillRect(9, y, 20, 1);
    });
  const exitSignCv = () =>
    paint('exitsign', 40, 12, (g) => {
      g.fillStyle = '#0f3d22';
      g.fillRect(0, 0, 40, 12);
      g.fillStyle = '#16a34a';
      g.fillRect(1, 1, 38, 10);
      g.fillStyle = '#f0fdf4';
      [[4, 3, 2, 2], [4, 5, 2, 3], [2, 6, 2, 1], [6, 6, 2, 1], [3, 8, 1, 2], [6, 8, 1, 1], [7, 9, 1, 1], [10, 6, 3, 1], [12, 5, 1, 3]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
      if (window.Hub?.ptext) window.Hub.ptext(g, 'SAIDA', 16, 3, '#f0fdf4', 1);
    });
  const speakerCv = () =>
    paint('speaker', 24, 14, (g) => {
      g.fillStyle = '#05070b';
      g.fillRect(0, 0, 24, 14);
      g.fillStyle = '#1b222d';
      for (let i = 0; i < 6; i++) g.fillRect(2 + i * 4, 3, 2, 8);
    });

  // o fim do corredor: open 0..1 (a porta preta abrindo), dark 0..1 (depois que fecha)
  function corridorEnd(K, t, o = {}) {
    const open = o.open || 0;
    const dark = o.dark || 0;
    const leak = (1 - dark * 0.7) * (0.75 + 0.25 * Math.sin(t * 0.05));
    K.fog('#05070b', 0.05);
    K.ambient(dark ? '#3a3f4a' : '#8f98aa');
    // a parede do fundo vira concreto escuro (os pôsteres do Blue Lock somem atrás dela)
    const y0 = CY - DW / 2;
    const y1 = CY + DW / 2;
    Q(K, { x: 2.012, y: (18 + y0 - 0.12) / 2, w: y0 - 0.12 - 18, h: 1.75, ang: 0, img: concreteCv() });
    Q(K, { x: 2.012, y: (y1 + 0.12 + 21) / 2, w: 21 - y1 - 0.12, h: 1.75, ang: 0, img: concreteCv() });
    Q(K, { x: 2.012, y: CY, z: DH + 0.1, w: DW + 0.24, h: 1.75 - DH - 0.1, ang: 0, color: '#0a0d13' });
    // batente
    K.box({ x0: 2.0, y0: y0 - 0.12, x1: 2.08, y1: y0, z0: 0, z1: DH, color: '#020203' });
    K.box({ x0: 2.0, y0: y1, x1: 2.08, y1: y1 + 0.12, z0: 0, z1: DH, color: '#020203' });
    K.box({ x0: 2.0, y0: y0 - 0.12, x1: 2.08, y1: y1 + 0.12, z0: DH, z1: DH + 0.1, color: '#020203' });
    // lá dentro (aceso quando abre) e a luz invadindo o corredor
    if (open > 0) {
      Q(K, { x: 2.015, y: CY, w: DW, h: DH, ang: 0, img: insideCv(), em: true });
      K.floor({ x0: 2.0, y0: CY - 1.4, x1: 2.0 + 0.6 + 5.4 * open, y1: CY + 1.4, img: glowCv('rgba(251,146,60,0.6)', 0, 0.5), em: true, alpha: Math.min(0.95, open) });
    }
    // as folhas (deslizam para os lados; a da esquerda de quem olha é a do sul)
    const off = open * (DW / 2 + 0.06);
    Q(K, { x: 2.03, y: CY + DW / 4 + off, w: DW / 2, h: DH, ang: 0, img: leafCv(-1) });
    Q(K, { x: 2.03, y: CY - DW / 4 - off, w: DW / 2, h: DH, ang: 0, img: leafCv(1) });
    if (open < 0.04) {
      const a = Math.min(0.95, Math.max(0, leak));
      Q(K, { x: 2.035, y: CY, w: 0.03, h: DH, ang: 0, color: '#fdba74', em: true, alpha: a });
      Q(K, { x: 2.035, y: CY, z: 0, w: DW, h: 0.035, ang: 0, color: '#fed7aa', em: true, alpha: a });
      Q(K, { x: 2.036, y: CY, z: DH - 0.02, w: DW, h: 0.02, ang: 0, color: '#fb923c', em: true, alpha: a * 0.8 });
    }
    // o brilho laranja vazando em volta do batente (a porta lê no escuro)
    Q(K, { x: 2.022, y: CY, z: -0.2, w: DW + 1.4, h: DH + 0.6, ang: 0, img: glowCv('rgba(249,115,22,0.32)'), em: true, alpha: Math.min(0.95, 0.5 * leak + open) });
    // poça laranja no chão e a lâmpada vermelha em cima
    K.floor({ x0: 2.0, y0: CY - 1.3, x1: 3.6, y1: CY + 1.3, img: glowCv('rgba(249,115,22,0.5)', 0, 0.5), em: true, alpha: Math.min(0.95, Math.max(leak * 0.75, open)) });
    const blink = 0.55 + 0.45 * Math.max(0, Math.sin(t * 0.09));
    Q(K, { x: LAMP[0], y: CY, z: LAMP[1] - 0.04, w: 0.08, h: 0.08, ang: 0, color: '#ef4444', em: true });
    Q(K, { x: LAMP[0] + 0.02, y: CY, z: LAMP[1] - 0.25, w: 0.5, h: 0.5, ang: 0, img: glowCv('rgba(239,68,68,0.7)'), em: true, alpha: Math.min(0.95, blink) });
    smoke(K, 2.1, 5.0, CY - 1.3, CY + 1.3, t, 6, 'rgba(249,115,22,0.2)', 0.8 + open * 1.4, 4);
    // a SAÍDA: porta, placa verde e a luz quente por baixo
    Q(K, { x: EXIT_X, y: 18.01, w: 0.78, h: 1.22, ang: Math.PI / 2, img: exitCv() });
    Q(K, { x: EXIT_X, y: 18.015, z: 1.32, w: 0.5, h: 0.15, ang: Math.PI / 2, img: exitSignCv(), em: true });
    K.floor({ x0: EXIT_X - 0.9, y0: 18.0, x1: EXIT_X + 0.9, y1: 19.2, img: glowCv('rgba(74,222,128,0.32)', 0.5, 0), em: true });
    Q(K, { x: EXIT_X, y: 18.02, z: 1.0, w: 1.5, h: 0.8, ang: Math.PI / 2, img: glowCv('rgba(74,222,128,0.22)'), em: true });
    // o alto-falante no teto
    K.box({ x0: SPK[0] - 0.25, y0: CY - 0.1, x1: SPK[0] + 0.25, y1: CY + 0.1, z0: 1.58, z1: 1.75, color: '#05070b' });
    K.floor({ x0: SPK[0] - 0.24, y0: CY - 0.09, x1: SPK[0] + 0.24, y1: CY + 0.09, z: 1.575, img: speakerCv() });
  }
  const kuni = (K, o) => K.actor('kunigami', Object.assign({ extra: BLK, k: 0.9 }, o));

  // quadro: a mão apertando a alça da mala
  function cutStrap(ctx, S, kIn, t) {
    const { W, top, bot } = S;
    const cd = charOf('kunigami', BLK);
    cut(
      ctx,
      [[W * 0.6, top + 22], [W - 24, top + 22], [W - 24, top + 300], [W * 0.6, top + 300]],
      (b, g) => {
        panelBg(g, b, '#1e293b', '#0b1220');
        // a alça atravessando o quadro (grossa, com costura)
        g.save();
        g.translate(b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.5);
        g.rotate(-0.75);
        g.fillStyle = '#0b0f19';
        g.fillRect(-b.w, -b.h * 0.15, b.w * 2, b.h * 0.3);
        g.fillStyle = '#334155';
        g.fillRect(-b.w, -b.h * 0.12, b.w * 2, b.h * 0.24);
        g.fillStyle = '#475569';
        g.fillRect(-b.w, -b.h * 0.12, b.w * 2, b.h * 0.05);
        g.fillStyle = '#38bdf8';
        for (let x = -b.w; x < b.w; x += b.h * 0.12) g.fillRect(x, b.h * 0.07, b.h * 0.06, b.h * 0.02);
        g.restore();
        // a mão fechada em volta da alça (aperta mais no fim)
        const sq = 1 + Math.sin(t * 0.6) * 0.02 * seg(t, 60, 100);
        hand(g, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.56, b.h * 0.5 * sq, { close: 1, skin: cd.skinColor, sleeve: BLK.jerseyPrimary, ang: 0.6 });
      },
      kIn,
      [0, -60]
    );
  }
  // quadro: a lembrança — o menino de capa no pôr do sol (silhueta)
  function cutHero(ctx, S, kIn, t, fade) {
    const { W, top, bot } = S;
    const cd = CE.wcdCast ? CE.wcdCast().kid : charOf('kunigami');
    cut(
      ctx,
      [[W * 0.56, top + 18], [W - 20, top + 18], [W - 20, bot - 18], [W * 0.56, bot - 18]],
      (b, g) => {
        const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h);
        gr.addColorStop(0, '#7c2d12');
        gr.addColorStop(0.55, '#f97316');
        gr.addColorStop(1, '#fde68a');
        g.fillStyle = gr;
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        // o sol atrás do menino, os prédios e o telhado (silhuetas)
        const x = b.x + b.w * 0.42 + b.ox;
        const feet = b.y + b.h * 0.8;
        const h = b.h * 0.4;
        g.fillStyle = 'rgba(255,247,237,0.95)';
        g.beginPath();
        g.arc(x, feet - h * 0.5, b.h * 0.27, 0, TAU);
        g.fill();
        g.fillStyle = '#3b1206';
        for (let i = 0; i < 9; i++) {
          const bw = b.w * (0.08 + rnd(i, 4) * 0.08);
          const bh = b.h * (0.12 + rnd(i, 5) * 0.2);
          g.fillRect(b.x + (i / 9) * b.w * 1.1 - 10 + b.ox, b.y + b.h * 0.8 - bh, bw, bh + 4);
        }
        g.fillStyle = '#1c0a05';
        g.fillRect(b.x - 10, b.y + b.h * 0.8, b.w + 20, b.h * 0.3);
        // o menino de capa no telhado, braço para cima, recortado contra o sol
        cape(g, x, feet - h * 0.5, h, t, '#7f1d1d');
        CA().silhouette(g, cd, x, feet, h, { pose: 'celebrate', view: 'front', fill: '#1c0a05' });
        // a lembrança apagando (vai para o cinza)
        if (fade > 0) {
          g.fillStyle = `rgba(20,20,24,${0.75 * fade})`;
          g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        }
      },
      kIn,
      [80, 0]
    );
  }
  // quadro: a mão aberta que fecha num punho (a decisão), verde de um lado e laranja do outro
  function cutFist(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    const cd = charOf('kunigami', BLK);
    cut(
      ctx,
      [[34, bot - 270], [520, bot - 300], [500, bot - 22], [22, bot - 14]],
      (b, g) => {
        // metade verde (a SAÍDA), metade laranja (a porta preta), divididas na diagonal
        g.fillStyle = '#166534';
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        g.fillStyle = '#c2410c';
        g.beginPath();
        g.moveTo(b.x + b.w * 0.62, b.y - 10);
        g.lineTo(b.x + b.w + 10, b.y - 10);
        g.lineTo(b.x + b.w + 10, b.y + b.h + 10);
        g.lineTo(b.x + b.w * 0.38, b.y + b.h + 10);
        g.closePath();
        g.fill();
        CA().speedRadial(g, b.x + b.w * 0.5, b.y + b.h * 0.5, S.W, S.H, { color: 'rgba(2,6,23,0.6)', inner: b.h * 0.46, n: 50, thick: 1.4 });
        const cl = easeIO(seg(q, 0.35, 0.62));
        const tr = (1 - cl) * Math.sin(q * 90) * 4;
        hand(g, b.x + b.w * 0.5 + b.ox + tr, b.y + b.h * 0.58, b.h * 0.56, { close: cl, skin: cd.skinColor, sleeve: BLK.jerseyPrimary, ang: -0.1 });
      },
      kIn,
      [-80, 60]
    );
  }

  // (roteiro de dados: js/cine_roteiro.js — os desenhos próprios acima são chamados pelos planos)
  const R = CE.roteiro;
  const PT = (x, h, y) => R.ponto(x, y, h);
  // o tempo da ação no P5 (câmera lenta das folhas abrindo)
  const A5 = (t) => remap(t, [[0, 0], [56, 56], [150, 74], [250, 174]]);
  const SLAM = 92; // a porta bate (P6)
  const wk5 = (t) => easeIO(seg(A5(t), 110, 174));
  const sil5 = (t) => ease(seg(A5(t), 56, 100)) > 0.05;
  R('wildcard_door', {
    titulo: '🃏 A PORTA DO CORINGA',
    musica: 'mystery',
    tema: 'bluelock_bunker',
    tarja: 0.12,
    grao: 0.05,
    vinheta: 0.6,
    leitura: 0.85,
    // (referência do dono: mantém o fade em todo corte, como sempre foi)
    corte: 'fade',
    cenario(K, t, st, pl) {
      K.sky('#030406', '#05070b', 0);
      corridorEnd(K, t, pl.porta ? pl.porta(t) : {});
    },
    planos: [
      {
        // A GRUA: do alto, atrás dele, descendo pelo corredor até a porta preta lá no fim
        id: 'ala dos eliminados',
        dur: 300,
        expo: 0.8,
        cam: { de: [[14.9, 1.62, 19.95], [6.0, 0.4, 19.4], 56], para: [[11.55, 0.66, 19.8], [2.4, 0.66, CY], 46], curva: 'easeIO' },
        atores: [{ quem: 'kunigami', extra: BLK, escala: 0.9, de: [12.4, CY + 0.05], para: [8.7, CY + 0.05], ang: Math.PI, anim: 'andar', passo: 6, luz: [0.66, 0.7, 0.82] }],
        cena(K, S, st) {
          const a = st.atores.kunigami;
          bag(K, a.x, a.y);
          st.lamp = PT(LAMP[0] + 0.02, LAMP[1], CY);
        },
        sobre(ctx, S, K, st) {
          flare(ctx, S, st.lamp, 0.5 + 0.3 * Math.max(0, Math.sin(S.t * 0.09)), '248,113,113', 0.7);
        },
        letreiros: [
          { em: 10, entra: 40, texto: 'BLUE LOCK • ALA DOS ELIMINADOS', cor: '#ef4444' },
          { em: 36, entra: 40, texto: 'FIM DA SEGUNDA SELEÇÃO • 02:14', cor: '#94a3b8', linha: 1 }
        ],
        falas: [{ em: 20, quem: 'NARRADOR', texto: 'Segunda Seleção. Fim da linha.' }]
      },
      {
        // A MALA: de frente, a câmera recuando na frente dele (3/4), a cabeça baixa
        id: 'a mala',
        dur: 230,
        expo: 0.76,
        cam(K, t) {
          const kx = lerp(8.4, 6.3, t / 230);
          const n = K.noise(t * 0.4, 2) * 0.01;
          return [[kx - 2.35, 0.6 + n, 20.6], [kx + 0.1, 0.5, CY - 0.1], 46];
        },
        atores: [{ quem: 'kunigami', extra: BLK, escala: 0.9, de: [8.4, CY - 0.1], para: [6.3, CY - 0.1], ang: Math.PI, anim: 'andar', passo: 7, luz: [0.62, 0.64, 0.76] }],
        // a mão na alça e, depois, a lembrança (o menino que queria ser herói)
        quadros: [
          { em: 20, ate: 120, entra: 9, desenha: (ctx, S, k, t) => cutStrap(ctx, S, k, t) },
          { em: 120, entra: 10, desenha: (ctx, S, k, t) => cutHero(ctx, S, k, t, seg(t, 200, 230)) }
        ],
        sons: [{ em: 120, som: 'whoosh' }],
        falas: [{ em: 26, quem: 'KUNIGAMI', texto: '(Eu só queria ser um herói...)', tipo: 'pensamento' }]
      },
      {
        // DUAS PORTAS: ele chega e para entre a SAÍDA (verde) e a porta preta (laranja); a
        // câmera do alto, no canto do teto, faz um arco lento; a voz do Ego vem do alto-falante
        id: 'duas portas',
        dur: 290,
        expo: 0.8,
        cam: { de: [[7.4, 1.62, 20.75], [3.4, 0.32, 19.2], 54], para: [[7.1, 1.5, 18.3], [3.0, 0.32, 19.7], 54], curva: 'easeIO' },
        atores: [
          {
            quem: 'kunigami',
            extra: BLK,
            escala: 0.9,
            de: [5.9, CY],
            para: [STOP_X, CY],
            curva: 'ease',
            em: 0,
            ate: 90,
            ang: Math.PI,
            anim: (t) => (t < 86 ? 'andar' : 'idle'),
            passo: 7,
            frame: (t) => (t < 86 ? undefined : 0),
            luz: [0.7, 0.66, 0.6]
          }
        ],
        cena(K, S, st) {
          bag(K, st.atores.kunigami.x, CY);
          st.spk = PT(SPK[0], SPK[1] - 0.05, CY);
          st.lamp = PT(LAMP[0] + 0.02, LAMP[1], CY);
        },
        sobre(ctx, S, K, st) {
          const { t } = S;
          // a voz no alto-falante (ondas ciano pequenas) e as duas luzes
          splitLight(ctx, S, 0.8, 'rgba(34,197,94,0.1)', 'rgba(234,88,12,0.14)');
          flare(ctx, S, st.lamp, 0.4, '248,113,113', 0.6);
          const talk = seg(t, 56, 66) * (1 - seg(t, 250, 280));
          const p = st.spk;
          if (talk > 0 && p) {
            ctx.save();
            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 3;
            for (let i = 0; i < 3; i++) {
              const ph = ((t * 1.1 + i * 32) % 96) / 96;
              ctx.globalAlpha = talk * (1 - ph) * 0.6;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 16 + ph * 70, Math.PI * 0.2, Math.PI * 0.8);
              ctx.stroke();
            }
            ctx.restore();
            CE.cineGlow(ctx, p.x, p.y, 50, 'rgba(0,245,212,0.45)', talk);
          }
        },
        sons: [{ em: 56, som: 'blip', arg: 160 }],
        falas: [{ em: 60, quem: 'EGO', texto: '"Existe uma segunda chance."' }]
      },
      {
        // A ESCOLHA: de frente, de baixo, entre as duas luzes; a câmera chega devagar
        id: 'a escolha',
        dur: 270,
        expo: 0.72,
        cam(K, t) {
          const k = easeIO(t / 270);
          const n = K.noise(t * 0.5, 1) * 0.008;
          return [[lerp(2.35, 2.6, k), lerp(0.36, 0.4, k) + n, lerp(19.95, 19.8, k)], [STOP_X, 0.6, CY], lerp(52, 48, k)];
        },
        atores: [{ quem: 'kunigami', extra: BLK, escala: 0.9, x: STOP_X, y: CY, ang: Math.PI, frame: 0, luz: [0.8, 0.72, 0.58] }],
        sobre(ctx, S) {
          splitLight(ctx, S, 1, 'rgba(34,197,94,0.16)', 'rgba(234,88,12,0.2)');
        },
        // a mão abre... e fecha (a escolha)
        quadros: [{ em: 110, ate: 250, entra: 8, desenha: (ctx, S, k, t, q) => cutFist(ctx, S, k, q) }],
        sons: [
          { em: 168, som: 'kick', arg: 0.15 },
          { em: 196, som: 'kick', arg: 0.15 }
        ],
        falas: [{ em: 20, quem: 'EGO', texto: '"Ela vai te custar tudo."' }]
      },
      {
        // A PORTA ABRE: de trás dele, rente ao chão; as folhas abrem em câmera lenta e a luz
        // laranja vira contraluz; ele dá o primeiro passo
        id: 'a porta abre',
        dur: 250,
        expo: 0.78,
        porta: (t) => ({ open: ease(seg(A5(t), 56, 100)) }),
        cam(K, t, S) {
          const A = A5(t);
          const k = easeIO(t / 250);
          // (o destrave da porta treme forte e curto)
          const sh = A >= 56 ? 0.04 * Math.max(0, 1 - (A - 56) / 7) : 0.004;
          return [shake(K, [lerp(7.4, 7.0, k), lerp(0.42, 0.36, k), lerp(19.85, 19.7, k)], S.f * 2, sh, 3), [2.4, lerp(0.7, 0.78, k), CY], lerp(48, 44, k)];
        },
        atores: [
          {
            quem: 'kunigami',
            extra: BLK,
            escala: 0.9,
            x: (t) => lerp(STOP_X, 3.7, wk5(t)),
            y: CY,
            ang: Math.PI,
            anim: (t) => (wk5(t) > 0 && wk5(t) < 1 ? 'andar' : 'idle'),
            passo: 7,
            frame: (t) => (wk5(t) > 0 && wk5(t) < 1 ? undefined : 0),
            luz: (t) => (sil5(t) ? [0.14, 0.1, 0.1] : [0.6, 0.58, 0.6])
          }
        ],
        cena(K, S, st) {
          bag(K, st.atores.kunigami.x, CY, sil5(S.t));
          st.door = PT(2.1, 0.7, CY);
          st.open = ease(seg(A5(S.t), 56, 100));
          st.A = A5(S.t);
        },
        sobre(ctx, S, K, st) {
          const { W, H, top, bot } = S;
          const open = st.open || 0;
          // a luz de dentro: contraluz forte e o reflexo na lente
          if (st.door && open > 0) {
            CE.cineGlow(ctx, st.door.x, st.door.y, 260, 'rgba(255,237,213,0.55)', open);
            flare(ctx, S, st.door, open * 0.9, '253,186,116', 1.2);
          }
          if (st.A >= 56 && st.A < 60) R.fx.flash(ctx, W, H, 0.35 * (1 - seg(st.A, 56, 60)), '#fed7aa');
          // câmera lenta: escurece um pouco as bordas
          if (st.A > 56 && st.A < 100) {
            ctx.save();
            ctx.globalAlpha = 0.18 * Math.sin(seg(st.A, 56, 100) * Math.PI);
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, top, W, bot - top);
            ctx.restore();
          }
        },
        sons: [
          { em: 56, som: 'tackle' },
          { em: 60, som: 'whoosh' }
        ],
        falas: [{ em: 96, quem: 'KUNIGAMI', texto: '"...Que custe o que custar."' }]
      },
      {
        // A PORTA FECHA: ele some na luz; as folhas batem; o corredor fica no escuro
        id: 'wild card',
        dur: 250,
        expo: (t) => (t >= SLAM ? 0.6 : 0.78),
        porta: (t) => ({ open: t < 60 ? 1 : 1 - easeIO(seg(t, 60, SLAM)), dark: t >= SLAM ? 1 : 0 }),
        cam(K, t, S) {
          const k = easeIO(t / 250);
          const sh = t >= SLAM ? 0.05 * Math.max(0, 1 - (t - SLAM) / 22) : 0.003;
          return [shake(K, [lerp(8.6, 9.6, k), lerp(0.55, 0.75, k), lerp(19.2, 19.35, k)], S.f * 2, sh, 5), [2.2, lerp(0.66, 0.72, k), CY], lerp(46, 50, k)];
        },
        atores: [
          {
            quem: 'kunigami',
            extra: BLK,
            escala: 0.9,
            visivel: (t) => t < 80,
            de: [3.7, CY],
            para: [2.25, CY],
            em: 0,
            ate: 70,
            ang: Math.PI,
            anim: 'andar',
            passo: 7,
            alpha: (t) => 1 - seg(t, 50, 72),
            luz: [0.12, 0.08, 0.08]
          }
        ],
        cena(K, S, st) {
          st.door = PT(2.1, 0.66, CY);
          st.lamp = PT(LAMP[0] + 0.02, LAMP[1], CY);
        },
        sobre(ctx, S, K, st) {
          const { W, H, t, top, bot } = S;
          if (t < SLAM && st.door) {
            const a = t < 60 ? 1 : 1 - seg(t, 60, SLAM);
            CE.cineGlow(ctx, st.door.x, st.door.y, 240, 'rgba(255,237,213,0.5)', a);
            flare(ctx, S, st.door, a * 0.8, '253,186,116', 1.1);
          }
          // a batida: 1 quadro invertido e o escuro
          if (t >= SLAM && t < SLAM + 2) R.fx.impacto(ctx, W, H);
          if (t >= SLAM) {
            R.fx.flash(ctx, W, H, 0.3 * (1 - seg(t, SLAM + 1, SLAM + 8)), '#fed7aa');
            ctx.fillStyle = `rgba(1,2,4,${0.45 * seg(t, SLAM, SLAM + 40)})`;
            ctx.fillRect(0, top, W, bot - top);
            flare(ctx, S, st.lamp, 0.5 * Math.max(0, Math.sin(t * 0.09)), '248,113,113', 0.7);
          }
        },
        cartela: { em: 160, entra: 36, kicker: 'UMA SEGUNDA CHANCE • UM PREÇO', titulo: 'WILD CARD', cor: '#f97316' },
        sons: [
          {
            em: SLAM,
            fn: () => {
              window.SFX?.kick?.(1);
              window.SFX?.tackle?.();
            }
          }
        ]
      }
    ]
  });

  // ==========================================================================
  // 2. O INFERNO DO WILD CARD — o laboratório (área vazia): racks cheios de LEDs nas
  // paredes, a lente vermelha pendurada no teto, a plataforma redonda no meio
  // ==========================================================================
  const VX = 86;
  const VY = 17;
  const LAB = { x0: VX - 5, x1: VX + 5, y0: VY - 6.5, y1: VY + 6.5, h: 2.4 };
  const labFloorCv = () =>
    paint('labfloor', 160, 208, (g, w, h) => {
      g.fillStyle = '#0d0909';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(234,88,12,0.22)';
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 1);
      for (let i = 0; i < 60; i++) {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(rnd(i, 7) * w, rnd(i, 8) * h, 3 + rnd(i, 9) * 10, 2);
      }
    });
  const labWallCv = () =>
    paint('labwall', 128, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#1d1518');
      gr.addColorStop(1, '#120d0f');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 1, h);
      g.fillRect(0, 22, w, 1);
    });
  // os LEDs de um rack (só as luzinhas; o fundo é transparente)
  const ledCv = (seed) =>
    paint('led' + seed, 30, 96, (g) => {
      for (let r = 0; r < 15; r++) {
        g.fillStyle = 'rgba(40,28,28,0.9)';
        g.fillRect(1, 4 + r * 6 + 3, 28, 1);
        for (let j = 0; j < 6; j++) {
          const v = rnd(r * 7 + j + seed * 131, 5);
          if (v < 0.35) continue;
          g.fillStyle = v < 0.8 ? '#f59e0b' : v < 0.93 ? '#ef4444' : '#fde68a';
          g.fillRect(2 + j * 5, 4 + r * 6, 2, 2);
        }
      }
    });
  const discCv = (col) =>
    paint(`disc|${col}`, 64, 64, (g) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(32, 32, 31, 0, TAU);
      g.fill();
    });
  const ringCv = (col) =>
    paint('ring|' + col, 64, 64, (g) => {
      g.strokeStyle = col;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(32, 32, 30, 0, TAU);
      g.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        g.fillStyle = '#fdba74';
        g.fillRect(32 + Math.cos(a) * 30 - 1, 32 + Math.sin(a) * 30 - 1, 3, 3);
      }
    });
  const lensCv = () =>
    paint('lens', 32, 32, (g) => {
      g.fillStyle = '#0c0b0d';
      g.beginPath();
      g.arc(16, 16, 15, 0, TAU);
      g.fill();
      const lg = g.createRadialGradient(14, 14, 1, 16, 16, 9);
      lg.addColorStop(0, '#fca5a5');
      lg.addColorStop(0.35, '#b91c1c');
      lg.addColorStop(1, '#2a0505');
      g.fillStyle = lg;
      g.beginPath();
      g.arc(16, 16, 9, 0, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.fillRect(12, 11, 2, 2);
    });
  const netCv = () =>
    paint('holonet', 48, 24, (g, w, h) => {
      g.fillStyle = 'rgba(249,115,22,0.18)';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(253,186,116,0.6)';
      for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 1);
    });
  const LENS = [VX, 2.0, VY];
  function lab(K, t, o = {}) {
    const { x0, x1, y0, y1, h } = LAB;
    K.sky('#060407', '#0c0709', 0);
    K.fog(o.fog || '#160806', o.fogK ?? 0.05);
    K.ambient(o.amb || '#b49484');
    K.expo(o.expo || 0.95);
    K.floor({ x0, y0, x1, y1, img: labFloorCv() });
    K.floor({ x0, y0, x1, y1, z: h, color: '#0c090b' });
    Q(K, { x: x0, y: VY, w: y1 - y0, h, ang: 0, img: labWallCv() });
    Q(K, { x: x1, y: VY, w: y1 - y0, h, ang: Math.PI, img: labWallCv() });
    Q(K, { x: VX, y: y0, w: x1 - x0, h, ang: Math.PI / 2, img: labWallCv() });
    Q(K, { x: VX, y: y1, w: x1 - x0, h, ang: -Math.PI / 2, img: labWallCv() });
    Q(K, { x: VX, y: y0 + 0.41, z: 1.12, w: x1 - x0, h: 0.03, ang: Math.PI / 2, color: '#f97316', em: true });
    // racks de máquinas cheios de LEDs (nas duas paredes e no fundo)
    for (let j = 0; j < 5; j++) {
      const ya = y0 + 1.0 + j * 2.4;
      [[x0, 0], [x1, Math.PI]].forEach(([X, ang], si) => {
        const xa = si ? X - 0.36 : X;
        const xb = si ? X : X + 0.36;
        K.box({ x0: xa, y0: ya, x1: xb, y1: ya + 1.9, z0: 0, z1: 1.95, color: '#100c0f', top: '#1a1316' });
        Q(K, { x: si ? xa - 0.005 : xb + 0.005, y: ya + 0.95, z: 0.06, w: 1.8, h: 1.82, ang, img: ledCv(j * 2 + si), em: true });
      });
    }
    for (let i = 0; i < 4; i++) {
      const xa = x0 + 0.9 + i * 2.3;
      K.box({ x0: xa, y0, x1: xa + 1.6, y1: y0 + 0.36, z0: 0, z1: 1.05, color: '#100c0f', top: '#1a1316' });
      Q(K, { x: xa + 0.8, y: y0 + 0.365, z: 0.04, w: 1.5, h: 0.98, ang: Math.PI / 2, img: ledCv(20 + i), em: true });
    }
    for (let i = 0; i < 5; i++) K.box({ x0, y0: y0 + 1.3 + i * 2.6, x1, y1: y0 + 1.5 + i * 2.6, z0: h - 0.2, z1: h, color: '#0c0a0d' });
    // a lente pendurada no teto (quem fala nunca aparece)
    const pulse = 0.55 + 0.25 * Math.sin(t * 0.05) + (o.talk || 0) * (0.3 + 0.2 * Math.abs(Math.sin(t * 0.33)));
    K.box({ x0: VX - 0.03, y0: VY - 0.03, x1: VX + 0.03, y1: VY + 0.03, z0: LENS[1] + 0.08, z1: h, color: '#050405' });
    K.box({ x0: VX - 0.26, y0: VY - 0.26, x1: VX + 0.26, y1: VY + 0.26, z0: LENS[1] + 0.02, z1: LENS[1] + 0.12, color: '#141114' });
    K.floor({ x0: VX - 0.25, y0: VY - 0.25, x1: VX + 0.25, y1: VY + 0.25, z: LENS[1] + 0.015, img: lensCv(), em: true });
    Q(K, { x: VX, y: VY, z: LENS[1] - 0.45, w: 1.0, h: 1.0, ang: faceCam(K, VX, VY) + Math.PI, img: glowCv('rgba(239,68,68,0.55)'), em: true, alpha: Math.min(0.95, pulse) });
    if (!o.noPlat) {
      K.floor({ x0: VX - 1.2, y0: VY - 1.2, x1: VX + 1.2, y1: VY + 1.2, z: 0.012, img: discCv('#160e0e') });
      K.floor({ x0: VX - 1.2, y0: VY - 1.2, x1: VX + 1.2, y1: VY + 1.2, z: 0.016, img: ringCv('#f97316'), em: true });
      K.floor({ x0: VX - 1.5, y0: VY - 1.5, x1: VX + 1.5, y1: VY + 1.5, z: 0.02, img: glowCv('rgba(253,186,116,0.35)'), em: true });
    }
    if (o.shaft) Q(K, { x: VX, y: VY, z: 0, w: 1.3, h: LENS[1], ang: faceCam(K, VX, VY) + Math.PI, img: shaftCv('rgba(253,186,116,0.3)'), em: true, alpha: 0.9 * (o.shaft === true ? 1 : o.shaft) });
    smoke(K, x0 + 1, x1 - 1, VY - 3, VY + 4, t, 6, 'rgba(234,88,12,0.16)', 1, 5);
  }
  // o gol holográfico (aceso, virado para oeste)
  function holoGoal(K, x, y, hit = 0) {
    const c = '#fb923c';
    K.box({ x0: x - 0.03, y0: y - 0.86, x1: x + 0.03, y1: y - 0.8, z0: 0, z1: 0.76, color: c, em: true });
    K.box({ x0: x - 0.03, y0: y + 0.8, x1: x + 0.03, y1: y + 0.86, z0: 0, z1: 0.76, color: c, em: true });
    K.box({ x0: x - 0.03, y0: y - 0.86, x1: x + 0.03, y1: y + 0.86, z0: 0.72, z1: 0.78, color: c, em: true });
    Q(K, { x: x + 0.05, y, w: 1.6, h: 0.72, ang: Math.PI, img: netCv(), em: true, alpha: 0.8 });
    if (hit > 0) Q(K, { x: x - 0.1, y, z: -0.2, w: 2.2, h: 1.4, ang: faceCam(K, x, y) + Math.PI, img: glowCv('rgba(249,115,22,0.7)'), em: true, alpha: Math.min(0.95, hit) });
  }
  const holo = (K, id, x, y, o) => K.actor(HOLO, Object.assign({ id, x, y, glow: true, alpha: 0.82, k: 0.9 }, o));
  const wildA = (K, o) => K.actor('kunigami', Object.assign({ extra: WILD, k: 0.9, light: [1.05, 0.84, 0.72] }, o));
  const coldA = (K, o) => K.actor('kunigami', Object.assign({ extra: COLD, k: 0.9, light: [0.82, 0.78, 0.74] }, o));
  // cubinhos de luz do holograma quebrando (3D, caem no chão)
  function shards(K, x, y, q, seed) {
    if (q <= 0 || q >= 1) return;
    for (let i = 0; i < 16; i++) {
      const a = rnd(i, seed) * TAU;
      const d = ease(q) * (0.2 + rnd(i, seed + 1) * 0.7);
      const z = Math.max(0, 0.15 + rnd(i, seed + 2) * 0.7 + q * 0.6 - q * q * 1.6);
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d * 0.6;
      K.box({ x0: px - 0.025, y0: py - 0.025, x1: px + 0.025, y1: py + 0.025, z0: z, z1: z + 0.05, color: '#fdba74', em: true, alpha: 1 - q });
    }
  }
  // quadro: a chuteira esquerda com a linha vermelha do escaneamento
  function cutScan(ctx, S, kIn, q) {
    const { W, top } = S;
    cut(
      ctx,
      [[W - 470, top + 30], [W - 24, top + 30], [W - 24, top + 300], [W - 470, top + 300]],
      (b, g) => {
        panelBg(g, b, '#7c2d12', '#2a0a05', 'rgba(15,4,2,0.4)');
        CA().boot(g, b.x + b.w * 0.4 + b.ox, b.y + b.h * 0.8, b.h * 0.27, { sock: '#3f3f46', sock2: '#f97316', boot: '#e5e7eb', ang: 0.1 });
        // a linha do laser descendo pela perna
        const ly = b.y + lerp(b.h * 0.08, b.h * 0.92, (q * 1.6) % 1);
        g.fillStyle = 'rgba(239,68,68,0.9)';
        g.fillRect(b.x, ly, b.w, 5);
        g.fillStyle = 'rgba(254,202,202,0.9)';
        g.fillRect(b.x, ly + 1, b.w, 2);
        // a marca de "fraca": um quadrado vermelho piscando em volta do pé
        if (Math.floor(q * 12) % 2 === 0) {
          g.strokeStyle = '#ef4444';
          g.lineWidth = 8;
          g.strokeRect(b.x + b.w * 0.24 + b.ox, b.y + b.h * 0.5, b.w * 0.5, b.h * 0.42);
        }
      },
      kIn,
      [60, 0]
    );
  }
  // quadro: a canhota acertando a bola (o chute do dia 47)
  function cutLeft(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    cut(
      ctx,
      [[W * 0.5, top + 26], [W - 24, top + 14], [W - 44, top + 330], [W * 0.46, top + 350]],
      (b, g) => {
        g.fillStyle = '#fde68a';
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        const bx = b.x + b.w * 0.62;
        const by = b.y + b.h * 0.5;
        CA().speedRadial(g, bx, by, S.W, S.H, { color: 'rgba(124,45,18,0.75)', inner: b.h * 0.22, n: 56, thick: 1.6 });
        const e = easeIO(q);
        CA().ball(g, bx + (q > 0.8 ? (q - 0.8) * 400 : 0), by, b.h * 0.15, { rot: q * 4 });
        CA().boot(g, b.x + b.w * lerp(0.18, 0.5, e), b.y + b.h * lerp(0.95, 0.66, e), b.h * 0.15, { sock: WILD.jerseyPrimary, sock2: WILD.jerseySecondary, boot: '#1f2937', ang: lerp(1.0, -0.1, e), flip: false });
      },
      kIn,
      [60, -40]
    );
  }
  // quadro: a capa do herói se desfazendo em pixels (o "apague")
  function cutErase(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    cut(
      ctx,
      [[24, top + 24], [440, top + 24], [440, bot - 24], [24, bot - 24]],
      (b, g) => {
        panelBg(g, b, '#3a0d0d', '#0a0202', 'rgba(0,0,0,0.4)');
        capeHang(g, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.16, b.w * 0.86, b.h * 0.72, S.t);
        // os blocos apagando de cima para baixo (no quadro em pixel cada bloco é um pixel)
        const k = easeIO(q);
        g.fillStyle = '#050101';
        const cell = PIX * 2;
        for (let yy = b.y; yy < b.y + b.h; yy += cell) {
          for (let xx = b.x; xx < b.x + b.w; xx += cell) {
            const v = (yy - b.y) / b.h;
            if (rnd(Math.floor(xx / cell) * 31 + Math.floor(yy / cell), 9) * 0.5 + v * 0.6 < k * 1.15) g.fillRect(xx, yy, cell, cell);
          }
        }
      },
      kIn,
      [-60, 0]
    );
  }

  CE.registerCine3D('wildcard_hell', {
    phases: [300, 300, 380, 320, 380],
    music: 'tension',
    title: '🃏 O INFERNO DO WILD CARD',
    tags: ['PLANO 1 • SUBSOLO', 'PLANO 2 • ESCANEAMENTO', 'PLANO 3 • DIA 1... DIA 47', 'PLANO 4 • APAGUE', 'PLANO 5 • O ATACANTE PERFEITO'],
    subs: [
      [{ from: 70, who: '???', text: '"Bem-vindo ao Wild Card."', color: VOICE_C }],
      [{ from: 40, who: '???', text: '"Perna esquerda: fraca. Emoção: instável."', color: VOICE_C }],
      [{ from: 20, who: 'NARRADOR', text: 'Dia após dia. Cair. Levantar. Cair de novo.', color: NARR_C }],
      [{ from: 30, who: '???', text: '"O herói é peso morto. Apague."', color: VOICE_C }],
      [{ from: 250, who: '???', text: '"Perfeito."', color: VOICE_C }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      if (phase === 0) {
        // A GRUA: da lente no teto, descendo e recuando até ele, parado na plataforma
        const k = easeIO(t / 300);
        lab(K, t, { talk: seg(t, 70, 80) * (1 - seg(t, 230, 250)), shaft: true });
        wildA(K, { x: VX, y: VY, ang: Math.PI / 2, light: [0.95, 0.76, 0.66] });
        // (começa fechada na lente, sem ele no quadro; ele entra por baixo conforme a câmera
        // desce e abre)
        K.cam(mixP([VX + 0.5, 1.95, VY + 3.4], [VX + 0.38, 0.8, VY + 3.6], k), mixP([VX, 2.0, VY - 0.2], [VX, 0.6, VY], k), lerp(32, 44, k));
        st.lens = W3(VX, LENS[1] - 0.05, VY);
      } else if (phase === 1) {
        // O ESCANEAMENTO: a câmera dá a volta nele; o anel de laser desce pelo corpo
        const k = easeIO(t / 300);
        lab(K, t, { noPlat: true, expo: 0.9, talk: seg(t, 40, 50) * (1 - seg(t, 260, 280)) });
        K.floor({ x0: VX - 1.1, y0: VY - 1.1, x1: VX + 1.1, y1: VY + 1.1, z: 0.016, img: ringCv('#f97316'), em: true });
        [-1, 1].forEach((s) => {
          const px = VX + s * 1.15;
          K.box({ x0: px - 0.07, y0: VY - 0.07, x1: px + 0.07, y1: VY + 0.07, z0: 0, z1: 1.6, color: '#0d090a' });
          for (let i = 0; i < 9; i++) {
            const on = (Math.floor(t / 6) + i) % 7 === 0;
            K.box({ x0: px - 0.075, y0: VY - 0.03, x1: px + 0.075, y1: VY + 0.03, z0: 0.1 + i * 0.16, z1: 0.18 + i * 0.16, color: on ? '#fdba74' : '#7c2d12', em: true });
          }
        });
        const pass = (t % 150) / 150;
        const lz = lerp(1.0, -0.02, pass);
        K.floor({ x0: VX - 1.15, y0: VY - 0.6, x1: VX + 1.15, y1: VY + 0.6, z: Math.max(0.03, lz), img: glowCv('rgba(249,115,22,0.42)'), em: true, alpha: 0.85 });
        wildA(K, { x: VX, y: VY, ang: Math.PI / 2, light: [1.0, 0.8, 0.7] });
        const a = lerp(-0.95, 0.75, k);
        const R = 2.9;
        K.cam([VX + Math.sin(a) * R, lerp(0.8, 0.62, k), VY + Math.cos(a) * R], [VX, 0.5, VY], 46);
      } else if (phase === 2) {
        // DIA 1... DIA 47: o tombo (de lado, câmera lenta no choque), levantar, a canhota
        lab(K, t, { noPlat: true });
        if (t < 120) {
          const A = remap(t, [[0, 0], [44, 44], [84, 54], [120, 90]]);
          const HIT = 50;
          if (A < HIT) {
            const e = seg(A, 0, HIT);
            wildA(K, { x: lerp(VX - 2.6, VX - 0.32, e), y: VY, ang: 0, anim: 'run', frame: RUNF(f) });
            holo(K, 'h', lerp(VX + 2.4, VX + 0.12, seg(A, 8, HIT)), VY + 0.02, { ang: Math.PI, anim: 'run', frame: RUNF(f + 2) });
          } else {
            const u = A - HIT;
            const fall = ease(seg(u, 0, 14));
            wildA(K, { x: lerp(VX - 0.32, VX - 0.9, fall), y: VY, ang: 0, anim: u < 6 ? 'stun' : 'fall', frame: 1, opts: u >= 6 ? { animTime: Math.min(40, (u - 6) * 2) } : undefined });
            holo(K, 'h', VX + 0.12 + ease(seg(u, 0, 30)) * 0.9, VY + 0.02, { ang: Math.PI, anim: 'run', frame: RUNF(f + 2), alpha: 0.82 * (1 - seg(u, 6, 34)) });
          }
          const sh = A >= HIT ? 0.03 * Math.max(0, 1 - (A - HIT) / 10) : 0.004;
          K.cam(shake(K, [lerp(VX - 1.3, VX - 0.75, seg(A, 0, HIT)), 0.52, VY + 2.7], f * 2, sh, 2), [lerp(VX - 1.0, VX - 0.45, seg(A, 0, HIT)), 0.42, VY], 46);
          st.hit = W3(VX - 0.2, 0.5, VY);
          st.A = A;
        } else if (t < 220) {
          // de pé de novo: de joelhos, depois em pé; a câmera sobe junto
          const u = t - 120;
          const up = u > 56;
          wildA(K, { x: VX - 0.9, y: VY, ang: Math.PI / 2, anim: up ? 'idle' : 'kneel_one', frame: 0, light: [0.95, 0.74, 0.64] });
          const k = easeIO(u / 100);
          K.cam([VX - 0.2, lerp(0.3, 0.62, k), VY + 2.4], [VX - 0.9, lerp(0.32, 0.5, k), VY], 46);
        } else {
          // dia 47: a canhota no gol holográfico
          const u = t - 220;
          const SHOT = 60;
          holoGoal(K, VX + 2.4, VY, u >= SHOT + 14 ? 1 - seg(u, SHOT + 14, SHOT + 44) : 0);
          const an = u < SHOT - 14 ? 'idle' : u < SHOT ? 'windup' : 'shoot';
          wildA(K, { x: VX - 1.3, y: VY, ang: 0, anim: an, frame: 1, opts: { mirror: true } });
          if (u >= SHOT) {
            const bp = seg(u, SHOT, SHOT + 14);
            if (bp < 1) K.ball(lerp(VX - 1.1, VX + 2.3, bp), VY + lerp(0.05, -0.2, bp), lerp(0.06, 0.48, bp) + Math.sin(Math.PI * bp) * 0.15);
          } else K.ball(VX - 1.05, VY + 0.05, 0.06);
          const k = easeIO(u / 160);
          K.cam([lerp(VX - 2.6, VX - 2.2, k), lerp(0.55, 0.62, k), VY + 2.4], [VX + 0.3, 0.45, VY - 0.1], 48);
        }
      } else if (phase === 3) {
        // APAGUE: debaixo da lente, de baixo; a câmera chega devagar
        const k = easeIO(t / 320);
        lab(K, t, { expo: 0.8, shaft: true, talk: seg(t, 30, 40) * (1 - seg(t, 280, 300)) });
        const gray = seg(t, 150, 260);
        wildA(K, { x: VX, y: VY, ang: Math.PI / 2, light: mixP([1.2, 0.6, 0.54], [0.72, 0.7, 0.68], gray) });
        K.cam([lerp(VX + 0.9, VX + 0.4, k), lerp(0.32, 0.38, k), lerp(VY + 2.9, VY + 2.4, k)], [VX, lerp(0.75, 0.65, k), VY], lerp(50, 46, k));
        st.lens = W3(VX, LENS[1] - 0.05, VY);
        st.you = W3(VX, 0.5, VY);
      } else {
        const CUT = 200;
        if (t < CUT) {
          // o dia 47: passa por três hologramas (eles quebram) e chuta — a câmera de lado
          const KICK = 150;
          const kx = VX - 4 + Math.min(t, 140) * 0.046;
          lab(K, t, { noPlat: true, expo: 0.88 });
          const HX = [VX - 2.6, VX - 1.0, VX + 0.6];
          HX.forEach((hx, i) => {
            const tp = (hx - (VX - 4)) / 0.046;
            const sh = seg(t, tp - 2, tp + 26);
            shards(K, hx, VY, sh, 10 + i);
            if (sh >= 0.25) return;
            holo(K, 'h' + i, hx, VY, { ang: Math.PI, anim: i === 1 ? 'run' : 'idle', frame: i === 1 ? RUNF(f + i) : 0, alpha: 0.82 * (1 - seg(sh, 0, 0.25)) });
          });
          holoGoal(K, VX + 3.4, VY, t >= KICK + 22 ? 1 - seg(t, KICK + 22, KICK + 48) : 0);
          const jumpTp = (HX[1] - (VX - 4)) / 0.046;
          const jump = Math.sin(Math.PI * seg(t, jumpTp - 12, jumpTp + 10)) * 0.32;
          const an = t < 140 ? 'run' : t < KICK ? 'windup' : 'shoot';
          coldA(K, { x: kx, y: VY, z: jump, ang: 0, anim: an, frame: an === 'run' ? RUNF(f) : 1 });
          let bp = null;
          if (t >= KICK && t < KICK + 22) {
            const q = seg(t, KICK, KICK + 22);
            bp = [lerp(kx + 0.2, VX + 3.35, q), VY, lerp(0.06, 0.42, q) + Math.sin(Math.PI * q) * 0.18];
          } else if (t < KICK) bp = [kx + 0.22, VY + 0.05, 0.06];
          if (bp) K.ball(bp[0], bp[1], bp[2]);
          const camX = Math.min(kx + 0.5, VX + 2.4);
          const sh = t >= KICK ? 0.04 * Math.max(0, 1 - (t - KICK) / 18) : 0.004;
          K.cam(shake(K, [camX - 0.3, 0.58, VY + 2.9], f * 2, sh, 4), [camX + 0.4, 0.45, VY - 0.3], 50);
          st.foot = W3(kx + 0.25, 0.15, VY);
          if (bp) st.ball = W3(bp[0], bp[2], bp[1]);
        } else {
          // o rosto: vazio. Sem cor, a câmera baixa chegando devagar
          const u = t - CUT;
          const k = easeIO(u / 180);
          lab(K, t, { expo: 0.76, fog: '#0c0908', shaft: 0.6 });
          coldA(K, { x: VX, y: VY, ang: Math.PI / 2, light: [0.74, 0.72, 0.7] });
          K.cam([lerp(VX - 0.7, VX - 0.35, k), lerp(0.3, 0.42, k), lerp(VY + 3.0, VY + 2.45, k)], [VX, 0.62, VY], lerp(48, 44, k));
          st.eyes = W3(VX, 0.74, VY);
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        flare(ctx, S, st.lens, 0.55 + 0.25 * Math.sin(t * 0.05), '248,113,113', 0.9);
        CE.luckKicker(ctx, 40, top + 30, 'LOCAL NÃO REGISTRADO • -80 M', seg(t, 10, 50), '#ef4444');
        CE.cineSfx(S, 70, 'voz', () => window.SFX?.blip?.(120));
      } else if (phase === 1) {
        if (t > 120 && t < 280) cutScan(ctx, S, seg(t, 120, 128), seg(t, 120, 280));
        CE.cineSfx(S, 30, 'scan', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        // o contador de dias, discreto no canto
        const day = t < 120 ? 1 : t < 220 ? 9 : t < 290 ? 23 : 47;
        const at = t < 120 ? 0 : t < 220 ? 120 : t < 290 ? 220 : 290;
        CE.luckKicker(ctx, 40, top + 30, `WILD CARD • DIA ${String(day).padStart(2, '0')}`, seg(t, at + 2, at + 22), day === 47 ? '#ef4444' : '#fb923c');
        if (t < 120 && st.A !== undefined) {
          // o choque: poeira no chão e o clarão curto
          const u = st.A - 50;
          if (u >= 0 && st.hit) {
            CE.cineGlow(ctx, st.hit.x, st.hit.y, 120, 'rgba(253,186,116,0.6)', 1 - seg(u, 0, 10));
            ctx.fillStyle = `rgba(214,190,170,${0.55 * (1 - seg(u, 0, 36))})`;
            for (let i = 0; i < 12; i++) ctx.fillRect(Math.round(st.hit.x + (rnd(i, 2) - 0.5) * 220 * (0.4 + seg(u, 0, 30))), Math.round(st.hit.y + 60 - rnd(i, 3) * 70 * seg(u, 0, 30)), 8, 8);
          }
        }
        if (t >= 252 && t < 282) cutLeft(ctx, S, seg(t, 252, 259), seg(t, 252, 282));
        [120, 220, 290].forEach((b, i) => CE.cineSfx(S, b, 'dia' + i, () => window.SFX?.blip?.(300 + i * 80)));
        CE.cineSfx(S, 50, 'tombo', () => window.SFX?.tackle?.());
        CE.cineSfx(S, 280, 'chute', () => window.SFX?.kick?.(0.9));
      } else if (phase === 3) {
        flare(ctx, S, st.lens, 0.5, '248,113,113', 0.8);
        // a cor vai embora: de fora para dentro, até sobrar só ele... e depois ele também
        const g1 = ease(seg(t, 90, 200));
        if (g1 > 0) bwTint(ctx, W, H, 1, { inside: false, x: st.you ? st.you.x : W / 2, y: st.you ? st.you.y : H / 2, r: (1 - g1) * W * 1.2 + 70 }, '#7f1d1d');
        if (t > 200) bwTint(ctx, W, H, seg(t, 200, 260), null, '#7f1d1d');
        if (t > 150 && t < 296) cutErase(ctx, S, seg(t, 150, 158), seg(t, 176, 330));
        CE.cineSfx(S, 150, 'apague', () => window.SFX?.whoosh?.());
      } else {
        const CUT = 200;
        if (t < CUT) {
          const KICK = 150;
          // o chute: o único quadro de impacto da cena e o rastro da bola
          if (t >= KICK && t < KICK + 2) impactFrame(ctx, W, H);
          if (t >= KICK) {
            CE.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, KICK + 1, KICK + 8)), '#fed7aa');
            if (st.foot && st.ball) CE.luckStreak(ctx, st.foot.x, st.foot.y, st.ball.x, st.ball.y, 4, 22, '253,186,116', 0.8 * (1 - seg(t, KICK + 18, KICK + 34)));
            if (t < KICK + 8 && st.foot) CE.drawRadialSpeedLines(ctx, st.foot.x, st.foot.y, W, '#fde68a', 0.4 * (1 - (t - KICK) / 8));
          } else CE.drawSpeedLines(ctx, W, H, '#fed7aa', 0.1);
          CE.cineSfx(S, KICK, 'chute', () => window.SFX?.kick?.(1));
          CE.cineSfx(S, KICK + 22, 'rede', () => window.SFX?.post?.());
        } else {
          const u = t - CUT;
          bwTint(ctx, W, H, 1, null, '#44403c');
          if (u < 3) CE.cineFlash(ctx, W, H, 0.5 * (1 - u / 3), '#000000');
          CE.luckKicker(ctx, 40, top + 30, 'DIA 47 • PROGRAMA CONCLUÍDO', seg(u, 10, 50), '#a8a29e');
        }
      }
    }
  });

  // ==========================================================================
  // 3 e 4. O CAMPO DO PRÉDIO (x 45–61, parede norte em y = 6): os refletores das quatro
  // torres, a porta preta na parede norte (à direita do gol) e o telão em cima dela
  // ==========================================================================
  const LAMPS = [[60.7, 6.3], [45.3, 6.3], [60.7, 22.7], [45.3, 22.7]];
  const LAMP_Z = 3.33;
  const BD = { x0: 56.6, x1: 58.0, y: 6.0, h: 1.3 };
  const BDX = (BD.x0 + BD.x1) / 2;
  // refletor apagado: uma tampa escura por cima da cabeça acesa da torre
  const lampOff = (K, i) => {
    const [x, y] = LAMPS[i];
    K.box({ x0: x - 0.48, y0: y - 0.23, x1: x + 0.48, y1: y + 0.23, z0: 3.07, z1: 3.58, color: '#0b1220', top: '#111827' });
    K.floor({ x0: x - 0.48, y0: y - 0.23, x1: x + 0.48, y1: y + 0.23, z: 3.065, color: '#0b1220' });
  };
  // a porta preta na parede norte do campo
  function fieldDoor(K, t, open, seam = 1) {
    const dw = BD.x1 - BD.x0;
    const y = BD.y;
    K.box({ x0: BD.x0 - 0.12, y0: y, x1: BD.x1 + 0.12, y1: y + 0.07, z0: BD.h, z1: BD.h + 0.12, color: '#020203' });
    K.box({ x0: BD.x0 - 0.12, y0: y, x1: BD.x0, y1: y + 0.07, z0: 0, z1: BD.h, color: '#020203' });
    K.box({ x0: BD.x1, y0: y, x1: BD.x1 + 0.12, y1: y + 0.07, z0: 0, z1: BD.h, color: '#020203' });
    if (open > 0) Q(K, { x: BDX, y: y + 0.01, w: dw, h: BD.h, ang: Math.PI / 2, img: insideCv(), em: true });
    const off = open * (dw / 2 + 0.12);
    Q(K, { x: BD.x0 + dw / 4 - off, y: y + 0.03, w: dw / 2, h: BD.h, ang: Math.PI / 2, img: leafCv(-1) });
    Q(K, { x: BD.x1 - dw / 4 + off, y: y + 0.03, w: dw / 2, h: BD.h, ang: Math.PI / 2, img: leafCv(1) });
    const leak = seam * (0.78 + 0.22 * Math.sin(t * 0.05));
    if (open < 0.04 && leak > 0.02) {
      Q(K, { x: BDX, y: y + 0.04, w: 0.025, h: BD.h, ang: Math.PI / 2, color: '#fb923c', em: true, alpha: Math.min(0.95, leak) });
      Q(K, { x: BDX, y: y + 0.04, w: dw, h: 0.03, ang: Math.PI / 2, color: '#fed7aa', em: true, alpha: Math.min(0.95, leak) });
    }
    const pool = Math.min(0.95, Math.max(leak * 0.7, open));
    if (pool > 0.02) K.floor({ x0: BDX - 2.2, y0: y, x1: BDX + 2.2, y1: y + 1.4 + open * 3.0, img: glowCv('rgba(249,115,22,0.55)', 0.5, 0), em: true, alpha: pool });
    Q(K, { x: BDX, y: y + 0.08, z: BD.h + 0.02, w: 0.3, h: 0.3, ang: Math.PI / 2, img: glowCv('rgba(239,68,68,0.7)'), em: true, alpha: Math.min(0.95, 0.6 + 0.4 * Math.sin(t * 0.07)) });
  }
  // o telão em cima da parede norte (fn pinta o canvas: 380 x 150). Fica na frente da
  // parede (y > 6): atrás dela a arquibancada escondia o telão inteiro
  function bigScreen(K, S, key, every, fn) {
    const L = live(key, 380, 150, S.f, every, fn);
    K.box({ x0: 50.6, y0: 6.0, x1: 50.75, y1: 6.12, z0: 0, z1: 1.95, color: '#111827' });
    K.box({ x0: 55.25, y0: 6.0, x1: 55.4, y1: 6.12, z0: 0, z1: 1.95, color: '#111827' });
    K.box({ x0: 50.4, y0: 6.02, x1: 55.6, y1: 6.16, z0: 1.82, z1: 4.0, color: '#0b1220' });
    Q(K, { x: 53, y: 6.17, z: 1.9, w: 5.0, h: 2.0, ang: Math.PI / 2, img: L.cv, dirty: L.dirty, em: true });
  }
  const fieldNight = (K, expo, stars = 0.7) => {
    K.sky('#02040a', '#0b1426', stars);
    K.fog('#03060c', 0.03);
    K.ambient('#7c8aa6');
    K.expo(expo);
  };
  // reflexo dos refletores ainda acesos (on = [k0..k3])
  const lampFlares = (ctx, S, K, on, k = 1) =>
    LAMPS.forEach(([x, y], i) => {
      if (on[i] > 0.02) flare(ctx, S, K.screen(x, LAMP_Z, y), on[i] * k, '186,230,253', 0.9);
    });

  // --------------------------------------------------------------- O RETORNO DO CORINGA
  // cada torre morre num tempo (pisca e apaga); as duas do fundo, que aparecem, primeiro
  const DIE = [70, 118, 166, 214];
  const lampK = (t, d) => {
    if (t < d) return 1;
    const u = t - d;
    return u < 14 ? [1, 0.15, 0.9, 0, 0.5, 0, 0.2][Math.floor(u / 2)] : 0;
  };
  const TRIO = [['bachira', 52.1, 13.6], ['you', 53.0, 13.9], ['chigiri', 53.9, 13.6]];
  // quadro: a chuteira preta pisando na fumaça
  function cutStep(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    cut(
      ctx,
      [[W - 500, bot - 250], [W - 24, bot - 270], [W - 24, bot - 22], [W - 520, bot - 22]],
      (b, g) => {
        panelBg(g, b, '#9a3412', '#3b1206', 'rgba(15,4,2,0.4)');
        const land = ease(seg(q, 0.1, 0.4));
        CA().boot(g, b.x + b.w * 0.45 + b.ox, b.y + b.h * lerp(0.5, 0.8, land), b.h * 0.24, { sock: '#27272a', sock2: '#ea580c', boot: '#0b0f19', ang: lerp(0.4, 0.05, land) });
        // a fumaça abrindo em volta do pé
        g.fillStyle = 'rgba(231,229,228,0.75)';
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI;
          const d = b.w * (0.12 + seg(q, 0.35, 1) * 0.3);
          g.beginPath();
          g.arc(b.x + b.w * 0.5 + b.ox + Math.cos(a) * d * (i % 2 ? 1 : -1), b.y + b.h * 0.86, b.h * 0.08, 0, TAU);
          g.fill();
        }
      },
      kIn,
      [0, 60]
    );
  }
  // quadro: a capa vermelha caída no chão, na frente da porta preta (o herói ficou lá)
  function cutCape(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    cut(
      ctx,
      [[24, top + 24], [470, top + 24], [470, top + 290], [24, top + 290]],
      (b, g) => {
        // o chão escuro com a luz laranja vindo da porta (lá atrás, fora do quadro)
        const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h);
        gr.addColorStop(0, '#2a0f06');
        gr.addColorStop(0.45, '#7c2d12');
        gr.addColorStop(1, '#1c0a05');
        g.fillStyle = gr;
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        CA().halftone(g, b.x, b.y, b.w, b.h * 0.4, { step: 14, color: 'rgba(0,0,0,0.45)', from: 'top', max: 0.8 });
        // a capa largada no chão, perdendo a cor
        capeFloor(g, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.5, b.w * 0.72, b.h * 0.4);
        g.fillStyle = `rgba(28,25,23,${0.65 * seg(q, 0.45, 1)})`;
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
      },
      kIn,
      [-60, 0]
    );
  }

  CE.registerCine3D('kunigami_return', {
    phases: [320, 330, 320, 320, 340],
    music: 'dread',
    title: '🃏 O RETORNO DO CORINGA',
    tags: ['PLANO 1 • O APAGÃO', 'PLANO 2 • A PORTA PRETA', 'PLANO 3 • O CORINGA', 'PLANO 4 • O HERÓI MORREU', 'PLANO 5 • O RETORNO'],
    subs: [
      [{ from: 14, who: 'NARRADOR', text: 'Véspera da NEL. Os refletores se apagam.', color: NARR_C }],
      [{ from: 150, who: 'CHIGIRI', text: '"...Quem é aquele?"', color: CHI_C }],
      [{ from: 60, who: 'CHIGIRI', text: '"Kunigami?! Por onde você andou?!"', color: CHI_C }],
      [{ from: 40, who: 'KUNIGAMI', text: '"O herói morreu naquela porta."', color: COLD_C }],
      [{ from: 30, who: 'KUNIGAMI', text: '"Agora só sobrou o atacante."', color: COLD_C }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      const bl = { kit: 'blueLock', k: 0.88 };
      const cold = (o) => K.actor('kunigami', Object.assign({ extra: COLD, k: 0.9 }, o));
      if (phase === 0) {
        // O APAGÃO: a grua desce por trás dos três; as torres morrem uma a uma
        const on = DIE.map((d) => lampK(t, d));
        on.forEach((v, i) => v < 0.5 && lampOff(K, i));
        const amb = on.reduce((a, b) => a + b, 0) / 4;
        fieldNight(K, lerp(0.3, 1.0, amb * amb), 0.8);
        if (amb < 0.5) K.c.noLights = true;
        fieldDoor(K, t, 0, 0.3);
        const lt = mixP([0.26, 0.32, 0.55], [1.0, 1.0, 1.02], amb);
        const look = seg(t, 90, 120);
        TRIO.forEach(([id, x, y], i) => K.actor(id, Object.assign({ x, y, ang: -Math.PI / 2 + (i - 1) * 0.5 * look, light: lt }, bl)));
        const k = easeIO(t / 320);
        K.cam(mixP([53.4, 2.6, 19.6], [53.25, 0.95, 17.4], k), mixP([53.2, 0.4, 10.5], [53.6, 0.75, 7.0], k), lerp(58, 50, k));
        st.on = on;
      } else if (phase === 1) {
        // A PORTA PRETA: no escuro, por trás de vocês (longe); a fresta acende, as folhas
        // abrem em câmera lenta e a silhueta aparece na luz
        const A = remap(t, [[0, 0], [90, 90], [180, 104], [330, 254]]);
        const OPEN = 90;
        const open = ease(seg(A, OPEN, OPEN + 40));
        fieldNight(K, 0.36 + open * 0.08, 0.8);
        K.c.noLights = true;
        [0, 1, 2, 3].forEach((i) => lampOff(K, i));
        fieldDoor(K, t, open, seg(t, 10, 70));
        smoke(K, BDX - 3, BDX + 3, 6.3, 9.5, t, 8, 'rgba(234,120,80,0.2)', open, 9);
        if (A > OPEN + 30) {
          const wk = seg(A, OPEN + 30, 254);
          cold({ x: BDX, y: lerp(6.15, 7.4, wk), ang: Math.PI / 2, anim: 'run', frame: WALKF(f, 8), view: 'front', alpha: Math.min(1, seg(A, OPEN + 30, OPEN + 60) + 0.001), light: [0.12, 0.08, 0.07] });
        }
        // (vocês dois longe da câmera, contra a luz: pequenos, nos cantos do quadro)
        const rim = open > 0.1 ? [0.3, 0.2, 0.16] : [0.14, 0.15, 0.2];
        K.actor('you', Object.assign({ x: BDX - 1.05, y: 10.9, ang: -Math.PI / 2, light: rim }, bl));
        K.actor('chigiri', Object.assign({ x: BDX + 1.1, y: 10.8, ang: -Math.PI / 2, light: rim }, bl));
        const k = easeIO(t / 330);
        const sh = A >= OPEN ? 0.05 * Math.max(0, 1 - (A - OPEN) / 8) : 0.003;
        K.cam(shake(K, [lerp(BDX - 0.3, BDX + 0.2, k), lerp(0.8, 0.7, k), lerp(14.9, 14.3, k)], f * 2, sh, 2), [BDX, lerp(0.6, 0.64, k), 6.0], lerp(40, 36, k));
        st.door = W3(BDX, 0.65, 6.05);
        st.open = open;
        st.A = A;
      } else if (phase === 2) {
        // O CORINGA: ele sai da fumaça andando para a câmera, que recua na frente dele
        fieldNight(K, 0.44, 0.8);
        K.c.noLights = true;
        [0, 1, 2, 3].forEach((i) => lampOff(K, i));
        fieldDoor(K, t, 1);
        const wk = seg(t, 0, 300);
        const ky = lerp(7.4, 9.4, wk);
        Q(K, { x: BDX, y: ky, z: 0, w: 1.4, h: 3.2, ang: faceCam(K, BDX, ky) + Math.PI, img: shaftCv('rgba(226,232,240,0.26)'), em: true, alpha: 0.85 });
        K.floor({ x0: BDX - 1.0, y0: ky - 0.6, x1: BDX + 1.0, y1: ky + 0.6, img: glowCv('rgba(226,232,240,0.32)'), em: true });
        smoke(K, BDX - 3, BDX + 3, 7.0, 11.0, t, 8, 'rgba(214,194,176,0.16)', 1, 3);
        cold({ x: BDX, y: ky, ang: Math.PI / 2, anim: 'run', frame: WALKF(f, 8), view: 'front', light: [0.9, 0.86, 0.82] });
        const n = K.noise(t * 0.5, 4) * 0.01;
        K.cam([BDX + 0.55 + n, lerp(0.3, 0.36, wk), ky + 2.7], [BDX, 0.62, ky - 0.2], 44);
        st.door = W3(BDX, 0.65, 6.05);
      } else if (phase === 3) {
        // O HERÓI MORREU: parado debaixo da única luz; a câmera dá meia volta devagar
        fieldNight(K, 0.4, 0.8);
        K.c.noLights = true;
        [0, 1, 2, 3].forEach((i) => lampOff(K, i));
        fieldDoor(K, t, 1);
        smoke(K, BDX - 3, BDX + 3, 8.0, 11.0, t, 7, 'rgba(168,146,126,0.14)', 1, 6);
        Q(K, { x: BDX, y: 9.4, z: 0, w: 1.4, h: 3.2, ang: faceCam(K, BDX, 9.4) + Math.PI, img: shaftCv('rgba(226,232,240,0.22)'), em: true, alpha: 0.8 });
        cold({ x: BDX, y: 9.4, ang: Math.PI / 2, frame: 0, light: [0.62, 0.6, 0.58] });
        const k = easeIO(t / 320);
        const a = lerp(0.55, -0.35, k);
        K.cam([BDX + Math.sin(a) * 2.6, lerp(0.7, 0.6, k), 9.4 + Math.cos(a) * 2.6], [BDX, 0.58, 9.4], 46);
      } else {
        // O RETORNO: de baixo, os refletores mortos lá em cima voltam um a um atrás dele
        fieldNight(K, 0.46, 1);
        const ON = [70, 120, 170, 220];
        const on = ON.map((d) => (t < d ? 0 : t - d < 8 ? [1, 0, 1, 0.3][Math.floor((t - d) / 2)] : 1));
        on.forEach((v, i) => v < 0.5 && lampOff(K, i));
        const lit = on.reduce((a, b) => a + b, 0) / 4;
        if (lit < 0.5) K.c.noLights = true;
        K.expo(lerp(0.46, 0.8, lit));
        fieldDoor(K, t, 1 - seg(t, 10, 60));
        smoke(K, BDX - 3, BDX + 3, 8.4, 10.6, t, 8, 'rgba(214,194,176,0.15)', 1, 8);
        cold({ x: BDX, y: 9.4, ang: Math.PI / 2, frame: 0, light: mixP([0.7, 0.68, 0.66], [0.95, 0.92, 0.9], lit) });
        const k = easeIO(t / 340);
        const sh = t >= 220 ? 0.035 * Math.max(0, 1 - (t - 220) / 20) : 0.002;
        K.cam(shake(K, [BDX + 0.25, lerp(0.12, 0.16, k), lerp(12.2, 11.9, k)], f * 2, sh, 6), [BDX - 0.15, lerp(1.2, 1.1, k), 8.0], lerp(58, 54, k));
        st.on = on;
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        lampFlares(ctx, S, K, st.on || [1, 1, 1, 1], 0.9);
        CE.luckKicker(ctx, 40, top + 30, 'BLUE LOCK • ARENA CENTRAL', seg(t, 8, 46), '#e2e8f0');
        CE.luckKicker(ctx, 40, top + 62, 'VÉSPERA DA NEO EGOIST LEAGUE • 23:51', seg(t, 30, 76), '#38bdf8');
        DIE.forEach((d, i) => CE.cineSfx(S, d, 'apaga' + i, () => window.SFX?.tackle?.()));
      } else if (phase === 1) {
        const A = st.A || 0;
        const OPEN = 90;
        if (st.door && st.open > 0) {
          CE.cineGlow(ctx, st.door.x, st.door.y, 200, 'rgba(255,237,213,0.5)', st.open);
          flare(ctx, S, st.door, st.open * 0.85, '253,186,116', 1.1);
        }
        // a porta bate aberta: o único quadro de impacto da cena
        if (A >= OPEN && A < OPEN + 1.6) impactFrame(ctx, W, H);
        if (A >= OPEN) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(A, OPEN + 1, OPEN + 6)), '#fed7aa');
        CE.cineSfx(S, OPEN, 'porta', () => {
          window.SFX?.kick?.(1);
          window.SFX?.whoosh?.();
        });
      } else if (phase === 2) {
        if (st.door) flare(ctx, S, st.door, 0.6, '253,186,116', 0.9);
        if (t > 150 && t < 290) cutStep(ctx, S, seg(t, 150, 158), seg(t, 150, 290));
        CE.cineSfx(S, 190, 'passo', () => window.SFX?.kick?.(0.2));
      } else if (phase === 3) {
        if (t > 120 && t < 300) cutCape(ctx, S, seg(t, 120, 130), seg(t, 130, 300));
      } else {
        lampFlares(ctx, S, K, st.on || [0, 0, 0, 0], 1);
        const tk = seg(t, 240, 280);
        if (tk > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, tk * 2);
          const g = ctx.createLinearGradient(0, bot - 220, 0, bot);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, 'rgba(0,0,0,0.8)');
          ctx.fillStyle = g;
          ctx.fillRect(0, bot - 220, W, 220);
          ctx.restore();
        }
        CE.cineTitleCard(ctx, W, bot - 100, tk, { kicker: 'NEO EGOIST LEAGUE', title: 'O RETORNO DO CORINGA', sub: '', color: '#c2410c' });
        [70, 120, 170, 220].forEach((d, i) => CE.cineSfx(S, d, 'acende' + i, () => window.SFX?.tackle?.()));
      }
    }
  });

  // --------------------------------------------------------------- O VEREDITO
  // quadro: as duas mãos tremendo (param quando ele ouve a pergunta)
  function cutHands(ctx, S, kIn, t) {
    const { W, top, bot } = S;
    const cd = charOf('kunigami', COLD);
    cut(
      ctx,
      [[W * 0.5, top + 20], [W - 22, top + 20], [W - 22, top + 300], [W * 0.5, top + 300]],
      (b, g) => {
        // o que ele vê: o gramado escuro lá embaixo, com a linha branca
        const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h);
        gr.addColorStop(0, '#0f3d22');
        gr.addColorStop(1, '#06180e');
        g.fillStyle = gr;
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        g.fillStyle = 'rgba(226,232,240,0.7)';
        g.save();
        g.translate(b.x + b.w * 0.5, b.y + b.h * 0.3);
        g.rotate(-0.12);
        g.fillRect(-b.w, -6, b.w * 2, 12);
        g.restore();
        // as duas mãos abertas, palmas para cima, tremendo (param quando ele ouve)
        const tr = 1 - seg(t, 230, 260);
        [-1, 1].forEach((s) => {
          const dx = CE.cineNoise(t * 2.7, s + 3) * 7 * tr;
          const dy = CE.cineNoise(t * 2.3, s + 9) * 5 * tr;
          hand(g, b.x + b.w * (0.5 + s * 0.22) + b.ox + dx, b.y + b.h * 0.66 + dy, b.h * 0.42, { close: 0.15, skin: cd.skinColor, sleeve: WILD.jerseyPrimary, ang: -s * 0.3, flip: s > 0 });
        });
      },
      kIn,
      [0, -50]
    );
  }
  // quadro: a lembrança do Time Z (três silhuetas rindo no pôr do sol) — racha e cai
  function cutTimeZ(ctx, S, kIn, u, fall) {
    const { W, top, bot } = S;
    ctx.save();
    ctx.globalAlpha = 1 - fall;
    ctx.translate(0, fall * fall * 240);
    cut(
      ctx,
      [[W * 0.5, top + 26], [W - 30, top + 18], [W - 44, bot - 40], [W * 0.48, bot - 30]],
      (b, g) => {
        const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h);
        gr.addColorStop(0, '#9a3412');
        gr.addColorStop(0.6, '#fb923c');
        gr.addColorStop(1, '#fde68a');
        g.fillStyle = gr;
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        g.fillStyle = '#3b1206';
        g.fillRect(b.x - 10, b.y + b.h * 0.82, b.w + 20, b.h * 0.3);
        // o sol baixo e os três do Time Z rindo (silhuetas pequenas, longe)
        g.fillStyle = 'rgba(255,247,237,0.9)';
        g.beginPath();
        g.arc(b.x + b.w * 0.66 + b.ox, b.y + b.h * 0.7, b.h * 0.14, 0, TAU);
        g.fill();
        const who = [['you', -0.22], ['kunigami', 0], ['bachira', 0.22]];
        who.forEach(([id, dx], i) => {
          const cd = id === 'you' ? CE.cineYou(BLK) : charOf(id, BLK);
          const bob = Math.abs(Math.sin(u * 0.2 + i)) * b.h * 0.02;
          CA().silhouette(g, cd, b.x + b.w * (0.5 + dx) + b.ox, b.y + b.h * 0.86 - bob, b.h * 0.42, { pose: i === 1 ? 'celebrate' : 'idle', view: 'front', fill: '#2a0d06' });
        });
        // a rachadura
        const ck = seg(u, 90, 116);
        if (ck > 0) {
          g.strokeStyle = '#0b0f19';
          g.lineWidth = 8;
          g.beginPath();
          const cx = b.x + b.w * 0.55;
          g.moveTo(cx, b.y);
          [[0.5, 0.2], [0.6, 0.38], [0.48, 0.55], [0.58, 0.78], [0.52, 1]].forEach(([fx, fy], i) => {
            if (fy <= ck * 1.05) g.lineTo(b.x + b.w * fx, b.y + b.h * fy);
          });
          g.stroke();
        }
      },
      kIn,
      [90, 0]
    );
    ctx.restore();
  }

  const egoScreenFn = (S, o) => (g, w, h) => CE.finEgoScreen(g, 0, 0, w, h, S.t, o);
  CE.registerCine3D('wildcard_verdict', {
    phases: [300, 320, 330, 300, 370],
    music: 'mystery',
    title: '🃏 O VEREDITO',
    tags: ['PLANO 1 • DEPOIS DO APITO', 'PLANO 2 • AS MÃOS', 'PLANO 3 • UMA RACHADURA', 'PLANO 4 • APROVADO', 'PLANO 5 • NA NEL'],
    subs: [
      [{ from: 12, who: 'NARRADOR', text: 'Fim de jogo. O estádio já está vazio.', color: NARR_C }],
      [{ from: 50, who: 'CHIGIRI', text: '"Rensuke... você ainda tá aí dentro?"', color: CHI_C }],
      [{ from: 30, who: 'NARRADOR', text: 'Por um segundo, alguma coisa lá dentro sorriu.', color: NARR_C }],
      [{ from: 40, who: 'EGO', text: '"Aprovado. Destino: Manshine City."', color: EGO_C }],
      [{ from: 150, who: 'KUNIGAMI', text: '"Na NEL... eu vou te devorar."', color: COLD_C }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      const bl = { kit: 'blueLock', k: 0.88 };
      const cold = (o) => K.actor('kunigami', Object.assign({ extra: COLD, k: 0.9 }, o));
      // só as duas torres do fundo acesas
      const half = () => {
        lampOff(K, 2);
        lampOff(K, 3);
      };
      const screenFim = () =>
        bigScreen(K, S, 'fim', 4, (g, w, h) => {
          CE.cineGradient(g, 0, 0, w, h, [[0, '#06283a'], [1, '#020b16']]);
          CE.finPixelText(g, 'FIM DE JOGO', w / 2, h * 0.42, 3.2, '#38bdf8', 'center', w - 30);
          CE.finFillPat(g, 'scan', 0, 0, w, h, 0.8);
        });
      if (phase === 0) {
        // A GRUA: o estádio vazio do alto, descendo até ele, sozinho no meio do campo
        const k = easeIO(t / 300);
        fieldNight(K, 0.55, 0.8);
        half();
        screenFim();
        cold({ x: 53, y: 14.2, ang: Math.PI / 2, frame: 0, light: [0.78, 0.76, 0.76] });
        K.cam(mixP([51.6, 3.0, 21.6], [52.4, 0.8, 17.4], k), mixP([53, 0.3, 12.0], [53, 0.55, 14.0], k), lerp(60, 46, k));
        st.l0 = W3(LAMPS[0][0], LAMP_Z, LAMPS[0][1]);
        st.l1 = W3(LAMPS[1][0], LAMP_Z, LAMPS[1][1]);
      } else if (phase === 1) {
        // AS MÃOS: de lado e de cima, ele olhando as mãos; o Chigiri chegando lá na frente
        fieldNight(K, 0.6, 0.8);
        half();
        screenFim();
        cold({ x: 53, y: 14.2, ang: -Math.PI / 2, frame: 0, light: [0.7, 0.7, 0.74] });
        const ck = easeIO(seg(t, 0, 200));
        K.actor('chigiri', Object.assign({ x: lerp(51.4, 52.2, ck), y: lerp(10.6, 11.6, ck), ang: Math.atan2(14.2 - 11.6, 53 - 52.2), anim: ck < 1 ? 'run' : 'idle', frame: ck < 1 ? WALKF(f, 7) : 0, light: [0.62, 0.64, 0.8] }, bl));
        const k = easeIO(t / 320);
        K.cam([lerp(55.1, 54.8, k), lerp(1.1, 0.95, k), lerp(16.3, 16.0, k)], [lerp(53.0, 52.7, k), 0.45, lerp(13.6, 13.0, k)], 46);
      } else if (phase === 2) {
        // UMA RACHADURA: sem cor; a câmera chega nele; no meio, a cor volta por um segundo
        const k = easeIO(t / 330);
        const HIT = 80;
        const warmK = seg(t, HIT, HIT + 8) * (1 - seg(t, 220, 260));
        fieldNight(K, 0.6 + warmK * 0.15, 0.8);
        half();
        cold({ x: 53, y: 14.2, ang: Math.PI / 2, frame: 0, light: mixP([0.72, 0.7, 0.7], [1.2, 0.95, 0.75], warmK) });
        // (ele no terço esquerdo: o quadro da lembrança entra na direita sem tapar)
        K.cam([lerp(54.6, 54.2, k), lerp(0.75, 0.66, k), lerp(16.9, 16.5, k)], [lerp(54.0, 53.8, k), 0.6, 13.9], lerp(48, 44, k));
        st.you = W3(53, 0.55, 14.2);
        st.warm = warmK;
      } else if (phase === 3) {
        // APROVADO: o Ego no telão; ele, de baixo e de costas, olhando para cima
        const k = easeIO(t / 300);
        fieldNight(K, 0.6, 0.6);
        half();
        bigScreen(K, S, 'ego', 3, egoScreenFn(S, { live: true, ticker: 'WILD CARD • RENSUKE KUNIGAMI • RESULTADO: APROVADO • DESTINO: MANSHINE CITY •' }));
        K.floor({ x0: 50, y0: 6, x1: 56, y1: 10.5, img: glowCv('rgba(0,245,212,0.18)', 0.5, 0), em: true });
        cold({ x: 54.0, y: 9.8, ang: -Math.PI / 2, frame: 0, light: [0.32, 0.46, 0.5] });
        K.cam([lerp(55.2, 54.9, k), lerp(0.3, 0.26, k), lerp(12.6, 12.2, k)], [lerp(53.6, 53.3, k), lerp(1.7, 2.1, k), 6.0], lerp(54, 50, k));
        st.scr = W3(53, 2.9, 5.95);
      } else {
        const CUT = 140;
        if (t < CUT) {
          // ele vai embora para a porta preta; vocês dois de costas, longe, olhando
          const k = easeIO(t / CUT);
          fieldNight(K, 0.5, 0.8);
          half();
          fieldDoor(K, t, 0, 0.6);
          cold({ x: lerp(55.0, 56.4, k), y: lerp(12.2, 9.6, k), ang: Math.atan2(6 - 12.2, BDX - 55), anim: 'run', frame: WALKF(f, 7), light: [0.56, 0.56, 0.6] });
          K.actor('chigiri', Object.assign({ x: 51.6, y: 15.6, ang: -Math.PI / 2 + 0.35, light: [0.3, 0.32, 0.42] }, bl));
          K.actor('you', Object.assign({ x: 52.5, y: 16.1, ang: -Math.PI / 2 + 0.3, light: [0.3, 0.32, 0.42] }, bl));
          K.cam([lerp(51.2, 51.5, k), 0.82, lerp(19.0, 18.7, k)], [lerp(54.5, 55.4, k), 0.5, lerp(11, 10, k)], 46);
        } else {
          // na porta: ele vira o rosto (a porta abre atrás dele, laranja, em câmera lenta);
          // o escuro engole
          const u = t - CUT;
          const A = remap(u, [[0, 0], [110, 110], [190, 134], [230, 174]]);
          const open = ease(seg(A, 110, 150));
          const k = easeIO(u / 230);
          fieldNight(K, 0.42, 0.6);
          half();
          K.c.noLights = true;
          fieldDoor(K, t, open, 1);
          cold({ x: BDX, y: 7.6, ang: Math.PI / 2 + 0.35, frame: 0, light: mixP([0.55, 0.5, 0.46], [0.3, 0.2, 0.16], open) });
          K.cam([lerp(BDX + 1.3, BDX + 1.0, k), lerp(0.42, 0.48, k), lerp(10.3, 10.0, k)], [BDX - 0.05, 0.62, 7.4], 44);
          st.door = W3(BDX, 0.65, 6.05);
          st.open = open;
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        flare(ctx, S, st.l0, 0.7, '186,230,253', 0.9);
        flare(ctx, S, st.l1, 0.7, '186,230,253', 0.9);
        CE.cineDust(ctx, W, H, t, 22, 'rgba(226,232,240,0.4)', 13);
        CE.luckKicker(ctx, 40, top + 30, 'BLUE LOCK x WILD CARD • FIM DE JOGO', seg(t, 8, 48), '#e2e8f0');
        CE.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
      } else if (phase === 1) {
        if (t > 30 && t < 300) cutHands(ctx, S, seg(t, 30, 38), t);
      } else if (phase === 2) {
        const HIT = 80;
        const p = st.you || { x: W / 2, y: H / 2 };
        // frio (sem cor) e, no HIT, a cor volta num círculo a partir do peito dele
        const back = ease(seg(t, HIT, HIT + 18)) * (1 - seg(t, 220, 270));
        bwTint(ctx, W, H, 1, back > 0.01 ? { inside: false, x: p.x, y: p.y, r: back * W * 1.3 } : null, '#64748b');
        if (t >= HIT) CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, HIT, HIT + 10)), '#fff7ed');
        if (t > HIT + 4 && t < 262) cutTimeZ(ctx, S, seg(t, HIT + 4, HIT + 12), t - HIT, seg(t, 210, 262));
        CE.cineSfx(S, HIT, 'racha', () => window.SFX?.kick?.(0.6));
        CE.cineSfx(S, HIT + 110, 'quebra', () => window.SFX?.post?.());
      } else if (phase === 3) {
        if (st.scr) {
          CE.cineGlow(ctx, st.scr.x, st.scr.y, 320, 'rgba(0,245,212,0.16)');
          flare(ctx, S, st.scr, 0.35, '94,234,212', 1.1);
        }
        CE.cineSfx(S, 40, 'aprovado', () => window.SFX?.blip?.(520));
      } else {
        const CUT = 140;
        if (t >= CUT) {
          const u = t - CUT;
          if (u < 3) CE.cineFlash(ctx, W, H, 0.5 * (1 - u / 3), '#000000');
          if (st.door && st.open > 0) flare(ctx, S, st.door, st.open * 0.8, '253,186,116', 1.0);
          const fo = seg(u, 196, 230);
          if (fo > 0) {
            ctx.fillStyle = `rgba(0,0,0,${fo})`;
            ctx.fillRect(0, 0, W, H);
          }
          CE.cineSfx(S, CUT + 120, 'porta', () => window.SFX?.whoosh?.());
        }
      }
    }
  });
})();
