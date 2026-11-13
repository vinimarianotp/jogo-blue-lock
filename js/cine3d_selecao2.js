// ============================================================================
// CUTSCENES EM 3D — a Segunda Seleção, refeitas no padrão do gol da Sub-20 (js/cine3d_u20.js):
// cinema no campo do prédio (o mesmo lugar onde as conversas 'bluelock_holo' acontecem),
// câmera sempre andando (grua, travelling, push-in), câmera lenta com rampa nos momentos-chave,
// no máximo um quadro de impacto por cena, preto e branco azulado quando o tempo "para",
// quadros de mangá em pixel art (chuteira, bola, mão, silhueta) e quase nenhum texto na tela.
//   bluelock_man_test            • o robô holográfico no gol: lê tudo... menos o chute de primeira
//   rin_takes_bachira(_win)      • fim do 3x3: o Bachira vai embora com o Rin
//   barou_devour                 • 5x5: você rouba o gol do próprio Rei
//   world_five_fall / _win       • Blue Lock x World Five no estádio holográfico
// Os ajudantes de câmera/pós/quadros ficam em CE._c3b (usados também por js/cine3d_manga.js).
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
    const a = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
    return a - Math.floor(a);
  };
  // curva de Bézier quadrática em 3D ([x, y, z])
  const bez3 = (a, c, b, k) => a.map((v, i) => lerp(lerp(v, c[i], k), lerp(c[i], b[i], k), k));
  // tempo da ação com câmera lenta: keys = [[tempo real, tempo da ação], ...] (rampa = entra e sai suave)
  const remap = (t, keys) => {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    }
    return keys[keys.length - 1][1] + (t - keys[keys.length - 1][0]);
  };
  // canvas feito UMA vez
  const mkCv = (w, h, fn) => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (fn) fn(g, w, h);
    return cv;
  };
  const lazy = (fn) => {
    let v = null;
    return () => v || (v = fn());
  };

  const BL = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const TEAL = { jerseyPrimary: '#134e4a', jerseySecondary: '#5eead4' };
  const WORLD = { jerseyPrimary: '#f1f5f9', jerseySecondary: '#b45309' };
  const YOU_C = '#00f5d4';
  const EGO_C = '#00f5d4';
  const NARR_C = '#94a3b8';
  const RIN_C = '#22d3ee';
  const BACH_C = '#facc15';
  const NAGI_C = '#cbd5e1';
  const ARYU_C = '#c084fc';
  const TOKI_C = '#a3e635';
  const BAROU_C = '#f87171';
  const LOKI_C = '#fbbf24';
  const DARK = [0.22, 0.24, 0.32];

  // ---------------------------------------------------------------- o campo do prédio
  // u = de lado (0 = meio do gol norte), d = distância da linha do gol norte (para o sul), z = altura
  const GX = 53;
  const GY = 6.6;
  const P = (u, d, z = 0) => [GX + u, GY + d, z];
  // o mesmo, a partir do gol sul (e = distância da linha do gol sul, para o norte)
  const Q = (u, e, z = 0) => [GX + u, 22.4 - e, z];
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  const act = (K, who, p, o = {}) => K.actor(who, Object.assign({ x: p[0], y: p[1], z: p[2] || 0 }, o));
  const ball = (K, p, o = {}) => K.ball(p[0], p[1], p[2] || 0, o);
  // tremida suave (ruído, nunca aleatório por quadro)
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp, p[2] + K.noise(f, seed + 7) * amp * 0.6];
  // ponto do mundo guardado na cena para o overlay achar na tela
  const W3 = (p) => ({ __w: p });
  function stOf(K) {
    const st = {};
    Object.keys(K.st || {}).forEach((k) => {
      const v = K.st[k];
      st[k] = v && v.__w ? K.screen(v.__w[0], v.__w[2], v.__w[1]) : v;
    });
    return st;
  }
  // as torres dos refletores do campo (lâmpadas a ~3,3 de altura)
  const TOWERS = [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]];
  const LAMP_Z = 3.33;
  // a noite do estádio holográfico
  function arena(K, o = {}) {
    K.sky(o.top || '#01030a', o.hor || '#0b1a3a', o.stars ?? 0.5);
    K.fog(o.fog || '#060d1f', o.fogK ?? 0.02);
    K.expo(o.expo ?? 1.0);
  }

  // placa em pé com a imagem lida da esquerda para a direita por quem olha de frente
  function plate(K, o) {
    const ang = o.ang ?? 0;
    const nx = Math.cos(ang);
    const ny = Math.sin(ang);
    const hw = o.w / 2;
    const L = [o.x - ny * hw, o.y + nx * hw];
    const R = [o.x + ny * hw, o.y - nx * hw];
    const z0 = o.z || 0;
    const z1 = z0 + o.h;
    const v = [];
    const V = (x, z, y, u, vv) => v.push(x, z, y, u, vv, nx, 0, ny);
    V(L[0], z1, L[1], 0, 0);
    V(R[0], z1, R[1], 1, 0);
    V(R[0], z0, R[1], 1, 1);
    V(L[0], z1, L[1], 0, 0);
    V(R[0], z0, R[1], 1, 1);
    V(L[0], z0, L[1], 0, 1);
    K._push(v, o);
  }
  // placa deitada girada (anel que roda no chão)
  function disc(K, x, y, r, ang, o) {
    const c = Math.cos(ang) * r;
    const s = Math.sin(ang) * r;
    const z = o.z || 0.012;
    const p = [[x - c + s, y - s - c], [x + c + s, y + s - c], [x + c - s, y + s + c], [x - c - s, y - s + c]];
    const v = [];
    const V = (q, u, vv) => v.push(q[0], z, q[1], u, vv, 0, 1, 0);
    V(p[0], 0, 0);
    V(p[1], 1, 0);
    V(p[2], 1, 1);
    V(p[0], 0, 0);
    V(p[2], 1, 1);
    V(p[3], 0, 1);
    K._push(v, o);
  }

  // ---------------------------------------------------------------- texturas
  const SHADOW = lazy(() =>
    mkCv(64, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0.62)');
      gr.addColorStop(0.55, 'rgba(0,0,0,0.38)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, TAU);
      g.fill();
    })
  );
  // anel holográfico tracejado (onde o robô nasce, a escolha do Nagi)
  const RINGH = lazy(() =>
    mkCv(96, 96, (g) => {
      g.strokeStyle = '#ffffff';
      g.lineWidth = 3;
      g.setLineDash([14, 8]);
      g.beginPath();
      g.arc(48, 48, 44, 0, TAU);
      g.stroke();
      g.setLineDash([10, 10]);
      g.lineWidth = 2;
      g.beginPath();
      g.arc(48, 48, 34, 0, TAU);
      g.stroke();
    })
  );
  // mancha de luz no chão (o refletor que sobra)
  const SPOT = lazy(() =>
    mkCv(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    })
  );

  // sombra comprida no gramado: base em (x, y), comprimento len na direção ang
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
    K._push(v, { img: SHADOW(), color: '#000000', alpha: a });
  }
  // sombra de quem está em p, com a luz vindo de src ([x, y])
  const shadowFrom = (K, src, p, len, w, a) => longShadow(K, p[0], p[1], len, Math.atan2(p[1] - src[1], p[0] - src[0]), w, a);

  // ---------------------------------------------------------------- pós (no overlay)
  // preto e branco com tom azulado; circle.inside: só dentro do círculo / fora: só fora dele;
  // circle.holes: [{x, y, r}] = quem continua com cor (o resto fica cinza)
  function bwBlue(ctx, W, H, a = 1, circle = null) {
    if (a <= 0) return;
    ctx.save();
    if (circle && circle.holes) {
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      circle.holes.forEach((h) => {
        ctx.moveTo(h.x + h.r, h.y);
        ctx.arc(h.x, h.y, h.r, 0, TAU, true);
      });
      ctx.clip('evenodd');
    } else if (circle) {
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
  // reflexo da lente nos refletores visíveis (brilho, risco horizontal e reflexos na diagonal)
  function flares(ctx, K, S, k = 1) {
    if (k <= 0) return;
    const { W, H } = S;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    TOWERS.forEach(([x, y]) => {
      const p = K.screen(x, LAMP_Z, y);
      if (!p || p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 120) return;
      CE.cineGlow(ctx, p.x, p.y, 120, 'rgba(255,255,255,0.5)', k);
      CE.cineGlow(ctx, p.x, p.y, 40, 'rgba(255,255,255,0.9)', k);
      const gr = ctx.createLinearGradient(p.x - 420, 0, p.x + 420, 0);
      gr.addColorStop(0, 'rgba(125,211,252,0)');
      gr.addColorStop(0.5, `rgba(186,230,253,${0.45 * k})`);
      gr.addColorStop(1, 'rgba(125,211,252,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(p.x - 420, p.y - 2, 840, 4);
      const cx = W / 2;
      const cy = H / 2;
      [[0.45, 26, 'rgba(56,189,248,0.2)'], [0.8, 14, 'rgba(250,204,21,0.18)'], [1.3, 40, 'rgba(99,102,241,0.12)']].forEach(([fk, r, col]) => {
        CE.cineGlow(ctx, p.x + (cx - p.x) * fk * 2, p.y + (cy - p.y) * fk * 2, r, col, k);
      });
    });
    ctx.restore();
  }
  // rede em primeiro plano estufando onde a bola bate (a câmera dentro do gol)
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
      [0, 1].forEach((s) => {
        ctx.beginPath();
        for (let j = 0; j <= 30; j++) {
          const y = top + ((bot - top) * j) / 30;
          const x = s ? i * cell - (j % 2) * cell * 0.5 + cell * 0.5 : i * cell + (j % 2) * cell * 0.5;
          const [bx, by] = bulge(x, y);
          if (j) ctx.lineTo(bx, by);
          else ctx.moveTo(bx, by);
        }
        ctx.stroke();
      });
    }
    ctx.restore();
  }
  // olhos acesos na contraluz: dois pontinhos na altura dos olhos de quem olha para a câmera
  // (p = [x, y, z dos olhos]; o tamanho segue a distância, sem ampliar o boneco). sep = meia
  // distância entre os olhos, em ladrilhos (o robô usa o padrão)
  function eyesLit(ctx, K, p, color, k, sep = 0.015) {
    if (k <= 0) return;
    const a = K.screen(p[0], p[2], p[1]);
    const b = K.screen(p[0], p[2] + 0.1, p[1]);
    if (!a || !b) return;
    const u = Math.abs(a.y - b.y) * 10; // px por ladrilho nessa distância
    [-1, 1].forEach((s) => {
      CE.cineGlow(ctx, a.x + s * u * sep, a.y, Math.max(8, u * 0.045), color, k);
      CE.cineGlow(ctx, a.x + s * u * sep, a.y, Math.max(3, u * 0.0145), 'rgba(240,253,250,1)', k);
    });
  }
  // os olhos de um boneco de frente (k 0,9, em pé): altura ~0,56 do chão e ~0,057 de cada
  // lado do meio (antes 0,74 e 0,015: o brilho saía na testa, num ponto só — M24)
  const EYE_Z = 0.56;
  const EYE_SEP = 0.057;
  // a previsão da máquina: arco tracejado da bola até o canto (k = quanto já desenhou)
  function predictArc(ctx, K, a, b, k, t, rgb = '0,200,230', alpha = 1) {
    if (k <= 0 || alpha <= 0) return;
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.max(a[2], b[2]) + 0.45];
    const e = ease(k);
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 2) * alpha;
    ctx.strokeStyle = `rgba(${rgb},0.9)`;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -t * 1.5;
    ctx.beginPath();
    let ok = 0;
    for (let i = 0; i <= 24; i++) {
      const q = bez3(a, c, b, (i / 24) * e);
      const p = K.screen(q[0], q[2], q[1]);
      if (!p) continue;
      if (ok++) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const pb = K.screen(b[0], b[2], b[1]);
    if (pb && e > 0.95) {
      ctx.strokeStyle = `rgb(${rgb})`;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(pb.x + sx * 16, pb.y + sy * 16 - sy * 7);
        ctx.lineTo(pb.x + sx * 16, pb.y + sy * 16);
        ctx.lineTo(pb.x + sx * 16 - sx * 7, pb.y + sy * 16);
        ctx.stroke();
      });
    }
    ctx.restore();
  }
  // linha no chão do campo (tracejada ou cheia), pontos [x, y] do mundo
  function groundPath(ctx, K, pts, color, lw, dash, off = 0, k = 1) {
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(k);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    if (dash) {
      ctx.setLineDash(dash);
      ctx.lineDashOffset = off;
    }
    ctx.beginPath();
    let n = 0;
    pts.forEach((q) => {
      const p = K.screen(q[0], 0.02, q[1]);
      if (!p) return;
      if (n++) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }
  // anel no chão (projetado)
  function groundRing(ctx, K, c, r, color, lw, k = 1) {
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(k);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * TAU;
      const p = K.screen(c[0] + Math.cos(a) * r, 0.02, c[1] + Math.sin(a) * r);
      if (!p) continue;
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }
  const fadeBlack = (ctx, S, a) => {
    if (a <= 0) return;
    ctx.fillStyle = `rgba(0,0,0,${clamp(a)})`;
    ctx.fillRect(0, 0, S.W, S.H);
  };
  // letreiro discreto de lugar/minuto (canto de cima)
  const kick = (ctx, S, text, k, color = '#e2e8f0', row = 0) => CE.luckKicker(ctx, 40, S.top + 30 + row * 30, text, k, color);
  // placar pequeno no canto de cima
  const board = (ctx, S, hs, as, o = {}) => CE.sselBoard(ctx, S.W - 180, S.top + 34, hs, as, Object.assign({ s: 0.5 }, o));
  // o nome da cena no fim (pequeno, como o "O GOL DA VITÓRIA" da Sub-20)
  function endTitle(ctx, S, k, kicker, title, color) {
    if (k <= 0) return;
    CE.finKicker(ctx, S.W / 2, S.top + 54, kicker, k, color, 'center');
    CE.cineImpactText(ctx, title, S.W / 2, S.top + 124, 70, '#f8fafc', k, S.W * 0.78, 0);
  }

  // ---------------------------------------------------------------- quadros de mangá (pixel art)
  // Os closes são desenhados em baixa resolução e ampliados sem suavizar (a mesma escala de
  // pixel dos bonecos): chuteira, bola, mão, silhueta. Nunca o boneco ampliado.
  const PIX = 6;
  const CA = () => CE.ART;
  function cutin(ctx, poly, kIn, from, draw, o = {}) {
    const A = CA();
    if (!A || kIn <= 0) return;
    A.panel(ctx, poly, draw, Object.assign({ k: kIn, from, pixel: PIX }, o));
  }
  // fundo de papel com retícula nas sombras (embaixo)
  function paper(g, b, col = '#e2e8f0', tone = 'rgba(15,23,42,0.32)') {
    g.fillStyle = col;
    g.fillRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16);
    const A = CA();
    if (A) A.halftone(g, b.x, b.y, b.w, b.h, { color: tone, step: 18, from: 'bottom', max: 0.75 });
  }
  // peça em pixel art da cine_manga (punho, braço, mão com bola): u = px da tela por unidade
  function partAt(g, e, x, y, u) {
    if (!e) return;
    g.save();
    g.imageSmoothingEnabled = false;
    CE.mgmPartAt(g, e, x, y, u);
    g.restore();
  }
  // imagem pequena em pixel art (mão do Loki, coroa) com cada pixel = px da tela
  function pixImg(g, cv, x, y, px, rot = 0) {
    if (!cv) return;
    g.save();
    g.imageSmoothingEnabled = false;
    g.translate(x, y);
    if (rot) g.rotate(rot);
    g.drawImage(cv, (-cv.width * px) / 2, (-cv.height * px) / 2, cv.width * px, cv.height * px);
    g.restore();
  }
  // as chuteiras de cada um nos closes
  const BOOTS = {
    you: { sock: '#0f2942', sock2: '#38bdf8', boot: '#22d3ee' },
    barou: { sock: '#0f2942', sock2: '#38bdf8', boot: '#dc2626' },
    loki: { sock: '#f1f5f9', sock2: '#b45309', boot: '#f59e0b' },
    rin: { sock: '#0f2942', sock2: '#38bdf8', boot: '#2dd4bf' }
  };

  // ==========================================================================
  // 1. O BLUE LOCK MAN — o goleiro holográfico no gol norte do campo
  // ==========================================================================
  const ROBOT = {
    id: 'ssel_robot', name: 'BLUE LOCK MAN', skinColor: '#1e3a8a', hairColor: '#00f5d4', hairSecondary: '#38bdf8', eyeColor: '#00f5d4',
    hairStyle: 'short_sharp', jerseyPrimary: '#090d16', jerseySecondary: '#00f5d4', auraColor: '#00f5d4'
  };
  const ROB = P(0, 0.34);
  const ME = P(-0.12, 3.35);
  const BALL0 = P(0.1, 2.93, 0.05);
  const TGT1 = P(-0.82, 0.12, 0.7); // a tentativa lida: o canto esquerdo
  const TGT2 = P(-0.86, 0.02, 0.9); // o de primeira: o ângulo
  const KICK_AT = P(0.06, 2.97, 0.05);
  const AWAY = P(0, -9); // para onde você olha (o gol)
  // o robô: parado (balança), mergulhando (dive) ou se materializando (rv 0..1)
  function robot(K, t, o = {}) {
    const rv = o.rv ?? 1;
    if (rv <= 0) return;
    const p = o.p || P(Math.sin(t * 0.05) * 0.08, 0.34);
    const light = rv < 1 ? K.mix([0.4, 1.6, 1.6], [1.0, 1.25, 1.35], rv) : o.light || [1.0, 1.25, 1.35];
    if (o.dive) act(K, ROBOT, p, { id: 'rob', ang: o.dir < 0 ? Math.PI : 0, anim: 'dive', frame: 1, light, k: 0.92, alpha: o.alpha });
    else act(K, ROBOT, p, { id: 'rob', face: P(p[0] - GX, 9), anim: o.anim || 'idle', frame: o.frame, light, alpha: rv < 1 ? 0.3 + 0.7 * rv : o.alpha ?? 1, k: 0.92 });
    if (rv < 1) {
      // a linha de luz subindo pelo corpo e a coluna de luz
      K.floor({ x0: p[0] - 0.42, y0: p[1] - 0.2, x1: p[0] + 0.42, y1: p[1] + 0.2, z: 0.02 + rv * 0.9, color: '#00f5d4', alpha: 0.6, em: true });
      K.quad({ x: p[0], y: p[1], w: 0.9, h: 2.4, ang: Math.PI / 2, color: '#67e8f9', alpha: 0.12 * (1 - rv) + 0.03, em: true });
    }
  }
  // mergulho do robô até o alvo (e 0..1): devolve a posição da mão (onde a bola fica presa)
  function robotDive(K, tgt, e, fall, t) {
    const dir = tgt[0] < GX ? -1 : 1;
    const x = lerp(ROB[0], tgt[0] - dir * 0.34, e);
    const z = Math.max(0, lerp(0, tgt[2] - 0.42, e) * (1 - fall));
    robot(K, t, { dive: true, dir, p: [x, ROB[1] + 0.08, z] });
    return [x + dir * 0.34, ROB[1] + 0.03, z + 0.42];
  }
  // as bolas das tentativas que ficaram pelo chão da área
  const BALLS = Array.from({ length: 26 }, (_, i) => P((rnd(i, 3) - 0.5) * 3.4, -0.35 + rnd(i, 4) * 2.2, 0.05));
  const robEyes = (p) => W3([p[0], p[1], 0.77]);

  const BLM_PH = [180, 130, 190, 200, 170, 160, 120, 230];
  // a 1ª tentativa (plano 3): o robô já cai para o canto antes do chute
  const A2 = (t) => remap(t, [[0, 0], [44, 44], [150, 68], [190, 108]]);
  const A2K = 46;
  const A2C = 66;
  const A2D = 38;
  const B5K = 100; // o chute de primeira (plano 6)

  CE.registerCine3D('bluelock_man_test', {
    phases: BLM_PH,
    music: 'tension',
    title: '🤖 O BLUE LOCK MAN',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    readScale: 0.85,
    theme: 'bluelock_holo',
    tags: ['PLANO 1 • A CÂMARA', 'PLANO 2 • A MÁQUINA', 'PLANO 3 • DEFENDIDO', 'PLANO 4 • DE NOVO', 'PLANO 5 • A BOLA VOLTA', 'PLANO 6 • DE PRIMEIRA', 'PLANO 7 • O ÂNGULO', 'PLANO 8 • PASSOU'],
    subs: [
      [{ from: 34, to: 178, who: 'EGO', text: '"Segunda Seleção, primeira fase: derrote o BLUE LOCK MAN."', color: EGO_C }],
      [],
      [{ from: 30, to: 188, who: 'NARRADOR', text: 'A máquina defende antes mesmo de você chutar.', color: NARR_C }],
      [{ from: 20, to: 198, who: 'VOCÊ', text: '(Ele lê tudo. Cada passo. Cada chute.)', color: YOU_C }],
      [{ from: 14, to: 168, who: 'VOCÊ', text: '(Preciso de uma arma que a máquina não leia.)', color: YOU_C }],
      [],
      [],
      [{ from: 40, to: 210, who: 'EGO', text: '"Passou. Bem-vindo à próxima fase."', color: EGO_C }]
    ],
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      arena(K);
      const you = (o = {}) => act(K, 'you', ME, Object.assign({ id: 'y', face: AWAY, extra: BL }, o));
      if (phase === 0) {
        // A CÂMARA: a grua desce do alto até atrás de você; o robô se materializa no gol
        const rv = ease(seg(t, 40, 140));
        const ring = seg(t, 20, 50) * (1 - 0.6 * seg(t, 140, 180));
        if (ring > 0) K.floor({ x0: ROB[0] - 0.75, y0: ROB[1] - 0.75, x1: ROB[0] + 0.75, y1: ROB[1] + 0.75, z: 0.012, img: RINGH(), color: '#00f5d4', alpha: 0.9 * ring, em: true });
        robot(K, t, { rv: t > 30 ? Math.max(0.001, rv) : 0 });
        ball(K, BALL0);
        you();
        const k = easeIO(seg(t, 0, 180));
        cam(K, mixP(P(3.2, 10.5, 3.4), P(1.15, 6.7, 0.85), k), mixP(P(0, 1.5, 0.3), P(-0.05, 1.3, 0.55), k), lerp(54, 40, k));
        st.rob = W3(P(0, 0.34, 0.5));
        st.rv = rv;
      } else if (phase === 1) {
        // A MÁQUINA: de baixo, o robô no gol (apagado, na sombra); os olhos acendem
        robot(K, t, { light: K.mix([0.45, 0.6, 0.72], [0.75, 0.95, 1.05], seg(t, 40, 70)) });
        ball(K, BALL0);
        const k = easeIO(t / 130);
        const p = P(Math.sin(t * 0.05) * 0.08, 0.34);
        cam(K, shake(K, mixP(P(1.0, 3.4, 0.16), P(0.7, 3.15, 0.2), k), f * 0.5, 0.003), P(0, 0.34, lerp(0.72, 0.78, k)), 40);
        st.eyes = robEyes(p);
      } else if (phase === 2) {
        // DEFENDIDO: de lado, na altura da bola; o robô cai no canto ANTES do chute (câmera lenta)
        const A = A2(t);
        const yst = A < 30 ? 'idle' : A < A2K ? 'windup' : A < A2K + 18 ? 'shoot' : 'idle';
        you({ anim: yst, frame: yst === 'idle' ? undefined : 1 });
        let hand = null;
        if (A < A2D) robot(K, A);
        else hand = robotDive(K, TGT1, ease(seg(A, A2D, A2C)), ease(seg(A, A2C + 10, A2C + 26)), A);
        const ctl = [(BALL0[0] + TGT1[0]) / 2, (BALL0[1] + TGT1[1]) / 2, TGT1[2] + 0.4];
        let bp = BALL0;
        if (A >= A2K && A < A2C) bp = bez3(BALL0, ctl, TGT1, seg(A, A2K, A2C));
        else if (A >= A2C && hand) bp = hand;
        ball(K, bp);
        const k = easeIO(seg(t, 20, 170));
        const hit = A >= A2C ? 0.012 * Math.max(0, 1 - (A - A2C) / 12) : 0.004;
        cam(K, shake(K, mixP(P(2.55, 3.4, 0.36), P(2.15, 2.0, 0.48), k), f, hit, 2), mixP(P(-0.1, 3.0, 0.45), P(-0.55, 0.55, 0.6), k), 44);
        st.ball = W3(bp);
        if (A >= A2K && A < A2C) st.b1 = W3(bez3(BALL0, ctl, TGT1, seg(A - 5, A2K, A2C)));
      } else if (phase === 3) {
        // DE NOVO: tentativa atrás de tentativa (vista do alto, girando devagar); as bolas se
        // acumulam na área; no fim você cai sentado
        const per = 24;
        const N = 6;
        const i = Math.min(N - 1, Math.floor(t / per));
        const lt = t - i * per;
        const dirs = [1, -1, 1, 1, -1, -1];
        const zs = [0.82, 0.32, 0.55, 0.9, 0.7, 0.4];
        const tgt = P(dirs[i] * 0.84, 0.1, zs[i]);
        if (t < N * per) {
          const yst = lt < 8 ? 'windup' : lt < 18 ? 'shoot' : 'idle';
          you({ anim: yst, frame: yst === 'idle' ? undefined : 1 });
          const hand = robotDive(K, tgt, ease(seg(lt, 2, 15)), 0, t);
          const bp = lt < 8 ? BALL0 : lt < 15 ? bez3(BALL0, [(BALL0[0] + tgt[0]) / 2, 1.6 + GY, tgt[2] + 0.3], tgt, seg(lt, 8, 15)) : hand;
          ball(K, bp);
        } else {
          robot(K, t);
          const u = t - N * per;
          you({ anim: u < 14 ? 'fall' : 'sit_floor', frame: u < 14 ? Math.floor(u / 3) : undefined });
          ball(K, mixP(BALL0, P(1.6, 4.4, 0.05), ease(seg(u, 0, 50))));
        }
        const nb = Math.min(BALLS.length, 3 + i * 3 + (t >= N * per ? 6 : 0));
        for (let j = 0; j < nb; j++) ball(K, BALLS[j]);
        const a = lerp(0.42, -0.28, easeIO(t / 200));
        const r = 4.3;
        cam(K, [GX + Math.sin(a) * r, GY + 2.0 + Math.cos(a) * r, lerp(3.1, 2.8, t / 200)], P(0, 1.7, 0.2), 46);
        st.n = Math.floor(lerp(8, 63, easeIn(seg(t, 0, 176))));
      } else if (phase === 4) {
        // A BOLA VOLTA: rente ao chão; o robô devolve rolando, devagar, até você
        K.expo(lerp(1.0, 0.74, seg(t, 30, 130)));
        robot(K, t, { anim: t > 8 && t < 26 ? 'shoot' : 'idle', frame: t > 8 && t < 26 ? 1 : undefined });
        you({ light: K.mix([1, 1, 1], [0.8, 1.05, 1.18], seg(t, 30, 130)) });
        const bk = seg(t, 18, 170);
        const bp = mixP(P(0.6, 0.6, 0.05), P(0.05, 2.25, 0.05), 1 - Math.pow(1 - bk, 1.6));
        ball(K, bp);
        const k = easeIO(t / 170);
        cam(K, shake(K, mixP(P(-1.3, 0.75, 0.13), P(-1.05, 1.0, 0.15), k), f * 0.5, 0.003, 4), mixP(P(-0.25, 3.3, 0.38), P(-0.12, 3.3, 0.45), k), lerp(40, 36, k));
      } else if (phase === 5) {
        // DE PRIMEIRA: o mundo perde a cor, a bola chega, você chuta sem dominar
        const KT = B5K;
        const yst = t < 70 ? 'idle' : t < KT ? 'windup' : 'shoot';
        you({ anim: yst, frame: yst === 'idle' ? undefined : 1 });
        if (t < KT + 6) robot(K, t);
        else robotDive(K, P(0.84, 0.1, 0.5), ease(seg(t, KT + 6, KT + 40)), ease(seg(t, KT + 44, KT + 58)), t);
        let bp;
        if (t < KT) bp = mixP(P(0.05, 2.25, 0.05), KICK_AT, ease(t / KT) * 0.6 + (t / KT) * 0.4);
        else bp = bez3(KICK_AT, P(-0.5, 1.4, 1.2), TGT2, Math.min(0.95, seg(t, KT, KT + 22)));
        ball(K, bp);
        const push = easeIO(seg(t, 0, KT));
        const after = t >= KT ? 0.03 * Math.max(0, 1 - (t - KT) / 26) : 0.003;
        cam(K, shake(K, mixP(P(3.1, 3.6, 0.32), P(2.8, 3.45, 0.32), push), f * 2, after, 3), P(-0.12, 3.1, 0.47), lerp(40, 36, push));
        st.foot = W3(P(0.0, 3.0, 0.2));
        st.ball = W3(bp);
        if (t >= KT) st.b1 = W3(bez3(KICK_AT, P(-0.5, 1.4, 1.2), TGT2, Math.min(0.95, seg(t - 4, KT, KT + 22))));
      } else if (phase === 6) {
        // O ÂNGULO: de dentro do gol; a bola entra no ângulo, o robô caído do outro lado
        const HIT = 22;
        const bp = t < HIT ? mixP(P(-0.5, 1.9, 0.82), P(-0.86, -0.3, 0.88), t / HIT) : P(-0.84, -0.38, Math.max(0.06, 0.88 - (t - HIT) * 0.03));
        ball(K, bp);
        const gl = t > HIT ? 0.55 + 0.45 * Math.abs(K.noise(t * 2, 9)) : 1;
        robot(K, t, { dive: true, dir: 1, p: P(0.55, 1.5, 0), alpha: gl });
        you({ anim: t < 60 ? 'shoot' : 'idle', frame: t < 60 ? 1 : undefined });
        cam(K, shake(K, P(-0.3, -0.42, 0.48), f * 2, t >= HIT ? 0.03 * Math.max(0, 1 - (t - HIT) / 30) : 0.003, 5), P(0.15, 3.2, 0.5), 60);
        st.ball = W3(bp);
        st.hit = t >= HIT;
      } else {
        // PASSOU: o robô se desfaz; a grua sobe atrás de você
        const fade = ease(seg(t, 20, 110));
        if (fade < 1) robot(K, t, { rv: Math.max(0.001, 1 - fade) });
        you({ light: [0.95, 1.12, 1.0] });
        ball(K, P(-0.84, -0.4, 0.06));
        const k = easeIO(seg(t, 10, 230));
        cam(K, mixP(P(1.3, 6.3, 0.7), P(0.5, 9.8, 3.6), k), mixP(P(-0.1, 2.6, 0.5), P(0, 1.4, 0.2), k), lerp(42, 52, k));
        st.you = W3(P(-0.12, 3.35, 0.5));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top } = S;
      const st = stOf(K);
      if (phase === 0) {
        flares(ctx, K, S, 0.7);
        if (st.rob && st.rv < 1 && t > 30) CE.cineGlow(ctx, st.rob.x, st.rob.y, 160, 'rgba(0,245,212,0.35)', Math.sin(st.rv * Math.PI));
        kick(ctx, S, 'BLUE LOCK • 2ª SELEÇÃO • FASE 1', seg(t, 16, 50), '#38bdf8');
        fadeBlack(ctx, S, 1 - seg(t, 2, 30));
        CE.cineSfx(S, 40, 'robo', () => window.SFX?.blip?.(140));
        CE.cineSfx(S, 140, 'pronto', () => window.SFX?.blip?.(420));
      } else if (phase === 1) {
        if (st.eyes) {
          // (os olhos acendem: a máquina liga)
          eyesLit(ctx, K, K.st.eyes.__w, 'rgba(0,245,212,0.95)', seg(t, 40, 52));
          eyesLit(ctx, K, K.st.eyes.__w, 'rgba(165,243,252,0.7)', seg(t, 40, 52) * (1 - seg(t, 52, 70)));
        }
        CE.cineSfx(S, 40, 'olhos', () => window.SFX?.blip?.(620));
      } else if (phase === 2) {
        const A = A2(t);
        // o arco da previsão aparece antes do chute (a máquina já sabe)
        predictArc(ctx, K, BALL0, TGT1, seg(A, 30, 40), t, '0,200,230', 1 - seg(A, A2C + 8, A2C + 30));
        if (st.ball && st.b1) CE.luckStreak(ctx, st.b1.x, st.b1.y, st.ball.x, st.ball.y, 2, 14, '186,230,253', 0.6);
        if (A >= A2C && st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 70, 'rgba(0,245,212,0.5)', 1 - seg(A, A2C, A2C + 20));
        kick(ctx, S, 'TENTATIVA Nº 7', seg(t, 4, 30), '#ef4444');
        CE.cineSfx(S, 47, 'chute', () => window.SFX?.kick?.(0.8));
        CE.cineSfx(S, 141, 'defesa', () => window.SFX?.save?.());
      } else if (phase === 3) {
        kick(ctx, S, 'TENTATIVA Nº ' + String(st.n || 8).padStart(2, '0'), 1, '#ef4444');
        for (let i = 0; i < 6; i++) CE.cineSfx(S, i * 24 + 8, 'c' + i, () => window.SFX?.kick?.(0.6));
        CE.cineSfx(S, 146, 'tombo', () => window.SFX?.tackle?.());
      } else if (phase === 4) {
        // close: a bola rolando até a chuteira parada (sem dominar)
        if (t > 108) {
          const q = seg(t, 108, 170);
          cutin(ctx, [[W * 0.5, top + 40], [W - 24, top + 24], [W - 24, S.bot - 30], [W * 0.56, S.bot - 22]], seg(t, 108, 117), [W * 0.4, 0], (b, g) => {
            paper(g, b, '#dbe4ef');
            CA().speedLines(g, 0, W, H, { color: 'rgba(15,23,42,0.5)', n: 26, t: q * 50, speed: -24, thick: 6 });
            CA().boot(g, b.x + b.w * 0.72, b.y + b.h * 0.78, b.h * 0.15, Object.assign({ ang: 0.05 }, BOOTS.you));
            CA().ball(g, b.x + b.w * lerp(0.12, 0.5, ease(q)), b.y + b.h * 0.76, b.h * 0.11, { rot: -q * 6 });
          });
        }
      } else if (phase === 5) {
        const KT = B5K;
        const fp = st.foot || { x: W * 0.45, y: H * 0.7 };
        // a previsão tenta e falha (sem padrão): os arcos piscam para cantos diferentes
        if (t > 30 && t < KT) {
          const j = Math.floor(t / 9) % 4;
          const corners = [P(-0.84, 0.1, 0.8), P(0.84, 0.1, 0.4), P(-0.84, 0.1, 0.3), P(0.84, 0.1, 0.85)];
          predictArc(ctx, K, KICK_AT, corners[j], 1, t, '0,200,230', 0.35 + 0.35 * Math.abs(K.noise(t * 3, 2)));
        }
        if (t < KT) bwBlue(ctx, W, H, seg(t, 0, 24));
        else bwBlue(ctx, W, H, 1, { inside: false, x: fp.x, y: fp.y, r: ease(seg(t, KT, KT + 16)) * W * 1.4 });
        if (t >= KT && t < KT + 2) impactFrame(ctx, W, H);
        if (t >= KT) {
          CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, KT + 1, KT + 8)));
          if (t < KT + 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - (t - KT) / 8));
          if (st.ball && st.b1) CE.luckStreak(ctx, st.b1.x, st.b1.y, st.ball.x, st.ball.y, 4, 26, '0,245,212', 0.85 * (1 - seg(t, KT + 22, KT + 40)));
          CE.cineImpactText(ctx, 'DOM!!', W * 0.72, top + 120, 110, '#f8fafc', seg(t, KT, KT + 6), W * 0.4, -0.1);
        } else if (st.ball) CE.cineGlow(ctx, st.ball.x, st.ball.y, 46, 'rgba(255,255,255,0.45)', 0.9);
        // antecipação: sua chuteira indo na bola (sem cor, só o seu ciano)
        if (t > 62 && t < KT) {
          const q = seg(t, 62, KT);
          cutin(ctx, [[40, top + 24], [W - 30, top + 12], [W - 50, S.bot - 24], [24, S.bot - 40]], seg(t, 62, 70), [0, 50], (b, g) => {
            g.fillStyle = '#dbe4ef';
            g.fillRect(b.x, b.y, b.w, b.h);
            const bx = b.x + b.w * 0.63;
            const by = b.y + b.h * (0.42 + 0.05 * q);
            CA().speedRadial(g, bx, by, W, H, { color: 'rgba(15,23,42,0.8)', inner: b.h * 0.22, n: 60, thick: 1.8 });
            if (q > 0.82) CA().burst(g, bx, by, b.h * 0.3 * ease((q - 0.82) / 0.18), { fill: '#f8fafc', stroke: '#0b0f19', lw: 12 });
            g.fillStyle = 'rgba(0,245,212,0.35)';
            g.beginPath();
            g.arc(bx, by, b.h * 0.24, 0, TAU);
            g.fill();
            CA().ball(g, bx, by, b.h * 0.17, { rot: q * 3 });
            const e = easeIO(q);
            CA().boot(g, b.x + b.w * lerp(0.16, 0.47, e), b.y + b.h * lerp(0.95, 0.66, e), b.h * 0.15, { sock: '#64748b', sock2: '#e2e8f0', boot: '#22d3ee', ang: lerp(1.0, -0.15, e) });
          });
        }
        CE.cineSfx(S, KT, 'chute', () => window.SFX?.kick?.(1));
      } else if (phase === 6) {
        const HIT = 22;
        netOverlay(ctx, S, st.hit ? st.ball : null, st.hit ? Math.max(0, 1 - (t - HIT) / 40) * Math.abs(Math.cos((t - HIT) * 0.25)) : 0);
        if (st.hit) CE.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, HIT, HIT + 10)), '#dcfce7');
        CE.cineSfx(S, HIT, 'rede', () => window.SFX?.goal?.(true));
      } else {
        // a câmara fica verde (aprovado): a luz do campo muda devagar
        const g = seg(t, 10, 60);
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = `rgba(34,197,94,${0.55 * g})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        flares(ctx, K, S, 0.6 * g);
        kick(ctx, S, '2ª SELEÇÃO • FASE 1 CONCLUÍDA', seg(t, 30, 70), '#22c55e');
        fadeBlack(ctx, S, seg(t, 196, 228));
        CE.cineSfx(S, 30, 'aprovado', () => window.SFX?.blip?.(660));
      }
    }
  });

  // ==========================================================================
  // 2. O RIN LEVA O BACHIRA — fim do 3x3, no campo. v = 'lose' | 'win'
  // ==========================================================================
  const RT = { rin: P(0, 6.2), aryu: P(-2.6, 5.4), toki: P(2.6, 5.4) };
  const TR = { nagi: P(-1.6, 9.7), you: P(0, 10.05), bachira: P(1.6, 9.7) };
  const RIN_WALK = P(0.2, 8.5);
  const RIN_BACK = P(-0.4, 6.0); // (depois da escolha ele volta, sem nem olhar)
  const BACH_STEP = P(1.0, 7.75); // o Bachira atravessa para o lado do Rin
  const TUNNEL = P(-8.6, 7.9);
  const NORTH = P(0, 0);
  const SOUTH = P(0, 16);
  const RTB_PH = [190, 190, 220, 220, 230, 200];

  function rtbScene(v) {
    const win = v === 'win';
    return function (K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      arena(K);
      // quem perdeu fica de joelhos (o seu trio na derrota; o Aryu e o Tokimitsu na vitória)
      const kn = (lost) => (lost ? 'kneel' : 'idle');
      const top3 = (o = {}) => {
        act(K, 'aryu', o.aryu || RT.aryu, { id: 'ar', face: SOUTH, anim: o.aryuAnim || kn(win), frame: o.aryuFrame, extra: TEAL, light: o.light });
        act(K, 'tokimitsu', o.toki || RT.toki, { id: 'to', face: SOUTH, anim: kn(win), extra: TEAL, light: o.light });
        if (!o.noRin) act(K, 'rin', o.rin || RT.rin, { id: 'rin', face: o.rinFace || SOUTH, anim: o.rinAnim || 'idle', frame: o.rinFrame, extra: TEAL, light: o.rinLight || [0.9, 1.1, 1.2], opts: { expr: 'angry' } });
      };
      const trio = (o = {}) => {
        act(K, 'nagi', o.nagi || TR.nagi, { id: 'na', face: o.face || NORTH, anim: o.nagiAnim || kn(!win), extra: BL, light: o.light });
        if (!o.noYou) act(K, 'you', o.you || TR.you, { id: 'y', face: o.face || NORTH, anim: o.youAnim || kn(!win), extra: BL, light: o.light });
        if (!o.noBach) act(K, 'bachira', o.bach || TR.bachira, { id: 'ba', face: o.bachFace || o.face || NORTH, anim: o.bachAnim || kn(!win), frame: o.bachFrame, extra: BL, light: o.bachLight || o.light, opts: o.bachOpts });
      };
      if (phase === 0) {
        // FIM DE JOGO: a grua desce por trás do Top 3; vocês três do outro lado
        top3({ aryu: P(-1.4, 6.4), toki: P(1.4, 6.4) });
        trio();
        ball(K, P(0.5, 8.3, 0.05));
        const k = easeIO(seg(t, 0, 190));
        cam(K, mixP(P(-4.4, 1.2, 5.0), P(-3.3, 3.3, 1.4), k), mixP(P(0, 8.4, 0), P(0.2, 8.6, 0.45), k), lerp(56, 44, k));
      } else if (phase === 1) {
        // O RIN: por cima do ombro dele (de longe), olhando para baixo: ele anda até vocês e a
        // sombra comprida cai por cima de quem está no chão
        const wk = easeIO(seg(t, 10, 120));
        const rp = mixP(RT.rin, RIN_WALK, wk);
        const walking = wk > 0 && wk < 1;
        top3({ rin: rp, rinAnim: walking ? 'run' : 'idle', rinFrame: walking ? Math.floor(f / 3) : undefined, rinLight: [0.75, 0.9, 1.0] });
        trio({ light: [0.85, 0.88, 0.98] });
        shadowFrom(K, P(0, -5), rp, 2.4, 0.55, 0.6);
        const k = easeIO(t / 190);
        cam(K, shake(K, [rp[0] - 0.75, rp[1] - lerp(2.9, 2.6, k), lerp(2.0, 1.75, k)], f * 0.5, 0.003), mixP(P(0.1, 9.9, 0.15), P(0.1, 9.9, 0.25), k), 46);
      } else if (phase === 2) {
        // A ESCOLHA: de lado, todos no quadro; na escolha, corte seco para o Bachira (de frente)
        const lock = win ? 150 : 140;
        const rb = easeIO(seg(t, 20, 130));
        if (!win) {
          top3({ rin: mixP(RIN_WALK, RIN_BACK, rb), rinFace: rb > 0 && rb < 1 ? NORTH : SOUTH, rinAnim: rb > 0 && rb < 1 ? 'run' : 'idle', aryu: P(-0.9, 7.0), aryuAnim: t > lock ? 'call_pass' : 'idle', aryuFrame: t > lock ? 1 : undefined });
          const up = t > lock + 20;
          trio({ bachAnim: up ? 'idle' : 'kneel', bachFace: up ? P(-0.9, 7.0) : NORTH, bachLight: up ? [1.25, 1.15, 0.9] : undefined });
        } else {
          top3({ rin: mixP(RIN_WALK, RIN_BACK, rb), rinFace: rb > 0 && rb < 1 ? NORTH : TR.you, rinAnim: rb > 0 && rb < 1 ? 'run' : 'idle' });
          const up = t > lock;
          trio({ bachAnim: up ? 'call_pass' : 'idle', bachFrame: up ? 1 : undefined, bachLight: up ? [1.25, 1.15, 0.9] : undefined, bachOpts: up ? { expr: 'happy' } : undefined });
        }
        if (t < lock) {
          const k = easeIO(t / lock);
          cam(K, shake(K, mixP(P(-4.45, 7.2, 0.85), P(-4.2, 7.5, 0.8), k), f * 0.5, 0.003), P(0.0, 8.4, 0.42), 44);
        } else {
          // (do lado do Top 3, de frente para ele: o escolhido de pé, os outros dois atrás)
          const k = easeIO(seg(t, lock, 220));
          cam(K, shake(K, mixP(P(1.45, 6.5, 0.62), P(1.4, 6.75, 0.6), k), f * 0.5, 0.003, 3), [TR.bachira[0], TR.bachira[1], 0.55], lerp(38, 35, k));
        }
        st.bach = W3([TR.bachira[0], TR.bachira[1], 0.5]);
      } else if (phase === 3) {
        // O MONSTRO: o que você vê (do chão) — o Bachira atravessa, para, olha para você... e sorri
        const turn = 100;
        const wk = easeIO(seg(t, 0, 80));
        const bp = mixP(TR.bachira, BACH_STEP, wk);
        const walking = wk > 0 && wk < 1;
        act(K, 'bachira', bp, { id: 'ba', face: t < turn ? RIN_BACK : P(0.25, 11), anim: walking ? 'run' : 'idle', extra: BL, light: K.mix([1.0, 1.0, 1.0], [1.3, 1.18, 0.88], seg(t, turn, turn + 40)), opts: { expr: t > turn + 20 ? 'happy' : undefined } });
        act(K, 'rin', RIN_BACK, { id: 'rin', face: NORTH, extra: TEAL, light: [0.6, 0.75, 0.85] });
        act(K, 'aryu', P(-0.9, 7.0), { id: 'ar', face: SOUTH, anim: win ? 'kneel' : 'idle', extra: TEAL, light: [0.6, 0.7, 0.8] });
        act(K, 'tokimitsu', RT.toki, { id: 'to', face: SOUTH, anim: win ? 'kneel' : 'idle', extra: TEAL, light: [0.6, 0.7, 0.8] });
        const k = easeIO(t / 220);
        const ey = win ? 0.66 : 0.44;
        cam(K, shake(K, mixP(P(0.2, 11.0, ey), P(0.3, 10.8, ey + 0.02), k), f * 0.5, 0.003, 4), [bp[0], bp[1], 0.62], lerp(38, 35, k));
        st.bach = W3([bp[0], bp[1], 0.4]);
      } else if (phase === 4) {
        // A SAÍDA: o Bachira vai embora com o time do Rin (para o túnel); vocês dois ficam
        // (câmera lenta quando ele vira e acena)
        const A = remap(t, [[0, 0], [96, 96], [176, 116], [230, 170]]);
        const rf = Math.floor(A * 0.5);
        const walk = (p0, delay) => mixP(p0, TUNNEL, seg(A, 10 + delay, 300 + delay) * 0.85);
        // ele para no meio do caminho, vira e acena (o passo fica parado enquanto acena)
        const wave = A > 100 && A < 124;
        const tw = A < 100 ? A : A < 124 ? 100 : A - 24;
        const bp = mixP(BACH_STEP, TUNNEL, seg(tw, 0, 260) * 0.8);
        act(K, 'rin', walk(RIN_BACK, 0), { id: 'rin', face: TUNNEL, anim: 'run', frame: rf, extra: TEAL, light: [0.7, 0.85, 0.95] });
        act(K, 'aryu', walk(P(-0.9, 7.0), 6), { id: 'ar', face: TUNNEL, anim: 'run', frame: rf, extra: TEAL, light: [0.7, 0.8, 0.9] });
        act(K, 'tokimitsu', walk(RT.toki, 12), { id: 'to', face: TUNNEL, anim: 'run', frame: rf, extra: TEAL, light: [0.7, 0.8, 0.9] });
        act(K, 'bachira', bp, { id: 'ba', face: wave ? TR.you : TUNNEL, anim: wave ? 'call_pass' : 'run', frame: wave ? 1 : rf, extra: BL, light: [1.2, 1.12, 0.92], opts: wave ? { expr: 'happy' } : undefined });
        const stand = win || t > 40;
        act(K, 'you', TR.you, { id: 'y', face: bp, anim: stand ? 'idle' : 'kneel', extra: BL, light: [0.75, 0.82, 0.92] });
        act(K, 'nagi', TR.nagi, { id: 'na', face: bp, anim: win || t > 60 ? 'idle' : 'kneel', extra: BL, light: [0.75, 0.8, 0.9] });
        const k = easeIO(t / 230);
        cam(K, shake(K, mixP(P(2.4, 13.6, 0.85), P(2.0, 13.2, 0.8), k), f * 0.5, 0.003), mixP(P(-1.4, 8.4, 0.5), P(-4.2, 8.0, 0.5), k), 44);
      } else {
        // O JURAMENTO: você sozinho na contraluz do refletor; só os olhos acesos
        const yp = TR.you;
        const k = easeIO(t / 200);
        const ce = mixP(P(-2.15, 7.35, 0.5), P(-1.85, 7.65, 0.58), k);
        act(K, 'you', yp, { id: 'y', face: ce, extra: BL, light: DARK });
        cam(K, shake(K, ce, f * 0.5, 0.003, 6), [yp[0], yp[1], 0.6], lerp(38, 35, k));
        st.eyes = W3([yp[0], yp[1], EYE_Z]);
        st.you = W3([yp[0], yp[1], 0.45]);
      }
    };
  }
  function rtbOverlay(v) {
    const win = v === 'win';
    return function (ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        flares(ctx, K, S, 0.7);
        kick(ctx, S, '2ª SELEÇÃO • 3 x 3 CONTRA O TOP 3', seg(t, 14, 50), '#38bdf8');
        kick(ctx, S, win ? 'FIM DE JOGO • VOCÊS VENCERAM' : 'FIM DE JOGO • O TOP 3 VENCEU', seg(t, 44, 80), win ? '#22c55e' : '#2dd4bf', 1);
        fadeBlack(ctx, S, 1 - seg(t, 2, 26));
        CE.cineSfx(S, 6, 'apito', () => window.SFX?.whistle?.(3));
      } else if (phase === 1) {
        flares(ctx, K, S, 0.5);
      } else if (phase === 2) {
        const lock = win ? 150 : 140;
        CE.cineSfx(S, lock, 'trava', () => window.SFX?.blip?.(520));
      } else if (phase === 3) {
        // close: a sola dele em cima da bola (o drible do Bachira), girando a bola de leve
        if (t > 128 && t < 214) {
          const q = seg(t, 128, 214);
          cutin(ctx, [[W * 0.56, top + (bot - top) * 0.42], [W - 16, top + (bot - top) * 0.36], [W - 16, bot - 16], [W * 0.5, bot - 16]], seg(t, 128, 137), [W * 0.4, 0], (b, g) => {
            paper(g, b, '#fef9c3', 'rgba(161,98,7,0.3)');
            CA().speedLines(g, Math.PI + 0.12, W, S.H, { color: 'rgba(202,138,4,0.5)', n: 26, t: q * 60, speed: 26, thick: 7 });
            const bx = b.x + b.w * 0.52;
            const by = b.y + b.h * 0.72;
            const r = b.h * 0.15;
            CA().ball(g, bx, by, r, { rot: Math.sin(q * 6) * 0.6 });
            CA().boot(g, bx - r * 0.5, by - r * 0.95, b.h * 0.15, { sock: '#0f2942', sock2: '#38bdf8', boot: '#facc15', ang: -0.08 + Math.sin(q * 6) * 0.06 });
          }, { border: '#fde68a' });
        }
        CE.cineSfx(S, 120, 'sorriso', () => window.SFX?.whoosh?.());
      } else if (phase === 4) {
        CE.cineSfx(S, 200, 'porta', () => window.SFX?.tackle?.());
      } else {
        flares(ctx, K, S, 0.9);
        if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 150, 'rgba(186,230,253,0.16)', 0.9);
        if (K.st && K.st.eyes) eyesLit(ctx, K, K.st.eyes.__w, 'rgba(0,245,212,0.9)', seg(t, 40, 56), EYE_SEP);
        // close: o punho fechado, tremendo (quadro reto: momento calmo)
        if (t > 70 && t < 150 && CE.mgmFist) {
          const c = CE.sselCast();
          const sh = Math.round(Math.sin(t * 1.7) * 2) * PIX;
          cutin(ctx, [[W - 360, top + 24], [W - 24, top + 24], [W - 24, top + 318], [W - 360, top + 318]], seg(t, 70, 78), [300, 0], (b, g) => {
            paper(g, b, '#0b1220', 'rgba(56,189,248,0.25)');
            CE.cineGlow(g, b.x + b.w * 0.5, b.y + b.h * 0.5, b.h * 0.6, 'rgba(0,245,212,0.25)', 1);
            partAt(g, CE.mgmFist(c.you), b.x + b.w * 0.5 - 4 * 30 + sh, b.y + b.h * 0.5 - 4.1 * 30, 30);
          }, { border: '#99f6e4' });
        }
        fadeBlack(ctx, S, seg(t, 168, 198));
        CE.cineSfx(S, 40, 'olhos', () => window.SFX?.whoosh?.());
      }
    };
  }

  CE.registerCine3D('rin_takes_bachira', {
    phases: RTB_PH,
    music: 'mystery',
    title: '🐝 O MONSTRO FOI EMBORA',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    readScale: 0.85,
    theme: 'bluelock_holo',
    tags: ['PLANO 1 • FIM DE JOGO', 'PLANO 2 • O RIN', 'PLANO 3 • A ESCOLHA', 'PLANO 4 • O MONSTRO', 'PLANO 5 • A SAÍDA', 'PLANO 6 • O JURAMENTO'],
    subs: [
      [{ from: 30, to: 188, who: 'NARRADOR', text: 'Fim de jogo. O Top 3 venceu.', color: NARR_C }],
      [{ from: 40, to: 188, who: 'RIN ITOSHI', text: '"Lentos demais. Vocês nem chegaram perto."', color: RIN_C }],
      [
        { from: 12, to: 132, who: 'AOSHI TOKIMITSU', text: '"A-a gente já decidiu..."', color: TOKI_C },
        { from: 136, to: 218, who: 'JYUBEI ARYU', text: '"O Bachira. OSHAA!"', color: ARYU_C }
      ],
      [
        { from: 8, to: 96, who: 'VOCÊ', text: '"...Bachira?"', color: YOU_C },
        { from: 100, to: 218, who: 'BACHIRA', text: '"Desculpa... o monstro dele é mais forte."', color: BACH_C }
      ],
      [{ from: 30, to: 226, who: 'SEISHIRO NAGI', text: '"...Ele foi mesmo."', color: NAGI_C }],
      [{ from: 70, to: 198, who: 'VOCÊ', text: '"Eu vou te buscar, Bachira."', color: YOU_C }]
    ],
    scene: rtbScene('lose'),
    overlay: rtbOverlay('lose')
  });

  CE.registerCine3D('rin_takes_bachira_win', {
    phases: RTB_PH,
    music: 'mystery',
    title: '🐝 O MONSTRO ESCOLHEU',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    readScale: 0.85,
    theme: 'bluelock_holo',
    tags: ['PLANO 1 • FIM DE JOGO', 'PLANO 2 • NÃO MUDA NADA', 'PLANO 3 • A ESCOLHA', 'PLANO 4 • O MONSTRO', 'PLANO 5 • A SAÍDA', 'PLANO 6 • O JURAMENTO'],
    subs: [
      [{ from: 30, to: 188, who: 'NARRADOR', text: 'Fim de jogo. Vocês derrubaram o Top 3.', color: NARR_C }],
      [{ from: 40, to: 188, who: 'RIN ITOSHI', text: '"Ganhou hoje. Não muda nada."', color: RIN_C }],
      [
        { from: 10, to: 140, who: 'NARRADOR', text: 'Pela regra, vocês podem levar um deles.', color: NARR_C },
        { from: 144, to: 218, who: 'BACHIRA', text: '"Eu vou com o Rin."', color: BACH_C }
      ],
      [
        { from: 6, to: 84, who: 'VOCÊ', text: '"Bachira?"', color: YOU_C },
        { from: 88, to: 218, who: 'BACHIRA', text: '"O monstro dele é mais forte... eu quero jogar com ele."', color: BACH_C }
      ],
      [{ from: 30, to: 226, who: 'SEISHIRO NAGI', text: '"A gente ganhou... e ele foi."', color: NAGI_C }],
      [{ from: 70, to: 198, who: 'VOCÊ', text: '"Eu vou te buscar, Bachira."', color: YOU_C }]
    ],
    scene: rtbScene('win'),
    overlay: rtbOverlay('win')
  });

  // ==========================================================================
  // 3. DEVORANDO O REI — 5x5 no campo (o seu time ataca o gol norte, o do time do Rin)
  // ==========================================================================
  const BX = P(-0.3, 3.45); // onde o Barou arma o chute
  const BALL_B = P(-0.12, 3.12, 0.05); // a bola no pé dele
  const YK = P(0.08, 3.5); // de onde você chuta (um passo antes)
  const GB = P(0.86, 0.02, 0.86); // o ângulo
  const YB = P(-1.5, 5.4); // você depois, de pé na entrada da área
  const BAR_FACE = P(-1.7, 6.1); // o Barou caído vira de lado para a câmera dos planos 5 e 6
  const BAR_PH = [200, 210, 220, 140, 230, 170, 230];
  const BA2 = (t) => remap(t, [[0, 0], [60, 60], [150, 80], [220, 150]]);
  const BAR_KT = 78; // o chute (no tempo da ação)

  CE.registerCine3D('barou_devour', {
    phases: BAR_PH,
    music: 'epic',
    title: '👑 DEVORANDO O REI',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    readScale: 0.85,
    theme: 'bluelock_holo',
    tags: ['PLANO 1 • A INVESTIDA DO REI', 'PLANO 2 • METAVISÃO', 'PLANO 3 • UM PASSO ANTES', 'PLANO 4 • O GOL ROUBADO', 'PLANO 5 • DE JOELHOS', 'PLANO 6 • EU DEVOREI', 'PLANO 7 • VEM PRO MEU TIME'],
    subs: [
      [{ from: 30, to: 198, who: 'SHOUEI BAROU', text: '"Ninguém toca na bola! Esse gol é do Rei!"', color: BAROU_C }],
      [{ from: 24, to: 208, who: 'VOCÊ', text: '(Eu vejo o caminho dele. E o gol que ele vai fazer.)', color: YOU_C }],
      [],
      [{ from: 36, to: 138, who: 'SHOUEI BAROU', text: '"...Ele roubou o MEU gol?!"', color: BAROU_C }],
      [
        { from: 20, to: 120, who: 'VOCÊ', text: '(O seu gol... agora é meu.)', color: YOU_C },
        { from: 126, to: 228, who: 'NARRADOR', text: 'O Rei caiu de joelhos.', color: NARR_C }
      ],
      [{ from: 40, to: 168, who: 'VOCÊ', text: '(Eu devorei o Rei.)', color: YOU_C }],
      [{ from: 124, to: 228, who: 'RIN ITOSHI', text: '"Você. Vem pro meu time."', color: RIN_C }]
    ],
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      arena(K);
      const team = (light) => {
        act(K, 'rin', P(0.5, 1.0), { id: 'rin', face: P(0, 6), extra: TEAL, frame: 0, light });
        act(K, 'bachira', P(2.4, 2.4), { id: 'ba', face: P(0, 6), extra: TEAL, frame: 0, light });
      };
      if (phase === 0) {
        // A INVESTIDA DO REI: de três-quartos na frente dele, a câmera recuando junto
        const e = easeIn(seg(t, 6, 196));
        const bp = P(lerp(0.6, -0.25, e) + Math.sin(t * 0.04) * 0.15, lerp(12.6, 4.6, e));
        act(K, 'barou', bp, { id: 'bar', face: P(bp[0] - GX, -4), anim: 'run', extra: BL, light: [1.15, 1.0, 0.97], opts: { expr: 'determined' } });
        ball(K, [bp[0] + 0.1 + Math.sin(t * 0.4) * 0.04, bp[1] - 0.32, 0.05]);
        // quem tenta parar o Rei é jogado de lado (para longe da câmera)
        [['aryu', 'ar', P(-0.6, 7.0)]].forEach(([who, id, p0]) => {
          const hitK = seg(bp[1], p0[1] + 0.6, p0[1] - 0.2);
          const pushed = hitK > 0;
          const p = [p0[0] - ease(hitK) * 1.2, p0[1] + ease(hitK) * 0.4, 0];
          act(K, who, p, { id, face: pushed ? P(-4, p0[1] - GY + 1) : bp, anim: pushed ? 'fall' : 'idle', frame: pushed ? Math.min(6, Math.floor(hitK * 7)) : 0, extra: TEAL });
        });
        team();
        act(K, 'nagi', P(-2.6, lerp(13.5, 7.6, e)), { id: 'na', face: P(-2, 0), anim: 'run', extra: BL, light: [0.8, 0.85, 0.95] });
        cam(K, shake(K, [bp[0] + 2.45, bp[1] - 2.35, 0.48], f, 0.005 + e * 0.012), [bp[0] + 0.1, bp[1], 0.5], lerp(44, 40, e));
        st.bar = W3([bp[0], bp[1], 0.5]);
        st.e = e;
      } else if (phase === 1) {
        // METAVISÃO: do alto, o mundo sem cor; o caminho do Rei e o seu, desenhados no chão
        const A = t * 0.35;
        const bp = mixP(P(-0.25, 4.6), BX, ease(seg(A, 0, 60)));
        act(K, 'barou', bp, { id: 'bar', face: P(-0.3, -4), anim: 'run', extra: BL, light: [1.15, 1.0, 0.97] });
        ball(K, [bp[0] + 0.18, bp[1] - 0.33, 0.05]);
        const yp = mixP(P(2.7, 5.8), P(1.5, 4.6), ease(seg(A, 0, 70)));
        act(K, 'you', yp, { id: 'y', face: YK, anim: 'run', extra: BL, light: [0.9, 1.2, 1.2] });
        team();
        act(K, 'aryu', P(-1.9, 7.6), { id: 'ar', face: P(-0.3, 4), anim: 'fall', frame: 6, extra: TEAL });
        act(K, 'tokimitsu', P(-1.2, 9.6), { id: 'to', face: P(-0.3, 4), anim: 'fall', frame: 6, extra: TEAL });
        const k = easeIO(t / 210);
        cam(K, mixP(P(3.8, 10.2, 3.9), P(2.6, 9.0, 3.2), k), mixP(P(0.4, 3.8, 0), P(0.1, 3.4, 0), k), 50);
        st.k = k;
        // (o Rei e você ficam com cor no mundo cinza)
        st.hb = W3([bp[0], bp[1], 0.4]);
        st.hy = W3([yp[0], yp[1], 0.4]);
      } else if (phase === 2) {
        // UM PASSO ANTES: câmera lenta; ele arma o chute, você chega pelo ponto cego e chuta antes
        const A = BA2(t);
        const bst = A < 50 ? 'run' : A < BAR_KT + 2 ? 'windup' : 'shoot';
        const bp = A < 50 ? mixP(P(-0.3, 4.1), BX, seg(A, 0, 50)) : BX;
        act(K, 'barou', bp, { id: 'bar', face: P(0.86, -2), anim: bst, frame: bst === 'run' ? undefined : 1, extra: BL, light: [1.25, 1.02, 0.96] });
        const yk = ease(seg(A, 0, 72));
        const yp = mixP(P(1.5, 4.6), YK, yk);
        const yst = A < 66 ? 'run' : A < BAR_KT ? 'windup' : 'shoot';
        act(K, 'you', yp, { id: 'y', face: P(0.86, -2), anim: yst, frame: yst === 'run' ? undefined : 1, extra: BL, light: [0.95, 1.18, 1.2] });
        let b = A < 50 ? [bp[0] + 0.18, bp[1] - 0.33, 0.05] : BALL_B;
        if (A >= BAR_KT) b = bez3(BALL_B, P(0.5, 1.4, 1.1), GB, Math.min(0.9, seg(A, BAR_KT, BAR_KT + 12)));
        ball(K, b);
        team([0.8, 0.85, 0.95]);
        const push = easeIO(seg(t, 0, 141));
        const after = t >= 141 ? 0.03 * Math.max(0, 1 - (t - 141) / 24) : 0.004;
        cam(K, shake(K, mixP(P(0.6, 6.7, 0.34), P(0.35, 6.2, 0.32), push), f * 2, after, 3), mixP(P(-0.05, 3.3, 0.45), P(0.1, 2.6, 0.5), seg(A, BAR_KT, BAR_KT + 12)), lerp(42, 38, push));
        st.foot = W3(P(0.0, 3.2, 0.2));
        st.ball = W3(b);
        if (A >= BAR_KT) st.b1 = W3(bez3(BALL_B, P(0.5, 1.4, 1.1), GB, Math.min(0.9, seg(A - 3, BAR_KT, BAR_KT + 12))));
      } else if (phase === 3) {
        // O GOL ROUBADO: de dentro do gol; a rede estufa, o Rin olha para trás
        const HIT = 20;
        const bp = t < HIT ? mixP(P(0.6, 1.6, 0.82), P(0.86, -0.3, 0.86), t / HIT) : P(0.84, -0.38, Math.max(0.06, 0.86 - (t - HIT) * 0.03));
        ball(K, bp);
        act(K, 'rin', P(-1.25, 2.3), { id: 'rin', face: t > 30 ? P(0.8, -1) : P(0, 6), extra: TEAL, light: [0.8, 0.95, 1.05] });
        act(K, 'you', YK, { id: 'y', face: P(0.86, -2), anim: t < 70 ? 'shoot' : 'idle', frame: t < 70 ? 1 : undefined, extra: BL });
        act(K, 'barou', BX, { id: 'bar', face: P(0.86, -2), anim: t < 50 ? 'shoot' : 'idle', frame: t < 50 ? 1 : undefined, extra: BL, light: [1.1, 0.9, 0.88], opts: { expr: 'scared' } });
        cam(K, shake(K, P(0.35, -0.42, 0.46), f * 2, t >= HIT ? 0.03 * Math.max(0, 1 - (t - HIT) / 30) : 0.003, 5), P(-0.05, 3.3, 0.5), 60);
        st.ball = W3(bp);
        st.hit = t >= HIT;
      } else if (phase === 4) {
        // DE JOELHOS: o Rei cai; você passa por ele e vai embora
        K.expo(lerp(1.0, 0.85, seg(t, 0, 120)));
        // (de lado para a câmera: de joelhos, depois as mãos no chão)
        const an = t < 34 ? 'idle' : t < 100 ? 'kneel' : 'kneel_down';
        act(K, 'barou', BX, { id: 'bar', face: BAR_FACE, anim: an, frame: an === 'kneel_down' ? Math.min(4, Math.floor((t - 100) / 4)) : undefined, extra: BL, light: K.mix([1.05, 0.9, 0.9], [0.85, 0.6, 0.6], seg(t, 30, 120)), opts: { expr: t > 34 ? 'hurt' : 'scared' } });
        const wk = easeIO(seg(t, 50, 200));
        const yp = mixP(YK, YB, wk);
        act(K, 'you', yp, { id: 'y', face: wk > 0 && wk < 1 ? YB : P(-0.3, 0), anim: wk > 0 && wk < 1 ? 'run' : 'idle', frame: wk > 0 && wk < 1 ? Math.floor(f / 5) : undefined, extra: BL, light: [0.85, 1.05, 1.1] });
        team([0.65, 0.75, 0.85]);
        const k = easeIO(t / 230);
        cam(K, shake(K, mixP(P(-2.7, 2.2, 0.24), P(-2.45, 2.4, 0.26), k), f * 0.5, 0.003), mixP(P(-0.3, 3.45, 0.42), P(-0.35, 3.5, 0.36), k), lerp(40, 36, k));
      } else if (phase === 5) {
        // EU DEVOREI: você na contraluz do refletor; só os olhos acesos
        const k = easeIO(t / 170);
        const ce = mixP(P(0.85, 7.9, 0.48), P(0.55, 7.6, 0.56), k);
        act(K, 'you', YB, { id: 'y', face: ce, extra: BL, light: DARK });
        act(K, 'barou', BX, { id: 'bar', face: BAR_FACE, anim: 'kneel_down', frame: 4, extra: BL, light: DARK });
        cam(K, shake(K, ce, f * 0.5, 0.003, 6), [YB[0], YB[1], 0.6], lerp(38, 35, k));
        st.eyes = W3([YB[0], YB[1], EYE_Z]);
        st.you = W3([YB[0], YB[1], 0.45]);
      } else {
        // VEM PRO MEU TIME: o Rin atravessa a área e aponta para você
        const wk = easeIO(seg(t, 0, 100));
        const rp = mixP(P(-0.6, 1.0), P(-2.2, 2.75), wk);
        const point = t > 104;
        act(K, 'rin', rp, { id: 'rin', face: YB, anim: point ? 'call_pass' : wk < 1 ? 'run' : 'idle', frame: point ? 1 : undefined, extra: TEAL, light: [0.9, 1.15, 1.25], opts: { expr: 'angry' } });
        act(K, 'bachira', P(-1.0, 1.7), { id: 'ba', face: YB, extra: TEAL, light: [1.15, 1.08, 0.92], opts: { expr: 'happy' } });
        act(K, 'aryu', P(-3.5, 1.5), { id: 'ar', face: YB, extra: TEAL, frame: 0, light: [0.75, 0.85, 0.95] });
        act(K, 'tokimitsu', P(-0.1, 1.0), { id: 'to', face: YB, extra: TEAL, frame: 0, light: [0.75, 0.85, 0.95] });
        act(K, 'you', YB, { id: 'y', face: rp, extra: BL, light: [0.85, 1.0, 1.08] });
        act(K, 'barou', BX, { id: 'bar', face: BAR_FACE, anim: 'kneel_down', frame: 4, extra: BL, light: [0.6, 0.5, 0.55] });
        if (t < 110) {
          const k = easeIO(t / 110);
          cam(K, shake(K, mixP(P(-2.9, 8.7, 0.95), P(-2.6, 8.2, 0.9), k), f * 0.5, 0.003), mixP(P(-1.4, 2.6, 0.55), P(-1.6, 2.8, 0.6), k), 42);
        } else {
          // o contraplano: o Rin de frente (o Barou fica fora do quadro, à direita)
          const k = easeIO(seg(t, 110, 230));
          cam(K, shake(K, mixP(P(-2.05, 5.95, 0.62), P(-2.0, 5.75, 0.64), k), f * 0.5, 0.003, 2), [rp[0], rp[1], 0.66], lerp(36, 34, k));
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        const e = K.st ? K.st.e || 0 : 0;
        CE.drawSpeedLines(ctx, W, H, '#fecaca', 0.06 + e * 0.18);
        flares(ctx, K, S, 0.5);
        kick(ctx, S, '2ª SELEÇÃO • 5 x 5 • CONTRA O TIME DO RIN', seg(t, 10, 46), '#38bdf8');
        fadeBlack(ctx, S, 1 - seg(t, 0, 20));
        CE.cineSfx(S, 150, 'rei', () => window.SFX?.tackle?.());
      } else if (phase === 1) {
        // o tempo quase para (sem cor); um anel no chão marca o Rei (âmbar) e você (ciano), e os
        // dois caminhos aparecem no gramado
        bwBlue(ctx, W, H, seg(t, 0, 20));
        if (K.st.hb) groundRing(ctx, K, K.st.hb.__w, 0.32, 'rgba(250,204,21,0.9)', 3, seg(t, 14, 30));
        if (K.st.hy) groundRing(ctx, K, K.st.hy.__w, 0.32, 'rgba(0,245,212,0.9)', 3, seg(t, 20, 36));
        const A = t * 0.35;
        const rk = seg(t, 30, 100);
        const pathB = [];
        for (let i = 0; i <= 20; i++) pathB.push(mixP(P(-0.25, 4.6), BX, (i / 20) * rk));
        groundPath(ctx, K, pathB, 'rgba(250,204,21,0.95)', 5, [16, 10], -t, rk > 0 ? 1 : 0);
        if (rk >= 1) groundPath(ctx, K, [BX, P(0.86, 0)], 'rgba(250,204,21,0.6)', 3, [6, 8], -t, seg(t, 100, 116));
        const yk = seg(t, 110, 170);
        if (yk > 0) {
          const ys = mixP(P(2.7, 5.8), P(1.5, 4.6), ease(seg(A, 0, 70)));
          groundPath(ctx, K, [ys, mixP(ys, YK, ease(yk))], 'rgba(0,245,212,0.95)', 7, null, 0, 1);
          const pul = 0.5 + 0.5 * Math.sin(t * 0.2);
          groundRing(ctx, K, YK, 0.5 + pul * 0.08, `rgba(0,245,212,${0.5 + 0.5 * pul})`, 4, seg(t, 150, 166));
        }
        CE.cineSfx(S, 2, 'meta', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        const A = BA2(t);
        const fp = st.foot || { x: W * 0.5, y: H * 0.7 };
        if (A < BAR_KT) bwBlue(ctx, W, H, 0.55 * (1 - seg(t, 0, 30)));
        // (o impacto conta em quadros de verdade: 2 quadros invertidos, clarão curto)
        const KTT = 141;
        if (t >= KTT && t < KTT + 2) impactFrame(ctx, W, H);
        if (A >= BAR_KT) {
          const u = t - KTT;
          CE.cineFlash(ctx, W, H, 0.55 * (1 - seg(u, 1, 8)));
          if (u < 8) CE.drawRadialSpeedLines(ctx, fp.x, fp.y, W, '#020617', 0.5 * (1 - u / 8));
          if (st.ball && st.b1) CE.luckStreak(ctx, st.b1.x, st.b1.y, st.ball.x, st.ball.y, 4, 26, '0,245,212', 0.85 * (1 - seg(u, 20, 40)));
          CE.cineImpactText(ctx, 'DOM!!', W * 0.74, top + 120, 110, '#f8fafc', seg(u, 0, 6), W * 0.4, -0.1);
        }
        // as duas chuteiras: a dele armando, a sua chegando antes
        if (t > 92 && A < BAR_KT) {
          const q = seg(t, 92, 141);
          cutin(ctx, [[40, top + 24], [W - 30, top + 12], [W - 50, bot - 24], [24, bot - 40]], seg(t, 92, 100), [0, 50], (b, g) => {
            paper(g, b, '#e2e8f0', 'rgba(15,23,42,0.28)');
            const bx = b.x + b.w * 0.5;
            const by = b.y + b.h * 0.7;
            CA().speedRadial(g, bx, by, W, H, { color: 'rgba(15,23,42,0.7)', inner: b.h * 0.2, n: 54, thick: 1.6 });
            CA().ball(g, bx, by, b.h * 0.14, { rot: q * 2 });
            const e1 = easeIO(q);
            CA().boot(g, b.x + b.w * lerp(0.1, 0.3, e1), b.y + b.h * lerp(0.55, 0.62, e1), b.h * 0.14, Object.assign({ ang: lerp(-0.9, -0.3, e1) }, BOOTS.barou));
            const e2 = ease(q);
            CA().boot(g, b.x + b.w * lerp(0.95, 0.62, e2), b.y + b.h * lerp(0.98, 0.78, e2), b.h * 0.15, Object.assign({ ang: lerp(0.8, 0.05, e2), flip: true }, BOOTS.you));
          });
        }
        CE.cineSfx(S, 141, 'roubo', () => window.SFX?.kick?.(1));
      } else if (phase === 3) {
        const HIT = 20;
        netOverlay(ctx, S, st.hit ? st.ball : null, st.hit ? Math.max(0, 1 - (t - HIT) / 40) * Math.abs(Math.cos((t - HIT) * 0.25)) : 0);
        if (st.hit) CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, HIT, HIT + 10)), '#ccfbf1');
        CE.cineSfx(S, HIT, 'rede', () => window.SFX?.goal?.(true));
      } else if (phase === 4) {
        // close: a coroa do Rei racha e cai (pixel art)
        if (t > 120 && t < 214 && CE.mgmCrown) {
          const u = t - 120;
          cutin(ctx, [[W * 0.55, top + 24], [W - 24, top + 24], [W - 24, top + 290], [W * 0.55, top + 290]], seg(u, 0, 9), [0, -300], (b, g) => {
            paper(g, b, '#1c0a0a', 'rgba(239,68,68,0.22)');
            g.save();
            g.imageSmoothingEnabled = false;
            CE.mgmCrown(g, b.x + b.w * 0.5, b.y + b.h * 0.5, 12, seg(u, 14, 40), u > 50 ? u - 50 : -1);
            g.restore();
          }, { border: '#fde68a' });
          CE.cineSfx(S, 134, 'racha', () => window.SFX?.post?.());
          CE.cineSfx(S, 170, 'quebra', () => window.SFX?.tackle?.());
        }
        CE.cineSfx(S, 34, 'joelhos', () => window.SFX?.tackle?.());
      } else if (phase === 5) {
        flares(ctx, K, S, 0.9);
        if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 150, 'rgba(186,230,253,0.16)', 0.9);
        if (K.st && K.st.eyes) eyesLit(ctx, K, K.st.eyes.__w, 'rgba(0,245,212,0.9)', seg(t, 30, 46), EYE_SEP);
        CE.cineSfx(S, 30, 'olhos', () => window.SFX?.whoosh?.());
      } else {
        endTitle(ctx, S, seg(t, 170, 196), '2ª SELEÇÃO • O TIME DO RIN', 'DEVORANDO O REI', '#22d3ee');
        fadeBlack(ctx, S, seg(t, 206, 230));
        CE.cineSfx(S, 170, 'titulo', () => window.SFX?.kick?.(0.8));
      }
    }
  });

  // ==========================================================================
  // 4. BLUE LOCK x WORLD FIVE — o campo vira estádio holográfico. v = 'lose' | 'win'
  // ==========================================================================
  // a torcida holográfica: placas de pontinhos acesos em cima das arquibancadas do campo
  const STANDS = lazy(() =>
    mkCv(256, 48, (g, w, h) => {
      g.fillStyle = 'rgba(6,14,36,0.9)';
      g.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) {
        const y = 3 + Math.round(r * 5.4);
        g.fillStyle = r % 2 ? '#0a1636' : '#0c1a40';
        g.fillRect(0, y + 3, w, 2);
        for (let x = (r % 2) * 2; x < w; x += 4) {
          if (rnd(x * 7 + r, 5) > 0.78) continue;
          const q = rnd(x + r * 300, 3);
          g.fillStyle = q < 0.55 ? '#38bdf8' : q < 0.8 ? '#e0f2fe' : '#facc15';
          g.fillRect(x, y, 2, 2);
        }
      }
      g.fillStyle = '#38bdf8';
      g.fillRect(0, h - 2, w, 2);
      g.fillRect(0, 0, w, 1);
    })
  );
  function holoStands(K, burst = 0) {
    const col = K.mix([0.5, 0.6, 0.78], [1.25, 1.3, 1.35], clamp(burst));
    const o = { z: 1.75, h: 2.3, img: STANDS(), color: col, em: true, alpha: 0.92 };
    plate(K, Object.assign({ x: 53, y: 5.55, w: 16.4, ang: Math.PI / 2 }, o));
    plate(K, Object.assign({ x: 53, y: 23.45, w: 16.4, ang: -Math.PI / 2 }, o));
    plate(K, Object.assign({ x: 44.55, y: 14.5, w: 17.4, ang: 0 }, o));
    plate(K, Object.assign({ x: 61.45, y: 14.5, w: 17.4, ang: Math.PI }, o));
  }
  const W5_PH = [170, 120, 250, 300, 240, 240];
  const W5A = (t) => remap(t, [[0, 0], [60, 60], [120, 72], [250, 202]]);
  const LK0 = P(0, 7.6);
  const LK1 = Q(0.3, 3.4);
  const LK_GO = 70; // a arrancada (tempo da ação)
  const LK_SH = 92; // o chute
  const RIN0 = P(0.9, 6.4);
  const RIN1 = P(0.35, 3.5);
  const RIN_GOAL = P(-0.84, 0.02, 0.78);
  // a montagem (4 lances de 75 quadros). Derrota: quatro gols. Vitória: três defesas e a virada
  const W5_LOSE = [
    { id: 'luna', from: Q(-1.8, 4.9), to: Q(-1.0, 3.3), shot: Q(0.82, 0.02, 0.7), anim: 'shoot', def: ['aryu', Q(-0.2, 3.0)], eye: Q(2.3, 3.7, 0.32), look: Q(-1.0, 2.4, 0.5) },
    { id: 'blake', from: Q(1.2, 5.6), to: Q(0.8, 4.6), shot: Q(-0.8, 0.02, 0.5), anim: 'shoot', def: ['tokimitsu', Q(0.2, 3.6)], eye: Q(2.0, 8.9, 1.2), look: Q(0.2, 1.4, 0.5) },
    { id: 'dada_silva', from: Q(-0.2, 2.4), to: Q(-0.2, 2.2), shot: Q(0.75, 0.02, 0.45), anim: 'bicycle', def: ['rin', Q(0.5, 1.6)], eye: Q(-2.5, -0.15, 0.22), look: Q(-0.2, 2.2, 0.75) },
    { id: 'pablo', from: Q(-1.4, 4.6), to: Q(-0.8, 3.8), shot: Q(-0.82, 0.02, 0.85), anim: 'shoot', def: ['you', Q(-0.2, 2.8)], eye: Q(3.4, 6.2, 2.0), look: Q(-0.4, 2.2, 0.4) }
  ];
  const W5_WIN = [
    Object.assign({}, W5_LOSE[0], { save: 'block' }),
    Object.assign({}, W5_LOSE[1], { save: 'post', shot: Q(-1.1, 0.0, 0.6) }),
    Object.assign({}, W5_LOSE[2], { save: 'head' }),
    { id: 'you', from: P(1.2, 4.8), to: P(0.4, 3.5), shot: P(-0.82, 0.02, 0.8), anim: 'shoot', def: ['loki', P(-0.6, 2.2)], eye: P(2.6, 3.9, 0.32), look: P(-0.2, 2.6, 0.5), ours: true }
  ];
  const W5_SEG = 75;
  const w5Kit = (id) => (['you', 'rin', 'aryu', 'tokimitsu', 'bachira'].includes(id) ? BL : WORLD);

  function w5Scene(v) {
    const win = v === 'win';
    return function (K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      arena(K, { top: '#01030a', hor: '#071233', stars: 0.5 });
      if (phase === 0) {
        // O RIN ABRE: de lado, rente ao chão, acompanhando; ele arranca e solta a bomba
        holoStands(K, 0.15);
        const KT = 110;
        const rk = easeIO(seg(t, 0, KT - 10));
        const rp = mixP(RIN0, RIN1, rk);
        const rst = t < KT - 10 ? 'run' : t < KT ? 'windup' : 'shoot';
        act(K, 'rin', rp, { id: 'rin', face: P(-0.3, -4), anim: rst, frame: rst === 'run' ? undefined : 1, extra: BL, light: [0.95, 1.15, 1.25], opts: { expr: 'angry' } });
        act(K, 'luna', mixP(P(-0.7, 7.0), P(-0.6, 4.5), rk), { id: 'lu', face: rp, anim: 'run', extra: WORLD });
        act(K, 'blake', mixP(P(-1.7, 7.6), P(-1.3, 5.3), rk), { id: 'bk', face: rp, anim: 'run', extra: WORLD });
        const ctl = P(-0.3, 1.6, 1.1);
        const b0 = [rp[0] - 0.12, rp[1] - 0.33, 0.05];
        const bp = t < KT ? b0 : bez3([RIN1[0] - 0.12, RIN1[1] - 0.33, 0.05], ctl, RIN_GOAL, Math.min(1, seg(t, KT, KT + 22)));
        ball(K, bp);
        const look = t < KT ? [rp[0] - 0.2, rp[1] - 0.3, 0.45] : mixP([RIN1[0] - 0.2, RIN1[1] - 0.3, 0.45], P(-0.5, 0.4, 0.6), easeIO(seg(t, KT, KT + 30)));
        const kp = easeIO(seg(t, KT, KT + 40));
        cam(K, shake(K, [rp[0] + 2.3 + kp * 0.9, rp[1] + 0.3 + kp * 0.5, 0.32 + kp * 0.25], f, t >= KT ? 0.012 * Math.max(0, 1 - (t - KT) / 20) : 0.006), look, 42);
        st.ball = W3(bp);
        if (t >= KT) st.b1 = W3(bez3([RIN1[0] - 0.12, RIN1[1] - 0.33, 0.05], ctl, RIN_GOAL, Math.min(1, seg(t - 4, KT, KT + 22))));
      } else if (phase === 1) {
        // 1 x 0: de dentro do gol; a rede estufa e a torcida holográfica acende
        const HIT = 16;
        const burst = seg(t, HIT, HIT + 14) * (1 - 0.5 * seg(t, 70, 120));
        holoStands(K, burst);
        const bp = t < HIT ? mixP(P(-0.5, 1.5, 0.8), P(-0.84, -0.3, 0.78), t / HIT) : P(-0.82, -0.38, Math.max(0.06, 0.78 - (t - HIT) * 0.03));
        ball(K, bp);
        act(K, 'rin', RIN1, { id: 'rin', face: t > 40 ? P(0, 9) : P(-0.3, -4), anim: t < 40 ? 'shoot' : 'idle', frame: t < 40 ? 1 : undefined, extra: BL, light: [0.95, 1.15, 1.25] });
        act(K, 'luna', P(-0.6, 3.1), { id: 'lu', face: RIN1, extra: WORLD, frame: 0 });
        cam(K, shake(K, P(-0.35, -0.42, 0.46), f * 2, t >= HIT ? 0.03 * Math.max(0, 1 - (t - HIT) / 30) : 0.003, 5), P(0.1, 3.3, 0.5), 60);
        st.ball = W3(bp);
        st.hit = t >= HIT;
      } else if (phase === 2) {
        // VELOCIDADE DIVINA: o Loki agacha (câmera lenta), some e aparece atrás da defesa
        holoStands(K, 0.2);
        const A = W5A(t);
        const go = seg(A, LK_GO, LK_GO + 4);
        const lp = A < LK_GO ? LK0 : mixP(LK0, LK1, ease(go));
        const lst = A < LK_GO - 14 ? 'idle' : A < LK_GO ? 'windup' : A < LK_GO + 4 ? 'run' : A < LK_SH ? 'idle' : A < LK_SH + 16 ? 'shoot' : 'idle';
        if (!(A >= LK_GO && A < LK_GO + 4) || go > 0.85) act(K, 'loki', lp, { id: 'lk', face: Q(0, -4), anim: lst, frame: lst === 'idle' && A < LK_GO ? undefined : 1, extra: WORLD, light: [1.18, 1.1, 0.95] });
        // o rastro dourado (no overlay): de onde ele saiu até onde chegou
        if (A >= LK_GO && A < LK_SH + 20) {
          st.trW = [LK0, lp];
          st.trA = 1 - seg(A, LK_GO + 6, LK_SH + 20);
        }
        const defs = [['you', Q(-0.9, 5.6)], ['aryu', Q(0.95, 5.3)], ['tokimitsu', Q(-2.4, 5.9)]];
        defs.forEach(([who, p], i) => {
          const turned = A > LK_GO + 8 + i * 3;
          act(K, who, p, { id: 'd' + i, face: turned ? LK1 : LK0, anim: turned && A < LK_SH + 20 ? 'run' : 'idle', frame: turned ? 2 : undefined, extra: BL, light: [0.95, 1.0, 1.1] });
        });
        let bp;
        if (A < LK_GO) bp = [LK0[0] + 0.1, LK0[1] + 0.33, 0.05];
        else if (A < LK_SH) bp = [lp[0] + 0.1, lp[1] + 0.33, 0.05];
        else bp = bez3([LK1[0] + 0.1, LK1[1] + 0.33, 0.05], Q(-0.4, 1.6, 1.0), Q(-0.84, -0.3, 0.7), Math.min(1, seg(A, LK_SH, LK_SH + 16)));
        ball(K, bp);
        const ka = easeIO(seg(t, 0, 116));
        const kb = easeIO(seg(t, 118, 160));
        const eye = mixP(mixP(P(3.5, 8.0, 0.55), P(3.1, 7.9, 0.5), ka), P(3.4, 11.4, 0.85), kb);
        const look = mixP(mixP(P(0.1, 7.9, 0.5), P(0.0, 7.7, 0.45), ka), Q(-0.3, 1.6, 0.5), kb);
        const sh = A >= LK_GO && A < LK_GO + 20 ? 0.03 * (1 - seg(A, LK_GO, LK_GO + 20)) : 0.004;
        cam(K, shake(K, eye, f * 2, sh, 3), look, lerp(lerp(42, 36, ka), 46, kb));
        st.lk = W3([LK0[0], LK0[1], 0.3]);
        st.A = A;
      } else if (phase === 3) {
        // a montagem: um lance de cada (cortes secos)
        holoStands(K, 0.35);
        const list = win ? W5_WIN : W5_LOSE;
        const i = Math.min(3, Math.floor(t / W5_SEG));
        const s = list[i];
        const lt = t - i * W5_SEG;
        const KT = 30;
        const sp = mixP(s.from, s.to, easeIO(seg(lt, 0, KT - 6)));
        const sst = lt < KT - 6 ? 'run' : lt < KT ? (s.anim === 'bicycle' ? 'bicycle' : 'windup') : s.anim;
        const z = s.anim === 'bicycle' ? Math.sin(seg(lt, KT - 10, KT + 16) * Math.PI) * 0.35 : 0;
        const goalDir = s.ours ? P(s.to[0] - GX, -4) : Q(s.to[0] - GX, -4);
        act(K, s.id, [sp[0], sp[1], z], { id: 'sh', face: goalDir, anim: sst, frame: sst === 'run' ? undefined : 1, opts: s.anim === 'bicycle' ? { animTime: seg(lt, KT - 10, KT + 16) * 40 } : undefined, extra: w5Kit(s.id), light: [1.12, 1.1, 1.06] });
        // a bola: chega (cruzamento na bicicleta) → chute → gol / defesa
        const b0 = s.anim === 'bicycle' ? [s.to[0], s.to[1], 0.6] : [sp[0] + (s.ours ? -0.1 : 0.1), sp[1] + (s.ours ? -0.33 : 0.33), 0.05];
        let bp;
        if (lt < KT) bp = s.anim === 'bicycle' ? mixP(Q(-3.2, 4.4, 1.2), b0, seg(lt, 0, KT)) : b0;
        else {
          const q = seg(lt, KT, KT + 12);
          const end = s.save === 'block' ? Q(0.0, 2.9, 0.3) : s.save === 'head' ? Q(0.5, 1.7, 0.95) : s.shot;
          bp = mixP(b0, end, q);
          if (q >= 1 && s.save) {
            // defendida: a bola volta para o campo
            const r = seg(lt, KT + 12, KT + 40);
            bp = mixP(end, s.save === 'post' ? Q(-2.0, 3.6, 0.05) : Q(2.4, 4.5, 0.05), ease(r));
            bp[2] = Math.max(0.05, end[2] * (1 - r) + Math.sin(r * Math.PI) * 0.5);
          } else if (q >= 1) bp = [end[0], end[1] + (s.ours ? -1 : 1) * Math.min(0.35, (lt - KT - 12) * 0.03), Math.max(0.06, end[2] - (lt - KT - 12) * 0.03)];
        }
        ball(K, bp);
        // quem tenta parar
        const [dw, dp] = s.def;
        const late = lt > KT - 4;
        const danim = s.save === 'block' && late ? 'dive' : s.save === 'head' && late ? 'jump' : late ? 'run' : 'idle';
        const dz = s.save === 'head' && late ? Math.sin(seg(lt, KT - 4, KT + 20) * Math.PI) * 0.4 : 0;
        act(K, dw, [dp[0], dp[1], dz], { id: 'df', face: s.save === 'block' ? sp : bp, anim: danim, frame: danim === 'idle' ? undefined : 2, opts: danim === 'jump' ? { animTime: seg(lt, KT - 4, KT + 20) * 40 } : danim === 'dive' ? { animTime: 30 } : undefined, extra: w5Kit(dw) });
        const a = lt * 0.002;
        const eye = [s.eye[0] + Math.sin(a) * 0.3, s.eye[1] + Math.cos(a) * 0.2, s.eye[2]];
        cam(K, shake(K, eye, f * 2, lt >= KT && lt < KT + 14 ? 0.01 : 0.004, 2 + i), s.look, s.eye[2] > 1.5 ? 48 : 44);
        st.i = i;
        st.lt = lt;
        st.ball = W3(bp);
      } else if (phase === 4) {
        // A MÃO DO LOKI: depois do apito; ele vem até você e estende a mão
        holoStands(K, win ? 0.45 : 0.05);
        const wk = easeIO(seg(t, 10, 90));
        const lp = mixP(Q(1.6, 3.0), Q(0.25, 4.95), wk);
        const hand = t > 96;
        act(K, 'loki', lp, { id: 'lk', face: Q(0.15, 6.1), anim: hand ? 'call_pass' : wk < 1 ? 'run' : 'idle', frame: hand ? 1 : undefined, extra: WORLD, light: [1.15, 1.08, 0.95], opts: { expr: 'happy' } });
        if (!win) act(K, 'you', Q(0.15, 6.1), { id: 'y', face: Q(0.2, 0), anim: 'sit_floor', extra: BL, light: [0.75, 0.82, 0.95] });
        else act(K, 'you', Q(0.15, 6.0), { id: 'y', face: lp, anim: t > 120 ? 'call_pass' : 'idle', frame: t > 120 ? 1 : undefined, extra: BL, light: [0.95, 1.05, 1.1] });
        act(K, 'aryu', Q(-1.1, 8.7), { id: 'ar', face: Q(0, 0), anim: win ? 'idle' : 'kneel_down', frame: 4, extra: BL, light: [0.75, 0.8, 0.9] });
        act(K, 'luna', Q(2.4, 2.4), { id: 'lu', face: lp, extra: WORLD, frame: 0, light: [0.85, 0.85, 0.85] });
        const k = easeIO(t / 240);
        cam(K, shake(K, mixP(Q(-2.75, 6.75, win ? 0.6 : 0.32), Q(-2.55, 6.5, win ? 0.62 : 0.34), k), f * 0.5, 0.003), mixP(Q(0.2, 5.5, 0.45), Q(0.2, 5.5, 0.55), k), lerp(40, 37, k));
      } else {
        // O FIM: a grua sobe sobre o campo (derrota: o Rin sozinho no lugar do gol dele)
        holoStands(K, win ? 0.6 + 0.3 * Math.sin(t * 0.08) : 0.08);
        if (!win) {
          act(K, 'rin', RIN1, { id: 'rin', face: P(0, 9), extra: BL, light: [1.0, 1.2, 1.3] });
          act(K, 'you', P(-2.7, 6.6), { id: 'y', face: P(0, 1), anim: 'sit_floor', extra: BL, light: [0.6, 0.65, 0.8] });
          act(K, 'aryu', P(2.7, 5.5), { id: 'ar', face: P(0, 1), anim: 'kneel_down', frame: 4, extra: BL, light: [0.6, 0.65, 0.8] });
          act(K, 'tokimitsu', P(3.5, 3.5), { id: 'to', face: P(0, 1), anim: 'sit_floor', extra: BL, light: [0.6, 0.65, 0.8] });
          act(K, 'bachira', P(-2.7, 3.6), { id: 'ba', face: P(0, 1), extra: BL, frame: 0, light: [0.6, 0.65, 0.8] });
          K.floor({ x0: RIN1[0] - 0.9, y0: RIN1[1] - 0.9, x1: RIN1[0] + 0.9, y1: RIN1[1] + 0.9, z: 0.012, img: SPOT(), color: '#bae6fd', alpha: 0.6, em: true });
        } else {
          const c = P(0.2, 4.2);
          [['you', 0], ['rin', 1], ['bachira', 2], ['aryu', 3], ['tokimitsu', 4]].forEach(([who, i]) => {
            const a = (i / 5) * TAU + 0.6;
            act(K, who, [c[0] + Math.cos(a) * 0.7, c[1] + Math.sin(a) * 0.55, 0], { id: 'w' + i, face: c, anim: who === 'rin' ? 'idle' : 'celebrate', extra: BL });
          });
        }
        const k = easeIO(seg(t, 0, 240));
        const look = win ? P(0.2, 4.2, 0.4) : [RIN1[0], RIN1[1], 0.5];
        cam(K, mixP(win ? P(-0.8, 7.6, 1.1) : P(-0.6, 6.6, 0.6), P(1.6, 10.6, 4.0), k), mixP(look, P(0, 3.2, 0), k), lerp(42, 54, k));
        st.rin = W3([RIN1[0], RIN1[1], 0.5]);
      }
    };
  }
  function w5Overlay(v) {
    const win = v === 'win';
    return function (ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        const KT = 110;
        if (st.ball && st.b1 && t >= KT) CE.luckStreak(ctx, st.b1.x, st.b1.y, st.ball.x, st.ball.y, 3, 22, '34,211,238', 0.85);
        if (t >= KT && t < KT + 8) CE.drawRadialSpeedLines(ctx, st.ball ? st.ball.x : W / 2, st.ball ? st.ball.y : H / 2, W, '#cffafe', 0.35 * (1 - (t - KT) / 8));
        kick(ctx, S, 'BLUE LOCK  x  WORLD FIVE', seg(t, 6, 40), '#38bdf8');
        board(ctx, S, 0, 0, { k: seg(t, 10, 30) });
        fadeBlack(ctx, S, 1 - seg(t, 0, 18));
        CE.cineSfx(S, KT, 'chute', () => window.SFX?.kick?.(1));
      } else if (phase === 1) {
        const HIT = 16;
        netOverlay(ctx, S, st.hit ? st.ball : null, st.hit ? Math.max(0, 1 - (t - HIT) / 40) * Math.abs(Math.cos((t - HIT) * 0.25)) : 0);
        if (st.hit) {
          CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, HIT, HIT + 10)), '#cffafe');
          CE.cineBokeh(ctx, W, top, top + (bot - top) * 0.5, t, 26, ['rgba(255,255,255,0.5)', 'rgba(56,189,248,0.45)'], 4);
        }
        board(ctx, S, st.hit ? 1 : 0, 0, { pop: st.hit ? 1 - seg(t, HIT, HIT + 30) : 0, popSide: 'h' });
        CE.cineSfx(S, HIT, 'gol', () => window.SFX?.goal?.(true));
      } else if (phase === 2) {
        const A = st.A || 0;
        // o close: a chuteira dourada empurrando o gramado (antes de sumir)
        if (t > 64 && t < 118) {
          const q = seg(t, 64, 118);
          cutin(ctx, [[W * 0.5, bot - (bot - top) * 0.52], [W - 16, bot - (bot - top) * 0.6], [W - 16, bot - 16], [W * 0.44, bot - 16]], seg(t, 64, 73), [W * 0.5, 0], (b, g) => {
            paper(g, b, '#fef3c7', 'rgba(120,53,15,0.28)');
            CA().speedLines(g, Math.PI, W, H, { color: 'rgba(180,83,9,0.55)', n: 30, t: q * 70, speed: 30, thick: 7 });
            g.fillStyle = '#65a30d';
            g.fillRect(b.x, b.y + b.h * 0.82, b.w, b.h * 0.2);
            g.fillStyle = '#3f6212';
            for (let i = 0; i < 14; i++) g.fillRect(b.x + b.w * rnd(i, 4), b.y + b.h * 0.82 - (q > 0.7 ? rnd(i, 5) * 40 * (q - 0.7) * 3 : 0), 10, 10);
            CA().boot(g, b.x + b.w * 0.45, b.y + b.h * 0.84, b.h * 0.16, Object.assign({ ang: lerp(0.2, 0.55, easeIO(q)), flip: true }, BOOTS.loki));
          }, { border: '#fde68a' });
        }
        // o rastro: do ponto de partida até o último pedaço do caminho que ainda está na tela
        // (ele é mais rápido que a câmera: o rastro sai do quadro)
        if (st.trW && st.trA > 0) {
          const [a0, a1] = st.trW;
          const p0 = K.screen(a0[0], 0.4, a0[1]);
          let p1 = null;
          for (let i = 1; i <= 12; i++) {
            const q = mixP(a0, a1, i / 12);
            const p = K.screen(q[0], 0.4, q[1]);
            if (p && p.x > -300 && p.x < W + 300) p1 = p;
            else break;
          }
          if (p0 && p1) {
            CE.luckStreak(ctx, p0.x, p0.y, p1.x, p1.y, 8, 56, '251,191,36', 0.8 * st.trA);
            CE.luckStreak(ctx, p0.x, p0.y, p1.x, p1.y, 3, 18, '254,243,199', 0.95 * st.trA);
          }
        }
        if (A >= LK_GO && A < LK_GO + 10) {
          CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(A, LK_GO, LK_GO + 6)), '#fef3c7');
          CE.drawSpeedLines(ctx, W, H, '#fde68a', 0.3 * (1 - seg(A, LK_GO, LK_GO + 10)));
        }
        board(ctx, S, 1, A >= LK_SH + 14 ? 1 : 0, { pop: A >= LK_SH + 14 ? 1 - seg(A, LK_SH + 14, LK_SH + 40) : 0, popSide: 'a', red: A >= LK_SH + 14 });
        kick(ctx, S, 'JULIAN LOKI • WORLD FIVE', seg(t, 130, 160), '#fbbf24');
        CE.cineSfx(S, 120, 'divina', () => window.SFX?.whoosh?.());
        CE.cineSfx(S, 140, 'chute', () => window.SFX?.kick?.(1));
      } else if (phase === 3) {
        const list = win ? W5_WIN : W5_LOSE;
        const i = st.i || 0;
        const lt = st.lt || 0;
        const s = list[i];
        const KT = 30;
        const goal = !s.save && lt >= KT + 12;
        if (lt >= KT && lt < KT + 8 && st.ball) CE.drawRadialSpeedLines(ctx, st.ball.x, st.ball.y, W, '#e0f2fe', 0.3 * (1 - (lt - KT) / 8));
        if (goal) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(lt, KT + 12, KT + 20)), s.ours ? '#ccfbf1' : '#fee2e2');
        // o placar: derrota 1x2 → 1x5; vitória 1x1 até a virada (2x1)
        let hs = 1;
        let as = 1;
        if (win) hs = i === 3 && goal ? 2 : 1;
        else as = 1 + i + (goal ? 1 : 0);
        board(ctx, S, hs, as, { red: !win, pop: goal ? 1 - seg(lt, KT + 12, KT + 36) : 0, popSide: win ? 'h' : 'a' });
        if (lt < 2) ctx.fillStyle = 'rgba(2,6,23,0.6)';
        if (lt < 2) ctx.fillRect(0, 0, W, H);
        for (let j = 0; j < 4; j++) CE.cineSfx(S, j * W5_SEG + KT, 'lance' + j, () => window.SFX?.kick?.(0.9));
        for (let j = 0; j < 4; j++) if (list[j].save) CE.cineSfx(S, j * W5_SEG + KT + 12, 'def' + j, () => (list[j].save === 'post' ? window.SFX?.post?.() : window.SFX?.save?.()));
      } else if (phase === 4) {
        board(ctx, S, win ? 2 : 1, win ? 1 : 5, { red: !win, green: win });
        kick(ctx, S, 'FIM DE JOGO', seg(t, 6, 30), win ? '#22c55e' : '#ef4444');
        // close: a mão estendida (pixel art), de cima para baixo (quadro reto: momento calmo)
        if (t > 110 && t < 210 && CE.sselHandCv) {
          const q = seg(t, 110, 210);
          cutin(ctx, [[30, top + 24], [W * 0.36, top + 24], [W * 0.36, bot - 24], [30, bot - 24]], seg(t, 110, 119), [-300, 0], (b, g) => {
            paper(g, b, '#0f172a', 'rgba(251,191,36,0.2)');
            CE.cineGlow(g, b.x + b.w * 0.5, b.y + b.h * 0.3, b.h * 0.5, 'rgba(253,230,138,0.35)', 1);
            pixImg(g, CE.sselHandCv(), b.x + b.w * 0.5, b.y + b.h * lerp(0.62, 0.5, ease(q)), 12, Math.PI);
          }, { border: '#fde68a' });
        }
        CE.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
      } else {
        flares(ctx, K, S, 0.7);
        if (!win && st.rin) CE.cineShafts(ctx, st.rin.x, top - 30, Math.PI / 2, Math.max(120, st.rin.y - top + 60), 0.25, 4, '186,230,253', 0.12, t);
        board(ctx, S, win ? 2 : 1, win ? 1 : 5, { red: !win, green: win, k: 1 - seg(t, 150, 170) });
        if (win) endTitle(ctx, S, seg(t, 170, 196), 'BLUE LOCK x WORLD FIVE', 'O TOPO EXISTE', '#00f5d4');
        else endTitle(ctx, S, seg(t, 170, 196), '2ª SELEÇÃO • RESULTADO FINAL', 'TOP 6', '#00f5d4');
        fadeBlack(ctx, S, seg(t, 214, 240));
        CE.cineSfx(S, 170, 'titulo', () => window.SFX?.kick?.(0.8));
      }
    };
  }

  CE.registerCine3D('world_five_fall', {
    phases: W5_PH,
    music: 'dread',
    title: '🌍 O MURO DO MUNDO',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    readScale: 0.85,
    theme: 'bluelock_holo',
    tags: ['PLANO 1 • O RIN ABRE', 'PLANO 2 • 1 x 0', 'PLANO 3 • VELOCIDADE DIVINA', 'PLANO 4 • O MUNDO RESPONDE', 'PLANO 5 • A MÃO DO LOKI', 'PLANO 6 • TOP 6'],
    subs: [
      [{ from: 16, to: 168, who: 'NARRADOR', text: 'Blue Lock x World Five. E o Rin abre o placar.', color: NARR_C }],
      [],
      [{ from: 150, to: 248, who: 'JULIAN LOKI', text: '"Desculpe. Nessa velocidade, ninguém me alcança."', color: LOKI_C }],
      [{ from: 10, to: 298, who: 'NARRADOR', text: 'Luna. Blake. Dada Silva. Pablo. Um gol atrás do outro.', color: NARR_C }],
      [{ from: 100, to: 238, who: 'JULIAN LOKI', text: '"Bom jogo. Vocês ainda estão longe."', color: LOKI_C }],
      [
        { from: 8, to: 110, who: 'EGO', text: '"Só o Rin e o Shidou marcaram contra eles."', color: EGO_C },
        { from: 114, to: 238, who: 'EGO', text: '"Isso define o Top 6."', color: EGO_C }
      ]
    ],
    scene: w5Scene('lose'),
    overlay: w5Overlay('lose')
  });

  CE.registerCine3D('world_five_win', {
    phases: W5_PH,
    music: 'epic',
    title: '🌍 O MUNDO SUOU',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    readScale: 0.85,
    theme: 'bluelock_holo',
    tags: ['PLANO 1 • O RIN ABRE', 'PLANO 2 • 1 x 0', 'PLANO 3 • VELOCIDADE DIVINA', 'PLANO 4 • O BLUE LOCK AGUENTA', 'PLANO 5 • A MÃO DO LOKI', 'PLANO 6 • O TOPO EXISTE'],
    subs: [
      [{ from: 16, to: 168, who: 'NARRADOR', text: 'Blue Lock x World Five. E o Rin abre o placar.', color: NARR_C }],
      [],
      [{ from: 150, to: 248, who: 'JULIAN LOKI', text: '"Desculpe. Nessa velocidade, ninguém me alcança."', color: LOKI_C }],
      [{ from: 10, to: 298, who: 'NARRADOR', text: 'O mundo veio com tudo. O Blue Lock aguentou... e virou.', color: NARR_C }],
      [{ from: 40, to: 238, who: 'JULIAN LOKI', text: '"Vocês me fizeram suar. Guarde esse nome: Julian Loki."', color: LOKI_C }],
      [
        { from: 8, to: 110, who: 'EGO', text: '"Vencer uma vez não é o topo."', color: EGO_C },
        { from: 114, to: 238, who: 'EGO', text: '"É a prova de que o topo existe."', color: EGO_C }
      ]
    ],
    scene: w5Scene('win'),
    overlay: w5Overlay('win')
  });

  // ajudantes usados também pelas cenas do js/cine3d_manga.js
  CE._c3b = {
    mkCv, lazy, plate, disc, P, Q, GX, GY, cam, act, ball, shake, remap, bez3, W3, stOf, arena, longShadow, shadowFrom,
    bwBlue, impactFrame, flares, netOverlay, eyesLit, groundRing, fadeBlack, kick, endTitle, cutin, paper, partAt, pixImg,
    RINGH, SPOT, BL, TEAL, DARK, PIX, BOOTS
  };
})();
