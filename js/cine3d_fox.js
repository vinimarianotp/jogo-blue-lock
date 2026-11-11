// ============================================================================
// CUTSCENES EM 3D — o treino do Fox, o monstro, o desafio do Rin, os dois títulos (Sub-20 e
// Copa do Mundo), os créditos e a abertura da Copa. Refeitas no padrão do gol da Sub-20
// (js/cine3d_u20.js): câmera sempre viva (grua, travelling, push-in), câmera lenta com rampa,
// no máximo um quadro de impacto, closes só em quadros de mangá em pixel art, pouco texto.
// Regras: docs/DIRECAO_DE_ARTE.md. Kit: js/cine3d_kit.js. Arte: js/cine_art.js.
// O primeiro bloco é a caixa de ferramentas de cinema destas cenas (CE.foxFx); o
// js/cine3d_fox2.js (Fox e a final contra a França) usa a mesma.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE) return;
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
    const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  // batida que acende e cai (coração, soco de câmera)
  const pulse = (t, at, len = 18) => (t < at || t > at + len ? 0 : Math.pow(1 - (t - at) / len, 2));
  // tempo da ação com câmera lenta: keys = [[tempo real, tempo da ação], ...] (rampa nas pontas)
  const remap = (t, keys) => {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
    }
    return keys[keys.length - 1][1] + (t - keys[keys.length - 1][0]);
  };

  // ---------------------------------------------------------------- câmera e atores
  // pontos em [x, y, altura] (o kit usa [x, altura, y])
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  const act = (K, who, p, o = {}) => K.actor(who, Object.assign({ x: p[0], y: p[1], z: p[2] || 0 }, o));
  const ball = (K, p, o = {}) => K.ball(p[0], p[1], p[2] || 0, o);
  // câmera na mão: ruído suave (nunca sorteio por quadro)
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp, p[2] + K.noise(f, seed + 7) * amp * 0.6];
  // ponto do mundo [x, y, z] na tela (só no overlay)
  const scr = (K, p) => (p ? K.screen(p[0], p[2] || 0, p[1]) : null);
  // torres dos refletores do campo (as lâmpadas a ~3,3 de altura) — iguais no prédio e nos estádios
  const TOWERS = [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]];
  const LAMP_Z = 3.33;

  // ---------------------------------------------------------------- texturas
  const mk = (w, h, fn) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    fn(g, w, h);
    return c;
  };
  const CACHE = new Map();
  const once = (key, w, h, fn) => {
    let c = CACHE.get(key);
    if (!c) {
      c = mk(w, h, fn);
      CACHE.set(key, c);
    }
    return c;
  };
  // Arte em pixel para pôr no mundo 3D (taça, cone, placa): desenha o vetor pequeno, corta o
  // alfa (sem borda suave) e reduz as cores — fica na mesma escala de pixel dos bonecos
  function pixelCv(key, w, h, draw, levels = 6) {
    return once('px:' + key, w, h, (g) => {
      draw(g, w, h);
      const id = g.getImageData(0, 0, w, h);
      const d = id.data;
      const st = 255 / (levels - 1);
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.round(d[i] / st) * st;
        d[i + 1] = Math.round(d[i + 1] / st) * st;
        d[i + 2] = Math.round(d[i + 2] / st) * st;
        d[i + 3] = d[i + 3] < 110 ? 0 : 255;
      }
      g.putImageData(id, 0, 0);
    });
  }
  // brilho redondo (poça de luz no chão, luz atrás de alguém)
  const glowCv = (rgb) =>
    once('glow:' + rgb, 128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, `rgba(${rgb},1)`);
      gr.addColorStop(0.35, `rgba(${rgb},0.45)`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    });
  // cone de luz (estreito em cima, largo embaixo)
  const coneCv = () =>
    once('cone', 64, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(255,255,255,0.8)');
      gr.addColorStop(1, 'rgba(255,255,255,0.1)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(27, 0);
      g.lineTo(37, 0);
      g.lineTo(64, 128);
      g.lineTo(0, 128);
      g.closePath();
      g.fill();
    });
  // placa em pé sempre virada para a câmera (brilhos, cones de luz)
  function faceCam(K, o) {
    const e = K.c.eye;
    K.quad(Object.assign({ ang: Math.atan2(e[2] - o.y, e[0] - o.x) + Math.PI }, o));
  }
  // bandeira em pixel art (24 x 16) a partir da bandeira desenhada do jogo
  const flagPx = (code) =>
    once('flag:' + code, 24, 16, (g) => {
      g.imageSmoothingEnabled = false;
      const src = CE.foxcFlagCanvas ? CE.foxcFlagCanvas(code) : null;
      if (src) g.drawImage(src, 0, 0, 24, 16);
      else {
        g.fillStyle = '#f8fafc';
        g.fillRect(0, 0, 24, 16);
      }
    });

  // ---------------------------------------------------------------- sombra comprida no gramado
  const shadowCv = () =>
    once('shadow', 64, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0.62)');
      gr.addColorStop(0.55, 'rgba(0,0,0,0.38)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, TAU);
      g.fill();
    });
  // base em (x, y), comprimento len na direção ang (luz de um refletor)
  function longShadow(K, x, y, len, ang, w, a, color = '#000000') {
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
    K._push(v, { img: shadowCv(), color, alpha: a });
  }
  // a sombra que um refletor (torre em [x, y]) joga de quem está em p
  const shadowFrom = (K, tower, p, len, w, a) => {
    const ang = Math.atan2(p[1] - tower[1], p[0] - tower[0]);
    longShadow(K, p[0], p[1], len, ang, w, a);
  };

  // ---------------------------------------------------------------- pós (no overlay)
  // preto e branco com tom (azulado por padrão); circle: só dentro/fora do círculo
  function bwBlue(ctx, W, H, a = 1, circle = null, tone = '#3b82f6', toneK = 0.32) {
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
    ctx.globalAlpha = clamp(a) * toneK;
    ctx.fillStyle = tone;
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
  // reflexo da lente nos refletores visíveis (towers = [[x, y, z?], ...]; on(i) = 0..1 por torre)
  function flares(ctx, K, S, k = 1, towers = TOWERS, on = null, tint = '186,230,253') {
    if (k <= 0) return;
    const { W, H } = S;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    towers.forEach(([x, y, z], i) => {
      const kk = k * (on ? on(i) : 1);
      if (kk <= 0.01) return;
      const p = K.screen(x, z ?? LAMP_Z, y);
      if (!p || p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 120) return;
      CE.cineGlow(ctx, p.x, p.y, 120, 'rgba(255,255,255,0.55)', kk);
      CE.cineGlow(ctx, p.x, p.y, 40, 'rgba(255,255,255,0.95)', kk);
      const gr = ctx.createLinearGradient(p.x - 420, 0, p.x + 420, 0);
      gr.addColorStop(0, `rgba(${tint},0)`);
      gr.addColorStop(0.5, `rgba(${tint},${0.5 * kk})`);
      gr.addColorStop(1, `rgba(${tint},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(p.x - 420, p.y - 2, 840, 4);
      const cx = W / 2;
      const cy = H / 2;
      [[0.45, 26, 'rgba(56,189,248,0.22)'], [0.8, 14, 'rgba(250,204,21,0.2)'], [1.3, 40, 'rgba(99,102,241,0.14)']].forEach(([f, r, col]) => {
        CE.cineGlow(ctx, p.x + (cx - p.x) * f * 2, p.y + (cy - p.y) * f * 2, r, col, kk);
      });
    });
    ctx.restore();
  }
  // vinheta colorida (pulso do coração, perigo)
  function vignette(ctx, W, H, rgb, a) {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, W * 0.72);
    g.addColorStop(0, `rgba(${rgb},0)`);
    g.addColorStop(1, `rgba(${rgb},${clamp(a)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // escurece a imagem (cena no escuro, fade)
  const dim = (ctx, W, H, a, col = '0,0,0') => {
    if (a <= 0) return;
    ctx.fillStyle = `rgba(${col},${clamp(a)})`;
    ctx.fillRect(0, 0, W, H);
  };

  // ---------------------------------------------------------------- partículas em pixel
  // (quadradinhos presos numa grade de px: mesma cara dos bonecos, nada de vetor liso)
  const snap = (v, px) => Math.round(v / px) * px;
  // confete caindo (girando: alterna a altura do papel)
  function pxConfetti(ctx, W, top, bot, t, n = 70, cols = ['#facc15', '#f8fafc', '#38bdf8', '#ef4444', '#00f5d4'], px = 5, seed = 21) {
    ctx.save();
    const h = bot - top;
    for (let i = 0; i < n; i++) {
      const sp = 1.1 + rnd(i, seed + 2) * 1.5;
      const x = snap(((rnd(i, seed) * W + Math.sin(t * 0.03 + i) * 26) % W + W) % W, px);
      const y = snap(top + ((rnd(i, seed + 1) * h + t * sp) % h), px);
      const flip = Math.floor(t * 0.12 + i) % 3;
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(x, y, flip === 1 ? px : px * 2, flip === 2 ? px : px * 2);
    }
    ctx.restore();
  }
  // poeira / faísca flutuando (quadradinhos)
  function pxDust(ctx, W, top, bot, t, n = 30, color = 'rgba(219,234,254,0.5)', px = 3, seed = 5, rise = 0.25) {
    ctx.save();
    ctx.fillStyle = color;
    const h = bot - top;
    for (let i = 0; i < n; i++) {
      const x = snap((rnd(i, seed) * W + Math.sin(t * 0.012 + i * 1.7) * 40 + W) % W, px);
      const y = snap(top + ((rnd(i, seed + 1) * h - t * rise * (0.5 + rnd(i, seed + 2)) + h * 4) % h), px);
      ctx.fillRect(x, y, px, px);
    }
    ctx.restore();
  }
  // fogos de artifício em pixel (estouros de quadradinhos que caem e apagam)
  function pxFireworks(ctx, W, y0, y1, t, n = 6, cols = ['#facc15', '#38bdf8', '#f8fafc', '#ef4444', '#00f5d4'], seed = 3, period = 90, px = 5) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const local = t + rnd(i, seed) * period;
      const cyc = Math.floor(local / period);
      const age = local % period;
      if (age > 62) continue;
      const cx = 60 + rnd(i * 7 + cyc, seed + 1) * (W - 120);
      const cy = lerp(y0, y1, rnd(i * 5 + cyc, seed + 2));
      const R = 60 + rnd(i + cyc, seed + 3) * 70;
      const col = cols[(i + cyc) % cols.length];
      const a = age < 6 ? age / 6 : 1 - (age - 6) / 56;
      const n2 = 22;
      ctx.fillStyle = col;
      ctx.globalAlpha = clamp(a);
      for (let j = 0; j < n2; j++) {
        const ang = (j / n2) * TAU + rnd(j, i) * 0.2;
        const r = R * ease(age / 40);
        const fall = age * age * 0.012;
        const x = snap(cx + Math.cos(ang) * r, px);
        const y = snap(cy + Math.sin(ang) * r + fall, px);
        ctx.fillRect(x, y, px, px);
        if (age < 30) ctx.fillRect(snap(cx + Math.cos(ang) * r * 0.7, px), snap(cy + Math.sin(ang) * r * 0.7 + fall, px), px, px);
      }
      // o miolo branco do estouro
      if (age < 10) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(snap(cx, px) - px, snap(cy, px) - px, px * 3, px * 3);
      }
    }
    ctx.restore();
  }
  // flashes de câmeras na torcida (cruzinha de pixels que pisca)
  function pxFlashes(ctx, x0, x1, y0, y1, t, n = 8, seed = 1, px = 3) {
    ctx.save();
    for (let i = 0; i < n; i++) {
      const per = 22 + Math.floor(rnd(i, seed) * 30);
      const local = t + rnd(i, seed + 1) * per;
      const cyc = Math.floor(local / per);
      const age = local % per;
      if (age > 6) continue;
      const x = snap(x0 + rnd(i * 13 + cyc, seed + 2) * (x1 - x0), px);
      const y = snap(y0 + rnd(i * 7 + cyc, seed + 3) * (y1 - y0), px);
      const a = 1 - age / 6;
      CE.cineGlow(ctx, x, y, 14, 'rgba(255,255,255,0.6)', a);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - px, y, px * 3, px);
      ctx.fillRect(x, y - px, px, px * 3);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  // chuva em pixel (riscos retos de 2 px, inclinados por degraus)
  function pxRain(ctx, W, top, bot, t, n = 140, a = 0.3, slant = 0.25, seed = 9) {
    ctx.save();
    ctx.fillStyle = `rgba(191,219,254,${a})`;
    const h = bot - top + 40;
    for (let i = 0; i < n; i++) {
      const sp = 14 + rnd(i, seed) * 10;
      const len = 4 + Math.floor(rnd(i, seed + 1) * 4);
      const y = top - 20 + ((rnd(i, seed + 2) * h + t * sp) % h);
      const x = ((rnd(i, seed + 3) * (W + 200) - (y - top) * slant) % (W + 200) + W + 200) % (W + 200) - 100;
      for (let k = 0; k < len; k++) ctx.fillRect(snap(x - k * slant * 4, 2), snap(y + k * 4, 2), 2, 4);
    }
    ctx.restore();
  }

  CE.foxFx = {
    TAU, clamp, seg, ease, easeIn, easeIO, lerp, mixP, rnd, pulse, remap,
    cam, act, ball, shake, scr, TOWERS, LAMP_Z,
    mk, once, pixelCv, glowCv, coneCv, faceCam, flagPx, longShadow, shadowFrom,
    bwBlue, impactFrame, flares, vignette, dim, snap, pxConfetti, pxDust, pxFireworks, pxFlashes, pxRain
  };
})();

// ============================================================================
// AS CENAS (fox_training, monster_awaken, rin_challenge, u20_celebration, wc_champion,
// credits, wc_opening)
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D || !CE.foxFx) return;
  const FX = CE.foxFx;
  const { TAU, clamp, seg, ease, easeIn, easeIO, lerp, mixP, rnd, pulse, remap, cam, act, ball, shake, scr, TOWERS, LAMP_Z } = FX;
  const CAa = () => CE.ART;
  const PIX = 6; // tamanho do pixel dos quadros de mangá (a escala dos bonecos)
  const FOX_COLOR = '#f59e0b';
  const RIN_COLOR = '#22d3ee';
  const YOU_COLOR = '#00f5d4';
  const NARR = '#94a3b8';
  // 1 unidade da arte do boneco em ladrilhos (boneco com k = 1: 72 px / 66 px por ladrilho / 36)
  const SPU = 72 / 66 / 36;
  // o olho fica ~20,4 unidades acima do chão
  const eyeZ = (z, k = 0.9) => z + 20.4 * SPU * k;
  // o olho de um boneco na tela: { x, y, u } (u = 1 unidade da arte em px)
  function eyeAt(K, x, y, z = 0, k = 0.9) {
    const h = eyeZ(z, k);
    const a = K.screen(x, h, y);
    const b = K.screen(x, h + 0.5, y);
    if (!a || !b) return null;
    return { x: a.x, y: a.y, u: ((a.y - b.y) / 0.5) * SPU * k };
  }
  // os pontos do mundo guardados no scene (K.st) viram pontos da tela no overlay
  const stOf = (K) => {
    const st = {};
    Object.keys(K.st || {}).forEach((k) => {
      const v = K.st[k];
      st[k] = v && v.__w ? scr(K, v.__w) : v;
    });
    return st;
  };
  const Wp = (p) => ({ __w: p });
  // guarda por cena (refeito toda vez que uma cena começa: uniforme e visual podem ter mudado)
  const perRun = (fn) => {
    let run = -1;
    let v = null;
    return () => {
      if (run !== CE._cineRun) {
        run = CE._cineRun;
        v = fn();
      }
      return v;
    };
  };
  const hash = (i, s = 0) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };

  // ---------------------------------------------------------------- desenhos dos quadros de mangá
  // (vetor desenhado no canvas pequeno do CA.panel com pixel: 6 — sai em pixel art)
  // cronômetro pendurado pela corrente (centro em x, y; s = escala)
  function stopwatch(g, x, y, s, t) {
    g.save();
    g.translate(x, y);
    g.rotate(Math.sin(t * 0.09) * 0.3);
    g.scale(s, s);
    g.strokeStyle = '#94a3b8';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(0, -70);
    g.lineTo(0, -260);
    g.stroke();
    g.fillStyle = '#94a3b8';
    g.fillRect(-12, -82, 24, 18);
    g.fillStyle = '#cbd5e1';
    g.beginPath();
    g.arc(0, 0, 66, 0, TAU);
    g.fill();
    g.fillStyle = '#0b0f1a';
    g.beginPath();
    g.arc(0, 0, 55, 0, TAU);
    g.fill();
    g.strokeStyle = '#64748b';
    g.lineWidth = 4;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.beginPath();
      g.moveTo(Math.cos(a) * 44, Math.sin(a) * 44);
      g.lineTo(Math.cos(a) * 52, Math.sin(a) * 52);
      g.stroke();
    }
    const ha = (Math.floor(t / 6) / 60) * TAU - Math.PI / 2;
    g.strokeStyle = '#ef4444';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(ha) * 42, Math.sin(ha) * 42);
    g.stroke();
    g.restore();
  }
  // a taça da Sub-20 e a da Copa do Mundo (vetor do jogo, para os quadros e para o pixel 3D)
  const drawCup = (g, x, y, sc, wc) => (wc ? CE.foxcWCTrophy(g, x, y, sc) : CE.drawTrophy(g, x, y, sc));
  // as taças em pixel art para o mundo 3D (mesma escala de pixel dos bonecos: ~73 px por ladrilho)
  const u20CupPx = () => FX.pixelCv('cup_u20', 26, 26, (g) => CE.drawTrophy(g, 13, 13.5, 0.2));
  const wcCupPx = () =>
    FX.pixelCv('cup_wc', 16, 32, (g) => {
      g.scale(0.14, 0.14);
      CE.foxcWCTrophy(g, 57, 226, 1);
    });
  // o quadro da taça: ela grande, contra a estrela de impacto e os brilhos
  function cutCup(ctx, S, kIn, q, poly, from, wc) {
    const CA = CAa();
    if (!CA) return;
    CA.panel(
      ctx,
      poly,
      (b, g) => {
        g.fillStyle = wc ? '#fef3c7' : '#e0f2fe';
        g.fillRect(b.x, b.y, b.w, b.h);
        const cx = b.x + b.w * 0.5 + b.ox;
        const cy = b.y + b.h * 0.52;
        CA.speedRadial(g, cx, cy, S.W, S.H, { color: wc ? 'rgba(120,53,15,0.55)' : 'rgba(15,23,42,0.5)', inner: b.h * 0.3, n: 56, thick: 1.4 });
        CA.burst(g, cx, cy, b.h * (0.36 + 0.03 * Math.sin(q * 20)), { fill: '#fde047', stroke: '#0b0f19', lw: 10, n: 14 });
        drawCup(g, cx, wc ? cy + b.h * 0.42 : cy + b.h * 0.05, wc ? b.h * 0.0037 : b.h * 0.0058, wc);
        // brilhos (cruzinhas) que piscam
        g.fillStyle = '#ffffff';
        for (let i = 0; i < 6; i++) {
          if ((Math.floor(q * 40) + i) % 3) continue;
          const x = cx + (hash(i, 3) - 0.5) * b.h * 0.8;
          const y = cy + (hash(i, 4) - 0.5) * b.h * 0.7;
          g.fillRect(x - 18, y - 4, 36, 8);
          g.fillRect(x - 4, y - 18, 8, 36);
        }
      },
      { k: kIn, from, pixel: PIX }
    );
  }
  // a chuteira entrando no chão / na bola (pé de alguém, com as linhas)
  function cutBoot(ctx, S, kIn, q, poly, from, o) {
    const CA = CAa();
    if (!CA) return;
    CA.panel(
      ctx,
      poly,
      (b, g) => {
        g.fillStyle = o.bg;
        g.fillRect(b.x, b.y, b.w, b.h);
        const fx = b.x + b.w * 0.5 + b.ox;
        const fy = b.y + b.h * 0.72;
        CA.speedRadial(g, fx, fy, S.W, S.H, { color: o.lines, inner: b.h * 0.2, n: 60, thick: 1.6 });
        CA.halftone(g, b.x, b.y, b.w, b.h, { step: 18, color: 'rgba(15,23,42,0.35)', from: 'bottom' });
        if (o.ground) {
          g.fillStyle = o.ground;
          g.fillRect(b.x, fy + b.h * 0.08, b.w, b.h);
        }
        if (o.paper) o.paper(g, b, q);
        const e = easeIO(q * 1.6);
        const s = b.h * 0.2;
        CA.boot(g, fx - s * 0.4, fy - (1 - e) * b.h * 0.3, s, { sock: o.sock, sock2: o.sock2, boot: o.boot, ang: lerp(-0.25, 0, e), flip: o.flip });
        // a terra / a água voando no contato
        if (e > 0.9) {
          g.fillStyle = o.spray;
          for (let i = 0; i < 14; i++) {
            const a = Math.PI + (i / 13) * Math.PI;
            const r = b.h * (0.12 + 0.3 * seg(q, 0.55, 1) * (0.6 + hash(i, 5) * 0.6));
            g.fillRect(fx + Math.cos(a) * r * 1.6, fy + b.h * 0.08 + Math.sin(a) * r, b.h * 0.035, b.h * 0.035);
          }
        }
      },
      { k: kIn, from, pixel: PIX }
    );
  }

  // ==========================================================================
  // 1) O TREINO DA RAPOSA — quatro da manhã, no campo apagado do Blue Lock (onde o Fox
  // espera na conversa): tiros de corrida até o corpo desistir, sob um refletor só
  // ==========================================================================
  const LT = [45.3, 6.3]; // a única torre acesa (canto noroeste)
  const LANE_X = 47.4; // a raia dos tiros, perto da lateral oeste
  const FOX_T = [46.35, 13.4];
  const CONES = [10.0, 19.0];
  const foxCd = () => CE.foxcFox();
  // a luz do refletor no gramado: só uma poça onde a raia passa (o resto no escuro)
  function trainingSet(K, k = 1) {
    K.c.noLights = true;
    K.expo(0.4);
    K.fog('#02040a', 0.05);
    K.floor({ x0: 44.6, y0: 6.0, x1: 52.4, y1: 21.5, z: 0.008, img: FX.glowCv('191,219,254'), em: true, alpha: 0.2 * k });
    K.floor({ x0: 45.4, y0: 8.6, x1: 50.0, y1: 17.6, z: 0.009, img: FX.glowCv('219,234,254'), em: true, alpha: 0.24 * k });
    CONES.forEach((y) =>
      [-0.5, 0.5].forEach((dx) => {
        K.box({ x0: LANE_X + dx - 0.05, y0: y - 0.05, x1: LANE_X + dx + 0.05, y1: y + 0.05, z0: 0, z1: 0.11, color: '#f97316' });
      })
    );
  }
  // quanto um ponto do campo está na luz da torre (para o light dos bonecos)
  const litAt = (x, y, k = 1) => {
    const d = Math.hypot(x - 47.6, y - 12.6);
    const v = clamp(1.25 - d / 7) * k;
    return [lerp(0.16, 1.05, v), lerp(0.18, 1.08, v), lerp(0.3, 1.18, v)];
  };
  // a sombra projetada: a silhueta do boneco em pé (preta), de cabeça para baixo no canvas
  // (deitada no chão com os pés em quem a projeta e a cabeça longe da luz)
  const castCv = (() => {
    let run = -1;
    let cv = null;
    return (cd) => {
      if (run === CE._cineRun && cv) return cv;
      run = CE._cineRun;
      const s = FX.mk(72, 72, (g) => {
        try {
          window.PixelRenderer.drawCharacterSprite(g, cd, 72, 72, { facing: 'front', accessories: [], shirtNumber: cd.number || 10, view: 'front', animState: 'idle', frame: 0 });
        } catch (e) {}
        g.globalCompositeOperation = 'source-in';
        g.fillStyle = '#000';
        g.fillRect(0, 0, 72, 72);
      });
      cv = FX.mk(72, 72, (g) => {
        g.translate(0, 72);
        g.scale(1, -1);
        g.drawImage(s, 0, 0);
      });
      return cv;
    };
  })();
  // o tiro do plano 2: você vem do norte e desaba no meio do caminho (tempo da ação A)
  const P1_KEYS = [[0, 0], [56, 56], [118, 74], [170, 126]];
  const FALL_A = 62;
  const runY = (A) => (A < FALL_A ? lerp(10.4, 13.3, A / FALL_A) : 13.3 + ease(seg(A, FALL_A, FALL_A + 12)) * 0.18);

  CE.registerCine3D('fox_training', {
    phases: [180, 170, 190, 170, 150],
    music: 'dread',
    title: '🦊 O TREINO DA RAPOSA',
    tags: ['PLANO 1 • 04:00, O CAMPO APAGADO', 'PLANO 2 • O CORPO DESISTE', 'PLANO 3 • A RAPOSA', 'PLANO 4 • A SOMBRA', 'PLANO 5 • DEIXA ELE SAIR'],
    subs: [
      [{ from: 70, who: 'FOX', text: '"De novo! Quem para, eu substituo!"', color: FOX_COLOR }],
      [{ from: 112, who: 'FOX', text: '"O corpo desistiu. Agora começa."', color: FOX_COLOR }],
      [{ from: 40, who: 'FOX', text: '"O Ego pôs uma coleira no seu monstro."', color: FOX_COLOR }],
      [{ from: 30, who: 'FOX', text: '"Hehe... Tá ouvindo ele arranhar?"', color: FOX_COLOR }],
      [{ from: 6, who: 'FOX', text: '"Ainda não. Falta perder mais."', color: FOX_COLOR }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, f } = S;
      const fox = foxCd();
      const st = (K.st = {});
      // a cabeça das torres apagadas (só a do canto noroeste acesa)
      TOWERS.forEach(([x, y], i) => {
        if (i === 0 && phase < 4) return;
        K.box({ x0: x - 0.47, y0: y - 0.22, x1: x + 0.47, y1: y + 0.22, z0: 3.08, z1: 3.57, color: [0.05, 0.06, 0.09], em: true });
      });
      if (phase === 0) {
        // A GRUA: o campo inteiro no escuro, uma torre acesa; você corre a raia, o Fox espera
        trainingSet(K);
        const yy = lerp(19.3, 11.2, t / 180);
        const yp = [LANE_X, yy];
        act(K, 'you', yp, { id: 'y', face: [LANE_X, 0], anim: 'run', frame: Math.floor(t * 0.62), kit: 'blueLock', light: litAt(yp[0], yp[1]) });
        act(K, fox, FOX_T, { id: 'fox', face: [LANE_X, yy], frame: 0, light: litAt(FOX_T[0], FOX_T[1], 0.8) });
        FX.shadowFrom(K, LT, yp, 1.7, 0.34, 0.34);
        FX.shadowFrom(K, LT, FOX_T, 1.9, 0.36, 0.3);
        const k = easeIO(seg(t, 0, 170));
        cam(K, mixP([58.6, 21.6, 5.0], [50.2, 15.7, 0.62], k), mixP([49.5, 13.4, 0.1], [46.9, 13.3, 0.55], k), lerp(56, 42, k));
        st.you = Wp([yp[0], yp[1], 0.6]);
      } else if (phase === 1) {
        // O CORPO DESISTE: de lado, acompanhando o tiro; as pernas não vão — câmera lenta na
        // queda; depois o Fox chega devagar, olhando o cronômetro
        trainingSet(K);
        const A = remap(t, P1_KEYS);
        const yp = [LANE_X, runY(A)];
        const down = A >= FALL_A;
        act(K, 'you', yp, { id: 'y', face: [LANE_X, 30], anim: down ? (A < FALL_A + 8 ? 'stun' : 'kneel_down') : 'run', frame: down ? 0 : Math.floor(A * 0.62), kit: 'blueLock', light: litAt(yp[0], yp[1]) });
        const fq = ease(seg(A, 84, 124));
        const fp = [lerp(46.2, 46.8, fq), lerp(11.4, 12.9, fq)];
        act(K, fox, fp, { id: 'fox', face: [yp[0], yp[1]], anim: fq > 0 && fq < 1 ? 'run' : 'idle', frame: fq > 0 && fq < 1 ? Math.floor(A * 0.35) : 0, light: litAt(fp[0], fp[1], 0.8) });
        FX.shadowFrom(K, LT, yp, 1.7, 0.34, 0.34);
        FX.shadowFrom(K, LT, fp, 1.9, 0.36, 0.3);
        // a câmera corre junto e para quando você para
        const cy = lerp(yp[1] - 0.2, 13.0, seg(A, FALL_A, 110));
        cam(K, shake(K, [lerp(49.9, 49.6, seg(A, FALL_A, 126)), cy + 0.55, lerp(0.5, 0.36, seg(A, FALL_A, 100))], f, down ? 0.003 : 0.008, 2), [LANE_X - 0.2, cy, lerp(0.55, 0.38, seg(A, FALL_A, 100))], lerp(46, 42, seg(A, 70, 126)));
        st.you = Wp([yp[0], yp[1], down ? 0.42 : 0.7]);
        st.A = A;
      } else if (phase === 2) {
        // A RAPOSA: de baixo, atrás de você no chão; ele contra a luz do refletor — silhueta,
        // só os olhos acesos; no fim ele se abaixa do seu lado
        trainingSet(K, 0.9);
        const yp = [LANE_X, 13.48];
        act(K, 'you', yp, { id: 'y', face: [LANE_X - 0.6, 10], anim: 'kneel_down', frame: 0, kit: 'blueLock', light: [0.32, 0.36, 0.5] });
        const kneel = t >= 120;
        const fq = easeIO(seg(t, 0, 110));
        // (ele anda na linha entre a câmera e o refletor: contraluz; depois se abaixa do seu lado)
        const fp = kneel ? [46.7, 13.3] : [lerp(45.55, 46.0, fq), lerp(11.95, 12.55, fq)];
        act(K, fox, fp, { id: 'fox', face: [yp[0], yp[1]], anim: kneel ? 'kneel_one' : fq > 0.02 && fq < 0.98 ? 'run' : 'idle', frame: kneel ? 0 : Math.floor(t * 0.3), light: [0.08, 0.06, 0.08] });
        const k = easeIO(t / 190);
        cam(K, shake(K, [lerp(46.4, 46.6, k), lerp(16.0, 15.8, k), lerp(0.3, 0.34, k)], f * 0.5, 0.003), [lerp(46.0, 46.3, k), 12.4, lerp(0.95, 0.8, k)], lerp(52, 48, k));
        st.fox = { x: fp[0], y: fp[1], z: 0, kneel };
      } else if (phase === 3) {
        // A SOMBRA: o refletor baixo atrás de vocês; a sua sombra se estica pelo campo e
        // cresce a cada batida do coração — lá na ponta, dois olhos vermelhos abrem
        trainingSet(K, 0.85);
        const beats = [20, 58, 92, 122, 146];
        const beat = beats.reduce((s, b) => s + pulse(t, b, 16), 0);
        const yp = [LANE_X, 13.48];
        act(K, 'you', yp, { id: 'y', face: [LANE_X + 1, 16], anim: 'kneel_one', frame: 0, kit: 'blueLock', light: [0.55, 0.6, 0.78] });
        act(K, fox, [46.7, 13.3], { id: 'fox', face: [yp[0], yp[1]], anim: 'kneel_one', frame: 0, light: [0.4, 0.38, 0.48] });
        // a sombra é a SUA silhueta em pé, esticada no gramado para longe da luz
        const len = 2.6 + ease(seg(t, 0, 150)) * 3.2 + beat * 0.25;
        const sw = 0.95 + len * 0.08;
        const y0 = yp[1] - len * 0.083;
        K.floor({ x0: yp[0] - sw / 2 + 0.25, y0, x1: yp[0] + sw / 2 + 0.25, y1: y0 + len, z: 0.014, img: castCv(CE.cineYou(CE.KITS.blueLock)), color: '#020005', alpha: 0.85 });
        FX.shadowFrom(K, LT, [46.7, 13.3], 2.6, 0.4, 0.4);
        const k = easeIO(t / 170);
        cam(K, shake(K, [lerp(52.6, 52.3, k), lerp(16.2, 16.4, k), lerp(2.8, 2.6, k)], f, 0.002 + beat * 0.004, 4), [47.9, 16.3, 0.0], lerp(56, 52, k));
        const ey = y0 + len * 0.65;
        st.eyeL = Wp([yp[0] + 0.25 - sw * 0.096, ey, 0.02]);
        st.eyeR = Wp([yp[0] + 0.25 + sw * 0.096, ey, 0.02]);
        st.beat = beat;
      } else {
        // DEIXA ELE SAIR: você levanta; o pé crava no chão (quadro de impacto); o Fox vai
        // embora no escuro e o último refletor apaga
        trainingSet(K, 1 - seg(t, 120, 124));
        const yp = [LANE_X, 13.48];
        const up = t >= 96;
        act(K, 'you', yp, { id: 'y', face: [LANE_X + 1.5, 15], anim: up ? 'idle' : 'kneel_one', frame: 0, kit: 'blueLock', light: up ? [1.05, 0.55, 0.52] : [0.6, 0.62, 0.78] });
        const gone = ease(seg(t, 104, 150));
        act(K, fox, [lerp(46.95, 45.9, gone), lerp(12.85, 10.6, gone)], { id: 'fox', face: [45.5, 9.5], anim: t > 104 ? 'run' : 'kneel_one', frame: t > 104 ? Math.floor(t * 0.3) : 0, light: [0.3, 0.28, 0.36] });
        FX.shadowFrom(K, LT, yp, 2.0, 0.4, 0.5 * (1 - seg(t, 120, 124)));
        const k = easeIO(seg(t, 0, 96));
        const sh = up && t < 116 ? 0.03 * (1 - (t - 96) / 20) : 0.002;
        cam(K, shake(K, mixP([50.6, 15.4, 0.3], [50.0, 14.9, 0.42], k), f * 2, sh, 6), [LANE_X + 0.1, 13.3, lerp(0.5, 0.62, k)], lerp(48, 44, k));
        st.you = Wp([yp[0], yp[1], 0.5]);
        st.foot = Wp([yp[0], yp[1], 0.05]);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      const lamp = scr(K, [LT[0], LT[1], LAMP_Z]);
      const lampFlare = (k) => FX.flares(ctx, K, S, k, [TOWERS[0]]);
      if (phase === 0) {
        lampFlare(0.9);
        FX.pxDust(ctx, W, top, bot, t, 26, 'rgba(219,234,254,0.35)', 3, 7);
        CE.luckKicker(ctx, 40, top + 30, 'BLUE LOCK • 04:00', seg(t, 8, 36), '#38bdf8');
        CE.luckKicker(ctx, 40, top + 64, '9ª SÉRIE DE TIROS', seg(t, 30, 66), '#ef4444');
      } else if (phase === 1) {
        lampFlare(0.7);
        // suor caindo e o fôlego (quadradinhos)
        if (st.you) {
          const u = 3;
          ctx.fillStyle = 'rgba(191,219,254,0.85)';
          for (let i = 0; i < 6; i++) {
            const age = (t * 1.6 + i * 23) % 50;
            ctx.fillRect(FX.snap(st.you.x + (hash(i, 3) - 0.5) * 40, u), FX.snap(st.you.y - 30 + age * 1.4, u), u, u * 2);
          }
          ctx.fillStyle = 'rgba(203,213,225,0.3)';
          for (let i = 0; i < 4; i++) {
            const age = (t + i * 16) % 64;
            const r = FX.snap(4 + age * 0.2, u);
            ctx.fillRect(FX.snap(st.you.x + 10 + age * 0.6, u), FX.snap(st.you.y - 26 - age * 0.3, u), r, r);
          }
        }
        // o cronômetro dele (quadro de mangá em pixel art, no alto)
        if (t > 120 && t < 168) {
          const CA = CAa();
          if (CA) {
            CA.panel(
              ctx,
              [[W * 0.6, top + 16], [W - 24, top + 8], [W - 34, top + 270], [W * 0.62, top + 282]],
              (b, g) => {
                g.fillStyle = '#e2e8f0';
                g.fillRect(b.x, b.y, b.w, b.h);
                CA.halftone(g, b.x, b.y, b.w, b.h, { step: 18, color: 'rgba(15,23,42,0.45)', from: 'bottom' });
                stopwatch(g, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.6, b.h / 190, t);
              },
              { k: seg(t, 120, 128), from: [220, 0], pixel: PIX }
            );
          }
        }
        CE.cineSfx(S, 92, 'queda', () => window.SFX?.tackle?.());
      } else if (phase === 2) {
        lampFlare(1);
        // contraluz: o Fox escuro contra o refletor, só os olhos acesos
        if (st.fox) {
          const e = eyeAt(K, st.fox.x, st.fox.y, st.fox.kneel ? -0.12 : 0, 0.9);
          const open = seg(t, 56, 64);
          if (e && open > 0) {
            [-1, 1].forEach((s) => {
              CE.cineGlow(ctx, e.x + s * 3.2 * e.u, e.y, e.u * 3, 'rgba(254,243,199,0.4)', open);
              ctx.fillStyle = '#fef3c7';
              ctx.fillRect(Math.round(e.x + s * 3.2 * e.u - e.u), Math.round(e.y - e.u * 0.5), Math.ceil(e.u * 2), Math.ceil(e.u));
            });
          }
        }
        FX.pxDust(ctx, W, top, bot, t, 30, 'rgba(219,234,254,0.4)', 3, 9, 0.15);
      } else if (phase === 3) {
        lampFlare(0.8);
        FX.vignette(ctx, W, H, '127,0,0', 0.25 + st.beat * 0.4);
        [20, 58, 92, 122, 146].forEach((b, i) => CE.cineSfx(S, b, 'tum' + i, () => window.SFX?.kick?.(0.35)));
        // os olhos na cabeça da sombra (dois quadradinhos vermelhos)
        const open = seg(t, 100, 112);
        if (open > 0) {
          const u = 4;
          [st.eyeL, st.eyeR].forEach((p) => {
            if (!p) return;
            CE.cineGlow(ctx, p.x, p.y, 16, 'rgba(239,68,68,0.7)', open);
            ctx.fillStyle = '#fca5a5';
            ctx.fillRect(Math.round(p.x - u), Math.round(p.y - u / 2), u * 2, open < 0.5 ? 1 : u);
          });
        }
      } else {
        if (t < 124) lampFlare(0.8);
        // o mundo sem cor... e o vermelho voltando do seu pé quando ele crava no chão
        const KT = 96;
        if (t < KT) FX.bwBlue(ctx, W, H, seg(t, 0, 30) * 0.85);
        else if (st.foot) FX.bwBlue(ctx, W, H, 0.85, { inside: false, x: st.foot.x, y: st.foot.y, r: ease(seg(t, KT, KT + 18)) * W * 1.3 }, '#ef4444', 0.2);
        if (t >= KT && t < KT + 1.5) FX.impactFrame(ctx, W, H);
        if (t >= KT && st.foot) {
          CE.cineFlash(ctx, W, H, 0.55 * (1 - seg(t, KT + 1, KT + 8)), '#fecaca');
          if (t < KT + 8) CE.drawRadialSpeedLines(ctx, st.foot.x, st.foot.y, W, '#7f1d1d', 0.5 * (1 - (t - KT) / 8));
          CE.cineGlow(ctx, st.you.x, st.you.y, 120, 'rgba(239,68,68,0.35)', 1 - seg(t, KT, KT + 40));
        }
        CE.cineSfx(S, KT, 'pisao', () => window.SFX?.kick?.(1));
        // antes: o pé cravando no gramado (quadro grande, a terra voando)
        if (t > 62 && t < KT) {
          cutBoot(ctx, S, seg(t, 62, 70), seg(t, 62, KT), [[40, top + 24], [W - 40, top + 12], [W - 56, bot - 28], [24, bot - 40]], [0, 60], { bg: '#e5e7eb', lines: 'rgba(69,10,10,0.75)', ground: '#14532d', sock: '#0f2942', sock2: '#38bdf8', boot: '#ef4444', spray: '#4ade80' });
        }
        CE.cineSfx(S, 122, 'apaga', () => window.SFX?.tackle?.());
        FX.dim(ctx, W, H, seg(t, 122, 128) * 0.75 + seg(t, 128, 150) * 0.25);
      }
      if (lamp && phase < 4) CE.cineGlow(ctx, lamp.x, lamp.y, 30, 'rgba(255,255,255,0.9)', 0.8);
    }
  });

  // ==========================================================================
  // 2) O MONSTRO ACORDA — no meio da partida, no estádio do capítulo
  // ==========================================================================
  const MON = { x: 53, y: 15.4 };
  const monsterChars = perRun(() => {
    const ch = window.MatchEngine?.chapter || {};
    const you = CE.foxcMonsterYou();
    const kit = ch.opponentColor ? { jerseyPrimary: ch.opponentColor, jerseySecondary: ch.opponentSecondary || '#ffffff' } : { jerseyPrimary: '#991b1b', jerseySecondary: '#f8fafc' };
    let ids = (ch.opponentIds || []).filter((id) => !/^gk_/.test(id));
    if (!ids.length) ids = ['kaiser', 'barou', 'shidou'];
    return { you, rivals: ids.slice(0, 3).map((id) => CE.cineChar(id, kit)) };
  });
  const RIV = [[-1.3, 1.1], [1.4, 0.9], [-0.4, 2.4]];
  const monScore = () => {
    const ME = window.MatchEngine;
    let hs = ME?.scoreHome ?? 1;
    let as = ME?.scoreAway ?? 2;
    if (hs >= as) {
      hs = 1;
      as = 2;
    }
    const labels = ME?.chapter?.scoreLabels || { home: 'VOCÊ', away: 'RIVAL' };
    const min = ME?.totalTime ? `${Math.round(90 * (1 - ME.timeLeft / ME.totalTime))}'` : "71'";
    return { hs, as, home: labels.home.slice(0, 10), away: labels.away.slice(0, 10), tag: `2º TEMPO • ${min}` };
  };
  // a corrida do monstro (plano 3): começa em câmera lenta e solta
  const P2M_KEYS = [[0, 0], [40, 10], [70, 34], [125, 100]];

  CE.registerCine3D('monster_awaken', {
    phases: [80, 95, 125],
    music: 'epic',
    title: '👹 O MONSTRO',
    letterbox: 0.09,
    grain: 0.05,
    vignette: 0.55,
    readScale: 0.85,
    tags: ['PLANO 1 • TUM.', 'PLANO 2 • AS CORRENTES', 'PLANO 3 • O MONSTRO ACORDOU'],
    subs: [
      [{ from: 4, who: 'VOCÊ', text: '(Perder de novo?)', color: YOU_COLOR }],
      [{ from: 4, who: 'FOX', text: '"...deixa ele sair."', color: FOX_COLOR }],
      [{ from: 30, text: '15 s: mais rápido, preciso e forte!' }]
    ],
    // (sem tema: a cena acontece no estádio da partida que está rolando)
    scene(K, S) {
      const { t, phase, f } = S;
      const { you, rivals } = monsterChars();
      const st = (K.st = {});
      if (phase === 0) {
        // TUM.: você parado no meio do jogo, ofegante; a câmera chega devagar e o coração
        // bate (a cor some a cada batida)
        K.expo(0.85);
        const beat = pulse(t, 6, 22) + pulse(t, 44, 22);
        const k = easeIO(t / 80);
        act(K, you, [MON.x, MON.y], { id: 'y', face: [MON.x, 8], frame: 0, light: [0.85, 0.82, 0.9] });
        rivals.forEach((r, i) => act(K, r, [MON.x + RIV[i][0] * lerp(1.15, 0.95, k), MON.y + RIV[i][1] * lerp(1.15, 0.95, k)], { id: 'r' + i, face: [MON.x, MON.y], anim: 'run', frame: Math.floor(t * 0.4) + i * 7, light: [0.8, 0.78, 0.85] }));
        cam(K, shake(K, [lerp(54.5, 54.2, k), lerp(12.8, 13.1, k), 0.62], f, 0.004 + beat * 0.01, 1), [MON.x - 0.1, MON.y + 0.3, 0.58], lerp(50, 44, k) - beat * 2);
        st.you = Wp([MON.x, MON.y, 0.5]);
        st.beat = beat;
      } else if (phase === 1) {
        // AS CORRENTES: o mundo sem cor, você de baixo; as correntes estouram (quadro de
        // impacto) e o vermelho volta do seu peito
        K.expo(0.85);
        const SNAP = 50;
        act(K, you, [MON.x, MON.y], { id: 'y', face: [MON.x, 8], frame: 0, light: t >= SNAP ? [1.25, 0.6, 0.55] : [0.8, 0.8, 0.9], opts: t >= SNAP ? { showAura: true, auraColor: '#dc2626' } : undefined });
        rivals.forEach((r, i) => act(K, r, [MON.x + RIV[i][0], MON.y + RIV[i][1]], { id: 'r' + i, face: [MON.x, MON.y], frame: 0, light: [0.7, 0.68, 0.75] }));
        const k = easeIO(t / 95);
        const sh = t >= SNAP && t < SNAP + 22 ? 0.035 * (1 - (t - SNAP) / 22) : 0.003;
        cam(K, shake(K, [lerp(52.45, 52.6, k), lerp(12.6, 12.85, k), 0.24], f * 2, sh, 3), [MON.x, MON.y, 0.78], 46);
        st.chest = Wp([MON.x, MON.y, 0.5]);
      } else {
        // O MONSTRO ACORDOU: você dispara para a câmera (ela recua junto, rente ao chão); os
        // rivais ficam para trás, parados; a sombra vermelha estica atrás de você
        K.expo(0.95);
        K.fog('#1a0303', 0.03);
        const A = remap(t, P2M_KEYS);
        const yy = MON.y - A * 0.045;
        // os rastros vermelhos atrás de você (a mesma pose, um pouco atrás, apagando)
        [0.55, 0.3].forEach((d, i) => act(K, you, [MON.x - d * 0.35, yy + d], { id: 'rastro' + i, face: [MON.x, 0], anim: 'run', frame: Math.floor((A - 3 - i * 3) * 0.9), alpha: 0.28 + i * 0.16, opts: { tint: '#dc2626' }, shadow: 0 }));
        act(K, you, [MON.x, yy], { id: 'y', face: [MON.x, 0], anim: 'run', frame: Math.floor(A * 0.9), light: [1.25, 0.72, 0.68], opts: { showAura: true, auraColor: '#dc2626' } });
        ball(K, [MON.x + 0.12, yy - 0.3, 0.05]);
        rivals.forEach((r, i) => act(K, r, [MON.x + RIV[i][0] * 1.3, MON.y + 0.8 + i * 0.45], { id: 'r' + i, face: [MON.x, yy], anim: 'stun', frame: 0, light: [0.55, 0.3, 0.3] }));
        FX.longShadow(K, MON.x, yy, 2.2, Math.PI / 2, 0.6, 0.5, '#450a0a');
        cam(K, shake(K, [MON.x + 1.0, yy - 2.45, 0.32], f * 2, 0.006, 5), [MON.x - 0.1, yy + 0.4, 0.62], 52);
        st.you = Wp([MON.x, yy, 0.5]);
        st.A = A;
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      const sc = monScore();
      if (phase === 0) {
        FX.bwBlue(ctx, W, H, st.beat * 0.9);
        FX.vignette(ctx, W, H, '127,0,0', 0.3 + st.beat * 0.5);
        [6, 44].forEach((b, i) => CE.cineSfx(S, b, 'tum' + i, () => window.SFX?.kick?.(0.4)));
        CE.foxcScorebug(ctx, 40, top + 22, sc.home, sc.away, sc.hs, sc.as, sc.tag, 1);
      } else if (phase === 1) {
        const SNAP = 50;
        if (t < SNAP) FX.bwBlue(ctx, W, H, 1);
        else if (st.chest) FX.bwBlue(ctx, W, H, 1, { inside: false, x: st.chest.x, y: st.chest.y, r: ease(seg(t, SNAP, SNAP + 16)) * W * 1.3 }, '#ef4444', 0.2);
        if (t >= SNAP && t < SNAP + 1.5) FX.impactFrame(ctx, W, H);
        if (t >= SNAP) {
          CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(t, SNAP + 1, SNAP + 8)), '#fecaca');
          if (st.chest && t < SNAP + 8) CE.drawRadialSpeedLines(ctx, st.chest.x, st.chest.y, W, '#7f1d1d', 0.5 * (1 - (t - SNAP) / 8));
          FX.vignette(ctx, W, H, '127,0,0', 0.45);
        }
        CE.cineSfx(S, SNAP, 'snap', () => window.SFX?.tackle?.());
        // as correntes em volta (quadro de mangá em pixel art): esticam, tremem e estouram
        const CA = CAa();
        if (CA && t > 6 && t < SNAP + 14) {
          const snapK = ease(seg(t, SNAP, SNAP + 14));
          CA.panel(
            ctx,
            [[W * 0.06, top + 18], [W * 0.94, top + 30], [W * 0.92, top + 250], [W * 0.08, top + 236]],
            (b, g) => {
              g.fillStyle = '#1c1917';
              g.fillRect(b.x, b.y, b.w, b.h);
              CA.halftone(g, b.x, b.y, b.w, b.h, { step: 18, color: 'rgba(127,29,29,0.6)', from: 'bottom' });
              const vib = t < SNAP ? 3 + seg(t, 20, SNAP) * 6 : 0;
              CE.foxcChain(g, b.x - 60, b.y + b.h * 0.15, b.x + b.w + 60, b.y + b.h * 0.85, { t, snap: snapK, link: 64, thick: 16, cut: 0.48, vib });
              CE.foxcChain(g, b.x - 60, b.y + b.h * 0.85, b.x + b.w + 60, b.y + b.h * 0.12, { t: t + 4, snap: snapK, link: 64, thick: 16, cut: 0.53, vib });
              if (t >= SNAP) CA.burst(g, b.x + b.w * 0.5, b.y + b.h * 0.5, b.h * 0.4 * ease(seg(t, SNAP, SNAP + 6)), { fill: '#fef2f2', stroke: '#7f1d1d', lw: 10 });
            },
            { k: seg(t, 6, 14), from: [0, -80], pixel: PIX }
          );
        }
      } else {
        CE.drawSpeedLines(ctx, W, H, '#fecaca', 0.1 + seg(st.A || 0, 10, 40) * 0.12);
        if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 150, 'rgba(220,38,38,0.4)', 1);
        FX.vignette(ctx, W, H, '127,0,0', 0.5);
        CE.cineSfx(S, 40, 'arranque', () => window.SFX?.whoosh?.());
        CE.foxcScorebug(ctx, 40, top + 22, sc.home, sc.away, sc.hs, sc.as, sc.tag, 1);
      }
    }
  });

  // ==========================================================================
  // 3) O DESAFIO DO RIN — noite de chuva na frente do seu prédio (montado no vazio), como
  // na conversa ('rain_street'): o carro dele parado, o poste, o jornal no asfalto
  // ==========================================================================
  const RIN_AT = [86.0, 14.25];
  const YOU_RIN = [84.05, 18.45];
  const POST = [86.75, 13.75];
  const PAPER = { x: 84.9, y: 16.6, w: 1.9, h: 1.25 };
  const rinChars = perRun(() => CE.foxcRinChars());
  // cidade em silhueta com janelas acesas (cenário pintado lá no fundo)
  const cityCv = (win, glow) =>
    FX.once('city:' + win + glow, 320, 80, (g, w, h) => {
      const gr = g.createLinearGradient(0, 20, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, glow);
      g.fillStyle = gr;
      g.fillRect(0, 20, w, h - 20);
      let x = 0;
      let i = 0;
      while (x < w) {
        const bw = 7 + hash(i, 5) * 15;
        const bh = h * (0.3 + hash(i, 6) * 0.6);
        g.fillStyle = '#060a16';
        g.fillRect(Math.round(x), Math.round(h - bh), Math.round(bw), Math.round(bh));
        for (let wy = Math.round(h - bh + 2); wy < h - 2; wy += 3) {
          for (let wx = Math.round(x + 2); wx < x + bw - 2; wx += 3) {
            if (hash(wx * 3 + wy, 9) < 0.3) {
              g.fillStyle = win;
              g.fillRect(wx, wy, 1, 2);
            }
          }
        }
        x += bw + 1;
        i++;
      }
    });
  // fachada do prédio: janelas, a porta de vidro acesa e a marquise
  const facadeCv = () =>
    FX.once('facade', 120, 100, (g, w, h) => {
      g.fillStyle = '#0d1528';
      g.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 6; c++) {
          const lit = hash(r * 7 + c, 3) < 0.3;
          const warm = hash(r * 5 + c, 8) < 0.5;
          g.fillStyle = lit ? (warm ? '#fde047' : '#93c5fd') : '#1e293b';
          g.fillRect(7 + c * 18, 5 + r * 9, 12, 5);
        }
      }
      g.fillStyle = '#060a14';
      g.fillRect(36, h - 20, 48, 20);
      g.fillStyle = '#fde68a';
      g.fillRect(46, h - 17, 28, 17);
      g.fillStyle = '#020617';
      g.fillRect(29, h - 23, 62, 3);
    });
  // feixe do farol (largo à esquerda, a fonte à direita)
  const beamCv = () =>
    FX.once('beam', 256, 64, (g) => {
      const gr = g.createLinearGradient(256, 0, 0, 0);
      gr.addColorStop(0, 'rgba(254,249,195,0.6)');
      gr.addColorStop(1, 'rgba(254,249,195,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(256, 28);
      g.lineTo(256, 36);
      g.lineTo(0, 64);
      g.lineTo(0, 0);
      g.closePath();
      g.fill();
    });
  // o jornal (com a sua foto) deitado na rua — feito grande e reduzido sem suavizar (pixel)
  const paperCv = perRun(() => {
    const { you } = rinChars();
    const name = CE.cinePlayerName();
    const big = FX.mk(380, 250, (g, w, h) => {
      g.save();
      g.translate(w / 2, h / 2);
      g.rotate(-0.06);
      const pw = 340;
      const ph = 210;
      g.fillStyle = '#d8d4c7';
      g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.fillStyle = '#0f172a';
      g.fillRect(-pw / 2, -ph / 2, pw, 26);
      CE.foxcText(g, 'DIÁRIO DO ESPORTE', 0, -ph / 2 + 13, '900 15px Georgia, serif', '#f8fafc', 1, 'center', true);
      let hf = 26;
      const head = `${name}: FAVORITO À BOLA DE OURO`;
      g.font = `900 ${hf}px "Segoe UI", sans-serif`;
      while (hf > 12 && g.measureText(head).width > pw - 20) {
        hf -= 1;
        g.font = `900 ${hf}px "Segoe UI", sans-serif`;
      }
      CE.foxcText(g, head, 0, -ph / 2 + 46, `900 ${hf}px "Segoe UI", sans-serif`, '#111827');
      g.fillStyle = '#111827';
      g.fillRect(-pw / 2 + 12, -ph / 2 + 62, pw - 24, 2);
      const port = CE.foxcPortrait(you, 'foxc3d_news_you', 100);
      g.fillStyle = '#334155';
      g.fillRect(-pw / 2 + 14, -ph / 2 + 72, 116, 116);
      g.imageSmoothingEnabled = false;
      g.drawImage(port, -pw / 2 + 22, -ph / 2 + 80, 100, 100);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = 'rgba(17,24,39,0.55)';
        g.fillRect(-pw / 2 + 142, -ph / 2 + 76 + i * 14, (pw - 160) * (0.6 + hash(i, 5) * 0.4), 6);
      }
      g.restore();
    });
    return FX.mk(190, 125, (g) => {
      g.imageSmoothingEnabled = false;
      g.drawImage(big, 0, 0, 190, 125);
    });
  });
  // a chuva molhando o papel (manchas que vão aparecendo)
  const wetCv = () =>
    FX.once('wet', 95, 63, (g, w, h) => {
      for (let i = 0; i < 18; i++) {
        const r = 2 + hash(i, 6) * 5;
        g.fillStyle = 'rgba(87,83,78,0.45)';
        g.fillRect(Math.round(8 + hash(i, 7) * (w - 16)), Math.round(8 + hash(i, 8) * (h - 16)), Math.round(r * 1.5), Math.round(r));
      }
    });
  // a rua: prédio, calçada, asfalto molhado, poste e o carro com os faróis acesos
  function rainStreet(K, beamOn = true) {
    K.sky('#01030a', '#14264a', 0.1);
    K.fog('#0a1226', 0.045);
    K.ambient('#7a90c0');
    K.expo(0.95);
    K.quad({ x: 86, y: 2, z: -3, w: 80, h: 16, ang: Math.PI / 2, img: cityCv('#93c5fd', 'rgba(30,58,138,0.35)'), em: true, alpha: 0.9 });
    K.quad({ x: 64.5, y: 17, z: -3, w: 60, h: 16, ang: 0, img: cityCv('#93c5fd', 'rgba(30,58,138,0.35)'), em: true, color: '#8090b0' });
    K.quad({ x: 75.5, y: 11.8, w: 6, h: 9, ang: Math.PI / 2, img: facadeCv(), em: true, color: '#5a6a8a' });
    K.quad({ x: 82.5, y: 12.6, w: 7.6, h: 6.4, ang: Math.PI / 2, img: facadeCv(), em: true, color: '#c8d0e0' });
    K.quad({ x: 92.0, y: 11.9, w: 7, h: 8, ang: Math.PI / 2, img: facadeCv(), em: true, color: '#56658a' });
    K.box({ x0: 66, y0: 12.6, x1: 106, y1: 14.7, z0: 0, z1: 0.07, color: '#1e293b', top: '#2a374d' });
    K.floor({ x0: 66, y0: 14.7, x1: 106, y1: 34, color: '#0b1324' });
    const [lx, ly] = POST;
    K.box({ x0: lx - 0.05, y0: ly - 0.05, x1: lx + 0.05, y1: ly + 0.05, z0: 0, z1: 2.5, color: '#0f172a' });
    K.box({ x0: lx - 1.05, y0: ly - 0.035, x1: lx + 0.05, y1: ly + 0.035, z0: 2.43, z1: 2.5, color: '#0f172a' });
    K.box({ x0: lx - 1.1, y0: ly - 0.09, x1: lx - 0.72, y1: ly + 0.09, z0: 2.32, z1: 2.43, color: '#e0f2fe', em: true });
    K.floor({ x0: lx - 2.3, y0: ly - 1.0, x1: lx + 0.4, y1: ly + 2.6, z: 0.075, img: FX.glowCv('186,230,253'), em: true, alpha: 0.32 });
    K.floor({ x0: lx - 1.4, y0: ly + 1.6, x1: lx - 0.4, y1: ly + 4.0, z: 0.01, img: FX.glowCv('186,230,253'), em: true, alpha: 0.18 });
    FX.faceCam(K, { x: lx - 0.9, y: ly + 0.05, z: 0.05, w: 2.2, h: 2.3, img: FX.coneCv(), color: '#dbeafe', em: true, alpha: 0.32 });
    // o carro que trouxe o Rin (de frente para o oeste), faróis acesos
    K.box({ x0: 88.3, y0: 15.0, x1: 91.9, y1: 16.0, z0: 0.14, z1: 0.5, color: '#06080e' });
    K.box({ x0: 89.2, y0: 15.08, x1: 91.2, y1: 15.92, z0: 0.5, z1: 0.84, color: '#070a12' });
    K.box({ x0: 89.25, y0: 15.06, x1: 91.15, y1: 15.94, z0: 0.56, z1: 0.78, color: '#0c4a6e', em: true, alpha: 0.5 });
    [[88.75, 14.97], [91.4, 14.97], [88.75, 16.03], [91.4, 16.03]].forEach(([x, y]) => K.box({ x0: x - 0.2, y0: y - 0.03, x1: x + 0.2, y1: y + 0.03, z0: 0, z1: 0.26, color: '#020305' }));
    [15.2, 15.8].forEach((y) => K.box({ x0: 88.22, y0: y - 0.08, x1: 88.3, y1: y + 0.08, z0: 0.3, z1: 0.4, color: '#fef9c3', em: true }));
    if (beamOn) FX.faceCam(K, { x: 86.6, y: 15.5, z: 0.0, w: 3.4, h: 0.85, img: beamCv(), em: true, alpha: 0.4 });
    K.floor({ x0: 84.6, y0: 14.9, x1: 88.4, y1: 16.2, img: FX.glowCv('254,249,195'), em: true, alpha: 0.22 });
  }
  // respingos da chuva no chão (anéis de pixel, tamanho pela distância)
  function splashes(ctx, K, t, n, x0, x1, y0, y1) {
    ctx.save();
    ctx.fillStyle = 'rgba(191,219,254,0.55)';
    for (let i = 0; i < n; i++) {
      const cyc = Math.floor((t * 1.5 + i * 13) / 30);
      const age = (t * 1.5 + i * 13) % 30;
      const wx = lerp(x0, x1, hash(i, cyc));
      const wy = lerp(y0, y1, hash(i + 40, cyc));
      const p = K.screen(wx, 0.02, wy);
      const q = p && K.screen(wx + 0.1, 0.02, wy);
      if (!p || !q) continue;
      const s = Math.abs(q.x - p.x) / 0.1 / 400;
      const r = Math.max(2, Math.round(age * 0.9 * s));
      ctx.globalAlpha = 1 - age / 30;
      ctx.fillRect(Math.round(p.x - r), Math.round(p.y), 2, 2);
      ctx.fillRect(Math.round(p.x + r), Math.round(p.y), 2, 2);
      ctx.fillRect(Math.round(p.x), Math.round(p.y - r * 0.3), 2, 2);
    }
    ctx.restore();
  }
  // o pisão do plano 2 (tempo da ação A): ele chega pelo norte e pisa na sua foto
  const P1R_KEYS = [[0, 0], [70, 70], [104, 80], [180, 156]];
  const STOMP = 80;
  const STOMP_T = 104;
  const STOMP_AT = [84.62, 16.48];
  const rinWalk = (A) => {
    const k = clamp(A / STOMP);
    return [lerp(84.9, STOMP_AT[0], k), lerp(14.95, STOMP_AT[1], k)];
  };

  CE.registerCine3D('rin_challenge', {
    phases: [190, 180, 180, 200],
    music: 'tension',
    title: '⚡ O DESAFIO DO RIN',
    tags: ['PLANO 1 • CHUVA', 'PLANO 2 • A MANCHETE', 'PLANO 3 • O RIVAL', 'PLANO 4 • SÓ EXISTE UM'],
    subs: [
      [{ from: 120, who: 'RIN ITOSHI', text: '"...Não. Vim ver o favorito."', color: RIN_COLOR }],
      [{ from: 122, who: 'RIN ITOSHI', text: '"Essa manchete devia ser minha."', color: RIN_COLOR }],
      [{ from: 30, who: 'RIN ITOSHI', text: '"Você tá vivendo a MINHA vida."', color: RIN_COLOR }],
      [{ from: 24, who: 'RIN ITOSHI', text: '"Bola de Ouro? Só existe UM."', color: RIN_COLOR }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.55,
    readScale: 0.85,
    theme: 'nel_dome',
    scene(K, S) {
      const { t, phase, f } = S;
      const { rin, you } = rinChars();
      const st = (K.st = {});
      rainStreet(K, phase !== 2);
      if (phase === 0) {
        // A GRUA: do alto da rua molhada até você, de longe; o Rin parado debaixo do poste
        const k = easeIO(seg(t, 0, 160));
        cam(K, shake(K, mixP([80.6, 23.6, 4.1], [81.5, 20.5, 0.64], k), f * 0.5, 0.003), mixP([85.8, 15.0, 0.25], [85.0, 15.7, 0.72], k), lerp(54, 42, k));
        act(K, you, YOU_RIN, { id: 'y', face: RIN_AT, frame: 0, light: [0.36, 0.46, 0.64] });
        act(K, rin, [RIN_AT[0], RIN_AT[1], 0.07], { id: 'rin', face: YOU_RIN, frame: 0, light: [0.72, 0.9, 1.08] });
      } else if (phase === 1) {
        // A MANCHETE: rente ao asfalto, o jornal com a sua cara; o tênis dele desce devagar
        // (câmera lenta) e pisa na foto — depois a câmera recua e mostra ele em pé em cima
        const A = remap(t, P1R_KEYS);
        const wet = seg(t, 0, 170);
        K.floor({ x0: PAPER.x - PAPER.w / 2, y0: PAPER.y - PAPER.h / 2, x1: PAPER.x + PAPER.w / 2, y1: PAPER.y + PAPER.h / 2, z: 0.012, img: paperCv(), color: '#c8cdd8' });
        K.floor({ x0: PAPER.x - PAPER.w / 2, y0: PAPER.y - PAPER.h / 2, x1: PAPER.x + PAPER.w / 2, y1: PAPER.y + PAPER.h / 2, z: 0.016, img: wetCv(), alpha: wet });
        const rp = rinWalk(A);
        const walking = A > 24 && A < STOMP;
        if (A > 24) act(K, rin, rp, { id: 'rin', face: [rp[0], rp[1] + 1], anim: walking ? 'run' : 'idle', frame: walking ? Math.floor(A * 0.4) : 0, light: [0.7, 0.86, 1.05] });
        // a água espirrando do pisão (gotas em 3D)
        if (A >= STOMP) {
          const tau = A - STOMP;
          for (let i = 0; i < 16; i++) {
            const a = (i / 16) * TAU + rnd(i, 3) * 0.4;
            const d = Math.min(0.9, tau * (0.02 + rnd(i, 4) * 0.02));
            const z = Math.max(0, tau * (0.025 + rnd(i, 5) * 0.02) - tau * tau * 0.0012);
            const x = STOMP_AT[0] + Math.cos(a) * d;
            const y = STOMP_AT[1] + Math.sin(a) * d * 0.7;
            K.box({ x0: x - 0.018, y0: y - 0.018, x1: x + 0.018, y1: y + 0.018, z0: z, z1: z + 0.036, color: '#bfdbfe', em: true, alpha: 1 - seg(tau, 24, 40) });
          }
          const q = seg(tau, 0, 26);
          const r = 0.12 + ease(q) * 0.7;
          K.floor({ x0: STOMP_AT[0] - r, y0: STOMP_AT[1] - r * 0.7, x1: STOMP_AT[0] + r, y1: STOMP_AT[1] + r * 0.7, z: 0.02, img: FX.glowCv('191,219,254'), em: true, alpha: 0.5 * (1 - q) });
        }
        const back = easeIO(seg(t, STOMP_T + 6, 176));
        const sh = t >= STOMP_T && t < STOMP_T + 20 ? 0.03 * (1 - (t - STOMP_T) / 20) : 0.002;
        const eye = mixP([PAPER.x - 0.25, PAPER.y + 1.35, 0.6], [PAPER.x - 0.55, PAPER.y + 2.95, 0.55], back);
        const look = mixP([PAPER.x - 0.05, PAPER.y - 0.12, 0.02], [STOMP_AT[0], STOMP_AT[1] - 0.1, 0.5], back);
        cam(K, shake(K, eye, f * 2, sh, 4), look, lerp(44, 42, back));
        st.stomp = Wp([STOMP_AT[0], STOMP_AT[1], 0.02]);
      } else if (phase === 2) {
        // O RIVAL: plano médio dele contra os faróis do carro (contraluz); a câmera chega
        // devagar e o escuro fecha em volta
        const k = easeIO(t / 180);
        act(K, rin, [RIN_AT[0], RIN_AT[1], 0.07], { id: 'rin', face: [83, 14.9], frame: 0, opts: { expr: 'angry' }, light: [0.3, 0.38, 0.5] });
        cam(K, shake(K, mixP([82.9, 15.55, 0.6], [83.4, 15.25, 0.62], k), f * 0.5, 0.003), [RIN_AT[0] + 0.2, RIN_AT[1] + 0.05, 0.6], lerp(42, 40, k));
        st.rin = Wp([RIN_AT[0], RIN_AT[1], 0.07]);
        st.lights = [Wp([88.26, 15.2, 0.35]), Wp([88.26, 15.8, 0.35])];
      } else {
        // SÓ EXISTE UM: os dois cara a cara debaixo do poste; um relâmpago; os dois em
        // contraluz nos quadros; depois ele vira as costas e volta para o carro
        const k = easeIO(t / 200);
        const leave = ease(seg(t, 140, 200));
        act(K, you, [84.4, 16.2], { id: 'y', face: [86, 16.2], frame: 0, light: [0.55, 0.65, 0.85] });
        act(K, rin, [lerp(85.9, 87.6, leave), lerp(16.2, 15.8, leave)], { id: 'rin', face: leave > 0 ? [89, 15.6] : [84, 16.2], anim: leave > 0 && leave < 1 ? 'run' : 'idle', frame: leave > 0 ? Math.floor(t * 0.35) : 0, light: [0.6, 0.85, 1.0] });
        const flash = pulse(t, 60, 10);
        cam(K, shake(K, [lerp(84.75, 85.45, k), lerp(19.3, 19.0, k), 0.62], f, 0.002 + flash * 0.01, 2), [lerp(85.0, 85.5, k), 16.2, 0.56], 40);
        st.flash = flash;
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      const { rin, you } = rinChars();
      const headlights = () =>
        [15.2, 15.8].forEach((y) => {
          const hp = K.screen(88.2, 0.35, y);
          if (hp) CE.cineGlow(ctx, hp.x, hp.y, 30, 'rgba(254,249,195,0.95)');
        });
      if (phase === 0) {
        splashes(ctx, K, t, 26, 80, 92, 14.8, 21);
        const lp = K.screen(POST[0] - 0.9, 2.38, POST[1]);
        if (lp) CE.cineGlow(ctx, lp.x, lp.y, 50, 'rgba(219,234,254,0.9)');
        FX.pxRain(ctx, W, top, bot, t, 170, 0.32);
        CE.luckKicker(ctx, 40, top + 30, 'NOITE DE FOLGA • NA FRENTE DO SEU PRÉDIO', seg(t, 8, 44), '#93c5fd');
      } else if (phase === 1) {
        splashes(ctx, K, t, 16, PAPER.x - 1.4, PAPER.x + 1.4, PAPER.y - 1.0, PAPER.y + 1.0);
        // antes do pisão: o tênis descendo na foto (quadro grande em pixel art)
        if (t > 74 && t < STOMP_T) {
          cutBoot(ctx, S, seg(t, 74, 82), seg(t, 74, STOMP_T), [[40, top + 24], [W - 30, top + 12], [W - 50, bot - 24], [24, bot - 40]], [0, -60], {
            bg: '#1e293b',
            lines: 'rgba(191,219,254,0.5)',
            ground: '#0b1324',
            sock: '#1f2937',
            sock2: '#334155',
            boot: '#f8fafc',
            spray: '#bfdbfe',
            flip: true,
            paper: (g, b) => {
              g.fillStyle = '#d8d4c7';
              g.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.78, b.w * 0.6, b.h * 0.2);
              g.fillStyle = '#111827';
              g.fillRect(b.x + b.w * 0.24, b.y + b.h * 0.8, b.w * 0.5, b.h * 0.03);
              for (let i = 0; i < 3; i++) g.fillRect(b.x + b.w * 0.42, b.y + b.h * (0.86 + i * 0.035), b.w * 0.3, b.h * 0.012);
              g.fillStyle = '#334155';
              g.fillRect(b.x + b.w * 0.24, b.y + b.h * 0.85, b.w * 0.14, b.h * 0.12);
            }
          });
        }
        if (t >= STOMP_T && t < STOMP_T + 1.5) FX.impactFrame(ctx, W, H);
        if (t >= STOMP_T && st.stomp) {
          CE.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, STOMP_T + 1, STOMP_T + 8)), '#dbeafe');
          if (t < STOMP_T + 8) CE.drawRadialSpeedLines(ctx, st.stomp.x, st.stomp.y, W, '#e0f2fe', 0.4 * (1 - (t - STOMP_T) / 8));
        }
        CE.cineSfx(S, STOMP_T, 'pisao', () => window.SFX?.tackle?.());
        FX.pxRain(ctx, W, top, bot, t, 110, 0.26, 0.1);
      } else if (phase === 2) {
        // contraluz: os faróis atrás dele, a borda acesa e os olhos verde-água
        (st.lights || []).forEach((p) => {
          const q = p && p.__w ? scr(K, p.__w) : null;
          if (q) CE.cineGlow(ctx, q.x, q.y, 70, 'rgba(254,249,195,0.85)');
        });
        if (st.rin) CE.cineGlow(ctx, st.rin.x, st.rin.y - 90, 170, 'rgba(186,230,253,0.16)', 1);
        const e = eyeAt(K, RIN_AT[0], RIN_AT[1], 0.07);
        if (e) {
          const open = seg(t, 60, 70);
          if (open > 0) CE.cineSpriteEyes(ctx, rin, e.x, e.y, e.u, { full: true, aura: RIN_COLOR, expr: 'angry', blink: open < 0.5, frame: 0 });
          // água escorrendo do cabelo (pixels)
          ctx.fillStyle = 'rgba(186,230,253,0.75)';
          for (let i = 0; i < 6; i++) {
            const dy = ((t * (1.5 + hash(i) * 1.5) + hash(i, 3) * 300) % 260) * (e.u / 14);
            ctx.fillRect(Math.round(e.x + (hash(i, 9) - 0.5) * 16 * e.u), Math.round(e.y - 6 * e.u + dy), Math.max(2, Math.round(e.u * 0.4)), Math.max(3, Math.round(e.u * 0.8)));
          }
        }
        FX.vignette(ctx, W, H, '2,26,29', 0.35 + ease(seg(t, 20, 170)) * 0.5);
        FX.pxRain(ctx, W, top, bot, t, 150, 0.3);
      } else {
        headlights();
        const lp = K.screen(POST[0] - 0.9, 2.38, POST[1]);
        if (lp) CE.cineGlow(ctx, lp.x, lp.y, 50, 'rgba(219,234,254,0.9)');
        // o relâmpago: o clarão, o trovão... e o mundo fica sem cor enquanto os dois se
        // encaram (a chuva para no ar); a cor volta quando ele vira as costas
        const bw = seg(t, 60, 64) * (1 - seg(t, 128, 142));
        FX.pxRain(ctx, W, top, bot, t < 64 || t > 128 ? t : 64 + (t - 64) * 0.08, 130, 0.3);
        if (bw > 0) FX.bwBlue(ctx, W, H, bw * 0.95);
        if (st.flash > 0) CE.cineFlash(ctx, W, H, 0.55 * st.flash, '#e0f2fe');
        CE.cineSfx(S, 60, 'trovao', () => window.SFX?.tackle?.());
        FX.dim(ctx, W, H, seg(t, 176, 200));
      }
    }
  });

  // ==========================================================================
  // 4) OS DOIS TÍTULOS — cada um com a sua cara:
  //   u20_celebration: Copa do Mundo SUB-20 (garotos): correria, cada um do seu jeito, o time
  //     te jogando para cima sob os fogos, a taça pequena da Sub-20 — noite colorida;
  //   wc_champion: Copa do Mundo ADULTA: câmera lenta, você ajoelhado, o Rin que não comemora,
  //     a França no chão, a taça dourada e a chuva de papel dourado — tudo pesado e dourado.
  // ==========================================================================
  const C0 = [53, 14.6];
  const celebCfg = perRun(() => {
    const c = CE.foxcCelebCfg();
    const fr = CE.KITS.france;
    c.fr = { noa: CE.cineChar('noa', fr), loki: CE.cineChar('loki', fr), hugo: CE.cineChar('hugo', fr), charles: CE.cineChar('charles', fr) };
    c.byId = (id) => c.mates.find((x) => x.id === id);
    return c;
  });
  // a mão levantada da pose de pedir a bola (braço do lado direito da tela)
  function raisedHand(K, x, y, z, k = 0.9) {
    const e = K.c.eye;
    const l = K.c.look;
    let dx = l[0] - e[0];
    let dy = l[2] - e[2];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    const r = 8.6 * SPU * k;
    return { x: x - dy * r, y: y + dx * r, z: z + 23.1 * SPU * k };
  }
  const scoreFim = (ctx, S, c, k) => CE.foxcScorebug(ctx, 40, S.top + 22, 'JAPÃO', 'FRANÇA', c.home, c.away, 'FIM DE JOGO', k);
  // o salto de quem comemora (pulos com a fase de cada um)
  const hop = (t, i, h = 0.22, sp = 0.13) => Math.abs(Math.sin(t * sp + i * 1.3)) * h;
  // jogarem você para cima (3 vezes; a última em câmera lenta)
  const TOSS_KEYS = [[0, 0], [104, 104], [150, 122], [180, 148]];
  const tossZ = (A) => {
    const q = A - 20;
    if (q < 0 || q > 126) return 0;
    const p = q % 42;
    return Math.sin((p / 42) * Math.PI) * (q < 84 ? 0.85 : 1.25);
  };

  function u20Scene(K, S) {
    const { t, phase, f } = S;
    const c = celebCfg();
    const st = (K.st = {});
    K.sky('#020617', '#1e1b4b', 0.7);
    K.expo(1.0);
    if (phase === 0) {
      // O APITO FINAL: a grua desce da arquibancada; a França no chão, o time correndo até você
      [['loki', 51.0, 16.4], ['hugo', 55.2, 16.6], ['charles', 52.4, 17.1]].forEach(([id, x, y]) => act(K, c.fr[id], [x, y], { id: 'fr' + id, face: [x - 0.5, y - 1], anim: 'kneel_down', frame: 0, light: [0.5, 0.55, 0.7] }));
      c.mates.slice(0, 6).forEach((ch, i) => {
        const side = i % 2 ? 1 : -1;
        const k = ease(seg(t, 20 + i * 6, 92 + i * 6));
        const x = lerp(C0[0] + side * (5.5 + i * 0.3), C0[0] + side * (0.7 + Math.floor(i / 2) * 0.55), k);
        const y = C0[1] + [-0.5, 0.15, -0.9][Math.floor(i / 2)] + (k < 1 ? (1 - k) * (i - 3) * 0.6 : 0);
        if (k < 1) act(K, ch, [x, y], { id: 'm' + i, face: C0, anim: 'run', frame: Math.floor(t * 0.6) + i * 7 });
        else act(K, ch, [x, y, hop(t, i)], { id: 'm' + i, face: [x, 30], anim: 'celebrate', frame: 0 });
      });
      act(K, c.you, [C0[0], C0[1], t > 40 ? hop(t, 9, 0.28) : 0], { id: 'y', face: [C0[0], 30], anim: 'celebrate', frame: 0, light: [1.1, 1.06, 0.98] });
      const k = easeIO(seg(t, 0, 140));
      cam(K, mixP([53.8, 22.4, 4.8], [53.7, 19.8, 0.72], k), mixP([53, 13.6, 0.1], [53, 14.6, 0.62], k), lerp(56, 44, k));
    } else if (phase === 1) {
      // CADA UM DO SEU JEITO: travelling de lado pelo time — o Shidou pulando, o Bachira
      // dançando, o Rin de lado, sozinho... e o Sae chegando em você
      const cx = lerp(50.3, 55.4, easeIO(t / 170));
      const row = [['shidou', 50.4, 14.3, 'celebrate', 0.3], ['bachira', 51.5, 14.0, 'call_pass', 0.12], ['gagamaru', 52.5, 14.4, 'celebrate', 0.2], ['nagi', 53.5, 13.9, 'idle', 0]];
      row.forEach(([id, x, y, an, h], i) => {
        const ch = c.byId(id);
        if (ch) act(K, ch, [x, y, hop(t, i, h, 0.15)], { id: 'r' + id, face: [x + (i % 2 ? 0.5 : -0.5), 30], anim: an, frame: an === 'call_pass' ? Math.floor(t / 8) % 2 : 0, left: id === 'bachira' ? Math.floor(t / 16) % 2 === 0 : undefined });
      });
      const rin = c.byId('rin');
      if (rin) act(K, rin, [54.55, 13.3], { id: 'rin', face: [56, 9], frame: 0, opts: { expr: 'angry' } });
      act(K, c.you, [55.5, 14.55], { id: 'y', face: [57, 14.3], anim: t > 120 ? 'idle' : 'celebrate', frame: 0 });
      const sae = c.byId('sae');
      const sk = ease(seg(t, 60, 120));
      if (sae) act(K, sae, [lerp(57.6, 56.25, sk), lerp(13.8, 14.4, sk)], { id: 'sae', face: [55.5, 14.55], anim: sk > 0 && sk < 1 ? 'run' : 'idle', frame: Math.floor(t * 0.3) });
      cam(K, shake(K, [cx, 17.7, 0.7], f * 0.5, 0.004), [cx + 0.35, 14.2, 0.6], 42);
    } else if (phase === 2) {
      // A FESTA: o time te joga para cima três vezes debaixo dos fogos (a última em câmera lenta)
      const A = remap(t, TOSS_KEYS);
      const z = tossZ(A);
      c.mates.slice(0, 6).forEach((ch, i) => {
        const a = (i / 6) * TAU + 0.5;
        const x = C0[0] + Math.cos(a) * 0.62;
        const y = C0[1] + Math.sin(a) * 0.42;
        act(K, ch, [x, y], { id: 'm' + i, face: C0, anim: 'celebrate', frame: 0 });
      });
      act(K, c.you, [C0[0], C0[1] + 0.05, 0.25 + z], { id: 'y', face: [C0[0], 30], anim: z > 0.05 ? 'celebrate' : 'call_pass', frame: 0, light: [1.15, 1.1, 1.0] });
      const k = easeIO(t / 180);
      cam(K, shake(K, [lerp(52.3, 53.6, k), 17.6, 0.24], f * 0.5, 0.003), [C0[0], C0[1], lerp(1.0, 1.2, k)], 50);
      st.you = Wp([C0[0], C0[1], 0.8 + z]);
      st.A = A;
    } else {
      // A TAÇA: você levanta a taça da Sub-20; a câmera chega de baixo, o time em volta
      const e = easeIO(t / 210);
      K.floor({ x0: C0[0] - 1.6, y0: C0[1] - 1.4, x1: C0[0] + 1.6, y1: C0[1] + 1.4, img: FX.glowCv('250,204,21'), em: true, alpha: 0.35 });
      c.mates.slice(0, 6).forEach((ch, i) => {
        const side = i % 2 ? 1 : -1;
        const x = C0[0] + side * (0.72 + Math.floor(i / 2) * 0.55);
        const y = C0[1] - 0.3 - Math.floor(i / 2) * 0.28;
        act(K, ch, [x, y, hop(t, i, 0.16)], { id: 'm' + i, face: [x, 30], anim: 'celebrate', frame: 0 });
      });
      const lift = ease(seg(t, 20, 60));
      act(K, c.you, C0, { id: 'y', face: [C0[0], 30], anim: lift > 0.5 ? 'call_pass' : 'idle', frame: 0, light: [1.2, 1.12, 0.95] });
      cam(K, mixP([53.25, 18.8, 0.42], [53.05, 17.25, 0.55], e), [C0[0], C0[1], lerp(0.62, 0.82, e)], 46);
      if (lift > 0.5) {
        const hnd = raisedHand(K, C0[0], C0[1], 0);
        K.sprite(u20CupPx(), { x: hnd.x, y: hnd.y, z: hnd.z - 0.06, w: 26 / 73, h: 26 / 73, light: [1.25, 1.15, 0.9] });
        st.cup = Wp([hnd.x, hnd.y, hnd.z + 0.12]);
      }
    }
  }
  function u20Overlay(ctx, S, K) {
    const { W, H, t, phase, top, bot } = S;
    const c = celebCfg();
    const st = stOf(K);
    if (phase === 0) {
      FX.flares(ctx, K, S, 1);
      CE.cineSfx(S, 2, 'apito', () => window.SFX?.whistle?.(1));
      if (t > 80) FX.pxConfetti(ctx, W, top, bot, t - 80, 60);
      scoreFim(ctx, S, c, seg(t, 10, 30));
    } else if (phase === 1) {
      FX.flares(ctx, K, S, 0.7);
      FX.pxConfetti(ctx, W, top, bot, t + 40, 40);
    } else if (phase === 2) {
      FX.pxFireworks(ctx, W, top + 40, top + (bot - top) * 0.38, t, 7, ['#facc15', '#38bdf8', '#f8fafc', '#ef4444', '#00f5d4'], 3);
      FX.flares(ctx, K, S, 0.9);
      FX.pxConfetti(ctx, W, top, bot, t, 50);
      if (st.you && st.A > 104 && st.A < 140) CE.cineGlow(ctx, st.you.x, st.you.y, 120, 'rgba(255,255,255,0.18)', 1);
      [24, 66, 108].forEach((a, i) => CE.cineSfx(S, a, 'boom' + i, () => window.SFX?.kick?.(0.5)));
    } else {
      FX.flares(ctx, K, S, 0.8);
      FX.pxConfetti(ctx, W, top, bot, t, 80);
      if (st.cup) CE.cineGlow(ctx, st.cup.x, st.cup.y, 70, 'rgba(250,204,21,0.4)', 1);
      if (t > 40 && t < 104) cutCup(ctx, S, seg(t, 40, 48), seg(t, 40, 104), [[W * 0.6, top + 18], [W - 24, top + 10], [W - 36, top + 290], [W * 0.63, top + 300]], [240, 0], false);
      FX.dim(ctx, W, H, seg(t, 110, 140) * 0.35);
      CE.cineTitleCard(ctx, W, top + 104, seg(t, 118, 142), { kicker: `${c.kicker} • JAPÃO ${c.home} x ${c.away} FRANÇA`, title: c.champ, sub: 'Da final do colégio ao topo do mundo.', color: '#facc15' });
    }
  }

  function wcScene(K, S) {
    const { t, phase, f } = S;
    const c = celebCfg();
    const st = (K.st = {});
    K.sky('#0b0a1a', '#3b2a12', 0.5);
    if (phase === 0) {
      // O APITO FINAL em câmera lenta: você de joelhos no meio do campo, olhando para cima;
      // o time vem correndo devagar; a grua sobe atrás de você
      K.expo(1.02);
      const A = t * 0.42;
      act(K, c.you, C0, { id: 'y', face: [C0[0], 6], anim: 'kneel', frame: 0, light: [1.15, 1.02, 0.82] });
      c.mates.slice(0, 7).forEach((ch, i) => {
        const a = -Math.PI / 2 + (i - 3) * 0.42;
        const r = lerp(5.2, 2.4, ease(A / 63));
        const x = C0[0] + Math.cos(a) * r;
        const y = C0[1] + Math.sin(a) * r * 0.75;
        act(K, ch, [x, y], { id: 'm' + i, face: C0, anim: 'run', frame: Math.floor(A * 0.6) + i * 7, light: [1.05, 0.95, 0.78] });
      });
      const k = easeIO(seg(t, 0, 150));
      cam(K, mixP([53.4, 17.4, 0.3], [53.9, 19.0, 1.7], k), mixP([53, 13.6, 0.75], [53, 13.4, 0.6], k), lerp(46, 50, k));
      st.you = Wp([C0[0], C0[1], 0.4]);
    } else if (phase === 1) {
      // O RIVAL: o Rin passa do seu lado sem comemorar; lá atrás a festa
      K.expo(1.0);
      const rk = easeIO(seg(t, 10, 160));
      const rin = c.byId('rin');
      act(K, c.you, [53.4, 14.7], { id: 'y', face: [52, 14.7], frame: 0, light: [1.1, 1.0, 0.85] });
      if (rin) act(K, rin, [lerp(55.4, 51.2, rk), 14.35], { id: 'rin', face: [48, 14.3], anim: rk > 0 && rk < 1 ? 'run' : 'idle', frame: Math.floor(t * 0.28), opts: { expr: 'angry' }, light: [0.9, 0.95, 1.05] });
      [['bachira', 51.6, 11.6, 'celebrate', 0.25], ['shidou', 52.6, 11.3, 'celebrate', 0.3], ['nagi', 54.4, 11.8, 'sit_floor', 0], ['sae', 55.3, 11.4, 'idle', 0], ['chigiri', 53.5, 11.0, 'celebrate', 0.2], ['kunigami', 56.2, 11.9, 'celebrate', 0.18]].forEach(([id, x, y, an, h], i) => {
        const ch = c.byId(id);
        if (ch) act(K, ch, [x, y, hop(t, i, h)], { id: 'b' + id, face: [x, 30], anim: an, frame: 0, light: [1.15, 1.0, 0.75] });
      });
      K.floor({ x0: 50.5, y0: 9.8, x1: 57.5, y1: 13.2, img: FX.glowCv('250,204,21'), em: true, alpha: 0.3 });
      cam(K, shake(K, [lerp(54.4, 52.6, rk), 17.65, 0.66], f * 0.5, 0.003), [lerp(54.0, 52.6, rk), 14.0, 0.62], 42);
    } else if (phase === 2) {
      // O OUTRO LADO: a França no chão, perto; a festa japonesa lá longe, dourada
      K.expo(0.95);
      K.floor({ x0: 48.5, y0: 9.2, x1: 57.5, y1: 12.4, img: FX.glowCv('250,204,21'), em: true, alpha: 0.4 });
      [c.you, ...c.mates.slice(0, 6)].forEach((ch, i) => act(K, ch, [50.1 + i * 0.97, 10.7 + (i % 2) * 0.35, hop(t, i, 0.26)], { id: 'l' + i, face: [50.1 + i * 0.97, 30], anim: 'celebrate', frame: 0, light: [1.35, 1.15, 0.7] }));
      act(K, c.fr.hugo, [51.85, 16.2], { id: 'hugo', face: [52, 12], anim: 'kneel_down', frame: 0, light: [0.4, 0.45, 0.62] });
      act(K, c.fr.loki, [54.3, 16.45], { id: 'loki', face: [54, 12], anim: 'sit_floor', frame: 0, light: [0.38, 0.43, 0.6] });
      act(K, c.fr.noa, [53.1, 15.3], { id: 'noa', face: [53, 11], frame: 0, light: [0.42, 0.47, 0.64] });
      const k = easeIO(t / 200);
      cam(K, [lerp(52.5, 53.6, k), lerp(19.6, 19.2, k), 0.62], [53, 14.4, 0.62], 40);
    } else {
      // A TAÇA DE VERDADE: o time inteiro em volta, a taça dourada no alto; a grua sobe
      // e abre o estádio inteiro — chuva de papel dourado
      K.expo(1.04);
      const e = easeIO(seg(t, 30, 210));
      K.floor({ x0: C0[0] - 2.2, y0: C0[1] - 1.6, x1: C0[0] + 2.2, y1: C0[1] + 1.6, img: FX.glowCv('250,204,21'), em: true, alpha: 0.45 });
      c.mates.slice(0, 8).forEach((ch, i) => {
        const side = i % 2 ? 1 : -1;
        const x = C0[0] + side * (0.62 + Math.floor(i / 2) * 0.5);
        const y = C0[1] - 0.25 - Math.abs(Math.floor(i / 2) - 1.2) * 0.25;
        act(K, ch, [x, y, hop(t, i, 0.12, 0.1)], { id: 'm' + i, face: [x, 30], anim: 'celebrate', frame: 0, light: [1.2, 1.08, 0.82] });
      });
      act(K, c.you, C0, { id: 'y', face: [C0[0], 30], anim: 'call_pass', frame: 0, light: [1.3, 1.18, 0.9] });
      cam(K, mixP([53.1, 17.2, 0.36], [53.0, 21.8, 3.9], e), mixP([C0[0], C0[1], 0.95], [C0[0], 13.6, 0.3], e), lerp(46, 54, e));
      const hnd = raisedHand(K, C0[0], C0[1], 0);
      K.sprite(wcCupPx(), { x: hnd.x, y: hnd.y, z: hnd.z - 0.08, w: 16 / 73, h: 32 / 73, light: [1.3, 1.2, 0.9] });
      st.cup = Wp([hnd.x, hnd.y, hnd.z + 0.2]);
    }
  }
  const GOLD = ['#facc15', '#fde68a', '#f8fafc', '#eab308', '#fef3c7'];
  function wcOverlay(ctx, S, K) {
    const { W, H, t, phase, top, bot } = S;
    const c = celebCfg();
    const st = stOf(K);
    if (phase === 0) {
      FX.flares(ctx, K, S, 1, TOWERS, null, '253,230,138');
      CE.cineSfx(S, 2, 'apito', () => window.SFX?.whistle?.(1));
      if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 160, 'rgba(253,230,138,0.2)', 1);
      if (t > 70) FX.pxConfetti(ctx, W, top, bot, (t - 70) * 0.42, 40, GOLD, 5, 33);
      scoreFim(ctx, S, c, seg(t, 10, 30));
      CE.luckKicker(ctx, 40, bot - 40, 'COPA DO MUNDO • A GRANDE FINAL', seg(t, 30, 70), '#facc15');
    } else if (phase === 1) {
      FX.flares(ctx, K, S, 0.7, TOWERS, null, '253,230,138');
      FX.pxConfetti(ctx, W, top, bot, t, 40, GOLD, 5, 33);
    } else if (phase === 2) {
      // a França sem cor (só a festa lá atrás brilha)
      FX.bwBlue(ctx, W, H, 0.35);
      FX.pxConfetti(ctx, W, top, top + (bot - top) * 0.55, t, 30, GOLD, 4, 41);
    } else {
      FX.flares(ctx, K, S, 1, TOWERS, null, '253,230,138');
      FX.pxConfetti(ctx, W, top, bot, t, 110, GOLD, 5, 33);
      if (st.cup) CE.cineGlow(ctx, st.cup.x, st.cup.y, 80, 'rgba(250,204,21,0.45)', 1);
      if (t > 14 && t < 78) cutCup(ctx, S, seg(t, 14, 22), seg(t, 14, 78), [[W * 0.06, top + 18], [W * 0.4, top + 10], [W * 0.38, top + 300], [W * 0.04, top + 290]], [-240, 0], true);
      FX.dim(ctx, W, H, seg(t, 120, 150) * 0.3);
      CE.cineTitleCard(ctx, W, top + 104, seg(t, 128, 152), { kicker: `${c.kicker} • JAPÃO ${c.home} x ${c.away} FRANÇA`, title: c.champ, sub: 'O Japão no topo do planeta.', color: '#facc15' });
    }
  }

  CE.registerCine3D('u20_celebration', {
    phases: [150, 170, 180, 210],
    music: 'victory',
    title: '🏆 JAPÃO CAMPEÃO DA COPA DO MUNDO SUB-20',
    tags: ['PLANO 1 • O APITO FINAL', 'PLANO 2 • CADA UM DO SEU JEITO', 'PLANO 3 • A FESTA', 'PLANO 4 • A TAÇA'],
    subs: [
      [{ from: 4, who: 'NARRADOR', text: '"ACABOU! JAPÃO CAMPEÃO!!"', color: '#facc15' }],
      [{ from: 118, who: 'SAE ITOSHI', text: '"Esse gol foi o meu passe."', color: '#f87171' }],
      [{ from: 14, text: 'Fogos no céu. Ninguém quer ir embora.' }],
      [{ from: 12, text: 'Da final do colégio ao topo do mundo.' }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.45,
    readScale: 0.85,
    theme: 'worldcup_final',
    scene: u20Scene,
    overlay: u20Overlay
  });
  CE.registerCine3D('wc_champion', {
    phases: [150, 170, 200, 210],
    music: 'victory',
    title: '🏆 JAPÃO CAMPEÃO DA COPA DO MUNDO',
    tags: ['PLANO 1 • O APITO FINAL', 'PLANO 2 • O RIVAL NÃO COMEMORA', 'PLANO 3 • O OUTRO LADO', 'PLANO 4 • A TAÇA DE VERDADE'],
    subs: [
      [{ from: 6, who: 'NARRADOR MUNDIAL', text: '"ACABOU A COPA!!"', color: '#facc15' }],
      [{ from: 60, who: 'RIN ITOSHI', text: '"Da próxima, o gol é meu."', color: RIN_COLOR }],
      [{ from: 30, who: 'HUGO', text: '"A gente volta. Daqui a quatro anos."', color: '#93c5fd' }],
      [{ from: 12, text: 'A taça de verdade. Pela 1ª vez na história.' }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.45,
    readScale: 0.85,
    theme: 'worldcup_final',
    scene: wcScene,
    overlay: wcOverlay
  });

  // ==========================================================================
  // 5) CRÉDITOS FINAIS — a câmera passeia pelo prédio inteiro enquanto os nomes passam:
  // campo (título) → seu quarto → túnel → saguão (elenco) → telão e o Fox → campo ao amanhecer
  // (o último chute, como o "chuta uma pra mim" do Tada na conversa de antes)
  // ==========================================================================
  const credChars = perRun(() => ({
    you: CE.cineYou({ jerseyPrimary: '#1d4ed8', jerseySecondary: '#ffffff' }),
    youJp: CE.cineYou(CE.KITS.japan),
    tada: CE.getSpeakerCharData('TADA'),
    rin: CE.cineChar('rin', { angry: true }),
    sae: CE.cineChar('sae'),
    anri: CE.getSpeakerCharData('ANRI'),
    ego: CE.getSpeakerCharData('EGO'),
    fox: CE.foxcFox()
  }));
  // o elenco inteiro (sem os genéricos) e o lugar de cada um no saguão: fileiras ao sul dos sofás
  let CAST = null;
  const castList = () => CAST || (CAST = (window.BLUE_LOCK_CHARACTERS || []).filter((c) => !/^gen_|^gk_/.test(c.id)));
  let SPOTS = null;
  const castSpots = () => {
    if (SPOTS) return SPOTS;
    SPOTS = [];
    const pillar = (x, y) => [21, 28].some((px) => x > px - 0.2 && x < px + 1.2) && y > 16.8 && y < 18.2;
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 18; i++) {
        const x = 17.6 + i * 0.86 + (r % 2) * 0.43;
        const y = 16.15 + r * 0.8;
        if (x > 32.5 || pillar(x, y)) continue;
        SPOTS.push([x, y]);
      }
    }
    return SPOTS;
  };
  const credCamX = (t) => lerp(18.6, 31.2, easeIO(t / 540));
  const FOX_LOBBY = [29.7, 11.7];
  // o último chute (plano 6): câmera lenta no contato
  const CRED_KEYS = [[0, 0], [56, 56], [96, 70], [480, 454]];
  const credKick = (A) => (A < 58 ? 'idle' : A < 70 ? 'windup' : A < 100 ? 'shoot' : 'idle');
  function credBall(A) {
    const k = seg(A, 70, 104);
    if (k <= 0) return [53.05, 8.95, 0];
    if (k >= 1) return [53.35, 6.3, 0.12];
    return [lerp(53.05, 53.35, k), lerp(8.95, 6.35, k), Math.sin(k * Math.PI) * 0.45 + k * 0.25];
  }

  CE.registerCine3D('credits', {
    phases: [300, 360, 360, 540, 360, 480],
    music: 'promise',
    title: '🎬 CRÉDITOS',
    letterbox: 0.1,
    grain: 0.05,
    vignette: 0.45,
    tags: ['BLUE LOCK: EGOIST CAREER', 'ESTRELANDO', 'OS IRMÃOS ITOSHI', 'ELENCO', 'O BLUE LOCK E A RAPOSA', 'FIM'],
    subs: [[], [], [], [], [], []],
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, f } = S;
      const c = credChars();
      const st = (K.st = {});
      if (phase === 0) {
        // o campo à noite: você e o Tada em silhueta perto do gol; a grua sobe e abre
        K.sky('#01030a', '#1e3a8a', 1);
        K.expo(0.85);
        const e = easeIO(t / 300);
        cam(K, [53 + Math.sin(e * 0.6) * 0.8, lerp(13.4, 18.2, e), lerp(0.45, 3.4, e)], [53, lerp(7.6, 8.4, e), lerp(0.75, 1.5, e)], lerp(40, 48, e));
        act(K, c.tada, [51.4, 8.7], { id: 'sil', face: [52.6, 8.6], frame: 0, opts: { tint: '#020617' } });
        act(K, c.you, [52.5, 8.5], { id: 'sil', face: [51.4, 8.7], frame: 0, opts: { tint: '#020617' } });
        K.ball(52.85, 8.55, 0, { light: [0.15, 0.17, 0.25] });
        TOWERS.forEach((tw) => [[51.4, 8.7], [52.5, 8.5]].forEach((p) => FX.shadowFrom(K, tw, p, 0.8, 0.3, 0.16)));
      } else if (phase === 1) {
        // ESTRELANDO: você no seu quarto, a câmera entrando devagar pela porta
        K.expo(0.95);
        const e = easeIO(t / 360);
        cam(K, mixP([13.5, 28.9, 1.05], [12.95, 27.9, 0.92], e), mixP([12.65, 25.0, 0.62], [12.5, 25.0, 0.6], e), 40);
        act(K, c.youJp, [11.9, 25.1], { id: 'y', face: [13.3, 28.4], frame: 0, light: [1.0, 1.1, 1.2] });
      } else if (phase === 2) {
        // OS IRMÃOS ITOSHI: no túnel do campo, um de cada lado, a saída acesa lá atrás
        K.expo(0.92);
        const e = easeIO(t / 360);
        cam(K, [lerp(35.6, 36.5, e), 14.5, 0.95], [40.5, 14.5, 0.72], 48);
        K.quad({ x: 44.05, y: 14.5, z: 0, w: 1.0, h: 1.5, ang: Math.PI, color: '#e0f2fe', em: true });
        act(K, c.rin, [38.3, 13.8], { id: 'rin', face: [36, 14.5], frame: 0, light: [0.55, 0.95, 1.05] });
        act(K, c.sae, [38.9, 15.25], { id: 'sae', face: [36, 14.5], frame: 0, light: [1.15, 0.62, 0.62] });
      } else if (phase === 3) {
        // ELENCO: todo mundo que cruzou o seu caminho, em fileiras no saguão (travelling)
        K.expo(0.95);
        const cx = credCamX(t);
        cam(K, [cx, 20.45, 1.42], [cx + 0.9, 16.4, 0.5], 46);
        const cast = castList();
        castSpots().forEach(([x, y], i) => {
          const ch = cast[i];
          if (!ch || Math.abs(x - cx - 0.9) > 5.4) return;
          act(K, ch, [x, y], { id: 'elenco', face: [x + (cx - x) * 0.3, 21], frame: 0, k: 0.86 });
        });
      } else if (phase === 4) {
        // o Ego e a Anri na frente do telão... e a câmera acha o Fox no canto escuro do saguão
        K.expo(0.9);
        const pan = easeIO(seg(t, 150, 200));
        const dol = easeIO(seg(t, 190, 360));
        const eye = mixP(mixP([25.0, 13.0, 1.12], [25.5, 12.85, 1.1], easeIO(t / 150)), [27.2, 12.7, 1.0], dol);
        const look = mixP([25.1, 10.3, 0.72], [FOX_LOBBY[0] - 0.2, FOX_LOBBY[1] - 0.5, 0.66], pan);
        cam(K, eye, look, 44);
        act(K, c.ego, [24.5, 10.35], { id: 'ego', face: [25, 13], frame: 0, k: 0.95 });
        act(K, c.anri, [25.75, 10.6], { id: 'anri', face: [25, 13], frame: 0 });
        act(K, c.fox, FOX_LOBBY, { id: 'fox', face: [eye[0], eye[1]], frame: 0, light: [0.42, 0.14, 0.12] });
      } else {
        // FIM: o campo ao amanhecer, o último chute (câmera lenta no contato), a grua sobe
        K.sky('#0b1d4d', '#f59e0b', 0.05);
        K.fog('#2a2238', 0.02);
        K.expo(1.0);
        const A = remap(t, CRED_KEYS);
        const e = easeIO(seg(t, 130, 350));
        cam(K, mixP([55.1, 10.7, 0.55], [56.6, 15.8, 3.3], e), mixP([53, 7.6, 0.6], [53, 8.2, 0.9], e), lerp(42, 46, e));
        act(K, c.tada, [50.5, 9.9], { id: 'tada', face: [53, 8.6], frame: 0, light: [0.32, 0.3, 0.38] });
        act(K, c.you, [53, 9.3], { id: 'y', face: [53, 6.6], anim: credKick(A), frame: credKick(A) === 'idle' ? 0 : 1, light: [1.1, 0.92, 0.8] });
        const b = credBall(A);
        if (t < 470) ball(K, b, { light: [1.1, 0.95, 0.85] });
        st.ball = Wp(b);
        st.foot = Wp([53.05, 8.95, 0.1]);
        st.A = A;
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        FX.flares(ctx, K, S, 0.6);
        // estrela cadente (risco de quadradinhos) e o título com o brilho passando
        const sk = seg(t, 30, 60);
        if (sk > 0 && sk < 1) {
          const sx = lerp(W * 0.85, W * 0.45, sk);
          const sy = lerp(top + 30, top + 140, sk);
          ctx.fillStyle = '#ffffff';
          for (let i = 0; i < 12; i++) {
            ctx.globalAlpha = 1 - i / 12;
            ctx.fillRect(FX.snap(sx + i * 12, 3), FX.snap(sy - i * 3.4, 3), 3, 3);
          }
          ctx.globalAlpha = 1;
        }
        const tk = ease(seg(t, 60, 100));
        if (tk > 0) {
          const T = CE.foxcTitleCv(W);
          const y = top + 70 + (1 - tk) * 20;
          ctx.save();
          ctx.globalAlpha = tk;
          ctx.drawImage(T.cv, 0, y);
          const gx = lerp(-300, W + 300, seg(t, 110, 170));
          if (gx > -300 && gx < W + 300) {
            const g2 = T.glint.getContext('2d');
            g2.clearRect(0, 0, W, 220);
            g2.globalCompositeOperation = 'source-over';
            g2.drawImage(T.cv, 0, 0);
            g2.globalCompositeOperation = 'source-in';
            const gr = g2.createLinearGradient(gx - 120, 0, gx + 120, 0);
            gr.addColorStop(0, 'rgba(255,255,255,0)');
            gr.addColorStop(0.5, 'rgba(255,255,255,0.9)');
            gr.addColorStop(1, 'rgba(255,255,255,0)');
            g2.fillStyle = gr;
            g2.fillRect(0, 0, W, 220);
            g2.globalCompositeOperation = 'source-over';
            ctx.drawImage(T.glint, 0, y);
          }
          ctx.restore();
        }
        CE.foxcText(ctx, 'UMA HISTÓRIA SOBRE EGO', W / 2, top + 40, '900 14px "Segoe UI", sans-serif', '#93c5fd', seg(t, 20, 50) * (1 - seg(t, 270, 295)), 'center', true);
        CE.foxcText(ctx, 'Obrigado por chegar até aqui.', W / 2, bot - 40, 'italic 600 20px "Segoe UI", sans-serif', '#cbd5e1', seg(t, 180, 210) * (1 - seg(t, 275, 298)));
      } else if (phase === 1) {
        FX.pxDust(ctx, W, top, bot, t, 24, 'rgba(56,189,248,0.35)', 3, 15, 0.15);
        CE.foxcGradH(ctx, W * 0.45, top, W * 0.55, bot - top, [[0, 'rgba(2,6,23,0)'], [0.4, 'rgba(2,6,23,0.7)'], [1, 'rgba(2,6,23,0.85)']]);
        CE.foxcCredits(
          ctx,
          W * 0.72,
          top + 110,
          [['kick', 'ESTRELANDO'], ['name', CE.cinePlayerName()], ['role', 'atacante nº 1 do Blue Lock'], ['gap'], ['kick', 'TÍTULOS'], ['line', 'Campeão da Copa do Mundo Sub-20'], ['line', 'Campeão da Copa do Mundo'], ['line', 'Bola de Ouro']],
          seg(t, 20, 140),
          seg(t, 330, 358)
        );
      } else if (phase === 2) {
        const d = K.screen(44.05, 0.75, 14.5);
        if (d) CE.cineGlow(ctx, d.x, d.y, 200, 'rgba(219,234,254,0.35)');
        FX.pxDust(ctx, W, top, bot, t, 26, 'rgba(226,232,240,0.4)', 3, 17, 0.1);
        CE.foxcGrad(ctx, 0, bot - 240, W, 240, [[0, 'rgba(2,6,23,0)'], [0.45, 'rgba(2,6,23,0.85)'], [1, 'rgba(2,6,23,0.97)']]);
        const out = seg(t, 330, 358);
        CE.foxcCredits(ctx, W * 0.24, bot - 96, [['kick', 'O RIVAL MORTAL'], ['name', 'RIN ITOSHI']], seg(t, 50, 150), out);
        CE.foxcCredits(ctx, W * 0.74, bot - 96, [['kick', 'O GÊNIO QUE DISSE O SEU NOME'], ['name', 'SAE ITOSHI']], seg(t, 90, 190), out);
      } else if (phase === 3) {
        // os nomes de todo o elenco subindo à direita; o título fixo à esquerda
        const cast = castList();
        CE.foxcGradH(ctx, 0, 0, W * 0.5, H, [[0, 'rgba(2,6,23,0.95)'], [0.5, 'rgba(2,6,23,0.7)'], [1, 'rgba(2,6,23,0)']]);
        CE.foxcGradH(ctx, W * 0.62, 0, W * 0.38, H, [[0, 'rgba(2,6,23,0)'], [0.5, 'rgba(2,6,23,0.75)'], [1, 'rgba(2,6,23,0.92)']]);
        CE.foxcCredits(ctx, 60, H * 0.42, [['kick', 'ELENCO'], ['name', 'TODOS OS EGOS'], ['role', 'que cruzaram o seu caminho']], seg(t, 10, 80), seg(t, 510, 538), 'left');
        const step = 44;
        const total = cast.length * step;
        const y0 = bot + 20 - (t / 530) * (total + (bot - top) + 40);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, W, bot - top);
        ctx.clip();
        cast.forEach((ch, i) => {
          const y = y0 + i * step;
          if (y < top - 30 || y > bot + 30) return;
          const a = Math.min(1, (y - top) / 60, (bot - y) / 60);
          CE.foxcText(ctx, (ch.name || '').toUpperCase(), W - 70, y, '800 17px "Segoe UI", sans-serif', '#e2e8f0', clamp(a), 'right');
          CE.foxcText(ctx, ch.team || ch.pos || '', W - 70, y + 17, '700 11px "Segoe UI", sans-serif', ch.auraColor || '#64748b', clamp(a) * 0.9, 'right');
        });
        ctx.restore();
      } else if (phase === 4) {
        // a brasa do charuto e a fumaça do Fox (quadradinhos, no tamanho do boneco)
        const fe = eyeAt(K, FOX_LOBBY[0], FOX_LOBBY[1], 0);
        if (fe) {
          const u = Math.max(2, Math.round(fe.u * 0.5));
          const bx = Math.round(fe.x + 4.5 * fe.u);
          const by = Math.round(fe.y + 3.2 * fe.u);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(bx, by, u * 5, u);
          CE.cineGlow(ctx, bx + u * 5, by, fe.u * (1.2 + Math.sin(t * 0.2) * 0.25), 'rgba(249,115,22,0.95)');
          ctx.fillStyle = '#f97316';
          ctx.fillRect(bx + u * 5, by, u, u);
          for (let i = 0; i < 9; i++) {
            const age = (t * 0.8 + i * 14) % 120;
            const r = FX.snap(fe.u * (0.6 + age * 0.03), u);
            ctx.fillStyle = `rgba(148,163,184,${0.22 * (1 - age / 120)})`;
            ctx.fillRect(FX.snap(bx + u * 6 + Math.sin(age * 0.06 + i) * fe.u * 1.3, u), FX.snap(by - age * fe.u * 0.13, u), r, r);
          }
          if (t > 200) {
            const open = seg(t, 200, 212);
            [-1, 1].forEach((s) => {
              CE.cineGlow(ctx, fe.x + s * 3 * fe.u, fe.y, fe.u * 1.8, 'rgba(255,255,255,0.6)', open);
              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = open;
              ctx.fillRect(Math.round(fe.x + s * 3 * fe.u - fe.u * 0.6), Math.round(fe.y - fe.u * 0.3), Math.ceil(fe.u * 1.2), Math.ceil(fe.u * 0.6));
              ctx.globalAlpha = 1;
            });
          }
        }
        CE.foxcGrad(ctx, 0, bot - 220, W, 220, [[0, 'rgba(2,6,23,0)'], [0.5, 'rgba(2,6,23,0.85)'], [1, 'rgba(2,6,23,0.97)']]);
        CE.foxcCredits(ctx, W * 0.27, bot - 128, [['kick', 'O PROJETO BLUE LOCK'], ['name', 'JINPACHI EGO'], ['role', 'e Anri Teieri, que acreditou primeiro']], seg(t, 30, 120), seg(t, 330, 358));
        CE.foxcCredits(ctx, W * 0.78, bot - 128, [['kick', 'O TREINADOR'], ['name', 'FOX'], ['role', 'paradeiro desconhecido']], seg(t, 180, 260), seg(t, 330, 358));
      } else {
        // o último chute: o rastro da bola e o barulho
        if (st.ball && st.A > 70 && st.A < 104) CE.luckStreak(ctx, st.foot.x, st.foot.y, st.ball.x, st.ball.y, 2, 14, '0,245,212', 0.7);
        CE.cineSfx(S, 96, 'chute', () => window.SFX?.kick?.(1));
        FX.pxDust(ctx, W, top, bot, t, 20, 'rgba(253,230,138,0.35)', 3, 19, 0.1);
        const k1 = seg(t, 140, 200);
        const o1 = seg(t, 270, 290);
        if (k1 > 0 && o1 < 1) CE.foxcGrad(ctx, 0, top, W, 260, [[0, `rgba(2,6,23,${0.75 * (1 - o1)})`], [1, 'rgba(2,6,23,0)']]);
        CE.foxcCredits(ctx, W / 2, top + 70, [['kick', 'BASEADO EM'], ['line', 'Blue Lock, de Muneyuki Kaneshiro e Yusuke Nomura'], ['gap'], ['kick', 'E VOCÊ'], ['line', 'que chutou quando todo mundo mandava passar.']], k1, o1);
        const k2 = seg(t, 300, 330);
        CE.cineTitleCard(ctx, W, top + 130, k2, { kicker: 'F I M', title: 'OBRIGADO POR JOGAR!', sub: '', color: '#facc15' });
        FX.dim(ctx, W, H, seg(t, 430, 480) * 0.85);
      }
      // corte para o próximo lugar do prédio: abre do preto
      if (phase > 0 && t < 18) FX.dim(ctx, W, H, 1 - t / 18);
    }
  });

  // ==========================================================================
  // 6) A ABERTURA DA COPA DO MUNDO — tudo no estádio (onde a conversa acontece): a
  // cerimônia, o sorteio no telão, os rivais, o túnel e o Japão entrando em campo
  // ==========================================================================
  // anel de luz (show no gramado) e feixe de holofote
  const ringCv = () =>
    FX.once('ring', 64, 64, (g) => {
      g.fillStyle = '#ffffff';
      for (let a = 0; a < TAU; a += 0.06) g.fillRect(Math.round(32 + Math.cos(a) * 28) - 1, Math.round(32 + Math.sin(a) * 28) - 1, 3, 3);
    });
  const beamVCv = () =>
    FX.once('beamv', 32, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(255,255,255,0.7)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 32, 256);
    });
  // feixe inclinado saindo de (x, z0, y) na direção (dx, 1, dy), virado para a câmera
  const Qv = (v, a, b, c, d, n) => {
    const P = (p, u, w) => v.push(p[0], p[1], p[2], u, w, n[0], n[1], n[2]);
    P(a, 0, 0);
    P(b, 1, 0);
    P(c, 1, 1);
    P(a, 0, 0);
    P(c, 1, 1);
    P(d, 0, 1);
  };
  function beam(K, x, y, z0, dx, dy, len, w0, w1, color, alpha) {
    const n = Math.hypot(dx, 1, dy);
    const d = [dx / n, 1 / n, dy / n];
    const e = K.c.eye;
    const c = [e[0] - x, e[1] - z0, e[2] - y];
    let s = [d[1] * c[2] - d[2] * c[1], d[2] * c[0] - d[0] * c[2], d[0] * c[1] - d[1] * c[0]];
    const sl = Math.hypot(s[0], s[1], s[2]) || 1;
    s = s.map((v) => v / sl);
    const T = [x + d[0] * len, z0 + d[1] * len, y + d[2] * len];
    const B = [x, z0, y];
    const v = [];
    const P = (p, sg, w) => [p[0] + s[0] * w * sg, p[1] + s[1] * w * sg, p[2] + s[2] * w * sg];
    Qv(v, P(T, -1, w1), P(T, 1, w1), P(B, 1, w0), P(B, -1, w0), [c[0], c[1], c[2]]);
    K._push(v, { img: beamVCv(), color, em: true, alpha });
  }
  const OPEN_TEAMS = [['jp', 'JAPÃO'], ['it', 'ITÁLIA'], ['ar', 'ARGENTINA'], ['ng', 'NIGÉRIA']];
  const OPEN_RIVALS = [
    ['lorenzo', 'it', 'ITÁLIA', 'A MURALHA DE DON LORENZO', '#1d4ed8'],
    ['gen_argentina_fw', 'ar', 'ARGENTINA', 'A CAMISA MAIS PESADA DO GRUPO', '#7dd3fc'],
    ['gen_nigeria_fw', 'ng', 'NIGÉRIA', 'A VELOCIDADE QUE ASSUSTA', '#22c55e']
  ];
  const openChars = perRun(() => ({
    tun: CE.japanSquad(['sae', 'rin', 'shidou', 'bachira', 'nagi', 'chigiri']),
    ent: CE.japanSquad(['sae', 'rin', 'shidou', 'bachira', 'nagi', 'chigiri', 'gagamaru']),
    rivals: OPEN_RIVALS.map(([id]) => CE.cineChar(id))
  }));
  // a cerimônia: gente com as cores das seleções em roda no meio do campo
  const PERF = ['#1d4ed8', '#dc2626', '#16a34a', '#facc15', '#38bdf8', '#f8fafc', '#7dd3fc', '#f97316'];
  let PERFS = null;
  const perfChars = () => {
    if (PERFS) return PERFS;
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    PERFS = Array.from({ length: 16 }, (_, i) => ({ name: 'abertura' + i, skinColor: skins[i % skins.length], hairColor: '#1b2340', hairSecondary: '#1b2340', eyeColor: '#1e293b', hairStyle: hairs[(i * 5) % hairs.length], jerseyPrimary: PERF[i % PERF.length], jerseySecondary: '#ffffff', number: i + 1 }));
    return PERFS;
  };
  // o telão do sorteio (em cima da arquibancada norte), em pixel: 128 x 96 com letra pequena
  const BOARD = { x: 53, y: 4.05, z: 4.85, w: 6.4, h: 4.8 };
  const boardCv = () => FX.once('board', 128, 96, () => {});
  function drawBoard(t) {
    const g = boardCv().getContext('2d');
    const w = 128;
    const h = 96;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#050a1c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#facc15';
    g.fillRect(0, 0, w, 18);
    g.fillRect(0, 0, w, 1);
    g.fillRect(0, h - 1, w, 1);
    g.fillRect(0, 0, 1, h);
    g.fillRect(w - 1, 0, 1, h);
    CE.foxcText(g, 'SORTEIO • GRUPO E', w / 2, 9, '900 9px "Segoe UI", sans-serif', '#020617', 1, 'center');
    const rowH = (h - 22) / 4;
    OPEN_TEAMS.forEach(([code, nm], i) => {
      const at = 26 + i * 34;
      const ry = Math.round(21 + i * rowH);
      g.fillStyle = '#16203a';
      g.fillRect(3, ry, w - 6, Math.round(rowH - 3));
      const k = seg(t, at, at + 8);
      if (k <= 0) return;
      const hl = code === 'jp';
      // a linha acende de uma vez (LED), com um clarão branco no começo
      g.fillStyle = k < 1 ? '#f8fafc' : hl ? (Math.floor(t / 10) % 2 ? '#a16207' : '#854d0e') : '#1e3a8a';
      g.fillRect(3, ry, Math.round((w - 6) * k), Math.round(rowH - 3));
      if (k < 1) return;
      g.drawImage(FX.flagPx(code), 7, ry + 2, 18, 12);
      CE.foxcText(g, nm, 31, ry + rowH / 2 - 1, '900 10px "Segoe UI", sans-serif', hl ? '#fde047' : '#f8fafc', 1, 'left');
    });
    // a imagem do LED: tudo preso na grade (sem borda suave)
    const id = g.getImageData(0, 0, w, h);
    for (let i = 3; i < id.data.length; i += 4) id.data[i] = 255;
    g.putImageData(id, 0, 0);
  }
  // o túnel: o time andando para a luz (posição de cada um na formação)
  const TUN = [[1, 0.9, 14.15], [2, 0.75, 14.95], [3, 0.25, 13.6], [4, 0.15, 15.4], [5, -0.45, 14.05], [6, -0.55, 15.0], [0, -1.15, 14.5]];
  const tunX = (t) => 37.0 + t * 0.012;
  const LINEUP = [[7, 0.0, 0.95], [5, 0.2, 0.84], [6, -0.22, 0.76], [4, 0.3, 0.62], [3, -0.32, 0.54], [2, 0.36, 0.36], [1, -0.36, 0.3], [0, 0.0, 0.1]];
  // a entrada em campo: começa em câmera lenta quando você pisa no gramado
  const ENTER_KEYS = [[0, 0], [30, 30], [100, 58], [190, 148]];
  const rivX = (i) => 49.6 + i * 3.4;
  const rivCam = (t) => lerp(47.9, 57.9, easeIO(t / 180));

  CE.registerCine3D('wc_opening', {
    phases: [190, 200, 180, 200, 190],
    music: 'epic',
    title: '🌍 A ABERTURA DA COPA DO MUNDO',
    tags: ['PLANO 1 • A CERIMÔNIA', 'PLANO 2 • O SORTEIO', 'PLANO 3 • OS RIVAIS', 'PLANO 4 • O TÚNEL', 'PLANO 5 • O JAPÃO ENTRA EM CAMPO'],
    subs: [
      [{ from: 16, who: 'NARRADOR MUNDIAL', text: '"Boa noite, planeta!"', color: '#facc15' }],
      [{ from: 10, who: 'NARRADOR MUNDIAL', text: '"E o sorteio do Grupo E..."', color: '#facc15' }],
      [{ from: 10, who: 'NARRADOR MUNDIAL', text: '"É o grupo da morte!"', color: '#facc15' }],
      [{ from: 6, who: 'SAE ITOSHI', text: '"Hoje o mundo aprende o nosso nome."', color: '#f87171' }],
      [{ from: 40, who: 'VOCÊ', text: '"Ninguém aqui veio participar."', color: YOU_COLOR }]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.45,
    readScale: 0.85,
    theme: 'worldcup_final',
    scene(K, S) {
      const { t, phase, f } = S;
      const oc = openChars();
      const st = (K.st = {});
      if (phase === 0) {
        // A CERIMÔNIA: a câmera voa alto em volta do campo; show de luz no gramado
        K.sky('#01030a', '#0f1d3d', 1);
        const e = easeIO(seg(t, 0, 190));
        const a = lerp(1.15, 1.95, e);
        cam(K, [53 + Math.cos(a) * 6.6, 14.5 + Math.sin(a) * 6.6, lerp(5.6, 4.0, e)], [53, 14.2, 0], lerp(52, 46, e));
        const lc = ['#dc2626', '#1d4ed8', '#16a34a', '#facc15', '#38bdf8'];
        for (let i = 0; i < 5; i++) {
          const age = (t * 1.4 + i * 22) % 110;
          const r = 0.4 + age * 0.06;
          K.floor({ x0: 53 - r, y0: 14.5 - r, x1: 53 + r, y1: 14.5 + r, z: 0.02 + i * 0.002, img: ringCv(), color: lc[i], em: true, alpha: 0.7 * (1 - age / 110) });
        }
        const led = ['#00f5d4', '#facc15', '#f472b6', '#38bdf8'][Math.floor(t / 30) % 4];
        K.box({ x0: 45.12, y0: 7.2, x1: 45.24, y1: 21.8, z0: 0, z1: 0.28, color: led, em: true });
        K.box({ x0: 60.76, y0: 7.2, x1: 60.88, y1: 21.8, z0: 0, z1: 0.28, color: led, em: true });
        const bc = ['#93c5fd', '#fde047', '#ffffff', '#f472b6'];
        TOWERS.forEach(([x, y], i) => {
          const sw = Math.sin(t * 0.02 + i * 1.7) * 0.5;
          beam(K, x, y, 3.4, (x < 53 ? 0.25 : -0.25) + sw * 0.4, (y < 14 ? 0.2 : -0.2) + sw * 0.25, 9, 0.12, 0.9, bc[i], 0.45);
        });
        perfChars().forEach((cd, i) => {
          const an = (i / 16) * TAU + t * 0.004;
          act(K, cd, [53 + Math.cos(an) * 2.6, 14.5 + Math.sin(an) * 2.6], { id: 'c' + i, face: [53, 14.5], anim: 'call_pass', frame: 0, left: i % 2 === 1, k: 0.85 });
        });
      } else if (phase === 1) {
        // O SORTEIO no telão do estádio: do meio do campo, a câmera chega devagar e sobe
        K.sky('#01030a', '#0f1d3d', 0.8);
        K.expo(0.9);
        drawBoard(t);
        K.box({ x0: BOARD.x - BOARD.w / 2 - 0.15, y0: BOARD.y - 0.25, x1: BOARD.x + BOARD.w / 2 + 0.15, y1: BOARD.y - 0.03, z0: BOARD.z - 0.15, z1: BOARD.z + BOARD.h + 0.15, color: '#0f172a' });
        K.quad({ x: BOARD.x, y: BOARD.y, z: BOARD.z, w: BOARD.w, h: BOARD.h, ang: -Math.PI / 2, img: boardCv(), em: true, dirty: true });
        const k = easeIO(t / 200);
        cam(K, shake(K, mixP([53.6, 15.2, 0.55], [53.2, 11.6, 0.95], k), f * 0.5, 0.003), [53, BOARD.y, lerp(5.4, 6.4, k)], lerp(52, 44, k));
      } else if (phase === 2) {
        // OS RIVAIS: cada um na frente de um bandeirão; a câmera passa por eles
        K.sky('#01030a', '#0f1d3d', 0.8);
        K.expo(0.95);
        const cx = rivCam(t);
        cam(K, [cx, 17.1, 0.72], [cx + 0.35, 12.6, 0.66], 40);
        OPEN_RIVALS.forEach(([, code, , , col], i) => {
          const x = rivX(i);
          K.box({ x0: x - 1.2, y0: 10.9, x1: x + 1.2, y1: 11.05, z0: 0.05, z1: 1.65, img: FX.flagPx(code), em: true, color: '#a9b2c4' });
          K.floor({ x0: x - 1.2, y0: 11.6, x1: x + 1.2, y1: 14.0, img: FX.glowCv(col === '#1d4ed8' ? '96,165,250' : col === '#7dd3fc' ? '186,230,253' : '134,239,172'), em: true, alpha: 0.32 });
          act(K, oc.rivals[i], [x, 12.8], { id: 'r' + i, face: [cx, 17], frame: 0, light: [1.05, 1.05, 1.1] });
        });
      } else if (phase === 3) {
        // O TÚNEL do estádio: o time de costas, andando para a saída acesa do campo
        K.expo(0.95);
        const tx = tunX(t);
        cam(K, [tx - 3.4, 14.5 + Math.sin(t * 0.05) * 0.04, 0.82], [44.5, 14.5, 0.8], 46);
        K.quad({ x: 44.08, y: 14.5, z: 0, w: 1.0, h: 1.6, ang: Math.PI, color: '#f8fafc', em: true });
        K.floor({ x0: 41.4, y0: 13.2, x1: 44.0, y1: 15.8, img: FX.glowCv('219,234,254'), em: true, alpha: 0.4 });
        TUN.forEach(([idx, dx, y], i) => {
          const ch = oc.tun[idx];
          if (!ch) return;
          act(K, ch, [tx + dx, y], { id: 'tunel' + i, face: [45, y], anim: 'run', frame: Math.floor(t * 0.55) + i * 5, light: [0.42, 0.48, 0.62], opts: ch.id === 'sae' ? { accessories: ['captain_armband'] } : undefined });
        });
      } else {
        // O JAPÃO ENTRA EM CAMPO: saindo do túnel e correndo para a câmera (câmera lenta
        // quando você pisa no gramado)
        K.sky('#01030a', '#0f1d3d', 0.8);
        const A = remap(t, ENTER_KEYS);
        const e = easeIO(A / 148);
        cam(K, [lerp(50.4, 49.7, e), 14.6, lerp(0.62, 0.8, e)], [44.6, 14.5, 0.85], 50);
        K.quad({ x: 45.02, y: 11.4, z: 0.25, w: 2.4, h: 1.6, ang: 0, img: FX.flagPx('jp'), em: true, color: '#8a93a6' });
        K.quad({ x: 45.02, y: 17.6, z: 0.25, w: 2.4, h: 1.6, ang: 0, img: FX.flagPx('jp'), em: true, color: '#8a93a6' });
        LINEUP.forEach(([idx, ox, z0], i) => {
          const ch = oc.ent[idx];
          if (!ch) return;
          const z = clamp(z0 + 0.18 - e * 0.18);
          const x = lerp(48.3, 44.7, z);
          const y = 14.5 + ox * lerp(2.6, 0.7, z);
          act(K, ch, [x, y], { id: 'entra' + i, face: [x + 1, y], anim: 'run', frame: Math.floor(A * 0.5) + i * 4, light: [1.0, 1.0, 1.05], opts: ch.id === 'sae' ? { accessories: ['captain_armband'] } : undefined });
        });
        st.A = A;
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      if (phase === 0) {
        FX.pxFlashes(ctx, 0, W, top + 20, top + (bot - top) * 0.45, t, 14, 4);
        FX.pxFireworks(ctx, W, top + 40, top + (bot - top) * 0.36, t, 6, ['#facc15', '#ef4444', '#38bdf8', '#f8fafc', '#22c55e'], 8, 84);
        CE.cineTitleCard(ctx, W, top + 120, seg(t, 70, 100), { kicker: 'CERIMÔNIA DE ABERTURA', title: 'COPA DO MUNDO', sub: '48 seleções • 1 troféu', color: '#facc15' });
      } else if (phase === 1) {
        FX.flares(ctx, K, S, 0.7);
        FX.pxFlashes(ctx, 0, W, top + 20, bot - 60, t, 12, 6);
        OPEN_TEAMS.forEach((tm, i) => CE.cineSfx(S, 26 + i * 34, `sorteio${i}`, () => window.SFX?.blip?.(520 + i * 90)));
        CE.luckKicker(ctx, 40, bot - 40, 'ESTREIA: JAPÃO x ITÁLIA', seg(t, 166, 196), '#facc15');
      } else if (phase === 2) {
        FX.flares(ctx, K, S, 0.6);
        // o nome de quem está na frente da câmera (letreiro discreto embaixo)
        const cx = rivCam(t) + 0.35;
        OPEN_RIVALS.forEach(([, , nm, tag, col], i) => {
          const pk = clamp((1.4 - Math.abs(cx - rivX(i))) / 0.5);
          if (pk <= 0) return;
          CE.luckKicker(ctx, 40, bot - 76, nm, pk, col);
          CE.luckKicker(ctx, 40, bot - 46, tag, pk, '#64748b');
        });
      } else if (phase === 3) {
        const d = K.screen(44.1, 0.8, 14.5);
        if (d) CE.cineGlow(ctx, d.x, d.y, 300, 'rgba(219,234,254,0.5)');
        FX.pxDust(ctx, W, top, bot, t, 34, 'rgba(226,232,240,0.45)', 3, 2, 0.12);
      } else {
        FX.flares(ctx, K, S, 1);
        FX.pxFlashes(ctx, 0, W, top + 20, top + (bot - top) * 0.4, t, 14, 6);
        FX.pxConfetti(ctx, W, top, bot, t, 40);
        CE.luckKicker(ctx, 40, top + 30, 'COPA DO MUNDO • GRUPO E', seg(t, 110, 140), '#38bdf8');
        CE.luckKicker(ctx, 40, top + 64, 'JAPÃO x ITÁLIA', seg(t, 124, 156), '#facc15');
      }
    }
  });
})();
