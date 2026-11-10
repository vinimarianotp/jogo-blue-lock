// ============================================================================
// CUTSCENES EM 3D — o rival mortal (js/cine_rin.js) e a engrenagem do Hugo
// (js/cine_hugo.js) refeitas no prédio. Kit: js/cine3d_kit.js.
// Mesmos planos, tempos e legendas da versão 2D:
//   sae_interview • a coletiva do Sae: o saguão vira a sala de imprensa do Estádio
//                   Nacional → o SEU nome → o Rin ouvindo pela TV do corredor → CRACK
//   rin_rival     • o vestiário: o Rin sentado com a toalha → "pra nós dois?" → o olho →
//                   a aura → "VOCÊ É O MEU RIVAL."
//   hugo_gears    • a final da Copa Sub-20 no campo: o Hugo, você sem entender, o rosto
//                   que vira engrenagem e o olho do Fluxo
// Aqui os pontos são [x, y, z] (z = altura). Os olhos em close vão no overlay.
// ============================================================================
(function () {
  const CE = window.CutsceneEngine;
  if (!CE || !CE.registerCine3D) return;
  const Hub = window.Hub;

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
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };

  const RIN_C = '#22d3ee';
  const SAE_C = '#f9a8d4';
  const YOU_C = '#00f5d4';
  const NARR_C = '#94a3b8';
  const REP_C = '#facc15';
  const PINK = '#ec4899';
  const ICE = '#7dd3fc';
  const PAPER = '#eef2f7';
  const INK = '#0b0f19';

  // ---------------------------------------------------------------- ajudantes 3D
  const cam = (K, e, l, fov) => K.cam([e[0], e[2], e[1]], [l[0], l[2], l[1]], fov);
  // (o kit guarda os bonecos pelo nome: boneco sem nome ganha um, senão dois sem nome viram o mesmo)
  const act = (K, who, p, o = {}) => {
    if (who && typeof who === 'object' && !who.name) who = Object.assign({}, who, { name: '_' + (o.id || '') });
    return K.actor(who, Object.assign({ x: p[0], y: p[1], z: p[2] || 0 }, o));
  };
  const scr = (K, p) => K.screen(p[0], p[2] || 0, p[1]);
  const shake = (K, p, f, amp, seed = 1) => [p[0] + K.noise(f, seed) * amp, p[1] + K.noise(f, seed + 3) * amp, p[2] + K.noise(f, seed + 7) * amp * 0.7];
  // os dois olhos de quem está em p (altura z) vistos da câmera: [esquerda, direita] na tela
  // e quantos px da tela vale 1 unidade da pixel art do boneco (para desenhar olho/gota)
  const UNIT = 0.0273; // 1 unidade da pixel art em ladrilhos (boneco k 0,9)
  const eyesAt = (K, p, z) => {
    const c = K.c;
    let rx = -(c.look[2] - c.eye[2]);
    let ry = c.look[0] - c.eye[0];
    const l = Math.hypot(rx, ry) || 1;
    rx /= l;
    ry /= l;
    const a = scr(K, [p[0] - rx * 3.5 * UNIT, p[1] - ry * 3.5 * UNIT, z]);
    const b = scr(K, [p[0] + rx * 3.5 * UNIT, p[1] + ry * 3.5 * UNIT, z]);
    if (!a || !b) return null;
    const L = a.x < b.x ? a : b;
    const R = a.x < b.x ? b : a;
    return { L, R, u: Math.abs(R.x - L.x) / 7, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  // A cena guarda pontos do MUNDO e o overlay projeta na tela (a matriz da câmera, K.VP,
  // só fica pronta depois do desenho 3D): wp = um ponto, eyesW = os dois olhos de alguém
  const wp = (p) => (p ? { __w: p } : null);
  const eyesW = (p, z) => ({ __eyes: [p, z] });
  const resolve = (K, v) => {
    if (!v || typeof v !== 'object') return v;
    if (v.__w) return K.screen(v.__w[0], v.__w[2] || 0, v.__w[1]);
    if (v.__eyes) return eyesAt(K, v.__eyes[0], v.__eyes[1]);
    if (Array.isArray(v)) return v.map((x) => resolve(K, x)).filter((x, i) => x !== null || !(v[i] && v[i].__w));
    const o = {};
    for (const k in v) o[k] = resolve(K, v[k]);
    return o;
  };

  // Os bonecos em pé (billboards) viram para Hub.camA (a câmera do mapa), não para a
  // câmera da cena: durante o quadro da cena o Hub.camA aponta para onde a câmera da cena
  // olha e volta ao valor de antes logo depois (no overlay, que roda após o desenho 3D)
  // No mesmo quadro somem as bolas e os cones soltos do mapa (bola de treino no meio do
  // campo, cones): numa partida de verdade eles confundiam com a bola do lance.
  const W3 = Hub && Hub._3d && Hub._3d.World;
  let camA0 = null;
  let spr0 = null;
  let key0 = '';
  const restoreCam = () => {
    if (camA0 !== null && Hub) Hub.camA = camA0;
    // (se o desenho trocou o tema, o prédio já montou uma lista nova: fica a nova)
    if (spr0 && W3 && W3.key === key0) W3.sprites = spr0;
    camA0 = null;
    spr0 = null;
  };
  const faceCam = (K) => {
    const c = K.c;
    if (!Hub || !c || !c.eye || !c.look) return;
    const dx = c.look[0] - c.eye[0];
    const dy = c.look[2] - c.eye[2];
    if (Math.abs(dx) + Math.abs(dy) < 1e-4) return;
    if (camA0 === null) {
      camA0 = Hub.camA;
      setTimeout(restoreCam, 0); // (garantia: volta mesmo se o overlay não rodar)
    }
    Hub.camA = Math.atan2(dy, dx);
    if (!spr0 && W3 && Array.isArray(W3.sprites)) {
      spr0 = W3.sprites;
      key0 = W3.key;
      W3.sprites = spr0.filter((s) => s.key !== 'ball' && s.key !== 'cone');
    }
  };
  const reg = (type, def) => {
    const sc = def.scene;
    const ov = def.overlay;
    def.scene = function (K, S) {
      sc.call(this, K, S);
      faceCam(K);
    };
    def.overlay = function (ctx, S, K) {
      restoreCam();
      if (ov) ov.call(this, ctx, S, K);
    };
    CE.registerCine3D(type, def);
  };

  // figurantes da imprensa (repórteres e fotógrafos de terno), montados uma vez
  let PRESS = null;
  const press = () => {
    if (PRESS) return PRESS;
    const A = window.App || {};
    const hairs = (A.CREATOR_HAIR || [['isagi']]).map((h) => h[0]);
    const skins = A.CREATOR_SKIN || ['#f3d1b8'];
    const cols = ['#111827', '#1f2937', '#3f2a1d', '#0f172a', '#52525b', '#78350f'];
    const suits = ['#1f2937', '#111827', '#334155', '#3f3f46', '#1e293b'];
    let s = 11;
    const r = (n) => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) % n);
    PRESS = [];
    const rows = [[11.75, 21.7, 28.4, 0.68], [12.5, 21.4, 28.7, 0.74], [13.05, 20.8, 29.3, 0.8]];
    rows.forEach(([y, x0, x1, step], row) => {
      for (let x = x0 + (row % 2) * 0.3; x <= x1; x += step) {
        if (row === 2 && x > 23.7 && x < 26.3) continue; // a mesinha do saguão
        const hc = cols[r(cols.length)];
        PRESS.push({ x, y: y + (r(10) - 5) * 0.02, row, cam: r(3) === 0, cd: { name: 'reporter' + PRESS.length, skinColor: skins[r(skins.length)], hairColor: hc, hairSecondary: hc, eyeColor: '#1e293b', hairStyle: hairs[r(hairs.length)], outfit: 'casual', jerseyPrimary: suits[r(suits.length)], jerseySecondary: '#e5e7eb', number: 1 } });
      }
    });
    return PRESS;
  };

  // painel de fundo da coletiva (logotipos repetidos), pronto uma vez
  let WALL = null;
  const pressWall = () => {
    if (WALL) return WALL;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 96;
    const g = cv.getContext('2d');
    // (a placa virada para o sul mostra a textura espelhada: desenha espelhado)
    g.translate(256, 0);
    g.scale(-1, 1);
    g.fillStyle = '#0b1d4d';
    g.fillRect(0, 0, 256, 96);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
        const x = 26 + col * 51 + (row % 2) * 25;
        const y = 12 + row * 24;
        const k = (row + col) % 3;
        g.fillStyle = k === 0 ? '#ef4444' : k === 1 ? '#f8fafc' : '#60a5fa';
        g.font = '900 9px "Segoe UI", sans-serif';
        g.fillText(k === 0 ? 'JFU' : k === 1 ? 'JAPAN' : 'SUB-20', x, y);
      }
    }
    g.fillStyle = '#ef4444';
    g.fillRect(0, 92, 256, 4);
    WALL = cv;
    return cv;
  };

  // a TV do corredor (a coletiva ao vivo com o seu nome na tarja), pronta por nome
  let TV = null;
  const tvCv = (name) => {
    if (TV && TV.key === name) return TV;
    const cv = TV || document.createElement('canvas');
    cv.width = 240;
    cv.height = 170;
    const g = cv.getContext('2d');
    g.setTransform(-1, 0, 0, 1, 240, 0); // (espelhado, como o painel)
    g.fillStyle = '#05070c';
    g.fillRect(0, 0, 240, 170);
    try {
      g.imageSmoothingEnabled = true;
      g.drawImage(CE.finBg('rinc_feed', 1280, 720, CE.rincFeed), 400, 240, 480, 340, 0, 0, 240, 170);
    } catch (e) {}
    g.fillStyle = 'rgba(2,6,23,0.88)';
    g.fillRect(0, 136, 240, 34);
    g.fillStyle = '#ef4444';
    g.fillRect(0, 136, 52, 14);
    g.font = '900 9px "Segoe UI", sans-serif';
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillStyle = '#ffffff';
    g.fillText('AO VIVO', 6, 143.5);
    g.font = '900 10px "Segoe UI", sans-serif';
    g.fillText(`SAE ITOSHI: "...${name}."`, 6, 159, 228);
    g.fillStyle = 'rgba(56,189,248,0.08)';
    for (let y = 0; y < 170; y += 3) g.fillRect(0, y, 240, 1);
    cv.key = name;
    cv.fresh = true;
    TV = cv;
    return cv;
  };

  // A sala de imprensa no saguão: palco, painel, mesa com microfones e a imprensa
  const SAE_AT = [25, 10.1];
  function pressRoom(K, S, o = {}) {
    K.quad({ x: 25, y: 9.12, z: 0, w: 4.4, h: 1.6, ang: Math.PI / 2, img: pressWall() });
    K.box({ x0: 22.9, y0: 9.15, x1: 27.1, y1: 10.95, z0: 0, z1: 0.2, color: '#0b1220', top: '#152238' });
    K.box({ x0: 23.6, y0: 10.38, x1: 26.4, y1: 10.82, z0: 0.2, z1: 0.6, color: '#0b1d4d', top: '#e2e8f0' });
    K.floor({ x0: 23.6, y0: 10.81, x1: 26.4, y1: 10.83, z: 0.2, color: '#ef4444', em: true });
    // microfones (haste + cabeça colorida com o logo da TV)
    [[24.45, '#ef4444'], [24.7, '#38bdf8'], [25.3, '#facc15'], [25.55, '#22c55e'], [25.78, '#f8fafc']].forEach(([x, col], i) => {
      const y = 10.5 + (i % 2) * 0.05;
      K.box({ x0: x - 0.01, y0: y - 0.01, x1: x + 0.01, y1: y + 0.01, z0: 0.6, z1: 0.66, color: '#111827' });
      K.box({ x0: x - 0.03, y0: y - 0.03, x1: x + 0.03, y1: y + 0.03, z0: 0.64, z1: 0.7, color: col, top: '#1f2937' });
    });
    // câmeras de TV nos tripés, nos cantos
    [[21.6, 12.1], [28.4, 12.1]].forEach(([x, y]) => {
      K.box({ x0: x - 0.03, y0: y - 0.03, x1: x + 0.03, y1: y + 0.03, z0: 0, z1: 0.85, color: '#111827' });
      K.box({ x0: x - 0.12, y0: y - 0.18, x1: x + 0.12, y1: y + 0.16, z0: 0.85, z1: 1.02, color: '#1f2937', top: '#374151' });
    });
    act(K, CE.rincCast().sae, [SAE_AT[0], SAE_AT[1], 0.2], { id: 'sae', face: [25, 16], frame: o.saeFrame ?? 1, light: o.saeLight, view: o.saeView });
    if (o.noCrowd) return;
    press().forEach((p, i) => act(K, p.cd, [p.x, p.y, 0], { id: 'p' + i, face: [25 + (p.x - 25) * 0.3, 10.1], frame: 0, k: 0.86, light: o.crowdLight }));
  }

  // =========================================================================
  // 1) A COLETIVA DO SAE (sae_interview)
  // =========================================================================
  let SRC = null; // o close do Rin congelado na hora da rachadura (vira os cacos)
  let SRC_KEY = '';
  reg('sae_interview', {
    phases: [190, 180, 180, 170, 230],
    music: 'dread',
    title: '🎤 A COLETIVA DO SAE',
    tags: ['PLANO 1 • CEM CÂMERAS', 'PLANO 2 • AO VIVO', 'PLANO 3 • O NOME', 'PLANO 4 • O CORREDOR', 'PLANO 5 • CRACK'],
    get subs() {
      const nm = CE.cinePlayerName().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
      const nameNeed = 30 + `SAE ITOSHI "${nm}."`.length * 3.4;
      const ask = 84 + nameNeed <= 180;
      return [
        [{ from: 0, who: 'REPÓRTER', text: '"Alguém do Blue Lock te impressionou?"', color: REP_C }],
        [{ from: 20, who: 'SAE ITOSHI', text: '"...Tem um. Muito bom."', color: SAE_C }],
        ask
          ? [
              { from: 0, to: 80, who: 'REPÓRTER', text: '"Quem?"', color: REP_C },
              { from: 84, who: 'SAE ITOSHI', text: `"${nm}."`, color: SAE_C }
            ]
          : [{ from: Math.max(0, Math.min(80, Math.floor(180 - nameNeed))), who: 'SAE ITOSHI', text: `"${nm}."`, color: SAE_C }],
        [{ from: 10, who: 'NARRADOR', text: 'O irmão disse outro nome.', color: NARR_C }],
        [
          { from: 0, to: 72, who: 'RIN ITOSHI', text: '"...o quê?"', color: RIN_C },
          { from: 100, who: 'NARRADOR', text: 'Algo se partiu.', color: NARR_C }
        ]
      ];
    },
    grain: 0,
    vignette: 0.6,
    theme: 'u20_national',
    scene(K, S) {
      const { t, phase, f } = S;
      const { rin } = CE.rincCast();
      const st = (K.st = {});
      if (phase === 0) {
        // cem câmeras: a grua entra por cima da imprensa até a mesa
        K.expo(0.85);
        pressRoom(K, S);
        const k = easeIO(t / 190);
        cam(K, shake(K, mixP([25.4, 18.4, 1.6], [25.15, 15.1, 1.45], k), f * 0.4, 0.006), mixP([25, 10.4, 0.5], [25, 10.1, 0.62], k), lerp(46, 34, k));
        st.pops = press().filter((p) => p.cam).map((p) => [wp([p.x, p.y, 0.95]), p.row === 2 ? 9 : 7]);
      } else if (phase === 1) {
        // pelo visor da câmera de TV: o Sae frio, de perto
        K.expo(0.8);
        pressRoom(K, S, { noCrowd: true, saeLight: [1.05, 1.15, 1.3] });
        const nx = K.noise(t * 0.5, 3) * 0.012;
        const ny = K.noise(t * 0.5, 8) * 0.008;
        const k = easeIO(t / 180);
        cam(K, [25.3 + nx, lerp(12.45, 12.3, k), 0.76 + ny], [25.02, 10.1, 0.68], 32);
        st.face = wp([SAE_AT[0], SAE_AT[1], 0.2 + 0.6]);
      } else if (phase === 2) {
        const hit = 80;
        if (t < hit) {
          // o silêncio: o Sae de perto, no escuro (os olhos vão na faixa do overlay)
          K.expo(0.6);
          pressRoom(K, S, { noCrowd: true, saeLight: [0.95, 1.05, 1.25] });
          cam(K, shake(K, [24.85, 11.9, 0.66], f * 0.3, 0.003), [25.0, 10.1, 0.66], 32);
        } else {
          // O NOME: por trás do Sae, a imprensa inteira de pé com as câmeras disparando
          K.expo(0.95);
          pressRoom(K, S, { saeView: 'back', crowdLight: [1.1, 1.12, 1.2] });
          const u = t - hit;
          cam(K, shake(K, [23.35, 10.45, 1.25], f * 2, 0.02 * (1 - seg(u, 0, 26)), 4), [25.7, 13.2, 0.5], lerp(52, 48, easeIO(u / 100)));
          st.crowd = press().map((p) => wp([p.x, p.y, 0.95]));
        }
      } else if (phase === 3) {
        // o corredor: a TV na parede... e o Rin parado no escuro, assistindo
        K.expo(0.55);
        const tvP = [37.5, 13.04];
        K.box({ x0: 37.0, y0: 13.0, x1: 38.0, y1: 13.04, z0: 0.78, z1: 1.42, color: '#05070c' });
        const tv = tvCv(CE.cinePlayerName());
        K.quad({ x: tvP[0], y: tvP[1] + 0.005, z: 0.82, w: 0.92, h: 0.52, ang: Math.PI / 2, img: tv, em: true, dirty: !!tv.fresh });
        tv.fresh = false;
        const flick = 0.9 + 0.1 * Math.sin(t * 0.07);
        K.floor({ x0: 36.6, y0: 13.1, x1: 39.6, y1: 15.2, z: 0.01, color: '#38bdf8', em: true, alpha: 0.06 * flick });
        const rp = [39.5, 14.3, 0];
        act(K, rin, rp, { id: 'rin', face: tvP, frame: 1, light: [0.42 * flick, 0.58 * flick, 0.82 * flick] });
        const k = easeIO(seg(t, 34, 150));
        cam(K, mixP([38.15, 14.75, 1.0], [40.6, 15.85, 0.82], k), mixP([37.5, 13.05, 1.08], [38.6, 13.6, 0.82], k), lerp(36, 44, k));
      } else {
        // CRACK: o rosto do Rin iluminado pela TV (o vidro e os cacos vão no overlay)
        K.expo(0.55);
        const crackAt = 74;
        const tt = Math.min(t, crackAt);
        const rp = [39.5, 14.3, 0];
        act(K, rin, rp, { id: 'rin', face: [37.5, 13.04], frame: 1, light: [0.6, 0.78, 1.0], opts: { expr: tt > 26 ? 'angry' : undefined } });
        const z = 1 + easeIO(tt / 74) * 0.07;
        const dir = [-0.846, -0.533];
        const d = 1.9 / z;
        cam(K, [rp[0] + dir[0] * d, rp[1] + dir[1] * d, 0.6], [rp[0], rp[1], 0.56], 32);
        st.eyes = eyesW(rp, 0.556);
        st.temple = wp([rp[0], rp[1], 0.66]);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const { sae, rin } = CE.rincCast();
      const st = resolve(K, K.st || {});
      if (phase === 0) {
        if (st.pops) CE.rincPops(ctx, st.pops.filter((a) => a[0]).map(([s, r]) => [s.x, s.y, r]), t, 11, 70, 6);
        CE.finKicker(ctx, 40, top + 30, 'ESTÁDIO NACIONAL • SALA DE IMPRENSA', seg(t, 8, 50));
        CE.finKicker(ctx, 40, top + 58, 'LOGO DEPOIS DO BLUE LOCK x SUB-20', seg(t, 36, 84), '#38bdf8');
      } else if (phase === 1) {
        for (let i = 0; i < 6; i++) {
          const per = 60 + rnd(i, 9) * 50;
          const ph = (t + rnd(i, 10) * per) % per;
          if (ph < 6) CE.cineGlow(ctx, 80 + rnd(i, 12) * (W - 160), top + 60 + rnd(i, 13) * 200, 70, 'rgba(255,255,255,0.6)', 1 - ph / 6);
        }
        const talk = Math.max(seg(t, 20, 26) * (1 - seg(t, 70, 76)), seg(t, 92, 98) * (1 - seg(t, 166, 172)));
        const fc = st.face || { x: W / 2, y: H * 0.45 };
        CE.rincViewfinder(ctx, S, t, fc.x, fc.y, ease(seg(t, 4, 34)), talk);
      } else if (phase === 2) {
        const hit = 80;
        if (t < hit) {
          // faixa dos olhos do Sae (mangá) por cima do close no escuro
          const kA = ease(seg(t, 0, 16));
          const y1 = top + 196;
          CE.finPanel(ctx, [[0, top + 12], [W, top + 12], [W, y1 - 6], [0, y1 + 4]], () => {
            ctx.fillStyle = '#081024';
            ctx.fillRect(0, top, W, 220);
            const dw = 660;
            const U = dw / 14;
            CE.finEyes(ctx, sae, W / 2 - dw / 2, top + 104 - 3.1 * U, dw, { half: true, ring: '#5eead4', iris: '#0f766e', look: t > 50 ? -1 : 0 });
            ctx.fillStyle = 'rgba(8,16,40,0.25)';
            ctx.fillRect(0, top, W, 220);
          }, { dx: (1 - kA) * -W });
          CE.finKicker(ctx, 40, bot - 40, 'NINGUÉM RESPIRA', seg(t, 30, 56), '#facc15');
          return;
        }
        const u = t - hit;
        const name = CE.cinePlayerName();
        // flashes espalhados pela imprensa (cada um uma vez)
        const crowd = st.crowd || [];
        for (let i = 0; i < 26 && crowd.length; i++) {
          const at = rnd(i, 63) * 30;
          const a = 1 - (u - at) / 9;
          if (u < at || a <= 0) continue;
          const p = crowd[Math.floor(rnd(i, 61) * crowd.length)];
          CE.finSparkle(ctx, p.x, p.y, 8 + rnd(i, 64) * 12, a);
        }
        CE.cineGradient(ctx, 0, top, W, bot - top, [[0, 'rgba(3,7,20,0.15)'], [0.5, 'rgba(3,7,20,0.5)'], [1, 'rgba(3,7,20,0.15)']]);
        const cy = (top + bot) / 2 - 18;
        const sp = CE.rincStamp(ctx, `${name}.`, W / 2, cy, 170, '#f8fafc', u, 2, 2, W * 0.84);
        if (sp) {
          const lk = ease(seg(u, 2 + name.length * 2 + 6, 2 + name.length * 2 + 26));
          ctx.fillStyle = YOU_C;
          ctx.fillRect(W / 2 - (sp.w / 2) * lk, cy + sp.fs * 0.56, sp.w * lk, 6);
        }
        CE.finKicker(ctx, W / 2, cy + 112, '— SAE ITOSHI, SOBRE O BLUE LOCK', seg(u, 34, 70), SAE_C, 'center');
        if (u >= 0) CE.cineFlash(ctx, W, H, 0.55 * (1 - seg(u, 0, 12)));
        CE.cineSfx(S, hit, 'nome', () => window.SFX?.kick?.(1));
      } else if (phase === 3) {
        CE.finKicker(ctx, 40, top + 30, 'CORREDOR DO VESTIÁRIO • AO MESMO TEMPO', seg(t, 60, 100), '#38bdf8');
      } else {
        saeCrack(ctx, S, K, st, rin);
      }
    }
  });

  // PLANO 5 da coletiva: o olho do Rin → a tela racha a partir dele → os cacos caem no preto
  function saeCrack(ctx, S, K, st, rin) {
    const { W, H, t, top, bot } = S;
    const crackAt = 74;
    const fallAt = 124;
    const tt = Math.min(t, crackAt);
    const shock = seg(tt, 26, 32);
    // os olhos acesos e a gota de suor (antes de congelar)
    const drawFace = () => {
      const e = st.eyes;
      if (!e) return;
      [e.L, e.R].forEach((p) => CE.cineGlow(ctx, p.x, p.y, e.u * 3.2, 'rgba(34,211,238,0.3)'));
      if (shock > 0.5) {
        const look = [0, 1, 0, -1][Math.floor(tt / 2) % 4];
        [e.L, e.R].forEach((p) => CE.drawPixelEye(ctx, p.x + look * e.u * 0.15, p.y, e.u * 0.28, { line: '#020617', iris: '#0f766e', ring: '#5eead4', tiny: true }));
      }
      if (st.temple) {
        const dy = ease(seg(tt, 30, 74)) * 3.2 * e.u;
        ctx.fillStyle = 'rgba(186,230,253,0.85)';
        ctx.fillRect(Math.round(e.R.x + 3.4 * e.u), Math.round(st.temple.y + dy), Math.ceil(e.u * 0.5), Math.ceil(e.u * 0.8));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(e.R.x + 3.4 * e.u), Math.round(st.temple.y + dy), Math.ceil(e.u * 0.2), Math.ceil(e.u * 0.2));
      }
    };
    if (t < crackAt) {
      drawFace();
      return;
    }
    // congela o quadro da rachadura (uma vez por vez que a cena toca)
    if (!SRC) SRC = document.createElement('canvas');
    const key = `${CE._cineRun}|${W}x${H}`;
    if (SRC_KEY !== key || SRC.width !== W || SRC.height !== H) {
      drawFace();
      SRC.width = W;
      SRC.height = H;
      SRC.getContext('2d').drawImage(ctx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, W, H);
      SRC_KEY = key;
      SRC.eye = st.eyes ? { cx: st.eyes.L.x, cy: st.eyes.L.y } : { cx: W / 2, cy: H * 0.45 };
    }
    const eye = SRC.eye;
    const shards = CE.getShards(W, H, eye.cx, eye.cy);
    if (!shards.list[0].bb) {
      shards.list.forEach((sh) => {
        const xs = sh.pts.map((p) => p[0]);
        const ys = sh.pts.map((p) => p[1]);
        const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 2);
        const y0 = Math.max(0, Math.floor(Math.min(...ys)) - 2);
        const x1 = Math.min(W, Math.ceil(Math.max(...xs)) + 2);
        const y1 = Math.min(H, Math.ceil(Math.max(...ys)) + 2);
        sh.bb = [x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)];
      });
    }
    // cada caco recortado UMA vez (o close já está congelado)
    const bakeKey = `${key}|${shards.key}|3d`;
    const bake = (sh) => {
      if (sh.bakeKey === bakeKey) return;
      const [bx, by, bw, bh] = sh.bb;
      const cv = sh.cv || document.createElement('canvas');
      cv.width = bw;
      cv.height = bh;
      const g = cv.getContext('2d');
      g.save();
      g.translate(-bx, -by);
      poly(g, sh.pts);
      g.clip();
      g.drawImage(SRC, bx, by, bw, bh, bx, by, bw, bh);
      g.restore();
      sh.cv = cv;
      sh.bakeKey = bakeKey;
    };
    const drawShard = (sh, dx, dy, rot, sc, dark, edge) => {
      bake(sh);
      ctx.save();
      ctx.translate(sh.cx + dx, sh.cy + dy);
      if (rot) ctx.rotate(rot);
      if (sc !== 1) ctx.scale(sc, sc);
      ctx.translate(-sh.cx, -sh.cy);
      ctx.drawImage(sh.cv, sh.bb[0], sh.bb[1]);
      poly(ctx, sh.pts);
      if (dark > 0) {
        ctx.fillStyle = `rgba(0,0,0,${dark})`;
        ctx.fill();
      }
      if (edge > 0) {
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = `rgba(224,242,254,${edge})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    };
    if (t < fallAt) {
      const u = t - crackAt;
      const sh = CE.cineNoise(S.f * 2.3, 4) * 8 * (1 - seg(u, 0, 24));
      ctx.save();
      ctx.translate(sh, sh * 0.6);
      ctx.drawImage(SRC, 0, 0);
      const rings = Math.min(shards.rings, 1 + Math.floor(u / 4));
      const spread = ease(seg(u, 6, 46)) * 4;
      shards.list.forEach((s, i) => {
        const ring = Math.floor(i / shards.n);
        if (ring >= rings) return;
        drawShard(s, s.vx * spread * (1 + ring * 0.3), s.vy * spread + spread * 0.6, s.vr * spread * 0.5, 1, 0, 0);
      });
      CE.drawCracks(ctx, shards, rings);
      const gx = lerp(-300, W + 300, seg(u, 4, 50));
      const g = ctx.createLinearGradient(gx - 160, 0, gx + 160, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(224,242,254,0.12)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 18; i++) {
        const a = rnd(i, 71) * TAU;
        const d = u * (2 + rnd(i, 72) * 5);
        ctx.fillStyle = `rgba(224,242,254,${0.9 * (1 - seg(u, 10, 40))})`;
        ctx.fillRect(eye.cx + Math.cos(a) * d, eye.cy + Math.sin(a) * d + u * u * 0.04, 3 + rnd(i, 73) * 4, 3 + rnd(i, 74) * 4);
      }
      ctx.restore();
      CE.cineImpactText(ctx, 'CRACK', W * 0.81, top + 92, 92, '#f8fafc', seg(u, 0, 8), 0, -0.1);
      CE.cineFlash(ctx, W, H, 0.5 * (1 - seg(u, 0, 10)), '#e0f2fe');
      CE.cineSfx(S, crackAt, 'crack', () => window.SFX?.kick?.(1));
    } else {
      const fl = t - fallAt;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      CE.cineGlow(ctx, eye.cx, eye.cy, 360, 'rgba(34,211,238,0.22)', 1 - seg(fl, 0, 70));
      shards.list.forEach((s, i) => {
        const ring = Math.floor(i / shards.n);
        const d = Math.max(0, fl - (ring * 7 + rnd(i, 5) * 9));
        const dx = s.vx * 4 * (1 + ring * 0.3) + s.vx * d * 1.6;
        const dy = s.vy * 4 + 2.4 + s.vy * d * 0.7 + 0.085 * d * d;
        if (s.cy + dy - 260 > H) return;
        const sc = 1 / (1 + d * 0.012);
        drawShard(s, dx, dy, s.vr * (2 + d * 1.6), sc, Math.min(0.82, 0.06 * ring + d * 0.011), Math.max(0, 0.85 - d * 0.008));
      });
      for (let i = 0; i < 30; i++) {
        const d = Math.max(0, fl - rnd(i, 81) * 20);
        const x = eye.cx + (rnd(i, 82) - 0.5) * 700 + (rnd(i, 83) - 0.5) * d * 2;
        const y = eye.cy + (rnd(i, 84) - 0.5) * 300 + d * d * 0.05 + d;
        if (y > H) continue;
        ctx.fillStyle = `rgba(224,242,254,${0.8 * (0.5 + 0.5 * Math.sin(t * 0.3 + i))})`;
        ctx.fillRect(x, y, 3, 3);
      }
      CE.finKicker(ctx, W / 2, (top + bot) / 2 - 56, 'RIN ITOSHI', seg(fl, 52, 82), RIN_C, 'center');
      CE.rincStamp(ctx, 'DESTRUÍDO.', W / 2, (top + bot) / 2 + 6, 76, '#cbd5e1', fl, 62, 3, W * 0.7);
    }
  }

  // =========================================================================
  // 2) O RIVAL MORTAL (rin_rival) — no vestiário do prédio
  // =========================================================================
  // O Rin SENTADO com a toalha na cabeça: o tronco desce por cima das pernas (como a
  // versão 2D) num canvas pronto uma vez; em pé no mundo como um boneco
  let SEAT = null;
  const seatCv = () => {
    const { rin } = CE.rincCast();
    const key = CE.rincCast && JSON.stringify([rin.hairColor, rin.skinColor, rin.jerseyPrimary]);
    if (SEAT && SEAT.key === key) return SEAT;
    const e = CE.finSprEntry(rin, 180, {});
    const cv = SEAT || document.createElement('canvas');
    cv.width = e.cv.width;
    cv.height = e.cv.height;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    g.imageSmoothingEnabled = false;
    const feet = e.pad + 180 * 0.87;
    const up = CE.rincSeat(g, rin, cv.width / 2, feet, 180, {});
    CE.rincTowel(g, cv.width / 2, up, 180, '#97a5bb');
    cv.key = key;
    cv.pad = e.pad;
    SEAT = cv;
    return cv;
  };
  // tamanho no mundo: 5 px por unidade da arte (base 180) → 1 px = UNIT / 5 ladrilhos
  const RIN_SEAT = [42.42, 21.2];
  const SEAT_EYE = 0.485; // altura dos olhos dele sentado
  const seatRin = (K, light) => {
    const cv = seatCv();
    const s = UNIT / 5;
    const w = cv.width * s;
    const h = cv.height * s;
    // a sola fica a (pad + 33 unidades) do topo do canvas
    const foot = (cv.height - (cv.pad + 33 * 5)) / cv.height;
    K.sprite(cv, { x: RIN_SEAT[0], y: RIN_SEAT[1], z: 0, w, h, foot, light, shadow: 0.2 });
  };
  // a luz única pendurada em cima do Rin (lâmpada + cone de luz)
  let CONE = null;
  const coneCv = () => {
    if (CONE) return CONE;
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 128;
    const g = cv.getContext('2d');
    for (let y = 0; y < 128; y++) {
      const k = y / 127;
      const half = 4 + k * 28;
      const a = 0.22 * (1 - k * 0.55);
      g.fillStyle = `rgba(219,234,254,${a.toFixed(3)})`;
      g.fillRect(32 - half, y, half * 2, 1);
    }
    CONE = cv;
    return cv;
  };
  const lamp = (K, power = 1) => {
    K.box({ x0: RIN_SEAT[0] - 0.14, y0: RIN_SEAT[1] - 0.14, x1: RIN_SEAT[0] + 0.14, y1: RIN_SEAT[1] + 0.14, z0: 1.5, z1: 1.56, color: '#e0f2fe', em: true });
    K.box({ x0: RIN_SEAT[0] - 0.01, y0: RIN_SEAT[1] - 0.01, x1: RIN_SEAT[0] + 0.01, y1: RIN_SEAT[1] + 0.01, z0: 1.56, z1: 1.75, color: '#111827' });
    const c = K.c;
    const ang = Math.atan2(c.eye[2] - RIN_SEAT[1], c.eye[0] - RIN_SEAT[0]);
    K.quad({ x: RIN_SEAT[0] - Math.cos(ang) * 0.3, y: RIN_SEAT[1] - Math.sin(ang) * 0.3, z: 0, w: 1.3, h: 1.5, ang, img: coneCv(), em: true, alpha: power });
  };
  // a aura do Rin (o abismo ciano) desenhada num canvas único atrás dele
  let ABYSS = null;
  const abyss = (K, t, k, size, behind = 0.25) => {
    if (k <= 0) return;
    if (!ABYSS) {
      ABYSS = document.createElement('canvas');
      ABYSS.width = 384;
      ABYSS.height = 384;
    }
    const g = ABYSS.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, 384, 384);
    CE.drawRinAbyss(g, 192, 250, 0.5, t, k);
    const c = K.c;
    const ang = Math.atan2(RIN_SEAT[1] - c.eye[2], RIN_SEAT[0] - c.eye[0]);
    K.sprite(ABYSS, { x: RIN_SEAT[0] + Math.cos(ang) * behind, y: RIN_SEAT[1] + Math.sin(ang) * behind, z: -size * 0.12, w: size, h: size, glow: true, alpha: 0.95, dirty: true });
  };

  reg('rin_rival', {
    phases: [200, 190, 190, 220, 270],
    music: 'dread',
    title: '🩸 O RIVAL MORTAL',
    tags: ['PLANO 1 • UMA LUZ ACESA', 'PLANO 2 • PRA NÓS DOIS?', 'PLANO 3 • NÃO ESQUECE', 'PLANO 4 • O ABISMO', 'PLANO 5 • O RIVAL MORTAL'],
    subs: [
      [{ from: 4, who: 'VOCÊ', text: '"...Obrigado, Rin. Esse gol é de nós dois."', color: YOU_C }],
      [{ from: 30, who: 'RIN ITOSHI', text: '"...Pra nós dois?"', color: RIN_C }],
      [{ from: 14, who: 'RIN ITOSHI', text: '"Não esquece. Eu VOU te matar."', color: RIN_C }],
      [
        { from: 4, to: 50, who: 'VOCÊ', text: '(...Rin?)', color: YOU_C },
        { from: 82, who: 'NARRADOR', text: 'Algo faminto acordou.', color: NARR_C }
      ],
      [{ from: 22, who: 'RIN ITOSHI', text: '"A partir deste momento... VOCÊ É O MEU RIVAL."', color: RIN_C }]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const { you } = CE.rincCast();
      const st = (K.st = {});
      const sil = [0.1, 0.13, 0.2];
      if (phase === 0) {
        // o vestiário apagado e uma luz em cima do Rin; você parado na porta
        K.expo(0.5);
        const k = easeIO(t / 200);
        cam(K, shake(K, mixP([38.45, 16.45, 1.12], [38.7, 16.9, 1.02], k), f * 0.3, 0.004), mixP([41.6, 20.6, 0.42], [42.1, 20.95, 0.45], k), lerp(46, 40, k));
        act(K, you, [39.2, 18.15, 0], { id: 'y', face: RIN_SEAT, frame: 1, light: [0.16, 0.2, 0.3] });
        seatRin(K, [1.2, 1.3, 1.45]);
        lamp(K, 1);
      } else if (phase === 1) {
        // por cima do seu ombro: "...pra nós dois?"
        K.expo(0.55);
        const k = easeIO(t / 190);
        const tremble = t > 34 && t < 92 ? Math.round(Math.sin(t * 1.3)) * 0.004 : 0;
        cam(K, shake(K, mixP([40.55, 20.42, 0.74], [40.75, 20.55, 0.7], k), f * 0.3, 0.004), [RIN_SEAT[0], RIN_SEAT[1] + tremble, 0.46], 34);
        act(K, you, [41.6, 20.4, 0], { id: 'y', face: RIN_SEAT, frame: 1, light: sil });
        seatRin(K, [1.15, 1.25, 1.42]);
        lamp(K, 0.8);
        st.eyes = eyesW(RIN_SEAT, SEAT_EYE);
      } else if (phase === 2) {
        // o olho por baixo da toalha
        K.expo(0.45);
        const k = easeIO(t / 190);
        cam(K, shake(K, [RIN_SEAT[0] - lerp(1.75, 1.6, k), RIN_SEAT[1] + 0.05, 0.5], f * 0.3, 0.003), [RIN_SEAT[0], RIN_SEAT[1], SEAT_EYE - 0.02], 32);
        seatRin(K, [0.85, 0.95, 1.15]);
        lamp(K, 0.55);
        st.eyes = eyesW(RIN_SEAT, SEAT_EYE);
      } else if (phase === 3) {
        // a aura sai das costas dele e toma o vestiário
        const erupt = 40;
        const k = ease(seg(t, erupt, 150));
        K.expo(0.5);
        const sh = 0.006 + 0.03 * (t >= erupt ? 1 - seg(t, erupt, erupt + 50) : 0) + k * 0.006;
        cam(K, shake(K, [38.95, 21.85, 0.9], f, sh, 5), [41.9, 21.15, lerp(0.55, 0.62, k)], lerp(44, 40, easeIO(t / 220)));
        act(K, you, [39.95, 22.3, 0], { id: 'y', face: RIN_SEAT, frame: 1, light: [0.1 + k * 0.1, 0.16 + k * 0.4, 0.22 + k * 0.45] });
        abyss(K, t, k, 2.6);
        seatRin(K, mixP([1.1, 1.2, 1.35], [0.75, 1.25, 1.35], k));
        lamp(K, 1 - 0.45 * k);
        K.floor({ x0: RIN_SEAT[0] - 1.6, y0: RIN_SEAT[1] - 1.4, x1: RIN_SEAT[0] + 0.5, y1: RIN_SEAT[1] + 1.4, z: 0.012, color: RIN_C, em: true, alpha: 0.1 * k });
        st.eyes = eyesW(RIN_SEAT, SEAT_EYE);
        st.rin = wp([RIN_SEAT[0], RIN_SEAT[1], 0.3]);
        st.k = k;
      } else {
        // o rosto, a aura em volta e a frase
        const hit = 104;
        K.expo(0.5);
        const z = easeIO(t / 260);
        const sh = 0.003 + (t >= hit ? 0.025 * (1 - seg(t, hit, hit + 30)) : 0);
        cam(K, shake(K, [RIN_SEAT[0] - lerp(1.85, 1.62, z), RIN_SEAT[1] - 0.04, 0.52], f, sh, 7), [RIN_SEAT[0], RIN_SEAT[1], SEAT_EYE], 32);
        abyss(K, t + 60, 1, 3.0, 0.3);
        seatRin(K, [0.8, 1.15, 1.25]);
        st.eyes = eyesW(RIN_SEAT, SEAT_EYE);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const { rin } = CE.rincCast();
      const st = resolve(K, K.st || {});
      const e = st.eyes;
      if (phase === 0) {
        CE.cineDust(ctx, W, H, t, 24, 'rgba(226,232,240,0.35)', 9);
        CE.finKicker(ctx, 40, top + 30, 'VESTIÁRIO DO BLUE LOCK • 23:40', seg(t, 8, 50));
        CE.finKicker(ctx, 40, top + 58, 'A FESTA JÁ FOI PARA OS CORREDORES', seg(t, 36, 86), '#38bdf8');
      } else if (phase === 1) {
        if (e) CE.rincDrops(ctx, [e.L.x - 6 * e.u, e.R.x + 6 * e.u, e.L.x - 4 * e.u], e.c.y + 6 * e.u, bot + 40, t, e.u * 0.45, 3);
        // painel: a boca, os dentes trincados ("Hah.")
        const kp = ease(seg(t, 96, 112));
        if (kp > 0) {
          const pts = [[808, top + 16], [W - 18, top + 16], [W - 18, bot - 190], [772, bot - 176]];
          CE.finPanel(ctx, pts, () => {
            ctx.fillStyle = '#05070f';
            ctx.fillRect(760, top, 540, bot - top);
            const cw = 560;
            const U = cw / 10;
            const x0 = 1035 - cw / 2;
            const y0 = top + 16 - 0.6 * U;
            CE.finCrop(ctx, rin, { expr: 'angry' }, 13, window.PixelRenderer.spritesV2 ? 8.6 : 9.6, 10, 5.4, x0, y0, cw, U * 5.4);
            CE.foxcGrad(ctx, 760, y0, 560, U * 3.6, [[0, 'rgba(0,0,0,1)'], [0.55, 'rgba(0,0,0,0.97)'], [1, 'rgba(0,0,0,0)']]);
            ctx.fillStyle = 'rgba(6,16,40,0.25)';
            ctx.fillRect(760, top, 540, bot - top);
            CE.rincStamp(ctx, 'HAH.', 1150, bot - 236, 54, '#e0f2fe', t, 116, 3, 0, 'center');
          }, { dx: (1 - kp) * 560 });
        }
        // painel: a gota batendo no chão
        const kd = ease(seg(t, 132, 146));
        if (kd > 0) {
          const pts = [[30, bot - 196], [420, bot - 186], [404, bot - 18], [18, bot - 18]];
          CE.finPanel(ctx, pts, () => {
            CE.cineGradient(ctx, 0, bot - 200, 440, 200, [[0, '#0b1424'], [1, '#04080f']]);
            ctx.strokeStyle = 'rgba(30,41,59,0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, bot - 90);
            ctx.lineTo(440, bot - 104);
            ctx.stroke();
            const u2 = t - 146;
            const gx = 220;
            const gy = bot - 64;
            if (u2 < 10) {
              const y = lerp(bot - 220, gy - 14, clamp(u2 / 10));
              ctx.fillStyle = 'rgba(186,230,253,0.9)';
              ctx.fillRect(gx - 6, y, 12, 18);
            } else {
              const a = u2 - 10;
              ctx.strokeStyle = `rgba(186,230,253,${0.9 * (1 - seg(a, 0, 34))})`;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.ellipse(gx, gy, 10 + a * 4, 3 + a * 1.1, 0, 0, TAU);
              ctx.stroke();
              ctx.fillStyle = `rgba(186,230,253,${0.9 * (1 - seg(a, 0, 20))})`;
              [-1, 1].forEach((sd) => ctx.fillRect(gx + sd * (6 + a * 1.6), gy - 14 - a * 2 + a * a * 0.12, 5, 5));
              CE.rincStamp(ctx, 'TIC.', 330, bot - 150, 30, '#bae6fd', a, 0, 3);
            }
          }, { dy: (1 - kd) * 260 });
        }
      } else if (phase === 2) {
        if (e) {
          // a sombra da toalha engole o lado direito do rosto; só o olho da esquerda acende
          CE.foxcGradH(ctx, e.c.x + 0.5 * e.u, top, 7 * e.u, bot - top, [[0, 'rgba(1,4,9,0)'], [1, 'rgba(1,4,9,0.92)']]);
          ctx.fillStyle = 'rgba(1,4,9,0.92)';
          ctx.fillRect(e.c.x + 7.5 * e.u, top, W, bot - top);
          const open = seg(t, 18, 30);
          if (open > 0) {
            CE.cineGlow(ctx, e.L.x, e.L.y, e.u * 4.2, 'rgba(34,211,238,0.42)', open);
            const tiny = t > 108;
            const look = tiny ? [0, 1, 0, -1][Math.floor(t / 3) % 4] : 0;
            CE.drawPixelEye(ctx, e.L.x, e.L.y, e.u * 0.3, { line: '#010409', iris: '#0f766e', ring: '#22d3ee', blink: open < 0.5, tiny, look });
          }
          CE.rincDrops(ctx, [e.L.x - 6 * e.u, e.L.x - 4 * e.u], e.c.y + 5.6 * e.u, H + 40, t, e.u * 0.35, 7);
        }
        CE.rincStamp(ctx, 'NÃO ESQUECE.', W * 0.79, top + 96, 52, '#e0f2fe', t, 46, 2, 420, 'center', 1 - seg(t, 150, 172));
      } else if (phase === 3) {
        const erupt = 40;
        const k = st.k || 0;
        if (e) [e.L, e.R].forEach((p) => CE.cineGlow(ctx, p.x, p.y, e.u * 2.4, 'rgba(34,211,238,0.75)', seg(t, 90, 130)));
        if (st.rin) {
          ctx.fillStyle = 'rgba(165,243,252,0.7)';
          for (let i = 0; i < 40; i++) {
            const ph = (t * (0.6 + rnd(i, 31) * 0.8) + rnd(i, 32) * 400) % 400;
            const x = st.rin.x + (rnd(i, 33) - 0.5) * 900 + Math.sin(t * 0.03 + i) * 20;
            const y = st.rin.y + 80 - ph * 1.3;
            ctx.globalAlpha = k * (1 - ph / 400);
            ctx.fillRect(x, y, 3, 3);
          }
          ctx.globalAlpha = 1;
        }
        if (t >= erupt) CE.cineFlash(ctx, W, H, 0.32 * (1 - seg(t, erupt, erupt + 12)), '#a5f3fc');
        CE.cineSfx(S, erupt, 'aura', () => window.SFX?.tackle?.());
      } else {
        const hit = 104;
        if (e) {
          // os olhos dele acesos em ciano (o olho é o do próprio boneco)
          [e.L, e.R].forEach((p) => CE.cineGlow(ctx, p.x, p.y, e.u * (t >= hit ? 4.4 : 3.6), 'rgba(34,211,238,0.6)'));
        }
        CE.rincStamp(ctx, 'A PARTIR DESTE MOMENTO...', W / 2, top + 46, 36, '#a5f3fc', t, 22, 2, W * 0.8);
        CE.cineImpactText(ctx, 'VOCÊ É O MEU RIVAL.', W / 2, bot - 78, 84, RIN_C, seg(t, hit, hit + 10), W * 0.92, -0.03);
        if (t >= hit) CE.cineFlash(ctx, W, H, 0.42 * (1 - seg(t, hit, hit + 12)), '#cffafe');
        CE.cineSfx(S, hit, 'rival', () => window.SFX?.kick?.(1));
      }
    }
  });

  // =========================================================================
  // 3) A ENGRENAGEM DO HUGO (hugo_gears) — no campo, na final da Copa Sub-20
  // =========================================================================
  const HUGO_AT = [53.7, 12.0, 0];
  const YOU_AT = [52.92, 12.98, 0];
  reg('hugo_gears', {
    phases: [130, 90, 170, 150],
    letterbox: 0.1,
    grain: 0.05,
    music: 'dread',
    theme: 'worldcup_final',
    title: '⚙️ A ENGRENAGEM DO HUGO',
    tags: ['PLANO 1 • HUGO', 'PLANO 2 • POR QUÊ?', 'PLANO 3 • O MECANISMO', 'PLANO 4 • O OLHO'],
    subs: [
      [{ from: 8, who: 'HUGO', text: '"Aceite: um de nós dois vai ser o segundo melhor."', color: PINK }],
      [{ from: 6, who: 'VOCÊ', text: '"...Por quê??"', color: '#38bdf8' }],
      [{ from: 6, who: 'HUGO', text: '"Porque gente como a gente... não nasceu para ser o primeiro lugar."', color: PINK }],
      [{ from: 40, who: 'NARRADOR', text: 'As engrenagens giram. O Hugo entrou no Fluxo.', color: '#94a3b8' }]
    ],
    scene(K, S) {
      const { t, phase, f } = S;
      const o = CE.hgoCast();
      const st = (K.st = {});
      const pinkL = [1.25, 0.92, 1.12];
      if (phase === 0) {
        // o Hugo encosta do seu lado (por cima do seu ombro, de noite, a luz rosa nele)
        K.expo(0.85);
        const k = ease(t / S.dur);
        act(K, o.hugo, HUGO_AT, { id: 'h', face: YOU_AT, frame: 1, light: pinkL });
        const ce = [lerp(52.5, 52.56, k), lerp(13.82, 13.72, k), 0.7];
        // você de costas para a câmera (por cima do seu ombro)
        act(K, o.you, [52.67, 12.72, 0], { id: 'y', face: [2 * 52.67 - ce[0], 2 * 12.72 - ce[1]], frame: 1, light: [0.22, 0.24, 0.34] });
        cam(K, shake(K, ce, f * 0.3, 0.003), [HUGO_AT[0] - 0.05, HUGO_AT[1], 0.6], lerp(40, 37, k));
        st.eyes = eyesW(HUGO_AT, 0.556);
      } else if (phase === 1) {
        // você sem entender (o contra-plano, de frente)
        K.expo(0.85);
        act(K, o.you, YOU_AT, { id: 'y', face: HUGO_AT, frame: 1, light: [1.0, 1.1, 1.3], opts: { expr: 'sweat' } });
        // (o Hugo fica fora do quadro, atrás da câmera)
        const k = ease(t / S.dur);
        const dir = [0.62, -0.79];
        const d = lerp(2.0, 1.85, k);
        cam(K, [YOU_AT[0] + dir[0] * d + 0.28, YOU_AT[1] + dir[1] * d + 0.22, 0.62], [YOU_AT[0], YOU_AT[1], 0.56], 32);
        st.eyes = eyesW(YOU_AT, 0.556);
      } else if (phase === 2) {
        // o mecanismo: o Hugo de frente; metade do rosto vira engrenagens (overlay)
        K.expo(0.75);
        const k = ease(t / S.dur);
        act(K, o.hugo, HUGO_AT, { id: 'h', face: [HUGO_AT[0] - 0.6, HUGO_AT[1] + 1.6], frame: 1, light: [1.1, 1.0, 1.08] });
        const dir = [-0.35, 0.94];
        const d = lerp(1.95, 1.8, k);
        cam(K, [HUGO_AT[0] + dir[0] * d, HUGO_AT[1] + dir[1] * d, 0.6], [HUGO_AT[0] - 0.12, HUGO_AT[1], 0.58], 32);
        st.eyes = eyesW(HUGO_AT, 0.556);
      } else {
        // a câmera entra no olho dele (depois o olho de engrenagem toma a tela no overlay)
        const dive = 26;
        K.expo(0.8);
        const q = easeIn(seg(t, 0, dive));
        act(K, o.hugo, HUGO_AT, { id: 'h', face: [HUGO_AT[0] - 0.6, HUGO_AT[1] + 1.6], frame: 1, light: pinkL });
        const dir = [-0.35, 0.94];
        const d = lerp(1.9, 1.2, q);
        cam(K, [HUGO_AT[0] + dir[0] * d, HUGO_AT[1] + dir[1] * d, lerp(0.6, 0.56, q)], [HUGO_AT[0] - 0.06 * q, HUGO_AT[1], 0.56], lerp(32, 26, q));
        st.eyes = eyesW(HUGO_AT, 0.556);
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, top, bot, phase } = S;
      const st = resolve(K, K.st || {});
      const e = st.eyes;
      if (phase === 0) {
        if (S.t < 10) CE.cineFlash(ctx, W, H, 1 - S.t / 10, '#000000');
        CE.cineBokeh(ctx, W, top, bot * 0.55, t, 14, ['rgba(236,72,153,0.22)', 'rgba(255,236,179,0.22)', 'rgba(147,197,253,0.2)'], 5);
        const gl = seg(t, 20, 28) * (1 - seg(t, 60, 84));
        if (e) CE.ptdEyeFlare(ctx, e.L.x, e.L.y, gl * 0.7, PINK, W * 0.3);
        CE.ptdChip(ctx, 'HUGO • FRANÇA SUB-20', W * 0.24, top + 40, PINK, seg(t, 6, 18), { size: 16 });
        CE.ptdSfx(S, 4, 'hugo', () => window.SFX?.jingle?.([392, 330], 0, 'triangle'));
      } else if (phase === 1) {
        if (e) {
          // gota de suor descendo na têmpora
          const u = e.u;
          const dy = seg(t, 10, 50) * 40;
          ctx.fillStyle = '#bae6fd';
          ctx.strokeStyle = '#0c4a6e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          const sx = e.R.x + 3.1 * u;
          const sy = e.c.y - 3 * u + dy;
          ctx.moveTo(sx, sy - 22);
          ctx.quadraticCurveTo(sx + 16, sy + 6, sx, sy + 12);
          ctx.quadraticCurveTo(sx - 16, sy + 6, sx, sy - 22);
          ctx.fill();
          ctx.stroke();
        }
        [[W * 0.26, H * 0.3, 96, 10], [W * 0.17, H * 0.46, 66, 18], [W * 0.84, H * 0.26, 74, 24]].forEach(([qx, qy, sz, at], i) => {
          const k = seg(t, at, at + 8);
          if (k <= 0) return;
          CE.ptdWord(ctx, '?', qx, qy - Math.sin(t * 0.12 + i) * 6, sz, '#f8fafc', k, 1, (i - 1) * 0.15);
        });
      } else if (phase === 2) {
        hugoGears(ctx, S, e);
      } else {
        const dive = 26;
        if (t < dive) {
          CE.cineFlash(ctx, W, H, seg(t, dive - 6, dive), '#ffffff');
          return;
        }
        // o olho de engrenagem toma a tela (pixel art ampliada, como na versão 2D)
        const u2 = t - dive;
        const open = ease(seg(u2, 0, 14));
        const eye = CE.hgoEyeCv(u2, 0.25 + 0.75 * open);
        const scale = Math.max(W / eye.width, (bot - top) / eye.height) * lerp(1.12, 1.0, ease(seg(u2, 0, 40)));
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const dw = eye.width * scale;
        const dh = eye.height * scale;
        const sh = u2 < 12 ? (rnd(u2, 3) - 0.5) * 10 : 0;
        ctx.drawImage(eye, (W - dw) / 2 + sh, (top + bot) / 2 - dh / 2, dw, dh);
        ctx.restore();
        const pulse = 0.5 + 0.5 * Math.sin(u2 * 0.25);
        CE.cineGlow(ctx, W / 2, (top + bot) / 2 - 3 * scale, 160 + 60 * pulse, 'rgba(125,211,252,0.45)', open);
        ctx.fillStyle = PINK;
        for (let i = 0; i < 22; i++) {
          const q = (u2 * 0.02 + rnd(i, 2)) % 1;
          const a = rnd(i, 3) * TAU;
          const r = 120 + q * W * 0.5;
          ctx.globalAlpha = (1 - q) * open;
          ctx.fillRect(W / 2 + Math.cos(a) * r, (top + bot) / 2 + Math.sin(a) * r * 0.55, 6, 6);
        }
        ctx.globalAlpha = 1;
        if (u2 < 8) CE.cineFlash(ctx, W, H, 1 - u2 / 8, '#ffffff');
        const sk = seg(u2, 30, 40);
        if (sk > 0) {
          CE.ptdWord(ctx, 'FLUXO', W * 0.5, top + 92, 96, PINK, sk, 1, -0.05, W * 0.7);
          CE.ptdChip(ctx, 'HUGO • A ENGRENAGEM DO SEGUNDO LUGAR', W * 0.5, bot - 50, ICE, seg(u2, 40, 54), { size: 17 });
        }
        CE.ptdSfx(S, dive, 'olho', () => window.SFX?.kick?.(0.8));
        CE.ptdSfx(S, dive + 30, 'fluxo', () => window.SFX?.jingle?.([392, 523, 784], 0, 'square'));
      }
    }
  });

  // PLANO 3 do Hugo: do meio do rosto para a direita o papel de mangá com as engrenagens
  // em pixel girando (uma azul no lugar do outro olho) e peças voando
  function hugoGears(ctx, S, e) {
    const { W, H, t, top, bot } = S;
    if (!e) return;
    const hx = e.c.x;
    const eyeY = e.c.y;
    const u = e.u;
    const k = ease(seg(t, 0, 24));
    // o corte em degraus de pixel, do topo ao pé da imagem
    const cut = (y) => hx + 8 + Math.round(((rnd(Math.floor(y / 24), 9) - 0.5) * 22) / 4) * 4 + (1 - k) * W;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(W, 0);
    for (let y = 0; y <= H; y += 24) {
      ctx.lineTo(cut(y), y);
      ctx.lineTo(cut(y), y + 24);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(11,15,25,0.16)';
    for (let y = top; y < bot; y += 12) for (let x = ((y / 12) % 2) * 6; x < W; x += 12) ctx.fillRect(x, y, 4, 4);
    CE.ptdRays(ctx, hx + 3.5 * u, eyeY, W * 1.1, INK, 0.1, 0, 44);
    const grow = (i) => ease(seg(t, 6 + i * 4, 30 + i * 4));
    const sc = Math.max(0.6, u / 32);
    const gears = [
      [60, -170, 96, 14, 1], [250, -120, 130, 18, -1], [120, 140, 120, 16, -1], [330, 120, 90, 12, 1],
      [470, -30, 110, 14, 1], [40, 260, 70, 10, 1], [520, 220, 76, 10, -1], [420, -230, 64, 10, -1], [200, 290, 60, 9, 1]
    ].map(([dx, dy, r, n, dir], i) => [hx + dx * sc, eyeY + dy * sc, r * sc, n, dir, null, grow(i)]);
    const mono = { x: e.R.x, y: e.R.y, r: Math.max(26, 60 * sc), k: ease(seg(t, 24, 44)) };
    const lo = CE.hgoGearsLo(W, H, t, gears, mono);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lo, 0, 0, lo.width * 4, lo.height * 4);
    ctx.fillStyle = INK;
    for (let i = 0; i < 30; i++) {
      const q = (rnd(i, 4) + t * 0.004 * (0.5 + rnd(i, 5))) % 1;
      const x = hx + 20 + q * (W - hx);
      const y = top + rnd(i, 6) * (bot - top);
      const s = 4 * (1 + (i % 3));
      ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, s, s);
    }
    ctx.restore();
    // a borda do corte em tinta
    ctx.fillStyle = INK;
    for (let y = 0; y <= H; y += 24) ctx.fillRect(cut(y) - 2, y, 6, 24);
    if (mono.k > 0) CE.cineGlow(ctx, mono.x, mono.y, 120, 'rgba(125,211,252,0.55)', mono.k);
    CE.ptdSfx(S, 14, 'engrenagem', () => window.SFX?.click?.());
  }
})();
