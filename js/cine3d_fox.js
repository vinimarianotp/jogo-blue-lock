// ============================================================================
// CUTSCENES EM 3D — o treino do Fox, o monstro, o desafio do Rin, os títulos,
// os créditos e a abertura da Copa (js/cine_fox.js refeito no 3D)
// Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D; os textos
// grandes da imagem 2D (contadores, letreiros, placar, cartelas) ficam no overlay.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;

  const FOX_COLOR = '#f59e0b';
  const RIN_COLOR = '#22d3ee';
  const YOU_COLOR = '#00f5d4';
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const easeIO = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const hash = (i, s = 0) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  // entrada com um leve "passa e volta"
  const back = (x) => {
    x = clamp(x);
    const c1 = 1.70158;
    return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  };
  // batida que acende e decai (coração, flash, soco de câmera)
  const pulse = (t, at, len = 18) => (t < at || t > at + len ? 0 : Math.pow(1 - (t - at) / len, 2));

  // ---------------------------------------------------------------- ajudantes
  // 1 unidade da pixel art do boneco em ladrilhos (boneco com k = 1: 72 px / 66 px por ladrilho / 36)
  const SPU = 72 / 66 / 36;
  // o olho fica 20,4 unidades acima do chão (olho em 12,6; o chão da placa do boneco fica em 33)
  const EYE_U = 20.4;
  const eyeZ = (z, k = 0.9) => z + EYE_U * SPU * k;
  // o olho de um boneco na tela: { x, y, u } (u = 1 unidade da pixel art em px)
  function eyeAt(K, x, y, z = 0, k = 0.9) {
    const h = eyeZ(z, k);
    const a = K.screen(x, h, y);
    const b = K.screen(x, h + 0.5, y);
    if (!a || !b) return null;
    return { x: a.x, y: a.y, u: ((a.y - b.y) / 0.5) * SPU * k };
  }
  // a mão do boneco parado (lado direito da tela), a partir do olho
  const handAt = (e) => (e ? { x: e.x + 7 * e.u, y: e.y + 10 * e.u } : null);
  // Registro das cenas deste arquivo. O motor vira os bonecos (placas em pé) para o ângulo
  // da câmera do MAPA (Hub.camA), não para a câmera da cena: com a câmera da cena olhando
  // para outro lado (leste, oeste...) eles apareciam de lado, fininhos. Aqui o ângulo do mapa
  // acompanha a câmera da cena só durante o desenho do quadro e volta no overlay.
  function reg3d(type, def) {
    const scene = def.scene;
    const overlay = def.overlay;
    let camA0 = null;
    def.scene = function (K, S) {
      scene.call(this, K, S);
      const Hb = window.Hub;
      const e = K.c.eye;
      const l = K.c.look;
      const dx = l[0] - e[0];
      const dy = l[2] - e[2];
      if (!Hb || Math.hypot(dx, dy) < 1e-3) return;
      if (camA0 === null) camA0 = Hb.camA;
      Hb.camA = Math.atan2(dy, dx);
    };
    def.overlay = function (ctx, S, K) {
      if (camA0 !== null && window.Hub) window.Hub.camA = camA0;
      camA0 = null;
      if (overlay) overlay.call(this, ctx, S, K);
    };
    CE.registerCine3D(type, def);
  }
  // canvas pronto (montado uma vez só)
  function mkCanvas(w, h, draw) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    draw(g, w, h);
    return cv;
  }
  const once = (fn) => {
    let v = null;
    return () => v || (v = fn());
  };
  // geometria pronta: lista de quadrados (mesmo formato do kit)
  const Q = (v, a, b, c, d, n) => {
    const P = (p, u, w) => v.push(p[0], p[1], p[2], u, w, n[0], n[1], n[2]);
    P(a, 0, 0);
    P(b, 1, 0);
    P(c, 1, 1);
    P(a, 0, 0);
    P(c, 1, 1);
    P(d, 0, 1);
  };
  // placa em pé sempre virada para a câmera (brilhos e cones de luz suaves); a placa do kit
  // fica legível (sem espelhar) vista do lado oposto ao ângulo dela: por isso o + 180°
  function faceCam(K, o) {
    const e = K.c.eye;
    K.quad(Object.assign({ ang: Math.atan2(e[2] - o.y, e[0] - o.x) + Math.PI }, o));
  }
  // para o boneco olhar para a câmera
  const cam2 = (K) => [K.c.eye[0], K.c.eye[2]];
  // degradê redondo (brilho, poça de luz)
  const GLOWS = new Map();
  function glowCv(rgb) {
    let cv = GLOWS.get(rgb);
    if (!cv) {
      cv = mkCanvas(128, 128, (g) => {
        const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, `rgba(${rgb},1)`);
        gr.addColorStop(0.35, `rgba(${rgb},0.45)`);
        gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr;
        g.fillRect(0, 0, 128, 128);
      });
      GLOWS.set(rgb, cv);
    }
    return cv;
  }
  // cone de luz de poste (estreito em cima, largo embaixo)
  const coneCv = once(() =>
    mkCanvas(128, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, 'rgba(219,234,254,0.55)');
      gr.addColorStop(1, 'rgba(219,234,254,0.02)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(54, 0);
      g.lineTo(74, 0);
      g.lineTo(128, 256);
      g.lineTo(0, 256);
      g.closePath();
      g.fill();
    })
  );
  // cidade em silhueta com janelas acesas (cenário pintado lá no fundo)
  const CITY = new Map();
  function cityCv(win, glow) {
    const key = win + glow;
    let cv = CITY.get(key);
    if (cv) return cv;
    cv = mkCanvas(640, 160, (g, w, h) => {
      const gr = g.createLinearGradient(0, 40, 0, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, glow);
      g.fillStyle = gr;
      g.fillRect(0, 40, w, h - 40);
      let x = 0;
      let i = 0;
      while (x < w) {
        const r = hash(i, 5);
        const bw = 14 + r * 30;
        const bh = h * (0.3 + hash(i, 6) * 0.6);
        g.fillStyle = '#060a16';
        g.fillRect(x, h - bh, bw, bh);
        for (let wy = h - bh + 4; wy < h - 3; wy += 6) {
          for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
            if (hash(wx * 3 + wy, 9) < 0.3) {
              g.fillStyle = win;
              g.fillRect(wx, wy, 2, 3);
            }
          }
        }
        x += bw + 1;
        i++;
      }
    });
    CITY.set(key, cv);
    return cv;
  }
  // cronômetro balançando pendurado no dedo (ponta do dedo em px, py; s = escala)
  function stopwatch(ctx, px, py, s, t) {
    const ang = Math.sin(t * 0.09) * 0.55;
    const L = 108 * s;
    const wx = px + Math.sin(ang) * L;
    const wy = py + Math.cos(ang) * L;
    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = Math.max(1.5, 3 * s);
    ctx.setLineDash([6 * s, 4 * s]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(wx, wy - 60 * s);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(wx, wy);
    ctx.rotate(-ang * 0.6);
    ctx.scale(s, s);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-9, -72, 18, 16);
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0f1a';
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 42, Math.sin(a) * 42);
      ctx.lineTo(Math.cos(a) * 48, Math.sin(a) * 48);
      ctx.stroke();
    }
    const secs = 37 + Math.floor(t / 6);
    const ha = (Math.floor(t / 6) / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ha) * 40, Math.sin(ha) * 40);
    ctx.stroke();
    CE.foxcText(ctx, `04:12:${String(secs % 60).padStart(2, '0')}`, 0, 22, '800 13px "Consolas", monospace', '#fca5a5');
    ctx.restore();
  }
  // vapor do fôlego saindo da boca (olho em e)
  function breath(ctx, e, t, n, dir = 1, a0 = 0.32) {
    if (!e) return;
    const mx = e.x + dir * 2 * e.u;
    const my = e.y + 3.5 * e.u;
    const k = e.u / 10;
    for (let i = 0; i < n; i++) {
      const age = (t + i * 11) % 66;
      ctx.fillStyle = `rgba(203,213,225,${a0 * (1 - age / 66)})`;
      ctx.beginPath();
      ctx.arc(mx + dir * age * 0.9 * k, my - age * 0.35 * k, (3 + age * 0.22) * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // anéis do coração batendo
  function heartRings(ctx, x, y, t, beats, r0, grow, color = '239,68,68', len = 40) {
    beats.forEach((b) => {
      const a = t - b;
      if (a < 0 || a > len) return;
      ctx.strokeStyle = `rgba(${color},${0.7 * (1 - a / len)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, r0 + a * grow, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  // o olho em close numa faixa de mangá atravessando a tela (o resto continua 3D);
  // o = { y, h, k (0..1 abrindo), face (opções do foxcFaceBand) }
  function eyeBand(ctx, S, char, o) {
    const { W } = S;
    const { y, h, k } = o;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y + (h / 2) * (1 - k), W, h * k);
    ctx.clip();
    CE.foxcFaceBand(ctx, -40, y, W + 80, h, char, Object.assign({ fringe: y + h * 0.2 }, o.face));
    ctx.restore();
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, y + (h / 2) * (1 - k) - 4, W, 4);
    ctx.fillRect(0, y + (h / 2) * (1 + k), W, 4);
  }
  // corrente passando pelo ponto (x, y) da tela, inclinada em ang, de um lado ao outro
  function chainThrough(ctx, S, x, y, ang, o) {
    const L = S.W * 1.6;
    CE.foxcChain(ctx, x - Math.cos(ang) * L, y - Math.sin(ang) * L, x + Math.cos(ang) * L, y + Math.sin(ang) * L, o);
  }

  // ==========================================================================
  // 1) O TREINO DA RAPOSA — uma escadaria enorme fora do prédio, antes do sol
  // ==========================================================================
  // A escadaria sobe para o leste (x); o patamar lá em cima tem o poste e o muro
  const ST = { x0: 74, n: 34, run: 0.3, rise: 0.12, y0: 15.5, y1: 18.5 };
  ST.top = ST.n * ST.rise;
  ST.xTop = ST.x0 + ST.n * ST.run;
  const LAND = { x0: ST.xTop, x1: ST.xTop + 6.2, y0: 13.9, y1: 18.5 };
  const LAMP = [86.6, 14.4];
  const WALL_Y = 13.9;
  const stepX = (p) => ST.x0 + (p + 0.5) * ST.run;
  const stepZ = (p) => (Math.floor(p) + 1) * ST.rise;
  // degraus, espelhos, laterais e corrimão (montados uma vez)
  const stairGeo = once(() => {
    const tread = [];
    const riser = [];
    const side = [];
    const nose = [];
    const rail = [];
    const { x0, n, run, rise, y0, y1 } = ST;
    for (let i = 0; i < n; i++) {
      const xa = x0 + i * run;
      const xb = xa + run;
      const z = (i + 1) * rise;
      Q(tread, [xa, z, y0], [xb, z, y0], [xb, z, y1], [xa, z, y1], [0, 1, 0]);
      Q(riser, [xa, z, y1], [xa, z, y0], [xa, z - rise, y0], [xa, z - rise, y1], [-1, 0, 0]);
      Q(side, [xa, z, y1], [xb, z, y1], [xb, 0, y1], [xa, 0, y1], [0, 0, 1]);
      Q(side, [xb, z, y0], [xa, z, y0], [xa, 0, y0], [xb, 0, y0], [0, 0, -1]);
      // a quina do degrau (acesa pela luz lá de cima)
      Q(nose, [xa, z + 0.004, y0], [xa + 0.035, z + 0.004, y0], [xa + 0.035, z + 0.004, y1], [xa, z + 0.004, y1], [0, 1, 0]);
      // postes do corrimão a cada 3 degraus
      if (i % 3 === 0) {
        const px = xa + run / 2;
        const py = y0 + 0.12;
        Q(rail, [px - 0.02, z + 0.78, py], [px + 0.02, z + 0.78, py], [px + 0.02, z, py], [px - 0.02, z, py], [0, 0, 1]);
      }
    }
    // a barra do corrimão: sobe junto com a escada e segue pelo patamar
    const ry = y0 + 0.12;
    const za = rise + 0.78;
    const zb = n * rise + 0.78;
    Q(rail, [x0, za + 0.05, ry], [ST.xTop, zb + 0.05, ry], [ST.xTop, zb, ry], [x0, za, ry], [0, 0, 1]);
    Q(rail, [ST.xTop, zb + 0.05, ry], [LAND.x1, zb + 0.05, ry], [LAND.x1, zb, ry], [ST.xTop, zb, ry], [0, 0, 1]);
    return { tread, riser, side, nose, rail };
  });
  // concreto com juntas (muro e laterais do patamar)
  const wallCv = once(() =>
    mkCanvas(96, 32, (g, w, h) => {
      g.fillStyle = '#9aa3b5';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(15,23,42,0.35)';
      for (let x = 0; x < w; x += 24) g.fillRect(x, 0, 1, h);
      g.fillRect(0, 12, w, 1);
      g.fillStyle = 'rgba(15,23,42,0.18)';
      for (let x = 3; x < w; x += 24) {
        g.fillRect(x, 15, 1, 1);
        g.fillRect(x + 18, 15, 1, 1);
      }
    })
  );
  // o cenário inteiro da escadaria. o = { dawn 0..1, lamp 0..1, red 0..1 }
  function stairSet(K, o = {}) {
    const g = stairGeo();
    const dawn = o.dawn || 0;
    const red = o.red || 0;
    const tint = (c1, c2, c3) => (red > 0.5 ? c3 : dawn > 0.5 ? c2 : c1);
    // chão lá embaixo (praça escura) e a cidade no vale, pintada bem longe
    K.floor({ x0: 58, y0: 4, x1: 104, y1: 34, color: tint('#0b1120', '#1a1a2a', '#120606') });
    // (a oeste, um morro com a cidade esconde o prédio do Blue Lock)
    K.quad({ x: 64.5, y: 17, z: -6, w: 70, h: 20, ang: 0, img: cityCv('rgba(56,189,248,0.5)', 'rgba(30,27,75,0.6)'), em: true, color: '#8090b0' });
    K.quad({ x: 84, y: -6, z: -6, w: 92, h: 13, ang: Math.PI / 2, img: cityCv(dawn > 0.5 ? 'rgba(253,186,116,0.7)' : 'rgba(56,189,248,0.75)', dawn > 0.5 ? 'rgba(251,146,60,0.55)' : 'rgba(127,29,29,0.45)'), em: true, alpha: 0.95 });
    // escada
    K._push(g.side, { color: tint('#27334d', '#4a3a42', '#240c0c'), img: wallCv() });
    K._push(g.riser, { color: tint('#151d2e', '#2a2230', '#140606') });
    K._push(g.tread, { color: tint('#3b4a63', '#6b5a5a', '#3a1212') });
    K._push(g.nose, { color: tint('#94a3b8', '#fdba74', '#ef4444'), em: true, alpha: 0.55 });
    K._push(g.rail, { color: '#334155' });
    // patamar e o muro de concreto do alto
    K.box({ x0: LAND.x0, y0: LAND.y0, x1: LAND.x1, y1: LAND.y1, z0: 0, z1: ST.top, color: tint('#1e293b', '#3b2f3a', '#1c0a0a'), top: tint('#3b4a63', '#7c6560', '#3a1212') });
    K.box({ x0: LAND.x0, y0: WALL_Y - 0.35, x1: LAND.x1, y1: WALL_Y, z0: ST.top, z1: ST.top + 1.7, img: wallCv(), color: tint('#4b5876', '#e8a477', '#5a1a1a') });
    // poste com refletor e o cone de luz
    if (o.lamp !== 0) {
      const [lx, ly] = LAMP;
      const z0 = ST.top;
      K.box({ x0: lx - 0.06, y0: ly - 0.06, x1: lx + 0.06, y1: ly + 0.06, z0, z1: z0 + 2.3, color: '#0f172a' });
      K.box({ x0: lx - 0.95, y0: ly - 0.04, x1: lx + 0.06, y1: ly + 0.04, z0: z0 + 2.22, z1: z0 + 2.3, color: '#0f172a' });
      K.box({ x0: lx - 1.0, y0: ly - 0.1, x1: lx - 0.6, y1: ly + 0.1, z0: z0 + 2.1, z1: z0 + 2.22, color: '#dbeafe', em: true });
      const lk = o.lamp ?? 1;
      K.floor({ x0: lx - 2.0, y0: ly - 0.6, x1: lx + 0.4, y1: ly + 3.0, z: z0 + 0.012, img: glowCv('219,234,254'), em: true, alpha: 0.35 * lk });
      faceCam(K, { x: lx - 0.8, y: ly + 0.1, z: z0, w: 2.4, h: 2.1, img: coneCv(), em: true, alpha: 0.5 * lk });
    }
  }
  const FOX_AT = [85.5, 16.4];
  const foxCd = () => CE.foxcFox();

  reg3d('fox_training', {
    phases: [180, 170, 190, 170, 150],
    music: 'dread',
    title: '🦊 O TREINO DA RAPOSA',
    tags: ['PLANO 1 • 04:00, A ESCADARIA', 'PLANO 2 • O CORPO DESISTE', 'PLANO 3 • A RAPOSA', 'PLANO 4 • A SOMBRA', 'PLANO 5 • DEIXA ELE SAIR'],
    subs: [
      [{ from: 10, who: 'FOX', text: '"De novo! Quem para, eu substituo!"', color: FOX_COLOR }],
      [{ from: 8, who: 'FOX', text: '"O corpo desistiu. Agora começa."', color: FOX_COLOR }],
      [{ from: 12, who: 'FOX', text: '"O Ego pôs uma coleira no seu monstro."', color: FOX_COLOR }],
      [{ from: 8, who: 'FOX', text: '"Hehe... Tá ouvindo ele arranhar?"', color: FOX_COLOR }],
      [{ from: 0, who: 'FOX', text: '"Ainda não. Falta perder mais."', color: FOX_COLOR }]
    ],
    grain: 0,
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase } = S;
      const fox = foxCd();
      const sky = () => {
        K.sky('#01030b', '#16213f', 0.8);
        K.fog('#070b18', 0.03);
        K.ambient('#8a99c4');
        K.expo(0.95);
      };
      if (phase === 0) {
        // 04:00: você subindo a escadaria; a câmera abre do seu rosto até o Fox lá em cima
        sky();
        const p = 13 + (t / 180) * 10.5;
        const fr = p % 1;
        const yx = stepX(p);
        const yz = stepZ(p) + Math.sin(fr * Math.PI) * 0.05;
        const e = easeIO(seg(t, 25, 172));
        const sh = 0.03 * (1 - e);
        const eye0 = [yx + 1.6 + K.noise(S.f, 1) * sh, yz + 0.75 + K.noise(S.f, 2) * sh, 17.0 + 1.35];
        const look0 = [yx + 0.1, yz + 0.48, 17.0];
        K.cam(mix(eye0, [80.9, 4.75, 23.3], e), mix(look0, [83.1, 3.45, 16.3], e), lerp(36, 44, e));
        stairSet(K);
        K.actor('you', { x: yx, y: 17.0, z: yz, face: [yx + 1, 17.0], anim: 'run', frame: Math.floor(t * 1.1), light: [0.85, 0.9, 1.05] });
        K.actor(fox, { x: FOX_AT[0], y: FOX_AT[1], z: ST.top, face: cam2(K), light: [0.42, 0.48, 0.62] });
      } else if (phase === 1) {
        // o corpo desiste: você dobrado no degrau; a câmera desce para trás de você e
        // olha o Fox lá em cima, com o cronômetro balançando no dedo
        sky();
        const yx = stepX(30.4);
        const yz = stepZ(30.4);
        const e = easeIO(seg(t, 56, 104));
        const n = K.noise(S.f, 3) * 0.008;
        const eA = [yx + 1.55, yz + 0.72 + n, 17.0 + 1.35];
        const lA = [yx, yz + 0.42, 17.0];
        const eB = [yx - 0.75, yz + 0.28 + n, 17.55];
        const lB = [FOX_AT[0] - 0.3, ST.top + 0.7, FOX_AT[1]];
        K.cam(mix(eA, eB, e), mix(lA, lB, e), lerp(34, 40, e));
        stairSet(K);
        K.actor('you', { x: yx, y: 17.0, z: yz, face: [yx + 1, 17.4], anim: 'stun', frame: 0, light: [0.8, 0.86, 1.0] });
        K.actor(fox, { x: FOX_AT[0] - 0.3, y: FOX_AT[1], z: ST.top, face: cam2(K), light: [0.36, 0.4, 0.55] });
      } else if (phase === 2) {
        // close no Fox: o rosto some na sombra vermelha, ficam o sorriso e os olhos
        K.sky('#030206', '#2a0707', 0.3);
        K.fog('#0a0204', 0.03);
        K.ambient('#7a2a2a');
        K.expo(0.95);
        const fx = 86.4;
        const fy = 16.6;
        const k = easeIO(t / 190);
        const n = K.noise(S.f * 0.7, 4) * 0.006;
        K.cam([fx - 0.3 + n, ST.top + 0.4, fy + lerp(2.7, 2.4, k)], [fx + 0.5, ST.top + 0.5 + n, fy], 30);
        stairSet(K, { red: 1, lamp: 0 });
        K.actor(fox, { x: fx, y: fy, z: ST.top, face: cam2(K), light: [0.34, 0.1, 0.1] });
      } else if (phase === 3) {
        // amanhecer no alto da escada: a sua sombra cresce no muro, o Fox de costas na frente
        K.sky('#0e1630', '#f08a4b', 0.15);
        K.fog('#2a1f2e', 0.025);
        K.ambient('#e8b08c');
        K.expo(0.95);
        const beats = [24, 66, 104, 136, 162];
        const punch = beats.reduce((s, b) => s + pulse(t, b, 16), 0);
        const k = easeIO(t / 170);
        K.cam([85.3 + k * 0.4, ST.top + 0.8, 20.5 - k * 0.4], [86.2, ST.top + 1.0, 15.4], 46 - punch * 1.2);
        stairSet(K, { dawn: 1, lamp: 0 });
        const grow = 0.5 + ease(seg(t, 0, 130)) * 0.32 + punch * 0.03;
        K.actor('you', { id: 'sombra', x: 86.5, y: WALL_Y + 0.06, z: ST.top, ang: Math.PI / 2, frame: 0, k: grow * 3.8, alpha: 0.82, opts: { tint: '#05040e' } });
        K.actor('you', { x: 86.4, y: 16.3, z: ST.top, ang: Math.PI / 2, frame: 0, light: [1.0, 0.78, 0.62] });
        K.actor(fox, { x: 84.8, y: 17.8, z: ST.top, ang: -Math.PI / 2, frame: 0, k: 0.95, light: [0.26, 0.15, 0.12] });
      } else {
        // o seu olho em close: a íris fica vermelha, as correntes racham
        K.sky('#0a0206', '#3a0a0a', 0.1);
        K.fog('#12030a', 0.03);
        K.ambient('#b0505a');
        K.expo(0.9);
        const beats = [14, 50, 84, 112, 134];
        const punch = beats.reduce((s, b) => s + pulse(t, b, 14), 0);
        const yx = 86.4;
        const yy = 16.3;
        const n = punch * 0.01;
        K.cam([yx - 0.1 + K.noise(S.f, 5) * n, eyeZ(ST.top) + 0.05, yy + 2.5 - easeIO(t / 150) * 0.2], [yx, eyeZ(ST.top) - 0.1, yy], 32);
        stairSet(K, { red: 1, lamp: 0 });
        K.actor('you', { x: yx, y: yy, z: ST.top, ang: Math.PI / 2, frame: 0, light: t >= 40 ? [1.1, 0.5, 0.5] : [0.8, 0.7, 0.75] });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      if (phase === 0) {
        const p = 13 + (t / 180) * 10.5;
        const ye = eyeAt(K, stepX(p), 17.0, stepZ(p));
        breath(ctx, ye, t, 6, 1);
        // o giro do dedo do Fox e o brilho do refletor
        const fe = eyeAt(K, FOX_AT[0], FOX_AT[1], ST.top);
        const fh = handAt(fe);
        if (fh) CE.foxcTwirl(ctx, fh.x, fh.y - 4 * fe.u, Math.max(5, fe.u * 2.4), t);
        const lp = K.screen(LAMP[0] - 0.8, ST.top + 2.12, LAMP[1]);
        if (lp) CE.cineGlow(ctx, lp.x, lp.y, 60, 'rgba(219,234,254,0.9)');
        CE.cineDust(ctx, W, H, t, 22, 'rgba(219,234,254,0.4)', 5);
        // contador de degraus
        const k = ease(seg(t, 10, 30));
        const steps = Math.floor(lerp(231, 262, t / 180));
        CE.foxcText(ctx, 'DEGRAU', 64, top + 44, '900 14px "Segoe UI", sans-serif', '#93c5fd', k, 'left', true);
        CE.foxcWord(ctx, `${steps}`, 64, top + 100, 74, '#f8fafc', 1, k, 0, 0, 'left');
        ctx.font = 'italic 900 74px "Segoe UI", sans-serif';
        CE.foxcText(ctx, '/ 300', 64 + ctx.measureText(`${steps}`).width + 14, top + 112, 'italic 800 26px "Segoe UI", sans-serif', '#64748b', k, 'left');
        CE.foxcWord(ctx, '9ª SUBIDA', 150, top + 170, 36, '#ef4444', seg(t, 55, 68), 1, -0.08);
      } else if (phase === 1) {
        const yx = stepX(30.4);
        const yz = stepZ(30.4);
        const ye = eyeAt(K, yx, 17.0, yz);
        const e = easeIO(seg(t, 56, 104));
        if (ye && e < 0.6) {
          // suor e fôlego
          for (let i = 0; i < 7; i++) {
            const dy = ((t * (1.4 + hash(i) * 1.2) + hash(i, 2) * 200) % 260) * (ye.u / 12);
            const x = ye.x + (hash(i, 3) - 0.5) * 22 * ye.u;
            ctx.fillStyle = `rgba(191,219,254,${0.85 * (1 - e)})`;
            ctx.fillRect(x, ye.y - 6 * ye.u + dy, Math.max(2, ye.u * 0.5), Math.max(3, ye.u * 0.8));
          }
          breath(ctx, ye, t * 1.8, 4, 1, 0.35 * (1 - e));
        }
        CE.foxcWord(ctx, 'hah... hah...', W * 0.2, bot - 70, 30, '#e2e8f0', seg(t, 18, 30), 1 - seg(t, 70, 90), -0.05);
        // o cronômetro pendurado no dedo do Fox
        const fe = eyeAt(K, FOX_AT[0] - 0.3, FOX_AT[1], ST.top);
        const fh = handAt(fe);
        if (fh && e > 0.3) {
          ctx.save();
          ctx.globalAlpha = seg(e, 0.3, 0.7);
          stopwatch(ctx, fh.x, fh.y, Math.max(0.2, fe.u / 16), t);
          ctx.restore();
          CE.foxcWord(ctx, Math.floor(t / 30) % 2 ? 'TAC' : 'TIC', fh.x + 14 * fe.u, fh.y - 8 * fe.u, 30, '#f8fafc', seg(t, 96, 106), 0.8, -0.1);
          // os olhos acendendo na sombra
          const open = seg(t, 100, 112);
          if (open > 0 && fe) {
            [-1, 1].forEach((s) => CE.cineGlow(ctx, fe.x + s * 3 * fe.u, fe.y, fe.u * 1.6, 'rgba(255,255,255,0.95)', open));
            [-1, 1].forEach((s) => CE.cineGlow(ctx, fe.x + s * 3.3 * fe.u, fe.y, fe.u * 4, 'rgba(254,243,199,0.35)', open));
          }
        }
      } else if (phase === 2) {
        const fe = eyeAt(K, 86.4, 16.6, ST.top);
        if (fe) {
          CE.cineGlow(ctx, fe.x, fe.y - 4 * fe.u, 26 * fe.u, 'rgba(127,29,29,0.45)');
          const open = seg(t, 38, 50);
          if (open > 0) {
            [-1, 1].forEach((s) => CE.cineGlow(ctx, fe.x + s * 3 * fe.u, fe.y, fe.u * 1.4, 'rgba(255,255,255,0.95)', open));
            [-1, 1].forEach((s) => CE.cineGlow(ctx, fe.x + s * 3.3 * fe.u, fe.y, fe.u * 3.5, 'rgba(239,68,68,0.45)', open));
          }
          const fh = handAt(fe);
          CE.foxcTwirl(ctx, fh.x, fh.y - 3 * fe.u, Math.max(8, fe.u * 1.4), t);
        }
        const words = [
          { at: 20, text: 'MONSTRO', y: 0.32, s: 88, c: '#f8fafc' },
          { at: 82, text: 'COLEIRA', y: 0.5, s: 78, c: '#cbd5e1' },
          { at: 140, text: 'EU VIM TIRAR.', y: 0.68, s: 64, c: '#ef4444' }
        ];
        words.forEach((w, i) => {
          const next = words[i + 1];
          const dim = next && t > next.at ? 0.3 : 1;
          CE.foxcWord(ctx, w.text, W * 0.79, H * w.y, w.s, w.c, seg(t, w.at, w.at + 14), dim, -0.05, W * 0.38);
        });
      } else if (phase === 3) {
        const beats = [24, 66, 104, 136, 162];
        const punch = beats.reduce((s, b) => s + pulse(t, b, 16), 0);
        // os olhos vermelhos acendendo na sombra do muro
        const grow = 0.5 + ease(seg(t, 0, 130)) * 0.32 + punch * 0.03;
        const eo = seg(t, 96, 110);
        const se = eyeAt(K, 86.5, WALL_Y + 0.06, ST.top, grow * 3.8);
        if (eo > 0 && se) {
          CE.cineSpriteEyes(ctx, CE.cineYou(), se.x, se.y, se.u, { full: true, aura: '#ef4444', blink: eo < 0.5, frame: 0 });
          [-1, 1].forEach((s) => CE.cineGlow(ctx, se.x + s * 3.3 * se.u, se.y, se.u * 4, 'rgba(239,68,68,0.55)', eo));
        }
        // o coração e as correntes presas na sua cintura
        const ye = eyeAt(K, 86.4, 16.3, ST.top);
        if (ye) {
          heartRings(ctx, ye.x, ye.y + 9 * ye.u, t, beats, 2 * ye.u, ye.u * 0.9);
          const wy = ye.y + 15 * ye.u;
          chainThrough(ctx, S, ye.x, wy, 0.34, { t, vib: punch * 6, sag: 18, link: 40, thick: 10 });
          chainThrough(ctx, S, ye.x, wy, -0.3, { t: t + 3, vib: punch * 6, sag: 14, link: 40, thick: 10 });
        }
        const fe = eyeAt(K, 84.8, 17.8, ST.top, 0.95);
        const fh = handAt(fe);
        if (fh) CE.foxcTwirl(ctx, fh.x - 18 * fe.u, fh.y - 2 * fe.u, Math.max(8, fe.u * 1.6), t);
      } else {
        // o olho em close (faixa de mangá no meio da tela), vermelho, e as correntes rachando
        const you = CE.cineYou();
        const beats = [14, 50, 84, 112, 134];
        const punch = beats.reduce((s, b) => s + pulse(t, b, 14), 0);
        const red = t >= 40;
        const bh = (bot - top) * 0.44;
        const by = (top + bot) / 2 - bh / 2 - 20;
        const kIn = ease(seg(t, 0, 16));
        ctx.save();
        ctx.translate(CE.cineNoise(S.f, 2) * punch * 3, CE.cineNoise(S.f, 7) * punch * 3);
        eyeBand(ctx, S, you, {
          y: by,
          h: bh,
          k: kIn,
          face: { px: 12, eyes: [[W * 0.5, by + bh * 0.62]], faceX: W * 0.5 + 400, iris: red ? '#450a0a' : you.eyeColor || '#ef4444', ring: red ? '#ef4444' : '#fca5a5', brow: red ? 0.8 : 0.2, dim: 0.3, dimTint: '6,10,30' }
        });
        if (red) CE.cineGlow(ctx, W * 0.5, by + bh * 0.62, 200, 'rgba(239,68,68,0.45)', Math.min(1, (t - 40) / 10));
        ctx.restore();
        const crack = seg(t, 95, 104);
        CE.foxcChain(ctx, -80, H * 0.36, W + 80, H * 0.98, { t, vib: punch * 8, link: 56, thick: 14 });
        CE.foxcChain(ctx, -80, H * 0.98, W + 80, H * 0.36, { t: t + 5, vib: punch * 8, link: 56, thick: 14 });
        if (crack > 0) {
          ctx.strokeStyle = '#fef2f2';
          ctx.lineWidth = 3;
          ctx.beginPath();
          [[W * 0.36, H * 0.52], [W * 0.62, H * 0.58]].forEach(([cx, cy], kk) => {
            for (let i = 0; i < 5; i++) {
              const a = i * 1.3 + kk;
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx + Math.cos(a) * 40 * crack, cy + Math.sin(a) * 40 * crack);
            }
          });
          ctx.stroke();
        }
        CE.foxcGrad(ctx, 0, bot - 170, W, 170, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.85)']]);
        CE.foxcWord(ctx, '...DEIXA ELE SAIR.', W / 2, bot - 86, 70, '#ef4444', seg(t, 86, 100), 1, -0.02, W * 0.8);
        CE.foxcText(ctx, 'FICOU PRA TRÁS NO PLACAR? ELE VAI ACORDAR.', W / 2, bot - 30, '900 16px "Segoe UI", sans-serif', '#fecaca', seg(t, 112, 126), 'center', true);
      }
    }
  });

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
  // a sombra vermelha nas bordas (pronta uma vez)
  const redVig = once(() =>
    mkCanvas(320, 180, (g) => {
      const grd = g.createRadialGradient(160, 90, 50, 160, 90, 190);
      grd.addColorStop(0, 'rgba(127,0,0,0)');
      grd.addColorStop(1, 'rgba(127,0,0,0.95)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 320, 180);
    })
  );
  const monRise = (t) => ease(seg(t, 0, 26));
  const monY = (t) => 13.0 + t * 0.02;

  reg3d('monster_awaken', {
    phases: [75, 85, 120],
    music: 'epic',
    title: '👹 O MONSTRO',
    letterbox: 0.09,
    tags: ['PLANO 1 • TUM.', 'PLANO 2 • AS CORRENTES', 'PLANO 3 • O MONSTRO ACORDOU'],
    subs: [
      [{ from: 0, who: 'VOCÊ', text: '(Perder de novo?)', color: YOU_COLOR }],
      [{ from: 4, who: 'FOX', text: '"...deixa ele sair."', color: FOX_COLOR }],
      [{ from: 10, text: '15 s: mais rápido, preciso e forte!' }]
    ],
    grain: 0,
    // (sem tema: a cena acontece no estádio da partida que está rolando)
    scene(K, S) {
      const { t, phase } = S;
      const { you, rivals } = monsterChars();
      if (phase === 0) {
        // TUM.: close no seu rosto no meio do jogo, o coração batendo
        const beat = pulse(t, 6, 22) + pulse(t, 40, 22);
        const sh = 0.012 + beat * 0.03;
        K.expo(0.8);
        K.cam([MON.x + 0.2 + K.noise(S.f * 1.7, 1) * sh, eyeZ(0) + 0.06 + K.noise(S.f * 1.9, 2) * sh, MON.y + 2.25], [MON.x, eyeZ(0) - 0.08, MON.y], 34 - beat * 3);
        K.actor(you, { x: MON.x, y: MON.y, face: cam2(K), frame: 0, light: [0.85, 0.82, 0.9] });
        rivals.forEach((r, i) => K.actor(r, { id: 'r' + i, x: MON.x - 1.3 + i * 1.4, y: MON.y - 2.2 - (i % 2) * 0.9, face: [MON.x, MON.y], frame: 0 }));
      } else if (phase === 1) {
        // as correntes: o olho fica vermelho e elas partem
        const red = t >= 22;
        const snap = t > 46 ? 1 - seg(t, 46, 72) : 0;
        K.expo(0.85);
        K.cam([MON.x + 0.1 + K.noise(S.f, 3) * 0.02 * snap, eyeZ(0) + 0.03, MON.y + 2.6 - pulse(t, 22, 14) * 0.2], [MON.x, eyeZ(0) - 0.03, MON.y], 32);
        K.actor(you, { x: MON.x, y: MON.y, face: cam2(K), frame: 0, light: red ? [1.25, 0.55, 0.5] : [0.85, 0.82, 0.9] });
        rivals.forEach((r, i) => K.actor(r, { id: 'r' + i, x: MON.x - 1.3 + i * 1.4, y: MON.y - 2.2 - (i % 2) * 0.9, face: [MON.x, MON.y], frame: 0 }));
      } else {
        // O MONSTRO ACORDOU: você correndo para a câmera e a sombra gigante subindo atrás
        K.sky('#0a0000', '#3a0606', 0.1);
        K.fog('#1a0303', 0.035);
        K.ambient('#d06060');
        K.expo(0.95);
        const yy = monY(t);
        const sh = (12 * (1 - seg(t, 0, 50)) + 1.5) * 0.003;
        K.cam([MON.x + K.noise(S.f * 1.7, 4) * sh, 0.34 + K.noise(S.f * 1.9, 5) * sh, yy + 2.7], [MON.x, 1.15, yy - 0.8], 54);
        const rise = monRise(t);
        const mz = lerp(-3.2, 0, rise);
        K.actor(you, { id: 'borda', x: MON.x, y: yy - 1.66, z: mz - 0.04, ang: Math.PI / 2, frame: 0, k: 3.5 * 1.035, glow: true, opts: { tint: '#ef4444' } });
        K.actor(you, { id: 'monstro', x: MON.x, y: yy - 1.6, z: mz, ang: Math.PI / 2, frame: 0, k: 3.5, light: [0.3, 0.05, 0.05], opts: { tint: '#160202' } });
        K.floor({ x0: MON.x - 3, y0: yy - 3, x1: MON.x + 3, y1: yy + 1, img: glowCv('220,38,38'), em: true, alpha: 0.35 });
        K.actor(you, { x: MON.x, y: yy, face: cam2(K), anim: 'run', frame: Math.floor(t * 1.1), light: [1.25, 0.75, 0.7], opts: { showAura: true, auraColor: '#dc2626' } });
        rivals.forEach((r, i) => K.actor(r, { id: 'r' + i, x: MON.x - 1.8 + i * 1.8, y: yy + 0.6 - (i % 2) * 2.4, face: [MON.x, yy], anim: 'stun', frame: 0, light: [0.7, 0.35, 0.35] }));
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const { you } = monsterChars();
      if (phase === 0) {
        const beat = pulse(t, 6, 22) + pulse(t, 40, 22);
        ctx.fillStyle = 'rgba(2,6,23,0.25)';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.globalAlpha = 0.45 + beat * 0.55;
        ctx.drawImage(redVig(), 0, 0, W, H);
        ctx.restore();
        const e = eyeAt(K, MON.x, MON.y, 0);
        [6, 40].forEach((b, i) => {
          const a = t - b;
          if (a < 0 || a > 34) return;
          if (e) {
            ctx.strokeStyle = `rgba(239,68,68,${0.8 * (1 - a / 34)})`;
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.arc(e.x, e.y + 8 * e.u, 80 + a * 18, 0, Math.PI * 2);
            ctx.stroke();
          }
          CE.foxcWord(ctx, 'TUM.', i ? W * 0.82 : W * 0.17, i ? H * 0.66 : H * 0.32, 96, '#ef4444', seg(t, b, b + 8), 1 - a / 40, i ? 0.08 : -0.08);
        });
        const ME = window.MatchEngine;
        let hs = ME?.scoreHome ?? 1;
        let as = ME?.scoreAway ?? 2;
        if (hs >= as) {
          hs = 1;
          as = 2;
        }
        const labels = ME?.chapter?.scoreLabels || { home: 'VOCÊ', away: 'RIVAL' };
        const min = ME?.totalTime ? `${Math.round(90 * (1 - ME.timeLeft / ME.totalTime))}'` : "71'";
        CE.foxcScorebug(ctx, 40, top + 22, labels.home.slice(0, 10), labels.away.slice(0, 10), hs, as, `2º TEMPO • ${min}`, 1);
      } else if (phase === 1) {
        const red = t >= 22;
        const snapAt = 46;
        const snap = ease(seg(t, snapAt, snapAt + 30));
        ctx.fillStyle = `rgba(40,0,0,${red ? 0.35 : 0.15})`;
        ctx.fillRect(0, 0, W, H);
        const bh = (bot - top) * 0.46;
        const by = (top + bot) / 2 - bh / 2;
        ctx.save();
        if (t > snapAt) ctx.translate(CE.cineNoise(S.f * 1.7, 1) * 10 * (1 - seg(t, snapAt, snapAt + 26)), CE.cineNoise(S.f * 1.9, 2) * 10 * (1 - seg(t, snapAt, snapAt + 26)));
        eyeBand(ctx, S, you, {
          y: by,
          h: bh,
          k: ease(seg(t, 0, 12)),
          face: { px: 12, eyes: [[W * 0.5, by + bh * 0.62]], faceX: W * 0.5 + 400, iris: red ? '#450a0a' : you.eyeColor || '#ef4444', ring: red ? '#ef4444' : '#fca5a5', brow: red ? 1 : 0.3, dim: 0.35, dimTint: '20,0,0' }
        });
        if (red) CE.cineGlow(ctx, W * 0.5, by + bh * 0.62, 260, 'rgba(239,68,68,0.5)', Math.min(1, (t - 22) / 8));
        CE.foxcChain(ctx, -80, H * 0.2, W + 80, H * 0.84, { t, snap, link: 60, thick: 15, cut: 0.48, vib: t < snapAt ? 4 : 0 });
        CE.foxcChain(ctx, -80, H * 0.86, W + 80, H * 0.22, { t: t + 4, snap, link: 60, thick: 15, cut: 0.53, vib: t < snapAt ? 4 : 0 });
        ctx.restore();
        if (t >= snapAt) {
          CE.cineFlash(ctx, W, H, 0.85 * (1 - (t - snapAt) / 9));
          CE.foxcWord(ctx, 'KRAAASH!!', W * 0.76, top + 80, 84, '#fef2f2', seg(t, snapAt, snapAt + 8), 1, -0.12);
        }
      } else {
        // os olhos e o sorriso de dentes do monstro
        const rise = monRise(t);
        const yy = monY(t);
        const me = eyeAt(K, MON.x, yy - 1.6, lerp(-3.2, 0, rise), 3.5);
        if (me) {
          CE.cineSpriteEyes(ctx, you, me.x, me.y, me.u, { full: true, aura: '#ef4444', frame: 0 });
          [-1, 1].forEach((s) => CE.cineGlow(ctx, me.x + s * 3.3 * me.u, me.y, me.u * 6, 'rgba(239,68,68,0.7)'));
          const mu = me.u;
          const gp = Math.max(2, Math.round(mu * 0.62));
          const open = ease(seg(t, 10, 30));
          const cols = 17;
          for (let c = 0; c < cols; c++) {
            const k = (c - (cols - 1) / 2) / ((cols - 1) / 2);
            const xx = Math.round(me.x + (c - cols / 2) * gp);
            const y0 = Math.round(me.y + 4.6 * mu - Math.round(k * k * 2.4) * gp);
            const hgt = Math.max(1, Math.round((1 - k * k) * 3 * open + 1));
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(xx, y0 - gp, gp, gp * (hgt + 2));
            ctx.fillStyle = '#120202';
            ctx.fillRect(xx, y0, gp, gp * hgt);
            ctx.fillStyle = '#fef2f2';
            ctx.fillRect(xx, c % 2 ? y0 : y0 + gp * (hgt - 1), gp, gp);
          }
        }
        CE.drawRadialSpeedLines(ctx, W / 2, H * 0.55, W, '#ef4444', 0.12);
        CE.foxcWord(ctx, 'O MONSTRO ACORDOU!!', W / 2, top + 64, 80, '#ef4444', seg(t, 8, 22), 1, -0.03, W * 0.9);
        const chips = ['15 SEGUNDOS', 'VELOCIDADE ▲', 'PRECISÃO ▲', 'CHUTE ▲'];
        ctx.save();
        ctx.font = '900 18px "Segoe UI", sans-serif';
        const ws = chips.map((c) => ctx.measureText(c).width + 36);
        const total = ws.reduce((a, b) => a + b, 0) + 12 * (chips.length - 1);
        let cx = W / 2 - total / 2;
        chips.forEach((c, i) => {
          const k = back(seg(t, 34 + i * 7, 48 + i * 7));
          if (k > 0) {
            const y = bot - 40 + (1 - k) * 60;
            ctx.globalAlpha = clamp(k);
            ctx.fillStyle = i === 0 ? '#dc2626' : 'rgba(20,3,3,0.92)';
            ctx.fillRect(cx, y - 18, ws[i], 36);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx, y - 18, ws[i], 36);
            CE.foxcText(ctx, c, cx + ws[i] / 2, y + 1, '900 18px "Segoe UI", sans-serif', '#fef2f2', clamp(k));
          }
          cx += ws[i] + 12;
        });
        ctx.restore();
      }
    }
  });

  // ==========================================================================
  // 3) O DESAFIO DO RIN — noite de chuva na frente do seu prédio (montado no vazio)
  // ==========================================================================
  const RIN_AT = [86.0, 14.25];
  const YOU_RIN = [84.05, 18.45];
  const POST = [86.75, 13.75];
  const PAPER = { x: 84.9, y: 16.6, w: 1.9, h: 1.25 };
  const rinChars = perRun(() => CE.foxcRinChars());
  // fachada do prédio: janelas, a porta de vidro acesa e a marquise
  const facadeCv = once(() =>
    mkCanvas(240, 200, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, '#0a1122');
      gr.addColorStop(1, '#16213a');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 6; c++) {
          const lit = hash(r * 7 + c, 3) < 0.3;
          const warm = hash(r * 5 + c, 8) < 0.5;
          g.fillStyle = lit ? (warm ? 'rgba(253,224,71,0.95)' : 'rgba(147,197,253,0.9)') : '#1e293b';
          g.fillRect(14 + c * 37, 10 + r * 19, 24, 11);
        }
      }
      g.fillStyle = '#060a14';
      g.fillRect(w * 0.3, h - 40, w * 0.4, 40);
      g.fillStyle = 'rgba(253,230,138,0.9)';
      g.fillRect(w * 0.38, h - 34, w * 0.24, 34);
      g.fillStyle = '#020617';
      g.fillRect(w * 0.24, h - 46, w * 0.52, 6);
    })
  );
  // feixe do farol (largo à esquerda, a fonte à direita)
  const beamCv = once(() =>
    mkCanvas(256, 64, (g) => {
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
    })
  );
  // o jornal (com a sua foto) deitado na rua
  const paperCv = perRun(() => {
    const { you } = rinChars();
    const name = CE.cinePlayerName();
    return mkCanvas(380, 250, (g, w, h) => {
      g.save();
      g.translate(w / 2, h / 2);
      g.rotate(-0.06);
      const pw = 340;
      const ph = 210;
      g.fillStyle = '#d8d4c7';
      g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.fillStyle = '#0f172a';
      g.fillRect(-pw / 2, -ph / 2, pw, 26);
      CE.foxcText(g, 'DIÁRIO DO ESPORTE', 0, -ph / 2 + 13, '900 14px Georgia, serif', '#f8fafc', 1, 'center', true);
      let hf = 24;
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
        g.fillRect(-pw / 2 + 142, -ph / 2 + 76 + i * 14, (pw - 160) * (0.6 + hash(i, 5) * 0.4), 5);
      }
      CE.foxcText(g, 'Artilheiro, campeão... e ainda com fome.', -pw / 2 + 142, ph / 2 - 12, 'italic 700 10px Georgia, serif', '#334155', 1, 'left');
      g.restore();
    });
  });
  // a chuva molhando o papel (manchas que vão aparecendo)
  const wetCv = once(() =>
    mkCanvas(380, 250, (g, w, h) => {
      for (let i = 0; i < 18; i++) {
        const r = 8 + hash(i, 6) * 18;
        g.fillStyle = 'rgba(87,83,78,0.4)';
        g.beginPath();
        g.arc(30 + hash(i, 7) * (w - 60), 30 + hash(i, 8) * (h - 60), r, 0, Math.PI * 2);
        g.fill();
      }
    })
  );
  // o "abismo" do Rin: nuvem escura com a borda ciano (atrás dele)
  const abyssCv = once(() =>
    mkCanvas(256, 256, (g) => {
      const gr = g.createRadialGradient(128, 128, 20, 128, 128, 126);
      gr.addColorStop(0, 'rgba(2,26,29,0.95)');
      gr.addColorStop(0.75, 'rgba(2,26,29,0.85)');
      gr.addColorStop(0.9, 'rgba(34,211,238,0.5)');
      gr.addColorStop(1, 'rgba(34,211,238,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(34,211,238,0.25)';
      g.lineWidth = 3;
      g.beginPath();
      for (let a = 0; a < Math.PI * 7; a += 0.12) {
        const r = 8 + a * 4.6;
        const px = 128 + Math.cos(a) * r;
        const py = 128 + Math.sin(a) * r;
        if (a) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.stroke();
    })
  );
  // a rua: prédio, calçada, asfalto molhado, poste e o carro com os faróis acesos
  function rainStreet(K, beamOn = true) {
    K.sky('#01030a', '#14264a', 0.1);
    K.fog('#0a1226', 0.045);
    K.ambient('#7a90c0');
    K.expo(0.95);
    // a cidade lá no fundo e os prédios vizinhos
    K.quad({ x: 86, y: 2, z: -3, w: 80, h: 16, ang: Math.PI / 2, img: cityCv('rgba(147,197,253,0.7)', 'rgba(30,58,138,0.35)'), em: true, alpha: 0.9 });
    K.quad({ x: 64.5, y: 17, z: -3, w: 60, h: 16, ang: 0, img: cityCv('rgba(147,197,253,0.6)', 'rgba(30,58,138,0.35)'), em: true, color: '#8090b0' });
    K.quad({ x: 75.5, y: 11.8, w: 6, h: 9, ang: Math.PI / 2, img: facadeCv(), em: true, color: '#5a6a8a' });
    K.quad({ x: 82.5, y: 12.6, w: 7.6, h: 6.4, ang: Math.PI / 2, img: facadeCv(), em: true, color: '#c8d0e0' });
    K.quad({ x: 92.0, y: 11.9, w: 7, h: 8, ang: Math.PI / 2, img: facadeCv(), em: true, color: '#56658a' });
    // calçada, meio-fio e o asfalto
    K.box({ x0: 66, y0: 12.6, x1: 106, y1: 14.7, z0: 0, z1: 0.07, color: '#1e293b', top: '#2a374d' });
    K.floor({ x0: 66, y0: 14.7, x1: 106, y1: 34, color: '#0b1324' });
    // poste e o cone de luz (e o reflexo no chão molhado)
    const [lx, ly] = POST;
    K.box({ x0: lx - 0.05, y0: ly - 0.05, x1: lx + 0.05, y1: ly + 0.05, z0: 0, z1: 2.5, color: '#0f172a' });
    K.box({ x0: lx - 1.05, y0: ly - 0.035, x1: lx + 0.05, y1: ly + 0.035, z0: 2.43, z1: 2.5, color: '#0f172a' });
    K.box({ x0: lx - 1.1, y0: ly - 0.09, x1: lx - 0.72, y1: ly + 0.09, z0: 2.32, z1: 2.43, color: '#e0f2fe', em: true });
    K.floor({ x0: lx - 2.3, y0: ly - 1.0, x1: lx + 0.4, y1: ly + 2.6, z: 0.075, img: glowCv('186,230,253'), em: true, alpha: 0.32 });
    K.floor({ x0: lx - 1.4, y0: ly + 1.6, x1: lx - 0.4, y1: ly + 4.0, z: 0.01, img: glowCv('186,230,253'), em: true, alpha: 0.18 });
    faceCam(K, { x: lx - 0.9, y: ly + 0.05, z: 0.05, w: 2.2, h: 2.3, img: coneCv(), em: true, alpha: 0.45 });
    // o carro que trouxe o Rin (de frente para o oeste), faróis acesos
    K.box({ x0: 88.3, y0: 15.0, x1: 91.9, y1: 16.0, z0: 0.14, z1: 0.5, color: '#06080e' });
    K.box({ x0: 89.2, y0: 15.08, x1: 91.2, y1: 15.92, z0: 0.5, z1: 0.84, color: '#070a12' });
    K.box({ x0: 89.25, y0: 15.06, x1: 91.15, y1: 15.94, z0: 0.56, z1: 0.78, color: '#0c4a6e', em: true, alpha: 0.5 });
    [[88.75, 14.97], [91.4, 14.97], [88.75, 16.03], [91.4, 16.03]].forEach(([x, y]) => K.box({ x0: x - 0.2, y0: y - 0.03, x1: x + 0.2, y1: y + 0.03, z0: 0, z1: 0.26, color: '#020305' }));
    [15.2, 15.8].forEach((y) => K.box({ x0: 88.22, y0: y - 0.08, x1: 88.3, y1: y + 0.08, z0: 0.3, z1: 0.4, color: '#fef9c3', em: true }));
    if (beamOn) faceCam(K, { x: 86.6, y: 15.5, z: 0.0, w: 3.4, h: 0.85, img: beamCv(), em: true, alpha: 0.4 });
    K.floor({ x0: 84.6, y0: 14.9, x1: 88.4, y1: 16.2, img: glowCv('254,249,195'), em: true, alpha: 0.22 });
  }
  // respingos da chuva no chão (anéis na tela, tamanho pela distância)
  function splashes(ctx, K, t, n, x0, x1, y0, y1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(191,219,254,0.5)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < n; i++) {
      const cyc = Math.floor((t * 1.5 + i * 13) / 30);
      const age = (t * 1.5 + i * 13) % 30;
      const p = K.screen(lerp(x0, x1, hash(i, cyc)), 0.02, lerp(y0, y1, hash(i + 40, cyc)));
      const q = p && K.screen(lerp(x0, x1, hash(i, cyc)) + 0.1, 0.02, lerp(y0, y1, hash(i + 40, cyc)));
      if (!p || !q) continue;
      const s = Math.abs(q.x - p.x) / 0.1 / 400;
      ctx.globalAlpha = 1 - age / 30;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, Math.max(1, age * 0.9 * s), Math.max(0.5, age * 0.25 * s), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  const rinStomp = (t) => ({ k: ease(seg(t, 92, 116)), x: 84.35, y: lerp(14.9, 16.55, ease(seg(t, 60, 112))) });

  reg3d('rin_challenge', {
    phases: [190, 180, 180, 200],
    music: 'tension',
    title: '⚡ O DESAFIO DO RIN',
    tags: ['PLANO 1 • CHUVA', 'PLANO 2 • A MANCHETE', 'PLANO 3 • O RIVAL', 'PLANO 4 • SÓ EXISTE UM'],
    subs: [
      [{ from: 16, who: 'RIN ITOSHI', text: '"...Não. Vim ver o favorito."', color: RIN_COLOR }],
      [{ from: 2, who: 'RIN ITOSHI', text: '"Essa manchete devia ser minha."', color: RIN_COLOR }],
      [{ from: 6, who: 'RIN ITOSHI', text: '"Você tá vivendo a MINHA vida."', color: RIN_COLOR }],
      [{ from: 20, who: 'RIN ITOSHI', text: '"Bola de Ouro? Só existe UM."', color: RIN_COLOR }]
    ],
    grain: 0,
    theme: 'nel_dome',
    scene(K, S) {
      const { t, phase } = S;
      const { rin, you } = rinChars();
      rainStreet(K, phase !== 2);
      if (phase === 0) {
        // por cima do seu ombro: o Rin parado debaixo do poste, na chuva
        const e = easeIO(seg(t, 0, 185));
        K.cam(mix([83.8, 1.02, 20.35], [84.05, 0.98, 20.0], e), mix([85.7, 0.74, 14.3], [85.95, 0.68, 14.3], e), lerp(40, 34, e));
        K.actor(you, { x: YOU_RIN[0], y: YOU_RIN[1], face: RIN_AT, frame: 0, light: [0.34, 0.44, 0.62] });
        K.actor(rin, { x: RIN_AT[0], y: RIN_AT[1], z: 0.07, face: YOU_RIN, frame: 0, light: [0.72, 0.9, 1.08] });
      } else if (phase === 1) {
        // a manchete no asfalto molhado... e o tênis do Rin pisando na sua foto
        const wet = seg(t, 0, 170);
        const e = easeIO(seg(t, 0, 96));
        const e2 = easeIO(seg(t, 96, 132));
        const top0 = [PAPER.x - 0.1, lerp(1.62, 1.42, e), PAPER.y + lerp(1.35, 1.12, e)];
        const lk0 = [PAPER.x, 0, PAPER.y - 0.05];
        const sh = t >= 116 ? 0.02 * (1 - seg(t, 116, 140)) : 0;
        K.cam(mix(top0, [PAPER.x + 0.9 + K.noise(S.f, 6) * sh, 0.5, PAPER.y + 1.55], e2), mix(lk0, [84.5, 0.32, 16.4], e2), lerp(42, 40, e2));
        K.floor({ x0: PAPER.x - PAPER.w / 2, y0: PAPER.y - PAPER.h / 2, x1: PAPER.x + PAPER.w / 2, y1: PAPER.y + PAPER.h / 2, z: 0.012, img: paperCv(), color: '#c8cdd8' });
        K.floor({ x0: PAPER.x - PAPER.w / 2, y0: PAPER.y - PAPER.h / 2, x1: PAPER.x + PAPER.w / 2, y1: PAPER.y + PAPER.h / 2, z: 0.016, img: wetCv(), alpha: wet });
        if (t > 56) {
          const r = rinStomp(t);
          K.actor(rin, { x: r.x, y: r.y, z: 0.0, face: [r.x, r.y + 1], anim: r.k < 1 && t < 112 ? 'run' : 'idle', frame: r.k < 1 && t < 112 ? Math.floor(t * 0.5) : 0, light: [0.7, 0.86, 1.05] });
        }
      } else if (phase === 2) {
        // o Rin em close, a água escorrendo do cabelo; o seu ombro na frente
        const k = easeIO(t / 180);
        const ab = ease(seg(t, 30, 150));
        K.cam([RIN_AT[0] - 0.3, eyeZ(0.07) + 0.06, RIN_AT[1] + lerp(2.3, 2.1, k)], [RIN_AT[0] + 0.12, eyeZ(0.07) - 0.05, RIN_AT[1]], 34);
        if (ab > 0.02) faceCam(K, { x: RIN_AT[0] + 0.02, y: RIN_AT[1] - 0.35, z: 0.1 - ab * 0.4, w: 2.6 * ab, h: 2.6 * ab, img: abyssCv(), alpha: 0.9 * ab });
        K.actor(rin, { x: RIN_AT[0], y: RIN_AT[1], z: 0.07, face: cam2(K), frame: 0, light: [0.55, 0.72, 0.9] });
        K.actor(you, { id: 'sombra', x: RIN_AT[0] - 1.0, y: RIN_AT[1] + 0.85, face: RIN_AT, frame: 0, opts: { tint: '#010309' } });
      } else {
        // os dois cara a cara na chuva; os olhos de cada um numa faixa
        const k = easeIO(t / 200);
        const shake = pulse(t, 60, 20) * 0.02;
        K.cam([lerp(84.9, 85.3, k) + K.noise(S.f, 2) * shake, 0.62, lerp(19.4, 19.0, k)], [85.15, 0.56, 16.2], 38);
        K.actor(you, { x: 84.4, y: 16.2, face: [86, 16.2], frame: 0, light: [0.55, 0.65, 0.85] });
        K.actor(rin, { x: 85.9, y: 16.2, face: [84, 16.2], frame: 0, light: [0.6, 0.85, 1.0] });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const { rin, you } = rinChars();
      if (phase === 0) {
        splashes(ctx, K, t, 22, 80, 92, 14.8, 21);
        const lp = K.screen(POST[0] - 0.9, 2.38, POST[1]);
        if (lp) CE.cineGlow(ctx, lp.x, lp.y, 50, 'rgba(219,234,254,0.9)');
        [15.2, 15.8].forEach((y) => {
          const hp = K.screen(88.2, 0.35, y);
          if (hp) CE.cineGlow(ctx, hp.x, hp.y, 28, 'rgba(254,249,195,0.95)');
        });
        CE.cineRain(ctx, W, H, t, 0.4, 170, 0.22);
      } else if (phase === 1) {
        // gotas batendo no papel, o pisão e o SPLASH
        splashes(ctx, K, t, 16, PAPER.x - 1.4, PAPER.x + 1.4, PAPER.y - 1.0, PAPER.y + 1.0);
        if (t >= 116) {
          const a = t - 116;
          const p = K.screen(84.35, 0.02, 16.55);
          const q = p && K.screen(84.45, 0.02, 16.55);
          if (p && q) {
            const s = Math.abs(q.x - p.x) / 0.1 / 700;
            ctx.save();
            ctx.strokeStyle = `rgba(191,219,254,${0.8 * (1 - a / 30)})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, (150 + a * 5) * s, (50 + a * 2) * s, 0, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 14; i++) {
              const ang = (i / 14) * Math.PI * 2;
              const r = (120 + a * 6) * s;
              ctx.fillStyle = `rgba(191,219,254,${0.8 * (1 - a / 30)})`;
              ctx.fillRect(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r * 0.35 - a * 1.5 + a * a * 0.06, 5, 5);
            }
            ctx.restore();
          }
          CE.foxcWord(ctx, 'SPLASH', W * 0.82, top + 74, 54, '#bae6fd', seg(t, 116, 124), 1 - seg(t, 150, 175), 0.1);
        }
        CE.cineRain(ctx, W, H, t, 0.3, 110, 0.05);
      } else if (phase === 2) {
        const e = eyeAt(K, RIN_AT[0], RIN_AT[1], 0.07);
        if (e) {
          CE.cineGlow(ctx, e.x - 2 * e.u, e.y - 8 * e.u, 14 * e.u, 'rgba(186,230,253,0.22)');
          const open = seg(t, 52, 62);
          if (open > 0) {
            [-1, 1].forEach((s) => CE.cineGlow(ctx, e.x + s * 3 * e.u, e.y, e.u * 1.3, 'rgba(240,253,250,0.95)', open));
            [-1, 1].forEach((s) => CE.cineGlow(ctx, e.x + s * 3.3 * e.u, e.y, e.u * 4.5, 'rgba(34,211,238,0.45)', open));
          }
          // água escorrendo do cabelo
          for (let i = 0; i < 8; i++) {
            const dy = ((t * (2 + hash(i) * 2) + hash(i, 3) * 300) % 360) * (e.u / 18);
            ctx.fillStyle = 'rgba(186,230,253,0.75)';
            ctx.fillRect(e.x + (hash(i, 9) - 0.5) * 16 * e.u, e.y - 6 * e.u + dy, Math.max(2, e.u * 0.25), Math.max(4, e.u * 0.7));
          }
        }
        CE.cineRain(ctx, W, H, t, 0.35, 150, 0.22);
      } else {
        const mid = (top + bot) / 2;
        const bh = (bot - top) * 0.27;
        const kA = ease(seg(t, 0, 18));
        const kB = ease(seg(t, 8, 26));
        const shake = pulse(t, 60, 20) * 8;
        // você em cima
        ctx.save();
        ctx.translate((1 - kA) * -W + CE.cineNoise(t, 2) * shake, 0);
        CE.foxcFaceBand(ctx, 0, top, W, bh, you, { px: 12, eyes: [[W * 0.22, top + bh * 0.6], [W * 0.46, top + bh * 0.6]], faceX: W * 0.34, iris: you.eyeColor || '#ef4444', ring: CE.foxcMix(you.eyeColor || '#ef4444', '#ffffff', 0.5), brow: 0.6, dim: 0.4, dimTint: '8,20,50', fringe: top + bh * 0.16 });
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, top + bh, W, 4);
        ctx.restore();
        // o Rin embaixo
        ctx.save();
        ctx.translate((1 - kB) * W + CE.cineNoise(t, 5) * shake, 0);
        CE.foxcFaceBand(ctx, 0, bot - bh, W, bh, rin, { px: 12, eyes: [[W * 0.54, bot - bh * 0.4], [W * 0.78, bot - bh * 0.4]], faceX: W * 0.66, iris: '#0f766e', ring: '#5eead4', brow: 1, dim: 0.42, dimTint: '2,20,30', fringe: bot - bh * 0.84 });
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, bot - bh - 4, W, 4);
        ctx.restore();
        // a rachadura dourada entre os dois e a Bola de Ouro no meio
        const lk = seg(t, 56, 64);
        if (lk > 0) {
          ctx.save();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 6;
          ctx.lineJoin = 'miter';
          ctx.beginPath();
          const y0 = top + bh;
          const y1 = bot - bh;
          for (let i = 0; i <= 10; i++) {
            const y = lerp(y0, y1, i / 10);
            const x = W / 2 + (i % 2 ? -12 : 12) * (0.6 + hash(i, 2) * 0.6);
            if (i / 10 > lk) break;
            if (i) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
          }
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#fffbeb';
          ctx.stroke();
          ctx.restore();
        }
        if (t >= 60) CE.cineFlash(ctx, W, H, 0.6 * (1 - (t - 60) / 10), '#fef9c3');
        const bk = back(seg(t, 64, 84));
        if (bk > 0) {
          ctx.save();
          ctx.translate(W * 0.5, mid);
          ctx.scale(bk * 0.8, bk * 0.8);
          CE.foxcGoldBall(ctx, 0, -8, 56, t);
          ctx.restore();
        }
        CE.foxcWord(ctx, 'SÓ EXISTE UM.', W * 0.8, top + bh * 0.55, 58, '#f8fafc', seg(t, 24, 38), 1 - seg(t, 100, 112), -0.05, W * 0.34);
        CE.foxcWord(ctx, 'VAI SER EU.', W * 0.8, top + bh * 0.55, 62, YOU_COLOR, seg(t, 114, 126), 1, -0.05, W * 0.34);
        CE.foxcWord(ctx, 'VAI SER EU.', W * 0.21, bot - bh * 0.5, 62, RIN_COLOR, seg(t, 114, 126), 1, 0.05, W * 0.34);
        CE.cineRain(ctx, W, H, t, 0.28, 120, 0.22);
      }
    }
  });

  // ==========================================================================
  // 4) CAMPEÕES — Copa Sub-20 (u20_celebration) e Copa do Mundo (wc_champion)
  // No campo do prédio com as cores do estádio da final
  // ==========================================================================
  const C0 = [53, 14.6];
  const celebCfg = perRun(() => {
    const c = CE.foxcCelebCfg();
    const fr = CE.KITS.france;
    c.fr = { noa: CE.cineChar('noa', fr), loki: CE.cineChar('loki', fr), hugo: CE.cineChar('hugo', fr) };
    return c;
  });
  // as taças (prontas num canvas): a da Copa do Mundo e a da Sub-20
  const wcTrophyCv = once(() => mkCanvas(96, 224, (g) => CE.foxcWCTrophy(g, 48, 222, 1)));
  const u20TrophyCv = once(() => mkCanvas(136, 128, (g) => CE.drawTrophy(g, 68, 64, 1)));
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
  // os quatro dos gritos (plano 2): posição e pose de cada um
  const SHOUT_POSE = { shidou: 'celebrate', bachira: 'call_pass', nagi: 'stun', rin: 'idle', sae: 'idle' };
  const shoutX = (i) => 50.6 + i * 1.6;
  const shoutY = (i) => 14.4 + (i % 2) * 0.3;
  const shoutCamX = (t) => lerp(49.3, 56.7, easeIO(t / 170));
  const cupLift = (t) => ease(seg(t, 0, 60));

  function celebScene(K, S) {
    const { t, phase } = S;
    const c = celebCfg();
    const m = c.mates;
    K.sky('#020617', '#1e1b4b', 0.7);
    if (phase === 0) {
      // o apito final: o time inteiro correndo até você no meio do campo
      const e = easeIO(t / 150);
      const sh = pulse(t, 4, 30) * 0.03 + 0.004;
      K.cam([C0[0] + K.noise(S.f * 1.7, 1) * sh, lerp(0.5, 0.95, e) + K.noise(S.f * 1.9, 2) * sh, lerp(21.2, 18.3, e)], [C0[0], lerp(0.72, 0.6, e), C0[1]], 44);
      [['noa', 50.6, 11.4], ['loki', 55.6, 11.0], ['hugo', 53.9, 10.1]].forEach(([id, x, y]) => K.actor(c.fr[id], { x, y, face: [x, y + 1], anim: 'stun', frame: 0, light: [0.45, 0.5, 0.65] }));
      m.slice(0, 6).forEach((ch, i) => {
        const side = i % 2 ? 1 : -1;
        const k = ease(seg(t, 26 + i * 6, 96 + i * 6));
        const x = lerp(C0[0] + side * 7.5, C0[0] + side * (0.85 + Math.floor(i / 2) * 0.7), k);
        const y = C0[1] + [0.25, -0.35, 0.55][Math.floor(i / 2)];
        if (k < 1) K.actor(ch, { x, y, face: [C0[0], y], anim: 'run', frame: Math.floor(t * 1.1) + i * 7 });
        else K.actor(ch, { x, y, z: Math.abs(Math.sin(t * 0.13 + i)) * 0.22, face: cam2(K), anim: 'call_pass', frame: 0, left: side < 0 });
      });
      const jump = t > 30 ? Math.abs(Math.sin(t * 0.12)) * 0.3 : 0;
      K.actor(c.you, { id: t > 40 ? 'aura' : '', x: C0[0], y: C0[1], z: jump, face: cam2(K), anim: 'call_pass', frame: 0, light: [1.15, 1.1, 0.95], opts: t > 40 ? { showAura: true, auraColor: '#facc15' } : undefined });
    } else if (phase === 1) {
      // cada um do seu jeito: a câmera passa pelos quatro, um grito de cada
      const camX = shoutCamX(t);
      K.cam([camX, 0.7, 17.3], [camX + 0.45, 0.62, 14.3], 38);
      c.panels.forEach(([id], i) => {
        const ch = m.find((x) => x.id === id) || c.you;
        K.actor(ch, { id: 'grito', x: shoutX(i), y: shoutY(i), z: id === 'shidou' || id === 'bachira' ? Math.abs(Math.sin(t * 0.14 + i)) * 0.2 : 0, face: cam2(K), anim: SHOUT_POSE[id] || 'idle', frame: 0, light: [1.05, 1.05, 1.1] });
      });
      // o resto do time pulando lá atrás
      [c.you, ...m.filter((x) => !c.panels.some(([id]) => id === x.id))].forEach((ch, i) => K.actor(ch, { id: 'fundo', x: 50.2 + i * 1.5, y: 11.9 - (i % 2) * 0.5, z: Math.abs(Math.sin(t * 0.12 + i * 1.3)) * 0.25, face: cam2(K), anim: 'call_pass', frame: 0, left: i % 2 === 1 }));
    } else if (phase === 2 && !c.wc) {
      // a festa: fogos sobre o estádio e o time inteiro pulando
      const camX = lerp(51.6, 54.4, easeIO(t / 180));
      K.cam([camX, 0.32, 19.3], [53, 1.2, 12.5], 50);
      const row = [m[2], m[0], m[4], c.you, m[5], m[1], m[3]].filter(Boolean);
      row.forEach((ch, i) => K.actor(ch, { id: 'festa', x: 53 + (i - 3) * 0.8, y: 15.2 + Math.abs(i - 3) * 0.14, z: Math.abs(Math.sin(t * 0.11 + i * 0.9)) * 0.32, face: cam2(K), anim: 'call_pass', frame: 0, left: i > 3, light: [1.25, 1.12, 0.8], k: ch === c.you ? 0.96 : 0.9 }));
    } else if (phase === 2) {
      // o outro lado: a França parada no meio da festa japonesa
      const camX = lerp(52.6, 53.4, easeIO(t / 200));
      K.cam([camX, 0.62, 19.5], [53, 0.6, 13.8], 40);
      K.floor({ x0: 48.5, y0: 9.2, x1: 57.5, y1: 12.4, img: glowCv('250,204,21'), em: true, alpha: 0.35 });
      [c.you, ...m.slice(0, 6)].forEach((ch, i) => K.actor(ch, { id: 'longe', x: 50.1 + i * 0.97, y: 10.7 + (i % 2) * 0.35, z: Math.abs(Math.sin(t * 0.12 + i * 1.1)) * 0.28, face: cam2(K), anim: 'call_pass', frame: 0, left: i > 3, light: [1.35, 1.15, 0.7] }));
      K.actor(c.fr.noa, { x: 53, y: 15.3, face: cam2(K), frame: 0, light: [0.36, 0.42, 0.6] });
      K.actor(c.fr.loki, { x: 51.7, y: 17.0, face: cam2(K), frame: 0, light: [0.32, 0.38, 0.55] });
      K.actor(c.fr.hugo, { x: 54.3, y: 17.0, face: cam2(K), frame: 0, light: [0.32, 0.38, 0.55] });
    } else {
      // a taça: você levanta, a câmera sobe junto
      const lift = cupLift(t);
      const e = easeIO(t / 210);
      K.cam([C0[0], lerp(0.28, 0.48, lift), lerp(17.0, 17.4, e)], [C0[0], lerp(0.55, 0.92, lift), C0[1]], lerp(46, 42, e));
      K.floor({ x0: C0[0] - 1.6, y0: C0[1] - 1.4, x1: C0[0] + 1.6, y1: C0[1] + 1.4, img: glowCv('250,204,21'), em: true, alpha: 0.4 });
      m.slice(0, 6).forEach((ch, i) => {
        const side = i % 2 ? 1 : -1;
        K.actor(ch, { id: 'taca', x: C0[0] + side * (0.78 + Math.floor(i / 2) * 0.58), y: C0[1] - 0.25 - Math.floor(i / 2) * 0.25, z: Math.abs(Math.sin(t * 0.1 + i)) * 0.18, face: cam2(K), anim: 'call_pass', frame: 0, left: side < 0, light: [0.5, 0.55, 0.85] });
      });
      K.actor(c.you, { id: 'taca', x: C0[0], y: C0[1], face: cam2(K), anim: 'call_pass', frame: 0, light: [1.3, 1.2, 0.92], opts: { showAura: true, auraColor: '#facc15' } });
      const hnd = raisedHand(K, C0[0], C0[1], 0);
      if (c.wc) K.sprite(wcTrophyCv(), { x: hnd.x, y: hnd.y, z: hnd.z - 0.08, w: 0.2, h: 0.46, light: [1.25, 1.15, 0.9] });
      else K.sprite(u20TrophyCv(), { x: hnd.x, y: hnd.y, z: hnd.z - 0.05, w: 0.34, h: 0.32, light: [1.25, 1.15, 0.9] });
    }
  }
  function celebOverlay(ctx, S, K) {
    const { W, H, t, phase, top } = S;
    const c = celebCfg();
    if (phase === 0) {
      CE.cineShafts(ctx, W * 0.15, top - 30, Math.PI * 0.35, 900, 0.3, 4, '254,249,195', 0.12, t);
      CE.cineShafts(ctx, W * 0.85, top - 30, Math.PI * 0.65, 900, 0.3, 4, '254,249,195', 0.12, t);
      if (t > 86) CE.drawConfetti(ctx, W, H, t - 86, 90);
      CE.foxcWord(ctx, 'PRIIIIIIII!!', W * 0.5, top + 60, 66, '#f8fafc', seg(t, 2, 10), 1 - seg(t, 60, 76), -0.06);
      CE.foxcWord(ctx, 'CAMPEÕES!!', W / 2, H * 0.36, 118, '#facc15', seg(t, 92, 106), 1, -0.04, W * 0.9);
      CE.foxcScorebug(ctx, 34, top + 18, 'JAPÃO', 'FRANÇA', c.home, c.away, 'FIM DE JOGO', seg(t, 18, 36));
    } else if (phase === 1) {
      // o grito de cada um aparece quando a câmera chega nele
      const camX = shoutCamX(t);
      c.panels.forEach(([id, shout, color], i) => {
        const k = seg(camX, shoutX(i) - 1.3, shoutX(i) - 0.85);
        const p = K.screen(shoutX(i), 1.06, shoutY(i));
        if (!p || k <= 0) return;
        const ch = c.mates.find((x) => x.id === id) || c.you;
        CE.foxcWord(ctx, shout, p.x, p.y - 30, 40, color, k, 1, -0.08, 260);
        CE.foxcText(ctx, (ch.name || '').toUpperCase(), p.x, p.y + 8, '900 13px "Segoe UI", sans-serif', '#cbd5e1', k, 'center', true);
      });
      CE.drawConfetti(ctx, W, H, t + 40, 40);
    } else if (phase === 2 && !c.wc) {
      CE.foxcFireworks(ctx, W, top + 50, H * 0.4, t, 7, ['#facc15', '#38bdf8', '#f8fafc', '#ef4444', '#00f5d4'], 3);
      CE.drawConfetti(ctx, W, H, t, 70);
    } else if (phase === 2) {
      CE.drawConfetti(ctx, W, H, t, 70);
      CE.foxcText(ctx, 'FRANÇA', W - 60, top + 40, '900 15px "Segoe UI", sans-serif', '#93c5fd', seg(t, 10, 30), 'right', true);
      CE.foxcText(ctx, `${c.away} x ${c.home}`, W - 60, top + 78, 'italic 900 34px "Segoe UI", sans-serif', '#f8fafc', seg(t, 14, 34), 'right');
    } else {
      CE.cineShafts(ctx, W / 2, top - 80, Math.PI / 2, H, 0.9, 7, '253,224,71', 0.14, t);
      for (let i = 0; i < 30; i++) {
        if ((t + i * 13) % 37 > 2) continue;
        CE.cineGlow(ctx, hash(i, 3) * W, top + 20 + hash(i, 4) * H * 0.3, 26, 'rgba(255,255,255,0.9)');
      }
      // brilhinhos em volta da taça
      const hnd = raisedHand(K, C0[0], C0[1], 0);
      const p = K.screen(hnd.x, hnd.z + (c.wc ? 0.3 : 0.18), hnd.y);
      if (p) {
        CE.cineGlow(ctx, p.x, p.y, 90, 'rgba(250,204,21,0.35)');
        for (let i = 0; i < 36; i++) {
          const a = i * 2.4 + t * 0.02;
          const r = 40 + ((t * 2 + i * 23) % 200);
          ctx.fillStyle = i % 3 ? '#fde047' : '#ffffff';
          ctx.fillRect(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.7, 4, 4);
        }
      }
      CE.drawConfetti(ctx, W, H, t, 60);
      CE.foxcGrad(ctx, 0, top, W, 220, [[0, 'rgba(2,6,23,0.9)'], [1, 'rgba(2,6,23,0)']]);
      CE.cineTitleCard(ctx, W, top + 104, seg(t, 84, 110), { kicker: `${c.kicker} • JAPÃO ${c.home} x ${c.away} FRANÇA`, title: c.champ, sub: c.wc ? 'O Japão no topo do planeta.' : 'Da final do colégio ao topo do mundo.', color: '#facc15' });
    }
  }

  reg3d('u20_celebration', {
    phases: [150, 170, 180, 210],
    music: 'victory',
    title: '🏆 JAPÃO CAMPEÃO DA COPA DO MUNDO SUB-20',
    tags: ['PLANO 1 • O APITO FINAL', 'PLANO 2 • CADA UM DO SEU JEITO', 'PLANO 3 • A FESTA', 'PLANO 4 • A TAÇA'],
    subs: [
      [{ from: 4, who: 'NARRADOR', text: '"ACABOU! JAPÃO CAMPEÃO!!"', color: '#facc15' }],
      [{ from: 8, who: 'SAE ITOSHI', text: '"Esse gol foi o meu passe."', color: '#f87171' }],
      [{ from: 10, text: 'Fogos no céu. Ninguém quer ir embora.' }],
      [{ from: 10, text: 'Da final do colégio ao topo do mundo.' }]
    ],
    grain: 0,
    theme: 'worldcup_final',
    scene: celebScene,
    overlay: celebOverlay
  });
  reg3d('wc_champion', {
    phases: [150, 170, 200, 210],
    music: 'victory',
    title: '🏆 JAPÃO CAMPEÃO DA COPA DO MUNDO',
    tags: ['PLANO 1 • O APITO FINAL', 'PLANO 2 • CADA UM DO SEU JEITO', 'PLANO 3 • O OUTRO LADO', 'PLANO 4 • A TAÇA DE VERDADE'],
    subs: [
      [{ from: 4, who: 'NARRADOR MUNDIAL', text: '"ACABOU A COPA!!"', color: '#facc15' }],
      [{ from: 14, who: 'RIN ITOSHI', text: '"Da próxima, o gol é meu."', color: RIN_COLOR }],
      [{ from: 10, who: 'HUGO', text: '"A gente volta. Daqui a quatro anos."', color: '#93c5fd' }],
      [{ from: 10, text: 'A taça de verdade. Pela 1ª vez na história.' }]
    ],
    grain: 0,
    theme: 'worldcup_final',
    scene: celebScene,
    overlay: celebOverlay
  });

  // ==========================================================================
  // 5) CRÉDITOS FINAIS — a câmera passeia pelo prédio inteiro enquanto os nomes passam:
  // campo (título) → seu quarto → túnel → saguão (elenco) → telão e o Fox → campo ao amanhecer
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
  const castList = once(() => (window.BLUE_LOCK_CHARACTERS || []).filter((c) => !/^gen_|^gk_/.test(c.id)));
  const castSpots = once(() => {
    const spots = [];
    const pillar = (x, y) => [21, 28].some((px) => x > px - 0.2 && x < px + 1.2) && y > 16.8 && y < 18.2;
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < 18; i++) {
        const x = 17.6 + i * 0.86 + (r % 2) * 0.43;
        const y = 16.15 + r * 0.8;
        if (x > 32.5 || pillar(x, y)) continue;
        spots.push([x, y]);
      }
    }
    return spots;
  });
  const credCamX = (t) => lerp(18.6, 31.2, easeIO(t / 540));
  const FOX_LOBBY = [29.7, 11.7];
  const credKick = (t) => (t < 58 ? 'idle' : t < 70 ? 'windup' : t < 100 ? 'shoot' : 'idle');
  // a bola do último chute: da marca do pênalti até a rede do gol norte
  function credBall(t) {
    const k = seg(t, 70, 104);
    if (k <= 0) return [53.05, 8.95, 0];
    if (k >= 1) return [53.35, 6.3, 0.12];
    return [lerp(53.05, 53.35, k), lerp(8.95, 6.35, k), Math.sin(k * Math.PI) * 0.45 + k * 0.25];
  }

  reg3d('credits', {
    phases: [300, 360, 360, 540, 360, 480],
    music: 'promise',
    title: '🎬 CRÉDITOS',
    letterbox: 0.1,
    tags: ['BLUE LOCK: EGOIST CAREER', 'ESTRELANDO', 'OS IRMÃOS ITOSHI', 'ELENCO', 'O BLUE LOCK E A RAPOSA', 'FIM'],
    subs: [[], [], [], [], [], []],
    grain: 0,
    theme: 'bluelock_holo',
    scene(K, S) {
      const { t, phase } = S;
      const c = credChars();
      if (phase === 0) {
        // o campo à noite: você e o Tada em silhueta perto do gol; a câmera sobe e abre
        K.sky('#01030a', '#1e3a8a', 1);
        K.expo(0.85);
        const e = easeIO(t / 300);
        K.cam([53 + Math.sin(e * 0.6) * 0.8, lerp(0.45, 3.4, e), lerp(13.4, 18.2, e)], [53, lerp(0.75, 1.5, e), lerp(7.6, 8.4, e)], lerp(40, 48, e));
        K.actor(c.tada, { id: 'sil', x: 51.4, y: 8.7, face: [52.6, 8.6], frame: 0, opts: { tint: '#020617' } });
        K.actor(c.you, { id: 'sil', x: 52.5, y: 8.5, face: [51.4, 8.7], frame: 0, opts: { tint: '#020617' } });
        K.ball(52.85, 8.55, 0, { k: 0.6, light: [0.15, 0.17, 0.25] });
      } else if (phase === 1) {
        // ESTRELANDO: você no seu quarto, com a luz ciano de recorte
        K.expo(0.95);
        const e = easeIO(t / 360);
        K.cam(mix([13.5, 1.05, 28.9], [12.95, 0.92, 27.7], e), mix([12.65, 0.62, 25.0], [12.5, 0.6, 25.0], e), 40);
        K.actor(c.youJp, { x: 11.9, y: 25.1, face: cam2(K), frame: 0, light: [1.0, 1.1, 1.2] });
      } else if (phase === 2) {
        // OS IRMÃOS ITOSHI: no túnel do campo, um de cada lado, a saída acesa lá atrás
        K.expo(0.92);
        const e = easeIO(t / 360);
        K.cam([lerp(35.6, 36.5, e), 0.95, 14.5], [40.5, 0.72, 14.5], 48);
        K.quad({ x: 44.05, y: 14.5, z: 0, w: 1.0, h: 1.5, ang: Math.PI, color: '#e0f2fe', em: true });
        K.actor(c.rin, { x: 38.3, y: 13.8, face: cam2(K), frame: 0, light: [0.55, 0.95, 1.05] });
        K.actor(c.sae, { x: 38.9, y: 15.25, face: cam2(K), frame: 0, light: [1.15, 0.62, 0.62] });
      } else if (phase === 3) {
        // ELENCO: todo mundo que cruzou o seu caminho, em fileiras no saguão
        K.expo(0.95);
        const cx = credCamX(t);
        K.cam([cx, 1.42, 20.45], [cx + 0.9, 0.5, 16.4], 46);
        const cast = castList();
        castSpots().forEach(([x, y], i) => {
          const ch = cast[i];
          if (!ch || Math.abs(x - cx - 0.9) > 5.4) return;
          K.actor(ch, { id: 'elenco', x, y, face: [x + (cx - x) * 0.3, 21], frame: 0, k: 0.86 });
        });
      } else if (phase === 4) {
        // o Ego e a Anri na frente do telão... e o Fox no canto escuro do saguão
        K.expo(0.9);
        const pan = easeIO(seg(t, 150, 200));
        const dol = easeIO(seg(t, 190, 360));
        const eye = mix(mix([25.0, 1.12, 13.0], [25.5, 1.1, 12.85], easeIO(t / 150)), [27.7, 1.0, 12.45], dol);
        const look = mix([25.1, 0.72, 10.3], [FOX_LOBBY[0] - 0.2, 0.66, FOX_LOBBY[1] - 0.5], pan);
        K.cam(eye, look, 44);
        K.actor(c.ego, { x: 24.5, y: 10.35, face: [25, 13], frame: 0, k: 0.95 });
        K.actor(c.anri, { x: 25.75, y: 10.6, face: [25, 13], frame: 0 });
        K.actor(c.fox, { x: FOX_LOBBY[0], y: FOX_LOBBY[1], face: cam2(K), frame: 0, light: [0.42, 0.14, 0.12] });
      } else {
        // FIM: o campo ao amanhecer, o último chute
        K.sky('#0b1d4d', '#f59e0b', 0.05);
        K.fog('#2a2238', 0.02);
        K.expo(1.0);
        const e = easeIO(seg(t, 110, 330));
        K.cam(mix([55.1, 0.55, 10.7], [56.6, 3.3, 15.8], e), mix([53, 0.6, 7.6], [53, 0.9, 8.2], e), lerp(42, 46, e));
        K.actor(c.tada, { x: 50.5, y: 9.9, face: [53, 8.6], frame: 0, light: [0.32, 0.3, 0.38] });
        K.actor(c.you, { x: 53, y: 9.3, face: [53, 6.6], anim: credKick(t), frame: 0, light: [1.1, 0.92, 0.8] });
        const b = credBall(t);
        if (t < 470) K.ball(b[0], b[1], b[2], { k: 0.6, light: [1.1, 0.95, 0.85] });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      if (phase === 0) {
        // estrela cadente, o título com o brilho passando
        const sk = seg(t, 30, 60);
        if (sk > 0 && sk < 1) {
          const sx = lerp(W * 0.85, W * 0.45, sk);
          const sy = lerp(top + 30, top + 140, sk);
          const g = ctx.createLinearGradient(sx, sy, sx + 140, sy - 40);
          g.addColorStop(0, 'rgba(255,255,255,0.95)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 140, sy - 40);
          ctx.stroke();
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
        CE.cineBokeh(ctx, W, top, bot, t, 10, ['rgba(56,189,248,0.25)', 'rgba(0,245,212,0.2)'], 2);
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
        // a brasa do charuto, a fumaça e o giro do dedo do Fox
        const fe = eyeAt(K, FOX_LOBBY[0], FOX_LOBBY[1], 0);
        if (fe) {
          const bx = fe.x + 4.5 * fe.u;
          const by = fe.y + 3.2 * fe.u;
          ctx.fillStyle = '#78350f';
          ctx.fillRect(bx, by - fe.u * 0.25, fe.u * 2.7, Math.max(2, fe.u * 0.5));
          CE.cineGlow(ctx, bx + fe.u * 2.7, by, fe.u * (1.2 + Math.sin(t * 0.2) * 0.25), 'rgba(249,115,22,0.95)');
          for (let i = 0; i < 9; i++) {
            const age = (t * 0.8 + i * 14) % 120;
            ctx.fillStyle = `rgba(148,163,184,${0.22 * (1 - age / 120)})`;
            ctx.beginPath();
            ctx.arc(bx + fe.u * 3 + Math.sin(age * 0.06 + i) * fe.u * 1.3, by - age * fe.u * 0.13, fe.u * (0.6 + age * 0.024), 0, Math.PI * 2);
            ctx.fill();
          }
          if (t > 200) [-1, 1].forEach((s) => CE.cineGlow(ctx, fe.x + s * 3 * fe.u, fe.y, fe.u * 1.5, 'rgba(255,255,255,0.95)', seg(t, 200, 212)));
          const fh = handAt(fe);
          if (t > 170) CE.foxcTwirl(ctx, fh.x, fh.y - 2 * fe.u, Math.max(6, fe.u * 1.4), t);
        }
        CE.foxcGrad(ctx, 0, bot - 220, W, 220, [[0, 'rgba(2,6,23,0)'], [0.5, 'rgba(2,6,23,0.85)'], [1, 'rgba(2,6,23,0.97)']]);
        CE.foxcCredits(ctx, W * 0.27, bot - 128, [['kick', 'O PROJETO BLUE LOCK'], ['name', 'JINPACHI EGO'], ['role', 'e Anri Teieri, que acreditou primeiro']], seg(t, 30, 120), seg(t, 330, 358));
        CE.foxcCredits(ctx, W * 0.78, bot - 128, [['kick', 'O TREINADOR'], ['name', 'FOX'], ['role', 'paradeiro desconhecido']], seg(t, 180, 260), seg(t, 330, 358));
      } else {
        if (t >= 70 && t < 100) CE.drawSpeedLines(ctx, W, H, 'rgba(255,255,255,0.8)', 0.12);
        const k1 = seg(t, 120, 200);
        const o1 = seg(t, 270, 290);
        if (k1 > 0 && o1 < 1) CE.foxcGrad(ctx, 0, top, W, 260, [[0, `rgba(2,6,23,${0.75 * (1 - o1)})`], [1, 'rgba(2,6,23,0)']]);
        CE.foxcCredits(ctx, W / 2, top + 70, [['kick', 'BASEADO EM'], ['line', 'Blue Lock, de Muneyuki Kaneshiro e Yusuke Nomura'], ['gap'], ['kick', 'E VOCÊ'], ['line', 'que chutou quando todo mundo mandava passar.']], k1, o1);
        const k2 = seg(t, 300, 330);
        CE.foxcWord(ctx, 'OBRIGADO POR JOGAR!', W / 2, top + 130, 74, '#facc15', k2, 1, -0.03, W * 0.86);
        CE.foxcText(ctx, 'F  I  M', W / 2, top + 210, '900 22px "Segoe UI", sans-serif', '#f8fafc', seg(t, 360, 400));
      }
      // corte para o próximo lugar do prédio: abre do preto
      if (phase > 0 && t < 18) {
        ctx.fillStyle = `rgba(0,0,0,${1 - t / 18})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  });

  // ==========================================================================
  // 6) A ABERTURA DA COPA DO MUNDO — cerimônia no estádio, sorteio num estúdio,
  // os rivais, o túnel do prédio e o Japão entrando em campo
  // ==========================================================================
  // anel de luz (show no gramado) e feixe de holofote
  const ringCv = once(() =>
    mkCanvas(128, 128, (g) => {
      g.strokeStyle = '#ffffff';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(64, 64, 58, 0, Math.PI * 2);
      g.stroke();
    })
  );
  const beamVCv = once(() =>
    mkCanvas(32, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(255,255,255,0.7)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 32, 256);
    })
  );
  // feixe inclinado saindo de (x, z0, y) na direção (dx, 1, dy), virado para a câmera
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
    Q(v, P(T, -1, w1), P(T, 1, w1), P(B, 1, w0), P(B, -1, w0), [c[0], c[1], c[2]]);
    K._push(v, { img: beamVCv(), color, em: true, alpha });
  }
  const OPEN_TEAMS = [['jp', 'JAPÃO'], ['it', 'ITÁLIA'], ['ar', 'ARGENTINA'], ['ng', 'NIGÉRIA']];
  const OPEN_RIVALS = [
    ['lorenzo', 'it', 'ITÁLIA', 'a muralha de Don Lorenzo', '#1d4ed8'],
    ['gen_argentina_fw', 'ar', 'ARGENTINA', 'a camisa mais pesada do grupo', '#7dd3fc'],
    ['gen_nigeria_fw', 'ng', 'NIGÉRIA', 'a velocidade que assusta', '#22c55e']
  ];
  const openChars = perRun(() => ({
    tun: CE.japanSquad(['sae', 'rin', 'shidou', 'bachira', 'nagi', 'chigiri']),
    ent: CE.japanSquad(['sae', 'rin', 'shidou', 'bachira', 'nagi', 'chigiri', 'gagamaru']),
    rivals: OPEN_RIVALS.map(([id]) => CE.cineChar(id))
  }));
  // a cerimônia: gente com as cores das seleções em roda no meio do campo
  const PERF = ['#1d4ed8', '#dc2626', '#16a34a', '#facc15', '#38bdf8', '#f8fafc', '#7dd3fc', '#f97316'];
  const perfChars = once(() => {
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    return Array.from({ length: 16 }, (_, i) => ({ name: 'abertura' + i, skinColor: skins[i % skins.length], hairColor: '#1b2340', hairSecondary: '#1b2340', eyeColor: '#1e293b', hairStyle: hairs[(i * 5) % hairs.length], jerseyPrimary: PERF[i % PERF.length], jerseySecondary: '#ffffff', number: i + 1 }));
  });
  // estúdio do sorteio: telão de LED, o pote de vidro e o quadro do Grupo E
  const ledCv = once(() => mkCanvas(260, 140, () => {}));
  const potCv = once(() => mkCanvas(128, 140, () => {}));
  const boardCv = once(() => mkCanvas(512, 384, () => {}));
  const BOARD = { x: 88.4, y: 14.2, w: 4.6, h: 3.45, z: 0.55 };
  function drawLed(t) {
    const g = ledCv().getContext('2d');
    g.fillStyle = '#020617';
    g.fillRect(0, 0, 260, 140);
    for (let r = 0; r < 14; r++) {
      for (let c = 0; c < 26; c++) {
        const sweep = Math.abs(((c * 0.6 + r * 0.3 - t * 0.25) % 16) - 8);
        g.fillStyle = sweep < 1.2 ? 'rgba(56,189,248,0.85)' : 'rgba(30,58,138,0.55)';
        g.fillRect(c * 10 + 1, r * 10 + 1, 8, 8);
      }
    }
  }
  function drawPot(t) {
    const g = potCv().getContext('2d');
    g.clearRect(0, 0, 128, 140);
    const px = 64;
    const py = 64;
    const balls = ['#facc15', '#f8fafc', '#38bdf8', '#ef4444', '#22c55e', '#f8fafc', '#facc15', '#7dd3fc', '#f8fafc', '#ef4444', '#22c55e', '#38bdf8'];
    balls.forEach((col, i) => {
      const a = i * 2.3 + t * 0.03 * (i % 2 ? 1 : -1);
      const rr = 12 + hash(i, 2) * 26;
      g.fillStyle = col;
      g.beginPath();
      g.arc(px + Math.cos(a) * rr, py + 12 + Math.sin(a) * rr * 0.6, 8, 0, Math.PI * 2);
      g.fill();
    });
    const glass = g.createRadialGradient(px - 18, py - 22, 4, px, py, 56);
    glass.addColorStop(0, 'rgba(255,255,255,0.45)');
    glass.addColorStop(0.6, 'rgba(186,230,253,0.12)');
    glass.addColorStop(1, 'rgba(186,230,253,0.35)');
    g.fillStyle = glass;
    g.beginPath();
    g.arc(px, py, 54, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(186,230,253,0.8)';
    g.lineWidth = 2;
    g.stroke();
  }
  function drawBoard(t) {
    const g = boardCv().getContext('2d');
    const w = 512;
    const h = 384;
    g.fillStyle = '#050a1c';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#facc15';
    g.lineWidth = 4;
    g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = '#facc15';
    g.fillRect(0, 0, w, 70);
    CE.foxcText(g, 'SORTEIO • FASE DE GRUPOS', w / 2, 18, '900 13px "Segoe UI", sans-serif', '#422006', 1, 'center', true);
    CE.foxcText(g, 'GRUPO E', w / 2, 48, 'italic 900 34px "Segoe UI", sans-serif', '#020617');
    const rowH = (h - 90) / 4;
    OPEN_TEAMS.forEach(([code, nm], i) => {
      const at = 22 + i * 34;
      const ry = 82 + i * rowH;
      g.fillStyle = '#16203a';
      g.fillRect(14, ry, w - 28, rowH - 10);
      CE.foxcText(g, `${i + 1}`, 40, ry + (rowH - 10) / 2, '900 24px "Segoe UI", sans-serif', '#475569');
      const k = back(seg(t, at + 12, at + 26));
      if (k > 0) {
        g.save();
        g.globalAlpha = clamp(k);
        g.translate((1 - k) * 90, 0);
        const hl = code === 'jp';
        if (hl) {
          g.fillStyle = `rgba(250,204,21,${0.2 + 0.1 * Math.sin(t * 0.15)})`;
          g.fillRect(14, ry, w - 28, rowH - 10);
          g.strokeStyle = '#facc15';
          g.lineWidth = 3;
          g.strokeRect(14, ry, w - 28, rowH - 10);
        }
        CE.foxcFlag(g, code, 66, ry + 8, 84, rowH - 26, t + i * 10, 0.06);
        CE.foxcText(g, nm, 172, ry + (rowH - 10) / 2, 'italic 900 32px "Segoe UI", sans-serif', hl ? '#facc15' : '#f8fafc', 1, 'left');
        g.restore();
      }
    });
  }
  // ponto do quadro (px do canvas) no mundo
  const boardAt = (px, py) => [BOARD.x - BOARD.w / 2 + (px / 512) * BOARD.w, BOARD.z + BOARD.h - (py / 384) * BOARD.h];
  const POT = [82.4, 15.3];
  // o túnel: o time andando para a luz (posição de cada um na formação)
  const TUN = [[1, 0.9, 14.15], [2, 0.75, 14.95], [3, 0.25, 13.6], [4, 0.15, 15.4], [5, -0.45, 14.05], [6, -0.55, 15.0], [0, -1.15, 14.5]];
  const tunX = (t) => 37.0 + t * 0.012;
  const LINEUP = [[7, 0.0, 0.95], [5, 0.2, 0.84], [6, -0.22, 0.76], [4, 0.3, 0.62], [3, -0.32, 0.54], [2, 0.36, 0.36], [1, -0.36, 0.3], [0, 0.0, 0.1]];

  reg3d('wc_opening', {
    phases: [190, 200, 180, 200, 190],
    music: 'epic',
    title: '🌍 A ABERTURA DA COPA DO MUNDO',
    tags: ['PLANO 1 • A CERIMÔNIA', 'PLANO 2 • O SORTEIO', 'PLANO 3 • OS RIVAIS', 'PLANO 4 • O TÚNEL', 'PLANO 5 • O JAPÃO ENTRA EM CAMPO'],
    subs: [
      [{ from: 16, who: 'NARRADOR MUNDIAL', text: '"Boa noite, planeta!"', color: '#facc15' }],
      [{ from: 10, who: 'NARRADOR MUNDIAL', text: '"E o sorteio do Grupo E..."', color: '#facc15' }],
      [{ from: 10, who: 'NARRADOR MUNDIAL', text: '"É o grupo da morte!"', color: '#facc15' }],
      [{ from: 6, who: 'SAE ITOSHI', text: '"Hoje o mundo aprende o nosso nome."', color: '#f87171' }],
      [{ from: 20, who: 'VOCÊ', text: '"Ninguém aqui veio participar."', color: YOU_COLOR }]
    ],
    grain: 0,
    theme: 'worldcup_final',
    scene(K, S) {
      const { t, phase } = S;
      const oc = openChars();
      if (phase === 0) {
        // a cerimônia: a câmera voa alto em volta do campo, show de luz no gramado
        K.sky('#01030a', '#0f1d3d', 1);
        const e = easeIO(seg(t, 0, 190));
        const a = lerp(1.15, 1.95, e);
        K.cam([53 + Math.cos(a) * 6.6, lerp(5.6, 4.2, e), 14.5 + Math.sin(a) * 6.6], [53, 0, 14.2], lerp(52, 46, e));
        const lc = ['#dc2626', '#1d4ed8', '#16a34a', '#facc15', '#38bdf8'];
        for (let i = 0; i < 5; i++) {
          const age = (t * 1.4 + i * 22) % 110;
          const r = 0.4 + age * 0.06;
          K.floor({ x0: 53 - r, y0: 14.5 - r, x1: 53 + r, y1: 14.5 + r, z: 0.02 + i * 0.002, img: ringCv(), color: lc[i], em: true, alpha: 0.6 * (1 - age / 110) });
        }
        const led = ['#00f5d4', '#facc15', '#f472b6', '#38bdf8'][Math.floor(t / 30) % 4];
        K.box({ x0: 45.12, y0: 7.2, x1: 45.24, y1: 21.8, z0: 0, z1: 0.28, color: led, em: true });
        K.box({ x0: 60.76, y0: 7.2, x1: 60.88, y1: 21.8, z0: 0, z1: 0.28, color: led, em: true });
        const bc = ['#93c5fd', '#fde047', '#ffffff', '#f472b6'];
        [[45.3, 6.3], [60.7, 6.3], [45.3, 22.7], [60.7, 22.7]].forEach(([x, y], i) => {
          const sw = Math.sin(t * 0.02 + i * 1.7) * 0.5;
          beam(K, x, y, 3.4, (x < 53 ? 0.25 : -0.25) + sw * 0.4, (y < 14 ? 0.2 : -0.2) + sw * 0.25, 9, 0.12, 0.9, bc[i], 0.5);
        });
        perfChars().forEach((cd, i) => {
          const an = (i / 16) * Math.PI * 2 + t * 0.004;
          K.actor(cd, { id: 'c' + i, x: 53 + Math.cos(an) * 2.6, y: 14.5 + Math.sin(an) * 2.6, face: [53, 14.5], anim: 'call_pass', frame: 0, left: i % 2 === 1, k: 0.85 });
        });
      } else if (phase === 1) {
        // o sorteio: estúdio montado no vazio
        K.sky('#020617', '#0b1d4d', 0);
        K.fog('#030712', 0.04);
        K.ambient('#8494c4');
        K.expo(0.95);
        const e = easeIO(t / 200);
        K.cam(mix([85.5, 1.65, 21.6], [85.8, 1.55, 20.5], e), [86.1, 1.85, 14.0], 46);
        if (S.f % 3 === 0 || !this._led3d) drawLed(t);
        this._led3d = true;
        drawPot(t);
        drawBoard(t);
        K.floor({ x0: 76, y0: 9, x1: 96, y1: 26, color: '#0a1022' });
        K.quad({ x: 85.6, y: 11.6, w: 13, h: 7, ang: Math.PI / 2, img: ledCv(), em: true, dirty: S.f % 3 === 0 });
        K.box({ x0: POT[0] - 0.35, y0: POT[1] - 0.35, x1: POT[0] + 0.35, y1: POT[1] + 0.35, z0: 0, z1: 0.72, color: '#0f172a', top: '#334155' });
        faceCam(K, { x: POT[0], y: POT[1], z: 0.72, w: 1.0, h: 1.1, img: potCv(), dirty: true });
        K.box({ x0: BOARD.x - BOARD.w / 2 - 0.1, y0: BOARD.y - 0.2, x1: BOARD.x + BOARD.w / 2 + 0.1, y1: BOARD.y - 0.02, z0: 0, z1: BOARD.z + BOARD.h + 0.1, color: '#1e293b' });
        K.quad({ x: BOARD.x, y: BOARD.y, z: BOARD.z, w: BOARD.w, h: BOARD.h, ang: -Math.PI / 2, img: boardCv(), em: true, dirty: true });
        // a bolinha saindo do pote até a linha do quadro
        const rowH = (384 - 90) / 4;
        OPEN_TEAMS.forEach((tm, i) => {
          const at = 22 + i * 34;
          const k = seg(t, at, at + 14);
          if (k <= 0 || k >= 1) return;
          const [bx, bz] = boardAt(108, 82 + i * rowH + (rowH - 10) / 2);
          K.ball(lerp(POT[0], bx, k), lerp(POT[1], BOARD.y + 0.05, k), lerp(1.3, bz, k) + Math.sin(k * Math.PI) * 0.8, { k: 0.55, light: [1.2, 1.2, 1.2] });
        });
      } else if (phase === 2) {
        // os rivais: cada um na frente de um telão com a bandeira; a câmera passa por eles
        K.sky('#01030a', '#0f1d3d', 0.8);
        K.expo(0.92);
        const cx = lerp(48.4, 57.6, easeIO(t / 180));
        K.cam([cx, 0.72, 16.6], [cx + 0.35, 0.62, 12.6], 40);
        OPEN_RIVALS.forEach(([id, code, , , col], i) => {
          const x = 49.8 + i * 3.2;
          K.box({ x0: x - 1.15, y0: 11.0, x1: x + 1.15, y1: 11.2, z0: 0, z1: 1.55, img: CE.foxcFlagCanvas(code), em: true, color: '#9aa4b8' });
          K.floor({ x0: x - 1.2, y0: 11.6, x1: x + 1.2, y1: 14.0, img: glowCv(col === '#1d4ed8' ? '96,165,250' : col === '#7dd3fc' ? '186,230,253' : '134,239,172'), em: true, alpha: 0.35 });
          K.actor(oc.rivals[i], { x, y: 12.8, face: cam2(K), frame: 0, light: [1.05, 1.05, 1.1] });
        });
      } else if (phase === 3) {
        // o túnel do prédio: o time de costas, andando para a saída acesa do campo
        K.expo(0.95);
        const tx = tunX(t);
        K.cam([tx - 3.4, 0.82, 14.5 + Math.sin(t * 0.05) * 0.04], [44.5, 0.8, 14.5], 46);
        K.quad({ x: 44.08, y: 14.5, z: 0, w: 1.0, h: 1.6, ang: Math.PI, color: '#f8fafc', em: true });
        K.floor({ x0: 41.4, y0: 13.2, x1: 44.0, y1: 15.8, img: glowCv('219,234,254'), em: true, alpha: 0.4 });
        TUN.forEach(([idx, dx, y], i) => {
          const ch = oc.tun[idx];
          if (!ch) return;
          K.actor(ch, { id: 'tunel', x: tx + dx, y, face: [45, y], anim: 'run', frame: Math.floor(t * 0.55) + i * 5, light: [0.42, 0.48, 0.62] });
        });
      } else {
        // o Japão entra em campo: saindo do túnel e correndo para a câmera
        K.sky('#01030a', '#0f1d3d', 0.8);
        const e = easeIO(t / 190);
        K.cam([lerp(50.2, 49.6, e), lerp(0.7, 0.85, e), 14.6], [44.6, 0.85, 14.5], 50);
        K.quad({ x: 45.02, y: 11.4, z: 0.25, w: 2.6, h: 1.5, ang: 0, img: CE.foxcFlagCanvas('jp'), em: true, color: '#c0c8d8' });
        K.quad({ x: 45.02, y: 17.6, z: 0.25, w: 2.6, h: 1.5, ang: 0, img: CE.foxcFlagCanvas('jp'), em: true, color: '#c0c8d8' });
        LINEUP.forEach(([idx, ox, z0], i) => {
          const ch = oc.ent[idx];
          if (!ch) return;
          const z = clamp(z0 + 0.18 - e * 0.18);
          const x = lerp(48.3, 44.7, z);
          const y = 14.5 + ox * lerp(2.6, 0.7, z);
          const you = idx === 0;
          K.actor(ch, { id: you && t > 120 ? 'aura' : 'entra', x, y, face: [x + 1, y], anim: 'run', frame: Math.floor(t * 0.5) + i * 4, light: [1.0, 1.0, 1.05], opts: you && t > 120 ? { showAura: true, auraColor: '#38bdf8' } : ch.id === 'sae' ? { accessories: ['captain_armband'] } : undefined });
        });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      if (phase === 0) {
        for (let i = 0; i < 40; i++) {
          if ((Math.floor(t / 4) + i * 7) % 13 > 1) continue;
          CE.cineGlow(ctx, hash(i, 4) * W, top + 20 + hash(i, 5) * (bot - top) * 0.45, 12, 'rgba(255,255,255,0.9)');
        }
        CE.foxcFireworks(ctx, W, top + 40, H * 0.36, t, 6, ['#facc15', '#ef4444', '#38bdf8', '#f8fafc', '#22c55e'], 8, 84, 0.9);
        CE.cineTitleCard(ctx, W, top + 120, seg(t, 70, 100), { kicker: 'CERIMÔNIA DE ABERTURA', title: 'COPA DO MUNDO', sub: '48 seleções • 1 troféu', color: '#facc15' });
      } else if (phase === 1) {
        OPEN_TEAMS.forEach((tm, i) => CE.cineSfx(S, 22 + i * 34 + 14, `sorteio${i}`, () => window.SFX?.blip?.(520 + i * 90)));
        const pp = K.screen(POT[0], 1.3, POT[1]);
        if (pp) CE.cineGlow(ctx, pp.x, pp.y, 70, 'rgba(186,230,253,0.25)');
        CE.foxcWord(ctx, 'ESTREIA: JAPÃO x ITÁLIA', W * 0.22, top + 60, 28, '#facc15', seg(t, 168, 182), 1, -0.04, W * 0.36);
      } else if (phase === 2) {
        const cx = lerp(48.4, 57.6, easeIO(t / 180));
        OPEN_RIVALS.forEach(([, , nm, tag, col], i) => {
          const x = 49.8 + i * 3.2;
          const k = seg(cx, x - 2.0, x - 1.4);
          const p = K.screen(x, 1.2, 12.8);
          if (!p || k <= 0) return;
          CE.foxcWord(ctx, nm, p.x, p.y - 34, 50, col, k, 1, -0.06, 330);
          CE.foxcText(ctx, tag, p.x, p.y + 6, 'italic 700 17px "Segoe UI", sans-serif', '#e2e8f0', seg(cx, x - 1.8, x - 1.2));
        });
      } else if (phase === 3) {
        const d = K.screen(44.1, 0.8, 14.5);
        if (d) {
          CE.cineGlow(ctx, d.x, d.y, 320, 'rgba(219,234,254,0.55)');
          CE.foxcText(ctx, 'WOOOOOOOOH', d.x, d.y - 130, 'italic 900 26px "Segoe UI", sans-serif', '#e2e8f0', seg(t, 60, 80) * (0.7 + 0.3 * Math.sin(t * 0.3)), 'center', true);
        }
        CE.cineDust(ctx, W, H, t, 30, 'rgba(226,232,240,0.5)', 2);
      } else {
        for (let i = 0; i < 26; i++) {
          if ((t + i * 11) % 29 > 2) continue;
          CE.cineGlow(ctx, hash(i, 6) * W, top + 30 + hash(i, 7) * H * 0.3, 24, 'rgba(255,255,255,0.9)');
        }
        CE.drawConfetti(ctx, W, H, t, 40);
        CE.foxcGrad(ctx, 0, top, W, 200, [[0, 'rgba(2,6,23,0.85)'], [1, 'rgba(2,6,23,0)']]);
        CE.cineTitleCard(ctx, W, top + 100, seg(t, 100, 126), { kicker: 'COPA DO MUNDO • GRUPO E', title: 'O JAPÃO ENTRA EM CAMPO', sub: '', color: '#38bdf8' });
      }
    }
  });
})();
