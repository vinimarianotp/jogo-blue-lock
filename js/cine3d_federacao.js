// ============================================================================
// CUTSCENES EM 3D — a Federação e o Blue Lock Eleven, refeitas no padrão do gol da Sub-20
// (js/cine3d_u20.js): câmera sempre andando, câmera lenta com rampa nos momentos-chave, no
// máximo 1 quadro de impacto e 2 tremidas fortes por cena, closes só em quadros de mangá
// em pixel art (mão com carimbo, papel, tablet, silhueta) e pouco texto na tela.
//   ego_federation • começa e termina na sala do Ego (onde a conversa acontece: bg
//                    'monitor_room', CE.c3EgoRoom de js/cine3d_espanha.js); no meio, a sala
//                    do conselho da JFU (área vazia), com a porta dupla
//   bl_eleven      • a sala do Ego: os aprovados na frente do telão; o Ego chama os onze e
//                    o telão monta a escalação
//   shidou_cut     • a sala do Ego (a lista sem ele) → a sala da Sub-20 (a sala da JFU no pôr
//                    do sol) → o túnel do prédio → o campo à noite
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
  const WALKF = (f, sp = 6) => 1 + (Math.floor(f / sp) % 4) * 4;
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

  const EGO_C = '#00f5d4';
  const ANRI_C = '#fcd34d';
  const PRES_C = '#f59e0b';
  const CART_C = '#cbd5e1';
  const NARR_C = '#94a3b8';
  const SAE_C = '#f9a8d4';
  const SHIDOU_C = '#ec4899';
  const RIN_C = '#22d3ee';
  const BACH_C = '#facc15';
  const NAGI_C = '#e2e8f0';
  const CHI_C = '#fb7185';
  const BLK = { jerseyPrimary: '#0f2942', jerseySecondary: '#38bdf8' };
  const U20K = { jerseyPrimary: '#0b1d4d', jerseySecondary: '#f8fafc' };
  const JPN = { jerseyPrimary: '#1d4ed8', jerseySecondary: '#f8fafc' };

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
      L.g.imageSmoothingEnabled = false;
      fn(L.g, w, h);
    }
    return { cv: L.cv, dirty };
  };
  const glowCv = (col, cx = 0.5, cy = 0.5) =>
    paint(`glow|${col}|${cx}|${cy}`, 64, 64, (g) => {
      const r = 64 * Math.max(cx, 1 - cx, cy, 1 - cy);
      const gr = g.createRadialGradient(64 * cx, 64 * cy, 0, 64 * cx, 64 * cy, r);
      gr.addColorStop(0, col);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    });
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
  const ptext = (g, s, x, y, col, sc = 1, al = 'left') => window.Hub?.ptext && window.Hub.ptext(g, s, x, y, col, sc, al);

  // ---------------------------------------------------------------- pós (no overlay)
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
  // reflexo da lente numa luz da tela
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
  // brilho dos óculos do Ego (um risco branco curto, pequeno, no boneco 3D)
  function glint(ctx, p, k) {
    if (!p || k <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    CE.cineGlow(ctx, p.x, p.y, 26, 'rgba(204,251,241,0.8)', k);
    ctx.fillStyle = `rgba(240,253,250,${k})`;
    ctx.fillRect(Math.round(p.x - 12), Math.round(p.y - 1), 24, 3);
    ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 9), 3, 18);
    ctx.restore();
  }

  // ---------------------------------------------------------------- quadros de mangá
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
  // mão de chibi (formas grossas: no quadro em pixel vira poucos blocos); close 0..1
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
      if (o.cuff) {
        g.fillStyle = o.cuff;
        g.fillRect(-s * 0.46, s * 0.32, s * 0.92, s * 0.18);
      }
      g.fillStyle = 'rgba(15,23,42,0.35)';
      g.fillRect(s * 0.1, s * 0.32, s * 0.36, s * 1.6);
    }
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
    g.fillStyle = skin;
    rr(g, -s * 0.5, -s * 0.34, s, s * 0.72, s * 0.2);
    g.fill();
    g.stroke();
    if (close > 0.5) {
      g.fillStyle = dark;
      g.fillRect(-s * 0.46, -s * 0.3, s * 0.92, s * 0.16);
      g.beginPath();
      for (let i = 1; i < 4; i++) {
        g.moveTo(-s * 0.48 + i * s * 0.24, -s * 0.32);
        g.lineTo(-s * 0.48 + i * s * 0.24, -s * 0.1);
      }
      g.stroke();
    }
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
    g.fillStyle = 'rgba(15,23,42,0.22)';
    g.fillRect(s * 0.18, -s * 0.3, s * 0.28, s * 0.64);
    g.restore();
  }
  function panelBg(g, b, c0, c1, dots = 'rgba(2,6,23,0.35)') {
    const gr = g.createLinearGradient(0, b.y, 0, b.y + b.h);
    gr.addColorStop(0, c0);
    gr.addColorStop(1, c1);
    g.fillStyle = gr;
    g.fillRect(b.x - 20, b.y - 20, b.w + 40, b.h + 40);
    CA().halftone(g, b.x, b.y + b.h * 0.55, b.w, b.h * 0.45, { step: 14, color: dots, from: 'bottom', max: 0.8 });
  }
  // folha de papel em cima da mesa (linhas de texto falsas, um cabeçalho e, se pedir, a foto)
  function sheet(g, x, y, w, h, ang, o = {}) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(-w / 2 + 8, -h / 2 + 10, w, h);
    g.fillStyle = '#f1f5f9';
    g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = '#0b0f19';
    g.lineWidth = 5;
    g.strokeRect(-w / 2, -h / 2, w, h);
    g.fillStyle = o.head || '#1e3a8a';
    g.fillRect(-w / 2, -h / 2, w, h * 0.12);
    g.fillStyle = '#94a3b8';
    for (let i = 0; i < 6; i++) g.fillRect(-w * 0.4, -h * 0.26 + i * h * 0.1, w * (i % 3 === 2 ? 0.4 : 0.7), h * 0.035);
    if (o.photo) {
      g.fillStyle = o.photo;
      g.fillRect(w * 0.12, -h * 0.28, w * 0.28, w * 0.3);
      g.strokeRect(w * 0.12, -h * 0.28, w * 0.28, w * 0.3);
    }
    g.restore();
  }
  // o carimbo descendo na mão e a marca que fica no papel (q 0..1; bate em q = hitQ)
  function stampHand(g, x, y, s, q, o = {}) {
    const hitQ = o.hitQ ?? 0.5;
    const down = q < hitQ ? easeIO(seg(q, 0, hitQ)) : 1 - ease(seg(q, hitQ + 0.12, 1)) * 0.6;
    const yy = y - (1 - down) * s * 1.6;
    // a marca (aparece na batida)
    if (q >= hitQ) {
      g.save();
      g.translate(x, y + s * 0.15);
      g.rotate(o.markAng ?? -0.12);
      g.strokeStyle = o.ink || '#dc2626';
      g.lineWidth = s * 0.09;
      g.strokeRect(-s * 0.9, -s * 0.32, s * 1.8, s * 0.64);
      g.fillStyle = o.ink || '#dc2626';
      if (o.word) {
        g.font = `900 ${Math.round(s * 0.36)}px "Segoe UI", sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(o.word, 0, s * 0.02);
      }
      g.restore();
    }
    if (down < 0.02 && q >= hitQ + 0.4) return;
    // o carimbo (cabo de madeira, base preta) e a mão segurando
    g.save();
    g.translate(x, yy);
    g.strokeStyle = '#0b0f19';
    g.lineWidth = Math.max(3, s * 0.06);
    g.fillStyle = '#111827';
    g.fillRect(-s * 0.7, -s * 0.18, s * 1.4, s * 0.3);
    g.strokeRect(-s * 0.7, -s * 0.18, s * 1.4, s * 0.3);
    g.fillStyle = '#92400e';
    g.fillRect(-s * 0.18, -s * 0.9, s * 0.36, s * 0.75);
    g.strokeRect(-s * 0.18, -s * 0.9, s * 0.36, s * 0.75);
    g.restore();
    hand(g, x, yy - s * 0.95, s * 0.75, { close: 1, skin: o.skin, sleeve: o.sleeve || '#1f2937', cuff: o.cuff, ang: Math.PI, flip: true });
  }

  // ==========================================================================
  // A SALA DO EGO (js/cine3d_espanha.js): monitores ao norte (y 13), o Ego atrás da mesa
  // ==========================================================================
  const ER = () => CE.c3EgoRoom;
  const RX = 86; // (o meio da sala; o mesmo VX da cine3d_espanha)
  // o telão do meio da parede de monitores (o kit monta por cima dela): fn pinta 420 x 180
  function wallScreen(K, key, every, fn) {
    const L = live(key, 420, 180, K.S.f, every, fn);
    K.box({ x0: RX - 2.28, y0: 13.0, x1: RX + 2.28, y1: 13.06, z0: 1.12, z1: 3.12, color: '#020409' });
    Q(K, { x: RX, y: 13.07, z: 1.18, w: 4.4, h: 1.88, ang: -Math.PI / 2, img: L.cv, dirty: L.dirty, em: true });
    K.floor({ x0: RX - 3.2, y0: 13.0, x1: RX + 3.2, y1: 17.5, img: glowCv('rgba(0,245,212,0.16)', 0.5, 0), em: true });
  }
  // (a sala da cine3d_espanha não tem a parede sul: olhando para lá aparecia o vazio)
  const egoRoom = (K, t) => {
    // (o brilho dos monitores fica sempre virado para o sul: virado para a câmera, com ela
    // perto da parede, a placa grande de brilho cortava o quadro como uma faixa ciano)
    if (ER()) ER().build(K, t, [RX, 1.0, 30]);
    Q(K, { x: RX, y: 20.0, w: 14, h: 3.75, ang: -Math.PI / 2, color: '#04070e' });
  };
  const ego = (K, o) => K.actor('EGO', Object.assign({ k: 0.95 }, o));
  const anri = (K, o) => K.actor('ANRI', Object.assign({ k: 0.86 }, o));

  // ==========================================================================
  // A SALA DO CONSELHO DA JFU (área vazia): janela ao norte, porta dupla ao sul
  // ==========================================================================
  const JX = 86;
  const JY = 17;
  const BR = { x0: JX - 5, x1: JX + 5, y0: JY - 5, y1: JY + 3, h: 1.75 };
  const DD = { x0: JX - 0.62, x1: JX + 0.62, h: 1.3 };
  const TABLE = { x0: JX - 3.9, x1: JX + 3.9, y0: JY - 2.7, y1: JY - 2.0, h: 0.34 };
  const SEAT_Y = JY - 3.25;
  const SEATS = [['old3', JX - 2.6], ['old1', JX - 1.3], ['pres', JX], ['old2', JX + 1.3], ['old4', JX + 2.6]];
  const PLATES = { old3: 'CONSELHO', old1: 'DIRETORIA', pres: 'PRESIDENTE', old2: 'TESOURARIA', old4: 'SELECOES' };
  const cast = () => CE.fedxCast();
  const line = (g, a, b) => {
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
  };
  const cityCv = (warm) =>
    paint('city' + (warm ? 'W' : ''), 512, 192, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, warm ? [[0, '#1c0d0a'], [0.6, '#7c2d12'], [1, '#c2410c']] : [[0, '#02050c'], [1, '#132544']]);
      if (!warm) {
        for (let i = 0; i < 90; i++) {
          g.fillStyle = `rgba(255,255,255,${0.2 + rnd(i, 3) * 0.5})`;
          g.fillRect(rnd(i, 1) * w, rnd(i, 2) * 90, 1, 1);
        }
      } else CE.cineGlow(g, 330, h - 40, 160, 'rgba(251,146,60,0.6)');
      g.save();
      g.translate(300, h - 30);
      g.strokeStyle = warm ? '#3b1d10' : '#9a3412';
      g.lineWidth = 2;
      line(g, [-18, 0], [-2, -120]);
      line(g, [18, 0], [2, -120]);
      for (let k = 0; k < 6; k++) {
        const y = -14 - k * 17;
        const hw = 18 - (k + 1) * 2.6;
        line(g, [-hw, y], [hw, y]);
      }
      line(g, [0, -120], [0, -146]);
      g.restore();
      CE.cineCity(g, w, h - 20, 120, warm ? '#2a140c' : '#0a1324', warm ? 'rgba(253,186,116,0.55)' : 'rgba(253,224,71,0.55)', 7);
      CE.cineCity(g, w, h, 70, warm ? '#170b06' : '#050a14', warm ? 'rgba(254,215,170,0.6)' : 'rgba(191,219,254,0.6)', 3, 150);
    });
  const carpetCv = (warm) =>
    paint('carpet' + (warm ? 'W' : ''), 128, 96, (g, w, h) => {
      g.fillStyle = warm ? '#1d130c' : '#0b1222';
      g.fillRect(0, 0, w, h);
      g.fillStyle = warm ? 'rgba(80,50,30,0.35)' : 'rgba(30,41,59,0.5)';
      for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 12) g.fillRect(0, y, w, 1);
    });
  const panelCv = (warm) =>
    paint('panel' + (warm ? 'W' : ''), 128, 64, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, warm ? [[0, '#2b1d13'], [1, '#1d140e']] : [[0, '#141c2a'], [1, '#0b111c']]);
      for (let x = 4; x < w; x += 32) {
        g.fillStyle = warm ? 'rgba(80,50,30,0.35)' : 'rgba(30,41,59,0.5)';
        g.fillRect(x, 22, 24, 38);
        g.strokeStyle = 'rgba(2,4,8,0.8)';
        g.strokeRect(x + 0.5, 22.5, 24, 38);
      }
      g.fillStyle = 'rgba(148,163,184,0.2)';
      g.fillRect(0, 18, w, 1);
    });
  const flagCv = (kind) =>
    paint('flag' + kind, 32, 48, (g, w, h) => {
      g.fillStyle = kind ? '#0b1d4d' : '#e5e7eb';
      g.fillRect(0, 0, w, h);
      if (kind) {
        g.strokeStyle = '#facc15';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(16, 22, 9, 0, TAU);
        g.stroke();
        ptext(g, 'JFU', 16, 20, '#facc15', 1, 'center');
      } else {
        g.fillStyle = '#b91c1c';
        g.beginPath();
        g.arc(16, 22, 8, 0, TAU);
        g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,0.22)';
      [6, 16, 26].forEach((x) => g.fillRect(x, 0, 2, h));
    });
  const plateCv = (text) =>
    paint('plate' + text, 48, 8, (g, w, h) => {
      g.fillStyle = '#e5e7eb';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#0b1120';
      g.fillRect(0, h - 1, w, 1);
      ptext(g, text, w / 2, 1, '#0b1120', 1, 'center');
    });
  const doorLeafCv = () =>
    paint('dleaf', 24, 52, (g, w, h) => {
      g.fillStyle = '#2a1d14';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#3b2a1e';
      g.fillRect(3, 4, w - 6, 18);
      g.fillRect(3, 27, w - 6, 20);
      g.strokeStyle = '#120c08';
      g.strokeRect(0.5, 0.5, w - 1, h - 1);
    });
  // a sala do conselho (warm = a versão quente, a sala da Sub-20 no pôr do sol)
  function boardRoom(K, t, o = {}) {
    const warm = !!o.warm;
    const { x0, x1, y0, y1, h } = BR;
    K.sky(warm ? '#1c0d0a' : '#02050c', warm ? '#c2410c' : '#132544', warm ? 0 : 0.4);
    K.fog(warm ? '#140a06' : '#03060c', 0.035);
    K.ambient(o.amb || (warm ? '#e0b48c' : '#a9b8d4'));
    K.expo(o.expo || 0.95);
    K.floor({ x0, y0, x1, y1, img: carpetCv(warm) });
    K.floor({ x0, y0, x1, y1, z: h, color: warm ? '#0d0906' : '#05080d' });
    for (let i = 0; i < 6; i++) K.floor({ x0: x0 + 0.8 + i * 1.6, y0: y0 + 1.5, x1: x0 + 1.6 + i * 1.6, y1: y0 + 1.62, z: h - 0.01, color: warm ? '#fff1d6' : '#eef6ff', em: true });
    Q(K, { x: JX, y: y0 - 7, z: -1.2, w: 22, h: 8.2, ang: Math.PI / 2, img: cityCv(warm), em: true });
    Q(K, { x: JX, y: y0, z: 0, w: x1 - x0, h: 0.5, ang: Math.PI / 2, img: panelCv(warm) });
    K.box({ x0, y0: y0 - 0.1, x1, y1: y0 + 0.04, z0: 1.58, z1: h, color: warm ? '#160f0a' : '#090e18' });
    K.box({ x0, y0: y0 - 0.1, x1: x0 + 0.5, y1: y0 + 0.04, z0: 0, z1: h, color: warm ? '#160f0a' : '#090e18' });
    K.box({ x0: x1 - 0.5, y0: y0 - 0.1, x1, y1: y0 + 0.04, z0: 0, z1: h, color: warm ? '#160f0a' : '#090e18' });
    for (let i = 0; i <= 6; i++) {
      const xm = x0 + 0.5 + (i * (x1 - x0 - 1)) / 6;
      K.box({ x0: xm - 0.04, y0: y0 - 0.06, x1: xm + 0.04, y1: y0 + 0.02, z0: 0.5, z1: 1.6, color: '#05080e' });
    }
    K.box({ x0, y0: y0 - 0.06, x1, y1: y0 + 0.02, z0: 1.04, z1: 1.09, color: '#05080e' });
    K.box({ x0, y0: y0 - 0.02, x1, y1: y0 + 0.06, z0: 0.48, z1: 0.53, color: warm ? '#3b2a1e' : '#1e293b' });
    Q(K, { x: x0, y: (y0 + y1) / 2, w: y1 - y0, h, ang: 0, img: panelCv(warm) });
    Q(K, { x: x1, y: (y0 + y1) / 2, w: y1 - y0, h, ang: Math.PI, img: panelCv(warm) });
    Q(K, { x: (x0 + DD.x0 - 0.1) / 2, y: y1, w: DD.x0 - 0.1 - x0, h, ang: -Math.PI / 2, img: panelCv(warm) });
    Q(K, { x: (DD.x1 + 0.1 + x1) / 2, y: y1, w: x1 - DD.x1 - 0.1, h, ang: -Math.PI / 2, img: panelCv(warm) });
    Q(K, { x: JX, y: y1, z: DD.h + 0.06, w: DD.x1 - DD.x0 + 0.2, h: h - DD.h - 0.06, ang: -Math.PI / 2, color: warm ? '#1d140e' : '#0b111c' });
    K.box({ x0: DD.x0 - 0.1, y0: y1 - 0.06, x1: DD.x1 + 0.1, y1: y1, z0: DD.h, z1: DD.h + 0.06, color: '#a16207' });
    [[x0 + 0.75, 0], [x1 - 0.75, 1]].forEach(([fx, kind]) => {
      K.box({ x0: fx - 0.02, y0: y0 + 0.45, x1: fx + 0.02, y1: y0 + 0.49, z0: 0, z1: 1.45, color: '#a16207' });
      Q(K, { x: fx + (kind ? -0.26 : 0.26), y: y0 + 0.47, z: 0.72, w: 0.46, h: 0.68, ang: Math.PI / 2, img: flagCv(kind) });
    });
    if (!o.noTable) {
      K.box({ x0: TABLE.x0, y0: TABLE.y0, x1: TABLE.x1, y1: TABLE.y1, z0: 0, z1: TABLE.h, color: warm ? '#24180f' : '#121926', top: warm ? '#4a3527' : '#3a4558' });
      SEATS.forEach(([who, x], i) => {
        Q(K, { x, y: TABLE.y1 + 0.005, z: TABLE.h - 0.09, w: 0.5, h: 0.08, ang: Math.PI / 2, img: plateCv(PLATES[who]) });
        K.box({ x0: x + 0.3, y0: TABLE.y0 + 0.3, x1: x + 0.33, y1: TABLE.y0 + 0.33, z0: TABLE.h, z1: TABLE.h + 0.18, color: '#0b1120' });
        const on = 0.6 + 0.4 * Math.sin(t * 0.08 + i);
        K.box({ x0: x + 0.29, y0: TABLE.y0 + 0.29, x1: x + 0.34, y1: TABLE.y0 + 0.34, z0: TABLE.h + 0.18, z1: TABLE.h + 0.21, color: on > 0.7 ? '#ef4444' : '#7f1d1d', em: true });
      });
    }
    if (!o.noChairs) SEATS.forEach(([, x]) => K.box({ x0: x - 0.3, y0: SEAT_Y - 0.34, x1: x + 0.3, y1: SEAT_Y - 0.22, z0: 0, z1: 0.92, color: warm ? '#2a1a10' : '#1a1410', top: '#3b2a1e' }));
  }
  const CHAIR_H = 0.1;
  const oldMen = (K, t, o = {}) => {
    const c = cast();
    SEATS.forEach(([who, x], i) => {
      if (o.skip && o.skip.includes(who)) return;
      const laugh = o.laugh ? -Math.abs(Math.sin(t * 0.42 + i * 0.7)) * 0.03 : 0;
      K.actor(c[who], { id: who, x, y: SEAT_Y, z: laugh, seat: CHAIR_H, anim: 'sit', ang: o.face ? Math.atan2(o.face[1] - SEAT_Y, o.face[0] - x) : Math.PI / 2, k: 0.9, light: o.light ? (typeof o.light === 'function' ? o.light(who) : o.light) : undefined });
    });
  };
  // a porta dupla da sala (giram para dentro): open 0..1; o corredor aceso lá fora
  function doubleDoor(K, open, outside = 1) {
    const y = BR.y1;
    const w = (DD.x1 - DD.x0) / 2;
    if (outside > 0) {
      Q(K, { x: JX, y: y + 3.4, w: 2.6, h: 1.75, ang: -Math.PI / 2, color: '#e0f2fe', em: true });
      K.floor({ x0: JX - 1.2, y0: y, x1: JX + 1.2, y1: y + 3.4, color: '#cfe3ff', em: true });
      Q(K, { x: JX - 1.2, y: y + 1.7, w: 3.4, h: 1.75, ang: 0, color: '#bcd4f0', em: true });
      Q(K, { x: JX + 1.2, y: y + 1.7, w: 3.4, h: 1.75, ang: Math.PI, color: '#bcd4f0', em: true });
      if (open > 0) K.floor({ x0: JX - 1.6, y0: y - 3.6 * open, x1: JX + 1.6, y1: y, img: glowCv('rgba(224,242,254,0.5)', 0.5, 1), em: true, alpha: Math.min(0.95, open) });
    }
    [[DD.x0, 1], [DD.x1, -1]].forEach(([hx, s]) => {
      const th = (s > 0 ? 0 : Math.PI) - s * open * 1.3;
      const cx = hx + Math.cos(th) * (w / 2);
      const cy = y - 0.02 + Math.sin(th) * (w / 2);
      K.quad({ x: cx, y: cy, w, h: DD.h, ang: th + Math.PI / 2, img: doorLeafCv() });
    });
  }

  // ==========================================================================
  // 1. A APOSTA DO EGO
  // ==========================================================================
  // o que o monitor do Ego mostra: a reunião da JFU ao vivo (pixel: a mesa e as cabeças)
  const jfuFeed = (t) => (g, w, h) => {
    g.fillStyle = '#04070d';
    g.fillRect(0, 0, w, h);
    CE.cineGradient(g, 0, 0, w, h * 0.55, [[0, '#0b1a36'], [1, '#132544']]);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(253,224,71,0.5)';
      g.fillRect(Math.floor(rnd(i, 3) * w), Math.floor(h * 0.25 + rnd(i, 4) * h * 0.28), 2, 2);
    }
    g.fillStyle = '#1e293b';
    g.fillRect(30, h * 0.66, w - 60, 18);
    g.fillStyle = '#334155';
    g.fillRect(30, h * 0.66, w - 60, 4);
    for (let i = 0; i < 5; i++) {
      const x = 70 + i * ((w - 140) / 4);
      g.fillStyle = '#0f172a';
      g.fillRect(x - 14, h * 0.48, 28, 32);
      g.fillStyle = i === 2 ? '#e5e7eb' : '#94a3b8';
      g.fillRect(x - 9, h * 0.42, 18, 16);
      g.fillStyle = '#e2b48c';
      g.fillRect(x - 7, h * 0.47, 14, 10);
    }
    g.fillStyle = '#dc2626';
    g.fillRect(12, 12, 74, 18);
    if (Math.floor(t / 20) % 2) {
      g.fillStyle = '#fff';
      g.fillRect(18, 17, 8, 8);
    }
    ptext(g, 'AO VIVO', 32, 15, '#ffffff', 1);
    ptext(g, 'JFU • REUNIAO DO CONSELHO', w - 12, 15, '#94a3b8', 1, 'right');
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  };
  // quadro: o presidente carimba ENCERRADO na pasta do Blue Lock
  function cutClose(ctx, S, kIn, q) {
    const { W, top } = S;
    const pres = cast().pres;
    cut(
      ctx,
      [[W - 500, top + 26], [W - 24, top + 16], [W - 40, top + 330], [W - 520, top + 342]],
      (b, g) => {
        panelBg(g, b, '#3a2a1c', '#140d08', 'rgba(0,0,0,0.4)');
        sheet(g, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.62, b.w * 0.62, b.h * 0.62, -0.06, { head: '#0f2942', photo: '#38bdf8' });
        stampHand(g, b.x + b.w * 0.48 + b.ox, b.y + b.h * 0.62, b.h * 0.24, q, { word: 'FIM', skin: pres.skinColor || '#e2b48c', sleeve: '#1f2937', cuff: '#e5e7eb', hitQ: 0.45 });
      },
      kIn,
      [70, -30]
    );
  }
  // quadro: a aposta — à esquerda, vermelho, eles indo embora; à direita, ciano, a seleção
  function cutBet(ctx, S, kL, kR, u) {
    const { W, top, bot } = S;
    const c = cast();
    cut(
      ctx,
      [[24, top + 22], [W * 0.5 - 6, top + 22], [W * 0.5 - 60, bot - 22], [24, bot - 22]],
      (b, g) => {
        // perdeu: os três indo embora de costas, sumindo no vermelho
        panelBg(g, b, '#dc2626', '#450a0a', 'rgba(0,0,0,0.4)');
        [c.bachira, c.you, c.chigiri].forEach((cd, i) => {
          const wk = clamp(u / 150);
          CA().silhouette(g, cd, b.x + b.w * (0.28 + i * 0.22) + b.ox, b.y + b.h * (0.9 - wk * 0.12), b.h * (0.5 - wk * 0.14), { view: 'back', pose: 'idle', fill: '#1c0505' });
        });
      },
      kL,
      [-80, 0]
    );
    cut(
      ctx,
      [[W * 0.5 + 6, top + 22], [W - 24, top + 22], [W - 24, bot - 22], [W * 0.5 - 48, bot - 22]],
      (b, g) => {
        panelBg(g, b, '#0e7490', '#022c3a', 'rgba(0,0,0,0.3)');
        CA().speedRadial(g, b.x + b.w * 0.55, b.y + b.h * 0.4, S.W, S.H, { color: 'rgba(165,243,252,0.35)', inner: b.h * 0.3, n: 48, thick: 1.2 });
        // ganhou: você com a camisa da seleção, de frente, na luz
        CA().silhouette(g, c.youJp, b.x + b.w * 0.55 + b.ox, b.y + b.h * 0.92, b.h * 0.56, { view: 'front', pose: 'celebrate', fill: '#062a3a', rim: 'rgba(165,243,252,0.9)' });
      },
      kR,
      [80, 0]
    );
  }
  // quadro: o contrato da partida e o carimbo APROVADO
  function cutApprove(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    const pres = cast().pres;
    cut(
      ctx,
      [[W - 520, top + 24], [W - 24, top + 34], [W - 24, bot - 24], [W - 548, bot - 34]],
      (b, g) => {
        panelBg(g, b, '#3a2a1c', '#120c08', 'rgba(0,0,0,0.4)');
        sheet(g, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.56, b.w * 0.66, b.h * 0.78, 0.04, { head: '#7f1d1d' });
        stampHand(g, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.72, b.h * 0.18, q, { word: 'OK', skin: pres.skinColor || '#e2b48c', sleeve: '#1f2937', cuff: '#e5e7eb', hitQ: 0.5, ink: '#dc2626', markAng: -0.1 });
      },
      kIn,
      [80, 0]
    );
  }
  // quadro: o tablet da Anri na mão (a chamada com o Aiku aceita)
  function cutTablet(ctx, S, kIn, q) {
    const { W, top } = S;
    const c = cast();
    cut(
      ctx,
      [[24, top + 24], [470, top + 24], [470, top + 300], [24, top + 300]],
      (b, g) => {
        panelBg(g, b, '#1f2937', '#0b1220');
        const x = b.x + b.w * 0.5 + b.ox;
        const y = b.y + b.h * 0.48;
        const tw = b.w * 0.62;
        const th = b.h * 0.6;
        g.fillStyle = '#0b0f19';
        rr(g, x - tw / 2 - 10, y - th / 2 - 10, tw + 20, th + 20, 14);
        g.fill();
        const ok = q > 0.45;
        CE.cineGradient(g, x - tw / 2, y - th / 2, tw, th, ok ? [[0, '#065f46'], [1, '#022c22']] : [[0, '#0b1d4d'], [1, '#04102a']]);
        CA().silhouette(g, c.aiku, x - tw * 0.12, y + th * 0.5, th * 0.9, { view: 'front', fill: ok ? '#022c22' : '#04102a', rim: ok ? 'rgba(110,231,183,0.9)' : 'rgba(147,197,253,0.8)' });
        // o botão verde de "aceito"
        g.fillStyle = ok ? '#22c55e' : '#334155';
        g.beginPath();
        g.arc(x + tw * 0.32, y + th * 0.28, th * 0.11, 0, TAU);
        g.fill();
        hand(g, x - tw * 0.48, y + th * 0.36, b.h * 0.3, { close: 0.7, skin: c.anri.skinColor || '#f8dcc4', sleeve: '#f8fafc', ang: 0.5 });
      },
      kIn,
      [-70, 0]
    );
  }

  CE.registerCine3D('ego_federation', {
    phases: [230, 280, 300, 330, 230, 300],
    music: 'mystery',
    title: '🏛️ A APOSTA DO EGO',
    tags: ['PLANO 1 • A SALA DO EGO', 'PLANO 2 • O CONSELHO', 'PLANO 3 • SEM CONVITE', 'PLANO 4 • A APOSTA', 'PLANO 5 • APROVADO', 'PLANO 6 • DE VOLTA'],
    subs: [
      [{ from: 20, who: 'NARRADOR', text: 'Sede da JFU. Pauta: fechar o Blue Lock.', color: NARR_C }],
      [
        { from: 20, to: 180, who: 'PRESIDENTE', text: '"Projeto de crianças. Acabou!"', color: PRES_C },
        { from: 182, who: 'CARTOLAS', text: '"Hahaha!"', color: CART_C }
      ],
      [
        { from: 80, to: 214, who: 'PRESIDENTE', text: '"...Ego? Quem te convidou?"', color: PRES_C },
        { from: 220, who: 'EGO', text: '"Ninguém."', color: EGO_C }
      ],
      [
        { from: 14, to: 162, who: 'EGO', text: '"Blue Lock x Sub-20. Ao vivo."', color: EGO_C },
        { from: 166, who: 'EGO', text: '"Perdeu, acabou. Ganhou, vira a seleção."', color: EGO_C }
      ],
      [{ from: 10, who: 'PRESIDENTE', text: '"Fechado. Vai ser o funeral de vocês."', color: PRES_C }],
      [
        { from: 10, to: 160, who: 'ANRI', text: '"A Sub-20 topou. O Aiku aceitou!"', color: ANRI_C },
        { from: 166, who: 'EGO', text: '"Velhos. Acham que já ganharam."', color: EGO_C }
      ]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      if (phase === 0) {
        // A SALA DO EGO: ele de costas, assistindo a reunião no telão; vira e sai
        const k = easeIO(t / 230);
        K.cam([lerp(RX - 1.8, RX - 1.05, k), lerp(1.0, 0.85, k), lerp(18.2, 16.7, k)], [lerp(RX + 0.1, RX + 0.2, k), lerp(0.95, 0.8, k), 13.2], lerp(50, 44, k));
        K.expo(0.92);
        egoRoom(K, t);
        wallScreen(K, 'jfu', 4, jfuFeed(t));
        const go = seg(t, 150, 230);
        const ex = lerp(RX, RX + 2.4, easeIO(go));
        const ey = lerp(14.15, 15.9, easeIO(go));
        ego(K, { x: ex, y: ey, ang: t < 140 ? -Math.PI / 2 : 0.4, anim: go > 0 && go < 1 ? 'run' : 'idle', frame: go > 0 ? WALKF(f, 7) : 0, light: [0.42, 0.62, 0.7] });
        st.scr = W3(RX, 2.1, 13.1);
      } else if (phase === 1) {
        // O CONSELHO: a grua desce da janela até a mesa; os velhos riem
        const k = easeIO(t / 280);
        K.cam(mixP([JX + 1.6, 1.6, JY + 2.4], [JX + 0.7, 0.62, JY - 0.3], k), mixP([JX, 0.4, SEAT_Y], [JX + 0.15, 0.5, SEAT_Y], k), lerp(56, 46, k));
        boardRoom(K, t);
        doubleDoor(K, 0, 0);
        oldMen(K, t, { laugh: t > 150 });
      } else if (phase === 2) {
        // SEM CONVITE: do canto do fundo da sala; a porta dupla estoura (câmera lenta), o
        // Ego em contraluz no corredor aceso e entra andando
        const A = remap(t, [[0, 0], [50, 50], [130, 66], [300, 236]]);
        const BANG = 50;
        const open = ease(seg(A, BANG, BANG + 14));
        boardRoom(K, t, { amb: '#8d9ab3', expo: 1.05 });
        doubleDoor(K, open, 1);
        oldMen(K, t, { face: [JX, BR.y1], light: open > 0.1 ? [0.5, 0.54, 0.62] : [0.36, 0.38, 0.46] });
        const wk = easeIO(seg(A, 90, 236));
        if (open > 0.3) ego(K, { x: JX, y: lerp(BR.y1 + 0.5, JY - 0.5, wk), ang: -Math.PI / 2, anim: wk > 0 && wk < 1 ? 'run' : 'idle', frame: wk > 0 && wk < 1 ? WALKF(f, 8) : 0, view: 'front', light: mixP([0.1, 0.12, 0.16], [0.6, 0.66, 0.74], seg(A, 150, 236)) });
        const k = easeIO(t / 300);
        const sh = A >= BANG ? 0.05 * Math.max(0, 1 - (A - BANG) / 8) : 0.003;
        // (do lado oeste, no meio da sala: os velhos ficam de lado, fora do caminho da câmera)
        K.cam(shake(K, [lerp(JX - 4.4, JX - 4.1, k), lerp(1.25, 1.0, k), lerp(JY - 1.4, JY - 0.9, k)], f * 2, sh, 3), [lerp(JX - 0.1, JX, k), lerp(0.62, 0.72, k), lerp(BR.y1 - 0.4, JY + 0.4, k)], lerp(38, 42, k));
        st.door = W3(JX, 0.7, BR.y1 + 0.2);
        st.glass = W3(JX, 0.83, lerp(BR.y1 + 0.5, JY - 0.5, wk));
        st.open = open;
        st.A = A;
      } else if (phase === 3) {
        // A APOSTA: o Ego em pé na ponta da mesa; a câmera dá a volta nele devagar
        boardRoom(K, t, { expo: 0.9 });
        doubleDoor(K, 1, 1);
        oldMen(K, t, { face: [JX, JY - 0.4], light: [0.5, 0.52, 0.6] });
        ego(K, { x: JX, y: JY - 0.4, ang: -Math.PI / 2, frame: 0, light: [0.62, 0.72, 0.78] });
        const k = easeIO(t / 330);
        const a = lerp(-0.7, 0.55, k);
        K.cam([JX + Math.sin(a) * 2.95, lerp(0.75, 0.66, k), JY - 0.4 + Math.cos(a) * 2.95], [JX, 0.58, JY - 0.6], 46);
        st.glass = W3(JX, 0.83, JY - 0.4);
      } else if (phase === 4) {
        // APROVADO: o presidente aceita, sorrindo; a câmera chega nele por cima da mesa
        const k = easeIO(t / 230);
        boardRoom(K, t, { amb: '#c8b48e' });
        doubleDoor(K, 1, 1);
        oldMen(K, t, { light: (who) => (who === 'pres' ? [1.05, 0.95, 0.78] : [0.4, 0.42, 0.5]) });
        const HIT = 120;
        const sh = t >= HIT ? 0.035 * Math.max(0, 1 - (t - HIT) / 16) : 0.003;
        K.cam(shake(K, [lerp(JX + 0.9, JX + 0.6, k), lerp(0.86, 0.72, k), lerp(JY + 0.6, JY - 0.1, k)], f * 2, sh, 4), [JX + 0.1, 0.5, SEAT_Y], lerp(46, 42, k));
      } else {
        // DE VOLTA: a sala do Ego; ele atrás da mesa e a Anri entrando com o tablet aceso
        // (do lado oeste: a Anri entra pela direita sem tapar o Ego)
        const k = easeIO(t / 300);
        K.cam([lerp(RX - 2.7, RX - 2.2, k), lerp(1.05, 0.9, k), lerp(17.8, 17.2, k)], [lerp(RX + 0.35, RX + 0.25, k), 0.62, 15.0], lerp(50, 45, k));
        K.expo(0.92);
        egoRoom(K, t);
        wallScreen(K, 'jfu2', 6, (g, w, h) => {
          g.fillStyle = '#02060c';
          g.fillRect(0, 0, w, h);
          ptext(g, 'BLUE LOCK  X  SUB-20', w / 2, h * 0.4, '#5eead4', 2, 'center');
          ptext(g, 'AO VIVO • REDE NACIONAL', w / 2, h * 0.62, '#94a3b8', 1, 'center');
        });
        ego(K, { x: RX, y: 14.15, ang: Math.PI / 2, frame: 0, light: [0.72, 0.88, 0.95] });
        const ak = easeIO(seg(t, 0, 110));
        anri(K, { x: lerp(RX + 3.2, RX + 0.9, ak), y: lerp(17.6, 16.1, ak), ang: Math.atan2(14.15 - 16.1, RX - (RX + 0.9)), anim: ak < 1 ? 'run' : 'idle', frame: ak < 1 ? WALKF(f, 4) : 0, light: [0.75, 0.8, 0.9] });
        st.glass = W3(RX, 0.92, 14.15);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        if (st.scr) CE.cineGlow(ctx, st.scr.x, st.scr.y, 260, 'rgba(0,245,212,0.12)');
        CE.luckKicker(ctx, 40, top + 30, 'BLUE LOCK • SALA DO EGO • 21:38', seg(t, 10, 50), '#00f5d4');
      } else if (phase === 1) {
        CE.luckKicker(ctx, 40, top + 30, 'SEDE DA JFU • TÓQUIO • 21:40', seg(t, 8, 48), '#e2e8f0');
        // o carimbo na pasta do projeto (no fim da gargalhada)
        if (t > 150 && t < 262) cutClose(ctx, S, seg(t, 150, 158), seg(t, 150, 262));
        CE.cineSfx(S, 200, 'carimbo', () => window.SFX?.tackle?.());
        CE.cineSfx(S, 182, 'riso', () => window.SFX?.blip?.(220));
      } else if (phase === 2) {
        const A = st.A || 0;
        const BANG = 50;
        // a porta estoura: o único quadro de impacto, o clarão do corredor e o contraluz
        if (A >= BANG && A < BANG + 1.6) impactFrame(ctx, W, H);
        if (A >= BANG) CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(A, BANG + 1, BANG + 8)), '#e0f2fe');
        if (st.door && st.open > 0) flare(ctx, S, st.door, 0.8 * st.open * (1 - seg(A, 160, 236) * 0.6), '224,242,254', 1.2);
        // os óculos brilhando no escuro, já dentro da sala
        glint(ctx, st.glass, seg(A, 150, 160) * (1 - seg(A, 200, 220)));
        CE.cineSfx(S, BANG, 'porta', () => {
          window.SFX?.kick?.(1);
          window.SFX?.tackle?.();
        });
      } else if (phase === 3) {
        glint(ctx, st.glass, seg(t, 40, 48) * (1 - seg(t, 60, 76)));
        // a aposta: os dois quadros lado a lado (perdeu | ganhou)
        if (t > 166 && t < 322) cutBet(ctx, S, seg(t, 166, 174), seg(t, 196, 204), t - 166);
        CE.cineSfx(S, 166, 'aposta', () => window.SFX?.whoosh?.());
      } else if (phase === 4) {
        const HIT = 120;
        if (t > 60 && t < 222) cutApprove(ctx, S, seg(t, 60, 68), seg(t, 60, 180));
        if (t >= HIT) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, HIT, HIT + 8)), '#fee2e2');
        CE.cineSfx(S, HIT, 'aprovado', () => window.SFX?.tackle?.());
      } else {
        if (t < 3) CE.cineFlash(ctx, W, H, 0.5 * (1 - t / 3), '#000000');
        if (t > 20 && t < 160) cutTablet(ctx, S, seg(t, 20, 28), seg(t, 20, 160));
        glint(ctx, st.glass, seg(t, 196, 204) * (1 - seg(t, 214, 230)));
        const tk = seg(t, 230, 270);
        if (tk > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, tk * 2);
          const g = ctx.createLinearGradient(0, bot - 220, 0, bot);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, 'rgba(0,0,0,0.85)');
          ctx.fillStyle = g;
          ctx.fillRect(0, bot - 220, W, 220);
          ctx.restore();
        }
        CE.cineTitleCard(ctx, W, bot - 100, tk, { kicker: 'A APOSTA ESTÁ FEITA', title: 'BLUE LOCK x SUB-20', sub: '', color: EGO_C });
        CE.cineSfx(S, 76, 'aceito', () => window.SFX?.blip?.(660));
        CE.cineSfx(S, 230, 'titulo', () => window.SFX?.kick?.(0.8));
      }
    }
  });

  // ==========================================================================
  // 2. O BLUE LOCK ELEVEN — na sala do Ego: os aprovados em duas fileiras na frente da mesa
  // ==========================================================================
  // [id, x, y] (fileira da frente y 16,3; de trás y 17,3); o Shidou fica de lado, perto da porta
  const ROWS = [
    ['gagamaru', 83.0, 16.3], ['aryu', 83.95, 16.35], ['niko', 84.95, 16.3], ['you', 86.0, 16.4], ['bachira', 87.0, 16.3], ['chigiri', 87.95, 16.35], ['karasu', 88.85, 16.3],
    ['otoya', 83.5, 17.3], ['yukimiya', 84.5, 17.35], ['nagi', 85.5, 17.3], ['rin', 86.6, 17.35], ['shidou', 89.7, 19.2]
  ];
  const at = (id) => ROWS.find((r) => r[0] === id);
  // a escalação: [id, nome, x/y no telão (0..1), quando acende (tempo global da lousa)]
  const ELEVEN = [
    ['gagamaru', 'GAGAMARU', 0.1, 0.5, 24],
    ['aryu', 'ARYU', 0.26, 0.28, 56],
    ['niko', 'NIKO', 0.26, 0.72, 84],
    ['bachira', 'BACHIRA', 0.44, 0.16, 150],
    ['chigiri', 'CHIGIRI', 0.44, 0.84, 178],
    ['karasu', 'KARASU', 0.44, 0.5, 210],
    ['otoya', 'OTOYA', 0.62, 0.28, 334],
    ['yukimiya', 'YUKIMIYA', 0.62, 0.72, 362],
    ['nagi', 'NAGI', 0.8, 0.18, 430],
    ['rin', 'RIN', 0.8, 0.82, 506],
    ['you', null, 0.9, 0.5, 750]
  ];
  const YOU_AT = 750;
  // tempo global da lousa (planos 2–4) a partir do plano/tempo
  const GT = (phase, t) => (phase === 1 ? t : phase === 2 ? 310 + t : phase === 3 ? 610 + t : phase < 1 ? -1 : 2000);
  // o telão com a escalação montando (pixel: campinho, bolinhas e nomes)
  const lineupFn = (gt, o = {}) => (g, w, h) => {
    g.fillStyle = '#02080c';
    g.fillRect(0, 0, w, h);
    const px = 18;
    const py = 30;
    const pw = w - 36;
    const ph = h - 44;
    g.fillStyle = '#04201c';
    g.fillRect(px, py, pw, ph);
    for (let i = 0; i < 10; i += 2) {
      g.fillStyle = 'rgba(13,148,136,0.18)';
      g.fillRect(px + (i * pw) / 10, py, pw / 10, ph);
    }
    g.strokeStyle = 'rgba(94,234,212,0.55)';
    g.lineWidth = 2;
    g.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    g.beginPath();
    g.moveTo(px + pw / 2, py);
    g.lineTo(px + pw / 2, py + ph);
    g.stroke();
    g.beginPath();
    g.arc(px + pw / 2, py + ph / 2, 14, 0, TAU);
    g.stroke();
    const name = (CE.cinePlayerName() || 'VOCE').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let n = 0;
    ELEVEN.forEach(([id, nm, fx, fy, a]) => {
      const x = px + fx * pw;
      const y = py + fy * ph;
      const on = gt >= a;
      const isYou = id === 'you';
      if (on) n++;
      if (isYou && !on) {
        // a vaga do centro, piscando
        if (Math.floor(gt / 12) % 2) {
          g.strokeStyle = '#00f5d4';
          g.strokeRect(x - 9, y - 9, 18, 18);
        }
        ptext(g, '?', x, y - 4, '#5eead4', 1, 'center');
        return;
      }
      if (!on) {
        g.fillStyle = 'rgba(94,234,212,0.18)';
        g.fillRect(x - 5, y - 5, 10, 10);
        return;
      }
      const pop = 1 - seg(gt, a, a + 10);
      const r = (isYou ? 9 : 6) + pop * 5;
      g.fillStyle = isYou ? '#00f5d4' : o.red && id === 'rin' ? '#22d3ee' : '#5eead4';
      g.fillRect(x - r, y - r, r * 2, r * 2);
      g.fillStyle = '#02080c';
      g.fillRect(x - r + 3, y - r + 3, r * 2 - 6, r * 2 - 6);
      g.fillStyle = isYou ? '#00f5d4' : '#99f6e4';
      g.fillRect(x - 2, y - 2, 4, 4);
      ptext(g, isYou ? name : nm, x, y + r + 2, isYou ? '#00f5d4' : '#ccfbf1', 1, 'center');
    });
    ptext(g, 'BLUE LOCK ELEVEN', 18, 10, '#5eead4', 1);
    ptext(g, `${n}/11`, w - 18, 10, n === 11 ? '#00f5d4' : '#e2e8f0', 1, 'right');
    if (o.red) {
      g.fillStyle = `rgba(190,24,93,${o.red})`;
      g.fillRect(0, 0, w, h);
    }
    g.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  };
  // quem já foi chamado (luz de chão ciano por baixo de cada um)
  function crowd(K, gt, o = {}) {
    ROWS.forEach(([id, x, y]) => {
      if (o.skip && o.skip.includes(id)) return;
      const e = ELEVEN.find((q) => q[0] === id);
      const called = e && gt >= e[4];
      const pop = called ? seg(gt, e[4], e[4] + 12) * (1 - seg(gt, e[4] + 40, e[4] + 90) * 0.6) : 0;
      if (pop > 0.02) K.floor({ x0: x - 0.45, y0: y - 0.45, x1: x + 0.45, y1: y + 0.45, z: 0.01, img: glowCv(id === 'you' ? 'rgba(0,245,212,0.75)' : 'rgba(94,234,212,0.6)'), em: true, alpha: Math.min(0.95, pop) });
      const step = called ? ease(seg(gt, e[4], e[4] + 14)) * 0.12 : 0;
      const ov = o.over && o.over[id];
      const base = id === 'shidou' ? [0.32, 0.16, 0.3] : called ? [0.8, 1.02, 1.08] : [0.56, 0.66, 0.78];
      K.actor(id, Object.assign({ kit: 'blueLock', k: 0.86, x, y: y - step, ang: -Math.PI / 2, frame: 0, light: base }, ov || {}));
    });
  }
  // quadro: a silhueta do Rin em contraluz (o corpo inteiro, só o contorno aceso)
  function cutRin(ctx, S, kIn) {
    const { W, top } = S;
    const c = cast();
    cut(
      ctx,
      [[W - 430, top + 24], [W - 24, top + 24], [W - 24, top + 300], [W - 430, top + 300]],
      (b, g) => {
        // contraluz: o corpo inteiro escuro contra a luz do telão, só o contorno aceso
        panelBg(g, b, '#5eead4', '#0f766e', 'rgba(0,0,0,0.25)');
        CA().silhouette(g, c.rin, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.98, b.h * 0.86, { view: 'front', fill: '#010606', rim: 'rgba(204,251,241,0.8)' });
      },
      kIn,
      [60, 0]
    );
  }
  // quadro: as suas costas — a camisa do Blue Lock com o número, a luz ciano batendo
  function cutYou(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    const c = cast();
    const num = String(c.you.number || 10);
    cut(
      ctx,
      [[W * 0.52, top + 30], [W - 24, top + 16], [W - 54, bot - 20], [W * 0.48, bot - 34]],
      (b, g) => {
        g.fillStyle = '#ccfbf1';
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        CA().speedRadial(g, b.x + b.w * 0.5, b.y + b.h * 0.42, S.W, S.H, { color: 'rgba(15,118,110,0.7)', inner: b.h * 0.36, n: 64, thick: 1.6 });
        const x = b.x + b.w * 0.5 + b.ox;
        const y = b.y + b.h * (0.24 - 0.04 * ease(q));
        const w = b.w * 0.62;
        const h = b.h * 0.86;
        g.lineJoin = 'round';
        g.strokeStyle = '#020617';
        g.lineWidth = 10;
        // a camisa (ombros, mangas) e a nuca com o cabelo
        g.fillStyle = BLK.jerseyPrimary;
        g.beginPath();
        g.moveTo(x - w * 0.28, y);
        g.lineTo(x + w * 0.28, y);
        g.lineTo(x + w * 0.62, y + h * 0.16);
        g.lineTo(x + w * 0.5, y + h * 0.4);
        g.lineTo(x + w * 0.36, y + h * 0.34);
        g.lineTo(x + w * 0.36, y + h);
        g.lineTo(x - w * 0.36, y + h);
        g.lineTo(x - w * 0.36, y + h * 0.34);
        g.lineTo(x - w * 0.5, y + h * 0.4);
        g.lineTo(x - w * 0.62, y + h * 0.16);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = BLK.jerseySecondary;
        g.fillRect(x - w * 0.36, y + h * 0.9, w * 0.72, h * 0.04);
        g.fillStyle = c.you.hairColor || '#1b2340';
        rr(g, x - w * 0.22, y - h * 0.2, w * 0.44, h * 0.26, w * 0.12);
        g.fill();
        g.stroke();
        // o número nas costas
        g.fillStyle = '#f8fafc';
        g.font = `900 ${Math.round(h * 0.34)}px "Segoe UI", sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(num, x, y + h * 0.56);
      },
      kIn,
      [80, -40]
    );
  }

  CE.registerCine3D('bl_eleven', {
    phases: [230, 310, 300, 260, 270, 280],
    music: 'u20',
    title: '📺 O BLUE LOCK ELEVEN',
    tags: ['PLANO 1 • O TELÃO', 'PLANO 2 • A DEFESA', 'PLANO 3 • O ATAQUE', 'PLANO 4 • O CENTRO', 'PLANO 5 • REAÇÕES', 'PLANO 6 • O SILÊNCIO'],
    get subs() {
      const nm = CE.cinePlayerName().toLowerCase().replace(/(^|\s)\S/g, (ch) => ch.toUpperCase());
      return [
        [{ from: 30, who: 'EGO', text: '"Os onze que vão enfrentar a Sub-20."', color: EGO_C }],
        [
          { from: 16, to: 146, who: 'EGO', text: '"Gagamaru. Aryu. Niko."', color: EGO_C },
          { from: 146, who: 'EGO', text: '"Bachira. Chigiri. Karasu."', color: EGO_C }
        ],
        [
          { from: 10, to: 184, who: 'EGO', text: '"Otoya. Yukimiya. Na frente: Nagi..."', color: EGO_C },
          { from: 186, who: 'EGO', text: '"...e Rin Itoshi."', color: EGO_C }
        ],
        [
          { from: 6, to: 139, who: 'EGO', text: '"E no centro do ataque..."', color: EGO_C },
          { from: 140, who: 'EGO', text: `"...${nm}."`, color: EGO_C }
        ],
        [
          { from: 6, to: 156, who: 'BACHIRA', text: '"Hahaha! Vai ser divertido!"', color: BACH_C },
          { from: 160, who: 'NAGI', text: '"...Que saco."', color: NAGI_C }
        ],
        [
          { from: 10, to: 150, who: 'NARRADOR', text: 'Onze nomes. Faltava um.', color: NARR_C },
          { from: 152, who: 'CHIGIRI', text: '"...Cadê o Shidou?"', color: CHI_C }
        ]
      ];
    },
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'u20_national',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      const gt = GT(phase, t);
      K.expo(0.92);
      if (phase === 0) {
        // O TELÃO: a grua desce do fundo da sala por cima das cabeças até o Ego e o telão
        const k = easeIO(t / 230);
        K.cam(mixP([RX + 0.4, 2.4, 19.9], [RX + 0.25, 1.45, 19.8], k), mixP([RX, 1.2, 13.5], [RX, 0.85, 14.2], k), lerp(56, 46, k));
        egoRoom(K, t);
        wallScreen(K, 'lineup', 4, lineupFn(gt));
        ego(K, { x: RX, y: 14.15, ang: Math.PI / 2, frame: 0, light: [0.55, 0.74, 0.82] });
        crowd(K, gt);
        st.scr = W3(RX, 2.1, 13.1);
      } else if (phase === 1) {
        // A DEFESA: de trás da mesa (ao lado do Ego), a câmera corre pela fileira da frente
        // conforme os nomes são chamados
        const k = easeIO(t / 310);
        const xc = lerp(83.2, 89.0, k);
        K.cam([xc - 0.6, 0.92, 14.05], [xc + 0.1, 0.5, 16.6], 48);
        egoRoom(K, t);
        wallScreen(K, 'lineup', 3, lineupFn(gt));
        crowd(K, gt);
      } else if (phase === 2) {
        // O ATAQUE: por trás da fileira de trás, rente; o telão montando a escalação no fundo
        const k = easeIO(t / 300);
        K.cam([lerp(83.4, 87.4, k), 1.35, 19.85], [lerp(84.8, 86.4, k), 0.95, 13.4], 50);
        egoRoom(K, t);
        wallScreen(K, 'lineup', 3, lineupFn(gt));
        ego(K, { x: RX, y: 14.15, ang: Math.PI / 2, frame: 0, light: [0.55, 0.74, 0.82] });
        crowd(K, gt);
      } else if (phase === 3) {
        // O CENTRO: câmera lenta chegando em você; no nome, a luz do telão te acerta
        const HIT = 140;
        const k = easeIO(seg(t, 0, HIT));
        const sh = t >= HIT ? 0.045 * Math.max(0, 1 - (t - HIT) / 18) : 0.003;
        const you = at('you');
        egoRoom(K, t);
        wallScreen(K, 'lineup', 3, lineupFn(gt));
        ego(K, { x: RX, y: 14.15, ang: Math.PI / 2, frame: 0, light: [0.55, 0.74, 0.82] });
        crowd(K, gt, { over: { you: { light: t >= HIT ? [0.85, 1.15, 1.15] : [0.5, 0.6, 0.7] } } });
        const eye = t < HIT + 30 ? mixP([RX - 1.6, 0.95, 14.0], [RX - 0.75, 0.6, 14.1], k) : [lerp(RX - 0.75, RX - 0.95, seg(t, HIT + 30, 260)), lerp(0.6, 0.42, seg(t, HIT + 30, 260)), 14.1];
        K.cam(shake(K, eye, f * 2, sh, 2), [you[1], 0.55, you[2]], lerp(46, 42, k));
        st.you = W3(you[1], 0.6, you[2]);
        st.scr = W3(RX, 2.1, 13.1);
      } else if (phase === 4) {
        // REAÇÕES: a câmera passeia pela fileira — o Bachira rindo, o Nagi com preguiça,
        // o Rin frio
        const who = t < 150 ? 'bachira' : t < 200 ? 'nagi' : 'rin';
        const w = at(who);
        const k = easeIO(t / 270);
        egoRoom(K, t);
        wallScreen(K, 'lineup', 6, lineupFn(gt));
        const bob = Math.abs(Math.sin(t * 0.35)) * 0.06;
        crowd(K, gt, {
          over: {
            bachira: { anim: t < 150 ? 'celebrate' : 'idle', z: t < 150 ? bob : 0, frame: t < 150 ? undefined : 0, light: [0.8, 0.95, 1.0] },
            nagi: { light: who === 'nagi' ? [0.8, 0.9, 0.95] : undefined },
            rin: { light: who === 'rin' ? [0.6, 0.85, 0.9] : undefined, opts: { expr: 'angry' } }
          }
        });
        const cx = lerp(88.2, 85.6, k);
        K.cam([cx + 0.5, 0.82, 14.1], [lerp(w[1], cx, 0.3), 0.55, w[2]], 46);
      } else {
        // O SILÊNCIO: do fundo da sala, o telão com os onze; a câmera vira devagar para a
        // direita e acha o Shidou, sozinho no escuro no canto
        const k = easeIO(seg(t, 60, 270));
        egoRoom(K, t);
        wallScreen(K, 'lineup', 6, lineupFn(gt));
        K.expo(0.85);
        crowd(K, gt, { over: { shidou: { ang: -Math.PI / 2 - 0.5, light: [0.36, 0.2, 0.3] } } });
        K.cam(mixP([RX - 1.2, 1.4, 19.8], [RX - 0.9, 0.95, 19.75], k), mixP([RX, 1.0, 13.4], [89.7, 0.6, 19.15], k), lerp(54, 32, k));
        st.shi = W3(89.7, 0.74, 19.2);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        if (st.scr) CE.cineGlow(ctx, st.scr.x, st.scr.y, 300, 'rgba(0,245,212,0.14)');
        CE.luckKicker(ctx, 40, top + 30, 'BLUE LOCK • SALA DO EGO', seg(t, 8, 48), '#00f5d4');
        CE.luckKicker(ctx, 40, top + 62, 'FIM DA TERCEIRA SELEÇÃO', seg(t, 30, 70), '#94a3b8');
      } else if (phase === 1 || phase === 2) {
        ELEVEN.forEach((e, i) => e[4] < YOU_AT && CE.cineSfx(S, e[4] - (phase === 1 ? 0 : 310), 'nome' + i, () => window.SFX?.blip?.(380 + i * 30)));
        // "...e Rin Itoshi": a silhueta dele em contraluz
        if (phase === 2 && t > 196 && t < 290) cutRin(ctx, S, seg(t, 196, 204));
      } else if (phase === 3) {
        const HIT = 140;
        // câmera lenta até o nome: as bordas escurecem; no nome, o quadro de impacto
        if (t < HIT) {
          ctx.save();
          ctx.globalAlpha = 0.22 * seg(t, 20, 80);
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
        }
        if (t > 96 && t < HIT) cutYou(ctx, S, seg(t, 96, 104), seg(t, 96, HIT));
        if (t >= HIT && t < HIT + 2) impactFrame(ctx, W, H);
        if (t >= HIT) {
          CE.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, HIT + 1, HIT + 10)), '#ccfbf1');
          if (st.you) CE.cineGlow(ctx, st.you.x, st.you.y, 140, 'rgba(0,245,212,0.3)', 1 - seg(t, HIT, HIT + 80) * 0.6);
          if (t < HIT + 8 && st.you) CE.drawRadialSpeedLines(ctx, st.you.x, st.you.y, W, '#ccfbf1', 0.4 * (1 - (t - HIT) / 8));
          CE.luckKicker(ctx, 40, bot - 40, `${CE.cinePlayerName()} • CENTRO DO ATAQUE`, seg(t, HIT + 30, HIT + 70), '#00f5d4');
        }
        CE.cineSfx(S, HIT, 'voce', () => window.SFX?.kick?.(1));
      } else if (phase === 4) {
        if (t >= 150 && t < 153) CE.cineFlash(ctx, W, H, 0.3, '#000000');
        if (t >= 200 && t < 203) CE.cineFlash(ctx, W, H, 0.3, '#000000');
      } else {
        // os olhos do Shidou acendendo no escuro (pequenos, no boneco)
        const ek = seg(t, 170, 210);
        if (st.shi && ek > 0) {
          [-1, 1].forEach((s) => {
            CE.cineGlow(ctx, st.shi.x + s * 8, st.shi.y, 20, 'rgba(236,72,153,0.85)', ek);
            ctx.fillStyle = `rgba(251,207,232,${ek})`;
            ctx.fillRect(Math.round(st.shi.x + s * 8 - 4), Math.round(st.shi.y - 2), 8, 3);
          });
        }
        CE.cineSfx(S, 170, 'olhos', () => window.SFX?.blip?.(180));
      }
    }
  });

  // ==========================================================================
  // 3. O CORTE DO SHIDOU
  // ==========================================================================
  // quadro: o punho dele batendo na mesa do Ego (rachaduras)
  function cutSlam(ctx, S, kIn, q) {
    const { W, top } = S;
    const c = cast();
    cut(
      ctx,
      [[W - 520, top + 30], [W - 24, top + 18], [W - 44, top + 320], [W - 540, top + 334]],
      (b, g) => {
        panelBg(g, b, '#3b0a24', '#0c0208', 'rgba(0,0,0,0.4)');
        // o tampo da mesa com a borda ciano
        g.fillStyle = '#0b1324';
        g.fillRect(b.x - 10, b.y + b.h * 0.62, b.w + 20, b.h * 0.5);
        g.fillStyle = '#00f5d4';
        g.fillRect(b.x - 10, b.y + b.h * 0.62, b.w + 20, 6);
        const hitQ = 0.25;
        const down = easeIO(seg(q, 0, hitQ));
        const x = b.x + b.w * 0.5 + b.ox;
        if (q >= hitQ) {
          CA().speedRadial(g, x, b.y + b.h * 0.62, S.W, S.H, { color: 'rgba(249,168,212,0.6)', inner: b.h * 0.3, n: 40, thick: 1.5 });
          g.strokeStyle = '#020617';
          g.lineWidth = 6;
          [[-0.3, 0.2], [0.25, 0.25], [-0.1, 0.35], [0.4, 0.12]].forEach(([dx, dy]) => line(g, [x, b.y + b.h * 0.66], [x + dx * b.w, b.y + b.h * (0.66 + dy)]));
        }
        hand(g, x, b.y + b.h * lerp(0.2, 0.52, down), b.h * 0.42, { close: 1, skin: c.shidou.skinColor || '#f8dcc4', sleeve: BLK.jerseyPrimary, cuff: BLK.jerseySecondary, ang: Math.PI * 0.5 });
      },
      kIn,
      [60, -30]
    );
  }
  // quadro: a lousa — o ponto rosa (Shidou) e o verde-água (Rin); o X vermelho no rosa
  function cutBoard(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    cut(
      ctx,
      [[24, top + 24], [480, top + 24], [480, top + 300], [24, top + 300]],
      (b, g) => {
        g.fillStyle = '#04201c';
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        g.strokeStyle = 'rgba(94,234,212,0.5)';
        g.lineWidth = 6;
        g.strokeRect(b.x + 20, b.y + 20, b.w - 40, b.h - 40);
        line(g, [b.x + b.w / 2, b.y + 20], [b.x + b.w / 2, b.y + b.h - 20]);
        const A = [b.x + b.w * 0.32 + b.ox, b.y + b.h * 0.5];
        const B = [b.x + b.w * 0.7 + b.ox, b.y + b.h * 0.5];
        // a linha entre os dois quebra
        g.strokeStyle = '#f8fafc';
        g.lineWidth = 6;
        g.setLineDash([16, 12]);
        if (q < 0.4) line(g, A, B);
        g.setLineDash([]);
        [[A, '#ec4899'], [B, '#2dd4bf']].forEach(([p, col]) => {
          g.fillStyle = col;
          g.beginPath();
          g.arc(p[0], p[1], b.h * 0.1, 0, TAU);
          g.fill();
          g.strokeStyle = '#020617';
          g.stroke();
        });
        const xk = ease(seg(q, 0.45, 0.6));
        if (xk > 0) {
          g.strokeStyle = '#ef4444';
          g.lineWidth = 16;
          const r = b.h * 0.18 * xk;
          line(g, [A[0] - r, A[1] - r], [A[0] + r, A[1] + r]);
          line(g, [A[0] + r, A[1] - r], [A[0] - r, A[1] + r]);
        }
      },
      kIn,
      [-60, 0]
    );
  }
  // quadro: o carimbo SUB-20 na ficha do Shidou
  function cutU20(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    const c = cast();
    cut(
      ctx,
      [[W - 520, top + 24], [W - 24, top + 34], [W - 24, bot - 24], [W - 548, bot - 34]],
      (b, g) => {
        panelBg(g, b, '#5a3414', '#1a0d06', 'rgba(0,0,0,0.4)');
        sheet(g, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.56, b.w * 0.66, b.h * 0.78, -0.04, { head: '#0b1d4d', photo: '#ec4899' });
        stampHand(g, b.x + b.w * 0.46 + b.ox, b.y + b.h * 0.74, b.h * 0.18, q, { word: 'U-20', skin: c.pres.skinColor || '#e2b48c', sleeve: '#1f2937', cuff: '#e5e7eb', hitQ: 0.55, ink: '#1d4ed8' });
      },
      kIn,
      [80, 0]
    );
  }
  // quadro: a silhueta do Shidou de braços abertos, contorno rosa
  function cutShidou(ctx, S, kIn, q) {
    const { W, top, bot } = S;
    const c = cast();
    cut(
      ctx,
      [[W * 0.55, top + 22], [W - 24, top + 30], [W - 40, bot - 24], [W * 0.5, bot - 30]],
      (b, g) => {
        g.fillStyle = '#fbcfe8';
        g.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
        CA().speedRadial(g, b.x + b.w * 0.5, b.y + b.h * 0.4, S.W, S.H, { color: 'rgba(131,24,67,0.75)', inner: b.h * 0.32, n: 60, thick: 1.6 });
        CA().silhouette(g, c.shidouU20, b.x + b.w * 0.5 + b.ox, b.y + b.h * 0.96, b.h * (0.72 + 0.04 * ease(q)), { view: 'front', pose: 'celebrate', fill: '#2a0418', rim: 'rgba(236,72,153,0.95)', eyes: 'rgba(236,72,153,0.95)', eyeV: 0.31 });
      },
      kIn,
      [80, -30]
    );
  }

  CE.registerCine3D('shidou_cut', {
    phases: [270, 280, 340, 320, 300],
    music: 'tension',
    title: '💣 O CORTE DO SHIDOU',
    tags: ['PLANO 1 • FORA DA LISTA', 'PLANO 2 • UM RISCO', 'PLANO 3 • A CONDIÇÃO', 'PLANO 4 • O INIMIGO', 'PLANO 5 • IRMÃOS'],
    subs: [
      [
        { from: 4, to: 128, who: 'SHIDOU', text: '"Hah?! Eu tô fora?!"', color: SHIDOU_C },
        { from: 130, who: 'SHIDOU', text: '"Isso é piada, né, Ego?"', color: SHIDOU_C }
      ],
      [
        { from: 10, to: 144, who: 'EGO', text: '"Você não joga com o Rin."', color: EGO_C },
        { from: 146, who: 'EGO', text: '"Você é um risco. Fora."', color: EGO_C }
      ],
      [
        { from: 20, to: 185, who: 'SAE ITOSHI', text: '"Eu jogo. Com uma condição..."', color: SAE_C },
        { from: 186, who: 'SAE ITOSHI', text: '"...o Shidou vem comigo."', color: SAE_C }
      ],
      [
        { from: 30, to: 180, who: 'SHIDOU', text: '"Vou explodir vocês, Blue Lock!"', color: SHIDOU_C },
        { from: 182, who: 'NARRADOR', text: 'Agora ele é o inimigo.', color: NARR_C }
      ],
      [
        { from: 60, to: 156, who: 'RIN ITOSHI', text: '"...Irmão."', color: RIN_C },
        { from: 160, who: 'NARRADOR', text: 'Irmão contra irmão.', color: NARR_C }
      ]
    ],
    letterbox: 0.12,
    grain: 0.05,
    vignette: 0.6,
    readScale: 0.85,
    theme: 'u20_national',
    scene(K, S) {
      const { t, phase, f } = S;
      const st = (K.st = {});
      if (phase === 0) {
        // FORA DA LISTA: na frente do telão (a escalação sem ele); de baixo, de lado
        const SLAM = 12;
        const mad = t < 128;
        K.expo(0.95);
        egoRoom(K, t);
        wallScreen(K, 'lineupS', 4, lineupFn(2000, { red: 0.18 + 0.12 * Math.max(0, Math.sin(t * 0.3)) }));
        K.actor('shidou', { kit: 'blueLock', k: 0.88, x: RX - 0.9, y: 15.75, ang: -Math.PI / 2 + 0.25, opts: mad ? { expr: 'angry' } : undefined, anim: mad ? 'idle' : 'celebrate', frame: mad ? 0 : undefined, light: [1.0, 0.72, 0.92] });
        ego(K, { x: RX, y: 14.15, ang: Math.PI / 2, frame: 0, light: [0.45, 0.62, 0.72] });
        // (do lado oeste, entre ele e o telão: o rosto de 3/4, de baixo)
        const k = easeIO(t / 270);
        const sh = t >= SLAM ? 0.05 * Math.max(0, 1 - (t - SLAM) / 12) : 0.004;
        K.cam(shake(K, [lerp(RX - 3.3, RX - 3.0, k), lerp(0.32, 0.4, k), lerp(14.5, 14.8, k)], f * 2, sh, 2), [RX - 0.7, 0.72, 15.8], 48);
        st.shi = W3(RX - 0.9, 0.5, 15.75);
      } else if (phase === 1) {
        // UM RISCO: de lado, os dois com a mesa no meio; a câmera desliza devagar
        K.expo(0.85);
        egoRoom(K, t);
        wallScreen(K, 'lineupS2', 6, lineupFn(2000));
        K.actor('shidou', { kit: 'blueLock', k: 0.88, x: RX - 0.25, y: 15.85, ang: -Math.PI / 2, frame: 0, light: [0.7, 0.52, 0.66] });
        ego(K, { x: RX, y: 14.15, ang: Math.PI / 2, frame: 0, light: [0.55, 0.74, 0.82] });
        const k = easeIO(t / 280);
        K.cam([lerp(RX - 3.1, RX - 2.8, k), lerp(0.85, 0.75, k), lerp(14.6, 15.3, k)], [RX - 0.1, 0.62, 15.0], 46);
        st.glass = W3(RX, 0.92, 14.15);
      } else if (phase === 2) {
        // A CONDIÇÃO: a sala da Sub-20 no pôr do sol; o Sae em pé, frio, na frente dos velhos
        boardRoom(K, t, { warm: true });
        oldMen(K, t, { light: [0.62, 0.44, 0.32] });
        K.actor('sae', { kit: 'u20', k: 0.9, x: JX - 0.25, y: JY - 0.6, ang: Math.PI / 2, frame: 0, light: [0.72, 0.84, 0.86] });
        const k = easeIO(t / 340);
        const a = lerp(0.65, -0.25, k);
        K.cam([JX - 0.25 + Math.sin(a) * 2.7, lerp(0.75, 0.62, k), JY - 0.6 + Math.cos(a) * 2.7], [JX - 0.25, 0.56, JY - 1.2], 46);
      } else if (phase === 3) {
        // O INIMIGO: o túnel do prédio; ele vem andando para a câmera (que recua), o Sae e o
        // Aiku encostados nas paredes; depois a gargalhada de baixo, na luz rosa
        const CUTT = 170;
        K.expo(0.85);
        if (t < CUTT) {
          // (câmera lenta no fim da caminhada: o passo e o recuo da câmera desaceleram juntos)
          const A = remap(t, [[0, 0], [90, 90], [170, 122]]);
          const wk = seg(A, 0, 122);
          const sx = lerp(43.0, 40.6, wk);
          K.actor('sae', { kit: 'u20', k: 0.88, x: 42.5, y: 13.8, ang: Math.PI / 2 + 0.7, frame: 0, light: [0.55, 0.55, 0.66] });
          K.actor('aiku', { kit: 'u20', k: 0.9, x: 42.9, y: 15.2, ang: -Math.PI / 2 - 0.7, frame: 0, light: [0.55, 0.55, 0.66] });
          K.actor('shidou', { kit: 'u20', k: 0.9, x: sx, y: 14.5, ang: Math.PI, anim: 'run', frame: WALKF(Math.floor(A), 7), view: 'front', light: [1.0, 0.82, 0.95] });
          K.cam([sx - 2.8, lerp(0.55, 0.45, wk), 14.5 + K.noise(t * 0.5, 2) * 0.02], [sx, 0.6, 14.5], 46);
        } else {
          const u = t - CUTT;
          const HIT = 70;
          const k = easeIO(u / 150);
          K.actor('shidou', { kit: 'u20', k: 0.9, x: 40.4, y: 14.5, ang: Math.PI, anim: 'celebrate', light: [1.1, 0.78, 1.0] });
          K.floor({ x0: 39.6, y0: 13.7, x1: 41.2, y1: 15.3, img: glowCv('rgba(236,72,153,0.4)'), em: true });
          const sh = u >= HIT ? 0.045 * Math.max(0, 1 - (u - HIT) / 16) : 0.004;
          K.cam(shake(K, [lerp(37.5, 37.8, k), lerp(0.16, 0.2, k), lerp(14.0, 14.3, k)], f * 2, sh, 5), [40.4, 0.8, 14.5], 50);
          st.shi = W3(40.4, 0.6, 14.5);
        }
      } else {
        // IRMÃOS: o campo à noite; a grua sobe atrás do Rin e mostra o Sae do outro lado
        const k = easeIO(t / 300);
        K.sky('#02040a', '#0b1426', 0.7);
        K.expo(lerp(0.55, 0.72, k));
        [['aiku', 52.5, 12.4], ['sae', 53.3, 12.1], ['shidou', 54.1, 12.4]].forEach(([id, x, y]) => K.actor(id, { kit: 'u20', k: 0.9, x, y, ang: Math.PI / 2 + 0.15, frame: 0, light: id === 'sae' ? [1.05, 0.85, 0.95] : [0.8, 0.76, 0.88] }));
        K.floor({ x0: 51.0, y0: 10.8, x1: 56.0, y1: 13.8, img: glowCv('rgba(244,114,182,0.22)'), em: true });
        K.floor({ x0: 50.6, y0: 15.0, x1: 54.6, y1: 18.0, img: glowCv('rgba(34,211,238,0.18)'), em: true });
        K.actor('rin', { kit: 'blueLock', k: 0.9, x: 52.7, y: 16.4, ang: -Math.PI / 2 + 0.12, frame: 0, light: [0.4, 0.62, 0.7] });
        K.cam(mixP([51.9, 0.55, 19.4], [52.2, 1.55, 20.4], k), mixP([52.8, 0.62, 15.0], [53.1, 0.4, 12.6], k), lerp(46, 50, k));
        st.l0 = W3(60.7, 3.33, 6.3);
        st.l1 = W3(45.3, 3.33, 6.3);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const st = stOf(K);
      if (phase === 0) {
        const SLAM = 12;
        // o soco na mesa: o único quadro de impacto da cena
        if (t >= SLAM && t < SLAM + 2) impactFrame(ctx, W, H);
        if (t >= SLAM) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, SLAM + 1, SLAM + 8)), '#fbcfe8');
        if (t > 0 && t < 70) cutSlam(ctx, S, seg(t, 0, 6), seg(t, 0, 70));
        CE.cineSfx(S, SLAM, 'mesa', () => {
          window.SFX?.kick?.(1);
          window.SFX?.tackle?.();
        });
        CE.cineSfx(S, 136, 'risada', () => window.SFX?.blip?.(260));
      } else if (phase === 1) {
        glint(ctx, st.glass, seg(t, 150, 158) * (1 - seg(t, 170, 186)));
        if (t > 150 && t < 270) cutBoard(ctx, S, seg(t, 150, 158), seg(t, 150, 270));
        CE.cineSfx(S, 214, 'fora', () => window.SFX?.kick?.(0.7));
      } else if (phase === 2) {
        CE.luckKicker(ctx, 40, top + 30, 'SEDE DA JFU • SALA DA SUB-20', seg(t, 8, 46), '#fb923c');
        if (t > 196 && t < 330) cutU20(ctx, S, seg(t, 196, 204), seg(t, 196, 300));
        CE.cineSfx(S, 252, 'sub20', () => window.SFX?.tackle?.());
      } else if (phase === 3) {
        const CUTT = 170;
        if (t < CUTT) {
          CE.luckKicker(ctx, 40, top + 30, 'DIAS DEPOIS • TÚNEL DO ESTÁDIO', seg(t, 10, 50), '#f472b6');
          CE.drawSpeedLines(ctx, W, H, '#fbcfe8', 0.06);
        } else {
          const u = t - CUTT;
          if (u < 3) CE.cineFlash(ctx, W, H, 0.5 * (1 - u / 3), '#000000');
          if (st.shi) CE.cineGlow(ctx, st.shi.x, st.shi.y, 180, 'rgba(236,72,153,0.22)');
          if (u > 20 && u < 130) cutShidou(ctx, S, seg(u, 20, 28), seg(u, 20, 130));
          if (u >= 70) CE.cineFlash(ctx, W, H, 0.25 * (1 - seg(u, 70, 80)), '#fbcfe8');
          CE.cineSfx(S, CUTT + 70, 'inimigo', () => window.SFX?.tackle?.());
        }
      } else {
        flare(ctx, S, st.l0, 0.6, '186,230,253', 0.9);
        flare(ctx, S, st.l1, 0.6, '186,230,253', 0.9);
        const tk = seg(t, 200, 240);
        if (tk > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, tk * 2);
          const g = ctx.createLinearGradient(0, bot - 220, 0, bot);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, 'rgba(0,0,0,0.85)');
          ctx.fillStyle = g;
          ctx.fillRect(0, bot - 220, W, 220);
          ctx.restore();
        }
        CE.cineTitleCard(ctx, W, bot - 96, tk, { kicker: 'BLUE LOCK x SUB-20', title: 'IRMÃO CONTRA IRMÃO', sub: '', color: RIN_C });
        CE.cineSfx(S, 200, 'titulo', () => window.SFX?.kick?.(0.8));
      }
    }
  });
})();
