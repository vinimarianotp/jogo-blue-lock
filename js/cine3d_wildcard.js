// ============================================================================
// CUTSCENES EM 3D — o arco do Wild Card (js/cine_wildcard.js refeito no 3D)
// Kit: js/cine3d_kit.js. Mesmos planos, tempos e legendas da versão 2D.
//   wildcard_door    • a ala dos quartos vira a ala dos eliminados (telão vermelho no fundo)
//                      → o cômodo das duas portas (montado na área vazia, K.VOID)
//   wildcard_hell    • o laboratório do Wild Card (área vazia): racks de LEDs, a lente no teto,
//                      a plataforma, os hologramas
//   kunigami_return  • o campo do prédio com os refletores morrendo; a porta preta na parede norte
//   wildcard_verdict • o campo vazio depois do jogo; o telão do Ego em cima da parede norte
// Closes de rosto/olhos, painéis de mangá e letreiros ficam no overlay, com os mesmos
// ajudantes 2D da versão antiga (wcdEyes, wcdKidMemory, wcdTimeZ, finPanel, rincStamp...).
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
  const rnd = (i, s = 1) => {
    const a = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return a - Math.floor(a);
  };
  const mixHex = (a, b, k) => {
    const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(k)).toString(16).padStart(2, '0')).join('');
  };
  // passo da caminhada: os quadros da corrida, devagar
  const WALKF = (f, sp = 5) => 1 + (Math.floor(f / sp) % 4) * 4;
  const RUNF = (f) => 1 + (Math.floor(f / 3) % 4) * 4;

  const KUNI_C = '#fb923c';
  const COLD_C = '#c8ab94';
  const EGO_C = '#00f5d4';
  const VOICE_C = '#f87171';
  const NARR_C = '#94a3b8';
  const CHI_C = '#fb7185';
  // o Kunigami: Blue Lock, Wild Card (uniforme preto) e o "frio" (olho apagado)
  const WILD = { jerseyPrimary: '#17171c', jerseySecondary: '#9a3412' };
  const COLD = Object.assign({ mouth: 'thin', eyeColor: '#6b625b', hairColor: '#d97a34', hairSecondary: '#b7611f', auraColor: '#a8927e' }, WILD);
  // o holograma de treino: boneco todo laranja, aceso (fantasma)
  const HOLO = { id: 'wcd3_holo', name: 'Holograma', hairStyle: 'spiky_tall', hairColor: '#fb923c', hairSecondary: '#fdba74', skinColor: '#fb923c', eyeColor: '#fed7aa', jerseyPrimary: '#ea580c', jerseySecondary: '#fdba74', number: 0 };

  // ---------------------------------------------------------------- canvas guardados
  const CV = {};
  // canvas pintado uma vez só (pixel art)
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
  // canvas redesenhado de tempos em tempos (telões): devolve { cv, dirty }
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
  // brilho redondo (degradê até o transparente); cx/cy = centro em 0..1
  const glowCv = (col, cx = 0.5, cy = 0.5) =>
    paint(`glow|${col}|${cx}|${cy}`, 64, 64, (g) => {
      const r = 64 * Math.max(cx, 1 - cx, cy, 1 - cy);
      const gr = g.createRadialGradient(64 * cx, 64 * cy, 0, 64 * cx, 64 * cy, r);
      gr.addColorStop(0, col);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    });
  // faixa vertical de luz (feixe de refletor visto de lado)
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
  // placa em pé que sempre encara a câmera (ex.: feixe de luz)
  const faceCam = (K, x, y) => Math.atan2(K.c.eye[2] - y, K.c.eye[0] - x);
  // placa em pé com a imagem do jeito certo: o K.quad do kit põe o u da direita para a
  // esquerda de quem olha de frente (o texto saía espelhado); virada de costas fica certa
  const Q = (K, o) => K.quad(Object.assign({}, o, { ang: (o.ang ?? 0) + Math.PI }));
  // Os bonecos e sprites em pé viram para o lado do Hub.camA (o ângulo da câmera do mapa),
  // não para a câmera da cena: com a câmera olhando para o leste/oeste eles ficavam de
  // perfil (uma risca). Aqui o Hub.camA acompanha a câmera da cena durante o quadro e volta
  // ao valor antigo no overlay (logo depois do desenho 3D).
  const Hub = window.Hub;
  const fixYaw = (def) => {
    const sc = def.scene;
    const ov = def.overlay;
    def.scene = function (K, S) {
      sc.call(this, K, S);
      if (!Hub) return;
      if (CE._wcd3CamA === undefined) CE._wcd3CamA = Hub.camA;
      const e = K.c.eye;
      const l = K.c.look;
      if (Math.abs(l[0] - e[0]) + Math.abs(l[2] - e[2]) > 1e-4) Hub.camA = Math.atan2(l[2] - e[2], l[0] - e[0]);
    };
    def.overlay = function (ctx, S, K) {
      if (Hub && CE._wcd3CamA !== undefined) {
        Hub.camA = CE._wcd3CamA;
        CE._wcd3CamA = undefined;
      }
      if (ov) ov.call(this, ctx, S, K);
    };
    return def;
  };

  // ---------------------------------------------------------------- peças comuns
  // a mala do Blue Lock no ombro (vista de costas)
  const bag = (K, x, y, k = 0.9, dark = false) => {
    const cv = dark ? CE.wcdBagDarkCv() : CE.wcdBagCv();
    const dx = K.c.eye[0] - x;
    const dy = K.c.eye[2] - y;
    const d = Math.hypot(dx, dy) || 1;
    const s = 1.12 * k;
    K.sprite(cv, { x: x + (dx / d) * 0.05, y: y + (dy / d) * 0.05, z: 0.9 * k - s * 0.93, w: s, h: s, light: dark ? [0.25, 0.2, 0.2] : [0.85, 0.85, 0.95] });
  };
  // aura fria em pixel (a mesma da 2D) num canvas em pé atrás do boneco, acesa
  const aura = (K, key, x, y, t, k, pal) => {
    if (k <= 0) return;
    const A = live('aura|' + key, 160, 200, Math.floor(t), 2, (g) => CE.wcdAura(g, 80, 188, 216, t, k, pal));
    const dx = K.c.eye[0] - x;
    const dy = K.c.eye[2] - y;
    const d = Math.hypot(dx, dy) || 1;
    K.sprite(A.cv, { x: x - (dx / d) * 0.12, y: y - (dy / d) * 0.12, z: -0.04, w: 0.95, h: 1.2, glow: true, alpha: 0.45, dirty: A.dirty });
  };
  // fumaça rente ao chão: manchas de luz deitadas, andando devagar
  const smoke = (K, x0, x1, y0, y1, t, n, col, a = 1, seed = 1) => {
    const cv = glowCv(col);
    for (let i = 0; i < n; i++) {
      const span = x1 - x0;
      const x = x0 + ((((rnd(i, seed) * span + t * 0.004 * (0.5 + rnd(i, seed + 1))) % span) + span) % span);
      const y = y0 + rnd(i, seed + 2) * (y1 - y0) + Math.sin(t * 0.012 + i) * 0.1;
      const r = 0.7 + rnd(i, seed + 3) * 0.9;
      const al = Math.min(0.95, a * (0.55 + 0.45 * Math.sin(t * 0.02 + i * 1.3)));
      if (al <= 0.02) continue;
      K.floor({ x0: x - r, y0: y - r * 0.6, x1: x + r, y1: y + r * 0.6, z: 0.02 + i * 0.004, img: cv, em: true, alpha: al });
    }
  };
  // olhos em close numa faixa de mangá atravessando a tela (como o wcdEyeBand da 2D)
  const eyeStrip = (ctx, S, char, y0, y1, k, draw) => {
    if (k <= 0) return;
    const { W } = S;
    const h = y1 - y0;
    ctx.save();
    ctx.translate(0, (1 - k) * -40);
    ctx.globalAlpha *= Math.min(1, k * 1.5);
    ctx.beginPath();
    ctx.rect(0, y0, W, h);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#040303';
    ctx.fillRect(0, y0, W, h);
    draw((y0 + y1) / 2);
    ctx.restore();
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, y0 - 5, W, 5);
    ctx.fillRect(0, y1, W, 5);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, y0 - 3, W, 2);
    ctx.fillRect(0, y1 + 1, W, 2);
    ctx.restore();
  };
  // granulado igual ao da versão 2D (que desenhava por cima de tudo)
  const grain = (ctx, S) => CE.foxcGrain(ctx, S.W, S.H, 0.06);
  // aquecimento: monta um boneco/canvas 2D pesado por quadro durante o plano 1
  const warm = (S, key, list) => {
    if (S.phase !== 0 || S.t < 2) return;
    const run = `${key}|${CE._cineRun}`;
    if (CE._wcd3Run !== run) {
      CE._wcd3Run = run;
      CE._wcd3Idx = 0;
    }
    if (CE._wcd3Idx < list.length) {
      try {
        list[CE._wcd3Idx++].call(CE);
      } catch (e) {}
    }
  };
  const cast = () => CE.wcdCast();
  const spr = (who, o, base = 180) =>
    function () {
      this.finSprEntry(this.wcdCast()[who], base, o);
    };

  // ==========================================================================
  // 1. A PORTA DO CORINGA
  // ==========================================================================
  const CORR_Y = 19.5; // meio da ala dos quartos
  // o cômodo das duas portas (área vazia)
  const VX = 86;
  const VY = 17;
  const RM = { x0: VX - 3.6, x1: VX + 3.6, y0: VY - 4, y1: VY + 3.4, h: 1.75 };
  const DOOR = { x0: VX + 1.0, x1: VX + 2.4, y: RM.y0, h: 1.32 }; // a porta preta
  const KY = VY - 1.5; // onde ele para, de frente para as portas
  const EXIT = { x: VX - 2.1, w: 0.78, h: 1.22 }; // a SAÍDA

  const concreteCv = () =>
    paint('concrete', 256, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#252c39');
      gr.addColorStop(1, '#343d4c');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(4,6,10,0.6)';
      for (let x = 18; x < w; x += 40) g.fillRect(x, 6, 1, h);
      g.fillRect(0, 30, w, 1);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${rnd(i, 2) < 0.5 ? '0,0,0' : '148,163,184'},0.06)`;
        g.fillRect(rnd(i, 3) * w, rnd(i, 4) * h, 4 + rnd(i, 5) * 18, 1 + rnd(i, 6) * 6);
      }
      g.fillStyle = '#1b222d';
      g.fillRect(0, 2, w, 3);
      g.fillStyle = '#05070b';
      g.fillRect(0, h - 3, w, 3);
    });
  const floorCv = () =>
    paint('dfloor', 96, 96, (g, w, h) => {
      g.fillStyle = '#1c222c';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(30,38,52,0.9)';
      for (let i = 0; i < w; i += 12) {
        g.fillRect(i, 0, 1, h);
        g.fillRect(0, i, w, 1);
      }
    });
  // a porta da SAÍDA: janela fosca quente, barra e a placa verde
  const exitCv = () =>
    paint('exitdoor', 40, 64, (g) => {
      g.fillStyle = '#20262f';
      g.fillRect(0, 0, 40, 64);
      g.fillStyle = '#4a5466';
      g.fillRect(2, 2, 36, 62);
      g.fillStyle = '#3c4555';
      g.fillRect(33, 2, 5, 62);
      g.fillStyle = '#9aa5b5';
      g.fillRect(6, 34, 28, 2);
      g.fillStyle = '#5b6576';
      g.fillRect(6, 36, 28, 1);
      g.fillStyle = '#20262f';
      g.fillRect(9, 7, 20, 18);
    });
  const exitWinCv = () =>
    paint('exitwin', 18, 16, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 16);
      gr.addColorStop(0, '#fff7d6');
      gr.addColorStop(1, '#f5d77a');
      g.fillStyle = gr;
      g.fillRect(0, 0, 18, 16);
      g.fillStyle = 'rgba(120,90,30,0.25)';
      for (let y = 1; y < 16; y += 3) g.fillRect(0, y, 18, 1);
    });
  const exitSignCv = () =>
    paint('exitsign', 40, 12, (g) => {
      g.fillStyle = '#0f3d22';
      g.fillRect(0, 0, 40, 12);
      g.fillStyle = '#16a34a';
      g.fillRect(1, 1, 38, 10);
      g.fillStyle = '#f0fdf4';
      [[4, 3, 2, 2], [4, 5, 2, 3], [2, 6, 2, 1], [6, 6, 2, 1], [3, 8, 1, 2], [6, 8, 1, 1], [7, 9, 1, 1], [10, 6, 3, 1], [12, 5, 1, 3]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
      window.Hub?.ptext ? window.Hub.ptext(g, 'SAIDA', 16, 3, '#f0fdf4', 1) : null;
    });
  // folha da porta preta (metal escovado) — side -1 = esquerda
  const leafCv = (side) =>
    paint('leaf' + side, 32, 64, (g, w, h) => {
      g.fillStyle = '#060608';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 2; i < w; i += 4) g.fillRect(i, 0, 1, h);
      g.fillStyle = 'rgba(255,255,255,0.07)';
      g.fillRect(side < 0 ? 1 : w - 2, 0, 1, h);
      g.fillStyle = '#0e0e12';
      g.fillRect(4, 10, w - 8, 1);
      g.fillRect(4, h - 14, w - 8, 1);
      // faixas de perigo no pé
      for (let x = -8; x < w + 8; x += 6) {
        g.fillStyle = '#c2410c';
        g.beginPath();
        g.moveTo(x, h);
        g.lineTo(x + 3, h);
        g.lineTo(x + 8, h - 5);
        g.lineTo(x + 5, h - 5);
        g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(0, h - 5, w, 5);
      if (window.Hub?.ptext) window.Hub.ptext(g, side < 0 ? 'WILD' : 'CARD', side < 0 ? w - 4 : 4, 4, '#7f1d1d', 1, side < 0 ? 'right' : 'left');
    });
  // lá dentro da porta preta: o corredor vermelho descendo, em perspectiva
  const insideCv = () =>
    paint('inside', 64, 64, (g, w, h) => {
      const cx = w / 2;
      const cy = h * 0.55;
      const gr = g.createRadialGradient(cx, cy, 2, cx, cy, w * 0.75);
      gr.addColorStop(0, '#fff7ed');
      gr.addColorStop(0.25, '#fdba74');
      gr.addColorStop(0.6, '#c2410c');
      gr.addColorStop(1, '#3b0707');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(69,10,10,0.55)';
      g.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const k = i / 6;
        g.beginPath();
        g.moveTo(w * k, h);
        g.lineTo(cx + (k - 0.5) * w * 0.2, cy + h * 0.05);
        g.stroke();
      }
      for (let i = 1; i < 6; i++) {
        const yy = cy + h * 0.05 + (h - cy) * Math.pow(i / 6, 1.6);
        g.beginPath();
        g.moveTo(0, yy);
        g.lineTo(w, yy);
        g.stroke();
      }
    });
  const speakerCv = () =>
    paint('speaker', 24, 14, (g) => {
      g.fillStyle = '#05070b';
      g.fillRect(0, 0, 24, 14);
      g.fillStyle = '#1b222d';
      for (let i = 0; i < 6; i++) g.fillRect(2 + i * 4, 3, 2, 8);
    });

  // o cômodo das duas portas: open 0..1 (a porta preta abrindo), dark (depois que fecha)
  function doorRoom(K, t, o = {}) {
    const open = o.open || 0;
    const dark = o.dark || 0;
    const leak = (1 - dark * 0.65) * (0.78 + 0.22 * Math.sin(t * 0.05));
    K.sky('#030406', '#05070b', 0);
    K.fog('#05070b', 0.05);
    K.ambient(dark ? '#3a3f4a' : '#9aa3b4');
    K.expo(dark ? 0.7 : 0.98);
    const { x0, x1, y0, y1, h } = RM;
    K.floor({ x0, y0, x1, y1, img: floorCv() });
    K.floor({ x0, y0, x1, y1, z: h, color: '#05070b' });
    // paredes (a do fundo com o vão da porta preta)
    Q(K, { x: (x0 + DOOR.x0 - 0.12) / 2, y: y0, w: DOOR.x0 - 0.12 - x0, h, ang: Math.PI / 2, img: concreteCv() });
    Q(K, { x: (DOOR.x1 + 0.12 + x1) / 2, y: y0, w: x1 - DOOR.x1 - 0.12, h, ang: Math.PI / 2, img: concreteCv() });
    Q(K, { x: (DOOR.x0 + DOOR.x1) / 2, y: y0, z: DOOR.h + 0.08, w: DOOR.x1 - DOOR.x0 + 0.24, h: h - DOOR.h - 0.08, ang: Math.PI / 2, color: '#0a0d13' });
    Q(K, { x: x0, y: (y0 + y1) / 2, w: y1 - y0, h, ang: 0, img: concreteCv() });
    Q(K, { x: x1, y: (y0 + y1) / 2, w: y1 - y0, h, ang: Math.PI, img: concreteCv() });
    Q(K, { x: (x0 + x1) / 2, y: y1, w: x1 - x0, h, ang: -Math.PI / 2, img: concreteCv() });
    // cano no teto
    K.box({ x0, y0: y0 + 0.3, x1, y1: y0 + 0.42, z0: h - 0.16, z1: h - 0.06, color: '#1b222d' });
    // a SAÍDA: porta, janela quente, placa verde e a luz por baixo
    Q(K, { x: EXIT.x, y: y0 + 0.01, w: EXIT.w, h: EXIT.h, ang: Math.PI / 2, img: exitCv() });
    Q(K, { x: EXIT.x - 0.04, y: y0 + 0.015, z: EXIT.h * 0.6, w: EXIT.w * 0.48, h: EXIT.h * 0.28, ang: Math.PI / 2, img: exitWinCv(), em: true });
    Q(K, { x: EXIT.x, y: y0 + 0.015, z: EXIT.h + 0.12, w: 0.5, h: 0.15, ang: Math.PI / 2, img: exitSignCv(), em: true });
    K.floor({ x0: EXIT.x - 0.9, y0, x1: EXIT.x + 0.9, y1: y0 + 1.1, img: glowCv('rgba(253,230,138,0.4)', 0.5, 0), em: true });
    Q(K, { x: EXIT.x, y: y0 + 0.02, z: EXIT.h - 0.3, w: 1.6, h: 0.9, ang: Math.PI / 2, img: glowCv('rgba(74,222,128,0.18)'), em: true });
    // a porta preta: batente, lá dentro (aceso quando abre), as folhas e as frestas
    const dw = DOOR.x1 - DOOR.x0;
    const mid = (DOOR.x0 + DOOR.x1) / 2;
    K.box({ x0: DOOR.x0 - 0.12, y0: y0 - 0.02, x1: DOOR.x1 + 0.12, y1: y0 + 0.06, z0: DOOR.h, z1: DOOR.h + 0.1, color: '#020203' });
    K.box({ x0: DOOR.x0 - 0.12, y0: y0 - 0.02, x1: DOOR.x0, y1: y0 + 0.06, z0: 0, z1: DOOR.h, color: '#020203' });
    K.box({ x0: DOOR.x1, y0: y0 - 0.02, x1: DOOR.x1 + 0.12, y1: y0 + 0.06, z0: 0, z1: DOOR.h, color: '#020203' });
    if (open > 0) {
      // o corredor lá dentro (uma caixa acesa que vai para o fundo)
      Q(K, { x: mid, y: y0 - 2.4, w: dw, h: DOOR.h, ang: Math.PI / 2, img: insideCv(), em: true });
      K.floor({ x0: DOOR.x0, y0: y0 - 2.4, x1: DOOR.x1, y1: y0, color: '#c2410c', em: true });
      Q(K, { x: DOOR.x0, y: y0 - 1.2, w: 2.4, h: DOOR.h, ang: 0, color: '#7c2d12', em: true });
      Q(K, { x: DOOR.x1, y: y0 - 1.2, w: 2.4, h: DOOR.h, ang: Math.PI, color: '#7c2d12', em: true });
      K.floor({ x0: DOOR.x0, y0: y0 - 2.4, x1: DOOR.x1, y1: y0, z: DOOR.h, color: '#3b0707', em: true });
      // a luz invadindo o cômodo
      K.floor({ x0: mid - 2.4, y0, x1: mid + 2.4, y1: y0 + 3.6 * open + 0.2, img: glowCv('rgba(251,146,60,0.55)', 0.5, 0), em: true, alpha: Math.min(0.95, open) });
    }
    const off = open * (dw / 2 + 0.1);
    Q(K, { x: DOOR.x0 + dw / 4 - off, y: y0 - 0.03, w: dw / 2, h: DOOR.h, ang: Math.PI / 2, img: leafCv(-1) });
    Q(K, { x: DOOR.x1 - dw / 4 + off, y: y0 - 0.03, w: dw / 2, h: DOOR.h, ang: Math.PI / 2, img: leafCv(1) });
    if (open < 0.04) {
      const a = Math.max(0, leak);
      Q(K, { x: mid, y: y0 + 0.01, w: 0.025, h: DOOR.h, ang: Math.PI / 2, color: '#fb923c', em: true, alpha: a });
      Q(K, { x: mid, y: y0 + 0.01, z: 0, w: dw, h: 0.03, ang: Math.PI / 2, color: '#fed7aa', em: true, alpha: a });
      Q(K, { x: mid, y: y0 + 0.01, z: DOOR.h - 0.02, w: dw, h: 0.02, ang: Math.PI / 2, color: '#fb923c', em: true, alpha: a * 0.8 });
    }
    // poça laranja no chão e a lente vermelha em cima
    K.floor({ x0: mid - 1.8, y0, x1: mid + 1.8, y1: y0 + 1.3, img: glowCv('rgba(249,115,22,0.5)', 0.5, 0), em: true, alpha: Math.min(0.95, Math.max(leak * 0.8, open)) });
    Q(K, { x: mid, y: y0 + 0.07, z: DOOR.h + 0.02, w: 0.06, h: 0.06, ang: Math.PI / 2, color: '#ef4444', em: true });
    Q(K, { x: mid, y: y0 + 0.08, z: DOOR.h - 0.1, w: 0.3, h: 0.3, ang: Math.PI / 2, img: glowCv('rgba(239,68,68,0.7)'), em: true, alpha: 0.6 + 0.4 * Math.sin(t * 0.07) });
    // fumaça fria saindo por baixo da porta
    smoke(K, mid - 2.2, mid + 2.4, y0 + 0.1, y0 + 1.0, t, 6, 'rgba(249,115,22,0.22)', 1 + open * 1.5, 4);
    // o alto-falante no teto
    K.box({ x0: VX - 0.05, y0: VY - 1.25, x1: VX + 0.05, y1: VY - 1.15, z0: h - 0.3, z1: h, color: '#0b0f17' });
    K.box({ x0: VX - 0.3, y0: VY - 1.3, x1: VX + 0.3, y1: VY - 1.1, z0: h - 0.5, z1: h - 0.3, color: '#05070b' });
    Q(K, { x: VX, y: VY - 1.09, z: h - 0.48, w: 0.56, h: 0.16, ang: Math.PI / 2, img: speakerCv() });
  }
  const SPEAKER = [VX, 1.3, VY - 1.1];

  // a ala dos eliminados: o telão vermelho na parede do fundo (oeste)
  function elimCorr(K, S) {
    const L = live('elim', 420, 210, S.f, 3, (g) => CE.wcdElimScreen(g, 22, 22, 376, 166, S.t));
    Q(K, { x: 2.03, y: CORR_Y, z: 0.32, w: 2.4, h: 1.2, ang: 0, img: L.cv, dirty: L.dirty, em: true });
    K.floor({ x0: 2, y0: 18.05, x1: 6.5, y1: 20.95, img: glowCv('rgba(239,68,68,0.32)', 0, 0.5), em: true });
  }

  CE.registerCine3D('wildcard_door', fixYaw({
    phases: [290, 360, 300, 300, 360],
    music: 'mystery',
    title: '🃏 A PORTA DO CORINGA',
    tags: ['PLANO 1 • O CORREDOR BRANCO', 'PLANO 2 • ELIMINADO', 'PLANO 3 • DUAS PORTAS', 'PLANO 4 • A MÃO NO PEITO', 'PLANO 5 • WILD CARD'],
    subs: [
      [{ from: 16, to: 282, who: 'NARRADOR', text: 'Segunda Seleção. Fim da linha.', color: NARR_C }],
      [{ from: 92, to: 352, who: 'KUNIGAMI', text: '(Eu só queria ser um herói...)', color: KUNI_C }],
      [{ from: 50, to: 292, who: 'EGO', text: '"Existe uma segunda chance."', color: EGO_C }],
      [{ from: 20, to: 240, who: 'EGO', text: '"Ela vai te custar tudo."', color: EGO_C }],
      [{ from: 8, to: 258, who: 'KUNIGAMI', text: '"...Que custe o que custar."', color: KUNI_C }]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const kuni = (o) => K.actor('kunigami', Object.assign({ kit: 'blueLock', k: 0.9 }, o));
      if (phase === 0) {
        // o corredor branco: ele anda com a mala até o telão do ELIMINADO lá no fundo
        K.expo(0.92);
        elimCorr(K, S);
        const kx = lerp(12.4, 7.2, t / 290);
        const e = easeIO(t / 290);
        const n = K.noise(t * 0.5, 2) * 0.012;
        K.cam([lerp(14.9, 14.1, e), 1.02 + n, CORR_Y + n], [2.2, lerp(0.84, 0.74, e), CORR_Y], lerp(52, 45, e));
        kuni({ x: kx, y: CORR_Y, ang: Math.PI, anim: 'run', frame: WALKF(f, 5) });
        bag(K, kx, CORR_Y);
      } else if (phase === 1) {
        // o rosto na luz vermelha (a câmera entre ele e o telão)
        K.expo(0.8);
        elimCorr(K, S);
        const e = easeIO(t / 360);
        const n1 = K.noise(t * 0.5, 2) * 0.02;
        const n2 = K.noise(t * 0.5, 5) * 0.015;
        kuni({ x: 6.4, y: CORR_Y, ang: Math.PI, light: [1.35, 0.56, 0.5] });
        K.cam([lerp(3.9, 4.15, e), 0.7 + n2, CORR_Y + 0.05 + n1], [6.4, 0.6, CORR_Y + 0.62], 40);
      } else if (phase === 2) {
        // as duas portas: ele de costas, no meio, a luz verde de um lado e a laranja do outro
        const talk = seg(t, 48, 58) * (1 - seg(t, 262, 280));
        doorRoom(K, t, { talk });
        const e = easeIO(t / 300);
        const n = K.noise(t * 0.5, 3) * 0.01;
        K.cam([lerp(VX - 0.9, VX + 0.6, e), 0.95 + n, lerp(KY + 2.4, KY + 2.05, e)], [lerp(VX - 0.6, VX + 0.5, e), 0.72, RM.y0], 50);
        kuni({ x: VX - 0.1, y: KY, ang: -Math.PI / 2, light: [0.62, 0.6, 0.62] });
        bag(K, VX - 0.1, KY);
      } else if (phase === 3) {
        // a mão no peito: de frente, entre as duas luzes
        doorRoom(K, t, {});
        const e = easeIO(t / 300);
        kuni({ x: VX - 0.1, y: KY, ang: -Math.PI / 2, light: [0.85, 0.78, 0.62] });
        const n = K.noise(t * 0.5, 1) * 0.01;
        K.cam([VX - 0.1 + n, 0.72, lerp(KY - 1.95, KY - 1.8, e)], [VX - 0.1, 0.6, KY], 44);
      } else {
        // ele entra na porta preta; a porta fecha
        const open = ease(seg(t, 46, 96)) * (1 - seg(t, 196, 206));
        const shut = t >= 206;
        doorRoom(K, t, { open, dark: shut ? 1 : 0 });
        let x;
        let y;
        let a = 1;
        if (t < 140) {
          const e = easeIO(seg(t, 0, 140));
          x = lerp(VX - 0.1, (DOOR.x0 + DOOR.x1) / 2, e);
          y = lerp(KY, RM.y0 + 0.5, e);
        } else {
          const e = seg(t, 140, 192);
          x = (DOOR.x0 + DOOR.x1) / 2;
          y = lerp(RM.y0 + 0.5, RM.y0 - 1.6, e);
          a = 1 - seg(t, 186, 196);
        }
        const kc = easeIO(seg(t, 0, 200));
        const sh = (t >= 46 && t < 96 ? 0.02 * (1 - seg(t, 46, 96)) : 0) + (shut ? 0.06 * (1 - seg(t, 206, 236)) : 0);
        const n1 = K.noise(t * 2.2, 3) * sh;
        const n2 = K.noise(t * 2.2, 8) * sh;
        K.cam([lerp(VX - 0.4, VX + 1.2, kc) + n1, 0.92 + n2, lerp(KY + 2.4, RM.y0 + 2.6, kc)], [lerp(VX + 0.3, VX + 1.7, kc), lerp(0.7, 0.66, kc), RM.y0], lerp(50, 44, kc));
        const sil = open > 0.05;
        if (a > 0.02) {
          kuni({ x, y, ang: -Math.PI / 2, anim: 'run', frame: WALKF(f, 5), alpha: a, light: sil ? [0.16, 0.1, 0.1] : [0.62, 0.6, 0.62] });
          bag(K, x, y, 0.9, sil);
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = cast();
      if (phase === 0) {
        CE.finKicker(ctx, 40, top + 30, 'BLUE LOCK • ALA DOS ELIMINADOS • 02:14', seg(t, 8, 50));
        CE.finKicker(ctx, 40, top + 58, 'FIM DA SEGUNDA SELEÇÃO', seg(t, 40, 90), '#ef4444');
      } else if (phase === 1) {
        // a luz vermelha passando pelo rosto
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const by = top + ((t * 1.4) % (bot - top + 200)) - 100;
        const g = ctx.createLinearGradient(0, by - 40, 0, by + 40);
        g.addColorStop(0, 'rgba(248,113,113,0)');
        g.addColorStop(0.5, 'rgba(248,113,113,0.1)');
        g.addColorStop(1, 'rgba(248,113,113,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, by - 40, W, 80);
        ctx.restore();
        CE.rincStamp(ctx, 'ELIMINADO.', 960, top + 120, 74, '#fecaca', t, 14, 3, 520, 'center', 1 - seg(t, 118, 134));
        const km = ease(seg(t, 130, 150));
        if (km > 0) {
          const pts = [[700, top + 22], [W - 26, top + 14], [W - 26, bot - 20], [672, bot - 12]];
          CE.finPanel(ctx, pts, () => CE.wcdKidMemory(ctx, 660, top, W - 660, bot - top, t - 130, seg(t, 290, 345)), { dx: (1 - km) * 620 });
        }
        CE.cineSfx(S, 130, 'memoria', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        // a voz no alto-falante (ondas ciano)
        const talk = seg(t, 48, 58) * (1 - seg(t, 262, 280));
        const p = K.screen(SPEAKER[0], SPEAKER[1], SPEAKER[2]);
        if (talk > 0 && p) {
          ctx.save();
          ctx.strokeStyle = '#00f5d4';
          ctx.lineWidth = 3;
          for (let i = 0; i < 3; i++) {
            const ph = ((t * 1.1 + i * 32) % 96) / 96;
            ctx.globalAlpha = talk * (1 - ph) * 0.7;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 30 + ph * 110, Math.PI * 0.15, Math.PI * 0.85);
            ctx.stroke();
          }
          ctx.restore();
          CE.cineGlow(ctx, p.x, p.y, 70, 'rgba(0,245,212,0.5)', talk);
        }
        CE.finKicker(ctx, 40, top + 30, 'O FIM DO CORREDOR', seg(t, 6, 40));
        CE.finKicker(ctx, 40, top + 58, 'DUAS PORTAS', seg(t, 30, 70), '#fb923c');
        CE.cineSfx(S, 48, 'falante', () => window.SFX?.blip?.(160));
      } else if (phase === 3) {
        // a luz dividida: verde da SAÍDA de um lado, laranja da porta preta do outro
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        CE.foxcGradH(ctx, 0, top, W / 2, bot - top, [[0, 'rgba(34,197,94,0.16)'], [1, 'rgba(34,197,94,0)']]);
        CE.foxcGradH(ctx, W / 2, top, W / 2, bot - top, [[0, 'rgba(234,88,12,0)'], [1, 'rgba(234,88,12,0.2)']]);
        ctx.restore();
        // os olhos: para um lado, para o outro... e decidem
        const ke = seg(t, 24, 40) * (1 - seg(t, 214, 232));
        eyeStrip(ctx, S, c.kuni, top + 40, top + 250, ke, (ey) => {
          const U = CE.wcdEyeBand(ctx, c.kuni, W / 2, ey, 1000, { dim: 0.2, dimTint: '20,8,4' });
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          CE.foxcGradH(ctx, 0, ey - 120, W / 2, 240, [[0, 'rgba(34,197,94,0.22)'], [1, 'rgba(34,197,94,0)']]);
          CE.foxcGradH(ctx, W / 2, ey - 120, W / 2, 240, [[0, 'rgba(234,88,12,0)'], [1, 'rgba(234,88,12,0.26)']]);
          ctx.restore();
          const look = t < 30 ? 0 : t < 105 ? -1 : t < 205 ? 1 : 0;
          CE.wcdEyes(ctx, W / 2, ey, U, { ring: '#f59e0b', iris: '#7c2d12', look, angry: t > 200, glow: 'rgba(249,115,22,0.25)', glowA: seg(t, 190, 214) });
          const dy = ease(seg(t, 40, 130)) * 1.6 * U;
          ctx.fillStyle = 'rgba(186,230,253,0.85)';
          ctx.fillRect(Math.round(W / 2 - 7.6 * U), Math.round(ey - 2.6 * U + dy), Math.ceil(U * 0.5), Math.ceil(U * 0.8));
        });
        // o punho no peito (painel)
        const kp = ease(seg(t, 118, 136));
        if (kp > 0) {
          const beat = [146, 168, 226, 248].reduce((m, b) => Math.max(m, t >= b ? 1 - seg(t, b, b + 10) : 0), 0);
          CE.finPanel(ctx, [[34, bot - 236], [478, bot - 250], [494, bot - 18], [26, bot - 12]], () => {
            const s = 10.4 * (1 + beat * 0.03);
            const cv = CE.wcdFistPanelCv();
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(cv, 262 - (cv.width * s) / 2, bot - 134 - (cv.height * s) / 2, cv.width * s, cv.height * s);
            ctx.restore();
            ctx.fillStyle = 'rgba(40,6,2,0.18)';
            ctx.fillRect(0, bot - 260, 520, 260);
          }, { dy: (1 - kp) * 300 });
          [146, 168, 226, 248].forEach((b, i) => {
            if (t >= b && t < b + 40) CE.rincStamp(ctx, 'TUM', 560 + (i % 2) * 130, bot - 206 + (i % 2) * 60, 40, '#fecaca', t, b, 2, 0, 'center', 1 - seg(t, b + 24, b + 40));
          });
        }
        [146, 168, 226, 248].forEach((b, i) => CE.cineSfx(S, b, 'tum' + i, () => window.SFX?.kick?.(0.15)));
      } else {
        // a luz lá de dentro engole a silhueta
        if (t >= 140 && t < 206) {
          const p = K.screen((DOOR.x0 + DOOR.x1) / 2, 0.5, RM.y0 - 0.6);
          if (p) CE.cineGlow(ctx, p.x, p.y, 180, 'rgba(255,237,213,0.9)', seg(t, 150, 192) * (1 - seg(t, 196, 206)));
        }
        if (t >= 46) CE.cineFlash(ctx, W, H, 0.32 * (1 - seg(t, 46, 62)), '#fed7aa');
        if (t >= 206) {
          ctx.fillStyle = `rgba(1,2,4,${0.5 * seg(t, 206, 240)})`;
          ctx.fillRect(0, top, W, bot - top);
        }
        CE.cineTitleCard(ctx, W, (top + bot) / 2 - 30, seg(t, 236, 268), { kicker: 'UMA SEGUNDA CHANCE • UM PREÇO', title: 'WILD CARD', sub: 'O que acontece lá dentro, ninguém sabe.', color: '#f97316' });
        CE.cineSfx(S, 46, 'abre', () => window.SFX?.whoosh?.());
        CE.cineSfx(S, 206, 'fecha', () => {
          window.SFX?.kick?.(1);
          window.SFX?.tackle?.();
        });
      }
      warm(S, 'door', [
        spr('kid', { animState: 'call_pass', frame: 1 }),
        function () {
          this.wcdCapeCv();
          this.wcdFistPanelCv();
          this.wcdBagDarkCv();
        },
        spr('kuni', { dim: 0.2, dimTint: '20,8,4' })
      ]);
      grain(ctx, S);
    }
  }));

  // ==========================================================================
  // 2. O INFERNO DO WILD CARD — o laboratório (área vazia): racks cheios de LEDs nas
  // paredes, a lente vermelha pendurada no teto, a plataforma redonda no meio
  // ==========================================================================
  const LAB = { x0: VX - 5, x1: VX + 5, y0: VY - 6.5, y1: VY + 6.5, h: 2.4 };
  const labFloorCv = () =>
    paint('labfloor', 160, 208, (g, w, h) => {
      g.fillStyle = '#0d0909';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(234,88,12,0.22)';
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 1);
      for (let i = 0; i < 60; i++) {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(rnd(i, 7) * w, rnd(i, 8) * h, 3 + rnd(i, 9) * 10, 2);
      }
    });
  const labWallCv = () =>
    paint('labwall', 128, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#1d1518');
      gr.addColorStop(1, '#120d0f');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 1, h);
      g.fillRect(0, 22, w, 1);
    });
  const labWordCv = () =>
    paint('labword', 256, 48, (g, w, h) => {
      g.font = 'italic 900 40px "Segoe UI", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(127,29,29,0.75)';
      g.fillText('WILD CARD', w / 2, h / 2);
      g.strokeStyle = 'rgba(249,115,22,0.3)';
      g.lineWidth = 1;
      g.strokeText('WILD CARD', w / 2, h / 2);
    });
  // os LEDs de um rack (só as luzinhas; o fundo é transparente)
  const ledCv = (seed) =>
    paint('led' + seed, 30, 96, (g) => {
      for (let r = 0; r < 15; r++) {
        g.fillStyle = 'rgba(40,28,28,0.9)';
        g.fillRect(1, 4 + r * 6 + 3, 28, 1);
        for (let j = 0; j < 6; j++) {
          const v = rnd(r * 7 + j + seed * 131, 5);
          if (v < 0.35) continue;
          g.fillStyle = v < 0.8 ? '#f59e0b' : v < 0.93 ? '#ef4444' : '#fde68a';
          g.fillRect(2 + j * 5, 4 + r * 6, 2, 2);
        }
      }
    });
  const discCv = (col, ring) =>
    paint(`disc|${col}|${ring || ''}`, 64, 64, (g) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(32, 32, 31, 0, TAU);
      g.fill();
      if (ring) {
        g.strokeStyle = ring;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(32, 32, 30, 0, TAU);
        g.stroke();
        g.beginPath();
        g.arc(32, 32, 23, 0, TAU);
        g.globalAlpha = 0.4;
        g.stroke();
        g.globalAlpha = 1;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          g.fillStyle = '#fdba74';
          g.fillRect(32 + Math.cos(a) * 30 - 1, 32 + Math.sin(a) * 30 - 1, 3, 3);
        }
      }
    });
  const ringCv = (col) =>
    paint('ring|' + col, 64, 64, (g) => {
      g.strokeStyle = col;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(32, 32, 30, 0, TAU);
      g.stroke();
    });
  const lensCv = () =>
    paint('lens', 32, 32, (g) => {
      g.fillStyle = '#0c0b0d';
      g.beginPath();
      g.arc(16, 16, 15, 0, TAU);
      g.fill();
      const lg = g.createRadialGradient(14, 14, 1, 16, 16, 9);
      lg.addColorStop(0, '#fca5a5');
      lg.addColorStop(0.35, '#b91c1c');
      lg.addColorStop(1, '#2a0505');
      g.fillStyle = lg;
      g.beginPath();
      g.arc(16, 16, 9, 0, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.fillRect(12, 11, 2, 2);
    });
  const netCv = () =>
    paint('holonet', 48, 24, (g, w, h) => {
      g.fillStyle = 'rgba(249,115,22,0.18)';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(253,186,116,0.6)';
      for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 1, h);
      for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 1);
    });
  const LENS = [VX, 2.0, VY];
  function lab(K, t, o = {}) {
    const { x0, x1, y0, y1, h } = LAB;
    K.sky('#060407', '#0c0709', 0);
    K.fog(o.fog || '#160806', o.fogK ?? 0.05);
    K.ambient(o.amb || '#b49484');
    K.expo(o.expo || 0.95);
    K.floor({ x0, y0, x1, y1, img: labFloorCv() });
    K.floor({ x0, y0, x1, y1, z: h, color: '#0c090b' });
    Q(K, { x: x0, y: VY, w: y1 - y0, h, ang: 0, img: labWallCv() });
    Q(K, { x: x1, y: VY, w: y1 - y0, h, ang: Math.PI, img: labWallCv() });
    Q(K, { x: VX, y: y0, w: x1 - x0, h, ang: Math.PI / 2, img: labWallCv() });
    Q(K, { x: VX, y: y1, w: x1 - x0, h, ang: -Math.PI / 2, img: labWallCv() });
    // a parede do fundo: WILD CARD enorme e a faixa de luz
    Q(K, { x: VX, y: y0 + 0.4, z: 1.25, w: 5.2, h: 0.98, ang: Math.PI / 2, img: labWordCv() });
    Q(K, { x: VX, y: y0 + 0.41, z: 1.12, w: x1 - x0, h: 0.03, ang: Math.PI / 2, color: '#f97316', em: true });
    // racks de máquinas cheios de LEDs (nas duas paredes e no fundo)
    for (let j = 0; j < 5; j++) {
      const ya = y0 + 1.0 + j * 2.4;
      [[x0, 0], [x1, Math.PI]].forEach(([X, ang], si) => {
        const xa = si ? X - 0.36 : X;
        const xb = si ? X : X + 0.36;
        K.box({ x0: xa, y0: ya, x1: xb, y1: ya + 1.9, z0: 0, z1: 1.95, color: '#100c0f', top: '#1a1316' });
        Q(K, { x: si ? xa - 0.005 : xb + 0.005, y: ya + 0.95, z: 0.06, w: 1.8, h: 1.82, ang, img: ledCv(j * 2 + si), em: true });
      });
    }
    for (let i = 0; i < 4; i++) {
      const xa = x0 + 0.9 + i * 2.3;
      K.box({ x0: xa, y0, x1: xa + 1.6, y1: y0 + 0.36, z0: 0, z1: 1.05, color: '#100c0f', top: '#1a1316' });
      Q(K, { x: xa + 0.8, y: y0 + 0.365, z: 0.04, w: 1.5, h: 0.98, ang: Math.PI / 2, img: ledCv(20 + i), em: true });
    }
    // vigas do teto
    for (let i = 0; i < 5; i++) K.box({ x0, y0: y0 + 1.3 + i * 2.6, x1, y1: y0 + 1.5 + i * 2.6, z0: h - 0.2, z1: h, color: '#0c0a0d' });
    // a lente pendurada no teto (quem fala nunca aparece)
    const pulse = 0.55 + 0.25 * Math.sin(t * 0.05) + (o.talk || 0) * (0.3 + 0.2 * Math.abs(Math.sin(t * 0.33)));
    K.box({ x0: VX - 0.03, y0: VY - 0.03, x1: VX + 0.03, y1: VY + 0.03, z0: LENS[1] + 0.08, z1: h, color: '#050405' });
    K.box({ x0: VX - 0.26, y0: VY - 0.26, x1: VX + 0.26, y1: VY + 0.26, z0: LENS[1] + 0.02, z1: LENS[1] + 0.12, color: '#141114' });
    K.floor({ x0: VX - 0.25, y0: VY - 0.25, x1: VX + 0.25, y1: VY + 0.25, z: LENS[1] + 0.015, img: lensCv(), em: true });
    Q(K, { x: VX, y: VY, z: LENS[1] - 0.45, w: 1.0, h: 1.0, ang: faceCam(K, VX, VY) + Math.PI, img: glowCv('rgba(239,68,68,0.55)'), em: true, alpha: Math.min(0.95, pulse) });
    // a plataforma redonda e a luz que desce da lente
    if (!o.noPlat) {
      K.floor({ x0: VX - 1.2, y0: VY - 1.2, x1: VX + 1.2, y1: VY + 1.2, z: 0.012, img: discCv('#160e0e') });
      K.floor({ x0: VX - 1.2, y0: VY - 1.2, x1: VX + 1.2, y1: VY + 1.2, z: 0.016, img: ringCv('#f97316'), em: true });
      K.floor({ x0: VX - 1.5, y0: VY - 1.5, x1: VX + 1.5, y1: VY + 1.5, z: 0.02, img: glowCv('rgba(253,186,116,0.35)'), em: true });
    }
    if (o.shaft) Q(K, { x: VX, y: VY, z: 0, w: 1.3, h: LENS[1], ang: faceCam(K, VX, VY) + Math.PI, img: shaftCv('rgba(253,186,116,0.32)'), em: true, alpha: 0.9 });
    smoke(K, x0 + 1, x1 - 1, VY - 3, VY + 4, t, 6, 'rgba(234,88,12,0.16)', 1, 5);
  }
  // o gol holográfico (aceso, virado para oeste)
  function holoGoal(K, x, y, hit = 0) {
    const c = '#fb923c';
    K.box({ x0: x - 0.03, y0: y - 0.86, x1: x + 0.03, y1: y - 0.8, z0: 0, z1: 0.76, color: c, em: true });
    K.box({ x0: x - 0.03, y0: y + 0.8, x1: x + 0.03, y1: y + 0.86, z0: 0, z1: 0.76, color: c, em: true });
    K.box({ x0: x - 0.03, y0: y - 0.86, x1: x + 0.03, y1: y + 0.86, z0: 0.72, z1: 0.78, color: c, em: true });
    Q(K, { x: x + 0.05, y, w: 1.6, h: 0.72, ang: Math.PI, img: netCv(), em: true, alpha: 0.8 });
    if (hit > 0) Q(K, { x: x - 0.1, y, z: -0.2, w: 2.2, h: 1.4, ang: faceCam(K, x, y) + Math.PI, img: glowCv('rgba(249,115,22,0.7)'), em: true, alpha: Math.min(0.95, hit) });
  }
  const holo = (K, id, x, y, o) => K.actor(HOLO, Object.assign({ id, x, y, glow: true, alpha: 0.82, k: 0.9 }, o));
  // o boneco do Kunigami do Wild Card (wild) e o "frio" (cold)
  const wildA = (K, o) => K.actor('kunigami', Object.assign({ extra: WILD, k: 0.9, light: [1.05, 0.84, 0.72] }, o));
  const coldA = (K, o) => K.actor('kunigami', Object.assign({ extra: COLD, k: 0.9, light: [0.82, 0.78, 0.74] }, o));

  CE.registerCine3D('wildcard_hell', fixYaw({
    phases: [300, 330, 360, 330, 360],
    music: 'tension',
    title: '🃏 O INFERNO DO WILD CARD',
    tags: ['PLANO 1 • SUBSOLO', 'PLANO 2 • ESCANEAMENTO', 'PLANO 3 • DIA 1... DIA 47', 'PLANO 4 • APAGUE', 'PLANO 5 • O ATACANTE PERFEITO'],
    subs: [
      [{ from: 60, to: 292, who: '???', text: '"Bem-vindo ao Wild Card."', color: VOICE_C }],
      [{ from: 30, to: 322, who: '???', text: '"Perna esquerda: fraca. Emoção: instável."', color: VOICE_C }],
      [{ from: 20, to: 352, who: 'NARRADOR', text: 'Dia após dia. Cair. Levantar. Cair de novo.', color: NARR_C }],
      [{ from: 20, to: 300, who: '???', text: '"O herói é peso morto. Apague."', color: VOICE_C }],
      [{ from: 200, to: 356, who: '???', text: '"Perfeito."', color: VOICE_C }]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      if (phase === 0) {
        // a câmera desce da lente no teto até ele, parado na plataforma
        const talk = seg(t, 60, 70) * (1 - seg(t, 220, 236));
        const k = easeIO(t / 300);
        K.cam(K.mix([VX, 1.95, VY + 1.5], [VX, 0.92, VY + 3.9], k), K.mix([VX, 2.15, VY - 0.2], [VX, 0.5, VY], k), lerp(56, 46, k));
        lab(K, t, { talk, shaft: true });
        wildA(K, { x: VX, y: VY, ang: Math.PI / 2 });
      } else if (phase === 1) {
        // o escaneamento: o anel no chão, os postes e o laser descendo pelo corpo
        const k = easeIO(t / 330);
        K.cam([lerp(VX + 0.6, VX + 0.5, k), 0.56, lerp(VY + 2.5, VY + 2.3, k)], [VX + 0.66, 0.42, VY], 42);
        lab(K, t, { noPlat: true, expo: 0.9 });
        K.floor({ x0: VX - 1.1, y0: VY - 1.1, x1: VX + 1.1, y1: VY + 1.1, z: 0.016, img: ringCv('#f97316'), em: true });
        [-1, 1].forEach((s) => {
          const px = VX + s * 1.15;
          K.box({ x0: px - 0.07, y0: VY - 0.07, x1: px + 0.07, y1: VY + 0.07, z0: 0, z1: 1.6, color: '#0d090a' });
          for (let i = 0; i < 9; i++) {
            const on = (Math.floor(t / 6) + i) % 7 === 0;
            Q(K, { x: px, y: VY + 0.075, z: 0.1 + i * 0.16, w: 0.05, h: 0.09, ang: Math.PI / 2, color: on ? '#fdba74' : '#7c2d12', em: true });
          }
        });
        const pass = (t % 165) / 165;
        const lz = lerp(1.0, -0.02, pass);
        K.floor({ x0: VX - 1.15, y0: VY - 0.5, x1: VX + 1.15, y1: VY + 0.5, z: lz, img: glowCv('rgba(249,115,22,0.4)'), em: true, alpha: 0.85 });
        Q(K, { x: VX, y: VY + 0.5, z: lz - 0.006, w: 2.3, h: 0.012, ang: Math.PI / 2, color: '#fed7aa', em: true });
        wildA(K, { x: VX, y: VY, ang: Math.PI / 2 });
      } else if (phase === 2) {
        // DIA 1... DIA 47: o tombo (até 110), de pé de novo (até 200), o chute de canhota
        if (t < 200) {
          const lt = t;
          const hit = 52;
          const kc = easeIO(seg(t, 0, 200));
          K.cam([lerp(VX - 0.8, VX - 0.2, kc), lerp(0.55, 0.62, kc), VY + 2.9], [lerp(VX - 0.2, VX - 0.3, kc), 0.42, VY], 46);
          lab(K, t, { noPlat: true });
          if (lt < hit) {
            const e = seg(lt, 0, hit);
            wildA(K, { x: lerp(VX - 2.6, VX - 0.35, e), y: VY, ang: 0, anim: 'run', frame: RUNF(f) });
            holo(K, 'h', lerp(VX + 2.8, VX + 0.15, seg(lt, 10, hit)), VY + 0.02, { ang: Math.PI, anim: 'run', frame: RUNF(f + 2) });
          } else {
            const u = lt - hit;
            const up = t >= 150;
            wildA(K, { x: lerp(VX - 0.35, VX - 0.75, ease(seg(u, 0, 18))), y: VY, ang: up ? Math.PI / 2 : 0, anim: up ? 'idle' : 'stun', frame: up ? f : 1 });
            // o holograma passa e some
            const ha = 1 - seg(u, 4, 26);
            if (ha > 0.02) holo(K, 'h', VX + 0.15 - ease(seg(u, 0, 20)) * 1.4, VY + 0.02, { ang: Math.PI, anim: 'run', frame: RUNF(f + 2), alpha: 0.82 * ha });
          }
        } else {
          const lt = t - 200;
          const shot = 40;
          K.cam([lerp(VX - 2.2, VX - 1.9, seg(lt, 0, 160)), 0.6, VY + 2.4], [VX + 0.4, 0.45, VY - 0.1], 48);
          lab(K, t, { noPlat: true });
          holoGoal(K, VX + 2.4, VY, lt >= shot + 14 ? 1 - seg(lt, shot + 14, shot + 40) : 0);
          const st = lt < shot - 12 ? 'idle' : lt < shot ? 'windup' : 'shoot';
          wildA(K, { x: VX - 1.3, y: VY, ang: 0, anim: st, frame: 1, opts: { mirror: true } });
          if (lt >= shot) {
            const bp = seg(lt, shot, shot + 14);
            if (bp < 1) K.ball(lerp(VX - 1.1, VX + 2.3, bp), VY + lerp(0.05, -0.2, bp), lerp(0.06, 0.48, bp) + Math.sin(Math.PI * bp) * 0.15);
          } else K.ball(VX - 1.05, VY + 0.05, 0.06);
        }
      } else if (phase === 3) {
        // "Apague.": ele parado debaixo da lente, a luz vermelha
        const k = easeIO(t / 330);
        K.cam([VX + 0.05, lerp(0.7, 0.66, k), lerp(VY + 2.6, VY + 2.2, k)], [VX, 0.55, VY], 44);
        lab(K, t, { expo: 0.8, shaft: true, talk: seg(t, 20, 30) * (1 - seg(t, 290, 300)) });
        const gray = seg(t, 160, 250);
        wildA(K, { x: VX, y: VY, ang: Math.PI / 2, light: K.mix([1.25, 0.58, 0.52], [0.7, 0.68, 0.66], gray) });
      } else {
        const cut = 190;
        if (t < cut) {
          // dia 47: passa por três hologramas e marca (a câmera acompanha de lado)
          const kx = VX - 4 + Math.min(t, 150) * 0.046;
          const camX = Math.min(kx + 0.4, VX + 2.6) + K.noise(t * 0.6, 4) * 0.02;
          K.cam([camX - 0.2, 0.6, VY + 3.0], [camX + 0.3, 0.45, VY - 0.4], 50);
          lab(K, t, { noPlat: true });
          const HX = [VX - 2.6, VX - 1.0, VX + 0.6];
          HX.forEach((hx, i) => {
            const tp = (hx - (VX - 4)) / 0.046;
            const sh = seg(t, tp - 2, tp + 22);
            if (sh >= 0.35) return;
            const run = i === 1;
            const lunge = run ? seg(t, tp - 18, tp) * 0.5 : 0;
            holo(K, 'h' + i, hx - lunge, VY, { ang: Math.PI, anim: run ? 'run' : 'idle', frame: run ? RUNF(f + i) : 0, alpha: 0.82 * (1 - seg(sh, 0, 0.35)) });
          });
          holoGoal(K, VX + 3.4, VY, t >= 172 ? 1 - seg(t, 172, 190) : 0);
          const jumpTp = (HX[1] - (VX - 4)) / 0.046;
          const jump = Math.sin(Math.PI * seg(t, jumpTp - 12, jumpTp + 10)) * 0.32;
          const st = t < 140 ? 'run' : t < 150 ? 'windup' : 'shoot';
          coldA(K, { x: kx, y: VY, z: jump, ang: 0, anim: st, frame: st === 'run' ? RUNF(f) : 1 });
          if (t >= 150 && t < 172) {
            const bp = seg(t, 150, 172);
            K.ball(lerp(kx + 0.2, VX + 3.35, bp), VY, lerp(0.06, 0.4, bp) + Math.sin(Math.PI * bp) * 0.2);
          }
        } else {
          // o rosto: vazio, a aura fria
          const u = t - cut;
          const k = easeIO(u / 170);
          K.cam([VX + 0.02, 0.66, lerp(VY + 2.3, VY + 2.0, k)], [VX, 0.56, VY], 42);
          lab(K, t, { expo: 0.78, fog: '#0c0908' });
          aura(K, 'hell', VX, VY, t, ease(seg(u, 0, 40)));
          coldA(K, { x: VX, y: VY, ang: Math.PI / 2, light: [0.78, 0.74, 0.7] });
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = cast();
      if (phase === 0) {
        const talk = seg(t, 60, 70) * (1 - seg(t, 220, 236));
        CE.finKicker(ctx, 40, top + 30, 'LOCAL: NÃO REGISTRADO • -80 M', seg(t, 8, 50), '#ef4444');
        CE.finKicker(ctx, 40, top + 58, 'PROGRAMA WILD CARD • DIA 1', seg(t, 36, 86), '#fb923c');
        CE.wcdVoiceHud(ctx, W - 340, bot - 92, t, talk);
        CE.cineSfx(S, 60, 'voz', () => window.SFX?.blip?.(120));
      } else if (phase === 1) {
        // os alvos em cima do corpo (cabeça, coração, perna esquerda)
        const marks = [[0, 0.5, 'CABEÇA', 40], [-0.05, 0.3, 'CORAÇÃO', 80], [0.1, 0.1, 'PERNA ESQ.', 120]];
        marks.forEach(([dx, h, lab2, at]) => {
          const a = ease(seg(t, at, at + 14));
          if (a <= 0) return;
          const p = K.screen(VX + dx, h, VY + 0.05);
          if (!p) return;
          const r = lerp(70, 30, a);
          const mx = p.x;
          const my = p.y;
          ctx.save();
          ctx.strokeStyle = lab2 === 'CABEÇA' ? '#fdba74' : '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
            ctx.moveTo(mx + sx * r, my + sy * r - sy * 12);
            ctx.lineTo(mx + sx * r, my + sy * r);
            ctx.lineTo(mx + sx * r - sx * 12, my + sy * r);
          });
          ctx.stroke();
          ctx.globalAlpha = a;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(mx + r, my);
          ctx.lineTo(830, my);
          ctx.stroke();
          ctx.font = '900 12px "Segoe UI", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fillText(lab2, mx + r + 8, my - 8);
          ctx.restore();
        });
        // painel de dados
        const px0 = 846;
        const py0 = top + 24;
        ctx.fillStyle = 'rgba(14,6,4,0.86)';
        ctx.fillRect(px0, py0, 400, bot - top - 48);
        ctx.strokeStyle = 'rgba(249,115,22,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px0, py0, 400, bot - top - 48);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(px0, py0, 400, 4);
        CE.finKicker(ctx, px0 + 18, py0 + 30, 'BIOMETRIA • INDIVÍDUO 50', seg(t, 6, 40), '#fb923c');
        const rows = [
          ['ALTURA', '1,88 M', 0.7, '#fdba74'],
          ['VELOCIDADE MÁX.', '33,9 KM/H', 0.78, '#fdba74'],
          ['PERNA DIREITA', '91%', 0.91, '#fdba74'],
          ['PERNA ESQUERDA', '41% • FRACA', 0.41, '#ef4444'],
          ['EMOÇÃO', 'INSTÁVEL', 0.95, '#ef4444']
        ];
        rows.forEach(([lab2, val, v, col], i) => {
          const at = 40 + i * 30;
          const a = seg(t, at, at + 20);
          if (a <= 0) return;
          const y = py0 + 76 + i * 62;
          ctx.font = '800 14px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(253,186,116,0.75)';
          ctx.fillText(CE.cineType(lab2, a * 1.4), px0 + 20, y);
          ctx.textAlign = 'right';
          ctx.font = '900 16px monospace';
          ctx.fillStyle = col;
          const blink = col === '#ef4444' && t > at + 30 && Math.floor(t / 16) % 2 === 0 ? 0.45 : 1;
          ctx.globalAlpha = seg(t, at + 8, at + 20) * blink;
          ctx.fillText(val, px0 + 380, y);
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(253,186,116,0.15)';
          ctx.fillRect(px0 + 20, y + 16, 360, 8);
          const jit = lab2 === 'EMOÇÃO' ? Math.sin(t * 0.7) * 0.05 : 0;
          ctx.fillStyle = col;
          ctx.fillRect(px0 + 20, y + 16, 360 * (v + jit) * ease(seg(t, at + 6, at + 30)), 8);
        });
        // o coração: eletro correndo embaixo
        const ey0 = bot - 108;
        ctx.fillStyle = 'rgba(14,6,4,0.86)';
        ctx.fillRect(40, ey0, 330, 80);
        ctx.strokeStyle = 'rgba(239,68,68,0.6)';
        ctx.strokeRect(40, ey0, 330, 80);
        ctx.font = '900 13px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fca5a5';
        ctx.fillText('BPM  ' + (146 + Math.round(Math.sin(t * 0.1) * 3)), 54, ey0 + 18);
        ctx.save();
        ctx.beginPath();
        ctx.rect(42, ey0 + 2, 326, 76);
        ctx.clip();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i <= 160; i++) {
          const xx = 42 + i * 2.05;
          const ph = (i * 2 + t * 2.2) % 70;
          const yy = ey0 + 50 - (ph > 30 && ph < 34 ? (ph - 30) * 9 : ph >= 34 && ph < 38 ? (38 - ph) * 9 - 14 : 0);
          if (i) ctx.lineTo(xx, yy);
          else ctx.moveTo(xx, yy);
        }
        ctx.stroke();
        ctx.restore();
        CE.cineSfx(S, 30, 'scan', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        if (t >= 52 && t < 110) {
          // o tombo: TUM! e a poeira
          const u = t - 52;
          const p = K.screen(VX - 0.5, 0.3, VY);
          if (p) {
            CE.cineImpactText(ctx, 'TUM!', p.x + 120, p.y - 150, 64, '#fdba74', seg(u, 0, 8), 0, -0.12);
            ctx.fillStyle = `rgba(214,190,170,${0.6 * (1 - seg(u, 0, 40))})`;
            for (let i = 0; i < 10; i++) ctx.fillRect(p.x + (rnd(i, 2) - 0.5) * 200 * (0.4 + seg(u, 0, 30)), p.y + 40 - rnd(i, 3) * 60 * seg(u, 0, 30), 8, 8);
          }
        }
        // o rosto pingando de suor — "DE NOVO."
        const kB = ease(seg(t, 110, 126)) * (1 - ease(seg(t, 192, 204)));
        if (kB > 0) {
          const mid = 362;
          CE.finPanel(ctx, [[20, mid + 12], [716, mid + 4], [700, bot - 14], [20, bot - 14]], () => {
            const lt = t - 110;
            CE.cineGradient(ctx, 0, mid, 720, bot - mid, [[0, '#1a0c08'], [1, '#080405']]);
            CE.cineGlow(ctx, 360, mid + 60, 300, 'rgba(249,115,22,0.18)');
            const r = CE.finHead(ctx, c.wild, 330, mid + 150, 620, { rim: '#fdba74' });
            CE.wcdEyes(ctx, 330, mid + 150, r.u, { ring: '#f59e0b', iris: '#7c2d12', angry: true, glow: 'rgba(249,115,22,0.25)' });
            CE.rincDrops(ctx, [330 - 8.6 * r.u, 330 + 8.4 * r.u, 330 - 6.4 * r.u, 330 + 5.8 * r.u], mid + 110, bot + 20, lt, r.u * 0.45, 4);
            CE.rincStamp(ctx, '"DE NOVO."', 560, mid + 56, 40, '#ef4444', lt, 26, 3, 0, 'center');
          }, { dy: (1 - kB) * 300 });
        }
        if (t >= 200) {
          CE.rincStamp(ctx, 'ESQUERDA.', 640, top + 60, 46, '#fdba74', t - 200, 46, 3, 0, 'center');
          if (t < 202) CE.cineFlash(ctx, W, H, 0.3, '#000000');
        }
        // o contador de dias
        const day = t < 100 ? 1 : t < 190 ? 9 : t < 262 ? 23 : 47;
        const at = t < 100 ? 0 : t < 190 ? 100 : t < 262 ? 190 : 262;
        const pop = 1 - seg(t, at, at + 10);
        ctx.save();
        ctx.translate(1060, bot - 70);
        ctx.scale(1 + pop * 0.25, 1 + pop * 0.25);
        ctx.fillStyle = 'rgba(8,3,3,0.92)';
        ctx.fillRect(-170, -48, 340, 96);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4;
        ctx.strokeRect(-170, -48, 340, 96);
        CE.finPixelText(ctx, 'DIA', -96, 0, 4, '#fdba74');
        CE.finPixelText(ctx, String(day).padStart(2, '0'), 58, 0, 6.4, day === 47 ? '#ef4444' : '#f8fafc');
        ctx.restore();
        [100, 190, 262].forEach((b, i) => CE.cineSfx(S, b, 'dia' + i, () => window.SFX?.blip?.(300 + i * 80)));
        CE.cineSfx(S, 52, 'tombo', () => window.SFX?.tackle?.());
        CE.cineSfx(S, 240, 'chute', () => window.SFX?.kick?.(0.9));
      } else if (phase === 3) {
        const kk = seg(t, 110, 250);
        const bx = lerp(-120, W + 120, easeIO(kk));
        // os olhos: a varredura apaga a cor
        const ke = seg(t, 6, 24);
        eyeStrip(ctx, S, c.wild, top + 130, top + 380, ke, (ey) => {
          const U = CE.wcdEyeBand(ctx, c.wild, 640, ey, 1100, {});
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          CE.foxcGradH(ctx, 0, ey - 130, W, 260, [[0, 'rgba(239,68,68,0.10)'], [0.5, 'rgba(239,68,68,0)'], [1, 'rgba(239,68,68,0.08)']]);
          ctx.restore();
          [-1, 1].forEach((s) => {
            const ex = 640 + s * 3.5 * U;
            const kE = seg(bx, ex - 60, ex + 160);
            CE.wcdEye(ctx, ex, ey, U * 0.3, s, {
              ring: mixHex('#f59e0b', '#78716c', kE), iris: mixHex('#7c2d12', '#1c1917', kE),
              glow: 'rgba(249,115,22,0.35)', glowA: 1 - kE, shine: 1 - kE, reflect: '#ef4444', tiny: kE > 0.2 && kE < 0.8
            });
          });
        });
        // a varredura que apaga a cor da imagem inteira
        if (kk > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, top, Math.max(0, bx), bot - top);
          ctx.clip();
          ctx.globalCompositeOperation = 'saturation';
          ctx.globalAlpha = 0.72;
          ctx.fillStyle = '#808080';
          ctx.fillRect(0, top, W, bot - top);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(10,8,8,0.18)';
          ctx.fillRect(0, top, W, bot - top);
          ctx.restore();
          if (kk < 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            CE.foxcGradH(ctx, bx - 90, top, 110, bot - top, [[0, 'rgba(249,115,22,0)'], [0.85, 'rgba(249,115,22,0.35)'], [1, 'rgba(255,237,213,0.9)']]);
            ctx.restore();
          }
        }
        CE.rincStamp(ctx, '"O HERÓI É PESO MORTO."', 640, top + 58, 44, '#fca5a5', t, 20, 2, W * 0.8);
        CE.cineImpactText(ctx, 'APAGUE.', 640, bot - 76, 104, '#ef4444', seg(t, 150, 160), W * 0.7, -0.03);
        CE.cineSfx(S, 110, 'varre', () => window.SFX?.whoosh?.());
        CE.cineSfx(S, 150, 'apague', () => window.SFX?.kick?.(0.8));
      } else {
        const cut = 190;
        if (t < cut) {
          // os hologramas quebrando em cubinhos de luz
          [VX - 2.6, VX - 1.0, VX + 0.6].forEach((hx, i) => {
            const tp = (hx - (VX - 4)) / 0.046;
            const sh = seg(t, tp - 2, tp + 22);
            if (sh <= 0 || sh >= 1) return;
            const p = K.screen(hx, 0.45, VY);
            if (!p) return;
            ctx.save();
            ctx.fillStyle = '#fdba74';
            ctx.globalAlpha = 1 - sh;
            for (let j = 0; j < 30; j++) {
              const a = rnd(j + i * 40, 5) * TAU;
              const d = ease(sh) * (40 + rnd(j, 6) * 160);
              ctx.fillRect(Math.round(p.x + (rnd(j, 3) - 0.5) * 80 + Math.cos(a) * d), Math.round(p.y + (rnd(j, 4) - 0.5) * 220 + Math.sin(a) * d + sh * sh * 60), 7, 7);
            }
            ctx.restore();
          });
          // riscos de velocidade
          ctx.fillStyle = 'rgba(255,237,213,0.14)';
          for (let i = 0; i < 14; i++) {
            const y = top + 40 + rnd(i, 51) * 420;
            const x = ((((rnd(i, 52) * 2400 - t * (30 + rnd(i, 53) * 20)) % 2400) + 2400) % 2400) - 400;
            ctx.fillRect(x, y, 140 + rnd(i, 54) * 200, 2);
          }
          if (t >= 172) {
            const p = K.screen(VX + 3.4, 0.95, VY);
            if (p) CE.finKicker(ctx, p.x - 60, p.y - 20, 'ALVO • 100%', seg(t, 172, 184), '#fdba74');
          }
          CE.cineSfx(S, 150, 'chute', () => window.SFX?.kick?.(1));
          CE.cineSfx(S, 172, 'rede', () => window.SFX?.post?.());
        } else {
          const u = t - cut;
          CE.finKicker(ctx, 40, top + 30, 'DIA 47 • ERROS: 0 • EMOÇÃO: 0%', seg(u, 6, 40), '#a8a29e');
          CE.cineImpactText(ctx, 'PERFEITO.', 640, bot - 76, 92, '#e7e5e4', seg(u, 50, 60), W * 0.7, -0.03);
          CE.cineSfx(S, cut + 50, 'perfeito', () => window.SFX?.kick?.(0.6));
          if (u < 2) CE.cineFlash(ctx, W, H, 0.4, '#000000');
        }
      }
      warm(S, 'hell', [spr('wild', { rim: '#fdba74' }), spr('wild', {})]);
      grain(ctx, S);
    }
  }));

  // ==========================================================================
  // 3 e 4. O CAMPO DO PRÉDIO: os refletores (as 4 torres dos cantos), a porta preta na
  // parede norte (à direita do gol) e o telão em cima da parede norte
  // ==========================================================================
  const LAMPS = [[60.7, 6.3], [45.3, 6.3], [60.7, 22.7], [45.3, 22.7]];
  const BD = { x0: 56.6, x1: 58.0, y: 6.0, h: 1.3 }; // a porta preta do fundo do campo
  const BDX = (BD.x0 + BD.x1) / 2;
  // refletor apagado: uma tampa escura por cima da cabeça acesa da torre
  const lampOff = (K, i) => {
    const [x, y] = LAMPS[i];
    K.box({ x0: x - 0.48, y0: y - 0.23, x1: x + 0.48, y1: y + 0.23, z0: 3.07, z1: 3.58, color: '#0b1220', top: '#111827' });
    K.floor({ x0: x - 0.48, y0: y - 0.23, x1: x + 0.48, y1: y + 0.23, z: 3.065, color: '#0b1220' });
  };
  // a porta preta na parede norte do campo (folhas correndo por cima da parede)
  function fieldDoor(K, t, open, seam = 1) {
    const dw = BD.x1 - BD.x0;
    const y = BD.y;
    K.box({ x0: BD.x0 - 0.12, y0: y, x1: BD.x1 + 0.12, y1: y + 0.07, z0: BD.h, z1: BD.h + 0.12, color: '#020203' });
    K.box({ x0: BD.x0 - 0.12, y0: y, x1: BD.x0, y1: y + 0.07, z0: 0, z1: BD.h, color: '#020203' });
    K.box({ x0: BD.x1, y0: y, x1: BD.x1 + 0.12, y1: y + 0.07, z0: 0, z1: BD.h, color: '#020203' });
    Q(K, { x: BDX, y: y + 0.075, z: BD.h + 0.02, w: dw * 0.9, h: 0.08, ang: Math.PI / 2, img: paint('wcword', 64, 6, (g) => window.Hub?.ptext?.(g, 'WILD CARD', 32, 0, '#7f1d1d', 1, 'center')) });
    if (open > 0) Q(K, { x: BDX, y: y + 0.01, w: dw, h: BD.h, ang: Math.PI / 2, img: insideCv(), em: true });
    const off = open * (dw / 2 + 0.12);
    Q(K, { x: BD.x0 + dw / 4 - off, y: y + 0.03, w: dw / 2, h: BD.h, ang: Math.PI / 2, img: leafCv(-1) });
    Q(K, { x: BD.x1 - dw / 4 + off, y: y + 0.03, w: dw / 2, h: BD.h, ang: Math.PI / 2, img: leafCv(1) });
    const leak = seam * (0.78 + 0.22 * Math.sin(t * 0.05));
    if (open < 0.04 && leak > 0.02) {
      Q(K, { x: BDX, y: y + 0.04, w: 0.025, h: BD.h, ang: Math.PI / 2, color: '#fb923c', em: true, alpha: Math.min(0.95, leak) });
      Q(K, { x: BDX, y: y + 0.04, w: dw, h: 0.03, ang: Math.PI / 2, color: '#fed7aa', em: true, alpha: Math.min(0.95, leak) });
    }
    const pool = Math.min(0.95, Math.max(leak * 0.7, open));
    if (pool > 0.02) K.floor({ x0: BDX - 2.2, y0: y, x1: BDX + 2.2, y1: y + 1.4 + open * 2.6, img: glowCv('rgba(249,115,22,0.55)', 0.5, 0), em: true, alpha: pool });
    Q(K, { x: BDX, y: y + 0.08, z: BD.h - 0.12, w: 0.3, h: 0.3, ang: Math.PI / 2, img: glowCv('rgba(239,68,68,0.7)'), em: true, alpha: 0.6 + 0.4 * Math.sin(t * 0.07) });
  }
  // o telão em cima da parede norte (fn pinta o canvas: 380 x 150)
  function bigScreen(K, S, key, every, fn) {
    const L = live(key, 380, 150, S.f, every, fn);
    K.box({ x0: 50.6, y0: 5.7, x1: 50.75, y1: 5.85, z0: 0, z1: 1.95, color: '#111827' });
    K.box({ x0: 55.25, y0: 5.7, x1: 55.4, y1: 5.85, z0: 0, z1: 1.95, color: '#111827' });
    K.box({ x0: 50.4, y0: 5.62, x1: 55.6, y1: 5.9, z0: 1.82, z1: 4.0, color: '#0b1220' });
    Q(K, { x: 53, y: 5.91, z: 1.9, w: 5.0, h: 2.0, ang: Math.PI / 2, img: L.cv, dirty: L.dirty, em: true });
  }
  const fieldNight = (K, expo, stars = 0.7) => {
    K.sky('#02040a', '#0b1426', stars);
    K.fog('#03060c', 0.03);
    K.ambient('#7c8aa6');
    K.expo(expo);
  };

  // --------------------------------------------------------------- O RETORNO DO CORINGA
  const DEATHS = [92, 128, 160, 190, 218, 246];
  const lightAt = (t, d) => {
    if (t < d) return [1, 1];
    const u = t - d;
    const flick = u < 14 ? [1, 0.15, 0.9, 0, 0.5, 0, 0.2][Math.floor(u / 2)] : 0;
    return [1 - seg(u, 0, 12), flick];
  };
  // ordem em que as torres morrem (as duas do fundo, que aparecem, primeiro)
  const DEATH_LAMP = [0, 1, 2, 3, -1, -1];
  const TRIO = [['bachira', 52.0, 13.6], ['you', 53.0, 13.9], ['chigiri', 54.0, 13.6]];

  CE.registerCine3D('kunigami_return', fixYaw({
    phases: [330, 330, 330, 320, 340],
    music: 'dread',
    title: '🃏 O RETORNO DO CORINGA',
    tags: ['PLANO 1 • O APAGÃO', 'PLANO 2 • A PORTA PRETA', 'PLANO 3 • O CORINGA', 'PLANO 4 • OLHOS VAZIOS', 'PLANO 5 • O RETORNO'],
    subs: [
      [{ from: 14, to: 322, who: 'NARRADOR', text: 'Véspera da NEL. Os refletores se apagam.', color: NARR_C }],
      [{ from: 100, to: 322, who: 'CHIGIRI', text: '"...Quem é aquele?"', color: CHI_C }],
      [{ from: 40, to: 322, who: 'CHIGIRI', text: '"Kunigami?! Por onde você andou?!"', color: CHI_C }],
      [{ from: 30, to: 312, who: 'KUNIGAMI', text: '"O herói morreu naquela porta."', color: COLD_C }],
      [{ from: 10, to: 334, who: 'KUNIGAMI', text: '"Agora só sobrou o atacante."', color: COLD_C }]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const bl = { kit: 'blueLock', k: 0.88 };
      if (phase === 0) {
        // a arena: os refletores morrem um a um
        const k = easeIO(t / 330);
        K.cam([53, lerp(1.2, 1.02, k), lerp(19.6, 18.4, k)], [53, lerp(1.05, 0.85, k), 6.0], lerp(58, 50, k));
        let sum = 0;
        DEATHS.forEach((d, i) => {
          const [a, fl] = lightAt(t, d);
          sum += a;
          if (DEATH_LAMP[i] >= 0 && fl < 0.5) lampOff(K, DEATH_LAMP[i]);
        });
        const amb = sum / 6;
        fieldNight(K, lerp(0.26, 1.0, amb * amb), 0.8);
        if (amb < 0.5) K.c.noLights = true;
        fieldDoor(K, t, 0, 0.25);
        const lt = K.mix([0.28, 0.36, 0.62], [1.0, 1.0, 1.02], amb);
        TRIO.forEach(([id, x, y]) => K.actor(id, Object.assign({ x, y, ang: Math.PI / 2, light: lt }, bl)));
      } else if (phase === 1) {
        // no escuro, a porta preta do fundo abre; ele sai lá de dentro
        const k = easeIO(t / 330);
        const open = ease(seg(t, 70, 124));
        const seam = seg(t, 16, 60);
        const sh = t >= 70 ? 0.03 * (1 - seg(t, 70, 100)) : 0;
        K.cam([BDX + K.noise(t, 2) * sh, 0.66 + K.noise(t, 5) * sh, lerp(11.6, 10.9, k)], [BDX, lerp(0.7, 0.66, k), 6.0], lerp(50, 44, k));
        fieldNight(K, 0.36 + open * 0.06, 0.8);
        K.c.noLights = true;
        [0, 1, 2, 3].forEach((i) => lampOff(K, i));
        fieldDoor(K, t, open, seam);
        smoke(K, BDX - 3, BDX + 3, 6.3, 9.0, t, 8, 'rgba(234,120,80,0.2)', open, 9);
        if (t >= 140) {
          const wk = seg(t, 140, 330);
          K.actor('kunigami', { extra: COLD, k: 0.9, x: BDX, y: lerp(6.12, 8.4, wk), ang: Math.PI / 2, anim: 'run', frame: WALKF(f, 6), view: 'front', alpha: Math.min(1, seg(t, 140, 170) + 0.001), light: [0.2, 0.13, 0.11] });
        }
        const rimL = open > 0.1 ? [0.2, 0.13, 0.1] : [0.07, 0.08, 0.1];
        K.actor('you', Object.assign({ x: BDX - 0.72, y: 9.7, ang: -Math.PI / 2, light: rimL }, bl));
        K.actor('chigiri', Object.assign({ x: BDX + 0.78, y: 9.6, ang: -Math.PI / 2, light: rimL }, bl));
      } else if (phase === 2) {
        // ele sai da fumaça, debaixo da única luz
        const k = easeIO(t / 330);
        const wk = easeIO(seg(t, 0, 210));
        const ky = lerp(8.4, 9.5, wk);
        K.cam([BDX + 0.55, 0.56, lerp(12.2, 12.0, k)], [BDX + 0.95, 0.62, 8.8], 44);
        fieldNight(K, 0.44, 0.8);
        K.c.noLights = true;
        [0, 1, 2, 3].forEach((i) => lampOff(K, i));
        fieldDoor(K, t, 1);
        Q(K, { x: BDX, y: ky, z: 0, w: 1.4, h: 3.2, ang: faceCam(K, BDX, ky) + Math.PI, img: shaftCv('rgba(226,232,240,0.3)'), em: true, alpha: 0.9 });
        K.floor({ x0: BDX - 1.0, y0: ky - 0.6, x1: BDX + 1.0, y1: ky + 0.6, img: glowCv('rgba(226,232,240,0.35)'), em: true });
        smoke(K, BDX - 3, BDX + 3, 8.4, 11.2, t, 8, 'rgba(214,194,176,0.16)', 1, 3);
        aura(K, 'ret2', BDX, ky, t, 0.35 * seg(t, 150, 230));
        const walking = t < 210;
        K.actor('kunigami', { extra: COLD, k: 0.9, x: BDX, y: ky, ang: Math.PI / 2, anim: walking ? 'run' : 'idle', frame: walking ? WALKF(f, 6) : f, view: walking ? 'front' : undefined, light: [1.0, 0.96, 0.92] });
      } else if (phase === 3) {
        // os olhos vazios (a faixa dos olhos no overlay; aqui ele, quase no escuro)
        const k = easeIO(t / 320);
        K.cam([BDX + 0.02, 0.62, lerp(11.6, 11.25, k)], [BDX, 0.56, 9.5], 42);
        fieldNight(K, 0.38, 0.8);
        K.c.noLights = true;
        [0, 1, 2, 3].forEach((i) => lampOff(K, i));
        fieldDoor(K, t, 1);
        smoke(K, BDX - 3, BDX + 3, 9.0, 11.0, t, 7, 'rgba(168,146,126,0.14)', 1, 6);
        K.actor('kunigami', { extra: COLD, k: 0.9, x: BDX, y: 9.5, ang: Math.PI / 2, light: [0.5, 0.48, 0.46] });
      } else {
        // de baixo: a aura fria subindo, os refletores mortos lá em cima
        const k = easeIO(t / 340);
        K.cam([BDX + 0.15, lerp(0.1, 0.14, k), lerp(10.95, 10.75, k)], [BDX - 0.05, lerp(1.25, 1.15, k), 8.6], lerp(56, 52, k));
        fieldNight(K, 0.46, 1);
        K.c.noLights = true;
        [0, 1, 2, 3].forEach((i) => lampOff(K, i));
        fieldDoor(K, t, 1);
        Q(K, { x: BDX, y: 9.5, z: 0, w: 1.6, h: 3.6, ang: faceCam(K, BDX, 9.5) + Math.PI, img: shaftCv('rgba(226,232,240,0.22)'), em: true, alpha: 0.9 });
        smoke(K, BDX - 3, BDX + 3, 9.0, 10.6, t, 8, 'rgba(214,194,176,0.15)', 1, 8);
        aura(K, 'ret4', BDX, 9.5, t, ease(seg(t, 10, 80)));
        K.actor('kunigami', { extra: COLD, k: 0.9, x: BDX, y: 9.5, ang: Math.PI / 2, light: [0.72, 0.7, 0.68] });
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = cast();
      if (phase === 0) {
        let sum = 0;
        DEATHS.forEach((d) => (sum += lightAt(t, d)[0]));
        // luz de emergência quando tudo apaga
        CE.cineGlow(ctx, 640, 300, 600, 'rgba(56,120,220,0.12)', 1 - sum / 6);
        TRIO.forEach(([, x, y], i) => {
          const surp = seg(t, 140 + i * 8, 150 + i * 8);
          const p = K.screen(x + 0.2, 1.05, y);
          if (surp > 0 && p) CE.cineImpactText(ctx, '!?', p.x, p.y, 26, '#facc15', surp, 0, 0.1);
        });
        CE.finKicker(ctx, 40, top + 30, 'BLUE LOCK • ARENA CENTRAL', seg(t, 6, 46));
        CE.finKicker(ctx, 40, top + 58, 'VÉSPERA DA NEO EGOIST LEAGUE • 23:51', seg(t, 34, 84), '#38bdf8');
        DEATHS.forEach((d, i) => CE.cineSfx(S, d, 'apaga' + i, () => window.SFX?.tackle?.()));
      } else if (phase === 1) {
        if (t >= 70) CE.cineFlash(ctx, W, H, 0.28 * (1 - seg(t, 70, 86)), '#fed7aa');
        CE.cineSfx(S, 70, 'porta', () => window.SFX?.whoosh?.());
      } else if (phase === 2) {
        // o choque: o Chigiri em cima, você embaixo
        const kA = ease(seg(t, 40, 56));
        if (kA > 0) {
          CE.finPanel(ctx, [[792, top + 16], [W - 20, top + 16], [W - 20, 352], [812, 344]], () => {
            CE.cineGradient(ctx, 780, top, 520, 280, [[0, '#2a0f1a'], [1, '#08060c']]);
            CE.drawRadialSpeedLines(ctx, 1040, 230, 600, '#fecdd3', 0.16);
            const r = CE.finHead(ctx, c.chigiri, 1040, 236, 560, { rim: '#fda4af' });
            CE.wcdEyes(ctx, 1040, 236, r.u, { ring: c.chigiri.eyeColor, iris: CE.finShade(c.chigiri.eyeColor, -0.55), tiny: true, look: Math.round(Math.sin(t * 0.4)) });
            ctx.fillStyle = 'rgba(186,230,253,0.85)';
            ctx.fillRect(Math.round(1040 + 7.6 * r.u), Math.round(236 - 1.5 * r.u + ease(seg(t, 60, 140)) * 2 * r.u), Math.ceil(r.u * 0.5), Math.ceil(r.u * 0.8));
          }, { dx: (1 - kA) * 520 });
        }
        const kB = ease(seg(t, 130, 146));
        if (kB > 0) {
          CE.finPanel(ctx, [[812, 358], [W - 20, 366], [W - 20, bot - 16], [792, bot - 16]], () => {
            CE.cineGradient(ctx, 780, 350, 520, 300, [[0, '#06202a'], [1, '#04070e']]);
            const r = CE.finHead(ctx, c.you, 1040, 476, 560, { rim: '#67e8f9' });
            const eye = c.you.eyeColor || '#ef4444';
            CE.wcdEyes(ctx, 1040, 476, r.u, { ring: eye, iris: CE.finShade(eye, -0.55), tiny: true });
            CE.rincStamp(ctx, '...!', 1180, 400, 34, '#e0f2fe', t, 150, 3);
          }, { dy: (1 - kB) * 300 });
        }
        CE.cineSfx(S, 40, 'choque', () => window.SFX?.whoosh?.());
      } else if (phase === 3) {
        eyeStrip(ctx, S, c.cold, top + 120, top + 390, seg(t, 4, 22), (ey) => {
          const U = CE.wcdEyeBand(ctx, c.cold, 640, ey, 1100, {});
          CE.wcdEyes(ctx, 640, ey, U, { ring: '#78716c', iris: '#1c1917', half: true, lid: CE.finShade(c.cold.skinColor, -0.2) });
          ctx.fillStyle = 'rgba(20,16,14,0.18)';
          ctx.fillRect(0, ey - 140, W, 280);
        });
        CE.wcdSmoke(ctx, -100, W + 100, top + 40, bot - 40, t, 7, 'rgba(168,146,126,0.10)', 1, 6, 1.4);
        CE.rincStamp(ctx, '"O HERÓI MORREU NAQUELA PORTA."', 640, bot - 60, 44, '#e7e5e4', t, 40, 2, W * 0.86);
      } else {
        const tk = seg(t, 150, 186);
        if (tk > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, tk * 2);
          const g = ctx.createLinearGradient(0, bot - 240, 0, bot);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, 'rgba(0,0,0,0.85)');
          ctx.fillStyle = g;
          ctx.fillRect(0, bot - 240, W, 240);
          ctx.restore();
        }
        CE.cineTitleCard(ctx, W, bot - 112, tk, { kicker: 'NEO EGOIST LEAGUE', title: 'O RETORNO DO CORINGA', sub: '', color: '#c2410c' });
        CE.cineSfx(S, 150, 'titulo', () => window.SFX?.kick?.(1));
      }
      warm(S, 'ret', [spr('chigiri', { rim: '#fda4af' }), spr('you', { rim: '#67e8f9' }), spr('cold', {})]);
      grain(ctx, S);
    }
  }));

  // --------------------------------------------------------------- O VEREDITO
  const egoScreenFn = (S, o) => (g, w, h) => CE.finEgoScreen(g, 0, 0, w, h, S.t, o);
  CE.registerCine3D('wildcard_verdict', fixYaw({
    phases: [300, 330, 330, 300, 370],
    music: 'mystery',
    title: '🃏 O VEREDITO',
    tags: ['PLANO 1 • DEPOIS DO APITO', 'PLANO 2 • AS MÃOS', 'PLANO 3 • UMA RACHADURA', 'PLANO 4 • APROVADO', 'PLANO 5 • NA NEL'],
    subs: [
      [{ from: 10, to: 298, who: 'NARRADOR', text: 'Fim de jogo. O estádio já está vazio.', color: NARR_C }],
      [{ from: 40, to: 324, who: 'CHIGIRI', text: '"Rensuke... você ainda tá aí dentro?"', color: CHI_C }],
      [{ from: 4, to: 328, who: 'NARRADOR', text: 'Por um segundo, alguma coisa lá dentro sorriu.', color: NARR_C }],
      [{ from: 30, to: 296, who: 'EGO', text: '"Aprovado. Destino: Manshine City."', color: EGO_C }],
      [{ from: 104, to: 364, who: 'KUNIGAMI', text: '"Na NEL... eu vou te devorar."', color: COLD_C }]
    ],
    grain: 0,
    vignette: 0.6,
    theme: 'bluelock_bunker',
    scene(K, S) {
      const { t, phase, f } = S;
      const bl = { kit: 'blueLock', k: 0.88 };
      const cold = (o) => K.actor('kunigami', Object.assign({ extra: COLD, k: 0.9 }, o));
      // só as duas torres do fundo acesas
      const half = () => {
        lampOff(K, 2);
        lampOff(K, 3);
      };
      if (phase === 0) {
        // o estádio vazio, ele sozinho no meio
        const k = easeIO(t / 300);
        K.cam(K.mix([53, 2.7, 22.2], [53.15, 1.0, 17.4], k), K.mix([53, 0.5, 12.6], [53, 0.55, 14.2], k), lerp(60, 44, k));
        fieldNight(K, 0.5, 0.8);
        half();
        bigScreen(K, S, 'fim', 4, (g, w, h) => {
          CE.cineGradient(g, 0, 0, w, h, [[0, '#06283a'], [1, '#020b16']]);
          CE.finPixelText(g, 'FIM DE JOGO', w / 2, h * 0.4, 3.2, '#38bdf8', 'center', w - 30);
          CE.finPixelText(g, 'BLUE LOCK  x  WILD CARD', w / 2, h * 0.72, 1.4, '#94a3b8', 'center', w - 30);
          CE.finFillPat(g, 'scan', 0, 0, w, h, 0.8);
        });
        cold({ x: 53, y: 14.2, ang: Math.PI / 2, light: [0.78, 0.76, 0.76] });
      } else if (phase === 1) {
        // o olhar dele: as mãos; o Chigiri lá na frente
        const n = K.noise(t * 0.4, 6) * 0.01;
        K.cam([53 + n, 0.8, 14.3], [52.95 + n, 0.4, 11.4], 50);
        fieldNight(K, 0.62, 0.8);
        half();
        K.actor('chigiri', Object.assign({ x: 52.95, y: 11.6, ang: Math.PI / 2, light: [0.62, 0.64, 0.82] }, bl));
      } else if (phase === 2) {
        // uma rachadura: um segundo de calor no rosto frio
        const hit = 70;
        const warmK = seg(t, hit, hit + 6) * (1 - seg(t, 196, 230));
        const sh = t >= hit ? 0.03 * (1 - seg(t, hit, hit + 20)) : 0;
        const k = easeIO(t / 330);
        K.cam([53.55 + K.noise(t * 2, 2) * sh, 0.64, lerp(16.4, 16.1, k)], [53.75, 0.56, 14.2], 42);
        fieldNight(K, 0.6 + warmK * 0.15, 0.8);
        half();
        aura(K, 'ver2', 53, 14.2, t, warmK * 0.6, ['#7c2d12', '#f97316', '#fed7aa']);
        cold({ x: 53, y: 14.2, ang: Math.PI / 2, light: K.mix([0.72, 0.7, 0.7], [1.3, 0.98, 0.74], warmK) });
      } else if (phase === 3) {
        // o telão do Ego: WILD CARD APROVADO → MANSHINE CITY
        const k = easeIO(t / 300);
        K.cam([54.8, 0.42, lerp(11.6, 11.25, k)], [53.1, lerp(1.95, 2.15, k), 6.0], 52);
        fieldNight(K, 0.6, 0.6);
        half();
        bigScreen(K, S, 'ego', 3, egoScreenFn(S, { live: true, ticker: 'WILD CARD • RENSUKE KUNIGAMI • RESULTADO: APROVADO • DESTINO: MANSHINE CITY •' }));
        K.floor({ x0: 50, y0: 6, x1: 56, y1: 9.5, img: glowCv('rgba(0,245,212,0.18)', 0.5, 0), em: true });
        cold({ x: 54.9, y: 10.0, ang: -Math.PI / 2, light: [0.3, 0.46, 0.48] });
      } else {
        const cut = 100;
        if (t < cut) {
          // ele vai embora; vocês dois de costas, olhando
          const k = easeIO(t / cut);
          K.cam([52.2, 0.72, 18.0], [53.0, 0.5, 9.0], lerp(46, 43, k));
          fieldNight(K, 0.5, 0.8);
          half();
          fieldDoor(K, t, 0, 0.6);
          cold({ x: lerp(53.4, 53.8, k), y: lerp(12.6, 11.9, k), ang: -Math.PI / 2, anim: 'run', frame: WALKF(f, 6), light: [0.56, 0.56, 0.6] });
          K.actor('chigiri', Object.assign({ x: 51.2, y: 16.1, ang: -Math.PI / 2, light: [0.12, 0.13, 0.17] }, bl));
          K.actor('you', Object.assign({ x: 52.05, y: 16.7, ang: -Math.PI / 2, light: [0.12, 0.13, 0.17] }, bl));
        } else {
          // meio rosto no escuro
          const u = t - cut;
          const k = easeIO(u / 270);
          K.cam([53.45, 0.64, lerp(14.2, 13.95, k)], [53.75, 0.57, 12.0], 38);
          fieldNight(K, 0.38, 0.6);
          half();
          K.c.noLights = true;
          cold({ x: 53.6, y: 12.0, ang: Math.PI / 2, light: [0.62, 0.56, 0.5] });
        }
      }
    },
    overlay(ctx, S, K) {
      const { W, H, t, phase, top, bot } = S;
      const c = cast();
      if (phase === 0) {
        CE.cineDust(ctx, W, H, t, 26, 'rgba(226,232,240,0.45)', 13);
        CE.finKicker(ctx, 40, top + 30, 'NEO EGOIST LEAGUE • FIM DE JOGO', seg(t, 6, 46));
        CE.cineSfx(S, 4, 'apito', () => window.SFX?.whistle?.(3));
      } else if (phase === 1) {
        // as mãos tremendo (param quando ele ouve a pergunta)
        const tr = 1 - seg(t, 190, 220);
        const hv = CE.wcdHandCv();
        const px = 13;
        [-1, 1].forEach((s) => {
          const dx = Math.round(CE.cineNoise(S.f * 2.7, s + 3) * 3 * tr);
          const dy = Math.round(CE.cineNoise(S.f * 2.3, s + 9) * 2 * tr);
          const hx = s < 0 ? 300 : 980 - hv.width * px;
          CE.wcdPix(ctx, hv, hx + dx, 404 + dy, px, s < 0);
        });
        ctx.fillStyle = 'rgba(4,6,14,0.22)';
        ctx.fillRect(0, top, W, bot - top);
      } else if (phase === 2) {
        const hit = 70;
        const warmK = seg(t, hit, hit + 6) * (1 - seg(t, 196, 230));
        // os olhos: o anel esquenta por um segundo
        eyeStrip(ctx, S, c.cold, bot - 170, bot - 46, seg(t, hit + 4, hit + 16) * (1 - seg(t, 236, 250)), (ey) => {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, ey - 70, 560, 140);
          ctx.clip();
          const U = CE.wcdEyeBand(ctx, c.cold, 280, ey, 600, { rim: '#d6c2b0', dim: 0.12, dimTint: '20,16,14' });
          CE.wcdEyes(ctx, 280, ey, U, {
            ring: mixHex('#78716c', '#f59e0b', warmK), iris: mixHex('#1c1917', '#7c2d12', warmK), tiny: warmK > 0.5,
            half: warmK < 0.3, lid: CE.finShade(c.cold.skinColor, -0.2), glow: 'rgba(249,115,22,0.35)', glowA: warmK
          });
          ctx.restore();
        });
        // a memória: o Time Z, rindo — e ela racha e cai
        const kp = ease(seg(t, hit + 2, hit + 18));
        if (kp > 0 && t < 250) {
          const fall = seg(t, 186, 240);
          ctx.save();
          ctx.globalAlpha = 1 - fall;
          ctx.translate(0, fall * fall * 260);
          const pts = [[600, top + 34], [W - 40, top + 22], [W - 58, bot - 52], [574, bot - 36]];
          CE.finPanel(ctx, pts, () => {
            CE.wcdTimeZ(ctx, 560, top, W - 560, bot - top, t - hit);
            if (t > 160) CE.wcdCracks(ctx, 930, 330, seg(t, 160, 186));
          }, { dx: (1 - kp) * 700, border: '#fde68a' });
          ctx.restore();
        }
        if (t >= hit) CE.cineFlash(ctx, W, H, 0.45 * (1 - seg(t, hit, hit + 12)), '#fff7ed');
        CE.cineSfx(S, hit, 'racha', () => window.SFX?.kick?.(0.7));
        CE.cineSfx(S, 162, 'quebra', () => window.SFX?.post?.());
      } else if (phase === 3) {
        CE.rincStamp(ctx, 'WILD CARD: APROVADO', 560, top + 370, 52, '#00f5d4', t, 74, 2, 720);
        if (t > 130) {
          const kk = ease(seg(t, 130, 142));
          const pw = CE.finPixelText(ctx, '→ MANSHINE CITY', 560, top + 432, 3.2 * kk + 0.01, '#7dd3fc');
          ctx.fillStyle = '#7dd3fc';
          ctx.fillRect(560 - pw / 2, top + 458, pw, 3);
        }
        CE.cineSfx(S, 74, 'aprovado', () => window.SFX?.blip?.(520));
        CE.cineSfx(S, 130, 'destino', () => window.SFX?.blip?.(660));
      } else {
        const cut = 100;
        if (t >= cut) {
          const u2 = t - cut;
          // a sombra engole o lado direito do rosto
          const p = K.screen(53.6, 0.7, 12.0);
          const x = p ? p.x : 820;
          CE.foxcGradH(ctx, x - 40, top, 120, bot - top, [[0, 'rgba(3,3,3,0)'], [1, 'rgba(3,3,3,0.9)']]);
          ctx.fillStyle = 'rgba(3,3,3,0.9)';
          ctx.fillRect(x + 80, top, W, bot - top);
          CE.rincStamp(ctx, 'NA NEL...', 290, top + 120, 56, '#d6d3d1', u2, 24, 3);
          CE.cineImpactText(ctx, 'EU VOU TE DEVORAR.', 330, bot - 96, 64, '#fdba74', seg(u2, 92, 102), 600, -0.04);
          if (u2 >= 92) CE.cineFlash(ctx, W, H, 0.25 * (1 - seg(u2, 92, 104)), '#fed7aa');
          const fo = seg(u2, 226, 268);
          if (fo > 0) {
            ctx.fillStyle = `rgba(0,0,0,${fo})`;
            ctx.fillRect(0, 0, W, H);
          }
          if (u2 < 2) CE.cineFlash(ctx, W, H, 0.5, '#000000');
          CE.cineSfx(S, cut + 92, 'devorar', () => window.SFX?.kick?.(1));
        }
      }
      warm(S, 'ver', [
        function () {
          this.wcdHandCv();
        },
        spr('cold', { rim: '#d6c2b0', dim: 0.12, dimTint: '20,16,14' }),
        spr('you', { animState: 'idle', frame: 1 }),
        spr('bachira', { animState: 'idle', frame: 1 }),
        spr('smile', { animState: 'call_pass', frame: 1 })
      ]);
      grain(ctx, S);
    }
  }));
})();
