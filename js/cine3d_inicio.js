// ============================================================================
// CUTSCENES EM 3D — começo da história, refeitas no padrão do gol da Sub-20
// (js/cine3d_u20.js): câmera sempre viva (grua, travelling, push-in), câmera lenta com
// rampa só nos momentos-chave, no máximo um quadro de impacto por cena, closes só em
// quadros de mangá em pixel art (chuteira, bola, mão, silhueta) e pouco texto na tela.
//   prologue_tada_miss • ego_speech • bluelock_door • onigokko
// Lugares: o prólogo no campo do colégio (e a sala do Ego no fim); o discurso e a porta
// no saguão do prédio (onde a conversa do auditório acontece); o pique-pega no Quarto Z
// do prédio (onde a conversa com o Bachira e o Kira acontece).
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
  const rnd = (i, s = 1) => {
    const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  // tempo da ação com câmera lenta (rampa): keys = [[tempo real, tempo da ação], ...]
  const remap = (t, keys) => {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    }
    return keys[keys.length - 1][1] + (t - keys[keys.length - 1][0]);
  };
  const name = () => CE.cinePlayerName();
  const hexOf = (v) => '#' + v.map((c) => Math.round(clamp(c) * 255).toString(16).padStart(2, '0')).join('');
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mixc = (a, b, k) => rgb(a).map((v, i) => v + (rgb(b)[i] - v) * clamp(k));

  // ---------------------------------------------------------------- 3D (pontos [x, y, altura])
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  const act = (K, who, p, o = {}) => K.actor(who, Object.assign({ x: p[0], y: p[1], z: p[2] || 0 }, o));
  const ball = (K, p, o) => K.ball(p[0], p[1], p[2] || 0, o);
  // câmera na mão / tremida (ruído suave, nunca aleatório por quadro)
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp, p[2] + K.noise(f, seed + 7) * amp * 0.6];
  // o scene guarda pontos do mundo em K.st; o overlay recebe tudo já na tela
  const W3 = (p) => ({ __w: p });
  const onScreen = (K) => {
    const st = {};
    Object.keys(K.st || {}).forEach((k) => {
      const v = K.st[k];
      st[k] = v && v.__w ? K.screen(v.__w[0], v.__w[2], v.__w[1]) : v;
    });
    return st;
  };
  // canvas pintado uma vez só
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
  // torres dos refletores do campo (lâmpadas a ~3,3 de altura)
  const TOWERS = [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]];
  const LAMP_Z = 3.33;

  // sombra comprida no chão (sol baixo ou refletor): base em (x, y), comprimento len na direção ang
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
  // mancha de luz no chão (holofote, luz da porta)
  const DISC = {};
  const lightDisc = (K, x, y, r, color, alpha, z = 0.012) => {
    const cv = DISC[color] || (DISC[color] = paint(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    }));
    K.floor({ x0: x - r, y0: y - r, x1: x + r, y1: y + r, z, img: cv, em: true, alpha });
  };
  // cone de luz de holofote (placa em pé, sempre virada para a câmera)
  let CONE = null;
  const coneCv = () =>
    CONE ||
    (CONE = paint(64, 160, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(224,242,254,0.75)');
      gr.addColorStop(1, 'rgba(224,242,254,0.04)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(w / 2 - 3, 0);
      g.lineTo(w / 2 + 3, 0);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.closePath();
      g.fill();
    }));

  // ---------------------------------------------------------------- pós (no overlay)
  // preto e branco com tom azulado ("tempo parado"); circle.inside: só dentro / senão só fora
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
  // quadro de impacto (estilo anime): preto e branco com as cores invertidas, 1–2 quadros
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
  // reflexo da lente nos refletores que aparecem (brilho, risco horizontal, reflexos na diagonal)
  function flares(ctx, K, S, k = 1, tint = '186,230,253') {
    if (k <= 0) return;
    const { W, H } = S;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    TOWERS.forEach(([x, y]) => {
      const p = K.screen(x, LAMP_Z, y);
      if (!p || p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 120) return;
      CE.cineGlow(ctx, p.x, p.y, 110, 'rgba(255,255,255,0.5)', k);
      CE.cineGlow(ctx, p.x, p.y, 36, 'rgba(255,255,255,0.95)', k);
      const gr = ctx.createLinearGradient(p.x - 380, 0, p.x + 380, 0);
      gr.addColorStop(0, `rgba(${tint},0)`);
      gr.addColorStop(0.5, `rgba(${tint},${0.45 * k})`);
      gr.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(p.x - 380, p.y - 2, 760, 4);
      const cx = W / 2;
      const cy = H / 2;
      [[0.45, 24, 'rgba(56,189,248,0.2)'], [0.8, 13, 'rgba(250,204,21,0.18)'], [1.3, 36, 'rgba(99,102,241,0.12)']].forEach(([f, r, col]) => {
        CE.cineGlow(ctx, p.x + (cx - p.x) * f * 2, p.y + (cy - p.y) * f * 2, r, col, k);
      });
    });
    ctx.restore();
  }
  // raio do círculo de cor em volta de um boneco (pela altura dele na tela)
  const figR = (st, def) => (st.feet && st.top ? Math.abs(st.feet.y - st.top.y) * 0.62 : def);
  // olhos acesos na contraluz: p = [x, y, z da cabeça]; só a luz, nada desenhado no rosto
  function litEyes(ctx, K, p, on, color = 'rgba(0,245,212,0.9)') {
    if (on <= 0) return;
    const a = K.screen(p[0], p[2], p[1]);
    const b = K.screen(p[0], p[2] + 0.1, p[1]);
    if (!a || !b) return;
    const u = Math.abs(a.y - b.y) * 10; // px por ladrilho
    [-1, 1].forEach((s) => {
      CE.cineGlow(ctx, a.x + s * u * 0.06, a.y, u * 0.07, color, on);
      CE.cineGlow(ctx, a.x + s * u * 0.06, a.y, u * 0.02, 'rgba(240,253,250,1)', on);
    });
  }

  // ---------------------------------------------------------------- quadros de mangá (pixel art)
  // Os closes nunca são o boneco ampliado: são quadros desenhados em baixa resolução e
  // ampliados sem suavizar (pixel 6 = a escala dos bonecos), com a arte de js/cine_art.js
  const PIX = 6;
  const manga = (ctx, poly, k, from, draw) => {
    const CA = CE.ART;
    if (!CA || k <= 0) return;
    CA.panel(ctx, poly, (b, g) => draw(CA, b, g), { k, from, pixel: PIX });
  };
  // a trave (memória): a bola batendo no poste, rachaduras e linhas de impacto, sem cor
  function artPost(CA, b, g, q) {
    g.fillStyle = '#cbd5e1';
    g.fillRect(b.x, b.y, b.w, b.h);
    const px = b.x + b.w * 0.58 + b.ox;
    CA.speedRadial(g, px, b.y + b.h * 0.5, b.x + b.w * 2, b.y + b.h * 2, { color: 'rgba(15,23,42,0.75)', inner: b.h * 0.2, n: 46, thick: 1.4 });
    // o poste (branco com sombra de célula)
    g.fillStyle = '#f8fafc';
    g.fillRect(px - b.h * 0.07, b.y - 10, b.h * 0.14, b.h + 20);
    g.fillStyle = '#94a3b8';
    g.fillRect(px + b.h * 0.025, b.y - 10, b.h * 0.045, b.h + 20);
    g.strokeStyle = '#0b0f19';
    g.lineWidth = 8;
    g.strokeRect(px - b.h * 0.07, b.y - 10, b.h * 0.14, b.h + 20);
    // rachaduras saindo do ponto do choque
    g.strokeStyle = '#0b0f19';
    g.lineWidth = 7;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      g.beginPath();
      g.moveTo(px - b.h * 0.07, b.y + b.h * 0.48);
      g.lineTo(px - b.h * 0.07 + Math.cos(a) * b.h * 0.12 * q, b.y + b.h * 0.48 + Math.sin(a) * b.h * 0.18 * q);
      g.stroke();
    }
    CA.ball(g, px - b.h * 0.22 - (1 - q) * b.w * 0.25, b.y + b.h * 0.5, b.h * 0.15, { rot: q * 2 });
    CA.halftone(g, b.x, b.y, b.w, b.h, { color: 'rgba(15,23,42,0.35)', from: 'bottom', step: 14 });
  }
  // a chuteira e a bola (o pé na bola, o chute que não veio...)
  function artBoot(CA, b, g, o) {
    g.fillStyle = o.bg || '#dbe4ef';
    g.fillRect(b.x, b.y, b.w, b.h);
    const bx = b.x + b.w * (o.bx ?? 0.6) + b.ox;
    const by = b.y + b.h * (o.by ?? 0.62);
    if (o.radial) CA.speedRadial(g, bx, by, b.x + b.w * 2, b.y + b.h * 2, { color: o.radial, inner: b.h * 0.22, n: 56, thick: 1.6 });
    if (o.lines) CA.speedLines(g, o.lines, b.x + b.w * 2, b.y + b.h * 2, { color: 'rgba(15,23,42,0.5)', n: 30, t: o.t || 0, speed: 24, thick: 7 });
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
  // a mão (pixel art do jogo), tremendo; drop = gota caindo na palma (0..1)
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
        g.fillStyle = '#bae6fd';
        g.fillRect(hx + 7 * s, lerp(b.y - 20, hy + 11 * s, dk * dk), s, s * 1.6);
      }
    }
  }

  // ======================================================================
  // PRÓLOGO • A FINAL REGIONAL (prologue_tada_miss)
  // Campo do colégio ao pôr do sol. Você ataca o gol norte; o Tada vem livre pela direita.
  // Plano a plano: a grua desce até a arrancada (dois zagueiros), o dilema em câmera lenta
  // (quadros: o seu pé na bola / o Tada de braço erguido), o passe com a câmera chicoteando,
  // a bola na trave vista de dentro do gol (o golpe da cena), a eliminação com a grua subindo
  // e o Ego na sala dele assistindo ao replay.
  // ======================================================================
  const ICHINAN = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' };
  const MATSUKAZE = { jerseyPrimary: '#f1f5f9', jerseySecondary: '#2563eb' };
  const KEEPER = { jerseyPrimary: '#15803d', jerseySecondary: '#0f172a' };
  const tadaCd = () => Object.assign({}, CE.getSpeakerCharData('TADA'), ICHINAN, { number: 9 });
  const YOU_P = [52.6, 10.4];
  const TADA_P = [55.3, 9.3];
  // a trave esquerda (face de dentro em x 52,05; o travessão a ~0,9 de altura)
  const POST = [52.0, 6.62];
  // o sol baixo a oeste: as sombras compridas vão para o leste
  const SUN_ANG = -0.28;
  const sunShadow = (K, p, a = 0.32, len = 1.7) => longShadow(K, p[0], p[1], len, SUN_ANG, 0.3, a);
  // a bola do chute do Tada até a trave (A = tempo da ação no plano da trave; bate em 56)
  const TRAVE_HIT = 56;
  const traveBall = (A) => {
    if (A < TRAVE_HIT) {
      const e = ease(seg(A, 0, TRAVE_HIT) * 0.9 + 0.1 * seg(A, 0, TRAVE_HIT));
      const p0 = [TADA_P[0] - 0.3, TADA_P[1] - 0.3, 0.12];
      const p1 = [54.6, 7.5, 0.8];
      const p2 = [POST[0] + 0.14, POST[1] + 0.08, 0.5];
      return [0, 1, 2].map((i) => (1 - e) * (1 - e) * p0[i] + 2 * (1 - e) * e * p1[i] + e * e * p2[i]);
    }
    const a = A - TRAVE_HIT;
    return [POST[0] + 0.14 + a * 0.012, POST[1] + 0.08 + a * 0.045, Math.max(0.05, 0.5 + a * 0.02 - a * a * 0.0011)];
  };
  // o replay pausado no monitor da sala do Ego (pixel art pequena, ampliada pela placa)
  let REPLAY = null;
  const replayCv = () => {
    if (REPLAY && REPLAY.run === CE._cineRun) return REPLAY.cv;
    const cv = paint(128, 72, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, [[0, '#4d6b2a'], [1, '#1f3a10']]);
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect(Math.round(w * 0.62), Math.round(h * 0.2), 1, Math.round(h * 0.55));
      g.fillRect(Math.round(w * 0.62), Math.round(h * 0.2), Math.round(w * 0.36), 1);
      try {
        CE.drawSprite(g, CE.cineYou(ICHINAN), w * 0.3, h * 0.92, 40, { animState: 'shoot', frame: 4 });
        CE.drawSprite(g, tadaCd(), w * 0.74, h * 0.86, 32, { animState: 'call_pass', flipX: true, frame: 4 });
      } catch (e) {}
      g.fillStyle = '#facc15';
      for (let i = 0; i < 7; i++) g.fillRect(Math.round(w * (0.38 + i * 0.045)), Math.round(h * (0.84 - i * 0.012)), 3, 1);
      g.strokeStyle = '#ef4444';
      g.lineWidth = 1;
      g.strokeRect(Math.round(w * 0.2) + 0.5, Math.round(h * 0.36) + 0.5, 22, 30);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let y = 0; y < h; y += 2) g.fillRect(0, y, w, 1);
      g.fillStyle = '#f8fafc';
      g.fillRect(4, 4, 2, 6);
      g.fillRect(8, 4, 2, 6);
      g.strokeStyle = '#22d3ee';
      g.strokeRect(0.5, 0.5, w - 1, h - 1);
    });
    REPLAY = { cv, run: CE._cineRun };
    return cv;
  };
  // a parede de monitores da sala do Ego no prólogo: olheiros (fichas, campinhos, números),
  // por cima da parede da sala (a dela mostra a Espanha, que ainda não aconteceu)
  let SCOUT = null;
  const scoutWall = () =>
    SCOUT ||
    (SCOUT = paint(512, 224, (g, w, h) => {
      g.fillStyle = '#01040b';
      g.fillRect(0, 0, w, h);
      const mw = w / 8;
      const mh = h / 4;
      for (let r = 0; r < 4; r++) {
        for (let i = 0; i < 8; i++) {
          const x = i * mw;
          const y = r * mh;
          const kind = (i * 5 + r * 3) % 4;
          g.fillStyle = '#050b18';
          g.fillRect(x + 2, y + 2, mw - 4, mh - 4);
          if (kind === 0) {
            g.fillStyle = '#0b3a26';
            g.fillRect(x + 6, y + 6, mw - 12, mh - 12);
            g.strokeStyle = 'rgba(220,252,231,0.5)';
            g.lineWidth = 1;
            g.strokeRect(x + 10.5, y + 10.5, mw - 21, mh - 21);
            g.fillStyle = 'rgba(56,189,248,0.9)';
            for (let d = 0; d < 5; d++) g.fillRect(x + 14 + ((d * 17 + i * 7) % (mw - 28)), y + 13 + ((d * 11 + r * 5) % (mh - 24)), 3, 3);
          } else if (kind === 1) {
            g.fillStyle = 'rgba(0,245,212,0.6)';
            for (let b = 0; b < 4; b++) g.fillRect(x + 9, y + 9 + b * 9, (mw - 24) * (0.3 + 0.7 * Math.abs(Math.sin(b * 1.7 + i + r))), 4);
          } else if (kind === 2) {
            g.fillStyle = '#0b1736';
            g.fillRect(x + 6, y + 6, mw - 12, mh - 12);
            g.fillStyle = 'rgba(147,197,253,0.7)';
            g.fillRect(x + mw / 2 - 6, y + 12, 12, 12);
            g.fillRect(x + mw / 2 - 10, y + 26, 20, 16);
          } else {
            g.fillStyle = '#0b1736';
            g.fillRect(x + 6, y + 6, mw - 12, mh - 12);
            g.fillStyle = 'rgba(147,197,253,0.6)';
            g.font = '900 9px "Segoe UI", sans-serif';
            g.textAlign = 'left';
            g.fillText(`#${(i * 37 + r * 13) % 300}`, x + 10, y + 18);
            g.fillStyle = 'rgba(250,204,21,0.6)';
            g.fillRect(x + 10, y + 26, (mw - 20) * (0.2 + 0.6 * Math.abs(Math.cos(i * 2.1 + r))), 3);
          }
          g.strokeStyle = 'rgba(0,245,212,0.55)';
          g.lineWidth = 1.5;
          g.strokeRect(x + 2.5, y + 2.5, mw - 5, mh - 5);
        }
      }
      g.fillStyle = 'rgba(1,4,11,0.35)';
      g.fillRect(0, 0, w, h);
    }));

  const PRO_PH = [180, 170, 150, 170, 170, 190];
  CE.registerCine3D('prologue_tada_miss', {
    phases: PRO_PH,
    music: 'tension',
    title: '⚽ PRÓLOGO • A FINAL REGIONAL',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    tags: ["PLANO 1 • 89' — A ARRANCADA", 'PLANO 2 • O DILEMA', 'PLANO 3 • O PASSE', 'PLANO 4 • A TRAVE', 'PLANO 5 • ELIMINADOS', 'PLANO 6 • ALGUÉM ESTAVA ASSISTINDO'],
    get subs() {
      return [
        [{ from: 10, text: `Final Regional: a bola é de ${name()}.` }],
        [{ from: 44, who: 'TADA', text: '"UM POR TODOS!"', color: '#60a5fa' }],
        [{ from: 0, who: 'VOCÊ', text: '(Passar é o certo... né?)', color: '#00f5d4' }],
        [
          { from: 6, to: 104, text: 'Goleiro batido...' },
          { from: 110, text: 'Na trave.' }
        ],
        [{ from: 30, who: 'VOCÊ', text: '(...e se eu tivesse chutado?)', color: '#00f5d4' }],
        [{ from: 40, who: 'JINPACHI EGO', text: '"Passou? Que desperdício."', color: '#a5f3fc' }]
      ];
    },
    theme: 'school_sunset',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      K.expo(0.98);
      if (phase === 0) {
        // A ARRANCADA: a grua desce das alturas até o travelling de lado com você
        const yy = lerp(20.2, YOU_P[1], t / 180);
        const hop = Math.sin(seg(t, 58, 84) * PI) * 0.22;
        const you = [YOU_P[0], yy, hop];
        act(K, 'you', you, { extra: ICHINAN, face: [YOU_P[0], 6], anim: 'run' });
        sunShadow(K, you);
        // a bola: rola por baixo do carrinho e passa por cima do segundo (cavadinha)
        const chip = seg(t, 112, 138);
        const bz = 0.05 + Math.sin(chip * PI) * 0.36;
        ball(K, [YOU_P[0] + 0.05, yy - 0.32 - Math.abs(Math.sin(t * 0.45)) * 0.05 - chip * 0.2, bz]);
        // zagueiro 1: vem de frente e dá o carrinho por baixo do seu pulo
        const d1 = t < 50 ? lerp(13.4, 15.9, t / 50) : 15.9 + ease(seg(t, 50, 84)) * 1.5;
        act(K, 'ishikari', [YOU_P[0] - 0.12, d1], { extra: MATSUKAZE, face: [YOU_P[0], 24], anim: t < 50 ? 'run' : 'slide', frame: t < 50 ? undefined : 4 });
        sunShadow(K, [YOU_P[0] - 0.12, d1], 0.26);
        // zagueiro 2: estica a perna e a bola passa por cima
        const d2 = t < 104 ? lerp(10.9, 12.9, t / 104) : 12.9;
        act(K, 'shiguma', [YOU_P[0] + 0.2, d2], { extra: MATSUKAZE, face: [YOU_P[0] + 0.4, 24], anim: t < 104 ? 'run' : t < 134 ? 'shoot' : 'idle', frame: t < 104 ? undefined : 4 });
        sunShadow(K, [YOU_P[0] + 0.2, d2], 0.26);
        // o Tada corre livre pela direita; o goleiro sai do gol
        act(K, tadaCd(), [55.7, lerp(19.4, 10.2, t / 180)], { face: [55.5, 6], anim: 'run' });
        act(K, 'fukaku', [53.0, lerp(7.0, 7.9, ease(seg(t, 120, 180)))], { extra: KEEPER, face: [YOU_P[0], 14], anim: t > 120 ? 'run' : 'idle', frame: t > 120 ? undefined : 0 });
        act(K, 'tanaka', [49.6, lerp(15.2, 13.4, t / 180)], { extra: MATSUKAZE, face: [52, 9], anim: 'run' });
        // câmera: do alto (atrás do canto) descendo até rente ao chão, ao lado da jogada
        const k = easeIO(seg(t, 0, 90));
        const push = easeIO(seg(t, 130, 180));
        const eye = mixP([58.2, 21.8, 3.0], [YOU_P[0] + 3.0 - push * 0.5, yy + 1.0, 0.62], k);
        const look = mixP([53.2, 15.2, 0.2], [YOU_P[0] - 0.25, yy - 1.0, 0.42], k);
        cam(K, shake(K, eye, f * 0.6, 0.008), look, lerp(56, 46, k));
        st.d1 = t >= 50 && t < 70;
      } else if (phase === 1) {
        // O DILEMA: o goleiro saindo, o Tada de braço erguido; o tempo desacelera (rampa)
        const A = remap(t, [[0, 0], [40, 40], [150, 66], [170, 86]]);
        act(K, 'you', YOU_P, { extra: ICHINAN, face: [YOU_P[0], 6], anim: 'idle', frame: 4 });
        sunShadow(K, YOU_P);
        ball(K, [YOU_P[0] + 0.05, YOU_P[1] - 0.32, 0.05]);
        const gk = [52.9, lerp(7.9, 9.2, ease(seg(A, 0, 86)))];
        act(K, 'fukaku', gk, { extra: KEEPER, face: YOU_P, anim: 'run', frame: Math.floor(A * 0.5) });
        sunShadow(K, gk, 0.26);
        const tp = [lerp(56.1, TADA_P[0], ease(seg(A, 0, 40))), lerp(10.0, TADA_P[1], ease(seg(A, 0, 40)))];
        act(K, tadaCd(), tp, { face: YOU_P, anim: A > 34 ? 'call_pass' : 'run', frame: Math.floor(A * 0.5) });
        sunShadow(K, tp, 0.26);
        act(K, 'shiguma', [50.7, 10.2], { extra: MATSUKAZE, face: [52.6, 8], anim: 'run', frame: Math.floor(A * 0.5) });
        // atrás e à esquerda de você, baixo: você, o goleiro e o Tada no mesmo quadro
        const k = easeIO(t / 170);
        cam(K, shake(K, [lerp(50.2, 50.8, k), lerp(13.5, 12.9, k), 0.6], f * 0.4, 0.006), [lerp(53.9, 53.6, k), 9.1, 0.5], lerp(50, 45, k));
      } else if (phase === 2) {
        // O PASSE: você toca de lado; a câmera chicoteia acompanhando a bola até o Tada
        const yState = t < 12 ? 'windup' : t < 32 ? 'shoot' : 'idle';
        act(K, 'you', YOU_P, { extra: ICHINAN, face: TADA_P, anim: yState, frame: t < 32 ? 4 : 0 });
        sunShadow(K, YOU_P);
        const tState = t < 80 ? 'idle' : t < 94 ? 'windup' : t < 124 ? 'shoot' : 'idle';
        act(K, tadaCd(), TADA_P, { face: t < 80 ? YOU_P : [POST[0], POST[1]], anim: tState, frame: tState === 'idle' ? 0 : 4 });
        sunShadow(K, TADA_P);
        act(K, 'fukaku', [lerp(52.9, 53.5, ease(seg(t, 20, 90))), 9.2], { extra: KEEPER, face: [TADA_P[0], TADA_P[1]], anim: 'run', frame: Math.floor(t * 0.5) });
        let b;
        if (t < 14) b = [YOU_P[0] + 0.2, YOU_P[1] - 0.2, 0.05];
        else if (t < 96) {
          const e = ease(seg(t, 14, 80));
          b = [lerp(YOU_P[0] + 0.25, TADA_P[0] - 0.28, e), lerp(YOU_P[1] - 0.2, TADA_P[1] + 0.04, e), 0.05];
        } else b = traveBall((t - 96) * 0.5);
        ball(K, b);
        // (a câmera anda de lado com a bola e chicoteia; depois do chute vira para o gol)
        const pan = easeIO(seg(t, 14, 78));
        const after = easeIO(seg(t, 96, 150));
        const eye = [lerp(51.5, 54.4, pan) - after * 0.5, lerp(13.4, 12.8, pan), 0.7];
        const look = [lerp(b[0], 53.0, after * 0.6), lerp(b[1], 7.4, after), 0.4];
        cam(K, shake(K, eye, f, 0.006), look, 44);
        st.pan = Math.sin(seg(t, 14, 78) * PI);
      } else if (phase === 3) {
        // A TRAVE: rente ao chão na linha do gol, do lado de fora do poste; a bola vem em
        // câmera lenta da direita, o goleiro voa e ela explode na trave (o golpe da cena)
        const A = remap(t, [[0, 0], [24, 24], [96, 48], [106, TRAVE_HIT], [170, 120]]);
        const b = traveBall(A);
        ball(K, b, { k: 0.85 });
        const kd = ease(seg(A, 8, 60));
        act(K, 'fukaku', [lerp(53.6, 52.75, kd), 7.45], { extra: KEEPER, z: Math.sin(Math.min(1, kd * 1.15) * PI) * 0.2, face: [53, 14], anim: kd > 0.05 ? 'dive' : 'idle', opts: kd > 0.05 ? { animTime: kd * 34 } : undefined });
        act(K, tadaCd(), TADA_P, { face: [POST[0], POST[1]], anim: A < 40 ? 'shoot' : 'idle', frame: A < 40 ? 4 : 0 });
        act(K, 'you', YOU_P, { extra: ICHINAN, face: TADA_P, anim: 'idle', frame: 0 });
        const HIT_T = 106;
        const hitT = t >= HIT_T;
        const amp = hitT ? 0.035 * Math.max(0, 1 - (t - HIT_T) / 34) : 0.003;
        const k = easeIO(seg(t, 0, 106));
        cam(K, shake(K, [lerp(50.45, 50.6, k), lerp(6.95, 6.85, k), 0.36], f * 2, amp, 5), [lerp(53.6, 53.1, k), lerp(8.0, 7.6, k), 0.5], lerp(54, 50, k));
        st.post = W3([POST[0] + 0.05, POST[1], 0.5]);
        st.ball = W3(b);
        st.hit = hitT;
      } else if (phase === 4) {
        // ELIMINADOS: você parado na área, o céu escurecendo; a grua sobe e se afasta
        const k = easeIO(t / 170);
        K.sky(hexOf(mixc('#312e81', '#0b0a24', k)), hexOf(mixc('#c2410c', '#4a2f5e', k)), 0.4 * k);
        K.expo(0.92 - k * 0.14);
        const you = [52.9, 10.8];
        act(K, 'you', you, { extra: ICHINAN, face: [53, 20], frame: 0, light: [0.62, 0.52, 0.6] });
        sunShadow(K, you, 0.38, 2.4);
        act(K, tadaCd(), [55.0, 9.6], { face: [55, 6], anim: 'kneel_down', frame: 0, light: [0.6, 0.5, 0.6] });
        act(K, 'fukaku', [52.6, 7.3], { extra: KEEPER, face: [53, 14], anim: 'sit_floor', frame: 0 });
        // o Matsukaze comemora lá longe (o gol do contra-ataque foi no outro lado)
        ['ishikari', 'shiguma', 'tanaka', 'sokura'].forEach((id, i) => {
          const x = 50.6 + i * 1.3;
          const y = 18.6 + (i % 2) * 0.7;
          act(K, id, [x, y, Math.abs(Math.sin(t * 0.16 + i * 1.3)) * 0.16], { id: 'm' + i, extra: MATSUKAZE, face: [x + (i % 2 ? 0.6 : -0.6), 24], anim: 'celebrate' });
        });
        cam(K, mixP([55.4, 13.0, 0.5], [57.0, 15.6, 2.7], k), mixP([52.9, 10.8, 0.52], [52.7, 12.2, 0.3], k), lerp(40, 50, k));
      } else {
        // ALGUÉM ESTAVA ASSISTINDO: a sala do Ego, o replay do passe parado no monitor
        const R = CE.c3EgoRoom;
        const VX = R ? R.VX : 86;
        const cut = 100;
        let eye;
        let look;
        let fov;
        if (t < cut) {
          const k = easeIO(seg(t, 0, cut));
          eye = [lerp(VX + 2.1, VX + 1.15, k), lerp(17.4, 15.9, k), lerp(1.3, 1.05, k)];
          look = [lerp(VX + 0.1, VX - 0.3, k), 13.2, lerp(1.0, 1.15, k)];
          fov = 46;
        } else {
          // (o Ego no terço direito: o letreiro do fim entra embaixo, sem cobrir o rosto)
          const k = easeIO(seg(t, cut, 190));
          eye = [lerp(VX + 1.6, VX + 1.3, k), lerp(16.2, 15.95, k), 0.7];
          look = [lerp(VX - 1.35, VX - 1.2, k), 13.7, lerp(0.7, 0.74, k)];
          fov = lerp(48, 45, k);
        }
        if (R) R.build(K, t, [eye[0], eye[2], eye[1]]);
        else {
          K.sky('#01030a', '#040a18', 0);
          K.floor({ x0: VX - 4.5, y0: 12.9, x1: VX + 4.5, y1: 20, color: '#070c16' });
        }
        K.expo(0.95);
        K.quad({ x: VX, y: 13.02, z: 0, w: 8.6, h: 3.75, ang: -PI / 2, img: scoutWall(), color: '#c7d2e0', em: true });
        K.quad({ x: VX - 0.2, y: 13.04, z: 0.95, w: 2.0, h: 1.13, ang: -PI / 2, img: replayCv(), em: true, color: '#e2e8f0' });
        const turn = t > 130;
        act(K, 'EGO', [VX + 0.25, 13.95], { face: turn ? [VX + 1.4, 15.6] : [VX - 0.2, 13.0], k: 0.95, frame: 0, light: [0.45, 0.72, 0.85] });
        cam(K, eye, look, fov);
        st.head = W3([VX + 0.25, 13.95, 0.6]);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, stageH } = S;
      const st = onScreen(K);
      if (phase === 0) {
        flares(ctx, K, S, 0.55, '254,215,170');
        CE.drawSpeedLines(ctx, W, H, '#ffedd5', 0.08 * seg(t, 70, 100));
        CE.inicioScore(ctx, 28, top + 18, 'ICHINAN', 0, 'MATSUKAZE', 0, "89'", seg(t, 6, 20));
        CE.cineSfx(S, 62, 'carrinho', () => window.SFX?.tackle?.());
        CE.cineSfx(S, 118, 'cavadinha', () => window.SFX?.pass?.());
      } else if (phase === 1) {
        // o tempo desacelera: a cor vai embora aos poucos
        bwBlue(ctx, W, H, 0.75 * seg(t, 44, 80));
        CE.inicioScore(ctx, 28, top + 18, 'ICHINAN', 0, 'MATSUKAZE', 0, "89'", 1);
        // os quadros: o seu pé em cima da bola / o Tada lá longe, de braço erguido
        if (t > 72 && t < 162) {
          const kin = seg(t, 72, 82);
          manga(ctx, [[W * 0.04, top + 22], [W * 0.5, top + 14], [W * 0.46, bot - 22], [W * 0.02, bot - 14]], kin, [-W * 0.4, 0], (CA, b, g) =>
            artBoot(CA, b, g, { bg: '#d8dee9', bx: 0.56, by: 0.74, fx: 0.42, fy: 0.5, s: 0.16, ang: 1.25, sock: '#1d4ed8', sock2: '#f8fafc', boot: '#22d3ee', lines: -Math.PI / 2, t: 0, tone: true })
          );
          const k2 = seg(t, 92, 102);
          const tada = K.charData(tadaCd(), {});
          manga(ctx, [[W * 0.54, top + 30], [W - 20, top + 22], [W - 26, top + stageH * 0.62], [W * 0.51, top + stageH * 0.66]], k2, [W * 0.4, 0], (CA, b, g) => {
            CE.cineGradient(g, b.x, b.y, b.w, b.h, [[0, '#1e1b4b'], [0.6, '#9a3412'], [1, '#fdba74']]);
            CA.silhouette(g, tada, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.98, b.h * 1.1, { pose: 'call_pass', frame: 4, fill: '#0b1020', rim: '#fed7aa' });
            CA.halftone(g, b.x, b.y, b.w, b.h, { color: 'rgba(15,23,42,0.3)', from: 'bottom', step: 14 });
          });
        }
        CE.cineSfx(S, 44, 'grito', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        if (st.pan > 0.05) CE.drawSpeedLines(ctx, W, H, '#fff7ed', 0.22 * st.pan);
        CE.inicioScore(ctx, 28, top + 18, 'ICHINAN', 0, 'MATSUKAZE', 0, "89'", 1);
        CE.cineSfx(S, 14, 'passe', () => window.SFX?.pass?.());
        CE.cineSfx(S, 96, 'chute', () => window.SFX?.kick?.(0.6));
      } else if (phase === 3) {
        const HIT_T = 106;
        if (st.ball && t < HIT_T) CE.cineGlow(ctx, st.ball.x, st.ball.y, 50, 'rgba(255,255,255,0.45)', seg(t, 20, 40));
        // o choque: 2 quadros invertidos, clarão curto, linhas, anéis e o CLANG
        if (t >= HIT_T && t < HIT_T + 2) impactFrame(ctx, W, H);
        if (t >= HIT_T) {
          const p = st.post || { x: W * 0.7, y: H * 0.5 };
          CE.cineFlash(ctx, W, H, 0.7 * (1 - seg(t, HIT_T + 1, HIT_T + 8)));
          if (t < HIT_T + 9) CE.drawRadialSpeedLines(ctx, p.x, p.y, W, '#020617', 0.5 * (1 - (t - HIT_T) / 9));
          const kk = (t - HIT_T) / 50;
          if (kk < 1) {
            ctx.save();
            ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - kk)})`;
            ctx.lineWidth = 5;
            for (let r = 0; r < 3; r++) {
              ctx.beginPath();
              ctx.arc(p.x, p.y, 26 + r * 30 + kk * 110, 0, TAU);
              ctx.stroke();
            }
            ctx.restore();
          }
          CE.cineImpactText(ctx, 'CLANG!!', W * 0.36, top + stageH * 0.3, 110, '#f8fafc', seg(t, HIT_T, HIT_T + 6), W * 0.5, -0.1);
        }
        CE.cineSfx(S, HIT_T, 'trave', () => window.SFX?.post?.());
      } else if (phase === 4) {
        CE.inicioScore(ctx, W / 2 - 200, top + 18, 'ICHINAN', 0, 'MATSUKAZE', 1, 'FIM', seg(t, 4, 16), 1 - seg(t, 4, 40));
        // a chance que passou: o chute que não veio, num quadro sem cor (só o seu ciano)
        if (t > 92 && t < 156) {
          const q = seg(t, 92, 150);
          manga(ctx, [[W * 0.56, top + 26], [W - 24, top + 16], [W - 30, bot - 30], [W * 0.6, bot - 20]], seg(t, 92, 101), [W * 0.4, 0], (CA, b, g) => {
            artBoot(CA, b, g, { bg: '#cbd5e1', bx: 0.62, by: 0.45, fx: lerp(0.18, 0.44, easeIO(q)), fy: lerp(0.95, 0.68, easeIO(q)), s: 0.15, ang: lerp(1.0, -0.15, easeIO(q)), sock: '#64748b', sock2: '#e2e8f0', boot: '#22d3ee', radial: 'rgba(15,23,42,0.55)', aura: 'rgba(0,245,212,0.3)', rot: q * 2, tone: true });
          });
        }
        CE.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
      } else {
        const cut = 100;
        if (t >= cut && st.head) {
          // os óculos pegam o brilho dos monitores (um reflexo rápido, sem nada no rosto)
          const g = seg(t, 120, 132) * (1 - seg(t, 150, 170));
          if (g > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            [-1, 1].forEach((s) => CE.cineGlow(ctx, st.head.x + s * 14, st.head.y, 18, 'rgba(224,242,254,0.85)', g));
            ctx.restore();
          }
        }
        if (t >= 120) {
          CE.cineGradient(ctx, 0, top, W, stageH * 0.45, [[0, 'rgba(2,4,10,0.9)'], [1, 'rgba(2,4,10,0)']]);
          CE.cineTitleCard(ctx, W, top + stageH * 0.22, seg(t, 128, 160), { kicker: 'CONVOCAÇÃO', title: 'PROJETO BLUE LOCK', sub: 'O seu ego começa agora.', color: '#00f5d4' });
        }
      }
    }
  });

  // ======================================================================
  // O DISCURSO DE JINPACHI EGO (ego_speech) — o saguão do prédio (a conversa do auditório)
  // Os 300 atacantes no escuro, o Ego entra no palco num holofote, a contraluz do telão,
  // os 299 somem num mundo sem cor e só você fica, aceso.
  // ======================================================================
  const EGO_AT = [25, 10.05];
  const STAGE_Z = 0.26;
  const YOU_S = [24.15, 13.1];
  let CROWD = null;
  const crowd = () => {
    if (CROWD) return CROWD;
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    const cols = A.CREATOR_HAIR_COLORS || ['#1b2340'];
    let s = 7;
    const r = (n) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % n);
    CROWD = [];
    const rows = [11.6, 12.35, 13.1, 16.6, 17.4, 18.2, 19.0];
    rows.forEach((y, row) => {
      for (let i = 0; i < 12; i++) {
        const x = 18.3 + i * 1.18 + (row % 2) * 0.55 + (r(20) - 10) / 100;
        if (x > 32.3) continue;
        // (os pilares, o corredor da câmera e o seu lugar ficam livres)
        if ((Math.abs(x - 21.5) < 0.62 || Math.abs(x - 28.5) < 0.62) && (Math.abs(y - 13.5) < 0.75 || Math.abs(y - 17.5) < 0.75)) continue;
        if (row < 3 && Math.abs(x - 25.6) < 0.9) continue;
        if (Math.abs(x - YOU_S[0]) < 0.45 && Math.abs(y - YOU_S[1]) < 0.4) continue;
        CROWD.push({ x, y, row, order: rnd(CROWD.length, 4), cd: { name: 'atacante' + CROWD.length, skinColor: skins[r(skins.length)], hairColor: cols[r(cols.length)], hairSecondary: cols[r(cols.length)], eyeColor: '#1e293b', hairStyle: hairs[r(hairs.length)], jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: 1 + r(299) } });
      }
    });
    return CROWD;
  };
  const stage = (K, spot) => {
    K.box({ x0: 23.4, y0: 9.35, x1: 26.6, y1: 10.75, z0: 0, z1: STAGE_Z, color: '#0b1220', top: '#111c33' });
    K.box({ x0: 23.4, y0: 10.72, x1: 26.6, y1: 10.76, z0: STAGE_Z - 0.03, z1: STAGE_Z, color: '#22d3ee', em: true, alpha: 0.8 });
    if (spot > 0) {
      lightDisc(K, EGO_AT[0], EGO_AT[1], 0.75, 'rgba(224,242,254,0.95)', 0.55 * spot, STAGE_Z + 0.006);
      K.sprite(coneCv(), { x: EGO_AT[0], y: EGO_AT[1], z: STAGE_Z, w: 1.25, h: 1.9, alpha: 0.5 * spot, glow: true });
    }
  };
  const SPEECH_PH = [180, 200, 120, 220, 190];

  CE.registerCine3D('ego_speech', {
    phases: SPEECH_PH,
    music: 'dread',
    title: '🎙️ O DISCURSO DE JINPACHI EGO',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    tags: ['PLANO 1 • 300 ATACANTES', 'PLANO 2 • JINPACHI EGO', 'PLANO 3 • A CONTRALUZ', 'PLANO 4 • 300 → 1', 'PLANO 5 • O EGO DESPERTA'],
    subs: [
      [{ from: 12, text: 'Ninguém sabe por que foi chamado.' }],
      [{ from: 20, who: 'JINPACHI EGO', text: '"Quero o atacante MAIS EGOÍSTA."', color: '#a5f3fc' }],
      [],
      [{ from: 10, who: 'JINPACHI EGO', text: '"Os 299 NUNCA mais jogam pelo Japão."', color: '#a5f3fc' }],
      [{ from: 14, who: 'VOCÊ', text: '(Aquela trave... nunca mais.)', color: '#00f5d4' }]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      K.expo(0.92);
      const spot = phase === 0 ? seg(t, 40, 70) : 1;
      stage(K, phase >= 3 ? 0.5 : spot);
      // a plateia: no plano 4 ela some aos poucos (cada um na sua vez) e no 5 já não está
      const gone = phase === 3 ? seg(t, 30, 190) : phase === 4 ? 1 : 0;
      crowd().forEach((c, i) => {
        // (nos planos de baixo, quem fica colado na câmera sai do quadro)
        if ((phase === 1 || phase === 2) && Math.hypot(c.x - 25.7, c.y - 12.7) < 1.6) return;
        const a = gone > 0 ? clamp(1 - (gone - c.order * 0.92) * 9) : 1;
        if (a <= 0.02) return;
        act(K, c.cd, [c.x, c.y], { id: i, face: EGO_AT, frame: 0, alpha: a, k: 0.86, light: phase <= 2 ? [0.55, 0.62, 0.8] : undefined });
      });
      const youLit = phase === 4 ? [1.15, 1.3, 1.35] : phase === 3 ? [1.0, 1.1, 1.2] : [0.6, 0.66, 0.82];
      act(K, 'you', YOU_S, { face: EGO_AT, frame: 0, k: 0.88, light: youLit });
      if (phase >= 3) lightDisc(K, YOU_S[0], YOU_S[1], 0.7, 'rgba(224,242,254,0.95)', 0.6 * (phase === 4 ? 1 : seg(t, 60, 120)));
      if (phase === 0) {
        // A GRUA: por cima das cabeças, entrando devagar até o palco; o Ego entra no holofote
        // em câmera lenta (rampa: a poeira na luz também desacelera)
        const A = remap(t, [[0, 0], [66, 66], [150, 92], [180, 122]]);
        const walk = easeIO(seg(A, 64, 100));
        const ego = [lerp(23.55, EGO_AT[0], walk), EGO_AT[1], STAGE_Z];
        act(K, 'EGO', ego, { face: walk < 1 ? [27, EGO_AT[1]] : [25, 14], anim: walk > 0 && walk < 1 ? 'run' : 'idle', frame: walk > 0 && walk < 1 ? Math.floor(A * 0.4) : 0, k: 0.95, light: [0.9 + spot * 0.3, 0.95 + spot * 0.3, 1.1 + spot * 0.25] });
        const k = easeIO(seg(t, 0, 180));
        cam(K, shake(K, mixP([25.4, 20.6, 1.72], [25.1, 18.2, 1.42], k), f * 0.4, 0.006), mixP([25, 10.2, 0.62], [25, 10.05, 0.78], k), lerp(54, 46, k));
        st.lamp = W3([EGO_AT[0], EGO_AT[1], 2.0]);
        st.A = A;
      } else if (phase === 1) {
        // contra-plongée no meio da plateia: o Ego visto de baixo, a câmera subindo de lado
        act(K, 'EGO', [EGO_AT[0], EGO_AT[1], STAGE_Z], { face: [25.6, 13], frame: 0, k: 0.95, light: [1.2, 1.25, 1.35] });
        const k = easeIO(t / 200);
        cam(K, shake(K, [lerp(25.85, 25.55, k), lerp(12.95, 12.5, k), lerp(0.42, 0.56, k)], f * 0.4, 0.005), [EGO_AT[0], EGO_AT[1], lerp(0.88, 0.96, k)], lerp(46, 42, k));
        st.lamp = W3([EGO_AT[0], EGO_AT[1], 2.0]);
        st.ego = W3([EGO_AT[0], EGO_AT[1], 0.7]);
      } else if (phase === 2) {
        // A CONTRALUZ: o telão estoura de branco atrás dele; o Ego vira silhueta
        const white = seg(t, 6, 30);
        K.quad({ x: 25, y: 9.03, z: 0.42, w: 3.2, h: 0.95, ang: -PI / 2, color: '#e0f2fe', em: true, alpha: white });
        act(K, 'EGO', [EGO_AT[0], EGO_AT[1], STAGE_Z], { face: [25, 14], frame: 0, k: 0.95, light: [lerp(1.1, 0.16, white), lerp(1.1, 0.19, white), lerp(1.25, 0.28, white)] });
        const k = easeIO(t / 120);
        cam(K, [lerp(25.62, 25.5, k), lerp(12.6, 12.4, k), 0.42], [EGO_AT[0], EGO_AT[1], 0.9], lerp(42, 39, k));
        st.tela = W3([25, 9.03, 0.9]);
        st.head = W3([EGO_AT[0], EGO_AT[1], STAGE_Z + 0.6]);
      } else if (phase === 3) {
        // 300 → 1: plano alto e aberto; o mundo perde a cor e a plateia some, só você fica
        act(K, 'EGO', [EGO_AT[0], EGO_AT[1], STAGE_Z], { face: YOU_S, frame: 0, k: 0.95 });
        const k = easeIO(t / 220);
        cam(K, shake(K, mixP([25.3, 19.75, 1.5], [24.6, 18.7, 1.3], k), f * 0.3, 0.004), mixP([24.6, 12.9, 0.1], [24.2, 13.0, 0.28], k), lerp(58, 48, k));
        st.you = W3([YOU_S[0], YOU_S[1], 0.45]);
        st.feet = W3([YOU_S[0], YOU_S[1], 0]);
        st.top = W3([YOU_S[0], YOU_S[1], 0.9]);
      } else {
        // O EGO DESPERTA: de frente, baixo; o mundo sem cor e só você aceso
        const k = easeIO(t / 190);
        cam(K, [lerp(23.35, 23.55, k), lerp(10.7, 10.9, k), lerp(0.48, 0.52, k)], [YOU_S[0], YOU_S[1], 0.55], lerp(46, 42, k));
        st.you = W3([YOU_S[0], YOU_S[1], 0.45]);
        st.feet = W3([YOU_S[0], YOU_S[1], 0]);
        st.top = W3([YOU_S[0], YOU_S[1], 0.9]);
        K.headAt = [YOU_S[0], YOU_S[1], 0.56];
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, stageH } = S;
      const st = onScreen(K);
      if (phase === 0) {
        if (st.lamp) CE.cineShafts(ctx, st.lamp.x, st.lamp.y, PI / 2, stageH * 0.7, 0.28, 4, '224,242,254', 0.12 * seg(t, 40, 70), t);
        if (st.lamp) CE.cineDust(ctx, W, H, st.A || t, 26, 'rgba(224,242,254,0.55)', 9);
        CE.luckKicker(ctx, 40, top + 30, 'PROJETO BLUE LOCK • 300 ATACANTES SUB-18', seg(t, 10, 60), '#22d3ee');
        CE.cineSfx(S, 40, 'holofote', () => window.SFX?.tackle?.());
      } else if (phase === 1) {
        if (st.lamp) CE.cineShafts(ctx, st.lamp.x, st.lamp.y, PI / 2, stageH * 0.75, 0.3, 4, '224,242,254', 0.12, t);
        if (st.ego) CE.cineGlow(ctx, st.ego.x, st.ego.y, 170, 'rgba(165,243,252,0.14)', 0.9);
      } else if (phase === 2) {
        if (st.tela) CE.cineGlow(ctx, st.tela.x, st.tela.y, 420, 'rgba(224,242,254,0.55)', seg(t, 6, 30));
        // só os óculos acendem na silhueta
        if (st.head) {
          const g = seg(t, 46, 58) * (1 - seg(t, 104, 118));
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          [-1, 1].forEach((s) => {
            CE.cineGlow(ctx, st.head.x + s * 16, st.head.y, 22, 'rgba(165,243,252,0.85)', g);
            CE.cineGlow(ctx, st.head.x + s * 16, st.head.y, 7, 'rgba(255,255,255,1)', g);
          });
          ctx.restore();
        }
        CE.cineSfx(S, 8, 'telao', () => window.SFX?.whoosh?.());
      } else if (phase === 3) {
        // o mundo perde a cor; você continua colorido dentro do seu holofote
        const p = st.you || { x: W / 2, y: H * 0.6 };
        bwBlue(ctx, W, H, seg(t, 10, 50), { inside: false, x: p.x, y: p.y, r: figR(st, 46) });
        CE.cineGlow(ctx, p.x, p.y, 120, 'rgba(224,242,254,0.25)', seg(t, 60, 120));
        CE.cineSfx(S, 30, 'some', () => window.SFX?.whoosh?.());
      } else {
        const p = st.you || { x: W / 2, y: H * 0.6 };
        bwBlue(ctx, W, H, 1, { inside: false, x: p.x, y: p.y, r: figR(st, 120) });
        CE.cineGlow(ctx, p.x, p.y, 220, 'rgba(186,230,253,0.18)', 0.9);
        if (K.headAt) litEyes(ctx, K, K.headAt, seg(t, 46, 62) * (1 - seg(t, 92, 100) * 0.6));
        // a memória: a bola na trave, num quadro sem cor
        if (t > 96 && t < 160) {
          manga(ctx, [[W * 0.58, top + 24], [W - 22, top + 14], [W - 30, bot - 24], [W * 0.62, bot - 16]], seg(t, 96, 104), [W * 0.4, 0], (CA, b, g) => artPost(CA, b, g, seg(t, 100, 116)));
        }
        if (t > 160) {
          ctx.fillStyle = `rgba(0,0,0,${seg(t, 160, 190)})`;
          ctx.fillRect(0, 0, W, H);
        }
        CE.cineSfx(S, 48, 'olhos', () => window.SFX?.whoosh?.());
        CE.cineSfx(S, 100, 'trave', () => window.SFX?.post?.());
      }
    }
  });

  // ======================================================================
  // A PORTA DO BLUE LOCK (bluelock_door) — no saguão, onde a conversa acontece
  // A porta de aço fica na parede leste, na passagem para o túnel do treino; o Ego num
  // pedestal ao lado dela. Você sai da plateia, a tranca gira, as folhas se abrem em câmera
  // lenta e a luz engole você; do outro lado (o túnel), a porta se fecha atrás.
  // ======================================================================
  const DR = { x: 33.0, y: 14.5, w: 2.4, h: 1.8 };
  const PED = [32.05, 12.15];
  let DOOR = null;
  const doorArt = (spin) => {
    if (!DOOR) {
      const full = paint(560, 680);
      DOOR = { full, L: paint(220, 600), R: paint(220, 600), spin: null };
    }
    if (DOOR.spin === spin) return false;
    DOOR.spin = spin;
    const g = DOOR.full.g;
    g.clearRect(0, 0, 560, 680);
    CE.inicioDoor(g, 280, 60, 440, 600, 0, 0, spin);
    // (vista da sala, a folha da esquerda é a do norte)
    DOOR.L.g.clearRect(0, 0, 220, 600);
    DOOR.L.g.drawImage(DOOR.full, 60, 60, 220, 600, 0, 0, 220, 600);
    DOOR.R.g.clearRect(0, 0, 220, 600);
    DOOR.R.g.drawImage(DOOR.full, 280, 60, 220, 600, 0, 0, 220, 600);
    return true;
  };
  // a porta na parede (open 0..1), a fresta acesa e a luz do outro lado
  const doorSet = (K, open, spin, seam = 1) => {
    const dirty = doorArt(spin);
    const half = DR.w / 2;
    const gap = open * half * 1.02;
    const y0 = DR.y - half;
    const y1 = DR.y + half;
    const xf = DR.x - 0.12;
    // moldura de aço e o friso aceso
    K.box({ x0: xf - 0.04, y0: y0 - 0.22, x1: DR.x, y1: y1 + 0.22, z0: DR.h, z1: DR.h + 0.22, color: '#0b1324', top: '#111c33' });
    K.box({ x0: xf - 0.04, y0: y0 - 0.22, x1: DR.x, y1: y0 - 0.06, z0: 0, z1: DR.h, color: '#0b1324' });
    K.box({ x0: xf - 0.04, y0: y1 + 0.06, x1: DR.x, y1: y1 + 0.22, z0: 0, z1: DR.h, color: '#0b1324' });
    K.box({ x0: xf - 0.07, y0: y0 - 0.08, x1: xf - 0.03, y1: y1 + 0.08, z0: DR.h + 0.02, z1: DR.h + 0.06, color: '#0ea5e9', em: true });
    K.box({ x0: xf - 0.07, y0: y0 - 0.08, x1: xf - 0.03, y1: y0 - 0.04, z0: 0, z1: DR.h + 0.06, color: '#0ea5e9', em: true });
    K.box({ x0: xf - 0.07, y0: y1 + 0.04, x1: xf - 0.03, y1: y1 + 0.08, z0: 0, z1: DR.h + 0.06, color: '#0ea5e9', em: true });
    // a luz do outro lado (só no vão aberto) e a luz espalhando no chão do saguão
    if (open > 0) {
      K.quad({ x: DR.x - 0.02, y: DR.y, z: 0, w: Math.max(0.01, gap * 2), h: DR.h, ang: PI, color: '#ecfeff', em: true });
      K.floor({ x0: DR.x - 3.2 * open - 0.4, y0: DR.y - gap - 0.1, x1: DR.x - 0.1, y1: DR.y + gap + 0.1, z: 0.01, color: '#cffafe', alpha: 0.35 * open, em: true });
    }
    // as duas folhas de aço deslizando para dentro da parede
    K.box({ x0: xf, y0: y0 - gap, x1: xf + 0.08, y1: DR.y - gap, z0: 0, z1: DR.h, img: DOOR.L, dirty, color: '#ffffff', light: [1.1, 1.15, 1.25] });
    K.box({ x0: xf, y0: DR.y + gap, x1: xf + 0.08, y1: y1 + gap, z0: 0, z1: DR.h, img: DOOR.R, dirty, color: '#ffffff', light: [1.1, 1.15, 1.25] });
    if (open <= 0) K.quad({ x: xf - 0.005, y: DR.y, z: 0, w: 0.035, h: DR.h, ang: PI, color: '#a5f3fc', em: true, alpha: 0.5 + 0.4 * seam });
  };
  let DOOR_CROWD = null;
  const doorCrowd = () => {
    if (DOOR_CROWD) return DOOR_CROWD;
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    const cols = A.CREATOR_HAIR_COLORS || ['#1b2340'];
    let s = 11;
    const r = (n) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % n);
    DOOR_CROWD = [];
    for (let c = 0; c < 7; c++) {
      for (let row = 0; row < 12; row++) {
        const x = 30.4 - c * 0.78 + (r(20) - 10) / 100;
        const y = 10.0 + row * 0.82 + (c % 2) * 0.4;
        if (y > 19.8) continue;
        if (Math.abs(x - 28.5) < 0.6 && (Math.abs(y - 13.5) < 0.7 || Math.abs(y - 17.5) < 0.7)) continue;
        if (x < 29.3 && y > 14.1 && y < 16.1) continue; // os sofás
        if (Math.abs(y - DR.y) < (x < 28.9 ? 1.35 : 0.78)) continue; // o corredor até a porta (mais largo perto da câmera)
        DOOR_CROWD.push({ x, y, cd: { name: 'porta' + DOOR_CROWD.length, skinColor: skins[r(skins.length)], hairColor: cols[r(cols.length)], hairSecondary: cols[r(cols.length)], eyeColor: '#1e293b', hairStyle: hairs[r(hairs.length)], jerseyPrimary: '#0f2942', jerseySecondary: '#1d4ed8', number: 1 + r(299) } });
      }
    }
    return DOOR_CROWD;
  };
  const DOOR_PH = [160, 130, 190, 160];

  CE.registerCine3D('bluelock_door', {
    phases: DOOR_PH,
    music: 'mystery',
    title: '🚪 A PORTA DO BLUE LOCK',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    tags: ['PLANO 1 • A PORTA', 'PLANO 2 • SEM OLHAR PRA TRÁS', 'PLANO 3 • A PORTA SE ABRE', 'PLANO 4 • BEM-VINDO AO BLUE LOCK'],
    subs: [
      [{ from: 10, who: 'JINPACHI EGO', text: '"Daqui não tem volta."', color: '#a5f3fc' }],
      [{ from: 10, who: 'VOCÊ', text: '(Eu vou ser o 1.)', color: '#00f5d4' }],
      [{ from: 70, text: 'A luz do Blue Lock engole tudo.' }],
      [{ from: 8, text: 'Atrás de você, a porta se fecha.' }]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      if (phase === 3) {
        // o túnel do treino, do outro lado: você vem na direção da câmera e a luz da porta
        // atrás de você vai se fechando
        K.expo(0.9);
        const close = 1 - easeIO(seg(t, 40, 112));
        if (close > 0) K.quad({ x: 34.02, y: 14.5, z: 0, w: Math.max(0.01, 0.98 * close), h: 1.12, ang: 0, color: '#ecfeff', em: true });
        const wx = lerp(34.3, 37.4, ease(seg(t, 0, 130)));
        act(K, 'you', [wx, 14.5], { face: [42, 14.5], anim: t < 128 ? 'run' : 'idle', frame: t < 128 ? Math.floor(f * 0.45) : 0, light: [lerp(0.5, 0.95, seg(t, 40, 120)), lerp(0.62, 1.0, seg(t, 40, 120)), lerp(0.78, 1.1, seg(t, 40, 120))] });
        const k = easeIO(t / 160);
        cam(K, shake(K, [lerp(40.4, 41.3, k), 14.5, lerp(0.7, 0.78, k)], f * 0.4, 0.004), [lerp(35.0, 36.2, k), 14.5, 0.75], lerp(44, 48, k));
        st.door = W3([34.0, 14.5, 0.6]);
        st.open = close;
        return;
      }
      K.expo(0.9);
      // (plano 3: a tranca gira e as folhas abrem em câmera lenta)
      const A = phase === 2 ? remap(t, [[0, 0], [44, 44], [130, 76], [190, 136]]) : 0;
      const open = phase === 2 ? easeIO(seg(A, 48, 100)) : 0;
      const spin = phase === 2 ? (Math.round(ease(seg(t, 0, 42)) * 24) / 16) * PI : phase === 0 ? Math.round(t * 0.01 * 16) / 16 : 0;
      doorSet(K, open, spin, 0.5 + 0.5 * Math.sin(t * 0.08));
      if (phase === 2) K.expo(0.9 + open * 0.35);
      // o Ego no pedestal ao lado da porta, num cone de luz
      K.box({ x0: PED[0] - 0.42, y0: PED[1] - 0.42, x1: PED[0] + 0.42, y1: PED[1] + 0.42, z0: 0, z1: 0.3, color: '#0b1220', top: '#1b2a4a' });
      if (phase !== 1) K.sprite(coneCv(), { x: PED[0], y: PED[1], z: 0.3, w: 1.05, h: 1.75, alpha: 0.55, glow: true });
      act(K, 'EGO', [PED[0], PED[1], 0.3], { face: [27, 14.5], frame: 0, k: 0.95, light: [1.05, 1.15, 1.35] });
      // a plateia olhando a porta
      doorCrowd().forEach((c, i) => (phase === 2 && c.x < 30.3 && Math.abs(c.y - DR.y) < 1.8 ? null : act(K, c.cd, [c.x, c.y], { id: i, face: [DR.x, DR.y], frame: 0, k: 0.86, light: phase === 2 ? [0.3 + open * 0.5, 0.36 + open * 0.55, 0.5 + open * 0.55] : [0.4, 0.47, 0.62] })));
      if (phase === 0) {
        // A PORTA: de trás da plateia, a grua descendo devagar na direção dela
        act(K, 'you', [30.55, DR.y], { face: [DR.x, DR.y], frame: 0, light: [0.55, 0.68, 0.85] });
        const k = easeIO(t / 160);
        cam(K, shake(K, mixP([25.4, 16.6, 1.7], [26.9, 15.9, 1.38], k), f * 0.4, 0.006), mixP([32.6, 13.6, 0.95], [32.6, 13.9, 0.9], k), lerp(56, 50, k));
        st.door = W3([DR.x, DR.y, DR.h * 0.5]);
        st.ego = W3([PED[0], PED[1], 0.3 + 0.6]);
      } else if (phase === 1) {
        // SEM OLHAR PRA TRÁS: rente ao chão, de frente; você sai da plateia na direção da porta
        const step = easeIO(seg(t, 10, 90));
        const yx = lerp(30.0, 30.45, step);
        act(K, 'you', [yx, DR.y], { face: [DR.x, DR.y], anim: step > 0 && step < 1 ? 'run' : 'idle', frame: step > 0 && step < 1 ? Math.floor(f * 0.3) : 0, light: [0.75, 1.05, 1.2] });
        const k = easeIO(t / 130);
        cam(K, shake(K, [32.75, lerp(15.35, 15.15, k), lerp(0.38, 0.44, k)], f * 0.4, 0.004), [yx, DR.y, 0.55], lerp(46, 43, k));
        st.you = W3([yx, DR.y, 0.5]);
      } else {
        // A PORTA SE ABRE: por trás de você, um pouco de lado; você entra na luz
        const walk = easeIO(seg(A, 96, 136));
        const yx = lerp(30.6, 33.3, walk);
        const dark = open;
        act(K, 'you', [yx, DR.y], { face: [DR.x + 1, DR.y], anim: walk > 0 && walk < 1 ? 'run' : 'idle', frame: walk > 0 && walk < 1 ? Math.floor(A * 0.4) : 0, alpha: 1 - seg(yx, 32.4, 33.1), light: [lerp(0.55, 0.16, dark), lerp(0.66, 0.2, dark), lerp(0.85, 0.3, dark)] });
        const lock = t >= 42 && t < 70 ? 0.03 * (1 - seg(t, 42, 70)) : 0.004;
        const k = easeIO(t / 190);
        cam(K, shake(K, [lerp(28.1, 28.6, k), lerp(14.85, 14.75, k), lerp(0.95, 0.9, k)], f * 2, lock, 4), [DR.x, DR.y, lerp(0.85, 0.95, k)], lerp(52, 48, k));
        st.door = W3([DR.x - 0.1, DR.y, DR.h * 0.5]);
        st.open = open;
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, stageH } = S;
      const st = onScreen(K);
      if (phase === 0) {
        if (st.door) CE.cineGlow(ctx, st.door.x, st.door.y, 160, 'rgba(34,211,238,0.16)', 0.6 + 0.4 * Math.sin(t * 0.08));
        // os óculos do Ego pegam a luz da fresta
        if (st.ego) {
          const g = seg(t, 80, 92) * (1 - seg(t, 116, 130));
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          [-1, 1].forEach((s) => CE.cineGlow(ctx, st.ego.x + s * 7, st.ego.y, 12, 'rgba(224,242,254,0.9)', g));
          ctx.restore();
        }
        CE.luckKicker(ctx, 40, top + 30, 'SAGUÃO • A PORTA DO BLUE LOCK', seg(t, 10, 60), '#22d3ee');
      } else if (phase === 1) {
        // a linha sem volta: a sua chuteira passando por cima do friso aceso do chão
        if (t > 50 && t < 122) {
          const q = seg(t, 50, 118);
          manga(ctx, [[W * 0.52, top + stageH * 0.42], [W - 22, top + stageH * 0.36], [W - 28, bot - 18], [W * 0.56, bot - 12]], seg(t, 50, 58), [W * 0.4, 0], (CA, b, g) => {
            CE.cineGradient(g, b.x, b.y, b.w, b.h, [[0, '#94a3b8'], [1, '#334155']]);
            const ly = b.y + b.h * 0.8;
            g.fillStyle = '#22d3ee';
            g.fillRect(b.x, ly, b.w, PIX * 2);
            g.fillStyle = 'rgba(165,243,252,0.35)';
            g.fillRect(b.x, ly - PIX * 3, b.w, PIX * 3);
            CA.speedLines(g, 0, b.x + b.w * 2, b.y + b.h * 2, { color: 'rgba(148,163,184,0.25)', n: 18, t: q * 20, speed: 10, thick: 5 });
            CA.boot(g, b.x + b.w * lerp(0.2, 0.62, easeIO(q)) + b.ox, ly - b.h * (0.05 + Math.sin(q * PI) * 0.16), b.h * 0.2, { sock: '#0f2942', sock2: '#38bdf8', boot: '#22d3ee', ang: lerp(0.25, -0.1, q) });
          });
        }
        CE.cineSfx(S, 60, 'passo', () => window.SFX?.kick?.(0.15));
      } else if (phase === 2) {
        const open = st.open || 0;
        const d = st.door;
        if (d && open > 0) {
          CE.cineShafts(ctx, d.x, d.y, PI, stageH * 1.2, 1.0, 6, '207,250,254', 0.18 * open, t);
          CE.cineGlow(ctx, d.x, d.y, 460 * open, 'rgba(207,250,254,0.75)', open * 0.85);
          CE.cineDust(ctx, W, H, t, 40, 'rgba(224,242,254,0.8)', 5);
        }
        // clarão curto quando a porta termina de abrir
        CE.cineFlash(ctx, W, H, t >= 128 && t < 137 ? 0.55 * (1 - (t - 128) / 9) : 0, '#e0f2fe');
        CE.cineSfx(S, 42, 'tranca', () => window.SFX?.tackle?.());
        CE.cineSfx(S, 50, 'abre', () => window.SFX?.whoosh?.());
      } else {
        if (st.door && st.open > 0) CE.cineGlow(ctx, st.door.x, st.door.y, 240 * st.open + 40, 'rgba(207,250,254,0.6)', st.open);
        CE.cineGradient(ctx, 0, top, W, stageH * 0.42, [[0, 'rgba(2,6,23,0.88)'], [1, 'rgba(2,6,23,0)']]);
        CE.cineTitleCard(ctx, W, top + stageH * 0.2, seg(t, 54, 84), { kicker: 'PRÉDIO 5 • QUARTO Z', title: 'BEM-VINDO AO BLUE LOCK', sub: `${name()} • 299º de 300 no ranking`, color: '#00f5d4' });
        CE.cineSfx(S, 106, 'fecha', () => window.SFX?.tackle?.());
      }
    }
  });

  // ======================================================================
  // O PIQUE-PEGA DO QUARTO Z (onigokko) — o Quarto Z do prédio (onde a conversa acontece)
  // Todo mundo fugindo da bola; ela bate em você com 10 s no relógio; o tempo quase para
  // (sem cor) e só o Kira, perto e de costas, fica colorido; o chute e a bola na cabeça
  // dele (o golpe da cena); 0:00 e o alarme.
  // ======================================================================
  const RQ = { x0: 9.0, x1: 16.0, y0: 22.0, y1: 30.0 };
  const LED = { x: 14.35, y: 22.03, z: 1.02, w: 1.15, h: 0.49 };
  let TIMER = null;
  // o painel do tempo na parede (redesenha só quando muda)
  const timerCv = (secs, urgent, t, out) => {
    if (!TIMER) TIMER = { cv: paint(260, 110), key: '' };
    const s = Math.max(0, Math.ceil(secs));
    const blink = urgent ? Math.floor(t / 8) % 2 : 0;
    const key = s + '|' + (urgent ? 1 : 0) + '|' + blink + '|' + (out ? 1 : 0);
    if (key === TIMER.key) return false;
    TIMER.key = key;
    const g = TIMER.cv.g;
    g.clearRect(0, 0, 260, 110);
    if (out) {
      g.fillStyle = '#1a0306';
      g.fillRect(0, 0, 260, 110);
      g.strokeStyle = '#ef4444';
      g.lineWidth = 6;
      g.strokeRect(3, 3, 254, 104);
      g.font = '900 30px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = blink ? '#7f1d1d' : '#ef4444';
      g.fillText('KIRA • FORA', 130, 56);
    } else CE.inicioTimer(g, 130, 55, s, urgent, 1, blink ? 0 : 5.2);
    return true;
  };
  const roomFx = (K, o) => {
    const alarm = o.alarm || 0;
    K.ambient(hexOf(mixc('#f1f5ff', '#ffc9d2', alarm)));
    K.expo(o.expo || 1.12);
    const dirty = timerCv(o.secs, o.urgent, o.t, o.out);
    K.quad({ x: LED.x, y: LED.y, z: LED.z, w: LED.w, h: LED.h, ang: -PI / 2, img: TIMER.cv, em: true, dirty });
    if (alarm > 0) lightDisc(K, 12.5, 26, 3.4, 'rgba(239,68,68,0.9)', alarm * 0.35);
  };
  const TAG_IDS = ['bachira', 'kunigami', 'chigiri', 'gagamaru', 'igarashi', 'raichi'];
  const KIRA = () => CE.getSpeakerCharData('RYOSUKE KIRA');
  let TAG_X = null;
  const tagExtras = () => {
    if (TAG_X) return TAG_X;
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    const cols = A.CREATOR_HAIR_COLORS || ['#1b2340'];
    let s = 23;
    const r = (n) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % n);
    TAG_X = [];
    for (let i = 0; i < 5; i++) TAG_X.push({ name: 'quartoz' + i, skinColor: skins[r(skins.length)], hairColor: cols[r(cols.length)], hairSecondary: cols[r(cols.length)], eyeColor: '#1e293b', hairStyle: hairs[r(hairs.length)], jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8', number: 1 + r(299) });
    return TAG_X;
  };
  const BL = { kit: 'blueLock' };
  // quem corre no plano aberto (voltas em volta do meio do quarto)
  const runners = () => {
    const L = TAG_IDS.map((id) => [id, BL]).concat([[KIRA(), BL], ['you', BL]]).concat(tagExtras().map((c) => [c, {}]));
    return L.map(([who, o], i) => ({ who, o, cx: 12.5 + (((i * 37) % 5) - 2) * 0.3, cy: 25.9 + (((i * 53) % 3) - 1) * 0.3, rx: 0.9 + (i % 4) * 0.33, ry: 0.8 + (i % 3) * 0.4, dir: i % 2 ? 1 : -1, a0: i * 0.8 }));
  };
  // o lance: onde você está, onde o Kira está (de costas) e o caminho da bola
  const YQ = [11.2, 26.7];
  const KQ = [14.3, 25.2];
  const QKICK = 22;
  const QHIT = 52;
  const kickBall = (A) => {
    if (A < QKICK) return [YQ[0] + 0.3, YQ[1] - 0.05, 0.05];
    if (A < QHIT) {
      const e = seg(A, QKICK, QHIT);
      return [lerp(YQ[0] + 0.32, KQ[0] - 0.06, e), lerp(YQ[1] - 0.05, KQ[1] + 0.02, e), lerp(0.1, 0.66, e) + Math.sin(e * PI) * 0.12];
    }
    const q = A - QHIT;
    return [KQ[0] - 0.06 - q * 0.028, KQ[1] + 0.02 + q * 0.012, Math.max(0.05, 0.66 + q * 0.024 - q * q * 0.0011)];
  };
  const ONI_PH = [170, 150, 180, 150, 220];

  CE.registerCine3D('onigokko', {
    phases: ONI_PH,
    music: 'tension',
    title: '⏱️ O PIQUE-PEGA DO QUARTO Z',
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.5,
    tags: ['PLANO 1 • QUARTO Z: PIQUE-PEGA', 'PLANO 2 • A BOLA É SUA', 'PLANO 3 • QUEM É O ALVO?', 'PLANO 4 • O CHUTE', 'PLANO 5 • RYOSUKE KIRA, ELIMINADO'],
    subs: [
      [{ from: 8, who: 'JINPACHI EGO', text: '"Bola no fim? ELIMINADO."', color: '#a5f3fc' }],
      [{ from: 30, who: 'VOCÊ', text: '(Se eu não passar, tô fora!)', color: '#00f5d4' }],
      [{ from: 10, who: 'VOCÊ', text: '(Quem está perto... e distraído?)', color: '#00f5d4' }],
      [{ from: 92, text: 'Na cabeça!' }],
      [{ from: 20, who: 'VOCÊ', text: '(Chutei sem pensar. Eu não quero ir embora.)', color: '#00f5d4' }]
    ],
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      if (phase === 0) {
        // PIQUE-PEGA: do alto, num canto; todo mundo fugindo da bola, o tempo correndo
        roomFx(K, { secs: lerp(136, 11, easeIO(seg(t, 10, 165))), t });
        const pos = runners().map((r, i) => {
          const a = r.a0 + r.dir * t * 0.03;
          const x = r.cx + Math.cos(a) * r.rx;
          const y = r.cy + Math.sin(a) * r.ry;
          act(K, r.who, [x, y], Object.assign({ id: 'r' + i, face: [x - Math.sin(a) * r.dir, y + Math.cos(a) * r.dir], anim: 'run', frame: f + i * 3 }, r.o));
          return [x, y];
        });
        const hop = (t % 40) / 40;
        const iA = Math.floor(t / 40) % pos.length;
        const a = pos[iA];
        const b = pos[(iA + 3) % pos.length];
        ball(K, [lerp(a[0], b[0], hop), lerp(a[1], b[1], hop), 0.35 + Math.sin(hop * PI) * 0.7]);
        const k = easeIO(t / 170);
        cam(K, shake(K, [lerp(15.35, 14.9, k), 29.55, lerp(1.52, 1.46, k)], f * 0.5, 0.005), [lerp(11.6, 12.8, k), lerp(24.6, 25.0, k), 0.15], 62);
      } else if (phase === 1) {
        // A BOLA É SUA: ela bate em você; todo mundo corre para as paredes
        const hit = 14;
        roomFx(K, { secs: lerp(10, 8.1, seg(t, 0, 150)), urgent: true, t, alarm: 0.15 + 0.1 * Math.sin(t * 0.12) });
        const flee = ease(seg(t, hit, 80));
        const others = TAG_IDS.map((id) => [id, BL]).concat([[KIRA(), BL]]).concat(tagExtras().slice(0, 4).map((c) => [c, {}]));
        others.forEach(([who, o], i) => {
          const ang = -PI * 0.95 + (i / (others.length - 1)) * PI * 0.9;
          const r = lerp(0.9, 2.8, flee);
          const x = 12.5 + Math.cos(ang) * r * 1.15;
          const y = 26.3 + Math.sin(ang) * r * 1.2;
          act(K, who, [x, y], Object.assign({ id: 'f' + i, face: flee < 1 ? [x + Math.cos(ang), y + Math.sin(ang)] : [12.5, 26.3], anim: flee < 1 && t > hit ? 'run' : 'idle', frame: flee < 1 && t > hit ? f + i * 5 : 0 }, o));
        });
        act(K, 'you', [12.5, 26.3], Object.assign({ face: [12.5, 30], frame: 0 }, BL));
        let b;
        if (t < hit) b = [lerp(9.8, 12.55, t / hit), lerp(25.2, 26.35, t / hit), lerp(1.2, 0.62, t / hit)];
        else {
          const kk = Math.min(1, (t - hit) / 30);
          b = [12.55 + kk * 0.45, 26.35 + kk * 0.45, Math.max(0.05, lerp(0.62, 0.05, kk * kk) + Math.sin(kk * PI) * 0.3)];
        }
        ball(K, b);
        const k = easeIO(seg(t, 30, 150));
        const amp = t >= hit && t < hit + 20 ? 0.012 * (1 - (t - hit) / 20) : 0.004;
        cam(K, shake(K, [lerp(12.9, 12.75, k), lerp(29.2, 28.8, k), lerp(0.66, 0.6, k)], f * 2, amp, 2), [12.5, 26.3, lerp(0.5, 0.56, k)], lerp(48, 42, k));
        st.hit = W3([12.5, 26.3, 0.6]);
      } else if (phase === 2) {
        // QUEM É O ALVO?: o tempo quase para (sem cor); a câmera varre o quarto por trás
        // de você: longe, longe... perto e de costas — o Kira fica colorido
        const A = remap(t, [[0, 0], [20, 12], [180, 40]]);
        roomFx(K, { secs: lerp(7.6, 6.2, seg(t, 0, 180)), urgent: true, t: A, alarm: 0.2 });
        const C = [[9.9, 23.0], [15.3, 23.1], KQ];
        act(K, 'bachira', C[0], Object.assign({ face: [8, 22], anim: 'run', frame: Math.floor(A) }, BL));
        act(K, 'kunigami', C[1], Object.assign({ face: [16, 21], anim: 'run', frame: Math.floor(A) + 3 }, BL));
        act(K, KIRA(), KQ, Object.assign({ face: [14.8, 22.5], frame: 0 }, BL));
        ['chigiri', 'gagamaru', 'igarashi', 'raichi'].forEach((id, i) => act(K, id, [[9.6, 15.4, 11.0, 15.5][i], [25.6, 27.0, 22.8, 29.4][i]], Object.assign({ face: [12.5, 26], anim: 'run', frame: Math.floor(A) + i * 2 }, BL)));
        tagExtras().slice(0, 3).forEach((c, i) => act(K, c, [[11.2, 12.9, 13.2][i], [22.6, 22.5, 29.5][i]], { id: 'e' + i, face: [12.5, 26], frame: 0 }));
        act(K, 'you', YQ, Object.assign({ face: KQ, frame: 0 }, BL));
        ball(K, [YQ[0] + 0.3, YQ[1] - 0.05, 0.05]);
        // a mira: varre da esquerda para a direita e trava no Kira
        const l0 = t < 46 ? C[0] : t < 92 ? C[1] : C[2];
        const lp = t < 46 ? C[0] : t < 92 ? C[0] : C[1];
        const kk = t < 46 ? 1 : t < 92 ? easeIO(seg(t, 46, 66)) : easeIO(seg(t, 92, 116));
        const look = [lerp(lp[0], l0[0], kk), lerp(lp[1], l0[1], kk), 0.45];
        const lock = ease(seg(t, 116, 150));
        cam(K, shake(K, [lerp(10.0, 10.35, lock), lerp(29.2, 28.9, lock), 0.82], f * 0.4, 0.004), look, lerp(50, 42, lock));
        st.kira = W3([KQ[0], KQ[1], 0.45]);
      } else if (phase === 3) {
        // O CHUTE: de perfil; a bola cruza o quarto em câmera lenta e acerta a cabeça do Kira
        const A = remap(t, [[0, 0], [24, 24], [74, 40], [86, QHIT], [150, 116]]);
        roomFx(K, { secs: lerp(4, 2, seg(t, 0, 150)), urgent: true, t, alarm: 0.3 + 0.15 * Math.sin(t * 0.12) });
        const yA = A < QKICK - 8 ? 'windup' : A < QKICK + 26 ? 'shoot' : 'idle';
        act(K, 'you', YQ, Object.assign({ face: KQ, anim: yA, frame: yA === 'idle' ? 0 : 4 }, BL));
        const turned = A > 40;
        const fall = A >= QHIT ? Math.min(60, (A - QHIT) * 1.2) : -1;
        act(K, KIRA(), KQ, Object.assign({ face: turned ? YQ : [14.8, 22.5], anim: fall >= 0 ? 'fall' : 'idle', frame: fall >= 0 ? undefined : 0, opts: fall >= 0 ? { animTime: fall } : undefined }, BL));
        ['bachira', 'chigiri'].forEach((id, i) => act(K, id, [[9.9, 15.3][i], [23.0, 23.1][i]], Object.assign({ face: [12.5, 26], frame: 0 }, BL)));
        const b = kickBall(A);
        ball(K, b, { k: 0.8 });
        const HIT_T = 86;
        const amp = t >= HIT_T ? 0.035 * Math.max(0, 1 - (t - HIT_T) / 30) : 0.004;
        const pan = easeIO(seg(A, QKICK, QHIT));
        cam(K, shake(K, [lerp(12.3, 13.0, pan), 28.75, 0.56], f * 2, amp, 3), [lerp(12.2, 13.5, pan), 25.9, 0.5], 56);
        st.foot = W3([YQ[0] + 0.3, YQ[1], 0.12]);
        st.ball = W3(b);
        st.b1 = W3(kickBall(A - 5));
        st.head = W3([KQ[0], KQ[1], 0.62]);
        st.A = A;
      } else {
        // 0:00 — o alarme; o Kira no chão, todo mundo olhando; a grua sobe devagar
        const tt = Math.min(t, 60);
        roomFx(K, { secs: 0, urgent: true, t, out: t > 30, alarm: 0.5 + 0.3 * Math.sin(tt * 0.12) });
        act(K, KIRA(), [KQ[0] + 0.15, KQ[1]], Object.assign({ face: YQ, anim: 'fall', opts: { animTime: 60 } }, BL));
        ball(K, [KQ[0] + 0.7, KQ[1] + 0.5, 0.05]);
        TAG_IDS.slice(0, 4).forEach((id, i) => act(K, id, [[9.8, 11.6, 15.3, 15.4][i], [23.2, 22.7, 23.4, 28.0][i]], Object.assign({ face: KQ, frame: 0 }, BL)));
        tagExtras().slice(0, 3).forEach((c, i) => act(K, c, [[13.0, 10.4, 15.4][i], [22.6, 24.0, 26.4][i]], { id: 'w' + i, face: KQ, frame: 0 }));
        act(K, 'you', YQ, Object.assign({ face: KQ, frame: 0, light: [0.8, 0.62, 0.68] }, BL));
        const k = easeIO(t / 220);
        cam(K, mixP([10.2, 29.5, 0.55], [9.6, 29.5, 1.5], k), mixP([12.7, 25.8, 0.5], [13.2, 25.2, 0.1], k), lerp(50, 58, k));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot, stageH } = S;
      const st = onScreen(K);
      if (phase === 0) {
        CE.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(1));
      } else if (phase === 1) {
        const hit = 14;
        if (t >= hit && st.hit) {
          CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, hit, hit + 7)));
          CE.cineGlow(ctx, st.hit.x, st.hit.y, 120, 'rgba(255,255,255,0.6)', 1 - seg(t, hit, hit + 18));
        }
        CE.cineSfx(S, hit, 'bate', () => window.SFX?.tackle?.());
      } else if (phase === 2) {
        // sem cor (o tempo quase parado); o Kira continua colorido quando a mira trava
        const p = st.kira;
        const lock = seg(t, 116, 140);
        if (p && lock > 0) bwBlue(ctx, W, H, seg(t, 4, 24), { inside: false, x: p.x, y: p.y, r: 70 * lock });
        else bwBlue(ctx, W, H, seg(t, 4, 24));
        if (p && lock > 0) CE.cineGlow(ctx, p.x, p.y, 110, 'rgba(239,68,68,0.22)', lock);
        // o pé em cima da bola, decidido
        if (t > 140 && t < 180) {
          manga(ctx, [[W * 0.04, top + stageH * 0.46], [W * 0.46, top + stageH * 0.4], [W * 0.42, bot - 16], [W * 0.02, bot - 10]], seg(t, 140, 148), [-W * 0.4, 0], (CA, b, g) =>
            artBoot(CA, b, g, { bg: '#d8dee9', bx: 0.52, by: 0.72, fx: 0.36, fy: 0.48, s: 0.17, ang: 1.2, sock: '#0f2942', sock2: '#38bdf8', boot: '#22d3ee', tone: true })
          );
        }
        CE.cineSfx(S, 118, 'mira', () => window.SFX?.blip?.(220));
      } else if (phase === 3) {
        const HIT_T = 86;
        const A = st.A || 0;
        // ainda sem cor até o chute; a cor volta em círculo a partir do seu pé
        const fp = st.foot || { x: W * 0.3, y: H * 0.7 };
        if (A < QKICK) bwBlue(ctx, W, H, 1);
        else bwBlue(ctx, W, H, 1, { inside: false, x: fp.x, y: fp.y, r: ease(seg(A, QKICK, QKICK + 18)) * W * 1.4 });
        if (st.ball && st.b1 && A >= QKICK && t < HIT_T) CE.luckStreak(ctx, st.b1.x, st.b1.y, st.ball.x, st.ball.y, 2, 18, '0,245,212', 0.6);
        // o golpe: a bola na cabeça do Kira
        if (t >= HIT_T && t < HIT_T + 2) impactFrame(ctx, W, H);
        if (t >= HIT_T) {
          const p = st.head || { x: W * 0.65, y: H * 0.45 };
          CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, HIT_T + 1, HIT_T + 8)));
          if (t < HIT_T + 9) CE.drawRadialSpeedLines(ctx, p.x, p.y, W, '#020617', 0.5 * (1 - (t - HIT_T) / 9));
          CE.cineImpactText(ctx, 'PÁ!!', W * 0.74, top + stageH * 0.26, 110, '#f8fafc', seg(t, HIT_T, HIT_T + 6), 0, 0.1);
        }
        CE.cineSfx(S, 20, 'chute', () => window.SFX?.kick?.(1));
        CE.cineSfx(S, HIT_T, 'cabeca', () => window.SFX?.tackle?.());
      } else {
        // o alarme vermelho piscando por cima do quarto
        ctx.fillStyle = `rgba(127,29,29,${0.12 + 0.1 * Math.sin(t * 0.12)})`;
        ctx.fillRect(0, top, W, stageH);
        // a sua mão tremendo
        if (t > 96 && t < 176) {
          const you = K.charData('you', BL);
          manga(ctx, [[W * 0.06, top + 24], [W * 0.38, top + 16], [W * 0.36, bot - 22], [W * 0.04, bot - 14]], seg(t, 96, 104), [-W * 0.4, 0], (CA, b, g) =>
            artHand(CA, b, g, { bg: '#1a0a12', skin: you.skinColor || '#f3d1b8', jit: Math.round(K.noise(S.f * 2.7, 3) * 2) * PIX * (1 - seg(t, 140, 176) * 0.7), rays: 'rgba(239,68,68,0.25)' })
          );
        }
        if (t > 196) {
          ctx.fillStyle = `rgba(0,0,0,${seg(t, 196, 220)})`;
          ctx.fillRect(0, 0, W, H);
        }
        CE.cineSfx(S, 2, 'buzina', () => window.SFX?.whistle?.(1));
      }
    }
  });
})();
