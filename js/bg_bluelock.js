// Fundos dos diálogos (bg_bluelock): CutsceneEngine.VN_BG[tema] = function (ctx, W, H) { ... }
window.CutsceneEngine.VN_BG = window.CutsceneEngine.VN_BG || {};

// ============================================================================
// FUNDOS DA INSTALAÇÃO DO BLUE LOCK (pintura de fundo estilo anime)
// Cada cena é uma sala em 3D simples: câmera com ponto de fuga, paredes/teto/chão em
// perspectiva, neblina azulada com a profundidade, neon, reflexo no piso e vinheta.
// Desenhado UMA vez por troca de cena; determinístico (sorteio com semente).
// Temas: bluelock_room, locker_room, corridor, monitor_room, auditorium, tunnel
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  const VN = CE.VN_BG;

  // ------------------------------------------------------------------ cores
  const rgb = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const WHITE = [255, 255, 255];
  const CYAN = [56, 200, 255];
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const sc3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

  // ------------------------------------------------------------------ geometria
  function poly(ctx, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i) ctx.lineTo(pts[i][0], pts[i][1]);
      else ctx.moveTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
  }
  function quad3(ctx, cam, pts3, style) {
    poly(ctx, pts3.map((p) => cam.P(p[0], p[1], p[2])));
    ctx.fillStyle = style;
    ctx.fill();
  }
  function line3(ctx, cam, a, b, style, w) {
    const p = cam.P(a[0], a[1], a[2]);
    const q = cam.P(b[0], b[1], b[2]);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.strokeStyle = style;
    ctx.lineWidth = w;
    ctx.stroke();
  }
  // Degradê "em perspectiva" ao longo da reta A→B do mundo: cor certa em cada profundidade
  function depthGrad(ctx, cam, A, B, colorAt, n = 14) {
    const pa = cam.P(A[0], A[1], A[2]);
    const pb = cam.P(B[0], B[1], B[2]);
    const g = ctx.createLinearGradient(pa[0], pa[1], pb[0], pb[1]);
    const za = A[2];
    const zb = B[2];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      let t = s;
      if (Math.abs(zb - za) > 1e-6) {
        const z = 1 / (1 / za + s * (1 / zb - 1 / za));
        t = (z - za) / (zb - za);
      }
      g.addColorStop(s, colorAt([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t], t));
    }
    return g;
  }
  // Coloca o sistema de coordenadas local sobre um plano 3D (100 unidades = 1 m),
  // aproximação afim no ponto c: u = direção "direita", v = direção "baixo"
  function onPlane(ctx, cam, c, u, v) {
    const e = 0.02;
    const p = cam.P(c[0], c[1], c[2]);
    const pu = cam.P(c[0] + u[0] * e, c[1] + u[1] * e, c[2] + u[2] * e);
    const pv = cam.P(c[0] + v[0] * e, c[1] + v[1] * e, c[2] + v[2] * e);
    const k = 1 / (e * 100);
    ctx.transform((pu[0] - p[0]) * k, (pu[1] - p[1]) * k, (pv[0] - p[0]) * k, (pv[1] - p[1]) * k, p[0], p[1]);
  }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ------------------------------------------------------------------ luz
  function glow(ctx, x, y, r, col, a = 1) {
    if (r <= 0.5) return;
    CE.cineGlow(ctx, x, y, r, col, a);
  }
  // Brilho elíptico (poça de luz no chão, lavagem de luz na parede, reflexo esticado)
  function glowE(ctx, x, y, rx, ry, col, a = 1) {
    if (rx <= 0.5 || ry <= 0.5) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    CE.cineGlow(ctx, 0, 0, rx, col, a);
    ctx.restore();
  }
  // Fita de neon em 3D (a espessura afina com a distância): a→b, off = meia espessura
  function neon3(ctx, cam, a, b, off, col, k = 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    [[11, 0.025], [6, 0.05], [3.4, 0.09], [1.9, 0.2]].forEach(([m, al]) => {
      const o = sc3(off, m);
      quad3(ctx, cam, [sub3(a, o), sub3(b, o), add3(b, o), add3(a, o)], rgb(col, al * k));
    });
    ctx.restore();
    quad3(ctx, cam, [sub3(a, off), sub3(b, off), add3(b, off), add3(a, off)], rgb(mix(col, WHITE, 0.6), Math.min(1, k)));
  }
  // Traço de neon 2D (coordenadas locais): path() monta o caminho
  function neonStroke(ctx, path, col, w, k = 1) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    [[7, 0.05], [4, 0.09], [2.2, 0.2]].forEach(([m, al]) => {
      path();
      ctx.lineWidth = w * m;
      ctx.strokeStyle = rgb(col, al * k);
      ctx.stroke();
    });
    ctx.restore();
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    path();
    ctx.lineWidth = w;
    ctx.strokeStyle = rgb(mix(col, WHITE, 0.6), k);
    ctx.stroke();
    ctx.restore();
  }

  // Caixa 3D (só as faces que a câmera vê). col = cor base; fog(c, z) = neblina
  function box3(ctx, cam, x0, x1, y0, y1, z0, z1, col, fog, o = {}) {
    const zc = (z0 + z1) / 2;
    const sh = (k) => rgb(fog(mul(col, k), zc));
    if (cam.eye < y0) quad3(ctx, cam, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], o.bottom || sh(0.5));
    if (cam.camX > x1) quad3(ctx, cam, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], o.side || sh(0.74));
    if (cam.camX < x0) quad3(ctx, cam, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], o.side || sh(0.74));
    if (cam.eye > y1) quad3(ctx, cam, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], o.top || sh(1.18));
    if (z0 > 0.05) quad3(ctx, cam, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], o.front || sh(0.94));
    if (o.edge) line3(ctx, cam, [x0, y1, z0], [x1, y1, z0], o.edge, Math.max(1, cam.s(z0) * 0.012));
  }

  // ------------------------------------------------------------------ símbolo
  // Cadeado do Blue Lock (coordenadas locais; s = largura do corpo)
  function lockShape(ctx, s) {
    return {
      shackle() {
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, -s * 0.18);
        ctx.lineTo(-s * 0.3, -s * 0.42);
        ctx.arc(0, -s * 0.42, s * 0.3, Math.PI, 0);
        ctx.lineTo(s * 0.3, -s * 0.18);
      },
      body() {
        rrect(ctx, -s / 2, -s * 0.2, s, s * 0.76, s * 0.12);
      },
      key() {
        ctx.beginPath();
        ctx.arc(0, s * 0.1, s * 0.1, 0, Math.PI * 2);
        ctx.moveTo(-s * 0.045, s * 0.15);
        ctx.lineTo(s * 0.045, s * 0.15);
        ctx.lineTo(s * 0.085, s * 0.42);
        ctx.lineTo(-s * 0.085, s * 0.42);
        ctx.closePath();
      }
    };
  }
  CE.bgblLock = function (ctx, s, col, mode = 'neon', k = 1, dark = [4, 10, 22]) {
    const L = lockShape(ctx, s);
    if (mode === 'neon') {
      neonStroke(ctx, L.shackle, col, s * 0.07, k);
      neonStroke(ctx, L.body, col, s * 0.06, k);
      L.key();
      ctx.fillStyle = rgb(mix(col, WHITE, 0.5), k);
      ctx.fill();
    } else {
      L.shackle();
      ctx.lineWidth = s * 0.13;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = rgb(col, k);
      ctx.stroke();
      L.body();
      ctx.fillStyle = rgb(col, k);
      ctx.fill();
      L.key();
      ctx.fillStyle = rgb(dark, k);
      ctx.fill();
    }
  };

  // ------------------------------------------------------------------ câmera
  Object.assign(CE, {
    bgblRng(seed) {
      let a = seed >>> 0 || 1;
      return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    // Câmera pinhole: y para cima, z para dentro da tela. cy = linha do horizonte (fração de H)
    bgblCam(W, H, o = {}) {
      // foco guiado pela altura (telas largas e baixas não cortam o teto/telão)
      const f = (o.fov || 1) * Math.max(W * 0.5, H * 1.28);
      const cx = W * (o.cx ?? 0.5);
      const cy = H * (o.cy ?? 0.36);
      const eye = o.eye ?? 1.6;
      const camX = o.camX ?? 0;
      const P = (x, y, z) => {
        const zz = Math.max(z, 0.08);
        return [cx + (f * (x - camX)) / zz, cy - (f * (y - eye)) / zz];
      };
      return { W, H, f, cx, cy, eye, camX, P, s: (z) => f / Math.max(z, 0.08) };
    },
    // Acabamento comum: sombra suave atrás da cabeça, poeira, vinheta e granulado fixo
    bgblFinish(ctx, W, H, o = {}) {
      const g = ctx.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, Math.max(W * 0.22, H * 0.5));
      g.addColorStop(0, `rgba(2,6,16,${o.shade ?? 0.28})`);
      g.addColorStop(1, 'rgba(2,6,16,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const b = ctx.createLinearGradient(0, H * 0.7, 0, H);
      b.addColorStop(0, 'rgba(2,5,14,0)');
      b.addColorStop(1, `rgba(2,5,14,${o.floorDark ?? 0.45})`);
      ctx.fillStyle = b;
      ctx.fillRect(0, H * 0.7, W, H * 0.3);
      if (o.dust !== 0) CE.cineDust(ctx, W, H * 0.75, 0, o.dust || 50, o.dustColor || 'rgba(170,215,255,0.32)', o.seed || 7);
      CE.cineVignette(ctx, W, H, o.vig ?? 0.62, '1,4,12');
      if (!CE._bgblGrain) {
        const cv = document.createElement('canvas');
        cv.width = 160;
        cv.height = 160;
        const gg = cv.getContext('2d');
        const img = gg.createImageData(160, 160);
        const R = CE.bgblRng(4242);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = R() < 0.5 ? 0 : 255;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = R() * 110;
        }
        gg.putImageData(img, 0, 0);
        CE._bgblGrain = cv;
      }
      ctx.save();
      ctx.globalAlpha = o.grain ?? 0.05;
      ctx.fillStyle = ctx.createPattern(CE._bgblGrain, 'repeat');
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  });

  const makeFog = (fogC, k, near = [0, 0, 0], nearK = 0) => (c, z) => {
    let r = mix(c, fogC, 1 - Math.exp(-z / k));
    if (nearK) r = mix(r, near, nearK * Math.exp(-z / 2.5));
    return r;
  };
  const font = (px, w = 900, it = true) => `${it ? 'italic ' : ''}${w} ${Math.max(1, px)}px "Segoe UI", sans-serif`;

  // Letras grandes pintadas numa parede lateral (uma aproximação afim por letra)
  function wallLetters(ctx, cam, X, side, text, z0, z1, yc, h, style) {
    const n = text.length;
    for (let i = 0; i < n; i++) {
      const ch = text[side < 0 ? i : n - 1 - i];
      if (ch === ' ') continue;
      const z = z0 + ((i + 0.5) / n) * (z1 - z0);
      ctx.save();
      onPlane(ctx, cam, [X, yc, z], side < 0 ? [0, 0, 1] : [0, 0, -1], [0, -1, 0]);
      ctx.font = font(h * 100);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = style;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
  }

  // Piso encerado: espelha o que já foi pintado acima da linha yj (parede do fundo),
  // sumindo com a distância, só dentro do polígono do chão
  function mirrorFloor(ctx, W, H, yj, alpha, clipPts, len) {
    const cv = ctx.canvas;
    const k = cv.width / W;
    const h = Math.floor(Math.min(H - yj, len, yj));
    if (h <= 2) return;
    const tmp = document.createElement('canvas');
    tmp.width = Math.ceil(W);
    tmp.height = h;
    const g = tmp.getContext('2d');
    g.save();
    g.translate(0, h);
    g.scale(1, -1);
    g.drawImage(cv, 0, (yj - h) * k, W * k, h * k, 0, 0, W, h);
    g.restore();
    g.globalCompositeOperation = 'destination-in';
    const m = g.createLinearGradient(0, 0, 0, h);
    m.addColorStop(0, 'rgba(0,0,0,1)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = m;
    g.fillRect(0, 0, W, h);
    ctx.save();
    poly(ctx, clipPts);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.drawImage(tmp, 0, yj);
    ctx.restore();
  }

  // Camiseta pendurada (coordenadas locais, centro no peito; w = largura)
  function jersey(ctx, w, base, trim, num) {
    const h = w * 1.05;
    ctx.beginPath();
    ctx.moveTo(-w * 0.18, -h * 0.5);
    ctx.lineTo(-w * 0.5, -h * 0.36);
    ctx.lineTo(-w * 0.62, -h * 0.08);
    ctx.lineTo(-w * 0.4, 0);
    ctx.lineTo(-w * 0.38, h * 0.5);
    ctx.lineTo(w * 0.38, h * 0.5);
    ctx.lineTo(w * 0.4, 0);
    ctx.lineTo(w * 0.62, -h * 0.08);
    ctx.lineTo(w * 0.5, -h * 0.36);
    ctx.lineTo(w * 0.18, -h * 0.5);
    ctx.quadraticCurveTo(0, -h * 0.36, -w * 0.18, -h * 0.5);
    ctx.closePath();
    ctx.fillStyle = rgb(base);
    ctx.fill();
    ctx.strokeStyle = rgb(trim, 0.9);
    ctx.lineWidth = w * 0.04;
    ctx.stroke();
    // dobra/sombra
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(w * 0.1, -h * 0.2, w * 0.28, h * 0.7);
    ctx.font = font(w * 0.42, 900, false);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = rgb(trim);
    ctx.fillText(num, 0, h * 0.1);
  }

  // =========================================================================
  // CORREDOR DA INSTALAÇÃO
  // =========================================================================
  VN.corridor = function (ctx, W, H) {
    const cam = CE.bgblCam(W, H, { cy: 0.34 });
    const R = CE.bgblRng(77);
    const hw = 2.5;
    const hc = 3.1;
    const zn = 0.3;
    const zf = 20;
    const sof = 0.5; // sanca de luz nos cantos de cima
    const ys = hc - 0.42;
    const fog = makeFog([34, 74, 128], 12);
    ctx.fillStyle = '#02050c';
    ctx.fillRect(0, 0, W, H);

    // Teto
    ctx.save();
    quad3(ctx, cam, [[-hw, hc, zn], [hw, hc, zn], [hw, hc, zf], [-hw, hc, zf]], depthGrad(ctx, cam, [0, hc, zn], [0, hc, zf], (w) => rgb(fog([6, 10, 20], w[2]))));
    ctx.restore();
    // Paredes
    [-1, 1].forEach((sd) => {
      const X = sd * hw;
      quad3(ctx, cam, [[X, 0, zn], [X, ys, zn], [X, ys, zf], [X, 0, zf]], depthGrad(ctx, cam, [X, 1.3, zn], [X, 1.3, zf], (w) => rgb(fog([24, 38, 62], w[2]))));
    });
    // Chão
    const floorPoly = [[-hw, 0, zn], [hw, 0, zn], [hw, 0, zf], [-hw, 0, zf]];
    quad3(ctx, cam, floorPoly, depthGrad(ctx, cam, [0, 0, zn], [0, 0, zf], (w) => rgb(fog([9, 15, 28], w[2]))));

    // Painéis de metal das paredes (variação sutil + frisos)
    const pz = 1.6;
    [-1, 1].forEach((sd) => {
      const X = sd * hw;
      for (let z = 0.4; z < zf; z += pz) {
        const z1 = Math.min(zf, z + pz);
        [[0, 0.32, [14, 22, 38]], [0.32, 2.15, [30, 48, 78]], [2.15, ys, [24, 38, 64]]].forEach(([y0, y1, c]) => {
          const k = 0.86 + R() * 0.26;
          quad3(ctx, cam, [[X, y0, z + 0.02], [X, y1, z + 0.02], [X, y1, z1 - 0.02], [X, y0, z1 - 0.02]],
            depthGrad(ctx, cam, [X, y1, z], [X, y0, z], (w) => rgb(fog(mul(c, k * (0.85 + 0.3 * (w[1] / ys))), z + 0.8)), 3));
        });
        // friso vertical (sombra + fio de luz)
        line3(ctx, cam, [X, 0, z], [X, ys, z], rgb(fog([4, 8, 16], z), 0.9), Math.max(1, cam.s(z) * 0.018));
        line3(ctx, cam, [X, 0.32, z + 0.05], [X, ys, z + 0.05], rgb(fog([90, 140, 200], z), 0.35), Math.max(0.6, cam.s(z) * 0.006));
        // rebites
        ctx.fillStyle = rgb(fog([120, 160, 210], z), 0.35);
        [0.5, 1.95].forEach((yy) => {
          const p = cam.P(X, yy, z + 0.12);
          const r = Math.max(0.8, cam.s(z) * 0.012);
          ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
        });
      }
    });

    // Letreiros pintados nas paredes
    wallLetters(ctx, cam, -hw, -1, 'BLUE LOCK', 3.4, 6.3, 1.2, 0.5, 'rgba(110,180,255,0.12)');
    wallLetters(ctx, cam, hw, 1, '05', 6.0, 7.0, 1.2, 0.95, 'rgba(110,180,255,0.12)');

    // Portas automáticas com neon, teclado e placa
    const doors = [[-1, 7.6, 'TEAM Z'], [-1, 14, 'TEAM W'], [1, 4.6, 'TEAM Y'], [1, 10.8, 'TEAM X'], [1, 16.6, 'TEAM V']];
    doors.forEach(([sd, zc, label]) => {
      const X = sd * hw;
      const Xi = sd * (hw + 0.18);
      const z0 = zc - 0.65;
      const z1 = zc + 0.65;
      const dh = 2.3;
      // batente fundo (face visível do recuo)
      quad3(ctx, cam, [[X, 0, z1], [Xi, 0, z1], [Xi, dh, z1], [X, dh, z1]], rgb(fog([40, 62, 98], zc)));
      quad3(ctx, cam, [[X, dh, z0], [Xi, dh, z0], [Xi, dh, z1], [X, dh, z1]], rgb(fog([8, 12, 22], zc)));
      // folhas da porta
      [[z0, zc - 0.01], [zc + 0.01, z1]].forEach(([a, b], i) => {
        quad3(ctx, cam, [[Xi, 0, a], [Xi, dh, a], [Xi, dh, b], [Xi, 0, b]], depthGrad(ctx, cam, [Xi, dh, a], [Xi, 0, a], (w) => rgb(fog(mix([46, 70, 108], [20, 32, 54], 1 - w[1] / dh), zc)), 3));
        // visor
        quad3(ctx, cam, [[Xi, 1.35, a + 0.15], [Xi, 1.75, a + 0.15], [Xi, 1.75, b - 0.15], [Xi, 1.35, b - 0.15]], rgb(fog([70, 150, 220], zc), 0.55));
      });
      neon3(ctx, cam, [Xi, 1.95, z0 + 0.08], [Xi, 1.95, z1 - 0.08], [0, 0.012, 0], CYAN, 0.8);
      // moldura de neon
      neon3(ctx, cam, [X, 0.02, z0], [X, dh + 0.04, z0], [0, 0, 0.018], CYAN, 0.75);
      neon3(ctx, cam, [X, dh + 0.04, z0], [X, dh + 0.04, z1], [0, 0.018, 0], CYAN, 0.75);
      // teclado ao lado
      const kz = z0 - 0.35;
      quad3(ctx, cam, [[X, 1.1, kz - 0.1], [X, 1.4, kz - 0.1], [X, 1.4, kz + 0.1], [X, 1.1, kz + 0.1]], rgb(fog([10, 16, 28], kz)));
      const kp = cam.P(X, 1.3, kz);
      glow(ctx, kp[0], kp[1], cam.s(kz) * 0.16, 'rgba(70,220,255,0.7)', 0.8);
      // placa acima
      ctx.save();
      onPlane(ctx, cam, [X, 2.48, zc], sd < 0 ? [0, 0, 1] : [0, 0, -1], [0, -1, 0]);
      ctx.fillStyle = 'rgba(4,10,22,0.9)';
      ctx.fillRect(-58, -11, 116, 22);
      ctx.strokeStyle = 'rgba(80,200,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-58, -11, 116, 22);
      ctx.font = font(15);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(200,240,255,0.95)';
      ctx.fillText(label, 0, 1);
      ctx.restore();
    });

    // Sancas de luz nos cantos de cima (com neon embaixo) e vigas do teto
    [-1, 1].forEach((sd) => {
      const xa = sd > 0 ? hw - sof : -hw;
      const xb = sd > 0 ? hw : -hw + sof;
      box3(ctx, cam, xa, xb, ys, hc, zn, zf, [22, 34, 56], fog);
      const xe = sd * (hw - sof + 0.03);
      neon3(ctx, cam, [xe, ys - 0.01, zn], [xe, ys - 0.01, zf], [0, 0.02, 0], CYAN, 0.9);
      // lavagem de luz da sanca na parede
      for (let z = 2; z < zf; z += 1.6) {
        const p = cam.P(sd * hw, ys - 0.5, z);
        glowE(ctx, p[0], p[1], cam.s(z) * 0.35, cam.s(z) * 0.75, 'rgba(70,170,255,0.35)', 0.55);
      }
      // faixa de neon rente ao chão
      neon3(ctx, cam, [sd * hw, 0.33, zn], [sd * hw, 0.33, zf], [0, 0.012, 0], [40, 150, 255], 0.65);
    });
    // Vigas e luminárias do teto
    const lights = [];
    for (let z = 1.2; z < zf - 0.5; z += 2.4) {
      box3(ctx, cam, -hw + sof, hw - sof, hc - 0.16, hc, z, z + 0.22, [20, 30, 50], fog);
      const lz = z + 1.2;
      if (lz < zf - 0.5) {
        lights.push(lz);
        quad3(ctx, cam, [[-0.7, hc - 0.01, lz - 0.35], [0.7, hc - 0.01, lz - 0.35], [0.7, hc - 0.01, lz + 0.35], [-0.7, hc - 0.01, lz + 0.35]], rgb(fog([200, 235, 255], lz * 0.4)));
        const p = cam.P(0, hc - 0.02, lz);
        glowE(ctx, p[0], p[1], cam.s(lz) * 1.3, cam.s(lz) * 0.45, 'rgba(150,215,255,0.55)', 0.8);
      }
    }
    // Câmeras de vigilância (o Ego vê tudo)
    [[-1, 5.2], [1, 8.4], [-1, 12.4]].forEach(([sd, z]) => {
      const x = sd * (hw - sof * 0.5);
      const p = cam.P(x, ys - 0.12, z);
      const s = cam.s(z);
      ctx.fillStyle = rgb(fog([12, 18, 30], z));
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], s * 0.12, s * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,60,80,0.95)';
      ctx.fillRect(p[0] - s * 0.015, p[1] - s * 0.015, Math.max(1.5, s * 0.03), Math.max(1.5, s * 0.03));
      glow(ctx, p[0], p[1], s * 0.1, 'rgba(255,60,80,0.6)', 0.8);
    });

    // Parede do fundo: portão do Blue Lock com o cadeado em neon
    const back = [[-hw, 0, zf], [hw, 0, zf], [hw, hc, zf], [-hw, hc, zf]];
    quad3(ctx, cam, back, rgb(fog([30, 46, 74], zf)));
    const bp = cam.P(0, 1.5, zf);
    glow(ctx, bp[0], bp[1], cam.s(zf) * 3.2, 'rgba(80,170,255,0.5)', 0.8);
    quad3(ctx, cam, [[-1.3, 0, zf], [1.3, 0, zf], [1.3, 2.5, zf], [-1.3, 2.5, zf]], rgb([22, 40, 70]));
    line3(ctx, cam, [0, 0, zf], [0, 2.5, zf], 'rgba(0,0,0,0.6)', Math.max(1, cam.s(zf) * 0.03));
    neon3(ctx, cam, [-1.3, 2.52, zf], [1.3, 2.52, zf], [0, 0.03, 0], CYAN, 1);
    ctx.save();
    const gc = cam.P(0, 1.35, zf);
    ctx.translate(gc[0], gc[1]);
    ctx.scale(cam.s(zf) / 100, cam.s(zf) / 100);
    CE.bgblLock(ctx, 70, [80, 210, 255], 'neon', 1);
    ctx.font = font(26);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(190,235,255,0.9)';
    ctx.fillText('BLUE LOCK', 0, -150);
    ctx.restore();

    // Placa suspensa (à direita, longe da cabeça do personagem)
    ctx.save();
    const sz = 6.2;
    const sp = cam.P(1.25, 2.62, sz);
    const ss = cam.s(sz) / 100;
    // cabos
    ctx.strokeStyle = 'rgba(20,30,50,0.9)';
    ctx.lineWidth = Math.max(1, ss * 1.5);
    [-50, 50].forEach((dx) => {
      ctx.beginPath();
      ctx.moveTo(sp[0] + dx * ss, sp[1] - 20 * ss);
      ctx.lineTo(sp[0] + dx * ss, cam.P(0, hc, sz)[1]);
      ctx.stroke();
    });
    ctx.translate(sp[0], sp[1]);
    ctx.scale(ss, ss);
    ctx.fillStyle = 'rgba(5,12,26,0.95)';
    ctx.fillRect(-90, -20, 180, 40);
    ctx.strokeStyle = 'rgba(56,200,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-90, -20, 180, 40);
    ctx.fillStyle = 'rgba(56,200,255,0.9)';
    ctx.fillRect(-90, -20, 8, 40);
    ctx.font = font(14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText('CAMPO DE TREINO ▶', -74, -6);
    ctx.font = font(9, 700);
    ctx.fillStyle = 'rgba(125,211,252,0.85)';
    ctx.fillText('◀ ALA 5 • DORMITÓRIOS', -74, 10);
    ctx.restore();

    // Piso: juntas, faixas guia e reflexos (tudo recortado no chão)
    ctx.save();
    poly(ctx, floorPoly.map((p) => cam.P(p[0], p[1], p[2])));
    ctx.clip();
    for (let z = 1; z < zf; z += 1.25) line3(ctx, cam, [-hw, 0, z], [hw, 0, z], rgb(fog([2, 5, 12], z), 0.7), Math.max(0.7, cam.s(z) * 0.01));
    [-1.25, 0, 1.25].forEach((x) => line3(ctx, cam, [x, 0, zn], [x, 0, zf], 'rgba(2,5,12,0.55)', 1));
    [-1.7, 1.7].forEach((x) => quad3(ctx, cam, [[x - 0.04, 0, zn], [x + 0.04, 0, zn], [x + 0.04, 0, zf], [x - 0.04, 0, zf]], 'rgba(120,190,255,0.12)'));
    // reflexos espelhados: luminárias, sancas e faixas de neon
    lights.forEach((lz) => {
      const p = cam.P(0, -(hc - 0.02), lz);
      glowE(ctx, p[0], p[1], cam.s(lz) * 0.5, cam.s(lz) * 1.3, 'rgba(150,210,255,0.4)', 0.55);
    });
    [-1, 1].forEach((sd) => {
      const xe = sd * (hw - sof + 0.03);
      neon3(ctx, cam, [xe, -(ys - 0.01), zn], [xe, -(ys - 0.01), zf], [0, 0.05, 0], CYAN, 0.18);
      neon3(ctx, cam, [sd * hw, -0.33, zn], [sd * hw, -0.33, zf], [0, 0.03, 0], [40, 150, 255], 0.22);
    });
    const rp = cam.P(0, -1.4, zf);
    glowE(ctx, rp[0], rp[1], cam.s(zf) * 1.6, cam.s(zf) * 3, 'rgba(80,190,255,0.5)', 0.5);
    ctx.restore();

    // Neblina no fundo do corredor + feixes de luz das luminárias
    const vp = cam.P(0, 1.4, zf);
    glow(ctx, vp[0], vp[1], cam.s(zf) * 6, 'rgba(60,130,220,0.35)', 0.6);
    lights.slice(0, 3).forEach((lz) => {
      const p = cam.P(0, hc - 0.05, lz);
      CE.cineShafts(ctx, p[0], p[1], Math.PI / 2, cam.s(lz) * 1.6, 0.9, 5, '150,205,255', 0.05, 0);
    });
    CE.bgblFinish(ctx, W, H, { seed: 11 });
  };

  // =========================================================================
  // VESTIÁRIO
  // =========================================================================
  VN.locker_room = function (ctx, W, H) {
    const cam = CE.bgblCam(W, H, { cy: 0.35 });
    const R = CE.bgblRng(31);
    const hw = 4.0;
    const hc = 3.2;
    const zb = 9;
    const zn = 0.3;
    const fog = makeFog([38, 66, 110], 22);
    ctx.fillStyle = '#03070f';
    ctx.fillRect(0, 0, W, H);

    // Teto, paredes, fundo e chão
    quad3(ctx, cam, [[-hw, hc, zn], [hw, hc, zn], [hw, hc, zb], [-hw, hc, zb]], depthGrad(ctx, cam, [0, hc, zn], [0, hc, zb], (w) => rgb(fog([10, 16, 30], w[2]))));
    [-1, 1].forEach((sd) => {
      quad3(ctx, cam, [[sd * hw, 0, zn], [sd * hw, hc, zn], [sd * hw, hc, zb], [sd * hw, 0, zb]], depthGrad(ctx, cam, [sd * hw, 1.5, zn], [sd * hw, 1.5, zb], (w) => rgb(fog([26, 40, 66], w[2]))));
    });
    const bw = cam.P(-hw, hc, zb);
    const bw2 = cam.P(hw, 0, zb);
    const bg = ctx.createLinearGradient(0, bw[1], 0, bw2[1]);
    bg.addColorStop(0, rgb(fog([40, 60, 96], zb)));
    bg.addColorStop(1, rgb(fog([22, 34, 58], zb)));
    ctx.fillStyle = bg;
    ctx.fillRect(bw[0], bw[1], bw2[0] - bw[0], bw2[1] - bw[1]);
    const floorPoly = [[-hw, 0, zn], [hw, 0, zn], [hw, 0, zb], [-hw, 0, zb]];
    quad3(ctx, cam, floorPoly, depthGrad(ctx, cam, [0, 0, zn], [0, 0, zb], (w) => rgb(fog([16, 26, 44], w[2]))));

    // Armário (porta em coordenadas locais: w x h, origem no canto de cima à esquerda)
    const lockerDoor = (w, h, base, num, open) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, rgb(mul(base, 1.08)));
      g.addColorStop(0.5, rgb(base));
      g.addColorStop(1, rgb(mul(base, 0.78)));
      ctx.fillStyle = g;
      ctx.fillRect(1.5, 0, w - 3, h);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(1.5, 0, w - 3, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let v = 0; v < 5; v++) ctx.fillRect(w * 0.22, 14 + v * 7, w * 0.56, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (let v = 0; v < 5; v++) ctx.fillRect(w * 0.22, 17 + v * 7, w * 0.56, 1);
      ctx.fillStyle = 'rgba(220,235,255,0.75)';
      ctx.fillRect(w * 0.3, 58, w * 0.4, 10);
      ctx.font = font(8, 900, false);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(num, w / 2, 63.5);
      ctx.fillStyle = 'rgba(200,215,235,0.8)';
      ctx.fillRect(w - 12, h * 0.42, 4, 26);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(w - 1.5, 0, 3, h);
      if (open) ctx.fillRect(0, 0, w, h);
    };

    // Armários do fundo (plano de frente: escala única)
    const s = cam.s(zb) / 100;
    const nL = 12;
    const lw = (hw * 2) / nL;
    const lockTop = 2.25;
    const opens = { 2: '10', 9: '7' };
    for (let i = 0; i < nL; i++) {
      const x0 = -hw + i * lw;
      const p = cam.P(x0, lockTop, zb);
      const num = String(1 + i).padStart(2, '0');
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.scale(s, s);
      const base = fog(i % 2 ? [42, 76, 128] : [46, 82, 136], zb * (0.9 + R() * 0.2));
      if (opens[i]) {
        // interior escuro com camisa pendurada e bolsa
        ctx.fillStyle = 'rgba(4,8,16,1)';
        ctx.fillRect(0, 0, lw * 100, (lockTop - 0.12) * 100);
        ctx.fillStyle = 'rgba(80,120,170,0.25)';
        ctx.fillRect(0, 28, lw * 100, 3);
        ctx.save();
        ctx.translate(lw * 50, 78);
        jersey(ctx, lw * 52, [16, 40, 78], [90, 210, 255], opens[i]);
        ctx.restore();
        ctx.fillStyle = 'rgba(30,40,60,1)';
        rrect(ctx, lw * 14, 160, lw * 72, 40, 8);
        ctx.fill();
        ctx.fillStyle = 'rgba(56,200,255,0.6)';
        ctx.fillRect(lw * 14, 172, lw * 72, 3);
      } else {
        lockerDoor(lw * 100, (lockTop - 0.12) * 100, base, num, false);
      }
      ctx.restore();
    }
    // portas abertas (giradas para a câmera)
    Object.keys(opens).forEach((k) => {
      const i = +k;
      // dobradiça do lado de fora (a porta não tampa o interior)
      const left = i < nL / 2;
      const xh = -hw + (left ? i : i + 1) * lw;
      const xe = xh + (left ? -0.14 : 0.14);
      quad3(ctx, cam, [[xh, 0.12, zb], [xh, lockTop, zb], [xe, lockTop, zb - 0.6], [xe, 0.12, zb - 0.6]], rgb(fog([30, 54, 92], zb - 0.3)));
      line3(ctx, cam, [xe, 0.12, zb - 0.6], [xe, lockTop, zb - 0.6], 'rgba(160,200,240,0.4)', Math.max(1, cam.s(zb) * 0.01));
    });
    // rodapé e faixa de cima com letreiro
    const pl = cam.P(-hw, 0.12, zb);
    ctx.fillStyle = rgb(fog([8, 12, 22], zb));
    ctx.fillRect(pl[0], pl[1], bw2[0] - pl[0], bw2[1] - pl[1]);
    const hb0 = cam.P(-hw, 2.75, zb);
    const hb1 = cam.P(hw, lockTop, zb);
    ctx.fillStyle = rgb(fog([10, 18, 34], zb));
    ctx.fillRect(hb0[0], hb0[1], hb1[0] - hb0[0], hb1[1] - hb0[1]);
    neon3(ctx, cam, [-hw, 2.78, zb], [hw, 2.78, zb], [0, 0.02, 0], CYAN, 0.9);
    ctx.save();
    const hc0 = cam.P(0, 2.5, zb);
    ctx.translate(hc0[0], hc0[1]);
    ctx.scale(s, s);
    ctx.font = font(24);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(200,236,255,0.92)';
    ctx.fillText('B L U E   L O C K', 0, 1);
    [-1, 1].forEach((d) => {
      ctx.save();
      ctx.translate(d * 200, 3);
      CE.bgblLock(ctx, 16, [80, 210, 255], 'neon', 0.9);
      ctx.restore();
      ctx.fillStyle = 'rgba(120,190,255,0.25)';
      for (let k = 0; k < 6; k++) ctx.fillRect(d * (240 + k * 22) - 6, -2, 12, 4);
    });
    ctx.restore();

    // Armários das paredes laterais (em perspectiva)
    [-1, 1].forEach((sd) => {
      const X = sd * hw;
      const n = 9;
      const z0 = zb - n * lw;
      for (let i = 0; i < n; i++) {
        const a = z0 + i * lw;
        const b = a + lw;
        const zc = (a + b) / 2;
        const base = fog(i % 2 ? [40, 72, 122] : [44, 78, 130], zc);
        quad3(ctx, cam, [[X, 0.12, a + 0.01], [X, lockTop, a + 0.01], [X, lockTop, b - 0.01], [X, 0.12, b - 0.01]], depthGrad(ctx, cam, [X, 1, a], [X, 1, b], (w, t) => rgb(mul(base, sd < 0 ? 1.05 - t * 0.25 : 0.8 + t * 0.25)), 2));
        ctx.save();
        onPlane(ctx, cam, [X, 1.6, zc], sd < 0 ? [0, 0, 1] : [0, 0, -1], [0, -1, 0]);
        const w = lw * 100;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let v = 0; v < 5; v++) ctx.fillRect(-w * 0.28, -51 + v * 7, w * 0.56, 3);
        ctx.fillStyle = 'rgba(220,235,255,0.6)';
        ctx.fillRect(-w * 0.2, -7, w * 0.4, 10);
        ctx.fillStyle = 'rgba(200,215,235,0.7)';
        ctx.fillRect(w * 0.32, 15, 4, 24);
        ctx.restore();
        line3(ctx, cam, [X, 0.12, a], [X, lockTop, a], 'rgba(0,0,0,0.55)', Math.max(1, cam.s(a) * 0.012));
      }
      quad3(ctx, cam, [[X, 0, z0], [X, 0.12, z0], [X, 0.12, zb], [X, 0, zb]], rgb(fog([8, 12, 22], zb - 2)));
      quad3(ctx, cam, [[X, lockTop, z0], [X, 2.75, z0], [X, 2.75, zb], [X, lockTop, zb]], rgb(fog([10, 18, 34], zb - 2)));
      neon3(ctx, cam, [X, 2.78, z0 - 1.5], [X, 2.78, zb], [0, 0.02, 0], CYAN, 0.85);
      // quadro tático na parte mais perto
      const tz0 = z0 - 2.6;
      const tz1 = z0 - 0.4;
      quad3(ctx, cam, [[X, 0.9, tz0], [X, 2.35, tz0], [X, 2.35, tz1], [X, 0.9, tz1]], rgb(fog([200, 214, 230], (tz0 + tz1) / 2)));
      ctx.save();
      onPlane(ctx, cam, [X, 1.62, (tz0 + tz1) / 2], sd < 0 ? [0, 0, 1] : [0, 0, -1], [0, -1, 0]);
      ctx.strokeStyle = 'rgba(30,60,120,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-95, -60, 190, 120);
      ctx.beginPath();
      ctx.moveTo(0, -60);
      ctx.lineTo(0, 60);
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(220,38,38,0.85)';
      [[-60, -30], [-40, 20], [-20, -10], [30, 35]].forEach(([x, y]) => ctx.fillRect(x - 4, y - 4, 8, 8));
      ctx.strokeStyle = 'rgba(29,78,216,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-60, -30);
      ctx.quadraticCurveTo(-10, -45, 40, -20);
      ctx.moveTo(-40, 20);
      ctx.lineTo(10, 10);
      ctx.stroke();
      ctx.restore();
    });

    // Piso encerado refletindo os armários
    const floorScr = floorPoly.map((p) => cam.P(p[0], p[1], p[2]));
    mirrorFloor(ctx, W, H, cam.P(0, 0, zb)[1], 0.22, floorScr, H * 0.35);
    // sombra dos bancos e dos armários no chão
    [-1, 1].forEach((sd) => {
      const xa = sd * (hw - 1.05);
      quad3(ctx, cam, [[sd * hw, 0.001, 5], [xa, 0.001, 5], [xa, 0.001, 9], [sd * hw, 0.001, 9]], 'rgba(2,6,14,0.45)');
    });
    // Luminárias lineares no teto
    const tubes = [-1.7, 1.7];
    tubes.forEach((x) => {
      box3(ctx, cam, x - 0.16, x + 0.16, hc - 0.1, hc, 0.6, zb - 0.6, [24, 34, 54], fog);
      quad3(ctx, cam, [[x - 0.11, hc - 0.105, 0.6], [x + 0.11, hc - 0.105, 0.6], [x + 0.11, hc - 0.105, zb - 0.6], [x - 0.11, hc - 0.105, zb - 0.6]], 'rgba(225,245,255,0.95)');
      for (let z = 2.5; z < zb; z += 1.5) {
        const p = cam.P(x, hc - 0.1, z);
        glowE(ctx, p[0], p[1], cam.s(z) * 0.9, cam.s(z) * 0.4, 'rgba(160,215,255,0.5)', 0.55);
      }
    });

    // Bancos com coisas em cima
    [-1, 1].forEach((sd) => {
      const xa = sd * (hw - 0.95);
      const xb = sd * (hw - 0.5);
      const x0 = Math.min(xa, xb);
      const x1 = Math.max(xa, xb);
      [5.2, 7.4].forEach((z) => {
        box3(ctx, cam, x0 + 0.04, x0 + 0.1, 0, 0.42, z + 0.2, z + 0.26, [20, 26, 40], fog);
        box3(ctx, cam, x0 + 0.04, x0 + 0.1, 0, 0.42, z + 1.6, z + 1.66, [20, 26, 40], fog);
      });
      box3(ctx, cam, x0, x1, 0.42, 0.5, 5, 9, [96, 70, 50], fog, { edge: 'rgba(255,220,180,0.25)' });
    });
    // bolsa, garrafa, toalha e bola
    const bag = (x, z, col) => {
      box3(ctx, cam, x - 0.22, x + 0.22, 0.5, 0.78, z - 0.14, z + 0.14, col, fog, { edge: 'rgba(120,200,255,0.4)' });
    };
    bag(-3.28, 6.2, [24, 40, 72]);
    bag(3.3, 7.9, [30, 30, 40]);
    box3(ctx, cam, 3.18, 3.26, 0.5, 0.76, 5.6, 5.68, [60, 160, 230], fog);
    box3(ctx, cam, -3.5, -3.05, 0.5, 0.54, 7.7, 8.2, [220, 228, 238], fog);
    const bz = 6.4;
    const bp = cam.P(-3.4, 0.11, bz);
    const br = cam.s(bz) * 0.11;
    ctx.fillStyle = rgb(fog([226, 232, 240], bz));
    ctx.beginPath();
    ctx.arc(bp[0], bp[1], br, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(fog([20, 28, 44], bz));
    [[0, 0], [-0.55, -0.45], [0.55, -0.45], [0.6, 0.5], [-0.6, 0.5]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(bp[0] + dx * br, bp[1] + dy * br, br * 0.24, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(bp[0] + br * 0.25, bp[1] + br * 0.2, br, -0.3, 1.9);
    ctx.fill();

    // Piso: juntas e reflexos
    ctx.save();
    poly(ctx, floorPoly.map((p) => cam.P(p[0], p[1], p[2])));
    ctx.clip();
    for (let z = 1; z < zb; z += 0.8) line3(ctx, cam, [-hw, 0, z], [hw, 0, z], 'rgba(2,6,14,0.5)', 1);
    for (let x = -hw; x <= hw; x += 0.8) line3(ctx, cam, [x, 0, zn], [x, 0, zb], 'rgba(2,6,14,0.5)', 1);
    tubes.forEach((x) => {
      for (let z = 2.5; z < zb; z += 1.5) {
        const p = cam.P(x, -hc, z);
        glowE(ctx, p[0], p[1], cam.s(z) * 0.3, cam.s(z) * 0.9, 'rgba(150,210,255,0.35)', 0.5);
      }
    });
    // poças de luz das luminárias
    tubes.forEach((x) => {
      [3.5, 5.5, 7.5].forEach((z) => {
        const p = cam.P(x * 0.8, 0, z);
        glowE(ctx, p[0], p[1], cam.s(z) * 1.3, cam.s(z) * 1.3 * (cam.eye / z), 'rgba(120,180,255,0.3)', 0.5);
      });
    });
    ctx.restore();

    // ar: feixes das luminárias
    tubes.forEach((x) => {
      const p = cam.P(x, hc - 0.1, 3.5);
      CE.cineShafts(ctx, p[0], p[1], Math.PI / 2, cam.s(3.5) * 1.8, 0.7, 4, '160,210,255', 0.04, 0);
    });
    CE.bgblFinish(ctx, W, H, { seed: 23, dust: 36 });
  };

  // =========================================================================
  // QUARTO DO TIME Z (dormitório)
  // =========================================================================
  VN.bluelock_room = function (ctx, W, H) {
    const cam = CE.bgblCam(W, H, { cy: 0.35 });
    const R = CE.bgblRng(5);
    const hw = 4.3;
    const hc = 3.0;
    const zb = 9.6;
    const zn = 0.3;
    const fog = makeFog([70, 100, 142], 26);
    ctx.fillStyle = '#0a1220';
    ctx.fillRect(0, 0, W, H);

    quad3(ctx, cam, [[-hw, hc, zn], [hw, hc, zn], [hw, hc, zb], [-hw, hc, zb]], depthGrad(ctx, cam, [0, hc, zn], [0, hc, zb], (w) => rgb(fog([40, 54, 78], w[2]))));
    [-1, 1].forEach((sd) => {
      quad3(ctx, cam, [[sd * hw, 0, zn], [sd * hw, hc, zn], [sd * hw, hc, zb], [sd * hw, 0, zb]], depthGrad(ctx, cam, [sd * hw, 1.5, zn], [sd * hw, 1.5, zb], (w) => rgb(fog([70, 88, 116], w[2]))));
      // painéis
      for (let z = 1; z < zb; z += 1.2) line3(ctx, cam, [sd * hw, 0, z], [sd * hw, hc, z], 'rgba(20,30,50,0.35)', Math.max(1, cam.s(z) * 0.008));
      [0.9, 2.3].forEach((y) => line3(ctx, cam, [sd * hw, y, zn], [sd * hw, y, zb], 'rgba(20,30,50,0.3)', 1));
    });
    const b0 = cam.P(-hw, hc, zb);
    const b1 = cam.P(hw, 0, zb);
    const bgr = ctx.createLinearGradient(0, b0[1], 0, b1[1]);
    bgr.addColorStop(0, rgb(fog([96, 116, 148], zb)));
    bgr.addColorStop(1, rgb(fog([62, 78, 106], zb)));
    ctx.fillStyle = bgr;
    ctx.fillRect(b0[0], b0[1], b1[0] - b0[0], b1[1] - b0[1]);
    const floorPoly = [[-hw, 0, zn], [hw, 0, zn], [hw, 0, zb], [-hw, 0, zb]];
    quad3(ctx, cam, floorPoly, depthGrad(ctx, cam, [0, 0, zn], [0, 0, zb], (w) => rgb(fog([44, 56, 78], w[2]))));

    const s = cam.s(zb) / 100;
    // Painéis da parede do fundo
    ctx.save();
    ctx.strokeStyle = 'rgba(30,44,70,0.35)';
    ctx.lineWidth = 1;
    for (let x = -hw; x < hw; x += 1.2) {
      const p = cam.P(x, hc, zb);
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[0], b1[1]);
      ctx.stroke();
    }
    ctx.restore();
    // "Z" gigante na parede (pintado, com contorno de neon)
    ctx.save();
    const zp = cam.P(-2.35, 1.55, zb);
    ctx.translate(zp[0], zp[1]);
    ctx.scale(s, s);
    ctx.font = font(250);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(22,52,120,0.55)';
    ctx.fillText('Z', 0, 10);
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(96,200,255,0.75)';
    ctx.strokeText('Z', 0, 10);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(56,170,255,0.12)';
    ctx.strokeText('Z', 0, 10);
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = font(18);
    ctx.fillStyle = 'rgba(30,58,110,0.75)';
    ctx.fillText('TEAM Z', 0, 118);
    ctx.restore();

    // Porta do quarto no centro (atrás da cabeça: simples e escura)
    const d0 = cam.P(-0.6, 2.15, zb);
    const d1 = cam.P(0.6, 0, zb);
    ctx.fillStyle = rgb(fog([36, 48, 70], zb));
    ctx.fillRect(d0[0], d0[1], d1[0] - d0[0], d1[1] - d0[1]);
    ctx.fillStyle = 'rgba(10,16,30,0.6)';
    ctx.fillRect((d0[0] + d1[0]) / 2 - 1, d0[1], 2, d1[1] - d0[1]);
    neon3(ctx, cam, [-0.62, 2.18, zb], [0.62, 2.18, zb], [0, 0.015, 0], CYAN, 0.7);

    // Telão do ranking
    const mx0 = 0.95;
    const mx1 = 3.85;
    const my0 = 1.05;
    const my1 = 2.6;
    const m0 = cam.P(mx0, my1, zb);
    const m1 = cam.P(mx1, my0, zb);
    glow(ctx, (m0[0] + m1[0]) / 2, (m0[1] + m1[1]) / 2, (m1[0] - m0[0]) * 0.9, 'rgba(56,190,255,0.35)', 0.8);
    ctx.save();
    ctx.translate(m0[0], m0[1]);
    ctx.scale(s, s);
    const mw = (mx1 - mx0) * 100;
    const mh = (my1 - my0) * 100;
    ctx.fillStyle = '#0a1022';
    ctx.fillRect(-6, -6, mw + 12, mh + 12);
    const sg = ctx.createLinearGradient(0, 0, 0, mh);
    sg.addColorStop(0, '#0c2550');
    sg.addColorStop(1, '#06132c');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, mw, mh);
    ctx.fillStyle = 'rgba(56,200,255,0.9)';
    ctx.fillRect(0, 0, mw, 26);
    ctx.font = font(15);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#04111f';
    ctx.fillText('BLUE LOCK RANKING', 12, 13);
    ctx.textAlign = 'right';
    ctx.font = font(11, 800);
    ctx.fillText('TEAM Z', mw - 10, 13);
    const rows = [['298', 'KUNIGAMI', '#facc15'], ['299', 'VOCÊ', '#00f5d4'], ['300', 'IGARASHI', '#94a3b8']];
    rows.forEach(([n, name, c], i) => {
      const y = 46 + i * 36;
      const me = name === 'VOCÊ';
      ctx.fillStyle = me ? 'rgba(0,245,212,0.18)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(8, y - 14, mw - 16, 28);
      if (me) {
        ctx.fillStyle = '#00f5d4';
        ctx.fillRect(8, y - 14, 4, 28);
      }
      ctx.fillStyle = c;
      ctx.fillRect(22, y - 9, 18, 18);
      ctx.font = font(18);
      ctx.textAlign = 'left';
      ctx.fillStyle = me ? '#00f5d4' : '#e2e8f0';
      ctx.fillText(n, 50, y + 1);
      ctx.fillText(name, 100, y + 1);
      ctx.fillStyle = 'rgba(148,163,184,0.5)';
      ctx.fillRect(mw - 70, y - 2, 52 * (0.3 + ((2 - i) * 0.2)), 4);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < mh; y += 4) ctx.fillRect(0, y, mw, 1.5);
    ctx.restore();

    // Câmera de vigilância no canto e caixa de som
    [[-hw + 0.25, 1], [hw - 0.25, -1]].forEach(([x, d], i) => {
      const p = cam.P(x, hc - 0.25, zb - 0.2);
      const k = cam.s(zb) / 100;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p[0] - 14 * k, p[1] - 8 * k, 28 * k, 16 * k);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(p[0] + d * 10 * k - 4 * k, p[1] - 3 * k, 8 * k, 8 * k);
      if (i === 0) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(p[0] - 10 * k, p[1] - 5 * k, 3 * k, 3 * k);
        glow(ctx, p[0] - 9 * k, p[1] - 4 * k, 9 * k, 'rgba(255,60,80,0.7)', 0.8);
      }
    });
    // Piso encerado refletindo a parede do fundo + sombras das camas
    const floorScr = floorPoly.map((p) => cam.P(p[0], p[1], p[2]));
    mirrorFloor(ctx, W, H, cam.P(0, 0, zb)[1], 0.3, floorScr, H * 0.3);
    [-1, 1].forEach((sd) => {
      const xi = sd * (hw - 1.15);
      quad3(ctx, cam, [[sd * hw, 0.001, 2.5], [xi, 0.001, 2.5], [xi, 0.001, zb], [sd * hw, 0.001, zb]], 'rgba(10,16,30,0.4)');
      // sombra na parede atrás das camas
      quad3(ctx, cam, [[sd * hw, 0, 2.5], [sd * hw, 2.0, 2.5], [sd * hw, 2.0, zb], [sd * hw, 0, zb]], depthGrad(ctx, cam, [sd * hw, 2.1, 5], [sd * hw, 0, 5], (w) => `rgba(10,16,30,${0.45 * (1 - w[1] / 2.1)})`, 4));
    });
    // poças de luz no chão
    for (let z = 2; z < zb; z += 2.4) {
      [-1.7, 0, 1.7].forEach((x) => {
        const p = cam.P(x, 0, z);
        glowE(ctx, p[0], p[1], cam.s(z) * 1.0, cam.s(z) * 1.0 * (cam.eye / z), 'rgba(180,215,255,0.35)', 0.45);
      });
    }

    // Beliches ao longo das paredes laterais (caixas 3D ordenadas por distância)
    const parts = [];
    const pushBox = (x0, x1, y0, y1, z0, z1, col, o) => {
      const d = Math.hypot((x0 + x1) / 2, ((y0 + y1) / 2 - cam.eye) * 0.3, (z0 + z1) / 2);
      parts.push({ d, f: () => box3(ctx, cam, x0, x1, y0, y1, z0, z1, col, fog, o) });
    };
    const blankets = [[34, 72, 150], [226, 232, 240], [30, 58, 120], [200, 210, 225]];
    [-1, 1].forEach((sd) => {
      const xw = sd * hw;
      const xi = sd * (hw - 1.0);
      const x0 = Math.min(xw, xi);
      const x1 = Math.max(xw, xi);
      [[2.7, 4.7], [5.0, 7.0], [7.3, 9.3]].forEach(([z0, z1], bi) => {
        const frame = [26, 40, 66];
        // pés
        [z0, z1 - 0.07].forEach((z) => [x0 + 0.02, x1 - 0.09].forEach((x) => pushBox(x, x + 0.07, 0, 2.15, z, z + 0.07, frame)));
        [[0.32, 0.42], [1.48, 1.58]].forEach(([y0, y1], lv) => {
          pushBox(x0 + 0.02, x1 - 0.02, y0, y1, z0, z1, frame, { edge: 'rgba(120,180,255,0.35)' });
          const bl = blankets[(bi * 2 + lv + (sd > 0 ? 1 : 0)) % blankets.length];
          pushBox(x0 + 0.06, x1 - 0.06, y1, y1 + 0.14, z0 + 0.05, z1 - 0.05, [196, 206, 222], {});
          // cobertor (cai pelo lado aberto) e travesseiro perto da parede do fundo
          const xo0 = sd < 0 ? x0 + 0.04 : x0 - 0.03;
          const xo1 = sd < 0 ? x1 + 0.03 : x1 - 0.04;
          pushBox(xo0, xo1, y1 + 0.02, y1 + 0.2, z0 + 0.05, z1 - 0.55 - R() * 0.3, bl, { edge: 'rgba(255,255,255,0.3)' });
          pushBox(x0 + 0.15, x1 - 0.15, y1 + 0.14, y1 + 0.27, z1 - 0.48, z1 - 0.12, [240, 244, 250], {});
        });
        // grade de proteção da cama de cima
        const xr = sd < 0 ? x1 - 0.06 : x0 + 0.02;
        pushBox(xr, xr + 0.04, 1.86, 1.92, z0 + 0.6, z1, frame);
        // toalha pendurada na grade / tênis no chão
        if ((bi + (sd > 0 ? 1 : 0)) % 2 === 0) pushBox(xr - 0.01, xr + 0.05, 1.4, 1.93, z0 + 1.0, z0 + 1.45, sd < 0 ? [56, 189, 248] : [240, 244, 250]);
        const xs = sd < 0 ? x1 + 0.1 : x0 - 0.4;
        if (bi !== 0) {
          pushBox(xs, xs + 0.3, 0, 0.1, z0 + 0.8, z0 + 0.92, [240, 244, 250], {});
          pushBox(xs + 0.02, xs + 0.32, 0, 0.1, z0 + 0.98, z0 + 1.1, [240, 244, 250], {});
        }
        // escada na ponta perto da câmera
        const xl = sd < 0 ? x1 - 0.04 : x0;
        [z0 + 0.1, z0 + 0.42].forEach((z) => pushBox(xl, xl + 0.04, 0, 1.95, z, z + 0.04, [70, 96, 140]));
        [0.65, 1.0, 1.3].forEach((y) => pushBox(xl, xl + 0.04, y, y + 0.04, z0 + 0.1, z0 + 0.46, [70, 96, 140]));
      });
    });
    parts.sort((a, b) => b.d - a.d).forEach((p) => p.f());

    // Bola e garrafa no chão
    const bz = 6.2;
    const bp = cam.P(-2.75, 0.11, bz);
    const br = cam.s(bz) * 0.11;
    ctx.fillStyle = rgb(fog([236, 240, 246], bz));
    ctx.beginPath();
    ctx.arc(bp[0], bp[1], br, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(fog([22, 30, 48], bz));
    [[0, 0], [-0.55, -0.45], [0.55, -0.45], [0.6, 0.5], [-0.6, 0.5]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(bp[0] + dx * br, bp[1] + dy * br, br * 0.24, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(bp[0] + br * 0.25, bp[1] + br * 0.2, br, -0.3, 1.9);
    ctx.fill();

    // Painéis de luz do teto (grade)
    const lightsP = [];
    for (let z = 2; z < zb; z += 2.4) {
      [-1.7, 0, 1.7].forEach((x) => {
        quad3(ctx, cam, [[x - 0.5, hc - 0.01, z - 0.45], [x + 0.5, hc - 0.01, z - 0.45], [x + 0.5, hc - 0.01, z + 0.45], [x - 0.5, hc - 0.01, z + 0.45]], rgb(fog([225, 240, 255], z * 0.3)));
        const p = cam.P(x, hc - 0.02, z);
        glowE(ctx, p[0], p[1], cam.s(z) * 0.85, cam.s(z) * 0.35, 'rgba(190,225,255,0.5)', 0.6);
        lightsP.push([x, z]);
      });
    }
    // neon de canto no teto
    [-1, 1].forEach((sd) => neon3(ctx, cam, [sd * (hw - 0.02), hc - 0.03, zn], [sd * (hw - 0.02), hc - 0.03, zb], [0, 0.02, 0], CYAN, 0.7));
    neon3(ctx, cam, [-hw, hc - 0.03, zb], [hw, hc - 0.03, zb], [0, 0.02, 0], CYAN, 0.7);

    // Piso: juntas e reflexos
    ctx.save();
    poly(ctx, floorPoly.map((p) => cam.P(p[0], p[1], p[2])));
    ctx.clip();
    for (let z = 1; z < zb; z += 0.9) line3(ctx, cam, [-hw, 0, z], [hw, 0, z], 'rgba(20,28,46,0.45)', 1);
    for (let x = -hw; x <= hw; x += 0.9) line3(ctx, cam, [x, 0, zn], [x, 0, zb], 'rgba(20,28,46,0.45)', 1);
    lightsP.forEach(([x, z]) => {
      const p = cam.P(x, -hc, z);
      glowE(ctx, p[0], p[1], cam.s(z) * 0.35, cam.s(z) * 0.8, 'rgba(200,230,255,0.4)', 0.4);
    });
    const mr = cam.P((mx0 + mx1) / 2, -(my0 + my1) / 2, zb);
    glowE(ctx, mr[0], mr[1], (m1[0] - m0[0]) * 0.45, cam.s(zb) * 1.1, 'rgba(56,190,255,0.45)', 0.5);
    ctx.restore();

    // Luz fria entrando de cima
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    g.addColorStop(0, 'rgba(160,210,255,0.10)');
    g.addColorStop(1, 'rgba(160,210,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.5);
    CE.bgblFinish(ctx, W, H, { seed: 17, dust: 30, vig: 0.58, shade: 0.24 });
  };

  // =========================================================================
  // SALA DE MONITORES DO EGO
  // =========================================================================
  const monitorContent = (ctx, w, h, type, R) => {
    // fundo da tela
    const base = { pitch: [10, 60, 40], alert: [60, 10, 18] }[type] || [6, 22, 48];
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, rgb(mul(base, 1.4)));
    g.addColorStop(1, rgb(base));
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    const C = type === 'alert' ? 'rgba(255,90,110,0.9)' : 'rgba(90,220,255,0.85)';
    const C2 = type === 'alert' ? 'rgba(255,90,110,0.35)' : 'rgba(90,220,255,0.3)';
    ctx.lineWidth = 1.5;
    if (type === 'pitch') {
      ctx.strokeStyle = 'rgba(220,255,230,0.6)';
      ctx.strokeRect(-w * 0.42, -h * 0.38, w * 0.84, h * 0.76);
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.38);
      ctx.lineTo(0, h * 0.38);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(-w * 0.42, -h * 0.16, w * 0.1, h * 0.32);
      ctx.strokeRect(w * 0.32, -h * 0.16, w * 0.1, h * 0.32);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i < 5 ? 'rgba(80,200,255,0.95)' : 'rgba(255,255,255,0.9)';
        ctx.fillRect(-w * 0.38 + R() * w * 0.76 - 2, -h * 0.32 + R() * h * 0.64 - 2, 4, 4);
      }
    } else if (type === 'data') {
      ctx.fillStyle = C;
      ctx.fillRect(-w * 0.44, -h * 0.38, w * 0.4, 6);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = C2;
        ctx.fillRect(-w * 0.44, -h * 0.22 + i * h * 0.1, w * (0.2 + R() * 0.6), 3);
      }
      ctx.strokeStyle = C;
      ctx.strokeRect(w * 0.14, -h * 0.36, w * 0.3, w * 0.3);
    } else if (type === 'graph') {
      ctx.strokeStyle = C2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-w * 0.44, -h * 0.3 + i * h * 0.2);
        ctx.lineTo(w * 0.44, -h * 0.3 + i * h * 0.2);
        ctx.stroke();
      }
      ctx.strokeStyle = C;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const x = -w * 0.44 + (i / 20) * w * 0.88;
        const y = h * 0.25 - (i / 20) * h * 0.3 - R() * h * 0.25 + (i === 12 ? -h * 0.2 : 0);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    } else if (type === 'radar') {
      ctx.strokeStyle = C2;
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(a) * h * 0.13 * r;
          const y = Math.sin(a) * h * 0.13 * r;
          if (k) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = C2;
      ctx.strokeStyle = C;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
        const rr = h * 0.39 * (0.35 + R() * 0.65);
        if (k) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === 'player') {
      // silhueta de jogador analisado
      ctx.fillStyle = 'rgba(90,220,255,0.35)';
      ctx.beginPath();
      ctx.arc(-w * 0.22, -h * 0.12, h * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-w * 0.22, h * 0.3, h * 0.26, h * 0.22, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = C;
      ctx.strokeRect(-w * 0.42, -h * 0.4, w * 0.4, h * 0.8);
      ctx.fillStyle = C;
      ctx.fillRect(w * 0.04, -h * 0.3, w * 0.36, 5);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = C2;
        ctx.fillRect(w * 0.04, -h * 0.12 + i * h * 0.12, w * (0.12 + R() * 0.24), 4);
      }
    } else if (type === 'rank') {
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = i === 2 ? C : C2;
        ctx.fillRect(-w * 0.44, -h * 0.4 + i * h * 0.115, w * 0.1, h * 0.07);
        ctx.fillRect(-w * 0.3, -h * 0.4 + i * h * 0.115, w * (0.3 + R() * 0.4), h * 0.07);
      }
    } else if (type === 'alert') {
      ctx.strokeStyle = C;
      ctx.lineWidth = 3;
      ctx.strokeRect(-w * 0.4, -h * 0.34, w * 0.8, h * 0.68);
      let fs = h * 0.24;
      ctx.font = font(fs);
      while (fs > 6 && ctx.measureText('ELIMINADO').width > w * 0.7) {
        fs -= 1;
        ctx.font = font(fs);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C;
      ctx.fillText('ELIMINADO', 0, 0);
    } else {
      // estática
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(150,200,255,${0.1 + R() * 0.25})`;
        ctx.fillRect(-w / 2 + R() * w, -h / 2 + R() * h, 3 + R() * 10, 2);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = -h / 2; y < h / 2; y += 4) ctx.fillRect(-w / 2, y, w, 1.5);
  };

  VN.monitor_room = function (ctx, W, H) {
    const cam = CE.bgblCam(W, H, { cy: 0.36 });
    const R = CE.bgblRng(909);
    const fog = makeFog([14, 30, 60], 16);
    ctx.fillStyle = '#01030a';
    ctx.fillRect(0, 0, W, H);
    // Escuro do fundo com um halo azul atrás da parede de telas
    const hz = cam.P(0, 2.4, 6.3);
    glow(ctx, hz[0], hz[1], W * 0.75, 'rgba(30,90,190,0.5)', 0.7);

    const Rm = 6.3;
    const dth = 0.17;
    const halfFov = Math.atan((W / 2) / cam.f) + 0.25;
    const rows = [[0.92, 1.62], [1.7, 2.4], [2.48, 3.18], [3.26, 3.96]];
    const types = ['pitch', 'data', 'graph', 'radar', 'player', 'rank', 'data', 'pitch', 'static', 'graph'];
    const at = (th, y, r = Rm) => [r * Math.sin(th), y, r * Math.cos(th)];
    const nCol = Math.ceil(halfFov / dth);
    const glows = [];

    // Estantes/racks embaixo das telas (com LEDs)
    for (let c = -nCol; c <= nCol; c++) {
      const a = c * dth - dth / 2;
      const b = a + dth;
      const zc = Rm * Math.cos(c * dth);
      quad3(ctx, cam, [at(a, 0), at(b, 0), at(b, 0.86), at(a, 0.86)], rgb(fog([12, 18, 30], zc)));
      for (let k = 0; k < 6; k++) {
        const p = cam.P(...at(a + dth * (0.15 + R() * 0.7), 0.12 + R() * 0.65));
        const col = R() < 0.75 ? 'rgba(60,220,255,0.9)' : R() < 0.5 ? 'rgba(80,255,150,0.9)' : 'rgba(255,80,90,0.9)';
        ctx.fillStyle = col;
        const sz = Math.max(1.2, cam.s(zc) * 0.012);
        ctx.fillRect(p[0], p[1], sz * 1.6, sz);
      }
    }
    // Parede de telas curva
    for (let c = -nCol; c <= nCol; c++) {
      for (let r = 0; r < rows.length; r++) {
        const big = Math.abs(c) <= 1 && (r === 1 || r === 2);
        if (big && !(c === 0 && r === 1)) continue;
        let a = c * dth - dth / 2 + 0.006;
        let b = a + dth - 0.012;
        let [y0, y1] = rows[r];
        if (big) {
          a = -1.5 * dth + 0.006;
          b = 1.5 * dth - 0.006;
          y0 = rows[1][0];
          y1 = rows[2][1];
        }
        const thc = (a + b) / 2;
        const zc = Rm * Math.cos(thc);
        // moldura
        quad3(ctx, cam, [at(a, y0), at(b, y0), at(b, y1), at(a, y1)], rgb(fog([6, 9, 16], zc)));
        const ia = a + 0.008;
        const ib = b - 0.008;
        const q = [at(ia, y0 + 0.05), at(ib, y0 + 0.05), at(ib, y1 - 0.05), at(ia, y1 - 0.05)];
        const A = at(ia, (y0 + y1) / 2);
        const B = at(ib, (y0 + y1) / 2);
        const cw = Math.hypot(B[0] - A[0], B[2] - A[2]);
        const u = [(B[0] - A[0]) / cw, 0, (B[2] - A[2]) / cw];
        const ch = y1 - y0 - 0.1;
        const center = at(thc, (y0 + y1) / 2, Rm * Math.cos((b - a) / 2));
        ctx.save();
        poly(ctx, q.map((p) => cam.P(p[0], p[1], p[2])));
        ctx.clip();
        onPlane(ctx, cam, center, u, [0, -1, 0]);
        const lw = cw * 100;
        const lh = ch * 100;
        if (big) {
          // telão central: o cadeado do Blue Lock (escurecido, fica atrás da cabeça)
          const g = ctx.createRadialGradient(0, 0, 10, 0, 0, lw * 0.6);
          g.addColorStop(0, '#0b2a5c');
          g.addColorStop(1, '#030a1c');
          ctx.fillStyle = g;
          ctx.fillRect(-lw / 2, -lh / 2, lw, lh);
          ctx.strokeStyle = 'rgba(90,200,255,0.12)';
          ctx.lineWidth = 1;
          for (let x = -lw / 2; x < lw / 2; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, -lh / 2);
            ctx.lineTo(x, lh / 2);
            ctx.stroke();
          }
          for (let y = -lh / 2; y < lh / 2; y += 20) {
            ctx.beginPath();
            ctx.moveTo(-lw / 2, y);
            ctx.lineTo(lw / 2, y);
            ctx.stroke();
          }
          ctx.save();
          ctx.translate(0, -lh * 0.12);
          CE.bgblLock(ctx, lh * 0.32, [70, 190, 255], 'neon', 0.85);
          ctx.restore();
          ctx.font = font(lh * 0.1);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(190,235,255,0.85)';
          ctx.fillText('B L U E   L O C K', 0, lh * 0.25);
          ctx.font = font(lh * 0.045, 700, false);
          ctx.fillStyle = 'rgba(125,211,252,0.6)';
          ctx.fillText('PROJETO DE FORMAÇÃO DO MAIOR EGOÍSTA DO MUNDO', 0, lh * 0.35);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          for (let y = -lh / 2; y < lh / 2; y += 4) ctx.fillRect(-lw / 2, y, lw, 1.5);
        } else {
          const type = r === 0 && Math.abs(c) <= 1 ? 'static' : (c === 3 && r === 2) || (c === -4 && r === 0) ? 'alert' : types[Math.floor(R() * types.length)];
          monitorContent(ctx, lw, lh, type, R);
        }
        ctx.restore();
        // reflexo de vidro
        ctx.save();
        poly(ctx, q.map((p) => cam.P(p[0], p[1], p[2])));
        ctx.clip();
        const p0 = cam.P(...q[3]);
        const p2 = cam.P(...q[1]);
        const gl = ctx.createLinearGradient(p0[0], p0[1], p2[0], p2[1]);
        gl.addColorStop(0, 'rgba(255,255,255,0.10)');
        gl.addColorStop(0.35, 'rgba(255,255,255,0)');
        ctx.fillStyle = gl;
        ctx.fillRect(Math.min(p0[0], p2[0]), Math.min(p0[1], p2[1]), Math.abs(p2[0] - p0[0]), Math.abs(p2[1] - p0[1]));
        ctx.restore();
        const pc = cam.P(...center);
        glows.push([pc[0], pc[1], cam.s(zc) * (big ? 1.4 : 0.6), zc]);
      }
    }
    // brilho das telas
    glows.forEach(([x, y, r]) => glow(ctx, x, y, r, 'rgba(60,170,255,0.28)', 0.55));
    // Cabos pendurados do teto
    ctx.strokeStyle = 'rgba(4,8,16,0.9)';
    for (let i = 0; i < 9; i++) {
      const th = (i - 4) * dth * 1.9 + 0.05;
      const p = cam.P(...at(th, 4.2, Rm - 0.3));
      const q = cam.P(...at(th + 0.03, 3.96, Rm - 0.3));
      ctx.lineWidth = Math.max(1, cam.s(Rm) * 0.025);
      ctx.beginPath();
      ctx.moveTo(p[0], -10);
      ctx.quadraticCurveTo(p[0] + 10, (p[1] + q[1]) / 2, q[0], q[1]);
      ctx.stroke();
    }

    // Piso brilhante (reflexo das telas) entre a mesa e a parede
    const fy = cam.P(0, 0, Rm)[1];
    const fl = ctx.createLinearGradient(0, fy, 0, H);
    fl.addColorStop(0, 'rgba(20,50,100,0.55)');
    fl.addColorStop(1, 'rgba(2,6,14,1)');
    ctx.fillStyle = fl;
    ctx.fillRect(0, fy, W, H - fy);
    glows.forEach(([x, y, r, zc]) => {
      const yy = fy + (fy - y) * 0.35;
      glowE(ctx, x, yy, r * 0.5, r * 0.25, 'rgba(60,170,255,0.3)', 0.4);
    });

    // Mesa de controle curva (primeiro plano)
    const Rd0 = 2.35;
    const Rd1 = 3.0;
    const dy = 0.92;
    const seg = 0.08;
    const tmax = Math.atan((W / 2) / cam.f) + 0.7;
    for (let th = -tmax; th < tmax; th += seg) {
      const a = th;
      const b = th + seg + 0.002;
      const zc = Rd0 * Math.cos(th);
      quad3(ctx, cam, [at(a, 0, Rd0), at(b, 0, Rd0), at(b, dy, Rd0), at(a, dy, Rd0)], rgb(fog([10, 14, 24], zc)));
      quad3(ctx, cam, [at(a, dy, Rd0), at(b, dy, Rd0), at(b, dy, Rd1), at(a, dy, Rd1)], depthGrad(ctx, cam, at((a + b) / 2, dy, Rd0), at((a + b) / 2, dy, Rd1), (w, t) => rgb(fog(mix([22, 32, 52], [14, 22, 38], t), zc)), 2));
    }
    // borda iluminada (segmentos para seguir a curva)
    for (let th = -tmax; th < tmax; th += seg) neon3(ctx, cam, at(th, dy + 0.005, Rd0), at(th + seg, dy + 0.005, Rd0), [0, 0.008, 0], CYAN, 0.7);
    // teclados, botões e telinhas na mesa
    for (let th = -tmax + 0.1; th < tmax - 0.1; th += 0.26) {
      const zc = Rd0 * Math.cos(th);
      ctx.save();
      onPlane(ctx, cam, at(th, dy + 0.003, (Rd0 + Rd1) / 2), [Math.cos(th), 0, -Math.sin(th)], [-Math.sin(th), 0, -Math.cos(th)]);
      ctx.fillStyle = 'rgba(4,8,16,0.95)';
      ctx.fillRect(-26, -4, 52, 22);
      for (let k = 0; k < 10; k++) {
        ctx.fillStyle = R() < 0.6 ? 'rgba(80,200,255,0.8)' : R() < 0.5 ? 'rgba(250,204,21,0.85)' : 'rgba(255,80,100,0.85)';
        ctx.fillRect(-24 + (k % 5) * 10, -2 + Math.floor(k / 5) * 10, 5, 4);
      }
      ctx.fillStyle = 'rgba(90,220,255,0.35)';
      ctx.fillRect(-20, -26, 40, 16);
      ctx.restore();
      const p = cam.P(...at(th, dy + 0.1, Rd0 + 0.2));
      glow(ctx, p[0], p[1], cam.s(zc) * 0.25, 'rgba(70,200,255,0.4)', 0.5);
    }
    // o copo de lámen do Ego, à direita
    const nz = 2.25;
    const np = cam.P(0.95, dy + 0.11, nz + 0.25);
    const ns = cam.s(nz + 0.25);
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(np[0] - ns * 0.06, np[1] - ns * 0.1);
    ctx.lineTo(np[0] + ns * 0.06, np[1] - ns * 0.1);
    ctx.lineTo(np[0] + ns * 0.045, np[1] + ns * 0.1);
    ctx.lineTo(np[0] - ns * 0.045, np[1] + ns * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(np[0] - ns * 0.055, np[1] - ns * 0.04, ns * 0.11, ns * 0.04);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(np[0], np[1] - ns * 0.1, ns * 0.06, ns * 0.2);

    // Névoa azul na altura das telas + feixe das luzes do teto
    const hzG = ctx.createLinearGradient(0, cam.P(0, 4, Rm)[1], 0, cam.P(0, 0.8, Rm)[1]);
    hzG.addColorStop(0, 'rgba(40,110,210,0)');
    hzG.addColorStop(0.5, 'rgba(40,110,210,0.08)');
    hzG.addColorStop(1, 'rgba(40,110,210,0)');
    ctx.fillStyle = hzG;
    ctx.fillRect(0, 0, W, H);
    [-0.5, 0.5].forEach((th) => {
      const p = cam.P(...at(th, 4.4, 4.5));
      CE.cineShafts(ctx, p[0], p[1], Math.PI / 2, H * 0.8, 0.4, 3, '120,180,255', 0.035, 0);
    });
    CE.bgblFinish(ctx, W, H, { seed: 41, dust: 40, vig: 0.7, shade: 0.3, dustColor: 'rgba(120,190,255,0.3)' });
  };

  // =========================================================================
  // AUDITÓRIO (Ego falando para os 300 atacantes / coletiva)
  // =========================================================================
  VN.auditorium = function (ctx, W, H) {
    const cam = CE.bgblCam(W, H, { cy: 0.3, eye: 5.2, fov: 0.92 });
    const R = CE.bgblRng(300);
    const fog = makeFog([20, 44, 90], 30);
    const hw = 13;
    const hc = 13;
    const zs = 21; // frente do palco
    const zb = 25.5;
    ctx.fillStyle = '#01030a';
    ctx.fillRect(0, 0, W, H);

    // Paredes laterais com fendas de luz verticais
    [-1, 1].forEach((sd) => {
      const X = sd * hw;
      quad3(ctx, cam, [[X, -2, 0.5], [X, hc, 0.5], [X, hc, zb], [X, -2, zb]], depthGrad(ctx, cam, [X, 5, 0.5], [X, 5, zb], (w) => rgb(fog([10, 16, 30], w[2]))));
      for (let z = 3; z < zb - 1; z += 2.6) {
        neon3(ctx, cam, [X, 1.5, z], [X, 10, z], [0, 0, 0.05], [50, 140, 255], 0.55);
        const p = cam.P(X, 6, z);
        glowE(ctx, p[0], p[1], cam.s(z) * 0.9, cam.s(z) * 3.5, 'rgba(40,120,255,0.25)', 0.5);
      }
    });
    // Teto escuro e treliça de luz
    quad3(ctx, cam, [[-hw, hc, 0.5], [hw, hc, 0.5], [hw, hc, zb], [-hw, hc, zb]], rgb([3, 6, 14]));
    // Parede do fundo
    const b0 = cam.P(-hw, hc, zb);
    const b1 = cam.P(hw, 0, zb);
    ctx.fillStyle = rgb(fog([8, 14, 28], zb));
    ctx.fillRect(b0[0], b0[1], b1[0] - b0[0], b1[1] - b0[1]);

    // Telão gigante
    const sx0 = -7.6;
    const sx1 = 7.6;
    const sy0 = 3.6;
    const sy1 = 11.2;
    const s0 = cam.P(sx0, sy1, zb);
    const s1 = cam.P(sx1, sy0, zb);
    const sw = s1[0] - s0[0];
    const sh = s1[1] - s0[1];
    glow(ctx, (s0[0] + s1[0]) / 2, (s0[1] + s1[1]) / 2, sw * 0.95, 'rgba(0,200,255,0.4)', 0.75);
    ctx.save();
    ctx.translate(s0[0], s0[1]);
    ctx.fillStyle = '#02060f';
    ctx.fillRect(-sw * 0.012, -sw * 0.012, sw * 1.024, sh + sw * 0.024);
    const sg = ctx.createRadialGradient(sw / 2, sh * 0.45, sw * 0.05, sw / 2, sh * 0.45, sw * 0.65);
    sg.addColorStop(0, '#0f3a7a');
    sg.addColorStop(0.6, '#081c44');
    sg.addColorStop(1, '#040c22');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, sw, sh);
    // grade hexagonal discreta
    ctx.strokeStyle = 'rgba(80,200,255,0.10)';
    ctx.lineWidth = 1;
    const hx = sw / 28;
    for (let y = 0, row = 0; y < sh + hx; y += hx * 0.86, row++) {
      for (let x = (row % 2) * hx * 0.5; x < sw + hx; x += hx) {
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
          const px = x + Math.cos(a) * hx * 0.48;
          const py = y + Math.sin(a) * hx * 0.48;
          if (k) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.save();
    ctx.translate(sw / 2, sh * 0.3);
    CE.bgblLock(ctx, sh * 0.2, [80, 220, 255], 'neon', 1);
    ctx.restore();
    let fs = sh * 0.2;
    ctx.font = font(fs);
    while (fs > 8 && ctx.measureText('BLUE LOCK').width > sw * 0.8) {
      fs -= 2;
      ctx.font = font(fs);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,245,212,0.25)';
    ctx.fillText('BLUE LOCK', sw / 2 + fs * 0.04, sh * 0.62 + fs * 0.05);
    ctx.fillStyle = '#e0faff';
    ctx.fillText('BLUE LOCK', sw / 2, sh * 0.62);
    ctx.fillStyle = '#00f5d4';
    ctx.fillRect(sw * 0.25, sh * 0.62 + fs * 0.52, sw * 0.5, Math.max(2, sh * 0.012));
    ctx.font = font(Math.max(8, sh * 0.065), 800, false);
    ctx.fillStyle = 'rgba(226,240,255,0.9)';
    ctx.fillText('300 ATACANTES  •  1 SOBREVIVENTE', sw / 2, sh * 0.62 + fs * 0.52 + sh * 0.08);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let y = 0; y < sh; y += 3) ctx.fillRect(0, y, sw, 1);
    ctx.restore();
    // Banners pendurados nos lados do telão
    [-1, 1].forEach((sd) => {
      const bx = sd * 10.2;
      const p0 = cam.P(bx - 1, 11, zb - 0.2);
      const p1 = cam.P(bx + 1, 3.6, zb - 0.2);
      ctx.fillStyle = rgb(fog([16, 40, 96], zb));
      ctx.fillRect(p0[0], p0[1], p1[0] - p0[0], p1[1] - p0[1]);
      ctx.fillStyle = 'rgba(56,200,255,0.8)';
      ctx.fillRect(p0[0], p0[1], p1[0] - p0[0], Math.max(2, (p1[1] - p0[1]) * 0.02));
      ctx.fillRect(p0[0], p1[1] - Math.max(2, (p1[1] - p0[1]) * 0.02), p1[0] - p0[0], Math.max(2, (p1[1] - p0[1]) * 0.02));
      ctx.save();
      ctx.translate((p0[0] + p1[0]) / 2, p0[1] + (p1[1] - p0[1]) * 0.22);
      const bs = (p1[0] - p0[0]) / 100;
      ctx.scale(bs, bs);
      CE.bgblLock(ctx, 46, [120, 220, 255], 'fill', 0.85, [16, 40, 96]);
      ctx.restore();
      ctx.save();
      ctx.translate((p0[0] + p1[0]) / 2, p0[1] + (p1[1] - p0[1]) * 0.62);
      ctx.rotate(Math.PI / 2);
      ctx.font = font((p1[0] - p0[0]) * 0.36);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(220,240,255,0.85)';
      ctx.fillText('EGOIST', 0, 0);
      ctx.restore();
    });

    // Palco
    const stageY = 1.1;
    quad3(ctx, cam, [[-hw, stageY, zs], [hw, stageY, zs], [hw, stageY, zb], [-hw, stageY, zb]], depthGrad(ctx, cam, [0, stageY, zs], [0, stageY, zb], (w, t) => rgb(fog(mix([30, 52, 90], [16, 28, 52], t), w[2]))));
    // reflexo do telão no piso do palco
    const rs = cam.P(0, stageY, zb - 0.5);
    glowE(ctx, rs[0], rs[1] + cam.s(zb) * 0.3, sw * 0.4, cam.s(zb) * 0.6, 'rgba(60,190,255,0.5)', 0.6);
    quad3(ctx, cam, [[-hw, 0, zs], [hw, 0, zs], [hw, stageY, zs], [-hw, stageY, zs]], rgb(fog([6, 10, 20], zs)));
    neon3(ctx, cam, [-hw, stageY, zs], [hw, stageY, zs], [0, 0.03, 0], CYAN, 1);
    // púlpito com o cadeado (à esquerda) e mesa de imprensa (à direita)
    box3(ctx, cam, -5.2, -4.2, stageY, stageY + 1.2, zs + 1.6, zs + 2.2, [20, 30, 50], fog, { edge: 'rgba(120,210,255,0.6)' });
    ctx.save();
    const pp = cam.P(-4.7, stageY + 0.7, zs + 1.6);
    ctx.translate(pp[0], pp[1]);
    const ps = cam.s(zs + 1.6) / 100;
    ctx.scale(ps, ps);
    CE.bgblLock(ctx, 34, [80, 210, 255], 'neon', 0.9);
    ctx.restore();
    line3(ctx, cam, [-4.6, stageY + 1.2, zs + 1.8], [-4.45, stageY + 1.55, zs + 1.7], 'rgba(10,14,24,1)', Math.max(1, cam.s(zs) * 0.03));
    box3(ctx, cam, 3.2, 7.4, stageY + 0.72, stageY + 0.8, zs + 1.4, zs + 2.2, [24, 36, 58], fog, { edge: 'rgba(120,210,255,0.5)' });
    box3(ctx, cam, 3.2, 7.4, stageY, stageY + 0.72, zs + 1.42, zs + 1.5, [12, 30, 70], fog);
    [3.8, 5.3, 6.8].forEach((x) => {
      line3(ctx, cam, [x, stageY + 0.8, zs + 1.7], [x - 0.05, stageY + 1.15, zs + 1.6], 'rgba(10,14,24,1)', Math.max(1, cam.s(zs) * 0.025));
      const mp = cam.P(x - 0.05, stageY + 1.17, zs + 1.6);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(mp[0], mp[1], Math.max(1.5, cam.s(zs) * 0.05), 0, Math.PI * 2);
      ctx.fill();
    });

    // Refletores: feixes descendo até o palco + pontos de luz
    const truss = 12;
    [-6, -2.2, 2.2, 6].forEach((x, i) => {
      const src = cam.P(x * 1.4, truss, zs - 4);
      const dst = cam.P(x * 0.6, stageY, zs + 2.2);
      const ang = Math.atan2(dst[1] - src[1], dst[0] - src[0]);
      const len = Math.hypot(dst[0] - src[0], dst[1] - src[1]) * 1.05;
      CE.cineShafts(ctx, src[0], src[1], ang, len, 0.13, 3, i % 2 ? '120,200,255' : '190,225,255', 0.09, 0);
      glowE(ctx, dst[0], dst[1], cam.s(zs) * 1.2, cam.s(zs) * 0.3, 'rgba(170,220,255,0.6)', 0.6);
      glow(ctx, src[0], src[1], cam.s(zs - 4) * 0.5, 'rgba(220,240,255,0.9)', 0.8);
    });
    // treliça
    const t0 = cam.P(-hw, truss, zs - 4);
    const t1 = cam.P(hw, truss, zs - 4);
    ctx.strokeStyle = 'rgba(20,30,50,1)';
    ctx.lineWidth = Math.max(2, cam.s(zs - 4) * 0.12);
    ctx.beginPath();
    ctx.moveTo(t0[0], t0[1]);
    ctx.lineTo(t1[0], t1[1]);
    ctx.stroke();

    // Plateia: fileiras de silhuetas com luz de recorte do palco
    const fy0 = cam.P(0, 3.4 - 0.15 * (zs - 4), zs - 1)[1];
    const sf = ctx.createLinearGradient(0, fy0, 0, H);
    sf.addColorStop(0, '#0a1630');
    sf.addColorStop(1, '#02050c');
    ctx.fillStyle = sf;
    ctx.fillRect(0, fy0, W, H - fy0);
    const rowsZ = [];
    for (let z = 2.6; z < zs - 0.6; z += 0.95) rowsZ.push(z);
    for (let ri = rowsZ.length - 1; ri >= 0; ri--) {
      const z = rowsZ[ri];
      const fy = 3.4 - 0.15 * (z - 3);
      const s = cam.s(z);
      // encosto das cadeiras
      const c0 = cam.P(-hw, fy + 0.9, z + 0.25);
      const c1 = cam.P(hw, fy + 0.45, z + 0.25);
      ctx.fillStyle = rgb(fog([10, 18, 36], z));
      ctx.fillRect(c0[0], c0[1], c1[0] - c0[0], Math.max(2, c1[1] - c0[1]));
      ctx.fillStyle = 'rgba(70,150,255,0.25)';
      ctx.fillRect(c0[0], c0[1], c1[0] - c0[0], Math.max(1, s * 0.012));
      const off = (ri % 2) * 0.3;
      for (let x = -hw + 0.4 + off; x < hw - 0.3; x += 0.6) {
        if (R() < 0.06) continue;
        const hx = x + (R() - 0.5) * 0.12;
        const hy = fy + 1.18 + (R() - 0.5) * 0.08;
        const p = cam.P(hx, hy, z);
        const hr = s * 0.105;
        const body = rgb(fog([3, 6, 14], z * 0.7));
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(p[0], p[1] + hr * 2.6, hr * 2.1, hr * 1.7, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(p[0] - hr * 2.1, p[1] + hr * 2.55, hr * 4.2, hr * 1.4);
        ctx.beginPath();
        ctx.arc(p[0], p[1], hr, 0, Math.PI * 2);
        ctx.fill();
        // cabelos variados (espetado / volumoso)
        const hs = R();
        if (hs < 0.45) {
          ctx.beginPath();
          for (let k = 0; k < 4; k++) {
            const a = Math.PI * (1.1 + k * 0.27);
            ctx.moveTo(p[0] + Math.cos(a - 0.25) * hr * 0.9, p[1] + Math.sin(a - 0.25) * hr * 0.9);
            ctx.lineTo(p[0] + Math.cos(a) * hr * 1.45, p[1] + Math.sin(a) * hr * 1.45);
            ctx.lineTo(p[0] + Math.cos(a + 0.25) * hr * 0.9, p[1] + Math.sin(a + 0.25) * hr * 0.9);
          }
          ctx.fill();
        } else if (hs < 0.7) {
          ctx.beginPath();
          ctx.ellipse(p[0], p[1] - hr * 0.15, hr * 1.25, hr * 1.05, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // luz de recorte
        ctx.strokeStyle = `rgba(110,200,255,${0.35 + 0.35 * (1 - ri / rowsZ.length)})`;
        ctx.lineWidth = Math.max(0.8, hr * 0.18);
        ctx.beginPath();
        ctx.arc(p[0], p[1], hr * 0.95, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(p[0], p[1] + hr * 2.6, hr * 2.05, hr * 1.65, 0, Math.PI * 1.1, Math.PI * 1.35);
        ctx.ellipse(p[0], p[1] + hr * 2.6, hr * 2.05, hr * 1.65, 0, Math.PI * 1.65, Math.PI * 1.9);
        ctx.stroke();
      }
    }
    // névoa de palco
    const hz = cam.P(0, stageY + 1, zs);
    glowE(ctx, hz[0], hz[1], W * 0.6, H * 0.12, 'rgba(60,150,255,0.35)', 0.6);
    CE.bgblFinish(ctx, W, H, { seed: 3, dust: 60, vig: 0.66, shade: 0.22, floorDark: 0.35 });
  };

  // =========================================================================
  // TÚNEL DOS JOGADORES
  // =========================================================================
  VN.tunnel = function (ctx, W, H) {
    const cam = CE.bgblCam(W, H, { cy: 0.35 });
    const R = CE.bgblRng(1234);
    const hw = 2.3;
    const wallH = 2.5;
    const archH = 1.05;
    const zn = 0.3;
    const zf = 24;
    const fog = makeFog([52, 88, 140], 12);
    ctx.fillStyle = '#020409';
    ctx.fillRect(0, 0, W, H);

    // Perfil da seção do túnel (da base esquerda, por cima do arco, até a base direita)
    const prof = [[-hw, 0], [-hw, wallH]];
    for (let i = 1; i < 12; i++) {
      const a = Math.PI - (i / 12) * Math.PI;
      prof.push([Math.cos(a) * hw, wallH + Math.sin(a) * archH]);
    }
    prof.push([hw, wallH], [hw, 0]);

    // Superfícies do túnel (faixas do perfil, com degradê de profundidade)
    for (let i = 0; i < prof.length - 1; i++) {
      const [xa, ya] = prof[i];
      const [xb, yb] = prof[i + 1];
      const nx = -(yb - ya);
      const ny = xb - xa;
      const nl = Math.hypot(nx, ny);
      const lit = 0.75 + 0.35 * Math.max(0, -ny / nl) + 0.1 * Math.abs(nx / nl);
      const isWall = ya < wallH + 0.01 && yb < wallH + 0.01;
      const base = isWall ? [30, 40, 58] : [20, 26, 40];
      quad3(ctx, cam, [[xa, ya, zn], [xb, yb, zn], [xb, yb, zf], [xa, ya, zf]], depthGrad(ctx, cam, [(xa + xb) / 2, (ya + yb) / 2, zn], [(xa + xb) / 2, (ya + yb) / 2, zf], (w) => rgb(fog(mul(base, lit), w[2]))));
    }
    // Chão
    const floorPoly = [[-hw, 0, zn], [hw, 0, zn], [hw, 0, zf], [-hw, 0, zf]];
    quad3(ctx, cam, floorPoly, depthGrad(ctx, cam, [0, 0, zn], [0, 0, zf], (w) => rgb(fog([12, 17, 28], w[2]))));

    // Paredes: painéis acolchoados embaixo, concreto em cima
    [-1, 1].forEach((sd) => {
      const X = sd * hw;
      for (let z = 0.6; z < zf; z += 1.1) {
        const z1 = Math.min(zf, z + 1.08);
        const k = 0.9 + R() * 0.2;
        quad3(ctx, cam, [[X, 0.15, z], [X, 1.75, z], [X, 1.75, z1], [X, 0.15, z1]], depthGrad(ctx, cam, [X, 1.75, z], [X, 0.15, z], (w) => rgb(fog(mul(mix([22, 44, 88], [12, 24, 50], 1 - w[1] / 1.75), k), z + 0.5)), 3));
        line3(ctx, cam, [X, 1.75, z + 0.02], [X, 1.75, z1 - 0.02], rgb(fog([90, 140, 210], z), 0.35), Math.max(0.6, cam.s(z) * 0.008));
      }
      line3(ctx, cam, [X, 1.78, zn], [X, 1.78, zf], 'rgba(0,0,0,0.6)', 2);
      // escorridos de umidade no concreto
      for (let i = 0; i < 30; i++) {
        const z = 1 + R() * (zf - 4);
        const len = 0.2 + R() * 0.6;
        const w = 0.03 + R() * 0.08;
        quad3(ctx, cam, [[X, wallH, z], [X, wallH - len, z], [X, wallH - len, z + w], [X, wallH, z + w]], depthGrad(ctx, cam, [X, wallH, z], [X, wallH - len, z], (q, t) => `rgba(0,0,0,${0.22 * (1 - t)})`, 2));
      }
      // arandelas presas na parede
      for (let z = 2.55; z < zf - 2; z += 4.6) {
        box3(ctx, cam, sd < 0 ? X : X - 0.08, sd < 0 ? X + 0.08 : X, 2.05, 2.2, z - 0.18, z + 0.18, [30, 40, 60], fog);
        const p = cam.P(X - sd * 0.08, 2.12, z);
        glow(ctx, p[0], p[1], cam.s(z) * 0.35, 'rgba(190,225,255,0.8)', 0.7);
        const q = cam.P(X, 1.6, z);
        glowE(ctx, q[0], q[1], cam.s(z) * 0.3, cam.s(z) * 0.8, 'rgba(120,180,255,0.35)', 0.5);
      }
    });
    // Letreiro "PITCH" pintado na parede e setas
    wallLetters(ctx, cam, -hw, -1, 'TO THE PITCH', 4.2, 9.6, 1.0, 0.34, 'rgba(160,200,255,0.16)');
    wallLetters(ctx, cam, hw, 1, '▶▶▶', 4.8, 6.2, 1.0, 0.34, 'rgba(120,200,255,0.18)');

    // Anéis estruturais (costelas) com luminária no topo
    const ringLights = [];
    for (let z = 1.4; z < zf - 1; z += 2.3) {
      const inset = 0.13;
      const outer = prof.map(([x, y]) => [x, y]);
      const inner = prof.map(([x, y]) => [x - Math.sign(x) * inset * (Math.abs(x) > 0.01 ? 1 : 0), y > wallH ? y - inset : y]);
      const pts = outer.map(([x, y]) => cam.P(x, y, z)).concat(inner.reverse().map(([x, y]) => cam.P(x, y, z)));
      // face interna (espessura do anel): acende conforme chega perto da luz da saída
      const back = prof.map(([x, y]) => [x - Math.sign(x) * inset * (Math.abs(x) > 0.01 ? 1 : 0), y > wallH ? y - inset : y]);
      const lightK = Math.pow(z / zf, 1.6);
      for (let i = 0; i < back.length - 1; i++) {
        const [xa, ya] = back[i];
        const [xb, yb] = back[i + 1];
        quad3(ctx, cam, [[xa, ya, z], [xb, yb, z], [xb, yb, z + 0.35], [xa, ya, z + 0.35]], rgb(fog(mix([18, 24, 38], [150, 190, 240], lightK), z)));
      }
      poly(ctx, pts);
      ctx.fillStyle = rgb(fog([22, 30, 46], z));
      ctx.fill();
      // fio de luz na borda interna
      ctx.save();
      ctx.beginPath();
      back.forEach(([x, y], i) => {
        const p = cam.P(x, y, z);
        if (i) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      });
      ctx.strokeStyle = rgb(fog([120, 170, 230], z), 0.22 + lightK * 0.5);
      ctx.lineWidth = Math.max(0.7, cam.s(z) * 0.012);
      ctx.stroke();
      ctx.restore();
      ringLights.push(z + 1.15);
    }
    // luminárias no teto entre os anéis
    ringLights.forEach((z) => {
      if (z > zf - 1) return;
      const y = wallH + archH - 0.02;
      quad3(ctx, cam, [[-0.35, y, z - 0.25], [0.35, y, z - 0.25], [0.35, y, z + 0.25], [-0.35, y, z + 0.25]], rgb(fog([210, 230, 255], z * 0.6)));
      const p = cam.P(0, y, z);
      glowE(ctx, p[0], p[1], cam.s(z) * 0.9, cam.s(z) * 0.4, 'rgba(170,210,255,0.5)', 0.55);
      // lavagem de luz nas paredes
      [-1, 1].forEach((sd) => {
        const q = cam.P(sd * hw, 2.2, z);
        glowE(ctx, q[0], q[1], cam.s(z) * 0.4, cam.s(z) * 0.8, 'rgba(120,170,240,0.3)', 0.35);
      });
    });

    // Saída para o campo: céu claro, arquibancada e grama
    const exitPts = prof.map(([x, y]) => cam.P(x, y, zf));
    ctx.save();
    poly(ctx, exitPts);
    ctx.clip();
    const top = cam.P(0, wallH + archH, zf)[1];
    const bot = cam.P(0, 0, zf)[1];
    const ex0 = cam.P(-hw, 0, zf)[0];
    const ex1 = cam.P(hw, 0, zf)[0];
    const sky = ctx.createLinearGradient(0, top, 0, bot);
    sky.addColorStop(0, '#5f9fe0');
    sky.addColorStop(0.5, '#b8dcff');
    sky.addColorStop(1, '#e6f4ff');
    ctx.fillStyle = sky;
    ctx.fillRect(ex0, top, ex1 - ex0, bot - top);
    // arquibancada do outro lado (silhueta azulada)
    const st = top + (bot - top) * 0.42;
    const stb = top + (bot - top) * 0.78;
    ctx.fillStyle = 'rgba(70,110,170,0.55)';
    ctx.beginPath();
    ctx.moveTo(ex0, stb);
    ctx.lineTo(ex0, st + (bot - top) * 0.08);
    ctx.lineTo(ex1, st);
    ctx.lineTo(ex1, stb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 40; i++) ctx.fillRect(ex0 + R() * (ex1 - ex0), st + (bot - top) * (0.1 + R() * 0.24), 1.5, 1.5);
    // grama
    const gr = ctx.createLinearGradient(0, stb, 0, bot);
    gr.addColorStop(0, '#5fd38a');
    gr.addColorStop(1, '#2f9e5b');
    ctx.fillStyle = gr;
    ctx.fillRect(ex0, stb, ex1 - ex0, bot - stb);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(ex0, stb + (bot - stb) * 0.35, ex1 - ex0, Math.max(1, (bot - stb) * 0.05));
    [0.12, 0.88].forEach((fx) => glow(ctx, ex0 + (ex1 - ex0) * fx, top + (bot - top) * 0.3, cam.s(zf) * 0.9, 'rgba(255,255,255,0.95)', 1));
    ctx.restore();
    // brilho estourando da saída
    const ec = cam.P(0, 1.4, zf);
    const es = cam.s(zf);
    glow(ctx, ec[0], ec[1], es * 3.2, 'rgba(230,245,255,0.9)', 0.55);
    glow(ctx, ec[0], ec[1], es * 6.5, 'rgba(150,200,255,0.5)', 0.7);
    glow(ctx, ec[0], ec[1], es * 13, 'rgba(70,130,230,0.35)', 0.6);
    // feixes de luz saindo para dentro do túnel
    CE.cineShafts(ctx, ec[0], ec[1] - es * 0.4, Math.PI / 2, Math.hypot(W, H) * 0.55, Math.PI * 1.5, 15, '190,220,255', 0.04, 0);
    // contorno escuro da boca do túnel (fica em silhueta)
    poly(ctx, exitPts);
    ctx.strokeStyle = 'rgba(8,14,26,0.85)';
    ctx.lineWidth = Math.max(2, es * 0.12);
    ctx.stroke();

    // Piso: tapete central, juntas e o reflexo longo da luz da saída
    ctx.save();
    poly(ctx, floorPoly.map((p) => cam.P(p[0], p[1], p[2])));
    ctx.clip();
    quad3(ctx, cam, [[-0.95, 0, zn], [0.95, 0, zn], [0.95, 0, zf], [-0.95, 0, zf]], depthGrad(ctx, cam, [0, 0, zn], [0, 0, zf], (w) => rgb(fog([16, 30, 56], w[2]))));
    [-0.95, 0.95].forEach((x) => quad3(ctx, cam, [[x - 0.04, 0, zn], [x + 0.04, 0, zn], [x + 0.04, 0, zf], [x - 0.04, 0, zf]], 'rgba(150,200,255,0.18)'));
    for (let z = 1; z < zf; z += 1.15) line3(ctx, cam, [-hw, 0, z], [hw, 0, z], 'rgba(0,0,0,0.35)', 1);
    const rp = cam.P(0, -1.2, zf);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const streak = ctx.createLinearGradient(0, rp[1] - es, 0, H);
    streak.addColorStop(0, 'rgba(200,230,255,0.45)');
    streak.addColorStop(0.35, 'rgba(120,180,255,0.16)');
    streak.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = streak;
    ctx.beginPath();
    ctx.moveTo(ec[0] - es * 1.6, rp[1] - es);
    ctx.lineTo(ec[0] + es * 1.6, rp[1] - es);
    ctx.lineTo(ec[0] + W * 0.22, H);
    ctx.lineTo(ec[0] - W * 0.22, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ringLights.forEach((z) => {
      const p = cam.P(0, -(wallH + archH), z);
      glowE(ctx, p[0], p[1], cam.s(z) * 0.3, cam.s(z) * 0.8, 'rgba(170,210,255,0.3)', 0.35);
    });
    ctx.restore();

    CE.bgblFinish(ctx, W, H, { seed: 29, dust: 70, vig: 0.72, shade: 0.26, dustColor: 'rgba(210,230,255,0.35)' });
  };
})();
