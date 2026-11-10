// ============================================================================
// CUTSCENES EM 3D — a Federação e o Blue Lock Eleven (js/cine_federacao.js refeito no 3D)
// Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D.
//   ego_federation • a sala do conselho da JFU (área vazia, K.VOID): a mesa comprida, os
//                    cartolas, a janela enorme com Tóquio à noite, a porta dupla e o corredor
//                    de vidro do lado de fora
//   bl_eleven      • o saguão do prédio (o telão do Ego) → a lousa tática virando um campo
//                    holográfico na área vazia (os onze aparecem um por um) → as reações
//   shidou_cut     • o saguão (a lista no telão) → a sala da Sub-20 (a mesma sala da JFU, no
//                    pôr do sol) → o túnel (ala do treino) → o campo
// Closes de rosto/olhos, papéis carimbados, cartas e o tablet ficam no overlay, com os
// ajudantes 2D da versão antiga (fedxBust, fedxPaper, fedxStampMark, fedxCard, wcdEyes...).
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;
  const Hub = window.Hub;
  const TAU = Math.PI * 2;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
  const line = (ctx, a, b) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  const WALKF = (f, sp = 6) => 1 + (Math.floor(f / sp) % 4) * 4;

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
  const YOU_C = '#00f5d4';

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
  const ringCv = (col, dash = false) =>
    paint(`ring|${col}|${dash}`, 64, 64, (g) => {
      g.strokeStyle = col;
      g.lineWidth = 3;
      if (dash) g.setLineDash([6, 5]);
      g.beginPath();
      g.arc(32, 32, 29, 0, TAU);
      g.stroke();
    });
  const faceCam = (K, x, y) => Math.atan2(K.c.eye[2] - y, K.c.eye[0] - x);
  // placa em pé com a imagem do jeito certo (o K.quad do kit espelha a imagem)
  const Q = (K, o) => K.quad(Object.assign({}, o, { ang: (o.ang ?? 0) + Math.PI }));
  // Os bonecos em pé viram para o Hub.camA (a câmera do mapa): durante o quadro ele
  // acompanha a câmera da cena e volta ao valor antigo no overlay
  const fixYaw = (def) => {
    const sc = def.scene;
    const ov = def.overlay;
    def.scene = function (K, S) {
      sc.call(this, K, S);
      if (!Hub) return;
      if (CE._fed3CamA === undefined) CE._fed3CamA = Hub.camA;
      const e = K.c.eye;
      const l = K.c.look;
      if (Math.abs(l[0] - e[0]) + Math.abs(l[2] - e[2]) > 1e-4) Hub.camA = Math.atan2(l[2] - e[2], l[0] - e[0]);
    };
    def.overlay = function (ctx, S, K) {
      if (Hub && CE._fed3CamA !== undefined) {
        Hub.camA = CE._fed3CamA;
        CE._fed3CamA = undefined;
      }
      if (ov) ov.call(this, ctx, S, K);
    };
    return def;
  };
  // aura em pixel (a mesma da 2D) num canvas em pé atrás do boneco
  const aura = (K, key, x, y, t, k, pal) => {
    if (k <= 0) return;
    const A = live('aura|' + key, 160, 200, Math.floor(t), 2, (g) => CE.wcdAura(g, 80, 188, 216, t, k, pal));
    const dx = K.c.eye[0] - x;
    const dy = K.c.eye[2] - y;
    const d = Math.hypot(dx, dy) || 1;
    K.sprite(A.cv, { x: x - (dx / d) * 0.12, y: y - (dy / d) * 0.12, z: -0.04, w: 0.95, h: 1.2, glow: true, alpha: 0.45, dirty: A.dirty });
  };
  // olhos em close numa faixa de mangá atravessando a tela
  const eyeStrip = (ctx, S, y0, y1, k, draw, x0 = 0, x1 = S.W) => {
    if (k <= 0) return;
    const h = y1 - y0;
    ctx.save();
    ctx.translate(0, (1 - k) * -40);
    ctx.globalAlpha *= Math.min(1, k * 1.5);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, x1 - x0, h);
    ctx.clip();
    ctx.fillStyle = '#030406';
    ctx.fillRect(x0, y0, x1 - x0, h);
    draw((y0 + y1) / 2);
    ctx.restore();
    ctx.fillStyle = '#020617';
    ctx.fillRect(x0, y0 - 5, x1 - x0, 5);
    ctx.fillRect(x0, y1, x1 - x0, 5);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x0, y0 - 3, x1 - x0, 2);
    ctx.fillRect(x0, y1 + 1, x1 - x0, 2);
    ctx.restore();
  };
  const grain = (ctx, S) => CE.foxcGrain(ctx, S.W, S.H, 0.06);
  const cast = () => CE.fedxCast();
  // aquecimento: um boneco 2D pesado por quadro durante o plano 1
  const warm = (S, key, list) => {
    if (S.phase !== 0 || S.t < 2) return;
    const run = `${key}|${CE._cineRun}`;
    if (CE._fed3Run !== run) {
      CE._fed3Run = run;
      CE._fed3Idx = 0;
    }
    if (CE._fed3Idx < list.length) {
      try {
        list[CE._fed3Idx++].call(CE);
      } catch (e) {}
    }
  };
  const spr = (who, o, base = 180) =>
    function () {
      this.fedxEntry(this.fedxCast()[who], base, o);
    };

  // ==========================================================================
  // A SALA DO CONSELHO DA JFU (área vazia): janela ao norte, porta dupla ao sul
  // ==========================================================================
  const JX = 86;
  const JY = 17;
  const BR = { x0: JX - 5, x1: JX + 5, y0: JY - 5, y1: JY + 3, h: 1.75 };
  const DD = { x0: JX - 0.62, x1: JX + 0.62, h: 1.3 }; // a porta dupla (parede sul)
  const TABLE = { x0: JX - 3.9, x1: JX + 3.9, y0: JY - 2.7, y1: JY - 2.0, h: 0.34 };
  const SEAT_Y = JY - 3.25;
  // os cartolas atrás da mesa [quem, x]
  const SEATS = [['old3', JX - 2.6], ['old1', JX - 1.3], ['pres', JX], ['old2', JX + 1.3], ['old4', JX + 2.6]];
  const PLATES = { old3: 'CONSELHO', old1: 'DIRETORIA', pres: 'PRESIDENTE', old2: 'TESOURARIA', old4: 'SELECOES' };
  // o corredor de vidro do lado de fora da porta (vai para o sul)
  const HALL = { x0: JX - 1.2, x1: JX + 1.2, y0: BR.y1, y1: BR.y1 + 12, h: 1.75 };

  const cityCv = (warm) =>
    paint('city' + (warm ? 'W' : ''), 512, 192, (g, w, h) => {
      CE.cineGradient(g, 0, 0, w, h, warm ? [[0, '#1c0d0a'], [0.6, '#7c2d12'], [1, '#c2410c']] : [[0, '#02050c'], [1, '#132544']]);
      if (!warm) {
        for (let i = 0; i < 90; i++) {
          g.fillStyle = `rgba(255,255,255,${0.2 + rnd(i, 3) * 0.5})`;
          g.fillRect(rnd(i, 1) * w, rnd(i, 2) * 90, 1, 1);
        }
      } else CE.cineGlow(g, 330, h - 40, 160, 'rgba(251,146,60,0.6)');
      // a torre lá longe
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
        window.Hub?.ptext?.(g, 'JFU', 16, 20, '#facc15', 1, 'center');
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
      window.Hub?.ptext?.(g, text, w / 2, 1, '#0b1120', 1, 'center');
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
  const hallFramesCv = () =>
    paint('hallframes', 192, 48, (g, w, h) => {
      g.fillStyle = '#0c1320';
      g.fillRect(0, 0, w, h);
      [10, 74, 138].forEach((x, i) => {
        g.fillStyle = '#a16207';
        g.fillRect(x, 10, 44, 28);
        g.fillStyle = i === 1 ? '#7f1d1d' : '#1d4ed8';
        g.fillRect(x + 2, 12, 40, 24);
        g.fillStyle = 'rgba(248,250,252,0.7)';
        g.beginPath();
        g.arc(x + 22, 24, 6, 0, TAU);
        g.fill();
      });
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
    // luzes do teto
    for (let i = 0; i < 6; i++) K.floor({ x0: x0 + 0.8 + i * 1.6, y0: y0 + 1.5, x1: x0 + 1.6 + i * 1.6, y1: y0 + 1.62, z: h - 0.01, color: warm ? '#fff1d6' : '#eef6ff', em: true });
    // a janela (parede norte): Tóquio lá fora, os caixilhos, o lambri embaixo
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
    // persianas meio baixadas nas pontas
    [[x0 + 0.5, x0 + 1.9], [x1 - 1.9, x1 - 0.5]].forEach(([a, b]) => K.box({ x0: a, y0: y0 + 0.02, x1: b, y1: y0 + 0.05, z0: 1.15, z1: 1.58, color: warm ? '#3b2718' : '#1e293b' }));
    // paredes dos lados e a do sul (com o vão da porta dupla)
    Q(K, { x: x0, y: (y0 + y1) / 2, w: y1 - y0, h, ang: 0, img: panelCv(warm) });
    Q(K, { x: x1, y: (y0 + y1) / 2, w: y1 - y0, h, ang: Math.PI, img: panelCv(warm) });
    Q(K, { x: (x0 + DD.x0 - 0.1) / 2, y: y1, w: DD.x0 - 0.1 - x0, h, ang: -Math.PI / 2, img: panelCv(warm) });
    Q(K, { x: (DD.x1 + 0.1 + x1) / 2, y: y1, w: x1 - DD.x1 - 0.1, h, ang: -Math.PI / 2, img: panelCv(warm) });
    Q(K, { x: JX, y: y1, z: DD.h + 0.06, w: DD.x1 - DD.x0 + 0.2, h: h - DD.h - 0.06, ang: -Math.PI / 2, color: warm ? '#1d140e' : '#0b111c' });
    K.box({ x0: DD.x0 - 0.1, y0: y1 - 0.06, x1: DD.x1 + 0.1, y1: y1, z0: DD.h, z1: DD.h + 0.06, color: '#a16207' });
    // bandeiras: Japão e JFU
    [[x0 + 0.75, 0], [x1 - 0.75, 1]].forEach(([fx, kind]) => {
      K.box({ x0: fx - 0.02, y0: y0 + 0.45, x1: fx + 0.02, y1: y0 + 0.49, z0: 0, z1: 1.45, color: '#a16207' });
      Q(K, { x: fx + (kind ? -0.26 : 0.26), y: y0 + 0.47, z: 0.72, w: 0.46, h: 0.68, ang: Math.PI / 2, img: flagCv(kind) });
    });
    if (warm) Q(K, { x: x1 - 1.7, y: y0 + 0.06, z: 1.12, w: 0.5, h: 0.4, ang: Math.PI / 2, img: paint('pennant', 32, 24, (g) => {
      g.fillStyle = '#0b1d4d';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(32, 0);
      g.lineTo(16, 24);
      g.fill();
      window.Hub?.ptext?.(g, 'SUB20', 16, 3, '#f8fafc', 1, 'center');
    }) });
    // a mesa comprida, as plaquinhas e os microfones
    if (!o.noTable) {
      K.box({ x0: TABLE.x0, y0: TABLE.y0, x1: TABLE.x1, y1: TABLE.y1, z0: 0, z1: TABLE.h, color: warm ? '#24180f' : '#121926', top: warm ? '#4a3527' : '#3a4558' });
      SEATS.forEach(([who, x], i) => {
        Q(K, { x, y: TABLE.y1 + 0.005, z: TABLE.h - 0.09, w: 0.5, h: 0.08, ang: Math.PI / 2, img: plateCv(PLATES[who]) });
        K.box({ x0: x + 0.3, y0: TABLE.y0 + 0.3, x1: x + 0.33, y1: TABLE.y0 + 0.33, z0: TABLE.h, z1: TABLE.h + 0.18, color: '#0b1120' });
        const on = 0.6 + 0.4 * Math.sin(t * 0.08 + i);
        K.box({ x0: x + 0.29, y0: TABLE.y0 + 0.29, x1: x + 0.34, y1: TABLE.y0 + 0.34, z0: TABLE.h + 0.18, z1: TABLE.h + 0.21, color: on > 0.7 ? '#ef4444' : '#7f1d1d', em: true });
      });
    }
    // as poltronas de couro (encosto alto) atrás de cada cartola
    if (!o.noChairs) SEATS.forEach(([, x]) => K.box({ x0: x - 0.3, y0: SEAT_Y - 0.34, x1: x + 0.3, y1: SEAT_Y - 0.22, z0: 0, z1: 0.92, color: warm ? '#2a1a10' : '#1a1410', top: '#3b2a1e' }));
  }
  // os cartolas sentados nas poltronas (assento a 0,1: a cabeça fica onde ficava o boneco em
  // pé; a mesa esconde as pernas)
  const CHAIR_H = 0.1;
  const oldMen = (K, t, o = {}) => {
    const c = cast();
    SEATS.forEach(([who, x], i) => {
      if (o.skip && o.skip.includes(who)) return;
      const laugh = o.laugh ? -Math.abs(Math.sin(t * 0.42 + i * 0.7)) * 0.03 : 0;
      K.actor(c[who], { id: who, x, y: SEAT_Y, z: laugh, seat: CHAIR_H, anim: 'sit', ang: Math.PI / 2, k: 0.9, light: o.light ? (typeof o.light === 'function' ? o.light(who) : o.light) : undefined });
    });
  };
  // a porta dupla da sala (giram para dentro): open 0..1
  function doubleDoor(K, open, outside = 1) {
    const y = BR.y1;
    const w = (DD.x1 - DD.x0) / 2;
    if (outside > 0) {
      // o corredor aceso lá fora
      Q(K, { x: JX, y: y + 3.4, w: 2.6, h: 1.75, ang: -Math.PI / 2, color: '#e0f2fe', em: true });
      K.floor({ x0: JX - 1.2, y0: y, x1: JX + 1.2, y1: y + 3.4, color: '#cfe3ff', em: true });
      Q(K, { x: JX - 1.2, y: y + 1.7, w: 3.4, h: 1.75, ang: 0, color: '#bcd4f0', em: true });
      Q(K, { x: JX + 1.2, y: y + 1.7, w: 3.4, h: 1.75, ang: Math.PI, color: '#bcd4f0', em: true });
      if (open > 0) K.floor({ x0: JX - 1.6, y0: y - 3.2 * open, x1: JX + 1.6, y1: y, img: glowCv('rgba(224,242,254,0.45)', 0.5, 1), em: true, alpha: Math.min(0.95, open) });
    }
    // as folhas, girando em volta das dobradiças
    [[DD.x0, 1], [DD.x1, -1]].forEach(([hx, s]) => {
      const th = (s > 0 ? 0 : Math.PI) - s * open * 1.3;
      const cx = hx + Math.cos(th) * (w / 2);
      const cy = y - 0.02 + Math.sin(th) * (w / 2);
      K.quad({ x: cx, y: cy, w, h: DD.h, ang: th + Math.PI / 2, img: doorLeafCv() });
    });
  }
  // o corredor de vidro (do lado de fora da porta): vidro a leste com a cidade, quadros a oeste
  function glassHall(K, t) {
    const { x0, x1, y0, y1, h } = HALL;
    K.sky('#02050c', '#132544', 0.5);
    K.fog('#04070d', 0.04);
    K.ambient('#b4c3dc');
    K.expo(0.95);
    K.floor({ x0, y0, x1, y1, img: paint('hallfloor', 32, 128, (g, w, hh) => {
      CE.cineGradient(g, 0, 0, w, hh, [[0, '#0a101c'], [1, '#141c2a']]);
      g.fillStyle = 'rgba(253,224,71,0.06)';
      g.fillRect(w - 8, 0, 8, hh);
    }) });
    K.floor({ x0, y0, x1, y1, z: h, color: '#070b13' });
    for (let i = 0; i < 6; i++) K.floor({ x0: JX - 0.3, y0: y0 + 1 + i * 2, x1: JX + 0.3, y1: y0 + 1.25 + i * 2, z: h - 0.01, color: '#e6f0ff', em: true });
    // a parede de vidro: montantes e a cidade bem longe
    Q(K, { x: x1 + 9, y: (y0 + y1) / 2, z: -1.4, w: 26, h: 8, ang: Math.PI, img: cityCv(false), em: true });
    for (let y = y0; y <= y1; y += 1.5) K.box({ x0: x1 - 0.04, y0: y - 0.04, x1: x1 + 0.04, y1: y + 0.04, z0: 0, z1: h, color: '#05080e' });
    K.box({ x0: x1 - 0.04, y0, x1: x1 + 0.04, y1, z0: 0.0, z1: 0.12, color: '#05080e' });
    Q(K, { x: x1, y: (y0 + y1) / 2, w: y1 - y0, h, ang: Math.PI, color: '#93c5fd', alpha: 0.06 });
    // a parede com os quadros da seleção
    for (let i = 0; i < 6; i++) Q(K, { x: x0, y: y0 + 1 + i * 2, w: 2, h, ang: 0, img: hallFramesCv() });
    Q(K, { x: JX, y: y1, w: x1 - x0, h, ang: -Math.PI / 2, color: '#03050a' });
  }

  // o Ego e a Anri (com o tablet)
  const ego = (K, o) => K.actor('EGO', Object.assign({ k: 0.95 }, o));
  const anri = (K, o) => K.actor('ANRI', Object.assign({ k: 0.86 }, o));

  // ==========================================================================
  // 1. A APOSTA DO EGO
  // ==========================================================================
  // a visão da aposta (área vazia, mais a leste): perdeu (vermelho) / ganhou (ciano)
  const VS = [102, 17];
  CE.registerCine3D('ego_federation', fixYaw({
    phases: [225, 280, 300, 350, 210, 325],
    music: 'mystery',
    title: '🏛️ A APOSTA DO EGO',
    tags: ['PLANO 1 • A SALA DO CONSELHO', 'PLANO 2 • PROJETO DE CRIANÇAS', 'PLANO 3 • SEM CONVITE', 'PLANO 4 • A APOSTA', 'PLANO 5 • APROVADO', 'PLANO 6 • O CORREDOR'],
    subs: [
      [{ from: 12, to: 222, who: 'NARRADOR', text: 'Sede da JFU. Pauta: fechar o Blue Lock.', color: NARR_C }],
      [
        { from: 8, to: 178, who: 'PRESIDENTE', text: '"Projeto de crianças. Acabou!"', color: PRES_C },
        { from: 178, to: 272, who: 'CARTOLAS', text: '"Hahaha!"', color: CART_C }
      ],
      [
        { from: 56, to: 216, who: 'PRESIDENTE', text: '"...Ego? Quem te convidou?"', color: PRES_C },
        { from: 216, to: 298, who: 'EGO', text: '"Ninguém."', color: EGO_C }
      ],
      [
        { from: 14, to: 162, who: 'EGO', text: '"Blue Lock x Sub-20. Ao vivo."', color: EGO_C },
        { from: 162, to: 349, who: 'EGO', text: '"Perdeu, acabou. Ganhou, vira a seleção."', color: EGO_C }
      ],
      [{ from: 8, to: 206, who: 'PRESIDENTE', text: '"Fechado. Vai ser o funeral de vocês."', color: PRES_C }],
      [
        { from: 6, to: 168, who: 'ANRI', text: '"A Sub-20 topou. O Aiku aceitou!"', color: ANRI_C },
        { from: 168, to: 323, who: 'EGO', text: '"Velhos. Acham que já ganharam."', color: EGO_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase, f } = S;
      const bl = { kit: 'blueLock', k: 0.88 };
      if (phase === 0) {
        // a sala do conselho: os velhos atrás da mesa, a cidade lá fora
        const k = easeIO(t / 225);
        const n = K.noise(t * 0.4, 2) * 0.008;
        K.cam([JX + n, lerp(1.12, 0.98, k), lerp(BR.y1 - 0.3, BR.y1 - 1.6, k)], [JX, lerp(0.72, 0.66, k), SEAT_Y], lerp(56, 48, k));
        boardRoom(K, t);
        doubleDoor(K, 0, 0);
        oldMen(K, t);
      } else if (phase === 1) {
        // o presidente gargalha
        const k = easeIO(t / 280);
        const laughing = t < 168;
        const sh = laughing ? 0.012 : 0.004;
        K.cam([JX + 0.55 + K.noise(t * 1.4, 2) * sh, 0.6 + K.noise(t * 1.4, 4) * sh, lerp(JY - 0.2, JY - 0.45, k)], [JX + 0.62, 0.5, SEAT_Y], 44);
        boardRoom(K, t);
        doubleDoor(K, 0, 0);
        oldMen(K, t, { laugh: laughing || t > 178 });
      } else if (phase === 2) {
        // o reverso: a porta dupla se abre; o Ego entra sem convite
        const bang = 50;
        const open = ease(seg(t, bang, bang + 16));
        const k = easeIO(t / 300);
        const sh = 0.004 + (t >= bang ? 0.04 * (1 - seg(t, bang, bang + 24)) : 0);
        K.cam([JX + K.noise(t * 2, 1) * sh, 0.74 + K.noise(t * 2, 3) * sh, lerp(JY - 1.9, JY - 1.6, k)], [JX, lerp(0.66, 0.62, k), BR.y1], lerp(52, 46, k));
        boardRoom(K, t, { noChairs: true, amb: '#7d8aa3', expo: 0.9 });
        doubleDoor(K, open, 1);
        const c = cast();
        // de costas, afundados nas poltronas: só o alto da cabeça aparece
        [['old2', JX - 0.78], ['pres', JX + 0.8]].forEach(([who, x]) => {
          K.actor(c[who], { id: who, x, y: JY - 0.55, seat: CHAIR_H - 0.02, anim: 'sit', ang: Math.PI / 2, k: 0.9, light: open > 0.1 ? [0.13, 0.15, 0.2] : [0.08, 0.09, 0.12] });
          K.box({ x0: x - 0.32, y0: JY - 0.86, x1: x + 0.32, y1: JY - 0.74, z0: 0, z1: 0.42, color: '#1a1410', top: '#3b2a1e' });
        });
        if (open > 0.4) {
          const wk = easeIO(seg(t, 110, 300));
          ego(K, { x: JX, y: lerp(BR.y1 + 0.3, BR.y1 - 1.1, wk), ang: -Math.PI / 2, anim: wk > 0 && wk < 1 ? 'run' : 'idle', frame: wk > 0 && wk < 1 ? WALKF(f, 7) : f, view: 'front', light: K.mix([0.12, 0.15, 0.2], [0.42, 0.48, 0.56], seg(t, 200, 300)) });
        }
      } else if (phase === 3) {
        const cut = 168;
        if (t < cut) {
          // o close do Ego (à direita), a aposta escrita do lado
          const k = easeIO(t / cut);
          K.cam([JX - 0.1, 0.6, lerp(JY - 1.0, JY - 0.75, k)], [JX + 0.45, 0.48, JY + 1.6], 42);
          boardRoom(K, t, { noChairs: true, expo: 0.85 });
          doubleDoor(K, 1, 1);
          ego(K, { x: JX - 0.25, y: JY + 1.6, ang: -Math.PI / 2, light: [0.62, 0.74, 0.78] });
        } else {
          // a aposta: perdeu (eles indo embora) | ganhou (a camisa do Japão)
          const u = t - cut;
          const wk = easeIO(u / 190);
          const [vx, vy] = VS;
          K.cam([vx + K.noise(u * 2, 3) * 0.03 * (1 - seg(u, 0, 26)), 0.82, vy + 4.3], [vx, 0.62, vy - 1], 50);
          K.sky('#05020a', '#0a0a14', 0);
          K.fog('#040406', 0.05);
          K.ambient('#808080');
          K.expo(0.95);
          K.floor({ x0: vx - 6, y0: vy - 4, x1: vx + 6, y1: vy + 4, color: '#101014' });
          Q(K, { x: vx, y: vy - 3, z: 0, w: 12, h: 5, ang: Math.PI / 2, img: paint('betbg', 128, 64, (g, w, h) => {
            CE.cineGradient(g, 0, 0, w, h, [[0, '#3a3a40'], [1, '#141418']]);
            g.fillStyle = 'rgba(255,255,255,0.06)';
            for (let i = 0; i < 24; i++) g.fillRect(w / 2 + (rnd(i, 2) - 0.5) * w, 0, 1, h);
          }), em: true });
          [['bachira', -1], ['you', 0], ['chigiri', 1]].forEach(([id, i]) => {
            K.actor(id, Object.assign({ id: 'L', x: vx - 1.7 + i * 0.6 + i * wk * 0.2, y: lerp(vy + 1.6, vy - 0.4, wk) - Math.abs(i) * 0.1, ang: -Math.PI / 2, anim: 'run', frame: WALKF(f + i * 3, 8), light: [0.9, 0.3, 0.3] }, bl));
          });
          K.actor('rin', { id: 'R', kit: 'japan', k: 0.88, x: vx + 1.15, y: vy + 0.3, ang: Math.PI / 2, light: [0.55, 0.95, 1.05] });
          K.actor('nagi', { id: 'R', kit: 'japan', k: 0.88, x: vx + 2.55, y: vy + 0.3, ang: Math.PI / 2, light: [0.55, 0.95, 1.05] });
          K.actor('you', { id: 'R', kit: 'japan', k: 0.9, x: vx + 1.85, y: vy + 1.0, ang: Math.PI / 2, light: [0.75, 1.1, 1.15] });
        }
      } else if (phase === 4) {
        // o presidente aceita, sorrindo
        const k = easeIO(t / 210);
        K.cam([JX + 0.55, 0.6, lerp(JY - 0.25, JY - 0.45, k)], [JX + 0.62, 0.5, SEAT_Y], 44);
        boardRoom(K, t, { warm: false, amb: '#c8b48e' });
        doubleDoor(K, 1, 1);
        oldMen(K, t, { light: (who) => (who === 'pres' ? [1.05, 0.95, 0.75] : [0.42, 0.44, 0.52]) });
      } else {
        const cut = 196;
        if (t < cut) {
          // o corredor de vidro: o Ego e a Anri vindo na direção da câmera
          const k = easeIO(t / cut);
          const wk = seg(t, 0, cut);
          K.cam([JX - 0.15, 0.9, lerp(BR.y1 + 0.6, BR.y1 + 0.9, k)], [JX + 0.05, 0.55, BR.y1 + 6], 50);
          glassHall(K, t);
          const y = lerp(BR.y1 + 6.4, BR.y1 + 3.0, wk);
          ego(K, { x: JX - 0.42, y, ang: -Math.PI / 2, anim: 'run', frame: WALKF(f, 7), view: 'front', light: [0.78, 0.84, 0.92] });
          anri(K, { x: JX + 0.42, y: y + 0.06, ang: -Math.PI / 2, anim: 'run', frame: WALKF(f + 9, 7), view: 'front', light: [0.8, 0.84, 0.92] });
          // o tablet aceso na mão dela
          K.quad({ x: JX + 0.2, y: y - 0.12, z: 0.26, w: 0.16, h: 0.11, ang: faceCam(K, JX + 0.2, y - 0.12), color: '#38bdf8', em: true });
        } else {
          // o Ego: o canto da boca sobe
          const u = t - cut;
          const k = easeIO(u / 130);
          K.cam([JX + 0.35, 0.62, lerp(BR.y1 + 0.75, BR.y1 + 0.95, k)], [JX + 0.05, 0.56, BR.y1 + 3.0], 40);
          glassHall(K, t);
          ego(K, { x: JX - 0.1, y: BR.y1 + 3.0, ang: -Math.PI / 2, light: [0.66, 0.8, 0.84] });
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = cast();
      if (phase === 0) {
        // a pasta em primeiro plano, fora de foco
        ctx.fillStyle = '#030509';
        poly(ctx, [[-60, 700], [420, 640], [470, 760], [-60, 760]]);
        ctx.fill();
        ctx.fillStyle = 'rgba(147,197,253,0.18)';
        ctx.fillRect(-60, 690, 470, 2);
        CE.finKicker(ctx, 40, top + 30, 'SEDE DA JFU • TÓQUIO • 21:40', seg(t, 6, 46));
        CE.finKicker(ctx, 40, top + 58, 'FIM DA SEGUNDA SELEÇÃO', seg(t, 34, 80), '#38bdf8');
      } else if (phase === 1) {
        ['HA', 'HA', 'HAHA!'].forEach((s, i) => CE.cineImpactText(ctx, s, [130, 760, 690][i], [top + 110, top + 76, top + 200][i], [58, 64, 74][i], '#fef3c7', seg(t, 20 + i * 18, 28 + i * 18) * (1 - seg(t, 160, 176)), 0, [-0.18, 0.12, -0.08][i]));
        // painel: os outros cartolas rindo junto
        const kA = ease(seg(t, 104, 120));
        if (kA > 0) {
          CE.finPanel(ctx, [[832, top + 14], [W - 16, top + 14], [W - 16, 318], [850, 330]], () => {
            CE.cineGradient(ctx, 820, top, 470, 260, [[0, '#101a2c'], [1, '#060a14']]);
            CE.drawRadialSpeedLines(ctx, 1050, 230, 520, '#cbd5e1', 0.1);
            [[c.old2, 960, 236], [c.old3, 1150, 248]].forEach(([ch, x, ey]) => {
              const rr = CE.fedxHead(ctx, ch, x, ey, 400, { dim: 0.12, dimTint: '8,14,30', rimColor: '#93c5fd', rimPx: 3 });
              CE.fedxLaughEyes(ctx, x, rr.top, rr.u, CE.finShade(ch.skinColor, -0.05));
              CE.fedxLaughMouth(ctx, x, rr.top, rr.u, 0.5 + 0.5 * Math.abs(Math.sin(t * 0.5 + x)), ch.fedxOld.mustache);
            });
            CE.rincStamp(ctx, 'HAHAHA!', 1060, top + 52, 34, '#fef3c7', t, 112, 2);
          }, { dx: (1 - kA) * 480 });
        }
        // painel: o carimbo no projeto
        const hit = 200;
        const kB = ease(seg(t, 150, 166));
        if (kB > 0) {
          CE.finPanel(ctx, [[850, 342], [W - 16, 334], [W - 16, bot - 14], [832, bot - 14]], () => {
            const sh = t >= hit ? CE.cineNoise(S.f * 2.1, 3) * 6 * (1 - seg(t, hit, hit + 18)) : 0;
            ctx.save();
            ctx.translate(sh, sh * 0.5);
            CE.cineGradient(ctx, 820, 330, 470, 320, [[0, '#2a1d14'], [1, '#160f0a']]);
            CE.fedxPaper(ctx, 1050, 486, 330, 230, -0.05, 'PROJETO BLUE LOCK', [null, null, null, null], {
              extra: (g, w, h) => {
                [c.you, c.bachira, c.chigiri, c.rin].forEach((ch, i) => {
                  const px = -w / 2 + 22 + i * 74;
                  const py = h / 2 - 82;
                  g.fillStyle = '#cbd5e1';
                  g.fillRect(px - 3, py - 3, 66, 66);
                  g.fillStyle = '#1e293b';
                  g.fillRect(px, py, 60, 60);
                  CE.finCrop(g, ch, {}, 10, 2, 16, 16, px, py, 60, 60);
                });
              }
            });
            CE.fedxStampMark(ctx, 1060, 470, 'ENCERRADO', -0.16, seg(t, hit, hit + 6), '#dc2626', 46);
            CE.fedxStamper(ctx, 1060, 470, t, hit, 0.9);
            ctx.restore();
            if (t >= hit) CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(t, hit, hit + 10)), '#fee2e2');
          }, { dy: (1 - kB) * 330 });
        }
        CE.cineSfx(S, 20, 'riso', () => window.SFX?.blip?.(220));
        CE.cineSfx(S, hit, 'carimbo', () => window.SFX?.tackle?.());
      } else if (phase === 2) {
        const bang = 50;
        // o brilho dos óculos no escuro
        const gk = seg(t, 150, 160) * (1 - seg(t, 230, 250));
        if (gk > 0) {
          const wk = easeIO(seg(t, 110, 300));
          const p = K.screen(JX, 0.5, lerp(BR.y1 + 0.3, BR.y1 - 1.1, wk));
          if (p) {
            [-1, 1].forEach((s) => {
              CE.cineGlow(ctx, p.x + s * 9, p.y, 22, 'rgba(204,251,241,0.8)', gk);
              ctx.fillStyle = `rgba(240,253,250,${gk})`;
              ctx.fillRect(Math.round(p.x + s * 9 - 6), Math.round(p.y - 3), 12, 5);
            });
          }
        }
        [[260, 380], [1020, 360]].forEach(([x, y], i) => CE.cineImpactText(ctx, '!?', x, y, 64, '#facc15', seg(t, bang + 6 + i * 5, bang + 14 + i * 5), 0, i ? 0.12 : -0.1));
        if (t >= bang) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, bang, bang + 12)), '#e0f2fe');
        CE.finKicker(ctx, W / 2, bot - 58, 'JINPACHI EGO', seg(t, 176, 210), EGO_C, 'center');
        CE.finKicker(ctx, W / 2, bot - 30, 'NINGUÉM CHAMOU', seg(t, 196, 236), '#94a3b8', 'center');
        CE.cineSfx(S, bang, 'porta', () => window.SFX?.tackle?.());
        CE.cineSfx(S, bang + 4, 'porta2', () => window.SFX?.whoosh?.());
      } else if (phase === 3) {
        const cut = 168;
        if (t < cut) {
          CE.rincStamp(ctx, 'BLUE LOCK', 290, top + 118, 66, '#e2e8f0', t, 22, 2, 470);
          CE.rincStamp(ctx, 'x', 290, top + 182, 44, EGO_C, t, 40, 2);
          CE.rincStamp(ctx, 'SUB-20 DO JAPÃO', 290, top + 246, 54, '#f8fafc', t, 48, 2, 470);
          const lk = seg(t, 84, 98);
          if (lk > 0) {
            ctx.save();
            ctx.globalAlpha = lk;
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(154, top + 300, 272, 38);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(176, top + 319, 7, 0, TAU);
            ctx.fill();
            ctx.font = 'italic 900 19px "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('AO VIVO • REDE NACIONAL', 192, top + 320);
            ctx.restore();
          }
          // os óculos do Ego brilham
          const p = K.screen(JX - 0.25, 0.5, JY + 1.6);
          const gl = 1 - seg(t, 70, 92);
          if (p && gl > 0) {
            [-1, 1].forEach((s) => {
              ctx.fillStyle = `rgba(236,254,255,${0.9 * gl})`;
              ctx.fillRect(Math.round(p.x + s * 16 - 11), Math.round(p.y - 6), 22, 10);
            });
          }
          // painel: os olhos do presidente arregalando
          const kp = ease(seg(t, 108, 122));
          if (kp > 0) {
            CE.finPanel(ctx, [[40, bot - 166], [560, bot - 178], [560, bot - 16], [40, bot - 16]], () => {
              ctx.fillStyle = '#0a0f1a';
              ctx.fillRect(30, bot - 190, 540, 190);
              const dw = 640;
              const U = dw / 16;
              const cx = 300;
              const ey = bot - 92;
              CE.fedxCrop(ctx, c.pres, {}, 10, 5.4, 16, 9, cx - 8 * U, ey - 4.7 * U, dw, 9 * U);
              CE.wcdEyes(ctx, cx, ey, U, { ring: '#78716c', iris: '#1c1917', tiny: true, look: t > 140 ? 1 : 0 });
              CE.fedxSweat(ctx, cx + 6.4 * U, ey - 3.2 * U + ease(seg(t, 120, 166)) * U * 1.6, U * 0.5);
              ctx.fillStyle = 'rgba(8,14,30,0.22)';
              ctx.fillRect(30, bot - 190, 540, 190);
            }, { dx: (1 - kp) * -600 });
          }
          CE.cineSfx(S, 22, 'bl', () => window.SFX?.blip?.(330));
          CE.cineSfx(S, 48, 'u20', () => window.SFX?.blip?.(440));
        } else {
          // a tela racha em diagonal: vermelho de um lado, ciano do outro
          const u = t - cut;
          const mx = W / 2;
          const sk = 90;
          ctx.save();
          poly(ctx, [[-40, top - 40], [mx + sk, top - 40], [mx - sk, bot + 40], [-40, bot + 40]]);
          ctx.clip();
          ctx.globalCompositeOperation = 'color';
          ctx.fillStyle = 'rgba(220,38,38,0.85)';
          ctx.fillRect(0, top, W, bot - top);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = 'rgba(48,6,6,0.25)';
          ctx.fillRect(0, top, W, bot - top);
          CE.foxcRays(ctx, 300, bot + 40, 0, 900, 40, '#fca5a5', 0.07, u * 0.002, 0.03);
          ctx.restore();
          ctx.save();
          poly(ctx, [[mx + sk, top - 40], [W + 40, top - 40], [W + 40, bot + 40], [mx - sk, bot + 40]]);
          ctx.clip();
          ctx.globalCompositeOperation = 'color';
          ctx.fillStyle = 'rgba(34,211,238,0.85)';
          ctx.fillRect(0, top, W, bot - top);
          ctx.globalCompositeOperation = 'source-over';
          CE.foxcRays(ctx, 960, 300, 0, 900, 48, '#a5f3fc', 0.08, -u * 0.002, 0.03);
          CE.cineGlow(ctx, 960, 330, 320, 'rgba(34,211,238,0.16)');
          ctx.restore();
          ctx.strokeStyle = '#020617';
          ctx.lineWidth = 12;
          line(ctx, [mx + sk + 10, top - 40], [mx - sk - 10, bot + 40]);
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 5;
          line(ctx, [mx + sk + 10, top - 40], [mx - sk - 10, bot + 40]);
          CE.rincStamp(ctx, 'PERDEU:', 250, top + 62, 40, '#fca5a5', u, 14, 2, 0);
          CE.rincStamp(ctx, 'O BLUE LOCK ACABA.', 290, top + 120, 44, '#fee2e2', u, 22, 2, 480);
          CE.rincStamp(ctx, 'GANHOU:', 1010, top + 62, 40, '#a5f3fc', u, 60, 2, 0);
          CE.rincStamp(ctx, 'VIRA A SELEÇÃO.', 1000, top + 120, 44, '#ecfeff', u, 68, 2, 460);
          if (u >= 0) CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(u, 0, 10)));
          CE.cineSfx(S, cut, 'racha', () => window.SFX?.kick?.(1));
        }
      } else if (phase === 4) {
        // o brilho no dente do sorriso
        const sp = seg(t, 30, 42) * (1 - seg(t, 52, 66));
        const p = K.screen(JX + 0.03, 0.4, SEAT_Y);
        if (sp > 0 && p) CE.finSparkle(ctx, p.x, p.y, 16, sp);
        // o contrato e o carimbo
        const hit = 104;
        const kp = ease(seg(t, 44, 60));
        if (kp > 0) {
          CE.finPanel(ctx, [[790, top + 18], [W - 18, top + 30], [W - 18, bot - 18], [760, bot - 30]], () => {
            const sh = t >= hit ? CE.cineNoise(S.f * 2.1, 5) * 6 * (1 - seg(t, hit, hit + 18)) : 0;
            ctx.save();
            ctx.translate(sh, sh * 0.4);
            CE.cineGradient(ctx, 750, top, 540, bot - top, [[0, '#2a1d14'], [1, '#120c08']]);
            CE.cineGlow(ctx, 1000, top + 120, 260, 'rgba(253,230,138,0.2)');
            CE.fedxPaper(ctx, 1010, (top + bot) / 2, 380, 400, 0.04, 'PARTIDA OFICIAL', ['BLUE LOCK  x  SUB-20 DO JAPÃO', 'TRANSMISSÃO: REDE NACIONAL', null, 'DERROTA DO BLUE LOCK:', 'FIM DO PROJETO.', null, null], { titleSize: 24 });
            CE.fedxStampMark(ctx, 1030, bot - 120, 'APROVADO', -0.12, seg(t, hit, hit + 6), '#dc2626', 44);
            CE.fedxStamper(ctx, 1030, bot - 120, t, hit, 0.9);
            ctx.restore();
          }, { dx: (1 - kp) * 540 });
        }
        if (t >= hit) CE.cineFlash(ctx, W, H, 0.35 * (1 - seg(t, hit, hit + 10)), '#fee2e2');
        CE.finKicker(ctx, 40, top + 30, 'ELES ACHARAM QUE ESTAVAM ASSINANDO O FIM', seg(t, 128, 190), '#fbbf24');
        CE.cineSfx(S, hit, 'aprovado', () => window.SFX?.tackle?.());
      } else {
        const cut = 196;
        if (t < cut) {
          // painel: a Anri, decidida
          const kA = ease(seg(t, 24, 40));
          if (kA > 0) {
            CE.finPanel(ctx, [[20, top + 16], [470, top + 16], [452, 336], [20, 326]], () => {
              CE.cineGradient(ctx, 0, top, 480, 260, [[0, '#2a1f10'], [1, '#0c0a06']]);
              CE.drawRadialSpeedLines(ctx, 245, 220, 420, '#fde68a', 0.1);
              const r = CE.finHead(ctx, c.anri, 245, 232, 460, { rim: '#fde68a' });
              CE.wcdEyes(ctx, 245, 232, r.u, { ring: '#a16207', iris: '#3f2a1d', shine: 1, reflect: '#fde68a' });
              CE.rincStamp(ctx, 'CONSEGUI!', 380, top + 50, 30, '#fef3c7', t, 36, 2);
            }, { dx: (1 - kA) * -520 });
          }
          // painel: a chamada com o Aiku
          const kB = ease(seg(t, 78, 94));
          if (kB > 0) {
            CE.finPanel(ctx, [[812, 300], [W - 18, 290], [W - 18, bot - 16], [830, bot - 16]], () => {
              CE.cineGradient(ctx, 800, 280, 480, 360, [[0, '#0a1222'], [1, '#04070e']]);
              CE.fedxTablet(ctx, 852, 318, 400, 262, t, seg(t, 128, 136));
            }, { dy: (1 - kB) * 360 });
          }
          CE.cineSfx(S, 132, 'aceito', () => window.SFX?.blip?.(660));
        } else {
          const u = t - cut;
          if (u < 2) CE.cineFlash(ctx, W, H, 0.5, '#000000');
          const tk = seg(u, 70, 104);
          if (tk > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, tk * 2);
            CE.foxcGrad(ctx, 0, bot - 230, W, 230, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.88)']]);
            ctx.restore();
          }
          CE.cineTitleCard(ctx, W, bot - 100, tk, { kicker: 'A APOSTA ESTÁ FEITA', title: 'BLUE LOCK x SUB-20', sub: '', color: EGO_C });
          CE.cineSfx(S, cut + 70, 'titulo', () => window.SFX?.kick?.(0.8));
        }
      }
      warm(S, 'fed', [
        spr('old2', { dim: 0.12, dimTint: '8,14,30', rim: '#93c5fd', rimSides: [-1, 1], rimD: 1 }),
        spr('old3', { dim: 0.12, dimTint: '8,14,30', rim: '#93c5fd', rimSides: [-1, 1], rimD: 1 }),
        spr('pres', {}),
        spr('anri', { rim: '#fde68a' }),
        spr('aiku', { rim: '#93c5fd' }),
        spr('you', {}),
        spr('bachira', {}),
        spr('chigiri', {}),
        spr('rin', {})
      ]);
      grain(ctx, S);
    }
  }));

  // ==========================================================================
  // 2. O BLUE LOCK ELEVEN
  // ==========================================================================
  // o telão do saguão do prédio (parede norte, x 23–27)
  const SCR3 = { x: 25, y: 9.03, z: 0.28, w: 3.9, h: 1.34 };
  function screenQuad(K, key, every, fn) {
    const L = live(key, 468, 160, K.S.f, every, fn);
    K.box({ x0: SCR3.x - SCR3.w / 2 - 0.08, y0: 9.0, x1: SCR3.x + SCR3.w / 2 + 0.08, y1: 9.02, z0: SCR3.z - 0.06, z1: SCR3.z + SCR3.h + 0.06, color: '#010205' });
    Q(K, { x: SCR3.x, y: SCR3.y, z: SCR3.z, w: SCR3.w, h: SCR3.h, ang: Math.PI / 2, img: L.cv, dirty: L.dirty, em: true });
    K.floor({ x0: SCR3.x - 2.6, y0: 9.0, x1: SCR3.x + 2.6, y1: 12.5, img: glowCv('rgba(0,245,212,0.22)', 0.5, 0), em: true });
  }
  // a lousa tática vira um campo holográfico na área vazia: posição (2D) → chão
  const BX = (x) => JX + (x - 600) / 100;
  const BY = (y) => JY + (y - 360) / 100;
  const ELEVEN = [
    ['gagamaru', 150, 360, 'GAGAMARU', 'GOLEIRO', 24, 'GAH.'],
    ['aryu', 330, 265, 'ARYU', 'ZAGUEIRO', 56, 'OSHAAA~'],
    ['niko', 330, 455, 'NIKO', 'ZAGUEIRO', 84, '...certo.'],
    ['bachira', 520, 198, 'BACHIRA', 'LATERAL', 150, 'HEHE!'],
    ['chigiri', 520, 522, 'CHIGIRI', 'LATERAL', 178, 'BORA.'],
    ['karasu', 530, 360, 'KARASU', 'VOLANTE', 210, 'TSC. BELEZA.'],
    ['otoya', 735, 248, 'OTOYA', 'ATAQUE', 334, 'MODO NINJA.'],
    ['yukimiya', 735, 472, 'YUKIMIYA', 'ATAQUE', 362, 'TÔ PRONTO.'],
    ['nagi', 935, 198, 'NAGI', 'LINHA DE FRENTE', 430, 'ZZZ...'],
    ['rin', 935, 522, 'RIN', 'LINHA DE FRENTE', 506, '...'],
    ['you', 1050, 360, null, 'CENTRO DO ATAQUE', 750, '']
  ];
  const LINKS = [[0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 5], [5, 6], [5, 7], [3, 6], [4, 7], [6, 8], [7, 9], [6, 10], [7, 10], [8, 10], [9, 10]];
  const YOU_AT = 750;
  const tacFloorCv = () =>
    paint('tacfloor', 256, 128, (g, w, h) => {
      g.fillStyle = '#020a14';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(34,211,238,0.07)';
      for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1);
      // o campo (em pixels do canvas: 1 px = 1/16 de ladrilho; o canvas cobre 16 x 8)
      const P = (x, y) => [(BX(x) - (JX - 8)) * 16, (BY(y) - (JY - 4)) * 16];
      const [ax, ay] = P(60, 100);
      const [bx, by] = P(1220, 620);
      for (let i = 0; i < 10; i += 2) {
        g.fillStyle = 'rgba(13,148,136,0.12)';
        g.fillRect(ax + (i * (bx - ax)) / 10, ay, (bx - ax) / 10, by - ay);
      }
      g.strokeStyle = 'rgba(94,234,212,0.6)';
      g.lineWidth = 1;
      g.strokeRect(ax + 0.5, ay + 0.5, bx - ax, by - ay);
      const [cx, cy] = P(640, 360);
      line(g, [cx, ay], [cx, by]);
      g.beginPath();
      g.arc(cx, cy, 13, 0, TAU);
      g.stroke();
      [[ax, 1], [bx, -1]].forEach(([x, d]) => {
        g.strokeRect(Math.min(x, x + d * 27), cy - 22, 27, 44);
        g.strokeRect(Math.min(x, x + d * 10), cy - 10, 10, 20);
      });
    });
  // o painel tático que acende no plano 2-4: quem já está na lousa até o quadro global gt
  function tacBoard(K, gt, f, onlyYou = false) {
    K.sky('#01040a', '#03101a', 0.3);
    K.fog('#010409', 0.03);
    K.ambient('#9ad8e0');
    K.expo(1.0);
    K.floor({ x0: JX - 8, y0: JY - 4, x1: JX + 8, y1: JY + 4, img: tacFloorCv() });
    // a vaga do centro, esperando
    if (gt < YOU_AT + 8) {
      const p = 0.5 + 0.5 * Math.sin(gt * 0.15);
      K.floor({ x0: BX(1050) - 0.45, y0: BY(360) - 0.45, x1: BX(1050) + 0.45, y1: BY(360) + 0.45, z: 0.01, img: ringCv('#00f5d4', true), em: true, alpha: Math.min(0.95, 0.4 + 0.5 * p) });
    }
    ELEVEN.forEach(([id, x, y, , , at], i) => {
      const k = onlyYou && id !== 'you' ? 0 : seg(gt, at, at + (id === 'you' ? 10 : 14));
      if (k <= 0) return;
      const X0 = BX(x);
      const Y0 = BY(y);
      const ring = seg(gt, at + 8, at + 34);
      K.floor({ x0: X0 - 0.36, y0: Y0 - 0.36, x1: X0 + 0.36, y1: Y0 + 0.36, z: 0.012, img: ringCv(id === 'you' ? '#00f5d4' : '#22d3ee'), em: true, alpha: 0.9 });
      if (ring > 0 && ring < 1) K.floor({ x0: X0 - 0.36 - ring * 0.5, y0: Y0 - 0.36 - ring * 0.5, x1: X0 + 0.36 + ring * 0.5, y1: Y0 + 0.36 + ring * 0.5, z: 0.014, img: ringCv('#a5f3fc'), em: true, alpha: 0.9 * (1 - ring) });
      const ch = id === 'you' ? 'you' : id;
      K.actor(ch, { kit: 'blueLock', k: 0.86, x: X0, y: Y0, ang: Math.PI / 2, frame: id === 'you' ? f : 45, glow: k < 0.75, alpha: Math.min(1, k * 1.6), light: id === 'you' ? [0.9, 1.15, 1.15] : [0.72, 0.92, 0.98] });
    });
  }
  // o HUD da lousa (nomes, linhas de passe, balões) por cima do 3D
  function tacHud(ctx, S, K, gt) {
    const { W, top } = S;
    const name = CE.cinePlayerName();
    const P = (i) => K.screen(BX(ELEVEN[i][1]), 0, BY(ELEVEN[i][2]));
    // linhas de passe entre quem já está na lousa
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -gt * 0.6;
    ctx.lineWidth = 2;
    LINKS.forEach(([a, b]) => {
      const at = Math.max(ELEVEN[a][5], ELEVEN[b][5]);
      const k = seg(gt, at + 10, at + 30);
      if (k <= 0) return;
      const A = P(a);
      const B = P(b);
      if (!A || !B) return;
      ctx.strokeStyle = `rgba(94,234,212,${0.4 * k})`;
      line(ctx, [A.x, A.y], [lerp(A.x, B.x, k), lerp(A.y, B.y, k)]);
    });
    ctx.restore();
    if (gt < YOU_AT + 8) {
      const p = K.screen(BX(1050), 0.45, BY(360));
      if (p) CE.cineImpactText(ctx, '?', p.x, p.y, 70, '#5eead4', 1);
    }
    // as plaquinhas com nome e posição, embaixo de cada um
    ELEVEN.forEach(([id, x, y, nm, pos, at]) => {
      const k = seg(gt, at + 4, at + 18);
      if (k <= 0) return;
      const p = K.screen(BX(x), 0, BY(y) + 0.32);
      if (!p) return;
      const label = nm || name;
      const isYou = id === 'you';
      ctx.save();
      ctx.globalAlpha *= Math.min(1, k * 2);
      ctx.font = `italic 900 ${isYou ? 17 : 14}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = Math.max(ctx.measureText(label).width, 70) + 18;
      ctx.fillStyle = 'rgba(2,6,23,0.85)';
      ctx.fillRect(p.x - w / 2, p.y, w, 34);
      ctx.fillStyle = isYou ? '#00f5d4' : '#22d3ee';
      ctx.fillRect(p.x - w / 2, p.y, w, 3);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(label, p.x, p.y + 13);
      ctx.font = '800 9px "Segoe UI", sans-serif';
      ctx.fillStyle = isYou ? '#5eead4' : '#7dd3fc';
      ctx.fillText(pos, p.x, p.y + 27);
      ctx.restore();
    });
    // reações curtas
    ELEVEN.forEach(([, x, y, , , at, say]) => {
      if (!say) return;
      const k = seg(gt, at + 14, at + 24) * (1 - seg(gt, at + 88, at + 100));
      const p = K.screen(BX(x), 1.0, BY(y));
      if (p) CE.fedxBubble(ctx, p.x + 70, p.y - 10, say, k, '#0b1120', 17, -1);
    });
    // a faixa de cima
    CE.foxcGrad(ctx, 0, top, W, 44, [[0, 'rgba(1,8,16,0.92)'], [1, 'rgba(1,8,16,0)']]);
    CE.finPixelText(ctx, 'BLUE LOCK ELEVEN', 40, top + 18, 2.4, '#5eead4', 'left');
    CE.finPixelText(ctx, 'vs SUB-20 DO JAPÃO', W - 150, top + 18, 1.8, '#94a3b8', 'right');
    const n = ELEVEN.filter((e) => gt >= e[5]).length;
    CE.finPixelText(ctx, `${n}/11`, W - 40, top + 18, 2.4, n === 11 ? '#00f5d4' : '#e2e8f0', 'right');
    CE.finFillPat(ctx, 'scan', 0, top, W, S.bot - top, 0.25);
    ELEVEN.forEach((e, i) => CE.cineSfx(S, e[5] - (S.phase === 1 ? 0 : S.phase === 2 ? 310 : 610), 'carta' + i, () => window.SFX?.blip?.(380 + i * 30)));
  }
  // os jogadores no saguão, na frente do telão [quem, x, y]
  const CROWD = [
    ['gagamaru', 24.2, 10.7], ['aryu', 23.2, 10.8], ['niko', 26.6, 10.7], ['karasu', 27.6, 10.9], ['shidou', 29.6, 11.2],
    ['yukimiya', 22.4, 11.5], ['otoya', 28.6, 11.6], ['nagi', 24.0, 11.5], ['chigiri', 26.4, 11.5],
    ['bachira', 23.0, 12.3], ['you', 25.1, 12.3], ['rin', 27.2, 12.3]
  ];
  const egoTv = (o) => (g, w, h) => CE.finEgoScreen(g, 0, 0, w, h, CE.sakugaFrame || 0, o);

  CE.registerCine3D('bl_eleven', fixYaw({
    phases: [230, 310, 300, 260, 270, 280],
    music: 'u20',
    title: '📺 O BLUE LOCK ELEVEN',
    tags: ['PLANO 1 • O TELÃO', 'PLANO 2 • A DEFESA', 'PLANO 3 • O ATAQUE', 'PLANO 4 • O CENTRO', 'PLANO 5 • REAÇÕES', 'PLANO 6 • O SILÊNCIO'],
    get subs() {
      const nm = CE.cinePlayerName().toLowerCase().replace(/(^|\s)\S/g, (ch) => ch.toUpperCase());
      return [
        [{ from: 20, to: 228, who: 'EGO', text: '"Os onze que vão enfrentar a Sub-20."', color: EGO_C }],
        [
          { from: 16, to: 146, who: 'EGO', text: '"Gagamaru. Aryu. Niko."', color: EGO_C },
          { from: 146, to: 306, who: 'EGO', text: '"Bachira. Chigiri. Karasu."', color: EGO_C }
        ],
        [
          { from: 10, to: 184, who: 'EGO', text: '"Otoya. Yukimiya. Na frente: Nagi..."', color: EGO_C },
          { from: 186, to: 298, who: 'EGO', text: '"...e Rin Itoshi."', color: EGO_C }
        ],
        [
          { from: 6, to: 139, who: 'EGO', text: '"E no centro do ataque..."', color: EGO_C },
          { from: 140, to: 259, who: 'EGO', text: `"...${nm}."`, color: EGO_C }
        ],
        [
          { from: 6, to: 160, who: 'BACHIRA', text: '"Hahaha! Vai ser divertido!"', color: BACH_C },
          { from: 160, to: 268, who: 'NAGI', text: '"...Que saco."', color: NAGI_C }
        ],
        [
          { from: 10, to: 150, who: 'NARRADOR', text: 'Onze nomes. Faltava um.', color: NARR_C },
          { from: 152, to: 278, who: 'CHIGIRI', text: '"...Cadê o Shidou?"', color: CHI_C }
        ]
      ];
    },
    grain: 0,
    vignette: 0.6,
    theme: 'u20_national',
    scene(K, S) {
      const { t, phase, f } = S;
      const bl = { kit: 'blueLock', k: 0.86 };
      if (phase === 0) {
        // o telão: o Ego aparece; todos de costas, contra a luz
        const k = easeIO(t / 230);
        K.cam([25, lerp(0.62, 1.0, k), lerp(14.15, 14.4, k)], [25, lerp(0.85, 0.82, k), 9.0], lerp(46, 54, k));
        K.expo(0.8);
        screenQuad(K, 'egotv', 3, egoTv({}));
        CROWD.forEach(([id, x, y]) => K.actor(id, Object.assign({ x, y, ang: -Math.PI / 2, frame: 0, light: id === 'shidou' ? [0.4, 0.16, 0.3] : [0.16, 0.24, 0.3] }, bl)));
      } else if (phase === 1 || phase === 2) {
        // a lousa: a defesa (plano 2) e o ataque (plano 3), carta por carta
        const gt = phase === 1 ? t : 310 + t;
        const k = easeIO(t / (phase === 1 ? 310 : 300));
        const xc = phase === 1 ? lerp(BX(300), BX(560), k) : lerp(BX(560), BX(860), k);
        K.cam([xc, 2.1, JY + 4.6], [xc + 0.1, 0.1, JY - 0.4], 46);
        tacBoard(K, gt, f);
      } else if (phase === 3) {
        const hit = 140;
        const cut = 168;
        if (t < cut) {
          // a vaga do centro → a SUA carta
          const k = easeIO(seg(t, 0, hit));
          const sh = t >= hit ? 0.04 * (1 - seg(t, hit, hit + 22)) : 0;
          const X = BX(1050);
          const Y = BY(360);
          K.cam(K.mix([BX(860), 2.1, JY + 4.6], [X - 0.2, 0.62, Y + 2.0], k).map((v, i) => v + (i === 1 ? K.noise(t * 2, 2) * sh : K.noise(t * 2, 5 + i) * sh)), K.mix([BX(870), 0.1, JY - 0.4], [X, 0.45, Y], k), lerp(46, 40, k));
          tacBoard(K, 610 + t, f);
        } else {
          // o seu rosto: a aura sobe
          const u = t - cut;
          const k = easeIO(u / 92);
          const X = BX(1050);
          const Y = BY(360);
          K.cam([X - 0.75, 0.6, lerp(Y + 2.2, Y + 2.0, k)], [X - 0.95, 0.5, Y], 42);
          tacBoard(K, 610 + t, f, true);
          aura(K, 'you', X, Y, t, 0.6, ['#0e7490', '#22d3ee', '#a5f3fc']);
        }
      } else if (phase === 4) {
        // as reações: o Bachira rindo, o Nagi com preguiça, o Rin frio
        K.expo(0.85);
        screenQuad(K, 'egotv', 3, egoTv({}));
        const at = (id) => CROWD.find((c) => c[0] === id);
        const who = t < 150 ? 'bachira' : t < 200 ? 'nagi' : 'rin';
        const [, x, y] = at(who);
        const n = K.noise(t * 0.6, 2) * 0.01;
        K.cam([x + 0.3 + n, 0.6, y + 2.0], [x + 0.15, 0.5, y], 40);
        CROWD.forEach(([id, cx, cy]) => {
          const me = id === who;
          const bob = me && who === 'bachira' ? Math.abs(Math.sin(t * 0.4)) * 0.03 : 0;
          K.actor(id, Object.assign({ x: cx, y: cy, z: bob, ang: me ? Math.PI / 2 : -Math.PI / 2, frame: me ? f : 45, anim: me && who === 'bachira' ? 'celebrate' : 'idle', light: me ? [0.75, 1.0, 1.05] : [0.4, 0.55, 0.6] }, bl));
        });
      } else {
        // o silêncio: os onze de frente... e o Shidou, sozinho no escuro
        const k = easeIO(seg(t, 90, 280));
        K.expo(0.72);
        K.cam(K.mix([25.2, 0.95, 9.35], [27.4, 0.8, 9.5], k), K.mix([25.2, 0.55, 13.0], [29.9, 0.62, 12.8], k), lerp(56, 38, k));
        CROWD.forEach(([id, x, y]) => {
          if (id === 'shidou') return;
          K.actor(id, Object.assign({ x, y: y + 0.6, ang: -Math.PI / 2, frame: 45, light: [0.55, 0.85, 0.95] }, bl));
        });
        K.actor('shidou', Object.assign({ x: 30.5, y: 13.1, ang: -Math.PI / 2 - 0.5, frame: f, light: [0.22, 0.1, 0.17] }, bl));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = cast();
      if (phase === 0) {
        CE.cineDust(ctx, W, H, t, 30, 'rgba(165,243,252,0.4)', 12);
        CE.finKicker(ctx, 40, top + 30, 'BLUE LOCK • SALA DO TELÃO', seg(t, 8, 48));
        CE.finKicker(ctx, 40, top + 58, 'TERCEIRA SELEÇÃO • 08:00', seg(t, 36, 84), '#38bdf8');
      } else if (phase === 1 || phase === 2) {
        tacHud(ctx, S, K, phase === 1 ? t : 310 + t);
        if (phase === 1) {
          // entrada: a câmera atravessa a moldura do telão
          const z = 1 - ease(seg(t, 0, 20));
          if (z > 0) {
            ctx.save();
            ctx.globalAlpha = z;
            ctx.fillStyle = '#010205';
            const m = 200 * z;
            ctx.fillRect(0, 0, W, m + top);
            ctx.fillRect(0, bot - m, W, m + top);
            ctx.fillRect(0, 0, m * 1.6, H);
            ctx.fillRect(W - m * 1.6, 0, m * 1.6, H);
            ctx.restore();
          }
        }
      } else if (phase === 3) {
        const hit = 140;
        const cut = 168;
        const name = CE.cinePlayerName();
        if (t < cut) {
          tacHud(ctx, S, K, 610 + t);
          if (t >= hit) {
            const u = t - hit;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            CE.foxcRays(ctx, W / 2, (top + bot) / 2, 120, 900, 48, '#5eead4', 0.16 * (1 - seg(u, 6, 28)), u * 0.01, 0.03);
            ctx.restore();
            CE.cineFlash(ctx, W, H, 0.6 * (1 - seg(u, 0, 12)), '#ccfbf1');
          }
          CE.cineSfx(S, hit, 'voce', () => window.SFX?.kick?.(1));
        } else {
          const u = t - cut;
          if (u < 2) CE.cineFlash(ctx, W, H, 0.5, '#011014');
          CE.drawRadialSpeedLines(ctx, 860, 330, 1300, '#99f6e4', 0.12);
          const st = CE.rincStamp(ctx, name, 330, top + 210, 104, '#f8fafc', u, 4, 2, 560);
          if (st) {
            const lk = ease(seg(u, 4 + name.length * 2 + 4, 4 + name.length * 2 + 22));
            ctx.fillStyle = YOU_C;
            ctx.fillRect(330 - (st.w / 2) * lk, top + 210 + st.fs * 0.56, st.w * lk, 6);
          }
          CE.finKicker(ctx, 330, top + 320, 'ATACANTE • CENTRO DO ATAQUE', seg(u, 30, 70), YOU_C, 'center');
          CE.finKicker(ctx, 330, top + 352, 'BLUE LOCK ELEVEN • 11/11', seg(u, 46, 86), '#94a3b8', 'center');
        }
      } else if (phase === 4) {
        if (t < 150) CE.rincStamp(ctx, 'HAHAHA!', 330, top + 70, 56, '#fef08a', t, 10, 2, 460);
        else if (t < 200) CE.rincStamp(ctx, 'QUE SACO...', 330, top + 70, 40, '#e2e8f0', t, 160, 2, 360);
        else {
          // o Rin: só os olhos
          eyeStrip(ctx, S, top + 150, top + 360, seg(t, 200, 214), (ey) => {
            const U = CE.wcdEyeBand(ctx, c.rin, 640, ey, 1000, { dim: 0.25, dimTint: '0,20,24' });
            CE.wcdEyes(ctx, 640, ey, U, { ring: '#22d3ee', iris: '#0f766e', angry: true, line: '#010409' });
          });
          CE.rincStamp(ctx, '...', 1080, bot - 70, 40, '#a5f3fc', t, 222, 4);
        }
        if (t >= 150 && t < 152) CE.cineFlash(ctx, W, H, 0.4, '#000000');
        if (t >= 200 && t < 202) CE.cineFlash(ctx, W, H, 0.4, '#000000');
        CE.cineSfx(S, 150, 'nagi', () => window.SFX?.page?.());
        CE.cineSfx(S, 200, 'rin', () => window.SFX?.page?.());
      } else {
        // os olhos do Shidou acendendo no escuro
        const ek = seg(t, 150, 190);
        const p = K.screen(30.5, 0.46, 13.1);
        if (p && ek > 0) {
          [-1, 1].forEach((s) => {
            CE.cineGlow(ctx, p.x + s * 10, p.y, 26, 'rgba(236,72,153,0.85)', ek);
            ctx.fillStyle = `rgba(251,207,232,${ek})`;
            ctx.fillRect(Math.round(p.x + s * 10 - 5), Math.round(p.y - 2), 10, 4);
          });
        }
        CE.rincStamp(ctx, '. . . . . .', 560, top + 64, 48, '#cbd5e1', t, 40, 4);
        CE.finKicker(ctx, 40, top + 30, 'ONZE NOMES. NENHUM DELES: RYUSEI SHIDOU.', seg(t, 200, 270), SHIDOU_C);
        CE.cineSfx(S, 150, 'olhos', () => window.SFX?.blip?.(180));
      }
      warm(S, 'ele', [spr('you', {}), spr('rin', { dim: 0.25, dimTint: '0,20,24' })]);
      grain(ctx, S);
    }
  }));

  // ==========================================================================
  // 3. O CORTE DO SHIDOU
  // ==========================================================================
  const SHI = [25, 10.45]; // o Shidou na frente da lista
  CE.registerCine3D('shidou_cut', fixYaw({
    phases: [270, 280, 340, 320, 300],
    music: 'tension',
    title: '💣 O CORTE DO SHIDOU',
    tags: ['PLANO 1 • FORA DA LISTA', 'PLANO 2 • UM RISCO', 'PLANO 3 • A CONDIÇÃO', 'PLANO 4 • O INIMIGO', 'PLANO 5 • IRMÃOS'],
    subs: [
      [
        { from: 4, to: 128, who: 'SHIDOU', text: '"Hah?! Eu tô fora?!"', color: SHIDOU_C },
        { from: 130, to: 268, who: 'SHIDOU', text: '"Isso é piada, né, Ego?"', color: SHIDOU_C }
      ],
      [
        { from: 10, to: 144, who: 'EGO', text: '"Você não joga com o Rin."', color: EGO_C },
        { from: 146, to: 278, who: 'EGO', text: '"Você é um risco. Fora."', color: EGO_C }
      ],
      [
        { from: 14, to: 185, who: 'SAE ITOSHI', text: '"Eu jogo. Com uma condição..."', color: SAE_C },
        { from: 186, to: 340, who: 'SAE ITOSHI', text: '"...o Shidou vem comigo."', color: SAE_C }
      ],
      [
        { from: 14, to: 180, who: 'SHIDOU', text: '"Vou explodir vocês, Blue Lock!"', color: SHIDOU_C },
        { from: 182, to: 318, who: 'NARRADOR', text: 'Agora ele é o inimigo.', color: NARR_C }
      ],
      [
        { from: 50, to: 156, who: 'RIN ITOSHI', text: '"...Irmão."', color: RIN_C },
        { from: 160, to: 298, who: 'NARRADOR', text: 'Irmão contra irmão.', color: NARR_C }
      ]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'u20_national',
    scene(K, S) {
      const { t, phase, f } = S;
      const pink = ['#831843', '#ec4899', '#fbcfe8'];
      if (phase === 0) {
        // "Hah?! Eu tô fora?!": de baixo, na frente da lista
        const mad = t < 128;
        const sh = 0.008 + (t < 24 ? 0.05 * (1 - seg(t, 4, 24)) : 0) + (t > 128 && t < 150 ? 0.03 : 0);
        K.cam([SHI[0] + 0.25 + K.noise(t * 2, 1) * sh, 0.24 + K.noise(t * 2, 2) * sh, SHI[1] + 2.0], [SHI[0] + 0.1, 0.72, SHI[1]], 50);
        K.expo(0.78);
        screenQuad(K, 'list', 6, (g, w, h) => {
          CE.fedxListScreen(g, 0, 0, w, h, t);
          g.fillStyle = 'rgba(80,4,40,0.35)';
          g.fillRect(0, 0, w, h);
        });
        aura(K, 'shi0', SHI[0], SHI[1], t, 0.85, pink);
        K.actor('shidou', { kit: 'blueLock', k: 0.9, x: SHI[0], y: SHI[1], ang: Math.PI / 2, extra: mad ? { angry: true } : {}, anim: mad ? 'idle' : 'celebrate', frame: f, light: [1.1, 0.78, 0.98] });
      } else if (phase === 1) {
        // o Ego no telão, frio; o Shidou de costas na frente
        const k = easeIO(t / 150);
        K.cam([lerp(25.7, 25.5, k), lerp(0.5, 0.6, k), lerp(13.6, 12.8, k)], [25.0, lerp(0.95, 1.0, k), 9.0], lerp(54, 46, k));
        K.expo(0.8);
        screenQuad(K, 'egoclose', 3, (g, w, h) => {
          CE.finEgoScreen(g, 0, 0, w, h, t, { size: h * 2.3, fy: 0.36 });
          const eu = (h * 2.3) / 36;
          const etop = h * 0.36 - SPRITE_MAPY(10.1) * eu;
          g.save();
          g.beginPath();
          g.rect(0, 0, w, h);
          g.clip();
          CE.fedxGlare(g, w / 2, etop, eu, 0.9 * (1 - seg(t, 60, 80)) + 0.9 * seg(t, 140, 150));
          g.restore();
        });
        K.actor('shidou', { kit: 'blueLock', k: 0.9, x: 25.85, y: 11.5, ang: -Math.PI / 2, light: [0.3, 0.13, 0.24] });
      } else if (phase === 2) {
        // a sala da Sub-20 (a sala da JFU no pôr do sol): o Sae em pé, frio no meio do calor
        const k = easeIO(t / 340);
        K.cam([lerp(JX + 0.65, JX + 0.75, k), 0.62, lerp(BR.y1 - 0.4, BR.y1 - 0.7, k)], [JX + 0.5, 0.56, JY - 1.4], 46);
        boardRoom(K, t, { warm: true });
        oldMen(K, t, { light: [0.62, 0.42, 0.3] });
        K.actor('sae', { kit: 'u20', k: 0.9, x: JX - 0.25, y: JY + 0.35, ang: Math.PI / 2, frame: f, light: [0.7, 0.86, 0.86] });
      } else if (phase === 3) {
        const cut = 160;
        if (t < cut) {
          // o túnel do estádio: ele sai de frente para vocês, o Sae e o Aiku encostados
          const k = easeIO(t / cut);
          const wk = easeIO(seg(t, 0, cut));
          const sx = lerp(42.6, 37.6, wk);
          K.cam([35.1, lerp(0.8, 0.7, k), 14.5], [43.5, 0.62, 14.5], lerp(52, 46, k));
          K.expo(0.85);
          aura(K, 'shi3', sx, 14.5, t, 0.6 * wk + 0.2, pink);
          K.actor('sae', { kit: 'u20', k: 0.88, x: 38.7, y: 13.32, ang: Math.PI / 2 + 0.6, frame: f, light: [0.5, 0.5, 0.62] });
          K.actor('aiku', { kit: 'u20', k: 0.9, x: 39.4, y: 15.66, ang: -Math.PI / 2 - 0.6, frame: f, light: [0.5, 0.5, 0.62] });
          K.actor('shidou', { kit: 'u20', k: 0.9, x: sx, y: 14.5, ang: Math.PI, anim: 'run', frame: WALKF(f, 6), view: 'front', light: [1.0, 0.82, 0.95] });
        } else {
          // o close: a camisa da Sub-20, o sorriso doido
          const u = t - cut;
          const k = easeIO(u / 160);
          const sh = 0.006 + (u < 20 ? 0.04 * (1 - seg(u, 0, 20)) : 0);
          K.cam([lerp(35.75, 35.95, k) + K.noise(u * 2, 1) * sh, 0.3 + K.noise(u * 2, 2) * sh, 14.62], [37.6, 0.62, 14.45], 46);
          K.expo(0.75);
          aura(K, 'shi3b', 37.6, 14.5, t, 1, pink);
          K.actor('shidou', { kit: 'u20', k: 0.9, x: 37.6, y: 14.5, ang: Math.PI, anim: 'celebrate', frame: f, light: [1.1, 0.8, 1.0] });
        }
      } else {
        const cut = 150;
        // o campo à noite: o Rin de costas olhando o irmão do outro lado
        const u = Math.max(0, t - cut);
        const k = easeIO(u / 150);
        if (t < cut) K.cam([53, 1.4, 21.5], [53, 0.6, 12], 50);
        else K.cam([lerp(50.25, 50.45, k), 0.62, lerp(18.0, 17.7, k)], [lerp(53.2, 53.5, k), 0.55, 10.4], lerp(44, 41, k));
        K.sky('#02040a', '#0b1426', 0.7);
        K.expo(t < cut ? 0.45 : 0.7);
        [['aiku', 53.0, 10.6], ['sae', 53.9, 10.4], ['shidou', 54.8, 10.6]].forEach(([id, x, y]) => K.actor(id, { kit: 'u20', k: 0.9, x, y, ang: Math.PI / 2 + 0.25, frame: f, light: id === 'sae' ? [1.05, 0.8, 0.95] : [0.85, 0.78, 0.9] }));
        K.floor({ x0: 51.5, y0: 9.2, x1: 56.5, y1: 12.0, img: glowCv('rgba(244,114,182,0.25)'), em: true });
        K.floor({ x0: 48.5, y0: 15.0, x1: 52.5, y1: 18.0, img: glowCv('rgba(34,211,238,0.2)'), em: true });
        K.actor('rin', { kit: 'blueLock', k: 0.9, x: 50.15, y: 16.5, ang: -Math.PI / 2 + 0.45, light: [0.28, 0.48, 0.55] });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = cast();
      if (phase === 0) {
        CE.cineImpactText(ctx, 'HAAAH?!', 330, top + 96, 92, '#f9a8d4', seg(t, 6, 16) * (1 - seg(t, 118, 128)), 0, -0.1);
        ['HA', 'HAHA', 'HAHAHA!'].forEach((s, i) => CE.cineImpactText(ctx, s, [250, 1020, 990][i], [top + 120, top + 90, top + 220][i], [56, 64, 76][i], '#fbcfe8', seg(t, 136 + i * 16, 144 + i * 16), 0, [-0.15, 0.1, -0.06][i]));
        // painel: os olhos, pupila miudinha
        const kp = ease(seg(t, 52, 66)) * (1 - ease(seg(t, 116, 128)));
        if (kp > 0) {
          CE.finPanel(ctx, [[760, bot - 196], [W - 20, bot - 210], [W - 20, bot - 16], [740, bot - 16]], () => {
            ctx.fillStyle = '#14020c';
            ctx.fillRect(720, bot - 220, 560, 220);
            CE.drawRadialSpeedLines(ctx, 1010, bot - 110, 600, '#f9a8d4', 0.14);
            const ey = bot - 104;
            const U = CE.wcdEyeBand(ctx, c.shidouMad, 1010, ey, 700, {});
            CE.wcdEyes(ctx, 1010, ey, U, { ring: '#ec4899', iris: '#831843', tiny: true, angry: true, look: [0, 1, 0, -1][Math.floor(t / 2) % 4] });
          }, { dx: (1 - kp) * 560 });
        }
        if (t >= 6) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, 6, 16)), '#fbcfe8');
        CE.cineSfx(S, 6, 'hah', () => window.SFX?.tackle?.());
        CE.cineSfx(S, 136, 'risada', () => window.SFX?.blip?.(260));
      } else if (phase === 1) {
        // o diagrama: Shidou x Rin
        const kd = ease(seg(t, 150, 166));
        if (kd > 0) {
          ctx.save();
          ctx.globalAlpha = kd;
          CE.foxcGrad(ctx, 0, top + 160, W, bot - top - 160, [[0, 'rgba(2,6,12,0)'], [0.3, 'rgba(2,6,12,0.85)'], [1, 'rgba(2,6,12,0.95)']]);
          ctx.restore();
          CE.fedxCard(ctx, c.shidou, 470, 450, kd, 'SHIDOU', 'ATACANTE', { w: 150 });
          CE.fedxCard(ctx, c.rin, 810, 450, kd, 'RIN', 'ATACANTE', { w: 150 });
          const zk = seg(t, 172, 184);
          if (zk > 0) {
            ctx.save();
            ctx.strokeStyle = '#020617';
            ctx.lineWidth = 14;
            const zz = [[600, 390], [652, 430], [628, 450], [680, 510]];
            ctx.beginPath();
            zz.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
            ctx.globalAlpha = zk;
            ctx.stroke();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 7;
            ctx.stroke();
            ctx.restore();
            CE.cineImpactText(ctx, 'NÃO JOGAM JUNTOS', 640, top + 214, 34, '#fca5a5', zk, 600);
          }
          CE.fedxStampMark(ctx, 470, 470, 'FORA', -0.2, seg(t, 214, 220), '#dc2626', 50);
        }
        CE.cineSfx(S, 172, 'raio', () => window.SFX?.tackle?.());
        CE.cineSfx(S, 214, 'fora', () => window.SFX?.kick?.(0.9));
      } else if (phase === 2) {
        // painel: os olhos do Sae
        const kE = ease(seg(t, 96, 110)) * (1 - ease(seg(t, 182, 194)));
        if (kE > 0) {
          CE.finPanel(ctx, [[640, top + 16], [W - 18, top + 16], [W - 18, 300], [620, 310]], () => {
            ctx.fillStyle = '#04100f';
            ctx.fillRect(600, top, 700, 240);
            const ey = 214;
            const U = CE.wcdEyeBand(ctx, c.sae, 960, ey, 760, {});
            CE.wcdEyes(ctx, 960, ey, U, { ring: '#5eead4', iris: '#0f766e', half: true, lid: CE.finShade(c.sae.skinColor, -0.2) });
            CE.rincStamp(ctx, 'COM UMA CONDIÇÃO...', 960, 290, 30, '#ccfbf1', t, 112, 2, 560);
          }, { dx: (1 - kE) * 700 });
        }
        // painel: a ficha do Shidou na mesa → carimbo SUB-20
        const kF = ease(seg(t, 196, 212));
        if (kF > 0) {
          CE.finPanel(ctx, [[660, top + 20], [W - 18, top + 30], [W - 18, bot - 18], [640, bot - 30]], () => {
            const hit = 262;
            const sh = t >= hit ? CE.cineNoise(S.f * 2.1, 6) * 6 * (1 - seg(t, hit, hit + 18)) : 0;
            ctx.save();
            ctx.translate(sh, sh * 0.4);
            CE.cineGradient(ctx, 620, top, 680, bot - top, [[0, '#3a2414'], [1, '#160d06']]);
            CE.cineGlow(ctx, 960, top + 120, 300, 'rgba(253,186,116,0.25)');
            CE.fedxPaper(ctx, 960, (top + bot) / 2, 400, 410, -0.04, 'CONVOCAÇÃO • SUB-20', [null, null, 'ATACANTE • 99', 'RYUSEI SHIDOU', null], {
              titleSize: 22,
              extra: (g, w, h) => {
                g.fillStyle = '#cbd5e1';
                g.fillRect(w / 2 - 152, -h / 2 + 100, 132, 132);
                g.fillStyle = '#3b0a24';
                g.fillRect(w / 2 - 148, -h / 2 + 104, 124, 124);
                CE.finCrop(g, c.shidou, {}, 9, -4, 18, 18, w / 2 - 148, -h / 2 + 104, 124, 124);
              }
            });
            CE.fedxStampMark(ctx, 930, bot - 110, 'SUB-20', -0.14, seg(t, hit, hit + 6), '#1d4ed8', 50);
            CE.fedxStamper(ctx, 930, bot - 110, t, hit, 0.9);
            ctx.restore();
            if (t >= hit) CE.cineFlash(ctx, W, H, 0.3 * (1 - seg(t, hit, hit + 10)), '#dbeafe');
          }, { dx: (1 - kF) * 700 });
        }
        CE.finKicker(ctx, 40, top + 30, 'SEDE DA JFU • SALA DA SUB-20', seg(t, 6, 46), '#fb923c');
        CE.finKicker(ctx, 40, top + 58, 'SAE ITOSHI • VOLTOU DA ESPANHA', seg(t, 30, 78), SAE_C);
        CE.cineSfx(S, 262, 'sub20', () => window.SFX?.tackle?.());
      } else if (phase === 3) {
        const cut = 160;
        if (t < cut) {
          CE.finKicker(ctx, 40, top + 30, 'DIAS DEPOIS • TÚNEL DO ESTÁDIO NACIONAL', seg(t, 10, 50), '#f472b6');
          CE.finKicker(ctx, 40, top + 58, 'SUB-20 DO JAPÃO', seg(t, 36, 84), '#e2e8f0');
        } else {
          const u = t - cut;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          CE.foxcRays(ctx, 640, 330, 100, 900, 56, '#f9a8d4', 0.06, u * 0.004, 0.03);
          ctx.restore();
          CE.cineImpactText(ctx, 'INIMIGO.', 1030, bot - 90, 84, '#f472b6', seg(u, 90, 100), 420, -0.05);
          CE.rincStamp(ctx, 'SUB-20', 230, top + 80, 64, '#f8fafc', u, 10, 3);
          if (u >= 0) CE.cineFlash(ctx, W, H, 0.4 * (1 - seg(u, 0, 10)), '#fbcfe8');
          if (u >= 90) CE.cineFlash(ctx, W, H, 0.25 * (1 - seg(u, 90, 100)), '#fbcfe8');
          CE.cineSfx(S, cut, 'close', () => window.SFX?.kick?.(1));
          CE.cineSfx(S, cut + 90, 'inimigo', () => window.SFX?.tackle?.());
        }
      } else {
        const cut = 150;
        if (t < cut) {
          // os olhos do Rin (em cima) e os do Sae (embaixo)
          const mid = (top + bot) / 2;
          ctx.fillStyle = 'rgba(2,5,7,0.75)';
          ctx.fillRect(0, top, W, bot - top);
          const kA = ease(seg(t, 0, 16));
          CE.finPanel(ctx, [[16, top + 14], [W - 16, top + 14], [W - 16, mid - 10], [16, mid + 4]], () => {
            CE.cineGradient(ctx, 0, top, W, mid - top, [[0, '#021a1f'], [1, '#01090c']]);
            const ey = top + 140;
            const U = CE.wcdEyeBand(ctx, c.rin, 640, ey, 1260, { dim: 0.2, dimTint: '0,24,30' });
            CE.wcdEyes(ctx, 640, ey, U, { ring: '#22d3ee', iris: '#0f766e', angry: true, look: 1, line: '#010409' });
            CE.finKicker(ctx, 40, top + 40, 'RIN ITOSHI • BLUE LOCK', seg(t, 10, 40), RIN_C);
          }, { dx: (1 - kA) * -W });
          const kB = ease(seg(t, 40, 56));
          if (kB > 0) {
            CE.finPanel(ctx, [[16, mid + 18], [W - 16, mid + 4], [W - 16, bot - 14], [16, bot - 14]], () => {
              CE.cineGradient(ctx, 0, mid, W, bot - mid, [[0, '#1f0a14'], [1, '#0b0408']]);
              const ey = mid + 136;
              const U = CE.wcdEyeBand(ctx, c.sae, 640, ey, 1260, { dim: 0.15, dimTint: '30,6,16' });
              CE.wcdEyes(ctx, 640, ey, U, { ring: '#5eead4', iris: '#0f766e', half: true, lid: CE.finShade(c.sae.skinColor, -0.2), look: -1 });
              CE.finKicker(ctx, W - 40, bot - 40, 'SAE ITOSHI • SUB-20', seg(t, 50, 80), SAE_C, 'right');
            }, { dx: (1 - kB) * W });
          }
        } else {
          const u = t - cut;
          if (u < 2) CE.cineFlash(ctx, W, H, 0.5, '#000000');
          const tk = seg(u, 64, 100);
          if (tk > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, tk * 2);
            CE.foxcGrad(ctx, 0, bot - 220, W, 220, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.85)']]);
            ctx.restore();
          }
          CE.cineTitleCard(ctx, W, bot - 96, tk, { kicker: 'BLUE LOCK x SUB-20', title: 'IRMÃO CONTRA IRMÃO', sub: '', color: RIN_C });
          CE.cineSfx(S, cut + 64, 'titulo', () => window.SFX?.kick?.(0.8));
        }
      }
      warm(S, 'cut', [
        function () {
          this.fedxBustEntry(this.fedxCast().shidouMad, {});
        },
        spr('shidou', {}),
        spr('rin', {}),
        spr('sae', {}),
        spr('rin', { dim: 0.2, dimTint: '0,24,30' }),
        spr('sae', { dim: 0.15, dimTint: '30,6,16' })
      ]);
      grain(ctx, S);
    }
  }));
})();
