// ============================================================================
// ARTE DAS CUTSCENES EM ALTA RESOLUÇÃO (desenhada por código, sem custo)
// Os closes das cenas não usam mais o boneco de 72 px ampliado (vira bloco): usam estas
// ilustrações vetoriais — olhos de anime (cores de cada personagem), bola, chuteira,
// silhueta lisa do próprio boneco, linhas de velocidade, retícula, explosão de impacto —
// e quadros de mangá (cut-ins) diagonais. Ver docs/DIRECAO_DE_ARTE.md.
// Se existir uma imagem pronta em img/cenas/<cena>/<nome>.png, CA.img() devolve ela e a
// cena pode desenhar a imagem no lugar do desenho de código.
//   const CA = CutsceneEngine.ART;
//   CA.eyes(ctx, cx, cy, w, { cd, expr: 'angry'|'calm'|'wide'|'focus', glow })
//   CA.ball(ctx, x, y, r, { rot, blur: [vx, vy] })
//   CA.boot(ctx, x, y, s, { ang, sock, boot, skin, flip })
//   CA.silhouette(ctx, cd, x, feetY, h, { pose, view, left, fill, rim, eyes })
//   CA.speedRadial(ctx, cx, cy, W, H, o) · CA.speedLines(ctx, ang, W, H, o)
//   CA.halftone(ctx, x, y, w, h, o) · CA.burst(ctx, cx, cy, r, o)
//   CA.panel(ctx, poly, draw, { k, from, border })   (quadro de mangá que entra deslizando)
//   CA.trauma(key).add(0.6); const o = CA.trauma(key).offset(t)  (tremida por trauma²)
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE) return;
  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const rgb = (hex) => {
    const h = String(hex || '#888').replace('#', '');
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
    return [parseInt(f.slice(0, 2), 16) || 0, parseInt(f.slice(2, 4), 16) || 0, parseInt(f.slice(4, 6), 16) || 0];
  };
  const shade = (hex, k) => {
    const [r, g, b] = rgb(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  };
  const noise = (t, s) => Math.sin(t * 0.37 + s * 12.9) * 0.6 + Math.sin(t * 0.91 + s * 4.1) * 0.3 + Math.sin(t * 2.3 + s) * 0.1;
  const rnd = (i, s = 1) => {
    const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // ---------------------------------------------------------------- imagens prontas (opcional)
  const IMGS = new Map();
  function img(scene, name) {
    const key = scene + '/' + name;
    let e = IMGS.get(key);
    if (!e) {
      e = { ok: false, im: new Image() };
      e.im.onload = () => (e.ok = true);
      e.im.onerror = () => (e.ok = false);
      e.im.src = `img/cenas/${scene}/${name}.png`;
      IMGS.set(key, e);
    }
    return e.ok ? e.im : null;
  }

  // ---------------------------------------------------------------- olhos de anime
  // Um par de olhos (faixa do rosto) centrado em (cx, cy), largura total w. Traço preto
  // grosso na pálpebra de cima, íris alta com degradê e brilhos, sobrancelha pela expressão.
  function eyes(ctx, cx, cy, w, o = {}) {
    const cd = o.cd || {};
    const iris = o.iris || cd.eyeColor || '#38bdf8';
    const skin = o.skin || cd.skinColor || '#f1c9a5';
    const hair = o.brow || cd.hairColor || '#1f2937';
    const expr = o.expr || 'focus';
    const ew = w * 0.3; // largura de um olho
    const eh = ew * (expr === 'wide' ? 0.62 : expr === 'calm' ? 0.4 : 0.48);
    const gap = w * 0.22;
    ctx.save();
    // pele com a sombra do cabelo em cima (faixa inteira)
    if (!o.noSkin) {
      const sk = ctx.createLinearGradient(0, cy - w * 0.3, 0, cy + w * 0.3);
      sk.addColorStop(0, shade(skin, -0.38));
      sk.addColorStop(0.28, shade(skin, -0.12));
      sk.addColorStop(0.6, skin);
      sk.addColorStop(1, shade(skin, -0.08));
      ctx.fillStyle = sk;
      ctx.fillRect(cx - w, cy - w * 0.4, w * 2, w * 0.8);
    }
    [-1, 1].forEach((side) => {
      const ex = cx + side * (gap / 2 + ew / 2);
      const inner = ex - side * ew * 0.5;
      const outer = ex + side * ew * 0.5;
      const lidY = cy - eh * 0.5;
      // pálpebra de cima (curva) e de baixo
      const upper = (g) => {
        g.moveTo(inner, cy - eh * 0.12);
        g.bezierCurveTo(inner + side * ew * 0.18, lidY - eh * 0.35, outer - side * ew * 0.32, lidY - eh * 0.28, outer + side * ew * 0.06, cy - eh * (expr === 'angry' ? 0.02 : 0.12));
      };
      const lower = (g) => {
        g.moveTo(outer, cy + eh * 0.05);
        g.bezierCurveTo(outer - side * ew * 0.25, cy + eh * 0.55, inner + side * ew * 0.3, cy + eh * 0.55, inner, cy + eh * 0.05);
      };
      // branco do olho (recorte entre as pálpebras)
      ctx.save();
      ctx.beginPath();
      upper(ctx);
      ctx.lineTo(outer, cy + eh * 0.05);
      ctx.bezierCurveTo(outer - side * ew * 0.25, cy + eh * 0.55, inner + side * ew * 0.3, cy + eh * 0.55, inner, cy + eh * 0.05);
      ctx.closePath();
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.clip();
      // íris (alta, um pouco para dentro), degradê, pupila e brilhos
      const ix = ex - side * ew * 0.04 + (o.look || 0) * ew * 0.12;
      const iy = cy + eh * 0.04;
      const ir = ew * 0.27;
      const irH = eh * 0.62 * (expr === 'calm' ? 1.25 : 1);
      const ig = ctx.createLinearGradient(0, iy - irH, 0, iy + irH);
      ig.addColorStop(0, shade(iris, -0.7));
      ig.addColorStop(0.45, shade(iris, -0.2));
      ig.addColorStop(1, shade(iris, 0.35));
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.ellipse(ix, iy, ir, irH, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = shade(iris, -0.75);
      ctx.lineWidth = ew * 0.03;
      ctx.stroke();
      ctx.fillStyle = shade(iris, -0.85);
      ctx.beginPath();
      ctx.ellipse(ix, iy + irH * 0.05, ir * (expr === 'wide' ? 0.28 : 0.4), irH * (expr === 'wide' ? 0.3 : 0.45), 0, 0, TAU);
      ctx.fill();
      // sombra da pálpebra em cima da íris
      ctx.fillStyle = 'rgba(15,23,42,0.45)';
      ctx.fillRect(ix - ir * 1.2, lidY - eh, ir * 2.4, eh * 0.75);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.ellipse(ix - side * ir * 0.35, iy - irH * 0.35, ir * 0.22, irH * 0.16, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(ix + side * ir * 0.3, iy + irH * 0.4, ir * 0.1, irH * 0.08, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      // traço das pálpebras (cima grosso com cílio na ponta; baixo fino)
      ctx.strokeStyle = '#0b0f19';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = ew * 0.085;
      ctx.beginPath();
      upper(ctx);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(outer + side * ew * 0.04, cy - eh * 0.1);
      ctx.lineTo(outer + side * ew * 0.16, cy - eh * 0.32);
      ctx.stroke();
      ctx.lineWidth = ew * 0.03;
      ctx.beginPath();
      lower(ctx);
      ctx.stroke();
      // sobrancelha
      const by = lidY - eh * (expr === 'wide' ? 0.95 : 0.7);
      const tilt = expr === 'angry' ? 0.42 : expr === 'focus' ? 0.18 : expr === 'calm' ? -0.05 : -0.15;
      ctx.strokeStyle = shade(hair, -0.3);
      ctx.lineWidth = ew * 0.12;
      ctx.beginPath();
      ctx.moveTo(inner - side * ew * 0.05, by + eh * tilt);
      ctx.quadraticCurveTo(ex, by - eh * 0.25, outer + side * ew * 0.12, by - eh * tilt * 0.4);
      ctx.stroke();
      // tensão (riscos embaixo) no olhar bravo
      if (expr === 'angry' || o.lines) {
        ctx.strokeStyle = 'rgba(15,23,42,0.35)';
        ctx.lineWidth = ew * 0.02;
        for (let i = 0; i < 4; i++) {
          const lx = ex + side * (i - 1.5) * ew * 0.12;
          ctx.beginPath();
          ctx.moveTo(lx, cy + eh * 0.75);
          ctx.lineTo(lx - side * ew * 0.05, cy + eh * 1.05);
          ctx.stroke();
        }
      }
      // brilho da cor do personagem (fluxo / foco)
      if (o.glow) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const gg = ctx.createRadialGradient(ix, iy, 0, ix, iy, ew * 0.5);
        gg.addColorStop(0, `rgba(${rgb(o.glow).join(',')},${0.45 * (o.glowK ?? 1)})`);
        gg.addColorStop(1, `rgba(${rgb(o.glow).join(',')},0)`);
        ctx.fillStyle = gg;
        ctx.fillRect(ix - ew * 0.55, iy - ew * 0.55, ew * 1.1, ew * 1.1);
        ctx.restore();
      }
    });
    // nariz (só a sombra) e a franja caindo por cima
    ctx.strokeStyle = shade(skin, -0.35);
    ctx.lineWidth = ew * 0.04;
    ctx.beginPath();
    ctx.moveTo(cx + ew * 0.05, cy + eh * 0.6);
    ctx.lineTo(cx - ew * 0.04, cy + eh * 1.05);
    ctx.stroke();
    if (!o.noBangs) {
      const top = cy - w * 0.42;
      // sombra da franja na pele
      const sb = ctx.createLinearGradient(0, top, 0, top + w * 0.3);
      sb.addColorStop(0, 'rgba(15,23,42,0.45)');
      sb.addColorStop(1, 'rgba(15,23,42,0)');
      ctx.fillStyle = sb;
      ctx.fillRect(cx - w, top, w * 2, w * 0.3);
      // mechas curvas (cada uma afina e entorta para o lado), com reflexo
      for (let i = 0; i < 11; i++) {
        const bx = cx - w * 0.95 + i * w * 0.19 + (rnd(i, 5) - 0.5) * w * 0.05;
        const len = w * (0.07 + rnd(i, 6) * 0.13) + (i === 5 ? w * 0.08 : 0);
        const bend = (rnd(i, 7) - 0.5) * w * 0.12 + (bx < cx ? -1 : 1) * w * 0.02;
        const half = w * (0.085 + rnd(i, 8) * 0.03);
        ctx.fillStyle = i % 3 === 1 ? shade(hair, 0.12) : hair;
        ctx.beginPath();
        ctx.moveTo(bx - half, top - w * 0.02);
        ctx.quadraticCurveTo(bx - half * 0.4 + bend * 0.5, top + len * 0.6, bx + bend, top + w * 0.06 + len);
        ctx.quadraticCurveTo(bx + half * 0.6 + bend * 0.4, top + len * 0.5, bx + half, top - w * 0.02);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = hair;
      ctx.fillRect(cx - w, top - w * 0.2, w * 2, w * 0.21);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = w * 0.008;
      for (let i = 0; i < 6; i++) {
        const hx = cx - w * 0.7 + i * w * 0.28;
        ctx.beginPath();
        ctx.moveTo(hx, top - w * 0.05);
        ctx.quadraticCurveTo(hx + w * 0.03, top + w * 0.02, hx + w * 0.01, top + w * 0.06);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- bola
  // A bola do jogo (branca com gomos azuis), sombra de célula, brilho e rastro de movimento
  function ball(ctx, x, y, r, o = {}) {
    const rot = o.rot || 0;
    ctx.save();
    if (o.blur) {
      const [vx, vy] = o.blur;
      for (let i = 4; i >= 1; i--) {
        ctx.globalAlpha = 0.12 * (5 - i) * 0.5;
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(x - vx * i * 0.25, y - vy * i * 0.25, r, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.save();
    ctx.clip();
    // gomos (pentágonos azuis em volta de um central)
    const pent = (px, py, pr, a) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const aa = a + (i / 5) * TAU;
        const fx = px + Math.cos(aa) * pr;
        const fy = py + Math.sin(aa) * pr;
        if (i) ctx.lineTo(fx, fy);
        else ctx.moveTo(fx, fy);
      }
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = '#1d4ed8';
    const cxp = x + Math.cos(rot) * r * 0.08;
    const cyp = y + Math.sin(rot) * r * 0.08;
    pent(cxp, cyp, r * 0.3, rot);
    for (let i = 0; i < 5; i++) {
      const a = rot + (i / 5) * TAU + Math.PI / 5;
      pent(cxp + Math.cos(a) * r * 0.82, cyp + Math.sin(a) * r * 0.82, r * 0.26, a + Math.PI);
    }
    ctx.strokeStyle = 'rgba(15,23,42,0.5)';
    ctx.lineWidth = r * 0.03;
    for (let i = 0; i < 5; i++) {
      const a = rot + (i / 5) * TAU;
      ctx.beginPath();
      ctx.moveTo(cxp + Math.cos(a) * r * 0.3, cyp + Math.sin(a) * r * 0.3);
      ctx.lineTo(cxp + Math.cos(a) * r * 0.62, cyp + Math.sin(a) * r * 0.62);
      ctx.stroke();
    }
    // sombra (meia-lua de baixo) e brilho
    const sh = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.2, x, y, r * 1.05);
    sh.addColorStop(0, 'rgba(255,255,255,0)');
    sh.addColorStop(0.7, 'rgba(30,41,59,0.12)');
    sh.addColorStop(1, 'rgba(15,23,42,0.55)');
    ctx.fillStyle = sh;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.18, r * 0.1, -0.6, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#0b0f19';
    ctx.lineWidth = Math.max(2, r * 0.05);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- chuteira
  // Perna de baixo (meião listrado + caneleira) e a chuteira, em estilo de célula; s = escala
  // (~ altura do pé em px), ang = inclinação da perna, flip = virada para a esquerda
  function boot(ctx, x, y, s, o = {}) {
    const sock = o.sock || '#1d4ed8';
    const sock2 = o.sock2 || '#f8fafc';
    const bootC = o.boot || '#facc15';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.ang || 0);
    if (o.flip) ctx.scale(-1, 1);
    ctx.lineJoin = 'round';
    ctx.lineWidth = s * 0.06;
    ctx.strokeStyle = '#0b0f19';
    // meião (sobe pela tela)
    ctx.fillStyle = sock;
    ctx.beginPath();
    ctx.moveTo(-s * 0.32, -s * 0.2);
    ctx.lineTo(-s * 0.42, -s * 2.6);
    ctx.lineTo(s * 0.38, -s * 2.6);
    ctx.lineTo(s * 0.3, -s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = sock2;
    [-1.1, -1.5].forEach((yy) => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.38, s * yy);
      ctx.lineTo(s * 0.35, s * yy - s * 0.03);
      ctx.lineTo(s * 0.36, s * yy - s * 0.15);
      ctx.lineTo(-s * 0.39, s * yy - s * 0.12);
      ctx.closePath();
      ctx.fill();
    });
    // sombra de célula no meião
    ctx.fillStyle = 'rgba(15,23,42,0.28)';
    ctx.beginPath();
    ctx.moveTo(s * 0.08, -s * 0.2);
    ctx.lineTo(s * 0.12, -s * 2.6);
    ctx.lineTo(s * 0.38, -s * 2.6);
    ctx.lineTo(s * 0.3, -s * 0.15);
    ctx.closePath();
    ctx.fill();
    // chuteira
    const bootPath = () => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.35);
      ctx.bezierCurveTo(-s * 0.45, s * 0.1, -s * 0.3, s * 0.32, s * 0.1, s * 0.34);
      ctx.bezierCurveTo(s * 0.7, s * 0.36, s * 1.15, s * 0.28, s * 1.25, s * 0.12);
      ctx.bezierCurveTo(s * 1.3, -s * 0.02, s * 1.05, -s * 0.12, s * 0.7, -s * 0.16);
      ctx.bezierCurveTo(s * 0.45, -s * 0.2, s * 0.35, -s * 0.38, s * 0.32, -s * 0.42);
      ctx.closePath();
    };
    bootPath();
    ctx.fillStyle = bootC;
    ctx.fill();
    ctx.save();
    bootPath();
    ctx.clip();
    ctx.fillStyle = 'rgba(15,23,42,0.3)';
    ctx.fillRect(-s, s * 0.12, s * 3, s);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(s * 0.75, -s * 0.05, s * 0.35, s * 0.06, -0.1, 0, TAU);
    ctx.fill();
    // cadarço
    ctx.strokeStyle = 'rgba(15,23,42,0.7)';
    ctx.lineWidth = s * 0.035;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(s * (0.38 + i * 0.12), -s * (0.32 - i * 0.04));
      ctx.lineTo(s * (0.46 + i * 0.12), -s * (0.12 - i * 0.02));
      ctx.stroke();
    }
    ctx.restore();
    bootPath();
    ctx.lineWidth = s * 0.06;
    ctx.strokeStyle = '#0b0f19';
    ctx.stroke();
    // travas
    ctx.fillStyle = '#0b0f19';
    [0.0, 0.35, 0.7, 1.0].forEach((u) => ctx.fillRect(s * u - s * 0.05, s * 0.33, s * 0.1, s * 0.09));
    ctx.restore();
  }

  // ---------------------------------------------------------------- silhueta lisa
  // A forma do próprio boneco, em alta resolução e sem os blocos: desenha o boneco pequeno,
  // amplia com suavização e recorta de novo (borrar + contraste), e pinta: preenchimento,
  // brilho na borda (contraluz) e, se pedir, os olhos acesos. Guardada por boneco/pose/altura.
  const SIL = new Map();
  function silMask(cd, h, o) {
    const key = [cd.name || cd.id, cd.hairStyle, cd.jerseyPrimary, o.view, o.left ? 1 : 0, o.pose || 'idle', o.frame || 0, Math.round(h)].join('|');
    let m = SIL.get(key);
    if (m) return m;
    const PR = window.PixelRenderer;
    const S0 = 72;
    const small = document.createElement('canvas');
    small.width = S0;
    small.height = S0;
    const sg = small.getContext('2d');
    sg.imageSmoothingEnabled = false;
    try {
      PR.drawCharacterSprite(sg, cd, S0, S0, { facing: 'front', accessories: [], shirtNumber: cd.number || 10, view: o.view || 'front', left: !!o.left, animState: o.pose || 'idle', frame: o.frame || 0 });
    } catch (e) {
      return null;
    }
    const k = h / S0;
    const W = Math.ceil(S0 * k);
    const big = document.createElement('canvas');
    big.width = W;
    big.height = W;
    const bg = big.getContext('2d', { willReadFrequently: true });
    bg.fillStyle = '#000';
    bg.fillRect(0, 0, W, W);
    // branco onde tem boneco, ampliado com suavização e um pouco borrado
    const white = document.createElement('canvas');
    white.width = S0;
    white.height = S0;
    const wg = white.getContext('2d');
    wg.drawImage(small, 0, 0);
    wg.globalCompositeOperation = 'source-in';
    wg.fillStyle = '#fff';
    wg.fillRect(0, 0, S0, S0);
    bg.imageSmoothingEnabled = true;
    bg.filter = `blur(${Math.max(1, k * 0.55)}px)`;
    bg.drawImage(white, 0, 0, W, W);
    bg.filter = 'none';
    const id = bg.getImageData(0, 0, W, W);
    const d = id.data;
    // contraste: borda lisa (limiar suave em torno de 50%)
    for (let i = 0; i < d.length; i += 4) {
      const v = d[i] / 255;
      const a = clamp((v - 0.42) / 0.16);
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = Math.round(a * 255);
    }
    bg.putImageData(id, 0, 0);
    m = { cv: big, k, W };
    if (SIL.size > 40) SIL.delete(SIL.keys().next().value);
    SIL.set(key, m);
    return m;
  }
  function silhouette(ctx, cd, x, feetY, h, o = {}) {
    const m = silMask(cd, h, o);
    if (!m) return;
    const W = m.W;
    // (o boneco ocupa o quadrado de 72; os pés ficam ~6/72 acima do fundo)
    const dx = x - W / 2;
    const dy = feetY - W + (6 / 72) * W;
    const tmp = document.createElement('canvas');
    tmp.width = W;
    tmp.height = W;
    const tg = tmp.getContext('2d');
    // brilho da borda (contraluz): a forma borrada e clara atrás
    if (o.rim) {
      ctx.save();
      ctx.filter = `blur(${Math.max(3, h * 0.025)}px)`;
      tg.drawImage(m.cv, 0, 0);
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = o.rim;
      tg.fillRect(0, 0, W, W);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(tmp, dx, dy);
      ctx.drawImage(tmp, dx, dy);
      ctx.restore();
      tg.globalCompositeOperation = 'source-over';
      tg.clearRect(0, 0, W, W);
    }
    tg.drawImage(m.cv, 0, 0);
    tg.globalCompositeOperation = 'source-in';
    if (o.gradient) {
      const gr = tg.createLinearGradient(0, 0, 0, W);
      o.gradient.forEach(([p, c]) => gr.addColorStop(p, c));
      tg.fillStyle = gr;
    } else tg.fillStyle = o.fill || '#0b1020';
    tg.fillRect(0, 0, W, W);
    ctx.drawImage(tmp, dx, dy);
    if (o.eyes) {
      // olhos acesos (posição medida no boneco: ~31% da altura a partir do topo da cabeça)
      const ey = dy + W * (o.eyeV ?? 0.3);
      [-1, 1].forEach((s) => {
        const ex = x + s * W * 0.07;
        CE.cineGlow ? CE.cineGlow(ctx, ex, ey, W * 0.07, o.eyes, 0.95) : null;
        ctx.fillStyle = '#f0fdfa';
        ctx.fillRect(ex - W * 0.012, ey - W * 0.006, W * 0.024, W * 0.012);
      });
    }
  }

  // ---------------------------------------------------------------- fundos e efeitos
  // linhas de velocidade em volta de um ponto (centro limpo), como no impacto
  function speedRadial(ctx, cx, cy, W, H, o = {}) {
    const n = o.n || 90;
    const inner = o.inner ?? Math.min(W, H) * 0.18;
    const R = Math.hypot(W, H);
    ctx.save();
    ctx.fillStyle = o.color || 'rgba(15,23,42,0.85)';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(i, o.seed || 1) * 0.05;
      const w = (0.004 + rnd(i, 3) * 0.012) * (o.thick || 1);
      const r0 = inner * (0.8 + rnd(i, 4) * 0.7);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
      ctx.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // linhas paralelas na direção do movimento (corrida, bola voando)
  function speedLines(ctx, ang, W, H, o = {}) {
    const n = o.n || 40;
    const t = o.t || 0;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(ang);
    const D = Math.hypot(W, H);
    ctx.fillStyle = o.color || 'rgba(241,245,249,0.6)';
    for (let i = 0; i < n; i++) {
      const y = (rnd(i, o.seed || 2) - 0.5) * D;
      const len = D * (0.15 + rnd(i, 3) * 0.35);
      const x = ((rnd(i, 4) * D * 2 + t * (o.speed || 40)) % (D * 2)) - D;
      const th = 1 + rnd(i, 5) * (o.thick || 3);
      ctx.fillRect(x, y, len, th);
    }
    ctx.restore();
  }
  // retícula de mangá (pontos) com degradê de tamanho
  function halftone(ctx, x, y, w, h, o = {}) {
    const step = o.step || 9;
    const ang = o.ang ?? 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = o.color || 'rgba(15,23,42,0.5)';
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const R = Math.hypot(w, h);
    for (let i = -R; i < R; i += step) {
      for (let j = -R; j < R; j += step) {
        const px = x + w / 2 + i * ca - j * sa;
        const py = y + h / 2 + i * sa + j * ca;
        if (px < x - step || px > x + w + step || py < y - step || py > y + h + step) continue;
        const f = o.from === 'bottom' ? (py - y) / h : o.from === 'left' ? 1 - (px - x) / w : 1 - (py - y) / h;
        const r = step * 0.5 * clamp(f) * (o.max || 0.9);
        if (r < 0.4) continue;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  // estrela de impacto (pontas irregulares)
  function burst(ctx, cx, cy, r, o = {}) {
    const n = o.n || 18;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * TAU + (o.rot || 0);
      const rr = i % 2 ? r * (0.45 + rnd(i, o.seed || 7) * 0.15) : r * (0.85 + rnd(i, 8) * 0.3);
      if (i) ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      else ctx.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = o.fill || '#f8fafc';
    ctx.fill();
    if (o.stroke) {
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.lw || 6;
      ctx.stroke();
    }
    ctx.restore();
  }

  // canvas de trabalho do quadro em pixel art (reaproveitado por tamanho)
  const PXC = new Map();
  function pixelCanvas(w, h) {
    const k = w + 'x' + h;
    let c = PXC.get(k);
    if (!c) {
      c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      if (PXC.size > 12) PXC.delete(PXC.keys().next().value);
      PXC.set(k, c);
    }
    return c;
  }
  // ---------------------------------------------------------------- quadro de mangá
  // poly = [[x,y],...]; k = 0..1 (entrada deslizando a partir de 'from' = [dx, dy] px);
  // draw(box, g) desenha em g (com pixel: N, g é o canvas em baixa resolução, mesmas coordenadas)
  function panel(ctx, poly, draw, o = {}) {
    const k = clamp(o.k ?? 1);
    if (k <= 0) return;
    const e = 1 - Math.pow(1 - k, 3);
    const [fx, fy] = o.from || [0, 0];
    const ox = fx * (1 - e);
    const oy = fy * (1 - e);
    const P = poly.map(([x, y]) => [x + ox, y + oy]);
    const path = () => {
      ctx.beginPath();
      P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    };
    ctx.save();
    // sombra do quadro
    path();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#05070d';
    ctx.fill();
    ctx.shadowBlur = 0;
    path();
    ctx.clip();
    const xs = P.map((p) => p[0]);
    const ys = P.map((p) => p[1]);
    const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys), ox, oy };
    if (o.pixel) {
      // pixel art: desenha o quadro em baixa resolução (cada pixel = o.pixel px da tela),
      // reduz as cores e amplia sem suavizar — mesma cara dos bonecos do jogo
      const px = o.pixel;
      const lw = Math.max(1, Math.ceil(box.w / px));
      const lh = Math.max(1, Math.ceil(box.h / px));
      const off = pixelCanvas(lw, lh);
      const g = off.getContext('2d', { willReadFrequently: true });
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, lw, lh);
      g.setTransform(1 / px, 0, 0, 1 / px, -box.x / px, -box.y / px);
      draw(box, g);
      g.setTransform(1, 0, 0, 1, 0, 0);
      const id = g.getImageData(0, 0, lw, lh);
      const d = id.data;
      const q = o.levels || 6; // tons por canal
      const st = 255 / (q - 1);
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.round(d[i] / st) * st;
        d[i + 1] = Math.round(d[i + 1] / st) * st;
        d[i + 2] = Math.round(d[i + 2] / st) * st;
        d[i + 3] = d[i + 3] < 128 ? 0 : 255;
      }
      g.putImageData(id, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, lw, lh, box.x, box.y, lw * px, lh * px);
    } else draw(box, ctx);
    ctx.restore();
    // a divisória branca (gutter) e o traço preto
    ctx.save();
    path();
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = o.border || '#f8fafc';
    ctx.lineWidth = o.lw || 10;
    ctx.stroke();
    ctx.strokeStyle = '#0b0f19';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- tremida por trauma
  const TR = new Map();
  function trauma(key) {
    let s = TR.get(key);
    if (!s) {
      s = {
        v: 0,
        last: -1,
        add(a) {
          this.v = Math.min(1, this.v + a);
        },
        // offset em px (amp = máximo); chamar uma vez por quadro com o tempo da cena
        offset(t, amp = 26, decay = 0.045) {
          if (this.last >= 0 && t > this.last) this.v = Math.max(0, this.v - decay * (t - this.last));
          if (t < this.last) this.v = 0;
          this.last = t;
          const s2 = this.v * this.v;
          return { x: noise(t * 2.2, 1) * amp * s2, y: noise(t * 2.2, 4) * amp * s2, r: noise(t * 2.2, 9) * 0.02 * s2 };
        }
      };
      TR.set(key, s);
    }
    return s;
  }

  CE.ART = { img, eyes, ball, boot, silhouette, speedRadial, speedLines, halftone, burst, panel, trauma, shade, rgb };
})();
