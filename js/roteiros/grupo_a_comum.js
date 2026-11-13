// ============================================================================
// AJUDANTES DAS CENAS DO LOTE 1, GRUPO A (js/roteiros/: 13, 05/06, 10, 15/16, 19/20)
// Só desenho e contas que as cenas desse grupo repetem (CE.rtA): o campo do prédio, o brilho
// dos refletores, o placar pequeno, a sombra comprida no gramado e o quebra-cabeça da 13.
// Nada aqui toca cena antiga: as cenas antigas continuam nos js/cine3d_*.js.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.roteiro) return;
  const R = CE.roteiro;
  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const A = (CE.rtA = {});

  // ---------------------------------------------------------------- o campo do prédio
  // gol norte em y 6,62 e gol sul em y 22,38 (traves de x 51,9 a 54,1, travessão a 1,0)
  A.campo = { cx: 53, cy: 14.5, gn: 6.62, gs: 22.38, x0: 45.7, x1: 60.3 };
  A.torres = [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]];
  A.LAMP_Z = 3.33;

  // brilho frio dos refletores que estão no quadro (estrela + risco horizontal, sem fantasmas)
  A.refletores = function (ctx, S, K, k = 1, tint = '186,230,253') {
    if (k <= 0 || !K) return;
    const { W, H } = S;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    A.torres.forEach(([x, y]) => {
      const p = K.screen(x, A.LAMP_Z, y);
      if (!p || p.x < -120 || p.x > W + 120 || p.y < -120 || p.y > H * 0.7) return;
      CE.cineGlow(ctx, p.x, p.y, 90, 'rgba(255,255,255,0.35)', k);
      CE.cineGlow(ctx, p.x, p.y, 26, 'rgba(255,255,255,0.9)', k);
      const gr = ctx.createLinearGradient(p.x - 300, 0, p.x + 300, 0);
      gr.addColorStop(0, `rgba(${tint},0)`);
      gr.addColorStop(0.5, `rgba(${tint},${0.42 * k})`);
      gr.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(p.x - 300, p.y - 1, 600, 3);
    });
    ctx.restore();
  };

  // ---------------------------------------------------------------- placar pequeno
  // o = { casa, fora, gc, gf, corC, corF, k (entrada), muda: 'casa' | 'fora', mk (0..1 do
  // número novo), min (minuto, numa caixinha ao lado), direita (canto direito), x, y }.
  // Jersey 10, canto de cima, discreto.
  A.placar = function (ctx, S, o) {
    const k = clamp(o.k ?? 1);
    if (k <= 0) return;
    const { top } = S;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.font = '22px "Jersey 10", "Arial Narrow", sans-serif';
    ctx.textBaseline = 'middle';
    const tc = String(o.casa).toUpperCase();
    const tf = String(o.fora).toUpperCase();
    const wc = ctx.measureText(tc).width;
    const wf = ctx.measureText(tf).width;
    const wn = 64;
    const w = wc + wf + wn + 44;
    const h = 30;
    const wm = o.min ? ctx.measureText(String(o.min)).width + 18 : 0;
    const x = o.x ?? (o.direita ? S.W - 28 - w - (wm ? wm + 4 : 0) : 28);
    const y = o.y ?? top + 16;
    if (o.min) {
      ctx.fillStyle = 'rgba(2,6,23,0.78)';
      ctx.fillRect(x + w + 4, y, wm, h);
      ctx.fillStyle = '#facc15';
      ctx.fillText(String(o.min), x + w + 13, y + h / 2 + 1);
    }
    ctx.fillStyle = 'rgba(2,6,23,0.78)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = o.corC || '#38bdf8';
    ctx.fillRect(x, y, 4, h);
    ctx.fillStyle = o.corF || '#ef4444';
    ctx.fillRect(x + w - 4, y, 4, h);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(tc, x + 14, y + h / 2 + 1);
    ctx.fillText(tf, x + w - 14 - wf, y + h / 2 + 1);
    // o placar (o número que muda pisca branco e assenta)
    const nx = x + 14 + wc + 8;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(nx, y + 3, wn, h - 6);
    ctx.font = '26px "Jersey 10", "Arial Narrow", sans-serif';
    ctx.textAlign = 'center';
    const mk = clamp(o.mk ?? 1);
    const num = (v, cx, lado) => {
      const novo = o.muda === lado && mk < 1;
      ctx.fillStyle = novo ? (Math.floor(mk * 8) % 2 ? '#ffffff' : '#facc15') : '#f8fafc';
      ctx.fillText(String(v), cx, y + h / 2 + 1);
    };
    num(o.gc, nx + 16, 'casa');
    ctx.fillStyle = '#64748b';
    ctx.fillText('×', nx + wn / 2, y + h / 2 + 1);
    num(o.gf, nx + wn - 16, 'fora');
    ctx.restore();
  };

  // ---------------------------------------------------------------- rastro da bola
  // risco afinando atrás da bola (p0 = onde ela estava, p1 = onde está; pontos já na tela)
  A.rastro = function (ctx, p0, p1, cor = '255,255,255', a = 0.7, w = 8) {
    if (!p0 || !p1 || a <= 0) return;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return;
    const nx = -dy / d;
    const ny = dx / d;
    const g = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
    g.addColorStop(0, `rgba(${cor},0)`);
    g.addColorStop(1, `rgba(${cor},${clamp(a)})`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x + nx * w * 0.5, p1.y + ny * w * 0.5);
    ctx.lineTo(p1.x - nx * w * 0.5, p1.y - ny * w * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // ---------------------------------------------------------------- sombra comprida
  // a sombra que o refletor mais perto faz de quem está em [x, y] (placa deitada no gramado)
  const SOMBRA = () =>
    R.tela('rtA|sombra', 32, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0.6)');
      gr.addColorStop(0.6, 'rgba(0,0,0,0.3)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, TAU);
      g.fill();
    });
  A.sombra = function (K, x, y, a = 0.3, len = 1.2) {
    if (a <= 0.01) return;
    let best = A.torres[0];
    let bd = 1e9;
    A.torres.forEach((t) => {
      const d = Math.hypot(x - t[0], y - t[1]);
      if (d < bd) {
        bd = d;
        best = t;
      }
    });
    const ang = Math.atan2(y - best[1], x - best[0]);
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const px = -dy * 0.14;
    const py = dx * 0.14;
    const z = 0.007;
    const q = [
      [x - px, z, y - py],
      [x + px, z, y + py],
      [x + dx * len + px * 0.7, z, y + dy * len + py * 0.7],
      [x + dx * len - px * 0.7, z, y + dy * len - py * 0.7]
    ];
    const V = (p, u, v) => [p[0], p[1], p[2], u, v, 0, 1, 0];
    K._push([].concat(V(q[0], 0, 0.5), V(q[1], 1, 0.5), V(q[2], 1, 1), V(q[0], 0, 0.5), V(q[2], 1, 1), V(q[3], 0, 1)), { img: SOMBRA(), color: '#000000', alpha: a });
  };

  // a sombra da bola no chão (a do kit some com a bola alta; esta mostra o arco)
  const SOMBRA_BOLA = () =>
    R.tela('rtA|sombraBola', 16, 16, (g) => {
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(5, 3, 6, 10);
      g.fillRect(3, 5, 10, 6);
    });
  A.sombraBola = function (K, x, y, z) {
    if (z < 0.3) return;
    const r = 0.07 + Math.min(0.08, z * 0.03);
    K.floor({ x0: x - r, y0: y - r, x1: x + r, y1: y + r, z: 0.012, img: SOMBRA_BOLA(), color: '#000000', alpha: Math.max(0.25, 0.6 - z * 0.15) });
  };

  // ---------------------------------------------------------------- quebra-cabeça
  // Peças de quebra-cabeça numa grade (c, r) com lado s px: cada aresta tem um encaixe (meia
  // lua) para fora ou para dentro, sorteado pela aresta (o mesmo para as duas peças vizinhas).
  const sinal = (tipo, c, r) => (R.rnd(c * 7.3 + r * 13.1 + (tipo === 'h' ? 0.5 : 0), 17) < 0.5 ? -1 : 1);
  // contorno de uma peça (em px da textura) como caminho do canvas, a partir de (ox, oy)
  A.pecaPath = function (g, ox, oy, s, c, r) {
    const x0 = ox + c * s;
    const y0 = oy + r * s;
    const t = s * 0.194; // (0,62·t ≈ 0,12 do lado: a meia largura do encaixe)
    g.moveTo(x0, y0);
    // aresta de cima (horizontal c, r): o encaixe vai para +y quando o sinal é +
    const sh = sinal('h', c, r);
    g.lineTo(x0 + s * 0.38, y0);
    g.arc(x0 + s * 0.5, y0, t * 0.62, Math.PI, 0, sh < 0);
    g.lineTo(x0 + s, y0);
    // direita (vertical c+1, r): o encaixe vai para +x quando o sinal é +
    const sv = sinal('v', c + 1, r);
    g.lineTo(x0 + s, y0 + s * 0.38);
    g.arc(x0 + s, y0 + s * 0.5, t * 0.62, -Math.PI / 2, Math.PI / 2, sv < 0);
    g.lineTo(x0 + s, y0 + s);
    // de baixo (horizontal c, r+1), da direita para a esquerda
    const sb = sinal('h', c, r + 1);
    g.lineTo(x0 + s * 0.62, y0 + s);
    g.arc(x0 + s * 0.5, y0 + s, t * 0.62, 0, Math.PI, sb > 0);
    g.lineTo(x0, y0 + s);
    // esquerda (vertical c, r), de baixo para cima
    const se = sinal('v', c, r);
    g.lineTo(x0, y0 + s * 0.62);
    g.arc(x0, y0 + s * 0.5, t * 0.62, Math.PI / 2, -Math.PI / 2, se > 0);
    g.closePath();
  };
  // deixa o canvas "pixel": cada pixel ou é cheio ou é vazio (sem meio-tom do traço)
  A.limiar = function (g, w, h, corte = 96) {
    const im = g.getImageData(0, 0, w, h);
    const d = im.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= corte ? 255 : 0;
    g.putImageData(im, 0, 0);
  };
})();
